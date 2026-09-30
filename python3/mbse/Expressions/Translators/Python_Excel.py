"""Python <-> Excel. Comparisons and arithmetic are Excel's operators, `and`, `or` and `not` are `AND`, `OR` and
`NOT`, an attribute is a field, `hasattr(x, 'name')` is `NOT(ISERROR(x.name))`, a conditional expression is `IF`, and
a let is `LET`. Python's imports, which Excel cannot declare, are dropped. Excel has no bytes."""

from __future__ import annotations

from mbse.Expressions.Dialects.Excel.Expressions import DIALECT as EXCEL
from mbse.Expressions.Dialects.Python.Expressions import DIALECT as PYTHON
from mbse.Expressions.Framework.Translators import Elide, Pairwise, Rule, renames

from ._Patterns import Excel, Python, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PYTHON, EXCEL, [
    Rule(Python.constant(V), Excel.constant(V)),
    Rule(Python.name, Excel.name),
    Rule(Python.let, Excel.let),
    Elide("import", "left"),
    Elide("importfrom", "left"),
    Rule(Python.get, Excel.get),
    Rule(Python.has, Excel.has),
    Rule(Python.ifexp, Excel.if_),
    *renames("compare", "operator", "infix", "operator", {
        "==": "=", "!=": "<>", "<": "<", "<=": "<=", ">": ">", ">=": ">="}, 2),
    *renames("binop", "operator", "infix", "operator", {"+": "+", "-": "-", "*": "*"}, 2),
    *renames("boolop", "operator", "function", "name", {"and": "AND", "or": "OR"}, 2),
    *renames("unaryop", "operator", "function", "name", {"not": "NOT"}, 1),
    *renames("unaryop", "operator", "prefix", "operator", {"-": "-"}, 1),
])
