/**
 * Expressions of the TypeScript Patterns dialect: ECMA-262's binding and assignment patterns, grammars of their own
 * (14.3.3, "Destructuring Binding Patterns"; 13.15.5, "Destructuring Assignment"), as mbse-programs has them (its
 * category `Pattern`): what a function's, an arrow's, a signature's, a function type's and an index signature's
 * parameters bind, and what an assignment's target assigns.
 *
 * It is a dialect of the TypeScript family (the dialects proposal, Retrofit's design), named `TypeScript Patterns`
 * (`Terms.dialectName`), its tag `typescript_patterns`. Its terms are values of its `Term`,
 * `Expressions.TypeScript.Patterns.Term`, the branch `typescript_patterns` of `Expressions.Framework.Term`, which was
 * `TypeScript5`'s `Pattern` union, its 16 branches unchanged, so that a pattern's data, written by branch tags, is as it
 * was. Its own kinds are mbse-programs' (`mbse:mbse-programs/typescript5/src/TypeScript/Syntax.ts`), with its names,
 * lowercased as branch tags, and its properties in source order, each a value object
 * `Expressions.TypeScript.Patterns.<Kind>`: `arraypattern` (its `elements`), `objectpattern` (its `properties`),
 * `assignmentpattern` (a target and its default, `left` and `right`), `restelement` (`...argument`) and
 * `tsparameterproperty` (a constructor's parameter with its modifiers, which only a parameter holds). Its `Term` lists,
 * beside them, the terms a target may be, `TypeScript5`'s, as the user decided ("(b) as you recommended", after
 * typescript-estree's `DestructuringPattern`): `identifier`, `memberexpression`, and an assignment's targets
 * `parenthesizedexpression`, `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion` and `tsnonnullexpression`; an
 * object pattern's `property` and an array pattern's hole, `elision`; and invalid syntax, `error` and `missing`.
 * `TypeScript5`'s `Term` lists `arraypattern`, `objectpattern` and `assignmentpattern` too, as typescript-estree's
 * expressions hold them (a `property`'s value, where an object pattern holds it).
 *
 * A pattern binds through what holds it (the dialects proposal, Retrofit's design, the binders): a function's
 * parameters within it, as its kind's scopes say; none of its kinds refines `Let`. `bindingNames` gives the names a
 * pattern binds. Within an assignment's target, a name is a reference to what it assigns.
 *
 * The versions of TypeScript 5 it covers are data, which `define` writes, as `TypeScript5`'s are: TypeScript 5.0 to 5.9,
 * each with its kinds, every one older than 5.0 (`SINCE` is empty). `DIALECT` reads its kinds and its family's other
 * dialects' terms (`reads`). `Text` writes its kinds as TypeScript source, as the family's printer
 * (`TypeScript5.Text.ToText`) dispatches them to it. Its terms are written through the builders (mbse-basis [PRI-019:
 * fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `(p) => p.restelement((r) =>
 * r.argument((a) => a.identifier((i) => i.name("rest"))))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as TypeScriptRegExp from "../RegExp/Expressions.js";
import * as Family from "../TypeScript5/Domains.js";
import * as Nodes from "../TypeScript5/Nodes.js";
import * as TypeScript5 from "../TypeScript5/Expressions.js";
import * as TypeScriptTypes from "../Types/Expressions.js";

export const ARRAYPATTERN = "arraypattern";
export const OBJECTPATTERN = "objectpattern";
export const ASSIGNMENTPATTERN = "assignmentpattern";
export const RESTELEMENT = "restelement";
export const TSPARAMETERPROPERTY = "tsparameterproperty";

/** Its own kinds, in its `Term`'s order: ECMA-262's four patterns, and TypeScript's parameter property, which its `Term`
 * lists after `TypeScript5`'s terms. */
export const TAGS: readonly string[] = [ARRAYPATTERN, OBJECTPATTERN, ASSIGNMENTPATTERN, RESTELEMENT, TSPARAMETERPROPERTY];

