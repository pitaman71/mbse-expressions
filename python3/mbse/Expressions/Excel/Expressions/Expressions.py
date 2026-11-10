"""Expressions of the Excel dialect: worksheet formulas.

Excel's terms are values of its `Term`, `Expressions.Excel.Expressions.Term`, the branch `excel` of
`Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are the
framework's kinds (`mbse.Expressions.Framework.Terms`) where a formula's construct has their shape, five of its own,
each a value object `Expressions.Excel.Expressions.<Kind>` whose slots hold Excel's terms, and the framework's kinds of invalid
syntax (`error`, `missing`); a term carries no domain:

- `literal` (the framework's): a constant, a number (`int` or `float`), text (`str`) or a logical (`bool`), with its
  spelling (`text`) where it has one.
- `variable` (the framework's): the value bound to a `name`, by `LET` or as a defined name.
- `let` (the framework's): `LET(name, value, body)`.
- `call` (the framework's): a worksheet function (`callable`) applied to ordered `arguments`, for the functions in
  `Domains.FUNCTIONS` (`AND`, `OR`, `NOT`, `IF`, `ISERROR`, the bit functions, `ROWS`, `INDEX`, `MATCH`,
  `ISNUMBER`, `SUM`, `MIN`, `MAX` and `UNIQUE` of arrays, and `VSTACK`, which makes one); other names are add-in
  functions, which the workbook provides.
- `cell`: a cell reference (`address`): `A1` on the current sheet, `Sheet1!A1` (`sheet`), or
  `[Book.xlsx]Sheet1!A1` (`book`) in another workbook. A workbook (see `Evaluators`) resolves it; it need not be bound.
- `map`: `MAP(array, LAMBDA(name, body))`, the body's values for each element of the `array`, bound to `name`.
- `infix`: `left <operator> right`, for `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-` and `*`.
- `prefix`: `-operand`.
- `field`: `value.name`, a field of a record (Excel's data types).

`DIALECT` reads them (`Terms.Dialect`), validates and infers. The writers (`constant`, `name`, `cell`, `let_`,
`function`, `infix`, `prefix`, `field`, `map_`) write terms through the builders, in a transaction:
`store.Expressions.Framework.Term(function("AND", infix(">=", name("age"), 18), True))`. `Text.ToText` writes a term
as a formula, e.g. `=AND(this.age >= 18, NOT(ISERROR(this.email)))`.

Its kinds of domain, the branches of its union `Expressions.Excel.Expressions.DomainKind`, which `install` adds to the
framework's `Expressions.Framework.DomainKind` as the branch `excel`, each with the inferred `ordered`: `text`
(`OfText`), sequences of UTF-16 code units, and `error` (`OfError`), Excel's error values, its `members` their codes
(`#DIV/0!`, ...), by index.

Its domains, each named as Excel names its type of value: `define` writes them, owned by the singleton
`Expressions.Excel.Expressions` by name, each related to its schema, an `OfAny` of the scalar it narrows, which
`install` adds (`Expressions.Excel.Expressions.number`): `number` (IEEE 754's `binary64`, rounding ties to even),
`logical` (ISO/IEC 11404's `boolean`), `text` (its own `text`) and `error` (its own `error`, its members Excel's error
codes), whose schema narrows `str`: an error value is its code, as `Domains.Error` holds it. A record is not a domain.
"""

from __future__ import annotations

import re
from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Domains

__all__ = ["install", "define", "DIALECT", "Writer", "constant", "name", "cell", "let_", "function", "infix", "prefix", "field",
           "map_", "address"]


