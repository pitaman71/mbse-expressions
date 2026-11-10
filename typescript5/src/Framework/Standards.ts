/**
 * Standards: the editions of the standards each dialect covers, as data, and the kinds each has.
 *
 * A dialect owns each edition it covers by its designation, as its standards body writes it (`ISO/IEC 9899:2011`,
 * `IEEE Std 754-2019`), through `Expressions.Framework.Covers`; an edition is an `Expressions.Framework.Standard`,
 * holding its formal reference's parts (its `bodies` by reverse-domain name, one or a joint pair; its `number`; its
 * `revision`, a year, an edition or a version) and its common `names` (`C11`), so that a reference of either kind finds
 * it (the dialects proposal's Decided, Q10: "If we treat standards as tags, we could support both"). Each kind's schema
 * records the editions that have it (`Expressions.Framework.HasStandard`); a kind none has is an extension, or invalid
 * syntax. See [Domains as data](../../../docs/proposals/domains/README.md#standards-design), Standards' design.
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
 */

import type { Readers } from "@mbse/schemas/Framework";

import * as Objects from "./Objects.js";

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

/** The schemas of the kinds a stored edition has (`Expressions.Framework.HasStandard`), in the order the store holds the
 * entries. */
export function kinds(standard: Readers.OfObject): unknown[] {
  return Objects.entries(standard, "kinds").map((entry) => entry.targets.get("kind"));
}

/** The editions a dialect covers that have a kind, given its schema, by designation, in the order of
 * `standards(dialect)`. */
export function of(dialect: Readers.OfObject, kind: unknown): Map<string, Readers.OfObject> {
  return new Map([...standards(dialect)].filter(([, standard]) => kinds(standard).some((held) => held === kind)));
}
