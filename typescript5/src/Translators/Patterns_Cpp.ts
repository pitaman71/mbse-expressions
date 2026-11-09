/** Patterns <-> Cpp: the rules of Patterns <-> C (`Patterns_C.RULES`), over the kinds C++ shares with C, applied to
 * C++'s terms, but for a name used as an expression, which C++'s grammar makes an `idexpression` holding its identifier
 * (a Patterns variable `x` is C++'s `x`, its `Name` an identifier); and C++'s string: a literal's quote is not C++'s
 * spelling, since `'a'` is a `char` there, so a string written with its `"` translates back as a Patterns string, and a
 * character, of a type of its own, has no Patterns counterpart. A let is inlined; C++ has no `has` here (planned:
 * mbse-basis [CAP-235: `has` translated to C++](mbse:mbse-basis/docs/capabilities/CAP-235.md)), and no container
 * constructor. */

import { DIALECT as CPP } from "../Cpp/Expressions/Expressions.js";
import { DIALECT as PATTERNS } from "../Patterns/Expressions/Expressions.js";
import { Inline, Pairwise, Rule } from "../Framework/Translators.js";
import { CFamily, Patterns, value } from "./_Patterns.js";
import { IDENTIFIER, RULES as C_RULES } from "./Patterns_C.js";

/** The rules between Patterns and C++: C's, a name used as an expression an `idexpression` holding its identifier, and
 * a string written with its quote. */
export const RULES: readonly (Rule | Inline)[] = [
  ...C_RULES.map((rule) => (rule === IDENTIFIER ? new Rule(Patterns.variable, CFamily.idexpression) : rule)),
  new Rule(Patterns.literal(value(String)), CFamily.string, "backward")];

export const TRANSLATOR = new Pairwise(PATTERNS, CPP, RULES);
