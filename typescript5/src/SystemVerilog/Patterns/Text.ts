/** Text of the SystemVerilog Patterns dialect: how its kinds are written, as mbse-programs' printer writes patterns
 * (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`, `pattern_text`), which the family's printer
 * (`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`;
 * `PRECEDENCE`, none but a primary's, since a pattern stands only where a pattern does, never an operand; and `INLINE`,
 * none. A variable is written `.name`, a wildcard `.*`, a tagged pattern `tagged member pattern`, a structure pattern
 * `'{a, b}` or `'{m: a, n: b}`, a parenthesized one `(pattern)`, and a constant pattern as the expression it is. `ToText`
 * writes a term of the family, as `Expressions.Text.ToText` does. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as F from "../../Framework/Terms.js";
import type { Printer } from "../Expressions/Text.js";
import * as P from "./Expressions.js";

export { ToText } from "../Expressions/Text.js";

/** `tagged member pattern`, or `tagged member` where it has no pattern. */
function tagged(p: Printer, node: F.Node): string {
  const pattern = node.subterms.get("pattern") ?? null;
  return `tagged ${p.spelling(node.helpers.get("member"))}${pattern !== null ? ` ${p.text(pattern)}` : ""}`;
}

/** How each of its kinds is written. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => string> = new Map<string, (p: Printer, n: F.Node) => string>([
  [P.VARIABLEPATTERN, (p, n) => `.${p.spelling(n.helpers.get("name"))}`],
  [P.WILDCARDPATTERN, () => ".*"],
  [P.TAGGEDPATTERN, tagged],
  [P.STRUCTUREPATTERN, (p, n) => "'{" + n.many.map((item) => p.text(item)).join(", ") + "}"],
  [P.PATTERNMEMBER, (p, n) => `${p.spelling(n.helpers.get("name"))}: ${p.text(n.subterms.get("pattern"))}`],
  [P.PARENTHESIZEDPATTERN, (p, n) => `(${p.text(n.subterms.get("pattern"))})`],
]);

/** Each of its kinds' precedence, where it is not a primary's: none. */
export const PRECEDENCE: ReadonlyMap<string, any> = new Map();

/** How `randomize() with` writes its kinds among its constraints, where not as written: none. */
export const INLINE: ReadonlyMap<string, (p: Printer, n: F.Node, written: string) => string> = new Map();
