"""Expressions of the C Types dialect: C's type names, a grammar of their own (ISO/IEC 9899, 6.7.7 in C11, "Type names",
over 6.7's specifiers and declarators), as mbse-programs has them (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/
Syntax.py`).

It is a dialect of the C family (mbse-basis [CAP-278: C's and C++'s type names and preprocessor directives as data](mbse:mbse-basis/docs/capabilities/CAP-278.md): "most languages will have a dialect for type
expressions"), named `C Types` (`Terms.dialect_name`), its tag `c_types`. Its terms are values of its `Term`,
`Expressions.C.Types.Term`, the branch `c_types` of `Expressions.Framework.Term`; its holder,
`Expressions.C.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`, and so
inherits the adjacency `abi`, through which its type names are read as C's are (`Domains.Types`). Its kinds, each a
value object `Expressions.C.Types.<Kind>`, named as mbse-programs names them, lowercased as branch tags:

- `typeid`, a type name: its `specifiers` and its abstract `declarator`. C's `Term` lists it too, for the subterms
  that may be an expression or a type alike (`sizeof(int)`, `_Generic`'s controlling operand, `offsetof`'s first
  argument); a cast's, a compound literal's and a generic association's type hold this dialect's `Term`.
- `enumerator`, an enumeration's enumerator (`name`, an identifier, `attributes`, and its `value`, a C term), which an
  enumeration's body holds as data: mbse-programs models it as nodes (`EnumeratorList` of `Enumerator`s, directives
  and comments), so it is data of the family's `Types` (mbse-basis [CAP-278: C's and C++'s type names and preprocessor directives as data](mbse:mbse-basis/docs/capabilities/CAP-278.md)).
- C Preprocessor's directives and `comment`, which its install adds to this dialect's `Term`, as an enumeration's
  body holds them among its enumerators.
- The framework's kinds of invalid syntax, `error` and `missing`.

Its helpers, by name under its path (`HELPERS`), are a type name's parts, which no expression holds, each union named
after mbse-programs' category: `Specifier` (keywords, a named type, a struct, union or enum, C23's `typeof`,
`_Atomic(type)`, C23's `_BitInt(width)`, and, as `TypeId` lists them among its specifiers, the attribute specifiers),
`Declarator` (an identifier, a pointer, an array, a function, parentheses), `Parameter` and `AttributeSpecifier`. A
name is C's `Name` (`Expressions.C.Expressions.Name`), and a term a type name holds (an array's size, `typeof`'s
operand, an attribute's arguments, an enumerator's value) is C's `Term`, each read through `reads`. A struct's or a
union's body, its member declarations, is not part of the term (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Bodies within expressions are not part of the term"): `body` says
whether it has one. An enumeration's `body` says whether it has one too (`enum E` against `enum E {}`), and its
`enumerators` hold its body's items, this dialect's terms, with its `trailing_comma`.

The editions it covers are data, which `define` writes, C's (C11, C17, C23), each with its own kinds it has, both in
each (`SINCE`). No kind binds a name a term scopes. Evaluation refuses each of its kinds by name; a cast reads its type
from it (`C.Simplifiers`). Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda t: t.typeid(lambda i: i.specifiers([lambda s: s.primitivetypespecifier(lambda p: p.keyword("int"))]))`.
`DIALECT` reads its kinds and the terms of its family's other dialects, `C` and `C Preprocessor` (`reads`); none of
it is a reason to reinstate `Uses` (mbse-basis [CAP-098: dialects over one
framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided))."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from ..Expressions import Kinds as K

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "ENUMERATOR"]

ENUMERATOR = "enumerator"

TAGS = (K.TYPEID, ENUMERATOR)
"""Its own kinds, in its `Term`'s order, before invalid syntax."""

