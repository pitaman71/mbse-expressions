/**
 * Standards: the editions of the standards each dialect covers, as data, and the kinds each has.
 *
 * A dialect owns each edition it covers by its designation, as its standards body writes it (`ISO/IEC 9899:2011`,
 * `IEEE Std 754-2019`), through `Expressions.Framework.Covers`; an edition is an `Expressions.Framework.Standard`,
 * holding its formal reference's parts (its `bodies` by reverse-domain name, one or a joint pair; its `number`; its
 * `revision`, a year, an edition or a version) and its common `names` (`C11`), so that a reference of either kind finds
 * it (mbse-basis [CAP-268: standards as tagged data](mbse:mbse-basis/docs/capabilities/CAP-268.md#decided), "Standards as tags", Q10: "If we treat standards as tags, we could support both"). Each kind's schema
 * records the editions that have it (`Expressions.Framework.HasStandard`); a kind none has is an extension, or invalid
 * syntax. See mbse-basis [CAP-268: standards as tagged data](mbse:mbse-basis/docs/capabilities/CAP-268.md).
 *
 * The reading interface, over a dialect's or an edition's `Readers.OfObject`, found by its path
 * (`dialect.standards({ designation: "ISO/IEC 9899:2011" })`):
 *
 * - `standards(dialect)`: a dialect's editions by designation, in the order the store holds the entries.
 * - `designationOf(standard)`: the designation its dialect covers it by, or null.
 * - `tags(standard)`: its designation, then its common names: the references it is found by.
 * - `find(dialect, tag)`: the edition a dialect covers whose designation or common name is `tag`, or null.
 * - `properties(standard)`: its formal reference's parts and its common names that are set, by name: a container as an
 *   array, its `revision` as its branch and its value (`["year", 2011n]`).
 * - `kinds(standard)`: the schemas of the kinds it has, in the order the store holds the entries; `of(dialect, kind)`:
 *   the editions a dialect covers that have a kind, given its schema, by designation. A kind's schema reads the same
 *   entries from its side, through its extension adjacency `standards`. Each `HasStandard` entry has the optional
 *   flags `before` and `after`, as a grammar clause's `Allows` and `Forbids` entries have them, as the user decided
 *   (mbse-basis [grammar clauses by version](mbse:mbse-basis/proposals/GRAMMAR-CLAUSES.md), "Decided in stage 3", 1
 *   (b)): an entry of a standard's oldest edition a dialect covers is flagged `before`, and one of its newest `after`,
 *   extending the kind's membership to the editions before or after it that the data does not represent.
 * - `editionHas(dialect, designation, revision, kind)`: whether an edition given by its designation and its revision
 *   has a kind, whether the dialect covers it or not: one it does not cover is guessed from its neighbours' flagged
 *   `HasStandard` entries of the kind.
 *
 * What changes from one edition to the next within a kind is data too: a grammar clause, an alternative within a
 * production of the dialect's grammar, a language feature (mbse-basis [grammar clauses by
 * version](mbse:mbse-basis/proposals/GRAMMAR-CLAUSES.md), "No minimum versions": "PEP 614 removing a restriction is
 * still a conditional clause just with an opposite sense of version progression"). A dialect owns each by name
 * (`Expressions.Framework.Specifies`); an `Expressions.Framework.GrammarClause` is a kind
 * (`Expressions.Framework.HasGrammarClause`, which the kind's schema reads through its extension adjacency
 * `grammar_clauses`), one of its properties, and what that property may hold there: present or absent (`present`), one
 * of these values (`values`), or a term of one of these kinds (`Expressions.Framework.Holds`), each kind's term holding
 * what any of the nested grammar clauses of that kind says (`Expressions.Framework.Nests`); of a container, what `any`
 * of its elements holds, `every` one or `none` (`quantifier`), at least `at_least` of them; and taken only where the
 * grammar clauses it requires are taken too, on the same term (`Expressions.Framework.Requires`), as the user decided
 * of these forms: "2. that's fine". An edition allows or forbids it
 * (`Expressions.Framework.Allows`, `Expressions.Framework.Forbids`), each entry with the optional flags `before` and
 * `after`, as the user decided: "Add two optional properties on `Allows` and `Forbids` : 'before' and 'after' which are
 * only used by the system to guess support in the case that an edition has no representation. And a grammar clause that
 * has no `Allows` or `Forbids` should default to allows." The reading:
 *
 * - `grammarClauses(dialect)`: a dialect's grammar clauses by name, in the order the store holds the entries;
 *   `grammarClauseName(clause)`: the name its dialect owns it by, or null.
 * - `grammarClause(clause)`: what it says, by name: its `kind`'s schema, its `property`, and what it holds, `present`
 *   (a boolean), `values` (an array) or `kinds` (their schemas, an array), its `quantifier` and `at_least` where they
 *   are set, and its `nested` grammar clauses and those it `requires` where it has any.
 * - `takes(dialect, term)`: the grammar clauses of a dialect that a term, or a helper, takes, in the order of
 *   `grammarClauses(dialect)`, each with the indices of the elements of its property that took it, or null where the
 *   property as a whole did: those of its kind whose property holds what they say, a container where `any` of its
 *   elements does (the default; `every` one, or `none`, as its quantifier says), at least `at_least` of them, a term of
 *   one of their kinds where it takes any of their nested grammar clauses of its kind ("The "open universe" design
 *   philosophy is interpreted by unions as "any"."), and each only where those it `requires` are taken too.
 * - `allows(standard, clause)`: whether a stored edition allows a grammar clause: by its own `Allows` or `Forbids` of
 *   it; where it has neither, the data not representing it, by those of its neighbours, the nearest editions before
 *   and after it by revision that have one, of its standard's number, an `after` entry's before it and a `before`
 *   entry's after it, where they agree *(agent)*; otherwise allowed. `editionAllows(dialect, designation, revision,
 *   clause)`: the same of an edition given by its designation and its revision, whether the dialect covers it or not.
 *
 * A dialect's `define` writes its grammar clauses from a table, each a `GrammarClause` made by `present`, `absent`,
 * `values` or `kindsOf`, with the editions that allow it, and given its further forms by `every`, `none`, `atLeast` and
 * `requires`, and, where it records what an edition before the data removed, by `removed`: `grammarClausesSpec(txn,
 * dialect, clauses, schemas, editions)` gives the symbols and the specs that write them in its frame, beside its
 * editions, its dialect bound by the symbol `dialect`, each entry flagged by what is true beyond it; and
 * `editionsSpec(editions, kinds)` the specs writing the kinds each edition has, each entry flagged by what is true
 * beyond it.
 */

