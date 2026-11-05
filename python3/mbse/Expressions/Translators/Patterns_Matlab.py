"""Patterns <-> MATLAB. Patterns operations are MATLAB operators, `get` a field, and `has` is `isfield`. `implies(a, b)` is
written `~a || b`, which translates back as `or(not(a), b)`. MATLAB has no let expression, so lets are inlined: a
let's translated value is shared by every use of its name. MATLAB's imports, which Patterns cannot declare, are dropped.
MATLAB has no bytes. The bitwise operations are MATLAB's bit functions, `shr(a, n)` being `bitshift(a, -n)`; MATLAB
has no `bitnot` for doubles.

Collections are arrays: `all` and `any` are `all(arrayfun(@(p) body, xs))` and `any(...)`, the quantifier `count` is
`nnz(arrayfun(...))`, `count(xs)` is `numel(xs)`, `item(xs, i)` is `xs(i + 1)` (MATLAB counts from 1), `in(x, xs)` is
`ismember(x, xs)`, and `sum`, `min` and `max` are MATLAB's. `unique(xs)` is written `numel(unique(xs)) == numel(xs)`,
which does not read back as `unique`, and `entries` has no counterpart. A `list` is a concatenation, `[a, b]`; a
`mapping` has no counterpart."""

from __future__ import annotations

from mbse.Expressions.Framework.Patterns.Expressions import DIALECT as PATTERNS
from mbse.Expressions.MATLAB.Expressions.Expressions import DIALECT as MATLAB
from mbse.Expressions.Framework.Translators import Elementwise, Elide, Inline, Pairwise, Rule, renames

from ._Patterns import Patterns, Matlab, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(PATTERNS, MATLAB, [
    Rule(Patterns.literal(V), Matlab.constant(V)),
    Rule(Patterns.variable, Matlab.identifier),
    Inline("let", "left"),
    Elide("import", "right"),
    Rule(Patterns.get, Matlab.get),
    Rule(Patterns.has, Matlab.has),
    Rule(Patterns.implies, Matlab.implies, "forward"),
    *renames("call", "callable", "binary", "operator", {
        "eq": "==", "ne": "~=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||",
        "add": "+", "sub": "-", "mul": ".*"}, 2),
    *renames("call", "callable", "unary", "operator", {"not": "~", "neg": "-"}, 1),
    *renames("call", "callable", "call", "callable", {
        "bitand": "bitand", "bitor": "bitor", "bitxor": "bitxor", "shl": "bitshift"}, 2),
    Rule(Patterns.shr, Matlab.shr),
    Rule(Patterns.quantifier("all"), Matlab.over("all")),
    Rule(Patterns.quantifier("any"), Matlab.over("any")),
    Rule(Patterns.quantifier("count"), Matlab.over("nnz")),
    Rule(Patterns.unary("count"), Matlab.function("numel")),
    *[Rule(Patterns.unary(name), Matlab.function(name)) for name in ("sum", "min", "max")],
    Rule(Patterns.item, Matlab.index),
    Rule(Patterns.in_, Matlab.ismember),
    Rule(Patterns.unary("unique"), Matlab.unique, "forward"),
    Elementwise("list", "list"),
])
