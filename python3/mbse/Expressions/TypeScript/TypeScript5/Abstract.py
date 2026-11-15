"""ECMAScript's values and abstract operations, as the TypeScript5 dialect's folding rules read them (ECMA-262, 6 and
7): what JavaScript has natively, modeled alike in both implementations, so that a TypeScript5 expression simplifies
to the same literal in each.

Its values, each as Python holds it: `undefined` (`UNDEFINED`), `null` (None), a boolean (a bool), a number (a float,
IEEE 754's binary64), a bigint (an int), a string (a str, read as its UTF-16 code units where ECMAScript reads them:
its length, its indices, its order), an array (a list, `HOLE` where it has no element; a tagged template's strings a
`TemplateStrings`), an object (a dict of property keys, strings, in ECMAScript's order: array indices ascending, then
the others as inserted), a regular expression (`RegExp`, its source and flags: its matching is not modeled), a function
(a `Closure` an arrow makes, or a callable the scope provides), a data object (mbse-schemas', read through
`Framework.Objects`, its properties as an object's), and any other value the scope provides, a host value, which no
operation reads (each raises `NoRule`, "TypeScript5 host value is not simplified").

Its abstract operations, as ECMA-262 names them (7.1 and 7.2): `type_of` (13.5.3), `to_boolean`, `to_primitive` (an
object's own `valueOf` and `toString` called where they are functions, else the built-in ones: an array joined, an
object `[object Object]`), `to_number` (a string by StringToNumber), `to_numeric`, `to_string` (a number by
Number::toString's shortest round trip, `Text.number`), `to_property_key`, `is_strictly_equal`, `is_loosely_equal`
and `is_less_than`; the operators over numbers and bigints (`binary`, `unary`,
6.1.6), with BigInt's errors; property access (`get`, `has_property`), iteration (`iterate`), an object's own entries
(`own_entries`) and calls (`call`, `construct`). A built-in method (`String.prototype.toUpperCase`) is read, but not
modeled: reading one raises `NoRule` by its name, as `BUILTINS` lists them, since its value is the language's runtime's.
Errors are ECMAScript's, of the same names and messages in both implementations: TypeError, and `RangeError`.
"""

from __future__ import annotations

import math
import re
from collections.abc import Callable, Iterable
from typing import Any

from mbse.Expressions.Framework import Objects, Simplifiers as F

from . import Text

__all__ = ["UNDEFINED", "HOLE", "RangeError", "RegExp", "Closure", "TemplateStrings", "BUILTINS", "MAX_BIGINT_BITS",
           "kind", "type_of", "is_primitive", "to_boolean", "to_primitive", "to_number", "to_numeric", "to_string",
           "to_property_key", "string_to_number", "string_to_bigint",
           "is_strictly_equal", "is_loosely_equal", "is_less_than", "binary", "unary", "get", "has_property",
           "iterate", "own_entries", "ordered", "call", "construct", "instance_of", "cook", "is_array_index"]

DIALECT = "TypeScript5"


class _Undefined:
    """ECMAScript's `undefined`, the one value of its type."""

    def __repr__(self) -> str:
        return "undefined"


UNDEFINED: Any = _Undefined()
"""`undefined`."""


class _Hole:
    """An array's missing element (an elision): no property at its index."""


HOLE: Any = _Hole()
"""An array's missing element."""


class RangeError(ValueError):
    """ECMAScript's RangeError: a value out of an operation's range (a bigint divided by zero)."""


class RegExp:
    """A regular expression object, by identity: its `source` and its `flags`, as written. Its matching is not
    modeled."""

    def __init__(self, source: str, flags: str):
        self.source, self.flags = source, flags


class Closure:
    """A function an arrow makes, by identity: `call(arguments)` gives its value, its parameters bound to them."""

    def __init__(self, call: Callable[[list[Any]], Any]):
        self.call = call


class TemplateStrings(list):  # type: ignore[type-arg]
    """A tagged template's first argument: its cooked strings, an array (`undefined` where a quasi has an invalid
    escape), and their raw text, `raw`."""

    def __init__(self, cooked: Iterable[Any], raw: Iterable[str]):
        super().__init__(cooked)
        self.raw = list(raw)


