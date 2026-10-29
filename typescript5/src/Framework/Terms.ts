/**
 * Terms: the framework's schemas, and the generic reads of terms that every dialect's evaluator, validator and
 * translator shares.
 *
 * An expression is an `Expressions.Framework.Expression`, a reference object whose `root` is a term: a value of
 * `Expressions.Framework.Term`, a union of value object kinds, held nested (docs/proposals/port, Decided, 2). `install`
 * defines them in a store: the framework's kinds `literal` (`value`, a basic scalar's), `call` (`callable`, by name;
 * `arguments`, a container of terms by index), `variable` (`name`) and `let` (`name`, `value`, `body`), each with a
 * `domain` by name; `Expression`; and `HasRoot(schema, expression)`, the extension adjacency `expression` it gives
 * `Schemas.OfExpression`. A dialect adds its own kinds to `Term` by schema extension, in its own install.
 *
 * Terms are built through mbse-schemas' builders, in a transaction, and read through its readers: a term's kind is the
 * branch it holds, its properties the branch's members. Which properties are a kind's slots (a term each), its variadic
 * arguments (a container of terms) or its attributes (anything else) is read from the kind's schema. What the framework
 * needs to know beyond the schema, how each kind is read, is a `Kind`: its role, and which properties name what it binds
 * and its operator.
 *
 * - `term(x)`: the term value of an expression, a term property's reader, a `Readers.OfAny` holding one, or a term.
 * - `kindOf(term)`: its branch, `[tag, record]`. `form(term)`: its `Form`, `kind`, `attributes` and `arguments`.
 * - `nameOf(term)`, `operatorOf(term, kind)`; `walk`, `fold`, `same`: traversal of a nested value.
 * - `Dialect`: a dialect's kinds by tag, with `validate`, `infer` and `make(form)`, the `Writer` of a form.
 * - `Writer`: a spec that writes a term through the builders; `spec(x)` makes one of a writer, a native value (a
 *   literal), a term value (copied) or a callable taking the `Visitors.OfUnion` of a term value.
 *
 * The roles are:
 *
 * - `LITERAL`: a basic scalar, its `value`.
 * - `REFERENCE`: a value the scope resolves. A lexical reference (the default) is the value bound to its name, by an
 *   enclosing binding or import or by the scope; others, such as Excel's cell references, are resolved by the scope
 *   alone, and validation does not require them to be bound. `ambient` names are bound without being declared.
 * - `APPLICATION`: an operator, named by the property `operator` (or, if it is null, by the kind's tag), applied to
 *   arguments. A kind's `vocabulary` maps operator names to signatures; operators outside it are extensions, unless the
 *   vocabulary is null, when any name is accepted and `signature` applies to all.
 * - `BINDING`: binds its name to its first argument within the others.
 * - `QUANTIFIER`: binds its name to each item of its first argument, a collection, within the others, and combines the
 *   results by its operator, such as `all`. Its signature also gives the domain of a collection's items.
 * - `IMPORT`: makes what it declares available within its one argument, its body; `Kind.names(record)` gives the names
 *   it binds for lexical references.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr, Schemas } from "@mbse/schemas/Framework";

import * as Domains from "./Domains.js";
import * as Objects from "./Objects.js";

const { ValueError } = Errors;
const { repr, typeName, Tuple } = Repr;

export const TERM = "Expressions.Framework.Term";
export const EXPRESSION = "Expressions.Framework.Expression";
export const LITERAL = "literal";
export const REFERENCE = "reference";
export const APPLICATION = "application";
export const BINDING = "binding";
export const IMPORT = "import";
export const QUANTIFIER = "quantifier";

/** The framework's schemas: terms, expressions, and an expression schema's root. Run again in a store, it finds each
 * by its name and writes nothing. */
