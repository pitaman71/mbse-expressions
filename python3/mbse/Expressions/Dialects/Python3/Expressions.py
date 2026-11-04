"""Expressions of the Python3 dialect: every expression of Python 3, 3.0 to 3.15, as CPython's `ast` has them, in
mbse-programs' names and shapes, with the imports they need.

The dialect is complete over Python 3's expression syntax (mbse-basis
[CAP-227: the Python3 expression dialect](mbse:mbse-basis/docs/capabilities/CAP-227.md), by
[CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules). Python3's terms are
values of its `Term`, `Expressions.Python3.Term`, the branch `python3` of `Expressions.Framework.Term`, which `install`
defines and adds to `Expressions.Framework.Term` by schema extension. Its kinds are named as mbse-programs names them
(`mbse:mbse-programs/python3/mbse/Programs/Python/Syntax.py`), lowercased as branch tags (`binop`, `generatorexp`), each
a value object `Expressions.Python3.<Kind>` with mbse-programs' properties, in source order; an identifier is a `str`,
where mbse-programs has an `Identifier` node, and the expression context (`ctx`) is not represented, as there. A term
carries no domain. Its kinds:

- Atoms: `literal`, a constant a basic scalar or any value holds (`Expressions.Python3.Literal`, refining the framework's
  `literal`, mbse-basis [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md), with the
  properties its spelling encodes, mbse-basis
  [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): `prefix` and `quote` of a string or
  bytes, `base` of an int, `separators` where digits are grouped by `_`); `constant`, Python3's own, for what no schema
  holds (`singleton`, `None` or `...`; a complex number's `real` and `imag`), its spelling too; `variable`, the
  framework's, a name (`ast.Name`'s `id` is its `name`), the names of `BUILTINS` always bound; `concatenatedstring`,
  adjacent string literals (`values`); `joinedstr`, an f-string, and `templatestr` (3.14), a t-string: `prefix`,
  `quote` and `values`, each a `stringtext` (`spelling`, as written) or a `formattedvalue` (`interpolation` in a
  t-string: `value`, `text`, `debug`, `conversion`, `format_spec`, a `formatspec` of `values`); `parenthesized`,
  parentheses written in the source (`value`).
- Displays: `tuple`, `list` (the framework's container constructor, its `elements` `ast`'s `elts`), `set` and `dict`
  (`items`, each a `dictitem`, `key` and `value`, without a key for `**value`); the comprehensions `listcomp`,
  `setcomp`, `generatorexp` (`elt`) and `dictcomp` (`key`, `value`), each of `generators`, `comprehension`s
  (`is_async`, `target`, `iter`, `ifs`). As a call's only argument a generator expression is written without its own
  parentheses: `all(p.pin > 0 for p in ports)`.
- `yield` (`value`, optional), `yieldfrom` and `await` (`value`).
- Primaries: `attribute` (`value.attr`); `subscript` (`value[slice]`), whose index is any term, a `slice` (`lower`,
  `upper`, `step`, each optional) or a `tuple` of them for several dimensions, so a tensor's every index; `call`
  (`func`, a term, applied to `args` and `keywords`, each a `keyword`, `arg` and `value`, `**value` without an `arg`);
  `starred` (`*value`).
- Operators: `unaryop` (`op`, `operand`), `binop` (`left`, `op`, `right`), `compare`, a chain (`left`, then
  `comparisons`, each a `comparison`, `op` and `comparator`: `a < b <= c`), `boolop` (`op`, n `values`), `namedexpr`
  (`target := value`), `ifexp` (`body if test else orelse`) and `lambda` (`args`, an `arguments` of `arg`s, and its
  `body`, an expression, so a term: the decision that a body is not part of the term is about statements).
- Extensions, with no counterpart in Python's grammar (`EXTENSIONS`): `let`, the framework's, `(lambda name:
  body)(value)`, Python's idiom for binding a name; `import` (`import module` or `... as alias`) and `importfrom`
  (`from module import name` or `... as alias`), which bind a name within their `body`, the rest of the expression;
  `Text.ToText` writes them as the lines before it. What they may import is up to the scope that evaluates them (see
  `Evaluators`).
- The framework's kinds of invalid syntax, `error` and `missing`.

A binding target, a comprehension's `target` and a named expression's, holds `Expressions.Python3.Pattern`, the union of
the terms a target may be (`variable`, `tuple`, `list`, `starred`, `attribute`, `subscript`, `parenthesized`), each a
schema of a term too, and invalid syntax (the framework's `error` and `missing`), as every dialect's `Type` and
`Pattern` hold it: every dialect has a `Pattern` union for its binding targets, as the dialects proposal decided
("(ii)"). The framework reads a target, as any helper, as a `Terms.Part`, its terms after the clause's own; a lambda's
parameters are `arg`s, not patterns.

Each kind's `Kind` records the Python versions that have it (`standards`, `STANDARDS`'s names from the one it arrived
in; none for an extension). A NumPy expression is a Python expression that imports numpy: NumPy is a vocabulary of
calls, not a dialect.

`DIALECT` reads them (`Terms.Dialect`). The writers (`constant`, `name`, `attribute`, ...) write them through the
builders, wherever a term is written, in a transaction; a helper's writer (`keyword`, `comparison`, `comprehension`,
`arg`, `formattedvalue`, ...) is given where its kind takes one. `Text.ToText` writes an expression as Python source,
parenthesized only where precedence requires, and `Text.FromText` reads one back: imports, then one expression.
"""

from __future__ import annotations

import keyword as _keyword
from collections.abc import Mapping, Sequence
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F
from mbse.Schemas.Framework import Schemas

from . import Domains

__all__ = ["install", "DIALECT", "BUILTINS", "EXTENSIONS", "STANDARDS", "Writer", "Helper", "constant", "name",
           "concatenatedstring", "joinedstr", "templatestr", "stringtext", "formattedvalue", "interpolation",
           "parenthesized", "tuple_", "list_", "set_", "dict_", "listcomp", "setcomp", "dictcomp", "generatorexp",
           "comprehension", "yield_", "yieldfrom", "await_", "attribute", "subscript", "slice_", "call", "keyword",
           "starred", "unaryop", "binop", "compare", "comparison", "boolop", "namedexpr", "ifexp", "lambda_", "arg",
           "let_", "import_", "importfrom"]

