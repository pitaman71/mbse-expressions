"""The Cpp RegExp dialect, `Expressions.Cpp.RegExp`, of the Cpp family: the regular expressions `std::regex` reads
(ISO/IEC 14882, [re.grammar] and [re.synopt]), its own grammar, ECMAScript's, and a regex naming a POSIX grammar,
which holds a POSIX dialect's term. `install` adds its union of its kinds to the framework's terms; `define` writes the
editions it covers; `Text` writes its terms as a pattern of their grammar."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
