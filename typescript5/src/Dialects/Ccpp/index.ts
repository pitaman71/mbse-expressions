/** The Ccpp dialect: expressions of C and C++ over their arithmetic types, under the LP64 data model, rendered as C
 * source and evaluated by C's rules. `install` adds its kinds to the framework's terms. See
 * ../../../../docs/EXPRESSIONS.md. */

export * as Domains from "./Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { install } from "./Expressions.js";