export function install(txn: any): any {
  const S = txn.Schemas;
  return txn.uid("mbse.Expressions.Framework/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Term: S.OfUnion, Literal: S.OfObject, Call: S.OfObject, Variable: S.OfObject, Let: S.OfObject,
      Expression: S.OfObject, HasRoot: S.OfRelation,
      OfExpression: S.OfObject, // mbse-schemas' own, found by its name
    })
    .spec([
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // a dialect adds its kinds
        (t: any) => t.name("literal").schema([_.Literal]),
        (t: any) => t.name("call").schema([_.Call]),
        (t: any) => t.name("variable").schema([_.Variable]),
        (t: any) => t.name("let").schema([_.Let]),
      ]),
      (_: any) => _.Literal.name("Expressions.Framework.Literal").properties({
        value: S.OfAny((a: any) => a), // a basic scalar's, tagged on the wire (docs/proposals/port/API.md)
        domain: S.OfStr, // every term has a domain (Schema extension, Decided, 21), by name (stage 3)
      }),
      (_: any) => _.Call.name("Expressions.Framework.Call").properties({
        callable: S.OfStr, // what it calls, by name: an operator, a function
        arguments: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])),
        domain: S.OfStr, // its result's
      }),
      (_: any) => _.Variable.name("Expressions.Framework.Variable").properties({ name: S.OfStr, domain: S.OfStr }),
      (_: any) => _.Let.name("Expressions.Framework.Let").properties({
        name: S.OfStr, value: _.Term, body: _.Term, domain: S.OfStr }),
      (_: any) => _.Expression.name("Expressions.Framework.Expression").ref(true).properties({ root: _.Term }),
      (_: any) => _.HasRoot.name("Expressions.Framework.HasRoot").links([
        (t: any) => t.name("schema"), (t: any) => t.name("expression")]).uniques("expression"),
      (_: any) => _.OfExpression.name("Schemas.OfExpression").adjacencies([ // by extension: no member on it
        (t: any) => t.name("expression").relation([_.HasRoot]).me("schema")]),
    ])]))]);
}

/** A noun with its indefinite article: "an operation", "a let". */
export function article(noun: string): string {
  return `${"aeiou".includes(noun[0] as string) ? "an" : "a"} ${noun}`;
}

/** A value's schema's name when it is read through a reader and has one, otherwise its type's name. */
function described(value: unknown): string {
  const schema = schemaOf(value) as { name?: unknown } | null;
  const name = schema?.name;
  return typeof name === "string" && name !== "" ? name : typeName(value);
}

// --- Reading terms ---

/** A term's structure: its `kind` (its branch's tag), its `attributes` (its properties that are not terms, those set,
 * by name) and its ordered `arguments` (its slots, null where empty, then its variadic arguments). */
export class Form {
  readonly attributes: ReadonlyMap<string, unknown>;
  readonly arguments: readonly unknown[];

  constructor(readonly kind: string, attributes: ReadonlyMap<string, unknown> | Record<string, unknown> = new Map(),
    args: readonly unknown[] = []) {
    this.attributes = attributes instanceof Map ? attributes : new Map(Object.entries(attributes));
    this.arguments = args;
  }

  [Repr.REPR](): string {
    return `Form(kind=${repr(this.kind)}, attributes=${repr(this.attributes)}, arguments=${repr(new Tuple(this.arguments))})`;
  }
}

function named(schema: unknown, name: string): boolean {
  return (schema as { name?: unknown } | null | undefined)?.name === name;
}

type Parts = readonly [readonly string[], string | null, readonly string[]];
const PARTS = new WeakMap<object, Parts>();

/** A kind's schema's slots (properties holding a term), its variadic property (a container of terms) or null, and its
 * attributes (the rest), each in declaration order. */
export function _parts(schema: any): Parts {
  const cached = PARTS.get(schema);
  if (cached !== undefined) return cached;
  const slots: string[] = [];
  const attributes: string[] = [];
  let variadic: string | null = null;
  for (const [name, prop] of schema.properties as Map<string, Schemas.OfProperty.Data>) {
    if (named(prop.schema, TERM)) slots.push(name);
    else if (prop.schema instanceof Schemas.OfContainer.Data && named(prop.schema.element, TERM)) variadic = name;
    else attributes.push(name);
  }
  const parts: Parts = [slots, variadic, attributes];
  PARTS.set(schema, parts);
  return parts;
}

