"""Expressions of the Latex dialect: mathematical notation, as LaTeX's math mode writes it.

- `constant`: a number (`int` or `float`), text (`str`, written `\\text{...}`) or a truth value (`bool`).
- `symbol`: a named quantity, `a`, or `\\mathit{age}` for a longer name.
- `binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`=`, `\\neq`, `<`, `\\leq`, `>`, `\\geq`,
  `\\land`, `\\lor`, `\\implies`, `+`, `-`, `\\cdot`); `unary`: `\\lnot` and `-`.
- `frac`: `\\frac{numerator}{denominator}`.
- `member`: `value.\\mathit{name}`, a member of a value.
- `function`: a named function applied to ordered arguments, `\\operatorname{has}(x, \\text{email})`, for the
  functions in `Domains.FUNCTIONS`.
- `where`: `body \\quad \\text{where } name = value`, which binds a name within its body.

Notation has no evaluator: this dialect is written, rendered, validated, inferred and translated, and evaluation
belongs to the dialects it is translated to. The meta-schemas are registered as 'Expressions.Latex.Of<Kind>'.
`render` writes an expression as math-mode LaTeX, parenthesized only where precedence requires.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Dialects.Basic.Expressions import discriminator
from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "symbol", "binary", "unary", "frac", "member", "function",
           "where", "render"]


@dataclass(eq=False)
class _Constant(F.Node):
    KIND = "constant"
    ROLE = F.LITERAL
    VALUE = {"int": int, "float": float, "str": str, "bool": bool}
    value: Native | None = None


@dataclass(eq=False)
class _Symbol(F.Node):
    KIND = "symbol"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _Binary(F.Node):
    KIND = "binary"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("left", "right")
    OPERATOR = "operator"
    VOCABULARY = Domains.BINARY
    operator: str | None = None
    left: Any = None
    right: Any = None


@dataclass(eq=False)
class _Unary(F.Node):
    KIND = "unary"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("operand",)
    OPERATOR = "operator"
    VOCABULARY = Domains.UNARY
    operator: str | None = None
    operand: Any = None


@dataclass(eq=False)
class _Frac(F.Node):
    KIND = "frac"
    ROLE = F.APPLICATION
    SLOTS = ("numerator", "denominator")
    SIGNATURE = Domains.FRAC
    numerator: Any = None
    denominator: Any = None


@dataclass(eq=False)
class _Member(F.Node):
    KIND = "member"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    SLOTS = ("value",)
    OPERATOR = "name"
    SIGNATURE = Domains.MEMBER
    name: str | None = None
    value: Any = None


@dataclass(eq=False)
class _Function(F.Node):
    KIND = "function"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    VARIADIC = "arguments"
    OPERATOR = "name"
    VOCABULARY = Domains.FUNCTIONS
    name: str | None = None
    arguments: tuple[Any, ...] = ()


@dataclass(eq=False)
class _Where(F.Node):
    KIND = "where"
    ROLE = F.BINDING
    PROPERTIES = {"name": str}
    SLOTS = ("value", "body")
    name: str | None = None
    value: Any = None
    body: Any = None


DIALECT = F.Declared("Latex", (_Constant, _Symbol, _Binary, _Unary, _Frac, _Member, _Function, _Where),
                     discriminator=discriminator, domain_of=Domains.of)
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def constant(value: Native) -> _Constant:
    return _Constant(value)


def symbol(name: str) -> _Symbol:
    return _Symbol(name)


def binary(operator: str, left: Any, right: Any) -> _Binary:
    """`left <operator> right`; each operand is a spec (a native value is a constant)."""
    return _Binary(operator, DIALECT.resolve(left), DIALECT.resolve(right))


def unary(operator: str, operand: Any) -> _Unary:
    return _Unary(operator, DIALECT.resolve(operand))


def frac(numerator: Any, denominator: Any) -> _Frac:
    return _Frac(DIALECT.resolve(numerator), DIALECT.resolve(denominator))


def member(value: Any, name: str) -> _Member:
    """`value.\\mathit{name}`."""
    return _Member(name, DIALECT.resolve(value))


def function(name: str, *arguments: Any) -> _Function:
    return _Function(name, tuple(DIALECT.resolve(argument) for argument in arguments))


def where(name: str, value: Any, body: Any) -> _Where:
    """`body \\quad \\text{where } name = value`."""
    return _Where(name, DIALECT.resolve(value), DIALECT.resolve(body))


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


def render(expression: Any) -> str:
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
