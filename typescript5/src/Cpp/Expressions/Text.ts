/** Text of the Cpp dialect: `ToText(expression)` is a term of C++ as C++ source, as C's printer writes the kinds of
 * the C family (`C.Text.text`). */

import { text } from "../../C/Expressions/Text.js";
import { DIALECT } from "./Expressions.js";

/** The expression as C++ source, parenthesized only where precedence requires. */
export function ToText(expression: unknown): string {
  return text(expression, DIALECT);
}
