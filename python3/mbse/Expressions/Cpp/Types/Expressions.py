"""Expressions of the Cpp Types dialect: C++'s type-ids, a grammar of their own (ISO/IEC 14882, [dcl.name], over
[dcl.spec] and [dcl.decl]), as mbse-programs has them (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/Syntax.py`).

It is a dialect of the Cpp family (the dialects proposal, Retrofit's design: "most languages will have a dialect for
type expressions"), named `Cpp Types` (`Terms.dialect_name`), its tag `cpp_types`. Its terms are values of its `Term`,
`Expressions.Cpp.Types.Term`, the branch `cpp_types` of `Expressions.Framework.Term`; its holder,
`Expressions.Cpp.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`, and
so inherits the adjacency `abi`, through which its type names are read as C++'s are. Its kinds, each a value object
`Expressions.Cpp.Types.<Kind>`, named as mbse-programs names them, lowercased as branch tags:

- `typeid`, a type-id: its `specifiers` and its abstract `declarator`. C++'s `Term` lists it too, for the positions
  that hold an expression or a type alike (`sizeof(int)`, a template's arguments); every position of a type (a cast's,
  a named cast's, `new`'s, a conversion function's name's, a trailing return type, an enumeration's fixed type, a type
  parameter's default) holds this dialect's `Term`.
- `enumerator`, an enumeration's enumerator (`name`, an identifier, `attributes`, and its `value`, a C++ term), which an
  enumeration's body holds as data (the dialects proposal, Retrofit's design, "Bodies"): C++'s `EnumSpecifier` holds
  them, its `enumerators`. C++ defines no enumeration in a type-id an expression holds ([dcl.type.general]), so an
  enumeration's data is held only through a holder, by mbse-programs' alias declarations.
- C Preprocessor's directives and `comment`, which its install adds to this dialect's `Term`, as an enumeration's
  body holds them among its enumerators.
- The framework's kinds of invalid syntax, `error` and `missing`.

Its helpers are none (`HELPERS`): a type-id's parts, its specifiers, declarators and parameters, are C++'s
(`Expressions.Cpp.Expressions.Specifier`), as a lambda's declarator holds them too, and are read through `reads`, as a
name (`Expressions.Cpp.Expressions.Name`) and a term (`Expressions.Cpp.Expressions.Term`) are.

The editions it covers are data, which `define` writes, C++'s (C++17, C++20, C++23), each with its own kinds it has,
both in each (`SINCE`). No kind binds a name a term scopes. Evaluation refuses each of its kinds by name; a cast reads
its type from it (`C.Evaluators`). Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `lambda t: t.typeid(lambda i: i.specifiers([lambda s:
s.primitivetypespecifier(lambda p: p.keyword("int"))]))`. `DIALECT` reads its kinds and the terms of the dialects its
positions hold, `Cpp` and `C Preprocessor` (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis [CAP-098:
dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided))."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from ...C.Expressions import Kinds as K

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "ENUMERATOR"]

ENUMERATOR = K.ENUMERATOR

TAGS = (K.TYPEID, ENUMERATOR)
"""Its own kinds, in its `Term`'s order, before invalid syntax."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none, a type-id's parts being C++'s."""

SINCE: dict[str, int] = {}
"""The edition each of its kinds arrived in, by its index in C++'s editions (C++17, C++20, C++23): none, so each is in
every edition."""


