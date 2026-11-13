/**
 * Expressions of the Cpp RegExp dialect: the regular expressions `std::basic_regex` reads, as ISO/IEC 14882 defines
 * them ([re.grammar], [re.synopt]): its own grammar, ECMAScript's (ECMA-262, third edition, 15.10.1, as [re.grammar]
 * modifies it), and a `regex` naming among its flags another grammar, POSIX's, which [re.synopt] refers to: `basic` and
 * `extended`, POSIX's basic and extended regular expressions, and `awk`, `grep` and `egrep`, those of POSIX's utilities.
 *
 * It is a dialect of the Cpp family (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), stage 6: "constraints, regexes and patterns are
 * expression dialects"; the user's "(b)" (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Which regular expressions are dialects"), every regular expression a language's
 * standard defines, its library's included), named `Cpp RegExp` (`Terms.dialectName`), its tag `cpp_regexp`. Its terms
 * are values of its `Term`, `Expressions.Cpp.RegExp.Term`, the branch `cpp_regexp` of `Expressions.Framework.Term`; its
 * holder, `Expressions.Cpp.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`. No subterm in C++ is one: a pattern is a string there, passed to `std::regex`, and that a string is a
 * regular expression is the program's to say, never guessed (mbse-basis [PRI-025: never guess the schema](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-025)); mbse-programs, or a constraint's author, holds one through its holder.
 *
 * Its kinds are [re.grammar]'s grammar alone, as ISO/IEC 14882 defines only that one; the other five, which [re.synopt]
 * selects by naming POSIX, are POSIX's dialects' (the user, 2026-11-12: "yes to a new posix family"): a `regex` whose
 * flags name `basic` or `grep` holds a `POSIX BRE` term, one naming `extended`, `awk` or `egrep` a `POSIX ERE` term, read
 * as that dialect reads it, as a C++ term is read under the ABI its holder names (mbse-basis [CAP-267: C and C++ terms read under the ABI their holder names](mbse:mbse-basis/docs/capabilities/CAP-267.md)); what C++'s grammar
 * selects of POSIX's beyond the dialect's own checks is checked under the `regex` (`FEATURES`). Its kinds, each a value
 * object `Expressions.Cpp.RegExp.<Kind>`, are named as ECMAScript's reference parser, regexpp, names its nodes (as
 * `TypeScript RegExp`'s are, each family defining its own copy), and [re.grammar]'s own productions as it names them;
 * tags lowercased:
 *
 * - `regex`, what `basic_regex` holds: its `flags`, the `syntax_option_type` elements it is constructed with, as written
 *   (`basic_regex::flags()`: `icase`, `nosubs`, `optimize`, `collate`, `multiline` and at most one grammar), and its
 *   `pattern`, a term of the dialect its grammar names (`GRAMMAR_DIALECTS`);
 * - `pattern` (Disjunction), its `alternatives`, and `alternative`, its `elements`;
 * - `group`, `(?:...)`, and `capturinggroup`, `(...)`, each its `alternatives`;
 * - `quantifier`: its `raw`, as written (`{0,}`), printed where it has one, its `min`, its `max` (absent: no bound),
 *   whether it is `greedy` (absent: it is; `*?` is not), and its `element`;
 * - `characterclass` (`[^...]`): whether it is `negate`d, and its `elements`; and `characterclassrange` (`a-z`), its
 *   `min` and `max`, each a character or a collating element;
 * - `characterset`: its `setKind`, `any` (`.`), `digit`, `space` or `word` (`\d`, `\s`, `\w`), and whether it is
 *   `negate`d (`\D`);
 * - `character`: its `raw`, as written (`\x41`, `\n`, `\.`), printed where it has one, and its `value`, a code point;
 * - `assertion`: its `assertionKind`, `start` (`^`), `end` (`$`), `word` (`\b`) or `lookahead` (`(?=...)`, with its
 *   `alternatives`), and whether it is `negate`d (`\B`, `(?!...)`);
 * - `backreference` (`\1`), its `ref`;
 * - [re.grammar]'s class atoms, each its `name`: `exclass` (ClassAtomExClass, `[:alpha:]`), `collatingelement`
 *   (ClassAtomCollatingElement, `[.ch.]`) and `equivalence` (ClassAtomEquivalence, `[=a=]`);
 *
 * then the framework's kinds of invalid syntax, `error` and `missing`. Its helpers are none (`HELPERS`). What a kind's
 * terms may be is checked (`HOLDS`: an alternative's elements are atoms, a quantifier's an atom but an assertion or a
 * quantifier, a class's its class atoms).
 *
 * No kind binds a name a term scopes: a capturing group is numbered, not named (ECMA-262's third edition has no named
 * group), and a backreference resolves it by its number. Its kinds are applications the framework reads by their
 * structure, of no domain known statically, and are not evaluated, each refused by its dialect's name ("Cpp RegExp regex
 * is not evaluated"). The editions it covers are data, which `define` writes, C++'s (C++17, C++20, C++23), every kind in
 * each (`SINCE`): [re.grammar] is the same in the three. `DIALECT` reads its kinds, its family's other dialects' terms,
 * as each family's dialects read one another (mbse-basis [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided-by-an-agent-for-review), "A dialect reads other dialects' terms"), and POSIX's, which a regex holds (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis
 * [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)). Its terms are written
 * through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(u) => u.character((c) => c.value(97n))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Repr } from "@mbse/schemas/Framework";
import * as CPreprocessor from "../../C/Preprocessor/Expressions.js";
import * as FD from "../../Framework/Domains.js";
import type { Listed } from "../../Framework/Objects.js";
import * as F from "../../Framework/Terms.js";
import * as BRE from "../../POSIX/BRE/Expressions.js";
import * as ERE from "../../POSIX/ERE/Expressions.js";
import * as Cpp from "../Expressions/Expressions.js";
import * as CppTypes from "../Types/Expressions.js";

const { repr } = Repr;

export const REGEX: string = "regex", PATTERN: string = "pattern",
  ALTERNATIVE: string = "alternative", GROUP: string = "group", CAPTURINGGROUP: string = "capturinggroup",
  QUANTIFIER: string = "quantifier", CHARACTERCLASS: string = "characterclass",
  CHARACTERCLASSRANGE: string = "characterclassrange", CHARACTERSET: string = "characterset",
  CHARACTER: string = "character", ASSERTION: string = "assertion", BACKREFERENCE: string = "backreference",
  EXCLASS: string = "exclass", COLLATINGELEMENT: string = "collatingelement", EQUIVALENCE: string = "equivalence";

/** Its own kinds, in its `Term`'s order, before invalid syntax. */
export const TAGS: readonly string[] = [REGEX, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER,
  CHARACTERCLASS, CHARACTERCLASSRANGE, CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE, EXCLASS, COLLATINGELEMENT,
  EQUIVALENCE];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in, by its index in C++'s editions (C++17, C++20, C++23): none, so each is in
 * every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map();

