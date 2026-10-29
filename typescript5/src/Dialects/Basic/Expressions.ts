/**
 * Expressions of the Basic dialect: the core vocabulary, for constraints. `Evaluators` evaluates them.
 *
 * Basic's terms are the framework's kinds (`Framework/Terms`) and one of its own, which `install` adds to
 * `Expressions.Framework.Term` by schema extension:
 *
 * - `literal`: a basic scalar (`value`), and its value domain (`domain`, by name) when that is not the scalar's default
 *   (see `Domains`).
 * - `call`: a named operation (`callable`) applied to ordered `arguments`, e.g. `eq(a, b)`, and its result's `domain`,
 *   which the conversions need. The vocabulary of names is open; the core operations (`CORE`) are the ones every
 *   binding evaluates. See docs/EXPRESSIONS.md.
 * - `variable`: the value bound to a `name`.
 * - `let`: binds a `name` to the value of one term (`value`) within another (`body`).
 * - `quantifier`: binds a `name` to each item of a `collection` within a `body`, and gives whether it holds for `all` or
 *   `any` of them, or for how many (`count`): its `quantifier`.
 *
 * `DIALECT` reads them (`Terms.Dialect`, with each kind's role, vocabulary and checks), validates and infers.
 *
 * `Writer`s write terms with methods, through the builders: `variable('this').age.ge(18n)` is `ge(get(this, 'age'),
 * 18)`. A writer is a spec, so it goes wherever a term is written, in a transaction:
 * `store.Expressions.Framework.Expression((e: any) => e.root(variable('this').age.ge(18n)))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr, Schemas } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

/** Basic's own kind, added to the framework's terms: run after `Framework.install`, in a transaction of its own. */
export function install(txn: any): any {
  const S = txn.Schemas;
  return txn.uid("mbse.Expressions.Basic/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Term: S.OfUnion, Quantifier: S.OfObject }) // the framework's union, found by its name
    .spec([
      (_: any) => _.Quantifier.name("Expressions.Basic.Quantifier").properties({
        name: S.OfStr, // bound to each item in the body
        quantifier: S.OfStr, // all, any or count
        collection: _.Term,
        body: _.Term,
        domain: S.OfStr, // every term has a domain: a quantifier's, its result's
      }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("quantifier").schema([_.Quantifier])]),
    ])]))]);
}

/** The core operations and their numbers of arguments. */
export const CORE: ReadonlyMap<string, number> = new Map(
  [...Domains.SIGNATURES].map(([name, signature]) => [name, signature.arity()]));

/** The operations that need a domain: their result's. */
const TYPED = ["convert", "reinterpret", "unpack"];

/** The domain a literal or a call names, or null. */
export function _domain_of(record: any): Domains.Domain | null {
  const name = F.attributesOf(record).get("domain") ?? null;
  return name === null ? null : Domains.registered(name);
}

/** The problems of a domain a term names. */
function domainProblems(name: string): string[] {
  let domain: Domains.Domain;
  try {
    domain = Domains.registered(name);
  } catch (error) {
    if (!(error instanceof Errors.LookupError)) throw error;
    return [`domain: ${error.message}`];
  }
  return domain.validate().map((problem) => `domain: ${problem}`);
}

/** A literal's domain is registered, valid, and holds its value. */
function literalCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  if ((attributes.get("domain") ?? null) === null) return [];
  const problems = domainProblems(attributes.get("domain"));
  const domain = problems.length === 0 ? Domains.registered(attributes.get("domain")) : null;
  if (domain !== null && !domain.contains(attributes.get("value"))) {
    problems.push(`a literal of ${domain.name()} cannot hold ${Repr.repr(attributes.get("value"))}`);
  }
  return problems;
}

/** A conversion needs a domain, which must be registered and valid; other core operations take none. */
function callCheck(record: any): string[] {
  const attributes = F.attributesOf(record);
  const name = attributes.get("callable") ?? null;
  const domain = attributes.get("domain") ?? null;
  if (domain === null) return TYPED.includes(name) ? [`${name} needs a domain`] : [];
  if (Domains.SIGNATURES.has(name) && !TYPED.includes(name)) return [`${name} takes no domain`];
  return domainProblems(domain);
}

