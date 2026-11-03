/** Patterns <-> C, and the rules Patterns <-> Cpp shares (`RULES`, over the kinds of the C family). Patterns operations
 * are C's operators, `get` a member (`x.name`), and `implies(a, b)` is written
 * `!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's translated
 * value is shared by every use of its name. C has no `has`, and no container constructor.
 * 
 * A C constant of a type of its own (`5u`, `1.5f`, `(uint8_t)5`) has no Patterns counterpart yet: a term carries no domain,
 * and the conversions of typed literals wait for domain inference (the port's stage 3, Decided, 2). An untyped constant is
 * a Patterns literal, and a Patterns literal an untyped constant; a `bool` constant is a bool, as C's bool is Patterns'. */

import { DIALECT as C_DIALECT } from "../Dialects/C/Expressions.js";
import { DIALECT as PATTERNS } from "../Dialects/Patterns/Expressions.js";
import { Inline, Pairwise, Pattern, Rule, renames } from "../Framework/Translators.js";
import { CFamily, Patterns, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

/** The rules between Patterns and the kinds of the C family, one set for C and for C++ (the proposal's question 9). */
export const RULES: readonly (Rule | Inline)[] = [
  new Rule(Patterns.literal(V), CFamily.constant(V)),
  new Rule(Patterns.literal(value(Boolean)), new Pattern("constant", { value: value(Boolean), type: "bool" }), "backward"),
  new Rule(Patterns.variable, CFamily.identifier),
  new Inline("let", "left"),
  new Rule(Patterns.get, CFamily.get),
  new Rule(Patterns.implies, CFamily.implies, "forward"),
  ...renames("call", "callable", "binary", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*", bitand: "&",
    bitor: "|", bitxor: "^", shl: "<<", shr: ">>" }, 2),
  ...renames("call", "callable", "unary", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
];

export const TRANSLATOR = new Pairwise(PATTERNS, C_DIALECT, RULES);
