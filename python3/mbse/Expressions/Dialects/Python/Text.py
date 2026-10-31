"""Text of the Python dialect, its source text in both directions, as every mbse framework names it:
`ToText(expression)` is a term (or anything `Terms.term` reads one from) as Python source, parenthesized only where
precedence requires, with its imports as the lines before it; and `FromText(source)` is the `Writer` of the term
Python source writes, imports then one expression. A writer is written where a caller writes a term, within a
transaction: `store.Expressions.Framework.Term(FromText("a + 1"))`."""

from __future__ import annotations

import ast
import math
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework import Schemas

from . import Expressions as P

__all__ = ["ToText", "FromText"]


# --- Rendering ---

(_LAMBDA, _IF, _OR, _AND, _NOT, _COMPARE, _BITOR, _BITXOR, _BITAND, _SHIFT, _SUM, _PRODUCT, _UNARY, _POWER,
 _PRIMARY) = range(15)
_BINOP_LEVELS = {"+": _SUM, "-": _SUM, "*": _PRODUCT, "/": _PRODUCT, "//": _PRODUCT, "%": _PRODUCT, "**": _POWER,
                 "|": _BITOR, "^": _BITXOR, "&": _BITAND, "<<": _SHIFT, ">>": _SHIFT}
_IMPORTS = (P.IMPORT, P.IMPORTFROM)


def _constant(value: Any) -> tuple[str, int]:
    if type(value) is float and not math.isfinite(value):
        text = "float('nan')" if math.isnan(value) else "float('inf')" if value > 0 else "-float('inf')"
    else:
        text = repr(value)
    return text, _UNARY if text.startswith("-") else _PRIMARY


def _import_line(tag: str, attributes: dict[str, Any]) -> str:
    alias = f" as {attributes['alias']}" if attributes.get("alias") else ""
    if tag == P.IMPORT:
        return f"import {attributes['module']}{alias}"
    return f"from {attributes['module']} import {attributes['name']}{alias}"


def ToText(expression: Any) -> str:
    """The expression as Python source: one line per import around it, then the expression."""
    lines = []
    node = F.term(expression)
    tag, record = F.kind_of(node)
    while tag in _IMPORTS:
        lines.append(_import_line(tag, F.attributes_of(record)))
        node = F.arguments_of(record)[0]
        tag, record = F.kind_of(node)

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        tag, record = F.kind_of(node)
        attributes = F.attributes_of(record)
        if tag == P.CONSTANT:
            return _constant(attributes["value"])
        if tag == P.NAME:
            return attributes["name"], _PRIMARY
        if tag == P.ATTRIBUTE:
            return f"{operand(0, _PRIMARY)}.{attributes['attr']}", _PRIMARY
        if tag == P.SUBSCRIPT:
            return f"{operand(0, _PRIMARY)}[{attributes['key']!r}]", _PRIMARY
        if tag == P.INDEX:
            return f"{operand(0, _PRIMARY)}[{arguments[1][0]}]", _PRIMARY
        if tag == P.CALL:
            texts = [text for text, _ in arguments[1:]]
            called = F.arguments_of(record)[1:]
            if len(called) == 1 and F.kind_of(called[0])[0] == P.GENERATOR:
                texts = [texts[0][1:-1]]  # a generator, the only argument, without its parentheses
            return f"{operand(0, _PRIMARY)}({', '.join(texts)})", _PRIMARY
        if tag == P.GENERATOR:
            conditions = "".join(f" if {operand(i, _OR)}" for i in range(2, len(arguments)))
            return f"({operand(1, _IF)} for {attributes['name']} in {operand(0, _OR)}{conditions})", _PRIMARY
        if tag == P.LET:
            return f"(lambda {attributes['name']}: {arguments[1][0]})({arguments[0][0]})", _PRIMARY
        if tag == P.IFEXP:
            return f"{operand(1, _OR)} if {operand(0, _OR)} else {operand(2, _IF)}", _IF
        if tag == P.LIST:
            return f"[{', '.join(text for text, _ in arguments)}]", _PRIMARY
        if tag == P.DICT:
            pairs = [f"{arguments[i][0]}: {arguments[i + 1][0]}" for i in range(0, len(arguments), 2)]
            return f"{{{', '.join(pairs)}}}", _PRIMARY
        if tag in _IMPORTS:
            raise ValueError("an import can only enclose the whole expression")
        operator = attributes["operator"]
        if tag == P.UNARYOP:
            if operator == "not":
                return f"not {operand(0, _NOT)}", _NOT
            return f"{operator}{operand(0, _UNARY)}", _UNARY
        if tag == P.COMPARE:
            return f"{operand(0, _COMPARE + 1)} {operator} {operand(1, _COMPARE + 1)}", _COMPARE
        if tag == P.BOOLOP:
            level = _AND if operator == "and" else _OR
            return f"{operand(0, level)} {operator} {operand(1, level + 1)}", level
        level = _BINOP_LEVELS[operator]
        if operator == "**":  # right-associative, binding tighter than unary operators on its left
            return f"{operand(0, _PRIMARY)} ** {operand(1, _UNARY)}", _POWER
        return f"{operand(0, level)} {operator} {operand(1, level + 1)}", level

    return "\n".join([*lines, F.fold(node, write)[0]])


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


