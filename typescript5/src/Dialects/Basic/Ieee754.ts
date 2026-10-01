/**
 * IEEE 754-2019 arithmetic in every interchange format, for the Basic dialect's `Ieee754` domains: exact, then
 * rounded.
 *
 * A number is a `Datum`: NaN, an infinity, or a finite number `(-1)**negative * coefficient * base**exponent` in its
 * format's base, 2 or 10. A decimal datum keeps its coefficient and exponent, so the members of a cohort (`1.5` and
 * `1.50`) differ; a binary datum's value is all that matters. `round_to` gives the datum of a format nearest an exact
 * rational by a rounding-direction attribute, with IEEE 754's default exception handling: overflow gives an infinity
 * or, rounding away from it, the largest finite number. A decimal result keeps its preferred exponent when it is
 * exact, and an exponent beyond the format's is folded down by padding the coefficient with zeros, as the General
 * Decimal Arithmetic specification's `clamp` does.
 *
 * Values are natives: numbers for `binary16`, `binary32` and `binary64`, which hold each of their values exactly, and
 * text for `binary128` and the decimal formats, in General Decimal Arithmetic's scientific form (`1.5`, `1.50`,
 * `1E+40`, `-0`, `Infinity`, `NaN`). A decimal value's text gives its coefficient and exponent; a `binary128` value's
 * is the shortest that rounds back to it. A format holds only canonical text (`contains`), and `decode` and `encode`
 * convert.
 *
 * Conversions keep the value: `convert` between formats and `from_integer` round by the target's direction, keeping
 * the exponent of an exact decimal result (the source's from a decimal, 0 from an integer, and from a binary number the
 * greatest exponent at which it is exact, but at most 0); `to_integer` rounds to an integer by the source's direction.
 * `to_bits` and `from_bits` convert a binary format's values to and from their interchange encoding, a NaN to the
 * canonical quiet NaN.
 */

import { Errors, Repr } from "@mbse/schemas/Framework";

const { ValueError } = Errors;

/** Each format's base, precision in digits of that base, and greatest exponent. */
export const FORMATS: ReadonlyMap<string, readonly [bigint, number, number]> = new Map<string, readonly [bigint, number, number]>([
  ["binary16", [2n, 11, 15]], ["binary32", [2n, 24, 127]], ["binary64", [2n, 53, 1023]], ["binary128", [2n, 113, 16383]],
  ["decimal64", [10n, 16, 384]], ["decimal128", [10n, 34, 6144]],
]);

/** The width in bits of each binary format's interchange encoding. */
export const WIDTHS: ReadonlyMap<string, number> = new Map([["binary16", 16], ["binary32", 32], ["binary64", 64], ["binary128", 128]]);

const EVEN = "roundTiesToEven";
const AWAY = "roundTiesToAway";
const POSITIVE = "roundTowardPositive";
const NEGATIVE = "roundTowardNegative";

/** A number of a format: `special` is 'nan' or 'inf', or null for the finite number
 * `(-1)**negative * coefficient * base**exponent`. */
export class Datum {
  constructor(readonly special: string | null, readonly negative: boolean = false, readonly coefficient: bigint = 0n,
    readonly exponent: number = 0) {}
}

export const NAN = new Datum("nan");

/** The base, the precision, and the least and greatest exponents of a coefficient of `precision` digits. */
function limits(format: string): [bigint, number, number, number] {
  const [base, precision, emax] = FORMATS.get(format) as readonly [bigint, number, number];
  return [base, precision, 2 - emax - precision, emax - precision + 1];
}

function bitLength(n: bigint): number {
  return n.toString(2).length;
}

/** How many digits `n > 0` has in `base`. */
function digits(n: bigint, base: bigint): number {
  if (base === 2n) return bitLength(n);
  const k = Math.floor(((bitLength(n) - 1) * 1233) / 4096); // at most floor(log10(n)), and at least one less
  return k + 1 + (n >= 10n ** BigInt(k + 1) ? 1 : 0);
}

/** `num / den * base**k`, as a numerator and a denominator. */
function scale(num: bigint, den: bigint, base: bigint, k: number): [bigint, bigint] {
  return k >= 0 ? [num * base ** BigInt(k), den] : [num, den * base ** BigInt(-k)];
}

