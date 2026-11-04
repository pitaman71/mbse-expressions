"""Patterns <-> Cpp: the rules of Patterns <-> C (`Patterns_C.rules`), over the kinds C++ shares with C, applied to
C++'s terms, a member's name an identifier (`Name`). A let is inlined; C++ has no `has` here (planned: mbse-basis
[CAP-235: `has` translated to C++](mbse:mbse-basis/docs/capabilities/CAP-235.md)), and no container constructor."""

from __future__ import annotations

from mbse.Expressions.Dialects.Cpp.Expressions import DIALECT as CPP
from mbse.Expressions.Dialects.Patterns.Expressions import DIALECT as PATTERNS
from mbse.Expressions.Framework.Terms import Part
from mbse.Expressions.Framework.Translators import Pairwise

from ._Patterns import K
from .Patterns_C import rules

RULES = rules(Part("identifier", {"spelling": K}, 0))
"""The rules between Patterns and C++, whose member's name is an identifier."""

TRANSLATOR = Pairwise(PATTERNS, CPP, RULES)
