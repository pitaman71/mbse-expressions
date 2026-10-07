/**
 * Evaluators of the Basic dialect: compute the value of an expression.
 *
 * `Evaluators.OfAny(expression, scope)` evaluates any expression with the variables in `scope` bound, and
 * `Evaluators.OfLiteral`, `OfOperation`, `OfVariable` and `OfLet` evaluate one kind; each accepts that kind's `Spec`
 * (see `Expressions`), including `Writer`s. The value is a native value, an object, or `null` when it is unknown.
 *
 * - Three-valued logic: an absent property is unknown, and comparisons with unknown or incomparable values are
 *   unknown. `and`, `or`, `not` and `implies` follow Kleene's logic; the second operand is evaluated only when the
 *   first does not decide.
 * - No coercion. Comparisons follow mbse-schemas' EQUALITY.md: natives of one type by value, reference objects by
 *   identity, everything else deeply (see Deep equality); values of different types are incomparable. Arithmetic takes
 *   numbers of one domain.
 * - Values of other domains than the natives' defaults are typed values (`Domains.Value`): a literal of such a domain
 *   evaluates to one, and the operations take them by domain. Values of different domains are incomparable; arithmetic
 *   and the bitwise operations take values of one domain, and an integer domain's overflow applies to their results.
 *   `convert` keeps a value in the operation's domain, `reinterpret` keeps its bit pattern, and `pack` and `unpack` go
 *   to and from a packed domain's representation.
 * - Collections: a list property reads as a `Domains.Collection`, and `entries` gives an object's entries as one of
 *   `Domains.Record`s, which `get` and `has` read. The collection operations and the quantifiers (`all`, `any`,
 *   `count`) follow Kleene's logic over the items; an unknown collection gives unknown.
 * - Only core operations (`Expressions.CORE`) are evaluated. Unknown operations, wrong numbers of arguments, unbound
 *   variables and wrong operand types raise, as do the problems `validate()` reports.
 * - `get` and `has` read any object that writes its properties through `accept`, including value objects.
 * - Deep equality: a value object, a union or intersection value, or an entry's record is equal to another when the
 *   properties each writes (a union's branch, an intersection's parts) are absent in both or equal in both, read
 *   through the visitor protocols, so without a schema; a property present in one and absent in the other is
 *   incomparable. A positional collection is equal to another of the same length whose items are equal in order, and
 *   unequal to one of another length; a keyed collection to another with the same keys and equal values, in any
 *   order, and incomparable to one with other keys. Equal is Kleene's and of the parts' equalities.
 *
 * A constraint about a value is evaluated with `this` bound to it: `Evaluators.OfAny(constraint, { this: value })`.
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

/** A record's fields, or the properties a value writes, as Basic reads them. */
function fieldsOf(value: unknown): ReadonlyMap<string, unknown> {
  if (value instanceof Domains.Record) return value.fields;
  return new Map([...Validators.properties_of(value as Readable)].map(([name, v]) => [name, valueOf(v)]));
}

/** A property's value as Basic reads it: a list as a collection. */
function valueOf(value: unknown): unknown {
  if (value instanceof Validators.ListRecord) {
    const keyed = value.keys.some((key) => key !== null && key !== undefined);
    return new Domains.Collection(value.values.map(valueOf), keyed ? value.keys.map(valueOf) : null);
  }
  return value;
}

/** `get`: the property's value, or `null` when absent. `has`: whether it is present. A record's fields are its
 * properties. */
function read(name: string, values: unknown[]): unknown {
  const [target, propertyName] = values;
  if (typeof propertyName !== "string") {
    throw new TypeError(`${name} expects a property name, got ${typeName(propertyName)}`);
  }
  if (target === null) return null;
  let properties: ReadonlyMap<string, unknown>;
  if (target instanceof Domains.Record) properties = target.fields;
  else if (isReadable(target)) properties = Validators.properties_of(target);
  else throw new TypeError(`${name} expects an object, got ${typeName(target)}`);
  if (name === "has") return properties.has(propertyName);
  return valueOf(properties.get(propertyName) ?? null);
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
  if (isObject(a) || isObject(b)) return isObject(a) && isObject(b) ? a.identity() === b.identity() : null;
  if (isCollection(a) && isCollection(b)) {
    return equalCollections(collectionOf("eq", a) as Domains.Collection, collectionOf("eq", b) as Domains.Collection);
  }
  if (isValue(a) && isValue(b)) {
    const [x, y] = [fieldsOf(a), fieldsOf(b)];
    if (x.size !== y.size || [...x.keys()].some((name) => !y.has(name))) return null;
    return all([...x].map(([name, value]) => equal(value, y.get(name) as unknown)));
  }
  return null;
}

