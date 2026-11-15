"""Expressions of the Cpp RegExp dialect: the regular expressions `std::basic_regex` reads, as ISO/IEC 14882 defines
them ([re.grammar], [re.synopt]): its own grammar, ECMAScript's (ECMA-262, third edition, 15.10.1, as [re.grammar]
modifies it), and a `regex` naming among its flags another grammar, POSIX's, which [re.synopt] refers to: `basic` and
`extended`, POSIX's basic and extended regular expressions, and `awk`, `grep` and `egrep`, those of POSIX's utilities.

It is a dialect of the Cpp family (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "constraints, regexes and patterns are
expression dialects"; the user's "(b)" (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Which regular expressions are dialects"), every regular expression a language's
standard defines, its library's included), named `Cpp RegExp` (`Terms.dialect_name`), its tag `cpp_regexp`. Its terms
are values of its `Term`, `Expressions.Cpp.RegExp.Term`, the branch `cpp_regexp` of `Expressions.Framework.Term`; its
holder, `Expressions.Cpp.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
`Term`. No subterm in C++ is one: a pattern is a string there, passed to `std::regex`, and that a string is a
regular expression is the program's to say, never guessed (mbse-basis [PRI-025: never guess the schema](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-025)); mbse-programs, or a constraint's author, holds one through its holder.

Its kinds are [re.grammar]'s grammar alone, as ISO/IEC 14882 defines only that one; the other five, which [re.synopt]
selects by naming POSIX, are POSIX's dialects' (the user, 2026-11-12: "yes to a new posix family"): a `regex` whose
flags name `basic` or `grep` holds a `POSIX BRE` term, one naming `extended`, `awk` or `egrep` a `POSIX ERE` term, read
as that dialect reads it, as a C++ term is read under the ABI its holder names (mbse-basis [CAP-267: C and C++ terms read under the ABI their holder names](mbse:mbse-basis/docs/capabilities/CAP-267.md)); what C++'s grammar
selects of POSIX's beyond the dialect's own checks is checked under the `regex` (`FEATURES`). Its kinds, each a value
object `Expressions.Cpp.RegExp.<Kind>`, are named as ECMAScript's reference parser, regexpp, names its nodes (as
`TypeScript RegExp`'s are, each family defining its own copy), and [re.grammar]'s own productions as it names them;
tags lowercased:

- `regex`, what `basic_regex` holds: its `flags`, the `syntax_option_type` elements it is constructed with, as written
  (`basic_regex::flags()`: `icase`, `nosubs`, `optimize`, `collate`, `multiline` and at most one grammar), and its
  `pattern`, a term of the dialect its grammar names (`GRAMMAR_DIALECTS`);
- `pattern` (Disjunction), its `alternatives`, and `alternative`, its `elements`;
- `group`, `(?:...)`, and `capturinggroup`, `(...)`, each its `alternatives`;
- `quantifier`: its `raw`, as written (`{0,}`), printed where it has one, its `min`, its `max` (absent: no bound),
  whether it is `greedy` (absent: it is; `*?` is not), and its `element`;
- `characterclass` (`[^...]`): whether it is `negate`d, and its `elements`; and `characterclassrange` (`a-z`), its
  `min` and `max`, each a character or a collating element;
- `characterset`: its `setKind`, `any` (`.`), `digit`, `space` or `word` (`\\d`, `\\s`, `\\w`), and whether it is
  `negate`d (`\\D`);
- `character`: its `raw`, as written (`\\x41`, `\\n`, `\\.`), printed where it has one, and its `value`, a code point;
- `assertion`: its `assertionKind`, `start` (`^`), `end` (`$`), `word` (`\\b`) or `lookahead` (`(?=...)`, with its
  `alternatives`), and whether it is `negate`d (`\\B`, `(?!...)`);
- `backreference` (`\\1`), its `ref`;
- [re.grammar]'s class atoms, each its `name`: `exclass` (ClassAtomExClass, `[:alpha:]`), `collatingelement`
  (ClassAtomCollatingElement, `[.ch.]`) and `equivalence` (ClassAtomEquivalence, `[=a=]`);

then the framework's kinds of invalid syntax, `error` and `missing`. Its helpers are none (`HELPERS`). What a kind's
terms may be is checked (`HOLDS`: an alternative's elements are atoms, a quantifier's an atom but an assertion or a
quantifier, a class's its class atoms).

No kind binds a name a term scopes: a capturing group is numbered, not named (ECMA-262's third edition has no named
group), and a backreference resolves it by its number. Its kinds are applications the framework reads by their
structure, of no domain known statically, and are not simplified, each left in the residual, named by its dialect (\"Cpp RegExp regex
is not simplified\"). The editions it covers are data, which `define` writes, C++'s (C++17, C++20, C++23), every kind in
each (`SINCE`): [re.grammar] is the same in the three. `DIALECT` reads its kinds, its family's other dialects' terms,
as each family's dialects read one another (mbse-basis [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided-by-an-agent-for-review), "A dialect reads other dialects' terms"), and POSIX's, which a regex holds (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis
[CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)). Its terms are written
through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda u: u.character(lambda c: c.value(ord("a")))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "GRAMMARS", "SYNTAX_OPTIONS", "ECMASCRIPT",
           "GRAMMAR_DIALECTS", "CLASS_NAMES", "SETS", "ASSERTIONS", "HOLDS", "FEATURES", "grammar", "problems"]

(REGEX, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERCLASSRANGE, CHARACTERSET,
 CHARACTER, ASSERTION, BACKREFERENCE, EXCLASS, COLLATINGELEMENT, EQUIVALENCE) = (
    "regex", "pattern", "alternative", "group", "capturinggroup", "quantifier", "characterclass", "characterclassrange",
    "characterset", "character", "assertion", "backreference", "exclass", "collatingelement", "equivalence")

TAGS = (REGEX, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERCLASSRANGE,
        CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE, EXCLASS, COLLATINGELEMENT, EQUIVALENCE)
"""Its own kinds, in its `Term`'s order, before invalid syntax."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none."""