export const ECMASCRIPT = "ECMAScript";

/** The grammar elements of `syntax_option_type`, as [re.synopt] names them, one of which a regex's grammar is. */
export const GRAMMARS: readonly string[] = [ECMASCRIPT, "basic", "extended", "awk", "grep", "egrep"];

/** The elements of `syntax_option_type`, in [re.synopt]'s order: what a regex's `flags` may hold. */
export const SYNTAX_OPTIONS: readonly string[] = ["icase", "nosubs", "optimize", "collate", ...GRAMMARS, "multiline"];

/** The dialect each grammar's patterns are terms of, by its path ([re.synopt]): ECMAScript's this one's; `basic` and
 * `grep` (POSIX's grep, its patterns BREs) POSIX's basic regular expressions; `extended`, `awk` (whose EREs take C's
 * escapes) and `egrep` (`grep -E`) its extended ones. */
export const GRAMMAR_DIALECTS: ReadonlyMap<string, string> = new Map([[ECMASCRIPT, "Cpp.RegExp"], ["basic", "POSIX.BRE"],
  ["extended", "POSIX.ERE"], ["awk", "POSIX.ERE"], ["grep", "POSIX.BRE"], ["egrep", "POSIX.ERE"]]);

/** The class names every traits class recognizes, at least ([re.grammar], 7); which others it does is its own. */
export const CLASS_NAMES: readonly string[] = ["alnum", "alpha", "blank", "cntrl", "digit", "graph", "lower", "print",
  "punct", "space", "upper", "xdigit", "d", "s", "w"];

