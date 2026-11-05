/**
 * Terms: the framework's schemas, and the generic reads of terms that every dialect's evaluator, validator and
 * translator shares.
 *
 * An expression is an `Expressions.Framework.Expression`, a reference object whose `root` is a term: a value of
 * `Expressions.Framework.Term`, held nested (docs/proposals/port, Decided, 2). `Term` is the union of the dialects' `Term`s
 * (docs/proposals/dialects, Decided, 1, revised 2026-11-03): its branches are the dialects (`patterns`, `python3`, ...),
 * each added by its dialect's install by schema extension, and each branch's schema is that dialect's `Term`, the value
 * union of its kinds, `Expressions.<Dialect>.Term`, whose branches are its kinds, named plainly (`binop`). Within a term
 * tree every parent-child link is a property: a dialect's own kinds hold its `Term`, so its terms nest its terms; the
 * framework's shared kinds hold `Expressions.Framework.Term`, any dialect's term, and each dialect's `Term` lists the
 * shared kinds it reuses. So a term value is either a value of `Term`,
 * its dialect then its kind, or a value of a dialect's `Term`, its kind alone: `term`, `kind_of` and `form` read both.
 *
 * `install` defines the framework's schemas in a store: `Term`, with no branch until a dialect adds its own; the shared
 * kinds `literal` (a domain representation, mbse-basis
 * [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): `value`, any value, absent where
 * its text is invalid; `text`, its source spelling, unvalidated; `problems`, a validation indicator for each problem its
 * text has; [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md)), `call`
 * (`callable`, by name; `arguments`, a container of terms by index), `variable` (`name`), `let` (`name`, `value`,
 * `body`), and the container constructors `list` (`elements`, a container of terms by index) and `mapping` (`entries`, a
 * container by index of `Expressions.Framework.Pair`s, each a `key` and a `value` term); the invalid-syntax kinds every
 * dialect's union holds, `error` (`text`, the source it spans as written; `terms`, the terms recovered within it) and
 * `missing` (`kind`, the kind the parser expected), modeled for parsers that keep invalid syntax and written by none yet;
 * `Expression`; and `HasRoot(schema, expression)`, the extension adjacency `expression` it gives `Schemas.OfExpression`. A
 * term carries no domain: whatever owns the root term gives its schema.
 *
 * Dialects, domains and operations are data too. A dialect is a singleton whose identity is its global name
 * (`Expressions.Framework.Patterns`), of its own reference object schema (`Expressions.Framework.Patterns.Dialect`), a branch of the kind
 * union `Expressions.Framework.Dialect`, which each dialect extends. It owns its domains by name
 * (`Expressions.Framework.Defines(dialect, name, domain)`), so a domain's path is its dialect's and its name; a domain is
 * an `Expressions.Framework.Domain`, a reference object holding its `kind`, a value of `Expressions.Framework.DomainKind`,
 * a union each dialect extends with its kinds of domain. A domain's schema is a named `Schemas.OfAny` restricted to the
 * scalar it narrows (`Expressions.Framework.Patterns.uint8`), which reads it through the extension adjacency `domain`
 * (`Expressions.Framework.HasDomain(schema, domain)`, unique both ways). A dialect names its operations
 * (`Expressions.Framework.Operates(dialect, name, operation)`), each a `Schemas.OfExpression` its module defines, whose
 * pattern's variables are its arguments, in the order they are declared, and whose `result` is its return.
 *
 * Terms are built through mbse-schemas' builders, in a transaction, and read through its readers: a term's kind is the
 * branch its dialect's `Term` holds, its properties the branch's members. Which properties are a kind's slots (a term
 * each: a property whose schema is `Expressions.Framework.Term` or a dialect's `Term`), its variadic arguments (a container of terms, or of
 * value objects of terms, a mapping's pairs, read as their terms in turn), its helpers (a value object that is not a
 * term and not a pair, or a container of them, or of a union of them: a Python call's keywords, a comparison's links, a
 * comprehension's `for` clauses) or its attributes (anything else) is read from the kind's schema. A helper is read as a
 * `Part` among the attributes, its kind, its own attributes and how many arguments it holds, and its terms are the
 * term's arguments too, after its slots and variadic arguments; so a form keeps a helper's structure in its attributes
 * and its terms in its arguments, and `make` writes it back. What the framework needs to know beyond the schema, how each
 * kind is read, is a `Kind`: its role, and which properties name what it binds and its operator.
 *
 * - `term(x)`: the term value of an expression, a term property's reader, a `Readers.OfAny` holding one, or a term.
 * - `kindOf(term)`: its kind's branch, `(tag, record)`; `dialectOf(term)`: the name of its dialect's `Term`;
 *   `dialectName(path)`: a dialect's name, of its path below `Expressions` (`C.Expressions`' is `C`).
 *   `form(term)`: its `Form`, `kind`, `attributes` and `arguments`; `node(tag, record)`: its `Node`, its helpers
 *   nested, as a dialect whose kinds hold sublanguages reads them to print and check them.
 * - `nameOf(term)`, `referenceName(name)`, `operatorOf(term, kind)`; `walk`, `fold`, `same`: traversal of a nested value.
 * - `Dialect`: a dialect's kinds by tag, with `validate`, `infer` and `make(form)`, the `Writer` of a form.
 * - `Writer`: a spec that writes a term of its dialect through the builders; `spec(x)` makes one of a writer, a native
 *   value (a literal), a term value (copied) or a callable taking the `Visitors.OfUnion` of a term value.
 *
 * The roles are:
 *
 * - `LITERAL`: a value, its `value`.
 * - `REFERENCE`: a value the scope resolves. A lexical reference (the default) is the value bound to its name, by an
 *   enclosing binding or import or by the scope; others, such as Excel's cell references, are resolved by the scope
 *   alone, and validation does not require them to be bound. `ambient` names are bound without being declared. A
 *   reference's name is its `name`: a string, or a name node, a helper (C++'s `idexpression`, holding its `Name`),
 *   whose name is an identifier's spelling (`referenceName`); a name node that is not an identifier (`std::cout`) is
 *   resolved by the scope alone, and the terms it holds (a template's arguments) are its arguments.
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
      // The union of the dialects' `Term`s: each dialect adds its own, `Expressions.<Dialect>.Term`, as the branch named
      // after it (`patterns`), by schema extension.
      (_: any) => _.Term.name("Expressions.Framework.Term"),
      // The shared kinds, which a dialect's `Term` lists where it reuses them; their slots hold any dialect's term.
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
      // Invalid syntax, which every dialect's `Term` holds: what a parser skipped, and the kind it expected.
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
      // A dialect: a singleton, its identity its global name (`Expressions.Framework.Patterns`), the root of its domains' paths.
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

/** A helper a term holds, as its form's attributes read it: its `kind` (its branch's tag, where a union of helpers holds
 * it, else its schema's name's last part, lowercased: `keyword`), its `attributes`, read as a term's are, and its `size`,
 * how many of the term's arguments are its terms (its slots, null where empty, its variadic arguments and its own
 * helpers' terms). Two parts are the same where their kinds, attributes and sizes are. */
