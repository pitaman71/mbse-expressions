/**
 * The IEEE 1164 dialect: the kind of domain of IEEE Std 1164-1993, VHDL's nine-valued logic, and the domain it
 * defines. `install` adds its kind of domain, its domain's schema and its dialect; `define` writes its domain. It has
 * no terms. See mbse-basis
 * [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).
 */

export * as Expressions from "./Expressions.js";
export { STANDARDS, define, install } from "./Expressions.js";
