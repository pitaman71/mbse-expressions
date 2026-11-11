"""Terms: the framework's schemas, and the generic reads of terms that every dialect's evaluator, validator and
translator shares.

An expression is an `Expressions.Framework.Expression`, a reference object whose `root` is a term: a value of
`Expressions.Framework.Term`, held nested ([Porting to the stabilized mbse-schemas](../../../../docs/proposals/port/README.md#decided), Decided, 2). Each dialect's install defines its holder,
`Expressions.<Dialect>.Expression`, a reference object refining it whose `root` is narrowed to the dialect's `Term`
(mbse-schemas 0.26.7 confirms a member narrowed from a union to one of its branches' schemas), so `HasRoot`, linking
the framework's `Expression`, links any dialect's holder; `is_expression` tells either. `Term` is the union of the dialects' `Term`s
([Complete expression dialects](../../../../docs/proposals/dialects/README.md#decided), Decided, 1, revised
2026-11-03): its branches are the dialects (`patterns`, `python3`, ...),
each added by its dialect's install by schema extension, and each branch's schema is that dialect's `Term`, the value
union of its kinds, `Expressions.<Dialect>.Term`, whose branches are its kinds, named plainly (`binop`). Within a term
tree every parent-child link is a property: a dialect's own kinds hold its `Term`, so its terms nest its terms; the
framework's shared kinds hold `Expressions.Framework.Term`, any dialect's term, and each dialect's `Term` lists the
shared kinds it reuses. So a term value is either a value of `Term`,
its dialect then its kind, or a value of a dialect's `Term`, its kind alone: `term`, `kind_of` and `form` read both.

`install` defines the framework's schemas in a store: `Term`, with no branch until a dialect adds its own; the shared
kinds `literal` (a domain representation, mbse-basis
[PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): `value`, any value, absent where
its text is invalid; `text`, its source spelling, unvalidated; `problems`, a validation indicator for each problem its
text has; [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md)), `call`
(`callable`, by name; `arguments`, a container of terms by index), `variable` (`name`), `let` (`name`, `value`,
`body`), and the container constructors `list` (`elements`, a container of terms by index) and `mapping` (`entries`, a
container by index of `Expressions.Framework.Pair`s, each a `key` and a `value` term); the invalid-syntax kinds every
dialect's union holds, `error` (`text`, the source it spans as written; `terms`, the terms recovered within it) and
`missing` (`kind`, the kind the parser expected), modeled for parsers that keep invalid syntax and written by none yet;
`Expression`; `HasRoot(schema, expression)`, the extension adjacency `expression` it gives `Schemas.OfExpression`; and
`HasAbi(expression, abi)`, one ABI per expression at most (`uniques("abi")`), through `Expression`'s adjacency
`abi`: the dialect of the ABI an expression's terms are read under, which C's and C++'s read the types their standards leave to the implementation from
(mbse-basis [CAP-267: C and C++ terms read under the ABI their holder names](mbse:mbse-basis/docs/capabilities/CAP-267.md#decided)). A term carries
no domain: whatever owns the root term gives its schema.

Dialects, domains and operations are data too. A dialect is a singleton whose identity is its global name
(`Expressions.Patterns.Expressions`), of its own reference object schema (`Expressions.Patterns.Expressions.Dialect`), a branch of the kind
union `Expressions.Framework.Dialect`, which each dialect extends. A dialect may own domains by name, as a standard
dialect's does (`Expressions.ISOIEC11404.Expressions`), through `Expressions.Framework.Defines(dialect, name, domain)`, so a domain's path is its dialect's and its name; a domain is
an `Expressions.Framework.Domain`, a reference object holding its `kind`, a value of `Expressions.Framework.DomainKind`,
the union of the dialects' unions of kinds, as `Term` is of their `Term`s: with no branch until a dialect that has kinds
adds its own, `Expressions.<Family>.<Dialect>.DomainKind`, as the branch named by its tag (`isoiec11404`), so a kind
is written its dialect, then its kind
(`d.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(lambda f: f.format("binary32"))))))`).
The standard
dialects, ISO/IEC 11404, IEEE 754, IEEE 1164 and Unicode (`mbse.Expressions.ISOIEC11404.Expressions` and the
others), hold the kinds and the domains of their standards. A domain's schema is a named `Schemas.OfAny` restricted
to the scalar it narrows (`Expressions.ISOIEC11404.Expressions.octet`), which reads it through the extension
adjacency `domain` (`Expressions.Framework.HasDomain(schema, domain)`, unique both ways). A dialect names its operations
(`Expressions.Framework.Operates(dialect, name, operation)`), each a `Schemas.OfExpression` its module defines, whose
pattern's variables are its arguments, in the order they are declared, and whose `result` is its return. A dialect
that uses another's kinds or schemas depends on its caller's install order, nothing recording it as data. A dialect
owns each edition of a standard it covers by its designation, as its standards body writes it (`ISO/IEC 9899:2011`),
through `Expressions.Framework.Covers(dialect, designation, standard)`: an `Expressions.Framework.Standard`, a
reference object holding its formal reference's parts, its `bodies` by reverse-domain name, its `number` and its
`revision` (a value of `Expressions.Framework.Revision`: a `year`, an `edition` or a `version`), and its common
`names` (`C11`), so that it is found by either; each kind's schema, a `Schemas.OfObject`, records the editions that
have it through the extension adjacency `standards` (`Expressions.Framework.HasStandard(kind, standard)`, a set).
`Domains` reads stored domains and operations, `Standards` stored standards.

Terms are built through mbse-schemas' builders, in a transaction, and read through its readers: a term's kind is the
branch its dialect's `Term` holds, its properties the branch's members. Which properties are a kind's slots (a term
each: a property whose schema is `Expressions.Framework.Term` or a dialect's `Term`), its variadic arguments (each
container of terms, or of value objects of terms, a mapping's pairs, read as their terms in turn; a kind may hold
several, read in declaration order: a `solve ... before ...` constraint's two lists), its helpers (a value object that is not a
term and not a pair, or a container of them, or of a union of them: a Python call's keywords, a comparison's links, a
comprehension's `for` clauses) or its attributes (anything else) is read from the kind's schema. A helper is read as a
`Part` among the attributes, its kind, its own attributes and how many arguments it holds, and its terms are the
term's arguments too, after its slots and variadic arguments; so a form keeps a helper's structure in its attributes
and its terms in its arguments, and `make` writes it back. Where a kind holds several containers of terms, its form's
attributes hold each one's size, as a `Part` named by the container (`Part("solve", {}, 2)`), so that its arguments are
read back into the container each came from. What the framework needs to know beyond the schema, how each
kind is read, is a `Kind`: its role, and which properties name what it binds and its operator.

- `term(x)`: the term value of an expression, a term property's reader, a `Readers.OfAny` holding one, or a term.
  `holder_of(term)`: the reference object holding it, its `Expression`, found by its owners.
- `kind_of(term)`: its kind's branch, `(tag, record)`; `dialect_of(term)`: the name of its dialect's `Term`;
  `dialect_name(path)`: a dialect's name, of its path below `Expressions` (`C.Expressions`' is `C`, a sublanguage's
  its family's and its own: `SystemVerilog.Types`' is `SystemVerilog Types`); `dialect_tag(name)`, its tag
  (`systemverilog_types`). `is_binder(schema)`: whether a kind binds names, its schema `Let` or a refinement of it.
  `form(term)`: its `Form`, `kind`, `attributes` and `arguments`; `node(tag, record)`: its `Node`, its helpers nested,
  as a dialect whose kinds hold sublanguages reads them to print and check them.
- `name_of(term)`, `reference_name(name)`, `operator_of(term, kind)`; `walk`, `fold`, `same`: traversal of a nested value.
- `Dialect`: a dialect's kinds by tag, with `validate`, `infer` and `make(form)`, the `Writer` of a form.
- `Writer`: a spec that writes a term of its dialect through the builders; `spec(x)` makes one of a writer, a native
  value (a literal), a term value (copied) or a callable taking the `Visitors.OfUnion` of a term value.

The roles are:

- `LITERAL`: a value, its `value`.
- `REFERENCE`: a value the scope resolves. A lexical reference (the default) is the value bound to its name, by an
  enclosing binding or import or by the scope; others, such as Excel's cell references, are resolved by the scope
  alone, and validation does not require them to be bound. `ambient` names are bound without being declared. A
  reference's name is its `name`: a string, or a name node, a helper (C++'s `idexpression`, holding its `Name`), whose
  name is an identifier's spelling (`reference_name`); a name node that is not an identifier (`std::cout`) is
  resolved by the scope alone, and the terms it holds (a template's arguments) are its arguments.
- `APPLICATION`: an operator, named by the property `operator` (or, if it is None, by the kind's tag), applied to
  arguments. A kind's `vocabulary` maps operator names to signatures; operators outside it are extensions, unless the
  vocabulary is None, when any name is accepted and `signature` applies to all, or the kind is `closed`, when they
  are refused by evaluation; where its operations are data (`Kind.operations`), validation refuses any its dialect
  does not define. The container constructors are applications named by their tags.
- `BINDING`: binds its name to its first argument within the others: a let, whose schema is
  `Expressions.Framework.Let`; a kind refining `Let` (a binder, `is_binder`) binds what its `scopes` say, where it has
  them.
- `QUANTIFIER`: binds its name to each item of its first argument, a collection, within the others, and combines the
  results by its operator, such as `all`. Its signature also gives the domain of a collection's items.
- `IMPORT`: makes what it declares available within its one argument, its body; `Kind.names(attributes)` gives the names
  it binds for lexical references.
- `INVALID`: invalid syntax, `error` and `missing`: validation reports it, and evaluation refuses it by name.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Iterable, Iterator, Mapping
from dataclasses import dataclass, field
from typing import Any

from mbse.Schemas.Framework import Proxies, Schemas

from . import Domains, Objects

__all__ = [
    "install", "TERM", "EXPRESSION", "LITERAL", "REFERENCE", "APPLICATION", "BINDING", "IMPORT", "QUANTIFIER",
    "INVALID", "INVALID_KINDS", "invalid_text", "invalid_problems", "Form", "Part", "Node", "Kind", "Dialect", "Writer",
    "spec", "term", "is_term", "is_expression", "is_binder", "holder_of", "kind_of", "dialect_of", "dialect_name",
    "dialect_tag", "SUBLANGUAGES", "form", "node", "name_of", "reference_name", "operator_of", "walk", "fold", "same",
]

TERM = "Expressions.Framework.Term"
EXPRESSION = "Expressions.Framework.Expression"
LITERAL, REFERENCE, APPLICATION, BINDING, IMPORT = "literal", "reference", "application", "binding", "import"
QUANTIFIER, INVALID = "quantifier", "invalid"


def install(txn: Any) -> Any:
    """The framework's schemas: terms, expressions and an expression schema's root; domains and the schemas they
    restrict; dialects and the operations they define. Run first, before the standard dialects' installs and then
    the others', each in a transaction of its own. Run again in a store, it finds each by its name and writes nothing."""
    S = txn.Schemas
    return txn.uid("mbse.Expressions.Framework/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion, "Literal": S.OfObject, "Call": S.OfObject, "Variable": S.OfObject,
                  "Let": S.OfObject, "List": S.OfObject, "Mapping": S.OfObject, "Pair": S.OfObject,
                  "Error": S.OfObject, "Missing": S.OfObject,
                  "Expression": S.OfObject, "HasRoot": S.OfRelation, "HasAbi": S.OfRelation, "OfExpression": S.OfObject,
                  "Domain": S.OfObject, "DomainKind": S.OfUnion, "HasDomain": S.OfRelation, "OfAny": S.OfObject,
                  "Dialect": S.OfUnion, "Defines": S.OfRelation, "Operates": S.OfRelation,
                  "Standard": S.OfObject, "Revision": S.OfUnion, "Covers": S.OfRelation, "HasStandard": S.OfRelation,
                  "OfObject": S.OfObject})  # mbse-schemas' own, by name
        .spec([
            # The union of the dialects' `Term`s: each dialect adds its own, `Expressions.<Dialect>.Term`, as the
            # branch named after it (`patterns`), by schema extension.
            lambda _: _.Term.name("Expressions.Framework.Term"),
            # The shared kinds, which a dialect's `Term` lists where it reuses them; their slots hold any dialect's term.
            lambda _: _.Literal.name("Expressions.Framework.Literal").properties({  # a domain representation (PRI-023)
                "value": S.OfAny(lambda a: a),  # any value; absent where its text is invalid
                "text": S.OfStr,  # its source spelling, unvalidated
                "problems": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfStr])),  # what is wrong with its text
            }),
            lambda _: _.Call.name("Expressions.Framework.Call").properties({
                "callable": S.OfStr,  # what it calls, by name: an operation its dialect defines
                "arguments": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term])),
            }),
            lambda _: _.Variable.name("Expressions.Framework.Variable").properties({"name": S.OfStr}),
            lambda _: _.Let.name("Expressions.Framework.Let").properties({"name": S.OfStr, "value": _.Term, "body": _.Term}),
            lambda _: _.List.name("Expressions.Framework.List").properties({  # constructs a list of its elements' values
                "elements": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term])),
            }),
            lambda _: _.Mapping.name("Expressions.Framework.Mapping").properties({  # constructs a mapping, key to value
                "entries": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Pair])),
            }),
            lambda _: _.Pair.name("Expressions.Framework.Pair").properties({"key": _.Term, "value": _.Term}),
            # Invalid syntax, which every dialect's `Term` holds: what a parser skipped, and the kind it expected.
            lambda _: _.Error.name("Expressions.Framework.Error").properties({
                "text": S.OfStr,  # the source it spans, as written
                "terms": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term])),  # the terms recovered within it
            }),
            lambda _: _.Missing.name("Expressions.Framework.Missing").properties({
                "kind": S.OfStr,  # the kind the parser expected, as it names it
            }),
            lambda _: _.Expression.name("Expressions.Framework.Expression").ref(True).properties({"root": _.Term}).adjacencies({
                "abi": lambda a: a.relation([_.HasAbi]).me("expression")}),  # the ABI its terms are read under
            lambda _: _.HasRoot.name("Expressions.Framework.HasRoot").links([
                lambda t: t.name("schema"), lambda t: t.name("expression")]).uniques("expression"),
            # The dialect of the ABI an expression's terms are read under, one at most: C's and C++'s read the types
            # their standards leave to the implementation from it (mbse-basis
            # [CAP-267: C and C++ terms read under the ABI their holder names](mbse:mbse-basis/docs/capabilities/CAP-267.md#decided)).
            lambda _: _.HasAbi.name("Expressions.Framework.HasAbi").links([
                lambda t: t.name("expression").schema([_.Expression]), lambda t: t.name("abi").schema([_.Dialect])
            ]).uniques("abi"),
            lambda _: _.OfExpression.name("Schemas.OfExpression").adjacencies([  # by extension: no member on it
                lambda t: t.name("expression").relation([_.HasRoot]).me("schema")]),
            # A dialect: a singleton, its identity its global name (`Expressions.Patterns.Expressions`), the root of its domains'
            # paths. mbse-schemas gives a schema one singleton, so `Dialect` is a kind union of reference object
            # schemas, to which each dialect adds its own by schema extension, as it adds its kinds to `Term`.
            lambda _: _.Dialect.name("Expressions.Framework.Dialect"),
            # No relation records which dialects one uses: its caller's install order is its dependencies
            # (mbse-basis [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)).
            # A domain: a reference object holding its kind, a value of the union of the dialects' unions of kinds,
            # owned by the dialect that defines it by name; its schema, a named `Schemas.OfAny` restricted to the
            # scalar it narrows, reads it through the extension adjacency `domain`.
            lambda _: _.DomainKind.name("Expressions.Framework.DomainKind"),  # a dialect adds its union of kinds
            lambda _: _.Domain.name("Expressions.Framework.Domain").ref(True).properties({"kind": _.DomainKind}).adjacencies({
                "dialect": lambda a: a.relation([_.Defines]).me("domain").owner(True),  # its path: its dialect's, its name
                "schema": lambda a: a.relation([_.HasDomain]).me("domain")}),
            lambda _: _.Defines.name("Expressions.Framework.Defines").links([
                lambda t: t.name("dialect").schema([_.Dialect]), lambda t: t.name("domain")]).properties({
                "name": S.OfStr}).uniques([["dialect", "name"], ["domain"]]),
            lambda _: _.HasDomain.name("Expressions.Framework.HasDomain").links([
                lambda t: t.name("schema").schema([_.OfAny]), lambda t: t.name("domain")]).uniques([["schema"], ["domain"]]),
            lambda _: _.OfAny.name("Schemas.OfAny").adjacencies({
                "domain": lambda a: a.relation([_.HasDomain]).me("schema")}),
            # A dialect's operations, each a `Schemas.OfExpression` its module owns (`Schemas.Defines`), its pattern's
            # variables its arguments in the order they are declared, its `result` its return: named by the dialect.
            lambda _: _.Operates.name("Expressions.Framework.Operates").links([
                lambda t: t.name("dialect").schema([_.Dialect]), lambda t: t.name("operation").schema([_.OfExpression])
            ]).properties({"name": S.OfStr}).uniques([["dialect", "name"], ["operation"]]),
            # A standard: one edition, owned by the dialect that covers it by its designation, as its standards body
            # writes it; its formal reference's parts and its common names, the tags it is found by besides its
            # designation; and the kinds it has, each by its schema, which reads them through the extension adjacency
            # `standards` (mbse-basis [CAP-268: standards as tagged data](mbse:mbse-basis/docs/capabilities/CAP-268.md)).
            lambda _: _.Revision.name("Expressions.Framework.Revision").branches([
                lambda t: t.name("year").schema([S.OfInt]), lambda t: t.name("edition").schema([S.OfInt]),
                lambda t: t.name("version").schema([S.OfStr])]),
            lambda _: _.Standard.name("Expressions.Framework.Standard").ref(True).properties({
                "bodies": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfStr])),  # by reverse-domain name
                "number": S.OfStr, "revision": _.Revision,
                "names": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfStr])),  # its common names
            }).adjacencies({
                "dialect": lambda a: a.relation([_.Covers]).me("standard").owner(True),  # its dialect's, then its
                # designation
                "kinds": lambda a: a.relation([_.HasStandard]).me("standard")}),
            lambda _: _.Covers.name("Expressions.Framework.Covers").links([
                lambda t: t.name("dialect").schema([_.Dialect]), lambda t: t.name("standard")]).properties({
                "designation": S.OfStr}).uniques([["dialect", "designation"], ["standard"]]),
            lambda _: _.HasStandard.name("Expressions.Framework.HasStandard").links([
                lambda t: t.name("kind").schema([_.OfObject]), lambda t: t.name("standard")]).uniques([]),  # a set
            lambda _: _.OfObject.name("Schemas.OfObject").adjacencies({
                "standards": lambda a: a.relation([_.HasStandard]).me("kind")}),
        ])]))])


