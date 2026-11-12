"""Text of the SystemVerilog Patterns dialect: how its kinds are written, as mbse-programs' printer writes patterns
(`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`, `pattern_text`), which the family's printer
(`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`;
`PRECEDENCE`, none but a primary's, since a pattern stands only where a pattern does, never an operand; and `INLINE`,
none. A variable is written `.name`, a wildcard `.*`, a tagged pattern `tagged member pattern`, a structure pattern
`'{a, b}` or `'{m: a, n: b}`, a parenthesized one `(pattern)`, and a constant pattern as the expression it is. `ToText`
writes a term of the family, as `Expressions.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Text as X
from ..Expressions.Text import ToText
from . import Expressions as P

__all__ = ["ToText", "TEXTS", "PRECEDENCE", "INLINE"]


def _tagged(p: X.Printer, node: F.Node) -> str:
    """`tagged member pattern`, or `tagged member` where it has no pattern."""
    pattern = f" {p.text(node.subterms['pattern'])}" if node.subterms["pattern"] is not None else ""
    return f"tagged {p.spelling(node.helpers['member'])}{pattern}"


TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {
    P.VARIABLEPATTERN: lambda p, n: f".{p.spelling(n.helpers['name'])}",
    P.WILDCARDPATTERN: lambda p, n: ".*",
    P.TAGGEDPATTERN: _tagged,
    P.STRUCTUREPATTERN: lambda p, n: "'{" + ", ".join(p.text(item) for item in n.many) + "}",
    P.PATTERNMEMBER: lambda p, n: f"{p.spelling(n.helpers['name'])}: {p.text(n.subterms['pattern'])}",
    P.PARENTHESIZEDPATTERN: lambda p, n: f"({p.text(n.subterms['pattern'])})",
}
"""How each of its kinds is written."""

PRECEDENCE: dict[str, Any] = {}
"""Each of its kinds' precedence, where it is not a primary's: none."""

INLINE: dict[str, Callable[[X.Printer, F.Node, str], str]] = {}
"""How `randomize() with` writes its kinds among its constraints, where not as written: none."""
