"""Expressions of the SystemVerilog dialect: expressions and constraints of SystemVerilog (and Verilog), over its
4-state and 2-state vectors and reals, as its source writes them.

- `constant`: an unsized decimal integer (an `integer`), a real, or a string literal.
- `vector`: a sized literal, its bits MSB first (`0`, `1`, `x`, `z`), `signed` or not, written in its `base` (`b`, `o`,
  `d` or `h`; binary by default, and wherever the base cannot write the bits): `8'hFF`, `4'b10x1`, `8'sd5`.
- `identifier`: the value bound to a variable.
- `unary`: `+`, `-`, `!`, `~` and the reductions `&`, `~&`, `|`, `~|`, `^`, `~^`.
- `binary`: `**`, `*`, `/`, `%`, `+`, `-`, `<<`, `>>`, `<<<`, `>>>`, `<`, `<=`, `>`, `>=`, `==`, `!=`, `===`, `!==`,
  `==?`, `!=?`, `&`, `^`, `^~`, `~^`, `|`, `&&`, `||`, and the implications `->` and `<->`.
- `conditional`: `condition ? consequent : alternative`.
- `concatenation` (`{a, b}`) and `replication` (`{n{a}}`).
- `select` (`a[i]`) and `range` (`a[msb:lsb]`), of a vector's bits or an array's elements.
- `inside`: `value inside {items}`, whose items are values or `span`s (`[low:high]`).
- `cast`: `type'(x)`, to a built-in type, `signed` or `unsigned`, or `width'(x)`.
- `member`: `object.name`.
- `call`: a system function (`$signed`, `$unsigned`, `$clog2`, `$bits`, `$countones`, `$onehot`, `$onehot0`,
  `$isunknown`) or a function the scope provides.
- `method`: an array method of no arguments, `array.name()`: `size`, the reductions `sum`, `product`, `and`, `or` and
  `xor`, and the locators `min`, `max` and `unique`, which give queues.
- `iterate`: a reduction with a `with` clause, `array.method(name) with (body)`, which binds `name` (the iterator) to
  each item of the array within the body and reduces the body's values: `ports.and(p) with (p.pin > 0)`.

There is no binding: translators substitute a let's value for its name. The meta-schemas are registered as
'Expressions.SystemVerilog.Of<Kind>'. `render` writes an expression as SystemVerilog source, with its precedence.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework.Visitors import Native

from . import Domains

__all__ = ["DIALECT", "Builders", "Schema", "constant", "vector", "identifier", "unary", "binary", "conditional",
           "concatenation", "replication", "select", "range_", "inside", "span", "cast", "member", "call", "method",
           "iterate", "render", "CASTS", "SYSTEM", "METHODS", "REDUCTIONS"]

CASTS = (*Domains.TYPES, "signed", "unsigned")
"""What a cast may name: a built-in type, or a signedness."""
SYSTEM = ("$signed", "$unsigned", "$clog2", "$bits", "$countones", "$onehot", "$onehot0", "$isunknown")
"""The system functions."""
REDUCTIONS = ("sum", "product", "and", "or", "xor")
"""The array reduction methods, which may have a `with` clause."""
METHODS = ("size", *REDUCTIONS, "min", "max", "unique")
"""The array methods of no arguments."""
_BASES = {"b": 1, "o": 3, "h": 4, "d": 0}


@dataclass(eq=False)
class _Constant(F.Node):
    KIND = "constant"
    ROLE = F.LITERAL
    VALUE = {"int": int, "float": float, "str": str}
    value: Native | None = None


@dataclass(eq=False)
class _Vector(F.Node):
    KIND = "vector"
    ROLE = F.LITERAL
    VALUE = {"str": str}
    PROPERTIES = {"signed": bool, "base": str}
    OPTIONAL = frozenset({"signed", "base"})
    value: str | None = None  # the bits, MSB first
    signed: bool | None = None
    base: str | None = None

    def typed(self) -> Any:
        return Domains.vector(len(self.value), bool(self.signed)) if self.check() == [] else None

    def check(self) -> list[str]:
        problems = [] if self.value and all(b in "01xz" for b in self.value) else [
            f"a vector's bits must be 0, 1, x and z, at least one, got {self.value!r}"]
        if self.base not in (None, *_BASES):
            problems.append(f"a vector's base must be b, o, d or h, got {self.base!r}")
        return problems


@dataclass(eq=False)
class _Identifier(F.Node):
    KIND = "identifier"
    ROLE = F.REFERENCE
    PROPERTIES = {"name": str}
    name: str | None = None


@dataclass(eq=False)
class _Unary(F.Node):
    KIND = "unary"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("operand",)
    OPERATOR = "operator"
    VOCABULARY = Domains.UNARY
    operator: str | None = None
    operand: Any = None


@dataclass(eq=False)
class _Binary(F.Node):
    KIND = "binary"
    ROLE = F.APPLICATION
    PROPERTIES = {"operator": str}
    SLOTS = ("left", "right")
    OPERATOR = "operator"
    VOCABULARY = Domains.BINARY
    operator: str | None = None
    left: Any = None
    right: Any = None


@dataclass(eq=False)
class _Conditional(F.Node):
    KIND = "conditional"
    ROLE = F.APPLICATION
    SLOTS = ("condition", "consequent", "alternative")
    SIGNATURE = Domains.CONDITIONAL
    condition: Any = None
    consequent: Any = None
    alternative: Any = None


@dataclass(eq=False)
class _Concatenation(F.Node):
    KIND = "concatenation"
    ROLE = F.APPLICATION
    VARIADIC = "parts"
    SIGNATURE = Domains.CONCATENATION
    parts: tuple[Any, ...] = ()


@dataclass(eq=False)
class _Replication(F.Node):
    KIND = "replication"
    ROLE = F.APPLICATION
    SLOTS = ("count", "value")
    SIGNATURE = Domains.REPLICATION
    count: Any = None
    value: Any = None


@dataclass(eq=False)
class _Select(F.Node):
    KIND = "select"
    ROLE = F.APPLICATION
    SLOTS = ("value", "index")
    SIGNATURE = Domains.SELECT
    value: Any = None
    index: Any = None


@dataclass(eq=False)
class _Range(F.Node):
    KIND = "range"
    ROLE = F.APPLICATION
    SLOTS = ("value", "msb", "lsb")
    SIGNATURE = Domains.RANGE
    value: Any = None
    msb: Any = None
    lsb: Any = None


@dataclass(eq=False)
class _Inside(F.Node):
    KIND = "inside"
    ROLE = F.APPLICATION
    SLOTS = ("value",)
    VARIADIC = "items"
    SIGNATURE = Domains.INSIDE
    value: Any = None
    items: tuple[Any, ...] = ()


@dataclass(eq=False)
class _Span(F.Node):
    KIND = "span"
    ROLE = F.APPLICATION
    SLOTS = ("low", "high")
    SIGNATURE = Domains.SPAN
    low: Any = None
    high: Any = None


@dataclass(eq=False)
class _Cast(F.Node):
    KIND = "cast"
    ROLE = F.APPLICATION
    PROPERTIES = {"type": str, "width": int}
    OPTIONAL = frozenset({"type", "width"})
    SLOTS = ("operand",)
    SIGNATURE = Domains.CAST
    type: str | None = None
    width: int | None = None
    operand: Any = None

    def typed(self) -> Any:
        return Domains.TYPES.get(self.type)

    def check(self) -> list[str]:
        if (self.type is None) == (self.width is None):
            return ["a cast names a type or a width, not both nor neither"]
        if self.width is not None:
            return [] if self.width > 0 else [f"a cast's width must be positive, got {self.width}"]
        return [] if self.type in CASTS else [f"a cast's type must be a built-in type, signed or unsigned, got {self.type!r}"]


@dataclass(eq=False)
class _Member(F.Node):
    KIND = "member"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    SLOTS = ("object",)
    SIGNATURE = Domains.MEMBER
    name: str | None = None
    object: Any = None


@dataclass(eq=False)
class _Call(F.Node):
    KIND = "call"
    ROLE = F.APPLICATION
    PROPERTIES = {"function": str}
    VARIADIC = "arguments"
    OPERATOR = "function"
    SIGNATURE = Domains.CALL
    function: str | None = None
    arguments: tuple[Any, ...] = ()


@dataclass(eq=False)
class _Method(F.Node):
    KIND = "method"
    ROLE = F.APPLICATION
    PROPERTIES = {"name": str}
    SLOTS = ("array",)
    OPERATOR = "name"
    SIGNATURE = Domains.METHOD
    name: str | None = None
    array: Any = None

    def check(self) -> list[str]:
        return [] if self.name in METHODS else [f"an array method must be one of {', '.join(METHODS)}, got {self.name!r}"]


@dataclass(eq=False)
class _Iterate(F.Node):
    KIND = "iterate"
    ROLE = F.QUANTIFIER
    PROPERTIES = {"name": str, "method": str}
    SLOTS = ("array", "body")
    OPERATOR = "method"
    SIGNATURE = Domains.ITERATE
    name: str | None = None  # the iterator
    method: str | None = None
    array: Any = None
    body: Any = None  # the `with` clause, with `name` bound to each item

    def check(self) -> list[str]:
        if self.method not in REDUCTIONS:
            return [f"an iteration's method must be one of {', '.join(REDUCTIONS)}, got {self.method!r}"]
        return []


DIALECT = F.Declared("SystemVerilog", (
    _Constant, _Vector, _Identifier, _Unary, _Binary, _Conditional, _Concatenation, _Replication, _Select, _Range,
    _Inside, _Span, _Cast, _Member, _Call, _Method, _Iterate), domain_of=Domains.of)
Builders = DIALECT.Builders
Schema = DIALECT.Schema


def constant(value: Native) -> _Constant:
    return _Constant(value)


def vector(bits: str, signed: bool | None = None, base: str | None = None) -> _Vector:
    """A sized literal of `bits`, MSB first."""
    return _Vector(bits, signed, base)


def identifier(name: str) -> _Identifier:
    return _Identifier(name)


def unary(operator: str, operand: Any) -> _Unary:
    """`<operator> operand`; the operand is a spec (a native value is a constant)."""
    return _Unary(operator, DIALECT.resolve(operand))


def binary(operator: str, left: Any, right: Any) -> _Binary:
    return _Binary(operator, DIALECT.resolve(left), DIALECT.resolve(right))


def conditional(condition: Any, consequent: Any, alternative: Any) -> _Conditional:
    return _Conditional(DIALECT.resolve(condition), DIALECT.resolve(consequent), DIALECT.resolve(alternative))


def concatenation(*parts: Any) -> _Concatenation:
    return _Concatenation(tuple(DIALECT.resolve(part) for part in parts))


def replication(count: Any, value: Any) -> _Replication:
    return _Replication(DIALECT.resolve(count), DIALECT.resolve(value))


def select(value: Any, index: Any) -> _Select:
    return _Select(DIALECT.resolve(value), DIALECT.resolve(index))


def range_(value: Any, msb: Any, lsb: Any) -> _Range:
    """`value[msb:lsb]`."""
    return _Range(DIALECT.resolve(value), DIALECT.resolve(msb), DIALECT.resolve(lsb))


def inside(value: Any, *items: Any) -> _Inside:
    return _Inside(DIALECT.resolve(value), tuple(DIALECT.resolve(item) for item in items))


def span(low: Any, high: Any) -> _Span:
    """`[low:high]`, an item of `inside`."""
    return _Span(DIALECT.resolve(low), DIALECT.resolve(high))


def cast(type_or_width: str | int, operand: Any) -> _Cast:
    """`type'(operand)`, or `width'(operand)` for an int."""
    if type(type_or_width) is int:
        return _Cast(None, type_or_width, DIALECT.resolve(operand))
    return _Cast(type_or_width, None, DIALECT.resolve(operand))


def member(object: Any, name: str) -> _Member:
    return _Member(name, DIALECT.resolve(object))


def call(function: str, *arguments: Any) -> _Call:
    return _Call(function, tuple(DIALECT.resolve(argument) for argument in arguments))


def method(array: Any, name: str) -> _Method:
    """`array.name()`."""
    return _Method(name, DIALECT.resolve(array))


def iterate(array: Any, method: str, name: str, body: Any) -> _Iterate:
    """`array.method(name) with (body)`."""
    return _Iterate(name, method, DIALECT.resolve(array), DIALECT.resolve(body))


# SystemVerilog's precedence, from loosest to tightest (IEEE 1800, table 11-2).
_IMPLY, _CONDITIONAL, _OR, _AND, _BITOR, _BITXOR, _BITAND, _EQUALITY, _RELATIONAL, _SHIFT, _ADDITIVE, _MULTIPLICATIVE, \
    _POWER, _UNARY, _PRIMARY = range(1, 16)
_LEVELS = {"->": _IMPLY, "<->": _IMPLY, "||": _OR, "&&": _AND, "|": _BITOR, "^": _BITXOR, "^~": _BITXOR, "~^": _BITXOR,
           "&": _BITAND, **dict.fromkeys(("==", "!=", "===", "!==", "==?", "!=?"), _EQUALITY),
           **dict.fromkeys(("<", "<=", ">", ">="), _RELATIONAL), **dict.fromkeys(("<<", ">>", "<<<", ">>>"), _SHIFT),
           "+": _ADDITIVE, "-": _ADDITIVE, "*": _MULTIPLICATIVE, "/": _MULTIPLICATIVE, "%": _MULTIPLICATIVE, "**": _POWER}


def _digits(bits: str, base: str) -> str | None:
    """A vector's digits in a base, or None when some digit would mix x, z and known bits."""
    if base == "d":
        if all(b in "01" for b in bits):
            return str(int(bits, 2))
        return bits[0] if len(set(bits)) == 1 else None
    size = _BASES[base]
    padded = "0" * (-len(bits) % size) + bits
    digits = []
    for i in range(0, len(padded), size):
        group = padded[i:i + size]
        if all(b in "01" for b in group):
            digits.append("0123456789abcdef"[int(group, 2)])
        elif len(set(group)) == 1:
            digits.append(group[0])
        else:
            return None
    return "".join(digits)


