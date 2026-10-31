"""Basic <-> Ccpp. Basic operations are C's operators, `get` a member (`x.name`), and `implies(a, b)` is written
`!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's translated
value is shared by every use of its name. C has no `has`, and no container constructor.

A C constant of a type of its own (`5u`, `1.5f`, `(uint8_t)5`) has no Basic counterpart yet: a term carries no domain,
and the conversions of typed literals wait for type inference (the port's stage 3, Decided, 2). An untyped constant is
a Basic literal, and a Basic literal an untyped constant; a `bool` constant is a bool, as C's bool is Basic's."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Ccpp.Expressions import DIALECT as CCPP
from mbse.Expressions.Framework.Translators import Inline, Pairwise, Pattern, Rule, renames

from ._Patterns import Basic, Ccpp, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(BASIC, CCPP, [
    Rule(Basic.literal(V), Ccpp.constant(V)),
    Rule(Basic.literal(value(bool)), Pattern("ccpp_constant", value=value(bool), type="bool"), "backward"),
    Rule(Basic.variable, Ccpp.identifier),
    Inline("let", "left"),
    Rule(Basic.get, Ccpp.get),
    Rule(Basic.implies, Ccpp.implies, "forward"),
    *renames("call", "callable", "ccpp_binary", "operator", {
        "eq": "==", "ne": "!=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||", "add": "+",
        "sub": "-", "mul": "*", "bitand": "&", "bitor": "|", "bitxor": "^", "shl": "<<", "shr": ">>"}, 2),
    *renames("call", "callable", "ccpp_unary", "operator", {"not": "!", "neg": "-", "bitnot": "~"}, 1),
])
