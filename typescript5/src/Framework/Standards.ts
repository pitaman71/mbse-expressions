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
 *   entries from its side, through its extension adjacency `standards`.
 *
 * What changes from one edition to the next within a kind is data too: a grammar clause, an alternative within a
 * production of the dialect's grammar, a language feature (mbse-basis [grammar clauses by version](mbse:mbse-basis/proposals/GRAMMAR-CLAUSES.md), "No minimum versions": "PEP 614 removing a restriction is still a conditional clause just with an opposite sense of version progression").
 * A dialect owns each by name (`Expressions.Framework.Specifies`); an `Expressions.Framework.GrammarClause` is a kind
 * (`Expressions.Framework.HasGrammarClause`, which the kind's schema reads through its extension adjacency
 * `grammar_clauses`), one of its properties, and what that property may hold there: present or absent (`present`), one
 * of these values (`values`), or a term of one of these kinds (`Expressions.Framework.Holds`), each kind's term holding
 * what the nested grammar clauses of that kind say (`Expressions.Framework.Nests`). An edition allows or forbids it
 * (`Expressions.Framework.Allows`, `Expressions.Framework.Forbids`), each entry with the optional flags `before` and
 * `after`, as the user decided: "Add two optional properties on `Allows` and `Forbids` : 'before' and 'after' which are
 * only used by the system to guess support in the case that an edition has no representation. And a grammar clause
 * that has no `Allows` or `Forbids` should default to allows." The reading:
 *
 * - `grammarClauses(dialect)`: a dialect's grammar clauses by name, in the order the store holds the entries;
 *   `grammarClauseName(clause)`: the name its dialect owns it by, or null.
 * - `grammarClause(clause)`: what it says, by name: its `kind`'s schema, its `property`, and what it holds, `present`
 *   (a boolean), `values` (an array) or `kinds` (their schemas, an array), and its `nested` grammar clauses where it
 *   has any.
 * - `takes(dialect, term)`: the grammar clauses of a dialect that a term, or a helper, takes, in the order of
 *   `grammarClauses(dialect)`: those of its kind whose property holds what they say, a container where one of its
 *   elements does, a term of one of their kinds where it takes each of their nested grammar clauses of its kind.
 * - `allows(standard, clause)`: whether an edition allows a grammar clause: by its own `Allows` or `Forbids` of it;
 *   where it has neither, the data not representing it, by those of its neighbours, the nearest editions before and
 *   after it by revision that have one, of its standard's number, an `after` entry's before it and a `before` entry's
 *   after it, where they agree *(agent)*; otherwise allowed.
 *
 * A dialect's `define` writes its grammar clauses from a table, each a `GrammarClause` made by `present`, `absent`,
 * `values` or `kindsOf`, with the editions that allow it: `grammarClausesSpec(txn, clauses, schemas, editions)` gives
 * the symbols and the specs that write them in its frame, beside its editions.
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

/** What a grammar clause's property may hold: `["values", [...]]`, `["present", boolean]` or `["kinds", [...]]`. */
function holds(clause: Readers.OfObject): [string, unknown] {
  const found = Objects.properties(clause);
  if (found.has("values")) return ["values", [...(found.get("values") as Objects.Listed).values]];
  if (found.has("present")) return ["present", found.get("present")];
  return ["kinds", Objects.entries(clause, "kinds").map((entry) => entry.targets.get("kind"))];
}

/** What a stored grammar clause says, by name: its `kind`, its kind's schema; its `property`; what that property may
 * hold, `present` (a boolean), `values` (an array) or `kinds` (their schemas, an array); and its `nested` grammar
 * clauses, an array, where it has any. */
export function grammarClause(clause: Readers.OfObject): Map<string, unknown> {
  const [held, value] = holds(clause);
  const nested = nestedOf(clause);
  const found = new Map<string, unknown>([["kind", kindOf(clause)], ["property", Objects.properties(clause).get("property")],
    [held, value]]);
  if (nested.length > 0) found.set("nested", nested);
  return found;
}

/** The record of a term, or of a helper: its kind's branch's, through a union of helpers. */
function recordOf(value: any): any {
  if (Terms.isTerm(value)) return Terms.kindOf(value)[1];
  while (!(value.as_schema() instanceof Schemas.OfObject.Data)) [value] = Objects.properties(value).values();
  return value;
}

