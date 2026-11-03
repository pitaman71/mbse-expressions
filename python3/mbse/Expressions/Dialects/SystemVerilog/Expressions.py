"""Expressions of the SystemVerilog dialect: expressions and constraints of SystemVerilog (and Verilog), over its
4-state and 2-state vectors and reals, as its source writes them.

SystemVerilog's terms are values of its union, `Expressions.SystemVerilog.Expression`, the branch `systemverilog` of
`Expressions.Framework.Term`, which `install` defines and adds to `Term` by schema extension. Its branches are the
framework's `literal`, `variable` and `call`, whose shape these have, its own kinds, each a value object
`Expressions.SystemVerilog.<Kind>` named plainly, whose slots hold SystemVerilog's terms, and the framework's kinds of
invalid syntax (`error`, `missing`); a term carries no domain:

- `literal` (the framework's): a constant, an unsized decimal integer (an `integer`), a real, or a string literal, with
  its spelling (`text`) where it has one; it holds no bool nor bytes, which validation reports.
- `vector`: a sized literal, its bits MSB first (`0`, `1`, `x`, `z`), `signed` or not, written in its `base` (`b`, `o`,
  `d` or `h`; binary by default, and wherever the base cannot write the bits): `8'hFF`, `4'b10x1`, `8'sd5`.
- `variable` (the framework's): an identifier, the value bound to a variable.
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

There is no binding: translators substitute a let's value for its name. `DIALECT` reads the kinds. The writers (`constant`,
`vector`, ...) write terms through the builders, wherever a term is written, in a transaction. `Text.ToText` writes an
expression as SystemVerilog source, with its precedence.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "Writer", "constant", "vector", "identifier", "unary", "binary",
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


def install(txn: Any) -> Any:
    """SystemVerilog's union of its kinds, added to the framework's terms as the branch `systemverilog`, its own kinds,
    and its dialect's schema, whose singleton is `Expressions.SystemVerilog`: run after `Framework.install`, in a
    transaction of its own; run again, it writes nothing. Its `literal`, `variable` and `call` are the framework's."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.SystemVerilog/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "Term": S.OfUnion, "Expression": S.OfUnion,
                  "Vector": S.OfObject, "Unary": S.OfObject, "Binary": S.OfObject, "Conditional": S.OfObject,
                  "Concatenation": S.OfObject, "Replication": S.OfObject, "Select": S.OfObject, "Range": S.OfObject,
                  "Inside": S.OfObject, "Span": S.OfObject, "Cast": S.OfObject, "Member": S.OfObject,
                  "Method": S.OfObject, "Iterate": S.OfObject})  # Term: the framework's union, by name
        .spec([
            # its dialect: the singleton `Expressions.SystemVerilog`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.SystemVerilog.Dialect").ref(True).singleton("Expressions.SystemVerilog").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("systemverilog").schema([_.Dialect])]),
            # its union of its kinds: the framework's it reuses, its own, and invalid syntax
            lambda _: _.Expression.name("Expressions.SystemVerilog.Expression").branches([
                lambda t: t.name("literal").schema([Framework.Literal]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("call").schema([Framework.Call]),
                lambda t: t.name("vector").schema([_.Vector]),
                lambda t: t.name("unary").schema([_.Unary]),
                lambda t: t.name("binary").schema([_.Binary]),
                lambda t: t.name("conditional").schema([_.Conditional]),
                lambda t: t.name("concatenation").schema([_.Concatenation]),
                lambda t: t.name("replication").schema([_.Replication]),
                lambda t: t.name("select").schema([_.Select]),
                lambda t: t.name("range").schema([_.Range]),
                lambda t: t.name("inside").schema([_.Inside]),
                lambda t: t.name("span").schema([_.Span]),
                lambda t: t.name("cast").schema([_.Cast]),
                lambda t: t.name("member").schema([_.Member]),
                lambda t: t.name("method").schema([_.Method]),
                lambda t: t.name("iterate").schema([_.Iterate]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Vector.name("Expressions.SystemVerilog.Vector").properties({
                "value": S.OfStr, "signed": S.OfBool, "base": S.OfStr}),  # its bits, MSB first
            lambda _: _.Unary.name("Expressions.SystemVerilog.Unary").properties({
                "operator": S.OfStr, "operand": _.Expression}),
            lambda _: _.Binary.name("Expressions.SystemVerilog.Binary").properties({
                "operator": S.OfStr, "left": _.Expression, "right": _.Expression}),
            lambda _: _.Conditional.name("Expressions.SystemVerilog.Conditional").properties({
                "condition": _.Expression, "consequent": _.Expression, "alternative": _.Expression}),
            lambda _: _.Concatenation.name("Expressions.SystemVerilog.Concatenation").properties({
                "parts": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Expression]))}),
            lambda _: _.Replication.name("Expressions.SystemVerilog.Replication").properties({
                "count": _.Expression, "value": _.Expression}),
            lambda _: _.Select.name("Expressions.SystemVerilog.Select").properties({
                "value": _.Expression, "index": _.Expression}),
            lambda _: _.Range.name("Expressions.SystemVerilog.Range").properties({
                "value": _.Expression, "msb": _.Expression, "lsb": _.Expression}),
            lambda _: _.Inside.name("Expressions.SystemVerilog.Inside").properties({
                "value": _.Expression, "items": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Expression]))}),
            lambda _: _.Span.name("Expressions.SystemVerilog.Span").properties({
                "low": _.Expression, "high": _.Expression}),
            lambda _: _.Cast.name("Expressions.SystemVerilog.Cast").properties({
                "type": S.OfStr, "width": S.OfInt, "operand": _.Expression}),
            lambda _: _.Member.name("Expressions.SystemVerilog.Member").properties({
                "name": S.OfStr, "object": _.Expression}),
            lambda _: _.Method.name("Expressions.SystemVerilog.Method").properties({
                "name": S.OfStr, "array": _.Expression}),
            lambda _: _.Iterate.name("Expressions.SystemVerilog.Iterate").properties({
                "name": S.OfStr,  # the iterator
                "method": S.OfStr, "array": _.Expression, "body": _.Expression}),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog").schema([_.Expression])]),
        ])]))])


