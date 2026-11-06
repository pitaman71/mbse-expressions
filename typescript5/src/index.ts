/** mbse-expressions: constraints as neutral, language-independent data.
 *
 * Expression languages (dialects) that are serializable, traversable, validatable, evaluatable and translatable into
 * each other. See mbse-basis [FEA-024: expressions as data](mbse:mbse-basis/docs/features/FEA-024.md).
 *
 * For AI agents: read `skill/SKILL.md` at the root of this package first. It says when to use this package, the
 * practices that prevent most mistakes, and which reference to load for a task.
 *
 * `Expressions`, `Evaluators`, `Domains` and `Partials` are the Patterns dialect's (formerly Basic), the neutral form of
 * every constraint. The framework is `@mbse/expressions/Framework`, each dialect is under its family, at
 * `@mbse/expressions/<Family>/<Dialect>` (`@mbse/expressions/Framework/Patterns`, `@mbse/expressions/Python/Python3`,
 * `@mbse/expressions/C/Expressions`), and the translators between them are `@mbse/expressions/Translators`. The kinds
 * of value domain and the domains are the standard dialects' (`@mbse/expressions/ISOIEC11404/Expressions`,
 * `IEEE754/Expressions`, `IEEE1164/Expressions` and `Unicode/Expressions`), installed after the framework and before
 * the dialects that use them. Expressions are stored in an mbse-schemas store, whose
 * schemas `Framework.install` and each dialect's `install` define (docs/proposals/port/API.md). */

export * as Domains from "./Framework/Patterns/Domains.js";
export * as Evaluators from "./Framework/Patterns/Evaluators.js";
export * as Expressions from "./Framework/Patterns/Expressions.js";
export * as Framework from "./Framework/index.js";
export * as Partials from "./Framework/Patterns/Partials.js";
