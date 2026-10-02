"""Basic <-> Excel. Comparisons and arithmetic are Excel operators, logic is Excel's functions, `get` a field, `has`
is `NOT(ISERROR(x.name))`, `implies(a, b)` is `IF(a, b, TRUE)`, and a let is `LET`. Excel has no bytes. The bitwise
operations are Excel's bit functions, which have no `bitnot`.

Collections are arrays: `all` and `any` are `AND(MAP(xs, LAMBDA(p, body)))` and `OR(...)`, the quantifier `count` is
`SUM(MAP(xs, LAMBDA(p, IF(body, 1, 0))))`, `count(xs)` is `ROWS(xs)`, `item(xs, i)` is `INDEX(xs, i + 1)` (Excel
counts from 1), `in(x, xs)` is `ISNUMBER(MATCH(x, xs, 0))`, and `sum`, `min` and `max` are `SUM`, `MIN` and `MAX`.
`unique(xs)` is written `ROWS(UNIQUE(xs)) = ROWS(xs)`, which does not read back as `unique`, and `entries` has no
counterpart."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Excel.Expressions import DIALECT as EXCEL
from mbse.Expressions.Framework.Translators import Pairwise, Rule, renames

from ._Patterns import Basic, Excel, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(BASIC, EXCEL, [
    Rule(Basic.literal(V), Excel.constant(V)),
    Rule(Basic.variable, Excel.name),
    Rule(Basic.let, Excel.let),
    Rule(Basic.get, Excel.get),
    Rule(Basic.has, Excel.has),
    Rule(Basic.implies, Excel.implies),
    *renames("operation", "name", "infix", "operator", {
        "eq": "=", "ne": "<>", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "add": "+", "sub": "-", "mul": "*"}, 2),
    *renames("operation", "name", "function", "name", {"and": "AND", "or": "OR"}, 2),
    *renames("operation", "name", "function", "name", {"not": "NOT"}, 1),
    *renames("operation", "name", "prefix", "operator", {"neg": "-"}, 1),
    *renames("operation", "name", "function", "name", {
        "bitand": "BITAND", "bitor": "BITOR", "bitxor": "BITXOR", "shl": "BITLSHIFT", "shr": "BITRSHIFT"}, 2),
    Rule(Basic.quantifier("all"), Excel.over("AND")),
    Rule(Basic.quantifier("any"), Excel.over("OR")),
    Rule(Basic.quantifier("count"), Excel.count_where),
    Rule(Basic.unary("count"), Excel.function("ROWS")),
    *[Rule(Basic.unary(name), Excel.function(name.upper())) for name in ("sum", "min", "max")],
    Rule(Basic.item, Excel.index),
    Rule(Basic.in_, Excel.match),
    Rule(Basic.unary("unique"), Excel.unique, "forward"),
])
