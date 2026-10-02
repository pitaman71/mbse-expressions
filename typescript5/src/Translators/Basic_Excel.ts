/** Basic <-> Excel. Comparisons and arithmetic are Excel operators, logic is Excel's functions, `get` a field, `has`
 * is `NOT(ISERROR(x.name))`, `implies(a, b)` is `IF(a, b, TRUE)`, and a let is `LET`. Excel has no bytes. The
 * bitwise operations are Excel's bit functions, which have no `bitnot`.
 *
 * Collections are arrays: `all` and `any` are `AND(MAP(xs, LAMBDA(p, body)))` and `OR(...)`, the quantifier `count` is
 * `SUM(MAP(xs, LAMBDA(p, IF(body, 1, 0))))`, `count(xs)` is `ROWS(xs)`, `item(xs, i)` is `INDEX(xs, i + 1)` (Excel
 * counts from 1), `in(x, xs)` is `ISNUMBER(MATCH(x, xs, 0))`, and `sum`, `min` and `max` are `SUM`, `MIN` and `MAX`.
 * `unique(xs)` is written `ROWS(UNIQUE(xs)) = ROWS(xs)`, which does not read back as `unique`, and `entries` has no
 * counterpart. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as EXCEL } from "../Dialects/Excel/Expressions.js";
import { Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Basic, Excel, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(BASIC, EXCEL, [
  new Rule(Basic.literal(V), Excel.constant(V)),
  new Rule(Basic.variable, Excel.name),
  new Rule(Basic.let, Excel.let),
  new Rule(Basic.get, Excel.get),
  new Rule(Basic.has, Excel.has),
  new Rule(Basic.implies, Excel.implies),
  ...renames("operation", "name", "infix", "operator", {
    eq: "=", ne: "<>", lt: "<", le: "<=", gt: ">", ge: ">=", add: "+", sub: "-", mul: "*" }, 2),
  ...renames("operation", "name", "function", "name", { and: "AND", or: "OR" }, 2),
  ...renames("operation", "name", "function", "name", { not: "NOT" }, 1),
  ...renames("operation", "name", "prefix", "operator", { neg: "-" }, 1),
  ...renames("operation", "name", "function", "name", {
    bitand: "BITAND", bitor: "BITOR", bitxor: "BITXOR", shl: "BITLSHIFT", shr: "BITRSHIFT" }, 2),
  new Rule(Basic.quantifier("all"), Excel.over("AND")),
  new Rule(Basic.quantifier("any"), Excel.over("OR")),
  new Rule(Basic.quantifier("count"), Excel.count_where),
  new Rule(Basic.unary("count"), Excel.function("ROWS")),
  ...["sum", "min", "max"].map((name) => new Rule(Basic.unary(name), Excel.function(name.toUpperCase()))),
  new Rule(Basic.item, Excel.index),
  new Rule(Basic.in_, Excel.match),
  new Rule(Basic.unary("unique"), Excel.unique, "forward"),
]);
