"""The Cpp Types dialect, `Expressions.Cpp.Types`, of the Cpp family: C++'s type-ids, a grammar of their own (ISO/IEC
14882, [dcl.name]), and an enumeration's enumerators. `install` adds its union of its kinds to the framework's terms;
`define` writes the editions it covers; `Text` writes its terms as C++ source."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
