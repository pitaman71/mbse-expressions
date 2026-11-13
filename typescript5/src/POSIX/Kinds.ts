/**
 * The POSIX family's shared reading of its kinds: what `POSIX BRE` and `POSIX ERE` share, each dialect defining its own
 * copy of the kinds both have (as C and C++ do), written once here for both. Internal: each dialect's module
 * (`POSIX/BRE/Expressions`, `POSIX/ERE/Expressions`) gives its own `install`, `define`, `TAGS`, `HOLDS` and `DIALECT`
 * from it, and its `Text` its printer.
 *
 * POSIX (IEEE Std 1003.1, The Open Group Base Specifications; ISO/IEC/IEEE 9945) defines two regular expression
 * grammars, in its Base Definitions, chapter 9 (XBD 9): basic regular expressions (9.3, BREs) and extended ones (9.4,
 * EREs), each with its own start symbol in its grammar (9.5.2, `basic_reg_exp`; 9.5.3, `extended_reg_exp`), sharing the
 * bracket expression's (9.5.2). Its utilities read one or the other, and define no grammar of their own: grep its
 * patterns as BREs, or as EREs with `-E` (XCU grep), a newline-separated list of them (its `pattern_list`); awk EREs,
 * "except that it shall allow the use of C-language conventions for escaping special characters" (XCU awk, Regular
 * Expressions), which changes how a character is spelled, not the grammar. So the two grammars are the family's
 * dialects *(agent)* (the dialects proposal, Decided for stage 6: "if the standard says it's a sublanguage then it's
 * definitely at least a separate dialect"), grep's list of patterns a kind of each, `patternlist`, and awk's escapes a
 * way of printing an ERE's characters (`Text`'s `awk`).
 *
 * Each kind is named as regexpp names ECMAScript's construct (as `TypeScript RegExp`'s and `Cpp RegExp`'s are, each
 * family its own copy), and as [re.grammar] names the class atoms POSIX's bracket expressions share with it; tags
 * lowercased:
 *
 * - `patternlist`, grep's newline-separated list of patterns (XCU grep, `pattern_list`), its `patterns`;
 * - `pattern` (`basic_reg_exp`, `extended_reg_exp`), its `alternatives`, and `alternative` (`BRE_branch`, before
 *   POSIX.1-2024 `RE_expression`; `ERE_branch`), its `elements`;
 * - `capturinggroup`, a subexpression, an ERE's `(...)`, a BRE's `\(...\)`, its `alternatives`;
 * - `quantifier`: its `raw`, as written (`\{2,\}`, `{0,}`), printed where it has one, its `min`, its `max` (absent: no
 *   bound), and its `element`; an ERE's also whether it is `greedy` (absent: it is; POSIX.1-2024's repetition modifier,
 *   `*?`, makes it not);
 * - `characterclass`, a bracket expression (`[^...]`): whether it is `negate`d, and its `elements`; and
 *   `characterclassrange` (`a-z`), its `min` and `max`, each a character or a collating element;
 * - `characterset`: its `setKind`, `any` (`.`), the one a BRE and an ERE have;
 * - `character`: its `raw`, as written (`\.`), printed where it has one, and its `value`, a code point;
 * - `assertion`: its `assertionKind`, `start` (`^`) or `end` (`$`);
 * - a BRE's `backreference` (`\1` to `\9`, `BACKREF`), its `ref`, which an ERE has not;
 * - the class atoms, each its `name`: `exclass` (`[:alpha:]`, `character_class`), `collatingelement` (`[.ch.]`,
 *   `collating_symbol`) and `equivalence` (`[=a=]`, `equivalence_class`);
 *
 * then the framework's kinds of invalid syntax, `error` and `missing`. No helpers. What a kind's terms may be is checked
 * (`holds`), as the grammar has it: a BRE's quantifier repeats no quantifier and no anchor (`nondupl_BRE
 * BRE_dupl_symbol`), an ERE's may (`ERE_expression ERE_dupl_symbol`); a BRE's anchor stands only where a BRE begins or
 * ends (`L_ANCHOR`, `R_ANCHOR`, 9.3.8), an ERE's anywhere. What POSIX.1-2024 added within a kind, a BRE's alternation
 * (`\|`), `\?` and `\+`, which it leaves to the implementation, and an ERE's repetition modifier, is not recorded, as
 * a feature within a kind is not for any dialect; C++, which cites earlier editions, checks it under a `regex`
 * (`Cpp/RegExp`'s `FEATURES`).
 *
 * No kind binds a name a term scopes: a subexpression is numbered, and a backreference resolves it by its number. Its
 * kinds are applications of no domain known statically, each refused by evaluation by its dialect's name ("POSIX BRE
 * pattern is not evaluated"). The editions each covers are data, which `define` writes: POSIX.1's, IEEE Std 1003.1-2001,
 * -2008, -2017 and -2024, every kind in each (`SINCE`).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Repr } from "@mbse/schemas/Framework";
import * as FD from "../Framework/Domains.js";
import * as F from "../Framework/Terms.js";

const { repr } = Repr;

export const BRE = "BRE", ERE = "ERE";

export const PATTERNLIST = "patternlist", PATTERN = "pattern", ALTERNATIVE = "alternative",
  CAPTURINGGROUP = "capturinggroup", QUANTIFIER = "quantifier", CHARACTERCLASS = "characterclass",
  CHARACTERCLASSRANGE = "characterclassrange", CHARACTERSET = "characterset", CHARACTER = "character",
  ASSERTION = "assertion", BACKREFERENCE = "backreference", EXCLASS = "exclass", COLLATINGELEMENT = "collatingelement",
  EQUIVALENCE = "equivalence";

const NAMES = ["PatternList", "Pattern", "Alternative", "CapturingGroup", "Quantifier", "CharacterClass",
  "CharacterClassRange", "CharacterSet", "Character", "Assertion", "Backreference", "ExClass", "CollatingElement",
  "Equivalence"];

/** A characterset's kinds: `.`, the one a BRE and an ERE have. */
export const SETS: readonly string[] = ["any"];

