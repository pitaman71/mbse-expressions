/** The framework every dialect implements: the schemas of terms and expressions, and their generic reads (`Terms`),
 * their names and scopes (`Symbolics`), the data objects they read (`Objects`), their domains, evaluation and
 * translation, and the machinery that implements them. `install` defines the framework's schemas in a store. See
 * mbse-basis [CAP-098: dialects over one framework](../../../../mbse-basis/docs/capabilities/CAP-098.md). */

export * as Domains from "./Domains.js";
export * as Errors from "./Errors.js";
export * as Evaluators from "./Evaluators.js";
export * as Objects from "./Objects.js";
export * as Partials from "./Partials.js";
export * as Symbolics from "./Symbolics.js";
export * as Terms from "./Terms.js";
export * as Translators from "./Translators.js";
export { install } from "./Terms.js";
