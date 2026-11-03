/**
 * Terms: the framework's schemas, and the generic reads of terms that every dialect's evaluator, validator and
 * translator shares.
 *
 * An expression is an `Expressions.Framework.Expression`, a reference object whose `root` is a term: a value of
 * `Expressions.Framework.Term`, held nested (docs/proposals/port, Decided, 2). `Term` is a union of the dialects' unions
 * (docs/proposals/dialects, Decided, 1): its branches are the dialects (`patterns`, `python3`, ...), each added by its
 * dialect's install by schema extension, and each branch's schema is that dialect's union of its kinds,
 * `Expressions.<Dialect>.Expression`, whose branches are its kinds, named plainly (`binop`). A dialect's own kinds name
 * its union in their term slots, so its terms nest its terms; the framework's shared kinds name `Term`, holding any
 * dialect's term, and each dialect's union lists the shared kinds it reuses. So a term value is either a value of `Term`,
 * its dialect then its kind, or a value of a dialect's union, its kind alone: `term`, `kind_of` and `form` read both.
 *
 * `install` defines the framework's schemas in a store: `Term`, with no branch until a dialect adds its own; the shared
 * kinds `literal` (a domain representation, mbse-basis
 * [PRI-023: domain representations](../../../../../mbse-basis/docs/PRINCIPLES.md#PRI-023): `value`, any value, absent where
 * its text is invalid; `text`, its source spelling, unvalidated; `problems`, a validation indicator for each problem its
 * text has; [CAP-233: literals of any value](../../../../../mbse-basis/docs/capabilities/CAP-233.md)), `call`
 * (`callable`, by name; `arguments`, a container of terms by index), `variable` (`name`), `let` (`name`, `value`,
 * `body`), and the container constructors `list` (`elements`, a container of terms by index) and `mapping` (`entries`, a
 * container by index of `Expressions.Framework.Pair`s, each a `key` and a `value` term); the invalid-syntax kinds every
 * dialect's union holds, `error` (`text`, the source it spans as written; `terms`, the terms recovered within it) and
 * `missing` (`kind`, the kind the parser expected), modeled for parsers that keep invalid syntax and written by none yet;
 * `Expression`; and `HasRoot(schema, expression)`, the extension adjacency `expression` it gives `Schemas.OfExpression`. A
 * term carries no domain: whatever owns the root term gives its schema.
 *
 * Dialects, domains and operations are data too. A dialect is a singleton whose identity is its global name
 * (`Expressions.Patterns`), of its own reference object schema (`Expressions.Patterns.Dialect`), a branch of the kind
 * union `Expressions.Framework.Dialect`, which each dialect extends. It owns its domains by name
 * (`Expressions.Framework.Defines(dialect, name, domain)`), so a domain's path is its dialect's and its name; a domain is
 * an `Expressions.Framework.Domain`, a reference object holding its `kind`, a value of `Expressions.Framework.DomainKind`,
 * a union each dialect extends with its kinds of domain. A domain's schema is a named `Schemas.OfAny` restricted to the
 * scalar it narrows (`Expressions.Patterns.uint8`), which reads it through the extension adjacency `domain`
 * (`Expressions.Framework.HasDomain(schema, domain)`, unique both ways). A dialect names its operations
 * (`Expressions.Framework.Operates(dialect, name, operation)`), each a `Schemas.OfExpression` its module defines, whose
 * pattern's variables are its arguments, in the order they are declared, and whose `result` is its return.
 *
 * Terms are built through mbse-schemas' builders, in a transaction, and read through its readers: a term's kind is the
 * branch its dialect's union holds, its properties the branch's members. Which properties are a kind's slots (a term
 * each: a property whose schema is `Term` or a dialect's union), its variadic arguments (a container of terms, or of
 * value objects of terms, a mapping's pairs, read as their terms in turn) or its attributes (anything else) is read from
 * the kind's schema. What the framework needs to know beyond the schema, how each kind is read, is a `Kind`: its role,
 * and which properties name what it binds and its operator.
 *
 * - `term(x)`: the term value of an expression, a term property's reader, a `Readers.OfAny` holding one, or a term.
 * - `kindOf(term)`: its kind's branch, `(tag, record)`; `dialectOf(term)`: the name of its dialect's union.
 *   `form(term)`: its `Form`, `kind`, `attributes` and `arguments`.
 * - `nameOf(term)`, `operatorOf(term, kind)`; `walk`, `fold`, `same`: traversal of a nested value.
 * - `Dialect`: a dialect's kinds by tag, with `validate`, `infer` and `make(form)`, the `Writer` of a form.
 * - `Writer`: a spec that writes a term of its dialect through the builders; `spec(x)` makes one of a writer, a native
 *   value (a literal), a term value (copied) or a callable taking the `Visitors.OfUnion` of a term value.
 *
 * The roles are:
 *
 * - `LITERAL`: a value, its `value`.
 * - `REFERENCE`: a value the scope resolves. A lexical reference (the default) is the value bound to its name, by an
 *   enclosing binding or import or by the scope; others, such as Excel's cell references, are resolved by the scope
 *   alone, and validation does not require them to be bound. `ambient` names are bound without being declared.
 * - `APPLICATION`: an operator, named by the property `operator` (or, if it is null, by the kind's tag), applied to
 *   arguments. A kind's `vocabulary` maps operator names to signatures; operators outside it are extensions, unless the
 *   vocabulary is None, when any name is accepted and `signature` applies to all, or the kind is `closed`, when they
 *   are refused. The container constructors are applications named by their tags.
 * - `BINDING`: binds its name to its first argument within the others.
 * - `QUANTIFIER`: binds its name to each item of its first argument, a collection, within the others, and combines the
 *   results by its operator, such as `all`. Its signature also gives the domain of a collection's items.
 * - `IMPORT`: makes what it declares available within its one argument, its body; `Kind.names(attributes)` gives the names
 *   it binds for lexical references.
 * - `INVALID`: invalid syntax, `error` and `missing`: validation reports it, and evaluation refuses it by name.
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
export const INVALID = "invalid";

/** The framework's schemas: terms, expressions and an expression schema's root; domains and the schemas they
 * restrict; dialects and the operations they define. Run again in a store, it finds each by its name and writes
 * nothing. */