def install(txn: Any) -> Any:
    """Excel's union of its kinds, added to the framework's terms as the branch `excel`, its own kinds, and its
    dialect's schema, whose singleton is `Expressions.Excel.Expressions`: run after `Framework.install`, in a transaction of its
    own; run again, it writes nothing. Its domains' schemas too, each an `OfAny` of the scalar it narrows: its domains
    `define` writes after it.
    Its holder, `Expressions.Excel.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
    its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.Excel.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfText": S.OfObject, "OfError": S.OfObject,  # Kinds: the framework's
                  "number": S.OfAny, "logical": S.OfAny, "text": S.OfAny, "error": S.OfAny,
                  "Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion, "Expression": S.OfObject,
                  "Cell": S.OfObject, "Map": S.OfObject, "Infix": S.OfObject, "Prefix": S.OfObject,
                  "Field": S.OfObject})  # FrameworkTerm: the framework's union, by name
        .spec([
            # its dialect: the singleton `Expressions.Excel.Expressions`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Excel.Expressions.Dialect").ref(True).singleton("Expressions.Excel.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("excel").schema([_.Dialect])]),
            # its union of its kinds: the framework's it reuses, its own, and invalid syntax
            lambda _: _.Term.name("Expressions.Excel.Expressions.Term").branches([
                lambda t: t.name("literal").schema([Framework.Literal]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("let").schema([Framework.Let]),
                lambda t: t.name("call").schema([Framework.Call]),
                lambda t: t.name("cell").schema([_.Cell]),
                lambda t: t.name("map").schema([_.Map]),
                lambda t: t.name("infix").schema([_.Infix]),
                lambda t: t.name("prefix").schema([_.Prefix]),
                lambda t: t.name("field").schema([_.Field]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Cell.name("Expressions.Excel.Expressions.Cell").properties({
                "address": S.OfStr, "sheet": S.OfStr, "book": S.OfStr}),
            lambda _: _.Map.name("Expressions.Excel.Expressions.Map").properties({
                "name": S.OfStr, "array": _.Term, "body": _.Term}),  # the LAMBDA's name and body
            lambda _: _.Infix.name("Expressions.Excel.Expressions.Infix").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term}),
            lambda _: _.Prefix.name("Expressions.Excel.Expressions.Prefix").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.Field.name("Expressions.Excel.Expressions.Field").properties({
                "name": S.OfStr, "value": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
            # to its `Term`
            lambda _: _.Expression.name("Expressions.Excel.Expressions.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            # --- its kinds of domain: text, UTF-16 code units; its error values, their codes its members; then what
            # follows from them ---
            lambda _: _.OfText.name("Expressions.Excel.Expressions.OfText").properties({"ordered": S.OfBool}),  # inferred
            lambda _: _.OfError.name("Expressions.Excel.Expressions.OfError").properties({
                "members": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfStr])),  # its error codes
                "ordered": S.OfBool}),  # inferred
            lambda _: _.DomainKind.name("Expressions.Excel.Expressions.DomainKind").branches([
                lambda t: t.name("text").schema([_.OfText]),
                lambda t: t.name("error").schema([_.OfError]),
            ]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("excel").schema([_.DomainKind])]),
            # --- its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
            lambda _: _.number.name("Expressions.Excel.Expressions.number").schemas([S.OfFloat]),
            lambda _: _.logical.name("Expressions.Excel.Expressions.logical").schemas([S.OfBool]),
            lambda _: _.text.name("Expressions.Excel.Expressions.text").schemas([S.OfStr]),
            lambda _: _.error.name("Expressions.Excel.Expressions.error").schemas([S.OfStr]),  # an error value's code
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("excel").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """Excel's domains as data: the singleton `Expressions.Excel.Expressions` owning its domains by name (`domains`,
    through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and related to its
    schema (`Expressions.Excel.Expressions.number`) by `Expressions.Framework.HasDomain`: `number`, `logical`, `text`
    and `error`, its `members` Excel's error codes, in the order `ERROR.TYPE` numbers them, then those Excel added
    since. Run after the installs, in a transaction of its own; run again, it writes nothing. Its frame binds the
    dialect (`dialect`) and each domain by its name: `store.transaction(Excel.define)[0]["number"]`."""
    Excel, Domain = txn.Expressions.Excel.Expressions, txn.Expressions.Framework.Domain
    return txn.uid("mbse.Expressions.Excel.Expressions.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": Excel.Dialect, "number": Domain, "logical": Domain, "text": Domain, "error": Domain})
        .spec([
            lambda _: _.dialect.domains({
                "number": lambda e: e.domain(_.number), "logical": lambda e: e.domain(_.logical),
                "text": lambda e: e.domain(_.text), "error": lambda e: e.domain(_.error),
            }),
            lambda _: _.number.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64).radix(2).precision(53).emax(1023).ordered(
                    True)))))).schema([Excel.number]),
            lambda _: _.logical.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.boolean(
                lambda d: d.ordered(False)))))).schema([Excel.logical]),
            lambda _: _.text.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.excel(lambda v: v.text(
                lambda d: d.ordered(True)))))).schema([Excel.text]),
            lambda _: _.error.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.excel(lambda v: v.error(
                lambda d: d.members([
                    "#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A", "#GETTING_DATA",  # ERROR.TYPE's 1-8
                    "#SPILL!", "#CALC!", "#FIELD!", "#BLOCKED!", "#CONNECT!", "#BUSY!", "#UNKNOWN!",  # added since
                ]).ordered(False)))))).schema([Excel.error]),
        ])]))])


_ADDRESS = re.compile(r"\$?([A-Za-z]{1,3})\$?([1-9][0-9]*)")
_VALUES = (bool, int, float, str)  # what a constant holds


def address(text: str) -> str | None:
    """A cell address without `$` and in upper case, e.g. '$b$2' is 'B2'; None if `text` is not one."""
    match = _ADDRESS.fullmatch(text)
    return f"{match[1].upper()}{match[2]}" if match else None


def _cell_check(record: Any) -> list[str]:
    attributes = F.attributes_of(record)
    problems = []
    text = attributes.get("address")
    if type(text) is str and text and address(text) is None:
        problems.append(f"a cell's address must be a column and a row, like A1, got {text!r}")
    if attributes.get("book") is not None and attributes.get("sheet") is None:
        problems.append("a cell in another book needs a sheet")
    return problems


def _held(value: Any) -> str | None:
    """What is wrong with a constant holding `value`, or None."""
    return None if type(value) in _VALUES else f"an Excel literal cannot hold a {type(value).__name__}"


def _literal_check(record: Any) -> list[str]:
    problem = _held(F.attributes_of(record)["value"])
    return [] if problem is None else [problem]


def _call_check(record: Any) -> list[str]:
    function_ = F.attributes_of(record).get("callable")
    problem = Domains.arity_problem(function_, len(F.arguments_of(record))) if type(function_) is str else None
    return [] if problem is None else [problem]


def _native(value: Any) -> Writer:
    """The literal of a native value."""
    return constant(value)


DIALECT = F.Dialect("Excel.Expressions", {
    "literal": F.Kind(F.LITERAL, check=_literal_check),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "cell": F.Kind(F.REFERENCE, lexical=False, required=("address",), check=_cell_check),
    "let": F.Kind(F.BINDING, required=("name",)),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.FUNCTIONS, required=("callable",),
                   check=_call_check),
    "infix": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.INFIX, required=("operator",)),
    "prefix": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.PREFIX, required=("operator",)),
    "field": F.Kind(F.APPLICATION, operator="name", signature=Domains.FIELD, required=("name",)),
    "map": F.Kind(F.QUANTIFIER, signature=Domains.MAP, required=("name",)),
}, domain_of=Domains.of, literal=_native)
"""The Excel dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A term of the Excel dialect, written through the builders: a spec, written where it is given."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


