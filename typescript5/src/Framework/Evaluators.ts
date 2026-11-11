/**
 * Evaluators: the protocols for computing an expression's value, and an interpreter that dialects build theirs on.
 *
 * An `Evaluator` computes the value of any expression of its dialect in a scope; each dialect's `Evaluators.OfAny` is
 * one. The value domains, the treatment of unknown values and the rules of each operator are the dialect's own:
 * evaluation is where dialects differ most.
 *
 * Evaluation resolves references in a scope (see `Symbolics`): an evaluator given an object of variables instead of a
 * scope makes its dialect's scope from it, so `Evaluators.OfAny(expression, { person: value })` binds `person`.
 *
 * `Interpreter` evaluates a term value by its kind's role (see `Terms`): a literal gives its value (through `literal`,
 * or `typed` when its kind's attributes give it a domain of its own, as C's type does a constant), a reference what the
 * scope resolves, a binding its body in the scope
 * with its name bound, and an import its body in the scope it declares. An application calls its operator's
 * implementation from `operations`, with one thunk per argument, so that implementations decide which arguments to
 * evaluate and when, and so does a quantifier, whose second thunk takes an item and evaluates the body with the name
 * bound to it; the implementation of a kind whose vocabulary is open is one function for every name, and operators
 * outside a closed vocabulary go to `extension`, if given. It throws on what `Dialect.validate` reports: operations
 * outside the vocabulary, wrong numbers of arguments, unbound references and missing values; invalid syntax (`error`,
 * `missing`) is refused by name, and so is a kind outside `evaluated`, where the interpreter is given the kinds it
 * evaluates (a dialect whose kinds outgrow its evaluator: "Python3 lambda is not evaluated"), and an operator its
 * vocabulary has but `operations` does not implement ("Python3 binop '@' is not evaluated"). An evaluator takes a term
 * value, or anything `Terms.term` reads one from (an `Expression`, a term property).
 */

import { Errors, Repr } from "@mbse/schemas/Framework";

import { type Bindings, isScope, type Scope, Variables } from "./Symbolics.js";
import * as Terms from "./Terms.js";

const { NotImplementedError, ValueError } = Errors;
const { repr } = Repr;

export type Thunk = () => any;
/** Computes an operation's value from thunks for its arguments, the term (for its attributes) and the scope. */
export type Implementation = (args: Thunk[], node: any, scope: any) => any;

/** Computes the value of a term in `scope`, or with the variables in an object bound. */
export type Evaluator = (expression: any, scope?: Scope | Bindings) => any;

/** Evaluates the expressions of `dialect`. `operations` maps each application kind's tag to its implementations by
 * operator name, or, for a kind whose vocabulary is open, to one implementation. `literal` converts a literal's value
 * into the dialect's domain of values, and `typed(domain, value)` gives the value of a literal whose kind gives it a
 * domain of its own (`Kind.typed`; without it, evaluating one throws `NotImplementedError`); `scope` makes the dialect's scope from an object
 * of variables, and `extension(operator, args, node, scope)` evaluates operators outside a kind's vocabulary.
 * `evaluated`, where given, names the kinds it evaluates: any other is refused by name, `NotImplementedError`. */
export class Interpreter {
  private readonly literal: (value: unknown) => unknown;
  private readonly typed: ((domain: any, value: unknown) => unknown) | null;
  private readonly scope: (variables: Bindings) => Scope;
  private readonly extension: ((operator: string, args: Thunk[], node: any, scope: any) => any) | null;
  private readonly evaluated: ReadonlySet<string> | null;

  constructor(readonly dialect: Terms.Dialect,
    readonly operations: ReadonlyMap<string, ReadonlyMap<string, Implementation> | Implementation>,
    options: {
      literal?: (value: unknown) => unknown;
      typed?: (domain: any, value: unknown) => unknown;
      scope?: (variables: Bindings) => Scope;
      extension?: (operator: string, args: Thunk[], node: any, scope: any) => any;
      evaluated?: ReadonlySet<string>;
    } = {}) {
    this.literal = options.literal ?? ((value) => value);
    this.typed = options.typed ?? null;
    this.scope = options.scope ?? ((variables) => new Variables(variables));
    this.extension = options.extension ?? null;
    this.evaluated = options.evaluated ?? null;
  }

  /** The value of a term (see `Terms.term`): Python's `__call__`. */
  run(expression: unknown, scope: Scope | Bindings | null = null): any {
    const resolved = isScope(scope) ? scope : this.scope({ ...(scope ?? {}) });
    return this.evaluate(Terms.term(expression), resolved);
  }

  evaluate(node: any, scope: Scope): any {
    const [tag, record, kind] = this.dialect.kind(node);
    if (kind.role === Terms.INVALID) throw new ValueError(`${this.dialect.name()} ${tag} is not evaluated`);
    if (this.evaluated !== null && !this.evaluated.has(tag)) {
      throw new NotImplementedError(`${this.dialect.name()} ${tag} is not evaluated`);
    }
    if (kind.role === Terms.LITERAL) {
      const value = Terms.attributesOf(record).get("value") ?? null;
      if (value === null) throw new ValueError(`${Terms.article(tag)} needs a value`);
      const typed = kind.typed !== null ? kind.typed(record) : null;
      if (typed === null) return this.literal(value);
      if (this.typed === null) throw new NotImplementedError(`this evaluator has no values of ${typed.name()}`);
      return this.typed(typed, value);
    }
    if (kind.role === Terms.REFERENCE) return scope.lookup(node);
    const args = Terms.argumentsOf(record);
    if (kind.role === Terms.BINDING || kind.role === Terms.IMPORT || kind.role === Terms.QUANTIFIER) {
      const [slots] = Terms._parts(record.as_schema());
      slots.forEach((slot, i) => {
        // an import's `value`, which it leaves unset
        if (i < args.length && args[i] === null && !kind.optional.includes(slot)) throw new ValueError(`${Terms.article(tag)} needs ${Terms.article(slot)}`);
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
    if (kind.role === Terms.QUANTIFIER) { // the arguments after the collection, of an item: evaluated with the name bound to it
      const name = Terms.nameOf(node) as string;
      for (let i = 1; i < args.length; i++) thunks[i] = (item: unknown) => this.evaluate(args[i], scope.bind(name, item));
    }
    if (kind.vocabulary === null || kind.operators !== null) { // one implementation for every operator
      return (implementations as Implementation)(thunks, node, scope);
    }
    const implementation = (implementations as ReadonlyMap<string, Implementation>).get(operator);
    if (implementation === undefined && kind.vocabulary.has(operator) && !kind.closed && this.extension === null) {
      throw new NotImplementedError(`${this.dialect.name()} ${tag} ${repr(operator)} is not evaluated`);
    }
    if (implementation === undefined) {
      if (this.extension !== null) return this.extension(operator, thunks, node, scope);
      if (kind.closed) throw new NotImplementedError(`${repr(operator)} is not an operation ${this.dialect.name()} defines`);
      throw new NotImplementedError(`${repr(operator)} is not a core operation`);
    }
    const arity = (kind.vocabulary.get(operator) as { arity(): number }).arity();
    if (arity >= 0 && args.length !== arity) throw new TypeError(`${operator} takes ${arity} arguments, got ${args.length}`);
    return implementation(thunks, node, scope);
  }
}
