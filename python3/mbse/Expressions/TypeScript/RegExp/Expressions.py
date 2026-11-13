"""Expressions of the TypeScript RegExp dialect: ECMA-262's regular expressions, the pattern grammar (22.2.1, "Patterns")
a regular expression literal holds (12.9.5), as @eslint-community/regexpp reads them, the parser ESLint and
typescript-eslint read a regular expression's body with, as typescript-estree reads TypeScript's.

It is a dialect of the TypeScript family (the dialects proposal, Decided for stage 6: "constraints, regexes and patterns
are expression dialects"; its Retrofit's design; the user's "(b)" on which regular expressions are dialects), named
`TypeScript RegExp` (`Terms.dialect_name`), its tag `typescript_regexp`. Its terms are values of its `Term`,
`Expressions.TypeScript.RegExp.Term`, the branch `typescript_regexp` of `Expressions.Framework.Term`. mbse-programs has
no kinds for a regular expression's body, so its kinds are regexpp's node types
(`mbse:mbse-basis/docs/capabilities/CAP-226.md`, "where mbse-programs has none, they are the reference parser's"), with
regexpp's names, lowercased as branch tags, and its properties in the order regexpp declares them, each a value object
`Expressions.TypeScript.RegExp.<Kind>`: `regexpliteral` (`pattern`, `flags`), `pattern` (`alternatives`),
`alternative` (`elements`), `group` (`modifiers`, `alternatives`), `capturinggroup` (`name`, `alternatives`),
`quantifier` (`min`, `max`, `greedy`, `element`), `characterclass` (`unicodeSets`, `negate`, `elements`),
`characterclassrange` (`min`, `max`), `classintersection` and `classsubtraction` (`left`, `right`),
`classstringdisjunction` (`alternatives`), `stringalternative` (`elements`), `expressioncharacterclass` (`negate`,
`expression`), `characterset` (`setKind`: `any`, `digit`, `space`, `word` or `property`; `negate`, `strings`, `key`,
`value`), `character` (`value`, a code point), `assertion` (`assertionKind`: `start`, `end`, `word`, `lookahead` or
`lookbehind`; `negate`, `alternatives`), `backreference` (`ref`, a group's number or its name) and `modifiers` (`add`,
`remove`); then invalid syntax, `error` and `missing`. A property whose name is a keyword of Python or the framework's
`kind` is renamed as mbse-programs renames typescript-estree's (`isAsync`, `propertyKind`): regexpp's `kind` is
`setKind` and `assertionKind`, and a flag's `global` `isGlobal` *(agent)*. Its helpers are regexpp's two node types that are a kind's parts
rather than an expression's: `Flags`, a literal's, and `ModifierFlags`, a modifiers' (`HELPERS`). What regexpp derives
from a tree rather than reads (a node's `parent`, `start` and `end`, a group's `references`, a backreference's
`resolved` and `ambiguous`) is not kept *(agent)*. A node's spelling, regexpp's `raw`, is kept where the tree does not
give it, as a literal's `text` is (mbse-basis [PRI-023: domain
representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023); the dialects proposal, Decided, 2, "concrete syntax kept, so
source prints back as written"): a leaf's, `character`'s, `characterset`'s and `backreference`'s, `Flags`' and
`ModifierFlags`', and a quantifier's, whose `{0,}` its bounds do not tell from `*` *(agent)*. A quantifier's `max` is
absent where it is unbounded, regexpp's `Infinity` *(agent)*.

A regular expression binds nothing a term scopes: a named group's name is a label within its pattern, which a
backreference resolves, so none of its kinds refines `Let`, as the dialects proposal's Retrofit's design has it. It
holds no other dialect's terms, and none of its kinds is evaluated (Q11): each is refused by name ("TypeScript RegExp
character is not evaluated"). Which kinds a mode allows (the `v` flag's classes in a literal without it), like which
terms a subterm may be, is a constraint (the dialects proposal, Decided, 4), not its checks'.

Where it is held: `TypeScript5`'s `constant`, a regular expression literal, keeps its `pattern` and `flags` as written
and holds its `regexp`, the `regexpliteral` they encode, absent where they do not parse (PRI-023); nothing else holds
it, a string given to `new RegExp` being a string (mbse-basis [PRI-025: never guess the
schema](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-025)). mbse-programs, or a constraint's author, holds one through its
holder too.

The editions of ECMA-262 it covers are data, which `define` writes, each owned by its designation as Ecma International
writes it (`ECMA-262 6th Edition`), from the 5.1 Edition to the 17th (ECMAScript 2026), each with its body, its number,
its edition and its common names (`ECMAScript 2015`, `ES2015`), and the kinds it has: the `v` flag's five from the 15th
(ES2024), `modifiers` from the 16th, every other in each (`SINCE`), the 17th's pattern grammar (22.2.1) the 16th's
*(agent)*; a feature within a kind (a named group, a
lookbehind, a property escape, ES2018) is not recorded. `DIALECT` reads its kinds and its family's other dialects'
terms (`reads`). `Text` writes its kinds as ECMAScript source, as the family's printer (`TypeScript5.Text.ToText`)
dispatches them to it. Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `lambda r: r.character(lambda c: c.value(97))`."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..TypeScript5 import Domains as _family

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "EDITIONS", "ASSERTIONS", "CHARACTERSETS",
           "FLAGS", "MODIFIERS"]

REGEXPLITERAL, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER = (
    "regexpliteral", "pattern", "alternative", "group", "capturinggroup", "quantifier")
CHARACTERCLASS, CHARACTERCLASSRANGE, CLASSINTERSECTION, CLASSSUBTRACTION = (
    "characterclass", "characterclassrange", "classintersection", "classsubtraction")
CLASSSTRINGDISJUNCTION, STRINGALTERNATIVE, EXPRESSIONCHARACTERCLASS = (
    "classstringdisjunction", "stringalternative", "expressioncharacterclass")
CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE, MODIFIERS_ = (
    "characterset", "character", "assertion", "backreference", "modifiers")

TAGS = (REGEXPLITERAL, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERCLASSRANGE,
        CLASSINTERSECTION, CLASSSUBTRACTION, CLASSSTRINGDISJUNCTION, STRINGALTERNATIVE, EXPRESSIONCHARACTERCLASS,
        CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE, MODIFIERS_)
"""Its own kinds, in its `Term`'s order: regexpp's node types but its two helpers."""

HELPERS = ("Flags", "ModifierFlags")
"""Its own helpers: a literal's flags, and a modifiers' flags, each a value object a kind holds."""

ASSERTIONS = ("start", "end", "word", "lookahead", "lookbehind")
"""An assertion's kinds, as regexpp names them: `^`, `$`, `\\b` (or `\\B`), and the lookarounds."""

