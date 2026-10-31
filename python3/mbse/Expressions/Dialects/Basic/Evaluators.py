"""Evaluators of the Basic dialect: compute the value of an expression.

`Evaluators.OfAny(term, scope)` evaluates any term with the variables in `scope` bound, and `Evaluators.OfLiteral`,
`OfCall`, `OfVariable`, `OfLet` and `OfQuantifier` evaluate one kind; each takes a term value, or anything
`Terms.term` reads one from (an `Expression`, its root). The value is a native value, an object, or `None` when it is
unknown.

- Three-valued logic: an absent property is unknown, and comparisons with unknown or incomparable values are unknown.
  `and`, `or`, `not` and `implies` follow Kleene's logic; the second operand is evaluated only when the first does not
  decide.
- No coercion. Comparisons follow mbse-basis [CAP-111: equality and ordering defined by the
  schema](../../../../../../mbse-basis/docs/capabilities/CAP-111.md): natives of one type by value, reference objects by
  identity, everything else deeply (see Deep equality); values of different types are incomparable. Arithmetic takes numbers of one domain.
- Values are taken by the schemas they are written with: a term carries no domain (the port's stage 3, Decided, 1 and
  2), so an int is an unbounded integer, a float an IEEE 754 binary64 number, and the bitwise operations and shifts take
  ints, as two's complement of infinite width.
- Collections: a container property reads as a `Domains.Collection`, and so do the values of the container
  constructors, `list` (positional) and `mapping` (keyed: a key unknown makes it unknown, and two equal keys raise), and
  `entries` gives an object's entries as one of `Domains.Record`s, which `get` and `has` read. The collection operations
  and the quantifiers (`all`, `any`, `count`) follow Kleene's logic over the items; an unknown collection gives unknown.
- Only the operations Basic defines (`Expressions.OPERATIONS`) are evaluated. Unknown operations, wrong numbers of
  arguments, unbound variables and wrong operand types raise, as do the problems `validate()` reports.
- `get` and `has` read any data object, read through mbse-schemas' readers (`Framework.Objects`): reference objects,
  value objects, union and intersection values.
- Deep equality: a value object, a union or intersection value, or an entry's record is equal to another when the
  properties each holds (a union's branch, an intersection's parts) are absent in both or equal in both, read through
  the visitor protocols; a property present in one and absent in the other is incomparable. A
  positional collection is equal to another of the same length whose items are equal in order, and unequal to one of
  another length; a keyed collection to another with the same keys and equal values, in any order, and incomparable to
  one with other keys. Equal is Kleene's and of the parts' equalities.

A constraint about a value is evaluated with the variable it names bound to it, such as `person`:
`Evaluators.OfAny(constraint, {"person": value})`. """

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F, Objects, Terms
from mbse.Schemas.Framework import Comparison, Schemas
from mbse.Schemas.Framework.Visitors import Scalar as Native

from . import Domains, Expressions

__all__ = ["OfAny", "OfLiteral", "OfCall", "OfVariable", "OfLet", "OfQuantifier", "OPERATIONS",
           "QUANTIFIERS", "INTERPRETER"]

Scope = Mapping[str, Any] | None

_NATIVES = (int, float, str, bool, bytes)


def _type_name(value: object) -> str:
    return type(value).__name__


def _is_native(value: object) -> bool:
    return type(value) in _NATIVES


def _truth(name: str, value: Any) -> bool | None:
    if value is not None and type(value) is not bool:
        raise TypeError(f"{name} expects bool operands, got {_type_name(value)}")
    return value


def _logic(name: str) -> F.Implementation:
    """Kleene's logic, evaluating the second operand only when the first does not decide."""
    decisive = {"and": False, "or": True, "implies": False}[name]

    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> bool | None:
        a = _truth(name, arguments[0]())
        if a is decisive:
            return name != "and"
        b = _truth(name, arguments[1]())
        if name == "implies":
            return True if b is True else None if a is None or b is None else False
        if b is (name == "or"):
            return b
        return None if a is None or b is None else name == "and"

    return apply


def _callable(node: Any) -> str:
    """A call's operation's name."""
    return Terms.attributes_of(Terms.kind_of(node)[1])["callable"]


def _strict(function: Callable[[str, list[Any]], Any]) -> F.Implementation:
    """An operation that evaluates all its arguments."""
    return lambda arguments, node, scope: function(_callable(node), [argument() for argument in arguments])


def _not(name: str, values: list[Any]) -> bool | None:
    truth = _truth(name, values[0])
    return None if truth is None else not truth


_is_readable = Objects.is_object
_is_object = Objects.is_reference  # a reference object, compared by identity


