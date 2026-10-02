/** Basic <-> Ccpp. Basic operations are C's operators, `get` a member (`x.name`), and `implies(a, b)` is written
 * `!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's translated
 * value is shared by every use of its name. C has no `has`.
 *
 * A typed C constant is a Basic literal of a value domain: an integer type the `Integer` domain of its width and
 * signedness, which C writes with `<stdint.h>`'s names (`uint8_t`), and a floating type the binary IEEE 754 format it
 * has (`float`, `double`, `long double`). A `bool` constant is a bool. Other domains, integers of other widths or
 * another overflow rule, and other formats or roundings have no C counterpart. */

import * as D from "../Dialects/Basic/Domains.js";
import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { TYPES } from "../Dialects/Ccpp/Domains.js";
import { DIALECT as CCPP } from "../Dialects/Ccpp/Expressions.js";
import { Convert, Inline, Pairwise, Rule, renames } from "../Framework/Translators.js";
import type { Attributes } from "../Framework/Translators.js";
import { Basic, Ccpp, value } from "./_Patterns.js";

const FLOATS: Record<string, string> = { binary32: "float", binary64: "double", binary128: "long double" };

/** A typed Basic literal's C constant. */
function toC(attributes: Attributes): Attributes | null {
  const domain = attributes.domain;
  let typed: string | null = null;
  if (domain instanceof D.OfInteger.Data && [8n, 16n, 32n, 64n].includes(domain.width as bigint) && domain.overflow === "raise") {
    typed = `${domain.signed ? "" : "u"}int${domain.width}_t`;
  } else if (domain instanceof D.OfIeee754.Data && domain.format in FLOATS && domain.rounding === "roundTiesToEven") {
    typed = FLOATS[domain.format] as string;
  }
  return typed === null ? null : { value: attributes.value, type: typed };
}

/** A typed C constant's Basic literal. */
function fromC(attributes: Attributes): Attributes | null {
  const ctype = TYPES.get(attributes.type as string);
  if (ctype === undefined) return null;
  if (ctype.kind === "integer") return { value: attributes.value, domain: new D.OfInteger.Data(BigInt(ctype.width), ctype.signed) };
  if (ctype.kind === "floating") return { value: attributes.value, domain: new D.OfIeee754.Data(ctype.format as string) };
  return { value: attributes.value }; // a bool
}

const V = value(BigInt, Number, String, Boolean);

export const TRANSLATOR = new Pairwise(BASIC, CCPP, [
  new Rule(Basic.literal(V), Ccpp.constant(V)),
  new Convert("literal", "constant", toC, fromC),
  new Rule(Basic.variable, Ccpp.identifier),
  new Inline("let", "left"),
  new Rule(Basic.get, Ccpp.get),
  new Rule(Basic.implies, Ccpp.implies, "forward"),
  ...renames("operation", "name", "binary", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*", bitand: "&",
    bitor: "|", bitxor: "^", shl: "<<", shr: ">>" }, 2),
  ...renames("operation", "name", "unary", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
]);
