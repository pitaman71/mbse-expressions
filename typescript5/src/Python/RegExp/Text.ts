/**
 * Text of the Python RegExp dialect: how its kinds are written, as `re`'s syntax, which the family's printer
 * (`Python3.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`, giving its
 * text and its precedence.
 *
 * A regular expression's structure is its kinds', its groups written as kinds, so it needs no parentheses of the
 * printer's: every kind is written closed, at the family's level of a primary (`CLOSED`). Alternatives are joined by `|`,
 * an alternative's elements written one after another; a quantifier's bounds in their shortest form (`*`, `+`, `?`,
 * `{m}`, `{m,}`, `{m,n}`), followed by `?` where it is lazy and `+` where it is possessive; a character in its spelling
 * as written, else in its default spelling (`Expressions.spelling`), escaped as where it stands, within a class or not;
 * and a numbered backreference followed by a digit within a group of its own (`(?:\1)0`), which `\10` would otherwise
 * read as another group. `ToText` writes a term of the family, as `Python3.Text.ToText` does.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as F from "../../Framework/Terms.js";
import type { Printer, Written } from "../Python3/Text.js";
import * as R from "./Expressions.js";

export { ToText } from "../Python3/Text.js";

/** Every kind's precedence, on the family's scale: a primary's (`Python3.Text`'s), so that nothing parenthesizes it. */
export const CLOSED = 17;

const DIGITS = "0123456789";
const SETS = new Map([["any", "."], ["digit", "\\d"], ["space", "\\s"], ["word", "\\w"]]);
const ASSERTIONS = new Map([["start", "^"], ["end", "$"], ["stringstart", "\\A"], ["stringend", "\\Z"], ["word", "\\b"]]);
const LOOKAROUNDS = new Map([["lookahead false", "(?="], ["lookahead true", "(?!"], ["lookbehind false", "(?<="], ["lookbehind true", "(?<!"]]);

/** A kind's alternatives, joined by `|`. */
function alternatives(p: Printer, node: F.Node): string {
  return node.many.map((alternative) => p.text(alternative)[0]).join("|");
}

/** A character, in its spelling as written, else in its default spelling where it stands. */
function character(node: F.Node, within: boolean): string {
  return node.attributes.has("raw") ? node.attributes.get("raw") as string : R.spelling(node.attributes.get("value") as bigint, within);
}

/** An element of a class: a character and a range's ends spelled as within a class, any other as it is written. */
function member(p: Printer, item: any): string {
  const [tag, record] = F.kindOf(item);
  if (tag === R.CHARACTER) return character(F.node(tag, record), true);
  if (tag === R.CHARACTERCLASSRANGE) {
    const node = F.node(tag, record);
    return `${member(p, node.subterms.get("min"))}-${member(p, node.subterms.get("max"))}`;
  }
  return p.text(item)[0];
}

/** An alternative's elements, one after another; a numbered backreference followed by a digit within a group. */
function elements(p: Printer, node: F.Node): Written {
  const written = node.many.map((element) => p.text(element)[0]);
  node.many.slice(0, -1).forEach((element, i) => {
    const [tag, record] = F.kindOf(element);
    if (tag === R.BACKREFERENCE && typeof F.attributesOf(record).get("ref") === "bigint" && DIGITS.includes((written[i + 1] as string).slice(0, 1) || "_")) {
      written[i] = `(?:${written[i] as string})`;
    }
  });
  return [written.join(""), CLOSED];
}

/** Its element, then its bounds in their shortest form, then `?` where it is lazy and `+` where possessive. */
function quantifier(p: Printer, node: F.Node): Written {
  const [least, most] = [node.attributes.get("min") as bigint, node.attributes.get("max") as bigint | undefined];
  const bounds = most === undefined ? (least === 0n ? "*" : least === 1n ? "+" : `{${least},}`)
    : least === 0n && most === 1n ? "?" : most === least ? `{${least}}` : `{${least},${most}}`;
  const lazy = node.attributes.get("greedy") === false ? "?" : node.attributes.get("possessive") === true ? "+" : "";
  return [p.text(node.subterms.get("element"))[0] + bounds + lazy, CLOSED];
}

