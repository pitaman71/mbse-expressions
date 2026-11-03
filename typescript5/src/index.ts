/** mbse-expressions: constraints as neutral, language-independent data.
 *
 * Expression languages (dialects) that are serializable, traversable, validatable, evaluatable and translatable into
 * each other. See mbse-basis [FEA-024: expressions as data](mbse:mbse-basis/docs/features/FEA-024.md).
 *
 * For AI agents: read `skill/SKILL.md` at the root of this package first. It says when to use this package, the
 * practices that prevent most mistakes, and which reference to load for a task.
 *
 * `Expressions`, `Evaluators`, `Domains` and `Partials` are the Patterns dialect's (formerly Basic), the neutral form of
 * every constraint. The framework is `@mbse/expressions/Framework`, the dialects are under `@mbse/expressions/Dialects/<name>`, and the
 * translators between them are `@mbse/expressions/Translators`. Expressions are stored in an mbse-schemas store, whose
 * schemas `Framework.install` and each dialect's `install` define (docs/proposals/port/API.md). */

export * as Domains from "./Dialects/Patterns/Domains.js";
export * as Evaluators from "./Dialects/Patterns/Evaluators.js";
export * as Expressions from "./Dialects/Patterns/Expressions.js";
export * as Framework from "./Framework/index.js";
export * as Partials from "./Dialects/Patterns/Partials.js";
