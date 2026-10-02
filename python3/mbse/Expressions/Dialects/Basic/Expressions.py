"""Expressions of the Basic dialect: the core vocabulary, for rules and constraints.
`Evaluators` evaluates them.

- `OfLiteral`: a native value, and its value domain when that is not the native's default (see `Domains`).
- `OfOperation`: a named operation applied to ordered arguments, e.g. `eq(a, b)`. The vocabulary of names is open; the
  core operations (`CORE`) are the ones every binding evaluates. See docs/EXPRESSIONS.md.
- `OfVariable`: the value bound to a name.
- `OfLet`: binds a name to the value of one expression within another, its body.
- `OfQuantifier`: binds a name to each item of a collection within a body, and gives whether it holds for `all` or
  `any` of them, or for how many (`count`).
- `OfAny`: any of these.

The dialect (`DIALECT`) is declared with the framework (`mbse.Expressions.Framework.Terms`), which gives each
kind its `Data`, a `Builder` finalized by `create()`, `clone()` or `update()` (none validate), a `Spec` (a value, or a
callable that takes and returns the builder) and `resolve`, and a `Schema`, the meta-schema that describes its data as
an ordinary object schema, so expressions serialize, validate and compare like any other objects:

- Every kind's schema declares `kind`, a tag with a fixed value: 'literal', 'operation', 'variable' or 'let'.
- `OfLiteral.Schema` declares one optional property per native type (`int`, `float`, `str`, `bool`, `bytes`); a literal
  sets exactly one. Its `domain`, a value of `Domains.Schema`, is written only when it is not the native's default: by
  name when the domain is registered, otherwise by value.
- `OfOperation.Schema`, `OfVariable.Schema` and `OfLet.Schema` declare `name`.
- Operations and lets declare the adjacency `arguments` to `Arguments`, a relation linking a `parent` to an `argument`
  with an `index`; `unique(argument)` makes the parent and index determine the argument. A let's value is its argument
  0 and its body its argument 1.
- Every kind declares `used_by`: the same relation seen from the argument. The parents' arguments imply it, so data
  never writes it and builders ignore entries added to it.
- `OfAny.Schema` is the union of the four, discriminated by the tag: `eq(get(this, 'kind'), 'literal')`, and so on.

The meta-schemas are registered with `Proxies` as 'Expressions.OfLiteral', 'Expressions.OfOperation',
'Expressions.OfVariable', 'Expressions.OfLet' and 'Expressions.Arguments', the names snapshots carry. `Builders`
rebuilds `Data` from snapshots, e.g. `JSON.FromJSON(Expressions.Builders).Reachable(Expressions.OfLet.Schema, text)`.
`Data` is `Visitable`; builders implement `Visitors.OfObject`.

`Writer`s write expressions with methods: `variable('this').age.ge(18)` is `ge(get(this, 'age'), 18)`.
`Python.Text.FromFunction` reads one from a Python function's source instead: `FromFunction(lambda this: this.age >= 18)`
is the same expression.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework import Schemas
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = [
    "OfAny", "OfLiteral", "OfOperation", "OfVariable", "OfLet", "OfQuantifier", "Arguments", "Builders", "Writer",
    "CORE", "DIALECT", "variable", "literal", "let_", "operation", "quantifier",
    "LITERAL", "OPERATION", "VARIABLE", "LET", "QUANTIFIER", "ARGUMENTS",
]

LITERAL = "Expressions.OfLiteral"
OPERATION = "Expressions.OfOperation"
VARIABLE = "Expressions.OfVariable"
LET = "Expressions.OfLet"
QUANTIFIER = "Expressions.OfQuantifier"
ARGUMENTS = F.ARGUMENTS
Arguments = F.Arguments

CORE: dict[str, int] = {name: signature.arity() for name, signature in Domains.SIGNATURES.items()}
"""The core operations and their numbers of arguments."""

_native_name = F._native_name
_type_name = F._type_name


# --- Data ---


_DOMAIN = F.ValueProperty(Domains.Schema, Domains.to_plain, Domains.from_plain)
_TYPED = ("convert", "reinterpret", "unpack")  # the operations that need a domain: their result's


def _domain_problems(what: str, domain: Any) -> list[str]:
    """The problems of a domain that a literal or an operation carries."""
    if not isinstance(domain, Domains.Domain):
        return [f"{what} domain must be a value domain, got {_type_name(domain)}"]
    return [f"domain: {problem}" for problem in domain.validate()]


@dataclass(eq=False)
class _LiteralData(F.Term):
    KIND = "literal"
    ROLE = F.LITERAL
    VALUE = F.NATIVES
    VALUES = {"domain": _DOMAIN}
    value: Native | None = None
    domain: Any = None  # a value domain, or None for the value's native's default

    def __post_init__(self) -> None:
        if self.domain is not None and _native_name(self.value) is not None and self.domain == Domains.of(self.value):
            self.domain = None  # a native's default domain is no domain at all

    def typed(self) -> Any:
        return self.domain

    def check(self) -> list[str]:
        """A literal's domain is valid and holds its value."""
        if self.domain is None:
            return []
        problems = _domain_problems("a literal's", self.domain)
        if not problems and not self.domain.contains(self.value):
            problems.append(f"a literal of {self.domain.name()} cannot hold {self.value!r}")
        return problems


