/**
 * Expressions: the protocols every dialect's expressions implement, and the machinery that implements them.
 *
 * An expression language (a dialect) is a set of node kinds and a vocabulary of operators. Every dialect's
 * expressions are:
 *
 * - Serializable. Each kind has a meta-schema, an ordinary mbse-schemas object schema tagged by `kind`, and its data
 *   has a builder (`create()` / `clone()` / `update()`) that implements `Visitors.OfObject`. `Dialect.Builders`
 *   rebuilds data from snapshots and `Dialect.Schema` is the union of the kinds' meta-schemas.
 * - Structurally traversable. `Expression.form()` gives a node's `Form`: its kind, its native attributes and its
 *   ordered arguments, which are expressions of the same dialect. `Dialect.make(form)` is the inverse. `walk`, `fold`
 *   and `same` traverse any dialect's expressions through forms alone.
 * - Validatable. `Dialect.validate` reports what evaluation would raise, and `Dialect.infer` finds an expression's
 *   domain from its vocabulary's signatures (see `Domains`).
 * - Evaluatable, by the dialect's own evaluator (see `Evaluators`), and translatable to other dialects (see
 *   `Translators`).
 *
 * A dialect declares each kind as a class derived from `Node`, whose static members say how its fields map to the
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
 * - `QUANTIFIER`: binds the name in its first property to each item of its first argument, a collection, within its
 *   second, and combines the results by its operator (named as an application's is), such as `all`. Its signature
 *   also gives the domain of a collection's items, `items(domain)`, for inference.
 * - `IMPORT`: makes what it declares (a module, a package's functions) available within its one argument, its body.
 *   The scope resolves the declaration; `binds()` gives the names it binds for lexical references.
 *
 * Properties are required unless named in `OPTIONAL`, and `check()` adds a kind's own problems to validation. `VALUES`
 * names properties that hold a value object rather than a native, each described by a `ValueProperty` (its schema, and
 * the conversions between the field's data and the value's plain form), such as a literal's domain. `typed()` gives a
 * literal's own domain, if it has one.
 *
 * Each kind's data is bound to its meta-schema with mbse-schemas' `Bindings`: the kind's fields are read into a
 * `Bindings.State` (its properties, and its `arguments` entries) and made from one, with `kind` fixed, a literal's
 * native properties exclusive and `used_by` implied. `accept`, the builders' visitor protocols and the registry
 * `Builders` are the generic ones; `Builder` adds the DSL. Arguments are fields too: `SLOTS` names fields holding one
 * argument each, in index order, and `VARIADIC` names one field holding an array of the arguments after the slots.
 * Both are written as entries of the adjacency `arguments`, to the relation `Arguments` (registered as
 * 'Expressions.Arguments' and shared by every dialect), which links a `parent` to an `argument` with an `index`. Every
 * kind also declares `used_by`, the same relation seen from the argument, which data never writes. A kind's fields
 * are, in order, `value` (a literal's), its properties, its slots, its variadic field and its value properties, and its
 * constructor takes them in that order.
 */

import { Bindings, Errors, Plain, Proxies, Repr, Schemas } from "@mbse/schemas/Framework";
import type { Visitors } from "@mbse/schemas/Framework";

import * as Domains from "./Domains.js";

const { AttributeError, KeyError, LookupError, ValueError } = Errors;
const { isClassLike, repr, tokenName, typeName } = Repr;
type Callback<V> = Visitors.Callback<V>;
type Native = Visitors.Native;

export const LITERAL = "literal";
export const REFERENCE = "reference";
export const APPLICATION = "application";
export const BINDING = "binding";
export const IMPORT = "import";
export const QUANTIFIER = "quantifier";
export const ARGUMENTS = "Expressions.Arguments";

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
  return NATIVES.has(name) && Schemas.isNativeOf(NATIVES.get(name), value) ? name : null;
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

/** A node's structure: its `kind`, its native `attributes` by name, and its ordered `arguments` (null where a slot is
 * empty). */
export class Form {
  readonly arguments: readonly unknown[];

  constructor(readonly kind: string, readonly attributes: ReadonlyMap<string, Native> = new Map(),
    args: readonly unknown[] = []) {
    this.arguments = args;
  }
}

