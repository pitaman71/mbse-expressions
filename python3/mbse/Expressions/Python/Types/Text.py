"""Text of the Python Types dialect: how its kinds are written, as mbse-programs' printer writes type parameters
(`mbse:mbse-programs/python3/mbse/Programs/Python/_Printer.py`, `type_var`), which the family's printer
(`Python3.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`, giving its
text and its precedence, a primary's. A type variable is written `T`, `T: bound`, `T = default` or `T: bound = default`,
a parameter specification `**P` and a type variable tuple `*Ts`, each with its default; a bound or a default is written
as an expression where an element of a display stands, a type expression of `Python3`'s kinds as `Python3` writes it.
`ToText` writes a term of the family, as `Python3.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Python3 import Text as X
from ..Python3.Text import ToText
from . import Expressions as T

__all__ = ["ToText", "TEXTS"]


def _parameter(star: str) -> Callable[[Any, F.Node], tuple[str, int]]:
    """A type parameter's writer: its stars, its name, its bound, where it has one, and its default, where it has one."""

    def write(p: Any, node: F.Node) -> tuple[str, int]:
        bound, default = node.slots.get("bound"), node.slots["default_value"]
        text = star + node.attributes.get("name", "")
        text += "" if bound is None else f": {p.element(bound)}"
        return text + ("" if default is None else f" = {p.element(default)}"), X._PRIMARY

    return write


TEXTS: dict[str, Callable[[Any, F.Node], tuple[str, int]]] = {
    T.TYPEVAR: _parameter(""),
    T.PARAMSPEC: _parameter("**"),
    T.TYPEVARTUPLE: _parameter("*"),
}
"""How each of its kinds is written, and its precedence."""