SINCE: dict[str, int] = {}
"""The edition each of its kinds arrived in, by its index in C++'s editions (C++17, C++20, C++23): none, so each is in
every edition."""

ECMASCRIPT = "ECMAScript"

GRAMMARS = (ECMASCRIPT, "basic", "extended", "awk", "grep", "egrep")
"""The grammar elements of `syntax_option_type`, as [re.synopt] names them, one of which a regex's grammar is."""

SYNTAX_OPTIONS = ("icase", "nosubs", "optimize", "collate", *GRAMMARS, "multiline")
"""The elements of `syntax_option_type`, in [re.synopt]'s order: what a regex's `flags` may hold."""

GRAMMAR_DIALECTS = {ECMASCRIPT: "Cpp.RegExp", "basic": "POSIX.BRE", "extended": "POSIX.ERE", "awk": "POSIX.ERE",
                    "grep": "POSIX.BRE", "egrep": "POSIX.ERE"}
"""The dialect each grammar's patterns are terms of, by its path ([re.synopt]): ECMAScript's this one's; `basic` and
`grep` (POSIX's grep, its patterns BREs) POSIX's basic regular expressions; `extended`, `awk` (whose EREs take C's
escapes) and `egrep` (`grep -E`) its extended ones."""

CLASS_NAMES = ("alnum", "alpha", "blank", "cntrl", "digit", "graph", "lower", "print", "punct", "space", "upper",
               "xdigit", "d", "s", "w")
"""The class names every traits class recognizes, at least ([re.grammar], 7); which others it does is its own."""

SETS = ("any", "digit", "space", "word")
"""A characterset's kinds: `.`, `\\d`, `\\s` and `\\w`."""

ASSERTIONS = ("start", "end", "word", "lookahead")
"""An assertion's kinds: `^`, `$`, `\\b` and `(?=...)`."""

ATOMS = (GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE)
QUANTIFIED = (GROUP, CAPTURINGGROUP, CHARACTERCLASS, CHARACTERSET, CHARACTER, BACKREFERENCE)
CLASS_ATOMS = (CHARACTERCLASSRANGE, CHARACTERSET, CHARACTER, EXCLASS, COLLATINGELEMENT, EQUIVALENCE)
ENDS = (CHARACTER, COLLATINGELEMENT)