import { Schemas } from "@mbse/schemas/Framework";
import type { Readers } from "@mbse/schemas/Framework";

import * as Objects from "./Objects.js";
import * as Terms from "./Terms.js";

/** A dialect's editions by designation (`Expressions.Framework.Covers`), each its `Expressions.Framework.Standard`, in
 * the order the store holds the entries: as its `define` wrote them, or, read back from a snapshot, by designation, as
 * mbse-schemas writes a relation's entries sorted by its key. */
export function standards(dialect: Readers.OfObject): Map<string, Readers.OfObject> {
  return new Map(Objects.entries(dialect, "standards").map(
    (entry) => [entry.values.get("designation") as string, entry.targets.get("standard") as Readers.OfObject]));
}

/** The designation a stored edition's dialect covers it by, its `Expressions.Framework.Covers` entry's; null where no
 * dialect covers it. */
export function designationOf(standard: Readers.OfObject): string | null {
  const [entry] = Objects.entries(standard, "dialect");
  return entry === undefined ? null : entry.values.get("designation") as string;
}

function names(standard: Readers.OfObject): readonly string[] {
  const held = Objects.properties(standard).get("names") as Objects.Listed | undefined;
  return held === undefined ? [] : held.values as readonly string[];
}

/** The references a stored edition is found by: its designation, where a dialect covers it, then its common names. */
export function tags(standard: Readers.OfObject): string[] {
  const designation = designationOf(standard);
  return [...(designation === null ? [] : [designation]), ...names(standard)];
}

