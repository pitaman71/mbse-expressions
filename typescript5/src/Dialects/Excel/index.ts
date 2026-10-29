/** The Excel dialect: worksheet formulas, evaluated by Excel's rules, errors as values included. `install` adds its
 * kinds to the framework's terms. See ../../../../docs/EXPRESSIONS.md. */

export * as Domains from "./Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { install } from "./Expressions.js";
