"""Expressions of the Latex dialect: mathematical notation, as LaTeX's math mode writes it.

- `constant`: a number (`int` or `float`), text (`str`, written `\\text{...}`) or a truth value (`bool`).
- `symbol`: a named quantity, `a`, or `\\mathit{age}` for a longer name.
- `binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`=`, `\\neq`, `<`, `\\leq`, `>`, `\\geq`,
  `\\land`, `\\lor`, `\\implies`, `+`, `-`, `\\cdot`); `unary`: `\\lnot` and `-`.
- `frac`: `\\frac{numerator}{denominator}`.
- `member`: `value.\\mathit{name}`, a member of a value.
- `function`: a named function applied to ordered arguments, `\\operatorname{has}(x, \\text{email})`, for the
  functions in `Domains.FUNCTIONS`.
- `where`: `body \\quad \\text{where } name = value`, which binds a name within its body.

Notation has no evaluator: this dialect is written, rendered, validated, inferred and translated, and evaluation belongs
to the dialects it is translated to. The meta-schemas are registered as 'Expressions.Latex.Of<Kind>'. `Text.ToText`
writes an expression as math-mode LaTeX, parenthesized only where precedence requires.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "symbol", "binary", "unary", "frac", "member", "function",
           "where"]


@dataclass(eq=False)
class _Constant(F.Term):
    KIND = "constant"
    ROLE = F.LITERAL
    VALUE = {"int": int, "float": float, "str": str, "bool": bool}
    value: Native | None = None


@dataclass(eq=False)
class _Symbol(F.Term):
    KIND = "symbol"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


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
class _Frac(F.Term):
    KIND = "frac"
    ROLE = F.APPLICATION
    SLOTS = ("numerator", "denominator")
    SIGNATURE = Domains.FRAC
    numerator: Any = None
    denominator: Any = None


@dataclass(eq=False)
class _Member(F.Term):
    KIND = "member"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    SLOTS = ("value",)
    OPERATOR = "name"
    SIGNATURE = Domains.MEMBER
    name: str | None = None
    value: Any = None


@dataclass(eq=False)
class _Function(F.Term):
    KIND = "function"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    VARIADIC = "arguments"
    OPERATOR = "name"
    VOCABULARY = Domains.FUNCTIONS
    name: str | None = None
    arguments: tuple[Any, ...] = ()


@dataclass(eq=False)
class _Where(F.Term):
    KIND = "where"
    ROLE = F.BINDING
    PROPERTIES = {"name": str}
    SLOTS = ("value", "body")
    name: str | None = None
    value: Any = None
    body: Any = None


DIALECT = F.Declared("Latex", (_Constant, _Symbol, _Binary, _Unary, _Frac, _Member, _Function, _Where),
                     domain_of=Domains.of)
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def constant(value: Native) -> _Constant:
    return _Constant(value)


def symbol(name: str) -> _Symbol:
    return _Symbol(name)


def binary(operator: str, left: Any, right: Any) -> _Binary:
    """`left <operator> right`; each operand is a spec (a native value is a constant)."""
    return _Binary(operator, DIALECT.resolve(left), DIALECT.resolve(right))


def unary(operator: str, operand: Any) -> _Unary:
    return _Unary(operator, DIALECT.resolve(operand))


def frac(numerator: Any, denominator: Any) -> _Frac:
    return _Frac(DIALECT.resolve(numerator), DIALECT.resolve(denominator))


def member(value: Any, name: str) -> _Member:
    """`value.\\mathit{name}`."""
    return _Member(name, DIALECT.resolve(value))


def function(name: str, *arguments: Any) -> _Function:
    return _Function(name, tuple(DIALECT.resolve(argument) for argument in arguments))


def where(name: str, value: Any, body: Any) -> _Where:
    """`body \\quad \\text{where } name = value`."""
    return _Where(name, DIALECT.resolve(value), DIALECT.resolve(body))
