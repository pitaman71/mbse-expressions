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
 *   `pattern` and `flags`), with its spelling too; `templateliteral` (`quasis`, each a `templateelement`, and
 *   `expressions`), `taggedtemplateexpression`, `thisexpression`, `super`; `parenthesizedexpression`, parentheses written
 *   in the source; `undefined` is an `identifier`, as in TypeScript.
 * - Displays: `arrayexpression`, the framework's `list` (its `elements`, any term: an `elision` for a hole, a
 *   `spreadelement` for `...x`), `objectexpression` (`properties`, each a `property` or a `spreadelement`).
 * - Functions and classes: `functionexpression`, `arrowfunctionexpression`, `classexpression`,
 *   `tsemptybodyfunctionexpression`; a body of statements is not part of the term (the dialects proposal, Decided, 5,
 *   "(i)"): it is absent, and mbse-programs relates its statements to what holds the expression. An arrow whose body is
 *   an expression holds it as its `body`, a term; one whose `body` is absent has a block of statements.
 * - Operators and access: `metaproperty`, `memberexpression`, `callexpression`, `chainexpression`, `newexpression`,
 *   `importexpression`, `updateexpression`, `unaryexpression`, `awaitexpression`, `binaryexpression`,
 *   `logicalexpression`, `conditionalexpression`, `assignmentexpression`, `sequenceexpression`, `yieldexpression`.
 * - TypeScript's own: `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`, `tsnonnullexpression`,
 *   `tsinstantiationexpression`.
 * - The patterns typescript-estree's expressions hold (`arraypattern`, `objectpattern`, `assignmentpattern`), so that a
 *   `property`'s value holds a pattern where an object pattern holds it.
 * - JSX, an extension outside every version, as mbse-programs marks it (`EXTENSIONS`): `jsxelement`, `jsxfragment` and
 *   `jsxemptyexpression`, with their helpers.
 * - The framework's kinds of invalid syntax, `error` and `missing`.
 *
 * The sublanguages are unions of their own beside `Term` (the dialects proposal, Decided, 5):
 * `Expressions.TypeScript.TypeScript5.Type`, TypeScript's type nodes, held by what holds a type (`x as T`, `x satisfies T`, `<T>x`,
 * a call's type arguments); and `Expressions.TypeScript.TypeScript5.Pattern`, destructuring patterns, held by a function's
 * parameters and an assignment's target. As the user decided ("(b) as you recommended"), one schema is a branch of every
 * union whose positions hold it: `Pattern` lists, beside its own kinds, the terms a target may be (`identifier`,
 * `memberexpression`, `parenthesizedexpression`, `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`,
 * `tsnonnullexpression`), and `Type` lists the terms a type holds (`identifier` and `thisexpression` for an entity name,
 * `literal`, `unaryexpression` and `templateliteral` for a literal type, `objectexpression` for an import type's
 * options). Each holds invalid syntax too (the framework's `error` and `missing`), as every dialect's `Type` and
 * `Pattern` do. Which terms are allowed where, beyond that, is a constraint. Names that only declare (a mapped type's `key`,
 * a tuple member's `label`, a type parameter's `name`, a qualified name's `right`) are `Identifier`s, as mbse-programs
 * has them ("yes, stay `Identifier` terms"). The framework reads a value of a sublanguage, as of any helper, as a
 * `Terms.Part`.
 *
 * Each kind's `Kind` records the TypeScript versions that have it (`standards`, `STANDARDS`, 5.0 to 5.9, every kind
 * being older; none for an extension). `DIALECT` reads them (`Terms.Dialect`). There are no writers: a TypeScript5 term
 * is written through the builders, in a transaction (mbse-basis
 * [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)). `tree(term)` reads a term with its
 * helpers nested, as its printer and its checks read it.
 *
 * Its kinds of domain, the branches of its union `Expressions.TypeScript.TypeScript5.DomainKind`, which `install` adds
 * to the framework's `Expressions.Framework.DomainKind` as the branch `typescript5`, each with the inferred `ordered`:
 * `string` (`OfString`), sequences of UTF-16 code units; and the token `null` (`OfNull`), whose domain has no schema: its
 * value is a `constant`'s. Its domains are stage 3's of the domains-as-data proposal.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

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

/** The versions of TypeScript 5 the dialect covers, by their published names, 5.0 to 5.9. */
export const STANDARDS: readonly string[] = Array.from({ length: 10 }, (_, minor) => `TypeScript 5.${minor}`);

/** A string's quotes, as TypeScript writes them. */
export const QUOTES: readonly string[] = ["'", '"'];

/** A regular expression's flags, as ECMAScript 2025 has them. */
export const FLAGS = "dgimsuvy";

/** TypeScript5's union of its kinds, added to the framework's terms as the branch `typescript5`, its own kinds, its
 * sublanguages' unions (`Type`, `Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
 * `Expressions.TypeScript.TypeScript5`: run after `Framework.install`, in a transaction of its own; run again, it writes nothing.
 * Its holder, `Expressions.TypeScript.TypeScript5.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
 * its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.TypeScript.TypeScript5/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Kinds: S.OfUnion, DomainKind: S.OfUnion, // Kinds: the framework's
      OfString: S.OfObject, OfNull: S.OfObject,
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Type: S.OfUnion, Pattern: S.OfUnion, TypeElement: S.OfUnion, JSXTagNameExpression: S.OfUnion,
      JSXAttributeName: S.OfUnion, JSXAttributeValue: S.OfUnion, JSXAttributeItem: S.OfUnion,
      JSXChild: S.OfUnion, Expression: S.OfObject,
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
      TSInstantiationExpression: S.OfObject, ArrayPattern: S.OfObject, ObjectPattern: S.OfObject,
      AssignmentPattern: S.OfObject, RestElement: S.OfObject, TSParameterProperty: S.OfObject,
      Decorator: S.OfObject, Comment: S.OfObject, TSClassImplements: S.OfObject,
      TSTypeAnnotation: S.OfObject, TSTypeParameter: S.OfObject,
      TSTypeParameterDeclaration: S.OfObject, TSTypeParameterInstantiation: S.OfObject,
      TSPropertySignature: S.OfObject, TSMethodSignature: S.OfObject,
      TSCallSignatureDeclaration: S.OfObject, TSConstructSignatureDeclaration: S.OfObject,
      TSIndexSignature: S.OfObject,
      TSAnyKeyword: S.OfObject, TSUnknownKeyword: S.OfObject, TSNumberKeyword: S.OfObject,
      TSBigIntKeyword: S.OfObject, TSBooleanKeyword: S.OfObject, TSStringKeyword: S.OfObject,
      TSSymbolKeyword: S.OfObject, TSObjectKeyword: S.OfObject, TSNeverKeyword: S.OfObject,
      TSVoidKeyword: S.OfObject, TSUndefinedKeyword: S.OfObject, TSNullKeyword: S.OfObject,
      TSIntrinsicKeyword: S.OfObject, TSThisType: S.OfObject, TSQualifiedName: S.OfObject,
      TSTypeReference: S.OfObject, TSParenthesizedType: S.OfObject, TSLiteralType: S.OfObject,
      TSTemplateLiteralType: S.OfObject, TSArrayType: S.OfObject, TSTupleType: S.OfObject,
      TSNamedTupleMember: S.OfObject, TSOptionalType: S.OfObject, TSRestType: S.OfObject,
      TSUnionType: S.OfObject, TSIntersectionType: S.OfObject, TSFunctionType: S.OfObject,
      TSConstructorType: S.OfObject, TSTypeLiteral: S.OfObject, TSMappedType: S.OfObject,
      TSIndexedAccessType: S.OfObject, TSTypeOperator: S.OfObject, TSTypeQuery: S.OfObject,
      TSImportType: S.OfObject, TSConditionalType: S.OfObject, TSInferType: S.OfObject,
      TSTypePredicate: S.OfObject,
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
          operations: (a: any) => a.relation([Framework.Operates]).me("dialect")}),
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
      // its patterns: what a parameter or an assignment's target binds, and the terms a target may be
      (_: any) => _.Pattern.name("Expressions.TypeScript.TypeScript5.Pattern").branches([
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
      // its types: TypeScript's type nodes, and the terms a type holds
      (_: any) => _.Type.name("Expressions.TypeScript.TypeScript5.Type").branches([
          (t: any) => t.name("tsanykeyword").schema([_.TSAnyKeyword]),
          (t: any) => t.name("tsunknownkeyword").schema([_.TSUnknownKeyword]),
          (t: any) => t.name("tsnumberkeyword").schema([_.TSNumberKeyword]),
          (t: any) => t.name("tsbigintkeyword").schema([_.TSBigIntKeyword]),
          (t: any) => t.name("tsbooleankeyword").schema([_.TSBooleanKeyword]),
          (t: any) => t.name("tsstringkeyword").schema([_.TSStringKeyword]),
          (t: any) => t.name("tssymbolkeyword").schema([_.TSSymbolKeyword]),
          (t: any) => t.name("tsobjectkeyword").schema([_.TSObjectKeyword]),
          (t: any) => t.name("tsneverkeyword").schema([_.TSNeverKeyword]),
          (t: any) => t.name("tsvoidkeyword").schema([_.TSVoidKeyword]),
          (t: any) => t.name("tsundefinedkeyword").schema([_.TSUndefinedKeyword]),
          (t: any) => t.name("tsnullkeyword").schema([_.TSNullKeyword]),
          (t: any) => t.name("tsintrinsickeyword").schema([_.TSIntrinsicKeyword]),
          (t: any) => t.name("tsthistype").schema([_.TSThisType]),
          (t: any) => t.name("tsqualifiedname").schema([_.TSQualifiedName]),
          (t: any) => t.name("tstypereference").schema([_.TSTypeReference]),
          (t: any) => t.name("tsparenthesizedtype").schema([_.TSParenthesizedType]),
          (t: any) => t.name("tsliteraltype").schema([_.TSLiteralType]),
          (t: any) => t.name("tstemplateliteraltype").schema([_.TSTemplateLiteralType]),
          (t: any) => t.name("tsarraytype").schema([_.TSArrayType]),
          (t: any) => t.name("tstupletype").schema([_.TSTupleType]),
          (t: any) => t.name("tsnamedtuplemember").schema([_.TSNamedTupleMember]),
          (t: any) => t.name("tsoptionaltype").schema([_.TSOptionalType]),
          (t: any) => t.name("tsresttype").schema([_.TSRestType]),
          (t: any) => t.name("tsuniontype").schema([_.TSUnionType]),
          (t: any) => t.name("tsintersectiontype").schema([_.TSIntersectionType]),
          (t: any) => t.name("tsfunctiontype").schema([_.TSFunctionType]),
          (t: any) => t.name("tsconstructortype").schema([_.TSConstructorType]),
          (t: any) => t.name("tstypeliteral").schema([_.TSTypeLiteral]),
          (t: any) => t.name("tsmappedtype").schema([_.TSMappedType]),
          (t: any) => t.name("tsindexedaccesstype").schema([_.TSIndexedAccessType]),
          (t: any) => t.name("tstypeoperator").schema([_.TSTypeOperator]),
          (t: any) => t.name("tstypequery").schema([_.TSTypeQuery]),
          (t: any) => t.name("tsimporttype").schema([_.TSImportType]),
          (t: any) => t.name("tsconditionaltype").schema([_.TSConditionalType]),
          (t: any) => t.name("tsinfertype").schema([_.TSInferType]),
          (t: any) => t.name("tstypepredicate").schema([_.TSTypePredicate]),
          (t: any) => t.name("identifier").schema([_.Identifier]),
          (t: any) => t.name("thisexpression").schema([_.ThisExpression]),
          (t: any) => t.name("literal").schema([_.Literal]),
          (t: any) => t.name("unaryexpression").schema([_.UnaryExpression]),
          (t: any) => t.name("templateliteral").schema([_.TemplateLiteral]),
          (t: any) => t.name("objectexpression").schema([_.ObjectExpression]),
          (t: any) => t.name("error").schema([Framework.Error]),
          (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // an object type's members (typescript-estree's `TypeElement`), comments among them as mbse-programs keeps them
      (_: any) => _.TypeElement.name("Expressions.TypeScript.TypeScript5.TypeElement").branches([
          (t: any) => t.name("tspropertysignature").schema([_.TSPropertySignature]),
          (t: any) => t.name("tsmethodsignature").schema([_.TSMethodSignature]),
          (t: any) => t.name("tscallsignaturedeclaration").schema([_.TSCallSignatureDeclaration]),
          (t: any) => t.name("tsconstructsignaturedeclaration").schema([_.TSConstructSignatureDeclaration]),
          (t: any) => t.name("tsindexsignature").schema([_.TSIndexSignature]),
          (t: any) => t.name("comment").schema([_.Comment]),
      ]),
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
      (_: any) => _.FunctionExpression.name("Expressions.TypeScript.TypeScript5.FunctionExpression").properties({
          isAsync: S.OfBool, generator: S.OfBool, id: _.Identifier,
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Pattern),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.ArrowFunctionExpression.name("Expressions.TypeScript.TypeScript5.ArrowFunctionExpression").properties({
          isAsync: S.OfBool, typeParameters: _.TSTypeParameterDeclaration, params: many(_.Pattern),
          returnType: _.TSTypeAnnotation, body: _.Term}),  // absent: a body of statements
      (_: any) => _.ClassExpression.name("Expressions.TypeScript.TypeScript5.ClassExpression").properties({
          decorators: many(_.Decorator), id: _.Identifier, typeParameters: _.TSTypeParameterDeclaration,
          superClass: _.Term, superTypeArguments: _.TSTypeParameterInstantiation,
          implements: many(_.TSClassImplements)}),
      (_: any) => _.TSEmptyBodyFunctionExpression.name("Expressions.TypeScript.TypeScript5.TSEmptyBodyFunctionExpression").properties({
          isAsync: S.OfBool, generator: S.OfBool, typeParameters: _.TSTypeParameterDeclaration,
          params: many(_.Pattern), returnType: _.TSTypeAnnotation}),
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
          left: _.Pattern, operator: S.OfStr, right: _.Term}),
      (_: any) => _.SequenceExpression.name("Expressions.TypeScript.TypeScript5.SequenceExpression").properties({
          expressions: many(_.Term)}),
      (_: any) => _.YieldExpression.name("Expressions.TypeScript.TypeScript5.YieldExpression").properties({
          delegate: S.OfBool, argument: _.Term}),
      // TypeScript's own expressions
      (_: any) => _.TSAsExpression.name("Expressions.TypeScript.TypeScript5.TSAsExpression").properties({
          expression: _.Term, typeAnnotation: _.Type}),
      (_: any) => _.TSSatisfiesExpression.name("Expressions.TypeScript.TypeScript5.TSSatisfiesExpression").properties({
          expression: _.Term, typeAnnotation: _.Type}),
      (_: any) => _.TSTypeAssertion.name("Expressions.TypeScript.TypeScript5.TSTypeAssertion").properties({
          typeAnnotation: _.Type, expression: _.Term}),
      (_: any) => _.TSNonNullExpression.name("Expressions.TypeScript.TypeScript5.TSNonNullExpression").properties({
          expression: _.Term}),
      (_: any) => _.TSInstantiationExpression.name("Expressions.TypeScript.TypeScript5.TSInstantiationExpression").properties({
          expression: _.Term, typeArguments: _.TSTypeParameterInstantiation}),
      // patterns
      (_: any) => _.ArrayPattern.name("Expressions.TypeScript.TypeScript5.ArrayPattern").properties({
          decorators: many(_.Decorator), elements: many(_.Pattern), optional: S.OfBool,
          typeAnnotation: _.TSTypeAnnotation}),
      (_: any) => _.ObjectPattern.name("Expressions.TypeScript.TypeScript5.ObjectPattern").properties({
          decorators: many(_.Decorator), properties: many(_.Pattern), optional: S.OfBool,
          typeAnnotation: _.TSTypeAnnotation}),
      (_: any) => _.AssignmentPattern.name("Expressions.TypeScript.TypeScript5.AssignmentPattern").properties({
          decorators: many(_.Decorator), left: _.Pattern, optional: S.OfBool,
          typeAnnotation: _.TSTypeAnnotation, right: _.Term}),
      (_: any) => _.RestElement.name("Expressions.TypeScript.TypeScript5.RestElement").properties({
          decorators: many(_.Decorator), argument: _.Pattern, optional: S.OfBool,
          typeAnnotation: _.TSTypeAnnotation, value: _.AssignmentPattern}),
      (_: any) => _.TSParameterProperty.name("Expressions.TypeScript.TypeScript5.TSParameterProperty").properties({
          decorators: many(_.Decorator), accessibility: S.OfStr, static: S.OfBool, override: S.OfBool,
          readonly: S.OfBool, parameter: _.Pattern}),
      // helpers: decorators, comments, heritage, annotations and type parameters, an object type's members
      (_: any) => _.Decorator.name("Expressions.TypeScript.TypeScript5.Decorator").properties({expression: _.Term}),
      (_: any) => _.Comment.name("Expressions.TypeScript.TypeScript5.Comment").properties({
          block: S.OfBool, text: S.OfStr, trailing: S.OfBool}),
      (_: any) => _.TSClassImplements.name("Expressions.TypeScript.TypeScript5.TSClassImplements").properties({
          expression: _.Term, typeArguments: _.TSTypeParameterInstantiation}),
      (_: any) => _.TSTypeAnnotation.name("Expressions.TypeScript.TypeScript5.TSTypeAnnotation").properties({
          typeAnnotation: _.Type}),
      (_: any) => _.TSTypeParameter.name("Expressions.TypeScript.TypeScript5.TSTypeParameter").properties({
          const: S.OfBool, isIn: S.OfBool, isOut: S.OfBool, name: _.Identifier, constraint: _.Type,
          default: _.Type}),
      (_: any) => _.TSTypeParameterDeclaration.name("Expressions.TypeScript.TypeScript5.TSTypeParameterDeclaration").properties({
          params: many(_.TSTypeParameter)}),
      (_: any) => _.TSTypeParameterInstantiation.name("Expressions.TypeScript.TypeScript5.TSTypeParameterInstantiation").properties({
          params: many(_.Type)}),
      (_: any) => _.TSPropertySignature.name("Expressions.TypeScript.TypeScript5.TSPropertySignature").properties({
          accessibility: S.OfStr, static: S.OfBool, readonly: S.OfBool, computed: S.OfBool,
          key: _.Term, optional: S.OfBool, typeAnnotation: _.TSTypeAnnotation}),
      (_: any) => _.TSMethodSignature.name("Expressions.TypeScript.TypeScript5.TSMethodSignature").properties({
          accessibility: S.OfStr, static: S.OfBool, readonly: S.OfBool, methodKind: S.OfStr,
          computed: S.OfBool, key: _.Term, optional: S.OfBool,
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Pattern),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSCallSignatureDeclaration.name("Expressions.TypeScript.TypeScript5.TSCallSignatureDeclaration").properties({
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Pattern),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSConstructSignatureDeclaration.name("Expressions.TypeScript.TypeScript5.TSConstructSignatureDeclaration").properties({
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Pattern),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSIndexSignature.name("Expressions.TypeScript.TypeScript5.TSIndexSignature").properties({
          accessibility: S.OfStr, static: S.OfBool, readonly: S.OfBool, parameters: many(_.Pattern),
          typeAnnotation: _.TSTypeAnnotation}),
      // types
      (_: any) => _.TSAnyKeyword.name("Expressions.TypeScript.TypeScript5.TSAnyKeyword"),
      (_: any) => _.TSUnknownKeyword.name("Expressions.TypeScript.TypeScript5.TSUnknownKeyword"),
      (_: any) => _.TSNumberKeyword.name("Expressions.TypeScript.TypeScript5.TSNumberKeyword"),
      (_: any) => _.TSBigIntKeyword.name("Expressions.TypeScript.TypeScript5.TSBigIntKeyword"),
      (_: any) => _.TSBooleanKeyword.name("Expressions.TypeScript.TypeScript5.TSBooleanKeyword"),
      (_: any) => _.TSStringKeyword.name("Expressions.TypeScript.TypeScript5.TSStringKeyword"),
      (_: any) => _.TSSymbolKeyword.name("Expressions.TypeScript.TypeScript5.TSSymbolKeyword"),
      (_: any) => _.TSObjectKeyword.name("Expressions.TypeScript.TypeScript5.TSObjectKeyword"),
      (_: any) => _.TSNeverKeyword.name("Expressions.TypeScript.TypeScript5.TSNeverKeyword"),
      (_: any) => _.TSVoidKeyword.name("Expressions.TypeScript.TypeScript5.TSVoidKeyword"),
      (_: any) => _.TSUndefinedKeyword.name("Expressions.TypeScript.TypeScript5.TSUndefinedKeyword"),
      (_: any) => _.TSNullKeyword.name("Expressions.TypeScript.TypeScript5.TSNullKeyword"),
      (_: any) => _.TSIntrinsicKeyword.name("Expressions.TypeScript.TypeScript5.TSIntrinsicKeyword"),
      (_: any) => _.TSThisType.name("Expressions.TypeScript.TypeScript5.TSThisType"),
      (_: any) => _.TSQualifiedName.name("Expressions.TypeScript.TypeScript5.TSQualifiedName").properties({
          left: _.Type, right: _.Identifier}),
      (_: any) => _.TSTypeReference.name("Expressions.TypeScript.TypeScript5.TSTypeReference").properties({
          typeName: _.Type, typeArguments: _.TSTypeParameterInstantiation}),
      (_: any) => _.TSParenthesizedType.name("Expressions.TypeScript.TypeScript5.TSParenthesizedType").properties({
          typeAnnotation: _.Type}),
      (_: any) => _.TSLiteralType.name("Expressions.TypeScript.TypeScript5.TSLiteralType").properties({literal: _.Type}),
      (_: any) => _.TSTemplateLiteralType.name("Expressions.TypeScript.TypeScript5.TSTemplateLiteralType").properties({
          quasis: many(_.TemplateElement), types: many(_.Type)}),
      (_: any) => _.TSArrayType.name("Expressions.TypeScript.TypeScript5.TSArrayType").properties({elementType: _.Type}),
      (_: any) => _.TSTupleType.name("Expressions.TypeScript.TypeScript5.TSTupleType").properties({
          elementTypes: many(_.Type)}),
      (_: any) => _.TSNamedTupleMember.name("Expressions.TypeScript.TypeScript5.TSNamedTupleMember").properties({
          label: _.Identifier, optional: S.OfBool, elementType: _.Type}),
      (_: any) => _.TSOptionalType.name("Expressions.TypeScript.TypeScript5.TSOptionalType").properties({
          typeAnnotation: _.Type}),
      (_: any) => _.TSRestType.name("Expressions.TypeScript.TypeScript5.TSRestType").properties({typeAnnotation: _.Type}),
      (_: any) => _.TSUnionType.name("Expressions.TypeScript.TypeScript5.TSUnionType").properties({types: many(_.Type)}),
      (_: any) => _.TSIntersectionType.name("Expressions.TypeScript.TypeScript5.TSIntersectionType").properties({
          types: many(_.Type)}),
      (_: any) => _.TSFunctionType.name("Expressions.TypeScript.TypeScript5.TSFunctionType").properties({
          typeParameters: _.TSTypeParameterDeclaration, params: many(_.Pattern),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSConstructorType.name("Expressions.TypeScript.TypeScript5.TSConstructorType").properties({
          abstract: S.OfBool, typeParameters: _.TSTypeParameterDeclaration, params: many(_.Pattern),
          returnType: _.TSTypeAnnotation}),
      (_: any) => _.TSTypeLiteral.name("Expressions.TypeScript.TypeScript5.TSTypeLiteral").properties({
          members: many(_.TypeElement)}),
      (_: any) => _.TSMappedType.name("Expressions.TypeScript.TypeScript5.TSMappedType").properties({
          readonly: S.OfStr, key: _.Identifier, constraint: _.Type, nameType: _.Type,
          optional: S.OfStr, typeAnnotation: _.Type}),
      (_: any) => _.TSIndexedAccessType.name("Expressions.TypeScript.TypeScript5.TSIndexedAccessType").properties({
          objectType: _.Type, indexType: _.Type}),
      (_: any) => _.TSTypeOperator.name("Expressions.TypeScript.TypeScript5.TSTypeOperator").properties({
          operator: S.OfStr, typeAnnotation: _.Type}),
      (_: any) => _.TSTypeQuery.name("Expressions.TypeScript.TypeScript5.TSTypeQuery").properties({
          exprName: _.Type, typeArguments: _.TSTypeParameterInstantiation}),
      (_: any) => _.TSImportType.name("Expressions.TypeScript.TypeScript5.TSImportType").properties({
          source: _.Type, options: _.Type, qualifier: _.Type,
          typeArguments: _.TSTypeParameterInstantiation}),
      (_: any) => _.TSConditionalType.name("Expressions.TypeScript.TypeScript5.TSConditionalType").properties({
          checkType: _.Type, extendsType: _.Type, trueType: _.Type, falseType: _.Type}),
      (_: any) => _.TSInferType.name("Expressions.TypeScript.TypeScript5.TSInferType").properties({
          typeParameter: _.TSTypeParameter}),
      (_: any) => _.TSTypePredicate.name("Expressions.TypeScript.TypeScript5.TSTypePredicate").properties({
          asserts: S.OfBool, parameterName: _.Type, typeAnnotation: _.TSTypeAnnotation}),
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
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([  // a branch added: schema extension
          (t: any) => t.name("typescript5").schema([_.Term])]),
    ])]))]);
}

// --- Reading a term with its helpers nested ---

/** A term or a helper, its helpers nested (`Terms.Node`). */
export const Node = F.Node;
export type Node = F.Node;

/** A helper property's nodes: one, or each of many. */
function nodes(value: Node | readonly Node[] | undefined): readonly Node[] {
  if (value === undefined) return [];
  return value instanceof Node ? [value] : value;
}

/** A TypeScript5 term's `Node`, its helpers nested: its patterns, types and JSX among them. */
export function tree(term: any): Node {
  const [tag, record] = DIALECT.kind(term);
  return recordNode(tag, record);
}

function recordNode(tag: string, record: any): Node {
  return F.node(tag, record);
}

/** The names a pattern binds, a term's or a `Node`'s: an identifier's, and those within an array, an object, a default,
 * a rest or a parameter property; a member, or any other target, binds none. */
export function bindingNames(node: any): ReadonlySet<string> {
  if (node === null || node === undefined) return new Set();
  if (!(node instanceof Node)) {
    const [tag, record] = F.kindOf(node);
    node = recordNode(tag, record);
  }
  if (node.kind === IDENTIFIER) return new Set(node.attributes.has("name") ? [node.attributes.get("name")] : []);
  if (node.kind === PROPERTY) return bindingNames(node.slots.get("value"));
  const found = new Set<string>();
  for (const name of ["elements", "properties", "left", "argument", "parameter"]) {
    for (const inner of nodes(node.helpers.get(name))) for (const bound of bindingNames(inner)) found.add(bound);
  }
  return found;
}

// --- Checks ---

/** Python's `str.isidentifier()`, as mbse-programs checks a name, `$` among its letters. */
function isIdentifier(text: string): boolean {
  return /^[\p{XID_Start}_]\p{XID_Continue}*$/u.test(text.replaceAll("$", "_"));
}

function identifierProblems(what: string, value: unknown): string[] {
  if (typeof value === "string" && value !== "" && !isIdentifier(value)) {
    return [`${F.article(what)}'s name cannot be ${repr(value)}`];
  }
  return [];
}

/** A literal's spelling: a string's quote, a number's base. */
function literalProblems(attributes: ReadonlyMap<string, any>): string[] {
  const quote = attributes.get("quote");
  const base = attributes.get("base");
  const problems = quote === undefined || QUOTES.includes(quote) ? [] : [`a literal's quote cannot be ${repr(quote)}`];
  if (base !== undefined && ![2n, 8n, 10n, 16n].includes(base)) problems.push(`a literal's base cannot be ${repr(base)}`);
  return problems;
}

/** A constant holds `null` or a regular expression, its `pattern` at least, its flags among `FLAGS`, each once. */
function constantProblems(attributes: ReadonlyMap<string, any>): string[] {
  const singleton = attributes.get("singleton");
  const regex = attributes.has("pattern") || attributes.has("flags");
  if (singleton === undefined && !regex) { // unless its text is invalid, its problems said
    return attributes.has("problems") ? [] : ["a constant needs a singleton or a regular expression"];
  }
  if (singleton !== undefined && regex) return ["a constant holds a singleton or a regular expression, not both"];
  if (singleton !== undefined) return singleton === "null" ? [] : [`a constant's singleton must be null, got ${repr(singleton)}`];
  if (!attributes.has("pattern")) return ["a regular expression needs a pattern"];
  const flags = String(attributes.get("flags") ?? "");
  if ([...flags].some((flag) => !FLAGS.includes(flag)) || new Set(flags).size !== flags.length) {
    return [`a regular expression's flags cannot be ${repr(flags)}`];
  }
  return [];
}

function needs(node: Node, count: number, least: number, what: string): string[] {
  return count >= least ? [] : [`${F.article(node.kind)} needs ${what}`];
}

/** A node's own checks, as mbse-programs has them: names, quasis, unions and lists that need members. */
function nodeProblems(node: Node): string[] {
  const { kind, attributes } = node;
  if (F.INVALID_KINDS.has(kind)) return F.invalidProblems(kind, attributes); // invalid syntax in a type or a pattern
  if (kind === IDENTIFIER || kind === PRIVATEIDENTIFIER) return identifierProblems(kind, attributes.get("name"));
  if (kind === LITERAL) return literalProblems(attributes);
  if (kind === TEMPLATELITERAL || kind === "tstemplateliteraltype") {
    const quasis = nodes(node.helpers.get("quasis")).length;
    const held = kind === TEMPLATELITERAL ? node.many.length : nodes(node.helpers.get("types")).length;
    const what = kind === TEMPLATELITERAL ? "expressions" : "types";
    return quasis === held + 1 ? [] : [`${F.article(kind)} needs one more quasi than ${what}`];
  }
  if (kind === SEQUENCEEXPRESSION) return needs(node, node.many.length, 2, "two expressions");
  if (kind === "tsuniontype" || kind === "tsintersectiontype") {
    return needs(node, nodes(node.helpers.get("types")).length, 2, "two types");
  }
  if (kind === "tstypeparameterdeclaration") return needs(node, nodes(node.helpers.get("params")).length, 1, "a type parameter");
  return [];
}

/** A node's checks, and its helpers' in turn: what the framework's validation does not read within a helper. */
function problemsOf(node: Node): string[] {
  const problems = nodeProblems(node);
  for (const value of node.helpers.values()) for (const inner of nodes(value)) problems.push(...problemsOf(inner));
  return problems;
}

function check(tag: string): (record: any) => string[] {
  return (record: any) => {
    const node = recordNode(tag, record);
    return [...problemsOf(node), ...(tag === CONSTANT ? constantProblems(node.attributes) : [])];
  };
}

// --- What each kind binds ---

/** The names each of a node's arguments has bound, in order: a member's property and a key, where not computed, its own
 * name, since it names what it reads rather than refers to a binding; then its helpers' arguments in turn. */
function bound(node: Node, inner: ReadonlySet<string>): ReadonlySet<string>[] {
  const found: ReadonlySet<string>[] = [];
  for (const [name, argument] of node.slots) {
    const named = (name === "property" && node.kind === MEMBEREXPRESSION)
      || (name === "key" && [PROPERTY, "tspropertysignature", "tsmethodsignature"].includes(node.kind));
    if (named && !node.attributes.get("computed") && argument !== null && F.kindOf(argument)[0] === IDENTIFIER) {
      found.push(new Set([...inner, F.nameOf(argument)]));
    } else {
      found.push(inner);
    }
  }
  for (let i = 0; i < node.many.length; i++) found.push(inner);
  for (const value of node.helpers.values()) for (const helper of nodes(value)) found.push(...bound(helper, inner));
  return found;
}

/** What each argument of a kind has bound: a function's or an arrow's parameters within it (its parameters' defaults
 * among it), and names that are not references (`bound`). */
function scopes(tag: string): (record: any) => ReadonlySet<string>[] {
  return (record: any) => {
    const node = recordNode(tag, record);
    const inner = new Set<string>();
    if ([ARROWFUNCTIONEXPRESSION, FUNCTIONEXPRESSION, TSEMPTYBODYFUNCTIONEXPRESSION].includes(tag)) {
      for (const parameter of nodes(node.helpers.get("params"))) for (const name of bindingNames(parameter)) inner.add(name);
    }
    return bound(node, inner);
  };
}

/** The literal of a native value: a boolean, a number (a float), a bigint (an int) or a string; a bytes has none. */
function native(value: unknown): F.Writer | null {
  if (value instanceof Uint8Array) return null;
  return new F.Writer((u: any) => u[LITERAL]((r: any) => r.value((p: any) => p.as_scalar(value))), "typescript5");
}

const ANY = new FD.Function([FD.Anything], FD.Anything);
const ANY2 = new FD.Function([FD.Anything, FD.Anything], FD.Anything);

function application(tag: string, signature: FD.Signature = new FD.Opaque(), standards: readonly string[] = STANDARDS,
  options: F.KindOptions = {}): F.Kind {
  return new F.Kind(F.APPLICATION, { signature, standards, check: check(tag), scopes: scopes(tag), ...options });
}

function operatorKind(tag: string, vocabulary: ReadonlyMap<string, FD.Signature>,
  required: readonly string[] = ["operator"]): F.Kind {
  return new F.Kind(F.APPLICATION, { operator: "operator", vocabulary, required, standards: STANDARDS,
    check: check(tag), scopes: scopes(tag) });
}

/** The TypeScript5 dialect: its kinds, as the framework reads them. */
export const DIALECT: F.Dialect = new F.Dialect("TypeScript.TypeScript5", {
  [IDENTIFIER]: new F.Kind(F.REFERENCE, { required: ["name"], check: check(IDENTIFIER), standards: STANDARDS }),
  [PRIVATEIDENTIFIER]: new F.Kind(F.REFERENCE, { required: ["name"], lexical: false, check: check(PRIVATEIDENTIFIER),
    standards: STANDARDS }),
  [LITERAL]: new F.Kind(F.LITERAL, { spelling: ["text", "problems", "quote", "base", "separators"], check: check(LITERAL),
    standards: STANDARDS }),
  [CONSTANT]: new F.Kind(F.LITERAL, { spelling: ["text", "problems"], check: check(CONSTANT),
    typed: (record) => Domains.constant(F.attributesOf(record)), standards: STANDARDS }),
  [TEMPLATELITERAL]: application(TEMPLATELITERAL, new FD.Opaque(Domains.String)),
  [TAGGEDTEMPLATEEXPRESSION]: application(TAGGEDTEMPLATEEXPRESSION, new FD.Opaque(), STANDARDS, { required: ["quasi"] }),
  [THISEXPRESSION]: new F.Kind(F.REFERENCE, { lexical: false, standards: STANDARDS }),
  [SUPER]: new F.Kind(F.REFERENCE, { lexical: false, standards: STANDARDS }),
  [PARENTHESIZEDEXPRESSION]: application(PARENTHESIZEDEXPRESSION, ANY),
  [ELISION]: application(ELISION),
  [SPREADELEMENT]: application(SPREADELEMENT, ANY),
  [ARRAYEXPRESSION]: application(ARRAYEXPRESSION),
  [PROPERTY]: application(PROPERTY),
  [OBJECTEXPRESSION]: application(OBJECTEXPRESSION),
  [FUNCTIONEXPRESSION]: application(FUNCTIONEXPRESSION),
  [ARROWFUNCTIONEXPRESSION]: application(ARROWFUNCTIONEXPRESSION, new FD.Opaque(), STANDARDS, { optional: ["body"] }),
  [CLASSEXPRESSION]: application(CLASSEXPRESSION, new FD.Opaque(), STANDARDS, { optional: ["superClass"] }),
  [TSEMPTYBODYFUNCTIONEXPRESSION]: application(TSEMPTYBODYFUNCTIONEXPRESSION),
  [METAPROPERTY]: application(METAPROPERTY, new FD.Opaque(), STANDARDS, { required: ["meta", "property"] }),
  [MEMBEREXPRESSION]: application(MEMBEREXPRESSION, ANY2),
  [CALLEXPRESSION]: application(CALLEXPRESSION),
  [CHAINEXPRESSION]: application(CHAINEXPRESSION, ANY),
  [NEWEXPRESSION]: application(NEWEXPRESSION),
  [IMPORTEXPRESSION]: application(IMPORTEXPRESSION, new FD.Opaque(), STANDARDS, { optional: ["options"] }),
  [UPDATEEXPRESSION]: operatorKind(UPDATEEXPRESSION, Domains.UPDATE),
  [UNARYEXPRESSION]: operatorKind(UNARYEXPRESSION, Domains.UNARY),
  [AWAITEXPRESSION]: application(AWAITEXPRESSION, ANY),
  [BINARYEXPRESSION]: operatorKind(BINARYEXPRESSION, Domains.BINARY),
  [LOGICALEXPRESSION]: operatorKind(LOGICALEXPRESSION, Domains.LOGICAL),
  [CONDITIONALEXPRESSION]: application(CONDITIONALEXPRESSION,
    new FD.Function([FD.Anything, FD.Anything, FD.Anything], FD.Anything)),
  [ASSIGNMENTEXPRESSION]: operatorKind(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT, ["left", "operator"]),
  [SEQUENCEEXPRESSION]: application(SEQUENCEEXPRESSION),
  [YIELDEXPRESSION]: application(YIELDEXPRESSION, new FD.Opaque(), STANDARDS, { optional: ["argument"] }),
  [TSASEXPRESSION]: application(TSASEXPRESSION, new FD.Opaque(), STANDARDS, { required: ["typeAnnotation"] }),
  [TSSATISFIESEXPRESSION]: application(TSSATISFIESEXPRESSION, new FD.Opaque(), STANDARDS, { required: ["typeAnnotation"] }),
  [TSTYPEASSERTION]: application(TSTYPEASSERTION, new FD.Opaque(), STANDARDS, { required: ["typeAnnotation"] }),
  [TSNONNULLEXPRESSION]: application(TSNONNULLEXPRESSION, ANY),
  [TSINSTANTIATIONEXPRESSION]: application(TSINSTANTIATIONEXPRESSION, new FD.Opaque(), STANDARDS, { required: ["typeArguments"] }),
  [ARRAYPATTERN]: application(ARRAYPATTERN),
  [OBJECTPATTERN]: application(OBJECTPATTERN),
  [ASSIGNMENTPATTERN]: application(ASSIGNMENTPATTERN),
  [JSXELEMENT]: application(JSXELEMENT, new FD.Opaque(), [], { required: ["openingElement"] }),
  [JSXFRAGMENT]: application(JSXFRAGMENT, new FD.Opaque(), []),
  [JSXEMPTYEXPRESSION]: application(JSXEMPTYEXPRESSION, new FD.Opaque(), []),
}, { domain_of: Domains.of, literal: native });
