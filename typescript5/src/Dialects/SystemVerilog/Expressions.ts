/**
 * Expressions of the SystemVerilog dialect: expressions and constraints of SystemVerilog (and Verilog), over its
 * 4-state and 2-state vectors and reals, as its source writes them.
 *
 * - `literal` (the framework's): a constant, an unsized decimal integer (an `integer`), a real, or a string literal; it
 *   holds no bool nor bytes, which validation reports.
 * - `vector`: a sized literal, its bits MSB first (`0`, `1`, `x`, `z`), `signed` or not, written in its `base` (`b`,
 *   `o`, `d` or `h`; binary by default, and wherever the base cannot write the bits): `8'hFF`, `4'b10x1`, `8'sd5`.
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
 * There is no binding: translators substitute a let's value for its name. `install` adds the kinds (but `literal`,
 * `variable` and `call`, the framework's, whose shape these have) to `Expressions.Framework.Term` by schema extension,
 * each a value object `Expressions.SystemVerilog.<Kind>` with a `domain`, as the branch `systemverilog_<kind>`
 * (`PREFIX`): dialects share kind names, and a branch's name is unique in the union; `DIALECT` reads them. The writers
 * (`constant`, `vector`, ...) write terms through the builders, wherever a term is written, in a transaction.
 * `Text.ToText` writes an expression as SystemVerilog source, with its precedence.
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
/** What names each branch this dialect adds to `Expressions.Framework.Term`: `systemverilog_binary`, ... */
export const PREFIX = "systemverilog_";

/**
 * A term's kind, as this dialect names it (its branch's tag without `PREFIX`: `binary`, `literal`, `call`), and its
 * record.
 */
export function kindOf(term: any): [string, any] {
  const [tag, record] = F.kindOf(term);
  return [tag.startsWith(PREFIX) ? tag.slice(PREFIX.length) : tag, record];
}

/** SystemVerilog's kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own.
 * Its `call` is the framework's. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const terms = (_: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term]));
  const kinds: Record<string, (_: any) => Record<string, unknown>> = {
    Vector: () => ({ value: S.OfStr, signed: S.OfBool, base: S.OfStr }), // its bits, MSB first
    Unary: (_) => ({ operator: S.OfStr, operand: _.Term }),
    Binary: (_) => ({ operator: S.OfStr, left: _.Term, right: _.Term }),
    Conditional: (_) => ({ condition: _.Term, consequent: _.Term, alternative: _.Term }),
    Concatenation: (_) => ({ parts: terms(_) }),
    Replication: (_) => ({ count: _.Term, value: _.Term }),
    Select: (_) => ({ value: _.Term, index: _.Term }),
    Range: (_) => ({ value: _.Term, msb: _.Term, lsb: _.Term }),
    Inside: (_) => ({ value: _.Term, items: terms(_) }),
    Span: (_) => ({ low: _.Term, high: _.Term }),
    Cast: (_) => ({ type: S.OfStr, width: S.OfInt, operand: _.Term }),
    Member: (_) => ({ name: S.OfStr, object: _.Term }),
    Method: (_) => ({ name: S.OfStr, array: _.Term }),
    Iterate: (_) => ({ name: S.OfStr, method: S.OfStr, array: _.Term, body: _.Term }), // name: the iterator
  };
  const names = Object.keys(kinds);
  return txn.uid("mbse.Expressions.SystemVerilog/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Term: S.OfUnion, ...Object.fromEntries(names.map((name) => [name, S.OfObject])) }) // the framework's union, by its name
    .spec([
      ...names.map((name) => (_: any) => _[name].name(`Expressions.SystemVerilog.${name}`).properties({
        ...(kinds[name] as (_: any) => Record<string, unknown>)(_), domain: S.OfStr })), // every term has a domain, by name
      (_: any) => _.Term.name("Expressions.Framework.Term").branches( // branches added: schema extension
        names.map((name) => (t: any) => t.name(PREFIX + name.toLowerCase()).schema([_[name]]))),
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
  [PREFIX + "vector"]: new F.Kind(F.LITERAL, { check: vectorCheck, typed: vectorTyped }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  [PREFIX + "unary"]: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  [PREFIX + "binary"]: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.BINARY, required: ["operator"] }),
  [PREFIX + "conditional"]: new F.Kind(F.APPLICATION, { signature: Domains.CONDITIONAL }),
  [PREFIX + "concatenation"]: new F.Kind(F.APPLICATION, { signature: Domains.CONCATENATION }),
  [PREFIX + "replication"]: new F.Kind(F.APPLICATION, { signature: Domains.REPLICATION }),
  [PREFIX + "select"]: new F.Kind(F.APPLICATION, { signature: Domains.SELECT }),
  [PREFIX + "range"]: new F.Kind(F.APPLICATION, { signature: Domains.RANGE }),
  [PREFIX + "inside"]: new F.Kind(F.APPLICATION, { signature: Domains.INSIDE }),
  [PREFIX + "span"]: new F.Kind(F.APPLICATION, { signature: Domains.SPAN }),
  [PREFIX + "cast"]: new F.Kind(F.APPLICATION, { signature: Domains.CAST, check: castCheck, typed: castTyped }),
  [PREFIX + "member"]: new F.Kind(F.APPLICATION, { signature: Domains.MEMBER, required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", signature: Domains.CALL, required: ["callable"] }),
  [PREFIX + "method"]: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.METHOD, required: ["name"], check: methodCheck }),
  [PREFIX + "iterate"]: new F.Kind(F.QUANTIFIER, { operator: "method", signature: Domains.ITERATE, required: ["name", "method"],
    check: iterateCheck }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A SystemVerilog term, written through the builders where it is given. */
export class Writer extends F.Writer {}

/** The framework's kinds, whose branches are not prefixed. */
const FRAMEWORK = ["variable", "call"];

/** The writer of a term of `tag`: its attributes (those not null), its slots (specs) and its variadic arguments. */
function kind(tag: string, attributes: Record<string, unknown>, slots: Record<string, unknown> = {},
  variadic: [string, unknown[]] | null = null): Writer {
  const specs = Object.entries(slots).map(([name, value]) => [name, DIALECT.spec(value)] as const);
  const elements = variadic === null ? null : [variadic[0], variadic[1].map((value) => DIALECT.spec(value))] as const;
  return new Writer((u: any) => u[FRAMEWORK.includes(tag) ? tag : PREFIX + tag]((r: any) => {
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
