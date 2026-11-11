"""Expressions of the SystemVerilog Constraints dialect: the constraints and distributions of constraint blocks (IEEE
1800 18.5), as mbse-programs has them.

It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6: "if the standard says it's a
sublanguage then it's definitely at least a separate dialect"), named `SystemVerilog Constraints`
(`Terms.dialect_name`), its tag `systemverilog_constraints`. Its terms are values of its `Term`,
`Expressions.SystemVerilog.Constraints.Term`, the branch `systemverilog_constraints` of `Expressions.Framework.Term`; a
constraint block's items, a `randomize() with`'s and an expression constraint's expression (`expression_or_dist`) hold
it, so it lists, besides its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which that
dialect's install adds ("(b)"), and the Preprocessor's directives and `comment` (Q6), which its install adds. Its own
kinds are mbse-programs' constraints (`mbse:mbse-programs/python3/mbse/Programs/Verilog/Syntax.py`), with
mbse-programs' names, lowercased as branch tags, and its properties in source order, each a value object
`Expressions.SystemVerilog.Constraints.<Kind>`:

- `constraintblock` (`{ items }`), `expressionconstraint` (`soft expression;`, its expression this dialect's term, a
  distribution or an expression), `implicationconstraint` (`condition -> body`), `conditionalconstraint`
  (`if (condition) consequence else alternative`), `foreachconstraint` (`foreach (array[variables]) body`),
  `solvebeforeconstraint` (`solve a, b before c;`, 18.5.10, two containers of terms, `solve` and `before`),
  `disablesoftconstraint` (`disable soft x;`) and `uniqueconstraint` (`unique { set }`), each a constraint's
  condition, array, variables, target or set `Expressions`' terms, its body this dialect's;
- `distexpression` (`value dist { items }`, 18.5.4), a distribution of a random variable's values, whose items are
  `distitem`s (`value := weight`, `value :/ weight`, or `default :/ weight` with no value), each value an `Expressions`
  term, a range among them (`valuerange`). `install` adds it to `Expressions.SystemVerilog.Assertions.Term` too, as
  IEEE 1800 lets a sequence's expression be one (16.7, `expression_or_dist`), creating that union where its install has
  not run, as the Preprocessor's install adds `macrousage` to the `Term`s that list `Expressions`' branches.

Its helpers: `distitem` (`Expressions.SystemVerilog.Constraints.DistItem`), and the union of a loop's variables,
`Expressions.SystemVerilog.Constraints.LoopVariable`, an `Expressions` identifier or, for a dimension it skips
(`q[, j]`), an `emptyargument` (mbse-programs' `Identifier | EmptyArgument`). An identifier is `Expressions`'
`Identifier`: the family's helpers, one schema each.

`foreachconstraint` binds its loop variables within its body (18.5.8.1): it refines `Expressions.Framework.Let` (Q8,
"(a)"), holding its array as `Let`'s `value`, an `Expressions` term, and its body as `Let`'s `body`, this dialect's
term; `Let`'s `name` stays unset, as a loop binds several names, which its kind's scopes give (`Kind.scopes`).

The editions it covers are data, which `define` writes: IEEE 1800's, IEEE Std 1800-2005 to 1800-2023
(`Expressions.EDITIONS` from the fourth), each with its own kinds it has (`SINCE`: `disablesoftconstraint` and
`uniqueconstraint` from IEEE 1800-2012). A feature within a kind (`soft`, 2012; a default distribution item, 2023) is
not recorded, as for C's: a constraint, to come. `DIALECT` reads its kinds and the five other dialects' terms. `Text`
writes its kinds as SystemVerilog source, as `randomize() with` writes them, on one line. No kind of it is evaluated
(Q11): SystemVerilog's evaluator refuses each by name. Its terms are written through the builders (mbse-basis
[PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda c: c.expressionconstraint(lambda e: e.soft(True).expression(...))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..Expressions import Expressions as X

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "OPERATORS", "problems"]

CONSTRAINTBLOCK, EXPRESSIONCONSTRAINT, IMPLICATIONCONSTRAINT, CONDITIONALCONSTRAINT = (
    "constraintblock", "expressionconstraint", "implicationconstraint", "conditionalconstraint")
FOREACHCONSTRAINT, SOLVEBEFORECONSTRAINT, DISABLESOFTCONSTRAINT, UNIQUECONSTRAINT, DISTEXPRESSION = (
    "foreachconstraint", "solvebeforeconstraint", "disablesoftconstraint", "uniqueconstraint", "distexpression")

TAGS = (CONSTRAINTBLOCK, EXPRESSIONCONSTRAINT, IMPLICATIONCONSTRAINT, CONDITIONALCONSTRAINT, FOREACHCONSTRAINT,
        SOLVEBEFORECONSTRAINT, DISABLESOFTCONSTRAINT, UNIQUECONSTRAINT, DISTEXPRESSION)
"""Its own kinds, in its `Term`'s order after `Expressions`' branches."""

HELPERS = ("DistItem",)
"""Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
completeness data (`grammars/systemverilog-slang.json`) names them."""

SINCE = {DISABLESOFTCONSTRAINT: 5, UNIQUECONSTRAINT: 5}
"""The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`
(`sv(2012)`, IEEE 1800-2012); a kind not listed is in every edition of IEEE 1800 (its first, 3)."""

OPERATORS = (":=", ":/")
"""A distribution item's operators: each value of its range weighs its weight (`:=`), or the range does (`:/`)."""


def install(txn: Any) -> Any:
    """SystemVerilog Constraints' union of its kinds, added to the framework's terms as the branch
    `systemverilog_constraints`, its own kinds, the helpers they hold, and its dialect's schema, whose singleton is
    `Expressions.SystemVerilog.Constraints`: run after `Framework.install`, in a transaction of its own, before or after
    the other SystemVerilog dialects' installs; run again, it writes nothing. `Expressions.SystemVerilog.Expressions.Term`,
    which its conditions hold, and that dialect's helpers are named, created where its install has not run; that
    install adds its branches to this `Term`. `distexpression` is added to `Expressions.SystemVerilog.Assertions.Term`
    too, created where its install has not run. Its holder, `Expressions.SystemVerilog.Constraints.Expression`, refines
    `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.SystemVerilog.Constraints/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "LoopVariable": S.OfUnion,
                  # `Expressions`' union and helpers, and Assertions' union, by name: their installs', created here
                  # where they have not run
                  "ExpressionsTerm": S.OfUnion, "AssertionsTerm": S.OfUnion, "Identifier": S.OfObject,
                  "EmptyArgument": S.OfObject,
                  "ConstraintBlock": S.OfObject, "ExpressionConstraint": S.OfObject,
                  "ImplicationConstraint": S.OfObject, "ConditionalConstraint": S.OfObject,
                  "ForeachConstraint": S.OfObject, "SolveBeforeConstraint": S.OfObject,
                  "DisableSoftConstraint": S.OfObject, "UniqueConstraint": S.OfObject, "DistExpression": S.OfObject,
                  "DistItem": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.SystemVerilog.Constraints`, a branch of the framework's kind union
            # of dialects
            lambda _: _.Dialect.name("Expressions.SystemVerilog.Constraints.Dialect").ref(True).singleton("Expressions.SystemVerilog.Constraints").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("systemverilog_constraints").schema([_.Dialect])]),
            # its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
            lambda _: _.Term.name("Expressions.SystemVerilog.Constraints.Term").branches([
                lambda t: t.name("constraintblock").schema([_.ConstraintBlock]),
                lambda t: t.name("expressionconstraint").schema([_.ExpressionConstraint]),
                lambda t: t.name("implicationconstraint").schema([_.ImplicationConstraint]),
                lambda t: t.name("conditionalconstraint").schema([_.ConditionalConstraint]),
                lambda t: t.name("foreachconstraint").schema([_.ForeachConstraint]),
                lambda t: t.name("solvebeforeconstraint").schema([_.SolveBeforeConstraint]),
                lambda t: t.name("disablesoftconstraint").schema([_.DisableSoftConstraint]),
                lambda t: t.name("uniqueconstraint").schema([_.UniqueConstraint]),
                lambda t: t.name("distexpression").schema([_.DistExpression]),
            ]),
            lambda _: _.ExpressionsTerm.name("Expressions.SystemVerilog.Expressions.Term"),
            lambda _: _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier"),
            lambda _: _.EmptyArgument.name("Expressions.SystemVerilog.Expressions.EmptyArgument"),
            # a distribution is a sequence's expression too (16.7): Assertions' `Term` lists it
            lambda _: _.AssertionsTerm.name("Expressions.SystemVerilog.Assertions.Term").branches([
                lambda t: t.name("distexpression").schema([_.DistExpression])]),
            # constraints (18.5)
            lambda _: _.ConstraintBlock.name("Expressions.SystemVerilog.Constraints.ConstraintBlock").properties({
                "items": many(_.Term)}),
            lambda _: _.ExpressionConstraint.name("Expressions.SystemVerilog.Constraints.ExpressionConstraint").properties({
                "soft": S.OfBool, "expression": _.Term}),
            lambda _: _.ImplicationConstraint.name("Expressions.SystemVerilog.Constraints.ImplicationConstraint").properties({
                "condition": _.ExpressionsTerm, "body": _.Term}),
            lambda _: _.ConditionalConstraint.name("Expressions.SystemVerilog.Constraints.ConditionalConstraint").properties({
                "condition": _.ExpressionsTerm, "consequence": _.Term, "alternative": _.Term}),
            # a binder: `Let`, its array its value, an `Expressions` term, and its body this dialect's term
            lambda _: _.ForeachConstraint.name("Expressions.SystemVerilog.Constraints.ForeachConstraint")
                .refines([Framework.Let]).properties({
                    "value": _.ExpressionsTerm, "variables": many(_.LoopVariable), "body": _.Term}),
            lambda _: _.LoopVariable.name("Expressions.SystemVerilog.Constraints.LoopVariable").branches([
                lambda t: t.name("identifier").schema([_.Identifier]),
                lambda t: t.name("emptyargument").schema([_.EmptyArgument]),  # a dimension it skips
            ]),
            # an order in which variables are chosen (18.5.10): two containers of terms
            lambda _: _.SolveBeforeConstraint.name("Expressions.SystemVerilog.Constraints.SolveBeforeConstraint").properties({
                "solve": many(_.ExpressionsTerm), "before": many(_.ExpressionsTerm)}),
            lambda _: _.DisableSoftConstraint.name("Expressions.SystemVerilog.Constraints.DisableSoftConstraint").properties({
                "target": _.ExpressionsTerm}),
            lambda _: _.UniqueConstraint.name("Expressions.SystemVerilog.Constraints.UniqueConstraint").properties({
                "set": many(_.ExpressionsTerm)}),
            # distributions (18.5.4)
            lambda _: _.DistExpression.name("Expressions.SystemVerilog.Constraints.DistExpression").properties({
                "value": _.ExpressionsTerm, "items": many(_.DistItem)}),
            lambda _: _.DistItem.name("Expressions.SystemVerilog.Constraints.DistItem").properties({
                "value": _.ExpressionsTerm,  # absent: `default`
                "operator": S.OfStr, "weight": _.ExpressionsTerm}),  # both absent: a weight of 1
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.SystemVerilog.Constraints.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog_constraints").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """SystemVerilog Constraints' dialect as data: the singleton `Expressions.SystemVerilog.Constraints` owning the
    editions it covers, by designation (`standards`), IEEE Std 1800-2005 to 2023, each with its formal reference's
    parts, its common name and its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run
    again, it writes nothing. Its frame binds the dialect (`dialect`) and each edition by its common name spelled as an
    identifier (`SystemVerilog_2023`)."""
    OWN, Standard = txn.Expressions.SystemVerilog.Constraints, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}
    kinds = X.editions(every, SINCE, 3)
    return txn.uid("mbse.Expressions.SystemVerilog.Constraints.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
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
    """A helper container's nodes, none where it is absent: every helper it holds is a container's."""
    return () if value is None else value


def problems(node: F.Node) -> list[str]:
    """A node's checks, and its helpers' in turn: a distribution item's operator, one of `OPERATORS`, and
    mbse-programs' checks of it; and the family's helpers' (a loop variable's spelling), which `Expressions.problems`
    reads."""
    kind, attributes = node.kind, node.attributes
    found: list[str] = []
    if kind == "distitem":
        operator = attributes.get("operator")
        if operator is not None and operator not in OPERATORS:
            found.append(f"DistItem.operator cannot be {operator!r}")
        if (operator is None) != (node.slots["weight"] is None):
            found.append("a DistItem has both an operator and a weight, or neither")
        elif node.slots["value"] is None and operator != ":/":
            found.append("a default DistItem weighs its values with :/")
    else:
        found += X.problems(F.Node(kind, attributes, node.slots, node.many, {}))
    for value in node.helpers.values():
        for inner in _nodes(value):
            found += problems(inner)
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    return lambda record: problems(F.node(tag, record))


def loop_variables(record: Any) -> frozenset[str]:
    """The names a loop binds: its variables' spellings, but a dimension it skips."""
    variables = _nodes(F.node(FOREACHCONSTRAINT, record).helpers.get("variables"))
    return frozenset(v.attributes["spelling"] for v in variables if v.kind == "identifier" and "spelling" in v.attributes)


def _foreach_scopes(record: Any) -> list[frozenset[str]]:
    """What a loop's array and its body have bound: its variables, within its body alone (18.5.8.1)."""
    return [frozenset(), loop_variables(record)]


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds."""

    def application(tag: str, optional: tuple[str, ...] = ()) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), optional=optional)

    return {
        CONSTRAINTBLOCK: application(CONSTRAINTBLOCK),
        EXPRESSIONCONSTRAINT: application(EXPRESSIONCONSTRAINT),
        IMPLICATIONCONSTRAINT: application(IMPLICATIONCONSTRAINT),
        CONDITIONALCONSTRAINT: application(CONDITIONALCONSTRAINT, ("alternative",)),
        FOREACHCONSTRAINT: F.Kind(F.BINDING, signature=FD.Opaque(), scopes=_foreach_scopes,
                                  check=_check(FOREACHCONSTRAINT)),
        SOLVEBEFORECONSTRAINT: application(SOLVEBEFORECONSTRAINT),
        DISABLESOFTCONSTRAINT: application(DISABLESOFTCONSTRAINT),
        UNIQUECONSTRAINT: application(UNIQUECONSTRAINT),
        DISTEXPRESSION: application(DISTEXPRESSION, ("items.value", "items.weight")),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms its positions hold, imported when first needed."""
    from ..Assertions import Expressions as Assertions
    from ..Patterns import Expressions as Patterns
    from ..Preprocessor import Expressions as Preprocessor
    from ..Types import Expressions as Types
    return X.DIALECT, Types.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Preprocessor.DIALECT


DIALECT = F.Dialect("SystemVerilog.Constraints", _kinds(), domain_of=X._untyped, literal=X._native, reads=_reads)
"""The SystemVerilog Constraints dialect: its kinds, as the framework reads them, and the terms of its family's
dialects."""
