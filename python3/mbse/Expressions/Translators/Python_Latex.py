"""Python <-> Latex. Python's operators are LaTeX's, `a / b` is `\\frac{a}{b}`, an attribute is a member, `hasattr`
is `\\operatorname{has}`, `b if a else True` is `a \\implies b`, and a let is `where`. Other conditional expressions
have no LaTeX counterpart here, and Python's imports, which notation cannot declare, are dropped."""

from __future__ import annotations

from mbse.Expressions.Dialects.Latex.Expressions import DIALECT as LATEX
from mbse.Expressions.Dialects.Python.Expressions import DIALECT as PYTHON
from mbse.Expressions.Framework.Translators import Elide, Pairwise, Pattern as P, Rule, holes, renames

from ._Patterns import Latex, Python, value

V = value(int, float, str, bool)
A, B = holes("A", "B")

TRANSLATOR = Pairwise(PYTHON, LATEX, [
    Rule(Python.constant(V), Latex.constant(V)),
    Rule(Python.name, Latex.symbol),
    Rule(Python.let, Latex.where),
    Elide("python_import", "left"),
    Elide("python_importfrom", "left"),
    Rule(Python.get, Latex.get),
    Rule(Python.has, Latex.has),
    Rule(Python.implies, Latex.implies),
    Rule(P("python_binop", A, B, operator="/"), Latex.frac),
    *renames("python_compare", "operator", "latex_binary", "operator", {
        "==": "=", "!=": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq"}, 2),
    *renames("python_boolop", "operator", "latex_binary", "operator", {"and": "\\land", "or": "\\lor"}, 2),
    *renames("python_binop", "operator", "latex_binary", "operator", {"+": "+", "-": "-", "*": "\\cdot"}, 2),
    *renames("python_unaryop", "operator", "latex_unary", "operator", {"not": "\\lnot", "-": "-"}, 1),
])
