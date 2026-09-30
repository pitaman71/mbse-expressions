"""Basic <-> Numpy. Basic operations are numpy calls, `get` a subscript, `has` a test that the subscript is not
masked, and `implies(a, b)` is `where(a, b, True)`. Numpy has no binding, so lets are inlined: a let's translated
value is shared by every use of its name."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Numpy.Expressions import DIALECT as NUMPY
from mbse.Expressions.Framework.Translators import Inline, Pairwise, Rule, renames

from ._Patterns import Basic, Numpy, value

V = value(int, float, str, bool, bytes)

TRANSLATOR = Pairwise(BASIC, NUMPY, [
    Rule(Basic.literal(V), Numpy.constant(V)),
    Rule(Basic.variable, Numpy.name),
    Inline("let", "left"),
    Rule(Basic.get, Numpy.get),
    Rule(Basic.has, Numpy.has),
    Rule(Basic.implies, Numpy.implies),
    *renames("operation", "name", "call", "function", {
        "eq": "equal", "ne": "not_equal", "lt": "less", "le": "less_equal", "gt": "greater", "ge": "greater_equal",
        "and": "logical_and", "or": "logical_or", "add": "add", "sub": "subtract", "mul": "multiply"}, 2),
    *renames("operation", "name", "call", "function", {"not": "logical_not", "neg": "negative"}, 1),
])
