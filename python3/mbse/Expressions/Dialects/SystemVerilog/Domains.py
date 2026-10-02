"""Domains of the SystemVerilog dialect: its integral types, 4-state or 2-state vectors of a width and a signedness, and
`real` and `shortreal`.

An `SvType` is a type and a domain: `integral` (a vector of `width` bits, `signed` or not, of 4 states (0, 1, x, z) or
of 2 (0, 1)) or `real` of IEEE 754's `binary64` or `binary32` (`shortreal`). `TYPES` names the built-in ones: `bit`,
`logic`, `reg` (a single bit), `byte` (8), `shortint` (16), `int` (32), `longint` (64), `integer` (32, 4-state),
`time` (64, 4-state, unsigned), `real` and `shortreal`.

A value of an integral type is a `Logic`: its type and two patterns of its width, `aval` and `bval`, which encode each
bit as VPI does (0 is 0/0, 1 is 1/0, z is 0/1, x is 1/1). `Logic.of(bits, signed)` reads `bits` (MSB first, of
`0`, `1`, `x` and `z`), `bits` gives them back, `known` tells a value without x or z, and `integer()` its integer, by
its signedness. `real` values are floats.

Expressions are sized as IEEE 1800 says (11.6, 11.8): `common` gives the type context-determined operands share, and
the signatures follow (see `Evaluators`).
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["SvType", "Logic", "TYPES", "Real", "Integer", "Bit", "Anything", "vector", "common", "of", "BINARY", "UNARY",
           "CONDITIONAL", "CONCATENATION", "REPLICATION", "SELECT", "RANGE", "INSIDE", "SPAN", "CAST", "MEMBER", "CALL",
           "METHOD", "ITERATE"]


@dataclass(frozen=True)
class SvType:
    """A type: `integral` with its `width`, signedness and number of `states` (4 or 2), or `real` with its IEEE 754
    `format`. Its `name` is the one it is written with; types compare by the rest."""

    kind: str
    width: int = 64
    signed: bool = False
    states: int = 4
    format: str | None = None
    label: str = field(default="", compare=False)

    def name(self) -> str:
        if self.label:
            return self.label
        return f"{'logic' if self.states == 4 else 'bit'}{' signed' if self.signed else ''} [{self.width - 1}:0]"

    def contains(self, value: Any) -> bool:
        if self.kind == "real":
            return type(value) is float
        return isinstance(value, Logic) and value.type == self

    def includes(self, other: D.Domain) -> bool:
        if isinstance(other, D.OfUnion):
            return all(self.includes(member) for member in other.members)
        return other == self

    def __repr__(self) -> str:
        return self.name()


def vector(width: int, signed: bool = False, states: int = 4) -> SvType:
    """An integral type of a width: a packed `logic` or `bit` vector."""
    return SvType("integral", width, signed, states)


TYPES: dict[str, SvType] = {
    "bit": SvType("integral", 1, False, 2, label="bit"), "logic": SvType("integral", 1, False, 4, label="logic"),
    "reg": SvType("integral", 1, False, 4, label="reg"), "byte": SvType("integral", 8, True, 2, label="byte"),
    "shortint": SvType("integral", 16, True, 2, label="shortint"), "int": SvType("integral", 32, True, 2, label="int"),
    "longint": SvType("integral", 64, True, 2, label="longint"), "integer": SvType("integral", 32, True, 4, label="integer"),
    "time": SvType("integral", 64, False, 4, label="time"),
    "real": SvType("real", 64, True, 2, "binary64", "real"), "shortreal": SvType("real", 32, True, 2, "binary32", "shortreal"),
}
"""The built-in types, by name."""

Real, Integer, Bit = TYPES["real"], TYPES["integer"], TYPES["bit"]
Longint = TYPES["longint"]
_STATES = {(0, 0): "0", (1, 0): "1", (0, 1): "z", (1, 1): "x"}


@dataclass(frozen=True)
class Logic:
    """A value of an integral type: each bit by `aval` and `bval` (0 is 0/0, 1 is 1/0, z is 0/1, x is 1/1)."""

    type: SvType
    aval: int
    bval: int = 0

    @staticmethod
    def of(bits: str, signed: bool = False, states: int = 4) -> Logic:
        """The value whose bits, MSB first, are `bits`, of `0`, `1`, `x` and `z`."""
        aval = int("".join("1" if b in "1x" else "0" for b in bits), 2)
        bval = int("".join("1" if b in "xz" else "0" for b in bits), 2)
        if states == 2:  # a 2-state vector has no x or z: they are 0
            aval, bval = aval & ~bval, 0
        return Logic(vector(len(bits), signed, states), aval, bval)

    @staticmethod
    def number(type: SvType, value: int) -> Logic:
        """The value of an integer in `type`, wrapped into its width."""
        return Logic(type, value % (1 << type.width))

    @property
    def bits(self) -> str:
        """The bits, MSB first."""
        width = self.type.width
        return "".join(_STATES[(self.aval >> i & 1, self.bval >> i & 1)] for i in range(width - 1, -1, -1))

    @property
    def known(self) -> bool:
        """Whether no bit is x or z."""
        return self.bval == 0

    def integer(self) -> int:
        """The integer, by the type's signedness; raises ValueError when a bit is x or z."""
        if not self.known:
            raise ValueError(f"{self} has unknown bits")
        top = 1 << (self.type.width - 1)
        return self.aval - (top << 1) if self.type.signed and self.aval & top else self.aval

    def __repr__(self) -> str:
        return f"{self.type.width}'{'s' if self.type.signed else ''}b{self.bits}"


