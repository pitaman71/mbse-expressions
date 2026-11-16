"""Formats of the SystemVerilog dialect: strings as SystemVerilog holds them, and the text `$sformatf` writes (IEEE 1800
21.2.1), for its folding rules (`Simplifiers`).

A string is a vector of bytes, its first character in its most significant byte, as a string literal is (5.9); read as
text (`text`), each byte is one character (Latin-1) and a NUL byte is no character, as converting a vector to a
`string` drops it (6.16); `vector` writes text back, one byte per character, an empty string as one NUL byte, as a
variable's empty string is.

`sformatf(format, arguments)` writes its arguments as its format says, each specification `%`, then `-` (justified
left) or `0` (padded with zeros), a field width and a precision, then its letter, in either case: `%d` a decimal, `%h`
(or `%x`), `%o` and `%b` a vector's digits, x and z as their digits (a digit all x `x`, all z `z`, some x `X`, some z
`Z`); `%c` a character; `%s` a string; `%e`, `%f` and `%g` a real, as C writes it (`real`); `%u` a vector's 2-state bits
and `%z` its 4-state bits, unformatted (`unformatted`); `%p` a value as an assignment pattern (`pattern`); `%%` a
percent sign. A field is as wide as its value's type needs, right-justified (a decimal in spaces, other digits in
zeros), unless a width is given, the least, `0` for no more than its digits need; the text is a string, and a NUL byte
is no character of it (6.16). `%t`, `%m`, `%l` and `%v` read a simulator's settings and hierarchy, which no rule
writes: `Simplifiers` leaves such a call in the residual, named, as it does `%p` of an object. An argument a
specification does not take, or a specification with no argument, is an error.

`unformatted(value, states)` writes a vector's bits as `%u` (2 states, x and z as 0) and `%z` (4 states) do (21.3.3):
in units of 32 bits, the unit holding the least significant bit first, each unit's bytes in the byte order of the ABIs
mbse-expressions stores (little-endian, which IEEE 1800 leaves to the host), and for `%z` each unit's `aval` word, then
its `bval` word, as VPI's `s_vpi_vecval` holds them. `pattern(value)` writes a value as `%p` does (21.2.1.7): an
integral value as `%0d` writes it, a real as `%g` does, and an array as an assignment pattern of its items, `'{1, 2}`;
it raises `NoRule` for anything else (a structure's members and a class handle's are a declaration's).

`real(conversion, value, precision, ...)` writes a real as C's `printf` does (C11 7.21.6.1): from its exact binary value
(`Ieee754.decode`), rounded half to even, so that both implementations write the same digits.
"""

from __future__ import annotations

import re
from typing import Any

from mbse.Expressions.Framework.Simplifiers import NoRule
from mbse.Expressions.Patterns.Expressions import Ieee754

from .Domains import Logic, vector as _vector

__all__ = ["text", "vector", "sformatf", "unwritten", "unformatted", "pattern", "real", "UNWRITTEN"]

UNWRITTEN = ("t", "m", "l", "v")
"""The specifications no rule writes: a time (`%t`, by `$timeformat`), a hierarchical name (`%m`), a library binding
(`%l`) and a net's strength (`%v`)."""

_SPECIFICATION = re.compile(r"%([-0]*)(\d*)(?:\.(\d+))?(.)", re.S)


def text(value: Logic) -> str:
    """A vector's characters: its bytes, most significant first, a NUL byte no character (x and z bits as 0)."""
    width = value.type.width
    data = value.aval & ~value.bval
    count = (width + 7) // 8
    return "".join(chr(data >> (8 * (count - 1 - i)) & 0xFF) for i in range(count) if data >> (8 * (count - 1 - i)) & 0xFF)


def vector(characters: str) -> Logic:
    """A string's vector: one byte per character, an empty string one NUL byte."""
    data = 0
    for character in characters:
        data = data << 8 | ord(character)
    return Logic(_vector(8 * max(len(characters), 1)), data)


def _digit(aval: int, bval: int, size: int) -> str:
    """A digit of `size` bits: hexadecimal, octal or binary, or x or z (`X` or `Z` where some bits are known)."""
    full = (1 << size) - 1
    if not bval:
        return "0123456789abcdef"[aval]
    xs, zs = aval & bval, ~aval & bval & full
    if xs == full:
        return "x"
    if zs == full:
        return "z"
    return "X" if xs else "Z"


