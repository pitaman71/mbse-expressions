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
 *   different types are incomparable. Arithmetic takes numbers of one domain.
 * - Values of other domains than the natives' defaults are typed values (`Domains.Value`): a literal of such a domain
 *   evaluates to one, and the operations take them by domain. Values of different domains are incomparable; arithmetic
 *   and the bitwise operations take values of one domain, and an integer domain's overflow applies to their results.
 *   `convert` keeps a value in the operation's domain, `reinterpret` keeps its bit pattern, and `pack` and `unpack` go
 *   to and from a packed domain's representation.
 * - Only core operations (`Expressions.CORE`) are evaluated. Unknown operations, wrong numbers of arguments, unbound
 *   variables and wrong operand types raise, as do the problems `validate()` reports.
 * - `get` and `has` read any object that writes its properties through `accept`, including value objects, whose
 *   identity does not take part in equality (and so they compare equal to nothing).
 *
 * `Evaluators.predicate(rule, value)` evaluates a rule about a value with `this` bound to it, as a truth value.
 */

import { Comparison, Errors, Repr, Schemas, Validators } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import { OverflowError } from "../../Framework/Errors.js";
import * as F from "../../Framework/Evaluators.js";
import * as S from "../../Framework/Symbolics.js";
import * as Domains from "./Domains.js";
import * as Expressions from "./Expressions.js";
import * as Ieee754 from "./Ieee754.js";

const { typeName } = Repr;
const { ValueError } = Errors;
type Native = Visitors.Native;

/** The variables an expression is evaluated with, or a scope. */
export type Scope = S.Scope | S.Bindings;

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

/** A reference object, compared by identity; a value object's identity does not take part in equality. */
function isObject(value: unknown): value is Visitors.Visitable {
  // `in` first: a value object's proxy throws on reading an attribute it lacks.
  return isReadable(value) && "identity" in value && typeof (value as { identity?: unknown }).identity === "function"
    && (value as Visitors.Visitable).owner() === null;
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

/** Whether either value is typed; then they compare only within one domain. */
function typed(a: unknown, b: unknown): boolean {
  return a instanceof Domains.Value || b instanceof Domains.Value;
}

function sameDomain(a: unknown, b: unknown): boolean {
  return a instanceof Domains.Value && b instanceof Domains.Value && a.domain.equals(b.domain);
}

/** Whether `a` equals `b`: natives of one type by value, typed values of one domain by its comparison, objects by
 * identity; `null` if unknown or incomparable. */
function equal(a: unknown, b: unknown): boolean | null {
  if (a === null || b === null) return null;
  if (typed(a, b)) {
    if (!sameDomain(a, b)) return null;
    const [x, y] = [a as Domains.Value, b as Domains.Value];
    return x.domain.compare(x.value, y.value) === 0;
  }
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
  if (a === null || b === null) return null;
  let o: number | null;
  if (typed(a, b)) {
    if (!sameDomain(a, b) || !(a as Domains.Value).domain.kind().ORDERED) return null;
    const [x, y] = [a as Domains.Value, b as Domains.Value];
    o = x.domain.compare(x.value, y.value);
  } else if (!sameNativeType(a, b)) {
    return null;
  } else {
    o = compare(a as Native, b as Native);
  }
  if (o === null) return null;
  return { lt: o < 0, le: o <= 0, gt: o > 0, ge: o >= 0 }[name as "lt"];
}

/** A value's domain, or null when it is not a value of one (an object). */
function domainOf(value: unknown): Domains.Domain | null {
  return value instanceof Domains.Value ? value.domain : Domains.nativeDomain(value);
}

function nativeOf(value: unknown): any {
  return value instanceof Domains.Value ? value.value : value;
}

/** A value's domain's name when it is typed, otherwise its type's. */
function describe(value: unknown): string {
  return value instanceof Domains.Value ? value.domain.name() : typeName(value);
}

type Kind = abstract new (...args: never[]) => Domains.Domain;

/** The one domain of `values`, which must be of `kinds`; throws naming `what` they must be. */
function operands(name: string, values: unknown[], kinds: readonly Kind[], what: readonly [string, string]): any {
  const domains = values.map(domainOf);
  const first = domains[0];
  if (!kinds.some((kind) => first instanceof kind) || domains.some((domain) => !(domain as Domains.Domain).equals(first))) {
    if (values.length === 1) throw new TypeError(`${name} expects ${what[0]}, got ${describe(values[0])}`);
    throw new TypeError(`${name} expects ${what[1]} of one domain, got ${describe(values[0])} and ${describe(values[1])}`);
  }
  return first;
}

const INTEGER: any = Domains.OfInteger.Data;
const IEEE754: any = Domains.OfIeee754.Data;
const BITS: any = Domains.OfBits.Data;
const BYTES: any = Domains.OfBytes.Data;
const PACKED: any = Domains.OfPacked.Data;

function arithmetic(name: string, values: unknown[]): unknown {
  if (values.some((value) => value === null)) return null;
  const domain = operands(name, values, [INTEGER, IEEE754], ["a number", "numbers"]);
  const natives = values.map(nativeOf);
  if (domain instanceof IEEE754 && !domain.equals(Domains.Float)) { // the default's is the host's own
    return new Domains.Value(domain, Ieee754.operate(name, domain.format, domain.rounding, natives));
  }
  let result: any;
  if (name === "neg") {
    result = -natives[0];
  } else {
    const [a, b] = natives;
    result = name === "add" ? a + b : name === "sub" ? a - b : a * b;
  }
  return Domains.value(domain, domain instanceof INTEGER ? domain.fit(name, result) : result);
}

/** An integer's value, or a bits value's pattern as an unsigned int. */
function pattern(domain: unknown, native: any): bigint {
  return domain instanceof BITS ? fromBytes(native) : native;
}

/** Big-endian bytes as an unsigned bigint. */
function fromBytes(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) result = (result << 8n) | BigInt(byte);
  return result;
}

