"""Domains of the Patterns dialect, in code: the domains `Dialect.infer` gives Patterns' values, and the signatures of
its operations, for inference; and the values its folding rules give collections and entries.

Patterns holds no kinds of domain and owns no domains: as data they are the standard dialects' (ISO/IEC 11404's,
IEEE 754's, IEEE 1164's and Unicode's, `mbse.Expressions.ISOIEC11404.Expressions` and the others), read through the
framework's reading interface (`Framework.Domains.kind_of`, `properties`, `name_of`), and Patterns' operations are
data, which validation reads from the store of a term's holder. What is here is `Dialect.infer`'s, in code, to be
replaced with stored domains and operations as domain inference reads them
([CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)).

The natives' domains are `Bool`, `Int`, `Float`, `Str` and `Bytes`, each the values of exactly that type (the
framework's `OfTypes`), as a term carries no domain and a value is taken by the schema it is written with: an int is
an unbounded integer, a float an IEEE 754 binary64 number. `of(value)` gives a native's. `Object` holds data objects
read through mbse-schemas' readers (`Framework.Objects`), terms and value objects among them, and `Anything` is the
domain of a value not known statically, such as a property read with `get`. Unknown (`None`) is not a domain.

`SIGNATURES` gives each operation's signature, for inference, following its folding rules: comparisons take two
values of one domain, ordered for ints, floats, strs and bytes; logic takes bools; arithmetic takes two numbers of one
domain and gives that domain, and the bitwise operations and shifts ints. `QUANTIFIERS` are the quantifiers', and
`LIST` and `MAPPING` the container constructors'; `List` and `Keyed` are the domains of collections, `Records` of an
adjacency's entries.

`Collection` and `Record` are its folding rules' values: a collection's items (and a keyed list's keys), and an entry, as
`entries` gives it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Domains as D, Objects
from mbse.Expressions.Framework.Domains import Anything

__all__ = [
    "Bool", "Int", "Float", "Str", "Bytes", "Object", "Anything", "SIGNATURES", "QUANTIFIERS", "LIST", "MAPPING", "of",
    "Collection", "Record", "List", "Keyed", "Records", "items_of",
]


# --- Collections ---


@dataclass(frozen=True)
class Collection:
    """A collection's items, in order, and for a keyed list their `keys` (None for a positional one)."""

    items: tuple[Any, ...]
    keys: tuple[Any, ...] | None = None

    def __repr__(self) -> str:
        if self.keys is None:
            return f"[{', '.join(map(repr, self.items))}]"
        return "{" + ", ".join(f"{k!r}: {v!r}" for k, v in zip(self.keys, self.items)) + "}"


@dataclass(frozen=True)
class Record:
    """An entry, as `entries` gives it: the targets of its other links and its property values, by name."""

    fields: dict[str, Any]

    def __repr__(self) -> str:
        return f"record({', '.join(f'{k}={v!r}' for k, v in self.fields.items())})"


@dataclass(frozen=True)
class List:
    """The domain of positional collections of `item`, for inference."""

    item: Any

    def name(self) -> str:
        return f"list({self.item.name()})"

    def contains(self, value: Any) -> bool:
        return (isinstance(value, Collection) and value.keys is None and all(map(self.item.contains, value.items))) or (
            isinstance(value, (list, tuple)) and all(map(self.item.contains, value)))

    def includes(self, other: Any) -> bool:
        if isinstance(other, D.OfUnion):
            return all(self.includes(member) for member in other.members)
        return other == self

    def __repr__(self) -> str:
        return self.name()


@dataclass(frozen=True)
class Keyed:
    """The domain of keyed collections from `key` to `item`, for inference."""

    key: Any
    item: Any

    def name(self) -> str:
        return f"keyed({self.key.name()}, {self.item.name()})"

    def contains(self, value: Any) -> bool:
        return isinstance(value, Collection) and value.keys is not None and all(map(self.key.contains, value.keys)) and all(
            map(self.item.contains, value.items))

    def includes(self, other: Any) -> bool:
        if isinstance(other, D.OfUnion):
            return all(self.includes(member) for member in other.members)
        return other == self

    def __repr__(self) -> str:
        return self.name()


def items_of(domain: Any) -> D.Domain:
    """The domain of a collection's items: a list's or a keyed list's item domain, otherwise unknown."""
    return domain.item if isinstance(domain, (List, Keyed)) else Anything


# --- The natives' domains and the operations' signatures: `Dialect.infer`'s, CAP-232's to replace ---

Bool, Int, Float, Str, Bytes = (D.OfTypes(t.__name__, t) for t in (bool, int, float, str, bytes))
Object = D.OfValues("object", Objects.is_object)

_NATIVES: dict[type, D.Domain] = {bool: Bool, int: Int, float: Float, str: Str, bytes: Bytes}

