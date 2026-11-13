/**
 * Text of the POSIX BRE dialect: `ToText(expression)` is a term of POSIX BRE (or anything `Terms.term` reads one from)
 * as a basic regular expression writes it (XBD 9.3): alternatives joined by `\|` (POSIX.1-2024's), grep's list of
 * patterns by newlines; a subexpression `\(...\)`; a quantifier in its `raw` where it has one, else `*` where its bounds
 * are its, else in escaped braces (`\{2,\}`); a bracket expression `[^...]`, a range `a-z`, a class atom `[:alpha:]`,
 * `[.ch.]` or `[=a=]`; `.`, `^`, `$`; a backreference `\1`. A character is written in its `raw` where it has one, else
 * as itself, escaped where a BRE makes it special (XBD 9.3.3: `.`, `[`, `\`, `*`, `^`, `$`), never within a bracket
 * expression, which has no escapes. Invalid syntax is written as written (`Terms.invalidText`), refused by the name of
 * the dialect that owns it; a term of POSIX ERE, which it reads, is written as an ERE.
 */

import * as F from "../../Framework/Terms.js";
import * as K from "../Kinds.js";
import * as E from "./Expressions.js";

/** The expression as a basic regular expression writes it. */
export function ToText(expression: unknown): string {
  return new K.Printer(E.DIALECT, K.BRE).term(F.term(expression));
}
