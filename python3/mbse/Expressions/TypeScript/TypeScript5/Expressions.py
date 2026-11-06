"""Expressions of the TypeScript5 dialect: every expression of TypeScript 5, 5.0 to 5.9, and the JavaScript it holds,
as typescript-estree has them, in mbse-programs' names and shapes, with the sublanguages expressions hold: types,
destructuring patterns and JSX.

The dialect is complete over TypeScript 5's expression syntax (mbse-basis
[CAP-228: the TypeScript5 expression dialect](mbse:mbse-basis/docs/capabilities/CAP-228.md), by
[CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules). Its terms are values of
its `Term`, `Expressions.TypeScript.TypeScript5.Term`, the branch `typescript5` of `Expressions.Framework.Term`, which `install`
defines and adds to `Expressions.Framework.Term` by schema extension. Its kinds are named as mbse-programs names them
(`mbse:mbse-programs/python3/mbse/Programs/TypeScript/Syntax.py`), which is as typescript-estree names them, lowercased
as branch tags (`binaryexpression`, `tsasexpression`), each a value object `Expressions.TypeScript.TypeScript5.<Kind>` with
mbse-programs' properties in source order (`isAsync` for estree's `async`, `propertyKind` for its `kind`). A term
carries no domain. Its kinds:

- Names and literals: `identifier` (`decorators`, `name`, `optional`, `typeAnnotation`, as a parameter has them),
  `privateidentifier` (`#name`), `literal` (`Expressions.TypeScript.TypeScript5.Literal`, refining the framework's `literal`, mbse-basis
  [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md): a boolean, a number, a float, a bigint,
  an int, or a string, with what its text encodes, mbse-basis
  [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): `quote`, `base` and `separators`),
  `constant`, TypeScript5's own, for what no schema holds (`null`, its `singleton`, and a regular expression, its
  `pattern` and `flags`), with its spelling too; `templateliteral` (`quasis`, each a `templateelement`, and
  `expressions`), `taggedtemplateexpression`, `thisexpression`, `super`; `parenthesizedexpression`, parentheses written in
  the source; `undefined` is an `identifier`, as in TypeScript.
- Displays: `arrayexpression`, the framework's `list` (its `elements`, any term: an `elision` for a hole, a
  `spreadelement` for `...x`), `objectexpression` (`properties`, each a `property` or a `spreadelement`).
- Functions and classes: `functionexpression`, `arrowfunctionexpression`, `classexpression`,
  `tsemptybodyfunctionexpression`; a body of statements is not part of the term (the dialects proposal, Decided, 5,
  "(i)"): it is absent, and mbse-programs relates its statements to what holds the expression. An arrow whose body is an
  expression holds it as its `body`, a term; one whose `body` is absent has a block of statements.
- Operators and access: `metaproperty`, `memberexpression`, `callexpression`, `chainexpression`, `newexpression`,
  `importexpression`, `updateexpression`, `unaryexpression`, `awaitexpression`, `binaryexpression`,
  `logicalexpression`, `conditionalexpression`, `assignmentexpression`, `sequenceexpression`, `yieldexpression`.
- TypeScript's own: `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`, `tsnonnullexpression`,
  `tsinstantiationexpression`.
- The patterns typescript-estree's expressions hold (`arraypattern`, `objectpattern`, `assignmentpattern`), so that a
  `property`'s value holds a pattern where an object pattern holds it.
- JSX, an extension outside every version, as mbse-programs marks it (`EXTENSIONS`): `jsxelement`, `jsxfragment` and
  `jsxemptyexpression`, with their helpers.
- The framework's kinds of invalid syntax, `error` and `missing`.

The sublanguages are unions of their own beside `Term` (the dialects proposal, Decided, 5): `Expressions.TypeScript.TypeScript5.Type`,
TypeScript's type nodes, held by what holds a type (`x as T`, `x satisfies T`, `<T>x`, a call's type arguments); and
`Expressions.TypeScript.TypeScript5.Pattern`, destructuring patterns, held by a function's parameters and an assignment's target.
As the user decided ("(b) as you recommended"), one schema is a branch of every union whose positions hold it: `Pattern`
lists, beside its own kinds, the terms a target may be (`identifier`, `memberexpression`, `parenthesizedexpression`,
`tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`, `tsnonnullexpression`), and `Type` lists the terms a type
holds (`identifier` and `thisexpression` for an entity name, `literal`, `unaryexpression` and `templateliteral` for a
literal type, `objectexpression` for an import type's options). Each holds invalid syntax too (the framework's `error`
and `missing`), as every dialect's `Type` and `Pattern` do. Which terms are allowed where, beyond that, is a
constraint. Names that only declare (a mapped type's `key`, a tuple member's `label`, a type parameter's `name`, a
qualified name's `right`) are `Identifier`s, as mbse-programs has them ("yes, stay `Identifier` terms"). The framework
reads a value of a sublanguage, as of any helper, as a `Terms.Part`.

Each kind's `Kind` records the TypeScript versions that have it (`standards`, `STANDARDS`, 5.0 to 5.9, every kind
being older; none for an extension). `DIALECT` reads them (`Terms.Dialect`). There are no writers: a TypeScript5 term
is written through the builders, in a transaction (mbse-basis
[PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)). `tree(term)` reads a term with its
helpers nested, as its printer and its checks read it.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "EXTENSIONS", "STANDARDS", "QUOTES", "FLAGS", "Node", "tree", "binding_names"]

IDENTIFIER, PRIVATEIDENTIFIER, LITERAL, CONSTANT = "identifier", "privateidentifier", "literal", "constant"
TEMPLATELITERAL, TAGGEDTEMPLATEEXPRESSION, THISEXPRESSION, SUPER = (
    "templateliteral", "taggedtemplateexpression", "thisexpression", "super")
PARENTHESIZEDEXPRESSION, ELISION, SPREADELEMENT, ARRAYEXPRESSION = (
    "parenthesizedexpression", "elision", "spreadelement", "arrayexpression")
PROPERTY, OBJECTEXPRESSION, FUNCTIONEXPRESSION, ARROWFUNCTIONEXPRESSION = (
    "property", "objectexpression", "functionexpression", "arrowfunctionexpression")
CLASSEXPRESSION, TSEMPTYBODYFUNCTIONEXPRESSION, METAPROPERTY, MEMBEREXPRESSION = (
    "classexpression", "tsemptybodyfunctionexpression", "metaproperty", "memberexpression")
CALLEXPRESSION, CHAINEXPRESSION, NEWEXPRESSION, IMPORTEXPRESSION = (
    "callexpression", "chainexpression", "newexpression", "importexpression")
UPDATEEXPRESSION, UNARYEXPRESSION, AWAITEXPRESSION, BINARYEXPRESSION = (
    "updateexpression", "unaryexpression", "awaitexpression", "binaryexpression")
LOGICALEXPRESSION, CONDITIONALEXPRESSION, ASSIGNMENTEXPRESSION, SEQUENCEEXPRESSION = (
    "logicalexpression", "conditionalexpression", "assignmentexpression", "sequenceexpression")
YIELDEXPRESSION, TSASEXPRESSION, TSSATISFIESEXPRESSION, TSTYPEASSERTION = (
    "yieldexpression", "tsasexpression", "tssatisfiesexpression", "tstypeassertion")
TSNONNULLEXPRESSION, TSINSTANTIATIONEXPRESSION = "tsnonnullexpression", "tsinstantiationexpression"
ARRAYPATTERN, OBJECTPATTERN, ASSIGNMENTPATTERN, RESTELEMENT = (
    "arraypattern", "objectpattern", "assignmentpattern", "restelement")
JSXELEMENT, JSXFRAGMENT, JSXEMPTYEXPRESSION = "jsxelement", "jsxfragment", "jsxemptyexpression"

EXTENSIONS = frozenset({JSXELEMENT, JSXFRAGMENT, JSXEMPTYEXPRESSION})
"""JSX, an extension outside every version of TypeScript, which a `.tsx` file accepts (mbse-programs marks it so)."""

STANDARDS = tuple(f"TypeScript 5.{minor}" for minor in range(10))
"""The versions of TypeScript 5 the dialect covers, by their published names, 5.0 to 5.9."""

QUOTES = ("'", '"')
"""A string's quotes, as TypeScript writes them."""