/** Whether a visitor is a `Visitors.OfAny`, rather than the `Visitors.OfUnion` of the value it holds. */
function isAny(visitor: any): boolean {
  return visitor !== null && (typeof visitor === "object" || typeof visitor === "function") && "as_union" in visitor;
}

function schemaOf(value: any): unknown {
  if (value === null || value === undefined || value instanceof Writer) return null;
  if (typeof value !== "object" && typeof value !== "function") return null;
  return typeof value.as_schema === "function" && !Repr.isClassLike(value) ? value.as_schema() : null;
}

/** Whether `value` is a term value: the reader of a value of `Expressions.Framework.Term`. */
export function isTerm(value: unknown): boolean {
  if (isAny(value)) return false;
  const schema = schemaOf(value);
  return schema instanceof Schemas.OfUnion.Data && named(schema, TERM);
}

/** The term value of an `Expression` (its root), of a term property's reader, of a `Readers.OfAny` holding one, or a
 * term value itself; throws `TypeError` for anything else, and `ValueError` where there is none. */
export function term(value: any): any {
  const schema = schemaOf(value);
  const found: any[] = [];
  if (schema instanceof Schemas.OfObject.Data && named(schema, EXPRESSION)) return term(value.root);
  if (schema instanceof Schemas.OfProperty.Data && named(schema.schema, TERM)) {
    value.as_value((a: any) => a.as_union((u: any) => {
      found.push(u);
      return u;
    }));
  } else if (isAny(value) && named(schema, TERM)) {
    value.as_union((u: any) => {
      found.push(u);
      return u;
    });
  } else if (isTerm(value)) {
    return value;
  } else {
    throw new TypeError(`not a term: ${repr(value)}`);
  }
  if (found[0].as_schema() === null) throw new ValueError("no term is set");
  return found[0];
}

/** The branch a term value holds: its tag, and its record (a `Readers.OfObject`). */
export function kindOf(term_: any): [string, any] {
  for (const branch of term_.as_schema().branches as readonly Schemas.OfUnion.Branch[]) {
    const record = term_[branch.name];
    if (record.as_schema() !== null) return [branch.name, record];
  }
  throw new ValueError("a term holds no kind");
}

/** A record's property's value: a scalar, or what `Objects.held` reads of any other value; null when absent. */
function scalar(record: any, name: string): any {
  const found: unknown[] = [];
  record[name].as_value((a: any) => { // every callback is called: an absent value's reader holds nothing
    found.push(Objects.held(a));
    return a;
  });
  return found[0];
}

/** The term a slot holds, or null. */
function slot(record: any, name: string): any {
  const found: any[] = [];
  record[name].as_value((a: any) => a.as_union((u: any) => {
    found.push(u);
    return u;
  }));
  return found.length > 0 && found[0].as_schema() !== null ? found[0] : null;
}

/** The terms a container of terms holds, in index order. */
function variadicOf(record: any, name: string): any[] {
  const pairs: [unknown, any][] = [];
  record[name].as_value((a: any) => a.as_container((c: any) => c.as_entries((it: Iterator<[unknown, any]>) => {
    for (let next = it.next(); !next.done; next = it.next()) pairs.push(next.value);
  })));
  const found: any[] = [];
  for (const [, element] of pairs) {
    element.as_union((u: any) => {
      found.push(u);
      return u;
    });
  }
  return found;
}

/** A record's attributes that are set, by name, in declaration order. */
export function attributesOf(record: any): Map<string, any> {
  const [, , names] = _parts(record.as_schema());
  const found = new Map<string, any>();
  for (const name of names) {
    const value = scalar(record, name);
    if (value !== null) found.set(name, value);
  }
  return found;
}

/** A record's arguments: its slots, null where empty, then its variadic arguments. */
export function argumentsOf(record: any): any[] {
  const [slots, variadic] = _parts(record.as_schema());
  const fixed = slots.map((name) => slot(record, name));
  return variadic !== null ? [...fixed, ...variadicOf(record, variadic)] : fixed;
}

/** A term's `Form`. */
export function form(term_: any): Form {
  const [tag, record] = kindOf(term_);
  return new Form(tag, attributesOf(record), argumentsOf(record));
}

