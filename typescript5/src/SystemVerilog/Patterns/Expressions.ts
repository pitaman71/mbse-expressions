/**
 * Expressions of the SystemVerilog Patterns dialect: the patterns `matches` compares a value with, binding its
 * variables (IEEE 1800 12.6), as mbse-programs has them.
 *
 * It is a dialect of the SystemVerilog family (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "if the standard says it's a
 * sublanguage then it's definitely at least a separate dialect"), named `SystemVerilog Patterns`
 * (`Terms.dialect_name`), its tag `systemverilog_patterns`. Its terms are values of its `Term`,
 * `Expressions.SystemVerilog.Patterns.Term`, the branch `systemverilog_patterns` of `Expressions.Framework.Term`; a
 * `matches`' pattern holds it, a pattern or an expression (mbse-programs' `Pattern | Expression`), so it lists, besides
 * its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which that dialect's install adds ("(b)").
 *
 * Its own kinds are mbse-programs' patterns (`mbse:mbse-programs/python3/mbse/Programs/Verilog/Syntax.py`), with
 * mbse-programs' names, lowercased as branch tags, and its properties in source order, each a value object
 * `Expressions.SystemVerilog.Patterns.<Kind>`:
 *
 * - `variablepattern` (`.name`: any value, bound to a variable of that name) and `wildcardpattern` (`.*`: any value);
 * - `taggedpattern` (`tagged member pattern`: a tagged union's value of that member, its pattern optional);
 * - `structurepattern` (`'{patterns}` or `'{member: pattern, ...}`), its items patterns or expressions in order, or its
 *   `patternmember`s (`member: pattern`) by name, not both;
 * - `parenthesizedpattern` (`(pattern)`), kept as written (Q5: "a pattern's parentheses kept as a kind"), which
 *   mbse-programs omits.
 *
 * A pattern's nested patterns, and a member's, are this dialect's `Term`, a pattern or an expression (a constant
 * pattern); a name is `Expressions`' `Identifier`, the family's helper. What a pattern binds is its variables
 * (`bound_names`), which a `matches` binds in its conditional's consequence and the conditions after it in a `&&&`
 * (12.6.2, 12.6.3), as `Expressions`' scopes read them: a pattern binds, but is no binder of its own, so none of its kinds
 * refines `Let`. Its kinds are applications the framework reads by their structure, of no known domain, and are not
 * evaluated: SystemVerilog's evaluator refuses each by name ("SystemVerilog Patterns variablepattern is not evaluated").
 *
 * The editions it covers are data, which `define` writes: IEEE 1800's, IEEE Std 1800-2005 to 1800-2023
 * (`Expressions.EDITIONS` from the fourth), each with its own kinds it has (`SINCE`: every one since IEEE 1800-2005, as
 * mbse-programs' `sv()` has them). `DIALECT` reads its kinds and the five other dialects' terms. `Text` writes its kinds
 * as SystemVerilog source, as the family's printer (`Expressions.Text.ToText`) dispatches them to it. Its terms are
 * written through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(u) => u.variablepattern((v) => v.name((i) => i.spelling("x")))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as X from "../Expressions/Expressions.js";
import * as Assertions from "../Assertions/Expressions.js";
import * as Constraints from "../Constraints/Expressions.js";
import * as Preprocessor from "../Preprocessor/Expressions.js";
import * as Types from "../Types/Expressions.js";

export const VARIABLEPATTERN = "variablepattern";
export const WILDCARDPATTERN = "wildcardpattern";
export const TAGGEDPATTERN = "taggedpattern";
export const STRUCTUREPATTERN = "structurepattern";
export const PATTERNMEMBER = "patternmember";
export const PARENTHESIZEDPATTERN = "parenthesizedpattern";

/** Its own kinds, in its `Term`'s order after `Expressions`' branches: a structure pattern's member is a kind too, as
 * `Expressions`' `patternitem` is, since a structure pattern's items mix members with patterns ("(b)"). */
