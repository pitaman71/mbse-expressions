"""Expressions: the protocols every dialect's expressions implement, and the machinery that implements them.

An expression language (a dialect) is a set of node kinds and a vocabulary of operators. Every dialect's expressions are:

- Serializable. Each kind has a meta-schema, an ordinary mbse-schemas object schema tagged by `kind`, and its data has a
  builder (`create()` / `clone()` / `update()`) that implements `Visitors.OfObject`. `Dialect.Builders` rebuilds data
  from snapshots and `Dialect.Schema` is the union of the kinds' meta-schemas.
- Structurally traversable. `Expression.form()` gives a node's `Form`: its kind, its native attributes and its ordered
  arguments, which are expressions of the same dialect. `Dialect.make(form)` is the inverse. `walk`, `fold` and `same`
  traverse any dialect's expressions through forms alone.
- Validatable. `Dialect.validate` reports what evaluation would raise, and `Dialect.infer` finds an expression's domain
  from its vocabulary's signatures (see `Domains`).
- Evaluatable, by the dialect's own evaluator (see `Evaluators`), and translatable to other dialects (see
  `Translators`).

A dialect declares each kind as a dataclass derived from `Node`, whose class variables say how its fields map to the
data model and what `role` it plays, and passes the classes to `Declared`, which derives the rest. The roles are:

- `LITERAL`: a native value, in the field `value`, written to the property named after its type (`int`, `str`, ...).
- `REFERENCE`: the value bound to the name in its first property.
- `APPLICATION`: an operator, named by the property `OPERATOR`, applied to arguments. A kind's `VOCABULARY` maps
  operator names to signatures; operators outside it are extensions, unless the vocabulary is `None`, when any name
  is accepted and `SIGNATURE` applies to all.
- `BINDING`: binds the name in its first property to its first argument within the others.

Arguments are fields too: `SLOTS` names fields holding one argument each, in index order, and `VARIADIC` names one
field holding a tuple of them. Both are written as entries of the adjacency `arguments`, to the relation `Arguments`
(registered as 'Expressions.Arguments' and shared by every dialect), which links a `parent` to an `argument` with an
`index`. Every kind also declares `used_by`, the same relation seen from the argument, which data never writes.
"""

from __future__ import annotations

import dataclasses
import math
from collections.abc import Callable, Hashable, Iterable, Iterator, Mapping, Sequence
from typing import Any, ClassVar, Protocol, runtime_checkable

from mbse.Schemas.Framework import Proxies, Schemas, Visitors
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = [
    "Form", "Expression", "Dialect", "Node", "Builder", "AnyBuilder", "Term", "Registry", "Declared",
    "LITERAL", "REFERENCE", "APPLICATION", "BINDING", "ARGUMENTS", "Arguments", "NATIVES",
    "walk", "fold", "same", "resolve",
]

LITERAL, REFERENCE, APPLICATION, BINDING = "literal", "reference", "application", "binding"
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


def _set(visitor: Any, name: str, value: Native) -> None:
    visitor.property(name, lambda p: p.value(lambda a: a.as_native(lambda n: n.set(value))))


# --- Protocols ---


@dataclasses.dataclass(frozen=True)
class Form:
    """A node's structure: its `kind`, its native `attributes` by name, and its ordered `arguments` (None where a slot
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
    Builders: Registry

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
        """The expression a spec denotes: an expression, a `Term`, a native value (a literal) or a callable taking the
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


