"""Expressions for mbse-schemas: expression languages (dialects) that are serializable, traversable, validatable,
evaluatable and translatable into each other. See docs/EXPRESSIONS.md.

`Expressions` and `Evaluators` are the Basic dialect's, the one mbse-schemas' union predicates are written in. The
framework is `mbse.Expressions.Framework`, the dialects are under `mbse.Expressions.Dialects`, and the translators
between them under `mbse.Expressions.Translators`."""

from .Dialects.Basic import Evaluators, Expressions

__all__ = ["Expressions", "Evaluators"]
