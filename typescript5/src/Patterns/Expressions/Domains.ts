/**
 * Domains of the Patterns dialect, in code: the domains `Dialect.infer` gives Patterns' values, and the signatures of
 * its operations, for inference; and the values evaluation gives collections and entries.
 *
 * Patterns holds no kinds of domain and owns no domains: as data they are the standard dialects' (ISO/IEC 11404's,
 * IEEE 754's, IEEE 1164's and Unicode's, `@mbse/expressions/ISOIEC11404/Expressions` and the others), read through the
 * framework's reading interface (`Framework/Domains.kindOf`, `properties`, `nameOf`), and Patterns' operations are
 * data, which validation reads from the store of a term's holder. What is here is `Dialect.infer`'s, in code, to be
 * replaced with stored domains and operations as domain inference reads them
 * ([CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)).
 *
 * The natives' domains are `Bool`, `Int`, `Float`, `Str` and `Bytes`, each the values of exactly that type (the
 * framework's `OfTypes`), as a term carries no domain and a value is taken by the schema it is written with: an int (a
 * bigint) is an unbounded integer, a float (a number) an IEEE 754 binary64 number. `of(value)` gives a native's.
 * `Object` holds data objects read through mbse-schemas' readers (`Framework/Objects`), terms and value objects among
 * them, and `Anything` is the domain of a value not known statically, such as a property read with `get`. Unknown
 * (`null`) is not a domain.
 *
 * `SIGNATURES` gives each operation's signature, for inference, following the evaluator's rules: comparisons take two
 * values of one domain, ordered for ints, floats, strs and bytes; logic takes bools; arithmetic takes two numbers of one
 * domain and gives that domain, and the bitwise operations and shifts ints. `QUANTIFIERS` are the quantifiers', and
 * `LIST` and `MAPPING` the container constructors'; `List` and `Keyed` are the domains of collections, `Records` of an
 * adjacency's entries.
 *
 * `Collection` and `Record` are evaluation's values: a collection's items (and a keyed list's keys), and an entry, as
 * `entries` gives it.
 */

import { Repr } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";
import * as Objects from "../../Framework/Objects.js";

const repr = Repr.repr;

// --- Collections ---

function sameItem(a: unknown, b: unknown): boolean {
  if (a instanceof Collection) return a.equals(b);
  if (a instanceof Uint8Array && b instanceof Uint8Array) return a.length === b.length && a.every((x, i) => x === b[i]);
  return a === b;
}

/** A collection's items, in order, and for a keyed list their `keys` (null for a positional one). */
export class Collection {
  constructor(readonly items: readonly unknown[], readonly keys: readonly unknown[] | null = null) {}

  /** The same items and keys. */
  equals(other: unknown): boolean {
    const same = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((x, i) => sameItem(x, b[i]));
    return other instanceof Collection && same(this.items, other.items) && (this.keys === null ? other.keys === null
      : other.keys !== null && same(this.keys, other.keys));
  }

  toString(): string {
    const keys = this.keys;
    if (keys === null) return `[${this.items.map((item) => repr(item)).join(", ")}]`;
    return `{${this.items.map((item, i) => `${repr(keys[i])}: ${repr(item)}`).join(", ")}}`;
  }
}

/** An entry, as `entries` gives it: the targets of its other links and its property values, by name. */
class RecordData {
  constructor(readonly fields: ReadonlyMap<string, unknown>) {}

  toString(): string {
    return `record(${[...this.fields].map(([k, v]) => `${k}=${repr(v)}`).join(", ")})`;
  }
}

/** The domain of positional collections of `item`, for inference. */
export class List implements D.Domain {
  constructor(readonly item: D.Domain) {}

  name(): string {
    return `list(${this.item.name()})`;
  }

  contains(value: unknown): boolean {
    return (value instanceof Collection && value.keys === null && value.items.every((item) => this.item.contains(item)))
      || (Array.isArray(value) && value.every((item) => this.item.contains(item)));
  }