class Node:
    """Shared by every kind's data (a dataclass per kind): identity, schema name, writing through `accept`, and the
    structural view. `Declared` sets `DIALECT`, `NAME` and `FIELDS`."""

    DIALECT: ClassVar[Declared]
    NAME: ClassVar[str]
    FIELDS: ClassVar[tuple[str, ...]]
    KIND: ClassVar[str]
    ROLE: ClassVar[str]
    VALUE: ClassVar[Mapping[str, type] | None] = None
    PROPERTIES: ClassVar[Mapping[str, type]] = {}
    SLOTS: ClassVar[tuple[str, ...]] = ()
    VARIADIC: ClassVar[str | None] = None
    OPERATOR: ClassVar[str | None] = None
    VOCABULARY: ClassVar[Mapping[str, Domains.Signature] | None] = None
    SIGNATURE: ClassVar[Domains.Signature | None] = None

    def identity(self) -> Hashable:
        return id(self)

    def schema_name(self) -> str:
        return self.NAME

    def dialect(self) -> Declared:
        return self.DIALECT

    def accept(self, visitor: Visitors.OfObject) -> None:
        """Writes the tag, the value into the property named after its native type, the other properties, then one
        `arguments` entry per argument, in order, with its index."""
        _set(visitor, "kind", self.KIND)
        if self.VALUE is not None and self.value is not None:  # type: ignore[attr-defined]
            _set(visitor, _check_value(type(self), self.value), self.value)  # type: ignore[attr-defined]
        for name in self.PROPERTIES:
            if getattr(self, name) is not None:
                _set(visitor, name, getattr(self, name))
        for index, argument in enumerate(self._arguments()):
            if argument is not None:
                _write_argument(visitor, index, argument)

    def _arguments(self) -> tuple[Any, ...]:
        if self.VARIADIC is not None:
            return tuple(getattr(self, self.VARIADIC))
        return tuple(getattr(self, slot) for slot in self.SLOTS)

    def form(self) -> Form:
        attributes = {"value": self.value} if self.VALUE is not None and self.value is not None else {}  # type: ignore
        attributes.update({n: getattr(self, n) for n in self.PROPERTIES if getattr(self, n) is not None})
        return Form(self.KIND, attributes, self._arguments())

    def validate(self, bound: Iterable[str] = (), core: bool = False) -> list[str]:
        """Problems with this expression. References must be bound by an enclosing binding or be in `bound`. With
        `core`, every operator must be in its kind's vocabulary."""
        return self.DIALECT.validate(self, bound, core)


def _check_value(kind: type[Node], value: Any) -> str:
    """The property that holds a literal's value; raises if the kind cannot hold it."""
    name = _native_name(value)
    if name is None:
        raise TypeError(f"{_article(kind.KIND)} must hold a native value, got {_type_name(value)}")
    if name not in kind.VALUE:  # type: ignore[operator]
        raise TypeError(f"{_article(kind.KIND)} cannot hold a {name}")
    return name


def _write_argument(visitor: Visitors.OfObject, index: int, argument: Any) -> None:
    def fill(entry: Visitors.OfEntry) -> None:
        entry.link("argument", lambda k: k.set(argument))
        _set(entry, "index", index)

    visitor.adjacency("arguments", lambda a: a.add(fill))


# --- Builders: Visitors that build Data ---


class _Field:
    """`Visitors.OfProperty`, `OfAny` and `OfNative` over one native-typed field of a builder."""

    def __init__(self, name: str, native: type[Native], read: Callable[[], Any], write: Callable[[Any], None]):
        self._name, self._native, self._read, self._write = name, native, read, write

    def name(self) -> str:
        return self._name

    def has(self) -> bool:
        return type(self._read()) is self._native

    def get(self) -> Native:
        if not self.has():
            raise AttributeError(f"property {self._name!r} is not set")
        return self._read()

    def set(self, value: Native) -> _Field:
        if type(value) is not self._native:
            raise TypeError(f"expected {self._native.__name__}, got {_type_name(value)}")
        self._write(value)
        return self

    def clear(self) -> _Field:
        if self.has():
            self._write(None)
        return self

    def value(self, callback: Callable[[Visitors.OfAny], Any]) -> _Field:
        callback(self)
        return self

    def as_native(self, callback: Callable[[Visitors.OfNative], Any]) -> _Field:
        callback(self)
        return self

    def as_object(self, callback: Callable[[Visitors.OfObject], Any]) -> _Field:
        raise TypeError(f"property {self._name!r} is native")

    def as_union(self, callback: Callable[[Visitors.OfUnion], Any]) -> _Field:
        raise TypeError(f"property {self._name!r} is native")

    def as_intersection(self, callback: Callable[[Visitors.OfIntersection], Any]) -> _Field:
        raise TypeError(f"property {self._name!r} is native")


