/** Patterns <-> C, and the rules Patterns <-> Cpp shares (`RULES`, over the kinds of the C family). Patterns
 * operations are C's operators (`binaryexpression`, `unaryexpression`), `get` a member (`x.name`), and `implies(a, b)` is
 * written `!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's
 * translated value is shared by every use of its name. C has no `has`, and no container constructor.
 *
 * A C literal of a type of its own (`5u`, `1.5f`, `L'a'`: a suffix or a prefix), or a cast (`(uint8_t)5`), has no
 * Patterns counterpart yet: a term carries no domain, and the conversions of typed literals wait for domain inference
 * (mbse-basis [CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)). Any other literal is
 * a Patterns literal, its spelling (its text, quote, base and digit separators) aside, and a Patterns literal a C literal
 * of the same value; C23's `bool` is Patterns'. Every other kind of C's has no counterpart, and is refused by name. */

import { DIALECT as C_DIALECT } from "../Dialects/C/Expressions.js";
import { DIALECT as PATTERNS } from "../Dialects/Patterns/Expressions.js";
import { Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { CFamily, Patterns, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

/** The rules between Patterns and the C family, C's and C++'s alike (the proposal's question 9). */
export const RULES: readonly (Rule | Inline)[] = [
  new Rule(Patterns.literal(V), CFamily.literal(V)),
  new Rule(Patterns.variable, CFamily.identifier),
  new Inline("let", "left"),
  new Rule(Patterns.get, CFamily.member),
  new Rule(Patterns.implies, CFamily.implies, "forward"),
  ...renames("call", "callable", "binaryexpression", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*",
    bitand: "&", bitor: "|", bitxor: "^", shl: "<<", shr: ">>" }, 2),
  ...renames("call", "callable", "unaryexpression", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
];

export const TRANSLATOR = new Pairwise(PATTERNS, C_DIALECT, RULES);