/** The terms of `TypeScript5` its `Term` lists, between its patterns and `tsparameterproperty`: what a target may be. */
export const TERMS: readonly string[] = ["identifier", "memberexpression", "parenthesizedexpression", "tsasexpression",
  "tssatisfiesexpression", "tstypeassertion", "tsnonnullexpression", "property", "elision"];

/** Its own helpers: none, a pattern's decorators and annotation being `TypeScript5`'s. */
export const HELPERS: readonly string[] = [];

/** The version each of its kinds arrived in: none, every kind being older than TypeScript 5.0. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/** The names a pattern binds, a term's or a `Node`'s (`Nodes.bindingNames`): an identifier's, and those within an
 * array, an object, a default, a rest or a parameter property; a member, or any other target, binds none. */
export const bindingNames = Nodes.bindingNames;

/** The schemas of `TypeScript5` it names, created where its install has not run. */
const NAMED: readonly string[] = ["Identifier", "MemberExpression", "ParenthesizedExpression", "TSAsExpression",
  "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression", "Property", "Elision", "Decorator", "TSTypeAnnotation"];

/**
 * TypeScript Patterns' union of its kinds, added to the framework's terms as the branch `typescript_patterns`, its own
 * kinds, and its dialect's schema, whose singleton is `Expressions.TypeScript.Patterns`: run after `Framework.install`,
 * in a transaction of its own, before or after its family's other installs; run again, it writes nothing.
 * `TypeScript5`'s union, the terms a target may be and the helpers a pattern holds are named, created where its install
 * has not run. Its holder, `Expressions.TypeScript.Patterns.Expression`, refines `Expressions.Framework.Expression`,
 * its `root` narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.TypeScript.Patterns/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject,
      // `TypeScript5`'s union, terms and helpers, by name: its install's, created here where it has not run
      Expressions: S.OfUnion, ...Object.fromEntries(NAMED.map((name) => [name, S.OfObject])),
      ArrayPattern: S.OfObject, ObjectPattern: S.OfObject, AssignmentPattern: S.OfObject,
      RestElement: S.OfObject, TSParameterProperty: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.TypeScript.Patterns`, a branch of the framework's kind union of
      // dialects
      (_: any) => _.Dialect.name("Expressions.TypeScript.Patterns.Dialect").ref(true).singleton("Expressions.TypeScript.Patterns").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("typescript_patterns").schema([_.Dialect])]),
      // its union of its kinds: its patterns, the terms a target may be, a parameter property, and invalid syntax
      (_: any) => _.Term.name("Expressions.TypeScript.Patterns.Term").branches([
        (t: any) => t.name("arraypattern").schema([_.ArrayPattern]),
        (t: any) => t.name("objectpattern").schema([_.ObjectPattern]),
        (t: any) => t.name("assignmentpattern").schema([_.AssignmentPattern]),
        (t: any) => t.name("restelement").schema([_.RestElement]),
        (t: any) => t.name("identifier").schema([_.Identifier]),
        (t: any) => t.name("memberexpression").schema([_.MemberExpression]),
        (t: any) => t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
        (t: any) => t.name("tsasexpression").schema([_.TSAsExpression]),
        (t: any) => t.name("tssatisfiesexpression").schema([_.TSSatisfiesExpression]),
        (t: any) => t.name("tstypeassertion").schema([_.TSTypeAssertion]),
        (t: any) => t.name("tsnonnullexpression").schema([_.TSNonNullExpression]),
        (t: any) => t.name("property").schema([_.Property]),
        (t: any) => t.name("elision").schema([_.Elision]),
        (t: any) => t.name("tsparameterproperty").schema([_.TSParameterProperty]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Expressions.name("Expressions.TypeScript.TypeScript5.Term"),
      ...NAMED.map((name) => (_: any) => _[name].name(`Expressions.TypeScript.TypeScript5.${name}`)),
      // its kinds
      (_: any) => _.ArrayPattern.name("Expressions.TypeScript.Patterns.ArrayPattern").properties({
        decorators: many(_.Decorator), elements: many(_.Term), optional: S.OfBool,
        typeAnnotation: _.TSTypeAnnotation }),
      (_: any) => _.ObjectPattern.name("Expressions.TypeScript.Patterns.ObjectPattern").properties({
        decorators: many(_.Decorator), properties: many(_.Term), optional: S.OfBool,
        typeAnnotation: _.TSTypeAnnotation }),
      (_: any) => _.AssignmentPattern.name("Expressions.TypeScript.Patterns.AssignmentPattern").properties({
        decorators: many(_.Decorator), left: _.Term, optional: S.OfBool,
        typeAnnotation: _.TSTypeAnnotation, right: _.Expressions }),
      (_: any) => _.RestElement.name("Expressions.TypeScript.Patterns.RestElement").properties({
        decorators: many(_.Decorator), argument: _.Term, optional: S.OfBool,
        typeAnnotation: _.TSTypeAnnotation, value: _.AssignmentPattern }),
      (_: any) => _.TSParameterProperty.name("Expressions.TypeScript.Patterns.TSParameterProperty").properties({
        decorators: many(_.Decorator), accessibility: S.OfStr, static: S.OfBool, override: S.OfBool,
        readonly: S.OfBool, parameter: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.TypeScript.Patterns.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("typescript_patterns").schema([_.Term])]),
    ])]))]);
}

/**
 * TypeScript Patterns' dialect as data: the singleton `Expressions.TypeScript.Patterns` and the versions of TypeScript
 * 5 it covers, by their published names (`standards`, through `Expressions.Framework.Covers`), TypeScript 5.0 to 5.9,
 * each with its body, its version and its kinds, every one in each. Run after `install`, in a transaction of its own;
 * run again, it writes nothing. Its frame binds the dialect (`dialect`) and each version by its name spelled as an
 * identifier (`TypeScript_5_0`).
 */
