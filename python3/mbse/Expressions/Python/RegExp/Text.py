"""Text of the Python RegExp dialect: how its kinds are written, as `re`'s syntax, which the family's printer
(`Python3.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`, giving its
text and its precedence.

A regular expression's structure is its kinds', its groups written as kinds, so it needs no parentheses of the
printer's: every kind is written closed, at the family's level of a primary (`CLOSED`). Alternatives are joined by `|`,
an alternative's elements written one after another; a quantifier's bounds in their shortest form (`*`, `+`, `?`,
`{m}`, `{m,}`, `{m,n}`), followed by `?` where it is lazy and `+` where it is possessive; a character in its spelling
as written, else in its default spelling (`Expressions.spelling`), escaped as where it stands, within a class or not;
and a numbered backreference followed by a digit within a group of its own (`(?:\\1)0`), which `\\10` would otherwise
read as another group. `ToText` writes a term of the family, as `Python3.Text.ToText` does."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Python3.Text import ToText
from . import Expressions as R

__all__ = ["ToText", "TEXTS", "CLOSED"]

CLOSED = 17
"""Every kind's precedence, on the family's scale: a primary's (`Python3.Text`'s), so that nothing parenthesizes it."""

_DIGITS = tuple("0123456789")
_SETS = {"any": ".", "digit": "\\d", "space": "\\s", "word": "\\w"}
_ASSERTIONS = {"start": "^", "end": "$", "stringstart": "\\A", "stringend": "\\Z", "word": "\\b"}
_LOOKAROUNDS = {("lookahead", False): "(?=", ("lookahead", True): "(?!", ("lookbehind", False): "(?<=",
                ("lookbehind", True): "(?<!"}


def _alternatives(p: Any, node: F.Node) -> str:
    """A kind's alternatives, joined by `|`."""
    return "|".join(p.text(alternative)[0] for alternative in node.many)


def _character(node: F.Node, within: bool) -> str:
    """A character, in its spelling as written, else in its default spelling where it stands."""
    return node.attributes["raw"] if "raw" in node.attributes else R.spelling(node.attributes["value"], within)


def _member(p: Any, item: Any) -> str:
    """An element of a class: a character and a range's ends spelled as within a class, any other as it is written."""
    tag, record = F.kind_of(item)
    if tag == R.CHARACTER:
        return _character(F.node(tag, record), True)
    if tag == R.CHARACTERCLASSRANGE:
        node = F.node(tag, record)
        return f"{_member(p, node.subterms['min'])}-{_member(p, node.subterms['max'])}"
    return p.text(item)[0]


def _elements(p: Any, node: F.Node) -> tuple[str, int]:
    """An alternative's elements, one after another; a numbered backreference followed by a digit within a group."""
    written = [p.text(element)[0] for element in node.many]
    for i, element in enumerate(node.many[:-1]):
        tag, record = F.kind_of(element)
        if tag == R.BACKREFERENCE and type(F.attributes_of(record).get("ref")) is int and written[i + 1][:1] in _DIGITS:
            written[i] = f"(?:{written[i]})"
    return "".join(written), CLOSED


def _quantifier(p: Any, node: F.Node) -> tuple[str, int]:
    """Its element, then its bounds in their shortest form, then `?` where it is lazy and `+` where possessive."""
    least, most = node.attributes["min"], node.attributes.get("max")
    bounds = {(0, None): "*", (1, None): "+", (0, 1): "?"}.get((least, most))
    if bounds is None:
        bounds = "{" + (f"{least}" if most == least else f"{least}," if most is None else f"{least},{most}") + "}"
    lazy = "?" if node.attributes.get("greedy") is False else "+" if node.attributes.get("possessive") is True else ""
    return p.text(node.subterms["element"])[0] + bounds + lazy, CLOSED


def _class(p: Any, node: F.Node) -> tuple[str, int]:
    """`[...]`, `[^...]`."""
    negate = "^" if node.attributes.get("negate") is True else ""
    return f"[{negate}{''.join(_member(p, item) for item in node.many)}]", CLOSED


def _set(p: Any, node: F.Node) -> tuple[str, int]:
    """`.`, `\\d`, `\\s`, `\\w`, and the negations in capitals."""
    written = _SETS[node.attributes["setKind"]]
    return (written.upper() if node.attributes.get("negate") is True else written), CLOSED


def _assertion(p: Any, node: F.Node) -> tuple[str, int]:
    """`^`, `$`, `\\A`, `\\Z`, `\\b`, `\\B`, and the lookarounds around their alternatives."""
    kind, negate = node.attributes["assertionKind"], node.attributes.get("negate") is True
    if kind in R.LOOKAROUNDS:
        return f"{_LOOKAROUNDS[(kind, negate)]}{_alternatives(p, node)})", CLOSED
    written = _ASSERTIONS[kind]
    return (written.upper() if negate else written), CLOSED


def _reference(node: F.Node) -> str:
    """A group's number, or its name."""
    return f"{node.attributes['ref']}"


def _backreference(p: Any, node: F.Node) -> tuple[str, int]:
    """`\\1`, `(?P=name)`."""
    ref = node.attributes["ref"]
    return (f"\\{ref}" if type(ref) is int else f"(?P={ref})"), CLOSED


def _conditional(p: Any, node: F.Node) -> tuple[str, int]:
    """`(?(1)yes|no)`, `(?(name)yes)`."""
    no = node.subterms["no"]
    alternatives = p.text(node.subterms["yes"])[0] + ("" if no is None else "|" + p.text(no)[0])
    return f"(?({_reference(node)}){alternatives})", CLOSED


def _flags(p: Any, node: F.Node) -> tuple[str, int]:
    """A global flags, `(?aiLmsux)`, or a scoped one around its alternatives, `(?a-i:...)`."""
    add, remove = node.attributes.get("add", ""), node.attributes.get("remove", "")
    if not node.many:
        return f"(?{add})", CLOSED
    return f"(?{add}{'-' + remove if remove else ''}:{_alternatives(p, node)})", CLOSED


def _capturing(p: Any, node: F.Node) -> tuple[str, int]:
    """`(...)`, `(?P<name>...)`."""
    name = f"?P<{node.attributes['name']}>" if "name" in node.attributes else ""
    return f"({name}{_alternatives(p, node)})", CLOSED


TEXTS: dict[str, Callable[[Any, F.Node], tuple[str, int]]] = {
    R.PATTERN: lambda p, n: (_alternatives(p, n), CLOSED),
    R.ALTERNATIVE: _elements,
    R.GROUP: lambda p, n: (f"(?:{_alternatives(p, n)})", CLOSED),
    R.CAPTURINGGROUP: _capturing,
    R.QUANTIFIER: _quantifier,
    R.CHARACTERCLASS: _class,
    R.CHARACTERCLASSRANGE: lambda p, n: (f"{_member(p, n.subterms['min'])}-{_member(p, n.subterms['max'])}", CLOSED),
    R.CHARACTERSET: _set,
    R.CHARACTER: lambda p, n: (_character(n, False), CLOSED),
    R.ASSERTION: _assertion,
    R.BACKREFERENCE: _backreference,
    R.CONDITIONAL: _conditional,
    R.ATOMICGROUP: lambda p, n: (f"(?>{_alternatives(p, n)})", CLOSED),
    R.FLAGS: _flags,
    R.COMMENT: lambda p, n: (f"(?#{n.attributes.get('text', '')})", CLOSED),
}
"""How each of its kinds is written, and its precedence."""
