/** Basic <-> Excel. Comparisons and arithmetic are Excel operators, logic is Excel's functions, `get` a field, `has`
 * is `NOT(ISERROR(x.name))`, `implies(a, b)` is `IF(a, b, TRUE)`, and a let is `LET`. Excel has no bytes. The
 * bitwise operations are Excel's bit functions, which have no `bitnot`. */

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
]);
