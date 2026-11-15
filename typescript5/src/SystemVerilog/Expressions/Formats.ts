/**
 * Formats of the SystemVerilog dialect: strings as SystemVerilog holds them, and the text `$sformatf` writes (IEEE 1800
 * 21.2.1), for its folding rules (`Simplifiers`).
 *
 * A string is a vector of bytes, its first character in its most significant byte, as a string literal is (5.9); read
 * as text (`text`), each byte is one character (Latin-1) and a NUL byte is no character, as converting a vector to a
 * `string` drops it (6.16); `vector` writes text back, one byte per character, an empty string as one NUL byte, as a
 * variable's empty string is.
 *
 * `sformatf(format, arguments)` writes its arguments as its format says, each specification `%`, then `-` (justified
 * left) or `0` (padded with zeros), a field width and a precision, then its letter, in either case: `%d` a decimal, `%h`
 * (or `%x`), `%o` and `%b` a vector's digits, x and z as their digits (a digit all x `x`, all z `z`, some x `X`, some z
 * `Z`); `%c` a character; `%s` a string; `%e`, `%f` and `%g` a real, as C writes it (`real`); `%%` a percent sign. A
 * field is as wide as its value's type needs, right-justified (a decimal in spaces, other digits in zeros), unless a
 * width is given, the least, `0` for no more than its digits need. `%t`, `%m`, `%l` and `%v` read a simulator's settings
 * and hierarchy, and `%u`, `%z` and `%p` write a value's encoding or its assignment pattern, which no rule writes:
 * `Simplifiers` leaves such a call in the residual, named. An argument a specification does not take, or a
 * specification with no argument, is an error.
 *
 * `real(conversion, value, precision)` writes a real as C's `printf` does (C11 7.21.6.1): from its exact binary value
 * (`Ieee754.decode`), rounded half to even, so that both implementations write the same digits.
 */

import { Errors } from "@mbse/schemas/Framework";

import * as Ieee754 from "../../Patterns/Expressions/Ieee754.js";
import { Logic, vector as vectorType } from "./Domains.js";

const { ValueError } = Errors;

/** The specifications no rule writes: a time (`%t`, by `$timeformat`), a hierarchical name (`%m`), a library binding
 * (`%l`), a net's strength (`%v`), a value's encoding (`%u`, `%z`) and an assignment pattern (`%p`). */
export const UNWRITTEN: readonly string[] = ["t", "m", "l", "v", "u", "z", "p"];

const SPECIFICATION = /%([-0]*)(\d*)(?:\.(\d+))?(.)/gs;

/** A vector's characters: its bytes, most significant first, a NUL byte no character (x and z bits as 0). */
export function text(value: Logic): string {
  const data = value.aval & ~value.bval;
  const count = Math.ceil(value.type.width / 8);
  let written = "";
  for (let i = count - 1; i >= 0; i--) {
    const byte = Number((data >> BigInt(8 * i)) & 0xffn);
    if (byte !== 0) written += String.fromCharCode(byte);
  }
  return written;
}

/** A string's vector: one byte per character, an empty string one NUL byte. */
export function vector(characters: string): Logic {
  let data = 0n;
  for (const character of characters) data = (data << 8n) | BigInt(character.charCodeAt(0));
  return new Logic(vectorType(8 * Math.max(characters.length, 1)), data);
}

/** A digit of `size` bits: hexadecimal, octal or binary, or x or z (`X` or `Z` where some bits are known). */
function digit(aval: bigint, bval: bigint, size: number): string {
  const full = (1n << BigInt(size)) - 1n;
  if (bval === 0n) return "0123456789abcdef"[Number(aval)] as string;
  const [xs, zs] = [aval & bval, ~aval & bval & full];
  if (xs === full) return "x";
  if (zs === full) return "z";
  return xs !== 0n ? "X" : "Z";
}