LITERAL, CONSTANT, NAME = "literal", "constant", "variable"
CONCATENATEDSTRING, JOINEDSTR, TEMPLATESTR, PARENTHESIZED = "concatenatedstring", "joinedstr", "templatestr", "parenthesized"
TUPLE, LIST, SET, DICT = "tuple", "list", "set", "dict"
LISTCOMP, SETCOMP, DICTCOMP, GENERATOREXP = "listcomp", "setcomp", "dictcomp", "generatorexp"
YIELD, YIELDFROM, AWAIT = "yield", "yieldfrom", "await"
ATTRIBUTE, SUBSCRIPT, SLICE, CALL, STARRED = "attribute", "subscript", "slice", "call", "starred"
UNARYOP, BINOP, COMPARE, BOOLOP, NAMEDEXPR, IFEXP, LAMBDA = (
    "unaryop", "binop", "compare", "boolop", "namedexpr", "ifexp", "lambda")
LET, IMPORT, IMPORTFROM = "let", "import", "importfrom"
COMPREHENSIONS = (LISTCOMP, SETCOMP, DICTCOMP, GENERATOREXP)

EXTENSIONS = frozenset({LET, IMPORT, IMPORTFROM})
"""The kinds with no counterpart in Python's grammar, kept as extensions (the dialects proposal, Decided, 2)."""

STANDARDS = tuple(f"Python 3.{minor}" for minor in range(16))
"""The versions of Python 3 the dialect covers, by their published names, 3.0 to 3.15."""


def _since(minor: int) -> tuple[str, ...]:
    """The versions from Python 3.`minor` on."""
    return STANDARDS[minor:]


