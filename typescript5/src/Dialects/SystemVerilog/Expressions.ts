/**
 * Expressions of the SystemVerilog dialect: expressions and constraints of SystemVerilog (and Verilog), over its
 * 4-state and 2-state vectors and reals, as its source writes them.
 *
 * - `constant`: an unsized decimal integer (an `integer`), a real, or a string literal.
 * - `vector`: a sized literal, its bits MSB first (`0`, `1`, `x`, `z`), `signed` or not, written in its `base` (`b`,
 *   `o`, `d` or `h`; binary by default, and wherever the base cannot write the bits): `8'hFF`, `4'b10x1`, `8'sd5`.
 * - `identifier`: the value bound to a variable.
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
 *   `$isunknown`) or a function the scope provides.
 * - `method`: an array method of no arguments, `array.name()`: `size`, the reductions `sum`, `product`, `and`, `or` and
 *   `xor`, and the locators `min`, `max` and `unique`, which give queues.
 * - `iterate`: a reduction with a `with` clause, `array.method(name) with (body)`, which binds `name` (the iterator) to
 *   each item of the array within the body and reduces the body's values: `ports.and(p) with (p.pin > 0)`.
 *
 * There is no binding: translators substitute a let's value for its name. The meta-schemas are registered as
 * 'Expressions.SystemVerilog.Of<Kind>'. `Text.ToText` writes an expression as SystemVerilog source, with its
 * precedence.
 */

import { Repr } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr } = Repr;
type Native = Visitors.Native;
const STR = String;

/** What a cast may name: a built-in type, or a signedness. */
export const CASTS: readonly string[] = [...Domains.TYPES.keys(), "signed", "unsigned"];
/** The system functions. */
export const SYSTEM: readonly string[] = ["$signed", "$unsigned", "$clog2", "$bits", "$countones", "$onehot", "$onehot0", "$isunknown"];
/** The array reduction methods, which may have a `with` clause. */
export const REDUCTIONS: readonly string[] = ["sum", "product", "and", "or", "xor"];
/** The array methods of no arguments. */
export const METHODS: readonly string[] = ["size", ...REDUCTIONS, "min", "max", "unique"];
const BASES: Record<string, number> = { b: 1, o: 3, h: 4, d: 0 };

class _Constant extends F.Term {
  static override KIND = "constant";
  static override ROLE = F.LITERAL;
  static override VALUE = new Map<string, unknown>([["int", BigInt], ["float", Number], ["str", String]]);
  declare value: unknown;
}

class _Vector extends F.Term {
  static override KIND = "vector";
  static override ROLE = F.LITERAL;
  static override VALUE = new Map<string, unknown>([["str", String]]);
  static override PROPERTIES = new Map<string, unknown>([["signed", Boolean], ["base", STR]]);
  static override OPTIONAL = new Set(["signed", "base"]);
  /** The bits, MSB first. */
  declare value: string;
  declare signed: boolean | null;
  declare base: string | null;

  override typed(): any {
    return this.check().length === 0 ? Domains.vector(this.value.length, Boolean(this.signed)) : null;
  }

  override check(): string[] {
    const problems = this.value && [...this.value].every((b) => "01xz".includes(b)) ? [] : [
      `a vector's bits must be 0, 1, x and z, at least one, got ${repr(this.value)}`];
    if (this.base !== null && !(this.base in BASES)) problems.push(`a vector's base must be b, o, d or h, got ${repr(this.base)}`);
    return problems;
  }
}

class _Identifier extends F.Term {
  static override KIND = "identifier";
  static override ROLE = F.REFERENCE;
  static override PROPERTIES = new Map([["name", STR]]);
  declare name: string;
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

class _Conditional extends F.Term {
  static override KIND = "conditional";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["condition", "consequent", "alternative"];
  static override SIGNATURE = Domains.CONDITIONAL;
  declare condition: any;
  declare consequent: any;
  declare alternative: any;
}

class _Concatenation extends F.Term {
  static override KIND = "concatenation";
  static override ROLE = F.APPLICATION;
  static override VARIADIC = "parts";
  static override SIGNATURE = Domains.CONCATENATION;
  declare parts: any[];
}

class _Replication extends F.Term {
  static override KIND = "replication";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["count", "value"];
  static override SIGNATURE = Domains.REPLICATION;
  declare count: any;
  declare value: any;
}

class _Select extends F.Term {
  static override KIND = "select";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["value", "index"];
  static override SIGNATURE = Domains.SELECT;
  declare value: any;
  declare index: any;
}

class _Range extends F.Term {
  static override KIND = "range";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["value", "msb", "lsb"];
  static override SIGNATURE = Domains.RANGE;
  declare value: any;
  declare msb: any;
  declare lsb: any;
}

class _Inside extends F.Term {
  static override KIND = "inside";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["value"];
  static override VARIADIC = "items";
  static override SIGNATURE = Domains.INSIDE;
  declare value: any;
  declare items: any[];
}

class _Span extends F.Term {
  static override KIND = "span";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["low", "high"];
  static override SIGNATURE = Domains.SPAN;
  declare low: any;
  declare high: any;
}

class _Cast extends F.Term {
  static override KIND = "cast";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map<string, unknown>([["type", STR], ["width", BigInt]]);
  static override OPTIONAL = new Set(["type", "width"]);
  static override SLOTS = ["operand"];
  static override SIGNATURE = Domains.CAST;
  declare type: string | null;
  declare width: bigint | null;
  declare operand: any;

  override typed(): any {
    return Domains.TYPES.get(this.type as string) ?? null;
  }

