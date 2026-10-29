"""The SystemVerilog dialect: expressions and constraints of SystemVerilog over its 4-state and 2-state vectors and
reals, sized and evaluated by IEEE 1800's rules, and rendered as SystemVerilog source. `install` adds its kinds to the
framework's terms. See docs/EXPRESSIONS.md."""

from . import Domains, Evaluators, Expressions, Text
from .Expressions import install

__all__ = ["Domains", "Evaluators", "Expressions", "Text", "install"]
