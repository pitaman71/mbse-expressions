"""mbse-expressions: constraints as neutral, language-independent data.

Expression languages (dialects) that are serializable, traversable, validatable, evaluatable and translatable into
each other. See mbse-basis [FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md).

For AI agents: read `skill/SKILL.md` next to this file first. It says when to use this package, the practices that
prevent most mistakes, and which reference to load for a task.

`Expressions`, `Evaluators` and `Domains` are the Basic dialect's, the neutral form of every constraint. The
framework is `mbse.Expressions.Framework`, the dialects are under `mbse.Expressions.Dialects`, and the translators
between them under `mbse.Expressions.Translators`. Expressions are stored in an mbse-schemas store, whose schemas
`Framework.install` and each dialect's `install` define (docs/proposals/port/API.md)."""

from . import Framework
from .Dialects.Basic import Domains, Evaluators, Expressions, Partials

__all__ = ["Framework", "Expressions", "Evaluators", "Domains", "Partials"]