_PROTOTYPES: dict[str, tuple[str, ...]] = {
    "Object": ("__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__", "__proto__",
               "constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString",
               "valueOf"),
    "Array": ("at", "concat", "constructor", "copyWithin", "entries", "every", "fill", "filter", "find", "findIndex",
              "findLast", "findLastIndex", "flat", "flatMap", "forEach", "includes", "indexOf", "join", "keys",
              "lastIndexOf", "map", "pop", "push", "reduce", "reduceRight", "reverse", "shift", "slice", "some", "sort",
              "splice", "toLocaleString", "toReversed", "toSorted", "toSpliced", "toString", "unshift", "values",
              "with"),
    "String": ("anchor", "at", "big", "blink", "bold", "charAt", "charCodeAt", "codePointAt", "concat", "constructor",
               "endsWith", "fixed", "fontcolor", "fontsize", "includes", "indexOf", "isWellFormed", "italics",
               "lastIndexOf", "link", "localeCompare", "match", "matchAll", "normalize", "padEnd", "padStart", "repeat",
               "replace", "replaceAll", "search", "slice", "small", "split", "startsWith", "strike", "sub", "substr",
               "substring", "sup", "toLocaleLowerCase", "toLocaleUpperCase", "toLowerCase", "toString", "toUpperCase",
               "toWellFormed", "trim", "trimEnd", "trimLeft", "trimRight", "trimStart", "valueOf"),
    "Number": ("constructor", "toExponential", "toFixed", "toLocaleString", "toPrecision", "toString", "valueOf"),
    "Boolean": ("constructor", "toString", "valueOf"),
    "BigInt": ("constructor", "toLocaleString", "toString", "valueOf"),
    "Function": ("apply", "bind", "call", "constructor", "length", "name", "toString"),
    "RegExp": ("compile", "constructor", "dotAll", "exec", "flags", "global", "hasIndices", "ignoreCase", "lastIndex",
               "multiline", "source", "sticky", "test", "toString", "unicode", "unicodeSets"),
}
"""The properties of ECMAScript 2025's prototypes (Annex B's among them) that a value of each kind inherits."""

BUILTINS: tuple[str, ...] = tuple(f"{name}.prototype.{key}" for name, keys in _PROTOTYPES.items() for key in keys)
"""The built-in properties read but not modeled, by name ("String.prototype.toUpperCase"): reading one raises
`NoRule` by that name."""

_PROTOTYPE_OF = {"string": "String", "number": "Number", "boolean": "Boolean", "bigint": "BigInt", "array": "Array",
                 "function": "Function", "regexp": "RegExp"}

MAX_BIGINT_BITS = 1 << 30
"""The most bits a bigint may have, as V8 allows: an exponent or a left shift beyond it, whose result has more,
raises RangeError "Maximum BigInt size exceeded" before it is computed (a result that grows beyond it otherwise is
computed in Python, whose ints are unbounded, and raises in TypeScript, as V8 does)."""

_PRIMITIVES = frozenset({"undefined", "null", "boolean", "number", "bigint", "string"})


def kind(value: Any) -> str:
    """A value's kind: `undefined`, `null`, `boolean`, `number`, `bigint`, `string`, `array`, `object`, `regexp`,
    `function`, `data` (a data object) or `host`."""
    if value is UNDEFINED:
        return "undefined"
    if value is None:
        return "null"
    found = {bool: "boolean", float: "number", int: "bigint", str: "string", dict: "object"}.get(type(value))
    if found is not None:
        return found
    if isinstance(value, list):
        return "array"
    if isinstance(value, RegExp):
        return "regexp"
    if isinstance(value, Closure):
        return "function"
    if Objects.is_object(value):
        return "data"
    return "function" if callable(value) else "host"


def is_primitive(value: Any) -> bool:
    """Whether a value is a primitive: not an object."""
    return kind(value) in _PRIMITIVES


def _host() -> F.NoRule:
    return F.NoRule(DIALECT, "host value")


def type_of(value: Any) -> str:
    """`typeof value` (13.5.3)."""
    found = kind(value)
    if found == "null":
        return "object"
    return found if found in _PRIMITIVES or found == "function" else "object"


