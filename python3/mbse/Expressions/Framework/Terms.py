"""Terms: the protocols every dialect's expressions implement, and the machinery that implements them.

An expression language (a dialect) is a set of term kinds and a vocabulary of operators. Every dialect's expressions are:

- Serializable. Each kind has a meta-schema, an ordinary mbse-schemas object schema tagged by `kind`, and its data has a
  builder (`create()` / `clone()` / `update()`) that implements `Visitors.OfObject`. `Dialect.Builders`, a store of the
  dialect's bound classes (an mbse-schemas `Bindings.OfStore`), rebuilds data from snapshots; `Dialect.register(store)`
  registers the meta-schemas in any other store; and `Dialect.Schema` is the union of the kinds' meta-schemas.
- Structurally traversable. `Expression.form()` gives a term's `Form`: its kind, its native attributes and its ordered
  arguments, which are expressions of the same dialect. `Dialect.make(form)` is the inverse. `walk`, `fold` and `same`
  traverse any dialect's expressions through forms alone.
- Validatable. `Dialect.validate` reports what evaluation would raise, and `Dialect.infer` finds an expression's domain
  from its vocabulary's signatures (see `Domains`).
- Evaluatable, by the dialect's own evaluator (see `Evaluators`), and translatable to other dialects (see
  `Translators`).

A dialect declares each kind as a dataclass derived from `Term`, whose class variables say how its fields map to the
data model and what `role` it plays, and passes the classes to `Declared`, which derives the rest. The roles are:

- `LITERAL`: a native value, in the field `value`, written to the property named after its type (`int`, `str`, ...).
- `REFERENCE`: a value the scope resolves. A lexical reference (`LEXICAL`, the default) is the value bound to the name
  in its first property, by an enclosing binding or import or by the scope; others, such as Excel's cell references,
  are resolved by the scope alone, and validation does not require them to be bound. `AMBIENT` names are bound
  without being declared, as Python's builtins are.
- `APPLICATION`: an operator, named by the property `OPERATOR` (or, if it is None, by the kind's tag), applied to
  arguments. A kind's `VOCABULARY` maps operator names to signatures; operators outside it are extensions, unless the
  vocabulary is `None`, when any name is accepted and `SIGNATURE` applies to all.
- `BINDING`: binds the name in its first property to its first argument within the others.
- `QUANTIFIER`: binds the name in its first property to each item of its first argument, a collection, within the
  others (a body, and any conditions), and combines the results by its operator (named as an application's is), such as `all`. Its signature also
  gives the domain of a collection's items, `items(domain)`, for inference.
- `IMPORT`: makes what it declares (a module, a package's functions) available within its one argument, its body. The
  scope resolves the declaration; `binds()` gives the names it binds for lexical references.

Properties are required unless named in `OPTIONAL`, and `check()` adds a kind's own problems to validation. `VALUES`
names properties that hold a value object rather than a native, each described by a `ValueProperty` (its schema, and the
conversions between the field's data and the value's plain form), such as a literal's domain. `typed()` gives a
literal's own domain, if it has one.

Each kind's data is bound to its meta-schema with mbse-schemas' `Bindings`: the kind's fields are read into a
`Bindings.State` (its properties, and its `arguments` entries) and made from one, with `kind` fixed, a literal's native
properties exclusive and `used_by` implied. `accept`, the builders' visitor protocols and the store `Builders` are
the generic ones; `Builder` adds the DSL. Arguments
are fields too: `SLOTS` names fields holding one argument each, in index order, and `VARIADIC` names one field holding a
tuple of the arguments after the slots. Both are written as entries of the adjacency `arguments`, to the relation `Arguments`
(registered as 'Expressions.Arguments' and shared by every dialect), which links a `parent` to an `argument` with an
`index`. Every kind also declares `used_by`, the same relation seen from the argument, which data never writes.
"""

from __future__ import annotations

import dataclasses
import math
from collections.abc import Callable, Hashable, Iterable, Iterator, Mapping, Sequence
from typing import Any, ClassVar, Protocol, runtime_checkable

from mbse.Schemas.Framework import Bindings, Schemas, Visitors
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = [
    "Form", "Expression", "Dialect", "Term", "Builder", "AnyBuilder", "Writer", "Declared", "ValueProperty",
    "LITERAL", "REFERENCE", "APPLICATION", "BINDING", "IMPORT", "QUANTIFIER", "ARGUMENTS", "Arguments", "NATIVES",
    "walk", "fold", "same", "resolve", "name_of",
]

