"""Expressions of the MATLAB dialect: MATLAB expressions over scalars and structs, as MATLAB source writes them.

MATLAB's terms are values of its `Term`, `Expressions.MATLAB.Expressions.Term`, the branch `matlab` of
`Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are four of
the framework's kinds (`mbse.Expressions.Framework.Terms`), six of its own, whose slots hold MATLAB's terms, and the
framework's kinds of invalid syntax (`error`, `missing`); a term carries no domain:

- `literal` (the framework's): a constant, a number (`int` or `float`, both doubles), a logical (`bool`) or a string
  scalar (`str`), its `value`, with its spelling (`text`) where it has one.
- `variable` (the framework's): an identifier, the value bound to a variable, its `name`.
- `list` (the framework's container constructor): `[a, b]`, the concatenation of its elements into a row array.
- `call` (the framework's): a function (`callable`) applied to ordered `arguments`, for the functions in
  `Domains.CALLS` (`isfield`, the bit functions, and `all`, `any`, `nnz`, `numel`, `sum`, `min`, `max`, `unique` and
  `ismember` of arrays).
- `binary` (`Expressions.MATLAB.Expressions.Binary`): `left <operator> right`, for the operators in `Domains.BINARY` (`==`,
  `~=`, `<`, ..., `&&`, `||`, `+`, `-`, `.*`).
- `unary` (`Expressions.MATLAB.Expressions.Unary`): `<operator> operand`, for `~` and `-`.
- `field` (`Expressions.MATLAB.Expressions.Field`): `value.name`, a field of a struct.
- `index` (`Expressions.MATLAB.Expressions.Index`): `value(index)`, an element of an array, from 1.
- `arrayfun` (`Expressions.MATLAB.Expressions.Arrayfun`): `arrayfun(@(name) body, array)`, the body's values for each
  element of the array, bound to `name`.
- `import` (`Expressions.MATLAB.Expressions.Import`): `import pkg.fn` or `import pkg.*` (its `name`), which make a
  package's functions callable by their short names within its body, the rest of the expression; `Text.ToText` writes
  it as a line before it. Functions are also found on the path and by their qualified names (`pkg.fn(x)`); which exist
  is up to the scope that evaluates them (see `Evaluators`).

Its kinds are named plainly in its union, though other dialects have kinds of the same names (`binary`, `import`, ...):
each union names its own. There is no binding: translators substitute a
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
    """MATLAB's union of its kinds, added to the framework's terms as the branch `matlab`, its own kinds, and its
    dialect's schema, whose singleton is `Expressions.MATLAB.Expressions`: run after `Framework.install`, in a transaction of its
    own; run again, it writes nothing.
    Its holder, `Expressions.MATLAB.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
    its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.MATLAB.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion, "Expression": S.OfObject,
                  "Binary": S.OfObject, "Unary": S.OfObject, "Field": S.OfObject, "Index": S.OfObject,
                  "Arrayfun": S.OfObject, "Import": S.OfObject})  # FrameworkTerm: the framework's union, by name
        .spec([
            # its dialect: the singleton `Expressions.MATLAB.Expressions`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.MATLAB.Expressions.Dialect").ref(True).singleton("Expressions.MATLAB.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "uses": lambda a: a.relation([Framework.Uses]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("matlab").schema([_.Dialect])]),
            # its union of its kinds: the framework's it reuses, its own, and invalid syntax
            lambda _: _.Term.name("Expressions.MATLAB.Expressions.Term").branches([
                lambda t: t.name("literal").schema([Framework.Literal]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("call").schema([Framework.Call]),
                lambda t: t.name("list").schema([Framework.List]),
                lambda t: t.name("binary").schema([_.Binary]),
                lambda t: t.name("unary").schema([_.Unary]),
                lambda t: t.name("field").schema([_.Field]),
                lambda t: t.name("index").schema([_.Index]),
                lambda t: t.name("arrayfun").schema([_.Arrayfun]),
                lambda t: t.name("import").schema([_.Import]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            lambda _: _.Binary.name("Expressions.MATLAB.Expressions.Binary").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term}),
            lambda _: _.Unary.name("Expressions.MATLAB.Expressions.Unary").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.Field.name("Expressions.MATLAB.Expressions.Field").properties({
                "name": S.OfStr, "value": _.Term}),
            lambda _: _.Index.name("Expressions.MATLAB.Expressions.Index").properties({
                "value": _.Term, "index": _.Term}),
            lambda _: _.Arrayfun.name("Expressions.MATLAB.Expressions.Arrayfun").properties({
                "name": S.OfStr,  # bound to each element in the body
                "array": _.Term, "body": _.Term}),
            lambda _: _.Import.name("Expressions.MATLAB.Expressions.Import").properties({
                "name": S.OfStr,  # pkg.fn or pkg.*
                "body": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
            # to its `Term`
            lambda _: _.Expression.name("Expressions.MATLAB.Expressions.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("matlab").schema([_.Term])]),
        ])]))])


_SCALARS = (bool, int, float, str)  # what a constant holds: MATLAB has no bytes


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
    """The constant of a native value; None for one MATLAB has no constant of."""
    return constant(value) if type(value) in _SCALARS else None


DIALECT = F.Dialect("MATLAB.Expressions", {
    "literal": F.Kind(F.LITERAL, check=_literal_check),
    "variable": F.Kind(F.REFERENCE, required=("name",)),
    "call": F.Kind(F.APPLICATION, operator="callable", vocabulary=Domains.CALLS, required=("callable",)),
    "binary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.BINARY, required=("operator",)),
    "unary": F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.UNARY, required=("operator",)),
    "field": F.Kind(F.APPLICATION, operator="name", signature=Domains.FIELD, required=("name",)),
    "index": F.Kind(F.APPLICATION, signature=Domains.INDEX),
    "arrayfun": F.Kind(F.QUANTIFIER, signature=Domains.ARRAYFUN, required=("name",), check=_arrayfun_check),
    "import": F.Kind(F.IMPORT, required=("name",), check=_import_check),
    "list": F.Kind(F.APPLICATION, signature=Domains.CONCATENATION),
}, domain_of=Domains.of, literal=_native)
"""The MATLAB dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A MATLAB term, written through the builders: a spec, which writes its term where it is given."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


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
    return _record("binary", {"operator": operator}, {"left": left, "right": right})


def unary(operator: str, operand: Any) -> Writer:
    """`<operator> operand`."""
    return _record("unary", {"operator": operator}, {"operand": operand})


def call(function: str, *arguments: Any) -> Writer:
    """`function(arguments...)`."""
    specs = [DIALECT.spec(argument) for argument in arguments]
    return Writer(lambda u: u.call(lambda r: r.callable(function).arguments(specs)))


def field(value: Any, name: str) -> Writer:
    """`value.name`."""
    return _record("field", {"name": name}, {"value": value})


def index(value: Any, index: Any) -> Writer:
    """`value(index)`, from 1."""
    return _record("index", {}, {"value": value, "index": index})


def arrayfun(name: str, array: Any, body: Any) -> Writer:
    """`arrayfun(@(name) body, array)`."""
    return _record("arrayfun", {"name": name}, {"array": array, "body": body})


def array(*elements: Any) -> Writer:
    """`[elements, ...]`, their concatenation into a row array."""
    specs = [DIALECT.spec(element) for element in elements]
    return Writer(lambda u: u.list(lambda r: r.elements(specs)))


def import_(name: str, body: Any) -> Writer:
    """`import name`, then `body`."""
    return _record("import", {"name": name}, {"body": body})