def _vector(node: _Vector) -> str:
    base = node.base or "b"
    digits = _digits(node.value, base) if base != "b" else node.value
    if digits is None:
        base, digits = "b", node.value
    return f"{len(node.value)}'{'s' if node.signed else ''}{base}{digits}"


def _constant(value: Any) -> str:
    if type(value) is str:
        escapes = {"\\": "\\\\", '"': '\\"', "\n": "\\n", "\t": "\\t"}
        return '"' + "".join(escapes.get(c, c) for c in value) + '"'
    if type(value) is float:
        if not math.isfinite(value):
            return "0.0 / 0.0" if math.isnan(value) else "1.0 / 0.0" if value > 0 else "-1.0 / 0.0"
        return repr(value)  # with a point or an exponent
    return str(value)


def render(expression: Any) -> str:
    """The expression as SystemVerilog source, parenthesized only where precedence requires."""

    def write(node: Any, arguments: list[tuple[str, int]]) -> tuple[str, int]:
        def operand(index: int, level: int) -> str:
            text, precedence = arguments[index]
            return text if precedence >= level else f"({text})"

        texts = [text for text, _ in arguments]
        if isinstance(node, _Constant):
            text = _constant(node.value)
            return text, (_MULTIPLICATIVE if "/" in text else _UNARY if text.startswith("-") else _PRIMARY)
        if isinstance(node, _Vector):
            return _vector(node), _PRIMARY
        if isinstance(node, _Identifier):
            return node.name, _PRIMARY
        if isinstance(node, _Member):
            return f"{operand(0, _PRIMARY)}.{node.name}", _PRIMARY
        if isinstance(node, _Select):
            return f"{operand(0, _PRIMARY)}[{texts[1]}]", _PRIMARY
        if isinstance(node, _Range):
            return f"{operand(0, _PRIMARY)}[{texts[1]}:{texts[2]}]", _PRIMARY
        if isinstance(node, _Span):
            return f"[{texts[0]}:{texts[1]}]", _PRIMARY
        if isinstance(node, _Concatenation):
            return "{" + ", ".join(texts) + "}", _PRIMARY
        if isinstance(node, _Replication):
            return "{" + texts[0] + "{" + texts[1] + "}}", _PRIMARY
        if isinstance(node, _Call):
            return f"{node.function}({', '.join(texts)})", _PRIMARY
        if isinstance(node, _Method):
            return f"{operand(0, _PRIMARY)}.{node.name}()", _PRIMARY
        if isinstance(node, _Iterate):
            return f"{operand(0, _PRIMARY)}.{node.method}({node.name}) with ({texts[1]})", _PRIMARY
        if isinstance(node, _Cast):
            return f"{node.type or node.width}'({texts[0]})", _PRIMARY
        if isinstance(node, _Inside):
            return f"{operand(0, _RELATIONAL + 1)} inside {{{', '.join(texts[1:])}}}", _RELATIONAL
        if isinstance(node, _Unary):  # `- -x`, not the decrement `--x`, and `& &x`
            text = operand(0, _UNARY)
            return f"{node.operator}{' ' if text[0] in '+-&|^~!' else ''}{text}", _UNARY
        if isinstance(node, _Conditional):  # right-associative
            return f"{operand(0, _OR)} ? {operand(1, _CONDITIONAL)} : {operand(2, _CONDITIONAL)}", _CONDITIONAL
        level = _LEVELS[node.operator]
        if level == _IMPLY:  # right-associative, the loosest
            return f"{operand(0, level + 1)} {node.operator} {operand(1, level)}", level
        return f"{operand(0, level)} {node.operator} {operand(1, level + 1)}", level

    return F.fold(expression, write)[0]
