"""The C dialect: expressions of C, C11 to C23, over its arithmetic types, under the LP64 data model, rendered as C
source and evaluated by C's rules. `install` adds its union to the framework's terms; `Cpp`, the C++ dialect, shares
its kinds. See mbse-basis [CAP-100: six languages' expression dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md)
and [CAP-229: the C expression dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md)."""

from . import Domains, Evaluators, Expressions, Text
from .Expressions import install

__all__ = ["Domains", "Evaluators", "Expressions", "Text", "install"]
