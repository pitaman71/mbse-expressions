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
  `$isunknown`) or a function the scope provides, named by its `callable`: the framework's `call`, read as this
  dialect reads it.
- `method`: an array method of no arguments, `array.name()`: `size`, the reductions `sum`, `product`, `and`, `or` and
  `xor`, and the locators `min`, `max` and `unique`, which give queues.
- `iterate`: a reduction with a `with` clause, `array.method(name) with (body)`, which binds `name` (the iterator) to
  each item of the array within the body and reduces the body's values: `ports.and(p) with (p.pin > 0)`.

There is no binding: translators substitute a let's value for its name. `install` adds the kinds (but `call`, the
framework's) to `Expressions.Framework.Term` by schema extension, each a value object
`Expressions.SystemVerilog.<Kind>` with a `domain`, as the branch `systemverilog_<kind>` (`PREFIX`): dialects share
kind names, and a branch's name is unique in the union; `DIALECT` reads them. The writers (`constant`, `vector`, ...)
write terms through the builders, wherever a term is written, in a transaction. `Text.ToText` writes an expression as
SystemVerilog source, with its precedence.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "PREFIX", "kind_of", "Writer", "constant", "vector", "identifier", "unary", "binary",
           "conditional", "concatenation", "replication", "select", "range_", "inside", "span", "cast", "member", "call",
           "method", "iterate", "CASTS", "SYSTEM", "METHODS", "REDUCTIONS"]

CASTS = (*Domains.TYPES, "signed", "unsigned")
"""What a cast may name: a built-in type, or a signedness."""
SYSTEM = ("$signed", "$unsigned", "$clog2", "$bits", "$countones", "$onehot", "$onehot0", "$isunknown")
"""The system functions."""
REDUCTIONS = ("sum", "product", "and", "or", "xor")
"""The array reduction methods, which may have a `with` clause."""
METHODS = ("size", *REDUCTIONS, "min", "max", "unique")
"""The array methods of no arguments."""
_BASES = {"b": 1, "o": 3, "h": 4, "d": 0}
PREFIX = "systemverilog_"
"""What names each branch this dialect adds to `Expressions.Framework.Term`: `systemverilog_binary`, ..."""


def kind_of(term: Any) -> tuple[str, Any]:
    """A term's kind, as this dialect names it (its branch's tag without `PREFIX`: `binary`, `call`), and its record."""
    tag, record = F.kind_of(term)
    return tag.removeprefix(PREFIX), record


def install(txn: Any) -> Any:
    """SystemVerilog's kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own.
    Its `call` is the framework's."""
    S = txn.Schemas

    def kind(name: str, properties: Any) -> Any:  # every term has a domain, by name
        return lambda _: getattr(_, name).name(f"Expressions.SystemVerilog.{name}").properties(
            {**properties(_), "domain": S.OfStr})

    kinds = {
        "Constant": lambda _: {"value": S.OfAny(lambda a: a.schemas([S.OfInt, S.OfFloat, S.OfStr]))},
        "Vector": lambda _: {"value": S.OfStr, "signed": S.OfBool, "base": S.OfStr},  # its bits, MSB first
        "Identifier": lambda _: {"name": S.OfStr},
        "Unary": lambda _: {"operator": S.OfStr, "operand": _.Term},
        "Binary": lambda _: {"operator": S.OfStr, "left": _.Term, "right": _.Term},
        "Conditional": lambda _: {"condition": _.Term, "consequent": _.Term, "alternative": _.Term},
        "Concatenation": lambda _: {"parts": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))},
        "Replication": lambda _: {"count": _.Term, "value": _.Term},
        "Select": lambda _: {"value": _.Term, "index": _.Term},
        "Range": lambda _: {"value": _.Term, "msb": _.Term, "lsb": _.Term},
        "Inside": lambda _: {"value": _.Term, "items": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))},
        "Span": lambda _: {"low": _.Term, "high": _.Term},
        "Cast": lambda _: {"type": S.OfStr, "width": S.OfInt, "operand": _.Term},
        "Member": lambda _: {"name": S.OfStr, "object": _.Term},
        "Method": lambda _: {"name": S.OfStr, "array": _.Term},
        "Iterate": lambda _: {"name": S.OfStr, "method": S.OfStr, "array": _.Term, "body": _.Term},  # name: the iterator
    }
    return txn.uid("mbse.Expressions.SystemVerilog/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion, **{name: S.OfObject for name in kinds}})  # the framework's union, by its name
        .spec([
            *(kind(name, properties) for name, properties in kinds.items()),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # branches added: schema extension
                lambda t, name=name: t.name(PREFIX + name.lower()).schema([getattr(_, name)]) for name in kinds]),
        ])]))])


