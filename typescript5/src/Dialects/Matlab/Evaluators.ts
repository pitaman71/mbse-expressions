/**
 * Evaluators of the Matlab dialect: compute an expression by MATLAB's rules for scalars.
 *
 * `Evaluators.OfAny(expression, scope)` binds variables to numbers, logicals, strings and structs (mappings, or
 * objects that write their properties through `accept`). Values are `number` (double), `boolean` (logical) and
 * `string` (string scalar). MATLAB's rules apply, not Basic's:
 *
 * - Two-valued logic: `&&` and `||` short-circuit, and take numbers or logicals (nonzero is true; NaN throws).
 * - Numbers and logicals convert into each other: `true + 1` is 2, and `1 == true` is true. A comparison of a string
 *   with a number compares the string with the number's text, as MATLAB converts it. `+` with a string concatenates.
 * - There is no unknown: reading a field a struct does not have throws, as `isfield` exists to avoid. Unbound
 *   variables throw too, with MATLAB's messages.
 * - The bit functions take doubles (or logicals) holding integers from 0 to `flintmax` (2^53), as unsigned integers of
 *   53 bits: `bitshift(a, k)` shifts left by `k`, or right when `k` is negative, and drops the bits beyond 53.
 * - An array is a JavaScript array: a list property's values, or a variable's array. Operators take scalars. `numel`
 *   counts elements (a scalar is one), `xs(i)` indexes from 1, and `arrayfun(@(p) body, xs)` gives the body's value
 *   for each element, an array of logicals if all are, else of doubles; each must be a numeric or logical scalar.
 *   `all`, `any` and `nnz` test elements as nonzero (`any` ignores NaN), `sum` adds them from the first, `min` and
 *   `max` ignore NaN and give an empty array of none, `unique` gives the distinct elements in order, and
 *   `ismember(x, xs)` tests `x` against each element as `==` does.
 *
 * A `new Scope(variables, { functions, packages })` resolves variables from `variables` and functions as MATLAB
 * does: the built-ins (`isfield`, `bitand`, `bitor`, `bitxor`, `bitshift`), then those an enclosing `import` brought in, then `functions` (the path), then
 * qualified names (`pkg.fn`) from `packages`, which maps each package's name to its functions. `import pkg.fn` and
 * `import pkg.*` import from `packages`, and nothing else: functions are functions the caller provides.
 */

import { Errors, Repr, Validators } from "@mbse/schemas/Framework";

import { ImportError, NameError } from "../../Framework/Errors.js";
import * as F from "../../Framework/Evaluators.js";
import * as S from "../../Framework/Symbolics.js";
import * as Domains from "./Domains.js";
import * as Expressions from "./Expressions.js";

const { KeyError, ValueError } = Errors;
const { compareStrings } = Repr;
type Fn = (...args: any[]) => unknown;

/** A numeric value as a double; null if not numeric. */
function double(value: unknown): number | null {
  if (typeof value === "boolean") return value ? 1 : 0;
  return typeof value === "number" ? value : null; // values are doubles by the time they are operands
}

/** Python's `f"{number:.5g}"`, for finite numbers. */
function general(number: number): string {
  const [mantissa, exponentText] = number.toExponential(4).split("e") as [string, string];
  const exponent = Number(exponentText);
  const strip = (text: string) => (text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text);
  if (exponent < -4 || exponent >= 5) {
    return `${strip(mantissa)}e${exponent < 0 ? "-" : "+"}${String(Math.abs(exponent)).padStart(2, "0")}`;
  }
  return strip(number.toFixed(Math.max(0, 4 - exponent)));
}

/** A scalar's text, as MATLAB's `string` converts it. */
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  const number = double(value) as number;
  if (!Number.isFinite(number)) return Number.isNaN(number) ? "NaN" : number > 0 ? "Inf" : "-Inf";
  return Number.isInteger(number) ? BigInt(number).toString() : general(number);
}

