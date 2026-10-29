"""Matlab <-> Latex. MATLAB's operators are LaTeX's, a field is a member, and `isfield` is `\\operatorname{has}`.
`a \\implies b` is written `~a || b`, which translates back as `\\lnot a \\lor b`. MATLAB has no let expression, so a
`where` is inlined: its translated value is shared by every use of its name. MATLAB's imports are dropped."""

from __future__ import annotations

from mbse.Expressions.Dialects.Latex.Expressions import DIALECT as LATEX
from mbse.Expressions.Dialects.Matlab.Expressions import DIALECT as MATLAB
from mbse.Expressions.Framework.Translators import Elide, Inline, Pairwise, Rule, renames

from ._Patterns import Latex, Matlab, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(MATLAB, LATEX, [
    Rule(Matlab.constant(V), Latex.constant(V)),
    Rule(Matlab.identifier, Latex.symbol),
    Inline("latex_where", "right"),
    Elide("matlab_import", "left"),
    Rule(Matlab.get, Latex.get),
    Rule(Matlab.has, Latex.has),
    Rule(Matlab.implies, Latex.implies, "backward"),
    *renames("matlab_binary", "operator", "latex_binary", "operator", {
        "==": "=", "~=": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq", "&&": "\\land", "||": "\\lor",
        "+": "+", "-": "-", ".*": "\\cdot"}, 2),
    *renames("matlab_unary", "operator", "latex_unary", "operator", {"~": "\\lnot", "-": "-"}, 1),
])
