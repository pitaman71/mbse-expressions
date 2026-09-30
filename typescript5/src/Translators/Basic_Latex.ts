/** Basic <-> Latex. Basic's operations are LaTeX's operators (`\geq`, `\land`, `\implies`, `\cdot`, ...), `get` is a
 * member, `has` is `\operatorname{has}`, and a let is `where`. Every Basic expression without bytes round-trips.
 * LaTeX has no bytes. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as LATEX } from "../Dialects/Latex/Expressions.js";
import { Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Basic, Latex, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(BASIC, LATEX, [
  new Rule(Basic.literal(V), Latex.constant(V)),
  new Rule(Basic.variable, Latex.symbol),
  new Rule(Basic.let, Latex.where),
  new Rule(Basic.get, Latex.get),
  new Rule(Basic.has, Latex.has),
  new Rule(Basic.implies, Latex.implies),
  ...renames("operation", "name", "binary", "operator", {
    eq: "=", ne: "\\neq", lt: "<", le: "\\leq", gt: ">", ge: "\\geq", and: "\\land", or: "\\lor",
    add: "+", sub: "-", mul: "\\cdot" }, 2),
  ...renames("operation", "name", "unary", "operator", { not: "\\lnot", neg: "-" }, 1),
]);