def to_boolean(value: Any) -> bool:
    """ToBoolean (7.1.2)."""
    found = kind(value)
    if found in ("undefined", "null"):
        return False
    if found == "number":
        return not (value == 0 or math.isnan(value))
    if found in ("boolean", "bigint", "string"):
        return bool(value)
    return True


# --- Strings, as UTF-16 code units ---


def _units(value: str) -> list[int]:
    data = value.encode("utf-16-le", "surrogatepass")
    return [data[i] | data[i + 1] << 8 for i in range(0, len(data), 2)]


def _from_units(units: Iterable[int]) -> str:
    return b"".join(unit.to_bytes(2, "little") for unit in units).decode("utf-16-le", "surrogatepass")


def _normalize(value: str) -> str:
    """A string as ECMAScript holds it: its UTF-16 code units, a surrogate pair one code point."""
    return _from_units(_units(value))


_ARRAY_INDEX = re.compile(r"0|[1-9][0-9]*")


def is_array_index(key: str) -> bool:
    """Whether a property key is an array index: a canonical integer from 0 to 2 ** 32 - 2."""
    return _ARRAY_INDEX.fullmatch(key) is not None and int(key) < 2 ** 32 - 1


# --- Conversions (7.1) ---


def _own(value: Any, found: str, name: str) -> Any:
    """An object's own property `name`, or `_BUILTIN` where it has none, its prototype's then read."""
    if found == "object" and name in value:
        return value[name]
    if found == "data":
        properties = Objects.properties(value)
        if name in properties:
            return _listed(properties[name])
    return _BUILTIN


_BUILTIN: Any = object()


def _builtin_string(value: Any, found: str) -> str:
    """An object's built-in `toString`: an array joined by commas, a regular expression's source and flags, an
    object's `[object Object]`; a function's source text is not modeled."""
    if found == "array":
        return ",".join("" if item is HOLE or item is UNDEFINED or item is None else to_string(item) for item in value)
    if found == "regexp":
        return f"/{value.source}/{value.flags}"
    if found == "function":
        raise F.NoRule(DIALECT, "Function.prototype.toString")
    return "[object Object]"


def to_primitive(value: Any, hint: str = "default") -> Any:
    """ToPrimitive (7.1.1): a primitive as it is; an object by OrdinaryToPrimitive, its own `valueOf` and `toString`
    (`toString` first for the hint `string`) called where they are functions, its built-in ones otherwise."""
    found = kind(value)
    if found in _PRIMITIVES:
        return value
    if found == "host":
        raise _host()
    for name in ("toString", "valueOf") if hint == "string" else ("valueOf", "toString"):
        method = _own(value, found, name)
        if method is _BUILTIN:
            if name == "toString":
                return _builtin_string(value, found)
            continue  # Object.prototype.valueOf gives the object itself
        if kind(method) == "function":
            result = call(method, [])
            if is_primitive(result):
                return result
    raise TypeError("Cannot convert object to primitive value")


_WHITESPACE = frozenset("\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a"
                        "\u2028\u2029\u202f\u205f\u3000\ufeff")
_DECIMAL = re.compile(r"[+-]?(?:Infinity|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)")
_NON_DECIMAL = re.compile(r"0(?:[xX]([0-9a-fA-F]+)|[oO]([0-7]+)|[bB]([01]+))")
_INTEGER = re.compile(r"[+-]?[0-9]+")


def _trim(value: str) -> str:
    start, end = 0, len(value)
    while start < end and value[start] in _WHITESPACE:
        start += 1
    while end > start and value[end - 1] in _WHITESPACE:
        end -= 1
    return value[start:end]


def _non_decimal(text: str) -> int | None:
    match = _NON_DECIMAL.fullmatch(text)
    if match is None:
        return None
    hexadecimal, octal, binary_ = match.groups()
    return int(hexadecimal, 16) if hexadecimal else int(octal, 8) if octal else int(binary_, 2)


def _float(integer: int) -> float:
    """An integer as the nearest number, Infinity beyond the largest."""
    try:
        return float(integer)
    except OverflowError:
        return math.inf


