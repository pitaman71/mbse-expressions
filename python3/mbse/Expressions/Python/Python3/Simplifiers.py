"""Simplifiers of the Python3 dialect: simplify an expression by Python's rules, in a scope that decides what it may
reach.

`Simplifiers.OfAny(expression, scope)` simplifies in a `Scope`, or in one made from a mapping of variables (see
`mbse.Expressions.Framework.Simplifiers`): what the scope determines is folded into the literal of its value, a basic
scalar's or a constant's (`None`, `...`, a complex number), or, for a list, a tuple, a dict or a non-empty set of such
values, into its display (`[1, 2]`, a set's items in an order of their values, `{1, 'a'}`), each a closed constructor
expression (mbse-basis [VOC-034: closed constructor expression](mbse:mbse-basis/docs/VOCABULARY.md#VOC-034)); a value
with none stays, its subterm kept and its own subterms simplified: an object, a generator, an empty set, a frozenset, a
slice, a closure (a `lambda`'s value) and a template (a t-string's). The rest stays a Python3 expression. Python's
rules apply, not Patterns': `and` and `or` give one of their operands, `1 == 1.0` is True, `True + 1` is 2, and a
missing attribute raises `AttributeError`. Data objects, read through mbse-schemas' readers (`Framework.Objects`), have
their properties as attributes.

A `Scope(variables, modules, builtins)` resolves names as Python does, innermost first: names bound by lets and
imports, then `variables`, then `builtins` (by default a few that read values: `abs`, `all`, `any`, `bool`, `float`,
`getattr`, `hasattr`, `int`, `len`, `max`, `min`, `round`, `set`, `str`, `sum`). A name it does not bind stays in the
residual. A list property is a list of its values, a keyed list's too; a list display is a list, a tuple display a
tuple, a set display a set and a dict display a dict. Nothing else is reachable from an expression, since expressions
may come from data:

- An import resolves only a module in `modules`, or a submodule of one: `Scope(modules={'numpy': numpy})` allows
  `import numpy as np` and `from numpy.ma import getmaskarray`; any other import stays in the residual, unresolved.
- Attributes whose names start with `_` are refused (`AttributeError`).
- A call may call only a builtin of the scope, a value of `variables`, a function of an allowed module, or a closure
  the expression made (a `lambda`).

Its rules fold every statement-free kind whose value Python defines (mbse-basis [CAP-295: simplification of
single-dialect expressions with literal leaves](mbse:mbse-basis/docs/capabilities/README.md#CAP-295) to [CAP-297:
simplification in every binding state](mbse:mbse-basis/docs/capabilities/README.md#CAP-297)), in their complete shapes
(`FOLDED`): constants, displays and their `*` and `**` unpacking, comprehensions of any number of clauses over targets
that unpack, f-strings by `format()`'s mini-language (a complex number's among them) and t-strings, slices, calls with
keywords and unpacking, lambdas called with Python's binding of parameters, named expressions, `is` and `is not` by
identity, `@`, and a `\\N{...}` escape by Unicode's character names and aliases, as CPython reads them. What stays in
the residual, named, is what has no value outside a statement (`yield`, `yield from`, `await`, an `async for`, a target
that writes into data), a kind of its family's other dialects and invalid syntax, by the name of the dialect that owns
it ("Python Types typevar is not simplified"; a type expression of Python3's kinds simplifies as Python3's), a
`\\N{...}` escape Python refuses to compile (malformed, or of an unknown name), and what Python leaves to its
implementation or its platform, each named where it is decided: `is` between equal immutable values; an f-string's
field whose text is an implementation's (a set's order, an object's address), a format spec of a locale (`n`), or one
Python refuses; a complex power other than an integer one, and a real power whose value is complex, which need the
platform's `pow`, `atan2`, `cos` and `sin`. `CATEGORIES` gives each the evaluation inventory's class.

Each of those five stays by default, and the scope's options choose otherwise (mbse-basis [CAP-305: simplification's
options, chosen up front](mbse:mbse-basis/docs/capabilities/CAP-305.md)): `Scope(..., options={...})`, each option by
its name in `OPTIONS`, whose first value is its default. The simplifier refuses, before it simplifies, a value that an
option does not take.

- `specs`: `"raise"` raises the `ValueError` that Python raises for a format spec it refuses, with CPython's message.
- `identity`: `"cpython"` answers `is` between equal immutable values as CPython 3.14 answers it where the values
  decide it: True for the values CPython keeps one object of (an int from -5 to 256, `()`, `''` and `b''`). Any other
  pair stays, since whether two such values are one object depends on how they were made.
- `math`: `"host"` folds a complex power by the host's math library, as CPython's `_Py_c_pow` computes it.
- `locale`: a mapping that gives `decimal_point`, `thousands_sep` and `grouping`, as Python's `locale.localeconv()`
  gives them, formats a spec of type `n` under that locale (`grouping` a list of group sizes from the right, 0 repeating
  the last and 127, C's `CHAR_MAX`, ending the grouping).
- `text`: `"cpython"` writes a field whose text is the implementation's as CPython writes it: an object's address, a
  set's order in its hash table, a template's `repr`.
"""

from __future__ import annotations

import codecs
import functools
import math
import operator
import re
import types
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Objects, Simplifiers as F, Symbolics as S, Terms

from . import Expressions

__all__ = ["OfAny", "RULES", "SIMPLIFIER", "Scope", "BUILTINS", "FOLDED", "CATEGORIES", "OPTIONS"]

OPTIONS: dict[str, tuple[str, str]] = {"specs": ("stay", "raise"), "identity": ("stay", "cpython"),
                                       "math": ("stay", "host"), "text": ("stay", "cpython")}
"""The options of the scope that take a string, each by its name, with its values, its default first; the option
`locale` takes `"stay"`, its default, or a locale (see the module's description)."""

_CHAR_MAX = 127
"""The group size that ends a locale's grouping, C's `CHAR_MAX` where `char` is signed."""


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


def _abs(value: Any) -> Any:
    """Python's `abs`: a complex number's, correctly rounded (`_hypot`)."""
    if type(value) is complex:
        return _hypot(value.real, value.imag)
    return abs(value)


_abs.__name__ = _abs.__qualname__ = "abs"


