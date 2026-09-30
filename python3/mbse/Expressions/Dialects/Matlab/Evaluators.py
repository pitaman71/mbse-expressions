"""Evaluators of the Matlab dialect: compute an expression by MATLAB's rules for scalars, in Python.

`Evaluators.OfAny(expression, scope)` binds variables to numbers, logicals, strings and structs (mappings, or objects
that write their properties through `accept`). Values are Python `float` (double), `bool` (logical) and `str`
(string scalar). MATLAB's rules apply, not Basic's:

- Two-valued logic: `&&` and `||` short-circuit, and take numbers or logicals (nonzero is true; NaN raises).
- Numbers and logicals convert into each other: `true + 1` is 2, and `1 == true` is true. A comparison of a string
  with a number compares the string with the number's text, as MATLAB converts it. `+` with a string concatenates.
- There is no unknown: reading a field a struct does not have raises, as `isfield` exists to avoid. Unbound
  variables raise too, with MATLAB's messages.

A `Scope(variables, functions, packages)` resolves variables from `variables` and functions as MATLAB does: the
built-ins (`isfield`), then those an enclosing `import` brought in, then `functions` (the path), then qualified names
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


def _compare(test: Callable[[Any, Any], bool]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> bool:
        a, b = (argument() for argument in arguments)
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
        if operator == "+":
            return _text(a) + _text(b)
        raise TypeError(f"Operator '{operator}' is not supported for operands of type "
                        f"'{_class(a)}' and '{_class(b)}'.")

    return apply


def _class(value: Any) -> str:
    return {bool: "logical", int: "double", float: "double", str: "string"}.get(type(value), "struct")


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
    value = fields[node.name]
    return float(value) if type(value) is int else value


def _isfield(arguments: list[F.Thunk], node: Any, scope: Any) -> bool:
    value, name = (argument() for argument in arguments)
    return Domains.is_struct(value) and type(name) is str and name in _fields(value)


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
        value = super().lookup(reference)
        return float(value) if type(value) is int else value  # numbers are doubles

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
}, literal=lambda value: float(value) if type(value) is int else value, scope=Scope, extension=_extension)


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of an expression in `scope`, or with the variables in a mapping bound."""
    return _interpreter(Expressions.DIALECT.resolve(expression), scope)
