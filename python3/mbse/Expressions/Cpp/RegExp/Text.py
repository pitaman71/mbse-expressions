"""Text of the Cpp RegExp dialect: `ToText(expression)` is a term of Cpp RegExp (or anything `Terms.term` reads one from)
as the pattern `std::regex` is given, in its grammar: a `regex`'s, by its flags, else ECMAScript's, the default
([re.synopt]). A regex is written as its pattern, its flags being `basic_regex`'s constructor's other argument.

Its kinds print as each grammar writes them: alternatives joined by `|`, grep's and egrep's list of patterns by
newlines; a capturing group `(...)`, a BRE's (basic and grep) `\\(...\\)`; ECMAScript's group `(?:...)` and lookahead
`(?=...)` or `(?!...)`; a quantifier in its `raw` where it has one, else `*`, `+` and `?` where its bounds are theirs
(a BRE's `*` alone), else in braces, a BRE's escaped (`\\{2,\\}`), ECMAScript's lazy one followed by `?`; a bracket
expression `[^...]`, a range `a-z`, a class atom `[:alpha:]`, `[.ch.]` or `[=a=]`; `.`, ECMAScript's `\\d`, `\\s`,
`\\w` and their negations; `^`, `$`, ECMAScript's `\\b` and `\\B`; a backreference `\\1`. A character is written in
its `raw` where it has one, else as itself, escaped where its grammar makes it special (ECMAScript's syntax
characters, and within a class `\\`, `]`, `-` and `^`; a BRE's or an ERE's special characters, XBD 9.3.3 and 9.4.3,
none within a bracket expression, which has no escapes), a control character as ECMAScript's or awk's escape writes
it (`\\n`, `\\x01`; awk's `\\001`), as a BRE and an ERE have none. Invalid syntax is written as written
(`Terms.invalid_text`), refused by the name of the dialect that owns it.

Its printer is its own *(agent)*: its terms hold no other dialect's, and no other dialect's position holds one, so it
shares nothing with the C family's printer (`C.Expressions.Text`) but its reading of invalid syntax, and its grammar,
which a term alone does not say, is the context it writes in."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Expressions as E

__all__ = ["ToText", "text"]

_SPECIAL = {
    E.ECMASCRIPT: "^$\\.*+?()[]{}|",
    "basic": "^.[$*\\", "grep": "^.[$*\\",
    "extended": "^.[$()|*+?{\\", "awk": "^.[$()|*+?{\\", "egrep": "^.[$()|*+?{\\",
}
"""The characters each grammar's text escapes outside a class: ECMAScript's syntax characters, a BRE's and an ERE's
special characters (XBD 9.3.3, 9.4.3)."""

_CONTROLS = {0x09: "t", 0x0A: "n", 0x0B: "v", 0x0C: "f", 0x0D: "r"}
_AWK = {**_CONTROLS, 0x07: "a", 0x08: "b"}
_BRE = ("basic", "grep")


class _Printer:
    """Writes a term's source in a grammar, from its `Node`."""

    def __init__(self, dialect: F.Dialect, grammar: str):
        self.dialect, self.grammar = dialect, grammar

    def term(self, value: Any, within: bool = False) -> str:
        tag, record, _ = self.dialect.kind(value)
        if tag in F.INVALID_KINDS:
            return F.invalid_term_text(self.dialect, value)
        if tag not in E.TAGS:  # a term of its family's other dialects, which it reads but does not write
            raise ValueError(f"{self.dialect.owner(value).name()} {tag} is not a regular expression to print")
        node = F.node(tag, record)
        if tag == E.REGEX:
            flags = node.attributes["flags"].values if "flags" in node.attributes else ()
            self.grammar = E.grammar(flags)
        return getattr(self, tag)(node, within)

    def alternatives(self, node: F.Node) -> str:
        return "|".join(self.term(alternative) for alternative in node.lists["alternatives"])

    def regex(self, node: F.Node, within: bool) -> str:
        return self.term(node.slots["pattern"])

    def patternlist(self, node: F.Node, within: bool) -> str:
        return "\n".join(self.term(pattern) for pattern in node.many)

    def pattern(self, node: F.Node, within: bool) -> str:
        return self.alternatives(node)

    def alternative(self, node: F.Node, within: bool) -> str:
        return "".join(self.term(element) for element in node.many)

    def group(self, node: F.Node, within: bool) -> str:
        return f"(?:{self.alternatives(node)})"

    def capturinggroup(self, node: F.Node, within: bool) -> str:
        if self.grammar in _BRE:
            return f"\\({self.alternatives(node)}\\)"
        return f"({self.alternatives(node)})"

    def quantifier(self, node: F.Node, within: bool) -> str:
        element = self.term(node.slots["element"])
        if "raw" in node.attributes:
            return element + node.attributes["raw"]
        least, most = node.attributes["min"], node.attributes.get("max")
        shorthand = {(0, None): "*", (1, None): "+", (0, 1): "?"}.get((least, most))
        if shorthand is not None and (shorthand == "*" or self.grammar not in _BRE):
            written = shorthand
        else:
            bounds = f"{least}" if most == least else f"{least}," + ("" if most is None else f"{most}")
            written = f"\\{{{bounds}\\}}" if self.grammar in _BRE else f"{{{bounds}}}"
        return element + written + ("?" if node.attributes.get("greedy") is False else "")

    def characterclass(self, node: F.Node, within: bool) -> str:
        negate = "^" if node.attributes.get("negate") else ""
        return f"[{negate}{''.join(self.term(element, True) for element in node.many)}]"

    def characterclassrange(self, node: F.Node, within: bool) -> str:
        return f"{self.term(node.slots['min'], True)}-{self.term(node.slots['max'], True)}"

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
        if self.grammar == "awk" and code in _AWK:
            return "\\" + _AWK[code]
        if self.grammar == "awk" and (code < 0x20 or code == 0x7F):
            return f"\\{code:03o}"
        if self.grammar != E.ECMASCRIPT:  # a BRE or an ERE: no escapes within a bracket expression, none of controls
            return c if within or c not in _SPECIAL[self.grammar] else "\\" + c
        if code in _CONTROLS:
            return "\\" + _CONTROLS[code]
        if code < 0x20 or code == 0x7F:
            return f"\\x{code:02x}"
        return "\\" + c if c in ("\\]-^" if within else _SPECIAL[E.ECMASCRIPT]) else c

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


def text(expression: Any, grammar: str = E.ECMASCRIPT) -> str:
    """A term of Cpp RegExp as the pattern its grammar writes: a regex's, by its flags; any other term's, `grammar`,
    ECMAScript where none is given."""
    return _Printer(E.DIALECT, grammar).term(F.term(expression))


def ToText(expression: Any) -> str:
    """The expression as the pattern `std::regex` is given, in its grammar."""
    return text(expression)