/** An unsigned bigint as `length` big-endian bytes. */
function bytesOf(value: bigint, length: number): Uint8Array {
  let rest = value;
  const out = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

/** The bits value of a pattern, the bits beyond its width dropped. */
function bits(domain: any, value: bigint): Domains.Value {
  const width = domain.width as bigint;
  return new Domains.Value(domain, bytesOf(value & ((1n << width) - 1n), Number((width + 7n) / 8n)));
}

/** On two's complement patterns: of the width, or infinite without one. */
function bitwise(name: string, values: unknown[]): unknown {
  if (values.some((value) => value === null)) return null;
  const domain = operands(name, values, [INTEGER, BITS], ["an integer or bits", "integers or bits"]);
  const patterns = values.map((value) => pattern(domain, nativeOf(value)));
  let result: bigint;
  if (name === "bitnot") {
    result = ~(patterns[0] as bigint);
  } else {
    const [a, b] = patterns as [bigint, bigint];
    result = name === "bitand" ? a & b : name === "bitor" ? a | b : a ^ b;
  }
  if (domain instanceof BITS) return bits(domain, result);
  const high = domain.bounds()[1];
  if (!domain.signed && high !== null) result &= high; // an unsigned width's mask
  return Domains.value(domain, domain.fit(name, result));
}

/** `shl` and `shr`: on an integer, multiplying or dividing (toward negative infinity) by a power of two, with the
 * domain's overflow; on bits, logical within the width. */
function shift(name: string, values: unknown[]): unknown {
  const [value, count] = values;
  if (value === null || count === null) return null;
  const domain = operands(name, [value], [INTEGER, BITS], ["an integer or bits", ""]);
  if (!(domainOf(count) instanceof INTEGER)) throw new TypeError(`${name} expects an integer count, got ${describe(count)}`);
  const n = nativeOf(count) as bigint;
  if (n < 0n) throw new ValueError(`${name} needs a non-negative count, got ${n}`);
  const p = pattern(domain, nativeOf(value));
  const result = name === "shl" ? p << n : p >> n;
  if (domain instanceof BITS) return bits(domain, result);
  return Domains.value(domain, domain.fit(name, result));
}

/** An integer rounded from an IEEE 754 value, in `target`: an infinity saturates or overflows. */
function integer(target: any, value: bigint | number): bigint {
  if (typeof value === "number") {
    const bound = target.bounds()[value < 0 ? 0 : 1];
    if (target.overflow === "saturate" && bound !== null) return bound;
    throw new OverflowError(`convert overflows ${target.name()}: ${value < 0 ? "-" : ""}Infinity`);
  }
  return target.fit("convert", value);
}

/** The native of `target` that keeps `value`. */
function converted(value: unknown, target: any): unknown {
  const source: any = domainOf(value);
  const native = nativeOf(value);
  if (source !== null && source.equals(target)) return native;
  if (source instanceof INTEGER && target instanceof INTEGER) return target.fit("convert", native);
  if (source instanceof INTEGER && target instanceof IEEE754) return Ieee754.from_integer(native, target.format, target.rounding);
  if (source instanceof IEEE754 && target instanceof IEEE754) {
    return Ieee754.convert(source.format, native, target.format, target.rounding);
  }
  if (source instanceof IEEE754 && target instanceof INTEGER) {
    return integer(target, Ieee754.to_integer(source.format, native, source.rounding));
  }
  if (source instanceof BYTES && target instanceof BYTES) return native; // a value of the target's width, or none
  if ((target instanceof PACKED && target.domain.equals(source)) || (source instanceof PACKED && source.domain.equals(target))) {
    return native;
  }
  throw new TypeError(`cannot convert ${describe(value)} to ${target.name()}`);
}

function convert(args: F.Thunk[], node: any): unknown {
  const value = args[0]?.();
  return value === null ? null : Domains.value(node.domain, converted(value, node.domain));
}

/** The width in bits of a fixed-width domain, or null. */
function width(domain: any): number | null {
  if ((domain instanceof INTEGER || domain instanceof BITS) && typeof domain.width === "bigint" && domain.width > 0n) {
    return Number(domain.width);
  }
  if (domain instanceof BYTES && domain.width !== null) return 8 * Number(domain.width);
  return domain instanceof IEEE754 ? Ieee754.WIDTHS.get(domain.format) ?? null : null;
}

/** A fixed-width value's bit pattern, as an unsigned bigint. */
function toPattern(domain: any, native: any, bits: number): bigint {
  if (domain instanceof INTEGER) return BigInt.asUintN(bits, native); // two's complement
  if (domain instanceof IEEE754) return Ieee754.to_bits(domain.format, native);
  return fromBytes(native);
}

/** The native of a fixed-width domain with a bit pattern. */
function fromPattern(domain: any, value: bigint, bits: number): unknown {
  if (domain instanceof INTEGER) return domain.signed ? BigInt.asIntN(bits, value) : value;
  if (domain instanceof IEEE754) return Ieee754.from_bits(domain.format, value);
  return bytesOf(value, Math.ceil(bits / 8));
}

/** The same bit pattern, big-endian, in a domain of the same width. */
function reinterpret(args: F.Thunk[], node: any): unknown {
  const value = args[0]?.();
  if (value === null) return null;
  const [source, target] = [domainOf(value), node.domain];
  const [m, n] = [width(source), width(target)];
  if (m === null || n === null) throw new TypeError(`cannot reinterpret ${describe(value)} as ${target.name()}`);
  if (m !== n) throw new TypeError(`cannot reinterpret ${describe(value)} as ${target.name()}: ${m} bits and ${n}`);
  return Domains.value(target, fromPattern(target, toPattern(source, nativeOf(value), m), n));
}

/** A packed value's code, in its representation. */
function pack(args: F.Thunk[]): unknown {
  const value = args[0]?.();
  if (value === null) return null;
  const domain: any = domainOf(value);
  if (!(domain instanceof PACKED)) throw new TypeError(`pack expects a packed value, got ${describe(value)}`);
  const [representation, code] = [domain.representation, domain.code(nativeOf(value))];
  const native = representation instanceof INTEGER ? code : fromPattern(representation, code, Number(representation.width));
  return Domains.value(representation, native);
}

/** The value of the packed domain whose code a representation holds. */
function unpack(args: F.Thunk[], node: any): unknown {
  const value = args[0]?.();
  if (value === null) return null;
  const target = node.domain;
  if (!(target instanceof PACKED)) throw new TypeError(`unpack needs a packed domain, got ${target.name()}`);
  const representation = target.representation;
  if (!representation.equals(domainOf(value))) throw new TypeError(`unpack expects ${representation.name()}, got ${describe(value)}`);
  const code: bigint = representation instanceof INTEGER ? nativeOf(value) : fromBytes(nativeOf(value));
  const index = target.codes.indexOf(code);
  if (index < 0) throw new ValueError(`no member of ${target.name()} has code ${code}`);
  return new Domains.Value(target, target.domain.members[index]);
}

/** The implementation of each core operation. */
export const OPERATIONS: ReadonlyMap<string, F.Implementation> = new Map<string, F.Implementation>([
  ["get", strict(read)], ["has", strict(read)],
  ...["eq", "ne"].map((name) => [name, strict(equality)] as [string, F.Implementation]),
  ...["lt", "le", "gt", "ge"].map((name) => [name, strict(order)] as [string, F.Implementation]),
  ...(["and", "or", "implies"] as const).map((name) => [name, logic(name)] as [string, F.Implementation]),
  ["not", strict(not)],
  ...["add", "sub", "mul", "neg"].map((name) => [name, strict(arithmetic)] as [string, F.Implementation]),
  ...["bitand", "bitor", "bitxor", "bitnot"].map((name) => [name, strict(bitwise)] as [string, F.Implementation]),
  ...["shl", "shr"].map((name) => [name, strict(shift)] as [string, F.Implementation]),
  ["convert", convert], ["reinterpret", reinterpret], ["pack", pack], ["unpack", unpack],
]);

const interpreter = new F.Interpreter(Expressions.DIALECT, new Map([["operation", OPERATIONS]]),
  { typed: (domain, value) => new Domains.Value(domain, value) });

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

/** Whether `value` satisfies the rule `predicate`, evaluated with `this` bound to it; `null` if unknown. */
export function predicate(predicate: unknown, value: unknown): boolean | null {
  const result = OfAny(predicate as Expressions.OfAny.Spec, { this: value });
  if (result !== null && typeof result !== "boolean") throw new TypeError(`a predicate must be a bool, got ${typeName(result)}`);
  return result as boolean | null;
}
