"""Evaluators of the Python3 dialect: compute an expression by Python's rules, in a scope that decides what it may reach.

`Evaluators.OfAny(expression, scope)` evaluates in a `Scope`, or in one made from a mapping of variables. Python's
rules apply, not Patterns': `and` and `or` give one of their operands, `1 == 1.0` is True, `True + 1` is 2, and a
missing attribute raises `AttributeError`. Data objects, read through mbse-schemas' readers (`Framework.Objects`), have
their properties as attributes.

A `Scope(variables, modules, builtins)` resolves names as Python does, innermost first: names bound by lets and
imports, then `variables`, then `builtins` (by default a few that read values: `abs`, `all`, `any`, `bool`, `float`,
`getattr`, `hasattr`, `int`, `len`, `max`, `min`, `round`, `set`, `str`, `sum`). A list property is a list of its
values, a keyed list's too; a list display is a list, and a dict display a dict. Nothing else is reachable from an expression, since expressions
may come from data:

- An import resolves only a module in `modules`, or a submodule of one: `Scope(modules={'numpy': numpy})` allows
  `import numpy as np` and `from numpy.ma import getmaskarray`, and every other import raises `ImportError`.
- Attributes whose names start with `_` are refused.
- A call may call only a builtin of the scope, a value of `variables`, or a function of an allowed module.

The evaluator is shallow (the dialects proposal, Decided, 8): it evaluates the kinds Python's constraints were written
with before the dialect was complete (`EVALUATED`), in their complete shapes: a comparison chain, `and` and `or` of any
number of values, a call of positional arguments, a subscript, a generator expression of any number of `for` clauses
over names. Any other kind is refused by name ("Python3 lambda is not evaluated", `NotImplementedError`), and so are
what the kinds it evaluates hold beyond that: a keyword argument, a dict's `**` item, an `async for`, a target that is
not a name, and the operators `is`, `is not` and `@`.
"""

from __future__ import annotations

import operator
import types
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F, Objects, Symbolics as S, Terms

from . import Domains, Expressions

__all__ = ["OfAny", "INTERPRETER", "Scope", "BUILTINS", "EVALUATED"]


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


def _refuse(what: str) -> NotImplementedError:
    return NotImplementedError(f"Python3 {what} is not evaluated")


def _call(arguments: list[F.Thunk], node: Any, scope: Scope) -> Any:
    if "keywords" in _attributes(node):
        raise _refuse("keyword")
    function = arguments[0]()
    if not callable(function) or not scope.allows(function):
        what = getattr(function, "__name__", type(function).__name__)
        raise TypeError(f"calling {what!r} is not allowed by the scope")
    return function(*(argument() for argument in arguments[1:]))


