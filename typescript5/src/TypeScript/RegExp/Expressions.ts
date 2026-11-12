/**
 * Expressions of the TypeScript RegExp dialect: ECMA-262's regular expressions, the pattern grammar (22.2.1, "Patterns")
 * a regular expression literal holds (12.9.5), as @eslint-community/regexpp reads them, the parser ESLint and
 * typescript-eslint read a regular expression's body with, as typescript-estree reads TypeScript's.
 *
 * It is a dialect of the TypeScript family (the dialects proposal, Decided for stage 6: "constraints, regexes and
 * patterns are expression dialects"; its Retrofit's design; the user's "(b)" on which regular expressions are
 * dialects), named `TypeScript RegExp` (`Terms.dialectName`), its tag `typescript_regexp`. Its terms are values of its
 * `Term`, `Expressions.TypeScript.RegExp.Term`, the branch `typescript_regexp` of `Expressions.Framework.Term`.
 * mbse-programs has no kinds for a regular expression's body, so its kinds are regexpp's node types
 * (`mbse:mbse-basis/docs/capabilities/CAP-226.md`, "where mbse-programs has none, they are the reference parser's"),
 * with regexpp's names, lowercased as branch tags, and its properties in the order regexpp declares them, each a value
 * object `Expressions.TypeScript.RegExp.<Kind>`: `regexpliteral` (`pattern`, `flags`), `pattern` (`alternatives`),
 * `alternative` (`elements`), `group` (`modifiers`, `alternatives`), `capturinggroup` (`name`, `alternatives`),
 * `quantifier` (`min`, `max`, `greedy`, `element`), `characterclass` (`unicodeSets`, `negate`, `elements`),
 * `characterclassrange` (`min`, `max`), `classintersection` and `classsubtraction` (`left`, `right`),
 * `classstringdisjunction` (`alternatives`), `stringalternative` (`elements`), `expressioncharacterclass` (`negate`,
 * `expression`), `characterset` (`setKind`: `any`, `digit`, `space`, `word` or `property`; `negate`, `strings`, `key`,
 * `value`), `character` (`value`, a code point), `assertion` (`assertionKind`: `start`, `end`, `word`, `lookahead` or
 * `lookbehind`; `negate`, `alternatives`), `backreference` (`ref`, a group's number or its name) and `modifiers` (`add`,
 * `remove`); then invalid syntax, `error` and `missing`. A property whose name is a keyword of Python or the framework's
 * `kind` is renamed as mbse-programs renames typescript-estree's (`isAsync`, `propertyKind`): regexpp's `kind` is
 * `setKind` and `assertionKind`, and a flag's `global` `isGlobal` *(agent)*. Its helpers are regexpp's two node types
 * that are a kind's parts rather than an expression's: `Flags`, a literal's, and `ModifierFlags`, a modifiers'
 * (`HELPERS`). What regexpp derives from a tree rather than reads (a node's `parent`, `start` and `end`, a group's
 * `references`, a backreference's `resolved` and `ambiguous`) is not kept *(agent)*. A node's spelling, regexpp's `raw`,
 * is kept where the tree does not give it, as a literal's `text` is (mbse-basis [PRI-023: domain
 * representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023); the dialects proposal, Decided, 2, "concrete syntax
 * kept, so source prints back as written"): a leaf's, `character`'s, `characterset`'s and `backreference`'s, `Flags`'
 * and `ModifierFlags`', and a quantifier's, whose `{0,}` its bounds do not tell from `*` *(agent)*. A quantifier's `max`
 * is absent where it is unbounded, regexpp's `Infinity` *(agent)*.
 *
 * A regular expression binds nothing a term scopes: a named group's name is a label within its pattern, which a
 * backreference resolves, so none of its kinds refines `Let`, as the dialects proposal's Retrofit's design has it. It
 * holds no other dialect's terms, and none of its kinds is evaluated (Q11): each is refused by name ("TypeScript RegExp
 * character is not evaluated"). Which kinds a mode allows (the `v` flag's classes in a literal without it), like which
 * terms a position allows, is a constraint (the dialects proposal, Decided, 4), not its checks'.
 *
 * Where it is held: `TypeScript5`'s `constant`, a regular expression literal, keeps its `pattern` and `flags` as written
 * and holds its `regexp`, the `regexpliteral` they encode, absent where they do not parse (PRI-023); nothing else holds
 * it, a string given to `new RegExp` being a string (mbse-basis [PRI-025: never guess the
 * schema](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-025)). mbse-programs, or a constraint's author, holds one through its
 * holder too.
 *
 * The editions of ECMA-262 it covers are data, which `define` writes, each owned by its designation as Ecma
 * International writes it (`ECMA-262 6th Edition`), from the 5.1 Edition to the 16th (ECMAScript 2025), each with its
 * body, its number, its edition and its common names (`ECMAScript 2015`, `ES2015`), and the kinds it has: the `v` flag's
 * five from the 15th (ES2024), `modifiers` from the 16th, every other in each (`SINCE`); a feature within a kind (a named
 * group, a lookbehind, a property escape, ES2018) is not recorded. `DIALECT` reads its kinds and its family's other
 * dialects' terms (`reads`). `Text` writes its kinds as ECMAScript source, as the family's printer
 * (`TypeScript5.Text.ToText`) dispatches them to it. Its terms are written through the builders (mbse-basis [PRI-019:
 * fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `(r) => r.character((c) => c.value(97n))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as TypeScriptPatterns from "../Patterns/Expressions.js";
import * as Family from "../TypeScript5/Domains.js";
import * as TypeScript5 from "../TypeScript5/Expressions.js";
import * as TypeScriptTypes from "../Types/Expressions.js";

const { repr } = Repr;

export const REGEXPLITERAL = "regexpliteral";
export const PATTERN = "pattern";
export const ALTERNATIVE = "alternative";
export const GROUP = "group";
export const CAPTURINGGROUP = "capturinggroup";
export const QUANTIFIER = "quantifier";
export const CHARACTERCLASS = "characterclass";
export const CHARACTERCLASSRANGE = "characterclassrange";
export const CLASSINTERSECTION = "classintersection";
export const CLASSSUBTRACTION = "classsubtraction";
export const CLASSSTRINGDISJUNCTION = "classstringdisjunction";
export const STRINGALTERNATIVE = "stringalternative";
export const EXPRESSIONCHARACTERCLASS = "expressioncharacterclass";
export const CHARACTERSET = "characterset";
export const CHARACTER = "character";
export const ASSERTION = "assertion";
export const BACKREFERENCE = "backreference";
export const MODIFIERS_ = "modifiers";

/** Its own kinds, in its `Term`'s order: regexpp's node types but its two helpers. */
export const TAGS: readonly string[] = [REGEXPLITERAL, PATTERN, ALTERNATIVE, GROUP, CAPTURINGGROUP, QUANTIFIER,
  CHARACTERCLASS, CHARACTERCLASSRANGE, CLASSINTERSECTION, CLASSSUBTRACTION, CLASSSTRINGDISJUNCTION, STRINGALTERNATIVE,
  EXPRESSIONCHARACTERCLASS, CHARACTERSET, CHARACTER, ASSERTION, BACKREFERENCE, MODIFIERS_];

