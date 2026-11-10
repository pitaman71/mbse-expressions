/**
 * Expressions of the SystemVerilog dialect: expressions and constraints of SystemVerilog (and Verilog), over its
 * 4-state and 2-state vectors and reals, as its source writes them.
 *
 * SystemVerilog's terms are values of its `Term`, `Expressions.SystemVerilog.Expressions.Term`, the branch `systemverilog` of
 * `Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are the
 * framework's `literal`, `variable` and `call`, whose shape these have, its own kinds, each a value object
 * `Expressions.SystemVerilog.Expressions.<Kind>` named plainly, whose slots hold SystemVerilog's terms, and the framework's kinds of
 * invalid syntax (`error`, `missing`); a term carries no domain:
 *
 * - `literal` (the framework's): a constant, an unsized decimal integer (an `integer`), a real, or a string literal, with
 *   its spelling (`text`) where it has one; it holds no bool nor bytes, which validation reports.
 * - `vector`: a sized literal, its bits MSB first (`0`, `1`, `x`, `z`), `signed` or not, written in its `base` (`b`, `o`,
 *   `d` or `h`; binary by default, and wherever the base cannot write the bits): `8'hFF`, `4'b10x1`, `8'sd5`.
 * - `variable` (the framework's): an identifier, the value bound to a variable.
 * - `unary`: `+`, `-`, `!`, `~` and the reductions `&`, `~&`, `|`, `~|`, `^`, `~^`.
 * - `binary`: `**`, `*`, `/`, `%`, `+`, `-`, `<<`, `>>`, `<<<`, `>>>`, `<`, `<=`, `>`, `>=`, `==`, `!=`, `===`, `!==`,
 *   `==?`, `!=?`, `&`, `^`, `^~`, `~^`, `|`, `&&`, `||`, and the implications `->` and `<->`.
 * - `conditional`: `condition ? consequent : alternative`.
 * - `concatenation` (`{a, b}`) and `replication` (`{n{a}}`).
 * - `select` (`a[i]`) and `range` (`a[msb:lsb]`), of a vector's bits or an array's elements.
 * - `inside`: `value inside {items}`, whose items are values or `span`s (`[low:high]`).
 * - `cast`: `type'(x)`, to a type SystemVerilog defines, `signed` or `unsigned`, or `width'(x)`.
 * - `member`: `object.name`.
 * - `call`: a system function (`$signed`, `$unsigned`, `$clog2`, `$bits`, `$countones`, `$onehot`, `$onehot0`,
 *   `$isunknown`) or a function the scope provides, named by its `callable`: the framework's `call`, read as this
 *   dialect reads it.
 * - `method`: an array method of no arguments, `array.name()`: `size`, the reductions `sum`, `product`, `and`, `or` and
 *   `xor`, and the locators `min`, `max` and `unique`, which give queues.
 * - `iterate`: a reduction with a `with` clause, `array.method(name) with (body)`, which binds `name` (the iterator) to
 *   each item of the array within the body and reduces the body's values: `ports.and(p) with (p.pin > 0)`.
 *
 * There is no binding: translators substitute a let's value for its name. `DIALECT` reads the kinds. The writers (`constant`,
 * `vector`, ...) write terms through the builders, wherever a term is written, in a transaction. `Text.ToText` writes an
 * expression as SystemVerilog source, with its precedence.
 *
 * Its kinds of domain, the branches of its union `Expressions.SystemVerilog.Expressions.DomainKind`, which `install`
 * adds to the framework's `Expressions.Framework.DomainKind` as the branch `systemverilog`: IEEE 1800's integral types,
 * `logic` (`Expressions.SystemVerilog.Expressions.OfLogic`), 4-state, and `bit` (`OfBit`), 2-state, each of a `width` in
 * bits, `signed` or not; inferred (populated by hand until constraint resolution computes them) `least` and `greatest`,
 * of its known values, and `ordered`. `install` also adds its 2-state domains' schemas, each an `OfAny` of the scalar it
 * narrows (`Expressions.SystemVerilog.Expressions.int`, of ints; `real` and `shortreal`, of floats); a 4-state domain has
 * none, since no basic scalar holds x or z. `define` writes its domains, IEEE 1800's built-in types, owned by name:
 * `logic`, `reg`, `integer` and `time` of the kind `logic`; `bit`, `byte`, `shortint`, `int` and `longint` of `bit`;
 * `real` and `shortreal` of IEEE 754's `ieee754`, `binary64` and `binary32`. Each name is its own domain: `reg` is
 * `logic`'s equal, not its synonym.
 *
 * What reads a named type reads its stored domain, through the store of the term's holder (`Proxies.store_of`), by
 * `Domains.named`: validation, a cast's type (`int'(x)`), which must be a type SystemVerilog defines in that store;
 * inference, a constant's type (`integer`, `longint`, `real`), a cast's and `===`'s (`bit`); and evaluation (see
 * `Evaluators`). A lone term reaches no store: reading a type, it is refused (mbse-schemas' TypeError, "the value does
 * not belong to a store"), and a term that reads none, a sized vector's, is read as before.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Proxies, Repr } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr, typeName } = Repr;

const SIGNEDNESS = ["signed", "unsigned"]; // what a cast may name besides a type SystemVerilog defines
/** The system functions. */
export const SYSTEM: readonly string[] = ["$signed", "$unsigned", "$clog2", "$bits", "$countones", "$onehot", "$onehot0", "$isunknown"];
/** The array reduction methods, which may have a `with` clause. */
export const REDUCTIONS: readonly string[] = ["sum", "product", "and", "or", "xor"];
/** The array methods of no arguments. */
export const METHODS: readonly string[] = ["size", ...REDUCTIONS, "min", "max", "unique"];
export const BASES: Record<string, number> = { b: 1, o: 3, h: 4, d: 0 };

