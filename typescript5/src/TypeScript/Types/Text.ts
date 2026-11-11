/** Text of the TypeScript Types dialect: how its kinds and helpers are written, as mbse-programs' printer writes types
 * (`mbse:mbse-programs/typescript5/src/TypeScript/_Printer.ts`), which the family's printer (`TypeScript5.Text.ToText`)
 * dispatches to: `TEXTS`, each kind's or helper's writer, given the printer and its `Terms.Node`; and `PRECEDENCE`, a
 * type's precedence by its kind, loosest first (`FUNCTION` to `PRIMARY`), a type parenthesized where it binds less than
 * its place needs (a function, conditional or union type as an operand). An object type is written on one line, or with
 * comments on its members' lines. `ToText` writes a term of the family, as `TypeScript5.Text.ToText` does. */

import type * as F from "../../Framework/Terms.js";
import type { Printer, Text } from "../TypeScript5/Text.js";

export { ToText } from "../TypeScript5/Text.js";

/** Types' precedence, loosest first. */
export const FUNCTION = 0, CONDITIONAL = 1, UNION = 2, INTERSECTION = 3, OPERATOR = 4, POSTFIX = 5, PRIMARY = 6;

/** A type's precedence, by its kind, where it is not a primary's. */
export const PRECEDENCE: ReadonlyMap<string, number> = new Map([
  ["tsfunctiontype", FUNCTION], ["tsconstructortype", FUNCTION], ["tsconditionaltype", CONDITIONAL],
  ["tsuniontype", UNION], ["tsintersectiontype", INTERSECTION], ["tstypeoperator", OPERATOR],
  ["tsinfertype", OPERATOR], ["tsarraytype", POSTFIX], ["tsindexedaccesstype", POSTFIX],
  ["tstypepredicate", FUNCTION],
]);

/** The kinds written as one word. */
const KEYWORDS: readonly [string, string][] = [
  ["tsanykeyword", "any"], ["tsunknownkeyword", "unknown"], ["tsnumberkeyword", "number"], ["tsbigintkeyword", "bigint"],
  ["tsbooleankeyword", "boolean"], ["tsstringkeyword", "string"], ["tssymbolkeyword", "symbol"],
  ["tsobjectkeyword", "object"], ["tsneverkeyword", "never"], ["tsvoidkeyword", "void"],
  ["tsundefinedkeyword", "undefined"], ["tsnullkeyword", "null"], ["tsintrinsickeyword", "intrinsic"],
  ["tsthistype", "this"],
];

function nodes(value: F.Node | readonly F.Node[] | undefined): readonly F.Node[] {
  return (value ?? []) as readonly F.Node[];
}

function one(node: F.Node, name: string): F.Node {
  return node.helpers.get(name) as F.Node;
}

function qualifiedName(p: Printer, node: F.Node): string {
  return `${p.text(node.slots.get("left"))}.${p.text(one(node, "right"))}`;
}

function typeReference(p: Printer, node: F.Node): string {
  return p.text(node.slots.get("typeName")) + p.typeArguments(node);
}

function parenthesizedType(p: Printer, node: F.Node): string {
  return `(${p.t(node.slots.get("typeAnnotation"), FUNCTION)})`;
}

function literalType(p: Printer, node: F.Node): string {
  return p.text(node.slots.get("literal"));
}

function templateLiteralType(p: Printer, node: F.Node): string {
  const quasis = nodes(node.helpers.get("quasis"));
  const written = quasis.length > 0 ? [quasis[0]!.attributes.get("raw") ?? ""] : [];
  node.many.slice(0, Math.max(quasis.length - 1, 0)).forEach((held, i) => {
    written.push("${" + p.t(held, FUNCTION) + "}" + (quasis[i + 1]!.attributes.get("raw") ?? ""));
  });
  return "`" + written.join("") + "`";
}

function arrayType(p: Printer, node: F.Node): string {
  return p.t(node.slots.get("elementType"), POSTFIX) + "[]";
}

