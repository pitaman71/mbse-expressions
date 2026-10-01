/** Basic <-> SystemVerilog. Basic operations are SystemVerilog's operators, `implies` its `->`, `shr` its arithmetic
 * `>>>`, `get` a member, and a bool `1'b1` or `1'b0`. SystemVerilog has no let expression, so lets are inlined: a let's
 * translated value is shared by every use of its name. It has no `has`; its sized vectors other than single bits, the
 * logical `>>` and the 4-state comparisons (`===`, `==?`) have no Basic counterpart yet, nor Basic's literals of value
 * domains a SystemVerilog one. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as SYSTEMVERILOG } from "../Dialects/SystemVerilog/Expressions.js";
import { Inline, Pairwise, Pattern, Rule, renames } from "../Framework/Translators.js";
import { Basic, SystemVerilog, value } from "./_Patterns.js";

const V = value(BigInt, Number, String);

export const TRANSLATOR = new Pairwise(BASIC, SYSTEMVERILOG, [
  new Rule(Basic.literal(V), SystemVerilog.constant(V)),
  new Rule(new Pattern("literal", { value: true }), new Pattern("vector", { value: "1" })),
  new Rule(new Pattern("literal", { value: false }), new Pattern("vector", { value: "0" })),
  new Rule(Basic.variable, SystemVerilog.identifier),
  new Inline("let", "left"),
  new Rule(Basic.get, SystemVerilog.get),
  new Rule(Basic.implies, SystemVerilog.implies),
  ...renames("operation", "name", "binary", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*", bitand: "&",
    bitor: "|", bitxor: "^", shl: "<<", shr: ">>>" }, 2),
  ...renames("operation", "name", "unary", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
]);
