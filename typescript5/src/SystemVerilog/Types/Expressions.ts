/**
 * Expressions of the SystemVerilog Types dialect: SystemVerilog's data types (IEEE 1800 clauses 6 and 7), as
 * mbse-programs has them, the sublanguage of type expressions a cast, a system call's arguments (`$bits(int)`), an
 * assignment pattern's type and a type reference hold.
 *
 * It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6: "most languages will have a
 * dialect for type expressions"), named `SystemVerilog Types` (`Terms.dialect_name`), its tag `systemverilog_types`. Its
 * terms are values of its `Term`, `Expressions.SystemVerilog.Types.Term`, the branch `systemverilog_types` of
 * `Expressions.Framework.Term`; a subterm that may be a type or an expression (mbse-programs' `DataType | Expression`)
 * holds it, so it lists, besides its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which that
 * dialect's install adds ("(b)"). Its own kinds are mbse-programs' data types (`mbse:mbse-programs/python3/mbse/Programs/
 * Verilog/Syntax.py`), with mbse-programs' names, lowercased as branch tags, and its properties in source order, each a
 * value object `Expressions.SystemVerilog.Types.<Kind>`:
 *
 * - `integervectortype` (`bit`, `logic`, `reg`, with a signing and packed dimensions), `integeratomtype` (`byte`,
 *   `shortint`, `int`, `longint`, `integer`, `time`, with a signing), `nonintegertype` (`shortreal`, `real`, `realtime`),
 *   `keywordtype` (`string`, `chandle`, `event`, `void`, and an assertion port's `sequence`, `property`, `untyped`);
 * - `namedtype` (a typedef's or a type parameter's name, with packed dimensions), `virtualinterfacetype`, `implicittype`
 *   (a signing and dimensions alone: `signed'(x)`'s), `typereference` (`type(x)`);
 * - `structtype` (`struct` or `union`, `packed`, `tagged` or `soft`, with a signing and dimensions) and `enumtype`, their
 *   members data (Q7): helpers, `structmember` (each its type and its `variabledeclarator`s) and `enummember`.
 *
 * Its helpers: those members, a declarator, and the `Dimension` union, `rangedimension` (`[7:0]`), `sizedimension`
 * (`[8]`), `unsizeddimension` (`[]`), `associativedimension` (`[int]`, `[*]`) and `queuedimension` (`[$]`, `[$:8]`), whose
 * bounds are `Expressions`' terms. A name is `Expressions`' `Name`, an identifier its `Identifier`, and an attribute its
 * `AttributeInstance`: the family's helpers, one schema each.
 *
 * The editions it covers are data, which `define` writes: Verilog's and SystemVerilog's, as `Expressions`' are
 * (`Expressions.EDITIONS`), each with the kinds it has (`SINCE`). `DIALECT` reads its kinds and the five other dialects'
 * terms. `Text` writes its kinds as SystemVerilog source, as the family's printer (`Expressions.Text.ToText`) dispatches
 * them to it. Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
 * syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `(t) => t.integeratomtype((a) => a.keyword("int"))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Assertions from "../Assertions/Expressions.js";
import * as Constraints from "../Constraints/Expressions.js";
import * as X from "../Expressions/Expressions.js";
import * as Patterns from "../Patterns/Expressions.js";
import * as Preprocessor from "../Preprocessor/Expressions.js";

const { repr } = Repr;

export const INTEGERVECTORTYPE = "integervectortype";
export const INTEGERATOMTYPE = "integeratomtype";
export const NONINTEGERTYPE = "nonintegertype";
export const KEYWORDTYPE = "keywordtype";
export const NAMEDTYPE = "namedtype";
export const VIRTUALINTERFACETYPE = "virtualinterfacetype";
export const IMPLICITTYPE = "implicittype";
export const STRUCTTYPE = "structtype";
export const ENUMTYPE = "enumtype";
export const TYPEREFERENCE = "typereference";

/** Its own kinds, in its `Term`'s order after `Expressions`' branches. */
export const TAGS: readonly string[] = [INTEGERVECTORTYPE, INTEGERATOMTYPE, NONINTEGERTYPE, KEYWORDTYPE, NAMEDTYPE,
  VIRTUALINTERFACETYPE, IMPLICITTYPE, STRUCTTYPE, ENUMTYPE, TYPEREFERENCE];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/systemverilog-slang.json`) names them. */
export const HELPERS: readonly string[] = ["StructMember", "EnumMember", "VariableDeclarator", "RangeDimension", "SizeDimension", "UnsizedDimension",
  "AssociativeDimension", "QueueDimension"];

/** The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`
 * (`sv()`, IEEE 1800-2005); a kind not listed is in every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map([NAMEDTYPE, VIRTUALINTERFACETYPE, STRUCTTYPE, ENUMTYPE,
  TYPEREFERENCE].map((tag) => [tag, 3]));

