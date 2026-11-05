/**
 * Translators: bidirectional, pairwise translation between dialects, by co-traversal.
 *
 * A `Translator` between two dialects, `left` and `right`, translates `forward` (left to right) and `backward`. Each
 * pair of dialects has its own, specialized to what the two have in common, and is declared as a list of rules:
 *
 * - `new Rule(left, right)` pairs two `Pattern`s, each a form with `Hole`s: `new Pattern('call', { callable: 'eq' },
 *   A, B)` matches the Patterns `eq(a, b)` and binds the holes `A` and `B` to its arguments. A hole in an attribute binds
 *   the attribute's native value, and may restrict its type: `new Hole('K', String)`; so does a hole within a helper's
 *   attributes (a `Terms.Part`), such as a Python3 comprehension's target, a pattern. A rule applies in both
 *   directions unless its `direction` is 'forward' or 'backward'.
 * - `new Inline(kind, side)` translates a binding of one side, which the other has no counterpart for, by substituting
 *   its value for its name in its body. The value is translated once, and written at every use.
 * - `new Elide(kind, side)` translates an import of one side, which the other has no counterpart for, as its body:
 *   what the import brought in must be translated by other rules, or it has no counterpart.
 * - `new Convert(leftKind, rightKind, forward, backward)` translates literals whose values the two sides write
 *   differently: a `leftKind` literal is the `rightKind` literal of the attributes `forward(attributes)` gives, and
 *   `backward` maps the other way. A function gives null for the attributes it has no counterpart for (a value domain
 *   the other side lacks, say). Conversions are tried after the rules of their kind.
 * - `new Elementwise(leftKind, rightKind, leftAttributes, rightAttributes)` translates a term of any number of
 *   arguments, a container constructor, into the other side's, its arguments translated in order: a `leftKind` term
 *   whose attributes are `leftAttributes` is the `rightKind` term of `rightAttributes` (Patterns' `list(a, b)` is Excel's
 *   `VSTACK(a, b)`), both ways unless its `direction` says otherwise.
 * - `new Prelude(pattern, side)` adds an import to what is translated to `side`: `pattern` is the import with its body
 *   as its one argument, a hole, and it wraps the translation if the translation refers to a name the import binds,
 *   e.g. `import numpy as np` around an expression that uses `np`.
 *
 * A pattern names a kind by its branch's tag in its dialect's `Term` (`call`, `binop`) and its attributes and arguments
 * as `Terms.form` reads them: a hole in an argument binds the term in that place, slots then variadic arguments, and a
 * fixed attribute must be set to an equal scalar, with every attribute of the term matched (an attribute that is not set
 * is absent), but a literal's spelling (its kind's `spelling`: `text` and `problems`, and a Python literal's prefix,
 * quotes, base and digit separators), which is its own dialect's: a literal translates by its value, and one with no
 * value has no counterpart. A helper's structure is among a form's attributes (`Terms.Part`), so a pattern matches a
 * Python comparison's operators or a comprehension's clauses as attributes, and its terms as arguments.
 *
 * Translating co-traverses: at each term, the first rule whose source pattern matches (the most specific first: the
 * one with the most terms and fixed attributes) is applied by traversing the pattern and the term in lockstep, binding
 * holes to arguments and attributes, a hole bound twice to equal terms (`Terms.same`) or values; then its target
 * pattern is instantiated with the bound attributes and the translations of the bound arguments. A translation is a
 * `Terms.Writer` of the target dialect's term, which its caller writes where it wants it, in a transaction:
 * `store.Expressions.Framework.Term(translator.forward(term))`. A term is a nested value, so a let's value inlined at
 * each use of its name is written at each. A term that no rule matches is read as its kind's `unfold` gives it, where it
 * gives one: an equivalent `Form` of simpler terms (a Python comparison chain as the `and` of its links, its middle
 * operands written in each), translated as a term is. Pairs of corresponding source terms (or unfolded forms) and target
 * writers are appended to `trace`, if given, each term after the terms within it. A term that no rule matches throws
 * `ValueError` naming it. A
 * translation preserves the expression's form, not always its value: dialects evaluate by their own rules (see each
 * dialect's `Evaluators`).
 */

import { Errors, Repr, Schemas } from "@mbse/schemas/Framework";

import * as Terms from "./Terms.js";

const { ValueError } = Errors;
const { repr } = Repr;
type Trace = [unknown, unknown][];

