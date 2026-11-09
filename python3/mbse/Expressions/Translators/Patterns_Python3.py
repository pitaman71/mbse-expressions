"""Patterns <-> Python3, in two styles.

`TRANSLATOR` writes Python's operators: `get` is an attribute, `has` is `hasattr`, `implies(a, b)` is `b if a else
True`, and a let is `(lambda name: body)(value)`. `NUMPY` writes NumPy's functions, for columns of values: `get` is a
subscript, `has` is a test that the subscript is not masked, operations are numpy functions (`np.greater_equal`), and
`implies(a, b)` is `np.where(a, b, True)`; it adds `import numpy as np`, which it drops translating back. Each reads
back its own style. The bitwise operations are Python's (`&`, `|`, `^`, `~`, `<<`, `>>`), or NumPy's functions.

`TRANSLATOR` writes collections with Python's builtins and generator expressions: `all` and `any` are `all(body for
name in collection)` and `any(...)`, the quantifier `count` is `sum(1 for name in collection if body)`, `count(xs)` is
`len(xs)`, `item(xs, i)` is `xs[i]`, `in(x, xs)` is `x in xs`, and `sum`, `min` and `max` are the builtins of one
argument. A comparison translates as a chain of one link, `and` and `or` as a `boolop` of two values, and a generator
expression as one of one `for` clause over a name: Python3's longer chains, boolops and clauses have no Patterns
counterpart. `unique(xs)` is written `len(set(xs)) == len(xs)`, which does not read back as `unique`. `entries` has no
Python counterpart, and `NUMPY` writes no collections. The container constructors are Python's displays: a `list` its
list display, `[a, b]`, and a `mapping` its dict display, `{k: v}`, a `dict` (its `**` items have no counterpart)."""

from __future__ import annotations

from mbse.Expressions.Patterns.Expressions.Expressions import DIALECT as PATTERNS
from mbse.Expressions.Python.Python3.Expressions import DIALECT as PYTHON3
from mbse.Expressions.Framework.Translators import Elementwise, Elide, Pairwise, Prelude, Rule, renames

from ._Patterns import Patterns, Numpy, Python3, compares, value

V = value(int, float, str, bool, bytes)
_COMMON = [
    Rule(Patterns.literal(V), Python3.constant(V)),
    Rule(Patterns.variable, Python3.name),
    Rule(Patterns.let, Python3.let),
    Elide("import", "right"),
    Elide("importfrom", "right"),
]

TRANSLATOR = Pairwise(PATTERNS, PYTHON3, [
    *_COMMON,
    Rule(Patterns.get, Python3.get),
    Rule(Patterns.has, Python3.has),
    Rule(Patterns.implies, Python3.implies),
    *compares("call", "callable", {"==": "eq", "!=": "ne", "<": "lt", "<=": "le", ">": "gt", ">=": "ge"}, "right"),
    *renames("call", "callable", "boolop", "op", {"and": "and", "or": "or"}, 2),
    *renames("call", "callable", "binop", "op", {"add": "+", "sub": "-", "mul": "*"}, 2),
    *renames("call", "callable", "unaryop", "op", {"not": "not", "neg": "-"}, 1),
    *renames("call", "callable", "binop", "op", {
        "bitand": "&", "bitor": "|", "bitxor": "^", "shl": "<<", "shr": ">>"}, 2),
    *renames("call", "callable", "unaryop", "op", {"bitnot": "~"}, 1),
    Rule(Patterns.quantifier("all"), Python3.all_),
    Rule(Patterns.quantifier("any"), Python3.any_),
    Rule(Patterns.quantifier("count"), Python3.count_where),
    Rule(Patterns.unary("count"), Python3.builtin("len")),
    *[Rule(Patterns.unary(name), Python3.builtin(name)) for name in ("sum", "min", "max")],
    Rule(Patterns.item, Python3.index),
    Rule(Patterns.in_, Python3.in_),
    Rule(Patterns.unary("unique"), Python3.unique, "forward"),
    Elementwise("list", "list"),
    Elementwise("mapping", "dict"),
])

NUMPY = Pairwise(PATTERNS, PYTHON3, [
    *_COMMON,
    Prelude(Numpy.prelude, "right"),
    Rule(Patterns.get, Numpy.get),
    Rule(Patterns.has, Numpy.has),
    Rule(Patterns.implies, Numpy.implies),
    *Numpy.renames("call", "callable", {
        "eq": "equal", "ne": "not_equal", "lt": "less", "le": "less_equal", "gt": "greater", "ge": "greater_equal",
        "and": "logical_and", "or": "logical_or", "add": "add", "sub": "subtract", "mul": "multiply",
        "bitand": "bitwise_and", "bitor": "bitwise_or", "bitxor": "bitwise_xor", "shl": "left_shift",
        "shr": "right_shift"}, 2),
    *Numpy.renames("call", "callable", {"not": "logical_not", "neg": "negative", "bitnot": "invert"}, 1),
])
