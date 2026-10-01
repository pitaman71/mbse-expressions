"""Basic <-> Ccpp. Basic operations are C's operators, `get` a member (`x.name`), and `implies(a, b)` is written
`!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's translated
value is shared by every use of its name. C has no `has`; a typed C constant (`5u`) has no Basic counterpart yet, nor a
Basic literal of a value domain a C one."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Ccpp.Expressions import DIALECT as CCPP
from mbse.Expressions.Framework.Translators import Inline, Pairwise, Rule, renames

from ._Patterns import Basic, Ccpp, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(BASIC, CCPP, [
    Rule(Basic.literal(V), Ccpp.constant(V)),
    Rule(Basic.variable, Ccpp.identifier),
    Inline("let", "left"),
    Rule(Basic.get, Ccpp.get),
    Rule(Basic.implies, Ccpp.implies, "forward"),
    *renames("operation", "name", "binary", "operator", {
        "eq": "==", "ne": "!=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||", "add": "+",
        "sub": "-", "mul": "*", "bitand": "&", "bitor": "|", "bitxor": "^", "shl": "<<", "shr": ">>"}, 2),
    *renames("operation", "name", "unary", "operator", {"not": "!", "neg": "-", "bitnot": "~"}, 1),
])
