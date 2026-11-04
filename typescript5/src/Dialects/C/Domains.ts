/**
 * Domains of the C dialect: C's and C++'s arithmetic types, under the LP64 data model, and the signatures of their
 * operators, which `Cpp` shares.
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
 * operand's, comparisons and logic `bool`. `of(value)` gives a native value's type: `int`, `long` or `unsigned long` for
 * an int, as the first that holds it, `double` for a float, `bool`, and `String` for text.
 *
 * A literal's type is what its text encodes (`literal(attributes, language)`), as C's and C++'s standards give it: an
 * integer's by its suffix and its base, the first of the types they allow that holds its value (an `unsigned int` for
 * `5u`; a decimal integer without a suffix is its value's, `of`); a floating literal's by its suffix (`float` for `f`,
 * `long double` for `L`); a character literal's (an int, its code) `int` in C and `char` in C++; a string's `String`.
 * What an encoding prefix (`L`, `u8`, `u`, `U`) or any other suffix encodes is a domain named by its type (`wchar_t`,
 * `_Float16`), which no evaluator has values of; a suffix the language does not write gives `Anything`, its type
 * unknown. `outOfRange(attributes, language)` says what is wrong with an integer literal that its type does not hold,
 * one that fits none of the types its suffix and base allow (a value out of range, PRI-023). `arithmetic(names)` is the arithmetic type a type name's specifiers
 * name (`unsigned int`, `uint8_t`), or null.
 *
 * The other operators, which no evaluator computes (`*`, `&`, `++`, `--`, `,`, the assignments, C++'s `<=>`, `.*`,
 * `->*`, its folds and named casts), have signatures that say only how many operands each takes.
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
/** `nullptr`'s type, C23's and C++'s. */
export const NULLPTR = new D.OfTypes("nullptr_t", null);
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

/** A signature over arithmetic types: `resultType` gives the result type of the argument types, or null when they
 * do not apply; an argument of unknown domain makes the result unknown, or `known` when given. */
class Typed implements D.Signature {
  constructor(private readonly count: number, private readonly resultType: (types: CType[]) => CType | null,
    private readonly text: string, private readonly known: D.Domain | null = null) {}

  arity(): number {
    return this.count;
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    const unknown = args.filter((a) => !(a instanceof CType));
    if (unknown.length > 0) { // an argument of unknown domain: the result is too, unless the signature knows it
      return unknown.every((a) => a === Anything) ? this.known ?? Anything : null;
    }
    const result = this.resultType(args as CType[]);
    return result === null ? null : named(result);
  }

  describe(): string {
    return this.text;
  }
}

const commonOf = (types: CType[]) => common(types[0] as CType, types[1] as CType);
const integral = (types: CType[]) => (types.every((t) => t.kind !== "floating") ? commonOf(types) : null);
const shift = (types: CType[]) => (types.every((t) => t.kind !== "floating") ? promoted(types[0] as CType) : null);
const truth = () => Bool;

const ONE = new D.Function([Anything], Anything);
const TWO = new D.Function([Anything, Anything], Anything);
const pairs = (ops: readonly string[], signature: D.Signature) => ops.map((op) => [op, signature] as [string, D.Signature]);

/** The binary operators: C's, and its comma. */
export const BINARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ...["+", "-", "*", "/"].map((op) => [op, new Typed(2, commonOf, "(arithmetic, arithmetic) -> their common type")] as [string, D.Signature]),
  ...["%", "&", "^", "|"].map((op) => [op, new Typed(2, integral, "(integer, integer) -> their common type")] as [string, D.Signature]),
  ...["<<", ">>"].map((op) => [op, new Typed(2, shift, "(integer, integer) -> the promoted left type")] as [string, D.Signature]),
  ...["<", "<=", ">", ">=", "==", "!="].map((op) => [op, new Typed(2, truth, "(arithmetic, arithmetic) -> bool", Bool)] as [string, D.Signature]),
  ...["&&", "||"].map((op) => [op, new Typed(2, truth, "(scalar, scalar) -> bool", Bool)] as [string, D.Signature]),
  [",", TWO],
]);

/** C++'s binary operators: C's, and the three-way comparison and the pointers to members. */
export const BINARY_CPP: ReadonlyMap<string, D.Signature> = new Map([...BINARY, ...pairs(["<=>", ".*", "->*"], TWO)]);

