"""Expressions of the Basic dialect: the core vocabulary, for constraints. `Evaluators` evaluates them.

Basic's terms are the framework's kinds (`mbse.Expressions.Framework.Terms`) and one of its own, which `install` adds to
`Expressions.Framework.Term` by schema extension:

- `literal`: a basic scalar (`value`), and its value domain (`domain`, by name) when that is not the scalar's default
  (see `Domains`).
- `call`: a named operation (`callable`) applied to ordered `arguments`, e.g. `eq(a, b)`, and its result's `domain`,
  which the conversions need. The vocabulary of names is open; the core operations (`CORE`) are the ones every binding
  evaluates. See mbse-basis
  [CAP-095: Basic terms as data](../../../../../../mbse-basis/docs/capabilities/CAP-095.md#terms-and-the-core-vocabulary).
- `variable`: the value bound to a `name`.
- `let`: binds a `name` to the value of one term (`value`) within another (`body`).
- `quantifier`: binds a `name` to each item of a `collection` within a `body`, and gives whether it holds for `all` or
  `any` of them, or for how many (`count`): its `quantifier`.

`DIALECT` reads them (`Terms.Dialect`, with each kind's role, vocabulary and checks), validates and infers.

`Writer`s write terms with methods, through the builders: `variable('person').age.ge(18)` is
`ge(get(person, 'age'), 18)`.
A writer is a spec, so it goes wherever a term is written, in a transaction:
`store.Expressions.Framework.Expression(lambda e: e.root(variable('person').age.ge(18)))`.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework import Schemas

from . import Domains

__all__ = [
    "install", "CORE", "DIALECT", "Writer", "variable", "literal", "let_", "operation", "quantifier",
]


def install(txn: Any) -> Any:
    """Basic's own kind, added to the framework's terms: run after `Framework.install`, in a transaction of its own."""
    S = txn.Schemas
    return txn.uid("mbse.Expressions.Basic/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion, "Quantifier": S.OfObject})  # the framework's union, found by its name
        .spec([
            lambda _: _.Quantifier.name("Expressions.Basic.Quantifier").properties({
                "name": S.OfStr,  # bound to each item in the body
                "quantifier": S.OfStr,  # all, any or count
                "collection": _.Term,
                "body": _.Term,
                "domain": S.OfStr,  # every term has a domain: a quantifier's, its result's
            }),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("quantifier").schema([_.Quantifier])]),
        ])]))])


CORE: dict[str, int] = {name: signature.arity() for name, signature in Domains.SIGNATURES.items()}
"""The core operations and their numbers of arguments."""

_TYPED = ("convert", "reinterpret", "unpack")  # the operations that need a domain: their result's


def _domain_of(record: Any) -> Any:
    """The domain a literal or a call names, or None."""
    name = F.attributes_of(record).get("domain")
    return None if name is None else Domains.registered(name)


def _domain_problems(name: str) -> list[str]:
    """The problems of a domain a term names."""
    try:
        domain = Domains.registered(name)
    except LookupError as error:
        return [f"domain: {error.args[0]}"]
    return [f"domain: {problem}" for problem in domain.validate()]


def _literal_check(record: Any) -> list[str]:
    """A literal's domain is registered, valid, and holds its value."""
    attributes = F.attributes_of(record)
    if attributes.get("domain") is None:
        return []
    problems = _domain_problems(attributes["domain"])
    domain = None if problems else Domains.registered(attributes["domain"])
    if domain is not None and not domain.contains(attributes["value"]):
        problems.append(f"a literal of {domain.name()} cannot hold {attributes['value']!r}")
    return problems


def _call_check(record: Any) -> list[str]:
    """A conversion needs a domain, which must be registered and valid; other core operations take none."""
    attributes = F.attributes_of(record)
    name, domain = attributes.get("callable"), attributes.get("domain")
    if domain is None:
        return [f"{name} needs a domain"] if name in _TYPED else []
    if name in Domains.SIGNATURES and name not in _TYPED:
        return [f"{name} takes no domain"]
    return _domain_problems(domain)


def _native(value: Any) -> Writer | None:
    """The literal of a native value."""
    return literal(value) if type(value) in Schemas.SCALAR_TYPES else None


DIALECT = F.Dialect("Basic", {
    "literal": F.Kind(F.LITERAL, check=_literal_check, typed=_domain_of),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.SIGNATURES, required=("callable",),
                   check=_call_check, typed=_domain_of),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "let": F.Kind(F.BINDING, required=("name",)),
    "quantifier": F.Kind(F.QUANTIFIER, operator="quantifier", vocabulary=Domains.QUANTIFIERS,
                         required=("name", "quantifier")),
}, domain_of=Domains.of, literal=_native)
"""The Basic dialect: its kinds, as the framework reads them."""


def _name(domain: Any) -> str | None:
    """The name a term gives a domain: a name as it is, or a domain's registered name."""
    if domain is None or isinstance(domain, str):
        return domain
    name = Domains.name_of(domain)
    if name is None:
        raise LookupError(f"{Domains._name(domain)} is not registered: a term names its domain")
    return name


# --- Writers: writing terms with methods ---


