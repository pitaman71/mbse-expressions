/**
 * Evaluators of the Excel dialect: compute a formula by Excel's rules.
 *
 * `Evaluators.OfAny(expression, scope)` binds names to numbers, text, logicals and records (mappings, or objects that
 * write their properties through `accept`). Values are `number`, `string` (text), `boolean` (logical) and
 * `Domains.Error`. Excel's rules apply, not Basic's:
 *
 * - Errors are values: a field a record does not have is `#FIELD!`, a name not bound is `#NAME?`, and an operand of the
 *   wrong type is `#VALUE!`. Errors propagate through operators and functions, except `ISERROR`, which tests for them,
 *   and `IF`, which evaluates only the branch it takes (FALSE without an alternative).
 * - Two-valued logic: `AND` and `OR` evaluate every argument; numbers are true when nonzero, and text is `#VALUE!`.
 *   An array among their arguments gives its numbers and logicals, its text ignored; with no value at all, they are
 *   `#VALUE!`.
 * - Arrays: a list property's values (or a name's list) are an array, which operators do not take (`#VALUE!`). `MAP(xs,
 *   LAMBDA(p, body))` gives the body's value for each element, errors among them; `ROWS` counts elements (a single
 *   value is one); `INDEX(xs, n)` is the element at `n`, from 1 and truncated, else `#REF!` (`#NUM!` for no number);
 *   `MATCH(x, xs, 0)` is the position of the first element equal to `x` (text ignoring case), else `#N/A`, and supports
 *   exact matching only (another match type is `#VALUE!`); `SUM`, `MIN` and `MAX` take an array's numbers, ignoring its
 *   text and logicals (`MIN` and `MAX` of none are 0), or a value given alone as arithmetic converts it, over all their
 *   arguments; `UNIQUE` gives the distinct elements, the first of each. An error among an array's elements is the
 *   result of these functions but `MAP`, `ROWS`, `INDEX` and `UNIQUE`.
 * - The bit functions (`BITAND`, `BITOR`, `BITXOR`, `BITLSHIFT`, `BITRSHIFT`) convert their arguments as arithmetic
 *   does, and give `#NUM!` for a number that is not an integer from 0 to 2^48 - 1, a shift that is not an integer of
 *   at most 53 either way, and a result beyond 2^48 - 1.
 * - Coercion: arithmetic converts logicals (TRUE is 1) and numeric text to numbers. Comparisons never coerce: values
 *   of different types are ordered numbers, then text, then logicals (`"a" > 1` is TRUE), and text compares ignoring
 *   case (`"a" = "A"` is TRUE).
 *
 * A `new Workbook(names, sheets, ...)` is the scope: its defined `names`, its `sheets` of cells (`{ Sheet1: { A1: 1n
 * } }`), the current `sheet` (by default the first), other workbooks by name (`books`) and `add_ins`, the functions
 * beyond the built-ins. A name is its innermost `LET`, then a defined name, else `#NAME?`; a cell is its value, 0 when
 * empty, or `#REF!` when its sheet or book does not exist; an add-in function is called with its arguments' values,
 * and an unknown function is `#NAME?`. An evaluator given an object of names makes a workbook whose defined names it
 * holds.
 */

import { Errors, Repr, Validators } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Evaluators.js";
import * as S from "../../Framework/Symbolics.js";
import * as Domains from "./Domains.js";
import * as Expressions from "./Expressions.js";

const { compareStrings, repr } = Repr;
const { ValueError } = Errors;
export const Error = Domains.Error;
type ExcelError = Domains.Error;
type Fn = (...args: any[]) => unknown;

const VALUE = Domains.Error.of("#VALUE!");
const FIELD = Domains.Error.of("#FIELD!");
const NAME = Domains.Error.of("#NAME?");
const REF = Domains.Error.of("#REF!");
const NUM = Domains.Error.of("#NUM!");
const NA = Domains.Error.of("#N/A");
const BITS = 2n ** 48n;

function numberOf(value: unknown): unknown {
  return typeof value === "bigint" ? Number(value) : value;
}

/** A value as a formula reads it: a number as a double, and a list (a list property's too) as an array. */
function valueOf(value: unknown): unknown {
  if (value instanceof Validators.ListRecord) return value.values.map(valueOf);
  if (Array.isArray(value)) return value.map(valueOf);
  return numberOf(value);
}