/** The edition a dialect covers whose designation or common name is `tag`; null where none is. */
export function find(dialect: Readers.OfObject, tag: string): Readers.OfObject | null {
  for (const [designation, standard] of standards(dialect)) {
    if (tag === designation || names(standard).includes(tag)) return standard;
  }
  return null;
}

/** A stored edition's properties that are set, by name, in its schema's order: its `bodies` and `names` as arrays, its
 * `number` as itself, and its `revision` as its branch and its value (`["year", 2011n]`). */
export function properties(standard: Readers.OfObject): Map<string, unknown> {
  const found = new Map<string, unknown>();
  for (const [name, value] of Objects.properties(standard)) {
    found.set(name, value instanceof Objects.Listed ? [...value.values]
      : name === "revision" ? [...Objects.properties(value)][0] : value);
  }
  return found;
}

/** The schemas of the kinds a stored edition has (`Expressions.Framework.HasStandard`), in the order the store holds
 * the entries. */
export function kinds(standard: Readers.OfObject): unknown[] {
  return Objects.entries(standard, "kinds").map((entry) => entry.targets.get("kind"));
}

/** The editions a dialect covers that have a kind, given its schema, by designation, in the order of
 * `standards(dialect)`. */
export function of(dialect: Readers.OfObject, kind: unknown): Map<string, Readers.OfObject> {
  return new Map([...standards(dialect)].filter(([, standard]) => kinds(standard).some((held) => held === kind)));
}

/** A dialect's grammar clauses by name (`Expressions.Framework.Specifies`), each its
 * `Expressions.Framework.GrammarClause`, in the order the store holds the entries. */
export function grammarClauses(dialect: Readers.OfObject): Map<string, Readers.OfObject> {
  return new Map(Objects.entries(dialect, "grammar_clauses").map(
    (entry) => [entry.values.get("name") as string, entry.targets.get("clause") as Readers.OfObject]));
}

/** The name a stored grammar clause's dialect owns it by, its `Expressions.Framework.Specifies` entry's; null where no
 * dialect owns it. */
export function grammarClauseName(clause: Readers.OfObject): string | null {
  const [entry] = Objects.entries(clause, "dialect");
  return entry === undefined ? null : entry.values.get("name") as string;
}

function kindOf(clause: Readers.OfObject): unknown {
  const [entry] = Objects.entries(clause, "kind");
  return entry === undefined ? null : entry.targets.get("kind");
}

function nestedOf(clause: Readers.OfObject): Readers.OfObject[] {
  return Objects.entries(clause, "nested").map((entry) => entry.targets.get("nested") as Readers.OfObject);
}

function requiresOf(clause: Readers.OfObject): Readers.OfObject[] {
  return Objects.entries(clause, "requires").map((entry) => entry.targets.get("required") as Readers.OfObject);
}

/** What a grammar clause's property may hold: `["values", [...]]`, `["present", boolean]` or `["kinds", [...]]`. */
function holds(clause: Readers.OfObject): [string, unknown] {
  const found = Objects.properties(clause);
  if (found.has("values")) return ["values", [...(found.get("values") as Objects.Listed).values]];
  if (found.has("present")) return ["present", found.get("present")];
  return ["kinds", Objects.entries(clause, "kinds").map((entry) => entry.targets.get("kind"))];
}

/** What a stored grammar clause says, by name: its `kind`, its kind's schema; its `property`; what that property may
 * hold, `present` (a boolean), `values` (an array) or `kinds` (their schemas, an array); its `quantifier` (`every` or
 * `none`) and its count, `at_least`, where they are set; and its `nested` grammar clauses and those it `requires`, each
 * an array, where it has any. */
