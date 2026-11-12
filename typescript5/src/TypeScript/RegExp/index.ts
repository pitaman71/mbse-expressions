/** The TypeScript RegExp dialect, `Expressions.TypeScript.RegExp`, of the TypeScript family: ECMA-262's regular
 * expressions (22.2.1, "Patterns"), the sublanguage a regular expression literal holds (12.9.5), as regexpp reads it,
 * which `TypeScript5`'s `constant` holds beside its spelling. `install` adds its union of its kinds to the framework's
 * terms; `define` writes the editions of ECMA-262 it covers. */

export * as Expressions from "./Expressions.js";
export * as Text from "./Text.js";
export { define, install } from "./Expressions.js";
