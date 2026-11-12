"""Text of the SystemVerilog Assertions dialect: how its kinds are written, as mbse-programs' printer writes sequences
and properties (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`, `property_text`), which the family's
printer (`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`;
`PRECEDENCE`, each kind's precedence where it is not a primary's; and `INLINE`, none.

Sequences and properties bind looser than any expression operator, by IEEE 1800's Table 16-3, as mbse-programs numbers
them (`REPEAT` to `TEMPORAL`, below 0): an operand is parenthesized where it binds less than its place needs, but one
that reaches as far right as it can (`always p`, `if (c) p`, `@(clk) p`, `accept_on (c) p`) needs none where nothing
follows it. A delay is written `##1`, `##n`, `##(n + 1)` or `##[1:3]`; a clock as `@(posedge clk iff en or negedge
rst)`, or `@(*)`; a property spec as `@(clock) disable iff (rst) property`. `ToText` writes a term of the family, as
`Expressions.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Expressions as E, Text as X
from ..Expressions.Text import ToText
from . import Expressions as A

__all__ = ["ToText", "TEXTS", "PRECEDENCE", "INLINE", "REPEAT", "DELAY", "THROUGHOUT", "WITHIN", "INTERSECT",
           "SEQUENCE_AND", "SEQUENCE_OR", "NOT", "PROPERTY_AND", "PROPERTY_OR", "IFF", "UNTIL", "IMPLICATION", "TEMPORAL"]

REPEAT, DELAY, THROUGHOUT, WITHIN, INTERSECT, SEQUENCE_AND, SEQUENCE_OR, NOT, PROPERTY_AND, PROPERTY_OR, IFF, UNTIL, \
    IMPLICATION, TEMPORAL = range(-1, -15, -1)
"""Precedence of sequence and property operators (IEEE 1800, Table 16-3), as mbse-programs' printer numbers it: below
every expression operator's, higher binding tighter."""

_SEQUENCE = {"throughout": THROUGHOUT, "within": WITHIN, "intersect": INTERSECT, "and": SEQUENCE_AND, "or": SEQUENCE_OR}
_PROPERTY = {"and": PROPERTY_AND, "or": PROPERTY_OR, "iff": IFF, "implies": UNTIL, "until": UNTIL, "s_until": UNTIL,
             "until_with": UNTIL, "s_until_with": UNTIL}
_RIGHT = {THROUGHOUT, IFF, UNTIL, IMPLICATION}
"""The right-associative levels of sequences and properties."""

_OWN = frozenset((*A.SEQUENCES, *A.PROPERTIES))
"""Its kinds that are sequences or properties, which its operators' operands are parenthesized among by precedence."""

_SIMPLE = (E.NAMEEXPRESSION, E.PARENTHESIZEDEXPRESSION, "macrousage")
"""The kinds a delay is written after `##` without parentheses, besides an integer (mbse-programs' `IntegerLiteral`)."""


def _nodes(value: Any) -> tuple[F.Node, ...]:
    return () if value is None else value if isinstance(value, tuple) else (value,)


def _level(p: X.Printer, node: F.Node) -> int:
    return p.precedence(node, "")


def part(p: X.Printer, value: Any, level: int, last: bool) -> str:
    """An operand of a sequence or property operator, in parentheses where it would bind otherwise; one that reaches as
    far right as it can needs none where nothing follows it (`last`). An expression is one as it is written."""
    node = p.node(value)
    if node.kind not in _OWN:
        return p.operand(value, level)
    precedence = _level(p, node)
    if precedence == TEMPORAL and last or precedence >= level:
        return _property(p, node, last)
    return f"({_property(p, node, True)})"


def cycles(p: X.Printer, value: Any) -> str:
    """A number of ticks or repetitions, or a cycle range, `low:high`."""
    node = p.node(value)
    return _cycle_range(p, node) if node.kind == A.CYCLERANGE else p.text(value)


def _cycle_range(p: X.Printer, node: F.Node) -> str:
    return f"{p.text(node.subterms['low'])}:{p.text(node.subterms['high'])}"


