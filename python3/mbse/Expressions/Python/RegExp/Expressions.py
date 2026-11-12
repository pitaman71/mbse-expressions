"""Expressions of the Python RegExp dialect: the regular expressions of Python's `re` module, a grammar of their own (the
Library Reference, `re`, "Regular Expression Syntax"), as `re`'s parser reads them.

It is a dialect of the Python family (the dialects proposal, Decided for stage 6: "if the standard says it's a
sublanguage then it's definitely at least a separate dialect", and "regular expressions (ECMA-262's, Python's `re`)";
its Retrofit's design, Python; the user's "(b)" to its Open, 1: every regular expression a language's standard defines,
its library's included), named `Python RegExp` (`Terms.dialect_name`), its tag `python_regexp`. Its terms are values of
its `Term`, `Expressions.Python.RegExp.Term`, the branch `python_regexp` of `Expressions.Framework.Term`. No subterm of
`Python3` is one: a pattern is a string there, and that a string is a regular expression is the program's to say,
never guessed (mbse-basis [PRI-025: never guess the schema](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-025)); mbse-programs,
or a constraint's author, holds one through this dialect's holder, `Expressions.Python.RegExp.Expression`, which refines
`Expressions.Framework.Expression`, its `root` narrowed to its `Term`.

mbse-programs has no kinds for a regular expression, so its kinds are the constructs `re`'s syntax lists, named as
`TypeScript RegExp`'s (regexpp's node types, lowercased) where the construct is ECMAScript's too, each family defining
its own copy, as C and C++ do; each a value object `Expressions.Python.RegExp.<Kind>`, its properties named as regexpp
names them:

- `pattern` (its `alternatives`, `a|b`), the root of a regular expression, and `alternative` (its `elements`, written
  one after another);
- `group` (`(?:...)`), `capturinggroup` (`(...)`, or `(?P<name>...)` with its `name`), each holding `alternatives`;
- `quantifier` (`*`, `+`, `?`, `{m}`, `{m,}`, `{m,n}`: its `min`, its `max`, absent where unbounded, whether it is
  `greedy`, absent where it is, and `possessive`, `*+`, absent where it is not; its `element`);
- `characterclass` (`[...]`, `[^...]`: whether it is negated, `negate`, and its `elements`), `characterclassrange`
  (`a-z` in a class: its `min` and `max`, characters), `characterset` (its `setKind`: `any`, `.`; `digit`, `space` and
  `word`, `\\d`, `\\s` and `\\w`, and their negations with `negate`, `\\D`, `\\S` and `\\W`) and `character` (its
  `raw`, its spelling as written, with its `value`, a code point: `a`, `\\n`, `\\x41`, `\\u00e9`, `\\N{EM DASH}`, `\\101`,
  `\\.`, and a default spelling where it has none);
- `assertion` (its `assertionKind`: `start`, `^`; `end`, `$`; `stringstart`, `\\A`; `stringend`, `\\Z` or `\\z`; `word`, `\\b`, and
  `\\B` with `negate`; `lookahead`, `(?=...)` and `(?!...)`, and `lookbehind`, `(?<=...)` and `(?<!...)`, each holding
  `alternatives`);
- `backreference` (its `ref`, a group's number, `\\1`, or its name, `(?P=name)`);
- Python's own: `conditional` (`(?(1)yes|no)`, `(?(name)yes|no)`: the group it tests, its `ref`, and its
  `yes` and `no`, alternatives), `atomicgroup` (`(?>...)`, Python 3.11), and `flags` (its letters to `add` and to
  `remove`: an inline `(?aiLmsux)`, global, holding no alternatives, or scoped, `(?a-i:...)`, holding them);
- `comment` (`(?#...)`, its `text`), which `re`'s parser skips, kept so that a pattern prints as written;

then the framework's kinds of invalid syntax, `error` and `missing`. Each is checked as `re`'s parser checks it, with
its messages where it has one ("nothing to repeat", "multiple repeat", "min repeat greater than max repeat", "bad
character range z-a", "unknown flag", "bad inline flags: flag turned on and off", "missing :", "redefinition of group
name 'x' as group 2; was group 1", "unknown group name 'x'", "invalid group reference 3", "global flags not at the start
of the expression"); a pattern's references are checked against its groups at its root, a `pattern`. Whether a pattern
is a `str` or a `bytes` pattern is its string's, so the flags `L` and `u` are each accepted, and a lookbehind's width is
the compiler's, not checked.

A named group's name is a label within its pattern, which a backreference resolves, not a name the expression binds:
none of its kinds refines `Let`, and none has scopes. Its kinds are applications the framework reads by their
structure, of no domain known statically, and are not evaluated: Python3's evaluator refuses each by name ("Python
RegExp pattern is not evaluated"); a pattern is matched by `re`, a library call.

The versions of Python it covers are data, which `define` writes: Python 3.0 to 3.15, each with its own kinds it has
(`SINCE`: `atomicgroup` since Python 3.11, every other since 3.0; a possessive quantifier, 3.11, a scoped flags, 3.6,
`\\N{...}`, 3.8, and `\\z`, 3.14, features within a kind, not recorded). Its completeness is data:
`grammars/python3-re.json` lists the codes `re`'s parser writes, each mapped to its kinds. `DIALECT` reads its kinds
and its family's other dialects' terms. `Text` writes its kinds as `re`'s syntax, as the family's printer
(`Python3.Text.ToText`) dispatches them to it. Its terms are written through the builders (mbse-basis
[PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
`lambda u: u.character(lambda c: c.value(97))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..Python3 import Domains as _family, Expressions as P

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "ASSERTIONS", "LOOKAROUNDS", "SETS", "FLAG_LETTERS",
           "spells", "spelling", "problems"]

(PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERCLASSRANGE, CHARACTERSET, CHARACTER,
 ASSERTION, BACKREFERENCE, CONDITIONAL, ATOMICGROUP, FLAGS, COMMENT) = (
    "pattern", "alternative", "group", "capturinggroup", "quantifier", "characterclass", "characterclassrange",
    "characterset", "character", "assertion", "backreference", "conditional", "atomicgroup", "flags", "comment")

TAGS = (PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERCLASSRANGE, CHARACTERSET,
        CHARACTER, ASSERTION, BACKREFERENCE, CONDITIONAL, ATOMICGROUP, FLAGS, COMMENT)
"""Its own kinds, in its `Term`'s order: regexpp's that ECMAScript shares, then Python's own, then its comment."""

