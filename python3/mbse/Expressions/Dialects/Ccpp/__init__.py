"""The Ccpp dialect: expressions of C and C++ over their arithmetic types, under the LP64 data model, rendered as C
source and evaluated by C's rules. See docs/EXPRESSIONS.md."""

from . import Domains, Evaluators, Expressions, Text

__all__ = ["Domains", "Evaluators", "Expressions", "Text"]
