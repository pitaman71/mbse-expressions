"""Evaluators: the protocols for computing an expression's value, and an interpreter that dialects build theirs on.

An `Evaluator` computes the value of any expression of its dialect in a scope; each dialect's `Evaluators.OfAny` is
one. A `Predicate` evaluates a rule about a value, with `this` bound to it: `(rule, value) -> bool | None`.
The value domains, the treatment of unknown values and the rules of each operator are the dialect's own: evaluation is
where dialects differ most.

Evaluation resolves references in a scope (see `Symbolics`): an evaluator given a mapping instead of a scope makes its
dialect's scope from it, so `Evaluators.OfAny(expression, {'this': value})` binds `this`.

`Interpreter` evaluates by role (see `Terms`): a literal gives its value (through `literal`), a reference what
the scope resolves, a binding its body in the scope with its name bound, and an import its body in the scope it
declares. An application calls its operator's implementation from `operations`, with one thunk per argument, so that
implementations decide which arguments to evaluate and when; the implementation of a kind whose vocabulary is open is
one callable for every name, and operators outside a closed vocabulary go to `extension`, if given. It raises on what
`Dialect.validate` reports: operations outside the vocabulary, wrong numbers of arguments, unbound references, missing
values and cycles.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any, Protocol, runtime_checkable

from . import Symbolics, Terms
from .Symbolics import Scope, Variables

__all__ = ["Evaluator", "Predicate", "Interpreter", "Thunk", "Implementation"]

Thunk = Callable[[], Any]
Implementation = Callable[[list[Thunk], Any, Any], Any]
"""Computes an operation's value from thunks for its arguments, the node (for its attributes) and the scope."""


@runtime_checkable
class Evaluator(Protocol):
    """Computes the value of an expression in `scope`, or with the variables in a mapping bound."""

    def __call__(self, expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any: ...


@runtime_checkable
class Predicate(Protocol):
    """Whether `value` satisfies `rule`, evaluated with `this` bound to it: True, False, or None when unknown."""

    def __call__(self, predicate: Any, value: Any) -> bool | None: ...


class Interpreter:
    """Evaluates the expressions of `dialect`. `operations` maps each application kind's tag to its implementations
    by operator name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's
    value into the dialect's domain of values, `scope` makes the dialect's scope from a mapping of variables, and
    `extension(operator, arguments, node, scope)` evaluates operators outside a kind's vocabulary."""

    def __init__(self, dialect: Terms.Declared, operations: Mapping[str, Any], *,
                 literal: Callable[[Any], Any] = lambda value: value,
                 scope: Callable[[Mapping[str, Any]], Scope] = Variables,
                 extension: Callable[[str, list[Thunk], Any, Any], Any] | None = None):
        self.dialect, self.operations, self._literal = dialect, operations, literal
        self._scope, self._extension = scope, extension

    def __call__(self, expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
        """The value of an expression already resolved to the dialect's data."""
        if not isinstance(scope, Symbolics.Scope):
            scope = self._scope(dict(scope or {}))
        return self.evaluate(expression, scope, set())

    def evaluate(self, expression: Any, scope: Any, active: set[int]) -> Any:
        if not isinstance(expression, self.dialect.classes):
            raise TypeError(f"not an expression: {expression!r}")
        kind = type(expression)
        if kind.ROLE == Terms.LITERAL:
            if expression.value is None:
                raise ValueError(f"{Terms._article(kind.KIND)} needs a value")
            typed = expression.typed()
            if typed is not None:
                raise NotImplementedError(f"literals of {typed.name()} are not evaluated yet")
            return self._literal(expression.value)
        if kind.ROLE == Terms.REFERENCE:
            return scope.lookup(expression)
        if id(expression) in active:
            raise ValueError("the expression contains a cycle")
        active.add(id(expression))
        try:
            arguments = expression._arguments()
            if kind.ROLE in (Terms.BINDING, Terms.IMPORT):
                for slot, argument in zip(kind.SLOTS, arguments):
                    if argument is None:
                        raise ValueError(f"{Terms._article(kind.KIND)} needs {Terms._article(slot)}")
                if kind.ROLE == Terms.IMPORT:
                    return self.evaluate(arguments[0], scope.enter(expression), active)
                bound = self.evaluate(arguments[0], scope, active)
                return self.evaluate(arguments[1], scope.bind(Terms.name_of(expression), bound), active)
            return self._apply(expression, arguments, scope, active)
        finally:
            active.discard(id(expression))

    def _apply(self, expression: Any, arguments: tuple[Any, ...], scope: Any, active: set[int]) -> Any:
        kind = type(expression)
        operator = Terms._operator(expression)
        implementations = self.operations[kind.KIND]
        thunks = [lambda argument=argument: self.evaluate(argument, scope, active) for argument in arguments]
        if kind.VOCABULARY is None:
            return implementations(thunks, expression, scope)
        if operator not in implementations:
            if self._extension is not None:
                return self._extension(operator, thunks, expression, scope)
            raise NotImplementedError(f"{operator!r} is not a core operation")
        arity = kind.VOCABULARY[operator].arity()
        if len(arguments) != arity:
            raise TypeError(f"{operator} takes {arity} arguments, got {len(arguments)}")
        return implementations[operator](thunks, expression, scope)