class Writer(F.Writer):
    """A term written with methods, through the builders. `.name` reads a property (`get`); use `.get(name)` for names
    that are also methods, such as `eq`. A `Writer` is a spec: it writes its term where it is given."""

    __slots__ = ()

    def __getattr__(self, name: str) -> Writer:
        if name.startswith("_"):
            raise AttributeError(name)
        return self.get(name)

    def get(self, name: str) -> Writer:
        return operation("get", self, name)

    def has(self, name: str) -> Writer:
        return operation("has", self, name)

    def eq(self, other: Any) -> Writer:
        return operation("eq", self, other)

    def ne(self, other: Any) -> Writer:
        return operation("ne", self, other)

    def lt(self, other: Any) -> Writer:
        return operation("lt", self, other)

    def le(self, other: Any) -> Writer:
        return operation("le", self, other)

    def gt(self, other: Any) -> Writer:
        return operation("gt", self, other)

    def ge(self, other: Any) -> Writer:
        return operation("ge", self, other)

    def and_(self, other: Any) -> Writer:
        return operation("and", self, other)

    def or_(self, other: Any) -> Writer:
        return operation("or", self, other)

    def not_(self) -> Writer:
        return operation("not", self)

    def implies(self, other: Any) -> Writer:
        return operation("implies", self, other)

    def add(self, other: Any) -> Writer:
        return operation("add", self, other)

    def sub(self, other: Any) -> Writer:
        return operation("sub", self, other)

    def mul(self, other: Any) -> Writer:
        return operation("mul", self, other)

    def neg(self) -> Writer:
        return operation("neg", self)

    def bitand(self, other: Any) -> Writer:
        return operation("bitand", self, other)

    def bitor(self, other: Any) -> Writer:
        return operation("bitor", self, other)

    def bitxor(self, other: Any) -> Writer:
        return operation("bitxor", self, other)

    def bitnot(self) -> Writer:
        return operation("bitnot", self)

    def shl(self, count: Any) -> Writer:
        return operation("shl", self, count)

    def shr(self, count: Any) -> Writer:
        return operation("shr", self, count)

    def convert(self, domain: Any) -> Writer:
        """The value in `domain`, kept: rounded or overflowing as `domain` does."""
        return operation("convert", self, domain=domain)

    def reinterpret(self, domain: Any) -> Writer:
        """The bit pattern in `domain`, of the same width."""
        return operation("reinterpret", self, domain=domain)

    def pack(self) -> Writer:
        """A packed value's representation."""
        return operation("pack", self)

    def unpack(self, domain: Any) -> Writer:
        """The value of the packed `domain` that a representation stands for."""
        return operation("unpack", self, domain=domain)

    def count(self) -> Writer:
        """The number of items of a collection."""
        return operation("count", self)

    def item(self, index: Any) -> Writer:
        """The item at a position, or at a key of a keyed list."""
        return operation("item", self, index)

    def in_(self, collection: Any) -> Writer:
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

    def all(self, name: str, body: Any) -> Writer:
        """Whether `body` holds for every item, bound to `name`."""
        return quantifier("all", name, self, body)

    def any(self, name: str, body: Any) -> Writer:
        """Whether `body` holds for some item, bound to `name`."""
        return quantifier("any", name, self, body)

    def count_where(self, name: str, body: Any) -> Writer:
        """How many items, bound to `name`, `body` holds for."""
        return quantifier("count", name, self, body)


def _stands_for(name: str) -> Any:
    """The domain a name stands for, or None (validation reports a name that stands for none)."""
    try:
        return Domains.registered(name)
    except LookupError:
        return None


def _spec(value: Any) -> Any:
    return None if value is None else DIALECT.spec(value)


def variable(name: str) -> Writer:
    """The variable `name`."""
    return Writer(lambda u: u.variable(lambda v: v.name(name)))


def literal(value: Any, domain: Any = None) -> Writer:
    """The literal `value`, of `domain` (a domain registered under a name, or a name; by default, its native's)."""
    name = _name(domain)
    if name is not None and type(value) in Domains._NATIVES and _stands_for(name) == Domains.of(value):
        name = None  # a native's default domain is no domain at all

    def write(u: Any) -> Any:
        def record(r: Any) -> Any:
            if value is not None:
                r.value(lambda p: p.as_scalar(value))
            return r if name is None else r.domain(name)

        return u.literal(record)

    return Writer(write)


def let_(name: str, value: Any, body: Any) -> Writer:
    """`body`, with `name` bound to the value of `value`."""
    value, body = _spec(value), _spec(body)

    def write(u: Any) -> Any:
        def record(r: Any) -> Any:
            r.name(name)
            if value is not None:
                r.value(value)
            return r if body is None else r.body(body)

        return u.let(record)

    return Writer(write)


def quantifier(quantifier: str, name: str, collection: Any, body: Any) -> Writer:
    """The quantifier `quantifier` (`all`, `any` or `count`) of `body`, with `name` bound to each item of `collection`."""
    collection, body = _spec(collection), _spec(body)

    def write(u: Any) -> Any:
        def record(r: Any) -> Any:
            r.name(name).quantifier(quantifier)
            if collection is not None:
                r.collection(collection)
            return r if body is None else r.body(body)

        return u.quantifier(record)

    return Writer(write)


def operation(name: str, *arguments: Any, domain: Any = None) -> Writer:
    """The operation `name` applied to `arguments`, of the result's `domain` when it has one; for operations outside the
    core, or without a method."""
    specs, named = [DIALECT.spec(argument) for argument in arguments], _name(domain)

    def write(u: Any) -> Any:
        def record(r: Any) -> Any:
            r.callable(name).arguments(specs)
            return r if named is None else r.domain(named)

        return u.call(record)

    return Writer(write)
