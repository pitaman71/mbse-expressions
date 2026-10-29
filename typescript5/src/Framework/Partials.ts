/**
 * Partials: partial evaluation, a peer of `Evaluators`. What a scope knows is evaluated; the rest stays an expression
 * of the same dialect, the residual.
 *
 * `new Reducer(interpreter, literal, simplify)` reduces an expression of the interpreter's dialect with the variables
 * it is given known. A subexpression whose references are all known is evaluated by the interpreter and replaced by
 * the literal of its value, when `literal(value)` gives one; otherwise (an object, a collection, an unknown value) it
 * stays as it is, still referring to the variables it needs. A binding of a known value binds it within its body, and
 * stays only while the reduced body still refers to its name; a binding of an unknown value hides any known variable
 * of its name, and so does a quantifier, whose collection and body are reduced. Any other term is rebuilt from its
 * reduced arguments, unless `simplify(node, results)` gives a simpler result from what is known of them (Kleene's
 * short-circuits, in Basic). A reference the scope does not know stays.
 *
 * The residual is a `Writer` (see `Terms`), which its caller writes where it wants it, in a transaction; a subterm it
 * keeps is the term value read, which writing copies. It agrees with the expression wherever the expression evaluates
 * without raising, in any scope that adds the unknown variables to the known ones. Evaluating a closed subexpression
 * throws as evaluation would.
 */

import type { Interpreter } from "./Evaluators.js";
import { free } from "./Symbolics.js";
import * as Terms from "./Terms.js";

/** A reduced term: the `expression` (a term value or a `Writer`), its `value` when it is `known`, and the names it
 * refers to that nothing within it binds (`free`). */
export class Result {
  constructor(readonly expression: unknown, readonly known: boolean = false, readonly value: unknown = null,
    readonly free: ReadonlySet<string> = new Set()) {}
}

/** Reduces the terms of an interpreter's dialect. `literal(value)` gives the writer of a value's literal, or null when
 * the dialect has none; `simplify(node, results)` gives a simpler result for an application whose arguments are not
 * all known, or null. */
export class Reducer {
  constructor(readonly interpreter: Interpreter, private readonly literal: (value: unknown) => unknown,
    private readonly simplify: (node: any, results: Result[]) => Result | null) {}

  /** The residual of a term (see `Terms.term`), with `variables` known: a writer. Python's `__call__`. */
  run(expression: unknown, variables: Record<string, unknown> | null = null): Terms.Writer {
    const dialect = this.interpreter.dialect;
    return dialect.spec(this.reduce(Terms.term(expression), new Map(Object.entries(variables ?? {}))).expression);
  }

  /** The result of a subexpression whose value is known: its literal, when the dialect has one. */
  known(expression: unknown, value: unknown): Result {
    const literal = this.literal(value);
    if (literal === null) return new Result(expression, true, value, free(expression, this.interpreter.dialect));
    return new Result(literal, true, value);
  }

  private rebuild(node: any, args: unknown[]): unknown {
    const form = Terms.form(node);
    return this.interpreter.dialect.make(new Terms.Form(form.kind, form.attributes, args));
  }

  reduce(node: any, known: ReadonlyMap<string, unknown>): Result {
    const dialect = this.interpreter.dialect;
    const names = free(node, dialect);
    if ([...names].every((name) => known.has(name))) {
      return this.known(node, this.interpreter.run(node, Object.fromEntries(known)));
    }
    const [, record, kind] = dialect.kind(node);
    if (kind.role === Terms.REFERENCE) return new Result(node, false, null, names);
    const args = Terms.argumentsOf(record);
    if (kind.role === Terms.BINDING || kind.role === Terms.QUANTIFIER) {
      const name = Terms.nameOf(node) as string;
      const first = this.reduce(args[0], known);
      const hidden = new Map([...known].filter(([key]) => key !== name));
      const inner = kind.role === Terms.BINDING && first.known ? new Map([...known, [name, first.value]]) : hidden;
      const body = this.reduce(args[1], inner);
      if (kind.role === Terms.BINDING && !body.free.has(name)) return body;
      return new Result(this.rebuild(node, [first.expression, body.expression]), false, null,
        new Set([...first.free, ...[...body.free].filter((n) => n !== name)]));
    }
    const results = args.map((argument) => this.reduce(argument, known));
    const bound = kind.role === Terms.IMPORT && kind.names !== null ? new Set(kind.names(record)) : new Set<string>();
    const rebuilt = new Result(this.rebuild(node, results.map((result) => result.expression)), false, null,
      new Set(results.flatMap((result) => [...result.free]).filter((n) => !bound.has(n))));
    return this.simplify(node, results) ?? rebuilt;
  }
}