HOLDS: dict[str, dict[str, tuple[str, ...]]] = {
    PATTERN: {"alternatives": (ALTERNATIVE,)},
    ALTERNATIVE: {"elements": ATOMS},
    GROUP: {"alternatives": (ALTERNATIVE,)},
    CAPTURINGGROUP: {"alternatives": (ALTERNATIVE,)},
    QUANTIFIER: {"element": QUANTIFIED},
    CHARACTERCLASS: {"elements": CLASS_ATOMS},
    CHARACTERCLASSRANGE: {"min": ENDS, "max": ENDS},
    ASSERTION: {"alternatives": (ALTERNATIVE,)},
}
"""What each kind's terms may be, by property, besides invalid syntax: the grammar's structure, which the schema, every
property holding its `Term`, leaves to validation (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "The framework's kinds with subterms stay shared"); a quantifier repeats an Atom,
never an Assertion or another quantifier (ECMA-262, 15.10.1, Term)."""

FEATURES: dict[str, tuple[str, ...]] = {
    "a patternlist": ("grep", "egrep"),
    "alternation": ("extended", "awk", "egrep"),
    "a lazy quantifier": (),
}
"""What a POSIX grammar's term may have that C++'s grammar does not select, each with the grammars that have it: grep's
and egrep's list of patterns, which [re.synopt]'s other POSIX grammars are not; and what POSIX.1-2024 added, which the
editions C++ cites ([intro.refs]: ISO/IEC 9945:2003, ISO/IEC/IEEE 9945:2009) have not: a BRE's alternation (`\\|`) and
an ERE's repetition modifier (`*?`)."""


def grammar(flags: tuple[str, ...]) -> str:
    """The grammar a regex's `flags` select: its one grammar element, else ECMAScript, the default ([re.synopt])."""
    return next((flag for flag in flags if flag in GRAMMARS), ECMASCRIPT)


def install(txn: Any) -> Any:
    """Cpp RegExp's union of its kinds, added to the framework's terms as the branch `cpp_regexp`, its own kinds, and its
    dialect's schema, whose singleton is `Expressions.Cpp.RegExp`: run after `Framework.install`, in a transaction of its
    own, before or after its family's other installs; run again, it writes nothing. Its kinds hold its own terms alone,
    but a regex, whose pattern is `Expressions.Framework.Term`, a term of the dialect its grammar names. Its holder,
    `Expressions.Cpp.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
    `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    names = ("Regex", "Pattern", "Alternative", "Group", "CapturingGroup", "Quantifier", "CharacterClass",
             "CharacterClassRange", "CharacterSet", "Character", "Assertion", "Backreference", "ExClass",
             "CollatingElement", "Equivalence")
    return txn.uid("mbse.Expressions.Cpp.RegExp/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, **dict.fromkeys(names, S.OfObject)})
        .spec([
            # its dialect: the singleton `Expressions.Cpp.RegExp`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Cpp.RegExp.Dialect").ref(True).singleton("Expressions.Cpp.RegExp").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("cpp_regexp").schema([_.Dialect])]),
            # its union of its kinds, and invalid syntax
            lambda _: _.Term.name("Expressions.Cpp.RegExp.Term").branches([
                *(lambda t, name=name: t.name(name.lower()).schema([getattr(_, name)]) for name in names),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # a regex: the `syntax_option_type` it is constructed with, and its pattern, of the dialect its grammar names
            lambda _: _.Regex.name("Expressions.Cpp.RegExp.Regex").properties({
                "flags": many(S.OfStr), "pattern": _.FrameworkTerm}),
            lambda _: _.Pattern.name("Expressions.Cpp.RegExp.Pattern").properties({"alternatives": many(_.Term)}),
            lambda _: _.Alternative.name("Expressions.Cpp.RegExp.Alternative").properties({"elements": many(_.Term)}),
            lambda _: _.Group.name("Expressions.Cpp.RegExp.Group").properties({"alternatives": many(_.Term)}),
            lambda _: _.CapturingGroup.name("Expressions.Cpp.RegExp.CapturingGroup").properties({
                "alternatives": many(_.Term)}),
            lambda _: _.Quantifier.name("Expressions.Cpp.RegExp.Quantifier").properties({
                "raw": S.OfStr, "min": S.OfInt, "max": S.OfInt, "greedy": S.OfBool, "element": _.Term}),
            lambda _: _.CharacterClass.name("Expressions.Cpp.RegExp.CharacterClass").properties({
                "negate": S.OfBool, "elements": many(_.Term)}),
            lambda _: _.CharacterClassRange.name("Expressions.Cpp.RegExp.CharacterClassRange").properties({
                "min": _.Term, "max": _.Term}),
            lambda _: _.CharacterSet.name("Expressions.Cpp.RegExp.CharacterSet").properties({
                "setKind": S.OfStr, "negate": S.OfBool}),
            lambda _: _.Character.name("Expressions.Cpp.RegExp.Character").properties({"raw": S.OfStr, "value": S.OfInt}),
            lambda _: _.Assertion.name("Expressions.Cpp.RegExp.Assertion").properties({
                "assertionKind": S.OfStr, "negate": S.OfBool, "alternatives": many(_.Term)}),
            lambda _: _.Backreference.name("Expressions.Cpp.RegExp.Backreference").properties({"ref": S.OfInt}),
            lambda _: _.ExClass.name("Expressions.Cpp.RegExp.ExClass").properties({"name": S.OfStr}),
            lambda _: _.CollatingElement.name("Expressions.Cpp.RegExp.CollatingElement").properties({"name": S.OfStr}),
            lambda _: _.Equivalence.name("Expressions.Cpp.RegExp.Equivalence").properties({"name": S.OfStr}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.Cpp.RegExp.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("cpp_regexp").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """Cpp RegExp's dialect as data: the singleton `Expressions.Cpp.RegExp` owning the editions it covers, by designation
    (`standards`), C++'s ISO/IEC 14882:2017, 2020 and 2024, each with its formal reference's parts, its common name and
    its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its
    frame binds the dialect (`dialect`) and each edition by its common name spelled as an identifier (`Cpp17`)."""
    OWN, Standard = txn.Expressions.Cpp.RegExp, txn.Expressions.Framework.Standard
    every = [branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS]
    return txn.uid("mbse.Expressions.Cpp.RegExp.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
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


def _read(term: Any) -> F.Node:
    return F.node(*F.kind_of(term))


def _held(node: F.Node, name: str) -> tuple[Any, ...]:
    """The terms a kind's property `name` holds: a subterm's, where it is not empty, or a container's."""
    if name in node.subterms:
        return () if node.subterms[name] is None else (node.subterms[name],)
    return node.lists[name]


