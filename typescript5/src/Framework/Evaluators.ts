/**
 * Evaluators: the protocols for computing an expression's value, and an interpreter that dialects build theirs on.
 *
 * An `Evaluator` computes the value of any expression of its dialect in a scope; each dialect's `Evaluators.OfAny` is
 * one. A `Predicate` evaluates a rule about a value, with `this` bound to it: `(rule, value) => boolean | null`. The value domains, the treatment of unknown values and the rules of each operator are the dialect's own:
 * evaluation is where dialects differ most.
 *
 * Evaluation resolves references in a scope (see `Symbolics`): an evaluator given an object of variables instead of a
 * scope makes its dialect's scope from it, so `Evaluators.OfAny(expression, { this: value })` binds `this`.
 *
 * `Interpreter` evaluates by role (see `Terms`): a literal gives its value (through `literal`, or `typed` when it
 * carries a domain of its own), a reference what the scope resolves, a binding its body in the scope with its name bound, and an import its body in the scope it
 * declares. An application calls its operator's implementation from `operations`, with one thunk per argument, so
 * that implementations decide which arguments to evaluate and when, and so does a quantifier, whose second thunk takes
 * an item and evaluates the body with the name bound to it; the implementation of a kind whose vocabulary is
 * open is one function for every name, and operators outside a closed vocabulary go to `extension`, if given. It
 * throws on what `Dialect.validate` reports: operations outside the vocabulary, wrong numbers of arguments, unbound
 * references, missing values and cycles.
 */

import { Errors, Repr } from "@mbse/schemas/Framework";

import { type Bindings, isScope, type Scope, Variables } from "./Symbolics.js";
import * as Terms from "./Terms.js";

const { NotImplementedError, ValueError } = Errors;
const { repr } = Repr;

export type Thunk = () => any;
/** Computes an operation's value from thunks for its arguments, the node (for its attributes) and the scope. */
export type Implementation = (args: Thunk[], node: any, scope: any) => any;

/** Computes the value of an expression in `scope`, or with the variables in an object bound. */
export type Evaluator = (expression: any, scope?: Scope | Bindings) => any;

/** Whether `value` satisfies `rule`, evaluated with `this` bound to it: true, false, or null when unknown. */
export type Predicate = (predicate: any, value: unknown) => boolean | null;

/** Evaluates the expressions of `dialect`. `operations` maps each application kind's tag to its implementations by
 * operator name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's value
 * into the dialect's domain of values, and `typed(domain, value)` gives the value of a literal that carries a domain of
 * its own (without it, evaluating one throws `NotImplementedError`); `scope` makes the dialect's scope from an object
 * of variables, and `extension(operator, args, node, scope)` evaluates operators outside a kind's vocabulary. */
export class Interpreter {
  private readonly literal: (value: unknown) => unknown;
  private readonly typed: ((domain: any, value: unknown) => unknown) | null;
  private readonly scope: (variables: Bindings) => Scope;
  private readonly extension: ((operator: string, args: Thunk[], node: any, scope: any) => any) | null;

  constructor(readonly dialect: Terms.Declared,
    readonly operations: ReadonlyMap<string, ReadonlyMap<string, Implementation> | Implementation>,
    options: {
      literal?: (value: unknown) => unknown;
      typed?: (domain: any, value: unknown) => unknown;
      scope?: (variables: Bindings) => Scope;
      extension?: (operator: string, args: Thunk[], node: any, scope: any) => any;
    } = {}) {
    this.literal = options.literal ?? ((value) => value);
    this.typed = options.typed ?? null;
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
    if (kind.ROLE === Terms.LITERAL) {
      const value = expression.field("value");
      if (value === null) throw new ValueError(`${Terms.article(kind.KIND)} needs a value`);
      const typed = expression.typed();
      if (typed === null) return this.literal(value);
      if (this.typed === null) throw new NotImplementedError(`this evaluator has no values of ${typed.name()}`);
      return this.typed(typed, value);
    }
    if (kind.ROLE === Terms.REFERENCE) return scope.lookup(expression);
    if (active.has(expression)) throw new ValueError("the expression contains a cycle");
    active.add(expression);
    try {
      const args = expression.argumentsOf();
      if (kind.ROLE === Terms.BINDING || kind.ROLE === Terms.IMPORT || kind.ROLE === Terms.QUANTIFIER) {
        kind.SLOTS.forEach((slot, i) => {
          if (args[i] === null) throw new ValueError(`${Terms.article(kind.KIND)} needs ${Terms.article(slot)}`);
        });
        if (kind.ROLE === Terms.QUANTIFIER) return this.apply(expression, args, scope, active);
        if (kind.ROLE === Terms.IMPORT) return this.evaluate(args[0], scope.enter(expression), active);
        const bound = this.evaluate(args[0], scope, active);
        return this.evaluate(args[1], scope.bind(Terms.nameOf(expression) as string, bound), active);
      }
      return this.apply(expression, args, scope, active);
    } finally {
      active.delete(expression);
    }
  }

  private apply(expression: Terms.Node, args: unknown[], scope: Scope, active: Set<unknown>): any {
    const kind = expression.kind();
    const operator = Terms.operatorOf(expression);
    const implementations = this.operations.get(kind.KIND);
    const thunks: any[] = args.map((argument) => () => this.evaluate(argument, scope, active));
    if (kind.ROLE === Terms.QUANTIFIER) { // the arguments after the collection, of an item: evaluated with the name bound to it
      const name = Terms.nameOf(expression) as string;
      for (let i = 1; i < args.length; i++) thunks[i] = (item: unknown) => this.evaluate(args[i], scope.bind(name, item), active);
    }
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
