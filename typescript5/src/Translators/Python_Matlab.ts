/** Python <-> Matlab. Python's operators are MATLAB's, an attribute is a field, and `hasattr` is `isfield`. `b if a
 * else True` is written `~a || b`, which translates back as `not a or b`; other conditional expressions have no MATLAB
 * expression. MATLAB has no let expression, so lets are inlined, and imports on either side, which the other cannot
 * declare, are dropped: what they brought in has no counterpart. MATLAB has no bytes. Python's bitwise operators are
 * MATLAB's bit functions, `a >> n` being `bitshift(a, -n)`; `~` has no counterpart. */

import { DIALECT as MATLAB } from "../Dialects/Matlab/Expressions.js";
import { DIALECT as PYTHON } from "../Dialects/Python/Expressions.js";
import { Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Matlab, Python, collections, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(PYTHON, MATLAB, [
  new Rule(Python.constant(V), Matlab.constant(V)),
  new Rule(Python.name, Matlab.identifier),
  new Inline("let", "left"),
  new Elide("import", "left"),
  new Elide("importfrom", "left"),
  new Elide("import", "right"),
  new Rule(Python.get, Matlab.get),
  new Rule(Python.has, Matlab.has),
  new Rule(Python.implies, Matlab.implies, "forward"),
  ...renames("compare", "operator", "binary", "operator", {
    "==": "==", "!=": "~=", "<": "<", "<=": "<=", ">": ">", ">=": ">=" }, 2),
  ...renames("boolop", "operator", "binary", "operator", { and: "&&", or: "||" }, 2),
  ...renames("binop", "operator", "binary", "operator", { "+": "+", "-": "-", "*": ".*" }, 2),
  ...renames("unaryop", "operator", "unary", "operator", { not: "~", "-": "-" }, 1),
  ...renames("binop", "operator", "call", "function", { "&": "bitand", "|": "bitor", "^": "bitxor", "<<": "bitshift" }, 2),
  new Rule(Python.shr, Matlab.shr),
  ...collections("Python", "Matlab"),
]);