class _Link:
    """`Visitors.OfLink` over the one link an argument entry sets."""

    def __init__(self, entry: _Argument):
        self._entry = entry

    def name(self) -> str:
        return self._entry.other

    def target(self, callback: Callable[[Visitors.Visitable], Any]) -> _Link:
        if self._entry.target is None:
            raise ValueError(f"link {self._entry.other!r} is not set")
        callback(self._entry.target)
        return self

    def set(self, target: Visitors.Visitable) -> _Link:
        self._entry.target = target
        return self


class _Argument:
    """`Visitors.OfEntry` for one entry of `Arguments`, seen from the end that fills `me`: it sets the other link and
    the `index`."""

    def __init__(self, me: str, target: Any = None, index: int | None = None):
        self.other = "argument" if me == "parent" else "parent"
        self.target, self.index = target, index

    def _index(self) -> _Field:
        return _Field("index", int, lambda: self.index, lambda value: setattr(self, "index", value))

    def links(self, callback: Callable[[Visitors.OfLink], Any]) -> _Argument:
        callback(_Link(self))
        return self

    def link(self, name: str, callback: Callable[[Visitors.OfLink], Any]) -> _Argument:
        if name != self.other:
            raise KeyError(f"{name!r} is not a link this entry can set")
        callback(_Link(self))
        return self

    def properties(self, callback: Callable[[Visitors.OfProperty], Any]) -> _Argument:
        if self.index is not None:
            callback(self._index())
        return self

    def has(self, name: str) -> bool:
        return name == "index" and self.index is not None

    def property(self, name: str, callback: Callable[[Visitors.OfProperty], Any]) -> _Argument:
        if name != "index":
            raise KeyError(f"unknown property {name!r}")
        callback(self._index())
        return self

    def clear(self, name: str) -> _Argument:
        if name == "index":
            self.index = None
        return self


class _Adjacency:
    """`Visitors.OfAdjacency` over a parent's `arguments`, or over `used_by`, whose entries are ignored (the parents'
    arguments imply them)."""

    def __init__(self, name: str, me: str, entries: list[_Argument] | None):
        self._name, self._me, self._entries = name, me, entries

    def name(self) -> str:
        return self._name

    def me(self) -> str:
        return self._me

    def entries(self, callback: Callable[[Visitors.OfEntry], Any]) -> _Adjacency:
        for entry in list(self._entries or []):
            callback(entry)
        return self

    def add(self, callback: Callable[[Visitors.OfEntry], Any]) -> _Adjacency:
        entry = _Argument(self._me)
        callback(entry)
        if self._entries is not None:
            self._entries.append(entry)
        return self

    def remove(self, entry: Visitors.OfEntry) -> _Adjacency:
        if self._entries is not None:
            self._entries[:] = [e for e in self._entries if e is not entry]
        return self


def _slots_message(kind: type[Node], index: Any) -> str:
    """E.g. "a let's value is argument 0 and its body argument 1, got index 2"."""
    parts = [f"{slot} is argument 0" if i == 0 else f"its {slot} argument {i}" for i, slot in enumerate(kind.SLOTS)]
    listed = parts[0] if len(parts) == 1 else f"{', '.join(parts[:-1])} and {parts[-1]}"
    return f"{_article(kind.KIND)}'s {listed}, got index {index}"


