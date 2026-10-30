/** The Matlab dialect: MATLAB expressions over scalars and structs, evaluated by MATLAB's rules. `install` adds its
 * kinds to the framework's terms. See mbse-basis
 * [CAP-100: six languages' expression dialects](../../../../../mbse-basis/docs/capabilities/CAP-100.md). */

export * as Domains from "./Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { install } from "./Expressions.js";
