"""Expressions of the SystemVerilog dialect: expressions and constraints of SystemVerilog (and Verilog), over its
4-state and 2-state vectors and reals, as its source writes them.

SystemVerilog's terms are values of its `Term`, `Expressions.SystemVerilog.Expressions.Term`, the branch `systemverilog` of
`Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are the
framework's `literal`, `variable` and `call`, whose shape these have, its own kinds, each a value object
`Expressions.SystemVerilog.Expressions.<Kind>` named plainly, whose slots hold SystemVerilog's terms, and the framework's kinds of
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
- `cast`: `type'(x)`, to a type SystemVerilog defines, `signed` or `unsigned`, or `width'(x)`.
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

Its kinds of domain, the branches of its union `Expressions.SystemVerilog.Expressions.DomainKind`, which `install`
adds to the framework's `Expressions.Framework.DomainKind` as the branch `systemverilog`: IEEE 1800's integral types,
`logic` (`Expressions.SystemVerilog.Expressions.OfLogic`), 4-state, and `bit` (`OfBit`), 2-state, each of a `width` in
bits, `signed` or not; inferred (populated by hand until constraint resolution computes them) `least` and `greatest`,
of its known values, and `ordered`. `install` also adds its 2-state domains' schemas, each an `OfAny` of the scalar it
narrows (`Expressions.SystemVerilog.Expressions.int`, of ints; `real` and `shortreal`, of floats); a 4-state domain has
none, since no basic scalar holds x or z. `define` writes its domains, IEEE 1800's built-in types, owned by name:
`logic`, `reg`, `integer` and `time` of the kind `logic`; `bit`, `byte`, `shortint`, `int` and `longint` of `bit`;
`real` and `shortreal` of IEEE 754's `ieee754`, `binary64` and `binary32`. Each name is its own domain: `reg` is
`logic`'s equal, not its synonym.

What reads a named type reads its stored domain, through the store of the term's holder (`Proxies.store_of`), by
`Domains.named`: validation, a cast's type (`int'(x)`), which must be a type SystemVerilog defines in that store;
inference, a constant's type (`integer`, `longint`, `real`), a cast's and `===`'s (`bit`); and evaluation (see
`Evaluators`). A lone term reaches no store: reading a type, it is refused (mbse-schemas' TypeError, "the value does
not belong to a store"), and a term that reads none, a sized vector's, is read as before.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework import Proxies

from . import Domains

__all__ = ["install", "define", "DIALECT", "Writer", "constant", "vector", "identifier", "unary", "binary",
           "conditional", "concatenation", "replication", "select", "range_", "inside", "span", "cast", "member", "call",
           "method", "iterate", "SYSTEM", "METHODS", "REDUCTIONS"]

_SIGNEDNESS = ("signed", "unsigned")  # what a cast may name besides a type SystemVerilog defines
SYSTEM = ("$signed", "$unsigned", "$clog2", "$bits", "$countones", "$onehot", "$onehot0", "$isunknown")
"""The system functions."""
REDUCTIONS = ("sum", "product", "and", "or", "xor")
"""The array reduction methods, which may have a `with` clause."""
METHODS = ("size", *REDUCTIONS, "min", "max", "unique")
"""The array methods of no arguments."""
_BASES = {"b": 1, "o": 3, "h": 4, "d": 0}


def install(txn: Any) -> Any:
    """SystemVerilog's union of its kinds, added to the framework's terms as the branch `systemverilog`, its own kinds,
    and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Expressions`: run after `Framework.install`, in a
    transaction of its own; run again, it writes nothing. Its `literal`, `variable` and `call` are the framework's.
    Its holder, `Expressions.SystemVerilog.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root`
    narrowed to its `Term`. Its kinds of domain, `logic` and `bit`, and its 2-state domains' schemas; its domains `define`
    writes after it. Run after IEEE 754's install, whose kind its reals are of."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.SystemVerilog.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfLogic": S.OfObject, "OfBit": S.OfObject,  # Kinds: the framework's
                  "Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion, "Expression": S.OfObject,
                  "Vector": S.OfObject, "Unary": S.OfObject, "Binary": S.OfObject, "Conditional": S.OfObject,
                  "Concatenation": S.OfObject, "Replication": S.OfObject, "Select": S.OfObject, "Range": S.OfObject,
                  "Inside": S.OfObject, "Span": S.OfObject, "Cast": S.OfObject, "Member": S.OfObject,
                  "Method": S.OfObject, "Iterate": S.OfObject,  # FrameworkTerm: the framework's union, by name
                  "bit": S.OfAny, "byte": S.OfAny, "shortint": S.OfAny, "int": S.OfAny, "longint": S.OfAny,
                  "real": S.OfAny, "shortreal": S.OfAny})
        .spec([
            # its dialect: the singleton `Expressions.SystemVerilog.Expressions`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.SystemVerilog.Expressions.Dialect").ref(True).singleton("Expressions.SystemVerilog.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("systemverilog").schema([_.Dialect])]),
            # its union of its kinds: the framework's it reuses, its own, and invalid syntax
            lambda _: _.Term.name("Expressions.SystemVerilog.Expressions.Term").branches([
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
            lambda _: _.Vector.name("Expressions.SystemVerilog.Expressions.Vector").properties({
                "value": S.OfStr, "signed": S.OfBool, "base": S.OfStr}),  # its bits, MSB first
            lambda _: _.Unary.name("Expressions.SystemVerilog.Expressions.Unary").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.Binary.name("Expressions.SystemVerilog.Expressions.Binary").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term}),
            lambda _: _.Conditional.name("Expressions.SystemVerilog.Expressions.Conditional").properties({
                "condition": _.Term, "consequent": _.Term, "alternative": _.Term}),
            lambda _: _.Concatenation.name("Expressions.SystemVerilog.Expressions.Concatenation").properties({
                "parts": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))}),
            lambda _: _.Replication.name("Expressions.SystemVerilog.Expressions.Replication").properties({
                "count": _.Term, "value": _.Term}),
            lambda _: _.Select.name("Expressions.SystemVerilog.Expressions.Select").properties({
                "value": _.Term, "index": _.Term}),
            lambda _: _.Range.name("Expressions.SystemVerilog.Expressions.Range").properties({
                "value": _.Term, "msb": _.Term, "lsb": _.Term}),
            lambda _: _.Inside.name("Expressions.SystemVerilog.Expressions.Inside").properties({
                "value": _.Term, "items": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))}),
            lambda _: _.Span.name("Expressions.SystemVerilog.Expressions.Span").properties({
                "low": _.Term, "high": _.Term}),
            lambda _: _.Cast.name("Expressions.SystemVerilog.Expressions.Cast").properties({
                "type": S.OfStr, "width": S.OfInt, "operand": _.Term}),
            lambda _: _.Member.name("Expressions.SystemVerilog.Expressions.Member").properties({
                "name": S.OfStr, "object": _.Term}),
            lambda _: _.Method.name("Expressions.SystemVerilog.Expressions.Method").properties({
                "name": S.OfStr, "array": _.Term}),
            lambda _: _.Iterate.name("Expressions.SystemVerilog.Expressions.Iterate").properties({
                "name": S.OfStr,  # the iterator
                "method": S.OfStr, "array": _.Term, "body": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
            # to its `Term`
            lambda _: _.Expression.name("Expressions.SystemVerilog.Expressions.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            # --- its kinds of domain: IEEE 1800's integrals, 4-state and 2-state, their parameters, then what follows ---
            lambda _: _.OfLogic.name("Expressions.SystemVerilog.Expressions.OfLogic").properties({
                "width": S.OfInt, "signed": S.OfBool,
                "least": S.OfInt, "greatest": S.OfInt, "ordered": S.OfBool}),  # inferred, of its known values
            lambda _: _.OfBit.name("Expressions.SystemVerilog.Expressions.OfBit").properties({
                "width": S.OfInt, "signed": S.OfBool,
                "least": S.OfInt, "greatest": S.OfInt, "ordered": S.OfBool}),  # inferred
            lambda _: _.DomainKind.name("Expressions.SystemVerilog.Expressions.DomainKind").branches([
                lambda t: t.name("logic").schema([_.OfLogic]),
                lambda t: t.name("bit").schema([_.OfBit]),
            ]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog").schema([_.DomainKind])]),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog").schema([_.Term])]),
            # --- its 2-state domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its
            # domain; a 4-state domain has none: no basic scalar holds x or z ---
            lambda _: _.bit.name("Expressions.SystemVerilog.Expressions.bit").schemas([S.OfInt]),
            lambda _: _.byte.name("Expressions.SystemVerilog.Expressions.byte").schemas([S.OfInt]),
            lambda _: _.shortint.name("Expressions.SystemVerilog.Expressions.shortint").schemas([S.OfInt]),
            lambda _: _.int.name("Expressions.SystemVerilog.Expressions.int").schemas([S.OfInt]),
            lambda _: _.longint.name("Expressions.SystemVerilog.Expressions.longint").schemas([S.OfInt]),
            lambda _: _.real.name("Expressions.SystemVerilog.Expressions.real").schemas([S.OfFloat]),
            lambda _: _.shortreal.name("Expressions.SystemVerilog.Expressions.shortreal").schemas([S.OfFloat]),
        ])]))])


def define(txn: Any) -> Any:
    """SystemVerilog's dialect as data: the singleton `Expressions.SystemVerilog.Expressions` owning its domains, IEEE
    1800's built-in types, by name (`domains`, through `Expressions.Framework.Defines`), each with its parameters and
    its inferred properties, and each 2-state one related to its schema (`Expressions.SystemVerilog.Expressions.int`)
    by `Expressions.Framework.HasDomain`. Run after `install`, in a transaction of its own; run again, it writes
    nothing. Its frame binds the dialect (`dialect`) and each domain by its name:
    `store.transaction(SystemVerilog.define)[0]["int"]`."""
    SV, Domain = txn.Expressions.SystemVerilog.Expressions, txn.Expressions.Framework.Domain
    return txn.uid("mbse.Expressions.SystemVerilog.Expressions.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": SV.Dialect, "logic": Domain, "reg": Domain, "integer": Domain, "time": Domain,
                  "bit": Domain, "byte": Domain, "shortint": Domain, "int": Domain, "longint": Domain,
                  "real": Domain, "shortreal": Domain})
        .spec([
            lambda _: _.dialect.domains({
                "logic": lambda e: e.domain(_.logic), "reg": lambda e: e.domain(_.reg),
                "integer": lambda e: e.domain(_.integer), "time": lambda e: e.domain(_.time),
                "bit": lambda e: e.domain(_.bit), "byte": lambda e: e.domain(_.byte),
                "shortint": lambda e: e.domain(_.shortint), "int": lambda e: e.domain(_.int),
                "longint": lambda e: e.domain(_.longint),
                "real": lambda e: e.domain(_.real), "shortreal": lambda e: e.domain(_.shortreal),
            }),
            # 4-state, with no schema: least and greatest of its known values; "logic and reg denote the same type"
            # (IEEE 1800-2023), each its own domain, of equal properties: no synonyms
            lambda _: _.logic.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.logic(
                lambda d: d.width(1).signed(False).least(0).greatest(1).ordered(True)))))),
            lambda _: _.reg.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.logic(
                lambda d: d.width(1).signed(False).least(0).greatest(1).ordered(True)))))),  # logic's equal
            lambda _: _.integer.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.logic(
                lambda d: d.width(32).signed(True).least(-2147483648).greatest(2147483647).ordered(True)))))),
            lambda _: _.time.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.logic(
                lambda d: d.width(64).signed(False).least(0).greatest(18446744073709551615).ordered(True)))))),
            # 2-state
            lambda _: _.bit.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(1).signed(False).least(0).greatest(1).ordered(True)))))).schema([SV.bit]),
            lambda _: _.byte.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(8).signed(True).least(-128).greatest(127).ordered(True)))))).schema([SV.byte]),
            lambda _: _.shortint.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(16).signed(True).least(-32768).greatest(32767).ordered(True)))))).schema([SV.shortint]),
            lambda _: _.int.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(32).signed(True).least(-2147483648).greatest(2147483647).ordered(True)))))).schema([SV.int]),
            lambda _: _.longint.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(64).signed(True).least(-9223372036854775808).greatest(9223372036854775807).ordered(
                    True)))))).schema([SV.longint]),
            # IEEE 754's, as its own binary64 and binary32 are
            lambda _: _.real.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64).radix(2).precision(53).emax(1023).ordered(
                    True)))))).schema([SV.real]),
            lambda _: _.shortreal.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary32").rounding("roundTiesToEven").width(32).radix(2).precision(24).emax(127).ordered(
                    True)))))).schema([SV.shortreal]),
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
    """A cast names a positive width, a signedness, or a type SystemVerilog defines in the store of the term's holder."""
    attributes = F.attributes_of(record)
    type_, width = attributes.get("type"), attributes.get("width")
    if (type_ is None) == (width is None):
        return ["a cast names a type or a width, not both nor neither"]
    if width is not None:
        return [] if width > 0 else [f"a cast's width must be positive, got {width}"]
    if type_ not in _SIGNEDNESS:
        store = Proxies.store_of(record)
        try:
            Domains.named(store, type_)
        except ValueError as error:  # the store defines no such type
            return [str(error)]
    return []


def _cast_typed(record: Any) -> Any:
    """A cast to a type: that type, read from the store of the term's holder; one to a width or a signedness is sized by
    its operand."""
    type_ = F.attributes_of(record).get("type")
    return None if type_ in (None, *_SIGNEDNESS) else Domains.named(Proxies.store_of(record), type_)


def _literal_typed(record: Any) -> Any:
    """A constant's type, read from the store of the term's holder; None where no type holds it (a string)."""
    name = Domains.of(F.attributes_of(record)["value"])
    return None if name is None else Domains.named(Proxies.store_of(record), name)


def _binary_typed(record: Any) -> Any:
    """`===`'s and `!==`'s type, `bit`, read from the store of the term's holder; the others' are their operands'."""
    operator = F.attributes_of(record)["operator"]
    return Domains.named(Proxies.store_of(record), "bit") if operator in ("===", "!==") else None


def _untyped(value: Any) -> Any:
    """The domain of a constant no type holds: a string, or an int beyond 64 bits (`Kind.typed` reads the others')."""
    return Domains.Anything


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


DIALECT = F.Dialect("SystemVerilog.Expressions", {
    "literal": F.Kind(F.LITERAL, check=_literal_check, typed=_literal_typed),
    "vector": F.Kind(F.LITERAL, check=_vector_check, typed=_vector_typed),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",)),
    "binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",),
                     typed=_binary_typed),
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
}, domain_of=_untyped, literal=_native)
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
