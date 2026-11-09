"""Expressions of the LaTeX dialect: mathematical notation, as LaTeX's math mode writes it.

LaTeX's terms are values of its `Term`, `Expressions.LaTeX.Expressions.Term`, the branch `latex` of
`Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are four of
the framework's kinds (`mbse.Expressions.Framework.Terms`), whose shape notation's constructs have, four of its own,
each a value object whose slots hold LaTeX's terms, and the framework's kinds of invalid syntax (`error`, `missing`); a
term carries no domain:

- `literal` (the framework's): a constant, a number (`int` or `float`), text (`str`, written `\\text{...}`) or a truth
  value (`bool`): its `value`, with its spelling (`text`) where it has one. Notation has no bytes: validation reports a literal holding one.
- `variable` (the framework's): a named quantity, `a`, or `\\mathit{age}` for a longer name: its `name`.
- `binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`=`, `\\neq`, `<`, `\\leq`, `>`,
  `\\geq`, `\\land`, `\\lor`, `\\implies`, `+`, `-`, `\\cdot`); `unary`: `\\lnot` and `-` of its `operand`.
- `frac`: `\\frac{numerator}{denominator}`.
- `member`: `value.\\mathit{name}`, a member of a value.
- `call` (the framework's): a named function (`callable`) applied to ordered `arguments`,
  `\\operatorname{has}(x, \\text{email})`, for the functions in `Domains.FUNCTIONS`.
- `let` (the framework's): `body \\quad \\text{where } name = value`, which binds a name within its body.

Notation has no evaluator: this dialect is written, rendered, validated, inferred and translated, and evaluation belongs
to the dialects it is translated to. `DIALECT` reads its kinds (`Terms.Dialect`); its writers (`constant`, `symbol`,
...) write them through the builders, wherever a term is written, in a transaction. `Text.ToText` writes a term as
math-mode LaTeX, parenthesized only where precedence requires.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "Writer", "constant", "symbol", "binary", "unary", "frac", "member", "function", "where"]


def install(txn: Any) -> Any:
    """LaTeX's union of its kinds, added to the framework's terms as the branch `latex`, its own kinds, and its
    dialect's schema, whose singleton is `Expressions.LaTeX.Expressions`: run after `Framework.install`, in a transaction of its
    own; run again, it writes nothing.
    Its holder, `Expressions.LaTeX.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
    its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.LaTeX.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion, "Expression": S.OfObject,
                  "Binary": S.OfObject, "Unary": S.OfObject, "Frac": S.OfObject, "Member": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.LaTeX.Expressions`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.LaTeX.Expressions.Dialect").ref(True).singleton("Expressions.LaTeX.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("latex").schema([_.Dialect])]),
            # its union of its kinds: the framework's it reuses, its own, and invalid syntax
            lambda _: _.Term.name("Expressions.LaTeX.Expressions.Term").branches([
                lambda t: t.name("literal").schema([Framework.Literal]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("call").schema([Framework.Call]),
                lambda t: t.name("let").schema([Framework.Let]),
                lambda t: t.name("binary").schema([_.Binary]),
                lambda t: t.name("unary").schema([_.Unary]),
                lambda t: t.name("frac").schema([_.Frac]),
                lambda t: t.name("member").schema([_.Member]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Binary.name("Expressions.LaTeX.Expressions.Binary").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term}),
            lambda _: _.Unary.name("Expressions.LaTeX.Expressions.Unary").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.Frac.name("Expressions.LaTeX.Expressions.Frac").properties({
                "numerator": _.Term, "denominator": _.Term}),
            lambda _: _.Member.name("Expressions.LaTeX.Expressions.Member").properties({
                "name": S.OfStr, "value": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
            # to its `Term`
            lambda _: _.Expression.name("Expressions.LaTeX.Expressions.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("latex").schema([_.Term])]),
        ])]))])


_SCALARS = (bool, int, float, str)  # what a constant holds: notation has no bytes


def _literal_check(record: Any) -> list[str]:
    """A literal holds what a constant of LaTeX does: the framework's literal may hold more."""
    value = F.attributes_of(record)["value"]
    return [] if type(value) in _SCALARS else [f"a LaTeX literal cannot hold a {type(value).__name__}"]


def _native(value: Any) -> Writer | None:
    """The constant of a native value: a number, text or a truth value."""
    return constant(value) if type(value) in _SCALARS else None


DIALECT = F.Dialect("LaTeX.Expressions", {
    "literal": F.Kind(F.LITERAL, check=_literal_check),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",)),
    "unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",)),
    "frac": F.Kind(F.APPLICATION, signature=Domains.FRAC),
    "member": F.Kind(F.APPLICATION, operator="name", signature=Domains.MEMBER, required=("name",)),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.FUNCTIONS, required=("callable",)),
    "let": F.Kind(F.BINDING, required=("name",)),
}, domain_of=Domains.of, literal=_native)
"""The LaTeX dialect: its kinds, as the framework reads them."""


# --- Writers: specs that write LaTeX's terms through the builders ---


class Writer(F.Writer):
    """A LaTeX term, written through the builders where it is given (a spec)."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


def constant(value: Any) -> Writer:
    """The constant `value`: an `int`, a `float`, a `str` or a `bool` (validation reports any other)."""
    return Writer(lambda u: u.literal(lambda r: r.value(lambda p: p.as_scalar(value))))


def symbol(name: str) -> Writer:
    """The symbol `name`."""
    return Writer(lambda u: u.variable(lambda r: r.name(name)))


def binary(operator: str, left: Any, right: Any) -> Writer:
    """`left <operator> right`; each operand is a spec (a native value is a constant)."""
    left, right = DIALECT.spec(left), DIALECT.spec(right)
    return Writer(lambda u: u.binary(lambda r: r.operator(operator).left(left).right(right)))


def unary(operator: str, operand: Any) -> Writer:
    """`<operator> operand`: `\\lnot` or `-`."""
    operand = DIALECT.spec(operand)
    return Writer(lambda u: u.unary(lambda r: r.operator(operator).operand(operand)))


def frac(numerator: Any, denominator: Any) -> Writer:
    """`\\frac{numerator}{denominator}`."""
    numerator, denominator = DIALECT.spec(numerator), DIALECT.spec(denominator)
    return Writer(lambda u: u.frac(lambda r: r.numerator(numerator).denominator(denominator)))


def member(value: Any, name: str) -> Writer:
    """`value.\\mathit{name}`."""
    value = DIALECT.spec(value)
    return Writer(lambda u: u.member(lambda r: r.name(name).value(value)))


def function(name: str, *arguments: Any) -> Writer:
    """`\\operatorname{name}(arguments...)`."""
    specs = [DIALECT.spec(argument) for argument in arguments]
    return Writer(lambda u: u.call(lambda r: r.callable(name).arguments(specs)))


def where(name: str, value: Any, body: Any) -> Writer:
    """`body \\quad \\text{where } name = value`."""
    value, body = DIALECT.spec(value), DIALECT.spec(body)
    return Writer(lambda u: u.let(lambda r: r.name(name).value(value).body(body)))
