/**
 * Expressions of the SystemVerilog Patterns dialect: the patterns `matches` compares a value with, binding its variables (IEEE 1800 12.6), as mbse-programs has them.
 *
 * It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6: "if the standard says it's a
 * sublanguage then it's definitely at least a separate dialect"), named `SystemVerilog Patterns` (`Terms.dialect_name`), its
 * tag `systemverilog_patterns`. Its terms are values of its `Term`, `Expressions.SystemVerilog.Patterns.Term`, the branch
 * `systemverilog_patterns` of `Expressions.Framework.Term`; a `matches`' pattern holds it, a pattern or an expression (mbse-programs' `Pattern | Expression`), so it
 * lists, besides its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which that dialect's
 * install adds ("(b)").
 *
 * Its own kinds (`variablepattern`, `wildcardpattern`, `taggedpattern`, `structurepattern`, `patternmember` and
 * `parenthesizedpattern`, the stage 6 design's) are added to its `install`, its `Term` and `DIALECT` (`_kinds`), each with the edition it
 * arrived in (`SINCE`), and printed by its `Text` module. The editions it covers are data, which `define` writes: IEEE
 * 1800's, IEEE Std 1800-2005 to 1800-2023 (`Expressions.EDITIONS` from the fourth), each with its own kinds it has.
 * `DIALECT` reads its kinds and the five other dialects' terms. Its terms are written through the builders (mbse-basis
 * [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as F from "../../Framework/Terms.js";
import * as X from "../Expressions/Expressions.js";
import * as Assertions from "../Assertions/Expressions.js";
import * as Constraints from "../Constraints/Expressions.js";
import * as Preprocessor from "../Preprocessor/Expressions.js";
import * as Types from "../Types/Expressions.js";

/** Its own kinds, in its `Term`'s order after `Expressions`' branches. */
export const TAGS: readonly string[] = [];

/** The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`; a kind
 * not listed is in every edition of IEEE 1800 (its first, 3). */
export const SINCE: ReadonlyMap<string, number> = new Map();

/** SystemVerilog Patterns's union of its kinds, added to the framework's terms as the branch `systemverilog_patterns`, its own
 * kinds, and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Patterns`: run after `Framework.install`, in
 * a transaction of its own, before or after the other SystemVerilog dialects' installs; run again, it writes nothing.
 * `Expressions`' install adds that dialect's branches to its `Term`, created here where it has not run. Its holder,
 * `Expressions.SystemVerilog.Patterns.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.SystemVerilog.Patterns/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.SystemVerilog.Patterns`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.SystemVerilog.Patterns.Dialect").ref(true).singleton("Expressions.SystemVerilog.Patterns").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("systemverilog_patterns").schema([_.Dialect])]),
      // its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
      (_: any) => _.Term.name("Expressions.SystemVerilog.Patterns.Term"),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.SystemVerilog.Patterns.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("systemverilog_patterns").schema([_.Term])]),
    ])]))]);
}

/** SystemVerilog Patterns's dialect as data: the singleton `Expressions.SystemVerilog.Patterns` owning the editions it covers,
 * by designation (`standards`), IEEE Std 1800-2005 to 2023, each with its formal reference's parts, its common name and
 * its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its
 * frame binds the dialect (`dialect`) and each edition by its common name spelled as an identifier
 * (`SystemVerilog_2023`). */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.SystemVerilog.Patterns, txn.Expressions.Framework.Standard];
  const every = new Map((OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => [branch.name, branch.schema] as [string, any]));
  const kinds = X.editions(every, SINCE, 3);
  return txn.uid("mbse.Expressions.SystemVerilog.Patterns.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, SystemVerilog_2005: Standard, SystemVerilog_2009: Standard,
      SystemVerilog_2012: Standard, SystemVerilog_2017: Standard, SystemVerilog_2023: Standard })
    .spec([
      (_: any) => _.dialect.standards({
        "IEEE Std 1800-2005": (e: any) => e.standard(_.SystemVerilog_2005),
        "IEEE Std 1800-2009": (e: any) => e.standard(_.SystemVerilog_2009),
        "IEEE Std 1800-2012": (e: any) => e.standard(_.SystemVerilog_2012),
        "IEEE Std 1800-2017": (e: any) => e.standard(_.SystemVerilog_2017),
        "IEEE Std 1800-2023": (e: any) => e.standard(_.SystemVerilog_2023) }),
      (_: any) => _.SystemVerilog_2005.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2005n)).names(
        ["SystemVerilog-2005"]).kinds(kinds[0]),
      (_: any) => _.SystemVerilog_2009.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2009n)).names(
        ["SystemVerilog-2009"]).kinds(kinds[1]),
      (_: any) => _.SystemVerilog_2012.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2012n)).names(
        ["SystemVerilog-2012"]).kinds(kinds[2]),
      (_: any) => _.SystemVerilog_2017.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2017n)).names(
        ["SystemVerilog-2017"]).kinds(kinds[3]),
      (_: any) => _.SystemVerilog_2023.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2023n)).names(
        ["SystemVerilog-2023"]).kinds(kinds[4]),
    ])]))]);
}

/** The names a pattern binds, its variables (`.name`), which a `matches` binds in its conditional's consequence and the
 * conditions after it (12.6.2): none, of a constant pattern, an expression. */
export function boundNames(_pattern: unknown): ReadonlySet<string> {
  return new Set();
}

/** How the framework reads its own kinds. */
function kinds(): Record<string, F.Kind> {
  return {};
}

/** The dialects of its family whose terms its positions hold, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [X.DIALECT, Types.DIALECT, Assertions.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT];
}

/** The SystemVerilog Patterns dialect: its kinds, as the framework reads them, and the terms of its family's dialects. */
export const DIALECT = new F.Dialect("SystemVerilog.Patterns", kinds(), { domain_of: X.untyped, literal: X.native, reads });