HELPERS: tuple[str, ...] = ()
"""Its own helpers, the value object schemas its kinds hold that are no kind: none."""

SINCE = {**dict.fromkeys(TAGS, 0), ATOMICGROUP: 11}
"""The minor version of Python 3 each of its kinds arrived in, as `re`'s parser first wrote it (`ATOMIC_GROUP`, 3.11),
from which `define` writes the kinds each version has."""

ASSERTIONS = ("start", "end", "stringstart", "stringend", "word", "lookahead", "lookbehind")
"""An assertion's kinds: `^`, `$`, `\\A`, `\\Z`, `\\b`, and the lookarounds."""

LOOKAROUNDS = ("lookahead", "lookbehind")
"""The assertions that hold alternatives."""

SETS = ("any", "digit", "space", "word")
"""A character set's kinds: `.`, `\\d`, `\\s` and `\\w`."""

FLAG_LETTERS = "aiLmsux"
"""The inline flags' letters, as `re`'s parser reads them (`FLAGS`); `a`, `L` and `u`, its `TYPE_FLAGS`, exclude each
other, and none of them is turned off."""

_TYPE_FLAGS = "aLu"
_ESCAPES = {"a": 7, "b": 8, "f": 12, "n": 10, "r": 13, "t": 9, "v": 11}  # `\b` a backspace within a class
_SHORT = {7: "\\a", 9: "\\t", 10: "\\n", 11: "\\v", 12: "\\f", 13: "\\r"}  # a default spelling's escapes
_HEX = {"x": 2, "u": 4, "U": 8}
_HEXDIGITS = "0123456789abcdefABCDEF"
_OCTAL = "01234567"
_WORDS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
_SPECIAL = ".^$*+?{}[]\\|() #"  # escaped outside a class: `re`'s special characters, and what verbose mode skips
_CLASS_SPECIAL = "\\]^-["  # escaped within a class
_ALTERNATIVES = (PATTERN, GROUP, CAPTURINGGROUP, ATOMICGROUP, FLAGS, ASSERTION)
_INVALID = ("error", "missing")


