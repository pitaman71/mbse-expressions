/**
 * Evaluators of the TypeScript5 dialect: a literal's value, and nothing else yet.
 *
 * A shallow evaluator was decided (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "A shallow evaluator"): a new kind is refused by evaluation by name. The
 * framework's interpreter evaluates a literal by its role, its `value` (a boolean, a number, a bigint or a string), and
 * `EVALUATED` names that kind alone: every other kind, `constant` among them, raises `NotImplementedError`,
 * "TypeScript5 binaryexpression is not evaluated", and invalid syntax `ValueError`, as in every dialect. A term of a
 * dialect of its family it reads, `TypeScript Types`' or `TypeScript Patterns`', none of whose kinds is evaluated, is
 * refused by the name of the dialect that owns it, as the framework's interpreter refuses it: "TypeScript Types
 * tsuniontype is not evaluated" (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Stage 6 extends no evaluator"); a literal
 * a type holds is TypeScript5's, and evaluates as one.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