FLAGS = "dgimsuvy"
"""A regular expression's flags, as ECMAScript 2025 has them."""


def install(txn: Any) -> Any:
    """TypeScript5's union of its kinds, added to the framework's terms as the branch `typescript5`, its own kinds, its
    sublanguages' unions (`Type`, `Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
    `Expressions.TypeScript.TypeScript5`: run after `Framework.install`, in a transaction of its own; run again, it writes nothing.
    Its holder, `Expressions.TypeScript.TypeScript5.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
    its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.TypeScript.TypeScript5/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Type": S.OfUnion, "Pattern": S.OfUnion, "TypeElement": S.OfUnion, "JSXTagNameExpression": S.OfUnion,
                  "JSXAttributeName": S.OfUnion, "JSXAttributeValue": S.OfUnion, "JSXAttributeItem": S.OfUnion,
                  "JSXChild": S.OfUnion, "Expression": S.OfObject,
                  "Identifier": S.OfObject, "PrivateIdentifier": S.OfObject, "Literal": S.OfObject,
                  "Constant": S.OfObject, "TemplateElement": S.OfObject, "TemplateLiteral": S.OfObject,
                  "TaggedTemplateExpression": S.OfObject, "ThisExpression": S.OfObject, "Super": S.OfObject,
                  "ParenthesizedExpression": S.OfObject, "Elision": S.OfObject, "SpreadElement": S.OfObject,
                  "Property": S.OfObject, "ObjectExpression": S.OfObject, "FunctionExpression": S.OfObject,
                  "ArrowFunctionExpression": S.OfObject, "ClassExpression": S.OfObject,
                  "TSEmptyBodyFunctionExpression": S.OfObject, "MetaProperty": S.OfObject,
                  "MemberExpression": S.OfObject, "CallExpression": S.OfObject, "ChainExpression": S.OfObject,
                  "NewExpression": S.OfObject, "ImportExpression": S.OfObject, "UpdateExpression": S.OfObject,
                  "UnaryExpression": S.OfObject, "AwaitExpression": S.OfObject, "BinaryExpression": S.OfObject,
                  "LogicalExpression": S.OfObject, "ConditionalExpression": S.OfObject,
                  "AssignmentExpression": S.OfObject, "SequenceExpression": S.OfObject,
                  "YieldExpression": S.OfObject, "TSAsExpression": S.OfObject, "TSSatisfiesExpression": S.OfObject,
                  "TSTypeAssertion": S.OfObject, "TSNonNullExpression": S.OfObject,
                  "TSInstantiationExpression": S.OfObject, "ArrayPattern": S.OfObject, "ObjectPattern": S.OfObject,
                  "AssignmentPattern": S.OfObject, "RestElement": S.OfObject, "TSParameterProperty": S.OfObject,
                  "Decorator": S.OfObject, "Comment": S.OfObject, "TSClassImplements": S.OfObject,
                  "TSTypeAnnotation": S.OfObject, "TSTypeParameter": S.OfObject,
                  "TSTypeParameterDeclaration": S.OfObject, "TSTypeParameterInstantiation": S.OfObject,
                  "TSPropertySignature": S.OfObject, "TSMethodSignature": S.OfObject,
                  "TSCallSignatureDeclaration": S.OfObject, "TSConstructSignatureDeclaration": S.OfObject,
                  "TSIndexSignature": S.OfObject,
                  "TSAnyKeyword": S.OfObject, "TSUnknownKeyword": S.OfObject, "TSNumberKeyword": S.OfObject,
                  "TSBigIntKeyword": S.OfObject, "TSBooleanKeyword": S.OfObject, "TSStringKeyword": S.OfObject,
                  "TSSymbolKeyword": S.OfObject, "TSObjectKeyword": S.OfObject, "TSNeverKeyword": S.OfObject,
                  "TSVoidKeyword": S.OfObject, "TSUndefinedKeyword": S.OfObject, "TSNullKeyword": S.OfObject,
                  "TSIntrinsicKeyword": S.OfObject, "TSThisType": S.OfObject, "TSQualifiedName": S.OfObject,
                  "TSTypeReference": S.OfObject, "TSParenthesizedType": S.OfObject, "TSLiteralType": S.OfObject,
                  "TSTemplateLiteralType": S.OfObject, "TSArrayType": S.OfObject, "TSTupleType": S.OfObject,
                  "TSNamedTupleMember": S.OfObject, "TSOptionalType": S.OfObject, "TSRestType": S.OfObject,
                  "TSUnionType": S.OfObject, "TSIntersectionType": S.OfObject, "TSFunctionType": S.OfObject,
                  "TSConstructorType": S.OfObject, "TSTypeLiteral": S.OfObject, "TSMappedType": S.OfObject,
                  "TSIndexedAccessType": S.OfObject, "TSTypeOperator": S.OfObject, "TSTypeQuery": S.OfObject,
                  "TSImportType": S.OfObject, "TSConditionalType": S.OfObject, "TSInferType": S.OfObject,
                  "TSTypePredicate": S.OfObject,
                  "JSXIdentifier": S.OfObject, "JSXNamespacedName": S.OfObject, "JSXMemberExpression": S.OfObject,
                  "JSXEmptyExpression": S.OfObject, "JSXExpressionContainer": S.OfObject,
                  "JSXSpreadChild": S.OfObject, "JSXText": S.OfObject, "JSXAttribute": S.OfObject,
                  "JSXSpreadAttribute": S.OfObject, "JSXOpeningElement": S.OfObject, "JSXClosingElement": S.OfObject,
                  "JSXElement": S.OfObject, "JSXOpeningFragment": S.OfObject, "JSXClosingFragment": S.OfObject,
                  "JSXFragment": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.TypeScript.TypeScript5`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.TypeScript.TypeScript5.Dialect").ref(True).singleton("Expressions.TypeScript.TypeScript5").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "uses": lambda a: a.relation([Framework.Uses]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("typescript5").schema([_.Dialect])]),
            # its union of its kinds: its own, the framework's it reuses, the patterns expressions hold, JSX, and
            # invalid syntax
            lambda _: _.Term.name("Expressions.TypeScript.TypeScript5.Term").branches([
                lambda t: t.name("identifier").schema([_.Identifier]),
                lambda t: t.name("privateidentifier").schema([_.PrivateIdentifier]),
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("constant").schema([_.Constant]),
                lambda t: t.name("templateliteral").schema([_.TemplateLiteral]),
                lambda t: t.name("taggedtemplateexpression").schema([_.TaggedTemplateExpression]),
                lambda t: t.name("thisexpression").schema([_.ThisExpression]),
                lambda t: t.name("super").schema([_.Super]),
                lambda t: t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
                lambda t: t.name("elision").schema([_.Elision]),
                lambda t: t.name("spreadelement").schema([_.SpreadElement]),
                lambda t: t.name("arrayexpression").schema([Framework.List]),
                lambda t: t.name("property").schema([_.Property]),
                lambda t: t.name("objectexpression").schema([_.ObjectExpression]),
                lambda t: t.name("functionexpression").schema([_.FunctionExpression]),
                lambda t: t.name("arrowfunctionexpression").schema([_.ArrowFunctionExpression]),
                lambda t: t.name("classexpression").schema([_.ClassExpression]),
                lambda t: t.name("tsemptybodyfunctionexpression").schema([_.TSEmptyBodyFunctionExpression]),
                lambda t: t.name("metaproperty").schema([_.MetaProperty]),
                lambda t: t.name("memberexpression").schema([_.MemberExpression]),
                lambda t: t.name("callexpression").schema([_.CallExpression]),
                lambda t: t.name("chainexpression").schema([_.ChainExpression]),
                lambda t: t.name("newexpression").schema([_.NewExpression]),
                lambda t: t.name("importexpression").schema([_.ImportExpression]),
                lambda t: t.name("updateexpression").schema([_.UpdateExpression]),
                lambda t: t.name("unaryexpression").schema([_.UnaryExpression]),
                lambda t: t.name("awaitexpression").schema([_.AwaitExpression]),
                lambda t: t.name("binaryexpression").schema([_.BinaryExpression]),
                lambda t: t.name("logicalexpression").schema([_.LogicalExpression]),
                lambda t: t.name("conditionalexpression").schema([_.ConditionalExpression]),
                lambda t: t.name("assignmentexpression").schema([_.AssignmentExpression]),
                lambda t: t.name("sequenceexpression").schema([_.SequenceExpression]),
                lambda t: t.name("yieldexpression").schema([_.YieldExpression]),
                lambda t: t.name("tsasexpression").schema([_.TSAsExpression]),
                lambda t: t.name("tssatisfiesexpression").schema([_.TSSatisfiesExpression]),
                lambda t: t.name("tstypeassertion").schema([_.TSTypeAssertion]),
                lambda t: t.name("tsnonnullexpression").schema([_.TSNonNullExpression]),
                lambda t: t.name("tsinstantiationexpression").schema([_.TSInstantiationExpression]),
                lambda t: t.name("arraypattern").schema([_.ArrayPattern]),
                lambda t: t.name("objectpattern").schema([_.ObjectPattern]),
                lambda t: t.name("assignmentpattern").schema([_.AssignmentPattern]),
                lambda t: t.name("jsxelement").schema([_.JSXElement]),
                lambda t: t.name("jsxfragment").schema([_.JSXFragment]),
                lambda t: t.name("jsxemptyexpression").schema([_.JSXEmptyExpression]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its patterns: what a parameter or an assignment's target binds, and the terms a target may be
            lambda _: _.Pattern.name("Expressions.TypeScript.TypeScript5.Pattern").branches([
                lambda t: t.name("arraypattern").schema([_.ArrayPattern]),
                lambda t: t.name("objectpattern").schema([_.ObjectPattern]),
                lambda t: t.name("assignmentpattern").schema([_.AssignmentPattern]),
                lambda t: t.name("restelement").schema([_.RestElement]),
                lambda t: t.name("identifier").schema([_.Identifier]),
                lambda t: t.name("memberexpression").schema([_.MemberExpression]),
                lambda t: t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
                lambda t: t.name("tsasexpression").schema([_.TSAsExpression]),
                lambda t: t.name("tssatisfiesexpression").schema([_.TSSatisfiesExpression]),
                lambda t: t.name("tstypeassertion").schema([_.TSTypeAssertion]),
                lambda t: t.name("tsnonnullexpression").schema([_.TSNonNullExpression]),
                lambda t: t.name("property").schema([_.Property]),
                lambda t: t.name("elision").schema([_.Elision]),
                lambda t: t.name("tsparameterproperty").schema([_.TSParameterProperty]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its types: TypeScript's type nodes, and the terms a type holds
            lambda _: _.Type.name("Expressions.TypeScript.TypeScript5.Type").branches([
                lambda t: t.name("tsanykeyword").schema([_.TSAnyKeyword]),
                lambda t: t.name("tsunknownkeyword").schema([_.TSUnknownKeyword]),
                lambda t: t.name("tsnumberkeyword").schema([_.TSNumberKeyword]),
                lambda t: t.name("tsbigintkeyword").schema([_.TSBigIntKeyword]),
                lambda t: t.name("tsbooleankeyword").schema([_.TSBooleanKeyword]),
                lambda t: t.name("tsstringkeyword").schema([_.TSStringKeyword]),
                lambda t: t.name("tssymbolkeyword").schema([_.TSSymbolKeyword]),
                lambda t: t.name("tsobjectkeyword").schema([_.TSObjectKeyword]),
                lambda t: t.name("tsneverkeyword").schema([_.TSNeverKeyword]),
                lambda t: t.name("tsvoidkeyword").schema([_.TSVoidKeyword]),
                lambda t: t.name("tsundefinedkeyword").schema([_.TSUndefinedKeyword]),
                lambda t: t.name("tsnullkeyword").schema([_.TSNullKeyword]),
                lambda t: t.name("tsintrinsickeyword").schema([_.TSIntrinsicKeyword]),
                lambda t: t.name("tsthistype").schema([_.TSThisType]),
                lambda t: t.name("tsqualifiedname").schema([_.TSQualifiedName]),
                lambda t: t.name("tstypereference").schema([_.TSTypeReference]),
                lambda t: t.name("tsparenthesizedtype").schema([_.TSParenthesizedType]),
                lambda t: t.name("tsliteraltype").schema([_.TSLiteralType]),
                lambda t: t.name("tstemplateliteraltype").schema([_.TSTemplateLiteralType]),
                lambda t: t.name("tsarraytype").schema([_.TSArrayType]),
                lambda t: t.name("tstupletype").schema([_.TSTupleType]),
                lambda t: t.name("tsnamedtuplemember").schema([_.TSNamedTupleMember]),
                lambda t: t.name("tsoptionaltype").schema([_.TSOptionalType]),
                lambda t: t.name("tsresttype").schema([_.TSRestType]),
                lambda t: t.name("tsuniontype").schema([_.TSUnionType]),
                lambda t: t.name("tsintersectiontype").schema([_.TSIntersectionType]),
                lambda t: t.name("tsfunctiontype").schema([_.TSFunctionType]),
                lambda t: t.name("tsconstructortype").schema([_.TSConstructorType]),
                lambda t: t.name("tstypeliteral").schema([_.TSTypeLiteral]),
                lambda t: t.name("tsmappedtype").schema([_.TSMappedType]),
                lambda t: t.name("tsindexedaccesstype").schema([_.TSIndexedAccessType]),
                lambda t: t.name("tstypeoperator").schema([_.TSTypeOperator]),
                lambda t: t.name("tstypequery").schema([_.TSTypeQuery]),
                lambda t: t.name("tsimporttype").schema([_.TSImportType]),
                lambda t: t.name("tsconditionaltype").schema([_.TSConditionalType]),
                lambda t: t.name("tsinfertype").schema([_.TSInferType]),
                lambda t: t.name("tstypepredicate").schema([_.TSTypePredicate]),
                lambda t: t.name("identifier").schema([_.Identifier]),
                lambda t: t.name("thisexpression").schema([_.ThisExpression]),
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("unaryexpression").schema([_.UnaryExpression]),
                lambda t: t.name("templateliteral").schema([_.TemplateLiteral]),
                lambda t: t.name("objectexpression").schema([_.ObjectExpression]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # an object type's members (typescript-estree's `TypeElement`), comments among them as mbse-programs keeps them
            lambda _: _.TypeElement.name("Expressions.TypeScript.TypeScript5.TypeElement").branches([
                lambda t: t.name("tspropertysignature").schema([_.TSPropertySignature]),
                lambda t: t.name("tsmethodsignature").schema([_.TSMethodSignature]),
                lambda t: t.name("tscallsignaturedeclaration").schema([_.TSCallSignatureDeclaration]),
                lambda t: t.name("tsconstructsignaturedeclaration").schema([_.TSConstructSignatureDeclaration]),
                lambda t: t.name("tsindexsignature").schema([_.TSIndexSignature]),
                lambda t: t.name("comment").schema([_.Comment]),
            ]),
            # names and literals
            lambda _: _.Identifier.name("Expressions.TypeScript.TypeScript5.Identifier").properties({
                "decorators": many(_.Decorator), "name": S.OfStr, "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation}),
            lambda _: _.PrivateIdentifier.name("Expressions.TypeScript.TypeScript5.PrivateIdentifier").properties({"name": S.OfStr}),
            lambda _: _.Literal.name("Expressions.TypeScript.TypeScript5.Literal").refines([Framework.Literal]).properties({
                "quote": S.OfStr,  # a string's quotes: `'` or `"`
                "base": S.OfInt,  # a number's or a bigint's base: 2, 8, 10 or 16
                "separators": S.OfBool,  # whether its digits are grouped by `_`
            }),
            lambda _: _.Constant.name("Expressions.TypeScript.TypeScript5.Constant").properties({
                "singleton": S.OfStr,  # `null`
                "pattern": S.OfStr, "flags": S.OfStr,  # a regular expression's, as written between and after its `/`s
                "text": S.OfStr,  # its spelling, unvalidated
                "problems": many(S.OfStr),  # what is wrong with it
            }),
            lambda _: _.TemplateElement.name("Expressions.TypeScript.TypeScript5.TemplateElement").properties({
                "raw": S.OfStr, "tail": S.OfBool}),
            lambda _: _.TemplateLiteral.name("Expressions.TypeScript.TypeScript5.TemplateLiteral").properties({
                "quasis": many(_.TemplateElement), "expressions": many(_.Term)}),
            lambda _: _.TaggedTemplateExpression.name("Expressions.TypeScript.TypeScript5.TaggedTemplateExpression").properties({
                "tag": _.Term, "typeArguments": _.TSTypeParameterInstantiation, "quasi": _.TemplateLiteral}),
            lambda _: _.ThisExpression.name("Expressions.TypeScript.TypeScript5.ThisExpression"),
            lambda _: _.Super.name("Expressions.TypeScript.TypeScript5.Super"),
            lambda _: _.ParenthesizedExpression.name("Expressions.TypeScript.TypeScript5.ParenthesizedExpression").properties({
                "expression": _.Term}),
            # displays
            lambda _: _.Elision.name("Expressions.TypeScript.TypeScript5.Elision"),
            lambda _: _.SpreadElement.name("Expressions.TypeScript.TypeScript5.SpreadElement").properties({"argument": _.Term}),
            lambda _: _.Property.name("Expressions.TypeScript.TypeScript5.Property").properties({
                "propertyKind": S.OfStr, "computed": S.OfBool, "key": _.Term, "optional": S.OfBool,
                "method": S.OfBool, "shorthand": S.OfBool, "value": _.Term}),
            lambda _: _.ObjectExpression.name("Expressions.TypeScript.TypeScript5.ObjectExpression").properties({
                "properties": many(_.Term)}),
            # functions and classes: a body of statements is not part of the term
            lambda _: _.FunctionExpression.name("Expressions.TypeScript.TypeScript5.FunctionExpression").properties({
                "isAsync": S.OfBool, "generator": S.OfBool, "id": _.Identifier,
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Pattern),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.ArrowFunctionExpression.name("Expressions.TypeScript.TypeScript5.ArrowFunctionExpression").properties({
                "isAsync": S.OfBool, "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Pattern),
                "returnType": _.TSTypeAnnotation, "body": _.Term}),  # absent: a body of statements
            lambda _: _.ClassExpression.name("Expressions.TypeScript.TypeScript5.ClassExpression").properties({
                "decorators": many(_.Decorator), "id": _.Identifier, "typeParameters": _.TSTypeParameterDeclaration,
                "superClass": _.Term, "superTypeArguments": _.TSTypeParameterInstantiation,
                "implements": many(_.TSClassImplements)}),
            lambda _: _.TSEmptyBodyFunctionExpression.name("Expressions.TypeScript.TypeScript5.TSEmptyBodyFunctionExpression").properties({
                "isAsync": S.OfBool, "generator": S.OfBool, "typeParameters": _.TSTypeParameterDeclaration,
                "params": many(_.Pattern), "returnType": _.TSTypeAnnotation}),
            lambda _: _.MetaProperty.name("Expressions.TypeScript.TypeScript5.MetaProperty").properties({
                "meta": _.Identifier, "property": _.Identifier}),
            # operations
            lambda _: _.MemberExpression.name("Expressions.TypeScript.TypeScript5.MemberExpression").properties({
                "object": _.Term, "optional": S.OfBool, "computed": S.OfBool, "property": _.Term}),
            lambda _: _.CallExpression.name("Expressions.TypeScript.TypeScript5.CallExpression").properties({
                "callee": _.Term, "optional": S.OfBool, "typeArguments": _.TSTypeParameterInstantiation,
                "arguments": many(_.Term)}),
            lambda _: _.ChainExpression.name("Expressions.TypeScript.TypeScript5.ChainExpression").properties({"expression": _.Term}),
            lambda _: _.NewExpression.name("Expressions.TypeScript.TypeScript5.NewExpression").properties({
                "callee": _.Term, "typeArguments": _.TSTypeParameterInstantiation, "arguments": many(_.Term)}),
            lambda _: _.ImportExpression.name("Expressions.TypeScript.TypeScript5.ImportExpression").properties({
                "phase": S.OfStr, "source": _.Term, "options": _.Term}),
            lambda _: _.UpdateExpression.name("Expressions.TypeScript.TypeScript5.UpdateExpression").properties({
                "operator": S.OfStr, "prefix": S.OfBool, "argument": _.Term}),
            lambda _: _.UnaryExpression.name("Expressions.TypeScript.TypeScript5.UnaryExpression").properties({
                "operator": S.OfStr, "argument": _.Term}),
            lambda _: _.AwaitExpression.name("Expressions.TypeScript.TypeScript5.AwaitExpression").properties({"argument": _.Term}),
            lambda _: _.BinaryExpression.name("Expressions.TypeScript.TypeScript5.BinaryExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.LogicalExpression.name("Expressions.TypeScript.TypeScript5.LogicalExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.ConditionalExpression.name("Expressions.TypeScript.TypeScript5.ConditionalExpression").properties({
                "test": _.Term, "consequent": _.Term, "alternate": _.Term}),
            lambda _: _.AssignmentExpression.name("Expressions.TypeScript.TypeScript5.AssignmentExpression").properties({
                "left": _.Pattern, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.SequenceExpression.name("Expressions.TypeScript.TypeScript5.SequenceExpression").properties({
                "expressions": many(_.Term)}),
            lambda _: _.YieldExpression.name("Expressions.TypeScript.TypeScript5.YieldExpression").properties({
                "delegate": S.OfBool, "argument": _.Term}),
            # TypeScript's own expressions
            lambda _: _.TSAsExpression.name("Expressions.TypeScript.TypeScript5.TSAsExpression").properties({
                "expression": _.Term, "typeAnnotation": _.Type}),
            lambda _: _.TSSatisfiesExpression.name("Expressions.TypeScript.TypeScript5.TSSatisfiesExpression").properties({
                "expression": _.Term, "typeAnnotation": _.Type}),
            lambda _: _.TSTypeAssertion.name("Expressions.TypeScript.TypeScript5.TSTypeAssertion").properties({
                "typeAnnotation": _.Type, "expression": _.Term}),
            lambda _: _.TSNonNullExpression.name("Expressions.TypeScript.TypeScript5.TSNonNullExpression").properties({
                "expression": _.Term}),
            lambda _: _.TSInstantiationExpression.name("Expressions.TypeScript.TypeScript5.TSInstantiationExpression").properties({
                "expression": _.Term, "typeArguments": _.TSTypeParameterInstantiation}),
            # patterns
            lambda _: _.ArrayPattern.name("Expressions.TypeScript.TypeScript5.ArrayPattern").properties({
                "decorators": many(_.Decorator), "elements": many(_.Pattern), "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation}),
            lambda _: _.ObjectPattern.name("Expressions.TypeScript.TypeScript5.ObjectPattern").properties({
                "decorators": many(_.Decorator), "properties": many(_.Pattern), "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation}),
            lambda _: _.AssignmentPattern.name("Expressions.TypeScript.TypeScript5.AssignmentPattern").properties({
                "decorators": many(_.Decorator), "left": _.Pattern, "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation, "right": _.Term}),
            lambda _: _.RestElement.name("Expressions.TypeScript.TypeScript5.RestElement").properties({
                "decorators": many(_.Decorator), "argument": _.Pattern, "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation, "value": _.AssignmentPattern}),
            lambda _: _.TSParameterProperty.name("Expressions.TypeScript.TypeScript5.TSParameterProperty").properties({
                "decorators": many(_.Decorator), "accessibility": S.OfStr, "static": S.OfBool, "override": S.OfBool,
                "readonly": S.OfBool, "parameter": _.Pattern}),
            # helpers: decorators, comments, heritage, annotations and type parameters, an object type's members
            lambda _: _.Decorator.name("Expressions.TypeScript.TypeScript5.Decorator").properties({"expression": _.Term}),
            lambda _: _.Comment.name("Expressions.TypeScript.TypeScript5.Comment").properties({
                "block": S.OfBool, "text": S.OfStr, "trailing": S.OfBool}),
            lambda _: _.TSClassImplements.name("Expressions.TypeScript.TypeScript5.TSClassImplements").properties({
                "expression": _.Term, "typeArguments": _.TSTypeParameterInstantiation}),
            lambda _: _.TSTypeAnnotation.name("Expressions.TypeScript.TypeScript5.TSTypeAnnotation").properties({
                "typeAnnotation": _.Type}),
            lambda _: _.TSTypeParameter.name("Expressions.TypeScript.TypeScript5.TSTypeParameter").properties({
                "const": S.OfBool, "isIn": S.OfBool, "isOut": S.OfBool, "name": _.Identifier, "constraint": _.Type,
                "default": _.Type}),
            lambda _: _.TSTypeParameterDeclaration.name("Expressions.TypeScript.TypeScript5.TSTypeParameterDeclaration").properties({
                "params": many(_.TSTypeParameter)}),
            lambda _: _.TSTypeParameterInstantiation.name("Expressions.TypeScript.TypeScript5.TSTypeParameterInstantiation").properties({
                "params": many(_.Type)}),
            lambda _: _.TSPropertySignature.name("Expressions.TypeScript.TypeScript5.TSPropertySignature").properties({
                "accessibility": S.OfStr, "static": S.OfBool, "readonly": S.OfBool, "computed": S.OfBool,
                "key": _.Term, "optional": S.OfBool, "typeAnnotation": _.TSTypeAnnotation}),
            lambda _: _.TSMethodSignature.name("Expressions.TypeScript.TypeScript5.TSMethodSignature").properties({
                "accessibility": S.OfStr, "static": S.OfBool, "readonly": S.OfBool, "methodKind": S.OfStr,
                "computed": S.OfBool, "key": _.Term, "optional": S.OfBool,
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Pattern),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSCallSignatureDeclaration.name("Expressions.TypeScript.TypeScript5.TSCallSignatureDeclaration").properties({
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Pattern),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSConstructSignatureDeclaration.name("Expressions.TypeScript.TypeScript5.TSConstructSignatureDeclaration").properties({
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Pattern),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSIndexSignature.name("Expressions.TypeScript.TypeScript5.TSIndexSignature").properties({
                "accessibility": S.OfStr, "static": S.OfBool, "readonly": S.OfBool, "parameters": many(_.Pattern),
                "typeAnnotation": _.TSTypeAnnotation}),
            # types
            lambda _: _.TSAnyKeyword.name("Expressions.TypeScript.TypeScript5.TSAnyKeyword"),
            lambda _: _.TSUnknownKeyword.name("Expressions.TypeScript.TypeScript5.TSUnknownKeyword"),
            lambda _: _.TSNumberKeyword.name("Expressions.TypeScript.TypeScript5.TSNumberKeyword"),
            lambda _: _.TSBigIntKeyword.name("Expressions.TypeScript.TypeScript5.TSBigIntKeyword"),
            lambda _: _.TSBooleanKeyword.name("Expressions.TypeScript.TypeScript5.TSBooleanKeyword"),
            lambda _: _.TSStringKeyword.name("Expressions.TypeScript.TypeScript5.TSStringKeyword"),
            lambda _: _.TSSymbolKeyword.name("Expressions.TypeScript.TypeScript5.TSSymbolKeyword"),
            lambda _: _.TSObjectKeyword.name("Expressions.TypeScript.TypeScript5.TSObjectKeyword"),
            lambda _: _.TSNeverKeyword.name("Expressions.TypeScript.TypeScript5.TSNeverKeyword"),
            lambda _: _.TSVoidKeyword.name("Expressions.TypeScript.TypeScript5.TSVoidKeyword"),
            lambda _: _.TSUndefinedKeyword.name("Expressions.TypeScript.TypeScript5.TSUndefinedKeyword"),
            lambda _: _.TSNullKeyword.name("Expressions.TypeScript.TypeScript5.TSNullKeyword"),
            lambda _: _.TSIntrinsicKeyword.name("Expressions.TypeScript.TypeScript5.TSIntrinsicKeyword"),
            lambda _: _.TSThisType.name("Expressions.TypeScript.TypeScript5.TSThisType"),
            lambda _: _.TSQualifiedName.name("Expressions.TypeScript.TypeScript5.TSQualifiedName").properties({
                "left": _.Type, "right": _.Identifier}),
            lambda _: _.TSTypeReference.name("Expressions.TypeScript.TypeScript5.TSTypeReference").properties({
                "typeName": _.Type, "typeArguments": _.TSTypeParameterInstantiation}),
            lambda _: _.TSParenthesizedType.name("Expressions.TypeScript.TypeScript5.TSParenthesizedType").properties({
                "typeAnnotation": _.Type}),
            lambda _: _.TSLiteralType.name("Expressions.TypeScript.TypeScript5.TSLiteralType").properties({"literal": _.Type}),
            lambda _: _.TSTemplateLiteralType.name("Expressions.TypeScript.TypeScript5.TSTemplateLiteralType").properties({
                "quasis": many(_.TemplateElement), "types": many(_.Type)}),
            lambda _: _.TSArrayType.name("Expressions.TypeScript.TypeScript5.TSArrayType").properties({"elementType": _.Type}),
            lambda _: _.TSTupleType.name("Expressions.TypeScript.TypeScript5.TSTupleType").properties({
                "elementTypes": many(_.Type)}),
            lambda _: _.TSNamedTupleMember.name("Expressions.TypeScript.TypeScript5.TSNamedTupleMember").properties({
                "label": _.Identifier, "optional": S.OfBool, "elementType": _.Type}),
            lambda _: _.TSOptionalType.name("Expressions.TypeScript.TypeScript5.TSOptionalType").properties({
                "typeAnnotation": _.Type}),
            lambda _: _.TSRestType.name("Expressions.TypeScript.TypeScript5.TSRestType").properties({"typeAnnotation": _.Type}),
            lambda _: _.TSUnionType.name("Expressions.TypeScript.TypeScript5.TSUnionType").properties({"types": many(_.Type)}),
            lambda _: _.TSIntersectionType.name("Expressions.TypeScript.TypeScript5.TSIntersectionType").properties({
                "types": many(_.Type)}),
            lambda _: _.TSFunctionType.name("Expressions.TypeScript.TypeScript5.TSFunctionType").properties({
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Pattern),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSConstructorType.name("Expressions.TypeScript.TypeScript5.TSConstructorType").properties({
                "abstract": S.OfBool, "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Pattern),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSTypeLiteral.name("Expressions.TypeScript.TypeScript5.TSTypeLiteral").properties({
                "members": many(_.TypeElement)}),
            lambda _: _.TSMappedType.name("Expressions.TypeScript.TypeScript5.TSMappedType").properties({
                "readonly": S.OfStr, "key": _.Identifier, "constraint": _.Type, "nameType": _.Type,
                "optional": S.OfStr, "typeAnnotation": _.Type}),
            lambda _: _.TSIndexedAccessType.name("Expressions.TypeScript.TypeScript5.TSIndexedAccessType").properties({
                "objectType": _.Type, "indexType": _.Type}),
            lambda _: _.TSTypeOperator.name("Expressions.TypeScript.TypeScript5.TSTypeOperator").properties({
                "operator": S.OfStr, "typeAnnotation": _.Type}),
            lambda _: _.TSTypeQuery.name("Expressions.TypeScript.TypeScript5.TSTypeQuery").properties({
                "exprName": _.Type, "typeArguments": _.TSTypeParameterInstantiation}),
            lambda _: _.TSImportType.name("Expressions.TypeScript.TypeScript5.TSImportType").properties({
                "source": _.Type, "options": _.Type, "qualifier": _.Type,
                "typeArguments": _.TSTypeParameterInstantiation}),
            lambda _: _.TSConditionalType.name("Expressions.TypeScript.TypeScript5.TSConditionalType").properties({
                "checkType": _.Type, "extendsType": _.Type, "trueType": _.Type, "falseType": _.Type}),
            lambda _: _.TSInferType.name("Expressions.TypeScript.TypeScript5.TSInferType").properties({
                "typeParameter": _.TSTypeParameter}),
            lambda _: _.TSTypePredicate.name("Expressions.TypeScript.TypeScript5.TSTypePredicate").properties({
                "asserts": S.OfBool, "parameterName": _.Type, "typeAnnotation": _.TSTypeAnnotation}),
            # JSX, an extension
            lambda _: _.JSXTagNameExpression.name("Expressions.TypeScript.TypeScript5.JSXTagNameExpression").branches([
                lambda t: t.name("jsxidentifier").schema([_.JSXIdentifier]),
                lambda t: t.name("jsxmemberexpression").schema([_.JSXMemberExpression]),
                lambda t: t.name("jsxnamespacedname").schema([_.JSXNamespacedName])]),
            lambda _: _.JSXAttributeName.name("Expressions.TypeScript.TypeScript5.JSXAttributeName").branches([
                lambda t: t.name("jsxidentifier").schema([_.JSXIdentifier]),
                lambda t: t.name("jsxnamespacedname").schema([_.JSXNamespacedName])]),
            lambda _: _.JSXAttributeValue.name("Expressions.TypeScript.TypeScript5.JSXAttributeValue").branches([
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("jsxexpressioncontainer").schema([_.JSXExpressionContainer]),
                lambda t: t.name("jsxelement").schema([_.JSXElement]),
                lambda t: t.name("jsxfragment").schema([_.JSXFragment])]),
            lambda _: _.JSXAttributeItem.name("Expressions.TypeScript.TypeScript5.JSXAttributeItem").branches([
                lambda t: t.name("jsxattribute").schema([_.JSXAttribute]),
                lambda t: t.name("jsxspreadattribute").schema([_.JSXSpreadAttribute])]),
            lambda _: _.JSXChild.name("Expressions.TypeScript.TypeScript5.JSXChild").branches([
                lambda t: t.name("jsxtext").schema([_.JSXText]),
                lambda t: t.name("jsxexpressioncontainer").schema([_.JSXExpressionContainer]),
                lambda t: t.name("jsxspreadchild").schema([_.JSXSpreadChild]),
                lambda t: t.name("jsxelement").schema([_.JSXElement]),
                lambda t: t.name("jsxfragment").schema([_.JSXFragment])]),
            lambda _: _.JSXIdentifier.name("Expressions.TypeScript.TypeScript5.JSXIdentifier").properties({"name": S.OfStr}),
            lambda _: _.JSXNamespacedName.name("Expressions.TypeScript.TypeScript5.JSXNamespacedName").properties({
                "namespace": _.JSXIdentifier, "name": _.JSXIdentifier}),
            lambda _: _.JSXMemberExpression.name("Expressions.TypeScript.TypeScript5.JSXMemberExpression").properties({
                "object": _.JSXTagNameExpression, "property": _.JSXIdentifier}),
            lambda _: _.JSXEmptyExpression.name("Expressions.TypeScript.TypeScript5.JSXEmptyExpression"),
            lambda _: _.JSXExpressionContainer.name("Expressions.TypeScript.TypeScript5.JSXExpressionContainer").properties({
                "expression": _.Term}),
            lambda _: _.JSXSpreadChild.name("Expressions.TypeScript.TypeScript5.JSXSpreadChild").properties({"expression": _.Term}),
            lambda _: _.JSXText.name("Expressions.TypeScript.TypeScript5.JSXText").properties({"raw": S.OfStr}),
            lambda _: _.JSXAttribute.name("Expressions.TypeScript.TypeScript5.JSXAttribute").properties({
                "name": _.JSXAttributeName, "value": _.JSXAttributeValue}),
            lambda _: _.JSXSpreadAttribute.name("Expressions.TypeScript.TypeScript5.JSXSpreadAttribute").properties({
                "argument": _.Term}),
            lambda _: _.JSXOpeningElement.name("Expressions.TypeScript.TypeScript5.JSXOpeningElement").properties({
                "name": _.JSXTagNameExpression, "typeArguments": _.TSTypeParameterInstantiation,
                "attributes": many(_.JSXAttributeItem), "selfClosing": S.OfBool}),
            lambda _: _.JSXClosingElement.name("Expressions.TypeScript.TypeScript5.JSXClosingElement").properties({
                "name": _.JSXTagNameExpression}),
            lambda _: _.JSXElement.name("Expressions.TypeScript.TypeScript5.JSXElement").properties({
                "openingElement": _.JSXOpeningElement, "children": many(_.JSXChild),
                "closingElement": _.JSXClosingElement}),
            lambda _: _.JSXOpeningFragment.name("Expressions.TypeScript.TypeScript5.JSXOpeningFragment"),
            lambda _: _.JSXClosingFragment.name("Expressions.TypeScript.TypeScript5.JSXClosingFragment"),
            lambda _: _.JSXFragment.name("Expressions.TypeScript.TypeScript5.JSXFragment").properties({
                "openingFragment": _.JSXOpeningFragment, "children": many(_.JSXChild),
                "closingFragment": _.JSXClosingFragment}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.TypeScript.TypeScript5.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("typescript5").schema([_.Term])]),
        ])]))])


# --- Reading a term with its helpers nested ---


Node = F.Node
"""A term or a helper, its helpers nested (`Terms.Node`)."""


def tree(term: Any) -> Node:
    """A TypeScript5 term's `Node`, its helpers nested: its patterns, types and JSX among them."""
    tag, record, _ = DIALECT.kind(term)
    return _record_node(tag, record)