/** The literal of a native value. */
function native(value: unknown): Writer | null {
  return Schemas.hostOf(value) !== null ? literal(value) : null;
}

/** The Basic dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Basic", {
  literal: new F.Kind(F.LITERAL, { check: literalCheck, typed: _domain_of }),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.SIGNATURES, required: ["callable"],
    check: callCheck, typed: _domain_of }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  let: new F.Kind(F.BINDING, { required: ["name"] }),
  quantifier: new F.Kind(F.QUANTIFIER, { operator: "quantifier", vocabulary: Domains.QUANTIFIERS,
    required: ["name", "quantifier"] }),
}, { domain_of: Domains.of, literal: native });

/** The name a term gives a domain: a name as it is, or a domain's registered name. */
function domainName(domain: unknown): string | null {
  if (domain === null || domain === undefined || typeof domain === "string") return (domain ?? null) as string | null;
  const name = Domains.name_of(domain);
  if (name === null) throw new Errors.LookupError(`${Domains._name(domain)} is not registered: a term names its domain`);
  return name;
}

// --- Writers: writing terms with methods ---

/** JavaScript's own protocol probes, never read as properties: awaiting, serializing or inspecting a writer is safe. */
const PROBES = new Set(["then", "toJSON", "constructor", "inspect", "nodeType", "$$typeof", "asymmetricMatch"]);

/**
 * A term written with methods, through the builders. `.name` reads a property (`get`); use `.get(name)` for names that
 * are also methods, such as `eq`. A `Writer` is a spec: it writes its term where it is given. Property names come from
 * schemas at runtime, so they are typed loosely, as proxies' are.
 */
export class Writer extends F.Writer {
  [property: string]: any;

  constructor(write: (union: any) => any) {
    super(write);
    return new Proxy(this, {
      get(target, property, receiver) {
        if (typeof property === "symbol" || property in target) return Reflect.get(target, property, receiver);
        if (property.startsWith("_") || PROBES.has(property)) return undefined;
        return (receiver as Writer).get(property);
      },
    });
  }

  get(name: string): Writer {
    return operation("get", this, name);
  }

  has(name: string): Writer {
    return operation("has", this, name);
  }

  eq(other: unknown): Writer {
    return operation("eq", this, other);
  }

  ne(other: unknown): Writer {
    return operation("ne", this, other);
  }

  lt(other: unknown): Writer {
    return operation("lt", this, other);
  }

  le(other: unknown): Writer {
    return operation("le", this, other);
  }

  gt(other: unknown): Writer {
    return operation("gt", this, other);
  }

  ge(other: unknown): Writer {
    return operation("ge", this, other);
  }

  and_(other: unknown): Writer {
    return operation("and", this, other);
  }

  or_(other: unknown): Writer {
    return operation("or", this, other);
  }

  not_(): Writer {
    return operation("not", this);
  }

  implies(other: unknown): Writer {
    return operation("implies", this, other);
  }

  add(other: unknown): Writer {
    return operation("add", this, other);
  }

  sub(other: unknown): Writer {
    return operation("sub", this, other);
  }

  mul(other: unknown): Writer {
    return operation("mul", this, other);
  }

  neg(): Writer {
    return operation("neg", this);
  }

  bitand(other: unknown): Writer {
    return operation("bitand", this, other);
  }

  bitor(other: unknown): Writer {
    return operation("bitor", this, other);
  }

  bitxor(other: unknown): Writer {
    return operation("bitxor", this, other);
  }

  bitnot(): Writer {
    return operation("bitnot", this);
  }

  shl(count: unknown): Writer {
    return operation("shl", this, count);
  }

  shr(count: unknown): Writer {
    return operation("shr", this, count);
  }

  /** The value in `domain`, kept: rounded or overflowing as `domain` does. */
  convert(domain: unknown): Writer {
    return operation("convert", this, { domain });
  }

  /** The bit pattern in `domain`, of the same width. */
  reinterpret(domain: unknown): Writer {
    return operation("reinterpret", this, { domain });
  }