/** SystemVerilog's union of its kinds, added to the framework's terms as the branch `systemverilog`, its own kinds,
 * and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Expressions`: run after `Framework.install`, in a
 * transaction of its own; run again, it writes nothing. Its `literal`, `variable` and `call` are the framework's.
 * Its holder, `Expressions.SystemVerilog.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root`
 * narrowed to its `Term`. Its kinds of domain, `logic` and `bit`, and its 2-state domains' schemas; its domains `define`
 * writes after it. Run after IEEE 754's install, whose kind its reals are of. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.SystemVerilog.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Kinds: S.OfUnion, DomainKind: S.OfUnion, OfLogic: S.OfObject, OfBit: S.OfObject, // Kinds: the framework's
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      Vector: S.OfObject, Unary: S.OfObject, Binary: S.OfObject, Conditional: S.OfObject,
      Concatenation: S.OfObject, Replication: S.OfObject, Select: S.OfObject, Range: S.OfObject,
      Inside: S.OfObject, Span: S.OfObject, Cast: S.OfObject, Member: S.OfObject,
      Method: S.OfObject, Iterate: S.OfObject, // FrameworkTerm: the framework's union, by name
      bit: S.OfAny, byte: S.OfAny, shortint: S.OfAny, int: S.OfAny, longint: S.OfAny,
      real: S.OfAny, shortreal: S.OfAny })
    .spec([
      // its dialect: the singleton `Expressions.SystemVerilog.Expressions`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.SystemVerilog.Expressions.Dialect").ref(true).singleton("Expressions.SystemVerilog.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("systemverilog").schema([_.Dialect])]),
      // its union of its kinds: the framework's it reuses, its own, and invalid syntax
      (_: any) => _.Term.name("Expressions.SystemVerilog.Expressions.Term").branches([
        (t: any) => t.name("literal").schema([Framework.Literal]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("call").schema([Framework.Call]),
        (t: any) => t.name("vector").schema([_.Vector]),
        (t: any) => t.name("unary").schema([_.Unary]),
        (t: any) => t.name("binary").schema([_.Binary]),
        (t: any) => t.name("conditional").schema([_.Conditional]),
        (t: any) => t.name("concatenation").schema([_.Concatenation]),
        (t: any) => t.name("replication").schema([_.Replication]),
        (t: any) => t.name("select").schema([_.Select]),
        (t: any) => t.name("range").schema([_.Range]),
        (t: any) => t.name("inside").schema([_.Inside]),
        (t: any) => t.name("span").schema([_.Span]),
        (t: any) => t.name("cast").schema([_.Cast]),
        (t: any) => t.name("member").schema([_.Member]),
        (t: any) => t.name("method").schema([_.Method]),
        (t: any) => t.name("iterate").schema([_.Iterate]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Vector.name("Expressions.SystemVerilog.Expressions.Vector").properties({
        value: S.OfStr, signed: S.OfBool, base: S.OfStr }), // its bits, MSB first
      (_: any) => _.Unary.name("Expressions.SystemVerilog.Expressions.Unary").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Binary.name("Expressions.SystemVerilog.Expressions.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Conditional.name("Expressions.SystemVerilog.Expressions.Conditional").properties({
        condition: _.Term, consequent: _.Term, alternative: _.Term }),
      (_: any) => _.Concatenation.name("Expressions.SystemVerilog.Expressions.Concatenation").properties({
        parts: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])) }),
      (_: any) => _.Replication.name("Expressions.SystemVerilog.Expressions.Replication").properties({
        count: _.Term, value: _.Term }),
      (_: any) => _.Select.name("Expressions.SystemVerilog.Expressions.Select").properties({
        value: _.Term, index: _.Term }),
      (_: any) => _.Range.name("Expressions.SystemVerilog.Expressions.Range").properties({
        value: _.Term, msb: _.Term, lsb: _.Term }),
      (_: any) => _.Inside.name("Expressions.SystemVerilog.Expressions.Inside").properties({
        value: _.Term, items: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])) }),
      (_: any) => _.Span.name("Expressions.SystemVerilog.Expressions.Span").properties({
        low: _.Term, high: _.Term }),
      (_: any) => _.Cast.name("Expressions.SystemVerilog.Expressions.Cast").properties({
        type: S.OfStr, width: S.OfInt, operand: _.Term }),
      (_: any) => _.Member.name("Expressions.SystemVerilog.Expressions.Member").properties({
        name: S.OfStr, object: _.Term }),
      (_: any) => _.Method.name("Expressions.SystemVerilog.Expressions.Method").properties({
        name: S.OfStr, array: _.Term }),
      (_: any) => _.Iterate.name("Expressions.SystemVerilog.Expressions.Iterate").properties({
        name: S.OfStr, // the iterator
        method: S.OfStr, array: _.Term, body: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
      // to its `Term`
      (_: any) => _.Expression.name("Expressions.SystemVerilog.Expressions.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      // --- its kinds of domain: IEEE 1800's integrals, 4-state and 2-state, their parameters, then what follows ---
      (_: any) => _.OfLogic.name("Expressions.SystemVerilog.Expressions.OfLogic").properties({
        width: S.OfInt, signed: S.OfBool,
        least: S.OfInt, greatest: S.OfInt, ordered: S.OfBool }), // inferred, of its known values
      (_: any) => _.OfBit.name("Expressions.SystemVerilog.Expressions.OfBit").properties({
        width: S.OfInt, signed: S.OfBool,
        least: S.OfInt, greatest: S.OfInt, ordered: S.OfBool }), // inferred
      (_: any) => _.DomainKind.name("Expressions.SystemVerilog.Expressions.DomainKind").branches([
        (t: any) => t.name("logic").schema([_.OfLogic]),
        (t: any) => t.name("bit").schema([_.OfBit]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("systemverilog").schema([_.DomainKind])]),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("systemverilog").schema([_.Term])]),
      // --- its 2-state domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its
      // domain; a 4-state domain has none: no basic scalar holds x or z ---
      (_: any) => _.bit.name("Expressions.SystemVerilog.Expressions.bit").schemas([S.OfInt]),
      (_: any) => _.byte.name("Expressions.SystemVerilog.Expressions.byte").schemas([S.OfInt]),
      (_: any) => _.shortint.name("Expressions.SystemVerilog.Expressions.shortint").schemas([S.OfInt]),
      (_: any) => _.int.name("Expressions.SystemVerilog.Expressions.int").schemas([S.OfInt]),
      (_: any) => _.longint.name("Expressions.SystemVerilog.Expressions.longint").schemas([S.OfInt]),
      (_: any) => _.real.name("Expressions.SystemVerilog.Expressions.real").schemas([S.OfFloat]),
      (_: any) => _.shortreal.name("Expressions.SystemVerilog.Expressions.shortreal").schemas([S.OfFloat]),
    ])]))]);
}

/** SystemVerilog's dialect as data: the singleton `Expressions.SystemVerilog.Expressions` owning its domains, IEEE
 * 1800's built-in types, by name (`domains`, through `Expressions.Framework.Defines`), each with its parameters and
 * its inferred properties, and each 2-state one related to its schema (`Expressions.SystemVerilog.Expressions.int`)
 * by `Expressions.Framework.HasDomain`. Run after `install`, in a transaction of its own; run again, it writes
 * nothing. Its frame binds the dialect (`dialect`) and each domain by its name:
 * `store.transaction(SystemVerilog.define)[0].get("int")`. */