def install(txn: Any) -> Any:
    """Python RegExp's union of its kinds, added to the framework's terms as the branch `python_regexp`, its own kinds,
    and its dialect's schema, whose singleton is `Expressions.Python.RegExp`: run after `Framework.install`, in a
    transaction of its own, before or after its family's other installs, none of whose schemas it names; run again, it
    writes nothing. Its holder, `Expressions.Python.RegExp.Expression`, refines `Expressions.Framework.Expression`, its
    `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.Python.RegExp/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject,
                  "Pattern": S.OfObject, "Alternative": S.OfObject, "Group": S.OfObject, "CapturingGroup": S.OfObject,
                  "Quantifier": S.OfObject, "CharacterClass": S.OfObject, "CharacterClassRange": S.OfObject,
                  "CharacterSet": S.OfObject, "Character": S.OfObject, "Assertion": S.OfObject,
                  "Backreference": S.OfObject, "Conditional": S.OfObject, "AtomicGroup": S.OfObject,
                  "Flags": S.OfObject, "Comment": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.Python.RegExp`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Python.RegExp.Dialect").ref(True).singleton("Expressions.Python.RegExp").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("python_regexp").schema([_.Dialect])]),
            # its union of its kinds: its own, and invalid syntax
            lambda _: _.Term.name("Expressions.Python.RegExp.Term").branches([
                lambda t: t.name("pattern").schema([_.Pattern]),
                lambda t: t.name("alternative").schema([_.Alternative]),
                lambda t: t.name("group").schema([_.Group]),
                lambda t: t.name("capturinggroup").schema([_.CapturingGroup]),
                lambda t: t.name("quantifier").schema([_.Quantifier]),
                lambda t: t.name("characterclass").schema([_.CharacterClass]),
                lambda t: t.name("characterclassrange").schema([_.CharacterClassRange]),
                lambda t: t.name("characterset").schema([_.CharacterSet]),
                lambda t: t.name("character").schema([_.Character]),
                lambda t: t.name("assertion").schema([_.Assertion]),
                lambda t: t.name("backreference").schema([_.Backreference]),
                lambda t: t.name("conditional").schema([_.Conditional]),
                lambda t: t.name("atomicgroup").schema([_.AtomicGroup]),
                lambda t: t.name("flags").schema([_.Flags]),
                lambda t: t.name("comment").schema([_.Comment]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its kinds, each nested regular expression this dialect's term, its properties named as regexpp's
            lambda _: _.Pattern.name("Expressions.Python.RegExp.Pattern").properties({"alternatives": many(_.Term)}),
            lambda _: _.Alternative.name("Expressions.Python.RegExp.Alternative").properties({"elements": many(_.Term)}),
            lambda _: _.Group.name("Expressions.Python.RegExp.Group").properties({"alternatives": many(_.Term)}),
            lambda _: _.CapturingGroup.name("Expressions.Python.RegExp.CapturingGroup").properties({
                "name": S.OfStr,  # absent: a group numbered only, `(...)`
                "alternatives": many(_.Term)}),
            lambda _: _.Quantifier.name("Expressions.Python.RegExp.Quantifier").properties({
                "min": S.OfInt, "max": S.OfInt,  # absent: unbounded
                "greedy": S.OfBool, "possessive": S.OfBool,  # absent: greedy, and not possessive
                "element": _.Term}),
            lambda _: _.CharacterClass.name("Expressions.Python.RegExp.CharacterClass").properties({
                "negate": S.OfBool, "elements": many(_.Term)}),
            lambda _: _.CharacterClassRange.name("Expressions.Python.RegExp.CharacterClassRange").properties({
                "min": _.Term, "max": _.Term}),
            lambda _: _.CharacterSet.name("Expressions.Python.RegExp.CharacterSet").properties({
                "setKind": S.OfStr, "negate": S.OfBool}),
            lambda _: _.Character.name("Expressions.Python.RegExp.Character").properties({
                "raw": S.OfStr, "value": S.OfInt}),  # its spelling as written, and its code point
            lambda _: _.Assertion.name("Expressions.Python.RegExp.Assertion").properties({
                "assertionKind": S.OfStr, "negate": S.OfBool, "alternatives": many(_.Term)}),  # a lookaround's alternatives
            lambda _: _.Backreference.name("Expressions.Python.RegExp.Backreference").properties({
                "ref": S.OfAny(lambda a: a.schemas([S.OfInt, S.OfStr]))}),  # a group's number or its name
            lambda _: _.Conditional.name("Expressions.Python.RegExp.Conditional").properties({
                "ref": S.OfAny(lambda a: a.schemas([S.OfInt, S.OfStr])), "yes": _.Term, "no": _.Term}),
            lambda _: _.AtomicGroup.name("Expressions.Python.RegExp.AtomicGroup").properties({
                "alternatives": many(_.Term)}),
            lambda _: _.Flags.name("Expressions.Python.RegExp.Flags").properties({
                "add": S.OfStr, "remove": S.OfStr,
                "alternatives": many(_.Term)}),  # none: global, `(?i)`; else scoped, `(?i:...)`
            lambda _: _.Comment.name("Expressions.Python.RegExp.Comment").properties({"text": S.OfStr}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.Python.RegExp.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("python_regexp").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """Python RegExp's dialect as data: the singleton `Expressions.Python.RegExp` owning the versions of Python 3 it
    covers, by their published names (`standards`), Python 3.0 to 3.15, each with its body, its version and its own
    kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame
    binds the dialect (`dialect`) and each version by its name spelled as an identifier (`Python_3_11`)."""
    OWN, Standard = txn.Expressions.Python.RegExp, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}
    minors = range(16)

    def version(minor: int) -> Callable[[Any], Any]:
        kinds = [schema for tag, schema in every.items() if SINCE[tag] <= minor]
        return lambda _: getattr(_, f"Python_3_{minor}").bodies(["org.python"]).revision(
            lambda r: r.version(f"3.{minor}")).kinds(kinds)

    return txn.uid("mbse.Expressions.Python.RegExp.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, **{f"Python_3_{minor}": Standard for minor in minors}})
        .spec([
            lambda _: _.dialect.standards({f"Python 3.{minor}": lambda e, minor=minor: e.standard(
                getattr(_, f"Python_3_{minor}")) for minor in minors}),
            *(version(minor) for minor in minors),
        ])]))])


def spells(text: str, value: int) -> bool:
    """Whether `text` spells the code point `value` as `re`'s parser reads a character: the character itself (but a
    lone backslash); an escape of a control character (`\\a`, `\\b` within a class, `\\f`, `\\n`, `\\r`, `\\t`, `\\v`); a
    hexadecimal escape (`\\x41`, `\\u00e9`, `\\U0001f600`); an octal one (`\\0`, `\\012`, `\\101`, to `\\377`); a backslash
    before an ASCII character that is neither a letter nor a digit (`\\.`); or a named one, `\\N{...}`, whose name is the
    Unicode database's, its form alone checked (the TypeScript implementation has no database to read it)."""
    if len(text) == 1:
        return text != "\\" and ord(text) == value
    if not text.startswith("\\") or len(text) < 2:
        return False
    rest = text[1:]
    letter = rest[0]
    if len(rest) == 1:
        if letter in _ESCAPES:
            return _ESCAPES[letter] == value
        return ord(letter) < 128 and letter not in _WORDS and ord(letter) == value or letter == "0" and value == 0
    if letter in _HEX:
        digits = rest[1:]
        return len(digits) == _HEX[letter] and all(c in _HEXDIGITS for c in digits) and int(digits, 16) == value
    if letter == "N":
        name = rest[2:-1]
        return rest[1] == "{" and rest.endswith("}") and bool(name) and "}" not in name
    if all(c in _OCTAL for c in rest) and (letter == "0" and len(rest) <= 3 or letter in "123" and len(rest) == 3):
        return int(rest, 8) == value
    return False


