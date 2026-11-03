/** Patterns <-> Excel. Comparisons and arithmetic are Excel operators, logic is Excel's functions, `get` a field, `has`
 * is `NOT(ISERROR(x.name))`, `implies(a, b)` is `IF(a, b, TRUE)`, and a let is `LET`. Excel has no bytes. The
 * bitwise operations are Excel's bit functions, which have no `bitnot`.
 *
 * Collections are arrays: `all` and `any` are `AND(MAP(xs, LAMBDA(p, body)))` and `OR(...)`, the quantifier `count` is
 * `SUM(MAP(xs, LAMBDA(p, IF(body, 1, 0))))`, `count(xs)` is `ROWS(xs)`, `item(xs, i)` is `INDEX(xs, i + 1)` (Excel
 * counts from 1), `in(x, xs)` is `ISNUMBER(MATCH(x, xs, 0))`, and `sum`, `min` and `max` are `SUM`, `MIN` and `MAX`.
 * `unique(xs)` is written `ROWS(UNIQUE(xs)) = ROWS(xs)`, which does not read back as `unique`, and `entries` has no
 * counterpart. A `list` is `VSTACK(a, b)`, a column of its elements; a `mapping` has no counterpart. */

import { DIALECT as PATTERNS } from "../Dialects/Patterns/Expressions.js";
import { DIALECT as EXCEL } from "../Dialects/Excel/Expressions.js";
import { Elementwise, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Patterns, Excel, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(PATTERNS, EXCEL, [
  new Rule(Patterns.literal(V), Excel.constant(V)),
  new Rule(Patterns.variable, Excel.name),
  new Rule(Patterns.let, Excel.let),
  new Rule(Patterns.get, Excel.get),
  new Rule(Patterns.has, Excel.has),
  new Rule(Patterns.implies, Excel.implies),
  ...renames("call", "callable", "infix", "operator", {
    eq: "=", ne: "<>", lt: "<", le: "<=", gt: ">", ge: ">=", add: "+", sub: "-", mul: "*" }, 2),
  ...renames("call", "callable", "call", "callable", { and: "AND", or: "OR" }, 2),
  ...renames("call", "callable", "call", "callable", { not: "NOT" }, 1),
  ...renames("call", "callable", "prefix", "operator", { neg: "-" }, 1),
  ...renames("call", "callable", "call", "callable", {
    bitand: "BITAND", bitor: "BITOR", bitxor: "BITXOR", shl: "BITLSHIFT", shr: "BITRSHIFT" }, 2),
  new Rule(Patterns.quantifier("all"), Excel.over("AND")),
  new Rule(Patterns.quantifier("any"), Excel.over("OR")),
  new Rule(Patterns.quantifier("count"), Excel.count_where),
  new Rule(Patterns.unary("count"), Excel.function("ROWS")),
  ...["sum", "min", "max"].map((name) => new Rule(Patterns.unary(name), Excel.function(name.toUpperCase()))),
  new Rule(Patterns.item, Excel.index),
  new Rule(Patterns.in_, Excel.match),
  new Rule(Patterns.unary("unique"), Excel.unique, "forward"),
  new Elementwise("list", "call", {}, { callable: "VSTACK" }),
]);