function cellAddress(text: string): string {
  const found = Expressions.address(text);
  if (found === null) throw new ValueError(`not a cell address: ${repr(text)}`);
  return found;
}

/** A workbook, as the scope of its formulas: defined `names`, `sheets` of cells by address, the current `sheet`,
 * other `books` by name, and `add_ins` by function name. */
export class Workbook extends S.Variables {
  readonly name: string;
  readonly sheets: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
  readonly sheet: string;
  readonly books: ReadonlyMap<string, Workbook>;
  readonly add_ins: ReadonlyMap<string, Fn>;

  constructor(names: S.Bindings = {}, sheets: Record<string, Record<string, unknown>> = {}, options: {
    name?: string; sheet?: string; books?: Record<string, Workbook>; add_ins?: Record<string, Fn>;
  } = {}) {
    super(names);
    this.name = options.name ?? "Book1";
    this.sheets = new Map(Object.entries(sheets).map(([sheetName, cells]) =>
      [sheetName, new Map(Object.entries(cells).map(([a, v]) => [cellAddress(a), v]))]));
    this.sheet = options.sheet ?? this.sheets.keys().next().value ?? "Sheet1";
    this.books = new Map(Object.entries(options.books ?? {}));
    this.add_ins = new Map(Object.entries(options.add_ins ?? {}).map(([fn, implementation]) =>
      [fn.toUpperCase(), implementation]));
  }

  override lookup(reference: any): unknown {
    if (reference.kind().KIND !== "cell") {
      const [found, value] = this.find(reference.name);
      return found ? valueOf(value) : NAME;
    }
    let book: Workbook = this;
    if (reference.book !== null && reference.book !== this.name) {
      const other = this.books.get(reference.book);
      if (other === undefined) return REF;
      book = other;
    }
    const cells = book.sheets.get(reference.sheet ?? book.sheet);
    if (cells === undefined) return REF;
    const key = Expressions.address(reference.address) as string;
    return cells.has(key) ? numberOf(cells.get(key)) : 0;
  }
}

function isError(value: unknown): value is ExcelError {
  return value instanceof Domains.Error;
}

function addIn(name: string, args: F.Thunk[], _node: unknown, scope: Workbook): unknown {
  const fn = scope.add_ins.get(name.toUpperCase());
  if (fn === undefined) return NAME;
  const values = args.map((argument) => argument());
  for (const value of values) if (isError(value)) return value;
  return numberOf(fn(...values));
}

/** The number numeric text writes, as Excel reads it: decimal, with an optional exponent. */
function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  return NUMERIC.test(trimmed) ? Number(trimmed) : null;
}

