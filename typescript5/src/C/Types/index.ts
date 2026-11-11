/** The C Types dialect, `Expressions.C.Types`, of the C family: C's type names, a grammar of their own (ISO/IEC 9899,
 * 6.7.7 in C11, "Type names"), and an enumeration's enumerators. `install` adds its union of its kinds to the framework's
 * terms; `define` writes the editions it covers; `Text` writes its terms as C source. */

export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