_SCALARS = (int, float, str)  # what a constant holds: no bool, no bytes


def _literal_check(record: Any) -> list[str]:
    """A literal holds what a constant of SystemVerilog does: the framework's literal may hold more."""
    value = F.attributes_of(record)["value"]
    return [] if type(value) in _SCALARS else [f"a SystemVerilog literal cannot hold a {type(value).__name__}"]


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
    return constant(value) if type(value) in _SCALARS else None


DIALECT = F.Dialect("SystemVerilog", {
    "literal": F.Kind(F.LITERAL, check=_literal_check),
    "vector": F.Kind(F.LITERAL, check=_vector_check, typed=_vector_typed),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",)),
    "binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",)),
    "conditional": F.Kind(F.APPLICATION, signature=Domains.CONDITIONAL),
    "concatenation": F.Kind(F.APPLICATION, signature=Domains.CONCATENATION),
    "replication": F.Kind(F.APPLICATION, signature=Domains.REPLICATION),
    "select": F.Kind(F.APPLICATION, signature=Domains.SELECT),
    "range": F.Kind(F.APPLICATION, signature=Domains.RANGE),
    "inside": F.Kind(F.APPLICATION, signature=Domains.INSIDE),
    "span": F.Kind(F.APPLICATION, signature=Domains.SPAN),
    "cast": F.Kind(F.APPLICATION, signature=Domains.CAST, check=_cast_check, typed=_cast_typed),
    "member": F.Kind(F.APPLICATION, signature=Domains.MEMBER, required=("name",)),
    "call": F.Kind(F.APPLICATION, operator="callable", signature=Domains.CALL, required=("callable",)),
    "method": F.Kind(F.APPLICATION, operator="name", signature=Domains.METHOD, required=("name",), check=_method_check),
    "iterate": F.Kind(F.QUANTIFIER, operator="method", signature=Domains.ITERATE, required=("name", "method"),
                      check=_iterate_check),
}, domain_of=Domains.of, literal=_native)
"""The SystemVerilog dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A SystemVerilog term, written through the builders where it is given."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


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

        return getattr(u, tag)(record)

    return Writer(write)


def constant(value: Any) -> Writer:
    """An unsized integer, a real or a string literal (validation reports any other value)."""
    return Writer(lambda u: u.literal(lambda r: r.value(lambda p: p.as_scalar(value))))


def vector(bits: str, signed: bool | None = None, base: str | None = None) -> Writer:
    """A sized literal of `bits`, MSB first."""
    return _kind("vector", {"value": bits, "signed": signed, "base": base})


def identifier(name: str) -> Writer:
    return _kind("variable", {"name": name})


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
