"""Text of the Excel dialect: `ToText(expression)` is the expression as a formula, starting with `=` and parenthesized
only where precedence requires."""

from __future__ import annotations

import math
import re
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from .Expressions import _Cell, _Constant, _Field, _Function, _Let, _Map, _Name, _Prefix

__all__ = ["ToText"]


# Excel's precedence, from loosest to tightest: comparison, then + and -, then *, then prefix -.
_PRECEDENCE = {"=": 1, "<>": 1, "<": 1, "<=": 1, ">": 1, ">=": 1, "+": 2, "-": 2, "*": 3}
_PREFIX, _ATOM = 4, 5


def _constant(value: Native) -> str:
    if type(value) is bool:
        return "TRUE" if value else "FALSE"
    if type(value) is str:
        return '"' + value.replace('"', '""') + '"'
    if type(value) is float and not math.isfinite(value):
        return "#NUM!"  # Excel has no infinities or NaN
    return repr(value)


def _field_name(name: str) -> str:
    return name if name.isidentifier() else f"[{name}]"


def _cell(node: Any) -> str:
    if node.sheet is None:
        return node.address
    prefix = f"[{node.book}]{node.sheet}" if node.book is not None else node.sheet
    if not re.fullmatch(r"[\w.\[\]]+", prefix):
        prefix = "'" + prefix.replace("'", "''") + "'"
    return f"{prefix}!{node.address}"


def ToText(expression: Any) -> str:
    """The expression as a formula, starting with '=' and parenthesized only where precedence requires."""

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        if isinstance(node, _Constant):
            text = _constant(node.value)
            return text, _PREFIX if text.startswith("-") else _ATOM
        if isinstance(node, _Name):
            return node.name, _ATOM
        if isinstance(node, _Cell):
            return _cell(node), _ATOM
        if isinstance(node, _Field):
            return f"{operand(0, _ATOM)}.{_field_name(node.name)}", _ATOM
        if isinstance(node, _Let):
            return f"LET({node.name}, {arguments[0][0]}, {arguments[1][0]})", _ATOM
        if isinstance(node, _Function):
            return f"{node.name}({', '.join(text for text, _ in arguments)})", _ATOM
        if isinstance(node, _Map):
            return f"MAP({arguments[0][0]}, LAMBDA({node.name}, {arguments[1][0]}))", _ATOM
        if isinstance(node, _Prefix):
            return f"{node.operator}{operand(0, _PREFIX)}", _PREFIX
        level = _PRECEDENCE[node.operator]
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return "=" + F.fold(expression, write)[0]
