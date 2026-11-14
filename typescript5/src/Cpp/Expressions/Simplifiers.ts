/** Simplifiers of the Cpp dialect: simplify an expression by C++'s rules for arithmetic types, which are C's for its
 * kinds (see `C/Simplifiers`), a name used as an expression an `idexpression` holding its identifier (`FOLDED`):
 * `Simplifiers.OfAny(term, scope)` simplifies a term value in a `new Scope(variables, functions)`. */

import { CATEGORIES as C_CATEGORIES, FOLDED as C_FOLDED, Scope, simplifier } from "../../C/Expressions/Simplifiers.js";
import type * as F from "../../Framework/Simplifiers.js";
import type * as S from "../../Framework/Symbolics.js";
import * as Expressions from "./Expressions.js";

export { Scope };

/** The kinds C++'s rules fold: C's, a name used as an expression an `idexpression`, as C++'s grammar makes it. */
export const FOLDED: ReadonlySet<string> = new Set([...[...C_FOLDED].filter((tag) => tag !== "variable"),
  Expressions.IDEXPRESSION]);

/** The evaluation inventory's class of what each dialect C++ reads has no rule for (`a` where none is given). */
export const CATEGORIES: Record<string, Record<string, string>> = {
  ...C_CATEGORIES,
  Cpp: {
    ...C_CATEGORIES["C"], initializerlist: "b", designatedinitializer: "b", requiresexpression: "c", typeidexpression: "c",
    ...Object.fromEntries(["lambdaexpression", "newexpression", "deleteexpression", "noexceptexpression",
      "awaitexpression", "yieldexpression", "statementexpression", "assignmentexpression", "postfixexpression",
      "binaryexpression '.*'", "binaryexpression '->*'", "memberexpression of a member that is not an identifier",
      "subscriptexpression of several indices"].map((what) => [what, "d"])),
  },
  "Cpp Types": { "*": "b" }, "Cpp RegExp": { "*": "b" },
};

/** The simplifier of the Cpp dialect; its values carry their C++ types, its residual's literals theirs. */
export const SIMPLIFIER = simplifier(Expressions.DIALECT, FOLDED, CATEGORIES, Expressions.literal);

/** The simplification of a term in `scope`, or with the variables in an object bound. */
export function OfAny(expression: unknown, scope: Scope | S.Bindings = {}): F.Simplified {
  return SIMPLIFIER.run(expression, scope);
}
