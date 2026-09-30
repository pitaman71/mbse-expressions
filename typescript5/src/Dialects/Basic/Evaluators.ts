/**
 * Evaluators of the Basic dialect: compute the value of an expression.
 *
 * `Evaluators.OfAny(expression, scope)` evaluates any expression with the variables in `scope` bound, and
 * `Evaluators.OfLiteral`, `OfOperation`, `OfVariable` and `OfLet` evaluate one kind; each accepts that kind's `Spec`
 * (see `Expressions`), including `Term`s. The value is a native value, an object, or `null` when it is unknown.
 *
 * - Three-valued logic: an absent property is unknown, and comparisons with unknown or incomparable values are
 *   unknown. `and`, `or`, `not` and `implies` follow Kleene's logic; the second operand is evaluated only when the
 *   first does not decide.
 * - No coercion. Comparisons follow mbse-schemas' EQUALITY.md: natives of one type by value, objects by identity; values of
 *   different types are incomparable. Arithmetic takes numbers of one type.
 * - Only core operations (`Expressions.CORE`) are evaluated. Unknown operations, wrong numbers of arguments, unbound
 *   variables and wrong operand types raise, as do the problems `validate()` reports.
 * - `get` and `has` read any object that writes its properties through `accept`, including embedded objects, which
 *   have no identity (and so compare equal to nothing).
 *
 * `Evaluators.predicate(predicate, value)` evaluates a union branch's predicate with `this` bound to the value tested.
 * It is the evaluator mbse-schemas' validators take: `Validators.Validate(registry, Evaluators.predicate)`.
 */

import { Comparison, Repr, Schemas, Validators } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Evaluators.js";
import * as Expressions from "./Expressions.js";

const { typeName } = Repr;
type Native = Visitors.Native;

/** The variables an expression is evaluated with, or a scope. */
export type Scope = F.Scope | F.Bindings;

const NATIVES: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ["int", BigInt],
  ["float", Number],
  ["str", String],
  ["bool", Boolean],
  ["bytes", Uint8Array],
]);

function truth(name: string, value: unknown): boolean | null {
  if (value !== null && typeof value !== "boolean") {
    throw new TypeError(`${name} expects bool operands, got ${typeName(value)}`);
  }
  return value;
}

/** Kleene's logic, evaluating the second operand only when the first does not decide. */
function logic(name: "and" | "or" | "implies"): F.Implementation {
  const decisive = { and: false, or: true, implies: false }[name];
  return (args) => {
    const a = truth(name, args[0]?.());
    if (a === decisive) return name !== "and";
    const b = truth(name, args[1]?.());
    if (name === "implies") return b === true ? true : a === null || b === null ? null : false;
    if (b === (name === "or")) return b;
    return a === null || b === null ? null : name === "and";
  };
}

/** An operation that evaluates all its arguments. */
function strict(fn: (name: string, values: unknown[]) => unknown): F.Implementation {
  return (args, node) => fn(node.name, args.map((argument) => argument()));
}

function not(name: string, values: unknown[]): boolean | null {
  const t = truth(name, values[0]);
  return t === null ? null : !t;
}

type Readable = { accept(visitor: Visitors.OfObject): void };

function isReadable(value: unknown): value is Readable {
  return value !== null && typeof value === "object" && typeof (value as { accept?: unknown }).accept === "function";
}

function isObject(value: unknown): value is Visitors.Visitable {
  // `in` first: an embedded object's proxy throws on reading an attribute it lacks.
  return isReadable(value) && "identity" in value && typeof (value as { identity?: unknown }).identity === "function";
}

/** `get`: the property's value, or `null` when absent. `has`: whether it is present. */
function read(name: string, values: unknown[]): unknown {
  const [target, propertyName] = values;
  if (typeof propertyName !== "string") {
    throw new TypeError(`${name} expects a property name, got ${typeName(propertyName)}`);
  }
  if (target === null) return null;
  if (!isReadable(target)) throw new TypeError(`${name} expects an object, got ${typeName(target)}`);
  const properties = Validators.properties_of(target);
  if (name === "has") return properties.has(propertyName);
  return properties.get(propertyName) ?? null;
}

function compare(a: Native, b: Native): Comparison.Result {
  const schema = new Schemas.OfNative.Data(NATIVES.get(typeName(a)));
  return new Comparison.OfNative(schema, a).compare(new Comparison.OfNative(schema, b));
}

