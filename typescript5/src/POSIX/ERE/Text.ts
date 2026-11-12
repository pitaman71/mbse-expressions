/**
 * Text of the POSIX ERE dialect: `ToText(expression)` is a term of POSIX ERE (or anything `Terms.term` reads one from)
 * as an extended regular expression writes it (XBD 9.4), and `text(expression, awk)` as awk writes it (XCU awk, Regular
 * Expressions): alternatives joined by `|`, grep's list of patterns by newlines; a subexpression `(...)`; a quantifier in
 * its `raw` where it has one, else `*`, `+` and `?` where its bounds are theirs, else in braces (`{2,}`), followed by `?`
 * where it is not greedy (POSIX.1-2024's repetition modifier); a bracket expression `[^...]`, a range `a-z`, a class atom
 * `[:alpha:]`, `[.ch.]` or `[=a=]`; `.`, `^`, `$`. A character is written in its `raw` where it has one, else as itself,
 * escaped where an ERE makes it special (XBD 9.4.3: `^`, `.`, `[`, `$`, `(`, `)`, `|`, `*`, `+`, `?`, `{`, `\`), never
 * within a bracket expression, which has no escapes; with `awk`, a control character as awk's escapes write it (`\n`,
 * `\a`, `\001`), within a bracket expression too. Invalid syntax is written as written (`Terms.invalidText`), refused
 * by the name of the dialect that owns it; a term of POSIX BRE, which it reads, is written as a BRE.
 */

import * as F from "../../Framework/Terms.js";
import * as K from "../Kinds.js";
import * as E from "./Expressions.js";

/** The expression as an extended regular expression writes it, its characters with awk's escapes where `awk`. */
export function text(expression: unknown, awk = false): string {
  return new K.Printer(E.DIALECT, K.ERE, awk).term(F.term(expression));
}

/** The expression as an extended regular expression writes it. */
export function ToText(expression: unknown): string {
  return text(expression);
}