def install(txn: Any) -> Any:
    """Python3's union of its kinds, added to the framework's terms as the branch `python3`, its own kinds and the
    helpers they hold, and its dialect's schema, whose singleton is `Expressions.Python3`: run after
    `Framework.install`, in a transaction of its own; run again, it writes nothing.
    Its holder, `Expressions.Python3.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
    its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.Python3/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Pattern": S.OfUnion,
                  "Expression": S.OfObject, "Literal": S.OfObject, "Constant": S.OfObject,
                  "ConcatenatedString": S.OfObject, "StringText": S.OfObject, "FormatSpec": S.OfObject,
                  "FormattedValue": S.OfObject, "Interpolation": S.OfObject, "JoinedStrValue": S.OfUnion,
                  "TemplateStrValue": S.OfUnion, "JoinedStr": S.OfObject, "TemplateStr": S.OfObject,
                  "Parenthesized": S.OfObject, "Tuple": S.OfObject, "Set": S.OfObject, "DictItem": S.OfObject,
                  "Dict": S.OfObject, "Comprehension": S.OfObject, "ListComp": S.OfObject, "SetComp": S.OfObject,
                  "DictComp": S.OfObject, "GeneratorExp": S.OfObject, "Yield": S.OfObject, "YieldFrom": S.OfObject,
                  "Attribute": S.OfObject, "Subscript": S.OfObject, "Slice": S.OfObject, "Keyword": S.OfObject,
                  "Call": S.OfObject, "Starred": S.OfObject, "Await": S.OfObject, "UnaryOp": S.OfObject,
                  "BinOp": S.OfObject, "Comparison": S.OfObject, "Compare": S.OfObject, "BoolOp": S.OfObject,
                  "NamedExpr": S.OfObject, "IfExp": S.OfObject, "Arg": S.OfObject, "Arguments": S.OfObject,
                  "Lambda": S.OfObject, "Import": S.OfObject, "ImportFrom": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.Python3`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Python3.Dialect").ref(True).singleton("Expressions.Python3").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("python3").schema([_.Dialect])]),
            # its union of its kinds: the framework's it reuses, its own, its extensions, and invalid syntax
            lambda _: _.Term.name("Expressions.Python3.Term").branches([
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("constant").schema([_.Constant]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("concatenatedstring").schema([_.ConcatenatedString]),
                lambda t: t.name("joinedstr").schema([_.JoinedStr]),
                lambda t: t.name("templatestr").schema([_.TemplateStr]),
                lambda t: t.name("parenthesized").schema([_.Parenthesized]),
                lambda t: t.name("tuple").schema([_.Tuple]),
                lambda t: t.name("list").schema([Framework.List]),
                lambda t: t.name("set").schema([_.Set]),
                lambda t: t.name("dict").schema([_.Dict]),
                lambda t: t.name("listcomp").schema([_.ListComp]),
                lambda t: t.name("setcomp").schema([_.SetComp]),
                lambda t: t.name("dictcomp").schema([_.DictComp]),
                lambda t: t.name("generatorexp").schema([_.GeneratorExp]),
                lambda t: t.name("yield").schema([_.Yield]),
                lambda t: t.name("yieldfrom").schema([_.YieldFrom]),
                lambda t: t.name("attribute").schema([_.Attribute]),
                lambda t: t.name("subscript").schema([_.Subscript]),
                lambda t: t.name("slice").schema([_.Slice]),
                lambda t: t.name("call").schema([_.Call]),
                lambda t: t.name("starred").schema([_.Starred]),
                lambda t: t.name("await").schema([_.Await]),
                lambda t: t.name("unaryop").schema([_.UnaryOp]),
                lambda t: t.name("binop").schema([_.BinOp]),
                lambda t: t.name("compare").schema([_.Compare]),
                lambda t: t.name("boolop").schema([_.BoolOp]),
                lambda t: t.name("namedexpr").schema([_.NamedExpr]),
                lambda t: t.name("ifexp").schema([_.IfExp]),
                lambda t: t.name("lambda").schema([_.Lambda]),
                lambda t: t.name("let").schema([Framework.Let]),
                lambda t: t.name("import").schema([_.Import]),
                lambda t: t.name("importfrom").schema([_.ImportFrom]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its patterns: what a binding target may be (Python's language reference, 7.2), each a schema of a term too,
            # as the dialects proposal decided for every dialect ("(ii)")
            lambda _: _.Pattern.name("Expressions.Python3.Pattern").branches([
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("tuple").schema([_.Tuple]),
                lambda t: t.name("list").schema([Framework.List]),
                lambda t: t.name("starred").schema([_.Starred]),
                lambda t: t.name("attribute").schema([_.Attribute]),
                lambda t: t.name("subscript").schema([_.Subscript]),
                lambda t: t.name("parenthesized").schema([_.Parenthesized]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # atoms (Python's language reference, 6.2)
            lambda _: _.Literal.name("Expressions.Python3.Literal").refines([Framework.Literal]).properties({
                "prefix": S.OfStr,  # a string's or bytes' prefix, as written: `r`, `b`, `Rb`
                "quote": S.OfStr,  # a string's or bytes' quotes: `'`, `"`, `'''` or `\"\"\"`
                "base": S.OfInt,  # an int's base: 2, 8, 10 or 16
                "separators": S.OfBool,  # whether its digits are grouped by `_`
            }),
            lambda _: _.Constant.name("Expressions.Python3.Constant").properties({
                "singleton": S.OfStr,  # `None` or `...`
                "real": S.OfFloat, "imag": S.OfFloat,  # a complex number's parts
                "text": S.OfStr,  # its spelling, unvalidated
                "problems": S.OfContainer(lambda c: c.index([S.OfInt]).element([S.OfStr])),  # what is wrong with it
                "separators": S.OfBool,  # whether its digits are grouped by `_`
            }),
            lambda _: _.ConcatenatedString.name("Expressions.Python3.ConcatenatedString").properties({
                "values": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))}),
            lambda _: _.StringText.name("Expressions.Python3.StringText").properties({"spelling": S.OfStr}),
            lambda _: _.FormatSpec.name("Expressions.Python3.FormatSpec").properties({
                "values": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.JoinedStrValue]))}),
            lambda _: _.FormattedValue.name("Expressions.Python3.FormattedValue").properties({
                "value": _.Term, "text": S.OfStr, "debug": S.OfBool, "conversion": S.OfStr,
                "format_spec": _.FormatSpec}),
            lambda _: _.Interpolation.name("Expressions.Python3.Interpolation").properties({
                "value": _.Term, "text": S.OfStr, "debug": S.OfBool, "conversion": S.OfStr,
                "format_spec": _.FormatSpec}),
            lambda _: _.JoinedStrValue.name("Expressions.Python3.JoinedStrValue").branches([
                lambda t: t.name("stringtext").schema([_.StringText]),
                lambda t: t.name("formattedvalue").schema([_.FormattedValue])]),
            lambda _: _.TemplateStrValue.name("Expressions.Python3.TemplateStrValue").branches([
                lambda t: t.name("stringtext").schema([_.StringText]),
                lambda t: t.name("interpolation").schema([_.Interpolation])]),
            lambda _: _.JoinedStr.name("Expressions.Python3.JoinedStr").properties({
                "prefix": S.OfStr, "quote": S.OfStr,
                "values": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.JoinedStrValue]))}),
            lambda _: _.TemplateStr.name("Expressions.Python3.TemplateStr").properties({
                "prefix": S.OfStr, "quote": S.OfStr,
                "values": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.TemplateStrValue]))}),
            lambda _: _.Parenthesized.name("Expressions.Python3.Parenthesized").properties({"value": _.Term}),
            # displays and comprehensions
            lambda _: _.Tuple.name("Expressions.Python3.Tuple").properties({
                "elts": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))}),
            lambda _: _.Set.name("Expressions.Python3.Set").properties({
                "elts": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))}),
            lambda _: _.DictItem.name("Expressions.Python3.DictItem").properties({"key": _.Term, "value": _.Term}),
            lambda _: _.Dict.name("Expressions.Python3.Dict").properties({
                "items": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.DictItem]))}),
            lambda _: _.Comprehension.name("Expressions.Python3.Comprehension").properties({
                "is_async": S.OfBool, "target": _.Pattern, "iter": _.Term,
                "ifs": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))}),
            lambda _: _.ListComp.name("Expressions.Python3.ListComp").properties({
                "elt": _.Term, "generators": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Comprehension]))}),
            lambda _: _.SetComp.name("Expressions.Python3.SetComp").properties({
                "elt": _.Term, "generators": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Comprehension]))}),
            lambda _: _.DictComp.name("Expressions.Python3.DictComp").properties({
                "key": _.Term, "value": _.Term,
                "generators": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Comprehension]))}),
            lambda _: _.GeneratorExp.name("Expressions.Python3.GeneratorExp").properties({
                "elt": _.Term, "generators": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Comprehension]))}),
            lambda _: _.Yield.name("Expressions.Python3.Yield").properties({"value": _.Term}),
            lambda _: _.YieldFrom.name("Expressions.Python3.YieldFrom").properties({"value": _.Term}),
            # primaries (6.3)
            lambda _: _.Attribute.name("Expressions.Python3.Attribute").properties({"value": _.Term, "attr": S.OfStr}),
            lambda _: _.Subscript.name("Expressions.Python3.Subscript").properties({"value": _.Term, "slice": _.Term}),
            lambda _: _.Slice.name("Expressions.Python3.Slice").properties({
                "lower": _.Term, "upper": _.Term, "step": _.Term}),
            lambda _: _.Keyword.name("Expressions.Python3.Keyword").properties({"arg": S.OfStr, "value": _.Term}),
            lambda _: _.Call.name("Expressions.Python3.Call").properties({
                "func": _.Term,
                "args": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term])),
                "keywords": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Keyword])),
            }),
            lambda _: _.Starred.name("Expressions.Python3.Starred").properties({"value": _.Term}),
            lambda _: _.Await.name("Expressions.Python3.Await").properties({"value": _.Term}),
            # operators (6.5 to 6.14)
            lambda _: _.UnaryOp.name("Expressions.Python3.UnaryOp").properties({"op": S.OfStr, "operand": _.Term}),
            lambda _: _.BinOp.name("Expressions.Python3.BinOp").properties({
                "left": _.Term, "op": S.OfStr, "right": _.Term}),
            lambda _: _.Comparison.name("Expressions.Python3.Comparison").properties({
                "op": S.OfStr, "comparator": _.Term}),
            lambda _: _.Compare.name("Expressions.Python3.Compare").properties({
                "left": _.Term, "comparisons": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Comparison]))}),
            lambda _: _.BoolOp.name("Expressions.Python3.BoolOp").properties({
                "op": S.OfStr, "values": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term]))}),
            lambda _: _.NamedExpr.name("Expressions.Python3.NamedExpr").properties({"target": _.Pattern, "value": _.Term}),
            lambda _: _.IfExp.name("Expressions.Python3.IfExp").properties({
                "body": _.Term, "test": _.Term, "orelse": _.Term}),
            lambda _: _.Arg.name("Expressions.Python3.Arg").properties({
                "arg": S.OfStr, "annotation": _.Term, "default_value": _.Term}),
            lambda _: _.Arguments.name("Expressions.Python3.Arguments").properties({
                "posonlyargs": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Arg])),
                "args": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Arg])),
                "vararg": _.Arg,
                "kwonlyargs": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Arg])),
                "kwarg": _.Arg}),
            lambda _: _.Lambda.name("Expressions.Python3.Lambda").properties({"args": _.Arguments, "body": _.Term}),
            # extensions: imports within an expression
            lambda _: _.Import.name("Expressions.Python3.Import").properties({
                "module": S.OfStr, "alias": S.OfStr, "body": _.Term}),
            lambda _: _.ImportFrom.name("Expressions.Python3.ImportFrom").properties({
                "module": S.OfStr, "name": S.OfStr, "alias": S.OfStr, "body": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
            # to its `Term`
            lambda _: _.Expression.name("Expressions.Python3.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("python3").schema([_.Term])]),
        ])]))])


BUILTINS = frozenset({"abs", "all", "any", "bool", "float", "getattr", "hasattr", "int", "len", "max", "min", "round", "set",
                      "str", "sum"})
"""The builtins an expression may use without importing them: the default builtins of a scope (see `Evaluators`)."""


# --- Checks ---


def _dotted(name: str) -> bool:
    return all(part.isidentifier() for part in name.split("."))


def _identifier_problems(what: str, value: Any) -> list[str]:
    if type(value) is str and value and not value.isidentifier():
        return [f"{what} must be an identifier, got {value!r}"]
    return []


def _identifier(property_name: str, what: str) -> Any:
    """The check that a record's property, if a non-empty str, is an identifier."""
    return lambda record: _identifier_problems(what, F.attributes_of(record).get(property_name))


