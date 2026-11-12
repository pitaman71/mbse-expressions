"""Expressions of the Cpp RegExp dialect: the regular expressions `std::basic_regex` reads, as ISO/IEC 14882 defines
them ([re.grammar], [re.synopt]), in each of its six grammars: ECMAScript's (ECMA-262, third edition, 15.10.1, as
[re.grammar] modifies it), and POSIX's basic and extended regular expressions (ISO/IEC/IEEE 9945, XBD 9.3 to 9.5), and
those of the utilities awk, grep and egrep (`grep -E`), which [re.synopt] refers to.

It is a dialect of the Cpp family (the dialects proposal, Decided for stage 6: "constraints, regexes and patterns are
expression dialects"; the user, on its Retrofit's design, Open, 1: "(b)", every regular expression a language's
standard defines, its library's included), named `Cpp RegExp` (`Terms.dialect_name`), its tag `cpp_regexp`. Its terms
are values of its `Term`, `Expressions.Cpp.RegExp.Term`, the branch `cpp_regexp` of `Expressions.Framework.Term`; its
holder, `Expressions.Cpp.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
`Term`. No subterm in C++ is one: a pattern is a string there, passed to `std::regex`, and that a string is a
regular expression is the program's to say, never guessed (mbse-basis [PRI-025: never guess the schema](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-025)); mbse-programs, or a constraint's author, holds one through its holder.

One dialect covers the six grammars *(agent)*, as one `std::basic_regex` reads them, the grammar being one element of
the `syntax_option_type` it is constructed with ([re.synopt]: "A valid value of type syntax_option_type shall have at
most one of the grammar elements ECMAScript, basic, extended, awk, grep, egrep, set. If no grammar element is set, the
default grammar is ECMAScript"): its kinds are the constructs the grammars share, each once, and which grammar has a
construct is a constraint, checked by validation, as which standard has a kind is for C and C++ (the dialects
proposal, Decided, 3 and 4). Its kinds, each a value object `Expressions.Cpp.RegExp.<Kind>`, are named as ECMAScript's
reference parser, regexpp, names its nodes (as `TypeScript RegExp`'s are, each family defining its own copy), and
[re.grammar]'s own productions as it names them; tags lowercased:

- `regex`, what `basic_regex` holds: its `flags`, the `syntax_option_type` elements it is constructed with, as written
  (`basic_regex::flags()`: `icase`, `nosubs`, `optimize`, `collate`, `multiline` and at most one grammar), and its
  `pattern`;
- `patternlist`, grep's and egrep's newline-separated list of patterns (POSIX, XCU grep, "pattern_list"), its
  `patterns`;
- `pattern` (ECMAScript's Disjunction, POSIX's `basic_reg_exp` and `extended_reg_exp`), its `alternatives`, and
  `alternative` (an ECMAScript Alternative, a POSIX `RE_expression` or `ERE_branch`), its `elements`;
- `group`, ECMAScript's `(?:...)`, and `capturinggroup`, ECMAScript's and an ERE's `(...)` and a BRE's `\\(...\\)`,
  each its `alternatives`;
- `quantifier`: its `raw`, as written (`\\{2,\\}`, `{0,}`), printed where it has one, its `min`, its `max` (absent: no
  bound), whether it is `greedy` (absent: it is; ECMAScript's `*?` is not), and its `element`;
- `characterclass`, a bracket expression (`[^...]`): whether it is `negate`d, and its `elements`; and
  `characterclassrange` (`a-z`), its `min` and `max`, each a character or a collating element;
- `characterset`: its `setKind`, `any` (`.`), or ECMAScript's `digit`, `space` or `word` (`\\d`, `\\s`, `\\w`), and
  whether it is `negate`d (`\\D`);
- `character`: its `raw`, as written (`\\x41`, `\\n`, `\\.`), printed where it has one, and its `value`, a code point;
- `assertion`: its `assertionKind`, `start` (`^`), `end` (`$`), ECMAScript's `word` (`\\b`) or `lookahead` (`(?=...)`, with its
  `alternatives`), and whether it is `negate`d (`\\B`, `(?!...)`);
- `backreference` (`\\1`), its `ref`;
- [re.grammar]'s and POSIX's class atoms, each its `name`: `exclass` (ClassAtomExClass, `[:alpha:]`),
  `collatingelement` (ClassAtomCollatingElement, `[.ch.]`) and `equivalence` (ClassAtomEquivalence, `[=a=]`);

then the framework's kinds of invalid syntax, `error` and `missing`. Its helpers are none (`HELPERS`). What a kind's
terms may be is checked (`HOLDS`: an alternative's elements are atoms, a class's its class atoms), and, under a
`regex`, what its grammar has (`FEATURES`: alternation is not in the basic grammar, nor a group in the extended one). A
term held otherwise than by a `regex` is read as ECMAScript's, the default grammar.

No kind binds a name a term scopes: a capturing group is numbered, not named, in every grammar (ECMA-262's third
edition has no named group), and a backreference resolves it by its number. Its kinds are applications the framework
reads by their structure, of no domain known statically, and are not evaluated, each refused by its dialect's name
("Cpp RegExp regex is not evaluated"). The editions it covers are data, which `define` writes, C++'s (C++17, C++20,
C++23), every kind in each (`SINCE`): [re.grammar] is the same in the three. `DIALECT` reads its kinds, and its
family's other dialects' terms (`reads`), as each family's dialects read one another (the dialects proposal,
Retrofit's design, "Installs in any order within a family"); none of it is a reason to reinstate `Uses` (mbse-basis
[CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)). Its terms are written
through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda u: u.character(lambda c: c.value(ord("a")))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "GRAMMARS", "SYNTAX_OPTIONS", "ECMASCRIPT",
           "CLASS_NAMES", "SETS", "ASSERTIONS", "HOLDS", "FEATURES", "grammar", "problems"]

(REGEX, PATTERNLIST, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERCLASSRANGE,
 CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE, EXCLASS, COLLATINGELEMENT, EQUIVALENCE) = (
    "regex", "patternlist", "pattern", "alternative", "group", "capturinggroup", "quantifier", "characterclass",
    "characterclassrange", "characterset", "character", "assertion", "backreference", "exclass", "collatingelement",
    "equivalence")

TAGS = (REGEX, PATTERNLIST, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERCLASSRANGE,
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

CLASS_NAMES = ("alnum", "alpha", "blank", "cntrl", "digit", "graph", "lower", "print", "punct", "space", "upper",
               "xdigit", "d", "s", "w")
"""The class names every traits class recognizes, at least ([re.grammar], 7); which others it does is its own."""

SETS = ("any", "digit", "space", "word")
"""A characterset's kinds: `.`, and ECMAScript's `\\d`, `\\s` and `\\w`."""

ASSERTIONS = ("start", "end", "word", "lookahead")
"""An assertion's kinds: `^`, `$`, and ECMAScript's `\\b` and `(?=...)`."""

ATOMS = (GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE)
CLASS_ATOMS = (CHARACTERCLASSRANGE, CHARACTERSET, CHARACTER, EXCLASS, COLLATINGELEMENT, EQUIVALENCE)
ENDS = (CHARACTER, COLLATINGELEMENT)

HOLDS: dict[str, dict[str, tuple[str, ...]]] = {
    REGEX: {"pattern": (PATTERN, PATTERNLIST)},
    PATTERNLIST: {"patterns": (PATTERN,)},
    PATTERN: {"alternatives": (ALTERNATIVE,)},
    ALTERNATIVE: {"elements": ATOMS},
    GROUP: {"alternatives": (ALTERNATIVE,)},
    CAPTURINGGROUP: {"alternatives": (ALTERNATIVE,)},
    QUANTIFIER: {"element": ATOMS},
    CHARACTERCLASS: {"elements": CLASS_ATOMS},
    CHARACTERCLASSRANGE: {"min": ENDS, "max": ENDS},
    ASSERTION: {"alternatives": (ALTERNATIVE,)},
}
"""What each kind's terms may be, by property, besides invalid syntax: the grammars' structure, which the schema, every
property holding its `Term`, leaves to validation (the dialects proposal, Decided, 4)."""

_EXTENDED = ("extended", "awk", "egrep")

FEATURES: dict[str, tuple[str, ...]] = {
    "a patternlist": ("grep", "egrep"),
    "alternation": (ECMASCRIPT, *_EXTENDED),
    "a group": (ECMASCRIPT,),
    "a lookahead assertion": (ECMASCRIPT,),
    "a word assertion": (ECMASCRIPT,),
    "a digit characterset": (ECMASCRIPT,),
    "a space characterset": (ECMASCRIPT,),
    "a word characterset": (ECMASCRIPT,),
    "a lazy quantifier": (ECMASCRIPT,),
    "a repeated quantifier": _EXTENDED,
    "a repeated anchor": _EXTENDED,
    "an anchor within the expression": (ECMASCRIPT, *_EXTENDED),
    "a backreference": (ECMASCRIPT, "basic", "grep"),
    "a backreference past 9": (ECMASCRIPT,),
}
"""The constructs not every grammar has, each with the grammars that have it: ECMAScript's own (a group, a lookahead, a
word boundary, a class escape, a lazy quantifier); alternation, which a BRE has not (XBD 9.5.2), but grep's list of
patterns; grep's and egrep's list; a repeated quantifier or anchor, which only an ERE's grammar allows
(`ERE_expression ERE_dupl_symbol`, XBD 9.5.3); an anchor anywhere but where a BRE begins or ends (`L_ANCHOR`,
`R_ANCHOR`); and a backreference, which no ERE has, a BRE's being `\\1` to `\\9` (`BACKREF`)."""


