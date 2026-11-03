/**
 * Expressions of the C dialect: expressions of C, C11 to C23, over its arithmetic types, as its source writes them.
 * `Cpp`, the C++ dialect, shares its kinds.
 *
 * C's terms are values of its union, `Expressions.C.Expression`, the branch `c` of `Expressions.Framework.Term`, which
 * `install` defines and adds to `Term` by schema extension. Its branches are the framework's `variable` and `call`, whose
 * shape C's identifiers and calls have, kinds of its own, each a value object `Expressions.C.<Kind>` named plainly, and
 * the framework's kinds of invalid syntax (`error`, `missing`). Its own kinds are C++'s too: each schema is defined here
 * once and listed by `Cpp`'s union as well, so their slots hold `Expressions.Framework.Term`, a term of either, as the
 * framework's shared kinds' do; that a C term holds only C's terms is validation's (`Terms.Dialect`), not the schema's.
 * Each kind records the standards that have it (`Kind.standards`: `STANDARDS`, every one, as far as these kinds go):
 *
 * - `constant`: a number, a bool or a string literal (`value`), and optionally its type (`type`, one of `Domains.TYPES`),
 *   written with a suffix (`5u`, `5ull`, `1.5f`, `1.5L`) or, for a type without one, a cast (`(uint8_t)5`). Without a
 *   type an int is the first of `int`, `long` and `unsigned long` that holds it, and a float a `double`. Its own, not
 *   the framework's `literal`: it has C's `type` besides its `value`.
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
 * There is no binding: translators substitute a let's value for its name. `DIALECT` reads the kinds (`Terms.Dialect`).
 * The writers (`constant`, `identifier`, ...) write terms through the builders, in a transaction:
 * `store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`. `Text.ToText` writes an expression as C source,
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

/** The standards this dialect covers, ISO/IEC 9899:2011, 2018 and 2024: C17 is C11's corrigenda, with no new syntax. */
export const STANDARDS: readonly string[] = ["C11", "C17", "C23"];

/** C's union of its kinds, added to the framework's terms as the branch `c`, its own kinds, which `Cpp` shares, and
 * its dialect's schema, whose singleton is `Expressions.C`: run after `Framework.install`, in a transaction of its
 * own; run again, it writes nothing. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.C/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, Term: S.OfUnion, Expression: S.OfUnion,
      Constant: S.OfObject, Unary: S.OfObject, Binary: S.OfObject, Conditional: S.OfObject,
      Cast: S.OfObject, Member: S.OfObject, Subscript: S.OfObject }) // Term: the framework's, by name
    .spec([
      // its dialect: the singleton `Expressions.C`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.C.Dialect").ref(true).singleton("Expressions.C").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("c").schema([_.Dialect])]),
      // its union of its kinds: the framework's it reuses, its own, and invalid syntax
      (_: any) => _.Expression.name("Expressions.C.Expression").branches([
        (t: any) => t.name("constant").schema([_.Constant]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("unary").schema([_.Unary]),
        (t: any) => t.name("binary").schema([_.Binary]),
        (t: any) => t.name("conditional").schema([_.Conditional]),
        (t: any) => t.name("cast").schema([_.Cast]),
        (t: any) => t.name("member").schema([_.Member]),
        (t: any) => t.name("subscript").schema([_.Subscript]),
        (t: any) => t.name("call").schema([Framework.Call]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its own kinds, which C++ has too: their slots hold a term of either, `Term`
      (_: any) => _.Constant.name("Expressions.C.Constant").properties({
        value: S.OfAny((a: any) => a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr])),
        type: S.OfStr, // C's, by default its value's
      }),
      (_: any) => _.Unary.name("Expressions.C.Unary").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Binary.name("Expressions.C.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Conditional.name("Expressions.C.Conditional").properties({
        condition: _.Term, consequent: _.Term, alternative: _.Term }),
      (_: any) => _.Cast.name("Expressions.C.Cast").properties({
        type: S.OfStr, operand: _.Term }),
      (_: any) => _.Member.name("Expressions.C.Member").properties({
        name: S.OfStr,
        operator: S.OfStr, // '.' (by default) or '->'
        object: _.Term }),
      (_: any) => _.Subscript.name("Expressions.C.Subscript").properties({
        array: _.Term, index: _.Term }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("c").schema([_.Expression])]),
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

/** How the framework reads the kinds of the C family, each recording `standards`, the standards of its dialect's
 * language that have it: C's (`STANDARDS`) or C++'s (`Cpp.Expressions.STANDARDS`). */
