"""The Cpp Types dialect, `Expressions.Cpp.Types`, of the Cpp family: C++'s type-ids, a grammar of their own (ISO/IEC
14882, [dcl.name]). `install` adds its union of its kinds to the framework's terms; `define` writes its dialect's data.
A skeleton, its kinds to come (the dialects proposal, Retrofit's design)."""

from . import Expressions
from .Expressions import define, install

__all__ = ["Expressions", "define", "install"]