/** An assertion's kinds: `^` and `$`. */
export const ASSERTIONS: readonly string[] = ["start", "end"];

const CLASS_ATOMS = [CHARACTERCLASSRANGE, CHARACTER, EXCLASS, COLLATINGELEMENT, EQUIVALENCE];
const ENDS = [CHARACTER, COLLATINGELEMENT];

/** POSIX.1's editions, each by IEEE's designation, its year, its common names (the ISO/IEC designation C++ cites,
 * [intro.refs], among them: ISO/IEC 9945:2003 in C++17 and C++20, ISO/IEC/IEEE 9945:2009 in C++23) and its frame symbol
 * *(agent)*; an edition that incorporates technical corrigenda (2004, 2013, 2016) is not one of its own. */
export const EDITIONS: readonly (readonly [string, bigint, readonly string[], string])[] = [
  ["IEEE Std 1003.1-2001", 2001n, ["POSIX.1-2001", "ISO/IEC 9945:2003"], "POSIX_2001"],
  ["IEEE Std 1003.1-2008", 2008n, ["POSIX.1-2008", "ISO/IEC/IEEE 9945:2009"], "POSIX_2008"],
  ["IEEE Std 1003.1-2017", 2017n, ["POSIX.1-2017"], "POSIX_2017"],
  ["IEEE Std 1003.1-2024", 2024n, ["POSIX.1-2024"], "POSIX_2024"],
];

/** A dialect's kinds' schema names, in its `Term`'s order: an ERE's without `Backreference`. */
export function names(which: string): readonly string[] {
  return which === BRE ? NAMES : NAMES.filter((name) => name !== "Backreference");
}

/** A dialect's own kinds' tags, in its `Term`'s order, before invalid syntax. */
export function tags(which: string): readonly string[] {
  return names(which).map((name) => name.toLowerCase());
}

/** What each kind's terms may be, by property, besides invalid syntax: XBD 9.5's structure, which the schema, every
 * property holding its `Term`, leaves to validation (the dialects proposal, Decided, 4). */
export function holds(which: string): ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> {
  const atoms = [CAPTURINGGROUP, QUANTIFIER, CHARACTERCLASS, CHARACTERSET, CHARACTER, ASSERTION,
    ...(which === BRE ? [BACKREFERENCE] : [])];
  const repeated = which === BRE ? [CAPTURINGGROUP, CHARACTERCLASS, CHARACTERSET, CHARACTER, BACKREFERENCE] : atoms;
  return new Map([
    [PATTERNLIST, new Map([["patterns", [PATTERN]]])],
    [PATTERN, new Map([["alternatives", [ALTERNATIVE]]])],
    [ALTERNATIVE, new Map([["elements", atoms]])],
    [CAPTURINGGROUP, new Map([["alternatives", [ALTERNATIVE]]])],
    [QUANTIFIER, new Map([["element", repeated]])],
    [CHARACTERCLASS, new Map([["elements", CLASS_ATOMS]])],
    [CHARACTERCLASSRANGE, new Map([["min", ENDS], ["max", ENDS]])],
  ]);
}

