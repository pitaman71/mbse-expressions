"""Python <-> Matlab. Python's operators are MATLAB's, an attribute is a field, and `hasattr` is `isfield`. `b if a
else True` is written `~a || b`, which translates back as `not a or b`; other conditional expressions have no MATLAB
expression. MATLAB has no let expression, so lets are inlined, and imports on either side, which the other cannot
declare, are dropped: what they brought in has no counterpart. MATLAB has no bytes. Python's bitwise operators are
MATLAB's bit functions, `a >> n` being `bitshift(a, -n)`; `~` has no counterpart."""

from __future__ import annotations

from mbse.Expressions.Dialects.Matlab.Expressions import DIALECT as MATLAB
from mbse.Expressions.Dialects.Python.Expressions import DIALECT as PYTHON
from mbse.Expressions.Framework.Translators import Elide, Inline, Pairwise, Rule, renames

from ._Patterns import Matlab, Python, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PYTHON, MATLAB, [
    Rule(Python.constant(V), Matlab.constant(V)),
    Rule(Python.name, Matlab.identifier),
    Inline("let", "left"),
    Elide("import", "left"),
    Elide("importfrom", "left"),
    Elide("import", "right"),
    Rule(Python.get, Matlab.get),
    Rule(Python.has, Matlab.has),
    Rule(Python.implies, Matlab.implies, "forward"),
    *renames("compare", "operator", "binary", "operator", {
        "==": "==", "!=": "~=", "<": "<", "<=": "<=", ">": ">", ">=": ">="}, 2),
    *renames("boolop", "operator", "binary", "operator", {"and": "&&", "or": "||"}, 2),
    *renames("binop", "operator", "binary", "operator", {"+": "+", "-": "-", "*": ".*"}, 2),
    *renames("unaryop", "operator", "unary", "operator", {"not": "~", "-": "-"}, 1),
    *renames("binop", "operator", "call", "function", {"&": "bitand", "|": "bitor", "^": "bitxor", "<<": "bitshift"}, 2),
    Rule(Python.shr, Matlab.shr),
])
