/**
 * Expressions of the SystemVerilog dialect: expressions and constraints of SystemVerilog (and Verilog), over its
 * 4-state and 2-state vectors and reals, as its source writes them.
 *
 * SystemVerilog's terms are values of its union, `Expressions.SystemVerilog.Expression`, the branch `systemverilog` of
 * `Expressions.Framework.Term`, which `install` defines and adds to `Term` by schema extension. Its branches are the
 * framework's `literal`, `variable` and `call`, whose shape these have, its own kinds, each a value object
 * `Expressions.SystemVerilog.<Kind>` named plainly, whose slots hold SystemVerilog's terms, and the framework's kinds of
 * invalid syntax (`error`, `missing`); a term carries no domain:
 *
 * - `literal` (the framework's): a constant, an unsized decimal integer (an `integer`), a real, or a string literal, with
 *   its spelling (`text`) where it has one; it holds no bool nor bytes, which validation reports.
 * - `vector`: a sized literal, its bits MSB first (`0`, `1`, `x`, `z`), `signed` or not, written in its `base` (`b`, `o`,
 *   `d` or `h`; binary by default, and wherever the base cannot write the bits): `8'hFF`, `4'b10x1`, `8'sd5`.
 * - `variable` (the framework's): an identifier, the value bound to a variable.
 * - `unary`: `+`, `-`, `!`, `~` and the reductions `&`, `~&`, `|`, `~|`, `^`, `~^`.
 * - `binary`: `**`, `*`, `/`, `%`, `+`, `-`, `<<`, `>>`, `<<<`, `>>>`, `<`, `<=`, `>`, `>=`, `==`, `!=`, `===`, `!==`,
 *   `==?`, `!=?`, `&`, `^`, `^~`, `~^`, `|`, `&&`, `||`, and the implications `->` and `<->`.
 * - `conditional`: `condition ? consequent : alternative`.
 * - `concatenation` (`{a, b}`) and `replication` (`{n{a}}`).
 * - `select` (`a[i]`) and `range` (`a[msb:lsb]`), of a vector's bits or an array's elements.
 * - `inside`: `value inside {items}`, whose items are values or `span`s (`[low:high]`).
 * - `cast`: `type'(x)`, to a built-in type, `signed` or `unsigned`, or `width'(x)`.
 * - `member`: `object.name`.
 * - `call`: a system function (`$signed`, `$unsigned`, `$clog2`, `$bits`, `$countones`, `$onehot`, `$onehot0`,
 *   `$isunknown`) or a function the scope provides, named by its `callable`: the framework's `call`, read as this
 *   dialect reads it.
 * - `method`: an array method of no arguments, `array.name()`: `size`, the reductions `sum`, `product`, `and`, `or` and
 *   `xor`, and the locators `min`, `max` and `unique`, which give queues.
 * - `iterate`: a reduction with a `with` clause, `array.method(name) with (body)`, which binds `name` (the iterator) to
 *   each item of the array within the body and reduces the body's values: `ports.and(p) with (p.pin > 0)`.
 *
 * There is no binding: translators substitute a let's value for its name. `DIALECT` reads the kinds. The writers (`constant`,
 * `vector`, ...) write terms through the builders, wherever a term is written, in a transaction. `Text.ToText` writes an
 * expression as SystemVerilog source, with its precedence.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import type * as D from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr, typeName } = Repr;

/** What a cast may name: a built-in type, or a signedness. */
export const CASTS: readonly string[] = [...Domains.TYPES.keys(), "signed", "unsigned"];
/** The system functions. */
export const SYSTEM: readonly string[] = ["$signed", "$unsigned", "$clog2", "$bits", "$countones", "$onehot", "$onehot0", "$isunknown"];
/** The array reduction methods, which may have a `with` clause. */
export const REDUCTIONS: readonly string[] = ["sum", "product", "and", "or", "xor"];
/** The array methods of no arguments. */
export const METHODS: readonly string[] = ["size", ...REDUCTIONS, "min", "max", "unique"];
export const BASES: Record<string, number> = { b: 1, o: 3, h: 4, d: 0 };

