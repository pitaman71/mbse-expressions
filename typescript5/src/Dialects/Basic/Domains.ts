/**
 * Domains of the Basic dialect: the value domains that literals carry, and the values its core operations take and
 * give.
 *
 * Value domains name the standard they implement, with only its parameters (see docs/EXPRESSIONS.md, Value domains):
 *
 * - `OfBool`: true and false.
 * - `OfInteger`: two's complement integers of a `width` in bits, or unbounded, `signed` or not, whose `overflow`
 *   wraps, saturates or raises.
 * - `OfIeee754`: an IEEE 754-2019 interchange `format`, with a `rounding`-direction attribute.
 * - `OfBits` and `OfBytes`: unformatted patterns, of a `width` in bits, or of a `width` in bytes or of any length.
 * - `OfUnicode`: sequences of code points.
 * - `OfIeee1164`: VHDL's nine-valued logic, one state a value.
 * - `OfEnum`: one of its `members`, by name; unordered.
 * - `OfPacked`: an enum (its `domain`) represented in a fixed-width integer or bits (its `representation`), member `i`
 *   by `codes[i]`.
 *
 * Each kind's data, `OfX.Data`, is compared by structure (`equals`), built by `OfX.Builder` (`create()`, `clone()`,
 * `update()`; none validate), with `validate()`. A domain is a `Domain`: a value is in it (`contains`) when it has the
 * native type the domain's literals hold (a bigint for an integer, a string for an enum's member, ...) and fits it,
 * and it includes (`includes`) only domains equal to it, since Basic has no implied promotions.
 *
 * Today's natives are the defaults: `Int` is an unbounded signed integer, `Float` binary64 rounding ties to even, `Str`
 * Unicode, `Bytes` bytes of any length and `Bool` true and false; `of(value)` gives a native's default domain.
 * `Object` holds what writes its properties through `accept`, including expressions and value objects, and `Anything`
 * is the domain of a value not known statically, such as a property read with `get`. Unknown (`null`) is not a domain.
 *
 * Domains are registered by name with `register`. Over the wire a domain that is registered is written by name,
 * `{"named": {"name": "uint8"}}`, and any other by value, `{"integer": {"width": 8, "signed": false, ...}}`: `Schema`
 * is the union of the kinds' meta-schemas and `named`, and `to_plain` and `from_plain` convert.
 *
 * A value of another domain than its native's default is a typed value, `Value(domain, value)`; `value(domain,
 * native)` gives the bare native for a default domain and a typed value otherwise, and `of(value)` gives any value's
 * domain. A domain compares two of its values (`compare`), ordered or not (`ORDERED`), and an integer domain fits a
 * result into itself by its overflow (`fit`).
 *
 * `SIGNATURES` gives each core operation's signature, following the evaluator's rules: comparisons take two values of
 * one domain, ordered only for integers, IEEE 754 numbers, bytes, strings and packed enums; logic takes bools;
 * arithmetic takes two numbers of one domain and gives that domain, and the bitwise operations two integers or bits of
 * one domain.
 */

import { Comparison, Errors, Repr, Schemas } from "@mbse/schemas/Framework";
import type { Plain, Visitors } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";
import { OverflowError } from "../../Framework/Errors.js";
import * as Ieee754 from "./Ieee754.js";

type PlainData = Plain.PlainData;
type PlainMap = Plain.PlainMap;
type Native = Visitors.Native;

/** IEEE 754-2019's interchange formats. */
export const FORMATS = ["binary16", "binary32", "binary64", "binary128", "decimal64", "decimal128"] as const;
/** IEEE 754-2019's rounding-direction attributes. */
export const ROUNDINGS = ["roundTiesToEven", "roundTiesToAway", "roundTowardPositive", "roundTowardNegative",
  "roundTowardZero"] as const;
/** What an integer of a width does with a result outside it. */
export const OVERFLOWS = ["wrap", "saturate", "raise"] as const;
/** IEEE 1164's nine states: uninitialized, unknown, 0, 1, high impedance, weak unknown, weak 0, weak 1, don't care. */
export const STATES = ["U", "X", "0", "1", "Z", "W", "L", "H", "-"] as const;

const repr = Repr.repr;

function positive(value: unknown): boolean {
  return typeof value === "bigint" && value > 0n;
}

