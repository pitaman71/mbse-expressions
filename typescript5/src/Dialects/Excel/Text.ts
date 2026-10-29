/** Text of the Excel dialect: `ToText(term)` is a term as a formula, starting with `=` and parenthesized only where
 * precedence requires. It takes a term value, or anything `Terms.term` reads one from (an `Expression`, its root), and
 * reads it as `Expressions.DIALECT` does: a kind it does not read throws `ValueError`. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import { DIALECT } from "./Expressions.js";

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

/** Whether `text` is an identifier, as Python's `str.isidentifier` has it. */
function isIdentifier(text: string): boolean {
  return /^[\p{XID_Start}_]\p{XID_Continue}*$/u.test(text);
}

function fieldName(name: string): string {
  return isIdentifier(name) ? name : `[${name}]`;
}

function cellText(attributes: Map<string, any>): string {
  const [address, sheet, book] = [attributes.get("address"), attributes.get("sheet"), attributes.get("book")];
  if (sheet === undefined) return address;
  let prefix = book !== undefined ? `[${book}]${sheet}` : sheet;
  if (!/^[\p{L}\p{N}_.[\]]+$/u.test(prefix)) prefix = `'${prefix.replaceAll("'", "''")}'`;
  return `${prefix}!${address}`;
}

/** The term as a formula, starting with '=' and parenthesized only where precedence requires. */
export function ToText(expression: unknown): string {
  const write = (node: any, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [text, precedence] = args[index] as [string, number];
      return precedence >= level ? text : `(${text})`;
    };
    const [kind, record] = DIALECT.kind(node);
    const attributes = F.attributesOf(record);
    if (kind === "literal") {
      const text = constantText(attributes.get("value"));
      return [text, text.startsWith("-") ? PREFIX : ATOM];
    }
    if (kind === "variable") return [attributes.get("name"), ATOM];
    if (kind === "excel_cell") return [cellText(attributes), ATOM];
    if (kind === "excel_field") return [`${operand(0, ATOM)}.${fieldName(attributes.get("name"))}`, ATOM];
    if (kind === "let") return [`LET(${attributes.get("name")}, ${args[0]?.[0]}, ${args[1]?.[0]})`, ATOM];
    if (kind === "call") return [`${attributes.get("callable")}(${args.map(([text]) => text).join(", ")})`, ATOM];
    if (kind === "excel_map") return [`MAP(${args[0]?.[0]}, LAMBDA(${attributes.get("name")}, ${args[1]?.[0]}))`, ATOM];
    if (kind === "excel_prefix") return [`${attributes.get("operator")}${operand(0, PREFIX)}`, PREFIX];
    const operator: string = attributes.get("operator");
    const level = PRECEDENCE[operator] as number;
    return [`${operand(0, level)} ${operator} ${operand(1, level + 1)}`, level];
  };
  return "=" + F.fold(expression, write)[0];
}