/** Translates expressions between two dialects, in both directions. */
export interface Translator {
  left(): Terms.Dialect;
  right(): Terms.Dialect;
  /** `expression` (a term, or what `Terms.term` reads one from), of the left dialect, in the right one: a writer. */
  forward(expression: unknown, trace?: Trace | null): Terms.Writer;
  /** `expression`, of the right dialect, in the left one: a writer. */
  backward(expression: unknown, trace?: Trace | null): Terms.Writer;
  /** The same translator with its sides swapped. */
  inverse(): Translator;
}

/** A named hole in a pattern. In an argument position it matches an expression; in an attribute it matches a native
 * value, of one of `types` (native tokens) if any are given. */
export class Hole {
  readonly types: readonly unknown[];

  constructor(readonly name: string, ...types: unknown[]) {
    this.types = types;
  }

  toString(): string {
    return this.name;
  }
}

/** One untyped hole per name. */
export function holes(...names: string[]): Hole[] {
  return names.map((name) => new Hole(name));
}

/** A form with holes: `kind`, `attributes` (natives or holes) and `args` (patterns or holes). */
export class Pattern {
  readonly args: readonly (Pattern | Hole)[];
  readonly attributes: ReadonlyMap<string, unknown>;

  constructor(readonly kind: string, attributes: Record<string, unknown> = {}, ...args: (Pattern | Hole)[]) {
    this.attributes = new Map(Object.entries(attributes));
    this.args = args;
  }

  /** How specific the pattern is: its terms and fixed attributes. */
  size(): number {
    const fixed = [...this.attributes.values()].filter((value) => !(value instanceof Hole)).length;
    return 1 + fixed + this.args.reduce((sum, a) => sum + (a instanceof Pattern ? a.size() : 0), 0);
  }

  /** The holes in the pattern, by name: 'argument' or 'attribute' (a helper's among them). */
  holes(): Map<string, string> {
    const found = new Map<string, string>();
    for (const value of this.attributes.values()) for (const hole of attributeHoles(value)) found.set(hole.name, "attribute");
    for (const argument of this.args) {
      if (argument instanceof Pattern) for (const [name, role] of argument.holes()) found.set(name, role);
      else found.set(argument.name, "argument");
    }
    return found;
  }

  toString(): string {
    const parts = [...this.args.map(String),
      ...[...this.attributes].map(([k, v]) => `${k}=${v instanceof Hole ? v.name : repr(v)}`)];
    return `${this.kind}(${parts.join(", ")})`;
  }
}

const DIRECTIONS = ["both", "forward", "backward"];

/** The holes in an attribute's pattern: itself, or those within a helper's (`Terms.Part`) or a container of them. */
function attributeHoles(value: unknown): Hole[] {
  if (value instanceof Hole) return [value];
  if (value instanceof Terms.Part) return [...value.attributes.values()].flatMap(attributeHoles);
  if (Array.isArray(value)) return value.flatMap(attributeHoles);
  return [];
}

/** An attribute's pattern with its holes filled, a helper's among them. */
function filled(value: unknown, bindings: Map<string, unknown>): unknown {
  if (value instanceof Hole) return bindings.get(value.name);
  if (value instanceof Terms.Part) {
    return new Terms.Part(value.kind, new Map([...value.attributes].map(([k, v]) => [k, filled(v, bindings)])), value.size);
  }
  if (Array.isArray(value)) return value.map((inner) => filled(inner, bindings));
  return value;
}

/** Two patterns that translate into each other; `direction` 'both', 'forward' (left to right only) or 'backward'. */
export class Rule {
  constructor(readonly left: Pattern, readonly right: Pattern, readonly direction: string = "both") {
    if (!DIRECTIONS.includes(direction)) {
      throw new ValueError(`direction must be 'both', 'forward' or 'backward', got ${repr(direction)}`);
    }
    for (const [name, source, target] of [["forward", left, right], ["backward", right, left]] as const) {
      if (direction !== "both" && direction !== name) continue;
      const given = source.holes();
      for (const [hole, role] of target.holes()) {
        if (given.get(hole) !== role) {
          throw new ValueError(`${target} needs the ${role} hole ${hole}, which ${source} does not bind`);
        }
      }
    }
  }
}

function checkSide(side: string): void {
  if (side !== "left" && side !== "right") throw new ValueError(`side must be 'left' or 'right', got ${repr(side)}`);
}

