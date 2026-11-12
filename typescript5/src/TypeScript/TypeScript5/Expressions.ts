/**
 * Expressions of the TypeScript5 dialect: every expression of TypeScript 5, 5.0 to 5.9, and the JavaScript it holds, as
 * typescript-estree has them, in mbse-programs' names and shapes, with the sublanguages expressions hold: types,
 * destructuring patterns and JSX.
 *
 * The dialect is complete over TypeScript 5's expression syntax (mbse-basis
 * [CAP-228: the TypeScript5 expression dialect](mbse:mbse-basis/docs/capabilities/CAP-228.md), by
 * [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules). Its terms are values of
 * its `Term`, `Expressions.TypeScript.TypeScript5.Term`, the branch `typescript5` of `Expressions.Framework.Term`, which `install`
 * defines and adds to `Expressions.Framework.Term` by schema extension. Its kinds are named as mbse-programs names them
 * (`mbse:mbse-programs/typescript5/src/TypeScript/Syntax.ts`), which is as typescript-estree names them, lowercased as
 * branch tags (`binaryexpression`, `tsasexpression`), each a value object `Expressions.TypeScript.TypeScript5.<Kind>` with
 * mbse-programs' properties in source order (`isAsync` for estree's `async`, `propertyKind` for its `kind`). A term
 * carries no domain. Its kinds:
 *
 * - Names and literals: `identifier` (`decorators`, `name`, `optional`, `typeAnnotation`, as a parameter has them),
 *   `privateidentifier` (`#name`), `literal` (`Expressions.TypeScript.TypeScript5.Literal`, refining the framework's `literal`,
 *   mbse-basis [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md): a boolean, a number, a
 *   float, a bigint, an int, or a string, with what its text encodes, mbse-basis
 *   [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): `quote`, `base` and `separators`),
 *   `constant`, TypeScript5's own, for what no schema holds (`null`, its `singleton`, and a regular expression, its
 *   `pattern` and `flags` as written and its `regexp`, the `TypeScript RegExp` term they encode, absent where they do
 *   not parse), with its spelling too; `templateliteral` (`quasis`, each a `templateelement`, and
 *   `expressions`), `taggedtemplateexpression`, `thisexpression`, `super`; `parenthesizedexpression`, parentheses written
 *   in the source; `undefined` is an `identifier`, as in TypeScript.
 * - Displays: `arrayexpression`, the framework's `list` (its `elements`, any term: an `elision` for a hole, a
 *   `spreadelement` for `...x`), `objectexpression` (`properties`, each a `property` or a `spreadelement`).
 * - Functions and classes: `functionexpression`, `arrowfunctionexpression`, `classexpression`,
 *   `tsemptybodyfunctionexpression`; a body of statements is not part of the term (the dialects proposal, Decided, 5,
 *   "(i)"): it is absent, and mbse-programs relates its statements to what holds the expression. An arrow whose body is
 *   an expression holds it as its `body`, a term; one whose `body` is absent has a block of statements. Each is a
 *   binder, refining the framework's `Let`, Let's `name` and `value` unset: what it binds, its scopes say.
 * - Operators and access: `metaproperty`, `memberexpression`, `callexpression`, `chainexpression`, `newexpression`,
 *   `importexpression`, `updateexpression`, `unaryexpression`, `awaitexpression`, `binaryexpression`,
 *   `logicalexpression`, `conditionalexpression`, `assignmentexpression`, `sequenceexpression`, `yieldexpression`.
 * - TypeScript's own: `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`, `tsnonnullexpression`,
 *   `tsinstantiationexpression`.
 * - The patterns typescript-estree's expressions hold (`arraypattern`, `objectpattern`, `assignmentpattern`), so that a
 *   `property`'s value holds a pattern where an object pattern holds it: `TypeScript Patterns`' kinds, which its `Term`
 *   lists.
 * - JSX, an extension outside every version, as mbse-programs marks it (`EXTENSIONS`): `jsxelement`, `jsxfragment` and
 *   `jsxemptyexpression`, with their helpers.
 * - The framework's kinds of invalid syntax, `error` and `missing`.
 *
 * Its sublanguages are dialects of their own, of the TypeScript family (the dialects proposal, Decided for stage 6, and
 * its Retrofit's design), whose `Term`s were its `Type` and `Pattern` unions, their branches unchanged:
 * `TypeScript Types` (`Expressions.TypeScript.Types.Term`), TypeScript's type nodes, held by what holds a type (`x as T`,
 * `x satisfies T`, `<T>x`, an annotation, a type argument, a type parameter's constraint and default); and
 * `TypeScript Patterns` (`Expressions.TypeScript.Patterns.Term`), destructuring patterns, held by a function's
 * parameters and an assignment's target. As the user decided ("(b) as you recommended"), one schema is a branch of
 * every union whose positions hold it: a pattern's `Term` lists the terms a target may be, and a type's the terms a type
 * holds. Which terms are allowed where, beyond that, is a constraint. Names that only declare (a type parameter's
 * `name`, a function's `id`) are `Identifier`s, as mbse-programs has them ("yes, stay `Identifier` terms"). The helpers
 * expressions and types hold alike stay its own: an annotation (`TSTypeAnnotation`), a type parameter, and the
 * declaration and instantiation of type parameters. `DIALECT` reads its family's other dialects' terms (`reads`), as
 * each of them reads its own; the framework reads a value of a helper as a `Terms.Part`, and its family's terms, the
 * types and patterns within it, as its arguments. `Nodes` holds what the three dialects read alike: a node's checks,
 * the names a pattern binds (`bindingNames`) and the names each argument has bound.
 *
 * The versions of TypeScript 5 the dialect covers are data, which `define` writes, each owned by its published name,
 * TypeScript 5.0 to 5.9, and holding the kinds it has (`Framework.Standards`): every kind is older than 5.0, so each
 * has all its own, the patterns its `Term` lists being `TypeScript Patterns`', and an extension none. `DIALECT` reads the kinds (`Terms.Dialect`). There are no writers: a TypeScript5
 * term is written through the builders, in a transaction (mbse-basis [PRI-019: fluent builder
 * syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)). `tree(term)` reads a term with its helpers nested, as its
 * printer and its checks read it.
 *
 * Its kinds of domain, the branches of its union `Expressions.TypeScript.TypeScript5.DomainKind`, which `install` adds
 * to the framework's `Expressions.Framework.DomainKind` as the branch `typescript5`, each with the inferred `ordered`:
 * `string` (`OfString`), sequences of UTF-16 code units; and the token `null` (`OfNull`), whose domain has no schema: its
 * value is a `constant`'s.
 *
 * Its domains, each named by TypeScript's type keyword: `define` writes them, owned by the singleton
 * `Expressions.TypeScript.TypeScript5` by name, each but a token's related to its schema, an `OfAny` of the scalar it
 * narrows, which `install` adds (`Expressions.TypeScript.TypeScript5.number`): `boolean` (ISO/IEC 11404's `boolean`),
 * `number` (IEEE 754's `binary64`, rounding ties to even), `bigint` (11404's `integer`: signed, unbounded, raising on
 * overflow), `string` (its own `string`), and the token `null` (its own `null`). `RegExp` is not a domain.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as TypeScriptPatterns from "../Patterns/Expressions.js";
import * as TypeScriptRegExp from "../RegExp/Expressions.js";
import * as TypeScriptTypes from "../Types/Expressions.js";
import * as Domains from "./Domains.js";
import * as Nodes from "./Nodes.js";

const { repr } = Repr;

export const IDENTIFIER = "identifier";
export const PRIVATEIDENTIFIER = "privateidentifier";
export const LITERAL = "literal";
export const CONSTANT = "constant";
export const TEMPLATELITERAL = "templateliteral";
export const TAGGEDTEMPLATEEXPRESSION = "taggedtemplateexpression";
export const THISEXPRESSION = "thisexpression";
export const SUPER = "super";
export const PARENTHESIZEDEXPRESSION = "parenthesizedexpression";
export const ELISION = "elision";
export const SPREADELEMENT = "spreadelement";
export const ARRAYEXPRESSION = "arrayexpression";
export const PROPERTY = "property";
export const OBJECTEXPRESSION = "objectexpression";
export const FUNCTIONEXPRESSION = "functionexpression";
export const ARROWFUNCTIONEXPRESSION = "arrowfunctionexpression";
export const CLASSEXPRESSION = "classexpression";
export const TSEMPTYBODYFUNCTIONEXPRESSION = "tsemptybodyfunctionexpression";
export const METAPROPERTY = "metaproperty";
export const MEMBEREXPRESSION = "memberexpression";
export const CALLEXPRESSION = "callexpression";
export const CHAINEXPRESSION = "chainexpression";
export const NEWEXPRESSION = "newexpression";
export const IMPORTEXPRESSION = "importexpression";
export const UPDATEEXPRESSION = "updateexpression";
export const UNARYEXPRESSION = "unaryexpression";
export const AWAITEXPRESSION = "awaitexpression";
export const BINARYEXPRESSION = "binaryexpression";
export const LOGICALEXPRESSION = "logicalexpression";
export const CONDITIONALEXPRESSION = "conditionalexpression";
export const ASSIGNMENTEXPRESSION = "assignmentexpression";
export const SEQUENCEEXPRESSION = "sequenceexpression";
export const YIELDEXPRESSION = "yieldexpression";
export const TSASEXPRESSION = "tsasexpression";
export const TSSATISFIESEXPRESSION = "tssatisfiesexpression";
export const TSTYPEASSERTION = "tstypeassertion";
export const TSNONNULLEXPRESSION = "tsnonnullexpression";
export const TSINSTANTIATIONEXPRESSION = "tsinstantiationexpression";
export const ARRAYPATTERN = "arraypattern";
export const OBJECTPATTERN = "objectpattern";
export const ASSIGNMENTPATTERN = "assignmentpattern";
export const RESTELEMENT = "restelement";
export const JSXELEMENT = "jsxelement";
export const JSXFRAGMENT = "jsxfragment";
export const JSXEMPTYEXPRESSION = "jsxemptyexpression";

/** JSX, an extension outside every version of TypeScript, which a `.tsx` file accepts (mbse-programs marks it so). */
export const EXTENSIONS: ReadonlySet<string> = new Set([JSXELEMENT, JSXFRAGMENT, JSXEMPTYEXPRESSION]);