/** Its own helpers: a literal's flags, and a modifiers' flags, each a value object a kind holds. */
export const HELPERS: readonly string[] = ["Flags", "ModifierFlags"];

/** An assertion's kinds, as regexpp names them: `^`, `$`, `\b` (or `\B`), and the lookarounds. */
export const ASSERTIONS: readonly string[] = ["start", "end", "word", "lookahead", "lookbehind"];

/** A character set's kinds, as regexpp names them: `.`, `\d`, `\s`, `\w` (or their negations) and a property escape,
 * `\p{...}` (or `\P{...}`). */
export const CHARACTERSETS: readonly string[] = ["any", "digit", "space", "word", "property"];

/** A literal's flags, each regexpp's property and its letter, in the order `RegExp.prototype.flags` writes them. */
export const FLAGS: readonly (readonly [string, string])[] = [["hasIndices", "d"], ["isGlobal", "g"], ["ignoreCase", "i"],
  ["multiline", "m"], ["dotAll", "s"], ["unicode", "u"], ["unicodeSets", "v"], ["sticky", "y"]];

/** The flags a modifiers adds or removes, each regexpp's property and its letter, in the order ECMA-262 lists them. */
export const MODIFIERS: readonly (readonly [string, string])[] = [["ignoreCase", "i"], ["multiline", "m"], ["dotAll", "s"]];