/** Translates the bindings of `kind`, on `side` ('left' or 'right'), by substituting their values. */
export class Inline {
  constructor(readonly kind: string, readonly side: string) {
    checkSide(side);
  }
}

/** Translates the imports of `kind`, on `side` ('left' or 'right'), as their bodies. */
export class Elide {
  constructor(readonly kind: string, readonly side: string) {
    checkSide(side);
  }
}

/** A literal's attributes, by name. */
export type Attributes = Record<string, unknown>;
type Conversion = (attributes: Attributes) => Attributes | null;

/** Translates `leftKind` literals into `rightKind` ones by `forward(attributes)`, and back by `backward`; each gives
 * the other side's attributes, or null where it has no counterpart. */
export class Convert {
  constructor(readonly leftKind: string, readonly rightKind: string, readonly forward: Conversion,
    readonly backward: Conversion) {}
}

/** Translates `leftKind` terms of `leftAttributes` into `rightKind` terms of `rightAttributes`, and back, each argument
 * translated in turn, whatever their number; `direction` 'both', 'forward' or 'backward'. */
export class Elementwise {
  readonly leftAttributes: Attributes;
  readonly rightAttributes: Attributes;

  constructor(readonly leftKind: string, readonly rightKind: string, leftAttributes: Attributes = {},
    rightAttributes: Attributes = {}, readonly direction: string = "both") {
    if (!DIRECTIONS.includes(direction)) {
      throw new ValueError(`direction must be 'both', 'forward' or 'backward', got ${repr(direction)}`);
    }
    this.leftAttributes = { ...leftAttributes };
    this.rightAttributes = { ...rightAttributes };
  }
}

/** Wraps translations to `side` ('left' or 'right') in the import `pattern` when they refer to a name it binds. */
export class Prelude {
  constructor(readonly pattern: Pattern, readonly side: string) {
    checkSide(side);
    if (pattern.args.length !== 1 || !(pattern.args[0] instanceof Hole)
      || [...pattern.attributes.values()].some((value) => value instanceof Hole)) {
      throw new ValueError(`a prelude is an import whose one argument is a hole, got ${pattern}`);
    }
  }
}

/** Rules for operators that differ only in name: each `left` name applied to `arity` arguments is the `right` name
 * applied to the same arguments, e.g. `renames('call', 'callable', 'compare', 'operator', { eq: '==' }, 2)`. */
export function renames(leftKind: string, leftAttribute: string, rightKind: string, rightAttribute: string,
  names: Record<string, string>, arity: number): Rule[] {
  const args = holes(...Array.from({ length: arity }, (_, i) => `A${i}`));
  return Object.entries(names).map(([a, b]) => new Rule(new Pattern(leftKind, { [leftAttribute]: a }, ...args),
    new Pattern(rightKind, { [rightAttribute]: b }, ...args)));
}

/** A term's form, or an unfolded form itself. */
function formOf(node: unknown): Terms.Form {
  return node instanceof Terms.Form ? node : Terms.form(node);
}

/** A term's tag, record and kind, or an unfolded form's, which has no record. */
function kindOf(dialect: Terms.Dialect, node: unknown): [string, any, Terms.Kind] {
  if (node instanceof Terms.Form) return [node.kind, null, dialect.kinds().get(node.kind) as Terms.Kind];
  return dialect.kind(node);
}

function describe(dialect: Terms.Dialect, node: unknown): string {
  const [tag, record, kind] = dialect.kind(node);
  const named = `${dialect.name()} ${tag}`;
  if ((kind.role === Terms.APPLICATION || kind.role === Terms.QUANTIFIER) && kind.operator !== null) {
    return `${named} ${repr(Terms.operatorOf(node, kind))}`;
  }
  if (kind.role === Terms.LITERAL) {
    const typed = kind.typed !== null ? kind.typed(record) : null;
    return `${named} ${repr(Terms.attributesOf(record).get("value"))}${typed === null ? "" : ` of ${typed.name()}`}`;
  }
  return named;
}

/** A translated term: the writer of its target term, and the names it needs from its scope. */
class Built {
  constructor(readonly writer: Terms.Writer, readonly free: ReadonlySet<string>) {}
}

type Environment = Map<string, Built>;

/** Translation in one direction: the co-traversal. */
class Direction {
  readonly rules = new Map<string, [Pattern, Pattern][]>();
  readonly inlines: ReadonlySet<string>;
  readonly elides: ReadonlySet<string>;
  readonly converts = new Map<string, [string, Conversion][]>();
  readonly elementwise = new Map<string, [Attributes, string, Attributes][]>();