function oneOf(name: string, value: unknown, allowed: readonly string[]): string[] {
  return (allowed as readonly unknown[]).includes(value) ? [] : [`${name} must be one of ${allowed.join(", ")}, got ${repr(value)}`];
}

// --- Value domains ---

/** Shared by every value domain: the `Domain` protocol, `validate()` and `equals()`. `x instanceof Domains.Domain`
 * tells a value domain. */
export abstract class Domain implements D.Domain {
  static KIND: string;
  static NATIVE: unknown;
  static ORDERED = false;
  /** The fields, in order, as the plain form writes them. */
  static FIELDS: readonly string[] = [];

  kind(): typeof Domain {
    return this.constructor as typeof Domain;
  }

  name(): string {
    return this.kind().KIND;
  }

  /** The native type of the values in this domain. */
  native(): unknown {
    return this.kind().NATIVE;
  }

  contains(value: unknown): boolean {
    return Schemas.isNativeOf(this.native(), value) && this.fits(value);
  }

  protected fits(_value: unknown): boolean {
    return true;
  }

  includes(other: D.Domain): boolean {
    if (other instanceof D.OfUnion) return other.members.every((member) => this.includes(member));
    return this.equals(other);
  }

  /** How two values of this domain compare: -1, 0 or 1, or null when they are incomparable. An unordered domain's
   * values are equal or incomparable. */
  compare(a: unknown, b: unknown): number | null {
    const schema = new Schemas.OfNative.Data(this.native());
    return new Comparison.OfNative(schema, a as Native).compare(new Comparison.OfNative(schema, b as Native));
  }

  /** Structural equality: the same kind, with equal fields. */
  equals(other: unknown): boolean {
    return other instanceof Domain && other.kind() === this.kind() &&
      this.kind().FIELDS.every((name) => sameField(this.field(name), other.field(name)));
  }

  field(name: string): unknown {
    return (this as unknown as Record<string, unknown>)[name];
  }

  validate(): string[] {
    return [];
  }

  toString(): string {
    return this.name();
  }
}

function sameField(a: unknown, b: unknown): boolean {
  if (a instanceof Domain) return a.equals(b);
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  return a === b;
}

class BoolDomain extends Domain {
  static override KIND = "bool";
  static override NATIVE = Boolean;
}

class IntegerDomain extends Domain {
  static override KIND = "integer";
  static override NATIVE = BigInt;
  static override ORDERED = true;
  static override FIELDS = ["width", "signed", "overflow"];

  constructor(public width: bigint | null = null, public signed: boolean = true, public overflow: string = "raise") {
    super();
  }

  override name(): string {
    return `${this.signed ? "" : "u"}int${this.width === null ? "" : this.width}`;
  }

  /** The least and the greatest value, null where there is no bound. */
  bounds(): [bigint | null, bigint | null] {
    if (!positive(this.width)) return [this.signed ? null : 0n, null];
    const width = this.width as bigint;
    return this.signed ? [-(1n << (width - 1n)), (1n << (width - 1n)) - 1n] : [0n, (1n << width) - 1n];
  }

  protected override fits(value: unknown): boolean {
    const [low, high] = this.bounds();
    return (low === null || low <= (value as bigint)) && (high === null || (value as bigint) <= high);
  }

  /** `value` when the domain holds it; otherwise what the domain's overflow makes of it, from `operation`: wrapped into
   * the width, saturated to the nearer bound, or `OverflowError`. */
  fit(operation: string, value: bigint): bigint {
    if (this.fits(value)) return value;
    const [low, high] = this.bounds();
    if (this.overflow === "wrap" && positive(this.width)) {
      const modulus = 1n << (this.width as bigint);
      return ((value - (low as bigint)) % modulus + modulus) % modulus + (low as bigint);
    }
    if (this.overflow === "saturate") return low !== null && value < low ? low : high as bigint;
    throw new OverflowError(`${operation} overflows ${this.name()}: ${value}`);
  }

  override validate(): string[] {
    const problems = this.width === null || positive(this.width) ? [] : [`a width must be a positive int, got ${repr(this.width)}`];
    if (typeof this.signed !== "boolean") problems.push(`signed must be a bool, got ${repr(this.signed)}`);
    problems.push(...oneOf("overflow", this.overflow, OVERFLOWS));
    if (this.overflow === "wrap" && this.width === null) problems.push("an integer without a width cannot wrap");
    return problems;
  }
}

