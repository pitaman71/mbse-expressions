"""Standards: the editions of the standards each dialect covers, as data, and the kinds each has.

A dialect owns each edition it covers by its designation, as its standards body writes it (`ISO/IEC 9899:2011`,
`IEEE Std 754-2019`), through `Expressions.Framework.Covers`; an edition is an `Expressions.Framework.Standard`, holding
its formal reference's parts (its `bodies` by reverse-domain name, one or a joint pair; its `number`; its `revision`,
a year, an edition or a version) and its common `names` (`C11`), so that a reference of either kind finds it (mbse-basis [CAP-268: standards as tagged data](mbse:mbse-basis/docs/capabilities/CAP-268.md#decided), "Standards as tags", Q10: "If we treat standards as tags, we could support both"). Each kind's schema records
the editions that have it (`Expressions.Framework.HasStandard`); a kind none has is an extension, or invalid syntax.
See mbse-basis [CAP-268: standards as tagged data](mbse:mbse-basis/docs/capabilities/CAP-268.md).

The reading interface, over a dialect's or an edition's `Readers.OfObject`, found by its path
(`dialect.standards({"designation": "ISO/IEC 9899:2011"})`):

- `standards(dialect)`: a dialect's editions by designation, in the order the store holds the entries.
- `designation_of(standard)`: the designation its dialect covers it by, or None.
- `tags(standard)`: its designation, then its common names: the references it is found by.
- `find(dialect, tag)`: the edition a dialect covers whose designation or common name is `tag`, or None.
- `properties(standard)`: its formal reference's parts and its common names that are set, by name: a container as a
  tuple, its `revision` as its branch and its value (`("year", 2011)`).
- `kinds(standard)`: the schemas of the kinds it has, in the order the store holds the entries; `of(dialect, kind)`:
  the editions a dialect covers that have a kind, given its schema, by designation. A kind's schema reads the same
  entries from its side, through its extension adjacency `standards`.

What changes from one edition to the next within a kind is data too: a grammar clause, an alternative within a
production of the dialect's grammar, a language feature (mbse-basis [grammar clauses by version](mbse:mbse-basis/proposals/GRAMMAR-CLAUSES.md), "No minimum versions": "PEP 614 removing a restriction is still a conditional clause just with an opposite sense of version progression").
A dialect owns each by name (`Expressions.Framework.Specifies`); an `Expressions.Framework.GrammarClause` is a kind
(`Expressions.Framework.HasGrammarClause`, which the kind's schema reads through its extension adjacency
`grammar_clauses`), one of its properties, and what that property may hold there: present or absent (`present`), one
of these values (`values`), or a term of one of these kinds (`Expressions.Framework.Holds`), each kind's term holding
what the nested grammar clauses of that kind say (`Expressions.Framework.Nests`). An edition allows or forbids it
(`Expressions.Framework.Allows`, `Expressions.Framework.Forbids`), each entry with the optional flags `before` and
`after`, as the user decided: "Add two optional properties on `Allows` and `Forbids` : 'before' and 'after' which are
only used by the system to guess support in the case that an edition has no representation. And a grammar clause that
has no `Allows` or `Forbids` should default to allows." The reading:

- `grammar_clauses(dialect)`: a dialect's grammar clauses by name, in the order the store holds the entries;
  `grammar_clause_name(clause)`: the name its dialect owns it by, or None.
- `grammar_clause(clause)`: what it says, by name: its `kind`'s schema, its `property`, and what it holds, `present`
  (a bool), `values` (a tuple) or `kinds` (their schemas, a tuple), and its `nested` grammar clauses where it has any.
- `takes(dialect, term)`: the grammar clauses of a dialect that a term, or a helper, takes, in the order of
  `grammar_clauses(dialect)`: those of its kind whose property holds what they say, a container where one of its
  elements does, a term of one of their kinds where it takes each of their nested grammar clauses of its kind.
- `allows(standard, clause)`: whether an edition allows a grammar clause: by its own `Allows` or `Forbids` of it;
  where it has neither, the data not representing it, by those of its neighbours, the nearest editions before and
  after it by revision that have one, of its standard's number, an `after` entry's before it and a `before` entry's
  after it, where they agree *(agent)*; otherwise allowed.

A dialect's `define` writes its grammar clauses from a table, each a `GrammarClause` made by `present`, `absent`,
`values` or `kinds`, with the editions that allow it: `grammar_clauses_spec(txn, clauses, schemas, editions)` gives
the symbols and the specs that write them in its frame, beside its editions.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from typing import Any, NamedTuple

from mbse.Schemas.Framework import Readers, Schemas

from . import Objects, Terms

__all__ = ["standards", "designation_of", "tags", "find", "properties", "kinds", "of", "grammar_clauses",
           "grammar_clause_name", "grammar_clause", "takes", "allows", "GrammarClause", "present", "absent", "values",
           "kinds_of", "grammar_clauses_spec"]


def standards(dialect: Readers.OfObject) -> dict[str, Readers.OfObject]:
    """A dialect's editions by designation (`Expressions.Framework.Covers`), each its `Expressions.Framework.Standard`,
    in the order the store holds the entries: as its `define` wrote them, or, read back from a snapshot, by
    designation, as mbse-schemas writes a relation's entries sorted by its key."""
    return {str(entry.values["designation"]): entry.targets["standard"]
            for entry in Objects.entries(dialect, "standards")}


