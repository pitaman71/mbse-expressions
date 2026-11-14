"""Domains of the C dialect: the types C's and C++'s evaluation, inference and validation compute on, each read from the
domains their dialects and their holder's ABI store, and the signatures of their operators, which `Cpp` shares.

A `CType` is a type and a domain: `bool`, an integer by its width and signedness, or a floating type of an IEEE 754
format, named (`binary64`) or, where IEEE 754 names none, by its parameters (x87's `(2, 64, 16383)`). It is the working
value the arithmetic computes on, not a type table: a named type is a stored domain, which `Types` reads. A C term's
types are among C's own domains (`Expressions.C.Expressions`, which its `define` writes: `bool`, the exact-width
integers, the `_FloatN` and decimal types), then among those of the ABI its holder names
(`Expressions.Framework.HasAbi`, the holder's adjacency `abi`: `Expressions.SystemV.AMD64` or `Expressions.Arm.AAPCS64`,
which hold `int`, `long`, `char`, `long double`, `size_t`, ...); a C++ term's among C++'s
(`Expressions.Cpp.Expressions`) then its holder's ABI's (mbse-basis [CAP-267: C and C++ terms read under the ABI their holder names](mbse:mbse-basis/docs/capabilities/CAP-267.md#decided)). `Types(term, path)` finds the
holder from any term or record within it (`Terms.holder_of`: a lone term is refused, mbse-schemas' TypeError, "the value
does not belong to a store") when it first reads a type, and reads each once: `named(name)` is the type, a `CType`
labelled with its `Defines` name and keeping the domain it was read from and the `Types` it was read through, so that a
rule reaches the store for a type no operand carries (the promotions' `int`); its width and signedness come from its
kind (11404's `integer`; `modulo`, unsigned, of the width its modulus gives; `boolean`), a floating type's format and
width from IEEE 754's. A type neither dialect defines is refused by name: "'int' is not a type C defines, and its
expression names no ABI", or "'int' is not a type C or AMD64 defines"; `find(name)` gives None instead where the holder
names an ABI (a cast to a type a program declares).

`promoted(type)` applies the integer promotions (a narrower integer or a bool becomes `int`) and `common(a, b)` the
usual arithmetic conversions: the wider floating type if either is floating, otherwise the promoted types, the wider if
they agree in signedness, else the unsigned one when it is at least as wide, else the signed one; a decimal floating
type and a binary one have none (C's constraint), so `common` gives None. The signatures follow the evaluator's rules
(see `Simplifiers`): arithmetic gives the common type, shifts the promoted left operand's, comparisons and logic `bool`,
which the dialect's kinds read from the store (`Expressions`), and a result is named by the first of `NAMES`, C's names
in the order its standard lists them, that its types define equal to it. `of(value, types)` names a native value's type:
`int`, `long` or `unsigned long` for an int, as the first that holds it, `double` for a float, `bool`; None otherwise.
The rules stay code, and the signatures are `Dialect.infer`'s, to be replaced with stored domains as domain inference
reads them ([CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)).

A literal's type is what its text encodes (`literal(attributes, language, types)`), as C's and C++'s standards give it,
a stored domain found by name (mbse-basis [CAP-229: the C expression dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md#decided)): an integer's by its suffix
and its base, the first of the types they allow that holds its value (an `unsigned int` for `5u`; a decimal integer
without a suffix is its value's, `of`); a floating literal's by its suffix (`float` for `f`, `long double` for `L`,
`_Float16` for `f16` in C and `std::float16_t` in C++), else `double`; a character literal's (an int, its code) `int` in
C and `char` in C++, its encoding prefix's type otherwise (`wchar_t`, `char8_t`); a bool's `bool`; a string's `String`.
What `_BitInt` or a prefix no language has encodes is a domain named by its type, which no evaluator has values of; a
suffix the language does not write gives `Anything`, its type unknown. `out_of_range(attributes, language, types)` says
what is wrong with an integer literal that its type does not hold, one that fits none of the types its suffix and base
allow, by the stored domain's range (a value out of range, PRI-023). `arithmetic(names)` is the name of the arithmetic
type a type name's specifiers name (`unsigned int`, `uint8_t`), or None.

The other operators, which no evaluator computes (`*`, `&`, `++`, `--`, `,`, the assignments, C++'s `<=>`, `.*`, `->*`,
its folds and named casts), have signatures that say only how many operands each takes.
"""

