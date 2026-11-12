/** Text of the SystemVerilog Preprocessor dialect: how its kinds are written, as mbse-programs' printer writes them
 * (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`), which the family's printer (`Expressions.Text.ToText`)
 * dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`; `PRECEDENCE`, none but a
 * primary's; and `INLINE`, how `randomize() with` writes its kinds among its constraints, where not as written. `ToText`
 * writes a term of the family, as `Expressions.Text.ToText` does.
 *
 * A macro usage is written `` `name `` or `` `name(arguments) ``; a directive at the start of its line, as mbse-programs'
 * layout has it: a conditional directive one line for each of its `` `ifdef ``, `` `elsif ``, `` `else `` and
 * `` `endif ``, each branch's items on the lines between, as written, an expression held as a constraint ended by `;`;
 * disabled text and any other directive as written. A comment is `//text` or `/*text*\/`. Among the constraints of
 * `randomize() with`, which are written on one line, a line comment, or a directive, ends its line (`INLINE`). */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors } from "@mbse/schemas/Framework";

import type * as F from "../../Framework/Terms.js";
import * as E from "../Expressions/Expressions.js";
import type { Printer } from "../Expressions/Text.js";
import * as P from "./Expressions.js";

export { ToText } from "../Expressions/Text.js";

const { ValueError } = Errors;

/** The kinds an expression held as a constraint is, ended by `;` among a branch's items: `Expressions`' and
 * `Constraints`' `distexpression`, as mbse-programs writes an `ExpressionConstraint` of one. */
const HELD: readonly string[] = [...E.TAGS, "distexpression"];

/** A conditional directive's macro's name, or its condition. */
function condition(p: Printer, node: F.Node, kind: string): string {
  if (node.helpers.has("name")) return p.spelling(node.helpers.get("name"));
  const written = node.subterms.get("condition") ?? null;
  if (written === null) throw new ValueError(`SystemVerilog Preprocessor ${kind} has no name or condition to print`);
  return p.text(written);
}

/** A branch's items, each on its own lines, as written: an expression held as a constraint ended by `;`. */
function branch(p: Printer, items: readonly any[]): string[] {
  const lines: string[] = [];
  for (const item of items) {
    const written = p.text(item);
    lines.push(...(HELD.includes(p.node(item).kind) ? written + ";" : written).split("\n"));
  }
  return lines;
}

/** A helper container's nodes: none where it is absent. */
const nodes = (value: unknown): readonly F.Node[] => (value as readonly F.Node[] | undefined) ?? [];

/** `` `ifdef name ``, or `` `ifndef ``, its items, each `` `elsif `` and its items, `` `else `` and its items where it
 * has one (`has_else`), and `` `endif ``, each on its own line. */
function ifdef(p: Printer, n: F.Node): string {
  const lines = [`\`${n.attributes.get("negated") ? "ifndef" : "ifdef"} ${condition(p, n, P.IFDEFDIRECTIVE)}`,
    ...branch(p, n.lists.get("items") as readonly any[])];
  for (const elsif of nodes(n.helpers.get("branches"))) {
    lines.push(`\`elsif ${condition(p, elsif, "elsifdirective")}`, ...branch(p, elsif.many));
  }
  if (n.attributes.get("has_else")) lines.push("`else", ...branch(p, n.lists.get("alternative") as readonly any[]));
  return [...lines, "`endif"].join("\n");
}

/** `` `define name body ``, or `` `define name(parameters) body `` where function-like. */
function define(p: Printer, n: F.Node): string {
  const parameters = n.attributes.get("function_like")
    ? "(" + nodes(n.helpers.get("parameters")).map((i) => p.spelling(i)).join(", ") + ")" : "";
  const body = n.attributes.get("body");
  return `\`define ${p.spelling(n.helpers.get("name"))}${parameters}` + (body ? ` ${body}` : "");
}

/** How each of its kinds is written. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => string> = new Map<string, (p: Printer, n: F.Node) => string>([
  [P.MACROUSAGE, (p, n) => "`" + p.spelling(n.helpers.get("name"))
    + (n.attributes.has("arguments") ? `(${n.attributes.get("arguments")})` : "")],
  [P.INCLUDEDIRECTIVE, (p, n) => n.attributes.get("system") ? `\`include <${n.attributes.get("path")}>`
    : `\`include "${n.attributes.get("path")}"`],
  [P.DEFINEDIRECTIVE, define],
  [P.UNDEFDIRECTIVE, (p, n) => `\`undef ${p.spelling(n.helpers.get("name"))}`],
  [P.TIMESCALEDIRECTIVE, (p, n) => `\`timescale ${n.attributes.get("unit")} / ${n.attributes.get("precision")}`],
  [P.DEFAULTNETTYPEDIRECTIVE, (p, n) => `\`default_nettype ${n.attributes.get("net_type")}`],
  [P.IFDEFDIRECTIVE, ifdef],
  [P.DISABLEDTEXT, (p, n) => n.attributes.get("text")],
  [P.OTHERDIRECTIVE, (p, n) => n.attributes.get("text")],
  [P.COMMENT, (p, n) => {
    const words = n.attributes.get("text") ?? "";
    return n.attributes.get("block") ? `/*${words}*/` : `//${words}`;
  }],
]);

/** Each of its kinds' precedence, where it is not a primary's: none. */
export const PRECEDENCE: ReadonlyMap<string, any> = new Map();

/** How `randomize() with` writes its kinds among its constraints, where not as written: a directive on lines of its
 * own, and a line comment ending its line. */
export const INLINE: ReadonlyMap<string, (p: Printer, n: F.Node, written: string) => string> = new Map([
  ...P.DIRECTIVES.map((tag): [string, (p: Printer, n: F.Node, written: string) => string] =>
    [tag, (_p, _n, written) => "\n" + written + "\n"]),
  [P.COMMENT, (_p: Printer, n: F.Node, written: string) => written + (n.attributes.get("block") ? "" : "\n")],
]);