def designation_of(standard: Readers.OfObject) -> str | None:
    """The designation a stored edition's dialect covers it by, its `Expressions.Framework.Covers` entry's; None where
    no dialect covers it."""
    return next((str(entry.values["designation"]) for entry in Objects.entries(standard, "dialect")), None)


def _names(standard: Readers.OfObject) -> tuple[str, ...]:
    names = Objects.properties(standard).get("names")
    return () if names is None else tuple(names.values)


def tags(standard: Readers.OfObject) -> tuple[str, ...]:
    """The references a stored edition is found by: its designation, where a dialect covers it, then its common
    names."""
    designation = designation_of(standard)
    return (*([] if designation is None else [designation]), *_names(standard))


def find(dialect: Readers.OfObject, tag: str) -> Readers.OfObject | None:
    """The edition a dialect covers whose designation or common name is `tag`; None where none is."""
    return next((standard for designation, standard in standards(dialect).items()
                 if tag == designation or tag in _names(standard)), None)


def properties(standard: Readers.OfObject) -> dict[str, object]:
    """A stored edition's properties that are set, by name, in its schema's order: its `bodies` and `names` as tuples,
    its `number` as itself, and its `revision` as its branch and its value (`("year", 2011)`)."""
    found = Objects.properties(standard)
    revision = found.get("revision")
    return {name: tuple(value.values) if isinstance(value, Objects.Listed)
            else next(iter(Objects.properties(revision).items())) if name == "revision" else value
            for name, value in found.items()}


def kinds(standard: Readers.OfObject) -> list[Any]:
    """The schemas of the kinds a stored edition has (`Expressions.Framework.HasStandard`), in the order the store holds
    the entries."""
    return [entry.targets["kind"] for entry in Objects.entries(standard, "kinds")]


def of(dialect: Readers.OfObject, kind: Any) -> dict[str, Readers.OfObject]:
    """The editions a dialect covers that have a kind, given its schema, by designation, in the order of
    `standards(dialect)`."""
    return {designation: standard for designation, standard in standards(dialect).items()
            if any(held is kind for held in kinds(standard))}


def grammar_clauses(dialect: Readers.OfObject) -> dict[str, Readers.OfObject]:
    """A dialect's grammar clauses by name (`Expressions.Framework.Specifies`), each its
    `Expressions.Framework.GrammarClause`, in the order the store holds the entries."""
    return {str(entry.values["name"]): entry.targets["clause"] for entry in Objects.entries(dialect, "grammar_clauses")}


def grammar_clause_name(clause: Readers.OfObject) -> str | None:
    """The name a stored grammar clause's dialect owns it by, its `Expressions.Framework.Specifies` entry's; None where
    no dialect owns it."""
    return next((str(entry.values["name"]) for entry in Objects.entries(clause, "dialect")), None)


def _kind(clause: Readers.OfObject) -> Any:
    return next((entry.targets["kind"] for entry in Objects.entries(clause, "kind")), None)


def _nested(clause: Readers.OfObject) -> tuple[Readers.OfObject, ...]:
    return tuple(entry.targets["nested"] for entry in Objects.entries(clause, "nested"))


def _holds(clause: Readers.OfObject) -> tuple[str, Any]:
    """What a grammar clause's property may hold: `("values", (...))`, `("present", bool)` or `("kinds", (...))`."""
    found = Objects.properties(clause)
    if "values" in found:
        return "values", tuple(found["values"].values)
    if "present" in found:
        return "present", found["present"]
    return "kinds", tuple(entry.targets["kind"] for entry in Objects.entries(clause, "kinds"))