export function grammarClause(clause: Readers.OfObject): Map<string, unknown> {
  const [held, value] = holds(clause);
  const found = Objects.properties(clause);
  const nested = nestedOf(clause), required = requiresOf(clause);
  const said = new Map<string, unknown>([["kind", kindOf(clause)], ["property", found.get("property")], [held, value]]);
  for (const name of ["quantifier", "at_least"]) if (found.has(name)) said.set(name, found.get(name));
  if (nested.length > 0) said.set("nested", nested);
  if (required.length > 0) said.set("requires", required);
  return said;
}

/** The record of a term, or of a helper: its kind's branch's, through a union of helpers. */
function recordOf(value: any): any {
  if (Terms.isTerm(value)) return Terms.kindOf(value)[1];
  while (!(value.as_schema() instanceof Schemas.OfObject.Data)) [value] = Objects.properties(value).values();
  return value;
}

/** Whether one element a grammar clause's property holds (a scalar property's value) is what it says one is: set, one
 * of its values, or a term of one of its kinds that takes any of its nested grammar clauses of that kind, or is of a
 * kind none is of (mbse-basis [PRI-020: no constraint, any
 * configuration](mbse:mbse-basis/docs/principles/PRI-020.md#decided): "The "open universe" design philosophy is
 * interpreted by unions as "any"."). */
function hits(clause: Readers.OfObject, element: unknown, held: string, given: unknown): boolean {
  if (held === "present") return true;
  if (held === "values") return (given as unknown[]).some((one) => element === one);
  const inner = recordOf(element);
  const schema = inner.as_schema();
  const alternatives = nestedOf(clause).filter((each) => kindOf(each) === schema);
  return (given as unknown[]).some((kind) => kind === schema)
    && (alternatives.length === 0 || alternatives.some((each) => taken(each, inner) !== null));
}

/** Whether a term's or a helper's record, of the grammar clause's kind, takes it: null where it does not; where it does,
 * the indices of the elements of its property that hold what it says, where that property is a container and it says
 * what an element holds (`values` or `kinds`, of `any` or `every` element), else true. */
function taken(clause: Readers.OfObject, record: any): number[] | true | null {
  const found = Objects.properties(clause);
  const value = Objects.properties(record).get(found.get("property") as string);
  const listed = value instanceof Objects.Listed;
  const elements = value === undefined ? [] : listed ? value.values : [value];
  const [held, given] = holds(clause);
  const hit = elements.flatMap((element, index) => hits(clause, element, held, given) ? [index] : []);
  const quantifier = found.get("quantifier") ?? "any";
  const least = Number(found.get("at_least") ?? 1);
  const ok = held === "present" && given === false ? elements.length === 0
    : quantifier === "none" ? hit.length === 0
    : hit.length >= least && (quantifier !== "every" || hit.length === elements.length);
  const schema = record.as_schema();
  if (!ok || !requiresOf(clause).every((each) => kindOf(each) === schema && taken(each, record) !== null)) return null;
  return listed && held !== "present" && quantifier !== "none" ? hit : true;
}

/** The grammar clauses of a dialect that a term or a helper takes, in the order of `grammarClauses(dialect)`, each with
 * the elements that took it: those of its kind whose property holds what they say. A property that is a container
 * holds what `any` of its elements does (or `every` one, or `none`, as its `quantifier` says), at least `at_least` of
 * them; a term held is of one of a grammar clause's kinds where it takes any of its nested grammar clauses of that
 * kind, or none is of its kind; and a grammar clause is taken only where those it `requires` are taken too. Each comes
 * with the indices of the elements of its property that took it, where that property is a container and it says what
 * an element holds (`values` or `kinds`, of `any` or `every` element); else null, the property as a whole taking it
 * (set or unset, a scalar, a count of it, or `none` of its elements). The grammar clauses taken are each pair's first.
 * Nothing within the term is read but what its grammar clauses' properties hold: a caller walks the tree. */
