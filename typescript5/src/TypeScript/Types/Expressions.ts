/**
 * Expressions of the TypeScript Types dialect: TypeScript's types, typescript-estree's type nodes, a skeleton the
 * retrofit's core writes, its kinds to come (the dialects proposal, Retrofit's design, The work, partitioned). It is a
 * dialect of the TypeScript family, named `TypeScript Types` (`Terms.dialectName`), its tag `typescript_types`. Its
 * terms are values of its `Term`, `Expressions.TypeScript.Types.Term`, the branch `typescript_types` of
 * `Expressions.Framework.Term`, which holds invalid syntax alone until its kinds are built; its holder,
 * `Expressions.TypeScript.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`, and so inherits the adjacency `abi`. `define` writes its dialect's data, none yet. `DIALECT` reads its own
 * kinds and the terms of the dialects its positions are to hold, `TypeScript5`, `TypeScript Patterns` (`reads`); none
 * of it is a reason to reinstate `Uses` (mbse-basis [CAP-098: dialects over one
 * framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as F from "../../Framework/Terms.js";
import * as Family from "../TypeScript5/Domains.js";
import * as TypeScript5 from "../TypeScript5/Expressions.js";
import * as TypeScriptPatterns from "../Patterns/Expressions.js";

/** Its own kinds, in its `Term`'s order: none yet. */
export const TAGS: readonly string[] = [];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none yet. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in: none yet. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/**
 * TypeScript Types' union of its kinds, invalid syntax alone until its kinds are built, added to the framework's terms
 * as the branch `typescript_types`, and its dialect's schema, whose singleton is `Expressions.TypeScript.Types`: run
 * after `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it
 * writes nothing. Its holder, `Expressions.TypeScript.Types.Expression`, refines `Expressions.Framework.Expression`,
 * its `root` narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.TypeScript.Types/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.TypeScript.Types`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.TypeScript.Types.Dialect").ref(true).singleton("Expressions.TypeScript.Types").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("typescript_types").schema([_.Dialect])]),
      // its union of its kinds: invalid syntax alone, until its kinds are built
      (_: any) => _.Term.name("Expressions.TypeScript.Types.Term").branches([
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.TypeScript.Types.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("typescript_types").schema([_.Term])]),
    ])]))]);
}

/**
 * TypeScript Types' dialect as data: the singleton `Expressions.TypeScript.Types`, none of its data yet (the editions
 * it covers are to come with its kinds). Run after `install`, in a transaction of its own; run again, it writes
 * nothing. Its frame binds the dialect (`dialect`).
 */
export function define(txn: any): any {
  const OWN = txn.Expressions.TypeScript.Types;
  return txn.uid("mbse.Expressions.TypeScript.Types.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect })
    .spec([(_: any) => _.dialect])]))]);
}

/** The dialects whose terms its positions are to hold, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [TypeScript5.DIALECT, TypeScriptPatterns.DIALECT];
}

/** The TypeScript Types dialect: its kinds, as the framework reads them (invalid syntax alone, yet), and its family's other
 * dialects' terms. */
export const DIALECT = new F.Dialect("TypeScript.Types", {}, { domain_of: Family.of, reads });
