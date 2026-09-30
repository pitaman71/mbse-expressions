/**
 * Domains of the Latex dialect: the values mathematical notation writes about.
 *
 * `Number` holds numbers (int or float), `Text` holds text (`\text{...}`), and `Truth` holds truth values. What a
 * member or a function gives is `Anything`: notation does not say.
 */

import { Repr } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";

export const Anything = D.Anything;
const NumberDomain = new D.OfTypes("number", BigInt, Number);
export { NumberDomain as Number };
export const Text = new D.OfTypes("text", String);
export const Truth = new D.OfTypes("truth", Boolean);

const COMPARE = new D.Function([Anything, Anything], Truth);
const LOGIC = new D.Function([Truth, Truth], Truth);
const ARITHMETIC = new D.Function([NumberDomain, NumberDomain], NumberDomain);

type Entry = [string, D.Signature];

/** The binary operators, by their LaTeX. */
export const BINARY: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ...["=", "\\neq", "<", "\\leq", ">", "\\geq"].map((operator) => [operator, COMPARE] as Entry),
  ["\\land", LOGIC], ["\\lor", LOGIC], ["\\implies", LOGIC],
  ...["+", "-", "\\cdot"].map((operator) => [operator, ARITHMETIC] as Entry),
]);

/** The unary operators, by their LaTeX. */
export const UNARY: ReadonlyMap<string, D.Signature> = new Map([
  ["\\lnot", new D.Function([Truth], Truth)], ["-", new D.Function([NumberDomain], NumberDomain)],
]);

/** The named functions (`\operatorname{has}`): whether a value has a member. */
export const FUNCTIONS: ReadonlyMap<string, D.Signature> = new Map([["has", new D.Function([Anything, Text], Truth)]]);

/** A member of a value: `x.\mathit{age}`. */
export const MEMBER = new D.Function([Anything], Anything);

/** A fraction. */
export const FRAC = new D.Function([NumberDomain, NumberDomain], NumberDomain);

const NATIVES: ReadonlyMap<string, D.Domain> = new Map([
  ["bool", Truth], ["int", NumberDomain], ["float", NumberDomain], ["str", Text],
]);

/** The domain of a constant. */
export function of(value: unknown): D.Domain {
  return NATIVES.get(Repr.typeName(value)) as D.Domain;
}