  override check(): string[] {
    if ((this.type === null) === (this.width === null)) return ["a cast names a type or a width, not both nor neither"];
    if (this.width !== null) return this.width > 0n ? [] : [`a cast's width must be positive, got ${this.width}`];
    return CASTS.includes(this.type as string) ? [] : [`a cast's type must be a built-in type, signed or unsigned, got ${repr(this.type)}`];
  }
}

class _Member extends F.Term {
  static override KIND = "member";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["object"];
  static override SIGNATURE = Domains.MEMBER;
  declare name: string;
  declare object: any;
}

class _Call extends F.Term {
  static override KIND = "call";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["function", STR]]);
  static override VARIADIC = "arguments";
  static override OPERATOR = "function";
  static override SIGNATURE = Domains.CALL;
  declare function: string;
  declare arguments: any[];
}

class _Method extends F.Term {
  static override KIND = "method";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["name", STR]]);
  static override SLOTS = ["array"];
  static override OPERATOR = "name";
  static override SIGNATURE = Domains.METHOD;
  declare name: string;
  declare array: any;

  override check(): string[] {
    return METHODS.includes(this.name) ? [] : [`an array method must be one of ${METHODS.join(", ")}, got ${repr(this.name)}`];
  }
}

class _Iterate extends F.Term {
  static override KIND = "iterate";
  static override ROLE = F.QUANTIFIER;
  static override PROPERTIES = new Map([["name", STR], ["method", STR]]);
  static override SLOTS = ["array", "body"];
  static override OPERATOR = "method";
  static override SIGNATURE = Domains.ITERATE;
  /** The iterator. */
  declare name: string;
  declare method: string;
  declare array: any;
  /** The `with` clause, with `name` bound to each item. */
  declare body: any;

  override check(): string[] {
    if (!REDUCTIONS.includes(this.method)) return [`an iteration's method must be one of ${REDUCTIONS.join(", ")}, got ${repr(this.method)}`];
    return [];
  }
}

export const DIALECT = new F.Declared("SystemVerilog", [
  _Constant, _Vector, _Identifier, _Unary, _Binary, _Conditional, _Concatenation, _Replication, _Select, _Range,
  _Inside, _Span, _Cast, _Member, _Call, _Method, _Iterate], { domain_of: Domains.of });
export const Builders = DIALECT.Builders;
export const Schema = DIALECT.Schema;

export function constant(value: Native): _Constant {
  return new _Constant(value);
}

/** A sized literal of `bits`, MSB first. */
export function vector(bits: string, signed: boolean | null = null, base: string | null = null): _Vector {
  return new _Vector(bits, signed, base);
}

export function identifier(name: string): _Identifier {
  return new _Identifier(name);
}

/** `<operator> operand`; the operand is a spec (a native value is a constant). */
export function unary(operator: string, operand: unknown): _Unary {
  return new _Unary(operator, DIALECT.resolve(operand));
}

export function binary(operator: string, left: unknown, right: unknown): _Binary {
  return new _Binary(operator, DIALECT.resolve(left), DIALECT.resolve(right));
}

export function conditional(condition: unknown, consequent: unknown, alternative: unknown): _Conditional {
  return new _Conditional(DIALECT.resolve(condition), DIALECT.resolve(consequent), DIALECT.resolve(alternative));
}

export function concatenation(...parts: unknown[]): _Concatenation {
  return new _Concatenation(parts.map((part) => DIALECT.resolve(part)));
}

export function replication(count: unknown, value: unknown): _Replication {
  return new _Replication(DIALECT.resolve(count), DIALECT.resolve(value));
}

export function select(value: unknown, index: unknown): _Select {
  return new _Select(DIALECT.resolve(value), DIALECT.resolve(index));
}

/** `value[msb:lsb]`. */
export function range_(value: unknown, msb: unknown, lsb: unknown): _Range {
  return new _Range(DIALECT.resolve(value), DIALECT.resolve(msb), DIALECT.resolve(lsb));
}

export function inside(value: unknown, ...items: unknown[]): _Inside {
  return new _Inside(DIALECT.resolve(value), items.map((item) => DIALECT.resolve(item)));
}

/** `[low:high]`, an item of `inside`. */
export function span(low: unknown, high: unknown): _Span {
  return new _Span(DIALECT.resolve(low), DIALECT.resolve(high));
}

/** `type'(operand)`, or `width'(operand)` for a bigint. */
export function cast(typeOrWidth: string | bigint, operand: unknown): _Cast {
  if (typeof typeOrWidth === "bigint") return new _Cast(null, typeOrWidth, DIALECT.resolve(operand));
  return new _Cast(typeOrWidth, null, DIALECT.resolve(operand));
}

export function member(object: unknown, name: string): _Member {
  return new _Member(name, DIALECT.resolve(object));
}

export function call(fn: string, ...args: unknown[]): _Call {
  return new _Call(fn, args.map((argument) => DIALECT.resolve(argument)));
}

/** `array.name()`. */
export function method(array: unknown, name: string): _Method {
  return new _Method(name, DIALECT.resolve(array));
}

/** `array.method(name) with (body)`. */
export function iterate(array: unknown, method: string, name: string, body: unknown): _Iterate {
  return new _Iterate(name, method, DIALECT.resolve(array), DIALECT.resolve(body));
}

/** For `Text`. */
export { BASES, _Call, _Cast, _Concatenation, _Conditional, _Constant, _Identifier, _Inside, _Iterate, _Member, _Method, _Range, _Replication, _Select, _Span, _Unary, _Vector };