def _fields(value: Any) -> dict[str, Any]:
    """A record's fields, or the properties a value holds, as Basic reads them."""
    if isinstance(value, Domains.Record):
        return value.fields
    return {name: _value_of(v) for name, v in Objects.properties(value).items()}


def _value_of(value: Any) -> Any:
    """A property's value as Basic reads it: a container as a collection."""
    if isinstance(value, Objects.Listed):
        return Domains.Collection(tuple(map(_value_of, value.values)),
                                  None if value.keys is None else tuple(map(_value_of, value.keys)))
    return value


def _read(name: str, values: list[Any]) -> Any:
    """`get`: the property's value, or `None` when absent. `has`: whether it is present. A record's fields are its
    properties."""
    target, property_name = values
    if type(property_name) is not str:
        raise TypeError(f"{name} expects a property name, got {_type_name(property_name)}")
    if target is None:
        return None
    if isinstance(target, Domains.Record):
        properties = target.fields
    elif _is_readable(target):
        properties = Objects.properties(target)
    else:
        raise TypeError(f"{name} expects an object, got {_type_name(target)}")
    if name == "has":
        return property_name in properties
    return _value_of(properties.get(property_name))


def _compare(a: Native, b: Native) -> Comparison.Result:
    schema = Schemas.OfScalar.Data(type(a))
    return Comparison.OfScalar(schema, a).compare(Comparison.OfScalar(schema, b))


def _equal(a: Any, b: Any) -> bool | None:
    """Whether `a` equals `b`: natives of one type by value, reference objects by identity, collections, records and
    values deeply; `None` if unknown or incomparable."""
    if a is None or b is None:
        return None
    if _is_native(a) and type(a) is type(b):
        return _compare(a, b) == 0
    if _is_object(a) or _is_object(b):
        return a is b if _is_object(a) and _is_object(b) else None
    if _is_collection(a) and _is_collection(b):
        return _equal_collections(_collection("eq", a), _collection("eq", b))  # type: ignore[arg-type]
    if _is_value(a) and _is_value(b):
        x, y = _fields(a), _fields(b)
        if x.keys() != y.keys():
            return None
        return _all(_equal(x[name], y[name]) for name in x)
    return None


def _is_collection(value: Any) -> bool:
    return isinstance(value, (Domains.Collection, list, tuple))


def _is_value(value: Any) -> bool:
    """A record, or a value that writes its properties: compared deeply."""
    return isinstance(value, Domains.Record) or _is_readable(value)


def _all(results: Iterable[bool | None]) -> bool | None:
    """Kleene's and."""
    result: bool | None = True
    for equal in results:
        if equal is False:
            return False
        if equal is None:
            result = None
    return result


def _equal_collections(a: Domains.Collection, b: Domains.Collection) -> bool | None:
    if a.keys is None and b.keys is None:
        return False if len(a.items) != len(b.items) else _all(map(_equal, a.items, b.items))
    if a.keys is None or b.keys is None or len(a.keys) != len(b.keys):
        return None
    pairs = []
    for key, item in zip(a.keys, a.items):
        found = [other for k, other in zip(b.keys, b.items) if _equal(key, k)]
        if not found:
            return None
        pairs.append((item, found[0]))
    return _all(_equal(x, y) for x, y in pairs)


def _equality(name: str, values: list[Any]) -> bool | None:
    equal = _equal(*values)
    return None if equal is None else equal == (name == "eq")


def _order(name: str, values: list[Any]) -> bool | None:
    """Ordered natives of one type; `None` if unknown or incomparable."""
    a, b = values
    if a is None or b is None or not _is_native(a) or type(a) is not type(b):
        return None
    order = _compare(a, b)
    return None if order is None else {"lt": order < 0, "le": order <= 0, "gt": order > 0, "ge": order >= 0}[name]


def _domain(value: Any) -> Any:
    """A value's domain, by the native type it is written with, or None when it is not a native (an object)."""
    return Domains._NATIVES.get(type(value))


def _operands(name: str, values: list[Any], kinds: tuple[type, ...], what: str) -> Any:
    """The one domain of `values`, which must be of `kinds`; raises naming `what` they must be."""
    domains = [_domain(value) for value in values]
    if not isinstance(domains[0], kinds) or any(domain != domains[0] for domain in domains):
        if len(values) == 1:
            raise TypeError(f"{name} expects {what[0]}, got {_type_name(values[0])}")
        raise TypeError(f"{name} expects {what[1]} of one domain, got {_type_name(values[0])} and {_type_name(values[1])}")
    return domains[0]


