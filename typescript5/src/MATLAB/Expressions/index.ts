/** The MATLAB dialect: MATLAB expressions over scalars and structs, evaluated by MATLAB's rules. `install` adds its
 * kinds to the framework's terms, its kind of domain and its domains' schemas; `define` writes its domains. See mbse-basis
 * [CAP-100: six languages' expression dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md). */

export * as Domains from "./Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
