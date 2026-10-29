/** Text of the Matlab dialect: `ToText(term)` is a term as MATLAB source, parenthesized only where precedence requires,
 * with its imports as the lines before it. It reads the term through `Terms`, as the dialect reads it. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import { DIALECT } from "./Expressions.js";

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

/** A term (or anything `Terms.term` reads one from) as MATLAB source, parenthesized only where precedence requires:
 * one line per import around it, then the expression. */
export function ToText(expression: unknown): string {
  const lines: string[] = [];
  let node = F.term(expression);
  while (DIALECT.kind(node)[0] === "matlab_import") {
    const form = F.form(node);
    lines.push(`import ${form.attributes.get("name")}`);
    node = form.arguments[0];
  }
  const write = (term: any, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [text, precedence] = args[index] as [string, number];
      return precedence >= level ? text : `(${text})`;
    };
    const [tag, record] = DIALECT.kind(term);
    const attributes = F.attributesOf(record);
    if (tag === "literal") {
      const text = constantText(attributes.get("value"));
      return [text, text.startsWith("-") ? UNARY : ATOM];
    }
    if (tag === "variable") return [attributes.get("name"), ATOM];
    if (tag === "matlab_field") return [`${operand(0, ATOM)}.${attributes.get("name")}`, ATOM];
    if (tag === "call") return [`${attributes.get("callable")}(${args.map(([text]) => text).join(", ")})`, ATOM];
    if (tag === "matlab_index") return [`${operand(0, ATOM)}(${args[1]?.[0]})`, ATOM];
    if (tag === "matlab_arrayfun") {
      return [`arrayfun(@(${attributes.get("name")}) ${args[1]?.[0]}, ${args[0]?.[0]})`, ATOM];
    }
    if (tag === "matlab_import") throw new Errors.ValueError("an import can only enclose the whole expression");
    if (tag === "matlab_unary") return [`${attributes.get("operator")}${operand(0, UNARY)}`, UNARY];
    const operator = attributes.get("operator") as string;
    const level = PRECEDENCE[operator] as number;
    return [`${operand(0, level)} ${operator} ${operand(1, level + 1)}`, level];
  };
  return [...lines, F.fold(node, write)[0]].join("\n");
}
