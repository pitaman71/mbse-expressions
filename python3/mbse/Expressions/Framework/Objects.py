"""Objects: the data objects expressions are evaluated over, read through mbse-schemas' visitor protocol (`Readers`).

A data object is a `Readers.OfObject`, such as a proxy, or a union or intersection value, read as a record of its one
branch or its parts: `is_object(value)`. A reference object (`is_reference`) has an identity, which equality compares;
a value object compares by its properties. `properties(value)` gives the properties set (a union's branch, an
intersection's parts), by name, each as evaluators read it: a scalar as itself, a value object, union or intersection
value as its visitor, and a container as `Listed`, its elements in order and, unless they are indexed densely by ints,
their indices.
`entries(value, adjacency)` gives an adjacency's entries, each its other links' objects and its properties' values.
"""

from __future__ import annotations

from typing import Any, NamedTuple

from mbse.Schemas.Framework import Readers, Schemas

__all__ = ["Listed", "Entry", "is_object", "is_reference", "properties", "entries"]


class Listed(NamedTuple):
    """A container's elements in order, and their indices, or None where the container is dense by int."""

    values: tuple[Any, ...]
    keys: tuple[Any, ...] | None


class Entry(NamedTuple):
    """An entry seen from one object: the objects its other links name, and the values of its properties that are set."""

    targets: dict[str, Any]
    values: dict[str, Any]


_RECORDS = (Schemas.OfObject.Data, Schemas.OfUnion.Data, Schemas.OfIntersection.Data)


def is_object(value: Any) -> bool:
    """Whether `value` is a data object: the visitor of an object, a union value or an intersection value."""
    schema = getattr(value, "as_schema", None)
    return callable(schema) and isinstance(schema(), _RECORDS)


def is_reference(value: Any) -> bool:
    """Whether `value` is a reference object, which has an identity."""
    return is_object(value) and isinstance(value.as_schema(), Schemas.OfObject.Data) and value.as_identity() is not None


def _present(visitor: Any) -> bool:
    return visitor.as_schema() is not None


def _held(read: Readers.OfAny) -> Any:
    """The value a `Readers.OfAny` holds, as evaluators read it; None if it holds none."""
    found: list[Any] = []
    read.as_scalar(lambda s: found.extend([] if s.get() is None else [s.get()]) or s)
    for select in ("as_object", "as_union", "as_intersection"):
        getattr(read, select)(lambda v: found.extend([v] if _present(v) else []) or v)
    read.as_container(lambda c: found.extend([_listed(c)] if _present(c) else []) or c)
    return found[0] if found else None


def _listed(read: Readers.OfContainer) -> Listed:
    pairs: list[tuple[Any, Any]] = []
    read.as_entries(lambda it: pairs.extend(it))
    index = Schemas.structure(read.as_schema().index)
    dense = read.as_schema().arrangement == "dense" and isinstance(index, Schemas.OfScalar.Data) and index.type is int
    return Listed(tuple(_held(element) for _, element in pairs), None if dense else tuple(i for i, _ in pairs))


def _value(read: Any) -> Any:
    found: list[Any] = []
    read.as_value(lambda a: found.append(_held(a)) or a)
    return found[0]


def _member(read: Any, schema: Any) -> Any:
    """A union's branch or an intersection's part, whose visitor is of its type's kind; None if it is absent."""
    held = Schemas.structure(schema)
    if isinstance(held, Schemas.OfScalar.Data):
        return read.get()
    if not _present(read):
        return None
    return _listed(read) if isinstance(held, Schemas.OfContainer.Data) else read


def properties(value: Any) -> dict[str, Any]:
    """The properties set on a data object, by name, in its schema's order: a union value's one branch, and an
    intersection value's parts."""
    schema = value.as_schema()
    if isinstance(schema, Schemas.OfObject.Data):
        return {prop.as_schema().name: _value(prop) for prop in value.as_properties}
    members = {name: _member(getattr(value, name), member.type) for name, member in schema.properties.items()}
    return {name: member for name, member in members.items() if member is not None}


def entries(value: Readers.OfObject, adjacency: str) -> list[Entry]:
    """The entries of a data object's adjacency, in order; none if its schema has no such adjacency."""
    schema = getattr(value.as_schema(), "adjacencies", {}).get(adjacency)  # a union or intersection value has none
    if schema is None:
        return []
    relation = schema.relation.entry
    found = []
    for entry in getattr(value, adjacency):
        targets = {name: getattr(entry, name) for name in relation.links if name != schema.me}
        values = {name: _value(getattr(entry, name)) for name in relation.properties}
        found.append(Entry(targets, {name: v for name, v in values.items() if v is not None}))
    return found