/** A string's quotes, as TypeScript writes them. */
export const QUOTES: readonly string[] = Nodes.QUOTES;

/** A regular expression's flags, as ECMAScript 2026 has them. */
export const FLAGS = "dgimsuvy";

/** TypeScript5's union of its kinds, added to the framework's terms as the branch `typescript5`, its own kinds, the
 * helpers they hold, and its dialect's schema, whose singleton is `Expressions.TypeScript.TypeScript5`: run after
 * `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it writes
 * nothing. `TypeScript Types`' and `TypeScript Patterns`' `Term`s, and the patterns its `Term` lists, are named,
 * created where their installs have not run. Its domains' schemas too, each an `OfAny` of the scalar it narrows: its
 * domains `define` writes after it. Its holder, `Expressions.TypeScript.TypeScript5.Expression`, refines
 * `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.TypeScript.TypeScript5/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Kinds: S.OfUnion, DomainKind: S.OfUnion, // Kinds: the framework's
      OfString: S.OfObject, OfNull: S.OfObject,
      boolean: S.OfAny, number: S.OfAny, bigint: S.OfAny, string: S.OfAny,
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      // its family's types and patterns, by name: their installs', created here where they have not run
      Types: S.OfUnion, Patterns: S.OfUnion, ArrayPattern: S.OfObject, ObjectPattern: S.OfObject,
      AssignmentPattern: S.OfObject, RegExp: S.OfUnion,
      JSXTagNameExpression: S.OfUnion, JSXAttributeName: S.OfUnion, JSXAttributeValue: S.OfUnion,
      JSXAttributeItem: S.OfUnion, JSXChild: S.OfUnion, Expression: S.OfObject,
      Identifier: S.OfObject, PrivateIdentifier: S.OfObject, Literal: S.OfObject,
      Constant: S.OfObject, TemplateElement: S.OfObject, TemplateLiteral: S.OfObject,
      TaggedTemplateExpression: S.OfObject, ThisExpression: S.OfObject, Super: S.OfObject,
      ParenthesizedExpression: S.OfObject, Elision: S.OfObject, SpreadElement: S.OfObject,
      Property: S.OfObject, ObjectExpression: S.OfObject, FunctionExpression: S.OfObject,
      ArrowFunctionExpression: S.OfObject, ClassExpression: S.OfObject,
      TSEmptyBodyFunctionExpression: S.OfObject, MetaProperty: S.OfObject,
      MemberExpression: S.OfObject, CallExpression: S.OfObject, ChainExpression: S.OfObject,
      NewExpression: S.OfObject, ImportExpression: S.OfObject, UpdateExpression: S.OfObject,
      UnaryExpression: S.OfObject, AwaitExpression: S.OfObject, BinaryExpression: S.OfObject,
      LogicalExpression: S.OfObject, ConditionalExpression: S.OfObject,
      AssignmentExpression: S.OfObject, SequenceExpression: S.OfObject,
      YieldExpression: S.OfObject, TSAsExpression: S.OfObject, TSSatisfiesExpression: S.OfObject,
      TSTypeAssertion: S.OfObject, TSNonNullExpression: S.OfObject,
      TSInstantiationExpression: S.OfObject, Decorator: S.OfObject, TSClassImplements: S.OfObject,
      TSTypeAnnotation: S.OfObject, TSTypeParameter: S.OfObject,
      TSTypeParameterDeclaration: S.OfObject, TSTypeParameterInstantiation: S.OfObject,
      JSXIdentifier: S.OfObject, JSXNamespacedName: S.OfObject, JSXMemberExpression: S.OfObject,
      JSXEmptyExpression: S.OfObject, JSXExpressionContainer: S.OfObject,
      JSXSpreadChild: S.OfObject, JSXText: S.OfObject, JSXAttribute: S.OfObject,
      JSXSpreadAttribute: S.OfObject, JSXOpeningElement: S.OfObject, JSXClosingElement: S.OfObject,
      JSXElement: S.OfObject, JSXOpeningFragment: S.OfObject, JSXClosingFragment: S.OfObject,
      JSXFragment: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.TypeScript.TypeScript5`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.TypeScript.TypeScript5.Dialect").ref(true).singleton("Expressions.TypeScript.TypeScript5").adjacencies({
          domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
          operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
          standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
          (t: any) => t.name("typescript5").schema([_.Dialect])]),
      // its union of its kinds: its own, the framework's it reuses, the patterns expressions hold, JSX, and
      // invalid syntax
      (_: any) => _.Term.name("Expressions.TypeScript.TypeScript5.Term").branches([
          (t: any) => t.name("identifier").schema([_.Identifier]),
          (t: any) => t.name("privateidentifier").schema([_.PrivateIdentifier]),
          (t: any) => t.name("literal").schema([_.Literal]),
          (t: any) => t.name("constant").schema([_.Constant]),
          (t: any) => t.name("templateliteral").schema([_.TemplateLiteral]),
          (t: any) => t.name("taggedtemplateexpression").schema([_.TaggedTemplateExpression]),
          (t: any) => t.name("thisexpression").schema([_.ThisExpression]),
          (t: any) => t.name("super").schema([_.Super]),
          (t: any) => t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
          (t: any) => t.name("elision").schema([_.Elision]),
          (t: any) => t.name("spreadelement").schema([_.SpreadElement]),
          (t: any) => t.name("arrayexpression").schema([Framework.List]),
          (t: any) => t.name("property").schema([_.Property]),
          (t: any) => t.name("objectexpression").schema([_.ObjectExpression]),
          (t: any) => t.name("functionexpression").schema([_.FunctionExpression]),
          (t: any) => t.name("arrowfunctionexpression").schema([_.ArrowFunctionExpression]),
          (t: any) => t.name("classexpression").schema([_.ClassExpression]),
          (t: any) => t.name("tsemptybodyfunctionexpression").schema([_.TSEmptyBodyFunctionExpression]),
          (t: any) => t.name("metaproperty").schema([_.MetaProperty]),
          (t: any) => t.name("memberexpression").schema([_.MemberExpression]),
          (t: any) => t.name("callexpression").schema([_.CallExpression]),
          (t: any) => t.name("chainexpression").schema([_.ChainExpression]),
          (t: any) => t.name("newexpression").schema([_.NewExpression]),
          (t: any) => t.name("importexpression").schema([_.ImportExpression]),
          (t: any) => t.name("updateexpression").schema([_.UpdateExpression]),
          (t: any) => t.name("unaryexpression").schema([_.UnaryExpression]),
          (t: any) => t.name("awaitexpression").schema([_.AwaitExpression]),
          (t: any) => t.name("binaryexpression").schema([_.BinaryExpression]),
          (t: any) => t.name("logicalexpression").schema([_.LogicalExpression]),
          (t: any) => t.name("conditionalexpression").schema([_.ConditionalExpression]),
          (t: any) => t.name("assignmentexpression").schema([_.AssignmentExpression]),
          (t: any) => t.name("sequenceexpression").schema([_.SequenceExpression]),
          (t: any) => t.name("yieldexpression").schema([_.YieldExpression]),
          (t: any) => t.name("tsasexpression").schema([_.TSAsExpression]),
          (t: any) => t.name("tssatisfiesexpression").schema([_.TSSatisfiesExpression]),
          (t: any) => t.name("tstypeassertion").schema([_.TSTypeAssertion]),
          (t: any) => t.name("tsnonnullexpression").schema([_.TSNonNullExpression]),
          (t: any) => t.name("tsinstantiationexpression").schema([_.TSInstantiationExpression]),
          (t: any) => t.name("arraypattern").schema([_.ArrayPattern]),
          (t: any) => t.name("objectpattern").schema([_.ObjectPattern]),
          (t: any) => t.name("assignmentpattern").schema([_.AssignmentPattern]),
          (t: any) => t.name("jsxelement").schema([_.JSXElement]),
          (t: any) => t.name("jsxfragment").schema([_.JSXFragment]),
          (t: any) => t.name("jsxemptyexpression").schema([_.JSXEmptyExpression]),
          (t: any) => t.name("error").schema([Framework.Error]),
          (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its family's types and patterns, by name: `TypeScript Types`' and `TypeScript Patterns`' installs add their
      // branches and properties, in any order with this one
      (_: any) => _.Types.name("Expressions.TypeScript.Types.Term"),
      (_: any) => _.Patterns.name("Expressions.TypeScript.Patterns.Term"),
      (_: any) => _.ArrayPattern.name("Expressions.TypeScript.Patterns.ArrayPattern"),
      (_: any) => _.ObjectPattern.name("Expressions.TypeScript.Patterns.ObjectPattern"),
      (_: any) => _.AssignmentPattern.name("Expressions.TypeScript.Patterns.AssignmentPattern"),
      (_: any) => _.RegExp.name("Expressions.TypeScript.RegExp.Term"), // a constant's regexp: its install's
      // names and literals
      (_: any) => _.Identifier.name("Expressions.TypeScript.TypeScript5.Identifier").properties({
          decorators: many(_.Decorator), name: S.OfStr, optional: S.OfBool,
          typeAnnotation: _.TSTypeAnnotation}),
      (_: any) => _.PrivateIdentifier.name("Expressions.TypeScript.TypeScript5.PrivateIdentifier").properties({name: S.OfStr}),
      (_: any) => _.Literal.name("Expressions.TypeScript.TypeScript5.Literal").refines([Framework.Literal]).properties({
          quote: S.OfStr,  // a string's quotes: `'` or `"`
          base: S.OfInt,  // a number's or a bigint's base: 2, 8, 10 or 16
          separators: S.OfBool,  // whether its digits are grouped by `_`
      }),
      (_: any) => _.Constant.name("Expressions.TypeScript.TypeScript5.Constant").properties({
          singleton: S.OfStr,  // `null`
          pattern: S.OfStr, flags: S.OfStr,  // a regular expression's, as written between and after its `/`s
          regexp: _.RegExp,  // the regular expression they encode, a `regexpliteral` (PRI-023)
          text: S.OfStr,  // its spelling, unvalidated
          problems: many(S.OfStr),  // what is wrong with it
      }),
      (_: any) => _.TemplateElement.name("Expressions.TypeScript.TypeScript5.TemplateElement").properties({
          raw: S.OfStr, tail: S.OfBool}),
      (_: any) => _.TemplateLiteral.name("Expressions.TypeScript.TypeScript5.TemplateLiteral").properties({
          quasis: many(_.TemplateElement), expressions: many(_.Term)}),
      (_: any) => _.TaggedTemplateExpression.name("Expressions.TypeScript.TypeScript5.TaggedTemplateExpression").properties({
          tag: _.Term, typeArguments: _.TSTypeParameterInstantiation, quasi: _.TemplateLiteral}),
      (_: any) => _.ThisExpression.name("Expressions.TypeScript.TypeScript5.ThisExpression"),
      (_: any) => _.Super.name("Expressions.TypeScript.TypeScript5.Super"),
      (_: any) => _.ParenthesizedExpression.name("Expressions.TypeScript.TypeScript5.ParenthesizedExpression").properties({
          expression: _.Term}),
      // displays
      (_: any) => _.Elision.name("Expressions.TypeScript.TypeScript5.Elision"),
      (_: any) => _.SpreadElement.name("Expressions.TypeScript.TypeScript5.SpreadElement").properties({argument: _.Term}),
      (_: any) => _.Property.name("Expressions.TypeScript.TypeScript5.Property").properties({
          propertyKind: S.OfStr, computed: S.OfBool, key: _.Term, optional: S.OfBool,
          method: S.OfBool, shorthand: S.OfBool, value: _.Term}),
      (_: any) => _.ObjectExpression.name("Expressions.TypeScript.TypeScript5.ObjectExpression").properties({
          properties: many(_.Term)}),
      // functions and classes: a body of statements is not part of the term
      // binders: `Let`, Let's properties first, `name` and `value` unset (a name is an `Identifier`), an arrow's
      // expression body its `body`, a function's and a class's unset (a body of statements is not part of the term);
      // their scopes say what each binds
      (_: any) => _.FunctionExpression.name("Expressions.TypeScript.TypeScript5.FunctionExpression").refines([Framework.Let]).properties({
          isAsync: S.OfBool, generator: S.OfBool, id: _.Identifier,
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Patterns),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.ArrowFunctionExpression.name("Expressions.TypeScript.TypeScript5.ArrowFunctionExpression").refines([Framework.Let]).properties({
          body: _.Term, // absent: a body of statements
          isAsync: S.OfBool, typeParameters: _.TSTypeParameterDeclaration, params: many(_.Patterns),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.ClassExpression.name("Expressions.TypeScript.TypeScript5.ClassExpression").refines([Framework.Let]).properties({
          decorators: many(_.Decorator), id: _.Identifier, typeParameters: _.TSTypeParameterDeclaration,
          superClass: _.Term, superTypeArguments: _.TSTypeParameterInstantiation,
          implements: many(_.TSClassImplements)}),
      (_: any) => _.TSEmptyBodyFunctionExpression.name("Expressions.TypeScript.TypeScript5.TSEmptyBodyFunctionExpression").refines([Framework.Let]).properties({
          isAsync: S.OfBool, generator: S.OfBool, typeParameters: _.TSTypeParameterDeclaration,
          params: many(_.Patterns), returnType: _.TSTypeAnnotation}),
      (_: any) => _.MetaProperty.name("Expressions.TypeScript.TypeScript5.MetaProperty").properties({
          meta: _.Identifier, property: _.Identifier}),
      // operations
      (_: any) => _.MemberExpression.name("Expressions.TypeScript.TypeScript5.MemberExpression").properties({
          object: _.Term, optional: S.OfBool, computed: S.OfBool, property: _.Term}),
      (_: any) => _.CallExpression.name("Expressions.TypeScript.TypeScript5.CallExpression").properties({
          callee: _.Term, optional: S.OfBool, typeArguments: _.TSTypeParameterInstantiation,
          arguments: many(_.Term)}),
      (_: any) => _.ChainExpression.name("Expressions.TypeScript.TypeScript5.ChainExpression").properties({expression: _.Term}),
      (_: any) => _.NewExpression.name("Expressions.TypeScript.TypeScript5.NewExpression").properties({
          callee: _.Term, typeArguments: _.TSTypeParameterInstantiation, arguments: many(_.Term)}),
      (_: any) => _.ImportExpression.name("Expressions.TypeScript.TypeScript5.ImportExpression").properties({
          phase: S.OfStr, source: _.Term, options: _.Term}),
      (_: any) => _.UpdateExpression.name("Expressions.TypeScript.TypeScript5.UpdateExpression").properties({
          operator: S.OfStr, prefix: S.OfBool, argument: _.Term}),
      (_: any) => _.UnaryExpression.name("Expressions.TypeScript.TypeScript5.UnaryExpression").properties({
          operator: S.OfStr, argument: _.Term}),
      (_: any) => _.AwaitExpression.name("Expressions.TypeScript.TypeScript5.AwaitExpression").properties({argument: _.Term}),
      (_: any) => _.BinaryExpression.name("Expressions.TypeScript.TypeScript5.BinaryExpression").properties({
          left: _.Term, operator: S.OfStr, right: _.Term}),
      (_: any) => _.LogicalExpression.name("Expressions.TypeScript.TypeScript5.LogicalExpression").properties({
          left: _.Term, operator: S.OfStr, right: _.Term}),
      (_: any) => _.ConditionalExpression.name("Expressions.TypeScript.TypeScript5.ConditionalExpression").properties({
          test: _.Term, consequent: _.Term, alternate: _.Term}),
      (_: any) => _.AssignmentExpression.name("Expressions.TypeScript.TypeScript5.AssignmentExpression").properties({
          left: _.Patterns, operator: S.OfStr, right: _.Term}),
      (_: any) => _.SequenceExpression.name("Expressions.TypeScript.TypeScript5.SequenceExpression").properties({
          expressions: many(_.Term)}),
      (_: any) => _.YieldExpression.name("Expressions.TypeScript.TypeScript5.YieldExpression").properties({
          delegate: S.OfBool, argument: _.Term}),
      // TypeScript's own expressions
      (_: any) => _.TSAsExpression.name("Expressions.TypeScript.TypeScript5.TSAsExpression").properties({
          expression: _.Term, typeAnnotation: _.Types}),
      (_: any) => _.TSSatisfiesExpression.name("Expressions.TypeScript.TypeScript5.TSSatisfiesExpression").properties({
          expression: _.Term, typeAnnotation: _.Types}),
      (_: any) => _.TSTypeAssertion.name("Expressions.TypeScript.TypeScript5.TSTypeAssertion").properties({
          typeAnnotation: _.Types, expression: _.Term}),
      (_: any) => _.TSNonNullExpression.name("Expressions.TypeScript.TypeScript5.TSNonNullExpression").properties({
          expression: _.Term}),
      (_: any) => _.TSInstantiationExpression.name("Expressions.TypeScript.TypeScript5.TSInstantiationExpression").properties({
          expression: _.Term, typeArguments: _.TSTypeParameterInstantiation}),
      // helpers: decorators, heritage, annotations and type parameters, which expressions and types hold alike
      (_: any) => _.Decorator.name("Expressions.TypeScript.TypeScript5.Decorator").properties({expression: _.Term}),
      (_: any) => _.TSClassImplements.name("Expressions.TypeScript.TypeScript5.TSClassImplements").properties({
          expression: _.Term, typeArguments: _.TSTypeParameterInstantiation}),
      (_: any) => _.TSTypeAnnotation.name("Expressions.TypeScript.TypeScript5.TSTypeAnnotation").properties({
          typeAnnotation: _.Types}),
      (_: any) => _.TSTypeParameter.name("Expressions.TypeScript.TypeScript5.TSTypeParameter").properties({
          const: S.OfBool, isIn: S.OfBool, isOut: S.OfBool, name: _.Identifier, constraint: _.Types,
          default: _.Types}),
      (_: any) => _.TSTypeParameterDeclaration.name("Expressions.TypeScript.TypeScript5.TSTypeParameterDeclaration").properties({
          params: many(_.TSTypeParameter)}),
      (_: any) => _.TSTypeParameterInstantiation.name("Expressions.TypeScript.TypeScript5.TSTypeParameterInstantiation").properties({
          params: many(_.Types)}),
      // JSX, an extension
      (_: any) => _.JSXTagNameExpression.name("Expressions.TypeScript.TypeScript5.JSXTagNameExpression").branches([
          (t: any) => t.name("jsxidentifier").schema([_.JSXIdentifier]),
          (t: any) => t.name("jsxmemberexpression").schema([_.JSXMemberExpression]),
          (t: any) => t.name("jsxnamespacedname").schema([_.JSXNamespacedName])]),
      (_: any) => _.JSXAttributeName.name("Expressions.TypeScript.TypeScript5.JSXAttributeName").branches([
          (t: any) => t.name("jsxidentifier").schema([_.JSXIdentifier]),
          (t: any) => t.name("jsxnamespacedname").schema([_.JSXNamespacedName])]),
      (_: any) => _.JSXAttributeValue.name("Expressions.TypeScript.TypeScript5.JSXAttributeValue").branches([
          (t: any) => t.name("literal").schema([_.Literal]),
          (t: any) => t.name("jsxexpressioncontainer").schema([_.JSXExpressionContainer]),
          (t: any) => t.name("jsxelement").schema([_.JSXElement]),
          (t: any) => t.name("jsxfragment").schema([_.JSXFragment])]),
      (_: any) => _.JSXAttributeItem.name("Expressions.TypeScript.TypeScript5.JSXAttributeItem").branches([
          (t: any) => t.name("jsxattribute").schema([_.JSXAttribute]),
          (t: any) => t.name("jsxspreadattribute").schema([_.JSXSpreadAttribute])]),
      (_: any) => _.JSXChild.name("Expressions.TypeScript.TypeScript5.JSXChild").branches([
          (t: any) => t.name("jsxtext").schema([_.JSXText]),
          (t: any) => t.name("jsxexpressioncontainer").schema([_.JSXExpressionContainer]),
          (t: any) => t.name("jsxspreadchild").schema([_.JSXSpreadChild]),
          (t: any) => t.name("jsxelement").schema([_.JSXElement]),
          (t: any) => t.name("jsxfragment").schema([_.JSXFragment])]),
      (_: any) => _.JSXIdentifier.name("Expressions.TypeScript.TypeScript5.JSXIdentifier").properties({name: S.OfStr}),
      (_: any) => _.JSXNamespacedName.name("Expressions.TypeScript.TypeScript5.JSXNamespacedName").properties({
          namespace: _.JSXIdentifier, name: _.JSXIdentifier}),
      (_: any) => _.JSXMemberExpression.name("Expressions.TypeScript.TypeScript5.JSXMemberExpression").properties({
          object: _.JSXTagNameExpression, property: _.JSXIdentifier}),
      (_: any) => _.JSXEmptyExpression.name("Expressions.TypeScript.TypeScript5.JSXEmptyExpression"),
      (_: any) => _.JSXExpressionContainer.name("Expressions.TypeScript.TypeScript5.JSXExpressionContainer").properties({
          expression: _.Term}),
      (_: any) => _.JSXSpreadChild.name("Expressions.TypeScript.TypeScript5.JSXSpreadChild").properties({expression: _.Term}),
      (_: any) => _.JSXText.name("Expressions.TypeScript.TypeScript5.JSXText").properties({raw: S.OfStr}),
      (_: any) => _.JSXAttribute.name("Expressions.TypeScript.TypeScript5.JSXAttribute").properties({
          name: _.JSXAttributeName, value: _.JSXAttributeValue}),
      (_: any) => _.JSXSpreadAttribute.name("Expressions.TypeScript.TypeScript5.JSXSpreadAttribute").properties({
          argument: _.Term}),
      (_: any) => _.JSXOpeningElement.name("Expressions.TypeScript.TypeScript5.JSXOpeningElement").properties({
          name: _.JSXTagNameExpression, typeArguments: _.TSTypeParameterInstantiation,
          attributes: many(_.JSXAttributeItem), selfClosing: S.OfBool}),
      (_: any) => _.JSXClosingElement.name("Expressions.TypeScript.TypeScript5.JSXClosingElement").properties({
          name: _.JSXTagNameExpression}),
      (_: any) => _.JSXElement.name("Expressions.TypeScript.TypeScript5.JSXElement").properties({
          openingElement: _.JSXOpeningElement, children: many(_.JSXChild),
          closingElement: _.JSXClosingElement}),
      (_: any) => _.JSXOpeningFragment.name("Expressions.TypeScript.TypeScript5.JSXOpeningFragment"),
      (_: any) => _.JSXClosingFragment.name("Expressions.TypeScript.TypeScript5.JSXClosingFragment"),
      (_: any) => _.JSXFragment.name("Expressions.TypeScript.TypeScript5.JSXFragment").properties({
          openingFragment: _.JSXOpeningFragment, children: many(_.JSXChild),
          closingFragment: _.JSXClosingFragment}),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
      // narrowed to its `Term`
      (_: any) => _.Expression.name("Expressions.TypeScript.TypeScript5.Expression").ref(true).refines([Framework.Expression]).properties({
          root: _.Term}),
      // --- its kinds of domain: `string`, and the token of `null`; each inferred `ordered` ---
      (_: any) => _.OfString.name("Expressions.TypeScript.TypeScript5.OfString").properties({ ordered: S.OfBool }),
      (_: any) => _.OfNull.name("Expressions.TypeScript.TypeScript5.OfNull").properties({ ordered: S.OfBool }),
      (_: any) => _.DomainKind.name("Expressions.TypeScript.TypeScript5.DomainKind").branches([
        (t: any) => t.name("string").schema([_.OfString]),
        (t: any) => t.name("null").schema([_.OfNull]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("typescript5").schema([_.DomainKind])]),
      // --- its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.boolean.name("Expressions.TypeScript.TypeScript5.boolean").schemas([S.OfBool]),
      (_: any) => _.number.name("Expressions.TypeScript.TypeScript5.number").schemas([S.OfFloat]),
      (_: any) => _.bigint.name("Expressions.TypeScript.TypeScript5.bigint").schemas([S.OfInt]),
      (_: any) => _.string.name("Expressions.TypeScript.TypeScript5.string").schemas([S.OfStr]),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([  // a branch added: schema extension
          (t: any) => t.name("typescript5").schema([_.Term])]),
    ])]))]);
}

/** TypeScript5's domains as data: the singleton `Expressions.TypeScript.TypeScript5` owning its domains by name
 * (`domains`, through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and each
 * but a token's related to its schema (`Expressions.TypeScript.TypeScript5.number`) by
 * `Expressions.Framework.HasDomain`: `boolean`, `number`, `bigint` and `string`, and the token `null`. And the
 * versions of TypeScript 5 it covers, by their published names (`standards`, through `Expressions.Framework.Covers`),
 * TypeScript 5.0 to 5.9, each with its body, its version and the kinds it has. Run after the installs, in a
 * transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`), each version by its
 * name spelled as an identifier (`TypeScript_5_0`) and each domain by its name:
 * `store.transaction(TypeScript5.define)[0].get("number")`. */
