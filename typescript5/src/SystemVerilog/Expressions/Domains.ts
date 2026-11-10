/**
 * Domains of the SystemVerilog dialect: the types its evaluation, inference and validation compute on, each read from
 * the domains its dialect stores, and the sized vectors computed from a term's own width and signedness.
 *
 * An `SvType` is a type and a domain: `integral` (a vector of `width` bits, `signed` or not, of 4 states (0, 1, x, z) or
 * of 2 (0, 1)) or `real` of an IEEE 754 `format`. It is the working value the arithmetic computes on, not a type table:
 * a named type is a stored domain of SystemVerilog's dialect, `Expressions.SystemVerilog.Expressions`, which its
 * `define` writes (`logic`, `reg`, `integer`, `time`, `bit`, `byte`, `shortint`, `int`, `longint`, `real`, `shortreal`),
 * and `named(store, name)` reads one as an `SvType`, labelled with its `Defines` name: its width and signedness from its
 * kind's properties (`Framework.Domains.kindOf` and `properties`), its states from its kind (`logic` 4, `bit` 2), and a
 * real's format and width from IEEE 754's kind. A type no stored domain names is refused
 * by name. `vector(width, signed, states)` is a sized vector's type, which no domain names (`logic [7:0]`).
 *
 * A value of an integral type is a `Logic`: its type and two patterns of its width, `aval` and `bval`, which encode each
 * bit as VPI does (0 is 0/0, 1 is 1/0, z is 0/1, x is 1/1). `Logic.of(bits, signed)` reads `bits` (MSB first, of
 * `0`, `1`, `x` and `z`), `bits` gives them back, `known` tells a value without x or z, and `integer()` its integer, by
 * its signedness. `real` values are numbers.
 *
 * Expressions are sized as IEEE 1800 says (11.6, 11.8): `common` gives the type context-determined operands share, and
 * the signatures follow (see `Evaluators`). `of(value)` names a constant's type. The rules (`common`, the signatures,
 * which type a constant has) stay code, and the signatures are `Dialect.infer`'s, to be replaced with stored domains as
 * domain inference reads them ([CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)).
 */

import { Errors, Proxies, Repr } from "@mbse/schemas/Framework";
import type { Readers } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";

const { ValueError } = Errors;
const { repr } = Repr;
export const Anything = D.Anything;

/** A type: `integral` with its `width`, signedness and number of `states` (4 or 2), or `real` with its IEEE 754
 * `format`. Its `name` is the one it is written with, its `label` where a stored domain names it; its `domain` is that
 * stored domain, null for a sized vector; types compare by the rest. */
export class SvType implements D.Domain {
  constructor(readonly kind: string, readonly width: number = 64, readonly signed: boolean = false,
    readonly states: number = 4, readonly format: string | null = null, readonly label: string = "",
    readonly domain: Readers.OfObject | null = null) {}

  name(): string {
    if (this.label) return this.label;
    return `${this.states === 4 ? "logic" : "bit"}${this.signed ? " signed" : ""} [${this.width - 1}:0]`;
  }

  contains(value: unknown): boolean {
    if (this.kind === "real") return typeof value === "number";
    return value instanceof Logic && value.type.equals(this);
  }

  includes(other: D.Domain): boolean {
    if (other instanceof D.OfUnion) return other.members.every((member) => this.includes(member));
    return this.equals(other);
  }

  /** The same type, whatever its name. */
  equals(other: unknown): boolean {
    return other instanceof SvType && other.kind === this.kind && other.width === this.width && other.signed === this.signed
      && other.states === this.states && other.format === this.format;
  }

  toString(): string {
    return this.name();
  }
}

/** An integral type of a width: a packed `logic` or `bit` vector. */
export function vector(width: number, signed = false, states = 4): SvType {
  return new SvType("integral", width, signed, states);
}

/** The type SystemVerilog defines in `store` by `name`: the domain its dialect's singleton owns by that name, read as
 * an `SvType`; throws ValueError where it defines none (its `define` has not run, or no type has the name). */
