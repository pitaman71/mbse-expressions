/**
 * Domains of the SystemVerilog dialect: its integral types, 4-state or 2-state vectors of a width and a signedness, and
 * `real` and `shortreal`.
 *
 * An `SvType` is a type and a domain: `integral` (a vector of `width` bits, `signed` or not, of 4 states (0, 1, x, z) or
 * of 2 (0, 1)) or `real` of IEEE 754's `binary64` or `binary32` (`shortreal`). `TYPES` names the built-in ones: `bit`,
 * `logic`, `reg` (a single bit), `byte` (8), `shortint` (16), `int` (32), `longint` (64), `integer` (32, 4-state),
 * `time` (64, 4-state, unsigned), `real` and `shortreal`.
 *
 * A value of an integral type is a `Logic`: its type and two patterns of its width, `aval` and `bval`, which encode each
 * bit as VPI does (0 is 0/0, 1 is 1/0, z is 0/1, x is 1/1). `Logic.of(bits, signed)` reads `bits` (MSB first, of
 * `0`, `1`, `x` and `z`), `bits` gives them back, `known` tells a value without x or z, and `integer()` its integer, by
 * its signedness. `real` values are numbers.
 *
 * Expressions are sized as IEEE 1800 says (11.6, 11.8): `common` gives the type context-determined operands share, and
 * the signatures follow (see `Evaluators`).
 */

import { Errors } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";

const { ValueError } = Errors;
export const Anything = D.Anything;

/** A type: `integral` with its `width`, signedness and number of `states` (4 or 2), or `real` with its IEEE 754
 * `format`. Its `name` is the one it is written with; types compare by the rest. */
export class SvType implements D.Domain {
  constructor(readonly kind: string, readonly width: number = 64, readonly signed: boolean = false,
    readonly states: number = 4, readonly format: string | null = null, readonly label: string = "") {}

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

/** The built-in types, by name. */
export const TYPES: ReadonlyMap<string, SvType> = new Map<string, SvType>([
  ["bit", new SvType("integral", 1, false, 2, null, "bit")], ["logic", new SvType("integral", 1, false, 4, null, "logic")],
  ["reg", new SvType("integral", 1, false, 4, null, "reg")], ["byte", new SvType("integral", 8, true, 2, null, "byte")],
  ["shortint", new SvType("integral", 16, true, 2, null, "shortint")], ["int", new SvType("integral", 32, true, 2, null, "int")],
  ["longint", new SvType("integral", 64, true, 2, null, "longint")], ["integer", new SvType("integral", 32, true, 4, null, "integer")],
  ["time", new SvType("integral", 64, false, 4, null, "time")],
  ["real", new SvType("real", 64, true, 2, "binary64", "real")], ["shortreal", new SvType("real", 32, true, 2, "binary32", "shortreal")],
]);

const type = (name: string) => TYPES.get(name) as SvType;
export const [Real, Integer, Bit] = [type("real"), type("integer"), type("bit")];
const Longint = type("longint");
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
 * signed if all are, and 4-state if any is. */
export function common(types: readonly SvType[]): SvType {
  if (types.some((t) => t.kind === "real")) { // real, unless every operand is a shortreal
    return types.every((t) => t.format === "binary32") ? type("shortreal") : Real;
  }
  return vector(Math.max(...types.map((t) => t.width)), types.every((t) => t.signed), Math.max(...types.map((t) => t.states)));
}

/** A constant's type: `integer` for an int that fits 32 bits, `longint` for 64; `real` for a number; and `Anything`
 * otherwise. */
export function of(value: unknown): D.Domain {
  if (typeof value === "bigint") {
    if (-(1n << 31n) <= value && value < 1n << 31n) return Integer;
    return -(1n << 63n) <= value && value < 1n << 63n ? Longint : Anything;
  }
  return typeof value === "number" ? Real : Anything;
}

/** A signature over SystemVerilog types: `rule` gives the result type of the argument types, or null when they do not
 * apply; an argument of unknown domain makes the result unknown, or `known` when given. */
class Sized implements D.Signature {
  constructor(private readonly count: number, private readonly rule: (types: SvType[]) => SvType | null,
    private readonly text: string, private readonly known: D.Domain | null = null) {}

  arity(): number {
    return this.count;
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    const unknown = args.filter((a) => !(a instanceof SvType));
    if (unknown.length > 0) return unknown.every((a) => a === Anything) ? this.known ?? Anything : null;
    return this.rule(args as SvType[]);
  }

  describe(): string {
    return this.text;
  }
}

const ONE = vector(1);
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
  ...["===", "!=="].map((op): Entry => [op, new Sized(2, (ts) => (integral(ts) ? Bit : null), "(integral, integral) -> bit", Bit)]),
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
