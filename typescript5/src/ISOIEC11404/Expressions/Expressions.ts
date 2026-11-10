/**
 * The ISO/IEC 11404 dialect: the kinds of domain of ISO/IEC 11404:2007, the language-independent datatypes, and the
 * domains it defines. It has no terms yet: its operations are CAP-180's to model (see mbse-basis
 * [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](mbse:mbse-basis/docs/capabilities/CAP-180.md)
 * and [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains)).
 *
 * Its kinds of domain, the branches of its union `Expressions.ISOIEC11404.Expressions.DomainKind`, which `install` adds
 * to the framework's `Expressions.Framework.DomainKind` as the branch `isoiec11404`, each with the standard's parameters
 * and the properties that follow from them (inferred; populated by hand until constraint resolution computes them).
 * Each kind is named as the standard declares its datatype: `boolean`, `integer`, `modulo`, `bitstring`, `octet`,
 * `octetstring` and `state` (11404's unordered enumeration, the generic one; its `enumerated`, ordered, is added when a
 * dialect first needs an order). `packed` has no 11404 name: it keeps a state value apart from the code that represents
 * it. The kinds:
 *
 * - `boolean` (`OfBoolean`): true and false; `ordered`.
 * - `integer` (`OfInteger`): two's complement integers of a `width` in bits, or unbounded, `signed` or not, whose
 *   `overflow` wraps, saturates or raises; inferred `least` and `greatest`, absent where unbounded, and `ordered`.
 * - `modulo` (`OfModulo`): 11404's `modulo(modulus)`, the integers 0 to `modulus` - 1, numeric, whose addition and
 *   multiplication give their result's remainder by the `modulus`: wrapping arithmetic; inferred `least`, `greatest`
 *   and `ordered`.
 * - `bitstring` (`OfBitstring`): an unformatted pattern of a `width` in bits; `ordered`.
 * - `octet` (`OfOctet`): 11404's `octet`, codes 0 to 255, ordered but non-numeric: no arithmetic, so no overflow;
 *   `ordered`.
 * - `octetstring` (`OfOctetstring`): an octet string of a `width` in octets or of any length; `ordered`.
 * - `state` (`OfState`): one of its `members`, by name; `ordered`.
 * - `packed` (`OfPacked`): a state value represented in a code, an octet, or a fixed-width integer or bits, member `i` by
 *   `codes[i]`; its
 *   state domain and its representation are domains, which a value cannot hold, so
 *   `Expressions.ISOIEC11404.Expressions.Packs` links them (the domain's extension adjacency `packs`); `ordered`.
 *
 * Its dialect is the singleton `Expressions.ISOIEC11404.Expressions`, of its schema
 * `Expressions.ISOIEC11404.Expressions.Dialect`, the branch `isoiec11404` of `Expressions.Framework.Dialect`. `define`
 * writes its domains, owned by name, each related to its schema, an `OfAny` of the scalar it narrows: `boolean`, `integer`
 * (signed, unbounded, raising on overflow), `octetstring`, `octet` (11404's "`type octet = new integer range
 * (0..255)`", codes) and `modulo(256)` (11404's notation for its modulo datatype of modulus 256: 8-bit wrapping
 * arithmetic), whose schema, `Expressions.ISOIEC11404.Expressions.modulo_256`, spells it as a schema's name can, a
 * dotted identifier.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
      OfBoolean: S.OfObject, OfInteger: S.OfObject, OfModulo: S.OfObject, OfBitstring: S.OfObject, OfOctet: S.OfObject,
      OfOctetstring: S.OfObject, OfState: S.OfObject, OfPacked: S.OfObject,
      boolean: S.OfAny, integer: S.OfAny, octetstring: S.OfAny, octet: S.OfAny, modulo_256: S.OfAny,
    })
    .spec([
      // --- Its dialect: the singleton `Expressions.ISOIEC11404.Expressions`, a branch of the framework's kind union ---
      (_: any) => _.Dialect.name("Expressions.ISOIEC11404.Expressions.Dialect").ref(true).singleton(
        "Expressions.ISOIEC11404.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("isoiec11404").schema([_.Dialect])]),

      // --- Its kinds of domain, each the standard's parameters, then what follows from them ---
      (_: any) => _.OfBoolean.name("Expressions.ISOIEC11404.Expressions.OfBoolean").properties({ ordered: S.OfBool }),
      (_: any) => _.OfInteger.name("Expressions.ISOIEC11404.Expressions.OfInteger").properties({
        width: S.OfInt, signed: S.OfBool, overflow: S.OfStr,
        least: S.OfInt, greatest: S.OfInt, ordered: S.OfBool }), // inferred
      (_: any) => _.OfModulo.name("Expressions.ISOIEC11404.Expressions.OfModulo").properties({
        modulus: S.OfInt, least: S.OfInt, greatest: S.OfInt, ordered: S.OfBool }), // then inferred
      (_: any) => _.OfBitstring.name("Expressions.ISOIEC11404.Expressions.OfBitstring").properties({
        width: S.OfInt, ordered: S.OfBool }),
      (_: any) => _.OfOctet.name("Expressions.ISOIEC11404.Expressions.OfOctet").properties({ ordered: S.OfBool }),
      (_: any) => _.OfOctetstring.name("Expressions.ISOIEC11404.Expressions.OfOctetstring").properties({
        width: S.OfInt, ordered: S.OfBool }),
      (_: any) => _.OfState.name("Expressions.ISOIEC11404.Expressions.OfState").properties({
        members: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfStr])), ordered: S.OfBool }),
      (_: any) => _.OfPacked.name("Expressions.ISOIEC11404.Expressions.OfPacked").properties({
        codes: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfInt])), ordered: S.OfBool }),
      (_: any) => _.DomainKind.name("Expressions.ISOIEC11404.Expressions.DomainKind").branches([
        (t: any) => t.name("boolean").schema([_.OfBoolean]),
        (t: any) => t.name("integer").schema([_.OfInteger]),
        (t: any) => t.name("modulo").schema([_.OfModulo]),
        (t: any) => t.name("bitstring").schema([_.OfBitstring]),
        (t: any) => t.name("octet").schema([_.OfOctet]),
        (t: any) => t.name("octetstring").schema([_.OfOctetstring]),
        (t: any) => t.name("state").schema([_.OfState]),
        (t: any) => t.name("packed").schema([_.OfPacked]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("isoiec11404").schema([_.DomainKind])]),
      // a packed domain's state domain and representation are domains, which a value cannot hold: `Packs` links them
      (_: any) => _.Packs.name("Expressions.ISOIEC11404.Expressions.Packs").links([
        (t: any) => t.name("packed"), (t: any) => t.name("domain").schema([_.Domain]),
        (t: any) => t.name("representation").schema([_.Domain])]).uniques([["packed"]]),
      (_: any) => _.Domain.name("Expressions.Framework.Domain").adjacencies({
        packs: (a: any) => a.relation([_.Packs]).me("packed") }),

      // --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.boolean.name("Expressions.ISOIEC11404.Expressions.boolean").schemas([S.OfBool]),
      (_: any) => _.integer.name("Expressions.ISOIEC11404.Expressions.integer").schemas([S.OfInt]),
      (_: any) => _.octetstring.name("Expressions.ISOIEC11404.Expressions.octetstring").schemas([S.OfBytes]),
      (_: any) => _.octet.name("Expressions.ISOIEC11404.Expressions.octet").schemas([S.OfInt]),
      (_: any) => _.modulo_256.name("Expressions.ISOIEC11404.Expressions.modulo_256").schemas([S.OfInt]),
    ])]))]);
}

/** ISO/IEC 11404's dialect as data: the singleton `Expressions.ISOIEC11404.Expressions` owning its domains by name
 * (`domains`, through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and
 * related to its schema (`Expressions.ISOIEC11404.Expressions.octet`) by `Expressions.Framework.HasDomain`. And the
 * edition of the standard it covers, by its designation (`standards`, through `Expressions.Framework.Covers`), its
 * formal reference's parts held apart. Run after `install`, in a transaction of its own; run again, it writes nothing.
 * Its frame binds the dialect (`dialect`), its edition (`standard`) and each domain by its name, spelled as its
 * schema's is (`modulo(256)` as `modulo_256`): `store.transaction(ISOIEC11404.define)[0].get("octet")`. */