function tupleType(p: Printer, node: F.Node): string {
  return "[" + node.many.map((held) => p.t(held, FUNCTION)).join(", ") + "]";
}

function namedTupleMember(p: Printer, node: F.Node): string {
  const optional = node.attributes.get("optional") ? "?" : "";
  return `${p.text(one(node, "label"))}${optional}: ${p.t(node.slots.get("elementType"), FUNCTION)}`;
}

function optionalType(p: Printer, node: F.Node): string {
  return p.t(node.slots.get("typeAnnotation"), POSTFIX) + "?";
}

function restType(p: Printer, node: F.Node): string {
  return "..." + p.t(node.slots.get("typeAnnotation"), FUNCTION);
}

function unionType(p: Printer, node: F.Node): string {
  const [operator, level] = node.kind === "tsuniontype" ? [" | ", INTERSECTION] : [" & ", OPERATOR];
  return node.many.map((held) => p.t(held, level)).join(operator);
}

function functionType(p: Printer, node: F.Node): string {
  return p.signature(node, true);
}

function constructorType(p: Printer, node: F.Node): string {
  return (node.attributes.get("abstract") ? "abstract " : "") + "new " + p.signature(node, true);
}

/** An object type's member on its line: a signature with its `;`, a comment as written. */
function member(p: Printer, node: F.Node): string {
  if (node.kind === "comment") {
    const text = node.attributes.get("text") ?? "";
    return node.attributes.get("block") ? `/*${text}*/` : `//${text}`;
  }
  return p.text(node) + ";";
}

/** `{ a: A; b(): B }` on one line, or with comments its members' lines, a trailing comment on its member's. */
function typeLiteral(p: Printer, node: F.Node): string {
  const members = nodes(node.helpers.get("members"));
  if (members.length === 0) return "{}";
  if (members.every((held) => held.kind !== "comment")) return "{ " + members.map((held) => member(p, held)).join(" ") + " }";
  const lines: string[] = [];
  for (const held of members) {
    if (held.kind === "comment" && held.attributes.get("trailing") && lines.length > 0) {
      lines[lines.length - 1] += " " + member(p, held);
    } else {
      lines.push("    " + member(p, held));
    }
  }
  return "{\n" + lines.join("\n") + "\n}";
}

function propertySignature(p: Printer, node: F.Node): string {
  const { attributes } = node;
  const text = (attributes.get("readonly") ? "readonly " : "") + p.key(node.slots.get("key"), attributes.get("computed") ?? false);
  return text + (attributes.get("optional") ? "?" : "") + p.annotation(node);
}

function methodSignature(p: Printer, node: F.Node): string {
  const { attributes } = node;
  const prefix = ["get", "set"].includes(attributes.get("methodKind")) ? attributes.get("methodKind") + " " : "";
  const key = p.key(node.slots.get("key"), attributes.get("computed") ?? false);
  return `${prefix}${key}${attributes.get("optional") ? "?" : ""}${p.signature(node)}`;
}

function indexSignature(p: Printer, node: F.Node): string {
  const parameters = node.many.map((parameter) => p.text(parameter)).join(", ");
  return `${p.modifiers(node)}[${parameters}]${p.annotation(node)}`;
}

function mappedType(p: Printer, node: F.Node): string {
  const { attributes, slots } = node;
  const readonly = attributes.has("readonly") ? attributes.get("readonly") + " " : "";
  const name = slots.get("nameType") !== null ? ` as ${p.t(slots.get("nameType"), FUNCTION)}` : "";
  const value = slots.get("body") !== null ? `: ${p.t(slots.get("body"), FUNCTION)}` : "";
  const constraint = p.t(slots.get("value"), FUNCTION);
  return `{ ${readonly}[${p.text(one(node, "key"))} in ${constraint}${name}]${attributes.get("optional") ?? ""}${value} }`;
}