class Ieee754Domain extends Domain {
  static override KIND = "ieee754";
  static override ORDERED = true;
  static override FIELDS = ["format", "rounding"];

  constructor(public format: string = "binary64", public rounding: string = "roundTiesToEven") {
    super();
  }

  override name(): string {
    if (this.format === "binary64" && this.rounding === "roundTiesToEven") return "float";
    return this.rounding === "roundTiesToEven" ? this.format : `${this.format} ${this.rounding}`;
  }

  /** `binary16`, `binary32` and `binary64` values are floats; `binary128` and decimal values are their text. */
  override native(): unknown {
    return ["binary16", "binary32", "binary64"].includes(this.format) ? Number : String;
  }

  protected override fits(value: unknown): boolean {
    return Ieee754.FORMATS.has(this.format) && Ieee754.contains(this.format, value);
  }

  override compare(a: unknown, b: unknown): number | null {
    return Ieee754.compare(this.format, a, b);
  }

  override validate(): string[] {
    return [...oneOf("format", this.format, FORMATS), ...oneOf("rounding", this.rounding, ROUNDINGS)];
  }
}

class BitsDomain extends Domain {
  static override KIND = "bits";
  static override NATIVE = Uint8Array;
  static override FIELDS = ["width"];

  constructor(public width: bigint | null = null) {
    super();
  }

  override name(): string {
    return `bits${this.width}`;
  }

  /** Big-endian, in the fewest bytes, with the unused leading bits zero. */
  protected override fits(value: unknown): boolean {
    if (!positive(this.width)) return false;
    const width = Number(this.width);
    const bytes = value as Uint8Array;
    return bytes.length === Math.ceil(width / 8) && ((bytes[0] as number) >> (width % 8 || 8)) === 0;
  }

  override validate(): string[] {
    if (this.width === null) return ["a bits domain needs a width"];
    return positive(this.width) ? [] : [`a width must be a positive int, got ${repr(this.width)}`];
  }
}

class BytesDomain extends Domain {
  static override KIND = "bytes";
  static override NATIVE = Uint8Array;
  static override ORDERED = true;
  static override FIELDS = ["width"];

  constructor(public width: bigint | null = null) {
    super();
  }

  override name(): string {
    return this.width === null ? "bytes" : `bytes${this.width}`;
  }

  protected override fits(value: unknown): boolean {
    return this.width === null || BigInt((value as Uint8Array).length) === this.width;
  }

  override validate(): string[] {
    return this.width === null || positive(this.width) ? [] : [`a width must be a positive int, got ${repr(this.width)}`];
  }
}

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

class UnicodeDomain extends Domain {
  static override KIND = "unicode";
  static override NATIVE = String;
  static override ORDERED = true;

  override name(): string {
    return "str";
  }

  /** A lone surrogate is not a code point of a string. */
  protected override fits(value: unknown): boolean {
    return !LONE_SURROGATE.test(value as string);
  }
}

class Ieee1164Domain extends Domain {
  static override KIND = "ieee1164";
  static override NATIVE = String;

  override name(): string {
    return "std_logic";
  }

  protected override fits(value: unknown): boolean {
    return (STATES as readonly unknown[]).includes(value);
  }
}

class EnumDomain extends Domain {
  static override KIND = "enum";
  static override NATIVE = String;
  static override FIELDS = ["members"];

  constructor(public members: readonly string[] = []) {
    super();
  }

  override name(): string {
    return `enum(${this.members.map(String).join(", ")})`;
  }

  protected override fits(value: unknown): boolean {
    return this.members.includes(value as string);
  }

  override validate(): string[] {
    const problems = this.members.length > 0 ? [] : ["an enum needs a member"];
    const seen = new Set<unknown>();
    this.members.forEach((member, i) => {
      if (typeof member !== "string" || member === "") problems.push(`member ${i} has no name`);
      else if (seen.has(member)) problems.push(`member ${repr(member)} appears twice`);
      seen.add(member);
    });
    return problems;
  }
}

class PackedDomain extends Domain {
  static override KIND = "packed";
  static override NATIVE = String;
  static override ORDERED = true;
  static override FIELDS = ["domain", "representation", "codes"];

  constructor(public domain: unknown = null, public representation: unknown = null, public codes: readonly bigint[] = []) {
    super();
  }

