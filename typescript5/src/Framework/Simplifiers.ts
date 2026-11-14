/**
 * Simplifiers: the one procedure every dialect implements, simplifying an expression in a scope that binds some, all
 * or none of its names, to a residual expression of the same dialect.
 *
 * As expressions are value objects, and value objects are immutable, simplification is recursive substitution: it
 * never changes a term, it writes a new one (mbse-basis [PRI-046: simplification, not
 * evaluation](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-046)). A reference the scope binds is replaced by the literal of
 * its value, and a subterm the scope closes is folded, by its dialect's rules, into the literal of its value; a
 * subterm the dialect has no rule for, or whose value has no literal (a closure, an object, a collection), stays, its
 * subterms simplified in turn. If the residual's root is a literal, simplification evaluated the expression:
 * `Simplified.evaluate()` gives its value, or throws `NotEvaluated` naming why it is not a literal. Nothing is refused:
 * where a dialect has no rule for a kind or an operator, the subterm stays in the residual, and a `Residue` names it,
 * its dialect, its kind and the class the evaluation inventory gives it (`a` statement-free with a value its language
 * defines, `b` no value of its own, `c` waiting on an open capability, `d` needing what only mbse-programs or a
 * simulator has; see mbse-expressions' [the evaluation
 * inventory](mbse:mbse-expressions/docs/proposals/dialects/README.md#evaluation-what-is-refused-and-why)). Errors the
 * dialect's own semantics define (an operand of the wrong type, a division by zero) still throw, as the expression
 * would in its language.
 *
 * A `Simplifier(rules, { literal, simplify, categories, native, folds })` simplifies the terms of one dialect; each
 * dialect's `Simplifiers.OfAny` is one. Its `rules` are the dialect's folding rules: what the dialect computes over
 * values, `rules.evaluate(node, scope)` giving a subterm's value or throwing `NoRule` where it has none, over a scope
 * `rules.scope(variables)` makes. `Interpreter` is the rules most dialects build theirs on (its tables, by kind and
 * operator, are the folding rules); a dialect whose rules need the whole term (SystemVerilog's sizing by context)
 * gives its own, and says by `folds(node, root)` which subterms may fold. `literal(value)` writes the literal of a
 * value, or gives null where the dialect has none; `simplify(node, results)` decides what does not depend on an
 * unsimplified subterm, as Kleene's logic does in Patterns (`false and x` is `false`); `native(value)` gives the value
 * a caller sees of a value of the rules (C's, its native without its type); `display(value)` writes a container of
 * values that have literals as a term of their literals, a display (Python's `[1, 2]`), not a literal.
 *
 * `Interpreter` folds a term by its kind's role (see `Terms`): a literal gives its value (through `literal`, or
 * `typed` when its kind's attributes give it a domain of its own, as C's type does a constant), a reference what the
 * scope resolves, a binding its body in the scope with its name bound, and an import its body in the scope it
 * declares. An application calls its operator's implementation from `operations`, with one thunk per argument, so
 * that implementations decide which arguments to fold and when, and so does a quantifier, whose second thunk takes an
 * item and folds the body with the name bound to it; the implementation of a kind whose vocabulary is open is one
 * function for every name, and operators outside a closed vocabulary go to `extension`, if given. It throws `NoRule`
 * for invalid syntax (`error`, `missing`), for a kind outside `folded`, where it is given the kinds it folds, for a
 * kind of a dialect it reads, and for an operator without an implementation, each by the name of the dialect that
 * owns it (`Terms.Dialect.owner`: "Python Types typevar is not simplified", "Python3 binop '@' is not simplified"); it
 * throws on what `Dialect.validate` reports: wrong numbers of arguments and missing values.
 */

import { Errors, Repr, Schemas } from "@mbse/schemas/Framework";

import { type Bindings, free as freeNames, isScope, type Scope, scopes, Unbound, UNKNOWN, Variables } from "./Symbolics.js";
import * as Terms from "./Terms.js";

