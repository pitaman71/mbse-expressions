/**
 * Expressions of the Basic dialect: the core vocabulary, for rules and constraints.
 * `Evaluators` evaluates them.
 *
 * - `OfLiteral`: a native value, and its value domain when that is not the native's default (see `Domains`).
 * - `OfOperation`: a named operation applied to ordered arguments, e.g. `eq(a, b)`. The vocabulary of names is open;
 *   the core operations (`CORE`) are the ones every binding evaluates. See docs/EXPRESSIONS.md.
 * - `OfVariable`: the value bound to a name.
 * - `OfLet`: binds a name to the value of one expression within another, its body.
 * - `OfAny`: any of these.
 *
 * The dialect (`DIALECT`) is declared with the framework (`Framework/Terms`), which gives each kind its `Data`,
 * a `Builder` finalized by `create()`, `clone()` or `update()` (none validate), a `Spec` (a value, or a callable that
 * takes and returns the builder) and `resolve`, and a `Schema`, the meta-schema that describes its data as an
 * ordinary object schema, so expressions serialize, validate and compare like any other objects:
 *
 * - Every kind's schema declares `kind`, a tag with a fixed value: 'literal', 'operation', 'variable' or 'let'.
 * - `OfLiteral.Schema` declares one optional property per native type (`int`, `float`, `str`, `bool`, `bytes`); a
 *   literal sets exactly one. Its `domain`, a value of `Domains.Schema`, is written only when it is not the native's
 *   default: by name when the domain is registered, otherwise by value.
 * - `OfOperation.Schema`, `OfVariable.Schema` and `OfLet.Schema` declare `name`.
 * - Operations and lets declare the adjacency `arguments` to `Arguments`, a relation linking a `parent` to an
 *   `argument` with an `index`; `unique(argument)` makes the parent and index determine the argument. A let's value is
 *   its argument 0 and its body its argument 1.
 * - Every kind declares `used_by`: the same relation seen from the argument. The parents' arguments imply it, so data
 *   never writes it and builders ignore entries added to it.
 * - `OfAny.Schema` is the union of the four, discriminated by the tag: `eq(get(this, 'kind'), 'literal')`, and so on.
 *
 * The meta-schemas are registered with `Proxies` as 'Expressions.OfLiteral', 'Expressions.OfOperation',
 * 'Expressions.OfVariable', 'Expressions.OfLet' and 'Expressions.Arguments', the names snapshots carry. `Builders`
 * rebuilds `Data` from snapshots, e.g. `Json.FromJSON(Expressions.Builders).Reachable(Expressions.OfLet.Schema, text)`.
 * `Data` is `Visitable`; builders implement `Visitors.OfObject`.
 *
 * `Term`s write expressions with methods: `variable('this').age.ge(18n)` is `ge(get(this, 'age'), 18)`.
 */

import { Repr } from "@mbse/schemas/Framework";
import type { Schemas, Visitors } from "@mbse/schemas/Framework";

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

type Native = Visitors.Native;

export const LITERAL = "Expressions.OfLiteral";
export const OPERATION = "Expressions.OfOperation";
export const VARIABLE = "Expressions.OfVariable";
export const LET = "Expressions.OfLet";
export const ARGUMENTS = F.ARGUMENTS;
export const Arguments = F.Arguments;

/** The core operations and their numbers of arguments. */
export const CORE: ReadonlyMap<string, number> = new Map(
  [...Domains.SIGNATURES].map(([name, signature]) => [name, signature.arity()]));

const NAME: ReadonlyMap<string, unknown> = new Map([["name", String]]);

// --- Data ---

const DOMAIN = new Map([["domain", new F.ValueProperty(Domains.Schema, Domains.to_plain,
  (plain) => Domains.from_plain(plain as Map<string, never>))]]);
/** The operations that need a domain: their result's. */
const TYPED = ["convert", "reinterpret", "unpack"];

/** The problems of a domain that a literal or an operation carries. */
function domainProblems(what: string, domain: unknown): string[] {
  if (!(domain instanceof Domains.Domain)) return [`${what} domain must be a value domain, got ${Repr.typeName(domain)}`];
  return domain.validate().map((problem) => `domain: ${problem}`);
}

class _LiteralData extends F.Node {
  static override KIND = "literal";
  static override ROLE = F.LITERAL;
  static override VALUE = F.NATIVES;
  static override VALUES = DOMAIN;
  declare value: unknown;
  /** A value domain, or null for the value's native's default. */
  declare domain: unknown;

  constructor(value: unknown = null, domain: unknown = null) {
    super(value, domain);
    if (this.domain !== null && F.nativeName(this.value) !== null && Domains.of(this.value) instanceof Domains.Domain &&
      (Domains.of(this.value) as Domains.Domain).equals(this.domain)) {
      this.domain = null; // a native's default domain is no domain at all
    }
  }