def _alias_problems(what: str, attributes: Mapping[str, Any]) -> list[str]:
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


QUOTES = ("'", '"', "'''", '"""')
"""A string's quotes, as Python writes them."""

_PREFIXES = {"": "", "r": "r", "u": "u", "b": "b", "br": "br", "rb": "br"}  # a literal's prefixes, by their letters


def _quote_problems(what: str, attributes: Mapping[str, Any]) -> list[str]:
    quote = attributes.get("quote")
    return [] if quote is None or quote in QUOTES else [f"{what}'s quote cannot be {quote!r}"]


def _prefix_problems(what: str, prefix: Any, letters: str) -> list[str]:
    """Problems with a string's prefix, if given: `letters` (`f`, `t`), each with or without `r`, in either case."""
    if prefix is None:
        return []
    allowed = {letters, letters + "r", "r" + letters} if letters else set(_PREFIXES)
    return [] if type(prefix) is str and prefix.lower() in allowed else [f"{what}'s prefix cannot be {prefix!r}"]


def _literal_check(record: Any) -> list[str]:
    """A literal's spelling: a string's or bytes' prefix and quote, an int's base."""
    attributes = F.attributes_of(record)
    base = attributes.get("base")
    problems = _prefix_problems("a literal", attributes.get("prefix"), "") + _quote_problems("a literal", attributes)
    return problems + ([] if base is None or base in (2, 8, 10, 16) else [f"a literal's base cannot be {base!r}"])


SINGLETONS = ("None", "...")
"""The singletons Python3's `constant` holds."""


def _constant_check(record: Any) -> list[str]:
    """A constant holds a singleton, `None` or `...`, or a complex number, its `imag` at least."""
    attributes = F.attributes_of(record)
    singleton, complex_ = attributes.get("singleton"), "imag" in attributes or "real" in attributes
    if singleton is None and not complex_:  # unless its text is invalid, its problems said
        return [] if "problems" in attributes else ["a constant needs a singleton or a complex number"]
    if singleton is not None and complex_:
        return ["a constant holds a singleton or a complex number, not both"]
    if singleton is not None and singleton not in SINGLETONS:
        return [f"a constant's singleton must be None or ..., got {singleton!r}"]
    if complex_ and "imag" not in attributes:
        return ["a complex constant needs an imag"]
    return []


def _needs(what: str, prop: str, needed: str, least: int = 1) -> Any:
    """The check that a record's helpers `prop`, or its arguments, where it has no slots, number at least `least`."""
    def check(record: Any) -> list[str]:
        held = F.attributes_of(record).get(prop, ()) if prop in F._helpers(record.as_schema()) else F.arguments_of(record)
        return [] if len(held) >= least else [f"{F._article(what)} needs {needed}"]

    return check


def _parts_of(record: Any, prop: str) -> tuple[F.Part, ...]:
    """A record's helpers of a container property, in order."""
    return F.attributes_of(record).get(prop, ())


def _call_check(record: Any) -> list[str]:
    return [problem for part in _parts_of(record, "keywords")
            for problem in _identifier_problems("a keyword's arg", part.attributes.get("arg"))]


def _compare_unfold(form: F.Form) -> F.Form | None:
    """A chain of several links as the `and` of its links, its middle operands written in each, as Python evaluates
    it (but for evaluating them once): what a translator reads where no rule reads the chain."""
    links = form.attributes.get("comparisons", ())
    if len(links) < 2:
        return None
    return F.Form(BOOLOP, {"op": "and"}, tuple(
        F.Form(COMPARE, {"comparisons": (link,)}, form.arguments[i:i + 2]) for i, link in enumerate(links)))


def _boolop_unfold(form: F.Form) -> F.Form | None:
    """`and` or `or` of more than two values as two, its first nested: `(a and b) and c`."""
    if len(form.arguments) < 3:
        return None
    return F.Form(form.kind, form.attributes, (F.Form(form.kind, form.attributes, form.arguments[:-1]), form.arguments[-1]))


def _compare_check(record: Any) -> list[str]:
    parts = _parts_of(record, "comparisons")
    if not parts:
        return ["a compare needs a comparison"]
    return ["a comparison needs an op" for part in parts if "op" not in part.attributes]


def _compare_operators(attributes: Mapping[str, Any]) -> tuple[str, ...]:
    return tuple(part.attributes["op"] for part in attributes["comparisons"])