const { NotImplementedError, ValueError } = Errors;
const { repr } = Repr;

export type Thunk = () => any;
/** Computes an operation's value from thunks for its arguments, the term (for its attributes) and the scope. */
export type Implementation = (args: Thunk[], node: any, scope: any) => any;

/** Thrown by a dialect's rules where it has no rule for a term: `what` names its kind, and the operator or the shape
 * it has no rule for ("lambda", "binop '@'", "call keyword"), after the name of the dialect that owns it. */
export class NoRule extends NotImplementedError {
  override name = "NoRule";

  constructor(readonly dialect: string, readonly what: string, public kind: string | null = null) {
    super(`${dialect} ${what} is not simplified`);
  }
}

/** Thrown by `Simplified.evaluate()` where the residual's root is not a literal, naming why. */
export class NotEvaluated extends ValueError {
  override name = "NotEvaluated";
}

/** Why a subterm stayed in the residual for want of a rule: the `dialect` that owns it, its `kind`, `what` it has no
 * rule for (its kind, and the operator or the shape), and its `category`, the evaluation inventory's class of it
 * (`a`, `b`, `c` or `d`). */
export class Residue {
  constructor(readonly dialect: string, readonly kind: string, readonly what: string, readonly category: string) {}

  /** "Python3 lambda is not simplified". */
  get reason(): string {
    return `${this.dialect} ${this.what} is not simplified`;
  }
}

/** What simplification gives: the `residual`, a `Writer` of a term of the dialect, which its caller writes where it
 * wants it (in a transaction); whether its root is a `literal`, simplification having evaluated the expression, and
 * then its `value` (null otherwise: three-valued, a residual reads as unknown); the names it still needs (`free`);
 * and the `residues`, each subterm that stayed for want of a rule, in the order they were found. */
export class Simplified {
  constructor(readonly residual: Terms.Writer, readonly literal: boolean, readonly value: unknown,
    readonly free: ReadonlySet<string>, readonly residues: readonly Residue[]) {}

  /** The value of the literal at the residual's root; throws `NotEvaluated` naming why the root is not a literal: a
   * subterm the dialect has no rule for, a name the scope does not bind, or a value with no literal. */
  evaluate(): unknown {
    if (this.literal) return this.value;
    let why = "its value has no literal";
    if (this.residues.length > 0) why = (this.residues[0] as Residue).reason;
    else if (this.free.size > 0) why = `${[...this.free].sort()[0]} is not bound`;
    throw new NotEvaluated(`the root is not a literal: ${why}`);
  }
}

/** A dialect's folding rules: its `dialect`, the value of a term in a scope (`evaluate`, throwing `NoRule` where it
 * has no rule and `Symbolics.Unbound` where the scope does not resolve a reference), and the scope an object of
 * variables makes (`scope`). */
export interface Rules {
  readonly dialect: Terms.Dialect;
  evaluate(node: any, scope: any): any;
  scope(variables: Bindings): Scope;
}

/** A simplified subterm: its `expression` (a term value, or a `Writer`), whether it is `known`, a value its dialect
 * computed, and then its `value`; whether it is a `literal`; the names it refers to that nothing within it binds
 * (`free`); and whether it differs from the subterm it simplified (`changed`). */
export class Result {
  constructor(readonly expression: unknown, readonly known: boolean = false, readonly value: unknown = null,
    readonly literal: boolean = false, readonly free: ReadonlySet<string> = new Set(),
    readonly changed: boolean = true) {}
}

/** The options of a `Simplifier` (see the module's description). */
export interface SimplifierOptions {
  literal: (value: any) => unknown;
  simplify?: (node: any, results: Result[]) => Result | null;
  categories?: Record<string, Record<string, string>>;
  native?: (value: any) => unknown;
  folds?: (node: any, root: boolean) => boolean;
  display?: (value: any) => unknown;
}

/** The literal of a native value (a basic scalar), as `dialect` writes one (`Terms.Dialect.spec`); null for any other
 * value, or a native it has no literal of: a simplifier's `literal`, where a dialect's values are natives. */
