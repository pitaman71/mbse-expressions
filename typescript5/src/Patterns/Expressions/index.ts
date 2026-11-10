/** The Patterns dialect: literals, calls, variables, lets and quantifiers over the core vocabulary, with three-valued
 * evaluation; every binding evaluates it. `install` adds its kinds to the framework's terms, its dialect and its
 * operations; `define` writes its dialect's data, its operations by name. It owns no domains: the
 * kinds and the domains its values take are the standard dialects' (`@mbse/expressions/ISOIEC11404/Expressions` and
 * the others). See mbse-basis [CAP-095: Basic terms as data](mbse:mbse-basis/docs/capabilities/CAP-095.md). */

export * as Domains from "./Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Ieee754 from "./Ieee754.js";
export * as Partials from "./Partials.js";
export { define, install } from "./Expressions.js";