/** A vector's digits of `size` bits each, its most significant digit's high bits 0. */
function digits(value: Logic, size: number): string {
  const count = Math.ceil(value.type.width / size);
  const mask = (1n << BigInt(size)) - 1n;
  let written = "";
  for (let i = count - 1; i >= 0; i--) {
    const shift = BigInt(size * i);
    written += digit((value.aval >> shift) & mask, (value.bval >> shift) & mask, size);
  }
  return written;
}

/** A vector's decimal digits, by its signedness; x or z where a bit is (`x`, `z`, or `X`, `Z` where some are). */
function decimal(value: Logic): string {
  if (value.known) return value.integer().toString();
  const full = (1n << BigInt(value.type.width)) - 1n;
  const [xs, zs] = [value.aval & value.bval, ~value.aval & value.bval & full];
  if (xs === full) return "x";
  if (zs === full) return "z";
  return xs !== 0n ? "X" : "Z";
}

const SIZES: Record<string, number> = { h: 4, x: 4, o: 3, b: 1 };

/** The width of a field a vector's type needs: its largest value's decimal digits (and a sign, if signed), or its
 * digits in a base. */
function automatic(conversion: string, value: Logic): number {
  const width = value.type.width;
  if (conversion === "d") {
    return (value.type.signed ? -(1n << BigInt(width - 1)) : (1n << BigInt(width)) - 1n).toString().length;
  }
  return Math.ceil(width / (SIZES[conversion] as number));
}

/** A field of `width` at least: `written` justified right in `fill`, or left in spaces. */
function pad(written: string, width: number, left: boolean, fill: string): string {
  if (left) return written.padEnd(width);
  if (fill === "0" && (written[0] === "-" || written[0] === "+")) {
    return written[0] + written.slice(1).padStart(width - 1, "0");
  }
  return written.padStart(width, fill);
}

/** `num / den`, rounded half to even. */
function rounded(num: bigint, den: bigint): bigint {
  const [whole, rest] = [num / den, num % den];
  return whole + (2n * rest > den || (2n * rest === den && whole % 2n === 1n) ? 1n : 0n);
}

/** `coefficient * 2**exponent * 10**power`, as a fraction. */
function scaled(coefficient: bigint, exponent: number, power: number): [bigint, bigint] {
  let [num, den] = [coefficient, 1n];
  if (exponent >= 0) num <<= BigInt(exponent);
  else den <<= BigInt(-exponent);
  if (power >= 0) num *= 10n ** BigInt(power);
  else den *= 10n ** BigInt(-power);
  return [num, den];
}

/** The decimal exponent of a positive number: `k` with `10**k <= coefficient * 2**exponent < 10**(k+1)`. */
function exponentOf(coefficient: bigint, exponent: number): number {
  const [num, den] = scaled(coefficient, exponent, 0);
  let k = num.toString().length - den.toString().length;
  for (;;) {
    const [n, d] = scaled(coefficient, exponent, -k); // at least a tenth of 10**k, by its digits
    if (n >= d) return k;
    k -= 1;
  }
}

/** A magnitude's digits with `precision` digits after the point. */
function fixed(coefficient: bigint, exponent: number, precision: number): string {
  const written = rounded(...scaled(coefficient, exponent, precision)).toString().padStart(precision + 1, "0");
  const [whole, fraction] = [written.slice(0, written.length - precision), written.slice(written.length - precision)];
  return whole + (precision > 0 ? "." + fraction : "");
}

/** A magnitude's digits with one before the point and `precision` after, and its decimal exponent. */
function scientific(coefficient: bigint, exponent: number, precision: number): [string, number] {
  let k = coefficient !== 0n ? exponentOf(coefficient, exponent) : 0;
  let found = rounded(...scaled(coefficient, exponent, precision - k));
  if (found === 10n ** BigInt(precision + 1)) [found, k] = [found / 10n, k + 1];
  const written = found.toString().padStart(precision + 1, "0");
  return [written[0] + (precision > 0 ? "." + written.slice(1) : ""), k];
}

function exponentText(k: number): string {
  return `e${k < 0 ? "-" : "+"}${String(Math.abs(k)).padStart(2, "0")}`;
}

