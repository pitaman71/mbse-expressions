/** Basic <-> Matlab. Basic operations are MATLAB operators, `get` a field, and `has` is `isfield`. `implies(a, b)` is
 * written `~a || b`, which translates back as `or(not(a), b)`. MATLAB has no let expression, so lets are inlined: a
 * let's translated value is shared by every use of its name. MATLAB's imports, which Basic cannot declare, are
 * dropped. MATLAB has no bytes. The bitwise operations are MATLAB's bit functions, `shr(a, n)` being
 * `bitshift(a, -n)`; MATLAB has no `bitnot` for doubles.
 *
 * Collections are arrays: `all` and `any` are `all(arrayfun(@(p) body, xs))` and `any(...)`, the quantifier `count` is
 * `nnz(arrayfun(...))`, `count(xs)` is `numel(xs)`, `item(xs, i)` is `xs(i + 1)` (MATLAB counts from 1), `in(x, xs)` is
 * `ismember(x, xs)`, and `sum`, `min` and `max` are MATLAB's. `unique(xs)` is written `numel(unique(xs)) == numel(xs)`,
 * which does not read back as `unique`, and `entries` has no counterpart. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as MATLAB } from "../Dialects/Matlab/Expressions.js";
import { Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Basic, Matlab, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(BASIC, MATLAB, [
  new Rule(Basic.literal(V), Matlab.constant(V)),
  new Rule(Basic.variable, Matlab.identifier),
  new Inline("let", "left"),
  new Elide("import", "right"),
  new Rule(Basic.get, Matlab.get),
  new Rule(Basic.has, Matlab.has),
  new Rule(Basic.implies, Matlab.implies, "forward"),
  ...renames("operation", "name", "binary", "operator", {
    eq: "==", ne: "~=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||",
    add: "+", sub: "-", mul: ".*" }, 2),
  ...renames("operation", "name", "unary", "operator", { not: "~", neg: "-" }, 1),
  ...renames("operation", "name", "call", "function", { bitand: "bitand", bitor: "bitor", bitxor: "bitxor", shl: "bitshift" }, 2),
  new Rule(Basic.shr, Matlab.shr),
  new Rule(Basic.quantifier("all"), Matlab.over("all")),
  new Rule(Basic.quantifier("any"), Matlab.over("any")),
  new Rule(Basic.quantifier("count"), Matlab.over("nnz")),
  new Rule(Basic.unary("count"), Matlab.function("numel")),
  ...["sum", "min", "max"].map((name) => new Rule(Basic.unary(name), Matlab.function(name))),
  new Rule(Basic.item, Matlab.index),
  new Rule(Basic.in_, Matlab.ismember),
  new Rule(Basic.unary("unique"), Matlab.unique, "forward"),
]);