  override typed(): Domains.Domain | null {
    return this.domain as Domains.Domain | null;
  }

  /** A literal's domain is valid and holds its value. */
  override check(): string[] {
    const domain = this.domain;
    if (domain === null) return [];
    const problems = domainProblems("a literal's", domain);
    if (problems.length === 0 && !(domain as Domains.Domain).contains(this.value)) {
      problems.push(`a literal of ${(domain as Domains.Domain).name()} cannot hold ${Repr.repr(this.value)}`);
    }
    return problems;
  }
}

class _OperationData extends F.Node {
  static override KIND = "operation";
  static override ROLE = F.APPLICATION;
  static override PROPERTIES = NAME;
  static override VARIADIC = "arguments";
  static override OPERATOR = "name";
  static override VOCABULARY = Domains.SIGNATURES;
  static override VALUES = DOMAIN;
  declare name: unknown;
  declare arguments: readonly unknown[];
  /** The domain of the result, which the conversions need, kept even when it is a default. */
  declare domain: unknown;

  constructor(name: unknown = null, args: readonly unknown[] = [], domain: unknown = null) {
    super(name, args, domain);
  }

  override typed(): Domains.Domain | null {
    return this.domain as Domains.Domain | null;
  }

  /** A conversion needs a domain, which must be valid; other core operations take none. */
  override check(): string[] {
    const name = this.name as string;
    if (this.domain === null) return TYPED.includes(name) ? [`${name} needs a domain`] : [];
    if (Domains.SIGNATURES.has(name) && !TYPED.includes(name)) return [`${name} takes no domain`];
    return domainProblems("an operation's", this.domain);
  }
}

class _VariableData extends F.Node {
  static override KIND = "variable";
  static override ROLE = F.REFERENCE;
  static override PROPERTIES = NAME;
  declare name: unknown;

  constructor(name: unknown = null) {
    super(name);
  }
}

class _LetData extends F.Node {
  static override KIND = "let";
  static override ROLE = F.BINDING;
  static override PROPERTIES = NAME;
  static override SLOTS = ["value", "body"];
  declare name: unknown;
  declare value: any;
  declare body: any;

  constructor(name: unknown = null, value: unknown = null, body: unknown = null) {
    super(name, value, body);
  }
}

type AnyData = _LiteralData | _OperationData | _VariableData | _LetData;

// --- Builders: Visitors that build Data ---

/** Builds an `OfLiteral.Data`. DSL: `.value(native)` and `.domain(domain)`. As a `Visitors.OfObject`, it has one
 * property per native type, and setting one replaces the value, and the property `domain`. */
class _LiteralBuilder extends F.Builder {
  static override DATA = _LiteralData;

  constructor(instance?: _LiteralData) {
    super(instance);
  }

  value(value: Native): this {
    return this.set("value", value);
  }

  domain(domain: unknown): this {
    return this.set("domain", domain as Native);
  }

  override create(...args: unknown[]): _LiteralData {
    return super.create(...args);
  }
}

/** A builder whose kind has a `name`. DSL: `.name(str)`. */
class _NamedBuilder extends F.Builder {
  name(name: string): this {
    return this.set("name", name);
  }
}

/** Builds an `OfOperation.Data`. DSL: `.name(str)`, `.arguments(...specs)`, which appends `OfAny.Spec`s (a native
 * value is a literal), and `.domain(domain)`, its result's. As a `Visitors.OfObject`, arguments are `arguments`
 * entries, ordered by `index`. */
class _OperationBuilder extends _NamedBuilder {
  static override DATA = _OperationData;

  constructor(instance?: _OperationData) {
    super(instance);
  }

  domain(domain: unknown): this {
    return this.set("domain", domain as Native);
  }

  override create(...args: unknown[]): _OperationData {
    return super.create(...args);
  }
}

/** Builds an `OfVariable.Data`. DSL: `.name(str)`. */
class _VariableBuilder extends _NamedBuilder {
  static override DATA = _VariableData;

  constructor(instance?: _VariableData) {
    super(instance);
  }

  override create(...args: unknown[]): _VariableData {
    return super.create(...args);
  }
}

/** Builds an `OfLet.Data`. DSL: `.name(str)`, `.value(spec)` and `.body(spec)`, each an `OfAny.Spec`. As a
 * `Visitors.OfObject`, the value is the `arguments` entry with index 0 and the body the one with index 1. */
class _LetBuilder extends _NamedBuilder {
  static override DATA = _LetData;

  constructor(instance?: _LetData) {
    super(instance);
  }

  value(spec: OfAny.Spec): this {
    return this.argument("value", spec);
  }

  body(spec: OfAny.Spec): this {
    return this.argument("body", spec);
  }