def _grammar_problems(grammar_: str, root: Any) -> list[str]:
    """What a POSIX grammar's pattern has that C++ does not select of it (`FEATURES`), each once, in the order first
    met."""
    found: list[str] = []

    def lacks(feature: str) -> None:
        message = f"{feature} is not in the {grammar_} grammar"
        if grammar_ not in FEATURES[feature] and message not in found:
            found.append(message)

    def visit(term: Any) -> None:
        node = _read(term)
        if node.kind in F.INVALID_KINDS:
            return
        if node.kind == "patternlist":
            lacks("a patternlist")
        if len(node.lists.get("alternatives", ())) > 1:
            lacks("alternation")
        if node.kind == QUANTIFIER and node.attributes.get("greedy") is False:
            lacks("a lazy quantifier")
        for held in [*node.subterms.values(), *node.many]:
            if held is not None:
                visit(held)

    visit(root)
    return found


def problems(node: F.Node) -> list[str]:
    """A node's checks: what its terms may be (`HOLDS`), its attributes' values, and, of a regex, its flags, that its
    pattern is a pattern of the dialect its grammar names (`GRAMMAR_DIALECTS`), and what that has that C++ does not
    select of it (`FEATURES`)."""
    found: list[str] = []
    kind, attributes = node.kind, node.attributes
    for name, allowed in HOLDS.get(kind, {}).items():
        for held in _held(node, name):
            tag = F.kind_of(held)[0]
            if tag not in allowed and tag not in F.INVALID_KINDS:
                found.append(f"{F._article(kind)}'s {name} cannot hold {F._article(tag)}")
    if kind == REGEX:
        flags = attributes["flags"].values if "flags" in attributes else ()
        found += [f"{flag!r} is not a syntax_option_type element" for flag in flags if flag not in SYNTAX_OPTIONS]
        grammars = [flag for flag in flags if flag in GRAMMARS]
        pattern = node.subterms["pattern"]
        if len(grammars) > 1:
            found.append(f"a regex has at most one grammar element, got {', '.join(grammars)}")
        elif pattern is not None:
            grammar_ = grammar(flags)
            expected = F.dialect_name(GRAMMAR_DIALECTS[grammar_])
            held = F.dialect_name(F.dialect_of(pattern)[len("Expressions."):-len(".Term")])
            tag = F.kind_of(pattern)[0]
            if tag in F.INVALID_KINDS:  # its own problem, as the dialect holding it reads it
                return found
            if held != expected:
                found.append(f"the {grammar_} grammar's pattern is {F._article(expected)} term, got {F._article(held)} term")
            elif tag not in ((PATTERN,) if grammar_ == ECMASCRIPT else (PATTERN, "patternlist")):
                found.append(f"a regex's pattern cannot hold {F._article(tag)}")
            elif grammar_ != ECMASCRIPT:
                found += _grammar_problems(grammar_, pattern)
    elif kind == QUANTIFIER:
        least, most = attributes.get("min"), attributes.get("max")
        if type(least) is int and least < 0:
            found.append(f"a quantifier's min cannot be negative, got {least}")
        if type(least) is int and type(most) is int and most < least:
            found.append(f"a quantifier's max cannot be less than its min, got {most} and {least}")
    elif kind == CHARACTERSET and "setKind" in attributes:
        if attributes["setKind"] not in SETS:
            found.append(f"CharacterSet.setKind cannot be {attributes['setKind']!r}")
        elif attributes["setKind"] == "any" and attributes.get("negate"):
            found.append("an any characterset cannot be negated")
    elif kind == CHARACTER and type(attributes.get("value")) is int and not 0 <= attributes["value"] <= 0x10FFFF:
        found.append(f"a character's value must be a code point, got {attributes['value']}")
    elif kind == ASSERTION and "assertionKind" in attributes:
        if attributes["assertionKind"] not in ASSERTIONS:
            found.append(f"Assertion.assertionKind cannot be {attributes['assertionKind']!r}")
        elif attributes["assertionKind"] in ("start", "end") and attributes.get("negate"):
            found.append(f"a {attributes['assertionKind']} assertion cannot be negated")
        if attributes["assertionKind"] != "lookahead" and node.lists["alternatives"]:
            found.append(f"{F._article(attributes['assertionKind'])} assertion holds no alternatives")
    elif kind == BACKREFERENCE and type(attributes.get("ref")) is int and attributes["ref"] < 1:
        found.append(f"a backreference's ref must be positive, got {attributes['ref']}")
    elif kind in (EXCLASS, COLLATINGELEMENT, EQUIVALENCE) and type(attributes.get("name")) is str:
        found += [f"{F._article(kind)}'s name cannot hold {c!r}" for c in ".=:" if c in attributes["name"]][:1]
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    return lambda record: problems(F.node(tag, record))