from __future__ import annotations

import functools
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from mbse.Expressions.Patterns.Expressions import Ieee754
from mbse.Expressions.Framework import Domains as D, Objects, Terms
from mbse.Expressions.Framework.Domains import Anything
from mbse.Schemas.Framework import Proxies

__all__ = ["CType", "Types", "NAMES", "String", "Anything", "promoted", "common", "of", "literal", "out_of_range",
           "arithmetic", "NULLPTR", "BINARY", "BINARY_CPP", "UNARY", "POSTFIX", "ASSIGNMENT", "FOLD", "CASTS", "MEMBER",
           "SUBSCRIPT", "CALL", "CONDITIONAL", "CAST", "SIZE"]

_NATIVE = ("binary16", "binary32", "binary64")  # the formats whose values are floats; any other's are text


@dataclass(frozen=True)
class CType:
    """An arithmetic type: its `kind` ('bool', 'integer' or 'floating'), its `width` in bits, its signedness, and for a
    floating type its IEEE 754 `format`, a name or its parameters. Its `name` is its `label`, the name its stored domain
    is defined by; its `domain` is that stored domain, and `types` the `Types` it was read through; types compare by the
    rest."""

    kind: str
    width: int
    signed: bool = True
    format: Ieee754.Format | None = None
    label: str = field(default="", compare=False)
    domain: Any = field(default=None, compare=False, repr=False)
    types: Types | None = field(default=None, compare=False, repr=False)

    def name(self) -> str:
        return self.label

    @property
    def decimal(self) -> bool:
        """Whether it is a decimal floating type."""
        return self.kind == "floating" and Ieee754.parameters(self.format)[0] == 10  # type: ignore[arg-type]

    def contains(self, value: Any) -> bool:
        """Whether a native is a value of this type."""
        if self.kind == "bool":
            return type(value) is bool
        if self.kind == "floating":
            return type(value) is (float if self.format in _NATIVE else str)
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


NAMES = ("bool", "char", "signed char", "unsigned char", "short", "unsigned short", "int", "unsigned int", "long",
         "unsigned long", "long long", "unsigned long long", "float", "double", "long double")
"""C's names of its standard types, in the order its standard lists them: a result is named by the first of them its
types define equal to it, else by its own."""