def _constant_check(record: Any) -> list[str]:
    value = F.attributes_of(record)["value"]
    return [] if type(value) in (int, float, str) else [f"a constant cannot hold a {type(value).__name__}"]


def _vector_check(record: Any) -> list[str]:
    attributes = F.attributes_of(record)
    value, base = attributes.get("value"), attributes.get("base")
    problems = [] if value and all(b in "01xz" for b in value) else [
        f"a vector's bits must be 0, 1, x and z, at least one, got {value!r}"]
    if base not in (None, *_BASES):
        problems.append(f"a vector's base must be b, o, d or h, got {base!r}")
    return problems


def _vector_typed(record: Any) -> Any:
    if _vector_check(record):
        return None
    attributes = F.attributes_of(record)
    return Domains.vector(len(attributes["value"]), bool(attributes.get("signed")))


def _cast_check(record: Any) -> list[str]:
    attributes = F.attributes_of(record)
    type_, width = attributes.get("type"), attributes.get("width")
    if (type_ is None) == (width is None):
        return ["a cast names a type or a width, not both nor neither"]
    if width is not None:
        return [] if width > 0 else [f"a cast's width must be positive, got {width}"]
    return [] if type_ in CASTS else [f"a cast's type must be a built-in type, signed or unsigned, got {type_!r}"]


def _cast_typed(record: Any) -> Any:
    return Domains.TYPES.get(F.attributes_of(record).get("type"))


def _method_check(record: Any) -> list[str]:
    name = F.attributes_of(record).get("name")
    return [] if name in METHODS else [f"an array method must be one of {', '.join(METHODS)}, got {name!r}"]


def _iterate_check(record: Any) -> list[str]:
    method = F.attributes_of(record).get("method")
    if method not in REDUCTIONS:
        return [f"an iteration's method must be one of {', '.join(REDUCTIONS)}, got {method!r}"]
    return []


def _native(value: Any) -> Writer | None:
    """The constant of a native value: an int, a float or a str."""
    return constant(value) if type(value) in (int, float, str) else None


DIALECT = F.Dialect("SystemVerilog", {
    PREFIX + "constant": F.Kind(F.LITERAL, check=_constant_check),
    PREFIX + "vector": F.Kind(F.LITERAL, check=_vector_check, typed=_vector_typed),
    PREFIX + "identifier": F.Kind(F.REFERENCE, required=("name",)),
    PREFIX + "unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",)),
    PREFIX + "binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",)),
    PREFIX + "conditional": F.Kind(F.APPLICATION, signature=Domains.CONDITIONAL),
    PREFIX + "concatenation": F.Kind(F.APPLICATION, signature=Domains.CONCATENATION),
    PREFIX + "replication": F.Kind(F.APPLICATION, signature=Domains.REPLICATION),
    PREFIX + "select": F.Kind(F.APPLICATION, signature=Domains.SELECT),
    PREFIX + "range": F.Kind(F.APPLICATION, signature=Domains.RANGE),
    PREFIX + "inside": F.Kind(F.APPLICATION, signature=Domains.INSIDE),
    PREFIX + "span": F.Kind(F.APPLICATION, signature=Domains.SPAN),
    PREFIX + "cast": F.Kind(F.APPLICATION, signature=Domains.CAST, check=_cast_check, typed=_cast_typed),
    PREFIX + "member": F.Kind(F.APPLICATION, signature=Domains.MEMBER, required=("name",)),
    "call": F.Kind(F.APPLICATION, operator="callable", signature=Domains.CALL, required=("callable",)),
    PREFIX + "method": F.Kind(F.APPLICATION, operator="name", signature=Domains.METHOD, required=("name",), check=_method_check),
    PREFIX + "iterate": F.Kind(F.QUANTIFIER, operator="method", signature=Domains.ITERATE, required=("name", "method"),
                      check=_iterate_check),
}, domain_of=Domains.of, literal=_native)
"""The SystemVerilog dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A SystemVerilog term, written through the builders where it is given."""

    __slots__ = ()


