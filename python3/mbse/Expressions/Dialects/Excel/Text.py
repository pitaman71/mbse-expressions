"""Text of the Excel dialect: `ToText(term)` is a term as a formula, starting with `=` and parenthesized only where
precedence requires. It takes a term value, or anything `Terms.term` reads one from (an `Expression`, its root), and
reads it as `Expressions.DIALECT` does: a kind it does not read raises `ValueError`."""

from __future__ import annotations

import math
import re
from typing import Any

from mbse.Expressions.Framework import Terms as F

from .Expressions import DIALECT

__all__ = ["ToText"]


# Excel's precedence, from loosest to tightest: comparison, then + and -, then *, then prefix -.
_PRECEDENCE = {"=": 1, "<>": 1, "<": 1, "<=": 1, ">": 1, ">=": 1, "+": 2, "-": 2, "*": 3}
_PREFIX, _ATOM = 4, 5


def _constant(value: Any) -> str:
    if type(value) is bool:
        return "TRUE" if value else "FALSE"
    if type(value) is str:
        return '"' + value.replace('"', '""') + '"'
    if type(value) is float and not math.isfinite(value):
        return "#NUM!"  # Excel has no infinities or NaN
    return repr(value)


def _field_name(name: str) -> str:
    return name if name.isidentifier() else f"[{name}]"


def _cell(attributes: Any) -> str:
    address, sheet, book = attributes["address"], attributes.get("sheet"), attributes.get("book")
    if sheet is None:
        return address
    prefix = f"[{book}]{sheet}" if book is not None else sheet
    if not re.fullmatch(r"[\w.\[\]]+", prefix):
        prefix = "'" + prefix.replace("'", "''") + "'"
    return f"{prefix}!{address}"


def ToText(expression: Any) -> str:
    """The term as a formula, starting with '=' and parenthesized only where precedence requires."""

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        kind, record, _ = DIALECT.kind(node)
        attributes = F.attributes_of(record)
        if kind == "literal":
            text = _constant(attributes["value"])
            return text, _PREFIX if text.startswith("-") else _ATOM
        if kind == "variable":
            return attributes["name"], _ATOM
        if kind == "excel_cell":
            return _cell(attributes), _ATOM
        if kind == "excel_field":
            return f"{operand(0, _ATOM)}.{_field_name(attributes['name'])}", _ATOM
        if kind == "let":
            return f"LET({attributes['name']}, {arguments[0][0]}, {arguments[1][0]})", _ATOM
        if kind == "call":
            return f"{attributes['callable']}({', '.join(text for text, _ in arguments)})", _ATOM
        if kind == "excel_map":
            return f"MAP({arguments[0][0]}, LAMBDA({attributes['name']}, {arguments[1][0]}))", _ATOM
        if kind == "excel_prefix":
            return f"{attributes['operator']}{operand(0, _PREFIX)}", _PREFIX
        level = _PRECEDENCE[attributes["operator"]]
        return f"{operand(0, level)} {attributes['operator']} {operand(1, level + 1)}", level

    return "=" + F.fold(expression, write)[0]