def _simple(node: F.Node) -> bool:
    """Whether a delay is written without parentheses: a name, a parenthesized expression, a macro usage, or an integer
    literal, an unsized one or a vector."""
    if node.kind == E.LITERAL:
        return type(node.attributes.get("value")) is int
    return node.kind in _SIMPLE or node.kind == E.CONSTANT and "bits" in node.attributes


def _delay_step(p: X.Printer, step: F.Node, last: bool) -> str:
    delay, sequence = step.many
    node = p.node(delay)
    if node.kind == A.CYCLERANGE:
        written = f"##[{_cycle_range(p, node)}]"
    else:
        written = f"##{p.text(delay)}" if _simple(node) else f"##({p.text(delay)})"
    return f"{written} {part(p, sequence, DELAY + 1, last)}"


def clock(p: X.Printer, node: F.Node) -> str:
    """An event control: `@(events)`, joined by `or`, each `edge expression iff condition`; `@(*)` without events."""
    events = _nodes(node.helpers.get("events"))
    if not events:
        return "@(*)"
    return "@(" + " or ".join(_event(p, e) for e in events) + ")"


def _event(p: X.Printer, node: F.Node) -> str:
    edge = node.attributes.get("edge")
    written = (f"{edge} " if edge else "") + p.text(node.subterms["expression"])
    return written + (f" iff {p.text(node.subterms['condition'])}" if node.subterms["condition"] is not None else "")


def _binary(p: X.Printer, node: F.Node, last: bool) -> str:
    level = _level(p, node)
    left, right = (level + 1, level) if level in _RIGHT else (level, level + 1)
    return (f"{part(p, node.subterms['left'], left, False)} {node.attributes['operator']} "
            f"{part(p, node.subterms['right'], right, last)}")


def _delay(p: X.Printer, node: F.Node, last: bool) -> str:
    first = f"{part(p, node.subterms['first'], DELAY, False)} " if node.subterms["first"] is not None else ""
    steps = _pairs(node.many)
    final = len(steps) - 1
    return first + " ".join(_delay_step(p, s, last and i == final) for i, s in enumerate(steps))


def _pairs(many: tuple[Any, ...]) -> list[F.Node]:
    """A delay sequence's steps, each a pair of its delay and its sequence, read as `Node`s of their two members."""
    return [F.Node("delaystep", many=many[i:i + 2]) for i in range(0, len(many), 2)]


def _matched(p: X.Printer, node: F.Node, head: str) -> str:
    """A sequence with its match items, in parentheses, or in `first_match`'s."""
    return f"{head}({', '.join([p.text(node.subterms['sequence']), *(p.text(i) for i in node.many)])})"


def _conditional(p: X.Printer, node: F.Node, last: bool) -> str:
    condition = p.text(node.subterms["condition"])
    if node.subterms["alternative"] is None:
        return f"if ({condition}) {part(p, node.subterms['consequence'], TEMPORAL, last)}"
    return (f"if ({condition}) {part(p, node.subterms['consequence'], TEMPORAL + 1, False)} "
            f"else {part(p, node.subterms['alternative'], TEMPORAL, last)}")


def _case(p: X.Printer, node: F.Node) -> str:
    items = " ".join((", ".join(p.text(e) for e in i.many) if i.many else "default") + f": {p.text(i.subterms['body'])};"
                     for i in _nodes(node.helpers.get("items")))
    return f"case ({p.text(node.subterms['expression'])}) {items} endcase"


def _unary(p: X.Printer, node: F.Node, last: bool) -> str:
    range_ = f" [{cycles(p, node.subterms['range'])}]" if node.subterms["range"] is not None else ""
    return f"{node.attributes['operator']}{range_} {part(p, node.subterms['operand'], _level(p, node), last)}"


