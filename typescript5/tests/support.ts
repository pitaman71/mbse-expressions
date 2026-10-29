/** Shared helpers for the test notebooks. Each notebook runs in its own process and makes its own stores. */

import { Visitors } from "@mbse/schemas/Framework";

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

/** Python's `==` on two `Terms.Form`s: the same kind, equal attributes, and the same arguments (by identity). */
export function form_equal(a: { kind: string; attributes: ReadonlyMap<string, unknown>; arguments: readonly unknown[] },
  b: { kind: string; attributes: ReadonlyMap<string, unknown>; arguments: readonly unknown[] }): boolean {
  return a.kind === b.kind && equal(a.attributes, b.attributes) && same(a.arguments, b.arguments);
}

/** Map literal from an object literal, recursively (keys stay in literal order). */
export function map(value: unknown): any {
  if (Array.isArray(value)) return value.map(map);
  if (value !== null && typeof value === "object" && !(value instanceof Map) && !(value instanceof Uint8Array)) {
    return new Map(Object.entries(value).map(([k, v]) => [k, map(v)]));
  }
  return value;
}

/** Sequence equality with `===` elements. */
export function same(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i] || (Number.isNaN(x) && Number.isNaN(b[i])));
}

/** Parameter counts of every protocol method, from Python's signatures (TypeScript interfaces vanish at runtime). */
export const PROTOCOLS: Record<string, Record<string, number>> = {
  OfAny: { as_native: 1, as_object: 1, as_union: 1, as_intersection: 1 },
  OfNative: { has: 0, get: 0, set: 1, clear: 0 },
  OfProperty: { name: 0, has: 0, value: 1, clear: 0 },
  OfObject: { properties: 1, has: 1, property: 2, clear: 1, adjacencies: 1, adjacency: 2, identify: 1 },
  OfAdjacency: { name: 0, me: 0, entries: 1, add: 1, remove: 1 },
  OfEntry: { links: 1, link: 2, properties: 1, has: 1, property: 2, clear: 1 },
  OfLink: { name: 0, target: 1, set: 1 },
  OfRelation: { links: 1, entries: 1 },
  OfUnion: { branch: 0, value: 1 },
  OfIntersection: { value: 1 },
  Visitable: { identity: 0, schema_name: 0, owner: 0, accept: 1 },
  // The framework's protocols, with TypeScript's parameters: options objects and defaults are not counted.
  Expression: { dialect: 0, form: 0, validate: 0 },
  Dialect: { name: 0, kinds: 0, schema_of: 1, make: 1, resolve: 1, validate: 1, infer: 1 },
  Translator: { left: 0, right: 0, forward: 1, backward: 1, inverse: 0 },
  Scope: { lookup: 1, bind: 2, enter: 1 },
  Domain: { name: 0, contains: 1, includes: 1 },
  Signature: { arity: 0, result: 1, describe: 0 },
};

/** mbse-schemas' readers' methods (`Readers.OfX` is a type, which vanishes at runtime), and its visitors' own list. */
const READERS: Record<string, readonly string[]> = {
  OfScalar: ["as_schema", "get"],
  OfAny: ["as_schema", "as_scalar", "as_object", "as_union", "as_intersection", "as_container"],
  OfContainer: ["as_schema", "at", "as_ordered", "as_dict", "as_entries"],
  OfProperty: ["as_schema", "as_value", "as_scalar", "as_object", "get"],
  OfObject: ["as_schema", "as_adjacencies"],
  OfUnion: ["as_schema"],
};
for (const [name, methods] of Object.entries(READERS)) PROTOCOLS[`Readers.${name}`] = Object.fromEntries(methods.map((m) => [m, 0]));
for (const [name, methods] of Object.entries(Visitors.PROTOCOL_METHODS)) {
  PROTOCOLS[`Visitors.${name}`] = Object.fromEntries(methods.map((m) => [m, 0]));
}

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