def _record_node(tag: str, record: Any) -> Node:
    return F.node(tag, record)


def _nodes(value: Any) -> tuple[Node, ...]:
    """A helper property's nodes: one, or each of many."""
    return value if isinstance(value, tuple) else (value,)


def binding_names(node: Any) -> frozenset[str]:
    """The names a pattern binds, a term's or a `Node`'s: an identifier's, and those within an array, an object, a
    default, a rest or a parameter property; a member, or any other target, binds none."""
    if node is None:
        return frozenset()
    if not isinstance(node, Node):
        tag, record = F.kind_of(node)
        node = _record_node(tag, record)
    if node.kind == IDENTIFIER:
        return frozenset({node.attributes["name"]}) if "name" in node.attributes else frozenset()
    found: frozenset[str] = frozenset()
    if node.kind == PROPERTY:
        return binding_names(node.slots.get("value"))
    for name in ("elements", "properties", "left", "argument", "parameter"):
        for inner in _nodes(node.helpers.get(name, ())):
            found |= binding_names(inner)
    return found


# --- Checks ---


def _identifier_problems(what: str, value: Any) -> list[str]:
    """A name, if a non-empty str, is an identifier (`$` among its letters), as mbse-programs checks it."""
    if type(value) is str and value and not value.replace("$", "_").isidentifier():
        return [f"{F._article(what)}'s name cannot be {value!r}"]
    return []


