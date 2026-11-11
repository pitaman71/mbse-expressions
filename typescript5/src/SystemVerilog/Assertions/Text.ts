/** Text of the SystemVerilog Assertions dialect: how its kinds are written, as mbse-programs' printer writes them
 * (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`), which the family's printer (`Expressions.Text.ToText`)
 * dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`; `PRECEDENCE`, each kind's
 * precedence where it is not a primary's; and `INLINE`, how `randomize() with` writes its kinds among its constraints
 * where not as written. `ToText` writes a term of the family, as `Expressions.Text.ToText` does. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as F from "../../Framework/Terms.js";
import type { Printer } from "../Expressions/Text.js";

export { ToText } from "../Expressions/Text.js";

/** How each of its kinds is written. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => string> = new Map();

/** Each of its kinds' precedence, where it is not a primary's. */
export const PRECEDENCE: ReadonlyMap<string, any> = new Map();

/** How `randomize() with` writes its kinds among its constraints, where not as written. */
export const INLINE: ReadonlyMap<string, (p: Printer, n: F.Node, written: string) => string> = new Map();
