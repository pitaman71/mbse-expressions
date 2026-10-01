/**
 * Domains of the Ccpp dialect: C's and C++'s arithmetic types, under the LP64 data model, and the signatures of their
 * operators.
 *
 * A `CType` is a type and a domain: `bool`; the integers by width and signedness (`char`, `signed char`, `unsigned
 * char`, `short`, `int`, `long`, `long long` and their unsigned forms, and `<stdint.h>`'s `int8_t` ... `uint64_t` and
 * `size_t`, which name the same types); and the floating types, IEEE 754's `binary32` (`float`), `binary64`
 * (`double`) and `binary128` (`long double`). Under LP64 `char` is signed and 8 bits wide, `short` 16, `int` 32, and
 * `long` and `long long` 64. `TYPES` maps each name to its type; equal types compare equal whatever their names.
 *
 * `promoted(type)` applies the integer promotions (a narrower integer or a bool becomes `int`) and `common(a, b)` the
 * usual arithmetic conversions: the wider floating type if either is floating, otherwise the promoted types, the wider
 * if they agree in signedness, else the unsigned one when it is at least as wide, else the signed one. The signatures
 * follow the evaluator's rules (see `Evaluators`): arithmetic gives the common type, shifts the promoted left
 * operand's, comparisons and logic `bool`. `of(value)` gives a constant's type: `int`, `long` or `unsigned long` for an
 * int, as the first that holds it, `double` for a float, `bool`, and `String` for text.
 */

import * as D from "../../Framework/Domains.js";

export const Anything = D.Anything;

/** An arithmetic type: its `kind` ('bool', 'integer' or 'floating'), its `width` in bits, its signedness, and for a
 * floating type its IEEE 754 `format`. Its `name` is the one it is written with; types compare by the rest. */
export class CType implements D.Domain {
  constructor(readonly kind: string, readonly width: number, readonly signed: boolean = true,
    readonly format: string | null = null, readonly label: string = "") {}

  name(): string {
    return this.label;
  }

  /** Whether a native is a value of this type. */
  contains(value: unknown): boolean {
    if (this.kind === "bool") return typeof value === "boolean";
    if (this.kind === "floating") return typeof value === (this.format === "binary128" ? "string" : "number");
    if (typeof value !== "bigint") return false;
    const low = this.signed ? -(1n << BigInt(this.width - 1)) : 0n;
    return low <= value && value < low + (1n << BigInt(this.width));
  }

  includes(other: D.Domain): boolean {
    if (other instanceof D.OfUnion) return other.members.every((member) => this.includes(member));
    return this.equals(other);
  }

  /** The same type, whatever its name. */
  equals(other: unknown): boolean {
    return other instanceof CType && other.kind === this.kind && other.width === this.width && other.signed === this.signed
      && other.format === this.format;
  }

  toString(): string {
    return this.label;
  }
}

function integer(label: string, width: number, signed = true): CType {
  return new CType("integer", width, signed, null, label);
}

/** The types, by the names they are written with. */
export const TYPES: ReadonlyMap<string, CType> = new Map<string, CType>([
  ["bool", new CType("bool", 1, false, null, "bool")],
  ["char", integer("char", 8)], ["signed char", integer("signed char", 8)], ["unsigned char", integer("unsigned char", 8, false)],
  ["short", integer("short", 16)], ["unsigned short", integer("unsigned short", 16, false)],
  ["int", integer("int", 32)], ["unsigned int", integer("unsigned int", 32, false)],
  ["long", integer("long", 64)], ["unsigned long", integer("unsigned long", 64, false)],
  ["long long", integer("long long", 64)], ["unsigned long long", integer("unsigned long long", 64, false)],
  ...[8, 16, 32, 64].map((w) => [`int${w}_t`, integer(`int${w}_t`, w)] as [string, CType]),
  ...[8, 16, 32, 64].map((w) => [`uint${w}_t`, integer(`uint${w}_t`, w, false)] as [string, CType]),
  ["size_t", integer("size_t", 64, false)],
  ["float", new CType("floating", 32, true, "binary32", "float")], ["double", new CType("floating", 64, true, "binary64", "double")],
  ["long double", new CType("floating", 128, true, "binary128", "long double")],
]);

const type = (name: string) => TYPES.get(name) as CType;
export const [Bool, Int, Double] = [type("bool"), type("int"), type("double")];
const [Long, UnsignedLong] = [type("long"), type("unsigned long")];
const StringDomain = new D.OfTypes("string", String);
export { StringDomain as String };

