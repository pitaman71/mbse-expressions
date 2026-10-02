/**
 * Expressions of the Excel dialect: worksheet formulas.
 *
 * - `constant`: a number (int or float), text (str) or a logical (boolean).
 * - `name`: the value bound to a name, by `LET` or as a defined name.
 * - `cell`: a cell reference: `A1` on the current sheet, `Sheet1!A1`, or `[Book.xlsx]Sheet1!A1` in another workbook.
 *   A workbook (see `Evaluators`) resolves it; it need not be bound.
 * - `let`: `LET(name, value, body)`.
 * - `function`: a worksheet function applied to ordered arguments, for the functions in `Domains.FUNCTIONS` (`AND`,
 *   `OR`, `NOT`, `IF`, `ISERROR`, the bit functions, and `ROWS`, `INDEX`, `MATCH`, `ISNUMBER`, `SUM`, `MIN`, `MAX` and
 *   `UNIQUE` of arrays); other names are add-in functions, which the workbook provides.
 * - `map`: `MAP(array, LAMBDA(name, body))`, the body's values for each element of the array, bound to `name`.
 * - `infix`: `left <operator> right`, for `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-` and `*`.
 * - `prefix`: `-operand`.
 * - `field`: `value.name`, a field of a record (Excel's data types).
 *
 * The meta-schemas are registered as 'Expressions.Excel.Of<Kind>'. `render` writes an expression as a formula, e.g.
 * `=AND(this.age >= 18, NOT(ISERROR(this.email)))`.
 */

import { Repr } from "@mbse/schemas/Framework";
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

const ADDRESS = /^\$?([A-Za-z]{1,3})\$?([1-9][0-9]*)$/;

/** A cell address without `$` and in upper case, e.g. '$b$2' is 'B2'; null if `text` is not one. */
export function address(text: string): string | null {
  const match = ADDRESS.exec(text);
  return match ? `${(match[1] as string).toUpperCase()}${match[2]}` : null;
}

class _Constant extends F.Node {
  static override KIND = "constant";
  static override ROLE = F.LITERAL;
  static override VALUE = SCALARS;
  declare value: unknown;
}

class _Name extends F.Node {
  static override KIND = "name";
  static override ROLE = F.REFERENCE;
  static override PROPERTIES = new Map([["name", STR]]);
  declare name: string;
}

class _Cell extends F.Node {
  static override KIND = "cell";
  static override ROLE = F.REFERENCE;
  static override LEXICAL = false;
  static override PROPERTIES = new Map([["address", STR], ["sheet", STR], ["book", STR]]);
  static override OPTIONAL = new Set(["sheet", "book"]);
  declare address: string;
  declare sheet: string | null;
  declare book: string | null;

  override check(): string[] {
    const problems: string[] = [];
    if (typeof this.address === "string" && this.address !== "" && address(this.address) === null) {
      problems.push(`a cell's address must be a column and a row, like A1, got ${repr(this.address)}`);
    }
    if (this.book !== null && this.sheet === null) problems.push("a cell in another book needs a sheet");
    return problems;
  }
}

class _Let extends F.Node {
  static override KIND = "let";
  static override ROLE = F.BINDING;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["value", "body"];
  declare name: string;
  declare value: any;
  declare body: any;
}

class _Function extends F.Node {
  static override KIND = "function";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["name", STR]]);
  static override VARIADIC = "arguments";
  static override OPERATOR = "name";
  static override VOCABULARY = Domains.FUNCTIONS;
  declare name: string;
  declare arguments: any[];
}

class _Infix extends F.Node {
  static override KIND = "infix";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["operator", STR]]);
  static override SLOTS = ["left", "right"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.INFIX;
  declare operator: string;
  declare left: any;
  declare right: any;
}

class _Prefix extends F.Node {
  static override KIND = "prefix";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["operator", STR]]);
  static override SLOTS = ["operand"];
  static override OPERATOR = "operator";
  static override VOCABULARY = Domains.PREFIX;
  declare operator: string;
  declare operand: any;
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

class _Map extends F.Node {
  static override KIND = "map";
  static override ROLE = F.QUANTIFIER;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["array", "body"];
  static override SIGNATURE = Domains.MAP;
  declare name: string;
  declare array: any;
  /** The LAMBDA's, with `name` bound to each element. */
  declare body: any;
}

export const DIALECT = new F.Declared("Excel", [_Constant, _Name, _Cell, _Let, _Function, _Infix, _Prefix, _Field, _Map], {
  domain_of: Domains.of,
});
export const Builders = DIALECT.Builders;
export const Schema = DIALECT.Schema;

export function constant(value: Native): _Constant {
  return new _Constant(value);
}

export function name(name: string): _Name {
  return new _Name(name);
}

/** The cell at `address`, on `sheet` (by default the current one) of `book` (by default this one). */
export function cell(address: string, sheet: string | null = null, book: string | null = null): _Cell {
  return new _Cell(address, sheet, book);
}

/** `LET(name, value, body)`; the value and body are specs (a native value is a constant). */
export function let_(name: string, value: unknown, body: unknown): _Let {
  return new _Let(name, DIALECT.resolve(value), DIALECT.resolve(body));
}

export function function_(name: string, ...args: unknown[]): _Function {
  return new _Function(name, args.map((argument) => DIALECT.resolve(argument)));
}
export { function_ as function };

export function infix(operator: string, left: unknown, right: unknown): _Infix {
  return new _Infix(operator, DIALECT.resolve(left), DIALECT.resolve(right));
}

export function prefix(operator: string, operand: unknown): _Prefix {
  return new _Prefix(operator, DIALECT.resolve(operand));
}

/** `value.name`. */
export function field(value: unknown, name: string): _Field {
  return new _Field(name, DIALECT.resolve(value));
}

// Excel's precedence, from loosest to tightest: comparison, then + and -, then *, then prefix -.
/** `MAP(array, LAMBDA(name, body))`. */
export function map_(name: string, array: unknown, body: unknown): _Map {
  return new _Map(name, DIALECT.resolve(array), DIALECT.resolve(body));
}

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
export function render(expression: F.Node): string {
  const write = (node: F.Node, args: [string, number][]): [string, number] => {
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
