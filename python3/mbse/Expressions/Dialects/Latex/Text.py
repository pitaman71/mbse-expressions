"""Text of the Latex dialect: `ToText(expression)` is the expression as math-mode LaTeX, parenthesized only where
precedence requires."""

from __future__ import annotations

import math
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from .Expressions import _Constant, _Frac, _Function, _Member, _Symbol, _Unary, _Where

__all__ = ["ToText"]


# --- Rendering ---

# Precedence, from loosest to tightest.
_WHERE, _IMPLIES, _OR, _AND, _COMPARE, _SUM, _PRODUCT, _UNARY, _ATOM = range(9)
_LEVELS = {"\\implies": _IMPLIES, "\\lor": _OR, "\\land": _AND, "+": _SUM, "-": _SUM, "\\cdot": _PRODUCT,
           **{operator: _COMPARE for operator in ("=", "\\neq", "<", "\\leq", ">", "\\geq")}}
_ESCAPES = {"\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", "$": "\\$", "&": "\\&", "#": "\\#", "%": "\\%",
            "_": "\\_", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}"}


def _text(value: str) -> str:
    return "\\text{" + "".join(_ESCAPES.get(character, character) for character in value) + "}"


def _name(name: str) -> str:
    """A symbol's or member's name: one character as it is, a longer one in `\\mathit`."""
    return name if len(name) == 1 else "\\mathit{" + name.replace("_", "\\_") + "}"


def _number(value: float | int) -> tuple[str, int]:
    if type(value) is float and not math.isfinite(value):
        text = "\\mathrm{NaN}" if math.isnan(value) else "\\infty" if value > 0 else "-\\infty"
    else:
        text = repr(value)
    if "e" in text:  # scientific: 1e-07 is 1 \times 10^{-7}
        mantissa, exponent = text.split("e")
        return f"{mantissa} \\times 10^{{{int(exponent)}}}", _PRODUCT
    return text, _UNARY if text.startswith("-") else _ATOM


def _constant(value: Native) -> tuple[str, int]:
    if type(value) is bool:
        return ("\\mathrm{true}" if value else "\\mathrm{false}"), _ATOM
    if type(value) is str:
        return _text(value), _ATOM
    return _number(value)  # type: ignore[arg-type]


def ToText(expression: Any) -> str:
    """The expression as math-mode LaTeX."""

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        if isinstance(node, _Constant):
            return _constant(node.value)
        if isinstance(node, _Symbol):
            return _name(node.name), _ATOM
        if isinstance(node, _Member):
            return f"{operand(0, _ATOM)}.{_name(node.name)}", _ATOM
        if isinstance(node, _Function):
            return f"\\operatorname{{{node.name}}}({', '.join(text for text, _ in arguments)})", _ATOM
        if isinstance(node, _Frac):
            return f"\\frac{{{arguments[0][0]}}}{{{arguments[1][0]}}}", _ATOM
        if isinstance(node, _Where):
            return f"{operand(1, _IMPLIES)} \\quad \\text{{where }} {_name(node.name)} = {operand(0, _IMPLIES)}", _WHERE
        if isinstance(node, _Unary):
            if node.operator == "\\lnot":
                return f"\\lnot {operand(0, _UNARY)}", _UNARY
            return f"{node.operator}{operand(0, _ATOM)}", _UNARY
        level = _LEVELS[node.operator]
        if level == _COMPARE:  # not associative: both sides bind tighter
            return f"{operand(0, level + 1)} {node.operator} {operand(1, level + 1)}", level
        if level == _IMPLIES:  # right-associative
            return f"{operand(0, level + 1)} {node.operator} {operand(1, level)}", level
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return F.fold(expression, write)[0]