/** Whether a coefficient truncated with the remainder `twiceRest / 2 / den` rounds away from zero. */
function up(rounding: string, negative: boolean, coefficient: bigint, twiceRest: bigint, den: bigint): boolean {
  if (twiceRest === 0n) return false;
  if (rounding === EVEN) return twiceRest > den || (twiceRest === den && coefficient % 2n === 1n);
  if (rounding === AWAY) return twiceRest >= den;
  return rounding === (negative ? NEGATIVE : POSITIVE);
}

function overflow(format: string, rounding: string, negative: boolean): Datum {
  const [base, precision, , qmax] = limits(format);
  if (rounding === EVEN || rounding === AWAY || rounding === (negative ? NEGATIVE : POSITIVE)) return new Datum("inf", negative);
  return new Datum(null, negative, base ** BigInt(precision) - 1n, qmax);
}

/** The datum, its exponent folded down into the format's by padding the coefficient, or an overflow. */
function fold(format: string, rounding: string, negative: boolean, coefficient: bigint, exponent: number): Datum {
  const [base, precision, , qmax] = limits(format);
  if (exponent > qmax) {
    const padded = coefficient * base ** BigInt(exponent - qmax);
    if (padded !== 0n && digits(padded, base) > precision) return overflow(format, rounding, negative);
    return new Datum(null, negative, padded, qmax);
  }
  return new Datum(null, negative, coefficient, exponent);
}

/** The datum of `format` that `rounding` gives for the exact value `(-1)**negative * num / den`. With an `ideal`
 * exponent (a decimal operation's preferred one), an exact result keeps it when the format allows. */
export function round_to(format: string, rounding: string, negative: boolean, num: bigint, den: bigint = 1n,
  ideal: number | null = null): Datum {
  const [base, precision, qmin, qmax] = limits(format);
  if (num === 0n) return new Datum(null, negative, 0n, Math.min(Math.max(ideal ?? 0, qmin), qmax));
  if (ideal !== null && ideal >= qmin) {
    const [n, d] = scale(num, den, base, -ideal);
    if (n % d === 0n && digits(n / d, base) <= precision) return fold(format, rounding, negative, n / d, ideal);
  }
  let e = digits(num, base) - digits(den, base);
  const [n0, d0] = scale(num, den, base, -e);
  if (n0 < d0) e -= 1;
  let exponent = Math.max(e - precision + 1, qmin);
  const [n, d] = scale(num, den, base, -exponent);
  let coefficient = n / d;
  if (up(rounding, negative, coefficient, 2n * (n % d), d)) coefficient += 1n;
  if (coefficient === base ** BigInt(precision)) {
    coefficient = base ** BigInt(precision - 1);
    exponent += 1;
  }
  return fold(format, rounding, negative, coefficient, exponent);
}

// --- Operations ---

function rational(datum: Datum, base: bigint): [bigint, bigint] {
  return scale(datum.coefficient, 1n, base, datum.exponent);
}

function negate(datum: Datum): Datum {
  return datum.special === "nan" ? datum : new Datum(datum.special, !datum.negative, datum.coefficient, datum.exponent);
}

function add(format: string, rounding: string, a: Datum, b: Datum): Datum {
  if (a.special === "nan" || b.special === "nan") return NAN;
  if (a.special === "inf" || b.special === "inf") {
    if (a.special === b.special && a.negative !== b.negative) return NAN;
    return a.special === "inf" ? a : b;
  }
  const base = (FORMATS.get(format) as readonly [bigint, number, number])[0];
  const exponent = Math.min(a.exponent, b.exponent);
  const total = [a, b].reduce((sum, x) => sum + (x.negative ? -1n : 1n) * x.coefficient * base ** BigInt(x.exponent - exponent), 0n);
  const ideal = base === 10n ? exponent : null;
  if (total === 0n) { // an exact zero: the operands' sign when they share it, otherwise + (- rounding toward negative)
    const negative = a.negative === b.negative ? a.negative : rounding === NEGATIVE;
    return round_to(format, rounding, negative, 0n, 1n, ideal);
  }
  return round_to(format, rounding, total < 0n, ...scale(total < 0n ? -total : total, 1n, base, exponent), ideal);
}

