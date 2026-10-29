"""Terms: the framework's schemas, and the generic reads of terms that every dialect's evaluator, validator and
translator shares.

An expression is an `Expressions.Framework.Expression`, a reference object whose `root` is a term: a value of
`Expressions.Framework.Term`, a union of value object kinds, held nested (docs/proposals/port, Decided, 2). `install`
defines them in a store: the framework's kinds `literal` (`value`, a basic scalar's), `call` (`callable`, by name;
`arguments`, a container of terms by index), `variable` (`name`) and `let` (`name`, `value`, `body`), each with a
`domain` by name; `Expression`; and `HasRoot(schema, expression)`, the extension adjacency `expression` it gives
`Schemas.OfExpression`. A dialect adds its own kinds to `Term` by schema extension, in its own install.

Terms are built through mbse-schemas' builders, in a transaction, and read through its readers: a term's kind is the
branch it holds, its properties the branch's members. Which properties are a kind's slots (a term each), its variadic
arguments (a container of terms) or its attributes (anything else) is read from the kind's schema. What the framework
needs to know beyond the schema, how each kind is read, is a `Kind`: its role, and which properties name what it binds
and its operator.

- `term(x)`: the term value of an expression, a term property's reader, a `Readers.OfAny` holding one, or a term.
- `kind_of(term)`: its branch, `(tag, record)`. `form(term)`: its `Form`, `kind`, `attributes` and `arguments`.
- `name_of(term)`, `operator_of(term, kind)`; `walk`, `fold`, `same`: traversal of a nested value.
- `Dialect`: a dialect's kinds by tag, with `validate`, `infer` and `make(form)`, the `Writer` of a form.
- `Writer`: a spec that writes a term through the builders; `spec(x)` makes one of a writer, a native value (a
  literal), a term value (copied) or a callable taking the `Visitors.OfUnion` of a term value.

The roles are:

- `LITERAL`: a basic scalar, its `value`.
- `REFERENCE`: a value the scope resolves. A lexical reference (the default) is the value bound to its name, by an
  enclosing binding or import or by the scope; others, such as Excel's cell references, are resolved by the scope
  alone, and validation does not require them to be bound. `ambient` names are bound without being declared.
- `APPLICATION`: an operator, named by the property `operator` (or, if it is None, by the kind's tag), applied to
  arguments. A kind's `vocabulary` maps operator names to signatures; operators outside it are extensions, unless the
  vocabulary is None, when any name is accepted and `signature` applies to all.
- `BINDING`: binds its name to its first argument within the others.
- `QUANTIFIER`: binds its name to each item of its first argument, a collection, within the others, and combines the
  results by its operator, such as `all`. Its signature also gives the domain of a collection's items.
- `IMPORT`: makes what it declares available within its one argument, its body; `Kind.names(record)` gives the names
  it binds for lexical references.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Iterable, Iterator, Mapping
from dataclasses import dataclass, field
from typing import Any

from mbse.Schemas.Framework import Schemas

from . import Domains, Objects

__all__ = [
    "install", "TERM", "EXPRESSION", "LITERAL", "REFERENCE", "APPLICATION", "BINDING", "IMPORT", "QUANTIFIER",
    "Form", "Kind", "Dialect", "Writer", "spec", "term", "is_term", "kind_of", "form", "name_of", "operator_of",
    "walk", "fold", "same",
]

TERM = "Expressions.Framework.Term"
EXPRESSION = "Expressions.Framework.Expression"
LITERAL, REFERENCE, APPLICATION, BINDING, IMPORT = "literal", "reference", "application", "binding", "import"
QUANTIFIER = "quantifier"


def install(txn: Any) -> Any:
    """The framework's schemas: terms, expressions, and an expression schema's root. Run again in a store, it finds each
    by its name and writes nothing."""
    S = txn.Schemas
    return txn.uid("mbse.Expressions.Framework/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion, "Literal": S.OfObject, "Call": S.OfObject, "Variable": S.OfObject,
                  "Let": S.OfObject, "Expression": S.OfObject, "HasRoot": S.OfRelation,
                  "OfExpression": S.OfObject})  # mbse-schemas' own, found by its name
        .spec([
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # a dialect adds its kinds
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("call").schema([_.Call]),
                lambda t: t.name("variable").schema([_.Variable]),
                lambda t: t.name("let").schema([_.Let]),
            ]),
            lambda _: _.Literal.name("Expressions.Framework.Literal").properties({
                "value": S.OfAny(lambda a: a),  # a basic scalar's, tagged on the wire (docs/proposals/port/API.md)
                "domain": S.OfStr,  # every term has a domain (Schema extension, Decided, 21), by name (stage 3)
            }),
            lambda _: _.Call.name("Expressions.Framework.Call").properties({
                "callable": S.OfStr,  # what it calls, by name: an operator, a function
                "arguments": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term])),
                "domain": S.OfStr,  # its result's
            }),
            lambda _: _.Variable.name("Expressions.Framework.Variable").properties({"name": S.OfStr, "domain": S.OfStr}),
            lambda _: _.Let.name("Expressions.Framework.Let").properties({
                "name": S.OfStr, "value": _.Term, "body": _.Term, "domain": S.OfStr}),
            lambda _: _.Expression.name("Expressions.Framework.Expression").ref(True).properties({"root": _.Term}),
            lambda _: _.HasRoot.name("Expressions.Framework.HasRoot").links([
                lambda t: t.name("schema"), lambda t: t.name("expression")]).uniques("expression"),
            lambda _: _.OfExpression.name("Schemas.OfExpression").adjacencies([  # by extension: no member on it
                lambda t: t.name("expression").relation([_.HasRoot]).me("schema")]),
        ])]))])


def _article(noun: str) -> str:
    return f"{'an' if noun[0] in 'aeiou' else 'a'} {noun}"


def _type_name(value: object) -> str:
    return type(value).__name__


def _described(value: Any) -> str:
    """A value's schema's name when it is read through a reader and has one, otherwise its type's name."""
    schema = getattr(value, "as_schema", None)
    name = getattr(schema(), "name", None) if callable(schema) and not isinstance(value, type) else None
    return name or _type_name(value)


