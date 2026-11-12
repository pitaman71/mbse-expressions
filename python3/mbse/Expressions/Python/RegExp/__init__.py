"""The Python RegExp dialect, `Expressions.Python.RegExp`, of the Python family: the regular expressions of Python's `re`
module (the Library Reference, "Regular Expression Syntax"). `install` adds its union of its kinds to the framework's
terms; `define` writes the versions it covers."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
