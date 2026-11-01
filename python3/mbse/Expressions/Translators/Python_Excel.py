"""Python <-> Excel. Comparisons and arithmetic are Excel's operators, `and`, `or` and `not` are `AND`, `OR` and
`NOT`, an attribute is a field, `hasattr(x, 'name')` is `NOT(ISERROR(x.name))`, a conditional expression is `IF`, and
a let is `LET`. Python's imports, which Excel cannot declare, are dropped. Excel has no bytes. Python's bitwise
operators are Excel's bit functions; `~` has no counterpart. A list display is `VSTACK(a, b)`; a dict display has no
counterpart."""

from __future__ import annotations

from mbse.Expressions.Dialects.Excel.Expressions import DIALECT as EXCEL
from mbse.Expressions.Dialects.Python.Expressions import DIALECT as PYTHON
from mbse.Expressions.Framework.Translators import Elementwise, Elide, Pairwise, Rule, renames

from ._Patterns import Excel, Python, collections, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PYTHON, EXCEL, [
    Rule(Python.constant(V), Excel.constant(V)),
    Rule(Python.name, Excel.name),
    Rule(Python.let, Excel.let),
    Elide("python_import", "left"),
    Elide("python_importfrom", "left"),
    Rule(Python.get, Excel.get),
    Rule(Python.has, Excel.has),
    Rule(Python.ifexp, Excel.if_),
    *renames("python_compare", "operator", "excel_infix", "operator", {
        "==": "=", "!=": "<>", "<": "<", "<=": "<=", ">": ">", ">=": ">="}, 2),
    *renames("python_binop", "operator", "excel_infix", "operator", {"+": "+", "-": "-", "*": "*"}, 2),
    *renames("python_boolop", "operator", "call", "callable", {"and": "AND", "or": "OR"}, 2),
    *renames("python_unaryop", "operator", "call", "callable", {"not": "NOT"}, 1),
    *renames("python_unaryop", "operator", "excel_prefix", "operator", {"-": "-"}, 1),
    *renames("python_binop", "operator", "call", "callable", {
        "&": "BITAND", "|": "BITOR", "^": "BITXOR", "<<": "BITLSHIFT", ">>": "BITRSHIFT"}, 2),
    *collections("Python", "Excel"),
    Elementwise("list", "call", {}, {"callable": "VSTACK"}),
])
