/**
 * Expressions: the protocols every dialect's expressions implement, and the machinery that implements them.
 *
 * An expression language (a dialect) is a set of term kinds and a vocabulary of operators. Every dialect's
 * expressions are:
 *
 * - Values. Each kind has a meta-schema, an ordinary mbse-schemas value object schema, and an expression is a value
 *   of its kind's: `reader()` gives it as one (a `Readers.OfObject`), which serializers, validation and comparison
 *   read as any value, and `Dialect.term(value)` rebuilds an expression from one. `Dialect.store`, a store of proxies
 *   holding the meta-schemas, is where these values are built; `Dialect.register(store)` registers the meta-schemas
 *   in any other store; and `Dialect.Schema` is the union of the kinds' meta-schemas. Each kind's data has a builder
 *   (`create()` / `clone()` / `update()`) with a DSL.
 * - Structurally traversable. `Expression.form()` gives a term's `Form`: its kind, its native attributes and its
 *   ordered arguments, which are expressions of the same dialect. `Dialect.make(form)` is the inverse. `walk`, `fold`
 *   and `same` traverse any dialect's expressions through forms alone.
 * - Validatable. `Dialect.validate` reports what evaluation would raise, and `Dialect.infer` finds an expression's
 *   domain from its vocabulary's signatures (see `Domains`).
 * - Evaluatable, by the dialect's own evaluator (see `Evaluators`), and translatable to other dialects (see
 *   `Translators`).
 *
 * A dialect declares each kind as a class derived from `Term`, whose static members say how its fields map to the
 * data model and what `ROLE` it plays, and passes the classes to `Declared`, which derives the rest. The roles are:
 *
 * - `LITERAL`: a native value, in the field `value`, written to the property named after its type (`int`, `str`, ...).
 * - `REFERENCE`: a value the scope resolves. A lexical reference (`LEXICAL`, the default) is the value bound to the
 *   name in its first property, by an enclosing binding or import or by the scope; others, such as Excel's cell
 *   references, are resolved by the scope alone, and validation does not require them to be bound. `AMBIENT` names
 *   are bound without being declared, as Python's builtins are.
 * - `APPLICATION`: an operator, named by the property `OPERATOR` (or, if it is null, by the kind's tag), applied to
 *   arguments. A kind's `VOCABULARY` maps operator names to signatures; operators outside it are extensions, unless
 *   the vocabulary is `null`, when any name is accepted and `SIGNATURE` applies to all.
 * - `BINDING`: binds the name in its first property to its first argument within the others.
 * - `QUANTIFIER`: binds the name in its first property to each item of its first argument, a collection, within the
 *   others (a body, and any conditions), and combines the results by its operator (named as an application's is), such
 *   as `all`. Its signature also gives the domain of a collection's items, `items(domain)`, for inference.
 * - `IMPORT`: makes what it declares (a module, a package's functions) available within its one argument, its body.
 *   The scope resolves the declaration; `binds()` gives the names it binds for lexical references.
 *
 * Properties are required unless named in `OPTIONAL`, and `check()` adds a kind's own problems to validation. `VALUES`
 * names properties that hold a value object rather than a native, each described by a `ValueProperty` (its schema, and
 * the conversions between the field's data and the value's plain form), such as a literal's domain. `typed()` gives a
 * literal's own domain, if it has one.
 *
 * An expression is a value, written nested in what holds it: its meta-schema has one property per native type its
 * value may have (a literal's), its properties, its value properties, and `arguments`, a dense container of its
 * arguments by index, each a value of any type (`ARGUMENT`), which the wire tags with its kind's meta-schema's
 * registered name, since a dialect's terms hold its extensions' and its extensions' meta-schemas are registered in its
 * store too. Arguments are fields: `SLOTS` names fields holding one argument each, in index order, and `VARIADIC` names
 * one field holding an array of the arguments after the slots. A kind's fields are, in order, `value` (a literal's),
 * its properties, its slots, its variadic field and its value properties, and its constructor takes them in that
 * order.
 *
 * A slot named in `REFERS` holds a definition the term refers to, such as the predicate an application applies, not a
 * part of it. Its value refers to the definition by name, as a module names a schema, since nothing links a value: the
 * slot is written as a str property holding the definition's name (`nameOf`), not in `arguments`, and read back as
 * that name, which whatever holds the definitions resolves. A definition may refer to itself, through such a slot,
 * directly or not: that is recursion, not a cycle, and checking stops where it reaches a definition it is already
 * checking. Any other cycle is a problem, and an expression with one has no value.
 */

import { Errors, Plain, Proxies, Repr, Schemas } from "@mbse/schemas/Framework";
import type { Readers, Visitors } from "@mbse/schemas/Framework";

import * as Domains from "./Domains.js";

const { AttributeError, KeyError, LookupError, ValueError } = Errors;
const { isClassLike, repr, tokenName, typeName } = Repr;
type Native = Visitors.Scalar;

export const LITERAL = "literal";
export const REFERENCE = "reference";
export const APPLICATION = "application";
export const BINDING = "binding";
export const IMPORT = "import";
export const QUANTIFIER = "quantifier";

export const NATIVES: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ["int", BigInt],
  ["float", Number],
  ["str", String],
  ["bool", Boolean],
  ["bytes", Uint8Array],
]);

/** The name of `value`'s native type, which is also the literal property that holds it; null if not native. */
export function nativeName(value: unknown): string | null {
  const name = typeName(value);
  return NATIVES.has(name) && Schemas.isScalarOf(NATIVES.get(name), value) ? name : null;
}