def _compare_result(attributes: Mapping[str, Any], domains: list[FD.Domain]) -> FD.Domain:
    """A chain's domain: each link's operator applied to its operands, `a < b` then `b <= c`, its result theirs."""
    results = []
    for i, operator in enumerate(_compare_operators(attributes)):
        signature, operands = Domains.COMPARE.get(operator), domains[i:i + 2]
        if signature is None:
            return FD.Anything  # an extension: nothing is known about it
        result = signature.result(operands)
        if result is None:
            names = ", ".join(domain.name() for domain in operands)
            raise TypeError(f"{operator} cannot take ({names}); it takes {signature.describe()}")
        results.append(result)
    return FD._join(results)


def _fields(record: Any) -> list[F.Part]:
    """An f-string's or a t-string's replacement fields, those within format specs among them, in order."""
    found = []
    for part in _parts_of(record, "values"):
        found += _field_parts(part)
    return found


def _field_parts(part: F.Part) -> list[F.Part]:
    if part.kind == "stringtext":
        return []
    found = [part]
    spec = part.attributes.get("format_spec")
    for inner in (spec.attributes.get("values", ()) if spec is not None else ()):
        found += _field_parts(inner)
    return found


def _string_check(tag: str, letters: str) -> Any:
    """An f-string's or a t-string's prefix (`letters`, with or without `r`), quote and conversions."""
    what = F._article(tag)

    def check(record: Any) -> list[str]:
        attributes = F.attributes_of(record)
        problems = _prefix_problems(what, attributes.get("prefix"), letters) + _quote_problems(what, attributes)
        for part in _fields(record):
            conversion = part.attributes.get("conversion")
            if conversion is not None and conversion not in ("s", "r", "a"):
                problems.append(f"{F._article(part.kind)}'s conversion cannot be {conversion!r}")
        return problems

    return check


def target_names(target: Any, arguments: Sequence[Any] = ()) -> frozenset[str]:
    """The names a target binds: a name's, and those of the names a tuple, a list, a starred or a parenthesized
    target holds; an attribute or a subscript binds none. A target is a term, or a pattern as a form reads it, its
    `Terms.Part` and its `arguments` (its terms), as a comprehension and a named expression hold it."""
    if target is None:
        return frozenset()
    if isinstance(target, F.Part):
        tag, attributes = target.kind, target.attributes
    else:
        tag, record = F.kind_of(target)
        attributes, arguments = F.attributes_of(record), F.arguments_of(record)
    if tag == NAME:
        return frozenset({attributes["name"]}) if "name" in attributes else frozenset()
    if tag in (TUPLE, LIST, STARRED, PARENTHESIZED):
        return frozenset().union(*(target_names(argument) for argument in arguments))
    return frozenset()


def _target(part: F.Part, arguments: Sequence[Any]) -> tuple[F.Part | None, tuple[Any, ...]]:
    """A comprehension's or a named expression's target, a pattern, and its terms, the last of `arguments` (a helper's
    terms follow its own)."""
    target = part.attributes.get("target")
    size = 0 if target is None else target.size
    return target, tuple(arguments[len(arguments) - size:])


def _comprehension_scopes(record: Any) -> list[frozenset[str]]:
    """What each argument of a comprehension has bound: each `for` clause's target within its own target (a pattern,
    its terms after its iterable and its conditions), its conditions, the later clauses and the element; its iterable
    the earlier clauses' alone."""
    arguments, parts = F.arguments_of(record), _parts_of(record, "generators")
    lead = len(arguments) - sum(part.size for part in parts)
    scopes, names, i = [frozenset[str]()] * len(arguments), frozenset[str](), lead
    for part in parts:
        bound = names | target_names(*_target(part, arguments[i:i + part.size]))
        scopes[i] = names
        scopes[i + 1:i + part.size] = [bound] * (part.size - 1)
        names, i = bound, i + part.size
    scopes[:lead] = [names] * lead
    return scopes


def _parameters(record: Any) -> list[F.Part]:
    """A lambda's parameters, in order: positional-only, positional, `*vararg`, keyword-only, `**kwarg`."""
    arguments = F.attributes_of(record).get("args")
    if arguments is None:
        return []
    found: list[F.Part] = []
    for name in ("posonlyargs", "args", "vararg", "kwonlyargs", "kwarg"):
        held = arguments.attributes.get(name)
        found += [] if held is None else list(held) if isinstance(held, tuple) else [held]
    return found


def _lambda_scopes(record: Any) -> list[frozenset[str]]:
    """A lambda's body has its parameters bound; their defaults and annotations, the scope's alone."""
    names = frozenset(part.attributes["arg"] for part in _parameters(record) if type(part.attributes.get("arg")) is str)
    return [names] + [frozenset()] * (len(F.arguments_of(record)) - 1)


def _lambda_check(record: Any) -> list[str]:
    problems = []
    for part in _parameters(record):
        if "arg" not in part.attributes:
            problems.append("a lambda's parameter needs an arg")
        problems += _identifier_problems("a lambda's parameter", part.attributes.get("arg"))
    if any(path.endswith(".annotation") and argument is not None for _, path, argument in F._labelled(record)):
        problems.append("a lambda's parameters have no annotations")
    return problems


def _namedexpr_scopes(record: Any) -> list[frozenset[str]]:
    """A named expression's target, a pattern, is bound within itself: it binds its name in the scope around it,
    which a term does not see beyond itself. Its value is its first argument, its target's terms the rest."""
    arguments = F.arguments_of(record)
    names = target_names(*_target(F.Part(NAMEDEXPR, F.attributes_of(record)), arguments))
    return [frozenset()] + [names] * (len(arguments) - 1)


def _target_problems(label: str, target: F.Part) -> list[str]:
    """A target's own checks, as its kind's: a pattern is a helper, which validation does not read (its terms it does).
    A name needs a name, an identifier, and an attribute's name is one."""
    attributes = target.attributes
    if target.kind in F.INVALID_KINDS:  # invalid syntax where a target stands
        return [f"{label}: {problem}" for problem in F.invalid_problems(target.kind, attributes)]
    if target.kind == NAME:
        problems = _identifier_problems("a name", attributes.get("name")) if "name" in attributes else ["a variable needs a name"]
    else:
        problems = _identifier_problems("an attribute", attributes.get("attr")) if target.kind == ATTRIBUTE else []
    return [f"{label}: {problem}" for problem in problems]


def _namedexpr_check(record: Any) -> list[str]:
    target = F.attributes_of(record).get("target")
    if target is None:
        return ["a namedexpr needs a target"]
    if target.kind != NAME and target.kind not in F.INVALID_KINDS:
        return ["a namedexpr's target must be a name"]
    return _target_problems("target", target)