/** An expression of some dialect: `Visitable`, so it serializes like any object, and structurally traversable. */
export interface Expression extends Visitors.Visitable {
  dialect(): Dialect;
  form(): Form;
  validate(options?: ValidateOptions): string[];
}

/** An expression language: its kinds, their meta-schemas and builders, and its static checks. */
export interface Dialect {
  readonly Schema: Schemas.OfUnion.Data;
  readonly Builders: Bindings.Registry;
  name(): string;
  /** The data class of each kind, by tag. */
  kinds(): ReadonlyMap<string, NodeClass>;
  /** The meta-schema of `expression`'s kind: the root schema for its snapshots. */
  schema_of(expression: unknown): Schemas.OfObject.Data;
  /** The expression with this form. */
  make(form: Form): Expression;
  /** The expression a spec denotes: an expression, a `Term`, a native value (a literal) or a callable taking the
   * dialect's `AnyBuilder`. */
  resolve(spec: unknown): Expression;
  /** Problems with `expression`. References must be bound by an enclosing binding or be in `bound`. With `core`,
   * every operator must be in its kind's vocabulary. */
  validate(expression: unknown, options?: ValidateOptions): string[];
  /** The domain of `expression`'s value (a spec), with the references in `environment` of the given domains. */
  infer(expression: unknown, environment?: Record<string, Domains.Domain>): Domains.Domain;
}

// --- Data ---

let nextIdentity = 0;

/** A kind: a class derived from `Node`. */
export type NodeClass = typeof Node;

/** The fields of a kind, in constructor order. */
export function fieldsOf(kind: NodeClass): string[] {
  return [...(kind.VALUE !== null ? ["value"] : []), ...kind.PROPERTIES.keys(), ...kind.SLOTS,
    ...(kind.VARIADIC !== null ? [kind.VARIADIC] : []), ...kind.VALUES.keys()];
}

/** A property that holds a value object rather than a native: the `schema` of its value, and the conversions between
 * the field's data and the value's plain form. */
export class ValueProperty {
  constructor(readonly schema: Schemas.OfAny.Data, readonly to_plain: (value: unknown) => Plain.PlainData,
    readonly from_plain: (plain: Plain.PlainData) => unknown) {}
}

/** Shared by every kind's data: identity, schema name, writing through `accept`, and the structural view. `Declared`
 * sets `DIALECT`, `NAME`, `FIELDS` and `Schema`. */
export abstract class Node implements Expression {
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
  static VARIADIC: string | null = null;
  static OPERATOR: string | null = null;
  static VOCABULARY: ReadonlyMap<string, Domains.Signature> | null = null;
  static SIGNATURE: Domains.Signature | null = null;
  static VALUES: ReadonlyMap<string, ValueProperty> = new Map();
  static BINDING: Bindings.Binding;
  private readonly nodeIdentity = ++nextIdentity;

  constructor(...fields: unknown[]) {
    const kind = this.kind();
    fieldsOf(kind).forEach((name, i) => {
      const given = fields[i];
      (this as unknown as Record<string, unknown>)[name] = given !== undefined ? given
        : name === kind.VARIADIC ? [] : null;
    });
  }

  /** The node's kind: its class. */
  kind(): NodeClass {
    return this.constructor as NodeClass;
  }

  /** A field's value. */
  field(name: string): unknown {
    return (this as unknown as Record<string, unknown>)[name];
  }

  /** A text of its own, `expression <n>`, never reused, so that it never equals the identity of another implementation's
   * objects (mbse-schemas' proxies count theirs as numbers), as Python's `id()` never does. */
  identity(): unknown {
    return `expression ${this.nodeIdentity}`;
  }

  schema_name(): string {
    return this.kind().NAME;
  }

  /** Expressions are reference objects, linked by their arguments. */
  owner(): null {
    return null;
  }

  dialect(): Declared {
    return this.kind().DIALECT;
  }

  /** Writes the tag, the value into the property named after its native type, the other properties, then one
   * `arguments` entry per argument, in order, with its index. */
  accept(visitor: Visitors.OfObject): void {
    const kind = this.kind();
    const value = this.field("value");
    if (kind.VALUE !== null && value !== null) checkValue(kind, value);
    Bindings.accept(kind.BINDING, this, visitor);
  }

