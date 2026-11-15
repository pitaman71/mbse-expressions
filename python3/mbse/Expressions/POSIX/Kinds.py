"""The POSIX family's shared reading of its kinds: what `POSIX BRE` and `POSIX ERE` share, each dialect defining its own
copy of the kinds both have (as C and C++ do), written once here for both. Internal: each dialect's module
(`POSIX.BRE.Expressions`, `POSIX.ERE.Expressions`) gives its own `install`, `define`, `TAGS`, `HOLDS` and `DIALECT`
from it, and its `Text` its printer.

POSIX (IEEE Std 1003.1, The Open Group Base Specifications; ISO/IEC/IEEE 9945) defines two regular expression
grammars, in its Base Definitions, chapter 9 (XBD 9): basic regular expressions (9.3, BREs) and extended ones (9.4,
EREs), each with its own start symbol in its grammar (9.5.2, `basic_reg_exp`; 9.5.3, `extended_reg_exp`), sharing the
bracket expression's (9.5.2). Its utilities read one or the other, and define no grammar of their own: grep its
patterns as BREs, or as EREs with `-E` (XCU grep), a newline-separated list of them (its `pattern_list`); awk EREs, "except
that it shall allow the use of C-language conventions for escaping special characters" (XCU awk, Regular Expressions),
which changes how a character is spelled, not the grammar. So the two grammars are the family's dialects
*(agent)* (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "if the standard says it's a sublanguage then it's definitely at
least a separate dialect"), grep's list of patterns a kind of each, `patternlist`, and awk's escapes a way of printing an
ERE's characters (`Text`'s `awk`).

Each kind is named as regexpp names ECMAScript's construct (as `TypeScript RegExp`'s and `Cpp RegExp`'s are, each family
its own copy), and as [re.grammar] names the class atoms POSIX's bracket expressions share with it; tags lowercased:

- `patternlist`, grep's newline-separated list of patterns (XCU grep, `pattern_list`), its `patterns`;
- `pattern` (`basic_reg_exp`, `extended_reg_exp`), its `alternatives`, and `alternative` (`BRE_branch`, before
  POSIX.1-2024 `RE_expression`; `ERE_branch`), its `elements`;
- `capturinggroup`, a subexpression, an ERE's `(...)`, a BRE's `\\(...\\)`, its `alternatives`;
- `quantifier`: its `raw`, as written (`\\{2,\\}`, `{0,}`), printed where it has one, its `min`, its `max` (absent: no
  bound), and its `element`; an ERE's also whether it is `greedy` (absent: it is; POSIX.1-2024's repetition modifier,
  `*?`, makes it not);
- `characterclass`, a bracket expression (`[^...]`): whether it is `negate`d, and its `elements`; and
  `characterclassrange` (`a-z`), its `min` and `max`, each a character or a collating element;
- `characterset`: its `setKind`, `any` (`.`), the one a BRE and an ERE have;
- `character`: its `raw`, as written (`\\.`), printed where it has one, and its `value`, a code point;
- `assertion`: its `assertionKind`, `start` (`^`) or `end` (`$`);
- a BRE's `backreference` (`\\1` to `\\9`, `BACKREF`), its `ref`, which an ERE has not;
- the class atoms, each its `name`: `exclass` (`[:alpha:]`, `character_class`), `collatingelement` (`[.ch.]`,
  `collating_symbol`) and `equivalence` (`[=a=]`, `equivalence_class`);

then the framework's kinds of invalid syntax, `error` and `missing`. No helpers. What a kind's terms may be is checked
(`HOLDS`), as the grammar has it: a BRE's quantifier repeats no quantifier and no anchor (`nondupl_BRE
BRE_dupl_symbol`), an ERE's may (`ERE_expression ERE_dupl_symbol`); a BRE's anchor stands only where a BRE begins or
ends (`L_ANCHOR`, `R_ANCHOR`, 9.3.8), an ERE's anywhere. What POSIX.1-2024 added within a kind, a BRE's alternation
(`\\|`), `\\?` and `\\+`, which it leaves to the implementation, and an ERE's repetition modifier, is not recorded, as
a feature within a kind is not for any dialect; C++, which cites earlier editions, checks it under a `regex`
(`Cpp.RegExp.FEATURES`).

No kind binds a name a term scopes: a subexpression is numbered, and a backreference resolves it by its number. Its
kinds are applications of no domain known statically, each left in the residual by simplification, named by its dialect ("POSIX BRE
pattern is not simplified"). The editions each covers are data, which `define` writes: POSIX.1's, IEEE Std 1003.1-2001,
-2008, -2017 and -2024, every kind in each (`SINCE`)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

__all__ = ["BRE", "ERE", "names", "tags", "holds", "problems", "kinds", "install", "define", "EDITIONS", "Printer"]

BRE, ERE = "BRE", "ERE"

(PATTERNLIST, PATTERN, ALTERNATIVE, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERCLASSRANGE, CHARACTERSET,
 CHARACTER, ASSERTION, BACKREFERENCE, EXCLASS, COLLATINGELEMENT, EQUIVALENCE) = (
    "patternlist", "pattern", "alternative", "capturinggroup", "quantifier", "characterclass", "characterclassrange",
    "characterset", "character", "assertion", "backreference", "exclass", "collatingelement", "equivalence")

_NAMES = ("PatternList", "Pattern", "Alternative", "CapturingGroup", "Quantifier", "CharacterClass",
          "CharacterClassRange", "CharacterSet", "Character", "Assertion", "Backreference", "ExClass",
          "CollatingElement", "Equivalence")

SETS = ("any",)
"""A characterset's kinds: `.`, the one a BRE and an ERE have."""

