"""The POSIX ERE dialect, `Expressions.POSIX.ERE`, of the POSIX family: POSIX's extended regular expressions (IEEE Std
1003.1, XBD 9). `install` adds its union of its kinds to the framework's terms; `define` writes the editions it
covers; `Text` writes its terms as an ERE."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