/** `[...]`, `[^...]`. */
function class_(p: Printer, node: F.Node): Written {
  const negate = node.attributes.get("negate") === true ? "^" : "";
  return [`[${negate}${node.many.map((item) => member(p, item)).join("")}]`, CLOSED];
}

/** `.`, `\d`, `\s`, `\w`, and the negations in capitals. */
function set(_: Printer, node: F.Node): Written {
  const written = SETS.get(node.attributes.get("setKind")) as string;
  return [node.attributes.get("negate") === true ? written.toUpperCase() : written, CLOSED];
}

/** `^`, `$`, `\A`, `\Z`, `\b`, `\B`, and the lookarounds around their alternatives. */
function assertion(p: Printer, node: F.Node): Written {
  const [kind, negate] = [node.attributes.get("assertionKind") as string, node.attributes.get("negate") === true];
  if (R.LOOKAROUNDS.includes(kind)) return [`${LOOKAROUNDS.get(`${kind} ${negate}`) as string}${alternatives(p, node)})`, CLOSED];
  const written = ASSERTIONS.get(kind) as string;
  return [negate ? written.toUpperCase() : written, CLOSED];
}

/** A group's number, or its name. */
function reference(node: F.Node): string {
  return `${node.attributes.get("ref") as bigint | string}`;
}

/** `\1`, `(?P=name)`. */
function backreference(_: Printer, node: F.Node): Written {
  const ref = node.attributes.get("ref") as bigint | string;
  return [typeof ref === "bigint" ? `\\${ref}` : `(?P=${ref})`, CLOSED];
}

/** `(?(1)yes|no)`, `(?(name)yes)`. */
function conditional(p: Printer, node: F.Node): Written {
  const no = node.subterms.get("no") ?? null;
  const written = p.text(node.subterms.get("yes"))[0] + (no === null ? "" : "|" + p.text(no)[0]);
  return [`(?(${reference(node)})${written})`, CLOSED];
}

/** A global flags, `(?aiLmsux)`, or a scoped one around its alternatives, `(?a-i:...)`. */
function flags(p: Printer, node: F.Node): Written {
  const [add, remove] = [(node.attributes.get("add") ?? "") as string, (node.attributes.get("remove") ?? "") as string];
  if (node.many.length === 0) return [`(?${add})`, CLOSED];
  return [`(?${add}${remove !== "" ? "-" + remove : ""}:${alternatives(p, node)})`, CLOSED];
}

/** `(...)`, `(?P<name>...)`. */
function capturing(p: Printer, node: F.Node): Written {
  const name = node.attributes.has("name") ? `?P<${node.attributes.get("name") as string}>` : "";
  return [`(${name}${alternatives(p, node)})`, CLOSED];
}

/** How each of its kinds is written, and its precedence. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => Written> = new Map<string, (p: Printer, n: F.Node) => Written>([
  [R.PATTERN, (p, n) => [alternatives(p, n), CLOSED]],
  [R.ALTERNATIVE, elements],
  [R.GROUP, (p, n) => [`(?:${alternatives(p, n)})`, CLOSED]],
  [R.CAPTURINGGROUP, capturing],
  [R.QUANTIFIER, quantifier],
  [R.CHARACTERCLASS, class_],
  [R.CHARACTERCLASSRANGE, (p, n) => [`${member(p, n.subterms.get("min"))}-${member(p, n.subterms.get("max"))}`, CLOSED]],
  [R.CHARACTERSET, set],
  [R.CHARACTER, (_, n) => [character(n, false), CLOSED]],
  [R.ASSERTION, assertion],
  [R.BACKREFERENCE, backreference],
  [R.CONDITIONAL, conditional],
  [R.ATOMICGROUP, (p, n) => [`(?>${alternatives(p, n)})`, CLOSED]],
  [R.FLAGS, flags],
  [R.COMMENT, (_, n) => [`(?#${(n.attributes.get("text") ?? "") as string})`, CLOSED]],
]);
