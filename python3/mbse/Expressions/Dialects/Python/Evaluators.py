"""Evaluators of the Python dialect: compute an expression by Python's rules, in a scope that decides what it may reach.

`Evaluators.OfAny(expression, scope)` evaluates in a `Scope`, or in one made from a mapping of variables. Python's
rules apply, not Basic's: `and` and `or` give one of their operands, `1 == 1.0` is True, `True + 1` is 2, and a
missing attribute raises `AttributeError`. Data objects, read through mbse-schemas' readers (`Framework.Objects`), have
their properties as attributes.

A `Scope(variables, modules, builtins)` resolves names as Python does, innermost first: names bound by lets and
imports, then `variables`, then `builtins` (by default a few that read values: `abs`, `all`, `any`, `bool`, `float`,
`getattr`, `hasattr`, `int`, `len`, `max`, `min`, `round`, `set`, `str`, `sum`). A list property is a list of its
values, a keyed list's too. Nothing else is reachable from an expression, since expressions
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

from mbse.Expressions.Framework import Evaluators as F, Objects, Symbolics as S, Terms

from . import Expressions

__all__ = ["OfAny", "INTERPRETER", "Scope", "BUILTINS"]


def attribute(value: Any, name: str) -> Any:
    """`value.name`, as expressions read it: never private, and a data object's properties."""
    if type(name) is not str or name.startswith("_"):
        raise AttributeError(f"attribute {name!r} is private")
    if Objects.is_object(value):
        properties = Objects.properties(value)
        if name not in properties:  # named by its schema, the type it has for expressions
            raise AttributeError(f"{value.as_schema().name!r} object has no attribute {name!r}")
        return _listed(properties[name])
    return getattr(value, name)


def _listed(value: Any) -> Any:
    """A property's value as Python reads it: a list as a list of its values, lists of lists too."""
    return [_listed(item) for item in value.values] if isinstance(value, Objects.Listed) else value


def _hasattr(value: Any, name: str) -> bool:
    try:
        attribute(value, name)
    except AttributeError:
        return False
    return True


BUILTINS: dict[str, Any] = {
    "abs": abs, "all": all, "any": any, "bool": bool, "float": float, "getattr": attribute, "hasattr": _hasattr,
    "int": int, "len": len, "max": max, "min": min, "round": round, "set": set, "str": str, "sum": sum,
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
        name = Terms.name_of(reference)
        if name in self.values:
            return self.values[name]
        if name in self.builtins:
            return self.builtins[name]
        raise NameError(f"name {name!r} is not defined")

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
        tag, record = Terms.kind_of(declaration)
        attributes = Terms.attributes_of(record)
        module_name, alias = attributes["module"], attributes.get("alias")
        if tag == Expressions.IMPORT:
            if alias:
                return self.bind(alias, self.module(module_name))
            root = module_name.split(".")[0]
            self.module(module_name)  # the whole path must be allowed
            return self.bind(root, self.modules[root])
        module, name = self.module(module_name), attributes["name"]
        if name.startswith("_") or not hasattr(module, name):
            raise ImportError(f"cannot import name {name!r} from {module_name!r}")
        return self.bind(alias or name, getattr(module, name))

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


def _generator(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    """A generator, as Python makes one: its iterable evaluated now, its element and conditions as it is consumed."""
    element, conditions = arguments[1], arguments[2:]
    return (element(item) for item in arguments[0]() if all(condition(item) for condition in conditions))


def _boolop(name: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
        first = arguments[0]()
        decided = not first if name == "and" else bool(first)
        return first if decided else arguments[1]()

    return apply


def _strict(function: Callable[..., Any]) -> F.Implementation:
    return lambda arguments, node, scope: function(*(argument() for argument in arguments))


_COMPARE = {"==": operator.eq, "!=": operator.ne, "<": operator.lt, "<=": operator.le, ">": operator.gt,
            ">=": operator.ge, "in": lambda a, b: a in b, "not in": lambda a, b: a not in b}
_BINOP = {"+": operator.add, "-": operator.sub, "*": operator.mul, "/": operator.truediv, "//": operator.floordiv,
          "%": operator.mod, "**": operator.pow, "&": operator.and_, "|": operator.or_, "^": operator.xor,
          "<<": operator.lshift, ">>": operator.rshift}
_UNARYOP = {"not": operator.not_, "-": operator.neg, "+": operator.pos, "~": operator.invert}

def _attribute(node: Any, name: str) -> Any:
    """A term's attribute `name`."""
    return Terms.attributes_of(Terms.kind_of(node)[1])[name]


_P = Expressions
INTERPRETER = F.Interpreter(_P.DIALECT, {
    _P.ATTRIBUTE: lambda arguments, node, scope: attribute(arguments[0](), _attribute(node, "attr")),
    _P.SUBSCRIPT: lambda arguments, node, scope: arguments[0]()[_attribute(node, "key")],
    _P.INDEX: lambda arguments, node, scope: arguments[0]()[arguments[1]()],
    _P.GENERATOR: _generator,
    _P.CALL: _call,
    _P.COMPARE: {name: _strict(function) for name, function in _COMPARE.items()},
    _P.BOOLOP: {name: _boolop(name) for name in ("and", "or")},
    _P.BINOP: {name: _strict(function) for name, function in _BINOP.items()},
    _P.UNARYOP: {name: _strict(function) for name, function in _UNARYOP.items()},
    _P.IFEXP: lambda arguments, node, scope: arguments[1]() if arguments[0]() else arguments[2](),
}, scope=Scope)
"""The interpreter of the Python dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of a term (or anything `Terms.term` reads one from) in `scope`, or with the variables in a mapping
    bound."""
    return INTERPRETER(expression, scope)

