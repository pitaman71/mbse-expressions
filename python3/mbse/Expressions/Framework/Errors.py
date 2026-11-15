"""Errors: the exceptions a dialect's folding rules raise beyond mbse-schemas' own, named the same in every
implementation.

In Python they are Python's own exceptions; TypeScript defines classes of the same names, which JavaScript lacks.
Folding a Python expression raises them as Python would. A name or an import a scope does not resolve raises none: it
stays in the residual (`Symbolics.Unbound`).
"""

from builtins import IndexError, OverflowError, ZeroDivisionError

__all__ = ["IndexError", "OverflowError", "ZeroDivisionError"]
