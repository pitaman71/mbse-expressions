"""Expressions of the SystemVerilog Patterns dialect: the patterns `matches` compares a value with, binding its variables (IEEE 1800 12.6), as mbse-programs has them.

It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6: "if the standard says it's a
sublanguage then it's definitely at least a separate dialect"), named `SystemVerilog Patterns` (`Terms.dialect_name`), its
tag `systemverilog_patterns`. Its terms are values of its `Term`, `Expressions.SystemVerilog.Patterns.Term`, the branch
`systemverilog_patterns` of `Expressions.Framework.Term`; a `matches`' pattern holds it, a pattern or an expression (mbse-programs' `Pattern | Expression`), so it
lists, besides its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which that dialect's
install adds ("(b)").

Its own kinds (`variablepattern`, `wildcardpattern`, `taggedpattern`, `structurepattern`, `patternmember` and
`parenthesizedpattern`, the stage 6 design's) are added to its `install`, its `Term` and `DIALECT` (`_kinds`), each with the edition it
arrived in (`SINCE`), and printed by its `Text` module. The editions it covers are data, which `define` writes: IEEE
1800's, IEEE Std 1800-2005 to 1800-2023 (`Expressions.EDITIONS` from the fourth), each with its own kinds it has.
`DIALECT` reads its kinds and the five other dialects' terms. Its terms are written through the builders (mbse-basis
[PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019))."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Expressions as X

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "bound_names"]

TAGS: tuple[str, ...] = ()
"""Its own kinds, in its `Term`'s order after `Expressions`' branches."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
completeness data (`grammars/systemverilog-slang.json`) names them."""

SINCE: dict[str, int] = {}
"""The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`; a kind
not listed is in every edition of IEEE 1800 (its first, 3)."""


def install(txn: Any) -> Any:
    """SystemVerilog Patterns's union of its kinds, added to the framework's terms as the branch `systemverilog_patterns`,
    its own kinds, and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Patterns`: run after
    `Framework.install`, in a transaction of its own, before or after the other SystemVerilog dialects' installs; run
    again, it writes nothing. `Expressions`' install adds that dialect's branches to its `Term`, created here where it
    has not run. Its holder, `Expressions.SystemVerilog.Patterns.Expression`, refines
    `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.SystemVerilog.Patterns/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.SystemVerilog.Patterns`, a branch of the framework's kind union of
            # dialects
            lambda _: _.Dialect.name("Expressions.SystemVerilog.Patterns.Dialect").ref(True).singleton("Expressions.SystemVerilog.Patterns").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("systemverilog_patterns").schema([_.Dialect])]),
            # its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
            lambda _: _.Term.name("Expressions.SystemVerilog.Patterns.Term"),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.SystemVerilog.Patterns.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog_patterns").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """SystemVerilog Patterns's dialect as data: the singleton `Expressions.SystemVerilog.Patterns` owning the editions it
    covers, by designation (`standards`), IEEE Std 1800-2005 to 2023, each with its formal reference's parts, its
    common name and its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it
    writes nothing. Its frame binds the dialect (`dialect`) and each edition by its common name spelled as an
    identifier (`SystemVerilog_2023`)."""
    OWN, Standard = txn.Expressions.SystemVerilog.Patterns, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}
    kinds = X.editions(every, SINCE, 3)
    return txn.uid("mbse.Expressions.SystemVerilog.Patterns.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, "SystemVerilog_2005": Standard, "SystemVerilog_2009": Standard,
                  "SystemVerilog_2012": Standard, "SystemVerilog_2017": Standard, "SystemVerilog_2023": Standard})
        .spec([
            lambda _: _.dialect.standards({
                "IEEE Std 1800-2005": lambda e: e.standard(_.SystemVerilog_2005),
                "IEEE Std 1800-2009": lambda e: e.standard(_.SystemVerilog_2009),
                "IEEE Std 1800-2012": lambda e: e.standard(_.SystemVerilog_2012),
                "IEEE Std 1800-2017": lambda e: e.standard(_.SystemVerilog_2017),
                "IEEE Std 1800-2023": lambda e: e.standard(_.SystemVerilog_2023)}),
            lambda _: _.SystemVerilog_2005.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2005)).names(
                ["SystemVerilog-2005"]).kinds(kinds[0]),
            lambda _: _.SystemVerilog_2009.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2009)).names(
                ["SystemVerilog-2009"]).kinds(kinds[1]),
            lambda _: _.SystemVerilog_2012.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2012)).names(
                ["SystemVerilog-2012"]).kinds(kinds[2]),
            lambda _: _.SystemVerilog_2017.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2017)).names(
                ["SystemVerilog-2017"]).kinds(kinds[3]),
            lambda _: _.SystemVerilog_2023.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2023)).names(
                ["SystemVerilog-2023"]).kinds(kinds[4]),
        ])]))])


def bound_names(pattern: Any) -> frozenset[str]:
    """The names a pattern binds, its variables (`.name`), which a `matches` binds in its conditional's consequence and
    the conditions after it (12.6.2): none, of a constant pattern, an expression."""
    return frozenset()


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds."""
    return {}


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms its positions hold, imported when first needed."""
    from ..Assertions import Expressions as Assertions
    from ..Constraints import Expressions as Constraints
    from ..Preprocessor import Expressions as Preprocessor
    from ..Types import Expressions as Types
    return X.DIALECT, Types.DIALECT, Assertions.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT


DIALECT = F.Dialect("SystemVerilog.Patterns", _kinds(), domain_of=X._untyped, literal=X._native, reads=_reads)
"""The SystemVerilog Patterns dialect: its kinds, as the framework reads them, and the terms of its family's dialects."""
