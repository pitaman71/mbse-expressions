"""Expressions of the TypeScript Patterns dialect: ECMA-262's binding and assignment patterns, grammars of their own
(14.3.3, "Destructuring Binding Patterns"; 13.15.5, "Destructuring Assignment"), as mbse-programs has them (its
category `Pattern`): what a function's, an arrow's, a signature's, a function type's and an index signature's
parameters bind, and what an assignment's target assigns.

It is a dialect of the TypeScript family (the dialects proposal, Retrofit's design), named `TypeScript Patterns`
(`Terms.dialect_name`), its tag `typescript_patterns`. Its terms are values of its `Term`,
`Expressions.TypeScript.Patterns.Term`, the branch `typescript_patterns` of `Expressions.Framework.Term`, which was
`TypeScript5`'s `Pattern` union, its 16 branches unchanged, so that a pattern's data, written by branch tags, is as it
was. Its own kinds are mbse-programs' (`mbse:mbse-programs/python3/mbse/Programs/TypeScript/Syntax.py`), with its names,
lowercased as branch tags, and its properties in source order, each a value object
`Expressions.TypeScript.Patterns.<Kind>`: `arraypattern` (its `elements`), `objectpattern` (its `properties`),
`assignmentpattern` (a target and its default, `left` and `right`), `restelement` (`...argument`) and
`tsparameterproperty` (a constructor's parameter with its modifiers, which only a parameter holds). Its `Term` lists,
beside them, the terms a target may be, `TypeScript5`'s, as the user decided ("(b) as you recommended", after
typescript-estree's `DestructuringPattern`): `identifier`, `memberexpression`, and an assignment's targets
`parenthesizedexpression`, `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion` and `tsnonnullexpression`; an
object pattern's `property` and an array pattern's hole, `elision`; and invalid syntax, `error` and `missing`.
`TypeScript5`'s `Term` lists `arraypattern`, `objectpattern` and `assignmentpattern` too, as typescript-estree's
expressions hold them (a `property`'s value, where an object pattern holds it).

A pattern binds through what holds it (the dialects proposal, Retrofit's design, the binders): a function's
parameters within it, as its kind's scopes say; none of its kinds refines `Let`. `binding_names` gives the names a
pattern binds. Within an assignment's target, a name is a reference to what it assigns.

The versions of TypeScript 5 it covers are data, which `define` writes, as `TypeScript5`'s are: TypeScript 5.0 to 5.9,
each with its kinds, every one older than 5.0 (`SINCE` is empty). `DIALECT` reads its kinds and its family's other
dialects' terms (`reads`). `Text` writes its kinds as TypeScript source, as the family's printer
(`TypeScript5.Text.ToText`) dispatches them to it. Its terms are written through the builders (mbse-basis [PRI-019:
fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `lambda p: p.restelement(lambda r:
r.argument(lambda a: a.identifier(lambda i: i.name("rest"))))`."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..TypeScript5 import Domains as _family, Nodes

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "binding_names"]

ARRAYPATTERN, OBJECTPATTERN, ASSIGNMENTPATTERN, RESTELEMENT, TSPARAMETERPROPERTY = (
    "arraypattern", "objectpattern", "assignmentpattern", "restelement", "tsparameterproperty")

TAGS = (ARRAYPATTERN, OBJECTPATTERN, ASSIGNMENTPATTERN, RESTELEMENT, TSPARAMETERPROPERTY)
"""Its own kinds, in its `Term`'s order: ECMA-262's four patterns, and TypeScript's parameter property, which its `Term`
lists after `TypeScript5`'s terms."""

TERMS = ("identifier", "memberexpression", "parenthesizedexpression", "tsasexpression", "tssatisfiesexpression",
         "tstypeassertion", "tsnonnullexpression", "property", "elision")
"""The terms of `TypeScript5` its `Term` lists, between its patterns and `tsparameterproperty`: what a target may be."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers: none, a pattern's decorators and annotation being `TypeScript5`'s."""

SINCE: dict[str, int] = {}
"""The version each of its kinds arrived in: none, every kind being older than TypeScript 5.0."""

binding_names = Nodes.binding_names
"""The names a pattern binds, a term's or a `Node`'s (`Nodes.binding_names`): an identifier's, and those within an
array, an object, a default, a rest or a parameter property; a member, or any other target, binds none."""


