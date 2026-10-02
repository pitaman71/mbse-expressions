"""Text of the Python dialect, its source text in both directions, as every mbse framework names it:
`ToText(expression)` is the expression as Python source, parenthesized only where precedence requires, with its
imports as the lines before it; `FromText(source)` is the expression Python source writes, imports then one
expression; and `FromFunction(function)` is the Basic expression a Python function computes, read from its source by
Basic's rules (see `FromFunction`)."""

from __future__ import annotations

import ast
import inspect
import linecache
import math
from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from ..Basic.Expressions import (
    OfAny, Writer, _KINDS, _LetData, _LiteralData, _OperationData, _VariableData, _native_name, _type_name)
from .Expressions import (
    _Attribute, _BinOp, _BoolOp, _Call, _Compare, _Constant, _Generator, _IfExp,
    _Import, _ImportFrom, _Index, _Let, _Name, _Subscript, _UnaryOp)

__all__ = ["ToText", "FromText", "FromFunction"]


# --- Rendering ---

(_LAMBDA, _IF, _OR, _AND, _NOT, _COMPARE, _BITOR, _BITXOR, _BITAND, _SHIFT, _SUM, _PRODUCT, _UNARY, _POWER,
 _PRIMARY) = range(15)
_BINOP_LEVELS = {"+": _SUM, "-": _SUM, "*": _PRODUCT, "/": _PRODUCT, "//": _PRODUCT, "%": _PRODUCT, "**": _POWER,
                 "|": _BITOR, "^": _BITXOR, "&": _BITAND, "<<": _SHIFT, ">>": _SHIFT}


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


def ToText(expression: Any) -> str:
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
        if isinstance(node, _Index):
            return f"{operand(0, _PRIMARY)}[{arguments[1][0]}]", _PRIMARY
        if isinstance(node, _Call):
            texts = [text for text, _ in arguments[1:]]
            if len(node.arguments) == 1 and isinstance(node.arguments[0], _Generator):
                texts = [texts[0][1:-1]]  # a generator, the only argument, without its parentheses
            return f"{operand(0, _PRIMARY)}({', '.join(texts)})", _PRIMARY
        if isinstance(node, _Generator):
            conditions = "".join(f" if {operand(i, _OR)}" for i in range(2, len(arguments)))
            return f"({operand(1, _IF)} for {node.name} in {operand(0, _OR)}{conditions})", _PRIMARY
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
    ast.Pow: "**", ast.Not: "not", ast.USub: "-", ast.UAdd: "+", ast.BitAnd: "&", ast.BitOr: "|", ast.BitXor: "^",
    ast.LShift: "<<", ast.RShift: ">>", ast.Invert: "~", ast.In: "in", ast.NotIn: "not in",
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
        if isinstance(node.slice, ast.Constant) and type(node.slice.value) is str:
            return _Subscript(node.slice.value, _expression(node.value))
        if isinstance(node.slice, (ast.Slice, ast.Tuple)):
            raise _unsupported(node, "slices are not supported")
        return _Index(_expression(node.value), _expression(node.slice))
    if isinstance(node, ast.GeneratorExp):
        if len(node.generators) != 1 or not isinstance(node.generators[0].target, ast.Name):
            raise _unsupported(node, "a generator has one for, over a name")
        clause = node.generators[0]
        return _Generator(clause.target.id, _expression(clause.iter), _expression(node.elt),
                          tuple(_expression(condition) for condition in clause.ifs))
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


def FromText(source: str) -> Any:
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


# --- From Python functions ---


_COMPARISONS: dict[type, str] = {
    ast.Eq: "eq", ast.NotEq: "ne", ast.Lt: "lt", ast.LtE: "le", ast.Gt: "gt", ast.GtE: "ge",
}
_ARITHMETIC: dict[type, str] = {ast.Add: "add", ast.Sub: "sub", ast.Mult: "mul"}
_FUNCTIONS = (ast.Lambda, ast.FunctionDef)


