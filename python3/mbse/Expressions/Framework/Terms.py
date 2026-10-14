"""Terms: the protocols every dialect's expressions implement, and the machinery that implements them.

An expression language (a dialect) is a set of term kinds and a vocabulary of operators. Every dialect's expressions are:

- Values. Each kind has a meta-schema, an ordinary mbse-schemas value object schema, and an expression is a value of
  its kind's: `reader()` gives it as one (a `Readers.OfObject`), which serializers, validation and comparison read as
  any value, and `Dialect.term(value)` rebuilds an expression from one. `Dialect.store`, a store of proxies holding the
  meta-schemas, is where these values are built; `Dialect.register(store)` registers the meta-schemas in any other
  store; and `Dialect.Schema` is the union of the kinds' meta-schemas. Each kind's data has a builder
  (`create()` / `clone()` / `update()`) with a DSL.
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

An expression is a value, written nested in what holds it: its meta-schema has one property per native type its value
may have (a literal's), its properties, its value properties, and `arguments`, a dense container of its arguments by
index, each a value of any type (`ARGUMENT`), which the wire tags with its kind's meta-schema's registered name, since a
dialect's terms hold its extensions' and its extensions' meta-schemas are registered in its store too. Arguments are
fields: `SLOTS` names fields holding one argument each, in index order, and `VARIADIC` names one field holding a tuple
of the arguments after the slots.

A slot named in `REFERS` holds a definition the term refers to, such as the predicate an application applies, not a
part of it. Its value refers to the definition by name, as a module names a schema, since nothing links a value: the
slot is written as a str property holding the definition's name (`name_of`), not in `arguments`, and read back as that
name, which whatever holds the definitions resolves. A definition may refer to itself, through such a slot, directly
or not: that is recursion, not a cycle, and checking stops where it reaches a definition it is already checking. Any
other cycle is a problem, and an expression with one has no value.
"""

from __future__ import annotations

import dataclasses
import math
from collections.abc import Callable, Iterable, Iterator, Mapping, Sequence
from typing import Any, ClassVar, Protocol, runtime_checkable

from mbse.Schemas.Framework import Plain, Proxies, Readers, Schemas
from mbse.Schemas.Framework.Visitors import Scalar as Native

from . import Domains

__all__ = [
    "Form", "Expression", "Dialect", "Term", "Builder", "AnyBuilder", "Writer", "Declared", "ValueProperty",
    "LITERAL", "REFERENCE", "APPLICATION", "BINDING", "IMPORT", "QUANTIFIER", "ARGUMENT", "NATIVES",
    "walk", "fold", "same", "resolve", "name_of",
]

LITERAL, REFERENCE, APPLICATION, BINDING, IMPORT = "literal", "reference", "application", "binding", "import"
QUANTIFIER = "quantifier"
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


Form = Schemas.Form.Data
"""A term's structure: its `kind`, its native `attributes` by name, and its ordered `arguments` (None where a slot is
empty). It is mbse-schemas' neutral form of a term, which a schema holds where a literal would stand."""


@runtime_checkable
class Expression(Protocol):
    """An expression of some dialect: a value of its kind's meta-schema, read through `reader()` as any value is, and
    structurally traversable."""

    def dialect(self) -> Dialect: ...

    def form(self) -> Form: ...

    def reader(self) -> Readers.OfObject: ...

    def validate(self, bound: Iterable[str] = (), core: bool = False) -> list[str]: ...


@runtime_checkable
class Dialect(Protocol):
    """An expression language: its kinds, their meta-schemas and builders, and its static checks."""

    Schema: Schemas.OfUnion.Data
    store: Proxies.OfStore

    def name(self) -> str: ...

    def kinds(self) -> Mapping[str, type]:
        """The data class of each kind, by tag."""
        ...

    def schema_of(self, expression: Any) -> Schemas.OfObject.Data:
        """The meta-schema of `expression`'s kind, which its value is of."""
        ...

    def term(self, value: Readers.OfObject) -> Expression:
        """The expression a value of one of its kinds' meta-schemas holds, such as one read from JSON."""
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
    """Shared by every kind's data (a dataclass per kind): schema name, its value through `reader()`, and the
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
    REFERS: ClassVar[frozenset[str]] = frozenset()
    VARIADIC: ClassVar[str | None] = None
    OPERATOR: ClassVar[str | None] = None
    VOCABULARY: ClassVar[Mapping[str, Domains.Signature] | None] = None
    SIGNATURE: ClassVar[Domains.Signature | None] = None
    VALUES: ClassVar[Mapping[str, ValueProperty]] = {}
    Schema: ClassVar[Schemas.OfObject.Data]

    def schema_name(self) -> str:
        return self.NAME

    def dialect(self) -> Declared:
        return self.DIALECT

    def reader(self) -> Readers.OfObject:
        """This expression as a value of its kind's meta-schema, a standalone value in its dialect's `store`, which
        serializers, validation and comparison read as any value. Built anew from its plain form, which the store
        checks against the meta-schema: an expression that does not fit it raises `DecodeError`, a cycle `ValueError`."""
        return Plain.FromPlain(self.DIALECT.store).Value(type(self).Schema, _plain(self, set()))

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


# --- Values: a term as an mbse-schemas value of its meta-schema ---


def _scalar(value: Any) -> Any:
    """A native's plain form; anything else as itself, for decoding to refuse with its path."""
    return Schemas.OfScalar.Data(type(value)).to_plain(value) if type(value) in Schemas.SCALAR_TYPES else value


