"""Expressions of the C Preprocessor dialect: the preprocessing directives C and C++ share, each standard defining its own
(ISO/IEC 9899, 6.10; ISO/IEC 14882, [cpp]), `defined(name)` within their conditions, and the comments kept among them,
as mbse-programs has them, one set of directives for both languages (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/
Syntax.py`, "Preprocessing directives [cpp]").

It is the C family's dialect that both C and C++ read (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Macros, and a preprocessor per family": "the
preprocessor is a dialect per family (C's, shared by C and C++ as each standard defines it ...)"), named `C
Preprocessor` (`Terms.dialect_name`), its tag `c_preprocessor`. Its terms are values of its `Term`,
`Expressions.C.Preprocessor.Term`, the branch `c_preprocessor` of `Expressions.Framework.Term`: its own kinds and
invalid syntax. Its kinds are mbse-programs', with its names, lowercased as branch tags, and its properties in source
order, each a value object `Expressions.C.Preprocessor.<Kind>`:

- The directives: `includedirective` (`#include <path>` where `system`, `#include "path"`, or `#include macro`; its
  `directive`, `include` or the extensions `include_next` and `import`), `definedirective` (`#define name
  replacement`, or, where `function_like`, `#define name(parameters, ...) replacement`, its replacement the text of
  its tokens, which are not a tree until the macro is used), the conditionals `ifdirective` (`#if condition`),
  `ifdefdirective` (`#ifdef name`, `#ifndef` where `negated`), `elifdirective`, `elifdefdirective` (C23's and C++23's)
  and `elsedirective`, each with its `items` and the branch after it, its `alternative` (an `#elif`, an `#elifdef` or an
  `#else`), as mbse-programs nests them, and `otherdirective` (`#directive text`: `#undef`, `#pragma`, `#error`,
  `#warning`, `#line`, `#embed`, and the null directive).
- `definedexpression`, `defined(name)`, mbse-programs' expression kind of a condition: its install adds it to C's and
  C++'s `Term`s, a condition's terms.
- `comment`: `// text`, or with `block` `/* text */`, kept where mbse-programs keeps it, among an enumeration's
  enumerators and the directives; a `trailing` one ends the line of the item before it.

A name is C's `Identifier` (`Expressions.C.Expressions.Identifier`), a preprocessing token the same in both
standards. A condition and an include's `macro` hold `Expressions.Framework.Term`: a C or a C++ term, as the
framework's shared kinds hold any dialect's (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "The framework's kinds with subterms stay shared"), each standard defining its own
condition's grammar. A directive's `items` hold `Expressions.Framework.Term` too, where a value holds the directive:
an enumeration's body, whose items are C Types' or Cpp Types' terms (their enumerators, and this dialect's directives
and comments, which its install adds to both `Term`s); elsewhere mbse-programs relates its items. Which language a
condition or an item is of is the reading dialect's: from an enumeration, its own (a C++ term in a C enumeration is
refused), from this dialect's holder, either. A condition's macros' names, C's variables and C++'s identifiers, are
bound within it (`Kind.scopes`), as each names a macro, defined or not, never a value, and so are an include's macro's:
nothing refines `Let`.

The editions it covers are data, which `define` writes: C's and C++'s (C11, C17, C23, C++17, C++20 and C++23), each
with its own kinds it has, every kind in every edition but `elifdefdirective`, C23's and C++23's (`SINCE`: mbse-
programs' `both(2023, 2023)`); a directive's name within `otherdirective` (`#warning`, `#embed`) is a feature, not
recorded. `DIALECT` reads its kinds and the terms of C's and C++'s expressions and types, which its conditions and items
hold. Simplification leaves each of its kinds in the residual, named. Its terms are written through the builders (mbse-basis [PRI-019:
fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda t: t.ifdefdirective(lambda d: d.name(lambda i: i.spelling("NDEBUG")))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..Expressions import Kinds as K

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "DIRECTIVES", "EDITIONS", "INCLUDES",
           "problems", "macros"]

INCLUDEDIRECTIVE, DEFINEDIRECTIVE, IFDIRECTIVE, IFDEFDIRECTIVE = (
    "includedirective", "definedirective", "ifdirective", "ifdefdirective")
ELIFDIRECTIVE, ELIFDEFDIRECTIVE, ELSEDIRECTIVE, OTHERDIRECTIVE = (
    "elifdirective", "elifdefdirective", "elsedirective", "otherdirective")
DEFINEDEXPRESSION, COMMENT = "definedexpression", "comment"

DIRECTIVES = (INCLUDEDIRECTIVE, DEFINEDIRECTIVE, IFDIRECTIVE, IFDEFDIRECTIVE, ELIFDIRECTIVE, ELIFDEFDIRECTIVE,
              ELSEDIRECTIVE, OTHERDIRECTIVE)
"""The directives, in its `Term`'s order: with `comment`, what its install adds to C Types' and Cpp Types' `Term`s."""

