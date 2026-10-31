/** Basic <-> Ccpp. Basic operations are C's operators, `get` a member (`x.name`), and `implies(a, b)` is written
 * `!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's translated
 * value is shared by every use of its name. C has no `has`, and no container constructor.
 *
 * A C constant of a type of its own (`5u`, `1.5f`, `(uint8_t)5`) has no Basic counterpart yet: a term carries no domain,
 * and the conversions of typed literals wait for type inference (the port's stage 3, Decided, 2). An untyped constant
 * is a Basic literal, and a Basic literal an untyped constant; a `bool` constant is a bool, as C's bool is Basic's. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as CCPP } from "../Dialects/Ccpp/Expressions.js";
import { Inline, Pairwise, Pattern, Rule, renames } from "../Framework/Translators.js";
import { Basic, Ccpp, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(BASIC, CCPP, [
  new Rule(Basic.literal(V), Ccpp.constant(V)),
  new Rule(Basic.literal(value(Boolean)), new Pattern("ccpp_constant", { value: value(Boolean), type: "bool" }), "backward"),
  new Rule(Basic.variable, Ccpp.identifier),
  new Inline("let", "left"),
  new Rule(Basic.get, Ccpp.get),
  new Rule(Basic.implies, Ccpp.implies, "forward"),
  ...renames("call", "callable", "ccpp_binary", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*", bitand: "&",
    bitor: "|", bitxor: "^", shl: "<<", shr: ">>" }, 2),
  ...renames("call", "callable", "ccpp_unary", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
]);
