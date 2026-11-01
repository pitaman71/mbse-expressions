/** The Basic dialect: literals, calls, variables, lets and quantifiers over the core vocabulary, with three-valued
 * evaluation. It is the neutral form of every constraint. `install` adds its kinds to the framework's terms, its
 * dialect and its operations; `define` writes its dialect's data, its operations by name and the domains it owns. See
 * mbse-basis [CAP-095: Basic terms as data](../../../../../mbse-basis/docs/capabilities/CAP-095.md). */

export * as Domains from "./Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Ieee754 from "./Ieee754.js";
export * as Partials from "./Partials.js";
export { define, install } from "./Expressions.js";
