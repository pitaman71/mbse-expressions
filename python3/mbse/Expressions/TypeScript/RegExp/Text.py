"""Text of the TypeScript RegExp dialect: how its kinds are written, as ECMA-262's pattern grammar spells them (22.2.1),
which the family's printer (`TypeScript5.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and
its `Terms.Node`. A literal is written `/pattern/flags`; a node with a spelling, regexpp's `raw` (a character's, a
character set's, a backreference's, a literal's or a modifiers' flags), as written; a quantifier's as written where its
spelling begins with its element's text, else in its shortest form (`*`, `+`, `?`, `{n}`, `{n,}`, `{n,m}`, a lazy one
ending `?`). A character with no spelling is written as itself, but a syntax character (`^$\\.*+?()[]{}|`) or `/`, and
in a class `-` too, escaped by `\\`, and a control, a line terminator or a lone surrogate as `\\t`, `\\n`, `\\v`, `\\f`,
`\\r`, `\\xHH` or `\\uHHHH` *(agent)*; flags with no spelling in the order `RegExp.prototype.flags` writes them, a
modifiers' as ECMA-262 lists them (`ims`). `ToText` writes a term of the family, as `TypeScript5.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..TypeScript5 import Text as X
from ..TypeScript5.Text import ToText
from . import Expressions as R

__all__ = ["ToText", "TEXTS", "character"]

SYNTAX = "^$\\.*+?()[]{}|/"
"""The characters a pattern escapes: ECMA-262's syntax characters, and `/`, which would end the literal."""

_CONTROLS = {9: "\\t", 10: "\\n", 11: "\\v", 12: "\\f", 13: "\\r"}


def character(value: int, in_class: bool = False) -> str:
    """A character's default spelling, of its code point: itself, a syntax character escaped (in a class, `-` too), and
    a control, a line terminator or a lone surrogate as an escape."""
    if value in _CONTROLS:
        return _CONTROLS[value]
    if value < 0x20 or value == 0x7F:
        return f"\\x{value:02X}"
    if value in (0x2028, 0x2029) or 0xD800 <= value <= 0xDFFF:
        return f"\\u{value:04X}"
    text = chr(value)
    return "\\" + text if text in SYNTAX or (in_class and text == "-") else text


def _in_class(p: X.Printer, value: Any) -> str:
    """A class's element: a character as a class spells it, anything else as the printer writes it."""
    node = p.node(value)
    if node.kind == R.CHARACTER and "raw" not in node.attributes and "value" in node.attributes:
        return character(node.attributes["value"], True)
    return p.text(node)


def _disjunction(p: X.Printer, node: F.Node) -> str:
    return "|".join(p.text(alternative) for alternative in node.lists["alternatives"])


def _letters(node: F.Node | None, allowed: tuple[tuple[str, str], ...]) -> str:
    """A flags helper's spelling: as written, else its letters in order."""
    if node is None:
        return ""
    if "raw" in node.attributes:
        return node.attributes["raw"]
    return "".join(letter for name, letter in allowed if node.attributes.get(name))


def _regexpliteral(p: X.Printer, node: F.Node) -> str:
    return f"/{p.text(node.slots['pattern'])}/{_letters(node.helpers.get('flags'), R.FLAGS)}"


def _alternative(p: X.Printer, node: F.Node) -> str:
    return "".join(p.text(element) for element in node.lists["elements"])


def _group(p: X.Printer, node: F.Node) -> str:
    modifiers = node.slots["modifiers"]
    return f"(?{'' if modifiers is None else p.text(modifiers)}:{_disjunction(p, node)})"


def _capturinggroup(p: X.Printer, node: F.Node) -> str:
    name = node.attributes.get("name")
    return f"({'' if name is None else f'?<{name}>'}{_disjunction(p, node)})"


def _quantifier(p: X.Printer, node: F.Node) -> str:
    element = p.text(node.slots["element"])
    raw = node.attributes.get("raw")
    if raw is not None and raw.startswith(element) and len(raw) > len(element):
        return raw
    low, high = node.attributes["min"], node.attributes.get("max")
    if high is None:
        suffix = "*" if low == 0 else "+" if low == 1 else f"{{{low},}}"
    else:
        suffix = "?" if (low, high) == (0, 1) else f"{{{low}}}" if low == high else f"{{{low},{high}}}"
    return element + suffix + ("" if node.attributes.get("greedy", True) else "?")


