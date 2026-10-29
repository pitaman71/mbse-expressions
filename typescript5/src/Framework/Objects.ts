/**
 * Objects: the data objects expressions are evaluated over, read through mbse-schemas' visitor protocol (`Readers`).
 *
 * A data object is a `Readers.OfObject`, such as a proxy, or a union or intersection value, read as a record of its one
 * branch or its parts: `isObject(value)`. A reference object (`isReference`) is one whose schema is a reference object
 * schema; equality compares it by identity, the object itself. A value object compares by its properties.
 * `properties(value)` gives the properties set (a union's branch, an intersection's parts), by name, each as evaluators
 * read it: a scalar as itself, a value object, union or intersection value as its visitor, and a container as `Listed`,
 * its elements in order and, unless they are indexed densely by ints, their indices. `entries(value, adjacency)` gives
 * an adjacency's entries, each its other links' objects and its properties' values.
 */

import { Repr, Schemas } from "@mbse/schemas/Framework";
import type { Readers } from "@mbse/schemas/Framework";

/** A container's elements in order, and their indices, or null where the container is dense by int. */
export class Listed {
  constructor(readonly values: readonly unknown[], readonly keys: readonly unknown[] | null) {}
}

/** An entry seen from one object: the objects its other links name, and the values of its properties that are set. */
export class Entry {
  constructor(readonly targets: ReadonlyMap<string, unknown>, readonly values: ReadonlyMap<string, unknown>) {}
}

function schemaOf(value: unknown): unknown {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return null;
  const schema = (value as { as_schema?: unknown }).as_schema;
  return typeof schema === "function" && !Repr.isClassLike(value) ? (schema as () => unknown).call(value) : null;
}

/** Whether `value` is a data object: the visitor of an object, a union value or an intersection value. */
export function isObject(value: unknown): boolean {
  const schema = schemaOf(value);
  return schema instanceof Schemas.OfObject.Data || schema instanceof Schemas.OfUnion.Data
    || schema instanceof Schemas.OfIntersection.Data;
}

/** Whether `value` is a reference object, which has an identity. */
export function isReference(value: unknown): boolean {
  const schema = schemaOf(value);
  return schema instanceof Schemas.OfObject.Data && schema.ref;
}

function present(visitor: any): boolean {
  return visitor.as_schema() !== null;
}

/** The value a `Readers.OfAny` holds, as evaluators read it; null if it holds none. */
export function held(read: Readers.OfAny): unknown {
  const found: unknown[] = [];
  read.as_scalar((s) => {
    const value = s.get();
    if (value !== null) found.push(value);
    return s;
  });
  for (const select of ["as_object", "as_union", "as_intersection"] as const) {
    (read[select] as (cb: (v: any) => any) => unknown).call(read, (v: any) => {
      if (present(v)) found.push(v);
      return v;
    });
  }
  read.as_container((c) => {
    if (present(c)) found.push(listed(c));
    return c;
  });
  return found.length > 0 ? found[0] : null;
}

function listed(read: Readers.OfContainer): Listed {
  const pairs: [unknown, Readers.OfAny][] = [];
  read.as_entries((it) => {
    for (let next = it.next(); !next.done; next = it.next()) pairs.push(next.value);
  });
  const schema = read.as_schema();
  const dense = schema.arrangement === "dense" && schema.index instanceof Schemas.OfScalar.Data && schema.index.type === BigInt;
  return new Listed(pairs.map(([, element]) => held(element)), dense ? null : pairs.map(([index]) => index));
}

function valueOf(read: any): unknown {
  const found: unknown[] = [];
  read.as_value((a: Readers.OfAny) => { // every callback is called: an absent value's reader holds nothing
    found.push(held(a));
    return a;
  });
  return found[0];
}

/** A union's branch or an intersection's part, whose visitor is of its type's kind; null if it is absent. */
function member(read: any, schema: unknown): unknown {
  if (schema instanceof Schemas.OfScalar.Data) return read.get();
  if (!present(read)) return null;
  return schema instanceof Schemas.OfContainer.Data ? listed(read) : read;
}

/** The properties set on a data object, by name, in its schema's order: a union value's one branch, and an
 * intersection value's parts. */
export function properties(value: any): Map<string, unknown> {
  const schema = value.as_schema();
  const found = new Map<string, unknown>();
  if (schema instanceof Schemas.OfObject.Data) {
    for (const prop of value.as_properties as Iterable<Readers.OfProperty>) {
      const read = valueOf(prop);
      if (read !== null) found.set(prop.as_schema().name, read);
    }
    return found;
  }
  for (const [name, part] of (schema as Schemas.OfUnion.Data).properties) {
    const read = member(value[name], part.schema);
    if (read !== null) found.set(name, read);
  }
  return found;
}

/** The entries of a data object's adjacency, in order; none if its schema has no such adjacency. */
export function entries(value: any, adjacency: string): Entry[] {
  const schema = (value.as_schema() as { adjacencies?: Map<string, Schemas.OfAdjacency.Data> }).adjacencies
    ?.get(adjacency); // a union or intersection value has none
  if (schema === undefined) return [];
  const relation = (schema.relation as Schemas.OfRelation.Data).entry;
  const found: Entry[] = [];
  for (const entry of value[adjacency] as Iterable<any>) {
    const targets = new Map<string, unknown>();
    for (const name of relation.links.keys()) if (name !== schema.me) targets.set(name, entry[name]);
    const values = new Map<string, unknown>();
    for (const name of relation.properties.keys()) {
      const read = valueOf(entry[name]);
      if (read !== null) values.set(name, read);
    }
    found.push(new Entry(targets, values));
  }
  return found;
}