function logical(operator: string, value: unknown): boolean {
  const number = double(value);
  if (number === null) {
    throw new TypeError(`Operands to the ${operator} operator must be convertible to logical scalar values.`);
  }
  if (Number.isNaN(number)) throw new ValueError("NaN's cannot be converted to logicals.");
  return number !== 0;
}

function isScalar(value: unknown): boolean {
  return ["boolean", "number", "bigint", "string"].includes(typeof value);
}

function unsupported(operator: string, a: unknown, b: unknown): TypeError {
  return new TypeError(`Operator '${operator}' is not supported for operands of type '${classOf(a)}' and '${classOf(b)}'.`);
}

/** `a == b` of two scalars, as MATLAB converts them. */
function equal(a: unknown, b: unknown): boolean {
  const [x, y] = [double(a), double(b)];
  return x !== null && y !== null ? x === y : text(a) === text(b);
}

function compare(operator: string, test: (order: number) => boolean): F.Implementation {
  return (args) => {
    const [a, b] = args.map((argument) => argument());
    if (!isScalar(a) || !isScalar(b)) throw unsupported(operator, a, b);
    const [x, y] = [double(a), double(b)];
    if (x !== null && y !== null) return test(x === y ? 0 : Math.sign(x - y));
    return test(Math.sign(compareStrings(text(a), text(b))));
  };
}

function shortCircuit(operator: string): F.Implementation {
  return (args) => {
    const first = logical(operator, (args[0] as F.Thunk)());
    if (first === (operator === "||")) return first;
    return logical(operator, (args[1] as F.Thunk)());
  };
}

function classOf(value: unknown): string {
  if (typeof value === "boolean") return "logical";
  if (typeof value === "bigint" || typeof value === "number") return "double";
  if (Array.isArray(value)) return "array";
  return typeof value === "string" ? "string" : "struct";
}

function arithmetic(operator: string, apply: (a: number, b: number) => number): F.Implementation {
  return (args) => {
    const [a, b] = args.map((argument) => argument());
    const [x, y] = [double(a), double(b)];
    if (x !== null && y !== null) return apply(x, y);
    if (operator === "+" && isScalar(a) && isScalar(b)) return text(a) + text(b);
    throw unsupported(operator, a, b);
  };
}

function not(args: F.Thunk[]): boolean {
  return !logical("~", (args[0] as F.Thunk)());
}

function negate(args: F.Thunk[]): number {
  const value = (args[0] as F.Thunk)();
  const number = double(value);
  if (number === null) throw new TypeError(`Operator '-' is not supported for operands of type '${classOf(value)}'.`);
  return -number;
}

function fieldsOf(value: unknown): Map<string, unknown> {
  if (value instanceof Map) return value;
  if (Domains.isMapping(value)) return new Map(Object.entries(value));
  if (!Domains.is_struct(value)) throw new TypeError("Dot indexing is not supported for variables of this type.");
  return Validators.properties_of(value as never);
}

/** A value as MATLAB reads it: a number as a double, and a list (a list property's too) as an array. */
function toDouble(value: unknown): unknown {
  if (value instanceof Validators.ListRecord) return value.values.map(toDouble);
  if (Array.isArray(value)) return value.map(toDouble);
  return typeof value === "bigint" ? Number(value) : value;
}

function field(args: F.Thunk[], node: any): unknown {
  const fields = fieldsOf((args[0] as F.Thunk)());
  if (!fields.has(node.name)) throw new KeyError(`Unrecognized field name "${node.name}".`);
  return toDouble(fields.get(node.name));
}

function isfield(args: F.Thunk[]): boolean {
  const [value, name] = args.map((argument) => argument());
  return Domains.is_struct(value) && typeof name === "string" && fieldsOf(value).has(name);
}

const FLINTMAX = 2n ** 53n;

/** A bit function's operand: an integer of 53 bits, or of any sign for a shift. */
function bitOperand(name: string, value: unknown, signed = false): bigint {
  const number = double(value);
  if (number === null) throw new TypeError(`Undefined function '${name}' for input arguments of type '${classOf(value)}'.`);
  if (!Number.isInteger(number) || Math.abs(number) > Number(FLINTMAX) || (number < 0 && !signed)) {
    throw new ValueError("Double inputs must have integer values in the range of ASSUMEDTYPE.");
  }
  return BigInt(number);
}

