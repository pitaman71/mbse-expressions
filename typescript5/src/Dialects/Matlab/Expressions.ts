/**
 * Expressions of the Matlab dialect: MATLAB expressions over scalars and structs, as MATLAB source writes them.
 *
 * Matlab's terms are four of the framework's kinds (`Framework/Terms`) and six of its own, which `install` adds to
 * `Expressions.Framework.Term` by schema extension (a term carries no domain):
 *
 * - `literal` (the framework's): a constant, a number (int or float, both doubles), a logical (boolean) or a string
 *   scalar (str), its `value`.
 * - `variable` (the framework's): an identifier, the value bound to a variable, its `name`.
 * - `list` (the framework's container constructor): `[a, b]`, the concatenation of its elements into a row array.
 * - `call` (the framework's): a function (`callable`) applied to ordered `arguments`, for the functions in
 *   `Domains.CALLS` (`isfield`, the bit functions, and `all`, `any`, `nnz`, `numel`, `sum`, `min`, `max`, `unique` and
 *   `ismember` of arrays).
 * - `matlab_binary` (`Expressions.Matlab.Binary`): `left <operator> right`, for the operators in `Domains.BINARY`
 *   (`==`, `~=`, `<`, ..., `&&`, `||`, `+`, `-`, `.*`).
 * - `matlab_unary` (`Expressions.Matlab.Unary`): `<operator> operand`, for `~` and `-`.
 * - `matlab_field` (`Expressions.Matlab.Field`): `value.name`, a field of a struct.
 * - `matlab_index` (`Expressions.Matlab.Index`): `value(index)`, an element of an array, from 1.
 * - `matlab_arrayfun` (`Expressions.Matlab.Arrayfun`): `arrayfun(@(name) body, array)`, the body's values for each
 *   element of the array, bound to `name`.
 * - `matlab_import` (`Expressions.Matlab.Import`): `import pkg.fn` or `import pkg.*` (its `name`), which make a
 *   package's functions callable by their short names within its body, the rest of the expression; `Text.ToText`
 *   writes it as a line before it. Functions are also found on the path and by their qualified names (`pkg.fn(x)`);
 *   which exist is up to the scope that evaluates them (see `Evaluators`).
 *
 * The kinds of its own are tagged `matlab_...`: a branch of `Expressions.Framework.Term` is named once in a store, and
 * other dialects have kinds of the same names (`binary`, `import`, ...). There is no binding: translators substitute a
 * let's value for its name. `DIALECT` reads the terms (`Terms.Dialect`), validates and infers; the writers
 * (`constant`, `identifier`, `binary`, ...) write them through the builders, wherever a term is written, in a
 * transaction. `Text.ToText` writes a term as MATLAB source, e.g. `this.age >= 18 && isfield(this, "email")`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr, typeName } = Repr;

/** Matlab's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const [dialect, specs] = F.dialect(txn, "Expressions.Matlab"); // its dialect: a singleton
  return txn.uid("mbse.Expressions.Matlab/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      ...dialect, Term: S.OfUnion, Binary: S.OfObject, Unary: S.OfObject, Field: S.OfObject, Index: S.OfObject,
      Arrayfun: S.OfObject, Import: S.OfObject, // Term: the framework's union
    })
    .spec([
      ...specs,
      (_: any) => _.Binary.name("Expressions.Matlab.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Unary.name("Expressions.Matlab.Unary").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Field.name("Expressions.Matlab.Field").properties({
        name: S.OfStr, value: _.Term }),
      (_: any) => _.Index.name("Expressions.Matlab.Index").properties({
        value: _.Term, index: _.Term }),
      (_: any) => _.Arrayfun.name("Expressions.Matlab.Arrayfun").properties({
        name: S.OfStr, // bound to each element in the body
        array: _.Term, body: _.Term }),
      (_: any) => _.Import.name("Expressions.Matlab.Import").properties({
        name: S.OfStr, // pkg.fn or pkg.*
        body: _.Term }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // branches added: schema extension
        (t: any) => t.name("matlab_binary").schema([_.Binary]),
        (t: any) => t.name("matlab_unary").schema([_.Unary]),
        (t: any) => t.name("matlab_field").schema([_.Field]),
        (t: any) => t.name("matlab_index").schema([_.Index]),
        (t: any) => t.name("matlab_arrayfun").schema([_.Arrayfun]),
        (t: any) => t.name("matlab_import").schema([_.Import]),
      ]),
    ])]))]);
}

/** What a constant holds: Matlab has no bytes. */
const SCALARS = new Set(["bool", "int", "float", "str"]);

function isScalar(value: unknown): boolean {
  return value !== null && value !== undefined && SCALARS.has(typeName(value));
}

