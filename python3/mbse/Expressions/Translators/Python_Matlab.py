"""Python <-> Matlab. Python's operators are MATLAB's, an attribute is a field, and `hasattr` is `isfield`. `b if a
else True` is written `~a || b`, which translates back as `not a or b`; other conditional expressions have no MATLAB
expression. MATLAB has no let expression, so lets are inlined, and imports on either side, which the other cannot
declare, are dropped: what they brought in has no counterpart. MATLAB has no bytes. Python's bitwise operators are
MATLAB's bit functions, `a >> n` being `bitshift(a, -n)`; `~` has no counterpart. A list display is a concatenation,
`[a, b]`; a dict display has no counterpart."""

from __future__ import annotations

from mbse.Expressions.Dialects.Matlab.Expressions import DIALECT as MATLAB
from mbse.Expressions.Dialects.Python.Expressions import DIALECT as PYTHON
from mbse.Expressions.Framework.Translators import Elementwise, Elide, Inline, Pairwise, Rule, renames

from ._Patterns import Matlab, Python, collections, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PYTHON, MATLAB, [
    Rule(Python.constant(V), Matlab.constant(V)),
    Rule(Python.name, Matlab.identifier),
    Inline("let", "left"),
    Elide("python_import", "left"),
    Elide("python_importfrom", "left"),
    Elide("matlab_import", "right"),
    Rule(Python.get, Matlab.get),
    Rule(Python.has, Matlab.has),
    Rule(Python.implies, Matlab.implies, "forward"),
    *renames("python_compare", "operator", "matlab_binary", "operator", {
        "==": "==", "!=": "~=", "<": "<", "<=": "<=", ">": ">", ">=": ">="}, 2),
    *renames("python_boolop", "operator", "matlab_binary", "operator", {"and": "&&", "or": "||"}, 2),
    *renames("python_binop", "operator", "matlab_binary", "operator", {"+": "+", "-": "-", "*": ".*"}, 2),
    *renames("python_unaryop", "operator", "matlab_unary", "operator", {"not": "~", "-": "-"}, 1),
    *renames("python_binop", "operator", "call", "callable", {"&": "bitand", "|": "bitor", "^": "bitxor", "<<": "bitshift"}, 2),
    Rule(Python.shr, Matlab.shr),
    *collections("Python", "Matlab"),
    Elementwise("list", "list"),
])
