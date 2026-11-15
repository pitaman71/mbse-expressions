/**
 * Expressions of the Python RegExp dialect: the regular expressions of Python's `re` module, a grammar of their own (the
 * Library Reference, `re`, "Regular Expression Syntax"), as `re`'s parser reads them.
 *
 * It is a dialect of the Python family (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "if the standard says it's a
 * sublanguage then it's definitely at least a separate dialect", and "regular expressions (ECMA-262's, Python's `re`)";
 * mbse-basis [CAP-281: Python's, ECMAScript's and C++'s regular expressions as data](mbse:mbse-basis/docs/capabilities/CAP-281.md); the user's "(b)": every regular expression a language's standard defines,
 * its library's included), named `Python RegExp` (`Terms.dialectName`), its tag `python_regexp`. Its terms are values of
 * its `Term`, `Expressions.Python.RegExp.Term`, the branch `python_regexp` of `Expressions.Framework.Term`. No subterm
 * of `Python3` is one: a pattern is a string there, and that a string is a regular expression is the program's to say,
 * never guessed (mbse-basis [PRI-025: never guess the schema](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-025)); mbse-programs,
 * or a constraint's author, holds one through this dialect's holder, `Expressions.Python.RegExp.Expression`, which refines
 * `Expressions.Framework.Expression`, its `root` narrowed to its `Term`.
 *
 * mbse-programs has no kinds for a regular expression, so its kinds are the constructs `re`'s syntax lists, named as
 * `TypeScript RegExp`'s (regexpp's node types, lowercased) where the construct is ECMAScript's too, each family defining
 * its own copy, as C and C++ do; each a value object `Expressions.Python.RegExp.<Kind>`, its properties named as regexpp
 * names them:
 *
 * - `pattern` (its `alternatives`, `a|b`), the root of a regular expression, and `alternative` (its `elements`, written
 *   one after another);
 * - `group` (`(?:...)`), `capturinggroup` (`(...)`, or `(?P<name>...)` with its `name`), each holding `alternatives`;
 * - `quantifier` (`*`, `+`, `?`, `{m}`, `{m,}`, `{m,n}`: its `min`, its `max`, absent where unbounded, whether it is
 *   `greedy`, absent where it is, and `possessive`, `*+`, absent where it is not; its `element`);
 * - `characterclass` (`[...]`, `[^...]`: whether it is negated, `negate`, and its `elements`), `characterclassrange`
 *   (`a-z` in a class: its `min` and `max`, characters), `characterset` (its `setKind`: `any`, `.`; `digit`, `space` and
 *   `word`, `\d`, `\s` and `\w`, and their negations with `negate`, `\D`, `\S` and `\W`) and `character` (its
 *   `raw`, its spelling as written, with its `value`, a code point: `a`, `\n`, `\x41`, `\u00e9`, `\N{EM DASH}`, `\101`,
 *   `\.`, and a default spelling where it has none);
 * - `assertion` (its `assertionKind`: `start`, `^`; `end`, `$`; `stringstart`, `\A`; `stringend`, `\Z` or `\z`; `word`, `\b`, and
 *   `\B` with `negate`; `lookahead`, `(?=...)` and `(?!...)`, and `lookbehind`, `(?<=...)` and `(?<!...)`, each holding
 *   `alternatives`);
 * - `backreference` (its `ref`, a group's number, `\1`, or its name, `(?P=name)`);
 * - Python's own: `conditional` (`(?(1)yes|no)`, `(?(name)yes|no)`: the group it tests, its `ref`, and its
 *   `yes` and `no`, alternatives), `atomicgroup` (`(?>...)`, Python 3.11), and `flags` (its letters to `add` and to
 *   `remove`: an inline `(?aiLmsux)`, global, holding no alternatives, or scoped, `(?a-i:...)`, holding them);
 * - `comment` (`(?#...)`, its `text`), which `re`'s parser skips, kept so that a pattern prints as written;
 *
 * then the framework's kinds of invalid syntax, `error` and `missing`. Each is checked as `re`'s parser checks it, with
 * its messages where it has one ("nothing to repeat", "multiple repeat", "min repeat greater than max repeat", "bad
 * character range z-a", "unknown flag", "bad inline flags: flag turned on and off", "missing :", "redefinition of group
 * name 'x' as group 2; was group 1", "unknown group name 'x'", "invalid group reference 3", "global flags not at the start
 * of the expression"); a pattern's references are checked against its groups at its root, a `pattern`. Whether a pattern
 * is a `str` or a `bytes` pattern is its string's, so the flags `L` and `u` are each accepted, and a lookbehind's width is
 * the compiler's, not checked.
 *
 * A named group's name is a label within its pattern, which a backreference resolves, not a name the expression binds:
 * none of its kinds refines `Let`, and none has scopes. Its kinds are applications the framework reads by their
 * structure, of no domain known statically, and are not simplified: Python3's rules leave each in the residual, named ("Python
 * RegExp pattern is not evaluated"); a pattern is matched by `re`, a library call.
 *
 * The versions of Python it covers are data, which `define` writes: Python 3.0 to 3.15, each with its own kinds it has
 * (`SINCE`: `atomicgroup` since Python 3.11, every other since 3.0; a possessive quantifier, 3.11, a scoped flags, 3.6,
 * `\N{...}`, 3.8, and `\z`, 3.14, features within a kind, not recorded). Its completeness is data:
 * `grammars/python3-re.json` lists the codes `re`'s parser writes, each mapped to its kinds. `DIALECT` reads its kinds
 * and its family's other dialects' terms. `Text` writes its kinds as `re`'s syntax, as the family's printer
 * (`Python3.Text.ToText`) dispatches them to it. Its terms are written through the builders (mbse-basis
 * [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(u) => u.character((c) => c.value(97n))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Family from "../Python3/Domains.js";
import * as P from "../Python3/Expressions.js";
import * as PythonPatterns from "../Patterns/Expressions.js";
import * as PythonTypes from "../Types/Expressions.js";

const { repr } = Repr;

export const PATTERN = "pattern";
export const ALTERNATIVE = "alternative";
export const GROUP = "group";
export const CAPTURINGGROUP = "capturinggroup";
export const QUANTIFIER = "quantifier";
export const CHARACTERCLASS = "characterclass";
export const CHARACTERCLASSRANGE = "characterclassrange";
export const CHARACTERSET = "characterset";
export const CHARACTER = "character";
export const ASSERTION = "assertion";
export const BACKREFERENCE = "backreference";
export const CONDITIONAL = "conditional";
export const ATOMICGROUP = "atomicgroup";
export const FLAGS = "flags";
export const COMMENT = "comment";

/** Its own kinds, in its `Term`'s order: regexpp's that ECMAScript shares, then Python's own, then its comment. */
export const TAGS: readonly string[] = [PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS,
  CHARACTERCLASSRANGE, CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE, CONDITIONAL, ATOMICGROUP, FLAGS, COMMENT];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none. */
