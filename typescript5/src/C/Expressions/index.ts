/** The C dialect: every expression of C, C11 to C23, as mbse-programs has them, with the type names they hold, rendered
 * as C source and, for its arithmetic types, evaluated by C's rules under the ABI its holder names. `install` adds its
 * union to the framework's terms; `define` writes its domains, the types C's standard fixes, which its evaluation,
 * inference and validation read through a term's holder, with the ABI dialect's the holder names (`SystemV/AMD64`,
 * `Arm/AAPCS64`); `Cpp`, the C++ dialect, defines its own copies of the kinds they share, and shares the code that
 * reads and writes them. See mbse-basis [CAP-229: the C expression
 * dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md) and [CAP-100: six languages' expression
 * dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md). */

export * as Domains from "./Domains.js";
export * as Expressions from "./Expressions.js";
export * as Simplifiers from "./Simplifiers.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