const SIGNINGS = ["signed", "unsigned"];

/** The attributes that are one of a few choices, by kind: mbse-programs' kind, and each attribute's choices. */
const CHOICES: ReadonlyMap<string, readonly [string, Readonly<Record<string, readonly string[]>>]> = new Map([
  [INTEGERVECTORTYPE, ["IntegerVectorType", { keyword: ["bit", "logic", "reg"], signing: SIGNINGS }] as const],
  [INTEGERATOMTYPE, ["IntegerAtomType", { keyword: ["byte", "shortint", "int", "longint", "integer", "time"],
    signing: SIGNINGS }] as const],
  [NONINTEGERTYPE, ["NonIntegerType", { keyword: ["shortreal", "real", "realtime"] }] as const],
  [KEYWORDTYPE, ["KeywordType", { keyword: ["string", "chandle", "event", "void", "sequence", "property", "untyped"] }] as const],
  [IMPLICITTYPE, ["ImplicitType", { signing: SIGNINGS }] as const],
  [STRUCTTYPE, ["StructType", { keyword: ["struct", "union"], qualifier: ["tagged", "soft"], signing: SIGNINGS }] as const],
  ["structmember", ["StructMember", { random: ["rand", "randc"] }] as const],
]);

/** SystemVerilog Types' union of its kinds, added to the framework's terms as the branch `systemverilog_types`, its own
 * kinds, the helpers they hold, and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Types`: run
 * after `Framework.install`, in a transaction of its own, before or after the other SystemVerilog dialects' installs;
 * run again, it writes nothing. `Expressions.SystemVerilog.Expressions.Term`, which its bounds hold, and that dialect's
 * helpers are named, created where its install has not run; that install adds its branches to this `Term`. Its holder,
 * `Expressions.SystemVerilog.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.SystemVerilog.Types/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
      .symbols({Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
                Expression: S.OfObject, Dimension: S.OfUnion,
                // `Expressions`' union and helpers, by name: its install's, created here where it has not run
                ExpressionsTerm: S.OfUnion, Name: S.OfUnion, Identifier: S.OfObject,
                AttributeInstance: S.OfObject,
                IntegerVectorType: S.OfObject, IntegerAtomType: S.OfObject, NonIntegerType: S.OfObject,
                KeywordType: S.OfObject, NamedType: S.OfObject, VirtualInterfaceType: S.OfObject,
                ImplicitType: S.OfObject, StructType: S.OfObject, StructMember: S.OfObject,
                EnumType: S.OfObject, EnumMember: S.OfObject, TypeReference: S.OfObject,
                VariableDeclarator: S.OfObject, RangeDimension: S.OfObject, SizeDimension: S.OfObject,
                UnsizedDimension: S.OfObject, AssociativeDimension: S.OfObject, QueueDimension: S.OfObject})
      .spec([
          // its dialect: the singleton `Expressions.SystemVerilog.Types`, a branch of the framework's kind union of dialects
          (_: any) => _.Dialect.name("Expressions.SystemVerilog.Types.Dialect").ref(true).singleton("Expressions.SystemVerilog.Types").adjacencies({
              domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
              operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
              standards: (a: any) => a.relation([Framework.Covers]).me("dialect")}),
          (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
              (t: any) => t.name("systemverilog_types").schema([_.Dialect])]),
          // its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
          (_: any) => _.Term.name("Expressions.SystemVerilog.Types.Term").branches([
              (t: any) => t.name("integervectortype").schema([_.IntegerVectorType]),
              (t: any) => t.name("integeratomtype").schema([_.IntegerAtomType]),
              (t: any) => t.name("nonintegertype").schema([_.NonIntegerType]),
              (t: any) => t.name("keywordtype").schema([_.KeywordType]),
              (t: any) => t.name("namedtype").schema([_.NamedType]),
              (t: any) => t.name("virtualinterfacetype").schema([_.VirtualInterfaceType]),
              (t: any) => t.name("implicittype").schema([_.ImplicitType]),
              (t: any) => t.name("structtype").schema([_.StructType]),
              (t: any) => t.name("enumtype").schema([_.EnumType]),
              (t: any) => t.name("typereference").schema([_.TypeReference]),
          ]),
          (_: any) => _.ExpressionsTerm.name("Expressions.SystemVerilog.Expressions.Term"),
          (_: any) => _.Name.name("Expressions.SystemVerilog.Expressions.Name"),
          (_: any) => _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier"),
          (_: any) => _.AttributeInstance.name("Expressions.SystemVerilog.Expressions.AttributeInstance"),
          // dimensions (7.4), their bounds `Expressions`' terms
          (_: any) => _.Dimension.name("Expressions.SystemVerilog.Types.Dimension").branches([
              (t: any) => t.name("rangedimension").schema([_.RangeDimension]),
              (t: any) => t.name("sizedimension").schema([_.SizeDimension]),
              (t: any) => t.name("unsizeddimension").schema([_.UnsizedDimension]),
              (t: any) => t.name("associativedimension").schema([_.AssociativeDimension]),
              (t: any) => t.name("queuedimension").schema([_.QueueDimension]),
          ]),
          (_: any) => _.RangeDimension.name("Expressions.SystemVerilog.Types.RangeDimension").properties({
              left: _.ExpressionsTerm, right: _.ExpressionsTerm}),
          (_: any) => _.SizeDimension.name("Expressions.SystemVerilog.Types.SizeDimension").properties({
              size: _.ExpressionsTerm}),
          (_: any) => _.UnsizedDimension.name("Expressions.SystemVerilog.Types.UnsizedDimension"),
          (_: any) => _.AssociativeDimension.name("Expressions.SystemVerilog.Types.AssociativeDimension").properties({
              type: _.Term}),  // absent: `[*]`
          (_: any) => _.QueueDimension.name("Expressions.SystemVerilog.Types.QueueDimension").properties({
              bound: _.ExpressionsTerm}),  // absent: `[$]`
          // data types (6)
          (_: any) => _.IntegerVectorType.name("Expressions.SystemVerilog.Types.IntegerVectorType").properties({
              keyword: S.OfStr, signing: S.OfStr, dimensions: many(_.Dimension)}),
          (_: any) => _.IntegerAtomType.name("Expressions.SystemVerilog.Types.IntegerAtomType").properties({
              keyword: S.OfStr, signing: S.OfStr}),
          (_: any) => _.NonIntegerType.name("Expressions.SystemVerilog.Types.NonIntegerType").properties({
              keyword: S.OfStr}),
          (_: any) => _.KeywordType.name("Expressions.SystemVerilog.Types.KeywordType").properties({
              keyword: S.OfStr}),
          (_: any) => _.NamedType.name("Expressions.SystemVerilog.Types.NamedType").properties({
              name: _.Name, dimensions: many(_.Dimension)}),
          (_: any) => _.VirtualInterfaceType.name("Expressions.SystemVerilog.Types.VirtualInterfaceType").properties({
              interface_keyword: S.OfBool, interface: _.Identifier, parameters: many(_.Term),
              modport: _.Identifier}),
          (_: any) => _.ImplicitType.name("Expressions.SystemVerilog.Types.ImplicitType").properties({
              signing: S.OfStr, dimensions: many(_.Dimension)}),
          // structures, unions and enumerations (7.2, 7.3, 6.19), their members data
          (_: any) => _.StructType.name("Expressions.SystemVerilog.Types.StructType").properties({
              keyword: S.OfStr, qualifier: S.OfStr, packed: S.OfBool, signing: S.OfStr,
              members: many(_.StructMember), dimensions: many(_.Dimension)}),
          (_: any) => _.StructMember.name("Expressions.SystemVerilog.Types.StructMember").properties({
              attributes: many(_.AttributeInstance), random: S.OfStr, type: _.Term,
              declarators: many(_.VariableDeclarator)}),
          (_: any) => _.EnumType.name("Expressions.SystemVerilog.Types.EnumType").properties({
              base: _.Term, members: many(_.EnumMember), dimensions: many(_.Dimension)}),
          (_: any) => _.EnumMember.name("Expressions.SystemVerilog.Types.EnumMember").properties({
              name: _.Identifier, left: _.ExpressionsTerm, right: _.ExpressionsTerm,
              value: _.ExpressionsTerm}),
          (_: any) => _.VariableDeclarator.name("Expressions.SystemVerilog.Types.VariableDeclarator").properties({
              name: _.Identifier, dimensions: many(_.Dimension), value: _.ExpressionsTerm}),
          (_: any) => _.TypeReference.name("Expressions.SystemVerilog.Types.TypeReference").properties({
              operand: _.Term}),
          // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
          // narrowed to its `Term`
          (_: any) => _.Expression.name("Expressions.SystemVerilog.Types.Expression").ref(true).refines([Framework.Expression]).properties({
              root: _.Term}),
          (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([  // a branch added: schema extension
              (t: any) => t.name("systemverilog_types").schema([_.Term])]),
      ])]))]);
}

/** SystemVerilog Types' dialect as data: the singleton `Expressions.SystemVerilog.Types` owning the editions it covers,
 * by designation (`standards`), Verilog's IEEE Std 1364-1995, 2001 and 2005 and SystemVerilog's IEEE Std 1800-2005 to
 * 2023, each with its formal reference's parts, its common name and its own kinds it has (`SINCE`). Run after
 * `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and each
 * edition by its common name spelled as an identifier (`SystemVerilog_2023`). */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.SystemVerilog.Types, txn.Expressions.Framework.Standard];
  const every = new Map((OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => [branch.name, branch.schema] as [string, any]));
  const kinds = X.editions(every, SINCE);
  return txn.uid("mbse.Expressions.SystemVerilog.Types.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
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
  return Array.isArray(value) ? value : [value as F.Node];
}