export function takes(dialect: Readers.OfObject, term: unknown): [Readers.OfObject, number[] | null][] {
  const record = recordOf(term);
  const schema = record.as_schema();
  return [...grammarClauses(dialect).values()].flatMap((clause) => {
    const elements = kindOf(clause) === schema ? taken(clause, record) : null;
    return elements === null ? [] : [[clause, elements === true ? null : elements] as [Readers.OfObject, number[] | null]];
  });
}

/** An edition that names a grammar clause, whether it allows it, and its entry's flags. */
type Verdict = [Readers.OfObject, boolean, ReadonlyMap<string, unknown>];

/** Each edition that names a grammar clause, whether it allows it, and its entry's flags. */
function verdicts(clause: Readers.OfObject): Verdict[] {
  return ([["allowed", true], ["forbidden", false]] as const).flatMap(([adjacency, allowed]) =>
    Objects.entries(clause, adjacency).map((entry) =>
      [entry.targets.get("standard") as Readers.OfObject, allowed, entry.values] as Verdict));
}

/** Where an edition stands among its standard's editions, given its number and its revision: its number and its
 * revision's branch, then its value, a version by its dotted numbers. */
function at(number: unknown, [branch, value]: readonly [string, unknown]): [string, number[]] {
  return [`${number ?? ""}/${branch}`, branch === "version" ? (value as string).split(".").map(Number) : [Number(value)]];
}

/** Where a stored edition stands among its standard's editions (`at`); null where it has no revision. */
function order(standard: Readers.OfObject): [string, number[]] | null {
  const found = properties(standard);
  const revision = found.get("revision") as [string, unknown] | undefined;
  return revision === undefined ? null : at(found.get("number"), revision);
}

function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return a.length - b.length;
}

/** An edition where it stands (`order`), a verdict and the flags that extend it. */
type Entry = [[string, number[]] | null, boolean, ReadonlyMap<string, unknown>];

/** The verdicts of the flagged entries nearest an edition at `where`, of its standard, each entry where its edition
 * stands, its verdict and its flags: the nearest before it flagged `after`, and the nearest after it flagged
 * `before`. */
function guesses(entries: readonly Entry[], where: [string, number[]]): Set<boolean> {
  const placed = entries.flatMap(([there, verdict, flags]) =>
    there !== null && there[0] === where[0] && compare(there[1], where[1]) !== 0
      ? [[there[1], verdict, flags] as [number[], boolean, ReadonlyMap<string, unknown>]] : []);
  const before = placed.filter(([there]) => compare(there, where[1]) < 0).map(([there]) => there);
  const after = placed.filter(([there]) => compare(there, where[1]) > 0).map(([there]) => there);
  const nearest = (wheres: number[][], sign: number) => wheres.reduce<number[] | null>(
    (best, there) => best === null || sign * compare(there, best) > 0 ? there : best, null);
  const last = nearest(before, 1), next = nearest(after, -1);
  return new Set(placed.filter(([there, , flags]) =>
    (last !== null && compare(there, last) === 0 && flags.get("after") === true)
    || (next !== null && compare(there, next) === 0 && flags.get("before") === true)).map(([, verdict]) => verdict));
}

/** One verdict where the guesses give one; otherwise, as a grammar clause no edition names, allowed. */
function verdict(found: Set<boolean>): boolean {
  return found.size === 1 ? [...found][0]! : true;
}

/** Whether a stored edition allows a grammar clause: by its own `Allows` or `Forbids` of it; where it has neither, by
 * the flagged entries of its neighbours, the nearest editions of its standard before and after it, by revision, that
 * name it, an entry before it flagged `after` and one after it flagged `before`, where those agree; otherwise, as a
 * grammar clause no edition names, allowed. */