function bit(name: string): F.Implementation {
  return (args) => {
    const a = bitOperand(name, (args[0] as F.Thunk)());
    const b = bitOperand(name, (args[1] as F.Thunk)(), name === "bitshift");
    if (name === "bitshift") return Number(b >= 0n ? (a << b) & (FLINTMAX - 1n) : a >> -b);
    return Number(name === "bitand" ? a & b : name === "bitor" ? a | b : a ^ b);
  };
}

// --- Arrays ---

/** An array's elements; a scalar or a struct is an array of one. */
function elements(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function numbers(value: unknown): number[] {
  const found = elements(value).map(double);
  if (found.some((number) => number === null)) throw new TypeError("Invalid data type. First argument must be numeric or logical.");
  return found as number[];
}

/** Elements concatenated: logicals if all are, else doubles. */
function logicals(values: unknown[]): unknown[] {
  return values.every((value) => typeof value === "boolean") ? values : values.map((value) => double(value));
}

function extreme(name: string): F.Implementation {
  return (args) => {
    const value = (args[0] as F.Thunk)();
    const found = numbers(value);
    const present = found.filter((number) => !Number.isNaN(number));
    if (found.length === 0) return [];
    if (present.length === 0) return NaN;
    const best = present.reduce((a, b) => (name === "min" ? (b < a ? b : a) : (b > a ? b : a)));
    return elements(value).every((element) => typeof element === "boolean") ? best !== 0 : best;
  };
}

function unique(args: F.Thunk[]): unknown[] {
  const all = elements((args[0] as F.Thunk)());
  if (all.every((element) => typeof element === "string")) {
    return [...new Set(all as string[])].sort((a, b) => Repr.compareStrings(a, b));
  }
  const found = numbers(all);
  const distinct: number[] = [];
  for (const number of found) if (!Number.isNaN(number) && !distinct.some((other) => other === number)) distinct.push(number);
  const sorted = [...distinct.sort((a, b) => a - b), ...found.filter((number) => Number.isNaN(number))];
  return all.every((element) => typeof element === "boolean") ? sorted.map((number) => number !== 0) : sorted;
}

function ismember(args: F.Thunk[]): boolean {
  const [value, array] = args.map((argument) => argument());
  const found = elements(array);
  if (!isScalar(value) || !found.every(isScalar)) throw new TypeError("ismember takes a scalar and an array of scalars.");
  return found.some((element) => equal(value, element));
}

function index(args: F.Thunk[]): unknown {
  const found = elements((args[0] as F.Thunk)());
  const position = (args[1] as F.Thunk)();
  if (typeof position === "boolean") return position ? found[0] : []; // a logical index: true selects the first element, false none
  const number = double(position);
  if (number === null || !Number.isInteger(number) || number < 1) {
    throw new ValueError("Array indices must be positive integers or logical values.");
  }
  if (number > found.length) throw new ValueError(`Index exceeds the number of array elements. Index must not exceed ${found.length}.`);
  return found[number - 1];
}

function arrayfun(args: F.Thunk[]): unknown[] {
  const body = args[1] as unknown as (element: unknown) => unknown;
  const values = elements((args[0] as F.Thunk)()).map((element, i) => {
    const value = body(element);
    if (double(value) === null) {
      throw new ValueError(`Non-scalar in Uniform output, at index ${i + 1}, output 1. Set 'UniformOutput' to false.`);
    }
    return value;
  });
  return logicals(values);
}

function reduction(reduce: (values: number[]) => unknown): F.Implementation {
  return (args) => reduce(numbers((args[0] as F.Thunk)()));
}

function sum(values: number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

function unrecognized(name: string): NameError {
  return new NameError(`Unrecognized function or variable '${name}'.`);
}

function split(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? ["", name] : [name.slice(0, dot), name.slice(dot + 1)];
}

/** MATLAB's scope for an expression: `variables`, the `functions` on the path, and the `packages` that qualified names
 * and imports find functions in. */
export class Scope extends S.Variables {
  readonly functions: ReadonlyMap<string, Fn>;
  readonly packages: ReadonlyMap<string, ReadonlyMap<string, Fn>>;
  imported: ReadonlyMap<string, Fn> = new Map();

  constructor(variables: S.Bindings = {},
    options: { functions?: Record<string, Fn>; packages?: Record<string, Record<string, Fn>> } = {}) {
    super(variables);
    this.functions = new Map(Object.entries(options.functions ?? {}));
    this.packages = new Map(Object.entries(options.packages ?? {}).map(([k, v]) => [k, new Map(Object.entries(v))]));
  }

  override lookup(reference: any): unknown {
    return toDouble(super.lookup(reference)); // numbers are doubles
  }

  override unbound(reference: any): never {
    throw unrecognized(reference.name);
  }

  override enter(declaration: any): Scope {
    const [pkg, name] = split(declaration.name);
    const functions = this.packages.get(pkg) ?? new Map<string, Fn>();
    let found: ReadonlyMap<string, Fn>;
    if (name === "*" && this.packages.has(pkg)) found = functions;
    else if (functions.has(name)) found = new Map([[name, functions.get(name) as Fn]]);
    else throw new ImportError(`Import argument '${declaration.name}' cannot be found or cannot be imported.`);
    const inner = this.copy();
    inner.imported = new Map([...this.imported, ...found]);
    return inner;
  }

  /** The function `name` resolves to. */
  function(name: string): Fn {
    for (const functions of [this.imported, this.functions]) if (functions.has(name)) return functions.get(name) as Fn;
    const [pkg, short] = split(name);
    const found = this.packages.get(pkg)?.get(short);
    if (found !== undefined) return found;
    throw unrecognized(name);
  }
}

function extension(name: string, args: F.Thunk[], _node: unknown, scope: Scope): unknown {
  return toDouble(scope.function(name)(...args.map((argument) => argument())));
}

const interpreter = new F.Interpreter(Expressions.DIALECT, new Map<string, any>([
  ["binary", new Map<string, F.Implementation>([
    ["==", compare("==", (o) => o === 0)], ["~=", compare("~=", (o) => o !== 0)],
    ["<", compare("<", (o) => o < 0)], ["<=", compare("<=", (o) => o <= 0)],
    [">", compare(">", (o) => o > 0)], [">=", compare(">=", (o) => o >= 0)],
    ["&&", shortCircuit("&&")], ["||", shortCircuit("||")],
    ["+", arithmetic("+", (a, b) => a + b)], ["-", arithmetic("-", (a, b) => a - b)],
    [".*", arithmetic(".*", (a, b) => a * b)],
  ])],
  ["unary", new Map<string, F.Implementation>([["~", not], ["-", negate]])],
  ["call", new Map<string, F.Implementation>([
    ["isfield", isfield], ...["bitand", "bitor", "bitxor", "bitshift"].map((name) => [name, bit(name)] as [string, F.Implementation]),
    ["all", reduction((values) => values.every((value) => value !== 0))],
    ["any", reduction((values) => values.some((value) => value !== 0 && !Number.isNaN(value)))],
    ["nnz", reduction((values) => values.filter((value) => value !== 0).length)],
    ["numel", (args: F.Thunk[]) => elements((args[0] as F.Thunk)()).length],
    ["sum", reduction(sum)], ["min", extreme("min")], ["max", extreme("max")], ["unique", unique], ["ismember", ismember],
  ])],
  ["field", field],
  ["index", index],
  ["arrayfun", arrayfun],
]), { literal: toDouble, scope: (variables) => new Scope(variables), extension });

/** The value of an expression in `scope`, or with the variables in an object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  return interpreter.run(Expressions.DIALECT.resolve(expression), scope);
}