export class Part {
  readonly attributes: ReadonlyMap<string, unknown>;

  constructor(readonly kind: string, attributes: ReadonlyMap<string, unknown> | Record<string, unknown> = new Map(),
    readonly size: number = 0) {
    this.attributes = attributes instanceof Map ? attributes : new Map(Object.entries(attributes));
  }

  [Repr.REPR](): string {
    return `Part(kind=${repr(this.kind)}, attributes=${repr(this.attributes)}, size=${this.size})`;
  }
}

function named(schema: unknown, name: string): boolean {
  return (schema as { name?: unknown } | null | undefined)?.name === name;
}

/** Whether a schema's values are terms: `Expressions.Framework.Term`, or a dialect's `Term`, the union of its kinds,
 * named `Expressions.<Dialect>.Term`. */
function holdsTerms(schema: unknown): boolean {
  const name = (schema as { name?: unknown } | null | undefined)?.name;
  return schema instanceof Schemas.OfUnion.Data && typeof name === "string"
    && name.startsWith("Expressions.") && name.endsWith(".Term");
}

type Parts = readonly [readonly string[], string | null, readonly string[]];
const PARTS = new WeakMap<object, readonly [Parts, readonly string[]]>();

/** Whether a schema is a value object whose properties are all terms, such as a mapping's pair. */
function isPair(schema: any): boolean {
  return schema instanceof Schemas.OfObject.Data && !schema.ref && schema.properties.size > 0
    && [...(schema.properties as Map<string, Schemas.OfProperty.Data>).values()].every((prop) => holdsTerms(prop.schema));
}

/** Whether a schema is a helper's: a value object that is not a pair, or a union, not of terms, whose branches are all
 * value objects, helpers or pairs (a branch of terms alone, such as TypeScript5's `parenthesizedexpression` among its
 * patterns, is a helper there). */
