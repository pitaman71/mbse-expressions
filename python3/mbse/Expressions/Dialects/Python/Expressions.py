"""Expressions of the Python dialect: Python expressions, with the imports they need, as Python's `ast` has them.

- `constant`: a native value. `name`: the value bound to a name; the names of `BUILTINS` are always bound.
- `attribute`: `value.attr`. `subscript`: `value[key]`, for a `str` key. `call`: a function, the slot `function`,
  applied to ordered `arguments`, e.g. `np.greater_equal(x, 18)`, whose function is the attribute `greater_equal` of
  the name `np`.
- `compare` (`==`, `!=`, `<`, `<=`, `>`, `>=`), `boolop` (`and`, `or`), `binop` (`+`, `-`, `*`, `/`, `//`, `%`,
  `**`) and `unaryop` (`not`, `-`, `+`), each with one operator and two operands (one for `unaryop`).
- `ifexp`: `body if test else orelse`.
- `let`: `(lambda name: body)(value)`, Python's idiom for binding a name within an expression.
- `import` (`import module` or `import module as alias`) and `importfrom` (`from module import name` or `... as
  alias`) bind a name within their body, which is the rest of the expression; `render` writes them as the lines before
  it. What they may import is up to the scope that evaluates them (see `Evaluators`).

A NumPy expression is a Python expression that imports numpy: NumPy is a vocabulary of calls, not a dialect.

The meta-schemas are registered as 'Expressions.Python.Of<ast class>' ('Expressions.Python.OfBinOp', ...). `render`
writes an expression as Python source, parenthesized only where precedence requires, and `parse` reads one back:
imports, then one expression.
"""

from __future__ import annotations

import ast
import math
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Dialects.Basic.Expressions import discriminator
from mbse.Expressions.Framework import Domains as FD, Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "BUILTINS", "Builders", "Schema", "constant", "name", "attribute", "subscript", "call", "compare", "boolop",
           "binop", "unaryop", "ifexp", "let_", "import_", "importfrom", "render", "parse"]


BUILTINS = frozenset({"abs", "bool", "float", "getattr", "hasattr", "int", "len", "max", "min", "round", "str"})
"""The builtins an expression may use without importing them: the default builtins of a scope (see `Evaluators`)."""


def _dotted(name: str) -> bool:
    return all(part.isidentifier() for part in name.split("."))


def _identifier_problems(what: str, value: Any) -> list[str]:
    if type(value) is str and value and not value.isidentifier():
        return [f"{what} must be an identifier, got {value!r}"]
    return []


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
    AMBIENT = BUILTINS
    name: str | None = None

    def check(self) -> list[str]:
        return _identifier_problems("a name", self.name)


@dataclass(eq=False)
class _Attribute(F.Node):
    KIND = "attribute"
    ROLE = F.APPLICATION
    PROPERTIES = {"attr": str}
    SLOTS = ("value",)
    OPERATOR = "attr"
    SIGNATURE = FD.Function((FD.Anything,), FD.Anything)
    attr: str | None = None
    value: Any = None

    def check(self) -> list[str]:
        return _identifier_problems("an attribute", self.attr)


@dataclass(eq=False)
class _Subscript(F.Node):
    KIND = "subscript"
    ROLE = F.APPLICATION
    PROPERTIES = {"key": str}
    SLOTS = ("value",)
    OPERATOR = "key"
    SIGNATURE = FD.Function((FD.Anything,), FD.Anything)
    key: str | None = None
    value: Any = None


@dataclass(eq=False)
class _Call(F.Node):
    KIND = "call"
    ROLE = F.APPLICATION
    SLOTS = ("function",)
    VARIADIC = "arguments"
    SIGNATURE = FD.Opaque()
    function: Any = None
    arguments: tuple[Any, ...] = ()


def _operator_kind(tag: str, vocabulary: dict[str, FD.Signature], slots: tuple[str, ...]) -> type[F.Node]:
    """A kind with one operator from `vocabulary` and fixed operands."""
    fields = {"operator": str | None, **{slot: Any for slot in slots}}
    namespace = {"KIND": tag, "ROLE": F.APPLICATION, "PROPERTIES": {"operator": str}, "SLOTS": slots,
                 "OPERATOR": "operator", "VOCABULARY": vocabulary, "__annotations__": fields,
                 **{name: None for name in fields}}
    return dataclass(eq=False)(type(f"_{tag.capitalize()}", (F.Node,), namespace))


