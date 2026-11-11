/**
 * Text of the Python Types dialect: how its kinds are written, as mbse-programs' printer writes type parameters
 * (`mbse:mbse-programs/python3/mbse/Programs/Python/_Printer.py`, `type_var`), which the family's printer
 * (`Python3.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`, giving
 * its text and its precedence, a primary's. A type variable is written `T`, `T: bound`, `T = default` or `T: bound =
 * default`, a parameter specification `**P` and a type variable tuple `*Ts`, each with its default; a bound or a
 * default is written as an expression where an element of a display stands, a type expression of `Python3`'s kinds as
 * `Python3` writes it. `ToText` writes a term of the family, as `Python3.Text.ToText` does.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as F from "../../Framework/Terms.js";
import * as X from "../Python3/Text.js";
import type { Printer, Written } from "../Python3/Text.js";
import * as T from "./Expressions.js";

export { ToText } from "../Python3/Text.js";

/** A type parameter's writer: its stars, its name, its bound, where it has one, and its default, where it has one. */
function parameter(star: string): (p: Printer, node: F.Node) => Written {
  return (p, node) => {
    const [bound, defaultValue] = [node.slots.get("bound") ?? null, node.slots.get("default_value") ?? null];
    let text = star + (node.attributes.get("name") ?? "");
    text += bound === null ? "" : `: ${p.element(bound)}`;
    return [text + (defaultValue === null ? "" : ` = ${p.element(defaultValue)}`), X.PRIMARY];
  };
}

/** How each of its kinds is written, and its precedence. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => Written> = new Map([
  [T.TYPEVAR, parameter("")],
  [T.PARAMSPEC, parameter("**")],
  [T.TYPEVARTUPLE, parameter("*")],
]);
