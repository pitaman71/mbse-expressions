/** Python3 <-> Matlab. Python's operators are MATLAB's, an attribute is a field, and `hasattr` is `isfield`. `b if a
 * else True` is written `~a || b`, which translates back as `not a or b`; other conditional expressions have no MATLAB
 * expression. MATLAB has no let expression, so lets are inlined, and imports on either side, which the other cannot
 * declare, are dropped: what they brought in has no counterpart. MATLAB has no bytes. Python's bitwise operators are
 * MATLAB's bit functions, `a >> n` being `bitshift(a, -n)`; `~` has no counterpart. A list display is a concatenation,
 * `[a, b]`; a dict display has no counterpart. */

import { DIALECT as MATLAB } from "../Dialects/Matlab/Expressions.js";
import { DIALECT as PYTHON3 } from "../Dialects/Python3/Expressions.js";
import { Elementwise, Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Matlab, Python3, collections, compares, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(PYTHON3, MATLAB, [
  new Rule(Python3.constant(V), Matlab.constant(V)),
  new Rule(Python3.name, Matlab.identifier),
  new Inline("let", "left"),
  new Elide("import", "left"),
  new Elide("importfrom", "left"),
  new Elide("import", "right"),
  new Rule(Python3.get, Matlab.get),
  new Rule(Python3.has, Matlab.has),
  new Rule(Python3.implies, Matlab.implies, "forward"),
  ...compares("binary", "operator", {
    "==": "==", "!=": "~=", "<": "<", "<=": "<=", ">": ">", ">=": ">=" }),
  ...renames("boolop", "op", "binary", "operator", { and: "&&", or: "||" }, 2),
  ...renames("binop", "op", "binary", "operator", { "+": "+", "-": "-", "*": ".*" }, 2),
  ...renames("unaryop", "op", "unary", "operator", { not: "~", "-": "-" }, 1),
  ...renames("binop", "op", "call", "callable", { "&": "bitand", "|": "bitor", "^": "bitxor", "<<": "bitshift" }, 2),
  new Rule(Python3.shr, Matlab.shr),
  ...collections("Python", "Matlab"),
  new Elementwise("list", "list"),
]);
