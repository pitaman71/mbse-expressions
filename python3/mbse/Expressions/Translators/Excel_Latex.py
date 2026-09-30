"""Excel <-> Latex. Excel's operators are LaTeX's, `AND`, `OR` and `NOT` are `\\land`, `\\lor` and `\\lnot`, a field
is a member, `NOT(ISERROR(x.name))` is `\\operatorname{has}`, `IF(a, b, TRUE)` is `a \\implies b`, and `LET` is
`where`. Cells and other `IF`s have no LaTeX counterpart here."""

from __future__ import annotations

from mbse.Expressions.Dialects.Excel.Expressions import DIALECT as EXCEL
from mbse.Expressions.Dialects.Latex.Expressions import DIALECT as LATEX
from mbse.Expressions.Framework.Translators import Pairwise, Rule, renames

from ._Patterns import Excel, Latex, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(EXCEL, LATEX, [
    Rule(Excel.constant(V), Latex.constant(V)),
    Rule(Excel.name, Latex.symbol),
    Rule(Excel.let, Latex.where),
    Rule(Excel.get, Latex.get),
    Rule(Excel.has, Latex.has),
    Rule(Excel.implies, Latex.implies),
    *renames("infix", "operator", "binary", "operator", {
        "=": "=", "<>": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq", "+": "+", "-": "-",
        "*": "\\cdot"}, 2),
    *renames("function", "name", "binary", "operator", {"AND": "\\land", "OR": "\\lor"}, 2),
    *renames("function", "name", "unary", "operator", {"NOT": "\\lnot"}, 1),
    *renames("prefix", "operator", "unary", "operator", {"-": "-"}, 1),
])
