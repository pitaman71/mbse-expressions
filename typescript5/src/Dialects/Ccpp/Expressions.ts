/**
 * Expressions of the Ccpp dialect: expressions of C and C++ (a superset of both), over their arithmetic types, as
 * their source writes them.
 *
 * Ccpp's terms are the framework's `variable` and `call`, whose shape C's identifiers and calls have, and kinds of its
 * own, which `install` adds to `Expressions.Framework.Term` by schema extension, each a branch tagged `ccpp_<kind>`
 * (dialects share kind names):
 *
 * - `constant`: a number, a bool or a string literal (`value`), and optionally its type (`type`, one of
 *   `Domains.TYPES`), written with a suffix (`5u`, `5ull`, `1.5f`, `1.5L`) or, for a type without one, a cast
 *   (`(uint8_t)5`). Without a type an int is the first of `int`, `long` and `unsigned long` that holds it, and a float a
 *   `double`. Its own, not the framework's `literal`: it has C's `type` besides its `value`.
 * - `variable`: the framework's: an identifier, the value bound to a variable (`name`).
 * - `unary` (`operator`: `+`, `-`, `!`, `~`; `operand`) and `binary` (`operator`: `*`, `/`, `%`, `+`, `-`, `<<`, `>>`,
 *   `<`, `<=`, `>`, `>=`, `==`, `!=`, `&`, `^`, `|`, `&&`, `||`; `left`, `right`).
 * - `conditional`: `condition ? consequent : alternative`.
 * - `cast`: `(type) operand`, to one of `Domains.TYPES`.
 * - `member`: `object.name`, or `object->name` with the `operator` `->`.
 * - `subscript`: `array[index]`.
 * - `call`: the framework's: a function the scope provides (`callable`), applied to ordered `arguments`.
 *
 * A term carries no domain; C's own `type` is what a constant and a cast are written with, a C attribute.
 * There is no binding: translators substitute a let's value for its name. `DIALECT` reads the kinds
 * (`Terms.Dialect`). The writers (`constant`, `identifier`, ...) write terms through the builders, in a transaction:
 * `store.Expressions.Framework.Term(binary("+", identifier("x"), 1n))`. `Text.ToText` writes an expression as C source,
 * with C's precedence, e.g. `x.width >= 8u && (uint8_t)(a + b) == 0`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

const { repr } = Repr;

/** The suffixes of typed constants: `5u`, `5ull`, `1.5f`, ...; other types are written with a cast. */
export const SUFFIXES: ReadonlyMap<string, string> = new Map([["unsigned int", "u"], ["long", "l"], ["unsigned long", "ul"],
  ["long long", "ll"], ["unsigned long long", "ull"], ["float", "f"], ["long double", "L"]]);

/** Ccpp's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const [dialect, specs] = F.dialect(txn, "Expressions.Ccpp"); // its dialect: a singleton
  return txn.uid("mbse.Expressions.Ccpp/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      ...dialect, Term: S.OfUnion, Constant: S.OfObject, Unary: S.OfObject, Binary: S.OfObject,
      Conditional: S.OfObject, Cast: S.OfObject, Member: S.OfObject, Subscript: S.OfObject,
    }) // the framework's union, found by its name
    .spec([
      ...specs,
      (_: any) => _.Constant.name("Expressions.Ccpp.Constant").properties({
        value: S.OfAny((a: any) => a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr])),
        type: S.OfStr, // C's, by default its value's
      }),
      (_: any) => _.Unary.name("Expressions.Ccpp.Unary").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Binary.name("Expressions.Ccpp.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Conditional.name("Expressions.Ccpp.Conditional").properties({
        condition: _.Term, consequent: _.Term, alternative: _.Term }),
      (_: any) => _.Cast.name("Expressions.Ccpp.Cast").properties({
        type: S.OfStr, operand: _.Term }),
      (_: any) => _.Member.name("Expressions.Ccpp.Member").properties({
        name: S.OfStr,
        operator: S.OfStr, // '.' (by default) or '->'
        object: _.Term }),
      (_: any) => _.Subscript.name("Expressions.Ccpp.Subscript").properties({
        array: _.Term, index: _.Term }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // branches added: schema extension
        (t: any) => t.name("ccpp_constant").schema([_.Constant]),
        (t: any) => t.name("ccpp_unary").schema([_.Unary]),
        (t: any) => t.name("ccpp_binary").schema([_.Binary]),
        (t: any) => t.name("ccpp_conditional").schema([_.Conditional]),
        (t: any) => t.name("ccpp_cast").schema([_.Cast]),
        (t: any) => t.name("ccpp_member").schema([_.Member]),
        (t: any) => t.name("ccpp_subscript").schema([_.Subscript]),
      ]),
    ])]))]);
}

function typeProblems(what: string, name: unknown): string[] {
  return Domains.TYPES.has(name as string) ? [] : [`${what} type must be one of C's arithmetic types, got ${repr(name)}`];
}

/** The C type a constant or a cast names, or null (validation reports a name that is not one). */
function typed(record: any): any {
  return Domains.TYPES.get(F.attributesOf(record).get("type")) ?? null;
}

