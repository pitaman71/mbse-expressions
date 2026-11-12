"""Expressions of the Python Types dialect: Python's type expressions, as the typing specification defines them
(typing.python.org, "Type annotations"), and its type parameter lists (the Language Reference, 8.11), as mbse-programs
has them.

It is a dialect of the Python family (the dialects proposal, Decided for stage 6: "most languages will have a dialect for
type expressions"; Retrofit's design, Python), named `Python Types` (`Terms.dialect_name`), its tag `python_types`. Its
terms are values of its `Term`, `Expressions.Python.Types.Term`, the branch `python_types` of
`Expressions.Framework.Term`. A type expression's terms are Python expressions, and an annotation, a bound or a default
may be any expression in Python's grammar (which ones the typing specification allows is a constraint, the dialects
proposal's Decided, 4), so its `Term` lists every branch of `Expressions.Python.Python3.Term`, which that dialect's
install adds, then its own kinds and invalid syntax ("(b)"). `Python3`'s parameter (`arg`) holds it as its
`annotation`; mbse-programs' annotations, return types, type aliases' values and type parameter lists hold it through
this dialect's holder, `Expressions.Python.Types.Expression`, which refines `Expressions.Framework.Expression`, its
`root` narrowed to its `Term`.

Its own kinds are mbse-programs' type parameters (`mbse:mbse-programs/python3/mbse/Programs/Python/Syntax.py`), as `ast`
has them, a category of their own, neither a statement nor an expression, with mbse-programs' names, lowercased as
branch tags, and its properties in source order, each a value object `Expressions.Python.Types.<Kind>`, its name a
`str`, as `Python3` keeps `ast`'s, its type expressions this dialect's `Term`:

- `typevar` (`name: bound = default_value`, its bound and its default optional);
- `paramspec` (`**name = default_value`) and `typevartuple` (`*name = default_value`), their defaults optional.

A type parameter declares a name that the statement listing it binds (a generic function, class or type alias), not a
term: none of its kinds refines `Let` and none has scopes, so a name its bound or its default refers to is a reference
the scope binds. Its kinds are applications the framework reads by their structure, of no domain known statically, and
are not evaluated: Python3's evaluator refuses each by name ("Python Types typevar is not evaluated"); a type expression
of `Python3`'s kinds evaluates as `Python3` evaluates it.

The versions of Python it covers are data, which `define` writes: Python 3.0 to 3.15, as `Python3`'s, each with its own
kinds it has (`SINCE`: every one since Python 3.12; a default, 3.13, a feature within a kind, not recorded).
`DIALECT` reads its kinds and its family's other dialects' terms. `Text` writes its kinds as Python source, as the
family's printer (`Python3.Text.ToText`) dispatches them to it. Its terms are written through the builders (mbse-basis
[PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)), a type expression of `Python3`'s kinds
through its writers too: `lambda u: u.typevar(lambda t: t.name("T").bound(Python3.name("int")))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..Python3 import Domains as _family, Expressions as P

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS"]

TYPEVAR, PARAMSPEC, TYPEVARTUPLE = "typevar", "paramspec", "typevartuple"

TAGS = (TYPEVAR, PARAMSPEC, TYPEVARTUPLE)
"""Its own kinds, in its `Term`'s order after `Python3`'s branches, as mbse-programs lists them."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none, its names being `str`s."""

SINCE = dict.fromkeys(TAGS, 12)
"""The minor version of Python 3 each of its kinds arrived in, as mbse-programs' `SINCE` has them (`py(12)`, every
one), from which `define` writes the kinds each version has."""


def install(txn: Any) -> Any:
    """Python Types' union of its kinds, added to the framework's terms as the branch `python_types`, its own kinds, and
    its dialect's schema, whose singleton is `Expressions.Python.Types`: run after `Framework.install`, in a transaction
    of its own, before or after its family's other installs; run again, it writes nothing. `Python3`'s install adds its
    branches to this `Term`. Its holder, `Expressions.Python.Types.Expression`, refines
    `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.Python.Types/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "TypeVar": S.OfObject, "ParamSpec": S.OfObject, "TypeVarTuple": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.Python.Types`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Python.Types.Dialect").ref(True).singleton("Expressions.Python.Types").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("python_types").schema([_.Dialect])]),
            # its union of its kinds: `Python3`'s branches, which that dialect's install adds, its own, and invalid syntax
            lambda _: _.Term.name("Expressions.Python.Types.Term").branches([
                lambda t: t.name("typevar").schema([_.TypeVar]),
                lambda t: t.name("paramspec").schema([_.ParamSpec]),
                lambda t: t.name("typevartuple").schema([_.TypeVarTuple]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # type parameters (8.11), each a name and its type expressions, this dialect's terms
            lambda _: _.TypeVar.name("Expressions.Python.Types.TypeVar").properties({
                "name": S.OfStr, "bound": _.Term, "default_value": _.Term}),
            lambda _: _.ParamSpec.name("Expressions.Python.Types.ParamSpec").properties({
                "name": S.OfStr, "default_value": _.Term}),
            lambda _: _.TypeVarTuple.name("Expressions.Python.Types.TypeVarTuple").properties({
                "name": S.OfStr, "default_value": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.Python.Types.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("python_types").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """Python Types' dialect as data: the singleton `Expressions.Python.Types` owning the versions of Python 3 it covers,
    by their published names (`standards`), Python 3.0 to 3.15, each with its body, its version and its own kinds it has
    (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the
    dialect (`dialect`) and each version by its name spelled as an identifier (`Python_3_12`)."""
    OWN, Standard = txn.Expressions.Python.Types, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}
    minors = range(16)

    def version(minor: int) -> Callable[[Any], Any]:
        kinds = [schema for tag, schema in every.items() if SINCE[tag] <= minor]
        return lambda _: getattr(_, f"Python_3_{minor}").bodies(["org.python"]).revision(
            lambda r: r.version(f"3.{minor}")).kinds(kinds)

    return txn.uid("mbse.Expressions.Python.Types.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, **{f"Python_3_{minor}": Standard for minor in minors}})
        .spec([
            lambda _: _.dialect.standards({f"Python 3.{minor}": lambda e, minor=minor: e.standard(
                getattr(_, f"Python_3_{minor}")) for minor in minors}),
            *(version(minor) for minor in minors),
        ])]))])


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds: applications, of no domain known statically (`Opaque`), each needing a
    name that is an identifier."""

    def application(tag: str, optional: tuple[str, ...]) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=FD.Opaque(), required=("name",), optional=optional,
                      check=P._identifier("name", f"{F._article(tag)}'s name"))

    return {
        TYPEVAR: application(TYPEVAR, ("bound", "default_value")),
        PARAMSPEC: application(PARAMSPEC, ("default_value",)),
        TYPEVARTUPLE: application(TYPEVARTUPLE, ("default_value",)),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms its positions hold, imported when first needed."""
    from ..Patterns import Expressions as PythonPatterns
    from ..RegExp import Expressions as PythonRegExp
    return P.DIALECT, PythonPatterns.DIALECT, PythonRegExp.DIALECT


DIALECT = F.Dialect("Python.Types", _kinds(), domain_of=_family.of, literal=P._native, reads=_reads)
"""The Python Types dialect: its kinds, as the framework reads them, and its family's other dialects' terms."""
