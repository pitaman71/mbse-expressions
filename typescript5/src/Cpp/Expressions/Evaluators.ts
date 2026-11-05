/** Evaluators of the Cpp dialect: compute an expression by C++'s rules for arithmetic types, which are C's for its
 * kinds (see `C/Evaluators`), a name used as an expression an `idexpression` holding its identifier (`EVALUATED`):
 * `Evaluators.OfAny(term, scope)` evaluates a term value in a `Scope(variables, functions)`. */

import type * as S from "../../Framework/Symbolics.js";
import { EVALUATED as C_EVALUATED, interpreter, Scope } from "../../C/Expressions/Evaluators.js";
import * as Expressions from "./Expressions.js";

export { Scope };

/** The kinds C++'s evaluator evaluates: C's, a name used as an expression an `idexpression`, as C++'s grammar makes it. */
export const EVALUATED: ReadonlySet<string> = new Set([...[...C_EVALUATED].filter((tag) => tag !== "variable"),
  Expressions.IDEXPRESSION]);

/** The interpreter of the Cpp dialect; its values carry their C++ types. */
export const INTERPRETER = interpreter(Expressions.DIALECT, EVALUATED);

/** The value of a term in `scope`, or with the variables in an object bound: its native. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  return (INTERPRETER.run(expression, scope) as { value: unknown }).value;
}
