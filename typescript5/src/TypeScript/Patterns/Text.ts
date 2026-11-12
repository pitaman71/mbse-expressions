/** Text of the TypeScript Patterns dialect: how its kinds are written, as mbse-programs' printer writes patterns
 * (`mbse:mbse-programs/typescript5/src/TypeScript/_Printer.ts`), which the family's printer (`TypeScript5.Text.ToText`)
 * dispatches to: `TEXTS`, each kind's writer, given the printer and its `Terms.Node`. A pattern is written with its
 * decorators, its `?` and its annotation; an array pattern's hole as nothing, a last hole kept. `ToText` writes a term of
 * the family, as `TypeScript5.Text.ToText` does. */

import type * as F from "../../Framework/Terms.js";
import * as X from "../TypeScript5/Text.js";
import type { Printer, Text } from "../TypeScript5/Text.js";

export { ToText } from "../TypeScript5/Text.js";

function pattern(p: Printer, node: F.Node, inner: string): string {
  return p.decorators(node) + inner + (node.attributes.get("optional") ? "?" : "") + p.annotation(node);
}

function arrayPattern(p: Printer, node: F.Node): string {
  return pattern(p, node, p.elements(node.lists.get("elements")!));
}

function objectPattern(p: Printer, node: F.Node): string {
  const properties = node.lists.get("properties")!;
  const inner = properties.length === 0 ? "{}" : "{ " + properties.map((held) => p.text(held)).join(", ") + " }";
  return pattern(p, node, inner);
}

function assignmentPattern(p: Printer, node: F.Node): string {
  return pattern(p, node, `${p.text(node.subterms.get("left"))} = ${p.e(node.subterms.get("right"), X.ASSIGN)}`);
}

function restElement(p: Printer, node: F.Node): string {
  return pattern(p, node, "..." + p.text(node.subterms.get("argument")));
}

function parameterProperty(p: Printer, node: F.Node): string {
  return p.decorators(node) + p.modifiers(node) + p.text(node.subterms.get("parameter"));
}

/** How each of its kinds is written, by its tag. */
export const TEXTS: ReadonlyMap<string, Text> = new Map<string, Text>([
  ["arraypattern", arrayPattern], ["objectpattern", objectPattern], ["assignmentpattern", assignmentPattern],
  ["restelement", restElement], ["tsparameterproperty", parameterProperty],
]);
