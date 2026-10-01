"""Domains of the Basic dialect: the value domains that literals carry, and the values its core operations take and give.

Value domains name the standard they implement, with only its parameters (see docs/EXPRESSIONS.md, Value domains):

- `OfBool`: true and false.
- `OfInteger`: two's complement integers of a `width` in bits, or unbounded, `signed` or not, whose `overflow` wraps,
  saturates or raises.
- `OfIeee754`: an IEEE 754-2019 interchange `format`, with a `rounding`-direction attribute.
- `OfBits` and `OfBytes`: unformatted patterns, of a `width` in bits, or of a `width` in bytes or of any length.
- `OfUnicode`: sequences of code points.
- `OfIeee1164`: VHDL's nine-valued logic, one state a value.
- `OfEnum`: one of its `members`, by name; unordered.
- `OfPacked`: an enum (its `domain`) represented in a fixed-width integer or bits (its `representation`), member `i`
  by `codes[i]`.

Each kind's data, `OfX.Data`, is a dataclass compared by structure, built by `OfX.Builder` (`create()`, `clone()`,
`update()`; none validate), with `validate()`. A domain is a `Domain`: a value is in it (`contains`) when it has the
native type the domain's literals hold (an `int` for an integer, a `str` for an enum's member, ...) and fits it, and it
includes (`includes`) only domains equal to it, since Basic has no implied promotions.

Today's natives are the defaults: `Int` is an unbounded signed integer, `Float` binary64 rounding ties to even, `Str`
Unicode, `Bytes` bytes of any length and `Bool` true and false; `of(value)` gives a native's default domain. `Object`
holds what writes its properties through `accept`, including expressions and value objects, and `Anything` is the
domain of a value not known statically, such as a property read with `get`. Unknown (`None`) is not a domain.

Domains are registered by name with `register`. Over the wire a domain that is registered is written by name,
`{"named": {"name": "uint8"}}`, and any other by value, `{"integer": {"width": 8, "signed": false, ...}}`: `Schema` is
the union of the kinds' meta-schemas and `named`, and `to_plain` and `from_plain` convert.

`SIGNATURES` gives each core operation's signature, following the evaluator's rules: comparisons take two values of
one domain, ordered only for `int`, `float`, `str` and `bytes`; logic takes bools; arithmetic takes two numbers of one
domain and gives that domain.
"""

from __future__ import annotations

import dataclasses
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, ClassVar

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything
from mbse.Schemas.Framework import Schemas

__all__ = [
    "OfBool", "OfInteger", "OfIeee754", "OfBits", "OfBytes", "OfUnicode", "OfIeee1164", "OfEnum", "OfPacked",
    "FORMATS", "ROUNDINGS", "OVERFLOWS", "STATES", "Schema",
    "Bool", "Int", "Float", "Str", "Bytes", "Object", "Anything", "SIGNATURES",
    "of", "register", "registered", "name_of", "to_plain", "from_plain", "Domain",
]

FORMATS = ("binary16", "binary32", "binary64", "binary128", "decimal64", "decimal128")
"""IEEE 754-2019's interchange formats."""
ROUNDINGS = ("roundTiesToEven", "roundTiesToAway", "roundTowardPositive", "roundTowardNegative", "roundTowardZero")
"""IEEE 754-2019's rounding-direction attributes."""
OVERFLOWS = ("wrap", "saturate", "raise")
"""What an integer of a width does with a result outside it."""
STATES = ("U", "X", "0", "1", "Z", "W", "L", "H", "-")
"""IEEE 1164's nine states: uninitialized, unknown, 0, 1, high impedance, weak unknown, weak 0, weak 1, don't care."""


def _positive(value: Any) -> bool:
    return type(value) is int and value > 0


def _one_of(name: str, value: Any, allowed: tuple[str, ...]) -> list[str]:
    return [] if value in allowed else [f"{name} must be one of {', '.join(allowed)}, got {value!r}"]


# --- Value domains ---


@dataclass
class _Domain:
    """Shared by every value domain: the `Domain` protocol, and `validate()`. `isinstance(x, Domains.Domain)` tells a
    value domain."""

    KIND: ClassVar[str]
    NATIVE: ClassVar[type]

    def name(self) -> str:
        return self.KIND

    def native(self) -> type:
        """The native type of the values in this domain."""
        return self.NATIVE

    def contains(self, value: Any) -> bool:
        return type(value) is self.native() and self._fits(value)

    def _fits(self, value: Any) -> bool:
        return True

    def includes(self, other: D.Domain) -> bool:
        if isinstance(other, D.OfUnion):
            return all(self.includes(member) for member in other.members)
        return other == self

    def validate(self) -> list[str]:
        return []

    def __repr__(self) -> str:
        return self.name()


@dataclass(eq=True, repr=False)
class _Bool(_Domain):
    KIND, NATIVE = "bool", bool


