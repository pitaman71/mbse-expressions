/**
 * Evaluators of the Python dialect: compute an expression by Python's rules, in a scope that decides what it may
 * reach. This implementation models Python's rules over JavaScript values: int is `bigint`, float is `number`, str,
 * bool and bytes (`Uint8Array`) are themselves, and None is `null`.
 *
 * `Evaluators.OfAny(expression, scope)` evaluates in a `Scope`, or in one made from an object of variables. Python's
 * rules apply, not Basic's: `and` and `or` give one of their operands, `1 == 1.0` is True, `True + 1` is 2, and a
 * missing attribute throws `AttributeError`. Objects that write their properties through `accept`, such as
 * mbse-schemas' data, have their properties as attributes; a `Module` has its members as attributes.
 *
 * A `new Scope(variables, { modules, builtins })` resolves names as Python does, innermost first: names bound by lets
 * and imports, then `variables`, then `builtins` (by default a few that read values: `abs`, `all`, `any`, `bool`,
 * `float`, `getattr`, `hasattr`, `int`, `len`, `max`, `min`, `round`, `set`, `str`, `sum`). A list property is an
 * array of its values, a keyed list's too. Nothing else is reachable from an expression, since expressions may come
 * from data:
 *
 * - An import resolves only a module in `modules`, or a submodule of one (a `Module` among its members), and every
 *   other import throws `ImportError`.
 * - Attributes whose names start with `_` are refused.
 * - A call may call only a builtin of the scope, a value of `variables`, or a function of an allowed module.
 */

import { Errors, Repr, Validators } from "@mbse/schemas/Framework";

import { ImportError, IndexError, NameError, OverflowError, ZeroDivisionError } from "../../Framework/Errors.js";
import * as F from "../../Framework/Evaluators.js";
import * as S from "../../Framework/Symbolics.js";
import * as Expressions from "./Expressions.js";

const { AttributeError, KeyError, ValueError } = Errors;
const { compareStrings, pyFloat, repr, typeName } = Repr;

/** A module an expression may import: named members, which may be functions, values or submodules. */
export class Module {
  readonly members: ReadonlyMap<string, unknown>;

  constructor(readonly name: string, members: Record<string, unknown>) {
    this.members = new Map(Object.entries(members));
  }
}

function isReadable(value: unknown): value is { accept(visitor: unknown): void } {
  return value !== null && typeof value === "object" && !(value instanceof Module)
    && typeof (value as { accept?: unknown }).accept === "function";
}

/** `value.name`, as expressions read it: never private, a module's members, and properties for objects that write
 * them. */
export function attribute(value: unknown, name: unknown): unknown {
  if (typeof name !== "string" || name.startsWith("_")) throw new AttributeError(`attribute ${repr(name)} is private`);
  if (value instanceof Module) {
    if (!value.members.has(name)) throw new AttributeError(`module ${repr(value.name)} has no attribute ${repr(name)}`);
    return value.members.get(name);
  }
  let what = typeName(value);
  if (isReadable(value)) {
    const properties = Validators.properties_of(value);
    if (properties.has(name)) return listed(properties.get(name));
    const schemaName = (value as { schema_name?: unknown }).schema_name;
    if (typeof schemaName === "function") what = schemaName.call(value) as string; // its type, for expressions
  }
  throw new AttributeError(`${repr(what)} object has no attribute ${repr(name)}`);
}

/** A property's value as Python reads it: a list as an array of its values, lists of lists too. */
function listed(value: unknown): unknown {
  return value instanceof Validators.ListRecord ? value.values.map(listed) : value;
}

// --- Python's rules over JavaScript values ---

/** What a generator expression makes: its items, consumed once. */
class PyGenerator {
  constructor(private readonly items: Iterator<unknown>) {}

  [Symbol.iterator](): Iterator<unknown> {
    return this.items;
  }
}
Object.defineProperty(PyGenerator, "name", { value: "generator" }); // its type's name, as Python's