  /** The node's arguments: its slots, then its variadic arguments. */
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
export function operatorOf(node: Node): string {
  const kind = node.kind();
  return kind.OPERATOR === null ? kind.KIND : node.field(kind.OPERATOR) as string;
}

/** A reference's, binding's or import's name: its first property. */
export function nameOf(node: Node): unknown {
  const first = node.kind().PROPERTIES.keys().next();
  return first.done ? null : node.field(first.value);
}

/** The property that holds a literal's value; throws if the kind cannot hold it. */
function checkValue(kind: NodeClass, value: unknown): string {
  const name = nativeName(value);
  if (name === null) throw new TypeError(`${article(kind.KIND)} must hold a native value, got ${typeName(value)}`);
  if (!(kind.VALUE as ReadonlyMap<string, unknown>).has(name)) throw new TypeError(`${article(kind.KIND)} cannot hold a ${name}`);
  return name;
}

// --- Bindings: a kind's fields in its meta-schema's terms ---

/** A node's state: its value under the property named after its native type (under `value` when it has none), its
 * other properties, its value properties in their plain form, and its arguments as `arguments` entries. */
function read(instance: Node): Bindings.State {
  const kind = instance.kind();
  const values = new Map<string, unknown>();
  const value = instance.field("value");
  if (kind.VALUE !== null && value !== null) {
    const name = nativeName(value);
    values.set(kind.VALUE.has(name as string) ? name as string : "value", value);
  }
  for (const name of kind.PROPERTIES.keys()) values.set(name, instance.field(name));
  for (const [name, field] of kind.VALUES) {
    if (instance.field(name) !== null) values.set(name, field.to_plain(instance.field(name)));
  }
  const args = instance.argumentsOf().flatMap((argument, index) => (argument === null ? []
    : [new Bindings.Entry(new Map([["argument", argument]]), new Map([["index", BigInt(index)]]))]));
  return new Bindings.State(values, new Map(parent(kind) ? [["arguments", args]] : []));
}

function parent(kind: NodeClass): boolean {
  return kind.SLOTS.length > 0 || kind.VARIADIC !== null;
}

/** A literal's value: the one native property it holds, or the value it holds under `value`. */
function valueOf(kind: NodeClass, values: ReadonlyMap<string, unknown>): unknown {
  for (const name of (kind.VALUE as ReadonlyMap<string, unknown>).keys()) {
    if ((values.get(name) ?? null) !== null) return values.get(name);
  }
  return values.get("value") ?? null;
}

function indexOf(entry: Bindings.Entry): bigint | null {
  return (entry.properties.get("index") ?? null) as bigint | null;
}

function checkTarget(kind: NodeClass, entry: Bindings.Entry): unknown {
  const target = entry.links.get("argument") ?? null;
  if (target === null) throw new ValueError("link 'argument' is not set");
  if (!kind.DIALECT.isExpression(target)) throw new TypeError(`an argument must be an expression, got ${typeName(target)}`);
  return target;
}

/** The node a state holds: its fields from the properties, and its arguments from the `arguments` entries, the
 * slots by index and the variadic ones in index order. */
function make(kind: NodeClass, state: Bindings.State): Node {
  const values = state.values;
  const fields: Record<string, unknown> = {};
  for (const name of kind.PROPERTIES.keys()) fields[name] = values.get(name) ?? null;
  if (kind.VALUE !== null) fields["value"] = valueOf(kind, values);
  for (const [name, field] of kind.VALUES) {
    const plain = values.get(name) ?? null;
    fields[name] = plain === null ? null : field.from_plain(plain as Plain.PlainData);
  }
  const entries = state.entries.get("arguments") ?? [];
  const slots = kind.SLOTS.length;
  const parts: unknown[] = Array(slots).fill(null);
  const rest: Bindings.Entry[] = [];
  for (const entry of entries) {
    const index = indexOf(entry);
    if (index !== null && index >= 0n && index < BigInt(slots)) parts[Number(index)] = checkTarget(kind, entry);
    else if (kind.VARIADIC !== null) rest.push(entry);
    else throw new ValueError(slotsMessage(kind, index));
  }
  kind.SLOTS.forEach((slot, i) => { fields[slot] = parts[i]; });
  if (kind.VARIADIC !== null) {
    const last = BigInt(entries.length + slots);
    const key = (entry: Bindings.Entry) => indexOf(entry) ?? last;
    const ordered = [...rest].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
    fields[kind.VARIADIC] = ordered.map((entry) => checkTarget(kind, entry));
  }
  return new (kind as unknown as new (...f: unknown[]) => Node)(...fieldsOf(kind).map((name) => fields[name]));
}

function assign(kind: NodeClass, instance: Node, state: Bindings.State): Node {
  const made = make(kind, state);
  const target = instance as unknown as Record<string, unknown>;
  for (const name of fieldsOf(kind)) target[name] = made.field(name);
  return instance;
}

function bindingOf(kind: NodeClass): Bindings.Binding {
  return new Bindings.Binding(kind.Schema, read, (state) => make(kind, state),
    (instance, state) => assign(kind, instance, state), {
      fixed: new Map([["kind", kind.KIND]]),
      exclusive: kind.VALUE !== null ? [[...kind.VALUE.keys(), "value"]] : [],
      implied: ["used_by"],
    });
}

// --- Builders ---

/** E.g. "a let's value is argument 0 and its body argument 1, got index 2". */
export function slotsMessage(kind: { KIND: string; SLOTS: readonly string[] }, index: unknown): string {
  const parts = kind.SLOTS.map((slot, i) => (i === 0 ? `${slot} is argument 0` : `its ${slot} argument ${i}`));
  const listed = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${article(kind.KIND)}'s ${listed}, got index ${repr(index)}`;
}

function noArguments(method: string, args: unknown[]): void {
  if (args.length > 0) throw new TypeError(`${method}() takes no arguments (${args.length} given)`);
}

/**
 * A kind's builder: mbse-schemas' generic `Bindings.Builder` over the kind's binding, so `create()` / `clone()` /
 * `update()` and `Visitors.OfObject`, with the DSL. None of them validate. DSL: `.set(name, native)` sets a property
 * ('value' is a literal's value), `.arguments(...specs)` appends arguments to a variadic kind and `.argument(slot,
 * spec)` fills a slot; specs are resolved by the dialect.
 */
export class Builder extends Bindings.Builder {
  static DATA: NodeClass;