ASSERTIONS = ("start", "end")
"""An assertion's kinds: `^` and `$`."""

CLASS_ATOMS = (CHARACTERCLASSRANGE, CHARACTER, EXCLASS, COLLATINGELEMENT, EQUIVALENCE)
ENDS = (CHARACTER, COLLATINGELEMENT)

EDITIONS = (("IEEE Std 1003.1-2001", 2001, ("POSIX.1-2001", "ISO/IEC 9945:2003"), "POSIX_2001"),
            ("IEEE Std 1003.1-2008", 2008, ("POSIX.1-2008", "ISO/IEC/IEEE 9945:2009"), "POSIX_2008"),
            ("IEEE Std 1003.1-2017", 2017, ("POSIX.1-2017",), "POSIX_2017"),
            ("IEEE Std 1003.1-2024", 2024, ("POSIX.1-2024",), "POSIX_2024"))
"""POSIX.1's editions, each by IEEE's designation, its year, its common names (the ISO/IEC designation C++ cites,
[intro.refs], among them: ISO/IEC 9945:2003 in C++17 and C++20, ISO/IEC/IEEE 9945:2009 in C++23) and its frame symbol
*(agent)*; an edition that incorporates technical corrigenda (2004, 2013, 2016) is not one of its own."""


def names(which: str) -> tuple[str, ...]:
    """A dialect's kinds' schema names, in its `Term`'s order: an ERE's without `Backreference`."""
    return _NAMES if which == BRE else tuple(name for name in _NAMES if name != "Backreference")


def tags(which: str) -> tuple[str, ...]:
    """A dialect's own kinds' tags, in its `Term`'s order, before invalid syntax."""
    return tuple(name.lower() for name in names(which))


def holds(which: str) -> dict[str, dict[str, tuple[str, ...]]]:
    """What each kind's terms may be, by property, besides invalid syntax: XBD 9.5's structure, which the schema, every
    property holding its `Term`, leaves to validation (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "The framework's kinds with subterms stay shared")."""
    atoms = (CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERSET, CHARACTER, ASSERTION) + (
        (BACKREFERENCE,) if which == BRE else ())
    repeated = (CAPTURINGGROUP, CHARACTERCLASS, CHARACTERSET, CHARACTER, BACKREFERENCE) if which == BRE else atoms
    return {
        PATTERNLIST: {"patterns": (PATTERN,)},
        PATTERN: {"alternatives": (ALTERNATIVE,)},
        ALTERNATIVE: {"elements": atoms},
        CAPTURINGGROUP: {"alternatives": (ALTERNATIVE,)},
        QUANTIFIER: {"element": repeated},
        CHARACTERCLASS: {"elements": CLASS_ATOMS},
        CHARACTERCLASSRANGE: {"min": ENDS, "max": ENDS},
    }