function isCollection(value: unknown): boolean {
  return value instanceof Domains.Collection || Array.isArray(value);
}

/** A record, or a value that writes its properties: compared deeply. */
function isValue(value: unknown): boolean {
  return value instanceof Domains.Record || isReadable(value);
}

/** Kleene's and. */
function all(results: (boolean | null)[]): boolean | null {
  if (results.includes(false)) return false;
  return results.includes(null) ? null : true;
}

function equalCollections(a: Domains.Collection, b: Domains.Collection): boolean | null {
  if (a.keys === null && b.keys === null) {
    return a.items.length !== b.items.length ? false : all(a.items.map((item, i) => equal(item, b.items[i])));
  }
  if (a.keys === null || b.keys === null || a.keys.length !== b.keys.length) return null;
  const pairs: [unknown, unknown][] = [];
  for (const [i, key] of a.keys.entries()) {
    const found = b.keys.findIndex((k) => equal(key, k) === true);
    if (found < 0) return null;
    pairs.push([a.items[i], b.items[found]]);
  }
  return all(pairs.map(([x, y]) => equal(x, y)));
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

/** `operator` (by default `name`) on numbers of one domain; errors and overflows name `name`. */
function arithmetic(name: string, values: unknown[], operator: string = name): unknown {
  if (values.some((value) => value === null)) return null;
  const domain = operands(name, values, [INTEGER, IEEE754], ["a number", "numbers"]);
  const natives = values.map(nativeOf);
  if (domain instanceof IEEE754 && !domain.equals(Domains.Float)) { // the default's is the host's own
    return new Domains.Value(domain, Ieee754.operate(operator, domain.format, domain.rounding, natives));
  }
  let result: any;
  if (operator === "neg") {
    result = -natives[0];
  } else {
    const [a, b] = natives;
    result = operator === "add" ? a + b : operator === "sub" ? a - b : a * b;
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

/** A collection, an array as a positional one, or null when unknown. */
function collectionOf(name: string, value: unknown): Domains.Collection | null {
  if (value === null || value instanceof Domains.Collection) return value;
  if (Array.isArray(value)) return new Domains.Collection(value);
  throw new TypeError(`${name} expects a collection, got ${typeName(value)}`);
}

function count(name: string, values: unknown[]): bigint | null {
  const collection = collectionOf(name, values[0]);
  return collection === null ? null : BigInt(collection.items.length);
}

/** The item at a position, from 0, or at a key; unknown when there is none. */
function item(name: string, values: unknown[]): unknown {
  const [collection, index] = [collectionOf(name, values[0]), values[1]];
  if (collection === null || index === null) return null;
  const keys = collection.keys;
  if (keys !== null) {
    const found = keys.findIndex((key) => equal(key, index) === true);
    return found < 0 ? null : collection.items[found];
  }
  if (!(domainOf(index) instanceof INTEGER)) throw new TypeError(`item expects an integer position, got ${describe(index)}`);
  const position = nativeOf(index) as bigint;
  return position >= 0n && position < BigInt(collection.items.length) ? collection.items[Number(position)] : null;
}

/** Kleene's or of `eq(x, item)` over the items. */
function inCollection(name: string, values: unknown[]): boolean | null {
  const [value, collection] = [values[0], collectionOf(name, values[1])];
  if (collection === null || value === null) return null;
  let result: boolean | null = false;
  for (const each of collection.items) {
    const same = equal(value, each);
    if (same) return true;
    if (same === null) result = null;
  }
  return result;
}

/** Kleene's and of `ne` over every two items. */
function unique(name: string, values: unknown[]): boolean | null {
  const collection = collectionOf(name, values[0]);
  if (collection === null) return null;
  let result: boolean | null = true;
  const items = collection.items;
  for (let i = 0; i < items.length; i++) {
    for (const b of items.slice(i + 1)) {
      const same = equal(items[i], b);
      if (same) return false;
      if (same === null) result = null;
    }
  }
  return result;
}

/** The items added in order, as `add` adds; an empty sum is the int 0. */
function sum(name: string, values: unknown[]): unknown {
  const collection = collectionOf(name, values[0]);
  if (collection === null || collection.items.some((each) => each === null)) return null;
  if (collection.items.length === 0) return 0n;
  let total = collection.items[0];
  operands(name, [total], [INTEGER, IEEE754], ["numbers", ""]);
  for (const each of collection.items.slice(1)) total = arithmetic(name, [total, each], "add");
  return total;
}

function ordered(value: unknown): boolean {
  if (value instanceof Domains.Value) return value.domain.kind().ORDERED;
  return ["bigint", "number", "string"].includes(typeof value) || Schemas.isNativeOf(Uint8Array, value);
}

/** `min` or `max`: the least or greatest item of an ordered domain; unknown when there is none, or two items are
 * incomparable. */
function extreme(name: string, values: unknown[]): unknown {
  const collection = collectionOf(name, values[0]);
  if (collection === null || collection.items.length === 0 || collection.items.some((each) => each === null)) return null;
  const first = collection.items[0];
  for (const each of collection.items) {
    if (!ordered(each) || !(domainOf(each) as Domains.Domain).equals(domainOf(first))) {
      throw new TypeError(`${name} expects ordered values of one domain, got ${describe(first)} and ${describe(each)}`);
    }
  }
  let best = first;
  for (const each of collection.items.slice(1)) {
    const better = order(name === "min" ? "lt" : "gt", [each, best]);
    if (better === null) return null;
    if (better) best = each;
  }
  return best;
}

/** An object's entries in an adjacency, as records of their other links' targets and their property values. */
function entries(name: string, values: unknown[]): Domains.Collection | null {
  const [target, adjacency] = values;
  if (typeof adjacency !== "string") throw new TypeError(`entries expects an adjacency name, got ${typeName(adjacency)}`);
  if (target === null) return null;
  if (!isReadable(target)) throw new TypeError(`entries expects an object, got ${typeName(target)}`);
  const found = Validators.entries_of(target).get(adjacency) ?? [];
  return new Domains.Collection(found.map((entry) => new Domains.Record(new Map<string, unknown>([...entry.targets,
    ...[...entry.values].map(([k, v]) => [k, valueOf(v)] as [string, unknown])]))));
}

/** `all`, `any` or `count` of the body over the items, by Kleene's logic, deciding as early as it can. */
function quantifier(name: string): F.Implementation {
  return (args) => {
    const collection = collectionOf(name, (args[0] as F.Thunk)());
    if (collection === null) return null;
    let result: any = name === "all" ? true : name === "any" ? false : 0n;
    for (const each of collection.items) {
      const t = truth(name, (args[1] as (item: unknown) => unknown)(each));
      if (t === null) {
        if (name === "count") return null;
        result = null;
      } else if (t === (name === "any") && name !== "count") {
        return t;
      } else if (t && name === "count") {
        result += 1n;
      }
    }
    return result;
  };
}

/** The implementation of each quantifier. */
export const QUANTIFIERS: ReadonlyMap<string, F.Implementation> = new Map(["all", "any", "count"].map((name) =>
  [name, quantifier(name)] as [string, F.Implementation]));

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
  ["count", strict(count)], ["item", strict(item)], ["in", strict(inCollection)], ["unique", strict(unique)],
  ["sum", strict(sum)], ["min", strict(extreme)], ["max", strict(extreme)], ["entries", strict(entries)],
]);

/** The interpreter of the Basic dialect, which `Partials` reduces with. */
export const INTERPRETER = new F.Interpreter(Expressions.DIALECT, new Map([["operation", OPERATIONS], ["quantifier", QUANTIFIERS]]),
  { typed: (domain, value) => new Domains.Value(domain, value) });

/** The value of any expression, with the variables in `scope` bound. */
export function OfAny(expression: Expressions.OfAny.Spec, scope: Scope = {}): unknown {
  return INTERPRETER.run(Expressions.OfAny.resolve(expression), scope);
}

/** The value of a literal. */
export function OfLiteral(expression: Expressions.OfLiteral.Spec, scope: Scope = {}): unknown {
  return INTERPRETER.run(Expressions.OfLiteral.resolve(expression), scope);
}

/** The value of an operation, with the variables in `scope` bound. */
export function OfOperation(expression: Expressions.OfOperation.Spec, scope: Scope = {}): unknown {
  return INTERPRETER.run(Expressions.OfOperation.resolve(expression), scope);
}

/** The value `scope` binds to a variable. */
export function OfVariable(expression: Expressions.OfVariable.Spec, scope: Scope = {}): unknown {
  return INTERPRETER.run(Expressions.OfVariable.resolve(expression), scope);
}

/** The value of a let's body, with its name bound to its value and the variables in `scope` bound. */
export function OfLet(expression: Expressions.OfLet.Spec, scope: Scope = {}): unknown {
  return INTERPRETER.run(Expressions.OfLet.resolve(expression), scope);
}

/** The value of a quantifier, with the variables in `scope` bound. */
export function OfQuantifier(expression: Expressions.OfQuantifier.Spec, scope: Scope = {}): unknown {
  return INTERPRETER.run(Expressions.OfQuantifier.resolve(expression), scope);
}