export function allows(standard: Readers.OfObject, clause: Readers.OfObject): boolean {
  const all = verdicts(clause);
  const own = all.find(([named]) => named === standard);
  if (own !== undefined) return own[1];
  const where = order(standard);
  return where === null ? true
    : verdict(guesses(all.map(([named, allowed, flags]) => [order(named), allowed, flags] as Entry), where));
}

/** Where an edition a dialect does not cover stands, given its designation and its revision: as `order` places a
 * stored one, its standard that of the dialect's editions whose designations differ from its own only in their
 * revisions' text (`ISO/IEC 9899:2029` C's, `Python 3.16` Python 3's) *(agent)*; null where none does. */
function placed(dialect: Readers.OfObject, designation: string,
                revision: readonly [string, unknown]): [string, number[]] | null {
  const stem = (text: string, value: unknown): string | null => {
    const found = text.lastIndexOf(String(value));
    return found < 0 ? null : text.slice(0, found) + text.slice(found + String(value).length);
  };
  const own = stem(designation, revision[1]);
  for (const [named, standard] of standards(dialect)) {
    const found = properties(standard);
    const theirs = found.get("revision") as [string, unknown] | undefined;
    if (own !== null && theirs !== undefined && theirs[0] === revision[0] && stem(named, theirs[1]) === own) {
      return at(found.get("number"), revision);
    }
  }
  return null;
}

/** Whether an edition, given by its designation and its revision (`["year", 2029n]`, `["version", "3.16"]`), allows a
 * grammar clause, whether its dialect covers it or not: as `allows` reads the edition the dialect covers by that
 * designation; where it covers none, the data not representing it, by the flagged entries of its neighbours, the
 * nearest editions of its standard (`placed`) before and after it that name the grammar clause, where those agree;
 * otherwise allowed. */
export function editionAllows(dialect: Readers.OfObject, designation: string, revision: readonly [string, unknown],
                              clause: Readers.OfObject): boolean {
  const stored = standards(dialect).get(designation);
  if (stored !== undefined) return allows(stored, clause);
  const where = placed(dialect, designation, revision);
  return where === null ? true
    : verdict(guesses(verdicts(clause).map(([named, allowed, flags]) => [order(named), allowed, flags] as Entry), where));
}

/** Whether an edition, given by its designation and its revision, has a kind, given its schema, whether its dialect
 * covers it or not: by its own `Expressions.Framework.HasStandard` entries, where the dialect covers it by that
 * designation; where it covers none, the data not representing it, where a neighbour has it, the nearest edition of
 * its standard (`placed`) before it that has it, its entry flagged `after`, or the nearest after it, its entry flagged
 * `before` *(agent)*; otherwise not. */
export function editionHas(dialect: Readers.OfObject, designation: string, revision: readonly [string, unknown],
                           kind: unknown): boolean {
  const stored = standards(dialect).get(designation);
  if (stored !== undefined) return kinds(stored).some((held) => held === kind);
  const where = placed(dialect, designation, revision);
  return where !== null && guesses([...standards(dialect).values()].flatMap((standard) =>
    Objects.entries(standard, "kinds").filter((entry) => entry.targets.get("kind") === kind)
      .map((entry) => [order(standard), true, entry.values] as Entry)), where).size > 0;
}

// --- Writing a dialect's grammar clauses ---

/** A grammar clause as a dialect's `define` writes it: its `name`; its `kind`, a key of the define's schemas (a kind's
 * tag, a helper's schema's name's last part, lowercased: `comprehension`); its `property`; what that property may hold,
 * `holds` (`present`, `values` or `kinds`) and `held` (a boolean, the values, or the kinds' keys); the names of its
 * `nested` grammar clauses; and the editions that allow it, `allowed`, by their symbols in the define's frame, every
 * other edition it covers forbidding it, or null where no edition names it (a grammar clause only nested or only
 * required); and, of a container, its `quantifier` (`any`, `every` or `none`) and its count, `atLeast`; the names of
 * the grammar clauses it `requires`; and whether it is `removed`, a construct the editions before the oldest one the
 * define covers had, which that one's entry, forbidding it, therefore does not extend to (`before`). */
