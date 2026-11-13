/**
 * Expressions of the TypeScript Types dialect: TypeScript's types, typescript-estree's type nodes, as mbse-programs has
 * them, the sublanguage of type expressions that `as`, `satisfies`, `<T>x`, an annotation, a type argument and a type
 * parameter's constraint and default hold.
 *
 * It is a dialect of the TypeScript family (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "most languages will have a
 * dialect for type expressions"; mbse-basis [CAP-277: TypeScript's types and destructuring patterns as data](mbse:mbse-basis/docs/capabilities/CAP-277.md)), named `TypeScript Types` (`Terms.dialectName`), its tag
 * `typescript_types`. Its terms are values of its `Term`, `Expressions.TypeScript.Types.Term`, the branch
 * `typescript_types` of `Expressions.Framework.Term`, which was `TypeScript5`'s `Type` union, its 45 branches unchanged,
 * so that a type's data, written by branch tags, is as it was. Its own kinds are mbse-programs' 37 type nodes
 * (`mbse:mbse-programs/typescript5/src/TypeScript/Syntax.ts`), typescript-estree's 36 and parentheses, with
 * mbse-programs' names, lowercased as branch tags, and its properties in source order, each a value object
 * `Expressions.TypeScript.Types.<Kind>`: the keywords (`tsanykeyword` ... `tsintrinsickeyword`, and `tsthistype`),
 * `tsqualifiedname`, `tstypereference`, `tsparenthesizedtype`, `tsliteraltype`, `tstemplateliteraltype`, `tsarraytype`,
 * `tstupletype`, `tsnamedtuplemember`, `tsoptionaltype`, `tsresttype`, `tsuniontype`, `tsintersectiontype`,
 * `tsfunctiontype`, `tsconstructortype`, `tstypeliteral`, `tsmappedtype`, `tsindexedaccesstype`, `tstypeoperator`,
 * `tstypequery`, `tsimporttype`, `tsconditionaltype`, `tsinfertype` and `tstypepredicate`. Its `Term` lists, beside
 * them, the six terms a type holds, `TypeScript5`'s, as the user decided their listing ("(b) as you recommended"):
 * `identifier` and `thisexpression` for an entity name, `literal`, `unaryexpression` and `templateliteral` for a literal
 * type, and `objectexpression` for an import type's options; and invalid syntax, `error` and `missing`.
 *
 * Its helpers, those only its kinds hold: an object type's members, the union `Expressions.TypeScript.Types.TypeElement`
 * of its signatures (`tspropertysignature`, `tsmethodsignature`, `tscallsignaturedeclaration`,
 * `tsconstructsignaturedeclaration`, `tsindexsignature`) and of `comment`, as mbse-programs keeps comments among them.
 * An annotation, a type parameter, and the declaration and instantiation of type parameters stay `TypeScript5`'s, as
 * expressions hold them too; a parameter is `TypeScript Patterns`' term.
 *
 * In a type, an identifier names a type, or a value whose type `typeof` reads, which statements a term does not model
 * declare (an interface, an alias, an import): its `DIALECT` reads `identifier` as a reference that is not lexical,
 * never reported unbound *(agent)*. Its binders refine the framework's `Let` (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Binding kinds refine `Let`", "(a)"): `tsmappedtype`, its constraint Let's `value` and its type Let's `body`, binding its `key` in its
 * `nameType` and its `body`; and `tsfunctiontype` and `tsconstructortype`, Let's properties unset, binding their type
 * parameters and parameters within them. A `tsconditionaltype` binds its `infer` declarations within its `trueType` by
 * its scopes, and does not refine `Let` *(agent)*; a signature binds its parameters through the type literal that holds
 * it.
 *
 * The versions of TypeScript 5 it covers are data, which `define` writes, as `TypeScript5`'s are: TypeScript 5.0 to 5.9,
 * each with its kinds, every one older than 5.0 (`SINCE` is empty). `DIALECT` reads its kinds and its family's other
 * dialects' terms (`reads`). `Text` writes its kinds as TypeScript source, as the family's printer
 * (`TypeScript5.Text.ToText`) dispatches them to it. Its terms are written through the builders (mbse-basis [PRI-019:
 * fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `(t) => t.tsarraytype((a) =>
 * a.elementType((e) => e.tsnumberkeyword((k) => k)))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as TypeScriptPatterns from "../Patterns/Expressions.js";
import * as TypeScriptRegExp from "../RegExp/Expressions.js";
import * as Family from "../TypeScript5/Domains.js";
import * as Nodes from "../TypeScript5/Nodes.js";
import * as TypeScript5 from "../TypeScript5/Expressions.js";

/** The kinds written as one word. */
export const KEYWORDS: readonly string[] = ["tsanykeyword", "tsunknownkeyword", "tsnumberkeyword", "tsbigintkeyword",
  "tsbooleankeyword", "tsstringkeyword", "tssymbolkeyword", "tsobjectkeyword", "tsneverkeyword", "tsvoidkeyword",
  "tsundefinedkeyword", "tsnullkeyword", "tsintrinsickeyword", "tsthistype"];

