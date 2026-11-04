"""Domains of the C dialect: C's and C++'s arithmetic types, under the LP64 data model, and the signatures of their
operators, which `Cpp` shares.

A `CType` is a type and a domain: `bool`; the integers by width and signedness (`char`, `signed char`, `unsigned
char`, `short`, `int`, `long`, `long long` and their unsigned forms, and `<stdint.h>`'s `int8_t` ... `uint64_t` and
`size_t`, which name the same types); and the floating types, IEEE 754's `binary32` (`float`), `binary64` (`double`)
and `binary128` (`long double`). Under LP64 `char` is signed and 8 bits wide, `short` 16, `int` 32, and `long` and
`long long` 64. `TYPES` maps each name to its type; equal types compare equal whatever their names.

`promoted(type)` applies the integer promotions (a narrower integer or a bool becomes `int`) and `common(a, b)` the
usual arithmetic conversions: the wider floating type if either is floating, otherwise the promoted types, the wider if
they agree in signedness, else the unsigned one when it is at least as wide, else the signed one. The signatures follow
the evaluator's rules (see `Evaluators`): arithmetic gives the common type, shifts the promoted left operand's,
comparisons and logic `bool`. `of(value)` gives a native value's type: `int`, `long` or `unsigned long` for an int, as
the first that holds it, `double` for a float, `bool`, and `String` for text.

A literal's type is what its text encodes (`literal(attributes, language)`), as C's and C++'s standards give it: an
integer's by its suffix and its base, the first of the types they allow that holds its value (an `unsigned int` for
`5u`; a decimal integer without a suffix is its value's, `of`); a floating literal's by its suffix (`float` for `f`,
`long double` for `L`); a character literal's (an int, its code) `int` in C and `char` in C++; a string's `String`. What
an encoding prefix (`L`, `u8`, `u`, `U`) or any other suffix encodes is a domain named by its type (`wchar_t`,
`_Float16`), which no evaluator has values of; a suffix the language does not write gives `Anything`, its type unknown.
`out_of_range(attributes, language)` says what is wrong with an integer literal that its type does not hold, one that
fits none of the types its suffix and base allow (a value out of range, PRI-023). `arithmetic(names)` is the arithmetic type a type name's specifiers
name (`unsigned int`, `uint8_t`), or None.

The other operators, which no evaluator computes (`*`, `&`, `++`, `--`, `,`, the assignments, C++'s `<=>`, `.*`, `->*`,
its folds and named casts), have signatures that say only how many operands each takes.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["CType", "TYPES", "Bool", "Int", "Double", "String", "Anything", "promoted", "common", "of", "literal",
           "out_of_range", "arithmetic", "NULLPTR", "BINARY", "BINARY_CPP", "UNARY", "POSTFIX", "ASSIGNMENT", "FOLD", "CASTS", "MEMBER",
           "SUBSCRIPT", "CALL", "CONDITIONAL", "CAST", "SIZE"]


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
NULLPTR = D.OfTypes("nullptr_t", type(None))
"""`nullptr`'s type, C23's and C++'s."""
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
    """A signature over arithmetic types: `result_type` gives the result type of the argument types, or None when they do not
    apply; an argument of unknown domain makes the result unknown, or `known` when given."""

    def __init__(self, arity: int, result_type: Callable[[Sequence[CType]], CType | None], text: str, known: D.Domain | None = None):
        self._arity, self._result_type, self._text, self._known = arity, result_type, text, known

    def arity(self) -> int:
        return self._arity

    def result(self, arguments: Sequence[D.Domain]) -> D.Domain | None:
        unknown = [a for a in arguments if not isinstance(a, CType)]
        if unknown:  # an argument of unknown domain: the result is too, unless the signature knows it
            return (self._known or Anything) if all(a is Anything for a in unknown) else None
        result = self._result_type(arguments)  # type: ignore[arg-type]
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


_ONE = D.Function((Anything,), Anything)
_TWO = D.Function((Anything, Anything), Anything)