Records = D.OfValues("record", lambda value: isinstance(value, Record))
_COLLECTIONS = D.OfValues("collection", lambda value: isinstance(value, (Collection, list, tuple)))
_COMPARABLE = (Bool, Int, Float, Str, Bytes, Object)
_ORDERED = (Int, Float, Str, Bytes)
_NUMBERS = (Int, Float)
_LOGIC = D.Function((Bool, Bool), Bool)


class _Collective:
    """An operation on a collection: `parameters` after the collection, and its result, or (`result` None) the item
    domain when the items are in `items`."""

    def __init__(self, before: int, after: int, result: D.Domain | None, items: D.Domain = Anything, label: str = "T"):
        self._before, self._after, self._result, self._items, self._label = before, after, result, items, label

    def arity(self) -> int:
        return self._before + 1 + self._after

    def result(self, arguments: Any) -> D.Domain | None:
        collection = arguments[self._before]  # validation has checked their number
        if not (D.overlaps(_COLLECTIONS, collection) or isinstance(collection, (List, Keyed))):
            return None
        item = items_of(collection)
        if not D.overlaps(self._items, item):
            return None
        return item if self._result is None else self._result

    def describe(self) -> str:
        parameters = ["T"] * self._before + [f"collection of {self._label}"] + ["T"] * self._after
        return f"({', '.join(parameters)}) -> {self._label if self._result is None else self._result.name()}"


class _Quantified:
    """A quantifier: a collection and a bool body, giving `result`."""

    def __init__(self, result: D.Domain):
        self._result = result

    def arity(self) -> int:
        return 2

    def result(self, arguments: Any) -> D.Domain | None:
        if len(arguments) != 2 or not (D.overlaps(_COLLECTIONS, arguments[0]) or isinstance(arguments[0], (List, Keyed))):
            return None
        return self._result if D.overlaps(Bool, arguments[1]) else None

    def items(self, collection: D.Domain) -> D.Domain:
        """The domain the quantifier's name has: the collection's items'."""
        return items_of(collection)

    def describe(self) -> str:
        return f"(collection, bool) -> {self._result.name()}"


QUANTIFIERS: dict[str, D.Signature] = {"all": _Quantified(Bool), "any": _Quantified(Bool), "count": _Quantified(Int)}
"""The quantifiers' signatures."""

SIGNATURES: dict[str, D.Signature] = {
    "get": D.Function((D.OfUnion(Object, Records), Str), Anything), "has": D.Function((D.OfUnion(Object, Records), Str), Bool),
    **{name: D.Same(2, _COMPARABLE, Bool) for name in ("eq", "ne")},
    **{name: D.Same(2, _ORDERED, Bool) for name in ("lt", "le", "gt", "ge")},
    "and": _LOGIC, "or": _LOGIC, "not": D.Function((Bool,), Bool), "implies": _LOGIC,
    **{name: D.Same(2, _NUMBERS) for name in ("add", "sub", "mul")},
    "neg": D.Same(1, _NUMBERS),
    **{name: D.Function((Int, Int), Int) for name in ("bitand", "bitor", "bitxor")},
    "bitnot": D.Function((Int,), Int), "shl": D.Function((Int, Int), Int), "shr": D.Function((Int, Int), Int),
    "count": _Collective(0, 0, Int), "item": _Collective(0, 1, None), "in": _Collective(1, 0, Bool),
    "sum": _Collective(0, 0, None, D.OfUnion(*_NUMBERS), "number"),
    "min": _Collective(0, 0, None, D.OfUnion(*_ORDERED), "ordered value"),
    "max": _Collective(0, 0, None, D.OfUnion(*_ORDERED), "ordered value"), "unique": _Collective(0, 0, Bool),
    "entries": D.Function((Object, Str), List(Records)),
}
"""The operations' signatures, for inference: their names are the operations Patterns' install writes as data."""


class _Constructor:
    """A container constructor's signature: any number of elements, giving a list of their domain, or of entries (a
    key then its value), giving a keyed collection of theirs."""

    def __init__(self, keyed: bool):
        self._keyed = keyed

    def arity(self) -> int:
        return -1  # any number

    def result(self, arguments: Any) -> D.Domain | None:
        if not self._keyed:
            return List(D._join(arguments) if arguments else Anything)
        keys, items = arguments[0::2], arguments[1::2]
        return Keyed(D._join(keys) if keys else Anything, D._join(items) if items else Anything)

    def describe(self) -> str:
        return "(K, T, ...) -> keyed(K, T)" if self._keyed else "(T, ...) -> list(T)"


LIST, MAPPING = _Constructor(False), _Constructor(True)
"""The container constructors' signatures."""


def of(value: Any) -> D.Domain:
    """The domain of a value: its native type's, or `Object`."""
    if type(value) in _NATIVES:
        return _NATIVES[type(value)]
    if Object.contains(value):
        return Object
    raise TypeError(f"a {type(value).__name__} is not a value of the Patterns dialect")