/** A node's checks, and its helpers' in turn: a choice among a few (a keyword, a signing), mbse-programs' checks, and the
 * family's helpers' (an identifier's spelling, invalid syntax), which `Expressions.problems` reads. */
export function problems(node: F.Node): string[] {
  const { kind, attributes } = node;
  const found: string[] = [];
  const choice = CHOICES.get(kind);
  if (choice !== undefined) {
    const [name, choices] = choice;
    for (const [attribute, allowed] of Object.entries(choices)) {
      const value = attributes.get(attribute) ?? null;
      if (value !== null && !allowed.includes(value)) found.push(`${name}.${attribute} cannot be ${repr(value)}`);
    }
  }
  if (kind === STRUCTTYPE && (attributes.get("qualifier") ?? null) !== null && attributes.get("keyword") !== "union") {
    found.push("a StructType with a qualifier is a union");
  }
  if (kind === "enummember" && (node.subterms.get("right") ?? null) !== null && (node.subterms.get("left") ?? null) === null) {
    found.push("an EnumMember with a right has a left");
  }
  if (choice === undefined && kind !== STRUCTTYPE && kind !== "enummember") {
    found.push(...X.problems(new F.Node(kind, attributes, node.subterms, node.many, new Map())));
  }
  for (const value of node.helpers.values()) for (const inner of nodes(value)) found.push(...problems(inner));
  return found;
}

