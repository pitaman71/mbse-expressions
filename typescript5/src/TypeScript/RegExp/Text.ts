/** Text of the TypeScript RegExp dialect: how its kinds are written, as ECMA-262's pattern grammar spells them (22.2.1),
 * which the family's printer (`TypeScript5.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer
 * and its `Terms.Node`. A literal is written `/pattern/flags`; a node with a spelling, regexpp's `raw` (a character's, a
 * character set's, a backreference's, a literal's or a modifiers' flags), as written; a quantifier's as written where its
 * spelling begins with its element's text, else in its shortest form (`*`, `+`, `?`, `{n}`, `{n,}`, `{n,m}`, a lazy one
 * ending `?`). A character with no spelling is written as itself, but a syntax character (`^$\.*+?()[]{}|`) or `/`, and
 * in a class `-` too, escaped by `\`, and a control, a line terminator or a lone surrogate as `\t`, `\n`, `\v`, `\f`,
 * `\r`, `\xHH` or `\uHHHH` *(agent)*; flags with no spelling in the order `RegExp.prototype.flags` writes them, a
 * modifiers' as ECMA-262 lists them (`ims`). `ToText` writes a term of the family, as `TypeScript5.Text.ToText` does. */

import type * as F from "../../Framework/Terms.js";
import type { Printer, Text } from "../TypeScript5/Text.js";
import * as R from "./Expressions.js";

export { ToText } from "../TypeScript5/Text.js";

/** The characters a pattern escapes: ECMA-262's syntax characters, and `/`, which would end the literal. */
export const SYNTAX = "^$\\.*+?()[]{}|/";

const CONTROLS: ReadonlyMap<number, string> = new Map([[9, "\\t"], [10, "\\n"], [11, "\\v"], [12, "\\f"], [13, "\\r"]]);

const hex = (value: number, digits: number): string => value.toString(16).toUpperCase().padStart(digits, "0");

/** A character's default spelling, of its code point: itself, a syntax character escaped (in a class, `-` too), and a
 * control, a line terminator or a lone surrogate as an escape. */
export function character(value: bigint | number, inClass = false): string {
  const code = Number(value);
  const control = CONTROLS.get(code);
  if (control !== undefined) return control;
  if (code < 0x20 || code === 0x7F) return `\\x${hex(code, 2)}`;
  if (code === 0x2028 || code === 0x2029 || (code >= 0xD800 && code <= 0xDFFF)) return `\\u${hex(code, 4)}`;
  const text = String.fromCodePoint(code);
  return SYNTAX.includes(text) || (inClass && text === "-") ? "\\" + text : text;
}

/** A class's element: a character as a class spells it, anything else as the printer writes it. */
function inClass(p: Printer, value: any): string {
  const node = p.node(value);
  if (node.kind === R.CHARACTER && !node.attributes.has("raw") && node.attributes.has("value")) {
    return character(node.attributes.get("value"), true);
  }
  return p.text(node);
}

function disjunction(p: Printer, node: F.Node): string {
  return node.lists.get("alternatives")!.map((alternative) => p.text(alternative)).join("|");
}

/** A flags helper's spelling: as written, else its letters in order. */
function letters(node: F.Node | undefined, allowed: typeof R.FLAGS): string {
  if (node === undefined) return "";
  if (node.attributes.has("raw")) return node.attributes.get("raw");
  return allowed.filter(([name]) => node.attributes.get(name)).map(([, letter]) => letter).join("");
}

function regexpliteral(p: Printer, node: F.Node): string {
  return `/${p.text(node.slots.get("pattern"))}/${letters(node.helpers.get("flags") as F.Node | undefined, R.FLAGS)}`;
}

function alternative(p: Printer, node: F.Node): string {
  return node.lists.get("elements")!.map((element) => p.text(element)).join("");
}

function group(p: Printer, node: F.Node): string {
  const held = node.slots.get("modifiers");
  return `(?${held === null ? "" : p.text(held)}:${disjunction(p, node)})`;
}

function capturinggroup(p: Printer, node: F.Node): string {
  const name = node.attributes.get("name");
  return `(${name === undefined ? "" : `?<${name}>`}${disjunction(p, node)})`;
}