function isDict(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

/** Python's `iter(value)`: a str's characters, bytes' ints, a list's or a set's items, a dict's keys. */
function iterate(value: unknown): Iterable<unknown> {
  if (typeof value === "string") return [...value];
  if (value instanceof Uint8Array) return [...value].map(BigInt);
  if (Array.isArray(value) || value instanceof Set || value instanceof PyGenerator) return value;
  if (value instanceof Map) return value.keys();
  if (isDict(value)) return Object.keys(value);
  throw new TypeError(`${repr(typeName(value))} object is not iterable`);
}

/** Throws unless `value` is hashable, as `what` (a set element, a dict key) must be. */
function hashable(value: unknown, what: string): void {
  if (Array.isArray(value) || value instanceof Map || value instanceof Set || isDict(value)) {
    throw new TypeError(`cannot use ${repr(typeName(value))} as ${what} (unhashable type: ${repr(typeName(value))})`);
  }
}

type Integral = bigint | boolean;

function isIntegral(value: unknown): value is Integral {
  return typeof value === "bigint" || typeof value === "boolean";
}

function isNumeric(value: unknown): value is Integral | number {
  return isIntegral(value) || typeof value === "number";
}

function int(value: Integral): bigint {
  return typeof value === "boolean" ? (value ? 1n : 0n) : value;
}

function float(value: Integral | number): number {
  return typeof value === "number" ? value : Number(int(value));
}

/** An int as a float, as Python converts one: rounded, or `OverflowError` beyond the largest float. */
function intToFloat(value: Integral): number {
  const converted = Number(int(value));
  if (!Number.isFinite(converted)) throw new OverflowError("int too large to convert to float");
  return converted;
}

/** Python's `bool(value)`. */
export function truthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string" || value instanceof Uint8Array || Array.isArray(value)) return value.length > 0;
  if (value instanceof Map || value instanceof Set) return value.size > 0;
  if (Object.getPrototypeOf(value) === Object.prototype) return Object.keys(value).length > 0; // a dict
  return true;
}

/** -1, 0 or 1 comparing an int with a float exactly; NaN if the float is NaN. */
function compareMixed(i: bigint, n: number): number {
  if (Number.isNaN(n)) return NaN;
  if (n === Infinity) return -1;
  if (n === -Infinity) return 1;
  const floor = BigInt(Math.floor(n));
  if (i < floor) return -1;
  if (i > floor) return 1;
  return n === Math.floor(n) ? 0 : -1;
}

/** -1, 0 or 1 comparing two numbers as Python does; NaN when unordered. */
function compareNumbers(a: Integral | number, b: Integral | number): number {
  if (isIntegral(a) && isIntegral(b)) return int(a) < int(b) ? -1 : int(a) > int(b) ? 1 : 0;
  if (isIntegral(a)) return compareMixed(int(a), b as number);
  if (isIntegral(b)) return -compareMixed(int(b), a);
  return a === b ? 0 : Math.sign(a - b);
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return (a[i] as number) - (b[i] as number);
  }
  return a.length - b.length;
}

/** Python's `a == b`. */
export function equals(a: unknown, b: unknown): boolean {
  if (isNumeric(a) && isNumeric(b)) return compareNumbers(a, b) === 0;
  if (a instanceof Uint8Array && b instanceof Uint8Array) return compareBytes(a, b) === 0;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => equals(item, b[i]));
  return a === b;
}

/** Python's ordering of `a` and `b` for `operator`: -1, 0, 1 or NaN; throws when they are not ordered. */
function order(operator: string, a: unknown, b: unknown): number {
  if (isNumeric(a) && isNumeric(b)) return compareNumbers(a, b);
  if (typeof a === "string" && typeof b === "string") return Math.sign(compareStrings(a, b));
  if (a instanceof Uint8Array && b instanceof Uint8Array) return Math.sign(compareBytes(a, b));
  throw new TypeError(`${repr(operator)} not supported between instances of ${repr(typeName(a))} and ${repr(typeName(b))}`);
}

const ORDERS: Record<string, (o: number) => boolean> = {
  "<": (o) => o < 0, "<=": (o) => o <= 0, ">": (o) => o > 0, ">=": (o) => o >= 0,
};

