/** Text of the SystemVerilog Preprocessor dialect: how its kinds are written, as mbse-programs' printer writes them
 * (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`), which the family's printer (`Expressions.Text.ToText`)
 * dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node` (a macro usage as `` `name `` or
 * `` `name(arguments) ``); `PRECEDENCE`, none but a primary's; and `INLINE`, how `randomize() with` writes its kinds
 * among its constraints where not as written (a line comment, a directive, each ending its line). `ToText` writes a term
 * of the family, as `Expressions.Text.ToText` does. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as F from "../../Framework/Terms.js";
import type { Printer } from "../Expressions/Text.js";
import * as P from "./Expressions.js";

export { ToText } from "../Expressions/Text.js";

/** How each of its kinds is written. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => string> = new Map([
  [P.MACROUSAGE, (p: Printer, n: F.Node) => "`" + p.spelling(n.helpers.get("name"))
    + (n.attributes.has("arguments") ? `(${n.attributes.get("arguments")})` : "")],
]);

/** Each of its kinds' precedence, where it is not a primary's: none. */
export const PRECEDENCE: ReadonlyMap<string, any> = new Map();

/** How `randomize() with` writes its kinds among its constraints, where not as written. */
export const INLINE: ReadonlyMap<string, (p: Printer, n: F.Node, written: string) => string> = new Map();