def _held(node: F.Node, name: str) -> tuple[Any, ...]:
    """The terms a kind's property `name` holds: a subterm's, where it is not empty, or a container's."""
    if name in node.subterms:
        return () if node.subterms[name] is None else (node.subterms[name],)
    return node.lists[name]


def _anchor(term: Any) -> Any:
    """An element's assertion kind, where it is an anchor."""
    return F.node(*F.kind_of(term)).attributes.get("assertionKind")


def problems(which: str, node: F.Node) -> list[str]:
    """A node's checks: what its terms may be (`holds`), its attributes' values, and, in a BRE, where an anchor
    stands."""
    found: list[str] = []
    kind, attributes = node.kind, node.attributes
    for name, allowed in holds(which).get(kind, {}).items():
        for held in _held(node, name):
            tag = F.kind_of(held)[0]
            if tag not in allowed and tag not in F.INVALID_KINDS:
                found.append(f"{F._article(kind)}'s {name} cannot hold {F._article(tag)}")
    if which == BRE and kind == ALTERNATIVE:  # `^` where a BRE begins, `$` where it ends (L_ANCHOR, R_ANCHOR)
        elements = node.lists["elements"]
        for i, element in enumerate(elements):
            anchor = _anchor(element)
            if anchor == "start" and i != 0 or anchor == "end" and i != len(elements) - 1:
                found.append(f"{F._article(anchor)} assertion stands only where a BRE {'begins' if anchor == 'start' else 'ends'}")
    elif which == BRE and kind == CAPTURINGGROUP:  # 9.3.8: within `\(...\)`, an anchor is the implementation's
        if any(_anchor(element) is not None for alternative in node.lists["alternatives"]
               if F.kind_of(alternative)[0] == ALTERNATIVE for element in F.node(*F.kind_of(alternative)).lists["elements"]):
            found.append("a BRE's subexpression holds no anchor")
    elif kind == QUANTIFIER:
        least, most = attributes.get("min"), attributes.get("max")
        if type(least) is int and least < 0:
            found.append(f"a quantifier's min cannot be negative, got {least}")
        if type(least) is int and type(most) is int and most < least:
            found.append(f"a quantifier's max cannot be less than its min, got {most} and {least}")
    elif kind == CHARACTERSET and "setKind" in attributes and attributes["setKind"] not in SETS:
        found.append(f"CharacterSet.setKind cannot be {attributes['setKind']!r}")
    elif kind == CHARACTER and type(attributes.get("value")) is int and not 0 <= attributes["value"] <= 0x10FFFF:
        found.append(f"a character's value must be a code point, got {attributes['value']}")
    elif kind == ASSERTION and "assertionKind" in attributes and attributes["assertionKind"] not in ASSERTIONS:
        found.append(f"Assertion.assertionKind cannot be {attributes['assertionKind']!r}")
    elif kind == BACKREFERENCE and type(attributes.get("ref")) is int and not 1 <= attributes["ref"] <= 9:
        found.append(f"a backreference's ref must be 1 to 9, got {attributes['ref']}")
    elif kind in (EXCLASS, COLLATINGELEMENT, EQUIVALENCE) and type(attributes.get("name")) is str:
        found += [f"{F._article(kind)}'s name cannot hold {c!r}" for c in ".=:" if c in attributes["name"]][:1]
    return found


_REQUIRED = {QUANTIFIER: ("min",), CHARACTERSET: ("setKind",), CHARACTER: ("value",), ASSERTION: ("assertionKind",),
             BACKREFERENCE: ("ref",), EXCLASS: ("name",), COLLATINGELEMENT: ("name",), EQUIVALENCE: ("name",)}