/** The terms a kind's property `name` holds: a subterm's, where it is not empty, or a container's. */
function held(node: F.Node, name: string): readonly any[] {
  if (node.subterms.has(name)) return (node.subterms.get(name) ?? null) === null ? [] : [node.subterms.get(name)];
  return node.lists.get(name) as readonly any[];
}

/** An element's assertion kind, where it is an anchor. */
function anchorOf(term: any): string | undefined {
  return F.node(...F.kindOf(term)).attributes.get("assertionKind");
}

/** A node's checks: what its terms may be (`holds`), its attributes' values, and, in a BRE, where an anchor stands. */
export function problems(which: string, node: F.Node): string[] {
  const found: string[] = [];
  const [kind, attributes] = [node.kind, node.attributes];
  for (const [name, allowed] of holds(which).get(kind) ?? new Map<string, readonly string[]>()) {
    for (const term of held(node, name)) {
      const tag = F.kindOf(term)[0];
      if (!allowed.includes(tag) && !F.INVALID_KINDS.has(tag)) {
        found.push(`${F.article(kind)}'s ${name} cannot hold ${F.article(tag)}`);
      }
    }
  }
  if (which === BRE && kind === ALTERNATIVE) { // `^` where a BRE begins, `$` where it ends (L_ANCHOR, R_ANCHOR)
    const elements = node.lists.get("elements") as readonly any[];
    elements.forEach((element, i) => {
      const anchor = anchorOf(element);
      if (anchor === "start" && i !== 0 || anchor === "end" && i !== elements.length - 1) {
        found.push(`${F.article(anchor as string)} assertion stands only where a BRE ${anchor === "start" ? "begins" : "ends"}`);
      }
    });
  } else if (which === BRE && kind === CAPTURINGGROUP) { // 9.3.8: within `\(...\)`, an anchor is the implementation's
    if ((node.lists.get("alternatives") as readonly any[]).some((alternative) => F.kindOf(alternative)[0] === ALTERNATIVE
      && (F.node(...F.kindOf(alternative)).lists.get("elements") as readonly any[]).some((element) => anchorOf(element) !== undefined))) {
      found.push("a BRE's subexpression holds no anchor");
    }
  } else if (kind === QUANTIFIER) {
    const [least, most] = [attributes.get("min"), attributes.get("max")];
    if (typeof least === "bigint" && least < 0n) found.push(`a quantifier's min cannot be negative, got ${least}`);
    if (typeof least === "bigint" && typeof most === "bigint" && most < least) {
      found.push(`a quantifier's max cannot be less than its min, got ${most} and ${least}`);
    }
  } else if (kind === CHARACTERSET && attributes.has("setKind") && !SETS.includes(attributes.get("setKind"))) {
    found.push(`CharacterSet.setKind cannot be ${repr(attributes.get("setKind"))}`);
  } else if (kind === CHARACTER && typeof attributes.get("value") === "bigint"
    && !(attributes.get("value") >= 0n && attributes.get("value") <= 0x10FFFFn)) {
    found.push(`a character's value must be a code point, got ${attributes.get("value") as bigint}`);
  } else if (kind === ASSERTION && attributes.has("assertionKind") && !ASSERTIONS.includes(attributes.get("assertionKind"))) {
    found.push(`Assertion.assertionKind cannot be ${repr(attributes.get("assertionKind"))}`);
  } else if (kind === BACKREFERENCE && typeof attributes.get("ref") === "bigint"
    && !(attributes.get("ref") >= 1n && attributes.get("ref") <= 9n)) {
    found.push(`a backreference's ref must be 1 to 9, got ${attributes.get("ref") as bigint}`);
  } else if ([EXCLASS, COLLATINGELEMENT, EQUIVALENCE].includes(kind) && typeof attributes.get("name") === "string") {
    found.push(...[...".=:"].filter((c) => (attributes.get("name") as string).includes(c))
      .map((c) => `${F.article(kind)}'s name cannot hold ${repr(c)}`).slice(0, 1));
  }
  return found;
}

const REQUIRED: ReadonlyMap<string, readonly string[]> = new Map([
  [QUANTIFIER, ["min"]], [CHARACTERSET, ["setKind"]], [CHARACTER, ["value"]], [ASSERTION, ["assertionKind"]],
  [BACKREFERENCE, ["ref"]], [EXCLASS, ["name"]], [COLLATINGELEMENT, ["name"]], [EQUIVALENCE, ["name"]],
]);