# --- Reading terms ---


@dataclass(frozen=True)
class Form:
    """A term's structure: its `kind` (its branch's tag), its `attributes` (its properties that are not terms, those set,
    by name) and its ordered `arguments` (its slots, None where empty, then its variadic arguments)."""

    kind: str
    attributes: Mapping[str, Any] = field(default_factory=dict)
    arguments: tuple[Any, ...] = ()


def _named(schema: Any, name: str) -> bool:
    return getattr(schema, "name", None) == name


def _parts(schema: Any) -> tuple[tuple[str, ...], str | None, tuple[str, ...]]:
    """A kind's schema's slots (properties holding a term), its variadic property (a container of terms) or None, and its
    attributes (the rest), each in declaration order."""
    cached = _PARTS.get(id(schema))
    if cached is not None and cached[0] is schema:
        return cached[1]
    slots, variadic, attributes = [], None, []
    for name, prop in schema.properties.items():
        if _named(prop.schema, TERM):
            slots.append(name)
        elif isinstance(prop.schema, Schemas.OfContainer.Data) and _named(prop.schema.element, TERM):
            variadic = name
        else:
            attributes.append(name)
    parts = (tuple(slots), variadic, tuple(attributes))
    _PARTS[id(schema)] = (schema, parts)
    return parts


_PARTS: dict[int, tuple[Any, Any]] = {}


def _is_any(visitor: Any) -> bool:
    """Whether a visitor is a `Visitors.OfAny`, rather than the `Visitors.OfUnion` of the value it holds."""
    return callable(getattr(type(visitor), "as_union", None))


def is_term(value: Any) -> bool:
    """Whether `value` is a term value: the reader of a value of `Expressions.Framework.Term`."""
    schema = getattr(value, "as_schema", None)
    return (callable(schema) and not isinstance(value, type) and not _is_any(value)
            and isinstance(schema(), Schemas.OfUnion.Data) and _named(schema(), TERM))


