"""Expressions of the Excel dialect: worksheet formulas.

- `constant`: a number (`int` or `float`), text (`str`) or a logical (`bool`).
- `name`: the value bound to a name, by `LET` or as a defined name.
- `let`: `LET(name, value, body)`.
- `function`: a worksheet function applied to ordered arguments, for the functions in `Domains.FUNCTIONS` (`AND`,
  `OR`, `NOT`, `IF`, `ISERROR`).
- `infix`: `left <operator> right`, for `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-` and `*`.
- `prefix`: `-operand`.
- `field`: `value.name`, a field of a record (Excel's data types).

The meta-schemas are registered as 'Expressions.Excel.Of<Kind>'. `render` writes an expression as a formula, e.g.
`=AND(this.age >= 18, NOT(ISERROR(this.email)))`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Dialects.Basic.Expressions import discriminator
from mbse.Expressions.Framework import Expressions as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "name", "let_", "function", "infix", "prefix", "field",
           "render"]


@dataclass(eq=False)
class _Constant(F.Node):
    KIND = "constant"
    ROLE = F.LITERAL
    VALUE = {"int": int, "float": float, "str": str, "bool": bool}
    value: Native | None = None


@dataclass(eq=False)
class _Name(F.Node):
    KIND = "name"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _Let(F.Node):
    KIND = "let"
    ROLE = F.BINDING
    PROPERTIES = {"name": str}
    SLOTS = ("value", "body")
    name: str | None = None
    value: Any = None
    body: Any = None


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
class _Infix(F.Node):
    KIND = "infix"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("left", "right")
    OPERATOR = "operator"
    VOCABULARY = Domains.INFIX
    operator: str | None = None
    left: Any = None
    right: Any = None


@dataclass(eq=False)
class _Prefix(F.Node):
    KIND = "prefix"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("operand",)
    OPERATOR = "operator"
    VOCABULARY = Domains.PREFIX
    operator: str | None = None
    operand: Any = None


@dataclass(eq=False)
class _Field(F.Node):
    KIND = "field"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    SLOTS = ("value",)
    OPERATOR = "name"
    SIGNATURE = Domains.FIELD
    name: str | None = None
    value: Any = None


DIALECT = F.Declared("Excel", (_Constant, _Name, _Let, _Function, _Infix, _Prefix, _Field),
                     discriminator=discriminator, domain_of=Domains.of)
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def constant(value: Native) -> _Constant:
    return _Constant(value)


def name(name: str) -> _Name:
    return _Name(name)


def let_(name: str, value: Any, body: Any) -> _Let:
    """`LET(name, value, body)`; the value and body are specs (a native value is a constant)."""
    return _Let(name, DIALECT.resolve(value), DIALECT.resolve(body))


def function(name: str, *arguments: Any) -> _Function:
    return _Function(name, tuple(DIALECT.resolve(argument) for argument in arguments))


def infix(operator: str, left: Any, right: Any) -> _Infix:
    return _Infix(operator, DIALECT.resolve(left), DIALECT.resolve(right))


def prefix(operator: str, operand: Any) -> _Prefix:
    return _Prefix(operator, DIALECT.resolve(operand))


def field(value: Any, name: str) -> _Field:
    """`value.name`."""
    return _Field(name, DIALECT.resolve(value))


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


def render(expression: Any) -> str:
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
        if isinstance(node, _Field):
            return f"{operand(0, _ATOM)}.{_field_name(node.name)}", _ATOM
        if isinstance(node, _Let):
            return f"LET({node.name}, {arguments[0][0]}, {arguments[1][0]})", _ATOM
        if isinstance(node, _Function):
            return f"{node.name}({', '.join(text for text, _ in arguments)})", _ATOM
        if isinstance(node, _Prefix):
            return f"{node.operator}{operand(0, _PREFIX)}", _PREFIX
        level = _PRECEDENCE[node.operator]
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return "=" + F.fold(expression, write)[0]
