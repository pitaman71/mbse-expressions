/**
 * Expressions of the Cpp dialect: expressions of C++, C++17 to C++23, over its arithmetic types, as its source writes
 * them.
 *
 * Cpp's terms are values of its union, `Expressions.Cpp.Expression`, the branch `cpp` of `Expressions.Framework.Term`,
 * which `install` defines and adds to `Term` by schema extension. Today its kinds are C's, defined once by C's install
 * (`Expressions.C.Constant`, ...) and listed by both unions, with the framework's `variable` and `call` and its kinds of
 * invalid syntax (`error`, `missing`): see `C.Expressions` for each. Their slots hold a term of either dialect; that a C++
 * term holds only C++'s terms is validation's. Each kind records the standards of C++ that have it (`Kind.standards`:
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

/** Cpp's union of its kinds, C's (whose install runs before it), added to the framework's terms as the branch
 * `cpp`, and its dialect's schema, whose singleton is `Expressions.Cpp`: run after `C.install`, in a transaction of its
 * own; run again, it writes nothing. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const Shared = txn.Expressions.C;
  return txn.uid("mbse.Expressions.Cpp/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, Term: S.OfUnion, Expression: S.OfUnion })
    .spec([
      // its dialect: the singleton `Expressions.Cpp`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Cpp.Dialect").ref(true).singleton("Expressions.Cpp").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("cpp").schema([_.Dialect])]),
      // its union of its kinds: C's, the framework's it reuses, and invalid syntax
      (_: any) => _.Expression.name("Expressions.Cpp.Expression").branches([
        (t: any) => t.name("constant").schema([Shared.Constant]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("unary").schema([Shared.Unary]),
        (t: any) => t.name("binary").schema([Shared.Binary]),
        (t: any) => t.name("conditional").schema([Shared.Conditional]),
        (t: any) => t.name("cast").schema([Shared.Cast]),
        (t: any) => t.name("member").schema([Shared.Member]),
        (t: any) => t.name("subscript").schema([Shared.Subscript]),
        (t: any) => t.name("call").schema([Framework.Call]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("cpp").schema([_.Expression])]),
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
