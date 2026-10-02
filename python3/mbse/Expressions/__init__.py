"""mbse-expressions: rules, predicates and constraints as neutral, language-independent data.

Expression languages (dialects) that are serializable, traversable, validatable, evaluatable and translatable into
each other. See docs/EXPRESSIONS.md at https://github.com/pitaman71/mbse-expressions.

For AI agents: read `skill/SKILL.md` next to this file first. It says when to use this package, the rules that prevent
most mistakes, and which reference to load for a task.

`Expressions`, `Evaluators` and `Domains` are the Basic dialect's, the neutral form of every rule. The
framework is `mbse.Expressions.Framework`, the dialects are under `mbse.Expressions.Dialects`, and the translators
between them under `mbse.Expressions.Translators`. `register(store)` registers the meta-schemas of every dialect
imported so far in an mbse-schemas store."""

from .Dialects.Basic import Domains, Evaluators, Expressions, Partials
from .Framework.Terms import register

__all__ = ["Expressions", "Evaluators", "Domains", "Partials", "register"]
