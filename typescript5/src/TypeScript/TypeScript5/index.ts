/** The TypeScript5 dialect: every expression of TypeScript 5, 5.0 to 5.9, with its types, destructuring patterns and
 * JSX, printed as TypeScript writes it and simplified by ECMAScript's semantics (`Abstract`, its values and abstract
 * operations). `install` adds its kinds to the framework's terms, its kinds of domain and its domains' schemas;
 * `define` writes its domains. */

export * as Abstract from "./Abstract.js";
export * as Domains from "./Domains.js";
export * as Expressions from "./Expressions.js";
export * as Simplifiers from "./Simplifiers.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
