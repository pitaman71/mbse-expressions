"""Patterns <-> C, and the rules Patterns <-> Cpp shares (`RULES`, over the kinds of the C family). Patterns operations
are C's operators, `get` a member (`x.name`), and `implies(a, b)` is written
`!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's translated
value is shared by every use of its name. C has no `has`, and no container constructor.

A C constant of a type of its own (`5u`, `1.5f`, `(uint8_t)5`) has no Patterns counterpart yet: a term carries no domain,
and the conversions of typed literals wait for type inference (the port's stage 3, Decided, 2). An untyped constant is
a Patterns literal, and a Patterns literal an untyped constant; a `bool` constant is a bool, as C's bool is Patterns'."""

from __future__ import annotations

from mbse.Expressions.Dialects.C.Expressions import DIALECT as C_DIALECT
from mbse.Expressions.Dialects.Patterns.Expressions import DIALECT as PATTERNS
from mbse.Expressions.Framework.Translators import Inline, Pairwise, Pattern, Rule, renames

from ._Patterns import CFamily, Patterns, value

V = value(int, float, str, bool)

RULES = [
    Rule(Patterns.literal(V), CFamily.constant(V)),
    Rule(Patterns.literal(value(bool)), Pattern("constant", value=value(bool), type="bool"), "backward"),
    Rule(Patterns.variable, CFamily.identifier),
    Inline("let", "left"),
    Rule(Patterns.get, CFamily.get),
    Rule(Patterns.implies, CFamily.implies, "forward"),
    *renames("call", "callable", "binary", "operator", {
        "eq": "==", "ne": "!=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||", "add": "+",
        "sub": "-", "mul": "*", "bitand": "&", "bitor": "|", "bitxor": "^", "shl": "<<", "shr": ">>"}, 2),
    *renames("call", "callable", "unary", "operator", {"not": "!", "neg": "-", "bitnot": "~"}, 1),
]
"""The rules between Patterns and the kinds of the C family, one set for C and for C++ (the proposal's question 9)."""

TRANSLATOR = Pairwise(PATTERNS, C_DIALECT, RULES)
