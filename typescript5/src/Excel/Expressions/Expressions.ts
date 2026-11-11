/**
 * Expressions of the Excel dialect: worksheet formulas.
 *
 * Excel's terms are values of its `Term`, `Expressions.Excel.Expressions.Term`, the branch `excel` of
 * `Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are the
 * framework's kinds (`Framework/Terms`) where a formula's construct has their shape, five of its own,
 * each a value object `Expressions.Excel.Expressions.<Kind>` whose slots hold Excel's terms, and the framework's kinds of invalid
 * syntax (`error`, `missing`); a term carries no domain:
 *
 * - `literal` (the framework's): a constant, a number (`int` or `float`), text (`str`) or a logical (`bool`), with its
 *   spelling (`text`) where it has one.
 * - `variable` (the framework's): the value bound to a `name`, by `LET` or as a defined name.
 * - `let` (the framework's): `LET(name, value, body)`.
 * - `call` (the framework's): a worksheet function (`callable`) applied to ordered `arguments`, for the functions in
 *   `Domains.FUNCTIONS` (`AND`, `OR`, `NOT`, `IF`, `ISERROR`, the bit functions, `ROWS`, `INDEX`, `MATCH`,
 *   `ISNUMBER`, `SUM`, `MIN`, `MAX` and `UNIQUE` of arrays, and `VSTACK`, which makes one); other names are add-in
 *   functions, which the workbook provides.
 * - `cell`: a cell reference (`address`): `A1` on the current sheet, `Sheet1!A1` (`sheet`), or
 *   `[Book.xlsx]Sheet1!A1` (`book`) in another workbook. A workbook (see `Evaluators`) resolves it; it need not be bound.
 * - `map`: `MAP(array, LAMBDA(name, body))`, the body's values for each element of the array, Let's `value`, bound to
 *   `name`: a binder refining the framework's `Let`.
 * - `infix`: `left <operator> right`, for `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-` and `*`.
 * - `prefix`: `-operand`.
 * - `field`: `value.name`, a field of a record (Excel's data types).
 *
 * `DIALECT` reads them (`Terms.Dialect`), validates and infers. The writers (`constant`, `name`, `cell`, `let_`,
 * `function`, `infix`, `prefix`, `field`, `map_`) write terms through the builders, in a transaction:
 * `store.Expressions.Framework.Term(function("AND", infix(">=", name("age"), 18), True))`. `Text.ToText` writes a term
 * as a formula, e.g. `=AND(this.age >= 18, NOT(ISERROR(this.email)))`.
 *
 * Its kinds of domain, the branches of its union `Expressions.Excel.Expressions.DomainKind`, which `install` adds to the
 * framework's `Expressions.Framework.DomainKind` as the branch `excel`, each with the inferred `ordered`: `text`
 * (`OfText`), sequences of UTF-16 code units, and `error` (`OfError`), Excel's error values, its `members` their codes
 * (`#DIV/0!`, ...), by index.
 *
 * Its domains, each named as Excel names its type of value: `define` writes them, owned by the singleton
 * `Expressions.Excel.Expressions` by name, each related to its schema, an `OfAny` of the scalar it narrows, which
 * `install` adds (`Expressions.Excel.Expressions.number`): `number` (IEEE 754's `binary64`, rounding ties to even),
 * `logical` (ISO/IEC 11404's `boolean`), `text` (its own `text`) and `error` (its own `error`, its members Excel's error
 * codes), whose schema narrows `str`: an error value is its code, as `Domains.Error` holds it. A record is not a domain.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr } = Repr;

/** Excel's union of its kinds, added to the framework's terms as the branch `excel`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.Excel.Expressions`: run after `Framework.install`, in a transaction of its
 * own; run again, it writes nothing. Its domains' schemas too, each an `OfAny` of the scalar it narrows: its domains
 * `define` writes after it.
 * Its holder, `Expressions.Excel.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
 * its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.Excel.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Kinds: S.OfUnion, DomainKind: S.OfUnion, OfText: S.OfObject, OfError: S.OfObject, // Kinds: the framework's
      number: S.OfAny, logical: S.OfAny, text: S.OfAny, error: S.OfAny,
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      Cell: S.OfObject, Map: S.OfObject, Infix: S.OfObject, Prefix: S.OfObject,
      Field: S.OfObject }) // FrameworkTerm: the framework's union, by name
    .spec([
      // its dialect: the singleton `Expressions.Excel.Expressions`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Excel.Expressions.Dialect").ref(true).singleton("Expressions.Excel.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("excel").schema([_.Dialect])]),
      // its union of its kinds: the framework's it reuses, its own, and invalid syntax
      (_: any) => _.Term.name("Expressions.Excel.Expressions.Term").branches([
        (t: any) => t.name("literal").schema([Framework.Literal]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("let").schema([Framework.Let]),
        (t: any) => t.name("call").schema([Framework.Call]),
        (t: any) => t.name("cell").schema([_.Cell]),
        (t: any) => t.name("map").schema([_.Map]),
        (t: any) => t.name("infix").schema([_.Infix]),
        (t: any) => t.name("prefix").schema([_.Prefix]),
        (t: any) => t.name("field").schema([_.Field]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Cell.name("Expressions.Excel.Expressions.Cell").properties({
        address: S.OfStr, sheet: S.OfStr, book: S.OfStr }),
      // a binder: `Let`, the LAMBDA's name and body, its array Let's `value`; Let's properties first
      (_: any) => _.Map.name("Expressions.Excel.Expressions.Map").refines([Framework.Let]).properties({
        value: _.Term, body: _.Term }),
      (_: any) => _.Infix.name("Expressions.Excel.Expressions.Infix").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Prefix.name("Expressions.Excel.Expressions.Prefix").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Field.name("Expressions.Excel.Expressions.Field").properties({
        name: S.OfStr, value: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
      // to its `Term`
      (_: any) => _.Expression.name("Expressions.Excel.Expressions.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      // --- its kinds of domain: text, UTF-16 code units; its error values, their codes its members; then what
      // follows from them ---
      (_: any) => _.OfText.name("Expressions.Excel.Expressions.OfText").properties({ ordered: S.OfBool }), // inferred
      (_: any) => _.OfError.name("Expressions.Excel.Expressions.OfError").properties({
        members: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfStr])), // its error codes
        ordered: S.OfBool }), // inferred
      (_: any) => _.DomainKind.name("Expressions.Excel.Expressions.DomainKind").branches([
        (t: any) => t.name("text").schema([_.OfText]),
        (t: any) => t.name("error").schema([_.OfError]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("excel").schema([_.DomainKind])]),
      // --- its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.number.name("Expressions.Excel.Expressions.number").schemas([S.OfFloat]),
      (_: any) => _.logical.name("Expressions.Excel.Expressions.logical").schemas([S.OfBool]),
      (_: any) => _.text.name("Expressions.Excel.Expressions.text").schemas([S.OfStr]),
      (_: any) => _.error.name("Expressions.Excel.Expressions.error").schemas([S.OfStr]), // an error value's code
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("excel").schema([_.Term])]),
    ])]))]);
}

/** Excel's domains as data: the singleton `Expressions.Excel.Expressions` owning its domains by name (`domains`,
 * through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and related to its
 * schema (`Expressions.Excel.Expressions.number`) by `Expressions.Framework.HasDomain`: `number`, `logical`, `text`
 * and `error`, its `members` Excel's error codes, in the order `ERROR.TYPE` numbers them, then those Excel added
 * since. Run after the installs, in a transaction of its own; run again, it writes nothing. Its frame binds the
 * dialect (`dialect`) and each domain by its name: `store.transaction(Excel.define)[0].get("number")`. */
