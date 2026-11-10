/**
 * Domains of the C dialect: the types C's and C++'s evaluation, inference and validation compute on, each read from the
 * domains their dialects and their holder's ABI store, and the signatures of their operators, which `Cpp` shares.
 *
 * A `CType` is a type and a domain: `bool`, an integer by its width and signedness, or a floating type of an IEEE 754
 * format, named (`binary64`) or, where IEEE 754 names none, by its parameters (x87's `[2n, 64, 16383]`). It is the
 * working value the arithmetic computes on, not a type table: a named type is a stored domain, which `Types` reads. A C
 * term's types are among C's own domains (`Expressions.C.Expressions`, which its `define` writes: `bool`, the
 * exact-width integers, the `_FloatN` and decimal types), then among those of the ABI its holder names
 * (`Expressions.Framework.HasAbi`, the holder's adjacency `abi`: `Expressions.SystemV.AMD64` or
 * `Expressions.Arm.AAPCS64`, which hold `int`, `long`, `char`, `long double`, `size_t`, ...); a C++ term's among C++'s
 * (`Expressions.Cpp.Expressions`) then its holder's ABI's ([Domains as
 * data](../../../../docs/proposals/domains/README.md#stage-3s-design), Decided, P and Q). `new Types(term, path)`
 * finds the holder from any term or record within it (`Terms.holderOf`: a lone term is refused, mbse-schemas'
 * TypeError, "the value does not belong to a store") when it first reads a type, and reads each once: `named(name)` is
 * the type, a `CType` labelled with its `Defines` name and keeping the domain it was read from and the `Types` it was
 * read through, so that a rule reaches the store for a type no operand carries (the promotions' `int`); its width and
 * signedness come from its kind (11404's `integer`; `modulo`, unsigned, of the width its modulus gives; `boolean`), a
 * floating type's format and width from IEEE 754's. A type neither dialect defines is refused by name: "'int' is not a
 * type C defines, and its expression names no ABI", or "'int' is not a type C or AMD64 defines"; `find(name)` gives
 * null instead where the holder names an ABI (a cast to a type a program declares).
 *
 * `promoted(type)` applies the integer promotions (a narrower integer or a bool becomes `int`) and `common(a, b)` the
 * usual arithmetic conversions: the wider floating type if either is floating, otherwise the promoted types, the wider
 * if they agree in signedness, else the unsigned one when it is at least as wide, else the signed one; a decimal
 * floating type and a binary one have none (C's constraint), so `common` gives null. The signatures follow the
 * evaluator's rules (see `Evaluators`): arithmetic gives the common type, shifts the promoted left operand's,
 * comparisons and logic `bool`, which the dialect's kinds read from the store (`Expressions`), and a result is named by
 * the first of `NAMES`, C's names in the order its standard lists them, that its types define equal to it. `of(value,
 * types)` names a native value's type: `int`, `long` or `unsigned long` for a bigint, as the first that holds it,
 * `double` for a number, `bool`; null otherwise. The rules stay code, and the signatures are `Dialect.infer`'s, to be
 * replaced with stored domains as domain inference reads them ([CAP-232: domains inferred for
 * terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)).
 *
 * A literal's type is what its text encodes (`literal(attributes, language, types)`), as C's and C++'s standards give
 * it, a stored domain found by name ([Domains as
 * data](../../../../docs/proposals/domains/README.md#decided-on-this-proposal), Decided, 5): an integer's by its
 * suffix and its base, the first of the types they allow that holds its value (an `unsigned int` for `5u`; a decimal
 * integer without a suffix is its value's, `of`); a floating literal's by its suffix (`float` for `f`, `long double`
 * for `L`, `_Float16` for `f16` in C and `std::float16_t` in C++), else `double`; a character literal's (an int, its
 * code) `int` in C and `char` in C++, its encoding prefix's type otherwise (`wchar_t`, `char8_t`); a bool's `bool`; a
 * string's `String`. What `_BitInt` or a prefix no language has encodes is a domain named by its type, which no
 * evaluator has values of; a suffix the language does not write gives `Anything`, its type unknown.
 * `outOfRange(attributes, language, types)` says what is wrong with an integer literal that its type does not hold, one
 * that fits none of the types its suffix and base allow, by the stored domain's range (a value out of range, PRI-023).
 * `arithmetic(names)` is the name of the arithmetic type a type name's specifiers name (`unsigned int`, `uint8_t`), or
 * null.
 *
 * The other operators, which no evaluator computes (`*`, `&`, `++`, `--`, `,`, the assignments, C++'s `<=>`, `.*`,
 * `->*`, its folds and named casts), have signatures that say only how many operands each takes.
 */

