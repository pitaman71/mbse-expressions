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
"""

from __future__ import annotations

from typing import Any

from mbse.Schemas.Framework import Readers

from . import Objects

__all__ = ["standards", "designation_of", "tags", "find", "properties", "kinds", "of"]


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
