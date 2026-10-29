"""Text of the Python dialect, its source text in both directions, as every mbse framework names it:
`ToText(expression)` is a term (or anything `Terms.term` reads one from) as Python source, parenthesized only where
precedence requires, with its imports as the lines before it; `FromText(source)` is the `Writer` of the term Python
source writes, imports then one expression; and `FromFunction(function)` is the Basic `Writer` of the expression a
Python function computes, read from its source by Basic's rules (see `FromFunction`). A writer is written where a
caller writes a term, within a transaction: `store.Expressions.Framework.Term(FromText("a + 1"))`."""

from __future__ import annotations

import ast
import builtins
import inspect
import linecache
import math
from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework import Schemas

from ..Basic import Expressions as E
from . import Expressions as P

__all__ = ["ToText", "FromText", "FromFunction"]


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


# --- From Python functions ---


_COMPARISONS: dict[type, str] = {
    ast.Eq: "eq", ast.NotEq: "ne", ast.Lt: "lt", ast.LtE: "le", ast.Gt: "gt", ast.GtE: "ge",
}
_ARITHMETIC: dict[type, str] = {ast.Add: "add", ast.Sub: "sub", ast.Mult: "mul"}
_FUNCTIONS = (ast.Lambda, ast.FunctionDef)


def FromFunction(function: Callable[..., Any]) -> E.Writer:
    """The Basic writer of the expression a Python function computes, read from its source: a lambda, or a `def` whose
    body is one `return` (after an optional docstring). Each parameter becomes a variable of the same name, e.g.
    `FromFunction(lambda this: this.age >= 18)` is `ge(get(this, 'age'), 18)`. A caller writes it within a transaction,
    as any writer: `e.root(FromFunction(lambda this: this.age >= 18))`.

    - `x.name` and `getattr(x, 'name')` are `get`; `hasattr(x, 'name')` is `has`; `x.name is None` is
      `not(has(x, 'name'))` and `x.name is not None` is `has(x, 'name')`.
    - `==`, `!=`, `<`, `<=`, `>`, `>=` are the comparisons (a chain `a < b < c` is `and(lt(a, b), lt(b, c))`); `and`,
      `or`, `not` are the logic operations; `+`, `-`, `*` and unary `-` are `add`, `sub`, `mul` and `neg`.
    - `(lambda name: body)(value)` is a let.
    - Collections are read in the forms the Basic-to-Python translator writes: `len(xs)` is `count`, `xs[i]` is `item`,
      `x in xs` is `in` (`not in` its negation), and `sum(xs)`, `min(xs)` and `max(xs)` are `sum`, `min` and `max`. The
      quantifiers are generator expressions over one name: `all(body for x in xs)` and `any(...)` are `all` and `any`,
      and `sum(1 for x in xs if condition)` is `count`; an `if` in `all` or `any` restricts the items, so `all(b for x
      in xs if c)` is `all(xs, x => implies(c, b))` and `any(...)` is `any(xs, x => and(c, b))`. These builtins are
      read only when their names are Python's own; `unique` has no Python spelling.
    - Other names are read when `FromFunction` runs, from the function's closure and globals: a native value becomes a
      literal, a `Writer` is used as it is, and a term value is copied where the writer is written.

    The expression is evaluated by `Evaluators`, with three-valued logic and no coercion, not by Python's rules: for
    example, `1 == 1.0` is True in Python but unknown as an expression. Anything else raises `ValueError`.
    """
    code = getattr(function, "__code__", None)
    if code is None:
        raise TypeError(f"expected a Python function, got {F._type_name(function)}")
    node = _function_node(code)
    captured = inspect.getclosurevars(function)
    names = {**captured.builtins, **captured.globals, **captured.nonlocals}
    written = _convert(_body(node), {name: E.variable(name) for name in _parameters(node)}, names)
    return written if isinstance(written, E.Writer) else E.Writer(written.write)


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
        nested = [_inside(n) for n in ast.walk(node) if n is not node and isinstance(n, _FUNCTIONS)]
        if positions and all(start <= (l1, c1) and (l2, c2) <= end for l1, c1, l2, c2 in positions) and not any(
            s <= (l1, c1) and (l2, c2) <= e for l1, c1, l2, c2 in positions for s, e in nested
        ):
            return node
    raise ValueError("the function's source is not available")


def _span(node: ast.AST) -> tuple[tuple[int, int], tuple[int, int]]:
    return (node.lineno, node.col_offset), (node.end_lineno, node.end_col_offset)  # type: ignore[attr-defined]


def _inside(node: ast.Lambda | ast.FunctionDef) -> tuple[tuple[int, int], tuple[int, int]]:
    """The span of a function's body, whatever its statements: what a function nested in it runs, not its defaults."""
    if isinstance(node, ast.Lambda):
        return _span(node.body)
    return _span(node.body[0])[0], _span(node.body[-1])[1]


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


