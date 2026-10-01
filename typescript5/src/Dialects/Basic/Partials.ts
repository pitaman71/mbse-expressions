/**
 * Partial evaluation of the Basic dialect: what the scope knows is evaluated, and the rest stays a Basic expression.
 *
 * `Partials.OfAny(expression, variables)` gives the residual of any expression (a `Spec`) with `variables` known: the
 * literal of its value when it is all known, otherwise the expression with every known subexpression replaced by the
 * literal of its value (a typed value's literal carries its domain; an object, a collection or an unknown value has
 * none, and its subexpression stays). Kleene's logic decides `and`, `or` and `implies` with what is known: a false
 * operand of `and` (a true one of `or`) decides it, a true operand of `and` (a false one of `or`) drops out, and
 * `implies` is true when its condition is false or its conclusion true, and its conclusion when its condition is true.
 * A let of a known value binds it in its body and stays only while the body refers to its name.
 *
 * The residual agrees with the expression wherever the expression evaluates without raising, with the other
 * variables bound. See `Framework/Partials`.
 */

import * as F from "../../Framework/Partials.js";
import * as Domains from "./Domains.js";
import * as Evaluators from "./Evaluators.js";
import * as Expressions from "./Expressions.js";

/** The literal of a value: a native's, or a typed value's with its domain; null for anything else. */
function literal(value: unknown): unknown {
  if (value instanceof Domains.Value) return Expressions.literal(value.value as never, value.domain).data;
  return Expressions.DIALECT.literal(value as never);
}

/** Kleene's short-circuits for `and`, `or` and `implies`, with what is known of their operands. */
function simplify(node: any, results: F.Result[]): F.Result | null {
  const name = node.name; // an operation's: the only application
  if (name === "and" || name === "or") {
    const decisive = name === "or"; // the value that decides: true for or, false for and
    for (const result of results) if (result.known && result.value === decisive) return REDUCER.known(result.expression, decisive);
    for (const [i, result] of results.entries()) {
      if (result.known && result.value === !decisive) return results[1 - i] as F.Result;
    }
  }
  if (name === "implies") {
    const [condition, conclusion] = results as [F.Result, F.Result];
    if ((condition.known && condition.value === false) || (conclusion.known && conclusion.value === true)) {
      return REDUCER.known(node, true);
    }
    if (condition.known && condition.value === true) return conclusion;
  }
  return null;
}

/** The reducer of the Basic dialect. */
export const REDUCER = new F.Reducer(Evaluators.INTERPRETER, literal, simplify);

/** The residual of any expression, with `variables` known. */
export function OfAny(expression: Expressions.OfAny.Spec, variables: Record<string, unknown> = {}): unknown {
  return REDUCER.run(Expressions.OfAny.resolve(expression), variables);
}
