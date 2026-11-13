"""Text of the Cpp RegExp dialect: `ToText(expression)` is a term of Cpp RegExp (or anything `Terms.term` reads one from)
as the pattern `std::regex` is given, in its grammar: a `regex`'s, by its flags, else ECMAScript's, the default
([re.synopt]). A regex is written as its pattern, its flags being `basic_regex`'s constructor's other argument; a
pattern of a POSIX grammar is written by its dialect's printer (`POSIX.BRE.Text`, `POSIX.ERE.Text`), awk's with awk's
escapes.

Its kinds print as ECMAScript writes them: alternatives joined by `|`; a group `(?:...)`, a capturing group `(...)`, a
lookahead `(?=...)` or `(?!...)`; a quantifier in its `raw` where it has one, else `*`, `+` and `?` where its bounds are
theirs, else in braces, followed by `?` where it is lazy; a class `[^...]`, a range `a-z`, a class atom `[:alpha:]`,
`[.ch.]` or `[=a=]`; `.`, `\\d`, `\\s`, `\\w` and their negations; `^`, `$`, `\\b` and `\\B`; a backreference `\\1`. A
character is written in its `raw` where it has one, else as itself, escaped where ECMAScript makes it special (its
syntax characters, and within a class `\\`, `]`, `-` and `^`), a control character as its escape writes it (`\\n`,
`\\x01`). Invalid syntax is written as written (`Terms.invalid_text`), refused by the name of the dialect that owns it.

Its printer is its own *(agent)*: its terms hold no other dialect's but a regex's POSIX pattern, which POSIX's printer
writes, and no other dialect's subterm is one, so it shares nothing with the C family's printer (`C.Expressions.Text`)
but its reading of invalid syntax."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from ...POSIX import Kinds as PK
from ...POSIX.BRE import Expressions as BRE
from ...POSIX.ERE import Expressions as ERE
from . import Expressions as E

__all__ = ["ToText"]

_SPECIAL = "^$\\.*+?()[]{}|"
"""The characters its text escapes outside a class: ECMAScript's syntax characters."""

_CONTROLS = {0x09: "t", 0x0A: "n", 0x0B: "v", 0x0C: "f", 0x0D: "r"}


class _Printer:
    """Writes a term's source as ECMAScript does, from its `Node`."""

    def __init__(self, dialect: F.Dialect):
        self.dialect = dialect

    def term(self, value: Any, within: bool = False, awk: bool = False) -> str:
        tag, record, _ = self.dialect.kind(value)
        if tag in F.INVALID_KINDS:
            return F.invalid_term_text(self.dialect, value)
        owner = self.dialect.owner(value)
        if owner in (BRE.DIALECT, ERE.DIALECT):  # a POSIX grammar's term, as its dialect writes it
            return PK.Printer(owner, PK.BRE if owner is BRE.DIALECT else PK.ERE, awk).term(value)
        if owner is not self.dialect:  # a term of its family's other dialects, which it reads but does not write
            raise ValueError(f"{owner.name()} {tag} is not a regular expression to print")
        return getattr(self, tag)(F.node(tag, record), within)

    def alternatives(self, node: F.Node) -> str:
        return "|".join(self.term(alternative) for alternative in node.lists["alternatives"])

    def regex(self, node: F.Node, within: bool) -> str:
        flags = node.attributes["flags"].values if "flags" in node.attributes else ()
        return self.term(node.subterms["pattern"], awk=E.grammar(flags) == "awk")

    def pattern(self, node: F.Node, within: bool) -> str:
        return self.alternatives(node)

    def alternative(self, node: F.Node, within: bool) -> str:
        return "".join(self.term(element) for element in node.many)

    def group(self, node: F.Node, within: bool) -> str:
        return f"(?:{self.alternatives(node)})"

    def capturinggroup(self, node: F.Node, within: bool) -> str:
        return f"({self.alternatives(node)})"

    def quantifier(self, node: F.Node, within: bool) -> str:
        element = self.term(node.subterms["element"])
        if "raw" in node.attributes:
            return element + node.attributes["raw"]
        least, most = node.attributes["min"], node.attributes.get("max")
        written = {(0, None): "*", (1, None): "+", (0, 1): "?"}.get((least, most))
        if written is None:
            written = "{" + (f"{least}" if most == least else f"{least}," + ("" if most is None else f"{most}")) + "}"
        return element + written + ("?" if node.attributes.get("greedy") is False else "")

    def characterclass(self, node: F.Node, within: bool) -> str:
        negate = "^" if node.attributes.get("negate") else ""
        return f"[{negate}{''.join(self.term(element, True) for element in node.many)}]"

    def characterclassrange(self, node: F.Node, within: bool) -> str:
        return f"{self.term(node.subterms['min'], True)}-{self.term(node.subterms['max'], True)}"

    def characterset(self, node: F.Node, within: bool) -> str:
        kind = node.attributes["setKind"]
        if kind == "any":
            return "."
        letter = kind[0]
        return "\\" + (letter.upper() if node.attributes.get("negate") else letter)

    def character(self, node: F.Node, within: bool) -> str:
        if "raw" in node.attributes:
            return node.attributes["raw"]
        code = node.attributes["value"]
        c = chr(code)
        if code in _CONTROLS:
            return "\\" + _CONTROLS[code]
        if code < 0x20 or code == 0x7F:
            return f"\\x{code:02x}"
        return "\\" + c if c in ("\\]-^" if within else _SPECIAL) else c

    def assertion(self, node: F.Node, within: bool) -> str:
        kind, negate = node.attributes["assertionKind"], node.attributes.get("negate")
        if kind == "lookahead":
            return f"(?{'!' if negate else '='}{self.alternatives(node)})"
        return {"start": "^", "end": "$", "word": "\\B" if negate else "\\b"}[kind]

    def backreference(self, node: F.Node, within: bool) -> str:
        return f"\\{node.attributes['ref']}"

    def exclass(self, node: F.Node, within: bool) -> str:
        return f"[:{node.attributes['name']}:]"

    def collatingelement(self, node: F.Node, within: bool) -> str:
        return f"[.{node.attributes['name']}.]"

    def equivalence(self, node: F.Node, within: bool) -> str:
        return f"[={node.attributes['name']}=]"


def ToText(expression: Any) -> str:
    """The expression as the pattern `std::regex` is given, in its grammar."""
    return _Printer(E.DIALECT).term(F.term(expression))
