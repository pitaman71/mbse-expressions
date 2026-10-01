"""Symbolics: names, the scopes that resolve them, and the dependencies an expression declares.

An expression refers to names: its references. A binding (a let) binds a name within its body, an import binds the
names it declares (`binds()`) within its body, and some names are ambient, bound without a declaration (Python's
builtins). `free(expression)` is the set of names an expression needs from outside: its lexical references that
nothing within it binds. `imports(expression)` lists the imports it declares: what it needs its scope to provide.

A `Scope` is where references are resolved at evaluation, in the dialect's own way: `lookup(reference)` gives a
reference's value, `bind(name, value)` the scope within a binding, and `enter(declaration)` the scope within an
import. `Variables` is the scope of dialects whose references are names bound to values; dialects with imports,
packages or workbooks derive their own. An evaluator given a mapping instead of a scope makes its dialect's scope from
it, so `Evaluators.OfAny(expression, {'this': value})` binds `this`. A scope decides what an import may bring in:
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
        raise KeyError(f"{type(reference).KIND} {Terms.name_of(reference)!r} is not bound")

    def bind(self, name: str, value: Any) -> Variables:
        inner = self._copy()
        inner.values = self.values.new_child({name: value})
        return inner

    def enter(self, declaration: Any) -> Variables:
        raise NotImplementedError(f"{type(self).__name__} has no {type(declaration).KIND}s")

    def _copy(self) -> Any:
        inner = object.__new__(type(self))
        inner.__dict__.update(self.__dict__)
        return inner


def _data(expression: Any) -> Any:
    """An expression, or a `Term`'s."""
    return expression.data if isinstance(expression, Terms.Term) else expression


def free(expression: Any) -> set[str]:
    """The names `expression` (an expression or a `Term`) needs from its scope: its lexical references that no binding or import within it binds,
    and that are not ambient. Shared sub-expressions and cycles are visited once per set of bound names."""
    found: set[str] = set()
    seen: set[tuple[int, frozenset[str]]] = set()

    def visit(node: Any, bound: frozenset[str]) -> None:
        if not isinstance(node, Terms.Node) or (id(node), bound) in seen:
            return
        seen.add((id(node), bound))
        kind = type(node)
        name = Terms.name_of(node)
        if kind.ROLE == Terms.REFERENCE:
            if kind.LEXICAL and name not in bound and name not in kind.AMBIENT:
                found.add(name)
            return
        arguments = node._arguments()
        scopes = [bound] * len(arguments)
        if kind.ROLE in (Terms.BINDING, Terms.QUANTIFIER):
            scopes = [bound, *[bound | {name}] * (len(arguments) - 1)]
        elif kind.ROLE == Terms.IMPORT:
            scopes = [bound | set(node.binds())] * len(arguments)
        for argument, scope in zip(arguments, scopes):
            visit(argument, scope)

    visit(_data(expression), frozenset())
    return found


def imports(expression: Any) -> list[Any]:
    """The imports `expression` (an expression or a `Term`) declares, each once, in the order `Terms.walk` visits them."""
    return [node for node in Terms.walk(_data(expression)) if type(node).ROLE == Terms.IMPORT]