def spelling(value: int, within: bool = False) -> str:
    """A code point's default spelling, outside a class or `within` one: a printable ASCII character as itself, escaped
    where it is special there (outside, `re`'s special characters, a space and `#`, which verbose mode skips; within, a
    backslash, `]`, `^`, `-` and `[`); a control character by its escape, else by its code (`\\x00`); any other
    character as itself, but a surrogate, by its code (`\\ud800`)."""
    if value in _SHORT:
        return _SHORT[value]
    if 0x20 <= value < 0x7F:
        character = chr(value)
        return "\\" + character if character in (_CLASS_SPECIAL if within else _SPECIAL) else character
    if value >= 0xA0 and not 0xD800 <= value <= 0xDFFF and value <= 0x10FFFF:
        return chr(value)
    if value < 0x100:
        return f"\\x{value:02x}"
    return f"\\u{value:04x}" if value < 0x10000 else f"\\U{value:08x}"


def _tag(term: Any) -> str:
    return F.kind_of(term)[0]


def _attributes(term: Any) -> dict[str, Any]:
    return F.attributes_of(F.kind_of(term)[1])


def _within(term: Any) -> str:
    """A character's spelling within a class, as written or by default, for a message."""
    attributes = _attributes(term)
    return attributes["raw"] if "raw" in attributes else spelling(attributes["value"], True)