def _literal_problems(attributes: Mapping[str, Any]) -> list[str]:
    """A literal's spelling: a string's quote, a number's base."""
    quote, base = attributes.get("quote"), attributes.get("base")
    problems = [] if quote is None or quote in QUOTES else [f"a literal's quote cannot be {quote!r}"]
    return problems + ([] if base is None or base in (2, 8, 10, 16) else [f"a literal's base cannot be {base!r}"])


def _constant_problems(attributes: Mapping[str, Any]) -> list[str]:
    """A constant holds `null` or a regular expression, its `pattern` at least, its flags among `FLAGS`, each once."""
    singleton, regex = attributes.get("singleton"), "pattern" in attributes or "flags" in attributes
    if singleton is None and not regex:  # unless its text is invalid, its problems said
        return [] if "problems" in attributes else ["a constant needs a singleton or a regular expression"]
    if singleton is not None and regex:
        return ["a constant holds a singleton or a regular expression, not both"]
    if singleton is not None:
        return [] if singleton == "null" else [f"a constant's singleton must be null, got {singleton!r}"]
    if "pattern" not in attributes:
        return ["a regular expression needs a pattern"]
    flags = str(attributes.get("flags", ""))
    if any(flag not in FLAGS for flag in flags) or len(set(flags)) != len(flags):
        return [f"a regular expression's flags cannot be {flags!r}"]
    return []