export function named(store: any, name: string): SvType {
  const domain = D.domains(store.Instances.Expressions.SystemVerilog.Expressions).get(name);
  if (domain === undefined) throw new ValueError(`${repr(name)} is not a type SystemVerilog defines`);
  const [, kind] = D.kindOf(domain);
  const properties = D.properties(domain);
  if (kind === "ieee754") { // IEEE 754's: a real, of its format
    const format = properties.get("format") as string;
    return new SvType("real", Number(properties.get("width")), true, 2, format, name, domain);
  }
  return new SvType("integral", Number(properties.get("width")), properties.get("signed") as boolean,
    kind === "logic" ? 4 : 2, null, name, domain);
}

const STATES: Record<string, string> = { "00": "0", "10": "1", "01": "z", "11": "x" };

/** A value of an integral type: each bit by `aval` and `bval` (0 is 0/0, 1 is 1/0, z is 0/1, x is 1/1). */
export class Logic {
  constructor(readonly type: SvType, readonly aval: bigint, readonly bval: bigint = 0n) {}

  /** The value whose bits, MSB first, are `bits`, of `0`, `1`, `x` and `z`. */
  static of(bits: string, signed = false, states = 4): Logic {
    let aval = BigInt("0b" + [...bits].map((b) => ("1x".includes(b) ? "1" : "0")).join(""));
    let bval = BigInt("0b" + [...bits].map((b) => ("xz".includes(b) ? "1" : "0")).join(""));
    if (states === 2) [aval, bval] = [aval & ~bval, 0n]; // a 2-state vector has no x or z: they are 0
    return new Logic(vector(bits.length, signed, states), aval, bval);
  }

  /** The value of an integer in `type`, wrapped into its width. */
  static number(type: SvType, value: bigint): Logic {
    const modulus = 1n << BigInt(type.width);
    return new Logic(type, ((value % modulus) + modulus) % modulus);
  }

  /** The bits, MSB first. */
  get bits(): string {
    let bits = "";
    for (let i = BigInt(this.type.width) - 1n; i >= 0n; i--) bits += STATES[`${(this.aval >> i) & 1n}${(this.bval >> i) & 1n}`];
    return bits;
  }

  /** Whether no bit is x or z. */
  get known(): boolean {
    return this.bval === 0n;
  }

  /** The integer, by the type's signedness; throws ValueError when a bit is x or z. */
  integer(): bigint {
    if (!this.known) throw new ValueError(`${this} has unknown bits`);
    const top = 1n << BigInt(this.type.width - 1);
    return this.type.signed && (this.aval & top) !== 0n ? this.aval - (top << 1n) : this.aval;
  }

  toString(): string {
    return `${this.type.width}'${this.type.signed ? "s" : ""}b${this.bits}`;
  }
}

/** The type context-determined operands share: real if any is (`shortreal` if all are), otherwise the widest width,
 * signed if all are, and 4-state if any is. A real is an operand's type, or `real`, read from the store of a real
 * operand's domain. */
export function common(types: readonly SvType[]): SvType {
  const reals = types.filter((t) => t.kind === "real");
  if (reals.length > 0) { // real, unless every operand is a shortreal
    if (types.every((t) => t.format === "binary32")) return reals[0] as SvType;
    const wide = reals.filter((t) => t.format === "binary64");
    return wide.length > 0 ? wide[0] as SvType : named(Proxies.store_of((reals[0] as SvType).domain), "real");
  }
  return vector(Math.max(...types.map((t) => t.width)), types.every((t) => t.signed), Math.max(...types.map((t) => t.states)));
}

/** The name of a constant's type: `integer` for an int that fits 32 bits, `longint` for 64; `real` for a number; and
 * null otherwise (a string, or an int no type holds). */
export function of(value: unknown): string | null {
  if (typeof value === "bigint") {
    if (-(1n << 31n) <= value && value < 1n << 31n) return "integer";
    return -(1n << 63n) <= value && value < 1n << 63n ? "longint" : null;
  }
  return typeof value === "number" ? "real" : null;
}