def _article(noun: str) -> str:
    return f"{'an' if noun[0].lower() in 'aeiou' else 'a'} {noun}"


def _type_name(value: object) -> str:
    return type(value).__name__


# --- Reading terms ---


@dataclass(frozen=True)
class Form:
    """A term's structure: its `kind` (its branch's tag), its `attributes` (its properties that are not terms, those set,
    by name, and, where it holds several containers of terms, each one's size, a `Part`) and its ordered `arguments`
    (its slots, None where empty, then its variadic arguments, each container's in declaration order)."""

    kind: str
    attributes: Mapping[str, Any] = field(default_factory=dict)
    arguments: tuple[Any, ...] = ()


@dataclass(frozen=True)
class Part:
    """A helper a term holds, as its form's attributes read it: its `kind` (its branch's tag, where a union of helpers
    holds it, else its schema's name's last part, lowercased: `keyword`), its `attributes`, read as a term's are, and
    its `size`, how many of the term's arguments are its terms (its slots, None where empty, its variadic arguments and
    its own helpers' terms). Where a kind holds several containers of terms, a part also gives each one's size: its
    kind the container's name, no attributes, its size how many terms it holds. Two parts are the same where their
    kinds, attributes and sizes are."""

    kind: str
    attributes: Mapping[str, Any] = field(default_factory=dict)
    size: int = 0


