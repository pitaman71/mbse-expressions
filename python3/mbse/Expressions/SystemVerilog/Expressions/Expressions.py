"""Expressions of the SystemVerilog dialect: every expression of SystemVerilog, IEEE 1800-2005 to 1800-2023, Verilog
(IEEE 1364) its subset, as mbse-programs has them, over its 4-state and 2-state vectors and reals.

The dialect is complete over SystemVerilog's expression syntax (mbse-basis [CAP-231: the SystemVerilog expression
dialect, complete](mbse:mbse-basis/docs/capabilities/CAP-231.md), by [CAP-226: complete expression
dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules), its sublanguages dialects of their own in its family
(the dialects proposal, Decided for stage 6): `Types` (data types), `Patterns` (`matches`' patterns), `Assertions`
(sequences and properties), `Constraints` (constraint blocks) and `Preprocessor` (compiler directives and macro usages),
each at `mbse.Expressions.SystemVerilog.<Dialect>`. Its terms are values of its `Term`,
`Expressions.SystemVerilog.Expressions.Term`, the branch `systemverilog` of `Expressions.Framework.Term`, which `install`
defines and adds to `Expressions.Framework.Term` by schema extension. Its kinds are mbse-programs' Verilog expression
kinds (`mbse:mbse-programs/python3/mbse/Programs/Verilog/Syntax.py`), with mbse-programs' names, lowercased as branch
tags (`binaryexpression`), and its properties in source order, each a value object
`Expressions.SystemVerilog.Expressions.<Kind>`. A term carries no domain. Its kinds (41 branches):

- Literals (Q3, "(b)"): `literal` (`Expressions.SystemVerilog.Expressions.Literal`, refining the framework's `literal`,
  mbse-basis [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md)) holds what a scalar schema
  can: an unsized integer (an int: decimal, or based without `x` or `z`, `'hFF`), a real (a float), a string (a str) and
  a time literal (its magnitude a float), with what its text encodes, mbse-basis
  [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): its `base` (`b`, `o`, `d` or `h`, as
  written), `signed` (`'sh`), `separators` (`_` between digits), a time literal's `unit` (`s`, `ms`, `us`, `ns`, `ps`,
  `fs`) and a string's `triple` (`\"\"\"...\"\"\"`, IEEE 1800-2023); `constant`, SystemVerilog's own, holds what no schema
  can, exactly one of: `null` (`singleton`), a fill `'0 '1 'x 'z` (`fill`), or a 4-state vector, every sized literal
  and an unsized one with `x`, `z` or `?` (`bits`, MSB first, of `0`, `1`, `x` and `z`; `size`, absent where unsized;
  `signed`; and `base`, its spelling), with `text` and `problems`.
- Names (Q4, "(b)"): `nameexpression`, a name used as a value, holding its `Name` (there is no `variable`, as for C++):
  `identifier`, `scopedname` (`p::x`), `localname` (`local::x`), `parameterizedname` (`c #(8)`), `interfacetypename`,
  `interfacemethodname`, `unitname` (`$unit`) and, where a `new`'s scope holds it, `superexpression`.
- Selects and operators: `memberexpression`, `indexexpression`, `rangeselect` (`[l:r]`, `[b+:w]`, `[b-:w]`),
  `unaryexpression`, `incrementexpression`, `binaryexpression`, `assignmentexpression`, `conditionalexpression`,
  `insideexpression` and its `valuerange`s, `concatenation`, `replication`, `streamingconcatenation` (its items each a
  `streamitem`), `mintypmaxexpression`, `taggedexpression`, `matchesexpression` and `predicateexpression` (`&&&`).
- Patterns of values: `assignmentpattern` (`'{a, b}`, `'{k: v}`, `t'{2{a}}`) and its `patternitem`s.
- Classes and objects: `thisexpression`, `superexpression`, `newexpression`, `newcopyexpression`,
  `newarrayexpression`, `randomizewithexpression` (its constraints `Constraints`' terms).
- Calls: `callexpression` (its arguments `Assertions`' terms: an instance of a sequence or a property may be given
  one), `systemcall` (`$clog2(x)`, `$bits(int)`: its arguments `Types`' terms), `arraymethodwithexpression`
  (`a.sum(x) with (x > 0)`), `namedconnection` (`.name(value)`) and `emptyargument`.
- `castexpression` (to a type, a width or a signing: `Types`' terms), `parenthesizedexpression`, `dollarexpression`,
  `rootexpression`, `emptyqueue`.
- The Preprocessor's `macrousage`, which its install adds, and the framework's kinds of invalid syntax, `error` and
  `missing`.

Its helpers: the `Name` union, `attributeinstance` and `attributespec` (`(* keep *)`), `identifier` and `streamitem`.
Where a position holds one sublanguage, it holds that dialect's `Term`; where it holds a sublanguage's kinds or an
expression (mbse-programs' `DataType | Expression`, `Property | Expression`, `Pattern | Expression`), it holds the
sublanguage's `Term`, which lists, as branches, every branch of this dialect's `Term` besides its own kinds: `install`
adds them to the `Term`s of `Types`, `Patterns`, `Assertions` and `Constraints`, creating any that is not yet installed,
as each of those installs names this `Term`, so that the six installs run in any order. A store holding some of them and
not the others holds their `Term`s, created empty, and an empty union does not validate as data ("a union needs at least
one branch"): every caller installs the six.

Binding kinds refine `Let` (Q8, "(a)"): `arraymethodwithexpression` (`Expressions.SystemVerilog.Expressions.
ArrayMethodWithExpression`) holds its call as `Let`'s `value` and its `with` expression as `Let`'s `body`, redeclared to
hold this dialect's `Term`; its iterator, its call's one argument (`item` where it has none), is bound within both
(`Kind.scopes`), and its `name` stays unset. A `matches` binds its pattern's variables (`Patterns.Expressions.
bound_names`) within its conditional's consequence and the conditions after it in a `&&&` (12.6.2, 12.6.3).

The editions of the standards it covers are data, which `define` writes, each owned by its designation (`IEEE Std
1364-1995` to `IEEE Std 1800-2023`) and holding the kinds it has, by mbse-programs' `SINCE`. `DIALECT` reads the kinds
(`Terms.Dialect`), and the five other dialects' terms (`reads`). The writers (`literal`, `vector`, `identifier`,
`binary`, `cast`, ...) write the kinds SystemVerilog evaluated before it was complete through the builders, a cast's
type a spec of `Types`' `Term`, written through the builders too; every other term is written through the builders
(mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)). `Text.ToText` writes an
expression as SystemVerilog source, with its precedence.

Its kinds of domain, the branches of its union `Expressions.SystemVerilog.Expressions.DomainKind`, which `install`
adds to the framework's `Expressions.Framework.DomainKind` as the branch `systemverilog`: IEEE 1800's integral types,
`logic` (`Expressions.SystemVerilog.Expressions.OfLogic`), 4-state, and `bit` (`OfBit`), 2-state, each of a `width` in
bits, `signed` or not; inferred (populated by hand until constraint resolution computes them) `least` and `greatest`,
of its known values, and `ordered`. `install` also adds its 2-state domains' schemas, each an `OfAny` of the scalar it
narrows (`Expressions.SystemVerilog.Expressions.int`, of ints; `real` and `shortreal`, of floats); a 4-state domain has
none, since no basic scalar holds x or z. `define` writes its domains, IEEE 1800's built-in types, owned by name:
`logic`, `reg`, `integer` and `time` of the kind `logic`; `bit`, `byte`, `shortint`, `int` and `longint` of `bit`;
`real` and `shortreal` of IEEE 754's `ieee754`, `binary64` and `binary32`. Each name is its own domain: `reg` is
`logic`'s equal, not its synonym.

What reads a named type reads its stored domain, through the store of the term's holder (`Proxies.store_of`), by
`Domains.named`: validation, a cast to a type SystemVerilog defines (`int'(x)`), which must be defined in that store;
inference, a constant's type (`integer`, `longint`, `real`), a cast's and `===`'s (`bit`); and evaluation (see
`Evaluators`). A lone term reaches no store: reading a type, it is refused (mbse-schemas' TypeError, "the value does
not belong to a store"), and a term that reads none, a sized vector's, is read as before.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F
from mbse.Schemas.Framework import Proxies

from . import Domains

__all__ = ["install", "define", "DIALECT", "EDITIONS", "SINCE", "editions", "Writer", "literal", "vector", "identifier",
           "unary", "binary", "conditional", "concatenation", "replication", "select", "range_", "inside", "span",
           "cast", "member", "call", "method", "iterate", "type_name", "problems", "SYSTEM", "METHODS", "REDUCTIONS",
           "BASES", "UNITS", "SPELLING", "TAGS"]

LITERAL, CONSTANT, NAMEEXPRESSION, MEMBEREXPRESSION, INDEXEXPRESSION, RANGESELECT = (
    "literal", "constant", "nameexpression", "memberexpression", "indexexpression", "rangeselect")
UNARYEXPRESSION, INCREMENTEXPRESSION, BINARYEXPRESSION, ASSIGNMENTEXPRESSION = (
    "unaryexpression", "incrementexpression", "binaryexpression", "assignmentexpression")
CONDITIONALEXPRESSION, INSIDEEXPRESSION, VALUERANGE, CONCATENATION, REPLICATION = (
    "conditionalexpression", "insideexpression", "valuerange", "concatenation", "replication")
ASSIGNMENTPATTERN, PATTERNITEM, THISEXPRESSION, SUPEREXPRESSION, NEWEXPRESSION = (
    "assignmentpattern", "patternitem", "thisexpression", "superexpression", "newexpression")
NEWCOPYEXPRESSION, NEWARRAYEXPRESSION, RANDOMIZEWITHEXPRESSION, ARRAYMETHODWITHEXPRESSION = (
    "newcopyexpression", "newarrayexpression", "randomizewithexpression", "arraymethodwithexpression")
CALLEXPRESSION, SYSTEMCALL, CASTEXPRESSION, PARENTHESIZEDEXPRESSION, DOLLAREXPRESSION = (
    "callexpression", "systemcall", "castexpression", "parenthesizedexpression", "dollarexpression")
TAGGEDEXPRESSION, MATCHESEXPRESSION, PREDICATEEXPRESSION, STREAMINGCONCATENATION = (
    "taggedexpression", "matchesexpression", "predicateexpression", "streamingconcatenation")
MINTYPMAXEXPRESSION, ROOTEXPRESSION, EMPTYQUEUE, NAMEDCONNECTION, EMPTYARGUMENT = (
    "mintypmaxexpression", "rootexpression", "emptyqueue", "namedconnection", "emptyargument")

TAGS = (LITERAL, CONSTANT, NAMEEXPRESSION, MEMBEREXPRESSION, INDEXEXPRESSION, RANGESELECT, UNARYEXPRESSION,
        INCREMENTEXPRESSION, BINARYEXPRESSION, ASSIGNMENTEXPRESSION, CONDITIONALEXPRESSION, INSIDEEXPRESSION, VALUERANGE,
        CONCATENATION, REPLICATION, ASSIGNMENTPATTERN, PATTERNITEM, THISEXPRESSION, SUPEREXPRESSION, NEWEXPRESSION,
        NEWCOPYEXPRESSION, NEWARRAYEXPRESSION, RANDOMIZEWITHEXPRESSION, ARRAYMETHODWITHEXPRESSION, CALLEXPRESSION,
        SYSTEMCALL, CASTEXPRESSION, PARENTHESIZEDEXPRESSION, DOLLAREXPRESSION, TAGGEDEXPRESSION, MATCHESEXPRESSION,
        PREDICATEEXPRESSION, STREAMINGCONCATENATION, MINTYPMAXEXPRESSION, ROOTEXPRESSION, EMPTYQUEUE, NAMEDCONNECTION,
        EMPTYARGUMENT)
"""Its own kinds, in its `Term`'s order: the Preprocessor's `macrousage` and invalid syntax are its `Term`'s too."""