/** A constant holds a number, a logical or a string. */
function literalCheck(record: any): string[] {
  const value = F.attributesOf(record).get("value");
  return isScalar(value) ? [] : [`a literal cannot hold a ${typeName(value)}`];
}

function arrayfunCheck(record: any): string[] {
  const name = F.attributesOf(record).get("name");
  return typeof name !== "string" || /^[A-Za-z][A-Za-z0-9_]*$/.test(name) ? []
    : [`an arrayfun's parameter must be an identifier, got ${repr(name)}`];
}

/** Python's `str.isidentifier()`. */
function isIdentifier(text: string): boolean {
  return /^[\p{XID_Start}_]\p{XID_Continue}*$/u.test(text);
}

function qualified(name: string, wildcard = false): boolean {
  let parts = name.split(".");
  if (wildcard && parts.length > 1 && parts[parts.length - 1] === "*") parts = parts.slice(0, -1);
  return parts.every(isIdentifier);
}

function importCheck(record: any): string[] {
  const name = F.attributesOf(record).get("name");
  if (typeof name !== "string" || (name.includes(".") && qualified(name, true))) return [];
  return [`an import's name must be pkg.name or pkg.*, got ${repr(name)}`];
}

/** The constant of a native value; null for one Matlab has no constant of. */
function native(value: unknown): Writer | null {
  return isScalar(value) ? constant(value) : null;
}

/** The Matlab dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Matlab", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.CALLS, required: ["callable"] }),
  matlab_binary: new F.Kind(F.APPLICATION, {
    operator: "operator", vocabulary: Domains.BINARY, required: ["operator"] }),
  matlab_unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  matlab_field: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.FIELD, required: ["name"] }),
  matlab_index: new F.Kind(F.APPLICATION, { signature: Domains.INDEX }),
  matlab_arrayfun: new F.Kind(F.QUANTIFIER, { signature: Domains.ARRAYFUN, required: ["name"], check: arrayfunCheck }),
  matlab_import: new F.Kind(F.IMPORT, { required: ["name"], check: importCheck }),
  list: new F.Kind(F.APPLICATION, { signature: Domains.CONCATENATION }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A Matlab term, written through the builders: a spec, which writes its term where it is given. */
export class Writer extends F.Writer {}

function specOf(value: unknown): F.Writer | null {
  return value === null || value === undefined ? null : DIALECT.spec(value);
}

/** The writer of a term of kind `tag`, with its attributes and its slots (specs; null leaves a slot empty). */
function record(tag: string, attributes: Record<string, unknown>, slots: Record<string, unknown>): Writer {
  const specs = Object.entries(slots).map(([name, value]) => [name, specOf(value)] as [string, F.Writer | null]);
  return new Writer((u: any) => u[tag]((r: any) => {
    for (const [name, value] of Object.entries(attributes)) r[name](value);
    for (const [name, value] of specs) if (value !== null) r[name](value);
    return r;
  }));
}

/** The constant `value`: a number, a logical or a string. */
export function constant(value: unknown): Writer {
  if (!isScalar(value)) throw new TypeError(`a literal cannot hold a ${typeName(value)}`);
  return new Writer((u: any) => u.literal((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** The variable `name`. */
export function identifier(name: string): Writer {
  return new Writer((u: any) => u.variable((v: any) => v.name(name)));
}

/** `left <operator> right`; each operand is a spec (a native value is a constant). */
export function binary(operator: string, left: unknown, right: unknown): Writer {
  return record("matlab_binary", { operator }, { left, right });
}

/** `<operator> operand`. */
export function unary(operator: string, operand: unknown): Writer {
  return record("matlab_unary", { operator }, { operand });
}

/** `fn(args...)`. */
export function call(fn: string, ...args: unknown[]): Writer {
  const specs = args.map((argument) => DIALECT.spec(argument));
  return new Writer((u: any) => u.call((r: any) => r.callable(fn).arguments(specs)));
}

/** `value.name`. */
export function field(value: unknown, name: string): Writer {
  return record("matlab_field", { name }, { value });
}

/** `value(index)`, from 1. */
export function index(value: unknown, index: unknown): Writer {
  return record("matlab_index", {}, { value, index });
}

/** `arrayfun(@(name) body, array)`. */
export function arrayfun(name: string, array: unknown, body: unknown): Writer {
  return record("matlab_arrayfun", { name }, { array, body });
}

/** `[elements, ...]`, their concatenation into a row array. */
export function array(...elements: unknown[]): Writer {
  const specs = elements.map((element) => DIALECT.spec(element));
  return new Writer((u: any) => u.list((r: any) => r.elements(specs)));
}

/** `import name`, then `body`. */
export function import_(name: string, body: unknown): Writer {
  return record("matlab_import", { name }, { body });
}