class Builder:
    """Shared by every kind's builder: `create()` / `clone()` / `update()` with the rules and messages of every
    builder, and `Visitors.OfObject` over the tag `kind`, the kind's native properties and its `arguments` entries.
    None of them validate. DSL: `.set(name, native)` sets a property ('value' is a literal's value),
    `.arguments(*specs)` appends arguments to a variadic kind and `.argument(slot, spec)` fills a slot; specs are
    resolved by the dialect."""

    _data: ClassVar[type[Node]]

    def __init__(self, instance: Any = None):
        if instance is not None and type(instance) is not self._data:
            raise TypeError(f"expected {self._data.KIND} data to build from, got {_type_name(instance)}")
        self._source = instance
        self._value: Any = None
        self._values: dict[str, Any] = {}
        self._arguments: list[_Argument] = []
        if instance is not None:
            self._value = instance.value if self._data.VALUE is not None else None
            self._values = {name: getattr(instance, name) for name in self._data.PROPERTIES}
            self._arguments = [_Argument("parent", argument, index)
                               for index, argument in enumerate(instance._arguments()) if argument is not None]

    # DSL

    def set(self, name: str, value: Native) -> Any:
        if name == "value" and self._data.VALUE is not None:
            self._value = value
        elif name in self._data.PROPERTIES:
            self._values[name] = value
        else:
            raise KeyError(f"{_article(self._data.KIND)} has no attribute {name!r}")
        return self

    def arguments(self, *specs: Any) -> Any:
        if self._data.VARIADIC is None:
            raise TypeError(f"{_article(self._data.KIND)} has no variadic arguments")
        for spec in specs:
            self._arguments.append(_Argument("parent", self._data.DIALECT.resolve(spec), len(self._arguments)))
        return self

    def argument(self, slot: str, spec: Any) -> Any:
        if slot not in self._data.SLOTS:
            raise KeyError(f"{_article(self._data.KIND)} has no argument {slot!r}")
        index = self._data.SLOTS.index(slot)
        self._arguments = [entry for entry in self._arguments if entry.index != index]
        self._arguments.append(_Argument("parent", self._data.DIALECT.resolve(spec), index))
        return self

    # Finalizing

    def create(self) -> Any:
        if self._source is not None:
            raise ValueError("create() is only valid without a source instance; use clone() or update()")
        return self._make()

    def clone(self) -> Any:
        if self._source is None:
            raise ValueError("clone() is only valid with a source instance")
        return self._make()

    def update(self) -> Any:
        if self._source is None:
            raise ValueError("update() is only valid with a source instance")
        made = self._make()
        for name in self._data.FIELDS:
            setattr(self._source, name, getattr(made, name))
        return self._source

    def _check_target(self, entry: _Argument) -> Any:
        if entry.target is None:
            raise ValueError("link 'argument' is not set")
        if not isinstance(entry.target, self._data.DIALECT.classes):
            raise TypeError(f"an argument must be an expression, got {_type_name(entry.target)}")
        return entry.target

    def _make(self) -> Any:
        kind = self._data
        fields: dict[str, Any] = dict(self._values)
        if kind.VALUE is not None:
            fields["value"] = self._value
        if kind.VARIADIC is not None:
            last = len(self._arguments)
            ordered = sorted(self._arguments, key=lambda entry: last if entry.index is None else entry.index)
            fields[kind.VARIADIC] = tuple(self._check_target(entry) for entry in ordered)
        else:
            parts: list[Any] = [None] * len(kind.SLOTS)
            for entry in self._arguments:
                if entry.index not in range(len(kind.SLOTS)):
                    raise ValueError(_slots_message(kind, entry.index))
                parts[entry.index] = self._check_target(entry)
            fields.update(zip(kind.SLOTS, parts))
        return kind(**fields)

    # Visitors.OfObject

    def _check_kind(self, kind: Any) -> None:
        if kind is not None and kind != self._data.KIND:
            raise ValueError(f"expected kind {self._data.KIND!r}, got {kind!r}")

    def _names(self) -> list[str]:
        return ["kind", *(self._data.VALUE or {}), *self._data.PROPERTIES]

    def _field(self, name: str) -> _Field:
        if name == "kind":
            return _Field("kind", str, lambda: self._data.KIND, self._check_kind)
        if name in self._data.PROPERTIES:
            return _Field(name, self._data.PROPERTIES[name], lambda: self._values.get(name),
                          lambda value: self._values.__setitem__(name, value))
        return _Field(name, self._data.VALUE[name], lambda: self._value,  # type: ignore[index]
                      lambda value: setattr(self, "_value", value))

    def properties(self, callback: Callable[[Visitors.OfProperty], Any]) -> Builder:
        for name in self._names():
            if self.has(name):
                callback(self._field(name))
        return self

    def has(self, name: str) -> bool:
        return name == "kind" or (name in self._names() and self._field(name).has())

    def property(self, name: str, callback: Callable[[Visitors.OfProperty], Any]) -> Builder:
        if name not in self._names():
            raise KeyError(f"unknown property {name!r}")
        callback(self._field(name))
        return self

    def clear(self, name: str) -> Builder:
        if name != "kind" and name in self._names():
            self._field(name).clear()
        return self

    def _parent(self) -> bool:
        return bool(self._data.SLOTS) or self._data.VARIADIC is not None

    def adjacencies(self, callback: Callable[[Visitors.OfAdjacency], Any]) -> Builder:
        for name in ["arguments", "used_by"] if self._parent() else ["used_by"]:
            self.adjacency(name, callback)
        return self

    def adjacency(self, name: str, callback: Callable[[Visitors.OfAdjacency], Any]) -> Builder:
        if name == "arguments" and self._parent():
            callback(_Adjacency("arguments", "parent", self._arguments))
        elif name == "used_by":
            callback(_Adjacency("used_by", "argument", None))
        else:
            raise KeyError(f"unknown adjacency {name!r}")
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


