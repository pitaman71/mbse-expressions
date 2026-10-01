"""Expressions of the Ccpp dialect: expressions of C and C++ (a superset of both), over their arithmetic types, as their
source writes them.

- `constant`: a number, a bool or a string literal, and optionally its type (`Domains.TYPES`), written with a suffix
  (`5u`, `5ull`, `1.5f`, `1.5L`) or, for a type without one, a cast (`(uint8_t)5`). Without a type an int is the first
  of `int`, `long` and `unsigned long` that holds it, and a float a `double`.
- `identifier`: the value bound to a variable.
- `unary` (`+`, `-`, `!`, `~`) and `binary` (`*`, `/`, `%`, `+`, `-`, `<<`, `>>`, `<`, `<=`, `>`, `>=`, `==`, `!=`, `&`,
  `^`, `|`, `&&`, `||`).
- `conditional`: `condition ? consequent : alternative`.
- `cast`: `(type) operand`, to one of `Domains.TYPES`.
- `member`: `object.name`, or `object->name` with the operator `->`.
- `subscript`: `array[index]`.
- `call`: a function the scope provides, applied to ordered arguments.

There is no binding: translators substitute a let's value for its name. The meta-schemas are registered as
'Expressions.Ccpp.Of<Kind>'. `render` writes an expression as C source, with C's precedence, e.g. `x.width >= 8u &&
(uint8_t)(a + b) == 0`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "identifier", "unary", "binary", "conditional", "cast", "member",
           "subscript", "call", "render", "SUFFIXES"]

SUFFIXES = {"unsigned int": "u", "long": "l", "unsigned long": "ul", "long long": "ll", "unsigned long long": "ull",
            "float": "f", "long double": "L"}
"""The suffixes of typed constants: `5u`, `5ull`, `1.5f`, ...; other types are written with a cast."""


def _type_problems(what: str, name: Any) -> list[str]:
    return [] if name in Domains.TYPES else [f"{what} type must be one of C's arithmetic types, got {name!r}"]


@dataclass(eq=False)
class _Constant(F.Node):
    KIND = "constant"
    ROLE = F.LITERAL
    VALUE = {"int": int, "float": float, "str": str, "bool": bool}
    PROPERTIES = {"type": str}
    OPTIONAL = frozenset({"type"})
    value: Native | None = None
    type: str | None = None  # the constant's type, by default its value's

    def typed(self) -> Any:
        return Domains.TYPES.get(self.type) if self.type is not None else None

    def check(self) -> list[str]:
        """A constant's type, when it has one, is an arithmetic type that holds its value."""
        if self.type is None:
            return []
        problems = _type_problems("a constant's", self.type)
        if not problems and not Domains.TYPES[self.type].contains(self.value):
            problems.append(f"a constant of {self.type} cannot hold {self.value!r}")
        return problems


@dataclass(eq=False)
class _Identifier(F.Node):
    KIND = "identifier"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _Unary(F.Node):
    KIND = "unary"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("operand",)
    OPERATOR = "operator"
    VOCABULARY = Domains.UNARY
    operator: str | None = None
    operand: Any = None


@dataclass(eq=False)
class _Binary(F.Node):
    KIND = "binary"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("left", "right")
    OPERATOR = "operator"
    VOCABULARY = Domains.BINARY
    operator: str | None = None
    left: Any = None
    right: Any = None


@dataclass(eq=False)
class _Conditional(F.Node):
    KIND = "conditional"
    ROLE = F.APPLICATION
    SLOTS = ("condition", "consequent", "alternative")
    SIGNATURE = Domains.CONDITIONAL
    condition: Any = None
    consequent: Any = None
    alternative: Any = None


@dataclass(eq=False)
class _Cast(F.Node):
    KIND = "cast"
    ROLE = F.APPLICATION
    PROPERTIES = {"type": str}
    SLOTS = ("operand",)
    SIGNATURE = Domains.CAST
    type: str | None = None
    operand: Any = None

    def typed(self) -> Any:
        return Domains.TYPES.get(self.type)

    def check(self) -> list[str]:
        return [] if self.type is None else _type_problems("a cast's", self.type)


@dataclass(eq=False)
class _Member(F.Node):
    KIND = "member"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str, "operator": str}
    OPTIONAL = frozenset({"operator"})
    SLOTS = ("object",)
    SIGNATURE = Domains.MEMBER
    name: str | None = None
    operator: str | None = None  # '.' (by default) or '->'
    object: Any = None

    def check(self) -> list[str]:
        return [] if self.operator in (None, ".", "->") else [f"a member's operator must be '.' or '->', got {self.operator!r}"]


@dataclass(eq=False)
class _Subscript(F.Node):
    KIND = "subscript"
    ROLE = F.APPLICATION
    SLOTS = ("array", "index")
    SIGNATURE = Domains.SUBSCRIPT
    array: Any = None
    index: Any = None


@dataclass(eq=False)
class _Call(F.Node):
    KIND = "call"
    ROLE = F.APPLICATION
    PROPERTIES = {"function": str}
    VARIADIC = "arguments"
    OPERATOR = "function"
    SIGNATURE = Domains.CALL
    function: str | None = None
    arguments: tuple[Any, ...] = ()