def grammar(flags: tuple[str, ...]) -> str:
    """The grammar a regex's `flags` select: its one grammar element, else ECMAScript, the default ([re.synopt])."""
    return next((flag for flag in flags if flag in GRAMMARS), ECMASCRIPT)


def install(txn: Any) -> Any:
    """Cpp RegExp's union of its kinds, added to the framework's terms as the branch `cpp_regexp`, its own kinds, and its
    dialect's schema, whose singleton is `Expressions.Cpp.RegExp`: run after `Framework.install`, in a transaction of its
    own, before or after its family's other installs; run again, it writes nothing. Its kinds hold its own terms alone.
    Its holder, `Expressions.Cpp.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
    its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    names =("Regex", "PatternList", "Pattern", "Alternative", "Group", "CapturingGroup", "Quantifier", "CharacterClass",
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
            # a regex: the `syntax_option_type` it is constructed with, and its pattern
            lambda _: _.Regex.name("Expressions.Cpp.RegExp.Regex").properties({
                "flags": many(S.OfStr), "pattern": _.Term}),
            lambda _: _.PatternList.name("Expressions.Cpp.RegExp.PatternList").properties({"patterns": many(_.Term)}),
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
    """What a regex's pattern has that its grammar has not (`FEATURES`), each once, in the order first met."""
    found: list[str] = []

    def lacks(feature: str) -> None:
        message = f"{feature} is not in the {grammar_} grammar"
        if grammar_ not in FEATURES[feature] and message not in found:
            found.append(message)

    def visit(term: Any, top: bool, anchored: bool) -> None:
        node = _read(term)
        kind, attributes = node.kind, node.attributes
        if kind in F.INVALID_KINDS:
            return
        if kind == PATTERNLIST:
            lacks("a patternlist")
        if len(node.lists.get("alternatives", ())) > 1:
            lacks("alternation")
        if kind == GROUP:
            lacks("a group")
        if kind == ASSERTION and attributes.get("assertionKind") in ("word", "lookahead"):
            lacks(f"a {attributes['assertionKind']} assertion")
        if kind == ASSERTION and attributes.get("assertionKind") in ("start", "end") and not anchored:
            lacks("an anchor within the expression")
        if kind == CHARACTERSET and attributes.get("setKind") in ("digit", "space", "word"):
            lacks(f"a {attributes['setKind']} characterset")
        if kind == QUANTIFIER:
            if attributes.get("greedy") is False:
                lacks("a lazy quantifier")
            element = node.subterms["element"]
            inner = _read(element) if element is not None else None
            if inner is not None and inner.kind == QUANTIFIER:
                lacks("a repeated quantifier")
            if inner is not None and inner.kind == ASSERTION and inner.attributes.get("assertionKind") in ("start", "end"):
                lacks("a repeated anchor")
        if kind == BACKREFERENCE:
            lacks("a backreference")
            if type(attributes.get("ref")) is int and attributes["ref"] > 9:
                lacks("a backreference past 9")
        if kind == ALTERNATIVE:
            elements = node.lists["elements"]
            for i, element in enumerate(elements):
                assertion = _read(element).attributes.get("assertionKind")
                visit(element, False, top and (assertion == "start" and i == 0 or assertion == "end"
                                               and i == len(elements) - 1))
            return
        for name in HOLDS.get(kind, {}):
            for held in _held(node, name):
                visit(held, kind in (REGEX, PATTERNLIST, PATTERN) and top, False)

    visit(root, True, False)
    return found