function unsupported(operator: string, a: unknown, b: unknown): TypeError {
  return new TypeError(`unsupported operand type(s) for ${operator}: ${repr(typeName(a))} and ${repr(typeName(b))}`);
}

function concatenate(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function repeat(sequence: string | Uint8Array, count: unknown): string | Uint8Array {
  if (!isIntegral(count)) {
    throw new TypeError(`can't multiply sequence by non-int of type ${repr(typeName(count))}`);
  }
  const times = Number(int(count) < 0n ? 0n : int(count));
  if (typeof sequence === "string") return sequence.repeat(times);
  let out: Uint8Array = new Uint8Array(0);
  for (let i = 0; i < times; i++) out = concatenate(out, sequence);
  return out;
}

function zero(value: Integral | number): boolean {
  return float(value) === 0;
}

function floorDivide(a: bigint, b: bigint): bigint {
  const quotient = a / b;
  return a % b !== 0n && (a < 0n) !== (b < 0n) ? quotient - 1n : quotient;
}

/** Python's arithmetic operators. */
function arithmetic(operator: string, a: unknown, b: unknown): unknown {
  if (operator === "+" && typeof a === "string" && typeof b === "string") return a + b;
  if (operator === "+" && a instanceof Uint8Array && b instanceof Uint8Array) return concatenate(a, b);
  if (operator === "*" && (typeof a === "string" || a instanceof Uint8Array)) return repeat(a, b);
  if (operator === "*" && (typeof b === "string" || b instanceof Uint8Array) && isIntegral(a)) return repeat(b, a);
  if (!isNumeric(a) || !isNumeric(b)) throw unsupported(operator, a, b);
  const integral = isIntegral(a) && isIntegral(b);
  if (["/", "//", "%"].includes(operator) && zero(b)) throw new ZeroDivisionError("division by zero");
  if (integral) {
    const [x, y] = [int(a as Integral), int(b as Integral)];
    switch (operator) {
      case "+": return x + y;
      case "-": return x - y;
      case "*": return x * y;
      case "/": return Number(x) / Number(y);
      case "//": return floorDivide(x, y);
      case "%": return x - floorDivide(x, y) * y;
      default: return y < 0n ? Number(x) ** Number(y) : x ** y;
    }
  }
  const [x, y] = [float(a), float(b)];
  switch (operator) {
    case "+": return x + y;
    case "-": return x - y;
    case "*": return x * y;
    case "/": return x / y;
    case "//": return Math.floor(x / y);
    case "%": {
      const remainder = x % y;
      return remainder !== 0 && (remainder < 0) !== (y < 0) ? remainder + y : remainder;
    }
    default:
      if (x === 0 && y < 0) throw new ZeroDivisionError("zero to a negative power");
      return x ** y;
  }
}

/** Python's bitwise operators, on ints and bools (`&`, `|` and `^` of two bools give a bool). */
function bitwise(operator: string, a: unknown, b: unknown): unknown {
  if (!isIntegral(a) || !isIntegral(b)) throw unsupported(operator, a, b);
  if (typeof a === "boolean" && typeof b === "boolean" && ["&", "|", "^"].includes(operator)) {
    return operator === "&" ? a && b : operator === "|" ? a || b : a !== b;
  }
  const [x, y] = [int(a), int(b)];
  if ((operator === "<<" || operator === ">>") && y < 0n) throw new ValueError("negative shift count");
  switch (operator) {
    case "&": return x & y;
    case "|": return x | y;
    case "^": return x ^ y;
    case "<<": return x << y;
    default: return x >> y;
  }
}

function invert(value: unknown): bigint {
  if (isIntegral(value)) return ~int(value);
  throw new TypeError(`bad operand type for unary ~: ${repr(typeName(value))}`);
}

function negate(operator: string, value: unknown): unknown {
  if (isIntegral(value)) return operator === "-" ? -int(value) : int(value);
  if (typeof value === "number") return operator === "-" ? -value : value;
  throw new TypeError(`bad operand type for unary ${operator}: ${repr(typeName(value))}`);
}

// --- Builtins ---

function abs(value: unknown): unknown {
  if (isIntegral(value)) return int(value) < 0n ? -int(value) : int(value);
  if (typeof value === "number") return Math.abs(value);
  throw new TypeError(`bad operand type for abs(): ${repr(typeName(value))}`);
}

function toFloat(value: unknown): number {
  if (isNumeric(value)) return float(value);
  if (typeof value !== "string") {
    throw new TypeError(`float() argument must be a string or a real number, not ${repr(typeName(value))}`);
  }
  const text = value.trim().toLowerCase();
  if (/^[+-]?(\d+\.?\d*(e[+-]?\d+)?|\.\d+(e[+-]?\d+)?|inf|infinity|nan)$/.test(text)) {
    return text.endsWith("nan") ? NaN : text.endsWith("inf") || text.endsWith("infinity")
      ? (text.startsWith("-") ? -Infinity : Infinity) : Number(text);
  }
  throw new ValueError(`could not convert string to float: ${repr(value)}`);
}

function toInt(value: unknown): bigint {
  if (isIntegral(value)) return int(value);
  if (typeof value === "number") {
    if (Number.isNaN(value)) throw new ValueError("cannot convert float NaN to integer");
    if (!Number.isFinite(value)) throw new OverflowError("cannot convert float infinity to integer");
    return BigInt(Math.trunc(value));
  }
  if (typeof value !== "string") {
    throw new TypeError(`int() argument must be a string, a bytes-like object or a real number, not ${repr(typeName(value))}`);
  }
  if (/^\s*[+-]?\d+\s*$/.test(value)) return BigInt(value.trim());
  throw new ValueError(`invalid literal for int() with base 10: ${repr(value)}`);
}

function len(value: unknown): bigint {
  if (typeof value === "string") return BigInt([...value].length);
  if (value instanceof Uint8Array || Array.isArray(value)) return BigInt(value.length);
  if (value instanceof Map || value instanceof Set) return BigInt(value.size);
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return BigInt(Object.keys(value).length); // a dict
  }
  throw new TypeError(`object of type ${repr(typeName(value))} has no len()`);
}

