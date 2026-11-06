/**
 * The ISO/IEC 11404 dialect: the kinds of domain of ISO/IEC 11404:2007, the language-independent datatypes, and the
 * domains it defines. It has no terms yet: its operations are CAP-180's to model (see mbse-basis
 * [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](mbse:mbse-basis/docs/capabilities/CAP-180.md)
 * and [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains)).
 *
 * Its kinds of domain, the branches of its union `Expressions.ISOIEC11404.Expressions.DomainKind`, which `install` adds
 * to the framework's `Expressions.Framework.DomainKind` as the branch `isoiec11404`, each with the standard's parameters
 * and the properties that follow from them (inferred; populated by hand until constraint resolution computes them):
 *
 * - `bool` (`OfBool`): true and false; `ordered`.
 * - `integer` (`OfInteger`): two's complement integers of a `width` in bits, or unbounded, `signed` or not, whose
 *   `overflow` wraps, saturates or raises; inferred `least` and `greatest`, absent where unbounded, and `ordered`.
 * - `bits` (`OfBits`): an unformatted pattern of a `width` in bits; `ordered`.
 * - `bytes` (`OfBytes`): an octet string of a `width` in bytes or of any length; `ordered`.
 * - `enum` (`OfEnum`): one of its `members`, by name; `ordered`.
 * - `packed` (`OfPacked`): an enum represented in a fixed-width integer or bits, member `i` by `codes[i]`; its enum and
 *   its representation are domains, which a value cannot hold, so `Expressions.ISOIEC11404.Expressions.Packs` links them
 *   (the domain's extension adjacency `packs`); `ordered`.
 *
 * Its dialect is the singleton `Expressions.ISOIEC11404.Expressions`, of its schema
 * `Expressions.ISOIEC11404.Expressions.Dialect`, the branch `isoiec11404` of `Expressions.Framework.Dialect`. `define`
 * writes its domains, owned by name, each related to its schema, an `OfAny` of the scalar it narrows: `boolean`, `integer`
 * (signed, unbounded, raising on overflow), `octetstring` and `uint8` (8 bits, unsigned, wrapping).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The standards this dialect implements, by designation. */
export const STANDARDS: readonly string[] = ["ISO/IEC 11404:2007"];

