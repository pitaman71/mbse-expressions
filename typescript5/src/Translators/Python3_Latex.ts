/** Python3 <-> Latex. Python's operators are LaTeX's, `a / b` is `\frac{a}{b}`, an attribute is a member, `hasattr` is
 * `\operatorname{has}`, `b if a else True` is `a \implies b`, and a let is `where`. Other conditional expressions have
 * no LaTeX counterpart here, and Python's imports, which notation cannot declare, are dropped. */

import { DIALECT as LATEX } from "../Dialects/Latex/Expressions.js";
import { DIALECT as PYTHON3 } from "../Dialects/Python3/Expressions.js";
import { Elide, type Hole, Pairwise, Pattern as P, Rule, holes, renames } from "../Framework/Translators.js";
import { Latex, Python3, compares, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean);
const [A, B] = holes("A", "B") as [Hole, Hole];

export const TRANSLATOR = new Pairwise(PYTHON3, LATEX, [
  new Rule(Python3.constant(V), Latex.constant(V)),
  new Rule(Python3.name, Latex.symbol),
  new Rule(Python3.let, Latex.where),
  new Elide("import", "left"),
  new Elide("importfrom", "left"),
  new Rule(Python3.get, Latex.get),
  new Rule(Python3.has, Latex.has),
  new Rule(Python3.implies, Latex.implies),
  new Rule(new P("binop", { op: "/" }, A, B), Latex.frac),
  ...compares("binary", "operator", {
    "==": "=", "!=": "\\neq", "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq" }),
  ...renames("boolop", "op", "binary", "operator", { and: "\\land", or: "\\lor" }, 2),
  ...renames("binop", "op", "binary", "operator", { "+": "+", "-": "-", "*": "\\cdot" }, 2),
  ...renames("unaryop", "op", "unary", "operator", { not: "\\lnot", "-": "-" }, 1),
]);
