/**
 * Expressions of the SystemVerilog Preprocessor dialect: Verilog's and SystemVerilog's compiler directives and macro
 * usages (IEEE 1800 clause 22), and the comments kept among them (clause 5), as mbse-programs has them.
 *
 * It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6, "Macros": "the preprocessor is
 * a dialect per family ..., a macro usage in an expression position a term of it held by (b)"), named `SystemVerilog
 * Preprocessor` (`Terms.dialect_name`), its tag `systemverilog_preprocessor`. Its terms are values of its `Term`,
 * `Expressions.SystemVerilog.Preprocessor.Term`, the branch `systemverilog_preprocessor` of
 * `Expressions.Framework.Term`: its own kinds and invalid syntax. Its kinds are mbse-programs' (`mbse:mbse-programs/python3/
 * mbse/Programs/Verilog/Syntax.py`), with mbse-programs' names, lowercased as branch tags, and its properties in source
 * order, each a value object `Expressions.SystemVerilog.Preprocessor.<Kind>`:
 *
 * - `macrousage`: `` `name `` or `` `name(arguments) ``, a text macro used as a value (22.5.1), `arguments` the text
 *   between its parentheses. Its install adds it to the `Term`s that list `Expressions`' branches too, an expression
 *   position holding it: `Expressions`', `Types`', `Patterns`', `Assertions`' and `Constraints`'.
 * - The directives (22): `includedirective` (`` `include "path" ``, or `<path>` where `system`), `definedirective`
 *   (`` `define name(parameters) body ``, its body as written), `undefdirective`, `timescaledirective` (`` `timescale 1ns
 *   / 1ps ``), `defaultnettypedirective` (`` `default_nettype none ``), `ifdefdirective` (`` `ifdef ``, or `` `ifndef ``
 *   where `negated`, of a macro's name or a `condition` of macros' names, IEEE 1800-2023's, with its `items`, its
 *   `elsif` branches, and its `else`'s items, `alternative`, where `has_else`), `disabledtext` (a branch's text the preprocessor skipped, as written) and `otherdirective` (any
 *   other, as written: `` `resetall ``).
 * - `comment` (5.4): `// text`, or with `block` `/* text *\/`, kept where mbse-programs keeps it, among constraints and
 *   directives.
 *
 * Its helper: `elsifdirective` (`ElsifDirective`, an `` `elsif `` branch). An `` `else ``'s items are the
 * `IfdefDirective`'s own, as mbse-programs holds them (`alternative`, beside `items`, and `has_else`), a kind holding
 * two containers of terms. A name is `Expressions`' `Identifier`, one schema in each dialect that holds it.
 *
 * The directives and `comment` are a constraint block's items too (Q6: "directives are the preprocessor dialect's terms,
 * comments helpers"): its install adds them to `Constraints`' `Term`, created where that install has not run, and a
 * directive's branches hold `Constraints`' terms, the one place a value holds them (elsewhere mbse-programs relates its
 * items and statements). A conditional directive's condition holds `Expressions`' terms, macros' names as
 * `nameexpression`s, which name macros, defined or not, never values: they are bound within it (`Kind.scopes`). Nothing
 * else binds.
 *
 * The editions it covers are data, which `define` writes: Verilog's and SystemVerilog's, as `Expressions`' are, each
 * with its own kinds it has, every one of them in every edition (mbse-programs gives none of them a `SINCE`; an
 * `elsif`'s, IEEE 1364-2001's, is its helper's, and a feature within a kind, as a system include's and a condition's
 * are, is not recorded). `DIALECT` reads its kinds and the five other dialects' terms. Evaluation refuses each of its
 * kinds by name. Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
 * syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(t) => t.undefdirective((d) => d.name((i) => i.spelling("WIDTH")))`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Assertions from "../Assertions/Expressions.js";
import * as Constraints from "../Constraints/Expressions.js";
import * as X from "../Expressions/Expressions.js";
import * as Patterns from "../Patterns/Expressions.js";
import * as Types from "../Types/Expressions.js";

const { repr } = Repr;

export const MACROUSAGE = "macrousage";
export const INCLUDEDIRECTIVE = "includedirective";
export const DEFINEDIRECTIVE = "definedirective";
export const UNDEFDIRECTIVE = "undefdirective";
export const TIMESCALEDIRECTIVE = "timescaledirective";
export const DEFAULTNETTYPEDIRECTIVE = "defaultnettypedirective";
export const IFDEFDIRECTIVE = "ifdefdirective";
export const DISABLEDTEXT = "disabledtext";
export const OTHERDIRECTIVE = "otherdirective";
export const COMMENT = "comment";

/** The directives, in its `Term`'s order: with `comment`, what its install adds to `Constraints`' `Term`. */
export const DIRECTIVES: readonly string[] = [INCLUDEDIRECTIVE, DEFINEDIRECTIVE, UNDEFDIRECTIVE, TIMESCALEDIRECTIVE,
  DEFAULTNETTYPEDIRECTIVE, IFDEFDIRECTIVE, DISABLEDTEXT, OTHERDIRECTIVE];

