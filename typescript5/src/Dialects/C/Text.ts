/** Text of the C dialect: `ToText(expression)` is a term of C as C source, with C's precedence, typed constants
 * written with a suffix or a cast, invalid syntax as written (`Terms.invalidText`). It reads a term value (or anything
 * `Terms.term` reads one from) through its dialect; `text(expression, dialect)` writes a term of any dialect of the C
 * family, `Cpp`'s too. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import { DIALECT, SUFFIXES } from "./Expressions.js";

const { repr } = Repr;
const { ValueError } = Errors;

// C's precedence, from loosest to tightest.
const [CONDITIONAL, OR, AND, BITOR, BITXOR, BITAND, EQUALITY, RELATIONAL, SHIFT, ADDITIVE, MULTIPLICATIVE, UNARY, POSTFIX] =
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const LEVELS: Record<string, number> = {
  "||": OR, "&&": AND, "|": BITOR, "^": BITXOR, "&": BITAND, "==": EQUALITY, "!=": EQUALITY, "<": RELATIONAL,
  "<=": RELATIONAL, ">": RELATIONAL, ">=": RELATIONAL, "<<": SHIFT, ">>": SHIFT, "+": ADDITIVE, "-": ADDITIVE,
  "*": MULTIPLICATIVE, "/": MULTIPLICATIVE, "%": MULTIPLICATIVE,
};

/** A C string literal. */
function stringLiteral(value: string): string {
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
  const [value, ctype] = [attributes.get("value"), attributes.get("type") ?? null];
  if (value === undefined) throw new ValueError("a constant needs a value");
  if (typeof value === "boolean") return [value ? "true" : "false", POSTFIX];
  if (typeof value === "string" && ctype === null) return [stringLiteral(value), POSTFIX];
  const written = number(value);
  const level = written.startsWith("-") ? UNARY : POSTFIX;
  if (ctype === null || ctype === "int" || ctype === "double" || !/[0-9]$/.test(written)) return [written, level]; // a default type, or a macro
  if (!SUFFIXES.has(ctype)) return [`(${ctype})${written}`, UNARY];
  return [written + (SUFFIXES.get(ctype) as string), level];
}

/** The expression as C source, parenthesized only where precedence requires. */
export function ToText(expression: unknown): string {
  return text(expression, DIALECT);
}

/** A term of `dialect`, a dialect of the C family, as its source, parenthesized only where precedence requires. */
export function text(expression: unknown, dialect: F.Dialect): string {
  const write = (node: any, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [written, precedence] = args[index] as [string, number];
      return precedence >= level ? written : `(${written})`;
    };
    const kind = dialect.kind(node)[0];
    const attributes = F.form(node).attributes as ReadonlyMap<string, any>;
    if (kind === "error" || kind === "missing") return [F.invalidText(dialect, kind, attributes), POSTFIX];
    if (kind === "constant") return constantText(attributes);
    if (kind === "variable") return [attributes.get("name"), POSTFIX];
    if (kind === "member") return [`${operand(0, POSTFIX)}${attributes.get("operator") ?? "."}${attributes.get("name")}`, POSTFIX];
    if (kind === "subscript") return [`${operand(0, POSTFIX)}[${(args[1] as [string, number])[0]}]`, POSTFIX];
    if (kind === "call") return [`${attributes.get("callable")}(${args.map(([written]) => written).join(", ")})`, POSTFIX];
    const operator: string = attributes.get("operator");
    if (kind === "unary") { // `- -x`, not the decrement `--x`
      const written = operand(0, UNARY);
      return [`${operator}${written[0] === operator && "+-".includes(operator) ? " " : ""}${written}`, UNARY];
    }
    if (kind === "cast") return [`(${attributes.get("type")})${operand(0, UNARY)}`, UNARY];
    if (kind === "conditional") { // right-associative
      return [`${operand(0, OR)} ? ${(args[1] as [string, number])[0]} : ${operand(2, CONDITIONAL)}`, CONDITIONAL];
    }
    const level = LEVELS[operator] as number;
    return [`${operand(0, level)} ${operator} ${operand(1, level + 1)}`, level];
  };
  return F.fold(expression, write)[0];
}
