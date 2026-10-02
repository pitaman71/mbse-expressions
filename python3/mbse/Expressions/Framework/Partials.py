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

The residual agrees with the expression wherever the expression evaluates without raising, in any scope that adds the
unknown variables to the known ones. Evaluating a closed subexpression raises as evaluation would, and a cycle raises.
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
    """A reduced expression: the `expression`, and its `value` when it is `known`."""

    expression: Any
    known: bool = False
    value: Any = None


class Reducer:
    """Reduces the expressions of an interpreter's dialect. `literal(value)` gives the literal of a value, or None when
    the dialect has none; `simplify(node, results)` gives a simpler result for an application whose arguments are not
    all known, or None."""

    def __init__(self, interpreter: Interpreter, literal: Callable[[Any], Any],
                 simplify: Callable[[Any, list[Result]], Result | None]):
        self.interpreter, self._literal, self._simplify = interpreter, literal, simplify

    def __call__(self, expression: Any, variables: Mapping[str, Any] | None = None) -> Any:
        """The residual of an expression already resolved to the dialect's data, with `variables` known."""
        return self.reduce(expression, dict(variables or {}), set()).expression

    def known(self, expression: Any, value: Any) -> Result:
        """The result of a subexpression whose value is known: its literal, when the dialect has one."""
        literal = self._literal(value)
        return Result(expression if literal is None else literal, True, value)

    def _rebuild(self, node: Any, arguments: list[Any]) -> Any:
        form = node.form()
        return self.interpreter.dialect.make(Terms.Form(form.kind, form.attributes, tuple(arguments)))

    def reduce(self, node: Any, known: dict[str, Any], active: set[int]) -> Result:
        if not isinstance(node, self.interpreter.dialect.classes):
            raise TypeError(f"not an expression: {node!r}")
        if Symbolics.free(node) <= known.keys():
            return self.known(node, self.interpreter(node, known))
        kind = type(node)
        if kind.ROLE == Terms.REFERENCE:
            return Result(node)
        if id(node) in active:
            raise ValueError("the expression contains a cycle")
        active.add(id(node))
        try:
            arguments = node._arguments()
            if kind.ROLE in (Terms.BINDING, Terms.QUANTIFIER):
                name = Terms.name_of(node)
                first = self.reduce(arguments[0], known, active)
                hidden = {key: value for key, value in known.items() if key != name}
                inner = {**known, name: first.value} if kind.ROLE == Terms.BINDING and first.known else hidden
                body = self.reduce(arguments[1], inner, active)
                if kind.ROLE == Terms.BINDING and name not in Symbolics.free(body.expression):
                    return body
                return Result(self._rebuild(node, [first.expression, body.expression]))
            results = [self.reduce(argument, known, active) for argument in arguments]
            return self._simplify(node, results) or Result(self._rebuild(node, [result.expression for result in results]))
        finally:
            active.discard(id(node))
