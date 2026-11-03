"""Patterns <-> Excel. Comparisons and arithmetic are Excel operators, logic is Excel's functions, `get` a field, `has`
is `NOT(ISERROR(x.name))`, `implies(a, b)` is `IF(a, b, TRUE)`, and a let is `LET`. Excel has no bytes. The bitwise
operations are Excel's bit functions, which have no `bitnot`.

Collections are arrays: `all` and `any` are `AND(MAP(xs, LAMBDA(p, body)))` and `OR(...)`, the quantifier `count` is
`SUM(MAP(xs, LAMBDA(p, IF(body, 1, 0))))`, `count(xs)` is `ROWS(xs)`, `item(xs, i)` is `INDEX(xs, i + 1)` (Excel
counts from 1), `in(x, xs)` is `ISNUMBER(MATCH(x, xs, 0))`, and `sum`, `min` and `max` are `SUM`, `MIN` and `MAX`.
`unique(xs)` is written `ROWS(UNIQUE(xs)) = ROWS(xs)`, which does not read back as `unique`, and `entries` has no
counterpart. A `list` is `VSTACK(a, b)`, a column of its elements; a `mapping` has no counterpart."""

from __future__ import annotations

from mbse.Expressions.Dialects.Patterns.Expressions import DIALECT as PATTERNS
from mbse.Expressions.Dialects.Excel.Expressions import DIALECT as EXCEL
from mbse.Expressions.Framework.Translators import Elementwise, Pairwise, Rule, renames

from ._Patterns import Patterns, Excel, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PATTERNS, EXCEL, [
    Rule(Patterns.literal(V), Excel.constant(V)),
    Rule(Patterns.variable, Excel.name),
    Rule(Patterns.let, Excel.let),
    Rule(Patterns.get, Excel.get),
    Rule(Patterns.has, Excel.has),
    Rule(Patterns.implies, Excel.implies),
    *renames("call", "callable", "infix", "operator", {
        "eq": "=", "ne": "<>", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "add": "+", "sub": "-", "mul": "*"}, 2),
    *renames("call", "callable", "call", "callable", {"and": "AND", "or": "OR"}, 2),
    *renames("call", "callable", "call", "callable", {"not": "NOT"}, 1),
    *renames("call", "callable", "prefix", "operator", {"neg": "-"}, 1),
    *renames("call", "callable", "call", "callable", {
        "bitand": "BITAND", "bitor": "BITOR", "bitxor": "BITXOR", "shl": "BITLSHIFT", "shr": "BITRSHIFT"}, 2),
    Rule(Patterns.quantifier("all"), Excel.over("AND")),
    Rule(Patterns.quantifier("any"), Excel.over("OR")),
    Rule(Patterns.quantifier("count"), Excel.count_where),
    Rule(Patterns.unary("count"), Excel.function("ROWS")),
    *[Rule(Patterns.unary(name), Excel.function(name.upper())) for name in ("sum", "min", "max")],
    Rule(Patterns.item, Excel.index),
    Rule(Patterns.in_, Excel.match),
    Rule(Patterns.unary("unique"), Excel.unique, "forward"),
    Elementwise("list", "call", {}, {"callable": "VSTACK"}),
])