LITERAL, REFERENCE, APPLICATION, BINDING, IMPORT = "literal", "reference", "application", "binding", "import"
QUANTIFIER = "quantifier"
ARGUMENTS = "Expressions.Arguments"
NATIVES: dict[str, type[Native]] = {"int": int, "float": float, "str": str, "bool": bool, "bytes": bytes}


def _type_name(value: object) -> str:
    return type(value).__name__


def _native_name(value: object) -> str | None:
    """The name of `value`'s native type, which is also the literal property that holds it; None if not native."""
    name = type(value).__name__
    return name if NATIVES.get(name) is type(value) else None


def _article(noun: str) -> str:
    return f"{'an' if noun[0] in 'aeiou' else 'a'} {noun}"


# --- Protocols ---


@dataclasses.dataclass(frozen=True)
class Form:
    """A term's structure: its `kind`, its native `attributes` by name, and its ordered `arguments` (None where a slot
    is empty)."""

    kind: str
    attributes: Mapping[str, Native] = dataclasses.field(default_factory=dict)
    arguments: tuple[Any, ...] = ()


@runtime_checkable
class Expression(Visitors.Visitable, Protocol):
    """An expression of some dialect: `Visitable`, so it serializes like any object, and structurally traversable."""

    def dialect(self) -> Dialect: ...

    def form(self) -> Form: ...

    def validate(self, bound: Iterable[str] = (), core: bool = False) -> list[str]: ...


@runtime_checkable
class Dialect(Protocol):
    """An expression language: its kinds, their meta-schemas and builders, and its static checks."""

    Schema: Schemas.OfUnion.Data
    Builders: Bindings.OfStore

    def name(self) -> str: ...

    def kinds(self) -> Mapping[str, type]:
        """The data class of each kind, by tag."""
        ...

    def schema_of(self, expression: Any) -> Schemas.OfObject.Data:
        """The meta-schema of `expression`'s kind: the root schema for its snapshots."""
        ...

    def make(self, form: Form) -> Expression:
        """The expression with this form."""
        ...

    def resolve(self, spec: Any) -> Expression:
        """The expression a spec denotes: an expression, a `Writer`, a native value (a literal) or a callable taking the
        dialect's `AnyBuilder`."""
        ...

    def validate(self, expression: Any, bound: Iterable[str] = (), core: bool = False) -> list[str]:
        """Problems with `expression`. References must be bound by an enclosing binding or be in `bound`. With `core`,
        every operator must be in its kind's vocabulary."""
        ...

    def infer(self, expression: Any, environment: Mapping[str, Domains.Domain] | None = None) -> Domains.Domain:
        """The domain of `expression`'s value (a spec), with the references in `environment` of the given domains."""
        ...


# --- Data ---


class ValueProperty:
    """A property that holds a value object rather than a native: the `schema` of its value, and the conversions between
    the field's data and the value's plain form."""

    def __init__(self, schema: Schemas.OfAny.Data, to_plain: Callable[[Any], Any], from_plain: Callable[[Any], Any]):
        self.schema, self.to_plain, self.from_plain = schema, to_plain, from_plain


