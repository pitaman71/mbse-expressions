"""Domains of the Latex dialect: the values mathematical notation writes about.

`Number` holds numbers (`int` or `float`), `Text` holds text (`\\text{...}`), and `Truth` holds truth values. What a
member or a function gives is `Anything`: notation does not say.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["Number", "Text", "Truth", "Anything", "BINARY", "UNARY", "FUNCTIONS", "MEMBER", "FRAC", "of"]

Number = D.OfTypes("number", int, float)
Text = D.OfTypes("text", str)
Truth = D.OfTypes("truth", bool)

_COMPARE = D.Function((Anything, Anything), Truth)
_LOGIC = D.Function((Truth, Truth), Truth)
_ARITHMETIC = D.Function((Number, Number), Number)

BINARY: dict[str, D.Signature] = {
    **{operator: _COMPARE for operator in ("=", "\\neq", "<", "\\leq", ">", "\\geq")},
    "\\land": _LOGIC, "\\lor": _LOGIC, "\\implies": _LOGIC,
    **{operator: _ARITHMETIC for operator in ("+", "-", "\\cdot")},
}
"""The binary operators, by their LaTeX."""

UNARY: dict[str, D.Signature] = {"\\lnot": D.Function((Truth,), Truth), "-": D.Function((Number,), Number)}
"""The unary operators, by their LaTeX."""

FUNCTIONS: dict[str, D.Signature] = {"has": D.Function((Anything, Text), Truth)}
"""The named functions (`\\operatorname{has}`): whether a value has a member."""

MEMBER = D.Function((Anything,), Anything)
"""A member of a value: `x.\\mathit{age}`."""

FRAC = D.Function((Number, Number), Number)
"""A fraction."""

_NATIVES = {bool: Truth, int: Number, float: Number, str: Text}


def of(value: Any) -> D.Domain:
    """The domain of a constant."""
    return _NATIVES[type(value)]