_Compare = _operator_kind("compare", Domains.COMPARE, ("left", "right"))
_BoolOp = _operator_kind("boolop", Domains.BOOLOP, ("left", "right"))
_BinOp = _operator_kind("binop", Domains.BINOP, ("left", "right"))
_UnaryOp = _operator_kind("unaryop", Domains.UNARYOP, ("operand",))


@dataclass(eq=False)
class _IfExp(F.Node):
    KIND = "ifexp"
    ROLE = F.APPLICATION
    SLOTS = ("test", "body", "orelse")
    SIGNATURE = FD.Function((FD.Anything, FD.Anything, FD.Anything), FD.Anything)
    test: Any = None
    body: Any = None
    orelse: Any = None


@dataclass(eq=False)
class _Let(F.Node):
    KIND = "let"
    ROLE = F.BINDING
    PROPERTIES = {"name": str}
    SLOTS = ("value", "body")
    name: str | None = None
    value: Any = None
    body: Any = None

    def check(self) -> list[str]:
        return _identifier_problems("a let's name", self.name)


@dataclass(eq=False)
class _Import(F.Node):
    KIND = "import"
    ROLE = F.IMPORT
    PROPERTIES = {"module": str, "alias": str}
    OPTIONAL = frozenset({"alias"})
    SLOTS = ("body",)
    module: str | None = None
    alias: str | None = None
    body: Any = None

    def binds(self) -> tuple[str, ...]:
        return (self.alias or self.module.split(".")[0],)  # type: ignore[union-attr]

    def check(self) -> list[str]:
        problems = [] if type(self.module) is not str or _dotted(self.module) else [
            f"an import's module must be a dotted name, got {self.module!r}"]
        return problems + _identifier_problems("an import's alias", self.alias)


@dataclass(eq=False)
class _ImportFrom(F.Node):
    KIND = "importfrom"
    ROLE = F.IMPORT
    PROPERTIES = {"module": str, "name": str, "alias": str}
    OPTIONAL = frozenset({"alias"})
    SLOTS = ("body",)
    module: str | None = None
    name: str | None = None
    alias: str | None = None
    body: Any = None

    def binds(self) -> tuple[str, ...]:
        return (self.alias or self.name,)  # type: ignore[return-value]

    def check(self) -> list[str]:
        problems = [] if type(self.module) is not str or _dotted(self.module) else [
            f"an importfrom's module must be a dotted name, got {self.module!r}"]
        return problems + _identifier_problems("an importfrom's name", self.name) + _identifier_problems(
            "an importfrom's alias", self.alias)


_KINDS = (_Constant, _Name, _Attribute, _Subscript, _Call, _Compare, _BoolOp, _BinOp, _UnaryOp, _IfExp, _Let,
          _Import, _ImportFrom)
_AST_NAMES = {"boolop": "BoolOp", "binop": "BinOp", "unaryop": "UnaryOp", "ifexp": "IfExp",
              "importfrom": "ImportFrom"}
DIALECT = F.Declared(
    "Python", _KINDS, discriminator=discriminator, domain_of=Domains.of,
    schema_names={k.KIND: f"Expressions.Python.Of{_AST_NAMES.get(k.KIND, k.KIND.capitalize())}" for k in _KINDS})
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def _spec(spec: Any) -> Any:
    return DIALECT.resolve(spec)


def constant(value: Native) -> _Constant:
    return _Constant(value)


def name(name: str) -> _Name:
    return _Name(name)


def attribute(value: Any, attr: str) -> _Attribute:
    """`value.attr`; each argument of these constructors is a spec (a native value is a constant)."""
    return _Attribute(attr, _spec(value))


def subscript(value: Any, key: str) -> _Subscript:
    """`value[key]`."""
    return _Subscript(key, _spec(value))