  override create(...args: unknown[]): _LetData {
    return super.create(...args);
  }
}

/** Selects a kind through `as_<kind>(spec)`. Finalizing yields that kind's data. */
class _AnyBuilder extends F.AnyBuilder {
  constructor(instance?: AnyData) {
    super(instance);
  }

  as_literal(spec: OfLiteral.Spec): _AnyBuilder {
    this.selected = OfLiteral.resolve(spec);
    return this;
  }

  as_operation(spec: OfOperation.Spec): _AnyBuilder {
    this.selected = OfOperation.resolve(spec);
    return this;
  }

  as_variable(spec: OfVariable.Spec): _AnyBuilder {
    this.selected = OfVariable.resolve(spec);
    return this;
  }

  as_let(spec: OfLet.Spec): _AnyBuilder {
    this.selected = OfLet.resolve(spec);
    return this;
  }

  override create(...args: unknown[]): AnyData {
    return super.create(...args);
  }
}

// --- The dialect and its meta-schemas ---

export const DIALECT = new F.Declared("Basic", [_LiteralData, _OperationData, _VariableData, _LetData], {
  domain_of: Domains.of,
  anyBuilder: _AnyBuilder,
  builders: new Map<string, typeof F.Builder>([["literal", _LiteralBuilder], ["operation", _OperationBuilder],
    ["variable", _VariableBuilder], ["let", _LetBuilder]]),
  schemaNames: new Map([["literal", LITERAL], ["operation", OPERATION], ["variable", VARIABLE], ["let", LET]]),
});

/** Builds expressions from snapshots: `Builders['Expressions.OfLiteral'](instance)` returns a builder, as
 * `Plain.FromPlain` expects. `schema` and `name_of` look the meta-schemas up. */
export const Builders = DIALECT.Builders;

// --- Specs ---

export namespace OfLiteral {
  /** A native value. `Spec` is a native value, an `OfLiteral.Data`, or a callable taking the builder. */
  export const Data = _LiteralData;
  export type Data = _LiteralData;
  export const Builder = _LiteralBuilder;
  export type Builder = _LiteralBuilder;
  export type Spec = Native | _LiteralData | Term | ((builder: _LiteralBuilder) => _LiteralBuilder);
  export const Schema: Schemas.OfObject.Data = _LiteralData.Schema;

  export function resolve(spec: Spec | unknown): _LiteralData {
    if (F.nativeName(spec) !== null) return new _LiteralData(spec);
    return F.resolve(spec, (v): v is _LiteralData => v instanceof _LiteralData, () => new _LiteralBuilder(),
      "a native value, a literal");
  }
}

export namespace OfOperation {
  /** A named operation applied to ordered arguments. */
  export const Data = _OperationData;
  export type Data = _OperationData;
  export const Builder = _OperationBuilder;
  export type Builder = _OperationBuilder;
  export type Spec = _OperationData | Term | ((builder: _OperationBuilder) => _OperationBuilder);
  export const Schema: Schemas.OfObject.Data = _OperationData.Schema;

  export function resolve(spec: Spec | unknown): _OperationData {
    return F.resolve(spec, (v): v is _OperationData => v instanceof _OperationData, () => new _OperationBuilder(),
      "an operation");
  }
}

export namespace OfVariable {
  /** The value bound to a name. `Spec` is a name, an `OfVariable.Data`, or a callable taking the builder. */
  export const Data = _VariableData;
  export type Data = _VariableData;
  export const Builder = _VariableBuilder;
  export type Builder = _VariableBuilder;
  export type Spec = string | _VariableData | Term | ((builder: _VariableBuilder) => _VariableBuilder);
  export const Schema: Schemas.OfObject.Data = _VariableData.Schema;

  export function resolve(spec: Spec | unknown): _VariableData {
    if (typeof spec === "string") return new _VariableData(spec);
    return F.resolve(spec, (v): v is _VariableData => v instanceof _VariableData, () => new _VariableBuilder(),
      "a name, a variable");
  }
}

export namespace OfLet {
  /** Binds a name to the value of one expression within another, its body. */
  export const Data = _LetData;
  export type Data = _LetData;
  export const Builder = _LetBuilder;
  export type Builder = _LetBuilder;
  export type Spec = _LetData | Term | ((builder: _LetBuilder) => _LetBuilder);
  export const Schema: Schemas.OfObject.Data = _LetData.Schema;

  export function resolve(spec: Spec | unknown): _LetData {
    return F.resolve(spec, (v): v is _LetData => v instanceof _LetData, () => new _LetBuilder(), "a let");
  }
}