export function article(noun: string): string {
  return `${"aeiou".includes(noun[0] as string) ? "an" : "a"} ${noun}`;
}

/** Validation options: references in `bound` are bound, and with `core`, every operator must be in its kind's
 * vocabulary. */
export interface ValidateOptions {
  bound?: Iterable<string>;
  core?: boolean;
}

// --- Protocols ---

/** A term's structure: its `kind`, its native `attributes` by name, and its ordered `arguments` (null where a slot is
 * empty). It is mbse-schemas' neutral form of a term, which a schema holds where a literal would stand. */
export const Form = Schemas.Form.Data;
export type Form = Schemas.Form.Data;

/** An expression of some dialect: a value of its kind's meta-schema, read through `reader()` as any value is, and
 * structurally traversable. */
export interface Expression {
  dialect(): Dialect;
  form(): Form;
  validate(options?: ValidateOptions): string[];
  reader(): Readers.OfObject;
}

/** An expression language: its kinds, their meta-schemas and builders, and its static checks. */
export interface Dialect {
  readonly Schema: Schemas.OfUnion.Data;
  readonly store: Proxies.OfStore;
  name(): string;
  /** The data class of each kind, by tag. */
  kinds(): ReadonlyMap<string, TermClass>;
  /** The meta-schema of `expression`'s kind, which its value is of. */
  schema_of(expression: unknown): Schemas.OfObject.Data;
  /** The expression a value of one of its kinds' meta-schemas holds, such as one read from JSON. */
  term(value: Readers.OfObject): Expression;
  /** The expression with this form. */
  make(form: Form): Expression;
  /** The expression a spec denotes: an expression, a `Writer`, a native value (a literal) or a callable taking the
   * dialect's `AnyBuilder`. */
  resolve(spec: unknown): Expression;
  /** Problems with `expression`. References must be bound by an enclosing binding or be in `bound`. With `core`,
   * every operator must be in its kind's vocabulary. */
  validate(expression: unknown, options?: ValidateOptions): string[];
  /** The domain of `expression`'s value (a spec), with the references in `environment` of the given domains. */
  infer(expression: unknown, environment?: Record<string, Domains.Domain>): Domains.Domain;
}

// --- Data ---

/** A kind: a class derived from `Term`. */
export type TermClass = typeof Term;

/** The fields of a kind, in constructor order. */
export function fieldsOf(kind: TermClass): string[] {
  return [...(kind.VALUE !== null ? ["value"] : []), ...kind.PROPERTIES.keys(), ...kind.SLOTS,
    ...(kind.VARIADIC !== null ? [kind.VARIADIC] : []), ...kind.VALUES.keys()];
}

/** A property that holds a value object rather than a native: the `schema` of its value, and the conversions between
 * the field's data and the value's plain form. */
export class ValueProperty {
  constructor(readonly schema: Schemas.OfAny.Data, readonly to_plain: (value: unknown) => Plain.PlainData,
    readonly from_plain: (plain: Plain.PlainData) => unknown) {}
}

/** Shared by every kind's data: schema name, its value through `reader()`, and the structural view. `Declared` sets
 * `DIALECT`, `NAME`, `FIELDS` and `Schema`. */
export abstract class Term implements Expression {
  static DIALECT: Declared;
  static NAME: string;
  static FIELDS: readonly string[];
  static Schema: Schemas.OfObject.Data;
  static KIND: string;
  static ROLE: string;
  static VALUE: ReadonlyMap<string, unknown> | null = null;
  static PROPERTIES: ReadonlyMap<string, unknown> = new Map();
  static OPTIONAL: ReadonlySet<string> = new Set();
  static LEXICAL = true;
  static AMBIENT: ReadonlySet<string> = new Set();
  static SLOTS: readonly string[] = [];
  static REFERS: ReadonlySet<string> = new Set();
  static VARIADIC: string | null = null;
  static OPERATOR: string | null = null;
  static VOCABULARY: ReadonlyMap<string, Domains.Signature> | null = null;
  static SIGNATURE: Domains.Signature | null = null;
  static VALUES: ReadonlyMap<string, ValueProperty> = new Map();

  constructor(...fields: unknown[]) {
    const kind = this.kind();
    fieldsOf(kind).forEach((name, i) => {
      const given = fields[i];
      (this as unknown as Record<string, unknown>)[name] = given !== undefined ? given
        : name === kind.VARIADIC ? [] : null;
    });
  }

  /** The term's kind: its class. */
  kind(): TermClass {
    return this.constructor as TermClass;
  }

  /** A field's value. */
  field(name: string): unknown {
    return (this as unknown as Record<string, unknown>)[name];
  }

  schema_name(): string {
    return this.kind().NAME;
  }

  dialect(): Declared {
    return this.kind().DIALECT;
  }

  /** This expression as a value of its kind's meta-schema, a standalone value in its dialect's `store`, which
   * serializers, validation and comparison read as any value. Built anew from its plain form, which the store checks
   * against the meta-schema: an expression that does not fit it throws `DecodeError`, a cycle `ValueError`. */
  reader(): Readers.OfObject {
    return Plain.FromPlain(this.dialect().store).Value(this.kind().Schema, plainOf(this, new Set())) as Readers.OfObject;
  }

  /** The term's arguments: its slots, then its variadic arguments. */
  argumentsOf(): unknown[] {
    const kind = this.kind();
    const fixed = kind.SLOTS.map((slot) => this.field(slot));
    return kind.VARIADIC !== null ? [...fixed, ...(this.field(kind.VARIADIC) as unknown[])] : fixed;
  }