export function define(txn: any): any {
  const [SV, Domain] = [txn.Expressions.SystemVerilog.Expressions, txn.Expressions.Framework.Domain];
  return txn.uid("mbse.Expressions.SystemVerilog.Expressions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: SV.Dialect, logic: Domain, reg: Domain, integer: Domain, time: Domain,
      bit: Domain, byte: Domain, shortint: Domain, int: Domain, longint: Domain,
      real: Domain, shortreal: Domain })
    .spec([
      (_: any) => _.dialect.domains({
        logic: (e: any) => e.domain(_.logic), reg: (e: any) => e.domain(_.reg),
        integer: (e: any) => e.domain(_.integer), time: (e: any) => e.domain(_.time),
        bit: (e: any) => e.domain(_.bit), byte: (e: any) => e.domain(_.byte),
        shortint: (e: any) => e.domain(_.shortint), int: (e: any) => e.domain(_.int),
        longint: (e: any) => e.domain(_.longint),
        real: (e: any) => e.domain(_.real), shortreal: (e: any) => e.domain(_.shortreal),
      }),
      // 4-state, with no schema: least and greatest of its known values; "logic and reg denote the same type"
      // (IEEE 1800-2023), each its own domain, of equal properties: no synonyms
      (_: any) => _.logic.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.logic(
        (d: any) => d.width(1n).signed(false).least(0n).greatest(1n).ordered(true)))))),
      (_: any) => _.reg.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.logic(
        (d: any) => d.width(1n).signed(false).least(0n).greatest(1n).ordered(true)))))), // logic's equal
      (_: any) => _.integer.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.logic(
        (d: any) => d.width(32n).signed(true).least(-2147483648n).greatest(2147483647n).ordered(true)))))),
      (_: any) => _.time.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.logic(
        (d: any) => d.width(64n).signed(false).least(0n).greatest(18446744073709551615n).ordered(true)))))),
      // 2-state
      (_: any) => _.bit.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(1n).signed(false).least(0n).greatest(1n).ordered(true)))))).schema([SV.bit]),
      (_: any) => _.byte.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(8n).signed(true).least(-128n).greatest(127n).ordered(true)))))).schema([SV.byte]),
      (_: any) => _.shortint.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(16n).signed(true).least(-32768n).greatest(32767n).ordered(true)))))).schema([SV.shortint]),
      (_: any) => _.int.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(32n).signed(true).least(-2147483648n).greatest(2147483647n).ordered(true)))))).schema([SV.int]),
      (_: any) => _.longint.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.systemverilog((v: any) => v.bit(
        (d: any) => d.width(64n).signed(true).least(-9223372036854775808n).greatest(9223372036854775807n).ordered(true)))))).schema([SV.longint]),
      // IEEE 754's, as its own binary64 and binary32 are
      (_: any) => _.real.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n).radix(2n).precision(53n).emax(1023n).ordered(
          true)))))).schema([SV.real]),
      (_: any) => _.shortreal.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary32").rounding("roundTiesToEven").width(32n).radix(2n).precision(24n).emax(127n).ordered(
          true)))))).schema([SV.shortreal]),
    ])]))]);
}

