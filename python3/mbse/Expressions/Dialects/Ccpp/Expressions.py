"""Expressions of the Ccpp dialect: expressions of C and C++ (a superset of both), over their arithmetic types, as their
source writes them.

Ccpp's terms are the framework's `variable` and `call`, whose shape C's identifiers and calls have, and kinds of its
own, which `install` adds to `Expressions.Framework.Term` by schema extension, each a branch tagged `ccpp_<kind>`
(dialects share kind names):

- `constant`: a number, a bool or a string literal (`value`), and optionally its type (`type`, one of `Domains.TYPES`),
  written with a suffix (`5u`, `5ull`, `1.5f`, `1.5L`) or, for a type without one, a cast (`(uint8_t)5`). Without a
  type an int is the first of `int`, `long` and `unsigned long` that holds it, and a float a `double`. Its own, not
  the framework's `literal`: it has C's `type` besides its `domain`.
- `variable`: the framework's: an identifier, the value bound to a variable (`name`).
- `unary` (`operator`: `+`, `-`, `!`, `~`; `operand`) and `binary` (`operator`: `*`, `/`, `%`, `+`, `-`, `<<`, `>>`,
  `<`, `<=`, `>`, `>=`, `==`, `!=`, `&`, `^`, `|`, `&&`, `||`; `left`, `right`).
- `conditional`: `condition ? consequent : alternative`.
- `cast`: `(type) operand`, to one of `Domains.TYPES`.
- `member`: `object.name`, or `object->name` with the `operator` `->`.
- `subscript`: `array[index]`.
- `call`: the framework's: a function the scope provides (`callable`), applied to ordered `arguments`.

Every kind has a `domain`, by name, as every term does; C's own `type` is what a constant and a cast are written with.
There is no binding: translators substitute a let's value for its name. `DIALECT` reads the kinds (`Terms.Dialect`).
The writers (`constant`, `identifier`, ...) write terms through the builders, in a transaction:
`store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`. `Text.ToText` writes an expression as C source,
with C's precedence, e.g. `x.width >= 8u && (uint8_t)(a + b) == 0`.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "Writer", "constant", "identifier", "unary", "binary", "conditional", "cast", "member",
           "subscript", "call", "SUFFIXES"]

SUFFIXES = {"unsigned int": "u", "long": "l", "unsigned long": "ul", "long long": "ll", "unsigned long long": "ull",
            "float": "f", "long double": "L"}
"""The suffixes of typed constants: `5u`, `5ull`, `1.5f`, ...; other types are written with a cast."""


def install(txn: Any) -> Any:
    """Ccpp's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own."""
    S = txn.Schemas
    return txn.uid("mbse.Expressions.Ccpp/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion,  # the framework's union, found by its name
                  "Constant": S.OfObject, "Unary": S.OfObject, "Binary": S.OfObject, "Conditional": S.OfObject,
                  "Cast": S.OfObject, "Member": S.OfObject, "Subscript": S.OfObject})
        .spec([
            lambda _: _.Constant.name("Expressions.Ccpp.Constant").properties({
                "value": S.OfAny(lambda a: a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr])),
                "type": S.OfStr,  # C's, by default its value's
                "domain": S.OfStr,  # every term has a domain
            }),
            lambda _: _.Unary.name("Expressions.Ccpp.Unary").properties({
                "operator": S.OfStr, "operand": _.Term, "domain": S.OfStr}),
            lambda _: _.Binary.name("Expressions.Ccpp.Binary").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term, "domain": S.OfStr}),
            lambda _: _.Conditional.name("Expressions.Ccpp.Conditional").properties({
                "condition": _.Term, "consequent": _.Term, "alternative": _.Term, "domain": S.OfStr}),
            lambda _: _.Cast.name("Expressions.Ccpp.Cast").properties({
                "type": S.OfStr, "operand": _.Term, "domain": S.OfStr}),
            lambda _: _.Member.name("Expressions.Ccpp.Member").properties({
                "name": S.OfStr,
                "operator": S.OfStr,  # '.' (by default) or '->'
                "object": _.Term, "domain": S.OfStr}),
            lambda _: _.Subscript.name("Expressions.Ccpp.Subscript").properties({
                "array": _.Term, "index": _.Term, "domain": S.OfStr}),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # branches added: schema extension
                lambda t: t.name("ccpp_constant").schema([_.Constant]),
                lambda t: t.name("ccpp_unary").schema([_.Unary]),
                lambda t: t.name("ccpp_binary").schema([_.Binary]),
                lambda t: t.name("ccpp_conditional").schema([_.Conditional]),
                lambda t: t.name("ccpp_cast").schema([_.Cast]),
                lambda t: t.name("ccpp_member").schema([_.Member]),
                lambda t: t.name("ccpp_subscript").schema([_.Subscript]),
            ]),
        ])]))])


