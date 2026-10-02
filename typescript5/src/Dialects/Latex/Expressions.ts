/**
 * Expressions of the Latex dialect: mathematical notation, as LaTeX's math mode writes it.
 *
 * - `constant`: a number (int or float), text (str, written `\text{...}`) or a truth value (boolean).
 * - `symbol`: a named quantity, `a`, or `\mathit{age}` for a longer name.
 * - `binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`=`, `\neq`, `<`, `\leq`, `>`, `\geq`,
 *   `\land`, `\lor`, `\implies`, `+`, `-`, `\cdot`); `unary`: `\lnot` and `-`.
 * - `frac`: `\frac{numerator}{denominator}`.
 * - `member`: `value.\mathit{name}`, a member of a value.
 * - `function`: a named function applied to ordered arguments, `\operatorname{has}(x, \text{email})`, for the
 *   functions in `Domains.FUNCTIONS`.
 * - `where`: `body \quad \text{where } name = value`, which binds a name within its body.
 *
 * Notation has no evaluator: this dialect is written, rendered, validated, inferred and translated, and evaluation
 * belongs to the dialects it is translated to. The meta-schemas are registered as 'Expressions.Latex.Of<Kind>'.
 * `Text.ToText` writes an expression as math-mode LaTeX, parenthesized only where precedence requires.
 */

import { Repr } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

type Native = Visitors.Native;
const STR = String;
const SCALARS: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ["int", BigInt], ["float", Number], ["str", String], ["bool", Boolean],
]);

class _Constant extends F.Term {
  static override KIND = "constant";
  static override ROLE = F.LITERAL;
  static override VALUE = SCALARS;
  declare value: unknown;
}

class _Symbol extends F.Term {
  static override KIND = "symbol";
  static override ROLE = F.REFERENCE;
  static override PROPERTIES = new Map([["name", STR]]);
  declare name: string;
}

class _Binary extends F.Term {
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

class _Unary extends F.Term {
  static override KIND = "unary";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["operator", STR]]);
  static override SLOTS = ["operand"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.UNARY;
  declare operator: string;
  declare operand: any;
}

class _Frac extends F.Term {
  static override KIND = "frac";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["numerator", "denominator"];
  static override SIGNATURE = Domains.FRAC;
  declare numerator: any;
  declare denominator: any;
}

class _Member extends F.Term {
  static override KIND = "member";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["value"];
  static override OPERATOR = "name";
  static override SIGNATURE = Domains.MEMBER;
  declare name: string;
  declare value: any;
}

class _Function extends F.Term {
  static override KIND = "function";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["name", STR]]);
  static override VARIADIC = "arguments";
  static override OPERATOR = "name";
  static override VOCABULARY = Domains.FUNCTIONS;
  declare name: string;
  declare arguments: any[];
}

class _Where extends F.Term {
  static override KIND = "where";
  static override ROLE = F.BINDING;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["value", "body"];
  declare name: string;
  declare value: any;
  declare body: any;
}

export const DIALECT = new F.Declared("Latex",
  [_Constant, _Symbol, _Binary, _Unary, _Frac, _Member, _Function, _Where], { domain_of: Domains.of });
export const Builders = DIALECT.Builders;
export const Schema = DIALECT.Schema;

const spec = (value: unknown): any => DIALECT.resolve(value);

export function constant(value: Native): _Constant {
  return new _Constant(value);
}

export function symbol(name: string): _Symbol {
  return new _Symbol(name);
}

/** `left <operator> right`; each operand is a spec (a native value is a constant). */
export function binary(operator: string, left: unknown, right: unknown): _Binary {
  return new _Binary(operator, spec(left), spec(right));
}

export function unary(operator: string, operand: unknown): _Unary {
  return new _Unary(operator, spec(operand));
}

export function frac(numerator: unknown, denominator: unknown): _Frac {
  return new _Frac(spec(numerator), spec(denominator));
}

/** `value.\mathit{name}`. */
export function member(value: unknown, name: string): _Member {
  return new _Member(name, spec(value));
}

function function_(name: string, ...args: unknown[]): _Function {
  return new _Function(name, args.map(spec));
}
export { function_ as function };

/** `body \quad \text{where } name = value`. */
export function where(name: string, value: unknown, body: unknown): _Where {
  return new _Where(name, spec(value), spec(body));
}

/** For `Text`. */
export { _Binary, _Constant, _Frac, _Function, _Member, _Symbol, _Unary, _Where };