export const HELPERS: readonly string[] = [];

/** The minor version of Python 3 each of its kinds arrived in, as `re`'s parser first wrote it (`ATOMIC_GROUP`, 3.11),
 * from which `define` writes the kinds each version has. */
export const SINCE: ReadonlyMap<string, number> = new Map(TAGS.map((tag) => [tag, tag === ATOMICGROUP ? 11 : 0]));

/** An assertion's kinds: `^`, `$`, `\A`, `\Z`, `\b`, and the lookarounds. */
export const ASSERTIONS: readonly string[] = ["start", "end", "stringstart", "stringend", "word", "lookahead", "lookbehind"];

/** The assertions that hold alternatives. */
export const LOOKAROUNDS: readonly string[] = ["lookahead", "lookbehind"];

/** A character set's kinds: `.`, `\d`, `\s` and `\w`. */
export const SETS: readonly string[] = ["any", "digit", "space", "word"];

/** The inline flags' letters, as `re`'s parser reads them (`FLAGS`); `a`, `L` and `u`, its `TYPE_FLAGS`, exclude each
 * other, and none of them is turned off. */
export const FLAG_LETTERS = "aiLmsux";

const TYPE_FLAGS = "aLu";
const ESCAPES = new Map<string, bigint>([["a", 7n], ["b", 8n], ["f", 12n], ["n", 10n], ["r", 13n], ["t", 9n], ["v", 11n]]); // `\b` a backspace within a class
const SHORT = new Map<bigint, string>([[7n, "\\a"], [9n, "\\t"], [10n, "\\n"], [11n, "\\v"], [12n, "\\f"], [13n, "\\r"]]); // a default spelling's escapes
const HEX = new Map<string, number>([["x", 2], ["u", 4], ["U", 8]]);
const HEXDIGITS = "0123456789abcdefABCDEF";
const OCTAL = "01234567";
const WORDS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SPECIAL = ".^$*+?{}[]\\|() #"; // escaped outside a class: `re`'s special characters, and what verbose mode skips
const CLASS_SPECIAL = "\\]^-["; // escaped within a class
const ALTERNATIVES: readonly string[] = [PATTERN, GROUP, CAPTURINGGROUP, ATOMICGROUP, FLAGS, ASSERTION];
const INVALID: readonly string[] = ["error", "missing"];

