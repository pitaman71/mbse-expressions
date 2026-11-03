/**
 * Domains of the TypeScript5 dialect: JavaScript's values, by type, as a literal holds them.
 *
 * `Boolean`, `Number`, `BigInt` and `String` are a literal's: a number is a float (IEEE 754 binary64, as JavaScript's
 * numbers are) and a bigint an int. `Null` and `RegExp` are the domains of TypeScript5's own constants, `null` and a
 * regular expression. Anything else is `Anything`: the dialect has no evaluator beyond its literals, so its operators'
 * signatures (`UNARY`, `UPDATE`, `BINARY`, `LOGICAL`, `ASSIGNMENT`, by mbse-programs' operators) say only how many
 * operands each takes.
 */

import * as D from "../../Framework/Domains.js";

export const Anything = D.Anything;
export const Boolean_ = new D.OfTypes("boolean", Boolean);
export const Number_ = new D.OfTypes("number", Number);
export const BigInt_ = new D.OfTypes("bigint", BigInt);
export const String_ = new D.OfTypes("string", String);
export { Boolean_ as Boolean, Number_ as Number, BigInt_ as BigInt, String_ as String };
export const Null = new D.OfTypes("null", null);
export const RegExp_ = new D.OfTypes("RegExp", RegExp);
export { RegExp_ as RegExp };

const ONE = new D.Function([Anything], Anything);
const TWO = new D.Function([Anything, Anything], Anything);

/** The unary operators. */
export const UNARY: ReadonlyMap<string, D.Signature> = new Map(
  ["-", "+", "!", "~", "typeof", "void", "delete"].map((operator) => [operator, ONE]));

/** The update operators, prefix or postfix. */
export const UPDATE: ReadonlyMap<string, D.Signature> = new Map(["++", "--"].map((operator) => [operator, ONE]));

/** The binary operators, relations and membership among them. */
export const BINARY: ReadonlyMap<string, D.Signature> = new Map([
  "==", "!=", "===", "!==", "<", "<=", ">", ">=", "<<", ">>", ">>>", "+", "-", "*", "/", "%", "**", "|", "^", "&",
  "in", "instanceof"].map((operator) => [operator, TWO]));

/** The logical operators. */
export const LOGICAL: ReadonlyMap<string, D.Signature> = new Map(["&&", "||", "??"].map((operator) => [operator, TWO]));

/** The assignment operators: a target's terms are its arguments too, so any number of them. */
export const ASSIGNMENT: ReadonlyMap<string, D.Signature> = new Map([
  "=", "+=", "-=", "*=", "/=", "%=", "**=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "&&=", "||=", "??="].map(
  (operator) => [operator, new D.Opaque()]));

/** The domain of a literal's value. */
export function of(value: unknown): D.Domain {
  switch (typeof value) {
    case "boolean": return Boolean_;
    case "number": return Number_;
    case "bigint": return BigInt_;
    default: return String_;
  }
}

/** The domain of TypeScript5's own constant, by its attributes: `null`'s or a regular expression's. */
export function constant(attributes: ReadonlyMap<string, unknown>): D.Domain {
  return attributes.get("singleton") === "null" ? Null : RegExp_;
}