def kinds(which: str) -> dict[str, F.Kind]:
    """How the framework reads a dialect's kinds: applications, of no domain known statically (`Opaque`)."""
    def check(tag: str) -> Callable[[Any], list[str]]:
        return lambda record: problems(which, F.node(tag, record))
    return {tag: F.Kind(F.APPLICATION, signature=FD.Opaque(), check=check(tag), required=_REQUIRED.get(tag, ()))
            for tag in tags(which)}


def install(which: str, txn: Any) -> Any:
    """A dialect's union of its kinds, added to the framework's terms as its branch (`posix_bre`, `posix_ere`), its own
    kinds, and its dialect's schema, whose singleton is `Expressions.POSIX.<which>`; its holder,
    `Expressions.POSIX.<which>.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
    `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    path, tag, own = f"Expressions.POSIX.{which}", f"posix_{which.lower()}", names(which)

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    def shape(_: Any, name: str) -> dict[str, Any]:
        quantifier = {"raw": S.OfStr, "min": S.OfInt, "max": S.OfInt, **({"greedy": S.OfBool} if which == ERE else {}),
                      "element": _.Term}
        return {"PatternList": {"patterns": many(_.Term)}, "Pattern": {"alternatives": many(_.Term)},
                "Alternative": {"elements": many(_.Term)}, "CapturingGroup": {"alternatives": many(_.Term)},
                "Quantifier": quantifier, "CharacterClass": {"negate": S.OfBool, "elements": many(_.Term)},
                "CharacterClassRange": {"min": _.Term, "max": _.Term}, "CharacterSet": {"setKind": S.OfStr},
                "Character": {"raw": S.OfStr, "value": S.OfInt}, "Assertion": {"assertionKind": S.OfStr},
                "Backreference": {"ref": S.OfInt}, "ExClass": {"name": S.OfStr},
                "CollatingElement": {"name": S.OfStr}, "Equivalence": {"name": S.OfStr}}[name]

    return txn.uid(f"mbse.Expressions.POSIX.{which}/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, **dict.fromkeys(own, S.OfObject)})
        .spec([
            # its dialect: its singleton, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name(f"{path}.Dialect").ref(True).singleton(path).adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name(tag).schema([_.Dialect])]),
            # its union of its kinds, and invalid syntax
            lambda _: _.Term.name(f"{path}.Term").branches([
                *(lambda t, name=name: t.name(name.lower()).schema([getattr(_, name)]) for name in own),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its kinds, each a value object holding its own terms
            *(lambda _, name=name: getattr(_, name).name(f"{path}.{name}").properties(shape(_, name)) for name in own),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name(f"{path}.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name(tag).schema([_.Term])]),
        ])]))])


def define(which: str, txn: Any) -> Any:
    """A dialect as data: its singleton owning the editions it covers, by designation (`standards`), POSIX.1's, each
    with its formal reference's parts, its common names and its own kinds it has (every kind in each). Its frame binds
    the dialect (`dialect`) and each edition by its frame symbol (`POSIX_2008`)."""
    OWN, Standard = getattr(txn.Expressions.POSIX, which), txn.Expressions.Framework.Standard
    own = tags(which)
    every = [branch.schema for branch in OWN.Term.as_schema().branches if branch.name in own]
    edition = lambda _, year, common, symbol: getattr(_, symbol).bodies(["org.ieee"]).number("1003.1").revision(  # noqa: E731
        lambda r: r.year(year)).names(list(common)).kinds(every)
    return txn.uid(f"mbse.Expressions.POSIX.{which}.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, **{symbol: Standard for *_, symbol in EDITIONS}})
        .spec([
            lambda _: _.dialect.standards({designation: lambda e, symbol=symbol: e.standard(getattr(_, symbol))
                                           for designation, _year, _names, symbol in EDITIONS}),
            *(lambda _, year=year, common=common, symbol=symbol: edition(_, year, common, symbol)
              for _designation, year, common, symbol in EDITIONS),
        ])]))])


_SPECIAL = {BRE: "^.[$*\\", ERE: "^.[$()|*+?{\\"}
"""The characters each grammar's text escapes outside a bracket expression, its special characters (XBD 9.3.3,
9.4.3); none within one, which has no escapes."""

_AWK = {0x09: "t", 0x0A: "n", 0x0B: "v", 0x0C: "f", 0x0D: "r", 0x07: "a", 0x08: "b"}


class Printer:
    """Writes a term's source in a grammar, from its `Node`: a BRE's or an ERE's, an ERE's characters with awk's
    escapes where `awk` is given."""

    def __init__(self, dialect: F.Dialect, which: str, awk: bool = False):
        self.dialect, self.which, self.awk = dialect, which, awk

    def term(self, value: Any, within: bool = False) -> str:
        tag, record, _ = self.dialect.kind(value)
        if tag in F.INVALID_KINDS:
            return F.invalid_term_text(self.dialect, value)
        owner = self.dialect.owner(value)
        if owner is not self.dialect:  # a term of the family's other dialect, written in its own grammar
            return Printer(owner, ERE if self.which == BRE else BRE).term(value, within)
        return getattr(self, tag)(F.node(tag, record), within)

    def alternatives(self, node: F.Node) -> str:
        return ("\\|" if self.which == BRE else "|").join(self.term(alternative) for alternative in node.lists["alternatives"])

    def patternlist(self, node: F.Node, within: bool) -> str:
        return "\n".join(self.term(pattern) for pattern in node.many)

    def pattern(self, node: F.Node, within: bool) -> str:
        return self.alternatives(node)

    def alternative(self, node: F.Node, within: bool) -> str:
        return "".join(self.term(element) for element in node.many)

    def capturinggroup(self, node: F.Node, within: bool) -> str:
        return f"\\({self.alternatives(node)}\\)" if self.which == BRE else f"({self.alternatives(node)})"

    def quantifier(self, node: F.Node, within: bool) -> str:
        element = self.term(node.subterms["element"])
        if "raw" in node.attributes:
            return element + node.attributes["raw"]
        least, most = node.attributes["min"], node.attributes.get("max")
        shorthand = {(0, None): "*", (1, None): "+", (0, 1): "?"}.get((least, most))
        if shorthand == "?" and F.kind_of(node.subterms["element"])[0] == QUANTIFIER:  # `a+?` is POSIX.1-2024's lazy `+`
            shorthand = None
        if shorthand is not None and (shorthand == "*" or self.which == ERE):
            written = shorthand
        else:
            bounds = f"{least}" if most == least else f"{least}," + ("" if most is None else f"{most}")
            written = f"\\{{{bounds}\\}}" if self.which == BRE else f"{{{bounds}}}"
        return element + written + ("?" if node.attributes.get("greedy") is False else "")

    def characterclass(self, node: F.Node, within: bool) -> str:
        negate = "^" if node.attributes.get("negate") else ""
        return f"[{negate}{''.join(self.term(element, True) for element in node.many)}]"

    def characterclassrange(self, node: F.Node, within: bool) -> str:
        return f"{self.term(node.subterms['min'], True)}-{self.term(node.subterms['max'], True)}"

    def characterset(self, node: F.Node, within: bool) -> str:
        return "."

    def character(self, node: F.Node, within: bool) -> str:
        if "raw" in node.attributes:
            return node.attributes["raw"]
        code = node.attributes["value"]
        c = chr(code)
        if self.awk and code in _AWK:
            return "\\" + _AWK[code]
        if self.awk and (code < 0x20 or code == 0x7F):
            return f"\\{code:03o}"
        return c if within or c not in _SPECIAL[self.which] else "\\" + c  # no escapes within a bracket expression

    def assertion(self, node: F.Node, within: bool) -> str:
        return "^" if node.attributes["assertionKind"] == "start" else "$"

    def backreference(self, node: F.Node, within: bool) -> str:
        return f"\\{node.attributes['ref']}"

    def exclass(self, node: F.Node, within: bool) -> str:
        return f"[:{node.attributes['name']}:]"

    def collatingelement(self, node: F.Node, within: bool) -> str:
        return f"[.{node.attributes['name']}.]"

    def equivalence(self, node: F.Node, within: bool) -> str:
        return f"[={node.attributes['name']}=]"