function isHelper(schema: any): boolean {
  if (schema instanceof Schemas.OfUnion.Data) {
    return !holdsTerms(schema) && schema.branches.length > 0
      && (schema.branches as readonly Schemas.OfUnion.Branch[]).every((branch) => isHelper(branch.schema)
        || isPair(branch.schema));
  }
  return schema instanceof Schemas.OfObject.Data && !schema.ref && !isPair(schema);
}

/** A kind's schema's slots (properties holding a term), its variadic property (a container of terms, or of value
 * objects of terms such as a mapping's pairs) or null, and its attributes (the rest, its helpers among them), each in
 * declaration order. */
export function _parts(schema: any): Parts {
  const cached = PARTS.get(schema);
  if (cached !== undefined) return cached[0];
  const slots: string[] = [];
  const attributes: string[] = [];
  const helpers: string[] = [];
  let variadic: string | null = null;
  for (const [name, prop] of schema.properties as Map<string, Schemas.OfProperty.Data>) {
    if (holdsTerms(prop.schema)) slots.push(name);
    else if (prop.schema instanceof Schemas.OfContainer.Data && (holdsTerms(prop.schema.element)
      || isPair(prop.schema.element))) variadic = name;
    else {
      attributes.push(name);
      if (isHelper(prop.schema) || (prop.schema instanceof Schemas.OfContainer.Data && isHelper(prop.schema.element))) {
        helpers.push(name);
      }
    }
  }
  const parts: Parts = [slots, variadic, attributes];
  PARTS.set(schema, [parts, helpers]);
  return parts;
}