def _characterclass(p: X.Printer, node: F.Node) -> str:
    inner = "".join(_in_class(p, element) for element in node.lists["elements"])
    return f"[{'^' if node.attributes.get('negate') else ''}{inner}]"


def _characterclassrange(p: X.Printer, node: F.Node) -> str:
    return f"{_in_class(p, node.slots['min'])}-{_in_class(p, node.slots['max'])}"


def _operation(operator: str) -> Callable[[X.Printer, F.Node], str]:
    return lambda p, node: f"{_in_class(p, node.slots['left'])}{operator}{_in_class(p, node.slots['right'])}"


def _classstringdisjunction(p: X.Printer, node: F.Node) -> str:
    return "\\q{" + _disjunction(p, node) + "}"


def _stringalternative(p: X.Printer, node: F.Node) -> str:
    return "".join(_in_class(p, element) for element in node.lists["elements"])


def _expressioncharacterclass(p: X.Printer, node: F.Node) -> str:
    return f"[{'^' if node.attributes.get('negate') else ''}{p.text(node.slots['expression'])}]"


_SETS = {"digit": "d", "space": "s", "word": "w"}


def _characterset(p: X.Printer, node: F.Node) -> str:
    attributes = node.attributes
    if "raw" in attributes:
        return attributes["raw"]
    kind, negate = attributes["setKind"], attributes.get("negate")
    if kind == "any":
        return "."
    if kind in _SETS:
        return "\\" + (_SETS[kind].upper() if negate else _SETS[kind])
    value = attributes.get("value")
    return f"\\{'P' if negate else 'p'}{{{attributes['key']}{'' if value is None else '=' + value}}}"


def _character(p: X.Printer, node: F.Node) -> str:
    return node.attributes["raw"] if "raw" in node.attributes else character(node.attributes["value"])


_EDGES = {"start": "^", "end": "$"}


def _assertion(p: X.Printer, node: F.Node) -> str:
    kind, negate = node.attributes["assertionKind"], node.attributes.get("negate")
    if kind in _EDGES:
        return _EDGES[kind]
    if kind == "word":
        return "\\B" if negate else "\\b"
    behind = "<" if kind == "lookbehind" else ""
    return f"(?{behind}{'!' if negate else '='}{_disjunction(p, node)})"


def _backreference(p: X.Printer, node: F.Node) -> str:
    if "raw" in node.attributes:
        return node.attributes["raw"]
    ref = node.attributes["ref"]
    return f"\\k<{ref}>" if type(ref) is str else f"\\{ref}"


def _modifiers(p: X.Printer, node: F.Node) -> str:
    remove = node.helpers.get("remove")
    return _letters(node.helpers.get("add"), R.MODIFIERS) + ("" if remove is None else "-" + _letters(remove, R.MODIFIERS))


TEXTS: dict[str, Callable[[X.Printer, F.Node], str]] = {
    R.REGEXPLITERAL: _regexpliteral, R.PATTERN: _disjunction, R.ALTERNATIVE: _alternative, R.GROUP: _group,
    R.CAPTURINGGROUP: _capturinggroup, R.QUANTIFIER: _quantifier, R.CHARACTERCLASS: _characterclass,
    R.CHARACTERCLASSRANGE: _characterclassrange, R.CLASSINTERSECTION: _operation("&&"),
    R.CLASSSUBTRACTION: _operation("--"), R.CLASSSTRINGDISJUNCTION: _classstringdisjunction,
    R.STRINGALTERNATIVE: _stringalternative, R.EXPRESSIONCHARACTERCLASS: _expressioncharacterclass,
    R.CHARACTERSET: _characterset, R.CHARACTER: _character, R.ASSERTION: _assertion, R.BACKREFERENCE: _backreference,
    R.MODIFIERS_: _modifiers,
}
"""How each of its kinds is written, by its tag."""