def _comprehension_check(tag: str) -> Any:
    """A comprehension's `for` clauses, one at least, each with its target, a pattern (a helper, which validation
    does not ask for)."""
    needs = _needs(tag, "generators", "a for clause")

    def check(record: Any) -> list[str]:
        problems = needs(record)
        for i, part in enumerate(_parts_of(record, "generators")):
            target = part.attributes.get("target")
            problems += [f"{F._article(tag)} needs a generators {i} target"] if target is None else _target_problems(
                f"generators {i} target", target)
        return problems

    return check


def _native(value: Any) -> Writer:
    """The literal of a native value: a basic scalar, the only native value `spec` gives it."""
    return constant(value)


_ANY = FD.Function((FD.Anything,), FD.Anything)
_ANY2 = FD.Function((FD.Anything, FD.Anything), FD.Anything)
_ALL = _since(0)
_ARGUMENT_SLOTS = tuple(f"args.{group}.{slot}" for group in ("posonlyargs", "args", "vararg", "kwonlyargs", "kwarg")
                        for slot in ("annotation", "default_value"))


def _application(signature: FD.Signature = FD.Opaque(), standards: tuple[str, ...] = _ALL, **options: Any) -> F.Kind:
    return F.Kind(F.APPLICATION, signature=signature, standards=standards, **options)


def _operator_kind(vocabulary: dict[str, FD.Signature], **options: Any) -> F.Kind:
    return F.Kind(F.APPLICATION, operator="op", vocabulary=vocabulary, required=("op",), standards=_ALL, **options)


DIALECT = F.Dialect("Python3", {
    LITERAL: F.Kind(F.LITERAL, spelling=("text", "problems", "prefix", "quote", "base", "separators"),
                    check=_literal_check, standards=_ALL),
    CONSTANT: F.Kind(F.LITERAL, spelling=("text", "problems", "separators"), check=_constant_check,
                     typed=lambda record: Domains.constant(F.attributes_of(record)), standards=_ALL),
    NAME: F.Kind(F.REFERENCE, required=("name",), ambient=BUILTINS, check=_identifier("name", "a name"), standards=_ALL),
    CONCATENATEDSTRING: _application(FD.Opaque(Domains.Str), check=_needs(CONCATENATEDSTRING, "values", "two strings", 2)),
    JOINEDSTR: _application(FD.Opaque(Domains.Str), _since(6), check=_string_check(JOINEDSTR, "f")),
    TEMPLATESTR: _application(standards=_since(14), check=_string_check(TEMPLATESTR, "t")),
    PARENTHESIZED: _application(_ANY),
    TUPLE: _application(),
    LIST: _application(),
    SET: _application(check=_needs(SET, "elts", "an element")),
    DICT: _application(optional=("key",)),
    LISTCOMP: _application(scopes=_comprehension_scopes, check=_comprehension_check(LISTCOMP)),
    SETCOMP: _application(scopes=_comprehension_scopes, check=_comprehension_check(SETCOMP)),
    DICTCOMP: _application(scopes=_comprehension_scopes, optional=("value",),
                           check=_comprehension_check(DICTCOMP)),
    GENERATOREXP: _application(Domains.GENERATOR, scopes=_comprehension_scopes,
                               check=_comprehension_check(GENERATOREXP)),
    YIELD: _application(optional=("value",)),
    YIELDFROM: _application(_ANY, _since(3)),
    ATTRIBUTE: F.Kind(F.APPLICATION, operator="attr", signature=_ANY, required=("attr",),
                      check=_identifier("attr", "an attribute"), standards=_ALL),
    SUBSCRIPT: _application(_ANY2),
    SLICE: _application(optional=("lower", "upper", "step")),
    CALL: _application(check=_call_check),
    STARRED: _application(_ANY),
    AWAIT: _application(_ANY, _since(5)),
    UNARYOP: _operator_kind(Domains.UNARYOP),
    BINOP: _operator_kind(Domains.BINOP),
    COMPARE: F.Kind(F.APPLICATION, vocabulary=Domains.COMPARE, operators=_compare_operators, result=_compare_result,
                    check=_compare_check, unfold=_compare_unfold, standards=_ALL),
    BOOLOP: _operator_kind(Domains.BOOLOP, check=_needs(BOOLOP, "values", "two values", 2), unfold=_boolop_unfold),
    NAMEDEXPR: _application(FD.Opaque(), _since(8), scopes=_namedexpr_scopes, check=_namedexpr_check),
    IFEXP: _application(FD.Function((FD.Anything, FD.Anything, FD.Anything), FD.Anything)),
    LAMBDA: _application(scopes=_lambda_scopes, check=_lambda_check, optional=_ARGUMENT_SLOTS),
    LET: F.Kind(F.BINDING, required=("name",), check=_identifier("name", "a let's name")),
    IMPORT: F.Kind(F.IMPORT, required=("module",), names=_import_names, check=_import_check),
    IMPORTFROM: F.Kind(F.IMPORT, required=("module", "name"), names=_importfrom_names, check=_importfrom_check),
}, domain_of=Domains.of, literal=_native)
"""The Python3 dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A Python3 term, written through the builders: a spec, which writes its term where it is given."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


class Helper:
    """A helper of a Python3 term (a call's keyword, a comparison's link, a comprehension's `for`, a lambda's
    parameter, an f-string's text or field), written through the builders: a spec given the visitor of the property
    or the container's element that holds it, which writes its `kind`'s branch where a union of helpers holds it."""

    __slots__ = ("kind", "write")

    def __init__(self, kind: str, write: Any):
        self.kind, self.write = kind, write

    def __call__(self, visitor: Any) -> Any:
        schema = visitor.as_schema()
        if isinstance(schema, Schemas.OfProperty.Data):  # a property: its value
            return visitor.as_value(self)
        if isinstance(schema, Schemas.OfUnion.Data):  # a value: a property's, or a container's element
            return visitor.as_union(lambda u: getattr(u, self.kind)(self.write))
        return visitor.as_object(self.write)


def _spec(value: Any) -> F.Writer:
    return DIALECT.spec(value)


def _fields_writer(attributes: Mapping[str, Any], slots: Mapping[str, Any], variadic: tuple[str, list[Any]] | None,
                   helpers: Mapping[str, Any]) -> Any:
    """The writer of a record: its attributes, its slots (specs) and its variadic arguments (specs) that are not None,
    and its helpers (a `Helper`, or a list of them)."""
    specs = {slot: _spec(value) for slot, value in slots.items() if value is not None}
    many = None if variadic is None else (variadic[0], [_spec(value) for value in variadic[1]])

    def record(r: Any) -> Any:
        for attribute_name, value in attributes.items():
            if value is not None:
                getattr(r, attribute_name)(value)
        for slot, value in specs.items():
            getattr(r, slot)(value)
        if many is not None:
            getattr(r, many[0])(many[1])
        for helper_name, helper in helpers.items():
            if helper is not None and helper != []:
                getattr(r, helper_name)(helper)
        return r

    return record


def _kind(tag: str, attributes: Mapping[str, Any], slots: Mapping[str, Any],
          variadic: tuple[str, list[Any]] | None = None, helpers: Mapping[str, Any] | None = None) -> Writer:
    """The writer of a term of kind `tag`."""
    record = _fields_writer(attributes, slots, variadic, helpers or {})
    return Writer(lambda union: getattr(union, tag)(record))


def _helper(kind: str, attributes: Mapping[str, Any], slots: Mapping[str, Any],
            variadic: tuple[str, list[Any]] | None = None, helpers: Mapping[str, Any] | None = None) -> Helper:
    return Helper(kind, _fields_writer(attributes, slots, variadic, helpers or {}))


def _name_or(value: Any) -> Any:
    """A target or a callee written as a str: a name."""
    return name(value) if type(value) is str else value


def constant(value: Any, text: str | None = None) -> Writer:
    """A constant, `ast.Constant`'s: a basic scalar as a `literal`; `None`, `...` (Python's `Ellipsis`) and a complex
    number as a `constant`; with its spelling (`text`) where given, else printers write its default one."""
    if value is None or value is Ellipsis:
        attributes: dict[str, Any] = {"singleton": "None" if value is None else "...", "text": text}
        return _kind(CONSTANT, attributes, {})
    if type(value) is complex:
        return _kind(CONSTANT, {"real": value.real, "imag": value.imag, "text": text}, {})
    if text is None:
        return Writer(lambda u: getattr(u, LITERAL)(lambda r: r.value(lambda p: p.as_scalar(value))))
    return Writer(lambda u: getattr(u, LITERAL)(lambda r: r.value(lambda p: p.as_scalar(value)).text(text)))


def name(name: str) -> Writer:
    """The value bound to `name`."""
    return Writer(lambda u: getattr(u, NAME)(lambda r: r.name(name)))


def concatenatedstring(*values: Any) -> Writer:
    """Adjacent string literals, `'a' "b"`, which make one string."""
    return _kind(CONCATENATEDSTRING, {}, {}, ("values", list(values)))


def stringtext(spelling: str) -> Helper:
    """The text of an f-string, a t-string or a format spec between replacement fields, as written."""
    return Helper("stringtext", lambda r: r.spelling(spelling))


def _field(kind: str, value: Any, conversion: str | None, format_spec: tuple[Any, ...] | None, debug: bool,
           text: str | None) -> Helper:
    spec = None if format_spec is None else _helper("formatspec", {}, {}, None, {"values": _values(format_spec)})
    return _helper(kind, {"text": text, "debug": debug or None, "conversion": conversion}, {"value": value}, None,
                   {"format_spec": spec})


def formattedvalue(value: Any, conversion: str | None = None, format_spec: tuple[Any, ...] | None = None,
                   debug: bool = False, text: str | None = None) -> Helper:
    """`{value=!conversion:format_spec}` in an f-string: a format spec's values are str (its text) or fields."""
    return _field("formattedvalue", value, conversion, format_spec, debug, text)