CHARACTERSETS = ("any", "digit", "space", "word", "property")
"""A character set's kinds, as regexpp names them: `.`, `\\d`, `\\s`, `\\w` (or their negations) and a property
escape, `\\p{...}` (or `\\P{...}`)."""

FLAGS = (("hasIndices", "d"), ("isGlobal", "g"), ("ignoreCase", "i"), ("multiline", "m"), ("dotAll", "s"),
         ("unicode", "u"), ("unicodeSets", "v"), ("sticky", "y"))
"""A literal's flags, each regexpp's property and its letter, in the order `RegExp.prototype.flags` writes them."""

MODIFIERS = (("ignoreCase", "i"), ("multiline", "m"), ("dotAll", "s"))
"""The flags a modifiers adds or removes, each regexpp's property and its letter, in the order ECMA-262 lists them."""

EDITIONS = (
    ("ECMA-262 5.1 Edition", ("version", "5.1"), ("ECMAScript 5.1", "ES5.1"), "ES5_1"),
    *((f"ECMA-262 {n}th Edition", ("edition", n), (f"ECMAScript {2009 + n}", f"ES{2009 + n}"), f"ES{2009 + n}")
      for n in range(6, 18)),
)
"""The editions of ECMA-262 it covers, the 5.1 Edition to the 17th, each its designation, its revision (an edition, but
the 5.1 Edition's, a version), its common names and its frame symbol *(agent)*."""