  /** The names an import binds within its body, for lexical references; none by default. */
  binds(): string[] {
    return [];
  }

  /** The kind's own problems, beyond those of its role; none by default. */
  check(): string[] {
    return [];
  }

  /** A literal's own domain, when it carries one; null for its value's default, and for other kinds. */
  typed(): Domains.Domain | null {
    return null;
  }

  form(): Form {
    const kind = this.kind();
    const attributes = new Map<string, Native>();
    if (kind.VALUE !== null && this.field("value") !== null) attributes.set("value", this.field("value") as Native);
    for (const name of [...kind.PROPERTIES.keys(), ...kind.VALUES.keys()]) {
      if (this.field(name) !== null) attributes.set(name, this.field(name) as Native);
    }
    return new Form(kind.KIND, attributes, this.argumentsOf());
  }

  /** Problems with this expression. References must be bound by an enclosing binding or be in `bound`. With `core`,
   * every operator must be in its kind's vocabulary. */
  validate(options: ValidateOptions = {}): string[] {
    return this.dialect().validate(this, options);
  }
}

/** The name of an application's or a quantifier's operator: its `OPERATOR` property, or its kind's tag. */
export function operatorOf(node: Term): string {
  const kind = node.kind();
  return kind.OPERATOR === null ? kind.KIND : node.field(kind.OPERATOR) as string;
}

/** A reference's, binding's or import's name: its first property. */
export function nameOf(node: Term): unknown {
  const first = node.kind().PROPERTIES.keys().next();
  return first.done ? null : node.field(first.value);
}

/** The property that holds a literal's value; throws if the kind cannot hold it. */
function checkValue(kind: TermClass, value: unknown): string {
  const name = nativeName(value);
  if (name === null) throw new TypeError(`${article(kind.KIND)} must hold a native value, got ${typeName(value)}`);
  if (!(kind.VALUE as ReadonlyMap<string, unknown>).has(name)) throw new TypeError(`${article(kind.KIND)} cannot hold a ${name}`);
  return name;
}

// --- Values: a term as an mbse-schemas value of its meta-schema ---

/** A native's plain form; anything else as itself, for decoding to refuse with its path. */
function scalar(value: unknown): unknown {
  const host = Schemas.hostOf(value);
  return host !== null ? new Schemas.OfScalar.Data(host).to_plain(value as Native) : value;
}

function nativeOf(native: unknown, plain: unknown): unknown {
  return plain === undefined || plain === null ? null : new Schemas.OfScalar.Data(native as never).from_plain(plain);
}

/** The arguments written in `arguments`, in order: the slots but those that refer, then the variadic ones. */
function written(term: Term): unknown[] {
  const kind = term.kind();
  const fixed = kind.SLOTS.filter((slot) => !kind.REFERS.has(slot)).map((slot) => term.field(slot));
  return kind.VARIADIC !== null ? [...fixed, ...(term.field(kind.VARIADIC) as unknown[])] : fixed;
}

function holdsArguments(kind: TermClass): boolean {
  return kind.SLOTS.some((slot) => !kind.REFERS.has(slot)) || kind.VARIADIC !== null;
}

/** The name a slot that refers writes: a definition's name, or the name it already holds. */
function definitionName(definition: unknown): unknown {
  return typeof definition === "string" ? definition : nameOf(definition as Term);
}

/** A term's plain form, nested as its meta-schema writes it: its value under the property named after its native
 * type, its other properties, the names of the definitions it refers to, its value properties' plain forms, and its
 * arguments, each tagged with its kind's meta-schema's name (null for an empty slot). */
function plainOf(term: Term, active: Set<Term>): Plain.PlainMap {
  if (active.has(term)) throw new ValueError("the expression contains a cycle");
  active.add(term);
  const kind = term.kind();
  const out: Plain.PlainMap = new Map();
  const value = term.field("value");
  if (kind.VALUE !== null && value !== null) out.set(checkValue(kind, value), scalar(value) as Plain.PlainData);
  for (const name of kind.PROPERTIES.keys()) {
    if (term.field(name) !== null) out.set(name, scalar(term.field(name)) as Plain.PlainData);
  }
  for (const slot of kind.SLOTS.filter((name) => kind.REFERS.has(name))) {
    if (term.field(slot) !== null) out.set(slot, definitionName(term.field(slot)) as Plain.PlainData);
  }
  for (const [name, field] of kind.VALUES) {
    if (term.field(name) !== null) out.set(name, field.to_plain(term.field(name)));
  }
  const args = written(term);
  if (args.some((argument) => argument !== null)) {
    out.set("arguments", args.map((argument) => (argument === null ? null
      : new Map([[(argument as Term).kind().NAME, plainOf(argument as Term, active)]]))));
  }
  active.delete(term);
  return out;
}