def string_to_number(value: str) -> float:
    """StringToNumber (7.1.4.1.1): ECMAScript's StringNumericLiteral, its white space trimmed, else NaN."""
    text = _trim(value)
    if text == "":
        return 0.0
    integer = _non_decimal(text)
    if integer is not None:
        return _float(integer)
    if _DECIMAL.fullmatch(text) is None:
        return math.nan
    return float(text.replace("Infinity", "inf"))


def string_to_bigint(value: str) -> int | None:
    """StringToBigInt (7.1.14): an integer, decimal with its sign or binary, octal or hexadecimal, its white space
    trimmed; None (undefined) where it is none."""
    text = _trim(value)
    if text == "":
        return 0
    integer = _non_decimal(text)
    if integer is not None:
        return integer
    return int(text) if _INTEGER.fullmatch(text) else None


def to_number(value: Any) -> float:
    """ToNumber (7.1.4)."""
    found = kind(value)
    if found == "undefined":
        return math.nan
    if found == "null":
        return 0.0
    if found == "boolean":
        return 1.0 if value else 0.0
    if found == "number":
        return value
    if found == "string":
        return string_to_number(value)
    if found == "bigint":
        raise TypeError("Cannot convert a BigInt value to a number")
    return to_number(to_primitive(value, "number"))


def to_numeric(value: Any) -> float | int:
    """ToNumeric (7.1.3): a bigint as it is, any other value's number."""
    primitive = to_primitive(value, "number")
    return primitive if kind(primitive) == "bigint" else to_number(primitive)


def to_string(value: Any) -> str:
    """ToString (7.1.17)."""
    found = kind(value)
    if found in ("undefined", "null"):
        return found
    if found == "boolean":
        return "true" if value else "false"
    if found == "number":
        return Text.number(value)
    if found == "bigint":
        return str(value)
    if found == "string":
        return value
    return to_string(to_primitive(value, "string"))


def to_property_key(value: Any) -> str:
    """ToPropertyKey (7.1.19): a string (ECMAScript's symbols are not modeled)."""
    return to_string(to_primitive(value, "string"))


def _to_uint32(value: Any) -> int:
    """ToUint32 (7.1.7), as an int."""
    number = to_number(value)
    if math.isnan(number) or math.isinf(number):
        return 0
    return int(number) % 2 ** 32


def _to_int32(value: Any) -> int:
    """ToInt32 (7.1.6), as an int."""
    unsigned = _to_uint32(value)
    return unsigned - 2 ** 32 if unsigned >= 2 ** 31 else unsigned


# --- Equality and order (7.2) ---


def _type(value: Any) -> str:
    found = kind(value)
    return found if found in _PRIMITIVES else "object"


def is_strictly_equal(left: Any, right: Any) -> bool:
    """IsStrictlyEqual (7.2.15): the same type, and the same value (NaN equal to nothing, 0 to -0), an object the
    same object."""
    found = _type(left)
    if found != _type(right):
        return False
    if found in ("undefined", "null"):
        return True
    if found == "object":
        return left is right
    return bool(left == right)


def is_loosely_equal(left: Any, right: Any) -> bool:
    """IsLooselyEqual (7.2.14)."""
    a, b = _type(left), _type(right)
    if a == b:
        return is_strictly_equal(left, right)
    if {a, b} == {"undefined", "null"}:
        return True
    if a == "number" and b == "string":
        return left == string_to_number(right)
    if a == "string" and b == "number":
        return string_to_number(left) == right
    if a == "bigint" and b == "string":
        n = string_to_bigint(right)
        return n is not None and left == n
    if a == "string" and b == "bigint":
        return is_loosely_equal(right, left)
    if a == "boolean":
        return is_loosely_equal(to_number(left), right)
    if b == "boolean":
        return is_loosely_equal(left, to_number(right))
    if a in ("string", "number", "bigint") and b == "object":
        return is_loosely_equal(left, to_primitive(right))
    if a == "object" and b in ("string", "number", "bigint"):
        return is_loosely_equal(to_primitive(left), right)
    if {a, b} == {"number", "bigint"}:
        number = left if a == "number" else right
        return not (math.isnan(number) or math.isinf(number)) and left == right
    return False


