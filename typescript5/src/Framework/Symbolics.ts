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
 * A scope resolves parameter references apart from its variables, so that a parameter and a variable of one name never
 * collide (mbse-basis [CAP-296: simplification over literals, variables and
 * parameters](mbse:mbse-basis/docs/capabilities/CAP-296.md)). `within(context)` gives a scope whose parameters are those
 * of a context, a `Contexts.OfContext` of mbse-schemas (mbse-basis [CAP-319: contexts as schema
 * data](mbse:mbse-basis/docs/capabilities/README.md#CAP-319)), each assigned a value or bound to an object; a scope
 * within a context within another is within a copy of the outer context, the inner one's parameters replacing the
 * outer one's of their names, as `Contexts.within` copies a sub-context. A scope's `lookup` gives a parameter reference
 * to `value`, as it gives a variable's name (`Terms.nameOf`), so that each dialect's scope lifts a parameter's value as
 * it lifts a variable's. `given(scope, name)` tells what a scope's context gives a parameter, and
 * `contextScope(context, make)` makes a scope of a context's variables and parameters.
 *
 * What a scope does not bind is not an error: a reference it cannot resolve (an unbound name, a function or an import
 * it does not provide) throws `Unbound`, which the simplifier catches, leaving the reference in the residual (see
 * `Simplifiers`); a name bound to `UNKNOWN` is unbound too, as a binding hides a name its simplifier does not know the
 * value of. `Unbound` never leaves a simplifier. `scopes(node, dialect)` gives the names a term binds for each of its
 * arguments, which `free` and the simplifier read alike.
 */

import { Repr } from "@mbse/schemas/Framework";

import * as Objects from "./Objects.js";
import * as Terms from "./Terms.js";

const CONTEXT = "Contexts.OfContext";

/** What a context gives a parameter: `["object", reference]`, where it binds the parameter to an object, or
 * `["value", value]`, where it assigns it one. */
export type Given = readonly ["value" | "object", unknown];

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
 * `Unbound` too, the import left in the residual. Its `options` are the parameters of simplification that its caller
 * chooses up front (mbse-basis [CAP-305: simplification's options, chosen up
 * front](mbse:mbse-basis/docs/capabilities/CAP-305.md)), by name; `option(name, default)` reads one. */
export class Variables implements Scope {
  protected values: Map<string, unknown>[];
  readonly options: ReadonlyMap<string, unknown>;
  /** What its context gives each parameter, read once. */
  parameters: ReadonlyMap<string, Given> = new Map();

  constructor(variables: Bindings = {}, options: Bindings = {}) {
    this.values = [new Map(Object.entries(variables))];
    this.options = new Map(Object.entries(options));
  }

  /** The value of the option `name`, or `fallback` where the scope does not set it. */
  option(name: string, fallback: unknown): unknown {
    return this.options.has(name) ? this.options.get(name) : fallback;
  }

  /** Whether `name` is bound, and its value. */
  protected find(name: string): [boolean, unknown] {
    for (const layer of this.values) if (layer.has(name)) return [true, layer.get(name)];
    return [false, undefined];
  }

  lookup(reference: any): any {
    return this.value(Terms.nameOf(reference) as string);
  }

  /** The value bound to `name`; throws `Unbound` when there is none, or it is `UNKNOWN`. Given a parameter reference
   * (`Terms.isParameter`), the value its context assigns its parameter, a value to compute with; throws `Unbound`
   * where it assigns none, or assigns a term (which a reader puts in the reference's place instead,
   * `Terms.substituting`), or binds the parameter to an object, which no term's place takes. */
  value(name: any): any {
    if (Terms.isParameter(name)) {
      const parameter = Terms.parameterName(name);
      const given = this.parameters.get(parameter);
      if (given === undefined || given[0] !== "value" || Terms.isTerm(given[1])) throw new Unbound(parameter);
      return given[1];
    }
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

  /** This scope within a context, a `Contexts.OfContext`: its parameters, each the value assigned to it or the object
   * bound to it, replacing this scope's of their names. Its variables and options are this scope's. */
  within(context: unknown): this {
    const inner = this.copy();
    inner.parameters = new Map([...this.parameters, ...parametersOf(context)]);
    return inner;
  }

  protected copy(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }
}

/** Whether `value` is a context, a value of mbse-schemas' `Contexts.OfContext`. */
export function isContext(value: unknown): boolean {
  const schema = (value as { as_schema?: () => any } | null)?.as_schema;
  return typeof schema === "function" && (schema.call(value) as { name?: unknown } | null)?.name === CONTEXT;
}

/** The entries of a context's `variables` or `parameters`, by name, each as its visitor. */
function entriesOf(context: any, container: string): Map<string, any> {
  const pairs: [string, any][] = [];
  context[container].as_value((a: any) => a.as_container((c: any) => c.as_entries((it: Iterator<[string, any]>) => {
    for (let next = it.next(); !next.done; next = it.next()) pairs.push(next.value);
  })));
  const found = new Map<string, any>();
  for (const [name, element] of pairs) {
    element.as_object((entry: any) => {
      if (!found.has(name)) found.set(name, entry);
      return entry;
    });
  }
  return found;
}

/** The reference an entry's property holds (a `References.OfValue` or `References.OfObject`), or null. */
function referenceOf(prop: any): any {
  const found: any[] = [];
  prop.as_value((a: any) => a.as_object((o: any) => {
    if (o.as_schema() !== null) found.push(o);
    return o;
  }));
  return found.length > 0 ? found[0] : null;
}

/** The value an entry's `References.OfValue` holds, as evaluators read it (`Objects.held`); null where it holds none. */
function assigned(entry: any): unknown {
  const held = referenceOf(entry.value);
  const found: unknown[] = [];
  if (held !== null) {
    held.value.as_value((a: any) => {
      found.push(Objects.held(a));
      return a;
    });
  }
  return found.length > 0 ? found[0] : null;
}

/** What a context gives each parameter it names: `["object", reference]`, where it binds the parameter to an object,
 * else `["value", value]`, where it assigns it one; a parameter it names but neither assigns nor binds is left out. */
function parametersOf(context: unknown): Map<string, Given> {
  if (!isContext(context)) throw new TypeError(`a scope is within a context (${CONTEXT}), not ${Repr.repr(context)}`);
  const found = new Map<string, Given>();
  for (const [name, entry] of entriesOf(context, "parameters")) {
    const [bound, value] = [referenceOf(entry.object), assigned(entry)];
    if (bound !== null) found.set(name, ["object", bound]);
    else if (value !== null) found.set(name, ["value", value]);
  }
  return found;
}

/** What a scope's context gives the parameter `name`: `["value", value]`, `["object", reference]`, or null where it
 * neither assigns nor binds it, or the scope has no context. */
export function given(scope: unknown, name: string): Given | null {
  const parameters = (scope as { parameters?: ReadonlyMap<string, Given> } | null)?.parameters;
  return parameters?.get(name) ?? null;
}

/** What a parameter reference standing in a place of any value (a literal's `value`) holds in a scope: the value its
 * context assigns it, or the reference (`References.OfObject`) of the object its context binds it to, as it is, the
 * object neither resolved nor read; throws `Unbound` where its context does neither. */
export function held(scope: unknown, parameter: any): unknown {
  const name = Terms.parameterName(parameter);
  const found = given(scope, name);
  if (found === null) throw new Unbound(name);
  return found[1];
}

/** The scope of a context: the scope that `make(variables)` makes of the values its variables are assigned, within the
 * context, so that its parameters are the context's. */
export function contextScope(context: unknown, make: (variables: Bindings) => Scope): Scope {
  const variables: Bindings = {};
  for (const [name, entry] of entriesOf(context, "variables")) {
    const value = assigned(entry);
    if (value !== null) variables[name] = value;
  }
  return (make(variables) as Variables).within(context);
}

/** The value of the option `name` that `scope` sets, or `fallback` where it sets none or has no options. */
export function option(scope: unknown, name: string, fallback: unknown): unknown {
  const read = (scope as { option?: (name: string, fallback: unknown) => unknown } | null)?.option;
  return typeof read === "function" ? read.call(scope, name, fallback) : fallback;
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
