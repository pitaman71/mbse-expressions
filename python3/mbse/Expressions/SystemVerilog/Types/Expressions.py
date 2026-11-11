"""Expressions of the SystemVerilog Types dialect: SystemVerilog's data types (IEEE 1800 clauses 6 and 7), as
mbse-programs has them, the sublanguage of type expressions a cast, a system call's arguments (`$bits(int)`), an
assignment pattern's type and a type reference hold.

It is a dialect of the SystemVerilog family (the dialects proposal, Decided for stage 6: "most languages will have a
dialect for type expressions"), named `SystemVerilog Types` (`Terms.dialect_name`), its tag `systemverilog_types`. Its
terms are values of its `Term`, `Expressions.SystemVerilog.Types.Term`, the branch `systemverilog_types` of
`Expressions.Framework.Term`; a position that holds a type or an expression (mbse-programs' `DataType | Expression`)
holds it, so it lists, besides its own kinds, every branch of `Expressions.SystemVerilog.Expressions.Term`, which that
dialect's install adds ("(b)"). Its own kinds are mbse-programs' data types (`mbse:mbse-programs/python3/mbse/Programs/
Verilog/Syntax.py`), with mbse-programs' names, lowercased as branch tags, and its properties in source order, each a
value object `Expressions.SystemVerilog.Types.<Kind>`:

- `integervectortype` (`bit`, `logic`, `reg`, with a signing and packed dimensions), `integeratomtype` (`byte`,
  `shortint`, `int`, `longint`, `integer`, `time`, with a signing), `nonintegertype` (`shortreal`, `real`, `realtime`),
  `keywordtype` (`string`, `chandle`, `event`, `void`, and an assertion port's `sequence`, `property`, `untyped`);
- `namedtype` (a typedef's or a type parameter's name, with packed dimensions), `virtualinterfacetype`, `implicittype`
  (a signing and dimensions alone: `signed'(x)`'s), `typereference` (`type(x)`);
- `structtype` (`struct` or `union`, `packed`, `tagged` or `soft`, with a signing and dimensions) and `enumtype`, their
  members data (Q7): helpers, `structmember` (each its type and its `variabledeclarator`s) and `enummember`.

Its helpers: those members, a declarator, and the `Dimension` union, `rangedimension` (`[7:0]`), `sizedimension`
(`[8]`), `unsizeddimension` (`[]`), `associativedimension` (`[int]`, `[*]`) and `queuedimension` (`[$]`, `[$:8]`), whose
bounds are `Expressions`' terms. A name is `Expressions`' `Name`, an identifier its `Identifier`, and an attribute its
`AttributeInstance`: the family's helpers, one schema each.

The editions it covers are data, which `define` writes: Verilog's and SystemVerilog's, as `Expressions`' are
(`Expressions.EDITIONS`), each with the kinds it has (`SINCE`). `DIALECT` reads its kinds and the five other dialects'
terms. `Text` writes its kinds as SystemVerilog source, as the family's printer (`Expressions.Text.ToText`) dispatches
them to it. Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `lambda t: t.integeratomtype(lambda a: a.keyword("int"))`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from ..Expressions import Expressions as X

__all__ = ["install", "define", "DIALECT", "SINCE", "TAGS", "HELPERS", "problems"]

INTEGERVECTORTYPE, INTEGERATOMTYPE, NONINTEGERTYPE, KEYWORDTYPE, NAMEDTYPE = (
    "integervectortype", "integeratomtype", "nonintegertype", "keywordtype", "namedtype")
VIRTUALINTERFACETYPE, IMPLICITTYPE, STRUCTTYPE, ENUMTYPE, TYPEREFERENCE = (
    "virtualinterfacetype", "implicittype", "structtype", "enumtype", "typereference")

TAGS = (INTEGERVECTORTYPE, INTEGERATOMTYPE, NONINTEGERTYPE, KEYWORDTYPE, NAMEDTYPE, VIRTUALINTERFACETYPE,
        IMPLICITTYPE, STRUCTTYPE, ENUMTYPE, TYPEREFERENCE)
"""Its own kinds, in its `Term`'s order after `Expressions`' branches."""

HELPERS = ("StructMember", "EnumMember", "VariableDeclarator", "RangeDimension", "SizeDimension", "UnsizedDimension",
           "AssociativeDimension", "QueueDimension")
"""Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
completeness data (`grammars/systemverilog-slang.json`) names them."""

SINCE = {NAMEDTYPE: 3, VIRTUALINTERFACETYPE: 3, STRUCTTYPE: 3, ENUMTYPE: 3, TYPEREFERENCE: 3}
"""The edition each of its kinds arrived in, by its index in `Expressions.EDITIONS`, from mbse-programs' `SINCE`
(`sv()`, IEEE 1800-2005); a kind not listed is in every edition."""

_CHOICES = {
    INTEGERVECTORTYPE: ("IntegerVectorType", {"keyword": ("bit", "logic", "reg"), "signing": ("signed", "unsigned")}),
    INTEGERATOMTYPE: ("IntegerAtomType", {"keyword": ("byte", "shortint", "int", "longint", "integer", "time"),
                                         "signing": ("signed", "unsigned")}),
    NONINTEGERTYPE: ("NonIntegerType", {"keyword": ("shortreal", "real", "realtime")}),
    KEYWORDTYPE: ("KeywordType", {"keyword": ("string", "chandle", "event", "void", "sequence", "property", "untyped")}),
    IMPLICITTYPE: ("ImplicitType", {"signing": ("signed", "unsigned")}),
    STRUCTTYPE: ("StructType", {"keyword": ("struct", "union"), "qualifier": ("tagged", "soft"),
                                "signing": ("signed", "unsigned")}),
    "structmember": ("StructMember", {"random": ("rand", "randc")}),
}
"""The attributes that are one of a few choices, by kind: mbse-programs' kind, and each attribute's choices."""


def install(txn: Any) -> Any:
    """SystemVerilog Types' union of its kinds, added to the framework's terms as the branch `systemverilog_types`, its
    own kinds, the helpers they hold, and its dialect's schema, whose singleton is `Expressions.SystemVerilog.Types`: run
    after `Framework.install`, in a transaction of its own, before or after the other SystemVerilog dialects' installs;
    run again, it writes nothing. `Expressions.SystemVerilog.Expressions.Term`, which its bounds hold, and that dialect's
    helpers are named, created where its install has not run; that install adds its branches to this `Term`. Its holder,
    `Expressions.SystemVerilog.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
    `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.SystemVerilog.Types/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Expression": S.OfObject, "Dimension": S.OfUnion,
                  # `Expressions`' union and helpers, by name: its install's, created here where it has not run
                  "ExpressionsTerm": S.OfUnion, "Name": S.OfUnion, "Identifier": S.OfObject,
                  "AttributeInstance": S.OfObject,
                  "IntegerVectorType": S.OfObject, "IntegerAtomType": S.OfObject, "NonIntegerType": S.OfObject,
                  "KeywordType": S.OfObject, "NamedType": S.OfObject, "VirtualInterfaceType": S.OfObject,
                  "ImplicitType": S.OfObject, "StructType": S.OfObject, "StructMember": S.OfObject,
                  "EnumType": S.OfObject, "EnumMember": S.OfObject, "TypeReference": S.OfObject,
                  "VariableDeclarator": S.OfObject, "RangeDimension": S.OfObject, "SizeDimension": S.OfObject,
                  "UnsizedDimension": S.OfObject, "AssociativeDimension": S.OfObject, "QueueDimension": S.OfObject})
        .spec([
            # its dialect: the singleton `Expressions.SystemVerilog.Types`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.SystemVerilog.Types.Dialect").ref(True).singleton("Expressions.SystemVerilog.Types").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("systemverilog_types").schema([_.Dialect])]),
            # its union of its kinds: `Expressions`' branches, which that dialect's install adds, and its own
            lambda _: _.Term.name("Expressions.SystemVerilog.Types.Term").branches([
                lambda t: t.name("integervectortype").schema([_.IntegerVectorType]),
                lambda t: t.name("integeratomtype").schema([_.IntegerAtomType]),
                lambda t: t.name("nonintegertype").schema([_.NonIntegerType]),
                lambda t: t.name("keywordtype").schema([_.KeywordType]),
                lambda t: t.name("namedtype").schema([_.NamedType]),
                lambda t: t.name("virtualinterfacetype").schema([_.VirtualInterfaceType]),
                lambda t: t.name("implicittype").schema([_.ImplicitType]),
                lambda t: t.name("structtype").schema([_.StructType]),
                lambda t: t.name("enumtype").schema([_.EnumType]),
                lambda t: t.name("typereference").schema([_.TypeReference]),
            ]),
            lambda _: _.ExpressionsTerm.name("Expressions.SystemVerilog.Expressions.Term"),
            lambda _: _.Name.name("Expressions.SystemVerilog.Expressions.Name"),
            lambda _: _.Identifier.name("Expressions.SystemVerilog.Expressions.Identifier"),
            lambda _: _.AttributeInstance.name("Expressions.SystemVerilog.Expressions.AttributeInstance"),
            # dimensions (7.4), their bounds `Expressions`' terms
            lambda _: _.Dimension.name("Expressions.SystemVerilog.Types.Dimension").branches([
                lambda t: t.name("rangedimension").schema([_.RangeDimension]),
                lambda t: t.name("sizedimension").schema([_.SizeDimension]),
                lambda t: t.name("unsizeddimension").schema([_.UnsizedDimension]),
                lambda t: t.name("associativedimension").schema([_.AssociativeDimension]),
                lambda t: t.name("queuedimension").schema([_.QueueDimension]),
            ]),
            lambda _: _.RangeDimension.name("Expressions.SystemVerilog.Types.RangeDimension").properties({
                "left": _.ExpressionsTerm, "right": _.ExpressionsTerm}),
            lambda _: _.SizeDimension.name("Expressions.SystemVerilog.Types.SizeDimension").properties({
                "size": _.ExpressionsTerm}),
            lambda _: _.UnsizedDimension.name("Expressions.SystemVerilog.Types.UnsizedDimension"),
            lambda _: _.AssociativeDimension.name("Expressions.SystemVerilog.Types.AssociativeDimension").properties({
                "type": _.Term}),  # absent: `[*]`
            lambda _: _.QueueDimension.name("Expressions.SystemVerilog.Types.QueueDimension").properties({
                "bound": _.ExpressionsTerm}),  # absent: `[$]`
            # data types (6)
            lambda _: _.IntegerVectorType.name("Expressions.SystemVerilog.Types.IntegerVectorType").properties({
                "keyword": S.OfStr, "signing": S.OfStr, "dimensions": many(_.Dimension)}),
            lambda _: _.IntegerAtomType.name("Expressions.SystemVerilog.Types.IntegerAtomType").properties({
                "keyword": S.OfStr, "signing": S.OfStr}),
            lambda _: _.NonIntegerType.name("Expressions.SystemVerilog.Types.NonIntegerType").properties({
                "keyword": S.OfStr}),
            lambda _: _.KeywordType.name("Expressions.SystemVerilog.Types.KeywordType").properties({
                "keyword": S.OfStr}),
            lambda _: _.NamedType.name("Expressions.SystemVerilog.Types.NamedType").properties({
                "name": _.Name, "dimensions": many(_.Dimension)}),
            lambda _: _.VirtualInterfaceType.name("Expressions.SystemVerilog.Types.VirtualInterfaceType").properties({
                "interface_keyword": S.OfBool, "interface": _.Identifier, "parameters": many(_.Term),
                "modport": _.Identifier}),
            lambda _: _.ImplicitType.name("Expressions.SystemVerilog.Types.ImplicitType").properties({
                "signing": S.OfStr, "dimensions": many(_.Dimension)}),
            # structures, unions and enumerations (7.2, 7.3, 6.19), their members data
            lambda _: _.StructType.name("Expressions.SystemVerilog.Types.StructType").properties({
                "keyword": S.OfStr, "qualifier": S.OfStr, "packed": S.OfBool, "signing": S.OfStr,
                "members": many(_.StructMember), "dimensions": many(_.Dimension)}),
            lambda _: _.StructMember.name("Expressions.SystemVerilog.Types.StructMember").properties({
                "attributes": many(_.AttributeInstance), "random": S.OfStr, "type": _.Term,
                "declarators": many(_.VariableDeclarator)}),
            lambda _: _.EnumType.name("Expressions.SystemVerilog.Types.EnumType").properties({
                "base": _.Term, "members": many(_.EnumMember), "dimensions": many(_.Dimension)}),
            lambda _: _.EnumMember.name("Expressions.SystemVerilog.Types.EnumMember").properties({
                "name": _.Identifier, "left": _.ExpressionsTerm, "right": _.ExpressionsTerm,
                "value": _.ExpressionsTerm}),
            lambda _: _.VariableDeclarator.name("Expressions.SystemVerilog.Types.VariableDeclarator").properties({
                "name": _.Identifier, "dimensions": many(_.Dimension), "value": _.ExpressionsTerm}),
            lambda _: _.TypeReference.name("Expressions.SystemVerilog.Types.TypeReference").properties({
                "operand": _.Term}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.SystemVerilog.Types.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("systemverilog_types").schema([_.Term])]),
        ])]))])


