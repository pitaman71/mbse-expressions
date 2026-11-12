/**
 * Expressions of the SystemVerilog Assertions dialect: SystemVerilog Assertions' sequences and properties (IEEE 1800
 * 16.7 to 16.12), as mbse-programs has them.
 *
 * It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6: "if the standard says it's a
 * sublanguage then it's definitely at least a separate dialect"), named `SystemVerilog Assertions` (`Terms.dialect_name`),
 * its tag `systemverilog_assertions`. Its terms are values of its `Term`, `Expressions.SystemVerilog.Assertions.Term`, the
 * branch `systemverilog_assertions` of `Expressions.Framework.Term`; a call's arguments, a named connection's value and
 * every operand of a sequence or a property hold it, a property, a sequence or an expression (mbse-programs' `Property |
 * Expression`), so it lists, besides its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which
 * that dialect's install adds ("(b)"), the Preprocessor's `macrousage` and the Constraints' `distexpression` (16.7's
 * `expression_or_dist`), which their installs add. Its own kinds are mbse-programs' sequences and properties
 * (`mbse:mbse-programs/python3/mbse/Programs/Verilog/Syntax.py`), with mbse-programs' names, lowercased as branch tags, and
 * its properties in source order, each a value object `Expressions.SystemVerilog.Assertions.<Kind>`:
 *
 * - Sequences (16.7 to 16.10): `delaysequence` (`a ##1 b ##[1:3] c`, its steps each a `delaystep`),
 *   `repetitionsequence` (`a[*2]`, `a[->1:3]`, `a[=2]`), `binarysequence` (`and`, `or`, `intersect`, `within`,
 *   `throughout`), `parenthesizedsequence` (`(s, x = a)`, with its match items), `firstmatchsequence` and
 *   `clockedsequence` (`@(posedge clk) s`);
 * - Properties (16.12): `implicationproperty` (`|->`, `|=>`, `#-#`, `#=#`), `binaryproperty` (`and`, `or`, `iff`,
 *   `implies`, `until`, `s_until`, `until_with`, `s_until_with`), `unaryproperty` (`not`, `nexttime`, `always`,
 *   `eventually` and their strong forms, with a number of ticks or a range), `strengthproperty` (`strong(s)`,
 *   `weak(s)`), `abortproperty` (`accept_on`, `reject_on` and their synchronous forms), `conditionalproperty`,
 *   `caseproperty` (its items each a `propertycaseitem`), `parenthesizedproperty` and `clockedproperty`;
 * - `propertyspec`, a property with its clock and its `disable iff` (16.12), the root an assertion statement's holder
 *   holds (`@(posedge clk) disable iff (rst) a |-> b`), and `cyclerange` (`1:3`, `1:$`), a range of ticks or of
 *   repetitions, which a delay's, a repetition's and a unary property's count hold beside an expression.
 *
 * Its helpers: `delaystep`, `propertycaseitem`, and a clock's `eventcontrol` (`@(...)`, `@(*)` without events) and its
 * `eventexpression`s (`posedge clk iff en`), IEEE 1800's event control (9.4.2), held here as a sequence's or a property's
 * clock. A subterm the standard writes `expression_or_dist` (an `if`'s, a `case`'s and its items' expressions, an
 * abort's condition, `disable iff`'s) is of its `Term`, which lists `distexpression`; a match item, a cycle range's
 * bound and an event's expression and condition hold `Expressions`' `Term`. None of its kinds binds a name: a
 * sequence's local variables are its declaration's, a statement's.
 *
 * The editions it covers are data, which `define` writes: IEEE 1800's, IEEE Std 1800-2005 to 1800-2023
 * (`Expressions.EDITIONS` from the fourth), each with its own kinds it has (`SINCE`: `strengthproperty`, `abortproperty`
 * and `caseproperty` arrived in IEEE 1800-2009). `DIALECT` reads its kinds and the five other dialects' terms. `Text`
 * writes its kinds as SystemVerilog source, as the family's printer (`Expressions.Text.ToText`) dispatches them to it, by
 * IEEE 1800's precedence of sequence and property operators (Table 16-3). The evaluator refuses each of its kinds by name
 * (the dialects proposal, Q11). Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
 * syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `(t) => t.repetitionsequence((r) => r.sequence(a)
 * .operator("*").count(two))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as X from "../Expressions/Expressions.js";
import * as Constraints from "../Constraints/Expressions.js";
import * as Patterns from "../Patterns/Expressions.js";
import * as Preprocessor from "../Preprocessor/Expressions.js";
import * as Types from "../Types/Expressions.js";

const { repr } = Repr;

export const DELAYSEQUENCE = "delaysequence";
export const REPETITIONSEQUENCE = "repetitionsequence";
export const BINARYSEQUENCE = "binarysequence";
export const PARENTHESIZEDSEQUENCE = "parenthesizedsequence";
export const FIRSTMATCHSEQUENCE = "firstmatchsequence";
export const CLOCKEDSEQUENCE = "clockedsequence";
export const IMPLICATIONPROPERTY = "implicationproperty";
export const BINARYPROPERTY = "binaryproperty";
export const UNARYPROPERTY = "unaryproperty";
export const STRENGTHPROPERTY = "strengthproperty";
export const ABORTPROPERTY = "abortproperty";
export const CONDITIONALPROPERTY = "conditionalproperty";
export const CASEPROPERTY = "caseproperty";
export const PARENTHESIZEDPROPERTY = "parenthesizedproperty";
export const CLOCKEDPROPERTY = "clockedproperty";
export const PROPERTYSPEC = "propertyspec";
export const CYCLERANGE = "cyclerange";

/** Its sequences (mbse-programs' `Sequence`), each a property too. */
export const SEQUENCES: readonly string[] = [DELAYSEQUENCE, REPETITIONSEQUENCE, BINARYSEQUENCE, PARENTHESIZEDSEQUENCE,
  FIRSTMATCHSEQUENCE, CLOCKEDSEQUENCE];

