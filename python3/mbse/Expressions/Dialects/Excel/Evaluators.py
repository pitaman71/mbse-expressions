"""Evaluators of the Excel dialect: compute a formula by Excel's rules, in Python.

`Evaluators.OfAny(expression, scope)` binds names to numbers, text, logicals and records (mappings, or objects that
write their properties through `accept`). Values are Python `float` (number), `str` (text), `bool` (logical) and
`Domains.Error`. Excel's rules apply, not Basic's:

- Errors are values: a field a record does not have is `#FIELD!`, a name not bound is `#NAME?`, and an operand of the
  wrong type is `#VALUE!`. Errors propagate through operators and functions, except `ISERROR`, which tests for them, and
  `IF`, which evaluates only the branch it takes (FALSE without an alternative).
- Two-valued logic: `AND` and `OR` evaluate every argument; numbers are true when nonzero, and text is `#VALUE!`.
  An array among their arguments gives its numbers and logicals, its text ignored; with no value at all, they are
  `#VALUE!`.
- Arrays: a list property's values (or a name's list) are an array, which operators do not take (`#VALUE!`). `MAP(xs,
  LAMBDA(p, body))` gives the body's value for each element, errors among them; `ROWS` counts elements (a single value
  is one); `INDEX(xs, n)` is the element at `n`, from 1 and truncated, else `#REF!` (`#NUM!` for no number); `MATCH(x,
  xs, 0)` is the position of the first element equal to `x` (text ignoring case), else `#N/A`, and supports exact
  matching only (another match type is `#VALUE!`); `SUM`, `MIN` and `MAX` take an array's numbers, ignoring its text and
  logicals (`MIN` and `MAX` of none are 0), or a value given alone as arithmetic converts it, over all their arguments;
  `UNIQUE` gives the distinct elements, the first of each. An error among an array's elements is the result of these
  functions but `MAP`, `ROWS`, `INDEX` and `UNIQUE`.
- The bit functions (`BITAND`, `BITOR`, `BITXOR`, `BITLSHIFT`, `BITRSHIFT`) convert their arguments as arithmetic
  does, and give `#NUM!` for a number that is not an integer from 0 to 2^48 - 1, a shift that is not an integer of at
  most 53 either way, and a result beyond 2^48 - 1.
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

import math
import re
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Evaluators as F, Symbolics as S
from mbse.Schemas.Framework import Validators

from . import Domains, Expressions
from .Domains import Error

__all__ = ["OfAny", "Error", "Workbook"]

_VALUE, _FIELD, _NAME, _REF, _NUM, _NA = (Error(code) for code in ("#VALUE!", "#FIELD!", "#NAME?", "#REF!", "#NUM!", "#N/A"))
_BITS = 1 << 48


def _number_of(value: Any) -> Any:
    return float(value) if type(value) is int else value


def _value(value: Any) -> Any:
    """A value as a formula reads it: a number as a double, and a list (a list property's too) as an array."""
    if isinstance(value, Validators.ListRecord):
        value = value.values
    if isinstance(value, (list, tuple)):
        return [_value(item) for item in value]
    return _number_of(value)


def _address(text: str) -> str:
    found = Expressions.address(text)
    if found is None:
        raise ValueError(f"not a cell address: {text!r}")
    return found


_NUMERIC = re.compile(r"[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?")


class Workbook(S.Variables):
    """A workbook, as the scope of its formulas: defined `names`, `sheets` of cells by address, the current `sheet`,
    other `books` by name, and `add_ins` by function name."""

    def __init__(self, names: Mapping[str, Any] | None = None, sheets: Mapping[str, Mapping[str, Any]] | None = None,
                 *, name: str = "Book1", sheet: str | None = None, books: Mapping[str, Workbook] | None = None,
                 add_ins: Mapping[str, Callable[..., Any]] | None = None):
        super().__init__(names)
        self.name = name
        self.sheets = {sheet_name: {_address(a): v for a, v in cells.items()}
                       for sheet_name, cells in (sheets or {}).items()}
        self.sheet = sheet if sheet is not None else next(iter(self.sheets), "Sheet1")
        self.books = dict(books or {})
        self.add_ins = {function.upper(): implementation for function, implementation in (add_ins or {}).items()}

    def lookup(self, reference: Any) -> Any:
        if type(reference).KIND != "cell":
            return _value(self.values[reference.name]) if reference.name in self.values else _NAME
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
    if type(value) is str and _NUMERIC.fullmatch(value.strip()):
        return float(value)  # decimal text, as Excel reads it
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


def _counted(name: str, arguments: list[F.Thunk]) -> None:
    """Raises TypeError when a function of a range of numbers of arguments has another number of them."""
    problem = Domains.arity_problem(name, len(arguments))
    if problem is not None:
        raise TypeError(problem)


def _logic(name: str, combine: Callable[[list[bool]], bool]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> bool | Error:
        _counted(name, arguments)
        truths: list[Any] = []
        for value in [argument() for argument in arguments]:
            if isinstance(value, list):  # an array's numbers and logicals; its text is ignored
                truths += [element if isinstance(element, Error) else element != 0 for element in value
                           if isinstance(element, Error) or type(element) in (bool, float)]
            else:
                truths.append(_truth(value))
        for truth in truths:
            if isinstance(truth, Error):
                return truth
        return combine(truths) if truths else _VALUE

    return apply


def _elements(value: Any) -> list[Any]:
    """An array's elements; a single value is an array of one."""
    return value if isinstance(value, list) else [value]


def _map(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    array = arguments[0]()
    if isinstance(array, Error):
        return array
    return [arguments[1](element) for element in _elements(array)]  # type: ignore[call-arg]


def _rows(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    array = arguments[0]()
    return array if isinstance(array, Error) else float(len(_elements(array)))


def _index(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    array, position = arguments[0](), _number(arguments[1]())
    for value in (array, position):
        if isinstance(value, Error):
            return value
    if not math.isfinite(position):  # type: ignore[arg-type]
        return _NUM
    elements, row = _elements(array), int(position)  # type: ignore[arg-type]
    return elements[row - 1] if 1 <= row <= len(elements) else _REF


def _match(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    value, array, kind = arguments[0](), arguments[1](), _number(arguments[2]())
    for found in (value, array, kind):
        if isinstance(found, Error):
            return found
    if kind != 0 or type(value) not in (bool, float, str):
        return _VALUE
    for position, element in enumerate(_elements(array), 1):
        if type(element) in (bool, float, str) and _rank(element) == _rank(value):
            return float(position)
    return _NA


def _numbers(value: Any) -> list[float] | Error:
    """SUM's, MIN's and MAX's numbers: an array's, its text and logicals ignored, or one value converted."""
    if isinstance(value, list):
        for element in value:
            if isinstance(element, Error):
                return element
        return [element for element in value if type(element) is float]
    number = _number(value)
    return number if isinstance(number, Error) else [number]


def _aggregate(name: str, combine: Callable[[list[float]], float]) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
        _counted(name, arguments)
        numbers: list[float] = []
        for argument in arguments:
            found = _numbers(argument())
            if isinstance(found, Error):
                return found
            numbers += found
        return combine(numbers)

    return apply


def _sum(numbers: list[float]) -> float:
    total = 0.0
    for number in numbers:
        total += number
    return total


def _unique(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    array = arguments[0]()
    if isinstance(array, Error):
        return array
    distinct: list[Any] = []
    for element in _elements(array):  # scalars and errors by value, text ignoring case; records are each distinct
        scalar = type(element) in (bool, float, str) or isinstance(element, Error)
        if not scalar or not any(type(other) is type(element) and _same(other, element) for other in distinct):
            distinct.append(element)
    return distinct


def _same(a: Any, b: Any) -> bool:
    return a == b if isinstance(a, Error) else _rank(a) == _rank(b)


def _not(arguments: list[F.Thunk], node: Any, scope: Any) -> bool | Error:
    truth = _truth(arguments[0]())
    return truth if isinstance(truth, Error) else not truth


def _if(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    _counted("IF", arguments)
    truth = _truth(arguments[0]())
    if isinstance(truth, Error):
        return truth
    if truth:
        return arguments[1]()
    return arguments[2]() if len(arguments) == 3 else False  # without an alternative, FALSE


def _negate(arguments: list[F.Thunk], node: Any, scope: Any) -> float | Error:
    number = _number(arguments[0]())
    return number if isinstance(number, Error) else -number


def _integer(value: Any, limit: int, signed: bool) -> int | Error:
    """A bit function's argument: an integer below `limit`, of either sign when `signed`; otherwise `#NUM!`."""
    number = _number(value)
    if isinstance(number, Error):
        return number
    if not number.is_integer() or abs(number) >= limit or (number < 0 and not signed):
        return _NUM
    return int(number)


def _bit(name: str) -> F.Implementation:
    def apply(arguments: list[F.Thunk], node: Any, scope: Any) -> float | Error:
        shift = name.endswith("SHIFT")
        a, b = _integer(arguments[0](), _BITS, False), _integer(arguments[1](), 54 if shift else _BITS, shift)
        for value in (a, b):
            if isinstance(value, Error):
                return value
        if shift:
            left = b if name == "BITLSHIFT" else -b  # type: ignore[operator]
            result = a << left if left >= 0 else a >> -left  # type: ignore[operator]
            return _NUM if result >= _BITS else float(result)
        return float(a & b if name == "BITAND" else a | b if name == "BITOR" else a ^ b)  # type: ignore[operator]

    return apply


def _field(arguments: list[F.Thunk], node: Any, scope: Any) -> Any:
    record = arguments[0]()
    if isinstance(record, Error):
        return record
    if not Domains.is_record(record):
        return _VALUE
    fields = record if isinstance(record, Mapping) else Validators.properties_of(record)
    if node.name not in fields:
        return _FIELD
    return _value(fields[node.name])


_interpreter = F.Interpreter(Expressions.DIALECT, {
    "function": {
        "AND": _logic("AND", all), "OR": _logic("OR", any), "NOT": _not, "IF": _if,
        "ISERROR": lambda arguments, node, scope: isinstance(arguments[0](), Error),
        **{name: _bit(name) for name in ("BITAND", "BITOR", "BITXOR", "BITLSHIFT", "BITRSHIFT")},
        "ROWS": _rows, "INDEX": _index, "MATCH": _match, "UNIQUE": _unique,
        "ISNUMBER": lambda arguments, node, scope: type(arguments[0]()) is float,
        "SUM": _aggregate("SUM", _sum), "MIN": _aggregate("MIN", lambda numbers: min(numbers, default=0.0)),
        "MAX": _aggregate("MAX", lambda numbers: max(numbers, default=0.0)),
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
    "map": _map,
}, literal=_number_of, scope=Workbook, extension=_add_in)


def OfAny(expression: Any, scope: Workbook | Mapping[str, Any] | None = None) -> Any:
    """The value of a formula in a workbook, or with the defined names in a mapping."""
    return _interpreter(Expressions.DIALECT.resolve(expression), scope)
