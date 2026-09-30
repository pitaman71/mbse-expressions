/** mbse-expressions: rules, predicates and constraints as neutral, language-independent data.
 *
 * Expression languages (dialects) that are serializable, traversable, validatable, evaluatable and translatable into
 * each other. See docs/EXPRESSIONS.md at https://github.com/pitaman71/mbse-expressions.
 *
 * For AI agents: read `skill/SKILL.md` at the root of this package first. It says when to use this package, the rules
 * that prevent most mistakes, and which reference to load for a task.
 *
 * `Expressions` and `Evaluators` are the Basic dialect's, the one mbse-schemas' union predicates are written in. The
 * framework is `@mbse/expressions/Framework`, the dialects are under `@mbse/expressions/Dialects/<name>`, and the
 * translators between them are `@mbse/expressions/Translators`. */

export * as Evaluators from "./Dialects/Basic/Evaluators.js";
export * as Expressions from "./Dialects/Basic/Expressions.js";
