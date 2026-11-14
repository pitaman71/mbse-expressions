/**
 * Symbolics: names, the scopes that resolve them, and the dependencies an expression declares.
 *
 * An expression refers to names: its references. A binding (a let, or any binder: `Terms.isBinder`) binds a name within
 * its body, an import binds the names it declares (its kind's `names`) within its body, a kind with `scopes` binds the
 * names it gives each argument (a binder's, a comprehension's targets, a lambda's parameters), and some names are
 * ambient, bound without a declaration (Python's builtins). `free(term, dialect)` is the set of names an expression needs from outside: its lexical
 * references that nothing within it binds. `imports(term, dialect)` lists the imports it declares: what it needs its
 * scope to provide.
 *
 * A `Scope` is where references are resolved at simplification, in the dialect's own way: `lookup(reference)` gives a
 * reference's value, `bind(name, value)` the scope within a binding, and `enter(declaration)` the scope within an
 * import. `Variables` is the scope of dialects whose references are names bound to values; dialects with imports,
 * packages or workbooks derive their own. A simplifier given an object of variables instead of a scope makes its
 * dialect's scope from it, so `Simplifiers.OfAny(expression, { person: value })` binds `person`. A scope decides what an
 * import may bring in: imports resolve only what the caller's scope allows, never by loading code.
 *
 * What a scope does not bind is not an error: a reference it cannot resolve (an unbound name, a function or an import
 * it does not provide) throws `Unbound`, which the simplifier catches, leaving the reference in the residual (see
 * `Simplifiers`); a name bound to `UNKNOWN` is unbound too, as a binding hides a name its simplifier does not know the
 * value of. `Unbound` never leaves a simplifier. `scopes(node, dialect)` gives the names a term binds for each of its
 * arguments, which `free` and the simplifier read alike.
 */

import * as Terms from "./Terms.js";

/** Thrown by a scope for a reference it does not resolve: a name it does not bind (or binds to `UNKNOWN`), a function
 * or an import it does not provide. The simplifier catches it, leaving the reference in the residual. */
export class Unbound extends Error {
  override name = "Unbound";
}

/** The value a scope binds a name to whose value is not known: looking it up throws `Unbound`. */
export const UNKNOWN: unknown = Symbol("UNKNOWN");

/** Where references are resolved. */
export interface Scope {
  /** The value of a reference. */
  lookup(reference: any): any;
  /** This scope, with `name` bound to `value`. */
  bind(name: string, value: unknown): Scope;
  /** This scope, with what an import declares. */
  enter(declaration: any): Scope;
}

/** The variables an expression is simplified with, when no scope is given. */
export type Bindings = Record<string, unknown>;

/** Whether `value` is a scope rather than an object of variables. */
export function isScope(value: unknown): value is Scope {
  const candidate = value as Partial<Scope> | null;
  return typeof candidate?.lookup === "function" && typeof candidate.bind === "function"
    && typeof candidate.enter === "function";
}

/** A scope of named values: a reference's value is its name's innermost binding, then the variable of that name; a
 * reference to neither, or to a name bound to `UNKNOWN`, throws `Unbound`. It has no imports: entering one throws
 * `Unbound` too, the import left in the residual. */
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

  lookup(reference: any): any {
    return this.value(Terms.nameOf(reference) as string);
  }

  /** The value bound to `name`; throws `Unbound` when there is none, or it is `UNKNOWN`. */
  value(name: string): any {
    const [found, value] = this.find(name);
    if (!found || value === UNKNOWN) throw new Unbound(name);
    return value;
  }

  bind(name: string, value: unknown): this {
    const inner = this.copy();
    inner.values = [new Map([[name, value]]), ...this.values];
    return inner;
  }

  enter(declaration: any): Scope {
    throw new Unbound(Terms.kindOf(declaration)[0]);
  }

  protected copy(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }
}

/** The names a term binds for each of its arguments (`Terms.argumentsOf`), its kind read as `dialect` reads it: a
 * kind's `scopes` (a comprehension's targets, a lambda's parameters); a let's or a quantifier's name, after its first
 * argument; an import's names, for every argument; none, for any other. */
export function scopes(node: any, dialect: Terms.Dialect): ReadonlySet<string>[] {
  const [, record, kind] = dialect.kind(node);
  const args = Terms.argumentsOf(record);
  if (kind.scopes !== null) return kind.scopes(record).map((names) => new Set(names));
  if (kind.role === Terms.QUANTIFIER || Terms._lets(kind, record)) {
    return args.map((_, i) => (i === 0 ? new Set<string>() : new Set([Terms.nameOf(node) as string])));
  }
  if (kind.role === Terms.IMPORT) {
    const names = new Set(kind.names !== null ? kind.names(Terms.attributesOf(record)) : []);
    return args.map(() => names);
  }
  return args.map(() => new Set<string>());
}

/** The names a term needs from its scope: its lexical references that no binding or import within it binds, and that
 * are not ambient, its kinds read as `dialect` reads them. */
export function free(term: unknown, dialect: Terms.Dialect): Set<string> {
  const found = new Set<string>();
  const visit = (node: any, bound: ReadonlySet<string>): void => {
    const [, record, kind] = dialect.kind(node);
    const name = Terms.nameOf(node);
    if (kind.role === Terms.REFERENCE) {
      if (kind.lexical && name !== null && !bound.has(name) && !kind.ambient.has(name)) found.add(name);
      // a name node's terms (a template's arguments) are its arguments, as an application's
      if (!(Terms.attributesOf(record).get("name") instanceof Terms.Part)) return;
    }
    const names = scopes(node, dialect);
    Terms.argumentsOf(record).forEach((argument, i) => {
      if (argument !== null) visit(argument, new Set([...bound, ...(names[i] as ReadonlySet<string>)]));
    });
  };
  visit(Terms.term(term), new Set());
  return found;
}

/** The imports a term declares, in the order `Terms.walk` visits them. */
export function imports(term: unknown, dialect: Terms.Dialect): any[] {
  return [...Terms.walk(term)].filter((node) => dialect.kind(node)[2].role === Terms.IMPORT);
}