/** Python RegExp's union of its kinds, added to the framework's terms as the branch `python_regexp`, its own kinds, and
 * its dialect's schema, whose singleton is `Expressions.Python.RegExp`: run after `Framework.install`, in a transaction
 * of its own, before or after its family's other installs, none of whose schemas it names; run again, it writes
 * nothing. Its holder, `Expressions.Python.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root`
 * narrowed to its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.Python.RegExp/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      Pattern: S.OfObject, Alternative: S.OfObject, Group: S.OfObject, CapturingGroup: S.OfObject, Quantifier: S.OfObject,
      CharacterClass: S.OfObject, CharacterClassRange: S.OfObject, CharacterSet: S.OfObject, Character: S.OfObject,
      Assertion: S.OfObject, Backreference: S.OfObject, Conditional: S.OfObject, AtomicGroup: S.OfObject, Flags: S.OfObject,
      Comment: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.Python.RegExp`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Python.RegExp.Dialect").ref(true).singleton("Expressions.Python.RegExp").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("python_regexp").schema([_.Dialect])]),
      // its union of its kinds: its own, and invalid syntax
      (_: any) => _.Term.name("Expressions.Python.RegExp.Term").branches([
        (t: any) => t.name("pattern").schema([_.Pattern]),
        (t: any) => t.name("alternative").schema([_.Alternative]),
        (t: any) => t.name("group").schema([_.Group]),
        (t: any) => t.name("capturinggroup").schema([_.CapturingGroup]),
        (t: any) => t.name("quantifier").schema([_.Quantifier]),
        (t: any) => t.name("characterclass").schema([_.CharacterClass]),
        (t: any) => t.name("characterclassrange").schema([_.CharacterClassRange]),
        (t: any) => t.name("characterset").schema([_.CharacterSet]),
        (t: any) => t.name("character").schema([_.Character]),
        (t: any) => t.name("assertion").schema([_.Assertion]),
        (t: any) => t.name("backreference").schema([_.Backreference]),
        (t: any) => t.name("conditional").schema([_.Conditional]),
        (t: any) => t.name("atomicgroup").schema([_.AtomicGroup]),
        (t: any) => t.name("flags").schema([_.Flags]),
        (t: any) => t.name("comment").schema([_.Comment]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its kinds, each nested regular expression this dialect's term, its properties named as regexpp's
      (_: any) => _.Pattern.name("Expressions.Python.RegExp.Pattern").properties({ alternatives: many(_.Term) }),
      (_: any) => _.Alternative.name("Expressions.Python.RegExp.Alternative").properties({ elements: many(_.Term) }),
      (_: any) => _.Group.name("Expressions.Python.RegExp.Group").properties({ alternatives: many(_.Term) }),
      (_: any) => _.CapturingGroup.name("Expressions.Python.RegExp.CapturingGroup").properties({
        name: S.OfStr, // absent: a group numbered only, `(...)`
        alternatives: many(_.Term) }),
      (_: any) => _.Quantifier.name("Expressions.Python.RegExp.Quantifier").properties({
        min: S.OfInt, max: S.OfInt, // absent: unbounded
        greedy: S.OfBool, possessive: S.OfBool, // absent: greedy, and not possessive
        element: _.Term }),
      (_: any) => _.CharacterClass.name("Expressions.Python.RegExp.CharacterClass").properties({
        negate: S.OfBool, elements: many(_.Term) }),
      (_: any) => _.CharacterClassRange.name("Expressions.Python.RegExp.CharacterClassRange").properties({
        min: _.Term, max: _.Term }),
      (_: any) => _.CharacterSet.name("Expressions.Python.RegExp.CharacterSet").properties({
        setKind: S.OfStr, negate: S.OfBool }),
      (_: any) => _.Character.name("Expressions.Python.RegExp.Character").properties({
        raw: S.OfStr, value: S.OfInt }), // its spelling as written, and its code point
      (_: any) => _.Assertion.name("Expressions.Python.RegExp.Assertion").properties({
        assertionKind: S.OfStr, negate: S.OfBool, alternatives: many(_.Term) }), // a lookaround's alternatives
      (_: any) => _.Backreference.name("Expressions.Python.RegExp.Backreference").properties({
        ref: S.OfAny((a: any) => a.schemas([S.OfInt, S.OfStr])) }), // a group's number or its name
      (_: any) => _.Conditional.name("Expressions.Python.RegExp.Conditional").properties({
        ref: S.OfAny((a: any) => a.schemas([S.OfInt, S.OfStr])), yes: _.Term, no: _.Term }),
      (_: any) => _.AtomicGroup.name("Expressions.Python.RegExp.AtomicGroup").properties({
        alternatives: many(_.Term) }),
      (_: any) => _.Flags.name("Expressions.Python.RegExp.Flags").properties({
        add: S.OfStr, remove: S.OfStr,
        alternatives: many(_.Term) }), // none: global, `(?i)`; else scoped, `(?i:...)`
      (_: any) => _.Comment.name("Expressions.Python.RegExp.Comment").properties({ text: S.OfStr }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.Python.RegExp.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("python_regexp").schema([_.Term])]),
    ])]))]);
}

/** Python RegExp's dialect as data: the singleton `Expressions.Python.RegExp` owning the versions of Python 3 it covers,
 * by their published names (`standards`), Python 3.0 to 3.15, each with its body, its version and its own kinds it has
 * (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the
 * dialect (`dialect`) and each version by its name spelled as an identifier (`Python_3_11`). */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.Python.RegExp, txn.Expressions.Framework.Standard];
  const every = (OWN.Term.as_schema().branches as { name: string; schema: unknown }[]).filter((b) => TAGS.includes(b.name));
  const minors = Array.from({ length: 16 }, (_, minor) => minor);
  const version = (minor: number) => (_: any) => _[`Python_3_${minor}`].bodies(["org.python"]).revision(
    (r: any) => r.version(`3.${minor}`)).kinds(every.filter((b) => (SINCE.get(b.name) as number) <= minor).map((b) => b.schema));
  return txn.uid("mbse.Expressions.Python.RegExp.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, ...Object.fromEntries(minors.map((minor) => [`Python_3_${minor}`, Standard])) })
    .spec([
      (_: any) => _.dialect.standards(Object.fromEntries(minors.map((minor) => [`Python 3.${minor}`,
        (e: any) => e.standard(_[`Python_3_${minor}`])]))),
      ...minors.map(version),
    ])]))]);
}

