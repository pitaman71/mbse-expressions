"""Expressions of the Cpp dialect: expressions of C++, C++17 to C++23, over its arithmetic types, as its source writes
them.

Cpp's terms are values of its `Term`, `Expressions.Cpp.Term`, the branch `cpp` of `Expressions.Framework.Term`, which
`install` defines and adds to `Expressions.Framework.Term` by schema extension. Today its kinds have C's shapes (see
`C.Expressions` for each): it defines its own (`Expressions.Cpp.Constant`, ...), whose properties hold C++'s terms,
beside the framework's `variable` and `call` and its kinds of invalid syntax (`error`, `missing`). Each kind records the standards of C++ that have it (`Kind.standards`:
`STANDARDS`, every one, as far as these kinds go). C++ is not a superset of C, so the two are separate dialects, each
with a union of its own.

`DIALECT` reads the kinds (`Terms.Dialect`). The writers (`constant`, `identifier`, ...) are C's, writing C++'s terms:
`store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`. `Text.ToText` writes an expression as C++ source.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Dialects.C import Domains
from mbse.Expressions.Dialects.C import Expressions as C
from mbse.Expressions.Framework import Terms as F

__all__ = ["install", "DIALECT", "STANDARDS", "Writer", "constant", "identifier", "unary", "binary", "conditional",
           "cast", "member", "subscript", "call"]

STANDARDS = ("C++17", "C++20", "C++23")
"""The standards this dialect covers, ISO/IEC 14882:2017, 2020 and 2024."""


def install(txn: Any) -> Any:
    """Cpp's union of its kinds, `Expressions.Cpp.Term`, added to the framework's terms as the branch `cpp`, its own
    kinds, which have C's shapes but hold C++'s terms, and its dialect's schema, whose singleton is `Expressions.Cpp`:
    run after `Framework.install`, in a transaction of its own; run again, it writes nothing.
    Its holder, `Expressions.Cpp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
    `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.Cpp/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion, "Expression": S.OfObject,
                  "Constant": S.OfObject, "Unary": S.OfObject, "Binary": S.OfObject, "Conditional": S.OfObject,
                  "Cast": S.OfObject, "Member": S.OfObject, "Subscript": S.OfObject})  # FrameworkTerm: the framework's, by name
        .spec([
            # its dialect: the singleton `Expressions.Cpp`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Cpp.Dialect").ref(True).singleton("Expressions.Cpp").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("cpp").schema([_.Dialect])]),
            # its union of its kinds: the framework's it reuses, its own, and invalid syntax
            lambda _: _.Term.name("Expressions.Cpp.Term").branches([
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
            # its own kinds, C's shapes, holding C++'s terms
            lambda _: _.Constant.name("Expressions.Cpp.Constant").properties({
                "value": S.OfAny(lambda a: a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr])),
                "type": S.OfStr,  # C++'s, by default its value's
            }),
            lambda _: _.Unary.name("Expressions.Cpp.Unary").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.Binary.name("Expressions.Cpp.Binary").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term}),
            lambda _: _.Conditional.name("Expressions.Cpp.Conditional").properties({
                "condition": _.Term, "consequent": _.Term, "alternative": _.Term}),
            lambda _: _.Cast.name("Expressions.Cpp.Cast").properties({
                "type": S.OfStr, "operand": _.Term}),
            lambda _: _.Member.name("Expressions.Cpp.Member").properties({
                "name": S.OfStr,
                "operator": S.OfStr,  # '.' (by default) or '->'
                "object": _.Term}),
            lambda _: _.Subscript.name("Expressions.Cpp.Subscript").properties({
                "array": _.Term, "index": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
            # to its `Term`
            lambda _: _.Expression.name("Expressions.Cpp.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("cpp").schema([_.Term])]),
        ])]))])


def _native(value: Any) -> Writer | None:
    """The constant of a native value: a number, a bool or a string."""
    return constant(value) if type(value) in (bool, int, float, str) else None


DIALECT = F.Dialect("Cpp", C.kinds(STANDARDS), domain_of=Domains.of, literal=_native)
"""The Cpp dialect: its kinds, C's, as the framework reads them."""


class Writer(F.Writer):
    """A term of the Cpp dialect, written through the builders where it is given (a spec)."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


_WRITERS = C.Writers(DIALECT, Writer)
constant, identifier, unary, binary = _WRITERS.constant, _WRITERS.identifier, _WRITERS.unary, _WRITERS.binary
conditional, cast, member, subscript, call = (
    _WRITERS.conditional, _WRITERS.cast, _WRITERS.member, _WRITERS.subscript, _WRITERS.call)
