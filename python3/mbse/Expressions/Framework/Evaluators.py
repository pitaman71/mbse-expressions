"""Evaluators: the protocols for computing an expression's value, and an interpreter that dialects build theirs on.

An `Evaluator` computes the value of any expression of its dialect in a scope; each dialect's `Evaluators.OfAny` is
one. The value domains, the treatment of unknown values and the rules of each operator are the dialect's own: evaluation is
where dialects differ most.

Evaluation resolves references in a scope (see `Symbolics`): an evaluator given a mapping instead of a scope makes its
dialect's scope from it, so `Evaluators.OfAny(expression, {'person': value})` binds `person`.

`Interpreter` evaluates a term value by its kind's role (see `Terms`): a literal gives its value (through `literal`, or
`typed` when its kind's attributes give it a domain of its own, as C's type does a constant), a reference what
the scope resolves, a binding its body in the scope with its name bound, and an import its body in the scope it
declares. An application calls its operator's implementation from `operations`, with one thunk per argument, so that
implementations decide which arguments to evaluate and when, and so does a quantifier, whose second thunk takes an item
and evaluates the body with the name bound to it; the implementation of a kind whose vocabulary is open is
one callable for every name, and operators outside a closed vocabulary go to `extension`, if given. It raises on what
`Dialect.validate` reports: operations outside the vocabulary, wrong numbers of arguments, unbound references and missing
values. An evaluator takes a term value, or anything `Terms.term` reads one from (an `Expression`, a term property).
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any, Protocol, runtime_checkable

from . import Symbolics, Terms
from .Symbolics import Scope, Variables

__all__ = ["Evaluator", "Interpreter", "Thunk", "Implementation"]

Thunk = Callable[[], Any]
Implementation = Callable[[list[Thunk], Any, Any], Any]
"""Computes an operation's value from thunks for its arguments, the term (for its attributes) and the scope."""


@runtime_checkable
class Evaluator(Protocol):
    """Computes the value of a term in `scope`, or with the variables in a mapping bound."""

    def __call__(self, expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any: ...


class Interpreter:
    """Evaluates the terms of `dialect`. `operations` maps each application kind's tag to its implementations by
    operator name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's value
    into the dialect's domain of values, and `typed(domain, value)` gives the value of a literal whose kind gives it a
    domain of its own (`Kind.typed`; without it, evaluating one raises `NotImplementedError`); `scope` makes the dialect's scope from a mapping
    of variables, and `extension(operator, arguments, node, scope)` evaluates operators outside a kind's vocabulary."""

    def __init__(self, dialect: Terms.Dialect, operations: Mapping[str, Any], *,
                 literal: Callable[[Any], Any] = lambda value: value,
                 typed: Callable[[Any, Any], Any] | None = None,
                 scope: Callable[[Mapping[str, Any]], Scope] = Variables,
                 extension: Callable[[str, list[Thunk], Any, Any], Any] | None = None):
        self.dialect, self.operations, self._literal, self._typed = dialect, operations, literal, typed
        self._scope, self._extension = scope, extension

    def __call__(self, expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
        """The value of a term (see `Terms.term`)."""
        if not isinstance(scope, Symbolics.Scope):
            scope = self._scope(dict(scope or {}))
        return self.evaluate(Terms.term(expression), scope)

    def evaluate(self, node: Any, scope: Any) -> Any:
        tag, record, kind = self.dialect.kind(node)
        if kind.role == Terms.LITERAL:
            value = Terms.attributes_of(record).get("value")
            if value is None:
                raise ValueError(f"{Terms._article(tag)} needs a value")
            typed = kind.typed(record) if kind.typed is not None else None
            if typed is None:
                return self._literal(value)
            if self._typed is None:
                raise NotImplementedError(f"this evaluator has no values of {typed.name()}")
            return self._typed(typed, value)
        if kind.role == Terms.REFERENCE:
            return scope.lookup(node)
        arguments = Terms.arguments_of(record)
        if kind.role in (Terms.BINDING, Terms.IMPORT, Terms.QUANTIFIER):
            slots, _, _ = Terms._parts(record.as_schema())
            for slot, argument in zip(slots, arguments):
                if argument is None:
                    raise ValueError(f"{Terms._article(tag)} needs {Terms._article(slot)}")
            if kind.role == Terms.QUANTIFIER:
                return self._apply(node, tag, kind, arguments, scope)
            if kind.role == Terms.IMPORT:
                return self.evaluate(arguments[0], scope.enter(node))
            bound = self.evaluate(arguments[0], scope)
            return self.evaluate(arguments[1], scope.bind(Terms.name_of(node), bound))
        return self._apply(node, tag, kind, arguments, scope)

    def _apply(self, node: Any, tag: str, kind: Terms.Kind, arguments: tuple[Any, ...], scope: Any) -> Any:
        operator = Terms.operator_of(node, kind)
        implementations = self.operations[tag]
        thunks = [lambda argument=argument: self.evaluate(argument, scope) for argument in arguments]
        if kind.role == Terms.QUANTIFIER:  # the arguments after the collection, of an item: evaluated with the name bound
            name = Terms.name_of(node)
            for i in range(1, len(arguments)):
                thunks[i] = lambda item, argument=arguments[i]: self.evaluate(  # type: ignore[assignment]
                    argument, scope.bind(name, item))
        if kind.vocabulary is None:
            return implementations(thunks, node, scope)
        if operator not in implementations:
            if self._extension is not None:
                return self._extension(operator, thunks, node, scope)
            if kind.closed:
                raise NotImplementedError(f"{operator!r} is not an operation {self.dialect.name()} defines")
            raise NotImplementedError(f"{operator!r} is not a core operation")
        arity = kind.vocabulary[operator].arity()
        if arity >= 0 and len(arguments) != arity:  # a negative arity takes any number
            raise TypeError(f"{operator} takes {arity} arguments, got {len(arguments)}")
        return implementations[operator](thunks, node, scope)