def term(value: Any) -> Any:
    """The term value of an `Expression` (its root), of a term property's reader, of a `Readers.OfAny` holding one, or a
    term value itself; raises `TypeError` for anything else, and `ValueError` where there is none."""
    schema = value.as_schema() if callable(getattr(value, "as_schema", None)) and not isinstance(value, type) else None
    found: list[Any] = []
    if isinstance(schema, Schemas.OfObject.Data) and _named(schema, EXPRESSION):
        return term(value.root)
    if isinstance(schema, Schemas.OfProperty.Data) and _named(schema.schema, TERM):
        value.as_value(lambda a: a.as_union(lambda u: found.append(u) or u))
    elif _is_any(value) and _named(schema, TERM):
        value.as_union(lambda u: found.append(u) or u)
    elif is_term(value):
        return value
    else:
        raise TypeError(f"not a term: {value!r}")
    if found[0].as_schema() is None:
        raise ValueError("no term is set")
    return found[0]


def kind_of(term_: Any) -> tuple[str, Any]:
    """The branch a term value holds: its tag, and its record (a `Readers.OfObject`)."""
    for branch in term_.as_schema().branches:
        record = getattr(term_, branch.name)
        if record.as_schema() is not None:
            return branch.name, record
    raise ValueError("a term holds no kind")


def _scalar(record: Any, name: str) -> Any:
    """A record's property's value: a scalar, or what `Objects.held` reads of any other value; None when absent."""
    found: list[Any] = []
    getattr(record, name).as_value(lambda a: found.append(Objects.held(a)) or a)
    return found[0] if found else None


def _slot(record: Any, name: str) -> Any:
    """The term a slot holds, or None."""
    found: list[Any] = []
    getattr(record, name).as_value(lambda a: a.as_union(lambda u: found.append(u) or u))
    return found[0] if found and found[0].as_schema() is not None else None


def _variadic(record: Any, name: str) -> tuple[Any, ...]:
    """The terms a container of terms holds, in index order."""
    pairs: list[tuple[Any, Any]] = []
    getattr(record, name).as_value(lambda a: a.as_container(lambda c: c.as_entries(pairs.extend)))
    found: list[Any] = []
    for _, element in pairs:
        element.as_union(lambda u: found.append(u) or u)
    return tuple(found)


def attributes_of(record: Any) -> dict[str, Any]:
    """A record's attributes that are set, by name, in declaration order."""
    _, _, names = _parts(record.as_schema())
    values = {name: _scalar(record, name) for name in names}
    return {name: value for name, value in values.items() if value is not None}


def arguments_of(record: Any) -> tuple[Any, ...]:
    """A record's arguments: its slots, None where empty, then its variadic arguments."""
    slots, variadic, _ = _parts(record.as_schema())
    fixed = tuple(_slot(record, name) for name in slots)
    return fixed + _variadic(record, variadic) if variadic is not None else fixed


def form(term_: Any) -> Form:
    """A term's `Form`."""
    tag, record = kind_of(term_)
    return Form(tag, attributes_of(record), arguments_of(record))


def name_of(term_: Any) -> Any:
    """The name a reference refers to, or a binding, quantifier or import binds: its `name`; None if it has none."""
    _, record = kind_of(term_)
    return _scalar(record, "name") if "name" in record.as_schema().properties else None


def operator_of(term_: Any, kind: Kind) -> str:
    """An application's or a quantifier's operator: its `kind.operator` property, or its tag."""
    tag, record = kind_of(term_)
    return tag if kind.operator is None else _scalar(record, kind.operator)


# --- Traversal ---


def walk(term_: Any) -> Iterator[Any]:
    """Every term within `term_`, itself first, parents before their arguments and arguments in order."""
    stack = [term(term_)]
    while stack:
        node = stack.pop()
        yield node
        stack.extend(reversed([a for a in form(node).arguments if a is not None]))


