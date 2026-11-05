/** Python3 <-> Excel. Comparisons and arithmetic are Excel's operators, `and`, `or` and `not` are `AND`, `OR` and
 * `NOT`, an attribute is a field, `hasattr(x, 'name')` is `NOT(ISERROR(x.name))`, a conditional expression is `IF`,
 * and a let is `LET`. Python's imports, which Excel cannot declare, are dropped. Excel has no bytes. Python's bitwise
 * operators are Excel's bit functions; `~` has no counterpart. A list display is `VSTACK(a, b)`; a dict display has no
 * counterpart. */

import { DIALECT as EXCEL } from "../Excel/Expressions/Expressions.js";
import { DIALECT as PYTHON3 } from "../Python/Python3/Expressions.js";
import { Elementwise, Elide, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Excel, Python3, collections, compares, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(PYTHON3, EXCEL, [
  new Rule(Python3.constant(V), Excel.constant(V)),
  new Rule(Python3.name, Excel.name),
  new Rule(Python3.let, Excel.let),
  new Elide("import", "left"),
  new Elide("importfrom", "left"),
  new Rule(Python3.get, Excel.get),
  new Rule(Python3.has, Excel.has),
  new Rule(Python3.ifexp, Excel.if_),
  ...compares("infix", "operator", {
    "==": "=", "!=": "<>", "<": "<", "<=": "<=", ">": ">", ">=": ">=" }),
  ...renames("binop", "op", "infix", "operator", { "+": "+", "-": "-", "*": "*" }, 2),
  ...renames("boolop", "op", "call", "callable", { and: "AND", or: "OR" }, 2),
  ...renames("unaryop", "op", "call", "callable", { not: "NOT" }, 1),
  ...renames("unaryop", "op", "prefix", "operator", { "-": "-" }, 1),
  ...renames("binop", "op", "call", "callable", {
    "&": "BITAND", "|": "BITOR", "^": "BITXOR", "<<": "BITLSHIFT", ">>": "BITRSHIFT" }, 2),
  ...collections("Python", "Excel"),
  new Elementwise("list", "call", {}, { callable: "VSTACK" }),
]);