/** The term of `kind` a plain form holds, its arguments of the kinds their tags name. */
function fromPlain(dialect: Declared, kind: TermClass, plain: Plain.PlainMap): Term {
  const fields: Record<string, unknown> = {};
  if (kind.VALUE !== null) {
    const held = [...kind.VALUE].find(([name]) => plain.has(name));
    fields["value"] = held === undefined ? null : nativeOf(held[1], plain.get(held[0]));
  }
  for (const [name, native] of kind.PROPERTIES) fields[name] = nativeOf(native, plain.get(name));
  for (const slot of kind.REFERS) fields[slot] = plain.get(slot) ?? null;
  for (const [name, field] of kind.VALUES) {
    const held = plain.get(name) ?? null;
    fields[name] = held === null ? null : field.from_plain(held);
  }
  const named = new Map(dialect.terms().map((term) => [term.NAME, term] as const));
  const args = ((plain.get("arguments") ?? []) as (Plain.PlainMap | null)[]).map((item) => {
    if (item === null) return null;
    const [[tag, held]] = [...item] as [[string, Plain.PlainMap]];
    return fromPlain(dialect, named.get(tag) as TermClass, held);
  });
  const slots = kind.SLOTS.filter((slot) => !kind.REFERS.has(slot));
  slots.forEach((slot, i) => { fields[slot] = args[i] ?? null; });
  if (kind.VARIADIC !== null) fields[kind.VARIADIC] = args.slice(slots.length);
  return new (kind as unknown as new (...f: unknown[]) => Term)(...fieldsOf(kind).map((name) => fields[name]));
}

// --- Builders ---

function noArguments(method: string, args: unknown[]): void {
  if (args.length > 0) throw new TypeError(`${method}() takes no arguments (${args.length} given)`);
}

/**
 * A kind's builder: `create()`, or `clone()` and `update()` of a source term, none of which validate, with the DSL:
 * `.set(name, native)` sets a property ('value' is a literal's value), `.arguments(...specs)` appends arguments to a
 * variadic kind and `.argument(slot, spec)` fills a slot; specs are resolved by the dialect. A term's value is built
 * through its dialect's `store`, as any value is.
 */
export class Builder {
  static DATA: TermClass;
  protected readonly source: Term | undefined;
  protected readonly fields: Record<string, unknown> = {};

  constructor(instance?: Term) {
    const data = (new.target as typeof Builder).DATA;
    if (instance !== undefined && (instance as object | null)?.constructor !== data) {
      throw new TypeError(`expected ${data.KIND} data to build from, got ${typeName(instance)}`);
    }
    this.source = instance;
    for (const name of fieldsOf(data)) {
      this.fields[name] = instance !== undefined ? instance.field(name) : name === data.VARIADIC ? [] : null;
    }
  }

  protected get data(): TermClass {
    return (this.constructor as typeof Builder).DATA;
  }

  // DSL

  set(name: string, value: unknown): this {
    const kind = this.data;
    if (!(name === "value" && kind.VALUE !== null || kind.PROPERTIES.has(name) || kind.VALUES.has(name))) {
      throw new KeyError(`${article(kind.KIND)} has no attribute ${repr(name)}`);
    }
    this.fields[name] = value;
    return this;
  }

  arguments(...specs: unknown[]): this {
    const variadic = this.data.VARIADIC;
    if (variadic === null) throw new TypeError(`${article(this.data.KIND)} has no variadic arguments`);
    this.fields[variadic] = [...(this.fields[variadic] as unknown[]), ...specs.map((spec) => this.data.DIALECT.resolve(spec))];
    return this;
  }

  argument(slot: string, spec: unknown): this {
    if (!this.data.SLOTS.includes(slot)) throw new KeyError(`${article(this.data.KIND)} has no argument ${repr(slot)}`);
    this.fields[slot] = this.data.DIALECT.resolve(spec);
    return this;
  }

  // Finalizing

  private made(): Term {
    const kind = this.data;
    return new (kind as unknown as new (...f: unknown[]) => Term)(...fieldsOf(kind).map((name) => this.fields[name]));
  }

  create(...args: unknown[]): any {
    noArguments("create", args);
    if (this.source !== undefined) {
      throw new ValueError("create() is only valid without a source instance; use clone() or update()");
    }
    return this.made();
  }

  /** A new term of the fields built; arguments are shared, not copied. */
  clone(...args: unknown[]): any {
    noArguments("clone", args);
    if (this.source === undefined) throw new ValueError("clone() is only valid with a source instance");
    return this.made();
  }

  update(...args: unknown[]): any {
    noArguments("update", args);
    if (this.source === undefined) throw new ValueError("update() is only valid with a source instance");
    const made = this.made(); // as its class makes it, then into the source
    const target = this.source as unknown as Record<string, unknown>;
    for (const name of fieldsOf(this.data)) target[name] = made.field(name);
    return this.source;
  }
}

/** Selects an expression of the dialect: `.select(spec)`, or a dialect's `as_<kind>(spec)` methods. Finalizing
 * yields that expression. */
export class AnyBuilder {
  static DIALECT: Declared;
  protected readonly source: Term | undefined;
  protected selected: Term | undefined;

  constructor(instance?: Term) {
    this.source = instance;
  }

  select(spec: unknown): this {
    this.selected = (this.constructor as typeof AnyBuilder).DIALECT.resolve(spec);
    return this;
  }

  private requireSelected(): Term {
    if (this.selected === undefined) throw new ValueError("no kind selected; call an as_<kind> method");
    return this.selected;
  }

  create(...args: unknown[]): any {
    noArguments("create", args);
    if (this.source !== undefined) {
      throw new ValueError("create() is only valid without a source instance; use clone() or update()");
    }
    return this.requireSelected();
  }

  /** The selected expression, or a shallow copy of the source (arguments are shared, not copied). */
  clone(...args: unknown[]): any {
    noArguments("clone", args);
    if (this.source === undefined) throw new ValueError("clone() is only valid with a source instance");
    if (this.selected !== undefined) return this.selected;
    const kind = this.source.kind();
    return new (kind as unknown as new (...f: unknown[]) => Term)(...fieldsOf(kind).map((n) => this.source?.field(n)));
  }

