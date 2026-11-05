"""Evaluators of the Cpp dialect: compute an expression by C++'s rules for arithmetic types, which are C's for its
kinds (see `C.Evaluators`), a name used as an expression an `idexpression` holding its identifier (`EVALUATED`):
`Evaluators.OfAny(term, scope)` evaluates a term value in a `Scope(variables, functions)`."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Dialects.C.Evaluators import EVALUATED as C_EVALUATED, Scope, interpreter

from . import Expressions

__all__ = ["OfAny", "Scope", "INTERPRETER", "EVALUATED"]

EVALUATED = C_EVALUATED - {"variable"} | {Expressions.IDEXPRESSION}
"""The kinds C++'s evaluator evaluates: C's, a name used as an expression an `idexpression`, as C++'s grammar makes it."""

INTERPRETER = interpreter(Expressions.DIALECT, EVALUATED)
"""The interpreter of the Cpp dialect; its values carry their C++ types."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of a term in `scope`, or with the variables in a mapping bound: its native."""
    return INTERPRETER(expression, scope).value
