"""Evaluators: the protocols for computing an expression's value, and an interpreter that dialects build theirs on.

An `Evaluator` computes the value of any expression of its dialect in a scope; each dialect's `Evaluators.OfAny` is
one. A `Predicate` is what mbse-schemas' validators take to test union branches: `(predicate, value) -> bool | None`.
The value domains, the treatment of unknown values and the rules of each operator are the dialect's own: evaluation is
where dialects differ most.

A `Scope` is where an expression's references are resolved, in the dialect's own way: `lookup(reference)` gives a
reference's value, `bind(name, value)` the scope within a binding, and `enter(declaration)` the scope within an
import. `Variables` is the scope of dialects whose references are names bound to values; dialects with imports,
packages or workbooks derive their own. An evaluator given a mapping instead of a scope makes its dialect's scope from
it, so `Evaluators.OfAny(expression, {'this': value})` binds `this`. A scope decides what an import may bring in:
imports resolve only what the caller's scope allows, never by loading code.

`Interpreter` evaluates by role (see `Expressions`): a literal gives its value (through `literal`), a reference what
the scope resolves, a binding its body in the scope with its name bound, and an import its body in the scope it
declares. An application calls its operator's implementation from `operations`, with one thunk per argument, so that
implementations decide which arguments to evaluate and when; the implementation of a kind whose vocabulary is open is
one callable for every name, and operators outside a closed vocabulary go to `extension`, if given. It raises on what
`Dialect.validate` reports: operations outside the vocabulary, wrong numbers of arguments, unbound references, missing
values and cycles.
"""

from __future__ import annotations

from collections import ChainMap
from collections.abc import Callable, Mapping
from typing import Any, Protocol, runtime_checkable

from . import Expressions

__all__ = ["Evaluator", "Predicate", "Scope", "Variables", "Interpreter", "Thunk", "Implementation"]

Thunk = Callable[[], Any]
Implementation = Callable[[list[Thunk], Any, Any], Any]
"""Computes an operation's value from thunks for its arguments, the node (for its attributes) and the scope."""


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


@runtime_checkable
class Evaluator(Protocol):
    """Computes the value of an expression in `scope`, or with the variables in a mapping bound."""

    def __call__(self, expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any: ...


@runtime_checkable
class Predicate(Protocol):
    """Whether `value` satisfies a union branch's `predicate`: True, False, or None when unknown."""

    def __call__(self, predicate: Any, value: Any) -> bool | None: ...


def _name(reference: Any) -> str:
    return getattr(reference, next(iter(type(reference).PROPERTIES)))


class Variables:
    """A scope of named values: a reference's value is its name's innermost binding, then the variable of that name.
    `unbound(reference)` gives the value of a reference to neither, by default raising `KeyError`. It has no imports."""

    def __init__(self, variables: Mapping[str, Any] | None = None):
        self.values: ChainMap[str, Any] = ChainMap({}, dict(variables or {}))

    def lookup(self, reference: Any) -> Any:
        name = _name(reference)
        return self.values[name] if name in self.values else self.unbound(reference)

    def unbound(self, reference: Any) -> Any:
        raise KeyError(f"{type(reference).KIND} {_name(reference)!r} is not bound")

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


class Interpreter:
    """Evaluates the expressions of `dialect`. `operations` maps each application kind's tag to its implementations
    by operator name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's
    value into the dialect's domain of values, `scope` makes the dialect's scope from a mapping of variables, and
    `extension(operator, arguments, node, scope)` evaluates operators outside a kind's vocabulary."""

    def __init__(self, dialect: Expressions.Declared, operations: Mapping[str, Any], *,
                 literal: Callable[[Any], Any] = lambda value: value,
                 scope: Callable[[Mapping[str, Any]], Scope] = Variables,
                 extension: Callable[[str, list[Thunk], Any, Any], Any] | None = None):
        self.dialect, self.operations, self._literal = dialect, operations, literal
        self._scope, self._extension = scope, extension

    def __call__(self, expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
        """The value of an expression already resolved to the dialect's data."""
        if not isinstance(scope, Scope):
            scope = self._scope(dict(scope or {}))
        return self.evaluate(expression, scope, set())

    def evaluate(self, expression: Any, scope: Any, active: set[int]) -> Any:
        if not isinstance(expression, self.dialect.classes):
            raise TypeError(f"not an expression: {expression!r}")
        kind = type(expression)
        if kind.ROLE == Expressions.LITERAL:
            if expression.value is None:
                raise ValueError(f"{Expressions._article(kind.KIND)} needs a value")
            return self._literal(expression.value)
        if kind.ROLE == Expressions.REFERENCE:
            return scope.lookup(expression)
        if id(expression) in active:
            raise ValueError("the expression contains a cycle")
        active.add(id(expression))
        try:
            arguments = expression._arguments()
            if kind.ROLE in (Expressions.BINDING, Expressions.IMPORT):
                for slot, argument in zip(kind.SLOTS, arguments):
                    if argument is None:
                        raise ValueError(f"{Expressions._article(kind.KIND)} needs {Expressions._article(slot)}")
                if kind.ROLE == Expressions.IMPORT:
                    return self.evaluate(arguments[0], scope.enter(expression), active)
                bound = self.evaluate(arguments[0], scope, active)
                return self.evaluate(arguments[1], scope.bind(_name(expression), bound), active)
            return self._apply(expression, arguments, scope, active)
        finally:
            active.discard(id(expression))

    def _apply(self, expression: Any, arguments: tuple[Any, ...], scope: Any, active: set[int]) -> Any:
        kind = type(expression)
        operator = Expressions._operator(expression)
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
