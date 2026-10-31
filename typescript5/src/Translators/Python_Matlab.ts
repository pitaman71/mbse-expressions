/** Python <-> Matlab. Python's operators are MATLAB's, an attribute is a field, and `hasattr` is `isfield`. `b if a
 * else True` is written `~a || b`, which translates back as `not a or b`; other conditional expressions have no MATLAB
 * expression. MATLAB has no let expression, so lets are inlined, and imports on either side, which the other cannot
 * declare, are dropped: what they brought in has no counterpart. MATLAB has no bytes. Python's bitwise operators are
 * MATLAB's bit functions, `a >> n` being `bitshift(a, -n)`; `~` has no counterpart. A list display is a concatenation,
 * `[a, b]`; a dict display has no counterpart. */

import { DIALECT as MATLAB } from "../Dialects/Matlab/Expressions.js";
import { DIALECT as PYTHON } from "../Dialects/Python/Expressions.js";
import { Elementwise, Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Matlab, Python, collections, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(PYTHON, MATLAB, [
  new Rule(Python.constant(V), Matlab.constant(V)),
  new Rule(Python.name, Matlab.identifier),
  new Inline("let", "left"),
  new Elide("python_import", "left"),
  new Elide("python_importfrom", "left"),
  new Elide("matlab_import", "right"),
  new Rule(Python.get, Matlab.get),
  new Rule(Python.has, Matlab.has),
  new Rule(Python.implies, Matlab.implies, "forward"),
  ...renames("python_compare", "operator", "matlab_binary", "operator", {
    "==": "==", "!=": "~=", "<": "<", "<=": "<=", ">": ">", ">=": ">=" }, 2),
  ...renames("python_boolop", "operator", "matlab_binary", "operator", { and: "&&", or: "||" }, 2),
  ...renames("python_binop", "operator", "matlab_binary", "operator", { "+": "+", "-": "-", "*": ".*" }, 2),
  ...renames("python_unaryop", "operator", "matlab_unary", "operator", { not: "~", "-": "-" }, 1),
  ...renames("python_binop", "operator", "call", "callable", { "&": "bitand", "|": "bitor", "^": "bitxor", "<<": "bitshift" }, 2),
  new Rule(Python.shr, Matlab.shr),
  ...collections("Python", "Matlab"),
  new Elementwise("list", "list"),
]);
