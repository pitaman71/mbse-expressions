"""The ISO/IEC 11404 dialect: the kinds of domain of ISO/IEC 11404:2007, the language-independent datatypes, and the
domains it defines. It has no terms yet: its operations are CAP-180's to model (see mbse-basis
[CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](mbse:mbse-basis/docs/capabilities/CAP-180.md)
and [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains)).

Its kinds of domain, the branches of its union `Expressions.ISOIEC11404.Expressions.DomainKind`, which `install` adds
to the framework's `Expressions.Framework.DomainKind` as the branch `isoiec11404`, each with the standard's parameters
and the properties that follow from them (inferred; populated by hand until constraint resolution computes them):

- `bool` (`OfBool`): true and false; `ordered`.
- `integer` (`OfInteger`): two's complement integers of a `width` in bits, or unbounded, `signed` or not, whose
  `overflow` wraps, saturates or raises; inferred `least` and `greatest`, absent where unbounded, and `ordered`.
- `bits` (`OfBits`): an unformatted pattern of a `width` in bits; `ordered`.
- `bytes` (`OfBytes`): an octet string of a `width` in bytes or of any length; `ordered`.
- `enum` (`OfEnum`): one of its `members`, by name; `ordered`.
- `packed` (`OfPacked`): an enum represented in a fixed-width integer or bits, member `i` by `codes[i]`; its enum and
  its representation are domains, which a value cannot hold, so `Expressions.ISOIEC11404.Expressions.Packs` links them
  (the domain's extension adjacency `packs`); `ordered`.

Its dialect is the singleton `Expressions.ISOIEC11404.Expressions`, of its schema
`Expressions.ISOIEC11404.Expressions.Dialect`, the branch `isoiec11404` of `Expressions.Framework.Dialect`. `define`
writes its domains, owned by name, each related to its schema, an `OfAny` of the scalar it narrows: `boolean`, `integer`
(signed, unbounded, raising on overflow), `octetstring` and `uint8` (8 bits, unsigned, wrapping).
"""

from __future__ import annotations

from typing import Any

__all__ = ["install", "define", "STANDARDS"]

STANDARDS = ("ISO/IEC 11404:2007",)
"""The standards this dialect implements, by designation."""


