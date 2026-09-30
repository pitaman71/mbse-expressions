"""Domains of the Numpy dialect: arrays (and scalars, their zero-dimensional case) by dtype kind, and records.

`Bool`, `Int`, `Float`, `Str` and `Bytes` hold the values whose dtype is of that kind, Python natives included (`True`
is a `Bool`, `1` an `Int`). A `Record` is what `subscript` reads a column or field from: a mapping, a structured
array, or an object that writes its properties through `accept`. Unlike Basic, numpy promotes: `add(1, 1.5)` is a
`Float`, and `add(True, True)` a `Bool`. Deciding membership needs numpy; declaring and inferring does not.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["Bool", "Int", "Float", "Str", "Bytes", "Number", "Numeric", "Record", "Anything", "SIGNATURES", "of",
           "is_record"]


class OfDtype:
    """The arrays and scalars whose dtype kind (`numpy.dtype.kind`) is one of `kinds`."""

    def __init__(self, name: str, kinds: str):
        self._name, self.kinds = name, frozenset(kinds)

    def name(self) -> str:
        return self._name

    def contains(self, value: Any) -> bool:
        import numpy

        return numpy.asarray(value).dtype.kind in self.kinds

    def includes(self, other: D.Domain) -> bool:
        if isinstance(other, D.OfUnion):
            return all(self.includes(member) for member in other.members)
        return isinstance(other, OfDtype) and other.kinds <= self.kinds

    def __repr__(self) -> str:
        return self._name


def is_record(value: Any) -> bool:
    """Whether `subscript` can read from `value`."""
    names = getattr(getattr(value, "dtype", None), "names", None)
    return isinstance(value, Mapping) or names is not None or callable(getattr(value, "accept", None))


Bool, Int, Float, Str, Bytes = OfDtype("bool", "b"), OfDtype("int", "iu"), OfDtype("float", "f"), \
    OfDtype("str", "UT"), OfDtype("bytes", "S")
Number = D.OfUnion(Int, Float)
Numeric = D.OfUnion(Bool, Int, Float)
Record = D.OfValues("record", is_record)

_COMPARE = D.Overloaded(D.Function((Numeric, Numeric), Bool), D.Same(2, (Str, Bytes), Bool))
_LOGIC = D.Function((Numeric, Numeric), Bool)
_PROMOTE = D.Function((Numeric, Numeric), Float)

SIGNATURES: dict[str, D.Signature] = {
    **{name: _COMPARE for name in ("equal", "not_equal", "less", "less_equal", "greater", "greater_equal")},
    "logical_and": _LOGIC, "logical_or": _LOGIC, "logical_not": D.Function((Numeric,), Bool),
    "add": D.Overloaded(D.Same(2, (Bool, Int, Float)), _PROMOTE),
    "multiply": D.Overloaded(D.Same(2, (Bool, Int, Float)), _PROMOTE),
    "subtract": D.Overloaded(D.Same(2, (Int, Float)), D.Function((Number, Number), Float)),  # not bools
    "negative": D.Same(1, (Int, Float)),
    "where": D.Function((Numeric, Anything, Anything), Anything),
    "ma.getmaskarray": D.Function((Anything,), Bool),
}
"""The signatures of the numpy functions the dialect calls, by their names under `numpy`."""

SUBSCRIPT = D.Function((Record,), Anything)
"""A column or field of a record."""

_NATIVES = {bool: Bool, int: Int, float: Float, str: Str, bytes: Bytes}


def of(value: Any) -> D.Domain:
    """The domain of a constant."""
    return _NATIVES[type(value)]
