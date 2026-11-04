"""Patterns <-> Cpp: the rules of Patterns <-> C (`Patterns_C.RULES`), over the kinds C++ shares with C, applied to
C++'s terms, and C++'s string: a literal's quote is not C++'s spelling, since `'a'` is a `char` there, so a string
written with its `"` translates back as a Patterns string, and a character, of a type of its own, has no Patterns
counterpart. A let is inlined; C++ has no `has` here (planned: mbse-basis
[CAP-235: `has` translated to C++](mbse:mbse-basis/docs/capabilities/CAP-235.md)), and no container constructor."""

from __future__ import annotations

from mbse.Expressions.Dialects.Cpp.Expressions import DIALECT as CPP
from mbse.Expressions.Dialects.Patterns.Expressions import DIALECT as PATTERNS
from mbse.Expressions.Framework.Translators import Pairwise, Rule

from ._Patterns import CFamily, Patterns, value
from .Patterns_C import RULES as C_RULES

RULES = [*C_RULES, Rule(Patterns.literal(value(str)), CFamily.string, "backward")]
"""The rules between Patterns and C++: C's, and a string written with its quote."""

TRANSLATOR = Pairwise(PATTERNS, CPP, RULES)
