"""Matlab <-> Excel. MATLAB's comparison and arithmetic operators are Excel's, `&&`, `||` and `~` are `AND`, `OR` and
`NOT`, a field is a field, and `isfield(x, "name")` is `NOT(ISERROR(x.name))`. MATLAB has no let expression, so
`LET`s are inlined: a let's translated value is shared by every use of its name. MATLAB's imports, which Excel cannot
declare, are dropped. MATLAB's bit functions are Excel's, `bitshift(a, -n)` being `BITRSHIFT(a, n)`. A concatenation,
`[a, b]`, is `VSTACK(a, b)`."""

from __future__ import annotations

from mbse.Expressions.Dialects.Excel.Expressions import DIALECT as EXCEL
from mbse.Expressions.Dialects.Matlab.Expressions import DIALECT as MATLAB
from mbse.Expressions.Framework.Translators import Elementwise, Elide, Inline, Pairwise, Rule, renames

from ._Patterns import Excel, Matlab, collections, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(MATLAB, EXCEL, [
    Rule(Matlab.constant(V), Excel.constant(V)),
    Rule(Matlab.identifier, Excel.name),
    Inline("let", "right"),
    Elide("matlab_import", "left"),
    Rule(Matlab.get, Excel.get),
    Rule(Matlab.has, Excel.has),
    *renames("matlab_binary", "operator", "excel_infix", "operator", {
        "==": "=", "~=": "<>", "<": "<", "<=": "<=", ">": ">", ">=": ">=", "+": "+", "-": "-", ".*": "*"}, 2),
    *renames("matlab_binary", "operator", "call", "callable", {"&&": "AND", "||": "OR"}, 2),
    *renames("matlab_unary", "operator", "call", "callable", {"~": "NOT"}, 1),
    *renames("matlab_unary", "operator", "excel_prefix", "operator", {"-": "-"}, 1),
    *renames("call", "callable", "call", "callable", {
        "bitand": "BITAND", "bitor": "BITOR", "bitxor": "BITXOR", "bitshift": "BITLSHIFT"}, 2),
    Rule(Matlab.shr, Excel.shr),
    *collections("Matlab", "Excel"),
    Elementwise("list", "call", {}, {"callable": "VSTACK"}),
])