export namespace OfAny {
  /** Any expression. `Spec` is a native value (a literal), an expression, a `Term`, or a callable taking the
   * builder. */
  export type Data = AnyData;
  export const Builder = _AnyBuilder;
  export type Builder = _AnyBuilder;
  export type Spec = Native | AnyData | Term | ((builder: _AnyBuilder) => _AnyBuilder);
  export const Schema: Schemas.OfUnion.Data = DIALECT.Schema;

  export function resolve(spec: Spec | unknown): AnyData {
    return DIALECT.resolve(spec);
  }
}

// --- Terms: writing expressions with methods ---

/** The methods of a `Term`. */
class TermTarget extends F.Term {
  declare readonly data: AnyData;

  get(name: string): Term {
    return operation("get", this as unknown as Term, name);
  }

  has(name: string): Term {
    return operation("has", this as unknown as Term, name);
  }

  eq(other: OfAny.Spec): Term {
    return operation("eq", this as unknown as Term, other);
  }

  ne(other: OfAny.Spec): Term {
    return operation("ne", this as unknown as Term, other);
  }

  lt(other: OfAny.Spec): Term {
    return operation("lt", this as unknown as Term, other);
  }

  le(other: OfAny.Spec): Term {
    return operation("le", this as unknown as Term, other);
  }

  gt(other: OfAny.Spec): Term {
    return operation("gt", this as unknown as Term, other);
  }

  ge(other: OfAny.Spec): Term {
    return operation("ge", this as unknown as Term, other);
  }

  and_(other: OfAny.Spec): Term {
    return operation("and", this as unknown as Term, other);
  }

  or_(other: OfAny.Spec): Term {
    return operation("or", this as unknown as Term, other);
  }

  not_(): Term {
    return operation("not", this as unknown as Term);
  }

  implies(other: OfAny.Spec): Term {
    return operation("implies", this as unknown as Term, other);
  }

  add(other: OfAny.Spec): Term {
    return operation("add", this as unknown as Term, other);
  }

  sub(other: OfAny.Spec): Term {
    return operation("sub", this as unknown as Term, other);
  }

  mul(other: OfAny.Spec): Term {
    return operation("mul", this as unknown as Term, other);
  }

  neg(): Term {
    return operation("neg", this as unknown as Term);
  }

  bitand(other: OfAny.Spec): Term {
    return operation("bitand", this as unknown as Term, other);
  }

  bitor(other: OfAny.Spec): Term {
    return operation("bitor", this as unknown as Term, other);
  }

  bitxor(other: OfAny.Spec): Term {
    return operation("bitxor", this as unknown as Term, other);
  }

  bitnot(): Term {
    return operation("bitnot", this as unknown as Term);
  }

  shl(count: OfAny.Spec): Term {
    return operation("shl", this as unknown as Term, count);
  }

  shr(count: OfAny.Spec): Term {
    return operation("shr", this as unknown as Term, count);
  }

  /** The value in `domain`, kept: rounded or overflowing as `domain` does. */
  convert(domain: unknown): Term {
    return term(new _OperationData("convert", [this.data], domain));
  }

  /** The bit pattern in `domain`, of the same width. */
  reinterpret(domain: unknown): Term {
    return term(new _OperationData("reinterpret", [this.data], domain));
  }

  /** A packed value's representation. */
  pack(): Term {
    return operation("pack", this as unknown as Term);
  }

  /** The value of the packed `domain` that a representation stands for. */
  unpack(domain: unknown): Term {
    return term(new _OperationData("unpack", [this.data], domain));
  }
}

/** An expression written with methods. `.name` reads a property (`get`); use `.get(name)` for names that are also
 * methods, such as `eq`. A `Term` is an `OfAny.Spec`; `.data` is its expression. Property names come from schemas at
 * runtime, so they are typed loosely, like proxy properties. */
export type Term = TermTarget & { readonly [property: string]: any };

function term(data: AnyData): Term {
  return new Proxy(new TermTarget(data), {
    get(target, property, receiver) {
      if (typeof property === "symbol" || property in target) return Reflect.get(target, property, receiver);
      if (property === "then" || property === "toJSON") return undefined; // probes by `await` and `JSON.stringify`
      return target.get(property);
    },
  }) as Term;
}

/** The variable `name`. */
export function variable(name: string): Term {
  return term(new _VariableData(name));
}

/** The literal `value`, of `domain` (by default, its native's). */
export function literal(value: Native, domain: unknown = null): Term {
  return term(new _LiteralData(value, domain));
}

/** `body`, with `name` bound to the value of `value`. */
export function let_(name: string, value: OfAny.Spec, body: OfAny.Spec): Term {
  return term(new _LetData(name, OfAny.resolve(value), OfAny.resolve(body)));
}

/** The operation `name` applied to `args`; for operations outside the core, or without a method. */
export function operation(name: string, ...args: OfAny.Spec[]): Term {
  return term(new _OperationData(name, args.map((arg) => OfAny.resolve(arg))));
}
