"""Evaluators of the Basic dialect: compute the value of an expression.

`Evaluators.OfAny(expression, scope)` evaluates any expression with the variables in `scope` bound, and
`Evaluators.OfLiteral`, `OfOperation`, `OfVariable` and `OfLet` evaluate one kind; each accepts that kind's `Spec`
(see `Expressions`), including `Term`s. The value is a native value, an object, or `None` when it is unknown.

- Three-valued logic: an absent property is unknown, and comparisons with unknown or incomparable values are unknown.
  `and`, `or`, `not` and `implies` follow Kleene's logic; the second operand is evaluated only when the first does not
  decide.
- No coercion. Comparisons follow mbse-schemas' EQUALITY.md: natives of one type by value, objects by identity; values of different
  types are incomparable. Arithmetic takes numbers of one type.
- Only core operations (`Expressions.CORE`) are evaluated. Unknown operations, wrong numbers of arguments, unbound
  variables and wrong operand types raise, as do the problems `validate()` reports.
- `get` and `has` read any object that writes its properties through `accept`, including embedded objects, which have
  no identity (and so compare equal to nothing).

`Evaluators.predicate(predicate, value)` evaluates a union branch's predicate with `this` bound to the value tested. It
is the evaluator mbse-schemas' validators take: `Validators.Validate(registry, Evaluators.predicate)`.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F
from mbse.Schemas.Framework import Comparison, Schemas, Validators
from mbse.Schemas.Framework.Visitors import Native

from . import Expressions

__all__ = ["OfAny", "OfLiteral", "OfOperation", "OfVariable", "OfLet", "predicate", "OPERATIONS"]

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

    def apply(arguments: list[F.Thunk], node: Any) -> bool | None:
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


def _strict(function: Callable[[str, list[Any]], Any]) -> F.Implementation:
    """An operation that evaluates all its arguments."""
    return lambda arguments, node: function(node.name, [argument() for argument in arguments])


def _not(name: str, values: list[Any]) -> bool | None:
    truth = _truth(name, values[0])
    return None if truth is None else not truth


def _is_readable(value: Any) -> bool:
    return callable(getattr(value, "accept", None))


def _is_object(value: Any) -> bool:
    return _is_readable(value) and callable(getattr(value, "identity", None))


def _read(name: str, values: list[Any]) -> Any:
    """`get`: the property's value, or `None` when absent. `has`: whether it is present."""
    target, property_name = values
    if type(property_name) is not str:
        raise TypeError(f"{name} expects a property name, got {_type_name(property_name)}")
    if target is None:
        return None
    if not _is_readable(target):
        raise TypeError(f"{name} expects an object, got {_type_name(target)}")
    properties = Validators.properties_of(target)
    if name == "has":
        return property_name in properties
    return properties.get(property_name)


def _compare(a: Native, b: Native) -> Comparison.Result:
    schema = Schemas.OfNative.Data(type(a))
    return Comparison.OfNative(schema, a).compare(Comparison.OfNative(schema, b))


def _equal(a: Any, b: Any) -> bool | None:
    """Whether `a` equals `b`: natives of one type by value, objects by identity; `None` if unknown or incomparable."""
    if a is None or b is None:
        return None
    if _is_native(a) and type(a) is type(b):
        return _compare(a, b) == 0
    if _is_object(a) and _is_object(b):
        return a.identity() == b.identity()
    return None


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


def _arithmetic(name: str, values: list[Any]) -> Any:
    if any(value is None for value in values):
        return None
    if name == "neg":
        if type(values[0]) not in (int, float):
            raise TypeError(f"neg expects a number, got {_type_name(values[0])}")
        return -values[0]
    a, b = values
    if type(a) is not type(b) or type(a) not in (int, float):
        raise TypeError(f"{name} expects numbers of one type, got {_type_name(a)} and {_type_name(b)}")
    return a + b if name == "add" else a - b if name == "sub" else a * b


OPERATIONS: dict[str, F.Implementation] = {
    "get": _strict(_read), "has": _strict(_read),
    **{name: _strict(_equality) for name in ("eq", "ne")},
    **{name: _strict(_order) for name in ("lt", "le", "gt", "ge")},
    **{name: _logic(name) for name in ("and", "or", "implies")}, "not": _strict(_not),
    **{name: _strict(_arithmetic) for name in ("add", "sub", "mul", "neg")},
}
"""The implementation of each core operation."""

_interpreter = F.Interpreter(Expressions.DIALECT, {"operation": OPERATIONS})


def OfAny(expression: Expressions.OfAny.Spec, scope: Scope = None) -> Any:
    """The value of any expression, with the variables in `scope` bound."""
    return _interpreter(Expressions.OfAny.resolve(expression), scope)


def OfLiteral(expression: Expressions.OfLiteral.Spec, scope: Scope = None) -> Any:
    """The value of a literal."""
    return _interpreter(Expressions.OfLiteral.resolve(expression), scope)


def OfOperation(expression: Expressions.OfOperation.Spec, scope: Scope = None) -> Any:
    """The value of an operation, with the variables in `scope` bound."""
    return _interpreter(Expressions.OfOperation.resolve(expression), scope)


def OfVariable(expression: Expressions.OfVariable.Spec, scope: Scope = None) -> Any:
    """The value `scope` binds to a variable."""
    return _interpreter(Expressions.OfVariable.resolve(expression), scope)


def OfLet(expression: Expressions.OfLet.Spec, scope: Scope = None) -> Any:
    """The value of a let's body, with its name bound to its value and the variables in `scope` bound."""
    return _interpreter(Expressions.OfLet.resolve(expression), scope)


def predicate(predicate: Expressions.OfAny.Spec, value: Any) -> bool | None:
    """Whether `value` satisfies a union branch's `predicate`, evaluated with `this` bound to it; `None` if unknown."""
    result = OfAny(predicate, {"this": value})
    if result is not None and type(result) is not bool:
        raise TypeError(f"a predicate must be a bool, got {_type_name(result)}")
    return result