/** Whether `text` spells the code point `value` as `re`'s parser reads a character: the character itself (but a lone
 * backslash); an escape of a control character (`\a`, `\b` within a class, `\f`, `\n`, `\r`, `\t`, `\v`); a hexadecimal
 * escape (`\x41`, `é`, `\U0001f600`); an octal one (`\0`, `\012`, `\101`, to `\377`); a backslash before an ASCII
 * character that is neither a letter nor a digit (`\.`); or a named one, `\N{...}`, whose name is the Unicode
 * database's, its form alone checked (the TypeScript implementation has no database to read it). */
export function spells(text: string, value: bigint): boolean {
  const points = [...text];
  if (points.length === 1) return text !== "\\" && BigInt(text.codePointAt(0) as number) === value;
  if (!text.startsWith("\\") || points.length < 2) return false;
  const rest = text.slice(1);
  const letter = rest[0] as string;
  if ([...rest].length === 1) {
    if (ESCAPES.has(letter)) return ESCAPES.get(letter) === value;
    const code = letter.codePointAt(0) as number;
    return (code < 128 && !WORDS.includes(letter) && BigInt(code) === value) || (letter === "0" && value === 0n);
  }
  if (HEX.has(letter)) {
    const digits = rest.slice(1);
    return digits.length === HEX.get(letter) && [...digits].every((c) => HEXDIGITS.includes(c)) && BigInt(`0x${digits}`) === value;
  }
  if (letter === "N") {
    const name = rest.slice(2, -1);
    return rest[1] === "{" && rest.endsWith("}") && name !== "" && !name.includes("}");
  }
  if ([...rest].every((c) => OCTAL.includes(c)) && ((letter === "0" && rest.length <= 3) || ("123".includes(letter) && rest.length === 3))) {
    return BigInt(`0o${rest}`) === value;
  }
  return false;
}