import { Errors, Proxies, Repr } from "@mbse/schemas/Framework";
import type { Readers } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";
import * as Objects from "../../Framework/Objects.js";
import * as Terms from "../../Framework/Terms.js";
import * as Ieee754 from "../../Patterns/Expressions/Ieee754.js";

const { ValueError } = Errors;
const { repr } = Repr;
export const Anything = D.Anything;

// the formats whose values are numbers; any other's are text
const NATIVE: readonly string[] = ["binary16", "binary32", "binary64"];

/** Whether two formats are the same: by name, or by their parameters (each written as its text). */
function sameFormat(a: Ieee754.Format | null, b: Ieee754.Format | null): boolean {
  return String(a) === String(b);
}

/** An arithmetic type: its `kind` ('bool', 'integer' or 'floating'), its `width` in bits, its signedness, and for a
 * floating type its IEEE 754 `format`, a name or its parameters. Its `name` is its `label`, the name its stored domain
 * is defined by; its `domain` is that stored domain, and `types` the `Types` it was read through; types compare by the
 * rest. */
export class CType implements D.Domain {
  constructor(readonly kind: string, readonly width: number, readonly signed: boolean = true,
    readonly format: Ieee754.Format | null = null, readonly label: string = "",
    readonly domain: Readers.OfObject | null = null, readonly types: Types | null = null) {}

  name(): string {
    return this.label;
  }

  /** Whether it is a decimal floating type. */
  get decimal(): boolean {
    return this.kind === "floating" && Ieee754.parameters(this.format as Ieee754.Format)[0] === 10n;
  }

  /** Whether a native is a value of this type. */
  contains(value: unknown): boolean {
    if (this.kind === "bool") return typeof value === "boolean";
    if (this.kind === "floating") {
      return typeof value === (NATIVE.includes(this.format as string) ? "number" : "string");
    }
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
    return other instanceof CType && other.kind === this.kind && other.width === this.width
      && other.signed === this.signed
      && sameFormat(other.format, this.format);
  }

  toString(): string {
    return this.label;
  }
}

/** C's names of its standard types, in the order its standard lists them: a result is named by the first of them its
 * types define equal to it, else by its own. */
export const NAMES: readonly string[] = ["bool", "char", "signed char", "unsigned char", "short", "unsigned short",
  "int", "unsigned int", "long", "unsigned long", "long long", "unsigned long long", "float", "double", "long double"];

type Stored = [Map<string, Readers.OfObject>, Map<string, Readers.OfObject>, string | null];

/** The types a term of C or C++ reads, by name: among the domains its dialect (`path`, `C.Expressions` or
 * `Cpp.Expressions`) stores, then among those of the ABI its holder names, in the store of the holder of `value` (a
 * term, or anything within one), read when first needed, each once. */
export class Types {
  private readonly dialect: string;
  private readonly read = new Map<string, CType | null>();
  private domains: Stored | null = null;

  constructor(private readonly value: unknown, private readonly path: string = "C.Expressions") {
    this.dialect = Terms.dialectName(path);
  }