  constructor(instance?: Node) {
    const data = (new.target as typeof Builder).DATA;
    if (instance !== undefined && (instance as object | null)?.constructor !== data) {
      throw new TypeError(`expected ${data.KIND} data to build from, got ${typeName(instance)}`);
    }
    super(data.BINDING, instance);
  }

  protected get data(): NodeClass {
    return (this.constructor as typeof Builder).DATA;
  }

  // DSL

  set(name: string, value: Native): this {
    const kind = this.data;
    const values = this.state.values;
    if (name === "value" && kind.VALUE !== null) {
      for (const other of [...kind.VALUE.keys(), "value"]) values.delete(other);
      const native = nativeName(value);
      values.set(kind.VALUE.has(native as string) ? native as string : "value", value); // null, or a non-native, is held as `value`
    } else if (kind.PROPERTIES.has(name)) {
      values.set(name, value);
    } else if (kind.VALUES.has(name)) {
      values.set(name, value === null ? null : (kind.VALUES.get(name) as ValueProperty).to_plain(value));
    } else {
      throw new KeyError(`${article(kind.KIND)} has no attribute ${repr(name)}`);
    }
    return this;
  }

  private entries(): Bindings.Entry[] {
    if (!this.state.entries.has("arguments")) this.state.entries.set("arguments", []);
    return this.state.entries.get("arguments") as Bindings.Entry[];
  }

  private entry(spec: unknown, index: bigint): Bindings.Entry {
    return new Bindings.Entry(new Map([["argument", this.data.DIALECT.resolve(spec)]]), new Map([["index", index]]));
  }

