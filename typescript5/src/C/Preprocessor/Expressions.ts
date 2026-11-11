/**
 * Expressions of the C Preprocessor dialect: the preprocessing directives C and C++ share, each standard defining its
 * own (ISO/IEC 9899, 6.10; ISO/IEC 14882, [cpp]), the C family's dialect that both read, a skeleton the retrofit's core
 * writes, its kinds to come (the dialects proposal, Retrofit's design, The work, partitioned). It is a dialect of the C
 * family, named `C Preprocessor` (`Terms.dialectName`), its tag `c_preprocessor`. Its terms are values of its `Term`,
 * `Expressions.C.Preprocessor.Term`, the branch `c_preprocessor` of `Expressions.Framework.Term`, which holds invalid
 * syntax alone until its kinds are built; its holder, `Expressions.C.Preprocessor.Expression`, refines
 * `Expressions.Framework.Expression`, its `root` narrowed to its `Term`, and so inherits the adjacency `abi`. `define`
 * writes its dialect's data, none yet. `DIALECT` reads its own kinds and the terms of the dialects its positions are to
 * hold, `C`, `C Types` (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis [CAP-098: dialects over one
 * framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as F from "../../Framework/Terms.js";
import * as C from "../Expressions/Expressions.js";
import * as CTypes from "../Types/Expressions.js";

/** Its own kinds, in its `Term`'s order: none yet. */
export const TAGS: readonly string[] = [];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none yet. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in: none yet. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/**
 * C Preprocessor's union of its kinds, invalid syntax alone until its kinds are built, added to the framework's terms
 * as the branch `c_preprocessor`, and its dialect's schema, whose singleton is `Expressions.C.Preprocessor`: run after
 * `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it writes
 * nothing. Its holder, `Expressions.C.Preprocessor.Expression`, refines `Expressions.Framework.Expression`, its `root`
 * narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.C.Preprocessor/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.C.Preprocessor`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.C.Preprocessor.Dialect").ref(true).singleton("Expressions.C.Preprocessor").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("c_preprocessor").schema([_.Dialect])]),
      // its union of its kinds: invalid syntax alone, until its kinds are built
      (_: any) => _.Term.name("Expressions.C.Preprocessor.Term").branches([
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.C.Preprocessor.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("c_preprocessor").schema([_.Term])]),
    ])]))]);
}

/**
 * C Preprocessor's dialect as data: the singleton `Expressions.C.Preprocessor`, none of its data yet (the editions it
 * covers are to come with its kinds). Run after `install`, in a transaction of its own; run again, it writes nothing.
 * Its frame binds the dialect (`dialect`).
 */
export function define(txn: any): any {
  const OWN = txn.Expressions.C.Preprocessor;
  return txn.uid("mbse.Expressions.C.Preprocessor.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect })
    .spec([(_: any) => _.dialect])]))]);
}

/** The dialects whose terms its positions are to hold, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [C.DIALECT, CTypes.DIALECT];
}

/** The C Preprocessor dialect: its kinds, as the framework reads them (invalid syntax alone, yet), and its family's other
 * dialects' terms. */
export const DIALECT = new F.Dialect("C.Preprocessor", {}, { domain_of: C.untyped, reads });
