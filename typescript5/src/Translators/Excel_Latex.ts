/** Excel <-> Latex. Excel's operators are LaTeX's, `AND`, `OR` and `NOT` are `\land`, `\lor` and `\lnot`, a field is
 * a member, `NOT(ISERROR(x.name))` is `\operatorname{has}`, `IF(a, b, TRUE)` is `a \implies b`, and `LET` is `where`.
 * Cells and other `IF`s have no LaTeX counterpart here. */

import { DIALECT as EXCEL } from "../Dialects/Excel/Expressions.js";
import { DIALECT as LATEX } from "../Dialects/Latex/Expressions.js";
import { Pairwise, Rule, renames } from "../Framework/Translators.js";
import { Excel, Latex, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(EXCEL, LATEX, [
  new Rule(Excel.constant(V), Latex.constant(V)),
  new Rule(Excel.name, Latex.symbol),
  new Rule(Excel.let, Latex.where),
  new Rule(Excel.get, Latex.get),
  new Rule(Excel.has, Latex.has),
  new Rule(Excel.implies, Latex.implies),
  ...renames("infix", "operator", "binary", "operator", {
    "=": "=", "<>": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq", "+": "+", "-": "-", "*": "\\cdot" }, 2),
  ...renames("function", "name", "binary", "operator", { AND: "\\land", OR: "\\lor" }, 2),
  ...renames("function", "name", "unary", "operator", { NOT: "\\lnot" }, 1),
  ...renames("prefix", "operator", "unary", "operator", { "-": "-" }, 1),
]);