def _needs(node: Node, many: tuple[Any, ...], least: int, what: str) -> list[str]:
    return [] if len(many) >= least else [f"{F._article(node.kind)} needs {what}"]


def _node_problems(node: Node) -> list[str]:
    """A node's own checks, as mbse-programs has them: names, quasis, unions and lists that need members."""
    kind, attributes = node.kind, node.attributes
    if kind in F.INVALID_KINDS:  # invalid syntax in a type or a pattern
        return F.invalid_problems(kind, attributes)
    if kind in (IDENTIFIER, PRIVATEIDENTIFIER):
        return _identifier_problems(kind, attributes.get("name"))
    if kind == LITERAL:
        return _literal_problems(attributes)
    if kind == TEMPLATELITERAL or kind == "tstemplateliteraltype":
        quasis = len(_nodes(node.helpers.get("quasis", ())))
        held = len(node.many) if kind == TEMPLATELITERAL else len(_nodes(node.helpers.get("types", ())))
        what = "expressions" if kind == TEMPLATELITERAL else "types"
        return [] if quasis == held + 1 else [f"{F._article(kind)} needs one more quasi than {what}"]
    if kind == SEQUENCEEXPRESSION:
        return _needs(node, node.many, 2, "two expressions")
    if kind in ("tsuniontype", "tsintersectiontype"):
        return _needs(node, _nodes(node.helpers.get("types", ())), 2, "two types")
    if kind == "tstypeparameterdeclaration":
        return _needs(node, _nodes(node.helpers.get("params", ())), 1, "a type parameter")
    return []


