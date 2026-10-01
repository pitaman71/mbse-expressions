"""Expressions of the Basic dialect: the core vocabulary, for rules and constraints.
`Evaluators` evaluates them.

- `OfLiteral`: a native value, and its value domain when that is not the native's default (see `Domains`).
- `OfOperation`: a named operation applied to ordered arguments, e.g. `eq(a, b)`. The vocabulary of names is open; the
  core operations (`CORE`) are the ones every binding evaluates. See docs/EXPRESSIONS.md.
- `OfVariable`: the value bound to a name.
- `OfLet`: binds a name to the value of one expression within another, its body.
- `OfAny`: any of these.

The dialect (`DIALECT`) is declared with the framework (`mbse.Expressions.Framework.Terms`), which gives each
kind its `Data`, a `Builder` finalized by `create()`, `clone()` or `update()` (none validate), a `Spec` (a value, or a
callable that takes and returns the builder) and `resolve`, and a `Schema`, the meta-schema that describes its data as
an ordinary object schema, so expressions serialize, validate and compare like any other objects:

- Every kind's schema declares `kind`, a tag with a fixed value: 'literal', 'operation', 'variable' or 'let'.
- `OfLiteral.Schema` declares one optional property per native type (`int`, `float`, `str`, `bool`, `bytes`); a literal
  sets exactly one. Its `domain`, a value of `Domains.Schema`, is written only when it is not the native's default: by
  name when the domain is registered, otherwise by value.
- `OfOperation.Schema`, `OfVariable.Schema` and `OfLet.Schema` declare `name`.
- Operations and lets declare the adjacency `arguments` to `Arguments`, a relation linking a `parent` to an `argument`
  with an `index`; `unique(argument)` makes the parent and index determine the argument. A let's value is its argument
  0 and its body its argument 1.
- Every kind declares `used_by`: the same relation seen from the argument. The parents' arguments imply it, so data
  never writes it and builders ignore entries added to it.
- `OfAny.Schema` is the union of the four, discriminated by the tag: `eq(get(this, 'kind'), 'literal')`, and so on.

The meta-schemas are registered with `Proxies` as 'Expressions.OfLiteral', 'Expressions.OfOperation',
'Expressions.OfVariable', 'Expressions.OfLet' and 'Expressions.Arguments', the names snapshots carry. `Builders`
rebuilds `Data` from snapshots, e.g. `JSON.FromJSON(Expressions.Builders).Reachable(Expressions.OfLet.Schema, text)`.
`Data` is `Visitable`; builders implement `Visitors.OfObject`.

`Term`s write expressions with methods: `variable('this').age.ge(18)` is `ge(get(this, 'age'), 18)`. `from_` reads one
from a Python function's source instead: `from_(lambda this: this.age >= 18)` is the same expression.
"""

from __future__ import annotations

import ast
import inspect
import linecache
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework import Schemas
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = [
    "OfAny", "OfLiteral", "OfOperation", "OfVariable", "OfLet", "Arguments", "Builders", "Term", "CORE", "DIALECT",
    "variable", "literal", "let_", "operation", "from_",
    "LITERAL", "OPERATION", "VARIABLE", "LET", "ARGUMENTS",
]

LITERAL = "Expressions.OfLiteral"
OPERATION = "Expressions.OfOperation"
VARIABLE = "Expressions.OfVariable"
LET = "Expressions.OfLet"
ARGUMENTS = F.ARGUMENTS
Arguments = F.Arguments

CORE: dict[str, int] = {name: signature.arity() for name, signature in Domains.SIGNATURES.items()}
"""The core operations and their numbers of arguments."""

_native_name = F._native_name
_type_name = F._type_name


# --- Data ---


@dataclass(eq=False)
class _LiteralData(F.Node):
    KIND = "literal"
    ROLE = F.LITERAL
    VALUE = F.NATIVES
    VALUES = {"domain": F.ValueProperty(Domains.Schema, Domains.to_plain, Domains.from_plain)}
    value: Native | None = None
    domain: Any = None  # a value domain, or None for the value's native's default

    def __post_init__(self) -> None:
        if self.domain is not None and _native_name(self.value) is not None and self.domain == Domains.of(self.value):
            self.domain = None  # a native's default domain is no domain at all

    def typed(self) -> Any:
        return self.domain

    def check(self) -> list[str]:
        """A literal's domain is valid and holds its value."""
        if self.domain is None:
            return []
        if not isinstance(self.domain, Domains.Domain):
            return [f"a literal's domain must be a value domain, got {_type_name(self.domain)}"]
        problems = [f"domain: {problem}" for problem in self.domain.validate()]
        if not problems and not self.domain.contains(self.value):
            problems.append(f"a literal of {self.domain.name()} cannot hold {self.value!r}")
        return problems