/** The name a reference refers to, or a binding, quantifier or import binds: its `name`; null if it has none. */
export function nameOf(term_: any): any {
  const [, record] = kindOf(term_);
  return record.as_schema().properties.has("name") ? scalar(record, "name") : null;
}

/** An application's or a quantifier's operator: its `kind.operator` property, or its tag. */
export function operatorOf(term_: any, kind: Kind): string {
  const [tag, record] = kindOf(term_);
  return kind.operator === null ? tag : scalar(record, kind.operator);
}

// --- Traversal ---

/** Every term within `term_`, itself first, parents before their arguments and arguments in order. */
export function* walk(term_: unknown): Generator<any> {
  const stack = [term(term_)];
  while (stack.length > 0) {
    const node = stack.pop();
    yield node;
    stack.push(...form(node).arguments.filter((a) => a !== null).reverse());
  }
}

/** Combines a term bottom-up: `fn(node, results)` is called once per term, with the results for its arguments (null for
 * empty slots). */
export function fold<R>(term_: unknown, fn: (node: any, results: any[]) => R): R {
  const visit = (node: any): R => fn(node, form(node).arguments.map((a) => (a === null ? null : visit(a))));
  return visit(term(term_));
}

/** Scalars of one type by value (NaN is NaN, -0.0 is not 0.0). */
function sameNative(a: unknown, b: unknown): boolean {
  if (typeName(a) !== typeName(b)) return false;
  if (typeof a === "number") return Object.is(a, b);
  if (a instanceof Uint8Array) {
    const other = b as Uint8Array;
    return a.length === other.length && a.every((byte, i) => byte === other[i]);
  }
  return a === b;
}

/** Whether two terms have the same structure: their kinds, attributes (scalars of one type by value; NaN is NaN, and
 * -0.0 is not 0.0) and arguments in order. */
export function same(a: unknown, b: unknown): boolean {
  const visit = (x: any, y: any): boolean => {
    if (x === null || y === null) return x === y;
    const [fx, fy] = [form(x), form(y)];
    const keys = [...fx.attributes.keys()];
    return fx.kind === fy.kind && keys.length === fy.attributes.size && keys.every((k) => fy.attributes.has(k))
      && keys.every((k) => sameNative(fx.attributes.get(k), fy.attributes.get(k)))
      && fx.arguments.length === fy.arguments.length && fx.arguments.every((arg, i) => visit(arg, fy.arguments[i]));
  };
  return visit(term(a), term(b));
}

// --- Writing terms: specs ---

/** The visitor a spec is given: a property's, an element's (`OfAny`) or a union value's. */
function dispatch(writer: Writer, visitor: any): any {
  if (visitor.as_schema() instanceof Schemas.OfProperty.Data) return visitor.as_value(writer);
  if (isAny(visitor)) return visitor.as_union(writer.write);
  writer.write(visitor);
  return visitor;
}

/**
 * A spec that writes a term through the builders: called with the `Visitors.OfProperty` of a term property, the
 * `Visitors.OfAny` of a container's element or the `Visitors.OfUnion` of a term value, it selects its kind's branch and
 * writes it. `write(union)` is given the `Visitors.OfUnion`. Each dialect derives its own, with methods.
 *
 * A writer is a function, as mbse-schemas takes a spec: the constructor returns a function whose prototype is the
 * writer class's, so that `typeof writer === "function"` and a subclass's methods apply.
 */
export interface Writer {
  (visitor: any): any;
}

export class Writer {
  declare readonly write: (union: any) => any;

  constructor(write: (union: any) => any) {
    const self = ((visitor: any) => dispatch(self, visitor)) as unknown as Writer;
    delete (self as any).name; // hidden, so that a subclass may read these names as it reads any other
    delete (self as any).length;
    Object.setPrototypeOf(self, new.target.prototype);
    Object.defineProperty(self, "write", { value: write });
    return self;
  }
}

/** The writer of a copy of a term value. */
function copy(value: any): Writer {
  return new Writer((union: any) => {
    const [tag, record] = kindOf(value);
    return union[tag](record);
  });
}

/** The writer of a term: a writer as it is, a term value's (copied), a native value's as `literal` writes it (when it
 * gives one), or a callable's that takes the `Visitors.OfUnion` of a term value. */