def _problems(node: Node) -> list[str]:
    """A node's checks, and its helpers' in turn: what the framework's validation does not read within a helper."""
    problems = _node_problems(node)
    for value in node.helpers.values():
        for inner in _nodes(value):
            problems += _problems(inner)
    return problems


def _check(tag: str) -> Any:
    def check(record: Any) -> list[str]:
        node = _record_node(tag, record)
        problems = _problems(node)
        return problems + (_constant_problems(node.attributes) if tag == CONSTANT else [])

    return check


# --- What each kind binds ---


def _bound(node: Node, inner: frozenset[str]) -> list[frozenset[str]]:
    """The names each of a node's arguments has bound, in order: a member's property and a key, where not computed, its
    own name, since it names what it reads rather than refers to a binding; then its helpers' arguments in turn."""
    found = []
    for name, argument in node.slots.items():
        named = (name == "property" and node.kind == MEMBEREXPRESSION) or (
            name == "key" and node.kind in (PROPERTY, "tspropertysignature", "tsmethodsignature"))
        if named and not node.attributes.get("computed") and argument is not None and F.kind_of(argument)[0] == IDENTIFIER:
            found.append(inner | {F.name_of(argument)})
        else:
            found.append(inner)
    found += [inner] * len(node.many)
    for value in node.helpers.values():
        for helper in _nodes(value):
            found += _bound(helper, inner)
    return found