_INTEGER, _IEEE754 = Domains.OfInteger.Data, Domains.OfIeee754.Data


def _arithmetic(name: str, values: list[Any], operator: str | None = None) -> Any:
    """`operator` (by default `name`) on numbers of one domain, ints unbounded and floats binary64; errors name
    `name`."""
    if any(value is None for value in values):
        return None
    operator = operator or name
    _operands(name, values, (_INTEGER, _IEEE754), ("a number", "numbers"))
    if operator == "neg":
        return -values[0]
    a, b = values
    return a + b if operator == "add" else a - b if operator == "sub" else a * b


def _bitwise(name: str, values: list[Any]) -> Any:
    """On ints, as two's complement of infinite width."""
    if any(value is None for value in values):
        return None
    _operands(name, values, (_INTEGER,), ("an integer", "integers"))
    if name == "bitnot":
        return ~values[0]
    a, b = values
    return a & b if name == "bitand" else a | b if name == "bitor" else a ^ b


def _shift(name: str, values: list[Any]) -> Any:
    """`shl` and `shr`: multiplying or dividing (toward negative infinity) an int by a power of two."""
    value, count = values
    if value is None or count is None:
        return None
    _operands(name, [value], (_INTEGER,), ("an integer", ""))
    if type(count) is not int:
        raise TypeError(f"{name} expects an integer count, got {_type_name(count)}")
    if count < 0:
        raise ValueError(f"{name} needs a non-negative count, got {count}")
    return value << count if name == "shl" else value >> count


def _collection(name: str, value: Any) -> Domains.Collection | None:
    """A collection, a list or tuple as a positional one, or None when unknown."""
    if value is None or isinstance(value, Domains.Collection):
        return value
    if isinstance(value, (list, tuple)):
        return Domains.Collection(tuple(value))
    raise TypeError(f"{name} expects a collection, got {_type_name(value)}")


def _count(name: str, values: list[Any]) -> int | None:
    collection = _collection(name, values[0])
    return None if collection is None else len(collection.items)


def _item(name: str, values: list[Any]) -> Any:
    """The item at a position, from 0, or at a key; unknown when there is none."""
    collection, index = _collection(name, values[0]), values[1]
    if collection is None or index is None:
        return None
    if collection.keys is not None:
        return next((item for key, item in zip(collection.keys, collection.items) if _equal(key, index)), None)
    if type(index) is not int:
        raise TypeError(f"item expects an integer position, got {_type_name(index)}")
    position = index
    return collection.items[position] if 0 <= position < len(collection.items) else None


def _in(name: str, values: list[Any]) -> bool | None:
    """Kleene's or of `eq(x, item)` over the items."""
    value, collection = values[0], _collection(name, values[1])
    if collection is None or value is None:
        return None
    result: bool | None = False
    for item in collection.items:
        equal = _equal(value, item)
        if equal:
            return True
        if equal is None:
            result = None
    return result


def _unique(name: str, values: list[Any]) -> bool | None:
    """Kleene's and of `ne` over every two items."""
    collection = _collection(name, values[0])
    if collection is None:
        return None
    result: bool | None = True
    items = collection.items
    for i, a in enumerate(items):
        for b in items[i + 1:]:
            equal = _equal(a, b)
            if equal:
                return False
            if equal is None:
                result = None
    return result


def _sum(name: str, values: list[Any]) -> Any:
    """The items added in order, as `add` adds; an empty sum is the int 0."""
    collection = _collection(name, values[0])
    if collection is None or any(item is None for item in collection.items):
        return None
    if not collection.items:
        return 0
    total = collection.items[0]
    _operands(name, [total], (_INTEGER, _IEEE754), ("numbers", ""))
    for item in collection.items[1:]:
        total = _arithmetic(name, [total, item], "add")
    return total


def _ordered(value: Any) -> bool:
    return type(value) in (int, float, str, bytes)


def _extreme(name: str, values: list[Any]) -> Any:
    """`min` or `max`: the least or greatest item of an ordered domain; unknown when there is none, or two items are
    incomparable."""
    collection = _collection(name, values[0])
    if collection is None or not collection.items or any(item is None for item in collection.items):
        return None
    first = collection.items[0]
    for item in collection.items:
        if not _ordered(item) or _domain(item) != _domain(first):
            raise TypeError(f"{name} expects ordered values of one domain, got {_type_name(first)} and {_type_name(item)}")
    best = first
    for item in collection.items[1:]:
        better = _order("lt" if name == "min" else "gt", [item, best])
        if better is None:
            return None
        if better:
            best = item
    return best


