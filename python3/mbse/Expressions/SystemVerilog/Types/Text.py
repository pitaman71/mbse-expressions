"""Text of the SystemVerilog Types dialect: how its kinds are written, as mbse-programs' printer writes data types
(`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`, `type_text`), which the family's printer
(`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`;
`PRECEDENCE`, none but a primary's; and `INLINE`, none. A structure or an enumeration is written on one line, its members
data; a dimension as `[7:0]`, `[8]`, `[]`, `[int]`, `[*]`, `[$]` or `[$:8]`. `ToText` writes a term of the family, as
`Expressions.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Text as X
from ..Expressions.Text import ToText
from . import Expressions as T

__all__ = ["ToText", "TEXTS", "PRECEDENCE", "INLINE"]


def _nodes(value: Any) -> tuple[F.Node, ...]:
    return () if value is None else value if isinstance(value, tuple) else (value,)


def _join(*parts: Any) -> str:
    return " ".join(p for p in parts if p)


def dimension(p: X.Printer, node: F.Node) -> str:
    """A dimension: `[left:right]`, `[size]`, `[]`, `[type]` or `[*]`, `[$]` or `[$:bound]`."""
    if node.kind == "rangedimension":
        return f"[{p.text(node.slots['left'])}:{p.text(node.slots['right'])}]"
    if node.kind == "sizedimension":
        return f"[{p.text(node.slots['size'])}]"
    if node.kind == "unsizeddimension":
        return "[]"
    if node.kind == "associativedimension":
        return f"[{p.text(node.slots['type']) if node.slots['type'] is not None else '*'}]"
    return f"[${':' + p.text(node.slots['bound']) if node.slots['bound'] is not None else ''}]"  # a queue's


def _dimensions(p: X.Printer, node: F.Node) -> str:
    return "".join(dimension(p, d) for d in _nodes(node.helpers.get("dimensions")))


def _sized(p: X.Printer, node: F.Node, head: str) -> str:
    dimensions = _dimensions(p, node)
    return head + (f" {dimensions}" if dimensions else "")


def _declarators(p: X.Printer, declarators: Any) -> str:
    return ", ".join(p.spelling(d.helpers["name"]) + _dimensions(p, d)
                     + (f" = {p.text(d.slots['value'])}" if d.slots["value"] is not None else "") for d in declarators)


def _member(p: X.Printer, node: F.Node) -> str:
    """A structure's member: its attributes, `rand` or `randc`, its type and its declarators."""
    random = f"{node.attributes['random']} " if node.attributes.get("random") else ""
    attributes = _nodes(node.helpers.get("attributes"))
    written = f"{p.attribute_text(attributes)} " if attributes else ""
    return f"{written}{random}{p.text(node.slots['type'])} {_declarators(p, _nodes(node.helpers.get('declarators')))}"


def _enum_member(p: X.Printer, node: F.Node) -> str:
    """An enumeration's member: `name`, `name[left]` or `name[left:right]`, and its value."""
    numbers = ""
    if node.slots["left"] is not None:
        right = f":{p.text(node.slots['right'])}" if node.slots["right"] is not None else ""
        numbers = f"[{p.text(node.slots['left'])}{right}]"
    value = f" = {p.text(node.slots['value'])}" if node.slots["value"] is not None else ""
    return p.spelling(node.helpers["name"]) + numbers + value


def _struct(p: X.Printer, node: F.Node) -> str:
    head = _join(node.attributes.get("keyword"), node.attributes.get("qualifier"),
                 "packed" if node.attributes.get("packed") else None, node.attributes.get("signing"))
    members = " ".join(f"{_member(p, m)};" for m in _nodes(node.helpers.get("members")))
    return _sized(p, node, f"{head} {{ {members} }}")


def _enum(p: X.Printer, node: F.Node) -> str:
    base = f" {p.text(node.slots['base'])}" if node.slots["base"] is not None else ""
    members = ", ".join(_enum_member(p, m) for m in _nodes(node.helpers.get("members")))
    return _sized(p, node, f"enum{base} {{{members}}}")


def _virtual(p: X.Printer, node: F.Node) -> str:
    head = "virtual interface" if node.attributes.get("interface_keyword") else "virtual"
    modport = f".{p.spelling(node.helpers['modport'])}" if "modport" in node.helpers else ""
    return f"{head} {p.spelling(node.helpers['interface'])}{p.parameter_values(node.many)}{modport}"


TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {
    T.INTEGERVECTORTYPE: lambda p, n: _sized(p, n, _join(n.attributes.get("keyword"), n.attributes.get("signing"))),
    T.INTEGERATOMTYPE: lambda p, n: _join(n.attributes.get("keyword"), n.attributes.get("signing")),
    T.NONINTEGERTYPE: lambda p, n: n.attributes["keyword"],
    T.KEYWORDTYPE: lambda p, n: n.attributes["keyword"],
    T.NAMEDTYPE: lambda p, n: _sized(p, n, p.name(n.helpers["name"])),
    T.VIRTUALINTERFACETYPE: _virtual,
    T.IMPLICITTYPE: lambda p, n: _join(n.attributes.get("signing"), _dimensions(p, n)),
    T.STRUCTTYPE: _struct,
    T.ENUMTYPE: _enum,
    T.TYPEREFERENCE: lambda p, n: f"type({p.text(n.slots['operand'])})",
}
"""How each of its kinds is written."""

PRECEDENCE: dict[str, Any] = {}
"""Each of its kinds' precedence, where it is not a primary's: none."""

INLINE: dict[str, Callable[[X.Printer, F.Node, str], str]] = {}
"""How `randomize() with` writes its kinds among its constraints, where not as written: none."""