def FromFunction(function: Callable[..., Any]) -> Writer:
    """The expression a Python function computes, read from its source: a lambda, or a `def` whose body is one `return`
    (after an optional docstring). Each parameter becomes a variable of the same name, e.g. `FromFunction(lambda this:
    this.age >= 18)` is `ge(get(this, 'age'), 18)`.

    - `x.name` and `getattr(x, 'name')` are `get`; `hasattr(x, 'name')` is `has`; `x.name is None` is
      `not(has(x, 'name'))` and `x.name is not None` is `has(x, 'name')`.
    - `==`, `!=`, `<`, `<=`, `>`, `>=` are the comparisons (a chain `a < b < c` is `and(lt(a, b), lt(b, c))`); `and`,
      `or`, `not` are the logic operations; `+`, `-`, `*` and unary `-` are `add`, `sub`, `mul` and `neg`.
    - `(lambda name: body)(value)` is a let.
    - Other names are read when `FromFunction` runs, from the function's closure and globals: a native value becomes a literal,
      and a `Writer` or expression is used as it is.

    The expression is evaluated by `Evaluators`, with three-valued logic and no coercion, not by Python's rules: for
    example, `1 == 1.0` is True in Python but unknown as an expression. Anything else raises `ValueError`.
    """
    code = getattr(function, "__code__", None)
    if code is None:
        raise TypeError(f"expected a Python function, got {_type_name(function)}")
    node = _function_node(code)
    captured = inspect.getclosurevars(function)
    names = {**captured.builtins, **captured.globals, **captured.nonlocals}
    return Writer(_convert(_body(node), {name: _VariableData(name) for name in _parameters(node)}, names))


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


def _unconvertible(node: ast.AST, reason: str = "not supported in an expression") -> ValueError:
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
            raise _unconvertible(node, "only native constants are literals")
        return _LiteralData(node.value)
    if isinstance(node, ast.Name):
        if node.id in bound:
            return bound[node.id]
        if node.id not in names:
            raise _unconvertible(node, "the name is not defined")
        value = names[node.id]
        if isinstance(value, Writer):
            return value.data
        if isinstance(value, _KINDS) or _native_name(value) is not None:
            return OfAny.resolve(value)
        raise _unconvertible(node, f"a {_type_name(value)} is not a native value or an expression")
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
        raise _unconvertible(node)
    if isinstance(node, ast.BinOp):
        if type(node.op) not in _ARITHMETIC:
            raise _unconvertible(node)
        return operation(_ARITHMETIC[type(node.op)], node.left, node.right)
    if isinstance(node, ast.Compare):
        return _compare(node, convert)
    if isinstance(node, ast.Call):
        return _call(node, bound, names)
    raise _unconvertible(node)


def _compare(node: ast.Compare, convert: Callable[[ast.expr], Any]) -> Any:
    if len(node.ops) == 1 and isinstance(node.ops[0], (ast.Is, ast.IsNot)):
        right = node.comparators[0]
        if not (isinstance(right, ast.Constant) and right.value is None and isinstance(node.left, ast.Attribute)):
            raise _unconvertible(node, "'is' only tests whether a property is None")
        has = _OperationData("has", (convert(node.left.value), _LiteralData(node.left.attr)))
        return _OperationData("not", (has,)) if isinstance(node.ops[0], ast.Is) else has
    pairs = []
    left = convert(node.left)
    for op, comparator in zip(node.ops, node.comparators):
        if type(op) not in _COMPARISONS:
            raise _unconvertible(node)
        right = convert(comparator)
        pairs.append(_OperationData(_COMPARISONS[type(op)], (left, right)))
        left = right
    result = pairs[0]
    for pair in pairs[1:]:
        result = _OperationData("and", (result, pair))
    return result


def _call(node: ast.Call, bound: dict[str, _VariableData], names: dict[str, Any]) -> Any:
    if node.keywords:
        raise _unconvertible(node)
    function, arguments = node.func, node.args
    if isinstance(function, ast.Lambda):
        parameters = _parameters(function)
        if len(parameters) != 1 or len(arguments) != 1:
            raise _unconvertible(node, "a let binds one name")
        value = _convert(arguments[0], bound, names)
        inner = {**bound, parameters[0]: _VariableData(parameters[0])}
        return _LetData(parameters[0], value, _convert(function.body, inner, names))
    if isinstance(function, ast.Name) and function.id in ("hasattr", "getattr") and function.id not in bound:
        if len(arguments) != 2 or not (isinstance(arguments[1], ast.Constant) and type(arguments[1].value) is str):
            raise _unconvertible(node, f"{function.id} takes an object and a property name")
        name = "has" if function.id == "hasattr" else "get"
        return _OperationData(name, (_convert(arguments[0], bound, names), _LiteralData(arguments[1].value)))
    raise _unconvertible(node)

