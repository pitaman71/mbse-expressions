"""Python3 <-> Excel. Comparisons and arithmetic are Excel's operators, `and`, `or` and `not` are `AND`, `OR` and
`NOT`, an attribute is a field, `hasattr(x, 'name')` is `NOT(ISERROR(x.name))`, a conditional expression is `IF`, and
a let is `LET`. Python's imports, which Excel cannot declare, are dropped. Excel has no bytes. Python's bitwise
operators are Excel's bit functions; `~` has no counterpart. A list display is `VSTACK(a, b)`; a dict display has no
counterpart."""

from __future__ import annotations

from mbse.Expressions.Dialects.Excel.Expressions import DIALECT as EXCEL
from mbse.Expressions.Dialects.Python3.Expressions import DIALECT as PYTHON3
from mbse.Expressions.Framework.Translators import Elementwise, Elide, Pairwise, Rule, renames

from ._Patterns import compares, Excel, Python3, collections, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PYTHON3, EXCEL, [
    Rule(Python3.constant(V), Excel.constant(V)),
    Rule(Python3.name, Excel.name),
    Rule(Python3.let, Excel.let),
    Elide("import", "left"),
    Elide("importfrom", "left"),
    Rule(Python3.get, Excel.get),
    Rule(Python3.has, Excel.has),
    Rule(Python3.ifexp, Excel.if_),
    *compares("infix", "operator", {
        "==": "=", "!=": "<>", "<": "<", "<=": "<=", ">": ">", ">=": ">="}),
    *renames("binop", "op", "infix", "operator", {"+": "+", "-": "-", "*": "*"}, 2),
    *renames("boolop", "op", "call", "callable", {"and": "AND", "or": "OR"}, 2),
    *renames("unaryop", "op", "call", "callable", {"not": "NOT"}, 1),
    *renames("unaryop", "op", "prefix", "operator", {"-": "-"}, 1),
    *renames("binop", "op", "call", "callable", {
        "&": "BITAND", "|": "BITOR", "^": "BITXOR", "<<": "BITLSHIFT", ">>": "BITRSHIFT"}, 2),
    *collections("Python", "Excel"),
    Elementwise("list", "call", {}, {"callable": "VSTACK"}),
])