/** A code point's default spelling, outside a class or `within` one: a printable ASCII character as itself, escaped
 * where it is special there (outside, `re`'s special characters, a space and `#`, which verbose mode skips; within, a
 * backslash, `]`, `^`, `-` and `[`); a control character by its escape, else by its code (`\x00`); any other character
 * as itself, but a surrogate, by its code (`\ud800`). */
export function spelling(value: bigint, within = false): string {
  const short = SHORT.get(value);
  if (short !== undefined) return short;
  if (value >= 0x20n && value < 0x7Fn) {
    const character = String.fromCodePoint(Number(value));
    return (within ? CLASS_SPECIAL : SPECIAL).includes(character) ? `\\${character}` : character;
  }
  if (value >= 0xA0n && !(value >= 0xD800n && value <= 0xDFFFn) && value <= 0x10FFFFn) return String.fromCodePoint(Number(value));
  if (value < 0x100n) return `\\x${value.toString(16).padStart(2, "0")}`;
  return value < 0x10000n ? `\\u${value.toString(16).padStart(4, "0")}` : `\\U${value.toString(16).padStart(8, "0")}`;
}

function tagOf(term: any): string {
  return F.kindOf(term)[0];
}

function attributes(term: any): Map<string, any> {
  return F.attributesOf(F.kindOf(term)[1]);
}

/** A character's spelling within a class, as written or by default, for a message. */
function within(term: any): string {
  const found = attributes(term);
  return found.has("raw") ? found.get("raw") as string : spelling(found.get("value") as bigint, true);
}

/** A backreference's or a conditional's group, its `ref`: a number, positive, or a name, an identifier. */
function reference(what: string, found: ReadonlyMap<string, any>): string[] {
  const ref = found.get("ref");
  if (ref === undefined) return [`${what} needs a ref`];
  if (typeof ref === "bigint" && ref < 1n) return [`${what}'s ref must be positive, got ${ref}`];
  return typeof ref === "string" ? P.identifierProblems(`${what}'s ref`, ref) : [];
}

/** An inline flags' letters, checked as `re`'s parser checks them. */
function flagProblems(add: string, remove: string, scoped: boolean): string[] {
  if (add === "" && remove === "") return ["missing flag"];
  if ([...add + remove].some((letter) => !FLAG_LETTERS.includes(letter))) return ["unknown flag"];
  if (new Set([...add].filter((letter) => TYPE_FLAGS.includes(letter))).size > 1) {
    return ["bad inline flags: flags 'a', 'u' and 'L' are incompatible"];
  }
  if ([...remove].some((letter) => TYPE_FLAGS.includes(letter))) return ["bad inline flags: cannot turn off flags 'a', 'u' and 'L'"];
  if (!scoped && remove !== "") return ["missing :"];
  if ([...add].some((letter) => remove.includes(letter))) return ["bad inline flags: flag turned on and off"];
  return [];
}

/** What a quantifier's element is not, where it cannot be repeated: another quantifier, or what matches no character
 * and is not a lookaround (an assertion but a lookaround, a global flags, a comment), or what is no element. */
function repeatable(term: any): string[] {
  const tag = tagOf(term);
  if (tag === QUANTIFIER) return ["multiple repeat"];
  if ((tag === ASSERTION && !LOOKAROUNDS.includes(attributes(term).get("assertionKind"))) || (tag === FLAGS && F.form(term).arguments.length === 0)
    || [COMMENT, PATTERN, ALTERNATIVE, CHARACTERCLASSRANGE].includes(tag)) {
    return ["nothing to repeat"];
  }
  return [];
}

/** A pattern's groups and references, checked at its root, of its `alternatives`, as `re`'s parser checks them: its
 * groups numbered in the order they open, each name once; each backreference and conditional to a group it has; and a
 * global flags only at its start, before anything but comments and other global flags. */
