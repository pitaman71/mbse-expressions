"""IEEE 754-2019 arithmetic in every interchange format, for the Basic dialect's `Ieee754` domains: exact, then rounded.

A number is a `Datum`: NaN, an infinity, or a finite number `(-1)**negative * coefficient * base**exponent` in its
format's base, 2 or 10. A decimal datum keeps its coefficient and exponent, so the members of a cohort (`1.5` and
`1.50`) differ; a binary datum's value is all that matters. `round_to` gives the datum of a format nearest an exact
rational by a rounding-direction attribute, with IEEE 754's default exception handling: overflow gives an infinity or,
rounding away from it, the largest finite number. A decimal result keeps its preferred exponent when it is exact, and
an exponent beyond the format's is folded down by padding the coefficient with zeros, as the General Decimal Arithmetic
specification's `clamp` does.

Values are natives: floats for `binary16`, `binary32` and `binary64`, which hold each of their values exactly, and text
for `binary128` and the decimal formats, in General Decimal Arithmetic's scientific form (`1.5`, `1.50`, `1E+40`, `-0`,
`Infinity`, `NaN`). A decimal value's text gives its coefficient and exponent; a `binary128` value's is the shortest
that rounds back to it. A format holds only canonical text (`contains`), and `decode` and `encode` convert.

Conversions keep the value: `convert` between formats and `from_integer` round by the target's direction, keeping the
exponent of an exact decimal result (the source's from a decimal, 0 from an integer, and from a binary number the
greatest exponent at which it is exact, but at most 0); `to_integer` rounds to an integer by the source's direction.
`to_bits` and `from_bits` convert a binary format's values to and from their interchange encoding, a NaN to the
canonical quiet NaN.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, replace

__all__ = ["FORMATS", "WIDTHS", "Datum", "NAN", "decode", "encode", "contains", "round_to", "operate", "compare", "text",
           "convert", "from_integer", "to_integer", "to_bits", "from_bits"]

FORMATS: dict[str, tuple[int, int, int]] = {
    "binary16": (2, 11, 15), "binary32": (2, 24, 127), "binary64": (2, 53, 1023), "binary128": (2, 113, 16383),
    "decimal64": (10, 16, 384), "decimal128": (10, 34, 6144),
}
"""Each format's base, precision in digits of that base, and greatest exponent."""
WIDTHS: dict[str, int] = {"binary16": 16, "binary32": 32, "binary64": 64, "binary128": 128}
"""The width in bits of each binary format's interchange encoding."""

EVEN, AWAY, POSITIVE, NEGATIVE = "roundTiesToEven", "roundTiesToAway", "roundTowardPositive", "roundTowardNegative"


@dataclass(frozen=True)
class Datum:
    """A number of a format: `special` is 'nan' or 'inf', or None for the finite number
    `(-1)**negative * coefficient * base**exponent`."""

    special: str | None
    negative: bool = False
    coefficient: int = 0
    exponent: int = 0


NAN = Datum("nan")


def _limits(format: str) -> tuple[int, int, int, int]:
    """The base, the precision, and the least and greatest exponents of a coefficient of `precision` digits."""
    base, precision, emax = FORMATS[format]
    return base, precision, 2 - emax - precision, emax - precision + 1


def _digits(n: int, base: int) -> int:
    """How many digits `n > 0` has in `base`; for base 10 without converting to text, which Python limits."""
    if base == 2:
        return n.bit_length()
    k = ((n.bit_length() - 1) * 1233) >> 12  # at most floor(log10(n)), and at least one less
    return k + 1 + (n >= 10 ** (k + 1))


def _scale(num: int, den: int, base: int, k: int) -> tuple[int, int]:
    """`num / den * base**k`, as a numerator and a denominator."""
    return (num * base ** k, den) if k >= 0 else (num, den * base ** -k)


def _up(rounding: str, negative: bool, coefficient: int, twice_rest: int, den: int) -> bool:
    """Whether a coefficient truncated with the remainder `twice_rest / 2 / den` rounds away from zero."""
    if twice_rest == 0:
        return False
    if rounding == EVEN:
        return twice_rest > den or (twice_rest == den and coefficient % 2 == 1)
    if rounding == AWAY:
        return twice_rest >= den
    return rounding == (NEGATIVE if negative else POSITIVE)


def _overflow(format: str, rounding: str, negative: bool) -> Datum:
    base, precision, _, qmax = _limits(format)
    if rounding in (EVEN, AWAY) or rounding == (NEGATIVE if negative else POSITIVE):
        return Datum("inf", negative)
    return Datum(None, negative, base ** precision - 1, qmax)