function quantifier(p: Printer, node: F.Node): string {
  const element = p.text(node.slots.get("element"));
  const raw: string | undefined = node.attributes.get("raw");
  if (raw !== undefined && raw.startsWith(element) && raw.length > element.length) return raw;
  const low: bigint = node.attributes.get("min");
  const high: bigint | undefined = node.attributes.get("max");
  let suffix: string;
  if (high === undefined) suffix = low === 0n ? "*" : low === 1n ? "+" : `{${low},}`;
  else suffix = low === 0n && high === 1n ? "?" : low === high ? `{${low}}` : `{${low},${high}}`;
  return element + suffix + (node.attributes.get("greedy") ?? true ? "" : "?");
}

function characterclass(p: Printer, node: F.Node): string {
  const inner = node.lists.get("elements")!.map((element) => inClass(p, element)).join("");
  return `[${node.attributes.get("negate") ? "^" : ""}${inner}]`;
}

function characterclassrange(p: Printer, node: F.Node): string {
  return `${inClass(p, node.slots.get("min"))}-${inClass(p, node.slots.get("max"))}`;
}

function operation(operator: string): Text {
  return (p, node) => `${inClass(p, node.slots.get("left"))}${operator}${inClass(p, node.slots.get("right"))}`;
}

function classstringdisjunction(p: Printer, node: F.Node): string {
  return "\\q{" + disjunction(p, node) + "}";
}

function stringalternative(p: Printer, node: F.Node): string {
  return node.lists.get("elements")!.map((element) => inClass(p, element)).join("");
}

function expressioncharacterclass(p: Printer, node: F.Node): string {
  return `[${node.attributes.get("negate") ? "^" : ""}${p.text(node.slots.get("expression"))}]`;
}

const SETS: ReadonlyMap<string, string> = new Map([["digit", "d"], ["space", "s"], ["word", "w"]]);

function characterset(_p: Printer, node: F.Node): string {
  const { attributes } = node;
  if (attributes.has("raw")) return attributes.get("raw");
  const kind: string = attributes.get("setKind");
  const negate = attributes.get("negate");
  if (kind === "any") return ".";
  const set = SETS.get(kind);
  if (set !== undefined) return "\\" + (negate ? set.toUpperCase() : set);
  const value = attributes.get("value");
  return `\\${negate ? "P" : "p"}{${attributes.get("key")}${value === undefined ? "" : "=" + value}}`;
}

function characterText(_p: Printer, node: F.Node): string {
  return node.attributes.has("raw") ? node.attributes.get("raw") : character(node.attributes.get("value"));
}

const EDGES: ReadonlyMap<string, string> = new Map([["start", "^"], ["end", "$"]]);

function assertion(p: Printer, node: F.Node): string {
  const kind: string = node.attributes.get("assertionKind");
  const negate = node.attributes.get("negate");
  const edge = EDGES.get(kind);
  if (edge !== undefined) return edge;
  if (kind === "word") return negate ? "\\B" : "\\b";
  const behind = kind === "lookbehind" ? "<" : "";
  return `(?${behind}${negate ? "!" : "="}${disjunction(p, node)})`;
}

function backreference(_p: Printer, node: F.Node): string {
  if (node.attributes.has("raw")) return node.attributes.get("raw");
  const ref = node.attributes.get("ref");
  return typeof ref === "string" ? `\\k<${ref}>` : `\\${ref}`;
}

function modifiers(_p: Printer, node: F.Node): string {
  const remove = node.helpers.get("remove") as F.Node | undefined;
  return letters(node.helpers.get("add") as F.Node | undefined, R.MODIFIERS) + (remove === undefined ? "" : "-" + letters(remove, R.MODIFIERS));
}

/** How each of its kinds is written, by its tag. */
export const TEXTS: ReadonlyMap<string, Text> = new Map<string, Text>([
  [R.REGEXPLITERAL, regexpliteral], [R.PATTERN, disjunction], [R.ALTERNATIVE, alternative], [R.GROUP, group],
  [R.CAPTURINGGROUP, capturinggroup], [R.QUANTIFIER, quantifier], [R.CHARACTERCLASS, characterclass],
  [R.CHARACTERCLASSRANGE, characterclassrange], [R.CLASSINTERSECTION, operation("&&")],
  [R.CLASSSUBTRACTION, operation("--")], [R.CLASSSTRINGDISJUNCTION, classstringdisjunction],
  [R.STRINGALTERNATIVE, stringalternative], [R.EXPRESSIONCHARACTERCLASS, expressioncharacterclass],
  [R.CHARACTERSET, characterset], [R.CHARACTER, characterText], [R.ASSERTION, assertion],
  [R.BACKREFERENCE, backreference], [R.MODIFIERS_, modifiers],
]);