class Types:
    """The types a term of C or C++ reads, by name: among the domains its dialect (`path`, `C.Expressions` or
    `Cpp.Expressions`) stores, then among those of the ABI its holder names, in the store of the holder of `value` (a
    term, or anything within one), read when first needed, each once."""

    def __init__(self, value: Any, path: str = "C.Expressions"):
        self._value, self._path, self._name = value, path, Terms.dialect_name(path)
        self._read: dict[str, CType | None] = {}
        self._domains: tuple[dict[str, Any], dict[str, Any], str | None] | None = None

    def _stored(self) -> tuple[dict[str, Any], dict[str, Any], str | None]:
        """Its dialect's domains, its holder's ABI's, and the ABI's name (None where the holder names none)."""
        if self._domains is None:
            holder = Terms.holder_of(self._value)
            dialect = functools.reduce(getattr, self._path.split("."), Proxies.store_of(holder).Instances.Expressions)
            abis = [entry.targets["abi"] for entry in Objects.entries(holder, "abi")]
            abi = abis[0] if abis else None
            name = None if abi is None else Terms.dialect_name(abi.as_schema()
                .name[len("Expressions."):-len(".Dialect")])
            self._domains = D.domains(dialect), {} if abi is None else D.domains(abi), name
        return self._domains

    def _ctype(self, name: str, domain: Any) -> CType | None:
        """A stored domain as a type, labelled with its name; None for a domain that is not arithmetic (`nullptr_t`)."""
        _, kind, _ = D.kind_of(domain)
        properties = D.properties(domain)
        if kind == "boolean":
            return CType("bool", 1, False, None, name, domain, self)
        if kind == "integer":
            width, signed = properties["width"], properties["signed"]
            return CType("integer", width, signed, None, name, domain, self)  # type: ignore[arg-type]
        if kind == "modulo":  # unsigned: its width, of its modulus
            width = properties["modulus"].bit_length() - 1  # type: ignore[attr-defined]
            return CType("integer", width, False, None, name, domain, self)
        if kind == "ieee754":  # a format by its name, or by its parameters where IEEE 754 names none
            format = properties.get("format") or (properties["radix"], properties["precision"], properties["emax"])
            return CType("floating", properties["width"], True, format, name, domain, self)  # type: ignore[arg-type]
        return None

    def _lookup(self, name: str) -> CType | None:
        """The arithmetic type either dialect defines by `name`, or None."""
        if name not in self._read:
            own, abi, _ = self._stored()
            domain = own.get(name, abi.get(name))
            self._read[name] = None if domain is None else self._ctype(name, domain)
        return self._read[name]

    def find(self, name: str) -> CType | None:
        """The arithmetic type defined by `name`, or None where neither dialect defines one; raises ValueError where its
        dialect does not and its holder names no ABI."""
        own, _, abi = self._stored()
        if name not in own and abi is None:
            raise ValueError(f"{name!r} is not a type {self._name} defines, and its expression names no ABI")
        return self._lookup(name)

    def named(self, name: str) -> CType:
        """The type defined by `name`; raises ValueError where neither dialect defines it."""
        found = self.find(name)
        if found is None:
            raise ValueError(f"{name!r} is not a type {self._name} or {self._stored()[2]} defines")
        return found

    def label(self, ctype: CType) -> CType:
        """A result's type, under the name C writes it with: the first of `NAMES` its dialects define equal to it, else
        its own."""
        return next((t for t in map(self._lookup, NAMES) if t == ctype), ctype)


String = D.OfTypes("string", str)
NULLPTR = D.OfTypes("nullptr_t", type(None))
"""`nullptr`'s type, C23's and C++'s, which no arithmetic reads."""


def _types(ctype: CType) -> Types:
    return ctype.types  # type: ignore[return-value]


def promoted(ctype: CType) -> CType:
    """The integer promotions: a bool or an integer narrower than `int` becomes `int`, read through the type's
    `Types`."""
    if ctype.kind == "floating":
        return ctype
    int_ = _types(ctype).named("int")
    return int_ if ctype.kind == "bool" or ctype.width < int_.width else ctype


def common(a: CType, b: CType) -> CType | None:
    """The usual arithmetic conversions of two arithmetic types; None for a decimal floating type and a binary one,
    which C does not convert to one another."""
    if a.kind == "floating" or b.kind == "floating":
        floats = [t for t in (a, b) if t.kind == "floating"]
        if len(floats) == 2 and a.decimal != b.decimal:
            return None
        return max(floats, key=lambda t: t.width)
    a, b = promoted(a), promoted(b)
    if a.signed == b.signed:
        return a if a.width >= b.width else b
    unsigned, signed = (a, b) if not a.signed else (b, a)
    return unsigned if unsigned.width >= signed.width else signed


def of(value: Any, types: Types) -> str | None:
    """The name of a constant's type: the first of `int`, `long` and `unsigned long` that holds an int, `double` for a
    float, `bool`; None for anything else, or an int none holds."""
    if type(value) is int:
        return next((name for name in ("int", "long", "unsigned long") if types.named(name).contains(value)), None)
    return {bool: "bool", float: "double"}.get(type(value))


class _Typed:
    """A signature over arithmetic types: `result_type` gives the result type of the argument types, or None when they
    do not apply; an argument of unknown domain makes the result unknown."""

    def __init__(self, arity: int, result_type: Callable[[Sequence[CType]], CType | None], text: str):
        self._arity, self._result_type, self._text = arity, result_type, text

    def arity(self) -> int:
        return self._arity

    def result(self, arguments: Sequence[D.Domain]) -> D.Domain | None:
        unknown = [a for a in arguments if not isinstance(a, CType)]
        if unknown:  # an argument of unknown domain: the result is too
            return Anything if all(a is Anything for a in unknown) else None
        result = self._result_type(arguments)  # type: ignore[arg-type]
        return None if result is None else _types(result).label(result)

    def describe(self) -> str:
        return self._text