@dataclass(eq=True, repr=False)
class _Integer(_Domain):
    KIND, NATIVE = "integer", int
    width: int | None = None
    signed: bool = True
    overflow: str = "raise"

    def name(self) -> str:
        return f"{'' if self.signed else 'u'}int{'' if self.width is None else self.width}"

    def _fits(self, value: int) -> bool:
        if not _positive(self.width):
            return self.signed or value >= 0
        low, high = (-(1 << (self.width - 1)), 1 << (self.width - 1)) if self.signed else (0, 1 << self.width)
        return low <= value < high

    def validate(self) -> list[str]:
        problems = [] if self.width is None or _positive(self.width) else [
            f"a width must be a positive int, got {self.width!r}"]
        if type(self.signed) is not bool:
            problems.append(f"signed must be a bool, got {self.signed!r}")
        return problems + _one_of("overflow", self.overflow, OVERFLOWS)


@dataclass(eq=True, repr=False)
class _Ieee754(_Domain):
    KIND = "ieee754"
    format: str = "binary64"
    rounding: str = "roundTiesToEven"

    def name(self) -> str:
        if (self.format, self.rounding) == ("binary64", "roundTiesToEven"):
            return "float"
        return self.format if self.rounding == "roundTiesToEven" else f"{self.format} {self.rounding}"

    def native(self) -> type:
        """A binary format's values are floats; a decimal format's are their decimal text."""
        return str if str(self.format).startswith("decimal") else float

    def validate(self) -> list[str]:
        return _one_of("format", self.format, FORMATS) + _one_of("rounding", self.rounding, ROUNDINGS)


@dataclass(eq=True, repr=False)
class _Bits(_Domain):
    KIND, NATIVE = "bits", bytes
    width: int | None = None

    def name(self) -> str:
        return f"bits{self.width}"

    def _fits(self, value: bytes) -> bool:
        """Big-endian, in the fewest bytes, with the unused leading bits zero."""
        if not _positive(self.width):
            return False
        return len(value) == (self.width + 7) // 8 and value[0] >> (self.width % 8 or 8) == 0

    def validate(self) -> list[str]:
        if self.width is None:
            return ["a bits domain needs a width"]
        return [] if _positive(self.width) else [f"a width must be a positive int, got {self.width!r}"]


@dataclass(eq=True, repr=False)
class _Bytes(_Domain):
    KIND, NATIVE = "bytes", bytes
    width: int | None = None

    def name(self) -> str:
        return "bytes" if self.width is None else f"bytes{self.width}"

    def _fits(self, value: bytes) -> bool:
        return self.width is None or len(value) == self.width

    def validate(self) -> list[str]:
        return [] if self.width is None or _positive(self.width) else [
            f"a width must be a positive int, got {self.width!r}"]


@dataclass(eq=True, repr=False)
class _Unicode(_Domain):
    KIND, NATIVE = "unicode", str

    def name(self) -> str:
        return "str"

    def _fits(self, value: str) -> bool:
        """A lone surrogate is not a code point of a string."""
        return not any(0xD800 <= ord(char) <= 0xDFFF for char in value)


@dataclass(eq=True, repr=False)
class _Ieee1164(_Domain):
    KIND, NATIVE = "ieee1164", str

    def name(self) -> str:
        return "std_logic"

    def _fits(self, value: str) -> bool:
        return value in STATES


@dataclass(eq=True, repr=False)
class _Enum(_Domain):
    KIND, NATIVE = "enum", str
    members: tuple[str, ...] = ()

    def name(self) -> str:
        return f"enum({', '.join(map(str, self.members))})"

    def _fits(self, value: str) -> bool:
        return value in self.members

    def validate(self) -> list[str]:
        problems = [] if self.members else ["an enum needs a member"]
        seen: set[Any] = set()
        for i, member in enumerate(self.members):
            if type(member) is not str or not member:
                problems.append(f"member {i} has no name")
            elif member in seen:
                problems.append(f"member {member!r} appears twice")
            seen.add(member)
        return problems


