/** Patterns <-> MATLAB. Patterns operations are MATLAB operators, `get` a field, and `has` is `isfield`. `implies(a, b)` is
 * written `~a || b`, which translates back as `or(not(a), b)`. MATLAB has no let expression, so lets are inlined: a
 * let's translated value is shared by every use of its name. MATLAB's imports, which Patterns cannot declare, are
 * dropped. MATLAB has no bytes. The bitwise operations are MATLAB's bit functions, `shr(a, n)` being
 * `bitshift(a, -n)`; MATLAB has no `bitnot` for doubles.
 *
 * Collections are arrays: `all` and `any` are `all(arrayfun(@(p) body, xs))` and `any(...)`, the quantifier `count` is
 * `nnz(arrayfun(...))`, `count(xs)` is `numel(xs)`, `item(xs, i)` is `xs(i + 1)` (MATLAB counts from 1), `in(x, xs)` is
 * `ismember(x, xs)`, and `sum`, `min` and `max` are MATLAB's. `unique(xs)` is written `numel(unique(xs)) == numel(xs)`,
 * which does not read back as `unique`, and `entries` has no counterpart. A `list` is a concatenation, `[a, b]`; a
 * `mapping` has no counterpart. */

import { DIALECT as PATTERNS } from "../Framework/Patterns/Expressions.js";
import { DIALECT as MATLAB } from "../MATLAB/Expressions/Expressions.js";
import { Elementwise, Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Patterns, Matlab, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(PATTERNS, MATLAB, [
  new Rule(Patterns.literal(V), Matlab.constant(V)),
  new Rule(Patterns.variable, Matlab.identifier),
  new Inline("let", "left"),
  new Elide("import", "right"),
  new Rule(Patterns.get, Matlab.get),
  new Rule(Patterns.has, Matlab.has),
  new Rule(Patterns.implies, Matlab.implies, "forward"),
  ...renames("call", "callable", "binary", "operator", {
    eq: "==", ne: "~=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||",
    add: "+", sub: "-", mul: ".*" }, 2),
  ...renames("call", "callable", "unary", "operator", { not: "~", neg: "-" }, 1),
  ...renames("call", "callable", "call", "callable", { bitand: "bitand", bitor: "bitor", bitxor: "bitxor", shl: "bitshift" }, 2),
  new Rule(Patterns.shr, Matlab.shr),
  new Rule(Patterns.quantifier("all"), Matlab.over("all")),
  new Rule(Patterns.quantifier("any"), Matlab.over("any")),
  new Rule(Patterns.quantifier("count"), Matlab.over("nnz")),
  new Rule(Patterns.unary("count"), Matlab.function("numel")),
  ...["sum", "min", "max"].map((name) => new Rule(Patterns.unary(name), Matlab.function(name))),
  new Rule(Patterns.item, Matlab.index),
  new Rule(Patterns.in_, Matlab.ismember),
  new Rule(Patterns.unary("unique"), Matlab.unique, "forward"),
  new Elementwise("list", "list"),
]);
