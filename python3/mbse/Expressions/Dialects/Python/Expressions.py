"""Expressions of the Python dialect: Python expressions, with the imports they need, as Python's `ast` has them.

Python's terms are the framework's `literal`, `variable` and `let`, whose shape Python's constants, names and
`(lambda name: body)(value)` have, and its own kinds, which `install` adds to `Expressions.Framework.Term` by schema
extension, each a value object; a term carries no domain. The tags of its own are qualified by the dialect, `python_<kind>`
(`python_binop`), since every dialect adds its kinds to the one union of terms:

- `literal`, the framework's: a constant, a basic scalar (`value`). `variable`, the framework's: a name, the value
  bound to a `name`; the names of `BUILTINS` are always bound.
- `python_attribute`: `value.attr`. `python_subscript`: `value[key]`, for a `str` key, and `python_index`:
  `value[index]`, for an index that is an expression. `python_call`: a function, the slot `function`, applied to
  ordered `arguments`, e.g. `np.greater_equal(x, 18)`, whose function is the attribute `greater_equal` of the name `np`;
  its own, not the framework's `call`, whose callable is a name, since a Python callee is a term.
- `python_compare` (`==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `not in`), `python_boolop` (`and`, `or`), `python_binop`
  (`+`, `-`, `*`, `/`, `//`, `%`, `**`, `&`, `|`, `^`, `<<`, `>>`) and `python_unaryop` (`not`, `-`, `+`, `~`), each
  with one `operator` and two operands, `left` and `right` (one, `operand`, for `python_unaryop`).
- `python_ifexp`: `body if test else orelse`.
- `python_generator`: `(element for name in iterable if condition ...)`, a generator expression of one `for` and any
  number of `conditions`, which binds `name` to each item of `iterable` within the element and the conditions. As the
  only argument of a call it is written without its parentheses: `all(p.pin > 0 for p in ports)`.
- `let`, the framework's: `(lambda name: body)(value)`, Python's idiom for binding a name within an expression.
- `list` and `mapping`, the framework's container constructors: a list display, `[a, b]`, and a dict display,
  `{k: v}`.
- `python_import` (`import module` or `import module as alias`) and `python_importfrom` (`from module import name` or
  `... as alias`) bind a name within their `body`, which is the rest of the expression; `Text.ToText` writes them as the
  lines before it. What they may import is up to the scope that evaluates them (see `Evaluators`).

A NumPy expression is a Python expression that imports numpy: NumPy is a vocabulary of calls, not a dialect.

`DIALECT` reads them (`Terms.Dialect`). The writers (`constant`, `name`, `attribute`, ...) write them through the
builders, wherever a term is written, in a transaction. `Text.ToText` writes an expression as Python source,
parenthesized only where precedence requires, and `Text.FromText` reads one back: imports, then one expression.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from . import Domains

__all__ = ["install", "DIALECT", "BUILTINS", "Writer", "constant", "name", "attribute", "subscript", "index", "call",
           "compare", "boolop", "binop", "unaryop", "ifexp", "generator", "let_", "list_", "dict_", "import_",
           "importfrom"]

CONSTANT, NAME, ATTRIBUTE, SUBSCRIPT, INDEX, CALL = (
    "literal", "variable", "python_attribute", "python_subscript", "python_index", "python_call")
COMPARE, BOOLOP, BINOP, UNARYOP, IFEXP, GENERATOR = (
    "python_compare", "python_boolop", "python_binop", "python_unaryop", "python_ifexp", "python_generator")
LET, IMPORT, IMPORTFROM = "let", "python_import", "python_importfrom"
LIST, DICT = "list", "mapping"


def install(txn: Any) -> Any:
    """Python's own kinds, added to the framework's terms: run after `Framework.install`, in a transaction of its
    own."""
    S = txn.Schemas
    kinds = {"Attribute": ATTRIBUTE, "Subscript": SUBSCRIPT, "Index": INDEX,
             "Call": CALL, "Compare": COMPARE, "BoolOp": BOOLOP, "BinOp": BINOP, "UnaryOp": UNARYOP, "IfExp": IFEXP,
             "GeneratorExp": GENERATOR, "Import": IMPORT, "ImportFrom": IMPORTFROM}
    dialect, specs = F.dialect(txn, "Expressions.Python")  # its dialect: a singleton
    return txn.uid("mbse.Expressions.Python/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({**dialect, "Term": S.OfUnion, **{kind: S.OfObject for kind in kinds}})  # Term: the framework's
        .spec([
            *specs,
            lambda _: _.Attribute.name("Expressions.Python.Attribute").properties({
                "attr": S.OfStr, "value": _.Term}),
            lambda _: _.Subscript.name("Expressions.Python.Subscript").properties({
                "key": S.OfStr, "value": _.Term}),
            lambda _: _.Index.name("Expressions.Python.Index").properties({
                "value": _.Term, "index": _.Term}),
            lambda _: _.Call.name("Expressions.Python.Call").properties({
                "function": _.Term,
                "arguments": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term])),
            }),
            *[lambda _, kind=kind: getattr(_, kind).name(f"Expressions.Python.{kind}").properties({
                "operator": S.OfStr, "left": _.Term, "right": _.Term})
              for kind in ("Compare", "BoolOp", "BinOp")],
            lambda _: _.UnaryOp.name("Expressions.Python.UnaryOp").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.IfExp.name("Expressions.Python.IfExp").properties({
                "test": _.Term, "body": _.Term, "orelse": _.Term}),
            lambda _: _.GeneratorExp.name("Expressions.Python.GeneratorExp").properties({
                "name": S.OfStr,  # bound to each item in the element and the conditions
                "iterable": _.Term,
                "element": _.Term,
                "conditions": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term])),
            }),
            lambda _: _.Import.name("Expressions.Python.Import").properties({
                "module": S.OfStr, "alias": S.OfStr, "body": _.Term}),
            lambda _: _.ImportFrom.name("Expressions.Python.ImportFrom").properties({
                "module": S.OfStr, "name": S.OfStr, "alias": S.OfStr, "body": _.Term}),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # branches added: schema extension
                lambda t, kind=kind, tag=tag: t.name(tag).schema([getattr(_, kind)]) for kind, tag in kinds.items()]),
        ])]))])


BUILTINS = frozenset({"abs", "all", "any", "bool", "float", "getattr", "hasattr", "int", "len", "max", "min", "round", "set",
                      "str", "sum"})
"""The builtins an expression may use without importing them: the default builtins of a scope (see `Evaluators`)."""


def _dotted(name: str) -> bool:
    return all(part.isidentifier() for part in name.split("."))


def _identifier_problems(what: str, value: Any) -> list[str]:
    if type(value) is str and value and not value.isidentifier():
        return [f"{what} must be an identifier, got {value!r}"]
    return []


def _identifier(property_name: str, what: str) -> Any:
    """The check that a record's property, if a non-empty str, is an identifier."""
    return lambda record: _identifier_problems(what, F.attributes_of(record).get(property_name))