function groups(alternatives: readonly any[]): string[] {
  const found: string[] = [];
  const names = new Map<string, number>();
  const references: Map<string, any>[] = [];
  let [count, globals] = [0, 0];
  for (const term of alternatives.flatMap((alternative) => [...F.walk(alternative)])) {
    const [tag, found_] = [tagOf(term), attributes(term)];
    if (tag === CAPTURINGGROUP) {
      count += 1;
      const name = found_.get("name");
      if (names.has(name)) {
        found.push(`redefinition of group name ${repr(name)} as group ${count}; was group ${names.get(name)}`);
      } else if (name !== undefined) {
        names.set(name, count);
      }
    } else if (tag === BACKREFERENCE || tag === CONDITIONAL) {
      references.push(found_);
    } else if (tag === FLAGS && F.form(term).arguments.length === 0) {
      globals += 1;
    }
  }
  for (const found_ of references) {
    const ref = found_.get("ref");
    if (typeof ref === "string" && !names.has(ref)) {
      found.push(`unknown group name ${repr(ref)}`);
    } else if (typeof ref === "bigint" && ref > BigInt(count)) {
      found.push(`invalid group reference ${ref}`);
    }
  }
  const first = alternatives[0] ?? null;
  let leading = 0;
  for (const element of first !== null && tagOf(first) === ALTERNATIVE ? F.form(first).arguments : []) {
    if (tagOf(element) === FLAGS && F.form(element).arguments.length === 0) {
      leading += 1;
    } else if (tagOf(element) !== COMMENT) {
      break;
    }
  }
  if (globals > leading) found.push("global flags not at the start of the expression");
  return found;
}

/** A node's checks, as `re`'s parser makes them, with its messages where it has one: what each kind may hold (an
 * alternative where alternatives stand, an element where elements do, a character, a range or a character set within a
 * class, a character at either end of a range, an element a quantifier can repeat), its attributes (a choice among a
 * few, a code point and its spelling, a range's order, a quantifier's bounds, a group's name, a reference's group, an
 * inline flags' letters) and, at a pattern, its groups and references (`groups`). */
export function problems(node: F.Node): string[] {
  const found: string[] = [];
  const [kind, found_] = [node.kind, node.attributes];
  const what = F.article(kind);
  if (ALTERNATIVES.includes(kind)) {
    found.push(...node.many.filter((item) => ![ALTERNATIVE, ...INVALID].includes(tagOf(item)))
      .map((item) => `${what}'s alternative cannot be ${F.article(tagOf(item))}`));
  }
  if (kind === ALTERNATIVE) {
    found.push(...node.many.filter((item) => [PATTERN, ALTERNATIVE, CHARACTERCLASSRANGE].includes(tagOf(item)))
      .map((item) => `an alternative's element cannot be ${F.article(tagOf(item))}`));
  } else if (kind === CHARACTERCLASS) {
    for (const item of node.many) {
      const tag = tagOf(item);
      if (![CHARACTER, CHARACTERCLASSRANGE, CHARACTERSET, ...INVALID].includes(tag)) {
        found.push(`a characterclass's element cannot be ${F.article(tag)}`);
      } else if (tag === CHARACTERSET && attributes(item).get("setKind") === "any") {
        found.push("a characterclass's element cannot be the characterset any");
      }
    }
    if (node.many.length === 0) found.push("a characterclass needs an element");
  } else if (kind === CHARACTERCLASSRANGE) {
    const ends = new Map(["min", "max"].map((end) => [end, node.subterms.get(end) ?? null] as [string, any])
      .filter(([, term]) => term !== null));
    for (const [end, term] of ends) {
      if (![CHARACTER, ...INVALID].includes(tagOf(term))) {
        found.push(`a characterclassrange's ${end} must be a character, got ${F.article(tagOf(term))}`);
      }
    }
    const [low, high] = [...ends.values()].filter((term) => tagOf(term) === CHARACTER).map((term) => attributes(term).get("value"));
    if (found.length === 0 && typeof low === "bigint" && typeof high === "bigint" && high < low) {
      found.push(`bad character range ${within(ends.get("min"))}-${within(ends.get("max"))}`);
    }
  } else if (kind === CHARACTERSET) {
    if (!SETS.includes(found_.get("setKind") ?? "any")) {
      found.push(`CharacterSet.setKind cannot be ${repr(found_.get("setKind"))}`);
    } else if (found_.get("negate") === true && found_.get("setKind") === "any") {
      found.push("the characterset any cannot be negated");
    }
  } else if (kind === CHARACTER) {
    const value = found_.get("value");
    if (typeof value === "bigint" && !(value >= 0n && value <= 0x10FFFFn)) {
      found.push(`a character's value must be a code point, got ${value}`);
    } else if (typeof value === "bigint" && typeof found_.get("raw") === "string" && !spells(found_.get("raw"), value)) {
      found.push(`a character's raw ${repr(found_.get("raw"))} does not spell U+${value.toString(16).toUpperCase().padStart(4, "0")}`);
    }
  } else if (kind === ASSERTION) {
    const assertion = found_.get("assertionKind");
    if (assertion !== undefined && !ASSERTIONS.includes(assertion)) {
      found.push(`Assertion.assertionKind cannot be ${repr(assertion)}`);
    } else if (assertion !== undefined) {
      if (found_.get("negate") === true && !["word", ...LOOKAROUNDS].includes(assertion)) {
        found.push(`the assertion ${assertion} cannot be negated`);
      }
      if (LOOKAROUNDS.includes(assertion) && node.many.length === 0) {
        found.push(`the assertion ${assertion} needs an alternative`);
      } else if (!LOOKAROUNDS.includes(assertion) && node.many.length > 0) {
        found.push(`the assertion ${assertion} holds no alternatives`);
      }
    }
  } else if (kind === QUANTIFIER) {
    const [least, most] = [found_.get("min"), found_.get("max")];
    if (typeof least === "bigint" && least < 0n) {
      found.push(`a quantifier's min cannot be negative, got ${least}`);
    } else if (typeof least === "bigint" && typeof most === "bigint" && most < least) {
      found.push("min repeat greater than max repeat");
    }
    if (found_.get("greedy") === false && found_.get("possessive") === true) found.push("a quantifier is lazy or possessive, not both");
    const element = node.subterms.get("element") ?? null;
    if (element !== null) found.push(...repeatable(element));
  } else if (kind === BACKREFERENCE || kind === CONDITIONAL) {
    found.push(...reference(what, found_));
    for (const end of kind === CONDITIONAL ? ["yes", "no"] : []) {
      const term = node.subterms.get(end) ?? null;
      if (term !== null && ![ALTERNATIVE, ...INVALID].includes(tagOf(term))) {
        found.push(`a conditional's ${end} must be an alternative, got ${F.article(tagOf(term))}`);
      }
    }
  } else if (kind === CAPTURINGGROUP) {
    found.push(...P.identifierProblems("a capturinggroup's name", found_.get("name")));
  } else if (kind === FLAGS) {
    found.push(...flagProblems(found_.get("add") ?? "", found_.get("remove") ?? "", node.many.length > 0));
  } else if (kind === COMMENT && (found_.get("text") ?? "").includes(")")) {
    found.push("a comment's text cannot hold ')'");
  }
  if (kind === PATTERN) found.push(...groups(node.many));
  return found;
}

