/**
 * The AAPCS64 dialect: the domains of AAPCS64, the Procedure Call Standard for the Arm 64-bit Architecture (AArch64),
 * its LP64 data model, the C and C++ types their standards leave to the implementation. `install` adds its dialect and
 * its domains' schemas; `define` writes its domains. It has no terms: an expression whose C or C++ terms are read under
 * this ABI names it as its `abi`. See mbse-basis
 * [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).
 */

export * as Expressions from "./Expressions.js";
export { define, install } from "./Expressions.js";