/** Its own kinds, in its `Term`'s order, before invalid syntax. */
export const TAGS: readonly string[] = [MACROUSAGE, ...DIRECTIVES, COMMENT];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/systemverilog-slang.json`) names them. */
export const HELPERS: readonly string[] = ["ElsifDirective"];

/** The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`: none
 * of its kinds has one, so each is in every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/** What `` `default_nettype `` may name (22.8), as mbse-programs' `DefaultNettype` lists them. */
export const NET_TYPES: readonly string[] = ["wire", "tri", "tri0", "tri1", "triand", "trior", "trireg", "wand", "wor",
  "uwire", "none"];

/** SystemVerilog Preprocessor's union of its kinds, added to the framework's terms as the branch
 * `systemverilog_preprocessor`, its own kinds, the helpers they hold, and its dialect's schema, whose singleton is
 * `Expressions.SystemVerilog.Preprocessor`: run after `Framework.install`, in a transaction of its own, before or after
 * the other SystemVerilog dialects' installs; run again, it writes nothing. `macrousage` is added to `Expressions`'
 * `Term`, and to the `Term`s that list its branches; the directives and `comment` to `Constraints`' `Term`, whose items
 * hold them, and which a directive's branches hold; each created where its install has not run, as `Expressions`'
 * `Identifier`, a macro's name, is. Its holder, `Expressions.SystemVerilog.Preprocessor.Expression`, refines
 * `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  /** The directives and `comment`, as a union's branches: its own `Term`'s, and `Constraints`'. */
  const held = (_: any): any[] => [
    (t: any) => t.name("includedirective").schema([_.IncludeDirective]),
    (t: any) => t.name("definedirective").schema([_.DefineDirective]),
    (t: any) => t.name("undefdirective").schema([_.UndefDirective]),
    (t: any) => t.name("timescaledirective").schema([_.TimescaleDirective]),
    (t: any) => t.name("defaultnettypedirective").schema([_.DefaultNettypeDirective]),
    (t: any) => t.name("ifdefdirective").schema([_.IfdefDirective]),
    (t: any) => t.name("disabledtext").schema([_.DisabledText]),
    (t: any) => t.name("otherdirective").schema([_.OtherDirective]),
    (t: any) => t.name("comment").schema([_.Comment]),
  ];
  return txn.uid("mbse.Expressions.SystemVerilog.Preprocessor/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
      .symbols({Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
                Expression: S.OfObject, MacroUsage: S.OfObject, IncludeDirective: S.OfObject,
                DefineDirective: S.OfObject, UndefDirective: S.OfObject, TimescaleDirective: S.OfObject,
                DefaultNettypeDirective: S.OfObject, IfdefDirective: S.OfObject, ElsifDirective: S.OfObject,
                DisabledText: S.OfObject, OtherDirective: S.OfObject, Comment: S.OfObject,
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
              ...held(_),
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
          // a constraint block's items: its directives and comments too (Q6)
          (_: any) => _.ConstraintsTerm.name("Expressions.SystemVerilog.Constraints.Term").branches([
              (t: any) => t.name("macrousage").schema([_.MacroUsage]), ...held(_)]),
          // compiler directives (22)
          (_: any) => _.IncludeDirective.name("Expressions.SystemVerilog.Preprocessor.IncludeDirective").properties({
              path: S.OfStr, system: S.OfBool}),
          (_: any) => _.DefineDirective.name("Expressions.SystemVerilog.Preprocessor.DefineDirective").properties({
              name: _.Identifier, function_like: S.OfBool, parameters: many(_.Identifier),
              body: S.OfStr}),  // body: its text, line continuations included
          (_: any) => _.UndefDirective.name("Expressions.SystemVerilog.Preprocessor.UndefDirective").properties({
              name: _.Identifier}),
          (_: any) => _.TimescaleDirective.name("Expressions.SystemVerilog.Preprocessor.TimescaleDirective").properties({
              unit: S.OfStr, precision: S.OfStr}),
          (_: any) => _.DefaultNettypeDirective.name("Expressions.SystemVerilog.Preprocessor.DefaultNettypeDirective").properties({
              net_type: S.OfStr}),
          // conditional compilation (22.6), its branches holding a constraint block's items
          (_: any) => _.IfdefDirective.name("Expressions.SystemVerilog.Preprocessor.IfdefDirective").properties({
              negated: S.OfBool, name: _.Identifier, condition: _.ExpressionsTerm,
              items: many(_.ConstraintsTerm), branches: many(_.ElsifDirective),
              alternative: many(_.ConstraintsTerm), has_else: S.OfBool}),  // alternative: an `else's items
          (_: any) => _.ElsifDirective.name("Expressions.SystemVerilog.Preprocessor.ElsifDirective").properties({
              name: _.Identifier, condition: _.ExpressionsTerm, items: many(_.ConstraintsTerm)}),
          (_: any) => _.DisabledText.name("Expressions.SystemVerilog.Preprocessor.DisabledText").properties({
              text: S.OfStr}),
          (_: any) => _.OtherDirective.name("Expressions.SystemVerilog.Preprocessor.OtherDirective").properties({
              text: S.OfStr}),
          // a comment (5.4): `text` excludes its delimiters; a `trailing` one ends the line of the item before it
          (_: any) => _.Comment.name("Expressions.SystemVerilog.Preprocessor.Comment").properties({
              block: S.OfBool, text: S.OfStr, trailing: S.OfBool}),
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

function nodes(value: unknown): readonly F.Node[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value as F.Node];
}

/** A conditional directive has a name or a condition, and a condition is parenthesized and holds only macros' names,
 * `!`, `&&`, `||`, `->` and `<->`, as mbse-programs checks it. */
function conditionProblems(node: F.Node): string[] {
  const kind = node.kind === IFDEFDIRECTIVE ? "IfdefDirective" : "ElsifDirective";
  const condition = node.slots.get("condition") ?? null;
  if (node.helpers.has("name") === (condition !== null)) return [`an ${kind} has a name or a condition`];
  if (condition === null) return [];
  if (F.kindOf(condition)[0] !== X.PARENTHESIZEDEXPRESSION) return [`an ${kind}'s condition is in parentheses`];
  const terms: any[] = [condition];
  while (terms.length > 0) {
    const inner = F.node(...F.kindOf(terms.pop()));
    if (inner.kind === X.PARENTHESIZEDEXPRESSION) {
      terms.push(inner.slots.get("expression"));
    } else if (inner.kind === X.UNARYEXPRESSION && inner.attributes.get("operator") === "!" && inner.helpers.size === 0) {
      terms.push(inner.slots.get("operand"));
    } else if (inner.kind === X.BINARYEXPRESSION && ["&&", "||", "->", "<->"].includes(inner.attributes.get("operator"))
        && inner.helpers.size === 0) {
      terms.push(inner.slots.get("left"), inner.slots.get("right"));
    } else if (!(inner.kind === X.NAMEEXPRESSION && (inner.helpers.get("name") as F.Node).kind === "identifier")) {
      return [`an ${kind}'s condition has macros' names, !, &&, ||, -> and <-> only`];
    }
  }
  return [];
}

/** A node's checks, and its helpers' in turn: a choice among a few (a default net type), a conditional directive's
 * name or condition, mbse-programs' checks, and the family's helpers' (an identifier's spelling), which
 * `Expressions.problems` reads. */
export function problems(node: F.Node): string[] {
  const found: string[] = [];
  if (node.kind === DEFAULTNETTYPEDIRECTIVE) {
    const netType = node.attributes.get("net_type") ?? null;
    if (netType !== null && !NET_TYPES.includes(netType)) {
      found.push(`DefaultNettypeDirective.net_type cannot be ${repr(netType)}`);
    }
  }
  if (node.kind === IFDEFDIRECTIVE || node.kind === "elsifdirective") found.push(...conditionProblems(node));
  if (node.kind === "identifier") found.push(...X.problems(node));
  for (const value of node.helpers.values()) for (const inner of nodes(value)) found.push(...problems(inner));
  return found;
}

/** A kind's checks, and its helpers' (a macro's name's spelling). */
function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

/** The macros' names a condition holds: what it binds within itself, as each names a macro, defined or not. */
function macros(condition: any): ReadonlySet<string> {
  const names = new Set<string>();
  if (condition === null) return names;
  const terms: any[] = [condition];
  while (terms.length > 0) {
    const value = terms.pop();
    const [tag, record] = F.kindOf(value);
    if (tag === X.NAMEEXPRESSION) {
      const name = F.nameOf(value);
      if (name !== null) names.add(name);
    } else {
      terms.push(...F.argumentsOf(record).filter((argument) => argument !== null));
    }
  }
  return names;
}

/** What each of a conditional directive's arguments has bound: each condition, its macros' names; its branches' items,
 * and its `else`'s, nothing. */
function ifdefScopes(record: any): ReadonlySet<string>[] {
  const node = F.node(IFDEFDIRECTIVE, record);
  const none = (count: number): ReadonlySet<string>[] => Array.from({ length: count }, () => new Set<string>());
  const found = [macros(node.slots.get("condition") ?? null), ...none(node.many.length)];
  for (const branch of nodes(node.helpers.get("branches"))) {
    found.push(macros(branch.slots.get("condition") ?? null), ...none(branch.many.length));
  }
  return found;
}

/** How the framework reads its own kinds. */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), ...options });
  return {
    [MACROUSAGE]: application(MACROUSAGE, { required: ["name"] }),
    [INCLUDEDIRECTIVE]: application(INCLUDEDIRECTIVE, { required: ["path"] }),
    [DEFINEDIRECTIVE]: application(DEFINEDIRECTIVE, { required: ["name"] }),
    [UNDEFDIRECTIVE]: application(UNDEFDIRECTIVE, { required: ["name"] }),
    [TIMESCALEDIRECTIVE]: application(TIMESCALEDIRECTIVE, { required: ["unit", "precision"] }),
    [DEFAULTNETTYPEDIRECTIVE]: application(DEFAULTNETTYPEDIRECTIVE, { required: ["net_type"] }),
    [IFDEFDIRECTIVE]: application(IFDEFDIRECTIVE, { optional: ["condition", "branches.condition"], scopes: ifdefScopes }),
    [DISABLEDTEXT]: application(DISABLEDTEXT, { required: ["text"] }),
    [OTHERDIRECTIVE]: application(OTHERDIRECTIVE, { required: ["text"] }),
    [COMMENT]: application(COMMENT),
  };
}

/** The dialects of its family whose terms its positions hold, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [X.DIALECT, Types.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Constraints.DIALECT];
}

/** The SystemVerilog Preprocessor dialect: its kinds, as the framework reads them, and the terms of its family's
 * dialects. */
export const DIALECT = new F.Dialect("SystemVerilog.Preprocessor", kinds(), { domain_of: X.untyped, reads });
