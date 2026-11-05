/**
 * Evaluators of the TypeScript5 dialect: a literal's value, and nothing else yet.
 *
 * The dialects proposal decided a shallow evaluator (its Decided, 8): a new kind is refused by evaluation by name. The
 * framework's interpreter evaluates a literal by its role, its `value` (a boolean, a number, a bigint or a string), and
 * `EVALUATED` names that kind alone: every other kind, `constant` among them, raises `NotImplementedError`,
 * "TypeScript5 binaryexpression is not evaluated", and invalid syntax `ValueError`, as in every dialect.
 */

import * as F from "../../Framework/Evaluators.js";
import type { Bindings, Scope } from "../../Framework/Symbolics.js";
import * as T from "./Expressions.js";

/** The kinds evaluated: a literal, by its value. */
export const EVALUATED: ReadonlySet<string> = new Set([T.LITERAL]);

export const INTERPRETER: F.Interpreter = new F.Interpreter(T.DIALECT, new Map(), { evaluated: EVALUATED });

/** The value of a TypeScript5 term (or anything `Terms.term` reads one from): a literal's value; any other kind is
 * refused by name. */
export function OfAny(expression: unknown, scope: Scope | Bindings = {}): unknown {
  return INTERPRETER.run(expression, scope);
}
