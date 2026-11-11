"""Text of the SystemVerilog Assertions dialect: how its kinds are written, as mbse-programs' printer writes them
(`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`), which the family's printer
(`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`;
`PRECEDENCE`, each kind's precedence where it is not a primary's; and `INLINE`, how `randomize() with` writes its kinds
among its constraints where not as written. `ToText` writes a term of the family, as `Expressions.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Text as X
from ..Expressions.Text import ToText

__all__ = ["ToText", "TEXTS", "PRECEDENCE", "INLINE"]

TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {}
"""How each of its kinds is written."""

PRECEDENCE: dict[str, Any] = {}
"""Each of its kinds' precedence, where it is not a primary's."""

INLINE: dict[str, Callable[[X.Printer, F.Node, str], str]] = {}
"""How `randomize() with` writes its kinds among its constraints, where not as written."""
