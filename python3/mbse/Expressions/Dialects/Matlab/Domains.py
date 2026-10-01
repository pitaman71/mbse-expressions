"""Domains of the Matlab dialect: MATLAB's scalar classes.

`Double` holds numbers (a constant `18` is the double 18), `Logical` holds `true` and `false`, `String` holds string
scalars ("abc", not 'abc' character vectors) and `Struct` the values fields are read from: a mapping, or an object that
writes its properties through `accept`. `Numeric` is `Double` or `Logical`, which MATLAB converts into each other:
`true + 1` is 2. `+` with a string concatenates.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["Double", "Logical", "String", "Struct", "Numeric", "Scalar", "Anything", "BINARY", "UNARY", "CALLS",
           "FIELD", "of", "is_struct"]


def is_struct(value: Any) -> bool:
    """Whether fields can be read from `value`."""
    return isinstance(value, Mapping) or callable(getattr(value, "accept", None))


Double = D.OfTypes("double", float, int)
Logical = D.OfTypes("logical", bool)
String = D.OfTypes("string", str)
Struct = D.OfValues("struct", is_struct)
Numeric = D.OfUnion(Double, Logical)
Scalar = D.OfUnion(Double, Logical, String)

_COMPARE = D.Function((Scalar, Scalar), Logical)
_ARITHMETIC = D.Function((Numeric, Numeric), Double)

BINARY: dict[str, D.Signature] = {
    **{operator: _COMPARE for operator in ("==", "~=", "<", "<=", ">", ">=")},
    "&&": D.Function((Numeric, Numeric), Logical), "||": D.Function((Numeric, Numeric), Logical),
    "+": D.Overloaded(_ARITHMETIC, D.Function((Scalar, Scalar), String)), "-": _ARITHMETIC, ".*": _ARITHMETIC,
}
"""The binary operators."""

UNARY: dict[str, D.Signature] = {"~": D.Function((Numeric,), Logical), "-": D.Function((Numeric,), Double)}
"""The unary operators."""

CALLS: dict[str, D.Signature] = {
    "isfield": D.Function((Anything, String), Logical),
    **{name: _ARITHMETIC for name in ("bitand", "bitor", "bitxor", "bitshift")},
}
"""The functions: `isfield`, and the bit functions on doubles."""

FIELD = D.Function((Struct,), Anything)
"""A field of a struct."""

_NATIVES = {bool: Logical, int: Double, float: Double, str: String}


def of(value: Any) -> D.Domain:
    """The domain of a constant."""
    return _NATIVES[type(value)]
