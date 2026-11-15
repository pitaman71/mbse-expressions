"""Expressions of the Python Patterns dialect: the patterns of Python's `match` statement, a grammar of their own (the
Language Reference, 8.6.4, "Patterns"), as mbse-programs has them.

It is a dialect of the Python family (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "if the standard says it's a
sublanguage then it's definitely at least a separate dialect"; mbse-basis [CAP-276: Python's type expressions and match patterns as data](mbse:mbse-basis/docs/capabilities/CAP-276.md)), named `Python Patterns`
(`Terms.dialect_name`), its tag `python_patterns`. Its terms are values of its `Term`,
`Expressions.Python.Patterns.Term`, the branch `python_patterns` of `Expressions.Framework.Term`. A `match` is a
statement, so no subterm of `Python3` is a pattern: mbse-programs' `case` holds one through this dialect's holder,
`Expressions.Python.Patterns.Expression`, which refines `Expressions.Framework.Expression`, its `root` narrowed to its
`Term`. Its `Term` lists none of `Python3`'s branches: an expression in a pattern is a kind's own subterm, of
`Expressions.Python.Python3.Term`.

Its kinds are mbse-programs' patterns (`mbse:mbse-programs/python3/mbse/Programs/Python/Syntax.py`), as `ast` has them,
with mbse-programs' names, lowercased as branch tags, and its properties in source order, each a value object
`Expressions.Python.Patterns.<Kind>`; a name is a `str`, as `Python3` keeps `ast`'s:

- `matchvalue` (`value`: a literal, or a dotted name, a `Python3` term) and `matchsingleton` (`value`: `None`, `True`
  or `False`, compared by identity);
- `matchsequence` (`[p, q]`, `(p, q)`, or `p, q` without `delimiters`, its `patterns`);
- `matchmapping` (`{key: pattern, **rest}`: its `keys`, `Python3` terms, and its `patterns`, which pair up, and its
  `rest`, a name);
- `matchclass` (`cls(pattern, kwd_attr=kwd_pattern)`: `cls`, a `Python3` term, its positional `patterns`, and its
  `kwd_attrs`, names, and `kwd_patterns`, which pair up);
- `matchstar` (`*name` in a sequence pattern, `*_` without a name);
- `matchas` (`pattern as name`; a capture `name` without a pattern; the wildcard `_` without either, never a pattern
  without a name, as `ast` has it);
- `matchor` (`pattern | pattern`, two at least);

then the framework's kinds of invalid syntax, `error` and `missing`. `matchmapping` and `matchclass` each hold two
containers of terms (`keys` and `patterns`; `patterns` and `kwd_patterns`), read in declaration order, a form's
attributes giving each one's size (the API, item 210), and are checked as mbse-programs checks them ("a MatchMapping
needs a pattern for each key", "a MatchClass needs a pattern for each keyword", "a MatchOr needs two patterns").

What a pattern binds is its capture names (`bound_names`), which the `case` that holds it binds in its guard and its
body: a pattern binds, but is no binder of its own, as SystemVerilog's patterns are not (the API, item 189), so none of
its kinds refines `Let` and none has scopes. Its kinds are applications the framework reads by their structure, of no
domain known statically, and are not simplified: Python3's rules leave each in the residual, named ("Python Patterns matchas is
not evaluated").

The versions of Python it covers are data, which `define` writes: Python 3.10 to 3.15, each with its own kinds it has
(`SINCE`: every one since Python 3.10). `DIALECT` reads its kinds and its family's other dialects' terms. `Text` writes
its kinds as Python source, as the family's printer (`Python3.Text.ToText`) dispatches them to it. Its terms are
written through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda u: u.matchas(lambda m: m.name("x"))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..Python3 import Domains as _family, Expressions as P

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "SINGLETONS", "DELIMITERS", "bound_names",
           "problems"]

MATCHVALUE, MATCHSINGLETON, MATCHSEQUENCE, MATCHMAPPING, MATCHCLASS, MATCHSTAR, MATCHAS, MATCHOR = (
    "matchvalue", "matchsingleton", "matchsequence", "matchmapping", "matchclass", "matchstar", "matchas", "matchor")

TAGS = (MATCHVALUE, MATCHSINGLETON, MATCHSEQUENCE, MATCHMAPPING, MATCHCLASS, MATCHSTAR, MATCHAS, MATCHOR)
"""Its own kinds, in its `Term`'s order, as mbse-programs lists them."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none, its names being `str`s."""

SINCE = dict.fromkeys(TAGS, 10)
"""The minor version of Python 3 each of its kinds arrived in, as mbse-programs' `SINCE` has them (`py(10)`, every
one), from which `define` writes the kinds each version has."""