def _spec(value: Any) -> F.Writer:
    return DIALECT.spec(value)


def _kind(tag: str, attributes: dict[str, Any], slots: dict[str, Any] | None = None,
          variadic: tuple[str, list[Any]] | None = None) -> Writer:
    """The writer of a term of `tag`: its attributes (those not None), its slots (specs) and its variadic arguments."""
    specs = {name: _spec(value) for name, value in (slots or {}).items()}
    elements = None if variadic is None else (variadic[0], [_spec(value) for value in variadic[1]])

    def write(u: Any) -> Any:
        def record(r: Any) -> Any:
            for name, value in attributes.items():
                if value is not None:
                    getattr(r, name)(lambda p, value=value: p.as_scalar(value))
            for name, written in specs.items():
                getattr(r, name)(written)
            if elements is not None:
                getattr(r, elements[0])(elements[1])
            return r

        return getattr(u, tag if tag == "call" else PREFIX + tag)(record)

    return Writer(write)


def constant(value: Any) -> Writer:
    """An unsized integer, a real or a string literal."""
    def write(u: Any) -> Any:
        return u.systemverilog_constant(lambda r: r.value(lambda p: p.as_scalar(value)))

    return Writer(write)


def vector(bits: str, signed: bool | None = None, base: str | None = None) -> Writer:
    """A sized literal of `bits`, MSB first."""
    return _kind("vector", {"value": bits, "signed": signed, "base": base})


def identifier(name: str) -> Writer:
    return _kind("identifier", {"name": name})


def unary(operator: str, operand: Any) -> Writer:
    """`<operator> operand`; the operand is a spec (a native value is a constant)."""
    return _kind("unary", {"operator": operator}, {"operand": operand})


def binary(operator: str, left: Any, right: Any) -> Writer:
    return _kind("binary", {"operator": operator}, {"left": left, "right": right})


def conditional(condition: Any, consequent: Any, alternative: Any) -> Writer:
    return _kind("conditional", {}, {"condition": condition, "consequent": consequent, "alternative": alternative})


def concatenation(*parts: Any) -> Writer:
    return _kind("concatenation", {}, None, ("parts", list(parts)))


def replication(count: Any, value: Any) -> Writer:
    return _kind("replication", {}, {"count": count, "value": value})


def select(value: Any, index: Any) -> Writer:
    return _kind("select", {}, {"value": value, "index": index})


def range_(value: Any, msb: Any, lsb: Any) -> Writer:
    """`value[msb:lsb]`."""
    return _kind("range", {}, {"value": value, "msb": msb, "lsb": lsb})


def inside(value: Any, *items: Any) -> Writer:
    return _kind("inside", {}, {"value": value}, ("items", list(items)))


def span(low: Any, high: Any) -> Writer:
    """`[low:high]`, an item of `inside`."""
    return _kind("span", {}, {"low": low, "high": high})


def cast(type_or_width: str | int, operand: Any) -> Writer:
    """`type'(operand)`, or `width'(operand)` for an int."""
    if type(type_or_width) is int:
        return _kind("cast", {"width": type_or_width}, {"operand": operand})
    return _kind("cast", {"type": type_or_width}, {"operand": operand})


def member(object: Any, name: str) -> Writer:
    return _kind("member", {"name": name}, {"object": object})


def call(function: str, *arguments: Any) -> Writer:
    """`function(arguments)`: the framework's `call`, its `callable` the function's name."""
    return _kind("call", {"callable": function}, None, ("arguments", list(arguments)))


def method(array: Any, name: str) -> Writer:
    """`array.name()`."""
    return _kind("method", {"name": name}, {"array": array})


def iterate(array: Any, method: str, name: str, body: Any) -> Writer:
    """`array.method(name) with (body)`."""
    return _kind("iterate", {"name": name, "method": method}, {"array": array, "body": body})
