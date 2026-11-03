"""Evaluators of the TypeScript5 dialect: a literal's value, and nothing else yet.

The dialects proposal decided a shallow evaluator (its Decided, 8): a new kind is refused by evaluation by name. The
framework's interpreter evaluates a literal by its role, its `value` (a boolean, a number, a bigint or a string), and
`EVALUATED` names that kind alone: every other kind, `constant` among them, raises `NotImplementedError`, "TypeScript5
binaryexpression is not evaluated", and invalid syntax `ValueError`, as in every dialect.
"""

from __future__ import annotations

from mbse.Expressions.Framework import Evaluators as F

from . import Expressions

__all__ = ["OfAny", "INTERPRETER", "EVALUATED"]

EVALUATED = frozenset({Expressions.LITERAL})
"""The kinds evaluated: a literal, by its value."""

INTERPRETER = F.Interpreter(Expressions.DIALECT, {}, evaluated=EVALUATED)
OfAny: F.Evaluator = INTERPRETER
"""The value of a TypeScript5 term: a literal's value; any other kind is refused by name."""