function sameNativeType(a: unknown, b: unknown): boolean {
  const name = typeName(a);
  return NATIVES.has(name) && Schemas.isNativeOf(NATIVES.get(name), a) && Schemas.isNativeOf(NATIVES.get(name), b);
}

/** Whether `a` equals `b`: natives of one type by value, objects by identity; `null` if unknown or incomparable. */
function equal(a: unknown, b: unknown): boolean | null {
  if (a === null || b === null) return null;
  if (sameNativeType(a, b)) return compare(a as Native, b as Native) === 0;
  if (isObject(a) && isObject(b)) return a.identity() === b.identity();
  return null;
}

function equality(name: string, values: unknown[]): boolean | null {
  const same = equal(values[0], values[1]);
  return same === null ? null : same === (name === "eq");
}

/** Ordered natives of one type; `null` if unknown or incomparable. */
function order(name: string, values: unknown[]): boolean | null {
  const [a, b] = values;
  if (a === null || b === null || !sameNativeType(a, b)) return null;
  const o = compare(a as Native, b as Native);
  if (o === null) return null;
  return { lt: o < 0, le: o <= 0, gt: o > 0, ge: o >= 0 }[name as "lt"];
}

function isNumber(value: unknown): value is bigint | number {
  return typeof value === "bigint" || typeof value === "number";
}

function arithmetic(name: string, values: unknown[]): unknown {
  if (values.some((value) => value === null)) return null;
  if (name === "neg") {
    const [a] = values;
    if (!isNumber(a)) throw new TypeError(`neg expects a number, got ${typeName(a)}`);
    return -a;
  }
  const [a, b] = values;
  if (!isNumber(a) || typeof a !== typeof b) {
    throw new TypeError(`${name} expects numbers of one type, got ${typeName(a)} and ${typeName(b)}`);
  }
  const [x, y] = [a as number, b as number]; // both bigint or both number
  return name === "add" ? x + y : name === "sub" ? x - y : x * y;
}

/** The implementation of each core operation. */
export const OPERATIONS: ReadonlyMap<string, F.Implementation> = new Map<string, F.Implementation>([
  ["get", strict(read)], ["has", strict(read)],
  ...["eq", "ne"].map((name) => [name, strict(equality)] as [string, F.Implementation]),
  ...["lt", "le", "gt", "ge"].map((name) => [name, strict(order)] as [string, F.Implementation]),
  ...(["and", "or", "implies"] as const).map((name) => [name, logic(name)] as [string, F.Implementation]),
  ["not", strict(not)],
  ...["add", "sub", "mul", "neg"].map((name) => [name, strict(arithmetic)] as [string, F.Implementation]),
]);

const interpreter = new F.Interpreter(Expressions.DIALECT, new Map([["operation", OPERATIONS]]));

/** The value of any expression, with the variables in `scope` bound. */
export function OfAny(expression: Expressions.OfAny.Spec, scope: Scope = {}): unknown {
  return interpreter.run(Expressions.OfAny.resolve(expression), scope);
}

/** The value of a literal. */
export function OfLiteral(expression: Expressions.OfLiteral.Spec, scope: Scope = {}): unknown {
  return interpreter.run(Expressions.OfLiteral.resolve(expression), scope);
}

/** The value of an operation, with the variables in `scope` bound. */
export function OfOperation(expression: Expressions.OfOperation.Spec, scope: Scope = {}): unknown {
  return interpreter.run(Expressions.OfOperation.resolve(expression), scope);
}

/** The value `scope` binds to a variable. */
export function OfVariable(expression: Expressions.OfVariable.Spec, scope: Scope = {}): unknown {
  return interpreter.run(Expressions.OfVariable.resolve(expression), scope);
}

/** The value of a let's body, with its name bound to its value and the variables in `scope` bound. */
export function OfLet(expression: Expressions.OfLet.Spec, scope: Scope = {}): unknown {
  return interpreter.run(Expressions.OfLet.resolve(expression), scope);
}

/** Whether `value` satisfies a union branch's `predicate`, evaluated with `this` bound to it; `null` if unknown. */
export function predicate(predicate: unknown, value: unknown): boolean | null {
  const result = OfAny(predicate as Expressions.OfAny.Spec, { this: value });
  if (result !== null && typeof result !== "boolean") throw new TypeError(`a predicate must be a bool, got ${typeName(result)}`);
  return result as boolean | null;
}