TAGS = (*DIRECTIVES, DEFINEDEXPRESSION, COMMENT)
"""Its own kinds, in its `Term`'s order, before invalid syntax."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none."""

EDITIONS = ("C11", "C17", "C23", "C++17", "C++20", "C++23")
"""The editions it covers, by their common names, C's then C++'s."""

SINCE = {ELIFDEFDIRECTIVE: ("C23", "C++23")}
"""The editions each of its kinds arrived in, the first of each language's (C's, then C++'s), from mbse-programs'
`SINCE`; a kind not listed is in every edition."""

INCLUDES = ("include", "include_next", "import")
"""What an include directive's `directive` may be: `#include`, and the extensions `#include_next` and `#import`, as
mbse-programs' `IncludeKeyword` lists them."""

_ALTERNATIVES = frozenset({ELIFDIRECTIVE, ELIFDEFDIRECTIVE, ELSEDIRECTIVE})
_ITEMS = frozenset({"enumerator", *DIRECTIVES, COMMENT, *F.INVALID_KINDS})


def install(txn: Any) -> Any:
    """C Preprocessor's union of its kinds, added to the framework's terms as the branch `c_preprocessor`, its own kinds,
    and its dialect's schema, whose singleton is `Expressions.C.Preprocessor`: run after `Framework.install`, in a
    transaction of its own, before or after its family's other installs; run again, it writes nothing.
    `definedexpression` is added to C's and C++'s `Term`s, a condition's terms, and the directives and `comment` to C
    Types' and Cpp Types' `Term`s, whose enumerations' bodies hold them; each created where its install has not run, as
    C's `Identifier`, a macro's name, is. Its holder, `Expressions.C.Preprocessor.Expression`, refines
    `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    def held(_: Any) -> list[Any]:
        """The directives and `comment`, as a union's branches: its own `Term`'s, and C Types' and Cpp Types'."""
        return [
            lambda t: t.name("includedirective").schema([_.IncludeDirective]),
            lambda t: t.name("definedirective").schema([_.DefineDirective]),
            lambda t: t.name("ifdirective").schema([_.IfDirective]),
            lambda t: t.name("ifdefdirective").schema([_.IfdefDirective]),
            lambda t: t.name("elifdirective").schema([_.ElifDirective]),
            lambda t: t.name("elifdefdirective").schema([_.ElifdefDirective]),
            lambda t: t.name("elsedirective").schema([_.ElseDirective]),
            lambda t: t.name("otherdirective").schema([_.OtherDirective]),
        ]

    return txn.uid("mbse.Expressions.C.Preprocessor/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "IncludeDirective": S.OfObject, "DefineDirective": S.OfObject,
                  "IfDirective": S.OfObject, "IfdefDirective": S.OfObject, "ElifDirective": S.OfObject,
                  "ElifdefDirective": S.OfObject, "ElseDirective": S.OfObject, "OtherDirective": S.OfObject,
                  "DefinedExpression": S.OfObject, "Comment": S.OfObject,
                  # C's and C++'s `Term`s, C Types' and Cpp Types', and C's `Identifier`, by name
                  "CTerm": S.OfUnion, "CppTerm": S.OfUnion, "CTypesTerm": S.OfUnion, "CppTypesTerm": S.OfUnion,
                  "Identifier": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.C.Preprocessor`, a branch of the framework's kind union of
            # dialects
            lambda _: _.Dialect.name("Expressions.C.Preprocessor.Dialect").ref(True).singleton("Expressions.C.Preprocessor").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("c_preprocessor").schema([_.Dialect])]),
            # its union of its kinds, and invalid syntax
            lambda _: _.Term.name("Expressions.C.Preprocessor.Term").branches([
                *held(_),
                lambda t: t.name("definedexpression").schema([_.DefinedExpression]),
                lambda t: t.name("comment").schema([_.Comment]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Identifier.name("Expressions.C.Expressions.Identifier"),
            # `defined(name)`, a condition's term: in C's and C++'s `Term`s
            lambda _: _.CTerm.name("Expressions.C.Expressions.Term").branches([
                lambda t: t.name("definedexpression").schema([_.DefinedExpression])]),
            lambda _: _.CppTerm.name("Expressions.Cpp.Expressions.Term").branches([
                lambda t: t.name("definedexpression").schema([_.DefinedExpression])]),
            # an enumeration's items: its directives and comments too
            lambda _: _.CTypesTerm.name("Expressions.C.Types.Term").branches([
                *held(_), lambda t: t.name("comment").schema([_.Comment])]),
            lambda _: _.CppTypesTerm.name("Expressions.Cpp.Types.Term").branches([
                *held(_), lambda t: t.name("comment").schema([_.Comment])]),
            # the directives ([cpp]); a conditional's `items`, where a value holds it, an enumeration's items
            lambda _: _.IncludeDirective.name("Expressions.C.Preprocessor.IncludeDirective").properties({
                "directive": S.OfStr, "path": S.OfStr, "system": S.OfBool, "macro": Framework.Term}),
            lambda _: _.DefineDirective.name("Expressions.C.Preprocessor.DefineDirective").properties({
                "name": _.Identifier, "function_like": S.OfBool, "parameters": many(_.Identifier),
                "variadic": S.OfBool, "replacement": S.OfStr}),  # replacement: the text of its tokens
            lambda _: _.IfDirective.name("Expressions.C.Preprocessor.IfDirective").properties({
                "condition": Framework.Term, "items": many(Framework.Term), "alternative": _.Term}),
            lambda _: _.IfdefDirective.name("Expressions.C.Preprocessor.IfdefDirective").properties({
                "negated": S.OfBool, "name": _.Identifier, "items": many(Framework.Term), "alternative": _.Term}),
            lambda _: _.ElifDirective.name("Expressions.C.Preprocessor.ElifDirective").properties({
                "condition": Framework.Term, "items": many(Framework.Term), "alternative": _.Term}),
            lambda _: _.ElifdefDirective.name("Expressions.C.Preprocessor.ElifdefDirective").properties({
                "negated": S.OfBool, "name": _.Identifier, "items": many(Framework.Term), "alternative": _.Term}),
            lambda _: _.ElseDirective.name("Expressions.C.Preprocessor.ElseDirective").properties({
                "items": many(Framework.Term)}),
            lambda _: _.OtherDirective.name("Expressions.C.Preprocessor.OtherDirective").properties({
                "directive": S.OfStr, "text": S.OfStr}),
            # `defined(name)` ([cpp.cond])
            lambda _: _.DefinedExpression.name("Expressions.C.Preprocessor.DefinedExpression").properties({
                "name": _.Identifier}),
            # a comment: `text` excludes its delimiters; a `trailing` one ends the line of the item before it
            lambda _: _.Comment.name("Expressions.C.Preprocessor.Comment").properties({
                "block": S.OfBool, "text": S.OfStr, "trailing": S.OfBool}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.C.Preprocessor.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("c_preprocessor").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """C Preprocessor's dialect as data: the singleton `Expressions.C.Preprocessor` owning the editions it covers, by
    designation (`standards`), C's ISO/IEC 9899:2011, 2018 and 2024 and C++'s ISO/IEC 14882:2017, 2020 and 2024, each
    with its formal reference's parts, its common name and its own kinds it has (`SINCE`). Run after `install`, in a
    transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and each edition by
    its common name spelled as an identifier (`C11`, `Cpp17`)."""
    OWN, Standard = txn.Expressions.C.Preprocessor, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}

    def kinds(edition: str) -> list[Any]:
        """The kinds an edition has: each but those arriving in a later edition of its language."""
        language = 1 if "++" in edition else 0
        return [schema for tag, schema in every.items() if tag not in SINCE or EDITIONS.index(edition) >= EDITIONS.index(
            SINCE[tag][language])]

    return txn.uid("mbse.Expressions.C.Preprocessor.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, "C11": Standard, "C17": Standard, "C23": Standard, "Cpp17": Standard,
                  "Cpp20": Standard, "Cpp23": Standard})
        .spec([
            lambda _: _.dialect.standards({
                "ISO/IEC 9899:2011": lambda e: e.standard(_.C11), "ISO/IEC 9899:2018": lambda e: e.standard(_.C17),
                "ISO/IEC 9899:2024": lambda e: e.standard(_.C23), "ISO/IEC 14882:2017": lambda e: e.standard(_.Cpp17),
                "ISO/IEC 14882:2020": lambda e: e.standard(_.Cpp20),
                "ISO/IEC 14882:2024": lambda e: e.standard(_.Cpp23)}),
            lambda _: _.C11.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2011)).names(
                ["C11"]).kinds(kinds("C11")),
            lambda _: _.C17.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2018)).names(
                ["C17"]).kinds(kinds("C17")),
            lambda _: _.C23.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2024)).names(
                ["C23"]).kinds(kinds("C23")),
            lambda _: _.Cpp17.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2017)).names(
                ["C++17"]).kinds(kinds("C++17")),
            lambda _: _.Cpp20.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2020)).names(
                ["C++20"]).kinds(kinds("C++20")),
            lambda _: _.Cpp23.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2024)).names(
                ["C++23"]).kinds(kinds("C++23")),
        ])]))])


def _nodes(value: Any) -> tuple[F.Node, ...]:
    """A helper property's nodes: one, or each of many."""
    return value if isinstance(value, tuple) else (value,)