function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

/** How the framework reads its own kinds: applications, of no domain known statically (`Opaque`). */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), ...options });
  return {
    [PATTERN]: application(PATTERN),
    [ALTERNATIVE]: application(ALTERNATIVE),
    [GROUP]: application(GROUP),
    [CAPTURINGGROUP]: application(CAPTURINGGROUP),
    [QUANTIFIER]: application(QUANTIFIER, { required: ["min"] }),
    [CHARACTERCLASS]: application(CHARACTERCLASS),
    [CHARACTERCLASSRANGE]: application(CHARACTERCLASSRANGE),
    [CHARACTERSET]: application(CHARACTERSET, { required: ["setKind"] }),
    [CHARACTER]: application(CHARACTER, { required: ["value"] }),
    [ASSERTION]: application(ASSERTION, { required: ["assertionKind"] }),
    [BACKREFERENCE]: application(BACKREFERENCE),
    [CONDITIONAL]: application(CONDITIONAL, { optional: ["no"] }),
    [ATOMICGROUP]: application(ATOMICGROUP),
    [FLAGS]: application(FLAGS),
    [COMMENT]: application(COMMENT),
  };
}

/** The dialects of its family, whose terms it reads as they read its own (mbse-basis [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided-by-an-agent-for-review), "A dialect reads other dialects' terms": each of Python's dialects reads the other three). */
function reads(): readonly F.Dialect[] {
  return [P.DIALECT, PythonTypes.DIALECT, PythonPatterns.DIALECT];
}

/** The Python RegExp dialect: its kinds, as the framework reads them, and its family's other dialects' terms. */
export const DIALECT = new F.Dialect("Python.RegExp", kinds(), { domain_of: Family.of, reads });
