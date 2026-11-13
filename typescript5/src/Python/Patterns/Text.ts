/**
 * Text of the Python Patterns dialect: how its kinds are written, as mbse-programs' printer writes patterns
 * (`mbse:mbse-programs/python3/mbse/Programs/Python/_Printer.py`, `p`), which the family's printer
 * (`Python3.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`, giving
 * its text and its precedence.
 *
 * A pattern's precedence is on the family's scale, so that the printer parenthesizes it as it does an expression: an
 * open sequence (`a, b`, without delimiters) the loosest, written bare only where a `case` holds it, as the root of its
 * holder is; then an `as` pattern, then an `or` pattern; every other pattern closed. So an open sequence is
 * parenthesized wherever a pattern nests in another, an `as` pattern where an `as` or an `or` pattern holds it, and an
 * `or` pattern where an `or` pattern holds it, as mbse-programs writes them: `[a, (b, c)]`, `(p as q) as r`, `(a | b) |
 * c`. A value pattern is written as the expression it is, a mapping's keys too, and a class pattern's class as a
 * primary. `ToText` writes a term of the family, as `Python3.Text.ToText` does.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as F from "../../Framework/Terms.js";
import type { Listed } from "../../Framework/Objects.js";
import type { Printer, Written } from "../Python3/Text.js";
import * as P from "./Expressions.js";

export { ToText } from "../Python3/Text.js";

/** A pattern's precedence, loosest first, on the family's scale (`Python3.Text`'s levels of a lambda, a conditional
 * expression, an `or` and a primary): an open sequence, an `as` pattern, an `or` pattern, and a closed pattern. */
export const OPEN = 2, AS = 3, OR = 4, CLOSED = 17;

/** Patterns where a sequence, a mapping or a class holds them: an open sequence parenthesized. */
function items(p: Printer, patterns: readonly any[]): string[] {
  return patterns.map((pattern) => p.write(pattern, AS));
}

/** `[a, b]`, `(a, b)`, `(a,)`, `()`, or an open sequence, `a, b`, its one pattern followed by a comma. */
function sequence(p: Printer, node: F.Node): Written {
  const written = items(p, node.many);
  const delimiters = node.attributes.get("delimiters");
  if (delimiters === "[]") return [`[${written.join(", ")}]`, CLOSED];
  const text = written.join(", ") + (written.length === 1 ? "," : "");
  if (delimiters === "()" || written.length === 0) return [`(${text})`, CLOSED];
  return [text, OPEN];
}

/** `{key: pattern, **rest}`. */
function mapping(p: Printer, node: F.Node): Written {
  const patterns = items(p, node.lists.get("patterns") as readonly any[]);
  const written = (node.lists.get("keys") as readonly any[]).map((key, i) => `${p.text(key)[0]}: ${patterns[i]}`);
  if (node.attributes.has("rest")) written.push(`**${node.attributes.get("rest")}`);
  return [`{${written.join(", ")}}`, CLOSED];
}

/** `cls(pattern, kwd_attr=kwd_pattern)`. */
function class_(p: Printer, node: F.Node): Written {
  const attrs = node.attributes.has("kwd_attrs") ? (node.attributes.get("kwd_attrs") as Listed).values : [];
  const keywords = items(p, node.lists.get("kwd_patterns") as readonly any[]);
  const written = [...items(p, node.lists.get("patterns") as readonly any[]),
    ...attrs.map((attr, i) => `${attr as string}=${keywords[i]}`)];
  return [`${p.write(node.subterms.get("cls"), CLOSED)}(${written.join(", ")})`, CLOSED];
}

/** `pattern as name`; a capture `name`, or the wildcard `_`, without a pattern. */
function as(p: Printer, node: F.Node): Written {
  const name = (node.attributes.get("name") ?? "_") as string;
  const pattern = node.subterms.get("pattern") ?? null;
  if (pattern === null) return [name, CLOSED];
  return [`${p.write(pattern, OR)} as ${name}`, AS];
}

/** How each of its kinds is written, and its precedence. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => Written> = new Map<string, (p: Printer, n: F.Node) => Written>([
  [P.MATCHVALUE, (p, n) => [p.text(n.subterms.get("value"))[0], CLOSED]],
  [P.MATCHSINGLETON, (_, n) => [n.attributes.get("value") as string, CLOSED]],
  [P.MATCHSEQUENCE, sequence],
  [P.MATCHMAPPING, mapping],
  [P.MATCHCLASS, class_],
  [P.MATCHSTAR, (_, n) => [`*${(n.attributes.get("name") ?? "_") as string}`, CLOSED]],
  [P.MATCHAS, as],
  [P.MATCHOR, (p, n) => [n.many.map((pattern) => p.write(pattern, CLOSED)).join(" | "), OR]],
]);