export function natives(dialect: Terms.Dialect): (value: unknown) => unknown {
  return (value) => (Schemas.hostOf(value) !== null ? (dialect._literal as (value: unknown) => unknown)(value) : null);
}

/** Simplifies the terms of a dialect by its `rules` (see the module's description). */
export class Simplifier {
  readonly dialect: Terms.Dialect;
  private readonly literal: (value: any) => unknown;
  private readonly simplify: ((node: any, results: Result[]) => Result | null) | null;
  private readonly categories: Record<string, Record<string, string>>;
  private readonly native: (value: any) => unknown;
  private readonly folds: ((node: any, root: boolean) => boolean) | null;
  private readonly display: ((value: any) => unknown) | null;

  constructor(readonly rules: Rules, options: SimplifierOptions) {
    this.dialect = rules.dialect;
    this.literal = options.literal;
    this.simplify = options.simplify ?? null;
    this.categories = options.categories ?? {};
    this.native = options.native ?? ((value) => value);
    this.folds = options.folds ?? null;
    this.display = options.display ?? null;
  }

  /** The simplification of a term (see `Terms.term`) in `scope`, or with the variables in an object bound: Python's
   * `__call__`. */
  run(expression: unknown, scope: Scope | Bindings | null = null): Simplified {
    const resolved = isScope(scope) ? scope : this.rules.scope({ ...(scope ?? {}) });
    const residues = new Map<string, Residue>();
    const result = this.reduce(Terms.term(expression), resolved, residues, true);
    return new Simplified(this.dialect.spec(result.expression), result.literal,
      result.literal ? this.native(result.value) : null, result.free, [...residues.values()]);
  }

  /** The evaluation inventory's class of what a dialect has no rule for: by `what`, then by its kind, then `b` for
   * invalid syntax, which has no value of its own, then the dialect's default (`*`), else `a`. */
  category(dialect: string, what: string, kind: string): string {
    const table = this.categories[dialect] ?? {};
    const invalid = Terms.INVALID_KINDS.has(kind) || Terms.INVALID_KINDS.has(what);
    return table[what] ?? table[kind] ?? (invalid ? "b" : table["*"] ?? "a");
  }

  /** The result of a subterm whose value is known: its literal, when the dialect has one. */
  known(expression: unknown, value: unknown): Result {
    const written = this.literal(value);
    if (written === null) return new Result(expression, true, value, false, freeNames(expression, this.dialect));
    return new Result(written, true, value, true);
  }

  /** A subterm simplified in `scope`, noting in `residues` each subterm its dialect has no rule for. */
  reduce(node: any, scope: any, residues: Map<string, Residue>, root = false): Result {
    const [, record, kind] = this.dialect.kind(node);
    let known = false; // a value its rules computed, with no literal
    let value: unknown = null;
    if (this.folds === null || this.folds(node, root)) {
      try {
        value = this.rules.evaluate(node, scope);
        known = true;
      } catch (error) {
        if (error instanceof NoRule) this.note(error, residues);
        else if (!(error instanceof Unbound)) throw error;
      }
      if (known) {
        if (kind.role === Terms.LITERAL) return new Result(node, true, value, true, new Set(), false); // kept as written
        const written = this.literal(value);
        if (written !== null) return new Result(written, true, value, true);
        const shown = this.display !== null ? this.display(value) : null;
        if (shown !== null) return new Result(shown, true, value); // a container of values that have literals: its display
      }
    }
    if ((kind.role === Terms.LITERAL || kind.role === Terms.REFERENCE || kind.role === Terms.INVALID)
      && Terms.argumentsOf(record).length === 0) {
      return new Result(node, known, value, false, freeNames(node, this.dialect), false);
    }
    // a subterm of a term its rules computed (a cast's type) needs no rule of its own: what it lacks is not noted
    return this.rebuild(node, record, kind, scope, known ? new Map() : residues, known, value);
  }

