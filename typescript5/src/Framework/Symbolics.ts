/**
 * Symbolics: names, the scopes that resolve them, and the dependencies an expression declares.
 *
 * An expression refers to names: its references. A binding (a let) binds a name within its body, an import binds the
 * names it declares (its kind's `names`) within its body, and some names are ambient, bound without a declaration
 * (Python's builtins). `free(term, dialect)` is the set of names an expression needs from outside: its lexical
 * references that nothing within it binds. `imports(term, dialect)` lists the imports it declares: what it needs its
 * scope to provide.
 *
 * A `Scope` is where references are resolved at evaluation, in the dialect's own way: `lookup(reference)` gives a
 * reference's value, `bind(name, value)` the scope within a binding, and `enter(declaration)` the scope within an
 * import. `Variables` is the scope of dialects whose references are names bound to values; dialects with imports,
 * packages or workbooks derive their own. An evaluator given an object of variables instead of a scope makes its
 * dialect's scope from it, so `Evaluators.OfAny(expression, { this: value })` binds `this`. A scope decides what an
 * import may bring in: imports resolve only what the caller's scope allows, never by loading code.
 */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as Terms from "./Terms.js";

const { KeyError, NotImplementedError } = Errors;
const { repr } = Repr;

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
    const [found, value] = this.find(Terms.nameOf(reference) as string);
    return found ? value : this.unbound(reference);
  }

  unbound(reference: any): any {
    throw new KeyError(`${Terms.kindOf(reference)[0]} ${repr(Terms.nameOf(reference))} is not bound`);
  }

  bind(name: string, value: unknown): this {
    const inner = this.copy();
    inner.values = [new Map([[name, value]]), ...this.values];
    return inner;
  }

  enter(declaration: any): Scope {
    throw new NotImplementedError(`${this.constructor.name} has no ${Terms.kindOf(declaration)[0]}s`);
  }

  protected copy(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }
}

/** The names a term needs from its scope: its lexical references that no binding or import within it binds, and that
 * are not ambient, its kinds read as `dialect` reads them. */
export function free(term: unknown, dialect: Terms.Dialect): Set<string> {
  const found = new Set<string>();
  const visit = (node: any, bound: ReadonlySet<string>): void => {
    const [, record, kind] = dialect.kind(node);
    const name = Terms.nameOf(node);
    if (kind.role === Terms.REFERENCE) {
      if (kind.lexical && !bound.has(name) && !kind.ambient.has(name)) found.add(name);
      return;
    }
    const args = Terms.argumentsOf(record);
    let scopes: ReadonlySet<string>[] = args.map(() => bound);
    if (kind.role === Terms.BINDING || kind.role === Terms.QUANTIFIER) {
      scopes = args.map((_, i) => (i === 0 ? bound : new Set([...bound, name])));
    } else if (kind.role === Terms.IMPORT) {
      const names = new Set([...bound, ...(kind.names !== null ? kind.names(record) : [])]);
      scopes = args.map(() => names);
    }
    args.forEach((argument, i) => {
      if (argument !== null) visit(argument, scopes[i] as ReadonlySet<string>);
    });
  };
  visit(Terms.term(term), new Set());
  return found;
}

/** The imports a term declares, in the order `Terms.walk` visits them. */
export function imports(term: unknown, dialect: Terms.Dialect): any[] {
  return [...Terms.walk(term)].filter((node) => dialect.kind(node)[2].role === Terms.IMPORT);
}
