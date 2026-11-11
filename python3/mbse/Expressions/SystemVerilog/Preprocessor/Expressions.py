"""Expressions of the SystemVerilog Preprocessor dialect: Verilog's and SystemVerilog's compiler directives and macro
usages (IEEE 1800 clause 22), and the comments kept among them (clause 5), as mbse-programs has them.

It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6, "Macros": "the preprocessor is
a dialect per family ..., a macro usage in an expression position a term of it held by (b)"), named `SystemVerilog
Preprocessor` (`Terms.dialect_name`), its tag `systemverilog_preprocessor`. Its terms are values of its `Term`,
`Expressions.SystemVerilog.Preprocessor.Term`, the branch `systemverilog_preprocessor` of
`Expressions.Framework.Term`: its own kinds and invalid syntax. Its kinds are mbse-programs' (`mbse:mbse-programs/python3/
mbse/Programs/Verilog/Syntax.py`), with mbse-programs' names, lowercased as branch tags, and its properties in source
order, each a value object `Expressions.SystemVerilog.Preprocessor.<Kind>`:

- `macrousage`: `` `name `` or `` `name(arguments) ``, a text macro used as a value (22.5.1), `arguments` the text
  between its parentheses. Its install adds it to the `Term`s that list `Expressions`' branches too, an expression
  position holding it: `Expressions`', `Types`', `Patterns`', `Assertions`' and `Constraints`'.
- The directives (22): `includedirective` (`` `include "path" ``, or `<path>` where `system`), `definedirective`
  (`` `define name(parameters) body ``, its body as written), `undefdirective`, `timescaledirective` (`` `timescale 1ns
  / 1ps ``), `defaultnettypedirective` (`` `default_nettype none ``), `ifdefdirective` (`` `ifdef ``, or `` `ifndef ``
  where `negated`, of a macro's name or a `condition` of macros' names, IEEE 1800-2023's, with its `elsif` branches
  and its `else`), `disabledtext` (a branch's text the preprocessor skipped, as written) and `otherdirective` (any
  other, as written: `` `resetall ``).
- `comment` (5.4): `// text`, or with `block` `/* text */`, kept where mbse-programs keeps it, among constraints and
  directives.

Its helpers: `elsifdirective` (`ElsifDirective`, an `` `elsif `` branch) and `elsedirective` (`ElseDirective`, the
`` `else `` branch, slang's `ElseDirective`): where mbse-programs holds an `else`'s items in the `IfdefDirective`
itself (`alternative`, with `has_else`), its `alternative` holds the helper, present where the directive has an `else`,
since the framework reads one variadic container of terms per kind (`Terms._parts`). A name is `Expressions`'
`Identifier`, one schema in each dialect that holds it.

The directives and `comment` are a constraint block's items too (Q6: "directives are the preprocessor dialect's terms,
comments helpers"): its install adds them to `Constraints`' `Term`, created where that install has not run, and a
directive's branches hold `Constraints`' terms, the one place a value holds them (elsewhere mbse-programs relates its
items and statements). A conditional directive's condition holds `Expressions`' terms, macros' names as
`nameexpression`s, which name macros, defined or not, never values: they are bound within it (`Kind.scopes`). Nothing
else binds.

The editions it covers are data, which `define` writes: Verilog's and SystemVerilog's, as `Expressions`' are, each
with its own kinds it has, every one of them in every edition (mbse-programs gives none of them a `SINCE`; an
`elsif`'s, IEEE 1364-2001's, is its helper's, and a feature within a kind, as a system include's and a condition's
are, is not recorded). `DIALECT` reads its kinds and the five other dialects' terms. Evaluation refuses each of its
kinds by name. Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda t: t.undefdirective(lambda d: d.name(lambda i: i.spelling("WIDTH")))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..Expressions import Expressions as X

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "DIRECTIVES", "NET_TYPES", "problems"]

MACROUSAGE, INCLUDEDIRECTIVE, DEFINEDIRECTIVE, UNDEFDIRECTIVE, TIMESCALEDIRECTIVE = (
    "macrousage", "includedirective", "definedirective", "undefdirective", "timescaledirective")
DEFAULTNETTYPEDIRECTIVE, IFDEFDIRECTIVE, DISABLEDTEXT, OTHERDIRECTIVE, COMMENT = (
    "defaultnettypedirective", "ifdefdirective", "disabledtext", "otherdirective", "comment")

DIRECTIVES = (INCLUDEDIRECTIVE, DEFINEDIRECTIVE, UNDEFDIRECTIVE, TIMESCALEDIRECTIVE, DEFAULTNETTYPEDIRECTIVE,
              IFDEFDIRECTIVE, DISABLEDTEXT, OTHERDIRECTIVE)
"""The directives, in its `Term`'s order: with `comment`, what its install adds to `Constraints`' `Term`."""

TAGS = (MACROUSAGE, *DIRECTIVES, COMMENT)
"""Its own kinds, in its `Term`'s order, before invalid syntax."""