SYSTEM = ("$signed", "$unsigned", "$clog2", "$bits", "$countones", "$onehot", "$onehot0", "$isunknown")
"""The system functions its evaluator computes."""
REDUCTIONS = ("sum", "product", "and", "or", "xor")
"""The array reduction methods, which may have a `with` clause."""
METHODS = ("size", *REDUCTIONS, "min", "max", "unique")
"""The array methods of no arguments its evaluator computes."""
BASES = {"b": 1, "o": 3, "h": 4, "d": 0}
"""The bases a literal or a constant is written in, by its letter, with the bits a digit holds (decimal: none)."""
UNITS = ("s", "ms", "us", "ns", "ps", "fs")
"""A time literal's units (5.8)."""
SPELLING = ("text", "problems", "separators", "triple")
"""A literal's spelling: what its text writes beside its value, not what it is. Its base and signedness are what it is:
an unsized based integer (`'hFF`) is unsigned, a decimal one (`255`) signed (5.7.1)."""

_RANGE_OPERATORS = (":", "+:", "-:")
_STREAM_OPERATORS = (">>", "<<")
_TOLERANCE_OPERATORS = ("+/-", "+%-")


# --- Editions: IEEE 1364's and IEEE 1800's, oldest first ---

EDITIONS = (
    ("IEEE Std 1364-1995", "1364", 1995, "Verilog-1995", "Verilog_1995"),
    ("IEEE Std 1364-2001", "1364", 2001, "Verilog-2001", "Verilog_2001"),
    ("IEEE Std 1364-2005", "1364", 2005, "Verilog-2005", "Verilog_2005"),
    ("IEEE Std 1800-2005", "1800", 2005, "SystemVerilog-2005", "SystemVerilog_2005"),
    ("IEEE Std 1800-2009", "1800", 2009, "SystemVerilog-2009", "SystemVerilog_2009"),
    ("IEEE Std 1800-2012", "1800", 2012, "SystemVerilog-2012", "SystemVerilog_2012"),
    ("IEEE Std 1800-2017", "1800", 2017, "SystemVerilog-2017", "SystemVerilog_2017"),
    ("IEEE Std 1800-2023", "1800", 2023, "SystemVerilog-2023", "SystemVerilog_2023"),
)
"""The editions of Verilog (IEEE 1364) and SystemVerilog (IEEE 1800), oldest first: each its designation, as the IEEE
writes it, its standard's number, its year, its common name, as mbse-programs labels it, and that name spelled as an
identifier, by which a define's frame binds it. IEEE 1800-2009 merged IEEE 1364: every edition of IEEE 1800 has what
the last of IEEE 1364 has."""

SINCE = {
    INCREMENTEXPRESSION: 3, INSIDEEXPRESSION: 3, VALUERANGE: 3, ASSIGNMENTPATTERN: 3, THISEXPRESSION: 3,
    SUPEREXPRESSION: 3, NEWEXPRESSION: 3, NEWCOPYEXPRESSION: 3, NEWARRAYEXPRESSION: 3, RANDOMIZEWITHEXPRESSION: 3,
    ARRAYMETHODWITHEXPRESSION: 3, CASTEXPRESSION: 3, DOLLAREXPRESSION: 3, TAGGEDEXPRESSION: 3, MATCHESEXPRESSION: 3,
    PREDICATEEXPRESSION: 3, STREAMINGCONCATENATION: 3, ROOTEXPRESSION: 3, EMPTYQUEUE: 3,
}
"""The edition each of its kinds arrived in, by its index in `EDITIONS`, from mbse-programs' `SINCE` (`sv()`, IEEE
1800-2005, 3); a kind not listed is in every edition."""


def editions(every: Mapping[str, Any], since: Mapping[str, int], first: int = 0) -> list[list[Any]]:
    """The kinds each edition from `EDITIONS[first]` on has, of a dialect's kinds (`every`, each schema by its tag):
    those whose edition (`since`, by index; the first where not listed) is no later than it."""
    return [[schema for tag, schema in every.items() if since.get(tag, first) <= index]
            for index in range(first, len(EDITIONS))]