def _scopes(tag: str) -> Any:
    """What each argument of a kind has bound: a function's or an arrow's parameters within it (its parameters'
    defaults among it), and names that are not references (`_bound`)."""
    def scopes(record: Any) -> list[frozenset[str]]:
        node = _record_node(tag, record)
        inner = frozenset()
        if tag in (ARROWFUNCTIONEXPRESSION, FUNCTIONEXPRESSION, TSEMPTYBODYFUNCTIONEXPRESSION):
            for parameter in _nodes(node.helpers.get("params", ())):
                inner |= binding_names(parameter)
        return _bound(node, inner)

    return scopes


def _native(value: Any) -> F.Writer | None:
    """The literal of a native value: a boolean, a number (a float), a bigint (an int) or a string; a bytes has none."""
    if type(value) is bytes:
        return None
    return F.Writer(lambda u: getattr(u, LITERAL)(lambda r: r.value(lambda p: p.as_scalar(value))), "typescript5")


_ALL = STANDARDS
_ANY = FD.Function((FD.Anything,), FD.Anything)
_ANY2 = FD.Function((FD.Anything, FD.Anything), FD.Anything)


def _application(tag: str, signature: FD.Signature = FD.Opaque(), standards: tuple[str, ...] = _ALL,
                 **options: Any) -> F.Kind:
    return F.Kind(F.APPLICATION, signature=signature, standards=standards, check=_check(tag), scopes=_scopes(tag),
                  **options)