def _generatorexp(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    """A generator, as Python makes one: its first iterable evaluated now, the rest as it is consumed, each `for`
    clause binding its name within the clauses after it and the element."""
    record = Terms.kind_of(node)[1]
    terms, clauses, i = Terms.arguments_of(record), [], 1
    for part in _attributes(node).get("generators", ()):
        if part.attributes.get("is_async"):
            raise _refuse("async comprehension")
        target = terms[i]
        if target is None or Terms.kind_of(target)[0] != Expressions.NAME:
            raise _refuse(f"{'missing' if target is None else Terms.kind_of(target)[0]} target")
        clauses.append((Terms.name_of(target), terms[i + 1], terms[i + 2:i + part.size]))
        i += part.size
    if not clauses:
        raise ValueError("a generatorexp needs a for clause")

    def generate(k: int, inner: Any, items: Any) -> Any:
        name, _, conditions = clauses[k]
        for item in items:
            bound = inner.bind(name, item)
            if all(INTERPRETER.evaluate(condition, bound) for condition in conditions):
                if k + 1 == len(clauses):
                    yield INTERPRETER.evaluate(terms[0], bound)
                else:
                    yield from generate(k + 1, bound, INTERPRETER.evaluate(clauses[k + 1][1], bound))

    return generate(0, scope, iter(arguments[1 + 1]()))  # the first iterable, after the element and the first target


def _boolop(name: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
        value = None
        for argument in arguments:
            value = argument()
            if (not value) if name == "and" else bool(value):
                return value
        return value

    return apply


def _strict(function: Callable[..., Any]) -> F.Implementation:
    return lambda arguments, node, scope: function(*(argument() for argument in arguments))


_COMPARE = {"==": operator.eq, "!=": operator.ne, "<": operator.lt, "<=": operator.le, ">": operator.gt,
            ">=": operator.ge, "in": lambda a, b: a in b, "not in": lambda a, b: a not in b}
_BINOP = {"+": operator.add, "-": operator.sub, "*": operator.mul, "/": operator.truediv, "//": operator.floordiv,
          "%": operator.mod, "**": operator.pow, "&": operator.and_, "|": operator.or_, "^": operator.xor,
          "<<": operator.lshift, ">>": operator.rshift}
_UNARYOP = {"not": operator.not_, "-": operator.neg, "+": operator.pos, "~": operator.invert}


def _compare(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    """A comparison chain, as Python evaluates one: each operand once, left to right, stopping at the first link
    that is false, whose result it gives, else the last link's."""
    operators = [part.attributes["op"] for part in _attributes(node)["comparisons"]]
    for op in operators:
        if op not in _COMPARE:
            raise _refuse(f"compare {op!r}") if op in Domains.COMPARE else NotImplementedError(
                f"{op!r} is not a core operation")
    left, result = arguments[0](), None
    for op, argument in zip(operators, arguments[1:]):
        right = argument()
        result = _COMPARE[op](left, right)
        if not result:
            return result
        left = right
    return result


def _attributes(node: Any) -> dict[str, Any]:
    """A term's attributes."""
    return Terms.attributes_of(Terms.kind_of(node)[1])


_P = Expressions


def _dict(arguments: list[F.Thunk], node: Any, scope: Any) -> dict[Any, Any]:
    """A dict display's value: its keys and values evaluated in order, a later equal key's value replacing an
    earlier's."""
    if any(argument is None for argument in Terms.arguments_of(Terms.kind_of(node)[1])[::2]):
        raise _refuse("dict's ** item")
    result: dict[Any, Any] = {}
    for i in range(0, len(arguments), 2):
        key = arguments[i]()
        result[key] = arguments[i + 1]()
    return result


EVALUATED = frozenset({_P.LITERAL, _P.NAME, _P.LET, _P.LIST, _P.DICT, _P.ATTRIBUTE, _P.SUBSCRIPT, _P.CALL, _P.COMPARE,
                       _P.BOOLOP, _P.BINOP, _P.UNARYOP, _P.IFEXP, _P.GENERATOREXP, _P.IMPORT, _P.IMPORTFROM})
"""The kinds the evaluator evaluates; any other is refused by name."""

INTERPRETER = F.Interpreter(_P.DIALECT, {
    _P.ATTRIBUTE: lambda arguments, node, scope: attribute(arguments[0](), _attributes(node)["attr"]),
    _P.SUBSCRIPT: lambda arguments, node, scope: arguments[0]()[arguments[1]()],
    _P.GENERATOREXP: _generatorexp,
    _P.CALL: _call,
    _P.COMPARE: _compare,
    _P.BOOLOP: {name: _boolop(name) for name in ("and", "or")},
    _P.BINOP: {name: _strict(function) for name, function in _BINOP.items()},
    _P.UNARYOP: {name: _strict(function) for name, function in _UNARYOP.items()},
    _P.IFEXP: lambda arguments, node, scope: arguments[0]() if arguments[1]() else arguments[2](),
    _P.LIST: lambda arguments, node, scope: [argument() for argument in arguments],
    _P.DICT: _dict,
}, scope=Scope, evaluated=EVALUATED)
"""The interpreter of the Python3 dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> Any:
    """The value of a term (or anything `Terms.term` reads one from) in `scope`, or with the variables in a mapping
    bound."""
    return INTERPRETER(expression, scope)

