"""Expressions of the Basic dialect: the core vocabulary, for constraints. `Evaluators` evaluates them.

Basic's terms are the framework's kinds (`mbse.Expressions.Framework.Terms`) and one of its own, which `install` adds to
`Expressions.Framework.Term` by schema extension:

- `literal`: a basic scalar (`value`).
- `call`: an operation Basic defines (`callable`) applied to ordered `arguments`, e.g. `eq(a, b)`: the arguments are
  the operation's variables in the order it declares them. See mbse-basis
  [CAP-095: Basic terms as data](../../../../../../mbse-basis/docs/capabilities/CAP-095.md#terms-and-the-core-vocabulary).
- `variable`: the value bound to a `name`.
- `let`: binds a `name` to the value of one term (`value`) within another (`body`).
- `list` and `mapping`: the container constructors, a list of its `elements`' values and a mapping of its `entries`'
  keys to their values.
- `quantifier`: binds a `name` to each item of a `collection` within a `body`, and gives whether it holds for `all` or
  `any` of them, or for how many (`count`): its `quantifier`.

A term carries no domain. Basic's operations are data: `install` defines each as a `Schemas.OfExpression` in Basic's
module (`Expressions.Basic.add`), its pattern's variables its arguments and its `result` its return, as precise as the
basic scalars and containers allow (`Expressions.Basic.Number`, an int or a float; `Expressions.Basic.Ordered`;
`Expressions.Basic.Collection`, a list or a mapping; an unrestricted `Schemas.OfAny` where any value goes). `OPERATIONS`
is that table, which validation reads: a call naming an operation Basic does not define is refused. `install` also
adds Basic's kinds of domain to `Expressions.Framework.DomainKind` (`Domains`) and the schemas of its domains, and
Basic's dialect, the singleton `Expressions.Basic`; `define` writes the dialect's data: its operations by name
(`Expressions.Framework.Operates`) and its domains, which it owns by name (`Expressions.Framework.Defines`).

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
    "install", "define", "OPERATIONS", "CORE", "DIALECT", "Writer", "variable", "literal", "let_", "list_", "mapping",
    "operation", "quantifier",
]

OPERATIONS: dict[str, tuple[tuple[tuple[str, str], ...], str]] = {
    "get": ((("object", "any"), ("name", "str")), "any"),
    "has": ((("object", "any"), ("name", "str")), "bool"),
    **{name: ((("a", "any"), ("b", "any")), "bool") for name in ("eq", "ne")},
    **{name: ((("a", "ordered"), ("b", "ordered")), "bool") for name in ("lt", "le", "gt", "ge")},
    **{name: ((("a", "bool"), ("b", "bool")), "bool") for name in ("and", "or")},
    "not": ((("a", "bool"),), "bool"),
    "implies": ((("a", "bool"), ("b", "bool")), "bool"),
    **{name: ((("a", "number"), ("b", "number")), "number") for name in ("add", "sub", "mul")},
    "neg": ((("a", "number"),), "number"),
    **{name: ((("a", "int"), ("b", "int")), "int") for name in ("bitand", "bitor", "bitxor")},
    "bitnot": ((("a", "int"),), "int"),
    **{name: ((("value", "int"), ("count", "int")), "int") for name in ("shl", "shr")},
    "count": ((("collection", "collection"),), "int"),
    "item": ((("collection", "collection"), ("index", "any")), "any"),
    "in": ((("value", "any"), ("collection", "collection")), "bool"),
    "sum": ((("collection", "collection"),), "number"),
    **{name: ((("collection", "collection"),), "ordered") for name in ("min", "max")},
    "unique": ((("collection", "collection"),), "bool"),
    "entries": ((("object", "any"), ("adjacency", "str")), "list"),
}
"""The operations Basic defines, by name: each one's variables, its arguments in order, each a name and a schema, and its
result's schema. A schema is a basic scalar's (`bool`, `int`, `str`), Basic's `number`, `ordered` or `collection`,
`list` (a list of any values) or `any`. `install` writes each as an `Expressions.Basic.<name>`."""

CORE: dict[str, int] = {name: len(variables) for name, (variables, _) in OPERATIONS.items()}
"""The operations Basic defines and their numbers of arguments."""


def install(txn: Any) -> Any:
    """Basic's own kind, added to the framework's terms; its dialect's schema, whose singleton is `Expressions.Basic`;
    its kinds of domain, added to the framework's, and its domains' schemas; and its operations, each an expression
    schema of its module. Run after `Framework.install`, in a transaction of its own; run again, it writes nothing. Its
    dialect's data, its operations by name and its domains, `define` writes after it."""
    S = txn.Schemas
    scalars = {"bool": S.OfBool, "int": S.OfInt, "str": S.OfStr}
    scalars_all = {**scalars, "float": S.OfFloat, "bytes": S.OfBytes}

    def schema(_: Any, name: str) -> Any:
        """A variable's schema: a basic scalar, Basic's shared one, or a fresh unnamed one."""
        if name in scalars:
            return scalars[name]
        if name == "any":
            return S.OfAny(lambda a: a)
        if name == "list":
            return S.OfAny(lambda a: a.schemas([S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfAny(lambda e: e)]))]))
        return {"number": _.Number, "ordered": _.Ordered, "collection": _.Collection}[name]

    def result(_: Any, name: str) -> Any:
        """A result's schema, an `OfAny`."""
        if name in scalars:
            return S.OfAny(lambda a: a.schemas([scalars[name]]))
        return schema(_, name)

    def operation(name: str) -> Any:
        variables, returns = OPERATIONS[name]
        return lambda _: getattr(_, f"op_{name}").name(f"Expressions.Basic.{name}").pattern([S.OfPattern(
            lambda p: p.variables([lambda v, n=n, s=s: v.name(n).schema([schema(_, s)]) for n, s in variables]))]).result([
            result(_, returns)])

    symbols, specs = F.dialect(txn, "Expressions.Basic")
    return txn.uid("mbse.Expressions.Basic/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({**symbols, "Term": S.OfUnion, "Quantifier": S.OfObject,  # the framework's union, found by its name
                  "DomainKind": S.OfUnion, "Domain": S.OfObject, "Packs": S.OfRelation,
                  **{kind: S.OfObject for kind in ("OfBool", "OfInteger", "OfIeee754", "OfBits", "OfBytes", "OfUnicode",
                                                   "OfIeee1164", "OfEnum", "OfPacked")},
                  "Number": S.OfAny, "Ordered": S.OfAny, "Collection": S.OfAny,
                  **{f"op_{name}": S.OfExpression for name in OPERATIONS},
                  **{f"domain_{name}": S.OfAny for name in Domains.DOMAINS}})
        .spec([
            *specs,  # Basic's dialect, the singleton `Expressions.Basic`
            lambda _: _.Quantifier.name("Expressions.Basic.Quantifier").properties({
                "name": S.OfStr,  # bound to each item in the body
                "quantifier": S.OfStr,  # all, any or count
                "collection": _.Term,
                "body": _.Term,
            }),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("quantifier").schema([_.Quantifier])]),

            # --- Its kinds of domain, each a standard's parameters; a packed domain's enum and representation are
            # domains, which a value cannot hold: `Packs` links them ---
            lambda _: _.OfBool.name("Expressions.Basic.OfBool"),
            lambda _: _.OfInteger.name("Expressions.Basic.OfInteger").properties({
                "width": S.OfInt, "signed": S.OfBool, "overflow": S.OfStr}),
            lambda _: _.OfIeee754.name("Expressions.Basic.OfIeee754").properties({"format": S.OfStr, "rounding": S.OfStr}),
            lambda _: _.OfBits.name("Expressions.Basic.OfBits").properties({"width": S.OfInt}),
            lambda _: _.OfBytes.name("Expressions.Basic.OfBytes").properties({"width": S.OfInt}),
            lambda _: _.OfUnicode.name("Expressions.Basic.OfUnicode"),
            lambda _: _.OfIeee1164.name("Expressions.Basic.OfIeee1164").properties({"width": S.OfInt}),
            lambda _: _.OfEnum.name("Expressions.Basic.OfEnum").properties({
                "members": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfStr]))}),
            lambda _: _.OfPacked.name("Expressions.Basic.OfPacked").properties({
                "codes": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfInt]))}),
            lambda _: _.DomainKind.name("Expressions.Framework.DomainKind").branches([
                lambda t: t.name("bool").schema([_.OfBool]),
                lambda t: t.name("integer").schema([_.OfInteger]),
                lambda t: t.name("ieee754").schema([_.OfIeee754]),
                lambda t: t.name("bits").schema([_.OfBits]),
                lambda t: t.name("bytes").schema([_.OfBytes]),
                lambda t: t.name("unicode").schema([_.OfUnicode]),
                lambda t: t.name("ieee1164").schema([_.OfIeee1164]),
                lambda t: t.name("enum").schema([_.OfEnum]),
                lambda t: t.name("packed").schema([_.OfPacked]),
            ]),
            lambda _: _.Packs.name("Expressions.Basic.Packs").links([
                lambda t: t.name("packed"), lambda t: t.name("domain").schema([_.Domain]),
                lambda t: t.name("representation").schema([_.Domain])]).uniques([["packed"]]),
            lambda _: _.Domain.name("Expressions.Framework.Domain").adjacencies({
                "packs": lambda a: a.relation([_.Packs]).me("packed")}),

            # --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
            *[lambda _, name=name, scalar=scalar: getattr(_, f"domain_{name}").name(f"Expressions.Basic.{name}").schemas([
                scalars_all[scalar]]) for name, (scalar, _kind, _parameters) in Domains.DOMAINS.items()],

            # --- Its operations: the schemas their variables share, and each operation, which its dialect defines ---
            lambda _: _.Number.name("Expressions.Basic.Number").schemas([S.OfInt, S.OfFloat]),
            lambda _: _.Ordered.name("Expressions.Basic.Ordered").schemas([S.OfInt, S.OfFloat, S.OfStr, S.OfBytes]),
            lambda _: _.Collection.name("Expressions.Basic.Collection").schemas([  # a list, or a mapping
                S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfAny(lambda a: a)])),
                S.OfContainer(lambda c: c.index([S.OfAny(lambda a: a)]).element([S.OfAny(lambda a: a)]))]),
            *[operation(name) for name in OPERATIONS],
        ])]))])


