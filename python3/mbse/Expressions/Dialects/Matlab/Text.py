"""Text of the Matlab dialect: `ToText(term)` is a term as MATLAB source, parenthesized only where precedence requires,
with its imports as the lines before it. It reads the term through `Terms`, as the dialect reads it."""

from __future__ import annotations

import math
from typing import Any

from mbse.Expressions.Framework import Terms as F

from .Expressions import DIALECT

__all__ = ["ToText"]


# MATLAB's precedence, from loosest to tightest; unary operators bind tighter than all of these but `.`.
_PRECEDENCE = {"||": 1, "&&": 2, "==": 3, "~=": 3, "<": 3, "<=": 3, ">": 3, ">=": 3, "+": 4, "-": 4, ".*": 5}
_UNARY, _ATOM = 6, 7


def _constant(value: Any) -> str:
    if type(value) is bool:
        return "true" if value else "false"
    if type(value) is str:
        return '"' + value.replace('"', '""') + '"'
    if type(value) is float and not math.isfinite(value):
        return "NaN" if math.isnan(value) else "Inf" if value > 0 else "-Inf"
    return repr(value)


def ToText(expression: Any) -> str:
    """A term (or anything `Terms.term` reads one from) as MATLAB source, parenthesized only where precedence requires:
    one line per import around it, then the expression."""
    lines = []
    node = F.term(expression)
    while DIALECT.kind(node)[0] == "matlab_import":
        form = F.form(node)
        lines.append(f"import {form.attributes['name']}")
        node = form.arguments[0]

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        tag, record, _ = DIALECT.kind(node)
        attributes = F.attributes_of(record)
        if tag == "literal":
            text = _constant(attributes["value"])
            return text, _UNARY if text.startswith("-") else _ATOM
        if tag == "variable":
            return attributes["name"], _ATOM
        if tag == "matlab_field":
            return f"{operand(0, _ATOM)}.{attributes['name']}", _ATOM
        if tag == "call":
            return f"{attributes['callable']}({', '.join(text for text, _ in arguments)})", _ATOM
        if tag == "matlab_index":
            return f"{operand(0, _ATOM)}({arguments[1][0]})", _ATOM
        if tag == "matlab_arrayfun":
            return f"arrayfun(@({attributes['name']}) {arguments[1][0]}, {arguments[0][0]})", _ATOM
        if tag == "matlab_import":
            raise ValueError("an import can only enclose the whole expression")
        if tag == "list":
            return f"[{', '.join(text for text, _ in arguments)}]", _ATOM
        if tag == "matlab_unary":
            return f"{attributes['operator']}{operand(0, _UNARY)}", _UNARY
        level = _PRECEDENCE[attributes["operator"]]
        return f"{operand(0, level)} {attributes['operator']} {operand(1, level + 1)}", level

    return "\n".join([*lines, F.fold(node, write)[0]])
