"""The Python Patterns dialect, `Expressions.Python.Patterns`, of the Python family: the patterns of Python's `match`
statement (the Language Reference, 8.6.4). `install` adds its union of its kinds to the framework's terms; `define`
writes the versions it covers."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
