/**
 * Simplifiers of the TypeScript5 dialect: a literal's value, and nothing else folded yet.
 *
 * Shallow rules were decided (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "A shallow evaluator"): a new kind stays in the residual,
 * named. The framework's interpreter folds a literal by its role, its `value` (a boolean, a number, a bigint or a
 * string), and `FOLDED` names that kind alone: every other kind, `constant` among them, stays in the residual, its
 * subterms simplified in turn, "TypeScript5 binaryexpression is not simplified", as does invalid syntax, as in every
 * dialect. A term of a dialect of its family it reads, `TypeScript Types`' or `TypeScript Patterns`', none of whose kinds
 * is folded, is named by the dialect that owns it: "TypeScript Types tsuniontype is not simplified" (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Stage 6 extends no evaluator"); a
 * literal a type holds is TypeScript5's, and folds as one. `CATEGORIES` gives each the evaluation inventory's class.
 */

import * as F from "../../Framework/Simplifiers.js";
import type { Bindings, Scope } from "../../Framework/Symbolics.js";
import * as T from "./Expressions.js";

/** The kinds folded: a literal, by its value. */
export const FOLDED: ReadonlySet<string> = new Set([T.LITERAL]);

/** The evaluation inventory's class of what each dialect of the family has no rule for (`a` where none is given). */
export const CATEGORIES: Record<string, Record<string, string>> = {
  TypeScript5: {
    tsemptybodyfunctionexpression: "b", jsxelement: "b", jsxfragment: "b", jsxemptyexpression: "b",
    ...Object.fromEntries(["functionexpression", "classexpression", "super", "privateidentifier", "metaproperty",
      "awaitexpression", "yieldexpression", "importexpression", "assignmentexpression", "updateexpression"]
      .map((kind) => [kind, "d"])),
  },
  "TypeScript Types": { "*": "b" }, "TypeScript Patterns": { "*": "b" }, "TypeScript RegExp": { "*": "b" },
};

/** The folding rules of the TypeScript5 dialect. */
export const RULES: F.Interpreter = new F.Interpreter(T.DIALECT, new Map(), { folded: FOLDED });

/** The simplifier of the TypeScript5 dialect. */
export const SIMPLIFIER = new F.Simplifier(RULES, { literal: F.natives(T.DIALECT), categories: CATEGORIES });

/** The simplification of a TypeScript5 term: a literal's value; any other kind stays, named. */
export function OfAny(expression: unknown, scope: Scope | Bindings = {}): F.Simplified {
  return SIMPLIFIER.run(expression, scope);
}