export function spec(value: unknown, literal: ((value: unknown) => Writer | null) | null = null): Writer {
  if (value instanceof Writer) return value;
  if (isTerm(value)) return copy(value);
  if (literal !== null && Schemas.hostOf(value) !== null) {
    const written = literal(value);
    if (written !== null) return written;
  }
  if (typeof value === "function" && !Repr.isClassLike(value)) return new Writer(value as (union: any) => any);
  throw new TypeError(`expected a term, a writer or a native value, got ${repr(value)}`);
}

// --- Dialects ---

/** What a kind's `Kind` declares, beyond its role. */
export interface KindOptions {
  operator?: string | null;
  vocabulary?: ReadonlyMap<string, Domains.Signature> | null;
  signature?: Domains.Signature | null;
  required?: readonly string[];
  lexical?: boolean;
  ambient?: Iterable<string>;
  names?: ((record: any) => readonly string[]) | null;
  check?: ((record: any) => string[]) | null;
  typed?: ((record: any) => Domains.Domain | null) | null;
}

/** How the framework reads a kind, beyond its schema: its `role`; the property naming its operator (`operator`, or null
 * when its tag names it); for an application or a quantifier, its `vocabulary` (operator names to signatures; null
 * accepts any name, with `signature`); the properties it requires (`required`); for a reference, whether it is
 * `lexical` and the `ambient` names bound without a declaration; for an import, the names it binds (`names(record)`);
 * its own problems (`check(record)`); and its own domain, when it carries one (`typed(record)`). */
export class Kind {
  readonly operator: string | null;
  readonly vocabulary: ReadonlyMap<string, Domains.Signature> | null;
  readonly signature: Domains.Signature | null;
  readonly required: readonly string[];
  readonly lexical: boolean;
  readonly ambient: ReadonlySet<string>;
  readonly names: ((record: any) => readonly string[]) | null;
  readonly check: ((record: any) => string[]) | null;
  readonly typed: ((record: any) => Domains.Domain | null) | null;

  constructor(readonly role: string, options: KindOptions = {}) {
    this.operator = options.operator ?? null;
    this.vocabulary = options.vocabulary ?? null;
    this.signature = options.signature ?? null;
    this.required = options.required ?? [];
    this.lexical = options.lexical ?? true;
    this.ambient = new Set(options.ambient ?? []);
    this.names = options.names ?? null;
    this.check = options.check ?? null;
    this.typed = options.typed ?? null;
    Object.freeze(this);
  }
}

/** A quantifier's signature: it also gives the domain of a collection's items. */
interface Quantified {
  items(collection: Domains.Domain): Domains.Domain;
}

/** How a dialect is declared, beyond its name and kinds. */
export interface DialectOptions {
  /** A literal's domain. */
  domain_of: (value: unknown) => Domains.Domain;
  /** The writer of a native value's literal, or null when the dialect has none. */
  literal?: ((value: unknown) => Writer | null) | null;
  /** The dialect this one extends: its kinds are the base's and its own. */
  extends?: Dialect | null;
}

type Environment = Record<string, Domains.Domain>;

/** An expression language: the kinds it reads, by tag, its `name`, and `domain_of(value)`, a literal's domain. A
 * dialect may extend another (`extends`): its kinds are the base's and its own, whose tags must differ from the base's.
 * It validates (`validate`), infers (`infer`) and writes (`make`) terms of its kinds. */
export class Dialect {
  readonly base: Dialect | null;
  private readonly byTag: Map<string, Kind>;
  private readonly domainOf: (value: unknown) => Domains.Domain;
  readonly _literal: ((value: unknown) => Writer | null) | null;

  constructor(private readonly dialectName: string, kinds: Record<string, Kind>, options: DialectOptions) {
    const own = new Map(Object.entries(kinds));
    const base = options.extends ?? null;
    const inherited = base === null ? new Map<string, Kind>() : base.kinds();
    const clashes = [...own.keys()].filter((tag) => inherited.has(tag)).sort();
    if (clashes.length > 0) {
      throw new ValueError(`${dialectName} would declare ${clashes.map((tag) => repr(tag)).join(", ")}, which ${(base as Dialect).name()} has`);
    }
    this.byTag = new Map([...inherited, ...own]);
    this.domainOf = options.domain_of;
    this.base = base;
    this._literal = options.literal !== undefined && options.literal !== null || base === null
      ? options.literal ?? null : base._literal;
  }

