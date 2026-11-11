/** Patterns <-> SystemVerilog. Patterns operations are SystemVerilog's operators (`binaryexpression`,
 * `unaryexpression`), `implies` its `->`, `shr` its arithmetic `>>>`, `get` a member (`x.name`), a variable a name used
 * as a value (a `nameexpression` of its identifier), and a bool `1'b1` or `1'b0`. SystemVerilog has no let expression, so lets are inlined: a let's
 * translated value is shared by every use of its name. It has no `has`, and the logical `>>` and the 4-state comparisons
 * (`===`, `==?`) have no Patterns counterpart yet.
 *
 * Collections are arrays, and their operations array methods: `all` and `any` are `xs.and(p) with (body)` and
 * `xs.or(p) with (body)`, the quantifier `count` is `xs.sum(p) with (int'(body))`, `count(xs)` is `xs.size()`, `sum(xs)`
 * is `xs.sum()`, `min(xs)` and `max(xs)` are `xs.min()[0]` and `xs.max()[0]`, `item(xs, i)` is `xs[i]`, and `in(x, xs)`
 * is `x inside {xs}`. `unique(xs)` is written `xs.unique().size() == xs.size()`, which does not read back as `unique`,
 * and `entries` has no counterpart.
 *
 * A constant other than a bool's (`8'd200`, `12'habc`, `4'b10xz`, `'1`), and a based literal (`'hff`), have no Patterns
 * counterpart yet: a term carries no domain, and the conversions of typed literals wait for domain inference (mbse-basis
 * [CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)). A bool is a single bit, `1'b1` or
 * `1'b0`, and back a constant without a base of a single 0 or 1, sized 1, is a bool. Patterns' container constructors,
 * `list` and `mapping`, have no counterpart, and neither has any other kind of SystemVerilog's, or of its family's other
 * dialects, each refused by name. */

import { DIALECT as PATTERNS } from "../Patterns/Expressions/Expressions.js";
import { DIALECT as SYSTEMVERILOG } from "../SystemVerilog/Expressions/Expressions.js";
import { Inline, Pairwise, Pattern, Rule, renames } from "../Framework/Translators.js";
import { Patterns, SystemVerilog, value } from "./_Patterns.js";

const V = value(BigInt, Number, String);

export const TRANSLATOR = new Pairwise(PATTERNS, SYSTEMVERILOG, [
  new Rule(Patterns.literal(V), SystemVerilog.literal(V)),
  new Rule(new Pattern("literal", { value: true }), new Pattern("constant", { bits: "1", size: 1n })),
  new Rule(new Pattern("literal", { value: false }), new Pattern("constant", { bits: "0", size: 1n })),
  new Rule(Patterns.variable, SystemVerilog.identifier),
  new Inline("let", "left"),
  new Rule(Patterns.get, SystemVerilog.get),
  new Rule(Patterns.implies, SystemVerilog.implies),
  ...renames("call", "callable", "binaryexpression", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*", bitand: "&",
    bitor: "|", bitxor: "^", shl: "<<", shr: ">>>" }, 2),
  ...renames("call", "callable", "unaryexpression", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
  new Rule(Patterns.quantifier("all"), SystemVerilog.iterate("and")),
  new Rule(Patterns.quantifier("any"), SystemVerilog.iterate("or")),
  new Rule(Patterns.quantifier("count"), SystemVerilog.count_where),
  new Rule(Patterns.unary("count"), SystemVerilog.method("size")),
  new Rule(Patterns.unary("sum"), SystemVerilog.method("sum")),
  ...["min", "max"].map((name) => new Rule(Patterns.unary(name), SystemVerilog.locate(name))),
  new Rule(Patterns.item, SystemVerilog.select),
  new Rule(Patterns.in_, SystemVerilog.inside),
  new Rule(Patterns.unary("unique"), SystemVerilog.unique, "forward"),
]);
