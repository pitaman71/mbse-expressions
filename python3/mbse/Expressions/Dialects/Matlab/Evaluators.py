"""Evaluators of the Matlab dialect: compute an expression by MATLAB's rules for scalars, in Python.

`Evaluators.OfAny(expression, scope)` binds variables to numbers, logicals, strings and structs (mappings, or objects
that write their properties through `accept`). Values are Python `float` (double), `bool` (logical) and `str`
(string scalar). MATLAB's rules apply, not Basic's:

- Two-valued logic: `&&` and `||` short-circuit, and take numbers or logicals (nonzero is true; NaN raises).
- Numbers and logicals convert into each other: `true + 1` is 2, and `1 == true` is true. A comparison of a string
  with a number compares the string with the number's text, as MATLAB converts it. `+` with a string concatenates.
- There is no unknown: reading a field a struct does not have raises, as `isfield` exists to avoid. Unbound
  variables raise too, with MATLAB's messages.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F
from mbse.Schemas.Framework import Validators

from . import Domains, Expressions

__all__ = ["OfAny"]


def _double(value: Any) -> float | None:
    """A numeric value as a double; None if not numeric."""
    return float(value) if type(value) in (bool, int, float) else None


def _text(value: Any) -> str:
    """A scalar's text, as MATLAB's `string` converts it."""
    if type(value) is str:
        return value
    if type(value) is bool:
        return "true" if value else "false"
    number = float(value)
    return str(int(number)) if number.is_integer() else f"{number:.5g}"


def _logical(operator: str, value: Any) -> bool:
    number = _double(value)
    if number is None:
        raise TypeError(f"Operands to the {operator} operator must be convertible to logical scalar values.")
    if number != number:
        raise ValueError("NaN's cannot be converted to logicals.")
    return number != 0


def _compare(test: Callable[[Any, Any], bool]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any) -> bool:
        a, b = (argument() for argument in arguments)
        x, y = _double(a), _double(b)
        if x is not None and y is not None:
            return test(x, y)
        return test(_text(a), _text(b))

    return apply


def _short_circuit(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any) -> bool:
        first = _logical(operator, arguments[0]())
        if first == (operator == "||"):
            return first
        return _logical(operator, arguments[1]())

    return apply


def _arithmetic(operator: str, apply_: Callable[[float, float], float]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any) -> Any:
        a, b = (argument() for argument in arguments)
        x, y = _double(a), _double(b)
        if x is not None and y is not None:
            return apply_(x, y)
        if operator == "+":
            return _text(a) + _text(b)
        raise TypeError(f"Operator '{operator}' is not supported for operands of type "
                        f"'{_class(a)}' and '{_class(b)}'.")

    return apply


def _class(value: Any) -> str:
    return {bool: "logical", int: "double", float: "double", str: "string"}.get(type(value), "struct")


def _not(arguments: list[F.Thunk], node: Any) -> bool:
    return not _logical("~", arguments[0]())


def _negate(arguments: list[F.Thunk], node: Any) -> float:
    value = arguments[0]()
    number = _double(value)
    if number is None:
        raise TypeError(f"Operator '-' is not supported for operands of type '{_class(value)}'.")
    return -number


def _fields(value: Any) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value
    if not Domains.is_struct(value):
        raise TypeError("Dot indexing is not supported for variables of this type.")
    return Validators.properties_of(value)


def _field(arguments: list[F.Thunk], node: Any) -> Any:
    fields = _fields(arguments[0]())
    if node.name not in fields:
        raise KeyError(f'Unrecognized field name "{node.name}".')
    value = fields[node.name]
    return float(value) if type(value) is int else value


def _isfield(arguments: list[F.Thunk], node: Any) -> bool:
    value, name = (argument() for argument in arguments)
    return Domains.is_struct(value) and type(name) is str and name in _fields(value)


def _unbound(kind: str, name: str) -> Any:
    raise NameError(f"Unrecognized function or variable '{name}'.")


_interpreter = F.Interpreter(Expressions.DIALECT, {
    "binary": {
        "==": _compare(lambda a, b: a == b), "~=": _compare(lambda a, b: a != b),
        "<": _compare(lambda a, b: a < b), "<=": _compare(lambda a, b: a <= b),
        ">": _compare(lambda a, b: a > b), ">=": _compare(lambda a, b: a >= b),
        "&&": _short_circuit("&&"), "||": _short_circuit("||"),
        "+": _arithmetic("+", lambda a, b: a + b), "-": _arithmetic("-", lambda a, b: a - b),
        ".*": _arithmetic(".*", lambda a, b: a * b),
    },
    "unary": {"~": _not, "-": _negate},
    "call": {"isfield": _isfield},
    "field": _field,
}, literal=lambda value: float(value) if type(value) is int else value, unbound=_unbound)


def OfAny(expression: Any, scope: Mapping[str, Any] | None = None) -> Any:
    """The value of an expression, with the variables in `scope` bound."""
    return _interpreter(Expressions.DIALECT.resolve(expression), scope)
