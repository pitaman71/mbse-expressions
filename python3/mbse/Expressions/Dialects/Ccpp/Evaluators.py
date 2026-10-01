"""Evaluators of the Ccpp dialect: compute an expression by C's and C++'s rules for arithmetic types, in Python.

`Evaluators.OfAny(expression, scope)` evaluates in a `Scope(variables, functions)`. Values carry their C type while
evaluating, and the result is its native: an int, a float (a `long double` as its text, as `Basic.Ieee754` writes it),
a bool, a string, or an object. A variable's type is its value's: a bool is a `bool`, an int an `int`, `long` or
`unsigned long` as the first that holds it, a float a `double`, and a Basic typed value (`Domains.Value`) of an integer
domain of 8, 16, 32 or 64 bits the `<stdint.h>` type of its width and signedness, and of a binary IEEE 754 format
`float`, `double` or `long double`. C's rules apply:

- The integer promotions and the usual arithmetic conversions decide the type an operator computes in (see `Domains`);
  unsigned arithmetic wraps, and floating arithmetic rounds to nearest, ties to even, as IEEE 754 specifies.
- What C leaves undefined raises: a signed result outside its type (`OverflowError`), an integer divided by zero
  (`ZeroDivisionError`), a shift by a negative count or by the width or more, a left shift of a negative value, and a
  cast of a floating value outside the target type (`OverflowError`) or of NaN (`ValueError`).
- Division truncates toward zero, and `%` takes the dividend's sign; `>>` of a negative value is arithmetic.
- Comparisons and `&&`, `||` and `!` give `bool`, as in C++ (C's `int` results compute alike once promoted); `&&` and
  `||` evaluate their second operand only when the first does not decide.
- A cast converts: to an integer type by wrapping into its width (as C++20 defines), from a floating value by
  truncation; to a floating type by rounding; to `bool` by comparing with zero.
- `condition ? a : b` evaluates only the operand it chooses, and keeps that operand's type.
- `object.name` and `object->name` read a member (a property of an object, or a key of a mapping); `array[index]` an
  element of a list; `f(args)` calls a function the scope provides, and nothing else.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Dialects.Basic import Domains as BD, Ieee754
from mbse.Expressions.Framework import Errors, Evaluators as F, Symbolics as S
from mbse.Schemas.Framework import Validators

from . import Domains, Expressions
from .Domains import CType

__all__ = ["OfAny", "Scope", "INTERPRETER"]

_EVEN, _ZERO = "roundTiesToEven", "roundTowardZero"


@dataclass(frozen=True)
class _Typed:
    """A value while evaluating: its C type (None for a string or an object) and its native."""

    ctype: CType | None
    value: Any


def _name(value: _Typed) -> str:
    return value.ctype.name() if value.ctype is not None else type(value.value).__name__


def _typed(value: Any) -> _Typed:
    """A variable's or a member's value, with its type."""
    if isinstance(value, BD.Value):
        domain = value.domain
        if isinstance(domain, BD.OfInteger.Data) and domain.width in (8, 16, 32, 64):
            return _Typed(Domains.TYPES[f"{'' if domain.signed else 'u'}int{domain.width}_t"], value.value)
        formats = {"binary32": "float", "binary64": "double", "binary128": "long double"}
        if isinstance(domain, BD.OfIeee754.Data) and domain.format in formats:
            return _Typed(Domains.TYPES[formats[domain.format]], value.value)
        raise TypeError(f"{domain.name()} has no C type")
    ctype = Domains.of(value)
    if isinstance(ctype, CType):
        return _Typed(ctype, value)
    if type(value) is int:
        raise OverflowError(f"integer {value} is too large for any type")
    return _Typed(None, value)


def _constant(ctype: CType, value: Any) -> _Typed:
    return _Typed(ctype, value)


def _arithmetic(value: _Typed, operator: str) -> CType:
    if value.ctype is None:
        raise TypeError(f"invalid operand to {operator}: '{_name(value)}'")
    return value.ctype


# --- Conversions ---


def _wrap(ctype: CType, value: int) -> int:
    """An integer wrapped into a type's width, two's complement."""
    low = -(1 << (ctype.width - 1)) if ctype.signed else 0
    return (value - low) % (1 << ctype.width) + low


def _convert(value: _Typed, target: CType) -> _Typed:
    """A value converted to `target` implicitly or by a cast: integers wrap, floats truncate toward an integer and round
    toward a floating type, and anything nonzero is true."""
    source = _arithmetic(value, "a conversion")
    native = value.value
    if target.kind == "bool":
        if source.kind == "floating":  # true unless a zero of either sign; NaN is true
            datum = Ieee754.decode(source.format, native)
            return _Typed(target, datum.special is not None or datum.coefficient != 0)
        return _Typed(target, native != 0)
    if source.kind != "floating":
        number = int(native)
        if target.kind == "integer":
            return _Typed(target, _wrap(target, number))
        return _Typed(target, Ieee754.from_integer(number, target.format, _EVEN))
    if target.kind == "floating":
        return _Typed(target, Ieee754.convert(source.format, native, target.format, _EVEN))
    whole = Ieee754.to_integer(source.format, native, _ZERO)
    if isinstance(whole, float) or not target.contains(whole):
        shown = native if type(native) is str else repr(native)
        raise OverflowError(f"{shown} is out of range of '{target.name()}'")
    return _Typed(target, whole)


def _common(left: _Typed, right: _Typed, operator: str) -> tuple[CType, _Typed, _Typed]:
    ctype = Domains.common(_arithmetic(left, operator), _arithmetic(right, operator))
    return ctype, _convert(left, ctype), _convert(right, ctype)


def _integer_result(ctype: CType, operator: str, value: int) -> _Typed:
    """An integer result: wrapped when unsigned; outside a signed type, undefined."""
    if not ctype.signed:
        return _Typed(ctype, _wrap(ctype, value))
    if not ctype.contains(value):
        raise OverflowError(f"signed overflow in {operator}: {value} does not fit '{ctype.name()}'")
    return _Typed(ctype, value)


# --- Operators ---

_FLOATING_OPERATORS = {"+": "add", "-": "sub", "*": "mul", "/": "div"}


def _binary_arithmetic(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
        ctype, a, b = _common(arguments[0](), arguments[1](), operator)
        if ctype.kind == "floating":
            if operator not in _FLOATING_OPERATORS:
                raise TypeError(f"invalid operands to binary {operator} ('{ctype.name()}' and '{ctype.name()}')")
            return _Typed(ctype, Ieee754.operate(_FLOATING_OPERATORS[operator], ctype.format, _EVEN, [a.value, b.value]))
        x, y = a.value, b.value
        if operator in "/%" and y == 0:
            raise ZeroDivisionError("integer division by zero")
        if operator in "/%":
            quotient = abs(x) // abs(y) * (1 if (x < 0) == (y < 0) else -1)  # truncated toward zero
            result = quotient if operator == "/" else x - y * quotient
        else:
            result = {"+": x + y, "-": x - y, "*": x * y, "&": x & y, "^": x ^ y, "|": x | y}[operator]
        return _integer_result(ctype, operator, result)

    return apply


def _shift(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
        left, right = arguments[0](), arguments[1]()
        ctype, count_type = Domains.promoted(_arithmetic(left, operator)), Domains.promoted(_arithmetic(right, operator))
        if ctype.kind == "floating" or count_type.kind == "floating":
            raise TypeError(f"invalid operands to binary {operator} ('{_name(left)}' and '{_name(right)}')")
        value, count = int(left.value), int(right.value)
        if count < 0 or count >= ctype.width:
            raise ValueError(f"shift by {count} is undefined for '{ctype.name()}'")
        if operator == ">>":
            return _Typed(ctype, value >> count)
        if value < 0:
            raise ValueError("left shift of a negative value is undefined")
        return _integer_result(ctype, operator, value << count)

    return apply


def _comparison(operator: str) -> F.Implementation:
    tests: dict[str, Callable[[int], bool]] = {"<": lambda o: o < 0, "<=": lambda o: o <= 0, ">": lambda o: o > 0,
                                               ">=": lambda o: o >= 0, "==": lambda o: o == 0, "!=": lambda o: o != 0}

    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
        ctype, a, b = _common(arguments[0](), arguments[1](), operator)
        if ctype.kind == "floating":
            x, y = Ieee754.decode(ctype.format, a.value), Ieee754.decode(ctype.format, b.value)
            if x.special == "nan" or y.special == "nan":
                return _Typed(Domains.Bool, operator == "!=")
            order = _ieee_order(ctype.format, a.value, b.value)
        else:
            order = (a.value > b.value) - (a.value < b.value)
        return _Typed(Domains.Bool, tests[operator](order))

    return apply


def _ieee_order(format: str, a: Any, b: Any) -> int:
    """How two non-NaN floating values compare by value: -0 equals 0."""
    x, y = Ieee754.decode(format, a), Ieee754.decode(format, b)
    if x.special is None and y.special is None and x.coefficient == 0 and y.coefficient == 0:
        return 0
    return Ieee754.compare(format, a, b)  # type: ignore[return-value]


def _truth(value: _Typed, operator: str) -> bool:
    _arithmetic(value, operator)
    return _convert(value, Domains.Bool).value


def _logical(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
        first = _truth(arguments[0](), operator)
        if first == (operator == "||"):
            return _Typed(Domains.Bool, first)
        return _Typed(Domains.Bool, _truth(arguments[1](), operator))

    return apply


def _unary(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
        value = arguments[0]()
        if operator == "!":
            return _Typed(Domains.Bool, not _truth(value, operator))
        ctype = Domains.promoted(_arithmetic(value, operator))
        promoted = _convert(value, ctype)
        if ctype.kind == "floating":
            if operator == "~":
                raise TypeError(f"invalid argument type '{ctype.name()}' to unary expression")
            return promoted if operator == "+" else _Typed(ctype, Ieee754.operate("neg", ctype.format, _EVEN, [promoted.value]))
        number = promoted.value
        return _integer_result(ctype, operator, {"+": number, "-": -number, "~": ~number}[operator])

    return apply


def _conditional(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
    return arguments[1]() if _truth(arguments[0](), "?:") else arguments[2]()


def _cast(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
    return _convert(arguments[0](), Domains.TYPES[node.type])


def _member(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
    target = arguments[0]().value
    if isinstance(target, Mapping):
        members = target
    elif callable(getattr(target, "accept", None)):
        members = Validators.properties_of(target)
    else:
        raise TypeError(f"member reference base type '{type(target).__name__}' is not a structure")
    if node.name not in members:
        raise KeyError(f"no member named '{node.name}'")
    return _typed(_array(members[node.name]))


def _array(value: Any) -> Any:
    """A member's value: a list as a list of its items, lists of lists too."""
    return [_array(item) for item in value.values] if isinstance(value, Validators.ListRecord) else value


