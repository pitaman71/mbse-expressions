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
  entries from its side, through its extension adjacency `standards`. Each `HasStandard` entry has the optional
  flags `before` and `after`, as a grammar clause's `Allows` and `Forbids` entries have them, as the user decided
  (mbse-basis [grammar clauses by version](mbse:mbse-basis/proposals/GRAMMAR-CLAUSES.md), "Decided in stage 3", 1
  (b)): an entry of a standard's oldest edition a dialect covers is flagged `before`, and one of its newest `after`,
  extending the kind's membership to the editions before or after it that the data does not represent.
- `edition_has(dialect, designation, revision, kind)`: whether an edition given by its designation and its revision
  has a kind, whether the dialect covers it or not: one it does not cover is guessed from its neighbours' flagged
  `HasStandard` entries of the kind.

What changes from one edition to the next within a kind is data too: a grammar clause, an alternative within a
production of the dialect's grammar, a language feature (mbse-basis [grammar clauses by
version](mbse:mbse-basis/proposals/GRAMMAR-CLAUSES.md), "No minimum versions": "PEP 614 removing a restriction is still
a conditional clause just with an opposite sense of version progression"). A dialect owns each by name
(`Expressions.Framework.Specifies`); an `Expressions.Framework.GrammarClause` is a kind
(`Expressions.Framework.HasGrammarClause`, which the kind's schema reads through its extension adjacency
`grammar_clauses`), one of its properties, and what that property may hold there: present or absent (`present`), one of
these values (`values`), or a term of one of these kinds (`Expressions.Framework.Holds`), each kind's term holding what
any of the nested grammar clauses of that kind says (`Expressions.Framework.Nests`); of a container, what `any` of its
elements holds, `every` one or `none` (`quantifier`), at least `at_least` of them; and taken only where the grammar
clauses it requires are taken too, on the same term (`Expressions.Framework.Requires`), as the user decided of these
forms: "2. that's fine". An edition allows or forbids it
(`Expressions.Framework.Allows`, `Expressions.Framework.Forbids`), each entry with the optional flags `before` and
`after`, as the user decided: "Add two optional properties on `Allows` and `Forbids` : 'before' and 'after' which are
only used by the system to guess support in the case that an edition has no representation. And a grammar clause that
has no `Allows` or `Forbids` should default to allows." The reading:

- `grammar_clauses(dialect)`: a dialect's grammar clauses by name, in the order the store holds the entries;
  `grammar_clause_name(clause)`: the name its dialect owns it by, or None.
- `grammar_clause(clause)`: what it says, by name: its `kind`'s schema, its `property`, and what it holds, `present`
  (a bool), `values` (a tuple) or `kinds` (their schemas, a tuple), its `quantifier` and `at_least` where they are set,
  and its `nested` grammar clauses and those it `requires` where it has any.