class Term:
    """An expression written with methods; each dialect derives its own. A `Term` is a spec; `.data` is its
    expression."""

    __slots__ = ("data",)

    def __init__(self, data: Any):
        self.data = data


def resolve(spec: Any, data: type | tuple[type, ...], builder: Callable[[], Any], expected: str) -> Any:
    """Resolves a spec: data is used as is, a `Term` gives its data, and a callable is given a new builder and must
    return it."""
    if isinstance(spec, Term):
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


# --- Meta-schemas and the registry ---


def _native(name: str, native: type) -> Callable[[Any], Any]:
    return lambda p: p.name(name).of(lambda t: t.as_native(native))


Arguments = (
    Schemas.OfRelation.Builder().links("parent", "argument").properties(_native("index", int)).unique("argument")
    .create()
)
Proxies.register(ARGUMENTS, Arguments)
_ARGUMENTS = lambda r: r.name("arguments").of(Arguments).me("parent")  # noqa: E731
_USED_BY = lambda r: r.name("used_by").of(Arguments).me("argument")  # noqa: E731


def _schema(kind: type[Node]) -> Schemas.OfObject.Data:
    """A kind's meta-schema: the tag, one property per native type its value may have, its properties, and the
    adjacencies `arguments` (if it has arguments) and `used_by`."""
    natives = {**(kind.VALUE or {}), **kind.PROPERTIES}
    relations = [_ARGUMENTS, _USED_BY] if kind.SLOTS or kind.VARIADIC is not None else [_USED_BY]
    return (Schemas.OfObject.Builder().properties(_native("kind", str), *(_native(n, t) for n, t in natives.items()))
            .relations(*relations).create())


class Registry:
    """Builds a dialect's expressions from snapshots: `getattr(registry, 'Expressions.OfLiteral')(instance)` returns a
    builder, as `Plain.FromPlain` expects. `schema` and `name_of` look the meta-schemas up."""

    def __init__(self, schemas: Mapping[str, Any], builders: Mapping[str, type]):
        self._schemas = {**schemas, ARGUMENTS: Arguments}
        for name, builder in builders.items():
            setattr(self, name, builder)

    def schema(self, name: str) -> Schemas.OfObject.Data:
        if name == ARGUMENTS:
            raise TypeError(f"{name!r} is a relation; no relation builder is exposed")
        if name not in self._schemas:
            raise AttributeError(f"no schema registered as {name!r}")
        return self._schemas[name]

    def name_of(self, schema: Any) -> str:
        for name, registered in self._schemas.items():
            if registered is schema:
                return name
        raise LookupError("schema is not registered")


# --- Dialects declared by their kinds ---