@dataclass(eq=False)
class _OperationData(F.Term):
    KIND = "operation"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    VARIADIC = "arguments"
    OPERATOR = "name"
    VOCABULARY = Domains.SIGNATURES
    VALUES = {"domain": _DOMAIN}
    name: str | None = None
    arguments: tuple[Any, ...] = ()  # OfAny.Data
    domain: Any = None  # the domain of the result, which the conversions need, kept even when it is a default

    def typed(self) -> Any:
        return self.domain

    def check(self) -> list[str]:
        """A conversion needs a domain, which must be valid; other core operations take none."""
        if self.domain is None:
            return [f"{self.name} needs a domain"] if self.name in _TYPED else []
        if self.name in Domains.SIGNATURES and self.name not in _TYPED:
            return [f"{self.name} takes no domain"]
        return _domain_problems("an operation's", self.domain)


@dataclass(eq=False)
class _VariableData(F.Term):
    KIND = "variable"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _LetData(F.Term):
    KIND = "let"
    ROLE = F.BINDING
    PROPERTIES = {"name": str}
    SLOTS = ("value", "body")
    name: str | None = None
    value: Any = None  # OfAny.Data
    body: Any = None  # OfAny.Data


@dataclass(eq=False)
class _QuantifierData(F.Term):
    KIND = "quantifier"
    ROLE = F.QUANTIFIER
    PROPERTIES = {"name": str, "quantifier": str}
    SLOTS = ("collection", "body")
    OPERATOR = "quantifier"
    VOCABULARY = Domains.QUANTIFIERS
    name: str | None = None
    quantifier: str | None = None  # all, any or count
    collection: Any = None  # OfAny.Data
    body: Any = None  # OfAny.Data, with `name` bound to each item


_KINDS = (_LiteralData, _OperationData, _VariableData, _LetData, _QuantifierData)


# --- Builders: Visitors that build Data ---


class _LiteralBuilder(F.Builder):
    """Builds an `OfLiteral.Data`. DSL: `.value(native)` and `.domain(domain)`. As a `Visitors.OfObject`, it has one
    property per native type, and setting one replaces the value, and the property `domain`."""

    _data = _LiteralData

    def value(self, value: Native) -> _LiteralBuilder:
        return self.set("value", value)

    def domain(self, domain: Any) -> _LiteralBuilder:
        return self.set("domain", domain)


class _NamedBuilder(F.Builder):
    """A builder whose kind has a `name`. DSL: `.name(str)`."""

    def name(self, name: str) -> Any:
        return self.set("name", name)