@dataclass(eq=False)
class _OperationData(F.Node):
    KIND = "operation"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    VARIADIC = "arguments"
    OPERATOR = "name"
    VOCABULARY = Domains.SIGNATURES
    name: str | None = None
    arguments: tuple[Any, ...] = ()  # OfAny.Data


@dataclass(eq=False)
class _VariableData(F.Node):
    KIND = "variable"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _LetData(F.Node):
    KIND = "let"
    ROLE = F.BINDING
    PROPERTIES = {"name": str}
    SLOTS = ("value", "body")
    name: str | None = None
    value: Any = None  # OfAny.Data
    body: Any = None  # OfAny.Data


_KINDS = (_LiteralData, _OperationData, _VariableData, _LetData)


# --- Builders: Visitors that build Data ---


class _LiteralBuilder(F.Builder):
    """Builds an `OfLiteral.Data`. DSL: `.value(native)` and `.domain(domain)`. As a `Visitors.OfObject`, it has one
    property per native type, and setting one replaces the value, and the property `domain`."""

    _data = _LiteralData

    def value(self, value: Native) -> _LiteralBuilder:
        return self.set("value", value)

    def domain(self, domain: Any) -> _LiteralBuilder:
        return self.set("domain", domain)


class _NamedBuilder(F.Builder):
    """A builder whose kind has a `name`. DSL: `.name(str)`."""

    def name(self, name: str) -> Any:
        return self.set("name", name)


class _OperationBuilder(_NamedBuilder):
    """Builds an `OfOperation.Data`. DSL: `.name(str)` and `.arguments(*specs)`, which appends `OfAny.Spec`s (a native
    value is a literal). As a `Visitors.OfObject`, arguments are `arguments` entries, ordered by `index`."""

    _data = _OperationData


class _VariableBuilder(_NamedBuilder):
    """Builds an `OfVariable.Data`. DSL: `.name(str)`."""

    _data = _VariableData


class _LetBuilder(_NamedBuilder):
    """Builds an `OfLet.Data`. DSL: `.name(str)`, `.value(spec)` and `.body(spec)`, each an `OfAny.Spec`. As a
    `Visitors.OfObject`, the value is the `arguments` entry with index 0 and the body the one with index 1."""

    _data = _LetData

    def value(self, spec: OfAny.Spec) -> _LetBuilder:
        return self.argument("value", spec)

    def body(self, spec: OfAny.Spec) -> _LetBuilder:
        return self.argument("body", spec)


class _AnyBuilder(F.AnyBuilder):
    """Selects a kind through `as_<kind>(spec)`. Finalizing yields that kind's data."""

    def as_literal(self, spec: OfLiteral.Spec) -> _AnyBuilder:
        self._selected = OfLiteral.resolve(spec)
        return self

    def as_operation(self, spec: OfOperation.Spec) -> _AnyBuilder:
        self._selected = OfOperation.resolve(spec)
        return self

    def as_variable(self, spec: OfVariable.Spec) -> _AnyBuilder:
        self._selected = OfVariable.resolve(spec)
        return self

    def as_let(self, spec: OfLet.Spec) -> _AnyBuilder:
        self._selected = OfLet.resolve(spec)
        return self


# --- The dialect and its meta-schemas ---

DIALECT = F.Declared(
    "Basic", _KINDS, domain_of=Domains.of, any_builder=_AnyBuilder,
    builders={"literal": _LiteralBuilder, "operation": _OperationBuilder, "variable": _VariableBuilder,
              "let": _LetBuilder},
    schema_names={"literal": LITERAL, "operation": OPERATION, "variable": VARIABLE, "let": LET},
)
Builders = DIALECT.Builders


# --- Specs ---


class OfLiteral:
    """A native value. `Spec` is a native value, an `OfLiteral.Data`, or a callable taking the builder."""

    Data = _LiteralData
    Builder = _LiteralBuilder
    Spec = Native | _LiteralData | Callable[[_LiteralBuilder], _LiteralBuilder]
    Schema: Schemas.OfObject.Data = _LiteralData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfLiteral.Spec) -> _LiteralData:
        if _native_name(spec) is not None:
            return _LiteralData(spec)
        return F.resolve(spec, _LiteralData, _LiteralBuilder, "a native value, a literal")


