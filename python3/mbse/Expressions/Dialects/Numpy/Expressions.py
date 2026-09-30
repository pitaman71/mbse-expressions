"""Expressions of the Numpy dialect: array expressions as numpy code writes them, in function-call form.

- `constant`: a native value, broadcast like a numpy scalar.
- `name`: the value (an array, a scalar or a record) bound to a Python name.
- `call`: a numpy function, named by its path under `numpy` (`greater_equal`, `ma.getmaskarray`), applied to ordered
  arguments. `SIGNATURES` in `Domains` is the vocabulary.
- `subscript`: a column or field of a record, `value[key]`.

There is no binding: translators substitute a let's value for its name. The meta-schemas are registered as
'Expressions.Numpy.OfConstant', 'Expressions.Numpy.OfName', 'Expressions.Numpy.OfCall' and
'Expressions.Numpy.OfSubscript'. `render` writes an expression as Python source, e.g.
`np.greater_equal(this['age'], 18)`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Dialects.Basic.Expressions import discriminator
from mbse.Expressions.Framework import Expressions as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "name", "call", "subscript", "render"]


@dataclass(eq=False)
class _Constant(F.Node):
    KIND = "constant"
    ROLE = F.LITERAL
    VALUE = F.NATIVES
    value: Native | None = None


@dataclass(eq=False)
class _Name(F.Node):
    KIND = "name"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _Call(F.Node):
    KIND = "call"
    ROLE = F.APPLICATION
    PROPERTIES = {"function": str}
    VARIADIC = "arguments"
    OPERATOR = "function"
    VOCABULARY = Domains.SIGNATURES
    function: str | None = None
    arguments: tuple[Any, ...] = ()


@dataclass(eq=False)
class _Subscript(F.Node):
    KIND = "subscript"
    ROLE = F.APPLICATION
    PROPERTIES = {"key": str}
    SLOTS = ("value",)
    OPERATOR = "key"
    SIGNATURE = Domains.SUBSCRIPT
    key: str | None = None
    value: Any = None


DIALECT = F.Declared("Numpy", (_Constant, _Name, _Call, _Subscript), discriminator=discriminator,
                     domain_of=Domains.of)
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def constant(value: Native) -> _Constant:
    return _Constant(value)


def name(name: str) -> _Name:
    return _Name(name)


def call(function: str, *arguments: Any) -> _Call:
    """`numpy.<function>(*arguments)`; each argument is a spec (a native value is a constant)."""
    return _Call(function, tuple(DIALECT.resolve(argument) for argument in arguments))


def subscript(value: Any, key: str) -> _Subscript:
    """`value[key]`."""
    return _Subscript(key, DIALECT.resolve(value))


def _constant(value: Native) -> str:
    if type(value) is float and not math.isfinite(value):
        return "np.nan" if math.isnan(value) else "np.inf" if value > 0 else "-np.inf"
    return repr(value)


def render(expression: Any) -> str:
    """The expression as Python source, with numpy imported as `np`."""

    def write(node: Any, arguments: list[Any]) -> str:
        if isinstance(node, _Constant):
            return _constant(node.value)
        if isinstance(node, _Name):
            return node.name
        if isinstance(node, _Subscript):
            return f"{arguments[0]}[{node.key!r}]"
        return f"np.{node.function}({', '.join(arguments)})"

    return F.fold(expression, write)
