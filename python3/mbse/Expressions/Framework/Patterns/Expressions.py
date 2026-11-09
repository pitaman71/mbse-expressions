"""Expressions of the Patterns dialect (formerly Basic): the core vocabulary, for constraints. `Evaluators` evaluates
them.

Patterns' terms are values of its `Term`, `Expressions.Framework.Patterns.Term`, the branch `patterns` of
`Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are the
framework's kinds it reuses (`mbse.Expressions.Framework.Terms`), one of its own, and the framework's kinds of invalid
syntax:

- `literal`: a value (`value`), with its spelling (`text`) and what is wrong with it (`problems`) where it was read
  from source.
- `call`: an operation Patterns defines (`callable`) applied to ordered `arguments`, e.g. `eq(a, b)`: the arguments are
  the operation's variables in the order it declares them. See mbse-basis
  [CAP-095: Basic terms as data](mbse:mbse-basis/docs/capabilities/CAP-095.md#terms-and-the-core-vocabulary).
- `variable`: the value bound to a `name`.
- `let`: binds a `name` to the value of one term (`value`) within another (`body`).
- `list` and `mapping`: the container constructors, a list of its `elements`' values and a mapping of its `entries`'
  keys to their values.
- `quantifier`, its own: binds a `name` to each item of a `collection` within a `body`, and gives whether it holds for
  `all` or `any` of them, or for how many (`count`): its `quantifier`. Its slots hold Patterns' terms.
- `error` and `missing`: invalid syntax, which no reader of Patterns writes.

A term carries no domain. Patterns' operations are data: `install` defines each as a `Schemas.OfExpression` in its
module (`Expressions.Framework.Patterns.add`), its pattern's variables its arguments and its `result` its return, as precise as
the basic scalars and containers allow (`Expressions.Framework.Patterns.Number`, an int or a float; `Expressions.Framework.Patterns.Ordered`;
`Expressions.Framework.Patterns.Collection`, a list or a mapping; an unrestricted `Schemas.OfAny` where any value goes), each
written in the builders' fluent syntax. Validation reads Patterns' vocabulary (`Domains.SIGNATURES`, the same names,
which a term alone, in no store, can read): a call naming an operation Patterns does not define is refused. `install`
also adds Patterns' dialect, the singleton `Expressions.Framework.Patterns`; `define` writes the dialect's data, its
operations by name (`Expressions.Framework.Operates`). Patterns has no kinds of domain and owns no domains: the kinds
and the domains its values take are the standard dialects' (ISO/IEC 11404's, IEEE 754's, IEEE 1164's and Unicode's,
`mbse.Expressions.ISOIEC11404.Expressions` and the others), whose installs run before Patterns'.

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
    "install", "define", "CORE", "DIALECT", "Writer", "variable", "literal", "let_", "list_", "mapping", "operation",
    "quantifier",
]

CORE: dict[str, int] = {name: signature.arity() for name, signature in Domains.SIGNATURES.items()}
"""The operations Patterns defines and their numbers of arguments."""


def install(txn: Any) -> Any:
    """Patterns' union of its kinds, added to the framework's terms as the branch `patterns`, and its own kind; its
    dialect's schema, whose singleton is `Expressions.Framework.Patterns`; and its operations, each an expression schema
    of its module. Run after `Framework.install` and the standard dialects' installs, in a transaction of its own; run
    again, it writes nothing. Its dialect's data, its operations by name, `define` writes after it.
    Its holder, `Expressions.Framework.Patterns.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed
    to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.Framework.Patterns/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"FrameworkTerm": S.OfUnion, "Term": S.OfUnion, "Expression": S.OfObject, "Quantifier": S.OfObject,  # FrameworkTerm: the framework's, by name
                  "Dialects": S.OfUnion, "Dialect": S.OfObject,  # the framework's kind union of dialects, and Patterns'
                  "Number": S.OfAny, "Ordered": S.OfAny, "Collection": S.OfAny,
                  "op_get": S.OfExpression, "op_has": S.OfExpression, "op_eq": S.OfExpression, "op_ne": S.OfExpression,
                  "op_lt": S.OfExpression, "op_le": S.OfExpression, "op_gt": S.OfExpression, "op_ge": S.OfExpression,
                  "op_and": S.OfExpression, "op_or": S.OfExpression, "op_not": S.OfExpression,
                  "op_implies": S.OfExpression, "op_add": S.OfExpression, "op_sub": S.OfExpression,
                  "op_mul": S.OfExpression, "op_neg": S.OfExpression, "op_bitand": S.OfExpression,
                  "op_bitor": S.OfExpression, "op_bitxor": S.OfExpression, "op_bitnot": S.OfExpression,
                  "op_shl": S.OfExpression, "op_shr": S.OfExpression, "op_count": S.OfExpression,
                  "op_item": S.OfExpression, "op_in": S.OfExpression, "op_sum": S.OfExpression,
                  "op_min": S.OfExpression, "op_max": S.OfExpression, "op_unique": S.OfExpression,
                  "op_entries": S.OfExpression})
        .spec([
            # --- Patterns' dialect: the singleton `Expressions.Framework.Patterns`, a branch of the framework's kind union ---
            lambda _: _.Dialect.name("Expressions.Framework.Patterns.Dialect").ref(True).singleton("Expressions.Framework.Patterns").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("patterns").schema([_.Dialect])]),

            # --- Its union of its kinds: the framework's it reuses, its own, and invalid syntax; the branch `patterns`
            # of the framework's terms ---
            lambda _: _.Term.name("Expressions.Framework.Patterns.Term").branches([
                lambda t: t.name("literal").schema([Framework.Literal]),
                lambda t: t.name("call").schema([Framework.Call]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("let").schema([Framework.Let]),
                lambda t: t.name("list").schema([Framework.List]),
                lambda t: t.name("mapping").schema([Framework.Mapping]),
                lambda t: t.name("quantifier").schema([_.Quantifier]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Quantifier.name("Expressions.Framework.Patterns.Quantifier").properties({
                "name": S.OfStr,  # bound to each item in the body
                "quantifier": S.OfStr,  # all, any or count
                "collection": _.Term,
                "body": _.Term,
            }),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
            # to its `Term`
            lambda _: _.Expression.name("Expressions.Framework.Patterns.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("patterns").schema([_.Term])]),

            # --- Its operations: the schemas their variables share, and each operation, which its dialect defines:
            # its pattern's variables its arguments, in order, and its result its return ---
            lambda _: _.Number.name("Expressions.Framework.Patterns.Number").schemas([S.OfInt, S.OfFloat]),
            lambda _: _.Ordered.name("Expressions.Framework.Patterns.Ordered").schemas([S.OfInt, S.OfFloat, S.OfStr, S.OfBytes]),
            lambda _: _.Collection.name("Expressions.Framework.Patterns.Collection").schemas([  # a list, or a mapping
                S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfAny(lambda a: a)])),
                S.OfContainer(lambda c: c.index([S.OfAny(lambda a: a)]).element([S.OfAny(lambda a: a)]))]),
            lambda _: _.op_get.name("Expressions.Framework.Patterns.get").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("object").schema([S.OfAny(lambda a: a)]),
                lambda v: v.name("name").schema([S.OfStr])]))]).result([S.OfAny(lambda a: a)]),
            lambda _: _.op_has.name("Expressions.Framework.Patterns.has").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("object").schema([S.OfAny(lambda a: a)]),
                lambda v: v.name("name").schema([S.OfStr])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_eq.name("Expressions.Framework.Patterns.eq").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfAny(lambda a: a)]),
                lambda v: v.name("b").schema([S.OfAny(lambda a: a)])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_ne.name("Expressions.Framework.Patterns.ne").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfAny(lambda a: a)]),
                lambda v: v.name("b").schema([S.OfAny(lambda a: a)])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_lt.name("Expressions.Framework.Patterns.lt").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([_.Ordered]),
                lambda v: v.name("b").schema([_.Ordered])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_le.name("Expressions.Framework.Patterns.le").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([_.Ordered]),
                lambda v: v.name("b").schema([_.Ordered])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_gt.name("Expressions.Framework.Patterns.gt").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([_.Ordered]),
                lambda v: v.name("b").schema([_.Ordered])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_ge.name("Expressions.Framework.Patterns.ge").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([_.Ordered]),
                lambda v: v.name("b").schema([_.Ordered])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_and.name("Expressions.Framework.Patterns.and").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfBool]),
                lambda v: v.name("b").schema([S.OfBool])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_or.name("Expressions.Framework.Patterns.or").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfBool]),
                lambda v: v.name("b").schema([S.OfBool])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_not.name("Expressions.Framework.Patterns.not").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfBool])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_implies.name("Expressions.Framework.Patterns.implies").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfBool]),
                lambda v: v.name("b").schema([S.OfBool])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_add.name("Expressions.Framework.Patterns.add").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([_.Number]),
                lambda v: v.name("b").schema([_.Number])]))]).result([_.Number]),
            lambda _: _.op_sub.name("Expressions.Framework.Patterns.sub").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([_.Number]),
                lambda v: v.name("b").schema([_.Number])]))]).result([_.Number]),
            lambda _: _.op_mul.name("Expressions.Framework.Patterns.mul").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([_.Number]),
                lambda v: v.name("b").schema([_.Number])]))]).result([_.Number]),
            lambda _: _.op_neg.name("Expressions.Framework.Patterns.neg").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([_.Number])]))]).result([_.Number]),
            lambda _: _.op_bitand.name("Expressions.Framework.Patterns.bitand").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfInt]),
                lambda v: v.name("b").schema([S.OfInt])]))]).result([S.OfAny(lambda a: a.schemas([S.OfInt]))]),
            lambda _: _.op_bitor.name("Expressions.Framework.Patterns.bitor").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfInt]),
                lambda v: v.name("b").schema([S.OfInt])]))]).result([S.OfAny(lambda a: a.schemas([S.OfInt]))]),
            lambda _: _.op_bitxor.name("Expressions.Framework.Patterns.bitxor").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfInt]),
                lambda v: v.name("b").schema([S.OfInt])]))]).result([S.OfAny(lambda a: a.schemas([S.OfInt]))]),
            lambda _: _.op_bitnot.name("Expressions.Framework.Patterns.bitnot").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("a").schema([S.OfInt])]))]).result([S.OfAny(lambda a: a.schemas([S.OfInt]))]),
            lambda _: _.op_shl.name("Expressions.Framework.Patterns.shl").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("value").schema([S.OfInt]),
                lambda v: v.name("count").schema([S.OfInt])]))]).result([S.OfAny(lambda a: a.schemas([S.OfInt]))]),
            lambda _: _.op_shr.name("Expressions.Framework.Patterns.shr").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("value").schema([S.OfInt]),
                lambda v: v.name("count").schema([S.OfInt])]))]).result([S.OfAny(lambda a: a.schemas([S.OfInt]))]),
            lambda _: _.op_count.name("Expressions.Framework.Patterns.count").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("collection").schema([_.Collection])]))]).result([S.OfAny(lambda a: a.schemas([S.OfInt]))]),
            lambda _: _.op_item.name("Expressions.Framework.Patterns.item").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("collection").schema([_.Collection]),
                lambda v: v.name("index").schema([S.OfAny(lambda a: a)])]))]).result([S.OfAny(lambda a: a)]),
            lambda _: _.op_in.name("Expressions.Framework.Patterns.in").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("value").schema([S.OfAny(lambda a: a)]),
                lambda v: v.name("collection").schema([_.Collection])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_sum.name("Expressions.Framework.Patterns.sum").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("collection").schema([_.Collection])]))]).result([_.Number]),
            lambda _: _.op_min.name("Expressions.Framework.Patterns.min").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("collection").schema([_.Collection])]))]).result([_.Ordered]),
            lambda _: _.op_max.name("Expressions.Framework.Patterns.max").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("collection").schema([_.Collection])]))]).result([_.Ordered]),
            lambda _: _.op_unique.name("Expressions.Framework.Patterns.unique").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("collection").schema([_.Collection])]))]).result([S.OfAny(lambda a: a.schemas([S.OfBool]))]),
            lambda _: _.op_entries.name("Expressions.Framework.Patterns.entries").pattern([S.OfPattern(lambda p: p.variables([
                lambda v: v.name("object").schema([S.OfAny(lambda a: a)]),
                lambda v: v.name("adjacency").schema([S.OfStr])]))]).result([S.OfAny(lambda a: a.schemas([  # records
                    S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfAny(lambda e: e)]))]))]),
        ])]))])


def define(txn: Any) -> Any:
    """Patterns' dialect as data: the singleton `Expressions.Framework.Patterns` naming its operations (`operations`,
    through `Expressions.Framework.Operates`); it owns no domains. Run after `install`, in a transaction of its own; run
    again, it writes nothing. Its frame binds the dialect: `store.transaction(Patterns.define)[0]["dialect"]`."""
    Patterns = txn.Expressions.Framework.Patterns
    return txn.uid("mbse.Expressions.Patterns.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": Patterns.Dialect})
        .spec([
            lambda _: _.dialect.operations({
                "get": lambda e: e.operation(Patterns.get), "has": lambda e: e.operation(Patterns.has),
                "eq": lambda e: e.operation(Patterns.eq), "ne": lambda e: e.operation(Patterns.ne),
                "lt": lambda e: e.operation(Patterns.lt), "le": lambda e: e.operation(Patterns.le),
                "gt": lambda e: e.operation(Patterns.gt), "ge": lambda e: e.operation(Patterns.ge),
                "and": lambda e: e.operation(getattr(Patterns, "and")), "or": lambda e: e.operation(getattr(Patterns, "or")),
                "not": lambda e: e.operation(getattr(Patterns, "not")), "implies": lambda e: e.operation(Patterns.implies),
                "add": lambda e: e.operation(Patterns.add), "sub": lambda e: e.operation(Patterns.sub),
                "mul": lambda e: e.operation(Patterns.mul), "neg": lambda e: e.operation(Patterns.neg),
                "bitand": lambda e: e.operation(Patterns.bitand), "bitor": lambda e: e.operation(Patterns.bitor),
                "bitxor": lambda e: e.operation(Patterns.bitxor), "bitnot": lambda e: e.operation(Patterns.bitnot),
                "shl": lambda e: e.operation(Patterns.shl), "shr": lambda e: e.operation(Patterns.shr),
                "count": lambda e: e.operation(Patterns.count), "item": lambda e: e.operation(Patterns.item),
                "in": lambda e: e.operation(getattr(Patterns, "in")), "sum": lambda e: e.operation(Patterns.sum),
                "min": lambda e: e.operation(Patterns.min), "max": lambda e: e.operation(Patterns.max),
                "unique": lambda e: e.operation(Patterns.unique), "entries": lambda e: e.operation(Patterns.entries),
            }),
        ])]))])


def _native(value: Any) -> Writer | None:
    """The literal of a native value."""
    return literal(value) if type(value) in Schemas.SCALAR_TYPES else None


DIALECT = F.Dialect("Framework.Patterns", {
    "literal": F.Kind(F.LITERAL),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.SIGNATURES, required=("callable",), closed=True),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "let": F.Kind(F.BINDING, required=("name",)),
    "list": F.Kind(F.APPLICATION, signature=Domains.LIST),
    "mapping": F.Kind(F.APPLICATION, signature=Domains.MAPPING),
    "quantifier": F.Kind(F.QUANTIFIER, operator="quantifier", vocabulary=Domains.QUANTIFIERS,
                         required=("name", "quantifier")),
}, domain_of=Domains.of, literal=_native)
"""The Patterns dialect: its kinds, as the framework reads them."""


# --- Writers: writing terms with methods ---


class Writer(F.Writer):
    """A term of Patterns written with methods, through the builders. `.name` reads a property (`get`); use `.get(name)`
    for names that are also methods or a writer's own (`eq`, `write`, `dialect`). A `Writer` is a spec: it writes its
    term where it is given."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)

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
    """The literal `value`, a basic scalar, with no spelling: printers write its default one."""

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
