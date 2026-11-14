"""Domains of the SystemVerilog dialect: the types its evaluation, inference and validation compute on, each read from
the domains its dialect stores, and the sized vectors computed from a term's own width and signedness.

An `SvType` is a type and a domain: `integral` (a vector of `width` bits, `signed` or not, of 4 states (0, 1, x, z) or
of 2 (0, 1)) or `real` of an IEEE 754 `format`. It is the working value the arithmetic computes on, not a type table:
a named type is a stored domain of SystemVerilog's dialect, `Expressions.SystemVerilog.Expressions`, which its
`define` writes (`logic`, `reg`, `integer`, `time`, `bit`, `byte`, `shortint`, `int`, `longint`, `real`, `shortreal`),
and `named(store, name)` reads one as an `SvType`, labelled with its `Defines` name: its width and signedness from its
kind's properties (`Framework.Domains.kind_of` and `properties`), its states from its kind (`logic` 4, `bit` 2), and a
real's format and width from IEEE 754's kind. A type no stored domain names is refused
by name. `vector(width, signed, states)` is a sized vector's type, which no domain names (`logic [7:0]`).

A value of an integral type is a `Logic`: its type and two patterns of its width, `aval` and `bval`, which encode each
bit as VPI does (0 is 0/0, 1 is 1/0, z is 0/1, x is 1/1). `Logic.of(bits, signed)` reads `bits` (MSB first, of
`0`, `1`, `x` and `z`), `bits` gives them back, `known` tells a value without x or z, and `integer()` its integer, by
its signedness. `real` values are floats.

Expressions are sized as IEEE 1800 says (11.6, 11.8): `common` gives the type context-determined operands share, and
the signatures follow (see `Simplifiers`). `of(value)` names a constant's type. The rules (`common`, the signatures,
which type a constant has) stay code, and the signatures are `Dialect.infer`'s, to be replaced with stored domains as
domain inference reads them ([CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)).
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything
from mbse.Schemas.Framework import Proxies

__all__ = ["SvType", "Logic", "Anything", "NAMES", "named", "vector", "unsized", "common", "of", "BINARY", "UNARY",
           "INCREMENT", "ASSIGNMENT", "CONDITIONAL", "SELECT", "RANGE", "INSIDE", "SPAN", "CAST", "MEMBER",
           "PARENTHESIZED"]

NAMES = ("logic", "reg", "integer", "time", "bit", "byte", "shortint", "int", "longint", "real", "shortreal")
"""The types SystemVerilog's keywords name that its dialect stores as domains, in its `define`'s order: a cast to one
reads it from the store; a cast to another (`realtime`, a type a program declares) is not read."""


@dataclass(frozen=True)
class SvType:
    """A type: `integral` with its `width`, signedness and number of `states` (4 or 2), or `real` with its IEEE 754
    `format`. Its `name` is the one it is written with, its `label` where a stored domain names it; its `domain` is that
    stored domain, None for a sized vector; types compare by the rest."""

    kind: str
    width: int = 64
    signed: bool = False
    states: int = 4
    format: str | None = None
    label: str = field(default="", compare=False)
    domain: Any = field(default=None, compare=False, repr=False)

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


def unsized(value: int, signed: bool = False) -> SvType:
    """An unsized based integer's type (`'hFF`): a 4-state vector of 32 bits, or as many as its value needs, unsigned
    unless written signed (5.7.1)."""
    return SvType("integral", max(32, value.bit_length()), signed, 4)


def named(store: Any, name: str) -> SvType:
    """The type SystemVerilog defines in `store` by `name`: the domain its dialect's singleton owns by that name, read as
    an `SvType`; raises ValueError where it defines none (its `define` has not run, or no type has the name)."""
    domain = D.domains(store.Instances.Expressions.SystemVerilog.Expressions).get(name)
    if domain is None:
        raise ValueError(f"{name!r} is not a type SystemVerilog defines")
    _, kind, _ = D.kind_of(domain)
    properties = D.properties(domain)
    if kind == "ieee754":  # IEEE 754's: a real, of its format
        format = properties["format"]
        return SvType("real", properties["width"], True, 2, format, name, domain)
    return SvType("integral", properties["width"], properties["signed"], 4 if kind == "logic" else 2, None, name, domain)


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
    signed if all are, and 4-state if any is. A real is an operand's type, or `real`, read from the store of a real
    operand's domain."""
    reals = [t for t in types if t.kind == "real"]
    if reals:  # real, unless every operand is a shortreal
        if all(t.format == "binary32" for t in types):
            return reals[0]
        wide = [t for t in reals if t.format == "binary64"]
        return wide[0] if wide else named(Proxies.store_of(reals[0].domain), "real")
    return vector(max(t.width for t in types), all(t.signed for t in types), max(t.states for t in types))


def of(value: Any) -> str | None:
    """The name of a constant's type: `integer` for an int that fits 32 bits, `longint` for 64; `real` for a float; and
    None otherwise (a string, or an int no type holds)."""
    if type(value) is int:
        return "integer" if -(1 << 31) <= value < 1 << 31 else "longint" if -(1 << 63) <= value < 1 << 63 else None
    return "real" if type(value) is float else None


class _Sized:
    """A signature over SystemVerilog types: `result_type` gives the result type of the argument types, or None when they do
    not apply; an argument of unknown domain makes the result unknown, or `known` when given."""

    def __init__(self, arity: int, result_type: Callable[[Sequence[SvType]], SvType | None], text: str, known: D.Domain | None = None):
        self._arity, self._result_type, self._text, self._known = arity, result_type, text, known

    def arity(self) -> int:
        return self._arity

    def result(self, arguments: Sequence[D.Domain]) -> D.Domain | None:
        unknown = [a for a in arguments if not isinstance(a, SvType)]
        if unknown:
            return (self._known or Anything) if all(a is Anything for a in unknown) else None
        return self._result_type(arguments)  # type: ignore[arg-type]

    def describe(self) -> str:
        return self._text


_ONE, _BIT = vector(1), vector(1, False, 2)  # a 1-bit result; `===`'s is 2-state, which `Expressions` names `bit`


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
    **{op: _Sized(2, lambda ts: _BIT if _integral(ts) else None, "(integral, integral) -> bit", _BIT)
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

INCREMENT: dict[str, D.Signature] = {op: _Sized(1, lambda ts: ts[0] if _integral(ts) else None, "(integral) -> its type")
                                     for op in ("++", "--")}
"""The increments, prefix or postfix."""

ASSIGNMENT: dict[str, D.Signature] = {op: _Sized(2, lambda ts: ts[0], "(T, U) -> T")
                                      for op in ("=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=",
                                                 "<<<=", ">>>=")}
"""The assignment operators: an assignment's value is its target's type."""

CONDITIONAL = D.Opaque()
SELECT = D.Function((Anything, Anything), Anything)
RANGE = D.Function((Anything, Anything, Anything), Anything)
INSIDE = D.Opaque(_ONE)
SPAN = D.Function((Anything, Anything), Anything)
CAST = D.Function((Anything, Anything), Anything)
MEMBER = D.Function((Anything,), Anything)
PARENTHESIZED = _Sized(1, lambda ts: ts[0], "(T) -> T", Anything)
