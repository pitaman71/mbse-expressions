"""The C dialect: every expression of C, C11 to C23, as mbse-programs has them, with the type names they hold, rendered
as C source and, for its arithmetic types under the LP64 data model, evaluated by C's rules. `install` adds its union
to the framework's terms; `Cpp`, the C++ dialect, defines its own copies of the kinds they share, and shares the code
that reads and writes them. See mbse-basis
[CAP-229: the C expression dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md) and
[CAP-100: six languages' expression dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md)."""

from . import Domains, Evaluators, Expressions, Text
from .Expressions import install

__all__ = ["Domains", "Evaluators", "Expressions", "Text", "install"]