def define(txn: Any) -> Any:
    """Basic's dialect as data: the singleton `Expressions.Basic` naming its operations (`operations`, through
    `Expressions.Framework.Operates`) and owning its domains by name (`domains`, through `Expressions.Framework.Defines`),
    each related to its schema (`Expressions.Basic.uint8`) by `Expressions.Framework.HasDomain`. Run after `install`, in
    a transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and each domain by
    its name: `store.transaction(Basic.define)[0]["uint8"]`."""

    def domain(name: str) -> Any:
        _, kind, parameters = Domains.DOMAINS[name]

        def parameterized(record: Any) -> Any:
            for parameter, value in parameters.items():
                getattr(record, parameter)(value)
            return record

        return lambda _: getattr(_, name).kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: getattr(u, kind)(parameterized)))).schema([
            getattr(txn.Expressions.Basic, name)])

    return txn.uid("mbse.Expressions.Basic.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": txn.Expressions.Basic.Dialect, **{name: txn.Expressions.Framework.Domain
                                                                 for name in Domains.DOMAINS}})
        .spec([
            lambda _: _.dialect.operations({name: lambda e, name=name: e.operation(getattr(txn.Expressions.Basic, name))
                                            for name in OPERATIONS}).domains({
                name: lambda e, name=name: e.domain(getattr(_, name)) for name in Domains.DOMAINS}),
            *[domain(name) for name in Domains.DOMAINS],
        ])]))])


