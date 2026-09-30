/**
 * Evaluators: the protocols for computing an expression's value, and an interpreter that dialects build theirs on.
 *
 * An `Evaluator` computes the value of any expression of its dialect in a scope; each dialect's `Evaluators.OfAny` is
 * one. A `Predicate` is what mbse-schemas' validators take to test union branches: `(predicate, value) => boolean |
 * null`. The value domains, the treatment of unknown values and the rules of each operator are the dialect's own:
 * evaluation is where dialects differ most.
 *
 * A `Scope` is where an expression's references are resolved, in the dialect's own way: `lookup(reference)` gives a
 * reference's value, `bind(name, value)` the scope within a binding, and `enter(declaration)` the scope within an
 * import. `Variables` is the scope of dialects whose references are names bound to values; dialects with imports,
 * packages or workbooks derive their own. An evaluator given an object of variables instead of a scope makes its
 * dialect's scope from it, so `Evaluators.OfAny(expression, { this: value })` binds `this`. A scope decides what an
 * import may bring in: imports resolve only what the caller's scope allows, never by loading code.
 *
 * `Interpreter` evaluates by role (see `Expressions`): a literal gives its value (through `literal`), a reference what
 * the scope resolves, a binding its body in the scope with its name bound, and an import its body in the scope it
 * declares. An application calls its operator's implementation from `operations`, with one thunk per argument, so
 * that implementations decide which arguments to evaluate and when; the implementation of a kind whose vocabulary is
 * open is one function for every name, and operators outside a closed vocabulary go to `extension`, if given. It
 * throws on what `Dialect.validate` reports: operations outside the vocabulary, wrong numbers of arguments, unbound
 * references, missing values and cycles.
 */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as Expressions from "./Expressions.js";

const { KeyError, NotImplementedError, ValueError } = Errors;
const { repr } = Repr;

export type Thunk = () => any;
/** Computes an operation's value from thunks for its arguments, the node (for its attributes) and the scope. */
export type Implementation = (args: Thunk[], node: any, scope: any) => any;

/** Where references are resolved. */
export interface Scope {
  /** The value of a reference. */
  lookup(reference: any): any;
  /** This scope, with `name` bound to `value`. */
  bind(name: string, value: unknown): Scope;
  /** This scope, with what an import declares. */
  enter(declaration: any): Scope;
}

/** The variables an expression is evaluated with, when no scope is given. */
export type Bindings = Record<string, unknown>;

/** Computes the value of an expression in `scope`, or with the variables in an object bound. */
export type Evaluator = (expression: any, scope?: Scope | Bindings) => any;

/** Whether `value` satisfies a union branch's `predicate`: true, false, or null when unknown. */
export type Predicate = (predicate: any, value: unknown) => boolean | null;

/** Whether `value` is a scope rather than an object of variables. */
export function isScope(value: unknown): value is Scope {
  const candidate = value as Partial<Scope> | null;
  return typeof candidate?.lookup === "function" && typeof candidate.bind === "function"
    && typeof candidate.enter === "function";
}

/** A scope of named values: a reference's value is its name's innermost binding, then the variable of that name.
 * `unbound(reference)` gives the value of a reference to neither, by default throwing `KeyError`. It has no
 * imports. */
export class Variables implements Scope {
  protected values: Map<string, unknown>[];

  constructor(variables: Bindings = {}) {
    this.values = [new Map(Object.entries(variables))];
  }

  /** Whether `name` is bound, and its value. */
  protected find(name: string): [boolean, unknown] {
    for (const layer of this.values) if (layer.has(name)) return [true, layer.get(name)];
    return [false, undefined];
  }

  /** The variables the scope was made with. */
  protected variables(): Map<string, unknown> {
    return this.values[this.values.length - 1] as Map<string, unknown>;
  }

  lookup(reference: any): any {
    const [found, value] = this.find(Expressions.nameOf(reference) as string);
    return found ? value : this.unbound(reference);
  }

  unbound(reference: any): any {
    throw new KeyError(`${reference.kind().KIND} ${repr(Expressions.nameOf(reference))} is not bound`);
  }