@dataclass(eq=True, repr=False)
class _Packed(_Domain):
    KIND, NATIVE = "packed", str
    domain: Any = None  # an enum
    representation: Any = None  # a fixed-width integer or bits
    codes: tuple[int, ...] = ()

    def name(self) -> str:
        return f"packed({_name(self.domain)} as {_name(self.representation)})"

    def _fits(self, value: str) -> bool:
        return isinstance(self.domain, _Enum) and self.domain.contains(value)

    def validate(self) -> list[str]:
        if not isinstance(self.domain, _Enum):
            return [f"a packed domain packs an enum, got {_name(self.domain)}"]
        if not (isinstance(self.representation, (_Integer, _Bits)) and _positive(self.representation.width)):
            return [f"a packed domain's representation is an integer or bits of a width, got {_name(self.representation)}"]
        problems = [f"domain: {problem}" for problem in self.domain.validate()]
        problems += [f"representation: {problem}" for problem in self.representation.validate()]
        if len(self.codes) != len(self.domain.members):
            problems.append(f"a packed domain needs a code per member: {len(self.domain.members)} members, "
                            f"{len(self.codes)} codes")
        seen: set[Any] = set()
        for i, code in enumerate(self.codes):
            if not self._holds(code):
                problems.append(f"code {i} does not fit {self.representation.name()}: {code!r}")
            elif code in seen:
                problems.append(f"code {code!r} is used twice")
            seen.add(code)
        return problems

    def _holds(self, code: Any) -> bool:
        """Whether the representation holds `code`: an integer's value, or bits' pattern read as an unsigned int."""
        if isinstance(self.representation, _Integer):
            return type(code) is int and self.representation.contains(code)
        return type(code) is int and 0 <= code < 1 << self.representation.width


Domain = _Domain


def _name(domain: Any) -> str:
    return domain.name() if isinstance(domain, _Domain) else repr(domain)


# --- Builders ---


class _Builder:
    """Shared by every value domain's builder: `create()` / `clone()` / `update()`, none validating, and fluent setters
    for the kind's fields."""

    _data: ClassVar[type[_Domain]]

    def __init__(self, instance: _Domain | None = None):
        if instance is not None and type(instance) is not self._data:
            raise TypeError(f"expected {self._data.KIND} data to build from, got {_name(instance)}")
        self._source = instance
        self._fields: dict[str, Any] = {} if instance is None else {
            field.name: getattr(instance, field.name) for field in dataclasses.fields(instance)}

    def _set(self, name: str, value: Any) -> Any:
        self._fields[name] = value
        return self

    def create(self) -> Any:
        if self._source is not None:
            raise ValueError("create() is only valid without a source instance; use clone() or update()")
        return self._data(**self._fields)

    def clone(self) -> Any:
        if self._source is None:
            raise ValueError("clone() is only valid with a source instance")
        return self._data(**self._fields)

    def update(self) -> Any:
        if self._source is None:
            raise ValueError("update() is only valid with a source instance")
        for name, value in self._fields.items():
            setattr(self._source, name, value)
        return self._source


class _BoolBuilder(_Builder):
    _data = _Bool


class _IntegerBuilder(_Builder):
    _data = _Integer

    def width(self, width: int | None) -> _IntegerBuilder:
        return self._set("width", width)

    def signed(self, signed: bool) -> _IntegerBuilder:
        return self._set("signed", signed)

    def overflow(self, overflow: str) -> _IntegerBuilder:
        return self._set("overflow", overflow)


class _Ieee754Builder(_Builder):
    _data = _Ieee754

    def format(self, format: str) -> _Ieee754Builder:
        return self._set("format", format)

    def rounding(self, rounding: str) -> _Ieee754Builder:
        return self._set("rounding", rounding)


class _BitsBuilder(_Builder):
    _data = _Bits

    def width(self, width: int) -> _BitsBuilder:
        return self._set("width", width)


class _BytesBuilder(_Builder):
    _data = _Bytes

    def width(self, width: int | None) -> _BytesBuilder:
        return self._set("width", width)


class _UnicodeBuilder(_Builder):
    _data = _Unicode


class _Ieee1164Builder(_Builder):
    _data = _Ieee1164


class _EnumBuilder(_Builder):
    _data = _Enum

    def members(self, *members: str) -> _EnumBuilder:
        return self._set("members", tuple(members))


class _PackedBuilder(_Builder):
    _data = _Packed

    def domain(self, domain: _Domain) -> _PackedBuilder:
        return self._set("domain", domain)

    def representation(self, representation: _Domain) -> _PackedBuilder:
        return self._set("representation", representation)

    def codes(self, *codes: int) -> _PackedBuilder:
        return self._set("codes", tuple(codes))


# --- Meta-schemas ---


def _text(name: str) -> Callable[[Any], Any]:
    return lambda p: p.name(name).of(lambda t: t.as_native(str))


def _int(name: str) -> Callable[[Any], Any]:
    return lambda p: p.name(name).of(lambda t: t.as_native(int))