  override name(): string {
    return `packed(${nameOf(this.domain)} as ${nameOf(this.representation)})`;
  }

  protected override fits(value: unknown): boolean {
    return this.domain instanceof EnumDomain && this.domain.contains(value);
  }

  /** The code of a member: its representation. */
  code(member: string): bigint {
    return this.codes[(this.domain as EnumDomain).members.indexOf(member)] as bigint;
  }

  /** By code, as C compares enums by their integers. */
  override compare(a: unknown, b: unknown): number | null {
    const [x, y] = [this.code(a as string), this.code(b as string)];
    return x < y ? -1 : x > y ? 1 : 0;
  }

  override validate(): string[] {
    const domain = this.domain;
    const representation = this.representation;
    if (!(domain instanceof EnumDomain)) return [`a packed domain packs an enum, got ${nameOf(domain)}`];
    if (!((representation instanceof IntegerDomain || representation instanceof BitsDomain) && positive(representation.width))) {
      return [`a packed domain's representation is an integer or bits of a width, got ${nameOf(representation)}`];
    }
    const problems = [...domain.validate().map((problem) => `domain: ${problem}`),
      ...representation.validate().map((problem) => `representation: ${problem}`)];
    if (this.codes.length !== domain.members.length) {
      problems.push(`a packed domain needs a code per member: ${domain.members.length} members, ${this.codes.length} codes`);
    }
    const seen = new Set<unknown>();
    this.codes.forEach((code, i) => {
      if (!this.holds(code)) problems.push(`code ${i} does not fit ${representation.name()}: ${repr(code)}`);
      else if (seen.has(code)) problems.push(`code ${repr(code)} is used twice`);
      seen.add(code);
    });
    return problems;
  }

  /** Whether the representation holds `code`: an integer's value, or bits' pattern read as an unsigned int. */
  private holds(code: unknown): boolean {
    const representation = this.representation as IntegerDomain | BitsDomain;
    if (representation instanceof IntegerDomain) return typeof code === "bigint" && representation.contains(code);
    return typeof code === "bigint" && code >= 0n && code < 1n << (representation.width as bigint);
  }
}

function nameOf(domain: unknown): string {
  return domain instanceof Domain ? domain.name() : repr(domain);
}

// --- Builders ---

type DomainClass = { new (...fields: any[]): Domain; readonly KIND: string; readonly FIELDS: readonly string[] };

/** Shared by every value domain's builder: `create()` / `clone()` / `update()`, none validating, and fluent setters for
 * the kind's fields. */
abstract class DomainBuilder {
  static DATA: DomainClass;
  private readonly source: Domain | undefined;
  private readonly fields = new Map<string, unknown>();

  constructor(instance?: Domain) {
    const data = this.data();
    if (instance !== undefined && (instance as object | null)?.constructor !== data) {
      throw new TypeError(`expected ${data.KIND} data to build from, got ${nameOf(instance)}`);
    }
    this.source = instance;
    if (instance !== undefined) for (const name of data.FIELDS) this.fields.set(name, instance.field(name));
  }

  private data(): DomainClass {
    return (this.constructor as typeof DomainBuilder).DATA;
  }

  protected setField(name: string, value: unknown): this {
    this.fields.set(name, value);
    return this;
  }

  private make(): any {
    const data = this.data();
    return new data(...data.FIELDS.map((name) => this.fields.get(name)));
  }

  create(): any {
    if (this.source !== undefined) {
      throw new Errors.ValueError("create() is only valid without a source instance; use clone() or update()");
    }
    return this.make();
  }

  clone(): any {
    if (this.source === undefined) throw new Errors.ValueError("clone() is only valid with a source instance");
    return this.make();
  }

  update(): any {
    if (this.source === undefined) throw new Errors.ValueError("update() is only valid with a source instance");
    const target = this.source as unknown as Record<string, unknown>;
    for (const [name, value] of this.fields) target[name] = value;
    return this.source;
  }
}

class BoolBuilder extends DomainBuilder {
  static override DATA = BoolDomain as DomainClass;
}

class IntegerBuilder extends DomainBuilder {
  static override DATA = IntegerDomain as DomainClass;

  width(width: bigint | null): this {
    return this.setField("width", width);
  }

  signed(signed: boolean): this {
    return this.setField("signed", signed);
  }

  overflow(overflow: string): this {
    return this.setField("overflow", overflow);
  }
}