  /** A packed value's representation. */
  pack(): Writer {
    return operation("pack", this);
  }

  /** The value of the packed `domain` that a representation stands for. */
  unpack(domain: unknown): Writer {
    return operation("unpack", this, { domain });
  }

  /** The number of items of a collection. */
  count(): Writer {
    return operation("count", this);
  }

  /** The item at a position, or at a key of a keyed list. */
  item(index: unknown): Writer {
    return operation("item", this, index);
  }

  /** Whether this equals one of the items of `collection`. */
  in_(collection: unknown): Writer {
    return operation("in", this, collection);
  }

  sum(): Writer {
    return operation("sum", this);
  }

  min(): Writer {
    return operation("min", this);
  }

  max(): Writer {
    return operation("max", this);
  }

  /** Whether no two items are equal. */
  unique(): Writer {
    return operation("unique", this);
  }

  /** An object's entries in an adjacency, as records. */
  entries(adjacency: string): Writer {
    return operation("entries", this, adjacency);
  }

  /** Whether `body` holds for every item, bound to `name`. */
  all(name: string, body: unknown): Writer {
    return quantifier("all", name, this, body);
  }

  /** Whether `body` holds for some item, bound to `name`. */
  any(name: string, body: unknown): Writer {
    return quantifier("any", name, this, body);
  }

  /** How many items, bound to `name`, `body` holds for. */
  count_where(name: string, body: unknown): Writer {
    return quantifier("count", name, this, body);
  }
}

function specOf(value: unknown): F.Writer | null {
  return value === null || value === undefined ? null : DIALECT.spec(value);
}

/** The variable `name`. */
export function variable(name: string): Writer {
  return new Writer((u: any) => u.variable((v: any) => v.name(name)));
}

/** The literal `value`, of `domain` (a domain registered under a name, or a name; by default, its native's). */
export function literal(value: unknown, domain: unknown = null): Writer {
  let name = domainName(domain);
  if (name !== null && Domains.nativeDomain(value) !== null
    && Domains.registered(name).equals(Domains.of(value))) {
    name = null; // a native's default domain is no domain at all
  }
  return new Writer((u: any) => u.literal((r: any) => {
    if (value !== null && value !== undefined) r.value((p: any) => p.as_scalar(value));
    return name === null ? r : r.domain(name);
  }));
}

/** `body`, with `name` bound to the value of `value`. */
export function let_(name: string, value: unknown, body: unknown): Writer {
  const [valueSpec, bodySpec] = [specOf(value), specOf(body)];
  return new Writer((u: any) => u.let((r: any) => {
    r.name(name);
    if (valueSpec !== null) r.value(valueSpec);
    return bodySpec === null ? r : r.body(bodySpec);
  }));
}

/** The quantifier `quantifier` (`all`, `any` or `count`) of `body`, with `name` bound to each item of `collection`. */
export function quantifier(quantifier: string, name: string, collection: unknown, body: unknown): Writer {
  const [collectionSpec, bodySpec] = [specOf(collection), specOf(body)];
  return new Writer((u: any) => u.quantifier((r: any) => {
    r.name(name).quantifier(quantifier);
    if (collectionSpec !== null) r.collection(collectionSpec);
    return bodySpec === null ? r : r.body(bodySpec);
  }));
}

/** The options of an operation, given after its arguments: the `domain` of its result. Python's keyword `domain=`. */
export interface Options {
  domain?: unknown;
}

function isOptions(value: unknown): value is Options {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Object.keys(value).every((key) => key === "domain");
}

/** The operation `name` applied to `args`, of the result's `domain` when it has one, given as a last argument
 * `{ domain }`; for operations outside the core, or without a method. */
export function operation(name: string, ...args: unknown[]): Writer {
  const last = args[args.length - 1];
  const options: Options = args.length > 0 && isOptions(last) ? (args.pop() as Options) : {};
  const specs = args.map((argument) => DIALECT.spec(argument));
  const named = domainName(options.domain ?? null);
  return new Writer((u: any) => u.call((r: any) => {
    r.callable(name).arguments(specs);
    return named === null ? r : r.domain(named);
  }));
}