export function define(txn: any): any {
  const [TypeScript5, Domain] = [txn.Expressions.TypeScript.TypeScript5, txn.Expressions.Framework.Domain];
  const Standard = txn.Expressions.Framework.Standard;
  const own = DIALECT.kinds(); // its own kinds: not `TypeScript Patterns`' its `Term` lists
  const every = (TypeScript5.Term.as_schema().branches as { name: string; schema: unknown }[]) // each kind's schema,
    .filter((b) => own.has(b.name) && !EXTENSIONS.has(b.name) && !F.INVALID_KINDS.has(b.name)) // every version's,
    .map((b) => b.schema); // but an extension and invalid syntax
  const MICROSOFT = ["com.microsoft"];
  const versions = Object.fromEntries(Array.from({ length: 10 }, (_, minor) => [`TypeScript_5_${minor}`, Standard]));
  return txn.uid("mbse.Expressions.TypeScript.TypeScript5.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: TypeScript5.Dialect, ...versions, boolean: Domain, number: Domain, bigint: Domain,
      string: Domain, null: Domain })
    .spec([
      // --- the versions of TypeScript 5 it covers, each by its published name, with the kinds it has: all ---
      (_: any) => _.dialect.standards({
        "TypeScript 5.0": (e: any) => e.standard(_.TypeScript_5_0),
        "TypeScript 5.1": (e: any) => e.standard(_.TypeScript_5_1),
        "TypeScript 5.2": (e: any) => e.standard(_.TypeScript_5_2),
        "TypeScript 5.3": (e: any) => e.standard(_.TypeScript_5_3),
        "TypeScript 5.4": (e: any) => e.standard(_.TypeScript_5_4),
        "TypeScript 5.5": (e: any) => e.standard(_.TypeScript_5_5),
        "TypeScript 5.6": (e: any) => e.standard(_.TypeScript_5_6),
        "TypeScript 5.7": (e: any) => e.standard(_.TypeScript_5_7),
        "TypeScript 5.8": (e: any) => e.standard(_.TypeScript_5_8),
        "TypeScript 5.9": (e: any) => e.standard(_.TypeScript_5_9),
      }),
      (_: any) => _.TypeScript_5_0.bodies(MICROSOFT).revision((r: any) => r.version("5.0")).kinds(every),
      (_: any) => _.TypeScript_5_1.bodies(MICROSOFT).revision((r: any) => r.version("5.1")).kinds(every),
      (_: any) => _.TypeScript_5_2.bodies(MICROSOFT).revision((r: any) => r.version("5.2")).kinds(every),
      (_: any) => _.TypeScript_5_3.bodies(MICROSOFT).revision((r: any) => r.version("5.3")).kinds(every),
      (_: any) => _.TypeScript_5_4.bodies(MICROSOFT).revision((r: any) => r.version("5.4")).kinds(every),
      (_: any) => _.TypeScript_5_5.bodies(MICROSOFT).revision((r: any) => r.version("5.5")).kinds(every),
      (_: any) => _.TypeScript_5_6.bodies(MICROSOFT).revision((r: any) => r.version("5.6")).kinds(every),
      (_: any) => _.TypeScript_5_7.bodies(MICROSOFT).revision((r: any) => r.version("5.7")).kinds(every),
      (_: any) => _.TypeScript_5_8.bodies(MICROSOFT).revision((r: any) => r.version("5.8")).kinds(every),
      (_: any) => _.TypeScript_5_9.bodies(MICROSOFT).revision((r: any) => r.version("5.9")).kinds(every),
      // --- its domains ---
      (_: any) => _.dialect.domains({
        boolean: (e: any) => e.domain(_.boolean), number: (e: any) => e.domain(_.number),
        bigint: (e: any) => e.domain(_.bigint), string: (e: any) => e.domain(_.string),
        null: (e: any) => e.domain(_.null),
      }),
      (_: any) => _.boolean.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.boolean(
        (d: any) => d.ordered(false)))))).schema([TypeScript5.boolean]),
      (_: any) => _.number.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n).radix(2n).precision(53n).emax(1023n).ordered(
          true)))))).schema([TypeScript5.number]),
      (_: any) => _.bigint.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.signed(true).overflow("raise").ordered(true)))))).schema([TypeScript5.bigint]), // unbounded
      (_: any) => _.string.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.typescript5((v: any) => v.string(
        (d: any) => d.ordered(true)))))).schema([TypeScript5.string]),
      (_: any) => _.null.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.typescript5((v: any) => v.null(
        (d: any) => d.ordered(false)))))), // a token: no schema
    ])]))]);
}

