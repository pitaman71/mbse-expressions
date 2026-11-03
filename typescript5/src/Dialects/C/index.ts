/** The C dialect: expressions of C, C11 to C23, over its arithmetic types, under the LP64 data model, rendered as C
 * source and evaluated by C's rules. `install` adds its union to the framework's terms; `Cpp`, the C++ dialect, shares
 * its kinds. See mbse-basis [CAP-100: six languages' expression dialects](../../../../../mbse-basis/docs/capabilities/CAP-100.md)
 * and [CAP-229: the C expression dialect](../../../../../mbse-basis/docs/capabilities/CAP-229.md). */

export * as Domains from "./Domains.js";
export * as Evaluators from "./Evaluators.js";
export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { install } from "./Expressions.js";