Schema = Schemas.OfUnion.Builder().create()  # a domain, by value or by name; its branches are added below
_SCHEMAS = {
    "bool": Schemas.OfObject.Builder().create(),
    "integer": Schemas.OfObject.Builder().properties(
        _int("width"), lambda p: p.name("signed").of(lambda t: t.as_native(bool)), _text("overflow")).create(),
    "ieee754": Schemas.OfObject.Builder().properties(_text("format"), _text("rounding")).create(),
    "bits": Schemas.OfObject.Builder().properties(_int("width")).create(),
    "bytes": Schemas.OfObject.Builder().properties(_int("width")).create(),
    "unicode": Schemas.OfObject.Builder().create(),
    "ieee1164": Schemas.OfObject.Builder().create(),
    "enum": Schemas.OfObject.Builder().properties(
        lambda p: p.name("members").of(lambda t: t.as_indexed(lambda i: i.of(lambda t: t.as_native(str))))).create(),
    "packed": Schemas.OfObject.Builder().properties(
        lambda p: p.name("domain").of(Schema), lambda p: p.name("representation").of(Schema),
        lambda p: p.name("codes").of(lambda t: t.as_indexed(lambda i: i.of(lambda t: t.as_native(int))))).create(),
    "named": Schemas.OfObject.Builder().properties(_text("name")).create(),
}
Schemas.OfUnion.Builder(Schema).branches(
    *(lambda b, name=name, schema=schema: b.name(name).of(schema) for name, schema in _SCHEMAS.items())).update()


class _Kind:
    """A value domain kind: `Data`, `Builder` and the meta-schema `Schema` of its value."""

    def __init__(self, data: type[_Domain], builder: type[_Builder]):
        self.Data, self.Builder, self.Schema = data, builder, _SCHEMAS[data.KIND]

    def __repr__(self) -> str:
        return f"<domain kind {self.Data.KIND}>"


OfBool = _Kind(_Bool, _BoolBuilder)
OfInteger = _Kind(_Integer, _IntegerBuilder)
OfIeee754 = _Kind(_Ieee754, _Ieee754Builder)
OfBits = _Kind(_Bits, _BitsBuilder)
OfBytes = _Kind(_Bytes, _BytesBuilder)
OfUnicode = _Kind(_Unicode, _UnicodeBuilder)
OfIeee1164 = _Kind(_Ieee1164, _Ieee1164Builder)
OfEnum = _Kind(_Enum, _EnumBuilder)
OfPacked = _Kind(_Packed, _PackedBuilder)
_KINDS = {kind.Data.KIND: kind.Data for kind in (OfBool, OfInteger, OfIeee754, OfBits, OfBytes, OfUnicode, OfIeee1164,
                                                 OfEnum, OfPacked)}


# --- The registry and the plain form ---

_registry: dict[str, _Domain] = {}


def register(name: str, domain: _Domain) -> None:
    """Registers `domain` under `name`, so that literals of it are written by name. A domain is registered once."""
    if name in _registry:
        raise ValueError(f"domain {name!r} is already registered")
    for other, registered_domain in _registry.items():
        if registered_domain == domain:
            raise ValueError(f"{_name(domain)} is already registered as {other!r}")
    _registry[name] = domain


def registered(name: str) -> _Domain:
    """The domain registered under `name`."""
    if name not in _registry:
        raise LookupError(f"no domain registered as {name!r}")
    return _registry[name]


def name_of(domain: Any) -> str | None:
    """The name a domain equal to `domain` is registered under, or None."""
    return next((name for name, registered_domain in _registry.items() if registered_domain == domain), None)


def to_plain(domain: _Domain) -> dict[str, Any]:
    """A domain's plain form: by name when it is registered, otherwise by value, leaving out what is absent."""
    name = name_of(domain)
    if name is not None:
        return {"named": {"name": name}}
    if not isinstance(domain, _Domain):
        raise TypeError(f"not a domain: {domain!r}")
    contents: dict[str, Any] = {}
    for field in dataclasses.fields(domain):
        value = getattr(domain, field.name)
        if isinstance(value, _Domain):
            contents[field.name] = to_plain(value)
        elif isinstance(value, tuple):
            contents[field.name] = list(value)
        elif value is not None:
            contents[field.name] = value
    return {domain.KIND: contents}


def from_plain(plain: dict[str, Any]) -> _Domain:
    """The domain a plain form holds: a registered one by name, or a new one of its kind."""
    ((kind, contents),) = plain.items()
    if kind == "named":
        return registered(contents["name"])
    fields: dict[str, Any] = {}
    for name, value in contents.items():
        fields[name] = from_plain(value) if isinstance(value, dict) else tuple(value) if isinstance(value, list) else value
    return _KINDS[kind](**fields)


# --- The defaults and the core operations' signatures ---

Bool, Int, Float, Str, Bytes = _Bool(), _Integer(), _Ieee754(), _Unicode(), _Bytes()
Object = D.OfValues("object", lambda value: callable(getattr(value, "accept", None)))

_NATIVES: dict[type, _Domain] = {bool: Bool, int: Int, float: Float, str: Str, bytes: Bytes}
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
    """The domain of a value: its native type's default, or `Object`."""
    if type(value) in _NATIVES:
        return _NATIVES[type(value)]
    if Object.contains(value):
        return Object
    raise TypeError(f"a {type(value).__name__} is not a value of the Basic dialect")