def install(txn: Any) -> Any:
    """ISO/IEC 11404's kinds of domain, its union of them added to the framework's as the branch `isoiec11404`, `Packs`
    and the domain's extension adjacency `packs`; its domains' schemas; and its dialect's schema, whose singleton is
    `Expressions.ISOIEC11404.Expressions`. Run after `Framework.install`, in a transaction of its own; run again, it
    writes nothing. Its domains `define` writes after it."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.ISOIEC11404.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject,  # the framework's kind union of dialects, and its own
                  "Kinds": S.OfUnion, "DomainKind": S.OfUnion, "Domain": S.OfObject, "Packs": S.OfRelation,  # Kinds: the framework's
                  "OfBool": S.OfObject, "OfInteger": S.OfObject, "OfBits": S.OfObject, "OfBytes": S.OfObject,
                  "OfEnum": S.OfObject, "OfPacked": S.OfObject,
                  "boolean": S.OfAny, "integer": S.OfAny, "octetstring": S.OfAny, "uint8": S.OfAny})
        .spec([
            # --- Its dialect: the singleton `Expressions.ISOIEC11404.Expressions`, a branch of the framework's kind union ---
            lambda _: _.Dialect.name("Expressions.ISOIEC11404.Expressions.Dialect").ref(True).singleton(
                "Expressions.ISOIEC11404.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "uses": lambda a: a.relation([Framework.Uses]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("isoiec11404").schema([_.Dialect])]),

            # --- Its kinds of domain, each the standard's parameters, then what follows from them ---
            lambda _: _.OfBool.name("Expressions.ISOIEC11404.Expressions.OfBool").properties({"ordered": S.OfBool}),
            lambda _: _.OfInteger.name("Expressions.ISOIEC11404.Expressions.OfInteger").properties({
                "width": S.OfInt, "signed": S.OfBool, "overflow": S.OfStr,
                "least": S.OfInt, "greatest": S.OfInt, "ordered": S.OfBool}),  # inferred
            lambda _: _.OfBits.name("Expressions.ISOIEC11404.Expressions.OfBits").properties({
                "width": S.OfInt, "ordered": S.OfBool}),
            lambda _: _.OfBytes.name("Expressions.ISOIEC11404.Expressions.OfBytes").properties({
                "width": S.OfInt, "ordered": S.OfBool}),
            lambda _: _.OfEnum.name("Expressions.ISOIEC11404.Expressions.OfEnum").properties({
                "members": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfStr])), "ordered": S.OfBool}),
            lambda _: _.OfPacked.name("Expressions.ISOIEC11404.Expressions.OfPacked").properties({
                "codes": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfInt])), "ordered": S.OfBool}),
            lambda _: _.DomainKind.name("Expressions.ISOIEC11404.Expressions.DomainKind").branches([
                lambda t: t.name("bool").schema([_.OfBool]),
                lambda t: t.name("integer").schema([_.OfInteger]),
                lambda t: t.name("bits").schema([_.OfBits]),
                lambda t: t.name("bytes").schema([_.OfBytes]),
                lambda t: t.name("enum").schema([_.OfEnum]),
                lambda t: t.name("packed").schema([_.OfPacked]),
            ]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("isoiec11404").schema([_.DomainKind])]),
            # a packed domain's enum and representation are domains, which a value cannot hold: `Packs` links them
            lambda _: _.Packs.name("Expressions.ISOIEC11404.Expressions.Packs").links([
                lambda t: t.name("packed"), lambda t: t.name("domain").schema([_.Domain]),
                lambda t: t.name("representation").schema([_.Domain])]).uniques([["packed"]]),
            lambda _: _.Domain.name("Expressions.Framework.Domain").adjacencies({
                "packs": lambda a: a.relation([_.Packs]).me("packed")}),

            # --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
            lambda _: _.boolean.name("Expressions.ISOIEC11404.Expressions.boolean").schemas([S.OfBool]),
            lambda _: _.integer.name("Expressions.ISOIEC11404.Expressions.integer").schemas([S.OfInt]),
            lambda _: _.octetstring.name("Expressions.ISOIEC11404.Expressions.octetstring").schemas([S.OfBytes]),
            lambda _: _.uint8.name("Expressions.ISOIEC11404.Expressions.uint8").schemas([S.OfInt]),
        ])]))])


def define(txn: Any) -> Any:
    """ISO/IEC 11404's dialect as data: the singleton `Expressions.ISOIEC11404.Expressions` owning its domains by name
    (`domains`, through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and
    related to its schema (`Expressions.ISOIEC11404.Expressions.uint8`) by `Expressions.Framework.HasDomain`. Run after
    `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and
    each domain by its name: `store.transaction(ISOIEC11404.define)[0]["uint8"]`."""
    ISOIEC11404, Domain = txn.Expressions.ISOIEC11404.Expressions, txn.Expressions.Framework.Domain
    return txn.uid("mbse.Expressions.ISOIEC11404.Expressions.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": ISOIEC11404.Dialect, "boolean": Domain, "integer": Domain, "octetstring": Domain,
                  "uint8": Domain})
        .spec([
            lambda _: _.dialect.domains({
                "boolean": lambda e: e.domain(_.boolean), "integer": lambda e: e.domain(_.integer),
                "octetstring": lambda e: e.domain(_.octetstring), "uint8": lambda e: e.domain(_.uint8),
            }),
            lambda _: _.boolean.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.bool(
                lambda d: d.ordered(False)))))).schema([ISOIEC11404.boolean]),
            lambda _: _.integer.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.signed(True).overflow("raise").ordered(True)))))).schema([ISOIEC11404.integer]),  # unbounded
            lambda _: _.octetstring.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.bytes(
                lambda d: d.ordered(True)))))).schema([ISOIEC11404.octetstring]),
            lambda _: _.uint8.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(8).signed(False).overflow("wrap").least(0).greatest(255).ordered(True)))))).schema([
                ISOIEC11404.uint8]),
        ])]))])
