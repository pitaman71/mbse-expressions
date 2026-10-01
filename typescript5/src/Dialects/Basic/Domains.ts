/**
 * Domains of the Basic dialect: the values its core operations take and give.
 *
 * The values are mbse-schemas' natives, each its own domain (`Bool`, `Int`, `Float`, `Str`, `Bytes`; a bool is not an
 * int), and objects (`Object`): anything that writes its properties through `accept`, including expressions and
 * value objects. `Anything` is the domain of a value not known statically, such as a property read with `get`.
 * Unknown (`null`) is not a domain: any value may be unknown at run time.
 *
 * `SIGNATURES` gives each core operation's signature, following the evaluator's rules: comparisons take two values of
 * one domain, ordered only for int, float, str and bytes; logic takes bools; arithmetic takes two numbers of one type
 * and gives that type.
 */

import { Repr } from "@mbse/schemas/Framework";

import * as D from "../../Framework/Domains.js";

export const Anything = D.Anything;
export const Bool = new D.OfTypes("bool", Boolean);
export const Int = new D.OfTypes("int", BigInt);
export const Float = new D.OfTypes("float", Number);
export const Str = new D.OfTypes("str", String);
export const Bytes = new D.OfTypes("bytes", Uint8Array);
const ObjectDomain = new D.OfValues("object", (value) =>
  value !== null && typeof value === "object" && typeof (value as { accept?: unknown }).accept === "function");
export { ObjectDomain as Object };

const COMPARABLE = [Bool, Int, Float, Str, Bytes, ObjectDomain];
const ORDERED = [Int, Float, Str, Bytes];
const NUMBERS = [Int, Float];
const LOGIC = new D.Function([Bool, Bool], Bool);

/** The core operations' signatures. */
export const SIGNATURES: ReadonlyMap<string, D.Signature> = new Map<string, D.Signature>([
  ["get", new D.Function([ObjectDomain, Str], Anything)], ["has", new D.Function([ObjectDomain, Str], Bool)],
  ...["eq", "ne"].map((name) => [name, new D.Same(2, COMPARABLE, Bool)] as [string, D.Signature]),
  ...["lt", "le", "gt", "ge"].map((name) => [name, new D.Same(2, ORDERED, Bool)] as [string, D.Signature]),
  ["and", LOGIC], ["or", LOGIC], ["not", new D.Function([Bool], Bool)], ["implies", LOGIC],
  ...["add", "sub", "mul"].map((name) => [name, new D.Same(2, NUMBERS)] as [string, D.Signature]),
  ["neg", new D.Same(1, NUMBERS)],
]);

const NATIVES: ReadonlyMap<string, D.Domain> = new Map([
  ["bool", Bool], ["int", Int], ["float", Float], ["str", Str], ["bytes", Bytes],
]);

/** The domain of a value: its native type's, or `Object`. */
export function of(value: unknown): D.Domain {
  const native = NATIVES.get(Repr.typeName(value));
  if (native !== undefined && native.contains(value)) return native;
  if (ObjectDomain.contains(value)) return ObjectDomain;
  throw new TypeError(`a ${Repr.typeName(value)} is not a value of the Basic dialect`);
}
