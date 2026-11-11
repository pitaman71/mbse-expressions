"""Evaluators of the TypeScript5 dialect: a literal's value, and nothing else yet.

The dialects proposal decided a shallow evaluator (its Decided, 8): a new kind is refused by evaluation by name. The
framework's interpreter evaluates a literal by its role, its `value` (a boolean, a number, a bigint or a string), and
`EVALUATED` names that kind alone: every other kind, `constant` among them, raises `NotImplementedError`, "TypeScript5
binaryexpression is not evaluated", and invalid syntax `ValueError`, as in every dialect. A term of a dialect of its
family it reads, `TypeScript Types`' or `TypeScript Patterns`', none of whose kinds is evaluated, is refused by that
dialect's name: "TypeScript Types tsuniontype is not evaluated" (the dialects proposal, Retrofit's design: "Evaluation
keeps what it does").
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Evaluators as F, Terms

from . import Expressions

__all__ = ["OfAny", "INTERPRETER", "EVALUATED"]

EVALUATED = frozenset({Expressions.LITERAL})
"""The kinds evaluated: a literal, by its value."""


class _Interpreter(F.Interpreter):
    """TypeScript5's interpreter, which refuses a term of a dialect of its family by that dialect's name."""

    def evaluate(self, node: Any, scope: Any) -> Any:
        union = Terms.dialect_of(node)
        reader = next((dialect for dialect in self.dialect.reads() if dialect.union == union), None)
        if reader is not None:  # none of its kinds is evaluated
            return F.Interpreter(reader, {}, evaluated=frozenset()).evaluate(node, scope)
        return super().evaluate(node, scope)


INTERPRETER = _Interpreter(Expressions.DIALECT, {}, evaluated=EVALUATED)
OfAny: F.Evaluator = INTERPRETER
"""The value of a TypeScript5 term: a literal's value; any other kind is refused by name."""
