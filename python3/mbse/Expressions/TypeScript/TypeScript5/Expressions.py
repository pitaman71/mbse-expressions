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
  expression holds it as its `body`, a term; one whose `body` is absent has a block of statements. Each is a binder,
  refining the framework's `Let`, Let's `name` and `value` unset: what it binds, its scopes say.
- Operators and access: `metaproperty`, `memberexpression`, `callexpression`, `chainexpression`, `newexpression`,
  `importexpression`, `updateexpression`, `unaryexpression`, `awaitexpression`, `binaryexpression`,
  `logicalexpression`, `conditionalexpression`, `assignmentexpression`, `sequenceexpression`, `yieldexpression`.
- TypeScript's own: `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`, `tsnonnullexpression`,
  `tsinstantiationexpression`.
- The patterns typescript-estree's expressions hold (`arraypattern`, `objectpattern`, `assignmentpattern`), so that a
  `property`'s value holds a pattern where an object pattern holds it: `TypeScript Patterns`' kinds, which its `Term`
  lists.
- JSX, an extension outside every version, as mbse-programs marks it (`EXTENSIONS`): `jsxelement`, `jsxfragment` and
  `jsxemptyexpression`, with their helpers.
- The framework's kinds of invalid syntax, `error` and `missing`.

Its sublanguages are dialects of their own, of the TypeScript family (the dialects proposal, Decided for stage 6, and
its Retrofit's design), whose `Term`s were its `Type` and `Pattern` unions, their branches unchanged:
`TypeScript Types` (`Expressions.TypeScript.Types.Term`), TypeScript's type nodes, held by what holds a type (`x as T`,
`x satisfies T`, `<T>x`, an annotation, a type argument, a type parameter's constraint and default); and
`TypeScript Patterns` (`Expressions.TypeScript.Patterns.Term`), destructuring patterns, held by a function's
parameters and an assignment's target. As the user decided ("(b) as you recommended"), one schema is a branch of every
union whose positions hold it: a pattern's `Term` lists the terms a target may be, and a type's the terms a type holds.
Which terms are allowed where, beyond that, is a constraint. Names that only declare (a type parameter's `name`, a
function's `id`) are `Identifier`s, as mbse-programs has them ("yes, stay `Identifier` terms"). The helpers expressions
and types hold alike stay its own: an annotation (`TSTypeAnnotation`), a type parameter, and the declaration and
instantiation of type parameters. `DIALECT` reads its family's other dialects' terms (`reads`), as each of them reads
its own; the framework reads a value of a helper as a `Terms.Part`, and its family's terms, the types and patterns
within it, as its arguments. `Nodes` holds what the three dialects read alike: a node's checks, the names a pattern
binds (`bound_names`) and the names each argument has bound.

The versions of TypeScript 5 the dialect covers are data, which `define` writes, each owned by its published name,
TypeScript 5.0 to 5.9, and holding the kinds it has (`Framework.Standards`): every kind is older than 5.0, so each has
all its own, the patterns its `Term` lists being `TypeScript Patterns`', and an extension none. `DIALECT` reads the kinds (`Terms.Dialect`). There are no writers: a TypeScript5 term
is written through the builders, in a transaction (mbse-basis [PRI-019: fluent builder
syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)). `tree(term)` reads a term with its helpers nested, as its printer
and its checks read it.

Its kinds of domain, the branches of its union `Expressions.TypeScript.TypeScript5.DomainKind`, which `install` adds
to the framework's `Expressions.Framework.DomainKind` as the branch `typescript5`, each with the inferred `ordered`:
`string` (`OfString`), sequences of UTF-16 code units; and the token `null` (`OfNull`), whose domain has no schema: its
value is a `constant`'s.

Its domains, each named by TypeScript's type keyword: `define` writes them, owned by the singleton
`Expressions.TypeScript.TypeScript5` by name, each but a token's related to its schema, an `OfAny` of the scalar it
narrows, which `install` adds (`Expressions.TypeScript.TypeScript5.number`): `boolean` (ISO/IEC 11404's `boolean`),
`number` (IEEE 754's `binary64`, rounding ties to even), `bigint` (11404's `integer`: signed, unbounded, raising on
overflow), `string` (its own `string`), and the token `null` (its own `null`). `RegExp` is not a domain.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from . import Domains, Nodes

__all__ = ["install", "define", "DIALECT", "EXTENSIONS", "QUOTES", "FLAGS", "TYPE_PARAMETERS", "Node", "tree",
           "bound_names", "constant_text"]

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

QUOTES = Nodes.QUOTES
"""A string's quotes, as TypeScript writes them."""

FLAGS = "dgimsuvy"
"""A regular expression's flags, as ECMAScript 2025 has them."""


def install(txn: Any) -> Any:
    """TypeScript5's union of its kinds, added to the framework's terms as the branch `typescript5`, its own kinds, the
    helpers they hold, and its dialect's schema, whose singleton is `Expressions.TypeScript.TypeScript5`: run after
    `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it writes
    nothing. `TypeScript Types`' and `TypeScript Patterns`' `Term`s, and the patterns its `Term` lists, are named,
    created where their installs have not run.
    Its domains' schemas too, each an `OfAny` of the scalar it narrows: its domains `define` writes after it.
    Its holder, `Expressions.TypeScript.TypeScript5.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
    its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.TypeScript.TypeScript5/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Kinds": S.OfUnion, "DomainKind": S.OfUnion,  # Kinds: the framework's
                  "OfString": S.OfObject, "OfNull": S.OfObject,
                  "boolean": S.OfAny, "number": S.OfAny, "bigint": S.OfAny, "string": S.OfAny,
                  "Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  # its family's types and patterns, by name: their installs', created here where they have not run
                  "Types": S.OfUnion, "Patterns": S.OfUnion, "ArrayPattern": S.OfObject, "ObjectPattern": S.OfObject,
                  "AssignmentPattern": S.OfObject,
                  "JSXTagNameExpression": S.OfUnion, "JSXAttributeName": S.OfUnion, "JSXAttributeValue": S.OfUnion,
                  "JSXAttributeItem": S.OfUnion, "JSXChild": S.OfUnion, "Expression": S.OfObject,
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
                  "TSInstantiationExpression": S.OfObject, "Decorator": S.OfObject, "TSClassImplements": S.OfObject,
                  "TSTypeAnnotation": S.OfObject, "TSTypeParameter": S.OfObject,
                  "TSTypeParameterDeclaration": S.OfObject, "TSTypeParameterInstantiation": S.OfObject,
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
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
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
            # its family's types and patterns, by name: `TypeScript Types`' and `TypeScript Patterns`' installs add their
            # branches and properties, in any order with this one
            lambda _: _.Types.name("Expressions.TypeScript.Types.Term"),
            lambda _: _.Patterns.name("Expressions.TypeScript.Patterns.Term"),
            lambda _: _.ArrayPattern.name("Expressions.TypeScript.Patterns.ArrayPattern"),
            lambda _: _.ObjectPattern.name("Expressions.TypeScript.Patterns.ObjectPattern"),
            lambda _: _.AssignmentPattern.name("Expressions.TypeScript.Patterns.AssignmentPattern"),
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
            # binders: `Let`, Let's properties first, `name` and `value` unset (a name is an `Identifier`), an arrow's
            # expression body its `body`, a function's and a class's unset (a body of statements is not part of the term);
            # their scopes say what each binds
            lambda _: _.FunctionExpression.name("Expressions.TypeScript.TypeScript5.FunctionExpression").refines([Framework.Let]).properties({
                "isAsync": S.OfBool, "generator": S.OfBool, "id": _.Identifier,
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Patterns),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.ArrowFunctionExpression.name("Expressions.TypeScript.TypeScript5.ArrowFunctionExpression").refines([Framework.Let]).properties({
                "body": _.Term,  # absent: a body of statements
                "isAsync": S.OfBool, "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Patterns),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.ClassExpression.name("Expressions.TypeScript.TypeScript5.ClassExpression").refines([Framework.Let]).properties({
                "decorators": many(_.Decorator), "id": _.Identifier, "typeParameters": _.TSTypeParameterDeclaration,
                "superClass": _.Term, "superTypeArguments": _.TSTypeParameterInstantiation,
                "implements": many(_.TSClassImplements)}),
            lambda _: _.TSEmptyBodyFunctionExpression.name("Expressions.TypeScript.TypeScript5.TSEmptyBodyFunctionExpression").refines([Framework.Let]).properties({
                "isAsync": S.OfBool, "generator": S.OfBool, "typeParameters": _.TSTypeParameterDeclaration,
                "params": many(_.Patterns), "returnType": _.TSTypeAnnotation}),
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
                "left": _.Patterns, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.SequenceExpression.name("Expressions.TypeScript.TypeScript5.SequenceExpression").properties({
                "expressions": many(_.Term)}),
            lambda _: _.YieldExpression.name("Expressions.TypeScript.TypeScript5.YieldExpression").properties({
                "delegate": S.OfBool, "argument": _.Term}),
            # TypeScript's own expressions
            lambda _: _.TSAsExpression.name("Expressions.TypeScript.TypeScript5.TSAsExpression").properties({
                "expression": _.Term, "typeAnnotation": _.Types}),
            lambda _: _.TSSatisfiesExpression.name("Expressions.TypeScript.TypeScript5.TSSatisfiesExpression").properties({
                "expression": _.Term, "typeAnnotation": _.Types}),
            lambda _: _.TSTypeAssertion.name("Expressions.TypeScript.TypeScript5.TSTypeAssertion").properties({
                "typeAnnotation": _.Types, "expression": _.Term}),
            lambda _: _.TSNonNullExpression.name("Expressions.TypeScript.TypeScript5.TSNonNullExpression").properties({
                "expression": _.Term}),
            lambda _: _.TSInstantiationExpression.name("Expressions.TypeScript.TypeScript5.TSInstantiationExpression").properties({
                "expression": _.Term, "typeArguments": _.TSTypeParameterInstantiation}),
            # helpers: decorators, heritage, annotations and type parameters, which expressions and types hold alike
            lambda _: _.Decorator.name("Expressions.TypeScript.TypeScript5.Decorator").properties({"expression": _.Term}),
            lambda _: _.TSClassImplements.name("Expressions.TypeScript.TypeScript5.TSClassImplements").properties({
                "expression": _.Term, "typeArguments": _.TSTypeParameterInstantiation}),
            lambda _: _.TSTypeAnnotation.name("Expressions.TypeScript.TypeScript5.TSTypeAnnotation").properties({
                "typeAnnotation": _.Types}),
            lambda _: _.TSTypeParameter.name("Expressions.TypeScript.TypeScript5.TSTypeParameter").properties({
                "const": S.OfBool, "isIn": S.OfBool, "isOut": S.OfBool, "name": _.Identifier, "constraint": _.Types,
                "default": _.Types}),
            lambda _: _.TSTypeParameterDeclaration.name("Expressions.TypeScript.TypeScript5.TSTypeParameterDeclaration").properties({
                "params": many(_.TSTypeParameter)}),
            lambda _: _.TSTypeParameterInstantiation.name("Expressions.TypeScript.TypeScript5.TSTypeParameterInstantiation").properties({
                "params": many(_.Types)}),
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
            # --- its kinds of domain: `string`, and the token of `null`; each inferred `ordered` ---
            lambda _: _.OfString.name("Expressions.TypeScript.TypeScript5.OfString").properties({"ordered": S.OfBool}),
            lambda _: _.OfNull.name("Expressions.TypeScript.TypeScript5.OfNull").properties({"ordered": S.OfBool}),
            lambda _: _.DomainKind.name("Expressions.TypeScript.TypeScript5.DomainKind").branches([
                lambda t: t.name("string").schema([_.OfString]),
                lambda t: t.name("null").schema([_.OfNull]),
            ]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("typescript5").schema([_.DomainKind])]),
            # --- its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
            lambda _: _.boolean.name("Expressions.TypeScript.TypeScript5.boolean").schemas([S.OfBool]),
            lambda _: _.number.name("Expressions.TypeScript.TypeScript5.number").schemas([S.OfFloat]),
            lambda _: _.bigint.name("Expressions.TypeScript.TypeScript5.bigint").schemas([S.OfInt]),
            lambda _: _.string.name("Expressions.TypeScript.TypeScript5.string").schemas([S.OfStr]),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("typescript5").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """TypeScript5's domains as data: the singleton `Expressions.TypeScript.TypeScript5` owning its domains by name
    (`domains`, through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and each
    but a token's related to its schema (`Expressions.TypeScript.TypeScript5.number`) by
    `Expressions.Framework.HasDomain`: `boolean`, `number`, `bigint` and `string`, and the token `null`. And the
    versions of TypeScript 5 it covers, by their published names (`standards`, through `Expressions.Framework.Covers`),
    TypeScript 5.0 to 5.9, each with its body, its version and the kinds it has. Run after the installs, in a
    transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`), each version by its
    name spelled as an identifier (`TypeScript_5_0`) and each domain by its name:
    `store.transaction(TypeScript5.define)[0]["number"]`."""
    TypeScript5, Domain = txn.Expressions.TypeScript.TypeScript5, txn.Expressions.Framework.Domain
    Standard = txn.Expressions.Framework.Standard
    own = DIALECT.kinds()  # its own kinds: not `TypeScript Patterns`' its `Term` lists
    every = [branch.schema for branch in TypeScript5.Term.as_schema().branches  # each kind's schema, every version's,
             if branch.name in own and branch.name not in EXTENSIONS and branch.name not in F.INVALID_KINDS]  # but an
    # extension and invalid syntax
    MICROSOFT = ["com.microsoft"]
    return txn.uid("mbse.Expressions.TypeScript.TypeScript5.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": TypeScript5.Dialect, **{f"TypeScript_5_{minor}": Standard for minor in range(10)},
                  "boolean": Domain, "number": Domain, "bigint": Domain,
                  "string": Domain, "null": Domain})
        .spec([
            # --- the versions of TypeScript 5 it covers, each by its published name, with the kinds it has: all ---
            lambda _: _.dialect.standards({
                "TypeScript 5.0": lambda e: e.standard(_.TypeScript_5_0),
                "TypeScript 5.1": lambda e: e.standard(_.TypeScript_5_1),
                "TypeScript 5.2": lambda e: e.standard(_.TypeScript_5_2),
                "TypeScript 5.3": lambda e: e.standard(_.TypeScript_5_3),
                "TypeScript 5.4": lambda e: e.standard(_.TypeScript_5_4),
                "TypeScript 5.5": lambda e: e.standard(_.TypeScript_5_5),
                "TypeScript 5.6": lambda e: e.standard(_.TypeScript_5_6),
                "TypeScript 5.7": lambda e: e.standard(_.TypeScript_5_7),
                "TypeScript 5.8": lambda e: e.standard(_.TypeScript_5_8),
                "TypeScript 5.9": lambda e: e.standard(_.TypeScript_5_9),
            }),
            lambda _: _.TypeScript_5_0.bodies(MICROSOFT).revision(lambda r: r.version("5.0")).kinds(every),
            lambda _: _.TypeScript_5_1.bodies(MICROSOFT).revision(lambda r: r.version("5.1")).kinds(every),
            lambda _: _.TypeScript_5_2.bodies(MICROSOFT).revision(lambda r: r.version("5.2")).kinds(every),
            lambda _: _.TypeScript_5_3.bodies(MICROSOFT).revision(lambda r: r.version("5.3")).kinds(every),
            lambda _: _.TypeScript_5_4.bodies(MICROSOFT).revision(lambda r: r.version("5.4")).kinds(every),
            lambda _: _.TypeScript_5_5.bodies(MICROSOFT).revision(lambda r: r.version("5.5")).kinds(every),
            lambda _: _.TypeScript_5_6.bodies(MICROSOFT).revision(lambda r: r.version("5.6")).kinds(every),
            lambda _: _.TypeScript_5_7.bodies(MICROSOFT).revision(lambda r: r.version("5.7")).kinds(every),
            lambda _: _.TypeScript_5_8.bodies(MICROSOFT).revision(lambda r: r.version("5.8")).kinds(every),
            lambda _: _.TypeScript_5_9.bodies(MICROSOFT).revision(lambda r: r.version("5.9")).kinds(every),
            # --- its domains ---
            lambda _: _.dialect.domains({
                "boolean": lambda e: e.domain(_.boolean), "number": lambda e: e.domain(_.number),
                "bigint": lambda e: e.domain(_.bigint), "string": lambda e: e.domain(_.string),
                "null": lambda e: e.domain(_.null),
            }),
            lambda _: _.boolean.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.boolean(
                lambda d: d.ordered(False)))))).schema([TypeScript5.boolean]),
            lambda _: _.number.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64).radix(2).precision(53).emax(1023).ordered(
                    True)))))).schema([TypeScript5.number]),
            lambda _: _.bigint.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.signed(True).overflow("raise").ordered(True)))))).schema([TypeScript5.bigint]),  # unbounded
            lambda _: _.string.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.typescript5(lambda v: v.string(
                lambda d: d.ordered(True)))))).schema([TypeScript5.string]),
            lambda _: _.null.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.typescript5(lambda v: v.null(
                lambda d: d.ordered(False)))))),  # a token: no schema
        ])]))])



# --- Reading a term with its helpers nested ---


Node = F.Node
"""A term or a helper, its helpers nested (`Terms.Node`)."""


def tree(term: Any) -> Node:
    """A term's `Node` of the TypeScript family (TypeScript5's, or a `TypeScript Types`' or a `TypeScript Patterns`' term),
    its helpers nested."""
    tag, record, _ = DIALECT.kind(term)
    return F.node(tag, record)


bound_names = Nodes.bound_names
"""The names a pattern binds (`Nodes.bound_names`)."""


def constant_text(attributes: Mapping[str, Any]) -> str:
    """A constant's text: as written (`text`), else its default spelling, `null` or a regular expression
    (`/a+/g`). The printer writes it, and a refusal shows it (`Kind.shown`)."""
    if "text" in attributes:
        return attributes["text"]
    if "singleton" in attributes:
        return attributes["singleton"]
    return f"/{attributes['pattern']}/{attributes.get('flags', '')}"


# --- Checks ---


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


def _native(value: Any) -> F.Writer | None:
    """The literal of a native value: a boolean, a number (a float), a bigint (an int) or a string; a bytes has none."""
    if type(value) is bytes:
        return None
    return F.Writer(lambda u: getattr(u, LITERAL)(lambda r: r.value(lambda p: p.as_scalar(value))), "typescript5")


_ANY = FD.Function((FD.Anything,), FD.Anything)
_ANY2 = FD.Function((FD.Anything, FD.Anything), FD.Anything)

TYPE_PARAMETERS = ("*.constraint", "*.default")
"""A type parameter's slots, which may be empty at any depth (`Kind.optional`): its constraint and its default."""


def _application(tag: str, signature: FD.Signature = FD.Opaque(), optional: tuple[str, ...] = (), **options: Any) -> F.Kind:
    return F.Kind(F.APPLICATION, signature=signature, check=Nodes.check(tag), scopes=Nodes.scopes(tag),
                  optional=optional + TYPE_PARAMETERS, **options)


def _operator(tag: str, vocabulary: dict[str, FD.Signature]) -> F.Kind:
    return F.Kind(F.APPLICATION, operator="operator", vocabulary=vocabulary, required=("operator",),
                  check=Nodes.check(tag), scopes=Nodes.scopes(tag), optional=TYPE_PARAMETERS)


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms its positions hold, imported when first needed (the dialects proposal,
    Retrofit's design): `TypeScript Types` and `TypeScript Patterns`."""
    from ..Patterns import Expressions as TypeScriptPatterns
    from ..Types import Expressions as TypeScriptTypes
    return TypeScriptTypes.DIALECT, TypeScriptPatterns.DIALECT


DIALECT = F.Dialect("TypeScript.TypeScript5", {
    IDENTIFIER: F.Kind(F.REFERENCE, required=("name",), check=Nodes.check(IDENTIFIER)),
    PRIVATEIDENTIFIER: F.Kind(F.REFERENCE, required=("name",), lexical=False, check=Nodes.check(PRIVATEIDENTIFIER)),
    LITERAL: F.Kind(F.LITERAL, spelling=("text", "problems", "quote", "base", "separators"), check=Nodes.check(LITERAL)),
    CONSTANT: F.Kind(F.LITERAL, spelling=("text", "problems"), check=Nodes.check(CONSTANT, _constant_problems),
                     typed=lambda record: Domains.constant(F.attributes_of(record)),
                     shown=constant_text),
    TEMPLATELITERAL: _application(TEMPLATELITERAL, FD.Opaque(Domains.String)),
    TAGGEDTEMPLATEEXPRESSION: _application(TAGGEDTEMPLATEEXPRESSION, required=("quasi",)),
    THISEXPRESSION: F.Kind(F.REFERENCE, lexical=False),
    SUPER: F.Kind(F.REFERENCE, lexical=False),
    PARENTHESIZEDEXPRESSION: _application(PARENTHESIZEDEXPRESSION, _ANY),
    ELISION: _application(ELISION),
    SPREADELEMENT: _application(SPREADELEMENT, _ANY),
    ARRAYEXPRESSION: _application(ARRAYEXPRESSION),
    PROPERTY: _application(PROPERTY),
    OBJECTEXPRESSION: _application(OBJECTEXPRESSION),
    FUNCTIONEXPRESSION: _application(FUNCTIONEXPRESSION, optional=("value", "body")),
    ARROWFUNCTIONEXPRESSION: _application(ARROWFUNCTIONEXPRESSION, optional=("value", "body")),
    CLASSEXPRESSION: _application(CLASSEXPRESSION, optional=("value", "body", "superClass")),
    TSEMPTYBODYFUNCTIONEXPRESSION: _application(TSEMPTYBODYFUNCTIONEXPRESSION, optional=("value", "body")),
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
    ASSIGNMENTEXPRESSION: _operator(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT),
    SEQUENCEEXPRESSION: _application(SEQUENCEEXPRESSION),
    YIELDEXPRESSION: _application(YIELDEXPRESSION, optional=("argument",)),
    TSASEXPRESSION: _application(TSASEXPRESSION),
    TSSATISFIESEXPRESSION: _application(TSSATISFIESEXPRESSION),
    TSTYPEASSERTION: _application(TSTYPEASSERTION),
    TSNONNULLEXPRESSION: _application(TSNONNULLEXPRESSION, _ANY),
    TSINSTANTIATIONEXPRESSION: _application(TSINSTANTIATIONEXPRESSION, required=("typeArguments",)),
    JSXELEMENT: _application(JSXELEMENT, required=("openingElement",)),
    JSXFRAGMENT: _application(JSXFRAGMENT),
    JSXEMPTYEXPRESSION: _application(JSXEMPTYEXPRESSION),
}, domain_of=Domains.of, literal=_native, reads=_reads)
"""The TypeScript5 dialect: its kinds, as the framework reads them, and its family's other dialects' terms: the
patterns its `Term` lists (`arraypattern`, `objectpattern`, `assignmentpattern`) are `TypeScript Patterns`' kinds."""
