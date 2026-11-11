"""Expressions of the TypeScript Types dialect: TypeScript's types, typescript-estree's type nodes, a skeleton the
retrofit's core writes, its kinds to come (the dialects proposal, Retrofit's design, The work, partitioned). It is a
dialect of the TypeScript family, named `TypeScript Types` (`Terms.dialect_name`), its tag `typescript_types`. Its terms
are values of its `Term`, `Expressions.TypeScript.Types.Term`, the branch `typescript_types` of
`Expressions.Framework.Term`, which holds invalid syntax alone until its kinds are built; its holder,
`Expressions.TypeScript.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
`Term`, and so inherits the adjacency `abi`. `define` writes its dialect's data, none yet. `DIALECT` reads its own kinds
and the terms of the dialects its positions are to hold, `TypeScript5`, `TypeScript Patterns` (`reads`); none of it is a
reason to reinstate `Uses` (mbse-basis [CAP-098: dialects over one
framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided))."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..TypeScript5 import Domains as _family

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS"]

TAGS: tuple[str, ...] = ()
"""Its own kinds, in its `Term`'s order: none yet."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none yet."""

SINCE: dict[str, int] = {}
"""The edition each of its kinds arrived in: none yet."""


def install(txn: Any) -> Any:
    """TypeScript Types' union of its kinds, invalid syntax alone until its kinds are built, added to the framework's terms
    as the branch `typescript_types`, and its dialect's schema, whose singleton is `Expressions.TypeScript.Types`: run
    after `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it
    writes nothing. Its holder, `Expressions.TypeScript.Types.Expression`, refines `Expressions.Framework.Expression`,
    its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.TypeScript.Types/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.TypeScript.Types`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.TypeScript.Types.Dialect").ref(True).singleton("Expressions.TypeScript.Types").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("typescript_types").schema([_.Dialect])]),
            # its union of its kinds: invalid syntax alone, until its kinds are built
            lambda _: _.Term.name("Expressions.TypeScript.Types.Term").branches([
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.TypeScript.Types.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("typescript_types").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """TypeScript Types' dialect as data: the singleton `Expressions.TypeScript.Types`, none of its data yet (the editions
    it covers are to come with its kinds). Run after `install`, in a transaction of its own; run again, it writes
    nothing. Its frame binds the dialect (`dialect`)."""
    OWN = txn.Expressions.TypeScript.Types
    return txn.uid("mbse.Expressions.TypeScript.Types.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect})
        .spec([lambda _: _.dialect])]))])


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects whose terms its positions are to hold, imported when first needed."""
    from ..TypeScript5 import Expressions as TypeScript5
    from ..Patterns import Expressions as TypeScriptPatterns
    return TypeScript5.DIALECT, TypeScriptPatterns.DIALECT


DIALECT = F.Dialect("TypeScript.Types", {}, domain_of=_family.of, reads=_reads)
"""The TypeScript Types dialect: its kinds, as the framework reads them (invalid syntax alone, yet), and its family's other
dialects' terms."""