/** A characterset's kinds: `.`, `\d`, `\s` and `\w`. */
export const SETS: readonly string[] = ["any", "digit", "space", "word"];

/** An assertion's kinds: `^`, `$`, `\b` and `(?=...)`. */
export const ASSERTIONS: readonly string[] = ["start", "end", "word", "lookahead"];

const ATOMS = [GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE];
const QUANTIFIED = [GROUP, CAPTURINGGROUP, CHARACTERCLASS, CHARACTERSET, CHARACTER, BACKREFERENCE];
const CLASS_ATOMS = [CHARACTERCLASSRANGE, CHARACTERSET, CHARACTER, EXCLASS, COLLATINGELEMENT, EQUIVALENCE];
const ENDS = [CHARACTER, COLLATINGELEMENT];

/** What each kind's terms may be, by property, besides invalid syntax: the grammar's structure, which the schema, every
 * property holding its `Term`, leaves to validation (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "The framework's kinds with subterms stay shared"); a quantifier repeats an Atom,
 * never an Assertion or another quantifier (ECMA-262, 15.10.1, Term). */
export const HOLDS: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> = new Map([
  [PATTERN, new Map([["alternatives", [ALTERNATIVE]]])],
  [ALTERNATIVE, new Map([["elements", ATOMS]])],
  [GROUP, new Map([["alternatives", [ALTERNATIVE]]])],
  [CAPTURINGGROUP, new Map([["alternatives", [ALTERNATIVE]]])],
  [QUANTIFIER, new Map([["element", QUANTIFIED]])],
  [CHARACTERCLASS, new Map([["elements", CLASS_ATOMS]])],
  [CHARACTERCLASSRANGE, new Map([["min", ENDS], ["max", ENDS]])],
  [ASSERTION, new Map([["alternatives", [ALTERNATIVE]]])],
]);

/** What a POSIX grammar's term may have that C++'s grammar does not select, each with the grammars that have it: grep's
 * and egrep's list of patterns, which [re.synopt]'s other POSIX grammars are not; and what POSIX.1-2024 added, which the
 * editions C++ cites ([intro.refs]: ISO/IEC 9945:2003, ISO/IEC/IEEE 9945:2009) have not: a BRE's alternation (`\|`) and
 * an ERE's repetition modifier (`*?`). */
export const FEATURES: ReadonlyMap<string, readonly string[]> = new Map([
  ["a patternlist", ["grep", "egrep"]],
  ["alternation", ["extended", "awk", "egrep"]],
  ["a lazy quantifier", []],
]);

/** The grammar a regex's `flags` select: its one grammar element, else ECMAScript, the default ([re.synopt]). */
export function grammar(flags: readonly string[]): string {
  return flags.find((flag) => GRAMMARS.includes(flag)) ?? ECMASCRIPT;
}

const NAMES = ["Regex", "Pattern", "Alternative", "Group", "CapturingGroup", "Quantifier",
  "CharacterClass", "CharacterClassRange", "CharacterSet", "Character", "Assertion", "Backreference", "ExClass",
  "CollatingElement", "Equivalence"];

