"""Text of the Python Patterns dialect: how its kinds are written, as mbse-programs' printer writes patterns
(`mbse:mbse-programs/python3/mbse/Programs/Python/_Printer.py`, `p`), which the family's printer (`Python3.Text.ToText`)
dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`, giving its text and its precedence.

A pattern's precedence is on the family's scale, so that the printer parenthesizes it as it does an expression: an open
sequence (`a, b`, without delimiters) the loosest, written bare only where a `case` holds it, as the root of its holder
is; then an `as` pattern, then an `or` pattern; every other pattern closed. So an open sequence is parenthesized
wherever a pattern nests in another, an `as` pattern where an `as` or an `or` pattern holds it, and an `or` pattern
where an `or` pattern holds it, as mbse-programs writes them: `[a, (b, c)]`, `(p as q) as r`, `(a | b) | c`. A value
pattern is written as the expression it is, a mapping's keys too, and a class pattern's class as a primary. `ToText`
writes a term of the family, as `Python3.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Python3 import Text as X
from ..Python3.Text import ToText
from . import Expressions as P

__all__ = ["ToText", "TEXTS", "OPEN", "AS", "OR", "CLOSED"]

OPEN, AS, OR, CLOSED = X._LAMBDA, X._IF, X._OR, X._PRIMARY
"""A pattern's precedence, loosest first, on the family's scale: an open sequence, an `as` pattern, an `or` pattern,
and a closed pattern, whose level is a primary's."""


def _items(p: Any, patterns: tuple[Any, ...]) -> list[str]:
    """Patterns where a sequence, a mapping or a class holds them: an open sequence parenthesized."""
    return [p.write(pattern, AS) for pattern in patterns]


def _sequence(p: Any, node: F.Node) -> tuple[str, int]:
    """`[a, b]`, `(a, b)`, `(a,)`, `()`, or an open sequence, `a, b`, its one pattern followed by a comma."""
    items = _items(p, node.many)
    delimiters = node.attributes.get("delimiters")
    if delimiters == "[]":
        return f"[{', '.join(items)}]", CLOSED
    text = ", ".join(items) + ("," if len(items) == 1 else "")
    if delimiters == "()" or not items:
        return f"({text})", CLOSED
    return text, OPEN


def _mapping(p: Any, node: F.Node) -> tuple[str, int]:
    """`{key: pattern, **rest}`."""
    items = [f"{p.text(key)[0]}: {pattern}" for key, pattern in zip(node.lists["keys"], _items(p, node.lists["patterns"]))]
    if "rest" in node.attributes:
        items.append(f"**{node.attributes['rest']}")
    return "{" + ", ".join(items) + "}", CLOSED


def _class(p: Any, node: F.Node) -> tuple[str, int]:
    """`cls(pattern, kwd_attr=kwd_pattern)`."""
    attrs = node.attributes["kwd_attrs"].values if "kwd_attrs" in node.attributes else ()
    arguments = _items(p, node.lists["patterns"])
    arguments += [f"{attr}={pattern}" for attr, pattern in zip(attrs, _items(p, node.lists["kwd_patterns"]))]
    return f"{p.write(node.slots['cls'], X._PRIMARY)}({', '.join(arguments)})", CLOSED


def _as(p: Any, node: F.Node) -> tuple[str, int]:
    """`pattern as name`; a capture `name`, or the wildcard `_`, without a pattern."""
    name = node.attributes.get("name", "_")
    if node.slots["pattern"] is None:
        return name, CLOSED
    return f"{p.write(node.slots['pattern'], OR)} as {name}", AS


TEXTS: dict[str, Callable[[Any, F.Node], tuple[str, int]]] = {
    P.MATCHVALUE: lambda p, n: (p.text(n.slots["value"])[0], CLOSED),
    P.MATCHSINGLETON: lambda p, n: (n.attributes["value"], CLOSED),
    P.MATCHSEQUENCE: _sequence,
    P.MATCHMAPPING: _mapping,
    P.MATCHCLASS: _class,
    P.MATCHSTAR: lambda p, n: (f"*{n.attributes.get('name', '_')}", CLOSED),
    P.MATCHAS: _as,
    P.MATCHOR: lambda p, n: (" | ".join(p.write(pattern, CLOSED) for pattern in n.many), OR),
}
"""How each of its kinds is written, and its precedence."""
