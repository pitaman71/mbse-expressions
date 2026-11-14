"""Symbolics: names, the scopes that resolve them, and the dependencies an expression declares.

An expression refers to names: its references. A binding (a let, or any binder: `Terms.is_binder`) binds a name
within its body, an import binds the names it declares (its kind's `names`) within its body, a kind with `scopes` binds
the names it gives each argument (a binder's, a comprehension's targets, a lambda's parameters), and some names are ambient, bound without a declaration (Python's
builtins). `free(term, dialect)` is the set of names an expression needs from outside: its lexical references that
nothing within it binds. `imports(term, dialect)` lists the imports it declares: what it needs its scope to provide.

A `Scope` is where references are resolved at simplification, in the dialect's own way: `lookup(reference)` gives a
reference's value, `bind(name, value)` the scope within a binding, and `enter(declaration)` the scope within an
import. `Variables` is the scope of dialects whose references are names bound to values; dialects with imports,
packages or workbooks derive their own. A simplifier given a mapping instead of a scope makes its dialect's scope from
it, so `Simplifiers.OfAny(expression, {'person': value})` binds `person`. A scope decides what an import may bring in:
imports resolve only what the caller's scope allows, never by loading code.

What a scope does not bind is not an error: a reference it cannot resolve (an unbound name, a function or an import it
does not provide) raises `Unbound`, which the simplifier catches, leaving the reference in the residual (see
`Simplifiers`); a name bound to `UNKNOWN` is unbound too, as a binding hides a name its simplifier does not know the
value of. `Unbound` never leaves a simplifier. `scopes(node, dialect)` gives the names a term binds for each of its
arguments, which `free` and the simplifier read alike.
"""

from __future__ import annotations

from collections import ChainMap
from collections.abc import Mapping
from typing import Any, Protocol, runtime_checkable

from . import Terms

__all__ = ["Scope", "Variables", "Unbound", "UNKNOWN", "free", "imports", "scopes"]


class Unbound(Exception):
    """Raised by a scope for a reference it does not resolve: a name it does not bind (or binds to `UNKNOWN`), a
    function or an import it does not provide. The simplifier catches it, leaving the reference in the residual."""


class _Unknown:
    def __repr__(self) -> str:
        return "UNKNOWN"


UNKNOWN: Any = _Unknown()
"""The value a scope binds a name to whose value is not known: looking it up raises `Unbound`."""


@runtime_checkable
class Scope(Protocol):
    """Where references are resolved."""

    def lookup(self, reference: Any) -> Any:
        """The value of a reference."""
        ...

    def bind(self, name: str, value: Any) -> Scope:
        """This scope, with `name` bound to `value`."""
        ...

    def enter(self, declaration: Any) -> Scope:
        """This scope, with what an import declares."""
        ...


class Variables:
    """A scope of named values: a reference's value is its name's innermost binding, then the variable of that name;
    a reference to neither, or to a name bound to `UNKNOWN`, raises `Unbound`. It has no imports: entering one raises
    `Unbound` too, the import left in the residual."""

    def __init__(self, variables: Mapping[str, Any] | None = None):
        self.values: ChainMap[str, Any] = ChainMap({}, dict(variables or {}))

    def lookup(self, reference: Any) -> Any:
        return self.value(Terms.name_of(reference))

    def value(self, name: Any) -> Any:
        """The value bound to `name`; raises `Unbound` when there is none, or it is `UNKNOWN`."""
        value = self.values.get(name, UNKNOWN)
        if value is UNKNOWN:
            raise Unbound(name)
        return value

    def bind(self, name: str, value: Any) -> Variables:
        inner = self._copy()
        inner.values = self.values.new_child({name: value})
        return inner

    def enter(self, declaration: Any) -> Variables:
        raise Unbound(Terms.kind_of(declaration)[0])

    def _copy(self) -> Any:
        inner = object.__new__(type(self))
        inner.__dict__.update(self.__dict__)
        return inner


def scopes(node: Any, dialect: Terms.Dialect) -> list[frozenset[str]]:
    """The names a term binds for each of its arguments (`Terms.arguments_of`), its kind read as `dialect` reads it: a
    kind's `scopes` (a comprehension's targets, a lambda's parameters); a let's or a quantifier's name, after its first
    argument; an import's names, for every argument; none, for any other."""
    _, record, kind = dialect.kind(node)
    arguments = Terms.arguments_of(record)
    if kind.scopes is not None:
        return [frozenset(names) for names in kind.scopes(record)]
    if kind.role == Terms.QUANTIFIER or Terms._lets(kind, record):
        return [frozenset(), *[frozenset({Terms.name_of(node)})] * (len(arguments) - 1)]
    if kind.role == Terms.IMPORT:
        return [frozenset(kind.names(Terms.attributes_of(record)) if kind.names is not None else ())] * len(arguments)
    return [frozenset()] * len(arguments)


def free(term: Any, dialect: Terms.Dialect) -> set[str]:
    """The names a term needs from its scope: its lexical references that no binding or import within it binds, and that
    are not ambient, its kinds read as `dialect` reads them."""
    found: set[str] = set()

    def visit(node: Any, bound: frozenset[str]) -> None:
        tag, record, kind = dialect.kind(node)
        name = Terms.name_of(node)
        if kind.role == Terms.REFERENCE:
            if kind.lexical and name is not None and name not in bound and name not in kind.ambient:
                found.add(name)
            if not isinstance(Terms.attributes_of(record).get("name"), Terms.Part):
                return  # a name node's terms (a template's arguments) are its arguments, as an application's
        for argument, names in zip(Terms.arguments_of(record), scopes(node, dialect)):
            if argument is not None:
                visit(argument, bound | names)

    visit(Terms.term(term), frozenset())
    return found


def imports(term: Any, dialect: Terms.Dialect) -> list[Any]:
    """The imports a term declares, in the order `Terms.walk` visits them."""
    return [node for node in Terms.walk(term) if dialect.kind(node)[2].role == Terms.IMPORT]
