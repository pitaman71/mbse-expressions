/** Patterns <-> Cpp: the rules of Patterns <-> C (`Patterns_C.RULES`), over the kinds C++ shares with C, applied to
 * C++'s terms, and C++'s string: a literal's quote is not C++'s spelling, since `'a'` is a `char` there, so a string
 * written with its `"` translates back as a Patterns string, and a character, of a type of its own, has no Patterns
 * counterpart. A let is inlined; C++ has no `has` here (planned: mbse-basis
 * [CAP-235: `has` translated to C++](mbse:mbse-basis/docs/capabilities/CAP-235.md)), and no container constructor. */

import { DIALECT as CPP } from "../Dialects/Cpp/Expressions.js";
import { DIALECT as PATTERNS } from "../Dialects/Patterns/Expressions.js";
import { Inline, Pairwise, Rule } from "../Framework/Translators.js";
import { CFamily, Patterns, value } from "./_Patterns.js";
import { RULES as C_RULES } from "./Patterns_C.js";

/** The rules between Patterns and C++: C's, and a string written with its quote. */
export const RULES: readonly (Rule | Inline)[] = [...C_RULES, new Rule(Patterns.literal(value(String)), CFamily.string, "backward")];

export const TRANSLATOR = new Pairwise(PATTERNS, CPP, RULES);