  /** Its dialect's domains, its holder's ABI's, and the ABI's name (null where the holder names none). */
  private stored(): Stored {
    if (this.domains === null) {
      const holder = Terms.holderOf(this.value) as any;
      let dialect: any = (Proxies.store_of(holder) as any).Instances.Expressions;
      for (const part of this.path.split(".")) dialect = dialect[part];
      const abis = Objects.entries(holder, "abi").map((entry) => entry.targets.get("abi") as Readers.OfObject);
      const abi = abis[0] ?? null;
      const name = abi === null ? null
        : Terms.dialectName((abi.as_schema() as { name: string }).name
          .slice("Expressions.".length, -".Dialect".length));
      this.domains = [D.domains(dialect), abi === null ? new Map() : D.domains(abi), name];
    }
    return this.domains;
  }

  /** A stored domain as a type, labelled with its name; null for a domain that is not arithmetic (`nullptr_t`). */
  private ctype(name: string, domain: Readers.OfObject): CType | null {
    const [, kind] = D.kindOf(domain);
    const properties = D.properties(domain);
    if (kind === "boolean") return new CType("bool", 1, false, null, name, domain, this);
    if (kind === "integer") {
      const width = Number(properties.get("width"));
      return new CType("integer", width, properties.get("signed") as boolean, null, name, domain, this);
    }
    if (kind === "modulo") { // unsigned: its width, of its modulus
      const width = (properties.get("modulus") as bigint).toString(2).length - 1;
      return new CType("integer", width, false, null, name, domain, this);
    }
    if (kind === "ieee754") { // a format by its name, or by its parameters where IEEE 754 names none
      const format = (properties.get("format") as string | undefined)
        ?? [properties.get("radix") as bigint, Number(properties.get("precision")),
          Number(properties.get("emax"))] as const;
      return new CType("floating", Number(properties.get("width")), true, format, name, domain, this);
    }
    return null;
  }

  /** The arithmetic type either dialect defines by `name`, or null. */
  private lookup(name: string): CType | null {
    if (!this.read.has(name)) {
      const [own, abi] = this.stored();
      const domain = own.get(name) ?? abi.get(name);
      this.read.set(name, domain === undefined ? null : this.ctype(name, domain));
    }
    return this.read.get(name) as CType | null;
  }

  /** The arithmetic type defined by `name`, or null where neither dialect defines one; throws ValueError where its
   * dialect does not and its holder names no ABI. */
  find(name: string): CType | null {
    const [own, , abi] = this.stored();
    if (!own.has(name) && abi === null) {
      throw new ValueError(`${repr(name)} is not a type ${this.dialect} defines, and its expression names no ABI`);
    }
    return this.lookup(name);
  }

  /** The type defined by `name`; throws ValueError where neither dialect defines it. */
  named(name: string): CType {
    const found = this.find(name);
    if (found === null) {
      throw new ValueError(`${repr(name)} is not a type ${this.dialect} or ${this.stored()[2]} defines`);
    }
    return found;
  }

  /** A result's type, under the name C writes it with: the first of `NAMES` its dialects define equal to it, else its
   * own. */
  label(ctype: CType): CType {
    return NAMES.map((name) => this.lookup(name)).find((t) => t !== null && t.equals(ctype)) ?? ctype;
  }
}

const StringDomain = new D.OfTypes("string", String);
export { StringDomain as String };
/** `nullptr`'s type, C23's and C++'s, which no arithmetic reads. */
export const NULLPTR = new D.OfTypes("nullptr_t", null);

const typesOf = (ctype: CType) => ctype.types as Types;

/** The integer promotions: a bool or an integer narrower than `int` becomes `int`, read through the type's `Types`. */
export function promoted(ctype: CType): CType {
  if (ctype.kind === "floating") return ctype;
  const int = typesOf(ctype).named("int");
  return ctype.kind === "bool" || ctype.width < int.width ? int : ctype;
}