export interface GrammarClause {
  readonly name: string;
  readonly kind: string;
  readonly property: string;
  readonly holds: "present" | "values" | "kinds";
  readonly held: unknown;
  readonly nested: readonly string[];
  readonly allowed: readonly string[] | null;
  readonly quantifier: "any" | "every" | "none";
  readonly atLeast: number;
  readonly requires: readonly string[];
  readonly removed: boolean;
}

const FORM = { quantifier: "any", atLeast: 1, requires: [], removed: false } as const;

/** A grammar clause: a kind's property set (a container not empty). */
export function present(name: string, kind: string, property: string,
                        allowed: readonly string[] | null): GrammarClause {
  return { name, kind, property, holds: "present", held: true, nested: [], allowed, ...FORM };
}

/** A grammar clause: a kind's property unset (a container empty). */
export function absent(name: string, kind: string, property: string, allowed: readonly string[] | null): GrammarClause {
  return { name, kind, property, holds: "present", held: false, nested: [], allowed, ...FORM };
}

/** A grammar clause: a kind's property holding one of these values (a container, one of its elements). */
export function values(name: string, kind: string, property: string, held: readonly unknown[],
                       allowed: readonly string[] | null): GrammarClause {
  return { name, kind, property, holds: "values", held, nested: [], allowed, ...FORM };
}

/** A grammar clause: a kind's property holding a term of one of these kinds (a container, one of its elements), which
 * takes any of the `nested` grammar clauses of its kind, where any is of its kind. */
export function kindsOf(name: string, kind: string, property: string, held: readonly string[],
                        nested: readonly string[], allowed: readonly string[] | null): GrammarClause {
  return { name, kind, property, holds: "kinds", held, nested, allowed, ...FORM };
}

/** A grammar clause of a container: every element of it holding what `clause` says one holds, and at least one. */
export function every(clause: GrammarClause): GrammarClause {
  return { ...clause, quantifier: "every" };
}

/** A grammar clause of a container: none of its elements holding what `clause` says one holds. */
export function none(clause: GrammarClause): GrammarClause {
  return { ...clause, quantifier: "none" };
}

/** A grammar clause of a container: at least `count` of its elements holding what `clause` says one holds (each, where
 * it says the container is set: `atLeast(2, present(...))`, two elements or more). */
export function atLeast(count: number, clause: GrammarClause): GrammarClause {
  return { ...clause, atLeast: count };
}

/** A grammar clause taken only where the grammar clauses `names` are taken too, on the same term, each of its kind: two
 * properties together (C23's `u8` character, its `prefix` and its `quote`). */
export function requires(clause: GrammarClause, names: readonly string[]): GrammarClause {
  return { ...clause, requires: names };
}

/** A grammar clause an edition removed, which the editions before the oldest one the define covers allowed (C++17's
 * `throw(int)`): no entry of it is flagged `before`, so that an edition before the data is guessed, as no entry reaches
 * it, to allow it; by default, a construct the oldest edition forbids is one added later, its entry flagged `before`, an
 * edition before the data guessed to forbid it too. */
export function removed(clause: GrammarClause): GrammarClause {
  return { ...clause, removed: true };
}

/** Each edition, by its symbol, in the order given, and the flags its entries have, what is true beyond it: each
 * standard's oldest edition's `before`, its newest's `after`. */
function flagged(editions: readonly (readonly string[])[]): Map<string, string[]> {
  return new Map(editions.flatMap((standard) => standard.map((edition, index) =>
    [edition, ([["before", index === 0], ["after", index === standard.length - 1]] as const)
      .filter(([, on]) => on).map(([flag]) => flag)] as const)));
}

