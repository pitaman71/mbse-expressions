"""Errors: the exceptions evaluation raises beyond mbse-schemas' own, named the same in every implementation.

In Python they are Python's own exceptions; TypeScript defines classes of the same names, which JavaScript lacks.
Evaluating a Python expression raises them as Python would, and the MATLAB dialect raises `NameError` and
`ImportError` for unrecognized names and imports.
"""

from builtins import ImportError, IndexError, NameError, OverflowError, ZeroDivisionError

__all__ = ["ImportError", "IndexError", "NameError", "OverflowError", "ZeroDivisionError"]