def _named(schema: Any, name: str) -> bool:
    return getattr(schema, "name", None) == name


def _holds_terms(schema: Any) -> bool:
    """Whether a schema's values are terms: `Expressions.Framework.Term`, or a dialect's `Term`, the union of its kinds,
    named `Expressions.<Dialect>.Term`."""
    name = getattr(schema, "name", None)
    return isinstance(schema, Schemas.OfUnion.Data) and type(name) is str and (
        name.startswith("Expressions.") and name.endswith(".Term"))


def _is_pair(schema: Any) -> bool:
    """Whether a schema is a value object whose properties are all terms, such as a mapping's pair."""
    return (isinstance(schema, Schemas.OfObject.Data) and not schema.ref and bool(schema.properties)
            and all(_holds_terms(prop.schema) for prop in schema.properties.values()))


def _is_helper(schema: Any) -> bool:
    """Whether a schema is a helper's: a value object that is not a pair, or a union, not of terms, whose branches are
    all value objects, helpers or pairs (a branch of terms alone, such as TypeScript5's `parenthesizedexpression` among
    its patterns, is a helper there)."""
    if isinstance(schema, Schemas.OfUnion.Data):
        return not _holds_terms(schema) and bool(schema.branches) and all(
            _is_helper(branch.schema) or _is_pair(branch.schema) for branch in schema.branches)
    return isinstance(schema, Schemas.OfObject.Data) and not schema.ref and not _is_pair(schema)


def _parts(schema: Any) -> tuple[tuple[str, ...], tuple[str, ...], tuple[str, ...]]:
    """A kind's schema's slots (properties holding a term), its variadic properties (each a container of terms, or of
    value objects of terms such as a mapping's pairs), and its attributes (the rest, its helpers among them), each in
    declaration order."""
    cached = _PARTS.get(id(schema))
    if cached is not None and cached[0] is schema:
        return cached[1][0]
    slots, variadic, attributes, helpers = [], [], [], []
    for name, prop in schema.properties.items():
        if _holds_terms(prop.schema):
            slots.append(name)
        elif isinstance(prop.schema, Schemas.OfContainer.Data) and (
                _holds_terms(prop.schema.element) or _is_pair(prop.schema.element)):
            variadic.append(name)
        else:
            attributes.append(name)
            if _is_helper(prop.schema) or (
                    isinstance(prop.schema, Schemas.OfContainer.Data) and _is_helper(prop.schema.element)):
                helpers.append(name)
    parts = (tuple(slots), tuple(variadic), tuple(attributes))
    _PARTS[id(schema)] = (schema, (parts, tuple(helpers)))
    return parts


