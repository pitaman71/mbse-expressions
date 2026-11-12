"""Expressions of the TypeScript Types dialect: TypeScript's types, typescript-estree's type nodes, as mbse-programs
has them, the sublanguage of type expressions that `as`, `satisfies`, `<T>x`, an annotation, a type argument and a
type parameter's constraint and default hold.

It is a dialect of the TypeScript family (the dialects proposal, Decided for stage 6: "most languages will have a
dialect for type expressions"; its Retrofit's design), named `TypeScript Types` (`Terms.dialect_name`), its tag
`typescript_types`. Its terms are values of its `Term`, `Expressions.TypeScript.Types.Term`, the branch
`typescript_types` of `Expressions.Framework.Term`, which was `TypeScript5`'s `Type` union, its 45 branches unchanged, so
that a type's data, written by branch tags, is as it was. Its own kinds are mbse-programs' 37 type nodes
(`mbse:mbse-programs/python3/mbse/Programs/TypeScript/Syntax.py`), typescript-estree's 36 and parentheses, with
mbse-programs' names, lowercased as branch tags, and its properties in source order, each a value object
`Expressions.TypeScript.Types.<Kind>`: the keywords (`tsanykeyword` ... `tsintrinsickeyword`, and `tsthistype`),
`tsqualifiedname`, `tstypereference`, `tsparenthesizedtype`, `tsliteraltype`, `tstemplateliteraltype`, `tsarraytype`,
`tstupletype`, `tsnamedtuplemember`, `tsoptionaltype`, `tsresttype`, `tsuniontype`, `tsintersectiontype`,
`tsfunctiontype`, `tsconstructortype`, `tstypeliteral`, `tsmappedtype`, `tsindexedaccesstype`, `tstypeoperator`,
`tstypequery`, `tsimporttype`, `tsconditionaltype`, `tsinfertype` and `tstypepredicate`. Its `Term` lists, beside them,
the six terms a type holds, `TypeScript5`'s, as the user decided their listing ("(b) as you recommended"): `identifier`
and `thisexpression` for an entity name, `literal`, `unaryexpression` and `templateliteral` for a literal type, and
`objectexpression` for an import type's options; and invalid syntax, `error` and `missing`.

Its helpers, those only its kinds hold: an object type's members, the union `Expressions.TypeScript.Types.TypeElement`
of its signatures (`tspropertysignature`, `tsmethodsignature`, `tscallsignaturedeclaration`,
`tsconstructsignaturedeclaration`, `tsindexsignature`) and of `comment`, as mbse-programs keeps comments among them. An
annotation, a type parameter, and the declaration and instantiation of type parameters stay `TypeScript5`'s, as
expressions hold them too; a parameter is `TypeScript Patterns`' term.

In a type, an identifier names a type, or a value whose type `typeof` reads, which statements a term does not model
declare (an interface, an alias, an import): its `DIALECT` reads `identifier` as a reference that is not lexical, never
reported unbound *(agent)*. Its binders refine the framework's `Let` (the dialects proposal, Decided for stage 6, Q8,
"(a)"): `tsmappedtype`, its constraint Let's `value` and its type Let's `body`, binding its `key` in its `nameType` and
its `body`; and `tsfunctiontype` and `tsconstructortype`, Let's properties unset, binding their type parameters and
parameters within them. A `tsconditionaltype` binds its `infer` declarations within its `trueType` by its scopes, and
does not refine `Let` *(agent)*; a signature binds its parameters through the type literal that holds it.

The versions of TypeScript 5 it covers are data, which `define` writes, as `TypeScript5`'s are: TypeScript 5.0 to 5.9,
each with its kinds, every one older than 5.0 (`SINCE` is empty). `DIALECT` reads its kinds and its family's other
dialects' terms (`reads`). `Text` writes its kinds as TypeScript source, as the family's printer
(`TypeScript5.Text.ToText`) dispatches them to it. Its terms are written through the builders (mbse-basis [PRI-019:
fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `lambda t: t.tsarraytype(lambda a:
a.elementType(lambda e: e.tsnumberkeyword(lambda k: k)))`."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..TypeScript5 import Domains as _family, Nodes

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS"]

KEYWORDS = ("tsanykeyword", "tsunknownkeyword", "tsnumberkeyword", "tsbigintkeyword", "tsbooleankeyword",
            "tsstringkeyword", "tssymbolkeyword", "tsobjectkeyword", "tsneverkeyword", "tsvoidkeyword",
            "tsundefinedkeyword", "tsnullkeyword", "tsintrinsickeyword", "tsthistype")
"""The kinds written as one word."""

TAGS = (*KEYWORDS, "tsqualifiedname", "tstypereference", "tsparenthesizedtype", "tsliteraltype",
        "tstemplateliteraltype", "tsarraytype", "tstupletype", "tsnamedtuplemember", "tsoptionaltype", "tsresttype",
        "tsuniontype", "tsintersectiontype", "tsfunctiontype", "tsconstructortype", "tstypeliteral", "tsmappedtype",
        "tsindexedaccesstype", "tstypeoperator", "tstypequery", "tsimporttype", "tsconditionaltype", "tsinfertype",
        "tstypepredicate")
"""Its own kinds, in its `Term`'s order, mbse-programs' 37 type nodes."""

TERMS = ("identifier", "thisexpression", "literal", "unaryexpression", "templateliteral", "objectexpression")
"""The terms of `TypeScript5` its `Term` lists, after its own kinds: what a type holds."""

HELPERS = ("TSPropertySignature", "TSMethodSignature", "TSCallSignatureDeclaration", "TSConstructSignatureDeclaration",
           "TSIndexSignature", "Comment")
"""Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
completeness data (`grammars/typescript5-estree.json`) names them: an object type's members."""