/**
 * Cpp RegExp's union of its kinds, added to the framework's terms as the branch `cpp_regexp`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.Cpp.RegExp`: run after `Framework.install`, in a transaction of its
 * own, before or after its family's other installs; run again, it writes nothing. Its kinds hold its own terms alone,
 * but a regex, whose pattern is `Expressions.Framework.Term`, a term of the dialect its grammar names. Its holder,
 * `Expressions.Cpp.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.Cpp.RegExp/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject, ...Object.fromEntries(NAMES.map((name) => [name, S.OfObject]))
    })
    .spec([
      // its dialect: the singleton `Expressions.Cpp.RegExp`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Cpp.RegExp.Dialect").ref(true).singleton("Expressions.Cpp.RegExp").adjacencies({
          domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
          operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
          standards: (a: any) => a.relation([Framework.Covers]).me("dialect")}),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
          (t: any) => t.name("cpp_regexp").schema([_.Dialect])]),
      // its union of its kinds, and invalid syntax
      (_: any) => _.Term.name("Expressions.Cpp.RegExp.Term").branches([
          ...NAMES.map((name) => (t: any) => t.name(name.toLowerCase()).schema([_[name]])),
          (t: any) => t.name("error").schema([Framework.Error]),
          (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // a regex: the `syntax_option_type` it is constructed with, and its pattern, of the dialect its grammar names
      (_: any) => _.Regex.name("Expressions.Cpp.RegExp.Regex").properties({
          flags: many(S.OfStr), pattern: _.FrameworkTerm}),
      (_: any) => _.Pattern.name("Expressions.Cpp.RegExp.Pattern").properties({ alternatives: many(_.Term) }),
      (_: any) => _.Alternative.name("Expressions.Cpp.RegExp.Alternative").properties({ elements: many(_.Term) }),
      (_: any) => _.Group.name("Expressions.Cpp.RegExp.Group").properties({ alternatives: many(_.Term) }),
      (_: any) => _.CapturingGroup.name("Expressions.Cpp.RegExp.CapturingGroup").properties({
          alternatives: many(_.Term)}),
      (_: any) => _.Quantifier.name("Expressions.Cpp.RegExp.Quantifier").properties({
          raw: S.OfStr, min: S.OfInt, max: S.OfInt, greedy: S.OfBool, element: _.Term}),
      (_: any) => _.CharacterClass.name("Expressions.Cpp.RegExp.CharacterClass").properties({
          negate: S.OfBool, elements: many(_.Term)}),
      (_: any) => _.CharacterClassRange.name("Expressions.Cpp.RegExp.CharacterClassRange").properties({
          min: _.Term, max: _.Term}),
      (_: any) => _.CharacterSet.name("Expressions.Cpp.RegExp.CharacterSet").properties({
          setKind: S.OfStr, negate: S.OfBool}),
      (_: any) => _.Character.name("Expressions.Cpp.RegExp.Character").properties({ raw: S.OfStr, value: S.OfInt }),
      (_: any) => _.Assertion.name("Expressions.Cpp.RegExp.Assertion").properties({
          assertionKind: S.OfStr, negate: S.OfBool, alternatives: many(_.Term)}),
      (_: any) => _.Backreference.name("Expressions.Cpp.RegExp.Backreference").properties({ ref: S.OfInt }),
      (_: any) => _.ExClass.name("Expressions.Cpp.RegExp.ExClass").properties({ name: S.OfStr }),
      (_: any) => _.CollatingElement.name("Expressions.Cpp.RegExp.CollatingElement").properties({ name: S.OfStr }),
      (_: any) => _.Equivalence.name("Expressions.Cpp.RegExp.Equivalence").properties({ name: S.OfStr }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
      // narrowed to its `Term`
      (_: any) => _.Expression.name("Expressions.Cpp.RegExp.Expression").ref(true).refines([Framework.Expression]).properties({
          root: _.Term}),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
          (t: any) => t.name("cpp_regexp").schema([_.Term])]),
    ])]))]);
}

/**
 * Cpp RegExp's dialect as data: the singleton `Expressions.Cpp.RegExp` owning the editions it covers, by designation
 * (`standards`), C++'s ISO/IEC 14882:2017, 2020 and 2024, each with its formal reference's parts, its common name and
 * its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its
 * frame binds the dialect (`dialect`) and each edition by its common name spelled as an identifier (`Cpp17`).
 */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.Cpp.RegExp, txn.Expressions.Framework.Standard];
  const every = (OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => branch.schema);
  return txn.uid("mbse.Expressions.Cpp.RegExp.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, Cpp17: Standard, Cpp20: Standard, Cpp23: Standard })
    .spec([
      (_: any) => _.dialect.standards({
        "ISO/IEC 14882:2017": (e: any) => e.standard(_.Cpp17),
        "ISO/IEC 14882:2020": (e: any) => e.standard(_.Cpp20),
        "ISO/IEC 14882:2024": (e: any) => e.standard(_.Cpp23) }),
      (_: any) => _.Cpp17.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2017n)).names(
        ["C++17"]).kinds(every),
      (_: any) => _.Cpp20.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2020n)).names(
        ["C++20"]).kinds(every),
      (_: any) => _.Cpp23.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2024n)).names(
        ["C++23"]).kinds(every),
    ])]))]);
}

