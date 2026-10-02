"""Text of the Ccpp dialect: `ToText(expression)` is the expression as C source, with C's precedence, typed constants
written with a suffix or a cast."""

from __future__ import annotations

import math
from typing import Any

from mbse.Expressions.Framework import Terms as F

from .Expressions import SUFFIXES, _Call, _Cast, _Conditional, _Constant, _Identifier, _Member, _Subscript, _Unary

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


def _constant(node: _Constant) -> tuple[str, int]:
    """A constant: a bool, a string literal, or a number with its type's suffix or, for a type with none, a cast."""
    value, ctype = node.value, node.type
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

        if isinstance(node, _Constant):
            return _constant(node)
        if isinstance(node, _Identifier):
            return node.name, _POSTFIX
        if isinstance(node, _Member):
            return f"{operand(0, _POSTFIX)}{node.operator or '.'}{node.name}", _POSTFIX
        if isinstance(node, _Subscript):
            return f"{operand(0, _POSTFIX)}[{arguments[1][0]}]", _POSTFIX
        if isinstance(node, _Call):
            return f"{node.function}({', '.join(text for text, _ in arguments)})", _POSTFIX
        if isinstance(node, _Unary):  # `- -x`, not the decrement `--x`
            text = operand(0, _UNARY)
            return f"{node.operator}{' ' if text[0] == node.operator in '+-' else ''}{text}", _UNARY
        if isinstance(node, _Cast):
            return f"({node.type}){operand(0, _UNARY)}", _UNARY
        if isinstance(node, _Conditional):  # right-associative
            return f"{operand(0, _OR)} ? {arguments[1][0]} : {operand(2, _CONDITIONAL)}", _CONDITIONAL
        level = _LEVELS[node.operator]
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return F.fold(expression, write)[0]
