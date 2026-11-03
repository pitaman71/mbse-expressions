"""Python3 <-> Latex. Python's operators are LaTeX's, `a / b` is `\\frac{a}{b}`, an attribute is a member, `hasattr`
is `\\operatorname{has}`, `b if a else True` is `a \\implies b`, and a let is `where`. Other conditional expressions
have no LaTeX counterpart here, and Python's imports, which notation cannot declare, are dropped."""

from __future__ import annotations

from mbse.Expressions.Dialects.Latex.Expressions import DIALECT as LATEX
from mbse.Expressions.Dialects.Python3.Expressions import DIALECT as PYTHON3
from mbse.Expressions.Framework.Translators import Elide, Pairwise, Pattern as P, Rule, holes, renames

from ._Patterns import compares, Latex, Python3, value

V = value(int, float, str, bool)
A, B = holes("A", "B")

TRANSLATOR = Pairwise(PYTHON3, LATEX, [
    Rule(Python3.constant(V), Latex.constant(V)),
    Rule(Python3.name, Latex.symbol),
    Rule(Python3.let, Latex.where),
    Elide("import", "left"),
    Elide("importfrom", "left"),
    Rule(Python3.get, Latex.get),
    Rule(Python3.has, Latex.has),
    Rule(Python3.implies, Latex.implies),
    Rule(P("binop", A, B, op="/"), Latex.frac),
    *compares("binary", "operator", {
        "==": "=", "!=": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq"}),
    *renames("boolop", "op", "binary", "operator", {"and": "\\land", "or": "\\lor"}, 2),
    *renames("binop", "op", "binary", "operator", {"+": "+", "-": "-", "*": "\\cdot"}, 2),
    *renames("unaryop", "op", "unary", "operator", {"not": "\\lnot", "-": "-"}, 1),
])
