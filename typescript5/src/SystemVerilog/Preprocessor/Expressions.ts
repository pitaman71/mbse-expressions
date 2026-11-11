/**
 * Expressions of the SystemVerilog Preprocessor dialect: Verilog's and SystemVerilog's compiler directives and macro
 * usages (IEEE 1800 clause 22), as mbse-programs has them.
 *
 * It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6, "Macros": "the preprocessor is
 * a dialect per family ..., a macro usage in an expression position a term of it held by (b)"), named `SystemVerilog
 * Preprocessor` (`Terms.dialect_name`), its tag `systemverilog_preprocessor`. Its terms are values of its `Term`,
 * `Expressions.SystemVerilog.Preprocessor.Term`, the branch `systemverilog_preprocessor` of
 * `Expressions.Framework.Term`: its own kinds and invalid syntax. Its kinds, mbse-programs' (`mbse:mbse-programs/python3/
 * mbse/Programs/Verilog/Syntax.py`), lowercased as branch tags, each a value object
 * `Expressions.SystemVerilog.Preprocessor.<Kind>`:
 *
 * - `macrousage`: `` `name `` or `` `name(arguments) ``, a text macro used as a value (22.5.1), `arguments` the text
 *   between its parentheses. Its install adds it to the `Term`s that list `Expressions`' branches too, an expression
 *   position holding it: `Expressions`', `Types`', `Patterns`', `Assertions`' and `Constraints`'.
 *
 * The directives (`includedirective`, `definedirective`, `undefdirective`, `timescaledirective`,
 * `defaultnettypedirective`, `ifdefdirective` and its `elsifdirective`s, `disabledtext`, `otherdirective`) and `comment`,
 * the stage 6 design's, are added to its `install` (and to `Constraints`' `Term`, whose items hold them, Q6), its `Term`
 * and `DIALECT` (`_kinds`), each with the edition it arrived in (`SINCE`), and printed by its `Text` module. The editions
 * it covers are data, which `define` writes: Verilog's and SystemVerilog's, as `Expressions`' are, each with its own kinds
 * it has. `DIALECT` reads its kinds and the five other dialects' terms. Its terms are written through the builders
 * (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Assertions from "../Assertions/Expressions.js";
import * as Constraints from "../Constraints/Expressions.js";
import * as X from "../Expressions/Expressions.js";
import * as Patterns from "../Patterns/Expressions.js";
import * as Types from "../Types/Expressions.js";

export const MACROUSAGE = "macrousage";

/** Its own kinds, in its `Term`'s order. */
export const TAGS: readonly string[] = [MACROUSAGE];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/systemverilog-slang.json`) names them. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`; a kind
 * not listed is in every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/** SystemVerilog Preprocessor's union of its kinds, added to the framework's terms as the branch
 * `systemverilog_preprocessor`, its own kinds, and its dialect's schema, whose singleton is
 * `Expressions.SystemVerilog.Preprocessor`: run after `Framework.install`, in a transaction of its own, before or after
 * the other SystemVerilog dialects' installs; run again, it writes nothing. `macrousage` is added to `Expressions`'
 * `Term`, and to the `Term`s that list its branches, each created where its install has not run, as `Expressions`'
 * `Identifier`, a macro's name, is. Its holder, `Expressions.SystemVerilog.Preprocessor.Expression`, refines
 * `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.SystemVerilog.Preprocessor/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
      .symbols({Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
                Expression: S.OfObject, MacroUsage: S.OfObject,
                // `Expressions`' union and helper, and the `Term`s that list its branches, by name
                ExpressionsTerm: S.OfUnion, TypesTerm: S.OfUnion, PatternsTerm: S.OfUnion,
                AssertionsTerm: S.OfUnion, ConstraintsTerm: S.OfUnion, Identifier: S.OfObject})
      .spec([
          // its dialect: the singleton `Expressions.SystemVerilog.Preprocessor`, a branch of the framework's kind
          // union of dialects
          (_: any) => _.Dialect.name("Expressions.SystemVerilog.Preprocessor.Dialect").ref(true).singleton("Expressions.SystemVerilog.Preprocessor").adjacencies({
              domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
              operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
              standards: (a: any) => a.relation([Framework.Covers]).me("dialect")}),
          (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
              (t: any) => t.name("systemverilog_preprocessor").schema([_.Dialect])]),
          // its union of its kinds, and invalid syntax
          (_: any) => _.Term.name("Expressions.SystemVerilog.Preprocessor.Term").branches([
              (t: any) => t.name("macrousage").schema([_.MacroUsage]),
              (t: any) => t.name("error").schema([Framework.Error]),
              (t: any) => t.name("missing").schema([Framework.Missing]),
          ]),
          (_: any) => _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier"),
          // a macro usage (22.5.1), in an expression position: in `Expressions`' `Term`, and in those that list its
          // branches
          (_: any) => _.MacroUsage.name("Expressions.SystemVerilog.Preprocessor.MacroUsage").properties({
              name: _.Identifier, arguments: S.OfStr}),  // arguments: the text between its parentheses
          (_: any) => _.ExpressionsTerm.name("Expressions.SystemVerilog.Expressions.Term").branches([
              (t: any) => t.name("macrousage").schema([_.MacroUsage])]),
          (_: any) => _.TypesTerm.name("Expressions.SystemVerilog.Types.Term").branches([
              (t: any) => t.name("macrousage").schema([_.MacroUsage])]),
          (_: any) => _.PatternsTerm.name("Expressions.SystemVerilog.Patterns.Term").branches([
              (t: any) => t.name("macrousage").schema([_.MacroUsage])]),
          (_: any) => _.AssertionsTerm.name("Expressions.SystemVerilog.Assertions.Term").branches([
              (t: any) => t.name("macrousage").schema([_.MacroUsage])]),
          (_: any) => _.ConstraintsTerm.name("Expressions.SystemVerilog.Constraints.Term").branches([
              (t: any) => t.name("macrousage").schema([_.MacroUsage])]),
          // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
          // narrowed to its `Term`
          (_: any) => _.Expression.name("Expressions.SystemVerilog.Preprocessor.Expression").ref(true).refines([Framework.Expression]).properties({
              root: _.Term}),
          (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([  // a branch added: schema extension
              (t: any) => t.name("systemverilog_preprocessor").schema([_.Term])]),
      ])]))]);
}

/** SystemVerilog Preprocessor's dialect as data: the singleton `Expressions.SystemVerilog.Preprocessor` owning the
 * editions it covers, by designation (`standards`), Verilog's IEEE Std 1364-1995, 2001 and 2005 and SystemVerilog's IEEE
 * Std 1800-2005 to 2023, each with its formal reference's parts, its common name and its own kinds it has (`SINCE`). Run
 * after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and
 * each edition by its common name spelled as an identifier (`SystemVerilog_2023`). */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.SystemVerilog.Preprocessor, txn.Expressions.Framework.Standard];
  const every = new Map((OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => [branch.name, branch.schema] as [string, any]));
  const kinds = X.editions(every, SINCE);
  return txn.uid("mbse.Expressions.SystemVerilog.Preprocessor.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
      .symbols({dialect: OWN.Dialect, Verilog_1995: Standard, Verilog_2001: Standard, Verilog_2005: Standard,
                SystemVerilog_2005: Standard, SystemVerilog_2009: Standard, SystemVerilog_2012: Standard,
                SystemVerilog_2017: Standard, SystemVerilog_2023: Standard})
      .spec([
          (_: any) => _.dialect.standards({
              "IEEE Std 1364-1995": (e: any) => e.standard(_.Verilog_1995),
              "IEEE Std 1364-2001": (e: any) => e.standard(_.Verilog_2001),
              "IEEE Std 1364-2005": (e: any) => e.standard(_.Verilog_2005),
              "IEEE Std 1800-2005": (e: any) => e.standard(_.SystemVerilog_2005),
              "IEEE Std 1800-2009": (e: any) => e.standard(_.SystemVerilog_2009),
              "IEEE Std 1800-2012": (e: any) => e.standard(_.SystemVerilog_2012),
              "IEEE Std 1800-2017": (e: any) => e.standard(_.SystemVerilog_2017),
              "IEEE Std 1800-2023": (e: any) => e.standard(_.SystemVerilog_2023)}),
          (_: any) => _.Verilog_1995.bodies(["org.ieee"]).number("1364").revision((r: any) => r.year(1995n)).names(
              ["Verilog-1995"]).kinds(kinds[0]),
          (_: any) => _.Verilog_2001.bodies(["org.ieee"]).number("1364").revision((r: any) => r.year(2001n)).names(
              ["Verilog-2001"]).kinds(kinds[1]),
          (_: any) => _.Verilog_2005.bodies(["org.ieee"]).number("1364").revision((r: any) => r.year(2005n)).names(
              ["Verilog-2005"]).kinds(kinds[2]),
          (_: any) => _.SystemVerilog_2005.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2005n)).names(
              ["SystemVerilog-2005"]).kinds(kinds[3]),
          (_: any) => _.SystemVerilog_2009.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2009n)).names(
              ["SystemVerilog-2009"]).kinds(kinds[4]),
          (_: any) => _.SystemVerilog_2012.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2012n)).names(
              ["SystemVerilog-2012"]).kinds(kinds[5]),
          (_: any) => _.SystemVerilog_2017.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2017n)).names(
              ["SystemVerilog-2017"]).kinds(kinds[6]),
          (_: any) => _.SystemVerilog_2023.bodies(["org.ieee"]).number("1800").revision((r: any) => r.year(2023n)).names(
              ["SystemVerilog-2023"]).kinds(kinds[7]),
      ])]))]);
}

/** A kind's checks, and its helpers' (a macro's name's spelling), as `Expressions.problems` reads them. */
function check(tag: string): (record: any) => string[] {
  return (record) => X.problems(F.node(tag, record));
}

/** How the framework reads its own kinds. */
function kinds(): Record<string, F.Kind> {
  return {
    [MACROUSAGE]: new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), required: ["name"], check: check(MACROUSAGE) }),
  };
}

/** The dialects of its family whose terms its positions hold, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [X.DIALECT, Types.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Constraints.DIALECT];
}

/** The SystemVerilog Preprocessor dialect: its kinds, as the framework reads them, and the terms of its family's
 * dialects. */
export const DIALECT = new F.Dialect("SystemVerilog.Preprocessor", kinds(), { domain_of: X.untyped, reads });