def _alias_problems(what: str, attributes: dict[str, Any]) -> list[str]:
    """An alias, if given, is an identifier, and not empty."""
    if attributes.get("alias") == "":
        return [f"{F._article(what)} needs an alias"]
    return _identifier_problems(f"{F._article(what)}'s alias", attributes.get("alias"))


def _module_problems(what: str, module: Any) -> list[str]:
    if type(module) is not str or _dotted(module):
        return []
    return [f"{F._article(what)}'s module must be a dotted name, got {module!r}"]


def _import_check(record: Any) -> list[str]:
    attributes = F.attributes_of(record)
    return _module_problems("import", attributes.get("module")) + _alias_problems("import", attributes)


def _importfrom_check(record: Any) -> list[str]:
    attributes = F.attributes_of(record)
    return (_module_problems("importfrom", attributes.get("module"))
            + _identifier_problems("an importfrom's name", attributes.get("name"))
            + _alias_problems("importfrom", attributes))


def _import_names(attributes: Any) -> tuple[str, ...]:
    return (attributes.get("alias") or attributes["module"].split(".")[0],)


def _importfrom_names(attributes: Any) -> tuple[str, ...]:
    return (attributes.get("alias") or attributes["name"],)


def _native(value: Any) -> Writer:
    """The constant of a native value: a basic scalar, the only native value `spec` gives it."""
    return constant(value)


_ANY = FD.Function((FD.Anything,), FD.Anything)


def _operator_kind(vocabulary: dict[str, FD.Signature]) -> F.Kind:
    return F.Kind(F.APPLICATION, operator="operator", vocabulary=vocabulary, required=("operator",))


DIALECT = F.Dialect("Python", {
    CONSTANT: F.Kind(F.LITERAL),
    NAME: F.Kind(F.REFERENCE, required=("name",), ambient=BUILTINS, check=_identifier("name", "a name")),
    ATTRIBUTE: F.Kind(F.APPLICATION, operator="attr", signature=_ANY, required=("attr",),
                      check=_identifier("attr", "an attribute")),
    SUBSCRIPT: F.Kind(F.APPLICATION, operator="key", signature=_ANY, required=("key",)),
    INDEX: F.Kind(F.APPLICATION, signature=FD.Function((FD.Anything, FD.Anything), FD.Anything)),
    CALL: F.Kind(F.APPLICATION, signature=FD.Opaque()),
    COMPARE: _operator_kind(Domains.COMPARE),
    BOOLOP: _operator_kind(Domains.BOOLOP),
    BINOP: _operator_kind(Domains.BINOP),
    UNARYOP: _operator_kind(Domains.UNARYOP),
    IFEXP: F.Kind(F.APPLICATION, signature=FD.Function((FD.Anything, FD.Anything, FD.Anything), FD.Anything)),
    GENERATOR: F.Kind(F.QUANTIFIER, signature=Domains.GENERATOR, required=("name",),
                      check=_identifier("name", "a generator's name")),
    LET: F.Kind(F.BINDING, required=("name",), check=_identifier("name", "a let's name")),
    LIST: F.Kind(F.APPLICATION, signature=FD.Opaque()),
    DICT: F.Kind(F.APPLICATION, signature=FD.Opaque()),
    IMPORT: F.Kind(F.IMPORT, required=("module",), names=_import_names, check=_import_check),
    IMPORTFROM: F.Kind(F.IMPORT, required=("module", "name"), names=_importfrom_names, check=_importfrom_check),
}, domain_of=Domains.of, literal=_native)
"""The Python dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A Python term, written through the builders: a spec, which writes its term where it is given."""

    __slots__ = ()


