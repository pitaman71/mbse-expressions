/** MATLAB <-> Excel. MATLAB's comparison and arithmetic operators are Excel's, `&&`, `||` and `~` are `AND`, `OR` and
 * `NOT`, a field is a field, and `isfield(x, "name")` is `NOT(ISERROR(x.name))`. MATLAB has no let expression, so
 * `LET`s are inlined: a let's translated value is shared by every use of its name. MATLAB's imports, which Excel
 * cannot declare, are dropped. MATLAB's bit functions are Excel's, `bitshift(a, -n)` being `BITRSHIFT(a, n)`. A
 * concatenation, `[a, b]`, is `VSTACK(a, b)`. */

import { DIALECT as EXCEL } from "../Excel/Expressions/Expressions.js";
import { DIALECT as MATLAB } from "../MATLAB/Expressions/Expressions.js";
import { Elementwise, Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Excel, Matlab, collections, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(MATLAB, EXCEL, [
  new Rule(Matlab.constant(V), Excel.constant(V)),
  new Rule(Matlab.identifier, Excel.name),
  new Inline("let", "right"),
  new Elide("import", "left"),
  new Rule(Matlab.get, Excel.get),
  new Rule(Matlab.has, Excel.has),
  ...renames("binary", "operator", "infix", "operator", {
    "==": "=", "~=": "<>", "<": "<", "<=": "<=", ">": ">", ">=": ">=", "+": "+", "-": "-", ".*": "*" }, 2),
  ...renames("binary", "operator", "call", "callable", { "&&": "AND", "||": "OR" }, 2),
  ...renames("unary", "operator", "call", "callable", { "~": "NOT" }, 1),
  ...renames("unary", "operator", "prefix", "operator", { "-": "-" }, 1),
  ...renames("call", "callable", "call", "callable", { bitand: "BITAND", bitor: "BITOR", bitxor: "BITXOR", bitshift: "BITLSHIFT" }, 2),
  new Rule(Matlab.shr, Excel.shr),
  ...collections("MATLAB", "Excel"),
  new Elementwise("list", "call", {}, { callable: "VSTACK" }),
]);