/** An edition of ECMA-262: its designation, its revision (an edition, but the 5.1 Edition's, a version), its common
 * names and its frame symbol. */
export type Edition = readonly [string, readonly [string, string | bigint], readonly string[], string];

/** The editions of ECMA-262 it covers, the 5.1 Edition to the 16th *(agent)*. */
export const EDITIONS: readonly Edition[] = [
  ["ECMA-262 5.1 Edition", ["version", "5.1"], ["ECMAScript 5.1", "ES5.1"], "ES5_1"],
  ...Array.from({ length: 11 }, (_, i): Edition => {
    const n = i + 6;
    return [`ECMA-262 ${n}th Edition`, ["edition", BigInt(n)], [`ECMAScript ${2009 + n}`, `ES${2009 + n}`], `ES${2009 + n}`];
  }),
];

/** The edition each of its kinds arrived in, by its index in `EDITIONS`: the `v` flag's five in the 15th (ES2024),
 * `modifiers` in the 16th (ES2025); a kind not listed is in every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map([[CLASSINTERSECTION, 10], [CLASSSUBTRACTION, 10],
  [CLASSSTRINGDISJUNCTION, 10], [STRINGALTERNATIVE, 10], [EXPRESSIONCHARACTERCLASS, 10], [MODIFIERS_, 11]]);

const KINDS: readonly string[] = ["RegExpLiteral", "Pattern", "Alternative", "Group", "CapturingGroup", "Quantifier",
  "CharacterClass", "CharacterClassRange", "ClassIntersection", "ClassSubtraction", "ClassStringDisjunction",
  "StringAlternative", "ExpressionCharacterClass", "CharacterSet", "Character", "Assertion", "Backreference", "Modifiers"];

/**
 * TypeScript RegExp's union of its kinds, added to the framework's terms as the branch `typescript_regexp`, its own
 * kinds, its helpers, and its dialect's schema, whose singleton is `Expressions.TypeScript.RegExp`: run after
 * `Framework.install`, in a transaction of its own, before or after its family's other installs; run again, it writes
 * nothing. Its `Term` is named as `TypeScript5`'s install names it, for its `constant`'s `regexp`, either creating it.
 * Its holder, `Expressions.TypeScript.RegExp.Expression`, refines `Expressions.Framework.Expression`, its `root`
 * narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.TypeScript.RegExp/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject, ...Object.fromEntries([...KINDS, ...HELPERS].map((name) => [name, S.OfObject])) })
    .spec([
      // its dialect: the singleton `Expressions.TypeScript.RegExp`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.TypeScript.RegExp.Dialect").ref(true).singleton("Expressions.TypeScript.RegExp").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("typescript_regexp").schema([_.Dialect])]),
      // its union of its kinds, regexpp's node types, and invalid syntax
      (_: any) => _.Term.name("Expressions.TypeScript.RegExp.Term").branches([
        ...TAGS.map((tag, i) => (t: any) => t.name(tag).schema([_[KINDS[i] as string]])),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its kinds, each with regexpp's properties in its order; a leaf's and a quantifier's spelling, `raw`
      (_: any) => _.RegExpLiteral.name("Expressions.TypeScript.RegExp.RegExpLiteral").properties({
        pattern: _.Term, flags: _.Flags }),
      (_: any) => _.Pattern.name("Expressions.TypeScript.RegExp.Pattern").properties({ alternatives: many(_.Term) }),
      (_: any) => _.Alternative.name("Expressions.TypeScript.RegExp.Alternative").properties({ elements: many(_.Term) }),
      (_: any) => _.Group.name("Expressions.TypeScript.RegExp.Group").properties({
        modifiers: _.Term, alternatives: many(_.Term) }),
      (_: any) => _.CapturingGroup.name("Expressions.TypeScript.RegExp.CapturingGroup").properties({
        name: S.OfStr, alternatives: many(_.Term) }),
      (_: any) => _.Quantifier.name("Expressions.TypeScript.RegExp.Quantifier").properties({
        raw: S.OfStr, min: S.OfInt, max: S.OfInt, greedy: S.OfBool, element: _.Term }),
      (_: any) => _.CharacterClass.name("Expressions.TypeScript.RegExp.CharacterClass").properties({
        unicodeSets: S.OfBool, negate: S.OfBool, elements: many(_.Term) }),
      (_: any) => _.CharacterClassRange.name("Expressions.TypeScript.RegExp.CharacterClassRange").properties({
        min: _.Term, max: _.Term }),
      (_: any) => _.ClassIntersection.name("Expressions.TypeScript.RegExp.ClassIntersection").properties({
        left: _.Term, right: _.Term }),
      (_: any) => _.ClassSubtraction.name("Expressions.TypeScript.RegExp.ClassSubtraction").properties({
        left: _.Term, right: _.Term }),
      (_: any) => _.ClassStringDisjunction.name("Expressions.TypeScript.RegExp.ClassStringDisjunction").properties({
        alternatives: many(_.Term) }),
      (_: any) => _.StringAlternative.name("Expressions.TypeScript.RegExp.StringAlternative").properties({
        elements: many(_.Term) }),
      (_: any) => _.ExpressionCharacterClass.name("Expressions.TypeScript.RegExp.ExpressionCharacterClass").properties({
        negate: S.OfBool, expression: _.Term }),
      (_: any) => _.CharacterSet.name("Expressions.TypeScript.RegExp.CharacterSet").properties({
        raw: S.OfStr, setKind: S.OfStr, negate: S.OfBool, strings: S.OfBool, key: S.OfStr, value: S.OfStr }),
      (_: any) => _.Character.name("Expressions.TypeScript.RegExp.Character").properties({
        raw: S.OfStr, value: S.OfInt }),
      (_: any) => _.Assertion.name("Expressions.TypeScript.RegExp.Assertion").properties({
        assertionKind: S.OfStr, negate: S.OfBool, alternatives: many(_.Term) }),
      (_: any) => _.Backreference.name("Expressions.TypeScript.RegExp.Backreference").properties({
        raw: S.OfStr, ref: S.OfAny((a: any) => a.schemas([S.OfInt, S.OfStr])) }), // a number or a name
      (_: any) => _.Modifiers.name("Expressions.TypeScript.RegExp.Modifiers").properties({
        add: _.ModifierFlags, remove: _.ModifierFlags }),
      // its helpers
      (_: any) => _.Flags.name("Expressions.TypeScript.RegExp.Flags").properties({
        raw: S.OfStr, dotAll: S.OfBool, isGlobal: S.OfBool, hasIndices: S.OfBool, ignoreCase: S.OfBool,
        multiline: S.OfBool, sticky: S.OfBool, unicode: S.OfBool, unicodeSets: S.OfBool }),
      (_: any) => _.ModifierFlags.name("Expressions.TypeScript.RegExp.ModifierFlags").properties({
        raw: S.OfStr, dotAll: S.OfBool, ignoreCase: S.OfBool, multiline: S.OfBool }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.TypeScript.RegExp.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("typescript_regexp").schema([_.Term])]),
    ])]))]);
}

/**
 * TypeScript RegExp's dialect as data: the singleton `Expressions.TypeScript.RegExp` owning the editions of ECMA-262 it
 * covers, by designation (`standards`, through `Expressions.Framework.Covers`), the 5.1 Edition to the 16th, each with
 * its body, `org.ecma-international`, its number, `262`, its revision, its common names and its own kinds it has
 * (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect
 * (`dialect`) and each edition by its last common name spelled as an identifier (`ES5_1`, `ES2015`).
 */
