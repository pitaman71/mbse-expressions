/** The TypeScript5 dialect: every expression of TypeScript 5, 5.0 to 5.9, with its types, destructuring patterns and
 * JSX, printed as TypeScript writes it and evaluated no further than its literals. `install` adds its kinds to the
 * framework's terms. */

export * as Domains from "./Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { install } from "./Expressions.js";