class Term:
    """Shared by every kind's data (a dataclass per kind): identity, schema name, writing through `accept`, and the
    structural view. `Declared` sets `DIALECT`, `NAME` and `FIELDS`."""

    DIALECT: ClassVar[Declared]
    NAME: ClassVar[str]
    FIELDS: ClassVar[tuple[str, ...]]
    KIND: ClassVar[str]
    ROLE: ClassVar[str]
    VALUE: ClassVar[Mapping[str, type] | None] = None
    PROPERTIES: ClassVar[Mapping[str, type]] = {}
    OPTIONAL: ClassVar[frozenset[str]] = frozenset()
    LEXICAL: ClassVar[bool] = True
    AMBIENT: ClassVar[frozenset[str]] = frozenset()
    SLOTS: ClassVar[tuple[str, ...]] = ()
    VARIADIC: ClassVar[str | None] = None
    OPERATOR: ClassVar[str | None] = None
    VOCABULARY: ClassVar[Mapping[str, Domains.Signature] | None] = None
    SIGNATURE: ClassVar[Domains.Signature | None] = None
    VALUES: ClassVar[Mapping[str, ValueProperty]] = {}
    BINDING: ClassVar[Bindings.Binding]

    def identity(self) -> Hashable:
        return id(self)

    def schema_name(self) -> str:
        return self.NAME

    def owner(self) -> None:
        """Expressions are reference objects, linked by their arguments."""
        return None

    def dialect(self) -> Declared:
        return self.DIALECT

    def accept(self, visitor: Visitors.OfObject) -> None:
        """Writes the tag, the value into the property named after its native type, the other properties, then one
        `arguments` entry per argument, in order, with its index."""
        if self.VALUE is not None and self.value is not None:  # type: ignore[attr-defined]
            _check_value(type(self), self.value)  # type: ignore[attr-defined]
        Bindings.accept(self.BINDING, self, visitor)

    def _arguments(self) -> tuple[Any, ...]:
        fixed = tuple(getattr(self, slot) for slot in self.SLOTS)
        return fixed + tuple(getattr(self, self.VARIADIC)) if self.VARIADIC is not None else fixed

    def binds(self) -> tuple[str, ...]:
        """The names an import binds within its body, for lexical references; none by default."""
        return ()

    def check(self) -> list[str]:
        """The kind's own problems, beyond those of its role; none by default."""
        return []

    def typed(self) -> Domains.Domain | None:
        """A literal's own domain, when it carries one; None for its value's default, and for other kinds."""
        return None

    def form(self) -> Form:
        attributes = {"value": self.value} if self.VALUE is not None and self.value is not None else {}  # type: ignore
        attributes.update({n: getattr(self, n) for n in (*self.PROPERTIES, *self.VALUES) if getattr(self, n) is not None})
        return Form(self.KIND, attributes, self._arguments())

    def validate(self, bound: Iterable[str] = (), core: bool = False) -> list[str]:
        """Problems with this expression. References must be bound by an enclosing binding or be in `bound`. With
        `core`, every operator must be in its kind's vocabulary."""
        return self.DIALECT.validate(self, bound, core)


def name_of(node: Any) -> Any:
    """A reference's, binding's or import's name: the value of its first property; None if it has none."""
    kind = type(node)
    return getattr(node, next(iter(kind.PROPERTIES))) if kind.PROPERTIES else None


def _operator(node: Any) -> str:
    """The name of an application's or a quantifier's operator: its `OPERATOR` property, or its kind's tag."""
    kind = type(node)
    return kind.KIND if kind.OPERATOR is None else getattr(node, kind.OPERATOR)


def _check_value(kind: type[Term], value: Any) -> str:
    """The property that holds a literal's value; raises if the kind cannot hold it."""
    name = _native_name(value)
    if name is None:
        raise TypeError(f"{_article(kind.KIND)} must hold a native value, got {_type_name(value)}")
    if name not in kind.VALUE:  # type: ignore[operator]
        raise TypeError(f"{_article(kind.KIND)} cannot hold a {name}")
    return name


# --- Bindings: a kind's fields bound to its meta-schema ---


def _read(instance: Term) -> Bindings.State:
    """A term's state: its value under the property named after its native type (under `value` when it has none), its
    other properties, its value properties in their plain form, and its arguments as `arguments` entries."""
    kind = type(instance)
    values: dict[str, Any] = {}
    if kind.VALUE is not None and instance.value is not None:  # type: ignore[attr-defined]
        name = _native_name(instance.value)  # type: ignore[attr-defined]
        values[name if name in kind.VALUE else "value"] = instance.value  # type: ignore[attr-defined, operator]
    values.update({name: getattr(instance, name) for name in kind.PROPERTIES})
    for name, field in kind.VALUES.items():
        if getattr(instance, name) is not None:
            values[name] = field.to_plain(getattr(instance, name))
    arguments = [Bindings.Entry({"argument": argument}, {"index": index})
                 for index, argument in enumerate(instance._arguments()) if argument is not None]
    return Bindings.State(values, {"arguments": arguments} if _parent(kind) else {})


def _parent(kind: type[Term]) -> bool:
    return bool(kind.SLOTS) or kind.VARIADIC is not None


def _value(kind: type[Term], values: Mapping[str, Any]) -> Any:
    """A literal's value: the one native property it holds, or the value it holds under `value`."""
    return next((values[name] for name in kind.VALUE if values.get(name) is not None), values.get("value"))  # type: ignore[union-attr]