export function define(txn: any): any {
  const [Excel, Domain] = [txn.Expressions.Excel.Expressions, txn.Expressions.Framework.Domain];
  return txn.uid("mbse.Expressions.Excel.Expressions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: Excel.Dialect, number: Domain, logical: Domain, text: Domain, error: Domain })
    .spec([
      (_: any) => _.dialect.domains({
        number: (e: any) => e.domain(_.number), logical: (e: any) => e.domain(_.logical),
        text: (e: any) => e.domain(_.text), error: (e: any) => e.domain(_.error),
      }),
      (_: any) => _.number.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n).radix(2n).precision(53n).emax(1023n).ordered(
          true)))))).schema([Excel.number]),
      (_: any) => _.logical.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.boolean(
        (d: any) => d.ordered(false)))))).schema([Excel.logical]),
      (_: any) => _.text.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.excel((v: any) => v.text(
        (d: any) => d.ordered(true)))))).schema([Excel.text]),
      (_: any) => _.error.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.excel((v: any) => v.error(
        (d: any) => d.members([
          "#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A", "#GETTING_DATA", // ERROR.TYPE's 1-8
          "#SPILL!", "#CALC!", "#FIELD!", "#BLOCKED!", "#CONNECT!", "#BUSY!", "#UNKNOWN!", // added since
        ]).ordered(false)))))).schema([Excel.error]),
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
export const DIALECT = new F.Dialect("Excel.Expressions", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  cell: new F.Kind(F.REFERENCE, { lexical: false, required: ["address"], check: cellCheck }),
  let: new F.Kind(F.BINDING, { required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.FUNCTIONS, required: ["callable"],
    check: callCheck }),
  infix: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.INFIX, required: ["operator"] }),
  prefix: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.PREFIX, required: ["operator"] }),
  field: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.FIELD, required: ["name"] }),
  map: new F.Kind(F.QUANTIFIER, { signature: Domains.MAP, required: ["name"] }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A term of the Excel dialect, written through the builders: a spec, written where it is given. */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

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
  return new Writer((u: any) => u.cell((r: any) => {
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
  return new Writer((u: any) => u.infix((r: any) => setSlots(r.operator(operator), slots)));
}

/** `<operator>operand`. */
export function prefix(operator: string, operand: unknown): Writer {
  const slots = { operand: specOf(operand) };
  return new Writer((u: any) => u.prefix((r: any) => setSlots(r.operator(operator), slots)));
}

/** `value.name`. */
export function field(value: unknown, name: string): Writer {
  const slots = { value: specOf(value) };
  return new Writer((u: any) => u.field((r: any) => setSlots(r.name(name), slots)));
}

/** `MAP(array, LAMBDA(name, body))`. */
export function map_(name: string, array: unknown, body: unknown): Writer {
  const slots = { value: specOf(array), body: specOf(body) };
  return new Writer((u: any) => u.map((r: any) => setSlots(r.name(name), slots)));
}