def install(txn: Any) -> Any:
    """TypeScript Patterns' union of its kinds, added to the framework's terms as the branch `typescript_patterns`, its
    own kinds, and its dialect's schema, whose singleton is `Expressions.TypeScript.Patterns`: run after
    `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it writes
    nothing. `TypeScript5`'s union, the terms a target may be and the helpers a pattern holds are named, created where
    its install has not run. Its holder, `Expressions.TypeScript.Patterns.Expression`, refines
    `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    named = ("Identifier", "MemberExpression", "ParenthesizedExpression", "TSAsExpression", "TSSatisfiesExpression",
             "TSTypeAssertion", "TSNonNullExpression", "Property", "Elision", "Decorator", "TSTypeAnnotation")
    return txn.uid("mbse.Expressions.TypeScript.Patterns/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject,
                  # `TypeScript5`'s union, terms and helpers, by name: its install's, created here where it has not run
                  "Expressions": S.OfUnion, **{name: S.OfObject for name in named},
                  "ArrayPattern": S.OfObject, "ObjectPattern": S.OfObject, "AssignmentPattern": S.OfObject,
                  "RestElement": S.OfObject, "TSParameterProperty": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.TypeScript.Patterns`, a branch of the framework's kind union of
            # dialects
            lambda _: _.Dialect.name("Expressions.TypeScript.Patterns.Dialect").ref(True).singleton("Expressions.TypeScript.Patterns").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("typescript_patterns").schema([_.Dialect])]),
            # its union of its kinds: its patterns, the terms a target may be, a parameter property, and invalid syntax
            lambda _: _.Term.name("Expressions.TypeScript.Patterns.Term").branches([
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
            lambda _: _.Expressions.name("Expressions.TypeScript.TypeScript5.Term"),
            *[lambda _, name=name: getattr(_, name).name(f"Expressions.TypeScript.TypeScript5.{name}") for name in named],
            # its kinds
            lambda _: _.ArrayPattern.name("Expressions.TypeScript.Patterns.ArrayPattern").properties({
                "decorators": many(_.Decorator), "elements": many(_.Term), "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation}),
            lambda _: _.ObjectPattern.name("Expressions.TypeScript.Patterns.ObjectPattern").properties({
                "decorators": many(_.Decorator), "properties": many(_.Term), "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation}),
            lambda _: _.AssignmentPattern.name("Expressions.TypeScript.Patterns.AssignmentPattern").properties({
                "decorators": many(_.Decorator), "left": _.Term, "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation, "right": _.Expressions}),
            lambda _: _.RestElement.name("Expressions.TypeScript.Patterns.RestElement").properties({
                "decorators": many(_.Decorator), "argument": _.Term, "optional": S.OfBool,
                "typeAnnotation": _.TSTypeAnnotation, "value": _.AssignmentPattern}),
            lambda _: _.TSParameterProperty.name("Expressions.TypeScript.Patterns.TSParameterProperty").properties({
                "decorators": many(_.Decorator), "accessibility": S.OfStr, "static": S.OfBool, "override": S.OfBool,
                "readonly": S.OfBool, "parameter": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.TypeScript.Patterns.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("typescript_patterns").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """TypeScript Patterns' dialect as data: the singleton `Expressions.TypeScript.Patterns` and the versions of
    TypeScript 5 it covers, by their published names (`standards`, through `Expressions.Framework.Covers`), TypeScript
    5.0 to 5.9, each with its body, its version and its kinds, every one in each. Run after `install`, in a transaction
    of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and each version by its name
    spelled as an identifier (`TypeScript_5_0`)."""
    OWN, Standard = txn.Expressions.TypeScript.Patterns, txn.Expressions.Framework.Standard
    every = [branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS]
    versions = [f"TypeScript_5_{minor}" for minor in range(10)]
    return txn.uid("mbse.Expressions.TypeScript.Patterns.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, **{version: Standard for version in versions}})
        .spec([
            lambda _: _.dialect.standards({f"TypeScript 5.{minor}": lambda e, v=version: e.standard(getattr(_, v))
                                           for minor, version in enumerate(versions)}),
            *[lambda _, minor=minor, version=version: getattr(_, version).bodies(["com.microsoft"]).revision(
                lambda r: r.version(f"5.{minor}")).kinds(every) for minor, version in enumerate(versions)],
        ])]))])


# --- Its kinds, as the framework reads them ---


def _application(tag: str) -> F.Kind:
    return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=Nodes.check(tag), scopes=Nodes.scopes(tag),
                  optional=("*.constraint", "*.default"))


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects whose terms its positions hold, imported when first needed: `TypeScript5`, whose terms a target may
    be and a default is, and `TypeScript Types`, a pattern's annotation; and `TypeScript RegExp`, as its family's dialects
    read one another, though no pattern holds a regular expression."""
    from ..RegExp import Expressions as TypeScriptRegExp
    from ..TypeScript5 import Expressions as TypeScript5
    from ..Types import Expressions as TypeScriptTypes
    return TypeScript5.DIALECT, TypeScriptTypes.DIALECT, TypeScriptRegExp.DIALECT


DIALECT = F.Dialect("TypeScript.Patterns", {tag: _application(tag) for tag in TAGS}, domain_of=_family.of,
                    reads=_reads)
"""The TypeScript Patterns dialect: its kinds, as the framework reads them, and its family's other dialects' terms."""
