"""Basic <-> Latex. Basic's operations are LaTeX's operators (`\\geq`, `\\land`, `\\implies`, `\\cdot`, ...), `get`
is a member, `has` is `\\operatorname{has}`, and a let is `where`. Every Basic expression without bytes round-trips.
LaTeX has no bytes."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Latex.Expressions import DIALECT as LATEX
from mbse.Expressions.Framework.Translators import Pairwise, Rule, renames

from ._Patterns import Basic, Latex, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(BASIC, LATEX, [
    Rule(Basic.literal(V), Latex.constant(V)),
    Rule(Basic.variable, Latex.symbol),
    Rule(Basic.let, Latex.where),
    Rule(Basic.get, Latex.get),
    Rule(Basic.has, Latex.has),
    Rule(Basic.implies, Latex.implies),
    *renames("operation", "name", "binary", "operator", {
        "eq": "=", "ne": "\\neq", "lt": "<", "le": "\\leq", "gt": ">", "ge": "\\geq", "and": "\\land",
        "or": "\\lor", "add": "+", "sub": "-", "mul": "\\cdot"}, 2),
    *renames("operation", "name", "unary", "operator", {"not": "\\lnot", "neg": "-"}, 1),
])
