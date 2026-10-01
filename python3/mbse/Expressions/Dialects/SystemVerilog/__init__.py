"""The SystemVerilog dialect: expressions and constraints of SystemVerilog over its 4-state and 2-state vectors and
reals, sized and evaluated by IEEE 1800's rules, and rendered as SystemVerilog source. See docs/EXPRESSIONS.md."""

from . import Domains, Evaluators, Expressions

__all__ = ["Domains", "Evaluators", "Expressions"]
