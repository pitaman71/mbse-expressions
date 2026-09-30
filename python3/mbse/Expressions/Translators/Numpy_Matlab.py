"""Numpy <-> Matlab. Numpy calls are MATLAB operators, a subscript a field, and the test that a subscript is not
masked is `isfield`. `where(a, b, True)` is written `~a || b`, which translates back as `logical_or(logical_not(a),
b)`; other `where`s have no MATLAB expression. MATLAB has no bytes."""

from __future__ import annotations

from mbse.Expressions.Dialects.Matlab.Expressions import DIALECT as MATLAB
from mbse.Expressions.Dialects.Numpy.Expressions import DIALECT as NUMPY
from mbse.Expressions.Framework.Translators import Pairwise, Rule, renames

from ._Patterns import Matlab, Numpy, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(NUMPY, MATLAB, [
    Rule(Numpy.constant(V), Matlab.constant(V)),
    Rule(Numpy.name, Matlab.identifier),
    Rule(Numpy.get, Matlab.get),
    Rule(Numpy.has, Matlab.has),
    Rule(Numpy.implies, Matlab.implies, "forward"),
    *renames("call", "function", "binary", "operator", {
        "equal": "==", "not_equal": "~=", "less": "<", "less_equal": "<=", "greater": ">", "greater_equal": ">=",
        "logical_and": "&&", "logical_or": "||", "add": "+", "subtract": "-", "multiply": ".*"}, 2),
    *renames("call", "function", "unary", "operator", {"logical_not": "~", "negative": "-"}, 1),
])
