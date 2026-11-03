/** The Cpp dialect: expressions of C++, C++17 to C++23, over its arithmetic types, under the LP64 data model, rendered
 * as C++ source and evaluated by its rules. Today it has C's kinds, which it shares with the C dialect: their schemas,
 * their domains (`Domains`, C's), their evaluation and their source text. `install` adds its union to the framework's
 * terms, after C's install. See mbse-basis
 * [CAP-230: the C++ expression dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md). */

export * as Domains from "../C/Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { install } from "./Expressions.js";