export function define(txn: any): any {
  const OWN = txn.Expressions.TypeScript.RegExp;
  const Standard = txn.Expressions.Framework.Standard;
  const every = (OWN.Term.as_schema().branches as { name: string; schema: unknown }[]).filter((b) => TAGS.includes(b.name));
  const edition = (index: number, [revision, value]: Edition[1], names: readonly string[]) => (e: any) => e
    .bodies(["org.ecma-international"]).number("262").revision((r: any) => r[revision](value)).names([...names])
    .kinds(every.filter((b) => (SINCE.get(b.name) ?? 0) <= index).map((b) => b.schema));
  return txn.uid("mbse.Expressions.TypeScript.RegExp.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, ...Object.fromEntries(EDITIONS.map(([, , , symbol]) => [symbol, Standard])) })
    .spec([
      (_: any) => _.dialect.standards(Object.fromEntries(EDITIONS.map(([designation, , , symbol]) => [
        designation, (e: any) => e.standard(_[symbol])]))),
      ...EDITIONS.map(([, revision, names, symbol], i) => (_: any) => edition(i, revision, names)(_[symbol])),
    ])]))]);
}

// --- Its kinds, as the framework reads them ---

/** A spelling of flags: its letters among `allowed`, each once. */
function flagsProblems(raw: string | undefined, allowed: typeof FLAGS, what: string): string[] {
  const letters = allowed.map(([, letter]) => letter).join("");
  if (raw === undefined || ([...raw].every((c) => letters.includes(c)) && new Set(raw).size === raw.length)) return [];
  return [`${what} cannot be ${repr(raw)}`];
}

