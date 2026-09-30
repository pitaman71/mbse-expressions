"""The pairwise translators between the dialects, one module per pair, each with its `TRANSLATOR`. `between(a, b)`
finds the translator from dialect `a` to dialect `b`, whichever way round its module declares it. See
`mbse.Expressions.Framework.Translators`."""

from __future__ import annotations

from mbse.Expressions.Framework.Expressions import Dialect
from mbse.Expressions.Framework.Translators import Pairwise

from . import Basic_Excel, Basic_Matlab, Basic_Numpy, Matlab_Excel, Numpy_Excel, Numpy_Matlab

__all__ = ["between", "TRANSLATORS"]

TRANSLATORS: list[Pairwise] = [module.TRANSLATOR for module in (
    Basic_Numpy, Basic_Matlab, Basic_Excel, Numpy_Matlab, Numpy_Excel, Matlab_Excel)]
"""Every pairwise translator."""


def between(source: Dialect, target: Dialect) -> Pairwise:
    """The translator whose `forward` translates from `source` to `target`."""
    for translator in TRANSLATORS:
        if translator.left() is source and translator.right() is target:
            return translator
        if translator.left() is target and translator.right() is source:
            return translator.inverse()
    raise LookupError(f"no translator between {source.name()} and {target.name()}")