def problems(node: F.Node) -> list[str]:
    """A node's checks: what its terms may be (`HOLDS`), its attributes' values, and, of a regex, its flags and what its
    pattern has that its grammar has not (`FEATURES`)."""
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
        if len(grammars) > 1:
            found.append(f"a regex has at most one grammar element, got {', '.join(grammars)}")
        elif node.subterms["pattern"] is not None:
            found += _grammar_problems(grammar(flags), node.subterms["pattern"])
    elif kind == QUANTIFIER:
        least, most = attributes.get("min"), attributes.get("max")
        if type(least) is int and least < 0:
            found.append(f"a quantifier's min cannot be negative, got {least}")
        if type(least) is int and type(most) is int and most < least:
            found.append(f"a quantifier's max cannot be less than its min, got {most} and {least}")
        element = node.subterms["element"]
        if element is not None and _read(element).attributes.get("assertionKind") == "word":
            found.append("a quantifier cannot repeat a word assertion")
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
    """The dialects of its family, imported when first needed: C++'s, Cpp Types' and C Preprocessor's."""
    from ...C.Preprocessor import Expressions as CPreprocessor
    from ..Expressions import Expressions as Cpp
    from ..Types import Expressions as CppTypes
    return Cpp.DIALECT, CppTypes.DIALECT, CPreprocessor.DIALECT


DIALECT = F.Dialect("Cpp.RegExp", _kinds(), domain_of=lambda value: FD.Anything, reads=_reads)
"""The Cpp RegExp dialect: its kinds, as the framework reads them, and its family's other dialects' terms."""
