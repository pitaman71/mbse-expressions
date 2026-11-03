"""Evaluators of the Cpp dialect: compute an expression by C++'s rules for arithmetic types, which are C's for its
kinds (see `C.Evaluators`): `Evaluators.OfAny(term, scope)` evaluates a term value in a `Scope(variables, functions)`."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Dialects.C.Evaluators import Scope, interpreter

from . import Expressions

__all__ = ["OfAny", "Scope", "INTERPRETER"]

INTERPRETER = interpreter(Expressions.DIALECT)
"""The interpreter of the Cpp dialect; its values carry their C++ types."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of a term in `scope`, or with the variables in a mapping bound: its native."""
    return INTERPRETER(expression, scope).value
