"""Basic <-> SystemVerilog. Basic operations are SystemVerilog's operators, `implies` its `->`, `shr` its arithmetic
`>>>`, `get` a member, and a bool `1'b1` or `1'b0`. SystemVerilog has no let expression, so lets are inlined: a let's
translated value is shared by every use of its name. It has no `has`; its sized vectors other than single bits, the
logical `>>` and the 4-state comparisons (`===`, `==?`) have no Basic counterpart yet, nor Basic's literals of value
domains a SystemVerilog one."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.SystemVerilog.Expressions import DIALECT as SYSTEMVERILOG
from mbse.Expressions.Framework.Translators import Inline, Pairwise, Pattern, Rule, renames

from ._Patterns import Basic, SystemVerilog, value

V = value(int, float, str)

TRANSLATOR = Pairwise(BASIC, SYSTEMVERILOG, [
    Rule(Basic.literal(V), SystemVerilog.constant(V)),
    Rule(Pattern("literal", value=True), Pattern("vector", value="1")),
    Rule(Pattern("literal", value=False), Pattern("vector", value="0")),
    Rule(Basic.variable, SystemVerilog.identifier),
    Inline("let", "left"),
    Rule(Basic.get, SystemVerilog.get),
    Rule(Basic.implies, SystemVerilog.implies),
    *renames("operation", "name", "binary", "operator", {
        "eq": "==", "ne": "!=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||", "add": "+",
        "sub": "-", "mul": "*", "bitand": "&", "bitor": "|", "bitxor": "^", "shl": "<<", "shr": ">>>"}, 2),
    *renames("operation", "name", "unary", "operator", {"not": "!", "neg": "-", "bitnot": "~"}, 1),
])
