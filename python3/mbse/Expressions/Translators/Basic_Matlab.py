"""Basic <-> Matlab. Basic operations are MATLAB operators, `get` a field, and `has` is `isfield`. `implies(a, b)` is
written `~a || b`, which translates back as `or(not(a), b)`. MATLAB has no let expression, so lets are inlined: a
let's translated value is shared by every use of its name. MATLAB has no bytes."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Matlab.Expressions import DIALECT as MATLAB
from mbse.Expressions.Framework.Translators import Inline, Pairwise, Rule, renames

from ._Patterns import Basic, Matlab, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(BASIC, MATLAB, [
    Rule(Basic.literal(V), Matlab.constant(V)),
    Rule(Basic.variable, Matlab.identifier),
    Inline("let", "left"),
    Rule(Basic.get, Matlab.get),
    Rule(Basic.has, Matlab.has),
    Rule(Basic.implies, Matlab.implies, "forward"),
    *renames("operation", "name", "binary", "operator", {
        "eq": "==", "ne": "~=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||",
        "add": "+", "sub": "-", "mul": ".*"}, 2),
    *renames("operation", "name", "unary", "operator", {"not": "~", "neg": "-"}, 1),
])