def _operator(tag: str, vocabulary: dict[str, FD.Signature], required: tuple[str, ...] = ("operator",)) -> F.Kind:
    return F.Kind(F.APPLICATION, operator="operator", vocabulary=vocabulary, required=required, standards=_ALL,
                  check=_check(tag), scopes=_scopes(tag))


DIALECT = F.Dialect("TypeScript.TypeScript5", {
    IDENTIFIER: F.Kind(F.REFERENCE, required=("name",), check=_check(IDENTIFIER), standards=_ALL),
    PRIVATEIDENTIFIER: F.Kind(F.REFERENCE, required=("name",), lexical=False, check=_check(PRIVATEIDENTIFIER),
                              standards=_ALL),
    LITERAL: F.Kind(F.LITERAL, spelling=("text", "problems", "quote", "base", "separators"), check=_check(LITERAL),
                    standards=_ALL),
    CONSTANT: F.Kind(F.LITERAL, spelling=("text", "problems"), check=_check(CONSTANT),
                     typed=lambda record: Domains.constant(F.attributes_of(record)), standards=_ALL),
    TEMPLATELITERAL: _application(TEMPLATELITERAL, FD.Opaque(Domains.String)),
    TAGGEDTEMPLATEEXPRESSION: _application(TAGGEDTEMPLATEEXPRESSION, required=("quasi",)),
    THISEXPRESSION: F.Kind(F.REFERENCE, lexical=False, standards=_ALL),
    SUPER: F.Kind(F.REFERENCE, lexical=False, standards=_ALL),
    PARENTHESIZEDEXPRESSION: _application(PARENTHESIZEDEXPRESSION, _ANY),
    ELISION: _application(ELISION),
    SPREADELEMENT: _application(SPREADELEMENT, _ANY),
    ARRAYEXPRESSION: _application(ARRAYEXPRESSION),
    PROPERTY: _application(PROPERTY),
    OBJECTEXPRESSION: _application(OBJECTEXPRESSION),
    FUNCTIONEXPRESSION: _application(FUNCTIONEXPRESSION),
    ARROWFUNCTIONEXPRESSION: _application(ARROWFUNCTIONEXPRESSION, optional=("body",)),
    CLASSEXPRESSION: _application(CLASSEXPRESSION, optional=("superClass",)),
    TSEMPTYBODYFUNCTIONEXPRESSION: _application(TSEMPTYBODYFUNCTIONEXPRESSION),
    METAPROPERTY: _application(METAPROPERTY, required=("meta", "property")),
    MEMBEREXPRESSION: _application(MEMBEREXPRESSION, _ANY2),
    CALLEXPRESSION: _application(CALLEXPRESSION),
    CHAINEXPRESSION: _application(CHAINEXPRESSION, _ANY),
    NEWEXPRESSION: _application(NEWEXPRESSION),
    IMPORTEXPRESSION: _application(IMPORTEXPRESSION, optional=("options",)),
    UPDATEEXPRESSION: _operator(UPDATEEXPRESSION, Domains.UPDATE),
    UNARYEXPRESSION: _operator(UNARYEXPRESSION, Domains.UNARY),
    AWAITEXPRESSION: _application(AWAITEXPRESSION, _ANY),
    BINARYEXPRESSION: _operator(BINARYEXPRESSION, Domains.BINARY),
    LOGICALEXPRESSION: _operator(LOGICALEXPRESSION, Domains.LOGICAL),
    CONDITIONALEXPRESSION: _application(CONDITIONALEXPRESSION,
                                        FD.Function((FD.Anything, FD.Anything, FD.Anything), FD.Anything)),
    ASSIGNMENTEXPRESSION: _operator(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT, required=("left", "operator")),
    SEQUENCEEXPRESSION: _application(SEQUENCEEXPRESSION),
    YIELDEXPRESSION: _application(YIELDEXPRESSION, optional=("argument",)),
    TSASEXPRESSION: _application(TSASEXPRESSION, required=("typeAnnotation",)),
    TSSATISFIESEXPRESSION: _application(TSSATISFIESEXPRESSION, required=("typeAnnotation",)),
    TSTYPEASSERTION: _application(TSTYPEASSERTION, required=("typeAnnotation",)),
    TSNONNULLEXPRESSION: _application(TSNONNULLEXPRESSION, _ANY),
    TSINSTANTIATIONEXPRESSION: _application(TSINSTANTIATIONEXPRESSION, required=("typeArguments",)),
    ARRAYPATTERN: _application(ARRAYPATTERN),
    OBJECTPATTERN: _application(OBJECTPATTERN),
    ASSIGNMENTPATTERN: _application(ASSIGNMENTPATTERN),
    JSXELEMENT: _application(JSXELEMENT, standards=(), required=("openingElement",)),
    JSXFRAGMENT: _application(JSXFRAGMENT, standards=()),
    JSXEMPTYEXPRESSION: _application(JSXEMPTYEXPRESSION, standards=()),
}, domain_of=Domains.of, literal=_native)
"""The TypeScript5 dialect: its kinds, as the framework reads them."""
