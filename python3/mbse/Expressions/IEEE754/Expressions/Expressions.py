"""The IEEE 754 dialect: the kind of domain of IEEE Std 754-2019, floating-point arithmetic, and the domains it defines.
It has no terms. See mbse-basis
[CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).

Its kind of domain, the branch of its union `Expressions.IEEE754.Expressions.DomainKind`, which `install` adds to the
framework's `Expressions.Framework.DomainKind` as the branch `ieee754`:

- `ieee754` (`OfIeee754`): an interchange `format`, with a `rounding`-direction attribute; inferred (populated by hand
  until constraint resolution computes them) the format's `width` in bits and its parameters, its `radix`, `precision`
  (in digits) and `emax`, and `ordered`. A format IEEE 754 does not name (x87's extended format, bfloat16) is a domain
  of the kind with no `format`, given by its `width` and parameters, which `Ieee754` computes in.

Its dialect is the singleton `Expressions.IEEE754.Expressions`, of its schema `Expressions.IEEE754.Expressions.Dialect`,
the branch `ieee754` of `Expressions.Framework.Dialect`. `define` writes its domains, owned by name, each related to its
schema, an `OfAny` of floats: `binary64` and `binary32`, each rounding ties to even.
"""

from __future__ import annotations

from typing import Any

__all__ = ["install", "define"]

def install(txn: Any) -> Any:
    """IEEE 754's kind of domain, its union of kinds added to the framework's as the branch `ieee754`; its domains'
    schemas; and its dialect's schema, whose singleton is `Expressions.IEEE754.Expressions`. Run after
    `Framework.install`, in a transaction of its own; run again, it writes nothing. Its domains `define` writes after
    it."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.IEEE754.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject,  # the framework's kind union of dialects, and its own
                  "Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfIeee754": S.OfObject,  # Kinds: the framework's
                  "binary64": S.OfAny, "binary32": S.OfAny})
        .spec([
            # --- Its dialect: the singleton `Expressions.IEEE754.Expressions`, a branch of the framework's kind union ---
            lambda _: _.Dialect.name("Expressions.IEEE754.Expressions.Dialect").ref(True).singleton(
                "Expressions.IEEE754.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("ieee754").schema([_.Dialect])]),

            # --- Its kind of domain: the standard's parameters, then what follows from them ---
            lambda _: _.OfIeee754.name("Expressions.IEEE754.Expressions.OfIeee754").properties({
                "format": S.OfStr, "rounding": S.OfStr,
                "width": S.OfInt, "radix": S.OfInt, "precision": S.OfInt, "emax": S.OfInt, "ordered": S.OfBool}),  # inferred
            lambda _: _.DomainKind.name("Expressions.IEEE754.Expressions.DomainKind").branches([
                lambda t: t.name("ieee754").schema([_.OfIeee754])]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("ieee754").schema([_.DomainKind])]),

            # --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
            lambda _: _.binary64.name("Expressions.IEEE754.Expressions.binary64").schemas([S.OfFloat]),
            lambda _: _.binary32.name("Expressions.IEEE754.Expressions.binary32").schemas([S.OfFloat]),
        ])]))])


def define(txn: Any) -> Any:
    """IEEE 754's dialect as data: the singleton `Expressions.IEEE754.Expressions` owning its domains by name
    (`domains`, through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and
    related to its schema (`Expressions.IEEE754.Expressions.binary32`) by `Expressions.Framework.HasDomain`. And the
    edition of the standard it covers, by its designation (`standards`, through `Expressions.Framework.Covers`), its
    formal reference's parts held apart. Run after `install`, in a transaction of its own; run again, it writes nothing.
    Its frame binds the dialect (`dialect`), its edition (`standard`) and each domain by its name:
    `store.transaction(IEEE754.define)[0]["binary32"]`."""
    IEEE754, Domain = txn.Expressions.IEEE754.Expressions, txn.Expressions.Framework.Domain
    Standard = txn.Expressions.Framework.Standard
    return txn.uid("mbse.Expressions.IEEE754.Expressions.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": IEEE754.Dialect, "standard": Standard, "binary64": Domain, "binary32": Domain})
        .spec([
            lambda _: _.dialect.domains({
                "binary64": lambda e: e.domain(_.binary64), "binary32": lambda e: e.domain(_.binary32),
            }),
            lambda _: _.dialect.standards({"IEEE Std 754-2019": lambda e: e.standard(_.standard)}),
            lambda _: _.standard.bodies(["org.ieee"]).number("754").revision(lambda r: r.year(2019)),
            lambda _: _.binary64.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64).radix(2).precision(53).emax(1023).ordered(
                    True)))))).schema([IEEE754.binary64]),
            lambda _: _.binary32.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary32").rounding("roundTiesToEven").width(32).radix(2).precision(24).emax(127).ordered(
                    True)))))).schema([IEEE754.binary32]),
        ])]))])
