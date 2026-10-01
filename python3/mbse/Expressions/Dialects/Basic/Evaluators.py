"""Evaluators of the Basic dialect: compute the value of an expression.

`Evaluators.OfAny(expression, scope)` evaluates any expression with the variables in `scope` bound, and
`Evaluators.OfLiteral`, `OfOperation`, `OfVariable` and `OfLet` evaluate one kind; each accepts that kind's `Spec`
(see `Expressions`), including `Term`s. The value is a native value, an object, or `None` when it is unknown.

- Three-valued logic: an absent property is unknown, and comparisons with unknown or incomparable values are unknown.
  `and`, `or`, `not` and `implies` follow Kleene's logic; the second operand is evaluated only when the first does not
  decide.
- No coercion. Comparisons follow mbse-schemas' EQUALITY.md: natives of one type by value, objects by identity; values of different
  types are incomparable. Arithmetic takes numbers of one domain.
- Values of other domains than the natives' defaults are typed values (`Domains.Value`): a literal of such a domain
  evaluates to one, and the operations take them by domain. Values of different domains are incomparable; arithmetic
  and the bitwise operations take values of one domain, and an integer domain's overflow applies to their results.
  `convert` keeps a value in the operation's domain, `reinterpret` keeps its bit pattern, and `pack` and `unpack` go
  to and from a packed domain's representation.
- Only core operations (`Expressions.CORE`) are evaluated. Unknown operations, wrong numbers of arguments, unbound
  variables and wrong operand types raise, as do the problems `validate()` reports.
- `get` and `has` read any object that writes its properties through `accept`, including value objects, whose
  identity does not take part in equality (and so they compare equal to nothing).

`Evaluators.predicate(rule, value)` evaluates a rule about a value with `this` bound to it, as a truth value.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F
from mbse.Schemas.Framework import Comparison, Schemas, Validators
from mbse.Schemas.Framework.Visitors import Native

from . import Domains, Expressions, Ieee754

__all__ = ["OfAny", "OfLiteral", "OfOperation", "OfVariable", "OfLet", "predicate", "OPERATIONS"]

Scope = Mapping[str, Any] | None

_NATIVES = (int, float, str, bool, bytes)


def _type_name(value: object) -> str:
    return type(value).__name__


def _is_native(value: object) -> bool:
    return type(value) in _NATIVES


def _truth(name: str, value: Any) -> bool | None:
    if value is not None and type(value) is not bool:
        raise TypeError(f"{name} expects bool operands, got {_type_name(value)}")
    return value


def _logic(name: str) -> F.Implementation:
    """Kleene's logic, evaluating the second operand only when the first does not decide."""
    decisive = {"and": False, "or": True, "implies": False}[name]

    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> bool | None:
        a = _truth(name, arguments[0]())
        if a is decisive:
            return name != "and"
        b = _truth(name, arguments[1]())
        if name == "implies":
            return True if b is True else None if a is None or b is None else False
        if b is (name == "or"):
            return b
        return None if a is None or b is None else name == "and"

    return apply


def _strict(function: Callable[[str, list[Any]], Any]) -> F.Implementation:
    """An operation that evaluates all its arguments."""
    return lambda arguments, node, scope: function(node.name, [argument() for argument in arguments])


def _not(name: str, values: list[Any]) -> bool | None:
    truth = _truth(name, values[0])
    return None if truth is None else not truth


def _is_readable(value: Any) -> bool:
    return callable(getattr(value, "accept", None))


def _is_object(value: Any) -> bool:
    """A reference object, compared by identity; a value object's identity does not take part in equality."""
    return _is_readable(value) and callable(getattr(value, "identity", None)) and value.owner() is None


def _read(name: str, values: list[Any]) -> Any:
    """`get`: the property's value, or `None` when absent. `has`: whether it is present."""
    target, property_name = values
    if type(property_name) is not str:
        raise TypeError(f"{name} expects a property name, got {_type_name(property_name)}")
    if target is None:
        return None
    if not _is_readable(target):
        raise TypeError(f"{name} expects an object, got {_type_name(target)}")
    properties = Validators.properties_of(target)
    if name == "has":
        return property_name in properties
    return properties.get(property_name)