/** Its properties that are no sequence (mbse-programs' `Property`). */
export const PROPERTIES: readonly string[] = [IMPLICATIONPROPERTY, BINARYPROPERTY, UNARYPROPERTY, STRENGTHPROPERTY,
  ABORTPROPERTY, CONDITIONALPROPERTY, CASEPROPERTY, PARENTHESIZEDPROPERTY, CLOCKEDPROPERTY];

/** Its own kinds, in its `Term`'s order after `Expressions`' branches. */
export const TAGS: readonly string[] = [...SEQUENCES, ...PROPERTIES, PROPERTYSPEC, CYCLERANGE];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/systemverilog-slang.json`) names them. */
export const HELPERS: readonly string[] = ["DelayStep", "PropertyCaseItem", "EventControl", "EventExpression"];

/** The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`
 * (`sv(2009)`, IEEE 1800-2009); a kind not listed is in every edition of IEEE 1800 (`sv()`, its first, 3). */
export const SINCE: ReadonlyMap<string, number> = new Map([STRENGTHPROPERTY, ABORTPROPERTY, CASEPROPERTY].map((tag) => [tag, 4]));

/** The attributes that are one of a few choices, by kind: mbse-programs' kind, and each attribute's choices. */
const CHOICES: ReadonlyMap<string, readonly [string, Readonly<Record<string, readonly string[]>>]> = new Map([
  [REPETITIONSEQUENCE, ["RepetitionSequence", { operator: ["*", "->", "="] }] as const],
  [BINARYSEQUENCE, ["BinarySequence", { operator: ["and", "or", "intersect", "within", "throughout"] }] as const],
  [IMPLICATIONPROPERTY, ["ImplicationProperty", { operator: ["|->", "|=>", "#-#", "#=#"] }] as const],
  [BINARYPROPERTY, ["BinaryProperty", { operator: ["and", "or", "iff", "implies", "until", "s_until", "until_with",
    "s_until_with"] }] as const],
  [UNARYPROPERTY, ["UnaryProperty", { operator: ["not", "nexttime", "s_nexttime", "always", "s_always", "eventually",
    "s_eventually"] }] as const],
  [STRENGTHPROPERTY, ["StrengthProperty", { keyword: ["strong", "weak"] }] as const],
  [ABORTPROPERTY, ["AbortProperty", { keyword: ["accept_on", "reject_on", "sync_accept_on", "sync_reject_on"] }] as const],
  ["eventexpression", ["EventExpression", { edge: ["posedge", "negedge", "edge"] }] as const],
]);