def _label(kind: str) -> str:
    """A directive's kind as mbse-programs names its class, in messages: `IfDirective`."""
    return {INCLUDEDIRECTIVE: "IncludeDirective", IFDIRECTIVE: "IfDirective", IFDEFDIRECTIVE: "IfdefDirective",
            ELIFDIRECTIVE: "ElifDirective", ELIFDEFDIRECTIVE: "ElifdefDirective", ELSEDIRECTIVE: "ElseDirective"}[kind]


def problems(node: F.Node) -> list[str]:
    """A node's checks, and its helpers' in turn: an include's path or macro and its directive, a conditional's branch
    after it and its items (an enumeration's: enumerators, directives and comments), each as mbse-programs checks it,
    and a name's spelling, as C's identifiers are checked."""
    kind, attributes = node.kind, node.attributes
    found: list[str] = []
    if kind == INCLUDEDIRECTIVE:
        if ("path" in attributes) == (node.subterms["macro"] is not None):
            found.append("an IncludeDirective has a path or a macro")
        directive = attributes.get("directive")
        if directive is not None and directive not in INCLUDES:
            found.append(f"IncludeDirective.directive cannot be {directive!r}")
    alternative = node.subterms.get("alternative")
    if alternative is not None and F.kind_of(alternative)[0] not in _ALTERNATIVES:
        found.append(f"an {_label(kind)}'s alternative is an elifdirective, an elifdefdirective or an elsedirective")
    if kind in _ALTERNATIVES or kind in (IFDIRECTIVE, IFDEFDIRECTIVE):
        if any(F.kind_of(item)[0] not in _ITEMS for item in node.many):
            found.append(f"an {_label(kind)}'s items are enumerators, directives and comments")
    if kind == "identifier":
        found += K.identifier_problems(attributes.get("spelling"))
    for value in node.helpers.values():
        for inner in _nodes(value):
            found += problems(inner)
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    """A kind's checks, and its helpers' (a macro's name's spelling)."""
    return lambda record: problems(F.node(tag, record))