// --- Reading a term with its helpers nested ---

/** A term or a helper, its helpers nested (`Terms.Node`). */
export const Node = F.Node;
export type Node = F.Node;

/** A term's `Node` of the TypeScript family (TypeScript5's, or a `TypeScript Types`' or a `TypeScript Patterns`' term),
 * its helpers nested. */
export function tree(term: any): Node {
  const [tag, record] = DIALECT.kind(term);
  return F.node(tag, record);
}

/** The names a pattern binds (`Nodes.bindingNames`). */
export const bindingNames = Nodes.bindingNames;

// --- Checks ---

/** A constant holds `null` or a regular expression, its `pattern` or its `regexp` at least, its flags among `FLAGS`,
 * each once; its `regexp`'s problems, as `TypeScript RegExp` validates it, too. That its `regexp` is what its `pattern`
 * and `flags` spell is not checked, as a literal's `value` is not against its `text`. */
function constantProblems(record: any): string[] {
  const node = F.node(CONSTANT, record);
  const regexp = node.slots.get("regexp");
  const held = regexp === null ? [] : DIALECT.validate(regexp).map((problem) => `regexp: ${problem}`);
  return [...Nodes.check(CONSTANT, (attributes) => constant(attributes, regexp !== null))(record), ...held];
}

function constant(attributes: ReadonlyMap<string, any>, regexp: boolean): string[] {
  const singleton = attributes.get("singleton");
  const regex = attributes.has("pattern") || attributes.has("flags") || regexp;
  if (singleton === undefined && !regex) { // unless its text is invalid, its problems said
    return attributes.has("problems") ? [] : ["a constant needs a singleton or a regular expression"];
  }
  if (singleton !== undefined && regex) return ["a constant holds a singleton or a regular expression, not both"];
  if (singleton !== undefined) return singleton === "null" ? [] : [`a constant's singleton must be null, got ${repr(singleton)}`];
  if (!attributes.has("pattern") && !regexp) return ["a regular expression needs a pattern"];
  const flags = String(attributes.get("flags") ?? "");
  if ([...flags].some((flag) => !FLAGS.includes(flag)) || new Set(flags).size !== flags.length) {
    return [`a regular expression's flags cannot be ${repr(flags)}`];
  }
  return [];
}

