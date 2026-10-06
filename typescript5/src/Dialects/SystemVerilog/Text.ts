/** Text of the SystemVerilog dialect: `ToText(expression)` is the expression as SystemVerilog source, with IEEE
 * 1800's precedence, sized literals in their base. */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import {
  BASES, _Call, _Cast, _Concatenation, _Conditional, _Constant, _Identifier, _Inside,
  _Iterate, _Member, _Method, _Range, _Replication, _Select, _Span, _Unary,
  _Vector,
} from "./Expressions.js";

const { repr } = Repr;

// SystemVerilog's precedence, from loosest to tightest (IEEE 1800, table 11-2).
const [IMPLY, CONDITIONAL, OR, AND, BITOR, BITXOR, BITAND, EQUALITY, RELATIONAL, SHIFT, ADDITIVE, MULTIPLICATIVE, POWER, UNARY,
  PRIMARY] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const LEVELS: Record<string, number> = {
  "->": IMPLY, "<->": IMPLY, "||": OR, "&&": AND, "|": BITOR, "^": BITXOR, "^~": BITXOR, "~^": BITXOR, "&": BITAND,
  ...Object.fromEntries(["==", "!=", "===", "!==", "==?", "!=?"].map((op) => [op, EQUALITY])),
  ...Object.fromEntries(["<", "<=", ">", ">="].map((op) => [op, RELATIONAL])),
  ...Object.fromEntries(["<<", ">>", "<<<", ">>>"].map((op) => [op, SHIFT])),
  "+": ADDITIVE, "-": ADDITIVE, "*": MULTIPLICATIVE, "/": MULTIPLICATIVE, "%": MULTIPLICATIVE, "**": POWER,
};

/** A vector's digits in a base, or null when some digit would mix x, z and known bits. */
function digitsOf(bits: string, base: string): string | null {
  const known = (group: string) => [...group].every((b) => "01".includes(b));
  if (base === "d") {
    if (known(bits)) return BigInt("0b" + bits).toString();
    return new Set(bits).size === 1 ? bits[0] as string : null;
  }
  const size = BASES[base] as number;
  const padded = "0".repeat((size - (bits.length % size)) % size) + bits;
  const digits: string[] = [];
  for (let i = 0; i < padded.length; i += size) {
    const group = padded.slice(i, i + size);
    if (known(group)) digits.push("0123456789abcdef"[parseInt(group, 2)] as string);
    else if (new Set(group).size === 1) digits.push(group[0] as string);
    else return null;
  }
  return digits.join("");
}

function vectorText(node: _Vector): string {
  let base = node.base ?? "b";
  let digits = base !== "b" ? digitsOf(node.value, base) : node.value;
  if (digits === null) [base, digits] = ["b", node.value];
  return `${node.value.length}'${node.signed ? "s" : ""}${base}${digits}`;
}

function constantText(value: unknown): string {
  if (typeof value === "string") {
    const escapes: Record<string, string> = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\t": "\\t" };
    return `"${[...value].map((c) => escapes[c] ?? c).join("")}"`;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return Number.isNaN(value) ? "0.0 / 0.0" : value > 0 ? "1.0 / 0.0" : "-1.0 / 0.0";
    return repr(value); // with a point or an exponent
  }
  return String(value);
}

/** The expression as SystemVerilog source, parenthesized only where precedence requires. */
export function ToText(expression: unknown): string {
  const write = (node: any, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [written, precedence] = args[index] as [string, number];
      return precedence >= level ? written : `(${written})`;
    };
    const texts = args.map(([written]) => written);
    if (node instanceof _Constant) {
      const written = constantText(node.value);
      return [written, written.includes("/") ? MULTIPLICATIVE : written.startsWith("-") ? UNARY : PRIMARY];
    }
    if (node instanceof _Vector) return [vectorText(node), PRIMARY];
    if (node instanceof _Identifier) return [node.name, PRIMARY];
    if (node instanceof _Member) return [`${operand(0, PRIMARY)}.${node.name}`, PRIMARY];
    if (node instanceof _Select) return [`${operand(0, PRIMARY)}[${texts[1]}]`, PRIMARY];
    if (node instanceof _Range) return [`${operand(0, PRIMARY)}[${texts[1]}:${texts[2]}]`, PRIMARY];
    if (node instanceof _Span) return [`[${texts[0]}:${texts[1]}]`, PRIMARY];
    if (node instanceof _Concatenation) return [`{${texts.join(", ")}}`, PRIMARY];
    if (node instanceof _Replication) return [`{${texts[0]}{${texts[1]}}}`, PRIMARY];
    if (node instanceof _Call) return [`${node.function}(${texts.join(", ")})`, PRIMARY];
    if (node instanceof _Method) return [`${operand(0, PRIMARY)}.${node.name}()`, PRIMARY];
    if (node instanceof _Iterate) return [`${operand(0, PRIMARY)}.${node.method}(${node.name}) with (${texts[1]})`, PRIMARY];
    if (node instanceof _Cast) return [`${node.type ?? node.width}'(${texts[0]})`, PRIMARY];
    if (node instanceof _Inside) return [`${operand(0, RELATIONAL + 1)} inside {${texts.slice(1).join(", ")}}`, RELATIONAL];
    if (node instanceof _Unary) return [`${node.operator}${operand(0, PRIMARY)}`, UNARY]; // its operand is a primary (A.8.3): `-(-x)`
    if (node instanceof _Conditional) { // right-associative
      return [`${operand(0, OR)} ? ${operand(1, CONDITIONAL)} : ${operand(2, CONDITIONAL)}`, CONDITIONAL];
    }
    const level = LEVELS[node.operator] as number;
    if (level === IMPLY) return [`${operand(0, level + 1)} ${node.operator} ${operand(1, level)}`, level]; // right-associative, the loosest
    return [`${operand(0, level)} ${node.operator} ${operand(1, level + 1)}`, level];
  };
  return F.fold(expression as F.Term, write)[0];
}