  arguments(...specs: unknown[]): this {
    if (this.data.VARIADIC === null) throw new TypeError(`${article(this.data.KIND)} has no variadic arguments`);
    const slots = BigInt(this.data.SLOTS.length);
    for (const spec of specs) {
      const index = slots + BigInt(this.entries().filter((entry) => {
        const at = indexOf(entry);
        return at === null || at >= slots;
      }).length);
      this.entries().push(this.entry(spec, index));
    }
    return this;
  }

  argument(slot: string, spec: unknown): this {
    if (!this.data.SLOTS.includes(slot)) throw new KeyError(`${article(this.data.KIND)} has no argument ${repr(slot)}`);
    const index = BigInt(this.data.SLOTS.indexOf(slot));
    const kept = this.entries().filter((entry) => indexOf(entry) !== index);
    this.entries().splice(0, this.entries().length, ...kept, this.entry(spec, index));
    return this;
  }

  // Finalizing

  override create(...args: unknown[]): any {
    noArguments("create", args);
    return super.create();
  }

  override clone(...args: unknown[]): any {
    noArguments("clone", args);
    return super.clone();
  }

  override update(...args: unknown[]): any {
    noArguments("update", args);
    return super.update();
  }
}

/** Selects an expression of the dialect: `.select(spec)`, or a dialect's `as_<kind>(spec)` methods. Finalizing
 * yields that expression. */
export class AnyBuilder {
  static DIALECT: Declared;
  protected readonly source: Node | undefined;
  protected selected: Node | undefined;

  constructor(instance?: Node) {
    this.source = instance;
  }

  select(spec: unknown): this {
    this.selected = (this.constructor as typeof AnyBuilder).DIALECT.resolve(spec);
    return this;
  }

