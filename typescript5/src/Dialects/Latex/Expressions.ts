/**
 * Expressions of the Latex dialect: mathematical notation, as LaTeX's math mode writes it.
 *
 * `install` adds its kinds to `Expressions.Framework.Term` by schema extension, each a value object with a `domain`, by
 * name, as every term has. Their tags carry the dialect's name, `latex_`, since every dialect adds its kinds to the one
 * union and several have a `binary` or a `constant`:
 *
 * - `latex_constant`: a number (int or float), text (str, written `\text{...}`) or a truth value (boolean): its
 *   `value`.
 * - `latex_symbol`: a named quantity, `a`, or `\mathit{age}` for a longer name: its `name`.
 * - `latex_binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`=`, `\neq`, `<`, `\leq`, `>`,
 *   `\geq`, `\land`, `\lor`, `\implies`, `+`, `-`, `\cdot`); `latex_unary`: `\lnot` and `-` of its `operand`.
 * - `latex_frac`: `\frac{numerator}{denominator}`.
 * - `latex_member`: `value.\mathit{name}`, a member of a value.
 * - `latex_function`: a named function (`name`) applied to ordered `arguments`, `\operatorname{has}(x, \text{email})`,
 *   for the functions in `Domains.FUNCTIONS`.
 * - `latex_where`: `body \quad \text{where } name = value`, which binds a name within its body.
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

/** Latex's kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own. */
export function install(txn: any): any {
  const S = txn.Schemas;
  return txn.uid("mbse.Expressions.Latex/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Term: S.OfUnion, Constant: S.OfObject, Symbol: S.OfObject, Binary: S.OfObject, Unary: S.OfObject,
      Frac: S.OfObject, Member: S.OfObject, Function: S.OfObject, Where: S.OfObject }) // the framework's union, by name
    .spec([
      (_: any) => _.Constant.name("Expressions.Latex.Constant").properties({
        value: S.OfAny((a: any) => a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr])), // a number, text, truth
        domain: S.OfStr, // every term has a domain
      }),
      (_: any) => _.Symbol.name("Expressions.Latex.Symbol").properties({ name: S.OfStr, domain: S.OfStr }),
      (_: any) => _.Binary.name("Expressions.Latex.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term, domain: S.OfStr }),
      (_: any) => _.Unary.name("Expressions.Latex.Unary").properties({
        operator: S.OfStr, operand: _.Term, domain: S.OfStr }),
      (_: any) => _.Frac.name("Expressions.Latex.Frac").properties({
        numerator: _.Term, denominator: _.Term, domain: S.OfStr }),
      (_: any) => _.Member.name("Expressions.Latex.Member").properties({
        name: S.OfStr, value: _.Term, domain: S.OfStr }),
      (_: any) => _.Function.name("Expressions.Latex.Function").properties({
        name: S.OfStr,
        arguments: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])),
        domain: S.OfStr,
      }),
      (_: any) => _.Where.name("Expressions.Latex.Where").properties({
        name: S.OfStr, value: _.Term, body: _.Term, domain: S.OfStr }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // branches added: schema extension
        (t: any) => t.name("latex_constant").schema([_.Constant]),
        (t: any) => t.name("latex_symbol").schema([_.Symbol]),
        (t: any) => t.name("latex_binary").schema([_.Binary]),
        (t: any) => t.name("latex_unary").schema([_.Unary]),
        (t: any) => t.name("latex_frac").schema([_.Frac]),
        (t: any) => t.name("latex_member").schema([_.Member]),
        (t: any) => t.name("latex_function").schema([_.Function]),
        (t: any) => t.name("latex_where").schema([_.Where]),
      ]),
    ])]))]);
}

const SCALARS = new Set(["bool", "int", "float", "str"]);

/** The constant of a native value: a number, text or a truth value. */
function native(value: unknown): F.Writer | null {
  return SCALARS.has(Repr.typeName(value)) ? constant(value) : null;
}

/** The Latex dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Latex", {
  latex_constant: new F.Kind(F.LITERAL),
  latex_symbol: new F.Kind(F.REFERENCE, { required: ["name"] }),
  latex_binary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.BINARY, required: ["operator"] }),
  latex_unary: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.UNARY, required: ["operator"] }),
  latex_frac: new F.Kind(F.APPLICATION, { signature: Domains.FRAC }),
  latex_member: new F.Kind(F.APPLICATION, { operator: "name", signature: Domains.MEMBER, required: ["name"] }),
  latex_function: new F.Kind(F.APPLICATION, { operator: "name", vocabulary: Domains.FUNCTIONS, required: ["name"] }),
  latex_where: new F.Kind(F.BINDING, { required: ["name"] }),
}, { domain_of: Domains.of, literal: native });

// --- Writers: specs that write Latex's terms through the builders ---

/** The constant `value`: an int (bigint), a float (number), a str or a boolean. */
export function constant(value: unknown): F.Writer {
  return new F.Writer((u: any) => u.latex_constant((r: any) => r.value((p: any) => p.as_scalar(value))));
}

/** The symbol `name`. */
export function symbol(name: string): F.Writer {
  return new F.Writer((u: any) => u.latex_symbol((r: any) => r.name(name)));
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
  return new F.Writer((u: any) => u.latex_function((r: any) => r.name(name).arguments(specs)));
}
export { function_ as function };

/** `body \quad \text{where } name = value`. */
export function where(name: string, value: unknown, body: unknown): F.Writer {
  const [v, b] = [DIALECT.spec(value), DIALECT.spec(body)];
  return new F.Writer((u: any) => u.latex_where((r: any) => r.name(name).value(v).body(b)));
}
