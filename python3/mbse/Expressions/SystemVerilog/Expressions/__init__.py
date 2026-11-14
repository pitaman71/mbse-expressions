"""The SystemVerilog dialect: every expression of SystemVerilog, IEEE 1800-2005 to 1800-2023, Verilog its subset, as
mbse-programs has them, over its 4-state and 2-state vectors and reals, sized and evaluated by IEEE 1800's rules, and
rendered as SystemVerilog source, with the terms of its family's sublanguages' dialects (`Types`, `Patterns`,
`Assertions`, `Constraints`, `Preprocessor`). `install` adds its kinds to the framework's terms; `define` writes its
domains, IEEE 1800's built-in types, which its evaluation, inference and validation read through a term's holder, and
the editions it covers. See mbse-basis
[CAP-231: the SystemVerilog expression dialect, complete](mbse:mbse-basis/docs/capabilities/CAP-231.md)."""

from . import Domains, Expressions, Simplifiers, Text
from .Expressions import define, install

__all__ = ["Domains", "Expressions", "Simplifiers", "Text", "define", "install"]