def _native_of(native: type, plain: Any) -> Any:
    return None if plain is None else Schemas.OfScalar.Data(native).from_plain(plain)


def _written(term: Term) -> tuple[Any, ...]:
    """The arguments written in `arguments`, in order: the slots but those that refer, then the variadic ones."""
    kind = type(term)
    fixed = tuple(getattr(term, slot) for slot in kind.SLOTS if slot not in kind.REFERS)
    return fixed + tuple(getattr(term, kind.VARIADIC)) if kind.VARIADIC is not None else fixed


def _holds_arguments(kind: type[Term]) -> bool:
    return any(slot not in kind.REFERS for slot in kind.SLOTS) or kind.VARIADIC is not None


def _definition(definition: Any) -> Any:
    """The name a slot that refers writes: a definition's name, or the name it already holds."""
    return definition if isinstance(definition, str) else name_of(definition)


def _plain(term: Term, active: set[int]) -> dict[str, Any]:
    """A term's plain form, nested as its meta-schema writes it: its value under the property named after its native
    type, its other properties, the names of the definitions it refers to, its value properties' plain forms, and its
    arguments, each tagged with its kind's meta-schema's name (null for an empty slot)."""
    if id(term) in active:
        raise ValueError("the expression contains a cycle")
    active.add(id(term))
    kind = type(term)
    out: dict[str, Any] = {}
    if kind.VALUE is not None and term.value is not None:  # type: ignore[attr-defined]
        out[_check_value(kind, term.value)] = _scalar(term.value)  # type: ignore[attr-defined]
    out.update({name: _scalar(getattr(term, name)) for name in kind.PROPERTIES if getattr(term, name) is not None})
    out.update({slot: _definition(getattr(term, slot)) for slot in kind.REFERS if getattr(term, slot) is not None})
    out.update({name: field.to_plain(getattr(term, name)) for name, field in kind.VALUES.items()
                if getattr(term, name) is not None})
    arguments = _written(term)
    if any(argument is not None for argument in arguments):
        out["arguments"] = [None if argument is None else {argument.NAME: _plain(argument, active)}
                            for argument in arguments]
    active.discard(id(term))
    return out


def _from_plain(dialect: Declared, kind: type[Term], plain: Mapping[str, Any]) -> Any:
    """The term of `kind` a plain form holds, its arguments of the kinds their tags name."""
    fields: dict[str, Any] = {}
    if kind.VALUE is not None:
        fields["value"] = next((_native_of(native, plain[name]) for name, native in kind.VALUE.items() if name in plain),
                               None)
    fields.update({name: _native_of(native, plain.get(name)) for name, native in kind.PROPERTIES.items()})
    fields.update({slot: plain.get(slot) for slot in kind.REFERS})
    fields.update({name: None if plain.get(name) is None else field.from_plain(plain[name])
                   for name, field in kind.VALUES.items()})
    named = {term.NAME: term for term in dialect.terms()}
    arguments = [None if item is None else _tagged(dialect, named, item) for item in plain.get("arguments", [])]
    slots = [slot for slot in kind.SLOTS if slot not in kind.REFERS]
    fields.update({slot: arguments[i] if i < len(arguments) else None for i, slot in enumerate(slots)})
    if kind.VARIADIC is not None:
        fields[kind.VARIADIC] = tuple(arguments[len(slots):])
    return kind(**fields)


def _tagged(dialect: Declared, named: Mapping[str, type[Term]], item: Mapping[str, Any]) -> Any:
    ((tag, held),) = item.items()
    return _from_plain(dialect, named[tag], held)


# --- Builders ---