/** The literal of a native value: a boolean, a number (a float), a bigint (an int) or a string; a bytes has none. */
function native(value: unknown): F.Writer | null {
  if (value instanceof Uint8Array) return null;
  return new F.Writer((u: any) => u[LITERAL]((r: any) => r.value((p: any) => p.as_scalar(value))), "typescript5");
}

const ANY = new FD.Function([FD.Anything], FD.Anything);
const ANY2 = new FD.Function([FD.Anything, FD.Anything], FD.Anything);

/** A type parameter's slots, which may be empty at any depth (`Kind.optional`): its constraint and its default. */
export const TYPE_PARAMETERS: readonly string[] = ["*.constraint", "*.default"];

function application(tag: string, signature: FD.Signature = new FD.Opaque(), options: F.KindOptions = {}): F.Kind {
  return new F.Kind(F.APPLICATION, { signature, check: Nodes.check(tag), scopes: Nodes.scopes(tag), ...options,
    optional: [...options.optional ?? [], ...TYPE_PARAMETERS] });
}

function operatorKind(tag: string, vocabulary: ReadonlyMap<string, FD.Signature>): F.Kind {
  return new F.Kind(F.APPLICATION, { operator: "operator", vocabulary, required: ["operator"],
    check: Nodes.check(tag), scopes: Nodes.scopes(tag), optional: TYPE_PARAMETERS });
}