def _helpers(schema: Any) -> tuple[str, ...]:
    """A kind's schema's helper properties (each a helper, or a container of them), in declaration order."""
    _parts(schema)
    return _PARTS[id(schema)][1][1]


def _members(schema: Any, name: str) -> tuple[str, ...]:
    """The term properties of the value objects a kind's variadic property `name` holds, in declaration order (a
    mapping's `key` and `value`); none where it holds terms."""
    element = schema.properties[name].schema.element
    return tuple(element.properties) if _is_pair(element) else ()


_PARTS: dict[int, tuple[Any, Any]] = {}


def _is_any(visitor: Any) -> bool:
    """Whether a visitor is a `Visitors.OfAny`, rather than the `Visitors.OfUnion` of the value it holds."""
    return callable(getattr(type(visitor), "as_union", None))


def is_expression(schema: Any) -> bool:
    """Whether `schema` is `Expressions.Framework.Expression` or refines it, as each dialect's holder does
    (`Expressions.Python.Python3.Expression`): an expression, whose `root` holds its root term."""
    while isinstance(schema, Schemas.OfObject.Data):
        if _named(schema, EXPRESSION):
            return True
        schema = schema.refines
    return False


def holder_of(value: Any) -> Any:
    """The reference object that holds a term, or anything a term holds (its record, a helper): the owner of its owner,
    in turn, up to the `Expression` whose `root` holds the tree. A term held by no store, a lone one, is refused as
    mbse-schemas refuses it (`Proxies.store_of`): TypeError, "the value does not belong to a store"."""
    Proxies.store_of(value)
    while (owner := Proxies.owner_of(value)) is not None:
        value = owner
    return value


def is_term(value: Any) -> bool:
    """Whether `value` is a term value: the reader of a value of `Expressions.Framework.Term` or of a dialect's `Term`."""
    schema = getattr(value, "as_schema", None)
    return callable(schema) and not isinstance(value, type) and not _is_any(value) and _holds_terms(schema())


def term(value: Any) -> Any:
    """The term value of an expression (its root: an `Expressions.Framework.Expression` or a dialect's holder refining
    it), of a term property's reader, of a `Readers.OfAny` holding one, or a
    term value itself; raises `TypeError` for anything else, and `ValueError` where there is none."""
    schema = value.as_schema() if callable(getattr(value, "as_schema", None)) and not isinstance(value, type) else None
    found: list[Any] = []
    if is_expression(schema):
        return term(value.root)
    if isinstance(schema, Schemas.OfProperty.Data) and _holds_terms(schema.schema):
        value.as_value(lambda a: a.as_union(lambda u: found.append(u) or u))
    elif _is_any(value) and _holds_terms(schema):
        value.as_union(lambda u: found.append(u) or u)
    elif is_term(value):
        return value
    else:
        raise TypeError(f"not a term: {value!r}")
    if found[0].as_schema() is None:
        raise ValueError("no term is set")
    return found[0]


def _held(union: Any) -> Any | None:
    """The branch a union value holds, or None."""
    for branch in union.as_schema().branches:
        held = getattr(union, branch.name)
        if held.as_schema() is not None:
            return branch.name, held
    return None


def _dialect_value(term_: Any) -> Any:
    """A term value's dialect's union value: the dialect a value of `Term` holds, or the value itself."""
    if not _named(term_.as_schema(), TERM):
        return term_
    held = _held(term_)
    if held is None:
        raise ValueError("a term holds no dialect")
    return held[1]


def dialect_of(term_: Any) -> str:
    """The name of the `Term` of the dialect a term value is of: `Expressions.Python.Python3.Term`."""
    return _dialect_value(term_).as_schema().name


def kind_of(term_: Any) -> tuple[str, Any]:
    """The branch of its dialect's `Term` a term value holds: its tag, and its record (a `Readers.OfObject`)."""
    held = _held(_dialect_value(term_))
    if held is None:
        raise ValueError("a term holds no kind")
    return held


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
    """The terms a container holds, in index order: its elements, or each element's terms in turn (`_members`), None
    where one is empty."""
    pairs: list[tuple[Any, Any]] = []
    getattr(record, name).as_value(lambda a: a.as_container(lambda c: c.as_entries(pairs.extend)))
    members = _members(record.as_schema(), name)
    found: list[Any] = []
    for _, element in pairs:
        if members:
            element.as_object(lambda o: found.extend(_slot(o, member) for member in members) or o)
        else:
            element.as_union(lambda u: found.append(u) or u)
    return tuple(found)


def _helper_records(record: Any, name: str) -> list[tuple[str, Any]]:
    """The helpers a helper property holds, each its kind and its record, in order."""
    found: list[tuple[str, Any]] = []

    def one(value: Any) -> Any:  # a helper, or a union holding one
        schema = value.as_schema()
        if isinstance(schema, Schemas.OfUnion.Data):
            found.append(_held(value))  # a union value holding nothing is not stored
        elif schema is not None:
            found.append((schema.name.rsplit(".", 1)[-1].lower(), value))
        return value

    def read(a: Any) -> Any:
        a.as_object(one)
        a.as_union(one)
        a.as_container(lambda c: c.as_entries(lambda pairs: [read(element) for _, element in pairs])
                   if c.as_schema() is not None else c)
        return a

    getattr(record, name).as_value(read)
    return found


def _part(kind: str, record: Any) -> Part:
    return Part(kind, attributes_of(record), len(arguments_of(record)))


def attributes_of(record: Any) -> dict[str, Any]:
    """A record's attributes that are set, by name, in declaration order: a helper as its `Part`, a container of
    helpers as a tuple of them; and, where it holds several containers of terms, each one's size, a `Part` named by
    the container, after them."""
    schema = record.as_schema()
    _, variadic, names = _parts(schema)
    helpers = _helpers(schema)
    values: dict[str, Any] = {}
    for name in names:
        if name in helpers:
            found = [_part(*helper) for helper in _helper_records(record, name)]
            many = isinstance(schema.properties[name].schema, Schemas.OfContainer.Data)
            values[name] = (tuple(found) if many else found[0]) if found else None
        else:
            values[name] = _scalar(record, name)
    if len(variadic) > 1:
        values.update({name: Part(name, {}, len(_variadic(record, name))) for name in variadic})
    return {name: value for name, value in values.items() if value is not None}


def _arguments(record: Any) -> tuple[Any, ...]:
    """A record's own arguments: its slots, None where empty, then its variadic arguments, each container's in turn."""
    slots, variadic, _ = _parts(record.as_schema())
    return tuple(_slot(record, name) for name in slots) + tuple(
        argument for name in variadic for argument in _variadic(record, name))


def arguments_of(record: Any) -> tuple[Any, ...]:
    """A record's arguments: its slots, None where empty, then its variadic arguments, then its helpers' arguments, in
    order."""
    found = _arguments(record)
    for name in _helpers(record.as_schema()):
        for _, helper in _helper_records(record, name):
            found += arguments_of(helper)
    return found


def form(term_: Any) -> Form:
    """A term's `Form`."""
    tag, record = kind_of(term_)
    return Form(tag, attributes_of(record), arguments_of(record))


