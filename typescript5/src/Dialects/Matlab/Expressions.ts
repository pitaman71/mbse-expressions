/**
 * Expressions of the Matlab dialect: MATLAB expressions over scalars and structs, as MATLAB source writes them.
 *
 * - `constant`: a number (int or float, both doubles), a logical (boolean) or a string scalar (str).
 * - `identifier`: the value bound to a variable.
 * - `binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`==`, `~=`, `<`, ..., `&&`, `||`, `+`,
 *   `-`, `.*`).
 * - `unary`: `<operator> operand`, for `~` and `-`.
 * - `call`: a function applied to ordered arguments, for the functions in `Domains.CALLS` (`isfield`).
 * - `field`: `value.name`, a field of a struct.
 * - `import`: `import pkg.fn` or `import pkg.*`, which make a package's functions callable by their short names
 *   within its body, the rest of the expression; `render` writes it as a line before it. Functions are also found on
 *   the path and by their qualified names (`pkg.fn(x)`); which exist is up to the scope that evaluates them (see
 *   `Evaluators`).
 *
 * There is no binding: translators substitute a let's value for its name. The meta-schemas are registered as
 * 'Expressions.Matlab.Of<Kind>'. `render` writes an expression as MATLAB source, e.g. `this.age >= 18 &&
 * isfield(this, "email")`.
 */

import { Errors, Repr } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import { isIdentifier } from "../Python/Expressions.js";
import * as Domains from "./Domains.js";

const { repr } = Repr;
type Native = Visitors.Native;
const STR = String;
const SCALARS: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ["int", BigInt], ["float", Number], ["str", String], ["bool", Boolean],
]);

class _Constant extends F.Node {
  static override KIND = "constant";
  static override ROLE = F.LITERAL;
  static override VALUE = SCALARS;
  declare value: unknown;
}

class _Identifier extends F.Node {
  static override KIND = "identifier";
  static override ROLE = F.REFERENCE;
  static override PROPERTIES = new Map([["name", STR]]);
  declare name: string;
}

class _Binary extends F.Node {
  static override KIND = "binary";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["operator", STR]]);
  static override SLOTS = ["left", "right"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.BINARY;
  declare operator: string;
  declare left: any;
  declare right: any;
}

class _Unary extends F.Node {
  static override KIND = "unary";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["operator", STR]]);
  static override SLOTS = ["operand"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.UNARY;
  declare operator: string;
  declare operand: any;
}

class _Call extends F.Node {
  static override KIND = "call";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["function", STR]]);
  static override VARIADIC = "arguments";
  static override OPERATOR = "function";
  static override VOCABULARY = Domains.CALLS;
  declare function: string;
  declare arguments: any[];
}

class _Field extends F.Node {
  static override KIND = "field";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["value"];
  static override OPERATOR = "name";
  static override SIGNATURE = Domains.FIELD;
  declare name: string;
  declare value: any;
}

function qualified(name: string, wildcard = false): boolean {
  let parts = name.split(".");
  if (wildcard && parts.length > 1 && parts[parts.length - 1] === "*") parts = parts.slice(0, -1);
  return parts.every(isIdentifier);
}

class _Import extends F.Node {
  static override KIND = "import";
  static override ROLE = F.IMPORT;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["body"];
  declare name: string;
  declare body: any;

  override check(): string[] {
    if (typeof this.name !== "string" || (this.name.includes(".") && qualified(this.name, true))) return [];
    return [`an import's name must be pkg.name or pkg.*, got ${repr(this.name)}`];
  }
}

export const DIALECT = new F.Declared("Matlab", [_Constant, _Identifier, _Binary, _Unary, _Call, _Field, _Import], {
  domain_of: Domains.of,
});
export const Builders = DIALECT.Builders;
export const Schema = DIALECT.Schema;

export function constant(value: Native): _Constant {
  return new _Constant(value);
}

export function identifier(name: string): _Identifier {
  return new _Identifier(name);
}

/** `left <operator> right`; each operand is a spec (a native value is a constant). */
export function binary(operator: string, left: unknown, right: unknown): _Binary {
  return new _Binary(operator, DIALECT.resolve(left), DIALECT.resolve(right));
}

export function unary(operator: string, operand: unknown): _Unary {
  return new _Unary(operator, DIALECT.resolve(operand));
}

export function call(fn: string, ...args: unknown[]): _Call {
  return new _Call(fn, args.map((argument) => DIALECT.resolve(argument)));
}

/** `value.name`. */
export function field(value: unknown, name: string): _Field {
  return new _Field(name, DIALECT.resolve(value));
}

/** `import name`, then `body`. */
export function import_(name: string, body: unknown): _Import {
  return new _Import(name, DIALECT.resolve(body));
}

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
export function render(expression: F.Node): string {
  const lines: string[] = [];
  while (expression instanceof _Import) {
    lines.push(`import ${expression.name}`);
    expression = expression.body;
  }
  const write = (node: F.Node, args: [string, number][]): [string, number] => {
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
    if (node instanceof _Import) throw new Errors.ValueError("an import can only enclose the whole expression");
    if (node instanceof _Unary) return [`${node.operator}${operand(0, UNARY)}`, UNARY];
    const binary = node as _Binary;
    const level = PRECEDENCE[binary.operator] as number;
    return [`${operand(0, level)} ${binary.operator} ${operand(1, level + 1)}`, level];
  };
  return [...lines, F.fold(expression, write)[0]].join("\n");
}