class OfOperation:
    """A named operation applied to ordered arguments."""

    Data = _OperationData
    Builder = _OperationBuilder
    Spec = _OperationData | Callable[[_OperationBuilder], _OperationBuilder]
    Schema: Schemas.OfObject.Data = _OperationData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfOperation.Spec) -> _OperationData:
        return F.resolve(spec, _OperationData, _OperationBuilder, "an operation")


class OfVariable:
    """The value bound to a name. `Spec` is a name, an `OfVariable.Data`, or a callable taking the builder."""

    Data = _VariableData
    Builder = _VariableBuilder
    Spec = str | _VariableData | Callable[[_VariableBuilder], _VariableBuilder]
    Schema: Schemas.OfObject.Data = _VariableData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfVariable.Spec) -> _VariableData:
        if type(spec) is str:
            return _VariableData(spec)
        return F.resolve(spec, _VariableData, _VariableBuilder, "a name, a variable")


class OfLet:
    """Binds a name to the value of one expression within another, its body."""

    Data = _LetData
    Builder = _LetBuilder
    Spec = _LetData | Callable[[_LetBuilder], _LetBuilder]
    Schema: Schemas.OfObject.Data = _LetData.Schema  # type: ignore[attr-defined]

    @staticmethod
    def resolve(spec: OfLet.Spec) -> _LetData:
        return F.resolve(spec, _LetData, _LetBuilder, "a let")


class OfAny:
    """Any expression. `Spec` is a native value (a literal), an expression, a `Term`, or a callable taking the
    builder."""

    Data = _LiteralData | _OperationData | _VariableData | _LetData
    Builder = _AnyBuilder
    Spec = Native | Data | Callable[[_AnyBuilder], _AnyBuilder]
    Schema: Schemas.OfUnion.Data = DIALECT.Schema

    @staticmethod
    def resolve(spec: OfAny.Spec) -> OfAny.Data:
        return DIALECT.resolve(spec)


# --- Terms: writing expressions with methods ---


class Term(F.Term):
    """An expression written with methods. `.name` reads a property (`get`); use `.get(name)` for names that are also
    methods, such as `eq`. A `Term` is an `OfAny.Spec`; `.data` is its expression."""

    __slots__ = ()

    def __getattr__(self, name: str) -> Term:
        if name.startswith("_"):
            raise AttributeError(name)
        return self.get(name)

    def get(self, name: str) -> Term:
        return operation("get", self, name)

    def has(self, name: str) -> Term:
        return operation("has", self, name)

    def eq(self, other: OfAny.Spec) -> Term:
        return operation("eq", self, other)

    def ne(self, other: OfAny.Spec) -> Term:
        return operation("ne", self, other)

    def lt(self, other: OfAny.Spec) -> Term:
        return operation("lt", self, other)

    def le(self, other: OfAny.Spec) -> Term:
        return operation("le", self, other)

    def gt(self, other: OfAny.Spec) -> Term:
        return operation("gt", self, other)

    def ge(self, other: OfAny.Spec) -> Term:
        return operation("ge", self, other)

    def and_(self, other: OfAny.Spec) -> Term:
        return operation("and", self, other)

    def or_(self, other: OfAny.Spec) -> Term:
        return operation("or", self, other)

    def not_(self) -> Term:
        return operation("not", self)

    def implies(self, other: OfAny.Spec) -> Term:
        return operation("implies", self, other)

    def add(self, other: OfAny.Spec) -> Term:
        return operation("add", self, other)

    def sub(self, other: OfAny.Spec) -> Term:
        return operation("sub", self, other)

    def mul(self, other: OfAny.Spec) -> Term:
        return operation("mul", self, other)

    def neg(self) -> Term:
        return operation("neg", self)


def variable(name: str) -> Term:
    """The variable `name`."""
    return Term(_VariableData(name))


def literal(value: Native, domain: Any = None) -> Term:
    """The literal `value`, of `domain` (by default, its native's)."""
    return Term(_LiteralData(value, domain))


def let_(name: str, value: OfAny.Spec, body: OfAny.Spec) -> Term:
    """`body`, with `name` bound to the value of `value`."""
    return Term(_LetData(name, OfAny.resolve(value), OfAny.resolve(body)))