  update(...args: unknown[]): any {
    noArguments("update", args);
    if (this.source === undefined) throw new ValueError("update() is only valid with a source instance");
    const selected = this.requireSelected();
    if (selected.constructor !== this.source.constructor) {
      throw new TypeError("update() cannot change the kind of the source expression");
    }
    const target = this.source as unknown as Record<string, unknown>;
    for (const name of fieldsOf(selected.kind())) target[name] = selected.field(name);
    return this.source;
  }
}

// --- Specs ---

/** An expression written with methods; each dialect derives its own. A `Writer` is a spec; `.data` is its
 * expression. */
export class Writer {
  constructor(readonly data: any) {}
}

/** Resolves a spec: data is used as is, a `Writer` gives its data, and a callable is given a new builder and must
 * return it. */
export function resolve<D>(spec: unknown, isData: (value: unknown) => value is D, builder: () => unknown,
  expected: string): D {
  if (spec instanceof Writer) spec = spec.data;
  if (isData(spec)) return spec;
  if (isClassLike(spec)) throw new TypeError(`a class is not a Spec here, got ${tokenName(spec)}`);
  if (typeof spec === "function") {
    const built = (spec as (b: unknown) => unknown)(builder());
    if (built === null || built === undefined || typeof (built as { create?: unknown }).create !== "function") {
      throw new TypeError(`a Spec callable must return its builder, got ${repr(built)}`);
    }
    return (built as { create(): D }).create();
  }
  throw new TypeError(`expected ${expected} or a callable taking its builder, got ${repr(spec)}`);
}

// --- Meta-schemas and the store ---

type BranchBuilder = Parameters<Parameters<Schemas.OfUnion.Builder["branches"]>[0]>[0];

function nativeProperty(name: string, native: unknown) {
  return (p: Schemas.OfProperty.Builder) => p.name(name).of(new Schemas.OfScalar.Data(native as never));
}

/** An argument's schema: a value of any type, an expression of any dialect, which the wire tags with its kind's
 * meta-schema's registered name, since a dialect's terms hold its extensions'. */
export const ARGUMENT = new Schemas.OfAny.Builder().create();

/** A kind's meta-schema, a value object schema: one property per native type its value may have, its properties, the
 * name of each definition it refers to, its value properties, and `arguments` (if it has arguments), a dense container
 * of them by index. */
function schemaOf(kind: TermClass): Schemas.OfObject.Data {
  const refers = kind.SLOTS.filter((slot) => kind.REFERS.has(slot)).map((slot) => [slot, String] as const);
  const natives = [...(kind.VALUE ?? new Map()), ...kind.PROPERTIES, ...refers];
  const values = [...kind.VALUES].map(([name, field]) => (p: Schemas.OfProperty.Builder) => p.name(name).of(field.schema));
  const args = holdsArguments(kind) ? [(p: Schemas.OfProperty.Builder) => p.name("arguments").of(
    new Schemas.OfContainer.Builder().index(new Schemas.OfScalar.Data(BigInt)).element(ARGUMENT).create())] : [];
  return new Schemas.OfObject.Builder().name(kind.NAME)
    .properties(...natives.map(([name, native]) => nativeProperty(name, native)), ...values, ...args).create();
}

/** A quantifier's signature: it also gives the domain of a collection's items. */
interface Quantified {
  items(collection: Domains.Domain): Domains.Domain;
}

/** How a dialect is declared, beyond its kinds. */
export interface Declaration {
  /** A literal's domain. */
  domain_of(value: Native): Domains.Domain;
  /** Builders by tag; derived where not given. */
  builders?: ReadonlyMap<string, typeof Builder>;
  anyBuilder?: typeof AnyBuilder;
  /** Schema names by tag; by default 'Expressions.<name>.Of<Kind>'. */
  schemaNames?: ReadonlyMap<string, string>;
  /** The dialect this one extends: its kinds are the base's and its own. */
  extends?: Declared;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// --- Dialects declared by their kinds ---

type Environment = Record<string, Domains.Domain>;

/** Every dialect declared so far, in declaration order. */
export const DIALECTS: Declared[] = [];

/** Registers the meta-schemas of every dialect declared so far in `store`, e.g. a `Proxies.OfStore` that writes and
 * reads expressions of several dialects. Returns the store. */
export function register<S extends { names(): readonly string[]; register(schema: never): void }>(store: S): S {
  for (const dialect of DIALECTS) dialect.register(store);
  return store;
}

/** A dialect declared by its kinds' data classes, from which it derives their builders (unless given), meta-schemas,
 * the union `Schema`, whose branches are named by the kinds' tags, `store`, a store of proxies holding the meta-schemas
 * of the kinds it accepts (`terms()`), in which an expression's value is built and from which `term(value)` rebuilds
 * one, `register(store)`, which registers its meta-schemas in another store, and `make`, `resolve`, `validate` and
 * `infer`. */
export class Declared implements Dialect {
  readonly classes: readonly TermClass[];
  /** The dialect this one extends, or null. */
  readonly base: Declared | null;
  /** The dialects that extend this one. */
  readonly extensions: Declared[] = [];
  readonly builders: Map<string, typeof Builder>;
  readonly AnyBuilder: typeof AnyBuilder;
  readonly Schema: Schemas.OfUnion.Data;
  readonly store: Proxies.OfStore;
  readonly schemas: ReadonlyMap<string, Schemas.OfObject.Data>;
  private readonly byTag: Map<string, TermClass>;
  private readonly domainOf: (value: Native) => Domains.Domain;