/** Its own kinds, in its `Term`'s order, mbse-programs' 37 type nodes. */
export const TAGS: readonly string[] = [...KEYWORDS, "tsqualifiedname", "tstypereference", "tsparenthesizedtype",
  "tsliteraltype", "tstemplateliteraltype", "tsarraytype", "tstupletype", "tsnamedtuplemember", "tsoptionaltype",
  "tsresttype", "tsuniontype", "tsintersectiontype", "tsfunctiontype", "tsconstructortype", "tstypeliteral",
  "tsmappedtype", "tsindexedaccesstype", "tstypeoperator", "tstypequery", "tsimporttype", "tsconditionaltype",
  "tsinfertype", "tstypepredicate"];

/** The terms of `TypeScript5` its `Term` lists, after its own kinds: what a type holds. */
export const TERMS: readonly string[] = ["identifier", "thisexpression", "literal", "unaryexpression", "templateliteral",
  "objectexpression"];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/typescript5-estree.json`) names them: an object type's members. */
export const HELPERS: readonly string[] = ["TSPropertySignature", "TSMethodSignature", "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration", "TSIndexSignature", "Comment"];

/** The version each of its kinds arrived in: none, every kind being older than TypeScript 5.0. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/** Its kinds' schemas' names under its path, in `TAGS`' order: mbse-programs' names. */
const SCHEMAS: readonly string[] = ["TSAnyKeyword", "TSUnknownKeyword", "TSNumberKeyword", "TSBigIntKeyword",
  "TSBooleanKeyword", "TSStringKeyword", "TSSymbolKeyword", "TSObjectKeyword", "TSNeverKeyword", "TSVoidKeyword",
  "TSUndefinedKeyword", "TSNullKeyword", "TSIntrinsicKeyword", "TSThisType", "TSQualifiedName", "TSTypeReference",
  "TSParenthesizedType", "TSLiteralType", "TSTemplateLiteralType", "TSArrayType", "TSTupleType", "TSNamedTupleMember",
  "TSOptionalType", "TSRestType", "TSUnionType", "TSIntersectionType", "TSFunctionType", "TSConstructorType",
  "TSTypeLiteral", "TSMappedType", "TSIndexedAccessType", "TSTypeOperator", "TSTypeQuery", "TSImportType",
  "TSConditionalType", "TSInferType", "TSTypePredicate"];

/** The schemas of `TypeScript5` it names, created where its install has not run. */
const NAMED: readonly string[] = ["Identifier", "ThisExpression", "Literal", "UnaryExpression", "TemplateLiteral",
  "ObjectExpression", "TemplateElement", "TSTypeAnnotation", "TSTypeParameter", "TSTypeParameterDeclaration",
  "TSTypeParameterInstantiation"];

/**
 * TypeScript Types' union of its kinds, added to the framework's terms as the branch `typescript_types`, its own
 * kinds, the helpers only they hold, and its dialect's schema, whose singleton is `Expressions.TypeScript.Types`: run
 * after `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it
 * writes nothing. `TypeScript5`'s terms and helpers it holds, and `TypeScript Patterns`' `Term`, are named, created
 * where their installs have not run. Its holder, `Expressions.TypeScript.Types.Expression`, refines
 * `Expressions.Framework.Expression`, its `root` narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.TypeScript.Types/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject, TypeElement: S.OfUnion,
      // `TypeScript5`'s union, terms and helpers, and `TypeScript Patterns`' union, by name: their installs', created
      // here where they have not run
      Expressions: S.OfUnion, Patterns: S.OfUnion, ...Object.fromEntries(NAMED.map((name) => [name, S.OfObject])),
      Comment: S.OfObject, TSPropertySignature: S.OfObject, TSMethodSignature: S.OfObject,
      TSCallSignatureDeclaration: S.OfObject, TSConstructSignatureDeclaration: S.OfObject,
      TSIndexSignature: S.OfObject, ...Object.fromEntries(SCHEMAS.map((name) => [name, S.OfObject])) })
    .spec([
      // its dialect: the singleton `Expressions.TypeScript.Types`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.TypeScript.Types.Dialect").ref(true).singleton("Expressions.TypeScript.Types").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("typescript_types").schema([_.Dialect])]),
      // its union of its kinds: its own, the terms a type holds, and invalid syntax
      (_: any) => _.Term.name("Expressions.TypeScript.Types.Term").branches([
        ...TAGS.map((tag, i) => (t: any) => t.name(tag).schema([_[SCHEMAS[i] as string]])),
        ...TERMS.map((tag, i) => (t: any) => t.name(tag).schema([_[NAMED[i] as string]])),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Expressions.name("Expressions.TypeScript.TypeScript5.Term"),
      (_: any) => _.Patterns.name("Expressions.TypeScript.Patterns.Term"),
      ...NAMED.map((name) => (_: any) => _[name].name(`Expressions.TypeScript.TypeScript5.${name}`)),
      // an object type's members (typescript-estree's `TypeElement`), comments among them as mbse-programs keeps them
      (_: any) => _.TypeElement.name("Expressions.TypeScript.Types.TypeElement").branches([
        (t: any) => t.name("tspropertysignature").schema([_.TSPropertySignature]),
        (t: any) => t.name("tsmethodsignature").schema([_.TSMethodSignature]),
        (t: any) => t.name("tscallsignaturedeclaration").schema([_.TSCallSignatureDeclaration]),
        (t: any) => t.name("tsconstructsignaturedeclaration").schema([_.TSConstructSignatureDeclaration]),
        (t: any) => t.name("tsindexsignature").schema([_.TSIndexSignature]),
        (t: any) => t.name("comment").schema([_.Comment]),
      ]),
      (_: any) => _.Comment.name("Expressions.TypeScript.Types.Comment").properties({
          block: S.OfBool, text: S.OfStr, trailing: S.OfBool}),
      (_: any) => _.TSPropertySignature.name("Expressions.TypeScript.Types.TSPropertySignature").properties({
          accessibility: S.OfStr, static: S.OfBool, readonly: S.OfBool, computed: S.OfBool,
          key: _.Expressions, optional: S.OfBool, typeAnnotation: _.TSTypeAnnotation}),
      (_: any) => _.TSMethodSignature.name("Expressions.TypeScript.Types.TSMethodSignature").properties({
          accessibility: S.OfStr, static: S.OfBool, readonly: S.OfBool, methodKind: S.OfStr,
          computed: S.OfBool, key: _.Expressions, optional: S.OfBool,
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Patterns),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSCallSignatureDeclaration.name("Expressions.TypeScript.Types.TSCallSignatureDeclaration").properties({
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Patterns),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSConstructSignatureDeclaration.name("Expressions.TypeScript.Types.TSConstructSignatureDeclaration").properties({
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Patterns),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSIndexSignature.name("Expressions.TypeScript.Types.TSIndexSignature").properties({
          accessibility: S.OfStr, static: S.OfBool, readonly: S.OfBool, parameters: many(_.Patterns),
          typeAnnotation: _.TSTypeAnnotation}),
      // its kinds: TypeScript's type nodes
      (_: any) => _.TSAnyKeyword.name("Expressions.TypeScript.Types.TSAnyKeyword"),
      (_: any) => _.TSUnknownKeyword.name("Expressions.TypeScript.Types.TSUnknownKeyword"),
      (_: any) => _.TSNumberKeyword.name("Expressions.TypeScript.Types.TSNumberKeyword"),
      (_: any) => _.TSBigIntKeyword.name("Expressions.TypeScript.Types.TSBigIntKeyword"),
      (_: any) => _.TSBooleanKeyword.name("Expressions.TypeScript.Types.TSBooleanKeyword"),
      (_: any) => _.TSStringKeyword.name("Expressions.TypeScript.Types.TSStringKeyword"),
      (_: any) => _.TSSymbolKeyword.name("Expressions.TypeScript.Types.TSSymbolKeyword"),
      (_: any) => _.TSObjectKeyword.name("Expressions.TypeScript.Types.TSObjectKeyword"),
      (_: any) => _.TSNeverKeyword.name("Expressions.TypeScript.Types.TSNeverKeyword"),
      (_: any) => _.TSVoidKeyword.name("Expressions.TypeScript.Types.TSVoidKeyword"),
      (_: any) => _.TSUndefinedKeyword.name("Expressions.TypeScript.Types.TSUndefinedKeyword"),
      (_: any) => _.TSNullKeyword.name("Expressions.TypeScript.Types.TSNullKeyword"),
      (_: any) => _.TSIntrinsicKeyword.name("Expressions.TypeScript.Types.TSIntrinsicKeyword"),
      (_: any) => _.TSThisType.name("Expressions.TypeScript.Types.TSThisType"),
      (_: any) => _.TSQualifiedName.name("Expressions.TypeScript.Types.TSQualifiedName").properties({
          left: _.Term, right: _.Identifier}),
      (_: any) => _.TSTypeReference.name("Expressions.TypeScript.Types.TSTypeReference").properties({
          typeName: _.Term, typeArguments: _.TSTypeParameterInstantiation}),
      (_: any) => _.TSParenthesizedType.name("Expressions.TypeScript.Types.TSParenthesizedType").properties({
          typeAnnotation: _.Term}),
      (_: any) => _.TSLiteralType.name("Expressions.TypeScript.Types.TSLiteralType").properties({literal: _.Term}),
      (_: any) => _.TSTemplateLiteralType.name("Expressions.TypeScript.Types.TSTemplateLiteralType").properties({
          quasis: many(_.TemplateElement), types: many(_.Term)}),
      (_: any) => _.TSArrayType.name("Expressions.TypeScript.Types.TSArrayType").properties({elementType: _.Term}),
      (_: any) => _.TSTupleType.name("Expressions.TypeScript.Types.TSTupleType").properties({
          elementTypes: many(_.Term)}),
      (_: any) => _.TSNamedTupleMember.name("Expressions.TypeScript.Types.TSNamedTupleMember").properties({
          label: _.Identifier, optional: S.OfBool, elementType: _.Term}),
      (_: any) => _.TSOptionalType.name("Expressions.TypeScript.Types.TSOptionalType").properties({
          typeAnnotation: _.Term}),
      (_: any) => _.TSRestType.name("Expressions.TypeScript.Types.TSRestType").properties({typeAnnotation: _.Term}),
      (_: any) => _.TSUnionType.name("Expressions.TypeScript.Types.TSUnionType").properties({types: many(_.Term)}),
      (_: any) => _.TSIntersectionType.name("Expressions.TypeScript.Types.TSIntersectionType").properties({
          types: many(_.Term)}),
      // binders: `Let`, Let's properties first, each unset (`name`, `value`, `body`), its scopes saying what it binds
      (_: any) => _.TSFunctionType.name("Expressions.TypeScript.Types.TSFunctionType").refines([Framework.Let]).properties({
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Patterns),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSConstructorType.name("Expressions.TypeScript.Types.TSConstructorType").refines([Framework.Let]).properties({
          abstract: S.OfBool, typeParameters: _.TSTypeParameterDeclaration, params: many(_.Patterns),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSTypeLiteral.name("Expressions.TypeScript.Types.TSTypeLiteral").properties({
          members: many(_.TypeElement)}),
      // a binder: `Let`, its constraint Let's `value` and its type Let's `body`, Let's `name` unset (its `key` is an
      // `Identifier`), its scopes saying what it binds
      (_: any) => _.TSMappedType.name("Expressions.TypeScript.Types.TSMappedType").refines([Framework.Let]).properties({
          value: _.Term, // its constraint: `K in T`'s `T`
          body: _.Term, // its type: `: V`, absent where it has none
          readonly: S.OfStr, key: _.Identifier, nameType: _.Term, optional: S.OfStr}),
      (_: any) => _.TSIndexedAccessType.name("Expressions.TypeScript.Types.TSIndexedAccessType").properties({
          objectType: _.Term, indexType: _.Term}),
      (_: any) => _.TSTypeOperator.name("Expressions.TypeScript.Types.TSTypeOperator").properties({
          operator: S.OfStr, typeAnnotation: _.Term}),
      (_: any) => _.TSTypeQuery.name("Expressions.TypeScript.Types.TSTypeQuery").properties({
          exprName: _.Term, typeArguments: _.TSTypeParameterInstantiation}),
      (_: any) => _.TSImportType.name("Expressions.TypeScript.Types.TSImportType").properties({
          source: _.Term, options: _.Term, qualifier: _.Term,
          typeArguments: _.TSTypeParameterInstantiation}),
      (_: any) => _.TSConditionalType.name("Expressions.TypeScript.Types.TSConditionalType").properties({
          checkType: _.Term, extendsType: _.Term, trueType: _.Term, falseType: _.Term}),
      (_: any) => _.TSInferType.name("Expressions.TypeScript.Types.TSInferType").properties({
          typeParameter: _.TSTypeParameter}),
      (_: any) => _.TSTypePredicate.name("Expressions.TypeScript.Types.TSTypePredicate").properties({
          asserts: S.OfBool, parameterName: _.Term, typeAnnotation: _.TSTypeAnnotation}),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.TypeScript.Types.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("typescript_types").schema([_.Term])]),
    ])]))]);
}