def install(txn: Any) -> Any:
    """SystemVerilog's union of its kinds, added to the framework's terms as the branch `systemverilog`, its own kinds,
    the helpers they hold, and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Expressions`: run
    after `Framework.install`, in a transaction of its own; run again, it writes nothing. Its holder,
    `Expressions.SystemVerilog.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to
    its `Term`. Its branches are added to the `Term`s of `Types`, `Patterns`, `Assertions` and `Constraints` too, each
    created where its install has not run: the six installs run in any order. Its kinds of domain, `logic` and `bit`, and
    its 2-state domains' schemas; its domains `define` writes after it. Run after IEEE 754's install, whose kind its
    reals are of."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    def own(_: Any) -> list[Any]:
        """Its `Term`'s branches, which the sublanguages' `Term`s list too."""
        return [
            lambda t: t.name("literal").schema([_.Literal]),
            lambda t: t.name("constant").schema([_.Constant]),
            lambda t: t.name("nameexpression").schema([_.NameExpression]),
            lambda t: t.name("memberexpression").schema([_.MemberExpression]),
            lambda t: t.name("indexexpression").schema([_.IndexExpression]),
            lambda t: t.name("rangeselect").schema([_.RangeSelect]),
            lambda t: t.name("unaryexpression").schema([_.UnaryExpression]),
            lambda t: t.name("incrementexpression").schema([_.IncrementExpression]),
            lambda t: t.name("binaryexpression").schema([_.BinaryExpression]),
            lambda t: t.name("assignmentexpression").schema([_.AssignmentExpression]),
            lambda t: t.name("conditionalexpression").schema([_.ConditionalExpression]),
            lambda t: t.name("insideexpression").schema([_.InsideExpression]),
            lambda t: t.name("valuerange").schema([_.ValueRange]),
            lambda t: t.name("concatenation").schema([_.Concatenation]),
            lambda t: t.name("replication").schema([_.Replication]),
            lambda t: t.name("assignmentpattern").schema([_.AssignmentPattern]),
            lambda t: t.name("patternitem").schema([_.PatternItem]),
            lambda t: t.name("thisexpression").schema([_.ThisExpression]),
            lambda t: t.name("superexpression").schema([_.SuperExpression]),
            lambda t: t.name("newexpression").schema([_.NewExpression]),
            lambda t: t.name("newcopyexpression").schema([_.NewCopyExpression]),
            lambda t: t.name("newarrayexpression").schema([_.NewArrayExpression]),
            lambda t: t.name("randomizewithexpression").schema([_.RandomizeWithExpression]),
            lambda t: t.name("arraymethodwithexpression").schema([_.ArrayMethodWithExpression]),
            lambda t: t.name("callexpression").schema([_.CallExpression]),
            lambda t: t.name("systemcall").schema([_.SystemCall]),
            lambda t: t.name("castexpression").schema([_.CastExpression]),
            lambda t: t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
            lambda t: t.name("dollarexpression").schema([_.DollarExpression]),
            lambda t: t.name("taggedexpression").schema([_.TaggedExpression]),
            lambda t: t.name("matchesexpression").schema([_.MatchesExpression]),
            lambda t: t.name("predicateexpression").schema([_.PredicateExpression]),
            lambda t: t.name("streamingconcatenation").schema([_.StreamingConcatenation]),
            lambda t: t.name("mintypmaxexpression").schema([_.MinTypMaxExpression]),
            lambda t: t.name("rootexpression").schema([_.RootExpression]),
            lambda t: t.name("emptyqueue").schema([_.EmptyQueue]),
            lambda t: t.name("namedconnection").schema([_.NamedConnection]),
            lambda t: t.name("emptyargument").schema([_.EmptyArgument]),
            lambda t: t.name("error").schema([Framework.Error]),
            lambda t: t.name("missing").schema([Framework.Missing]),
        ]

    return txn.uid("mbse.Expressions.SystemVerilog.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfLogic": S.OfObject, "OfBit": S.OfObject,  # Kinds: the framework's
                  "Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "Name": S.OfUnion,
                  # the sublanguages' unions, each its install's, created here where it has not run
                  "TypesTerm": S.OfUnion, "PatternsTerm": S.OfUnion, "AssertionsTerm": S.OfUnion,
                  "ConstraintsTerm": S.OfUnion,
                  "Literal": S.OfObject, "Constant": S.OfObject, "NameExpression": S.OfObject,
                  "MemberExpression": S.OfObject, "IndexExpression": S.OfObject, "RangeSelect": S.OfObject,
                  "UnaryExpression": S.OfObject, "IncrementExpression": S.OfObject, "BinaryExpression": S.OfObject,
                  "AssignmentExpression": S.OfObject, "ConditionalExpression": S.OfObject,
                  "InsideExpression": S.OfObject, "ValueRange": S.OfObject, "Concatenation": S.OfObject,
                  "Replication": S.OfObject, "AssignmentPattern": S.OfObject, "PatternItem": S.OfObject,
                  "ThisExpression": S.OfObject, "SuperExpression": S.OfObject, "NewExpression": S.OfObject,
                  "NewCopyExpression": S.OfObject, "NewArrayExpression": S.OfObject,
                  "RandomizeWithExpression": S.OfObject, "ArrayMethodWithExpression": S.OfObject,
                  "CallExpression": S.OfObject, "SystemCall": S.OfObject, "CastExpression": S.OfObject,
                  "ParenthesizedExpression": S.OfObject, "DollarExpression": S.OfObject,
                  "TaggedExpression": S.OfObject, "MatchesExpression": S.OfObject, "PredicateExpression": S.OfObject,
                  "StreamingConcatenation": S.OfObject, "StreamItem": S.OfObject, "MinTypMaxExpression": S.OfObject,
                  "RootExpression": S.OfObject, "EmptyQueue": S.OfObject, "NamedConnection": S.OfObject,
                  "EmptyArgument": S.OfObject, "AttributeInstance": S.OfObject, "AttributeSpec": S.OfObject,
                  "Identifier": S.OfObject, "ScopedName": S.OfObject, "LocalName": S.OfObject,
                  "ParameterizedName": S.OfObject, "InterfaceTypeName": S.OfObject,
                  "InterfaceMethodName": S.OfObject, "UnitName": S.OfObject,  # FrameworkTerm: the framework's, by name
                  "bit": S.OfAny, "byte": S.OfAny, "shortint": S.OfAny, "int": S.OfAny, "longint": S.OfAny,
                  "real": S.OfAny, "shortreal": S.OfAny})
        .spec([
            # its dialect: the singleton `Expressions.SystemVerilog.Expressions`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.SystemVerilog.Expressions.Dialect").ref(True).singleton("Expressions.SystemVerilog.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("systemverilog").schema([_.Dialect])]),
            # its union of its kinds: its own, and invalid syntax (the Preprocessor's install adds `macrousage`)
            lambda _: _.Term.name("Expressions.SystemVerilog.Expressions.Term").branches(own(_)),
            # the sublanguages' unions list its branches: a position that holds a sublanguage's kinds or an expression
            # holds the sublanguage's `Term` ("(b)")
            lambda _: _.TypesTerm.name("Expressions.SystemVerilog.Types.Term").branches(own(_)),
            lambda _: _.PatternsTerm.name("Expressions.SystemVerilog.Patterns.Term").branches(own(_)),
            lambda _: _.AssertionsTerm.name("Expressions.SystemVerilog.Assertions.Term").branches(own(_)),
            lambda _: _.ConstraintsTerm.name("Expressions.SystemVerilog.Constraints.Term").branches(own(_)),
            # its names (mbse-programs' `Name`), and `super` where a `new`'s scope holds it
            lambda _: _.Name.name("Expressions.SystemVerilog.Expressions.Name").branches([
                lambda t: t.name("identifier").schema([_.Identifier]),
                lambda t: t.name("scopedname").schema([_.ScopedName]),
                lambda t: t.name("localname").schema([_.LocalName]),
                lambda t: t.name("parameterizedname").schema([_.ParameterizedName]),
                lambda t: t.name("interfacetypename").schema([_.InterfaceTypeName]),
                lambda t: t.name("interfacemethodname").schema([_.InterfaceMethodName]),
                lambda t: t.name("unitname").schema([_.UnitName]),
                lambda t: t.name("superexpression").schema([_.SuperExpression]),
            ]),
            # literals
            lambda _: _.Literal.name("Expressions.SystemVerilog.Expressions.Literal").refines([Framework.Literal]).properties({
                "base": S.OfStr,  # a based integer's base, as written: `b`, `o`, `d` or `h` (`'hFF`)
                "signed": S.OfBool,  # a based integer written signed (`'sd5`)
                "separators": S.OfBool,  # whether `_` groups its digits
                "unit": S.OfStr,  # a time literal's unit: `s`, `ms`, `us`, `ns`, `ps` or `fs`
                "triple": S.OfBool,  # a string written between triple quotes (IEEE 1800-2023)
            }),
            lambda _: _.Constant.name("Expressions.SystemVerilog.Expressions.Constant").properties({
                "singleton": S.OfStr,  # `null`
                "fill": S.OfStr,  # `'0`, `'1`, `'x` or `'z`: `0`, `1`, `x` or `z`
                "bits": S.OfStr,  # a vector's bits, MSB first, of 0, 1, x and z
                "size": S.OfInt,  # a sized vector's width in bits; absent where unsized
                "signed": S.OfBool,  # written signed (`8'shff`)
                "base": S.OfStr,  # the base it is written in: `b`, `o`, `d` or `h`
                "text": S.OfStr,  # its spelling, unvalidated
                "problems": many(S.OfStr),  # what is wrong with it
            }),
            # names and selects
            lambda _: _.NameExpression.name("Expressions.SystemVerilog.Expressions.NameExpression").properties({
                "name": _.Name}),
            lambda _: _.MemberExpression.name("Expressions.SystemVerilog.Expressions.MemberExpression").properties({
                "value": _.Term, "member": _.Identifier}),
            lambda _: _.IndexExpression.name("Expressions.SystemVerilog.Expressions.IndexExpression").properties({
                "value": _.Term, "index": _.Term}),
            lambda _: _.RangeSelect.name("Expressions.SystemVerilog.Expressions.RangeSelect").properties({
                "value": _.Term, "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            # operators
            lambda _: _.UnaryExpression.name("Expressions.SystemVerilog.Expressions.UnaryExpression").properties({
                "operator": S.OfStr, "attributes": many(_.AttributeInstance), "operand": _.Term}),
            lambda _: _.IncrementExpression.name("Expressions.SystemVerilog.Expressions.IncrementExpression").properties({
                "operator": S.OfStr, "postfix": S.OfBool, "operand": _.Term, "attributes": many(_.AttributeInstance)}),
            lambda _: _.BinaryExpression.name("Expressions.SystemVerilog.Expressions.BinaryExpression").properties({
                "left": _.Term, "operator": S.OfStr, "attributes": many(_.AttributeInstance), "right": _.Term}),
            lambda _: _.AssignmentExpression.name("Expressions.SystemVerilog.Expressions.AssignmentExpression").properties({
                "target": _.Term, "operator": S.OfStr, "value": _.Term}),
            lambda _: _.ConditionalExpression.name("Expressions.SystemVerilog.Expressions.ConditionalExpression").properties({
                "condition": _.Term, "attributes": many(_.AttributeInstance), "consequence": _.Term,
                "alternative": _.Term}),
            lambda _: _.InsideExpression.name("Expressions.SystemVerilog.Expressions.InsideExpression").properties({
                "value": _.Term, "set": many(_.Term)}),
            lambda _: _.ValueRange.name("Expressions.SystemVerilog.Expressions.ValueRange").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),  # operator: a tolerance's, `+/-` or `+%-`
            lambda _: _.Concatenation.name("Expressions.SystemVerilog.Expressions.Concatenation").properties({
                "items": many(_.Term)}),
            lambda _: _.Replication.name("Expressions.SystemVerilog.Expressions.Replication").properties({
                "count": _.Term, "items": many(_.Term)}),
            lambda _: _.AssignmentPattern.name("Expressions.SystemVerilog.Expressions.AssignmentPattern").properties({
                "type": _.TypesTerm, "count": _.Term, "items": many(_.Term)}),
            lambda _: _.PatternItem.name("Expressions.SystemVerilog.Expressions.PatternItem").properties({
                "key": _.TypesTerm,  # absent: `default`
                "value": _.Term}),
            # classes and objects
            lambda _: _.ThisExpression.name("Expressions.SystemVerilog.Expressions.ThisExpression"),
            lambda _: _.SuperExpression.name("Expressions.SystemVerilog.Expressions.SuperExpression"),
            lambda _: _.NewExpression.name("Expressions.SystemVerilog.Expressions.NewExpression").properties({
                "scope": _.Name, "arguments": many(_.Term), "defaulted": S.OfBool}),
            lambda _: _.NewCopyExpression.name("Expressions.SystemVerilog.Expressions.NewCopyExpression").properties({
                "value": _.Term}),
            lambda _: _.NewArrayExpression.name("Expressions.SystemVerilog.Expressions.NewArrayExpression").properties({
                "size": _.Term, "value": _.Term}),
            lambda _: _.RandomizeWithExpression.name("Expressions.SystemVerilog.Expressions.RandomizeWithExpression").properties({
                "call": _.Term, "restricted": S.OfBool, "variables": many(_.Identifier), "items": many(_.ConstraintsTerm)}),
            # a binder: `Let`, its call its value and its `with` expression its body, each this dialect's term
            lambda _: _.ArrayMethodWithExpression.name("Expressions.SystemVerilog.Expressions.ArrayMethodWithExpression")
                .refines([Framework.Let]).properties({"value": _.Term, "body": _.Term}),
            # calls
            lambda _: _.CallExpression.name("Expressions.SystemVerilog.Expressions.CallExpression").properties({
                "callee": _.Term, "attributes": many(_.AttributeInstance), "arguments": many(_.AssertionsTerm)}),
            lambda _: _.SystemCall.name("Expressions.SystemVerilog.Expressions.SystemCall").properties({
                "name": S.OfStr, "attributes": many(_.AttributeInstance), "arguments": many(_.TypesTerm)}),
            lambda _: _.CastExpression.name("Expressions.SystemVerilog.Expressions.CastExpression").properties({
                "type": _.TypesTerm, "value": _.Term}),
            lambda _: _.ParenthesizedExpression.name("Expressions.SystemVerilog.Expressions.ParenthesizedExpression").properties({
                "expression": _.Term}),
            lambda _: _.DollarExpression.name("Expressions.SystemVerilog.Expressions.DollarExpression"),
            lambda _: _.TaggedExpression.name("Expressions.SystemVerilog.Expressions.TaggedExpression").properties({
                "member": _.Identifier, "value": _.Term}),
            lambda _: _.MatchesExpression.name("Expressions.SystemVerilog.Expressions.MatchesExpression").properties({
                "value": _.Term, "pattern": _.PatternsTerm}),
            lambda _: _.PredicateExpression.name("Expressions.SystemVerilog.Expressions.PredicateExpression").properties({
                "conditions": many(_.Term)}),
            lambda _: _.StreamingConcatenation.name("Expressions.SystemVerilog.Expressions.StreamingConcatenation").properties({
                "operator": S.OfStr, "slice": _.TypesTerm, "items": many(_.StreamItem)}),
            lambda _: _.StreamItem.name("Expressions.SystemVerilog.Expressions.StreamItem").properties({
                "expression": _.Term, "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.MinTypMaxExpression.name("Expressions.SystemVerilog.Expressions.MinTypMaxExpression").properties({
                "min": _.Term, "typ": _.Term, "max": _.Term}),
            lambda _: _.RootExpression.name("Expressions.SystemVerilog.Expressions.RootExpression"),
            lambda _: _.EmptyQueue.name("Expressions.SystemVerilog.Expressions.EmptyQueue"),
            lambda _: _.NamedConnection.name("Expressions.SystemVerilog.Expressions.NamedConnection").properties({
                "name": _.Identifier, "value": _.AssertionsTerm, "implicit": S.OfBool}),
            lambda _: _.EmptyArgument.name("Expressions.SystemVerilog.Expressions.EmptyArgument"),
            # attributes
            lambda _: _.AttributeInstance.name("Expressions.SystemVerilog.Expressions.AttributeInstance").properties({
                "specs": many(_.AttributeSpec)}),
            lambda _: _.AttributeSpec.name("Expressions.SystemVerilog.Expressions.AttributeSpec").properties({
                "name": _.Identifier, "value": _.Term}),
            # names
            lambda _: _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier").properties({
                "spelling": S.OfStr}),
            lambda _: _.ScopedName.name("Expressions.SystemVerilog.Expressions.ScopedName").properties({
                "scope": _.Name, "name": _.Name}),
            lambda _: _.LocalName.name("Expressions.SystemVerilog.Expressions.LocalName").properties({
                "name": _.Identifier}),
            lambda _: _.ParameterizedName.name("Expressions.SystemVerilog.Expressions.ParameterizedName").properties({
                "name": _.Identifier, "parameters": many(_.TypesTerm)}),
            lambda _: _.InterfaceTypeName.name("Expressions.SystemVerilog.Expressions.InterfaceTypeName").properties({
                "interface": _.Identifier, "name": _.Identifier}),
            lambda _: _.InterfaceMethodName.name("Expressions.SystemVerilog.Expressions.InterfaceMethodName").properties({
                "port": _.Identifier, "name": _.Identifier}),
            lambda _: _.UnitName.name("Expressions.SystemVerilog.Expressions.UnitName"),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
            # to its `Term`
            lambda _: _.Expression.name("Expressions.SystemVerilog.Expressions.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            # --- its kinds of domain: IEEE 1800's integrals, 4-state and 2-state, their parameters, then what follows ---
            lambda _: _.OfLogic.name("Expressions.SystemVerilog.Expressions.OfLogic").properties({
                "width": S.OfInt, "signed": S.OfBool,
                "least": S.OfInt, "greatest": S.OfInt, "ordered": S.OfBool}),  # inferred, of its known values
            lambda _: _.OfBit.name("Expressions.SystemVerilog.Expressions.OfBit").properties({
                "width": S.OfInt, "signed": S.OfBool,
                "least": S.OfInt, "greatest": S.OfInt, "ordered": S.OfBool}),  # inferred
            lambda _: _.DomainKind.name("Expressions.SystemVerilog.Expressions.DomainKind").branches([
                lambda t: t.name("logic").schema([_.OfLogic]),
                lambda t: t.name("bit").schema([_.OfBit]),
            ]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog").schema([_.DomainKind])]),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog").schema([_.Term])]),
            # --- its 2-state domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its
            # domain; a 4-state domain has none: no basic scalar holds x or z ---
            lambda _: _.bit.name("Expressions.SystemVerilog.Expressions.bit").schemas([S.OfInt]),
            lambda _: _.byte.name("Expressions.SystemVerilog.Expressions.byte").schemas([S.OfInt]),
            lambda _: _.shortint.name("Expressions.SystemVerilog.Expressions.shortint").schemas([S.OfInt]),
            lambda _: _.int.name("Expressions.SystemVerilog.Expressions.int").schemas([S.OfInt]),
            lambda _: _.longint.name("Expressions.SystemVerilog.Expressions.longint").schemas([S.OfInt]),
            lambda _: _.real.name("Expressions.SystemVerilog.Expressions.real").schemas([S.OfFloat]),
            lambda _: _.shortreal.name("Expressions.SystemVerilog.Expressions.shortreal").schemas([S.OfFloat]),
        ])]))])


def define(txn: Any) -> Any:
    """SystemVerilog's dialect as data: the singleton `Expressions.SystemVerilog.Expressions` owning its domains, IEEE
    1800's built-in types, by name (`domains`, through `Expressions.Framework.Defines`), each with its parameters and
    its inferred properties, and each 2-state one related to its schema (`Expressions.SystemVerilog.Expressions.int`)
    by `Expressions.Framework.HasDomain`; and the editions it covers, by designation (`standards`, through
    `Expressions.Framework.Covers`): Verilog's IEEE Std 1364-1995, 2001 and 2005 and SystemVerilog's IEEE Std 1800-2005,
    2009, 2012, 2017 and 2023, each with its formal reference's parts, its common name and the kinds it has (`SINCE`),
    invalid syntax in none and the Preprocessor's `macrousage` the Preprocessor's. Run after `install`, in a transaction
    of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`), each edition by its common name
    spelled as an identifier (`SystemVerilog_2023`) and each domain by its name:
    `store.transaction(SystemVerilog.define)[0]["int"]`."""
    SV, Domain = txn.Expressions.SystemVerilog.Expressions, txn.Expressions.Framework.Domain
    Standard = txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in SV.Term.as_schema().branches if branch.name in TAGS}
    kinds = editions(every, SINCE)
    return txn.uid("mbse.Expressions.SystemVerilog.Expressions.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": SV.Dialect, "Verilog_1995": Standard, "Verilog_2001": Standard, "Verilog_2005": Standard,
                  "SystemVerilog_2005": Standard, "SystemVerilog_2009": Standard, "SystemVerilog_2012": Standard,
                  "SystemVerilog_2017": Standard, "SystemVerilog_2023": Standard,
                  "logic": Domain, "reg": Domain, "integer": Domain, "time": Domain,
                  "bit": Domain, "byte": Domain, "shortint": Domain, "int": Domain, "longint": Domain,
                  "real": Domain, "shortreal": Domain})
        .spec([
            # --- the editions it covers, each by its designation, with the kinds it has ---
            lambda _: _.dialect.standards({
                "IEEE Std 1364-1995": lambda e: e.standard(_.Verilog_1995),
                "IEEE Std 1364-2001": lambda e: e.standard(_.Verilog_2001),
                "IEEE Std 1364-2005": lambda e: e.standard(_.Verilog_2005),
                "IEEE Std 1800-2005": lambda e: e.standard(_.SystemVerilog_2005),
                "IEEE Std 1800-2009": lambda e: e.standard(_.SystemVerilog_2009),
                "IEEE Std 1800-2012": lambda e: e.standard(_.SystemVerilog_2012),
                "IEEE Std 1800-2017": lambda e: e.standard(_.SystemVerilog_2017),
                "IEEE Std 1800-2023": lambda e: e.standard(_.SystemVerilog_2023)}),
            lambda _: _.Verilog_1995.bodies(["org.ieee"]).number("1364").revision(lambda r: r.year(1995)).names(
                ["Verilog-1995"]).kinds(kinds[0]),
            lambda _: _.Verilog_2001.bodies(["org.ieee"]).number("1364").revision(lambda r: r.year(2001)).names(
                ["Verilog-2001"]).kinds(kinds[1]),
            lambda _: _.Verilog_2005.bodies(["org.ieee"]).number("1364").revision(lambda r: r.year(2005)).names(
                ["Verilog-2005"]).kinds(kinds[2]),
            lambda _: _.SystemVerilog_2005.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2005)).names(
                ["SystemVerilog-2005"]).kinds(kinds[3]),
            lambda _: _.SystemVerilog_2009.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2009)).names(
                ["SystemVerilog-2009"]).kinds(kinds[4]),
            lambda _: _.SystemVerilog_2012.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2012)).names(
                ["SystemVerilog-2012"]).kinds(kinds[5]),
            lambda _: _.SystemVerilog_2017.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2017)).names(
                ["SystemVerilog-2017"]).kinds(kinds[6]),
            lambda _: _.SystemVerilog_2023.bodies(["org.ieee"]).number("1800").revision(lambda r: r.year(2023)).names(
                ["SystemVerilog-2023"]).kinds(kinds[7]),
            # --- its domains ---
            lambda _: _.dialect.domains({
                "logic": lambda e: e.domain(_.logic), "reg": lambda e: e.domain(_.reg),
                "integer": lambda e: e.domain(_.integer), "time": lambda e: e.domain(_.time),
                "bit": lambda e: e.domain(_.bit), "byte": lambda e: e.domain(_.byte),
                "shortint": lambda e: e.domain(_.shortint), "int": lambda e: e.domain(_.int),
                "longint": lambda e: e.domain(_.longint),
                "real": lambda e: e.domain(_.real), "shortreal": lambda e: e.domain(_.shortreal),
            }),
            # 4-state, with no schema: least and greatest of its known values; "logic and reg denote the same type"
            # (IEEE 1800-2023), each its own domain, of equal properties: no synonyms
            lambda _: _.logic.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.logic(
                lambda d: d.width(1).signed(False).least(0).greatest(1).ordered(True)))))),
            lambda _: _.reg.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.logic(
                lambda d: d.width(1).signed(False).least(0).greatest(1).ordered(True)))))),  # logic's equal
            lambda _: _.integer.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.logic(
                lambda d: d.width(32).signed(True).least(-2147483648).greatest(2147483647).ordered(True)))))),
            lambda _: _.time.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.logic(
                lambda d: d.width(64).signed(False).least(0).greatest(18446744073709551615).ordered(True)))))),
            # 2-state
            lambda _: _.bit.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(1).signed(False).least(0).greatest(1).ordered(True)))))).schema([SV.bit]),
            lambda _: _.byte.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(8).signed(True).least(-128).greatest(127).ordered(True)))))).schema([SV.byte]),
            lambda _: _.shortint.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(16).signed(True).least(-32768).greatest(32767).ordered(True)))))).schema([SV.shortint]),
            lambda _: _.int.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(32).signed(True).least(-2147483648).greatest(2147483647).ordered(True)))))).schema([SV.int]),
            lambda _: _.longint.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.systemverilog(lambda v: v.bit(
                lambda d: d.width(64).signed(True).least(-9223372036854775808).greatest(9223372036854775807).ordered(
                    True)))))).schema([SV.longint]),
            # IEEE 754's, as its own binary64 and binary32 are
            lambda _: _.real.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64).radix(2).precision(53).emax(1023).ordered(
                    True)))))).schema([SV.real]),
            lambda _: _.shortreal.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary32").rounding("roundTiesToEven").width(32).radix(2).precision(24).emax(127).ordered(
                    True)))))).schema([SV.shortreal]),
        ])]))])


# --- Reading a term's helpers, what it binds and what it checks ---


def _nodes(value: Any) -> tuple[F.Node, ...]:
    """A helper property's nodes: none where it is absent, one, or each of many."""
    return () if value is None else value if isinstance(value, tuple) else (value,)


def _identifier_problems(spelling: Any) -> list[str]:
    """A simple identifier, letters, digits, `_` and `$` not starting with a digit or `$`, or an escaped one: `\\` and
    printable characters up to white space, as mbse-programs checks it."""
    if type(spelling) is not str or not spelling:
        return []
    if spelling[0] == "\\":
        if len(spelling) > 1 and all("!" <= ch <= "~" for ch in spelling[1:]):
            return []
    elif spelling[0] not in "0123456789$" and all(ch.isascii() and (ch.isalnum() or ch in "_$") for ch in spelling):
        return []
    return [f"{spelling!r} is not an identifier"]


def _system_problems(name: Any) -> list[str]:
    """A system task's or function's name, `$` and letters, digits, `_` and `$`, as mbse-programs checks it."""
    if type(name) is not str or not name:
        return []
    if name[0] != "$" or len(name) < 2 or not all(ch.isascii() and (ch.isalnum() or ch in "_$") for ch in name[1:]):
        return [f"{name!r} is not a system task or function name"]
    return []


_CHOICES = {
    "rangeselect": ("RangeSelect", "operator", _RANGE_OPERATORS),
    "streamingconcatenation": ("StreamingConcatenation", "operator", _STREAM_OPERATORS),
    "streamitem": ("StreamItem", "operator", _RANGE_OPERATORS),
    "valuerange": ("ValueRange", "operator", _TOLERANCE_OPERATORS),
}
"""The attributes that are one of a few choices, by kind: mbse-programs' kind, the attribute, and its choices."""


def _vector_problems(attributes: Mapping[str, Any]) -> list[str]:
    """A constant's: `null`, a fill, or bits of a size, exactly one of them, unless its text is invalid."""
    singleton, fill, bits = (attributes.get(name) for name in ("singleton", "fill", "bits"))
    held = [name for name, value in (("singleton", singleton), ("fill", fill), ("bits", bits)) if value is not None]
    if len(held) != 1:
        return [] if not held and "problems" in attributes else [
            "a constant holds a singleton, a fill or bits, exactly one of them"]
    if singleton is not None:
        return [] if singleton == "null" else [f"a constant's singleton must be null, got {singleton!r}"]
    if fill is not None:
        return [] if fill in ("0", "1", "x", "z") else [f"a constant's fill must be 0, 1, x or z, got {fill!r}"]
    found = [] if bits and all(b in "01xz" for b in bits) else [
        f"a constant's bits must be 0, 1, x and z, at least one, got {bits!r}"]
    size = attributes.get("size")
    if size is not None and not found and size != len(bits):
        found.append(f"a constant's size must be its number of bits, {len(bits)}, got {size}")
    return found


def _base_problems(attributes: Mapping[str, Any], what: str) -> list[str]:
    base = attributes.get("base")
    return [] if base in (None, *BASES) else [f"{what}'s base must be b, o, d or h, got {base!r}"]


def _literal_problems(attributes: Mapping[str, Any]) -> list[str]:
    """A literal holds what a constant of SystemVerilog does, an int, a float or a str (the framework's literal may hold
    more), with what its text encodes: a base for an int, a unit for a float, `triple` for a str."""
    value = attributes["value"]
    if type(value) not in (int, float, str):
        return [f"a SystemVerilog literal cannot hold a {type(value).__name__}"]
    found = _base_problems(attributes, "a literal")
    unit = attributes.get("unit")
    if unit is not None and (unit not in UNITS or type(value) is not float):
        found.append(f"a time literal's unit must be s, ms, us, ns, ps or fs, its value a float, got {unit!r}")
    return found


def problems(node: F.Node) -> list[str]:
    """A node's checks, and its helpers' in turn, which the framework's validation does not read within a helper: an
    identifier's spelling, a system call's name, a choice among a few, a constant's bits and mbse-programs' checks.
    Invalid syntax stands only where a term does, which the framework's validation reads."""
    kind, attributes = node.kind, node.attributes
    found: list[str] = []
    if kind == "identifier":
        found += _identifier_problems(attributes.get("spelling"))
    if kind == SYSTEMCALL:
        found += _system_problems(attributes.get("name"))
    if kind in _CHOICES:
        name, attribute, choices = _CHOICES[kind]
        value = attributes.get(attribute)
        if value is not None and value not in choices:
            found.append(f"{name}.{attribute} cannot be {value!r}")
    if kind == CONSTANT:
        found += _vector_problems(attributes) + _base_problems(attributes, "a constant")
    if kind == ASSIGNMENTPATTERN and node.slots.get("count") is not None and any(
            F.kind_of(item)[0] == PATTERNITEM for item in node.many):
        found.append("a repeated AssignmentPattern has positional items only")
    if kind == PREDICATEEXPRESSION and len(node.many) < 2:
        found.append("a PredicateExpression has two conditions or more")
    if kind == NEWEXPRESSION and attributes.get("defaulted") is True and (
            getattr(node.helpers.get("scope"), "kind", None) != SUPEREXPRESSION or node.many):
        found.append("a defaulted NewExpression is super.new(default)")
    if kind == "streamitem":
        left, operator, right = node.slots.get("left"), attributes.get("operator"), node.slots.get("right")
        if (operator is None) != (right is None) or left is None and operator is not None:
            found.append("a StreamItem's `with` has a left, and an operator and a right, or neither")
    for value in node.helpers.values():
        for inner in _nodes(value):
            found += problems(inner)
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    return lambda record: problems(F.node(tag, record))


def _literal_check(record: Any) -> list[str]:
    return _literal_problems(F.attributes_of(record))


def _iterator(call: Any) -> str:
    """The iterator an array method's call names: its one argument's name, where it is a name (`a.sum(x)`), else
    `item` (7.12)."""
    tag, record = F.kind_of(call)
    if tag == CALLEXPRESSION:
        arguments = F.node(tag, record).many
        if len(arguments) == 1 and F.kind_of(arguments[0])[0] == NAMEEXPRESSION:
            name = F.name_of(arguments[0])
            if name is not None:
                return name
    return "item"


def _array_method_scopes(record: Any) -> list[frozenset[str]]:
    """What an array method's call and its `with` expression have bound: its iterator, in both (its call declares it)."""
    value = F.node(ARRAYMETHODWITHEXPRESSION, record).slots["value"]
    iterator = frozenset({_iterator(value)}) if value is not None else frozenset()
    return [iterator, iterator]


def _matched(condition: Any) -> frozenset[str]:
    """The names a condition binds where it holds: a `matches`' pattern's variables, or those of each condition of a
    `&&&` (12.6)."""
    if condition is None:
        return frozenset()
    tag, record = F.kind_of(condition)
    node = F.node(tag, record)
    if tag == MATCHESEXPRESSION and node.slots["pattern"] is not None:
        from ..Patterns import Expressions as Patterns
        return Patterns.bound_names(node.slots["pattern"])
    if tag == PREDICATEEXPRESSION:
        return frozenset().union(*(_matched(c) for c in node.many))
    return frozenset()


def _conditional_scopes(record: Any) -> list[frozenset[str]]:
    """What a conditional's arguments have bound: its condition's matched variables, in its consequence (12.6.2)."""
    node = F.node(CONDITIONALEXPRESSION, record)
    names = _matched(node.slots["condition"])
    return [frozenset(), names, frozenset()] + [frozenset()] * (len(F.arguments_of(record)) - 3)


def _predicate_scopes(record: Any) -> list[frozenset[str]]:
    """What each condition of a `&&&` has bound: the variables the conditions before it match (12.6.2)."""
    found, names = [], frozenset()
    for condition in F.node(PREDICATEEXPRESSION, record).many:
        found.append(names)
        names = names | _matched(condition)
    return found


def type_name(value: Any) -> str | None:
    """The name of the type a cast's type writes, where it is a type SystemVerilog may define by name: an integral or a
    real keyword, without a signing or dimensions (`int`, `logic`, `real`); None for any other type, a width or a
    signing."""
    if value is None:
        return None
    tag, record = F.kind_of(value)
    attributes = F.attributes_of(record)
    if tag in ("integervectortype", "integeratomtype", "nonintegertype") and not {"signing", "dimensions"} & set(
            attributes):
        return attributes.get("keyword")
    return None


def _cast_check(record: Any) -> list[str]:
    """A cast to a type SystemVerilog defines by name must be defined in the store of the term's holder (`Domains.NAMES`;
    another keyword's, such as `realtime`, is not read), one to a width written as a literal is to a positive one, and
    its checks."""
    node = F.node(CASTEXPRESSION, record)
    target, found = node.slots["type"], problems(node)
    name, (tag, held) = type_name(target), F.kind_of(target) if target is not None else (None, None)
    width = F.attributes_of(held).get("value") if tag == LITERAL else None
    if type(width) is int and width < 1:  # a width, written as a literal
        found.append(f"a cast's width must be positive, got {width}")
    if name in Domains.NAMES:
        try:
            Domains.named(Proxies.store_of(record), name)
        except ValueError as error:  # the store defines no such type
            found.append(str(error))
    return found


def _cast_typed(record: Any) -> Any:
    """A cast to a type SystemVerilog defines by name: that type, read from the store of the term's holder; one to a
    width, a signing or any other type is not known statically."""
    name = type_name(F.node(CASTEXPRESSION, record).slots["type"])
    return Domains.named(Proxies.store_of(record), name) if name in Domains.NAMES else None


def _literal_typed(record: Any) -> Any:
    """A literal's type: an unsized based integer's, unsigned unless written signed, of 32 bits or as many as its value
    needs; a decimal's or a real's, read from the store of the term's holder; None where no type holds it (a string, a
    time)."""
    attributes = F.attributes_of(record)
    value = attributes["value"]
    if type(value) is int and "base" in attributes:
        return Domains.unsized(value, bool(attributes.get("signed")))
    if "unit" in attributes:
        return None
    name = Domains.of(value)
    return None if name is None else Domains.named(Proxies.store_of(record), name)


def _constant_typed(record: Any) -> Any:
    """A constant's type: a vector's, of its size and signedness (an unsized one's 32 bits, or as many as it has); a
    fill's or `null`'s is not known statically."""
    attributes = F.attributes_of(record)
    if _vector_problems(attributes) or "bits" not in attributes:
        return None
    bits = attributes["bits"]
    size = attributes.get("size", max(len(bits), 32))
    return Domains.vector(size, bool(attributes.get("signed")))


def _apply(vocabulary: Mapping[str, FD.Signature], attributes: Mapping[str, Any], domains: list[FD.Domain]) -> FD.Domain:
    """An operator's result domain, of its operands' (an operator's attributes' terms aside); an operator outside its
    vocabulary, an extension, is not known."""
    operator = attributes["operator"]
    signature = vocabulary.get(operator)
    if signature is None:
        return FD.Anything
    result = signature.result(domains)
    if result is None:
        names = ", ".join(domain.name() for domain in domains)
        raise TypeError(f"{operator} cannot take ({names}); it takes {signature.describe()}")
    return result


def _binary_typed(record: Any) -> Any:
    """`===`'s and `!==`'s type, `bit`, read from the store of the term's holder; the others' are their operands'."""
    operator = F.attributes_of(record)["operator"]
    return Domains.named(Proxies.store_of(record), "bit") if operator in ("===", "!==") else None


def _untyped(value: Any) -> Any:
    """The domain of a literal no type holds: a string, or an int beyond 64 bits (`Kind.typed` reads the others')."""
    return FD.Anything


def _native(value: Any) -> Writer | None:
    """The literal of a native value: an int, a float or a str."""
    return literal(value) if type(value) in (int, float, str) else None


_OPTIONAL = ("*.value",)
"""The slots of a kind's helpers that may be empty, wherever they nest: an attribute's value (`(* keep *)`)."""


def _kinds() -> dict[str, F.Kind]:
    """How the framework reads SystemVerilog's kinds."""

    def application(tag: str, signature: FD.Signature = FD.Opaque(), optional: tuple[str, ...] = (),
                    **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=signature, check=options.pop("check", _check(tag)),
                      optional=optional + _OPTIONAL, **options)

    def operator(tag: str, vocabulary: Mapping[str, FD.Signature], arity: int, **options: Any) -> F.Kind:
        """An operator's kind: its vocabulary, every operator checked against it with `core`; its result its operands'
        (`arity` of them), whatever its attributes hold."""
        return F.Kind(F.APPLICATION, operator="operator", vocabulary=vocabulary, required=("operator",),
                      operators=lambda attributes: (attributes["operator"],),
                      result=lambda attributes, domains: _apply(vocabulary, attributes, domains[:arity]),
                      check=_check(tag), optional=_OPTIONAL, **options)

    return {
        LITERAL: F.Kind(F.LITERAL, spelling=SPELLING, check=_literal_check, typed=_literal_typed),
        CONSTANT: F.Kind(F.LITERAL, spelling=SPELLING, check=_check(CONSTANT), typed=_constant_typed),
        NAMEEXPRESSION: F.Kind(F.REFERENCE, required=("name",), check=_check(NAMEEXPRESSION)),
        MEMBEREXPRESSION: application(MEMBEREXPRESSION, Domains.MEMBER, required=("member",)),
        INDEXEXPRESSION: application(INDEXEXPRESSION, Domains.SELECT),
        RANGESELECT: application(RANGESELECT, Domains.RANGE, required=("operator",)),
        UNARYEXPRESSION: operator(UNARYEXPRESSION, Domains.UNARY, 1),
        INCREMENTEXPRESSION: operator(INCREMENTEXPRESSION, Domains.INCREMENT, 1),
        BINARYEXPRESSION: operator(BINARYEXPRESSION, Domains.BINARY, 2, typed=_binary_typed),
        ASSIGNMENTEXPRESSION: operator(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT, 2),
        CONDITIONALEXPRESSION: application(CONDITIONALEXPRESSION, Domains.CONDITIONAL, scopes=_conditional_scopes),
        INSIDEEXPRESSION: application(INSIDEEXPRESSION, Domains.INSIDE),
        VALUERANGE: application(VALUERANGE, Domains.SPAN),
        CONCATENATION: application(CONCATENATION),
        REPLICATION: application(REPLICATION),
        ASSIGNMENTPATTERN: application(ASSIGNMENTPATTERN, optional=("type", "count")),
        PATTERNITEM: application(PATTERNITEM, optional=("key",)),
        THISEXPRESSION: application(THISEXPRESSION),
        SUPEREXPRESSION: application(SUPEREXPRESSION),
        NEWEXPRESSION: application(NEWEXPRESSION),
        NEWCOPYEXPRESSION: application(NEWCOPYEXPRESSION),
        NEWARRAYEXPRESSION: application(NEWARRAYEXPRESSION, optional=("value",)),
        RANDOMIZEWITHEXPRESSION: application(RANDOMIZEWITHEXPRESSION),
        ARRAYMETHODWITHEXPRESSION: F.Kind(F.BINDING, signature=FD.Opaque(), scopes=_array_method_scopes,
                                          check=_check(ARRAYMETHODWITHEXPRESSION)),
        CALLEXPRESSION: application(CALLEXPRESSION),
        SYSTEMCALL: application(SYSTEMCALL, required=("name",)),
        CASTEXPRESSION: application(CASTEXPRESSION, Domains.CAST, check=_cast_check, typed=_cast_typed),
        PARENTHESIZEDEXPRESSION: application(PARENTHESIZEDEXPRESSION, Domains.PARENTHESIZED),
        DOLLAREXPRESSION: application(DOLLAREXPRESSION),
        TAGGEDEXPRESSION: application(TAGGEDEXPRESSION, required=("member",), optional=("value",)),
        MATCHESEXPRESSION: application(MATCHESEXPRESSION),
        PREDICATEEXPRESSION: application(PREDICATEEXPRESSION, scopes=_predicate_scopes),
        STREAMINGCONCATENATION: application(STREAMINGCONCATENATION, required=("operator",),
                                            optional=("slice", "items.left", "items.right")),
        MINTYPMAXEXPRESSION: application(MINTYPMAXEXPRESSION),
        ROOTEXPRESSION: application(ROOTEXPRESSION),
        EMPTYQUEUE: application(EMPTYQUEUE),
        NAMEDCONNECTION: application(NAMEDCONNECTION, required=("name",), optional=("value",)),
        EMPTYARGUMENT: application(EMPTYARGUMENT),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms its positions hold, imported when first needed."""
    from ..Assertions import Expressions as Assertions
    from ..Constraints import Expressions as Constraints
    from ..Patterns import Expressions as Patterns
    from ..Preprocessor import Expressions as Preprocessor
    from ..Types import Expressions as Types
    return Types.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT


DIALECT = F.Dialect("SystemVerilog.Expressions", _kinds(), domain_of=_untyped, literal=_native, reads=_reads)
"""The SystemVerilog dialect: its kinds, as the framework reads them, and the terms of its sublanguages' dialects."""


# --- Writers ---


class Writer(F.Writer):
    """A SystemVerilog term, written through the builders where it is given."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


def _spec(value: Any) -> F.Writer:
    return DIALECT.spec(value)


def _identifier(spelling: str) -> Any:
    """An identifier, of its spelling."""
    return lambda i: i.spelling(spelling)


def literal(value: Any) -> Writer:
    """An unsized integer, a real or a string literal (validation reports any other value)."""
    return Writer(lambda u: u.literal(lambda r: r.value(lambda p: p.as_scalar(value))))


def vector(bits: str, signed: bool | None = None, base: str | None = None) -> Writer:
    """A sized literal of `bits`, MSB first: a constant of as many bits, `signed` or not, written in `base`."""

    def record(r: Any) -> Any:
        r.bits(bits).size(len(bits))
        if signed is not None:
            r.signed(signed)
        return r.base(base) if base is not None else r

    return Writer(lambda u: u.constant(record))


def identifier(name: str) -> Writer:
    """The name `name` used as a value: a `nameexpression` of the identifier."""
    return Writer(lambda u: u.nameexpression(lambda r: r.name(lambda n: n.identifier(_identifier(name)))))


def unary(operator: str, operand: Any) -> Writer:
    """`<operator> operand`; the operand is a spec (a native value is a literal)."""
    operand = _spec(operand)
    return Writer(lambda u: u.unaryexpression(lambda r: r.operator(operator).operand(operand)))


def binary(operator: str, left: Any, right: Any) -> Writer:
    """`left <operator> right`; each operand a spec."""
    left, right = _spec(left), _spec(right)
    return Writer(lambda u: u.binaryexpression(lambda r: r.left(left).operator(operator).right(right)))


def conditional(condition: Any, consequence: Any, alternative: Any) -> Writer:
    """`condition ? consequence : alternative`."""
    condition, consequence, alternative = _spec(condition), _spec(consequence), _spec(alternative)
    return Writer(lambda u: u.conditionalexpression(
        lambda r: r.condition(condition).consequence(consequence).alternative(alternative)))


def concatenation(*items: Any) -> Writer:
    """`{items}`."""
    specs = [_spec(item) for item in items]
    return Writer(lambda u: u.concatenation(lambda r: r.items(specs)))


def replication(count: Any, *items: Any) -> Writer:
    """`{count{items}}`."""
    count, specs = _spec(count), [_spec(item) for item in items]
    return Writer(lambda u: u.replication(lambda r: r.count(count).items(specs)))


def select(value: Any, index: Any) -> Writer:
    """`value[index]`: an `indexexpression`."""
    value, index = _spec(value), _spec(index)
    return Writer(lambda u: u.indexexpression(lambda r: r.value(value).index(index)))


def range_(value: Any, left: Any, right: Any) -> Writer:
    """`value[left:right]`: a `rangeselect`."""
    value, left, right = _spec(value), _spec(left), _spec(right)
    return Writer(lambda u: u.rangeselect(lambda r: r.value(value).left(left).operator(":").right(right)))


def inside(value: Any, *items: Any) -> Writer:
    """`value inside {items}`, its items values or `span`s."""
    value, specs = _spec(value), [_spec(item) for item in items]
    return Writer(lambda u: u.insideexpression(lambda r: r.value(value).set(specs)))


def span(left: Any, right: Any) -> Writer:
    """`[left:right]`, an item of `inside`: a `valuerange`."""
    left, right = _spec(left), _spec(right)
    return Writer(lambda u: u.valuerange(lambda r: r.left(left).right(right)))


def cast(type: Any, operand: Any) -> Writer:
    """`type'(operand)`: `type` a spec of `Types`' `Term`, written through the builders (`lambda t:
    t.integeratomtype(lambda a: a.keyword("int"))`), or an int, a width (`8'(x)`)."""
    type_, operand = F.spec(type, _native), _spec(operand)
    return Writer(lambda u: u.castexpression(lambda r: r.type(type_).value(operand)))


def member(value: Any, name: str) -> Writer:
    """`value.name`."""
    value = _spec(value)
    return Writer(lambda u: u.memberexpression(lambda r: r.value(value).member(_identifier(name))))


def call(function: str, *arguments: Any) -> Writer:
    """`function(arguments)`: a system function's call (`$clog2`, a name starting with `$`: a `systemcall`), or a call
    of the function the name names (a `callexpression`)."""
    specs = [_spec(argument) for argument in arguments]
    if function.startswith("$"):
        return Writer(lambda u: u.systemcall(lambda r: r.name(function).arguments(specs)))
    callee = identifier(function)
    return Writer(lambda u: u.callexpression(lambda r: r.callee(callee).arguments(specs)))


def method(array: Any, name: str, *arguments: Any) -> Writer:
    """`array.name(arguments)`: a call of an array's method."""
    callee, specs = member(array, name), [_spec(argument) for argument in arguments]
    return Writer(lambda u: u.callexpression(lambda r: r.callee(callee).arguments(specs)))


def iterate(array: Any, method_: str, name: str, body: Any) -> Writer:
    """`array.method(name) with (body)`: an `arraymethodwithexpression`, its iterator `name`."""
    called, body = method(array, method_, identifier(name)), _spec(body)
    return Writer(lambda u: u.arraymethodwithexpression(lambda r: r.value(called).body(body)))
