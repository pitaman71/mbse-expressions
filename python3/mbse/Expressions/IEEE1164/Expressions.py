"""The IEEE 1164 dialect: the kind of domain of IEEE Std 1164-1993, VHDL's nine-valued logic, and the domain it
defines. It has no terms. See mbse-basis
[CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).

Its kind of domain, the branch of its union `Expressions.IEEE1164.Expressions.DomainKind`, which `install` adds to the
framework's `Expressions.Framework.DomainKind` as the branch `ieee1164`:

- `ieee1164` (`OfIeee1164`): one state a value (`std_logic`), or, of a `width`, that many states, the most significant
  first (`std_logic_vector`); inferred (populated by hand until constraint resolution computes it) `ordered`.

Its dialect is the singleton `Expressions.IEEE1164.Expressions`, of its schema
`Expressions.IEEE1164.Expressions.Dialect`, the branch `ieee1164` of `Expressions.Framework.Dialect`. `define` writes
its domain `std_logic`, owned by name and related to its schema, an `OfAny` of strings.
"""

from __future__ import annotations

from typing import Any

__all__ = ["install", "define", "STANDARDS"]

STANDARDS = ("IEEE Std 1164-1993",)
"""The standards this dialect implements, by designation."""


def install(txn: Any) -> Any:
    """IEEE 1164's kind of domain, its union of kinds added to the framework's as the branch `ieee1164`; its domain's
    schema; and its dialect's schema, whose singleton is `Expressions.IEEE1164.Expressions`. Run after
    `Framework.install`, in a transaction of its own; run again, it writes nothing. Its domain `define` writes after
    it."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.IEEE1164.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject,  # the framework's kind union of dialects, and its own
                  "Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfIeee1164": S.OfObject,  # Kinds: the framework's
                  "std_logic": S.OfAny})
        .spec([
            # --- Its dialect: the singleton `Expressions.IEEE1164.Expressions`, a branch of the framework's kind union ---
            lambda _: _.Dialect.name("Expressions.IEEE1164.Expressions.Dialect").ref(True).singleton(
                "Expressions.IEEE1164.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("ieee1164").schema([_.Dialect])]),

            # --- Its kind of domain: the standard's parameters, then what follows from them ---
            lambda _: _.OfIeee1164.name("Expressions.IEEE1164.Expressions.OfIeee1164").properties({
                "width": S.OfInt, "ordered": S.OfBool}),  # ordered: inferred
            lambda _: _.DomainKind.name("Expressions.IEEE1164.Expressions.DomainKind").branches([
                lambda t: t.name("ieee1164").schema([_.OfIeee1164])]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("ieee1164").schema([_.DomainKind])]),

            # --- Its domain's schema, an OfAny of the scalar it narrows, which `define` relates to its domain ---
            lambda _: _.std_logic.name("Expressions.IEEE1164.Expressions.std_logic").schemas([S.OfStr]),
        ])]))])


def define(txn: Any) -> Any:
    """IEEE 1164's dialect as data: the singleton `Expressions.IEEE1164.Expressions` owning its domain by name
    (`domains`, through `Expressions.Framework.Defines`), with its inferred properties, and related to its schema
    (`Expressions.IEEE1164.Expressions.std_logic`) by `Expressions.Framework.HasDomain`. Run after `install`, in a
    transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and its domain by its
    name: `store.transaction(IEEE1164.define)[0]["std_logic"]`."""
    IEEE1164, Domain = txn.Expressions.IEEE1164.Expressions, txn.Expressions.Framework.Domain
    return txn.uid("mbse.Expressions.IEEE1164.Expressions.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": IEEE1164.Dialect, "std_logic": Domain})
        .spec([
            lambda _: _.dialect.domains({"std_logic": lambda e: e.domain(_.std_logic)}),
            lambda _: _.std_logic.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee1164(lambda v: v.ieee1164(
                lambda d: d.ordered(False)))))).schema([IEEE1164.std_logic]),
        ])]))])
