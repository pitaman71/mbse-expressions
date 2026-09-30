/** Matlab <-> Latex. MATLAB's operators are LaTeX's, a field is a member, and `isfield` is `\operatorname{has}`.
 * `a \implies b` is written `~a || b`, which translates back as `\lnot a \lor b`. MATLAB has no let expression, so a
 * `where` is inlined: its translated value is shared by every use of its name. MATLAB's imports are dropped. */

import { DIALECT as LATEX } from "../Dialects/Latex/Expressions.js";
import { DIALECT as MATLAB } from "../Dialects/Matlab/Expressions.js";
import { Elide, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Latex, Matlab, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(MATLAB, LATEX, [
  new Rule(Matlab.constant(V), Latex.constant(V)),
  new Rule(Matlab.identifier, Latex.symbol),
  new Inline("where", "right"),
  new Elide("import", "left"),
  new Rule(Matlab.get, Latex.get),
  new Rule(Matlab.has, Latex.has),
  new Rule(Matlab.implies, Latex.implies, "backward"),
  ...renames("binary", "operator", "binary", "operator", {
    "==": "=", "~=": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq", "&&": "\\land", "||": "\\lor",
    "+": "+", "-": "-", ".*": "\\cdot" }, 2),
  ...renames("unary", "operator", "unary", "operator", { "~": "\\lnot", "-": "-" }, 1),
]);