const SCALARS = ["bigint", "number", "string"]; // what a constant holds: no bool, no bytes

/** A literal holds what a constant of SystemVerilog does: the framework's literal may hold more. */
function literalCheck(record: any): string[] {
  const value = F.attributesOf(record).get("value");
  return SCALARS.includes(typeof value) ? [] : [`a SystemVerilog literal cannot hold a ${typeName(value)}`];
}

function vectorCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const [value, base] = [attributes.get("value"), attributes.get("base") ?? null]; // a vector checked has a value
  const problems = value && [...value].every((b: string) => "01xz".includes(b)) ? [] : [
    `a vector's bits must be 0, 1, x and z, at least one, got ${repr(value)}`];
  if (base !== null && !(base in BASES)) problems.push(`a vector's base must be b, o, d or h, got ${repr(base)}`);
  return problems;
}

function vectorTyped(record: any): D.Domain | null {
  if (vectorCheck(record).length > 0) return null;
  const attributes = F.attributesOf(record);
  return Domains.vector(attributes.get("value").length, Boolean(attributes.get("signed")));
}

/** A cast names a positive width, a signedness, or a type SystemVerilog defines in the store of the term's holder. */
function castCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const [type, width] = [attributes.get("type") ?? null, attributes.get("width") ?? null];
  if ((type === null) === (width === null)) return ["a cast names a type or a width, not both nor neither"];
  if (width !== null) return width > 0n ? [] : [`a cast's width must be positive, got ${width}`];
  if (!SIGNEDNESS.includes(type)) {
    const store = Proxies.store_of(record);
    try {
      Domains.named(store, type);
    } catch (error) { // a ValueError: the store defines no such type
      return [(error as Error).message];
    }
  }
  return [];
}