def fold(term_: Any, function: Callable[[Any, list[Any]], Any]) -> Any:
    """Combines a term bottom-up: `function(node, results)` is called once per term, with the results for its arguments
    (None for empty slots)."""

    def visit(node: Any) -> Any:
        return function(node, [None if a is None else visit(a) for a in form(node).arguments])

    return visit(term(term_))


def _same_native(a: Any, b: Any) -> bool:
    """Scalars of one type by value (NaN is NaN, -0.0 is not 0.0)."""
    if type(a) is not type(b):
        return False
    if type(a) is float:
        return (math.isnan(a) and math.isnan(b)) or (a == b and math.copysign(1.0, a) == math.copysign(1.0, b))
    return a == b


def same(a: Any, b: Any) -> bool:
    """Whether two terms have the same structure: their kinds, attributes (scalars of one type by value; NaN is NaN, and
    -0.0 is not 0.0) and arguments in order."""

    def visit(x: Any, y: Any) -> bool:
        if x is None or y is None:
            return x is y
        fx, fy = form(x), form(y)
        return (fx.kind == fy.kind and fx.attributes.keys() == fy.attributes.keys()
                and all(_same_native(fx.attributes[k], fy.attributes[k]) for k in fx.attributes)
                and len(fx.arguments) == len(fy.arguments) and all(map(visit, fx.arguments, fy.arguments)))

    return visit(term(a), term(b))


# --- Writing terms: specs ---


class Writer:
    """A spec that writes a term through the builders: called with the `Visitors.OfProperty` of a term property, the
    `Visitors.OfAny` of a container's element or the `Visitors.OfUnion` of a term value, it selects its kind's branch
    and writes it. `write(union)` is given the `Visitors.OfUnion`. Each dialect derives its own, with methods."""

    __slots__ = ("write",)

    def __init__(self, write: Callable[[Any], Any]):
        self.write = write

    def __call__(self, visitor: Any) -> Any:
        if isinstance(visitor.as_schema(), Schemas.OfProperty.Data):
            return visitor.as_value(self)
        if _is_any(visitor):
            return visitor.as_union(self.write)
        self.write(visitor)
        return visitor


def _copy(value: Any) -> Writer:
    """The writer of a copy of a term value."""

    def write(union: Any) -> Any:
        tag, record = kind_of(value)
        return getattr(union, tag)(record)

    return Writer(write)


def spec(value: Any, literal: Callable[[Any], Writer | None] | None = None) -> Writer:
    """The writer of a term: a writer as it is, a term value's (copied), a native value's as `literal` writes it (when
    it gives one), or a callable's that takes the `Visitors.OfUnion` of a term value."""
    if isinstance(value, Writer):
        return value
    if is_term(value):
        return _copy(value)
    if literal is not None and type(value) in Schemas.SCALAR_TYPES:
        written = literal(value)
        if written is not None:
            return written
    if callable(value) and not isinstance(value, type):
        return Writer(value)
    raise TypeError(f"expected a term, a writer or a native value, got {value!r}")


# --- Dialects ---


@dataclass(frozen=True)
class Kind:
    """How the framework reads a kind, beyond its schema: its `role`; the property naming its operator (`operator`,
    or None when its tag names it); for an application or a quantifier, its `vocabulary` (operator names to signatures;
    None accepts any name, with `signature`); the properties it requires (`required`); for a reference, whether it is
    `lexical` and the `ambient` names bound without a declaration; for an import, the names it binds (`names(record)`);
    its own problems (`check(record)`); and its own domain, when it carries one (`typed(record)`)."""

    role: str
    operator: str | None = None
    vocabulary: Mapping[str, Domains.Signature] | None = None
    signature: Domains.Signature | None = None
    required: tuple[str, ...] = ()
    lexical: bool = True
    ambient: frozenset[str] = frozenset()
    names: Callable[[Any], tuple[str, ...]] | None = None
    check: Callable[[Any], list[str]] | None = None
    typed: Callable[[Any], Domains.Domain | None] | None = None


