"""Expressions of the SystemVerilog Assertions dialect: SystemVerilog Assertions' sequences and properties (IEEE 1800
16.7 to 16.12), as mbse-programs has them.

It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6: "if the standard says it's a
sublanguage then it's definitely at least a separate dialect"), named `SystemVerilog Assertions` (`Terms.dialect_name`),
its tag `systemverilog_assertions`. Its terms are values of its `Term`, `Expressions.SystemVerilog.Assertions.Term`, the
branch `systemverilog_assertions` of `Expressions.Framework.Term`; a call's arguments, a named connection's value and
every operand of a sequence or a property hold it, a property, a sequence or an expression (mbse-programs' `Property |
Expression`), so it lists, besides its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which
that dialect's install adds ("(b)"), the Preprocessor's `macrousage` and the Constraints' `distexpression` (16.7's
`expression_or_dist`), which their installs add. Its own kinds are mbse-programs' sequences and properties
(`mbse:mbse-programs/python3/mbse/Programs/Verilog/Syntax.py`), with mbse-programs' names, lowercased as branch tags, and
its properties in source order, each a value object `Expressions.SystemVerilog.Assertions.<Kind>`:

- Sequences (16.7 to 16.10): `delaysequence` (`a ##1 b ##[1:3] c`, its steps each a `delaystep`),
  `repetitionsequence` (`a[*2]`, `a[->1:3]`, `a[=2]`), `binarysequence` (`and`, `or`, `intersect`, `within`,
  `throughout`), `parenthesizedsequence` (`(s, x = a)`, with its match items), `firstmatchsequence` and
  `clockedsequence` (`@(posedge clk) s`);
- Properties (16.12): `implicationproperty` (`|->`, `|=>`, `#-#`, `#=#`), `binaryproperty` (`and`, `or`, `iff`,
  `implies`, `until`, `s_until`, `until_with`, `s_until_with`), `unaryproperty` (`not`, `nexttime`, `always`,
  `eventually` and their strong forms, with a number of ticks or a range), `strengthproperty` (`strong(s)`,
  `weak(s)`), `abortproperty` (`accept_on`, `reject_on` and their synchronous forms), `conditionalproperty`,
  `caseproperty` (its items each a `propertycaseitem`), `parenthesizedproperty` and `clockedproperty`;
- `propertyspec`, a property with its clock and its `disable iff` (16.12), the root an assertion statement's holder
  holds (`@(posedge clk) disable iff (rst) a |-> b`), and `cyclerange` (`1:3`, `1:$`), a range of ticks or of
  repetitions, which a delay's, a repetition's and a unary property's count hold beside an expression.

Its helpers: `delaystep`, `propertycaseitem`, and a clock's `eventcontrol` (`@(...)`, `@(*)` without events) and its
`eventexpression`s (`posedge clk iff en`), IEEE 1800's event control (9.4.2), held here as a sequence's or a property's
clock. A position the standard writes `expression_or_dist` (an `if`'s, a `case`'s and its items' expressions, an abort's
condition, `disable iff`'s) holds its `Term`, which lists `distexpression`; a match item, a cycle range's bound and an
event's expression and condition hold `Expressions`' `Term`. None of its kinds binds a name: a sequence's local
variables are its declaration's, a statement's.

The editions it covers are data, which `define` writes: IEEE 1800's, IEEE Std 1800-2005 to 1800-2023
(`Expressions.EDITIONS` from the fourth), each with its own kinds it has (`SINCE`: `strengthproperty`, `abortproperty`
and `caseproperty` arrived in IEEE 1800-2009). `DIALECT` reads its kinds and the five other dialects' terms. `Text`
writes its kinds as SystemVerilog source, as the family's printer (`Expressions.Text.ToText`) dispatches them to it, by
IEEE 1800's precedence of sequence and property operators (Table 16-3). The evaluator refuses each of its kinds by name
(the dialects proposal, Q11). Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `lambda t: t.repetitionsequence(lambda r: r.sequence(a)
.operator("*").count(two))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..Expressions import Expressions as X

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "SEQUENCES", "PROPERTIES", "problems"]

DELAYSEQUENCE, REPETITIONSEQUENCE, BINARYSEQUENCE, PARENTHESIZEDSEQUENCE, FIRSTMATCHSEQUENCE, CLOCKEDSEQUENCE = (
    "delaysequence", "repetitionsequence", "binarysequence", "parenthesizedsequence", "firstmatchsequence",
    "clockedsequence")
IMPLICATIONPROPERTY, BINARYPROPERTY, UNARYPROPERTY, STRENGTHPROPERTY, ABORTPROPERTY = (
    "implicationproperty", "binaryproperty", "unaryproperty", "strengthproperty", "abortproperty")
CONDITIONALPROPERTY, CASEPROPERTY, PARENTHESIZEDPROPERTY, CLOCKEDPROPERTY, PROPERTYSPEC, CYCLERANGE = (
    "conditionalproperty", "caseproperty", "parenthesizedproperty", "clockedproperty", "propertyspec", "cyclerange")

SEQUENCES = (DELAYSEQUENCE, REPETITIONSEQUENCE, BINARYSEQUENCE, PARENTHESIZEDSEQUENCE, FIRSTMATCHSEQUENCE,
             CLOCKEDSEQUENCE)
"""Its sequences (mbse-programs' `Sequence`), each a property too."""

PROPERTIES = (IMPLICATIONPROPERTY, BINARYPROPERTY, UNARYPROPERTY, STRENGTHPROPERTY, ABORTPROPERTY, CONDITIONALPROPERTY,
              CASEPROPERTY, PARENTHESIZEDPROPERTY, CLOCKEDPROPERTY)
"""Its properties that are no sequence (mbse-programs' `Property`)."""

TAGS = (*SEQUENCES, *PROPERTIES, PROPERTYSPEC, CYCLERANGE)
"""Its own kinds, in its `Term`'s order after `Expressions`' branches."""

HELPERS = ("DelayStep", "PropertyCaseItem", "EventControl", "EventExpression")
"""Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
completeness data (`grammars/systemverilog-slang.json`) names them."""

SINCE = {STRENGTHPROPERTY: 4, ABORTPROPERTY: 4, CASEPROPERTY: 4}
"""The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`
(`sv(2009)`, IEEE 1800-2009); a kind not listed is in every edition of IEEE 1800 (`sv()`, its first, 3)."""

_CHOICES = {
    REPETITIONSEQUENCE: ("RepetitionSequence", {"operator": ("*", "->", "=")}),
    BINARYSEQUENCE: ("BinarySequence", {"operator": ("and", "or", "intersect", "within", "throughout")}),
    IMPLICATIONPROPERTY: ("ImplicationProperty", {"operator": ("|->", "|=>", "#-#", "#=#")}),
    BINARYPROPERTY: ("BinaryProperty", {"operator": ("and", "or", "iff", "implies", "until", "s_until", "until_with",
                                                     "s_until_with")}),
    UNARYPROPERTY: ("UnaryProperty", {"operator": ("not", "nexttime", "s_nexttime", "always", "s_always", "eventually",
                                                   "s_eventually")}),
    STRENGTHPROPERTY: ("StrengthProperty", {"keyword": ("strong", "weak")}),
    ABORTPROPERTY: ("AbortProperty", {"keyword": ("accept_on", "reject_on", "sync_accept_on", "sync_reject_on")}),
    "eventexpression": ("EventExpression", {"edge": ("posedge", "negedge", "edge")}),
}
"""The attributes that are one of a few choices, by kind: mbse-programs' kind, and each attribute's choices."""


def install(txn: Any) -> Any:
    """SystemVerilog Assertions' union of its kinds, added to the framework's terms as the branch
    `systemverilog_assertions`, its own kinds, the helpers they hold, and its dialect's schema, whose singleton is
    `Expressions.SystemVerilog.Assertions`: run after `Framework.install`, in a transaction of its own, before or after
    the other SystemVerilog dialects' installs; run again, it writes nothing. `Expressions.SystemVerilog.Expressions.Term`,
    which its expressions' positions hold, is named, created where that dialect's install has not run; that install adds
    its branches to this `Term`, as the Preprocessor's adds `macrousage` and the Constraints' `distexpression`. Its
    holder, `Expressions.SystemVerilog.Assertions.Expression`, refines `Expressions.Framework.Expression`, its `root`
    narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.SystemVerilog.Assertions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject,
                  # `Expressions`' union, by name: its install's, created here where it has not run
                  "ExpressionsTerm": S.OfUnion,
                  "DelaySequence": S.OfObject, "DelayStep": S.OfObject, "RepetitionSequence": S.OfObject,
                  "BinarySequence": S.OfObject, "ParenthesizedSequence": S.OfObject,
                  "FirstMatchSequence": S.OfObject, "ClockedSequence": S.OfObject,
                  "ImplicationProperty": S.OfObject, "BinaryProperty": S.OfObject, "UnaryProperty": S.OfObject,
                  "StrengthProperty": S.OfObject, "AbortProperty": S.OfObject, "ConditionalProperty": S.OfObject,
                  "CaseProperty": S.OfObject, "PropertyCaseItem": S.OfObject, "ParenthesizedProperty": S.OfObject,
                  "ClockedProperty": S.OfObject, "PropertySpec": S.OfObject, "CycleRange": S.OfObject,
                  "EventControl": S.OfObject, "EventExpression": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.SystemVerilog.Assertions`, a branch of the framework's kind union of
            # dialects
            lambda _: _.Dialect.name("Expressions.SystemVerilog.Assertions.Dialect").ref(True).singleton("Expressions.SystemVerilog.Assertions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("systemverilog_assertions").schema([_.Dialect])]),
            # its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
            lambda _: _.Term.name("Expressions.SystemVerilog.Assertions.Term").branches([
                lambda t: t.name("delaysequence").schema([_.DelaySequence]),
                lambda t: t.name("repetitionsequence").schema([_.RepetitionSequence]),
                lambda t: t.name("binarysequence").schema([_.BinarySequence]),
                lambda t: t.name("parenthesizedsequence").schema([_.ParenthesizedSequence]),
                lambda t: t.name("firstmatchsequence").schema([_.FirstMatchSequence]),
                lambda t: t.name("clockedsequence").schema([_.ClockedSequence]),
                lambda t: t.name("implicationproperty").schema([_.ImplicationProperty]),
                lambda t: t.name("binaryproperty").schema([_.BinaryProperty]),
                lambda t: t.name("unaryproperty").schema([_.UnaryProperty]),
                lambda t: t.name("strengthproperty").schema([_.StrengthProperty]),
                lambda t: t.name("abortproperty").schema([_.AbortProperty]),
                lambda t: t.name("conditionalproperty").schema([_.ConditionalProperty]),
                lambda t: t.name("caseproperty").schema([_.CaseProperty]),
                lambda t: t.name("parenthesizedproperty").schema([_.ParenthesizedProperty]),
                lambda t: t.name("clockedproperty").schema([_.ClockedProperty]),
                lambda t: t.name("propertyspec").schema([_.PropertySpec]),
                lambda t: t.name("cyclerange").schema([_.CycleRange]),
            ]),
            lambda _: _.ExpressionsTerm.name("Expressions.SystemVerilog.Expressions.Term"),
            # sequences (16.7 to 16.10)
            lambda _: _.DelaySequence.name("Expressions.SystemVerilog.Assertions.DelaySequence").properties({
                "first": _.Term, "steps": many(_.DelayStep)}),  # without `first`, it starts with a delay
            lambda _: _.DelayStep.name("Expressions.SystemVerilog.Assertions.DelayStep").properties({
                "delay": _.Term, "sequence": _.Term}),  # a delay: an expression or a cycle range
            lambda _: _.CycleRange.name("Expressions.SystemVerilog.Assertions.CycleRange").properties({
                "low": _.ExpressionsTerm, "high": _.ExpressionsTerm}),  # `high` `$` when unbounded
            lambda _: _.RepetitionSequence.name("Expressions.SystemVerilog.Assertions.RepetitionSequence").properties({
                "sequence": _.Term, "operator": S.OfStr, "count": _.Term}),
            lambda _: _.BinarySequence.name("Expressions.SystemVerilog.Assertions.BinarySequence").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.ParenthesizedSequence.name("Expressions.SystemVerilog.Assertions.ParenthesizedSequence").properties({
                "sequence": _.Term, "items": many(_.ExpressionsTerm)}),  # its match items
            lambda _: _.FirstMatchSequence.name("Expressions.SystemVerilog.Assertions.FirstMatchSequence").properties({
                "sequence": _.Term, "items": many(_.ExpressionsTerm)}),
            lambda _: _.ClockedSequence.name("Expressions.SystemVerilog.Assertions.ClockedSequence").properties({
                "clock": _.EventControl, "sequence": _.Term}),
            # properties (16.12)
            lambda _: _.ImplicationProperty.name("Expressions.SystemVerilog.Assertions.ImplicationProperty").properties({
                "antecedent": _.Term, "operator": S.OfStr, "consequent": _.Term}),
            lambda _: _.BinaryProperty.name("Expressions.SystemVerilog.Assertions.BinaryProperty").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.UnaryProperty.name("Expressions.SystemVerilog.Assertions.UnaryProperty").properties({
                "operator": S.OfStr, "range": _.Term, "operand": _.Term}),
            lambda _: _.StrengthProperty.name("Expressions.SystemVerilog.Assertions.StrengthProperty").properties({
                "keyword": S.OfStr, "sequence": _.Term}),
            lambda _: _.AbortProperty.name("Expressions.SystemVerilog.Assertions.AbortProperty").properties({
                "keyword": S.OfStr, "condition": _.Term, "operand": _.Term}),
            lambda _: _.ConditionalProperty.name("Expressions.SystemVerilog.Assertions.ConditionalProperty").properties({
                "condition": _.Term, "consequence": _.Term, "alternative": _.Term}),
            lambda _: _.CaseProperty.name("Expressions.SystemVerilog.Assertions.CaseProperty").properties({
                "expression": _.Term, "items": many(_.PropertyCaseItem)}),
            lambda _: _.PropertyCaseItem.name("Expressions.SystemVerilog.Assertions.PropertyCaseItem").properties({
                "expressions": many(_.Term), "body": _.Term}),  # without expressions: `default`
            lambda _: _.ParenthesizedProperty.name("Expressions.SystemVerilog.Assertions.ParenthesizedProperty").properties({
                "property": _.Term}),
            lambda _: _.ClockedProperty.name("Expressions.SystemVerilog.Assertions.ClockedProperty").properties({
                "clock": _.EventControl, "property": _.Term}),
            lambda _: _.PropertySpec.name("Expressions.SystemVerilog.Assertions.PropertySpec").properties({
                "clock": _.EventControl, "disable": _.Term, "property": _.Term}),
            # a clock: an event control (9.4.2), its events joined by `or`, `@(*)` without events
            lambda _: _.EventControl.name("Expressions.SystemVerilog.Assertions.EventControl").properties({
                "events": many(_.EventExpression)}),
            lambda _: _.EventExpression.name("Expressions.SystemVerilog.Assertions.EventExpression").properties({
                "edge": S.OfStr, "expression": _.ExpressionsTerm, "condition": _.ExpressionsTerm}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.SystemVerilog.Assertions.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog_assertions").schema([_.Term])]),
        ])]))])

def define(txn: Any) -> Any:
    """SystemVerilog Assertions' dialect as data: the singleton `Expressions.SystemVerilog.Assertions` owning the editions it
    covers, by designation (`standards`), IEEE Std 1800-2005 to 2023, each with its formal reference's parts, its
    common name and its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it
    writes nothing. Its frame binds the dialect (`dialect`) and each edition by its common name spelled as an
    identifier (`SystemVerilog_2023`)."""
    OWN, Standard = txn.Expressions.SystemVerilog.Assertions, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}
    kinds = X.editions(every, SINCE, 3)
    return txn.uid("mbse.Expressions.SystemVerilog.Assertions.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
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


def _nodes(value: Any) -> tuple[F.Node, ...]:
    """A helper property's nodes: one, or each of many."""
    return value if isinstance(value, tuple) else (value,)


def problems(node: F.Node) -> list[str]:
    """A node's checks, and its helpers' in turn, which the framework's validation does not read within a helper: an
    operator or a keyword, one of a few, as mbse-programs' choices have them (`BinarySequence.operator cannot be
    'xor'`), and an event's edge."""
    found: list[str] = []
    if node.kind in _CHOICES:
        name, choices = _CHOICES[node.kind]
        for attribute, allowed in choices.items():
            value = node.attributes.get(attribute)
            if value is not None and value not in allowed:
                found.append(f"{name}.{attribute} cannot be {value!r}")
    for value in node.helpers.values():
        for inner in _nodes(value):
            found += problems(inner)
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    return lambda record: problems(F.node(tag, record))


_OPTIONAL = ("clock.events.condition",)
"""The slots of its kinds' helpers that may be empty: a clock's event's condition (`iff`)."""


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds: each an application of no operation it evaluates, binding no name."""

    def application(tag: str, optional: tuple[str, ...] = (), **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), optional=optional + _OPTIONAL, **options)

    return {
        DELAYSEQUENCE: application(DELAYSEQUENCE, optional=("first",)),
        REPETITIONSEQUENCE: application(REPETITIONSEQUENCE, required=("operator",)),
        BINARYSEQUENCE: application(BINARYSEQUENCE, required=("operator",)),
        PARENTHESIZEDSEQUENCE: application(PARENTHESIZEDSEQUENCE),
        FIRSTMATCHSEQUENCE: application(FIRSTMATCHSEQUENCE),
        CLOCKEDSEQUENCE: application(CLOCKEDSEQUENCE, required=("clock",)),
        IMPLICATIONPROPERTY: application(IMPLICATIONPROPERTY, required=("operator",)),
        BINARYPROPERTY: application(BINARYPROPERTY, required=("operator",)),
        UNARYPROPERTY: application(UNARYPROPERTY, optional=("range",), required=("operator",)),
        STRENGTHPROPERTY: application(STRENGTHPROPERTY, required=("keyword",)),
        ABORTPROPERTY: application(ABORTPROPERTY, required=("keyword",)),
        CONDITIONALPROPERTY: application(CONDITIONALPROPERTY, optional=("alternative",)),
        CASEPROPERTY: application(CASEPROPERTY),
        PARENTHESIZEDPROPERTY: application(PARENTHESIZEDPROPERTY),
        CLOCKEDPROPERTY: application(CLOCKEDPROPERTY, required=("clock",)),
        PROPERTYSPEC: application(PROPERTYSPEC, optional=("disable",)),
        CYCLERANGE: application(CYCLERANGE),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms its positions hold, imported when first needed."""
    from ..Constraints import Expressions as Constraints
    from ..Patterns import Expressions as Patterns
    from ..Preprocessor import Expressions as Preprocessor
    from ..Types import Expressions as Types
    return X.DIALECT, Types.DIALECT, Patterns.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT


DIALECT = F.Dialect("SystemVerilog.Assertions", _kinds(), domain_of=X._untyped, literal=X._native, reads=_reads)
"""The SystemVerilog Assertions dialect: its kinds, as the framework reads them, and the terms of its family's dialects."""
