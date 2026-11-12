/** The Cpp RegExp dialect, `Expressions.Cpp.RegExp`, of the Cpp family: the regular expressions `std::regex` reads
 * (ISO/IEC 14882, [re.grammar] and [re.synopt]), in each of the six grammars its `syntax_option_type` selects.
 * `install` adds its union of its kinds to the framework's terms; `define` writes the editions it covers; `Text` writes
 * its terms as a pattern of their grammar. */

export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