/** A kind's schema's helper properties (each a helper, or a container of them), in declaration order. */
export function _helpers(schema: any): readonly string[] {
  _parts(schema);
  return (PARTS.get(schema) as readonly [Parts, readonly string[]])[1];
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

/** Whether `schema` is `Expressions.Framework.Expression` or refines it, as each dialect's holder does
 * (`Expressions.Python.Python3.Expression`): an expression, whose `root` holds its root term. */
export function isExpression(schema: unknown): boolean {
  let current: any = schema;
  while (current instanceof Schemas.OfObject.Data) {
    if (named(current, EXPRESSION)) return true;
    current = (current as any).refines;
  }
  return false;
}

/** Whether `value` is a term value: the reader of a value of `Expressions.Framework.Term` or of a dialect's `Term`. */
export function isTerm(value: unknown): boolean {
  if (isAny(value)) return false;
  return holdsTerms(schemaOf(value));
}

/** The term value of an expression (its root: an `Expressions.Framework.Expression` or a dialect's holder refining it),
 * of a term property's reader, of a `Readers.OfAny` holding one, or a
 * term value itself; throws `TypeError` for anything else, and `ValueError` where there is none. */
export function term(value: any): any {
  const schema = schemaOf(value);
  const found: any[] = [];
  if (isExpression(schema)) return term(value.root);
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

/** The name of the `Term` of the dialect a term value is of: `Expressions.Python.Python3.Term`. */
export function dialectOf(term_: any): string {
  return dialectValue(term_).as_schema().name;
}

/** The branch of its dialect's `Term` a term value holds: its tag, and its record (a `Readers.OfObject`). */
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

/** The helpers a helper property holds, each its kind and its record, in order. */
function helperRecords(record: any, name: string): [string, any][] {
  const found: [string, any][] = [];
  const one = (value: any): any => { // a helper, or a union holding one
    const schema = value.as_schema();
    if (schema instanceof Schemas.OfUnion.Data) {
      found.push(heldBranch(value) as [string, any]); // a union value holding nothing is not stored
    } else if (schema !== null) {
      found.push([(schema.name as string).split(".").pop()!.toLowerCase(), value]);
    }
    return value;
  };
  const read = (a: any): any => {
    a.as_object(one);
    a.as_union(one);
    a.as_container((c: any) => {
      if (c.as_schema() === null) return c;
      return c.as_entries((it: Iterator<[unknown, any]>) => {
        for (let next = it.next(); !next.done; next = it.next()) read(next.value[1]);
      });
    });
    return a;
  };
  record[name].as_value(read);
  return found;
}

function partOf(kind: string, record: any): Part {
  return new Part(kind, attributesOf(record), argumentsOf(record).length);
}

/** A record's attributes that are set, by name, in declaration order: a helper as its `Part`, a container of helpers as
 * an array of them. */
export function attributesOf(record: any): Map<string, any> {
  const schema = record.as_schema();
  const [, , names] = _parts(schema);
  const helpers = _helpers(schema);
  const found = new Map<string, any>();
  for (const name of names) {
    if (helpers.includes(name)) {
      const parts = helperRecords(record, name).map(([kind, helper]) => partOf(kind, helper));
      const many = schema.properties.get(name).schema instanceof Schemas.OfContainer.Data;
      if (parts.length > 0) found.set(name, many ? parts : parts[0]);
      continue;
    }
    const value = scalar(record, name);
    if (value !== null) found.set(name, value);
  }
  return found;
}

/** A record's own arguments: its slots, null where empty, then its variadic arguments. */
function ownArguments(record: any): any[] {
  const [slots, variadic] = _parts(record.as_schema());
  const fixed = slots.map((name) => slot(record, name));
  return variadic !== null ? [...fixed, ...variadicOf(record, variadic)] : fixed;
}

/** A record's arguments: its slots, null where empty, then its variadic arguments, then its helpers' arguments, in
 * order. */
export function argumentsOf(record: any): any[] {
  const found = ownArguments(record);
  for (const name of _helpers(record.as_schema())) {
    for (const [, helper] of helperRecords(record, name)) found.push(...argumentsOf(helper));
  }
  return found;
}

/** A term's `Form`. */
export function form(term_: any): Form {
  const [tag, record] = kindOf(term_);
  return new Form(tag, attributesOf(record), argumentsOf(record));
}

/** A term or a helper, its helpers nested: its `kind` (its tag, or its helper's), its `attributes` (scalars, and
 * containers of scalars, by name), its `slots` (its terms by property, null where empty), its `many` (its variadic
 * arguments: terms, or a pair's members in turn) and its `helpers` (by property: a `Node`, or an array of them). */
export class Node {
  constructor(readonly kind: string, readonly attributes: ReadonlyMap<string, any> = new Map(),
    readonly slots: ReadonlyMap<string, any> = new Map(), readonly many: readonly any[] = [],
    readonly helpers: ReadonlyMap<string, Node | readonly Node[]> = new Map()) {}
}

/** A record's `Node`, from its schema, its form's attributes and its arguments, as `form` reads them. */
function nest(schema: any, kind: string, attributes: ReadonlyMap<string, any>, args: readonly any[]): Node {
  const [slotNames] = _parts(schema);
  const held = new Map<string, any>();
  for (const name of _helpers(schema)) if (attributes.has(name)) held.set(name, attributes.get(name));
  let size = 0;
  for (const value of held.values()) for (const part of (Array.isArray(value) ? value : [value])) size += part.size;
  let i = args.length - size;
  const helpers = new Map<string, Node | readonly Node[]>();
  for (const [name, value] of held) {
    const prop = schema.properties.get(name).schema;
    const element = prop instanceof Schemas.OfContainer.Data ? prop.element : prop;
    const found: Node[] = [];
    for (const part of (Array.isArray(value) ? value : [value]) as Part[]) {
      const sub = element instanceof Schemas.OfUnion.Data
        ? (element.branches as readonly Schemas.OfUnion.Branch[]).find((branch) => branch.name === part.kind)!.schema
        : element;
      found.push(nest(sub, part.kind, part.attributes, args.slice(i, i + part.size)));
      i += part.size;
    }
    helpers.set(name, Array.isArray(value) ? found : found[0] as Node);
  }
  const plain = new Map([...attributes].filter(([name]) => !held.has(name)));
  const slots = new Map(slotNames.map((name, j) => [name, args[j]] as [string, any]));
  return new Node(kind, plain, slots, args.slice(slotNames.length, args.length - size), helpers);
}

/** A record's `Node`, a term's (its tag and record, as `kindOf` gives them) or a helper's, its helpers nested. */
export function node(tag: string, record: any): Node {
  return nest(record.as_schema(), tag, attributesOf(record), argumentsOf(record));
}

/** The name an attribute `name` gives: a string, or, where a name is a node (C++'s `idexpression`, holding its
 * `Name`), an identifier's spelling; null for a name node that is not an identifier (`std::cout`), or none. */
export function referenceName(value: unknown): any {
  if (value instanceof Part) return value.kind === "identifier" ? value.attributes.get("spelling") ?? null : null;
  return value ?? null;
}

/** The name a reference refers to, or a binding, quantifier or import binds: its `name`, a string, or the spelling of
 * the identifier its name node is (C++'s `idexpression`); null if it has none, or its name is not an identifier. */
export function nameOf(term_: any): any {
  const [, record] = kindOf(term_);
  const schema = record.as_schema();
  if (!schema.properties.has("name")) return null;
  if (_helpers(schema).includes("name")) return referenceName(attributesOf(record).get("name")); // a name node
  return scalar(record, "name");
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
 * element by element, as Python compares tuples; helpers' parts by their kinds, attributes and sizes, and arrays of them
 * element by element. */
export function sameNative(a: unknown, b: unknown): boolean {
  if (a instanceof Part || b instanceof Part) {
    return a instanceof Part && b instanceof Part && a.kind === b.kind && a.size === b.size
      && a.attributes.size === b.attributes.size
      && [...a.attributes].every(([k, v]) => b.attributes.has(k) && sameNative(v, b.attributes.get(k)));
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameNative(v, b[i]));
  }
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
 * writes it. `write(union)` is given the `Visitors.OfUnion` of its dialect's `Term`: where a value of
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

/** A record's arguments, as `argumentsOf` gives them, each with its label (`left`, `argument 0`, `key 1`,
 * `keywords 0 value`) and its path (`left`, `argument`, `key`, `keywords.value`). */
export function _labelled(record: any): [string, string, any][] {
  const schema = record.as_schema();
  const [slots, variadic] = _parts(schema);
  const own = ownArguments(record);
  const found: [string, string, any][] = slots.map((name, i) => [name, name, own[i]]);
  if (variadic !== null) {
    const members = _members(schema);
    own.slice(slots.length).forEach((argument, j) => {
      const member = members.length > 0 ? members[j % members.length] as string : null;
      const label = member !== null ? `${member} ${Math.floor(j / members.length)}` : `argument ${j}`;
      found.push([label, member ?? "argument", argument]);
    });
  }
  for (const name of _helpers(schema)) {
    const many = schema.properties.get(name).schema instanceof Schemas.OfContainer.Data;
    helperRecords(record, name).forEach(([, helper], i) => {
      const prefix = many ? `${name} ${i}` : name;
      for (const [label, path, argument] of _labelled(helper)) found.push([`${prefix} ${label}`, `${name}.${path}`, argument]);
    });
  }
  return found;
}

/** Writes a record of a term or a helper (`kind`, for messages): its attributes, then its arguments, in order, to its
 * slots, its variadic property and its helpers, each helper's part taking its size. */
function fill(r: any, kind: string, attributes: ReadonlyMap<string, unknown>, args: readonly (Writer | null)[]): any {
  const schema = r.as_schema();
  const [slots, variadic, names] = _parts(schema);
  const helpers = _helpers(schema);
  const parts: [string, Part][] = [];
  for (const [name, value] of attributes) {
    if (!names.includes(name)) throw new ValueError(`${article(kind)} has no attribute ${repr(name)}`);
    if (helpers.includes(name)) {
      for (const part of Array.isArray(value) ? value as Part[] : [value as Part]) parts.push([name, part]);
    } else if (value instanceof Objects.Listed) r[name]([...value.values]); // a container of scalars: a literal's problems
    else r[name]((p: any) => p.as_scalar(value));
  }
  const held = parts.reduce((total, [, part]) => total + part.size, 0);
  if (args.length < slots.length + held || (variadic === null && args.length !== slots.length + held)) {
    const least = variadic === null ? "" : "at least ";
    throw new ValueError(`${article(kind)} takes ${least}${slots.length + held} arguments, got ${args.length}`);
  }
  slots.forEach((name, i) => {
    if (args[i] !== null) r[name](args[i]);
  });
  if (variadic !== null) {
    const rest = args.slice(slots.length, args.length - held);
    const members = _members(schema);
    if (members.length > 0 && rest.length % members.length !== 0) {
      throw new ValueError(`${article(kind)} takes its arguments in ${members.length}s (${members.join(", ")}), got ${rest.length}`);
    }
    r[variadic](members.length === 0 ? rest : Array.from({ length: rest.length / members.length },
      (_, i) => pair(members, rest.slice(i * members.length, (i + 1) * members.length))));
  }
  let offset = args.length - held;
  for (const name of helpers) {
    const mine = parts.filter(([owner]) => owner === name).map(([, part]) => part);
    if (mine.length === 0) continue;
    const prop = schema.properties.get(name).schema;
    const specs = mine.map((part) => {
      const spec = helperSpec(prop, part, args.slice(offset, offset + part.size));
      offset += part.size;
      return spec;
    });
    if (prop instanceof Schemas.OfContainer.Data) r[name](specs);
    else r[name](specs[0]);
  }
  return r;
}

/** The spec of a helper, from its part and its arguments: given the visitor of a property or of a container's element,
 * it writes the helper, the union's branch its part's kind where a union of helpers holds it. */
function helperSpec(schema: any, part: Part, args: readonly (Writer | null)[]): (visitor: any) => any {
  const element = schema instanceof Schemas.OfContainer.Data ? schema.element : schema;
  const filled = (o: any): any => fill(o, part.kind, part.attributes, args);
  const write = (visitor: any): any => {
    if (visitor.as_schema() instanceof Schemas.OfProperty.Data) return visitor.as_value(write); // a property: its value
    if (element instanceof Schemas.OfUnion.Data) return visitor.as_union((u: any) => u[part.kind](filled));
    return visitor.as_object(filled);
  };
  return write;
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
  optional?: readonly string[];
  scopes?: ((record: any) => ReadonlySet<string>[]) | null;
  operators?: ((attributes: ReadonlyMap<string, any>) => readonly string[]) | null;
  result?: ((attributes: ReadonlyMap<string, any>, domains: Domains.Domain[]) => Domains.Domain) | null;
  unfold?: ((form: Form) => Form | null) | null;
  spelling?: readonly string[];
}

/** How the framework reads a kind, beyond its schema: its `role`; the property naming its operator (`operator`, or null
 * when its tag names it); for an application or a quantifier, its `vocabulary` (operator names to signatures; null
 * accepts any name, with `signature`), and whether it is `closed`, refusing an operator outside its vocabulary whether
 * or not validation asks for the core (the operations its dialect defines, and no others); the properties it requires
 * (`required`); for a reference, whether it is `lexical` and the `ambient` names bound without a declaration; for an
 * import, the names it binds, of its attributes (`names(attributes)`); its own problems (`check(record)`); the domain
 * its own attributes give it, where they give one (`typed(record)`: C's type of a constant or a cast; a term carries no
 * domain); and the standards of its dialect's language that have it (`standards`: `C11`, `C++17`), where its dialect
 * covers several, as mbse-programs' standards record when each kind arrived.
 * Where its role says too little: the slots that may be empty (`optional`, by path: a slot's name, a pair's member's, or
 * a helper property's name, a dot, and the path within the helper: `generators.target`; or, written `*.size`, a
 * helper's slot of that name at any depth, as a type name's declarators nest); the names each of its
 * arguments has bound, besides its scope's (`scopes(record)`, one set per argument: a comprehension's targets, a
 * lambda's parameters); the operators it applies, where it applies several (`operators(attributes)`: a comparison
 * chain's), each checked against its vocabulary, and the domain they give (`result(attributes, domains)`); an
 * equivalent form of simpler terms (`unfold(form)`, or null: a comparison chain as the `and` of its links), which
 * translation reads where no rule reads the term itself; and, for a literal, the attributes that spell it rather than
 * give its value (`spelling`), which no translation carries. */
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
  readonly optional: readonly string[];
  readonly scopes: ((record: any) => ReadonlySet<string>[]) | null;
  readonly operators: ((attributes: ReadonlyMap<string, any>) => readonly string[]) | null;
  readonly result: ((attributes: ReadonlyMap<string, any>, domains: Domains.Domain[]) => Domains.Domain) | null;
  readonly unfold: ((form: Form) => Form | null) | null;
  readonly spelling: readonly string[];

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
    this.optional = options.optional ?? [];
    this.scopes = options.scopes ?? null;
    this.operators = options.operators ?? null;
    this.result = options.result ?? null;
    this.unfold = options.unfold ?? null;
    this.spelling = options.spelling ?? ["text", "problems"];
    Object.freeze(this);
  }
}

/** What invalid syntax is, `error` or `missing` by its tag: an error, the source it spans; a missing term, the kind the
 * parser expected. Where a sublanguage's union holds invalid syntax (a dialect's `Type` or `Pattern`), the dialect's
 * checks report it so, as validation reads a helper's own problems no further. */
export function invalidProblems(tag: string, attributes: ReadonlyMap<string, any>): string[] {
  if (tag === "error") return ["invalid syntax" + (attributes.has("text") ? ` ${repr(attributes.get("text"))}` : "")];
  return [`missing ${attributes.get("kind") ?? "a term"}`];
}

/** What invalid syntax is: an error, the source it spans; a missing term, the kind the parser expected. */
function invalidCheck(record: any): string[] {
  return invalidProblems(record.as_schema().name === "Expressions.Framework.Error" ? "error" : "missing", attributesOf(record));
}

/** How a printer writes invalid syntax: an error as the source it spans, as written, and a missing term as nothing; an
 * error with no text has nothing to print, and is refused by name. */
export function invalidText(dialect: Dialect, tag: string, attributes: ReadonlyMap<string, any>): string {
  if (tag === "missing") return "";
  if (!attributes.has("text")) throw new ValueError(`${dialect.name()} error has no text to print`);
  return attributes.get("text");
}

/** The framework's kinds of invalid syntax, which every dialect's `Term` holds and every dialect reads. */
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

/** A dialect's name, of its path below `Expressions` (its family's name and its own): its own (`Python.Python3`'s is
 * `Python3`, `Framework.Patterns`' `Patterns`), or its family's where its own says only that it is the family's
 * expressions (`C.Expressions`' is `C`). */
export function dialectName(path: string): string {
  const parts = path.split(".");
  const own = parts[parts.length - 1] as string;
  return own === "Expressions" && parts.length > 1 ? parts[parts.length - 2] as string : own;
}

/** An expression language: the kinds it reads, by tag, its `path`, its family's and its own name (`Python.Python3`,
 * `C.Expressions`), its `name` (`dialectName(path)`: `Python3`, `C`), and `domain_of(value)`, the domain of a literal's
 * value by the scalar it is written with (for `infer`; a term carries no domain). Its terms are values of its `Term`,
 * `Expressions.<path>.Term` (`union`), the branch `tag` (its name in lowercase) of `Expressions.Framework.Term`;
 * besides its own kinds it reads the framework's kinds of invalid syntax (`INVALID_KINDS`). A dialect may extend another
 * (`extends`): its kinds are the base's and its own, whose tags must differ from the base's, added to the base's union,
 * whose terms it reads. It validates (`validate`), infers (`infer`) and writes (`make`) terms of its kinds. */
export class Dialect {
  readonly base: Dialect | null;
  readonly tag: string;
  readonly path: string;
  readonly union: string;
  private readonly byTag: Map<string, Kind>;
  private readonly domainOf: (value: unknown) => Domains.Domain;
  readonly _literal: ((value: unknown) => Writer | null) | null;

  private readonly own: string;

  constructor(path: string, kinds: Record<string, Kind>, options: DialectOptions) {
    const own = dialectName(path);
    const declared = new Map(Object.entries(kinds));
    const base = options.extends ?? null;
    const inherited = base === null ? INVALID_KINDS : base.kinds();
    const clashes = [...declared.keys()].filter((tag) => inherited.has(tag)).sort();
    if (clashes.length > 0) {
      const what = base === null ? "the framework" : base.name();
      throw new ValueError(`${own} would declare ${clashes.map((tag) => repr(tag)).join(", ")}, which ${what} has`);
    }
    this.byTag = base === null ? new Map([...declared, ...inherited]) : new Map([...inherited, ...declared]); // the base's first
    this.tag = base === null ? own.toLowerCase() : base.tag;
    this.own = own;
    this.path = path;
    this.union = base === null ? `Expressions.${path}.Term` : base.union;
    this.domainOf = options.domain_of;
    this.base = base;
    this._literal = options.literal !== undefined && options.literal !== null || base === null
      ? options.literal ?? null : base._literal;
  }

  name(): string {
    return this.own;
  }

  kinds(): Map<string, Kind> {
    return new Map(this.byTag);
  }

  toString(): string {
    return `<dialect ${this.own}>`;
  }

  [Repr.REPR](): string {
    return this.toString();
  }

  /** Why a term value is not of this dialect, where it is another dialect's. */
  private foreign(term_: any): string | null {
    const union = dialectOf(term_);
    if (union === this.union) return null;
    const other = dialectName(union.slice("Expressions.".length, -".Term".length));
    return `${article(other)} ${kindOf(term_)[0]} is not ${article(this.own)} term`;
  }

  /** A term's tag, record and `Kind`; throws `ValueError` for a term of another dialect, or of a kind the dialect does
   * not read. */
  kind(term_: any): [string, any, Kind] {
    const foreign = this.foreign(term_);
    if (foreign !== null) throw new ValueError(foreign);
    const [tag, record] = kindOf(term_);
    const kind = this.byTag.get(tag);
    if (kind === undefined) throw new ValueError(`${this.own} has no kind ${repr(tag)}`);
    return [tag, record, kind];
  }

  /** The writer of a term of this dialect: see `spec`, a native value as this dialect's literal, and a callable given
   * the `Visitors.OfUnion` of this dialect's `Term`. */
  spec(value: unknown): Writer {
    return spec(value, this._literal, this.tag);
  }

  /** The writer of a term with this form: its attributes written as scalars (a container of scalars as a container, a
   * helper's `Part` as the helper), its arguments (specs: terms, writers, native values) to its slots in order, then to
   * its variadic property, then to its helpers, each its part's size. */
  make(form_: Form): Writer {
    if (!this.byTag.has(form_.kind)) throw new ValueError(`${this.own} has no kind ${repr(form_.kind)}`);
    const args = form_.arguments.map((a) => (a === null ? null : this.spec(a)));
    return new Writer((union: any) => union[form_.kind]((r: any) => fill(r, form_.kind, form_.attributes, args)), this.tag);
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
    if (kind === undefined) return [`${this.own} has no kind ${repr(tag)}`];
    const what = article(tag);
    const attributes = attributesOf(record);
    const declared = record.as_schema().properties as Map<string, Schemas.OfProperty.Data>;
    if (kind.role === LITERAL) { // its problems, as its text's reader found them; a value it needs, where it has one
      const found = attributes.has("problems") ? [...(attributes.get("problems") as Objects.Listed).values as string[]] : [];
      if (declared.has("value") && (attributes.get("value") ?? null) === null) {
        return found.length > 0 ? found : [`${what} needs a value`];
      }
      return [...found, ...(kind.check !== null ? kind.check(record) : [])];
    }
    if (kind.role === INVALID) return (kind.check as (record: any) => string[])(record);
    const problems = kind.required.filter((name) => [null, undefined, ""].includes(attributes.get(name)))
      .map((name) => `${what} needs ${article(name)}`);
    for (const [name, value] of attributes) { // the builders write any scalar; validation reports the wrong one
      const held = (declared.get(name) as Schemas.OfProperty.Data).schema;
      if (held instanceof Schemas.OfScalar.Data && !Schemas.isScalarOf(held.type, value)) {
        problems.push(`${what}'s ${name} must be a ${Repr.tokenName(held.type)}, got ${typeName(value)}`);
      }
    }
    if (kind.check !== null) problems.push(...kind.check(record));
    const name = referenceName(attributes.get("name"));
    if (kind.role === REFERENCE) {
      if (kind.lexical && problems.length === 0 && name !== null && !bound.has(name) && !kind.ambient.has(name)) {
        problems.push(`${tag} ${repr(name)} is not bound`);
      }
      if (!(attributes.get("name") instanceof Part)) return problems;
      // a name node: a name that is not an identifier is resolved by the scope alone (`std::cout`), and the terms
      // within it (a template's arguments) are checked as an application's are
    }
    const labelled = _labelled(record);
    const args = labelled.map(([, , argument]) => argument);
    let scopes: ReadonlySet<string>[] = args.map(() => bound);
    if (kind.scopes !== null) {
      scopes = kind.scopes(record).map((names) => new Set([...bound, ...names]));
    } else if (kind.role === BINDING || kind.role === QUANTIFIER) {
      const inner = problems.length === 0 ? new Set([...bound, name]) : bound;
      scopes = args.map((_, i) => (i === 0 ? bound : inner));
    } else if (kind.role === IMPORT) {
      const names = kind.names !== null && problems.length === 0 ? kind.names(attributes) : [];
      scopes = args.map(() => new Set([...bound, ...names]));
    }
    if ((kind.role === APPLICATION || kind.role === QUANTIFIER) && problems.length === 0 && kind.vocabulary !== null) {
      const vocabulary = kind.vocabulary;
      if (kind.operators !== null) { // several, each checked against the vocabulary
        problems.push(...kind.operators(attributes).filter((operator) => core && !vocabulary.has(operator))
          .map((operator) => `${repr(operator)} is not a core operation`));
      } else {
        const operator = operatorOf(node, kind);
        const signature = vocabulary.get(operator);
        if (signature !== undefined && ![-1, args.length].includes(signature.arity())) { // -1: any number
          problems.push(`${operator} takes ${signature.arity()} arguments, got ${args.length}`);
        } else if (kind.closed && signature === undefined) {
          problems.push(`${repr(operator)} is not an operation ${this.own} defines`);
        } else if (core && signature === undefined) {
          problems.push(`${repr(operator)} is not a core operation`);
        }
      }
    }
    labelled.forEach(([label, path, argument], i) => {
      if (argument === null) {
        if (!kind.optional.includes(path) && !kind.optional.some((entry) => entry.startsWith("*.") && path.endsWith(entry.slice(1)))) {
          problems.push(`${what} needs ${article(label)}`);
        }
      } else problems.push(...this.problems(argument, scopes[i] as ReadonlySet<string>, core).map((p) => `${label}: ${p}`));
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
    } else { // an empty slot, where it may be empty, is not known
      domains = args.map((argument) => (argument === null ? Domains.Anything : this.inferIn(argument, environment)));
    }
    if (kind.result !== null) return kind.result(attributesOf(record), domains); // several operators, which it applies
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
