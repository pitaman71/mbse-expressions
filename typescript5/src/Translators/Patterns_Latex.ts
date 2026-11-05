/** Patterns <-> LaTeX. Patterns' operations are LaTeX's operators (`\geq`, `\land`, `\implies`, `\cdot`, ...), `get` is a
 * member, `has` is `\operatorname{has}`, and a let is `where`. Every Patterns expression without bytes or container
 * constructors round-trips: LaTeX has no bytes, and Patterns' `list` and `mapping` have no counterpart. */

import { DIALECT as PATTERNS } from "../Framework/Patterns/Expressions.js";
import { DIALECT as LATEX } from "../LaTeX/Expressions/Expressions.js";
import { Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Patterns, Latex, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(PATTERNS, LATEX, [
  new Rule(Patterns.literal(V), Latex.constant(V)),
  new Rule(Patterns.variable, Latex.symbol),
  new Rule(Patterns.let, Latex.where),
  new Rule(Patterns.get, Latex.get),
  new Rule(Patterns.has, Latex.has),
  new Rule(Patterns.implies, Latex.implies),
  ...renames("call", "callable", "binary", "operator", {
    eq: "=", ne: "\\neq", lt: "<", le: "\\leq", gt: ">", ge: "\\geq", and: "\\land", or: "\\lor",
    add: "+", sub: "-", mul: "\\cdot" }, 2),
  ...renames("call", "callable", "unary", "operator", { not: "\\lnot", neg: "-" }, 1),
]);