class Builder:
    """A kind's builder: `create()`, or `clone()` and `update()` of a source term, none of which validate, with the
    DSL: `.set(name, native)` sets a property ('value' is a literal's value), `.arguments(*specs)` appends arguments to
    a variadic kind and `.argument(slot, spec)` fills a slot; specs are resolved by the dialect. A term's value is
    built through its dialect's `store`, as any value is."""

    _data: ClassVar[type[Term]]

    def __init__(self, instance: Any = None):
        if instance is not None and type(instance) is not self._data:
            raise TypeError(f"expected {self._data.KIND} data to build from, got {_type_name(instance)}")
        self._source = instance
        kind = self._data
        self._fields: dict[str, Any] = (
            {name: getattr(instance, name) for name in kind.FIELDS} if instance is not None
            else {field.name: () if field.name == kind.VARIADIC else None
                  for field in dataclasses.fields(kind)})  # type: ignore[arg-type]

    # DSL

    def set(self, name: str, value: Any) -> Any:
        kind = self._data
        if not (name == "value" and kind.VALUE is not None or name in kind.PROPERTIES or name in kind.VALUES):
            raise KeyError(f"{_article(kind.KIND)} has no attribute {name!r}")
        self._fields[name] = value
        return self

    def arguments(self, *specs: Any) -> Any:
        if self._data.VARIADIC is None:
            raise TypeError(f"{_article(self._data.KIND)} has no variadic arguments")
        variadic = self._data.VARIADIC
        self._fields[variadic] = (*self._fields[variadic], *(self._data.DIALECT.resolve(spec) for spec in specs))
        return self

    def argument(self, slot: str, spec: Any) -> Any:
        if slot not in self._data.SLOTS:
            raise KeyError(f"{_article(self._data.KIND)} has no argument {slot!r}")
        self._fields[slot] = self._data.DIALECT.resolve(spec)
        return self

    # Finalizing

    def create(self) -> Any:
        if self._source is not None:
            raise ValueError("create() is only valid without a source instance; use clone() or update()")
        return self._data(**self._fields)

    def clone(self) -> Any:
        """A new term of the fields built; arguments are shared, not copied."""
        if self._source is None:
            raise ValueError("clone() is only valid with a source instance")
        return self._data(**self._fields)

    def update(self) -> Any:
        if self._source is None:
            raise ValueError("update() is only valid with a source instance")
        made = self._data(**self._fields)  # as its class makes it, then into the source
        for name in self._data.FIELDS:
            setattr(self._source, name, getattr(made, name))
        return self._source


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
    return lambda p: p.name(name).of(Schemas.OfScalar.Data(native))


ARGUMENT = Schemas.OfAny.Builder().create()
"""An argument's schema: a value of any type, an expression of any dialect, which the wire tags with its kind's
meta-schema's registered name, since a dialect's terms hold its extensions'."""


