/** The Python3 dialect: Python expressions and the imports they need, evaluated by Python's rules in a scope that
 * allowlists what they may import and call. `install` adds its kinds to the framework's terms, its kinds of domain and
 * its domains' schemas; `define` writes its domains. */

export * as Domains from "./Domains.js";
export * as Expressions from "./Expressions.js";
export * as Simplifiers from "./Simplifiers.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
