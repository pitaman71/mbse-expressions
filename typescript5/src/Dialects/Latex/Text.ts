/** Text of the Latex dialect: `ToText(expression)` is the expression as math-mode LaTeX, parenthesized only where
 * precedence requires. */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import { _Binary, _Constant, _Frac, _Function, _Member, _Symbol, _Unary, _Where } from "./Expressions.js";

// --- Rendering ---

// Precedence, from loosest to tightest.
const WHERE = 0, IMPLIES = 1, OR = 2, AND = 3, COMPARE = 4, SUM = 5, PRODUCT = 6, UNARY = 7, ATOM = 8;
const LEVELS: Record<string, number> = {
  "\\implies": IMPLIES, "\\lor": OR, "\\land": AND, "+": SUM, "-": SUM, "\\cdot": PRODUCT,
  "=": COMPARE, "\\neq": COMPARE, "<": COMPARE, "\\leq": COMPARE, ">": COMPARE, "\\geq": COMPARE,
};
const ESCAPES: Record<string, string> = {
  "\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", $: "\\$", "&": "\\&", "#": "\\#", "%": "\\%", _: "\\_",
  "~": "\\textasciitilde{}", "^": "\\textasciicircum{}",
};

function text(value: string): string {
  return `\\text{${[...value].map((character) => ESCAPES[character] ?? character).join("")}}`;
}

/** A symbol's or member's name: one character as it is, a longer one in `\mathit`. */
function nameText(name: string): string {
  return [...name].length === 1 ? name : `\\mathit{${name.replaceAll("_", "\\_")}}`;
}

function numberText(value: bigint | number): [string, number] {
  let written: string;
  if (typeof value === "number" && !Number.isFinite(value)) {
    written = Number.isNaN(value) ? "\\mathrm{NaN}" : value > 0 ? "\\infty" : "-\\infty";
  } else {
    written = Repr.repr(value);
  }
  if (written.includes("e")) { // scientific: 1e-07 is 1 \times 10^{-7}
    const [mantissa, exponent] = written.split("e") as [string, string];
    return [`${mantissa} \\times 10^{${Number(exponent)}}`, PRODUCT];
  }
  return [written, written.startsWith("-") ? UNARY : ATOM];
}

function constantText(value: unknown): [string, number] {
  if (typeof value === "boolean") return [value ? "\\mathrm{true}" : "\\mathrm{false}", ATOM];
  if (typeof value === "string") return [text(value), ATOM];
  return numberText(value as bigint | number);
}

/** The expression as math-mode LaTeX. */
export function ToText(expression: F.Term): string {
  const write = (node: F.Term, args: [string, number][]): [string, number] => {
    const operand = (index: number, level: number): string => {
      const [written, precedence] = args[index] as [string, number];
      return precedence >= level ? written : `(${written})`;
    };
    if (node instanceof _Constant) return constantText(node.value);
    if (node instanceof _Symbol) return [nameText(node.name), ATOM];
    if (node instanceof _Member) return [`${operand(0, ATOM)}.${nameText(node.name)}`, ATOM];
    if (node instanceof _Function) return [`\\operatorname{${node.name}}(${args.map(([t]) => t).join(", ")})`, ATOM];
    if (node instanceof _Frac) return [`\\frac{${args[0]?.[0]}}{${args[1]?.[0]}}`, ATOM];
    if (node instanceof _Where) {
      return [`${operand(1, IMPLIES)} \\quad \\text{where } ${nameText(node.name)} = ${operand(0, IMPLIES)}`, WHERE];
    }
    if (node instanceof _Unary) {
      if (node.operator === "\\lnot") return [`\\lnot ${operand(0, UNARY)}`, UNARY];
      return [`${node.operator}${operand(0, ATOM)}`, UNARY];
    }
    const binary = node as _Binary;
    const level = LEVELS[binary.operator] as number;
    if (level === COMPARE) return [`${operand(0, level + 1)} ${binary.operator} ${operand(1, level + 1)}`, level]; // not associative
    if (level === IMPLIES) return [`${operand(0, level + 1)} ${binary.operator} ${operand(1, level)}`, level]; // right-associative
    return [`${operand(0, level)} ${binary.operator} ${operand(1, level + 1)}`, level];
  };
  return F.fold(expression, write)[0];
}
