/** Text of the SystemVerilog Constraints dialect: how its kinds are written, as mbse-programs' printer writes them
 * (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`, `constraint_text` and `DistExpression`'s), which the
 * family's printer (`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its
 * `Terms.Node`; `PRECEDENCE`, a distribution's, a relational operator's; and `INLINE`, how `randomize() with` writes a
 * distribution held as a constraint, ended by `;`, as `Expressions`' kinds are. A constraint is written on one line, as
 * `randomize() with` writes its constraints, its block's items as the printer's `inline` writes them
 * (`{ x > 0; y < 2; }`); a constraint declaration, whose layout spans lines, is an item, mbse-programs'. `ToText`
 * writes a term of the family, as `Expressions.Text.ToText` does. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as F from "../../Framework/Terms.js";
import * as XT from "../Expressions/Text.js";
import type { Printer } from "../Expressions/Text.js";
import * as C from "./Expressions.js";

export { ToText } from "../Expressions/Text.js";

function nodes(value: unknown): readonly F.Node[] {
  return (value ?? []) as readonly F.Node[];
}

/** `if (condition) consequence`, and ` else alternative` where it has one. */
function conditional(p: Printer, node: F.Node): string {
  const alternative = node.slots.get("alternative") ?? null;
  const written = alternative !== null ? ` else ${p.text(alternative)}` : "";
  return `if (${p.text(node.slots.get("condition"))}) ${p.text(node.slots.get("consequence"))}${written}`;
}

/** `foreach (array[variables]) body`, a dimension it skips written empty (`q[, j]`). */
function foreach(p: Printer, node: F.Node): string {
  const variables = nodes(node.helpers.get("variables")).map((v) => v.kind === "emptyargument" ? "" : p.spelling(v)).join(", ");
  return `foreach (${p.text(node.slots.get("value"))}[${variables}]) ${p.text(node.slots.get("body"))}`;
}

/** A distribution's item: its value, or `default`, and its operator and weight where it has them. */
function item(p: Printer, node: F.Node): string {
  const value = node.slots.get("value") ?? null;
  const weight = node.attributes.has("operator") ? ` ${node.attributes.get("operator")} ${p.text(node.slots.get("weight"))}` : "";
  return (value === null ? "default" : p.text(value)) + weight;
}

/** `value dist { items }`. */
function dist(p: Printer, node: F.Node): string {
  const items = nodes(node.helpers.get("items")).map((i) => item(p, i)).join(", ");
  return `${p.operand(node.slots.get("value"), XT.RELATIONAL)} dist {${items}}`;
}

/** How each of its kinds is written. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => string> = new Map<string, (p: Printer, n: F.Node) => string>([
  [C.CONSTRAINTBLOCK, (p, n) => p.inline(n.many)],
  [C.EXPRESSIONCONSTRAINT, (p, n) => `${n.attributes.get("soft") ? "soft " : ""}${p.text(n.slots.get("expression"))};`],
  [C.IMPLICATIONCONSTRAINT, (p, n) => `${p.operand(n.slots.get("condition"), XT.IMPLY + 1)} -> ${p.text(n.slots.get("body"))}`],
  [C.CONDITIONALCONSTRAINT, conditional],
  [C.FOREACHCONSTRAINT, foreach],
  [C.DISABLESOFTCONSTRAINT, (p, n) => `disable soft ${p.text(n.slots.get("target"))};`],
  [C.UNIQUECONSTRAINT, (p, n) => `unique {${n.many.map((r) => p.text(r)).join(", ")}};`],
  [C.DISTEXPRESSION, dist],
]);

/** Each of its kinds' precedence, where it is not a primary's: a distribution's, as `inside`'s, a relational
 * operator's. */
export const PRECEDENCE: ReadonlyMap<string, any> = new Map([
  [C.DISTEXPRESSION, (_node: F.Node, _written: string) => XT.RELATIONAL]]);

/** How `randomize() with` writes its kinds among its constraints, where not as written: a distribution held as a
 * constraint, ended by `;`, as `Expressions`' kinds are. */
export const INLINE: ReadonlyMap<string, (p: Printer, n: F.Node, written: string) => string> = new Map([
  [C.DISTEXPRESSION, (_p: Printer, _n: F.Node, written: string) => written + ";"]]);