def _check_target(kind: type[Term], entry: Bindings.Entry) -> Any:
    target = entry.links.get("argument")
    if target is None:
        raise ValueError("link 'argument' is not set")
    if not isinstance(target, kind.DIALECT.classes):
        raise TypeError(f"an argument must be an expression, got {_type_name(target)}")
    return target


def _make(kind: type[Term], state: Bindings.State) -> Any:
    """The term a state holds: its fields from the properties, and its arguments from the `arguments` entries, the
    slots by index and the variadic ones in index order."""
    values = state.values
    fields: dict[str, Any] = {name: values.get(name) for name in kind.PROPERTIES}
    if kind.VALUE is not None:
        fields["value"] = _value(kind, values)
    for name, field in kind.VALUES.items():
        fields[name] = None if values.get(name) is None else field.from_plain(values[name])
    entries = state.entries.get("arguments", [])
    parts: list[Any] = [None] * len(kind.SLOTS)
    rest: list[Bindings.Entry] = []
    for entry in entries:
        index = entry.properties.get("index")
        if index in range(len(kind.SLOTS)):
            parts[index] = _check_target(kind, entry)
        elif kind.VARIADIC is not None:
            rest.append(entry)
        else:
            raise ValueError(_slots_message(kind, index))
    fields.update(zip(kind.SLOTS, parts))
    if kind.VARIADIC is not None:
        last = len(entries) + len(kind.SLOTS)
        ordered = sorted(rest, key=lambda entry: last if entry.properties.get("index") is None else entry.properties["index"])
        fields[kind.VARIADIC] = tuple(_check_target(kind, entry) for entry in ordered)
    return kind(**fields)


def _assign(kind: type[Term], instance: Any, state: Bindings.State) -> Any:
    made = _make(kind, state)
    for name in kind.FIELDS:
        setattr(instance, name, getattr(made, name))
    return instance


def _binding(kind: type[Term]) -> Bindings.Binding:
    return Bindings.Binding(kind.Schema, _read, lambda state: _make(kind, state),  # type: ignore[attr-defined]
                            lambda instance, state: _assign(kind, instance, state), fixed={"kind": kind.KIND},
                            exclusive=[(*kind.VALUE, "value")] if kind.VALUE is not None else (), implied=["used_by"])


# --- Builders ---


def _slots_message(kind: type[Term], index: Any) -> str:
    """E.g. "a let's value is argument 0 and its body argument 1, got index 2"."""
    parts = [f"{slot} is argument 0" if i == 0 else f"its {slot} argument {i}" for i, slot in enumerate(kind.SLOTS)]
    listed = parts[0] if len(parts) == 1 else f"{', '.join(parts[:-1])} and {parts[-1]}"
    return f"{_article(kind.KIND)}'s {listed}, got index {index}"


class Builder(Bindings.Builder):
    """A kind's builder: mbse-schemas' generic `Bindings.Builder` over the kind's binding, so `create()` / `clone()` /
    `update()` and `Visitors.OfObject`, with the DSL. None of them validate. DSL: `.set(name, native)` sets a property
    ('value' is a literal's value), `.arguments(*specs)` appends arguments to a variadic kind and `.argument(slot, spec)`
    fills a slot; specs are resolved by the dialect."""

    _data: ClassVar[type[Term]]

    def __init__(self, instance: Any = None):
        if instance is not None and type(instance) is not self._data:
            raise TypeError(f"expected {self._data.KIND} data to build from, got {_type_name(instance)}")
        super().__init__(self._data.BINDING, instance)

    # DSL

    def set(self, name: str, value: Any) -> Any:
        kind, values = self._data, self.state.values
        if name == "value" and kind.VALUE is not None:
            for other in (*kind.VALUE, "value"):
                values.pop(other, None)
            native = _native_name(value)
            values[native if native in kind.VALUE else "value"] = value  # None, or a non-native, is held as `value`
        elif name in kind.PROPERTIES:
            values[name] = value
        elif name in kind.VALUES:
            values[name] = None if value is None else kind.VALUES[name].to_plain(value)
        else:
            raise KeyError(f"{_article(kind.KIND)} has no attribute {name!r}")
        return self

    def _entries(self) -> list[Bindings.Entry]:
        return self.state.entries.setdefault("arguments", [])

    def arguments(self, *specs: Any) -> Any:
        if self._data.VARIADIC is None:
            raise TypeError(f"{_article(self._data.KIND)} has no variadic arguments")
        slots = len(self._data.SLOTS)
        for spec in specs:
            index = slots + sum(1 for entry in self._entries()
                                if entry.properties.get("index") is None or entry.properties["index"] >= slots)
            self._entries().append(Bindings.Entry({"argument": self._data.DIALECT.resolve(spec)}, {"index": index}))
        return self

    def argument(self, slot: str, spec: Any) -> Any:
        if slot not in self._data.SLOTS:
            raise KeyError(f"{_article(self._data.KIND)} has no argument {slot!r}")
        index = self._data.SLOTS.index(slot)
        self._entries()[:] = [entry for entry in self._entries() if entry.properties.get("index") != index]
        self._entries().append(Bindings.Entry({"argument": self._data.DIALECT.resolve(spec)}, {"index": index}))
        return self