def install(txn: Any) -> Any:
    """Cpp Types' union of its kinds, added to the framework's terms as the branch `cpp_types`, its own kinds, and its
    dialect's schema, whose singleton is `Expressions.Cpp.Types`: run after `Framework.install`, in a transaction of its
    own, before or after its family's other installs; run again, it writes nothing. C++'s `Term`, `Specifier`,
    `Declarator`, `AttributeSpecifier` and `Identifier`, which its kinds hold, are named by name, each created where
    C++'s install has not run. Its holder, `Expressions.Cpp.Types.Expression`, refines
    `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.Cpp.Types/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "TypeId": S.OfObject, "Enumerator": S.OfObject,
                  # C++'s `Term` and the helpers a type-id and an enumerator hold, by name
                  "CppTerm": S.OfUnion, "Specifier": S.OfUnion, "Declarator": S.OfUnion,
                  "AttributeSpecifier": S.OfUnion, "Identifier": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.Cpp.Types`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Cpp.Types.Dialect").ref(True).singleton("Expressions.Cpp.Types").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("cpp_types").schema([_.Dialect])]),
            # its union of its kinds, and invalid syntax
            lambda _: _.Term.name("Expressions.Cpp.Types.Term").branches([
                lambda t: t.name("typeid").schema([_.TypeId]),
                lambda t: t.name("enumerator").schema([_.Enumerator]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.CppTerm.name("Expressions.Cpp.Expressions.Term"),
            lambda _: _.Specifier.name("Expressions.Cpp.Expressions.Specifier"),
            lambda _: _.Declarator.name("Expressions.Cpp.Expressions.Declarator"),
            lambda _: _.AttributeSpecifier.name("Expressions.Cpp.Expressions.AttributeSpecifier"),
            lambda _: _.Identifier.name("Expressions.Cpp.Expressions.Identifier"),
            # type-ids: specifiers and an abstract declarator
            lambda _: _.TypeId.name("Expressions.Cpp.Types.TypeId").properties({
                "specifiers": many(_.Specifier), "declarator": _.Declarator}),
            # an enumeration's enumerator: `name attributes = value`
            lambda _: _.Enumerator.name("Expressions.Cpp.Types.Enumerator").properties({
                "name": _.Identifier, "attributes": many(_.AttributeSpecifier), "value": _.CppTerm}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.Cpp.Types.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("cpp_types").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """Cpp Types' dialect as data: the singleton `Expressions.Cpp.Types` owning the editions it covers, by designation
    (`standards`), C++'s ISO/IEC 14882:2017, 2020 and 2024, each with its formal reference's parts, its common name and
    its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its
    frame binds the dialect (`dialect`) and each edition by its common name spelled as an identifier (`Cpp17`)."""
    OWN, Standard = txn.Expressions.Cpp.Types, txn.Expressions.Framework.Standard
    every = [branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS]
    return txn.uid("mbse.Expressions.Cpp.Types.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, "Cpp17": Standard, "Cpp20": Standard, "Cpp23": Standard})
        .spec([
            lambda _: _.dialect.standards({
                "ISO/IEC 14882:2017": lambda e: e.standard(_.Cpp17),
                "ISO/IEC 14882:2020": lambda e: e.standard(_.Cpp20),
                "ISO/IEC 14882:2024": lambda e: e.standard(_.Cpp23)}),
            lambda _: _.Cpp17.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2017)).names(
                ["C++17"]).kinds(every),
            lambda _: _.Cpp20.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2020)).names(
                ["C++20"]).kinds(every),
            lambda _: _.Cpp23.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2024)).names(
                ["C++23"]).kinds(every),
        ])]))])


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects whose terms its positions hold, imported when first needed: C++'s, whose terms and helpers a
    type-id holds, and C Preprocessor's, whose directives an enumeration's body holds; and Cpp RegExp's, which no
    position holds, as each family's dialects read one another *(agent)*."""
    from ...C.Preprocessor import Expressions as CPreprocessor
    from ..Expressions import Expressions as Cpp
    from ..RegExp import Expressions as CppRegExp
    return Cpp.DIALECT, CPreprocessor.DIALECT, CppRegExp.DIALECT


DIALECT = F.Dialect("Cpp.Types", K.kinds("C++", TAGS, K.PREFIXES, K.CPP_SUFFIXES), domain_of=K.untyped, reads=_reads)
"""The Cpp Types dialect: its kinds, as the framework reads them, and the terms of the dialects its positions hold."""
