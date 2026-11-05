/**
 * Domains of the Python3 dialect: Python's values, by type.
 *
 * `Bool`, `Int`, `Float`, `Str` and `Bytes` hold values of exactly that type; `Integral` is `Bool` or `Int` and
 * `Numeric` adds `Float`, since Python's arithmetic takes bools as ints (`True + 1` is 2). `NoneType`, `Ellipsis` and
 * `Complex` are the domains of Python3's own constants. Anything else, such as an object or a module, is `Anything`:
 * what an attribute, a subscript or a call gives is not known statically. `and` and `or` give one of their operands,
 * as Python's do, of any number; `is` and `is not` compare any two values, and `@` multiplies matrices, of domains not
 * known statically.
 */

import { Repr } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";

export const Anything = D.Anything;
export const Bool = new D.OfTypes("bool", Boolean);
export const Int = new D.OfTypes("int", BigInt);
export const Float = new D.OfTypes("float", Number);
export const Str = new D.OfTypes("str", String);
export const Bytes = new D.OfTypes("bytes", Uint8Array);
/** A complex number, which JavaScript has none of: what Python3's `constant` holds of one (in Python, a `complex`). */
export class ComplexValue {
  constructor(readonly real: number, readonly imag: number) {}
}

/** Python's `...` (`Ellipsis`), which JavaScript has none of. */
export const ELLIPSIS: unique symbol = Symbol("Ellipsis");

export const NoneType = new D.OfTypes("NoneType", null);
export const Ellipsis = new D.OfTypes("ellipsis", ELLIPSIS);
export const Complex = new D.OfTypes("complex", ComplexValue);
export const Integral = new D.OfUnion(Bool, Int);
export const Numeric = new D.OfUnion(Bool, Int, Float);

const EQUAL = new D.Function([Anything, Anything], Bool);
const ORDER = new D.Overloaded(new D.Function([Numeric, Numeric], Bool), new D.Same(2, [Str, Bytes], Bool));
const INTEGRAL = new D.Function([Integral, Integral], Int);
const FLOAT = new D.Function([Numeric, Numeric], Float);

type Entry = [string, D.Signature];

/** The comparison operators, membership and identity among them. */
export const COMPARE: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["==", EQUAL], ["!=", EQUAL], ...["<", "<=", ">", ">="].map((operator) => [operator, ORDER] as Entry),
  ["in", EQUAL], ["not in", EQUAL], ["is", EQUAL], ["is not", EQUAL],
]);

/** A comprehension's signature: what it iterates and yields is not known statically. */
export const GENERATOR = new D.Opaque();

/** The boolean operators, which give one of their operands, of any number. */
export const BOOLOP: ReadonlyMap<string, D.Signature> = new Map([["and", new D.Either(-1)], ["or", new D.Either(-1)]]);

/** The arithmetic and bitwise operators. */
export const BINOP: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["+", new D.Overloaded(new D.Same(2, [Str, Bytes]), INTEGRAL, FLOAT)],
  ...["-", "*", "//", "%"].map((operator) => [operator, new D.Overloaded(INTEGRAL, FLOAT)] as Entry),
  ["/", FLOAT], ["**", new D.Overloaded(new D.Function([Integral, Integral], new D.OfUnion(Int, Float)), FLOAT)],
  ...["&", "|", "^"].map((operator) => [operator, new D.Overloaded(new D.Function([Bool, Bool], Bool), INTEGRAL)] as Entry),
  ["<<", INTEGRAL], [">>", INTEGRAL], ["@", new D.Function([Anything, Anything], Anything)],
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

/** The domain of a literal's value. */
export function of(value: unknown): D.Domain {
  return NATIVES.get(Repr.typeName(value)) as D.Domain;
}

/** The domain of Python3's own constant, by its attributes: `None`'s, `...`'s or a complex number's. */
export function constant(attributes: ReadonlyMap<string, unknown>): D.Domain {
  const singleton = attributes.get("singleton");
  return singleton === "None" ? NoneType : singleton === "..." ? Ellipsis : Complex;
}