/** A real as C's `printf` writes it by `%e`, `%f` or `%g` (lowercase), `precision` digits (6 by default): from its
 * exact value, rounded half to even; `inf`, `-inf` and `nan` by name. */
export function real(conversion: string, value: number, precision: number | null = null): string {
  const datum = Ieee754.decode("binary64", value);
  const sign = datum.negative ? "-" : "";
  if (datum.special === "nan") return "nan";
  if (datum.special !== null) return sign + "inf";
  const p = precision ?? 6;
  const [c, e] = [datum.coefficient, datum.exponent];
  if (conversion === "f") return sign + fixed(c, e, p);
  if (conversion === "e") {
    const [written, k] = scientific(c, e, p);
    return sign + written + exponentText(k);
  }
  const significant = p || 1; // %g: as %f where its exponent is from -4 to below its precision, else as %e
  const [, k] = scientific(c, e, significant - 1);
  let [written, suffix] = significant > k && k >= -4 ? [fixed(c, e, significant - 1 - k), ""]
    : [scientific(c, e, significant - 1)[0], exponentText(k)];
  if (written.includes(".")) written = written.replace(/0+$/, "").replace(/\.$/, ""); // without trailing zeros
  return sign + written + suffix;
}

/** The letter of the first specification of `format` that no rule writes (`UNWRITTEN`), lowercase; null if none. */
export function unwritten(format: string): string | null {
  for (const match of format.matchAll(SPECIFICATION)) {
    const letter = (match[4] as string).toLowerCase();
    if (UNWRITTEN.includes(letter)) return letter;
  }
  return null;
}

/** The text `$sformatf` writes: `format`'s characters, each specification replaced by its argument as it says. */
export function sformatf(format: string, args: readonly unknown[]): string {
  const written: string[] = [];
  const remaining = [...args];
  let position = 0;
  for (const match of format.matchAll(SPECIFICATION)) {
    written.push(format.slice(position, match.index));
    position = (match.index as number) + match[0].length;
    const [, flags, precision, letter] = [match[0], match[1] as string, match[3], match[4] as string];
    let width = match[2] as string;
    const conversion = letter.toLowerCase();
    if (conversion === "%") {
      written.push("%");
      continue;
    }
    if (remaining.length === 0) throw new TypeError("$sformatf's format has more specifications than arguments");
    let argument = remaining.shift();
    if (width === "" && flags.includes("0")) width = "0"; // `%0d`: no wider than its digits
    let field: string;
    let fill = " ";
    if (["e", "f", "g"].includes(conversion)) {
      if (argument instanceof Logic) { // an integral value's integer, x and z as 0
        argument = Number(new Logic(argument.type, argument.aval & ~argument.bval).integer());
      }
      field = real(conversion, argument as number, precision !== undefined ? Number(precision) : null);
      fill = flags.includes("0") && /\d$/.test(field) ? "0" : " ";
    } else if (!(argument instanceof Logic)) {
      throw new TypeError(`%${letter} expects an integral argument, got real`);
    } else if (["d", "h", "x", "o", "b"].includes(conversion)) {
      field = conversion === "d" ? decimal(argument) : digits(argument, SIZES[conversion] as number);
      fill = conversion !== "d" || (flags.includes("0") && width !== "0") ? "0" : " ";
      if (width === "") width = String(automatic(conversion, argument)); // a field as wide as its type needs
      else if (conversion !== "d") field = field.replace(/^0+/, "") || "0"; // as few digits as its value needs
    } else if (conversion === "c") {
      field = String.fromCharCode(Number(argument.aval & ~argument.bval & 0xffn));
    } else if (conversion === "s") {
      field = text(argument);
    } else {
      throw new ValueError(`%${letter} is not a format specification`);
    }
    written.push(pad(field, Number(width || 0), flags.includes("-"), fill));
  }
  if (remaining.length > 0) throw new TypeError("$sformatf's format has fewer specifications than arguments");
  written.push(format.slice(position));
  return written.join("");
}