def operation(name: str, *arguments: OfAny.Spec) -> Term:
    """The operation `name` applied to `arguments`; for operations outside the core, or without a method."""
    return Term(_OperationData(name, tuple(OfAny.resolve(argument) for argument in arguments)))


# --- From Python functions ---


_COMPARISONS: dict[type, str] = {
    ast.Eq: "eq", ast.NotEq: "ne", ast.Lt: "lt", ast.LtE: "le", ast.Gt: "gt", ast.GtE: "ge",
}
_ARITHMETIC: dict[type, str] = {ast.Add: "add", ast.Sub: "sub", ast.Mult: "mul"}
_FUNCTIONS = (ast.Lambda, ast.FunctionDef)


def from_(function: Callable[..., Any]) -> Term:
    """The expression a Python function computes, read from its source: a lambda, or a `def` whose body is one `return`
    (after an optional docstring). Each parameter becomes a variable of the same name, e.g. `from_(lambda this:
    this.age >= 18)` is `ge(get(this, 'age'), 18)`.

    - `x.name` and `getattr(x, 'name')` are `get`; `hasattr(x, 'name')` is `has`; `x.name is None` is
      `not(has(x, 'name'))` and `x.name is not None` is `has(x, 'name')`.
    - `==`, `!=`, `<`, `<=`, `>`, `>=` are the comparisons (a chain `a < b < c` is `and(lt(a, b), lt(b, c))`); `and`,
      `or`, `not` are the logic operations; `+`, `-`, `*` and unary `-` are `add`, `sub`, `mul` and `neg`.
    - `(lambda name: body)(value)` is a let.
    - Other names are read when `from_` runs, from the function's closure and globals: a native value becomes a literal,
      and a `Term` or expression is used as it is.

    The expression is evaluated by `Evaluators`, with three-valued logic and no coercion, not by Python's rules: for
    example, `1 == 1.0` is True in Python but unknown as an expression. Anything else raises `ValueError`.
    """
    code = getattr(function, "__code__", None)
    if code is None:
        raise TypeError(f"expected a Python function, got {_type_name(function)}")
    node = _function_node(code)
    captured = inspect.getclosurevars(function)
    names = {**captured.builtins, **captured.globals, **captured.nonlocals}
    return Term(_convert(_body(node), {name: _VariableData(name) for name in _parameters(node)}, names))


def _function_node(code: Any) -> ast.Lambda | ast.FunctionDef:
    """The lambda or `def` in the source that compiled to `code`: the innermost one whose span holds every instruction
    of `code`, none of them inside the body of a function nested in it."""
    try:
        tree = ast.parse("".join(linecache.getlines(code.co_filename)))
    except SyntaxError:
        raise ValueError("the function's source is not available") from None
    positions = [  # (start line, start column, end line, end column), without zero-width ones such as RESUME's
        (p[0], p[2], p[1], p[3]) for p in code.co_positions() if None not in p and (p[0], p[2]) != (p[1], p[3])
    ]
    for node in sorted((n for n in ast.walk(tree) if isinstance(n, _FUNCTIONS)), key=_span, reverse=True):
        start, end = _span(node)
        nested = [_span(_body(n)) for n in ast.walk(node) if n is not node and isinstance(n, _FUNCTIONS)]
        if positions and all(start <= (l1, c1) and (l2, c2) <= end for l1, c1, l2, c2 in positions) and not any(
            s <= (l1, c1) and (l2, c2) <= e for l1, c1, l2, c2 in positions for s, e in nested
        ):
            return node
    raise ValueError("the function's source is not available")


def _span(node: ast.AST) -> tuple[tuple[int, int], tuple[int, int]]:
    return (node.lineno, node.col_offset), (node.end_lineno, node.end_col_offset)  # type: ignore[attr-defined]


def _body(node: ast.Lambda | ast.FunctionDef) -> ast.expr:
    if isinstance(node, ast.Lambda):
        return node.body
    statements = node.body[1:] if ast.get_docstring(node) is not None else node.body
    if len(statements) != 1 or not isinstance(statements[0], ast.Return) or statements[0].value is None:
        raise ValueError(f"the body of {node.name!r} must be a single return statement")
    return statements[0].value


def _parameters(node: ast.Lambda | ast.FunctionDef) -> list[str]:
    arguments = node.args
    if arguments.vararg or arguments.kwarg or arguments.kwonlyargs or arguments.defaults or arguments.posonlyargs:
        raise ValueError("only plain positional parameters can become variables")
    return [argument.arg for argument in arguments.args]


