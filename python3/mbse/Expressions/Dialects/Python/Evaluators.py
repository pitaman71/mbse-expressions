"""Evaluators of the Python dialect: compute an expression by Python's rules, in a scope that decides what it may reach.

`Evaluators.OfAny(expression, scope)` evaluates in a `Scope`, or in one made from a mapping of variables. Python's
rules apply, not Basic's: `and` and `or` give one of their operands, `1 == 1.0` is True, `True + 1` is 2, and a
missing attribute raises `AttributeError`. Objects that write their properties through `accept`, such as
mbse-schemas' data, have their properties as attributes.

A `Scope(variables, modules, builtins)` resolves names as Python does, innermost first: names bound by lets and
imports, then `variables`, then `builtins` (by default a few that read values: `abs`, `bool`, `float`, `getattr`,
`hasattr`, `int`, `len`, `max`, `min`, `round`, `str`). Nothing else is reachable from an expression, since expressions
may come from data:

- An import resolves only a module in `modules`, or a submodule of one: `Scope(modules={'numpy': numpy})` allows
  `import numpy as np` and `from numpy.ma import getmaskarray`, and every other import raises `ImportError`.
- Attributes whose names start with `_` are refused.
- A call may call only a builtin of the scope, a value of `variables`, or a function of an allowed module.
"""

from __future__ import annotations

import operator
import types
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F, Symbolics as S
from mbse.Schemas.Framework import Validators

from . import Expressions

__all__ = ["OfAny", "Scope", "BUILTINS"]


def _is_readable(value: Any) -> bool:
    return callable(getattr(value, "accept", None)) and not isinstance(value, types.ModuleType)


def attribute(value: Any, name: str) -> Any:
    """`value.name`, as expressions read it: never private, and properties for objects that write them."""
    if type(name) is not str or name.startswith("_"):
        raise AttributeError(f"attribute {name!r} is private")
    if _is_readable(value):
        properties = Validators.properties_of(value)
        if name not in properties:  # named by its schema, the type it has for expressions
            what = value.schema_name() if callable(getattr(value, "schema_name", None)) else type(value).__name__
            raise AttributeError(f"{what!r} object has no attribute {name!r}")
        return properties[name]
    return getattr(value, name)


def _hasattr(value: Any, name: str) -> bool:
    try:
        attribute(value, name)
    except AttributeError:
        return False
    return True


BUILTINS: dict[str, Any] = {
    "abs": abs, "bool": bool, "float": float, "getattr": attribute, "hasattr": _hasattr, "int": int, "len": len,
    "max": max, "min": min, "round": round, "str": str,
}
"""The builtins a scope provides by default, one per name of `Expressions.BUILTINS`."""


class Scope(S.Variables):
    """Python's scope for an expression: `variables`, the `modules` imports may bring in, and `builtins`."""

    def __init__(self, variables: Mapping[str, Any] | None = None, modules: Mapping[str, types.ModuleType] | None = None,
                 builtins: Mapping[str, Any] | None = None):
        super().__init__(variables)
        self.modules = dict(modules or {})
        self.builtins = dict(BUILTINS if builtins is None else builtins)

    def lookup(self, reference: Any) -> Any:
        if reference.name in self.values:
            return self.values[reference.name]
        if reference.name in self.builtins:
            return self.builtins[reference.name]
        raise NameError(f"name {reference.name!r} is not defined")

    def module(self, name: str) -> types.ModuleType:
        """The module `name`, if allowed: one of `modules`, or a submodule reached through its attributes."""
        root, *parts = name.split(".")
        if root not in self.modules:
            raise ImportError(f"import of {name!r} is not allowed by the scope")
        module = self.modules[root]
        for part in parts:
            module = getattr(module, part, None) if not part.startswith("_") else None
            if not isinstance(module, types.ModuleType):
                raise ImportError(f"No module named {name!r}")
        return module

    def enter(self, declaration: Any) -> Scope:
        if isinstance(declaration, Expressions._Import):
            if declaration.alias:
                return self.bind(declaration.alias, self.module(declaration.module))
            root = declaration.module.split(".")[0]
            self.module(declaration.module)  # the whole path must be allowed
            return self.bind(root, self.modules[root])
        module = self.module(declaration.module)
        if declaration.name.startswith("_") or not hasattr(module, declaration.name):
            raise ImportError(f"cannot import name {declaration.name!r} from {declaration.module!r}")
        return self.bind(declaration.alias or declaration.name, getattr(module, declaration.name))

    def allows(self, function: Any) -> bool:
        """Whether an expression may call `function`."""
        if any(function is value for value in self.builtins.values()):
            return True
        if any(function is value for value in self.values.maps[-1].values()):
            return True
        module = getattr(function, "__module__", None)
        return type(module) is str and module.split(".")[0] in self.modules


def _call(arguments: list[F.Thunk], node: Any, scope: Scope) -> Any:
    function = arguments[0]()
    if not callable(function) or not scope.allows(function):
        what = getattr(function, "__name__", type(function).__name__)
        raise TypeError(f"calling {what!r} is not allowed by the scope")
    return function(*(argument() for argument in arguments[1:]))


def _boolop(name: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
        first = arguments[0]()
        decided = not first if name == "and" else bool(first)
        return first if decided else arguments[1]()

    return apply


def _strict(function: Callable[..., Any]) -> F.Implementation:
    return lambda arguments, node, scope: function(*(argument() for argument in arguments))


_COMPARE = {"==": operator.eq, "!=": operator.ne, "<": operator.lt, "<=": operator.le, ">": operator.gt,
            ">=": operator.ge}
_BINOP = {"+": operator.add, "-": operator.sub, "*": operator.mul, "/": operator.truediv, "//": operator.floordiv,
          "%": operator.mod, "**": operator.pow, "&": operator.and_, "|": operator.or_, "^": operator.xor,
          "<<": operator.lshift, ">>": operator.rshift}
_UNARYOP = {"not": operator.not_, "-": operator.neg, "+": operator.pos, "~": operator.invert}

_interpreter = F.Interpreter(Expressions.DIALECT, {
    "attribute": lambda arguments, node, scope: attribute(arguments[0](), node.attr),
    "subscript": lambda arguments, node, scope: arguments[0]()[node.key],
    "call": _call,
    "compare": {name: _strict(function) for name, function in _COMPARE.items()},
    "boolop": {name: _boolop(name) for name in ("and", "or")},
    "binop": {name: _strict(function) for name, function in _BINOP.items()},
    "unaryop": {name: _strict(function) for name, function in _UNARYOP.items()},
    "ifexp": lambda arguments, node, scope: arguments[1]() if arguments[0]() else arguments[2](),
}, scope=Scope)


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of an expression in `scope`, or with the variables in a mapping bound."""
    return _interpreter(Expressions.DIALECT.resolve(expression), scope)

