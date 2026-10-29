"""The Ccpp dialect: expressions of C and C++ over their arithmetic types, under the LP64 data model, rendered as C
source and evaluated by C's rules. `install` adds its kinds to the framework's terms. See docs/EXPRESSIONS.md."""

from . import Domains, Evaluators, Expressions, Text
from .Expressions import install

__all__ = ["Domains", "Evaluators", "Expressions", "Text", "install"]