def _arithmetic(types: Sequence[CType]) -> CType | None:
    return common(*types)


def _integral(types: Sequence[CType]) -> CType | None:
    return common(*types) if all(t.kind != "floating" for t in types) else None


def _shift(types: Sequence[CType]) -> CType | None:
    return promoted(types[0]) if all(t.kind != "floating" for t in types) else None


def _truth(types: Sequence[CType]) -> CType:
    return _types(types[0]).named("bool")


_ONE = D.Function((Anything,), Anything)
_TWO = D.Function((Anything, Anything), Anything)

_ARITHMETIC: dict[str, D.Signature] = {
    **{op: _Typed(2, _arithmetic, "(arithmetic, arithmetic) -> their common type") for op in ("+", "-", "*", "/")},
    **{op: _Typed(2, _integral, "(integer, integer) -> their common type") for op in ("%", "&", "^", "|")},
    **{op: _Typed(2, _shift, "(integer, integer) -> the promoted left type") for op in ("<<", ">>")},
    **{op: _Typed(2, _truth, "(arithmetic, arithmetic) -> bool") for op in ("<", "<=", ">", ">=", "==", "!=")},
    **{op: _Typed(2, _truth, "(scalar, scalar) -> bool") for op in ("&&", "||")},
}

BINARY: dict[str, D.Signature] = {**_ARITHMETIC, ",": _TWO}
"""The binary operators: the arithmetic ones, and the comma."""

BINARY_CPP: dict[str, D.Signature] = {**_ARITHMETIC, **{op: _TWO for op in (",", "<=>", ".*", "->*")}}
"""C++'s binary operators: C's, and the three-way comparison and the pointers to members."""

UNARY: dict[str, D.Signature] = {
    "+": _Typed(1, lambda types: promoted(types[0]), "(arithmetic) -> its promoted type"),
    "-": _Typed(1, lambda types: promoted(types[0]), "(arithmetic) -> its promoted type"),
    "~": _Typed(1, lambda types: promoted(types[0]) if types[0].kind != "floating" else None,
        "(integer) -> its promoted type"),
    "!": _Typed(1, _truth, "(scalar) -> bool"),
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
among its arguments), which the dialect's kind reads from the store."""
SIZE = D.Opaque()
"""`sizeof` and `alignof`, of an expression or a type: a `size_t`, which the dialect's kinds read from the store."""

_ENCODINGS = {"L": "wchar_t", "u8": "char8_t", "u": "char16_t", "U": "char32_t"}
_FLOATING = {"f": "float", "F": "float", "l": "long double", "L": "long double"}
_EXTENDED = {
    "C": {"f16": "_Float16", "f32": "_Float32", "f64": "_Float64", "f128": "_Float128", "f32x": "_Float32x",
          "f64x": "_Float64x", "f128x": "_Float128x", "df": "_Decimal32", "dd": "_Decimal64", "dl": "_Decimal128"},
    "C++": {"f16": "std::float16_t", "f32": "std::float32_t", "f64": "std::float64_t", "f128": "std::float128_t",
            "bf16": "std::bfloat16_t"},
}
"""The extended floating suffixes each language writes, and the types they name."""
_DECIMAL = {"": ("int", "long", "long long"), "u": ("unsigned int", "unsigned long", "unsigned long long"),
            "l": ("long", "long long"), "ul": ("unsigned long", "unsigned long long"), "ll": ("long long",),
            "ull": ("unsigned long long",), "z": ("long",), "uz": ("size_t",)}
_OTHER = {"": ("int", "unsigned int", "long", "unsigned long", "long long", "unsigned long long"),
          "l": ("long", "unsigned long", "long long", "unsigned long long"), "ll": ("long long", "unsigned long long")}


def _integer_suffix(suffix: str) -> str:
    """An integer suffix in one spelling: lowercase, `u` first (`LLU` is `ull`)."""
    lower = suffix.lower()
    return "u" + lower.replace("u", "") if "u" in lower else lower