def _unsupported(node: ast.AST, reason: str = "not supported in an expression") -> ValueError:
    return ValueError(f"cannot convert {ast.unparse(node)!r}: {reason}")


def _convert(node: ast.expr, bound: dict[str, _VariableData], names: dict[str, Any]) -> Any:
    """The expression data for `node`. `bound` maps the variables in scope to their data, one per name, so each is
    written once; `names` holds the other names it can read."""

    def convert(child: ast.expr) -> Any:
        return _convert(child, bound, names)

    def operation(name: str, *children: ast.expr) -> _OperationData:
        return _OperationData(name, tuple(convert(child) for child in children))

    if isinstance(node, ast.Constant):
        if _native_name(node.value) is None:
            raise _unsupported(node, "only native constants are literals")
        return _LiteralData(node.value)
    if isinstance(node, ast.Name):
        if node.id in bound:
            return bound[node.id]
        if node.id not in names:
            raise _unsupported(node, "the name is not defined")
        value = names[node.id]
        if isinstance(value, Term):
            return value.data
        if isinstance(value, _KINDS) or _native_name(value) is not None:
            return OfAny.resolve(value)
        raise _unsupported(node, f"a {_type_name(value)} is not a native value or an expression")
    if isinstance(node, ast.Attribute):
        return _OperationData("get", (convert(node.value), _LiteralData(node.attr)))
    if isinstance(node, ast.BoolOp):
        name = "and" if isinstance(node.op, ast.And) else "or"
        result = convert(node.values[0])
        for value in node.values[1:]:
            result = _OperationData(name, (result, convert(value)))
        return result
    if isinstance(node, ast.UnaryOp):
        if isinstance(node.op, ast.Not):
            return operation("not", node.operand)
        if isinstance(node.op, ast.USub):
            return operation("neg", node.operand)
        if isinstance(node.op, ast.UAdd):
            return convert(node.operand)
        raise _unsupported(node)
    if isinstance(node, ast.BinOp):
        if type(node.op) not in _ARITHMETIC:
            raise _unsupported(node)
        return operation(_ARITHMETIC[type(node.op)], node.left, node.right)
    if isinstance(node, ast.Compare):
        return _compare(node, convert)
    if isinstance(node, ast.Call):
        return _call(node, bound, names)
    raise _unsupported(node)


def _compare(node: ast.Compare, convert: Callable[[ast.expr], Any]) -> Any:
    if len(node.ops) == 1 and isinstance(node.ops[0], (ast.Is, ast.IsNot)):
        right = node.comparators[0]
        if not (isinstance(right, ast.Constant) and right.value is None and isinstance(node.left, ast.Attribute)):
            raise _unsupported(node, "'is' only tests whether a property is None")
        has = _OperationData("has", (convert(node.left.value), _LiteralData(node.left.attr)))
        return _OperationData("not", (has,)) if isinstance(node.ops[0], ast.Is) else has
    pairs = []
    left = convert(node.left)
    for op, comparator in zip(node.ops, node.comparators):
        if type(op) not in _COMPARISONS:
            raise _unsupported(node)
        right = convert(comparator)
        pairs.append(_OperationData(_COMPARISONS[type(op)], (left, right)))
        left = right
    result = pairs[0]
    for pair in pairs[1:]:
        result = _OperationData("and", (result, pair))
    return result


def _call(node: ast.Call, bound: dict[str, _VariableData], names: dict[str, Any]) -> Any:
    if node.keywords:
        raise _unsupported(node)
    function, arguments = node.func, node.args
    if isinstance(function, ast.Lambda):
        parameters = _parameters(function)
        if len(parameters) != 1 or len(arguments) != 1:
            raise _unsupported(node, "a let binds one name")
        value = _convert(arguments[0], bound, names)
        inner = {**bound, parameters[0]: _VariableData(parameters[0])}
        return _LetData(parameters[0], value, _convert(function.body, inner, names))
    if isinstance(function, ast.Name) and function.id in ("hasattr", "getattr") and function.id not in bound:
        if len(arguments) != 2 or not (isinstance(arguments[1], ast.Constant) and type(arguments[1].value) is str):
            raise _unsupported(node, f"{function.id} takes an object and a property name")
        name = "has" if function.id == "hasattr" else "get"
        return _OperationData(name, (_convert(arguments[0], bound, names), _LiteralData(arguments[1].value)))
    raise _unsupported(node)

