"""Basic <-> Excel. Comparisons and arithmetic are Excel operators, logic is Excel's functions, `get` a field, `has`
is `NOT(ISERROR(x.name))`, `implies(a, b)` is `IF(a, b, TRUE)`, and a let is `LET`. Excel has no bytes. The bitwise
operations are Excel's bit functions, which have no `bitnot`."""

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
])
