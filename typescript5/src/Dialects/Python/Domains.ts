/**
 * Domains of the Python dialect: Python's values, by type.
 *
 * `Bool`, `Int`, `Float`, `Str` and `Bytes` hold values of exactly that type; `Integral` is `Bool` or `Int` and
 * `Numeric` adds `Float`, since Python's arithmetic takes bools as ints (`True + 1` is 2). Anything else, such as an
 * object or a module, is `Anything`: what an attribute, a subscript or a call gives is not known statically. `and`
 * and `or` give one of their operands, as Python's do.
 */

import { Repr } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";

export const Anything = D.Anything;
export const Bool = new D.OfTypes("bool", Boolean);
export const Int = new D.OfTypes("int", BigInt);
export const Float = new D.OfTypes("float", Number);
export const Str = new D.OfTypes("str", String);
export const Bytes = new D.OfTypes("bytes", Uint8Array);
export const Integral = new D.OfUnion(Bool, Int);
export const Numeric = new D.OfUnion(Bool, Int, Float);

const EQUAL = new D.Function([Anything, Anything], Bool);
const ORDER = new D.Overloaded(new D.Function([Numeric, Numeric], Bool), new D.Same(2, [Str, Bytes], Bool));
const INTEGRAL = new D.Function([Integral, Integral], Int);
const FLOAT = new D.Function([Numeric, Numeric], Float);

type Entry = [string, D.Signature];

/** The comparison operators, membership among them. */
export const COMPARE: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["==", EQUAL], ["!=", EQUAL], ...["<", "<=", ">", ">="].map((operator) => [operator, ORDER] as Entry),
  ["in", EQUAL], ["not in", EQUAL],
]);

/** A generator expression's signature: what it iterates and yields is not known statically. */
class Generated extends D.Opaque {
  items(_domain: D.Domain): D.Domain {
    return Anything;
  }
}

/** `(element for name in iterable if condition)`. */
export const GENERATOR = new Generated();

/** The boolean operators, which give one of their operands. */
export const BOOLOP: ReadonlyMap<string, D.Signature> = new Map([["and", new D.Either(2)], ["or", new D.Either(2)]]);

/** The arithmetic and bitwise operators. */
export const BINOP: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["+", new D.Overloaded(new D.Same(2, [Str, Bytes]), INTEGRAL, FLOAT)],
  ...["-", "*", "//", "%"].map((operator) => [operator, new D.Overloaded(INTEGRAL, FLOAT)] as Entry),
  ["/", FLOAT], ["**", new D.Overloaded(new D.Function([Integral, Integral], new D.OfUnion(Int, Float)), FLOAT)],
  ...["&", "|", "^"].map((operator) => [operator, new D.Overloaded(new D.Function([Bool, Bool], Bool), INTEGRAL)] as Entry),
  ["<<", INTEGRAL], [">>", INTEGRAL],
]);

/** The unary operators. */
export const UNARYOP: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["not", new D.Function([Anything], Bool)],
  ...["-", "+"].map((operator) => [operator,
    new D.Overloaded(new D.Function([Integral], Int), new D.Function([Float], Float))] as Entry),
  ["~", new D.Function([Integral], Int)],
]);

const NATIVES: ReadonlyMap<string, D.Domain> = new Map([
  ["bool", Bool], ["int", Int], ["float", Float], ["str", Str], ["bytes", Bytes],
]);

/** The domain of a constant. */
export function of(value: unknown): D.Domain {
  return NATIVES.get(Repr.typeName(value)) as D.Domain;
}
