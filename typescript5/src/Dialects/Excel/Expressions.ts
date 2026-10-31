/**
 * Expressions of the Excel dialect: worksheet formulas.
 *
 * Excel's terms are the framework's kinds (`Framework/Terms`) where a formula's construct has their shape, and five of
 * its own, which `install` adds to `Expressions.Framework.Term` by schema extension, each a branch named
 * `excel_<kind>` (dialects share kind names) holding a value object `Expressions.Excel.<Kind>` (a term carries no
 * domain):
 *
 * - `literal` (the framework's): a constant, a number (int or float), text (str) or a logical (boolean).
 * - `variable` (the framework's): the value bound to a `name`, by `LET` or as a defined name.
 * - `let` (the framework's): `LET(name, value, body)`.
 * - `call` (the framework's): a worksheet function (`callable`) applied to ordered `arguments`, for the functions in
 *   `Domains.FUNCTIONS` (`AND`, `OR`, `NOT`, `IF`, `ISERROR`, the bit functions, `ROWS`, `INDEX`, `MATCH`,
 *   `ISNUMBER`, `SUM`, `MIN`, `MAX` and `UNIQUE` of arrays, and `VSTACK`, which makes one); other names are add-in
 *   functions, which the workbook provides.
 * - `excel_cell`: a cell reference (`address`): `A1` on the current sheet, `Sheet1!A1` (`sheet`), or
 *   `[Book.xlsx]Sheet1!A1` (`book`) in another workbook. A workbook (see `Evaluators`) resolves it; it need not be
 *   bound.
 * - `excel_map`: `MAP(array, LAMBDA(name, body))`, the body's values for each element of the `array`, bound to `name`.
 * - `excel_infix`: `left <operator> right`, for `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-` and `*`.
 * - `excel_prefix`: `-operand`.
 * - `excel_field`: `value.name`, a field of a record (Excel's data types).
 *
 * `DIALECT` reads them (`Terms.Dialect`), validates and infers. The writers (`constant`, `name`, `cell`, `let_`,
 * `function`, `infix`, `prefix`, `field`, `map_`) write terms through the builders, in a transaction:
 * `store.Expressions.Framework.Term(function("AND", infix(">=", name("age"), 18n), true))`. `Text.ToText` writes a
 * term as a formula, e.g. `=AND(this.age >= 18, NOT(ISERROR(this.email)))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr } = Repr;

/** Excel's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const [dialect, specs] = F.dialect(txn, "Expressions.Excel"); // its dialect: a singleton
  return txn.uid("mbse.Expressions.Excel/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ ...dialect, Term: S.OfUnion, Cell: S.OfObject, Map: S.OfObject, Infix: S.OfObject, Prefix: S.OfObject,
      Field: S.OfObject }) // the framework's union, found by its name
    .spec([
      ...specs,
      (_: any) => _.Cell.name("Expressions.Excel.Cell").properties({
        address: S.OfStr, sheet: S.OfStr, book: S.OfStr }),
      (_: any) => _.Map.name("Expressions.Excel.Map").properties({
        name: S.OfStr, array: _.Term, body: _.Term }), // the LAMBDA's name and body
      (_: any) => _.Infix.name("Expressions.Excel.Infix").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Prefix.name("Expressions.Excel.Prefix").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Field.name("Expressions.Excel.Field").properties({
        name: S.OfStr, value: _.Term }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // branches added: schema extension
        (t: any) => t.name("excel_cell").schema([_.Cell]),
        (t: any) => t.name("excel_map").schema([_.Map]),
        (t: any) => t.name("excel_infix").schema([_.Infix]),
        (t: any) => t.name("excel_prefix").schema([_.Prefix]),
        (t: any) => t.name("excel_field").schema([_.Field]),
      ]),
    ])]))]);
}

const ADDRESS = /^\$?([A-Za-z]{1,3})\$?([1-9][0-9]*)$/;
const VALUES = new Set(["bool", "int", "float", "str"]); // what a constant holds

/** A cell address without `$` and in upper case, e.g. '$b$2' is 'B2'; null if `text` is not one. */
export function address(text: string): string | null {
  const match = ADDRESS.exec(text);
  return match ? `${(match[1] as string).toUpperCase()}${match[2]}` : null;
}

