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
'Expressions.Ccpp.Of<Kind>'. `Text.ToText` writes an expression as C source, with C's precedence, e.g. `x.width >= 8u &&
(uint8_t)(a + b) == 0`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "identifier", "unary", "binary", "conditional", "cast", "member",
           "subscript", "call", "SUFFIXES"]

SUFFIXES = {"unsigned int": "u", "long": "l", "unsigned long": "ul", "long long": "ll", "unsigned long long": "ull",
            "float": "f", "long double": "L"}
"""The suffixes of typed constants: `5u`, `5ull`, `1.5f`, ...; other types are written with a cast."""


def _type_problems(what: str, name: Any) -> list[str]:
    return [] if name in Domains.TYPES else [f"{what} type must be one of C's arithmetic types, got {name!r}"]


@dataclass(eq=False)
class _Constant(F.Term):
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
class _Identifier(F.Term):
    KIND = "identifier"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _Unary(F.Term):
    KIND = "unary"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("operand",)
    OPERATOR = "operator"
    VOCABULARY = Domains.UNARY
    operator: str | None = None
    operand: Any = None


@dataclass(eq=False)
class _Binary(F.Term):
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
class _Conditional(F.Term):
    KIND = "conditional"
    ROLE = F.APPLICATION
    SLOTS = ("condition", "consequent", "alternative")
    SIGNATURE = Domains.CONDITIONAL
    condition: Any = None
    consequent: Any = None
    alternative: Any = None


@dataclass(eq=False)
class _Cast(F.Term):
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
class _Member(F.Term):
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
class _Subscript(F.Term):
    KIND = "subscript"
    ROLE = F.APPLICATION
    SLOTS = ("array", "index")
    SIGNATURE = Domains.SUBSCRIPT
    array: Any = None
    index: Any = None


@dataclass(eq=False)
class _Call(F.Term):
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