_REQUIRED = {QUANTIFIER: ("min",), CHARACTERSET: ("setKind",), CHARACTER: ("value",), ASSERTION: ("assertionKind",),
             BACKREFERENCE: ("ref",), EXCLASS: ("name",), COLLATINGELEMENT: ("name",), EQUIVALENCE: ("name",)}


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds: applications, of no domain known statically (`Opaque`)."""
    return {tag: F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), required=_REQUIRED.get(tag, ()))
            for tag in TAGS}


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family, imported when first needed, C++'s, Cpp Types' and C Preprocessor's, then POSIX's,
    whose terms a regex naming a POSIX grammar holds: POSIX BRE's and POSIX ERE's."""
    from ...C.Preprocessor import Expressions as CPreprocessor
    from ...POSIX.BRE import Expressions as BRE
    from ...POSIX.ERE import Expressions as ERE
    from ..Expressions import Expressions as Cpp
    from ..Types import Expressions as CppTypes
    return Cpp.DIALECT, CppTypes.DIALECT, CPreprocessor.DIALECT, BRE.DIALECT, ERE.DIALECT


DIALECT = F.Dialect("Cpp.RegExp", _kinds(), domain_of=lambda value: FD.Anything, reads=_reads)
"""The Cpp RegExp dialect: its kinds, as the framework reads them, its family's other dialects' terms, and POSIX's."""