export function install(txn: any): any {
  const S = txn.Schemas;
  return txn.uid("mbse.Expressions.Framework/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Term: S.OfUnion, Literal: S.OfObject, Call: S.OfObject, Variable: S.OfObject, Let: S.OfObject,
      List: S.OfObject, Mapping: S.OfObject, Pair: S.OfObject, Error: S.OfObject, Missing: S.OfObject,
      Expression: S.OfObject, HasRoot: S.OfRelation,
      OfExpression: S.OfObject, Domain: S.OfObject, DomainKind: S.OfUnion, HasDomain: S.OfRelation, OfAny: S.OfObject,
      Dialect: S.OfUnion, Defines: S.OfRelation, Operates: S.OfRelation, // mbse-schemas' own, by name
    })
    .spec([
      // A union of the dialects' unions: each dialect adds its own, `Expressions.<Dialect>.Expression`, as the branch
      // named after it (`patterns`), by schema extension.
      (_: any) => _.Term.name("Expressions.Framework.Term"),
      // The shared kinds, which a dialect's union lists where it reuses them; their slots hold any dialect's term.
      (_: any) => _.Literal.name("Expressions.Framework.Literal").properties({ // a domain representation (PRI-023)
        value: S.OfAny((a: any) => a), // any value; absent where its text is invalid
        text: S.OfStr, // its source spelling, unvalidated
        problems: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfStr])), // what is wrong with its text
      }),
      (_: any) => _.Call.name("Expressions.Framework.Call").properties({
        callable: S.OfStr, // what it calls, by name: an operation its dialect defines
        arguments: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])),
      }),
      (_: any) => _.Variable.name("Expressions.Framework.Variable").properties({ name: S.OfStr }),
      (_: any) => _.Let.name("Expressions.Framework.Let").properties({ name: S.OfStr, value: _.Term, body: _.Term }),
      (_: any) => _.List.name("Expressions.Framework.List").properties({ // constructs a list of its elements' values
        elements: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])),
      }),
      (_: any) => _.Mapping.name("Expressions.Framework.Mapping").properties({ // constructs a mapping, key to value
        entries: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Pair])),
      }),
      (_: any) => _.Pair.name("Expressions.Framework.Pair").properties({ key: _.Term, value: _.Term }),
      // Invalid syntax, which every dialect's union holds: what a parser skipped, and the kind it expected.
      (_: any) => _.Error.name("Expressions.Framework.Error").properties({
        text: S.OfStr, // the source it spans, as written
        terms: S.OfContainer((c: any) => c.index([S.OfInt]).element([_.Term])), // the terms recovered within it
      }),
      (_: any) => _.Missing.name("Expressions.Framework.Missing").properties({
        kind: S.OfStr, // the kind the parser expected, as it names it
      }),
      (_: any) => _.Expression.name("Expressions.Framework.Expression").ref(true).properties({ root: _.Term }),
      (_: any) => _.HasRoot.name("Expressions.Framework.HasRoot").links([
        (t: any) => t.name("schema"), (t: any) => t.name("expression")]).uniques("expression"),
      (_: any) => _.OfExpression.name("Schemas.OfExpression").adjacencies([ // by extension: no member on it
        (t: any) => t.name("expression").relation([_.HasRoot]).me("schema")]),
      // A dialect: a singleton, its identity its global name (`Expressions.Patterns`), the root of its domains' paths.
      // mbse-schemas gives a schema one singleton, so `Dialect` is a kind union of reference object schemas, to which
      // each dialect adds its own by schema extension, as it adds its kinds to `Term`.
      (_: any) => _.Dialect.name("Expressions.Framework.Dialect"),
      // A domain: a reference object holding its kind, a value of a union that dialects extend, owned by the dialect
      // that defines it by name; its schema, a named `Schemas.OfAny` restricted to the scalar it narrows, reads it
      // through the extension adjacency `domain`.
      (_: any) => _.DomainKind.name("Expressions.Framework.DomainKind"), // a dialect adds its kinds
      (_: any) => _.Domain.name("Expressions.Framework.Domain").ref(true).properties({ kind: _.DomainKind }).adjacencies({
        dialect: (a: any) => a.relation([_.Defines]).me("domain").owner(true), // its path: its dialect's, its name
        schema: (a: any) => a.relation([_.HasDomain]).me("domain"),
      }),
      (_: any) => _.Defines.name("Expressions.Framework.Defines").links([
        (t: any) => t.name("dialect").schema([_.Dialect]), (t: any) => t.name("domain")]).properties({
        name: S.OfStr }).uniques([["dialect", "name"], ["domain"]]),
      (_: any) => _.HasDomain.name("Expressions.Framework.HasDomain").links([
        (t: any) => t.name("schema").schema([_.OfAny]), (t: any) => t.name("domain")]).uniques([["schema"], ["domain"]]),
      (_: any) => _.OfAny.name("Schemas.OfAny").adjacencies({
        domain: (a: any) => a.relation([_.HasDomain]).me("schema") }),
      // A dialect's operations, each a `Schemas.OfExpression` its module owns (`Schemas.Defines`), its pattern's
      // variables its arguments in the order they are declared, its `result` its return: named by the dialect.
      (_: any) => _.Operates.name("Expressions.Framework.Operates").links([
        (t: any) => t.name("dialect").schema([_.Dialect]), (t: any) => t.name("operation").schema([_.OfExpression]),
      ]).properties({ name: S.OfStr }).uniques([["dialect", "name"], ["operation"]]),
    ])]))]);
}