export function define(txn: any): any {
  const OWN = txn.Expressions.TypeScript.Patterns;
  const Standard = txn.Expressions.Framework.Standard;
  const every = (OWN.Term.as_schema().branches as { name: string; schema: unknown }[])
    .filter((b) => TAGS.includes(b.name)).map((b) => b.schema);
  const versions = Array.from({ length: 10 }, (_, minor) => `TypeScript_5_${minor}`);
  return txn.uid("mbse.Expressions.TypeScript.Patterns.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, ...Object.fromEntries(versions.map((version) => [version, Standard])) })
    .spec([
      (_: any) => _.dialect.standards(Object.fromEntries(versions.map((version, minor) => [
        `TypeScript 5.${minor}`, (e: any) => e.standard(_[version])]))),
      ...versions.map((version, minor) => (_: any) => _[version].bodies(["com.microsoft"]).revision(
        (r: any) => r.version(`5.${minor}`)).kinds(every)),
    ])]))]);
}

// --- Its kinds, as the framework reads them ---

function application(tag: string): F.Kind {
  return new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: Nodes.check(tag), scopes: Nodes.scopes(tag),
    optional: ["*.constraint", "*.default"] });
}

/** The dialects whose terms its positions hold, read when first needed: `TypeScript5`, whose terms a target may be and a
 * default is, and `TypeScript Types`, a pattern's annotation; and `TypeScript RegExp`, as its family's dialects read one
 * another, though no pattern holds a regular expression. */
function reads(): readonly F.Dialect[] {
  return [TypeScript5.DIALECT, TypeScriptTypes.DIALECT, TypeScriptRegExp.DIALECT];
}

/** The TypeScript Patterns dialect: its kinds, as the framework reads them, and its family's other dialects' terms. */
export const DIALECT = new F.Dialect("TypeScript.Patterns", Object.fromEntries(TAGS.map((tag) => [tag, application(tag)])),
  { domain_of: Family.of, reads });