class Ieee754Builder extends DomainBuilder {
  static override DATA = Ieee754Domain as DomainClass;

  format(format: string): this {
    return this.setField("format", format);
  }

  rounding(rounding: string): this {
    return this.setField("rounding", rounding);
  }
}

class BitsBuilder extends DomainBuilder {
  static override DATA = BitsDomain as DomainClass;

  width(width: bigint): this {
    return this.setField("width", width);
  }
}

class BytesBuilder extends DomainBuilder {
  static override DATA = BytesDomain as DomainClass;

  width(width: bigint | null): this {
    return this.setField("width", width);
  }
}

class UnicodeBuilder extends DomainBuilder {
  static override DATA = UnicodeDomain as DomainClass;
}

class Ieee1164Builder extends DomainBuilder {
  static override DATA = Ieee1164Domain as DomainClass;
}

class EnumBuilder extends DomainBuilder {
  static override DATA = EnumDomain as DomainClass;

  members(...members: string[]): this {
    return this.setField("members", members);
  }
}

class PackedBuilder extends DomainBuilder {
  static override DATA = PackedDomain as DomainClass;

  domain(domain: Domain): this {
    return this.setField("domain", domain);
  }

  representation(representation: Domain): this {
    return this.setField("representation", representation);
  }

  codes(...codes: bigint[]): this {
    return this.setField("codes", codes);
  }
}

// --- Meta-schemas ---

const text = (name: string) => (p: Schemas.OfProperty.Builder) => p.name(name).of((t) => t.as_native(String));
const integer = (name: string) => (p: Schemas.OfProperty.Builder) => p.name(name).of((t) => t.as_native(BigInt));
const listOf = (native: unknown) => (t: Schemas.OfAny.Builder) => t.as_indexed((i) => i.of((u) => u.as_native(native as never)));

/** A domain, by value or by name. */
export const Schema = new Schemas.OfUnion.Builder().create(); // its branches are added below
const SCHEMAS = new Map<string, Schemas.OfObject.Data>([
  ["bool", new Schemas.OfObject.Builder().create()],
  ["integer", new Schemas.OfObject.Builder().properties(integer("width"),
    (p) => p.name("signed").of((t) => t.as_native(Boolean)), text("overflow")).create()],
  ["ieee754", new Schemas.OfObject.Builder().properties(text("format"), text("rounding")).create()],
  ["bits", new Schemas.OfObject.Builder().properties(integer("width")).create()],
  ["bytes", new Schemas.OfObject.Builder().properties(integer("width")).create()],
  ["unicode", new Schemas.OfObject.Builder().create()],
  ["ieee1164", new Schemas.OfObject.Builder().create()],
  ["enum", new Schemas.OfObject.Builder().properties((p) => p.name("members").of(listOf(String))).create()],
  ["packed", new Schemas.OfObject.Builder().properties((p) => p.name("domain").of(Schema),
    (p) => p.name("representation").of(Schema), (p) => p.name("codes").of(listOf(BigInt))).create()],
  ["named", new Schemas.OfObject.Builder().properties(text("name")).create()],
]);
new Schemas.OfUnion.Builder(Schema).branches(...[...SCHEMAS].map(([name, schema]) =>
  (b: Parameters<Parameters<Schemas.OfUnion.Builder["branches"]>[0]>[0]) => b.name(name).of(schema))).update();

/** A value domain kind: `Data`, `Builder` and the meta-schema `Schema` of its value. */
export class Kind<Data extends Domain, B> {
  readonly Schema: Schemas.OfObject.Data;

  constructor(readonly Data: new (...fields: any[]) => Data, readonly Builder: new (instance?: Data) => B) {
    this.Schema = SCHEMAS.get((Data as unknown as typeof Domain).KIND) as Schemas.OfObject.Data;
  }

  toString(): string {
    return `<domain kind ${(this.Data as unknown as typeof Domain).KIND}>`;
  }
}