  constructor(readonly source: Terms.Dialect, readonly target: Terms.Dialect,
    rules: readonly [Pattern, Pattern][], inlines: readonly string[], elides: readonly string[],
    readonly preludes: readonly Pattern[], converts: readonly [string, string, Conversion][],
    elementwise: readonly [string, Attributes, string, Attributes][]) {
    this.inlines = new Set(inlines);
    this.elides = new Set(elides);
    for (const [kind, attributes, targetKind, targetAttributes] of elementwise) {
      this.elementwise.set(kind, [...(this.elementwise.get(kind) ?? []), [attributes, targetKind, targetAttributes]]);
    }
    for (const [kind, targetKind, convert] of converts) {
      for (const [dialect, name] of [[source, kind], [target, targetKind]] as const) {
        const literal = dialect.kinds().get(name);
        if (literal === undefined || literal.role !== Terms.LITERAL) {
          throw new ValueError(`a conversion translates literals, and ${dialect.name()} ${repr(name)} is not one`);
        }
      }
      this.converts.set(kind, [...(this.converts.get(kind) ?? []), [targetKind, convert]]);
    }
    for (const pair of [...rules].sort((a, b) => b[0].size() - a[0].size())) {
      const list = this.rules.get(pair[0].kind) ?? [];
      list.push(pair);
      this.rules.set(pair[0].kind, list);
    }
  }

  run(expression: unknown, trace: Trace | null): Terms.Writer {
    let result = new Run(this, trace).translate(Terms.term(expression), new Map());
    for (const pattern of [...this.preludes].reverse()) {
      const kind = this.target.kinds().get(pattern.kind) as Terms.Kind;
      const names = kind.names !== null ? kind.names(pattern.attributes) : [];
      if (names.some((name) => result.free.has(name))) result = this.build(new Terms.Form(pattern.kind, pattern.attributes, [result]));
    }
    return result.writer;
  }

  /** The target term of a form whose arguments are translated terms, and the names it needs, as `Symbolics.free`
   * reads them. */
  build(form: Terms.Form): Built {
    const kind = this.target.kinds().get(form.kind) as Terms.Kind;
    const name = Terms.referenceName(form.attributes.get("name")) as string;
    const frees = (form.arguments as Built[]).map((argument) => argument.free);
    let free: Set<string>;
    if (kind.role === Terms.REFERENCE) { // its name, and a name node's terms' names (a template's arguments)
      free = new Set([...(kind.lexical && !kind.ambient.has(name) ? [name] : []), ...frees.flatMap((f) => [...f])]);
    } else if (kind.scopes !== null) { // what its arguments bind is read from a record, which a writer is not yet:
      free = new Set(frees.flatMap((f) => [...f])); // its arguments' names, the names it binds among them
    } else if (kind.role === Terms.BINDING || kind.role === Terms.QUANTIFIER) {
      free = new Set([...(frees[0] as ReadonlySet<string>), ...frees.slice(1).flatMap((f) => [...f].filter((n) => n !== name))]);
    } else {
      const names = kind.role === Terms.IMPORT && kind.names !== null ? kind.names(form.attributes) : [];
      free = new Set(frees.flatMap((f) => [...f]).filter((n) => !names.includes(n)));
    }
    const writer = this.target.make(new Terms.Form(form.kind, form.attributes,
      (form.arguments as Built[]).map((argument) => argument.writer)));
    return new Built(writer, free);
  }
}

/** One translation: its trace. */
class Run {
  constructor(private readonly direction: Direction, private readonly trace: Trace | null) {}

  translate(node: unknown, environment: Environment): Built {
    const result = this.translateTerm(node, environment);
    this.trace?.push([node, result.writer]);
    return result;
  }

