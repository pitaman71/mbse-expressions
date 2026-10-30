/** Text of the Python dialect: `ToText(expression)` is a term (or anything `Terms.term` reads one from) as Python
 * source, parenthesized only where precedence requires, with its imports as the lines before it. Reading Python source
 * (`FromText`) needs Python's own parser, so it is in the Python implementation only. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as P from "./Expressions.js";

const { repr } = Repr;

// --- Rendering ---

// Python's precedence, from loosest to tightest (lambda is 0).
const IF = 1, OR = 2, AND = 3, NOT = 4, COMPARE = 5, BITOR = 6, BITXOR = 7, BITAND = 8, SHIFT = 9, SUM = 10,
  PRODUCT = 11, UNARY = 12, POWER = 13, PRIMARY = 14;
const BINOP_LEVELS: Record<string, number> = {
  "+": SUM, "-": SUM, "*": PRODUCT, "/": PRODUCT, "//": PRODUCT, "%": PRODUCT, "**": POWER,
  "|": BITOR, "^": BITXOR, "&": BITAND, "<<": SHIFT, ">>": SHIFT,
};
const IMPORTS = [P.IMPORT, P.IMPORTFROM];

function constantText(value: unknown): [string, number] {
  let text: string;
  if (typeof value === "number" && !Number.isFinite(value)) {
    text = Number.isNaN(value) ? "float('nan')" : value > 0 ? "float('inf')" : "-float('inf')";
  } else {
    text = repr(value);
  }
  return [text, text.startsWith("-") ? UNARY : PRIMARY];
}

function importLine(tag: string, attributes: Map<string, any>): string {
  const alias = attributes.get("alias") ? ` as ${attributes.get("alias")}` : "";
  if (tag === P.IMPORT) return `import ${attributes.get("module")}${alias}`;
  return `from ${attributes.get("module")} import ${attributes.get("name")}${alias}`;
}

/** The expression as Python source: one line per import around it, then the expression. */
export function ToText(expression: unknown): string {
  const lines: string[] = [];
  let node = F.term(expression);
  let [tag, record] = F.kindOf(node);
  while (IMPORTS.includes(tag)) {
    lines.push(importLine(tag, F.attributesOf(record)));
    node = F.argumentsOf(record)[0];
    [tag, record] = F.kindOf(node);
  }
  const write = (term: any, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [text, precedence] = args[index] as [string, number];
      return precedence >= level ? text : `(${text})`;
    };
    const [kind, held] = F.kindOf(term);
    const attributes = F.attributesOf(held);
    if (kind === P.CONSTANT) return constantText(attributes.get("value"));
    if (kind === P.NAME) return [attributes.get("name"), PRIMARY];
    if (kind === P.ATTRIBUTE) return [`${operand(0, PRIMARY)}.${attributes.get("attr")}`, PRIMARY];
    if (kind === P.SUBSCRIPT) return [`${operand(0, PRIMARY)}[${repr(attributes.get("key"))}]`, PRIMARY];
    if (kind === P.INDEX) return [`${operand(0, PRIMARY)}[${args[1]?.[0]}]`, PRIMARY];
    if (kind === P.CALL) {
      let texts = args.slice(1).map(([text]) => text);
      const called = F.argumentsOf(held).slice(1);
      if (called.length === 1 && F.kindOf(called[0])[0] === P.GENERATOR) texts = [(texts[0] as string).slice(1, -1)]; // without its parentheses
      return [`${operand(0, PRIMARY)}(${texts.join(", ")})`, PRIMARY];
    }
    if (kind === P.GENERATOR) {
      const conditions = args.slice(2).map((_, i) => ` if ${operand(i + 2, OR)}`).join("");
      return [`(${operand(1, IF)} for ${attributes.get("name")} in ${operand(0, OR)}${conditions})`, PRIMARY];
    }
    if (kind === P.LET) return [`(lambda ${attributes.get("name")}: ${args[1]?.[0]})(${args[0]?.[0]})`, PRIMARY];
    if (kind === P.IFEXP) return [`${operand(1, OR)} if ${operand(0, OR)} else ${operand(2, IF)}`, IF];
    if (IMPORTS.includes(kind)) throw new Errors.ValueError("an import can only enclose the whole expression");
    const operator = attributes.get("operator") as string;
    if (kind === P.UNARYOP) {
      if (operator === "not") return [`not ${operand(0, NOT)}`, NOT];
      return [`${operator}${operand(0, UNARY)}`, UNARY];
    }
    if (kind === P.COMPARE) return [`${operand(0, COMPARE + 1)} ${operator} ${operand(1, COMPARE + 1)}`, COMPARE];
    if (kind === P.BOOLOP) {
      const level = operator === "and" ? AND : OR;
      return [`${operand(0, level)} ${operator} ${operand(1, level + 1)}`, level];
    }
    if (operator === "**") return [`${operand(0, PRIMARY)} ** ${operand(1, UNARY)}`, POWER];
    const level = BINOP_LEVELS[operator] as number;
    return [`${operand(0, level)} ${operator} ${operand(1, level + 1)}`, level];
  };
  return [...lines, F.fold(node, write)[0]].join("\n");
}
