/**
 * Expressions of the SystemVerilog Constraints dialect: the constraints and distributions of constraint blocks (IEEE
 * 1800 18.5), as mbse-programs has them.
 *
 * It is a dialect of the SystemVerilog family (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "if the standard says it's a
 * sublanguage then it's definitely at least a separate dialect"), named `SystemVerilog Constraints`
 * (`Terms.dialect_name`), its tag `systemverilog_constraints`. Its terms are values of its `Term`,
 * `Expressions.SystemVerilog.Constraints.Term`, the branch `systemverilog_constraints` of `Expressions.Framework.Term`; a
 * constraint block's items, a `randomize() with`'s and an expression constraint's expression (`expression_or_dist`) hold
 * it, so it lists, besides its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which that
 * dialect's install adds ("(b)"), and the Preprocessor's directives and `comment` (Q6), which its install adds. Its own
 * kinds are mbse-programs' constraints (`mbse:mbse-programs/python3/mbse/Programs/Verilog/Syntax.py`), with
 * mbse-programs' names, lowercased as branch tags, and its properties in source order, each a value object
 * `Expressions.SystemVerilog.Constraints.<Kind>`:
 *
 * - `constraintblock` (`{ items }`), `expressionconstraint` (`soft expression;`, its expression this dialect's term, a
 *   distribution or an expression), `implicationconstraint` (`condition -> body`), `conditionalconstraint`
 *   (`if (condition) consequence else alternative`), `foreachconstraint` (`foreach (array[variables]) body`),
 *   `solvebeforeconstraint` (`solve a, b before c;`, 18.5.10, two containers of terms, `solve` and `before`),
 *   `disablesoftconstraint` (`disable soft x;`) and `uniqueconstraint` (`unique { set }`), each a constraint's
 *   condition, array, variables, target or set `Expressions`' terms, its body this dialect's;
 * - `distexpression` (`value dist { items }`, 18.5.4), a distribution of a random variable's values, whose items are
 *   `distitem`s (`value := weight`, `value :/ weight`, or `default :/ weight` with no value), each value an `Expressions`
 *   term, a range among them (`valuerange`). `install` adds it to `Expressions.SystemVerilog.Assertions.Term` too, as
 *   IEEE 1800 lets a sequence's expression be one (16.7, `expression_or_dist`), creating that union where its install has
 *   not run, as the Preprocessor's install adds `macrousage` to the `Term`s that list `Expressions`' branches.
 *
 * Its helpers: `distitem` (`Expressions.SystemVerilog.Constraints.DistItem`), and the union of a loop's variables,
 * `Expressions.SystemVerilog.Constraints.LoopVariable`, an `Expressions` identifier or, for a dimension it skips
 * (`q[, j]`), an `emptyargument` (mbse-programs' `Identifier | EmptyArgument`). An identifier is `Expressions`'
 * `Identifier`: the family's helpers, one schema each.
 *
 * `foreachconstraint` binds its loop variables within its body (18.5.8.1): it refines `Expressions.Framework.Let` (Q8,
 * "(a)"), holding its array as `Let`'s `value`, an `Expressions` term, and its body as `Let`'s `body`, this dialect's
 * term; `Let`'s `name` stays unset, as a loop binds several names, which its kind's scopes give (`Kind.scopes`).
 *
 * The editions it covers are data, which `define` writes: IEEE 1800's, IEEE Std 1800-2005 to 1800-2023
 * (`Expressions.EDITIONS` from the fourth), each with its own kinds it has (`SINCE`: `disablesoftconstraint` and
 * `uniqueconstraint` from IEEE 1800-2012). A feature within a kind (`soft`, 2012; a default distribution item, 2023) is
 * not recorded, as for C's: a constraint, to come. `DIALECT` reads its kinds and the five other dialects' terms. `Text`
 * writes its kinds as SystemVerilog source, as `randomize() with` writes them, on one line. No kind of it is folded
 * (Q11): SystemVerilog's rules leave each in the residual, named. Its terms are written through the builders (mbse-basis
 * [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(c) => c.expressionconstraint((e) => e.soft(true).expression(...))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as X from "../Expressions/Expressions.js";
import * as Assertions from "../Assertions/Expressions.js";
import * as Patterns from "../Patterns/Expressions.js";
import * as Preprocessor from "../Preprocessor/Expressions.js";
import * as Types from "../Types/Expressions.js";

const { repr } = Repr;

export const CONSTRAINTBLOCK = "constraintblock";
export const EXPRESSIONCONSTRAINT = "expressionconstraint";
export const IMPLICATIONCONSTRAINT = "implicationconstraint";
export const CONDITIONALCONSTRAINT = "conditionalconstraint";
export const FOREACHCONSTRAINT = "foreachconstraint";
export const SOLVEBEFORECONSTRAINT = "solvebeforeconstraint";
export const DISABLESOFTCONSTRAINT = "disablesoftconstraint";
export const UNIQUECONSTRAINT = "uniqueconstraint";
export const DISTEXPRESSION = "distexpression";

/** Its own kinds, in its `Term`'s order after `Expressions`' branches. */
export const TAGS: readonly string[] = [CONSTRAINTBLOCK, EXPRESSIONCONSTRAINT, IMPLICATIONCONSTRAINT, CONDITIONALCONSTRAINT,
  FOREACHCONSTRAINT, SOLVEBEFORECONSTRAINT, DISABLESOFTCONSTRAINT, UNIQUECONSTRAINT, DISTEXPRESSION];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/systemverilog-slang.json`) names them. */
export const HELPERS: readonly string[] = ["DistItem"];

/** The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`
 * (`sv(2012)`, IEEE 1800-2012); a kind not listed is in every edition of IEEE 1800 (its first, 3). */