/** The letters of the flags a helper's node holds, by its booleans. */
function held(node: F.Node, allowed: typeof FLAGS): Set<string> {
  return new Set(allowed.filter(([name]) => node.attributes.get(name)).map(([, letter]) => letter));
}

/** A flags helper's problems: its spelling's letters, and that they spell the flags it holds. */
function spells(node: F.Node, allowed: typeof FLAGS, what: string): string[] {
  const raw = node.attributes.get("raw");
  const problems = flagsProblems(raw, allowed, what);
  const holds = held(node, allowed);
  if (problems.length === 0 && raw !== undefined && (raw.length !== holds.size || [...raw].some((c) => !holds.has(c)))) {
    problems.push(`${what} ${repr(raw)} do not spell the flags it holds`);
  }
  return problems;
}

function literal(node: F.Node): string[] {
  const flags = node.helpers.get("flags") as F.Node | undefined;
  if (flags === undefined) return [];
  const problems = spells(flags, FLAGS, "a regular expression's flags");
  if (flags.attributes.get("unicode") && flags.attributes.get("unicodeSets")) {
    problems.push("a regular expression's flags cannot have both u and v");
  }
  return problems;
}

/** A disjunction needs an alternative: an empty one, regexpp's `Alternative` of no elements, where it is empty. */
function alternatives(node: F.Node): string[] {
  return node.lists.get("alternatives")!.length > 0 ? [] : [`${F.article(node.kind)} needs an alternative`];
}

/** A character's code point, where a node is a character holding one. */
function codePoint(node: F.Node | undefined): bigint | undefined {
  const value = node !== undefined && node.kind === CHARACTER ? node.attributes.get("value") : undefined;
  return typeof value === "bigint" ? value : undefined;
}

function quantifier(node: F.Node): string[] {
  const low: bigint | undefined = node.attributes.get("min");
  const high: bigint | undefined = node.attributes.get("max");
  if (low === undefined) return ["a quantifier needs a min"];
  if (typeof low !== "bigint" || (high !== undefined && typeof high !== "bigint")) return []; // validation reports its type
  if (low < 0n) return [`a quantifier's min must not be negative, got ${low}`];
  return high !== undefined && high < low ? [`a quantifier's max ${high} is less than its min ${low}`] : [];
}

function range(node: F.Node): string[] {
  const ends = new Map([...node.slots].filter(([, term]) => term !== null).map(([name, term]) => [name, F.node(...F.kindOf(term))]));
  const problems = [...ends].filter(([, end]) => ![CHARACTER, "error", "missing"].includes(end.kind))
    .map(([name, end]) => `a characterclassrange's ${name} must be a character, got ${end.kind}`);
  const low = codePoint(ends.get("min"));
  const high = codePoint(ends.get("max"));
  if (low !== undefined && high !== undefined && low > high) {
    problems.push(`a characterclassrange's min ${low} is greater than its max ${high}`);
  }
  return problems;
}

function expressionClass(node: F.Node): string[] {
  const expression = node.slots.get("expression");
  const kind = expression === null ? null : F.kindOf(expression)[0];
  if (kind === null || [CLASSINTERSECTION, CLASSSUBTRACTION, "error", "missing"].includes(kind)) return [];
  return [`an expressioncharacterclass's expression must be a classintersection or a classsubtraction, got ${kind}`];
}

function characterSet(node: F.Node): string[] {
  const { attributes } = node;
  const kind = attributes.get("setKind");
  if (kind === undefined) return ["a characterset needs a setKind"];
  if (!CHARACTERSETS.includes(kind)) return [`CharacterSet.setKind cannot be ${repr(kind)}`];
  if (kind === "property") {
    if (!attributes.get("key")) return ["a property characterset needs a key"];
    return attributes.get("strings") && attributes.get("negate") ? ["a characterset of strings cannot be negated"] : [];
  }
  if (["key", "value", "strings"].some((name) => attributes.has(name))) {
    return [`${F.article(kind)} characterset has no key, value or strings`];
  }
  return kind === "any" && attributes.get("negate") ? ["an any characterset cannot be negated"] : [];
}

