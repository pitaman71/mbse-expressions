/**
 * Evaluators of the Basic dialect: compute the value of an expression.
 *
 * `Evaluators.OfAny(term, scope)` evaluates any term with the variables in `scope` bound, and `Evaluators.OfLiteral`,
 * `OfCall`, `OfVariable`, `OfLet` and `OfQuantifier` evaluate one kind; each takes a term value, or anything
 * `Terms.term` reads one from (an `Expression`, its root). The value is a native value, an object, or `null` when it is
 * unknown.
 *
 * - Three-valued logic: an absent property is unknown, and comparisons with unknown or incomparable values are
 *   unknown. `and`, `or`, `not` and `implies` follow Kleene's logic; the second operand is evaluated only when the
 *   first does not decide.
 * - No coercion. Comparisons follow mbse-basis [CAP-111: equality and ordering defined by the
 *   schema](../../../../../mbse-basis/docs/capabilities/CAP-111.md): natives of one type by value, reference objects by
 *   identity, everything else deeply (see Deep equality); values of different types are incomparable. Arithmetic takes
 *   numbers of one domain.
 * - Values are taken by the schemas they are written with: a term carries no domain (the port's stage 3, Decided, 1 and
 *   2), so an int is an unbounded integer, a float an IEEE 754 binary64 number, and the bitwise operations and shifts
 *   take ints, as two's complement of infinite width.
 * - Collections: a container property reads as a `Domains.Collection`, and so do the values of the container
 *   constructors, `list` (positional) and `mapping` (keyed: a key unknown makes it unknown, and two equal keys throw), and
 *   `entries` gives an object's entries as one of `Domains.Record`s, which `get` and `has` read. The collection
 *   operations and the quantifiers (`all`, `any`, `count`) follow Kleene's logic over the items; an unknown collection
 *   gives unknown.
 * - Only the operations Basic defines (`Expressions.OPERATIONS`) are evaluated. Unknown operations, wrong numbers of
 *   arguments, unbound variables and wrong operand types raise, as do the problems `validate()` reports.
 * - `get` and `has` read any data object, read through mbse-schemas' readers (`Framework/Objects`): reference
 *   objects, value objects, union and intersection values.
 * - Deep equality: a value object, a union or intersection value, or an entry's record is equal to another when the
 *   properties each holds (a union's branch, an intersection's parts) are absent in both or equal in both, read
 *   through the visitor protocols; a property present in one and absent in the other is incomparable. A positional collection is equal to another of the same length whose items are equal in order, and
 *   unequal to one of another length; a keyed collection to another with the same keys and equal values, in any
 *   order, and incomparable to one with other keys. Equal is Kleene's and of the parts' equalities.
 *
 * A constraint about a value is evaluated with the variable it names bound to it, such as `person`:
 * `Evaluators.OfAny(constraint, { person: value })`.
 */

import { Comparison, Errors, Repr, Schemas } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Evaluators.js";
import * as Objects from "../../Framework/Objects.js";
import * as S from "../../Framework/Symbolics.js";
import * as Terms from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";
import * as Expressions from "./Expressions.js";

const { typeName } = Repr;
const { ValueError } = Errors;
type Native = Visitors.Scalar;

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

/** A call's operation's name. */
function callableOf(node: any): string {
  return Terms.attributesOf(Terms.kindOf(node)[1]).get("callable");
}

/** An operation that evaluates all its arguments. */
function strict(fn: (name: string, values: unknown[]) => unknown): F.Implementation {
  return (args, node) => fn(callableOf(node), args.map((argument) => argument()));
}

function not(name: string, values: unknown[]): boolean | null {
  const t = truth(name, values[0]);
  return t === null ? null : !t;
}

const isReadable = Objects.isObject;
/** A reference object, compared by identity. */
const isObject = Objects.isReference;

/** A record's fields, or the properties a value holds, as Basic reads them. */
function fieldsOf(value: unknown): ReadonlyMap<string, unknown> {
  if (value instanceof Domains.Record) return value.fields;
  return new Map([...Objects.properties(value)].map(([name, v]) => [name, valueOf(v)]));
}