  constructor(private readonly dialectName: string, kinds: readonly TermClass[], declaration: Declaration) {
    this.domainOf = declaration.domain_of;
    const base = declaration.extends ?? null;
    this.base = base;
    const inherited = base?.kinds() ?? new Map<string, TermClass>();
    const clashes = kinds.map((kind) => kind.KIND).filter((tag) => inherited.has(tag)).sort();
    if (clashes.length > 0) {
      throw new ValueError(`${dialectName} would declare ${clashes.map((tag) => repr(tag)).join(", ")}, which ${(base as Declared).name()} has`);
    }
    this.classes = [...(base?.classes ?? []), ...kinds];
    this.byTag = new Map([...inherited, ...kinds.map((kind) => [kind.KIND, kind] as const)]);
    this.builders = new Map([...(base?.builders ?? []), ...(declaration.builders ?? [])]);
    const schemas = new Map<string, Schemas.OfObject.Data>(base?.schemas ?? []);
    for (const kind of kinds) {
      kind.DIALECT = this;
      kind.NAME = declaration.schemaNames?.get(kind.KIND) ?? `Expressions.${dialectName}.Of${capitalize(kind.KIND)}`;
      kind.FIELDS = fieldsOf(kind);
      let builder = this.builders.get(kind.KIND);
      if (builder === undefined) {
        builder = class extends Builder {
          static override DATA = kind;
        };
        Object.defineProperty(builder, "name", { value: `${kind.name}Builder` });
      }
      kind.Schema = schemaOf(kind);
      schemas.set(kind.NAME, kind.Schema);
      this.builders.set(kind.KIND, builder);
    }
    this.schemas = schemas;
    DIALECTS.push(this);
    base?.extensions.push(this);
    this.AnyBuilder = declaration.anyBuilder ?? class extends AnyBuilder {};
    this.AnyBuilder.DIALECT = this;
    this.Schema = new Schemas.OfUnion.Builder().branches(
      ...this.classes.map((kind) => (b: BranchBuilder) => b.name(kind.KIND).of(kind.Schema)),
    ).create();
    this.store = this.register(new Proxies.OfStore());
    for (let above = base; above !== null; above = above.base) this.register(above.store); // a base accepts its extensions' terms
  }

  /** The kinds whose expressions this dialect accepts as arguments: its own, and its extensions'. */
  terms(): readonly TermClass[] {
    return [...new Set([...this.classes, ...this.extensions.flatMap((extension) => extension.terms())])];
  }

  /** Whether `value` is an expression this dialect accepts as an argument: of its own kinds, or its extensions'. */
  accepts(value: unknown): value is Term {
    return value instanceof Term && this.terms().includes(value.kind());
  }

  /** Registers the dialect's meta-schemas in `store` (e.g. a `Proxies.OfStore`, to build expressions' values there),
   * skipping those it already holds. Returns the store. */
  register<S extends { names(): readonly string[]; register(schema: never): void }>(store: S): S {
    for (const [schemaName, schema] of this.schemas) if (!store.names().includes(schemaName)) store.register(schema as never);
    return store;
  }

  name(): string {
    return this.dialectName;
  }

  kinds(): Map<string, TermClass> {
    return new Map(this.byTag);
  }

  /** Whether `value` is an expression of this dialect. */
  isExpression(value: unknown): value is Term {
    return value instanceof Term && this.classes.includes(value.kind());
  }

  schema_of(expression: unknown): Schemas.OfObject.Data {
    if (!this.isExpression(expression)) throw new TypeError(`not an expression: ${repr(expression)}`);
    return expression.kind().Schema;
  }

  /** The expression a value of the meta-schema of one of the kinds it accepts holds, such as one read from JSON
   * (`JSON.FromJSON(dialect.store)(Terms.ARGUMENT, text)`) or built through `store`: a new term, its arguments too. */
  term(value: Readers.OfObject): any {
    const schema = value.as_schema();
    const kind = this.terms().find((term) => term.Schema === schema);
    if (kind === undefined) throw new TypeError(`not a value of a ${this.dialectName} kind: ${repr(schema.name)}`);
    return fromPlain(this, kind, Plain.ToPlain(this.store).Value(schema, value) as Plain.PlainMap);
  }

  toString(): string {
    return `<dialect ${this.dialectName}>`;
  }

  // Construction

  make(form: Form): any {
    const kind = this.byTag.get(form.kind);
    if (kind === undefined) throw new ValueError(`${this.dialectName} has no kind ${repr(form.kind)}`);
    const allowed = [...(kind.VALUE !== null ? ["value"] : []), ...kind.PROPERTIES.keys(), ...kind.VALUES.keys()];
    for (const name of form.attributes.keys()) {
      if (!allowed.includes(name)) throw new ValueError(`${article(kind.KIND)} has no attribute ${repr(name)}`);
    }
    const slots = kind.SLOTS.length;
    const count = form.arguments.length;
    if (kind.VARIADIC === null && count !== slots) {
      throw new ValueError(`${article(kind.KIND)} takes ${slots} arguments, got ${count}`);
    }
    if (count < slots) throw new ValueError(`${article(kind.KIND)} takes at least ${slots} arguments, got ${count}`);
    const fields: Record<string, unknown> = {};
    for (const name of allowed) fields[name] = form.attributes.get(name) ?? null;
    kind.SLOTS.forEach((slot, i) => { fields[slot] = form.arguments[i]; });
    if (kind.VARIADIC !== null) fields[kind.VARIADIC] = form.arguments.slice(slots);
    return new (kind as unknown as new (...f: unknown[]) => Term)(...fieldsOf(kind).map((name) => fields[name]));
  }