_ARITHMETIC: dict[str, D.Signature] = {
    **{op: _Typed(2, _arithmetic, "(arithmetic, arithmetic) -> their common type") for op in ("+", "-", "*", "/")},
    **{op: _Typed(2, _integral, "(integer, integer) -> their common type") for op in ("%", "&", "^", "|")},
    **{op: _Typed(2, _shift, "(integer, integer) -> the promoted left type") for op in ("<<", ">>")},
    **{op: _Typed(2, _truth, "(arithmetic, arithmetic) -> bool", Bool) for op in ("<", "<=", ">", ">=", "==", "!=")},
    **{op: _Typed(2, _truth, "(scalar, scalar) -> bool", Bool) for op in ("&&", "||")},
}

BINARY: dict[str, D.Signature] = {**_ARITHMETIC, ",": _TWO}
"""The binary operators: the arithmetic ones, and the comma."""

BINARY_CPP: dict[str, D.Signature] = {**_ARITHMETIC, **{op: _TWO for op in (",", "<=>", ".*", "->*")}}
"""C++'s binary operators: C's, and the three-way comparison and the pointers to members."""

UNARY: dict[str, D.Signature] = {
    "+": _Typed(1, lambda types: promoted(types[0]), "(arithmetic) -> its promoted type"),
    "-": _Typed(1, lambda types: promoted(types[0]), "(arithmetic) -> its promoted type"),
    "~": _Typed(1, lambda types: promoted(types[0]) if types[0].kind != "floating" else None, "(integer) -> its promoted type"),
    "!": _Typed(1, _truth, "(scalar) -> bool", Bool),
    **{op: _ONE for op in ("*", "&", "++", "--")},
}
"""The unary operators."""

POSTFIX: dict[str, D.Signature] = {op: _ONE for op in ("++", "--")}
"""The postfix operators."""

ASSIGNMENT: dict[str, D.Signature] = {op: _TWO for op in (
    "=", "*=", "/=", "%=", "+=", "-=", ">>=", "<<=", "&=", "^=", "|=")}
"""The assignment operators."""

FOLD: dict[str, D.Signature] = {op: D.Opaque() for op in (
    "+", "-", "*", "/", "%", "^", "&", "|", "<<", ">>", "+=", "-=", "*=", "/=", "%=", "^=", "&=", "|=", "<<=", ">>=",
    "=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", ",", ".*", "->*")}
"""C++'s fold operators: a fold has one operand or two."""

CASTS: dict[str, D.Signature] = {op: D.Opaque() for op in (
    "static_cast", "dynamic_cast", "const_cast", "reinterpret_cast")}
"""C++'s named casts (the terms their type names hold among their arguments)."""

MEMBER = D.Opaque()
"""A member of a struct or class (in C++, a name, whose template arguments are its terms too)."""
SUBSCRIPT = D.Opaque()
"""An element of an array, of one index or several (C++23)."""
CALL = D.Opaque()
"""A function the scope provides."""
CONDITIONAL = D.Opaque()
"""`condition ? a : b`, or GNU's `condition ?: b`."""
CAST = D.Opaque()
"""`(type) operand`, whose domain is its type, where it is arithmetic (the terms a type name holds, an array's size,
among its arguments)."""
SIZE = D.Opaque(TYPES["size_t"])
"""`sizeof` and `alignof`, of an expression or a type: a `size_t`."""

_ENCODINGS = {"L": "wchar_t", "u8": "char8_t", "u": "char16_t", "U": "char32_t"}
_FLOATING = {"f": "float", "F": "float", "l": "long double", "L": "long double"}
_EXTENDED = {"f16": "_Float16", "f32": "_Float32", "f64": "_Float64", "f128": "_Float128", "f32x": "_Float32x",
             "f64x": "_Float64x", "f128x": "_Float128x", "bf16": "std::bfloat16_t", "df": "_Decimal32",
             "dd": "_Decimal64", "dl": "_Decimal128"}
_DECIMAL = {"": ("int", "long", "long long"), "u": ("unsigned int", "unsigned long", "unsigned long long"),
            "l": ("long", "long long"), "ul": ("unsigned long", "unsigned long long"), "ll": ("long long",),
            "ull": ("unsigned long long",), "z": ("long",), "uz": ("size_t",)}
_OTHER = {"": ("int", "unsigned int", "long", "unsigned long", "long long", "unsigned long long"),
          "l": ("long", "unsigned long", "long long", "unsigned long long"), "ll": ("long long", "unsigned long long")}


