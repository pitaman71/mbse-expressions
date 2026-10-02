/** Basic <-> SystemVerilog. Basic operations are SystemVerilog's operators, `implies` its `->`, `shr` its arithmetic
 * `>>>`, `get` a member, and a bool `1'b1` or `1'b0`. SystemVerilog has no let expression, so lets are inlined: a let's
 * translated value is shared by every use of its name. It has no `has`, and the logical `>>` and the 4-state
 * comparisons (`===`, `==?`) have no Basic counterpart yet.
 *
 * A sized vector is a Basic literal of a value domain, its base telling which: a literal of an `Integer` domain of a
 * width is a decimal vector of that width and signedness (`8'd200`, `8'sd251` for -5), of a `Bits` domain a
 * hexadecimal one (`12'habc`), and of `Ieee1164` a single binary bit (`1'b1`, `1'bx`: 0, 1, X and Z, the levels
 * SystemVerilog has). Back, a decimal or signed vector is an `Integer`, a single binary bit or one of x or z an
 * `Ieee1164` level, and any other vector of known bits `Bits`; a wider vector with x or z bits has no Basic
 * counterpart. A vector without a base of a single 0 or 1 is a bool. */

import * as D from "../Dialects/Basic/Domains.js";
import { DIALECT as BASIC } from "../Dialects/Basic/Expressions.js";
import { DIALECT as SYSTEMVERILOG } from "../Dialects/SystemVerilog/Expressions.js";
import { Convert, Inline, Pairwise, Pattern, Rule, renames } from "../Framework/Translators.js";
import type { Attributes } from "../Framework/Translators.js";
import { Basic, SystemVerilog, value } from "./_Patterns.js";

const LEVELS: Record<string, string> = { 0: "0", 1: "1", X: "x", Z: "z" };

/** The bits of `number` in `width` bits, two's complement. */
function bitsOf(number: bigint, width: number): string {
  const modulus = 1n << BigInt(width);
  return (((number % modulus) + modulus) % modulus).toString(2).padStart(width, "0");
}

/** A typed Basic literal's vector. */
function toVector(attributes: Attributes): Attributes | null {
  const [domain, value] = [attributes.domain, attributes.value];
  if (domain instanceof D.OfInteger.Data && domain.width && domain.overflow === "raise") {
    const bits = bitsOf(value as bigint, Number(domain.width));
    return domain.signed ? { value: bits, signed: true, base: "d" } : { value: bits, base: "d" };
  }
  if (domain instanceof D.OfBits.Data) {
    const number = (value as Uint8Array).reduce((total, byte) => (total << 8n) | BigInt(byte), 0n);
    return { value: bitsOf(number, Number(domain.width)), base: "h" };
  }
  if (domain instanceof D.OfIeee1164.Data && (value as string) in LEVELS) return { value: LEVELS[value as string], base: "b" };
  return null;
}

/** A vector's typed Basic literal. */
function fromVector(attributes: Attributes): Attributes | null {
  const [bits, signed, base] = [attributes.value as string, Boolean(attributes.signed), attributes.base];
  if (/[xz]/.test(bits) || (bits.length === 1 && base === "b")) {
    return bits.length === 1 ? { value: bits.toUpperCase(), domain: new D.OfIeee1164.Data() } : null;
  }
  let number = BigInt("0b" + bits);
  if (base === "d" || signed) {
    if (signed && bits[0] === "1") number -= 1n << BigInt(bits.length);
    return { value: number, domain: new D.OfInteger.Data(BigInt(bits.length), signed) };
  }
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = bytes.length - 1; i >= 0; i--, number >>= 8n) bytes[i] = Number(number & 0xffn);
  return { value: bytes, domain: new D.OfBits.Data(BigInt(bits.length)) };
}

const V = value(BigInt, Number, String);

export const TRANSLATOR = new Pairwise(BASIC, SYSTEMVERILOG, [
  new Rule(Basic.literal(V), SystemVerilog.constant(V)),
  new Rule(new Pattern("literal", { value: true }), new Pattern("vector", { value: "1" })),
  new Rule(new Pattern("literal", { value: false }), new Pattern("vector", { value: "0" })),
  new Convert("literal", "vector", toVector, fromVector),
  new Rule(Basic.variable, SystemVerilog.identifier),
  new Inline("let", "left"),
  new Rule(Basic.get, SystemVerilog.get),
  new Rule(Basic.implies, SystemVerilog.implies),
  ...renames("operation", "name", "binary", "operator", {
    eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=", and: "&&", or: "||", add: "+", sub: "-", mul: "*", bitand: "&",
    bitor: "|", bitxor: "^", shl: "<<", shr: ">>>" }, 2),
  ...renames("operation", "name", "unary", "operator", { not: "!", neg: "-", bitnot: "~" }, 1),
]);