  /** A term rebuilt from its simplified arguments, each in the scope its names are bound in: a let's of a known value
   * bound to it, any other name hidden (`Symbolics.UNKNOWN`), an import's among them (its root having not folded, its
   * module is not entered again). A let whose body no longer refers to its name is its body. */
  private rebuild(node: any, record: any, kind: Terms.Kind, scope: any, residues: Map<string, Residue>,
    known: boolean, value: unknown): Result {
    const args = Terms.argumentsOf(record);
    const bound = scopes(node, this.dialect);
    const lets = Terms._lets(kind, record);
    const results: (Result | null)[] = [];
    args.forEach((argument, i) => {
      if (argument === null) {
        results.push(null);
        return;
      }
      const names = bound[i] as ReadonlySet<string>;
      const first = results[0] ?? null;
      let within = scope;
      if (lets && i > 0 && first !== null && first.known) within = scope.bind(Terms.nameOf(node) as string, first.value);
      else if (names.size > 0) within = Simplifier.hide(scope, names);
      results.push(this.reduce(argument, within, residues));
    });
    const name = Terms.nameOf(node) as string;
    const body = results[1] ?? null;
    if (lets && body !== null && !body.free.has(name)) return body;
    const free = new Set<string>();
    results.forEach((result, i) => {
      if (result !== null) for (const n of result.free) if (!(bound[i] as ReadonlySet<string>).has(n)) free.add(n);
    });
    const simplified = this.simplify !== null ? this.simplify(node, results.filter((r): r is Result => r !== null)) : null;
    if (simplified !== null) return simplified;
    if (!results.some((result) => result !== null && result.changed)) return new Result(node, known, value, false, free, false);
    const form = Terms.form(node);
    const reader = this.dialect.reader(node) ?? this.dialect;
    const written = reader.make(new Terms.Form(form.kind, form.attributes,
      results.map((result) => (result === null ? null : result.expression))));
    return new Result(written, known, value, false, free);
  }

  private static hide(scope: any, names: ReadonlySet<string>): any {
    let hidden = scope;
    for (const name of [...names].sort()) hidden = hidden.bind(name, UNKNOWN);
    return hidden;
  }

  private note(refusal: NoRule, residues: Map<string, Residue>): void {
    const kind = refusal.kind as string; // set by the rules, for the term they have no rule for
    const residue = new Residue(refusal.dialect, kind, refusal.what, this.category(refusal.dialect, refusal.what, kind));
    const key = JSON.stringify([residue.dialect, residue.kind, residue.what, residue.category]);
    if (!residues.has(key)) residues.set(key, residue);
  }
}

/** Folds the terms of `dialect`. `operations` maps each application kind's tag to its implementations by operator
 * name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's value into the
 * dialect's domain of values, and `typed(domain, value)` gives the value of a literal whose kind gives it a domain of
 * its own (`Kind.typed`; without it, folding one throws `NoRule`); `scope` makes the dialect's scope from an object of
 * variables, and `extension(operator, args, node, scope)` folds operators outside a kind's vocabulary. `folded`,
 * where given, names the kinds it folds: any other throws `NoRule`, as does a kind of a dialect it reads, and invalid
 * syntax, each by the name of the dialect that owns it (`Terms.Dialect.owner`). */
export class Interpreter implements Rules {
  private readonly literal: (value: unknown) => unknown;
  private readonly typed: ((domain: any, value: unknown) => unknown) | null;
  readonly scope: (variables: Bindings) => Scope;
  private readonly extension: ((operator: string, args: Thunk[], node: any, scope: any) => any) | null;
  private readonly folded: ReadonlySet<string> | null;

