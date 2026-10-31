"""Expressions of the Matlab dialect: MATLAB expressions over scalars and structs, as MATLAB source writes them.

Matlab's terms are four of the framework's kinds (`mbse.Expressions.Framework.Terms`) and six of its own, which
`install` adds to `Expressions.Framework.Term` by schema extension (a term carries no domain):

- `literal` (the framework's): a constant, a number (`int` or `float`, both doubles), a logical (`bool`) or a string
  scalar (`str`), its `value`.
- `variable` (the framework's): an identifier, the value bound to a variable, its `name`.
- `list` (the framework's container constructor): `[a, b]`, the concatenation of its elements into a row array.
- `call` (the framework's): a function (`callable`) applied to ordered `arguments`, for the functions in
  `Domains.CALLS` (`isfield`, the bit functions, and `all`, `any`, `nnz`, `numel`, `sum`, `min`, `max`, `unique` and
  `ismember` of arrays).
- `matlab_binary` (`Expressions.Matlab.Binary`): `left <operator> right`, for the operators in `Domains.BINARY` (`==`,
  `~=`, `<`, ..., `&&`, `||`, `+`, `-`, `.*`).
- `matlab_unary` (`Expressions.Matlab.Unary`): `<operator> operand`, for `~` and `-`.
- `matlab_field` (`Expressions.Matlab.Field`): `value.name`, a field of a struct.
- `matlab_index` (`Expressions.Matlab.Index`): `value(index)`, an element of an array, from 1.
- `matlab_arrayfun` (`Expressions.Matlab.Arrayfun`): `arrayfun(@(name) body, array)`, the body's values for each
  element of the array, bound to `name`.
- `matlab_import` (`Expressions.Matlab.Import`): `import pkg.fn` or `import pkg.*` (its `name`), which make a
  package's functions callable by their short names within its body, the rest of the expression; `Text.ToText` writes
  it as a line before it. Functions are also found on the path and by their qualified names (`pkg.fn(x)`); which exist
  is up to the scope that evaluates them (see `Evaluators`).

The kinds of its own are tagged `matlab_...`: a branch of `Expressions.Framework.Term` is named once in a store, and
other dialects have kinds of the same names (`binary`, `import`, ...). There is no binding: translators substitute a
let's value for its name. `DIALECT` reads the terms (`Terms.Dialect`), validates and infers; the writers (`constant`,
`identifier`, `binary`, ...) write them through the builders, wherever a term is written, in a transaction.
`Text.ToText` writes a term as MATLAB source, e.g. `this.age >= 18 && isfield(this, "email")`.
"""

from __future__ import annotations

import re
from typing import Any

from mbse.Expressions.Framework import Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "Writer", "constant", "identifier", "binary", "unary", "call", "field", "index",
           "arrayfun", "array", "import_"]


def install(txn: Any) -> Any:
    """Matlab's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its
    own."""
    S = txn.Schemas
    dialect, specs = F.dialect(txn, "Expressions.Matlab")  # its dialect: a singleton
    return txn.uid("mbse.Expressions.Matlab/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({**dialect, "Term": S.OfUnion, "Binary": S.OfObject, "Unary": S.OfObject, "Field": S.OfObject,
                  "Index": S.OfObject, "Arrayfun": S.OfObject, "Import": S.OfObject})  # Term: the framework's union
        .spec([
            *specs,
            lambda _: _.Binary.name("Expressions.Matlab.Binary").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term}),
            lambda _: _.Unary.name("Expressions.Matlab.Unary").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.Field.name("Expressions.Matlab.Field").properties({
                "name": S.OfStr, "value": _.Term}),
            lambda _: _.Index.name("Expressions.Matlab.Index").properties({
                "value": _.Term, "index": _.Term}),
            lambda _: _.Arrayfun.name("Expressions.Matlab.Arrayfun").properties({
                "name": S.OfStr,  # bound to each element in the body
                "array": _.Term, "body": _.Term}),
            lambda _: _.Import.name("Expressions.Matlab.Import").properties({
                "name": S.OfStr,  # pkg.fn or pkg.*
                "body": _.Term}),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # branches added: schema extension
                lambda t: t.name("matlab_binary").schema([_.Binary]),
                lambda t: t.name("matlab_unary").schema([_.Unary]),
                lambda t: t.name("matlab_field").schema([_.Field]),
                lambda t: t.name("matlab_index").schema([_.Index]),
                lambda t: t.name("matlab_arrayfun").schema([_.Arrayfun]),
                lambda t: t.name("matlab_import").schema([_.Import]),
            ]),
        ])]))])


_SCALARS = (bool, int, float, str)  # what a constant holds: Matlab has no bytes