/** SystemVerilog Assertions' union of its kinds, added to the framework's terms as the branch `systemverilog_assertions`,
 * its own kinds, the helpers they hold, and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Assertions`:
 * run after `Framework.install`, in a transaction of its own, before or after the other SystemVerilog dialects'
 * installs; run again, it writes nothing. `Expressions.SystemVerilog.Expressions.Term`, of which its expression
 * subterms are, is named, created where that dialect's install has not run; that install adds its branches to this
 * `Term`, as the Preprocessor's adds `macrousage` and the Constraints' `distexpression`. Its holder,
 * `Expressions.SystemVerilog.Assertions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.SystemVerilog.Assertions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject,
      // `Expressions`' union, by name: its install's, created here where it has not run
      ExpressionsTerm: S.OfUnion,
      DelaySequence: S.OfObject, DelayStep: S.OfObject, RepetitionSequence: S.OfObject,
      BinarySequence: S.OfObject, ParenthesizedSequence: S.OfObject,
      FirstMatchSequence: S.OfObject, ClockedSequence: S.OfObject,
      ImplicationProperty: S.OfObject, BinaryProperty: S.OfObject, UnaryProperty: S.OfObject,
      StrengthProperty: S.OfObject, AbortProperty: S.OfObject, ConditionalProperty: S.OfObject,
      CaseProperty: S.OfObject, PropertyCaseItem: S.OfObject, ParenthesizedProperty: S.OfObject,
      ClockedProperty: S.OfObject, PropertySpec: S.OfObject, CycleRange: S.OfObject,
      EventControl: S.OfObject, EventExpression: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.SystemVerilog.Assertions`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.SystemVerilog.Assertions.Dialect").ref(true).singleton("Expressions.SystemVerilog.Assertions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("systemverilog_assertions").schema([_.Dialect])]),
      // its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
      (_: any) => _.Term.name("Expressions.SystemVerilog.Assertions.Term").branches([
        (t: any) => t.name("delaysequence").schema([_.DelaySequence]),
        (t: any) => t.name("repetitionsequence").schema([_.RepetitionSequence]),
        (t: any) => t.name("binarysequence").schema([_.BinarySequence]),
        (t: any) => t.name("parenthesizedsequence").schema([_.ParenthesizedSequence]),
        (t: any) => t.name("firstmatchsequence").schema([_.FirstMatchSequence]),
        (t: any) => t.name("clockedsequence").schema([_.ClockedSequence]),
        (t: any) => t.name("implicationproperty").schema([_.ImplicationProperty]),
        (t: any) => t.name("binaryproperty").schema([_.BinaryProperty]),
        (t: any) => t.name("unaryproperty").schema([_.UnaryProperty]),
        (t: any) => t.name("strengthproperty").schema([_.StrengthProperty]),
        (t: any) => t.name("abortproperty").schema([_.AbortProperty]),
        (t: any) => t.name("conditionalproperty").schema([_.ConditionalProperty]),
        (t: any) => t.name("caseproperty").schema([_.CaseProperty]),
        (t: any) => t.name("parenthesizedproperty").schema([_.ParenthesizedProperty]),
        (t: any) => t.name("clockedproperty").schema([_.ClockedProperty]),
        (t: any) => t.name("propertyspec").schema([_.PropertySpec]),
        (t: any) => t.name("cyclerange").schema([_.CycleRange]),
      ]),
      (_: any) => _.ExpressionsTerm.name("Expressions.SystemVerilog.Expressions.Term"),
      // sequences (16.7 to 16.10)
      (_: any) => _.DelaySequence.name("Expressions.SystemVerilog.Assertions.DelaySequence").properties({
        first: _.Term, steps: many(_.DelayStep) }), // without `first`, it starts with a delay
      (_: any) => _.DelayStep.name("Expressions.SystemVerilog.Assertions.DelayStep").properties({
        delay: _.Term, sequence: _.Term }), // a delay: an expression or a cycle range
      (_: any) => _.CycleRange.name("Expressions.SystemVerilog.Assertions.CycleRange").properties({
        low: _.ExpressionsTerm, high: _.ExpressionsTerm }), // `high` `$` when unbounded
      (_: any) => _.RepetitionSequence.name("Expressions.SystemVerilog.Assertions.RepetitionSequence").properties({
        sequence: _.Term, operator: S.OfStr, count: _.Term }),
      (_: any) => _.BinarySequence.name("Expressions.SystemVerilog.Assertions.BinarySequence").properties({
        left: _.Term, operator: S.OfStr, right: _.Term }),
      (_: any) => _.ParenthesizedSequence.name("Expressions.SystemVerilog.Assertions.ParenthesizedSequence").properties({
        sequence: _.Term, items: many(_.ExpressionsTerm) }), // its match items
      (_: any) => _.FirstMatchSequence.name("Expressions.SystemVerilog.Assertions.FirstMatchSequence").properties({
        sequence: _.Term, items: many(_.ExpressionsTerm) }),
      (_: any) => _.ClockedSequence.name("Expressions.SystemVerilog.Assertions.ClockedSequence").properties({
        clock: _.EventControl, sequence: _.Term }),
      // properties (16.12)
      (_: any) => _.ImplicationProperty.name("Expressions.SystemVerilog.Assertions.ImplicationProperty").properties({
        antecedent: _.Term, operator: S.OfStr, consequent: _.Term }),
      (_: any) => _.BinaryProperty.name("Expressions.SystemVerilog.Assertions.BinaryProperty").properties({
        left: _.Term, operator: S.OfStr, right: _.Term }),
      (_: any) => _.UnaryProperty.name("Expressions.SystemVerilog.Assertions.UnaryProperty").properties({
        operator: S.OfStr, range: _.Term, operand: _.Term }),
      (_: any) => _.StrengthProperty.name("Expressions.SystemVerilog.Assertions.StrengthProperty").properties({
        keyword: S.OfStr, sequence: _.Term }),
      (_: any) => _.AbortProperty.name("Expressions.SystemVerilog.Assertions.AbortProperty").properties({
        keyword: S.OfStr, condition: _.Term, operand: _.Term }),
      (_: any) => _.ConditionalProperty.name("Expressions.SystemVerilog.Assertions.ConditionalProperty").properties({
        condition: _.Term, consequence: _.Term, alternative: _.Term }),
      (_: any) => _.CaseProperty.name("Expressions.SystemVerilog.Assertions.CaseProperty").properties({
        expression: _.Term, items: many(_.PropertyCaseItem) }),
      (_: any) => _.PropertyCaseItem.name("Expressions.SystemVerilog.Assertions.PropertyCaseItem").properties({
        expressions: many(_.Term), body: _.Term }), // without expressions: `default`
      (_: any) => _.ParenthesizedProperty.name("Expressions.SystemVerilog.Assertions.ParenthesizedProperty").properties({
        property: _.Term }),
      (_: any) => _.ClockedProperty.name("Expressions.SystemVerilog.Assertions.ClockedProperty").properties({
        clock: _.EventControl, property: _.Term }),
      (_: any) => _.PropertySpec.name("Expressions.SystemVerilog.Assertions.PropertySpec").properties({
        clock: _.EventControl, disable: _.Term, property: _.Term }),
      // a clock: an event control (9.4.2), its events joined by `or`, `@(*)` without events
      (_: any) => _.EventControl.name("Expressions.SystemVerilog.Assertions.EventControl").properties({
        events: many(_.EventExpression) }),
      (_: any) => _.EventExpression.name("Expressions.SystemVerilog.Assertions.EventExpression").properties({
        edge: S.OfStr, expression: _.ExpressionsTerm, condition: _.ExpressionsTerm }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.SystemVerilog.Assertions.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("systemverilog_assertions").schema([_.Term])]),
    ])]))]);
}

/** SystemVerilog Assertions' dialect as data: the singleton `Expressions.SystemVerilog.Assertions` owning the editions it covers,
 * by designation (`standards`), IEEE Std 1800-2005 to 2023, each with its formal reference's parts, its common name and
 * its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its
 * frame binds the dialect (`dialect`) and each edition by its common name spelled as an identifier
 * (`SystemVerilog_2023`). */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.SystemVerilog.Assertions, txn.Expressions.Framework.Standard];
  const every = new Map((OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => [branch.name, branch.schema] as [string, any]));
  const kinds = X.editions(every, SINCE, 3);
  return txn.uid("mbse.Expressions.SystemVerilog.Assertions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
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

/** A helper property's nodes: one, or each of many. */
function nodes(value: unknown): readonly F.Node[] {
  return Array.isArray(value) ? value : [value as F.Node];
}

/** A node's checks, and its helpers' in turn, which the framework's validation does not read within a helper: an
 * operator or a keyword, one of a few, as mbse-programs' choices have them (`BinarySequence.operator cannot be 'xor'`),
 * and an event's edge. */
export function problems(node: F.Node): string[] {
  const found: string[] = [];
  const choice = CHOICES.get(node.kind);
  if (choice !== undefined) {
    const [name, choices] = choice;
    for (const [attribute, allowed] of Object.entries(choices)) {
      const value = node.attributes.get(attribute) ?? null;
      if (value !== null && !allowed.includes(value)) found.push(`${name}.${attribute} cannot be ${repr(value)}`);
    }
  }
  for (const value of node.helpers.values()) for (const inner of nodes(value)) found.push(...problems(inner));
  return found;
}

function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

/** The subterms of its kinds' helpers that may be empty: a clock's event's condition (`iff`). */
const OPTIONAL: readonly string[] = ["clock.events.condition"];

/** How the framework reads its own kinds: each an application of no operation it evaluates, binding no name. */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), ...options,
      optional: [...(options.optional ?? []), ...OPTIONAL] });
  return {
    [DELAYSEQUENCE]: application(DELAYSEQUENCE, { optional: ["first"] }),
    [REPETITIONSEQUENCE]: application(REPETITIONSEQUENCE, { required: ["operator"] }),
    [BINARYSEQUENCE]: application(BINARYSEQUENCE, { required: ["operator"] }),
    [PARENTHESIZEDSEQUENCE]: application(PARENTHESIZEDSEQUENCE),
    [FIRSTMATCHSEQUENCE]: application(FIRSTMATCHSEQUENCE),
    [CLOCKEDSEQUENCE]: application(CLOCKEDSEQUENCE, { required: ["clock"] }),
    [IMPLICATIONPROPERTY]: application(IMPLICATIONPROPERTY, { required: ["operator"] }),
    [BINARYPROPERTY]: application(BINARYPROPERTY, { required: ["operator"] }),
    [UNARYPROPERTY]: application(UNARYPROPERTY, { optional: ["range"], required: ["operator"] }),
    [STRENGTHPROPERTY]: application(STRENGTHPROPERTY, { required: ["keyword"] }),
    [ABORTPROPERTY]: application(ABORTPROPERTY, { required: ["keyword"] }),
    [CONDITIONALPROPERTY]: application(CONDITIONALPROPERTY, { optional: ["alternative"] }),
    [CASEPROPERTY]: application(CASEPROPERTY),
    [PARENTHESIZEDPROPERTY]: application(PARENTHESIZEDPROPERTY),
    [CLOCKEDPROPERTY]: application(CLOCKEDPROPERTY, { required: ["clock"] }),
    [PROPERTYSPEC]: application(PROPERTYSPEC, { optional: ["disable"] }),
    [CYCLERANGE]: application(CYCLERANGE),
  };
}

/** The dialects of its family whose terms are its subterms, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [X.DIALECT, Types.DIALECT, Patterns.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT];
}

/** The SystemVerilog Assertions dialect: its kinds, as the framework reads them, and the terms of its family's dialects. */
export const DIALECT = new F.Dialect("SystemVerilog.Assertions", kinds(), { domain_of: X.untyped, literal: X.native, reads });
