"""Numpy <-> Excel. Numpy calls are Excel operators and functions, a subscript a field, the test that a subscript is
not masked is `NOT(ISERROR(x.name))`, and `where` is `IF`. Numpy has no binding, so `LET`s are inlined: a let's
translated value is shared by every use of its name. Excel has no bytes."""

from __future__ import annotations

from mbse.Expressions.Dialects.Excel.Expressions import DIALECT as EXCEL
from mbse.Expressions.Dialects.Numpy.Expressions import DIALECT as NUMPY
from mbse.Expressions.Framework.Translators import Inline, Pairwise, Rule, renames

from ._Patterns import Excel, Numpy, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(NUMPY, EXCEL, [
    Rule(Numpy.constant(V), Excel.constant(V)),
    Rule(Numpy.name, Excel.name),
    Inline("let", "right"),
    Rule(Numpy.get, Excel.get),
    Rule(Numpy.has, Excel.has),
    Rule(Numpy.where, Excel.if_),
    *renames("call", "function", "infix", "operator", {
        "equal": "=", "not_equal": "<>", "less": "<", "less_equal": "<=", "greater": ">", "greater_equal": ">=",
        "add": "+", "subtract": "-", "multiply": "*"}, 2),
    *renames("call", "function", "function", "name", {"logical_and": "AND", "logical_or": "OR"}, 2),
    *renames("call", "function", "function", "name", {"logical_not": "NOT"}, 1),
    *renames("call", "function", "prefix", "operator", {"negative": "-"}, 1),
])
