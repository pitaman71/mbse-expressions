/**
 * Evaluators of the TypeScript5 dialect: a literal's value, and nothing else yet.
 *
 * The dialects proposal decided a shallow evaluator (its Decided, 8): a new kind is refused by evaluation by name. The
 * framework's interpreter evaluates a literal by its role, its `value` (a boolean, a number, a bigint or a string), and
 * `EVALUATED` names that kind alone: every other kind, `constant` among them, raises `NotImplementedError`,
 * "TypeScript5 binaryexpression is not evaluated", and invalid syntax `ValueError`, as in every dialect. A term of a
 * dialect of its family it reads, `TypeScript Types`' or `TypeScript Patterns`', none of whose kinds is evaluated, is
 * refused by that dialect's name: "TypeScript Types tsuniontype is not evaluated" (the dialects proposal, Retrofit's
 * design: "Evaluation keeps what it does").
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as F from "../../Framework/Evaluators.js";
import type { Bindings, Scope } from "../../Framework/Symbolics.js";
import * as Terms from "../../Framework/Terms.js";
import * as T from "./Expressions.js";

/** The kinds evaluated: a literal, by its value. */
export const EVALUATED: ReadonlySet<string> = new Set([T.LITERAL]);

/** TypeScript5's interpreter, which refuses a term of a dialect of its family by that dialect's name. */
class Interpreter extends F.Interpreter {
  override evaluate(node: any, scope: Scope): any {
    const union = Terms.dialectOf(node);
    const reader = this.dialect.reads().find((dialect) => dialect.union === union);
    if (reader !== undefined) { // none of its kinds is evaluated
      return new F.Interpreter(reader, new Map(), { evaluated: new Set() }).evaluate(node, scope);
    }
    return super.evaluate(node, scope);
  }
}

export const INTERPRETER: F.Interpreter = new Interpreter(T.DIALECT, new Map(), { evaluated: EVALUATED });

/** The value of a TypeScript5 term (or anything `Terms.term` reads one from): a literal's value; any other kind is
 * refused by name. */
export function OfAny(expression: unknown, scope: Scope | Bindings = {}): unknown {
  return INTERPRETER.run(expression, scope);
}
