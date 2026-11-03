"""Expressions of the C dialect: expressions of C, C11 to C23, over its arithmetic types, as its source writes them.
`Cpp`, the C++ dialect, shares its kinds.

C's terms are values of its union, `Expressions.C.Expression`, the branch `c` of `Expressions.Framework.Term`, which
`install` defines and adds to `Term` by schema extension. Its branches are the framework's `variable` and `call`, whose
shape C's identifiers and calls have, kinds of its own, each a value object `Expressions.C.<Kind>` named plainly, and
the framework's kinds of invalid syntax (`error`, `missing`). Its own kinds are C++'s too: each schema is defined here
once and listed by `Cpp`'s union as well, so their slots hold `Expressions.Framework.Term`, a term of either, as the
framework's shared kinds' do; that a C term holds only C's terms is validation's (`Terms.Dialect`), not the schema's.
Each kind records the standards that have it (`Kind.standards`: `STANDARDS`, every one, as far as these kinds go):

- `constant`: a number, a bool or a string literal (`value`), and optionally its type (`type`, one of `Domains.TYPES`),
  written with a suffix (`5u`, `5ull`, `1.5f`, `1.5L`) or, for a type without one, a cast (`(uint8_t)5`). Without a
  type an int is the first of `int`, `long` and `unsigned long` that holds it, and a float a `double`. Its own, not
  the framework's `literal`: it has C's `type` besides its `value`.
- `variable`: the framework's: an identifier, the value bound to a variable (`name`).
- `unary` (`operator`: `+`, `-`, `!`, `~`; `operand`) and `binary` (`operator`: `*`, `/`, `%`, `+`, `-`, `<<`, `>>`,
  `<`, `<=`, `>`, `>=`, `==`, `!=`, `&`, `^`, `|`, `&&`, `||`; `left`, `right`).
- `conditional`: `condition ? consequent : alternative`.
- `cast`: `(type) operand`, to one of `Domains.TYPES`.
- `member`: `object.name`, or `object->name` with the `operator` `->`.
- `subscript`: `array[index]`.
- `call`: the framework's: a function the scope provides (`callable`), applied to ordered `arguments`.

A term carries no domain; C's own `type` is what a constant and a cast are written with, a C attribute.
There is no binding: translators substitute a let's value for its name. `DIALECT` reads the kinds (`Terms.Dialect`).
The writers (`constant`, `identifier`, ...) write terms through the builders, in a transaction:
`store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`. `Text.ToText` writes an expression as C source,
with C's precedence, e.g. `x.width >= 8u && (uint8_t)(a + b) == 0`.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "STANDARDS", "kinds", "Writer", "Writers", "constant", "identifier", "unary", "binary", "conditional",
           "cast", "member", "subscript", "call", "SUFFIXES"]

SUFFIXES = {"unsigned int": "u", "long": "l", "unsigned long": "ul", "long long": "ll", "unsigned long long": "ull",
            "float": "f", "long double": "L"}
"""The suffixes of typed constants: `5u`, `5ull`, `1.5f`, ...; other types are written with a cast."""

STANDARDS = ("C11", "C17", "C23")
"""The standards this dialect covers, ISO/IEC 9899:2011, 2018 and 2024: C17 is C11's corrigenda, with no new syntax."""


def install(txn: Any) -> Any:
    """C's union of its kinds, added to the framework's terms as the branch `c`, its own kinds, which `Cpp` shares, and
    its dialect's schema, whose singleton is `Expressions.C`: run after `Framework.install`, in a transaction of its
    own; run again, it writes nothing."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.C/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "Term": S.OfUnion, "Expression": S.OfUnion,
                  "Constant": S.OfObject, "Unary": S.OfObject, "Binary": S.OfObject, "Conditional": S.OfObject,
                  "Cast": S.OfObject, "Member": S.OfObject, "Subscript": S.OfObject})  # Term: the framework's, by name
        .spec([
            # its dialect: the singleton `Expressions.C`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.C.Dialect").ref(True).singleton("Expressions.C").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("c").schema([_.Dialect])]),
            # its union of its kinds: the framework's it reuses, its own, and invalid syntax
            lambda _: _.Expression.name("Expressions.C.Expression").branches([
                lambda t: t.name("constant").schema([_.Constant]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("unary").schema([_.Unary]),
                lambda t: t.name("binary").schema([_.Binary]),
                lambda t: t.name("conditional").schema([_.Conditional]),
                lambda t: t.name("cast").schema([_.Cast]),
                lambda t: t.name("member").schema([_.Member]),
                lambda t: t.name("subscript").schema([_.Subscript]),
                lambda t: t.name("call").schema([Framework.Call]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its own kinds, which C++ has too: their slots hold a term of either, `Term`
            lambda _: _.Constant.name("Expressions.C.Constant").properties({
                "value": S.OfAny(lambda a: a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr])),
                "type": S.OfStr,  # C's, by default its value's
            }),
            lambda _: _.Unary.name("Expressions.C.Unary").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.Binary.name("Expressions.C.Binary").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term}),
            lambda _: _.Conditional.name("Expressions.C.Conditional").properties({
                "condition": _.Term, "consequent": _.Term, "alternative": _.Term}),
            lambda _: _.Cast.name("Expressions.C.Cast").properties({
                "type": S.OfStr, "operand": _.Term}),
            lambda _: _.Member.name("Expressions.C.Member").properties({
                "name": S.OfStr,
                "operator": S.OfStr,  # '.' (by default) or '->'
                "object": _.Term}),
            lambda _: _.Subscript.name("Expressions.C.Subscript").properties({
                "array": _.Term, "index": _.Term}),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("c").schema([_.Expression])]),
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


def kinds(standards: tuple[str, ...]) -> dict[str, F.Kind]:
    """How the framework reads the kinds of the C family, each recording `standards`, the standards of its dialect's
    language that have it: C's (`STANDARDS`) or C++'s (`Cpp.Expressions.STANDARDS`)."""
    return {
        "constant": F.Kind(F.LITERAL, check=_constant_check, typed=_typed, standards=standards),
        "variable": F.Kind(F.REFERENCE, required=("name",), standards=standards),
        "unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",),
                        standards=standards),
        "binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",),
                         standards=standards),
        "conditional": F.Kind(F.APPLICATION, signature=Domains.CONDITIONAL, standards=standards),
        "cast": F.Kind(F.APPLICATION, signature=Domains.CAST, required=("type",), check=_cast_check, typed=_typed,
                       standards=standards),
        "member": F.Kind(F.APPLICATION, signature=Domains.MEMBER, required=("name",), check=_member_check,
                         standards=standards),
        "subscript": F.Kind(F.APPLICATION, signature=Domains.SUBSCRIPT, standards=standards),
        "call": F.Kind(F.APPLICATION, operator="callable", signature=Domains.CALL, required=("callable",),
                       standards=standards),
    }


def _native(value: Any) -> Writer | None:
    """The constant of a native value: a number, a bool or a string."""
    return constant(value) if type(value) in (bool, int, float, str) else None


DIALECT = F.Dialect("C", kinds(STANDARDS), domain_of=Domains.of, literal=_native)
"""The C dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A term of the C dialect, written through the builders where it is given (a spec)."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


