/**
 * Expressions of the TypeScript Patterns dialect: ECMA-262's binding and assignment patterns, grammars of their own
 * (14.3.3, "Destructuring Binding Patterns"; 13.15.5, "Destructuring Assignment"), a skeleton the retrofit's core
 * writes, its kinds to come (the dialects proposal, Retrofit's design, The work, partitioned). It is a dialect of the
 * TypeScript family, named `TypeScript Patterns` (`Terms.dialectName`), its tag `typescript_patterns`. Its terms are
 * values of its `Term`, `Expressions.TypeScript.Patterns.Term`, the branch `typescript_patterns` of
 * `Expressions.Framework.Term`, which holds invalid syntax alone until its kinds are built; its holder,
 * `Expressions.TypeScript.Patterns.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`, and so inherits the adjacency `abi`. `define` writes its dialect's data, none yet. `DIALECT` reads its own
 * kinds and the terms of the dialects its positions are to hold, `TypeScript5`, `TypeScript Types` (`reads`); none of
 * it is a reason to reinstate `Uses` (mbse-basis [CAP-098: dialects over one
 * framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as F from "../../Framework/Terms.js";
import * as Family from "../TypeScript5/Domains.js";
import * as TypeScript5 from "../TypeScript5/Expressions.js";
import * as TypeScriptTypes from "../Types/Expressions.js";

/** Its own kinds, in its `Term`'s order: none yet. */
export const TAGS: readonly string[] = [];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none yet. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in: none yet. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/**
 * TypeScript Patterns' union of its kinds, invalid syntax alone until its kinds are built, added to the framework's
 * terms as the branch `typescript_patterns`, and its dialect's schema, whose singleton is
 * `Expressions.TypeScript.Patterns`: run after `Framework.install`, in a transaction of its own, before or after its
 * family's other installs; run again, it writes nothing. Its holder, `Expressions.TypeScript.Patterns.Expression`,
 * refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.TypeScript.Patterns/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.TypeScript.Patterns`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.TypeScript.Patterns.Dialect").ref(true).singleton("Expressions.TypeScript.Patterns").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("typescript_patterns").schema([_.Dialect])]),
      // its union of its kinds: invalid syntax alone, until its kinds are built
      (_: any) => _.Term.name("Expressions.TypeScript.Patterns.Term").branches([
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.TypeScript.Patterns.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("typescript_patterns").schema([_.Term])]),
    ])]))]);
}

/**
 * TypeScript Patterns' dialect as data: the singleton `Expressions.TypeScript.Patterns`, none of its data yet (the
 * editions it covers are to come with its kinds). Run after `install`, in a transaction of its own; run again, it
 * writes nothing. Its frame binds the dialect (`dialect`).
 */
export function define(txn: any): any {
  const OWN = txn.Expressions.TypeScript.Patterns;
  return txn.uid("mbse.Expressions.TypeScript.Patterns.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect })
    .spec([(_: any) => _.dialect])]))]);
}

/** The dialects whose terms its positions are to hold, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [TypeScript5.DIALECT, TypeScriptTypes.DIALECT];
}

/** The TypeScript Patterns dialect: its kinds, as the framework reads them (invalid syntax alone, yet), and its family's other
 * dialects' terms. */
export const DIALECT = new F.Dialect("TypeScript.Patterns", {}, { domain_of: Family.of, reads });
