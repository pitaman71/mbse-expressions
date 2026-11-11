"""Text of the SystemVerilog Preprocessor dialect: how its kinds are written, as mbse-programs' printer writes them
(`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`), which the family's printer
(`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`;
`PRECEDENCE`, none but a primary's; and `INLINE`, how `randomize() with` writes its kinds among its constraints, where
not as written. `ToText` writes a term of the family, as `Expressions.Text.ToText` does.

A macro usage is written `` `name `` or `` `name(arguments) ``; a directive at the start of its line, as mbse-programs'
layout has it: a conditional directive one line for each of its `` `ifdef ``, `` `elsif ``, `` `else `` and
`` `endif ``, each branch's items on the lines between, as written, an expression held as a constraint ended by `;`;
disabled text and any other directive as written. A comment is `//text` or `/*text*/`. Among the constraints of
`randomize() with`, which are written on one line, a line comment, or a directive, ends its line (`INLINE`)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Expressions as E, Text as X
from ..Expressions.Text import ToText
from . import Expressions as P

__all__ = ["ToText", "TEXTS", "PRECEDENCE", "INLINE"]

_HELD = (*E.TAGS, "distexpression")
"""The kinds an expression held as a constraint is, ended by `;` among a branch's items: `Expressions`' and
`Constraints`' `distexpression`, as mbse-programs writes an `ExpressionConstraint` of one."""


def _condition(p: X.Printer, node: F.Node, kind: str) -> str:
    """A conditional directive's macro's name, or its condition."""
    if "name" in node.helpers:
        return p.spelling(node.helpers["name"])
    if node.slots["condition"] is None:
        raise ValueError(f"SystemVerilog Preprocessor {kind} has no name or condition to print")
    return p.text(node.slots["condition"])


def _branch(p: X.Printer, items: tuple[Any, ...]) -> list[str]:
    """A branch's items, each on its own lines, as written: an expression held as a constraint ended by `;`."""
    lines: list[str] = []
    for item in items:
        written = p.text(item)
        lines += (written + ";" if p.node(item).kind in _HELD else written).split("\n")
    return lines


def _ifdef(p: X.Printer, n: F.Node) -> str:
    """`` `ifdef name ``, or `` `ifndef ``, its items, each `` `elsif `` and its items, `` `else `` and its items, and
    `` `endif ``, each on its own line."""
    lines = [f"`{'ifndef' if n.attributes.get('negated') else 'ifdef'} {_condition(p, n, P.IFDEFDIRECTIVE)}",
             *_branch(p, n.many)]
    for branch in n.helpers.get("branches", ()):
        lines += [f"`elsif {_condition(p, branch, 'elsifdirective')}", *_branch(p, branch.many)]
    if "alternative" in n.helpers:
        lines += ["`else", *_branch(p, n.helpers["alternative"].many)]
    return "\n".join([*lines, "`endif"])


def _define(p: X.Printer, n: F.Node) -> str:
    """`` `define name body ``, or `` `define name(parameters) body `` where function-like."""
    parameters = ""
    if n.attributes.get("function_like"):
        parameters = "(" + ", ".join(p.spelling(i) for i in n.helpers.get("parameters", ())) + ")"
    body = n.attributes.get("body")
    return f"`define {p.spelling(n.helpers['name'])}{parameters}" + (f" {body}" if body else "")


TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {
    P.MACROUSAGE: lambda p, n: f"`{p.spelling(n.helpers['name'])}" + (
        f"({n.attributes['arguments']})" if "arguments" in n.attributes else ""),
    P.INCLUDEDIRECTIVE: lambda p, n: (f"`include <{n.attributes['path']}>" if n.attributes.get("system")
                                      else f"`include \"{n.attributes['path']}\""),
    P.DEFINEDIRECTIVE: _define,
    P.UNDEFDIRECTIVE: lambda p, n: f"`undef {p.spelling(n.helpers['name'])}",
    P.TIMESCALEDIRECTIVE: lambda p, n: f"`timescale {n.attributes['unit']} / {n.attributes['precision']}",
    P.DEFAULTNETTYPEDIRECTIVE: lambda p, n: f"`default_nettype {n.attributes['net_type']}",
    P.IFDEFDIRECTIVE: _ifdef,
    P.DISABLEDTEXT: lambda p, n: n.attributes["text"],
    P.OTHERDIRECTIVE: lambda p, n: n.attributes["text"],
    P.COMMENT: lambda p, n: (f"/*{n.attributes.get('text', '')}*/" if n.attributes.get("block")
                             else f"//{n.attributes.get('text', '')}"),
}
"""How each of its kinds is written."""

PRECEDENCE: dict[str, Any] = {}
"""Each of its kinds' precedence, where it is not a primary's: none."""

INLINE: dict[str, Callable[[X.Printer, F.Node, str], str]] = {
    **{tag: lambda p, n, written: "\n" + written + "\n" for tag in P.DIRECTIVES},
    P.COMMENT: lambda p, n, written: written + ("" if n.attributes.get("block") else "\n"),
}
"""How `randomize() with` writes its kinds among its constraints, where not as written: a directive on lines of its
own, and a line comment ending its line."""