/** Python's `min` and `max`: of their arguments, or of the items of their one argument. */
function extreme(name: string, operator: string): (...values: unknown[]) => unknown {
  return (...values) => {
    if (values.length === 0) throw new TypeError(`${name} expected at least 1 argument, got 0`);
    const candidates = values.length === 1 ? [...iterate(values[0])] : values;
    if (candidates.length === 0) throw new ValueError(`${name}() iterable argument is empty`);
    return candidates.reduce((best, value) => (ORDERS[operator]?.(order(operator, value, best)) ? value : best));
  };
}

function all(value: unknown): boolean {
  for (const item of iterate(value)) if (!truthy(item)) return false;
  return true;
}

function any(value: unknown): boolean {
  for (const item of iterate(value)) if (truthy(item)) return true;
  return false;
}

const LONG = 1n << 63n;
const isLong = (value: bigint) => -LONG <= value && value < LONG;

/** Neumaier's compensated sum, as CPython's `sum` keeps it for floats: the sum so far and its compensation. */
function compensated(total: [number, number], x: number): [number, number] {
  const [f, c] = total;
  const t = f + x;
  return [t, c + (Math.abs(f) >= Math.abs(x) ? (f - t) + x : (x - t) + f)];
}

function finished([f, c]: [number, number]): number {
  return c !== 0 && Number.isFinite(c) ? f + c : f;
}

/** Python's `sum(iterable, start)`, as CPython computes it: ints exactly while they fit a C long, then floats, and
 * ints as floats, with compensation, and anything else by `+`. */