/** A cast to a type: that type, read from the store of the term's holder; one to a width or a signedness is sized by
 * its operand. */
function castTyped(record: any): D.Domain | null {
  const type = F.attributesOf(record).get("type") ?? null;
  return type === null || SIGNEDNESS.includes(type) ? null : Domains.named(Proxies.store_of(record), type);
}

/** A constant's type, read from the store of the term's holder; null where no type holds it (a string). */
function literalTyped(record: any): D.Domain | null {
  const name = Domains.of(F.attributesOf(record).get("value"));
  return name === null ? null : Domains.named(Proxies.store_of(record), name);
}

/** `===`'s and `!==`'s type, `bit`, read from the store of the term's holder; the others' are their operands'. */
function binaryTyped(record: any): D.Domain | null {
  const operator = F.attributesOf(record).get("operator");
  return operator === "===" || operator === "!==" ? Domains.named(Proxies.store_of(record), "bit") : null;
}

/** The domain of a constant no type holds: a string, or an int beyond 64 bits (`Kind.typed` reads the others'). */
function untyped(_value: unknown): D.Domain {
  return D.Anything;
}

function methodCheck(record: any): string[] {
  const name = F.attributesOf(record).get("name") ?? null;
  return METHODS.includes(name) ? [] : [`an array method must be one of ${METHODS.join(", ")}, got ${repr(name)}`];
}

function iterateCheck(record: any): string[] {
  const method = F.attributesOf(record).get("method") ?? null;
  if (!REDUCTIONS.includes(method)) return [`an iteration's method must be one of ${REDUCTIONS.join(", ")}, got ${repr(method)}`];
  return [];
}

/** The constant of a native value: a bigint, a number or a string. */
function native(value: unknown): Writer | null {
  return SCALARS.includes(typeof value) ? constant(value) : null;
}

/** The SystemVerilog dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("SystemVerilog.Expressions", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck, typed: literalTyped }),
  vector: new F.Kind(F.LITERAL, { check: vectorCheck, typed: vectorTyped }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  binary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.BINARY, required: ["operator"],
    typed: binaryTyped }),
  conditional: new F.Kind(F.APPLICATION, { signature: Domains.CONDITIONAL }),
  concatenation: new F.Kind(F.APPLICATION, { signature: Domains.CONCATENATION }),
  replication: new F.Kind(F.APPLICATION, { signature: Domains.REPLICATION }),
  select: new F.Kind(F.APPLICATION, { signature: Domains.SELECT }),
  range: new F.Kind(F.APPLICATION, { signature: Domains.RANGE }),
  inside: new F.Kind(F.APPLICATION, { signature: Domains.INSIDE }),
  span: new F.Kind(F.APPLICATION, { signature: Domains.SPAN }),
  cast: new F.Kind(F.APPLICATION, { signature: Domains.CAST, check: castCheck, typed: castTyped }),
  member: new F.Kind(F.APPLICATION, { signature: Domains.MEMBER, required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", signature: Domains.CALL, required: ["callable"] }),
  method: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.METHOD, required: ["name"], check: methodCheck }),
  iterate: new F.Kind(F.QUANTIFIER, { operator: "method", signature: Domains.ITERATE, required: ["name", "method"],
    check: iterateCheck }),
}, { domain_of: untyped, literal: native });

// --- Writers ---

/** A SystemVerilog term, written through the builders where it is given. */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}