def _expression(node: ast.expr) -> P.Writer:
    if isinstance(node, ast.Constant):
        if type(node.value) not in Schemas.SCALAR_TYPES:
            raise _unsupported(node, "only native constants are supported")
        return P.constant(node.value)
    if isinstance(node, ast.Name):
        return P.name(node.id)
    if isinstance(node, ast.Attribute):
        return P.attribute(_expression(node.value), node.attr)
    if isinstance(node, ast.Subscript):
        if isinstance(node.slice, ast.Constant) and type(node.slice.value) is str:
            return P.subscript(_expression(node.value), node.slice.value)
        if isinstance(node.slice, (ast.Slice, ast.Tuple)):
            raise _unsupported(node, "slices are not supported")
        return P.index(_expression(node.value), _expression(node.slice))
    if isinstance(node, ast.GeneratorExp):
        if len(node.generators) != 1 or not isinstance(node.generators[0].target, ast.Name):
            raise _unsupported(node, "a generator has one for, over a name")
        clause = node.generators[0]
        return P.generator(clause.target.id, _expression(clause.iter), _expression(node.elt),
                           *(_expression(condition) for condition in clause.ifs))
    if isinstance(node, ast.Call):
        if node.keywords:
            raise _unsupported(node, "keyword arguments are not supported")
        if isinstance(node.func, ast.Lambda):
            parameters = node.func.args
            if len(parameters.args) != 1 or len(node.args) != 1 or parameters.vararg or parameters.kwarg or \
                    parameters.kwonlyargs or parameters.posonlyargs or parameters.defaults:
                raise _unsupported(node, "a let binds one name")
            return P.let_(parameters.args[0].arg, _expression(node.args[0]), _expression(node.func.body))
        return P.call(_expression(node.func), *(_expression(argument) for argument in node.args))
    if isinstance(node, ast.Compare):  # a chain a < b < c is a < b and b < c, the middle operand shared
        operands = [_expression(operand) for operand in (node.left, *node.comparators)]
        result = None
        for op, left, right in zip(node.ops, operands, operands[1:]):
            compare = P.compare(_operator(node, op), left, right)
            result = compare if result is None else P.boolop("and", result, compare)
        return result
    if isinstance(node, ast.BoolOp):
        result = _expression(node.values[0])
        for value in node.values[1:]:
            result = P.boolop(_operator(node, node.op), result, _expression(value))
        return result
    if isinstance(node, ast.BinOp):
        return P.binop(_operator(node, node.op), _expression(node.left), _expression(node.right))
    if isinstance(node, ast.UnaryOp):
        return P.unaryop(_operator(node, node.op), _expression(node.operand))
    if isinstance(node, ast.IfExp):
        return P.ifexp(_expression(node.test), _expression(node.body), _expression(node.orelse))
    if isinstance(node, ast.List):
        return P.list_(*(_expression(element) for element in node.elts))
    if isinstance(node, ast.Dict):
        if any(key is None for key in node.keys):
            raise _unsupported(node, "a dict's unpacking is not supported")
        return P.dict_(*((_expression(key), _expression(value)) for key, value in zip(node.keys, node.values)))  # type: ignore[arg-type]
    raise _unsupported(node)


def FromText(source: str) -> P.Writer:
    """The writer of the expression that Python `source` writes: `import` and `from ... import` statements, then one
    expression. A chained comparison `a < b < c` is `a < b and b < c`, `b` written in each."""
    statements = ast.parse(source).body
    if not statements or not isinstance(statements[-1], ast.Expr):
        raise ValueError("the source must end with an expression")
    result = _expression(statements[-1].value)
    for statement in reversed(statements[:-1]):
        if isinstance(statement, ast.Import):
            for alias in reversed(statement.names):
                result = P.import_(alias.name, result, alias.asname)
        elif isinstance(statement, ast.ImportFrom) and statement.level == 0 and statement.module:
            for alias in reversed(statement.names):
                if alias.name == "*":
                    raise _unsupported(statement, "import * binds names that cannot be known")
                result = P.importfrom(statement.module, alias.name, result, alias.asname)
        else:
            raise _unsupported(statement, "only imports may precede the expression")
    return result
