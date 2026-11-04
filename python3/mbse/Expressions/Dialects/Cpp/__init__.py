"""The Cpp dialect: every expression of C++, C++17 to C++23, as mbse-programs has them, with the sublanguages they hold,
rendered as C++ source and, for its arithmetic types under the LP64 data model, evaluated by its rules. It defines its
own copies of the kinds it shares with the C dialect, and shares with it their domains (`Domains`, C's), their
evaluation and their source text. `install` adds its union to the framework's terms. See mbse-basis
[CAP-230: the C++ expression dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md)."""

from ..C import Domains
from . import Evaluators, Expressions, Text
from .Expressions import install

__all__ = ["Domains", "Evaluators", "Expressions", "Text", "install"]
