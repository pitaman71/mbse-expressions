/** Text of the Excel dialect: `ToText(expression)` is the expression as a formula, starting with `=` and
 * parenthesized only where precedence requires. */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import { isIdentifier } from "../Python/Expressions.js";
import { _Cell, _Constant, _Field, _Function, _Infix, _Let, _Map, _Name, _Prefix } from "./Expressions.js";

const { repr } = Repr;

// Excel's precedence, from loosest to tightest: comparison, then + and -, then *, then prefix -.

const PRECEDENCE: Record<string, number> = { "=": 1, "<>": 1, "<": 1, "<=": 1, ">": 1, ">=": 1, "+": 2, "-": 2, "*": 3 };
const PREFIX = 4, ATOM = 5;

function constantText(value: unknown): string {
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") return `"${value.replaceAll('"', '""')}"`;
  if (typeof value === "number" && !Number.isFinite(value)) return "#NUM!"; // Excel has no infinities or NaN
  return repr(value);
}

function fieldName(name: string): string {
  return isIdentifier(name) ? name : `[${name}]`;
}

function cellText(node: _Cell): string {
  if (node.sheet === null) return node.address;
  let prefix = node.book !== null ? `[${node.book}]${node.sheet}` : node.sheet;
  if (!/^[\p{L}\p{N}_.[\]]+$/u.test(prefix)) prefix = `'${prefix.replaceAll("'", "''")}'`;
  return `${prefix}!${node.address}`;
}

/** The expression as a formula, starting with '=' and parenthesized only where precedence requires. */
export function ToText(expression: F.Term): string {
  const write = (node: F.Term, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [text, precedence] = args[index] as [string, number];
      return precedence >= level ? text : `(${text})`;
    };
    if (node instanceof _Constant) {
      const text = constantText(node.value);
      return [text, text.startsWith("-") ? PREFIX : ATOM];
    }
    if (node instanceof _Name) return [node.name, ATOM];
    if (node instanceof _Cell) return [cellText(node), ATOM];
    if (node instanceof _Field) return [`${operand(0, ATOM)}.${fieldName(node.name)}`, ATOM];
    if (node instanceof _Let) return [`LET(${node.name}, ${args[0]?.[0]}, ${args[1]?.[0]})`, ATOM];
    if (node instanceof _Function) return [`${node.name}(${args.map(([text]) => text).join(", ")})`, ATOM];
    if (node instanceof _Map) return [`MAP(${args[0]?.[0]}, LAMBDA(${node.name}, ${args[1]?.[0]}))`, ATOM];
    if (node instanceof _Prefix) return [`${node.operator}${operand(0, PREFIX)}`, PREFIX];
    const infix = node as _Infix;
    const level = PRECEDENCE[infix.operator] as number;
    return [`${operand(0, level)} ${infix.operator} ${operand(1, level + 1)}`, level];
  };
  return "=" + F.fold(expression, write)[0];
}