def macros(condition: Any) -> frozenset[str]:
    """The macros' names a condition holds, C's variables and C++'s identifiers used as expressions: what it binds
    within itself, as each names a macro, defined or not."""
    if condition is None:
        return frozenset()
    names: set[str] = set()
    for term in F.walk(condition):
        if F.kind_of(term)[0] in ("variable", "idexpression") and F.name_of(term) is not None:
            names.add(F.name_of(term))
    return frozenset(names)


def _condition_scopes(tag: str) -> Callable[[Any], list[frozenset[str]]]:
    """What each of a conditional's arguments has bound: its condition, its macros' names; its branch after it and its
    items, nothing."""
    def scopes(record: Any) -> list[frozenset[str]]:
        node = F.node(tag, record)
        return [macros(node.subterms["condition"]), frozenset(), *[frozenset()] * len(node.many)]

    return scopes


def _include_scopes(record: Any) -> list[frozenset[str]]:
    """What an include's macro has bound: its macros' names, as a condition's."""
    return [macros(F.node(INCLUDEDIRECTIVE, record).subterms["macro"])]


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds."""

    def application(tag: str, **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), **options)

    return {
        INCLUDEDIRECTIVE: application(INCLUDEDIRECTIVE, optional=("macro",), scopes=_include_scopes),
        DEFINEDIRECTIVE: application(DEFINEDIRECTIVE, required=("name",)),
        IFDIRECTIVE: application(IFDIRECTIVE, optional=("alternative",), scopes=_condition_scopes(IFDIRECTIVE)),
        IFDEFDIRECTIVE: application(IFDEFDIRECTIVE, required=("name",), optional=("alternative",)),
        ELIFDIRECTIVE: application(ELIFDIRECTIVE, optional=("alternative",), scopes=_condition_scopes(ELIFDIRECTIVE)),
        ELIFDEFDIRECTIVE: application(ELIFDEFDIRECTIVE, required=("name",), optional=("alternative",)),
        ELSEDIRECTIVE: application(ELSEDIRECTIVE),
        OTHERDIRECTIVE: application(OTHERDIRECTIVE),
        DEFINEDEXPRESSION: application(DEFINEDEXPRESSION, required=("name",)),
        COMMENT: application(COMMENT),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects whose terms are its subterms, imported when first needed: C's and C++'s expressions, a
    condition's, and their types, an enumeration's items."""
    from ...Cpp.Expressions import Expressions as Cpp
    from ...Cpp.Types import Expressions as CppTypes
    from ..Expressions import Expressions as C
    from ..Types import Expressions as CTypes
    return C.DIALECT, CTypes.DIALECT, Cpp.DIALECT, CppTypes.DIALECT


DIALECT = F.Dialect("C.Preprocessor", _kinds(), domain_of=K.untyped, reads=_reads)
"""The C Preprocessor dialect: its kinds, as the framework reads them, and the terms of the C family's expressions and
types."""