export function define(txn: any): any {
  const [ISOIEC11404, Domain, Standard] = [txn.Expressions.ISOIEC11404.Expressions, txn.Expressions.Framework.Domain,
    txn.Expressions.Framework.Standard];
  return txn.uid("mbse.Expressions.ISOIEC11404.Expressions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      dialect: ISOIEC11404.Dialect, standard: Standard,
      boolean: Domain, integer: Domain, octetstring: Domain, octet: Domain, modulo_256: Domain,
    })
    .spec([
      (_: any) => _.dialect.domains({
        boolean: (e: any) => e.domain(_.boolean), integer: (e: any) => e.domain(_.integer),
        octetstring: (e: any) => e.domain(_.octetstring), octet: (e: any) => e.domain(_.octet),
        "modulo(256)": (e: any) => e.domain(_.modulo_256),
      }),
      (_: any) => _.dialect.standards({ "ISO/IEC 11404:2007": (e: any) => e.standard(_.standard) }),
      (_: any) => _.standard.bodies(["org.iso", "ch.iec"]).number("11404").revision((r: any) => r.year(2007n)),
      (_: any) => _.boolean.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.boolean(
        (d: any) => d.ordered(false)))))).schema([ISOIEC11404.boolean]),
      (_: any) => _.integer.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.signed(true).overflow("raise").ordered(true)))))).schema([ISOIEC11404.integer]), // unbounded
      (_: any) => _.octetstring.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.octetstring(
        (d: any) => d.ordered(true)))))).schema([ISOIEC11404.octetstring]),
      (_: any) => _.octet.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.octet(
        (d: any) => d.ordered(true)))))).schema([ISOIEC11404.octet]), // codes: no arithmetic
      (_: any) => _.modulo_256.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(256n).least(0n).greatest(255n).ordered(true)))))).schema([ISOIEC11404.modulo_256]),
    ])]))]);
}
