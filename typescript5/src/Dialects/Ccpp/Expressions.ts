/**
 * Expressions of the Ccpp dialect: expressions of C and C++ (a superset of both), over their arithmetic types, as
 * their source writes them.
 *
 * - `constant`: a number, a bool or a string literal, and optionally its type (`Domains.TYPES`), written with a suffix
 *   (`5u`, `5ull`, `1.5f`, `1.5L`) or, for a type without one, a cast (`(uint8_t)5`). Without a type an int is the
 *   first of `int`, `long` and `unsigned long` that holds it, and a float a `double`.
 * - `identifier`: the value bound to a variable.
 * - `unary` (`+`, `-`, `!`, `~`) and `binary` (`*`, `/`, `%`, `+`, `-`, `<<`, `>>`, `<`, `<=`, `>`, `>=`, `==`, `!=`,
 *   `&`, `^`, `|`, `&&`, `||`).
 * - `conditional`: `condition ? consequent : alternative`.
 * - `cast`: `(type) operand`, to one of `Domains.TYPES`.
 * - `member`: `object.name`, or `object->name` with the operator `->`.
 * - `subscript`: `array[index]`.
 * - `call`: a function the scope provides, applied to ordered arguments.
 *
 * There is no binding: translators substitute a let's value for its name. The meta-schemas are registered as
 * 'Expressions.Ccpp.Of<Kind>'. `Text.ToText` writes an expression as C source, with C's precedence, e.g. `x.width >= 8u
 * && (uint8_t)(a + b) == 0`.
 */

import { Repr } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr } = Repr;
type Native = Visitors.Native;
const STR = String;

/** The suffixes of typed constants: `5u`, `5ull`, `1.5f`, ...; other types are written with a cast. */
export const SUFFIXES: ReadonlyMap<string, string> = new Map([["unsigned int", "u"], ["long", "l"], ["unsigned long", "ul"],
  ["long long", "ll"], ["unsigned long long", "ull"], ["float", "f"], ["long double", "L"]]);

function typeProblems(what: string, name: unknown): string[] {
  return Domains.TYPES.has(name as string) ? [] : [`${what} type must be one of C's arithmetic types, got ${repr(name)}`];
}

class _Constant extends F.Term {
  static override KIND = "constant";
  static override ROLE = F.LITERAL;
  static override VALUE = new Map<string, unknown>([["int", BigInt], ["float", Number], ["str", String], ["bool", Boolean]]);
  static override PROPERTIES = new Map([["type", STR]]);
  static override OPTIONAL = new Set(["type"]);
  declare value: unknown;
  /** The constant's type, by default its value's. */
  declare type: string | null;

  override typed(): any {
    return this.type !== null ? Domains.TYPES.get(this.type) ?? null : null;
  }

  /** A constant's type, when it has one, is an arithmetic type that holds its value. */
  override check(): string[] {
    if (this.type === null) return [];
    const problems = typeProblems("a constant's", this.type);
    if (problems.length === 0 && !(Domains.TYPES.get(this.type) as Domains.CType).contains(this.value)) {
      problems.push(`a constant of ${this.type} cannot hold ${repr(this.value)}`);
    }
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

class _Cast extends F.Term {
  static override KIND = "cast";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["type", STR]]);
  static override SLOTS = ["operand"];
  static override SIGNATURE = Domains.CAST;
  declare type: string;
  declare operand: any;

  override typed(): any {
    return Domains.TYPES.get(this.type) as any; // none, for a type validation reports
  }

  override check(): string[] {
    return this.type === null ? [] : typeProblems("a cast's", this.type);
  }
}

class _Member extends F.Term {
  static override KIND = "member";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = new Map([["name", STR], ["operator", STR]]);
  static override OPTIONAL = new Set(["operator"]);
  static override SLOTS = ["object"];
  static override SIGNATURE = Domains.MEMBER;
  declare name: string;
  /** '.' (by default) or '->'. */
  declare operator: string | null;
  declare object: any;

  override check(): string[] {
    return [null, ".", "->"].includes(this.operator) ? [] : [`a member's operator must be '.' or '->', got ${repr(this.operator)}`];
  }
}

class _Subscript extends F.Term {
  static override KIND = "subscript";
  static override ROLE = F.APPLICATION;
  static override SLOTS = ["array", "index"];
  static override SIGNATURE = Domains.SUBSCRIPT;
  declare array: any;
  declare index: any;
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

export const DIALECT = new F.Declared("Ccpp",
  [_Constant, _Identifier, _Unary, _Binary, _Conditional, _Cast, _Member, _Subscript, _Call], { domain_of: Domains.of });
export const Builders = DIALECT.Builders;
export const Schema = DIALECT.Schema;

export function constant(value: Native, type: string | null = null): _Constant {
  return new _Constant(value, type);
}

export function identifier(name: string): _Identifier {
  return new _Identifier(name);
}

/** `<operator> operand`; the operand is a spec (a native value is a constant). */
export function unary(operator: string, operand: unknown): _Unary {
  return new _Unary(operator, DIALECT.resolve(operand));
}

/** `left <operator> right`; each operand is a spec. */
export function binary(operator: string, left: unknown, right: unknown): _Binary {
  return new _Binary(operator, DIALECT.resolve(left), DIALECT.resolve(right));
}

/** `condition ? consequent : alternative`. */
export function conditional(condition: unknown, consequent: unknown, alternative: unknown): _Conditional {
  return new _Conditional(DIALECT.resolve(condition), DIALECT.resolve(consequent), DIALECT.resolve(alternative));
}

/** `(type) operand`. */
export function cast(type: string, operand: unknown): _Cast {
  return new _Cast(type, DIALECT.resolve(operand));
}

/** `object.name`, or `object->name` with the operator '->'. */
export function member(object: unknown, name: string, operator: string | null = null): _Member {
  return new _Member(name, operator, DIALECT.resolve(object));
}

/** `array[index]`. */
export function subscript(array: unknown, index: unknown): _Subscript {
  return new _Subscript(DIALECT.resolve(array), DIALECT.resolve(index));
}

export function call(fn: string, ...args: unknown[]): _Call {
  return new _Call(fn, args.map((argument) => DIALECT.resolve(argument)));
}

/** For `Text`. */
export { _Call, _Cast, _Conditional, _Constant, _Identifier, _Member, _Subscript, _Unary };
