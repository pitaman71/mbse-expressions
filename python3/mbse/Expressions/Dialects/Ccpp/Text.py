"""Text of the Ccpp dialect: `ToText(expression)` is the expression as C source, with C's precedence, typed constants
written with a suffix or a cast. It reads a term value (or anything `Terms.term` reads one from) through `Terms.form`."""

from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Framework import Terms as F

from .Expressions import SUFFIXES

__all__ = ["ToText"]


# C's precedence, from loosest to tightest.
_CONDITIONAL, _OR, _AND, _BITOR, _BITXOR, _BITAND, _EQUALITY, _RELATIONAL, _SHIFT, _ADDITIVE, _MULTIPLICATIVE, _UNARY, \
    _POSTFIX = range(1, 14)
_LEVELS = {"||": _OR, "&&": _AND, "|": _BITOR, "^": _BITXOR, "&": _BITAND, "==": _EQUALITY, "!=": _EQUALITY,
           "<": _RELATIONAL, "<=": _RELATIONAL, ">": _RELATIONAL, ">=": _RELATIONAL, "<<": _SHIFT, ">>": _SHIFT,
           "+": _ADDITIVE, "-": _ADDITIVE, "*": _MULTIPLICATIVE, "/": _MULTIPLICATIVE, "%": _MULTIPLICATIVE}


def _text(value: str) -> str:
    """A C string literal."""
    escapes = {"\\": "\\\\", '"': '\\"', "\n": "\\n", "\t": "\\t", "\r": "\\r"}
    return '"' + "".join(escapes.get(c, c) for c in value) + '"'


_MACROS = {"NaN": "NAN", "Infinity": "INFINITY", "-Infinity": "-INFINITY"}


def _number(value: Any) -> str:
    """A number as C writes it: an int's digits; a float's shortest text, with a point or an exponent; a long double's
    text likewise; `INFINITY` and `NAN` for the values that have no literal."""
    if type(value) is int:
        return str(value)
    if type(value) is float:
        if not math.isfinite(value):
            return "NAN" if math.isnan(value) else "INFINITY" if value > 0 else "-INFINITY"
        value = repr(value)
    if value in _MACROS:
        return _MACROS[value]
    return value if any(c in value for c in ".eE") else value + ".0"


def _constant(attributes: Mapping[str, Any]) -> tuple[str, int]:
    """A constant: a bool, a string literal, or a number with its type's suffix or, for a type with none, a cast."""
    value, ctype = attributes.get("value"), attributes.get("type")
    if value is None:
        raise ValueError("a ccpp_constant needs a value")
    if type(value) is bool:
        return ("true" if value else "false"), _POSTFIX
    if type(value) is str and ctype is None:
        return _text(value), _POSTFIX
    text = _number(value)
    level = _UNARY if text.startswith("-") else _POSTFIX
    if ctype in (None, "int", "double") or not text[-1].isdigit():  # a default type, or a macro
        return text, level
    if ctype not in SUFFIXES:
        return f"({ctype}){text}", _UNARY
    return text + SUFFIXES[ctype], level


def ToText(expression: Any) -> str:
    """The expression as C source, parenthesized only where precedence requires."""

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        form = F.form(node)
        kind, attributes = form.kind, form.attributes
        if kind == "ccpp_constant":
            return _constant(attributes)
        if kind == "variable":
            return attributes["name"], _POSTFIX
        if kind == "ccpp_member":
            return f"{operand(0, _POSTFIX)}{attributes.get('operator') or '.'}{attributes['name']}", _POSTFIX
        if kind == "ccpp_subscript":
            return f"{operand(0, _POSTFIX)}[{arguments[1][0]}]", _POSTFIX
        if kind == "call":
            return f"{attributes['callable']}({', '.join(text for text, _ in arguments)})", _POSTFIX
        if kind == "ccpp_unary":  # `- -x`, not the decrement `--x`
            text, operator = operand(0, _UNARY), attributes["operator"]
            return f"{operator}{' ' if text[0] == operator in '+-' else ''}{text}", _UNARY
        if kind == "ccpp_cast":
            return f"({attributes['type']}){operand(0, _UNARY)}", _UNARY
        if kind == "ccpp_conditional":  # right-associative
            return f"{operand(0, _OR)} ? {arguments[1][0]} : {operand(2, _CONDITIONAL)}", _CONDITIONAL
        operator = attributes["operator"]
        level = _LEVELS[operator]
        return f"{operand(0, level)} {operator} {operand(1, level + 1)}", level

    return F.fold(expression, write)[0]