  constructor(readonly dialect: Terms.Dialect,
    readonly operations: ReadonlyMap<string, ReadonlyMap<string, Implementation> | Implementation>,
    options: {
      literal?: (value: unknown) => unknown;
      typed?: (domain: any, value: unknown) => unknown;
      scope?: (variables: Bindings) => Scope;
      extension?: (operator: string, args: Thunk[], node: any, scope: any) => any;
      folded?: ReadonlySet<string>;
    } = {}) {
    this.literal = options.literal ?? ((value) => value);
    this.typed = options.typed ?? null;
    this.scope = options.scope ?? ((variables) => new Variables(variables));
    this.extension = options.extension ?? null;
    this.folded = options.folded ?? null;
  }

  /** The value of a term in `scope`; a refusal of this term's own rules is thrown as `NoRule` naming it. */
  evaluate(node: any, scope: Scope): any {
    try {
      return this.fold(node, scope);
    } catch (error) {
      if (error instanceof NoRule && error.kind === null) error.kind = Terms.kindOf(node)[0]; // thrown for this term
      throw error;
    }
  }

  private fold(node: any, scope: Scope): any {
    const [tag, record, kind] = this.dialect.kind(node);
    const owner = this.dialect.owner(node); // whose name a refusal gives
    if (kind.role === Terms.INVALID || owner !== this.dialect || (this.folded !== null && !this.folded.has(tag))) {
      throw new NoRule(owner.name(), tag);
    }
    if (kind.role === Terms.LITERAL) {
      const value = Terms.attributesOf(record).get("value") ?? null;
      if (value === null) throw new ValueError(`${Terms.article(tag)} needs a value`);
      const typed = kind.typed !== null ? kind.typed(record) : null;
      if (typed === null) return this.literal(value);
      if (this.typed === null) throw new NoRule(owner.name(), `literal of ${typed.name()}`);
      return this.typed(typed, value);
    }
    if (kind.role === Terms.REFERENCE) return scope.lookup(node);
    const args = Terms.argumentsOf(record);
    if (kind.role === Terms.BINDING || kind.role === Terms.IMPORT || kind.role === Terms.QUANTIFIER) {
      const [subterms] = Terms._parts(record.as_schema());
      subterms.forEach((subterm, i) => {
        // an import's `value`, which it leaves unset
        if (i < args.length && args[i] === null && !kind.optional.includes(subterm)) throw new ValueError(`${Terms.article(tag)} needs ${Terms.article(subterm)}`);
      });
      if (kind.role === Terms.QUANTIFIER) return this.apply(node, tag, kind, args, scope);
      if (kind.role === Terms.IMPORT) return this.evaluate(args[args.length - 1], scope.enter(node)); // its body, its last argument
      const bound = this.evaluate(args[0], scope);
      return this.evaluate(args[1], scope.bind(Terms.nameOf(node) as string, bound));
    }
    return this.apply(node, tag, kind, args, scope);
  }

  private apply(node: any, tag: string, kind: Terms.Kind, args: any[], scope: Scope): any {
    const operator = Terms.operatorOf(node, kind);
    const implementations = this.operations.get(tag);
    const thunks: any[] = args.map((argument) => () => this.evaluate(argument, scope));
    if (kind.role === Terms.QUANTIFIER) { // the arguments after the collection, of an item: folded with the name bound to it
      const name = Terms.nameOf(node) as string;
      for (let i = 1; i < args.length; i++) thunks[i] = (item: unknown) => this.evaluate(args[i], scope.bind(name, item));
    }
    if (kind.vocabulary === null || kind.operators !== null) { // one implementation for every operator
      return (implementations as Implementation)(thunks, node, scope);
    }
    const implementation = (implementations as ReadonlyMap<string, Implementation>).get(operator);
    if (implementation === undefined) {
      if (this.extension !== null) return this.extension(operator, thunks, node, scope);
      throw new NoRule(this.dialect.owner(node).name(), `${tag} ${repr(operator)}`);
    }
    const arity = (kind.vocabulary.get(operator) as { arity(): number }).arity();
    if (arity >= 0 && args.length !== arity) throw new TypeError(`${operator} takes ${arity} arguments, got ${args.length}`);
    return implementation(thunks, node, scope);
  }
}
