"""Text of the SystemVerilog Constraints dialect: how its kinds are written, as mbse-programs' printer writes them
(`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`, `constraint_text` and `DistExpression`'s), which the
family's printer (`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its
`Terms.Node`; `PRECEDENCE`, a distribution's, a relational operator's; and `INLINE`, how `randomize() with` writes a
distribution held as a constraint, ended by `;`, as `Expressions`' kinds are. A constraint is written on one line, as
`randomize() with` writes its constraints, its block's items as the printer's `inline` writes them (`{ x > 0; y < 2; }`);
a constraint declaration, whose layout spans lines, is an item, mbse-programs'. `ToText` writes a term of the family,
as `Expressions.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Text as X
from ..Expressions.Text import IMPLY, RELATIONAL, ToText
from . import Expressions as C

__all__ = ["ToText", "TEXTS", "PRECEDENCE", "INLINE"]


def _nodes(value: Any) -> tuple[F.Node, ...]:
    return () if value is None else value if isinstance(value, tuple) else (value,)


def _conditional(p: X.Printer, node: F.Node) -> str:
    """`if (condition) consequence`, and ` else alternative` where it has one."""
    alternative = node.slots["alternative"]
    written = f" else {p.text(alternative)}" if alternative is not None else ""
    return f"if ({p.text(node.slots['condition'])}) {p.text(node.slots['consequence'])}{written}"


def _foreach(p: X.Printer, node: F.Node) -> str:
    """`foreach (array[variables]) body`, a dimension it skips written empty (`q[, j]`)."""
    variables = ", ".join("" if v.kind == "emptyargument" else p.spelling(v)
                          for v in _nodes(node.helpers.get("variables")))
    return f"foreach ({p.text(node.slots['value'])}[{variables}]) {p.text(node.slots['body'])}"


def _item(p: X.Printer, node: F.Node) -> str:
    """A distribution's item: its value, or `default`, and its operator and weight where it has them."""
    value = node.slots["value"]
    weight = f" {node.attributes['operator']} {p.text(node.slots['weight'])}" if "operator" in node.attributes else ""
    return ("default" if value is None else p.text(value)) + weight


def _dist(p: X.Printer, node: F.Node) -> str:
    """`value dist { items }`."""
    items = ", ".join(_item(p, i) for i in _nodes(node.helpers.get("items")))
    return f"{p.operand(node.slots['value'], RELATIONAL)} dist {{{items}}}"


TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {
    C.CONSTRAINTBLOCK: lambda p, n: p.inline(n.many),
    C.EXPRESSIONCONSTRAINT: lambda p, n: f"{'soft ' if n.attributes.get('soft') else ''}{p.text(n.slots['expression'])};",
    C.IMPLICATIONCONSTRAINT: lambda p, n: f"{p.operand(n.slots['condition'], IMPLY + 1)} -> {p.text(n.slots['body'])}",
    C.CONDITIONALCONSTRAINT: _conditional,
    C.FOREACHCONSTRAINT: _foreach,
    C.DISABLESOFTCONSTRAINT: lambda p, n: f"disable soft {p.text(n.slots['target'])};",
    C.UNIQUECONSTRAINT: lambda p, n: f"unique {{{', '.join(p.text(r) for r in n.many)}}};",
    C.DISTEXPRESSION: _dist,
}
"""How each of its kinds is written."""

PRECEDENCE: dict[str, Any] = {C.DISTEXPRESSION: RELATIONAL}
"""Each of its kinds' precedence, where it is not a primary's: a distribution's, as `inside`'s, a relational
operator's."""

INLINE: dict[str, Callable[[X.Printer, F.Node, str], str]] = {C.DISTEXPRESSION: lambda p, n, written: written + ";"}
"""How `randomize() with` writes its kinds among its constraints, where not as written: a distribution held as a
constraint, ended by `;`, as `Expressions`' kinds are."""
