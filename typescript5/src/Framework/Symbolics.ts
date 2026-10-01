/**
 * Symbolics: names, the scopes that resolve them, and the dependencies an expression declares.
 *
 * An expression refers to names: its references. A binding (a let) binds a name within its body, an import binds the
 * names it declares (`binds()`) within its body, and some names are ambient, bound without a declaration (Python's
 * builtins). `free(expression)` is the set of names an expression needs from outside: its lexical references that
 * nothing within it binds. `imports(expression)` lists the imports it declares: what it needs its scope to provide.
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
    throw new KeyError(`${reference.kind().KIND} ${repr(Terms.nameOf(reference))} is not bound`);
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

/** An expression, or a `Term`'s. */
function dataOf(expression: unknown): Terms.Node {
  return (expression instanceof Terms.Term ? expression.data : expression) as Terms.Node;
}

/** The names `expression` (an expression or a `Term`) needs from its scope: its lexical references that no binding or
 * import within it binds, and that are not ambient. Shared sub-expressions and cycles are visited once per set of
 * bound names. */
export function free(expression: unknown): Set<string> {
  const found = new Set<string>();
  const seen = new Map<unknown, Set<string>>();
  const visit = (node: unknown, bound: ReadonlySet<string>): void => {
    if (!(node instanceof Terms.Node)) return;
    const key = [...bound].sort().join("\u0000");
    const visited = seen.get(node) ?? new Set<string>();
    if (visited.has(key)) return;
    seen.set(node, visited.add(key));
    const kind = node.kind();
    const name = Terms.nameOf(node) as string;
    if (kind.ROLE === Terms.REFERENCE) {
      if (kind.LEXICAL && !bound.has(name) && !kind.AMBIENT.has(name)) found.add(name);
      return;
    }
    const args = node.argumentsOf();
    let scopes: ReadonlySet<string>[] = args.map(() => bound);
    if (kind.ROLE === Terms.BINDING || kind.ROLE === Terms.QUANTIFIER) scopes = args.map((_, i) => (i === 0 ? bound : new Set([...bound, name])));
    else if (kind.ROLE === Terms.IMPORT) scopes = args.map(() => new Set([...bound, ...node.binds()]));
    args.forEach((argument, i) => visit(argument, scopes[i] as ReadonlySet<string>));
  };
  visit(dataOf(expression), new Set());
  return found;
}

/** The imports `expression` (an expression or a `Term`) declares, each once, in the order `Terms.walk` visits
 * them. */
export function imports(expression: unknown): any[] {
  return [...Terms.walk(dataOf(expression))].filter((node) => node.kind().ROLE === Terms.IMPORT);
}
