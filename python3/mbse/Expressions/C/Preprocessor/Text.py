"""Text of the C Preprocessor dialect: `ToText(expression)` is a term of C Preprocessor (or anything `Terms.term` reads
one from) as source, as mbse-programs' printer writes it, through the C family's printer (`C.Expressions.Text`), which
writes every kind of the family: a directive starting its line, a conditional one its branches each on a line of its
own (`#if`, `#elif`, `#elifdef`, `#else`), its items on the lines between, and `#endif`; `defined(name)`; and a comment
`//text` or `/*text*/`."""

from __future__ import annotations

from typing import Any

from ...C.Expressions.Text import text
from . import Expressions

__all__ = ["ToText"]


def ToText(expression: Any) -> str:
    """The expression as source."""
    return text(expression, Expressions.DIALECT)