/** A constant's type, when it has one, is an arithmetic type that holds its value. */
function constantCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const ctype = attributes.get("type") ?? null;
  if (ctype === null) return [];
  const problems = typeProblems("a constant's", ctype);
  if (problems.length === 0 && !(Domains.TYPES.get(ctype) as Domains.CType).contains(attributes.get("value"))) {
    problems.push(`a constant of ${ctype} cannot hold ${repr(attributes.get("value"))}`);
  }
  return problems;
}

function castCheck(record: any): string[] {
  const ctype = F.attributesOf(record).get("type") ?? null;
  return ctype === null ? [] : typeProblems("a cast's", ctype);
}

function memberCheck(record: any): string[] {
  const operator = F.attributesOf(record).get("operator") ?? null;
  return [null, ".", "->"].includes(operator) ? [] : [`a member's operator must be '.' or '->', got ${repr(operator)}`];
}

/** The constant of a native value: a number, a bool or a string. */
function native(value: unknown): Writer | null {
  return ["bigint", "number", "boolean", "string"].includes(typeof value) ? constant(value) : null;
}

/** The Ccpp dialect: its kinds, as the framework reads them. */
export const DIALECT: F.Dialect = new F.Dialect("Ccpp", {
  ccpp_constant: new F.Kind(F.LITERAL, { check: constantCheck, typed }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  ccpp_unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  ccpp_binary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.BINARY, required: ["operator"] }),
  ccpp_conditional: new F.Kind(F.APPLICATION, { signature: Domains.CONDITIONAL }),
  ccpp_cast: new F.Kind(F.APPLICATION, { signature: Domains.CAST, required: ["type"], check: castCheck, typed }),
  ccpp_member: new F.Kind(F.APPLICATION, { signature: Domains.MEMBER, required: ["name"], check: memberCheck }),
  ccpp_subscript: new F.Kind(F.APPLICATION, { signature: Domains.SUBSCRIPT }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", signature: Domains.CALL, required: ["callable"] }),
}, { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A term of the Ccpp dialect, written through the builders where it is given (a spec). */
export class Writer extends F.Writer {}

const specOf = (value: unknown): F.Writer => DIALECT.spec(value);

/** The constant `value`, of the C type `type` (by default, its value's). */
export function constant(value: unknown, type: string | null = null): Writer {
  return new Writer((u: any) => u.ccpp_constant((r: any) => {
    if (value !== null && value !== undefined) r.value((p: any) => p.as_scalar(value));
    return type === null ? r : r.type(type);
  }));
}

/** The variable `name`. */
export function identifier(name: string): Writer {
  return new Writer((u: any) => u.variable((r: any) => r.name(name)));
}

/** `<operator> operand`; the operand is a spec (a native value is a constant). */
export function unary(operator: string, operand: unknown): Writer {
  const operandSpec = specOf(operand);
  return new Writer((u: any) => u.ccpp_unary((r: any) => r.operator(operator).operand(operandSpec)));
}

/** `left <operator> right`; each operand is a spec. */
export function binary(operator: string, left: unknown, right: unknown): Writer {
  const [leftSpec, rightSpec] = [specOf(left), specOf(right)];
  return new Writer((u: any) => u.ccpp_binary((r: any) => r.operator(operator).left(leftSpec).right(rightSpec)));
}

/** `condition ? consequent : alternative`. */
export function conditional(condition: unknown, consequent: unknown, alternative: unknown): Writer {
  const [a, b, c] = [specOf(condition), specOf(consequent), specOf(alternative)];
  return new Writer((u: any) => u.ccpp_conditional((r: any) => r.condition(a).consequent(b).alternative(c)));
}

/** `(type) operand`. */
export function cast(type: string, operand: unknown): Writer {
  const operandSpec = specOf(operand);
  return new Writer((u: any) => u.ccpp_cast((r: any) => r.type(type).operand(operandSpec)));
}

/** `object.name`, or `object->name` with the operator '->'. */
export function member(object: unknown, name: string, operator: string | null = null): Writer {
  const objectSpec = specOf(object);
  return new Writer((u: any) => u.ccpp_member((r: any) => {
    r.name(name);
    if (operator !== null) r.operator(operator);
    return r.object(objectSpec);
  }));
}

/** `array[index]`. */
export function subscript(array: unknown, index: unknown): Writer {
  const [arraySpec, indexSpec] = [specOf(array), specOf(index)];
  return new Writer((u: any) => u.ccpp_subscript((r: any) => r.array(arraySpec).index(indexSpec)));
}

/** `fn(args...)`: the framework's call, of a function the scope provides. */
export function call(fn: string, ...args: unknown[]): Writer {
  const specs = args.map(specOf);
  return new Writer((u: any) => u.call((r: any) => r.callable(fn).arguments(specs)));
}