def grammar_clause(clause: Readers.OfObject) -> dict[str, Any]:
    """What a stored grammar clause says, by name: its `kind`, its kind's schema; its `property`; what that property
    may hold, `present` (a bool), `values` (a tuple) or `kinds` (their schemas, a tuple); and its `nested` grammar
    clauses, a tuple, where it has any."""
    holds, held = _holds(clause)
    nested = _nested(clause)
    return {"kind": _kind(clause), "property": Objects.properties(clause).get("property"), holds: held,
            **({"nested": nested} if nested else {})}


def _record(value: Any) -> Any:
    """The record of a term, or of a helper: its kind's branch's, through a union of helpers."""
    if Terms.is_term(value):
        return Terms.kind_of(value)[1]
    while not isinstance(value.as_schema(), Schemas.OfObject.Data):
        ((_, value),) = Objects.properties(value).items()
    return value


def _same(a: Any, b: Any) -> bool:
    """Two scalars the same, of the same type: `True` is not `1`, as in TypeScript."""
    return type(a) is type(b) and a == b


def _takes(clause: Readers.OfObject, record: Any) -> bool:
    """Whether a term's or a helper's record, of the grammar clause's kind, takes it."""
    value = Objects.properties(record).get(Objects.properties(clause)["property"])
    elements = () if value is None else value.values if isinstance(value, Objects.Listed) else (value,)
    holds, held = _holds(clause)
    if holds == "present":
        return bool(elements) == held
    if holds == "values":
        return any(_same(element, one) for element in elements for one in held)
    nested = _nested(clause)
    for element in elements:
        inner = _record(element)
        schema = inner.as_schema()
        if any(kind is schema for kind in held) and all(
                _takes(each, inner) for each in nested if _kind(each) is schema):
            return True
    return False


def takes(dialect: Readers.OfObject, term: Any) -> list[Readers.OfObject]:
    """The grammar clauses of a dialect that a term or a helper takes, in the order of `grammar_clauses(dialect)`: those
    of its kind whose property holds what they say. A property that is a container holds what one of its elements
    does; a term held is of one of a grammar clause's kinds where it takes each of its nested grammar clauses of that
    kind. Nothing within the term is read but what its grammar clauses' properties hold: a caller walks the tree."""
    record = _record(term)
    schema = record.as_schema()
    return [clause for clause in grammar_clauses(dialect).values() if _kind(clause) is schema and _takes(clause, record)]


def _verdicts(clause: Readers.OfObject) -> list[tuple[Readers.OfObject, bool, dict[str, Any]]]:
    """Each edition that names a grammar clause, whether it allows it, and its entry's flags."""
    return [(entry.targets["standard"], allowed, entry.values)
            for adjacency, allowed in (("allowed", True), ("forbidden", False))
            for entry in Objects.entries(clause, adjacency)]


def _order(standard: Readers.OfObject) -> tuple[Any, ...] | None:
    """Where an edition stands among its standard's editions: its number and its revision's branch, then its value, a
    version by its dotted numbers; None where it has no revision."""
    found = properties(standard)
    if "revision" not in found:
        return None
    branch, value = found["revision"]
    return (found.get("number"), branch), tuple(int(part) for part in value.split(".")) if branch == "version" else (value,)


def allows(standard: Readers.OfObject, clause: Readers.OfObject) -> bool:
    """Whether an edition allows a grammar clause: by its own `Allows` or `Forbids` of it; where it has neither, by the
    flagged entries of its neighbours, the nearest editions of its standard before and after it, by revision, that name
    it, an entry before it flagged `after` and one after it flagged `before`, where those agree; otherwise, as a grammar
    clause no edition names, allowed."""
    verdicts = _verdicts(clause)
    own = [allowed for named, allowed, _ in verdicts if named is standard]
    if own:
        return own[0]
    order = _order(standard)
    placed = [(at[1], allowed, flags) for named, allowed, flags in verdicts
              if order is not None and (at := _order(named)) is not None and at[0] == order[0] and at[1] != order[1]]
    before = [at for at, _, _ in placed if at < order[1]] if placed else []
    after = [at for at, _, _ in placed if at > order[1]] if placed else []
    guesses = {allowed for at, allowed, flags in placed
               if (before and at == max(before) and flags.get("after")) or (after and at == min(after) and flags.get("before"))}
    return guesses.pop() if len(guesses) == 1 else True