_PROPERTIES: dict[str, Callable[[X.Printer, F.Node, bool], str]] = {
    A.DELAYSEQUENCE: _delay,
    A.REPETITIONSEQUENCE: lambda p, n, last: (f"{part(p, n.subterms['sequence'], REPEAT, False)}"
                                              f"[{n.attributes['operator']}{cycles(p, n.subterms['count'])}]"),
    A.BINARYSEQUENCE: _binary,
    A.PARENTHESIZEDSEQUENCE: lambda p, n, last: _matched(p, n, ""),
    A.FIRSTMATCHSEQUENCE: lambda p, n, last: _matched(p, n, "first_match"),
    A.CLOCKEDSEQUENCE: lambda p, n, last: (f"{clock(p, n.helpers['clock'])} "
                                           f"{part(p, n.subterms['sequence'], TEMPORAL, last)}"),
    A.IMPLICATIONPROPERTY: lambda p, n, last: (f"{part(p, n.subterms['antecedent'], IMPLICATION + 1, False)} "
                                               f"{n.attributes['operator']} "
                                               f"{part(p, n.subterms['consequent'], IMPLICATION, last)}"),
    A.BINARYPROPERTY: _binary,
    A.UNARYPROPERTY: _unary,
    A.STRENGTHPROPERTY: lambda p, n, last: f"{n.attributes['keyword']}({p.text(n.subterms['sequence'])})",
    A.ABORTPROPERTY: lambda p, n, last: (f"{n.attributes['keyword']} ({p.text(n.subterms['condition'])}) "
                                         f"{part(p, n.subterms['operand'], TEMPORAL, last)}"),
    A.CONDITIONALPROPERTY: _conditional,
    A.CASEPROPERTY: lambda p, n, last: _case(p, n),
    A.PARENTHESIZEDPROPERTY: lambda p, n, last: f"({p.text(n.subterms['property'])})",
    A.CLOCKEDPROPERTY: lambda p, n, last: (f"{clock(p, n.helpers['clock'])} "
                                           f"{part(p, n.subterms['property'], TEMPORAL, last)}"),
}
"""How each sequence and property is written, given whether nothing follows it."""


def _property(p: X.Printer, node: F.Node, last: bool) -> str:
    return _PROPERTIES[node.kind](p, node, last)


def _spec(p: X.Printer, node: F.Node) -> str:
    """`@(clock) disable iff (disable) property`."""
    parts = (clock(p, node.helpers["clock"]) if "clock" in node.helpers else None,
             f"disable iff ({p.text(node.subterms['disable'])})" if node.subterms["disable"] is not None else None,
             p.text(node.subterms["property"]))
    return " ".join(written for written in parts if written)


TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {
    **{tag: (lambda p, n: _property(p, n, True)) for tag in (*A.SEQUENCES, *A.PROPERTIES)},
    A.PROPERTYSPEC: _spec,
    A.CYCLERANGE: _cycle_range,
}
"""How each of its kinds is written."""

PRECEDENCE: dict[str, Any] = {
    A.REPETITIONSEQUENCE: REPEAT, A.DELAYSEQUENCE: DELAY,
    A.BINARYSEQUENCE: lambda node, written: _SEQUENCE[node.attributes["operator"]],
    A.BINARYPROPERTY: lambda node, written: _PROPERTY[node.attributes["operator"]],
    A.UNARYPROPERTY: lambda node, written: NOT if node.attributes["operator"] in ("not", "nexttime", "s_nexttime")
    else TEMPORAL,
    A.IMPLICATIONPROPERTY: IMPLICATION, A.CONDITIONALPROPERTY: TEMPORAL, A.ABORTPROPERTY: TEMPORAL,
    A.CLOCKEDPROPERTY: TEMPORAL, A.CLOCKEDSEQUENCE: TEMPORAL,
}
"""Each of its kinds' precedence, where it is not a primary's: a sequence's or a property's, below every expression's;
those that reach as far right as they can, `TEMPORAL`."""

INLINE: dict[str, Callable[[X.Printer, F.Node, str], str]] = {}
"""How `randomize() with` writes its kinds among its constraints, where not as written: none, as no constraint holds
them."""