function multiply(format: string, rounding: string, a: Datum, b: Datum): Datum {
  const negative = a.negative !== b.negative;
  if (a.special === "nan" || b.special === "nan") return NAN;
  if (a.special === "inf" || b.special === "inf") {
    const other = a.special === "inf" ? b : a;
    return other.special === null && other.coefficient === 0n ? NAN : new Datum("inf", negative);
  }
  const base = (FORMATS.get(format) as readonly [bigint, number, number])[0];
  const exponent = a.exponent + b.exponent;
  return round_to(format, rounding, negative, ...scale(a.coefficient * b.coefficient, 1n, base, exponent),
    base === 10n ? exponent : null);
}

/** The value of the arithmetic operation `name` (`add`, `sub`, `mul` or `neg`) on values of `format`. */
export function operate(name: string, format: string, rounding: string, values: readonly unknown[]): unknown {
  const data = values.map((value) => decode(format, value)) as Datum[];
  let result: Datum;
  if (name === "neg") result = negate(data[0] as Datum);
  else if (name === "mul") result = multiply(format, rounding, data[0] as Datum, data[1] as Datum);
  else result = add(format, rounding, data[0] as Datum, name === "add" ? data[1] as Datum : negate(data[1] as Datum));
  return encode(format, result);
}

/** How the absolute values of two non-NaN data compare: -1, 0 or 1. */
function magnitude(a: Datum, b: Datum, base: bigint): number {
  if (a.special !== null || b.special !== null) return (a.special !== null ? 1 : 0) - (b.special !== null ? 1 : 0);
  const [[an, ad], [bn, bd]] = [rational(a, base), rational(b, base)];
  return an * bd > bn * ad ? 1 : an * bd < bn * ad ? -1 : 0;
}

/** How two values of `format` compare: by IEEE 754's totalOrder (-0 before 0, and cohort members by exponent, the
 * smaller first among positives), except that NaNs equal each other and are incomparable with numbers. */
export function compare(format: string, x: unknown, y: unknown): number | null {
  const [a, b] = [decode(format, x), decode(format, y)];
  if (a.special === "nan" || b.special === "nan") return a.special === b.special ? 0 : null;
  if (a.negative !== b.negative) return a.negative ? -1 : 1;
  const base = (FORMATS.get(format) as readonly [bigint, number, number])[0];
  let order = magnitude(a, b, base);
  if (order === 0 && a.special === null) order = a.exponent > b.exponent ? 1 : a.exponent < b.exponent ? -1 : 0;
  return a.negative ? -order : order;
}

// --- Values: natives of a format ---

const TEXT = /^(-?)(?:([0-9]+)(?:\.([0-9]+))?(?:E([+-][0-9]+))?|(Infinity)|(NaN))$/;

/** A decimal datum in General Decimal Arithmetic's scientific form. */
export function text(datum: Datum): string {
  const sign = datum.negative && datum.special !== "nan" ? "-" : "";
  if (datum.special !== null) return sign + (datum.special === "inf" ? "Infinity" : "NaN");
  const digitText = datum.coefficient.toString();
  const exponent = datum.exponent;
  const adjusted = exponent + digitText.length - 1;
  if (exponent <= 0 && adjusted >= -6) {
    if (exponent === 0) return sign + digitText;
    if (digitText.length > -exponent) return `${sign}${digitText.slice(0, exponent)}.${digitText.slice(exponent)}`;
    return `${sign}0.${"0".repeat(-exponent - digitText.length)}${digitText}`;
  }
  const mantissa = (digitText[0] as string) + (digitText.length > 1 ? "." + digitText.slice(1) : "");
  return `${sign}${mantissa}E${adjusted >= 0 ? "+" : "-"}${Math.abs(adjusted)}`;
}

/** The decimal datum that a numeric text holds; throws ValueError for any other text. */
function parse(value: string): Datum {
  const match = TEXT.exec(value);
  if (match === null || (match[6] !== undefined && match[1] !== "")) throw new ValueError(`not a number's text: ${Repr.repr(value)}`);
  const [, sign, whole, fraction, exponent, infinity, nan] = match;
  if (nan !== undefined) return NAN;
  if (infinity !== undefined) return new Datum("inf", sign !== "");
  const tail = fraction ?? "";
  return new Datum(null, sign !== "", BigInt((whole as string) + tail), Number(exponent ?? 0) - tail.length);
}

