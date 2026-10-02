/** Text of the Matlab dialect: `ToText(expression)` is the expression as MATLAB source, parenthesized only where
 * precedence requires, with its imports as the lines before it. */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import {
  _Arrayfun, _Binary, _Call, _Constant, _Field, _Identifier, _Import, _Index,
  _Unary, arrayfun,
} from "./Expressions.js";

const { repr } = Repr;

// MATLAB's precedence, from loosest to tightest; unary operators bind tighter than all of these but `.`.
const PRECEDENCE: Record<string, number> = {
  "||": 1, "&&": 2, "==": 3, "~=": 3, "<": 3, "<=": 3, ">": 3, ">=": 3, "+": 4, "-": 4, ".*": 5,
};
const UNARY = 6, ATOM = 7;

function constantText(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return `"${value.replaceAll('"', '""')}"`;
  if (typeof value === "number" && !Number.isFinite(value)) {
    return Number.isNaN(value) ? "NaN" : value > 0 ? "Inf" : "-Inf";
  }
  return repr(value);
}

/** The expression as MATLAB source, parenthesized only where precedence requires: one line per import around it, then
 * the expression. */
export function ToText(expression: F.Term): string {
  const lines: string[] = [];
  while (expression instanceof _Import) {
    lines.push(`import ${expression.name}`);
    expression = expression.body;
  }
  const write = (node: F.Term, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [text, precedence] = args[index] as [string, number];
      return precedence >= level ? text : `(${text})`;
    };
    if (node instanceof _Constant) {
      const text = constantText(node.value);
      return [text, text.startsWith("-") ? UNARY : ATOM];
    }
    if (node instanceof _Identifier) return [node.name, ATOM];
    if (node instanceof _Field) return [`${operand(0, ATOM)}.${node.name}`, ATOM];
    if (node instanceof _Call) return [`${node.function}(${args.map(([text]) => text).join(", ")})`, ATOM];
    if (node instanceof _Index) return [`${operand(0, ATOM)}(${args[1]?.[0]})`, ATOM];
    if (node instanceof _Arrayfun) return [`arrayfun(@(${node.name}) ${args[1]?.[0]}, ${args[0]?.[0]})`, ATOM];
    if (node instanceof _Import) throw new Errors.ValueError("an import can only enclose the whole expression");
    if (node instanceof _Unary) return [`${node.operator}${operand(0, UNARY)}`, UNARY];
    const binary = node as _Binary;
    const level = PRECEDENCE[binary.operator] as number;
    return [`${operand(0, level)} ${binary.operator} ${operand(1, level + 1)}`, level];
  };
  return [...lines, F.fold(expression, write)[0]].join("\n");
}
