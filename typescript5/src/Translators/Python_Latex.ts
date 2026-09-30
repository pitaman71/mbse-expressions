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
  new Elide("import", "left"),
  new Elide("importfrom", "left"),
  new Rule(Python.get, Latex.get),
  new Rule(Python.has, Latex.has),
  new Rule(Python.implies, Latex.implies),
  new Rule(new P("binop", { operator: "/" }, A, B), Latex.frac),
  ...renames("compare", "operator", "binary", "operator", {
    "==": "=", "!=": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq" }, 2),
  ...renames("boolop", "operator", "binary", "operator", { and: "\\land", or: "\\lor" }, 2),
  ...renames("binop", "operator", "binary", "operator", { "+": "+", "-": "-", "*": "\\cdot" }, 2),
  ...renames("unaryop", "operator", "unary", "operator", { not: "\\lnot", "-": "-" }, 1),
]);
