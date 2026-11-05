"""Patterns <-> LaTeX. Patterns' operations are LaTeX's operators (`\\geq`, `\\land`, `\\implies`, `\\cdot`, ...), `get`
is a member, `has` is `\\operatorname{has}`, and a let is `where`. Every Patterns expression without bytes or container
constructors round-trips: LaTeX has no bytes, and Patterns' `list` and `mapping` have no counterpart."""

from __future__ import annotations

from mbse.Expressions.Framework.Patterns.Expressions import DIALECT as PATTERNS
from mbse.Expressions.LaTeX.Expressions.Expressions import DIALECT as LATEX
from mbse.Expressions.Framework.Translators import Pairwise, Rule, renames

from ._Patterns import Patterns, Latex, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PATTERNS, LATEX, [
    Rule(Patterns.literal(V), Latex.constant(V)),
    Rule(Patterns.variable, Latex.symbol),
    Rule(Patterns.let, Latex.where),
    Rule(Patterns.get, Latex.get),
    Rule(Patterns.has, Latex.has),
    Rule(Patterns.implies, Latex.implies),
    *renames("call", "callable", "binary", "operator", {
        "eq": "=", "ne": "\\neq", "lt": "<", "le": "\\leq", "gt": ">", "ge": "\\geq", "and": "\\land",
        "or": "\\lor", "add": "+", "sub": "-", "mul": "\\cdot"}, 2),
    *renames("call", "callable", "unary", "operator", {"not": "\\lnot", "neg": "-"}, 1),
])