# --- Writing a dialect's grammar clauses ---


class GrammarClause(NamedTuple):
    """A grammar clause as a dialect's `define` writes it: its `name`; its `kind`, a key of the define's schemas (a
    kind's tag, a helper's schema's name's last part, lowercased: `comprehension`); its `property`; what that property
    may hold, `holds` (`present`, `values` or `kinds`) and `held` (a bool, the values, or the kinds' keys); the names
    of its `nested` grammar clauses; and the editions that allow it, `allowed`, by their symbols in the define's frame,
    every other edition it covers forbidding it, or None where no edition names it (a grammar clause only nested)."""

    name: str
    kind: str
    property: str
    holds: str
    held: Any
    nested: tuple[str, ...]
    allowed: tuple[str, ...] | None


def present(name: str, kind: str, prop: str, allowed: tuple[str, ...] | None) -> GrammarClause:
    """A grammar clause: a kind's property set (a container not empty)."""
    return GrammarClause(name, kind, prop, "present", True, (), allowed)


def absent(name: str, kind: str, prop: str, allowed: tuple[str, ...] | None) -> GrammarClause:
    """A grammar clause: a kind's property unset (a container empty)."""
    return GrammarClause(name, kind, prop, "present", False, (), allowed)


def values(name: str, kind: str, prop: str, held: tuple[Any, ...], allowed: tuple[str, ...] | None) -> GrammarClause:
    """A grammar clause: a kind's property holding one of these values (a container, one of its elements)."""
    return GrammarClause(name, kind, prop, "values", held, (), allowed)


def kinds_of(name: str, kind: str, prop: str, held: tuple[str, ...], nested: tuple[str, ...],
             allowed: tuple[str, ...] | None) -> GrammarClause:
    """A grammar clause: a kind's property holding a term of one of these kinds (a container, one of its elements),
    which takes each of the `nested` grammar clauses of its kind."""
    return GrammarClause(name, kind, prop, "kinds", held, nested, allowed)


def grammar_clauses_spec(txn: Any, clauses: Sequence[GrammarClause], schemas: Mapping[str, Any],
                         editions: Sequence[str]) -> tuple[dict[str, Any], list[Callable[[Any], Any]]]:
    """The symbols and the specs a dialect's `define` writes its grammar clauses with, in a frame binding its dialect
    (`dialect`) and its editions: each grammar clause by `grammar_clause_<its index>`, owned by its name, its kind's
    and its kinds' schemas by key (`schemas`), and each edition (`editions`, by symbol, oldest first) allowing it where
    `allowed` lists it, else forbidding it, the oldest edition's entry flagged `before` and the newest's `after`, so
    that an edition the data does not represent is guessed to have what its nearest neighbour has."""
    symbol = {clause.name: f"grammar_clause_{index}" for index, clause in enumerate(clauses)}
    GC = txn.Expressions.Framework.GrammarClause

    def entry(_: Any, index: int) -> Any:
        standard = getattr(_, editions[index])
        flags = {"before": index == 0, "after": index == len(editions) - 1}
        if not any(flags.values()):
            return standard
        return lambda t: [getattr(t.standard(standard), flag)(True) for flag, on in flags.items() if on]

    def write(clause: GrammarClause) -> Callable[[Any], Any]:
        def spec(_: Any) -> Any:
            built = getattr(_, symbol[clause.name]).property(clause.property).kind([schemas[clause.kind]])
            if clause.holds == "present":
                built = built.present(clause.held)
            elif clause.holds == "values":
                built = built.values(list(clause.held))
            else:
                built = built.kinds([schemas[kind] for kind in clause.held]).nested(
                    [getattr(_, symbol[name]) for name in clause.nested])
            if clause.allowed is None:
                return built
            return built.allowed([entry(_, i) for i, edition in enumerate(editions) if edition in clause.allowed]).forbidden(
                [entry(_, i) for i, edition in enumerate(editions) if edition not in clause.allowed])
        return spec

    return ({symbol[clause.name]: GC for clause in clauses},
            [lambda _: _.dialect.grammar_clauses({clause.name: lambda e, clause=clause: e.clause(getattr(_, symbol[clause.name]))
                                                  for clause in clauses}), *(write(clause) for clause in clauses)])
