"""Text of the Matlab dialect: `ToText(expression)` is the expression as MATLAB source, parenthesized only where
precedence requires, with its imports as the lines before it."""

from __future__ import annotations

import math
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from .Expressions import _Arrayfun, _Call, _Constant, _Field, _Identifier, _Import, _Index, _Unary

__all__ = ["ToText"]


# MATLAB's precedence, from loosest to tightest; unary operators bind tighter than all of these but `.`.
_PRECEDENCE = {"||": 1, "&&": 2, "==": 3, "~=": 3, "<": 3, "<=": 3, ">": 3, ">=": 3, "+": 4, "-": 4, ".*": 5}
_UNARY, _ATOM = 6, 7


def _constant(value: Native) -> str:
    if type(value) is bool:
        return "true" if value else "false"
    if type(value) is str:
        return '"' + value.replace('"', '""') + '"'
    if type(value) is float and not math.isfinite(value):
        return "NaN" if math.isnan(value) else "Inf" if value > 0 else "-Inf"
    return repr(value)


def ToText(expression: Any) -> str:
    """The expression as MATLAB source, parenthesized only where precedence requires: one line per import around it,
    then the expression."""
    lines = []
    while isinstance(expression, _Import):
        lines.append(f"import {expression.name}")
        expression = expression.body

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        if isinstance(node, _Constant):
            text = _constant(node.value)
            return text, _UNARY if text.startswith("-") else _ATOM
        if isinstance(node, _Identifier):
            return node.name, _ATOM
        if isinstance(node, _Field):
            return f"{operand(0, _ATOM)}.{node.name}", _ATOM
        if isinstance(node, _Call):
            return f"{node.function}({', '.join(text for text, _ in arguments)})", _ATOM
        if isinstance(node, _Index):
            return f"{operand(0, _ATOM)}({arguments[1][0]})", _ATOM
        if isinstance(node, _Arrayfun):
            return f"arrayfun(@({node.name}) {arguments[1][0]}, {arguments[0][0]})", _ATOM
        if isinstance(node, _Import):
            raise ValueError("an import can only enclose the whole expression")
        if isinstance(node, _Unary):
            return f"{node.operator}{operand(0, _UNARY)}", _UNARY
        level = _PRECEDENCE[node.operator]
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return "\n".join([*lines, F.fold(expression, write)[0]])
