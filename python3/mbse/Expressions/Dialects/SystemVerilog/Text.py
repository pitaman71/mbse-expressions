"""Text of the SystemVerilog dialect: `ToText(expression)` is the expression as SystemVerilog source, with IEEE 1800's
precedence, sized literals in their base."""

from __future__ import annotations

import math
from typing import Any

from mbse.Expressions.Framework import Terms as F

from .Expressions import _BASES, _Call, _Cast, _Concatenation, _Conditional, _Constant, _Identifier, _Inside, _Iterate, _Member, _Method, _Range, _Replication, _Select, _Span, _Unary, _Vector

__all__ = ["ToText"]


# SystemVerilog's precedence, from loosest to tightest (IEEE 1800, table 11-2).
_IMPLY, _CONDITIONAL, _OR, _AND, _BITOR, _BITXOR, _BITAND, _EQUALITY, _RELATIONAL, _SHIFT, _ADDITIVE, _MULTIPLICATIVE, \
    _POWER, _UNARY, _PRIMARY = range(1, 16)
_LEVELS = {"->": _IMPLY, "<->": _IMPLY, "||": _OR, "&&": _AND, "|": _BITOR, "^": _BITXOR, "^~": _BITXOR, "~^": _BITXOR,
           "&": _BITAND, **dict.fromkeys(("==", "!=", "===", "!==", "==?", "!=?"), _EQUALITY),
           **dict.fromkeys(("<", "<=", ">", ">="), _RELATIONAL), **dict.fromkeys(("<<", ">>", "<<<", ">>>"), _SHIFT),
           "+": _ADDITIVE, "-": _ADDITIVE, "*": _MULTIPLICATIVE, "/": _MULTIPLICATIVE, "%": _MULTIPLICATIVE, "**": _POWER}


def _digits(bits: str, base: str) -> str | None:
    """A vector's digits in a base, or None when some digit would mix x, z and known bits."""
    if base == "d":
        if all(b in "01" for b in bits):
            return str(int(bits, 2))
        return bits[0] if len(set(bits)) == 1 else None
    size = _BASES[base]
    padded = "0" * (-len(bits) % size) + bits
    digits = []
    for i in range(0, len(padded), size):
        group = padded[i:i + size]
        if all(b in "01" for b in group):
            digits.append("0123456789abcdef"[int(group, 2)])
        elif len(set(group)) == 1:
            digits.append(group[0])
        else:
            return None
    return "".join(digits)


def _vector(node: _Vector) -> str:
    base = node.base or "b"
    digits = _digits(node.value, base) if base != "b" else node.value
    if digits is None:
        base, digits = "b", node.value
    return f"{len(node.value)}'{'s' if node.signed else ''}{base}{digits}"


def _constant(value: Any) -> str:
    if type(value) is str:
        escapes = {"\\": "\\\\", '"': '\\"', "\n": "\\n", "\t": "\\t"}
        return '"' + "".join(escapes.get(c, c) for c in value) + '"'
    if type(value) is float:
        if not math.isfinite(value):
            return "0.0 / 0.0" if math.isnan(value) else "1.0 / 0.0" if value > 0 else "-1.0 / 0.0"
        return repr(value)  # with a point or an exponent
    return str(value)


def ToText(expression: Any) -> str:
    """The expression as SystemVerilog source, parenthesized only where precedence requires."""

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        texts = [text for text, _ in arguments]
        if isinstance(node, _Constant):
            text = _constant(node.value)
            return text, (_MULTIPLICATIVE if "/" in text else _UNARY if text.startswith("-") else _PRIMARY)
        if isinstance(node, _Vector):
            return _vector(node), _PRIMARY
        if isinstance(node, _Identifier):
            return node.name, _PRIMARY
        if isinstance(node, _Member):
            return f"{operand(0, _PRIMARY)}.{node.name}", _PRIMARY
        if isinstance(node, _Select):
            return f"{operand(0, _PRIMARY)}[{texts[1]}]", _PRIMARY
        if isinstance(node, _Range):
            return f"{operand(0, _PRIMARY)}[{texts[1]}:{texts[2]}]", _PRIMARY
        if isinstance(node, _Span):
            return f"[{texts[0]}:{texts[1]}]", _PRIMARY
        if isinstance(node, _Concatenation):
            return "{" + ", ".join(texts) + "}", _PRIMARY
        if isinstance(node, _Replication):
            return "{" + texts[0] + "{" + texts[1] + "}}", _PRIMARY
        if isinstance(node, _Call):
            return f"{node.function}({', '.join(texts)})", _PRIMARY
        if isinstance(node, _Method):
            return f"{operand(0, _PRIMARY)}.{node.name}()", _PRIMARY
        if isinstance(node, _Iterate):
            return f"{operand(0, _PRIMARY)}.{node.method}({node.name}) with ({texts[1]})", _PRIMARY
        if isinstance(node, _Cast):
            return f"{node.type or node.width}'({texts[0]})", _PRIMARY
        if isinstance(node, _Inside):
            return f"{operand(0, _RELATIONAL + 1)} inside {{{', '.join(texts[1:])}}}", _RELATIONAL
        if isinstance(node, _Unary):  # `- -x`, not the decrement `--x`, and `& &x`
            text = operand(0, _UNARY)
            return f"{node.operator}{' ' if text[0] in '+-&|^~!' else ''}{text}", _UNARY
        if isinstance(node, _Conditional):  # right-associative
            return f"{operand(0, _OR)} ? {operand(1, _CONDITIONAL)} : {operand(2, _CONDITIONAL)}", _CONDITIONAL
        level = _LEVELS[node.operator]
        if level == _IMPLY:  # right-associative, the loosest
            return f"{operand(0, level + 1)} {node.operator} {operand(1, level)}", level
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return F.fold(expression, write)[0]