class Declared:
    """A dialect declared by its kinds' data classes, from which it derives their builders (unless given), meta-schemas
    (registered with `Proxies` as `schema_names`, by default 'Expressions.<name>.Of<Kind>'), the union `Schema`,
    discriminated by `discriminator(tag)`, the registry `Builders`, and `make`, `resolve`, `validate` and `infer`.
    `domain_of` gives a literal's domain. The union's predicates are evaluated by mbse-schemas' validators with the
    Basic dialect's `Evaluators.predicate`, so `discriminator` returns a Basic expression."""

    def __init__(self, name: str, kinds: Sequence[type[Node]], *, discriminator: Callable[[str], Any],
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
            registered[kind.NAME] = builders[kind.KIND] = builder
        for schema_name, schema in schemas.items():
            Proxies.register(schema_name, schema)
        self.builders = builders
        self.AnyBuilder = any_builder or type(f"{name}AnyBuilder", (AnyBuilder,), {})
        self.AnyBuilder._dialect = self
        self.Schema = Schemas.OfUnion.Builder().branches(
            *(lambda b, kind=kind: b.of(kind.Schema).when(discriminator(kind.KIND)) for kind in kinds)
        ).create()
        self.Builders = Registry(schemas, registered)

    def name(self) -> str:
        return self._name

    def kinds(self) -> Mapping[str, type[Node]]:
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
        allowed = [*(["value"] if kind.VALUE is not None else []), *kind.PROPERTIES]
        for name in form.attributes:
            if name not in allowed:
                raise ValueError(f"{_article(kind.KIND)} has no attribute {name!r}")
        fields: dict[str, Any] = {name: form.attributes.get(name) for name in allowed}
        if kind.VARIADIC is not None:
            fields[kind.VARIADIC] = tuple(form.arguments)
        elif len(form.arguments) != len(kind.SLOTS):
            raise ValueError(f"{_article(kind.KIND)} takes {len(kind.SLOTS)} arguments, got {len(form.arguments)}")
        else:
            fields.update(zip(kind.SLOTS, form.arguments))
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
            return []
        problems = [p for name, native in kind.PROPERTIES.items()
                    for p in _property_problems(what, name, native, getattr(expression, name))]
        name = getattr(expression, next(iter(kind.PROPERTIES)), None) if kind.PROPERTIES else None
        if kind.ROLE == REFERENCE:
            if not problems and name not in bound:
                problems.append(f"{kind.KIND} {name!r} is not bound")
            return problems
        if id(expression) in active:
            return ["the expression contains a cycle"]
        active.add(id(expression))
        arguments = expression._arguments()
        scopes = [bound] * len(arguments)
        if kind.ROLE == BINDING:
            inner = bound | {name} if not problems else bound
            scopes = [bound, *[inner] * (len(arguments) - 1)]
        elif not problems and kind.VOCABULARY is not None:
            operator, vocabulary = getattr(expression, kind.OPERATOR), kind.VOCABULARY  # type: ignore[arg-type]
            if operator in vocabulary and vocabulary[operator].arity() != len(arguments):
                problems.append(f"{operator} takes {vocabulary[operator].arity()} arguments, got {len(arguments)}")
            elif core and operator not in vocabulary:
                problems.append(f"{operator!r} is not a core operation")
        for i, (argument, scope) in enumerate(zip(arguments, scopes)):
            label = f"argument {i}" if kind.VARIADIC is not None else kind.SLOTS[i]
            if argument is None:
                problems.append(f"{what} needs a {label}")
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
            memo[key] = self._infer_node(expression, environment, memo)
        return memo[key]

    def _infer_node(self, expression: Any, environment: dict[str, Domains.Domain],
                    memo: dict[tuple[int, int], Domains.Domain]) -> Domains.Domain:
        kind = type(expression)
        if kind.ROLE == LITERAL:
            return self._domain_of(expression.value)
        if kind.ROLE == REFERENCE:
            return environment[getattr(expression, next(iter(kind.PROPERTIES)))]
        arguments = expression._arguments()
        if kind.ROLE == BINDING:
            value = self._infer(arguments[0], environment, memo)
            inner = {**environment, getattr(expression, next(iter(kind.PROPERTIES))): value}
            return self._infer(arguments[-1], inner, memo)
        domains = [self._infer(argument, environment, memo) for argument in arguments]
        operator = getattr(expression, kind.OPERATOR)  # type: ignore[arg-type]
        signature = kind.SIGNATURE if kind.VOCABULARY is None else kind.VOCABULARY.get(operator)
        if signature is None:
            return Domains.Anything  # an extension: nothing is known about it
        result = signature.result(domains)
        if result is None:
            names = ", ".join(domain.name() for domain in domains)
            raise TypeError(f"{operator} cannot take ({names}); it takes {signature.describe()}")
        return result


def _property_problems(what: str, name: str, native: type, value: Any) -> list[str]:
    if value is None or value == "":
        return [f"{what} needs a {name}"]
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
    """Combines an expression bottom-up: `function(node, results)` is called once per node, shared ones included, with
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