@dataclass(frozen=True)
class Node:
    """A term or a helper, its helpers nested: its `kind` (its tag, or its helper's), its `attributes` (scalars, and
    containers of scalars, by name), its `slots` (its terms by property, None where empty), its `many` (its variadic
    arguments: terms, or a pair's members in turn, each container's in declaration order), its `helpers` (by property:
    a `Node`, or a tuple of them) and its `lists` (its variadic arguments by container: a `solve ... before ...`
    constraint's `solve` and `before`)."""

    kind: str
    attributes: Mapping[str, Any] = field(default_factory=dict)
    slots: Mapping[str, Any] = field(default_factory=dict)
    many: tuple[Any, ...] = ()
    helpers: Mapping[str, Any] = field(default_factory=dict)
    lists: Mapping[str, tuple[Any, ...]] = field(default_factory=dict)


def _split(variadic: tuple[str, ...], attributes: Mapping[str, Any], terms: Any, kind: str) -> dict[str, tuple[Any, ...]]:
    """A kind's variadic arguments by container: one container holds them all; several, each the size its `Part` in
    the attributes gives, one with none given holding none, but the last, which holds the rest."""
    if len(variadic) == 1:
        return {variadic[0]: tuple(terms)}
    found: dict[str, tuple[Any, ...]] = {}
    start = 0
    for i, name in enumerate(variadic):
        part = attributes.get(name)
        size = part.size if isinstance(part, Part) else len(terms) - start if i == len(variadic) - 1 else 0
        found[name] = tuple(terms[start:start + size])
        start += size
    if start != len(terms):
        raise ValueError(f"{_article(kind)}'s {', '.join(variadic)} hold {start} arguments, got {len(terms)}")
    return found


def _nest(schema: Any, kind: str, attributes: Mapping[str, Any], arguments: tuple[Any, ...]) -> Node:
    """A record's `Node`, from its schema, its form's attributes and its arguments, as `form` reads them."""
    slot_names, variadic, _ = _parts(schema)
    helper_names = _helpers(schema)
    held = {name: attributes[name] for name in helper_names if name in attributes}
    size = sum(part.size for value in held.values() for part in (value if isinstance(value, tuple) else (value,)))
    i = len(arguments) - size
    helpers: dict[str, Any] = {}
    for name, value in held.items():
        prop = schema.properties[name].schema
        element = prop.element if isinstance(prop, Schemas.OfContainer.Data) else prop
        nodes = []
        for part in (value if isinstance(value, tuple) else (value,)):
            sub = ({branch.name: branch.schema for branch in element.branches}[part.kind]
                   if isinstance(element, Schemas.OfUnion.Data) else element)
            nodes.append(_nest(sub, part.kind, part.attributes, arguments[i:i + part.size]))
            i += part.size
        helpers[name] = tuple(nodes) if isinstance(value, tuple) else nodes[0]
    sizes = set(variadic) if len(variadic) > 1 else set()  # the containers' sizes, which the lists give
    plain = {name: value for name, value in attributes.items() if name not in held and name not in sizes}
    slots = dict(zip(slot_names, arguments))
    many = tuple(arguments[len(slot_names):len(arguments) - size])
    return Node(kind, plain, slots, many, helpers, _split(variadic, attributes, many, kind) if variadic else {})


def node(tag: str, record: Any) -> Node:
    """A record's `Node`, a term's (its tag and record, as `kind_of` gives them) or a helper's, its helpers nested."""
    return _nest(record.as_schema(), tag, attributes_of(record), arguments_of(record))


def reference_name(value: Any) -> Any:
    """The name an attribute `name` gives: a string, or, where a name is a node (C++'s `idexpression`, holding its
    `Name`), an identifier's spelling; None for a name node that is not an identifier (`std::cout`), or none."""
    if isinstance(value, Part):
        return value.attributes.get("spelling") if value.kind == "identifier" else None
    return value


def name_of(term_: Any) -> Any:
    """The name a reference refers to, or a binding, quantifier or import binds: its `name`, a string, or the spelling
    of the identifier its name node is (C++'s `idexpression`); None if it has none, or its name is not an identifier."""
    _, record = kind_of(term_)
    schema = record.as_schema()
    if "name" not in schema.properties:
        return None
    if "name" in _helpers(schema):  # a name node
        return reference_name(attributes_of(record).get("name"))
    return _scalar(record, "name")


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
    """Whether two terms have the same structure: their dialects, kinds, attributes (scalars of one type by value; NaN
    is NaN, and -0.0 is not 0.0) and arguments in order."""

    def visit(x: Any, y: Any) -> bool:
        if x is None or y is None:
            return x is y
        fx, fy = form(x), form(y)
        return (dialect_of(x) == dialect_of(y) and fx.kind == fy.kind and fx.attributes.keys() == fy.attributes.keys()
                and all(_same_native(fx.attributes[k], fy.attributes[k]) for k in fx.attributes)
                and len(fx.arguments) == len(fy.arguments) and all(map(visit, fx.arguments, fy.arguments)))

    return visit(term(a), term(b))


# --- Writing terms: specs ---


class Writer:
    """A spec that writes a term through the builders: called with the `Visitors.OfProperty` of a term property, the
    `Visitors.OfAny` of a container's element or the `Visitors.OfUnion` of a term value, it selects its kind's branch
    and writes it. `write(union)` is given the `Visitors.OfUnion` of its dialect's `Term`: where a value of
    `Expressions.Framework.Term` is written, the writer first selects the branch of its `dialect` (`python3`), and a
    writer of no dialect is given `Term`'s own. Each dialect derives its own, with its dialect, and methods."""

    __slots__ = ("write", "dialect")

    def __init__(self, write: Callable[[Any], Any], dialect: str | None = None):
        self.write, self.dialect = write, dialect

    def __call__(self, visitor: Any) -> Any:
        if isinstance(visitor.as_schema(), Schemas.OfProperty.Data):
            return visitor.as_value(self)
        if _is_any(visitor):
            return visitor.as_union(self._union)
        self._union(visitor)
        return visitor

    def _union(self, union: Any) -> Any:
        if self.dialect is not None and _named(union.as_schema(), TERM):
            return getattr(union, self.dialect)(self.write)
        return self.write(union)


def _copy(value: Any) -> Writer:
    """The writer of a copy of a term value, in its dialect."""
    union = dialect_of(value)
    tag, record = kind_of(value)

    def write(target: Any) -> Any:
        schema = target.as_schema()
        if _named(schema, TERM):  # the branch of the term's dialect, found by its union
            branch = {member.schema.name: member.name for member in schema.branches}[union]
            return getattr(target, branch)(lambda u: getattr(u, tag)(record))
        return getattr(target, tag)(record)

    return Writer(write)


def spec(value: Any, literal: Callable[[Any], Writer | None] | None = None, dialect: str | None = None) -> Writer:
    """The writer of a term: a writer as it is, a term value's (copied), a native value's as `literal` writes it (when
    it gives one), or a callable's that takes the `Visitors.OfUnion` of a term value: of the union of `dialect` (its
    branch of `Term`, `python3`) where one is given, else of what is written."""
    if isinstance(value, Writer):
        return value
    if is_term(value):
        return _copy(value)
    if literal is not None and type(value) in Schemas.SCALAR_TYPES:
        written = literal(value)
        if written is not None:
            return written
    if callable(value) and not isinstance(value, type):
        return Writer(value, dialect)
    raise TypeError(f"expected a term, a writer or a native value, got {value!r}")


