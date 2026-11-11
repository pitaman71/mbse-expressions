"""The C Types dialect, `Expressions.C.Types`, of the C family: C's type names, a grammar of their own (ISO/IEC 9899, 6.7.7
in C11, "Type names"). `install` adds its union of its kinds to the framework's terms; `define` writes its dialect's
data. A skeleton, its kinds to come (the dialects proposal, Retrofit's design)."""

from . import Expressions
from .Expressions import define, install

__all__ = ["Expressions", "define", "install"]