def define(txn: Any) -> Any:
    """SystemVerilog Types' dialect as data: the singleton `Expressions.SystemVerilog.Types` owning the editions it
    covers, by designation (`standards`), Verilog's IEEE Std 1364-1995, 2001 and 2005 and SystemVerilog's IEEE Std
    1800-2005 to 2023, each with its formal reference's parts, its common name and its own kinds it has (`SINCE`). Run
    after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`)
    and each edition by its common name spelled as an identifier (`SystemVerilog_2023`)."""
    OWN, Standard = txn.Expressions.SystemVerilog.Types, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches if branch.name in TAGS}
    kinds = X.editions(every, SINCE)
    return txn.uid("mbse.Expressions.SystemVerilog.Types.define/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, "Verilog_1995": Standard, "Verilog_2001": Standard, "Verilog_2005": Standard,
                  "SystemVerilog_2005": Standard, "SystemVerilog_2009": Standard, "SystemVerilog_2012": Standard,
                  "SystemVerilog_2017": Standard, "SystemVerilog_2023": Standard})
        .spec([
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
        ])]))])


def _nodes(value: Any) -> tuple[F.Node, ...]:
    return () if value is None else value if isinstance(value, tuple) else (value,)


def problems(node: F.Node) -> list[str]:
    """A node's checks, and its helpers' in turn: a choice among a few (a keyword, a signing), mbse-programs' checks, and
    the family's helpers' (an identifier's spelling, invalid syntax), which `Expressions.problems` reads."""
    kind, attributes = node.kind, node.attributes
    found: list[str] = []
    if kind in _CHOICES:
        name, choices = _CHOICES[kind]
        for attribute, allowed in choices.items():
            value = attributes.get(attribute)
            if value is not None and value not in allowed:
                found.append(f"{name}.{attribute} cannot be {value!r}")
    if kind == STRUCTTYPE and attributes.get("qualifier") is not None and attributes.get("keyword") != "union":
        found.append("a StructType with a qualifier is a union")
    if kind == "enummember" and node.slots.get("right") is not None and node.slots.get("left") is None:
        found.append("an EnumMember with a right has a left")
    if kind not in _CHOICES and kind not in (STRUCTTYPE, "enummember"):
        found += X.problems(F.Node(kind, attributes, node.slots, node.many, {}))
    for value in node.helpers.values():
        for inner in _nodes(value):
            found += problems(inner)
    return found


