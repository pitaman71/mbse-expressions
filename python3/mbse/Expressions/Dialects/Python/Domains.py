"""Domains of the Python dialect: Python's values, by type.

`Bool`, `Int`, `Float`, `Str` and `Bytes` hold values of exactly that type; `Integral` is `Bool` or `Int` and
`Numeric` adds `Float`, since Python's arithmetic takes bools as ints (`True + 1` is 2). Anything else, such as an
object, a module or a numpy array, is `Anything`: what an attribute, a subscript or a call gives is not known
statically. `and` and `or` give one of their operands, as Python's do.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["Bool", "Int", "Float", "Str", "Bytes", "Integral", "Numeric", "Anything", "COMPARE", "BOOLOP", "BINOP",
           "UNARYOP", "of"]

Bool, Int, Float, Str, Bytes = (D.OfTypes(t.__name__, t) for t in (bool, int, float, str, bytes))
Integral = D.OfUnion(Bool, Int)
Numeric = D.OfUnion(Bool, Int, Float)

_EQUAL = D.Function((Anything, Anything), Bool)
_ORDER = D.Overloaded(D.Function((Numeric, Numeric), Bool), D.Same(2, (Str, Bytes), Bool))
_INTEGRAL = D.Function((Integral, Integral), Int)
_FLOAT = D.Function((Numeric, Numeric), Float)

COMPARE: dict[str, D.Signature] = {
    "==": _EQUAL, "!=": _EQUAL, **{operator: _ORDER for operator in ("<", "<=", ">", ">=")},
}
"""The comparison operators."""

BOOLOP: dict[str, D.Signature] = {"and": D.Either(2), "or": D.Either(2)}
"""The boolean operators, which give one of their operands."""

BINOP: dict[str, D.Signature] = {
    "+": D.Overloaded(D.Same(2, (Str, Bytes)), _INTEGRAL, _FLOAT),
    **{operator: D.Overloaded(_INTEGRAL, _FLOAT) for operator in ("-", "*", "//", "%")},
    "/": _FLOAT, "**": D.Overloaded(D.Function((Integral, Integral), D.OfUnion(Int, Float)), _FLOAT),
}
"""The arithmetic operators."""

UNARYOP: dict[str, D.Signature] = {
    "not": D.Function((Anything,), Bool),
    **{operator: D.Overloaded(D.Function((Integral,), Int), D.Function((Float,), Float)) for operator in "-+"},
}
"""The unary operators."""

_NATIVES = {bool: Bool, int: Int, float: Float, str: Str, bytes: Bytes}


def of(value: Any) -> D.Domain:
    """The domain of a constant."""
    return _NATIVES[type(value)]
