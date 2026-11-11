/** The SystemVerilog Types dialect, `Expressions.SystemVerilog.Types`, of the SystemVerilog family: `install` adds its
 * union of its kinds to the framework's terms; `define` writes the editions it covers. See mbse-basis
 * [CAP-231: the SystemVerilog expression dialect, complete](mbse:mbse-basis/docs/capabilities/CAP-231.md). */

export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