  private translateTerm(node: unknown, environment: Environment): Built {
    const [tag, record, kind] = kindOf(this.direction.source, node);
    if (record === null) { // an unfolded form: a rule reads it, or its kind unfolds it further
      return this.rules(node, tag, environment) ?? this.unfolded(node, kind, environment);
    }
    const name = Terms.nameOf(node) as string;
    if (kind.role === Terms.REFERENCE && kind.lexical && environment.has(name)) return environment.get(name) as Built;
    if (this.direction.elides.has(tag)) {
      const args = Terms.argumentsOf(record);
      const body = args[args.length - 1];
      if (body === null) throw new ValueError(`${Terms.article(tag)} needs a body`);
      return this.translate(body, environment);
    }
    if (this.direction.inlines.has(tag)) {
      const [value, body] = Terms.argumentsOf(record);
      if (value === null || body === null) {
        throw new ValueError(`${Terms.article(tag)} needs a ${value === null ? "value" : "body"}`);
      }
      const inner = new Map([...environment, [name, this.translate(value, environment)]]);
      return this.translate(body, inner);
    }
    const ruled = this.rules(node, tag, environment);
    if (ruled !== null) return ruled;
    for (const [attributes, targetKind, targetAttributes] of this.direction.elementwise.get(tag) ?? []) {
      const form = Terms.form(node);
      const keys = Object.keys(attributes);
      if (!form.arguments.includes(null) && form.attributes.size === keys.length // a mapping's empty key: none
        && keys.every((k) => form.attributes.has(k) && Terms.sameNative(attributes[k], form.attributes.get(k)))) {
        const args = form.arguments.map((argument) => this.translate(argument, environment));
        return this.direction.build(new Terms.Form(targetKind, targetAttributes, args));
      }
    }
    for (const [targetKind, convert] of this.direction.converts.get(tag) ?? []) {
      const attributes = convert(Object.fromEntries(Terms.attributesOf(record)));
      if (attributes === null) continue;
      return this.direction.build(new Terms.Form(targetKind, attributes, []));
    }
    return this.unfolded(node, kind, environment);
  }

  /** The translation of the first rule whose source pattern matches `node`, or null. */
  private rules(node: unknown, tag: string, environment: Environment): Built | null {
    for (const [source, target] of this.direction.rules.get(tag) ?? []) {
      const bindings = new Map<string, unknown>();
      if (this.match(source, node, bindings)) return this.instantiate(target, bindings, environment);
    }
    return null;
  }

  /** The translation of the form `node`'s kind unfolds it into; throws naming the term where it has none. */
  private unfolded(node: unknown, kind: Terms.Kind, environment: Environment): Built {
    const unfolded = kind.unfold !== null ? kind.unfold(formOf(node)) : null;
    if (unfolded !== null) return this.translate(unfolded, environment);
    const described = node instanceof Terms.Form ? `${this.direction.source.name()} ${node.kind}`
      : describe(this.direction.source, node);
    throw new ValueError(`${described} has no ${this.direction.target.name()} counterpart`);
  }

  /** Co-traverses `pattern` and `node`, binding the pattern's holes. */
  private match(pattern: Pattern | Hole, node: unknown, bindings: Map<string, unknown>): boolean {
    if (pattern instanceof Hole) {
      if (node === null) return false;
      if (bindings.has(pattern.name)) return Terms.same(bindings.get(pattern.name), node);
      bindings.set(pattern.name, node);
      return true;
    }
    if (node === null) return false;
    const form = formOf(node);
    let attributes = form.attributes;
    const kind = kindOf(this.direction.source, node)[2];
    if (kind.role === Terms.LITERAL) { // a literal's spelling is its dialect's own
      attributes = new Map([...attributes].filter(([k]) => !kind.spelling.includes(k)));
    }
    if (form.kind !== pattern.kind || attributes.size !== pattern.attributes.size
      || ![...pattern.attributes.keys()].every((k) => attributes.has(k))) return false;
    if (![...pattern.attributes].every(([name, expected]) => this.attribute(expected, attributes.get(name), bindings))) {
      return false;
    }
    return form.arguments.length === pattern.args.length
      && pattern.args.every((p, i) => this.match(p, form.arguments[i], bindings));
  }

  /** Matches an attribute's pattern: a hole binds its native value; a helper's pattern (`Terms.Part`, or a container
   * of them) matches a helper of its kind and size, its attributes in turn; anything else is equal. */
  private attribute(expected: unknown, value: unknown, bindings: Map<string, unknown>): boolean {
    if (expected instanceof Hole) {
      if (expected.types.length > 0 && !expected.types.some((type) => Schemas.isScalarOf(type, value))) return false;
      if (bindings.has(expected.name)) return Terms.sameNative(bindings.get(expected.name), value);
      bindings.set(expected.name, value);
      return true;
    }
    if (expected instanceof Terms.Part && attributeHoles(expected).length > 0) {
      return value instanceof Terms.Part && value.kind === expected.kind && value.size === expected.size
        && value.attributes.size === expected.attributes.size
        && [...expected.attributes].every(([k, v]) => value.attributes.has(k) && this.attribute(v, value.attributes.get(k), bindings));
    }
    if (Array.isArray(expected) && attributeHoles(expected).length > 0) {
      return Array.isArray(value) && value.length === expected.length
        && expected.every((inner, i) => this.attribute(inner, value[i], bindings));
    }
    return Terms.sameNative(expected, value);
  }

