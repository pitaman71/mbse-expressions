"""Domains of the Ccpp dialect: C's and C++'s arithmetic types, under the LP64 data model, and the signatures of their
operators.

A `CType` is a type and a domain: `bool`; the integers by width and signedness (`char`, `signed char`, `unsigned
char`, `short`, `int`, `long`, `long long` and their unsigned forms, and `<stdint.h>`'s `int8_t` ... `uint64_t` and
`size_t`, which name the same types); and the floating types, IEEE 754's `binary32` (`float`), `binary64` (`double`)
and `binary128` (`long double`). Under LP64 `char` is signed and 8 bits wide, `short` 16, `int` 32, and `long` and
`long long` 64. `TYPES` maps each name to its type; equal types compare equal whatever their names.

`promoted(type)` applies the integer promotions (a narrower integer or a bool becomes `int`) and `common(a, b)` the
usual arithmetic conversions: the wider floating type if either is floating, otherwise the promoted types, the wider if
they agree in signedness, else the unsigned one when it is at least as wide, else the signed one. The signatures follow
the evaluator's rules (see `Evaluators`): arithmetic gives the common type, shifts the promoted left operand's,
comparisons and logic `bool`. `of(value)` gives a constant's type: `int`, `long` or `unsigned long` for an int, as the
first that holds it, `double` for a float, `bool`, and `String` for text.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["CType", "TYPES", "Bool", "Int", "Double", "String", "Anything", "promoted", "common", "of", "BINARY",
           "UNARY", "MEMBER", "SUBSCRIPT", "CALL", "CONDITIONAL", "CAST"]


@dataclass(frozen=True)
class CType:
    """An arithmetic type: its `kind` ('bool', 'integer' or 'floating'), its `width` in bits, its signedness, and for a
    floating type its IEEE 754 `format`. Its `name` is the one it is written with; types compare by the rest."""

    kind: str
    width: int
    signed: bool = True
    format: str | None = None
    label: str = field(default="", compare=False)

    def name(self) -> str:
        return self.label

    def contains(self, value: Any) -> bool:
        """Whether a native is a value of this type."""
        if self.kind == "bool":
            return type(value) is bool
        if self.kind == "floating":
            return type(value) is (str if self.format == "binary128" else float)
        if type(value) is not int:
            return False
        low = -(1 << (self.width - 1)) if self.signed else 0
        return low <= value < low + (1 << self.width)

    def includes(self, other: D.Domain) -> bool:
        if isinstance(other, D.OfUnion):
            return all(self.includes(member) for member in other.members)
        return other == self

    def __repr__(self) -> str:
        return self.label


def _integer(label: str, width: int, signed: bool = True) -> CType:
    return CType("integer", width, signed, None, label)


TYPES: dict[str, CType] = {
    "bool": CType("bool", 1, False, None, "bool"),
    "char": _integer("char", 8), "signed char": _integer("signed char", 8), "unsigned char": _integer("unsigned char", 8, False),
    "short": _integer("short", 16), "unsigned short": _integer("unsigned short", 16, False),
    "int": _integer("int", 32), "unsigned int": _integer("unsigned int", 32, False),
    "long": _integer("long", 64), "unsigned long": _integer("unsigned long", 64, False),
    "long long": _integer("long long", 64), "unsigned long long": _integer("unsigned long long", 64, False),
    **{f"int{w}_t": _integer(f"int{w}_t", w) for w in (8, 16, 32, 64)},
    **{f"uint{w}_t": _integer(f"uint{w}_t", w, False) for w in (8, 16, 32, 64)},
    "size_t": _integer("size_t", 64, False),
    "float": CType("floating", 32, True, "binary32", "float"), "double": CType("floating", 64, True, "binary64", "double"),
    "long double": CType("floating", 128, True, "binary128", "long double"),
}
"""The types, by the names they are written with."""

Bool, Int, Double = TYPES["bool"], TYPES["int"], TYPES["double"]
UnsignedInt, Long, UnsignedLong = TYPES["unsigned int"], TYPES["long"], TYPES["unsigned long"]
String = D.OfTypes("string", str)


def promoted(ctype: CType) -> CType:
    """The integer promotions: a bool or an integer narrower than `int` becomes `int`."""
    return Int if ctype.kind == "bool" or (ctype.kind == "integer" and ctype.width < 32) else ctype


def common(a: CType, b: CType) -> CType:
    """The usual arithmetic conversions of two arithmetic types."""
    if a.kind == "floating" or b.kind == "floating":
        floats = [t for t in (a, b) if t.kind == "floating"]
        return max(floats, key=lambda t: t.width)
    a, b = promoted(a), promoted(b)
    if a.signed == b.signed:
        return a if a.width >= b.width else b
    unsigned, signed = (a, b) if not a.signed else (b, a)
    return unsigned if unsigned.width >= signed.width else signed


def _named(ctype: CType) -> CType:
    """The type, under the name C writes it with: the first in `TYPES` that equals it."""
    return next(t for t in TYPES.values() if t == ctype)


def of(value: Any) -> D.Domain:
    """A constant's type: the first of `int`, `long` and `unsigned long` that holds an int, `double`, `bool`, or
    `String`."""
    if type(value) is int:
        return next((t for t in (Int, Long, UnsignedLong) if t.contains(value)), Anything)
    return {bool: Bool, float: Double, str: String}.get(type(value), Anything)


class _Typed:
    """A signature over arithmetic types: `rule` gives the result type of the argument types, or None when they do not
    apply; an argument of unknown domain makes the result unknown, or `known` when given."""

    def __init__(self, arity: int, rule: Callable[[Sequence[CType]], CType | None], text: str, known: D.Domain | None = None):
        self._arity, self._rule, self._text, self._known = arity, rule, text, known

    def arity(self) -> int:
        return self._arity

    def result(self, arguments: Sequence[D.Domain]) -> D.Domain | None:
        unknown = [a for a in arguments if not isinstance(a, CType)]
        if unknown:  # an argument of unknown domain: the result is too, unless the signature knows it
            return (self._known or Anything) if all(a is Anything for a in unknown) else None
        result = self._rule(arguments)  # type: ignore[arg-type]
        return None if result is None else _named(result)

    def describe(self) -> str:
        return self._text


def _arithmetic(types: Sequence[CType]) -> CType:
    return common(*types)


def _integral(types: Sequence[CType]) -> CType | None:
    return common(*types) if all(t.kind != "floating" for t in types) else None


def _shift(types: Sequence[CType]) -> CType | None:
    return promoted(types[0]) if all(t.kind != "floating" for t in types) else None


def _truth(types: Sequence[CType]) -> CType:
    return Bool


BINARY: dict[str, D.Signature] = {
    **{op: _Typed(2, _arithmetic, "(arithmetic, arithmetic) -> their common type") for op in ("+", "-", "*", "/")},
    **{op: _Typed(2, _integral, "(integer, integer) -> their common type") for op in ("%", "&", "^", "|")},
    **{op: _Typed(2, _shift, "(integer, integer) -> the promoted left type") for op in ("<<", ">>")},
    **{op: _Typed(2, _truth, "(arithmetic, arithmetic) -> bool", Bool) for op in ("<", "<=", ">", ">=", "==", "!=")},
    **{op: _Typed(2, _truth, "(scalar, scalar) -> bool", Bool) for op in ("&&", "||")},
}
"""The binary operators."""

UNARY: dict[str, D.Signature] = {
    "+": _Typed(1, lambda types: promoted(types[0]), "(arithmetic) -> its promoted type"),
    "-": _Typed(1, lambda types: promoted(types[0]), "(arithmetic) -> its promoted type"),
    "~": _Typed(1, lambda types: promoted(types[0]) if types[0].kind != "floating" else None, "(integer) -> its promoted type"),
    "!": _Typed(1, _truth, "(scalar) -> bool", Bool),
}
"""The unary operators."""

MEMBER = D.Function((Anything,), Anything)
"""A member of a struct or class."""
SUBSCRIPT = D.Function((Anything, Anything), Anything)
"""An element of an array."""
CALL = D.Opaque()
"""A function the scope provides."""
CONDITIONAL = D.Function((Anything, Anything, Anything), Anything)
"""`condition ? a : b`."""
CAST = D.Function((Anything,), Anything)
"""`(type) operand`, whose domain is its type (the term's own)."""
