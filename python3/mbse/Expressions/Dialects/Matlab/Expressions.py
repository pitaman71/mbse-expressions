"""Expressions of the Matlab dialect: MATLAB expressions over scalars and structs, as MATLAB source writes them.

- `constant`: a number (`int` or `float`, both doubles), a logical (`bool`) or a string scalar (`str`).
- `identifier`: the value bound to a variable.
- `binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`==`, `~=`, `<`, ..., `&&`, `||`, `+`,
  `-`, `.*`).
- `unary`: `<operator> operand`, for `~` and `-`.
- `call`: a function applied to ordered arguments, for the functions in `Domains.CALLS` (`isfield`, the bit
  functions, and `all`, `any`, `nnz`, `numel`, `sum`, `min`, `max`, `unique` and `ismember` of arrays).
- `field`: `value.name`, a field of a struct.
- `index`: `value(index)`, an element of an array, from 1.
- `arrayfun`: `arrayfun(@(name) body, array)`, the body's values for each element of the array, bound to `name`.
- `import`: `import pkg.fn` or `import pkg.*`, which make a package's functions callable by their short names within its
  body, the rest of the expression; `Text.ToText` writes it as a line before it. Functions are also found on the path
  and by their qualified names (`pkg.fn(x)`); which exist is up to the scope that evaluates them (see `Evaluators`).

There is no binding: translators substitute a let's value for its name. The meta-schemas are registered as
'Expressions.Matlab.Of<Kind>'. `Text.ToText` writes an expression as MATLAB source, e.g. `this.age >= 18 &&
isfield(this, "email")`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "identifier", "binary", "unary", "call", "field", "index",
           "arrayfun", "import_"]


@dataclass(eq=False)
class _Constant(F.Term):
    KIND = "constant"
    ROLE = F.LITERAL
    VALUE = {"int": int, "float": float, "str": str, "bool": bool}
    value: Native | None = None


@dataclass(eq=False)
class _Identifier(F.Term):
    KIND = "identifier"
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
class _Call(F.Term):
    KIND = "call"
    ROLE = F.APPLICATION
    PROPERTIES = {"function": str}
    VARIADIC = "arguments"
    OPERATOR = "function"
    VOCABULARY = Domains.CALLS
    function: str | None = None
    arguments: tuple[Any, ...] = ()


@dataclass(eq=False)
class _Field(F.Term):
    KIND = "field"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    SLOTS = ("value",)
    OPERATOR = "name"
    SIGNATURE = Domains.FIELD
    name: str | None = None
    value: Any = None


@dataclass(eq=False)
class _Index(F.Term):
    KIND = "index"
    ROLE = F.APPLICATION
    SLOTS = ("value", "index")
    SIGNATURE = Domains.INDEX
    value: Any = None
    index: Any = None


@dataclass(eq=False)
class _Arrayfun(F.Term):
    KIND = "arrayfun"
    ROLE = F.QUANTIFIER
    PROPERTIES = {"name": str}
    SLOTS = ("array", "body")
    SIGNATURE = Domains.ARRAYFUN
    name: str | None = None
    array: Any = None
    body: Any = None  # with `name` bound to each element

    def check(self) -> list[str]:
        return [] if type(self.name) is not str or re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", self.name) else [
            f"an arrayfun's parameter must be an identifier, got {self.name!r}"]


def _qualified(name: str, wildcard: bool = False) -> bool:
    parts = name.split(".")
    if wildcard and len(parts) > 1 and parts[-1] == "*":
        parts = parts[:-1]
    return all(part.isidentifier() for part in parts)


@dataclass(eq=False)
class _Import(F.Term):
    KIND = "import"
    ROLE = F.IMPORT
    PROPERTIES = {"name": str}
    SLOTS = ("body",)
    name: str | None = None
    body: Any = None

    def check(self) -> list[str]:
        if type(self.name) is not str or "." in self.name and _qualified(self.name, wildcard=True):
            return []
        return [f"an import's name must be pkg.name or pkg.*, got {self.name!r}"]


DIALECT = F.Declared("Matlab", (_Constant, _Identifier, _Binary, _Unary, _Call, _Field, _Index, _Arrayfun, _Import),
                     domain_of=Domains.of)
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def constant(value: Native) -> _Constant:
    return _Constant(value)


def identifier(name: str) -> _Identifier:
    return _Identifier(name)


def binary(operator: str, left: Any, right: Any) -> _Binary:
    """`left <operator> right`; each operand is a spec (a native value is a constant)."""
    return _Binary(operator, DIALECT.resolve(left), DIALECT.resolve(right))


def unary(operator: str, operand: Any) -> _Unary:
    return _Unary(operator, DIALECT.resolve(operand))


def call(function: str, *arguments: Any) -> _Call:
    return _Call(function, tuple(DIALECT.resolve(argument) for argument in arguments))


def field(value: Any, name: str) -> _Field:
    """`value.name`."""
    return _Field(name, DIALECT.resolve(value))


def index(value: Any, index: Any) -> _Index:
    """`value(index)`, from 1."""
    return _Index(DIALECT.resolve(value), DIALECT.resolve(index))


def arrayfun(name: str, array: Any, body: Any) -> _Arrayfun:
    """`arrayfun(@(name) body, array)`."""
    return _Arrayfun(name, DIALECT.resolve(array), DIALECT.resolve(body))


def import_(name: str, body: Any) -> _Import:
    """`import name`, then `body`."""
    return _Import(name, DIALECT.resolve(body))