const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** A value as a number, for arithmetic: logicals and numeric text convert. */
function number(value: unknown): number | ExcelError {
  if (isError(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "bigint" || typeof value === "number") return Number(value);
  if (typeof value === "string") return parseNumber(value) ?? VALUE;
  return VALUE;
}

/** A bit function's argument: an integer below `limit`, of either sign when `signed`; otherwise `#NUM!`. */
function integer(value: unknown, limit: bigint, signed: boolean): bigint | ExcelError {
  const n = number(value);
  if (isError(n)) return n;
  if (!Number.isInteger(n) || Math.abs(n) >= Number(limit) || (n < 0 && !signed)) return NUM;
  return BigInt(n);
}

function bit(name: string): F.Implementation {
  return (args) => {
    const shift = name.endsWith("SHIFT");
    const a = integer((args[0] as F.Thunk)(), BITS, false);
    const b = integer((args[1] as F.Thunk)(), shift ? 54n : BITS, shift);
    for (const value of [a, b]) if (isError(value)) return value;
    const [x, y] = [a as bigint, b as bigint];
    if (shift) {
      const left = name === "BITLSHIFT" ? y : -y;
      const result = left >= 0n ? x << left : x >> -left;
      return result >= BITS ? NUM : Number(result);
    }
    return Number(name === "BITAND" ? x & y : name === "BITOR" ? x | y : x ^ y);
  };
}

/** A value as a logical, for AND, OR, NOT and IF: numbers are true when nonzero; text is an error. */
function truth(value: unknown): boolean | ExcelError {
  if (isError(value)) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint" || typeof value === "number") return Number(value) !== 0;
  return VALUE;
}

/** The order of Excel's comparisons: numbers, then text (ignoring case), then logicals. */
function rank(value: unknown): number {
  return typeof value === "boolean" ? 2 : typeof value === "string" ? 1 : 0;
}

function compareValues(a: unknown, b: unknown): number {
  const [x, y] = [rank(a), rank(b)];
  if (x !== y) return x < y ? -1 : 1;
  if (typeof a === "string") return Math.sign(compareStrings(a.toLowerCase(), (b as string).toLowerCase()));
  const [p, q] = [Number(a), Number(b)];
  return p === q ? 0 : Math.sign(p - q);
}

function compare(test: (order: number) => boolean): F.Implementation {
  return (args) => {
    const [a, b] = args.map((argument) => argument());
    for (const value of [a, b]) {
      if (isError(value)) return value;
      if (!["boolean", "bigint", "number", "string"].includes(typeof value)) return VALUE;
    }
    return test(compareValues(a, b));
  };
}

function arithmetic(apply: (a: number, b: number) => number): F.Implementation {
  return (args) => {
    const [a, b] = args.map((argument) => number(argument()));
    for (const value of [a, b]) if (isError(value)) return value;
    return apply(a as number, b as number);
  };
}

/** Throws TypeError when a function of a range of numbers of arguments has another number of them. */
function counted(name: string, args: F.Thunk[]): void {
  const problem = Domains.arity_problem(name, args.length);
  if (problem !== null) throw new TypeError(problem);
}

function logic(name: string, combine: (truths: boolean[]) => boolean): F.Implementation {
  return (args) => {
    counted(name, args);
    const truths: (boolean | ExcelError)[] = [];
    for (const value of args.map((argument) => argument())) {
      if (Array.isArray(value)) { // an array's numbers and logicals; its text is ignored
        for (const element of value) {
          if (isError(element)) truths.push(element);
          else if (typeof element === "boolean" || typeof element === "number") truths.push(element !== 0 && element !== false);
        }
      } else truths.push(truth(value));
    }
    for (const t of truths) if (isError(t)) return t;
    return truths.length > 0 ? combine(truths as boolean[]) : VALUE;
  };
}

/** An array's elements; a single value is an array of one. */
function elements(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function map(args: F.Thunk[]): unknown {
  const array = (args[0] as F.Thunk)();
  if (isError(array)) return array;
  const body = args[1] as unknown as (element: unknown) => unknown;
  return elements(array).map((element) => body(element));
}

function rows(args: F.Thunk[]): unknown {
  const array = (args[0] as F.Thunk)();
  return isError(array) ? array : elements(array).length;
}

function index(args: F.Thunk[]): unknown {
  const [array, position] = [(args[0] as F.Thunk)(), number((args[1] as F.Thunk)())];
  for (const value of [array, position]) if (isError(value)) return value;
  if (!Number.isFinite(position)) return NUM;
  const [found, row] = [elements(array), Math.trunc(position as number)];
  return row >= 1 && row <= found.length ? found[row - 1] : REF;
}

const isScalar = (value: unknown) => ["boolean", "number", "string"].includes(typeof value);

function match(args: F.Thunk[]): unknown {
  const [value, array, kind] = [(args[0] as F.Thunk)(), (args[1] as F.Thunk)(), number((args[2] as F.Thunk)())];
  for (const found of [value, array, kind]) if (isError(found)) return found;
  if (kind !== 0 || !isScalar(value)) return VALUE;
  const position = elements(array).findIndex((element) => isScalar(element) && rank(element) === rank(value) && compareValues(element, value) === 0);
  return position < 0 ? NA : position + 1;
}

/** SUM's, MIN's and MAX's numbers: an array's, its text and logicals ignored, or one value converted. */
function numbers(value: unknown): number[] | ExcelError {
  if (Array.isArray(value)) {
    const error = value.find(isError);
    return error !== undefined ? error : value.filter((element) => typeof element === "number");
  }
  const n = number(value);
  return isError(n) ? n : [n];
}

function aggregate(name: string, combine: (values: number[]) => number): F.Implementation {
  return (args) => {
    counted(name, args);
    const all: number[] = [];
    for (const argument of args) {
      const found = numbers(argument());
      if (isError(found)) return found;
      all.push(...found);
    }
    return combine(all);
  };
}

function sum(values: number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

function extreme(better: (a: number, b: number) => boolean): (values: number[]) => number {
  return (values) => {
    if (values.length === 0) return 0;
    let best = values[0] as number;
    for (const value of values.slice(1)) if (better(value, best)) best = value;
    return best;
  };
}

function same(a: unknown, b: unknown): boolean {
  return isError(a) ? a === b : rank(a) === rank(b) && compareValues(a, b) === 0;
}

function unique(args: F.Thunk[]): unknown {
  const array = (args[0] as F.Thunk)();
  if (isError(array)) return array;
  const distinct: unknown[] = [];
  for (const element of elements(array)) { // scalars and errors by value, text ignoring case; records are each distinct
    const scalar = isScalar(element) || isError(element);
    if (!scalar || !distinct.some((other) => typeof other === typeof element && isError(other) === isError(element) && same(other, element))) {
      distinct.push(element);
    }
  }
  return distinct;
}

function not(args: F.Thunk[]): boolean | ExcelError {
  const t = truth((args[0] as F.Thunk)());
  return isError(t) ? t : !t;
}

function if_(args: F.Thunk[]): unknown {
  counted("IF", args);
  const t = truth((args[0] as F.Thunk)());
  if (isError(t)) return t;
  if (t) return (args[1] as F.Thunk)();
  return args.length === 3 ? (args[2] as F.Thunk)() : false; // without an alternative, FALSE
}

function negate(args: F.Thunk[]): number | ExcelError {
  const n = number((args[0] as F.Thunk)());
  return isError(n) ? n : -n;
}

function field(args: F.Thunk[], node: any): unknown {
  const record = (args[0] as F.Thunk)();
  if (isError(record)) return record;
  if (!Domains.is_record(record)) return VALUE;
  const fields = Domains.isMapping(record)
    ? (record instanceof Map ? record : new Map(Object.entries(record))) : Validators.properties_of(record as never);
  if (!fields.has(node.name)) return FIELD;
  return valueOf(fields.get(node.name));
}

const interpreter = new F.Interpreter(Expressions.DIALECT, new Map<string, any>([
  ["function", new Map<string, F.Implementation>([
    ["AND", logic("AND", (truths) => truths.every(Boolean))], ["OR", logic("OR", (truths) => truths.some(Boolean))],
    ["NOT", not], ["IF", if_], ["ISERROR", (args) => isError((args[0] as F.Thunk)())],
    ...["BITAND", "BITOR", "BITXOR", "BITLSHIFT", "BITRSHIFT"].map((name) => [name, bit(name)] as [string, F.Implementation]),
    ["ROWS", rows], ["INDEX", index], ["MATCH", match], ["UNIQUE", unique],
    ["ISNUMBER", (args) => typeof (args[0] as F.Thunk)() === "number"],
    ["SUM", aggregate("SUM", sum)], ["MIN", aggregate("MIN", extreme((a, b) => a < b))], ["MAX", aggregate("MAX", extreme((a, b) => a > b))],
  ])],
  ["infix", new Map<string, F.Implementation>([
    ["=", compare((o) => o === 0)], ["<>", compare((o) => o !== 0)],
    ["<", compare((o) => o < 0)], ["<=", compare((o) => o <= 0)],
    [">", compare((o) => o > 0)], [">=", compare((o) => o >= 0)],
    ["+", arithmetic((a, b) => a + b)], ["-", arithmetic((a, b) => a - b)], ["*", arithmetic((a, b) => a * b)],
  ])],
  ["prefix", new Map<string, F.Implementation>([["-", negate]])],
  ["field", field],
  ["map", map],
]), { literal: numberOf, scope: (names) => new Workbook(names), extension: addIn });

/** The value of a formula in a workbook, or with the defined names in an object. */
export function OfAny(expression: unknown, scope: Workbook | S.Bindings = {}): unknown {
  return interpreter.run(Expressions.DIALECT.resolve(expression), scope);
}