def _schema(kind: type[Term]) -> Schemas.OfObject.Data:
    """A kind's meta-schema, a value object schema: one property per native type its value may have, its properties,
    the name of each definition it refers to, its value properties, and `arguments` (if it has arguments), a dense
    container of them by index."""
    natives = {**(kind.VALUE or {}), **kind.PROPERTIES, **dict.fromkeys(sorted(kind.REFERS, key=kind.SLOTS.index), str)}
    values = [lambda p, n=n, f=f: p.name(n).of(f.schema) for n, f in kind.VALUES.items()]
    arguments = [lambda p: p.name("arguments").of(Schemas.OfContainer.Builder().index(Schemas.OfScalar.Data(int))
                                                  .element(ARGUMENT).create())] if _holds_arguments(kind) else []
    return (Schemas.OfObject.Builder().name(kind.NAME).properties(
        *(_native(n, t) for n, t in natives.items()), *values, *arguments).create())


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
    the kinds' tags, `store`, a store of proxies holding the meta-schemas of the kinds it accepts (`terms()`), in which
    an expression's value is built and from which `term(value)` rebuilds one, `register(store)`, which registers its
    meta-schemas in another store, and `make`, `resolve`, `validate` and `infer`. `domain_of` gives a literal's domain.

    A dialect may extend another, `extends`: its kinds are the base's and its own, whose tags must differ from the base's,
    so every expression of the base is one of the extension, and the extension validates, infers and evaluates trees
    that mix them. The base accepts its extensions' terms as arguments (in specs, writers and snapshots), so that a
    base's writer can hold an extension's term; such a tree is the extension's to validate and evaluate."""

    def __init__(self, name: str, kinds: Sequence[type[Term]], *,
                 domain_of: Callable[[Native], Domains.Domain], builders: Mapping[str, type[Builder]] | None = None,
                 any_builder: type[AnyBuilder] | None = None, schema_names: Mapping[str, str] | None = None,
                 extends: Declared | None = None):
        self._name, self._domain_of = name, domain_of
        self.base, self.extensions = extends, []
        inherited = {} if extends is None else extends.kinds()
        clashes = sorted(kind.KIND for kind in kinds if kind.KIND in inherited)
        if clashes:
            raise ValueError(f"{name} would declare {', '.join(map(repr, clashes))}, which {extends.name()} has")  # type: ignore[union-attr]
        self._kinds = {**inherited, **{kind.KIND: kind for kind in kinds}}
        self.classes = (*(() if extends is None else extends.classes), *kinds)
        builders = {**({} if extends is None else extends.builders), **dict(builders or {})}
        schemas: dict[str, Any] = {} if extends is None else dict(extends.schemas)
        for kind in kinds:
            kind.DIALECT = self
            kind.NAME = (schema_names or {}).get(kind.KIND, f"Expressions.{name}.Of{kind.KIND.capitalize()}")
            kind.FIELDS = tuple(field.name for field in dataclasses.fields(kind))  # type: ignore[arg-type]
            builder = builders.get(kind.KIND) or type(f"{kind.__name__}Builder", (Builder,), {"_data": kind})
            kind.Schema = schemas[kind.NAME] = _schema(kind)
            builders[kind.KIND] = builder
        self.schemas = schemas
        DIALECTS.append(self)
        if extends is not None:
            extends.extensions.append(self)
        self.builders = builders
        self.AnyBuilder = any_builder or type(f"{name}AnyBuilder", (AnyBuilder,), {})
        self.AnyBuilder._dialect = self
        self.Schema = Schemas.OfUnion.Builder().branches(
            *(lambda b, kind=kind: b.name(kind.KIND).of(kind.Schema) for kind in self.classes)
        ).create()
        self.store = self.register(Proxies.OfStore())
        base = extends
        while base is not None:  # a base accepts its extensions' terms
            self.register(base.store)
            base = base.base

    def terms(self) -> tuple[type[Term], ...]:
        """The kinds whose expressions this dialect accepts as arguments: its own, and its extensions'."""
        return tuple(dict.fromkeys([*self.classes, *(kind for e in self.extensions for kind in e.terms())]))

    def register(self, store: Any) -> Any:
        """Registers the dialect's meta-schemas in `store` (e.g. a `Proxies.OfStore`, to build expressions' values
        there), skipping those it already holds. Returns the store."""
        for schema_name, schema in self.schemas.items():
            if schema_name not in store.names():
                store.register(schema)
        return store

    def name(self) -> str:
        return self._name

    def kinds(self) -> Mapping[str, type[Term]]:
        return dict(self._kinds)

    def schema_of(self, expression: Any) -> Schemas.OfObject.Data:
        """The meta-schema of `expression`'s kind, which its value is of."""
        if not isinstance(expression, self.classes):
            raise TypeError(f"not an expression: {expression!r}")
        return type(expression).Schema

    def term(self, value: Readers.OfObject) -> Any:
        """The expression a value of the meta-schema of one of the kinds it accepts holds, such as one read from JSON
        (`JSON.FromJSON(dialect.store)(F.ARGUMENT, text)`) or built through `store`: a new term, its arguments too."""
        schema = value.as_schema()
        kind = next((kind for kind in self.terms() if kind.Schema is schema), None)
        if kind is None:
            raise TypeError(f"not a value of a {self._name} kind: {schema.name!r}")
        return _from_plain(self, kind, Plain.ToPlain(self.store).Value(schema, value))

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
        return resolve(spec, self.terms(), self.AnyBuilder, "an expression, a native value")

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
            elif label in kind.REFERS and (isinstance(argument, str) or id(argument) in active):
                continue  # a definition named, which its holder resolves; or recursion, referred to while checked
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
    """An expression's arguments that are expressions: not empty slots, nor the names of definitions referred to."""
    return tuple(argument for argument in expression.form().arguments if isinstance(argument, Term))


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
    the results for its arguments (None for empty slots, and a definition's name as itself). Raises on cycles."""
    memo: dict[int, Any] = {}
    active: set[int] = set()

    def visit(node: Any) -> Any:
        if id(node) in memo:
            return memo[id(node)]
        if id(node) in active:
            raise ValueError("the expression contains a cycle")
        active.add(id(node))
        results = [visit(argument) if isinstance(argument, Term) else argument for argument in node.form().arguments]
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
        if not isinstance(x, Term) or not isinstance(y, Term):
            return type(x) is type(y) and x == y  # empty slots, or the names of definitions referred to
        if (id(x), id(y)) in assumed:
            return True  # a cycle: the same if they are the same everywhere else
        assumed.add((id(x), id(y)))
        fx, fy = x.form(), y.form()
        return (type(x) is type(y) and fx.kind == fy.kind and fx.attributes.keys() == fy.attributes.keys()
                and all(_same_native(fx.attributes[k], fy.attributes[k]) for k in fx.attributes)
                and len(fx.arguments) == len(fy.arguments) and all(map(visit, fx.arguments, fy.arguments)))

    return visit(a, b)
