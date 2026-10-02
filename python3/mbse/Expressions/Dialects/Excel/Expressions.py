"""Expressions of the Excel dialect: worksheet formulas.

- `constant`: a number (`int` or `float`), text (`str`) or a logical (`bool`).
- `name`: the value bound to a name, by `LET` or as a defined name.
- `cell`: a cell reference: `A1` on the current sheet, `Sheet1!A1`, or `[Book.xlsx]Sheet1!A1` in another workbook.
  A workbook (see `Evaluators`) resolves it; it need not be bound.
- `let`: `LET(name, value, body)`.
- `function`: a worksheet function applied to ordered arguments, for the functions in `Domains.FUNCTIONS` (`AND`,
  `OR`, `NOT`, `IF`, `ISERROR`, the bit functions, and `ROWS`, `INDEX`, `MATCH`, `ISNUMBER`, `SUM`, `MIN`, `MAX` and
  `UNIQUE` of arrays); other names are add-in functions, which the workbook provides.
- `map`: `MAP(array, LAMBDA(name, body))`, the body's values for each element of the array, bound to `name`.
- `infix`: `left <operator> right`, for `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-` and `*`.
- `prefix`: `-operand`.
- `field`: `value.name`, a field of a record (Excel's data types).

The meta-schemas are registered as 'Expressions.Excel.Of<Kind>'. `Text.ToText` writes an expression as a formula, e.g.
`=AND(this.age >= 18, NOT(ISERROR(this.email)))`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "name", "cell", "let_", "function", "infix", "prefix", "field",
           "map_", "address"]

_ADDRESS = re.compile(r"\$?([A-Za-z]{1,3})\$?([1-9][0-9]*)")


def address(text: str) -> str | None:
    """A cell address without `$` and in upper case, e.g. '$b$2' is 'B2'; None if `text` is not one."""
    match = _ADDRESS.fullmatch(text)
    return f"{match[1].upper()}{match[2]}" if match else None


@dataclass(eq=False)
class _Constant(F.Term):
    KIND = "constant"
    ROLE = F.LITERAL
    VALUE = {"int": int, "float": float, "str": str, "bool": bool}
    value: Native | None = None


@dataclass(eq=False)
class _Name(F.Term):
    KIND = "name"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _Cell(F.Term):
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
class _Let(F.Term):
    KIND = "let"
    ROLE = F.BINDING
    PROPERTIES = {"name": str}
    SLOTS = ("value", "body")
    name: str | None = None
    value: Any = None
    body: Any = None


@dataclass(eq=False)
class _Map(F.Term):
    KIND = "map"
    ROLE = F.QUANTIFIER
    PROPERTIES = {"name": str}
    SLOTS = ("array", "body")
    SIGNATURE = Domains.MAP
    name: str | None = None
    array: Any = None
    body: Any = None  # the LAMBDA's, with `name` bound to each element


@dataclass(eq=False)
class _Function(F.Term):
    KIND = "function"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    VARIADIC = "arguments"
    OPERATOR = "name"
    VOCABULARY = Domains.FUNCTIONS
    name: str | None = None
    arguments: tuple[Any, ...] = ()

    def check(self) -> list[str]:
        problem = Domains.arity_problem(self.name, len(self.arguments))  # type: ignore[arg-type]
        return [] if problem is None else [problem]


@dataclass(eq=False)
class _Infix(F.Term):
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
class _Prefix(F.Term):
    KIND = "prefix"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("operand",)
    OPERATOR = "operator"
    VOCABULARY = Domains.PREFIX
    operator: str | None = None
    operand: Any = None


@dataclass(eq=False)
class _Field(F.Term):
    KIND = "field"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    SLOTS = ("value",)
    OPERATOR = "name"
    SIGNATURE = Domains.FIELD
    name: str | None = None
    value: Any = None


DIALECT = F.Declared("Excel", (_Constant, _Name, _Cell, _Let, _Function, _Infix, _Prefix, _Field, _Map),
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


def map_(name: str, array: Any, body: Any) -> _Map:
    """`MAP(array, LAMBDA(name, body))`."""
    return _Map(name, DIALECT.resolve(array), DIALECT.resolve(body))