class _OperationBuilder(_NamedBuilder):
    """Builds an `OfOperation.Data`. DSL: `.name(str)`, `.arguments(*specs)`, which appends `OfAny.Spec`s (a native
    value is a literal), and `.domain(domain)`, its result's. As a `Visitors.OfObject`, arguments are `arguments` entries,
    ordered by `index`."""

    _data = _OperationData

    def domain(self, domain: Any) -> _OperationBuilder:
        return self.set("domain", domain)


class _VariableBuilder(_NamedBuilder):
    """Builds an `OfVariable.Data`. DSL: `.name(str)`."""

    _data = _VariableData


class _LetBuilder(_NamedBuilder):
    """Builds an `OfLet.Data`. DSL: `.name(str)`, `.value(spec)` and `.body(spec)`, each an `OfAny.Spec`. As a
    `Visitors.OfObject`, the value is the `arguments` entry with index 0 and the body the one with index 1."""

    _data = _LetData

    def value(self, spec: OfAny.Spec) -> _LetBuilder:
        return self.argument("value", spec)

    def body(self, spec: OfAny.Spec) -> _LetBuilder:
        return self.argument("body", spec)


class _QuantifierBuilder(_NamedBuilder):
    """Builds an `OfQuantifier.Data`. DSL: `.name(str)`, `.quantifier(str)`, `.collection(spec)` and `.body(spec)`. As a
    `Visitors.OfObject`, the collection is the `arguments` entry with index 0 and the body the one with index 1."""

    _data = _QuantifierData

    def quantifier(self, quantifier: str) -> _QuantifierBuilder:
        return self.set("quantifier", quantifier)

    def collection(self, spec: OfAny.Spec) -> _QuantifierBuilder:
        return self.argument("collection", spec)

    def body(self, spec: OfAny.Spec) -> _QuantifierBuilder:
        return self.argument("body", spec)


class _AnyBuilder(F.AnyBuilder):
    """Selects a kind through `as_<kind>(spec)`. Finalizing yields that kind's data."""

    def as_literal(self, spec: OfLiteral.Spec) -> _AnyBuilder:
        self._selected = OfLiteral.resolve(spec)
        return self

    def as_operation(self, spec: OfOperation.Spec) -> _AnyBuilder:
        self._selected = OfOperation.resolve(spec)
        return self

    def as_variable(self, spec: OfVariable.Spec) -> _AnyBuilder:
        self._selected = OfVariable.resolve(spec)
        return self

    def as_let(self, spec: OfLet.Spec) -> _AnyBuilder:
        self._selected = OfLet.resolve(spec)
        return self

    def as_quantifier(self, spec: OfQuantifier.Spec) -> _AnyBuilder:
        self._selected = OfQuantifier.resolve(spec)
        return self


# --- The dialect and its meta-schemas ---

DIALECT = F.Declared(
    "Basic", _KINDS, domain_of=Domains.of, any_builder=_AnyBuilder,
    builders={"literal": _LiteralBuilder, "operation": _OperationBuilder, "variable": _VariableBuilder,
              "let": _LetBuilder, "quantifier": _QuantifierBuilder},
    schema_names={"literal": LITERAL, "operation": OPERATION, "variable": VARIABLE, "let": LET,
                  "quantifier": QUANTIFIER},
)
Builders = DIALECT.Builders


# --- Specs ---


class OfLiteral:
    """A native value. `Spec` is a native value, an `OfLiteral.Data`, or a callable taking the builder."""

    Data = _LiteralData
    Builder = _LiteralBuilder
    Spec = Native | _LiteralData | Callable[[_LiteralBuilder], _LiteralBuilder]
    Schema: Schemas.OfObject.Data = _LiteralData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfLiteral.Spec) -> _LiteralData:
        if _native_name(spec) is not None:
            return _LiteralData(spec)
        return F.resolve(spec, _LiteralData, _LiteralBuilder, "a native value, a literal")