def _pair(members: tuple[str, ...], terms: Any) -> Callable[[Any], Any]:
    """The spec of a value object of terms (a mapping's pair), its members written from `terms` in order."""

    def write(element: Any) -> Any:
        def record(o: Any) -> Any:
            for member, written in zip(members, terms):
                if written is not None:
                    getattr(o, member)(written)
            return o

        return element.as_object(record)

    return write


def _labelled(record: Any) -> list[tuple[str, str, Any]]:
    """A record's arguments, as `arguments_of` gives them, each with its label (`left`, `argument 0`, `key 1`,
    `keywords 0 value`) and its path (`left`, `argument`, `key`, `keywords.value`)."""
    schema = record.as_schema()
    slots, variadic, _ = _parts(schema)
    found = [(slot, slot, argument) for slot, argument in zip(slots, _arguments(record))]
    for name in variadic:  # one container's are `argument j`; each of several's, by its name: `solve j`
        members, word = _members(schema, name), name if len(variadic) > 1 else "argument"
        for j, argument in enumerate(_variadic(record, name)):
            member = members[j % len(members)] if members else None
            label = f"{member} {j // len(members)}" if member is not None else f"{word} {j}"
            found.append((label, member or word, argument))
    for name in _helpers(schema):
        many = isinstance(schema.properties[name].schema, Schemas.OfContainer.Data)
        for i, (_, helper) in enumerate(_helper_records(record, name)):
            prefix = f"{name} {i}" if many else name
            found += [(f"{prefix} {label}", f"{name}.{path}", argument) for label, path, argument in _labelled(helper)]
    return found


def _fill(r: Any, kind: str, attributes: Mapping[str, Any], arguments: list[Any]) -> Any:
    """Writes a record of a term or a helper (`kind`, for messages): its attributes, then its arguments, in order, to
    its slots, its variadic property and its helpers, each helper's part taking its size."""
    schema = r.as_schema()
    slots, variadic, names = _parts(schema)
    helpers = _helpers(schema)
    parts: list[tuple[str, Part]] = []
    for name, value in attributes.items():
        if len(variadic) > 1 and name in variadic and isinstance(value, Part):  # a container's size
            continue
        if name not in names:
            raise ValueError(f"{_article(kind)} has no attribute {name!r}")
        if name in helpers:
            for part in (value if isinstance(value, tuple) else (value,)):
                parts.append((name, part))
        elif isinstance(value, Objects.Listed):  # a container of scalars, such as a literal's problems
            getattr(r, name)(list(value.values))
        else:
            getattr(r, name)(lambda p, value=value: p.as_scalar(value))
    held = sum(part.size for _, part in parts)
    if len(arguments) < len(slots) + held or (not variadic and len(arguments) != len(slots) + held):
        least = "" if not variadic else "at least "
        raise ValueError(f"{_article(kind)} takes {least}{len(slots) + held} arguments, got {len(arguments)}")
    for name, argument in zip(slots, arguments):
        if argument is not None:
            getattr(r, name)(argument)
    if variadic:
        for name, rest in _split(variadic, attributes, arguments[len(slots):len(arguments) - held], kind).items():
            members = _members(schema, name)
            if members and len(rest) % len(members):
                raise ValueError(f"{_article(kind)} takes its arguments in {len(members)}s "
                                 f"({', '.join(members)}), got {len(rest)}")
            getattr(r, name)(list(rest) if not members else [
                _pair(members, rest[i:i + len(members)]) for i in range(0, len(rest), len(members))])
    offset = len(arguments) - held
    for name in helpers:
        mine = [part for owner, part in parts if owner == name]
        if not mine:
            continue
        specs = []
        for part in mine:
            specs.append(_helper_spec(schema.properties[name].schema, part, arguments[offset:offset + part.size]))
            offset += part.size
        if isinstance(schema.properties[name].schema, Schemas.OfContainer.Data):
            getattr(r, name)([lambda a, spec=spec: spec(a) for spec in specs])
        else:
            getattr(r, name)(lambda a, spec=specs[0]: spec(a))
    return r


def _helper_spec(schema: Any, part: Part, arguments: list[Any]) -> Callable[[Any], Any]:
    """The spec of a helper, from its part and its arguments: given the visitor of a property or of a container's
    element, it writes the helper, the union's branch its part's kind where a union of helpers holds it."""
    element = schema.element if isinstance(schema, Schemas.OfContainer.Data) else schema

    def fill(o: Any) -> Any:
        return _fill(o, part.kind, part.attributes, arguments)

    def write(visitor: Any) -> Any:
        if isinstance(visitor.as_schema(), Schemas.OfProperty.Data):  # a property: its value
            return visitor.as_value(write)
        if isinstance(element, Schemas.OfUnion.Data):  # a value: a property's, or a container's element
            return visitor.as_union(lambda u: getattr(u, part.kind)(fill))
        return visitor.as_object(fill)

    return write


# --- Dialects ---


@dataclass(frozen=True)
class Kind:
    """How the framework reads a kind, beyond its schema: its `role`; the property naming its operator (`operator`,
    or None when its tag names it); for an application or a quantifier, its `vocabulary` (operator names to signatures;
    None accepts any name, with `signature`), and whether it is `closed`, its dialect defining its operations and no
    others, so that evaluation refuses any other; where its operations are data, those its dialect defines in a store
    (`operations(store)`, by name, each its `Schemas.OfExpression`), which validation reads in place of its vocabulary
    from the store of the term's holder (`Proxies.store_of`: a lone term belongs to no store), refusing any other
    whether or not it asks for the core, its vocabulary left to `infer`; the properties it
    requires (`required`); for a reference, whether it is `lexical` and the `ambient` names bound without a declaration;
    for an import, the names it binds, of its attributes (`names(attributes)`); its own problems (`check(record)`); the
    domain its own attributes give it, where they give one (`typed(record)`: C's type of a constant or a cast; a
    term carries no domain). The standards that have it are data, its schema's `standards` (`Framework.Standards`).
    Where its role says too little: the slots that may be empty (`optional`, by path: a slot's name, a pair's member's,
    or a helper property's name, a dot, and the path within the helper: `generators.target`; or, written `*.size`, a
    helper's slot of that name at any depth, as a type name's declarators nest); the names each of its
    arguments has bound, besides its scope's (`scopes(record)`, one set per argument: a comprehension's targets, a
    lambda's parameters); the operators it applies, where it applies several (`operators(attributes)`: a comparison
    chain's), each checked against its vocabulary, and the domain they give (`result(attributes, domains)`); an
    equivalent form of simpler terms (`unfold(form)`, or None: a comparison chain as the `and` of its links), which
    translation reads where no rule reads the term itself; and, for a literal, the attributes that spell it rather than
    give its value (`spelling`), which no translation carries."""

    role: str
    operator: str | None = None
    vocabulary: Mapping[str, Domains.Signature] | None = None
    signature: Domains.Signature | None = None
    required: tuple[str, ...] = ()
    lexical: bool = True
    ambient: frozenset[str] = frozenset()
    names: Callable[[Mapping[str, Any]], tuple[str, ...]] | None = None
    check: Callable[[Any], list[str]] | None = None
    typed: Callable[[Any], Domains.Domain | None] | None = None
    closed: bool = False
    operations: Callable[[Any], Mapping[str, Any]] | None = None
    optional: tuple[str, ...] = ()
    scopes: Callable[[Any], list[frozenset[str]]] | None = None
    operators: Callable[[Mapping[str, Any]], tuple[str, ...]] | None = None
    result: Callable[[Mapping[str, Any], list[Domains.Domain]], Domains.Domain] | None = None
    unfold: Callable[[Form], Form | None] | None = None
    spelling: tuple[str, ...] = ("text", "problems")


