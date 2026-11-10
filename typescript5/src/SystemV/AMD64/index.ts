/**
 * The AMD64 dialect: the domains of the System V ABI's AMD64 Architecture Processor Supplement, x86-64's, its LP64
 * programming model, the C and C++ types their standards leave to the implementation. `install` adds its dialect and
 * its domains' schemas; `define` writes its domains. It has no terms: an expression whose C or C++ terms are read under
 * this ABI names it as its `abi`. See mbse-basis
 * [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).
 */

export * as Expressions from "./Expressions.js";
export { define, install } from "./Expressions.js";
