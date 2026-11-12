/** The Python RegExp dialect, `Expressions.Python.RegExp`, of the Python family: the regular expressions of Python's `re`
 * module (the Library Reference, "Regular Expression Syntax"). `install` adds its union of its kinds to the framework's
 * terms; `define` writes the versions it covers. */

export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