HELPERS = ("DeclSpecifier", "CvQualifier", "PrimitiveTypeSpecifier", "NamedTypeSpecifier", "ClassSpecifier",
           "EnumSpecifier", "PlaceholderTypeSpecifier", "TypeofSpecifier", "AtomicTypeSpecifier", "BitIntSpecifier",
           "IdDeclarator", "PointerDeclarator", "ArrayDeclarator", "FunctionDeclarator", "ParenthesizedDeclarator",
           "ParameterDeclaration", "EllipsisParameter", "StandardAttributeSpecifier", "Attribute", "AlignasSpecifier",
           "GnuAttributeSpecifier", "DeclspecSpecifier")
"""Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
completeness data (`grammars/c-tree-sitter.json`) names them."""

SINCE: dict[str, int] = {}
"""The edition each of its kinds arrived in, by its index in C's editions (C11, C17, C23): none, so each is in every
edition."""


def install(txn: Any) -> Any:
    """C Types' union of its kinds, added to the framework's terms as the branch `c_types`, its own kinds, the helpers
    they hold, and its dialect's schema, whose singleton is `Expressions.C.Types`: run after `Framework.install`, in a
    transaction of its own, before or after its family's other installs; run again, it writes nothing. C's `Term`, its
    `Name` and its `Identifier`, which its kinds and helpers hold, are named by name, each created where C's install
    has not run. Its holder, `Expressions.C.Types.Expression`, refines `Expressions.Framework.Expression`, its `root`
    narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.C.Types/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "Specifier": S.OfUnion, "Declarator": S.OfUnion, "Parameter": S.OfUnion,
                  "AttributeSpecifier": S.OfUnion, "TypeId": S.OfObject, "Enumerator": S.OfObject,
                  "DeclSpecifier": S.OfObject, "CvQualifier": S.OfObject, "PrimitiveTypeSpecifier": S.OfObject,
                  "NamedTypeSpecifier": S.OfObject, "ClassSpecifier": S.OfObject, "EnumSpecifier": S.OfObject,
                  "PlaceholderTypeSpecifier": S.OfObject, "TypeofSpecifier": S.OfObject,
                  "AtomicTypeSpecifier": S.OfObject, "BitIntSpecifier": S.OfObject, "IdDeclarator": S.OfObject,
                  "PointerDeclarator": S.OfObject, "ArrayDeclarator": S.OfObject, "FunctionDeclarator": S.OfObject,
                  "ParenthesizedDeclarator": S.OfObject, "ParameterDeclaration": S.OfObject,
                  "EllipsisParameter": S.OfObject, "StandardAttributeSpecifier": S.OfObject,
                  "Attribute": S.OfObject, "AlignasSpecifier": S.OfObject, "GnuAttributeSpecifier": S.OfObject,
                  "DeclspecSpecifier": S.OfObject,
                  # C's `Term`, `Name` and `Identifier`, by name
                  "CTerm": S.OfUnion, "Name": S.OfUnion, "Identifier": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.C.Types`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.C.Types.Dialect").ref(True).singleton("Expressions.C.Types").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("c_types").schema([_.Dialect])]),
            # its union of its kinds, and invalid syntax
            lambda _: _.Term.name("Expressions.C.Types.Term").branches([
                lambda t: t.name("typeid").schema([_.TypeId]),
                lambda t: t.name("enumerator").schema([_.Enumerator]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.CTerm.name("Expressions.C.Expressions.Term"),
            lambda _: _.Name.name("Expressions.C.Expressions.Name"),
            lambda _: _.Identifier.name("Expressions.C.Expressions.Identifier"),
            # a type name's specifiers, the attribute specifiers among them (mbse-programs' `Specifier`)
            lambda _: _.Specifier.name("Expressions.C.Types.Specifier").branches([
                lambda t: t.name("declspecifier").schema([_.DeclSpecifier]),
                lambda t: t.name("cvqualifier").schema([_.CvQualifier]),
                lambda t: t.name("primitivetypespecifier").schema([_.PrimitiveTypeSpecifier]),
                lambda t: t.name("namedtypespecifier").schema([_.NamedTypeSpecifier]),
                lambda t: t.name("classspecifier").schema([_.ClassSpecifier]),
                lambda t: t.name("enumspecifier").schema([_.EnumSpecifier]),
                lambda t: t.name("placeholdertypespecifier").schema([_.PlaceholderTypeSpecifier]),
                lambda t: t.name("typeofspecifier").schema([_.TypeofSpecifier]),
                lambda t: t.name("atomictypespecifier").schema([_.AtomicTypeSpecifier]),
                lambda t: t.name("bitintspecifier").schema([_.BitIntSpecifier]),
                lambda t: t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
                lambda t: t.name("alignasspecifier").schema([_.AlignasSpecifier]),
                lambda t: t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
                lambda t: t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
            ]),
            lambda _: _.Declarator.name("Expressions.C.Types.Declarator").branches([
                lambda t: t.name("iddeclarator").schema([_.IdDeclarator]),
                lambda t: t.name("pointerdeclarator").schema([_.PointerDeclarator]),
                lambda t: t.name("arraydeclarator").schema([_.ArrayDeclarator]),
                lambda t: t.name("functiondeclarator").schema([_.FunctionDeclarator]),
                lambda t: t.name("parenthesizeddeclarator").schema([_.ParenthesizedDeclarator]),
            ]),
            lambda _: _.Parameter.name("Expressions.C.Types.Parameter").branches([
                lambda t: t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
                lambda t: t.name("ellipsisparameter").schema([_.EllipsisParameter]),
            ]),
            lambda _: _.AttributeSpecifier.name("Expressions.C.Types.AttributeSpecifier").branches([
                lambda t: t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
                lambda t: t.name("alignasspecifier").schema([_.AlignasSpecifier]),
                lambda t: t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
                lambda t: t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
            ]),
            # type names: specifiers and an abstract declarator
            lambda _: _.TypeId.name("Expressions.C.Types.TypeId").properties({
                "specifiers": many(_.Specifier), "declarator": _.Declarator}),
            # an enumeration's enumerator: `name attributes = value`
            lambda _: _.Enumerator.name("Expressions.C.Types.Enumerator").properties({
                "name": _.Identifier, "attributes": many(_.AttributeSpecifier), "value": _.CTerm}),
            lambda _: _.DeclSpecifier.name("Expressions.C.Types.DeclSpecifier").properties({"keyword": S.OfStr}),
            lambda _: _.CvQualifier.name("Expressions.C.Types.CvQualifier").properties({"keyword": S.OfStr}),
            lambda _: _.PrimitiveTypeSpecifier.name("Expressions.C.Types.PrimitiveTypeSpecifier").properties({
                "keyword": S.OfStr}),
            lambda _: _.NamedTypeSpecifier.name("Expressions.C.Types.NamedTypeSpecifier")
                .properties({"name": _.Name}),
            lambda _: _.ClassSpecifier.name("Expressions.C.Types.ClassSpecifier").properties({
                "key": S.OfStr, "attributes": many(_.AttributeSpecifier), "name": _.Name,
                "body": S.OfBool}),  # whether it has a body, whose member declarations are not part of the term
            lambda _: _.EnumSpecifier.name("Expressions.C.Types.EnumSpecifier").properties({
                "key": S.OfStr, "attributes": many(_.AttributeSpecifier), "name": _.Name, "base": _.Term,
                "body": S.OfBool,  # whether it has a body, `{ enumerators }`
                "enumerators": many(_.Term), "trailing_comma": S.OfBool}),  # its body's items, and `{ ..., }`
            lambda _: _.PlaceholderTypeSpecifier.name("Expressions.C.Types.PlaceholderTypeSpecifier"),
            lambda _: _.TypeofSpecifier.name("Expressions.C.Types.TypeofSpecifier").properties({
                "keyword": S.OfStr, "operand": _.CTerm}),
            lambda _: _.AtomicTypeSpecifier.name("Expressions.C.Types.AtomicTypeSpecifier")
                .properties({"type": _.Term}),
            lambda _: _.BitIntSpecifier.name("Expressions.C.Types.BitIntSpecifier").properties({"width": _.CTerm}),
            lambda _: _.IdDeclarator.name("Expressions.C.Types.IdDeclarator").properties({
                "name": _.Name, "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.PointerDeclarator.name("Expressions.C.Types.PointerDeclarator").properties({
                "attributes": many(_.AttributeSpecifier), "qualifiers": many(_.CvQualifier),
                "declarator": _.Declarator}),
            lambda _: _.ArrayDeclarator.name("Expressions.C.Types.ArrayDeclarator").properties({
                "declarator": _.Declarator, "static": S.OfBool, "qualifiers": many(_.CvQualifier), "size": _.CTerm,
                "star": S.OfBool, "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.FunctionDeclarator.name("Expressions.C.Types.FunctionDeclarator").properties({
                "declarator": _.Declarator, "parameters": many(_.Parameter),
                "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.ParenthesizedDeclarator.name("Expressions.C.Types.ParenthesizedDeclarator").properties({
                "declarator": _.Declarator}),
            lambda _: _.ParameterDeclaration.name("Expressions.C.Types.ParameterDeclaration").properties({
                "attributes": many(_.AttributeSpecifier), "specifiers": many(_.Specifier),
                "declarator": _.Declarator}),
            lambda _: _.EllipsisParameter.name("Expressions.C.Types.EllipsisParameter"),
            # attributes
            lambda _: _.StandardAttributeSpecifier.name("Expressions.C.Types.StandardAttributeSpecifier")
                .properties({"attributes": many(_.Attribute)}),
            lambda _: _.Attribute.name("Expressions.C.Types.Attribute").properties({
                "namespace": S.OfStr, "name": S.OfStr, "arguments": many(_.CTerm)}),
            lambda _: _.AlignasSpecifier.name("Expressions.C.Types.AlignasSpecifier").properties({
                "keyword": S.OfStr, "operand": _.CTerm}),
            lambda _: _.GnuAttributeSpecifier.name("Expressions.C.Types.GnuAttributeSpecifier").properties({
                "keyword": S.OfStr, "attributes": many(_.Attribute)}),
            lambda _: _.DeclspecSpecifier.name("Expressions.C.Types.DeclspecSpecifier").properties({
                "attributes": many(_.Attribute)}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.C.Types.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("c_types").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """C Types' dialect as data: the singleton `Expressions.C.Types` owning the editions it covers, by designation
    (`standards`), C's ISO/IEC 9899:2011, 2018 and 2024, each with its formal reference's parts, its common name and its
    own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame
    binds the dialect (`dialect`) and each edition by its common name (`C11`)."""
    OWN, Standard = txn.Expressions.C.Types, txn.Expressions.Framework.Standard
    every = [branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS]
    return txn.uid("mbse.Expressions.C.Types.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, "C11": Standard, "C17": Standard, "C23": Standard})
        .spec([
            lambda _: _.dialect.standards({
                "ISO/IEC 9899:2011": lambda e: e.standard(_.C11), "ISO/IEC 9899:2018": lambda e: e.standard(_.C17),
                "ISO/IEC 9899:2024": lambda e: e.standard(_.C23)}),
            lambda _: _.C11.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2011)).names(
                ["C11"]).kinds(every),
            lambda _: _.C17.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2018)).names(
                ["C17"]).kinds(every),
            lambda _: _.C23.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2024)).names(
                ["C23"]).kinds(every),
        ])]))])


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects whose terms are its subterms, imported when first needed: C's, whose terms a type name holds, and
    C Preprocessor's, whose directives an enumeration's body holds."""
    from ..Expressions import Expressions as C
    from ..Preprocessor import Expressions as CPreprocessor
    return C.DIALECT, CPreprocessor.DIALECT


DIALECT = F.Dialect("C.Types", K.kinds("C", TAGS, K.PREFIXES, K.SUFFIXES), domain_of=K.untyped, reads=_reads)
"""The C Types dialect: its kinds, as the framework reads them, and the terms of its family's other dialects."""