def literal(attributes: Any, language: str, types: Types) -> D.Domain | None:
    """A literal's type, by what its text encodes (its `prefix`, `quote`, `base` and `suffix`) and its value, in
    `language` (`C` or `C++`), found through `types`; None where its value has none (an int no type holds, or no
    value). A domain of a type no evaluator has values of is named by it (`_BitInt`)."""
    value, prefix, suffix = attributes.get("value"), attributes.get("prefix"), attributes.get("suffix")
    if type(value) is str:
        return String if prefix is None else D.OfTypes(f"{_ENCODINGS.get(prefix, prefix)} string", str)
    if type(value) is bool:
        return types.named("bool")
    if type(value) is float:
        if suffix is None:
            return types.named("double")
        named = _FLOATING.get(suffix) or _EXTENDED[language].get(suffix.lower())
        return Anything if named is None else types.named(named)  # a suffix the language does not write: unknown
    if type(value) is not int:
        return None
    if attributes.get("quote") == "'":  # a character literal: its code
        if prefix is None:
            return types.named("int" if language == "C" else "char")
        if prefix == "u8" and language == "C":
            return types.named("unsigned char")
        return types.named(_ENCODINGS[prefix]) if prefix in _ENCODINGS else D.OfTypes(prefix, int)
    normal = _integer_suffix(suffix or "")
    if normal in ("wb", "uwb"):
        return D.OfTypes("unsigned _BitInt" if normal == "uwb" else "_BitInt", int)
    decimal = attributes.get("base") in (None, 10)
    if not normal and decimal:
        name = of(value, types)
        return None if name is None else types.named(name)
    names = (_DECIMAL if decimal else {**_DECIMAL, **_OTHER}).get(normal)
    if names is None:  # a suffix the language does not write: its type is unknown
        return Anything
    allowed = [types.named(name) for name in names]
    return next((t for t in allowed if t.contains(value)), allowed[-1])


def out_of_range(attributes: Any, language: str, types: Types) -> str | None:
    """What is wrong with an integer literal's value, if it is not a value of its type (`literal`), by its stored
    domain's range: one that fits none of the types its suffix and base allow (`2**70`, `2**70` with `u`, `-5` with
    `u`); None for any other literal."""
    value = attributes.get("value")
    if type(value) is not int:
        return None
    domain = literal(attributes, language, types)
    if domain is None:
        return f"integer literal {value} does not fit any type"
    if isinstance(domain, CType):
        return None if domain.contains(value) else f"integer literal {value} does not fit '{domain.name()}'"
    return None


_KEYWORDS = frozenset({"signed", "unsigned", "short", "long", "int", "char", "float", "double", "bool", "_Bool"})
_QUALIFIERS = frozenset({"const", "volatile", "restrict", "__restrict", "__restrict__"})


def arithmetic(names: Any) -> str | None:
    """The name of the arithmetic type a type name's specifiers name, by their keywords and type names in any order
    (`unsigned long int` is `unsigned long`; `uint8_t`, a type's name, is itself), cv-qualifiers aside; None for any
    other type (`void`, several names)."""
    words = [name for name in names if name not in _QUALIFIERS]
    if len(words) == 1 and type(words[0]) is str and words[0] not in _KEYWORDS and words[0] != "void":
        return words[0]  # a type's name, which the store may define
    if not words or any(word not in _KEYWORDS for word in words):
        return None
    signed, unsigned, longs = "signed" in words, "unsigned" in words, words.count("long")
    rest = sorted(word for word in words if word not in ("signed", "unsigned", "long"))
    if (signed and unsigned) or len(set(rest)) != len(rest) or words.count("signed") + words.count("unsigned") > 1:
        return None
    sign = signed or unsigned
    if rest in (["char"], ["float"], ["double"], ["bool"]) and not longs and not sign:
        return rest[0]
    if rest == ["_Bool"] and not longs and not sign:
        return "bool"
    if rest == ["double"] and longs == 1 and not sign:
        return "long double"
    if rest == ["char"] and not longs and sign:
        return "unsigned char" if unsigned else "signed char"
    if rest in ([], ["int"], ["short"], ["int", "short"]) and longs <= 2 and not ("short" in rest and longs):
        base = "short" if "short" in rest else ("int", "long", "long long")[longs]
        return ("unsigned " if unsigned else "") + base
    return None
