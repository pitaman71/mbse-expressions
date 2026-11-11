/** Text of the Cpp Types dialect: `ToText(expression)` is a term of Cpp Types (or anything `Terms.term` reads one from)
 * as C++ source, as mbse-programs' printer writes it, through the C family's printer (`C.Expressions.Text`), which
 * writes every kind of the family: a type-id its specifiers and its abstract declarator (`const std::string &`), an
 * enumeration's body its enumerators, directives and comments on lines of its own, and an enumerator `name = value`. */

import { text } from "../../C/Expressions/Text.js";
import { DIALECT } from "./Expressions.js";

/** The expression as C++ source. */
export function ToText(expression: unknown): string {
  return text(expression, DIALECT);
}
