"""Basic <-> Python, in two styles.

`TRANSLATOR` writes Python's operators: `get` is an attribute, `has` is `hasattr`, `implies(a, b)` is `b if a else
True`, and a let is `(lambda name: body)(value)`. `NUMPY` writes NumPy's functions, for columns of values: `get` is a
subscript, `has` is a test that the subscript is not masked, operations are numpy functions (`np.greater_equal`), and
`implies(a, b)` is `np.where(a, b, True)`; it adds `import numpy as np`, which it drops translating back. Each reads
back its own style."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Python.Expressions import DIALECT as PYTHON
from mbse.Expressions.Framework.Translators import Elide, Pairwise, Prelude, Rule, renames

from ._Patterns import Basic, Numpy, Python, value

V = value(int, float, str, bool, bytes)
_COMMON = [
    Rule(Basic.literal(V), Python.constant(V)),
    Rule(Basic.variable, Python.name),
    Rule(Basic.let, Python.let),
    Elide("import", "right"),
    Elide("importfrom", "right"),
]

TRANSLATOR = Pairwise(BASIC, PYTHON, [
    *_COMMON,
    Rule(Basic.get, Python.get),
    Rule(Basic.has, Python.has),
    Rule(Basic.implies, Python.implies),
    *renames("operation", "name", "compare", "operator", {
        "eq": "==", "ne": "!=", "lt": "<", "le": "<=", "gt": ">", "ge": ">="}, 2),
    *renames("operation", "name", "boolop", "operator", {"and": "and", "or": "or"}, 2),
    *renames("operation", "name", "binop", "operator", {"add": "+", "sub": "-", "mul": "*"}, 2),
    *renames("operation", "name", "unaryop", "operator", {"not": "not", "neg": "-"}, 1),
])

NUMPY = Pairwise(BASIC, PYTHON, [
    *_COMMON,
    Prelude(Numpy.prelude, "right"),
    Rule(Basic.get, Numpy.get),
    Rule(Basic.has, Numpy.has),
    Rule(Basic.implies, Numpy.implies),
    *Numpy.renames("operation", "name", {
        "eq": "equal", "ne": "not_equal", "lt": "less", "le": "less_equal", "gt": "greater", "ge": "greater_equal",
        "and": "logical_and", "or": "logical_or", "add": "add", "sub": "subtract", "mul": "multiply"}, 2),
    *Numpy.renames("operation", "name", {"not": "logical_not", "neg": "negative"}, 1),
])