def _fold(format: str, rounding: str, negative: bool, coefficient: int, exponent: int) -> Datum:
    """The datum, its exponent folded down into the format's by padding the coefficient, or an overflow."""
    base, precision, _, qmax = _limits(format)
    if exponent > qmax:
        padded = coefficient * base ** (exponent - qmax)
        if padded and _digits(padded, base) > precision:
            return _overflow(format, rounding, negative)
        coefficient, exponent = padded, qmax
    return Datum(None, negative, coefficient, exponent)


def round_to(format: str, rounding: str, negative: bool, num: int, den: int = 1, ideal: int | None = None) -> Datum:
    """The datum of `format` that `rounding` gives for the exact value `(-1)**negative * num / den`. With an `ideal`
    exponent (a decimal operation's preferred one), an exact result keeps it when the format allows."""
    base, precision, qmin, qmax = _limits(format)
    if num == 0:
        return Datum(None, negative, 0, min(max(ideal or 0, qmin), qmax))
    if ideal is not None and ideal >= qmin:
        n, d = _scale(num, den, base, -ideal)
        if n % d == 0 and _digits(n // d, base) <= precision:
            return _fold(format, rounding, negative, n // d, ideal)
    e = _digits(num, base) - _digits(den, base)
    n, d = _scale(num, den, base, -e)
    if n < d:
        e -= 1
    exponent = max(e - precision + 1, qmin)
    n, d = _scale(num, den, base, -exponent)
    coefficient, rest = divmod(n, d)
    if _up(rounding, negative, coefficient, 2 * rest, d):
        coefficient += 1
    if coefficient == base ** precision:
        coefficient, exponent = base ** (precision - 1), exponent + 1
    return _fold(format, rounding, negative, coefficient, exponent)


# --- Operations ---


def _rational(datum: Datum, base: int) -> tuple[int, int]:
    return _scale(datum.coefficient, 1, base, datum.exponent)


def _negate(datum: Datum) -> Datum:
    return datum if datum.special == "nan" else replace(datum, negative=not datum.negative)


def _add(format: str, rounding: str, a: Datum, b: Datum) -> Datum:
    if a.special == "nan" or b.special == "nan":
        return NAN
    if a.special == "inf" or b.special == "inf":
        if a.special == b.special and a.negative != b.negative:
            return NAN
        return a if a.special == "inf" else b
    base = FORMATS[format][0]
    exponent = min(a.exponent, b.exponent)
    total = sum((-1 if x.negative else 1) * x.coefficient * base ** (x.exponent - exponent) for x in (a, b))
    ideal = exponent if base == 10 else None
    if total == 0:  # an exact zero: the operands' sign when they share it, otherwise + (- rounding toward negative)
        negative = a.negative if a.negative == b.negative else rounding == NEGATIVE
        return round_to(format, rounding, negative, 0, 1, ideal)
    return round_to(format, rounding, total < 0, *_scale(abs(total), 1, base, exponent), ideal)


def _multiply(format: str, rounding: str, a: Datum, b: Datum) -> Datum:
    negative = a.negative != b.negative
    if a.special == "nan" or b.special == "nan":
        return NAN
    if a.special == "inf" or b.special == "inf":
        other = b if a.special == "inf" else a
        return NAN if other.special is None and other.coefficient == 0 else Datum("inf", negative)
    base = FORMATS[format][0]
    exponent = a.exponent + b.exponent
    return round_to(format, rounding, negative, *_scale(a.coefficient * b.coefficient, 1, base, exponent),
                    exponent if base == 10 else None)


def operate(name: str, format: str, rounding: str, values: list[object]) -> object:
    """The value of the arithmetic operation `name` (`add`, `sub`, `mul` or `neg`) on values of `format`."""
    data = [decode(format, value) for value in values]
    if name == "neg":
        result = _negate(data[0])
    elif name == "mul":
        result = _multiply(format, rounding, data[0], data[1])
    else:
        result = _add(format, rounding, data[0], data[1] if name == "add" else _negate(data[1]))
    return encode(format, result)


def _magnitude(a: Datum, b: Datum, base: int) -> int:
    """How the absolute values of two non-NaN data compare: -1, 0 or 1."""
    if a.special or b.special:
        return (a.special is not None) - (b.special is not None)
    (an, ad), (bn, bd) = _rational(a, base), _rational(b, base)
    return (an * bd > bn * ad) - (an * bd < bn * ad)


def compare(format: str, x: object, y: object) -> int | None:
    """How two values of `format` compare: by IEEE 754's totalOrder (-0 before 0, and cohort members by exponent, the
    smaller first among positives), except that NaNs equal each other and are incomparable with numbers."""
    a, b = decode(format, x), decode(format, y)
    if a.special == "nan" or b.special == "nan":
        return 0 if a.special == b.special else None
    if a.negative != b.negative:
        return -1 if a.negative else 1
    base = FORMATS[format][0]
    order = _magnitude(a, b, base)
    if order == 0 and a.special is None:
        order = (a.exponent > b.exponent) - (a.exponent < b.exponent)
    return -order if a.negative else order


# --- Values: natives of a format ---

_TEXT = re.compile(r"(-?)(?:([0-9]+)(?:\.([0-9]+))?(?:E([+-][0-9]+))?|(Infinity)|(NaN))")


def text(datum: Datum) -> str:
    """A decimal datum in General Decimal Arithmetic's scientific form."""
    sign = "-" if datum.negative and datum.special != "nan" else ""
    if datum.special:
        return sign + ("Infinity" if datum.special == "inf" else "NaN")
    digits, exponent = str(datum.coefficient), datum.exponent
    adjusted = exponent + len(digits) - 1
    if exponent <= 0 and adjusted >= -6:
        if exponent == 0:
            return sign + digits
        if len(digits) > -exponent:
            return f"{sign}{digits[:exponent]}.{digits[exponent:]}"
        return f"{sign}0.{'0' * (-exponent - len(digits))}{digits}"
    mantissa = digits[0] + ("." + digits[1:] if len(digits) > 1 else "")
    return f"{sign}{mantissa}E{'+' if adjusted >= 0 else '-'}{abs(adjusted)}"


def _parse(value: str) -> Datum:
    """The decimal datum that a numeric text holds; raises ValueError for any other text."""
    match = _TEXT.fullmatch(value)
    if match is None or (match[6] and match[1]):
        raise ValueError(f"not a number's text: {value!r}")
    sign, whole, fraction, exponent, infinity, nan = match.groups()
    if nan:
        return NAN
    if infinity:
        return Datum("inf", bool(sign))
    fraction = fraction or ""
    return Datum(None, bool(sign), int(whole + fraction), int(exponent or 0) - len(fraction))


def decode(format: str, value: object) -> Datum:
    """The datum a value of `format` holds: a float's exact value, a decimal text's coefficient and exponent, or the
    `binary128` number nearest a text. Raises ValueError for text a decimal format cannot hold."""
    base, precision, qmin, qmax = _limits(format)
    if isinstance(value, float):
        if math.isnan(value):
            return NAN
        negative = math.copysign(1.0, value) < 0
        if math.isinf(value):
            return Datum("inf", negative)
        num, den = abs(value).as_integer_ratio()
        return Datum(None, negative, num, 1 - den.bit_length())
    datum = _parse(value)  # type: ignore[arg-type]
    if datum.special or base == 10:
        if datum.special is None and not (qmin <= datum.exponent <= qmax and (
                datum.coefficient == 0 or _digits(datum.coefficient, 10) <= precision)):
            raise ValueError(f"{format} cannot hold {value!r}")
        return datum
    return round_to(format, EVEN, datum.negative, *_scale(datum.coefficient, 1, 10, datum.exponent))


def _shortest(datum: Datum) -> str:
    """A finite `binary128` datum's text: the fewest significant digits that round back to it."""
    if datum.coefficient == 0:
        return "-0" if datum.negative else "0"
    num, den = _rational(datum, 2)
    digits = 1
    while True:
        e = _digits(num, 10) - _digits(den, 10)
        n, d = _scale(num, den, 10, -e)
        if n < d:
            e -= 1
        exponent = e - digits + 1
        n, d = _scale(num, den, 10, -exponent)
        coefficient, rest = divmod(n, d)
        if _up(EVEN, False, coefficient, 2 * rest, d):
            coefficient += 1
        back = round_to("binary128", EVEN, False, *_scale(coefficient, 1, 10, exponent))
        bn, bd = _rational(back, 2)
        if back.special is None and bn * den == num * bd:
            while coefficient % 10 == 0:
                coefficient, exponent = coefficient // 10, exponent + 1
            return text(Datum(None, datum.negative, coefficient, exponent))
        digits += 1


def encode(format: str, datum: Datum) -> object:
    """The value of `format` that holds `datum`."""
    if format in ("binary16", "binary32", "binary64"):
        if datum.special == "nan":
            return math.nan
        if datum.special == "inf":
            return -math.inf if datum.negative else math.inf
        magnitude = math.ldexp(datum.coefficient, datum.exponent)
        return -magnitude if datum.negative else magnitude
    if format == "binary128" and datum.special is None:
        return _shortest(datum)
    return text(datum)


def contains(format: str, value: object) -> bool:
    """Whether `value` is a value of `format`: a float that the format holds exactly, or canonical text."""
    if isinstance(value, float):
        datum = decode(format, value)
        if datum.special or format == "binary64":
            return True
        rounded = round_to(format, EVEN, datum.negative, datum.coefficient, 1 << -datum.exponent)
        return rounded.special is None and _magnitude(rounded, datum, 2) == 0
    try:
        return encode(format, decode(format, value)) == value
    except ValueError:
        return False


# --- Conversions ---


def _normalized(datum: Datum, base: int) -> Datum:
    """The same number with the fewest digits in its coefficient."""
    coefficient, exponent = datum.coefficient, datum.exponent
    while coefficient and coefficient % base == 0:
        coefficient, exponent = coefficient // base, exponent + 1
    return replace(datum, coefficient=coefficient, exponent=exponent)


def convert(source: str, value: object, target: str, rounding: str) -> object:
    """A value of `source` as a value of `target`, rounded by `rounding`."""
    datum = decode(source, value)
    if datum.special:
        return encode(target, datum)
    base = FORMATS[source][0]
    ideal = None
    if FORMATS[target][0] == 10:
        ideal = datum.exponent if base == 10 else min(0, _normalized(datum, 2).exponent)
    return encode(target, round_to(target, rounding, datum.negative, *_rational(datum, base), ideal))


def from_integer(value: int, target: str, rounding: str) -> object:
    """An integer as a value of `target`, rounded by `rounding`."""
    ideal = 0 if FORMATS[target][0] == 10 else None
    return encode(target, round_to(target, rounding, value < 0, abs(value), 1, ideal))


def to_integer(source: str, value: object, rounding: str) -> int | float:
    """A value of `source` rounded to an integer by `rounding`: an int, or an infinity as a float. Raises ValueError for
    NaN."""
    datum = decode(source, value)
    if datum.special == "nan":
        raise ValueError("NaN has no integer value")
    if datum.special:
        return -math.inf if datum.negative else math.inf
    num, den = _rational(datum, FORMATS[source][0])
    whole, rest = divmod(num, den)
    whole += _up(rounding, datum.negative, whole, 2 * rest, den)
    return -whole if datum.negative else whole


def _fields(format: str) -> tuple[int, int, int]:
    """A binary format's width, its fraction's width, and its greatest exponent."""
    _, precision, emax = FORMATS[format]
    return WIDTHS[format], precision - 1, emax


def to_bits(format: str, value: object) -> int:
    """A binary format's value as its interchange encoding: sign, biased exponent and fraction, as an unsigned int."""
    width, fraction, emax = _fields(format)
    ones = (1 << (width - 1 - fraction)) - 1
    datum = decode(format, value)
    if datum.special == "nan":
        return (ones << fraction) | (1 << (fraction - 1))
    sign = int(datum.negative) << (width - 1)
    if datum.special:
        return sign | (ones << fraction)
    if datum.coefficient == 0:
        return sign
    shift = fraction + 1 - datum.coefficient.bit_length()  # the coefficient's leading bit at the fraction's top
    coefficient = datum.coefficient << shift if shift >= 0 else datum.coefficient >> -shift
    exponent = datum.exponent - shift + fraction
    if exponent < 1 - emax:  # subnormal
        return sign | (coefficient >> (1 - emax - exponent))
    return sign | ((exponent + emax) << fraction) | (coefficient - (1 << fraction))


def from_bits(format: str, pattern: int) -> object:
    """The value of a binary format that an interchange encoding holds."""
    width, fraction, emax = _fields(format)
    ones = (1 << (width - 1 - fraction)) - 1
    negative = bool(pattern >> (width - 1))
    biased, bits = (pattern >> fraction) & ones, pattern & ((1 << fraction) - 1)
    if biased == ones:
        datum = NAN if bits else Datum("inf", negative)
    elif biased == 0:
        datum = Datum(None, negative, bits, 1 - emax - fraction)
    else:
        datum = Datum(None, negative, bits | (1 << fraction), biased - emax - fraction)
    return encode(format, datum)