function sum(iterable: unknown, start: unknown = 0n): unknown {
  if (typeof start === "string") throw new TypeError("sum() can't sum strings [use ''.join(seq) instead]");
  if (start instanceof Uint8Array) throw new TypeError("sum() can't sum bytes [use b''.join(seq) instead]");
  const items = iterate(iterable)[Symbol.iterator]();
  let result = start;
  let next = items.next();
  if (typeof result === "bigint" && isLong(result)) { // ints and bools, while the total fits
    let total: bigint = result;
    for (; !next.done; next = items.next()) {
      const item = next.value;
      if (!isIntegral(item) || !isLong(int(item)) || !isLong(total + int(item))) break;
      total += int(item);
    }
    result = next.done ? total : arithmetic("+", total, next.value);
    if (!next.done) next = items.next();
  }
  if (typeof result === "number") { // floats, and ints that fit, compensated
    let total: [number, number] = [result, 0];
    for (; !next.done; next = items.next()) {
      const item = next.value;
      if (typeof item === "number") total = compensated(total, item);
      else if (isIntegral(item)) total = compensated(total, intToFloat(item));
      else break;
    }
    result = finished(total);
    if (!next.done) {
      result = arithmetic("+", result, next.value);
      next = items.next();
    }
  }
  for (; !next.done; next = items.next()) result = arithmetic("+", result, next.value);
  return result;
}

/** Python's `set(iterable)`: its distinct items, the first of equal ones. */
function set(...values: unknown[]): Set<unknown> {
  const distinct: unknown[] = [];
  for (const item of values.length === 0 ? [] : iterate(values[0])) {
    hashable(item, "a set element");
    if (!distinct.some((other) => equals(other, item))) distinct.push(item);
  }
  return new Set(distinct);
}

/** Python's `item in container`. */
function contains(container: unknown, item: unknown): boolean {
  if (typeof container === "string") {
    if (typeof item !== "string") throw new TypeError(`'in <string>' requires string as left operand, not ${typeName(item)}`);
    return container.includes(item);
  }
  if (container instanceof Uint8Array) {
    if (isIntegral(item)) {
      const byte = int(item);
      if (byte < 0n || byte > 255n) throw new ValueError("byte must be in range(0, 256)");
      return container.includes(Number(byte));
    }
    if (!(item instanceof Uint8Array)) throw new TypeError(`a bytes-like object is required, not ${repr(typeName(item))}`);
    return Array.from({ length: container.length - item.length + 1 }, (_, i) => i)
      .some((i) => compareBytes(container.subarray(i, i + item.length), item) === 0);
  }
  if (container instanceof Map || isDict(container)) {
    hashable(item, "a dict key");
    return [...iterate(container)].some((key) => equals(key, item));
  }
  if (container instanceof Set) hashable(item, "a set element");
  if (Array.isArray(container) || container instanceof Set || container instanceof PyGenerator) {
    for (const other of container) if (equals(other, item)) return true;
    return false;
  }
  throw new TypeError(`argument of type ${repr(typeName(container))} is not a container or iterable`);
}

const SEQUENCES: [string, string, string][] = [ // a sequence's name, its message for a non-int index, for an index out of range
  ["list", "list indices must be integers or slices, not ", "list index out of range"],
  ["str", "string indices must be integers, not ", "string index out of range"],
  ["bytes", "byte indices must be integers or slices, not ", "index out of range"],
];

/** Python's `value[key]`: an item of a sequence, from the end for a negative index, or a dict's value. */
function index(value: unknown, key: unknown): unknown {
  if (Array.isArray(value) || typeof value === "string" || value instanceof Uint8Array) {
    const [, invalid, outside] = SEQUENCES[Array.isArray(value) ? 0 : typeof value === "string" ? 1 : 2] as [string, string, string];
    if (!isIntegral(key)) throw new TypeError(invalid + (typeof value === "string" ? repr(typeName(key)) : typeName(key)));
    const items: unknown[] = typeof value === "string" ? [...value] : value instanceof Uint8Array ? [...value].map(BigInt) : value;
    let position = int(key);
    if (!isLong(position)) throw new IndexError("cannot fit 'int' into an index-sized integer");
    if (position < 0n) position += BigInt(items.length);
    if (position < 0n || position >= BigInt(items.length)) throw new IndexError(outside);
    return items[Number(position)];
  }
  if (value instanceof Map || isDict(value)) {
    hashable(key, "a dict key");
    const found = [...iterate(value)].find((other) => equals(other, key));
    if (found === undefined) throw new KeyError(repr(key));
    return value instanceof Map ? value.get(found) : value[found as string];
  }
  throw new TypeError(`${repr(typeName(value))} object is not subscriptable`);
}