  private requireSelected(): Node {
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
    return new (kind as unknown as new (...f: unknown[]) => Node)(...fieldsOf(kind).map((n) => this.source?.field(n)));
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

/** An expression written with methods; each dialect derives its own. A `Term` is a spec; `.data` is its expression. */
export class Term {
  constructor(readonly data: any) {}
}

/** Resolves a spec: data is used as is, a `Term` gives its data, and a callable is given a new builder and must return
 * it. */
export function resolve<D>(spec: unknown, isData: (value: unknown) => value is D, builder: () => unknown,
  expected: string): D {
  if (spec instanceof Term) spec = spec.data;
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

// --- Meta-schemas and the registry ---

type BranchBuilder = Parameters<Parameters<Schemas.OfUnion.Builder["branches"]>[0]>[0];

function nativeProperty(name: string, native: unknown) {
  return (p: Schemas.OfProperty.Builder) => p.name(name).of((t) => t.as_native(native as Schemas.OfNative.Spec));
}

export const Arguments = new Schemas.OfRelation.Builder().links("parent", "argument")
  .properties(nativeProperty("index", BigInt)).unique("argument").create();
Proxies.register(ARGUMENTS, Arguments);
const ARGUMENTS_ADJACENCY = (r: Schemas.OfAdjacency.Builder) => r.name("arguments").of(Arguments).me("parent");
const USED_BY = (r: Schemas.OfAdjacency.Builder) => r.name("used_by").of(Arguments).me("argument");

/** A kind's meta-schema: the tag, one property per native type its value may have, its properties, its value fields,
 * and the adjacencies `arguments` (if it has arguments) and `used_by`. */
function schemaOf(kind: NodeClass): Schemas.OfObject.Data {
  const natives = [...(kind.VALUE ?? new Map()), ...kind.PROPERTIES];
  const values = [...kind.VALUES].map(([name, field]) => (p: Schemas.OfProperty.Builder) => p.name(name).of(field.schema));
  const relations = kind.SLOTS.length > 0 || kind.VARIADIC !== null ? [ARGUMENTS_ADJACENCY, USED_BY] : [USED_BY];
  return new Schemas.OfObject.Builder().ref()
    .properties(nativeProperty("kind", String), ...natives.map(([name, native]) => nativeProperty(name, native)), ...values)
    .relations(...relations).create();
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
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// --- Dialects declared by their kinds ---

type Environment = Record<string, Domains.Domain>;

/** A dialect declared by its kinds' data classes, from which it derives their builders (unless given), meta-schemas
 * (registered with `Proxies`), the union `Schema`, whose branches are named by the kinds' tags, the registry `Builders`, and `make`, `resolve`, `validate` and
 * `infer`. */
export class Declared implements Dialect {
  readonly classes: readonly NodeClass[];
  readonly builders: Map<string, typeof Builder>;
  readonly AnyBuilder: typeof AnyBuilder;
  readonly Schema: Schemas.OfUnion.Data;
  readonly Builders: Bindings.Registry;
  private readonly byTag: Map<string, NodeClass>;
  private readonly domainOf: (value: Native) => Domains.Domain;

  constructor(private readonly dialectName: string, kinds: readonly NodeClass[], declaration: Declaration) {
    this.domainOf = declaration.domain_of;
    this.classes = kinds;
    this.byTag = new Map(kinds.map((kind) => [kind.KIND, kind]));
    this.builders = new Map(declaration.builders ?? []);
    const schemas = new Map<string, Schemas.OfObject.Data>();
    const registered = new Map<string, typeof Builder>();
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
      kind.BINDING = bindingOf(kind);
      registered.set(kind.NAME, builder);
      this.builders.set(kind.KIND, builder);
    }
    for (const [schemaName, schema] of schemas) Proxies.register(schemaName, schema);
    this.AnyBuilder = declaration.anyBuilder ?? class extends AnyBuilder {};
    this.AnyBuilder.DIALECT = this;
    this.Schema = new Schemas.OfUnion.Builder().branches(
      ...kinds.map((kind) => (b: BranchBuilder) => b.name(kind.KIND).of(kind.Schema)),
    ).create();
    this.Builders = new Bindings.Registry(new Map([...registered].map(([name, builder]) =>
      [name, [schemas.get(name) as Schemas.OfObject.Data, (instance?: Node) => new builder(instance)] as const])),
      new Map([[ARGUMENTS, Arguments]]));
  }

  name(): string {
    return this.dialectName;
  }

  kinds(): Map<string, NodeClass> {
    return new Map(this.byTag);
  }

  /** Whether `value` is an expression of this dialect. */
  isExpression(value: unknown): value is Node {
    return value instanceof Node && this.classes.includes(value.kind());
  }

  schema_of(expression: unknown): Schemas.OfObject.Data {
    if (!this.isExpression(expression)) throw new TypeError(`not an expression: ${repr(expression)}`);
    return expression.kind().Schema;
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
    return new (kind as unknown as new (...f: unknown[]) => Node)(...fieldsOf(kind).map((name) => fields[name]));
  }

  /** The literal holding `value`, of the first literal kind that can hold it. */
  literal(value: Native): any {
    const name = nativeName(value);
    for (const kind of this.classes) {
      if (kind.ROLE === LITERAL && name !== null && (kind.VALUE as ReadonlyMap<string, unknown>).has(name)) {
        return new (kind as unknown as new (...f: unknown[]) => Node)(value);
      }
    }
    return null;
  }

  resolve(spec: unknown): any {
    if (nativeName(spec) !== null) {
      const made = this.literal(spec as Native);
      if (made !== null) return made;
    }
    return resolve(spec, (v): v is Node => this.isExpression(v), () => new this.AnyBuilder(),
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
      if (signature !== undefined && signature.arity() !== args.length) {
        found.push(`${operator} takes ${signature.arity()} arguments, got ${args.length}`);
      } else if (core && signature === undefined) {
        found.push(`${repr(operator)} is not a core operation`);
      }
    }
    args.forEach((argument, i) => {
      const label = i < kind.SLOTS.length ? kind.SLOTS[i] as string : `argument ${i - kind.SLOTS.length}`;
      if (argument === null) found.push(`${what} needs ${article(label)}`);
      else found.push(...this.problems(argument, scopes[i] as ReadonlySet<string>, core, active).map((p) => `${label}: ${p}`));
    });
    active.delete(expression);
    return found;
  }

  infer(expression: unknown, environment: Environment = {}): Domains.Domain {
    const resolved = this.resolve(expression) as Node;
    const problems = this.validate(resolved, { bound: Object.keys(environment) });
    if (problems.length > 0) throw new ValueError(`cannot infer the domain of an invalid expression: ${problems[0]}`);
    return this.inferIn(resolved, { ...environment }, new Map());
  }

  private inferIn(expression: Node, environment: Environment, memo: Map<Environment, Map<Node, Domains.Domain>>): Domains.Domain {
    let known = memo.get(environment);
    if (known === undefined) memo.set(environment, known = new Map());
    let domain = known.get(expression);
    if (domain === undefined) known.set(expression, domain = this.inferNode(expression, environment, memo));
    return domain;
  }

  private inferNode(expression: Node, environment: Environment, memo: Map<Environment, Map<Node, Domains.Domain>>): Domains.Domain {
    const kind = expression.kind();
    if (kind.ROLE === LITERAL) return expression.typed() ?? this.domainOf(expression.field("value") as Native);
    if (kind.ROLE === REFERENCE) {
      const name = nameOf(expression) as string;
      return kind.LEXICAL && Object.hasOwn(environment, name) ? environment[name] as Domains.Domain : Domains.Anything;
    }
    const args = expression.argumentsOf() as Node[];
    if (kind.ROLE === IMPORT) {
      const inner: Environment = { ...environment };
      for (const name of expression.binds()) inner[name] = Domains.Anything;
      return this.inferIn(args[args.length - 1] as Node, inner, memo);
    }
    if (kind.ROLE === BINDING) {
      const value = this.inferIn(args[0] as Node, environment, memo);
      return this.inferIn(args[args.length - 1] as Node, { ...environment, [nameOf(expression) as string]: value }, memo);
    }
    const operator = operatorOf(expression);
    const signature = kind.VOCABULARY === null ? kind.SIGNATURE : kind.VOCABULARY.get(operator) ?? null;
    let domains: Domains.Domain[];
    if (kind.ROLE === QUANTIFIER) { // its name has the domain of the collection's items
      const collection = this.inferIn(args[0] as Node, environment, memo);
      const item = signature === null ? Domains.Anything : (signature as unknown as Quantified).items(collection);
      domains = [collection, this.inferIn(args[1] as Node, { ...environment, [nameOf(expression) as string]: item }, memo)];
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
  if (!Schemas.isNativeOf(native, value)) return [`${what}'s ${name} must be a ${tokenName(native)}, got ${typeName(value)}`];
  return [];
}

// --- Traversal ---

function argumentsOf(expression: Node): Node[] {
  return expression.form().arguments.filter((argument): argument is Node => argument !== null);
}

/** Every expression reachable from `expression`, each once, parents before their arguments and arguments in order.
 * Shared sub-expressions are visited once, and cycles end the walk rather than repeat it. */
export function* walk(expression: Node): Generator<any> {
  const seen = new Set<Node>();
  const stack = [expression];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    if (seen.has(node)) continue;
    seen.add(node);
    yield node;
    stack.push(...argumentsOf(node).reverse());
  }
}

/** Combines an expression bottom-up: `fn(node, results)` is called once per node, shared ones included, with the
 * results for its arguments (null for empty slots). Throws on cycles. */
export function fold<R>(expression: Node, fn: (node: any, results: any[]) => R): R {
  const memo = new Map<Node, R>();
  const active = new Set<Node>();
  const visit = (node: Node): R => {
    if (memo.has(node)) return memo.get(node) as R;
    if (active.has(node)) throw new ValueError("the expression contains a cycle");
    active.add(node);
    const results = node.form().arguments.map((argument) => (argument === null ? null : visit(argument as Node)));
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
    if (x === null || y === null) return x === y;
    if (assumed.get(x)?.has(y)) return true; // a cycle: the same if they are the same everywhere else
    if (!assumed.has(x)) assumed.set(x, new Set());
    assumed.get(x)?.add(y);
    const [fx, fy] = [(x as Node).form(), (y as Node).form()];
    const keys = [...fx.attributes.keys()];
    return (x as object).constructor === (y as object).constructor && fx.kind === fy.kind
      && keys.length === fy.attributes.size && keys.every((k) => fy.attributes.has(k))
      && keys.every((k) => sameNative(fx.attributes.get(k), fy.attributes.get(k)))
      && fx.arguments.length === fy.arguments.length && fx.arguments.every((arg, i) => visit(arg, fy.arguments[i]));
  };
  return visit(a, b);
}