class Writers:
    """The writers of the C family's kinds, for one dialect: its `Terms.Dialect`, whose `spec` writes a native value as
    its constant, and its `Writer`. C's are this module's functions; `Cpp`'s, its own."""

    def __init__(self, dialect: F.Dialect, writer: type[F.Writer]):
        self.dialect, self.writer = dialect, writer

    def constant(self, value: Any, type: str | None = None) -> Any:
        """The constant `value`, of the C type `type` (by default, its value's)."""

        def record(r: Any) -> Any:
            if value is not None:
                r.value(lambda p: p.as_scalar(value))
            return r if type is None else r.type(type)

        return self.writer(lambda u: u.constant(record))

    def identifier(self, name: str) -> Any:
        """The variable `name`."""
        return self.writer(lambda u: u.variable(lambda r: r.name(name)))

    def unary(self, operator: str, operand: Any) -> Any:
        """`<operator> operand`; the operand is a spec (a native value is a constant)."""
        operand = self.dialect.spec(operand)
        return self.writer(lambda u: u.unary(lambda r: r.operator(operator).operand(operand)))

    def binary(self, operator: str, left: Any, right: Any) -> Any:
        """`left <operator> right`; each operand is a spec."""
        left, right = self.dialect.spec(left), self.dialect.spec(right)
        return self.writer(lambda u: u.binary(lambda r: r.operator(operator).left(left).right(right)))

    def conditional(self, condition: Any, consequent: Any, alternative: Any) -> Any:
        """`condition ? consequent : alternative`."""
        condition, consequent = self.dialect.spec(condition), self.dialect.spec(consequent)
        alternative = self.dialect.spec(alternative)
        return self.writer(lambda u: u.conditional(
            lambda r: r.condition(condition).consequent(consequent).alternative(alternative)))

    def cast(self, type: str, operand: Any) -> Any:
        """`(type) operand`."""
        operand = self.dialect.spec(operand)
        return self.writer(lambda u: u.cast(lambda r: r.type(type).operand(operand)))

    def member(self, object: Any, name: str, operator: str | None = None) -> Any:
        """`object.name`, or `object->name` with the operator '->'."""
        object = self.dialect.spec(object)

        def record(r: Any) -> Any:
            r.name(name)
            if operator is not None:
                r.operator(operator)
            return r.object(object)

        return self.writer(lambda u: u.member(record))

    def subscript(self, array: Any, index: Any) -> Any:
        """`array[index]`."""
        array, index = self.dialect.spec(array), self.dialect.spec(index)
        return self.writer(lambda u: u.subscript(lambda r: r.array(array).index(index)))

    def call(self, function: str, *arguments: Any) -> Any:
        """`function(arguments...)`: the framework's call, of a function the scope provides."""
        specs = [self.dialect.spec(argument) for argument in arguments]
        return self.writer(lambda u: u.call(lambda r: r.callable(function).arguments(specs)))


_WRITERS = Writers(DIALECT, Writer)
constant, identifier, unary, binary = _WRITERS.constant, _WRITERS.identifier, _WRITERS.unary, _WRITERS.binary
conditional, cast, member, subscript, call = (
    _WRITERS.conditional, _WRITERS.cast, _WRITERS.member, _WRITERS.subscript, _WRITERS.call)
