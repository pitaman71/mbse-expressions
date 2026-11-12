/**
 * Expressions of the Cpp RegExp dialect: the regular expressions `std::basic_regex` reads, as ISO/IEC 14882 defines
 * them ([re.grammar], [re.synopt]), in each of its six grammars: ECMAScript's (ECMA-262, third edition, 15.10.1, as
 * [re.grammar] modifies it), and POSIX's basic and extended regular expressions (ISO/IEC/IEEE 9945, XBD 9.3 to 9.5), and
 * those of the utilities awk, grep and egrep (`grep -E`), which [re.synopt] refers to.
 *
 * It is a dialect of the Cpp family (the dialects proposal, Decided for stage 6: "constraints, regexes and patterns are
 * expression dialects"; the user, on its Retrofit's design, Open, 1: "(b)", every regular expression a language's
 * standard defines, its library's included), named `Cpp RegExp` (`Terms.dialectName`), its tag `cpp_regexp`. Its terms
 * are values of its `Term`, `Expressions.Cpp.RegExp.Term`, the branch `cpp_regexp` of `Expressions.Framework.Term`; its
 * holder, `Expressions.Cpp.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`. No subterm in C++ is one: a pattern is a string there, passed to `std::regex`, and that a string is a
 * regular expression is the program's to say, never guessed (mbse-basis [PRI-025: never guess the schema](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-025)); mbse-programs, or a constraint's author, holds one through its holder.
 *
 * One dialect covers the six grammars *(agent)*, as one `std::basic_regex` reads them, the grammar being one element of
 * the `syntax_option_type` it is constructed with ([re.synopt]: "A valid value of type syntax_option_type shall have at
 * most one of the grammar elements ECMAScript, basic, extended, awk, grep, egrep, set. If no grammar element is set, the
 * default grammar is ECMAScript"): its kinds are the constructs the grammars share, each once, and which grammar has a
 * construct is a constraint, checked by validation, as which standard has a kind is for C and C++ (the dialects
 * proposal, Decided, 3 and 4). Its kinds, each a value object `Expressions.Cpp.RegExp.<Kind>`, are named as ECMAScript's
 * reference parser, regexpp, names its nodes (as `TypeScript RegExp`'s are, each family defining its own copy), and
 * [re.grammar]'s own productions as it names them; tags lowercased:
 *
 * - `regex`, what `basic_regex` holds: its `flags`, the `syntax_option_type` elements it is constructed with, as written
 *   (`basic_regex::flags()`: `icase`, `nosubs`, `optimize`, `collate`, `multiline` and at most one grammar), and its
 *   `pattern`;
 * - `patternlist`, grep's and egrep's newline-separated list of patterns (POSIX, XCU grep, "pattern_list"), its
 *   `patterns`;
 * - `pattern` (ECMAScript's Disjunction, POSIX's `basic_reg_exp` and `extended_reg_exp`), its `alternatives`, and
 *   `alternative` (an ECMAScript Alternative, a POSIX `RE_expression` or `ERE_branch`), its `elements`;
 * - `group`, ECMAScript's `(?:...)`, and `capturinggroup`, ECMAScript's and an ERE's `(...)` and a BRE's `\(...\)`,
 *   each its `alternatives`;
 * - `quantifier`: its `raw`, as written (`\{2,\}`, `{0,}`), printed where it has one, its `min`, its `max` (absent: no
 *   bound), whether it is `greedy` (absent: it is; ECMAScript's `*?` is not), and its `element`;
 * - `characterclass`, a bracket expression (`[^...]`): whether it is `negate`d, and its `elements`; and
 *   `characterclassrange` (`a-z`), its `min` and `max`, each a character or a collating element;
 * - `characterset`: its `setKind`, `any` (`.`), or ECMAScript's `digit`, `space` or `word` (`\d`, `\s`, `\w`), and
 *   whether it is `negate`d (`\D`);
 * - `character`: its `raw`, as written (`\x41`, `\n`, `\.`), printed where it has one, and its `value`, a code point;
 * - `assertion`: its `assertionKind`, `start` (`^`), `end` (`$`), ECMAScript's `word` (`\b`) or `lookahead` (`(?=...)`, with its
 *   `alternatives`), and whether it is `negate`d (`\B`, `(?!...)`);
 * - `backreference` (`\1`), its `ref`;
 * - [re.grammar]'s and POSIX's class atoms, each its `name`: `exclass` (ClassAtomExClass, `[:alpha:]`),
 *   `collatingelement` (ClassAtomCollatingElement, `[.ch.]`) and `equivalence` (ClassAtomEquivalence, `[=a=]`);
 *
 * then the framework's kinds of invalid syntax, `error` and `missing`. Its helpers are none (`HELPERS`). What a kind's
 * terms may be is checked (`HOLDS`: an alternative's elements are atoms, a class's its class atoms), and, under a
 * `regex`, what its grammar has (`FEATURES`: alternation is not in the basic grammar, nor a group in the extended one). A
 * term held otherwise than by a `regex` is read as ECMAScript's, the default grammar.
 *
 * No kind binds a name a term scopes: a capturing group is numbered, not named, in every grammar (ECMA-262's third
 * edition has no named group), and a backreference resolves it by its number. Its kinds are applications the framework
 * reads by their structure, of no domain known statically, and are not evaluated, each refused by its dialect's name
 * ("Cpp RegExp regex is not evaluated"). The editions it covers are data, which `define` writes, C++'s (C++17, C++20,
 * C++23), every kind in each (`SINCE`): [re.grammar] is the same in the three. `DIALECT` reads its kinds, and its
 * family's other dialects' terms (`reads`), as each family's dialects read one another (the dialects proposal,
 * Retrofit's design, "Installs in any order within a family"); none of it is a reason to reinstate `Uses` (mbse-basis
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
import * as Cpp from "../Expressions/Expressions.js";
import * as CppTypes from "../Types/Expressions.js";

const { repr } = Repr;

export const REGEX: string = "regex", PATTERNLIST: string = "patternlist", PATTERN: string = "pattern",
  ALTERNATIVE: string = "alternative", GROUP: string = "group", CAPTURINGGROUP: string = "capturinggroup",
  QUANTIFIER: string = "quantifier", CHARACTERCLASS: string = "characterclass",
  CHARACTERCLASSRANGE: string = "characterclassrange", CHARACTERSET: string = "characterset",
  CHARACTER: string = "character", ASSERTION: string = "assertion", BACKREFERENCE: string = "backreference",
  EXCLASS: string = "exclass", COLLATINGELEMENT: string = "collatingelement", EQUIVALENCE: string = "equivalence";

/** Its own kinds, in its `Term`'s order, before invalid syntax. */
export const TAGS: readonly string[] = [REGEX, PATTERNLIST, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER,
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

/** The class names every traits class recognizes, at least ([re.grammar], 7); which others it does is its own. */
export const CLASS_NAMES: readonly string[] = ["alnum", "alpha", "blank", "cntrl", "digit", "graph", "lower", "print",
  "punct", "space", "upper", "xdigit", "d", "s", "w"];

/** A characterset's kinds: `.`, and ECMAScript's `\d`, `\s` and `\w`. */
export const SETS: readonly string[] = ["any", "digit", "space", "word"];

/** An assertion's kinds: `^`, `$`, and ECMAScript's `\b` and `(?=...)`. */
export const ASSERTIONS: readonly string[] = ["start", "end", "word", "lookahead"];

const ATOMS = [GROUP, CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE];
const CLASS_ATOMS = [CHARACTERCLASSRANGE, CHARACTERSET, CHARACTER, EXCLASS, COLLATINGELEMENT, EQUIVALENCE];
const ENDS = [CHARACTER, COLLATINGELEMENT];

/** What each kind's terms may be, by property, besides invalid syntax: the grammars' structure, which the schema, every
 * property holding its `Term`, leaves to validation (the dialects proposal, Decided, 4). */
export const HOLDS: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> = new Map([
  [REGEX, new Map([["pattern", [PATTERN, PATTERNLIST]]])],
  [PATTERNLIST, new Map([["patterns", [PATTERN]]])],
  [PATTERN, new Map([["alternatives", [ALTERNATIVE]]])],
  [ALTERNATIVE, new Map([["elements", ATOMS]])],
  [GROUP, new Map([["alternatives", [ALTERNATIVE]]])],
  [CAPTURINGGROUP, new Map([["alternatives", [ALTERNATIVE]]])],
  [QUANTIFIER, new Map([["element", ATOMS]])],
  [CHARACTERCLASS, new Map([["elements", CLASS_ATOMS]])],
  [CHARACTERCLASSRANGE, new Map([["min", ENDS], ["max", ENDS]])],
  [ASSERTION, new Map([["alternatives", [ALTERNATIVE]]])],
]);

const EXTENDED = ["extended", "awk", "egrep"];

/** The constructs not every grammar has, each with the grammars that have it: ECMAScript's own (a group, a lookahead, a
 * word boundary, a class escape, a lazy quantifier); alternation, which a BRE has not (XBD 9.5.2), but grep's list of
 * patterns; grep's and egrep's list; a repeated quantifier or anchor, which only an ERE's grammar allows
 * (`ERE_expression ERE_dupl_symbol`, XBD 9.5.3); an anchor anywhere but where a BRE begins or ends (`L_ANCHOR`,
 * `R_ANCHOR`); and a backreference, which no ERE has, a BRE's being `\1` to `\9` (`BACKREF`). */
export const FEATURES: ReadonlyMap<string, readonly string[]> = new Map([
  ["a patternlist", ["grep", "egrep"]],
  ["alternation", [ECMASCRIPT, ...EXTENDED]],
  ["a group", [ECMASCRIPT]],
  ["a lookahead assertion", [ECMASCRIPT]],
  ["a word assertion", [ECMASCRIPT]],
  ["a digit characterset", [ECMASCRIPT]],
  ["a space characterset", [ECMASCRIPT]],
  ["a word characterset", [ECMASCRIPT]],
  ["a lazy quantifier", [ECMASCRIPT]],
  ["a repeated quantifier", EXTENDED],
  ["a repeated anchor", EXTENDED],
  ["an anchor within the expression", [ECMASCRIPT, ...EXTENDED]],
  ["a backreference", [ECMASCRIPT, "basic", "grep"]],
  ["a backreference past 9", [ECMASCRIPT]],
]);

/** The grammar a regex's `flags` select: its one grammar element, else ECMAScript, the default ([re.synopt]). */
export function grammar(flags: readonly string[]): string {
  return flags.find((flag) => GRAMMARS.includes(flag)) ?? ECMASCRIPT;
}

const NAMES = ["Regex", "PatternList", "Pattern", "Alternative", "Group", "CapturingGroup", "Quantifier",
  "CharacterClass", "CharacterClassRange", "CharacterSet", "Character", "Assertion", "Backreference", "ExClass",
  "CollatingElement", "Equivalence"];

/**
 * Cpp RegExp's union of its kinds, added to the framework's terms as the branch `cpp_regexp`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.Cpp.RegExp`: run after `Framework.install`, in a transaction of its
 * own, before or after its family's other installs; run again, it writes nothing. Its kinds hold its own terms alone.
 * Its holder, `Expressions.Cpp.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
 * its `Term`.
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
      // a regex: the `syntax_option_type` it is constructed with, and its pattern
      (_: any) => _.Regex.name("Expressions.Cpp.RegExp.Regex").properties({
          flags: many(S.OfStr), pattern: _.Term}),
      (_: any) => _.PatternList.name("Expressions.Cpp.RegExp.PatternList").properties({ patterns: many(_.Term) }),
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

/** What a regex's pattern has that its grammar has not (`FEATURES`), each once, in the order first met. */
function grammarProblems(grammar_: string, root: any): string[] {
  const found: string[] = [];
  const lacks = (feature: string): void => {
    const message = `${feature} is not in the ${grammar_} grammar`;
    if (!(FEATURES.get(feature) as readonly string[]).includes(grammar_) && !found.includes(message)) found.push(message);
  };
  const visit = (term: any, top: boolean, anchored: boolean): void => {
    const node = read(term);
    const [kind, attributes] = [node.kind, node.attributes];
    if (F.INVALID_KINDS.has(kind)) return;
    if (kind === PATTERNLIST) lacks("a patternlist");
    if ((node.lists.get("alternatives") ?? []).length > 1) lacks("alternation");
    if (kind === GROUP) lacks("a group");
    if (kind === ASSERTION && ["word", "lookahead"].includes(attributes.get("assertionKind"))) {
      lacks(`a ${attributes.get("assertionKind") as string} assertion`);
    }
    if (kind === ASSERTION && ["start", "end"].includes(attributes.get("assertionKind")) && !anchored) {
      lacks("an anchor within the expression");
    }
    if (kind === CHARACTERSET && ["digit", "space", "word"].includes(attributes.get("setKind"))) {
      lacks(`a ${attributes.get("setKind") as string} characterset`);
    }
    if (kind === QUANTIFIER) {
      if (attributes.get("greedy") === false) lacks("a lazy quantifier");
      const element = node.subterms.get("element") ?? null;
      const inner = element !== null ? read(element) : null;
      if (inner !== null && inner.kind === QUANTIFIER) lacks("a repeated quantifier");
      if (inner !== null && inner.kind === ASSERTION && ["start", "end"].includes(inner.attributes.get("assertionKind"))) {
        lacks("a repeated anchor");
      }
    }
    if (kind === BACKREFERENCE) {
      lacks("a backreference");
      if (typeof attributes.get("ref") === "bigint" && attributes.get("ref") > 9n) lacks("a backreference past 9");
    }
    if (kind === ALTERNATIVE) {
      const elements = node.lists.get("elements") as readonly any[];
      elements.forEach((element, i) => {
        const assertion = read(element).attributes.get("assertionKind");
        visit(element, false, top && (assertion === "start" && i === 0 || assertion === "end" && i === elements.length - 1));
      });
      return;
    }
    for (const name of (HOLDS.get(kind) ?? new Map()).keys()) {
      for (const term_ of held(node, name)) visit(term_, [REGEX, PATTERNLIST, PATTERN].includes(kind) && top, false);
    }
  };
  visit(root, true, false);
  return found;
}

/** A node's checks: what its terms may be (`HOLDS`), its attributes' values, and, of a regex, its flags and what its
 * pattern has that its grammar has not (`FEATURES`). */
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
    if (grammars.length > 1) {
      found.push(`a regex has at most one grammar element, got ${grammars.join(", ")}`);
    } else if ((node.subterms.get("pattern") ?? null) !== null) {
      found.push(...grammarProblems(grammar(flags), node.subterms.get("pattern")));
    }
  } else if (kind === QUANTIFIER) {
    const [least, most] = [attributes.get("min"), attributes.get("max")];
    if (typeof least === "bigint" && least < 0n) found.push(`a quantifier's min cannot be negative, got ${least}`);
    if (typeof least === "bigint" && typeof most === "bigint" && most < least) {
      found.push(`a quantifier's max cannot be less than its min, got ${most} and ${least}`);
    }
    const element = node.subterms.get("element") ?? null;
    if (element !== null && read(element).attributes.get("assertionKind") === "word") {
      found.push("a quantifier cannot repeat a word assertion");
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

/** The dialects of its family, read when first needed: C++'s, Cpp Types' and C Preprocessor's. */
function reads(): readonly F.Dialect[] {
  return [Cpp.DIALECT, CppTypes.DIALECT, CPreprocessor.DIALECT];
}

/** The Cpp RegExp dialect: its kinds, as the framework reads them, and its family's other dialects' terms. */
export const DIALECT = new F.Dialect("Cpp.RegExp", kinds(), { domain_of: () => FD.Anything, reads });