class OfOperation:
    """A named operation applied to ordered arguments."""

    Data = _OperationData
    Builder = _OperationBuilder
    Spec = _OperationData | Callable[[_OperationBuilder], _OperationBuilder]
    Schema: Schemas.OfObject.Data = _OperationData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfOperation.Spec) -> _OperationData:
        return F.resolve(spec, _OperationData, _OperationBuilder, "an operation")


class OfVariable:
    """The value bound to a name. `Spec` is a name, an `OfVariable.Data`, or a callable taking the builder."""

    Data = _VariableData
    Builder = _VariableBuilder
    Spec = str | _VariableData | Callable[[_VariableBuilder], _VariableBuilder]
    Schema: Schemas.OfObject.Data = _VariableData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfVariable.Spec) -> _VariableData:
        if type(spec) is str:
            return _VariableData(spec)
        return F.resolve(spec, _VariableData, _VariableBuilder, "a name, a variable")


class OfLet:
    """Binds a name to the value of one expression within another, its body."""

    Data = _LetData
    Builder = _LetBuilder
    Spec = _LetData | Callable[[_LetBuilder], _LetBuilder]
    Schema: Schemas.OfObject.Data = _LetData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfLet.Spec) -> _LetData:
        return F.resolve(spec, _LetData, _LetBuilder, "a let")


class OfQuantifier:
    """Binds a name to each item of a collection within a body: whether it holds for `all` or `any` of them, or for how
    many (`count`)."""

    Data = _QuantifierData
    Builder = _QuantifierBuilder
    Spec = _QuantifierData | Callable[[_QuantifierBuilder], _QuantifierBuilder]
    Schema: Schemas.OfObject.Data = _QuantifierData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfQuantifier.Spec) -> _QuantifierData:
        return F.resolve(spec, _QuantifierData, _QuantifierBuilder, "a quantifier")


class OfAny:
    """Any expression. `Spec` is a native value (a literal), an expression, a `Writer`, or a callable taking the
    builder."""

    Data = _LiteralData | _OperationData | _VariableData | _LetData | _QuantifierData
    Builder = _AnyBuilder
    Spec = Native | Data | Callable[[_AnyBuilder], _AnyBuilder]
    Schema: Schemas.OfUnion.Data = DIALECT.Schema

    @staticmethod
    def resolve(spec: OfAny.Spec) -> OfAny.Data:
        return DIALECT.resolve(spec)


# --- Terms: writing expressions with methods ---