export const OfBool = new Kind(BoolDomain, BoolBuilder);
export const OfInteger = new Kind(IntegerDomain, IntegerBuilder);
export const OfIeee754 = new Kind(Ieee754Domain, Ieee754Builder);
export const OfBits = new Kind(BitsDomain, BitsBuilder);
export const OfBytes = new Kind(BytesDomain, BytesBuilder);
export const OfUnicode = new Kind(UnicodeDomain, UnicodeBuilder);
export const OfIeee1164 = new Kind(Ieee1164Domain, Ieee1164Builder);
export const OfEnum = new Kind(EnumDomain, EnumBuilder);
export const OfPacked = new Kind(PackedDomain, PackedBuilder);
const KINDS = new Map<string, DomainClass>([BoolDomain, IntegerDomain, Ieee754Domain, BitsDomain, BytesDomain,
  UnicodeDomain, Ieee1164Domain, EnumDomain, PackedDomain].map((kind) => [kind.KIND, kind as DomainClass]));

// --- The registry and the plain form ---

const registry = new Map<string, Domain>();

/** Registers `domain` under `name`, so that literals of it are written by name. A domain is registered once. */
export function register(name: string, domain: Domain): void {
  if (registry.has(name)) throw new Errors.ValueError(`domain ${repr(name)} is already registered`);
  for (const [other, registeredDomain] of registry) {
    if (registeredDomain.equals(domain)) throw new Errors.ValueError(`${nameOf(domain)} is already registered as ${repr(other)}`);
  }
  registry.set(name, domain);
}

/** The domain registered under `name`. */
export function registered(name: string): Domain {
  const found = registry.get(name);
  if (found === undefined) throw new Errors.LookupError(`no domain registered as ${repr(name)}`);
  return found;
}

/** The name a domain equal to `domain` is registered under, or null. */
export function name_of(domain: unknown): string | null {
  for (const [name, registeredDomain] of registry) if (registeredDomain.equals(domain)) return name;
  return null;
}

/** A domain's plain form: by name when it is registered, otherwise by value, leaving out what is absent. */
export function to_plain(domain: unknown): PlainMap {
  const name = name_of(domain);
  if (name !== null) return new Map([["named", new Map([["name", name]])]]);
  if (!(domain instanceof Domain)) throw new TypeError(`not a domain: ${repr(domain)}`);
  const contents: PlainMap = new Map();
  for (const field of domain.kind().FIELDS) {
    const value = domain.field(field);
    if (value instanceof Domain) contents.set(field, to_plain(value));
    else if (Array.isArray(value)) contents.set(field, [...value] as PlainData[]);
    else if (value !== null && value !== undefined) contents.set(field, value as PlainData);
  }
  return new Map([[domain.kind().KIND, contents]]);
}

/** The domain a plain form holds: a registered one by name, or a new one of its kind. */
export function from_plain(plain: PlainMap): Domain {
  const [kind, contents] = [...plain][0] as [string, PlainMap];
  if (kind === "named") return registered(contents.get("name") as string);
  const data = KINDS.get(kind) as DomainClass;
  return new data(...data.FIELDS.map((field) => {
    const value = contents.get(field);
    return value instanceof Map ? from_plain(value) : value === undefined ? undefined : value;
  }));
}

// --- Typed values ---

/** A value of a domain other than its native's default: the `domain`, and the `value`, a native it holds. */
export class Value {
  constructor(readonly domain: Domain, readonly value: unknown) {
    if (!(domain instanceof Domain)) throw new TypeError(`not a value domain: ${repr(domain)}`);
    if (!domain.contains(value)) throw new Errors.ValueError(`${domain.name()} cannot hold ${repr(value)}`);
  }

  /** The same domain, and the same native. */
  equals(other: unknown): boolean {
    return other instanceof Value && other.domain.equals(this.domain) && sameNative(other.value, this.value);
  }

  toString(): string {
    return `${repr(this.value)} as ${this.domain.name()}`;
  }
}

function sameNative(a: unknown, b: unknown): boolean {
  if (a instanceof Uint8Array && b instanceof Uint8Array) return a.length === b.length && a.every((x, i) => x === b[i]);
  return a === b;
}

/** A value of `domain`: the bare native when `domain` is its native's default, otherwise a typed value. */
export function value(domain: Domain, native: unknown): unknown {
  return nativeDomain(native)?.equals(domain) ? native : new Value(domain, native);
}

// --- The defaults and the core operations' signatures ---

export const Anything = D.Anything;
export const Bool = new BoolDomain();
export const Int = new IntegerDomain();
export const Float = new Ieee754Domain();
export const Str = new UnicodeDomain();
export const Bytes = new BytesDomain();
const ObjectDomain = new D.OfValues("object", (value) =>
  value !== null && typeof value === "object" && typeof (value as { accept?: unknown }).accept === "function");