  /** The literal holding `value`, of the first literal kind that can hold it. */
  literal(value: Native): any {
    const name = nativeName(value);
    for (const kind of this.classes) {
      if (kind.ROLE === LITERAL && name !== null && (kind.VALUE as ReadonlyMap<string, unknown>).has(name)) {
        return new (kind as unknown as new (...f: unknown[]) => Term)(value);
      }
    }
    return null;
  }

  resolve(spec: unknown): any {
    if (nativeName(spec) !== null) {
      const made = this.literal(spec as Native);
      if (made !== null) return made;
    }
    return resolve(spec, (v): v is Term => this.accepts(v), () => new this.AnyBuilder(),
      "an expression, a native value");
  }

  // Checks

  validate(expression: unknown, options: ValidateOptions = {}): string[] {
    return this.problems(expression, new Set(options.bound ?? []), options.core ?? false, new Set());
  }

  /** Problems with `expression`; `active` holds the expressions being checked, to find cycles. */
  private problems(expression: unknown, bound: ReadonlySet<string>, core: boolean, active: Set<unknown>): string[] {
    if (!this.isExpression(expression)) return [`not an expression: ${repr(expression)}`];
    const kind = expression.kind();
    const what = article(kind.KIND);
    if (kind.ROLE === LITERAL) {
      const value = expression.field("value");
      if (value === null) return [`${what} needs a value`];
      try {
        checkValue(kind, value);
      } catch (error) {
        return [(error as Error).message];
      }
      return expression.check();
    }
    const found: string[] = [];
    for (const [name, native] of kind.PROPERTIES) {
      if (kind.OPTIONAL.has(name) && expression.field(name) === null) continue;
      found.push(...propertyProblems(what, name, native, expression.field(name)));
    }
    found.push(...expression.check());
    const name = nameOf(expression) as string;
    if (kind.ROLE === REFERENCE) {
      if (kind.LEXICAL && found.length === 0 && !bound.has(name) && !kind.AMBIENT.has(name)) {
        found.push(`${kind.KIND} ${repr(name)} is not bound`);
      }
      return found;
    }
    if (active.has(expression)) return ["the expression contains a cycle"];
    active.add(expression);
    const args = expression.argumentsOf();
    let scopes: ReadonlySet<string>[] = args.map(() => bound);
    if (kind.ROLE === BINDING || kind.ROLE === QUANTIFIER) {
      const inner = found.length === 0 ? new Set([...bound, name]) : bound;
      scopes = args.map((_, i) => (i === 0 ? bound : inner));
    } else if (kind.ROLE === IMPORT) {
      const inner = found.length === 0 ? new Set([...bound, ...expression.binds()]) : bound;
      scopes = args.map(() => inner);
    }
    if ((kind.ROLE === APPLICATION || kind.ROLE === QUANTIFIER) && found.length === 0 && kind.VOCABULARY !== null) {
      const operator = operatorOf(expression);
      const signature = kind.VOCABULARY.get(operator);
      if (signature !== undefined && ![-1, args.length].includes(signature.arity())) { // -1: any number
        found.push(`${operator} takes ${signature.arity()} arguments, got ${args.length}`);
      } else if (core && signature === undefined) {
        found.push(`${repr(operator)} is not a core operation`);
      }
    }
    args.forEach((argument, i) => {
      const label = i < kind.SLOTS.length ? kind.SLOTS[i] as string : `argument ${i - kind.SLOTS.length}`;
      if (argument === null) found.push(`${what} needs ${article(label)}`);
      else if (kind.REFERS.has(label) && (typeof argument === "string" || active.has(argument))) return; // a definition named, which its holder resolves; or recursion, referred to while checked
      else found.push(...this.problems(argument, scopes[i] as ReadonlySet<string>, core, active).map((p) => `${label}: ${p}`));
    });
    active.delete(expression);
    return found;
  }

  infer(expression: unknown, environment: Environment = {}): Domains.Domain {
    const resolved = this.resolve(expression) as Term;
    const problems = this.validate(resolved, { bound: Object.keys(environment) });
    if (problems.length > 0) throw new ValueError(`cannot infer the domain of an invalid expression: ${problems[0]}`);
    return this.inferIn(resolved, { ...environment }, new Map());
  }

  private inferIn(expression: Term, environment: Environment, memo: Map<Environment, Map<Term, Domains.Domain>>): Domains.Domain {
    let known = memo.get(environment);
    if (known === undefined) memo.set(environment, known = new Map());
    let domain = known.get(expression);
    if (domain === undefined) known.set(expression, domain = this.inferTerm(expression, environment, memo));
    return domain;
  }