/** Whether a term's or a helper's record, of the grammar clause's kind, takes it. */
function taken(clause: Readers.OfObject, record: any): boolean {
  const value = Objects.properties(record).get(Objects.properties(clause).get("property") as string);
  const elements = value === undefined ? [] : value instanceof Objects.Listed ? value.values : [value];
  const [held, given] = holds(clause);
  if (held === "present") return (elements.length > 0) === given;
  if (held === "values") return elements.some((element) => (given as unknown[]).some((one) => element === one));
  const nested = nestedOf(clause);
  return elements.some((element) => {
    const inner = recordOf(element);
    const schema = inner.as_schema();
    return (given as unknown[]).some((kind) => kind === schema)
      && nested.every((each) => kindOf(each) !== schema || taken(each, inner));
  });
}

/** The grammar clauses of a dialect that a term or a helper takes, in the order of `grammarClauses(dialect)`: those of
 * its kind whose property holds what they say. A property that is a container holds what one of its elements does; a
 * term held is of one of a grammar clause's kinds where it takes each of its nested grammar clauses of that kind.
 * Nothing within the term is read but what its grammar clauses' properties hold: a caller walks the tree. */
export function takes(dialect: Readers.OfObject, term: unknown): Readers.OfObject[] {
  const record = recordOf(term);
  const schema = record.as_schema();
  return [...grammarClauses(dialect).values()].filter((clause) => kindOf(clause) === schema && taken(clause, record));
}

/** Each edition that names a grammar clause, whether it allows it, and its entry's flags. */
function verdicts(clause: Readers.OfObject): [Readers.OfObject, boolean, ReadonlyMap<string, unknown>][] {
  return ([["allowed", true], ["forbidden", false]] as const).flatMap(([adjacency, allowed]) =>
    Objects.entries(clause, adjacency).map((entry) =>
      [entry.targets.get("standard") as Readers.OfObject, allowed, entry.values] as [Readers.OfObject, boolean, ReadonlyMap<string, unknown>]));
}

/** Where an edition stands among its standard's editions: its number and its revision's branch, then its value, a
 * version by its dotted numbers; null where it has no revision. */
function order(standard: Readers.OfObject): [string, number[]] | null {
  const found = properties(standard);
  const revision = found.get("revision") as [string, unknown] | undefined;
  if (revision === undefined) return null;
  const [branch, value] = revision;
  return [`${found.get("number") ?? ""}/${branch}`,
    branch === "version" ? (value as string).split(".").map(Number) : [Number(value)]];
}

function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return a.length - b.length;
}

/** Whether an edition allows a grammar clause: by its own `Allows` or `Forbids` of it; where it has neither, by the
 * flagged entries of its neighbours, the nearest editions of its standard before and after it, by revision, that name
 * it, an entry before it flagged `after` and one after it flagged `before`, where those agree; otherwise, as a grammar
 * clause no edition names, allowed. */
export function allows(standard: Readers.OfObject, clause: Readers.OfObject): boolean {
  const all = verdicts(clause);
  const own = all.find(([named]) => named === standard);
  if (own !== undefined) return own[1];
  const at = order(standard);
  if (at === null) return true;
  const placed = all.flatMap(([named, allowed, flags]) => {
    const there = order(named);
    return there !== null && there[0] === at[0] && compare(there[1], at[1]) !== 0
      ? [[there[1], allowed, flags] as [number[], boolean, ReadonlyMap<string, unknown>]] : [];
  });
  const before = placed.filter(([where]) => compare(where, at[1]) < 0).map(([where]) => where);
  const after = placed.filter(([where]) => compare(where, at[1]) > 0).map(([where]) => where);
  const nearest = (wheres: number[][], sign: number) => wheres.reduce<number[] | null>(
    (best, where) => best === null || sign * compare(where, best) > 0 ? where : best, null);
  const last = nearest(before, 1), next = nearest(after, -1);
  const guesses = new Set(placed.filter(([where, , flags]) =>
    (last !== null && compare(where, last) === 0 && flags.get("after") === true)
    || (next !== null && compare(where, next) === 0 && flags.get("before") === true)).map(([, allowed]) => allowed));
  return guesses.size === 1 ? [...guesses][0]! : true;
}

// --- Writing a dialect's grammar clauses ---