SINGLETONS = ("None", "True", "False")
"""What a `matchsingleton` compares by identity, as mbse-programs' `Singleton` has them."""

DELIMITERS = ("[]", "()")
"""A `matchsequence`'s delimiters, where it has them, as mbse-programs' `Delimiter` has them."""


def install(txn: Any) -> Any:
    """Python Patterns' union of its kinds, added to the framework's terms as the branch `python_patterns`, its own
    kinds, and its dialect's schema, whose singleton is `Expressions.Python.Patterns`: run after `Framework.install`, in
    a transaction of its own, before or after its family's other installs; run again, it writes nothing. `Python3`'s
    `Term`, its expression subterms' schema, is named, created where that install has not run. Its holder,
    `Expressions.Python.Patterns.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
    `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.Python.Patterns/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject,
                  # `Python3`'s union of its kinds, by name: its install's, created here where it has not run
                  "Python3Term": S.OfUnion,
                  "MatchValue": S.OfObject, "MatchSingleton": S.OfObject, "MatchSequence": S.OfObject,
                  "MatchMapping": S.OfObject, "MatchClass": S.OfObject, "MatchStar": S.OfObject, "MatchAs": S.OfObject,
                  "MatchOr": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.Python.Patterns`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Python.Patterns.Dialect").ref(True).singleton("Expressions.Python.Patterns").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("python_patterns").schema([_.Dialect])]),
            # its union of its kinds: its own, and invalid syntax
            lambda _: _.Term.name("Expressions.Python.Patterns.Term").branches([
                lambda t: t.name("matchvalue").schema([_.MatchValue]),
                lambda t: t.name("matchsingleton").schema([_.MatchSingleton]),
                lambda t: t.name("matchsequence").schema([_.MatchSequence]),
                lambda t: t.name("matchmapping").schema([_.MatchMapping]),
                lambda t: t.name("matchclass").schema([_.MatchClass]),
                lambda t: t.name("matchstar").schema([_.MatchStar]),
                lambda t: t.name("matchas").schema([_.MatchAs]),
                lambda t: t.name("matchor").schema([_.MatchOr]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Python3Term.name("Expressions.Python.Python3.Term"),
            # patterns (8.6.4), each nested pattern this dialect's term, each expression `Python3`'s
            lambda _: _.MatchValue.name("Expressions.Python.Patterns.MatchValue").properties({"value": _.Python3Term}),
            lambda _: _.MatchSingleton.name("Expressions.Python.Patterns.MatchSingleton").properties({"value": S.OfStr}),
            lambda _: _.MatchSequence.name("Expressions.Python.Patterns.MatchSequence").properties({
                "delimiters": S.OfStr,  # absent: an open sequence, `case a, b:`
                "patterns": many(_.Term)}),
            lambda _: _.MatchMapping.name("Expressions.Python.Patterns.MatchMapping").properties({
                "keys": many(_.Python3Term), "patterns": many(_.Term), "rest": S.OfStr}),
            lambda _: _.MatchClass.name("Expressions.Python.Patterns.MatchClass").properties({
                "cls": _.Python3Term, "patterns": many(_.Term), "kwd_attrs": many(S.OfStr), "kwd_patterns": many(_.Term)}),
            lambda _: _.MatchStar.name("Expressions.Python.Patterns.MatchStar").properties({"name": S.OfStr}),
            lambda _: _.MatchAs.name("Expressions.Python.Patterns.MatchAs").properties({"pattern": _.Term, "name": S.OfStr}),
            lambda _: _.MatchOr.name("Expressions.Python.Patterns.MatchOr").properties({"patterns": many(_.Term)}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.Python.Patterns.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("python_patterns").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """Python Patterns' dialect as data: the singleton `Expressions.Python.Patterns` owning the versions of Python 3 it
    covers, by their published names (`standards`), Python 3.10 to 3.15, each with its body, its version and its own
    kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame
    binds the dialect (`dialect`) and each version by its name spelled as an identifier (`Python_3_10`)."""
    OWN, Standard = txn.Expressions.Python.Patterns, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}
    minors = range(10, 16)

    def version(minor: int) -> Callable[[Any], Any]:
        kinds = [schema for tag, schema in every.items() if SINCE[tag] <= minor]
        return lambda _: getattr(_, f"Python_3_{minor}").bodies(["org.python"]).revision(
            lambda r: r.version(f"3.{minor}")).kinds(kinds)

    return txn.uid("mbse.Expressions.Python.Patterns.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, **{f"Python_3_{minor}": Standard for minor in minors}})
        .spec([
            lambda _: _.dialect.standards({f"Python 3.{minor}": lambda e, minor=minor: e.standard(
                getattr(_, f"Python_3_{minor}")) for minor in minors}),
            *(version(minor) for minor in minors),
        ])]))])


def bound_names(pattern: Any) -> frozenset[str]:
    """The names a pattern binds, its capture names, wherever its sequence, mapping, class, `as` and `or` patterns nest
    them, which the `case` that holds it binds in its guard and its body (8.6.4): an `as` pattern's and a star
    pattern's name, and a mapping pattern's rest; none of a value or a singleton pattern, of a wildcard, of an
    expression a pattern holds (whose names are references) or of invalid syntax."""
    tag, record = F.kind_of(pattern)
    node = F.node(tag, record)
    names = {node.attributes[name] for name in ("name", "rest") if tag in (MATCHSTAR, MATCHAS, MATCHMAPPING)
             and name in node.attributes}
    if tag in (MATCHSEQUENCE, MATCHMAPPING, MATCHCLASS, MATCHOR):
        inner = node.many[len(node.lists.get("keys", ())):]  # its patterns, after a mapping's keys
        return frozenset(names).union(*(bound_names(item) for item in inner))
    if tag == MATCHAS and node.subterms["pattern"] is not None:
        return frozenset(names) | bound_names(node.subterms["pattern"])
    return frozenset(names)


def _capture(what: str, value: Any) -> list[str]:
    """A capture name, if given: an identifier, and not `_`, which captures nothing (the wildcard)."""
    if value == "_":
        return [f"{what} cannot be '_'"]
    return P._identifier_problems(what, value)


def problems(node: F.Node) -> list[str]:
    """A node's checks: mbse-programs' (a choice among a few, a mapping's pattern for each key, a class's pattern for
    each keyword, an `or` of two patterns), `ast`'s (an `as` pattern with a pattern has a name, the wildcard being one
    with neither), and its names' (an identifier, a capture name not `_`)."""
    found: list[str] = []
    attributes, lists = node.attributes, node.lists
    if node.kind == MATCHSINGLETON and "value" in attributes and attributes["value"] not in SINGLETONS:
        found.append(f"MatchSingleton.value cannot be {attributes['value']!r}")
    elif node.kind == MATCHSEQUENCE and "delimiters" in attributes and attributes["delimiters"] not in DELIMITERS:
        found.append(f"MatchSequence.delimiters cannot be {attributes['delimiters']!r}")
    elif node.kind == MATCHMAPPING:
        if len(lists["keys"]) != len(lists["patterns"]):
            found.append("a MatchMapping needs a pattern for each key")
        found += _capture("a matchmapping's rest", attributes.get("rest"))
    elif node.kind == MATCHCLASS:
        attrs = attributes["kwd_attrs"].values if "kwd_attrs" in attributes else ()
        if len(attrs) != len(lists["kwd_patterns"]):
            found.append("a MatchClass needs a pattern for each keyword")
        for attr in attrs:
            found += P._identifier_problems("a matchclass's kwd_attr", attr)
    elif node.kind in (MATCHSTAR, MATCHAS):
        if node.kind == MATCHAS and node.subterms["pattern"] is not None and "name" not in attributes:
            found.append("a matchas with a pattern needs a name")  # as `ast` has it: a wildcard has no pattern
        found += _capture(f"{F._article(node.kind)}'s name", attributes.get("name"))
    elif node.kind == MATCHOR and len(node.many) < 2:
        found.append("a MatchOr needs two patterns")
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    return lambda record: problems(F.node(tag, record))


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds: applications, of no domain known statically (`Opaque`)."""

    def application(tag: str, **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), **options)

    return {
        MATCHVALUE: application(MATCHVALUE),
        MATCHSINGLETON: application(MATCHSINGLETON, required=("value",)),
        MATCHSEQUENCE: application(MATCHSEQUENCE),
        MATCHMAPPING: application(MATCHMAPPING),
        MATCHCLASS: application(MATCHCLASS),
        MATCHSTAR: application(MATCHSTAR),
        MATCHAS: application(MATCHAS, optional=("pattern",)),
        MATCHOR: application(MATCHOR),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms are its subterms, imported when first needed."""
    from ..RegExp import Expressions as PythonRegExp
    from ..Types import Expressions as PythonTypes
    return P.DIALECT, PythonTypes.DIALECT, PythonRegExp.DIALECT


DIALECT = F.Dialect("Python.Patterns", _kinds(), domain_of=_family.of, reads=_reads)
"""The Python Patterns dialect: its kinds, as the framework reads them, and its family's other dialects' terms."""
