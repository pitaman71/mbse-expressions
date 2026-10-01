/**
 * Partials: partial evaluation, a peer of `Evaluators`. What a scope knows is evaluated; the rest stays an expression
 * of the same dialect, the residual.
 *
 * `new Reducer(interpreter, literal, simplify)` reduces an expression of the interpreter's dialect with the variables
 * it is given known. A subexpression whose references are all known is evaluated by the interpreter and replaced by
 * the literal of its value, when `literal(value)` gives one; otherwise (an object, a collection, an unknown value) it
 * stays as it is, still referring to the variables it needs. A binding of a known value binds it within its body, and
 * stays only while the reduced body still refers to its name; a binding of an unknown value hides any known variable
 * of its name, and so does a quantifier, whose collection and body are reduced. Any other node is rebuilt from its
 * reduced arguments, unless `simplify(node, results)` gives a simpler result from what is known of them (Kleene's
 * short-circuits, in Basic). A reference the scope does not know stays.
 *
 * The residual agrees with the expression wherever the expression evaluates without raising, in any scope that adds
 * the unknown variables to the known ones. Evaluating a closed subexpression throws as evaluation would, and a cycle
 * throws.
 */

import { Errors, Repr } from "@mbse/schemas/Framework";

import type { Interpreter } from "./Evaluators.js";
import { free } from "./Symbolics.js";
import * as Terms from "./Terms.js";

const { ValueError } = Errors;

/** A reduced expression: the `expression`, and its `value` when it is `known`. */
export class Result {
  constructor(readonly expression: unknown, readonly known: boolean = false, readonly value: unknown = null) {}
}

/** Reduces the expressions of an interpreter's dialect. `literal(value)` gives the literal of a value, or null when
 * the dialect has none; `simplify(node, results)` gives a simpler result for an application whose arguments are not
 * all known, or null. */
export class Reducer {
  constructor(readonly interpreter: Interpreter, private readonly literal: (value: unknown) => unknown,
    private readonly simplify: (node: any, results: Result[]) => Result | null) {}

  /** The residual of an expression already resolved to the dialect's data, with `variables` known. */
  run(expression: unknown, variables: Record<string, unknown> = {}): unknown {
    return this.reduce(expression, new Map(Object.entries(variables)), new Set()).expression;
  }

  /** The result of a subexpression whose value is known: its literal, when the dialect has one. */
  known(expression: unknown, value: unknown): Result {
    const literal = this.literal(value);
    return new Result(literal === null ? expression : literal, true, value);
  }

  private rebuild(node: Terms.Node, args: unknown[]): unknown {
    const form = node.form();
    return this.interpreter.dialect.make(new Terms.Form(form.kind, form.attributes, args));
  }

  reduce(node: unknown, known: ReadonlyMap<string, unknown>, active: Set<unknown>): Result {
    const dialect = this.interpreter.dialect;
    if (!dialect.isExpression(node)) throw new TypeError(`not an expression: ${Repr.repr(node)}`);
    if ([...free(node)].every((name) => known.has(name))) {
      return this.known(node, this.interpreter.run(node, Object.fromEntries(known)));
    }
    const kind = node.kind();
    if (kind.ROLE === Terms.REFERENCE) return new Result(node);
    if (active.has(node)) throw new ValueError("the expression contains a cycle");
    active.add(node);
    try {
      const args = node.argumentsOf();
      if (kind.ROLE === Terms.BINDING || kind.ROLE === Terms.QUANTIFIER) {
        const name = Terms.nameOf(node) as string;
        const first = this.reduce(args[0], known, active);
        const hidden = new Map([...known].filter(([key]) => key !== name));
        const inner = kind.ROLE === Terms.BINDING && first.known ? new Map([...known, [name, first.value]]) : hidden;
        const body = this.reduce(args[1], inner, active);
        if (kind.ROLE === Terms.BINDING && !free(body.expression).has(name)) return body;
        return new Result(this.rebuild(node, [first.expression, body.expression]));
      }
      const results = args.map((argument) => this.reduce(argument, known, active));
      return this.simplify(node, results) ?? new Result(this.rebuild(node, results.map((result) => result.expression)));
    } finally {
      active.delete(node);
    }
  }
}