/** The usual arithmetic conversions of two arithmetic types; null for a decimal floating type and a binary one, which C
 * does not convert to one another. */
export function common(a: CType, b: CType): CType | null {
  if (a.kind === "floating" || b.kind === "floating") {
    const floats = [a, b].filter((t) => t.kind === "floating");
    if (floats.length === 2 && a.decimal !== b.decimal) return null;
    return floats.reduce((wider, t) => (t.width > wider.width ? t : wider));
  }
  [a, b] = [promoted(a), promoted(b)];
  if (a.signed === b.signed) return a.width >= b.width ? a : b;
  const [unsigned, signed] = a.signed ? [b, a] : [a, b];
  return unsigned.width >= signed.width ? unsigned : signed;
}

/** The name of a constant's type: the first of `int`, `long` and `unsigned long` that holds a bigint, `double` for a
 * number, `bool`; null for anything else, or a bigint none holds. */
export function of(value: unknown, types: Types): string | null {
  if (typeof value === "bigint") return ["int", "long", "unsigned long"].find((name) => types.named(name)
      .contains(value)) ?? null;
  if (typeof value === "boolean") return "bool";
  return typeof value === "number" ? "double" : null;
}

/** A signature over arithmetic types: `resultType` gives the result type of the argument types, or null when they
 * do not apply; an argument of unknown domain makes the result unknown. */
class Typed implements D.Signature {
  constructor(private readonly count: number, private readonly resultType: (types: CType[]) => CType | null,
    private readonly text: string) {}

  arity(): number {
    return this.count;
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    const unknown = args.filter((a) => !(a instanceof CType));
    if (unknown.length > 0) return unknown.every((a) => a === Anything) ? Anything : null; // the result is unknown too
    const result = this.resultType(args as CType[]);
    return result === null ? null : typesOf(result).label(result);
  }

  describe(): string {
    return this.text;
  }
}

const commonOf = (types: CType[]) => common(types[0] as CType, types[1] as CType);
const integral = (types: CType[]) => (types.every((t) => t.kind !== "floating") ? commonOf(types) : null);
const shift = (types: CType[]) => (types.every((t) => t.kind !== "floating") ? promoted(types[0] as CType) : null);
const truth = (types: CType[]) => typesOf(types[0] as CType).named("bool");

const ONE = new D.Function([Anything], Anything);
const TWO = new D.Function([Anything, Anything], Anything);
const pairs = (ops: readonly string[], signature: D.Signature) =>
  ops.map((op) => [op, signature] as [string, D.Signature]);

/** The binary operators: C's, and its comma. */
export const BINARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ...["+", "-", "*", "/"].map((op) => [op, new Typed(2, commonOf,
    "(arithmetic, arithmetic) -> their common type")] as [string, D.Signature]),
  ...["%", "&", "^", "|"].map((op) => [op, new Typed(2, integral,
    "(integer, integer) -> their common type")] as [string, D.Signature]),
  ...["<<", ">>"].map((op) => [op, new Typed(2, shift,
    "(integer, integer) -> the promoted left type")] as [string, D.Signature]),
  ...["<", "<=", ">", ">=", "==", "!="].map((op) => [op, new Typed(2, truth,
    "(arithmetic, arithmetic) -> bool")] as [string, D.Signature]),
  ...["&&", "||"].map((op) => [op, new Typed(2, truth, "(scalar, scalar) -> bool")] as [string, D.Signature]),
  [",", TWO],
]);

/** C++'s binary operators: C's, and the three-way comparison and the pointers to members. */
export const BINARY_CPP: ReadonlyMap<string, D.Signature> = new Map([...BINARY, ...pairs(["<=>", ".*", "->*"], TWO)]);

