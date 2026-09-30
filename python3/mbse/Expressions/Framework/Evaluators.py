"""Evaluators: the protocols for computing an expression's value, and an interpreter that dialects build theirs on.

An `Evaluator` computes the value of any expression of its dialect with the variables in a scope bound; each dialect's
`Evaluators.OfAny` is one. A `Predicate` is what mbse-schemas' validators take to test union branches: `(predicate,
value) -> bool | None`. The value domains, the treatment of unknown values and the rules of each operator are the
dialect's own: evaluation is where dialects differ most.

`Interpreter` evaluates by role (see `Expressions`): a literal gives its value (through `literal`), a reference the
value bound to its name, and a binding its body with its name bound to its first argument. An application calls its
operator's implementation from `operations`, with one thunk per argument, so that implementations decide which
arguments to evaluate and when; implementations of a kind whose vocabulary is open are one callable for all names. It
raises on what `Dialect.validate` reports: operations outside the vocabulary, wrong numbers of arguments, unbound
references, missing values and cycles.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any, Protocol, runtime_checkable

from . import Expressions

__all__ = ["Evaluator", "Predicate", "Interpreter", "Thunk", "Implementation"]

Thunk = Callable[[], Any]
Implementation = Callable[[list[Thunk], Any], Any]
"""Computes an operation's value from thunks for its arguments and the node, for its attributes."""


@runtime_checkable
class Evaluator(Protocol):
    """Computes the value of an expression, with the variables in `scope` bound."""

    def __call__(self, expression: Any, scope: Mapping[str, Any] | None = None) -> Any: ...


@runtime_checkable
class Predicate(Protocol):
    """Whether `value` satisfies a union branch's `predicate`: True, False, or None when unknown."""

    def __call__(self, predicate: Any, value: Any) -> bool | None: ...


class Interpreter:
    """Evaluates the expressions of `dialect`. `operations` maps each application kind's tag to its implementations
    by operator name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's
    value into the dialect's domain of values, and `unbound(kind, name)` is called for a reference not in scope, by
    default raising `KeyError`."""

    def __init__(self, dialect: Expressions.Declared, operations: Mapping[str, Any], *,
                 literal: Callable[[Any], Any] = lambda value: value,
                 unbound: Callable[[str, str], Any] | None = None):
        self.dialect, self.operations, self._literal = dialect, operations, literal
        self._unbound = unbound or self._raise_unbound

    @staticmethod
    def _raise_unbound(kind: str, name: str) -> Any:
        raise KeyError(f"{kind} {name!r} is not bound")

    def __call__(self, expression: Any, scope: Mapping[str, Any] | None = None) -> Any:
        """The value of an expression already resolved to the dialect's data."""
        return self.evaluate(expression, dict(scope or {}), set())

    def evaluate(self, expression: Any, scope: dict[str, Any], active: set[int]) -> Any:
        if not isinstance(expression, self.dialect.classes):
            raise TypeError(f"not an expression: {expression!r}")
        kind = type(expression)
        if kind.ROLE == Expressions.LITERAL:
            if expression.value is None:
                raise ValueError(f"{Expressions._article(kind.KIND)} needs a value")
            return self._literal(expression.value)
        name = getattr(expression, next(iter(kind.PROPERTIES)))
        if kind.ROLE == Expressions.REFERENCE:
            return scope[name] if name in scope else self._unbound(kind.KIND, name)
        if id(expression) in active:
            raise ValueError("the expression contains a cycle")
        active.add(id(expression))
        try:
            arguments = expression._arguments()
            if kind.ROLE == Expressions.BINDING:
                for slot, argument in zip(kind.SLOTS, arguments):
                    if argument is None:
                        raise ValueError(f"{Expressions._article(kind.KIND)} needs a {slot}")
                bound = self.evaluate(arguments[0], scope, active)
                return self.evaluate(arguments[1], {**scope, name: bound}, active)
            return self._apply(expression, arguments, scope, active)
        finally:
            active.discard(id(expression))

    def _apply(self, expression: Any, arguments: tuple[Any, ...], scope: dict[str, Any], active: set[int]) -> Any:
        kind = type(expression)
        operator = getattr(expression, kind.OPERATOR)
        implementations = self.operations[kind.KIND]
        if kind.VOCABULARY is None:
            implementation = implementations
        else:
            if operator not in implementations:
                raise NotImplementedError(f"{operator!r} is not a core operation")
            arity = kind.VOCABULARY[operator].arity()
            if len(arguments) != arity:
                raise TypeError(f"{operator} takes {arity} arguments, got {len(arguments)}")
            implementation = implementations[operator]
        thunks = [lambda argument=argument: self.evaluate(argument, scope, active) for argument in arguments]
        return implementation(thunks, expression)
