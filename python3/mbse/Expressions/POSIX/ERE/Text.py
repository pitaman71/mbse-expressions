"""Text of the POSIX ERE dialect: `ToText(expression)` is a term of POSIX ERE (or anything `Terms.term` reads one from)
as an extended regular expression writes it (XBD 9.4), and `text(expression, awk)` as awk writes it (XCU awk, Regular
Expressions): alternatives joined by `|`, grep's list of patterns by newlines; a subexpression `(...)`; a quantifier in
its `raw` where it has one, else `*`, `+` and `?` where its bounds are theirs, else in braces (`{2,}`), followed by `?`
where it is not greedy (POSIX.1-2024's repetition modifier); a bracket expression `[^...]`, a range `a-z`, a class atom
`[:alpha:]`, `[.ch.]` or `[=a=]`; `.`, `^`, `$`. A character is written in its `raw` where it has one, else as itself,
escaped where an ERE makes it special (XBD 9.4.3: `^`, `.`, `[`, `$`, `(`, `)`, `|`, `*`, `+`, `?`, `{`, `\\`), never
within a bracket expression, which has no escapes; with `awk`, a control character as awk's escapes write it (`\\n`,
`\\a`, `\\001`), within a bracket expression too. Invalid syntax is written as written (`Terms.invalid_text`), refused
by the name of the dialect that owns it; a term of POSIX BRE, which it reads, is written as a BRE."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from .. import Kinds as K
from . import Expressions as E

__all__ = ["ToText", "text"]


def text(expression: Any, awk: bool = False) -> str:
    """The expression as an extended regular expression writes it, its characters with awk's escapes where `awk`."""
    return K.Printer(E.DIALECT, K.ERE, awk).term(F.term(expression))


def ToText(expression: Any) -> str:
    """The expression as an extended regular expression writes it."""
    return text(expression)
