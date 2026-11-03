/** Patterns <-> Cpp: the rules of Patterns <-> C (`Patterns_C.RULES`), over the kinds C++ shares with C, applied to
 * C++'s terms. A let is inlined; C++ has no `has`, and no container constructor here. */

import { DIALECT as CPP } from "../Dialects/Cpp/Expressions.js";
import { DIALECT as PATTERNS } from "../Dialects/Patterns/Expressions.js";
import { Pairwise } from "../Framework/Translators.js";
import { RULES } from "./Patterns_C.js";

export { RULES };

export const TRANSLATOR = new Pairwise(PATTERNS, CPP, RULES);
