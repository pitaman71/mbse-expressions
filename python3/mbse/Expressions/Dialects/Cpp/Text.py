"""Text of the Cpp dialect: `ToText(expression)` is a term of C++ as C++ source, as C's printer writes its kinds."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Dialects.C.Text import text

from .Expressions import DIALECT

__all__ = ["ToText"]


def ToText(expression: Any) -> str:
    """The expression as C++ source, parenthesized only where precedence requires."""
    return text(expression, DIALECT)