def invalid_problems(tag: str, attributes: Mapping[str, Any]) -> list[str]:
    """What invalid syntax is, `error` or `missing` by its tag: an error, the source it spans; a missing term, the kind
    the parser expected. Where a sublanguage's union holds invalid syntax (a dialect's `Type` or `Pattern`), the
    dialect's checks report it so, as validation reads a helper's own problems no further."""
    if tag == "error":
        return ["invalid syntax" + (f" {attributes['text']!r}" if "text" in attributes else "")]
    return [f"missing {attributes.get('kind', 'a term')}"]


def _invalid_check(record: Any) -> list[str]:
    """What invalid syntax is: an error, the source it spans; a missing term, the kind the parser expected."""
    tag = "error" if record.as_schema().name == "Expressions.Framework.Error" else "missing"
    return invalid_problems(tag, attributes_of(record))


def invalid_text(dialect: Dialect, tag: str, attributes: Mapping[str, Any]) -> str:
    """How a printer writes invalid syntax: an error as the source it spans, as written, and a missing term as nothing;
    an error with no text has nothing to print, and is refused by name."""
    if tag == "missing":
        return ""
    if "text" not in attributes:
        raise ValueError(f"{dialect.name()} error has no text to print")
    return attributes["text"]


INVALID_KINDS = {"error": Kind(INVALID, check=_invalid_check), "missing": Kind(INVALID, check=_invalid_check)}
"""The framework's kinds of invalid syntax, which every dialect's `Term` holds and every dialect reads."""


SUBLANGUAGES = ("Types", "Patterns", "Assertions", "Constraints", "Preprocessor", "RegExp")
"""The sublanguages a family's dialects may be, by their own names (the namespace decision): a dialect whose own name is
one of them is named by its family too (`SystemVerilog Types`), so that no two families' sublanguages share a name."""


def dialect_name(path: str) -> str:
    """A dialect's name, of its path below `Expressions` (its family's name and its own): its own (`Python.Python3`'s
    is `Python3`, `Patterns.Expressions`' `Patterns`), or its family's where its own says only that it is the family's
    expressions (`C.Expressions`' is `C`), or its family's and its own where its own is a sublanguage's
    (`SUBLANGUAGES`: `SystemVerilog.Types`' is `SystemVerilog Types`)."""
    family, _, own = path.rpartition(".")
    if own == "Expressions" and family:
        return family.rpartition(".")[2]
    if own in SUBLANGUAGES and family:
        return f"{family.rpartition('.')[2]} {own}"
    return own


def dialect_tag(name: str) -> str:
    """A dialect's tag, its branch of `Expressions.Framework.Term` and of `Expressions.Framework.Dialect`: its name in
    lowercase, a space an underscore (`systemverilog_types`)."""
    return name.lower().replace(" ", "_")


def is_binder(schema: Any) -> bool:
    """Whether a kind's schema binds names: `Expressions.Framework.Let`, or a schema refining it, as every kind that binds
    symbols does (the dialects proposal, Decided for stage 6, Q8, "(a)"). A binder binds by its kind's `scopes` where it
    has them, else its `name` within its arguments after the first."""
    while isinstance(schema, Schemas.OfObject.Data):
        if _named(schema, "Expressions.Framework.Let"):
            return True
        schema = schema.refines
    return False


