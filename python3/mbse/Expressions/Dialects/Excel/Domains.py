"""Domains of the Excel dialect: the values of a worksheet formula.

`Number` holds numbers (Excel has only doubles; a constant `18` is the number 18), `Text` holds text, `Logical` holds
TRUE and FALSE, and `Errors` holds `Error` values such as `#FIELD!`, which formulas compute with rather than raise.
A `Record` is what fields are read from: a mapping, or an object that writes its properties through `accept`, as
Excel's data types are. `Scalar` is a number, text or logical. An array (a list) holds a list property's values,
which `MAP`, `ROWS`, `INDEX`, `MATCH`, `SUM`, `MIN`, `MAX`, `UNIQUE`, `AND` and `OR` read.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["Error", "Number", "Text", "Logical", "Errors", "Record", "Scalar", "Anything", "FUNCTIONS", "INFIX",
           "PREFIX", "FIELD", "MAP", "ARITIES", "of", "is_record", "arity_problem"]


@dataclass(frozen=True)
class Error:
    """An Excel error value, e.g. `Error('#FIELD!')`."""

    code: str

    def __repr__(self) -> str:
        return self.code


def is_record(value: Any) -> bool:
    """Whether fields can be read from `value`."""
    return isinstance(value, Mapping) or callable(getattr(value, "accept", None))


Number = D.OfTypes("number", float, int)
Text = D.OfTypes("text", str)
Logical = D.OfTypes("logical", bool)
Errors = D.OfTypes("error", Error)
Record = D.OfValues("record", is_record)
Scalar = D.OfUnion(Number, Text, Logical)

_LOGIC = D.Function((Scalar, Scalar), Logical)
_ARITHMETIC = D.Function((Scalar, Scalar), Number)

FUNCTIONS: dict[str, D.Signature] = {
    "AND": D.Opaque(Logical), "OR": D.Opaque(Logical), "NOT": D.Function((Scalar,), Logical),
    "IF": D.Opaque(), "ISERROR": D.Function((Anything,), Logical),
    **{name: _ARITHMETIC for name in ("BITAND", "BITOR", "BITXOR", "BITLSHIFT", "BITRSHIFT")},
    "ROWS": D.Function((Anything,), Number), "INDEX": D.Function((Anything, Scalar), Anything),
    "MATCH": D.Function((Anything, Anything, Scalar), Number), "ISNUMBER": D.Function((Anything,), Logical),
    **{name: D.Opaque(Number) for name in ("SUM", "MIN", "MAX")}, "UNIQUE": D.Function((Anything,), Anything),
}
"""The worksheet functions: `IF`, `AND`, `OR`, `SUM`, `MIN` and `MAX` take a range of numbers of arguments (see
`ARITIES`), the others a fixed number."""

ARITIES: dict[str, tuple[int, int]] = {"IF": (2, 3), **{name: (1, 255) for name in ("AND", "OR", "SUM", "MIN", "MAX")}}
"""The least and the most arguments of the functions that take a range of numbers of them, as Excel's do."""


def arity_problem(name: str, count: int) -> str | None:
    """What is wrong with a function of `ARITIES` applied to `count` arguments, or None."""
    if name not in ARITIES:
        return None
    low, high = ARITIES[name]
    if low <= count <= high:
        return None
    return f"{name} takes {low} {'or' if high == low + 1 else 'to'} {high} arguments, got {count}"

INFIX: dict[str, D.Signature] = {
    **{operator: _LOGIC for operator in ("=", "<>", "<", "<=", ">", ">=")},
    **{operator: _ARITHMETIC for operator in ("+", "-", "*")},
}
"""The infix operators."""

PREFIX: dict[str, D.Signature] = {"-": D.Function((Scalar,), Number)}
"""The prefix operators."""

FIELD = D.Function((Record,), Anything)
"""A field of a record."""


class _Iterated(D.Opaque):
    """`MAP`'s signature: the domain of an array's elements is not known statically."""

    def items(self, domain: D.Domain) -> D.Domain:
        return Anything


MAP = _Iterated()
"""`MAP(array, LAMBDA(name, body))`."""

_NATIVES = {bool: Logical, int: Number, float: Number, str: Text}


def of(value: Any) -> D.Domain:
    """The domain of a constant."""
    return _NATIVES[type(value)]
