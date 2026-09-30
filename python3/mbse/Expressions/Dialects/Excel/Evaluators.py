"""Evaluators of the Excel dialect: compute a formula by Excel's rules, in Python.

`Evaluators.OfAny(expression, scope)` binds names to numbers, text, logicals and records (mappings, or objects that
write their properties through `accept`). Values are Python `float` (number), `str` (text), `bool` (logical) and
`Domains.Error`. Excel's rules apply, not Basic's:

- Errors are values: a field a record does not have is `#FIELD!`, a name not bound is `#NAME?`, and an operand of the
  wrong type is `#VALUE!`. Errors propagate through operators and functions, except `ISERROR`, which tests for them,
  and `IF`, which evaluates only the branch it takes.
- Two-valued logic: `AND` and `OR` evaluate every argument; numbers are true when nonzero, and text is `#VALUE!`.
- Coercion: arithmetic converts logicals (TRUE is 1) and numeric text to numbers. Comparisons never coerce: values
  of different types are ordered numbers, then text, then logicals (`"a" > 1` is TRUE), and text compares ignoring
  case (`"a" = "A"` is TRUE).

A `Workbook(names, sheets, ...)` is the scope: its defined `names`, its `sheets` of cells (`{'Sheet1': {'A1': 1}}`),
the current `sheet` (by default the first), other workbooks by name (`books`) and `add_ins`, the functions beyond the
built-ins. A name is its innermost `LET`, then a defined name, else `#NAME?`; a cell is its value, 0 when empty, or
`#REF!` when its sheet or book does not exist; an add-in function is called with its arguments' values, and an unknown
function is `#NAME?`. An evaluator given a mapping makes a workbook whose defined names it holds.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F
from mbse.Schemas.Framework import Validators

from . import Domains, Expressions
from .Domains import Error

__all__ = ["OfAny", "Error", "Workbook"]

_VALUE, _FIELD, _NAME, _REF = Error("#VALUE!"), Error("#FIELD!"), Error("#NAME?"), Error("#REF!")


def _number_of(value: Any) -> Any:
    return float(value) if type(value) is int else value


class Workbook(F.Variables):
    """A workbook, as the scope of its formulas: defined `names`, `sheets` of cells by address, the current `sheet`,
    other `books` by name, and `add_ins` by function name."""

    def __init__(self, names: Mapping[str, Any] | None = None, sheets: Mapping[str, Mapping[str, Any]] | None = None,
                 *, name: str = "Book1", sheet: str | None = None, books: Mapping[str, Workbook] | None = None,
                 add_ins: Mapping[str, Callable[..., Any]] | None = None):
        super().__init__(names)
        self.name = name
        self.sheets = {sheet_name: {Expressions.address(a) or a: v for a, v in cells.items()}
                       for sheet_name, cells in (sheets or {}).items()}
        self.sheet = sheet if sheet is not None else next(iter(self.sheets), "Sheet1")
        self.books = dict(books or {})
        self.add_ins = {function.upper(): implementation for function, implementation in (add_ins or {}).items()}

    def lookup(self, reference: Any) -> Any:
        if type(reference).KIND != "cell":
            return _number_of(self.values[reference.name]) if reference.name in self.values else _NAME
        book = self
        if reference.book is not None and reference.book != self.name:
            if reference.book not in self.books:
                return _REF
            book = self.books[reference.book]
        cells = book.sheets.get(reference.sheet or book.sheet)
        if cells is None:
            return _REF
        return _number_of(cells.get(Expressions.address(reference.address), 0.0))


def _add_in(name: str, arguments: list[F.Thunk], node: Any, scope: Workbook) -> Any:
    function = scope.add_ins.get(name.upper())
    if function is None:
        return _NAME
    values = [argument() for argument in arguments]
    for value in values:
        if isinstance(value, Error):
            return value
    return _number_of(function(*values))


def _number(value: Any) -> float | Error:
    """A value as a number, for arithmetic: logicals and numeric text convert."""
    if isinstance(value, Error):
        return value
    if type(value) in (bool, int, float):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return _VALUE


def _truth(value: Any) -> bool | Error:
    """A value as a logical, for AND, OR, NOT and IF: numbers are true when nonzero; text is an error."""
    if isinstance(value, Error):
        return value
    if type(value) in (bool, int, float):
        return value != 0
    return _VALUE


def _rank(value: Any) -> tuple[int, Any]:
    """The order of Excel's comparisons: numbers, then text (ignoring case), then logicals."""
    if type(value) is bool:
        return 2, value
    if type(value) is str:
        return 1, value.casefold()
    return 0, float(value)


def _compare(test: Callable[[Any, Any], bool]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> bool | Error:
        a, b = (argument() for argument in arguments)
        for value in (a, b):
            if isinstance(value, Error):
                return value
            if type(value) not in (bool, int, float, str):
                return _VALUE
        return test(_rank(a), _rank(b))

    return apply


def _arithmetic(apply_: Callable[[float, float], float]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> float | Error:
        a, b = (_number(argument()) for argument in arguments)
        for value in (a, b):
            if isinstance(value, Error):
                return value
        return apply_(a, b)  # type: ignore[arg-type]

    return apply


def _logic(combine: Callable[[list[bool]], bool]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> bool | Error:
        truths = [_truth(argument()) for argument in arguments]
        for truth in truths:
            if isinstance(truth, Error):
                return truth
        return combine(truths)  # type: ignore[arg-type]

    return apply


def _not(arguments: list[F.Thunk], node: Any, scope: Any) -> bool | Error:
    truth = _truth(arguments[0]())
    return truth if isinstance(truth, Error) else not truth


def _if(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    truth = _truth(arguments[0]())
    if isinstance(truth, Error):
        return truth
    return arguments[1]() if truth else arguments[2]()


def _negate(arguments: list[F.Thunk], node: Any, scope: Any) -> float | Error:
    number = _number(arguments[0]())
    return number if isinstance(number, Error) else -number


def _field(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    record = arguments[0]()
    if isinstance(record, Error):
        return record
    if not Domains.is_record(record):
        return _VALUE
    fields = record if isinstance(record, Mapping) else Validators.properties_of(record)
    if node.name not in fields:
        return _FIELD
    return _number_of(fields[node.name])


_interpreter = F.Interpreter(Expressions.DIALECT, {
    "function": {
        "AND": _logic(all), "OR": _logic(any), "NOT": _not, "IF": _if,
        "ISERROR": lambda arguments, node, scope: isinstance(arguments[0](), Error),
    },
    "infix": {
        "=": _compare(lambda a, b: a == b), "<>": _compare(lambda a, b: a != b),
        "<": _compare(lambda a, b: a < b), "<=": _compare(lambda a, b: a <= b),
        ">": _compare(lambda a, b: a > b), ">=": _compare(lambda a, b: a >= b),
        "+": _arithmetic(lambda a, b: a + b), "-": _arithmetic(lambda a, b: a - b),
        "*": _arithmetic(lambda a, b: a * b),
    },
    "prefix": {"-": _negate},
    "field": _field,
}, literal=_number_of, scope=Workbook, extension=_add_in)


def OfAny(expression: Any, scope: Workbook | Mapping[str, Any] | None = None) -> Any:
    """The value of a formula in a workbook, or with the defined names in a mapping."""
    return _interpreter(Expressions.DIALECT.resolve(expression), scope)
