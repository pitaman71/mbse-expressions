/** Patterns <-> Cpp: the rules of Patterns <-> C (`Patterns_C.rules`), over the kinds C++ shares with C, applied to
 * C++'s terms, a member's name an identifier (`Name`). A let is inlined; C++ has no `has` here (planned: mbse-basis
 * [CAP-235: `has` translated to C++](mbse:mbse-basis/docs/capabilities/CAP-235.md)), and no container constructor. */

import { DIALECT as CPP } from "../Dialects/Cpp/Expressions.js";
import { DIALECT as PATTERNS } from "../Dialects/Patterns/Expressions.js";
import { Part } from "../Framework/Terms.js";
import { Pairwise } from "../Framework/Translators.js";
import { K } from "./_Patterns.js";
import { rules } from "./Patterns_C.js";

/** The rules between Patterns and C++, whose member's name is an identifier. */
export const RULES = rules(new Part("identifier", { spelling: K }, 0));

export const TRANSLATOR = new Pairwise(PATTERNS, CPP, RULES);