export { ObjectDomain as Object };

const NATIVES: ReadonlyMap<string, Domain> = new Map<string, Domain>([
  ["bool", Bool], ["int", Int], ["float", Float], ["str", Str], ["bytes", Bytes],
]);

/** A native's default domain, or null when `value` is not a native. */
export function nativeDomain(value: unknown): Domain | null {
  const native = NATIVES.get(Repr.typeName(value));
  return native !== undefined && Schemas.isNativeOf(native.native(), value) ? native : null;
}

type DomainKind = abstract new (...args: never[]) => Domain;

/** Every value domain of some kinds, for signatures: it includes each of them. */
class Family implements D.Domain {
  readonly kinds: readonly DomainKind[];

  constructor(private readonly familyName: string, ...kinds: DomainKind[]) {
    this.kinds = kinds;
  }

  name(): string {
    return this.familyName;
  }

  private has(domain: unknown): boolean {
    return this.kinds.some((kind) => domain instanceof kind);
  }

  contains(value: unknown): boolean {
    return this.has(value instanceof Value ? value.domain : nativeDomain(value));
  }

  includes(other: D.Domain): boolean {
    if (other instanceof D.OfUnion) return other.members.every((member) => this.includes(member));
    return this.has(other);
  }

  toString(): string {
    return this.familyName;
  }
}

const VALUES = new Family("value domain", Domain);
const ORDERED_KINDS = new Family("integer, ieee754, bytes, unicode or packed domain", IntegerDomain, Ieee754Domain,
  BytesDomain, UnicodeDomain, PackedDomain);
const NUMERIC = new Family("integer or ieee754 domain", IntegerDomain, Ieee754Domain);
const BITWISE = new Family("integer or bits domain", IntegerDomain, BitsDomain);
const INTEGERS = new Family("integer domain", IntegerDomain);
const COMPARABLE = [Bool, Int, Float, Str, Bytes, ObjectDomain];
const ORDERED = [Int, Float, Str, Bytes];
const NUMBERS = [Int, Float];
const LOGIC = new D.Function([Bool, Bool], Bool);

/** `shl` and `shr`: an integer or bits value and a count of any integer domain, giving the value's domain. */
class Shift implements D.Signature {
  private readonly valueSignature = new D.Same(1, [Int], null, BITWISE);

  arity(): number {
    return 2;
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    if (args.length !== 2 || !D.overlaps(INTEGERS, args[1] as D.Domain)) return null;
    return this.valueSignature.result(args.slice(0, 1));
  }

  describe(): string {
    return `(T, any ${INTEGERS.name()}) -> T for T in int or any ${BITWISE.name()}`;
  }
}

/** The core operations' signatures. */
export const SIGNATURES: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["get", new D.Function([ObjectDomain, Str], Anything)], ["has", new D.Function([ObjectDomain, Str], Bool)],
  ...["eq", "ne"].map((name) => [name, new D.Same(2, COMPARABLE, Bool, VALUES)] as [string, D.Signature]),
  ...["lt", "le", "gt", "ge"].map((name) => [name, new D.Same(2, ORDERED, Bool, ORDERED_KINDS)] as [string, D.Signature]),
  ["and", LOGIC], ["or", LOGIC], ["not", new D.Function([Bool], Bool)], ["implies", LOGIC],
  ...["add", "sub", "mul"].map((name) => [name, new D.Same(2, NUMBERS, null, NUMERIC)] as [string, D.Signature]),
  ["neg", new D.Same(1, NUMBERS, null, NUMERIC)],
  ...["bitand", "bitor", "bitxor"].map((name) => [name, new D.Same(2, [Int], null, BITWISE)] as [string, D.Signature]),
  ["bitnot", new D.Same(1, [Int], null, BITWISE)], ["shl", new Shift()], ["shr", new Shift()],
]);

/** The domain of a value: a typed value's own, its native type's default, or `Object`. */
export function of(value: unknown): D.Domain {
  if (value instanceof Value) return value.domain;
  const native = nativeDomain(value);
  if (native !== null) return native;
  if (ObjectDomain.contains(value)) return ObjectDomain;
  throw new TypeError(`a ${Repr.typeName(value)} is not a value of the Basic dialect`);
}