def _entries(name: str, values: list[Any]) -> Domains.Collection | None:
    """An object's entries in an adjacency, as records of their other links' targets and their property values."""
    target, adjacency = values
    if type(adjacency) is not str:
        raise TypeError(f"entries expects an adjacency name, got {_type_name(adjacency)}")
    if target is None:
        return None
    if not _is_readable(target):
        raise TypeError(f"entries expects an object, got {_type_name(target)}")
    entries = Objects.entries(target, adjacency)
    return Domains.Collection(tuple(Domains.Record({**entry.targets, **{k: _value_of(v) for k, v in entry.values.items()}})
                                    for entry in entries))


def _quantifier(name: str) -> F.Implementation:
    """`all`, `any` or `count` of the body over the items, by Kleene's logic, deciding as early as it can."""

    def apply(arguments: list[Any], node: Any, scope: Any) -> Any:
        collection = _collection(name, arguments[0]())
        if collection is None:
            return None
        result: Any = {"all": True, "any": False, "count": 0}[name]
        for item in collection.items:
            truth = _truth(name, arguments[1](item))
            if truth is None:
                if name == "count":
                    return None
                result = None
            elif truth == (name == "any") and name != "count":
                return truth
            elif truth and name == "count":
                result += 1
        return result

    return apply


def _list(arguments: list[F.Thunk], node: Any, scope: Any) -> Domains.Collection:
    """A list of its elements' values, in order."""
    return Domains.Collection(tuple(argument() for argument in arguments))


def _mapping(arguments: list[F.Thunk], node: Any, scope: Any) -> Domains.Collection | None:
    """A keyed collection of its entries' values by their keys' values, in order; unknown where a key is unknown, and
    two equal keys raise."""
    values = [argument() for argument in arguments]
    keys, items = tuple(values[0::2]), tuple(values[1::2])
    if any(key is None for key in keys):
        return None
    for i, key in enumerate(keys):
        if any(_equal(key, other) for other in keys[:i]):
            raise ValueError(f"a mapping's keys are distinct, got {key!r} twice")
    return Domains.Collection(items, keys)


QUANTIFIERS: dict[str, F.Implementation] = {name: _quantifier(name) for name in ("all", "any", "count")}
"""The implementation of each quantifier."""

OPERATIONS: dict[str, F.Implementation] = {
    "get": _strict(_read), "has": _strict(_read),
    **{name: _strict(_equality) for name in ("eq", "ne")},
    **{name: _strict(_order) for name in ("lt", "le", "gt", "ge")},
    **{name: _logic(name) for name in ("and", "or", "implies")}, "not": _strict(_not),
    **{name: _strict(_arithmetic) for name in ("add", "sub", "mul", "neg")},
    **{name: _strict(_bitwise) for name in ("bitand", "bitor", "bitxor", "bitnot")},
    **{name: _strict(_shift) for name in ("shl", "shr")},
    "count": _strict(_count), "item": _strict(_item), "in": _strict(_in), "unique": _strict(_unique),
    "sum": _strict(_sum), "min": _strict(_extreme), "max": _strict(_extreme), "entries": _strict(_entries),
}
"""The implementation of each operation Basic defines."""

INTERPRETER = F.Interpreter(Expressions.DIALECT, {"call": OPERATIONS, "quantifier": QUANTIFIERS, "list": _list,
                                                   "mapping": _mapping})
"""The interpreter of the Basic dialect, which `Partials` reduces with."""


def OfAny(expression: Any, scope: Scope = None) -> Any:
    """The value of any term, with the variables in `scope` bound."""
    return INTERPRETER(expression, scope)


def _of(tag: str, expression: Any, scope: Scope) -> Any:
    term = Terms.term(expression)
    found = Terms.kind_of(term)[0]
    if found != tag:
        raise TypeError(f"expected {Terms._article(tag)}, got {Terms._article(found)}")
    return INTERPRETER(term, scope)


def OfLiteral(expression: Any, scope: Scope = None) -> Any:
    """The value of a literal."""
    return _of("literal", expression, scope)


def OfCall(expression: Any, scope: Scope = None) -> Any:
    """The value of a call, with the variables in `scope` bound."""
    return _of("call", expression, scope)


def OfVariable(expression: Any, scope: Scope = None) -> Any:
    """The value `scope` binds to a variable."""
    return _of("variable", expression, scope)


def OfLet(expression: Any, scope: Scope = None) -> Any:
    """The value of a let's body, with its name bound to its value and the variables in `scope` bound."""
    return _of("let", expression, scope)


def OfQuantifier(expression: Any, scope: Scope = None) -> Any:
    """The value of a quantifier, with the variables in `scope` bound."""
    return _of("quantifier", expression, scope)
