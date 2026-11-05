"""Text of the Cpp dialect: `ToText(expression)` is a term of C++ as C++ source, as C's printer writes the kinds of
the C family (`C.Text.text`)."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.C.Expressions.Text import text

from .Expressions import DIALECT

__all__ = ["ToText"]


def ToText(expression: Any) -> str:
    """The expression as C++ source, parenthesized only where precedence requires."""
    return text(expression, DIALECT)
