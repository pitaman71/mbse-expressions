"""MATLAB <-> Excel. MATLAB's comparison and arithmetic operators are Excel's, `&&`, `||` and `~` are `AND`, `OR` and
`NOT`, a field is a field, and `isfield(x, "name")` is `NOT(ISERROR(x.name))`. MATLAB has no let expression, so
`LET`s are inlined: a let's translated value is shared by every use of its name. MATLAB's imports, which Excel cannot
declare, are dropped. MATLAB's bit functions are Excel's, `bitshift(a, -n)` being `BITRSHIFT(a, n)`. A concatenation,
`[a, b]`, is `VSTACK(a, b)`."""

from __future__ import annotations

from mbse.Expressions.Excel.Expressions.Expressions import DIALECT as EXCEL
from mbse.Expressions.MATLAB.Expressions.Expressions import DIALECT as MATLAB
from mbse.Expressions.Framework.Translators import Elementwise, Elide, Inline, Pairwise, Rule, renames

from ._Patterns import Excel, Matlab, collections, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(MATLAB, EXCEL, [
    Rule(Matlab.constant(V), Excel.constant(V)),
    Rule(Matlab.identifier, Excel.name),
    Inline("let", "right"),
    Elide("import", "left"),
    Rule(Matlab.get, Excel.get),
    Rule(Matlab.has, Excel.has),
    *renames("binary", "operator", "infix", "operator", {
        "==": "=", "~=": "<>", "<": "<", "<=": "<=", ">": ">", ">=": ">=", "+": "+", "-": "-", ".*": "*"}, 2),
    *renames("binary", "operator", "call", "callable", {"&&": "AND", "||": "OR"}, 2),
    *renames("unary", "operator", "call", "callable", {"~": "NOT"}, 1),
    *renames("unary", "operator", "prefix", "operator", {"-": "-"}, 1),
    *renames("call", "callable", "call", "callable", {
        "bitand": "BITAND", "bitor": "BITOR", "bitxor": "BITXOR", "bitshift": "BITLSHIFT"}, 2),
    Rule(Matlab.shr, Excel.shr),
    *collections("MATLAB", "Excel"),
    Elementwise("list", "call", {}, {"callable": "VSTACK"}),
])