def _hypot(x: float, y: float) -> float:
    """`sqrt(x * x + y * y)`, correctly rounded, so that both implementations give the same bits *(agent)*: the sum
    of squares computed exactly, its integer square root carrying a sticky bit, rounded once."""
    x, y = abs(x), abs(y)
    if math.isinf(x) or math.isinf(y):
        return math.inf
    if math.isnan(x) or math.isnan(y):
        return math.nan
    if x == 0.0 or y == 0.0:
        return x + y
    (mx, ex), (my, ey) = (_bits(x), _bits(y))
    low = min(ex, ey)
    total = (mx << (ex - low)) ** 2 + (my << (ey - low)) ** 2  # x² + y², times 2 ** (-2 * low)
    shift = max(0, 140 - total.bit_length())
    shift += shift % 2
    root = math.isqrt(total << shift)
    root = (root << 1) | (root * root != total << shift)  # a sticky bit below the rounding position
    try:
        return math.ldexp(float(root), low - shift // 2 - 1)
    except OverflowError:
        raise OverflowError("absolute value too large") from None


def _bits(x: float) -> tuple[int, int]:
    """A positive finite float as `m * 2 ** e`, `m` an int."""
    mantissa, exponent = math.frexp(x)
    return int(mantissa * (1 << 53)), exponent - 53


BUILTINS: dict[str, Any] = {
    "abs": _abs, "all": all, "any": any, "bool": bool, "float": float, "getattr": attribute, "hasattr": _hasattr,
    "int": int, "len": len, "max": max, "min": min, "round": round, "set": set, "str": str, "sum": sum,
}
"""The builtins a scope provides by default, one per name of `Expressions.BUILTINS`."""

_KEYWORDS: dict[str, tuple[str, ...]] = {"max": ("key", "default"), "min": ("key", "default"), "sum": ("start",)}
"""The keyword arguments each builtin of `BUILTINS` takes, as Python's own take them; the others take none."""


# --- Values with no literal ---


class _Unpacked:
    """What `*value` gives: the iterable it spreads into a display or a call's arguments."""

    __slots__ = ("value",)

    def __init__(self, value: Any):
        self.value = value


_Unpacked.__name__ = _Unpacked.__qualname__ = "starred"


class _Closure:
    """A lambda's value: a callable that binds Python's parameters (positional-only, defaults, `*args`, keyword-only,
    `**kwargs`) and folds its body in the scope it was made in."""

    __name__ = "<lambda>"

    def __init__(self, parameters: dict[str, Any], defaults: dict[str, Any], body: Any, scope: Any):
        self.parameters, self.defaults, self.body, self.scope = parameters, defaults, body, scope

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        return RULES.evaluate(self.body, _bind_parameters(self.parameters, self.defaults, list(args), kwargs,
                                                          self.scope))

    def __repr__(self) -> str:
        """CPython's text of a lambda: its name and its address."""
        return f"<function <lambda> at {id(self):#x}>"


_Closure.__name__ = _Closure.__qualname__ = "function"  # its type's name, as CPython's lambda has it


def _bind_parameters(p: dict[str, Any], defaults: dict[str, Any], args: list[Any], kwargs: dict[str, Any],
                     scope: Any) -> Any:
    """`scope` with a lambda's parameters bound to `args` and `kwargs`, as Python binds them, with CPython's
    messages."""
    name = "<lambda>()"
    positional = p["posonlyargs"] + p["args"]
    bound: dict[str, Any] = dict(zip(positional, args))
    extra: dict[str, Any] = {}
    misplaced: list[str] = []
    for key, value in kwargs.items():
        if key in p["posonlyargs"] and p["kwarg"] is None:
            misplaced.append(key)
        elif key in p["posonlyargs"] or key not in p["args"] + p["kwonlyargs"]:
            if p["kwarg"] is None:
                raise TypeError(f"{name} got an unexpected keyword argument '{key}'")
            extra[key] = value
        elif key in bound:
            raise TypeError(f"{name} got multiple values for argument '{key}'")
        else:
            bound[key] = value
    if misplaced:
        raise TypeError(f"{name} got some positional-only arguments passed as keyword arguments: '{', '.join(misplaced)}'")
    if len(args) > len(positional) and p["vararg"] is None:
        keyword_only = sum(1 for key in kwargs if key in p["kwonlyargs"])
        raise TypeError(_too_many(name, positional, defaults, len(args), keyword_only))
    for group, what in ((positional, "positional"), (p["kwonlyargs"], "keyword-only")):
        for parameter in group:
            if parameter not in bound and parameter in defaults:
                bound[parameter] = defaults[parameter]
        missing = [parameter for parameter in group if parameter not in bound]
        if missing:
            plural = "s" if len(missing) > 1 else ""
            raise TypeError(f"{name} missing {len(missing)} required {what} argument{plural}: {_listing(missing)}")
    if p["vararg"] is not None:
        bound[p["vararg"]] = tuple(args[len(positional):])
    if p["kwarg"] is not None:
        bound[p["kwarg"]] = extra
    for parameter in positional + p["kwonlyargs"] + [p["vararg"], p["kwarg"]]:
        if parameter is not None:
            scope = scope.bind(parameter, bound[parameter])
    return scope


def _too_many(name: str, positional: list[str], defaults: Mapping[str, Any], given: int, keyword_only: int) -> str:
    """CPython's message for a call given more positional arguments than its parameters take."""
    least = sum(1 for parameter in positional if parameter not in defaults)
    s = "" if len(positional) == 1 else "s"
    takes = f"from {least} to {len(positional)} positional arguments" if least < len(positional) else (
        f"{len(positional)} positional argument{s}")
    if keyword_only:
        given_s, keyword_s = "" if given == 1 else "s", "" if keyword_only == 1 else "s"
        return (f"{name} takes {takes} but {given} positional argument{given_s} (and {keyword_only} keyword-only "
                f"argument{keyword_s}) were given")
    return f"{name} takes {takes} but {given} {'was' if given == 1 else 'were'} given"


def _listing(names: list[str]) -> str:
    """`'a'`, `'a' and 'b'`, `'a', 'b', and 'c'`, as CPython lists missing arguments."""
    quoted = [f"'{name}'" for name in names]
    if len(quoted) < 3:
        return " and ".join(quoted)
    return ", ".join(quoted[:-1]) + f", and {quoted[-1]}"


class _Interpolation:
    """A t-string's replacement field, as `string.templatelib.Interpolation` (Python 3.14) holds it: its `value`, its
    `expression` (its text), its `conversion` and its `format_spec`, evaluated."""

    def __init__(self, value: Any, expression: str, conversion: str | None, format_spec: str):
        self.value, self.expression, self.conversion, self.format_spec = value, expression, conversion, format_spec

    def __repr__(self) -> str:
        return f"Interpolation({self.value!r}, {self.expression!r}, {self.conversion!r}, {self.format_spec!r})"

    def __format__(self, spec: str) -> str:
        return _object_format(self, spec, "string.templatelib.Interpolation")


class _Template:
    """A t-string's value, as `string.templatelib.Template` (Python 3.14) holds it: its `strings`, one more than its
    `interpolations`, and their `values`; its text is CPython's (`repr`, `str` and `format`)."""

    def __init__(self, strings: tuple[str, ...], interpolations: tuple[_Interpolation, ...]):
        self.strings, self.interpolations = strings, interpolations
        self.values = tuple(interpolation.value for interpolation in interpolations)

    def __repr__(self) -> str:
        return f"Template(strings={self.strings!r}, interpolations={self.interpolations!r})"

    def __format__(self, spec: str) -> str:
        return _object_format(self, spec, "string.templatelib.Template")


def _object_format(value: Any, spec: str, name: str) -> str:
    """`object.__format__`, which CPython's templates and interpolations inherit: their `str` for an empty spec, else a
    TypeError naming their type as CPython names it."""
    if spec:
        raise TypeError(f"unsupported format string passed to {name}.__format__")
    return str(value)


_Interpolation.__name__ = _Interpolation.__qualname__ = "Interpolation"
_Template.__name__ = _Template.__qualname__ = "Template"


# --- The scope ---


class Scope(S.Variables):
    """Python's scope for an expression: `variables`, the `modules` imports may bring in, `builtins`, and the `options`
    of simplification (`OPTIONS`, and `locale`)."""

    def __init__(self, variables: Mapping[str, Any] | None = None, modules: Mapping[str, types.ModuleType] | None = None,
                 builtins: Mapping[str, Any] | None = None, options: Mapping[str, Any] | None = None):
        super().__init__(variables, options)
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
        """Whether an expression may call `function`: a builtin, a variable, a module's, or a closure it made."""
        if isinstance(function, _Closure) or any(function is value for value in self.builtins.values()):
            return True
        if any(function is value for value in self.values.maps[-1].values()):
            return True
        module = getattr(function, "__module__", None)
        return type(module) is str and module.split(".")[0] in self.modules


def _refuse(what: str) -> F.NoRule:
    return F.NoRule("Python3", what)


def _attributes(node: Any) -> dict[str, Any]:
    """A term's attributes."""
    return Terms.attributes_of(Terms.kind_of(node)[1])


def _arguments(node: Any) -> tuple[Any, ...]:
    """A term's arguments, None where empty."""
    return Terms.arguments_of(Terms.kind_of(node)[1])


def _name(value: Any) -> str:
    """Python's `type(value).__name__`."""
    return type(value).__name__


def _iterable(value: Any, message: str) -> list[Any]:
    """The items of an iterable, or a TypeError with `message`."""
    try:
        return list(iter(value))
    except TypeError:
        raise TypeError(message) from None


def _spread(arguments: list[F.Thunk], what: str = "Value") -> list[Any]:
    """The values of arguments, each `*value` spread into its items."""
    items: list[Any] = []
    for argument in arguments:
        value = argument()
        if isinstance(value, _Unpacked):
            items += _iterable(value.value, f"{what} after * must be an iterable, not {_name(value.value)}")
        else:
            items.append(value)
    return items


def _mapping(value: Any, message: str) -> list[tuple[Any, Any]]:
    """The items of a mapping, in order, or a TypeError with `message`."""
    if not isinstance(value, Mapping):
        raise TypeError(message)
    return list(value.items())


# --- Calls ---


def _call(arguments: list[F.Thunk], node: Any, scope: Scope) -> Any:
    """A call: its function, then its positional arguments (`*` spreading an iterable) and its keywords (`**`
    spreading a mapping), as Python binds them; a builtin takes the keywords Python's takes."""
    keywords = _attributes(node).get("keywords", ())
    function = arguments[0]()
    if not callable(function) or not scope.allows(function):
        what = getattr(function, "__name__", _name(function))
        raise TypeError(f"calling {what!r} is not allowed by the scope")
    name = f"{getattr(function, '__name__', _name(function))}()"
    split = len(arguments) - len(keywords)  # each keyword's value, the last arguments
    args = _spread(arguments[1:split], f"{name} argument")
    kwargs: dict[str, Any] = {}
    for part, argument in zip(keywords, arguments[split:]):
        value, key = argument(), part.attributes.get("arg")
        items = [(key, value)] if key is not None else _mapping(
            value, f"{name} argument after ** must be a mapping, not {_name(value)}")
        for key, item in items:
            if type(key) is not str:
                raise TypeError("keywords must be strings")
            if key in kwargs:
                raise TypeError(f"{name} got multiple values for keyword argument '{key}'")
            kwargs[key] = item
    builtin = next((key for key, value in BUILTINS.items() if function is value), None)
    if builtin is not None and kwargs:
        allowed = _KEYWORDS.get(builtin, ())
        if not allowed:
            raise TypeError(f"{builtin}() takes no keyword arguments")
        for key in kwargs:
            if key not in allowed:
                raise TypeError(f"{builtin}() got an unexpected keyword argument '{key}'")
    return function(*args, **kwargs)


def _lambda(arguments: list[F.Thunk], node: Any, scope: Any) -> _Closure:
    """A closure: its parameters, their defaults evaluated now, its body and the scope it is made in."""
    record = Terms.kind_of(node)[1]
    groups = _attributes(node).get("args")
    held = groups.attributes if groups is not None else {}
    parameters: dict[str, Any] = {group: [part.attributes["arg"] for part in held.get(group, ())]
                                  for group in ("posonlyargs", "args", "kwonlyargs")}
    for group in ("vararg", "kwarg"):
        parameters[group] = held[group].attributes["arg"] if group in held else None
    ordered = [part for group in ("posonlyargs", "args", "vararg", "kwonlyargs", "kwarg") for part in (
        held.get(group, ()) if group not in ("vararg", "kwarg") else (held[group],) if group in held else ())]
    terms = Terms.arguments_of(record)  # Let's empty value, its body, then each parameter's annotation and default
    defaults = {part.attributes["arg"]: arguments[3 + 2 * i]()
                for i, part in enumerate(ordered) if terms[3 + 2 * i] is not None}
    return _Closure(parameters, defaults, terms[1], scope)


# --- Comprehensions and targets ---


def _target(target: Any) -> tuple[str, Any, tuple[Any, ...]]:
    """A target's kind, its attributes and its terms: a `Terms.Part` and its terms, or a term."""
    if isinstance(target, tuple):
        part, terms = target
        return part.kind, part.attributes, terms
    tag, record = Terms.kind_of(target)
    return tag, Terms.attributes_of(record), Terms.arguments_of(record)


def _check(target: Any, starred: bool = False) -> None:
    """Raises `NoRule` for a target no value binds: one that writes into data, invalid syntax, a starred target alone
    or two in one sequence."""
    tag, _, terms = _target(target)
    if tag == Expressions.PARENTHESIZED:
        _check(terms[0])
    elif tag == Expressions.STARRED and starred:
        _check(terms[0])
    elif tag in (Expressions.TUPLE, Expressions.LIST):
        if sum(1 for term in terms if Terms.kind_of(term)[0] == Expressions.STARRED) > 1:
            raise _refuse("starred target")
        for term in terms:
            _check(term, True)
    elif tag != Expressions.NAME:  # a write into data, a lone starred, or invalid syntax
        raise _refuse(tag if tag in Terms.INVALID_KINDS else f"{tag} target")


def _bind(target: Any, value: Any, scope: Any) -> Any:
    """`scope` with a target (`_check`ed) bound to `value`: a name, or a tuple or a list of targets unpacking it, one of
    them `*starred`, as Python assigns."""
    tag, attributes, terms = _target(target)
    if tag == Expressions.NAME:
        return scope.bind(attributes["name"], value)
    if tag == Expressions.PARENTHESIZED:
        return _bind(terms[0], value, scope)
    stars = [i for i, term in enumerate(terms) if Terms.kind_of(term)[0] == Expressions.STARRED]
    items = _iterable(value, f"cannot unpack non-iterable {_name(value)} object")
    values: list[Any] = items
    if stars:
        star, least = stars[0], len(terms) - 1
        if len(items) < least:
            raise ValueError(f"not enough values to unpack (expected at least {least}, got {len(items)})")
        after = len(items) - (len(terms) - star - 1)
        values = items[:star] + [items[star:after]] + items[after:]
        terms = terms[:star] + (_arguments(terms[star])[0],) + terms[star + 1:]
    elif len(items) != len(terms):
        state = "not enough" if len(items) < len(terms) else "too many"
        raise ValueError(f"{state} values to unpack (expected {len(terms)}, got {len(items)})")
    for term, item in zip(terms, values):
        scope = _bind(term, item, scope)
    return scope


def _clauses(node: Any) -> tuple[tuple[Any, ...], list[tuple[Any, Any, tuple[Any, ...]]]]:
    """A comprehension's terms, and its `for` clauses, each its target (a part and its terms), its iterable and its
    conditions."""
    terms, parts = _arguments(node), _attributes(node).get("generators", ())
    i = len(terms) - sum(part.size for part in parts)
    clauses = []
    for part in parts:
        if part.attributes.get("is_async"):
            raise _refuse("async comprehension")
        target = part.attributes.get("target")  # a pattern, its terms the clause's last
        if target is None:
            raise _refuse("missing target")
        end = i + part.size
        _check((target, terms[end - target.size:end]))
        clauses.append(((target, terms[end - target.size:end]), terms[i], terms[i + 1:end - target.size]))
        i = end
    if not clauses:
        raise ValueError(f"{Terms._article(Terms.kind_of(node)[0])} needs a for clause")
    return terms, clauses


def _scopes(node: Any, scope: Any) -> Any:
    """The comprehension's first iterable, evaluated now in the scope around it, and the scopes its clauses bind, one
    per item, in order, the rest evaluated as they are consumed."""
    _, clauses = _clauses(node)
    first = RULES.evaluate(clauses[0][1], scope)
    items = iter(first)

    def generate(k: int, inner: Any, items: Any) -> Any:
        target, _, conditions = clauses[k]
        for item in items:
            bound = _bind(target, item, inner)
            if all(RULES.evaluate(condition, bound) for condition in conditions):
                if k + 1 == len(clauses):
                    yield bound
                else:
                    yield from generate(k + 1, bound, RULES.evaluate(clauses[k + 1][1], bound))

    return generate(0, scope, items)


def _elements(node: Any, scope: Any) -> Any:
    """A comprehension's elements, one per item, a `*element` spread (Python 3.15)."""
    body = _arguments(node)[1]
    bounds = _scopes(node, scope)

    def generate() -> Any:
        for bound in bounds:
            value = RULES.evaluate(body, bound)
            if isinstance(value, _Unpacked):
                yield from _iterable(value.value, f"Value after * must be an iterable, not {_name(value.value)}")
            else:
                yield value

    return generate()


def _genexpr(generator: Any) -> Any:
    """A generator expression's value, named as CPython names one (`<generator object <genexpr> at 0x...>`)."""
    generator.__name__ = generator.__qualname__ = "<genexpr>"
    return generator


def _dictcomp(arguments: list[F.Thunk], node: Any, scope: Any) -> dict[Any, Any]:
    """A dict comprehension: its key and its value for each item, or a mapping's items for `**key` (Python 3.15)."""
    terms = _arguments(node)
    result: dict[Any, Any] = {}
    for bound in _scopes(node, scope):
        if terms[1] is None:  # `{**mapping for ...}`, the mapping its key
            mapping = RULES.evaluate(terms[2], bound)
            result.update(_mapping(mapping, f"'{_name(mapping)}' object is not a mapping"))
        else:
            key = RULES.evaluate(terms[2], bound)
            result[key] = RULES.evaluate(terms[1], bound)
    return result


# --- Strings ---


_ESCAPES = {"\n": "", "\\": "\\", "'": "'", '"': '"', "a": "\a", "b": "\b", "f": "\f", "n": "\n", "r": "\r",
            "t": "\t", "v": "\v"}
_HEX = {"x": 2, "u": 4, "U": 8}


def _text(spelling: str, raw: bool) -> str:
    """An f-string's or a t-string's text as written, as Python reads it: `{{` and `}}` one brace each, and, unless it
    is raw, its escapes, `\\N{name}` among them."""
    out, i = [], 0
    while i < len(spelling):
        char = spelling[i]
        if char in "{}" and spelling[i + 1:i + 2] == char:
            out.append(char)
            i += 2
            continue
        if char != "\\" or raw or i + 1 == len(spelling):
            out.append(char)
            i += 1
            continue
        code, digits = spelling[i + 1], re.match(r"[0-7]{1,3}", spelling[i + 1:i + 4])
        hexdigits = spelling[i + 2:i + 2 + _HEX.get(code, 0)]
        if code in _ESCAPES:
            out.append(_ESCAPES[code])
            i += 2
        elif digits:
            out.append(chr(int(digits.group(), 8)))
            i += 1 + len(digits.group())
        elif code in _HEX and re.fullmatch(f"[0-9a-fA-F]{{{_HEX[code]}}}", hexdigits) and int(hexdigits, 16) <= 0x10FFFF:
            out.append(chr(int(hexdigits, 16)))
            i += 2 + _HEX[code]
        elif code == "N":
            named, i = _named(spelling, i)
            out.append(named)
        else:  # not an escape: kept as written
            out.append(char)
            i += 1
    return "".join(out)


def _named(spelling: str, i: int) -> tuple[str, int]:
    """The character the `\\N{name}` escape at `i` names, and the index after it: a name or an alias of Unicode's, its
    case ignored, as CPython's `unicodeescape` codec looks it up, which its compiler reads a string with. A malformed
    escape and an unknown name, which Python refuses to compile, stay in the residual, of class (b)."""
    end = spelling.find("}", i + 3)
    if spelling[i + 2:i + 3] != "{" or end <= i + 3:
        raise _refuse("joinedstr's malformed \\N character escape")
    try:
        return codecs.decode(spelling[i:end + 1].encode("ascii"), "unicode_escape"), end + 1
    except (UnicodeEncodeError, UnicodeDecodeError):
        raise _refuse("joinedstr's unknown Unicode character name") from None


def _representable(value: Any) -> bool:
    """Whether Python's `repr` and `str` of a value are its language's, not an implementation's: a basic scalar, a
    constant, a slice, and lists, tuples and dicts of them; not a set (its order is its hash table's), nor an object, a
    generator, a module, a function or a template (their addresses)."""
    if type(value) in (list, tuple):
        return all(_representable(item) for item in value)
    if type(value) is dict:
        return all(_representable(key) and _representable(item) for key, item in value.items())
    if type(value) is slice:
        return all(_representable(part) for part in (value.start, value.stop, value.step))
    return value is None or value is Ellipsis or type(value) in (bool, int, float, complex, str, bytes)


def _texts(scope: Any) -> bool:
    """Whether the scope's option `text` writes a field whose text is the implementation's as CPython writes it."""
    return S.option(scope, "text", "stay") == "cpython"


def _converted(value: Any, conversion: str, scope: Any) -> str:
    """A field's value converted: `!r` its `repr`, `!s` its `str`, `!a` its `ascii`."""
    if not (_representable(value) or _texts(scope)):
        raise _refuse(f"joinedstr's field of {_name(value)}")
    return {"r": repr, "s": str, "a": ascii}[conversion](value)


_SPEC = re.compile(r"(?:(?P<fill>.)?(?P<align>[<>=^]))?(?P<sign>[-+ ])?(?P<z>z)?(?P<alt>#)?(?P<zero>0)?"
                   r"(?P<width>\d+)?(?P<grouping>[,_])?(?:\.(?P<precision>\d+))?(?P<type>[bcdeEfFgGnosxX%])?", re.S)
_FLOATS = "eEfFgG%"


def _supported(value: Any, spec: str) -> bool:
    """Whether a format spec is one of `format()`'s mini-language for a str, an int or a bool, a float, or a complex
    number, that Python formats without error and with no locale: where it would raise (a sign for a str, `,` with `x`,
    zero padding for a complex number), or its locale decides (`n`), it stays in the residual."""
    found = _SPEC.fullmatch(spec)
    if found is None:
        return False
    f = found.groupdict()
    kind = f["type"] or ""
    if kind == "n":
        return False
    if type(value) is str:
        return kind in ("", "s") and not (f["sign"] or f["z"] or f["alt"] or f["grouping"]) and f["align"] != "="
    if type(value) is complex:  # a float's type or none, neither zero padding nor `=` alignment
        return kind in ("", *"eEfFgG") and not f["zero"] and f["fill"] != "0" and f["align"] != "="
    if (kind and kind in _FLOATS) or type(value) is float:
        return kind == "" or kind in _FLOATS
    if kind == "c":
        return not (f["sign"] or f["alt"] or f["grouping"] or f["precision"] or f["z"])
    return kind != "s" and not (f["precision"] or f["z"]) and (f["grouping"] != "," or kind in ("", "d"))


def _formatted(value: Any, spec: str, scope: Any) -> str:
    """`format(value, spec)`, as Python's mini-language has it for a str, an int, a bool, a float or a complex number;
    with no spec, its `str`. A spec Python refuses raises its `ValueError` where the scope's option `specs` is
    `"raise"`, and a spec of type `n` is formatted under the scope's option `locale` where it gives one."""
    if spec == "":
        if not (_representable(value) or _texts(scope)):
            raise _refuse(f"joinedstr's field of {_name(value)}")
        return format(value, spec)
    if type(value) not in (str, int, bool, float, complex):
        if _representable(value):
            raise TypeError(f"unsupported format string passed to {_name(value)}.__format__")
        if not _texts(scope):
            raise _refuse(f"joinedstr's format of {_name(value)}")
        return format(value, spec)  # its own `__format__`, CPython's
    try:
        written = format(value, spec)  # CPython's own check of the spec
    except ValueError:
        if S.option(scope, "specs", "stay") == "raise":
            raise
        raise _refuse(f"joinedstr's format spec {spec!r} of {_name(value)}") from None
    if _supported(value, spec):
        return written
    locale, found = _locale(S.option(scope, "locale", "stay")), _SPEC.fullmatch(spec)
    if locale is not None and found is not None and found["type"] == "n":
        return _localized(value, found.groupdict(), locale)
    raise _refuse(f"joinedstr's format spec {spec!r} of {_name(value)}")


def _locale(value: Any) -> tuple[str, str, tuple[int, ...]] | None:
    """The locale the option `locale` gives, its decimal point, its thousands separator and its grouping; None for
    `"stay"`. Raises `ValueError` for any other value."""
    if type(value) is str and value == "stay":
        return None
    if not isinstance(value, Mapping):
        raise ValueError("the option 'locale' is 'stay' or a mapping of 'decimal_point', 'thousands_sep' and 'grouping', "
                         f"not {value!r}")
    point, separator, grouping = (value.get(key) for key in ("decimal_point", "thousands_sep", "grouping"))
    if type(point) is not str or type(separator) is not str or type(grouping) not in (list, tuple) or not all(
            type(size) is int and 0 <= size <= _CHAR_MAX for size in grouping):
        raise ValueError("the option 'locale' maps 'decimal_point' and 'thousands_sep' to strs, and 'grouping' to a list "
                         f"of ints from 0 to {_CHAR_MAX}")
    return point, separator, tuple(grouping)


def _grouped(digits: str, grouping: tuple[int, ...], separator: str, width: int) -> str:
    """`digits` with `separator` inserted as `grouping` says (each group's size from the right, 0 repeating the last, and
    `_CHAR_MAX` ending the grouping), padded with zeros to `width`, as CPython inserts them
    (`_PyUnicode_InsertThousandsGrouping`)."""
    out: list[str] = []
    remaining, end, at, previous = len(digits), len(digits), 0, 0

    def take(size: int) -> None:
        nonlocal remaining, end
        chars = max(0, min(remaining, size))
        out.append("0" * max(0, size - remaining) + digits[end - chars:end] + (separator if out else ""))
        remaining, end = remaining - chars, end - chars

    while True:
        if at == len(grouping) or grouping[at] == 0:
            size = previous
        elif grouping[at] == _CHAR_MAX:
            size = 0
        else:
            size = previous = grouping[at]
            at += 1
        if size <= 0:
            break
        size = min(size, max(remaining, width, 1))
        take(size)
        width -= size
        if remaining <= 0 and width <= 0:
            return "".join(reversed(out))
        width -= len(separator)
    take(max(remaining, width, 1))
    return "".join(reversed(out))


def _localized(value: Any, f: dict[str, Any], locale: tuple[str, str, tuple[int, ...]]) -> str:
    """`format(value, spec)` of a spec of type `n` (`f`, its fields), as CPython formats one under a locale: an int's
    digits as `d` writes them, a float's and each part of a complex number's as `g` writes them, its integer digits
    grouped and its decimal point the locale's."""
    point, separator, grouping = locale
    flags = ("z" if f["z"] else "") + ("#" if f["alt"] else "") + ("" if f["precision"] is None else "." + f["precision"])

    def localize(written: str, width: int) -> tuple[str, str, str]:
        """A number as Python writes it in the C locale: its sign, its integer digits grouped, and the rest, its
        decimal point the locale's."""
        sign = written[:1] if written[:1] in ("+", "-", " ") else ""
        digits = re.match(r"\d*", written[len(sign):]).group()  # type: ignore[union-attr]
        rest = written[len(sign) + len(digits):]
        rest = point + rest[1:] if rest.startswith(".") else rest
        whole = _grouped(digits, grouping, separator, width - len(sign) - len(rest)) if digits else ""
        return sign, whole, rest

    fill, width, sign = f["fill"] or ("0" if f["zero"] else " "), int(f["width"] or 0), f["sign"] or ""
    if type(value) is complex:  # each part a float's, the imaginary one signed, then `j`; padded as a whole
        parts = [localize(format(part, signed + flags + "g"), 0) for part, signed in ((value.real, sign), (value.imag, "+"))]
        body, align, sign = "".join("".join(part) for part in parts) + "j", f["align"] or ">", ""
    else:
        align = f["align"] or ("=" if f["zero"] else ">")
        written = format(value, sign + flags + "g") if type(value) is float else format(value, sign + "d")
        sign, whole, rest = localize(written, width if fill == "0" and align == "=" else 0)
        body = whole + rest
    padding = fill * max(0, width - len(sign) - len(body))
    if align == "=":
        return sign + padding + body
    if align == "<":
        return sign + body + padding
    if align == "^":
        half = len(padding) // 2
        return padding[:half] + sign + body + padding[half:]
    return padding + sign + body


def _field(part: Any, thunks: Any, raw: bool, template: bool, scope: Any) -> Any:
    """A replacement field's text (an f-string's) or its interpolation (a t-string's): its value, then its format
    spec's own fields."""
    value = next(thunks)()
    spec_part = part.attributes.get("format_spec")
    spec = "" if spec_part is None else "".join(
        _piece(inner, thunks, raw, False, scope) for inner in spec_part.attributes.get("values", ()))
    conversion, debug = part.attributes.get("conversion"), part.attributes.get("debug")
    if debug and conversion is None and spec_part is None:  # `{x=}`: its repr
        conversion = "r"
    if template:
        text = part.attributes.get("text", "")
        return _Interpolation(value, text.rstrip()[:-1].rstrip() if debug else text, conversion, spec)
    shown = part.attributes.get("text", "") if debug else ""
    if conversion is not None:
        value = _converted(value, conversion, scope)
    return shown + _formatted(value, spec, scope)


def _piece(part: Any, thunks: Any, raw: bool, template: bool, scope: Any) -> Any:
    if part.kind == "stringtext":
        return _text(part.attributes.get("spelling", ""), raw)
    return _field(part, thunks, raw, template, scope)


def _joinedstr(arguments: list[F.Thunk], node: Any, scope: Any) -> str:
    """An f-string: its text, and each field formatted, in order."""
    attributes = _attributes(node)
    raw, thunks = "r" in attributes.get("prefix", "").lower(), iter(arguments)
    return "".join(_piece(part, thunks, raw, False, scope) for part in attributes.get("values", ()))


def _templatestr(arguments: list[F.Thunk], node: Any, scope: Any) -> _Template:
    """A t-string: its strings, one more than its interpolations, a field's debug text (`{x=}`) ending the string
    before it."""
    attributes = _attributes(node)
    raw, thunks = "r" in attributes.get("prefix", "").lower(), iter(arguments)
    strings, interpolations = [""], []
    for part in attributes.get("values", ()):
        if part.kind == "stringtext":
            strings[-1] += _text(part.attributes.get("spelling", ""), raw)
            continue
        if part.attributes.get("debug"):
            strings[-1] += part.attributes.get("text", "")
        interpolations.append(_field(part, thunks, raw, True, scope))
        strings.append("")
    return _Template(tuple(strings), tuple(interpolations))


def _concatenatedstring(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    """Adjacent strings, joined; adjacent bytes, joined."""
    values = [argument() for argument in arguments]
    if len({type(value) is bytes for value in values}) > 1:
        raise TypeError("cannot mix bytes and nonbytes literals")
    return values[0][:0].join(values)


# --- Operators ---


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


def _is(a: Any, b: Any, scope: Any) -> bool:
    """`a is b`, as Python defines identity: the singletons `None`, `...`, `True` and `False` are themselves; values of
    different types, or unequal ones, are not each other; any other value is itself alone. Whether two equal immutable
    values (`1` and `1`, `'a'` and `'a'`) are one object Python leaves to the implementation: it stays in the residual,
    but where the scope's option `identity` is `"cpython"` and CPython keeps one object of the value (`_cached`)."""
    if a is None or b is None or a is Ellipsis or b is Ellipsis or type(a) is bool or type(b) is bool:
        return a is b
    if type(a) is not type(b):
        return False
    if type(a) in (int, float, complex, str, bytes, tuple):
        if a == b or (type(a) is float and a != a and b != b):
            if S.option(scope, "identity", "stay") == "cpython" and _cached(a):
                return True
            raise _refuse("compare 'is' of equal immutable values")
        return False
    return a is b


def _cached(value: Any) -> bool:
    """Whether CPython 3.14 keeps one object of an immutable value, however it is made: an int from -5 to 256 (its small
    ints), and the empty tuple, str and bytes."""
    return -5 <= value <= 256 if type(value) is int else type(value) in (tuple, str, bytes) and len(value) == 0


def _power(a: Any, b: Any, scope: Any) -> Any:
    """`a ** b`; a complex power only where its exponent is an integer of at most 100, which CPython computes by
    multiplication; any other complex power, and a real power whose value is complex, stays in the residual, but where
    the scope's option `math` is `"host"`, which computes it by the host's math library."""
    if S.option(scope, "math", "stay") == "host":
        return a ** b
    if type(a) is complex or type(b) is complex:
        exponent = complex(b)
        if not (exponent.imag == 0 and exponent.real == math.floor(exponent.real) and abs(exponent.real) <= 100) and (
                complex(a) != 0 and exponent != 0):
            raise _refuse("binop '**' of a complex power")
    result = a ** b
    if type(result) is complex and type(a) is not complex and type(b) is not complex:
        raise _refuse("binop '**' of a complex power")
    return result


_COMPARE = {"==": operator.eq, "!=": operator.ne, "<": operator.lt, "<=": operator.le, ">": operator.gt,
            ">=": operator.ge, "in": lambda a, b: a in b, "not in": lambda a, b: a not in b}
_IDENTITY = {"is": _is, "is not": lambda a, b, scope: not _is(a, b, scope)}
_BINOP = {"+": operator.add, "-": operator.sub, "*": operator.mul, "/": operator.truediv, "//": operator.floordiv,
          "%": operator.mod, "&": operator.and_, "|": operator.or_, "^": operator.xor, "<<": operator.lshift,
          ">>": operator.rshift, "@": operator.matmul}
_UNARYOP = {"not": operator.not_, "-": operator.neg, "+": operator.pos, "~": operator.invert}


def _compare(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    """A comparison chain, as Python evaluates one: each operand once, left to right, stopping at the first link
    that is false, whose result it gives, else the last link's."""
    operators = [part.attributes["op"] for part in _attributes(node)["comparisons"]]
    for op in operators:
        if op not in _COMPARE and op not in _IDENTITY:
            raise _refuse(f"compare {op!r}")
    left, result = arguments[0](), None
    for op, argument in zip(operators, arguments[1:]):
        right = argument()
        result = _IDENTITY[op](left, right, scope) if op in _IDENTITY else _COMPARE[op](left, right)
        if not result:
            return result
        left = right
    return result


# --- Displays ---


def _dict(arguments: list[F.Thunk], node: Any, scope: Any) -> dict[Any, Any]:
    """A dict display's value: its keys and values evaluated in order, a later equal key's value replacing an
    earlier's, and a `**` item's mapping merged where it stands."""
    keys = _arguments(node)[::2]
    result: dict[Any, Any] = {}
    for i in range(0, len(arguments), 2):
        if keys[i // 2] is None:  # `**mapping`
            mapping = arguments[i + 1]()
            result.update(_mapping(mapping, f"'{_name(mapping)}' object is not a mapping"))
            continue
        key = arguments[i]()
        result[key] = arguments[i + 1]()
    return result


def _slice(arguments: list[F.Thunk], node: Any, scope: Any) -> slice:
    """A slice: its lower and upper bounds and its step, None where it has none."""
    return slice(*(None if part is None else argument() for part, argument in zip(_arguments(node), arguments)))


_P = Expressions

FOLDED = frozenset({_P.LITERAL, _P.CONSTANT, _P.NAME, _P.LET, _P.LIST, _P.TUPLE, _P.SET, _P.DICT, _P.STARRED,
                    _P.PARENTHESIZED, _P.CONCATENATEDSTRING, _P.JOINEDSTR, _P.TEMPLATESTR, _P.ATTRIBUTE,
                    _P.SUBSCRIPT, _P.SLICE, _P.CALL, _P.COMPARE, _P.BOOLOP, _P.BINOP, _P.UNARYOP, _P.IFEXP,
                    _P.NAMEDEXPR, _P.LAMBDA, _P.LISTCOMP, _P.SETCOMP, _P.DICTCOMP, _P.GENERATOREXP, _P.IMPORT,
                    _P.IMPORTFROM})
"""The kinds its rules fold; any other stays in the residual, named."""

CATEGORIES: dict[str, dict[str, str]] = {
    "Python3": {"yield": "d", "yieldfrom": "d", "await": "d", "async comprehension": "d", "attribute target": "d",
                "subscript target": "d", "starred target": "b", "compare 'is' of equal immutable values": "b",
                "joinedstr's malformed \\N character escape": "b", "joinedstr's unknown Unicode character name": "b"},
    "Python Types": {"*": "b"}, "Python Patterns": {"*": "b"}, "Python RegExp": {"*": "b"},
}
"""The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given):
`yield`, `yield from`, `await` and an `async for` need a statement body (d), as does a target that writes into data;
a lone starred target, or two, is invalid syntax (b); whether equal immutable values are one object Python leaves to
the implementation (b); a `\\N{...}` escape Python refuses to compile, malformed or of an unknown name (b). The rest is
(a): a format or a field whose text Python leaves to its platform or its implementation, and a complex power. A value
with no closed constructor expression (an empty set, a frozenset, a slice, a closure, a template, an object, a
generator) is no gap: its rule computes it, its subterm stays, and nothing is named."""


class _Rules(F.Interpreter):
    """The Interpreter, folding Python3's own constants too: `None`, `...` and a complex number."""

    def evaluate(self, node: Any, scope: Any) -> Any:
        tag, record = Terms.kind_of(node)
        if tag == _P.CONSTANT and self.dialect.owner(node) is self.dialect:
            attributes = Terms.attributes_of(record)
            if "complex" in attributes:
                parts = attributes["complex"].attributes
                return complex(parts.get("real", 0.0), parts["imag"])
            if "singleton" not in attributes:
                raise ValueError("a constant needs a singleton or a complex number")
            return None if attributes["singleton"] == "None" else Ellipsis
        return super().evaluate(node, scope)


RULES = _Rules(_P.DIALECT, {
    _P.ATTRIBUTE: lambda arguments, node, scope: attribute(arguments[0](), _attributes(node)["attr"]),
    _P.SUBSCRIPT: lambda arguments, node, scope: arguments[0]()[arguments[1]()],
    _P.SLICE: _slice,
    _P.STARRED: lambda arguments, node, scope: _Unpacked(arguments[0]()),
    _P.PARENTHESIZED: lambda arguments, node, scope: arguments[0](),
    _P.NAMEDEXPR: lambda arguments, node, scope: arguments[0](),  # its target bound within itself only
    _P.CONCATENATEDSTRING: _concatenatedstring,
    _P.JOINEDSTR: _joinedstr,
    _P.TEMPLATESTR: _templatestr,
    _P.LAMBDA: _lambda,
    _P.GENERATOREXP: lambda arguments, node, scope: _genexpr(_elements(node, scope)),
    _P.LISTCOMP: lambda arguments, node, scope: list(_elements(node, scope)),
    _P.SETCOMP: lambda arguments, node, scope: set(_elements(node, scope)),
    _P.DICTCOMP: _dictcomp,
    _P.CALL: _call,
    _P.COMPARE: _compare,
    _P.BOOLOP: {name: _boolop(name) for name in ("and", "or")},
    _P.BINOP: {**{name: _strict(function) for name, function in _BINOP.items()},
               "**": lambda arguments, node, scope: _power(arguments[0](), arguments[1](), scope)},
    _P.UNARYOP: {name: _strict(function) for name, function in _UNARYOP.items()},
    _P.IFEXP: lambda arguments, node, scope: arguments[0]() if arguments[1]() else arguments[2](),
    _P.LIST: lambda arguments, node, scope: _spread(arguments),
    _P.TUPLE: lambda arguments, node, scope: tuple(_spread(arguments)),
    _P.SET: lambda arguments, node, scope: set(_spread(arguments)),
    _P.DICT: _dict,
}, scope=Scope, folded=FOLDED)
"""The folding rules of the Python3 dialect."""

_NATIVE = F.natives(_P.DIALECT)


def _literal(value: Any) -> Any:
    """The literal of a value: a basic scalar's, or a constant's (`None`, `...`, a complex number)."""
    if value is None or value is Ellipsis or type(value) is complex:
        return _P.constant(value)
    return _NATIVE(value)


_RANKS = {type(None): 0, type(Ellipsis): 1, bool: 2, int: 2, float: 2, complex: 3, str: 4, bytes: 5, tuple: 6}
"""The order of the kinds of item a set's display writes: None, `...`, real numbers, complex numbers, strs, bytes and
tuples."""


def _real(a: Any, b: Any) -> int:
    """-1, 0 or 1 ordering two real numbers by value, as Python compares them, a NaN after every other."""
    if a != a or b != b:
        return (a != a) - (b != b)
    return (a > b) - (a < b)


def _compare(a: Any, b: Any) -> int:
    """-1, 0 or 1 ordering two items of a set's display (`_RANKS`): real numbers by value, a NaN last; complex numbers
    by their real parts, then their imaginary ones; strs by code point and bytes by byte, as Python orders them; tuples
    item by item, then by length. Values that compare 0 are written alike."""
    ranks = _RANKS[type(a)], _RANKS[type(b)]
    if ranks[0] != ranks[1]:
        return -1 if ranks[0] < ranks[1] else 1
    if ranks[0] < 2:  # None and `...`, each one value
        return 0
    if type(a) is complex:
        return _real(a.real, b.real) or _real(a.imag, b.imag)
    if type(a) is tuple:
        for x, y in zip(a, b):
            order = _compare(x, y)
            if order:
                return order
        return (len(a) > len(b)) - (len(a) < len(b))
    if ranks[0] == 2:
        return _real(a, b)
    return (a > b) - (a < b)


def _display(value: Any) -> Any:
    """A list's, a tuple's, a dict's or a non-empty set's display, of its items' literals and displays; None where an
    item has neither. A set's items are written in an order both implementations compute (`_compare`), not its hash
    table's: an empty set has no display (`{}` is a dict, and `set()` calls a name), nor has a frozenset."""
    if type(value) in (list, tuple):
        items = [_literal(item) or _display(item) for item in value]
        return None if None in items else (_P.list_ if type(value) is list else _P.tuple_)(*items)
    if type(value) is set and value:  # its items hashable: each written is one of `_RANKS`
        items = [(item, _literal(item) or _display(item)) for item in value]
        if any(written is None for _, written in items):
            return None
        items.sort(key=functools.cmp_to_key(lambda a, b: _compare(a[0], b[0])))
        return _P.set_(*(written for _, written in items))
    if type(value) is dict:
        keys = [_literal(key) or _display(key) for key in value]
        items = [_literal(item) or _display(item) for item in value.values()]
        return None if None in keys or None in items else _P.dict_(*zip(keys, items))
    return None


def _respelled(part: Any, changed: Any) -> list[Any]:
    """An f-string's part, its text as written dropped where its term changed: a debug field's (`{x=}`) its label,
    written before it as text, its conversion `!r` unless it has one or a format spec, as Python formats it."""
    if part.kind == "stringtext":
        return [part]
    mine, attributes = next(changed), dict(part.attributes)
    spec = attributes.get("format_spec")
    if spec is not None:
        inner = tuple(p for q in spec.attributes.get("values", ()) for p in _respelled(q, changed))
        attributes["format_spec"] = Terms.Part(spec.kind, {**spec.attributes, "values": inner}, spec.size)
    if not mine or "text" not in attributes:
        return [Terms.Part(part.kind, attributes, part.size)]
    text = attributes.pop("text")
    if not attributes.pop("debug", None):
        return [Terms.Part(part.kind, attributes, part.size)]
    if "conversion" not in attributes and spec is None:
        attributes["conversion"] = "r"
    label = Terms.Part("stringtext", {"spelling": text.replace("{", "{{").replace("}", "}}")}, 0)
    return [label, Terms.Part(part.kind, attributes, part.size)]


def _simplify(node: Any, results: list[F.Result]) -> F.Result | None:
    """An f-string or a t-string whose terms changed: a field's text as written no longer spells its term, so an
    f-string's is dropped (`_respelled`); a t-string's is its value's (an interpolation's `expression`), so a t-string
    stays as written."""
    tag = Terms.kind_of(node)[0]
    if tag not in (_P.JOINEDSTR, _P.TEMPLATESTR) or not any(result.changed for result in results):
        return None
    if tag == _P.TEMPLATESTR:
        return F.Result(node, free=frozenset(S.free(node, _P.DIALECT)), changed=False,
                        parameters=F.parameters_of(node))
    form, changed = Terms.form(node), iter([result.changed for result in results])
    values = tuple(p for part in form.attributes.get("values", ()) for p in _respelled(part, changed))
    written = _P.DIALECT.make(Terms.Form(tag, {**form.attributes, "values": values},
                                         tuple(result.expression for result in results)))
    return F.Result(written, free=frozenset().union(*(result.free for result in results)),
                    parameters=frozenset().union(*(result.parameters for result in results)))


def _guarded(node: Any, index: int) -> bool:
    """What Python may never evaluate: a conditional's branches, by its test; an `and`'s or an `or`'s operands after the
    first, and a comparison chain's after its first comparison, by those before; a lambda's body, when it is called."""
    tag = Terms.kind_of(node)[0]
    return (tag == _P.IFEXP and index != 1 or tag == _P.BOOLOP and index > 0 or tag == _P.COMPARE and index > 1
            or tag == _P.LAMBDA and index == 1)


class _Simplifier(F.Simplifier):
    """The framework's simplifier, refusing, before it simplifies, a value that an option of the scope does not take
    (`OPTIONS`, and `locale`)."""

    def __call__(self, expression: Any, scope: Any = None) -> F.Simplified:
        scope = self.scope(scope)
        for name, values in OPTIONS.items():
            chosen = S.option(scope, name, values[0])
            if chosen not in values:
                raise ValueError(f"the option {name!r} is {values[0]!r} or {values[1]!r}, not {chosen!r}")
        _locale(S.option(scope, "locale", "stay"))
        return super().__call__(expression, scope)


SIMPLIFIER = _Simplifier(RULES, literal=_literal, simplify=_simplify, categories=CATEGORIES, construct=_display,
                         guarded=_guarded)
"""The simplifier of the Python3 dialect."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> F.Simplified:
    """The simplification of a term (or anything `Terms.term` reads one from) in `scope`, or with the variables in a
    mapping bound."""
    return SIMPLIFIER(expression, scope)
