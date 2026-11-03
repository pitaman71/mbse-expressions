"""Patterns <-> Cpp: the rules of Patterns <-> C (`Patterns_C.RULES`), over the kinds C++ shares with C, applied to
C++'s terms. A let is inlined; C++ has no `has`, and no container constructor here."""

from __future__ import annotations

from mbse.Expressions.Dialects.Cpp.Expressions import DIALECT as CPP
from mbse.Expressions.Dialects.Patterns.Expressions import DIALECT as PATTERNS
from mbse.Expressions.Framework.Translators import Pairwise

from .Patterns_C import RULES

TRANSLATOR = Pairwise(PATTERNS, CPP, RULES)
