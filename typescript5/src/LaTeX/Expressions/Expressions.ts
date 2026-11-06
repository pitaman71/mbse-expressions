/**
 * Expressions of the LaTeX dialect: mathematical notation, as LaTeX's math mode writes it.
 *
 * LaTeX's terms are values of its `Term`, `Expressions.LaTeX.Expressions.Term`, the branch `latex` of
 * `Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are four of
 * the framework's kinds (`Framework/Terms`), whose shape notation's constructs have, four of its own,
 * each a value object whose slots hold LaTeX's terms, and the framework's kinds of invalid syntax (`error`, `missing`); a
 * term carries no domain:
 *
 * - `literal` (the framework's): a constant, a number (`int` or `float`), text (`str`, written `\\text{...}`) or a truth
 *   value (`bool`): its `value`, with its spelling (`text`) where it has one. Notation has no bytes: validation reports a literal holding one.
 * - `variable` (the framework's): a named quantity, `a`, or `\\mathit{age}` for a longer name: its `name`.
 * - `binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`=`, `\\neq`, `<`, `\\leq`, `>`,
 *   `\\geq`, `\\land`, `\\lor`, `\\implies`, `+`, `-`, `\\cdot`); `unary`: `\\lnot` and `-` of its `operand`.
 * - `frac`: `\\frac{numerator}{denominator}`.
 * - `member`: `value.\\mathit{name}`, a member of a value.
 * - `call` (the framework's): a named function (`callable`) applied to ordered `arguments`,
 *   `\\operatorname{has}(x, \\text{email})`, for the functions in `Domains.FUNCTIONS`.
 * - `let` (the framework's): `body \\quad \\text{where } name = value`, which binds a name within its body.
 *
 * Notation has no evaluator: this dialect is written, rendered, validated, inferred and translated, and evaluation belongs
 * to the dialects it is translated to. `DIALECT` reads its kinds (`Terms.Dialect`); its writers (`constant`, `symbol`,
 * ...) write them through the builders, wherever a term is written, in a transaction. `Text.ToText` writes a term as
 * math-mode LaTeX, parenthesized only where precedence requires.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

/** LaTeX's union of its kinds, added to the framework's terms as the branch `latex`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.LaTeX.Expressions`: run after `Framework.install`, in a transaction of its
 * own; run again, it writes nothing.
 * Its holder, `Expressions.LaTeX.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
 * its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.LaTeX.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      Binary: S.OfObject, Unary: S.OfObject, Frac: S.OfObject, Member: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.LaTeX.Expressions`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.LaTeX.Expressions.Dialect").ref(true).singleton("Expressions.LaTeX.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        uses: (a: any) => a.relation([Framework.Uses]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("latex").schema([_.Dialect])]),
      // its union of its kinds: the framework's it reuses, its own, and invalid syntax
      (_: any) => _.Term.name("Expressions.LaTeX.Expressions.Term").branches([
        (t: any) => t.name("literal").schema([Framework.Literal]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("call").schema([Framework.Call]),
        (t: any) => t.name("let").schema([Framework.Let]),
        (t: any) => t.name("binary").schema([_.Binary]),
        (t: any) => t.name("unary").schema([_.Unary]),
        (t: any) => t.name("frac").schema([_.Frac]),
        (t: any) => t.name("member").schema([_.Member]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Binary.name("Expressions.LaTeX.Expressions.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Unary.name("Expressions.LaTeX.Expressions.Unary").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Frac.name("Expressions.LaTeX.Expressions.Frac").properties({
        numerator: _.Term, denominator: _.Term }),
      (_: any) => _.Member.name("Expressions.LaTeX.Expressions.Member").properties({
        name: S.OfStr, value: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
      // to its `Term`
      (_: any) => _.Expression.name("Expressions.LaTeX.Expressions.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("latex").schema([_.Term])]),
    ])]))]);
}

const SCALARS = new Set(["bool", "int", "float", "str"]); // what a constant holds: notation has no bytes

/** A literal holds what a constant of LaTeX does: the framework's literal may hold more. */
function literalCheck(record: any): string[] {
  const type = Repr.typeName(F.attributesOf(record).get("value"));
  return SCALARS.has(type) ? [] : [`a LaTeX literal cannot hold a ${type}`];
}

/** The constant of a native value: a number, text or a truth value. */
function native(value: unknown): Writer | null {
  return SCALARS.has(Repr.typeName(value)) ? constant(value) : null;
}

/** The LaTeX dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("LaTeX.Expressions", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  binary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.BINARY, required: ["operator"] }),
  unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  frac: new F.Kind(F.APPLICATION, { signature: Domains.FRAC }),
  member: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.MEMBER, required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.FUNCTIONS, required: ["callable"] }),
  let: new F.Kind(F.BINDING, { required: ["name"] }),
}, { domain_of: Domains.of, literal: native });

// --- Writers: specs that write LaTeX's terms through the builders ---

/** A LaTeX term, written through the builders where it is given (a spec). */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

/** The constant `value`: an int (bigint), a float (number), a str or a boolean (validation reports any other). */
export function constant(value: unknown): Writer {
  return new Writer((u: any) => u.literal((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** The symbol `name`. */
export function symbol(name: string): Writer {
  return new Writer((u: any) => u.variable((r: any) => r.name(name)));
}

/** `left <operator> right`; each operand is a spec (a native value is a constant). */
export function binary(operator: string, left: unknown, right: unknown): Writer {
  const [lhs, rhs] = [DIALECT.spec(left), DIALECT.spec(right)];
  return new Writer((u: any) => u.binary((r: any) => r.operator(operator).left(lhs).right(rhs)));
}

/** `<operator> operand`: `\lnot` or `-`. */
export function unary(operator: string, operand: unknown): Writer {
  const o = DIALECT.spec(operand);
  return new Writer((u: any) => u.unary((r: any) => r.operator(operator).operand(o)));
}

/** `\frac{numerator}{denominator}`. */
export function frac(numerator: unknown, denominator: unknown): Writer {
  const [n, d] = [DIALECT.spec(numerator), DIALECT.spec(denominator)];
  return new Writer((u: any) => u.frac((r: any) => r.numerator(n).denominator(d)));
}

/** `value.\mathit{name}`. */
export function member(value: unknown, name: string): Writer {
  const v = DIALECT.spec(value);
  return new Writer((u: any) => u.member((r: any) => r.name(name).value(v)));
}

/** `\operatorname{name}(arguments...)`. */
function function_(name: string, ...args: unknown[]): Writer {
  const specs = args.map((argument) => DIALECT.spec(argument));
  return new Writer((u: any) => u.call((r: any) => r.callable(name).arguments(specs)));
}
export { function_ as function };

/** `body \quad \text{where } name = value`. */
export function where(name: string, value: unknown, body: unknown): Writer {
  const [v, b] = [DIALECT.spec(value), DIALECT.spec(body)];
  return new Writer((u: any) => u.let((r: any) => r.name(name).value(v).body(b)));
}