/** SystemVerilog's union of its kinds, added to the framework's terms as the branch `systemverilog`, its own kinds,
 * and its dialect's schema, whose singleton is `Expressions.SystemVerilog`: run after `Framework.install`, in a
 * transaction of its own; run again, it writes nothing. Its `literal`, `variable` and `call` are the framework's. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.SystemVerilog/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, Term: S.OfUnion, Expression: S.OfUnion,
      Vector: S.OfObject, Unary: S.OfObject, Binary: S.OfObject, Conditional: S.OfObject,
      Concatenation: S.OfObject, Replication: S.OfObject, Select: S.OfObject, Range: S.OfObject,
      Inside: S.OfObject, Span: S.OfObject, Cast: S.OfObject, Member: S.OfObject,
      Method: S.OfObject, Iterate: S.OfObject }) // Term: the framework's union, by name
    .spec([
      // its dialect: the singleton `Expressions.SystemVerilog`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.SystemVerilog.Dialect").ref(true).singleton("Expressions.SystemVerilog").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("systemverilog").schema([_.Dialect])]),
      // its union of its kinds: the framework's it reuses, its own, and invalid syntax
      (_: any) => _.Expression.name("Expressions.SystemVerilog.Expression").branches([
        (t: any) => t.name("literal").schema([Framework.Literal]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("call").schema([Framework.Call]),
        (t: any) => t.name("vector").schema([_.Vector]),
        (t: any) => t.name("unary").schema([_.Unary]),
        (t: any) => t.name("binary").schema([_.Binary]),
        (t: any) => t.name("conditional").schema([_.Conditional]),
        (t: any) => t.name("concatenation").schema([_.Concatenation]),
        (t: any) => t.name("replication").schema([_.Replication]),
        (t: any) => t.name("select").schema([_.Select]),
        (t: any) => t.name("range").schema([_.Range]),
        (t: any) => t.name("inside").schema([_.Inside]),
        (t: any) => t.name("span").schema([_.Span]),
        (t: any) => t.name("cast").schema([_.Cast]),
        (t: any) => t.name("member").schema([_.Member]),
        (t: any) => t.name("method").schema([_.Method]),
        (t: any) => t.name("iterate").schema([_.Iterate]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Vector.name("Expressions.SystemVerilog.Vector").properties({
        value: S.OfStr, signed: S.OfBool, base: S.OfStr }), // its bits, MSB first
      (_: any) => _.Unary.name("Expressions.SystemVerilog.Unary").properties({
        operator: S.OfStr, operand: _.Expression }),
      (_: any) => _.Binary.name("Expressions.SystemVerilog.Binary").properties({
        operator: S.OfStr, left: _.Expression, right: _.Expression }),
      (_: any) => _.Conditional.name("Expressions.SystemVerilog.Conditional").properties({
        condition: _.Expression, consequent: _.Expression, alternative: _.Expression }),
      (_: any) => _.Concatenation.name("Expressions.SystemVerilog.Concatenation").properties({
        parts: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Expression])) }),
      (_: any) => _.Replication.name("Expressions.SystemVerilog.Replication").properties({
        count: _.Expression, value: _.Expression }),
      (_: any) => _.Select.name("Expressions.SystemVerilog.Select").properties({
        value: _.Expression, index: _.Expression }),
      (_: any) => _.Range.name("Expressions.SystemVerilog.Range").properties({
        value: _.Expression, msb: _.Expression, lsb: _.Expression }),
      (_: any) => _.Inside.name("Expressions.SystemVerilog.Inside").properties({
        value: _.Expression, items: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Expression])) }),
      (_: any) => _.Span.name("Expressions.SystemVerilog.Span").properties({
        low: _.Expression, high: _.Expression }),
      (_: any) => _.Cast.name("Expressions.SystemVerilog.Cast").properties({
        type: S.OfStr, width: S.OfInt, operand: _.Expression }),
      (_: any) => _.Member.name("Expressions.SystemVerilog.Member").properties({
        name: S.OfStr, object: _.Expression }),
      (_: any) => _.Method.name("Expressions.SystemVerilog.Method").properties({
        name: S.OfStr, array: _.Expression }),
      (_: any) => _.Iterate.name("Expressions.SystemVerilog.Iterate").properties({
        name: S.OfStr, // the iterator
        method: S.OfStr, array: _.Expression, body: _.Expression }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("systemverilog").schema([_.Expression])]),
    ])]))]);
}

const SCALARS = ["bigint", "number", "string"]; // what a constant holds: no bool, no bytes

/** A literal holds what a constant of SystemVerilog does: the framework's literal may hold more. */
function literalCheck(record: any): string[] {
  const value = F.attributesOf(record).get("value");
  return SCALARS.includes(typeof value) ? [] : [`a SystemVerilog literal cannot hold a ${typeName(value)}`];
}

function vectorCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const [value, base] = [attributes.get("value"), attributes.get("base") ?? null]; // a vector checked has a value
  const problems = value && [...value].every((b: string) => "01xz".includes(b)) ? [] : [
    `a vector's bits must be 0, 1, x and z, at least one, got ${repr(value)}`];
  if (base !== null && !(base in BASES)) problems.push(`a vector's base must be b, o, d or h, got ${repr(base)}`);
  return problems;
}

function vectorTyped(record: any): D.Domain | null {
  if (vectorCheck(record).length > 0) return null;
  const attributes = F.attributesOf(record);
  return Domains.vector(attributes.get("value").length, Boolean(attributes.get("signed")));
}

function castCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const [type, width] = [attributes.get("type") ?? null, attributes.get("width") ?? null];
  if ((type === null) === (width === null)) return ["a cast names a type or a width, not both nor neither"];
  if (width !== null) return width > 0n ? [] : [`a cast's width must be positive, got ${width}`];
  return CASTS.includes(type) ? [] : [`a cast's type must be a built-in type, signed or unsigned, got ${repr(type)}`];
}

function castTyped(record: any): D.Domain | null {
  return Domains.TYPES.get(F.attributesOf(record).get("type")) ?? null;
}

function methodCheck(record: any): string[] {
  const name = F.attributesOf(record).get("name") ?? null;
  return METHODS.includes(name) ? [] : [`an array method must be one of ${METHODS.join(", ")}, got ${repr(name)}`];
}

function iterateCheck(record: any): string[] {
  const method = F.attributesOf(record).get("method") ?? null;
  if (!REDUCTIONS.includes(method)) return [`an iteration's method must be one of ${REDUCTIONS.join(", ")}, got ${repr(method)}`];
  return [];
}

/** The constant of a native value: a bigint, a number or a string. */
function native(value: unknown): Writer | null {
  return SCALARS.includes(typeof value) ? constant(value) : null;
}

/** The SystemVerilog dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("SystemVerilog", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck }),
  vector: new F.Kind(F.LITERAL, { check: vectorCheck, typed: vectorTyped }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  binary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.BINARY, required: ["operator"] }),
  conditional: new F.Kind(F.APPLICATION, { signature: Domains.CONDITIONAL }),
  concatenation: new F.Kind(F.APPLICATION, { signature: Domains.CONCATENATION }),
  replication: new F.Kind(F.APPLICATION, { signature: Domains.REPLICATION }),
  select: new F.Kind(F.APPLICATION, { signature: Domains.SELECT }),
  range: new F.Kind(F.APPLICATION, { signature: Domains.RANGE }),
  inside: new F.Kind(F.APPLICATION, { signature: Domains.INSIDE }),
  span: new F.Kind(F.APPLICATION, { signature: Domains.SPAN }),
  cast: new F.Kind(F.APPLICATION, { signature: Domains.CAST, check: castCheck, typed: castTyped }),
  member: new F.Kind(F.APPLICATION, { signature: Domains.MEMBER, required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", signature: Domains.CALL, required: ["callable"] }),
  method: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.METHOD, required: ["name"], check: methodCheck }),
  iterate: new F.Kind(F.QUANTIFIER, { operator: "method", signature: Domains.ITERATE, required: ["name", "method"],
    check: iterateCheck }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A SystemVerilog term, written through the builders where it is given. */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}


