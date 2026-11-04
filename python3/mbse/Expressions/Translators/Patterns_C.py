"""Patterns <-> C, and the rules Patterns <-> Cpp shares (`rules(member)`, over the kinds of the C family). Patterns
operations are C's operators (`binaryexpression`, `unaryexpression`), `get` a member (`x.name`), and `implies(a, b)` is
written `!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's
translated value is shared by every use of its name. C has no `has`, and no container constructor.

A C literal of a type of its own (`5u`, `1.5f`, `L'a'`: a suffix or a prefix), or a cast (`(uint8_t)5`), has no
Patterns counterpart yet: a term carries no domain, and the conversions of typed literals wait for domain inference
(mbse-basis [CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)). Any other literal is
a Patterns literal, its spelling (its text, quote, base and digit separators) aside, and a Patterns literal a C literal
of the same value; C23's `bool` is Patterns'. Every other kind of C's has no counterpart, and is refused by name."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Dialects.C.Expressions import DIALECT as C_DIALECT
from mbse.Expressions.Dialects.Patterns.Expressions import DIALECT as PATTERNS
from mbse.Expressions.Framework.Translators import Inline, Pairwise, Rule, renames

from ._Patterns import CFamily, K, Patterns, value

V = value(int, float, str, bool)


def rules(member: Any) -> list[Any]:
    """The rules between Patterns and a dialect of the C family, whose member's name is written `member` (a hole, or a
    `Terms.Part` of one): one set for C and for C++ (the proposal's question 9)."""
    return [
        Rule(Patterns.literal(V), CFamily.literal(V)),
        Rule(Patterns.variable, CFamily.identifier),
        Inline("let", "left"),
        Rule(Patterns.get, CFamily.member(member)),
        Rule(Patterns.implies, CFamily.implies, "forward"),
        *renames("call", "callable", "binaryexpression", "operator", {
            "eq": "==", "ne": "!=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||", "add": "+",
            "sub": "-", "mul": "*", "bitand": "&", "bitor": "|", "bitxor": "^", "shl": "<<", "shr": ">>"}, 2),
        *renames("call", "callable", "unaryexpression", "operator", {"not": "!", "neg": "-", "bitnot": "~"}, 1),
    ]


RULES = rules(K)
"""The rules between Patterns and C, whose member's name is a `str`."""

TRANSLATOR = Pairwise(PATTERNS, C_DIALECT, RULES)