/** The specs a dialect's `define` writes the kinds of its editions with (`Expressions.Framework.HasStandard`), given its
 * editions by their symbols in its frame, grouped by standard, each standard's oldest first (C's then C++'s), and the
 * schemas of the kinds each has, by its symbol: each entry flagged by what is true beyond it, as `grammarClausesSpec`
 * flags the entries of grammar clauses, an entry of each standard's oldest edition `before` and one of its newest
 * `after`, so that an edition the data does not represent is guessed to have the kinds its nearest neighbours have
 * (`editionHas`). A kind its oldest edition lacks has no entry there, so none flagged `before`. */
export function editionsSpec(editions: readonly (readonly string[])[],
                             kinds: ReadonlyMap<string, readonly unknown[]>): ((_: any) => any)[] {
  const entry = (kind: unknown, flags: readonly string[]): unknown =>
    flags.length === 0 ? kind : (t: any) => flags.map((flag) => t.kind(kind)[flag](true));
  return [...flagged(editions)].map(([edition, flags]) => (_: any) =>
    _[edition].kinds(kinds.get(edition)!.map((kind) => entry(kind, flags))));
}

/** The symbols and the specs a dialect's `define` writes its grammar clauses with, in a frame binding its dialect, by
 * the symbol `dialect`, and its editions: each grammar clause by `grammar_clause_<its index>`, owned by its name, its
 * kind's and its kinds' schemas by key (`schemas`), its quantifier and its count where they are not the default, the
 * grammar clauses it nests and requires, and each edition (`editions`, by symbol, each standard's oldest first: Python
 * 3's, or C's then C++'s) allowing it where `allowed` lists it, else forbidding it, each entry flagged by what is true
 * beyond it: each standard's oldest edition's `before`, but a `removed` grammar clause's, and its newest's `after`, so
 * that an edition the data does not represent is guessed to have what is true beyond its nearest neighbour. */
export function grammarClausesSpec(
  txn: any, dialect: string, clauses: readonly GrammarClause[], schemas: ReadonlyMap<string, unknown>,
  editions: readonly (readonly string[])[],
): [Record<string, unknown>, ((_: any) => any)[]] {
  const symbol = new Map(clauses.map((clause, index) => [clause.name, `grammar_clause_${index}`]));
  const GC = txn.Expressions.Framework.GrammarClause;
  const flags = flagged(editions);
  const entry = (_: any, edition: string, clause: GrammarClause): unknown => {
    const standard = _[edition];
    const on = flags.get(edition)!.filter((flag) => !(flag === "before" && clause.removed));
    if (on.length === 0) return standard;
    return (t: any) => on.map((flag) => t.standard(standard)[flag](true));
  };
  const write = (clause: GrammarClause) => (_: any): any => {
    let built = _[symbol.get(clause.name)!].property(clause.property).kind([schemas.get(clause.kind)]);
    if (clause.holds === "present") built = built.present(clause.held);
    else if (clause.holds === "values") built = built.values([...(clause.held as unknown[])]);
    else built = built.kinds((clause.held as string[]).map((kind) => schemas.get(kind))).nested(
      clause.nested.map((name) => _[symbol.get(name)!]));
    if (clause.quantifier !== "any") built = built.quantifier(clause.quantifier);
    if (clause.atLeast !== 1) built = built.at_least(BigInt(clause.atLeast));
    if (clause.requires.length > 0) built = built.requires(clause.requires.map((name) => _[symbol.get(name)!]));
    if (clause.allowed === null) return built;
    const allowed = clause.allowed;
    const all = [...flags.keys()];
    return built.allowed(all.filter((edition) => allowed.includes(edition)).map((edition) => entry(_, edition, clause)))
      .forbidden(all.filter((edition) => !allowed.includes(edition)).map((edition) => entry(_, edition, clause)));
  };
  return [Object.fromEntries(clauses.map((clause) => [symbol.get(clause.name)!, GC])),
    [(_: any) => _[dialect].grammar_clauses(Object.fromEntries(clauses.map((clause) =>
      [clause.name, (e: any) => e.clause(_[symbol.get(clause.name)!])]))), ...clauses.map(write)]];
}