/** The writer of a term of `tag`: its attributes (those not null), its slots (specs) and its variadic arguments. */
function kind(tag: string, attributes: Record<string, unknown>, slots: Record<string, unknown> = {},
  variadic: [string, unknown[]] | null = null): Writer {
  const specs = Object.entries(slots).map(([name, value]) => [name, DIALECT.spec(value)] as const);
  const elements = variadic === null ? null : [variadic[0], variadic[1].map((value) => DIALECT.spec(value))] as const;
  return new Writer((u: any) => u[tag]((r: any) => {
    for (const [name, value] of Object.entries(attributes)) {
      if (value !== null && value !== undefined) r[name]((p: any) => p.as_scalar(value));
    }
    for (const [name, written] of specs) r[name](written);
    if (elements !== null) r[elements[0]](elements[1]);
    return r;
  }));
}

/** An unsized integer, a real or a string literal (validation reports any other value). */
export function constant(value: unknown): Writer {
  return new Writer((u: any) => u.literal((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** A sized literal of `bits`, MSB first. */
export function vector(bits: string, signed: boolean | null = null, base: string | null = null): Writer {
  return kind("vector", { value: bits, signed, base });
}

export function identifier(name: string): Writer {
  return kind("variable", { name });
}

/** `<operator> operand`; the operand is a spec (a native value is a constant). */
export function unary(operator: string, operand: unknown): Writer {
  return kind("unary", { operator }, { operand });
}

export function binary(operator: string, left: unknown, right: unknown): Writer {
  return kind("binary", { operator }, { left, right });
}

export function conditional(condition: unknown, consequent: unknown, alternative: unknown): Writer {
  return kind("conditional", {}, { condition, consequent, alternative });
}

export function concatenation(...parts: unknown[]): Writer {
  return kind("concatenation", {}, {}, ["parts", parts]);
}

export function replication(count: unknown, value: unknown): Writer {
  return kind("replication", {}, { count, value });
}

export function select(value: unknown, index: unknown): Writer {
  return kind("select", {}, { value, index });
}

/** `value[msb:lsb]`. */
export function range_(value: unknown, msb: unknown, lsb: unknown): Writer {
  return kind("range", {}, { value, msb, lsb });
}

export function inside(value: unknown, ...items: unknown[]): Writer {
  return kind("inside", {}, { value }, ["items", items]);
}

/** `[low:high]`, an item of `inside`. */
export function span(low: unknown, high: unknown): Writer {
  return kind("span", {}, { low, high });
}

/** `type'(operand)`, or `width'(operand)` for a bigint. */
export function cast(typeOrWidth: string | bigint, operand: unknown): Writer {
  if (typeof typeOrWidth === "bigint") return kind("cast", { width: typeOrWidth }, { operand });
  return kind("cast", { type: typeOrWidth }, { operand });
}

export function member(object: unknown, name: string): Writer {
  return kind("member", { name }, { object });
}

/** `fn(args)`: the framework's `call`, its `callable` the function's name. */
export function call(fn: string, ...args: unknown[]): Writer {
  return kind("call", { callable: fn }, {}, ["arguments", args]);
}

/** `array.name()`. */
export function method(array: unknown, name: string): Writer {
  return kind("method", { name }, { array });
}

/** `array.method(name) with (body)`. */
export function iterate(array: unknown, method: string, name: string, body: unknown): Writer {
  return kind("iterate", { name, method }, { array, body });
}