/** The unary operators. */
export const UNARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["+", new Typed(1, (types) => promoted(types[0] as CType), "(arithmetic) -> its promoted type")],
  ["-", new Typed(1, (types) => promoted(types[0] as CType), "(arithmetic) -> its promoted type")],
  ["~", new Typed(1, (types) => ((types[0] as CType).kind !== "floating" ? promoted(types[0] as CType) : null),
    "(integer) -> its promoted type")],
  ["!", new Typed(1, truth, "(scalar) -> bool")],
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
 * among its arguments), which the dialect's kind reads from the store. */
export const CAST = new D.Opaque();
/** `sizeof` and `alignof`, of an expression or a type: a `size_t`, which the dialect's kinds read from the store. */
export const SIZE = new D.Opaque();

const ENCODINGS: ReadonlyMap<string, string> = new Map([
  ["L", "wchar_t"], ["u8", "char8_t"], ["u", "char16_t"], ["U", "char32_t"]]);
const FLOATING: ReadonlyMap<string, string> = new Map([
  ["f", "float"], ["F", "float"], ["l", "long double"], ["L", "long double"]]);
/** The extended floating suffixes each language writes, and the types they name. */
const EXTENDED: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
  ["C", new Map([["f16", "_Float16"], ["f32", "_Float32"], ["f64", "_Float64"], ["f128", "_Float128"],
    ["f32x", "_Float32x"], ["f64x", "_Float64x"], ["f128x", "_Float128x"], ["df", "_Decimal32"], ["dd", "_Decimal64"],
    ["dl", "_Decimal128"]])],
  ["C++", new Map([["f16", "std::float16_t"], ["f32", "std::float32_t"], ["f64", "std::float64_t"],
    ["f128", "std::float128_t"], ["bf16", "std::bfloat16_t"]])],
]);
const DECIMAL: ReadonlyMap<string, readonly string[]> = new Map([["", ["int", "long", "long long"]],
  ["u", ["unsigned int", "unsigned long", "unsigned long long"]], ["l", ["long", "long long"]],
  ["ul", ["unsigned long", "unsigned long long"]], ["ll", ["long long"]], ["ull", ["unsigned long long"]],
  ["z", ["long"]], ["uz", ["size_t"]]]);
const OTHER: ReadonlyMap<string, readonly string[]> = new Map([
  ["", ["int", "unsigned int", "long", "unsigned long", "long long", "unsigned long long"]],
  ["l", ["long", "unsigned long", "long long", "unsigned long long"]], ["ll", ["long long", "unsigned long long"]]]);

/** An integer suffix in one spelling: lowercase, `u` first (`LLU` is `ull`). */
function integerSuffix(suffix: string): string {
  const lower = suffix.toLowerCase();
  return lower.includes("u") ? "u" + lower.replaceAll("u", "") : lower;
}

/** A literal's type, by what its text encodes (its `prefix`, `quote`, `base` and `suffix`) and its value, in
 * `language` (`C` or `C++`), found through `types`; null where its value has none (a bigint no type holds, or no
 * value). A domain of a type no evaluator has values of is named by it (`_BitInt`). */
export function literal(attributes: ReadonlyMap<string, any>, language: string, types: Types): D.Domain | null {
  const value = attributes.get("value");
  const prefix = attributes.get("prefix") as string | undefined;
  const suffix = attributes.get("suffix") as string | undefined;
  if (typeof value === "string") {
    return prefix === undefined ? StringDomain : new D.OfTypes(`${ENCODINGS.get(prefix) ?? prefix} string`, String);
  }
  if (typeof value === "boolean") return types.named("bool");
  if (typeof value === "number") {
    if (suffix === undefined) return types.named("double");
    const named = FLOATING.get(suffix) ?? (EXTENDED.get(language) as ReadonlyMap<string, string>)
        .get(suffix.toLowerCase());
    return named === undefined ? Anything : types.named(named); // a suffix the language does not write: unknown
  }
  if (typeof value !== "bigint") return null;
  if (attributes.get("quote") === "'") { // a character literal: its code
    if (prefix === undefined) return types.named(language === "C" ? "int" : "char");
    if (prefix === "u8" && language === "C") return types.named("unsigned char");
    const encoded = ENCODINGS.get(prefix);
    return encoded === undefined ? new D.OfTypes(prefix, BigInt) : types.named(encoded);
  }
  const normal = integerSuffix(suffix ?? "");
  if (normal === "wb" || normal === "uwb") {
    return new D.OfTypes(normal === "uwb" ? "unsigned _BitInt" : "_BitInt", BigInt);
  }
  const base = attributes.get("base");
  const decimal = base === undefined || base === 10n;
  if (normal === "" && decimal) {
    const name = of(value, types);
    return name === null ? null : types.named(name);
  }
  const names = (decimal ? DECIMAL : new Map([...DECIMAL, ...OTHER])).get(normal);
  if (names === undefined) return Anything; // a suffix the language does not write: its type is unknown
  const allowed = names.map((name) => types.named(name));
  return allowed.find((t) => t.contains(value)) ?? allowed[allowed.length - 1] as CType;
}

