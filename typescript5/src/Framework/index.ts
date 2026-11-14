/** The framework every dialect implements: the schemas of terms and expressions, and their generic reads (`Terms`), *
their names and scopes (`Symbolics`), the data objects they read (`Objects`), their domains, the standards * dialects
cover (`Standards`), evaluation and translation, and the machinery that implements them. `install` defines the
framework's schemas in a store. See * mbse-basis [CAP-098: dialects over one
framework](mbse:mbse-basis/docs/capabilities/CAP-098.md). */

export * as Domains from "./Domains.js";
export * as Errors from "./Errors.js";
export * as Objects from "./Objects.js";
export * as Simplifiers from "./Simplifiers.js";
export * as Standards from "./Standards.js";
export * as Symbolics from "./Symbolics.js";
export * as Terms from "./Terms.js";
export * as Translators from "./Translators.js";
export { install } from "./Terms.js";
