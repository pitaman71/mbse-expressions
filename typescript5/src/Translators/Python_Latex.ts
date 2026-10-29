/** Python <-> Latex. Python's operators are LaTeX's, `a / b` is `\frac{a}{b}`, an attribute is a member, `hasattr` is
 * `\operatorname{has}`, `b if a else True` is `a \implies b`, and a let is `where`. Other conditional expressions have
 * no LaTeX counterpart here, and Python's imports, which notation cannot declare, are dropped. */

import { DIALECT as LATEX } from "../Dialects/Latex/Expressions.js";
import { DIALECT as PYTHON } from "../Dialects/Python/Expressions.js";
import { Elide, type Hole, Pairwise, Pattern as P, Rule, holes, renames } from "../Framework/Translators.js";
import { Latex, Python, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);
const [A, B] = holes("A", "B") as [Hole, Hole];

export const TRANSLATOR = new Pairwise(PYTHON, LATEX, [
  new Rule(Python.constant(V), Latex.constant(V)),
  new Rule(Python.name, Latex.symbol),
  new Rule(Python.let, Latex.where),
  new Elide("python_import", "left"),
  new Elide("python_importfrom", "left"),
  new Rule(Python.get, Latex.get),
  new Rule(Python.has, Latex.has),
  new Rule(Python.implies, Latex.implies),
  new Rule(new P("python_binop", { operator: "/" }, A, B), Latex.frac),
  ...renames("python_compare", "operator", "latex_binary", "operator", {
    "==": "=", "!=": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq" }, 2),
  ...renames("python_boolop", "operator", "latex_binary", "operator", { and: "\\land", or: "\\lor" }, 2),
  ...renames("python_binop", "operator", "latex_binary", "operator", { "+": "+", "-": "-", "*": "\\cdot" }, 2),
  ...renames("python_unaryop", "operator", "latex_unary", "operator", { not: "\\lnot", "-": "-" }, 1),
]);
