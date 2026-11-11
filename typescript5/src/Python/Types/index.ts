/** The Python Types dialect, `Expressions.Python.Types`, of the Python family: Python's type expressions, as the typing
 * specification defines them (typing.python.org, "Type annotations"), and its type parameter lists (the Language
 * Reference, 8.11). `install` adds its union of its kinds to the framework's terms; `define` writes the versions it
 * covers. */

export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