function read(term: any): F.Node {
  return F.node(...F.kindOf(term));
}

/** The terms a kind's property `name` holds: a subterm's, where it is not empty, or a container's. */
function held(node: F.Node, name: string): readonly any[] {
  if (node.subterms.has(name)) return (node.subterms.get(name) ?? null) === null ? [] : [node.subterms.get(name)];
  return node.lists.get(name) as readonly any[];
}

/** What a POSIX grammar's pattern has that C++ does not select of it (`FEATURES`), each once, in the order first
 * met. */
function grammarProblems(grammar_: string, root: any): string[] {
  const found: string[] = [];
  const lacks = (feature: string): void => {
    const message = `${feature} is not in the ${grammar_} grammar`;
    if (!(FEATURES.get(feature) as readonly string[]).includes(grammar_) && !found.includes(message)) found.push(message);
  };
  const visit = (term: any): void => {
    const node = read(term);
    if (F.INVALID_KINDS.has(node.kind)) return;
    if (node.kind === "patternlist") lacks("a patternlist");
    if ((node.lists.get("alternatives") ?? []).length > 1) lacks("alternation");
    if (node.kind === QUANTIFIER && node.attributes.get("greedy") === false) lacks("a lazy quantifier");
    for (const held_ of [...node.subterms.values(), ...node.many]) {
      if ((held_ ?? null) !== null) visit(held_);
    }
  };
  visit(root);
  return found;
}

/** A node's checks: what its terms may be (`HOLDS`), its attributes' values, and, of a regex, its flags, that its
 * pattern is a pattern of the dialect its grammar names (`GRAMMAR_DIALECTS`), and what that has that C++ does not
 * select of it (`FEATURES`). */