/** The unary operators. */
export const UNARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["+", new Typed(1, (types) => promoted(types[0] as CType), "(arithmetic) -> its promoted type")],
  ["-", new Typed(1, (types) => promoted(types[0] as CType), "(arithmetic) -> its promoted type")],
  ["~", new Typed(1, (types) => ((types[0] as CType).kind !== "floating" ? promoted(types[0] as CType) : null), "(integer) -> its promoted type")],
  ["!", new Typed(1, truth, "(scalar) -> bool", Bool)],
  ...pairs(["*", "&", "++", "--"], ONE),
]);

/** The postfix operators. */
export const POSTFIX: ReadonlyMap<string, D.Signature> = new Map(pairs(["++", "--"], ONE));

/** The assignment operators. */
export const ASSIGNMENT: ReadonlyMap<string, D.Signature> = new Map(pairs(
  ["=", "*=", "/=", "%=", "+=", "-=", ">>=", "<<=", "&=", "^=", "|="], TWO));

/** C++'s fold operators: a fold has one operand or two. */
export const FOLD: ReadonlyMap<string, D.Signature> = new Map(pairs([
  "+", "-", "*", "/", "%", "^", "&", "|", "<<", ">>", "+=", "-=", "*=", "/=", "%=", "^=", "&=", "|=", "<<=", ">>=",
  "=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", ",", ".*", "->*"], new D.Opaque()));

/** C++'s named casts (the terms their type names hold among their arguments). */
export const CASTS: ReadonlyMap<string, D.Signature> = new Map(pairs(
  ["static_cast", "dynamic_cast", "const_cast", "reinterpret_cast"], new D.Opaque()));

/** A member of a struct or class (in C++, a name, whose template arguments are its terms too). */
export const MEMBER = new D.Opaque();
/** An element of an array, of one index or several (C++23). */
export const SUBSCRIPT = new D.Opaque();
/** A function the scope provides. */
export const CALL = new D.Opaque();
/** `condition ? a : b`, or GNU's `condition ?: b`. */
export const CONDITIONAL = new D.Opaque();
/** `(type) operand`, whose domain is its type, where it is arithmetic (the terms a type name holds, an array's size,
 * among its arguments). */
export const CAST = new D.Opaque();
/** `sizeof` and `alignof`, of an expression or a type: a `size_t`. */
export const SIZE = new D.Opaque(type("size_t"));

const ENCODINGS: ReadonlyMap<string, string> = new Map([["L", "wchar_t"], ["u8", "char8_t"], ["u", "char16_t"], ["U", "char32_t"]]);
const FLOATING: ReadonlyMap<string, string> = new Map([["f", "float"], ["F", "float"], ["l", "long double"], ["L", "long double"]]);
const EXTENDED: ReadonlyMap<string, string> = new Map([["f16", "_Float16"], ["f32", "_Float32"], ["f64", "_Float64"],
  ["f128", "_Float128"], ["f32x", "_Float32x"], ["f64x", "_Float64x"], ["f128x", "_Float128x"], ["bf16", "std::bfloat16_t"],
  ["df", "_Decimal32"], ["dd", "_Decimal64"], ["dl", "_Decimal128"]]);
const DECIMAL: ReadonlyMap<string, readonly string[]> = new Map([["", ["int", "long", "long long"]],
  ["u", ["unsigned int", "unsigned long", "unsigned long long"]], ["l", ["long", "long long"]],
  ["ul", ["unsigned long", "unsigned long long"]], ["ll", ["long long"]], ["ull", ["unsigned long long"]], ["z", ["long"]],
  ["uz", ["size_t"]]]);
const OTHER: ReadonlyMap<string, readonly string[]> = new Map([
  ["", ["int", "unsigned int", "long", "unsigned long", "long long", "unsigned long long"]],
  ["l", ["long", "unsigned long", "long long", "unsigned long long"]], ["ll", ["long long", "unsigned long long"]]]);

/** An integer suffix in one spelling: lowercase, `u` first (`LLU` is `ull`). */
function integerSuffix(suffix: string): string {
  const lower = suffix.toLowerCase();
  return lower.includes("u") ? "u" + lower.replaceAll("u", "") : lower;
}

/** A literal's type, by what its text encodes (its `prefix`, `quote`, `base` and `suffix`) and its value, in
 * `language` (`C` or `C++`); null where it is its value's own (`of`): a decimal integer or a floating literal without
 * a suffix, a bool. A domain of a type no evaluator has values of is named by it (`wchar_t`, `_BitInt`). */
