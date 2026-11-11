"""Text of the C Types dialect: `ToText(expression)` is a term of C Types (or anything `Terms.term` reads one from) as C
source, as mbse-programs' printer writes it, through the C family's printer (`C.Expressions.Text`), which writes every
kind of the family: a type name its specifiers and its abstract declarator (`unsigned int`, `char *[4]`), an
enumeration's body its enumerators, directives and comments on lines of its own, and an enumerator `name = value`."""

from __future__ import annotations

from typing import Any

from ..Expressions.Text import text
from . import Expressions

__all__ = ["ToText"]


def ToText(expression: Any) -> str:
    """The expression as C source."""
    return text(expression, Expressions.DIALECT)