/** The integer promotions: a bool or an integer narrower than `int` becomes `int`. */
export function promoted(ctype: CType): CType {
  return ctype.kind === "bool" || (ctype.kind === "integer" && ctype.width < 32) ? Int : ctype;
}

/** The usual arithmetic conversions of two arithmetic types. */
export function common(a: CType, b: CType): CType {
  if (a.kind === "floating" || b.kind === "floating") {
    const floats = [a, b].filter((t) => t.kind === "floating");
    return floats.reduce((wider, t) => (t.width > wider.width ? t : wider));
  }
  [a, b] = [promoted(a), promoted(b)];
  if (a.signed === b.signed) return a.width >= b.width ? a : b;
  const [unsigned, signed] = a.signed ? [b, a] : [a, b];
  return unsigned.width >= signed.width ? unsigned : signed;
}

/** The type, under the name C writes it with: the first in `TYPES` that equals it. */
function named(ctype: CType): CType {
  return [...TYPES.values()].find((t) => t.equals(ctype)) as CType;
}

/** A constant's type: the first of `int`, `long` and `unsigned long` that holds an int, `double`, `bool`, or `String`. */
export function of(value: unknown): D.Domain {
  if (typeof value === "bigint") return [Int, Long, UnsignedLong].find((t) => t.contains(value)) ?? Anything;
  if (typeof value === "boolean") return Bool;
  if (typeof value === "number") return Double;
  return typeof value === "string" ? StringDomain : Anything;
}

/** A signature over arithmetic types: `rule` gives the result type of the argument types, or null when they do not
 * apply; an argument of unknown domain makes the result unknown, or `known` when given. */
class Typed implements D.Signature {
  constructor(private readonly count: number, private readonly rule: (types: CType[]) => CType | null,
    private readonly text: string, private readonly known: D.Domain | null = null) {}

  arity(): number {
    return this.count;
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    const unknown = args.filter((a) => !(a instanceof CType));
    if (unknown.length > 0) { // an argument of unknown domain: the result is too, unless the signature knows it
      return unknown.every((a) => a === Anything) ? this.known ?? Anything : null;
    }
    const result = this.rule(args as CType[]);
    return result === null ? null : named(result);
  }

  describe(): string {
    return this.text;
  }
}

const arithmetic = (types: CType[]) => common(types[0] as CType, types[1] as CType);
const integral = (types: CType[]) => (types.every((t) => t.kind !== "floating") ? arithmetic(types) : null);
const shift = (types: CType[]) => (types.every((t) => t.kind !== "floating") ? promoted(types[0] as CType) : null);
const truth = () => Bool;

/** The binary operators. */
export const BINARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ...["+", "-", "*", "/"].map((op) => [op, new Typed(2, arithmetic, "(arithmetic, arithmetic) -> their common type")] as [string, D.Signature]),
  ...["%", "&", "^", "|"].map((op) => [op, new Typed(2, integral, "(integer, integer) -> their common type")] as [string, D.Signature]),
  ...["<<", ">>"].map((op) => [op, new Typed(2, shift, "(integer, integer) -> the promoted left type")] as [string, D.Signature]),
  ...["<", "<=", ">", ">=", "==", "!="].map((op) => [op, new Typed(2, truth, "(arithmetic, arithmetic) -> bool", Bool)] as [string, D.Signature]),
  ...["&&", "||"].map((op) => [op, new Typed(2, truth, "(scalar, scalar) -> bool", Bool)] as [string, D.Signature]),
]);

/** The unary operators. */
export const UNARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["+", new Typed(1, (types) => promoted(types[0] as CType), "(arithmetic) -> its promoted type")],
  ["-", new Typed(1, (types) => promoted(types[0] as CType), "(arithmetic) -> its promoted type")],
  ["~", new Typed(1, (types) => ((types[0] as CType).kind !== "floating" ? promoted(types[0] as CType) : null), "(integer) -> its promoted type")],
  ["!", new Typed(1, truth, "(scalar) -> bool", Bool)],
]);

/** A member of a struct or class. */
export const MEMBER = new D.Function([Anything], Anything);
/** An element of an array. */
export const SUBSCRIPT = new D.Function([Anything, Anything], Anything);
/** A function the scope provides. */
export const CALL = new D.Opaque();
/** `condition ? a : b`. */
export const CONDITIONAL = new D.Function([Anything, Anything, Anything], Anything);
/** `(type) operand`, whose domain is its type (the node's own). */
export const CAST = new D.Function([Anything], Anything);