SINCE = {CLASSINTERSECTION: 10, CLASSSUBTRACTION: 10, CLASSSTRINGDISJUNCTION: 10, STRINGALTERNATIVE: 10,
         EXPRESSIONCHARACTERCLASS: 10, MODIFIERS_: 11}
"""The edition each of its kinds arrived in, by its index in `EDITIONS`: the `v` flag's five in the 15th (ES2024),
`modifiers` in the 16th (ES2025); a kind not listed is in every edition."""


def install(txn: Any) -> Any:
    """TypeScript RegExp's union of its kinds, added to the framework's terms as the branch `typescript_regexp`, its own
    kinds, its helpers, and its dialect's schema, whose singleton is `Expressions.TypeScript.RegExp`: run after
    `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it writes
    nothing. Its `Term` is named as `TypeScript5`'s install names it, for its `constant`'s `regexp`, either creating it.
    Its holder, `Expressions.TypeScript.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root`
    narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    kinds = ("RegExpLiteral", "Pattern", "Alternative", "Group", "CapturingGroup", "Quantifier", "CharacterClass",
             "CharacterClassRange", "ClassIntersection", "ClassSubtraction", "ClassStringDisjunction",
             "StringAlternative", "ExpressionCharacterClass", "CharacterSet", "Character", "Assertion",
             "Backreference", "Modifiers")
    return txn.uid("mbse.Expressions.TypeScript.RegExp/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, **{name: S.OfObject for name in kinds + HELPERS}})
        .spec([
            # its dialect: the singleton `Expressions.TypeScript.RegExp`, a branch of the framework's kind union of
            # dialects
            lambda _: _.Dialect.name("Expressions.TypeScript.RegExp.Dialect").ref(True).singleton("Expressions.TypeScript.RegExp").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("typescript_regexp").schema([_.Dialect])]),
            # its union of its kinds, regexpp's node types, and invalid syntax
            lambda _: _.Term.name("Expressions.TypeScript.RegExp.Term").branches([
                *[lambda t, tag=tag, kind=kind: t.name(tag).schema([getattr(_, kind)]) for tag, kind in zip(TAGS, kinds)],
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its kinds, each with regexpp's properties in its order; a leaf's and a quantifier's spelling, `raw`
            lambda _: _.RegExpLiteral.name("Expressions.TypeScript.RegExp.RegExpLiteral").properties({
                "pattern": _.Term, "flags": _.Flags}),
            lambda _: _.Pattern.name("Expressions.TypeScript.RegExp.Pattern").properties({"alternatives": many(_.Term)}),
            lambda _: _.Alternative.name("Expressions.TypeScript.RegExp.Alternative").properties({
                "elements": many(_.Term)}),
            lambda _: _.Group.name("Expressions.TypeScript.RegExp.Group").properties({
                "modifiers": _.Term, "alternatives": many(_.Term)}),
            lambda _: _.CapturingGroup.name("Expressions.TypeScript.RegExp.CapturingGroup").properties({
                "name": S.OfStr, "alternatives": many(_.Term)}),
            lambda _: _.Quantifier.name("Expressions.TypeScript.RegExp.Quantifier").properties({
                "raw": S.OfStr, "min": S.OfInt, "max": S.OfInt, "greedy": S.OfBool, "element": _.Term}),
            lambda _: _.CharacterClass.name("Expressions.TypeScript.RegExp.CharacterClass").properties({
                "unicodeSets": S.OfBool, "negate": S.OfBool, "elements": many(_.Term)}),
            lambda _: _.CharacterClassRange.name("Expressions.TypeScript.RegExp.CharacterClassRange").properties({
                "min": _.Term, "max": _.Term}),
            lambda _: _.ClassIntersection.name("Expressions.TypeScript.RegExp.ClassIntersection").properties({
                "left": _.Term, "right": _.Term}),
            lambda _: _.ClassSubtraction.name("Expressions.TypeScript.RegExp.ClassSubtraction").properties({
                "left": _.Term, "right": _.Term}),
            lambda _: _.ClassStringDisjunction.name("Expressions.TypeScript.RegExp.ClassStringDisjunction").properties({
                "alternatives": many(_.Term)}),
            lambda _: _.StringAlternative.name("Expressions.TypeScript.RegExp.StringAlternative").properties({
                "elements": many(_.Term)}),
            lambda _: _.ExpressionCharacterClass.name("Expressions.TypeScript.RegExp.ExpressionCharacterClass").properties({
                "negate": S.OfBool, "expression": _.Term}),
            lambda _: _.CharacterSet.name("Expressions.TypeScript.RegExp.CharacterSet").properties({
                "raw": S.OfStr, "setKind": S.OfStr, "negate": S.OfBool, "strings": S.OfBool, "key": S.OfStr,
                "value": S.OfStr}),
            lambda _: _.Character.name("Expressions.TypeScript.RegExp.Character").properties({
                "raw": S.OfStr, "value": S.OfInt}),
            lambda _: _.Assertion.name("Expressions.TypeScript.RegExp.Assertion").properties({
                "assertionKind": S.OfStr, "negate": S.OfBool, "alternatives": many(_.Term)}),
            lambda _: _.Backreference.name("Expressions.TypeScript.RegExp.Backreference").properties({
                "raw": S.OfStr, "ref": S.OfAny(lambda a: a.schemas([S.OfInt, S.OfStr]))}),  # a number or a name
            lambda _: _.Modifiers.name("Expressions.TypeScript.RegExp.Modifiers").properties({
                "add": _.ModifierFlags, "remove": _.ModifierFlags}),
            # its helpers
            lambda _: _.Flags.name("Expressions.TypeScript.RegExp.Flags").properties({
                "raw": S.OfStr, "dotAll": S.OfBool, "isGlobal": S.OfBool, "hasIndices": S.OfBool, "ignoreCase": S.OfBool,
                "multiline": S.OfBool, "sticky": S.OfBool, "unicode": S.OfBool, "unicodeSets": S.OfBool}),
            lambda _: _.ModifierFlags.name("Expressions.TypeScript.RegExp.ModifierFlags").properties({
                "raw": S.OfStr, "dotAll": S.OfBool, "ignoreCase": S.OfBool, "multiline": S.OfBool}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.TypeScript.RegExp.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("typescript_regexp").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """TypeScript RegExp's dialect as data: the singleton `Expressions.TypeScript.RegExp` owning the editions of ECMA-262
    it covers, by designation (`standards`, through `Expressions.Framework.Covers`), the 5.1 Edition to the 17th, each
    with its body, `org.ecma-international`, its number, `262`, its revision, its common names and its own kinds it has
    (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the
    dialect (`dialect`) and each edition by its last common name spelled as an identifier (`ES5_1`, `ES2015`)."""
    OWN, Standard = txn.Expressions.TypeScript.RegExp, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}

    def edition(index: int, revision: tuple[str, Any], names: tuple[str, ...]) -> Any:
        kinds = [schema for tag, schema in every.items() if SINCE.get(tag, 0) <= index]
        return lambda e: e.bodies(["org.ecma-international"]).number("262").revision(
            lambda r: getattr(r, revision[0])(revision[1])).names(list(names)).kinds(kinds)

    return txn.uid("mbse.Expressions.TypeScript.RegExp.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, **{symbol: Standard for *_, symbol in EDITIONS}})
        .spec([
            lambda _: _.dialect.standards({designation: lambda e, symbol=symbol: e.standard(getattr(_, symbol))
                                           for designation, *_rest, symbol in EDITIONS}),
            *[lambda _, i=i, revision=revision, names=names, symbol=symbol: edition(i, revision, names)(getattr(_, symbol))
              for i, (_designation, revision, names, symbol) in enumerate(EDITIONS)],
        ])]))])


# --- Its kinds, as the framework reads them ---


def _flags(raw: Any, allowed: tuple[tuple[str, str], ...], what: str) -> list[str]:
    """A spelling of flags: its letters among `allowed`, each once."""
    letters = "".join(letter for _name, letter in allowed)
    if raw is None or (all(c in letters for c in raw) and len(set(raw)) == len(raw)):
        return []
    return [f"{what} cannot be {raw!r}"]


def _set(node: F.Node, allowed: tuple[tuple[str, str], ...]) -> set[str]:
    """The letters of the flags a helper's node holds, by its booleans."""
    return {letter for name, letter in allowed if node.attributes.get(name)}


def _spells(node: F.Node, allowed: tuple[tuple[str, str], ...], what: str) -> list[str]:
    """A flags helper's problems: its spelling's letters, and that they spell the flags it holds."""
    raw = node.attributes.get("raw")
    problems = _flags(raw, allowed, what)
    if not problems and raw is not None and set(raw) != _set(node, allowed):
        problems.append(f"{what} {raw!r} do not spell the flags it holds")
    return problems


def _literal(node: F.Node) -> list[str]:
    flags = node.helpers.get("flags")
    if flags is None:
        return []
    problems = _spells(flags, FLAGS, "a regular expression's flags")
    if flags.attributes.get("unicode") and flags.attributes.get("unicodeSets"):
        problems.append("a regular expression's flags cannot have both u and v")
    return problems


def _alternatives(node: F.Node) -> list[str]:
    """A disjunction needs an alternative: an empty one, regexpp's `Alternative` of no elements, where it is empty."""
    return [] if node.lists["alternatives"] else [f"{F._article(node.kind)} needs an alternative"]


def _code_point(node: F.Node | None) -> int | None:
    """A character's code point, where a node is a character holding one."""
    value = node.attributes.get("value") if node is not None and node.kind == CHARACTER else None
    return value if type(value) is int else None


def _quantifier(node: F.Node) -> list[str]:
    low, high = node.attributes.get("min"), node.attributes.get("max")
    if low is None:
        return ["a quantifier needs a min"]
    if type(low) is not int or (high is not None and type(high) is not int):  # validation reports its type
        return []
    if low < 0:
        return [f"a quantifier's min must not be negative, got {low}"]
    return [f"a quantifier's max {high} is less than its min {low}"] if high is not None and high < low else []


def _range(node: F.Node) -> list[str]:
    ends = {name: F.node(*F.kind_of(term)) for name, term in node.subterms.items() if term is not None}
    problems = [f"a characterclassrange's {name} must be a character, got {end.kind}" for name, end in ends.items()
                if end.kind not in (CHARACTER, "error", "missing")]
    low, high = _code_point(ends.get("min")), _code_point(ends.get("max"))
    if low is not None and high is not None and low > high:
        problems.append(f"a characterclassrange's min {low} is greater than its max {high}")
    return problems


def _expression_class(node: F.Node) -> list[str]:
    expression = node.subterms.get("expression")
    kind = None if expression is None else F.kind_of(expression)[0]
    if kind in (None, CLASSINTERSECTION, CLASSSUBTRACTION, "error", "missing"):
        return []
    return [f"an expressioncharacterclass's expression must be a classintersection or a classsubtraction, got {kind}"]


def _character_set(node: F.Node) -> list[str]:
    attributes = node.attributes
    kind = attributes.get("setKind")
    if kind is None:
        return ["a characterset needs a setKind"]
    if kind not in CHARACTERSETS:
        return [f"CharacterSet.setKind cannot be {kind!r}"]
    if kind == "property":
        if not attributes.get("key"):
            return ["a property characterset needs a key"]
        if attributes.get("strings") and attributes.get("negate"):
            return ["a characterset of strings cannot be negated"]
        return []
    if any(name in attributes for name in ("key", "value", "strings")):
        return [f"{F._article(kind)} characterset has no key, value or strings"]
    return ["an any characterset cannot be negated"] if kind == "any" and attributes.get("negate") else []


def _character(node: F.Node) -> list[str]:
    value = node.attributes.get("value")
    if value is None:
        return ["a character needs a value"]
    if type(value) is not int:  # validation reports its type
        return []
    return [] if 0 <= value <= 0x10FFFF else [f"a character's value must be a code point, got {value}"]


def _assertion(node: F.Node) -> list[str]:
    kind = node.attributes.get("assertionKind")
    if kind is None:
        return ["an assertion needs an assertionKind"]
    if kind not in ASSERTIONS:
        return [f"Assertion.assertionKind cannot be {kind!r}"]
    if kind in ("lookahead", "lookbehind"):
        return _alternatives(node)
    if node.lists["alternatives"]:
        return [f"{F._article(kind)} assertion holds no alternatives"]
    return [f"{F._article(kind)} assertion cannot be negated"] if kind != "word" and node.attributes.get("negate") else []


def _backreference(node: F.Node) -> list[str]:
    ref = node.attributes.get("ref")
    if ref is None:
        return ["a backreference needs a ref"]
    if (type(ref) is int and ref >= 1) or (type(ref) is str and ref):
        return []
    return [f"a backreference's ref must be a group's number or its name, got {ref!r}"]


def _capturing_group(node: F.Node) -> list[str]:
    return (["a capturinggroup's name cannot be empty"] if node.attributes.get("name") == "" else []) + _alternatives(node)


def _modifiers(node: F.Node) -> list[str]:
    add, remove = node.helpers.get("add"), node.helpers.get("remove")
    problems = [problem for held in (add, remove) if held is not None
                for problem in _spells(held, MODIFIERS, "a modifiers' flags")]
    if problems:
        return problems
    added = set() if add is None else _set(add, MODIFIERS)
    removed = set() if remove is None else _set(remove, MODIFIERS)
    if not added and not removed:
        return ["a modifiers adds or removes a flag"]
    both = "".join(letter for _name, letter in MODIFIERS if letter in added & removed)
    return [f"a modifiers cannot both add and remove {both!r}"] if both else []


_CHECKS = {REGEXPLITERAL: _literal, PATTERN: _alternatives, GROUP: _alternatives, CAPTURINGGROUP: _capturing_group,
           QUANTIFIER: _quantifier, CHARACTERCLASSRANGE: _range, CLASSSTRINGDISJUNCTION: _alternatives,
           EXPRESSIONCHARACTERCLASS: _expression_class, CHARACTERSET: _character_set, CHARACTER: _character,
           ASSERTION: _assertion, BACKREFERENCE: _backreference, MODIFIERS_: _modifiers}


def _check(tag: str) -> Any:
    """A kind's check, of its node, its helpers nested."""
    check = _CHECKS.get(tag)
    return None if check is None else lambda record: check(F.node(tag, record))


def _application(tag: str) -> F.Kind:
    return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), optional=("modifiers",))


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family, whose terms it reads, as each of them reads its (the dialects proposal, Retrofit's
    design), imported when first needed: `TypeScript5`, `TypeScript Types` and `TypeScript Patterns`. None of its kinds
    holds their terms."""
    from ..Patterns import Expressions as TypeScriptPatterns
    from ..TypeScript5 import Expressions as TypeScript5
    from ..Types import Expressions as TypeScriptTypes
    return TypeScript5.DIALECT, TypeScriptTypes.DIALECT, TypeScriptPatterns.DIALECT


DIALECT = F.Dialect("TypeScript.RegExp", {tag: _application(tag) for tag in TAGS}, domain_of=_family.of, reads=_reads)
"""The TypeScript RegExp dialect: its kinds, as the framework reads them, and its family's other dialects' terms."""
