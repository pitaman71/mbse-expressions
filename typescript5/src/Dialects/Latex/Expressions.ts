/**
 * Expressions of the Latex dialect: mathematical notation, as LaTeX's math mode writes it.
 *
 * Latex's terms are four of the framework's kinds (`Framework/Terms`), whose shape notation's constructs have, and four
 * of its own, which `install` adds to `Expressions.Framework.Term` by schema extension, each a value object with a
 * `domain`, by name, as every term has. The tags of its own carry the dialect's name, `latex_`, since every dialect adds
 * its kinds to the one union and several have a `binary` or a `member`:
 *
 * - `literal` (the framework's): a constant, a number (int or float), text (str, written `\text{...}`) or a truth value
 *   (boolean): its `value`. Notation has no bytes: validation reports a literal holding one.
 * - `variable` (the framework's): a named quantity, `a`, or `\mathit{age}` for a longer name: its `name`.
 * - `latex_binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`=`, `\neq`, `<`, `\leq`, `>`,
 *   `\geq`, `\land`, `\lor`, `\implies`, `+`, `-`, `\cdot`); `latex_unary`: `\lnot` and `-` of its `operand`.
 * - `latex_frac`: `\frac{numerator}{denominator}`.
 * - `latex_member`: `value.\mathit{name}`, a member of a value.
 * - `call` (the framework's): a named function (`callable`) applied to ordered `arguments`,
 *   `\operatorname{has}(x, \text{email})`, for the functions in `Domains.FUNCTIONS`.
 * - `let` (the framework's): `body \quad \text{where } name = value`, which binds a name within its body.
 *
 * Notation has no evaluator: this dialect is written, rendered, validated, inferred and translated, and evaluation
 * belongs to the dialects it is translated to. `DIALECT` reads its kinds (`Terms.Dialect`); its writers (`constant`,
 * `symbol`, ...) write them through the builders, wherever a term is written, in a transaction. `Text.ToText` writes a
 * term as math-mode LaTeX, parenthesized only where precedence requires.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

/** Latex's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own. */
export function install(txn: any): any {
  const S = txn.Schemas;
  return txn.uid("mbse.Expressions.Latex/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Term: S.OfUnion, Binary: S.OfObject, Unary: S.OfObject, Frac: S.OfObject, Member: S.OfObject })
    .spec([ // Term: the framework's union, found by its name
      (_: any) => _.Binary.name("Expressions.Latex.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term, domain: S.OfStr }),
      (_: any) => _.Unary.name("Expressions.Latex.Unary").properties({
        operator: S.OfStr, operand: _.Term, domain: S.OfStr }),
      (_: any) => _.Frac.name("Expressions.Latex.Frac").properties({
        numerator: _.Term, denominator: _.Term, domain: S.OfStr }),
      (_: any) => _.Member.name("Expressions.Latex.Member").properties({
        name: S.OfStr, value: _.Term, domain: S.OfStr }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // branches added: schema extension
        (t: any) => t.name("latex_binary").schema([_.Binary]),
        (t: any) => t.name("latex_unary").schema([_.Unary]),
        (t: any) => t.name("latex_frac").schema([_.Frac]),
        (t: any) => t.name("latex_member").schema([_.Member]),
      ]),
    ])]))]);
}

const SCALARS = new Set(["bool", "int", "float", "str"]); // what a constant holds: notation has no bytes

/** A literal holds what a constant of Latex does: the framework's literal may hold more. */
function literalCheck(record: any): string[] {
  const type = Repr.typeName(F.attributesOf(record).get("value"));
  return SCALARS.has(type) ? [] : [`a Latex literal cannot hold a ${type}`];
}

/** The constant of a native value: a number, text or a truth value. */
function native(value: unknown): F.Writer | null {
  return SCALARS.has(Repr.typeName(value)) ? constant(value) : null;
}

/** The Latex dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Latex", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  latex_binary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.BINARY, required: ["operator"] }),
  latex_unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  latex_frac: new F.Kind(F.APPLICATION, { signature: Domains.FRAC }),
  latex_member: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.MEMBER, required: ["name"] }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.FUNCTIONS, required: ["callable"] }),
  let: new F.Kind(F.BINDING, { required: ["name"] }),
}, { domain_of: Domains.of, literal: native });

// --- Writers: specs that write Latex's terms through the builders ---

/** The constant `value`: an int (bigint), a float (number), a str or a boolean (validation reports any other). */
export function constant(value: unknown): F.Writer {
  return new F.Writer((u: any) => u.literal((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** The symbol `name`. */
export function symbol(name: string): F.Writer {
  return new F.Writer((u: any) => u.variable((r: any) => r.name(name)));
}

/** `left <operator> right`; each operand is a spec (a native value is a constant). */
export function binary(operator: string, left: unknown, right: unknown): F.Writer {
  const [lhs, rhs] = [DIALECT.spec(left), DIALECT.spec(right)];
  return new F.Writer((u: any) => u.latex_binary((r: any) => r.operator(operator).left(lhs).right(rhs)));
}

/** `<operator> operand`: `\lnot` or `-`. */
export function unary(operator: string, operand: unknown): F.Writer {
  const o = DIALECT.spec(operand);
  return new F.Writer((u: any) => u.latex_unary((r: any) => r.operator(operator).operand(o)));
}

/** `\frac{numerator}{denominator}`. */
export function frac(numerator: unknown, denominator: unknown): F.Writer {
  const [n, d] = [DIALECT.spec(numerator), DIALECT.spec(denominator)];
  return new F.Writer((u: any) => u.latex_frac((r: any) => r.numerator(n).denominator(d)));
}

/** `value.\mathit{name}`. */
export function member(value: unknown, name: string): F.Writer {
  const v = DIALECT.spec(value);
  return new F.Writer((u: any) => u.latex_member((r: any) => r.name(name).value(v)));
}

/** `\operatorname{name}(arguments...)`. */
function function_(name: string, ...args: unknown[]): F.Writer {
  const specs = args.map((argument) => DIALECT.spec(argument));
  return new F.Writer((u: any) => u.call((r: any) => r.callable(name).arguments(specs)));
}
export { function_ as function };

/** `body \quad \text{where } name = value`. */
export function where(name: string, value: unknown, body: unknown): F.Writer {
  const [v, b] = [DIALECT.spec(value), DIALECT.spec(body)];
  return new F.Writer((u: any) => u.let((r: any) => r.name(name).value(v).body(b)));
}
