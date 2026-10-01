/** Basic <-> Python, in two styles.
 *
 * `TRANSLATOR` writes Python's operators: `get` is an attribute, `has` is `hasattr`, `implies(a, b)` is `b if a else
 * True`, and a let is `(lambda name: body)(value)`. `NUMPY` writes NumPy's functions, for columns of values: `get` is
 * a subscript, `has` is a test that the subscript is not masked, operations are numpy functions (`np.greater_equal`),
 * and `implies(a, b)` is `np.where(a, b, True)`; it adds `import numpy as np`, which it drops translating back. Each
 * reads back its own style. The bitwise operations are Python's (`&`, `|`, `^`, `~`, `<<`, `>>`), or NumPy's
 * functions. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as PYTHON } from "../Dialects/Python/Expressions.js";
import { Elide, Pairwise, Prelude, Rule, renames } from "../Framework/Translators.js";
import { Basic, Numpy, Python, value } from "./_Patterns.js";

const V = value(BigInt, Number, String, Boolean, Uint8Array);
const COMMON = [
  new Rule(Basic.literal(V), Python.constant(V)),
  new Rule(Basic.variable, Python.name),
  new Rule(Basic.let, Python.let),
  new Elide("import", "right"),
  new Elide("importfrom", "right"),
];

export const TRANSLATOR = new Pairwise(BASIC, PYTHON, [
  ...COMMON,
  new Rule(Basic.get, Python.get),
  new Rule(Basic.has, Python.has),
  new Rule(Basic.implies, Python.implies),
  ...renames("operation", "name", "compare", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=" }, 2),
  ...renames("operation", "name", "boolop", "operator", { and: "and", or: "or" }, 2),
  ...renames("operation", "name", "binop", "operator", { add: "+", sub: "-", mul: "*" }, 2),
  ...renames("operation", "name", "unaryop", "operator", { not: "not", neg: "-" }, 1),
  ...renames("operation", "name", "binop", "operator", { bitand: "&", bitor: "|", bitxor: "^", shl: "<<", shr: ">>" }, 2),
  ...renames("operation", "name", "unaryop", "operator", { bitnot: "~" }, 1),
]);

export const NUMPY = new Pairwise(BASIC, PYTHON, [
  ...COMMON,
  new Prelude(Numpy.prelude, "right"),
  new Rule(Basic.get, Numpy.get),
  new Rule(Basic.has, Numpy.has),
  new Rule(Basic.implies, Numpy.implies),
  ...Numpy.renames("operation", "name", {
    eq: "equal", ne: "not_equal", lt: "less", le: "less_equal", gt: "greater", ge: "greater_equal",
    and: "logical_and", or: "logical_or", add: "add", sub: "subtract", mul: "multiply", bitand: "bitwise_and",
    bitor: "bitwise_or", bitxor: "bitwise_xor", shl: "left_shift", shr: "right_shift" }, 2),
  ...Numpy.renames("operation", "name", { not: "logical_not", neg: "negative", bitnot: "invert" }, 1),
]);
