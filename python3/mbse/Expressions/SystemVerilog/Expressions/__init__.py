"""The SystemVerilog dialect: expressions and constraints of SystemVerilog over its 4-state and 2-state vectors and
reals, sized and evaluated by IEEE 1800's rules, and rendered as SystemVerilog source. `install` adds its kinds to the
framework's terms; `define` writes its domains, IEEE 1800's built-in types, which its evaluation, inference and
validation read through a term's holder. See mbse-basis
[CAP-100: six languages' expression dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md)."""

from . import Domains, Evaluators, Expressions, Text
from .Expressions import define, install

__all__ = ["Domains", "Evaluators", "Expressions", "Text", "define", "install"]
