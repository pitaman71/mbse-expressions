"""Simplifiers of the TypeScript5 dialect: a literal's value, and nothing else folded yet.

Shallow rules were decided (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "A shallow evaluator"): a new kind stays in the residual, named. The
framework's interpreter folds a literal by its role, its `value` (a boolean, a number, a bigint or a string), and
`FOLDED` names that kind alone: every other kind, `constant` among them, stays in the residual, its subterms simplified
in turn, "TypeScript5 binaryexpression is not simplified", as does invalid syntax, as in every dialect. A term of a
dialect of its family it reads, `TypeScript Types`' or `TypeScript Patterns`', none of whose kinds is folded, is named
by the dialect that owns it: "TypeScript Types tsuniontype is not simplified" (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Stage 6 extends no evaluator"); a
literal a type holds is TypeScript5's, and folds as one. `CATEGORIES` gives each the evaluation inventory's class.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Simplifiers as F

from . import Expressions

__all__ = ["OfAny", "RULES", "SIMPLIFIER", "FOLDED", "CATEGORIES"]

FOLDED = frozenset({Expressions.LITERAL})
"""The kinds folded: a literal, by its value."""

_D = "d"
CATEGORIES: dict[str, dict[str, str]] = {
    "TypeScript5": {
        "tsemptybodyfunctionexpression": "b", "jsxelement": "b", "jsxfragment": "b", "jsxemptyexpression": "b",
        **dict.fromkeys(("functionexpression", "classexpression", "super", "privateidentifier", "metaproperty",
                         "awaitexpression", "yieldexpression", "importexpression", "assignmentexpression",
                         "updateexpression"), _D)},
    "TypeScript Types": {"*": "b"}, "TypeScript Patterns": {"*": "b"}, "TypeScript RegExp": {"*": "b"},
}
"""The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given)."""

RULES = F.Interpreter(Expressions.DIALECT, {}, folded=FOLDED)
"""The folding rules of the TypeScript5 dialect."""

SIMPLIFIER = F.Simplifier(RULES, literal=F.natives(Expressions.DIALECT), categories=CATEGORIES)
"""The simplifier of the TypeScript5 dialect."""


def OfAny(expression: Any, scope: Any = None) -> F.Simplified:
    """The simplification of a TypeScript5 term: a literal's value; any other kind stays, named."""
    return SIMPLIFIER(expression, scope)