def _check(tag: str) -> Callable[[Any], list[str]]:
    return lambda record: problems(F.node(tag, record))


_OPTIONAL = ("*.bound", "*.value", "dimensions.type", "members.declarators.dimensions.type", "members.left",
             "members.right")
"""The slots of a type's helpers that may be empty: a queue's bound, an attribute's, a declarator's and an enumeration
member's value, an associative array's index type (`[*]`), and an enumeration member's numbers."""


def _kinds() -> dict[str, F.Kind]:
    def application(tag: str, optional: tuple[str, ...] = (), **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=FD.Opaque(), check=_check(tag), optional=optional + _OPTIONAL,
                      **options)

    return {
        INTEGERVECTORTYPE: application(INTEGERVECTORTYPE, required=("keyword",)),
        INTEGERATOMTYPE: application(INTEGERATOMTYPE, required=("keyword",)),
        NONINTEGERTYPE: application(NONINTEGERTYPE, required=("keyword",)),
        KEYWORDTYPE: application(KEYWORDTYPE, required=("keyword",)),
        NAMEDTYPE: application(NAMEDTYPE, required=("name",)),
        VIRTUALINTERFACETYPE: application(VIRTUALINTERFACETYPE, required=("interface",)),
        IMPLICITTYPE: application(IMPLICITTYPE),
        STRUCTTYPE: application(STRUCTTYPE, required=("keyword",)),
        ENUMTYPE: application(ENUMTYPE, optional=("base",)),
        TYPEREFERENCE: application(TYPEREFERENCE),
    }


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms its positions hold, imported when first needed."""
    from ..Assertions import Expressions as Assertions
    from ..Constraints import Expressions as Constraints
    from ..Patterns import Expressions as Patterns
    from ..Preprocessor import Expressions as Preprocessor
    return X.DIALECT, Patterns.DIALECT, Assertions.DIALECT, Constraints.DIALECT, Preprocessor.DIALECT


DIALECT = F.Dialect("SystemVerilog.Types", _kinds(), domain_of=X._untyped, literal=X._native, reads=_reads)
"""The SystemVerilog Types dialect: its kinds, as the framework reads them, and the terms of its family's dialects."""