def _integer_suffix(suffix: str) -> str:
    """An integer suffix in one spelling: lowercase, `u` first (`LLU` is `ull`)."""
    lower = suffix.lower()
    return "u" + lower.replace("u", "") if "u" in lower else lower


def literal(attributes: Any, language: str = "C") -> D.Domain | None:
    """A literal's type, by what its text encodes (its `prefix`, `quote`, `base` and `suffix`) and its value, in
    `language` (`C` or `C++`); None where it is its value's own (`of`): a decimal integer or a floating literal without
    a suffix, a bool. A domain of a type no evaluator has values of is named by it (`wchar_t`, `_BitInt`)."""
    value, prefix, suffix = attributes.get("value"), attributes.get("prefix"), attributes.get("suffix")
    if type(value) is str:
        return String if prefix is None else D.OfTypes(f"{_ENCODINGS.get(prefix, prefix)} string", str)
    if type(value) is float:
        if suffix is None:
            return None
        named = _FLOATING.get(suffix) or _EXTENDED.get(suffix.lower(), suffix)
        return TYPES[named] if named in TYPES else D.OfTypes(named, float)
    if type(value) is not int:
        return None
    if attributes.get("quote") == "'":  # a character literal: its code
        if prefix is None:
            return Int if language == "C" else TYPES["char"]
        if prefix == "u8" and language == "C":
            return TYPES["unsigned char"]
        return D.OfTypes(_ENCODINGS.get(prefix, prefix), int)
    normal = _integer_suffix(suffix or "")
    if normal in ("wb", "uwb"):
        return D.OfTypes("unsigned _BitInt" if normal == "uwb" else "_BitInt", int)
    decimal = attributes.get("base") in (None, 10)
    if not normal and decimal:
        return None
    names = (_DECIMAL if decimal else {**_DECIMAL, **_OTHER}).get(normal)
    if names is None:  # a suffix the language does not write: its type is unknown
        return Anything
    return next((TYPES[name] for name in names if TYPES[name].contains(value)), TYPES[names[-1]])


def out_of_range(attributes: Any, language: str = "C") -> str | None:
    """What is wrong with an integer literal's value, if it is not a value of its type (`literal`, else its value's
    own, `of`): one that fits none of the types its suffix and base allow (`2**70`, `2**70` with `u`, `-5` with `u`);
    None for any other literal."""
    value = attributes.get("value")
    if type(value) is not int:
        return None
    domain = literal(attributes, language)
    domain = of(value) if domain is None else domain
    if isinstance(domain, CType):
        return None if domain.contains(value) else f"integer literal {value} does not fit '{domain.name()}'"
    return f"integer literal {value} does not fit any type" if domain is Anything and "suffix" not in attributes else None


_KEYWORDS = frozenset({"signed", "unsigned", "short", "long", "int", "char", "float", "double", "bool", "_Bool"})
_QUALIFIERS = frozenset({"const", "volatile", "restrict", "__restrict", "__restrict__"})


def arithmetic(names: Any) -> CType | None:
    """The arithmetic type a type name's specifiers name, by their keywords and type names in any order (`unsigned
    long int`, `uint8_t`), cv-qualifiers aside; None for any other type."""
    words = [name for name in names if name not in _QUALIFIERS]
    if len(words) == 1 and words[0] in TYPES:
        return TYPES[words[0]]
    if not words or any(word not in _KEYWORDS for word in words):
        return None
    signed, unsigned, longs = "signed" in words, "unsigned" in words, words.count("long")
    rest = sorted(word for word in words if word not in ("signed", "unsigned", "long"))
    if (signed and unsigned) or len(set(rest)) != len(rest) or words.count("signed") + words.count("unsigned") > 1:
        return None
    sign = signed or unsigned
    # a lone keyword that names a type (`float`, `char`) is among `TYPES`, above
    if rest == ["_Bool"] and not longs and not sign:
        return TYPES["bool"]
    if rest == ["double"] and longs == 1 and not sign:
        return TYPES["long double"]
    if rest == ["char"] and not longs and sign:
        return TYPES["unsigned char" if unsigned else "signed char"]
    if rest in ([], ["int"], ["short"], ["int", "short"]) and longs <= 2 and not ("short" in rest and longs):
        base = "short" if "short" in rest else ("int", "long", "long long")[longs]
        return TYPES[("unsigned " if unsigned else "") + base]
    return None