/** A noun with its indefinite article: "an operation", "a let". */
export function article(noun: string): string {
  return `${"aeiou".includes((noun[0] as string).toLowerCase()) ? "an" : "a"} ${noun}`;
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

/** Whether a schema's values are terms: `Expressions.Framework.Term`, or a dialect's union of its kinds, a union named
 * `Expressions.<Dialect>.Expression`. */
function holdsTerms(schema: unknown): boolean {
  const name = (schema as { name?: unknown } | null | undefined)?.name;
  return schema instanceof Schemas.OfUnion.Data && typeof name === "string"
    && (name === TERM || (name.startsWith("Expressions.") && name.endsWith(".Expression")));
}

type Parts = readonly [readonly string[], string | null, readonly string[]];
const PARTS = new WeakMap<object, Parts>();

/** Whether a schema is a value object whose properties are all terms, such as a mapping's pair. */
function isPair(schema: any): boolean {
  return schema instanceof Schemas.OfObject.Data && !schema.ref && schema.properties.size > 0
    && [...(schema.properties as Map<string, Schemas.OfProperty.Data>).values()].every((prop) => holdsTerms(prop.schema));
}

/** A kind's schema's slots (properties holding a term), its variadic property (a container of terms, or of value
 * objects of terms such as a mapping's pairs) or null, and its attributes (the rest), each in declaration order. */
export function _parts(schema: any): Parts {
  const cached = PARTS.get(schema);
  if (cached !== undefined) return cached;
  const slots: string[] = [];
  const attributes: string[] = [];
  let variadic: string | null = null;
  for (const [name, prop] of schema.properties as Map<string, Schemas.OfProperty.Data>) {
    if (holdsTerms(prop.schema)) slots.push(name);
    else if (prop.schema instanceof Schemas.OfContainer.Data && (holdsTerms(prop.schema.element)
      || isPair(prop.schema.element))) variadic = name;
    else attributes.push(name);
  }
  const parts: Parts = [slots, variadic, attributes];
  PARTS.set(schema, parts);
  return parts;
}

/** The term properties of the value objects a kind's variadic property holds, in declaration order (a mapping's `key`
 * and `value`); none where it holds terms, or the kind has no variadic property. */
export function _members(schema: any): readonly string[] {
  const [, variadic] = _parts(schema);
  const element = variadic !== null ? (schema.properties.get(variadic) as any).schema.element : null;
  return isPair(element) ? [...element.properties.keys()] : [];
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

/** Whether `value` is a term value: the reader of a value of `Expressions.Framework.Term` or of a dialect's union. */
export function isTerm(value: unknown): boolean {
  if (isAny(value)) return false;
  return holdsTerms(schemaOf(value));
}

/** The term value of an `Expression` (its root), of a term property's reader, of a `Readers.OfAny` holding one, or a
 * term value itself; throws `TypeError` for anything else, and `ValueError` where there is none. */
export function term(value: any): any {
  const schema = schemaOf(value);
  const found: any[] = [];
  if (schema instanceof Schemas.OfObject.Data && named(schema, EXPRESSION)) return term(value.root);
  if (schema instanceof Schemas.OfProperty.Data && holdsTerms(schema.schema)) {
    value.as_value((a: any) => a.as_union((u: any) => {
      found.push(u);
      return u;
    }));
  } else if (isAny(value) && holdsTerms(schema)) {
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

/** The branch a union value holds, or null. */
function heldBranch(union: any): [string, any] | null {
  for (const branch of union.as_schema().branches as readonly Schemas.OfUnion.Branch[]) {
    const held = union[branch.name];
    if (held.as_schema() !== null) return [branch.name, held];
  }
  return null;
}

/** A term value's dialect's union value: the dialect a value of `Term` holds, or the value itself. */
function dialectValue(term_: any): any {
  if (!named(term_.as_schema(), TERM)) return term_;
  const held = heldBranch(term_);
  if (held === null) throw new ValueError("a term holds no dialect");
  return held[1];
}

/** The name of the union of the dialect a term value is of: `Expressions.Python3.Expression`. */
export function dialectOf(term_: any): string {
  return dialectValue(term_).as_schema().name;
}

/** The branch of its dialect's union a term value holds: its tag, and its record (a `Readers.OfObject`). */
export function kindOf(term_: any): [string, any] {
  const held = heldBranch(dialectValue(term_));
  if (held === null) throw new ValueError("a term holds no kind");
  return held;
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

/** The terms a container holds, in index order: its elements, or each element's terms in turn (`_members`), null where
 * one is empty. */
function variadicOf(record: any, name: string): any[] {
  const pairs: [unknown, any][] = [];
  record[name].as_value((a: any) => a.as_container((c: any) => c.as_entries((it: Iterator<[unknown, any]>) => {
    for (let next = it.next(); !next.done; next = it.next()) pairs.push(next.value);
  })));
  const members = _members(record.as_schema());
  const found: any[] = [];
  for (const [, element] of pairs) {
    if (members.length > 0) {
      element.as_object((o: any) => {
        found.push(...members.map((member) => slot(o, member)));
        return o;
      });
    } else {
      element.as_union((u: any) => {
        found.push(u);
        return u;
      });
    }
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

/** Scalars of one type by value (NaN is NaN, -0.0 is not 0.0), and containers of them (a literal's problems)
 * element by element, as Python compares tuples. */
export function sameNative(a: unknown, b: unknown): boolean {
  if (typeName(a) !== typeName(b)) return false;
  if (typeof a === "number") return Object.is(a, b);
  if (a instanceof Uint8Array) {
    const other = b as Uint8Array;
    return a.length === other.length && a.every((byte, i) => byte === other[i]);
  }
  if (a instanceof Objects.Listed) {
    const other = b as Objects.Listed;
    return a.values.length === other.values.length && a.values.every((v, i) => sameNative(v, other.values[i]))
      && (a.keys === null) === (other.keys === null);
  }
  return a === b;
}

/** Whether two terms have the same structure: their dialects, kinds, attributes (scalars of one type by value; NaN is
 * NaN, and -0.0 is not 0.0) and arguments in order. */
export function same(a: unknown, b: unknown): boolean {
  const visit = (x: any, y: any): boolean => {
    if (x === null || y === null) return x === y;
    const [fx, fy] = [form(x), form(y)];
    const keys = [...fx.attributes.keys()];
    return dialectOf(x) === dialectOf(y) && fx.kind === fy.kind && keys.length === fy.attributes.size && keys.every((k) => fy.attributes.has(k))
      && keys.every((k) => sameNative(fx.attributes.get(k), fy.attributes.get(k)))
      && fx.arguments.length === fy.arguments.length && fx.arguments.every((arg, i) => visit(arg, fy.arguments[i]));
  };
  return visit(term(a), term(b));
}

// --- Writing terms: specs ---

/** The visitor a spec is given: a property's, an element's (`OfAny`) or a union value's. */
function dispatch(writer: Writer, visitor: any): any {
  if (visitor.as_schema() instanceof Schemas.OfProperty.Data) return visitor.as_value(writer);
  if (isAny(visitor)) return visitor.as_union((union: any) => inUnion(writer, union));
  inUnion(writer, visitor);
  return visitor;
}

/** Writes in a union value: where it is a value of `Term`, in its dialect's branch first. */
function inUnion(writer: Writer, union: any): any {
  if (writer.dialect !== null && named(union.as_schema(), TERM)) return union[writer.dialect](writer.write);
  return writer.write(union);
}

/**
 * A spec that writes a term through the builders: called with the `Visitors.OfProperty` of a term property, the
 * `Visitors.OfAny` of a container's element or the `Visitors.OfUnion` of a term value, it selects its kind's branch and
 * writes it. `write(union)` is given the `Visitors.OfUnion` of its dialect's union: where a value of
 * `Expressions.Framework.Term` is written, the writer first selects the branch of its `dialect` (`python3`), and a
 * writer of no dialect is given `Term`'s own. Each dialect derives its own, with its dialect, and methods.
 *
 * A writer is a function, as mbse-schemas takes a spec: the constructor returns a function whose prototype is the
 * writer class's, so that `typeof writer === "function"` and a subclass's methods apply.
 */
export interface Writer {
  (visitor: any): any;
}

export class Writer {
  declare readonly write: (union: any) => any;
  declare readonly dialect: string | null;

  constructor(write: (union: any) => any, dialect: string | null = null) {
    const self = ((visitor: any) => dispatch(self, visitor)) as unknown as Writer;
    delete (self as any).name; // hidden, so that a subclass may read these names as it reads any other
    delete (self as any).length;
    Object.setPrototypeOf(self, new.target.prototype);
    Object.defineProperty(self, "write", { value: write });
    Object.defineProperty(self, "dialect", { value: dialect });
    return self;
  }
}

/** The writer of a copy of a term value, in its dialect. */
function copy(value: any): Writer {
  const union = dialectOf(value);
  const [tag, record] = kindOf(value);
  return new Writer((target: any) => {
    const schema = target.as_schema();
    if (named(schema, TERM)) { // the branch of the term's dialect, found by its union
      const branch = (schema.branches as readonly Schemas.OfUnion.Branch[]).find((member: any) => member.schema.name === union) as Schemas.OfUnion.Branch;
      return target[branch.name]((u: any) => u[tag](record));
    }
    return target[tag](record);
  });
}

/** The writer of a term: a writer as it is, a term value's (copied), a native value's as `literal` writes it (when it
 * gives one), or a callable's that takes the `Visitors.OfUnion` of a term value: of the union of `dialect` (its branch
 * of `Term`, `python3`) where one is given, else of what is written. */
export function spec(value: unknown, literal: ((value: unknown) => Writer | null) | null = null,
  dialect: string | null = null): Writer {
  if (value instanceof Writer) return value;
  if (isTerm(value)) return copy(value);
  if (literal !== null && Schemas.hostOf(value) !== null) {
    const written = literal(value);
    if (written !== null) return written;
  }
  if (typeof value === "function" && !Repr.isClassLike(value)) return new Writer(value as (union: any) => any, dialect);
  throw new TypeError(`expected a term, a writer or a native value, got ${repr(value)}`);
}

/** The spec of a value object of terms (a mapping's pair), its members written from `terms` in order. */
function pair(members: readonly string[], terms: readonly (Writer | null)[]): (element: any) => any {
  return (element: any) => element.as_object((o: any) => {
    members.forEach((member, i) => {
      if (terms[i] !== null) o[member](terms[i]);
    });
    return o;
  });
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
  names?: ((attributes: ReadonlyMap<string, any>) => readonly string[]) | null;
  check?: ((record: any) => string[]) | null;
  typed?: ((record: any) => Domains.Domain | null) | null;
  closed?: boolean;
  standards?: readonly string[];
}

/** How the framework reads a kind, beyond its schema: its `role`; the property naming its operator (`operator`, or null
 * when its tag names it); for an application or a quantifier, its `vocabulary` (operator names to signatures; null
 * accepts any name, with `signature`), and whether it is `closed`, refusing an operator outside its vocabulary whether
 * or not validation asks for the core (the operations its dialect defines, and no others); the properties it requires
 * (`required`); for a reference, whether it is `lexical` and the `ambient` names bound without a declaration; for an
 * import, the names it binds, of its attributes (`names(attributes)`); its own problems (`check(record)`); the domain
 * its own attributes give it, where they give one (`typed(record)`: C's type of a constant or a cast; a term carries no
 * domain); and the standards of its dialect's language that have it (`standards`: `C11`, `C++17`), where its dialect
 * covers several, as mbse-programs' standards record when each kind arrived. */
export class Kind {
  readonly operator: string | null;
  readonly vocabulary: ReadonlyMap<string, Domains.Signature> | null;
  readonly signature: Domains.Signature | null;
  readonly required: readonly string[];
  readonly lexical: boolean;
  readonly ambient: ReadonlySet<string>;
  readonly names: ((attributes: ReadonlyMap<string, any>) => readonly string[]) | null;
  readonly check: ((record: any) => string[]) | null;
  readonly typed: ((record: any) => Domains.Domain | null) | null;
  readonly closed: boolean;
  readonly standards: readonly string[];

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
    this.closed = options.closed ?? false;
    this.standards = options.standards ?? [];
    Object.freeze(this);
  }
}

/** What invalid syntax is: an error, the source it spans; a missing term, the kind the parser expected. */
function invalidCheck(record: any): string[] {
  const attributes = attributesOf(record);
  if (record.as_schema().name === "Expressions.Framework.Error") {
    return ["invalid syntax" + (attributes.has("text") ? ` ${repr(attributes.get("text"))}` : "")];
  }
  return [`missing ${attributes.get("kind") ?? "a term"}`];
}

/** How a printer writes invalid syntax: an error as the source it spans, as written, and a missing term as nothing; an
 * error with no text has nothing to print, and is refused by name. */
export function invalidText(dialect: Dialect, tag: string, attributes: ReadonlyMap<string, any>): string {
  if (tag === "missing") return "";
  if (!attributes.has("text")) throw new ValueError(`${dialect.name()} error has no text to print`);
  return attributes.get("text");
}

/** The framework's kinds of invalid syntax, which every dialect's union holds and every dialect reads. */
export const INVALID_KINDS: ReadonlyMap<string, Kind> = new Map([
  ["error", new Kind(INVALID, { check: invalidCheck })], ["missing", new Kind(INVALID, { check: invalidCheck })]]);

/** A quantifier's signature: it also gives the domain of a collection's items. */
interface Quantified {
  items(collection: Domains.Domain): Domains.Domain;
}

/** How a dialect is declared, beyond its name and kinds. */
export interface DialectOptions {
  /** The domain of a literal's value by the scalar it is written with (for `infer`; a term carries no domain). */
  domain_of: (value: unknown) => Domains.Domain;
  /** The writer of a native value's literal, or null when the dialect has none. */
  literal?: ((value: unknown) => Writer | null) | null;
  /** The dialect this one extends: its kinds are the base's and its own. */
  extends?: Dialect | null;
}

type Environment = Record<string, Domains.Domain>;

/** An expression language: the kinds it reads, by tag, its `name`, and `domain_of(value)`, the domain of a literal's
 * value by the scalar it is written with (for `infer`; a term carries no domain). Its terms are values of its union,
 * `Expressions.<name>.Expression` (`union`), the branch `tag` (its name in lowercase) of `Expressions.Framework.Term`;
 * besides its own kinds it reads the framework's kinds of invalid syntax (`INVALID_KINDS`). A dialect may extend another
 * (`extends`): its kinds are the base's and its own, whose tags must differ from the base's, added to the base's union,
 * whose terms it reads. It validates (`validate`), infers (`infer`) and writes (`make`) terms of its kinds. */
export class Dialect {
  readonly base: Dialect | null;
  readonly tag: string;
  readonly union: string;
  private readonly byTag: Map<string, Kind>;
  private readonly domainOf: (value: unknown) => Domains.Domain;
  readonly _literal: ((value: unknown) => Writer | null) | null;

  constructor(private readonly dialectName: string, kinds: Record<string, Kind>, options: DialectOptions) {
    const own = new Map(Object.entries(kinds));
    const base = options.extends ?? null;
    const inherited = base === null ? INVALID_KINDS : base.kinds();
    const clashes = [...own.keys()].filter((tag) => inherited.has(tag)).sort();
    if (clashes.length > 0) {
      const what = base === null ? "the framework" : base.name();
      throw new ValueError(`${dialectName} would declare ${clashes.map((tag) => repr(tag)).join(", ")}, which ${what} has`);
    }
    this.byTag = base === null ? new Map([...own, ...inherited]) : new Map([...inherited, ...own]); // the base's first
    this.tag = base === null ? dialectName.toLowerCase() : base.tag;
    this.union = base === null ? `Expressions.${dialectName}.Expression` : base.union;
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

  /** Why a term value is not of this dialect, where it is another dialect's. */
  private foreign(term_: any): string | null {
    const union = dialectOf(term_);
    if (union === this.union) return null;
    const other = union.slice("Expressions.".length, -".Expression".length);
    return `${article(other)} ${kindOf(term_)[0]} is not ${article(this.dialectName)} term`;
  }

  /** A term's tag, record and `Kind`; throws `ValueError` for a term of another dialect, or of a kind the dialect does
   * not read. */
  kind(term_: any): [string, any, Kind] {
    const foreign = this.foreign(term_);
    if (foreign !== null) throw new ValueError(foreign);
    const [tag, record] = kindOf(term_);
    const kind = this.byTag.get(tag);
    if (kind === undefined) throw new ValueError(`${this.dialectName} has no kind ${repr(tag)}`);
    return [tag, record, kind];
  }

  /** The writer of a term of this dialect: see `spec`, a native value as this dialect's literal, and a callable given
   * the `Visitors.OfUnion` of this dialect's union. */
  spec(value: unknown): Writer {
    return spec(value, this._literal, this.tag);
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
        if (value instanceof Objects.Listed) r[name]([...value.values]); // a container of scalars: a literal's problems
        else r[name]((p: any) => p.as_scalar(value));
      }
      if (args.length < slots.length || (variadic === null && args.length !== slots.length)) {
        const least = variadic === null ? "" : "at least ";
        throw new ValueError(`${article(form_.kind)} takes ${least}${slots.length} arguments, got ${args.length}`);
      }
      slots.forEach((name, i) => {
        if (args[i] !== null) r[name](args[i]);
      });
      if (variadic !== null) {
        const rest = args.slice(slots.length);
        const members = _members(r.as_schema());
        if (members.length > 0 && rest.length % members.length !== 0) {
          throw new ValueError(`${article(form_.kind)} takes its arguments in ${members.length}s (${members.join(", ")}), got ${rest.length}`);
        }
        r[variadic](members.length === 0 ? rest : Array.from({ length: rest.length / members.length },
          (_, i) => pair(members, rest.slice(i * members.length, (i + 1) * members.length))));
      }
      return r;
    }), this.tag);
  }

  // Checks

  /** Problems with a term. References must be bound by an enclosing binding or be in `bound`. With `core`, every
   * operator must be in its kind's vocabulary. */
  validate(term_: unknown, bound: Iterable<string> = [], core = false): string[] {
    return this.problems(term(term_), new Set(bound), core);
  }

  private problems(node: any, bound: ReadonlySet<string>, core: boolean): string[] {
    const foreign = this.foreign(node);
    if (foreign !== null) return [foreign];
    const [tag, record] = kindOf(node);
    const kind = this.byTag.get(tag);
    if (kind === undefined) return [`${this.dialectName} has no kind ${repr(tag)}`];
    const what = article(tag);
    const attributes = attributesOf(record);
    if (kind.role === LITERAL) { // its problems, as its text's reader found them; a value it needs
      const found = attributes.has("problems") ? [...(attributes.get("problems") as Objects.Listed).values as string[]] : [];
      if ((attributes.get("value") ?? null) === null) return found.length > 0 ? found : [`${what} needs a value`];
      return [...found, ...(kind.check !== null ? kind.check(record) : [])];
    }
    if (kind.role === INVALID) return (kind.check as (record: any) => string[])(record);
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
      const names = kind.names !== null && problems.length === 0 ? kind.names(attributes) : [];
      scopes = args.map(() => new Set([...bound, ...names]));
    }
    if ((kind.role === APPLICATION || kind.role === QUANTIFIER) && problems.length === 0 && kind.vocabulary !== null) {
      const operator = operatorOf(node, kind);
      const signature = kind.vocabulary.get(operator);
      if (signature !== undefined && ![-1, args.length].includes(signature.arity())) { // -1: any number
        problems.push(`${operator} takes ${signature.arity()} arguments, got ${args.length}`);
      } else if (kind.closed && signature === undefined) {
        problems.push(`${repr(operator)} is not an operation ${this.dialectName} defines`);
      } else if (core && signature === undefined) {
        problems.push(`${repr(operator)} is not a core operation`);
      }
    }
    const members = _members(record.as_schema());
    args.forEach((argument, i) => {
      const j = i - slots.length;
      const label = j < 0 ? slots[i] as string : members.length > 0
        ? `${members[j % members.length]} ${Math.floor(j / members.length)}` : `argument ${j}`;
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
      for (const name of kind.names !== null ? kind.names(attributesOf(record)) : []) inner[name] = Domains.Anything;
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