SINCE: dict[str, int] = {}
"""The version each of its kinds arrived in: none, every kind being older than TypeScript 5.0."""

_SCHEMAS = ("TSAnyKeyword", "TSUnknownKeyword", "TSNumberKeyword", "TSBigIntKeyword", "TSBooleanKeyword",
            "TSStringKeyword", "TSSymbolKeyword", "TSObjectKeyword", "TSNeverKeyword", "TSVoidKeyword",
            "TSUndefinedKeyword", "TSNullKeyword", "TSIntrinsicKeyword", "TSThisType", "TSQualifiedName",
            "TSTypeReference", "TSParenthesizedType", "TSLiteralType", "TSTemplateLiteralType", "TSArrayType",
            "TSTupleType", "TSNamedTupleMember", "TSOptionalType", "TSRestType", "TSUnionType", "TSIntersectionType",
            "TSFunctionType", "TSConstructorType", "TSTypeLiteral", "TSMappedType", "TSIndexedAccessType",
            "TSTypeOperator", "TSTypeQuery", "TSImportType", "TSConditionalType", "TSInferType", "TSTypePredicate")
"""Its kinds' schemas' names under its path, in `TAGS`' order: mbse-programs' names."""


def install(txn: Any) -> Any:
    """TypeScript Types' union of its kinds, added to the framework's terms as the branch `typescript_types`, its own
    kinds, the helpers only they hold, and its dialect's schema, whose singleton is `Expressions.TypeScript.Types`: run
    after `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it
    writes nothing. `TypeScript5`'s terms and helpers it holds, and `TypeScript Patterns`' `Term`, are named, created
    where their installs have not run. Its holder, `Expressions.TypeScript.Types.Expression`, refines
    `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.TypeScript.Types/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "TypeElement": S.OfUnion,
                  # `TypeScript5`'s union, terms and helpers, and `TypeScript Patterns`' union, by name: their installs',
                  # created here where they have not run
                  "Expressions": S.OfUnion, "Patterns": S.OfUnion, "Identifier": S.OfObject, "ThisExpression": S.OfObject,
                  "Literal": S.OfObject, "UnaryExpression": S.OfObject, "TemplateLiteral": S.OfObject,
                  "ObjectExpression": S.OfObject, "TemplateElement": S.OfObject, "TSTypeAnnotation": S.OfObject,
                  "TSTypeParameter": S.OfObject, "TSTypeParameterDeclaration": S.OfObject,
                  "TSTypeParameterInstantiation": S.OfObject,
                  "Comment": S.OfObject, "TSPropertySignature": S.OfObject, "TSMethodSignature": S.OfObject,
                  "TSCallSignatureDeclaration": S.OfObject, "TSConstructSignatureDeclaration": S.OfObject,
                  "TSIndexSignature": S.OfObject,
                  **{name: S.OfObject for name in _SCHEMAS}})
        .spec([
            # its dialect: the singleton `Expressions.TypeScript.Types`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.TypeScript.Types.Dialect").ref(True).singleton("Expressions.TypeScript.Types").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("typescript_types").schema([_.Dialect])]),
            # its union of its kinds: its own, the terms a type holds, and invalid syntax
            lambda _: _.Term.name("Expressions.TypeScript.Types.Term").branches([
                *[lambda t, tag=tag, name=name: t.name(tag).schema([getattr(_, name)]) for tag, name in zip(TAGS, _SCHEMAS)],
                *[lambda t, tag=tag, name=name: t.name(tag).schema([getattr(_, name)]) for tag, name in zip(TERMS, (
                    "Identifier", "ThisExpression", "Literal", "UnaryExpression", "TemplateLiteral", "ObjectExpression"))],
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Expressions.name("Expressions.TypeScript.TypeScript5.Term"),
            lambda _: _.Patterns.name("Expressions.TypeScript.Patterns.Term"),
            *[lambda _, name=name: getattr(_, name).name(f"Expressions.TypeScript.TypeScript5.{name}") for name in (
                "Identifier", "ThisExpression", "Literal", "UnaryExpression", "TemplateLiteral", "ObjectExpression",
                "TemplateElement", "TSTypeAnnotation", "TSTypeParameter", "TSTypeParameterDeclaration",
                "TSTypeParameterInstantiation")],
            # an object type's members (typescript-estree's `TypeElement`), comments among them as mbse-programs keeps them
            lambda _: _.TypeElement.name("Expressions.TypeScript.Types.TypeElement").branches([
                lambda t: t.name("tspropertysignature").schema([_.TSPropertySignature]),
                lambda t: t.name("tsmethodsignature").schema([_.TSMethodSignature]),
                lambda t: t.name("tscallsignaturedeclaration").schema([_.TSCallSignatureDeclaration]),
                lambda t: t.name("tsconstructsignaturedeclaration").schema([_.TSConstructSignatureDeclaration]),
                lambda t: t.name("tsindexsignature").schema([_.TSIndexSignature]),
                lambda t: t.name("comment").schema([_.Comment]),
            ]),
            lambda _: _.Comment.name("Expressions.TypeScript.Types.Comment").properties({
                "block": S.OfBool, "text": S.OfStr, "trailing": S.OfBool}),
            lambda _: _.TSPropertySignature.name("Expressions.TypeScript.Types.TSPropertySignature").properties({
                "accessibility": S.OfStr, "static": S.OfBool, "readonly": S.OfBool, "computed": S.OfBool,
                "key": _.Expressions, "optional": S.OfBool, "typeAnnotation": _.TSTypeAnnotation}),
            lambda _: _.TSMethodSignature.name("Expressions.TypeScript.Types.TSMethodSignature").properties({
                "accessibility": S.OfStr, "static": S.OfBool, "readonly": S.OfBool, "methodKind": S.OfStr,
                "computed": S.OfBool, "key": _.Expressions, "optional": S.OfBool,
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Patterns),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSCallSignatureDeclaration.name("Expressions.TypeScript.Types.TSCallSignatureDeclaration").properties({
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Patterns),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSConstructSignatureDeclaration.name("Expressions.TypeScript.Types.TSConstructSignatureDeclaration").properties({
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Patterns),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSIndexSignature.name("Expressions.TypeScript.Types.TSIndexSignature").properties({
                "accessibility": S.OfStr, "static": S.OfBool, "readonly": S.OfBool, "parameters": many(_.Patterns),
                "typeAnnotation": _.TSTypeAnnotation}),
            # its kinds: TypeScript's type nodes
            lambda _: _.TSAnyKeyword.name("Expressions.TypeScript.Types.TSAnyKeyword"),
            lambda _: _.TSUnknownKeyword.name("Expressions.TypeScript.Types.TSUnknownKeyword"),
            lambda _: _.TSNumberKeyword.name("Expressions.TypeScript.Types.TSNumberKeyword"),
            lambda _: _.TSBigIntKeyword.name("Expressions.TypeScript.Types.TSBigIntKeyword"),
            lambda _: _.TSBooleanKeyword.name("Expressions.TypeScript.Types.TSBooleanKeyword"),
            lambda _: _.TSStringKeyword.name("Expressions.TypeScript.Types.TSStringKeyword"),
            lambda _: _.TSSymbolKeyword.name("Expressions.TypeScript.Types.TSSymbolKeyword"),
            lambda _: _.TSObjectKeyword.name("Expressions.TypeScript.Types.TSObjectKeyword"),
            lambda _: _.TSNeverKeyword.name("Expressions.TypeScript.Types.TSNeverKeyword"),
            lambda _: _.TSVoidKeyword.name("Expressions.TypeScript.Types.TSVoidKeyword"),
            lambda _: _.TSUndefinedKeyword.name("Expressions.TypeScript.Types.TSUndefinedKeyword"),
            lambda _: _.TSNullKeyword.name("Expressions.TypeScript.Types.TSNullKeyword"),
            lambda _: _.TSIntrinsicKeyword.name("Expressions.TypeScript.Types.TSIntrinsicKeyword"),
            lambda _: _.TSThisType.name("Expressions.TypeScript.Types.TSThisType"),
            lambda _: _.TSQualifiedName.name("Expressions.TypeScript.Types.TSQualifiedName").properties({
                "left": _.Term, "right": _.Identifier}),
            lambda _: _.TSTypeReference.name("Expressions.TypeScript.Types.TSTypeReference").properties({
                "typeName": _.Term, "typeArguments": _.TSTypeParameterInstantiation}),
            lambda _: _.TSParenthesizedType.name("Expressions.TypeScript.Types.TSParenthesizedType").properties({
                "typeAnnotation": _.Term}),
            lambda _: _.TSLiteralType.name("Expressions.TypeScript.Types.TSLiteralType").properties({"literal": _.Term}),
            lambda _: _.TSTemplateLiteralType.name("Expressions.TypeScript.Types.TSTemplateLiteralType").properties({
                "quasis": many(_.TemplateElement), "types": many(_.Term)}),
            lambda _: _.TSArrayType.name("Expressions.TypeScript.Types.TSArrayType").properties({"elementType": _.Term}),
            lambda _: _.TSTupleType.name("Expressions.TypeScript.Types.TSTupleType").properties({
                "elementTypes": many(_.Term)}),
            lambda _: _.TSNamedTupleMember.name("Expressions.TypeScript.Types.TSNamedTupleMember").properties({
                "label": _.Identifier, "optional": S.OfBool, "elementType": _.Term}),
            lambda _: _.TSOptionalType.name("Expressions.TypeScript.Types.TSOptionalType").properties({
                "typeAnnotation": _.Term}),
            lambda _: _.TSRestType.name("Expressions.TypeScript.Types.TSRestType").properties({"typeAnnotation": _.Term}),
            lambda _: _.TSUnionType.name("Expressions.TypeScript.Types.TSUnionType").properties({"types": many(_.Term)}),
            lambda _: _.TSIntersectionType.name("Expressions.TypeScript.Types.TSIntersectionType").properties({
                "types": many(_.Term)}),
            # binders: `Let`, Let's properties first, each unset (`name`, `value`, `body`), its scopes saying what it binds
            lambda _: _.TSFunctionType.name("Expressions.TypeScript.Types.TSFunctionType").refines([Framework.Let]).properties({
                "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Patterns),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSConstructorType.name("Expressions.TypeScript.Types.TSConstructorType").refines([Framework.Let]).properties({
                "abstract": S.OfBool, "typeParameters": _.TSTypeParameterDeclaration, "params": many(_.Patterns),
                "returnType": _.TSTypeAnnotation}),
            lambda _: _.TSTypeLiteral.name("Expressions.TypeScript.Types.TSTypeLiteral").properties({
                "members": many(_.TypeElement)}),
            # a binder: `Let`, its constraint Let's `value` and its type Let's `body`, Let's `name` unset (its `key` is an
            # `Identifier`), its scopes saying what it binds
            lambda _: _.TSMappedType.name("Expressions.TypeScript.Types.TSMappedType").refines([Framework.Let]).properties({
                "value": _.Term,  # its constraint: `K in T`'s `T`
                "body": _.Term,  # its type: `: V`, absent where it has none
                "readonly": S.OfStr, "key": _.Identifier, "nameType": _.Term, "optional": S.OfStr}),
            lambda _: _.TSIndexedAccessType.name("Expressions.TypeScript.Types.TSIndexedAccessType").properties({
                "objectType": _.Term, "indexType": _.Term}),
            lambda _: _.TSTypeOperator.name("Expressions.TypeScript.Types.TSTypeOperator").properties({
                "operator": S.OfStr, "typeAnnotation": _.Term}),
            lambda _: _.TSTypeQuery.name("Expressions.TypeScript.Types.TSTypeQuery").properties({
                "exprName": _.Term, "typeArguments": _.TSTypeParameterInstantiation}),
            lambda _: _.TSImportType.name("Expressions.TypeScript.Types.TSImportType").properties({
                "source": _.Term, "options": _.Term, "qualifier": _.Term,
                "typeArguments": _.TSTypeParameterInstantiation}),
            lambda _: _.TSConditionalType.name("Expressions.TypeScript.Types.TSConditionalType").properties({
                "checkType": _.Term, "extendsType": _.Term, "trueType": _.Term, "falseType": _.Term}),
            lambda _: _.TSInferType.name("Expressions.TypeScript.Types.TSInferType").properties({
                "typeParameter": _.TSTypeParameter}),
            lambda _: _.TSTypePredicate.name("Expressions.TypeScript.Types.TSTypePredicate").properties({
                "asserts": S.OfBool, "parameterName": _.Term, "typeAnnotation": _.TSTypeAnnotation}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.TypeScript.Types.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("typescript_types").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """TypeScript Types' dialect as data: the singleton `Expressions.TypeScript.Types` and the versions of TypeScript 5
    it covers, by their published names (`standards`, through `Expressions.Framework.Covers`), TypeScript 5.0 to 5.9,
    each with its body, its version and its kinds, every one in each. Run after `install`, in a transaction of its own;
    run again, it writes nothing. Its frame binds the dialect (`dialect`) and each version by its name spelled as an
    identifier (`TypeScript_5_0`)."""
    OWN, Standard = txn.Expressions.TypeScript.Types, txn.Expressions.Framework.Standard
    every = [branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS]
    versions = [f"TypeScript_5_{minor}" for minor in range(10)]
    return txn.uid("mbse.Expressions.TypeScript.Types.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, **{version: Standard for version in versions}})
        .spec([
            lambda _: _.dialect.standards({f"TypeScript 5.{minor}": lambda e, v=version: e.standard(getattr(_, v))
                                           for minor, version in enumerate(versions)}),
            *[lambda _, minor=minor, version=version: getattr(_, version).bodies(["com.microsoft"]).revision(
                lambda r: r.version(f"5.{minor}")).kinds(every) for minor, version in enumerate(versions)],
        ])]))])


# --- Its kinds, as the framework reads them ---


_OPTIONAL = ("*.constraint", "*.default")
"""A type parameter's slots, which may be empty at any depth: its constraint and its default."""