/** A property's value as Basic reads it: a container as a collection. */
function valueOf(value: unknown): unknown {
  if (value instanceof Objects.Listed) {
    return new Domains.Collection(value.values.map(valueOf), value.keys === null ? null : value.keys.map(valueOf));
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
  else if (isReadable(target)) properties = Objects.properties(target);
  else throw new TypeError(`${name} expects an object, got ${typeName(target)}`);
  if (name === "has") return properties.has(propertyName);
  return valueOf(properties.get(propertyName) ?? null);
}

function compare(a: Native, b: Native): Comparison.Result {
  const schema = new Schemas.OfScalar.Data(NATIVES.get(typeName(a)));
  return new Comparison.OfScalar(schema, a).compare(new Comparison.OfScalar(schema, b));
}

function sameNativeType(a: unknown, b: unknown): boolean {
  const name = typeName(a);
  return NATIVES.has(name) && Schemas.isScalarOf(NATIVES.get(name), a) && Schemas.isScalarOf(NATIVES.get(name), b);
}

/** Whether `a` equals `b`: natives of one type by value, objects by identity, collections, records and values deeply;
 * `null` if unknown or incomparable. */
function equal(a: unknown, b: unknown): boolean | null {
  if (a === null || b === null) return null;
  if (sameNativeType(a, b)) return compare(a as Native, b as Native) === 0;
  if (isObject(a) || isObject(b)) return isObject(a) && isObject(b) ? a === b : null;
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
  if (a === null || b === null || !sameNativeType(a, b)) return null;
  const o = compare(a as Native, b as Native);
  if (o === null) return null;
  return { lt: o < 0, le: o <= 0, gt: o > 0, ge: o >= 0 }[name as "lt"];
}

/** A value's domain, by the native type it is written with, or null when it is not a native (an object). */
function domainOf(value: unknown): Domains.Domain | null {
  return Domains.nativeDomain(value);
}

type Kind = abstract new (...args: never[]) => Domains.Domain;

/** The one domain of `values`, which must be of `kinds`; throws naming `what` they must be. */
function operands(name: string, values: unknown[], kinds: readonly Kind[], what: readonly [string, string]): any {
  const domains = values.map(domainOf);
  const first = domains[0];
  if (!kinds.some((kind) => first instanceof kind) || domains.some((domain) => !(domain as Domains.Domain).equals(first))) {
    if (values.length === 1) throw new TypeError(`${name} expects ${what[0]}, got ${typeName(values[0])}`);
    throw new TypeError(`${name} expects ${what[1]} of one domain, got ${typeName(values[0])} and ${typeName(values[1])}`);
  }
  return first;
}

const INTEGER: any = Domains.OfInteger.Data;
const IEEE754: any = Domains.OfIeee754.Data;

/** `operator` (by default `name`) on numbers of one domain, ints unbounded and floats binary64; errors name `name`. */
function arithmetic(name: string, values: unknown[], operator: string = name): unknown {
  if (values.some((value) => value === null)) return null;
  operands(name, values, [INTEGER, IEEE754], ["a number", "numbers"]);
  const natives = values as any[];
  if (operator === "neg") return -natives[0];
  const [a, b] = natives;
  return operator === "add" ? a + b : operator === "sub" ? a - b : a * b;
}

/** On ints, as two's complement of infinite width. */
function bitwise(name: string, values: unknown[]): unknown {
  if (values.some((value) => value === null)) return null;
  operands(name, values, [INTEGER], ["an integer", "integers"]);
  if (name === "bitnot") return ~(values[0] as bigint);
  const [a, b] = values as [bigint, bigint];
  return name === "bitand" ? a & b : name === "bitor" ? a | b : a ^ b;
}

/** `shl` and `shr`: multiplying or dividing (toward negative infinity) an int by a power of two. */
function shift(name: string, values: unknown[]): unknown {
  const [value, count] = values;
  if (value === null || count === null) return null;
  operands(name, [value], [INTEGER], ["an integer", ""]);
  if (typeof count !== "bigint") throw new TypeError(`${name} expects an integer count, got ${typeName(count)}`);
  if (count < 0n) throw new ValueError(`${name} needs a non-negative count, got ${count}`);
  return name === "shl" ? (value as bigint) << count : (value as bigint) >> count;
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
  if (typeof index !== "bigint") throw new TypeError(`item expects an integer position, got ${typeName(index)}`);
  const position = index;
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
  return ["bigint", "number", "string"].includes(typeof value) || Schemas.isScalarOf(Uint8Array, value);
}

/** `min` or `max`: the least or greatest item of an ordered domain; unknown when there is none, or two items are
 * incomparable. */
function extreme(name: string, values: unknown[]): unknown {
  const collection = collectionOf(name, values[0]);
  if (collection === null || collection.items.length === 0 || collection.items.some((each) => each === null)) return null;
  const first = collection.items[0];
  for (const each of collection.items) {
    if (!ordered(each) || !(domainOf(each) as Domains.Domain).equals(domainOf(first))) {
      throw new TypeError(`${name} expects ordered values of one domain, got ${typeName(first)} and ${typeName(each)}`);
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
  const found = Objects.entries(target, adjacency);
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

/** A list of its elements' values, in order. */
function list(args: F.Thunk[]): Domains.Collection {
  return new Domains.Collection(args.map((argument) => argument()));
}

/** A keyed collection of its entries' values by their keys' values, in order; unknown where a key is unknown, and two
 * equal keys throw. */
function mapping(args: F.Thunk[]): Domains.Collection | null {
  const values = args.map((argument) => argument());
  const keys = values.filter((_, i) => i % 2 === 0);
  const items = values.filter((_, i) => i % 2 === 1);
  if (keys.includes(null)) return null;
  keys.forEach((key, i) => {
    if (keys.slice(0, i).some((other) => equal(key, other))) {
      throw new ValueError(`a mapping's keys are distinct, got ${Repr.repr(key)} twice`);
    }
  });
  return new Domains.Collection(items, keys);
}

/** The implementation of each quantifier. */
export const QUANTIFIERS: ReadonlyMap<string, F.Implementation> = new Map(["all", "any", "count"].map((name) =>
  [name, quantifier(name)] as [string, F.Implementation]));

/** The implementation of each operation Basic defines. */
export const OPERATIONS: ReadonlyMap<string, F.Implementation> = new Map<string, F.Implementation>([
  ["get", strict(read)], ["has", strict(read)],
  ...["eq", "ne"].map((name) => [name, strict(equality)] as [string, F.Implementation]),
  ...["lt", "le", "gt", "ge"].map((name) => [name, strict(order)] as [string, F.Implementation]),
  ...(["and", "or", "implies"] as const).map((name) => [name, logic(name)] as [string, F.Implementation]),
  ["not", strict(not)],
  ...["add", "sub", "mul", "neg"].map((name) => [name, strict(arithmetic)] as [string, F.Implementation]),
  ...["bitand", "bitor", "bitxor", "bitnot"].map((name) => [name, strict(bitwise)] as [string, F.Implementation]),
  ...["shl", "shr"].map((name) => [name, strict(shift)] as [string, F.Implementation]),
  ["count", strict(count)], ["item", strict(item)], ["in", strict(inCollection)], ["unique", strict(unique)],
  ["sum", strict(sum)], ["min", strict(extreme)], ["max", strict(extreme)], ["entries", strict(entries)],
]);

/** The interpreter of the Basic dialect, which `Partials` reduces with. */
export const INTERPRETER = new F.Interpreter(Expressions.DIALECT, new Map<string, any>([["call", OPERATIONS],
  ["quantifier", QUANTIFIERS], ["list", list], ["mapping", mapping]]));

/** The value of any term, with the variables in `scope` bound. */
export function OfAny(expression: unknown, scope: Scope | null = null): unknown {
  return INTERPRETER.run(expression, scope);
}

function of(tag: string, expression: unknown, scope: Scope | null): unknown {
  const term = Terms.term(expression);
  const found = Terms.kindOf(term)[0];
  if (found !== tag) throw new TypeError(`expected ${Terms.article(tag)}, got ${Terms.article(found)}`);
  return INTERPRETER.run(term, scope);
}

/** The value of a literal. */
export function OfLiteral(expression: unknown, scope: Scope | null = null): unknown {
  return of("literal", expression, scope);
}

/** The value of a call, with the variables in `scope` bound. */
export function OfCall(expression: unknown, scope: Scope | null = null): unknown {
  return of("call", expression, scope);
}

/** The value `scope` binds to a variable. */
export function OfVariable(expression: unknown, scope: Scope | null = null): unknown {
  return of("variable", expression, scope);
}

/** The value of a let's body, with its name bound to its value and the variables in `scope` bound. */
export function OfLet(expression: unknown, scope: Scope | null = null): unknown {
  return of("let", expression, scope);
}

/** The value of a quantifier, with the variables in `scope` bound. */
export function OfQuantifier(expression: unknown, scope: Scope | null = null): unknown {
  return of("quantifier", expression, scope);
}