/**
 * TypeScript Types' dialect as data: the singleton `Expressions.TypeScript.Types` and the versions of TypeScript 5 it
 * covers, by their published names (`standards`, through `Expressions.Framework.Covers`), TypeScript 5.0 to 5.9, each
 * with its body, its version and its kinds, every one in each. Run after `install`, in a transaction of its own; run
 * again, it writes nothing. Its frame binds the dialect (`dialect`) and each version by its name spelled as an
 * identifier (`TypeScript_5_0`).
 */
export function define(txn: any): any {
  const OWN = txn.Expressions.TypeScript.Types;
  const Standard = txn.Expressions.Framework.Standard;
  const every = (OWN.Term.as_schema().branches as { name: string; schema: unknown }[])
    .filter((b) => TAGS.includes(b.name)).map((b) => b.schema);
  const versions = Array.from({ length: 10 }, (_, minor) => `TypeScript_5_${minor}`);
  return txn.uid("mbse.Expressions.TypeScript.Types.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, ...Object.fromEntries(versions.map((version) => [version, Standard])) })
    .spec([
      (_: any) => _.dialect.standards(Object.fromEntries(versions.map((version, minor) => [
        `TypeScript 5.${minor}`, (e: any) => e.standard(_[version])]))),
      ...versions.map((version, minor) => (_: any) => _[version].bodies(["com.microsoft"]).revision(
        (r: any) => r.version(`5.${minor}`)).kinds(every)),
    ])]))]);
}