def _reference(what: str, attributes: dict[str, Any]) -> list[str]:
    """A backreference's or a conditional's group, its `ref`: a number, positive, or a name, an identifier."""
    ref = attributes.get("ref")
    if ref is None:
        return [f"{what} needs a ref"]
    if type(ref) is int and ref < 1:
        return [f"{what}'s ref must be positive, got {ref}"]
    return P._identifier_problems(f"{what}'s ref", ref) if type(ref) is str else []


def _flags(add: str, remove: str, scoped: bool) -> list[str]:
    """An inline flags' letters, checked as `re`'s parser checks them."""
    if not add and not remove:
        return ["missing flag"]
    if any(letter not in FLAG_LETTERS for letter in add + remove):
        return ["unknown flag"]
    if len({letter for letter in add if letter in _TYPE_FLAGS}) > 1:
        return ["bad inline flags: flags 'a', 'u' and 'L' are incompatible"]
    if any(letter in _TYPE_FLAGS for letter in remove):
        return ["bad inline flags: cannot turn off flags 'a', 'u' and 'L'"]
    if not scoped and remove:
        return ["missing :"]
    if set(add) & set(remove):
        return ["bad inline flags: flag turned on and off"]
    return []


def _repeatable(term: Any) -> list[str]:
    """What a quantifier's element is not, where it cannot be repeated: another quantifier, or what matches no
    character and is not a lookaround (an assertion but a lookaround, a global flags, a comment), or what is no
    element."""
    tag = _tag(term)
    if tag == QUANTIFIER:
        return ["multiple repeat"]
    attributes = _attributes(term)
    if (tag == ASSERTION and attributes.get("assertionKind") not in LOOKAROUNDS or tag == FLAGS and not F.form(term).arguments
            or tag in (COMMENT, PATTERN, ALTERNATIVE, CHARACTERCLASSRANGE)):
        return ["nothing to repeat"]
    return []


