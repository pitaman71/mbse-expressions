"""The Cpp dialect: every expression of C++, C++17 to C++23, as mbse-programs has them, with the sublanguages they hold,
rendered as C++ source and, for its arithmetic types, simplified by its rules under the ABI its holder names. It defines
its own copies of the kinds it shares with the C dialect, and shares with it the code that reads its types (`Domains`,
C's), their folding rules and their source text. `install` adds its union to the framework's terms; `define` writes its
domains, the types C++'s standard fixes, which it reads with its holder's ABI dialect's. See mbse-basis
[CAP-230: the C++ expression dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md)."""

from ...C.Expressions import Domains
from . import Expressions, Simplifiers, Text
from .Expressions import define, install

__all__ = ["Domains", "Expressions", "Simplifiers", "Text", "define", "install"]