def _compare(a: Native, b: Native) -> Comparison.Result:
    schema = Schemas.OfNative.Data(type(a))
    return Comparison.OfNative(schema, a).compare(Comparison.OfNative(schema, b))


def _typed(a: Any, b: Any) -> bool:
    """Whether either value is typed; then they compare only within one domain."""
    return isinstance(a, Domains.Value) or isinstance(b, Domains.Value)


def _same_domain(a: Any, b: Any) -> bool:
    return isinstance(a, Domains.Value) and isinstance(b, Domains.Value) and a.domain == b.domain


def _equal(a: Any, b: Any) -> bool | None:
    """Whether `a` equals `b`: natives of one type by value, typed values of one domain by its comparison, objects by
    identity; `None` if unknown or incomparable."""
    if a is None or b is None:
        return None
    if _typed(a, b):
        return a.domain.compare(a.value, b.value) == 0 if _same_domain(a, b) else None
    if _is_native(a) and type(a) is type(b):
        return _compare(a, b) == 0
    if _is_object(a) and _is_object(b):
        return a.identity() == b.identity()
    return None


def _equality(name: str, values: list[Any]) -> bool | None:
    equal = _equal(*values)
    return None if equal is None else equal == (name == "eq")


def _order(name: str, values: list[Any]) -> bool | None:
    """Ordered natives of one type; `None` if unknown or incomparable."""
    a, b = values
    if a is None or b is None:
        return None
    if _typed(a, b):
        if not _same_domain(a, b) or not a.domain.ORDERED:
            return None
        order = a.domain.compare(a.value, b.value)
    elif not _is_native(a) or type(a) is not type(b):
        return None
    else:
        order = _compare(a, b)
    return None if order is None else {"lt": order < 0, "le": order <= 0, "gt": order > 0, "ge": order >= 0}[name]


def _domain(value: Any) -> Any:
    """A value's domain, or None when it is not a value of one (an object)."""
    return value.domain if isinstance(value, Domains.Value) else Domains._NATIVES.get(type(value))


def _native(value: Any) -> Any:
    return value.value if isinstance(value, Domains.Value) else value


def _describe(value: Any) -> str:
    """A value's domain's name when it is typed, otherwise its type's."""
    return value.domain.name() if isinstance(value, Domains.Value) else _type_name(value)


def _operands(name: str, values: list[Any], kinds: tuple[type, ...], what: str) -> Any:
    """The one domain of `values`, which must be of `kinds`; raises naming `what` they must be."""
    domains = [_domain(value) for value in values]
    if not isinstance(domains[0], kinds) or any(domain != domains[0] for domain in domains):
        if len(values) == 1:
            raise TypeError(f"{name} expects {what[0]}, got {_describe(values[0])}")
        raise TypeError(f"{name} expects {what[1]} of one domain, got {_describe(values[0])} and {_describe(values[1])}")
    return domains[0]


_INTEGER, _IEEE754, _BITS = Domains.OfInteger.Data, Domains.OfIeee754.Data, Domains.OfBits.Data
_BYTES, _ENUM, _PACKED = Domains.OfBytes.Data, Domains.OfEnum.Data, Domains.OfPacked.Data


def _arithmetic(name: str, values: list[Any]) -> Any:
    if any(value is None for value in values):
        return None
    domain = _operands(name, values, (_INTEGER, _IEEE754), ("a number", "numbers"))
    natives = [_native(value) for value in values]
    if isinstance(domain, _IEEE754) and domain != Domains.Float:  # the default's is the host's own
        return Domains.Value(domain, Ieee754.operate(name, domain.format, domain.rounding, natives))
    if name == "neg":
        result = -natives[0]
    else:
        a, b = natives
        result = a + b if name == "add" else a - b if name == "sub" else a * b
    return Domains.value(domain, domain.fit(name, result) if isinstance(domain, _INTEGER) else result)


def _pattern(domain: Any, native: Any) -> int:
    """An integer's value, or a bits value's pattern as an unsigned int."""
    return int.from_bytes(native, "big") if isinstance(domain, _BITS) else native