def _groups(alternatives: tuple[Any, ...]) -> list[str]:
    """A pattern's groups and references, checked at its root, of its `alternatives`, as `re`'s parser checks them: its
    groups numbered in the order they open, each name once; each backreference and conditional to a group it has; and a
    global flags only at its start, before anything but comments and other global flags."""
    found: list[str] = []
    names: dict[str, int] = {}
    count, references, globals_ = 0, [], 0
    for term in (term for alternative in alternatives for term in F.walk(alternative)):
        tag, attributes = _tag(term), _attributes(term)
        if tag == CAPTURINGGROUP:
            count += 1
            name = attributes.get("name")
            if name in names:
                found.append(f"redefinition of group name {name!r} as group {count}; was group {names[name]}")
            elif name is not None:
                names[name] = count
        elif tag in (BACKREFERENCE, CONDITIONAL):
            references.append(attributes)
        elif tag == FLAGS and not F.form(term).arguments:
            globals_ += 1
    for attributes in references:
        ref = attributes.get("ref")
        if type(ref) is str and ref not in names:
            found.append(f"unknown group name {ref!r}")
        elif type(ref) is int and ref > count:
            found.append(f"invalid group reference {ref}")
    first = alternatives[0] if alternatives else None
    leading = 0
    for element in F.form(first).arguments if first is not None and _tag(first) == ALTERNATIVE else ():
        if _tag(element) == FLAGS and not F.form(element).arguments:
            leading += 1
        elif _tag(element) != COMMENT:
            break
    if globals_ > leading:
        found.append("global flags not at the start of the expression")
    return found