def _spec(value: Any) -> F.Writer:
    return DIALECT.spec(value)


def _kind(tag: str, attributes: dict[str, Any], slots: dict[str, Any], variadic: tuple[str, list[Any]] | None = None
          ) -> Writer:
    """The writer of a term of kind `tag`: its attributes and its slots (specs) that are not None, and its variadic
    arguments (specs)."""
    specs = {slot: _spec(value) for slot, value in slots.items() if value is not None}
    many = None if variadic is None else (variadic[0], [_spec(value) for value in variadic[1]])

    def write(union: Any) -> Any:
        def record(r: Any) -> Any:
            for attribute_name, value in attributes.items():
                if value is not None:
                    getattr(r, attribute_name)(value)
            for slot, value in specs.items():
                getattr(r, slot)(value)
            if many is not None:
                getattr(r, many[0])(many[1])
            return r

        return getattr(union, tag)(record)

    return Writer(write)


def constant(value: Any) -> Writer:
    """The constant `value`, a basic scalar."""
    return Writer(lambda u: getattr(u, CONSTANT)(lambda r: r.value(lambda p: p.as_scalar(value))))


def name(name: str) -> Writer:
    """The value bound to `name`."""
    return Writer(lambda u: getattr(u, NAME)(lambda r: r.name(name)))


def attribute(value: Any, attr: str) -> Writer:
    """`value.attr`; each argument of these writers is a spec (a native value is a constant)."""
    return _kind(ATTRIBUTE, {"attr": attr}, {"value": value})


def subscript(value: Any, key: str) -> Writer:
    """`value[key]`."""
    return _kind(SUBSCRIPT, {"key": key}, {"value": value})


def index(value: Any, index: Any) -> Writer:
    """`value[index]`."""
    return _kind(INDEX, {}, {"value": value, "index": index})


def call(function: Any, *arguments: Any) -> Writer:
    """`function(*arguments)`. A dotted name as the function is a chain of attributes: `call('np.add', 1, 2)` is
    `np.add(1, 2)`."""
    if type(function) is str:
        first, *rest = function.split(".")
        function = name(first)
        for attr in rest:
            function = attribute(function, attr)
    return _kind(CALL, {}, {"function": function}, ("arguments", list(arguments)))


def compare(operator: str, left: Any, right: Any) -> Writer:
    return _kind(COMPARE, {"operator": operator}, {"left": left, "right": right})


def boolop(operator: str, left: Any, right: Any) -> Writer:
    return _kind(BOOLOP, {"operator": operator}, {"left": left, "right": right})


def binop(operator: str, left: Any, right: Any) -> Writer:
    return _kind(BINOP, {"operator": operator}, {"left": left, "right": right})


def unaryop(operator: str, operand: Any) -> Writer:
    return _kind(UNARYOP, {"operator": operator}, {"operand": operand})


def ifexp(test: Any, body: Any, orelse: Any) -> Writer:
    """`body if test else orelse`."""
    return _kind(IFEXP, {}, {"test": test, "body": body, "orelse": orelse})


def generator(name: str, iterable: Any, element: Any, *conditions: Any) -> Writer:
    """`(element for name in iterable if condition ...)`."""
    return _kind(GENERATOR, {"name": name}, {"iterable": iterable, "element": element}, ("conditions", list(conditions)))


def let_(name: str, value: Any, body: Any) -> Writer:
    """`(lambda name: body)(value)`."""
    return _kind(LET, {"name": name}, {"value": value, "body": body})


def list_(*elements: Any) -> Writer:
    """`[elements, ...]`, a list display."""
    return _kind(LIST, {}, {}, ("elements", list(elements)))


def dict_(*entries: tuple[Any, Any]) -> Writer:
    """`{key: value, ...}`, a dict display: `dict_(("a", 1), ("b", x))`."""
    pairs = [(_spec(key), _spec(value)) for key, value in entries]
    return Writer(lambda u: getattr(u, DICT)(lambda r: r.entries([
        lambda a, key=key, value=value: a.as_object(lambda o: o.key(key).value(value)) for key, value in pairs])))


def import_(module: str, body: Any, alias: str | None = None) -> Writer:
    """`import module [as alias]`, then `body`."""
    return _kind(IMPORT, {"module": module, "alias": alias}, {"body": body})


def importfrom(module: str, name: str, body: Any, alias: str | None = None) -> Writer:
    """`from module import name [as alias]`, then `body`."""
    return _kind(IMPORTFROM, {"module": module, "name": name, "alias": alias}, {"body": body})
