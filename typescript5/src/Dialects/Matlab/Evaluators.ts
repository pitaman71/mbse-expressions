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
 *
 * A `new Scope(variables, { functions, packages })` resolves variables from `variables` and functions as MATLAB
 * does: the built-ins (`isfield`), then those an enclosing `import` brought in, then `functions` (the path), then
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

function compare(test: (order: number) => boolean): F.Implementation {
  return (args) => {
    const [a, b] = args.map((argument) => argument());
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
  return typeof value === "string" ? "string" : "struct";
}

function arithmetic(operator: string, apply: (a: number, b: number) => number): F.Implementation {
  return (args) => {
    const [a, b] = args.map((argument) => argument());
    const [x, y] = [double(a), double(b)];
    if (x !== null && y !== null) return apply(x, y);
    if (operator === "+") return text(a) + text(b);
    throw new TypeError(`Operator '${operator}' is not supported for operands of type '${classOf(a)}' and '${classOf(b)}'.`);
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

function toDouble(value: unknown): unknown {
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
    ["==", compare((o) => o === 0)], ["~=", compare((o) => o !== 0)],
    ["<", compare((o) => o < 0)], ["<=", compare((o) => o <= 0)],
    [">", compare((o) => o > 0)], [">=", compare((o) => o >= 0)],
    ["&&", shortCircuit("&&")], ["||", shortCircuit("||")],
    ["+", arithmetic("+", (a, b) => a + b)], ["-", arithmetic("-", (a, b) => a - b)],
    [".*", arithmetic(".*", (a, b) => a * b)],
  ])],
  ["unary", new Map<string, F.Implementation>([["~", not], ["-", negate]])],
  ["call", new Map<string, F.Implementation>([["isfield", isfield]])],
  ["field", field],
]), { literal: toDouble, scope: (variables) => new Scope(variables), extension });

/** The value of an expression in `scope`, or with the variables in an object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  return interpreter.run(Expressions.DIALECT.resolve(expression), scope);
}