export function kinds(standards: readonly string[]): Record<string, F.Kind> {
  return {
    constant: new F.Kind(F.LITERAL, { check: constantCheck, typed, standards }),
    variable: new F.Kind(F.REFERENCE, { required: ["name"], standards }),
    unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"], standards }),
    binary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.BINARY, required: ["operator"], standards }),
    conditional: new F.Kind(F.APPLICATION, { signature: Domains.CONDITIONAL, standards }),
    cast: new F.Kind(F.APPLICATION, { signature: Domains.CAST, required: ["type"], check: castCheck, typed, standards }),
    member: new F.Kind(F.APPLICATION, { signature: Domains.MEMBER, required: ["name"], check: memberCheck, standards }),
    subscript: new F.Kind(F.APPLICATION, { signature: Domains.SUBSCRIPT, standards }),
    call: new F.Kind(F.APPLICATION, { operator: "callable", signature: Domains.CALL, required: ["callable"], standards }),
  };
}

/** The constant of a native value: a number, a bool or a string. */
function native(value: unknown): Writer | null {
  return ["bigint", "number", "boolean", "string"].includes(typeof value) ? constant(value) : null;
}

/** The C dialect: its kinds, as the framework reads them. */
export const DIALECT: F.Dialect = new F.Dialect("C", kinds(STANDARDS), { domain_of: Domains.of, literal: native });

// --- Writers ---

/** A term of the C dialect, written through the builders where it is given (a spec). */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

/** The writers of the C family's kinds, for one dialect: its `Terms.Dialect`, whose `spec` writes a native value as its
 * constant, and its `Writer`. C's are this module's functions; `Cpp`'s, its own. */
export class Writers<W extends F.Writer> {
  constructor(readonly dialect: F.Dialect, readonly writer: new (write: (union: any) => any) => W) {}

  /** The constant `value`, of the C type `type` (by default, its value's). */
  constant = (value: unknown, type: string | null = null): W => new this.writer((u: any) => u.constant((r: any) => {
    if (value !== null && value !== undefined) r.value((p: any) => p.as_scalar(value));
    return type === null ? r : r.type(type);
  }));

  /** The variable `name`. */
  identifier = (name: string): W => new this.writer((u: any) => u.variable((r: any) => r.name(name)));

  /** `<operator> operand`; the operand is a spec (a native value is a constant). */
  unary = (operator: string, operand: unknown): W => {
    const operandSpec = this.dialect.spec(operand);
    return new this.writer((u: any) => u.unary((r: any) => r.operator(operator).operand(operandSpec)));
  };

  /** `left <operator> right`; each operand is a spec. */
  binary = (operator: string, left: unknown, right: unknown): W => {
    const [leftSpec, rightSpec] = [this.dialect.spec(left), this.dialect.spec(right)];
    return new this.writer((u: any) => u.binary((r: any) => r.operator(operator).left(leftSpec).right(rightSpec)));
  };

  /** `condition ? consequent : alternative`. */
  conditional = (condition: unknown, consequent: unknown, alternative: unknown): W => {
    const [a, b, c] = [this.dialect.spec(condition), this.dialect.spec(consequent), this.dialect.spec(alternative)];
    return new this.writer((u: any) => u.conditional((r: any) => r.condition(a).consequent(b).alternative(c)));
  };

  /** `(type) operand`. */
  cast = (type: string, operand: unknown): W => {
    const operandSpec = this.dialect.spec(operand);
    return new this.writer((u: any) => u.cast((r: any) => r.type(type).operand(operandSpec)));
  };

  /** `object.name`, or `object->name` with the operator '->'. */
  member = (object: unknown, name: string, operator: string | null = null): W => {
    const objectSpec = this.dialect.spec(object);
    return new this.writer((u: any) => u.member((r: any) => {
      r.name(name);
      if (operator !== null) r.operator(operator);
      return r.object(objectSpec);
    }));
  };

  /** `array[index]`. */
  subscript = (array: unknown, index: unknown): W => {
    const [arraySpec, indexSpec] = [this.dialect.spec(array), this.dialect.spec(index)];
    return new this.writer((u: any) => u.subscript((r: any) => r.array(arraySpec).index(indexSpec)));
  };

  /** `fn(args...)`: the framework's call, of a function the scope provides. */
  call = (fn: string, ...args: unknown[]): W => {
    const specs = args.map((argument) => this.dialect.spec(argument));
    return new this.writer((u: any) => u.call((r: any) => r.callable(fn).arguments(specs)));
  };
}

const WRITERS = new Writers(DIALECT, Writer);
export const { constant, identifier, unary, binary, conditional, cast, member, subscript, call } = WRITERS;