def interpolation(value: Any, conversion: str | None = None, format_spec: tuple[Any, ...] | None = None,
                  debug: bool = False, text: str | None = None) -> Helper:
    """`{value=!conversion:format_spec}` in a t-string."""
    return _field("interpolation", value, conversion, format_spec, debug, text)


def _values(values: tuple[Any, ...]) -> list[Helper]:
    return [stringtext(value) if type(value) is str else value for value in values]


def joinedstr(values: Sequence[Any], prefix: str = "f", quote: str = "'") -> Writer:
    """An f-string: its text (a str) and its fields (`formattedvalue`), in order."""
    return _kind(JOINEDSTR, {"prefix": prefix, "quote": quote}, {}, None, {"values": _values(tuple(values))})


def templatestr(values: Sequence[Any], prefix: str = "t", quote: str = "'") -> Writer:
    """A t-string (Python 3.14): its text (a str) and its fields (`interpolation`), in order."""
    return _kind(TEMPLATESTR, {"prefix": prefix, "quote": quote}, {}, None, {"values": _values(tuple(values))})


def parenthesized(value: Any) -> Writer:
    """`(value)`, parentheses written in the source."""
    return _kind(PARENTHESIZED, {}, {"value": value})


def tuple_(*elts: Any) -> Writer:
    """`(elts, ...)`, a tuple display; `()` when empty."""
    return _kind(TUPLE, {}, {}, ("elts", list(elts)))


def list_(*elements: Any) -> Writer:
    """`[elements, ...]`, a list display: the framework's container constructor."""
    return _kind(LIST, {}, {}, ("elements", list(elements)))


def set_(*elts: Any) -> Writer:
    """`{elts, ...}`, a set display."""
    return _kind(SET, {}, {}, ("elts", list(elts)))


def dict_(*items: tuple[Any, Any]) -> Writer:
    """`{key: value, ...}`, a dict display: `dict_(("a", 1), ("b", x))`; a key of None is `**value`."""
    pairs = [(None if key is None else _spec(key), _spec(value)) for key, value in items]

    def item(key: Any, value: Any) -> Any:
        return lambda a: a.as_object(lambda o: (o if key is None else o.key(key)).value(value))

    return Writer(lambda u: getattr(u, DICT)(lambda r: r.items([item(key, value) for key, value in pairs])))


def comprehension(target: Any, iter: Any, ifs: Sequence[Any] = (), is_async: bool = False) -> Helper:
    """`for target in iter if condition ...`, its conditions `ifs`, or `async for` with `is_async`, a clause of a
    comprehension; a target written as a str is a name."""
    return _helper("comprehension", {"is_async": is_async or None}, {"target": _name_or(target), "iter": iter},
                   ("ifs", list(ifs)))