export const TAGS: readonly string[] = [VARIABLEPATTERN, WILDCARDPATTERN, TAGGEDPATTERN, STRUCTUREPATTERN, PATTERNMEMBER,
  PARENTHESIZEDPATTERN];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/systemverilog-slang.json`) names them: none, its names being `Expressions`' `Identifier`. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`
 * (`sv()`, IEEE 1800-2005, 3, every one; a pattern's parentheses, which mbse-programs omits, are IEEE 1800-2005's
 * grammar's too). */
export const SINCE: ReadonlyMap<string, number> = new Map(TAGS.map((tag) => [tag, 3]));

/** SystemVerilog Patterns' union of its kinds, added to the framework's terms as the branch `systemverilog_patterns`, its
 * own kinds, and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Patterns`: run after
 * `Framework.install`, in a transaction of its own, before or after the other SystemVerilog dialects' installs; run
 * again, it writes nothing. `Expressions`' `Identifier`, which its names are, is named, created where that install has
 * not run; that install adds its branches to this `Term`. Its holder, `Expressions.SystemVerilog.Patterns.Expression`,
 * refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.SystemVerilog.Patterns/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      // `Expressions`' identifier, by name: its install's, created here where it has not run
      Identifier: S.OfObject,
      VariablePattern: S.OfObject, WildcardPattern: S.OfObject, TaggedPattern: S.OfObject,
      StructurePattern: S.OfObject, PatternMember: S.OfObject, ParenthesizedPattern: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.SystemVerilog.Patterns`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.SystemVerilog.Patterns.Dialect").ref(true).singleton("Expressions.SystemVerilog.Patterns").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("systemverilog_patterns").schema([_.Dialect])]),
      // its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
      (_: any) => _.Term.name("Expressions.SystemVerilog.Patterns.Term").branches([
        (t: any) => t.name("variablepattern").schema([_.VariablePattern]),
        (t: any) => t.name("wildcardpattern").schema([_.WildcardPattern]),
        (t: any) => t.name("taggedpattern").schema([_.TaggedPattern]),
        (t: any) => t.name("structurepattern").schema([_.StructurePattern]),
        (t: any) => t.name("patternmember").schema([_.PatternMember]),
        (t: any) => t.name("parenthesizedpattern").schema([_.ParenthesizedPattern]),
      ]),
      (_: any) => _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier"),
      // patterns (12.6), each nested pattern this dialect's term: a pattern, or an expression
      (_: any) => _.VariablePattern.name("Expressions.SystemVerilog.Patterns.VariablePattern").properties({
        name: _.Identifier }),
      (_: any) => _.WildcardPattern.name("Expressions.SystemVerilog.Patterns.WildcardPattern"),
      (_: any) => _.TaggedPattern.name("Expressions.SystemVerilog.Patterns.TaggedPattern").properties({
        member: _.Identifier, pattern: _.Term }), // pattern absent: `tagged None`
      (_: any) => _.StructurePattern.name("Expressions.SystemVerilog.Patterns.StructurePattern").properties({
        items: many(_.Term) }),
      (_: any) => _.PatternMember.name("Expressions.SystemVerilog.Patterns.PatternMember").properties({
        name: _.Identifier, pattern: _.Term }),
      (_: any) => _.ParenthesizedPattern.name("Expressions.SystemVerilog.Patterns.ParenthesizedPattern").properties({
        pattern: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.SystemVerilog.Patterns.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("systemverilog_patterns").schema([_.Term])]),
    ])]))]);
}

/** SystemVerilog Patterns' dialect as data: the singleton `Expressions.SystemVerilog.Patterns` owning the editions it covers,
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

/** The names a pattern binds, its variables (`.name`), wherever its tagged, structure, member and parenthesized patterns
 * nest them, which a `matches` binds in its conditional's consequence and the conditions after it (12.6.2): none, of a
 * wildcard, a constant pattern (an expression) or invalid syntax, nor of a variable with no name. */
export function boundNames(pattern: any): ReadonlySet<string> {
  const [tag, record] = F.kindOf(pattern);
  const node = F.node(tag, record);
  if (tag === VARIABLEPATTERN) {
    const name = (node.helpers.get("name") ?? null) as F.Node | null;
    const spelling = name !== null ? name.attributes.get("spelling") ?? null : null;
    return new Set(spelling === null ? [] : [spelling]);
  }
  if (tag === TAGGEDPATTERN || tag === PATTERNMEMBER || tag === PARENTHESIZEDPATTERN) {
    const inner = node.subterms.get("pattern") ?? null;
    return inner === null ? new Set() : boundNames(inner);
  }
  if (tag === STRUCTUREPATTERN) return new Set(node.many.flatMap((item) => [...boundNames(item)]));
  return new Set();
}

/** A node's checks: mbse-programs' (a structure pattern's members in order or by name, not both), and its helpers' in
 * turn, the family's (an identifier's spelling), which `Expressions.problems` reads. */
export function problems(node: F.Node): string[] {
  const found: string[] = [];
  if (node.kind === STRUCTUREPATTERN) {
    const named = node.many.map((item) => F.kindOf(item)[0] === PATTERNMEMBER);
    if (named.some((n) => n) && !named.every((n) => n)) {
      found.push("a StructurePattern's members are in order or by name, not both");
    }
  }
  return [...found, ...X.problems(node)];
}

function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

/** How the framework reads its own kinds: applications, of no domain known statically (`Opaque`). */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), ...options });
  return {
    [VARIABLEPATTERN]: application(VARIABLEPATTERN, { required: ["name"] }),
    [WILDCARDPATTERN]: application(WILDCARDPATTERN),
    [TAGGEDPATTERN]: application(TAGGEDPATTERN, { required: ["member"], optional: ["pattern"] }),
    [STRUCTUREPATTERN]: application(STRUCTUREPATTERN),
    [PATTERNMEMBER]: application(PATTERNMEMBER, { required: ["name"] }),
    [PARENTHESIZEDPATTERN]: application(PARENTHESIZEDPATTERN),
  };
}

/** The dialects of its family whose terms are its subterms, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [X.DIALECT, Types.DIALECT, Assertions.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT];
}

/** The SystemVerilog Patterns dialect: its kinds, as the framework reads them, and the terms of its family's dialects. */
export const DIALECT = new F.Dialect("SystemVerilog.Patterns", kinds(), { domain_of: X.untyped, literal: X.native, reads });
