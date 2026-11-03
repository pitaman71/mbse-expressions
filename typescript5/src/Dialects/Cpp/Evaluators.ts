/** Evaluators of the Cpp dialect: compute an expression by C++'s rules for arithmetic types, which are C's for its
 * kinds (see `C/Evaluators`): `Evaluators.OfAny(term, scope)` evaluates a term value in a `Scope(variables,
 * functions)`. */

import type * as S from "../../Framework/Symbolics.js";
import { interpreter, Scope } from "../C/Evaluators.js";
import * as Expressions from "./Expressions.js";

export { Scope };

/** The interpreter of the Cpp dialect; its values carry their C++ types. */
export const INTERPRETER = interpreter(Expressions.DIALECT);

/** The value of a term in `scope`, or with the variables in an object bound: its native. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): unknown {
  return (INTERPRETER.run(expression, scope) as { value: unknown }).value;
}
