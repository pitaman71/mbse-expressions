"""Evaluators of the Matlab dialect: compute an expression by MATLAB's rules for scalars, in Python.

`Evaluators.OfAny(expression, scope)` binds variables to numbers, logicals, strings and structs (mappings, or objects
that write their properties through `accept`). Values are Python `float` (double), `bool` (logical) and `str`
(string scalar). MATLAB's rules apply, not Basic's:

- Two-valued logic: `&&` and `||` short-circuit, and take numbers or logicals (nonzero is true; NaN raises).
- Numbers and logicals convert into each other: `true + 1` is 2, and `1 == true` is true. A comparison of a string
  with a number compares the string with the number's text, as MATLAB converts it. `+` with a string concatenates.
- There is no unknown: reading a field a struct does not have raises, as `isfield` exists to avoid. Unbound
  variables raise too, with MATLAB's messages.
- The bit functions take doubles (or logicals) holding integers from 0 to `flintmax` (2^53), as unsigned integers of
  53 bits: `bitshift(a, k)` shifts left by `k`, or right when `k` is negative, and drops the bits beyond 53.
- An array is a list: a list property's values, or a variable's list. Operators take scalars. `numel` counts
  elements (a scalar is one), `xs(i)` indexes from 1, and `arrayfun(@(p) body, xs)` gives the body's value for each
  element, an array of logicals if all are, else of doubles; each must be a numeric or logical scalar. `all`, `any`
  and `nnz` test elements as nonzero (`any` ignores NaN), `sum` adds them from the first, `min` and `max` ignore NaN
  and give an empty array of none, `unique` gives the distinct elements in order, and `ismember(x, xs)` tests `x`
  against each element as `==` does.

A `Scope(variables, functions, packages)` resolves variables from `variables` and functions as MATLAB does: the
built-ins (`isfield`, `bitand`, `bitor`, `bitxor`, `bitshift`), then those an enclosing `import` brought in, then `functions` (the path), then qualified names
(`pkg.fn`) from `packages`, which maps each package's name to its functions. `import pkg.fn` and `import pkg.*` import
from `packages`, and nothing else: functions are Python callables the caller provides.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F, Symbolics as S
from mbse.Schemas.Framework import Validators

from . import Domains, Expressions

__all__ = ["OfAny", "Scope"]


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
    if not math.isfinite(number):
        return "NaN" if math.isnan(number) else "Inf" if number > 0 else "-Inf"
    return str(int(number)) if number.is_integer() else f"{number:.5g}"


def _logical(operator: str, value: Any) -> bool:
    number = _double(value)
    if number is None:
        raise TypeError(f"Operands to the {operator} operator must be convertible to logical scalar values.")
    if number != number:
        raise ValueError("NaN's cannot be converted to logicals.")
    return number != 0


def _scalar(value: Any) -> bool:
    return type(value) in (bool, int, float, str)


def _unsupported(operator: str, a: Any, b: Any) -> TypeError:
    return TypeError(f"Operator '{operator}' is not supported for operands of type '{_class(a)}' and '{_class(b)}'.")


def _equal(a: Any, b: Any) -> bool:
    """`a == b` of two scalars, as MATLAB converts them."""
    x, y = _double(a), _double(b)
    return x == y if x is not None and y is not None else _text(a) == _text(b)


def _compare(operator: str, test: Callable[[Any, Any], bool]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> bool:
        a, b = (argument() for argument in arguments)
        if not (_scalar(a) and _scalar(b)):
            raise _unsupported(operator, a, b)
        x, y = _double(a), _double(b)
        if x is not None and y is not None:
            return test(x, y)
        return test(_text(a), _text(b))

    return apply


def _short_circuit(operator: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> bool:
        first = _logical(operator, arguments[0]())
        if first == (operator == "||"):
            return first
        return _logical(operator, arguments[1]())

    return apply


def _arithmetic(operator: str, apply_: Callable[[float, float], float]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
        a, b = (argument() for argument in arguments)
        x, y = _double(a), _double(b)
        if x is not None and y is not None:
            return apply_(x, y)
        if operator == "+" and _scalar(a) and _scalar(b):
            return _text(a) + _text(b)
        raise _unsupported(operator, a, b)

    return apply


def _class(value: Any) -> str:
    return {bool: "logical", int: "double", float: "double", str: "string", list: "array"}.get(type(value), "struct")


def _not(arguments: list[F.Thunk], node: Any, scope: Any) -> bool:
    return not _logical("~", arguments[0]())


def _negate(arguments: list[F.Thunk], node: Any, scope: Any) -> float:
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


def _field(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    fields = _fields(arguments[0]())
    if node.name not in fields:
        raise KeyError(f'Unrecognized field name "{node.name}".')
    return _value(fields[node.name])


def _value(value: Any) -> Any:
    """A value as MATLAB reads it: a number as a double, and a list (a list property's too) as an array."""
    if isinstance(value, Validators.ListRecord):
        value = value.values
    if isinstance(value, (list, tuple)):
        return [_value(item) for item in value]
    return float(value) if type(value) is int else value


def _isfield(arguments: list[F.Thunk], node: Any, scope: Any) -> bool:
    value, name = (argument() for argument in arguments)
    return Domains.is_struct(value) and type(name) is str and name in _fields(value)


_FLINTMAX = 1 << 53


def _bit_operand(name: str, value: Any, signed: bool = False) -> int:
    """A bit function's operand: an integer of 53 bits, or of any sign for a shift."""
    number = _double(value)
    if number is None:
        raise TypeError(f"Undefined function '{name}' for input arguments of type '{_class(value)}'.")
    if not number.is_integer() or abs(number) > _FLINTMAX or (number < 0 and not signed):
        raise ValueError("Double inputs must have integer values in the range of ASSUMEDTYPE.")
    return int(number)


def _bit(name: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> float:
        a = _bit_operand(name, arguments[0]())
        b = _bit_operand(name, arguments[1](), name == "bitshift")
        if name == "bitshift":
            return float(((a << b) & (_FLINTMAX - 1)) if b >= 0 else a >> -b)
        return float(a & b if name == "bitand" else a | b if name == "bitor" else a ^ b)

    return apply


# --- Arrays ---


def _elements(value: Any) -> list[Any]:
    """An array's elements; a scalar or a struct is an array of one."""
    return value if isinstance(value, list) else [value]


def _numbers(value: Any) -> list[float]:
    numbers = [_double(element) for element in _elements(value)]
    if any(number is None for number in numbers):
        raise TypeError("Invalid data type. First argument must be numeric or logical.")
    return numbers  # type: ignore[return-value]


def _logicals(values: list[Any]) -> list[Any]:
    """Elements concatenated: logicals if all are, else doubles."""
    return values if all(type(value) is bool for value in values) else [float(value) for value in values]


def _extreme(name: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
        value = arguments[0]()
        numbers = _numbers(value)
        present = [number for number in numbers if number == number]
        if not numbers:
            return []
        if not present:
            return math.nan
        best = min(present) if name == "min" else max(present)
        return bool(best) if all(type(element) is bool for element in _elements(value)) else best

    return apply


def _unique(arguments: list[F.Thunk], node: Any, scope: Any) -> list[Any]:
    elements = _elements(arguments[0]())
    if all(type(element) is str for element in elements):
        return sorted(set(elements))
    numbers = _numbers(elements)
    distinct = sorted({number for number in numbers if number == number}) + [number for number in numbers if number != number]
    return [bool(number) for number in distinct] if all(type(element) is bool for element in elements) else distinct


def _ismember(arguments: list[F.Thunk], node: Any, scope: Any) -> bool:
    value, array = (argument() for argument in arguments)
    elements = _elements(array)
    if not _scalar(value) or not all(_scalar(element) for element in elements):
        raise TypeError("ismember takes a scalar and an array of scalars.")
    return any(_equal(value, element) for element in elements)


def _index(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    elements = _elements(arguments[0]())
    index = arguments[1]()
    if type(index) is bool:  # a logical index: true selects the first element, false none
        return elements[0] if index else []
    number = _double(index)
    if number is None or not math.isfinite(number) or not number.is_integer() or number < 1:
        raise ValueError("Array indices must be positive integers or logical values.")
    if number > len(elements):
        raise ValueError(f"Index exceeds the number of array elements. Index must not exceed {len(elements)}.")
    return elements[int(number) - 1]


def _arrayfun(arguments: list[F.Thunk], node: Any, scope: Any) -> list[Any]:
    body = arguments[1]
    values = []
    for position, element in enumerate(_elements(arguments[0]()), 1):
        value = body(element)  # type: ignore[call-arg]
        if _double(value) is None:
            raise ValueError(f"Non-scalar in Uniform output, at index {position}, output 1. Set 'UniformOutput' to false.")
        values.append(value)
    return _logicals(values)


def _reduction(reduce: Callable[[list[float]], Any]) -> F.Implementation:
    return lambda arguments, node, scope: reduce(_numbers(arguments[0]()))


def _sum(numbers: list[float]) -> float:
    total = 0.0
    for number in numbers:
        total += number
    return total


def _unrecognized(name: str) -> NameError:
    return NameError(f"Unrecognized function or variable '{name}'.")


class Scope(S.Variables):
    """MATLAB's scope for an expression: `variables`, the `functions` on the path, and the `packages` that qualified
    names and imports find functions in."""

    def __init__(self, variables: Mapping[str, Any] | None = None,
                 functions: Mapping[str, Callable[..., Any]] | None = None,
                 packages: Mapping[str, Mapping[str, Callable[..., Any]]] | None = None):
        super().__init__(variables)
        self.functions, self.packages = dict(functions or {}), {k: dict(v) for k, v in (packages or {}).items()}
        self.imported: dict[str, Callable[..., Any]] = {}

    def lookup(self, reference: Any) -> Any:
        return _value(super().lookup(reference))  # numbers are doubles, lists arrays

    def unbound(self, reference: Any) -> Any:
        raise _unrecognized(reference.name)

    def enter(self, declaration: Any) -> Scope:
        package, _, name = declaration.name.rpartition(".")
        functions = self.packages.get(package, {})
        if name == "*" and package in self.packages:
            found = functions
        elif name in functions:
            found = {name: functions[name]}
        else:
            raise ImportError(f"Import argument '{declaration.name}' cannot be found or cannot be imported.")
        inner = self._copy()
        inner.imported = {**self.imported, **found}
        return inner

    def function(self, name: str) -> Callable[..., Any]:
        """The function `name` resolves to."""
        for functions in (self.imported, self.functions):
            if name in functions:
                return functions[name]
        package, _, short = name.rpartition(".")
        if short in self.packages.get(package, {}):
            return self.packages[package][short]
        raise _unrecognized(name)


def _extension(name: str, arguments: list[F.Thunk], node: Any, scope: Scope) -> Any:
    function = scope.function(name)
    value = function(*(argument() for argument in arguments))
    return float(value) if type(value) is int else value


_interpreter = F.Interpreter(Expressions.DIALECT, {
    "binary": {
        "==": _compare("==", lambda a, b: a == b), "~=": _compare("~=", lambda a, b: a != b),
        "<": _compare("<", lambda a, b: a < b), "<=": _compare("<=", lambda a, b: a <= b),
        ">": _compare(">", lambda a, b: a > b), ">=": _compare(">=", lambda a, b: a >= b),
        "&&": _short_circuit("&&"), "||": _short_circuit("||"),
        "+": _arithmetic("+", lambda a, b: a + b), "-": _arithmetic("-", lambda a, b: a - b),
        ".*": _arithmetic(".*", lambda a, b: a * b),
    },
    "unary": {"~": _not, "-": _negate},
    "call": {
        "isfield": _isfield, **{name: _bit(name) for name in ("bitand", "bitor", "bitxor", "bitshift")},
        "all": _reduction(lambda numbers: all(number != 0 for number in numbers)),
        "any": _reduction(lambda numbers: any(number != 0 and number == number for number in numbers)),
        "nnz": _reduction(lambda numbers: float(sum(number != 0 for number in numbers))),
        "numel": lambda arguments, node, scope: float(len(_elements(arguments[0]()))),
        "sum": _reduction(_sum), "min": _extreme("min"), "max": _extreme("max"), "unique": _unique,
        "ismember": _ismember,
    },
    "field": _field,
    "index": _index,
    "arrayfun": _arrayfun,
}, literal=lambda value: float(value) if type(value) is int else value, scope=Scope, extension=_extension)


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of an expression in `scope`, or with the variables in a mapping bound."""
    return _interpreter(Expressions.DIALECT.resolve(expression), scope)
