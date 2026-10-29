/** Python <-> Excel. Comparisons and arithmetic are Excel's operators, `and`, `or` and `not` are `AND`, `OR` and
 * `NOT`, an attribute is a field, `hasattr(x, 'name')` is `NOT(ISERROR(x.name))`, a conditional expression is `IF`,
 * and a let is `LET`. Python's imports, which Excel cannot declare, are dropped. Excel has no bytes. Python's bitwise
 * operators are Excel's bit functions; `~` has no counterpart. */

import { DIALECT as EXCEL } from "../Dialects/Excel/Expressions.js";
import { DIALECT as PYTHON } from "../Dialects/Python/Expressions.js";
import { Elide, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Excel, Python, collections, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(PYTHON, EXCEL, [
  new Rule(Python.constant(V), Excel.constant(V)),
  new Rule(Python.name, Excel.name),
  new Rule(Python.let, Excel.let),
  new Elide("python_import", "left"),
  new Elide("python_importfrom", "left"),
  new Rule(Python.get, Excel.get),
  new Rule(Python.has, Excel.has),
  new Rule(Python.ifexp, Excel.if_),
  ...renames("python_compare", "operator", "excel_infix", "operator", {
    "==": "=", "!=": "<>", "<": "<", "<=": "<=", ">": ">", ">=": ">=" }, 2),
  ...renames("python_binop", "operator", "excel_infix", "operator", { "+": "+", "-": "-", "*": "*" }, 2),
  ...renames("python_boolop", "operator", "call", "callable", { and: "AND", or: "OR" }, 2),
  ...renames("python_unaryop", "operator", "call", "callable", { not: "NOT" }, 1),
  ...renames("python_unaryop", "operator", "excel_prefix", "operator", { "-": "-" }, 1),
  ...renames("python_binop", "operator", "call", "callable", {
    "&": "BITAND", "|": "BITOR", "^": "BITXOR", "<<": "BITLSHIFT", ">>": "BITRSHIFT" }, 2),
  ...collections("Python", "Excel"),
]);