def _bits(domain: Any, pattern: int) -> Any:
    """The bits value of a pattern, the bits beyond its width dropped."""
    return Domains.Value(domain, (pattern & ((1 << domain.width) - 1)).to_bytes((domain.width + 7) // 8, "big"))


def _bitwise(name: str, values: list[Any]) -> Any:
    """On two's complement patterns: of the width, or infinite without one."""
    if any(value is None for value in values):
        return None
    domain = _operands(name, values, (_INTEGER, _BITS), ("an integer or bits", "integers or bits"))
    patterns = [_pattern(domain, _native(value)) for value in values]
    if name == "bitnot":
        result = ~patterns[0]
    else:
        a, b = patterns
        result = a & b if name == "bitand" else a | b if name == "bitor" else a ^ b
    if isinstance(domain, _BITS):
        return _bits(domain, result)
    high = domain.bounds()[1]
    if not domain.signed and high is not None:
        result &= high  # an unsigned width's mask
    return Domains.value(domain, domain.fit(name, result))


def _shift(name: str, values: list[Any]) -> Any:
    """`shl` and `shr`: on an integer, multiplying or dividing (toward negative infinity) by a power of two, with the
    domain's overflow; on bits, logical within the width."""
    value, count = values
    if value is None or count is None:
        return None
    domain = _operands(name, [value], (_INTEGER, _BITS), ("an integer or bits", ""))
    if not isinstance(_domain(count), _INTEGER):
        raise TypeError(f"{name} expects an integer count, got {_describe(count)}")
    n = _native(count)
    if n < 0:
        raise ValueError(f"{name} needs a non-negative count, got {n}")
    pattern = _pattern(domain, _native(value))
    result = pattern << n if name == "shl" else pattern >> n
    if isinstance(domain, _BITS):
        return _bits(domain, result)
    return Domains.value(domain, domain.fit(name, result))


def _integer(target: Any, value: int | float) -> int:
    """An integer rounded from an IEEE 754 value, in `target`: an infinity saturates or overflows."""
    if isinstance(value, float):
        bound = target.bounds()[0 if value < 0 else 1]
        if target.overflow == "saturate" and bound is not None:
            return bound
        raise OverflowError(f"convert overflows {target.name()}: {'-' if value < 0 else ''}Infinity")
    return target.fit("convert", value)


def _converted(value: Any, target: Any) -> Any:
    """The native of `target` that keeps `value`."""
    source, native = _domain(value), _native(value)
    if source == target:
        return native
    if isinstance(source, _INTEGER) and isinstance(target, _INTEGER):
        return target.fit("convert", native)
    if isinstance(source, _INTEGER) and isinstance(target, _IEEE754):
        return Ieee754.from_integer(native, target.format, target.rounding)
    if isinstance(source, _IEEE754) and isinstance(target, _IEEE754):
        return Ieee754.convert(source.format, native, target.format, target.rounding)
    if isinstance(source, _IEEE754) and isinstance(target, _INTEGER):
        return _integer(target, Ieee754.to_integer(source.format, native, source.rounding))
    if isinstance(source, _BYTES) and isinstance(target, _BYTES):
        return native  # a value of the target's width, or none
    if (isinstance(target, _PACKED) and source == target.domain) or (isinstance(source, _PACKED) and source.domain == target):
        return native
    raise TypeError(f"cannot convert {_describe(value)} to {target.name()}")


def _convert(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    value = arguments[0]()
    return None if value is None else Domains.value(node.domain, _converted(value, node.domain))


def _width(domain: Any) -> int | None:
    """The width in bits of a fixed-width domain, or None."""
    if isinstance(domain, (_INTEGER, _BITS)) and isinstance(domain.width, int) and domain.width > 0:
        return domain.width
    if isinstance(domain, _BYTES) and domain.width is not None:
        return 8 * domain.width
    return Ieee754.WIDTHS.get(domain.format) if isinstance(domain, _IEEE754) else None


def _to_pattern(domain: Any, native: Any, width: int) -> int:
    """A fixed-width value's bit pattern, as an unsigned int."""
    if isinstance(domain, _INTEGER):
        return native % (1 << width)  # two's complement
    if isinstance(domain, _IEEE754):
        return Ieee754.to_bits(domain.format, native)
    return int.from_bytes(native, "big")


def _from_pattern(domain: Any, pattern: int, width: int) -> Any:
    """The native of a fixed-width domain with a bit pattern."""
    if isinstance(domain, _INTEGER):
        return pattern - (1 << width) if domain.signed and pattern >> (width - 1) else pattern
    if isinstance(domain, _IEEE754):
        return Ieee754.from_bits(domain.format, pattern)
    return pattern.to_bytes((width + 7) // 8, "big")


def _reinterpret(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    """The same bit pattern, big-endian, in a domain of the same width."""
    value = arguments[0]()
    if value is None:
        return None
    source, target = _domain(value), node.domain
    m, n = _width(source), _width(target)
    if m is None or n is None:
        raise TypeError(f"cannot reinterpret {_describe(value)} as {target.name()}")
    if m != n:
        raise TypeError(f"cannot reinterpret {_describe(value)} as {target.name()}: {m} bits and {n}")
    return Domains.value(target, _from_pattern(target, _to_pattern(source, _native(value), m), n))


def _pack(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    """A packed value's code, in its representation."""
    value = arguments[0]()
    if value is None:
        return None
    domain = _domain(value)
    if not isinstance(domain, _PACKED):
        raise TypeError(f"pack expects a packed value, got {_describe(value)}")
    representation, code = domain.representation, domain.code(value.value)
    native = code if isinstance(representation, _INTEGER) else _from_pattern(representation, code, representation.width)
    return Domains.value(representation, native)


def _unpack(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    """The value of the packed domain whose code a representation holds."""
    value = arguments[0]()
    if value is None:
        return None
    target = node.domain
    if not isinstance(target, _PACKED):
        raise TypeError(f"unpack needs a packed domain, got {target.name()}")
    representation = target.representation
    if _domain(value) != representation:
        raise TypeError(f"unpack expects {representation.name()}, got {_describe(value)}")
    code = _native(value) if isinstance(representation, _INTEGER) else int.from_bytes(value.value, "big")
    if code not in target.codes:
        raise ValueError(f"no member of {target.name()} has code {code}")
    return Domains.Value(target, target.domain.members[target.codes.index(code)])


OPERATIONS: dict[str, F.Implementation] = {
    "get": _strict(_read), "has": _strict(_read),
    **{name: _strict(_equality) for name in ("eq", "ne")},
    **{name: _strict(_order) for name in ("lt", "le", "gt", "ge")},
    **{name: _logic(name) for name in ("and", "or", "implies")}, "not": _strict(_not),
    **{name: _strict(_arithmetic) for name in ("add", "sub", "mul", "neg")},
    **{name: _strict(_bitwise) for name in ("bitand", "bitor", "bitxor", "bitnot")},
    **{name: _strict(_shift) for name in ("shl", "shr")},
    "convert": _convert, "reinterpret": _reinterpret, "pack": _pack, "unpack": _unpack,
}
"""The implementation of each core operation."""

_interpreter = F.Interpreter(Expressions.DIALECT, {"operation": OPERATIONS}, typed=Domains.Value)


def OfAny(expression: Expressions.OfAny.Spec, scope: Scope = None) -> Any:
    """The value of any expression, with the variables in `scope` bound."""
    return _interpreter(Expressions.OfAny.resolve(expression), scope)


def OfLiteral(expression: Expressions.OfLiteral.Spec, scope: Scope = None) -> Any:
    """The value of a literal."""
    return _interpreter(Expressions.OfLiteral.resolve(expression), scope)


def OfOperation(expression: Expressions.OfOperation.Spec, scope: Scope = None) -> Any:
    """The value of an operation, with the variables in `scope` bound."""
    return _interpreter(Expressions.OfOperation.resolve(expression), scope)


def OfVariable(expression: Expressions.OfVariable.Spec, scope: Scope = None) -> Any:
    """The value `scope` binds to a variable."""
    return _interpreter(Expressions.OfVariable.resolve(expression), scope)


def OfLet(expression: Expressions.OfLet.Spec, scope: Scope = None) -> Any:
    """The value of a let's body, with its name bound to its value and the variables in `scope` bound."""
    return _interpreter(Expressions.OfLet.resolve(expression), scope)


def predicate(predicate: Expressions.OfAny.Spec, value: Any) -> bool | None:
    """Whether `value` satisfies the rule `predicate`, evaluated with `this` bound to it; `None` if unknown."""
    result = OfAny(predicate, {"this": value})
    if result is not None and type(result) is not bool:
        raise TypeError(f"a predicate must be a bool, got {_type_name(result)}")
    return result