class AnyBuilder:
    """Selects an expression of the dialect: `.select(spec)`, or a dialect's `as_<kind>(spec)` methods. Finalizing
    yields that expression."""

    _dialect: ClassVar[Declared]

    def __init__(self, instance: Any = None):
        self._source = instance
        self._selected: Any = None

    def select(self, spec: Any) -> Any:
        self._selected = self._dialect.resolve(spec)
        return self

    def _require_selected(self) -> Any:
        if self._selected is None:
            raise ValueError("no kind selected; call an as_<kind> method")
        return self._selected

    def create(self) -> Any:
        if self._source is not None:
            raise ValueError("create() is only valid without a source instance; use clone() or update()")
        return self._require_selected()

    def clone(self) -> Any:
        """The selected expression, or a shallow copy of the source (arguments are shared, not copied)."""
        if self._source is None:
            raise ValueError("clone() is only valid with a source instance")
        if self._selected is not None:
            return self._selected
        return type(self._source)(*(getattr(self._source, name) for name in self._source.FIELDS))

    def update(self) -> Any:
        if self._source is None:
            raise ValueError("update() is only valid with a source instance")
        selected = self._require_selected()
        if type(selected) is not type(self._source):
            raise TypeError("update() cannot change the kind of the source expression")
        for name in selected.FIELDS:
            setattr(self._source, name, getattr(selected, name))
        return self._source


# --- Specs ---


class Writer:
    """An expression written with methods; each dialect derives its own. A `Writer` is a spec; `.data` is its
    expression."""

    __slots__ = ("data",)

    def __init__(self, data: Any):
        self.data = data


def resolve(spec: Any, data: type | tuple[type, ...], builder: Callable[[], Any], expected: str) -> Any:
    """Resolves a spec: data is used as is, a `Writer` gives its data, and a callable is given a new builder and must
    return it."""
    if isinstance(spec, Writer):
        spec = spec.data
    if isinstance(spec, data):
        return spec
    if isinstance(spec, type):
        raise TypeError(f"a class is not a Spec here, got {spec.__name__}")
    if callable(spec):
        built = spec(builder())
        if built is None or not callable(getattr(built, "create", None)):
            raise TypeError(f"a Spec callable must return its builder, got {built!r}")
        return built.create()
    raise TypeError(f"expected {expected} or a callable taking its builder, got {spec!r}")


# --- Meta-schemas and the store ---


def _native(name: str, native: type) -> Callable[[Any], Any]:
    return lambda p: p.name(name).of(lambda t: t.as_native(native))


Arguments = (
    Schemas.OfRelation.Builder().links("parent", "argument").properties(_native("index", int)).unique("argument")
    .create()
)
_ARGUMENTS = lambda r: r.name("arguments").of(Arguments).me("parent")  # noqa: E731
_USED_BY = lambda r: r.name("used_by").of(Arguments).me("argument")  # noqa: E731


def _schema(kind: type[Term]) -> Schemas.OfObject.Data:
    """A kind's meta-schema: the tag, one property per native type its value may have, its properties, its value
    fields, and the adjacencies `arguments` (if it has arguments) and `used_by`."""
    natives = {**(kind.VALUE or {}), **kind.PROPERTIES}
    values = [lambda p, n=n, f=f: p.name(n).of(f.schema) for n, f in kind.VALUES.items()]
    relations = [_ARGUMENTS, _USED_BY] if kind.SLOTS or kind.VARIADIC is not None else [_USED_BY]
    return (Schemas.OfObject.Builder().ref().properties(_native("kind", str), *(_native(n, t) for n, t in natives.items()),
                                                        *values).relations(*relations).create())


# --- Dialects declared by their kinds ---

DIALECTS: list[Declared] = []
"""Every dialect declared so far, in declaration order."""