// --- Its kinds, as the framework reads them ---

/** A type parameter's subterms, which may be empty at any depth: its constraint and its default. */
const OPTIONAL: readonly string[] = ["*.constraint", "*.default"];

function application(tag: string, optional: readonly string[] = []): F.Kind {
  return new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: Nodes.check(tag), scopes: Nodes.scopes(tag),
    optional: [...optional, ...OPTIONAL] });
}

const KINDS: Record<string, F.Kind> = Object.fromEntries(TAGS.map((tag) => [tag, application(tag)]));
Object.assign(KINDS, {
  tsfunctiontype: application("tsfunctiontype", ["value", "body"]),
  tsconstructortype: application("tsconstructortype", ["value", "body"]),
  tsmappedtype: application("tsmappedtype", ["body", "nameType"]),
  tstypeoperator: application("tstypeoperator", ["typeAnnotation"]),
  tsimporttype: application("tsimporttype", ["options", "qualifier"]),
  // in a type, an identifier names a type, which statements declare: a reference, never reported unbound
  identifier: new F.Kind(F.REFERENCE, { required: ["name"], lexical: false, check: Nodes.check("identifier") }),
});

/** The dialects whose terms are its subterms, read when first needed: `TypeScript5`, whose terms a type holds, and
 * `TypeScript Patterns`, a function type's and a signature's parameters; and `TypeScript RegExp`, as its family's
 * dialects read one another, though no type holds a regular expression. */
function reads(): readonly F.Dialect[] {
  return [TypeScript5.DIALECT, TypeScriptPatterns.DIALECT, TypeScriptRegExp.DIALECT];
}

/** The TypeScript Types dialect: its kinds, as the framework reads them, an identifier among them, and its family's
 * other dialects' terms. */
export const DIALECT = new F.Dialect("TypeScript.Types", KINDS, { domain_of: Family.of, reads });