export function literal(attributes: ReadonlyMap<string, any>, language = "C"): D.Domain | null {
  const value = attributes.get("value");
  const prefix = attributes.get("prefix") as string | undefined;
  const suffix = attributes.get("suffix") as string | undefined;
  if (typeof value === "string") {
    return prefix === undefined ? StringDomain : new D.OfTypes(`${ENCODINGS.get(prefix) ?? prefix} string`, String);
  }
  if (typeof value === "number") {
    if (suffix === undefined) return null;
    const named = FLOATING.get(suffix) ?? EXTENDED.get(suffix.toLowerCase()) ?? suffix;
    return TYPES.get(named) ?? new D.OfTypes(named, Number);
  }
  if (typeof value !== "bigint") return null;
  if (attributes.get("quote") === "'") { // a character literal: its code
    if (prefix === undefined) return language === "C" ? Int : type("char");
    if (prefix === "u8" && language === "C") return type("unsigned char");
    return new D.OfTypes(ENCODINGS.get(prefix) ?? prefix, BigInt);
  }
  const normal = integerSuffix(suffix ?? "");
  if (normal === "wb" || normal === "uwb") return new D.OfTypes(normal === "uwb" ? "unsigned _BitInt" : "_BitInt", BigInt);
  const base = attributes.get("base");
  const decimal = base === undefined || base === 10n;
  if (normal === "" && decimal) return null;
  const names = (decimal ? DECIMAL : new Map([...DECIMAL, ...OTHER])).get(normal);
  if (names === undefined) return Anything; // a suffix the language does not write: its type is unknown
  return names.map(type).find((t) => t.contains(value)) ?? type(names[names.length - 1] as string);
}

/** What is wrong with an integer literal's value, if it is not a value of its type (`literal`, else its value's own,
 * `of`): one that fits none of the types its suffix and base allow (`2**70`, `2**70` with `u`, `-5` with `u`); null for
 * any other literal. */
export function outOfRange(attributes: ReadonlyMap<string, any>, language = "C"): string | null {
  const value = attributes.get("value");
  if (typeof value !== "bigint") return null;
  const domain = literal(attributes, language) ?? of(value);
  if (domain instanceof CType) return domain.contains(value) ? null : `integer literal ${value} does not fit '${domain.name()}'`;
  return domain === Anything && !attributes.has("suffix") ? `integer literal ${value} does not fit any type` : null;
}

const KEYWORDS: ReadonlySet<string> = new Set(["signed", "unsigned", "short", "long", "int", "char", "float", "double", "bool", "_Bool"]);
const QUALIFIERS: ReadonlySet<string> = new Set(["const", "volatile", "restrict", "__restrict", "__restrict__"]);

/** The arithmetic type a type name's specifiers name, by their keywords and type names in any order (`unsigned long
 * int`, `uint8_t`), cv-qualifiers aside; null for any other type. */
export function arithmetic(names: readonly (string | null)[]): CType | null {
  const words = names.filter((name) => !QUALIFIERS.has(name as string));
  if (words.length === 1 && TYPES.has(words[0] as string)) return type(words[0] as string);
  if (words.length === 0 || words.some((word) => !KEYWORDS.has(word as string))) return null;
  const count = (word: string) => words.filter((w) => w === word).length;
  const [signed, unsigned, longs] = [count("signed") > 0, count("unsigned") > 0, count("long")];
  const rest = (words as string[]).filter((word) => !["signed", "unsigned", "long"].includes(word)).sort();
  const same = (list: readonly string[]) => rest.length === list.length && rest.every((word, i) => word === list[i]);
  if ((signed && unsigned) || new Set(rest).size !== rest.length || count("signed") + count("unsigned") > 1) return null;
  const sign = signed || unsigned;
  // a lone keyword that names a type (`float`, `char`) is among `TYPES`, above
  if (same(["_Bool"]) && longs === 0 && !sign) return type("bool");
  if (same(["double"]) && longs === 1 && !sign) return type("long double");
  if (same(["char"]) && longs === 0 && sign) return type(unsigned ? "unsigned char" : "signed char");
  const short = rest.includes("short");
  if ((same([]) || same(["int"]) || same(["short"]) || same(["int", "short"])) && longs <= 2 && !(short && longs > 0)) {
    return type((unsigned ? "unsigned " : "") + (short ? "short" : ["int", "long", "long long"][longs] as string));
  }
  return null;
}
