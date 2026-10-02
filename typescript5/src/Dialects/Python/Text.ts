/** Text of the Python dialect: `ToText(expression)` is the expression as Python source, parenthesized only where
 * precedence requires, with its imports as the lines before it. Reading Python source (`FromText`) and functions
 * (`FromFunction`) needs Python's own parser, so it is in the Python implementation only. */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import {
  _Attribute, _Binop, _Boolop, _Call, _Compare, _Constant, _Generator, _IfExp,
  _Import, _ImportFrom, _Index, _Let, _Name, _Subscript, _Unaryop,
} from "./Expressions.js";

const { repr } = Repr;

// --- Rendering ---

// Python's precedence, from loosest to tightest (lambda is 0).
const IF = 1, OR = 2, AND = 3, NOT = 4, COMPARE = 5, BITOR = 6, BITXOR = 7, BITAND = 8, SHIFT = 9, SUM = 10,
  PRODUCT = 11, UNARY = 12, POWER = 13, PRIMARY = 14;
const BINOP_LEVELS: Record<string, number> = {
  "+": SUM, "-": SUM, "*": PRODUCT, "/": PRODUCT, "//": PRODUCT, "%": PRODUCT, "**": POWER,
  "|": BITOR, "^": BITXOR, "&": BITAND, "<<": SHIFT, ">>": SHIFT,
};

function constantText(value: unknown): [string, number] {
  let text: string;
  if (typeof value === "number" && !Number.isFinite(value)) {
    text = Number.isNaN(value) ? "float('nan')" : value > 0 ? "float('inf')" : "-float('inf')";
  } else {
    text = repr(value);
  }
  return [text, text.startsWith("-") ? UNARY : PRIMARY];
}

function importLine(node: _Import | _ImportFrom): string {
  const alias = node.alias ? ` as ${node.alias}` : "";
  if (node instanceof _Import) return `import ${node.module}${alias}`;
  return `from ${node.module} import ${node.name}${alias}`;
}

/** The expression as Python source: one line per import around it, then the expression. */
export function ToText(expression: F.Term): string {
  const lines: string[] = [];
  while (expression instanceof _Import || expression instanceof _ImportFrom) {
    lines.push(importLine(expression));
    expression = expression.body;
  }
  const write = (node: F.Term, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [text, precedence] = args[index] as [string, number];
      return precedence >= level ? text : `(${text})`;
    };
    if (node instanceof _Constant) return constantText(node.value);
    if (node instanceof _Name) return [node.name, PRIMARY];
    if (node instanceof _Attribute) return [`${operand(0, PRIMARY)}.${node.attr}`, PRIMARY];
    if (node instanceof _Subscript) return [`${operand(0, PRIMARY)}[${repr(node.key)}]`, PRIMARY];
    if (node instanceof _Index) return [`${operand(0, PRIMARY)}[${args[1]?.[0]}]`, PRIMARY];
    if (node instanceof _Call) {
      let texts = args.slice(1).map(([text]) => text);
      if (node.arguments.length === 1 && node.arguments[0] instanceof _Generator) texts = [(texts[0] as string).slice(1, -1)]; // without its parentheses
      return [`${operand(0, PRIMARY)}(${texts.join(", ")})`, PRIMARY];
    }
    if (node instanceof _Generator) {
      const conditions = args.slice(2).map((_, i) => ` if ${operand(i + 2, OR)}`).join("");
      return [`(${operand(1, IF)} for ${node.name} in ${operand(0, OR)}${conditions})`, PRIMARY];
    }
    if (node instanceof _Let) return [`(lambda ${node.name}: ${args[1]?.[0]})(${args[0]?.[0]})`, PRIMARY];
    if (node instanceof _IfExp) return [`${operand(1, OR)} if ${operand(0, OR)} else ${operand(2, IF)}`, IF];
    if (node instanceof _Import || node instanceof _ImportFrom) {
      throw new Errors.ValueError("an import can only enclose the whole expression");
    }
    if (node instanceof _Unaryop) {
      if (node.operator === "not") return [`not ${operand(0, NOT)}`, NOT];
      return [`${node.operator}${operand(0, UNARY)}`, UNARY];
    }
    if (node instanceof _Compare) return [`${operand(0, COMPARE + 1)} ${node.operator} ${operand(1, COMPARE + 1)}`, COMPARE];
    if (node instanceof _Boolop) {
      const level = node.operator === "and" ? AND : OR;
      return [`${operand(0, level)} ${node.operator} ${operand(1, level + 1)}`, level];
    }
    const binop = node as _Binop;
    if (binop.operator === "**") return [`${operand(0, PRIMARY)} ** ${operand(1, UNARY)}`, POWER];
    const level = BINOP_LEVELS[binop.operator] as number;
    return [`${operand(0, level)} ${binop.operator} ${operand(1, level + 1)}`, level];
  };
  return [...lines, F.fold(expression, write)[0]].join("\n");
}
