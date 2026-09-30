/** Basic <-> Matlab. Basic operations are MATLAB operators, `get` a field, and `has` is `isfield`. `implies(a, b)` is
 * written `~a || b`, which translates back as `or(not(a), b)`. MATLAB has no let expression, so lets are inlined: a
 * let's translated value is shared by every use of its name. MATLAB's imports, which Basic cannot declare, are
 * dropped. MATLAB has no bytes. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as MATLAB } from "../Dialects/Matlab/Expressions.js";
import { Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Basic, Matlab, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(BASIC, MATLAB, [
  new Rule(Basic.literal(V), Matlab.constant(V)),
  new Rule(Basic.variable, Matlab.identifier),
  new Inline("let", "left"),
  new Elide("import", "right"),
  new Rule(Basic.get, Matlab.get),
  new Rule(Basic.has, Matlab.has),
  new Rule(Basic.implies, Matlab.implies, "forward"),
  ...renames("operation", "name", "binary", "operator", {
    eq: "==", ne: "~=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||",
    add: "+", sub: "-", mul: ".*" }, 2),
  ...renames("operation", "name", "unary", "operator", { not: "~", neg: "-" }, 1),
]);