- `takes(dialect, term)`: the grammar clauses of a dialect that a term, or a helper, takes, in the order of
  `grammar_clauses(dialect)`, each with the indices of the elements of its property that took it, or None where the
  property as a whole did: those of its kind whose property holds what they say, a container where `any` of its
  elements does (the default; `every` one, or `none`, as its quantifier says), at least `at_least` of them, a term of
  one of their kinds where it takes any of their nested grammar clauses of its kind ("The "open universe" design
  philosophy is interpreted by unions as "any"."), and each only where those it `requires` are taken too.
- `allows(standard, clause)`: whether a stored edition allows a grammar clause: by its own `Allows` or `Forbids` of
  it; where it has neither, the data not representing it, by those of its neighbours, the nearest editions before and
  after it by revision that have one, of its standard's number, an `after` entry's before it and a `before` entry's
  after it, where they agree *(agent)*; otherwise allowed. `edition_allows(dialect, designation, revision, clause)`:
  the same of an edition given by its designation and its revision, whether the dialect covers it or not.

A dialect's `define` writes its grammar clauses from a table, each a `GrammarClause` made by `present`, `absent`,
`values` or `kinds_of`, with the editions that allow it, and given its further forms by `every`, `none`, `at_least` and
`requires`, and, where it records what an edition before the data removed, by `removed`: `grammar_clauses_spec(txn,
dialect, clauses, schemas, editions)` gives the symbols and the specs that write them in its frame, beside its
editions, its dialect bound by the symbol `dialect`, each entry flagged by what is true beyond it; and
`editions_spec(editions, kinds)` the specs writing the kinds each edition has, each entry flagged by what is true
beyond it.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from typing import Any, NamedTuple

from mbse.Schemas.Framework import Readers, Schemas

from . import Objects, Terms

__all__ = ["standards", "designation_of", "tags", "find", "properties", "kinds", "of", "grammar_clauses",
           "grammar_clause_name", "grammar_clause", "takes", "allows", "edition_allows", "edition_has", "GrammarClause",
           "present", "absent", "values", "kinds_of", "every", "none", "at_least", "requires", "removed",
           "editions_spec", "grammar_clauses_spec"]


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


def _requires(clause: Readers.OfObject) -> tuple[Readers.OfObject, ...]:
    return tuple(entry.targets["required"] for entry in Objects.entries(clause, "requires"))


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
    may hold, `present` (a bool), `values` (a tuple) or `kinds` (their schemas, a tuple); its `quantifier` (`every` or
    `none`) and its count, `at_least`, where they are set; and its `nested` grammar clauses and those it `requires`,
    each a tuple, where it has any."""
    holds, held = _holds(clause)
    found = Objects.properties(clause)
    nested, required = _nested(clause), _requires(clause)
    return {"kind": _kind(clause), "property": found.get("property"), holds: held,
            **{name: found[name] for name in ("quantifier", "at_least") if name in found},
            **({"nested": nested} if nested else {}), **({"requires": required} if required else {})}


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


def _hits(clause: Readers.OfObject, element: Any, holds: str, held: Any) -> bool:
    """Whether one element a grammar clause's property holds (a scalar property's value) is what it says one is: set,
    one of its values, or a term of one of its kinds that takes any of its nested grammar clauses of that kind, or is of
    a kind none is of (mbse-basis [PRI-020: no constraint, any
    configuration](mbse:mbse-basis/docs/principles/PRI-020.md#decided): "The "open universe" design philosophy is
    interpreted by unions as "any".")."""
    if holds == "present":
        return True
    if holds == "values":
        return any(_same(element, one) for one in held)
    inner = _record(element)
    schema = inner.as_schema()
    alternatives = [each for each in _nested(clause) if _kind(each) is schema]
    return any(kind is schema for kind in held) and (
        not alternatives or any(_taken(each, inner) is not None for each in alternatives))


def _taken(clause: Readers.OfObject, record: Any) -> tuple[int, ...] | None | bool:
    """Whether a term's or a helper's record, of the grammar clause's kind, takes it: None where it does not; where it
    does, the indices of the elements of its property that hold what it says, where that property is a container and
    it says what an element holds (`values` or `kinds`, of `any` or `every` element), else True."""
    found = Objects.properties(clause)
    value = Objects.properties(record).get(found["property"])
    listed = isinstance(value, Objects.Listed)
    elements = () if value is None else value.values if listed else (value,)
    holds, held = _holds(clause)
    hits = [index for index, element in enumerate(elements) if _hits(clause, element, holds, held)]
    quantifier, least = found.get("quantifier", "any"), found.get("at_least", 1)
    if holds == "present" and not held:
        ok = not elements
    elif quantifier == "none":
        ok = not hits
    else:
        ok = len(hits) >= least and (quantifier != "every" or len(hits) == len(elements))
    schema = record.as_schema()
    if not ok or not all(_kind(each) is schema and _taken(each, record) is not None for each in _requires(clause)):
        return None
    return tuple(hits) if listed and holds != "present" and quantifier != "none" else True


def takes(dialect: Readers.OfObject, term: Any) -> list[tuple[Readers.OfObject, tuple[int, ...] | None]]:
    """The grammar clauses of a dialect that a term or a helper takes, in the order of `grammar_clauses(dialect)`, each
    with the elements that took it: those of its kind whose property holds what they say. A property that is a
    container holds what `any` of its elements does (or `every` one, or `none`, as its `quantifier` says), at least
    `at_least` of them; a term held is of one of a grammar clause's kinds where it takes any of its nested grammar
    clauses of that kind, or none is of its kind; and a grammar clause is taken only where those it `requires` are
    taken too. Each comes with the indices of the elements of its property that took it, where that property is a
    container and it says what an element holds (`values` or `kinds`, of `any` or `every` element); else None, the
    property as a whole taking it (set or unset, a scalar, a count of it, or `none` of its elements). The grammar
    clauses taken are each pair's first. Nothing within the term is read but what its grammar clauses' properties hold:
    a caller walks the tree."""
    record = _record(term)
    schema = record.as_schema()
    found = [(clause, _taken(clause, record))
             for clause in grammar_clauses(dialect).values() if _kind(clause) is schema]
    return [(clause, None if elements is True else elements) for clause, elements in found if elements is not None]


def _verdicts(clause: Readers.OfObject) -> list[tuple[Readers.OfObject, bool, dict[str, Any]]]:
    """Each edition that names a grammar clause, whether it allows it, and its entry's flags."""
    return [(entry.targets["standard"], allowed, entry.values)
            for adjacency, allowed in (("allowed", True), ("forbidden", False))
            for entry in Objects.entries(clause, adjacency)]


def _at(number: Any, revision: tuple[str, Any]) -> tuple[Any, ...]:
    """Where an edition stands among its standard's editions, given its number and its revision: its number and its
    revision's branch, then its value, a version by its dotted numbers."""
    branch, value = revision
    return (number, branch), tuple(int(part) for part in value.split(".")) if branch == "version" else (value,)


def _order(standard: Readers.OfObject) -> tuple[Any, ...] | None:
    """Where a stored edition stands among its standard's editions (`_at`); None where it has no revision."""
    found = properties(standard)
    return _at(found.get("number"), found["revision"]) if "revision" in found else None  # type: ignore[arg-type]


def _guesses(entries: Sequence[tuple[Any, bool, Mapping[str, Any]]], order: tuple[Any, ...]) -> set[bool]:
    """The verdicts of the flagged entries nearest an edition at `order`, of its standard, each entry where its edition
    stands, its verdict and its flags: the nearest before it flagged `after`, and the nearest after it flagged
    `before`."""
    placed = [(at[1], verdict, flags) for at, verdict, flags in entries
              if at is not None and at[0] == order[0] and at[1] != order[1]]
    before = [at for at, _, _ in placed if at < order[1]]
    after = [at for at, _, _ in placed if at > order[1]]
    return {verdict for at, verdict, flags in placed
            if (before and at == max(before) and flags.get("after"))
            or (after and at == min(after) and flags.get("before"))}


def allows(standard: Readers.OfObject, clause: Readers.OfObject) -> bool:
    """Whether a stored edition allows a grammar clause: by its own `Allows` or `Forbids` of it; where it has neither,
    by the flagged entries of its neighbours, the nearest editions of its standard before and after it, by revision,
    that name it, an entry before it flagged `after` and one after it flagged `before`, where those agree; otherwise,
    as a grammar clause no edition names, allowed."""
    verdicts = _verdicts(clause)
    own = [allowed for named, allowed, _ in verdicts if named is standard]
    if own:
        return own[0]
    order = _order(standard)
    if order is None:
        return True
    guesses = _guesses([(_order(named), allowed, flags) for named, allowed, flags in verdicts], order)
    return guesses.pop() if len(guesses) == 1 else True


def _placed(dialect: Readers.OfObject, designation: str, revision: tuple[str, Any]) -> tuple[Any, ...] | None:
    """Where an edition a dialect does not cover stands, given its designation and its revision: as `_order` places a
    stored one, its standard that of the dialect's editions whose designations differ from its own only in their
    revisions' text (`ISO/IEC 9899:2029` C's, `Python 3.16` Python 3's) *(agent)*; None where none does."""
    def stem(text: str, value: Any) -> str | None:
        head, found, tail = text.rpartition(str(value))
        return head + tail if found else None

    own = stem(designation, revision[1])
    for named, standard in standards(dialect).items():
        found = properties(standard)
        theirs: Any = found.get("revision")
        if own is not None and theirs is not None and theirs[0] == revision[0] and stem(named, theirs[1]) == own:
            return _at(found.get("number"), revision)
    return None


def edition_allows(dialect: Readers.OfObject, designation: str, revision: tuple[str, Any],
                   clause: Readers.OfObject) -> bool:
    """Whether an edition, given by its designation and its revision (`("year", 2029)`, `("version", "3.16")`),
    allows a grammar clause, whether its dialect covers it or not: as `allows` reads the edition the dialect covers by
    that designation; where it covers none, the data not representing it, by the flagged entries of its neighbours,
    the nearest editions of its standard (`_placed`) before and after it that name the grammar clause, where those
    agree; otherwise allowed."""
    stored = standards(dialect).get(designation)
    if stored is not None:
        return allows(stored, clause)
    order = _placed(dialect, designation, revision)
    if order is None:
        return True
    guesses = _guesses([(_order(named), allowed, flags) for named, allowed, flags in _verdicts(clause)], order)
    return guesses.pop() if len(guesses) == 1 else True


def edition_has(dialect: Readers.OfObject, designation: str, revision: tuple[str, Any], kind: Any) -> bool:
    """Whether an edition, given by its designation and its revision, has a kind, given its schema, whether its
    dialect covers it or not: by its own `Expressions.Framework.HasStandard` entries, where the dialect covers it by
    that designation; where it covers none, the data not representing it, where a neighbour has it, the nearest edition
    of its standard (`_placed`) before it that has it, its entry flagged `after`, or the nearest after it, its entry
    flagged `before` *(agent)*; otherwise not."""
    stored = standards(dialect).get(designation)
    if stored is not None:
        return any(held is kind for held in kinds(stored))
    order = _placed(dialect, designation, revision)
    return order is not None and bool(_guesses(
        [(_order(standard), True, entry.values) for standard in standards(dialect).values()
         for entry in Objects.entries(standard, "kinds") if entry.targets["kind"] is kind], order))


# --- Writing a dialect's grammar clauses ---


class GrammarClause(NamedTuple):
    """A grammar clause as a dialect's `define` writes it: its `name`; its `kind`, a key of the define's schemas (a
    kind's tag, a helper's schema's name's last part, lowercased: `comprehension`); its `property`; what that property
    may hold, `holds` (`present`, `values` or `kinds`) and `held` (a bool, the values, or the kinds' keys); the names
    of its `nested` grammar clauses; and the editions that allow it, `allowed`, by their symbols in the define's frame,
    every other edition it covers forbidding it, or None where no edition names it (a grammar clause only nested or
    only required); and, of a container, its `quantifier` (`any`, `every` or `none`) and its count, `at_least`; the
    names of the grammar clauses it `requires`; and whether it is `removed`, a construct the editions before the oldest
    one the define covers had, which that one's entry, forbidding it, therefore does not extend to (`before`)."""

    name: str
    kind: str
    property: str
    holds: str
    held: Any
    nested: tuple[str, ...]
    allowed: tuple[str, ...] | None
    quantifier: str
    at_least: int
    requires: tuple[str, ...]
    removed: bool


def present(name: str, kind: str, prop: str, allowed: tuple[str, ...] | None) -> GrammarClause:
    """A grammar clause: a kind's property set (a container not empty)."""
    return GrammarClause(name, kind, prop, "present", True, (), allowed, "any", 1, (), False)


def absent(name: str, kind: str, prop: str, allowed: tuple[str, ...] | None) -> GrammarClause:
    """A grammar clause: a kind's property unset (a container empty)."""
    return GrammarClause(name, kind, prop, "present", False, (), allowed, "any", 1, (), False)


def values(name: str, kind: str, prop: str, held: tuple[Any, ...], allowed: tuple[str, ...] | None) -> GrammarClause:
    """A grammar clause: a kind's property holding one of these values (a container, one of its elements)."""
    return GrammarClause(name, kind, prop, "values", held, (), allowed, "any", 1, (), False)


def kinds_of(name: str, kind: str, prop: str, held: tuple[str, ...], nested: tuple[str, ...],
             allowed: tuple[str, ...] | None) -> GrammarClause:
    """A grammar clause: a kind's property holding a term of one of these kinds (a container, one of its elements),
    which takes any of the `nested` grammar clauses of its kind, where any is of its kind."""
    return GrammarClause(name, kind, prop, "kinds", held, nested, allowed, "any", 1, (), False)


def every(clause: GrammarClause) -> GrammarClause:
    """A grammar clause of a container: every element of it holding what `clause` says one holds, and at least one."""
    return clause._replace(quantifier="every")


def none(clause: GrammarClause) -> GrammarClause:
    """A grammar clause of a container: none of its elements holding what `clause` says one holds."""
    return clause._replace(quantifier="none")


def at_least(count: int, clause: GrammarClause) -> GrammarClause:
    """A grammar clause of a container: at least `count` of its elements holding what `clause` says one holds (each,
    where it says the container is set: `at_least(2, present(...))`, two elements or more)."""
    return clause._replace(at_least=count)


def requires(clause: GrammarClause, names: tuple[str, ...]) -> GrammarClause:
    """A grammar clause taken only where the grammar clauses `names` are taken too, on the same term, each of its kind:
    two properties together (C23's `u8` character, its `prefix` and its `quote`)."""
    return clause._replace(requires=names)


def _flagged(editions: Sequence[Sequence[str]]) -> dict[str, list[str]]:
    """Each edition, by its symbol, in the order given, and the flags its entries have, what is true beyond it: each
    standard's oldest edition's `before`, its newest's `after`."""
    return {edition: [flag for flag, on in (("before", index == 0), ("after", index == len(standard) - 1)) if on]
            for standard in editions for index, edition in enumerate(standard)}


def editions_spec(editions: Sequence[Sequence[str]], kinds: Mapping[str, Sequence[Any]]) -> list[Callable[[Any], Any]]:
    """The specs a dialect's `define` writes the kinds of its editions with (`Expressions.Framework.HasStandard`),
    given its editions by their symbols in its frame, grouped by standard, each standard's oldest first (C's then
    C++'s), and the schemas of the kinds each has, by its symbol: each entry flagged by what is true beyond it, as
    `grammar_clauses_spec` flags the entries of grammar clauses, an entry of each standard's oldest edition `before`
    and one of its newest `after`, so that an edition the data does not represent is guessed to have the kinds its
    nearest neighbours have (`edition_has`). A kind its oldest edition lacks has no entry there, so none flagged
    `before`."""
    def entry(kind: Any, flags: Sequence[str]) -> Any:
        if not flags:
            return kind
        return lambda t: [getattr(t.kind(kind), flag)(True) for flag in flags]

    return [lambda _, edition=edition, flags=flags: getattr(_, edition).kinds(
        [entry(kind, flags) for kind in kinds[edition]]) for edition, flags in _flagged(editions).items()]


def removed(clause: GrammarClause) -> GrammarClause:
    """A grammar clause an edition removed, which the editions before the oldest one the define covers allowed (C++17's
    `throw(int)`): no entry of it is flagged `before`, so that an edition before the data is guessed, as no entry
    reaches it, to allow it; by default, a construct the oldest edition forbids is one added later, its entry flagged
    `before`, an edition before the data guessed to forbid it too."""
    return clause._replace(removed=True)


def grammar_clauses_spec(txn: Any, dialect: str, clauses: Sequence[GrammarClause], schemas: Mapping[str, Any],
                         editions: Sequence[Sequence[str]]) -> tuple[dict[str, Any], list[Callable[[Any], Any]]]:
    """The symbols and the specs a dialect's `define` writes its grammar clauses with, in a frame binding its dialect,
    by the symbol `dialect`, and its editions: each grammar clause by `grammar_clause_<its index>`, owned by its name,
    its kind's and its kinds' schemas by key (`schemas`), its quantifier and its count where they are not the default,
    the grammar clauses it nests and requires, and each edition (`editions`, by symbol, each standard's oldest first:
    Python 3's, or C's then C++'s) allowing it where `allowed` lists it, else forbidding it, each entry flagged by what
    is true beyond it: each standard's oldest edition's `before`, but a `removed` grammar clause's, and its newest's
    `after`, so that an edition the data does not represent is guessed to have what is true beyond its nearest
    neighbour."""
    symbol = {clause.name: f"grammar_clause_{index}" for index, clause in enumerate(clauses)}
    GC = txn.Expressions.Framework.GrammarClause
    flagged = _flagged(editions)

    def entry(_: Any, edition: str, clause: GrammarClause) -> Any:
        standard = getattr(_, edition)
        flags = [flag for flag in flagged[edition] if not (flag == "before" and clause.removed)]
        if not flags:
            return standard
        return lambda t: [getattr(t.standard(standard), flag)(True) for flag in flags]

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
            if clause.quantifier != "any":
                built = built.quantifier(clause.quantifier)
            if clause.at_least != 1:
                built = built.at_least(clause.at_least)
            if clause.requires:
                built = built.requires([getattr(_, symbol[name]) for name in clause.requires])
            if clause.allowed is None:
                return built
            return built.allowed([entry(_, edition, clause) for edition in flagged if edition in clause.allowed]
                                 ).forbidden([entry(_, edition, clause) for edition in flagged
                                              if edition not in clause.allowed])
        return spec

    return ({symbol[clause.name]: GC for clause in clauses},
            [lambda _: getattr(_, dialect).grammar_clauses({
                clause.name: lambda e, clause=clause: e.clause(getattr(_, symbol[clause.name])) for clause in clauses}),
             *(write(clause) for clause in clauses)])