class Dialect:
    """An expression language: the kinds it reads, by tag, its `path`, its family's and its own name
    (`Python.Python3`, `C.Expressions`), its `name` (`dialect_name(path)`: `Python3`, `C`, `SystemVerilog Types`), and
    `domain_of(value)`, the domain of a literal's value by the scalar it is written with (for `infer`; a term carries no
    domain). Its terms are values of its `Term`, `Expressions.<path>.Term` (`union`), the branch `tag`
    (`dialect_tag(name)`: `python3`, `systemverilog_types`) of `Expressions.Framework.Term`;
    besides its own kinds it reads the framework's kinds of invalid syntax (`INVALID_KINDS`). A dialect may extend
    another (`extends`): its kinds are the base's and its own, whose tags must differ from the base's, added to the
    base's union, whose terms it reads. A dialect may read the terms of other dialects (`reads`, a callable giving
    them, called once when first needed, so that dialects that read each other are built without a cycle): a term of
    their `Term`s, by their kinds, and a term of its own `Term` of a kind they declare and its `Term` lists (one schema
    a branch of every union whose positions hold it); any other dialect's term it refuses. It validates (`validate`),
    infers (`infer`) and writes (`make`) terms of its kinds."""

    def __init__(self, path: str, kinds: Mapping[str, Kind], *, domain_of: Callable[[Any], Domains.Domain],
                 literal: Callable[[Any], Writer | None] | None = None, extends: Dialect | None = None,
                 reads: Callable[[], Iterable[Dialect]] | None = None):
        name = dialect_name(path)
        inherited = INVALID_KINDS if extends is None else extends.kinds()
        clashes = sorted(tag for tag in kinds if tag in inherited)
        if clashes:
            what = "the framework" if extends is None else extends.name()
            raise ValueError(f"{name} would declare {', '.join(map(repr, clashes))}, which {what} has")
        ordered = {**kinds, **inherited} if extends is None else {**inherited, **kinds}  # the base's first
        self._name, self._kinds, self._domain_of, self.base = name, ordered, domain_of, extends
        self._literal = literal if literal is not None or extends is None else extends._literal
        self.tag = dialect_tag(name) if extends is None else extends.tag
        self.path = path
        self.union = f"Expressions.{path}.Term" if extends is None else extends.union
        self._reads, self._read = reads, None

    def name(self) -> str:
        return self._name

    def kinds(self) -> dict[str, Kind]:
        """Its own kinds, by tag (an extension's, its base's too)."""
        return dict(self._kinds)

    def reads(self) -> tuple[Dialect, ...]:
        """The other dialects whose terms it reads, in the order its `reads` gives them."""
        if self._read is None:
            self._read = tuple(self._reads()) if self._reads is not None else ()
        return self._read

    def kind_named(self, tag: str) -> Kind:
        """The `Kind` of a tag, as this dialect reads it: its own, else the first that a dialect it reads declares;
        raises `ValueError` for a tag none of them has."""
        if tag in self._kinds:
            return self._kinds[tag]
        for other in self.reads():
            if tag in other._kinds:
                return other._kinds[tag]
        raise ValueError(f"{self._name} has no kind {tag!r}")

    def __repr__(self) -> str:
        return f"<dialect {self._name}>"

    def _reader(self, term_: Any) -> Dialect | None:
        """The dialect that reads a term value: this one, for a term of its `Term`; one it reads, for a term of that
        one's; or None, for a term of any other dialect."""
        union = dialect_of(term_)
        if union == self.union:
            return self
        return next((other for other in self.reads() if other.union == union), None)

    def _foreign(self, term_: Any) -> str:
        """Why a term value of another dialect, which it does not read, is not of this dialect."""
        other = dialect_name(dialect_of(term_)[len("Expressions."):-len(".Term")])
        return f"{_article(other)} {kind_of(term_)[0]} is not {_article(self._name)} term"

    def kind(self, term_: Any) -> tuple[str, Any, Kind]:
        """A term's tag, record and `Kind`, as this dialect reads it (a term of a dialect it reads, as that one does);
        raises `ValueError` for a term of another dialect, or of a kind the dialect does not read."""
        reader = self._reader(term_)
        if reader is None:
            raise ValueError(self._foreign(term_))
        if reader is not self:
            return reader.kind(term_)
        tag, record = kind_of(term_)
        return tag, record, self.kind_named(tag)

    def spec(self, value: Any) -> Writer:
        """The writer of a term of this dialect: see `spec`, a native value as this dialect's literal, and a callable
        given the `Visitors.OfUnion` of this dialect's `Term`."""
        return spec(value, self._literal, self.tag)

    def make(self, form_: Form) -> Writer:
        """The writer of a term with this form: its attributes written as scalars (a container of scalars as a
        container, a helper's `Part` as the helper), its arguments (specs: terms, writers, native values) to its slots
        in order, then to its variadic properties, each the size its part gives where it has several, then to its
        helpers, each its part's size. Its kind is one this
        dialect reads (`kind_named`), written where a union holds it."""
        self.kind_named(form_.kind)
        arguments = [None if a is None else self.spec(a) for a in form_.arguments]

        def write(union: Any) -> Any:
            return getattr(union, form_.kind)(lambda r: _fill(r, form_.kind, form_.attributes, arguments))

        return Writer(write, self.tag)

    # Checks

    def validate(self, term_: Any, bound: Iterable[str] = (), core: bool = False) -> list[str]:
        """Problems with a term. References must be bound by an enclosing binding or be in `bound`. With `core`, every
        operator must be in its kind's vocabulary."""
        return self._problems(term(term_), frozenset(bound), core)

    def _problems(self, node: Any, bound: frozenset[str], core: bool) -> list[str]:
        reader = self._reader(node)
        if reader is None:
            return [self._foreign(node)]
        if reader is not self:  # a term of a dialect it reads, as that one reads it
            return reader._problems(node, bound, core)
        tag, record = kind_of(node)
        try:
            kind = self.kind_named(tag)
        except ValueError as error:
            return [str(error)]
        what = _article(tag)
        attributes = attributes_of(record)
        declared = record.as_schema().properties
        if kind.role == LITERAL:  # its problems, as its text's reader found them; a value it needs, where it has one
            found = list(attributes["problems"].values) if "problems" in attributes else []
            if "value" in declared and attributes.get("value") is None:
                return found or [f"{what} needs a value"]
            return found + (kind.check(record) if kind.check is not None else [])
        if kind.role == INVALID:
            return kind.check(record)  # type: ignore[misc]
        problems = [f"{what} needs {_article(name)}" for name in kind.required if attributes.get(name) in (None, "")]
        for name, value in attributes.items():  # the builders write any scalar; validation reports the wrong one
            scalar = declared[name].schema
            if isinstance(scalar, Schemas.OfScalar.Data) and type(value) is not scalar.type:
                problems.append(f"{what}'s {name} must be a {scalar.type.__name__}, got {_type_name(value)}")
        if kind.check is not None:
            problems += kind.check(record)
        name = reference_name(attributes.get("name"))
        if kind.role == REFERENCE:
            if kind.lexical and not problems and name is not None and name not in bound and name not in kind.ambient:
                problems.append(f"{tag} {name!r} is not bound")
            if not isinstance(attributes.get("name"), Part):
                return problems
            # a name node: a name that is not an identifier is resolved by the scope alone (`std::cout`), and the terms
            # within it (a template's arguments) are checked as an application's are
        labelled = _labelled(record)
        arguments = [argument for _, _, argument in labelled]
        scopes = [bound] * len(arguments)
        if kind.scopes is not None:  # what each argument has bound: a binder's, or a comprehension's targets
            scopes = [bound | names for names in kind.scopes(record)]
        elif kind.role == QUANTIFIER or is_binder(record.as_schema()):  # its name, within its arguments after the first
            inner = bound | {name} if not problems else bound
            scopes = [bound, *[inner] * (len(arguments) - 1)]
        elif kind.role == IMPORT:
            names = kind.names(attributes) if kind.names is not None and not problems else ()
            scopes = [bound | set(names)] * len(arguments)
        if kind.operations is not None and not problems:  # its operations are data: its holder's store's
            defined = {name: Domains.arity(operation)
                       for name, operation in kind.operations(Proxies.store_of(node)).items()}
            operator = operator_of(node, kind)
            if operator not in defined:
                problems.append(f"{operator!r} is not an operation {self._name} defines")
            elif defined[operator] != len(arguments):
                problems.append(f"{operator} takes {defined[operator]} arguments, got {len(arguments)}")
        elif kind.role in (APPLICATION, QUANTIFIER) and not problems and kind.vocabulary is not None:
            vocabulary = kind.vocabulary
            if kind.operators is not None:  # several, each checked against the vocabulary
                problems += [f"{operator!r} is not a core operation" for operator in kind.operators(attributes)
                             if core and operator not in vocabulary]
            else:
                operator = operator_of(node, kind)
                if operator in vocabulary and vocabulary[operator].arity() not in (-1, len(arguments)):  # -1: any number
                    problems.append(f"{operator} takes {vocabulary[operator].arity()} arguments, got {len(arguments)}")
                elif core and operator not in vocabulary:
                    problems.append(f"{operator!r} is not a core operation")
        for (label, path, argument), scope in zip(labelled, scopes):
            if argument is None:
                if path not in kind.optional and not any(
                        entry.startswith("*.") and path.endswith(entry[1:]) for entry in kind.optional):
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
        reader = self._reader(node)
        if reader is not self and reader is not None:  # a term of a dialect it reads, as that one infers it
            return reader._infer(node, environment)
        tag, record, kind = self.kind(node)
        if kind.role == LITERAL:
            typed = kind.typed(record) if kind.typed is not None else None
            return typed or self._domain_of(_scalar(record, "value"))
        if kind.role == REFERENCE:
            name = name_of(node)
            return environment[name] if kind.lexical and name in environment else Domains.Anything
        arguments = arguments_of(record)
        if kind.role == IMPORT:
            names = kind.names(attributes_of(record)) if kind.names is not None else ()
            return self._infer(arguments[-1], {**environment, **{name: Domains.Anything for name in names}})
        if kind.scopes is not None:  # what each argument has bound, of a domain not known statically
            environments = [{**environment, **dict.fromkeys(names, Domains.Anything)} for names in kind.scopes(record)]
        else:
            environments = [environment] * len(arguments)
        if is_binder(record.as_schema()) and kind.scopes is None:  # a let: its name, of its value's domain, in its body
            value = self._infer(arguments[0], environment)
            return self._infer(arguments[-1], {**environment, name_of(node): value})
        operator = operator_of(node, kind)
        signature = kind.signature if kind.vocabulary is None else kind.vocabulary.get(operator)
        if kind.role == QUANTIFIER:  # its name has the domain of the collection's items
            collection = self._infer(arguments[0], environment)
            item = Domains.Anything if signature is None else signature.items(collection)  # type: ignore[attr-defined]
            inner = {**environment, name_of(node): item}
            domains = [collection, *(self._infer(argument, inner) for argument in arguments[1:])]
        else:  # an empty slot, where it may be empty, is not known
            domains = [Domains.Anything if argument is None else self._infer(argument, scope)
                       for argument, scope in zip(arguments, environments)]
        if kind.result is not None:  # several operators, which the kind applies itself
            result = kind.result(attributes_of(record), domains)
        elif signature is None:
            return Domains.Anything  # an extension: nothing is known about it
        else:
            result = signature.result(domains)
        if result is None:
            names = ", ".join(domain.name() for domain in domains)
            raise TypeError(f"{operator} cannot take ({names}); it takes {signature.describe()}")
        typed = kind.typed(record) if kind.typed is not None else None
        return result if typed is None else typed  # an application of a domain of its own gives it
