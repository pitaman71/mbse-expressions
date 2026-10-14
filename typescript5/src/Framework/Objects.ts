/**
 * Objects: the data objects expressions are evaluated over, read through mbse-schemas' visitor protocol (`Readers`).
 *
 * A data object is a `Readers.OfObject`, such as a proxy, or a union or intersection value, read as a record of its
 * one branch or its parts: `isObject(value)`. A reference object (`isReference`) has an identity, which equality
 * compares; a value object compares by its properties. `properties(value)` gives the properties set (a union's branch,
 * an intersection's parts), by name, each as evaluators read it: a scalar as itself, a value object, union or
 * intersection value as its visitor, and a container as `Listed`, its elements in order and, unless they are indexed
 * densely by ints, their indices. `entries(value, adjacency)` gives an adjacency's entries, each its other links'
 * objects and its properties' values.
 */

import { Schemas } from "@mbse/schemas/Framework";
import type { Readers } from "@mbse/schemas/Framework";

/** A container's elements in order, and their indices, or null where the container is dense by int. */
export class Listed {
  constructor(readonly values: readonly unknown[], readonly keys: readonly unknown[] | null) {}
}

/** An entry seen from one object: the objects its other links name, and the values of its properties that are set. */
export class Entry {
  constructor(readonly targets: ReadonlyMap<string, unknown>, readonly values: ReadonlyMap<string, unknown>) {}
}

const RECORDS = [Schemas.OfObject.Data, Schemas.OfUnion.Data, Schemas.OfIntersection.Data] as const;

/** Whether `value` is a data object: the visitor of an object, a union value or an intersection value. */
export function isObject(value: unknown): value is any {
  // `in` first: a value's proxy throws on reading an attribute it lacks.
  if (value === null || !["object", "function"].includes(typeof value) || !("as_schema" in (value as object))) return false;
  const schema = (value as { as_schema(): unknown }).as_schema();
  return RECORDS.some((kind) => schema instanceof kind);
}

/** Whether `value` is a reference object, which has an identity. */
export function isReference(value: unknown): boolean {
  return isObject(value) && value.as_schema() instanceof Schemas.OfObject.Data && value.as_identity() !== null;
}

function present(visitor: any): boolean {
  return visitor.as_schema() !== null;
}

/** The value a `Readers.OfAny` holds, as evaluators read it; null if it holds none. */
function held(read: any): unknown {
  const found: unknown[] = [];
  read.as_scalar((s: any) => {
    if (s.get() !== null) found.push(s.get());
    return s;
  });
  for (const select of ["as_object", "as_union", "as_intersection"]) {
    read[select]((v: any) => {
      if (present(v)) found.push(v);
      return v;
    });
  }
  read.as_container((c: any) => {
    if (present(c)) found.push(listed(c));
    return c;
  });
  return found.length > 0 ? found[0] : null;
}

function listed(read: Readers.OfContainer): Listed {
  const pairs: [unknown, unknown][] = [];
  read.as_entries((it) => pairs.push(...(it as unknown as Iterable<[unknown, unknown]>)));
  const schema = read.as_schema();
  const index = Schemas.structure(schema.index);
  const dense = schema.arrangement === "dense" && index instanceof Schemas.OfScalar.Data && index.type === BigInt;
  return new Listed(pairs.map(([, element]) => held(element)), dense ? null : pairs.map(([i]) => i));
}

function valueOf(read: any): unknown {
  const found: unknown[] = [];
  read.as_value((a: any) => {
    found.push(held(a));
    return a;
  });
  return found[0];
}

/** A union's branch or an intersection's part, whose visitor is of its type's kind; null if it is absent. */
function member(read: any, schema: unknown): unknown {
  const type = Schemas.structure(schema);
  if (type instanceof Schemas.OfScalar.Data) return read.get();
  if (!present(read)) return null;
  return type instanceof Schemas.OfContainer.Data ? listed(read) : read;
}

/** The properties set on a data object, by name, in its schema's order: a union value's one branch, and an
 * intersection value's parts. */
export function properties(value: any): Map<string, unknown> {
  const schema = value.as_schema();
  if (schema instanceof Schemas.OfObject.Data) {
    return new Map([...value.as_properties].map((prop: any) => [prop.as_schema().name as string, valueOf(prop)]));
  }
  const members = [...schema.properties].map(([name, m]: [string, any]) => [name, member(value[name], m.type)] as const);
  return new Map(members.filter(([, m]) => m !== null));
}

/** The entries of a data object's adjacency, in order; none if its schema has no such adjacency. */
export function entries(value: any, adjacency: string): Entry[] {
  const schema = value.as_schema().adjacencies?.get(adjacency); // a union or intersection value has none
  if (schema === undefined) return [];
  const relation = schema.relation.entry;
  return [...value[adjacency]].map((entry: any) => {
    const targets = new Map([...relation.links.keys()].filter((name) => name !== schema.me)
      .map((name) => [name, entry[name]] as [string, unknown]));
    const values = [...relation.properties.keys()].map((name) => [name, valueOf(entry[name])] as [string, unknown]);
    return new Entry(targets, new Map(values.filter(([, v]) => v !== null)));
  });
}
