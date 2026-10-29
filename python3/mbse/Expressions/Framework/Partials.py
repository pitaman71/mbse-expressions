"""Partials: partial evaluation, a peer of `Evaluators`. What a scope knows is evaluated; the rest stays an expression of
the same dialect, the residual.

`Reducer(interpreter, literal, simplify)` reduces an expression of the interpreter's dialect with the variables it is
given known. A subexpression whose references are all known is evaluated by the interpreter and replaced by the literal
of its value, when `literal(value)` gives one; otherwise (an object, a collection, an unknown value) it stays as it is,
still referring to the variables it needs. A binding of a known value binds it within its body, and stays only while
the reduced body still refers to its name; a binding of an unknown value hides any known variable of its name, and so
does a quantifier, whose collection and body are reduced. Any other term is rebuilt from its reduced arguments, unless
`simplify(node, results)` gives a simpler result from what is known of them (Kleene's short-circuits, in Basic). A
reference the scope does not know stays.

The residual is a `Writer` (see `Terms`), which its caller writes where it wants it, in a transaction; a subterm it keeps
is the term value read, which writing copies. It agrees with the expression wherever the expression evaluates without
raising, in any scope that adds the unknown variables to the known ones. Evaluating a closed subexpression raises as
evaluation would.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from . import Symbolics, Terms
from .Evaluators import Interpreter

__all__ = ["Reducer", "Result"]


@dataclass(frozen=True)
class Result:
    """A reduced term: the `expression` (a term value or a `Writer`), its `value` when it is `known`, and the names it
    refers to that nothing within it binds (`free`)."""

    expression: Any
    known: bool = False
    value: Any = None
    free: frozenset[str] = frozenset()


class Reducer:
    """Reduces the terms of an interpreter's dialect. `literal(value)` gives the writer of a value's literal, or None
    when the dialect has none; `simplify(node, results)` gives a simpler result for an application whose arguments are
    not all known, or None."""

    def __init__(self, interpreter: Interpreter, literal: Callable[[Any], Any],
                 simplify: Callable[[Any, list[Result]], Result | None]):
        self.interpreter, self._literal, self._simplify = interpreter, literal, simplify

    def __call__(self, expression: Any, variables: Mapping[str, Any] | None = None) -> Terms.Writer:
        """The residual of a term (see `Terms.term`), with `variables` known: a writer."""
        dialect = self.interpreter.dialect
        return dialect.spec(self.reduce(Terms.term(expression), dict(variables or {})).expression)

    def known(self, expression: Any, value: Any) -> Result:
        """The result of a subexpression whose value is known: its literal, when the dialect has one."""
        literal = self._literal(value)
        if literal is None:
            return Result(expression, True, value, frozenset(Symbolics.free(expression, self.interpreter.dialect)))
        return Result(literal, True, value)

    def _rebuild(self, node: Any, arguments: list[Any]) -> Any:
        form = Terms.form(node)
        return self.interpreter.dialect.make(Terms.Form(form.kind, form.attributes, tuple(arguments)))

    def reduce(self, node: Any, known: dict[str, Any]) -> Result:
        dialect = self.interpreter.dialect
        free = frozenset(Symbolics.free(node, dialect))
        if free <= known.keys():
            return self.known(node, self.interpreter(node, known))
        tag, record, kind = dialect.kind(node)
        if kind.role == Terms.REFERENCE:
            return Result(node, free=free)
        arguments = Terms.arguments_of(record)
        if kind.role in (Terms.BINDING, Terms.QUANTIFIER):
            name = Terms.name_of(node)
            first = self.reduce(arguments[0], known)
            hidden = {key: value for key, value in known.items() if key != name}
            inner = {**known, name: first.value} if kind.role == Terms.BINDING and first.known else hidden
            body = self.reduce(arguments[1], inner)
            if kind.role == Terms.BINDING and name not in body.free:
                return body
            return Result(self._rebuild(node, [first.expression, body.expression]),
                          free=first.free | (body.free - {name}))
        results = [self.reduce(argument, known) for argument in arguments]
        names = frozenset(kind.names(Terms.attributes_of(record))) if kind.role == Terms.IMPORT and kind.names is not None else frozenset()
        rebuilt = Result(self._rebuild(node, [result.expression for result in results]),
                         free=frozenset().union(*(result.free for result in results)) - names)
        return self._simplify(node, results) or rebuilt
