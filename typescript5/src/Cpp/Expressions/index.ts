/** The Cpp dialect: every expression of C++, C++17 to C++23, as mbse-programs has them, with the sublanguages they
 * hold, rendered as C++ source and, for its arithmetic types, evaluated by its rules under the ABI its holder names. It
 * defines its own copies of the kinds it shares with the C dialect, and shares with it the code that reads its types
 * (`Domains`, C's), their evaluation and their source text. `install` adds its union to the framework's terms; `define`
 * writes its domains, the types C++'s standard fixes, which it reads with its holder's ABI dialect's. See mbse-basis
 * [CAP-230: the C++ expression dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md). */

export * as Domains from "../../C/Expressions/Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
