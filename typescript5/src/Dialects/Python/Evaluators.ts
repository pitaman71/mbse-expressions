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
 * and imports, then `variables`, then `builtins` (by default a few that read values: `abs`, `bool`, `float`,
 * `getattr`, `hasattr`, `int`, `len`, `max`, `min`, `round`, `str`). Nothing else is reachable from an expression,
 * since expressions may come from data:
 *
 * - An import resolves only a module in `modules`, or a submodule of one (a `Module` among its members), and every
 *   other import throws `ImportError`.
 * - Attributes whose names start with `_` are refused.
 * - A call may call only a builtin of the scope, a value of `variables`, or a function of an allowed module.
 */

import { Errors, Repr, Validators } from "@mbse/schemas/Framework";

import { ImportError, NameError, OverflowError, ZeroDivisionError } from "../../Framework/Errors.js";
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
    if (properties.has(name)) return properties.get(name);
    const schemaName = (value as { schema_name?: unknown }).schema_name;
    if (typeof schemaName === "function") what = schemaName.call(value) as string; // its type, for expressions
  }
  throw new AttributeError(`${repr(what)} object has no attribute ${repr(name)}`);
}

// --- Python's rules over JavaScript values ---

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

/** Python's `bool(value)`. */
export function truthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string" || value instanceof Uint8Array || Array.isArray(value)) return value.length > 0;
  if (value instanceof Map) return value.size > 0;
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
  if (value instanceof Map) return BigInt(value.size);
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return BigInt(Object.keys(value).length); // a dict
  }
  throw new TypeError(`object of type ${repr(typeName(value))} has no len()`);
}

function extreme(operator: string): (...values: unknown[]) => unknown {
  return (...values) => values.reduce((best, value) => (ORDERS[operator]?.(order(operator, value, best)) ? value : best));
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
  ["len", len], ["max", extreme(">")], ["min", extreme("<")], ["round", round], ["str", str],
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

function strict(fn: (...values: unknown[]) => unknown): F.Implementation {
  return (args) => fn(...args.map((argument) => argument()));
}

const interpreter = new F.Interpreter(Expressions.DIALECT, new Map<string, any>([
  ["attribute", (args: F.Thunk[], node: any) => attribute((args[0] as F.Thunk)(), node.attr)],
  ["subscript", (args: F.Thunk[], node: any) => subscript((args[0] as F.Thunk)(), node.key)],
  ["call", call],
  ["compare", new Map<string, F.Implementation>([
    ["==", strict((a, b) => equals(a, b))], ["!=", strict((a, b) => !equals(a, b))],
    ...Object.entries(ORDERS).map(([operator, test]) =>
      [operator, strict((a, b) => test(order(operator, a, b)))] as [string, F.Implementation]),
  ])],
  ["boolop", new Map<string, F.Implementation>(["and", "or"].map((name) => [name, (args: F.Thunk[]) => {
    const first = (args[0] as F.Thunk)();
    const decided = name === "and" ? !truthy(first) : truthy(first);
    return decided ? first : (args[1] as F.Thunk)();
  }]))],
  ["binop", new Map<string, F.Implementation>(["+", "-", "*", "/", "//", "%", "**"].map((operator) =>
    [operator, strict((a, b) => arithmetic(operator, a, b))]))],
  ["unaryop", new Map<string, F.Implementation>([
    ["not", strict((a) => !truthy(a))], ["-", strict((a) => negate("-", a))], ["+", strict((a) => negate("+", a))],
  ])],
  ["ifexp", (args: F.Thunk[]) => (truthy((args[0] as F.Thunk)()) ? (args[1] as F.Thunk)() : (args[2] as F.Thunk)())],
]), { scope: (variables) => new Scope(variables) });

/** The value of an expression in `scope`, or with the variables in an object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  return interpreter.run(Expressions.DIALECT.resolve(expression), scope);
}
