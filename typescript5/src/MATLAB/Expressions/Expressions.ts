/**
 * Expressions of the MATLAB dialect: MATLAB expressions over scalars and structs, as MATLAB source writes them.
 *
 * MATLAB's terms are values of its `Term`, `Expressions.MATLAB.Expressions.Term`, the branch `matlab` of
 * `Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are four of
 * the framework's kinds (`Framework/Terms`), six of its own, whose slots hold MATLAB's terms, and the
 * framework's kinds of invalid syntax (`error`, `missing`); a term carries no domain:
 *
 * - `literal` (the framework's): a constant, a number (`int` or `float`, both doubles), a logical (`bool`) or a string
 *   scalar (`str`), its `value`, with its spelling (`text`) where it has one.
 * - `variable` (the framework's): an identifier, the value bound to a variable, its `name`.
 * - `list` (the framework's container constructor): `[a, b]`, the concatenation of its elements into a row array.
 * - `call` (the framework's): a function (`callable`) applied to ordered `arguments`, for the functions in
 *   `Domains.CALLS` (`isfield`, the bit functions, and `all`, `any`, `nnz`, `numel`, `sum`, `min`, `max`, `unique` and
 *   `ismember` of arrays).
 * - `binary` (`Expressions.MATLAB.Expressions.Binary`): `left <operator> right`, for the operators in `Domains.BINARY` (`==`,
 *   `~=`, `<`, ..., `&&`, `||`, `+`, `-`, `.*`).
 * - `unary` (`Expressions.MATLAB.Expressions.Unary`): `<operator> operand`, for `~` and `-`.
 * - `field` (`Expressions.MATLAB.Expressions.Field`): `value.name`, a field of a struct.
 * - `index` (`Expressions.MATLAB.Expressions.Index`): `value(index)`, an element of an array, from 1.
 * - `arrayfun` (`Expressions.MATLAB.Expressions.Arrayfun`): `arrayfun(@(name) body, array)`, the body's values for each
 *   element of the array, bound to `name`.
 * - `import` (`Expressions.MATLAB.Expressions.Import`): `import pkg.fn` or `import pkg.*` (its `name`), which make a
 *   package's functions callable by their short names within its body, the rest of the expression; `Text.ToText` writes
 *   it as a line before it. Functions are also found on the path and by their qualified names (`pkg.fn(x)`); which exist
 *   is up to the scope that evaluates them (see `Evaluators`).
 *
 * Its kinds are named plainly in its union, though other dialects have kinds of the same names (`binary`, `import`, ...):
 * each union names its own. There is no binding: translators substitute a
 * let's value for its name. `DIALECT` reads the terms (`Terms.Dialect`), validates and infers; the writers (`constant`,
 * `identifier`, `binary`, ...) write them through the builders, wherever a term is written, in a transaction.
 * `Text.ToText` writes a term as MATLAB source, e.g. `this.age >= 18 && isfield(this, "email")`.
 *
 * Its kind of domain, the branch of its union `Expressions.MATLAB.Expressions.DomainKind`, which `install` adds to the
 * framework's `Expressions.Framework.DomainKind` as the branch `matlab`: `string` (`OfString`), a string's text, sequences
 * of UTF-16 code units, lone surrogates among them; inferred `ordered`.
 *
 * Its domains, each named as MATLAB names its class: `define` writes them, owned by the singleton
 * `Expressions.MATLAB.Expressions` by name, each related to its schema, an `OfAny` of the scalar it narrows, which
 * `install` adds (`Expressions.MATLAB.Expressions.double`): `double` (IEEE 754's `binary64`, rounding ties to even),
 * `logical` (ISO/IEC 11404's `boolean`) and `string` (its own `string`). A `struct` is not a domain.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr, typeName } = Repr;

/** MATLAB's union of its kinds, added to the framework's terms as the branch `matlab`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.MATLAB.Expressions`: run after `Framework.install`, in a transaction of its
 * own; run again, it writes nothing. Its kind of domain too, its union of kinds added to the framework's as the branch
 * `matlab`, and its domains' schemas, each an `OfAny` of the scalar it narrows: its domains `define` writes after it.
 * Its holder, `Expressions.MATLAB.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
 * its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.MATLAB.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      Binary: S.OfObject, Unary: S.OfObject, Field: S.OfObject, Index: S.OfObject,
      Arrayfun: S.OfObject, Import: S.OfObject, // FrameworkTerm: the framework's union, by name
      Kinds: S.OfUnion, DomainKind: S.OfUnion, OfString: S.OfObject, // Kinds: the framework's
      double: S.OfAny, logical: S.OfAny, string: S.OfAny })
    .spec([
      // its dialect: the singleton `Expressions.MATLAB.Expressions`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.MATLAB.Expressions.Dialect").ref(true).singleton("Expressions.MATLAB.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("matlab").schema([_.Dialect])]),
      // its union of its kinds: the framework's it reuses, its own, and invalid syntax
      (_: any) => _.Term.name("Expressions.MATLAB.Expressions.Term").branches([
        (t: any) => t.name("literal").schema([Framework.Literal]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("call").schema([Framework.Call]),
        (t: any) => t.name("list").schema([Framework.List]),
        (t: any) => t.name("binary").schema([_.Binary]),
        (t: any) => t.name("unary").schema([_.Unary]),
        (t: any) => t.name("field").schema([_.Field]),
        (t: any) => t.name("index").schema([_.Index]),
        (t: any) => t.name("arrayfun").schema([_.Arrayfun]),
        (t: any) => t.name("import").schema([_.Import]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Binary.name("Expressions.MATLAB.Expressions.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Unary.name("Expressions.MATLAB.Expressions.Unary").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Field.name("Expressions.MATLAB.Expressions.Field").properties({
        name: S.OfStr, value: _.Term }),
      (_: any) => _.Index.name("Expressions.MATLAB.Expressions.Index").properties({
        value: _.Term, index: _.Term }),
      (_: any) => _.Arrayfun.name("Expressions.MATLAB.Expressions.Arrayfun").properties({
        name: S.OfStr, // bound to each element in the body
        array: _.Term, body: _.Term }),
      (_: any) => _.Import.name("Expressions.MATLAB.Expressions.Import").properties({
        name: S.OfStr, // pkg.fn or pkg.*
        body: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
      // to its `Term`
      (_: any) => _.Expression.name("Expressions.MATLAB.Expressions.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      // --- its kind of domain: a string's text, UTF-16 code units; inferred `ordered` ---
      (_: any) => _.OfString.name("Expressions.MATLAB.Expressions.OfString").properties({ ordered: S.OfBool }),
      (_: any) => _.DomainKind.name("Expressions.MATLAB.Expressions.DomainKind").branches([
        (t: any) => t.name("string").schema([_.OfString]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("matlab").schema([_.DomainKind])]),
      // --- its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.double.name("Expressions.MATLAB.Expressions.double").schemas([S.OfFloat]),
      (_: any) => _.logical.name("Expressions.MATLAB.Expressions.logical").schemas([S.OfBool]),
      (_: any) => _.string.name("Expressions.MATLAB.Expressions.string").schemas([S.OfStr]),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("matlab").schema([_.Term])]),
    ])]))]);
}

/** MATLAB's domains as data: the singleton `Expressions.MATLAB.Expressions` owning its domains by name (`domains`,
 * through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and related to its
 * schema (`Expressions.MATLAB.Expressions.double`) by `Expressions.Framework.HasDomain`: `double`, `logical` and
 * `string`. Run after the installs, in a transaction of its own; run again, it writes nothing. Its frame binds the
 * dialect (`dialect`) and each domain by its name: `store.transaction(Matlab.define)[0].get("double")`. */