  private instantiate(pattern: Pattern | Hole, bindings: Map<string, unknown>, environment: Environment): Built {
    if (pattern instanceof Hole) return this.translate(bindings.get(pattern.name), environment);
    const attributes = new Map([...pattern.attributes].map(([name, value]) => [name, filled(value, bindings)] as [string, unknown]));
    const args = pattern.args.map((argument) => this.instantiate(argument, bindings, environment));
    return this.direction.build(new Terms.Form(pattern.kind, attributes, args));
  }
}

type Declaration = Rule | Inline | Elide | Convert | Elementwise | Prelude;

/** A `Translator` between `left` and `right`, declared by `rules` (`Rule`s, `Inline`s, `Elide`s, `Convert`s,
 * `Elementwise`s and `Prelude`s). */
export class Pairwise implements Translator {
  private readonly forwards: Direction;
  private readonly backwards: Direction;

  constructor(private readonly leftDialect: Terms.Dialect, private readonly rightDialect: Terms.Dialect,
    private readonly rules: readonly Declaration[]) {
    const pairs = rules.filter((rule): rule is Rule => rule instanceof Rule);
    const converts = rules.filter((rule): rule is Convert => rule instanceof Convert);
    const each = rules.filter((rule): rule is Elementwise => rule instanceof Elementwise);
    const of = <T extends Inline | Elide | Prelude>(type: new (...a: any[]) => T, side: string): T[] =>
      rules.filter((rule): rule is T => rule instanceof type && rule.side === side);
    this.forwards = new Direction(leftDialect, rightDialect,
      pairs.filter((r) => r.direction !== "backward").map((r) => [r.left, r.right]),
      of(Inline, "left").map((i) => i.kind), of(Elide, "left").map((e) => e.kind),
      of(Prelude, "right").map((p) => p.pattern), converts.map((c) => [c.leftKind, c.rightKind, c.forward]),
      each.filter((e) => e.direction !== "backward").map((e) => [e.leftKind, e.leftAttributes, e.rightKind, e.rightAttributes]));
    this.backwards = new Direction(rightDialect, leftDialect,
      pairs.filter((r) => r.direction !== "forward").map((r) => [r.right, r.left]),
      of(Inline, "right").map((i) => i.kind), of(Elide, "right").map((e) => e.kind),
      of(Prelude, "left").map((p) => p.pattern), converts.map((c) => [c.rightKind, c.leftKind, c.backward]),
      each.filter((e) => e.direction !== "forward").map((e) => [e.rightKind, e.rightAttributes, e.leftKind, e.leftAttributes]));
  }

  left(): Terms.Dialect {
    return this.leftDialect;
  }

  right(): Terms.Dialect {
    return this.rightDialect;
  }

  forward(expression: unknown, trace: Trace | null = null): Terms.Writer {
    return this.forwards.run(expression, trace);
  }

  backward(expression: unknown, trace: Trace | null = null): Terms.Writer {
    return this.backwards.run(expression, trace);
  }

  inverse(): Pairwise {
    const swapped: Record<string, string> = { both: "both", forward: "backward", backward: "forward" };
    const other = (side: string) => (side === "left" ? "right" : "left");
    return new Pairwise(this.rightDialect, this.leftDialect, this.rules.map((r) => {
      if (r instanceof Rule) return new Rule(r.right, r.left, swapped[r.direction]);
      if (r instanceof Prelude) return new Prelude(r.pattern, other(r.side));
      if (r instanceof Convert) return new Convert(r.rightKind, r.leftKind, r.backward, r.forward);
      if (r instanceof Elementwise) {
        return new Elementwise(r.rightKind, r.leftKind, r.rightAttributes, r.leftAttributes, swapped[r.direction]);
      }
      return new (r.constructor as typeof Inline)(r.kind, other(r.side));
    }));
  }

  toString(): string {
    return `<translator ${this.leftDialect.name()} <-> ${this.rightDialect.name()}>`;
  }
}