/** What is wrong with an integer literal's value, if it is not a value of its type (`literal`), by its stored domain's
 * range: one that fits none of the types its suffix and base allow (`2**70`, `2**70` with `u`, `-5` with `u`); null
 * for any other literal. */
export function outOfRange(attributes: ReadonlyMap<string, any>, language: string, types: Types): string | null {
  const value = attributes.get("value");
  if (typeof value !== "bigint") return null;
  const domain = literal(attributes, language, types);
  if (domain === null) return `integer literal ${value} does not fit any type`;
  if (domain instanceof CType) return domain.contains(value) ? null
    : `integer literal ${value} does not fit '${domain.name()}'`;
  return null;
}

const KEYWORDS: ReadonlySet<string> = new Set([
  "signed", "unsigned", "short", "long", "int", "char", "float", "double", "bool", "_Bool"]);
const QUALIFIERS: ReadonlySet<string> = new Set(["const", "volatile", "restrict", "__restrict", "__restrict__"]);

/** The name of the arithmetic type a type name's specifiers name, by their keywords and type names in any order
 * (`unsigned long int` is `unsigned long`; `uint8_t`, a type's name, is itself), cv-qualifiers aside; null for any
 * other type (`void`, several names). */
export function arithmetic(names: readonly (string | null)[]): string | null {
  const words = names.filter((name) => !QUALIFIERS.has(name as string));
  const [first] = words;
  if (words.length === 1 && typeof first === "string" && !KEYWORDS.has(first) && first !== "void") {
    return first; // a type's name, which the store may define
  }
  if (words.length === 0 || words.some((word) => !KEYWORDS.has(word as string))) return null;
  const count = (word: string) => words.filter((w) => w === word).length;
  const [signed, unsigned, longs] = [count("signed") > 0, count("unsigned") > 0, count("long")];
  const rest = (words as string[]).filter((word) => !["signed", "unsigned", "long"].includes(word)).sort();
  const same = (list: readonly string[]) => rest.length === list.length && rest.every((word, i) => word === list[i]);
  if ((signed && unsigned) || new Set(rest)
      .size !== rest.length || count("signed") + count("unsigned") > 1) return null;
  const sign = signed || unsigned;
  if ((same(["char"]) || same(["float"]) || same(["double"]) || same(["bool"])) && longs === 0
    && !sign) return rest[0] as string;
  if (same(["_Bool"]) && longs === 0 && !sign) return "bool";
  if (same(["double"]) && longs === 1 && !sign) return "long double";
  if (same(["char"]) && longs === 0 && sign) return unsigned ? "unsigned char" : "signed char";
  const short = rest.includes("short");
  if ((same([]) || same(["int"]) || same(["short"]) || same(["int", "short"])) && longs <= 2 && !(short && longs > 0)) {
    return (unsigned ? "unsigned " : "") + (short ? "short" : ["int", "long", "long long"][longs] as string);
  }
  return null;
}