/** ISO/IEC 11404's kinds of domain, its union of them added to the framework's as the branch `isoiec11404`, `Packs`
 * and the domain's extension adjacency `packs`; its domains' schemas; and its dialect's schema, whose singleton is
 * `Expressions.ISOIEC11404.Expressions`. Run after `Framework.install`, in a transaction of its own; run again, it
 * writes nothing. Its domains `define` writes after it. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.ISOIEC11404.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, // the framework's kind union of dialects, and its own
      Kinds: S.OfUnion, DomainKind: S.OfUnion, Domain: S.OfObject, Packs: S.OfRelation, // Kinds: the framework's
      OfBool: S.OfObject, OfInteger: S.OfObject, OfBits: S.OfObject, OfBytes: S.OfObject,
      OfEnum: S.OfObject, OfPacked: S.OfObject,
      boolean: S.OfAny, integer: S.OfAny, octetstring: S.OfAny, uint8: S.OfAny,
    })
    .spec([
      // --- Its dialect: the singleton `Expressions.ISOIEC11404.Expressions`, a branch of the framework's kind union ---
      (_: any) => _.Dialect.name("Expressions.ISOIEC11404.Expressions.Dialect").ref(true).singleton(
        "Expressions.ISOIEC11404.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        uses: (a: any) => a.relation([Framework.Uses]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("isoiec11404").schema([_.Dialect])]),

      // --- Its kinds of domain, each the standard's parameters, then what follows from them ---
      (_: any) => _.OfBool.name("Expressions.ISOIEC11404.Expressions.OfBool").properties({ ordered: S.OfBool }),
      (_: any) => _.OfInteger.name("Expressions.ISOIEC11404.Expressions.OfInteger").properties({
        width: S.OfInt, signed: S.OfBool, overflow: S.OfStr,
        least: S.OfInt, greatest: S.OfInt, ordered: S.OfBool }), // inferred
      (_: any) => _.OfBits.name("Expressions.ISOIEC11404.Expressions.OfBits").properties({
        width: S.OfInt, ordered: S.OfBool }),
      (_: any) => _.OfBytes.name("Expressions.ISOIEC11404.Expressions.OfBytes").properties({
        width: S.OfInt, ordered: S.OfBool }),
      (_: any) => _.OfEnum.name("Expressions.ISOIEC11404.Expressions.OfEnum").properties({
        members: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfStr])), ordered: S.OfBool }),
      (_: any) => _.OfPacked.name("Expressions.ISOIEC11404.Expressions.OfPacked").properties({
        codes: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfInt])), ordered: S.OfBool }),
      (_: any) => _.DomainKind.name("Expressions.ISOIEC11404.Expressions.DomainKind").branches([
        (t: any) => t.name("bool").schema([_.OfBool]),
        (t: any) => t.name("integer").schema([_.OfInteger]),
        (t: any) => t.name("bits").schema([_.OfBits]),
        (t: any) => t.name("bytes").schema([_.OfBytes]),
        (t: any) => t.name("enum").schema([_.OfEnum]),
        (t: any) => t.name("packed").schema([_.OfPacked]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("isoiec11404").schema([_.DomainKind])]),
      // a packed domain's enum and representation are domains, which a value cannot hold: `Packs` links them
      (_: any) => _.Packs.name("Expressions.ISOIEC11404.Expressions.Packs").links([
        (t: any) => t.name("packed"), (t: any) => t.name("domain").schema([_.Domain]),
        (t: any) => t.name("representation").schema([_.Domain])]).uniques([["packed"]]),
      (_: any) => _.Domain.name("Expressions.Framework.Domain").adjacencies({
        packs: (a: any) => a.relation([_.Packs]).me("packed") }),

      // --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.boolean.name("Expressions.ISOIEC11404.Expressions.boolean").schemas([S.OfBool]),
      (_: any) => _.integer.name("Expressions.ISOIEC11404.Expressions.integer").schemas([S.OfInt]),
      (_: any) => _.octetstring.name("Expressions.ISOIEC11404.Expressions.octetstring").schemas([S.OfBytes]),
      (_: any) => _.uint8.name("Expressions.ISOIEC11404.Expressions.uint8").schemas([S.OfInt]),
    ])]))]);
}

/** ISO/IEC 11404's dialect as data: the singleton `Expressions.ISOIEC11404.Expressions` owning its domains by name
 * (`domains`, through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and
 * related to its schema (`Expressions.ISOIEC11404.Expressions.uint8`) by `Expressions.Framework.HasDomain`. Run after
 * `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and
 * each domain by its name: `store.transaction(ISOIEC11404.define)[0].get("uint8")`. */
export function define(txn: any): any {
  const [ISOIEC11404, Domain] = [txn.Expressions.ISOIEC11404.Expressions, txn.Expressions.Framework.Domain];
  return txn.uid("mbse.Expressions.ISOIEC11404.Expressions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: ISOIEC11404.Dialect, boolean: Domain, integer: Domain, octetstring: Domain, uint8: Domain })
    .spec([
      (_: any) => _.dialect.domains({
        boolean: (e: any) => e.domain(_.boolean), integer: (e: any) => e.domain(_.integer),
        octetstring: (e: any) => e.domain(_.octetstring), uint8: (e: any) => e.domain(_.uint8),
      }),
      (_: any) => _.boolean.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.bool(
        (d: any) => d.ordered(false)))))).schema([ISOIEC11404.boolean]),
      (_: any) => _.integer.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.signed(true).overflow("raise").ordered(true)))))).schema([ISOIEC11404.integer]), // unbounded
      (_: any) => _.octetstring.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.bytes(
        (d: any) => d.ordered(true)))))).schema([ISOIEC11404.octetstring]),
      (_: any) => _.uint8.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(8n).signed(false).overflow("wrap").least(0n).greatest(255n).ordered(true)))))).schema([
        ISOIEC11404.uint8]),
    ])]))]);
}
