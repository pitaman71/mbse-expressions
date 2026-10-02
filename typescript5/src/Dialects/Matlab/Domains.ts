/**
 * Domains of the Matlab dialect: MATLAB's scalar classes, and arrays of them.
 *
 * `Double` holds numbers (a constant `18n` is the double 18), `Logical` holds `true` and `false`, `String` holds
 * string scalars ("abc", not 'abc' character vectors) and `Struct` the values fields are read from: a mapping, or an
 * object that writes its properties through `accept`. `Numeric` is `Double` or `Logical`, which MATLAB converts into
 * each other: `true + 1` is 2. `+` with a string concatenates. An array holds a list property's values; it is read by
 * the collection functions (`numel`, `sum`, `all`, ...), indexed and iterated by `arrayfun`, and operators take
 * scalars only.
 */

import { Repr } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";

export const Anything = D.Anything;

/** Whether `value` is a mapping: a `Map`, or a plain object. */
export function isMapping(value: unknown): value is Map<string, unknown> | Record<string, unknown> {
  if (value instanceof Map) return true;
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

/** Whether fields can be read from `value`. */
export function is_struct(value: unknown): boolean {
  return isMapping(value)
    || (value !== null && typeof value === "object" && typeof (value as { accept?: unknown }).accept === "function");
}

export const Double = new D.OfTypes("double", Number, BigInt);
export const Logical = new D.OfTypes("logical", Boolean);
const StringDomain = new D.OfTypes("string", String);
export { StringDomain as String };
export const Struct = new D.OfValues("struct", is_struct);
export const Numeric = new D.OfUnion(Double, Logical);
export const Scalar = new D.OfUnion(Double, Logical, StringDomain);

const COMPARE = new D.Function([Scalar, Scalar], Logical);
const ARITHMETIC = new D.Function([Numeric, Numeric], Double);

/** The binary operators. */
export const BINARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ...["==", "~=", "<", "<=", ">", ">="].map((operator) => [operator, COMPARE] as [string, D.Signature]),
  ["&&", new D.Function([Numeric, Numeric], Logical)], ["||", new D.Function([Numeric, Numeric], Logical)],
  ["+", new D.Overloaded(ARITHMETIC, new D.Function([Scalar, Scalar], StringDomain))], ["-", ARITHMETIC],
  [".*", ARITHMETIC],
]);

/** The unary operators. */
export const UNARY: ReadonlyMap<string, D.Signature> = new Map([
  ["~", new D.Function([Numeric], Logical)], ["-", new D.Function([Numeric], Double)],
]);

/** The functions: `isfield`, the bit functions on doubles, and the functions of arrays. */
export const CALLS: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["isfield", new D.Function([Anything, StringDomain], Logical)],
  ...["bitand", "bitor", "bitxor", "bitshift"].map((name) => [name, ARITHMETIC] as [string, D.Signature]),
  ...["all", "any"].map((name) => [name, new D.Function([Anything], Logical)] as [string, D.Signature]),
  ...["nnz", "numel", "sum"].map((name) => [name, new D.Function([Anything], Double)] as [string, D.Signature]),
  ...["min", "max", "unique"].map((name) => [name, new D.Function([Anything], Anything)] as [string, D.Signature]),
  ["ismember", new D.Function([Anything, Anything], Logical)],
]);

/** A field of a struct. */
export const FIELD = new D.Function([Struct], Anything);

/** An element of an array, from 1. */
export const INDEX = new D.Function([Anything, Numeric], Anything);

/** `arrayfun`'s signature: the domain of an array's elements is not known statically. */
class Iterated extends D.Opaque {
  items(_domain: D.Domain): D.Domain {
    return Anything;
  }
}

/** `arrayfun(@(name) body, array)`. */
export const ARRAYFUN = new Iterated();

const NATIVES: ReadonlyMap<string, D.Domain> = new Map([
  ["bool", Logical], ["int", Double], ["float", Double], ["str", StringDomain],
]);

/** The domain of a constant. */
export function of(value: unknown): D.Domain {
  return NATIVES.get(Repr.typeName(value)) as D.Domain;
}
