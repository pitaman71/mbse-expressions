"""Domains of the Python3 dialect: Python's values, by type.

`Bool`, `Int`, `Float`, `Str` and `Bytes` hold values of exactly that type; `Integral` is `Bool` or `Int` and
`Numeric` adds `Float`, since Python's arithmetic takes bools as ints (`True + 1` is 2). `NoneType`, `Ellipsis` and
`Complex` are the domains of Python3's own constants. Anything else, such as an object, a module or a numpy array, is
`Anything`: what an attribute, a subscript or a call gives is not known statically. `and` and `or` give one of their
operands, as Python's do, of any number; `is` and `is not` compare any two values, and `@` multiplies matrices, of
domains not known statically.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["Bool", "Int", "Float", "Str", "Bytes", "NoneType", "Ellipsis", "Complex", "Integral", "Numeric",
           "Anything", "COMPARE", "BOOLOP", "BINOP", "UNARYOP", "GENERATOR", "of", "constant"]

Bool, Int, Float, Str, Bytes = (D.OfTypes(t.__name__, t) for t in (bool, int, float, str, bytes))
NoneType, Ellipsis, Complex = D.OfTypes("NoneType", type(None)), D.OfTypes("ellipsis", type(...)), D.OfTypes(
    "complex", complex)
Integral = D.OfUnion(Bool, Int)
Numeric = D.OfUnion(Bool, Int, Float)

_EQUAL = D.Function((Anything, Anything), Bool)
_ORDER = D.Overloaded(D.Function((Numeric, Numeric), Bool), D.Same(2, (Str, Bytes), Bool))
_INTEGRAL = D.Function((Integral, Integral), Int)
_FLOAT = D.Function((Numeric, Numeric), Float)

COMPARE: dict[str, D.Signature] = {
    "==": _EQUAL, "!=": _EQUAL, **{operator: _ORDER for operator in ("<", "<=", ">", ">=")},
    "in": _EQUAL, "not in": _EQUAL, "is": _EQUAL, "is not": _EQUAL,
}
"""The comparison operators, membership and identity among them."""

BOOLOP: dict[str, D.Signature] = {"and": D.Either(-1), "or": D.Either(-1)}
"""The boolean operators, which give one of their operands, of any number."""

BINOP: dict[str, D.Signature] = {
    "+": D.Overloaded(D.Same(2, (Str, Bytes)), _INTEGRAL, _FLOAT),
    **{operator: D.Overloaded(_INTEGRAL, _FLOAT) for operator in ("-", "*", "//", "%")},
    "/": _FLOAT, "**": D.Overloaded(D.Function((Integral, Integral), D.OfUnion(Int, Float)), _FLOAT),
    **{operator: D.Overloaded(D.Function((Bool, Bool), Bool), _INTEGRAL) for operator in "&|^"},
    "<<": _INTEGRAL, ">>": _INTEGRAL, "@": D.Function((Anything, Anything), Anything),
}
"""The arithmetic and bitwise operators."""

UNARYOP: dict[str, D.Signature] = {
    "not": D.Function((Anything,), Bool),
    **{operator: D.Overloaded(D.Function((Integral,), Int), D.Function((Float,), Float)) for operator in "-+"},
    "~": D.Function((Integral,), Int),
}
"""The unary operators."""

GENERATOR = D.Opaque()
"""A comprehension's signature: what it iterates and yields is not known statically."""


_NATIVES = {bool: Bool, int: Int, float: Float, str: Str, bytes: Bytes}


def of(value: Any) -> D.Domain:
    """The domain of a literal's value."""
    return _NATIVES[type(value)]


def constant(attributes: Any) -> D.Domain:
    """The domain of Python3's own constant, by its attributes: `None`'s, `...`'s or a complex number's (its
    `complex`)."""
    singleton = attributes.get("singleton")
    return NoneType if singleton == "None" else Ellipsis if singleton == "..." else Complex