def call(function: Any, *arguments: Any) -> _Call:
    """`function(*arguments)`. A dotted name as the function is a chain of attributes: `call('np.add', 1, 2)` is
    `np.add(1, 2)`."""
    if type(function) is str:
        first, *rest = function.split(".")
        function = _Name(first)
        for attr in rest:
            function = _Attribute(attr, function)
    return _Call(_spec(function), tuple(_spec(argument) for argument in arguments))


def compare(operator: str, left: Any, right: Any) -> Any:
    return _Compare(operator, _spec(left), _spec(right))


def boolop(operator: str, left: Any, right: Any) -> Any:
    return _BoolOp(operator, _spec(left), _spec(right))


def binop(operator: str, left: Any, right: Any) -> Any:
    return _BinOp(operator, _spec(left), _spec(right))


def unaryop(operator: str, operand: Any) -> Any:
    return _UnaryOp(operator, _spec(operand))


def ifexp(test: Any, body: Any, orelse: Any) -> _IfExp:
    """`body if test else orelse`."""
    return _IfExp(_spec(test), _spec(body), _spec(orelse))


def let_(name: str, value: Any, body: Any) -> _Let:
    """`(lambda name: body)(value)`."""
    return _Let(name, _spec(value), _spec(body))


def import_(module: str, body: Any, alias: str | None = None) -> _Import:
    """`import module [as alias]`, then `body`."""
    return _Import(module, alias, _spec(body))


def importfrom(module: str, name: str, body: Any, alias: str | None = None) -> _ImportFrom:
    """`from module import name [as alias]`, then `body`."""
    return _ImportFrom(module, name, alias, _spec(body))


# --- Rendering ---

_LAMBDA, _IF, _OR, _AND, _NOT, _COMPARE, _SUM, _PRODUCT, _UNARY, _POWER, _PRIMARY = range(11)
_BINOP_LEVELS = {"+": _SUM, "-": _SUM, "*": _PRODUCT, "/": _PRODUCT, "//": _PRODUCT, "%": _PRODUCT, "**": _POWER}


def _constant(value: Native) -> tuple[str, int]:
    if type(value) is float and not math.isfinite(value):
        text = "float('nan')" if math.isnan(value) else "float('inf')" if value > 0 else "-float('inf')"
    else:
        text = repr(value)
    return text, _UNARY if text.startswith("-") else _PRIMARY


def _import_line(node: Any) -> str:
    alias = f" as {node.alias}" if node.alias else ""
    if isinstance(node, _Import):
        return f"import {node.module}{alias}"
    return f"from {node.module} import {node.name}{alias}"


def render(expression: Any) -> str:
    """The expression as Python source: one line per import around it, then the expression."""
    lines = []
    while isinstance(expression, (_Import, _ImportFrom)):
        lines.append(_import_line(expression))
        expression = expression.body

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        if isinstance(node, _Constant):
            return _constant(node.value)
        if isinstance(node, _Name):
            return node.name, _PRIMARY
        if isinstance(node, _Attribute):
            return f"{operand(0, _PRIMARY)}.{node.attr}", _PRIMARY
        if isinstance(node, _Subscript):
            return f"{operand(0, _PRIMARY)}[{node.key!r}]", _PRIMARY
        if isinstance(node, _Call):
            return f"{operand(0, _PRIMARY)}({', '.join(text for text, _ in arguments[1:])})", _PRIMARY
        if isinstance(node, _Let):
            return f"(lambda {node.name}: {arguments[1][0]})({arguments[0][0]})", _PRIMARY
        if isinstance(node, _IfExp):
            return f"{operand(1, _OR)} if {operand(0, _OR)} else {operand(2, _IF)}", _IF
        if isinstance(node, (_Import, _ImportFrom)):
            raise ValueError("an import can only enclose the whole expression")
        if isinstance(node, _UnaryOp):
            if node.operator == "not":
                return f"not {operand(0, _NOT)}", _NOT
            return f"{node.operator}{operand(0, _UNARY)}", _UNARY
        if isinstance(node, _Compare):
            return f"{operand(0, _COMPARE + 1)} {node.operator} {operand(1, _COMPARE + 1)}", _COMPARE
        if isinstance(node, _BoolOp):
            level = _AND if node.operator == "and" else _OR
            return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level
        level = _BINOP_LEVELS[node.operator]
        if node.operator == "**":  # right-associative, binding tighter than unary operators on its left
            return f"{operand(0, _PRIMARY)} ** {operand(1, _UNARY)}", _POWER
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return "\n".join([*lines, F.fold(expression, write)[0]])