/** Python's `round(value)`: to the nearest int, halves to even. */
function round(value: unknown): unknown {
  if (isIntegral(value)) return int(value);
  if (typeof value !== "number") throw new TypeError(`type ${typeName(value)} doesn't define __round__ method`);
  const floor = Math.floor(value);
  const difference = value - floor;
  const rounded = difference > 0.5 || (difference === 0.5 && floor % 2 !== 0) ? floor + 1 : floor;
  return toInt(rounded);
}

/** Python's `str(value)`. */
function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return pyFloat(value);
  return repr(value);
}

function hasattr(value: unknown, name: unknown): boolean {
  try {
    attribute(value, name);
  } catch {
    return false; // attribute throws only AttributeError
  }
  return true;
}

/** The builtins a scope provides by default, one per name of `Expressions.BUILTINS`. */
export const BUILTINS: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ["abs", abs], ["bool", truthy], ["float", toFloat], ["getattr", attribute], ["hasattr", hasattr], ["int", toInt],
  ["len", len], ["max", extreme("max", ">")], ["min", extreme("min", "<")], ["round", round], ["str", str],
  ["all", all], ["any", any], ["set", set], ["sum", sum],
]);

// --- The scope ---

function modulesOf(module: Module): Module[] {
  return [module, ...[...module.members.values()].filter((m): m is Module => m instanceof Module).flatMap(modulesOf)];
}

/** Python's scope for an expression: `variables`, the `modules` imports may bring in, and `builtins`. */
export class Scope extends S.Variables {
  readonly modules: ReadonlyMap<string, Module>;
  readonly builtins: ReadonlyMap<string, unknown>;

  constructor(variables: S.Bindings = {}, options: { modules?: Record<string, Module>; builtins?: Record<string, unknown> } = {}) {
    super(variables);
    this.modules = new Map(Object.entries(options.modules ?? {}));
    this.builtins = options.builtins === undefined ? BUILTINS : new Map(Object.entries(options.builtins));
  }

  override lookup(reference: any): unknown {
    const [found, value] = this.find(reference.name);
    if (found) return value;
    if (this.builtins.has(reference.name)) return this.builtins.get(reference.name);
    throw new NameError(`name ${repr(reference.name)} is not defined`);
  }

  /** The module `name`, if allowed: one of `modules`, or a submodule reached through its members. */
  module(name: string): Module {
    const [root, ...parts] = name.split(".") as [string, ...string[]];
    let module = this.modules.get(root);
    if (module === undefined) throw new ImportError(`import of ${repr(name)} is not allowed by the scope`);
    for (const part of parts) {
      const member: unknown = part.startsWith("_") ? undefined : module.members.get(part);
      if (!(member instanceof Module)) throw new ImportError(`No module named ${repr(name)}`);
      module = member;
    }
    return module;
  }

  override enter(declaration: any): Scope {
    if (declaration.kind().KIND === "import") {
      if (declaration.alias) return this.bind(declaration.alias, this.module(declaration.module));
      const root = declaration.module.split(".")[0];
      this.module(declaration.module); // the whole path must be allowed
      return this.bind(root, this.modules.get(root));
    }
    const module = this.module(declaration.module);
    if (declaration.name.startsWith("_") || !module.members.has(declaration.name)) {
      throw new ImportError(`cannot import name ${repr(declaration.name)} from ${repr(declaration.module)}`);
    }
    return this.bind(declaration.alias ?? declaration.name, module.members.get(declaration.name));
  }