HELPERS = ("ElsifDirective", "ElseDirective")
"""Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
completeness data (`grammars/systemverilog-slang.json`) names them."""

SINCE: dict[str, int] = {}
"""The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`: none
of its kinds has one, so each is in every edition."""

NET_TYPES = ("wire", "tri", "tri0", "tri1", "triand", "trior", "trireg", "wand", "wor", "uwire", "none")
"""What `` `default_nettype `` may name (22.8), as mbse-programs' `DefaultNettype` lists them."""


def install(txn: Any) -> Any:
    """SystemVerilog Preprocessor's union of its kinds, added to the framework's terms as the branch
    `systemverilog_preprocessor`, its own kinds, the helpers they hold, and its dialect's schema, whose singleton is
    `Expressions.SystemVerilog.Preprocessor`: run after `Framework.install`, in a transaction of its own, before or
    after the other SystemVerilog dialects' installs; run again, it writes nothing. `macrousage` is added to
    `Expressions`' `Term`, and to the `Term`s that list its branches; the directives and `comment` to `Constraints`'
    `Term`, whose items hold them, and which a directive's branches hold; each created where its install has not run,
    as `Expressions`' `Identifier`, a macro's name, is. Its holder, `Expressions.SystemVerilog.Preprocessor.Expression`,
    refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    def held(_: Any) -> list[Any]:
        """The directives and `comment`, as a union's branches: its own `Term`'s, and `Constraints`'."""
        return [
            lambda t: t.name("includedirective").schema([_.IncludeDirective]),
            lambda t: t.name("definedirective").schema([_.DefineDirective]),
            lambda t: t.name("undefdirective").schema([_.UndefDirective]),
            lambda t: t.name("timescaledirective").schema([_.TimescaleDirective]),
            lambda t: t.name("defaultnettypedirective").schema([_.DefaultNettypeDirective]),
            lambda t: t.name("ifdefdirective").schema([_.IfdefDirective]),
            lambda t: t.name("disabledtext").schema([_.DisabledText]),
            lambda t: t.name("otherdirective").schema([_.OtherDirective]),
            lambda t: t.name("comment").schema([_.Comment]),
        ]

    return txn.uid("mbse.Expressions.SystemVerilog.Preprocessor/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "MacroUsage": S.OfObject, "IncludeDirective": S.OfObject,
                  "DefineDirective": S.OfObject, "UndefDirective": S.OfObject, "TimescaleDirective": S.OfObject,
                  "DefaultNettypeDirective": S.OfObject, "IfdefDirective": S.OfObject, "ElsifDirective": S.OfObject,
                  "ElseDirective": S.OfObject, "DisabledText": S.OfObject, "OtherDirective": S.OfObject,
                  "Comment": S.OfObject,
                  # `Expressions`' union and helper, and the `Term`s that list its branches, by name
                  "ExpressionsTerm": S.OfUnion, "TypesTerm": S.OfUnion, "PatternsTerm": S.OfUnion,
                  "AssertionsTerm": S.OfUnion, "ConstraintsTerm": S.OfUnion, "Identifier": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.SystemVerilog.Preprocessor`, a branch of the framework's kind
            # union of dialects
            lambda _: _.Dialect.name("Expressions.SystemVerilog.Preprocessor.Dialect").ref(True).singleton("Expressions.SystemVerilog.Preprocessor").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("systemverilog_preprocessor").schema([_.Dialect])]),
            # its union of its kinds, and invalid syntax
            lambda _: _.Term.name("Expressions.SystemVerilog.Preprocessor.Term").branches([
                lambda t: t.name("macrousage").schema([_.MacroUsage]),
                *held(_),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier"),
            # a macro usage (22.5.1), in an expression position: in `Expressions`' `Term`, and in those that list its
            # branches
            lambda _: _.MacroUsage.name("Expressions.SystemVerilog.Preprocessor.MacroUsage").properties({
                "name": _.Identifier, "arguments": S.OfStr}),  # arguments: the text between its parentheses
            lambda _: _.ExpressionsTerm.name("Expressions.SystemVerilog.Expressions.Term").branches([
                lambda t: t.name("macrousage").schema([_.MacroUsage])]),
            lambda _: _.TypesTerm.name("Expressions.SystemVerilog.Types.Term").branches([
                lambda t: t.name("macrousage").schema([_.MacroUsage])]),
            lambda _: _.PatternsTerm.name("Expressions.SystemVerilog.Patterns.Term").branches([
                lambda t: t.name("macrousage").schema([_.MacroUsage])]),
            lambda _: _.AssertionsTerm.name("Expressions.SystemVerilog.Assertions.Term").branches([
                lambda t: t.name("macrousage").schema([_.MacroUsage])]),
            # a constraint block's items: its directives and comments too (Q6)
            lambda _: _.ConstraintsTerm.name("Expressions.SystemVerilog.Constraints.Term").branches([
                lambda t: t.name("macrousage").schema([_.MacroUsage]), *held(_)]),
            # compiler directives (22)
            lambda _: _.IncludeDirective.name("Expressions.SystemVerilog.Preprocessor.IncludeDirective").properties({
                "path": S.OfStr, "system": S.OfBool}),
            lambda _: _.DefineDirective.name("Expressions.SystemVerilog.Preprocessor.DefineDirective").properties({
                "name": _.Identifier, "function_like": S.OfBool, "parameters": many(_.Identifier),
                "body": S.OfStr}),  # body: its text, line continuations included
            lambda _: _.UndefDirective.name("Expressions.SystemVerilog.Preprocessor.UndefDirective").properties({
                "name": _.Identifier}),
            lambda _: _.TimescaleDirective.name("Expressions.SystemVerilog.Preprocessor.TimescaleDirective").properties({
                "unit": S.OfStr, "precision": S.OfStr}),
            lambda _: _.DefaultNettypeDirective.name("Expressions.SystemVerilog.Preprocessor.DefaultNettypeDirective").properties({
                "net_type": S.OfStr}),
            # conditional compilation (22.6), its branches holding a constraint block's items
            lambda _: _.IfdefDirective.name("Expressions.SystemVerilog.Preprocessor.IfdefDirective").properties({
                "negated": S.OfBool, "name": _.Identifier, "condition": _.ExpressionsTerm,
                "items": many(_.ConstraintsTerm), "branches": many(_.ElsifDirective),
                "alternative": _.ElseDirective}),  # alternative: absent without an `else
            lambda _: _.ElsifDirective.name("Expressions.SystemVerilog.Preprocessor.ElsifDirective").properties({
                "name": _.Identifier, "condition": _.ExpressionsTerm, "items": many(_.ConstraintsTerm)}),
            lambda _: _.ElseDirective.name("Expressions.SystemVerilog.Preprocessor.ElseDirective").properties({
                "items": many(_.ConstraintsTerm)}),
            lambda _: _.DisabledText.name("Expressions.SystemVerilog.Preprocessor.DisabledText").properties({
                "text": S.OfStr}),
            lambda _: _.OtherDirective.name("Expressions.SystemVerilog.Preprocessor.OtherDirective").properties({
                "text": S.OfStr}),
            # a comment (5.4): `text` excludes its delimiters; a `trailing` one ends the line of the item before it
            lambda _: _.Comment.name("Expressions.SystemVerilog.Preprocessor.Comment").properties({
                "block": S.OfBool, "text": S.OfStr, "trailing": S.OfBool}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.SystemVerilog.Preprocessor.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog_preprocessor").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """SystemVerilog Preprocessor's dialect as data: the singleton `Expressions.SystemVerilog.Preprocessor` owning the
    editions it covers, by designation (`standards`), Verilog's IEEE Std 1364-1995, 2001 and 2005 and SystemVerilog's
    IEEE Std 1800-2005 to 2023, each with its formal reference's parts, its common name and its own kinds it has
    (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the
    dialect (`dialect`) and each edition by its common name spelled as an identifier (`SystemVerilog_2023`)."""
    OWN, Standard = txn.Expressions.SystemVerilog.Preprocessor, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}
    kinds = X.editions(every, SINCE)
    return txn.uid("mbse.Expressions.SystemVerilog.Preprocessor.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, "Verilog_1995": Standard, "Verilog_2001": Standard, "Verilog_2005": Standard,
                  "SystemVerilog_2005": Standard, "SystemVerilog_2009": Standard, "SystemVerilog_2012": Standard,
                  "SystemVerilog_2017": Standard, "SystemVerilog_2023": Standard})
        .spec([
            lambda _: _.dialect.standards({
                "IEEE Std 1364-1995": lambda e: e.standard(_.Verilog_1995),
                "IEEE Std 1364-2001": lambda e: e.standard(_.Verilog_2001),
                "IEEE Std 1364-2005": lambda e: e.standard(_.Verilog_2005),
                "IEEE Std 1800-2005": lambda e: e.standard(_.SystemVerilog_2005),
                "IEEE Std 1800-2009": lambda e: e.standard(_.SystemVerilog_2009),
                "IEEE Std 1800-2012": lambda e: e.standard(_.SystemVerilog_2012),
                "IEEE Std 1800-2017": lambda e: e.standard(_.SystemVerilog_2017),
                "IEEE Std 1800-2023": lambda e: e.standard(_.SystemVerilog_2023)}),
            lambda _: _.Verilog_1995.bodies(["org.ieee"]).number("1364").revision(lambda r: r.year(1995)).names(
                ["Verilog-1995"]).kinds(kinds[0]),
            lambda _: _.Verilog_2001.bodies(["org.ieee"]).number("1364").revision(lambda r: r.year(2001)).names(
                ["Verilog-2001"]).kinds(kinds[1]),
            lambda _: _.Verilog_2005.bodies(["org.ieee"]).number("1364").revision(lambda r: r.year(2005)).names(
                ["Verilog-2005"]).kinds(kinds[2]),
            lambda _: _.SystemVerilog_2005.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2005)).names(
                ["SystemVerilog-2005"]).kinds(kinds[3]),
            lambda _: _.SystemVerilog_2009.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2009)).names(
                ["SystemVerilog-2009"]).kinds(kinds[4]),
            lambda _: _.SystemVerilog_2012.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2012)).names(
                ["SystemVerilog-2012"]).kinds(kinds[5]),
            lambda _: _.SystemVerilog_2017.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2017)).names(
                ["SystemVerilog-2017"]).kinds(kinds[6]),
            lambda _: _.SystemVerilog_2023.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2023)).names(
                ["SystemVerilog-2023"]).kinds(kinds[7]),
        ])]))])


def _nodes(value: Any) -> tuple[F.Node, ...]:
    return () if value is None else value if isinstance(value, tuple) else (value,)


def _condition_problems(node: F.Node) -> list[str]:
    """A conditional directive has a name or a condition, and a condition is parenthesized and holds only macros' names,
    `!`, `&&`, `||`, `->` and `<->`, as mbse-programs checks it."""
    kind = "IfdefDirective" if node.kind == IFDEFDIRECTIVE else "ElsifDirective"
    condition = node.slots.get("condition")
    if ("name" in node.helpers) == (condition is not None):
        return [f"an {kind} has a name or a condition"]
    if condition is None:
        return []
    if F.kind_of(condition)[0] != X.PARENTHESIZEDEXPRESSION:
        return [f"an {kind}'s condition is in parentheses"]
    terms = [condition]
    while terms:
        inner = F.node(*F.kind_of(terms.pop()))
        if inner.kind == X.PARENTHESIZEDEXPRESSION:
            terms.append(inner.slots["expression"])
        elif inner.kind == X.UNARYEXPRESSION and inner.attributes.get("operator") == "!" and not inner.helpers:
            terms.append(inner.slots["operand"])
        elif inner.kind == X.BINARYEXPRESSION and inner.attributes.get("operator") in ("&&", "||", "->", "<->") \
                and not inner.helpers:
            terms.extend([inner.slots["left"], inner.slots["right"]])
        elif not (inner.kind == X.NAMEEXPRESSION and inner.helpers["name"].kind == "identifier"):
            return [f"an {kind}'s condition has macros' names, !, &&, ||, -> and <-> only"]
    return []


def problems(node: F.Node) -> list[str]:
    """A node's checks, and its helpers' in turn: a choice among a few (a default net type), a conditional directive's
    name or condition, mbse-programs' checks, and the family's helpers' (an identifier's spelling), which
    `Expressions.problems` reads."""
    found: list[str] = []
    if node.kind == DEFAULTNETTYPEDIRECTIVE:
        net_type = node.attributes.get("net_type")
        if net_type is not None and net_type not in NET_TYPES:
            found.append(f"DefaultNettypeDirective.net_type cannot be {net_type!r}")
    if node.kind in (IFDEFDIRECTIVE, "elsifdirective"):
        found += _condition_problems(node)
    if node.kind == "identifier":
        found += X.problems(node)
    for value in node.helpers.values():
        for inner in _nodes(value):
            found += problems(inner)
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    """A kind's checks, and its helpers' (a macro's name's spelling)."""
    return lambda record: problems(F.node(tag, record))


def _macros(condition: Any) -> frozenset[str]:
    """The macros' names a condition holds: what it binds within itself, as each names a macro, defined or not."""
    if condition is None:
        return frozenset()
    names: set[str] = set()
    terms = [condition]
    while terms:
        value = terms.pop()
        tag, record = F.kind_of(value)
        if tag == X.NAMEEXPRESSION:
            name = F.name_of(value)
            if name is not None:
                names.add(name)
        else:
            terms.extend(argument for argument in F.arguments_of(record) if argument is not None)
    return frozenset(names)


def _ifdef_scopes(record: Any) -> list[frozenset[str]]:
    """What each of a conditional directive's arguments has bound: each condition, its macros' names; its branches'
    items, nothing."""
    node = F.node(IFDEFDIRECTIVE, record)
    found = [_macros(node.slots["condition"]), *[frozenset()] * len(node.many)]
    for branch in _nodes(node.helpers.get("branches")):
        found += [_macros(branch.slots["condition"]), *[frozenset()] * len(branch.many)]
    for alternative in _nodes(node.helpers.get("alternative")):
        found += [frozenset()] * len(alternative.many)
    return found


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds."""

    def application(tag: str, **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), **options)

    return {
        MACROUSAGE: application(MACROUSAGE, required=("name",)),
        INCLUDEDIRECTIVE: application(INCLUDEDIRECTIVE, required=("path",)),
        DEFINEDIRECTIVE: application(DEFINEDIRECTIVE, required=("name",)),
        UNDEFDIRECTIVE: application(UNDEFDIRECTIVE, required=("name",)),
        TIMESCALEDIRECTIVE: application(TIMESCALEDIRECTIVE, required=("unit", "precision")),
        DEFAULTNETTYPEDIRECTIVE: application(DEFAULTNETTYPEDIRECTIVE, required=("net_type",)),
        IFDEFDIRECTIVE: application(IFDEFDIRECTIVE, optional=("condition", "branches.condition"),
                                    scopes=_ifdef_scopes),
        DISABLEDTEXT: application(DISABLEDTEXT, required=("text",)),
        OTHERDIRECTIVE: application(OTHERDIRECTIVE, required=("text",)),
        COMMENT: application(COMMENT),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms its positions hold, imported when first needed."""
    from ..Assertions import Expressions as Assertions
    from ..Constraints import Expressions as Constraints
    from ..Patterns import Expressions as Patterns
    from ..Types import Expressions as Types
    return X.DIALECT, Types.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Constraints.DIALECT


DIALECT = F.Dialect("SystemVerilog.Preprocessor", _kinds(), domain_of=X._untyped, reads=_reads)
"""The SystemVerilog Preprocessor dialect: its kinds, as the framework reads them, and the terms of its family's
dialects."""
