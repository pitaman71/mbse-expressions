/** Matlab <-> Excel. MATLAB's comparison and arithmetic operators are Excel's, `&&`, `||` and `~` are `AND`, `OR` and
 * `NOT`, a field is a field, and `isfield(x, "name")` is `NOT(ISERROR(x.name))`. MATLAB has no let expression, so
 * `LET`s are inlined: a let's translated value is shared by every use of its name. MATLAB's imports, which Excel
 * cannot declare, are dropped. MATLAB's bit functions are Excel's, `bitshift(a, -n)` being `BITRSHIFT(a, n)`. */

import { DIALECT as EXCEL } from "../Dialects/Excel/Expressions.js";
import { DIALECT as MATLAB } from "../Dialects/Matlab/Expressions.js";
import { Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Excel, Matlab, value } from "./_Patterns.js";

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
  ...renames("binary", "operator", "function", "name", { "&&": "AND", "||": "OR" }, 2),
  ...renames("unary", "operator", "function", "name", { "~": "NOT" }, 1),
  ...renames("unary", "operator", "prefix", "operator", { "-": "-" }, 1),
  ...renames("call", "function", "function", "name", { bitand: "BITAND", bitor: "BITOR", bitxor: "BITXOR", bitshift: "BITLSHIFT" }, 2),
  new Rule(Matlab.shr, Excel.shr),
]);