  /** Whether an expression may call `fn`. */
  allows(fn: unknown): boolean {
    if ([...this.builtins.values()].includes(fn)) return true;
    if ([...this.variables().values()].includes(fn)) return true;
    return [...this.modules.values()].flatMap(modulesOf).some((module) => [...module.members.values()].includes(fn));
  }
}

function call(args: F.Thunk[], _node: unknown, scope: Scope): unknown {
  const fn = (args[0] as F.Thunk)();
  if (typeof fn !== "function" || !scope.allows(fn)) {
    const what = typeof fn === "function" ? fn.name || "<lambda>" : typeName(fn);
    throw new TypeError(`calling ${repr(what)} is not allowed by the scope`);
  }
  return (fn as (...a: unknown[]) => unknown)(...args.slice(1).map((argument) => argument()));
}

function subscript(value: unknown, key: string): unknown {
  if (value instanceof Map) {
    if (!value.has(key)) throw new KeyError(repr(key));
    return value.get(key);
  }
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    if (!Object.hasOwn(value, key)) throw new KeyError(repr(key));
    return (value as Record<string, unknown>)[key];
  }
  throw new TypeError(`${repr(typeName(value))} object is not subscriptable`);
}

/** A generator, as Python makes one: its iterable evaluated now, its element and conditions as it is consumed. */
function generator(args: F.Thunk[]): PyGenerator {
  const items = iterate((args[0] as F.Thunk)());
  const [element, ...conditions] = args.slice(1) as unknown as ((item: unknown) => unknown)[];
  function* produce(): Generator<unknown> {
    for (const item of items) if (conditions.every((condition) => truthy(condition(item)))) yield (element as (item: unknown) => unknown)(item);
  }
  return new PyGenerator(produce());
}

function strict(fn: (...values: unknown[]) => unknown): F.Implementation {
  return (args) => fn(...args.map((argument) => argument()));
}

const interpreter = new F.Interpreter(Expressions.DIALECT, new Map<string, any>([
  ["attribute", (args: F.Thunk[], node: any) => attribute((args[0] as F.Thunk)(), node.attr)],
  ["subscript", (args: F.Thunk[], node: any) => subscript((args[0] as F.Thunk)(), node.key)],
  ["index", strict((value, key) => index(value, key))],
  ["generator", generator],
  ["call", call],
  ["compare", new Map<string, F.Implementation>([
    ["==", strict((a, b) => equals(a, b))], ["!=", strict((a, b) => !equals(a, b))],
    ["in", strict((a, b) => contains(b, a))], ["not in", strict((a, b) => !contains(b, a))],
    ...Object.entries(ORDERS).map(([operator, test]) =>
      [operator, strict((a, b) => test(order(operator, a, b)))] as [string, F.Implementation]),
  ])],
  ["boolop", new Map<string, F.Implementation>(["and", "or"].map((name) => [name, (args: F.Thunk[]) => {
    const first = (args[0] as F.Thunk)();
    const decided = name === "and" ? !truthy(first) : truthy(first);
    return decided ? first : (args[1] as F.Thunk)();
  }]))],
  ["binop", new Map<string, F.Implementation>([
    ...["+", "-", "*", "/", "//", "%", "**"].map((operator) =>
      [operator, strict((a, b) => arithmetic(operator, a, b))] as [string, F.Implementation]),
    ...["&", "|", "^", "<<", ">>"].map((operator) =>
      [operator, strict((a, b) => bitwise(operator, a, b))] as [string, F.Implementation]),
  ])],
  ["unaryop", new Map<string, F.Implementation>([
    ["not", strict((a) => !truthy(a))], ["-", strict((a) => negate("-", a))], ["+", strict((a) => negate("+", a))],
    ["~", strict((a) => invert(a))],
  ])],
  ["ifexp", (args: F.Thunk[]) => (truthy((args[0] as F.Thunk)()) ? (args[1] as F.Thunk)() : (args[2] as F.Thunk)())],
]), { scope: (variables) => new Scope(variables) });

/** The value of an expression in `scope`, or with the variables in an object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  return interpreter.run(Expressions.DIALECT.resolve(expression), scope);
}