def listcomp(elt: Any, *generators: Helper) -> Writer:
    """`[elt for ...]`."""
    return _kind(LISTCOMP, {}, {"elt": elt}, None, {"generators": list(generators)})


def setcomp(elt: Any, *generators: Helper) -> Writer:
    """`{elt for ...}`."""
    return _kind(SETCOMP, {}, {"elt": elt}, None, {"generators": list(generators)})


def dictcomp(key: Any, value: Any, *generators: Helper) -> Writer:
    """`{key: value for ...}`; a value of None is `{**key for ...}` (Python 3.15)."""
    return _kind(DICTCOMP, {}, {"key": key, "value": value}, None, {"generators": list(generators)})


def generatorexp(elt: Any, *generators: Helper) -> Writer:
    """`(elt for ...)`."""
    return _kind(GENERATOREXP, {}, {"elt": elt}, None, {"generators": list(generators)})


def yield_(value: Any = None) -> Writer:
    """`yield value`, or `yield`."""
    return _kind(YIELD, {}, {"value": value})


def yieldfrom(value: Any) -> Writer:
    """`yield from value`."""
    return _kind(YIELDFROM, {}, {"value": value})


def await_(value: Any) -> Writer:
    """`await value`."""
    return _kind(AWAIT, {}, {"value": value})


def attribute(value: Any, attr: str) -> Writer:
    """`value.attr`; each argument of these writers is a spec (a native value is a constant)."""
    return _kind(ATTRIBUTE, {"attr": attr}, {"value": value})


def subscript(value: Any, slice: Any) -> Writer:
    """`value[slice]`: its index any term, a `slice_` or a `tuple_` of them for several dimensions."""
    return _kind(SUBSCRIPT, {}, {"value": value, "slice": slice})


def slice_(lower: Any = None, upper: Any = None, step: Any = None) -> Writer:
    """`lower:upper:step`, an index of a subscript, each part optional."""
    return _kind(SLICE, {}, {"lower": lower, "upper": upper, "step": step})


def keyword(arg: str | None, value: Any) -> Helper:
    """`arg=value` in a call, or `**value` where `arg` is None."""
    return _helper("keyword", {"arg": arg}, {"value": value})


def call(func: Any, *args: Any) -> Writer:
    """`func(*args)`: its positional arguments, then its `keyword`s, in the order given. A dotted name as the function
    is a chain of attributes: `call('np.add', 1, 2)` is `np.add(1, 2)`."""
    if type(func) is str:
        first, *rest = func.split(".")
        func = name(first)
        for attr in rest:
            func = attribute(func, attr)
    positional = [a for a in args if not isinstance(a, Helper)]
    keywords = [a for a in args if isinstance(a, Helper)]
    return _kind(CALL, {}, {"func": func}, ("args", positional), {"keywords": keywords})


def starred(value: Any) -> Writer:
    """`*value`, unpacked in a display, a call or a subscript."""
    return _kind(STARRED, {}, {"value": value})


def unaryop(op: str, operand: Any) -> Writer:
    """`op operand`: `not`, `-`, `+`, `~`."""
    return _kind(UNARYOP, {"op": op}, {"operand": operand})


def binop(op: str, left: Any, right: Any) -> Writer:
    """`left op right`."""
    return _kind(BINOP, {"op": op}, {"left": left, "right": right})


def comparison(op: str, comparator: Any) -> Helper:
    """`op comparator`, a link of a comparison chain."""
    return _helper("comparison", {"op": op}, {"comparator": comparator})


def compare(op: str, left: Any, right: Any, *more: tuple[str, Any]) -> Writer:
    """`left op right`, then each `(op, comparator)` of `more` in turn: `compare('<', a, b, ('<=', c))` is
    `a < b <= c`."""
    links = [comparison(op, right), *(comparison(o, c) for o, c in more)]
    return _kind(COMPARE, {}, {"left": left}, None, {"comparisons": links})


def boolop(op: str, *values: Any) -> Writer:
    """`value op value ...`: `and` or `or` of n values."""
    return _kind(BOOLOP, {"op": op}, {}, ("values", list(values)))


def namedexpr(target: Any, value: Any) -> Writer:
    """`target := value`; a target written as a str is a name."""
    return _kind(NAMEDEXPR, {}, {"target": _name_or(target), "value": value})


def ifexp(test: Any, body: Any, orelse: Any) -> Writer:
    """`body if test else orelse`."""
    return _kind(IFEXP, {}, {"body": body, "test": test, "orelse": orelse})


def arg(arg: str, default_value: Any = None, annotation: Any = None) -> Helper:
    """A parameter, `arg=default_value` (a lambda's have no annotation)."""
    return _helper("arg", {"arg": arg}, {"annotation": annotation, "default_value": default_value})


def _arg(value: Any) -> Helper:
    return arg(value) if type(value) is str else value


def lambda_(body: Any, args: Sequence[Any] = (), posonlyargs: Sequence[Any] = (), vararg: Any = None,
            kwonlyargs: Sequence[Any] = (), kwarg: Any = None) -> Writer:
    """`lambda posonlyargs, /, args, *vararg, kwonlyargs, **kwarg: body`; a parameter is a str or an `arg`."""
    parameters = {"posonlyargs": [_arg(a) for a in posonlyargs], "args": [_arg(a) for a in args],
                  "vararg": None if vararg is None else _arg(vararg),
                  "kwonlyargs": [_arg(a) for a in kwonlyargs], "kwarg": None if kwarg is None else _arg(kwarg)}
    arguments = _helper("arguments", {}, {}, None, parameters) if any(parameters.values()) else None
    return _kind(LAMBDA, {}, {"body": body}, None, {"args": arguments})


def let_(name: str, value: Any, body: Any) -> Writer:
    """`(lambda name: body)(value)`."""
    return _kind(LET, {"name": name}, {"value": value, "body": body})


def import_(module: str, body: Any, alias: str | None = None) -> Writer:
    """`import module [as alias]`, then `body`."""
    return _kind(IMPORT, {"module": module, "alias": alias}, {"body": body})


def importfrom(module: str, name: str, body: Any, alias: str | None = None) -> Writer:
    """`from module import name [as alias]`, then `body`."""
    return _kind(IMPORTFROM, {"module": module, "name": name, "alias": alias}, {"body": body})