/** A float's sign, and its exact value as a coefficient and a power of two. */
function floatDatum(value: number): Datum {
  if (Number.isNaN(value)) return NAN;
  const negative = value < 0 || Object.is(value, -0);
  if (!Number.isFinite(value)) return new Datum("inf", negative);
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  const biased = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  return biased === 0 ? new Datum(null, negative, fraction, -1074) : new Datum(null, negative, fraction | (1n << 52n), biased - 1075);
}

/** The datum a value of `format` holds: a float's exact value, a decimal text's coefficient and exponent, or the
 * `binary128` number nearest a text. Throws ValueError for text a decimal format cannot hold. */
export function decode(format: string, value: unknown): Datum {
  const [base, precision, qmin, qmax] = limits(format);
  if (typeof value === "number") return floatDatum(value);
  const datum = parse(value as string);
  if (datum.special !== null || base === 10n) {
    if (datum.special === null && !(qmin <= datum.exponent && datum.exponent <= qmax
      && (datum.coefficient === 0n || digits(datum.coefficient, 10n) <= precision))) {
      throw new ValueError(`${format} cannot hold ${Repr.repr(value)}`);
    }
    return datum;
  }
  return round_to(format, EVEN, datum.negative, ...scale(datum.coefficient, 1n, 10n, datum.exponent));
}

/** A finite `binary128` datum's text: the fewest significant digits that round back to it. */
function shortest(datum: Datum): string {
  if (datum.coefficient === 0n) return datum.negative ? "-0" : "0";
  const [num, den] = rational(datum, 2n);
  for (let count = 1; ; count++) {
    let e = digits(num, 10n) - digits(den, 10n);
    const [n0, d0] = scale(num, den, 10n, -e);
    if (n0 < d0) e -= 1;
    let exponent = e - count + 1;
    const [n, d] = scale(num, den, 10n, -exponent);
    let coefficient = n / d;
    if (up(EVEN, false, coefficient, 2n * (n % d), d)) coefficient += 1n;
    const back = round_to("binary128", EVEN, false, ...scale(coefficient, 1n, 10n, exponent));
    const [bn, bd] = rational(back, 2n);
    if (back.special === null && bn * den === num * bd) {
      while (coefficient % 10n === 0n) {
        coefficient /= 10n;
        exponent += 1;
      }
      return text(new Datum(null, datum.negative, coefficient, exponent));
    }
  }
}

/** `coefficient * 2**exponent` as a float, exactly, for a value a float holds. */
function ldexp(coefficient: bigint, exponent: number): number {
  const first = Math.max(exponent, -1022); // a normal power first, so that only the last step may be subnormal
  return Number(coefficient) * 2 ** first * 2 ** (exponent - first);
}

/** The value of `format` that holds `datum`. */
export function encode(format: string, datum: Datum): unknown {
  if (format === "binary16" || format === "binary32" || format === "binary64") {
    if (datum.special === "nan") return NaN;
    if (datum.special === "inf") return datum.negative ? -Infinity : Infinity;
    const magnitudeValue = ldexp(datum.coefficient, datum.exponent);
    return datum.negative ? -magnitudeValue : magnitudeValue;
  }
  if (format === "binary128" && datum.special === null) return shortest(datum);
  return text(datum);
}

/** Whether `value` is a value of `format`: a float that the format holds exactly, or canonical text. */
export function contains(format: string, value: unknown): boolean {
  if (typeof value === "number") {
    const datum = decode(format, value);
    if (datum.special !== null || format === "binary64") return true;
    const rounded = round_to(format, EVEN, datum.negative, ...scale(datum.coefficient, 1n, 2n, datum.exponent));
    return rounded.special === null && magnitude(rounded, datum, 2n) === 0;
  }
  try {
    return encode(format, decode(format, value)) === value;
  } catch { // decode throws only ValueError
    return false;
  }
}

// --- Conversions ---

