"""The Unicode dialect: the kind of domain of The Unicode Standard, sequences of code points, and the domain it
defines. It has no terms. See mbse-basis
[CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).

Its kind of domain, the branch of its union `Expressions.Unicode.Expressions.DomainKind`, which `install` adds to the
framework's `Expressions.Framework.DomainKind` as the branch `unicode`:

- `unicode` (`OfUnicode`): sequences of code points; inferred (populated by hand until constraint resolution computes
  it) `ordered`.

Its dialect is the singleton `Expressions.Unicode.Expressions`, of its schema `Expressions.Unicode.Expressions.Dialect`,
the branch `unicode` of `Expressions.Framework.Dialect`. `define` writes its domain `string`, owned by name and related
to its schema, an `OfAny` of strings.
"""

from __future__ import annotations

from typing import Any

__all__ = ["install", "define", "STANDARDS"]

STANDARDS = ("The Unicode Standard",)
"""The standards this dialect implements, by designation."""


def install(txn: Any) -> Any:
    """Unicode's kind of domain, its union of kinds added to the framework's as the branch `unicode`; its domain's
    schema; and its dialect's schema, whose singleton is `Expressions.Unicode.Expressions`. Run after
    `Framework.install`, in a transaction of its own; run again, it writes nothing. Its domain `define` writes after
    it."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.Unicode.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject,  # the framework's kind union of dialects, and its own
                  "Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfUnicode": S.OfObject,  # Kinds: the framework's
                  "string": S.OfAny})
        .spec([
            # --- Its dialect: the singleton `Expressions.Unicode.Expressions`, a branch of the framework's kind union ---
            lambda _: _.Dialect.name("Expressions.Unicode.Expressions.Dialect").ref(True).singleton(
                "Expressions.Unicode.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("unicode").schema([_.Dialect])]),

            # --- Its kind of domain, and what follows from it ---
            lambda _: _.OfUnicode.name("Expressions.Unicode.Expressions.OfUnicode").properties({
                "ordered": S.OfBool}),  # inferred
            lambda _: _.DomainKind.name("Expressions.Unicode.Expressions.DomainKind").branches([
                lambda t: t.name("unicode").schema([_.OfUnicode])]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("unicode").schema([_.DomainKind])]),

            # --- Its domain's schema, an OfAny of the scalar it narrows, which `define` relates to its domain ---
            lambda _: _.string.name("Expressions.Unicode.Expressions.string").schemas([S.OfStr]),
        ])]))])


def define(txn: Any) -> Any:
    """Unicode's dialect as data: the singleton `Expressions.Unicode.Expressions` owning its domain by name (`domains`,
    through `Expressions.Framework.Defines`), with its inferred properties, and related to its schema
    (`Expressions.Unicode.Expressions.string`) by `Expressions.Framework.HasDomain`. Run after `install`, in a
    transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and its domain by its
    name: `store.transaction(Unicode.define)[0]["string"]`."""
    Unicode, Domain = txn.Expressions.Unicode.Expressions, txn.Expressions.Framework.Domain
    return txn.uid("mbse.Expressions.Unicode.Expressions.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": Unicode.Dialect, "string": Domain})
        .spec([
            lambda _: _.dialect.domains({"string": lambda e: e.domain(_.string)}),
            lambda _: _.string.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.unicode(lambda v: v.unicode(
                lambda d: d.ordered(True)))))).schema([Unicode.string]),
        ])]))])