def common(types: Sequence[SvType]) -> SvType:
    """The type context-determined operands share: real if any is (`shortreal` if all are), otherwise the widest width,
    signed if all are, and 4-state if any is."""
    if any(t.kind == "real" for t in types):  # real, unless every operand is a shortreal
        return TYPES["shortreal"] if all(t.format == "binary32" for t in types) else Real
    return vector(max(t.width for t in types), all(t.signed for t in types), max(t.states for t in types))


def of(value: Any) -> D.Domain:
    """A constant's type: `integer` for an int that fits 32 bits, `longint` for 64; `real` for a float; and
    `Anything` otherwise."""
    if type(value) is int:
        return Integer if -(1 << 31) <= value < 1 << 31 else Longint if -(1 << 63) <= value < 1 << 63 else Anything
    return Real if type(value) is float else Anything


class _Sized:
    """A signature over SystemVerilog types: `rule` gives the result type of the argument types, or None when they do
    not apply; an argument of unknown domain makes the result unknown, or `known` when given."""

    def __init__(self, arity: int, rule: Callable[[Sequence[SvType]], SvType | None], text: str, known: D.Domain | None = None):
        self._arity, self._rule, self._text, self._known = arity, rule, text, known

    def arity(self) -> int:
        return self._arity

    def result(self, arguments: Sequence[D.Domain]) -> D.Domain | None:
        unknown = [a for a in arguments if not isinstance(a, SvType)]
        if unknown:
            return (self._known or Anything) if all(a is Anything for a in unknown) else None
        return self._rule(arguments)  # type: ignore[arg-type]

    def describe(self) -> str:
        return self._text


_ONE = vector(1)


def _integral(types: Sequence[SvType]) -> bool:
    return all(t.kind == "integral" for t in types)


BINARY: dict[str, D.Signature] = {
    **{op: _Sized(2, common, "(T, T) -> their common type") for op in ("+", "-", "*", "/")},
    "%": _Sized(2, lambda ts: common(ts) if _integral(ts) else None, "(integral, integral) -> their common type"),
    "**": _Sized(2, lambda ts: common(ts) if "real" in (ts[0].kind, ts[1].kind) else ts[0], "(T, U) -> T, or real"),
    **{op: _Sized(2, lambda ts: common(ts) if _integral(ts) else None, "(integral, integral) -> their common type")
       for op in ("&", "|", "^", "^~", "~^")},
    **{op: _Sized(2, lambda ts: ts[0] if _integral(ts) else None, "(integral, integral) -> the left type")
       for op in ("<<", ">>", "<<<", ">>>")},
    **{op: _Sized(2, lambda ts: _ONE, "(T, T) -> logic", _ONE)
       for op in ("<", "<=", ">", ">=", "==", "!=", "&&", "||", "->", "<->")},
    **{op: _Sized(2, lambda ts: Bit if _integral(ts) else None, "(integral, integral) -> bit", Bit)
       for op in ("===", "!==")},
    **{op: _Sized(2, lambda ts: _ONE if _integral(ts) else None, "(integral, integral) -> logic", _ONE)
       for op in ("==?", "!=?")},
}
"""The binary operators."""

UNARY: dict[str, D.Signature] = {
    **{op: _Sized(1, lambda ts: ts[0], "(T) -> T") for op in ("+", "-")},
    "~": _Sized(1, lambda ts: ts[0] if _integral(ts) else None, "(integral) -> its type"),
    "!": _Sized(1, lambda ts: _ONE, "(T) -> logic", _ONE),
    **{op: _Sized(1, lambda ts: _ONE if _integral(ts) else None, "(integral) -> logic", _ONE)
       for op in ("&", "~&", "|", "~|", "^", "~^", "^~")},
}
"""The unary operators, the reductions among them."""

CONDITIONAL = D.Function((Anything, Anything, Anything), Anything)
CONCATENATION = D.Opaque()
REPLICATION = D.Function((Anything, Anything), Anything)
SELECT = D.Function((Anything, Anything), Anything)
RANGE = D.Function((Anything, Anything, Anything), Anything)
INSIDE = D.Opaque(_ONE)
SPAN = D.Function((Anything, Anything), Anything)
CAST = D.Function((Anything,), Anything)
MEMBER = D.Function((Anything,), Anything)
CALL = D.Opaque()


class _Iterated(D.Opaque):
    """An array method's `with` clause: the domain of an array's items is not known statically."""

    def items(self, domain: D.Domain) -> D.Domain:
        return Anything


METHOD = D.Function((Anything,), Anything)
ITERATE = _Iterated()
