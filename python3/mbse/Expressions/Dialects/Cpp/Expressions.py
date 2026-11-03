"""Expressions of the Cpp dialect: expressions of C++, C++17 to C++23, over its arithmetic types, as its source writes
them.

Cpp's terms are values of its union, `Expressions.Cpp.Expression`, the branch `cpp` of `Expressions.Framework.Term`,
which `install` defines and adds to `Term` by schema extension. Today its kinds are C's, defined once by C's install
(`Expressions.C.Constant`, ...) and listed by both unions, with the framework's `variable` and `call` and its kinds of
invalid syntax (`error`, `missing`): see `C.Expressions` for each. Their slots hold a term of either dialect; that a C++
term holds only C++'s terms is validation's. Each kind records the standards of C++ that have it (`Kind.standards`:
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
    """Cpp's union of its kinds, C's (whose install runs before it), added to the framework's terms as the branch
    `cpp`, and its dialect's schema, whose singleton is `Expressions.Cpp`: run after `C.install`, in a transaction of its
    own; run again, it writes nothing."""
    S, Framework, Shared = txn.Schemas, txn.Expressions.Framework, txn.Expressions.C
    return txn.uid("mbse.Expressions.Cpp/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "Term": S.OfUnion, "Expression": S.OfUnion})
        .spec([
            # its dialect: the singleton `Expressions.Cpp`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Cpp.Dialect").ref(True).singleton("Expressions.Cpp").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("cpp").schema([_.Dialect])]),
            # its union of its kinds: C's, the framework's it reuses, and invalid syntax
            lambda _: _.Expression.name("Expressions.Cpp.Expression").branches([
                lambda t: t.name("constant").schema([Shared.Constant]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("unary").schema([Shared.Unary]),
                lambda t: t.name("binary").schema([Shared.Binary]),
                lambda t: t.name("conditional").schema([Shared.Conditional]),
                lambda t: t.name("cast").schema([Shared.Cast]),
                lambda t: t.name("member").schema([Shared.Member]),
                lambda t: t.name("subscript").schema([Shared.Subscript]),
                lambda t: t.name("call").schema([Framework.Call]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("cpp").schema([_.Expression])]),
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