/** A signature over SystemVerilog types: `resultType` gives the result type of the argument types, or null when they
 * do not apply; an argument of unknown domain makes the result unknown, or `known` when given. */
class Sized implements D.Signature {
  constructor(private readonly count: number, private readonly resultType: (types: SvType[]) => SvType | null,
    private readonly text: string, private readonly known: D.Domain | null = null) {}

  arity(): number {
    return this.count;
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    const unknown = args.filter((a) => !(a instanceof SvType));
    if (unknown.length > 0) return unknown.every((a) => a === Anything) ? this.known ?? Anything : null;
    return this.resultType(args as SvType[]);
  }

  describe(): string {
    return this.text;
  }
}

const [ONE, BIT] = [vector(1), vector(1, false, 2)]; // a 1-bit result; `===`'s is 2-state, which `Expressions` names `bit`
const integral = (types: SvType[]) => types.every((t) => t.kind === "integral");
type Entry = [string, D.Signature];

/** The binary operators. */
export const BINARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ...["+", "-", "*", "/"].map((op): Entry => [op, new Sized(2, common, "(T, T) -> their common type")]),
  ["%", new Sized(2, (ts) => (integral(ts) ? common(ts) : null), "(integral, integral) -> their common type")],
  ["**", new Sized(2, (ts) => (ts.some((t) => t.kind === "real") ? common(ts) : ts[0] as SvType), "(T, U) -> T, or real")],
  ...["&", "|", "^", "^~", "~^"].map((op): Entry =>
    [op, new Sized(2, (ts) => (integral(ts) ? common(ts) : null), "(integral, integral) -> their common type")]),
  ...["<<", ">>", "<<<", ">>>"].map((op): Entry =>
    [op, new Sized(2, (ts) => (integral(ts) ? ts[0] as SvType : null), "(integral, integral) -> the left type")]),
  ...["<", "<=", ">", ">=", "==", "!=", "&&", "||", "->", "<->"].map((op): Entry => [op, new Sized(2, () => ONE, "(T, T) -> logic", ONE)]),
  ...["===", "!=="].map((op): Entry => [op, new Sized(2, (ts) => (integral(ts) ? BIT : null), "(integral, integral) -> bit", BIT)]),
  ...["==?", "!=?"].map((op): Entry => [op, new Sized(2, (ts) => (integral(ts) ? ONE : null), "(integral, integral) -> logic", ONE)]),
]);

/** The unary operators, the reductions among them. */
export const UNARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ...["+", "-"].map((op): Entry => [op, new Sized(1, (ts) => ts[0] as SvType, "(T) -> T")]),
  ["~", new Sized(1, (ts) => (integral(ts) ? ts[0] as SvType : null), "(integral) -> its type")],
  ["!", new Sized(1, () => ONE, "(T) -> logic", ONE)],
  ...["&", "~&", "|", "~|", "^", "~^", "^~"].map((op): Entry => [op, new Sized(1, (ts) => (integral(ts) ? ONE : null), "(integral) -> logic", ONE)]),
]);

export const CONDITIONAL = new D.Function([Anything, Anything, Anything], Anything);
export const CONCATENATION = new D.Opaque();
export const REPLICATION = new D.Function([Anything, Anything], Anything);
export const SELECT = new D.Function([Anything, Anything], Anything);
export const RANGE = new D.Function([Anything, Anything, Anything], Anything);
export const INSIDE = new D.Opaque(ONE);
export const SPAN = new D.Function([Anything, Anything], Anything);
export const CAST = new D.Function([Anything], Anything);
export const MEMBER = new D.Function([Anything], Anything);
export const CALL = new D.Opaque();

/** An array method's `with` clause: the domain of an array's items is not known statically. */
class Iterated extends D.Opaque {
  items(_domain: D.Domain): D.Domain {
    return Anything;
  }
}

export const METHOD = new D.Function([Anything], Anything);
export const ITERATE = new Iterated();
