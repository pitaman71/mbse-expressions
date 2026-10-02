"""Basic <-> Matlab. Basic operations are MATLAB operators, `get` a field, and `has` is `isfield`. `implies(a, b)` is
written `~a || b`, which translates back as `or(not(a), b)`. MATLAB has no let expression, so lets are inlined: a
let's translated value is shared by every use of its name. MATLAB's imports, which Basic cannot declare, are dropped.
MATLAB has no bytes. The bitwise operations are MATLAB's bit functions, `shr(a, n)` being `bitshift(a, -n)`; MATLAB
has no `bitnot` for doubles.

Collections are arrays: `all` and `any` are `all(arrayfun(@(p) body, xs))` and `any(...)`, the quantifier `count` is
`nnz(arrayfun(...))`, `count(xs)` is `numel(xs)`, `item(xs, i)` is `xs(i + 1)` (MATLAB counts from 1), `in(x, xs)` is
`ismember(x, xs)`, and `sum`, `min` and `max` are MATLAB's. `unique(xs)` is written `numel(unique(xs)) == numel(xs)`,
which does not read back as `unique`, and `entries` has no counterpart."""

from __future__ import annotations

from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Matlab.Expressions import DIALECT as MATLAB
from mbse.Expressions.Framework.Translators import Elide, Inline, Pairwise, Rule, renames

from ._Patterns import Basic, Matlab, value

V = value(int, float, str, bool)

TRANSLATOR = Pairwise(BASIC, MATLAB, [
    Rule(Basic.literal(V), Matlab.constant(V)),
    Rule(Basic.variable, Matlab.identifier),
    Inline("let", "left"),
    Elide("import", "right"),
    Rule(Basic.get, Matlab.get),
    Rule(Basic.has, Matlab.has),
    Rule(Basic.implies, Matlab.implies, "forward"),
    *renames("operation", "name", "binary", "operator", {
        "eq": "==", "ne": "~=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||",
        "add": "+", "sub": "-", "mul": ".*"}, 2),
    *renames("operation", "name", "unary", "operator", {"not": "~", "neg": "-"}, 1),
    *renames("operation", "name", "call", "function", {
        "bitand": "bitand", "bitor": "bitor", "bitxor": "bitxor", "shl": "bitshift"}, 2),
    Rule(Basic.shr, Matlab.shr),
    Rule(Basic.quantifier("all"), Matlab.over("all")),
    Rule(Basic.quantifier("any"), Matlab.over("any")),
    Rule(Basic.quantifier("count"), Matlab.over("nnz")),
    Rule(Basic.unary("count"), Matlab.function("numel")),
    *[Rule(Basic.unary(name), Matlab.function(name)) for name in ("sum", "min", "max")],
    Rule(Basic.item, Matlab.index),
    Rule(Basic.in_, Matlab.ismember),
    Rule(Basic.unary("unique"), Matlab.unique, "forward"),
])
