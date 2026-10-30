"""Text of the SystemVerilog dialect: `ToText(expression)` is the expression (a term, or anything `Terms.term` reads one
from) as SystemVerilog source, with IEEE 1800's precedence, sized literals in their base."""

from __future__ import annotations

import math
from typing import Any

from mbse.Expressions.Framework import Terms as F

from .Expressions import _BASES, kind_of

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


def _vector(attributes: dict[str, Any]) -> str:
    bits = attributes["value"]
    base = attributes.get("base") or "b"
    digits = _digits(bits, base) if base != "b" else bits
    if digits is None:
        base, digits = "b", bits
    return f"{len(bits)}'{'s' if attributes.get('signed') else ''}{base}{digits}"


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
        tag, record = kind_of(node)
        attributes = F.attributes_of(record)
        name = attributes.get("name")
        if tag == "literal":
            text = _constant(attributes.get("value"))
            return text, (_MULTIPLICATIVE if "/" in text else _UNARY if text.startswith("-") else _PRIMARY)
        if tag == "vector":
            return _vector(attributes), _PRIMARY
        if tag == "variable":
            return name, _PRIMARY
        if tag == "member":
            return f"{operand(0, _PRIMARY)}.{name}", _PRIMARY
        if tag == "select":
            return f"{operand(0, _PRIMARY)}[{texts[1]}]", _PRIMARY
        if tag == "range":
            return f"{operand(0, _PRIMARY)}[{texts[1]}:{texts[2]}]", _PRIMARY
        if tag == "span":
            return f"[{texts[0]}:{texts[1]}]", _PRIMARY
        if tag == "concatenation":
            return "{" + ", ".join(texts) + "}", _PRIMARY
        if tag == "replication":
            return "{" + texts[0] + "{" + texts[1] + "}}", _PRIMARY
        if tag == "call":
            return f"{attributes.get('callable')}({', '.join(texts)})", _PRIMARY
        if tag == "method":
            return f"{operand(0, _PRIMARY)}.{name}()", _PRIMARY
        if tag == "iterate":
            return f"{operand(0, _PRIMARY)}.{attributes.get('method')}({name}) with ({texts[1]})", _PRIMARY
        if tag == "cast":
            return f"{attributes.get('type') or attributes.get('width')}'({texts[0]})", _PRIMARY
        if tag == "inside":
            return f"{operand(0, _RELATIONAL + 1)} inside {{{', '.join(texts[1:])}}}", _RELATIONAL
        operator = attributes.get("operator")
        if tag == "unary":  # its operand is a primary (A.8.3): `-(-x)`, `&(&x)`
            return f"{operator}{operand(0, _PRIMARY)}", _UNARY
        if tag == "conditional":  # right-associative
            return f"{operand(0, _OR)} ? {operand(1, _CONDITIONAL)} : {operand(2, _CONDITIONAL)}", _CONDITIONAL
        if tag != "binary":
            raise ValueError(f"SystemVerilog has no kind {tag!r}")
        level = _LEVELS[operator]
        if level == _IMPLY:  # right-associative, the loosest
            return f"{operand(0, level + 1)} {operator} {operand(1, level)}", level
        return f"{operand(0, level)} {operator} {operand(1, level + 1)}", level

    return F.fold(expression, write)[0]