def _application(tag: str, optional: tuple[str, ...] = ()) -> F.Kind:
    return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=Nodes.check(tag), scopes=Nodes.scopes(tag),
                  optional=optional + _OPTIONAL)


_KINDS = {tag: _application(tag) for tag in TAGS}
_KINDS.update({
    "tsfunctiontype": _application("tsfunctiontype", ("value", "body")),
    "tsconstructortype": _application("tsconstructortype", ("value", "body")),
    "tsmappedtype": _application("tsmappedtype", ("body", "nameType")),
    "tstypeoperator": _application("tstypeoperator", ("typeAnnotation",)),
    "tsimporttype": _application("tsimporttype", ("options", "qualifier")),
    # in a type, an identifier names a type, which statements declare: a reference, never reported unbound
    "identifier": F.Kind(F.REFERENCE, required=("name",), lexical=False, check=Nodes.check("identifier")),
})


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects whose terms its positions hold, imported when first needed: `TypeScript5`, whose terms a type holds,
    and `TypeScript Patterns`, a function type's and a signature's parameters; and `TypeScript RegExp`, as its family's
    dialects read one another, though no type holds a regular expression."""
    from ..Patterns import Expressions as TypeScriptPatterns
    from ..RegExp import Expressions as TypeScriptRegExp
    from ..TypeScript5 import Expressions as TypeScript5
    return TypeScript5.DIALECT, TypeScriptPatterns.DIALECT, TypeScriptRegExp.DIALECT


DIALECT = F.Dialect("TypeScript.Types", _KINDS, domain_of=_family.of, reads=_reads)
"""The TypeScript Types dialect: its kinds, as the framework reads them, an identifier among them, and its family's other
dialects' terms."""
