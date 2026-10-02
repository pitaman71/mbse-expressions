/**
 * Domains of the Excel dialect: the values of a worksheet formula.
 *
 * `Number` holds numbers (Excel has only doubles; a constant `18n` is the number 18), `Text` holds text, `Logical`
 * holds TRUE and FALSE, and `Errors` holds `Error` values such as `#FIELD!`, which formulas compute with rather than
 * throw. A `Record` is what fields are read from: a mapping, or an object that writes its properties through
 * `accept`, as Excel's data types are. `Scalar` is a number, text or logical.
 */

import { Repr } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";

export const Anything = D.Anything;

/** An Excel error value, e.g. `new Error_('#FIELD!')`; errors with the same code are the same error. */
class ExcelError {
  private static readonly known = new Map<string, ExcelError>();

  private constructor(readonly code: string) {}

  /** The error with `code`. */
  static of(code: string): ExcelError {
    let found = ExcelError.known.get(code);
    if (found === undefined) ExcelError.known.set(code, found = new ExcelError(code));
    return found;
  }

  toString(): string {
    return this.code;
  }
}
export { ExcelError as Error };

/** Whether `value` is a mapping: a `Map`, or a plain object. */
export function isMapping(value: unknown): value is Map<string, unknown> | Record<string, unknown> {
  if (value instanceof Map) return true;
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

/** Whether fields can be read from `value`. */
export function is_record(value: unknown): boolean {
  return isMapping(value)
    || (value !== null && typeof value === "object" && typeof (value as { accept?: unknown }).accept === "function");
}

const NumberDomain = new D.OfTypes("number", Number, BigInt);
export { NumberDomain as Number };
export const Text = new D.OfTypes("text", String);
export const Logical = new D.OfTypes("logical", Boolean);
export const Errors = new D.OfTypes("error", ExcelError);
const RecordDomain = new D.OfValues("record", is_record);
export { RecordDomain as Record };
export const Scalar = new D.OfUnion(NumberDomain, Text, Logical);

const LOGIC = new D.Function([Scalar, Scalar], Logical);
const ARITHMETIC = new D.Function([Scalar, Scalar], NumberDomain);

/** The worksheet functions: `AND` and `OR` of any number of arguments, the others of the fixed number the dialect
 * gives them. */
export const FUNCTIONS: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["AND", new D.Opaque(Logical)], ["OR", new D.Opaque(Logical)], ["NOT", new D.Function([Scalar], Logical)],
  ["IF", new D.Function([Scalar, Anything, Anything], Anything)], ["ISERROR", new D.Function([Anything], Logical)],
  ...["BITAND", "BITOR", "BITXOR", "BITLSHIFT", "BITRSHIFT"].map((name) => [name, ARITHMETIC] as [string, D.Signature]),
  ["ROWS", new D.Function([Anything], NumberDomain)], ["INDEX", new D.Function([Anything, Scalar], Anything)],
  ["MATCH", new D.Function([Anything, Anything, Scalar], NumberDomain)], ["ISNUMBER", new D.Function([Anything], Logical)],
  ...["SUM", "MIN", "MAX"].map((name) => [name, new D.Function([Anything], NumberDomain)] as [string, D.Signature]),
  ["UNIQUE", new D.Function([Anything], Anything)],
]);

/** The infix operators. */
export const INFIX: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ...["=", "<>", "<", "<=", ">", ">="].map((operator) => [operator, LOGIC] as [string, D.Signature]),
  ...["+", "-", "*"].map((operator) => [operator, ARITHMETIC] as [string, D.Signature]),
]);

/** The prefix operators. */
export const PREFIX: ReadonlyMap<string, D.Signature> = new Map([["-", new D.Function([Scalar], NumberDomain)]]);

/** A field of a record. */
export const FIELD = new D.Function([RecordDomain], Anything);

/** `MAP`'s signature: the domain of an array's elements is not known statically. */
class Iterated extends D.Opaque {
  items(_domain: D.Domain): D.Domain {
    return Anything;
  }
}

/** `MAP(array, LAMBDA(name, body))`. */
export const MAP = new Iterated();

const NATIVES: ReadonlyMap<string, D.Domain> = new Map([
  ["bool", Logical], ["int", NumberDomain], ["float", NumberDomain], ["str", Text],
]);

/** The domain of a constant. */
export function of(value: unknown): D.Domain {
  return NATIVES.get(Repr.typeName(value)) as D.Domain;
}