function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

/** The subterms of a type's helpers that may be empty: a queue's bound, an attribute's, a declarator's and an
 * enumeration member's value, an associative array's index type (`[*]`), and an enumeration member's numbers. */
const OPTIONAL: readonly string[] = ["*.bound", "*.value", "dimensions.type", "members.declarators.dimensions.type",
  "members.left", "members.right"];

function kinds(): Record<string, F.Kind> {
  const application = (tag: string, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), ...options,
      optional: [...(options.optional ?? []), ...OPTIONAL] });
  return {
    [INTEGERVECTORTYPE]: application(INTEGERVECTORTYPE, { required: ["keyword"] }),
    [INTEGERATOMTYPE]: application(INTEGERATOMTYPE, { required: ["keyword"] }),
    [NONINTEGERTYPE]: application(NONINTEGERTYPE, { required: ["keyword"] }),
    [KEYWORDTYPE]: application(KEYWORDTYPE, { required: ["keyword"] }),
    [NAMEDTYPE]: application(NAMEDTYPE, { required: ["name"] }),
    [VIRTUALINTERFACETYPE]: application(VIRTUALINTERFACETYPE, { required: ["interface"] }),
    [IMPLICITTYPE]: application(IMPLICITTYPE),
    [STRUCTTYPE]: application(STRUCTTYPE, { required: ["keyword"] }),
    [ENUMTYPE]: application(ENUMTYPE, { optional: ["base"] }),
    [TYPEREFERENCE]: application(TYPEREFERENCE),
  };
}

/** The dialects of its family whose terms are its subterms, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [X.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT];
}

/** The SystemVerilog Types dialect: its kinds, as the framework reads them, and the terms of its family's dialects. */
export const DIALECT = new F.Dialect("SystemVerilog.Types", kinds(), { domain_of: X.untyped, literal: X.native, reads });
