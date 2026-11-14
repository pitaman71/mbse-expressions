"""Simplifiers of the Cpp dialect: simplify an expression by C++'s rules for arithmetic types, which are C's for its
kinds (see `C.Simplifiers`), a name used as an expression an `idexpression` holding its identifier (`FOLDED`):
`Simplifiers.OfAny(term, scope)` simplifies a term value in a `Scope(variables, functions)`."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from mbse.Expressions.C.Expressions.Simplifiers import CATEGORIES as C_CATEGORIES, FOLDED as C_FOLDED, Scope, simplifier
from mbse.Expressions.Framework import Simplifiers as F

from . import Expressions

__all__ = ["OfAny", "Scope", "SIMPLIFIER", "FOLDED", "CATEGORIES"]

FOLDED = C_FOLDED - {"variable"} | {Expressions.IDEXPRESSION}
"""The kinds C++'s rules fold: C's, a name used as an expression an `idexpression`, as C++'s grammar makes it."""

_D = "d"
CATEGORIES: dict[str, dict[str, str]] = {
    **C_CATEGORIES,
    "Cpp": {**C_CATEGORIES["C"], "initializerlist": "b", "designatedinitializer": "b", "requiresexpression": "c",
            "typeidexpression": "c",
            **dict.fromkeys(("lambdaexpression", "newexpression", "deleteexpression", "noexceptexpression",
                             "awaitexpression", "yieldexpression", "statementexpression", "assignmentexpression",
                             "postfixexpression", "binaryexpression '.*'", "binaryexpression '->*'",
                             "memberexpression of a member that is not an identifier",
                             "subscriptexpression of several indices"), _D)},
    "Cpp Types": {"*": "b"}, "Cpp RegExp": {"*": "b"},
}
"""The evaluation inventory's class of what each dialect C++ reads has no rule for (`a` where none is given)."""

SIMPLIFIER = simplifier(Expressions.DIALECT, FOLDED, CATEGORIES, Expressions.literal)
"""The simplifier of the Cpp dialect; its values carry their C++ types, its residual's literals theirs."""


def OfAny(expression: Any, scope: Scope | Mapping[str, Any] | None = None) -> F.Simplified:
    """The simplification of a term in `scope`, or with the variables in a mapping bound."""
    return SIMPLIFIER(expression, scope)
