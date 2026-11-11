/** Text of the C Preprocessor dialect: `ToText(expression)` is a term of C Preprocessor (or anything `Terms.term` reads
 * one from) as source, as mbse-programs' printer writes it, through the C family's printer (`C.Expressions.Text`),
 * which writes every kind of the family: a directive starting its line, a conditional one its branches each on a line
 * of its own (`#if`, `#elif`, `#elifdef`, `#else`), its items on the lines between, and `#endif`; `defined(name)`; and a
 * comment `//text` or `/*text*\/`. */

import { text } from "../Expressions/Text.js";
import { DIALECT } from "./Expressions.js";

/** The expression as source. */
export function ToText(expression: unknown): string {
  return text(expression, DIALECT);
}