/** A grammar clause as a dialect's `define` writes it: its `name`; its `kind`, a key of the define's schemas (a kind's
 * tag, a helper's schema's name's last part, lowercased: `comprehension`); its `property`; what that property may hold,
 * `holds` (`present`, `values` or `kinds`) and `held` (a boolean, the values, or the kinds' keys); the names of its
 * `nested` grammar clauses; and the editions that allow it, `allowed`, by their symbols in the define's frame, every
 * other edition it covers forbidding it, or null where no edition names it (a grammar clause only nested). */
export interface GrammarClause {
  readonly name: string;
  readonly kind: string;
  readonly property: string;
  readonly holds: "present" | "values" | "kinds";
  readonly held: unknown;
  readonly nested: readonly string[];
  readonly allowed: readonly string[] | null;
}

/** A grammar clause: a kind's property set (a container not empty). */
export function present(name: string, kind: string, property: string, allowed: readonly string[] | null): GrammarClause {
  return { name, kind, property, holds: "present", held: true, nested: [], allowed };
}

/** A grammar clause: a kind's property unset (a container empty). */
export function absent(name: string, kind: string, property: string, allowed: readonly string[] | null): GrammarClause {
  return { name, kind, property, holds: "present", held: false, nested: [], allowed };
}

/** A grammar clause: a kind's property holding one of these values (a container, one of its elements). */
export function values(name: string, kind: string, property: string, held: readonly unknown[],
                       allowed: readonly string[] | null): GrammarClause {
  return { name, kind, property, holds: "values", held, nested: [], allowed };
}

/** A grammar clause: a kind's property holding a term of one of these kinds (a container, one of its elements), which
 * takes each of the `nested` grammar clauses of its kind. */
export function kindsOf(name: string, kind: string, property: string, held: readonly string[], nested: readonly string[],
                        allowed: readonly string[] | null): GrammarClause {
  return { name, kind, property, holds: "kinds", held, nested, allowed };
}

/** The symbols and the specs a dialect's `define` writes its grammar clauses with, in a frame binding its dialect
 * (`dialect`) and its editions: each grammar clause by `grammar_clause_<its index>`, owned by its name, its kind's and
 * its kinds' schemas by key (`schemas`), and each edition (`editions`, by symbol, each standard's oldest first: Python
 * 3's, or C's then C++'s) allowing it where `allowed` lists it, else forbidding it, each standard's oldest edition's
 * entry flagged `before` and its newest's `after`, so that an edition the data does not represent is guessed to have
 * what its nearest neighbour has. */
export function grammarClausesSpec(txn: any, clauses: readonly GrammarClause[], schemas: ReadonlyMap<string, unknown>,
                                   editions: readonly (readonly string[])[]): [Record<string, unknown>, ((_: any) => any)[]] {
  const symbol = new Map(clauses.map((clause, index) => [clause.name, `grammar_clause_${index}`]));
  const GC = txn.Expressions.Framework.GrammarClause;
  const flagged = new Map(editions.flatMap((standard) => standard.map((edition, index) =>
    [edition, [["before", index === 0], ["after", index === standard.length - 1]] as const] as const)));
  const entry = (_: any, edition: string): unknown => {
    const standard = _[edition];
    const flags = flagged.get(edition)!;
    if (!flags.some(([, on]) => on)) return standard;
    return (t: any) => flags.filter(([, on]) => on).map(([flag]) => t.standard(standard)[flag](true));
  };
  const write = (clause: GrammarClause) => (_: any): any => {
    let built = _[symbol.get(clause.name)!].property(clause.property).kind([schemas.get(clause.kind)]);
    if (clause.holds === "present") built = built.present(clause.held);
    else if (clause.holds === "values") built = built.values([...(clause.held as unknown[])]);
    else built = built.kinds((clause.held as string[]).map((kind) => schemas.get(kind))).nested(
      clause.nested.map((name) => _[symbol.get(name)!]));
    if (clause.allowed === null) return built;
    const allowed = clause.allowed;
    const all = [...flagged.keys()];
    return built.allowed(all.filter((edition) => allowed.includes(edition)).map((edition) => entry(_, edition))).forbidden(
      all.filter((edition) => !allowed.includes(edition)).map((edition) => entry(_, edition)));
  };
  return [Object.fromEntries(clauses.map((clause) => [symbol.get(clause.name)!, GC])),
    [(_: any) => _.dialect.grammar_clauses(Object.fromEntries(clauses.map((clause) =>
      [clause.name, (e: any) => e.clause(_[symbol.get(clause.name)!])]))), ...clauses.map(write)]];
}