/** The writer of a term of `tag`: its attributes (those not null), its slots (specs) and its variadic arguments. */
function kind(tag: string, attributes: Record<string, unknown>, slots: Record<string, unknown> = {},
  variadic: [string, unknown[]] | null = null): Writer {
  const specs = Object.entries(slots).map(([name, value]) => [name, DIALECT.spec(value)] as const);
  const elements = variadic === null ? null : [variadic[0], variadic[1].map((value) => DIALECT.spec(value))] as const;
  return new Writer((u: any) => u[tag]((r: any) => {
    for (const [name, value] of Object.entries(attributes)) {
      if (value !== null && value !== undefined) r[name]((p: any) => p.as_scalar(value));
    }
    for (const [name, written] of specs) r[name](written);
    if (elements !== null) r[elements[0]](elements[1]);
    return r;
  }));
}

/** An unsized integer, a real or a string literal (validation reports any other value). */
export function constant(value: unknown): Writer {
  return new Writer((u: any) => u.literal((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** A sized literal of `bits`, MSB first. */
export function vector(bits: string, signed: boolean | null = null, base: string | null = null): Writer {
  return kind("vector", { value: bits, signed, base });
}

export function identifier(name: string): Writer {
  return kind("variable", { name });
}

/** `<operator> operand`; the operand is a spec (a native value is a constant). */
export function unary(operator: string, operand: unknown): Writer {
  return kind("unary", { operator }, { operand });
}

export function binary(operator: string, left: unknown, right: unknown): Writer {
  return kind("binary", { operator }, { left, right });
}

export function conditional(condition: unknown, consequent: unknown, alternative: unknown): Writer {
  return kind("conditional", {}, { condition, consequent, alternative });
}

export function concatenation(...parts: unknown[]): Writer {
  return kind("concatenation", {}, {}, ["parts", parts]);
}

export function replication(count: unknown, value: unknown): Writer {
  return kind("replication", {}, { count, value });
}

export function select(value: unknown, index: unknown): Writer {
  return kind("select", {}, { value, index });
}

/** `value[msb:lsb]`. */
export function range_(value: unknown, msb: unknown, lsb: unknown): Writer {
  return kind("range", {}, { value, msb, lsb });
}

export function inside(value: unknown, ...items: unknown[]): Writer {
  return kind("inside", {}, { value }, ["items", items]);
}

/** `[low:high]`, an item of `inside`. */
export function span(low: unknown, high: unknown): Writer {
  return kind("span", {}, { low, high });
}

/** `type'(operand)`, or `width'(operand)` for a bigint. */
export function cast(typeOrWidth: string | bigint, operand: unknown): Writer {
  if (typeof typeOrWidth === "bigint") return kind("cast", { width: typeOrWidth }, { operand });
  return kind("cast", { type: typeOrWidth }, { operand });
}

export function member(object: unknown, name: string): Writer {
  return kind("member", { name }, { object });
}

/** `fn(args)`: the framework's `call`, its `callable` the function's name. */
export function call(fn: string, ...args: unknown[]): Writer {
  return kind("call", { callable: fn }, {}, ["arguments", args]);
}

/** `array.name()`. */
export function method(array: unknown, name: string): Writer {
  return kind("method", { name }, { array });
}

/** `array.method(name) with (body)`. */
export function iterate(array: unknown, method: string, name: string, body: unknown): Writer {
  return kind("iterate", { name, method }, { array, body });
}