def register(store: Any) -> Any:
    """Registers the meta-schemas of every dialect declared so far in `store`, e.g. a `Proxies.OfStore` that writes and
    reads expressions of several dialects. Returns the store."""
    for dialect in DIALECTS:
        dialect.register(store)
    return store



class Declared:
    """A dialect declared by its kinds' data classes, from which it derives their builders (unless given), meta-schemas
    (named by `schema_names`, by default 'Expressions.<name>.Of<Kind>'), the union `Schema`, whose branches are named by
    the kinds' tags, the store `Builders` of its bound classes, `register(store)`, which registers its meta-schemas in
    another store, and `make`, `resolve`, `validate` and `infer`. `domain_of` gives a literal's domain."""

    def __init__(self, name: str, kinds: Sequence[type[Term]], *,
                 domain_of: Callable[[Native], Domains.Domain], builders: Mapping[str, type[Builder]] | None = None,
                 any_builder: type[AnyBuilder] | None = None, schema_names: Mapping[str, str] | None = None):
        self._name, self._domain_of = name, domain_of
        self._kinds = {kind.KIND: kind for kind in kinds}
        self.classes = tuple(kinds)
        builders = dict(builders or {})
        schemas: dict[str, Any] = {}
        registered: dict[str, type] = {}
        for kind in kinds:
            kind.DIALECT = self
            kind.NAME = (schema_names or {}).get(kind.KIND, f"Expressions.{name}.Of{kind.KIND.capitalize()}")
            kind.FIELDS = tuple(field.name for field in dataclasses.fields(kind))  # type: ignore[arg-type]
            builder = builders.get(kind.KIND) or type(f"{kind.__name__}Builder", (Builder,), {"_data": kind})
            kind.Schema = schemas[kind.NAME] = _schema(kind)  # type: ignore[attr-defined]
            kind.BINDING = _binding(kind)
            registered[kind.NAME] = builders[kind.KIND] = builder
        self.schemas = {ARGUMENTS: Arguments, **schemas}
        DIALECTS.append(self)
        self.builders = builders
        self.AnyBuilder = any_builder or type(f"{name}AnyBuilder", (AnyBuilder,), {})
        self.AnyBuilder._dialect = self
        self.Schema = Schemas.OfUnion.Builder().branches(
            *(lambda b, kind=kind: b.name(kind.KIND).of(kind.Schema) for kind in kinds)
        ).create()
        self.Builders = Bindings.OfStore({name: (schemas[name], builder) for name, builder in registered.items()},
                                         {ARGUMENTS: Arguments})

    def register(self, store: Any) -> Any:
        """Registers the dialect's meta-schemas, and the relation `Arguments` they share, in `store` (e.g. a
        `Proxies.OfStore`, to build expressions as proxies), skipping those it already holds. Returns the store."""
        for schema_name, schema in self.schemas.items():
            if schema_name not in store.names():
                store.register(schema_name, schema)
        return store

    def name(self) -> str:
        return self._name

    def kinds(self) -> Mapping[str, type[Term]]:
        return dict(self._kinds)

    def schema_of(self, expression: Any) -> Schemas.OfObject.Data:
        """The meta-schema of `expression`'s kind: the root schema for its snapshots."""
        if not isinstance(expression, self.classes):
            raise TypeError(f"not an expression: {expression!r}")
        return type(expression).Schema

    def __repr__(self) -> str:
        return f"<dialect {self._name}>"

    # Construction

    def make(self, form: Form) -> Any:
        if form.kind not in self._kinds:
            raise ValueError(f"{self._name} has no kind {form.kind!r}")
        kind = self._kinds[form.kind]
        allowed = [*(["value"] if kind.VALUE is not None else []), *kind.PROPERTIES, *kind.VALUES]
        for name in form.attributes:
            if name not in allowed:
                raise ValueError(f"{_article(kind.KIND)} has no attribute {name!r}")
        fields: dict[str, Any] = {name: form.attributes.get(name) for name in allowed}
        slots = len(kind.SLOTS)
        if kind.VARIADIC is None and len(form.arguments) != slots:
            raise ValueError(f"{_article(kind.KIND)} takes {slots} arguments, got {len(form.arguments)}")
        if len(form.arguments) < slots:
            raise ValueError(f"{_article(kind.KIND)} takes at least {slots} arguments, got {len(form.arguments)}")
        fields.update(zip(kind.SLOTS, form.arguments))
        if kind.VARIADIC is not None:
            fields[kind.VARIADIC] = tuple(form.arguments[slots:])
        return kind(**fields)

    def literal(self, value: Native) -> Any:
        """The literal holding `value`, of the first literal kind that can hold it."""
        name = _native_name(value)
        for kind in self.classes:
            if kind.ROLE == LITERAL and name in kind.VALUE:  # type: ignore[operator]
                return kind(value=value)  # type: ignore[call-arg]
        return None

    def resolve(self, spec: Any) -> Any:
        if _native_name(spec) is not None:
            made = self.literal(spec)
            if made is not None:
                return made
        return resolve(spec, self.classes, self.AnyBuilder, "an expression, a native value")

    # Checks

    def validate(self, expression: Any, bound: Iterable[str] = (), core: bool = False) -> list[str]:
        return self._problems(expression, frozenset(bound), core, set())

    def _problems(self, expression: Any, bound: frozenset[str], core: bool, active: set[int]) -> list[str]:
        """Problems with `expression`; `active` holds the expressions being checked, to find cycles."""
        if not isinstance(expression, self.classes):
            return [f"not an expression: {expression!r}"]
        kind = type(expression)
        what = _article(kind.KIND)
        if kind.ROLE == LITERAL:
            if expression.value is None:
                return [f"{what} needs a value"]
            try:
                _check_value(kind, expression.value)
            except TypeError as error:
                return [str(error)]
            return expression.check()
        problems = [p for name, native in kind.PROPERTIES.items()
                    if not (name in kind.OPTIONAL and getattr(expression, name) is None)
                    for p in _property_problems(what, name, native, getattr(expression, name))]
        problems += expression.check()
        name = name_of(expression)
        if kind.ROLE == REFERENCE:
            if kind.LEXICAL and not problems and name not in bound and name not in kind.AMBIENT:
                problems.append(f"{kind.KIND} {name!r} is not bound")
            return problems
        if id(expression) in active:
            return ["the expression contains a cycle"]
        active.add(id(expression))
        arguments = expression._arguments()
        scopes = [bound] * len(arguments)
        if kind.ROLE in (BINDING, QUANTIFIER):
            inner = bound | {name} if not problems else bound
            scopes = [bound, *[inner] * (len(arguments) - 1)]
        elif kind.ROLE == IMPORT:
            scopes = [bound | set(expression.binds()) if not problems else bound] * len(arguments)
        if kind.ROLE in (APPLICATION, QUANTIFIER) and not problems and kind.VOCABULARY is not None:
            operator, vocabulary = _operator(expression), kind.VOCABULARY
            if operator in vocabulary and vocabulary[operator].arity() not in (-1, len(arguments)):  # -1: any number
                problems.append(f"{operator} takes {vocabulary[operator].arity()} arguments, got {len(arguments)}")
            elif core and operator not in vocabulary:
                problems.append(f"{operator!r} is not a core operation")
        for i, (argument, scope) in enumerate(zip(arguments, scopes)):
            label = kind.SLOTS[i] if i < len(kind.SLOTS) else f"argument {i - len(kind.SLOTS)}"
            if argument is None:
                problems.append(f"{what} needs {_article(label)}")
            else:
                problems += [f"{label}: {problem}" for problem in self._problems(argument, scope, core, active)]
        active.discard(id(expression))
        return problems

    def infer(self, expression: Any, environment: Mapping[str, Domains.Domain] | None = None) -> Domains.Domain:
        environment = dict(environment or {})
        expression = self.resolve(expression)
        problems = self.validate(expression, environment)
        if problems:
            raise ValueError(f"cannot infer the domain of an invalid expression: {problems[0]}")
        return self._infer(expression, environment, {})

    def _infer(self, expression: Any, environment: dict[str, Domains.Domain],
               memo: dict[tuple[int, int], Domains.Domain]) -> Domains.Domain:
        key = (id(expression), id(environment))
        if key not in memo:
            memo[key] = self._infer_term(expression, environment, memo)
        return memo[key]

    def _infer_term(self, expression: Any, environment: dict[str, Domains.Domain],
                    memo: dict[tuple[int, int], Domains.Domain]) -> Domains.Domain:
        kind = type(expression)
        if kind.ROLE == LITERAL:
            return expression.typed() or self._domain_of(expression.value)
        if kind.ROLE == REFERENCE:
            name = name_of(expression)
            return environment[name] if kind.LEXICAL and name in environment else Domains.Anything
        arguments = expression._arguments()
        if kind.ROLE == IMPORT:
            inner = {**environment, **{name: Domains.Anything for name in expression.binds()}}
            return self._infer(arguments[-1], inner, memo)
        if kind.ROLE == BINDING:
            value = self._infer(arguments[0], environment, memo)
            inner = {**environment, name_of(expression): value}
            return self._infer(arguments[-1], inner, memo)
        operator = _operator(expression)
        signature = kind.SIGNATURE if kind.VOCABULARY is None else kind.VOCABULARY.get(operator)
        if kind.ROLE == QUANTIFIER:  # its name has the domain of the collection's items
            collection = self._infer(arguments[0], environment, memo)
            item = Domains.Anything if signature is None else signature.items(collection)  # type: ignore[attr-defined]
            inner = {**environment, name_of(expression): item}
            domains = [collection, *(self._infer(argument, inner, memo) for argument in arguments[1:])]
        else:
            domains = [self._infer(argument, environment, memo) for argument in arguments]
        if signature is None:
            return Domains.Anything  # an extension: nothing is known about it
        result = signature.result(domains)
        if result is None:
            names = ", ".join(domain.name() for domain in domains)
            raise TypeError(f"{operator} cannot take ({names}); it takes {signature.describe()}")
        typed = expression.typed()
        return result if typed is None else typed  # an application of a domain of its own gives it