# --- Parsing ---

_AST_OPERATORS: dict[type, str] = {
    ast.Eq: "==", ast.NotEq: "!=", ast.Lt: "<", ast.LtE: "<=", ast.Gt: ">", ast.GtE: ">=", ast.And: "and",
    ast.Or: "or", ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/", ast.FloorDiv: "//", ast.Mod: "%",
    ast.Pow: "**", ast.Not: "not", ast.USub: "-", ast.UAdd: "+",
}


def _unsupported(node: ast.AST, reason: str = "not supported in an expression") -> ValueError:
    return ValueError(f"cannot parse {ast.unparse(node)!r}: {reason}")


def _operator(node: ast.AST, op: ast.AST) -> str:
    if type(op) not in _AST_OPERATORS:
        raise _unsupported(node)
    return _AST_OPERATORS[type(op)]


def _expression(node: ast.expr) -> Any:
    if isinstance(node, ast.Constant):
        if F._native_name(node.value) is None:
            raise _unsupported(node, "only native constants are supported")
        return _Constant(node.value)
    if isinstance(node, ast.Name):
        return _Name(node.id)
    if isinstance(node, ast.Attribute):
        return _Attribute(node.attr, _expression(node.value))
    if isinstance(node, ast.Subscript):
        if not (isinstance(node.slice, ast.Constant) and type(node.slice.value) is str):
            raise _unsupported(node, "a subscript's key must be a str")
        return _Subscript(node.slice.value, _expression(node.value))
    if isinstance(node, ast.Call):
        if node.keywords:
            raise _unsupported(node, "keyword arguments are not supported")
        if isinstance(node.func, ast.Lambda):
            parameters = node.func.args
            if len(parameters.args) != 1 or len(node.args) != 1 or parameters.vararg or parameters.kwarg or \
                    parameters.kwonlyargs or parameters.posonlyargs or parameters.defaults:
                raise _unsupported(node, "a let binds one name")
            return _Let(parameters.args[0].arg, _expression(node.args[0]), _expression(node.func.body))
        return _Call(_expression(node.func), tuple(_expression(argument) for argument in node.args))
    if isinstance(node, ast.Compare):
        if len(node.ops) != 1:
            raise _unsupported(node, "a comparison has one operator")
        return _Compare(_operator(node, node.ops[0]), _expression(node.left), _expression(node.comparators[0]))
    if isinstance(node, ast.BoolOp):
        result = _expression(node.values[0])
        for value in node.values[1:]:
            result = _BoolOp(_operator(node, node.op), result, _expression(value))
        return result
    if isinstance(node, ast.BinOp):
        return _BinOp(_operator(node, node.op), _expression(node.left), _expression(node.right))
    if isinstance(node, ast.UnaryOp):
        return _UnaryOp(_operator(node, node.op), _expression(node.operand))
    if isinstance(node, ast.IfExp):
        return _IfExp(_expression(node.test), _expression(node.body), _expression(node.orelse))
    raise _unsupported(node)


def parse(source: str) -> Any:
    """The expression that Python `source` writes: `import` and `from ... import` statements, then one expression."""
    statements = ast.parse(source).body
    if not statements or not isinstance(statements[-1], ast.Expr):
        raise ValueError("the source must end with an expression")
    result = _expression(statements[-1].value)
    for statement in reversed(statements[:-1]):
        if isinstance(statement, ast.Import):
            for alias in reversed(statement.names):
                result = _Import(alias.name, alias.asname, result)
        elif isinstance(statement, ast.ImportFrom) and statement.level == 0 and statement.module:
            for alias in reversed(statement.names):
                if alias.name == "*":
                    raise _unsupported(statement, "import * binds names that cannot be known")
                result = _ImportFrom(statement.module, alias.name, alias.asname, result)
        else:
            raise _unsupported(statement, "only imports may precede the expression")
    return result
