/** Basic <-> Ccpp. Basic operations are C's operators, `get` a member (`x.name`), and `implies(a, b)` is written
 * `!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's translated
 * value is shared by every use of its name. C has no `has`; a typed C constant (`5u`) has no Basic counterpart yet, nor
 * a Basic literal of a value domain a C one. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as CCPP } from "../Dialects/Ccpp/Expressions.js";
import { Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Basic, Ccpp, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(BASIC, CCPP, [
  new Rule(Basic.literal(V), Ccpp.constant(V)),
  new Rule(Basic.variable, Ccpp.identifier),
  new Inline("let", "left"),
  new Rule(Basic.get, Ccpp.get),
  new Rule(Basic.implies, Ccpp.implies, "forward"),
  ...renames("operation", "name", "binary", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*", bitand: "&",
    bitor: "|", bitxor: "^", shl: "<<", shr: ">>" }, 2),
  ...renames("operation", "name", "unary", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
]);
