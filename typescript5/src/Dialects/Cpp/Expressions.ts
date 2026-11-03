/**
 * Expressions of the Cpp dialect: expressions of C++, C++17 to C++23, over its arithmetic types, as its source writes
 * them.
 *
 * Cpp's terms are values of its `Term`, `Expressions.Cpp.Term`, the branch `cpp` of `Expressions.Framework.Term`, which
 * `install` defines and adds to `Expressions.Framework.Term` by schema extension. Today its kinds have C's shapes (see
 * `C.Expressions` for each): it defines its own (`Expressions.Cpp.Constant`, ...), whose properties hold C++'s terms,
 * beside the framework's `variable` and `call` and its kinds of invalid syntax (`error`, `missing`). Each kind records the standards of C++ that have it (`Kind.standards`:
 * `STANDARDS`, every one, as far as these kinds go). C++ is not a superset of C, so the two are separate dialects, each
 * with a union of its own.
 *
 * `DIALECT` reads the kinds (`Terms.Dialect`). The writers (`constant`, `identifier`, ...) are C's, writing C++'s terms:
 * `store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`. `Text.ToText` writes an expression as C++ source.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as F from "../../Framework/Terms.js";
import * as C from "../C/Expressions.js";
import * as Domains from "../C/Domains.js";

/** The standards this dialect covers, ISO/IEC 14882:2017, 2020 and 2024. */
export const STANDARDS: readonly string[] = ["C++17", "C++20", "C++23"];

/** Cpp's union of its kinds, `Expressions.Cpp.Term`, added to the framework's terms as the branch `cpp`, its own
 * kinds, which have C's shapes but hold C++'s terms, and its dialect's schema, whose singleton is `Expressions.Cpp`:
 * run after `Framework.install`, in a transaction of its own; run again, it writes nothing.
 * Its holder, `Expressions.Cpp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.Cpp/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      Constant: S.OfObject, Unary: S.OfObject, Binary: S.OfObject, Conditional: S.OfObject,
      Cast: S.OfObject, Member: S.OfObject, Subscript: S.OfObject }) // FrameworkTerm: the framework's, by name
    .spec([
      // its dialect: the singleton `Expressions.Cpp`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Cpp.Dialect").ref(true).singleton("Expressions.Cpp").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("cpp").schema([_.Dialect])]),
      // its union of its kinds: the framework's it reuses, its own, and invalid syntax
      (_: any) => _.Term.name("Expressions.Cpp.Term").branches([
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
      // its own kinds, C's shapes, holding C++'s terms
      (_: any) => _.Constant.name("Expressions.Cpp.Constant").properties({
        value: S.OfAny((a: any) => a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr])),
        type: S.OfStr, // C++'s, by default its value's
      }),
      (_: any) => _.Unary.name("Expressions.Cpp.Unary").properties({
        operator: S.OfStr, operand: _.Term }),
      (_: any) => _.Binary.name("Expressions.Cpp.Binary").properties({
        operator: S.OfStr, left: _.Term, right: _.Term }),
      (_: any) => _.Conditional.name("Expressions.Cpp.Conditional").properties({
        condition: _.Term, consequent: _.Term, alternative: _.Term }),
      (_: any) => _.Cast.name("Expressions.Cpp.Cast").properties({
        type: S.OfStr, operand: _.Term }),
      (_: any) => _.Member.name("Expressions.Cpp.Member").properties({
        name: S.OfStr,
        operator: S.OfStr, // '.' (by default) or '->'
        object: _.Term }),
      (_: any) => _.Subscript.name("Expressions.Cpp.Subscript").properties({
        array: _.Term, index: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
      // to its `Term`
      (_: any) => _.Expression.name("Expressions.Cpp.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("cpp").schema([_.Term])]),
    ])]))]);
}

/** The constant of a native value: a number, a bool or a string. */
function native(value: unknown): Writer | null {
  return ["bigint", "number", "boolean", "string"].includes(typeof value) ? constant(value) : null;
}

/** The Cpp dialect: its kinds, C's, as the framework reads them. */
export const DIALECT: F.Dialect = new F.Dialect("Cpp", C.kinds(STANDARDS), { domain_of: Domains.of, literal: native });

/** A term of the Cpp dialect, written through the builders where it is given (a spec). */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

const WRITERS = new C.Writers(DIALECT, Writer);
export const { constant, identifier, unary, binary, conditional, cast, member, subscript, call } = WRITERS;