def _native(value: Any) -> Writer | None:
    """The literal of a native value."""
    return literal(value) if type(value) in Schemas.SCALAR_TYPES else None


DIALECT = F.Dialect("Basic", {
    "literal": F.Kind(F.LITERAL),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.SIGNATURES, required=("callable",), closed=True),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "let": F.Kind(F.BINDING, required=("name",)),
    "list": F.Kind(F.APPLICATION, signature=Domains.LIST),
    "mapping": F.Kind(F.APPLICATION, signature=Domains.MAPPING),
    "quantifier": F.Kind(F.QUANTIFIER, operator="quantifier", vocabulary=Domains.QUANTIFIERS,
                         required=("name", "quantifier")),
}, domain_of=Domains.of, literal=_native)
"""The Basic dialect: its kinds, as the framework reads them."""


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


def _spec(value: Any) -> Any:
    return None if value is None else DIALECT.spec(value)


def variable(name: str) -> Writer:
    """The variable `name`."""
    return Writer(lambda u: u.variable(lambda v: v.name(name)))


def literal(value: Any) -> Writer:
    """The literal `value`, a basic scalar."""

    def write(u: Any) -> Any:
        return u.literal(lambda r: r if value is None else r.value(lambda p: p.as_scalar(value)))

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


def list_(*elements: Any) -> Writer:
    """The list of the values of `elements`, in order."""
    specs = [DIALECT.spec(element) for element in elements]
    return Writer(lambda u: u.list(lambda r: r.elements(specs)))


def mapping(*entries: tuple[Any, Any]) -> Writer:
    """The mapping of each entry's key's value to its value's: `mapping(("a", 1), ("b", x))`."""
    pairs = [(DIALECT.spec(key), DIALECT.spec(value)) for key, value in entries]
    return Writer(lambda u: u.mapping(lambda r: r.entries([
        lambda a, key=key, value=value: a.as_object(lambda o: o.key(key).value(value)) for key, value in pairs])))


def operation(name: str, *arguments: Any) -> Writer:
    """The operation `name` applied to `arguments`, in the order its variables are declared; for operations without a
    method."""
    specs = [DIALECT.spec(argument) for argument in arguments]
    return Writer(lambda u: u.call(lambda r: r.callable(name).arguments(specs)))