def _property_problems(what: str, name: str, native: type, value: Any) -> list[str]:
    if value is None or value == "":
        return [f"{what} needs {_article(name)}"]
    if type(value) is not native:
        return [f"{what}'s {name} must be a {native.__name__}, got {_type_name(value)}"]
    return []


# --- Traversal ---


def _arguments_of(expression: Any) -> tuple[Any, ...]:
    return tuple(argument for argument in expression.form().arguments if argument is not None)


def walk(expression: Expression) -> Iterator[Any]:
    """Every expression reachable from `expression`, each once, parents before their arguments and arguments in
    order. Shared sub-expressions are visited once, and cycles end the walk rather than repeat it."""
    seen: set[int] = set()
    stack = [expression]
    while stack:
        node = stack.pop()
        if id(node) in seen:
            continue
        seen.add(id(node))
        yield node
        stack.extend(reversed(_arguments_of(node)))


def fold(expression: Expression, function: Callable[[Any, list[Any]], Any]) -> Any:
    """Combines an expression bottom-up: `function(node, results)` is called once per term, shared ones included, with
    the results for its arguments (None for empty slots). Raises on cycles."""
    memo: dict[int, Any] = {}
    active: set[int] = set()

    def visit(node: Any) -> Any:
        if id(node) in memo:
            return memo[id(node)]
        if id(node) in active:
            raise ValueError("the expression contains a cycle")
        active.add(id(node))
        results = [None if argument is None else visit(argument) for argument in node.form().arguments]
        active.discard(id(node))
        memo[id(node)] = function(node, results)
        return memo[id(node)]

    return visit(expression)


