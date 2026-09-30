"""Expressions of the Excel dialect: worksheet formulas.

- `constant`: a number (`int` or `float`), text (`str`) or a logical (`bool`).
- `name`: the value bound to a name, by `LET` or as a defined name.
- `cell`: a cell reference: `A1` on the current sheet, `Sheet1!A1`, or `[Book.xlsx]Sheet1!A1` in another workbook.
  A workbook (see `Evaluators`) resolves it; it need not be bound.
- `let`: `LET(name, value, body)`.
- `function`: a worksheet function applied to ordered arguments, for the functions in `Domains.FUNCTIONS` (`AND`,
  `OR`, `NOT`, `IF`, `ISERROR`); other names are add-in functions, which the workbook provides.
- `infix`: `left <operator> right`, for `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-` and `*`.
- `prefix`: `-operand`.
- `field`: `value.name`, a field of a record (Excel's data types).

The meta-schemas are registered as 'Expressions.Excel.Of<Kind>'. `render` writes an expression as a formula, e.g.
`=AND(this.age >= 18, NOT(ISERROR(this.email)))`.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "name", "cell", "let_", "function", "infix", "prefix", "field",
           "render", "address"]

_ADDRESS = re.compile(r"\$?([A-Za-z]{1,3})\$?([1-9][0-9]*)")


def address(text: str) -> str | None:
    """A cell address without `$` and in upper case, e.g. '$b$2' is 'B2'; None if `text` is not one."""
    match = _ADDRESS.fullmatch(text)
    return f"{match[1].upper()}{match[2]}" if match else None


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
class _Cell(F.Node):
    KIND = "cell"
    ROLE = F.REFERENCE
    LEXICAL = False
    PROPERTIES = {"address": str, "sheet": str, "book": str}
    OPTIONAL = frozenset({"sheet", "book"})
    address: str | None = None
    sheet: str | None = None
    book: str | None = None

    def check(self) -> list[str]:
        problems = []
        if type(self.address) is str and self.address and address(self.address) is None:
            problems.append(f"a cell's address must be a column and a row, like A1, got {self.address!r}")
        if self.book is not None and self.sheet is None:
            problems.append("a cell in another book needs a sheet")
        return problems


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


DIALECT = F.Declared("Excel", (_Constant, _Name, _Cell, _Let, _Function, _Infix, _Prefix, _Field),
                     domain_of=Domains.of)
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def constant(value: Native) -> _Constant:
    return _Constant(value)


def name(name: str) -> _Name:
    return _Name(name)


def cell(address: str, sheet: str | None = None, book: str | None = None) -> _Cell:
    """The cell at `address`, on `sheet` (by default the current one) of `book` (by default this one)."""
    return _Cell(address, sheet, book)


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


def _cell(node: Any) -> str:
    if node.sheet is None:
        return node.address
    prefix = f"[{node.book}]{node.sheet}" if node.book is not None else node.sheet
    if not re.fullmatch(r"[\w.\[\]]+", prefix):
        prefix = "'" + prefix.replace("'", "''") + "'"
    return f"{prefix}!{node.address}"


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
        if isinstance(node, _Cell):
            return _cell(node), _ATOM
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