  includes(other: D.Domain): boolean {
    if (other instanceof D.OfUnion) return other.members.every((member) => this.includes(member));
    return this.equals(other);
  }

  equals(other: unknown): boolean {
    return other instanceof List && sameDomain(other.item, this.item);
  }

  toString(): string {
    return this.name();
  }
}

/** The domain of keyed collections from `key` to `item`, for inference. */
export class Keyed implements D.Domain {
  constructor(readonly key: D.Domain, readonly item: D.Domain) {}

  name(): string {
    return `keyed(${this.key.name()}, ${this.item.name()})`;
  }

  contains(value: unknown): boolean {
    return value instanceof Collection && value.keys !== null && value.keys.every((key) => this.key.contains(key))
      && value.items.every((item) => this.item.contains(item));
  }

  includes(other: D.Domain): boolean {
    if (other instanceof D.OfUnion) return other.members.every((member) => this.includes(member));
    return this.equals(other);
  }

  equals(other: unknown): boolean {
    return other instanceof Keyed && sameDomain(other.key, this.key) && sameDomain(other.item, this.item);
  }

  toString(): string {
    return this.name();
  }
}

function sameDomain(a: D.Domain, b: D.Domain): boolean {
  return a === b || (a.includes(b) && b.includes(a));
}

/** The domain of a collection's items: a list's or a keyed list's item domain, otherwise unknown. */
export function items_of(domain: D.Domain): D.Domain {
  return domain instanceof List || domain instanceof Keyed ? domain.item : D.Anything;
}

// --- The natives' domains and the operations' signatures: `Dialect.infer`'s, CAP-232's to replace ---

export const Anything = D.Anything;
export const Bool = new D.OfTypes("bool", Boolean);
export const Int = new D.OfTypes("int", BigInt);
export const Float = new D.OfTypes("float", Number);
export const Str = new D.OfTypes("str", String);
export const Bytes = new D.OfTypes("bytes", Uint8Array);
const ObjectDomain = new D.OfValues("object", Objects.isObject);
export { ObjectDomain as Object };

const NATIVES: readonly D.OfTypes[] = [Bool, Int, Float, Str, Bytes];

/** A native's domain, or null when `value` is not a native. */
export function nativeDomain(value: unknown): D.OfTypes | null {
  return NATIVES.find((native) => native.contains(value)) ?? null;
}

export { RecordData as Record };
export const Records = new D.OfValues("record", (value) => value instanceof RecordData);
const COLLECTIONS = new D.OfValues("collection", (value) => value instanceof Collection || Array.isArray(value));
const COMPARABLE = [Bool, Int, Float, Str, Bytes, ObjectDomain];
const ORDERED = [Int, Float, Str, Bytes];
const NUMBERS = [Int, Float];
const LOGIC = new D.Function([Bool, Bool], Bool);
const INTEGERS = new D.Function([Int, Int], Int);

function isCollection(domain: D.Domain): boolean {
  return D.overlaps(COLLECTIONS, domain) || domain instanceof List || domain instanceof Keyed;
}

/** An operation on a collection: `before` and `after` other arguments, and its result, or (`result` null) the item
 * domain when the items are in `items`. */
class Collective implements D.Signature {
  constructor(private readonly before: number, private readonly after: number, private readonly resultDomain: D.Domain | null,
    private readonly itemDomain: D.Domain = Anything, private readonly label = "T") {}

  arity(): number {
    return this.before + 1 + this.after;
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    const collection = args[this.before] as D.Domain; // validation has checked their number
    if (!isCollection(collection)) return null;
    const item = items_of(collection);
    if (!D.overlaps(this.itemDomain, item)) return null;
    return this.resultDomain ?? item;
  }

  describe(): string {
    const parameters = [...Array(this.before).fill("T"), `collection of ${this.label}`, ...Array(this.after).fill("T")];
    return `(${parameters.join(", ")}) -> ${this.resultDomain === null ? this.label : this.resultDomain.name()}`;
  }
}