def _same_native(a: Any, b: Any) -> bool:
    """Natives of one type by value (NaN is NaN, -0.0 is not 0.0); a value field's data, such as a domain, by `==`."""
    if type(a) is not type(b):
        return False
    if type(a) is float:
        return (math.isnan(a) and math.isnan(b)) or (a == b and math.copysign(1.0, a) == math.copysign(1.0, b))
    return a == b


def same(a: Any, b: Any) -> bool:
    """Whether two expressions have the same structure: co-traverses them, comparing kinds, attributes (natives of
    one type by value; NaN is NaN, and -0.0 is not 0.0) and arguments in order. Sharing is not compared."""
    assumed: set[tuple[int, int]] = set()

    def visit(x: Any, y: Any) -> bool:
        if x is None or y is None:
            return x is y
        if (id(x), id(y)) in assumed:
            return True  # a cycle: the same if they are the same everywhere else
        assumed.add((id(x), id(y)))
        fx, fy = x.form(), y.form()
        return (type(x) is type(y) and fx.kind == fy.kind and fx.attributes.keys() == fy.attributes.keys()
                and all(_same_native(fx.attributes[k], fy.attributes[k]) for k in fx.attributes)
                and len(fx.arguments) == len(fy.arguments) and all(map(visit, fx.arguments, fy.arguments)))

    return visit(a, b)
