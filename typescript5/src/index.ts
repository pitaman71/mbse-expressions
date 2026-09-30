/** Expressions for mbse-schemas: expression languages (dialects) that are serializable, traversable, validatable,
 * evaluatable and translatable into each other. See ../../docs/EXPRESSIONS.md.
 *
 * `Expressions` and `Evaluators` are the Basic dialect's, the one mbse-schemas' union predicates are written in. The
 * framework is `@mbse/expressions/Framework`, the dialects are under `@mbse/expressions/Dialects/<name>`, and the
 * translators between them are `@mbse/expressions/Translators`. */

export * as Evaluators from "./Dialects/Basic/Evaluators.js";
export * as Expressions from "./Dialects/Basic/Expressions.js";