def _literal_check(record: Any) -> list[str]:
    """A constant holds a number, a logical or a string."""
    value = F.attributes_of(record).get("value")
    return [] if type(value) in _SCALARS else [f"a literal cannot hold a {type(value).__name__}"]


def _arrayfun_check(record: Any) -> list[str]:
    name = F.attributes_of(record).get("name")
    return [] if type(name) is not str or re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", name) else [
        f"an arrayfun's parameter must be an identifier, got {name!r}"]


def _qualified(name: str, wildcard: bool = False) -> bool:
    parts = name.split(".")
    if wildcard and len(parts) > 1 and parts[-1] == "*":
        parts = parts[:-1]
    return all(part.isidentifier() for part in parts)


def _import_check(record: Any) -> list[str]:
    name = F.attributes_of(record).get("name")
    if type(name) is not str or "." in name and _qualified(name, wildcard=True):
        return []
    return [f"an import's name must be pkg.name or pkg.*, got {name!r}"]


def _native(value: Any) -> Writer | None:
    """The constant of a native value; None for one Matlab has no constant of."""
    return constant(value) if type(value) in _SCALARS else None


DIALECT = F.Dialect("Matlab", {
    "literal": F.Kind(F.LITERAL, check=_literal_check),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.CALLS, required=("callable",)),
    "matlab_binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",)),
    "matlab_unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",)),
    "matlab_field": F.Kind(F.APPLICATION, operator="name", signature=Domains.FIELD, required=("name",)),
    "matlab_index": F.Kind(F.APPLICATION, signature=Domains.INDEX),
    "matlab_arrayfun": F.Kind(F.QUANTIFIER, signature=Domains.ARRAYFUN, required=("name",), check=_arrayfun_check),
    "matlab_import": F.Kind(F.IMPORT, required=("name",), check=_import_check),
    "list": F.Kind(F.APPLICATION, signature=Domains.CONCATENATION),
}, domain_of=Domains.of, literal=_native)
"""The Matlab dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A Matlab term, written through the builders: a spec, which writes its term where it is given."""

    __slots__ = ()


def _spec(value: Any) -> Any:
    return None if value is None else DIALECT.spec(value)


def _record(tag: str, attributes: dict[str, Any], slots: dict[str, Any]) -> Writer:
    """The writer of a term of kind `tag`, with its attributes and its slots (specs; None leaves a slot empty)."""
    specs = {name: _spec(value) for name, value in slots.items()}

    def write(u: Any) -> Any:
        def record(r: Any) -> Any:
            for name, value in attributes.items():
                getattr(r, name)(value)
            for name, value in specs.items():
                if value is not None:
                    getattr(r, name)(value)
            return r

        return getattr(u, tag)(record)

    return Writer(write)


def constant(value: Any) -> Writer:
    """The constant `value`: a number, a logical or a string."""
    if type(value) not in _SCALARS:
        raise TypeError(f"a literal cannot hold a {type(value).__name__}")
    return Writer(lambda u: u.literal(lambda r: r.value(lambda p: p.as_scalar(value))))


def identifier(name: str) -> Writer:
    """The variable `name`."""
    return Writer(lambda u: u.variable(lambda v: v.name(name)))


def binary(operator: str, left: Any, right: Any) -> Writer:
    """`left <operator> right`; each operand is a spec (a native value is a constant)."""
    return _record("matlab_binary", {"operator": operator}, {"left": left, "right": right})


def unary(operator: str, operand: Any) -> Writer:
    """`<operator> operand`."""
    return _record("matlab_unary", {"operator": operator}, {"operand": operand})


def call(function: str, *arguments: Any) -> Writer:
    """`function(arguments...)`."""
    specs = [DIALECT.spec(argument) for argument in arguments]
    return Writer(lambda u: u.call(lambda r: r.callable(function).arguments(specs)))


def field(value: Any, name: str) -> Writer:
    """`value.name`."""
    return _record("matlab_field", {"name": name}, {"value": value})


def index(value: Any, index: Any) -> Writer:
    """`value(index)`, from 1."""
    return _record("matlab_index", {}, {"value": value, "index": index})


def arrayfun(name: str, array: Any, body: Any) -> Writer:
    """`arrayfun(@(name) body, array)`."""
    return _record("matlab_arrayfun", {"name": name}, {"array": array, "body": body})


def array(*elements: Any) -> Writer:
    """`[elements, ...]`, their concatenation into a row array."""
    specs = [DIALECT.spec(element) for element in elements]
    return Writer(lambda u: u.list(lambda r: r.elements(specs)))


def import_(name: str, body: Any) -> Writer:
    """`import name`, then `body`."""
    return _record("matlab_import", {"name": name}, {"body": body})