def is_less_than(left: Any, right: Any, left_first: bool = True) -> bool | None:
    """IsLessThan (7.2.13): True, False, or None (undefined) where a NaN or a string that is no bigint decides."""
    if left_first:
        px, py = to_primitive(left, "number"), to_primitive(right, "number")
    else:
        py = to_primitive(right, "number")
        px = to_primitive(left, "number")
    if type(px) is str and type(py) is str:
        return _units(px) < _units(py)
    if kind(px) == "bigint" and type(py) is str:
        n = string_to_bigint(py)
        return None if n is None else px < n
    if type(px) is str and kind(py) == "bigint":
        n = string_to_bigint(px)
        return None if n is None else n < py
    nx, ny = to_numeric(px), to_numeric(py)
    if (type(nx) is float and math.isnan(nx)) or (type(ny) is float and math.isnan(ny)):
        return None
    return bool(nx < ny)


# --- Operators over numbers and bigints (6.1.6) ---


def _mix() -> TypeError:
    return TypeError("Cannot mix BigInt and other types, use explicit conversions")


def _too_big() -> RangeError:
    return RangeError("Maximum BigInt size exceeded")


def _divide(x: float, y: float) -> float:
    if y == 0:
        if math.isnan(x) or x == 0:
            return math.nan
        return math.copysign(math.inf, x) * math.copysign(1.0, y)
    return x / y


def _remainder(x: float, y: float) -> float:
    if math.isnan(x) or math.isnan(y) or math.isinf(x) or y == 0:
        return math.nan
    if math.isinf(y) or x == 0:
        return x
    return math.copysign(math.fmod(x, y), x)


def _odd(y: float) -> bool:
    return math.isfinite(y) and y == int(y) and int(y) % 2 == 1


def _exponentiate(x: float, y: float) -> float:
    """Number::exponentiate (6.1.6.1.3)."""
    if math.isnan(y):
        return math.nan
    if y == 0:
        return 1.0
    if math.isnan(x) or (abs(x) == 1 and math.isinf(y)):
        return math.nan
    if x == 0:
        negative = math.copysign(1.0, x) < 0 and _odd(y)
        return (-0.0 if negative else 0.0) if y > 0 else (-math.inf if negative else math.inf)
    try:
        return math.pow(x, y)
    except OverflowError:
        return -math.inf if x < 0 and _odd(y) else math.inf
    except ValueError:  # a negative base, a fractional exponent
        return math.nan


def _int32(value: int) -> float:
    value %= 2 ** 32
    return float(value - 2 ** 32 if value >= 2 ** 31 else value)


_NUMBER: dict[str, Callable[[float, float], float]] = {
    "+": lambda x, y: x + y, "-": lambda x, y: x - y, "*": lambda x, y: x * y, "/": _divide, "%": _remainder,
    "**": _exponentiate,
    "<<": lambda x, y: _int32(_to_int32(x) << (_to_uint32(y) & 31)),
    ">>": lambda x, y: float(_to_int32(x) >> (_to_uint32(y) & 31)),
    ">>>": lambda x, y: float(_to_uint32(x) >> (_to_uint32(y) & 31)),
    "&": lambda x, y: float(_to_int32(x) & _to_int32(y)), "|": lambda x, y: float(_to_int32(x) | _to_int32(y)),
    "^": lambda x, y: float(_to_int32(x) ^ _to_int32(y)),
}


def _big_divide(x: int, y: int, remainder: bool) -> int:
    if y == 0:
        raise RangeError("Division by zero")
    quotient = abs(x) // abs(y) * (1 if (x < 0) == (y < 0) else -1)  # truncated toward zero
    return x - y * quotient if remainder else quotient


def _big_power(x: int, y: int) -> int:
    if y < 0:
        raise RangeError("Exponent must be non-negative")
    if abs(x) > 1 and y > MAX_BIGINT_BITS:  # more bits than its exponent
        raise _too_big()
    return x ** y


def _big_shift(x: int, y: int) -> int:
    if y < 0:
        return x >> -y
    if x != 0 and y > MAX_BIGINT_BITS:  # more bits than its shift
        raise _too_big()
    return x << y


def _unsigned(x: int, y: int) -> int:
    raise TypeError("BigInts have no unsigned right shift, use >> instead")