/** How the framework reads a dialect's kinds: applications, of no domain known statically (`Opaque`). */
export function kinds(which: string): Record<string, F.Kind> {
  return Object.fromEntries(tags(which).map((tag) => [tag, new F.Kind(F.APPLICATION, {
    signature: new FD.Opaque(), check: (record: any) => problems(which, F.node(tag, record)),
    required: REQUIRED.get(tag) ?? [] })]));
}

/**
 * A dialect's union of its kinds, added to the framework's terms as its branch (`posix_bre`, `posix_ere`), its own
 * kinds, and its dialect's schema, whose singleton is `Expressions.POSIX.<which>`; its holder,
 * `Expressions.POSIX.<which>.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`.
 */
export function install(which: string, txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const [path, tag, own] = [`Expressions.POSIX.${which}`, `posix_${which.toLowerCase()}`, names(which)];
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  const shape = (_: any, name: string): Record<string, any> => ({
    PatternList: { patterns: many(_.Term) }, Pattern: { alternatives: many(_.Term) },
    Alternative: { elements: many(_.Term) }, CapturingGroup: { alternatives: many(_.Term) },
    Quantifier: { raw: S.OfStr, min: S.OfInt, max: S.OfInt, ...(which === ERE ? { greedy: S.OfBool } : {}), element: _.Term },
    CharacterClass: { negate: S.OfBool, elements: many(_.Term) }, CharacterClassRange: { min: _.Term, max: _.Term },
    CharacterSet: { setKind: S.OfStr }, Character: { raw: S.OfStr, value: S.OfInt },
    Assertion: { assertionKind: S.OfStr }, Backreference: { ref: S.OfInt }, ExClass: { name: S.OfStr },
    CollatingElement: { name: S.OfStr }, Equivalence: { name: S.OfStr },
  } as Record<string, Record<string, any>>)[name] as Record<string, any>;
  return txn.uid(`mbse.Expressions.POSIX.${which}/1`).mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject, ...Object.fromEntries(own.map((name) => [name, S.OfObject]))
    })
    .spec([
      // its dialect: its singleton, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name(`${path}.Dialect`).ref(true).singleton(path).adjacencies({
          domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
          operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
          standards: (a: any) => a.relation([Framework.Covers]).me("dialect")}),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
          (t: any) => t.name(tag).schema([_.Dialect])]),
      // its union of its kinds, and invalid syntax
      (_: any) => _.Term.name(`${path}.Term`).branches([
          ...own.map((name) => (t: any) => t.name(name.toLowerCase()).schema([_[name]])),
          (t: any) => t.name("error").schema([Framework.Error]),
          (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its kinds, each a value object holding its own terms
      ...own.map((name) => (_: any) => _[name].name(`${path}.${name}`).properties(shape(_, name))),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
      // narrowed to its `Term`
      (_: any) => _.Expression.name(`${path}.Expression`).ref(true).refines([Framework.Expression]).properties({
          root: _.Term}),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
          (t: any) => t.name(tag).schema([_.Term])]),
    ])]))]);
}

/**
 * A dialect as data: its singleton owning the editions it covers, by designation (`standards`), POSIX.1's, each with its
 * formal reference's parts, its common names and its own kinds it has (every kind in each). Its frame binds the dialect
 * (`dialect`) and each edition by its frame symbol (`POSIX_2008`).
 */
export function define(which: string, txn: any): any {
  const [OWN, Standard] = [txn.Expressions.POSIX[which], txn.Expressions.Framework.Standard];
  const own = tags(which);
  const every = (OWN.Term.as_schema().branches as readonly any[]).filter((branch) => own.includes(branch.name))
    .map((branch) => branch.schema);
  return txn.uid(`mbse.Expressions.POSIX.${which}.define/1`).mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, ...Object.fromEntries(EDITIONS.map(([, , , symbol]) => [symbol, Standard])) })
    .spec([
      (_: any) => _.dialect.standards(Object.fromEntries(EDITIONS.map(([designation, , , symbol]) =>
        [designation, (e: any) => e.standard(_[symbol])]))),
      ...EDITIONS.map(([, year, common, symbol]) => (_: any) => _[symbol].bodies(["org.ieee"]).number("1003.1").revision(
        (r: any) => r.year(year)).names([...common]).kinds(every)),
    ])]))]);
}

