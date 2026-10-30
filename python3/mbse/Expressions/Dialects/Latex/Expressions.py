"""Expressions of the Latex dialect: mathematical notation, as LaTeX's math mode writes it.

Latex's terms are four of the framework's kinds (`mbse.Expressions.Framework.Terms`), whose shape notation's
constructs have, and four of its own, which `install` adds to `Expressions.Framework.Term` by schema extension, each a
value object with a `domain`, by name, as every term has. The tags of its own carry the dialect's name, `latex_`,
since every dialect adds its kinds to the one union and several have a `binary` or a `member`:

- `literal` (the framework's): a constant, a number (`int` or `float`), text (`str`, written `\\text{...}`) or a truth
  value (`bool`): its `value`. Notation has no bytes: validation reports a literal holding one.
- `variable` (the framework's): a named quantity, `a`, or `\\mathit{age}` for a longer name: its `name`.
- `latex_binary`: `left <operator> right`, for the operators in `Domains.BINARY` (`=`, `\\neq`, `<`, `\\leq`, `>`,
  `\\geq`, `\\land`, `\\lor`, `\\implies`, `+`, `-`, `\\cdot`); `latex_unary`: `\\lnot` and `-` of its `operand`.
- `latex_frac`: `\\frac{numerator}{denominator}`.
- `latex_member`: `value.\\mathit{name}`, a member of a value.
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

__all__ = ["install", "DIALECT", "constant", "symbol", "binary", "unary", "frac", "member", "function", "where"]


def install(txn: Any) -> Any:
    """Latex's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own."""
    S = txn.Schemas
    return txn.uid("mbse.Expressions.Latex/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion, "Binary": S.OfObject, "Unary": S.OfObject, "Frac": S.OfObject,
                  "Member": S.OfObject})  # the framework's union, found by its name
        .spec([
            lambda _: _.Binary.name("Expressions.Latex.Binary").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term, "domain": S.OfStr}),
            lambda _: _.Unary.name("Expressions.Latex.Unary").properties({
                "operator": S.OfStr, "operand": _.Term, "domain": S.OfStr}),
            lambda _: _.Frac.name("Expressions.Latex.Frac").properties({
                "numerator": _.Term, "denominator": _.Term, "domain": S.OfStr}),
            lambda _: _.Member.name("Expressions.Latex.Member").properties({
                "name": S.OfStr, "value": _.Term, "domain": S.OfStr}),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # branches added: schema extension
                lambda t: t.name("latex_binary").schema([_.Binary]),
                lambda t: t.name("latex_unary").schema([_.Unary]),
                lambda t: t.name("latex_frac").schema([_.Frac]),
                lambda t: t.name("latex_member").schema([_.Member]),
            ]),
        ])]))])


_SCALARS = (bool, int, float, str)  # what a constant holds: notation has no bytes


def _literal_check(record: Any) -> list[str]:
    """A literal holds what a constant of Latex does: the framework's literal may hold more."""
    value = F.attributes_of(record)["value"]
    return [] if type(value) in _SCALARS else [f"a Latex literal cannot hold a {type(value).__name__}"]


def _native(value: Any) -> F.Writer | None:
    """The constant of a native value: a number, text or a truth value."""
    return constant(value) if type(value) in _SCALARS else None


DIALECT = F.Dialect("Latex", {
    "literal": F.Kind(F.LITERAL, check=_literal_check),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "latex_binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",)),
    "latex_unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",)),
    "latex_frac": F.Kind(F.APPLICATION, signature=Domains.FRAC),
    "latex_member": F.Kind(F.APPLICATION, operator="name", signature=Domains.MEMBER, required=("name",)),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.FUNCTIONS, required=("callable",)),
    "let": F.Kind(F.BINDING, required=("name",)),
}, domain_of=Domains.of, literal=_native)
"""The Latex dialect: its kinds, as the framework reads them."""


# --- Writers: specs that write Latex's terms through the builders ---


def constant(value: Any) -> F.Writer:
    """The constant `value`: an `int`, a `float`, a `str` or a `bool` (validation reports any other)."""
    return F.Writer(lambda u: u.literal(lambda r: r.value(lambda p: p.as_scalar(value))))


def symbol(name: str) -> F.Writer:
    """The symbol `name`."""
    return F.Writer(lambda u: u.variable(lambda r: r.name(name)))


def binary(operator: str, left: Any, right: Any) -> F.Writer:
    """`left <operator> right`; each operand is a spec (a native value is a constant)."""
    left, right = DIALECT.spec(left), DIALECT.spec(right)
    return F.Writer(lambda u: u.latex_binary(lambda r: r.operator(operator).left(left).right(right)))


def unary(operator: str, operand: Any) -> F.Writer:
    """`<operator> operand`: `\\lnot` or `-`."""
    operand = DIALECT.spec(operand)
    return F.Writer(lambda u: u.latex_unary(lambda r: r.operator(operator).operand(operand)))


def frac(numerator: Any, denominator: Any) -> F.Writer:
    """`\\frac{numerator}{denominator}`."""
    numerator, denominator = DIALECT.spec(numerator), DIALECT.spec(denominator)
    return F.Writer(lambda u: u.latex_frac(lambda r: r.numerator(numerator).denominator(denominator)))


def member(value: Any, name: str) -> F.Writer:
    """`value.\\mathit{name}`."""
    value = DIALECT.spec(value)
    return F.Writer(lambda u: u.latex_member(lambda r: r.name(name).value(value)))


def function(name: str, *arguments: Any) -> F.Writer:
    """`\\operatorname{name}(arguments...)`."""
    specs = [DIALECT.spec(argument) for argument in arguments]
    return F.Writer(lambda u: u.call(lambda r: r.callable(name).arguments(specs)))


def where(name: str, value: Any, body: Any) -> F.Writer:
    """`body \\quad \\text{where } name = value`."""
    value, body = DIALECT.spec(value), DIALECT.spec(body)
    return F.Writer(lambda u: u.let(lambda r: r.name(name).value(value).body(body)))
