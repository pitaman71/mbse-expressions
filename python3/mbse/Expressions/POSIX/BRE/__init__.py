"""The POSIX BRE dialect, `Expressions.POSIX.BRE`, of the POSIX family: POSIX's basic regular expressions (IEEE Std
1003.1, XBD 9). `install` adds its union of its kinds to the framework's terms; `define` writes the editions it
covers; `Text` writes its terms as a BRE."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