/** What is wrong with a constant holding `value`, or null. */
function held(value: unknown): string | null {
  const type = Repr.typeName(value);
  return VALUES.has(type) ? null : `an Excel literal cannot hold a ${type}`;
}

function literalCheck(record: any): string[] {
  const problem = held(F.attributesOf(record).get("value"));
  return problem === null ? [] : [problem];
}

function cellCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const problems: string[] = [];
  const text = attributes.get("address");
  if (typeof text === "string" && text !== "" && address(text) === null) {
    problems.push(`a cell's address must be a column and a row, like A1, got ${repr(text)}`);
  }
  if (attributes.has("book") && !attributes.has("sheet")) problems.push("a cell in another book needs a sheet");
  return problems;
}

function callCheck(record: any): string[] {
  const callable = F.attributesOf(record).get("callable");
  const problem = typeof callable === "string" ? Domains.arity_problem(callable, F.argumentsOf(record).length) : null;
  return problem === null ? [] : [problem];
}

/** The literal of a native value. */
function native(value: unknown): Writer {
  return constant(value);
}

/** The Excel dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Excel", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  excel_cell: new F.Kind(F.REFERENCE, { lexical: false, required: ["address"], check: cellCheck }),
  let: new F.Kind(F.BINDING, { required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.FUNCTIONS, required: ["callable"],
    check: callCheck }),
  excel_infix: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.INFIX, required: ["operator"] }),
  excel_prefix: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.PREFIX, required: ["operator"] }),
  excel_field: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.FIELD, required: ["name"] }),
  excel_map: new F.Kind(F.QUANTIFIER, { signature: Domains.MAP, required: ["name"] }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A term of the Excel dialect, written through the builders: a spec, written where it is given. */
export class Writer extends F.Writer {}

function specOf(value: unknown): F.Writer | null {
  return value === null || value === undefined ? null : DIALECT.spec(value);
}

function setSlots(record: any, slots: Record<string, F.Writer | null>): any {
  for (const [slot, value] of Object.entries(slots)) if (value !== null) record[slot](value);
  return record;
}

/** The constant `value`: a number, text or a logical; throws `TypeError` for any other. */
export function constant(value: unknown): Writer {
  const problem = held(value);
  if (problem !== null) throw new TypeError(problem);
  return new Writer((u: any) => u.literal((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** The value bound to `name`. */
export function name(name: string): Writer {
  return new Writer((u: any) => u.variable((v: any) => v.name(name)));
}

/** The cell at `address`, on `sheet` (by default the current one) of `book` (by default this one). */
export function cell(address: string, sheet: string | null = null, book: string | null = null): Writer {
  return new Writer((u: any) => u.excel_cell((r: any) => {
    r.address(address);
    if (sheet !== null) r.sheet(sheet);
    return book === null ? r : r.book(book);
  }));
}

/** `LET(name, value, body)`; the value and body are specs (a native value is a constant). */
export function let_(name: string, value: unknown, body: unknown): Writer {
  const slots = { value: specOf(value), body: specOf(body) };
  return new Writer((u: any) => u.let((r: any) => setSlots(r.name(name), slots)));
}

/** The worksheet function `name` applied to `args`. */
export function function_(name: string, ...args: unknown[]): Writer {
  const specs = args.map((argument) => DIALECT.spec(argument));
  return new Writer((u: any) => u.call((r: any) => r.callable(name).arguments(specs)));
}
export { function_ as function };

/** `left <operator> right`. */
export function infix(operator: string, left: unknown, right: unknown): Writer {
  const slots = { left: specOf(left), right: specOf(right) };
  return new Writer((u: any) => u.excel_infix((r: any) => setSlots(r.operator(operator), slots)));
}

/** `<operator>operand`. */
export function prefix(operator: string, operand: unknown): Writer {
  const slots = { operand: specOf(operand) };
  return new Writer((u: any) => u.excel_prefix((r: any) => setSlots(r.operator(operator), slots)));
}

/** `value.name`. */
export function field(value: unknown, name: string): Writer {
  const slots = { value: specOf(value) };
  return new Writer((u: any) => u.excel_field((r: any) => setSlots(r.name(name), slots)));
}

/** `MAP(array, LAMBDA(name, body))`. */
export function map_(name: string, array: unknown, body: unknown): Writer {
  const slots = { array: specOf(array), body: specOf(body) };
  return new Writer((u: any) => u.excel_map((r: any) => setSlots(r.name(name), slots)));
}