_BIGINT: dict[str, Callable[[int, int], int]] = {
    "+": lambda x, y: x + y, "-": lambda x, y: x - y, "*": lambda x, y: x * y,
    "/": lambda x, y: _big_divide(x, y, False), "%": lambda x, y: _big_divide(x, y, True), "**": _big_power,
    "<<": _big_shift, ">>": lambda x, y: _big_shift(x, -y), ">>>": _unsigned,
    "&": lambda x, y: x & y, "|": lambda x, y: x | y, "^": lambda x, y: x ^ y,
}


def binary(operator: str, left: Any, right: Any) -> Any:
    """ApplyStringOrNumericBinaryOperator (13.15.3): `+` concatenating where either primitive is a string, else each
    operator over numbers or over bigints, mixing them a TypeError."""
    if operator == "+":
        left, right = to_primitive(left), to_primitive(right)
        if type(left) is str or type(right) is str:
            return _normalize(to_string(left) + to_string(right))
    x, y = to_numeric(left), to_numeric(right)
    if type(x) is not type(y):
        raise _mix()
    return _BIGINT[operator](x, y) if type(x) is int else _NUMBER[operator](x, y)  # type: ignore[arg-type]


def unary(operator: str, value: Any) -> Any:
    """`-`, `+`, `~` and `!` (13.5)."""
    if operator == "!":
        return not to_boolean(value)
    if operator == "+":
        return to_number(value)
    numeric = to_numeric(value)
    if operator == "-":
        return -numeric
    return ~numeric if type(numeric) is int else float(~_to_int32(numeric))


# --- Objects ---


def _listed(value: Any) -> Any:
    """A data object's property as ECMAScript reads it: a list as an array of its values, lists of lists too."""
    return [_listed(item) for item in value.values] if isinstance(value, Objects.Listed) else value


def ordered(properties: dict[str, Any]) -> dict[str, Any]:
    """An object's properties in ECMAScript's order (OrdinaryOwnPropertyKeys, 10.1.11.1): its array indices ascending,
    then its other keys as inserted."""
    indices = sorted((key for key in properties if is_array_index(key)), key=int)
    return {**{key: properties[key] for key in indices},
            **{key: value for key, value in properties.items() if not is_array_index(key)}}


def _builtin(found: str, key: str) -> str | None:
    """The name of the built-in property a value of a kind inherits as `key`, if any."""
    for prototype in (_PROTOTYPE_OF.get(found), "Object"):
        if prototype is not None and key in _PROTOTYPES[prototype]:
            return f"{prototype}.prototype.{key}"
    return None


def _inherited(found: str, key: str) -> Any:
    """A property a value does not own: a built-in's raises `NoRule` by its name; any other is undefined."""
    builtin = _builtin(found, key)
    if builtin is not None:
        raise F.NoRule(DIALECT, builtin)
    return UNDEFINED


def get(value: Any, key: str) -> Any:
    """`value[key]`, a property key: its own property, else undefined; reading `undefined` or `null` a TypeError."""
    found = kind(value)
    if found in ("undefined", "null"):
        raise TypeError(f"Cannot read properties of {found} (reading '{key}')")
    if found == "host":
        raise _host()
    if found == "string":
        units = _units(value)
        if key == "length":
            return float(len(units))
        if is_array_index(key) and int(key) < len(units):
            return _from_units([units[int(key)]])
    elif found == "array":
        if key == "length":
            return float(len(value))
        if is_array_index(key):
            item = value[int(key)] if int(key) < len(value) else HOLE
            return UNDEFINED if item is HOLE else item
        if key == "raw" and isinstance(value, TemplateStrings):
            return value.raw
    elif found == "object":
        if key in value:
            return value[key]
    elif found == "data":
        properties = Objects.properties(value)
        if key in properties:
            return _listed(properties[key])
    return _inherited(found, key)


def has_property(value: Any, key: Any) -> bool:
    """`key in value` (13.10.1): whether the object has the property, its own or inherited; a primitive a
    TypeError."""
    found = kind(value)
    if found in _PRIMITIVES:
        raise TypeError(f"Cannot use 'in' operator to search for '{to_string(key)}' in {to_string(value)}")
    if found == "host":
        raise _host()
    name = to_property_key(key)
    if _builtin(found, name) is not None:
        return True
    if found == "array":
        if is_array_index(name):
            return int(name) < len(value) and value[int(name)] is not HOLE
        return name == "length" or (name == "raw" and isinstance(value, TemplateStrings))
    if found == "object":
        return name in value
    if found == "data":
        return name in Objects.properties(value)
    return found == "regexp" and name == "lastIndex"