  name(): string {
    return this.dialectName;
  }

  kinds(): Map<string, Kind> {
    return new Map(this.byTag);
  }

  toString(): string {
    return `<dialect ${this.dialectName}>`;
  }

  [Repr.REPR](): string {
    return this.toString();
  }

  /** A term's tag, record and `Kind`; throws `ValueError` for a kind the dialect does not read. */
  kind(term_: any): [string, any, Kind] {
    const [tag, record] = kindOf(term_);
    const kind = this.byTag.get(tag);
    if (kind === undefined) throw new ValueError(`${this.dialectName} has no kind ${repr(tag)}`);
    return [tag, record, kind];
  }

  /** The writer of a term of this dialect: see `spec`, a native value as this dialect's literal. */
  spec(value: unknown): Writer {
    return spec(value, this._literal);
  }

  /** The writer of a term with this form: its attributes written as scalars, its arguments (specs: terms, writers,
   * native values) to its slots in order and the rest to its variadic property. */
  make(form_: Form): Writer {
    if (!this.byTag.has(form_.kind)) throw new ValueError(`${this.dialectName} has no kind ${repr(form_.kind)}`);
    const args = form_.arguments.map((a) => (a === null ? null : this.spec(a)));
    return new Writer((union: any) => union[form_.kind]((r: any) => {
      const [slots, variadic, names] = _parts(r.as_schema());
      for (const [name, value] of form_.attributes) {
        if (!names.includes(name)) throw new ValueError(`${article(form_.kind)} has no attribute ${repr(name)}`);
        r[name]((p: any) => p.as_scalar(value));
      }
      if (args.length < slots.length || (variadic === null && args.length !== slots.length)) {
        const least = variadic === null ? "" : "at least ";
        throw new ValueError(`${article(form_.kind)} takes ${least}${slots.length} arguments, got ${args.length}`);
      }
      slots.forEach((name, i) => {
        if (args[i] !== null) r[name](args[i]);
      });
      if (variadic !== null) r[variadic](args.slice(slots.length));
      return r;
    }));
  }

  // Checks

  /** Problems with a term. References must be bound by an enclosing binding or be in `bound`. With `core`, every
   * operator must be in its kind's vocabulary. */
  validate(term_: unknown, bound: Iterable<string> = [], core = false): string[] {
    return this.problems(term(term_), new Set(bound), core);
  }