export function define(txn: any): any {
  const [Matlab, Domain] = [txn.Expressions.MATLAB.Expressions, txn.Expressions.Framework.Domain];
  return txn.uid("mbse.Expressions.MATLAB.Expressions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: Matlab.Dialect, double: Domain, logical: Domain, string: Domain })
    .spec([
      (_: any) => _.dialect.domains({
        double: (e: any) => e.domain(_.double), logical: (e: any) => e.domain(_.logical),
        string: (e: any) => e.domain(_.string),
      }),
      (_: any) => _.double.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").radix(2n).precision(53n).emax(1023n).ordered(
          true)))))).schema([Matlab.double]),
      (_: any) => _.logical.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.boolean(
        (d: any) => d.ordered(false)))))).schema([Matlab.logical]),
      (_: any) => _.string.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.matlab((v: any) => v.string(
        (d: any) => d.ordered(true)))))).schema([Matlab.string]),
    ])]))]);
}

/** What a constant holds: MATLAB has no bytes. */
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

/** The constant of a native value; null for one MATLAB has no constant of. */
function native(value: unknown): Writer | null {
  return isScalar(value) ? constant(value) : null;
}

/** The MATLAB dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("MATLAB.Expressions", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.CALLS, required: ["callable"] }),
  binary: new F.Kind(F.APPLICATION, {
    operator: "operator", vocabulary: Domains.BINARY, required: ["operator"] }),
  unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  field: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.FIELD, required: ["name"] }),
  index: new F.Kind(F.APPLICATION, { signature: Domains.INDEX }),
  arrayfun: new F.Kind(F.QUANTIFIER, { signature: Domains.ARRAYFUN, required: ["name"], check: arrayfunCheck }),
  import: new F.Kind(F.IMPORT, { required: ["name"], check: importCheck }),
  list: new F.Kind(F.APPLICATION, { signature: Domains.CONCATENATION }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A MATLAB term, written through the builders: a spec, which writes its term where it is given. */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

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
  return record("binary", { operator }, { left, right });
}

/** `<operator> operand`. */
export function unary(operator: string, operand: unknown): Writer {
  return record("unary", { operator }, { operand });
}

/** `fn(args...)`. */
export function call(fn: string, ...args: unknown[]): Writer {
  const specs = args.map((argument) => DIALECT.spec(argument));
  return new Writer((u: any) => u.call((r: any) => r.callable(fn).arguments(specs)));
}

/** `value.name`. */
export function field(value: unknown, name: string): Writer {
  return record("field", { name }, { value });
}

/** `value(index)`, from 1. */
export function index(value: unknown, index: unknown): Writer {
  return record("index", {}, { value, index });
}

/** `arrayfun(@(name) body, array)`. */
export function arrayfun(name: string, array: unknown, body: unknown): Writer {
  return record("arrayfun", { name }, { array, body });
}

/** `[elements, ...]`, their concatenation into a row array. */
export function array(...elements: unknown[]): Writer {
  const specs = elements.map((element) => DIALECT.spec(element));
  return new Writer((u: any) => u.list((r: any) => r.elements(specs)));
}

/** `import name`, then `body`. */
export function import_(name: string, body: unknown): Writer {
  return record("import", { name }, { body });
}
