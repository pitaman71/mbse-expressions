/** The SystemVerilog dialect: expressions and constraints of SystemVerilog over its 4-state and 2-state vectors and
 * reals, rendered as SystemVerilog source and evaluated by IEEE 1800's rules. `install` adds its kinds to the
 * framework's terms; `define` writes its domains, IEEE 1800's built-in types, which its folding rules, inference and
 * validation read through a term's holder. See mbse-basis
 * [CAP-100: six languages' expression dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md). */

export * as Domains from "./Domains.js";
export * as Expressions from "./Expressions.js";
export * as Simplifiers from "./Simplifiers.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
