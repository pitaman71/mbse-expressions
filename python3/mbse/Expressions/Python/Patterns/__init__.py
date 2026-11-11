"""The Python Patterns dialect, `Expressions.Python.Patterns`, of the Python family: the patterns of Python's `match`
statement, a grammar of their own (the Language Reference, 8.6.4, "Patterns"). `install` adds its union of its kinds to
the framework's terms; `define` writes its dialect's data. A skeleton, its kinds to come (the dialects proposal,
Retrofit's design)."""

from . import Expressions
from .Expressions import define, install

__all__ = ["Expressions", "define", "install"]