def _digits(value: Logic, size: int) -> str:
    """A vector's digits of `size` bits each, its most significant digit's high bits 0."""
    count = -(-value.type.width // size)
    mask = (1 << size) - 1
    return "".join(_digit(value.aval >> (size * i) & mask, value.bval >> (size * i) & mask, size)
                   for i in range(count - 1, -1, -1))


def _decimal(value: Logic) -> str:
    """A vector's decimal digits, by its signedness; x or z where a bit is (`x`, `z`, or `X`, `Z` where some are)."""
    if value.known:
        return str(value.integer())
    full = (1 << value.type.width) - 1
    xs, zs = value.aval & value.bval, ~value.aval & value.bval & full
    if xs == full:
        return "x"
    if zs == full:
        return "z"
    return "X" if xs else "Z"


def _automatic(conversion: str, value: Logic) -> int:
    """The width of a field a vector's type needs: its largest value's decimal digits (and a sign, if signed), or its
    digits in a base."""
    width = value.type.width
    if conversion == "d":
        return len(str(-(1 << (width - 1)))) if value.type.signed else len(str((1 << width) - 1))
    return -(-width // {"h": 4, "x": 4, "o": 3, "b": 1}[conversion])


def _pad(written: str, width: int, left: bool, fill: str) -> str:
    """A field of `width` at least: `written` justified right in `fill`, or left in spaces."""
    if left:
        return written.ljust(width)
    if fill == "0" and written[:1] in ("-", "+"):
        return written[0] + written[1:].rjust(width - 1, "0")
    return written.rjust(width, fill)


def _rounded(num: int, den: int) -> int:
    """`num / den`, rounded half to even."""
    whole, rest = divmod(num, den)
    return whole + (2 * rest > den or 2 * rest == den and whole % 2 == 1)


def _scaled(coefficient: int, exponent: int, power: int) -> tuple[int, int]:
    """`coefficient * 2**exponent * 10**power`, as a fraction."""
    num, den = coefficient, 1
    if exponent >= 0:
        num <<= exponent
    else:
        den <<= -exponent
    if power >= 0:
        num *= 10 ** power
    else:
        den *= 10 ** -power
    return num, den


def _exponent(coefficient: int, exponent: int) -> int:
    """The decimal exponent of a positive number: `k` with `10**k <= coefficient * 2**exponent < 10**(k+1)`."""
    num, den = _scaled(coefficient, exponent, 0)
    k = len(str(num)) - len(str(den))
    while True:
        n, d = _scaled(coefficient, exponent, -k)  # at least a tenth of 10**k, by its digits
        if n >= d:
            return k
        k -= 1


def _fixed(coefficient: int, exponent: int, precision: int) -> str:
    """A magnitude's digits with `precision` digits after the point."""
    digits = str(_rounded(*_scaled(coefficient, exponent, precision))).rjust(precision + 1, "0")
    whole, fraction = digits[:len(digits) - precision], digits[len(digits) - precision:]
    return whole + ("." + fraction if precision else "")


def _scientific(coefficient: int, exponent: int, precision: int) -> tuple[str, int]:
    """A magnitude's digits with one before the point and `precision` after, and its decimal exponent."""
    k = _exponent(coefficient, exponent) if coefficient else 0
    digits = _rounded(*_scaled(coefficient, exponent, precision - k))
    if digits == 10 ** (precision + 1):
        digits, k = digits // 10, k + 1
    written = str(digits).rjust(precision + 1, "0")
    return written[0] + ("." + written[1:] if precision else ""), k


def _exponent_text(k: int) -> str:
    return f"e{'-' if k < 0 else '+'}{abs(k):02d}"


def real(conversion: str, value: float, precision: int | None = None) -> str:
    """A real as C's `printf` writes it by `%e`, `%f` or `%g` (lowercase), `precision` digits (6 by default): from its
    exact value, rounded half to even; `inf`, `-inf` and `nan` by name."""
    datum = Ieee754.decode("binary64", value)
    sign = "-" if datum.negative else ""
    if datum.special == "nan":
        return "nan"
    if datum.special:
        return sign + "inf"
    p = 6 if precision is None else precision
    c, e = datum.coefficient, datum.exponent
    if conversion == "f":
        return sign + _fixed(c, e, p)
    if conversion == "e":
        digits, k = _scientific(c, e, p)
        return sign + digits + _exponent_text(k)
    significant = p or 1  # %g: as %f where its exponent is from -4 to below its precision, else as %e
    _, k = _scientific(c, e, significant - 1)
    if significant > k >= -4:
        written, suffix = _fixed(c, e, significant - 1 - k), ""
    else:
        written, suffix = _scientific(c, e, significant - 1)[0], _exponent_text(k)
    if "." in written:  # without trailing zeros
        written = written.rstrip("0").rstrip(".")
    return sign + written + suffix


def unformatted(value: Logic, states: int) -> str:
    """A vector's bits as `%u` (`states` 2: x and z as 0) or `%z` (4: `aval`, then `bval`) write them: 32-bit units, the
    least significant first, each word's bytes little-endian, one character each."""
    words: list[int] = []
    for unit in range(-(-value.type.width // 32)):
        aval, bval = value.aval >> (32 * unit) & 0xFFFFFFFF, value.bval >> (32 * unit) & 0xFFFFFFFF
        words += [aval, bval] if states == 4 else [aval & ~bval]
    return "".join(chr(word >> (8 * byte) & 0xFF) for word in words for byte in range(4))


def pattern(value: Any) -> str:
    """A value as `%p` writes it: an integral value's decimal digits (as `%0d`), a real's as `%g`, an array's items as
    an assignment pattern; anything else is a declaration's to write (`NoRule`)."""
    if isinstance(value, Logic):
        return _decimal(value)
    if isinstance(value, float):
        return real("g", value)
    if isinstance(value, list):
        return "'{" + ", ".join(pattern(item) for item in value) + "}"
    raise NoRule("SystemVerilog", "systemcall '$sformatf' %p of an object", "systemcall")


def unwritten(format: str) -> str | None:
    """The letter of the first specification of `format` that no rule writes (`UNWRITTEN`), lowercase; None if none."""
    for match in _SPECIFICATION.finditer(format):
        if match[4].lower() in UNWRITTEN:
            return match[4].lower()
    return None


def sformatf(format: str, arguments: list[Any]) -> str:
    """The text `$sformatf` writes: `format`'s characters, each specification replaced by its argument as it says."""
    written: list[str] = []
    remaining = list(arguments)
    position = 0
    for match in _SPECIFICATION.finditer(format):
        written.append(format[position:match.start()])
        position = match.end()
        flags, width, precision, letter = match.groups()
        conversion = letter.lower()
        if conversion == "%":
            written.append("%")
            continue
        if not remaining:
            raise TypeError("$sformatf's format has more specifications than arguments")
        argument = remaining.pop(0)
        if width == "" and "0" in flags:  # `%0d`: no wider than its digits
            width = "0"
        if conversion == "p":
            written.append(_pad(pattern(argument), int(width or 0), "-" in flags, " "))
            continue
        if not isinstance(argument, (Logic, float)):
            raise TypeError(f"$sformatf writes numbers and strings, not a {type(argument).__name__}")
        if conversion in ("e", "f", "g"):
            if isinstance(argument, Logic):  # an integral value's integer, x and z as 0
                argument = float(Logic(argument.type, argument.aval & ~argument.bval).integer())
            field = real(conversion, argument, int(precision) if precision else None)
            fill = "0" if "0" in flags and field[-1:].isdigit() else " "
        elif not isinstance(argument, Logic):
            raise TypeError(f"%{letter} expects an integral argument, got real")
        elif conversion in ("d", "h", "x", "o", "b"):
            field = _decimal(argument) if conversion == "d" else _digits(
                argument, {"h": 4, "x": 4, "o": 3, "b": 1}[conversion])
            fill = "0" if conversion != "d" or "0" in flags and width != "0" else " "
            if width == "":  # a field as wide as its type needs
                width = str(_automatic(conversion, argument))
            elif conversion != "d":  # as few digits as its value needs, then padded
                field = field.lstrip("0") or "0"
        elif conversion == "c":
            field, fill = chr(argument.aval & ~argument.bval & 0xFF), " "
        elif conversion == "s":
            field, fill = text(argument), " "
        elif conversion in ("u", "z"):
            field, fill = unformatted(argument, 2 if conversion == "u" else 4), " "
        else:
            raise ValueError(f"%{letter} is not a format specification")
        written.append(_pad(field, int(width or 0), "-" in flags, fill))
    if remaining:
        raise TypeError("$sformatf's format has fewer specifications than arguments")
    written.append(format[position:])
    return "".join(written).replace("\0", "")  # a string holds no NUL byte (6.16)