def _subscript(arguments: list[F.Thunk], node: Any, scope: Any) -> _Typed:
    array, index = arguments[0](), arguments[1]()
    if not isinstance(array.value, (list, tuple)):
        raise TypeError(f"subscripted value is not an array: '{_name(array)}'")
    if index.ctype is None or index.ctype.kind == "floating":
        raise TypeError(f"array subscript is not an integer: '{_name(index)}'")
    position = int(index.value)
    if not 0 <= position < len(array.value):
        raise ValueError(f"index {position} is out of bounds of an array of {len(array.value)}")
    return _typed(array.value[position])


def _call(arguments: list[F.Thunk], node: Any, scope: Scope) -> _Typed:
    function = scope.function(node.function)
    return _typed(function(*(_native(argument()) for argument in arguments)))


def _native(value: _Typed) -> Any:
    return value.value


class Scope(S.Variables):
    """C's scope for an expression: `variables`, and the `functions` it may call."""

    def __init__(self, variables: Mapping[str, Any] | None = None,
                 functions: Mapping[str, Callable[..., Any]] | None = None):
        super().__init__(variables)
        self.functions = dict(functions or {})

    def lookup(self, reference: Any) -> Any:
        return _typed(super().lookup(reference))

    def unbound(self, reference: Any) -> Any:
        raise Errors.NameError(f"use of undeclared identifier '{reference.name}'")

    def function(self, name: str) -> Callable[..., Any]:
        if name not in self.functions:
            raise Errors.NameError(f"use of undeclared identifier '{name}'")
        return self.functions[name]


INTERPRETER = F.Interpreter(Expressions.DIALECT, {
    "binary": {
        **{op: _binary_arithmetic(op) for op in ("+", "-", "*", "/", "%", "&", "^", "|")},
        **{op: _shift(op) for op in ("<<", ">>")},
        **{op: _comparison(op) for op in ("<", "<=", ">", ">=", "==", "!=")},
        **{op: _logical(op) for op in ("&&", "||")},
    },
    "unary": {op: _unary(op) for op in ("+", "-", "~", "!")},
    "conditional": _conditional, "cast": _cast, "member": _member, "subscript": _subscript, "call": _call,
}, literal=_typed, typed=_constant, scope=Scope)
"""The interpreter of the Ccpp dialect; its values carry their C types."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of an expression in `scope`, or with the variables in a mapping bound: its native."""
    return _native(INTERPRETER(Expressions.DIALECT.resolve(expression), scope))
