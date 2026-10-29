/** Text of the Ccpp dialect: `ToText(expression)` is the expression as C source, with C's precedence, typed
 * constants written with a suffix or a cast. It reads a term value (or anything `Terms.term` reads one from) through
 * `Terms.form`. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import { SUFFIXES } from "./Expressions.js";

const { repr } = Repr;

// C's precedence, from loosest to tightest.
const [CONDITIONAL, OR, AND, BITOR, BITXOR, BITAND, EQUALITY, RELATIONAL, SHIFT, ADDITIVE, MULTIPLICATIVE, UNARY, POSTFIX] =
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const LEVELS: Record<string, number> = {
  "||": OR, "&&": AND, "|": BITOR, "^": BITXOR, "&": BITAND, "==": EQUALITY, "!=": EQUALITY, "<": RELATIONAL,
  "<=": RELATIONAL, ">": RELATIONAL, ">=": RELATIONAL, "<<": SHIFT, ">>": SHIFT, "+": ADDITIVE, "-": ADDITIVE,
  "*": MULTIPLICATIVE, "/": MULTIPLICATIVE, "%": MULTIPLICATIVE,
};

/** A C string literal. */
function text(value: string): string {
  const escapes: Record<string, string> = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\t": "\\t", "\r": "\\r" };
  return `"${[...value].map((c) => escapes[c] ?? c).join("")}"`;
}

const MACROS: Record<string, string> = { NaN: "NAN", Infinity: "INFINITY", "-Infinity": "-INFINITY" };

/** A number as C writes it: an int's digits; a float's shortest text, with a point or an exponent; a long double's
 * text likewise; `INFINITY` and `NAN` for the values that have no literal. */
function number(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  let written: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return Number.isNaN(value) ? "NAN" : value > 0 ? "INFINITY" : "-INFINITY";
    written = repr(value);
  } else {
    written = value as string;
  }
  if (written in MACROS) return MACROS[written] as string;
  return /[.eE]/.test(written) ? written : written + ".0";
}

/** A constant: a bool, a string literal, or a number with its type's suffix or, for a type with none, a cast. */
function constantText(attributes: ReadonlyMap<string, any>): [string, number] {
  const [value, ctype] = [attributes.get("value") ?? null, attributes.get("type") ?? null];
  if (typeof value === "boolean") return [value ? "true" : "false", POSTFIX];
  if (typeof value === "string" && ctype === null) return [text(value), POSTFIX];
  const written = number(value);
  const level = written.startsWith("-") ? UNARY : POSTFIX;
  if (ctype === null || ctype === "int" || ctype === "double" || !/[0-9]$/.test(written)) return [written, level]; // a default type, or a macro
  if (!SUFFIXES.has(ctype)) return [`(${ctype})${written}`, UNARY];
  return [written + (SUFFIXES.get(ctype) as string), level];
}

/** The expression as C source, parenthesized only where precedence requires. */
export function ToText(expression: unknown): string {
  const write = (node: any, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [written, precedence] = args[index] as [string, number];
      return precedence >= level ? written : `(${written})`;
    };
    const form = F.form(node);
    const [kind, attributes] = [form.kind, form.attributes as ReadonlyMap<string, any>];
    if (kind === "ccpp_constant") return constantText(attributes);
    if (kind === "ccpp_identifier") return [attributes.get("name"), POSTFIX];
    if (kind === "ccpp_member") return [`${operand(0, POSTFIX)}${attributes.get("operator") ?? "."}${attributes.get("name")}`, POSTFIX];
    if (kind === "ccpp_subscript") return [`${operand(0, POSTFIX)}[${(args[1] as [string, number])[0]}]`, POSTFIX];
    if (kind === "call") return [`${attributes.get("callable")}(${args.map(([written]) => written).join(", ")})`, POSTFIX];
    const operator: string = attributes.get("operator");
    if (kind === "ccpp_unary") { // `- -x`, not the decrement `--x`
      const written = operand(0, UNARY);
      return [`${operator}${written[0] === operator && "+-".includes(operator) ? " " : ""}${written}`, UNARY];
    }
    if (kind === "ccpp_cast") return [`(${attributes.get("type")})${operand(0, UNARY)}`, UNARY];
    if (kind === "ccpp_conditional") { // right-associative
      return [`${operand(0, OR)} ? ${(args[1] as [string, number])[0]} : ${operand(2, CONDITIONAL)}`, CONDITIONAL];
    }
    const level = LEVELS[operator] as number;
    return [`${operand(0, level)} ${operator} ${operand(1, level + 1)}`, level];
  };
  return F.fold(expression, write)[0];
}
