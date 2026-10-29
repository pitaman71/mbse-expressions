/** The Latex dialect: mathematical notation in LaTeX's math mode, rendered, validated and translated; it has no
 * evaluator. `install` adds its kinds to the framework's terms. */

export * as Domains from "./Domains.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { install } from "./Expressions.js";
