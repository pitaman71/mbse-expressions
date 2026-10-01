"""Partial evaluation of the Basic dialect: what the scope knows is evaluated, and the rest stays a Basic expression.

`Partials.OfAny(expression, variables)` gives the residual of any expression (a `Spec`) with `variables` known: the
literal of its value when it is all known, otherwise the expression with every known subexpression replaced by the
literal of its value (a typed value's literal carries its domain; an object, a collection or an unknown value has
none, and its subexpression stays). Kleene's logic decides `and`, `or` and `implies` with what is known: a false
operand of `and` (a true one of `or`) decides it, a true operand of `and` (a false one of `or`) drops out, and
`implies` is true when its condition is false or its conclusion true, and its conclusion when its condition is true.
A let of a known value binds it in its body and stays only while the body refers to its name.

The residual agrees with the expression wherever the expression evaluates without raising, with the other variables
bound. See `mbse.Expressions.Framework.Partials`.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Framework import Partials as F

from . import Domains, Evaluators, Expressions

__all__ = ["OfAny", "REDUCER"]


def _literal(value: Any) -> Any:
    """The literal of a value: a native's, or a typed value's with its domain; None for anything else."""
    if isinstance(value, Domains.Value):
        return Expressions.literal(value.value, value.domain).data
    return Expressions.DIALECT.literal(value)


def _simplify(node: Any, results: list[F.Result]) -> F.Result | None:
    """Kleene's short-circuits for `and`, `or` and `implies`, with what is known of their operands."""
    name = node.name  # an operation's: the only application
    if name in ("and", "or"):
        decisive = name == "or"  # the value that decides: true for or, false for and
        for result in results:
            if result.known and result.value is decisive:
                return REDUCER.known(result.expression, decisive)
        for i, result in enumerate(results):
            if result.known and result.value is (not decisive):
                return results[1 - i]
    if name == "implies":
        condition, conclusion = results
        if (condition.known and condition.value is False) or (conclusion.known and conclusion.value is True):
            return REDUCER.known(node, True)
        if condition.known and condition.value is True:
            return conclusion
    return None


REDUCER = F.Reducer(Evaluators.INTERPRETER, _literal, _simplify)
"""The reducer of the Basic dialect."""


def OfAny(expression: Expressions.OfAny.Spec, variables: Mapping[str, Any] | None = None) -> Any:
    """The residual of any expression, with `variables` known."""
    return REDUCER(Expressions.OfAny.resolve(expression), variables)