function character(node: F.Node): string[] {
  const value: bigint | undefined = node.attributes.get("value");
  if (value === undefined) return ["a character needs a value"];
  if (typeof value !== "bigint") return []; // validation reports its type
  return value >= 0n && value <= 0x10FFFFn ? [] : [`a character's value must be a code point, got ${value}`];
}

function assertion(node: F.Node): string[] {
  const kind = node.attributes.get("assertionKind");
  if (kind === undefined) return ["an assertion needs an assertionKind"];
  if (!ASSERTIONS.includes(kind)) return [`Assertion.assertionKind cannot be ${repr(kind)}`];
  if (kind === "lookahead" || kind === "lookbehind") return alternatives(node);
  if (node.lists.get("alternatives")!.length > 0) return [`${F.article(kind)} assertion holds no alternatives`];
  return kind !== "word" && node.attributes.get("negate") ? [`${F.article(kind)} assertion cannot be negated`] : [];
}

function backreference(node: F.Node): string[] {
  const ref = node.attributes.get("ref");
  if (ref === undefined) return ["a backreference needs a ref"];
  if ((typeof ref === "bigint" && ref >= 1n) || (typeof ref === "string" && ref !== "")) return [];
  return [`a backreference's ref must be a group's number or its name, got ${repr(ref)}`];
}

function capturingGroup(node: F.Node): string[] {
  return [...(node.attributes.get("name") === "" ? ["a capturinggroup's name cannot be empty"] : []), ...alternatives(node)];
}

function modifiers(node: F.Node): string[] {
  const add = node.helpers.get("add") as F.Node | undefined;
  const remove = node.helpers.get("remove") as F.Node | undefined;
  const problems = [add, remove].filter((h): h is F.Node => h !== undefined).flatMap((h) => spells(h, MODIFIERS, "a modifiers' flags"));
  if (problems.length > 0) return problems;
  const added = add === undefined ? new Set<string>() : held(add, MODIFIERS);
  const removed = remove === undefined ? new Set<string>() : held(remove, MODIFIERS);
  if (added.size === 0 && removed.size === 0) return ["a modifiers adds or removes a flag"];
  const both = MODIFIERS.map(([, letter]) => letter).filter((letter) => added.has(letter) && removed.has(letter)).join("");
  return both ? [`a modifiers cannot both add and remove ${repr(both)}`] : [];
}

const CHECKS: ReadonlyMap<string, (node: F.Node) => string[]> = new Map([[REGEXPLITERAL, literal],
  [PATTERN, alternatives], [GROUP, alternatives], [CAPTURINGGROUP, capturingGroup], [QUANTIFIER, quantifier],
  [CHARACTERCLASSRANGE, range], [CLASSSTRINGDISJUNCTION, alternatives], [EXPRESSIONCHARACTERCLASS, expressionClass],
  [CHARACTERSET, characterSet], [CHARACTER, character], [ASSERTION, assertion], [BACKREFERENCE, backreference],
  [MODIFIERS_, modifiers]]);

/** A kind's check, of its node, its helpers nested. */
function check(tag: string): ((record: any) => string[]) | null {
  const kindCheck = CHECKS.get(tag);
  return kindCheck === undefined ? null : (record: any) => kindCheck(F.node(tag, record));
}

function application(tag: string): F.Kind {
  return new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), optional: ["modifiers"] });
}

/** The dialects of its family, whose terms it reads, as each of them reads its (the dialects proposal, Retrofit's
 * design), read when first needed: `TypeScript5`, `TypeScript Types` and `TypeScript Patterns`. None of its kinds holds
 * their terms. */
function reads(): readonly F.Dialect[] {
  return [TypeScript5.DIALECT, TypeScriptTypes.DIALECT, TypeScriptPatterns.DIALECT];
}

/** The TypeScript RegExp dialect: its kinds, as the framework reads them, and its family's other dialects' terms. */
export const DIALECT = new F.Dialect("TypeScript.RegExp", Object.fromEntries(TAGS.map((tag) => [tag, application(tag)])),
  { domain_of: Family.of, reads });