export const SINCE: ReadonlyMap<string, number> = new Map([[DISABLESOFTCONSTRAINT, 5], [UNIQUECONSTRAINT, 5]]);

/** A distribution item's operators: each value of its range weighs its weight (`:=`), or the range does (`:/`). */
export const OPERATORS: readonly string[] = [":=", ":/"];

/** SystemVerilog Constraints' union of its kinds, added to the framework's terms as the branch
 * `systemverilog_constraints`, its own kinds, the helpers they hold, and its dialect's schema, whose singleton is
 * `Expressions.SystemVerilog.Constraints`: run after `Framework.install`, in a transaction of its own, before or after
 * the other SystemVerilog dialects' installs; run again, it writes nothing. `Expressions.SystemVerilog.Expressions.Term`,
 * which its conditions hold, and that dialect's helpers are named, created where its install has not run; that
 * install adds its branches to this `Term`. `distexpression` is added to `Expressions.SystemVerilog.Assertions.Term`
 * too, created where its install has not run. Its holder, `Expressions.SystemVerilog.Constraints.Expression`, refines
 * `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.SystemVerilog.Constraints/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject, LoopVariable: S.OfUnion,
      // `Expressions`' union and helpers, and Assertions' union, by name: their installs', created here where they
      // have not run
      ExpressionsTerm: S.OfUnion, AssertionsTerm: S.OfUnion, Identifier: S.OfObject, EmptyArgument: S.OfObject,
      ConstraintBlock: S.OfObject, ExpressionConstraint: S.OfObject, ImplicationConstraint: S.OfObject,
      ConditionalConstraint: S.OfObject, ForeachConstraint: S.OfObject, SolveBeforeConstraint: S.OfObject,
      DisableSoftConstraint: S.OfObject,
      UniqueConstraint: S.OfObject, DistExpression: S.OfObject, DistItem: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.SystemVerilog.Constraints`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.SystemVerilog.Constraints.Dialect").ref(true).singleton("Expressions.SystemVerilog.Constraints").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("systemverilog_constraints").schema([_.Dialect])]),
      // its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
      (_: any) => _.Term.name("Expressions.SystemVerilog.Constraints.Term").branches([
        (t: any) => t.name("constraintblock").schema([_.ConstraintBlock]),
        (t: any) => t.name("expressionconstraint").schema([_.ExpressionConstraint]),
        (t: any) => t.name("implicationconstraint").schema([_.ImplicationConstraint]),
        (t: any) => t.name("conditionalconstraint").schema([_.ConditionalConstraint]),
        (t: any) => t.name("foreachconstraint").schema([_.ForeachConstraint]),
        (t: any) => t.name("solvebeforeconstraint").schema([_.SolveBeforeConstraint]),
        (t: any) => t.name("disablesoftconstraint").schema([_.DisableSoftConstraint]),
        (t: any) => t.name("uniqueconstraint").schema([_.UniqueConstraint]),
        (t: any) => t.name("distexpression").schema([_.DistExpression]),
      ]),
      (_: any) => _.ExpressionsTerm.name("Expressions.SystemVerilog.Expressions.Term"),
      (_: any) => _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier"),
      (_: any) => _.EmptyArgument.name("Expressions.SystemVerilog.Expressions.EmptyArgument"),
      // a distribution is a sequence's expression too (16.7): Assertions' `Term` lists it
      (_: any) => _.AssertionsTerm.name("Expressions.SystemVerilog.Assertions.Term").branches([
        (t: any) => t.name("distexpression").schema([_.DistExpression])]),
      // constraints (18.5)
      (_: any) => _.ConstraintBlock.name("Expressions.SystemVerilog.Constraints.ConstraintBlock").properties({
        items: many(_.Term) }),
      (_: any) => _.ExpressionConstraint.name("Expressions.SystemVerilog.Constraints.ExpressionConstraint").properties({
        soft: S.OfBool, expression: _.Term }),
      (_: any) => _.ImplicationConstraint.name("Expressions.SystemVerilog.Constraints.ImplicationConstraint").properties({
        condition: _.ExpressionsTerm, body: _.Term }),
      (_: any) => _.ConditionalConstraint.name("Expressions.SystemVerilog.Constraints.ConditionalConstraint").properties({
        condition: _.ExpressionsTerm, consequence: _.Term, alternative: _.Term }),
      // a binder: `Let`, its array its value, an `Expressions` term, and its body this dialect's term
      (_: any) => _.ForeachConstraint.name("Expressions.SystemVerilog.Constraints.ForeachConstraint")
        .refines([Framework.Let]).properties({ value: _.ExpressionsTerm, variables: many(_.LoopVariable), body: _.Term }),
      (_: any) => _.LoopVariable.name("Expressions.SystemVerilog.Constraints.LoopVariable").branches([
        (t: any) => t.name("identifier").schema([_.Identifier]),
        (t: any) => t.name("emptyargument").schema([_.EmptyArgument]), // a dimension it skips
      ]),
      // an order in which variables are chosen (18.5.10): two containers of terms
      (_: any) => _.SolveBeforeConstraint.name("Expressions.SystemVerilog.Constraints.SolveBeforeConstraint").properties({
        solve: many(_.ExpressionsTerm), before: many(_.ExpressionsTerm)}),
      (_: any) => _.DisableSoftConstraint.name("Expressions.SystemVerilog.Constraints.DisableSoftConstraint").properties({
        target: _.ExpressionsTerm }),
      (_: any) => _.UniqueConstraint.name("Expressions.SystemVerilog.Constraints.UniqueConstraint").properties({
        set: many(_.ExpressionsTerm) }),
      // distributions (18.5.4)
      (_: any) => _.DistExpression.name("Expressions.SystemVerilog.Constraints.DistExpression").properties({
        value: _.ExpressionsTerm, items: many(_.DistItem) }),
      (_: any) => _.DistItem.name("Expressions.SystemVerilog.Constraints.DistItem").properties({
        value: _.ExpressionsTerm, // absent: `default`
        operator: S.OfStr, weight: _.ExpressionsTerm }), // both absent: a weight of 1
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.SystemVerilog.Constraints.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("systemverilog_constraints").schema([_.Term])]),
    ])]))]);
}

/** SystemVerilog Constraints' dialect as data: the singleton `Expressions.SystemVerilog.Constraints` owning the editions it covers,
 * by designation (`standards`), IEEE Std 1800-2005 to 2023, each with its formal reference's parts, its common name and
 * its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its
 * frame binds the dialect (`dialect`) and each edition by its common name spelled as an identifier
 * (`SystemVerilog_2023`). */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.SystemVerilog.Constraints, txn.Expressions.Framework.Standard];
  const every = new Map((OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => [branch.name, branch.schema] as [string, any]));
  const kinds = X.editions(every, SINCE, 3);
  return txn.uid("mbse.Expressions.SystemVerilog.Constraints.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
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

/** A helper container's nodes, none where it is absent: every helper it holds is a container's. */
function nodes(value: unknown): readonly F.Node[] {
  return (value ?? []) as readonly F.Node[];
}

/** A node's checks, and its helpers' in turn: a distribution item's operator, one of `OPERATORS`, and mbse-programs'
 * checks of it; and the family's helpers' (a loop variable's spelling), which `Expressions.problems` reads. */
export function problems(node: F.Node): string[] {
  const { kind, attributes } = node;
  const found: string[] = [];
  if (kind === "distitem") {
    const operator = attributes.get("operator") ?? null;
    if (operator !== null && !OPERATORS.includes(operator)) found.push(`DistItem.operator cannot be ${repr(operator)}`);
    if ((operator === null) !== ((node.subterms.get("weight") ?? null) === null)) {
      found.push("a DistItem has both an operator and a weight, or neither");
    } else if ((node.subterms.get("value") ?? null) === null && operator !== ":/") {
      found.push("a default DistItem weighs its values with :/");
    }
  } else {
    found.push(...X.problems(new F.Node(kind, attributes, node.subterms, node.many, new Map())));
  }
  for (const value of node.helpers.values()) for (const inner of nodes(value)) found.push(...problems(inner));
  return found;
}

function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

/** The names a loop binds: its variables' spellings, but a dimension it skips. */
export function loopVariables(record: any): ReadonlySet<string> {
  const variables = nodes(F.node(FOREACHCONSTRAINT, record).helpers.get("variables"));
  return new Set(variables.filter((v) => v.kind === "identifier" && v.attributes.has("spelling"))
    .map((v) => v.attributes.get("spelling") as string));
}

/** What a loop's array and its body have bound: its variables, within its body alone (18.5.8.1). */
function foreachScopes(record: any): ReadonlySet<string>[] {
  return [new Set(), loopVariables(record)];
}

/** How the framework reads its own kinds. */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, optional: readonly string[] = []) =>
    new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), optional });
  return {
    [CONSTRAINTBLOCK]: application(CONSTRAINTBLOCK),
    [EXPRESSIONCONSTRAINT]: application(EXPRESSIONCONSTRAINT),
    [IMPLICATIONCONSTRAINT]: application(IMPLICATIONCONSTRAINT),
    [CONDITIONALCONSTRAINT]: application(CONDITIONALCONSTRAINT, ["alternative"]),
    [FOREACHCONSTRAINT]: new F.Kind(F.BINDING, { signature: new FD.Opaque(), scopes: foreachScopes,
      check: check(FOREACHCONSTRAINT) }),
    [SOLVEBEFORECONSTRAINT]: application(SOLVEBEFORECONSTRAINT),
    [DISABLESOFTCONSTRAINT]: application(DISABLESOFTCONSTRAINT),
    [UNIQUECONSTRAINT]: application(UNIQUECONSTRAINT),
    [DISTEXPRESSION]: application(DISTEXPRESSION, ["items.value", "items.weight"]),
  };
}

/** The dialects of its family whose terms are its subterms, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [X.DIALECT, Types.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Preprocessor.DIALECT];
}

/** The SystemVerilog Constraints dialect: its kinds, as the framework reads them, and the terms of its family's
 * dialects. */
export const DIALECT = new F.Dialect("SystemVerilog.Constraints", kinds(), { domain_of: X.untyped, literal: X.native, reads });
