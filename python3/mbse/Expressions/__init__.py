"""mbse-expressions: constraints as neutral, language-independent data.

Expression languages (dialects) that are serializable, traversable, validatable, evaluatable and translatable into
each other. See mbse-basis [FEA-024: expressions as data](mbse:mbse-basis/docs/features/FEA-024.md).

For AI agents: read `skill/SKILL.md` next to this file first. It says when to use this package, the practices that
prevent most mistakes, and which reference to load for a task.

`Expressions`, `Evaluators`, `Domains` and `Partials` are the Patterns dialect's (formerly Basic), the neutral form of
every constraint. The framework is `mbse.Expressions.Framework`, each dialect is under its family, at
`mbse.Expressions.<Family>.<Dialect>` (`mbse.Expressions.Framework.Patterns`, `mbse.Expressions.Python.Python3`,
`mbse.Expressions.C.Expressions`), and the translators between them under `mbse.Expressions.Translators`. Expressions are stored in an mbse-schemas store, whose schemas
`Framework.install` and each dialect's `install` define (docs/proposals/port/API.md)."""

from . import Framework
from .Framework.Patterns import Domains, Evaluators, Expressions, Partials

__all__ = ["Framework", "Expressions", "Evaluators", "Domains", "Partials"]