def _type_problems(what: str, name: Any) -> list[str]:
    return [] if name in Domains.TYPES else [f"{what} type must be one of C's arithmetic types, got {name!r}"]


def _typed(record: Any) -> Any:
    """The C type a constant or a cast names, or None (validation reports a name that is not one)."""
    name = F.attributes_of(record).get("type")
    return Domains.TYPES.get(name) if type(name) is str else None


def _constant_check(record: Any) -> list[str]:
    """A constant's type, when it has one, is an arithmetic type that holds its value."""
    attributes = F.attributes_of(record)
    if attributes.get("type") is None:
        return []
    problems = _type_problems("a constant's", attributes["type"])
    if not problems and not Domains.TYPES[attributes["type"]].contains(attributes["value"]):
        problems.append(f"a constant of {attributes['type']} cannot hold {attributes['value']!r}")
    return problems


def _cast_check(record: Any) -> list[str]:
    name = F.attributes_of(record).get("type")
    return [] if name is None else _type_problems("a cast's", name)


def _member_check(record: Any) -> list[str]:
    operator = F.attributes_of(record).get("operator")
    return [] if operator in (None, ".", "->") else [f"a member's operator must be '.' or '->', got {operator!r}"]


def _native(value: Any) -> Writer | None:
    """The constant of a native value: a number, a bool or a string."""
    return constant(value) if type(value) in (bool, int, float, str) else None


DIALECT = F.Dialect("Ccpp", {
    "ccpp_constant": F.Kind(F.LITERAL, check=_constant_check, typed=_typed),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "ccpp_unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",)),
    "ccpp_binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",)),
    "ccpp_conditional": F.Kind(F.APPLICATION, signature=Domains.CONDITIONAL),
    "ccpp_cast": F.Kind(F.APPLICATION, signature=Domains.CAST, required=("type",), check=_cast_check, typed=_typed),
    "ccpp_member": F.Kind(F.APPLICATION, signature=Domains.MEMBER, required=("name",), check=_member_check),
    "ccpp_subscript": F.Kind(F.APPLICATION, signature=Domains.SUBSCRIPT),
    "call": F.Kind(F.APPLICATION, operator="callable", signature=Domains.CALL, required=("callable",)),
}, domain_of=Domains.of, literal=_native)
"""The Ccpp dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A term of the Ccpp dialect, written through the builders where it is given (a spec)."""

    __slots__ = ()


def _spec(value: Any) -> Any:
    return DIALECT.spec(value)


def constant(value: Any, type: str | None = None) -> Writer:
    """The constant `value`, of the C type `type` (by default, its value's)."""

    def record(r: Any) -> Any:
        if value is not None:
            r.value(lambda p: p.as_scalar(value))
        return r if type is None else r.type(type)

    return Writer(lambda u: u.ccpp_constant(record))


def identifier(name: str) -> Writer:
    """The variable `name`."""
    return Writer(lambda u: u.variable(lambda r: r.name(name)))


def unary(operator: str, operand: Any) -> Writer:
    """`<operator> operand`; the operand is a spec (a native value is a constant)."""
    operand = _spec(operand)
    return Writer(lambda u: u.ccpp_unary(lambda r: r.operator(operator).operand(operand)))


def binary(operator: str, left: Any, right: Any) -> Writer:
    """`left <operator> right`; each operand is a spec."""
    left, right = _spec(left), _spec(right)
    return Writer(lambda u: u.ccpp_binary(lambda r: r.operator(operator).left(left).right(right)))


def conditional(condition: Any, consequent: Any, alternative: Any) -> Writer:
    """`condition ? consequent : alternative`."""
    condition, consequent, alternative = _spec(condition), _spec(consequent), _spec(alternative)
    return Writer(lambda u: u.ccpp_conditional(
        lambda r: r.condition(condition).consequent(consequent).alternative(alternative)))


def cast(type: str, operand: Any) -> Writer:
    """`(type) operand`."""
    operand = _spec(operand)
    return Writer(lambda u: u.ccpp_cast(lambda r: r.type(type).operand(operand)))


def member(object: Any, name: str, operator: str | None = None) -> Writer:
    """`object.name`, or `object->name` with the operator '->'."""
    object = _spec(object)

    def record(r: Any) -> Any:
        r.name(name)
        if operator is not None:
            r.operator(operator)
        return r.object(object)

    return Writer(lambda u: u.ccpp_member(record))


def subscript(array: Any, index: Any) -> Writer:
    """`array[index]`."""
    array, index = _spec(array), _spec(index)
    return Writer(lambda u: u.ccpp_subscript(lambda r: r.array(array).index(index)))


def call(function: str, *arguments: Any) -> Writer:
    """`function(arguments...)`: the framework's call, of a function the scope provides."""
    specs = [_spec(argument) for argument in arguments]
    return Writer(lambda u: u.call(lambda r: r.callable(function).arguments(specs)))