export function problems(node: F.Node): string[] {
  const found: string[] = [];
  const [kind, attributes] = [node.kind, node.attributes];
  for (const [name, allowed] of HOLDS.get(kind) ?? new Map<string, readonly string[]>()) {
    for (const term of held(node, name)) {
      const tag = F.kindOf(term)[0];
      if (!allowed.includes(tag) && !F.INVALID_KINDS.has(tag)) {
        found.push(`${F.article(kind)}'s ${name} cannot hold ${F.article(tag)}`);
      }
    }
  }
  if (kind === REGEX) {
    const flags = attributes.has("flags") ? (attributes.get("flags") as Listed).values as readonly string[] : [];
    found.push(...flags.filter((flag) => !SYNTAX_OPTIONS.includes(flag))
      .map((flag) => `${repr(flag)} is not a syntax_option_type element`));
    const grammars = flags.filter((flag) => GRAMMARS.includes(flag));
    const pattern = node.subterms.get("pattern") ?? null;
    if (grammars.length > 1) {
      found.push(`a regex has at most one grammar element, got ${grammars.join(", ")}`);
    } else if (pattern !== null) {
      const grammar_ = grammar(flags);
      const expected = F.dialectName(GRAMMAR_DIALECTS.get(grammar_) as string);
      const union = F.dialectOf(pattern);
      const held_ = F.dialectName(union.slice("Expressions.".length, -".Term".length));
      const tag = F.kindOf(pattern)[0];
      if (F.INVALID_KINDS.has(tag)) return found; // its own problem, as the dialect holding it reads it
      if (held_ !== expected) {
        found.push(`the ${grammar_} grammar's pattern is ${F.article(expected)} term, got ${F.article(held_)} term`);
      } else if (!(grammar_ === ECMASCRIPT ? [PATTERN] : [PATTERN, "patternlist"]).includes(tag)) {
        found.push(`a regex's pattern cannot hold ${F.article(tag)}`);
      } else if (grammar_ !== ECMASCRIPT) {
        found.push(...grammarProblems(grammar_, pattern));
      }
    }
  } else if (kind === QUANTIFIER) {
    const [least, most] = [attributes.get("min"), attributes.get("max")];
    if (typeof least === "bigint" && least < 0n) found.push(`a quantifier's min cannot be negative, got ${least}`);
    if (typeof least === "bigint" && typeof most === "bigint" && most < least) {
      found.push(`a quantifier's max cannot be less than its min, got ${most} and ${least}`);
    }
  } else if (kind === CHARACTERSET && attributes.has("setKind")) {
    if (!SETS.includes(attributes.get("setKind"))) {
      found.push(`CharacterSet.setKind cannot be ${repr(attributes.get("setKind"))}`);
    } else if (attributes.get("setKind") === "any" && attributes.get("negate") === true) {
      found.push("an any characterset cannot be negated");
    }
  } else if (kind === CHARACTER && typeof attributes.get("value") === "bigint"
    && !(attributes.get("value") >= 0n && attributes.get("value") <= 0x10FFFFn)) {
    found.push(`a character's value must be a code point, got ${attributes.get("value") as bigint}`);
  } else if (kind === ASSERTION && attributes.has("assertionKind")) {
    const assertion = attributes.get("assertionKind") as string;
    if (!ASSERTIONS.includes(assertion)) {
      found.push(`Assertion.assertionKind cannot be ${repr(assertion)}`);
    } else if (["start", "end"].includes(assertion) && attributes.get("negate") === true) {
      found.push(`a ${assertion} assertion cannot be negated`);
    }
    if (assertion !== "lookahead" && (node.lists.get("alternatives") as readonly any[]).length > 0) {
      found.push(`${F.article(assertion)} assertion holds no alternatives`);
    }
  } else if (kind === BACKREFERENCE && typeof attributes.get("ref") === "bigint" && attributes.get("ref") < 1n) {
    found.push(`a backreference's ref must be positive, got ${attributes.get("ref") as bigint}`);
  } else if ([EXCLASS, COLLATINGELEMENT, EQUIVALENCE].includes(kind) && typeof attributes.get("name") === "string") {
    found.push(...[...".=:"].filter((c) => (attributes.get("name") as string).includes(c))
      .map((c) => `${F.article(kind)}'s name cannot hold ${repr(c)}`).slice(0, 1));
  }
  return found;
}

function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

const REQUIRED: ReadonlyMap<string, readonly string[]> = new Map([
  [QUANTIFIER, ["min"]], [CHARACTERSET, ["setKind"]], [CHARACTER, ["value"]], [ASSERTION, ["assertionKind"]],
  [BACKREFERENCE, ["ref"]], [EXCLASS, ["name"]], [COLLATINGELEMENT, ["name"]], [EQUIVALENCE, ["name"]],
]);

/** How the framework reads its own kinds: applications, of no domain known statically (`Opaque`). */
function kinds(): Record<string, F.Kind> {
  return Object.fromEntries(TAGS.map((tag) => [tag, new F.Kind(F.APPLICATION, {
    signature: new FD.Opaque(), check: check(tag), required: REQUIRED.get(tag) ?? [] })]));
}

/** The dialects of its family, read when first needed, C++'s, Cpp Types' and C Preprocessor's, then POSIX's, whose
 * terms a regex naming a POSIX grammar holds: POSIX BRE's and POSIX ERE's. */
function reads(): readonly F.Dialect[] {
  return [Cpp.DIALECT, CppTypes.DIALECT, CPreprocessor.DIALECT, BRE.DIALECT, ERE.DIALECT];
}

/** The Cpp RegExp dialect: its kinds, as the framework reads them, its family's other dialects' terms, and POSIX's. */
export const DIALECT = new F.Dialect("Cpp.RegExp", kinds(), { domain_of: () => FD.Anything, reads });