class Writer(F.Writer):
    """An expression written with methods. `.name` reads a property (`get`); use `.get(name)` for names that are also
    methods, such as `eq`. A `Writer` is an `OfAny.Spec`; `.data` is its expression."""

    __slots__ = ()

    def __getattr__(self, name: str) -> Writer:
        if name.startswith("_"):
            raise AttributeError(name)
        return self.get(name)

    def get(self, name: str) -> Writer:
        return operation("get", self, name)

    def has(self, name: str) -> Writer:
        return operation("has", self, name)

    def eq(self, other: OfAny.Spec) -> Writer:
        return operation("eq", self, other)

    def ne(self, other: OfAny.Spec) -> Writer:
        return operation("ne", self, other)

    def lt(self, other: OfAny.Spec) -> Writer:
        return operation("lt", self, other)

    def le(self, other: OfAny.Spec) -> Writer:
        return operation("le", self, other)

    def gt(self, other: OfAny.Spec) -> Writer:
        return operation("gt", self, other)

    def ge(self, other: OfAny.Spec) -> Writer:
        return operation("ge", self, other)

    def and_(self, other: OfAny.Spec) -> Writer:
        return operation("and", self, other)

    def or_(self, other: OfAny.Spec) -> Writer:
        return operation("or", self, other)

    def not_(self) -> Writer:
        return operation("not", self)

    def implies(self, other: OfAny.Spec) -> Writer:
        return operation("implies", self, other)

    def add(self, other: OfAny.Spec) -> Writer:
        return operation("add", self, other)

    def sub(self, other: OfAny.Spec) -> Writer:
        return operation("sub", self, other)

    def mul(self, other: OfAny.Spec) -> Writer:
        return operation("mul", self, other)

    def neg(self) -> Writer:
        return operation("neg", self)

    def bitand(self, other: OfAny.Spec) -> Writer:
        return operation("bitand", self, other)

    def bitor(self, other: OfAny.Spec) -> Writer:
        return operation("bitor", self, other)

    def bitxor(self, other: OfAny.Spec) -> Writer:
        return operation("bitxor", self, other)

    def bitnot(self) -> Writer:
        return operation("bitnot", self)

    def shl(self, count: OfAny.Spec) -> Writer:
        return operation("shl", self, count)

    def shr(self, count: OfAny.Spec) -> Writer:
        return operation("shr", self, count)

    def convert(self, domain: Any) -> Writer:
        """The value in `domain`, kept: rounded or overflowing as `domain` does."""
        return Writer(_OperationData("convert", (self.data,), domain))

    def reinterpret(self, domain: Any) -> Writer:
        """The bit pattern in `domain`, of the same width."""
        return Writer(_OperationData("reinterpret", (self.data,), domain))

    def pack(self) -> Writer:
        """A packed value's representation."""
        return operation("pack", self)

    def unpack(self, domain: Any) -> Writer:
        """The value of the packed `domain` that a representation stands for."""
        return Writer(_OperationData("unpack", (self.data,), domain))

    def count(self) -> Writer:
        """The number of items of a collection."""
        return operation("count", self)

    def item(self, index: OfAny.Spec) -> Writer:
        """The item at a position, or at a key of a keyed list."""
        return operation("item", self, index)

    def in_(self, collection: OfAny.Spec) -> Writer:
        """Whether this equals one of the items of `collection`."""
        return operation("in", self, collection)

    def sum(self) -> Writer:
        return operation("sum", self)

    def min(self) -> Writer:
        return operation("min", self)

    def max(self) -> Writer:
        return operation("max", self)

    def unique(self) -> Writer:
        """Whether no two items are equal."""
        return operation("unique", self)

    def entries(self, adjacency: str) -> Writer:
        """An object's entries in an adjacency, as records."""
        return operation("entries", self, adjacency)

    def all(self, name: str, body: OfAny.Spec) -> Writer:
        """Whether `body` holds for every item, bound to `name`."""
        return quantifier("all", name, self, body)

    def any(self, name: str, body: OfAny.Spec) -> Writer:
        """Whether `body` holds for some item, bound to `name`."""
        return quantifier("any", name, self, body)

    def count_where(self, name: str, body: OfAny.Spec) -> Writer:
        """How many items, bound to `name`, `body` holds for."""
        return quantifier("count", name, self, body)


def variable(name: str) -> Writer:
    """The variable `name`."""
    return Writer(_VariableData(name))


def literal(value: Native, domain: Any = None) -> Writer:
    """The literal `value`, of `domain` (by default, its native's)."""
    return Writer(_LiteralData(value, domain))


def let_(name: str, value: OfAny.Spec, body: OfAny.Spec) -> Writer:
    """`body`, with `name` bound to the value of `value`."""
    return Writer(_LetData(name, OfAny.resolve(value), OfAny.resolve(body)))


def quantifier(quantifier: str, name: str, collection: OfAny.Spec, body: OfAny.Spec) -> Writer:
    """The quantifier `quantifier` (`all`, `any` or `count`) of `body`, with `name` bound to each item of `collection`."""
    return Writer(_QuantifierData(name, quantifier, OfAny.resolve(collection), OfAny.resolve(body)))


def operation(name: str, *arguments: OfAny.Spec) -> Writer:
    """The operation `name` applied to `arguments`; for operations outside the core, or without a method."""
    return Writer(_OperationData(name, tuple(OfAny.resolve(argument) for argument in arguments)))