DIALECT = F.Declared("Ccpp", (_Constant, _Identifier, _Unary, _Binary, _Conditional, _Cast, _Member, _Subscript, _Call),
                     domain_of=Domains.of)
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def constant(value: Native, type: str | None = None) -> _Constant:
    return _Constant(value, type)


def identifier(name: str) -> _Identifier:
    return _Identifier(name)


def unary(operator: str, operand: Any) -> _Unary:
    """`<operator> operand`; the operand is a spec (a native value is a constant)."""
    return _Unary(operator, DIALECT.resolve(operand))


def binary(operator: str, left: Any, right: Any) -> _Binary:
    """`left <operator> right`; each operand is a spec."""
    return _Binary(operator, DIALECT.resolve(left), DIALECT.resolve(right))


def conditional(condition: Any, consequent: Any, alternative: Any) -> _Conditional:
    """`condition ? consequent : alternative`."""
    return _Conditional(DIALECT.resolve(condition), DIALECT.resolve(consequent), DIALECT.resolve(alternative))


def cast(type: str, operand: Any) -> _Cast:
    """`(type) operand`."""
    return _Cast(type, DIALECT.resolve(operand))


def member(object: Any, name: str, operator: str | None = None) -> _Member:
    """`object.name`, or `object->name` with the operator '->'."""
    return _Member(name, operator, DIALECT.resolve(object))


def subscript(array: Any, index: Any) -> _Subscript:
    """`array[index]`."""
    return _Subscript(DIALECT.resolve(array), DIALECT.resolve(index))


def call(function: str, *arguments: Any) -> _Call:
    return _Call(function, tuple(DIALECT.resolve(argument) for argument in arguments))


# C's precedence, from loosest to tightest.
_CONDITIONAL, _OR, _AND, _BITOR, _BITXOR, _BITAND, _EQUALITY, _RELATIONAL, _SHIFT, _ADDITIVE, _MULTIPLICATIVE, _UNARY, \
    _POSTFIX = range(1, 14)
_LEVELS = {"||": _OR, "&&": _AND, "|": _BITOR, "^": _BITXOR, "&": _BITAND, "==": _EQUALITY, "!=": _EQUALITY,
           "<": _RELATIONAL, "<=": _RELATIONAL, ">": _RELATIONAL, ">=": _RELATIONAL, "<<": _SHIFT, ">>": _SHIFT,
           "+": _ADDITIVE, "-": _ADDITIVE, "*": _MULTIPLICATIVE, "/": _MULTIPLICATIVE, "%": _MULTIPLICATIVE}


def _text(value: str) -> str:
    """A C string literal."""
    escapes = {"\\": "\\\\", '"': '\\"', "\n": "\\n", "\t": "\\t", "\r": "\\r"}
    return '"' + "".join(escapes.get(c, c) for c in value) + '"'


_MACROS = {"NaN": "NAN", "Infinity": "INFINITY", "-Infinity": "-INFINITY"}


def _number(value: Any) -> str:
    """A number as C writes it: an int's digits; a float's shortest text, with a point or an exponent; a long double's
    text likewise; `INFINITY` and `NAN` for the values that have no literal."""
    if type(value) is int:
        return str(value)
    if type(value) is float:
        if not math.isfinite(value):
            return "NAN" if math.isnan(value) else "INFINITY" if value > 0 else "-INFINITY"
        value = repr(value)
    if value in _MACROS:
        return _MACROS[value]
    return value if any(c in value for c in ".eE") else value + ".0"


def _constant(node: _Constant) -> tuple[str, int]:
    """A constant: a bool, a string literal, or a number with its type's suffix or, for a type with none, a cast."""
    value, ctype = node.value, node.type
    if type(value) is bool:
        return ("true" if value else "false"), _POSTFIX
    if type(value) is str and ctype is None:
        return _text(value), _POSTFIX
    text = _number(value)
    level = _UNARY if text.startswith("-") else _POSTFIX
    if ctype in (None, "int", "double") or not text[-1].isdigit():  # a default type, or a macro
        return text, level
    if ctype not in SUFFIXES:
        return f"({ctype}){text}", _UNARY
    return text + SUFFIXES[ctype], level


def render(expression: Any) -> str:
    """The expression as C source, parenthesized only where precedence requires."""

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        if isinstance(node, _Constant):
            return _constant(node)
        if isinstance(node, _Identifier):
            return node.name, _POSTFIX
        if isinstance(node, _Member):
            return f"{operand(0, _POSTFIX)}{node.operator or '.'}{node.name}", _POSTFIX
        if isinstance(node, _Subscript):
            return f"{operand(0, _POSTFIX)}[{arguments[1][0]}]", _POSTFIX
        if isinstance(node, _Call):
            return f"{node.function}({', '.join(text for text, _ in arguments)})", _POSTFIX
        if isinstance(node, _Unary):  # `- -x`, not the decrement `--x`
            text = operand(0, _UNARY)
            return f"{node.operator}{' ' if text[0] == node.operator in '+-' else ''}{text}", _UNARY
        if isinstance(node, _Cast):
            return f"({node.type}){operand(0, _UNARY)}", _UNARY
        if isinstance(node, _Conditional):  # right-associative
            return f"{operand(0, _OR)} ? {arguments[1][0]} : {operand(2, _CONDITIONAL)}", _CONDITIONAL
        level = _LEVELS[node.operator]
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return F.fold(expression, write)[0]
