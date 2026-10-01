"""Domains of the Basic dialect: the values its core operations take and give.

The values are mbse-schemas' natives, each its own domain (`Bool`, `Int`, `Float`, `Str`, `Bytes`; a `bool` is not an
`int`), and objects (`Object`): anything that writes its properties through `accept`, including expressions and
value objects. `Anything` is the domain of a value not known statically, such as a property read with `get`.
Unknown (`None`) is not a domain: any value may be unknown at run time.

`SIGNATURES` gives each core operation's signature, following the evaluator's rules: comparisons take two values of
one domain, ordered only for `int`, `float`, `str` and `bytes`; logic takes bools; arithmetic takes two numbers of one
type and gives that type.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["Bool", "Int", "Float", "Str", "Bytes", "Object", "Anything", "SIGNATURES", "of"]

Bool, Int, Float, Str, Bytes = (D.OfTypes(t.__name__, t) for t in (bool, int, float, str, bytes))
Object = D.OfValues("object", lambda value: callable(getattr(value, "accept", None)))

_NATIVES = {bool: Bool, int: Int, float: Float, str: Str, bytes: Bytes}
_COMPARABLE = (Bool, Int, Float, Str, Bytes, Object)
_ORDERED = (Int, Float, Str, Bytes)
_NUMBERS = (Int, Float)
_LOGIC = D.Function((Bool, Bool), Bool)

SIGNATURES: dict[str, D.Signature] = {
    "get": D.Function((Object, Str), Anything), "has": D.Function((Object, Str), Bool),
    **{name: D.Same(2, _COMPARABLE, Bool) for name in ("eq", "ne")},
    **{name: D.Same(2, _ORDERED, Bool) for name in ("lt", "le", "gt", "ge")},
    "and": _LOGIC, "or": _LOGIC, "not": D.Function((Bool,), Bool), "implies": _LOGIC,
    **{name: D.Same(2, _NUMBERS) for name in ("add", "sub", "mul")}, "neg": D.Same(1, _NUMBERS),
}
"""The core operations' signatures."""


def of(value: Any) -> D.Domain:
    """The domain of a value: its native type's, or `Object`."""
    if type(value) in _NATIVES:
        return _NATIVES[type(value)]
    if Object.contains(value):
        return Object
    raise TypeError(f"a {type(value).__name__} is not a value of the Basic dialect")