class Dialect:
    """An expression language: the kinds it reads, by tag, its `name`, and `domain_of(value)`, a literal's domain. A
    dialect may extend another (`extends`): its kinds are the base's and its own, whose tags must differ from the
    base's. It validates (`validate`), infers (`infer`) and writes (`make`) terms of its kinds."""

    def __init__(self, name: str, kinds: Mapping[str, Kind], *, domain_of: Callable[[Any], Domains.Domain],
                 literal: Callable[[Any], Writer | None] | None = None, extends: Dialect | None = None):
        inherited = {} if extends is None else extends.kinds()
        clashes = sorted(tag for tag in kinds if tag in inherited)
        if clashes:
            raise ValueError(f"{name} would declare {', '.join(map(repr, clashes))}, which {extends.name()} has")  # type: ignore[union-attr]
        self._name, self._kinds, self._domain_of, self.base = name, {**inherited, **kinds}, domain_of, extends
        self._literal = literal if literal is not None or extends is None else extends._literal

    def name(self) -> str:
        return self._name

    def kinds(self) -> dict[str, Kind]:
        return dict(self._kinds)

    def __repr__(self) -> str:
        return f"<dialect {self._name}>"

    def kind(self, term_: Any) -> tuple[str, Any, Kind]:
        """A term's tag, record and `Kind`; raises `ValueError` for a kind the dialect does not read."""
        tag, record = kind_of(term_)
        if tag not in self._kinds:
            raise ValueError(f"{self._name} has no kind {tag!r}")
        return tag, record, self._kinds[tag]

    def spec(self, value: Any) -> Writer:
        """The writer of a term of this dialect: see `spec`, a native value as this dialect's literal."""
        return spec(value, self._literal)

    def make(self, form_: Form) -> Writer:
        """The writer of a term with this form: its attributes written as scalars, its arguments (specs: terms,
        writers, native values) to its slots in order and the rest to its variadic property."""
        if form_.kind not in self._kinds:
            raise ValueError(f"{self._name} has no kind {form_.kind!r}")
        arguments = [None if a is None else self.spec(a) for a in form_.arguments]

        def write(union: Any) -> Any:
            def record(r: Any) -> Any:
                slots, variadic, names = _parts(r.as_schema())
                for name, value in form_.attributes.items():
                    if name not in names:
                        raise ValueError(f"{_article(form_.kind)} has no attribute {name!r}")
                    getattr(r, name)(lambda p, value=value: p.as_scalar(value))
                if len(arguments) < len(slots) or (variadic is None and len(arguments) != len(slots)):
                    least = "" if variadic is None else "at least "
                    raise ValueError(f"{_article(form_.kind)} takes {least}{len(slots)} arguments, got {len(arguments)}")
                for name, argument in zip(slots, arguments):
                    if argument is not None:
                        getattr(r, name)(argument)
                if variadic is not None:
                    getattr(r, variadic)(list(arguments[len(slots):]))
                return r

            return getattr(union, form_.kind)(record)

        return Writer(write)

    # Checks

    def validate(self, term_: Any, bound: Iterable[str] = (), core: bool = False) -> list[str]:
        """Problems with a term. References must be bound by an enclosing binding or be in `bound`. With `core`, every
        operator must be in its kind's vocabulary."""
        return self._problems(term(term_), frozenset(bound), core)

    def _problems(self, node: Any, bound: frozenset[str], core: bool) -> list[str]:
        tag, record = kind_of(node)
        if tag not in self._kinds:
            return [f"{self._name} has no kind {tag!r}"]
        kind = self._kinds[tag]
        what = _article(tag)
        attributes = attributes_of(record)
        if kind.role == LITERAL:
            value = attributes.get("value")
            if value is None:
                return [f"{what} needs a value"]
            if type(value) not in Schemas.SCALAR_TYPES:
                return [f"{what} must hold a basic scalar, got {_described(value)}"]
            return kind.check(record) if kind.check is not None else []
        problems = [f"{what} needs {_article(name)}" for name in kind.required if attributes.get(name) in (None, "")]
        declared = record.as_schema().properties
        for name, value in attributes.items():  # the builders write any scalar; validation reports the wrong one
            scalar = declared[name].schema
            if isinstance(scalar, Schemas.OfScalar.Data) and type(value) is not scalar.type:
                problems.append(f"{what}'s {name} must be a {scalar.type.__name__}, got {_type_name(value)}")
        if kind.check is not None:
            problems += kind.check(record)
        name = attributes.get("name")
        if kind.role == REFERENCE:
            if kind.lexical and not problems and name not in bound and name not in kind.ambient:
                problems.append(f"{tag} {name!r} is not bound")
            return problems
        slots, _, _ = _parts(record.as_schema())
        arguments = arguments_of(record)
        scopes = [bound] * len(arguments)
        if kind.role in (BINDING, QUANTIFIER):
            inner = bound | {name} if not problems else bound
            scopes = [bound, *[inner] * (len(arguments) - 1)]
        elif kind.role == IMPORT:
            names = kind.names(record) if kind.names is not None and not problems else ()
            scopes = [bound | set(names)] * len(arguments)
        if kind.role in (APPLICATION, QUANTIFIER) and not problems and kind.vocabulary is not None:
            operator = operator_of(node, kind)
            vocabulary = kind.vocabulary
            if operator in vocabulary and vocabulary[operator].arity() not in (-1, len(arguments)):  # -1: any number
                problems.append(f"{operator} takes {vocabulary[operator].arity()} arguments, got {len(arguments)}")
            elif core and operator not in vocabulary:
                problems.append(f"{operator!r} is not a core operation")
        for i, (argument, scope) in enumerate(zip(arguments, scopes)):
            label = slots[i] if i < len(slots) else f"argument {i - len(slots)}"
            if argument is None:
                problems.append(f"{what} needs {_article(label)}")
            else:
                problems += [f"{label}: {problem}" for problem in self._problems(argument, scope, core)]
        return problems

    def infer(self, term_: Any, environment: Mapping[str, Domains.Domain] | None = None) -> Domains.Domain:
        """The domain of a term's value, with the references in `environment` of the given domains."""
        environment = dict(environment or {})
        node = term(term_)
        problems = self.validate(node, environment)
        if problems:
            raise ValueError(f"cannot infer the domain of an invalid expression: {problems[0]}")
        return self._infer(node, environment)

    def _infer(self, node: Any, environment: dict[str, Domains.Domain]) -> Domains.Domain:
        tag, record, kind = self.kind(node)
        if kind.role == LITERAL:
            typed = kind.typed(record) if kind.typed is not None else None
            return typed or self._domain_of(_scalar(record, "value"))
        if kind.role == REFERENCE:
            name = name_of(node)
            return environment[name] if kind.lexical and name in environment else Domains.Anything
        arguments = arguments_of(record)
        if kind.role == IMPORT:
            names = kind.names(record) if kind.names is not None else ()
            return self._infer(arguments[-1], {**environment, **{name: Domains.Anything for name in names}})
        if kind.role == BINDING:
            value = self._infer(arguments[0], environment)
            return self._infer(arguments[-1], {**environment, name_of(node): value})
        operator = operator_of(node, kind)
        signature = kind.signature if kind.vocabulary is None else kind.vocabulary.get(operator)
        if kind.role == QUANTIFIER:  # its name has the domain of the collection's items
            collection = self._infer(arguments[0], environment)
            item = Domains.Anything if signature is None else signature.items(collection)  # type: ignore[attr-defined]
            inner = {**environment, name_of(node): item}
            domains = [collection, *(self._infer(argument, inner) for argument in arguments[1:])]
        else:
            domains = [self._infer(argument, environment) for argument in arguments]
        if signature is None:
            return Domains.Anything  # an extension: nothing is known about it
        result = signature.result(domains)
        if result is None:
            names = ", ".join(domain.name() for domain in domains)
            raise TypeError(f"{operator} cannot take ({names}); it takes {signature.describe()}")
        typed = kind.typed(record) if kind.typed is not None else None
        return result if typed is None else typed  # an application of a domain of its own gives it
