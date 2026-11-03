"""Python3 <-> Matlab. Python's operators are MATLAB's, an attribute is a field, and `hasattr` is `isfield`. `b if a
else True` is written `~a || b`, which translates back as `not a or b`; other conditional expressions have no MATLAB
expression. MATLAB has no let expression, so lets are inlined, and imports on either side, which the other cannot
declare, are dropped: what they brought in has no counterpart. MATLAB has no bytes. Python's bitwise operators are
MATLAB's bit functions, `a >> n` being `bitshift(a, -n)`; `~` has no counterpart. A list display is a concatenation,
`[a, b]`; a dict display has no counterpart."""

from __future__ import annotations

from mbse.Expressions.Dialects.Matlab.Expressions import DIALECT as MATLAB
from mbse.Expressions.Dialects.Python3.Expressions import DIALECT as PYTHON3
from mbse.Expressions.Framework.Translators import Elementwise, Elide, Inline, Pairwise, Rule, renames

from ._Patterns import compares, Matlab, Python3, collections, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PYTHON3, MATLAB, [
    Rule(Python3.constant(V), Matlab.constant(V)),
    Rule(Python3.name, Matlab.identifier),
    Inline("let", "left"),
    Elide("import", "left"),
    Elide("importfrom", "left"),
    Elide("import", "right"),
    Rule(Python3.get, Matlab.get),
    Rule(Python3.has, Matlab.has),
    Rule(Python3.implies, Matlab.implies, "forward"),
    *compares("binary", "operator", {
        "==": "==", "!=": "~=", "<": "<", "<=": "<=", ">": ">", ">=": ">="}),
    *renames("boolop", "op", "binary", "operator", {"and": "&&", "or": "||"}, 2),
    *renames("binop", "op", "binary", "operator", {"+": "+", "-": "-", "*": ".*"}, 2),
    *renames("unaryop", "op", "unary", "operator", {"not": "~", "-": "-"}, 1),
    *renames("binop", "op", "call", "callable", {"&": "bitand", "|": "bitor", "^": "bitxor", "<<": "bitshift"}, 2),
    Rule(Python3.shr, Matlab.shr),
    *collections("Python", "Matlab"),
    Elementwise("list", "list"),
])