def _spec(value: Any) -> Any:
    return None if value is None else DIALECT.spec(value)


def _set(record: Any, **slots: Any) -> Any:
    for slot, value in slots.items():
        if value is not None:
            getattr(record, slot)(value)
    return record


def constant(value: Any) -> Writer:
    """The constant `value`: a number, text or a logical; raises `TypeError` for any other."""
    problem = _held(value)
    if problem is not None:
        raise TypeError(problem)
    return Writer(lambda u: u.literal(lambda r: r.value(lambda p: p.as_scalar(value))))


def name(name: str) -> Writer:
    """The value bound to `name`."""
    return Writer(lambda u: u.variable(lambda v: v.name(name)))


def cell(address: str, sheet: str | None = None, book: str | None = None) -> Writer:
    """The cell at `address`, on `sheet` (by default the current one) of `book` (by default this one)."""

    def record(r: Any) -> Any:
        r.address(address)
        if sheet is not None:
            r.sheet(sheet)
        return r if book is None else r.book(book)

    return Writer(lambda u: u.cell(record))


def let_(name: str, value: Any, body: Any) -> Writer:
    """`LET(name, value, body)`; the value and body are specs (a native value is a constant)."""
    value, body = _spec(value), _spec(body)
    return Writer(lambda u: u.let(lambda r: _set(r.name(name), value=value, body=body)))


def function(name: str, *arguments: Any) -> Writer:
    """The worksheet function `name` applied to `arguments`."""
    specs = [DIALECT.spec(argument) for argument in arguments]
    return Writer(lambda u: u.call(lambda r: r.callable(name).arguments(specs)))


def infix(operator: str, left: Any, right: Any) -> Writer:
    """`left <operator> right`."""
    left, right = _spec(left), _spec(right)
    return Writer(lambda u: u.infix(lambda r: _set(r.operator(operator), left=left, right=right)))


def prefix(operator: str, operand: Any) -> Writer:
    """`<operator>operand`."""
    operand = _spec(operand)
    return Writer(lambda u: u.prefix(lambda r: _set(r.operator(operator), operand=operand)))


def field(value: Any, name: str) -> Writer:
    """`value.name`."""
    value = _spec(value)
    return Writer(lambda u: u.field(lambda r: _set(r.name(name), value=value)))


def map_(name: str, array: Any, body: Any) -> Writer:
    """`MAP(array, LAMBDA(name, body))`."""
    array, body = _spec(array), _spec(body)
    return Writer(lambda u: u.map(lambda r: _set(r.name(name), array=array, body=body)))
