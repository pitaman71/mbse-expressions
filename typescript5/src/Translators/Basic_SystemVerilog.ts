/** Basic <-> SystemVerilog. Basic operations are SystemVerilog's operators, `implies` its `->`, `shr` its arithmetic
 * `>>>`, `get` a member, and a bool `1'b1` or `1'b0`. SystemVerilog has no let expression, so lets are inlined: a let's
 * translated value is shared by every use of its name. It has no `has`, and the logical `>>` and the 4-state
 * comparisons (`===`, `==?`) have no Basic counterpart yet.
 *
 * Collections are arrays, and their operations array methods: `all` and `any` are `xs.and(p) with (body)` and
 * `xs.or(p) with (body)`, the quantifier `count` is `xs.sum(p) with (int'(body))`, `count(xs)` is `xs.size()`,
 * `sum(xs)` is `xs.sum()`, `min(xs)` and `max(xs)` are `xs.min()[0]` and `xs.max()[0]`, `item(xs, i)` is `xs[i]`, and
 * `in(x, xs)` is `x inside {xs}`. `unique(xs)` is written `xs.unique().size() == xs.size()`, which does not read back
 * as `unique`, and `entries` has no counterpart.
 *
 * A sized vector other than a bool's (`8'd200`, `12'habc`, `4'b10xz`) has no Basic counterpart yet: a term carries no
 * domain, and the conversions of typed literals wait for type inference (the port's stage 3, Decided, 2). A bool is a
 * single bit, `1'b1` or `1'b0`, and back a vector without a base of a single 0 or 1 is a bool. Basic's container
 * constructors, `list` and `mapping`, have no counterpart. */

import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as SYSTEMVERILOG } from "../Dialects/SystemVerilog/Expressions.js";
import { Inline, Pairwise, Pattern, Rule, renames } from "../Framework/Translators.js";
import { Basic, SystemVerilog, value } from "./_Patterns.js";

const V = value(BigInt, Number, String);

export const TRANSLATOR = new Pairwise(BASIC, SYSTEMVERILOG, [
  new Rule(Basic.literal(V), SystemVerilog.constant(V)),
  new Rule(new Pattern("literal", { value: true }), new Pattern("systemverilog_vector", { value: "1" })),
  new Rule(new Pattern("literal", { value: false }), new Pattern("systemverilog_vector", { value: "0" })),
  new Rule(Basic.variable, SystemVerilog.identifier),
  new Inline("let", "left"),
  new Rule(Basic.get, SystemVerilog.get),
  new Rule(Basic.implies, SystemVerilog.implies),
  ...renames("call", "callable", "systemverilog_binary", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*", bitand: "&",
    bitor: "|", bitxor: "^", shl: "<<", shr: ">>>" }, 2),
  ...renames("call", "callable", "systemverilog_unary", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
  new Rule(Basic.quantifier("all"), SystemVerilog.iterate("and")),
  new Rule(Basic.quantifier("any"), SystemVerilog.iterate("or")),
  new Rule(Basic.quantifier("count"), SystemVerilog.count_where),
  new Rule(Basic.unary("count"), SystemVerilog.method("size")),
  new Rule(Basic.unary("sum"), SystemVerilog.method("sum")),
  ...["min", "max"].map((name) => new Rule(Basic.unary(name), SystemVerilog.locate(name))),
  new Rule(Basic.item, SystemVerilog.select),
  new Rule(Basic.in_, SystemVerilog.inside),
  new Rule(Basic.unary("unique"), SystemVerilog.unique, "forward"),
]);
