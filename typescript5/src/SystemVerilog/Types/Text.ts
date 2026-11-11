/** Text of the SystemVerilog Types dialect: how its kinds are written, as mbse-programs' printer writes data types
 * (`mbse:mbse-programs/python3/mbse/Programs/Verilog/_Printer.py`, `type_text`), which the family's printer
 * (`Expressions.Text.ToText`) dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`;
 * `PRECEDENCE`, none but a primary's; and `INLINE`, none. A structure or an enumeration is written on one line, its members
 * data; a dimension as `[7:0]`, `[8]`, `[]`, `[int]`, `[*]`, `[$]` or `[$:8]`. `ToText` writes a term of the family, as
 * `Expressions.Text.ToText` does. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as F from "../../Framework/Terms.js";
import type { Printer } from "../Expressions/Text.js";
import * as T from "./Expressions.js";

export { ToText } from "../Expressions/Text.js";

function nodes(value: unknown): readonly F.Node[] {
  return (value ?? []) as readonly F.Node[];
}

function join(...parts: unknown[]): string {
  return parts.filter((p) => p).join(" ");
}

/** A dimension: `[left:right]`, `[size]`, `[]`, `[type]` or `[*]`, `[$]` or `[$:bound]`. */
export function dimension(p: Printer, node: F.Node): string {
  if (node.kind === "rangedimension") return `[${p.text(node.slots.get("left"))}:${p.text(node.slots.get("right"))}]`;
  if (node.kind === "sizedimension") return `[${p.text(node.slots.get("size"))}]`;
  if (node.kind === "unsizeddimension") return "[]";
  if (node.kind === "associativedimension") {
    const type = node.slots.get("type") ?? null;
    return `[${type !== null ? p.text(type) : "*"}]`;
  }
  const bound = node.slots.get("bound") ?? null; // a queue's
  return `[$${bound !== null ? ":" + p.text(bound) : ""}]`;
}

function dimensions(p: Printer, node: F.Node): string {
  return nodes(node.helpers.get("dimensions")).map((d) => dimension(p, d)).join("");
}

function sized(p: Printer, node: F.Node, head: string): string {
  const written = dimensions(p, node);
  return head + (written ? ` ${written}` : "");
}

function declarators(p: Printer, declarators: readonly F.Node[]): string {
  return declarators.map((d) => p.spelling(d.helpers.get("name")) + dimensions(p, d)
    + ((d.slots.get("value") ?? null) !== null ? ` = ${p.text(d.slots.get("value"))}` : "")).join(", ");
}

/** A structure's member: its attributes, `rand` or `randc`, its type and its declarators. */
function member(p: Printer, node: F.Node): string {
  const random = node.attributes.get("random") ? `${node.attributes.get("random")} ` : "";
  const attributes = nodes(node.helpers.get("attributes"));
  const written = attributes.length > 0 ? `${p.attributeText(attributes)} ` : "";
  return `${written}${random}${p.text(node.slots.get("type"))} ${declarators(p, nodes(node.helpers.get("declarators")))}`;
}

/** An enumeration's member: `name`, `name[left]` or `name[left:right]`, and its value. */
function enumMember(p: Printer, node: F.Node): string {
  let numbers = "";
  const [left, right, value] = ["left", "right", "value"].map((name) => node.slots.get(name) ?? null);
  if (left !== null) numbers = `[${p.text(left)}${right !== null ? `:${p.text(right)}` : ""}]`;
  return p.spelling(node.helpers.get("name")) + numbers + (value !== null ? ` = ${p.text(value)}` : "");
}

function struct(p: Printer, node: F.Node): string {
  const head = join(node.attributes.get("keyword"), node.attributes.get("qualifier"),
    node.attributes.get("packed") ? "packed" : null, node.attributes.get("signing"));
  const members = nodes(node.helpers.get("members")).map((m) => `${member(p, m)};`).join(" ");
  return sized(p, node, `${head} { ${members} }`);
}

function enumText(p: Printer, node: F.Node): string {
  const base = node.slots.get("base") ?? null;
  const members = nodes(node.helpers.get("members")).map((m) => enumMember(p, m)).join(", ");
  return sized(p, node, `enum${base !== null ? ` ${p.text(base)}` : ""} {${members}}`);
}

function virtual(p: Printer, node: F.Node): string {
  const head = node.attributes.get("interface_keyword") ? "virtual interface" : "virtual";
  const modport = node.helpers.has("modport") ? `.${p.spelling(node.helpers.get("modport"))}` : "";
  return `${head} ${p.spelling(node.helpers.get("interface"))}${p.parameterValues(node.many)}${modport}`;
}

/** How each of its kinds is written. */
export const TEXTS: ReadonlyMap<string, (p: Printer, n: F.Node) => string> = new Map<string, (p: Printer, n: F.Node) => string>([
  [T.INTEGERVECTORTYPE, (p, n) => sized(p, n, join(n.attributes.get("keyword"), n.attributes.get("signing")))],
  [T.INTEGERATOMTYPE, (_p, n) => join(n.attributes.get("keyword"), n.attributes.get("signing"))],
  [T.NONINTEGERTYPE, (_p, n) => n.attributes.get("keyword")],
  [T.KEYWORDTYPE, (_p, n) => n.attributes.get("keyword")],
  [T.NAMEDTYPE, (p, n) => sized(p, n, p.name(n.helpers.get("name") as F.Node))],
  [T.VIRTUALINTERFACETYPE, virtual],
  [T.IMPLICITTYPE, (p, n) => join(n.attributes.get("signing"), dimensions(p, n))],
  [T.STRUCTTYPE, struct],
  [T.ENUMTYPE, enumText],
  [T.TYPEREFERENCE, (p, n) => `type(${p.text(n.slots.get("operand"))})`],
]);

/** Each of its kinds' precedence, where it is not a primary's: none. */
export const PRECEDENCE: ReadonlyMap<string, any> = new Map();

/** How `randomize() with` writes its kinds among its constraints, where not as written: none. */
export const INLINE: ReadonlyMap<string, (p: Printer, n: F.Node, written: string) => string> = new Map();