  private inferTerm(expression: Term, environment: Environment, memo: Map<Environment, Map<Term, Domains.Domain>>): Domains.Domain {
    const kind = expression.kind();
    if (kind.ROLE === LITERAL) return expression.typed() ?? this.domainOf(expression.field("value") as Native);
    if (kind.ROLE === REFERENCE) {
      const name = nameOf(expression) as string;
      return kind.LEXICAL && Object.hasOwn(environment, name) ? environment[name] as Domains.Domain : Domains.Anything;
    }
    const args = expression.argumentsOf() as Term[];
    if (kind.ROLE === IMPORT) {
      const inner: Environment = { ...environment };
      for (const name of expression.binds()) inner[name] = Domains.Anything;
      return this.inferIn(args[args.length - 1] as Term, inner, memo);
    }
    if (kind.ROLE === BINDING) {
      const value = this.inferIn(args[0] as Term, environment, memo);
      return this.inferIn(args[args.length - 1] as Term, { ...environment, [nameOf(expression) as string]: value }, memo);
    }
    const operator = operatorOf(expression);
    const signature = kind.VOCABULARY === null ? kind.SIGNATURE : kind.VOCABULARY.get(operator) ?? null;
    let domains: Domains.Domain[];
    if (kind.ROLE === QUANTIFIER) { // its name has the domain of the collection's items
      const collection = this.inferIn(args[0] as Term, environment, memo);
      const item = signature === null ? Domains.Anything : (signature as unknown as Quantified).items(collection);
      const inner = { ...environment, [nameOf(expression) as string]: item };
      domains = [collection, ...args.slice(1).map((argument) => this.inferIn(argument as Term, inner, memo))];
    } else {
      domains = args.map((argument) => this.inferIn(argument, environment, memo));
    }
    if (signature === null) return Domains.Anything; // an extension: nothing is known about it
    const result = signature.result(domains);
    if (result === null) {
      const names = domains.map((domain) => domain.name()).join(", ");
      throw new TypeError(`${operator} cannot take (${names}); it takes ${signature.describe()}`);
    }
    return expression.typed() ?? result; // an application of a domain of its own gives it
  }
}

function propertyProblems(what: string, name: string, native: unknown, value: unknown): string[] {
  if (value === null || value === "") return [`${what} needs ${article(name)}`];
  if (!Schemas.isScalarOf(native, value)) return [`${what}'s ${name} must be a ${tokenName(native)}, got ${typeName(value)}`];
  return [];
}

// --- Traversal ---

/** An expression's arguments that are expressions: not empty slots, nor the names of definitions referred to. */
function argumentsOf(expression: Term): Term[] {
  return expression.form().arguments.filter((argument): argument is Term => argument instanceof Term);
}

/** Every expression reachable from `expression`, each once, parents before their arguments and arguments in order.
 * Shared sub-expressions are visited once, and cycles end the walk rather than repeat it. */
export function* walk(expression: Term): Generator<any> {
  const seen = new Set<Term>();
  const stack = [expression];
  while (stack.length > 0) {
    const node = stack.pop() as Term;
    if (seen.has(node)) continue;
    seen.add(node);
    yield node;
    stack.push(...argumentsOf(node).reverse());
  }
}

/** Combines an expression bottom-up: `fn(node, results)` is called once per term, shared ones included, with the
 * results for its arguments (null for empty slots, and a definition's name as itself). Throws on cycles. */
export function fold<R>(expression: Term, fn: (node: any, results: any[]) => R): R {
  const memo = new Map<Term, R>();
  const active = new Set<Term>();
  const visit = (node: Term): R => {
    if (memo.has(node)) return memo.get(node) as R;
    if (active.has(node)) throw new ValueError("the expression contains a cycle");
    active.add(node);
    const results = node.form().arguments.map((argument) => (argument instanceof Term ? visit(argument) : argument));
    active.delete(node);
    const result = fn(node, results);
    memo.set(node, result);
    return result;
  };
  return visit(expression);
}

/** Natives of one type by value; NaN is NaN, and -0.0 is not 0.0. */
/** Natives of one type by value (NaN is NaN, -0.0 is not 0.0); a value field's data, such as a domain, by `equals`. */
export function sameNative(a: unknown, b: unknown): boolean {
  if (typeName(a) !== typeName(b)) return false;
  if (typeof (a as { equals?: unknown } | null)?.equals === "function") return (a as { equals(other: unknown): boolean }).equals(b);
  if (typeof a === "number") return Object.is(a, b);
  if (a instanceof Uint8Array) {
    const other = b as Uint8Array;
    return a.length === other.length && a.every((byte, i) => byte === other[i]);
  }
  return a === b;
}

/** Whether two expressions have the same structure: co-traverses them, comparing kinds, attributes (natives of one
 * type by value; NaN is NaN, and -0.0 is not 0.0) and arguments in order. Sharing is not compared. */
export function same(a: unknown, b: unknown): boolean {
  const assumed = new Map<unknown, Set<unknown>>();
  const visit = (x: unknown, y: unknown): boolean => {
    if (!(x instanceof Term) || !(y instanceof Term)) return x === y; // empty slots, or the names of definitions referred to
    if (assumed.get(x)?.has(y)) return true; // a cycle: the same if they are the same everywhere else
    if (!assumed.has(x)) assumed.set(x, new Set());
    assumed.get(x)?.add(y);
    const [fx, fy] = [(x as Term).form(), (y as Term).form()];
    const keys = [...fx.attributes.keys()];
    return (x as object).constructor === (y as object).constructor && fx.kind === fy.kind
      && keys.length === fy.attributes.size && keys.every((k) => fy.attributes.has(k))
      && keys.every((k) => sameNative(fx.attributes.get(k), fy.attributes.get(k)))
      && fx.arguments.length === fy.arguments.length && fx.arguments.every((arg, i) => visit(arg, fy.arguments[i]));
  };
  return visit(a, b);
}
