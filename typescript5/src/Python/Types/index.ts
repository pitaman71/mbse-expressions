/** The Python Types dialect, `Expressions.Python.Types`, of the Python family: Python's type expressions, as the typing
 * specification defines them (typing.python.org, "Type annotations"), and its type parameter lists (the Language
 * Reference, 8.11). `install` adds its union of its kinds to the framework's terms; `define` writes its dialect's data.
 * A skeleton, its kinds to come (the dialects proposal, Retrofit's design). */

export * as Expressions from "./Expressions.js";
export { define, install } from "./Expressions.js";
