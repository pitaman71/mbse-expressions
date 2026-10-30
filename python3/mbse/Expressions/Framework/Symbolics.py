"""Symbolics: names, the scopes that resolve them, and the dependencies an expression declares.

An expression refers to names: its references. A binding (a let) binds a name within its body, an import binds the
names it declares (its kind's `names`) within its body, and some names are ambient, bound without a declaration (Python's
builtins). `free(term, dialect)` is the set of names an expression needs from outside: its lexical references that
nothing within it binds. `imports(term, dialect)` lists the imports it declares: what it needs its scope to provide.

A `Scope` is where references are resolved at evaluation, in the dialect's own way: `lookup(reference)` gives a
reference's value, `bind(name, value)` the scope within a binding, and `enter(declaration)` the scope within an
import. `Variables` is the scope of dialects whose references are names bound to values; dialects with imports,
packages or workbooks derive their own. An evaluator given a mapping instead of a scope makes its dialect's scope from
it, so `Evaluators.OfAny(expression, {'person': value})` binds `person`. A scope decides what an import may bring in:
imports resolve only what the caller's scope allows, never by loading code.
"""

from __future__ import annotations

from collections import ChainMap
from collections.abc import Mapping
from typing import Any, Protocol, runtime_checkable

from . import Terms

__all__ = ["Scope", "Variables", "free", "imports"]


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
    """A scope of named values: a reference's value is its name's innermost binding, then the variable of that name.
    `unbound(reference)` gives the value of a reference to neither, by default raising `KeyError`. It has no imports."""

    def __init__(self, variables: Mapping[str, Any] | None = None):
        self.values: ChainMap[str, Any] = ChainMap({}, dict(variables or {}))

    def lookup(self, reference: Any) -> Any:
        name = Terms.name_of(reference)
        return self.values[name] if name in self.values else self.unbound(reference)

    def unbound(self, reference: Any) -> Any:
        raise KeyError(f"{Terms.kind_of(reference)[0]} {Terms.name_of(reference)!r} is not bound")

    def bind(self, name: str, value: Any) -> Variables:
        inner = self._copy()
        inner.values = self.values.new_child({name: value})
        return inner

    def enter(self, declaration: Any) -> Variables:
        raise NotImplementedError(f"{type(self).__name__} has no {Terms.kind_of(declaration)[0]}s")

    def _copy(self) -> Any:
        inner = object.__new__(type(self))
        inner.__dict__.update(self.__dict__)
        return inner


def free(term: Any, dialect: Terms.Dialect) -> set[str]:
    """The names a term needs from its scope: its lexical references that no binding or import within it binds, and that
    are not ambient, its kinds read as `dialect` reads them."""
    found: set[str] = set()

    def visit(node: Any, bound: frozenset[str]) -> None:
        tag, record, kind = dialect.kind(node)
        name = Terms.name_of(node)
        if kind.role == Terms.REFERENCE:
            if kind.lexical and name not in bound and name not in kind.ambient:
                found.add(name)
            return
        arguments = Terms.arguments_of(record)
        scopes = [bound] * len(arguments)
        if kind.role in (Terms.BINDING, Terms.QUANTIFIER):
            scopes = [bound, *[bound | {name}] * (len(arguments) - 1)]
        elif kind.role == Terms.IMPORT:
            scopes = [bound | set(kind.names(Terms.attributes_of(record)) if kind.names is not None else ())] * len(arguments)
        for argument, scope in zip(arguments, scopes):
            if argument is not None:
                visit(argument, scope)

    visit(Terms.term(term), frozenset())
    return found


def imports(term: Any, dialect: Terms.Dialect) -> list[Any]:
    """The imports a term declares, in the order `Terms.walk` visits them."""
    return [node for node in Terms.walk(term) if dialect.kind(node)[2].role == Terms.IMPORT]
