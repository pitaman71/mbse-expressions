"""Expressions of the C Preprocessor dialect: the preprocessing directives C and C++ share, each standard defining its own
(ISO/IEC 9899, 6.10; ISO/IEC 14882, [cpp]), the C family's dialect that both read, a skeleton the retrofit's core
writes, its kinds to come (the dialects proposal, Retrofit's design, The work, partitioned). It is a dialect of the C
family, named `C Preprocessor` (`Terms.dialect_name`), its tag `c_preprocessor`. Its terms are values of its `Term`,
`Expressions.C.Preprocessor.Term`, the branch `c_preprocessor` of `Expressions.Framework.Term`, which holds invalid
syntax alone until its kinds are built; its holder, `Expressions.C.Preprocessor.Expression`, refines
`Expressions.Framework.Expression`, its `root` narrowed to its `Term`, and so inherits the adjacency `abi`. `define`
writes its dialect's data, none yet. `DIALECT` reads its own kinds and the terms of the dialects its positions are to
hold, `C`, `C Types` (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis [CAP-098: dialects over one
framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided))."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Expressions as _family

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS"]

TAGS: tuple[str, ...] = ()
"""Its own kinds, in its `Term`'s order: none yet."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none yet."""

SINCE: dict[str, int] = {}
"""The edition each of its kinds arrived in: none yet."""


def install(txn: Any) -> Any:
    """C Preprocessor's union of its kinds, invalid syntax alone until its kinds are built, added to the framework's terms
    as the branch `c_preprocessor`, and its dialect's schema, whose singleton is `Expressions.C.Preprocessor`: run after
    `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it writes
    nothing. Its holder, `Expressions.C.Preprocessor.Expression`, refines `Expressions.Framework.Expression`, its `root`
    narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.C.Preprocessor/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.C.Preprocessor`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.C.Preprocessor.Dialect").ref(True).singleton("Expressions.C.Preprocessor").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("c_preprocessor").schema([_.Dialect])]),
            # its union of its kinds: invalid syntax alone, until its kinds are built
            lambda _: _.Term.name("Expressions.C.Preprocessor.Term").branches([
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.C.Preprocessor.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("c_preprocessor").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """C Preprocessor's dialect as data: the singleton `Expressions.C.Preprocessor`, none of its data yet (the editions it
    covers are to come with its kinds). Run after `install`, in a transaction of its own; run again, it writes nothing.
    Its frame binds the dialect (`dialect`)."""
    OWN = txn.Expressions.C.Preprocessor
    return txn.uid("mbse.Expressions.C.Preprocessor.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect})
        .spec([lambda _: _.dialect])]))])


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects whose terms its positions are to hold, imported when first needed."""
    from ..Expressions import Expressions as C
    from ..Types import Expressions as CTypes
    return C.DIALECT, CTypes.DIALECT


DIALECT = F.Dialect("C.Preprocessor", {}, domain_of=_family.untyped, reads=_reads)
"""The C Preprocessor dialect: its kinds, as the framework reads them (invalid syntax alone, yet), and its family's other
dialects' terms."""