  bind(name: string, value: unknown): this {
    const inner = this.copy();
    inner.values = [new Map([[name, value]]), ...this.values];
    return inner;
  }

  enter(declaration: any): Scope {
    throw new NotImplementedError(`${this.constructor.name} has no ${declaration.kind().KIND}s`);
  }

  protected copy(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }
}

/** Evaluates the expressions of `dialect`. `operations` maps each application kind's tag to its implementations by
 * operator name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's value
 * into the dialect's domain of values, `scope` makes the dialect's scope from an object of variables, and
 * `extension(operator, args, node, scope)` evaluates operators outside a kind's vocabulary. */
export class Interpreter {
  private readonly literal: (value: unknown) => unknown;
  private readonly scope: (variables: Bindings) => Scope;
  private readonly extension: ((operator: string, args: Thunk[], node: any, scope: any) => any) | null;

  constructor(readonly dialect: Expressions.Declared,
    readonly operations: ReadonlyMap<string, ReadonlyMap<string, Implementation> | Implementation>,
    options: {
      literal?: (value: unknown) => unknown;
      scope?: (variables: Bindings) => Scope;
      extension?: (operator: string, args: Thunk[], node: any, scope: any) => any;
    } = {}) {
    this.literal = options.literal ?? ((value) => value);
    this.scope = options.scope ?? ((variables) => new Variables(variables));
    this.extension = options.extension ?? null;
  }

  /** The value of an expression already resolved to the dialect's data. */
  run(expression: unknown, scope: Scope | Bindings = {}): any {
    return this.evaluate(expression, isScope(scope) ? scope : this.scope(scope), new Set());
  }

  evaluate(expression: unknown, scope: Scope, active: Set<unknown>): any {
    if (!this.dialect.isExpression(expression)) throw new TypeError(`not an expression: ${repr(expression)}`);
    const kind = expression.kind();
    if (kind.ROLE === Expressions.LITERAL) {
      const value = expression.field("value");
      if (value === null) throw new ValueError(`${Expressions.article(kind.KIND)} needs a value`);
      return this.literal(value);
    }
    if (kind.ROLE === Expressions.REFERENCE) return scope.lookup(expression);
    if (active.has(expression)) throw new ValueError("the expression contains a cycle");
    active.add(expression);
    try {
      const args = expression.argumentsOf();
      if (kind.ROLE === Expressions.BINDING || kind.ROLE === Expressions.IMPORT) {
        kind.SLOTS.forEach((slot, i) => {
          if (args[i] === null) throw new ValueError(`${Expressions.article(kind.KIND)} needs ${Expressions.article(slot)}`);
        });
        if (kind.ROLE === Expressions.IMPORT) return this.evaluate(args[0], scope.enter(expression), active);
        const bound = this.evaluate(args[0], scope, active);
        return this.evaluate(args[1], scope.bind(Expressions.nameOf(expression) as string, bound), active);
      }
      return this.apply(expression, args, scope, active);
    } finally {
      active.delete(expression);
    }
  }

  private apply(expression: Expressions.Node, args: unknown[], scope: Scope, active: Set<unknown>): any {
    const kind = expression.kind();
    const operator = Expressions.operatorOf(expression);
    const implementations = this.operations.get(kind.KIND);
    const thunks = args.map((argument) => () => this.evaluate(argument, scope, active));
    if (kind.VOCABULARY === null) return (implementations as Implementation)(thunks, expression, scope);
    const implementation = (implementations as ReadonlyMap<string, Implementation>).get(operator);
    if (implementation === undefined) {
      if (this.extension !== null) return this.extension(operator, thunks, expression, scope);
      throw new NotImplementedError(`${repr(operator)} is not a core operation`);
    }
    const arity = (kind.VOCABULARY.get(operator) as { arity(): number }).arity();
    if (args.length !== arity) throw new TypeError(`${operator} takes ${arity} arguments, got ${args.length}`);
    return implementation(thunks, expression, scope);
  }
}
