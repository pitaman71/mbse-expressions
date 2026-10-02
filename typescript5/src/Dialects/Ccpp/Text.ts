/** Text of the Ccpp dialect: `ToText(expression)` is the expression as C source, with C's precedence, typed
 * constants written with a suffix or a cast. */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import {
  SUFFIXES, _Call, _Cast, _Conditional, _Constant, _Identifier, _Member, _Subscript,
  _Unary,
} from "./Expressions.js";

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
function constantText(node: _Constant): [string, number] {
  const [value, ctype] = [node.value, node.type];
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
    if (node instanceof _Constant) return constantText(node);
    if (node instanceof _Identifier) return [node.name, POSTFIX];
    if (node instanceof _Member) return [`${operand(0, POSTFIX)}${node.operator ?? "."}${node.name}`, POSTFIX];
    if (node instanceof _Subscript) return [`${operand(0, POSTFIX)}[${(args[1] as [string, number])[0]}]`, POSTFIX];
    if (node instanceof _Call) return [`${node.function}(${args.map(([written]) => written).join(", ")})`, POSTFIX];
    if (node instanceof _Unary) { // `- -x`, not the decrement `--x`
      const written = operand(0, UNARY);
      return [`${node.operator}${written[0] === node.operator && "+-".includes(node.operator) ? " " : ""}${written}`, UNARY];
    }
    if (node instanceof _Cast) return [`(${node.type})${operand(0, UNARY)}`, UNARY];
    if (node instanceof _Conditional) { // right-associative
      return [`${operand(0, OR)} ? ${(args[1] as [string, number])[0]} : ${operand(2, CONDITIONAL)}`, CONDITIONAL];
    }
    const level = LEVELS[node.operator] as number;
    return [`${operand(0, level)} ${node.operator} ${operand(1, level + 1)}`, level];
  };
  return F.fold(expression as F.Term, write)[0];
}
