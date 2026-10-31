"""Expressions of the Excel dialect: worksheet formulas.

Excel's terms are the framework's kinds (`mbse.Expressions.Framework.Terms`) where a formula's construct has their
shape, and five of its own, which `install` adds to `Expressions.Framework.Term` by schema extension, each a branch
named `excel_<kind>` (dialects share kind names) holding a value object `Expressions.Excel.<Kind>` (a term carries
no domain):

- `literal` (the framework's): a constant, a number (`int` or `float`), text (`str`) or a logical (`bool`).
- `variable` (the framework's): the value bound to a `name`, by `LET` or as a defined name.
- `let` (the framework's): `LET(name, value, body)`.
- `call` (the framework's): a worksheet function (`callable`) applied to ordered `arguments`, for the functions in
  `Domains.FUNCTIONS` (`AND`, `OR`, `NOT`, `IF`, `ISERROR`, the bit functions, `ROWS`, `INDEX`, `MATCH`,
  `ISNUMBER`, `SUM`, `MIN`, `MAX` and `UNIQUE` of arrays, and `VSTACK`, which makes one); other names are add-in
  functions, which the workbook provides.
- `excel_cell`: a cell reference (`address`): `A1` on the current sheet, `Sheet1!A1` (`sheet`), or
  `[Book.xlsx]Sheet1!A1` (`book`) in another workbook. A workbook (see `Evaluators`) resolves it; it need not be bound.
- `excel_map`: `MAP(array, LAMBDA(name, body))`, the body's values for each element of the `array`, bound to `name`.
- `excel_infix`: `left <operator> right`, for `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-` and `*`.
- `excel_prefix`: `-operand`.
- `excel_field`: `value.name`, a field of a record (Excel's data types).

`DIALECT` reads them (`Terms.Dialect`), validates and infers. The writers (`constant`, `name`, `cell`, `let_`,
`function`, `infix`, `prefix`, `field`, `map_`) write terms through the builders, in a transaction:
`store.Expressions.Framework.Term(function("AND", infix(">=", name("age"), 18), True))`. `Text.ToText` writes a term
as a formula, e.g. `=AND(this.age >= 18, NOT(ISERROR(this.email)))`.
"""

from __future__ import annotations

import re
from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "Writer", "constant", "name", "cell", "let_", "function", "infix", "prefix", "field",
           "map_", "address"]


def install(txn: Any) -> Any:
    """Excel's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its own."""
    S = txn.Schemas
    dialect, specs = F.dialect(txn, "Expressions.Excel")  # its dialect: a singleton
    return txn.uid("mbse.Expressions.Excel/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({**dialect, "Term": S.OfUnion, "Cell": S.OfObject, "Map": S.OfObject, "Infix": S.OfObject,
                  "Prefix": S.OfObject, "Field": S.OfObject})  # the framework's union, found by its name
        .spec([
            *specs,
            lambda _: _.Cell.name("Expressions.Excel.Cell").properties({
                "address": S.OfStr, "sheet": S.OfStr, "book": S.OfStr}),
            lambda _: _.Map.name("Expressions.Excel.Map").properties({
                "name": S.OfStr, "array": _.Term, "body": _.Term}),  # the LAMBDA's name and body
            lambda _: _.Infix.name("Expressions.Excel.Infix").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term}),
            lambda _: _.Prefix.name("Expressions.Excel.Prefix").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.Field.name("Expressions.Excel.Field").properties({
                "name": S.OfStr, "value": _.Term}),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # branches added: schema extension
                lambda t: t.name("excel_cell").schema([_.Cell]),
                lambda t: t.name("excel_map").schema([_.Map]),
                lambda t: t.name("excel_infix").schema([_.Infix]),
                lambda t: t.name("excel_prefix").schema([_.Prefix]),
                lambda t: t.name("excel_field").schema([_.Field]),
            ]),
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


DIALECT = F.Dialect("Excel", {
    "literal": F.Kind(F.LITERAL, check=_literal_check),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "excel_cell": F.Kind(F.REFERENCE, lexical=False, required=("address",), check=_cell_check),
    "let": F.Kind(F.BINDING, required=("name",)),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.FUNCTIONS, required=("callable",),
                   check=_call_check),
    "excel_infix": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.INFIX, required=("operator",)),
    "excel_prefix": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.PREFIX, required=("operator",)),
    "excel_field": F.Kind(F.APPLICATION, operator="name", signature=Domains.FIELD, required=("name",)),
    "excel_map": F.Kind(F.QUANTIFIER, signature=Domains.MAP, required=("name",)),
}, domain_of=Domains.of, literal=_native)
"""The Excel dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A term of the Excel dialect, written through the builders: a spec, written where it is given."""

    __slots__ = ()


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

    return Writer(lambda u: u.excel_cell(record))


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
    return Writer(lambda u: u.excel_infix(lambda r: _set(r.operator(operator), left=left, right=right)))


def prefix(operator: str, operand: Any) -> Writer:
    """`<operator>operand`."""
    operand = _spec(operand)
    return Writer(lambda u: u.excel_prefix(lambda r: _set(r.operator(operator), operand=operand)))


def field(value: Any, name: str) -> Writer:
    """`value.name`."""
    value = _spec(value)
    return Writer(lambda u: u.excel_field(lambda r: _set(r.name(name), value=value)))


def map_(name: str, array: Any, body: Any) -> Writer:
    """`MAP(array, LAMBDA(name, body))`."""
    array, body = _spec(array), _spec(body)
    return Writer(lambda u: u.excel_map(lambda r: _set(r.name(name), array=array, body=body)))