function indexedAccessType(p: Printer, node: F.Node): string {
  return `${p.t(node.slots.get("objectType"), POSTFIX)}[${p.t(node.slots.get("indexType"), FUNCTION)}]`;
}

function typeOperator(p: Printer, node: F.Node): string {
  const operator = node.attributes.get("operator");
  if (node.slots.get("typeAnnotation") === null) return operator;
  return `${operator} ${p.t(node.slots.get("typeAnnotation"), OPERATOR)}`;
}

function typeQuery(p: Printer, node: F.Node): string {
  return "typeof " + p.text(node.slots.get("exprName")) + p.typeArguments(node);
}

function importType(p: Printer, node: F.Node): string {
  const { slots } = node;
  const options = slots.get("options") !== null ? ", " + p.text(slots.get("options")) : "";
  let text = `import(${p.text(slots.get("source"))}${options})`;
  if (slots.get("qualifier") !== null) text += "." + p.text(slots.get("qualifier"));
  return text + p.typeArguments(node);
}

function conditionalType(p: Printer, node: F.Node): string {
  const { slots } = node;
  const extendsType = p.node(slots.get("extendsType")); // a function type needs no parentheses, unless it returns a
  // conditional type
  const returned = ["tsfunctiontype", "tsconstructortype"].includes(extendsType.kind)
    ? extendsType.helpers.get("returnType") as F.Node | undefined : undefined;
  const extended = extendsType.kind === "tsconditionaltype"
    || (returned !== undefined && p.node(returned.slots.get("typeAnnotation")).kind === "tsconditionaltype")
    ? `(${p.text(extendsType)})` : p.t(extendsType, FUNCTION);
  return `${p.t(slots.get("checkType"), UNION)} extends ${extended} ? `
    + `${p.t(slots.get("trueType"), FUNCTION)} : ${p.t(slots.get("falseType"), FUNCTION)}`;
}

function inferType(p: Printer, node: F.Node): string {
  return "infer " + p.text(one(node, "typeParameter"));
}

function typePredicate(p: Printer, node: F.Node): string {
  let text = (node.attributes.get("asserts") ? "asserts " : "") + p.text(node.slots.get("parameterName"));
  const annotation = node.helpers.get("typeAnnotation") as F.Node | undefined;
  if (annotation !== undefined) text += ` is ${p.t(annotation.slots.get("typeAnnotation"), FUNCTION)}`;
  return text;
}

/** How each of its kinds and helpers is written, by its tag. */
export const TEXTS: ReadonlyMap<string, Text> = new Map<string, Text>([
  ...KEYWORDS.map(([tag, word]): [string, Text] => [tag, () => word]),
  ["tsqualifiedname", qualifiedName], ["tstypereference", typeReference], ["tsparenthesizedtype", parenthesizedType],
  ["tsliteraltype", literalType], ["tstemplateliteraltype", templateLiteralType], ["tsarraytype", arrayType],
  ["tstupletype", tupleType], ["tsnamedtuplemember", namedTupleMember], ["tsoptionaltype", optionalType],
  ["tsresttype", restType], ["tsuniontype", unionType], ["tsintersectiontype", unionType],
  ["tsfunctiontype", functionType], ["tsconstructortype", constructorType], ["tstypeliteral", typeLiteral],
  ["tsmappedtype", mappedType], ["tsindexedaccesstype", indexedAccessType], ["tstypeoperator", typeOperator],
  ["tstypequery", typeQuery], ["tsimporttype", importType], ["tsconditionaltype", conditionalType],
  ["tsinfertype", inferType], ["tstypepredicate", typePredicate],
  // its helpers: an object type's signatures
  ["tspropertysignature", propertySignature], ["tsmethodsignature", methodSignature],
  ["tscallsignaturedeclaration", (p, node) => p.signature(node)],
  ["tsconstructsignaturedeclaration", (p, node) => "new " + p.signature(node)],
  ["tsindexsignature", indexSignature],
]);
