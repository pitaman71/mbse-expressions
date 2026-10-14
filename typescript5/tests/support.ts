/** Shared helpers for the test notebooks. Each notebook runs in its own process and makes its own stores. */

import { Schemas } from "@mbse/schemas/Framework";

/** Python's `assert`. */
export function assert(condition: unknown, message = "assertion failed"): asserts condition {
  if (!condition) throw new Error(`AssertionError: ${message}`);
}

/** Asserts that `block` throws one of `errors`, optionally with `match` in the message. */
export function raises(errors: Function | Function[], block: () => unknown, match?: string): void {
  const expected = Array.isArray(errors) ? errors : [errors];
  try {
    block();
  } catch (error) {
    if (!expected.some((e) => error instanceof (e as new () => unknown))) throw error;
    if (match !== undefined && !String((error as Error).message).includes(match)) {
      throw new Error(`AssertionError: expected ${JSON.stringify(match)} in ${JSON.stringify((error as Error).message)}`);
    }
    return;
  }
  throw new Error(`AssertionError: expected one of ${expected.map((e) => e.name).join(", ")}`);
}

/** Property Spec for a scalar-typed property. */
export function text(name: string, native: unknown = String) {
  return (prop: any) => prop.name(name).of(new Schemas.OfScalar.Data(native as never));
}

/** A container schema of `element`s (a schema, or a scalar type), by `index`: dense by int, a dict by str. */
export function container(element: unknown, index: unknown = BigInt): any {
  const of = (t: unknown): never => (typeof t === "function" ? new Schemas.OfScalar.Data(t as never) : t) as never;
  return new Schemas.OfContainer.Builder().index(of(index)).element(of(element)).create();
}

/** A property Spec writing `values` into the container the property holds: an array by position, a Map by key, each a
 * scalar or, nested, an array or Map. */
export function filled(values: unknown): (prop: any) => any {
  return (prop: any) => prop.as_value((a: any) => {
    fill(a, values);
    return a;
  });
}

function fill(element: any, value: unknown): void {
  if (Array.isArray(value) || value instanceof Map) {
    const items: [unknown, unknown][] = Array.isArray(value) ? value.map((v, i) => [BigInt(i), v]) : [...value];
    element.as_container((c: any) => {
      for (const [i, v] of items) fill(c.at(i), v);
      return c;
    });
  } else {
    element.as_scalar(value);
  }
}

/** Python's `==` on plain data: maps compare regardless of order, ints equal floats of the same value, NaN != NaN. */
export function equal(a: unknown, b: unknown): boolean {
  const numeric = (v: unknown) => typeof v === "bigint" || typeof v === "number";
  if (numeric(a) && numeric(b)) {
    if (typeof a === "bigint" && typeof b === "bigint") return a === b;
    return Number(a) === Number(b);
  }
  if (typeof a === "boolean" || typeof b === "boolean" || a === null || b === null || typeof a === "string") return a === b;
  if (a instanceof Uint8Array && b instanceof Uint8Array) return Buffer.from(a).equals(Buffer.from(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => equal(item, b[i]));
  if (a instanceof Map && b instanceof Map) return a.size === b.size && [...a].every(([k, v]) => b.has(k) && equal(v, b.get(k)));
  return a === b;
}

/** Map literal from an object literal, recursively (keys stay in literal order). */
export function map(value: unknown): any {
  if (Array.isArray(value)) return value.map(map);
  if (value !== null && typeof value === "object" && !(value instanceof Map) && !(value instanceof Uint8Array)) {
    return new Map(Object.entries(value).map(([k, v]) => [k, map(v)]));
  }
  return value;
}

/** Deep copy of plain data. */
export function copy<T>(value: T): T {
  if (Array.isArray(value)) return value.map(copy) as T;
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, copy(v)])) as T;
  return value;
}

/** Sequence equality with `===` elements. */
export function same(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i] || (Number.isNaN(x) && Number.isNaN(b[i])));
}

/** A stable text key for plain values (bigint, -0.0 and NaN included). */
export function key(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => {
    if (typeof v === "bigint") return `int:${v}`;
    if (typeof v === "number") return Object.is(v, -0) ? "float:-0" : Number.isNaN(v) ? "float:nan" : `float:${v}`;
    if (v instanceof Map) return { $map: [...v] };
    return v;
  });
}

/** Parameter counts of every protocol method, from Python's signatures (TypeScript interfaces vanish at runtime). */
export const PROTOCOLS: Record<string, Record<string, number>> = {
  // mbse-schemas' `Readers`, through which an expression's value is read.
  OfScalar: { as_schema: 0, get: 0 },
  OfAny: { as_schema: 0, as_scalar: 1, as_object: 1, as_union: 1, as_intersection: 1, as_container: 1 },
  OfProperty: { as_schema: 0, as_value: 1, as_scalar: 1, as_object: 1, get: 0 },
  OfObject: { as_schema: 0, as_identity: 0, as_adjacencies: 1 },
  OfContainer: { as_schema: 0, at: 1, as_ordered: 1, as_dict: 1, as_entries: 1 },
  OfIterator: { first: 0, last: 0, next: 0, prev: 0, index: 0, as_item: 1 },
  // The framework's protocols, with TypeScript's parameters: options objects and defaults are not counted.
  Expression: { dialect: 0, form: 0, validate: 0, reader: 0 },
  Dialect: { name: 0, kinds: 0, schema_of: 1, term: 1, make: 1, resolve: 1, validate: 1, infer: 1 },
  Translator: { left: 0, right: 0, forward: 1, backward: 1, inverse: 0 },
  Scope: { lookup: 1, bind: 2, enter: 1 },
  Domain: { name: 0, contains: 1, includes: 1 },
  Signature: { arity: 0, result: 1, describe: 0 },
};

/** Methods of `protocol` that `implementation` lacks, or declares with a different number of parameters. */
export function conformance_problems(implementation: { name: string; prototype: object }, protocol: string): string[] {
  const problems: string[] = [];
  for (const [method, arity] of Object.entries(PROTOCOLS[protocol] ?? {})) {
    const member = (implementation.prototype as Record<string, unknown>)[method];
    if (typeof member !== "function") {
      problems.push(`${implementation.name} lacks ${protocol}.${method}`);
      continue;
    }
    if (member.length !== arity) problems.push(`${implementation.name}.${method} takes ${member.length}, not ${arity} parameters`);
  }
  return problems;
}

/** The same check on a live instance: catches instance attributes that shadow protocol methods. */
export function instance_problems(instance: object, protocol: string): string[] {
  return Object.keys(PROTOCOLS[protocol] ?? {})
    .filter((method) => typeof (instance as Record<string, unknown>)[method] !== "function")
    .map((method) => `${instance.constructor.name} instance: ${protocol}.${method} is not callable`);
}