def iterate(value: Any) -> list[Any]:
    """The values an iterable gives (7.4): an array's elements (a hole undefined), a string's code points; any other
    value a TypeError."""
    found = kind(value)
    if found == "array":
        return [UNDEFINED if item is HOLE else item for item in value]
    if found == "string":
        return list(_normalize(value))
    if found == "host":
        raise _host()
    raise TypeError(f"{'null' if found == 'null' else type_of(value)} is not iterable")


def own_entries(value: Any) -> list[tuple[str, Any]]:
    """An object's own enumerable properties, as a spread copies them (CopyDataProperties, 7.3.25): a string's and an
    array's indices, an object's and a data object's properties; none of a primitive's or a function's."""
    found = kind(value)
    if found == "host":
        raise _host()
    if found == "string":
        return [(str(i), _from_units([unit])) for i, unit in enumerate(_units(value))]
    if found == "array":
        return [(str(i), item) for i, item in enumerate(value) if item is not HOLE]
    if found == "object":
        return list(ordered(value).items())
    if found == "data":
        return [(key, _listed(item)) for key, item in Objects.properties(value).items()]
    return []


def call(function: Any, arguments: list[Any]) -> Any:
    """A function called with its arguments: a closure, or a callable the scope provides."""
    if isinstance(function, Closure):
        return function.call(arguments)
    return function(*arguments)


def construct(constructor: Any, arguments: list[Any]) -> Any:
    """`new constructor(...arguments)`, of a class the scope provides; None where it is no constructor."""
    return constructor(*arguments) if isinstance(constructor, type) else None


def instance_of(value: Any, target: Any) -> bool:
    """`value instanceof target` (13.10.2): whether a class the scope provides made the object."""
    if kind(target) != "function":
        raise TypeError("Right-hand side of 'instanceof' is not callable")
    if is_primitive(value):
        return False
    if not isinstance(target, type):
        raise TypeError("Function has non-object prototype 'undefined' in instanceof check")
    return isinstance(value, target)


# --- Templates (13.2.8) ---

_DIGITS = "0123456789"
_SINGLE = {"b": "\b", "f": "\f", "n": "\n", "r": "\r", "t": "\t", "v": "\v"}
_HEX4 = re.compile(r"[0-9a-fA-F]{4}")
_HEX2 = re.compile(r"[0-9a-fA-F]{2}")
_HEXES = re.compile(r"\{([0-9a-fA-F]+)\}")


def cook(raw: str) -> str | None:
    """A template's cooked string, its TV, from the raw text of a quasi (its line terminators already LF, as its TRV
    has them): its escapes read; None (undefined) where one is invalid."""
    written, i = [], 0
    while i < len(raw):
        character = raw[i]
        i += 1
        if character != "\\":
            written.append(character)
            continue
        escape = raw[i:i + 1]
        i += 1
        if escape in ("\n", "\u2028", "\u2029"):  # a line continuation
            continue
        if escape == "0" and not (raw[i:i + 1] and raw[i:i + 1] in _DIGITS):
            written.append("\0")
        elif escape == "" or escape in _DIGITS:
            return None
        elif escape == "x":
            if _HEX2.fullmatch(raw[i:i + 2]) is None:
                return None
            written.append(chr(int(raw[i:i + 2], 16)))
            i += 2
        elif escape == "u":
            braces = _HEXES.match(raw, i)
            if braces is not None and int(braces.group(1), 16) <= 0x10FFFF:
                written.append(chr(int(braces.group(1), 16)))
                i = braces.end()
            elif braces is None and _HEX4.fullmatch(raw[i:i + 4]) is not None:
                written.append(chr(int(raw[i:i + 4], 16)))
                i += 4
            else:
                return None
        else:
            written.append(_SINGLE.get(escape, escape))
    return _normalize("".join(written))