/** A quantifier: a collection and a bool body, giving `result`. */
class Quantified implements D.Signature {
  constructor(private readonly resultDomain: D.Domain) {}

  arity(): number {
    return 2;
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    if (args.length !== 2 || !isCollection(args[0] as D.Domain)) return null;
    return D.overlaps(Bool, args[1] as D.Domain) ? this.resultDomain : null;
  }

  /** The domain the quantifier's name has: the collection's items'. */
  items(collection: D.Domain): D.Domain {
    return items_of(collection);
  }

  describe(): string {
    return `(collection, bool) -> ${this.resultDomain.name()}`;
  }
}

/** The quantifiers' signatures. */
export const QUANTIFIERS: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["all", new Quantified(Bool)], ["any", new Quantified(Bool)], ["count", new Quantified(Int)],
]);

const READABLE = new D.OfUnion(ObjectDomain, Records);

/** The operations' signatures, for inference: their names are the operations Patterns' install writes as data. */
export const SIGNATURES: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["get", new D.Function([READABLE, Str], Anything)], ["has", new D.Function([READABLE, Str], Bool)],
  ...["eq", "ne"].map((name) => [name, new D.Same(2, COMPARABLE, Bool)] as [string, D.Signature]),
  ...["lt", "le", "gt", "ge"].map((name) => [name, new D.Same(2, ORDERED, Bool)] as [string, D.Signature]),
  ["and", LOGIC], ["or", LOGIC], ["not", new D.Function([Bool], Bool)], ["implies", LOGIC],
  ...["add", "sub", "mul"].map((name) => [name, new D.Same(2, NUMBERS)] as [string, D.Signature]),
  ["neg", new D.Same(1, NUMBERS)],
  ...["bitand", "bitor", "bitxor"].map((name) => [name, INTEGERS] as [string, D.Signature]),
  ["bitnot", new D.Function([Int], Int)], ["shl", INTEGERS], ["shr", INTEGERS],
  ["count", new Collective(0, 0, Int)], ["item", new Collective(0, 1, null)], ["in", new Collective(1, 0, Bool)],
  ["sum", new Collective(0, 0, null, new D.OfUnion(...NUMBERS), "number")],
  ["min", new Collective(0, 0, null, new D.OfUnion(...ORDERED), "ordered value")],
  ["max", new Collective(0, 0, null, new D.OfUnion(...ORDERED), "ordered value")], ["unique", new Collective(0, 0, Bool)],
  ["entries", new D.Function([ObjectDomain, Str], new List(Records))],
]);

/** A container constructor's signature: any number of elements, giving a list of their domain, or of entries (a key
 * then its value), giving a keyed collection of theirs. */
class Constructor implements D.Signature {
  constructor(private readonly keyed: boolean) {}

  arity(): number {
    return -1; // any number
  }

  result(args: readonly D.Domain[]): D.Domain | null {
    const joined = (domains: readonly D.Domain[]) => (domains.length > 0 ? D.join(domains) : Anything);
    if (!this.keyed) return new List(joined(args));
    return new Keyed(joined(args.filter((_, i) => i % 2 === 0)), joined(args.filter((_, i) => i % 2 === 1)));
  }

  describe(): string {
    return this.keyed ? "(K, T, ...) -> keyed(K, T)" : "(T, ...) -> list(T)";
  }
}

/** The container constructors' signatures. */
export const LIST: D.Signature = new Constructor(false);
export const MAPPING: D.Signature = new Constructor(true);

/** The domain of a value: its native type's, or `Object`. */
export function of(value: unknown): D.Domain {
  const native = nativeDomain(value);
  if (native !== null) return native;
  if (ObjectDomain.contains(value)) return ObjectDomain;
  throw new TypeError(`a ${Repr.typeName(value)} is not a value of the Patterns dialect`);
}
