"""The pairwise translators between the dialects, one module per pair, each with its `TRANSLATOR`. `between(a, b)`
finds the translator from dialect `a` to dialect `b`, whichever way round its module declares it. `Patterns_Python3.NUMPY`
is a second translator between Patterns and Python3, which writes NumPy's functions. Patterns <-> C and Patterns <->
Cpp are one rule set, `Patterns_C.RULES`, applied to each. See `mbse.Expressions.Framework.Translators`."""

from __future__ import annotations

from mbse.Expressions.Framework.Terms import Dialect
from mbse.Expressions.Framework.Translators import Pairwise

from . import (Excel_Latex, Matlab_Excel, Matlab_Latex, Patterns_C, Patterns_Cpp, Patterns_Excel, Patterns_Latex,
               Patterns_Matlab, Patterns_Python3, Patterns_SystemVerilog, Python3_Excel, Python3_Latex, Python3_Matlab)

__all__ = ["between", "TRANSLATORS"]

TRANSLATORS: list[Pairwise] = [module.TRANSLATOR for module in (
    Patterns_Python3, Patterns_Matlab, Patterns_Excel, Patterns_Latex, Patterns_C, Patterns_Cpp, Patterns_SystemVerilog,
    Python3_Matlab, Python3_Excel, Python3_Latex, Matlab_Excel, Matlab_Latex, Excel_Latex)]
"""Every pairwise translator."""


def between(source: Dialect, target: Dialect) -> Pairwise:
    """The translator whose `forward` translates from `source` to `target`."""
    for translator in TRANSLATORS:
        if translator.left() is source and translator.right() is target:
            return translator
        if translator.left() is target and translator.right() is source:
            return translator.inverse()
    raise LookupError(f"no translator between {source.name()} and {target.name()}")