/** The characters each grammar's text escapes outside a bracket expression, its special characters (XBD 9.3.3,
 * 9.4.3); none within one, which has no escapes. */
const SPECIAL: ReadonlyMap<string, string> = new Map([[BRE, "^.[$*\\"], [ERE, "^.[$()|*+?{\\"]]);

const AWK: ReadonlyMap<number, string> = new Map([[0x09, "t"], [0x0A, "n"], [0x0B, "v"], [0x0C, "f"], [0x0D, "r"],
  [0x07, "a"], [0x08, "b"]]);

/** Writes a term's source in a grammar, from its `Node`: a BRE's or an ERE's, an ERE's characters with awk's escapes
 * where `awk` is given. */
export class Printer {
  constructor(readonly dialect: F.Dialect, readonly which: string, readonly awk = false) {}

  term(value: any, within = false): string {
    const [tag, record] = this.dialect.kind(value);
    if (F.INVALID_KINDS.has(tag)) return F.invalidTermText(this.dialect, value);
    const owner = this.dialect.owner(value);
    if (owner !== this.dialect) { // a term of the family's other dialect, written in its own grammar
      return new Printer(owner, this.which === BRE ? ERE : BRE).term(value, within);
    }
    return (this as any)[tag](F.node(tag, record), within);
  }

  alternatives(node: F.Node): string {
    return (node.lists.get("alternatives") as readonly any[]).map((alternative) => this.term(alternative))
      .join(this.which === BRE ? "\\|" : "|");
  }

  patternlist(node: F.Node): string {
    return node.many.map((pattern) => this.term(pattern)).join("\n");
  }

  pattern(node: F.Node): string {
    return this.alternatives(node);
  }

  alternative(node: F.Node): string {
    return node.many.map((element) => this.term(element)).join("");
  }

  capturinggroup(node: F.Node): string {
    return this.which === BRE ? `\\(${this.alternatives(node)}\\)` : `(${this.alternatives(node)})`;
  }

  quantifier(node: F.Node): string {
    const element = this.term(node.subterms.get("element"));
    if (node.attributes.has("raw")) return element + (node.attributes.get("raw") as string);
    const [least, most] = [node.attributes.get("min") as bigint, node.attributes.get("max") as bigint | undefined];
    let shorthand = most === undefined ? (least === 0n ? "*" : least === 1n ? "+" : null)
      : least === 0n && most === 1n ? "?" : null;
    if (shorthand === "?" && F.kindOf(node.subterms.get("element"))[0] === QUANTIFIER) { // `a+?` is POSIX.1-2024's lazy `+`
      shorthand = null;
    }
    let written: string;
    if (shorthand !== null && (shorthand === "*" || this.which === ERE)) {
      written = shorthand;
    } else {
      const bounds = most === least ? `${least}` : `${least},` + (most === undefined ? "" : `${most}`);
      written = this.which === BRE ? `\\{${bounds}\\}` : `{${bounds}}`;
    }
    return element + written + (node.attributes.get("greedy") === false ? "?" : "");
  }

  characterclass(node: F.Node): string {
    const negate = node.attributes.get("negate") === true ? "^" : "";
    return `[${negate}${node.many.map((element) => this.term(element, true)).join("")}]`;
  }

  characterclassrange(node: F.Node): string {
    return `${this.term(node.subterms.get("min"), true)}-${this.term(node.subterms.get("max"), true)}`;
  }

  characterset(): string {
    return ".";
  }

  character(node: F.Node, within: boolean): string {
    if (node.attributes.has("raw")) return node.attributes.get("raw") as string;
    const code = Number(node.attributes.get("value") as bigint);
    const c = String.fromCodePoint(code);
    if (this.awk && AWK.has(code)) return "\\" + (AWK.get(code) as string);
    if (this.awk && (code < 0x20 || code === 0x7F)) return "\\" + code.toString(8).padStart(3, "0");
    return within || !(SPECIAL.get(this.which) as string).includes(c) ? c : "\\" + c; // no escapes within brackets
  }

  assertion(node: F.Node): string {
    return node.attributes.get("assertionKind") === "start" ? "^" : "$";
  }

  backreference(node: F.Node): string {
    return `\\${node.attributes.get("ref") as bigint}`;
  }

  exclass(node: F.Node): string {
    return `[:${node.attributes.get("name") as string}:]`;
  }

  collatingelement(node: F.Node): string {
    return `[.${node.attributes.get("name") as string}.]`;
  }

  equivalence(node: F.Node): string {
    return `[=${node.attributes.get("name") as string}=]`;
  }
}