def problems(node: F.Node) -> list[str]:
    """A node's checks, as `re`'s parser makes them, with its messages where it has one: what each kind may hold (an
    alternative where alternatives stand, an element where elements do, a character, a range or a character set
    within a class, a character at either end of a range, an element a quantifier can repeat), its attributes (a
    choice among a few, a code point and its spelling, a range's order, a quantifier's bounds, a group's name, a
    reference's group, an inline flags' letters) and, at a pattern, its groups and references (`_groups`)."""
    found: list[str] = []
    kind, attributes = node.kind, node.attributes
    what = F._article(kind)
    if kind in _ALTERNATIVES:
        found += [f"{what}'s alternative cannot be {F._article(_tag(item))}" for item in node.many
                  if _tag(item) not in (ALTERNATIVE, *_INVALID)]
    if kind == ALTERNATIVE:
        found += [f"an alternative's element cannot be {F._article(_tag(item))}" for item in node.many
                  if _tag(item) in (PATTERN, ALTERNATIVE, CHARACTERCLASSRANGE)]
    elif kind == CHARACTERCLASS:
        for item in node.many:
            tag = _tag(item)
            if tag not in (CHARACTER, CHARACTERCLASSRANGE, CHARACTERSET, *_INVALID):
                found.append(f"a characterclass's element cannot be {F._article(tag)}")
            elif tag == CHARACTERSET and _attributes(item).get("setKind") == "any":
                found.append("a characterclass's element cannot be the characterset any")
        if not node.many:
            found.append("a characterclass needs an element")
    elif kind == CHARACTERCLASSRANGE:
        ends = {end: node.subterms[end] for end in ("min", "max") if node.subterms[end] is not None}
        for end, term in ends.items():
            if _tag(term) not in (CHARACTER, *_INVALID):
                found.append(f"a characterclassrange's {end} must be a character, got {F._article(_tag(term))}")
        values = [_attributes(term).get("value") for term in ends.values() if _tag(term) == CHARACTER]
        if not found and len(values) == 2 and all(type(v) is int for v in values) and values[1] < values[0]:
            found.append(f"bad character range {_within(ends['min'])}-{_within(ends['max'])}")
    elif kind == CHARACTERSET:
        if attributes.get("setKind", "any") not in SETS:
            found.append(f"CharacterSet.setKind cannot be {attributes['setKind']!r}")
        elif attributes.get("negate") is True and attributes.get("setKind") == "any":
            found.append("the characterset any cannot be negated")
    elif kind == CHARACTER:
        value = attributes.get("value")
        if type(value) is int and not 0 <= value <= 0x10FFFF:
            found.append(f"a character's value must be a code point, got {value}")
        elif type(value) is int and type(attributes.get("raw")) is str and not spells(attributes["raw"], value):
            found.append(f"a character's raw {attributes['raw']!r} does not spell U+{value:04X}")
    elif kind == ASSERTION:
        assertion = attributes.get("assertionKind")
        if assertion is not None and assertion not in ASSERTIONS:
            found.append(f"Assertion.assertionKind cannot be {assertion!r}")
        elif assertion is not None:
            if attributes.get("negate") is True and assertion not in ("word", *LOOKAROUNDS):
                found.append(f"the assertion {assertion} cannot be negated")
            if assertion in LOOKAROUNDS and not node.many:
                found.append(f"the assertion {assertion} needs an alternative")
            elif assertion not in LOOKAROUNDS and node.many:
                found.append(f"the assertion {assertion} holds no alternatives")
    elif kind == QUANTIFIER:
        least, most = attributes.get("min"), attributes.get("max")
        if type(least) is int and least < 0:
            found.append(f"a quantifier's min cannot be negative, got {least}")
        elif type(least) is int and type(most) is int and most < least:
            found.append("min repeat greater than max repeat")
        if attributes.get("greedy") is False and attributes.get("possessive") is True:
            found.append("a quantifier is lazy or possessive, not both")
        if node.subterms["element"] is not None:
            found += _repeatable(node.subterms["element"])
    elif kind in (BACKREFERENCE, CONDITIONAL):
        found += _reference(what, attributes)
        for end in ("yes", "no") if kind == CONDITIONAL else ():
            term = node.subterms[end]
            if term is not None and _tag(term) not in (ALTERNATIVE, *_INVALID):
                found.append(f"a conditional's {end} must be an alternative, got {F._article(_tag(term))}")
    elif kind == CAPTURINGGROUP:
        found += P._identifier_problems("a capturinggroup's name", attributes.get("name"))
    elif kind == FLAGS:
        found += _flags(attributes.get("add", ""), attributes.get("remove", ""), bool(node.many))
    elif kind == COMMENT and ")" in attributes.get("text", ""):
        found.append("a comment's text cannot hold ')'")
    if kind == PATTERN:
        found += _groups(node.many)
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    return lambda record: problems(F.node(tag, record))


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads its own kinds: applications, of no domain known statically (`Opaque`)."""

    def application(tag: str, **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), **options)

    return {
        PATTERN: application(PATTERN),
        ALTERNATIVE: application(ALTERNATIVE),
        GROUP: application(GROUP),
        CAPTURINGGROUP: application(CAPTURINGGROUP),
        QUANTIFIER: application(QUANTIFIER, required=("min",)),
        CHARACTERCLASS: application(CHARACTERCLASS),
        CHARACTERCLASSRANGE: application(CHARACTERCLASSRANGE),
        CHARACTERSET: application(CHARACTERSET, required=("setKind",)),
        CHARACTER: application(CHARACTER, required=("value",)),
        ASSERTION: application(ASSERTION, required=("assertionKind",)),
        BACKREFERENCE: application(BACKREFERENCE),
        CONDITIONAL: application(CONDITIONAL, optional=("no",)),
        ATOMICGROUP: application(ATOMICGROUP),
        FLAGS: application(FLAGS),
        COMMENT: application(COMMENT),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family, whose terms it reads as they read its own, imported when first needed (the dialects
    proposal, Retrofit's design: each of Python's dialects reads the other three)."""
    from ..Patterns import Expressions as PythonPatterns
    from ..Types import Expressions as PythonTypes
    return P.DIALECT, PythonTypes.DIALECT, PythonPatterns.DIALECT


DIALECT = F.Dialect("Python.RegExp", _kinds(), domain_of=_family.of, reads=_reads)
"""The Python RegExp dialect: its kinds, as the framework reads them, and its family's other dialects' terms."""