def _convert(node: ast.expr, bound: dict[str, E.Writer], names: dict[str, Any]) -> F.Writer:
    """The writer of the expression `node` computes. `bound` maps the variables in scope to their writers; `names` holds
    the other names it can read."""

    def convert(child: ast.expr) -> Any:
        return _convert(child, bound, names)

    def operation(name: str, *children: ast.expr) -> E.Writer:
        return E.operation(name, *(convert(child) for child in children))

    if isinstance(node, ast.Constant):
        if type(node.value) not in Schemas.SCALAR_TYPES:
            raise _unconvertible(node, "only native constants are literals")
        return E.literal(node.value)
    if isinstance(node, ast.Name):
        if node.id in bound:
            return bound[node.id]
        if node.id not in names:
            raise _unconvertible(node, "the name is not defined")
        value = names[node.id]
        if isinstance(value, F.Writer):
            return value
        if F.is_term(value) or type(value) in Schemas.SCALAR_TYPES:
            return E.DIALECT.spec(value)  # a term value, copied where it is written, or a literal
        raise _unconvertible(node, f"a {F._type_name(value)} is not a native value or an expression")
    if isinstance(node, ast.Attribute):
        return E.operation("get", convert(node.value), node.attr)
    if isinstance(node, ast.Subscript):
        if isinstance(node.slice, (ast.Slice, ast.Tuple)):
            raise _unconvertible(node, "slices are not supported")
        return operation("item", node.value, node.slice)
    if isinstance(node, ast.BoolOp):
        name = "and" if isinstance(node.op, ast.And) else "or"
        result = convert(node.values[0])
        for value in node.values[1:]:
            result = E.operation(name, result, convert(value))
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
        has = E.operation("has", convert(node.left.value), node.left.attr)
        return E.operation("not", has) if isinstance(node.ops[0], ast.Is) else has
    pairs = []
    left = convert(node.left)
    for op, comparator in zip(node.ops, node.comparators):
        if not isinstance(op, (ast.In, ast.NotIn)) and type(op) not in _COMPARISONS:
            raise _unconvertible(node)
        right = convert(comparator)
        if isinstance(op, (ast.In, ast.NotIn)):
            within = E.operation("in", left, right)
            pairs.append(within if isinstance(op, ast.In) else E.operation("not", within))
        else:
            pairs.append(E.operation(_COMPARISONS[type(op)], left, right))
        left = right
    result = pairs[0]
    for pair in pairs[1:]:
        result = E.operation("and", result, pair)
    return result


def _call(node: ast.Call, bound: dict[str, E.Writer], names: dict[str, Any]) -> E.Writer:
    if node.keywords:
        raise _unconvertible(node)
    function, arguments = node.func, node.args
    if isinstance(function, ast.Lambda):
        parameters = _parameters(function)
        if len(parameters) != 1 or len(arguments) != 1:
            raise _unconvertible(node, "a let binds one name")
        value = _convert(arguments[0], bound, names)
        inner = {**bound, parameters[0]: E.variable(parameters[0])}
        return E.let_(parameters[0], value, _convert(function.body, inner, names))
    if isinstance(function, ast.Name) and function.id in ("hasattr", "getattr") and function.id not in bound:
        if len(arguments) != 2 or not (isinstance(arguments[1], ast.Constant) and type(arguments[1].value) is str):
            raise _unconvertible(node, f"{function.id} takes an object and a property name")
        name = "has" if function.id == "hasattr" else "get"
        return E.operation(name, _convert(arguments[0], bound, names), arguments[1].value)
    if isinstance(function, ast.Name) and function.id in _COLLECTIONS and function.id not in bound \
            and names.get(function.id, getattr(builtins, function.id)) is getattr(builtins, function.id):
        if len(arguments) != 1:
            raise _unconvertible(node, f"{function.id} takes one collection")
        if isinstance(arguments[0], ast.GeneratorExp):
            return _quantifier(node, function.id, arguments[0], bound, names)
        if function.id in ("all", "any"):
            raise _unconvertible(node, f"{function.id} takes a generator expression")
        return E.operation(_COLLECTIONS[function.id], _convert(arguments[0], bound, names))
    raise _unconvertible(node)


_COLLECTIONS = {"len": "count", "sum": "sum", "min": "min", "max": "max", "all": "all", "any": "any"}


def _quantifier(node: ast.Call, function: str, generator: ast.GeneratorExp, bound: dict[str, E.Writer],
                names: dict[str, Any]) -> Any:
    """`all(...)`, `any(...)` or `sum(1 for ...)` of a generator expression over one name, as a quantifier."""
    clauses = generator.generators
    if len(clauses) != 1 or not isinstance(clauses[0].target, ast.Name):
        raise _unconvertible(node, "a generator has one for, over a name")
    clause, name = clauses[0], clauses[0].target.id
    counted = isinstance(generator.elt, ast.Constant) and type(generator.elt.value) is int and generator.elt.value == 1
    if function not in ("all", "any") and not (function == "sum" and counted):
        raise _unconvertible(node, "a quantifier is all(...), any(...) or sum(1 for ...)")
    inner = {**bound, name: E.variable(name)}
    conditions = [_convert(condition, inner, names) for condition in clause.ifs]
    condition = None
    for each in conditions:
        condition = each if condition is None else E.operation("and", condition, each)
    if function == "sum":
        body, quantifier = (E.literal(True) if condition is None else condition), "count"
    else:
        body, quantifier = _convert(generator.elt, inner, names), function
        if condition is not None:
            body = E.operation("implies" if function == "all" else "and", condition, body)
    return E.quantifier(quantifier, name, _convert(clause.iter, bound, names), body)