  private problems(node: any, bound: ReadonlySet<string>, core: boolean): string[] {
    const [tag, record] = kindOf(node);
    const kind = this.byTag.get(tag);
    if (kind === undefined) return [`${this.dialectName} has no kind ${repr(tag)}`];
    const what = article(tag);
    const attributes = attributesOf(record);
    if (kind.role === LITERAL) {
      const value = attributes.get("value") ?? null;
      if (value === null) return [`${what} needs a value`];
      if (Schemas.hostOf(value) === null) return [`${what} must hold a basic scalar, got ${described(value)}`];
      return kind.check !== null ? kind.check(record) : [];
    }
    const problems = kind.required.filter((name) => [null, undefined, ""].includes(attributes.get(name)))
      .map((name) => `${what} needs ${article(name)}`);
    const declared = record.as_schema().properties as Map<string, Schemas.OfProperty.Data>;
    for (const [name, value] of attributes) { // the builders write any scalar; validation reports the wrong one
      const held = (declared.get(name) as Schemas.OfProperty.Data).schema;
      if (held instanceof Schemas.OfScalar.Data && !Schemas.isScalarOf(held.type, value)) {
        problems.push(`${what}'s ${name} must be a ${Repr.tokenName(held.type)}, got ${typeName(value)}`);
      }
    }
    if (kind.check !== null) problems.push(...kind.check(record));
    const name = attributes.get("name") ?? null;
    if (kind.role === REFERENCE) {
      if (kind.lexical && problems.length === 0 && !bound.has(name) && !kind.ambient.has(name)) {
        problems.push(`${tag} ${repr(name)} is not bound`);
      }
      return problems;
    }
    const [slots] = _parts(record.as_schema());
    const args = argumentsOf(record);
    let scopes: ReadonlySet<string>[] = args.map(() => bound);
    if (kind.role === BINDING || kind.role === QUANTIFIER) {
      const inner = problems.length === 0 ? new Set([...bound, name]) : bound;
      scopes = args.map((_, i) => (i === 0 ? bound : inner));
    } else if (kind.role === IMPORT) {
      const names = kind.names !== null && problems.length === 0 ? kind.names(record) : [];
      scopes = args.map(() => new Set([...bound, ...names]));
    }
    if ((kind.role === APPLICATION || kind.role === QUANTIFIER) && problems.length === 0 && kind.vocabulary !== null) {
      const operator = operatorOf(node, kind);
      const signature = kind.vocabulary.get(operator);
      if (signature !== undefined && ![-1, args.length].includes(signature.arity())) { // -1: any number
        problems.push(`${operator} takes ${signature.arity()} arguments, got ${args.length}`);
      } else if (core && signature === undefined) {
        problems.push(`${repr(operator)} is not a core operation`);
      }
    }
    args.forEach((argument, i) => {
      const label = i < slots.length ? slots[i] as string : `argument ${i - slots.length}`;
      if (argument === null) problems.push(`${what} needs ${article(label)}`);
      else problems.push(...this.problems(argument, scopes[i] as ReadonlySet<string>, core).map((p) => `${label}: ${p}`));
    });
    return problems;
  }

  /** The domain of a term's value, with the references in `environment` of the given domains. */
  infer(term_: unknown, environment: Environment = {}): Domains.Domain {
    const known: Environment = { ...environment };
    const node = term(term_);
    const problems = this.validate(node, Object.keys(known));
    if (problems.length > 0) throw new ValueError(`cannot infer the domain of an invalid expression: ${problems[0]}`);
    return this.inferIn(node, known);
  }

  private inferIn(node: any, environment: Environment): Domains.Domain {
    const [, record, kind] = this.kind(node);
    if (kind.role === LITERAL) {
      const typed = kind.typed !== null ? kind.typed(record) : null;
      return typed ?? this.domainOf(scalar(record, "value"));
    }
    if (kind.role === REFERENCE) {
      const name = nameOf(node);
      return kind.lexical && Object.hasOwn(environment, name) ? environment[name] as Domains.Domain : Domains.Anything;
    }
    const args = argumentsOf(record);
    if (kind.role === IMPORT) {
      const inner: Environment = { ...environment };
      for (const name of kind.names !== null ? kind.names(record) : []) inner[name] = Domains.Anything;
      return this.inferIn(args[args.length - 1], inner);
    }
    if (kind.role === BINDING) {
      const value = this.inferIn(args[0], environment);
      return this.inferIn(args[args.length - 1], { ...environment, [nameOf(node)]: value });
    }
    const operator = operatorOf(node, kind);
    const signature = kind.vocabulary === null ? kind.signature : kind.vocabulary.get(operator) ?? null;
    let domains: Domains.Domain[];
    if (kind.role === QUANTIFIER) { // its name has the domain of the collection's items
      const collection = this.inferIn(args[0], environment);
      const item = signature === null ? Domains.Anything : (signature as unknown as Quantified).items(collection);
      const inner = { ...environment, [nameOf(node)]: item };
      domains = [collection, ...args.slice(1).map((argument) => this.inferIn(argument, inner))];
    } else {
      domains = args.map((argument) => this.inferIn(argument, environment));
    }
    if (signature === null) return Domains.Anything; // an extension: nothing is known about it
    const result = signature.result(domains);
    if (result === null) {
      const names = domains.map((domain) => domain.name()).join(", ");
      throw new TypeError(`${operator} cannot take (${names}); it takes ${signature.describe()}`);
    }
    const typed = kind.typed !== null ? kind.typed(record) : null;
    return typed === null ? result : typed; // an application of a domain of its own gives it
  }
}
