"""Simplifiers of the Python3 dialect: simplify an expression by Python's rules, in a scope that decides what it may
reach.

`Simplifiers.OfAny(expression, scope)` simplifies in a `Scope`, or in one made from a mapping of variables (see
`mbse.Expressions.Framework.Simplifiers`): what the scope determines is folded into the literal of its value, a basic
scalar's (a list, a dict, an object or a generator has none, and its subterm stays, its own subterms simplified), and
the rest stays a Python3 expression. Python's rules apply, not Patterns': `and` and `or` give one of their operands,
`1 == 1.0` is True, `True + 1` is 2, and a missing attribute raises `AttributeError`. Data objects, read through
mbse-schemas' readers (`Framework.Objects`), have their properties as attributes.

A `Scope(variables, modules, builtins)` resolves names as Python does, innermost first: names bound by lets and
imports, then `variables`, then `builtins` (by default a few that read values: `abs`, `all`, `any`, `bool`, `float`,
`getattr`, `hasattr`, `int`, `len`, `max`, `min`, `round`, `set`, `str`, `sum`). A name it does not bind stays in the
residual. A list property is a list of its values, a keyed list's too; a list display is a list, and a dict display a
dict. Nothing else is reachable from an expression, since expressions may come from data:

- An import resolves only a module in `modules`, or a submodule of one: `Scope(modules={'numpy': numpy})` allows
  `import numpy as np` and `from numpy.ma import getmaskarray`; any other import stays in the residual, unresolved.
- Attributes whose names start with `_` are refused (`AttributeError`).
- A call may call only a builtin of the scope, a value of `variables`, or a function of an allowed module.

Its rules are shallow (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "A shallow evaluator"): they fold the kinds Python's constraints were written
with before the dialect was complete (`FOLDED`), in their complete shapes: a comparison chain, `and` and `or` of any
number of values, a call of positional arguments, a subscript, a generator expression of any number of `for` clauses
over names. Any other kind stays in the residual, named ("Python3 lambda is not simplified"), as does a kind of its
family's other dialects, and invalid syntax, by the name of the dialect that owns it ("Python Types typevar is not
simplified"; a type expression of Python3's kinds simplifies as Python3's), and so does what the kinds it folds hold
beyond that: a keyword argument, a dict's `**` item, an `async for`, a target that is not a name, and the operators
`is`, `is not` and `@`. `CATEGORIES` gives each the evaluation inventory's class.
"""

from __future__ import annotations

import operator
import types
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Objects, Simplifiers as F, Symbolics as S, Terms

from . import Domains, Expressions

__all__ = ["OfAny", "RULES", "SIMPLIFIER", "Scope", "BUILTINS", "FOLDED", "CATEGORIES"]


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
        if name in self.values or name not in self.builtins:
            return self.value(name)
        return self.builtins[name]

    def module(self, name: str) -> types.ModuleType:
        """The module `name`, if allowed: one of `modules`, or a submodule reached through its attributes."""
        root, *parts = name.split(".")
        if root not in self.modules:
            raise S.Unbound(name)
        module = self.modules[root]
        for part in parts:
            module = getattr(module, part, None) if not part.startswith("_") else None
            if not isinstance(module, types.ModuleType):
                raise S.Unbound(name)
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
            raise S.Unbound(f"{module_name}.{name}")
        return self.bind(alias or name, getattr(module, name))

    def allows(self, function: Any) -> bool:
        """Whether an expression may call `function`."""
        if any(function is value for value in self.builtins.values()):
            return True
        if any(function is value for value in self.values.maps[-1].values()):
            return True
        module = getattr(function, "__module__", None)
        return type(module) is str and module.split(".")[0] in self.modules


def _refuse(what: str) -> F.NoRule:
    return F.NoRule("Python3", what)


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
    terms, clauses, i = Terms.arguments_of(record), [], 2  # after Let's empty value and its body, the element
    for part in _attributes(node).get("generators", ()):
        if part.attributes.get("is_async"):
            raise _refuse("async comprehension")
        target = part.attributes.get("target")  # a pattern, its terms the clause's last
        if target is not None and target.kind in Terms.INVALID_KINDS:  # invalid syntax, named as every dialect names it
            raise _refuse(target.kind)
        if target is None or target.kind != Expressions.NAME:
            raise _refuse(f"{'missing' if target is None else target.kind} target")
        clauses.append((target.attributes["name"], terms[i], terms[i + 1:i + part.size - target.size]))
        i += part.size
    if not clauses:
        raise ValueError("a generatorexp needs a for clause")

    def generate(k: int, inner: Any, items: Any) -> Any:
        name, _, conditions = clauses[k]
        for item in items:
            bound = inner.bind(name, item)
            if all(RULES.evaluate(condition, bound) for condition in conditions):
                if k + 1 == len(clauses):
                    yield RULES.evaluate(terms[1], bound)
                else:
                    yield from generate(k + 1, bound, RULES.evaluate(clauses[k + 1][1], bound))

    return generate(0, scope, iter(arguments[2]()))  # the first iterable, after the element


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
            raise _refuse(f"compare {op!r}")
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


FOLDED = frozenset({_P.LITERAL, _P.NAME, _P.LET, _P.LIST, _P.DICT, _P.ATTRIBUTE, _P.SUBSCRIPT, _P.CALL, _P.COMPARE,
                    _P.BOOLOP, _P.BINOP, _P.UNARYOP, _P.IFEXP, _P.GENERATOREXP, _P.IMPORT, _P.IMPORTFROM})
"""The kinds its rules fold; any other stays in the residual, named."""

CATEGORIES: dict[str, dict[str, str]] = {
    "Python3": {"yield": "d", "yieldfrom": "d", "await": "d", "async comprehension": "d", "attribute target": "d",
                "subscript target": "d"},
    "Python Types": {"*": "b"}, "Python Patterns": {"*": "b"}, "Python RegExp": {"*": "b"},
}
"""The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given)."""

RULES = F.Interpreter(_P.DIALECT, {    _P.ATTRIBUTE: lambda arguments, node, scope: attribute(arguments[0](), _attributes(node)["attr"]),
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
}, scope=Scope, folded=FOLDED)
"""The folding rules of the Python3 dialect."""

SIMPLIFIER = F.Simplifier(RULES, literal=F.natives(_P.DIALECT), categories=CATEGORIES)
"""The simplifier of the Python3 dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> F.Simplified:
    """The simplification of a term (or anything `Terms.term` reads one from) in `scope`, or with the variables in a
    mapping bound."""
    return SIMPLIFIER(expression, scope)