/** The same number with the fewest digits in its coefficient. */
function normalized(datum: Datum, base: bigint): Datum {
  let [coefficient, exponent] = [datum.coefficient, datum.exponent];
  while (coefficient !== 0n && coefficient % base === 0n) {
    coefficient /= base;
    exponent += 1;
  }
  return new Datum(datum.special, datum.negative, coefficient, exponent);
}

function baseOf(format: string): bigint {
  return (FORMATS.get(format) as readonly [bigint, number, number])[0];
}

/** A value of `source` as a value of `target`, rounded by `rounding`. */
export function convert(source: string, value: unknown, target: string, rounding: string): unknown {
  const datum = decode(source, value);
  if (datum.special !== null) return encode(target, datum);
  const base = baseOf(source);
  let ideal: number | null = null;
  if (baseOf(target) === 10n) ideal = base === 10n ? datum.exponent : Math.min(0, normalized(datum, 2n).exponent);
  return encode(target, round_to(target, rounding, datum.negative, ...rational(datum, base), ideal));
}

/** An integer as a value of `target`, rounded by `rounding`. */
export function from_integer(value: bigint, target: string, rounding: string): unknown {
  const ideal = baseOf(target) === 10n ? 0 : null;
  return encode(target, round_to(target, rounding, value < 0n, value < 0n ? -value : value, 1n, ideal));
}

/** A value of `source` rounded to an integer by `rounding`: a bigint, or an infinity as a number. Throws ValueError for
 * NaN. */
export function to_integer(source: string, value: unknown, rounding: string): bigint | number {
  const datum = decode(source, value);
  if (datum.special === "nan") throw new ValueError("NaN has no integer value");
  if (datum.special !== null) return datum.negative ? -Infinity : Infinity;
  const [num, den] = rational(datum, baseOf(source));
  let whole = num / den;
  if (up(rounding, datum.negative, whole, 2n * (num % den), den)) whole += 1n;
  return datum.negative ? -whole : whole;
}

/** A binary format's width, its fraction's width, and its greatest exponent. */
function fields(format: string): [number, number, number] {
  const [, precision, emax] = FORMATS.get(format) as readonly [bigint, number, number];
  return [WIDTHS.get(format) as number, precision - 1, emax];
}

/** A binary format's value as its interchange encoding: sign, biased exponent and fraction, as an unsigned bigint. */
export function to_bits(format: string, value: unknown): bigint {
  const [width, fraction, emax] = fields(format);
  const ones = (1n << BigInt(width - 1 - fraction)) - 1n;
  const datum = decode(format, value);
  if (datum.special === "nan") return (ones << BigInt(fraction)) | (1n << BigInt(fraction - 1));
  const sign = (datum.negative ? 1n : 0n) << BigInt(width - 1);
  if (datum.special !== null) return sign | (ones << BigInt(fraction));
  if (datum.coefficient === 0n) return sign;
  const shift = fraction + 1 - bitLength(datum.coefficient); // the coefficient's leading bit at the fraction's top
  const coefficient = shift >= 0 ? datum.coefficient << BigInt(shift) : datum.coefficient >> BigInt(-shift);
  const exponent = datum.exponent - shift + fraction;
  if (exponent < 1 - emax) return sign | (coefficient >> BigInt(1 - emax - exponent)); // subnormal
  return sign | (BigInt(exponent + emax) << BigInt(fraction)) | (coefficient - (1n << BigInt(fraction)));
}

/** The value of a binary format that an interchange encoding holds. */
export function from_bits(format: string, pattern: bigint): unknown {
  const [width, fraction, emax] = fields(format);
  const ones = (1n << BigInt(width - 1 - fraction)) - 1n;
  const negative = (pattern >> BigInt(width - 1)) !== 0n;
  const biased = (pattern >> BigInt(fraction)) & ones;
  const bits = pattern & ((1n << BigInt(fraction)) - 1n);
  let datum: Datum;
  if (biased === ones) datum = bits !== 0n ? NAN : new Datum("inf", negative);
  else if (biased === 0n) datum = new Datum(null, negative, bits, 1 - emax - fraction);
  else datum = new Datum(null, negative, bits | (1n << BigInt(fraction)), Number(biased) - emax - fraction);
  return encode(format, datum);
}