/** The dialects of its family whose terms its positions hold, read when first needed (the dialects proposal,
 * Retrofit's design): `TypeScript Types`, `TypeScript Patterns` and `TypeScript RegExp`, a constant's `regexp`. */
function reads(): readonly F.Dialect[] {
  return [TypeScriptTypes.DIALECT, TypeScriptPatterns.DIALECT, TypeScriptRegExp.DIALECT];
}

/** The TypeScript5 dialect: its kinds, as the framework reads them, and its family's other dialects' terms: the patterns
 * its `Term` lists (`arraypattern`, `objectpattern`, `assignmentpattern`) are `TypeScript Patterns`' kinds. */
export const DIALECT: F.Dialect = new F.Dialect("TypeScript.TypeScript5", {
  [IDENTIFIER]: new F.Kind(F.REFERENCE, { required: ["name"], check: Nodes.check(IDENTIFIER) }),
  [PRIVATEIDENTIFIER]: new F.Kind(F.REFERENCE, { required: ["name"], lexical: false, check: Nodes.check(PRIVATEIDENTIFIER) }),
  [LITERAL]: new F.Kind(F.LITERAL, { spelling: ["text", "problems", "quote", "base", "separators"],
    check: Nodes.check(LITERAL) }),
  [CONSTANT]: new F.Kind(F.LITERAL, { spelling: ["text", "problems"], check: constantProblems,
    typed: (record) => Domains.constant(F.attributesOf(record)) }),
  [TEMPLATELITERAL]: application(TEMPLATELITERAL, new FD.Opaque(Domains.String)),
  [TAGGEDTEMPLATEEXPRESSION]: application(TAGGEDTEMPLATEEXPRESSION, new FD.Opaque(), { required: ["quasi"] }),
  [THISEXPRESSION]: new F.Kind(F.REFERENCE, { lexical: false }),
  [SUPER]: new F.Kind(F.REFERENCE, { lexical: false }),
  [PARENTHESIZEDEXPRESSION]: application(PARENTHESIZEDEXPRESSION, ANY),
  [ELISION]: application(ELISION),
  [SPREADELEMENT]: application(SPREADELEMENT, ANY),
  [ARRAYEXPRESSION]: application(ARRAYEXPRESSION),
  [PROPERTY]: application(PROPERTY),
  [OBJECTEXPRESSION]: application(OBJECTEXPRESSION),
  [FUNCTIONEXPRESSION]: application(FUNCTIONEXPRESSION, new FD.Opaque(), { optional: ["value", "body"] }),
  [ARROWFUNCTIONEXPRESSION]: application(ARROWFUNCTIONEXPRESSION, new FD.Opaque(), { optional: ["value", "body"] }),
  [CLASSEXPRESSION]: application(CLASSEXPRESSION, new FD.Opaque(), { optional: ["value", "body", "superClass"] }),
  [TSEMPTYBODYFUNCTIONEXPRESSION]: application(TSEMPTYBODYFUNCTIONEXPRESSION, new FD.Opaque(), { optional: ["value", "body"] }),
  [METAPROPERTY]: application(METAPROPERTY, new FD.Opaque(), { required: ["meta", "property"] }),
  [MEMBEREXPRESSION]: application(MEMBEREXPRESSION, ANY2),
  [CALLEXPRESSION]: application(CALLEXPRESSION),
  [CHAINEXPRESSION]: application(CHAINEXPRESSION, ANY),
  [NEWEXPRESSION]: application(NEWEXPRESSION),
  [IMPORTEXPRESSION]: application(IMPORTEXPRESSION, new FD.Opaque(), { optional: ["options"] }),
  [UPDATEEXPRESSION]: operatorKind(UPDATEEXPRESSION, Domains.UPDATE),
  [UNARYEXPRESSION]: operatorKind(UNARYEXPRESSION, Domains.UNARY),
  [AWAITEXPRESSION]: application(AWAITEXPRESSION, ANY),
  [BINARYEXPRESSION]: operatorKind(BINARYEXPRESSION, Domains.BINARY),
  [LOGICALEXPRESSION]: operatorKind(LOGICALEXPRESSION, Domains.LOGICAL),
  [CONDITIONALEXPRESSION]: application(CONDITIONALEXPRESSION,
    new FD.Function([FD.Anything, FD.Anything, FD.Anything], FD.Anything)),
  [ASSIGNMENTEXPRESSION]: operatorKind(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT),
  [SEQUENCEEXPRESSION]: application(SEQUENCEEXPRESSION),
  [YIELDEXPRESSION]: application(YIELDEXPRESSION, new FD.Opaque(), { optional: ["argument"] }),
  [TSASEXPRESSION]: application(TSASEXPRESSION),
  [TSSATISFIESEXPRESSION]: application(TSSATISFIESEXPRESSION),
  [TSTYPEASSERTION]: application(TSTYPEASSERTION),
  [TSNONNULLEXPRESSION]: application(TSNONNULLEXPRESSION, ANY),
  [TSINSTANTIATIONEXPRESSION]: application(TSINSTANTIATIONEXPRESSION, new FD.Opaque(), { required: ["typeArguments"] }),
  [JSXELEMENT]: application(JSXELEMENT, new FD.Opaque(), { required: ["openingElement"] }),
  [JSXFRAGMENT]: application(JSXFRAGMENT, new FD.Opaque()),
  [JSXEMPTYEXPRESSION]: application(JSXEMPTYEXPRESSION, new FD.Opaque()),
}, { domain_of: Domains.of, literal: native, reads });
