"""Text of the TypeScript Patterns dialect: how its kinds are written, as mbse-programs' printer writes patterns
(`mbse:mbse-programs/python3/mbse/Programs/TypeScript/_Printer.py`), which the family's printer
(`TypeScript5.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`. A
pattern is written with its decorators, its `?` and its annotation; an array pattern's hole as nothing, a last hole
kept. `ToText` writes a term of the family, as `TypeScript5.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable

from mbse.Expressions.Framework import Terms as F

from ..TypeScript5 import Text as X
from ..TypeScript5.Text import ToText

__all__ = ["ToText", "TEXTS"]


def _pattern(p: X.Printer, node: F.Node, inner: str) -> str:
    return p.decorators(node) + inner + ("?" if node.attributes.get("optional") else "") + p.annotation(node)


def _arraypattern(p: X.Printer, node: F.Node) -> str:
    return _pattern(p, node, p.elements(node.lists.get("elements", ())))


def _objectpattern(p: X.Printer, node: F.Node) -> str:
    properties = node.lists.get("properties", ())
    inner = "{}" if not properties else "{ " + ", ".join(p.text(prop) for prop in properties) + " }"
    return _pattern(p, node, inner)


def _assignmentpattern(p: X.Printer, node: F.Node) -> str:
    return _pattern(p, node, f"{p.text(node.slots['left'])} = {p.e(node.slots['right'], X.ASSIGN)}")


def _restelement(p: X.Printer, node: F.Node) -> str:
    return _pattern(p, node, "..." + p.text(node.slots["argument"]))


def _parameterproperty(p: X.Printer, node: F.Node) -> str:
    return p.decorators(node) + p.modifiers(node) + p.text(node.slots["parameter"])


TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {
    "arraypattern": _arraypattern, "objectpattern": _objectpattern, "assignmentpattern": _assignmentpattern,
    "restelement": _restelement, "tsparameterproperty": _parameterproperty,
}
"""How each of its kinds is written, by its tag."""
