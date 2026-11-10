"""Expressions of the C dialect: every expression of C, C11 to C23, as mbse-programs has them, with the type names
expressions hold.

The dialect is complete over C's expression syntax (mbse-basis [CAP-229: the C expression
dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md), by [CAP-226: complete expression
dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules). Its terms are values of its `Term`,
`Expressions.C.Expressions.Term`, the branch `c` of `Expressions.Framework.Term`, which `install` defines and adds to
`Expressions.Framework.Term` by schema extension. Its kinds are mbse-programs' Ccpp expression kinds that C has
(`mbse:mbse-programs/python3/mbse/Programs/Ccpp/Syntax.py`), with mbse-programs' names, lowercased as branch tags
(`binaryexpression`), and its properties in source order (`template_keyword`, `trailing_comma`), each a value object
`Expressions.C.Expressions.<Kind>`; a property only C++ has is not C's (`Cpp` defines its own copy of each kind the two
share, holding C++'s terms). A name is as the grammar makes it (the dialects proposal, Decided): where mbse-programs
holds a `Name`, C holds its `Name` union, whose one branch is `identifier` (`Expressions.C.Expressions.Identifier`, its
`spelling`), C's one name; where it holds an `Identifier`, an `Identifier`; where it holds a `str` (an attribute's
name), a `str`. A term carries no domain. Its kinds:

- Literals: `literal` (`Expressions.C.Expressions.Literal`, refining the framework's `literal`, mbse-basis
  [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md): an integer, a floating, a character or
  a string literal, or C23's `true` and `false`, with what its text encodes, mbse-basis
  [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): an encoding `prefix` (`L`, `u8`, `u`,
  `U`), its `quote` (`'` for a character, whose value is its code, an int, or `"` for a string), an integer's `base`,
  `separators` (C23's `'` between digits) and its `suffix` as written (`u`, `ULL`, `f`, `wb`)); `constant`, C's own,
  for what no schema holds, C23's `nullptr` (its `singleton`), with its spelling too; `concatenatedstring`, adjacent
  string literals (`parts`), as written.
- `variable`: the framework's, an identifier used as an expression (mbse-programs' `IdExpression` of an
  `Identifier`).
- Primaries and postfix expressions: `parenthesizedexpression`, parentheses written in the source; `genericselection`
  (`_Generic`, its `associations` each a `genericassociation`); `subscriptexpression` (`object`, `indices`);
  `callexpression` (`function`, any term, and `arguments`); `memberexpression` (`object`, `operator` `.` or `->`,
  `member`); `postfixexpression` (`++`, `--`); `compoundliteralexpression` (`(type){items}`).
- Unary and other operators: `unaryexpression` (`+ - ! ~ * & ++ --`), `sizeofexpression`, `alignofexpression`
  (`keyword` as written: `_Alignof`, C23's `alignof`), `castexpression` (`(type) operand`, to any type name),
  `binaryexpression`, `conditionalexpression` (`condition ? consequence : alternative`, the GNU `condition ?:
  alternative` without a consequence), `assignmentexpression`.
- Initializers: `initializerlist` (`{items}`, with `trailing_comma`), whose items may be `designatedinitializer`s
  (`.x = 1`, `[2].y = 3`).
- GNU extensions, outside every standard as mbse-programs marks them (`EXTENSIONS`): `statementexpression` (`({ ...
  })`, whose body of statements is not part of the term: the dialects proposal, Decided, 5, "(i)") and
  `extensionexpression` (`__extension__ operand`).
- `typeid`, a type name where a position holds an expression or a type alike (`sizeof(int)`, `_Generic`'s
  controlling operand, `offsetof(struct s, m)`'s first argument).
- The framework's kinds of invalid syntax, `error` and `missing`.

The sublanguages are unions of their own beside `Term` (the dialects proposal, Decided, 5):
`Expressions.C.Expressions.Type`, a type name (`typeid`: its `specifiers` and its abstract `declarator`), held by a
cast, a compound literal, a generic association and an enumeration's fixed type, and
`Expressions.C.Expressions.Pattern`, for binding targets, which every dialect has ("(ii)"): C expressions bind no names,
so it holds invalid syntax alone and nothing holds it, as the user decided (2026-11-04). As the user decided ("(b)"),
one schema is a branch of every union whose positions hold it: `Term` lists `typeid`, for the positions that hold an
expression or a type, and `designatedinitializer`, for an initializer list's items. A type name's parts are helpers,
each union named after mbse-programs' category: `Specifier` (keywords, a named type, a struct, union or enum, C23's
`typeof`, `_Atomic(type)`, C23's `_BitInt(width)`, and, as `TypeId` lists them among its specifiers, the attribute
specifiers), `Declarator` (an identifier, a pointer, an array, a function, parentheses), `Parameter`,
`AttributeSpecifier`, `Designator` and `Initializer`. A struct's or an enum's body, its member or enumerator
declarations, is not part of the term ("(i)"): `body` says whether it has one. The framework reads a value of a
sublanguage, as of any helper, as a `Terms.Part`.

The editions C covers are data, which `define` writes, each owned by its designation and holding the kinds it has
(`Framework.Standards`): ISO/IEC 9899:2011, 2018 and 2024, C11, C17 and C23 (C17 is C11's corrigenda, with no new
syntax), every kind in each but `constant` (`nullptr`), C23's alone, and an extension in none. `DIALECT` reads the
kinds (`Terms.Dialect`). The writers (`literal`, `identifier`, `binary`, `cast`, ...) write the kinds C evaluated before it was complete through the builders, in a transaction, a cast's type a spec of
`Type`, written through the builders too:
`store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`; every other term is written through the builders
(mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)). `Text.ToText` writes an
expression as C source, with C's precedence, e.g. `x.width >= 8u && (uint8_t)(a + b) == 0`.

Its kind of domain, the branch of its union `Expressions.C.Expressions.DomainKind`, which `install` adds to the
framework's `Expressions.Framework.DomainKind` as the branch `c`: the token `nullptr_t` (`OfNullptr`), C23's, with the
inferred `ordered`; its domain has no schema, its value a `constant`'s, and C++'s is Cpp's own. `install` also adds its
domains' schemas, each an `OfAny` of the scalar it narrows (`Expressions.C.Expressions.int32_t`, of ints;
`_Float128`'s and the decimal types', of text), named as a dotted identifier spells its type, with no leading `_`,
which mbse-schemas' frames do not take (`_Float16`'s is `Expressions.C.Expressions.Float16`); `define` writes its
domains, the types C's standard fixes (`bool`, `int8_t` to `uint64_t`, the `_FloatN` and decimal types, `nullptr_t`),
owned by name. What C leaves to the implementation (`int`, `long`, `char`, `long double`, `size_t`, ...) is the domains
of an ABI's dialect (`mbse.Expressions.SystemV.AMD64`, `mbse.Expressions.Arm.AAPCS64`), which a C term's holder names
through its adjacency `abi`:
`store.Expressions.C.Expressions.Expression(lambda e: e.root(...).abi([store.Instances.Expressions.SystemV.AMD64]))`.

What reads a named type reads its stored domain, through the store of the term's holder (`Domains.Types`), among C's
domains, then among its holder's ABI's: validation, a literal's range (`5u`'s `unsigned int`); inference, a literal's
type, a cast's, a comparison's `bool`, `sizeof`'s `size_t`; and evaluation (see `Evaluators`). A lone term reaches no
store: reading a type, it is refused (mbse-schemas' TypeError, "the value does not belong to a store"); and a type
neither dialect defines is refused by name, "'int' is not a type C defines, and its expression names no ABI", which
validation reports as a problem.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Mapping
from typing import Any

from mbse.Expressions.Framework import Domains as FD, Terms as F

from . import Domains

__all__ = ["install", "define", "DIALECT", "EXTENSIONS", "PREFIXES", "QUOTES", "SUFFIXES", "Writer",
           "Writers", "literal", "identifier", "unary", "binary", "conditional", "cast", "member", "subscript", "call",
           "type_name", "cast_type", "truth", "size", "untyped", "bound_names", "problems", "scopes", "kinds",
           "SPELLING", "OPTIONAL"]

LITERAL, CONSTANT, CONCATENATEDSTRING, VARIABLE = "literal", "constant", "concatenatedstring", "variable"
PARENTHESIZEDEXPRESSION, GENERICSELECTION, SUBSCRIPTEXPRESSION, CALLEXPRESSION = (
    "parenthesizedexpression", "genericselection", "subscriptexpression", "callexpression")
MEMBEREXPRESSION, POSTFIXEXPRESSION, UNARYEXPRESSION, SIZEOFEXPRESSION = (
    "memberexpression", "postfixexpression", "unaryexpression", "sizeofexpression")
ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION = (
    "alignofexpression", "castexpression", "binaryexpression", "conditionalexpression")
ASSIGNMENTEXPRESSION, INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION = (
    "assignmentexpression", "initializerlist", "designatedinitializer", "compoundliteralexpression")
STATEMENTEXPRESSION, EXTENSIONEXPRESSION, TYPEID = "statementexpression", "extensionexpression", "typeid"

EXTENSIONS = frozenset({STATEMENTEXPRESSION, EXTENSIONEXPRESSION})
"""GNU's extensions, outside every standard, as mbse-programs marks them."""

PREFIXES = ("L", "u8", "u", "U")
"""A character's or a string's encoding prefixes."""

QUOTES = ("'", '"')
"""A character literal's quote, and a string's."""

SUFFIXES = {
    int: re.compile(r"(?i:u?(?:l|ll|wb)?|(?:l|ll|wb)u)"),
    float: re.compile(r"[fFlL]|df|dd|dl|DF|DD|DL|[fF](?:16|32|64|128|32x|64x|128x)"),
}
"""The suffixes C writes, by the type of the literal's value: an integer's (`u`, `l`, `ll`, C23's `wb`, in either case
and order) and a floating literal's (`f`, `l`, C23's decimal and interchange types' `df`, `f32`)."""

def install(txn: Any) -> Any:
    """C's union of its kinds, added to the framework's terms as the branch `c`, its own kinds, its sublanguages' unions
    (`Type`, `Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
    `Expressions.C.Expressions`: run after `Framework.install`, in a transaction of its own; run again, it writes
    nothing. Its holder, `Expressions.C.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root`
    narrowed to its
    `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.C.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfNullptr": S.OfObject,  # Kinds: the framework's
                  "Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Type": S.OfUnion, "Pattern": S.OfUnion, "Name": S.OfUnion, "Specifier": S.OfUnion,
                  "Declarator": S.OfUnion,
                  "Parameter": S.OfUnion, "AttributeSpecifier": S.OfUnion, "Designator": S.OfUnion,
                  "Initializer": S.OfUnion, "Expression": S.OfObject,
                  "Literal": S.OfObject, "Constant": S.OfObject, "ConcatenatedString": S.OfObject,
                  "ParenthesizedExpression": S.OfObject, "GenericSelection": S.OfObject,
                  "GenericAssociation": S.OfObject, "SubscriptExpression": S.OfObject, "CallExpression": S.OfObject,
                  "MemberExpression": S.OfObject, "PostfixExpression": S.OfObject, "UnaryExpression": S.OfObject,
                  "SizeofExpression": S.OfObject, "AlignofExpression": S.OfObject, "CastExpression": S.OfObject,
                  "BinaryExpression": S.OfObject, "ConditionalExpression": S.OfObject,
                  "AssignmentExpression": S.OfObject, "InitializerList": S.OfObject,
                  "DesignatedInitializer": S.OfObject, "FieldDesignator": S.OfObject, "IndexDesignator": S.OfObject,
                  "EqualInitializer": S.OfObject, "CompoundLiteralExpression": S.OfObject,
                  "StatementExpression": S.OfObject, "ExtensionExpression": S.OfObject, "TypeId": S.OfObject,
                  "DeclSpecifier": S.OfObject, "CvQualifier": S.OfObject, "PrimitiveTypeSpecifier": S.OfObject,
                  "NamedTypeSpecifier": S.OfObject, "ClassSpecifier": S.OfObject, "EnumSpecifier": S.OfObject,
                  "PlaceholderTypeSpecifier": S.OfObject, "TypeofSpecifier": S.OfObject,
                  "AtomicTypeSpecifier": S.OfObject, "BitIntSpecifier": S.OfObject, "IdDeclarator": S.OfObject,
                  "PointerDeclarator": S.OfObject, "ArrayDeclarator": S.OfObject, "FunctionDeclarator": S.OfObject,
                  "ParenthesizedDeclarator": S.OfObject, "ParameterDeclaration": S.OfObject,
                  "EllipsisParameter": S.OfObject, "StandardAttributeSpecifier": S.OfObject,
                  "Attribute": S.OfObject, "AlignasSpecifier": S.OfObject, "GnuAttributeSpecifier": S.OfObject,
                  "DeclspecSpecifier": S.OfObject, "Identifier": S.OfObject,  # FrameworkTerm: the framework's, by name
                  "bool": S.OfAny, "int8_t": S.OfAny, "int16_t": S.OfAny, "int32_t": S.OfAny, "int64_t": S.OfAny,
                  "uint8_t": S.OfAny, "uint16_t": S.OfAny, "uint32_t": S.OfAny, "uint64_t": S.OfAny,
                  "Float16": S.OfAny, "Float32": S.OfAny, "Float64": S.OfAny, "Float128": S.OfAny,
                  "Decimal32": S.OfAny, "Decimal64": S.OfAny, "Decimal128": S.OfAny})  # its domains' schemas
        .spec([
            # its dialect: the singleton `Expressions.C.Expressions`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.C.Expressions.Dialect").ref(True)
                .singleton("Expressions.C.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("c").schema([_.Dialect])]),
            # its union of its kinds: its own, the framework's it reuses, a type name, an initializer list's
            # designated items, and invalid syntax
            lambda _: _.Term.name("Expressions.C.Expressions.Term").branches([
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("constant").schema([_.Constant]),
                lambda t: t.name("concatenatedstring").schema([_.ConcatenatedString]),
                lambda t: t.name("variable").schema([Framework.Variable]),
                lambda t: t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
                lambda t: t.name("genericselection").schema([_.GenericSelection]),
                lambda t: t.name("subscriptexpression").schema([_.SubscriptExpression]),
                lambda t: t.name("callexpression").schema([_.CallExpression]),
                lambda t: t.name("memberexpression").schema([_.MemberExpression]),
                lambda t: t.name("postfixexpression").schema([_.PostfixExpression]),
                lambda t: t.name("unaryexpression").schema([_.UnaryExpression]),
                lambda t: t.name("sizeofexpression").schema([_.SizeofExpression]),
                lambda t: t.name("alignofexpression").schema([_.AlignofExpression]),
                lambda t: t.name("castexpression").schema([_.CastExpression]),
                lambda t: t.name("binaryexpression").schema([_.BinaryExpression]),
                lambda t: t.name("conditionalexpression").schema([_.ConditionalExpression]),
                lambda t: t.name("assignmentexpression").schema([_.AssignmentExpression]),
                lambda t: t.name("initializerlist").schema([_.InitializerList]),
                lambda t: t.name("designatedinitializer").schema([_.DesignatedInitializer]),
                lambda t: t.name("compoundliteralexpression").schema([_.CompoundLiteralExpression]),
                lambda t: t.name("statementexpression").schema([_.StatementExpression]),
                lambda t: t.name("extensionexpression").schema([_.ExtensionExpression]),
                lambda t: t.name("typeid").schema([_.TypeId]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its type names, and invalid syntax
            lambda _: _.Type.name("Expressions.C.Expressions.Type").branches([
                lambda t: t.name("typeid").schema([_.TypeId]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its binding targets: C expressions bind no names, so invalid syntax alone, held by nothing ("(ii)")
            lambda _: _.Pattern.name("Expressions.C.Expressions.Pattern").branches([
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its names: an identifier, C's one name (mbse-programs' `Name`)
            lambda _: _.Name.name("Expressions.C.Expressions.Name").branches([
                lambda t: t.name("identifier").schema([_.Identifier]),
            ]),
            # a type name's specifiers, the attribute specifiers among them (mbse-programs' `Specifier`)
            lambda _: _.Specifier.name("Expressions.C.Expressions.Specifier").branches([
                lambda t: t.name("declspecifier").schema([_.DeclSpecifier]),
                lambda t: t.name("cvqualifier").schema([_.CvQualifier]),
                lambda t: t.name("primitivetypespecifier").schema([_.PrimitiveTypeSpecifier]),
                lambda t: t.name("namedtypespecifier").schema([_.NamedTypeSpecifier]),
                lambda t: t.name("classspecifier").schema([_.ClassSpecifier]),
                lambda t: t.name("enumspecifier").schema([_.EnumSpecifier]),
                lambda t: t.name("placeholdertypespecifier").schema([_.PlaceholderTypeSpecifier]),
                lambda t: t.name("typeofspecifier").schema([_.TypeofSpecifier]),
                lambda t: t.name("atomictypespecifier").schema([_.AtomicTypeSpecifier]),
                lambda t: t.name("bitintspecifier").schema([_.BitIntSpecifier]),
                lambda t: t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
                lambda t: t.name("alignasspecifier").schema([_.AlignasSpecifier]),
                lambda t: t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
                lambda t: t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
            ]),
            lambda _: _.Declarator.name("Expressions.C.Expressions.Declarator").branches([
                lambda t: t.name("iddeclarator").schema([_.IdDeclarator]),
                lambda t: t.name("pointerdeclarator").schema([_.PointerDeclarator]),
                lambda t: t.name("arraydeclarator").schema([_.ArrayDeclarator]),
                lambda t: t.name("functiondeclarator").schema([_.FunctionDeclarator]),
                lambda t: t.name("parenthesizeddeclarator").schema([_.ParenthesizedDeclarator]),
            ]),
            lambda _: _.Parameter.name("Expressions.C.Expressions.Parameter").branches([
                lambda t: t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
                lambda t: t.name("ellipsisparameter").schema([_.EllipsisParameter]),
            ]),
            lambda _: _.AttributeSpecifier.name("Expressions.C.Expressions.AttributeSpecifier").branches([
                lambda t: t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
                lambda t: t.name("alignasspecifier").schema([_.AlignasSpecifier]),
                lambda t: t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
                lambda t: t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
            ]),
            lambda _: _.Designator.name("Expressions.C.Expressions.Designator").branches([
                lambda t: t.name("fielddesignator").schema([_.FieldDesignator]),
                lambda t: t.name("indexdesignator").schema([_.IndexDesignator]),
            ]),
            lambda _: _.Initializer.name("Expressions.C.Expressions.Initializer").branches([
                lambda t: t.name("equalinitializer").schema([_.EqualInitializer]),
                lambda t: t.name("initializerlist").schema([_.InitializerList]),
            ]),
            # literals
            lambda _: _.Literal.name("Expressions.C.Expressions.Literal").refines([Framework.Literal]).properties({
                "prefix": S.OfStr,  # a character's or a string's encoding: `L`, `u8`, `u` or `U`
                "quote": S.OfStr,  # `'` for a character, whose value is its code, or `"` for a string
                "base": S.OfInt,  # an integer's base: 2, 8, 10 or 16
                "separators": S.OfBool,  # whether `'` groups its digits (C23)
                "suffix": S.OfStr,  # an integer's or a floating literal's suffix, as written: `u`, `ULL`, `f`
            }),
            lambda _: _.Constant.name("Expressions.C.Expressions.Constant").properties({
                "singleton": S.OfStr,  # `nullptr`
                "text": S.OfStr,  # its spelling, unvalidated
                "problems": many(S.OfStr),  # what is wrong with it
            }),
            lambda _: _.ConcatenatedString.name("Expressions.C.Expressions.ConcatenatedString")
                .properties({"parts": many(_.Term)}),
            # primary and postfix expressions
            lambda _: _.ParenthesizedExpression.name("Expressions.C.Expressions.ParenthesizedExpression").properties({
                "expression": _.Term}),
            lambda _: _.GenericSelection.name("Expressions.C.Expressions.GenericSelection").properties({
                "controlling": _.Term, "associations": many(_.GenericAssociation)}),
            lambda _: _.GenericAssociation.name("Expressions.C.Expressions.GenericAssociation").properties({
                "type": _.Type,  # absent: `default`
                "value": _.Term}),
            lambda _: _.SubscriptExpression.name("Expressions.C.Expressions.SubscriptExpression").properties({
                "object": _.Term, "indices": many(_.Term)}),
            lambda _: _.CallExpression.name("Expressions.C.Expressions.CallExpression").properties({
                "function": _.Term, "arguments": many(_.Term)}),
            lambda _: _.MemberExpression.name("Expressions.C.Expressions.MemberExpression").properties({
                "object": _.Term, "operator": S.OfStr, "member": _.Name}),
            lambda _: _.PostfixExpression.name("Expressions.C.Expressions.PostfixExpression").properties({
                "operand": _.Term, "operator": S.OfStr}),
            lambda _: _.CompoundLiteralExpression.name("Expressions.C.Expressions.CompoundLiteralExpression")
                .properties({
                "type": _.Type, "initializer": _.InitializerList}),
            # unary and other operators
            lambda _: _.UnaryExpression.name("Expressions.C.Expressions.UnaryExpression").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.SizeofExpression.name("Expressions.C.Expressions.SizeofExpression")
                .properties({"operand": _.Term}),
            lambda _: _.AlignofExpression.name("Expressions.C.Expressions.AlignofExpression").properties({
                "keyword": S.OfStr, "operand": _.Term}),
            lambda _: _.CastExpression.name("Expressions.C.Expressions.CastExpression").properties({
                "type": _.Type, "operand": _.Term}),
            lambda _: _.BinaryExpression.name("Expressions.C.Expressions.BinaryExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.ConditionalExpression.name("Expressions.C.Expressions.ConditionalExpression").properties({
                "condition": _.Term, "consequence": _.Term, "alternative": _.Term}),
            lambda _: _.AssignmentExpression.name("Expressions.C.Expressions.AssignmentExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            # initializers
            lambda _: _.InitializerList.name("Expressions.C.Expressions.InitializerList").properties({
                "items": many(_.Term), "trailing_comma": S.OfBool}),
            lambda _: _.DesignatedInitializer.name("Expressions.C.Expressions.DesignatedInitializer").properties({
                "designators": many(_.Designator), "initializer": _.Initializer}),
            lambda _: _.FieldDesignator.name("Expressions.C.Expressions.FieldDesignator")
                .properties({"name": _.Identifier}),
            lambda _: _.IndexDesignator.name("Expressions.C.Expressions.IndexDesignator").properties({
                "index": _.Term, "last": _.Term}),  # last: GNU's range, `[index ... last]`
            lambda _: _.EqualInitializer.name("Expressions.C.Expressions.EqualInitializer")
                .properties({"value": _.Term}),
            # GNU's extensions: a statement expression's body of statements is not part of the term
            lambda _: _.StatementExpression.name("Expressions.C.Expressions.StatementExpression"),
            lambda _: _.ExtensionExpression.name("Expressions.C.Expressions.ExtensionExpression")
                .properties({"operand": _.Term}),
            # type names: specifiers and an abstract declarator
            lambda _: _.TypeId.name("Expressions.C.Expressions.TypeId").properties({
                "specifiers": many(_.Specifier), "declarator": _.Declarator}),
            lambda _: _.DeclSpecifier.name("Expressions.C.Expressions.DeclSpecifier").properties({"keyword": S.OfStr}),
            lambda _: _.CvQualifier.name("Expressions.C.Expressions.CvQualifier").properties({"keyword": S.OfStr}),
            lambda _: _.PrimitiveTypeSpecifier.name("Expressions.C.Expressions.PrimitiveTypeSpecifier").properties({
                "keyword": S.OfStr}),
            lambda _: _.NamedTypeSpecifier.name("Expressions.C.Expressions.NamedTypeSpecifier")
                .properties({"name": _.Name}),
            lambda _: _.ClassSpecifier.name("Expressions.C.Expressions.ClassSpecifier").properties({
                "key": S.OfStr, "attributes": many(_.AttributeSpecifier), "name": _.Name,
                "body": S.OfBool}),  # whether it has a body, whose member declarations are not part of the term
            lambda _: _.EnumSpecifier.name("Expressions.C.Expressions.EnumSpecifier").properties({
                "key": S.OfStr, "attributes": many(_.AttributeSpecifier), "name": _.Name, "base": _.Type,
                "body": S.OfBool}),  # whether it has a body, whose enumerators are not part of the term
            lambda _: _.PlaceholderTypeSpecifier.name("Expressions.C.Expressions.PlaceholderTypeSpecifier"),
            lambda _: _.TypeofSpecifier.name("Expressions.C.Expressions.TypeofSpecifier").properties({
                "keyword": S.OfStr, "operand": _.Term}),
            lambda _: _.AtomicTypeSpecifier.name("Expressions.C.Expressions.AtomicTypeSpecifier")
                .properties({"type": _.Type}),
            lambda _: _.BitIntSpecifier.name("Expressions.C.Expressions.BitIntSpecifier").properties({"width": _.Term}),
            lambda _: _.IdDeclarator.name("Expressions.C.Expressions.IdDeclarator").properties({
                "name": _.Name, "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.PointerDeclarator.name("Expressions.C.Expressions.PointerDeclarator").properties({
                "attributes": many(_.AttributeSpecifier), "qualifiers": many(_.CvQualifier),
                "declarator": _.Declarator}),
            lambda _: _.ArrayDeclarator.name("Expressions.C.Expressions.ArrayDeclarator").properties({
                "declarator": _.Declarator, "static": S.OfBool, "qualifiers": many(_.CvQualifier), "size": _.Term,
                "star": S.OfBool, "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.FunctionDeclarator.name("Expressions.C.Expressions.FunctionDeclarator").properties({
                "declarator": _.Declarator, "parameters": many(_.Parameter),
                "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.ParenthesizedDeclarator.name("Expressions.C.Expressions.ParenthesizedDeclarator").properties({
                "declarator": _.Declarator}),
            lambda _: _.ParameterDeclaration.name("Expressions.C.Expressions.ParameterDeclaration").properties({
                "attributes": many(_.AttributeSpecifier), "specifiers": many(_.Specifier),
                "declarator": _.Declarator}),
            lambda _: _.EllipsisParameter.name("Expressions.C.Expressions.EllipsisParameter"),
            # names
            lambda _: _.Identifier.name("Expressions.C.Expressions.Identifier").properties({"spelling": S.OfStr}),
            # attributes
            lambda _: _.StandardAttributeSpecifier.name("Expressions.C.Expressions.StandardAttributeSpecifier")
                .properties({
                "attributes": many(_.Attribute)}),
            lambda _: _.Attribute.name("Expressions.C.Expressions.Attribute").properties({
                "namespace": S.OfStr, "name": S.OfStr, "arguments": many(_.Term)}),
            lambda _: _.AlignasSpecifier.name("Expressions.C.Expressions.AlignasSpecifier").properties({
                "keyword": S.OfStr, "operand": _.Term}),
            lambda _: _.GnuAttributeSpecifier.name("Expressions.C.Expressions.GnuAttributeSpecifier").properties({
                "keyword": S.OfStr, "attributes": many(_.Attribute)}),
            lambda _: _.DeclspecSpecifier.name("Expressions.C.Expressions.DeclspecSpecifier").properties({
                "attributes": many(_.Attribute)}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.C.Expressions.Expression").ref(True)
                .refines([Framework.Expression]).properties({
                "root": _.Term}),
            # --- its kind of domain: the token of `nullptr`, its own, not C++'s; inferred `ordered` ---
            lambda _: _.OfNullptr.name("Expressions.C.Expressions.OfNullptr").properties({"ordered": S.OfBool}),
            lambda _: _.DomainKind.name("Expressions.C.Expressions.DomainKind").branches([
                lambda t: t.name("nullptr_t").schema([_.OfNullptr]),
            ]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("c").schema([_.DomainKind])]),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("c").schema([_.Term])]),
            # --- its domains' schemas, each an OfAny of the scalar it narrows (a format whose values are text, `str`),
            # which `define` relates to its domain; `nullptr_t`'s has none ---
            lambda _: _.bool.name("Expressions.C.Expressions.bool").schemas([S.OfBool]),
            lambda _: _.int8_t.name("Expressions.C.Expressions.int8_t").schemas([S.OfInt]),
            lambda _: _.int16_t.name("Expressions.C.Expressions.int16_t").schemas([S.OfInt]),
            lambda _: _.int32_t.name("Expressions.C.Expressions.int32_t").schemas([S.OfInt]),
            lambda _: _.int64_t.name("Expressions.C.Expressions.int64_t").schemas([S.OfInt]),
            lambda _: _.uint8_t.name("Expressions.C.Expressions.uint8_t").schemas([S.OfInt]),
            lambda _: _.uint16_t.name("Expressions.C.Expressions.uint16_t").schemas([S.OfInt]),
            lambda _: _.uint32_t.name("Expressions.C.Expressions.uint32_t").schemas([S.OfInt]),
            lambda _: _.uint64_t.name("Expressions.C.Expressions.uint64_t").schemas([S.OfInt]),
            lambda _: _.Float16.name("Expressions.C.Expressions.Float16").schemas([S.OfFloat]),
            lambda _: _.Float32.name("Expressions.C.Expressions.Float32").schemas([S.OfFloat]),
            lambda _: _.Float64.name("Expressions.C.Expressions.Float64").schemas([S.OfFloat]),
            lambda _: _.Float128.name("Expressions.C.Expressions.Float128").schemas([S.OfStr]),
            lambda _: _.Decimal32.name("Expressions.C.Expressions.Decimal32").schemas([S.OfStr]),
            lambda _: _.Decimal64.name("Expressions.C.Expressions.Decimal64").schemas([S.OfStr]),
            lambda _: _.Decimal128.name("Expressions.C.Expressions.Decimal128").schemas([S.OfStr]),
        ])]))])


def define(txn: Any) -> Any:
    """C's dialect as data: the singleton `Expressions.C.Expressions` owning its domains by name (`domains`, through
    `Expressions.Framework.Defines`), the types C's standard fixes, each with its parameters and its inferred
    properties, and each but `nullptr_t`'s related to its schema (`Expressions.C.Expressions.int32_t`) by
    `Expressions.Framework.HasDomain`: `bool` (11404's `boolean`); `int8_t` to `int64_t` (11404's `integer`, raising
    on overflow, as C leaves it undefined) and `uint8_t` to `uint64_t` (11404's `modulo`, wrapping); `_Float16`,
    `_Float32`, `_Float64` and `_Float128` (IEEE 754's `binary16` to `binary128`) and `_Decimal32`, `_Decimal64` and
    `_Decimal128` (its decimal formats), each rounding ties to even; and `nullptr_t`, of C's own kind. What C leaves to
    the implementation (`int`, `long`, `char`, `long double`, `size_t`, ...) is each ABI dialect's. And the editions
    of C it covers, by designation (`standards`, through `Expressions.Framework.Covers`), each with its formal
    reference's parts, its common name and the kinds it has. Run after `install`, in a transaction of its own; run
    again, it writes nothing. Its frame binds the dialect (`dialect`), each edition by its common name (`C11`) and each
    domain by its name: `store.transaction(C.define)[0]["int32_t"]`."""
    OWN, Domain, Standard = txn.Expressions.C.Expressions, txn.Expressions.Framework.Domain, txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches  # each kind's schema, by its tag,
             if branch.name not in EXTENSIONS and branch.name not in F.INVALID_KINDS}  # but an extension and invalid syntax
    return txn.uid("mbse.Expressions.C.Expressions.define/1").mutations([lambda mu: mu.upsert(
        lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, "C11": Standard, "C17": Standard, "C23": Standard,
                  "bool": Domain, "int8_t": Domain, "int16_t": Domain, "int32_t": Domain, "int64_t": Domain,
                  "uint8_t": Domain, "uint16_t": Domain, "uint32_t": Domain, "uint64_t": Domain,
                  "Float16": Domain, "Float32": Domain, "Float64": Domain, "Float128": Domain,
                  "Decimal32": Domain, "Decimal64": Domain, "Decimal128": Domain, "nullptr_t": Domain})
        .spec([
            # --- the editions C covers, each by its designation, with the kinds it has: every kind but GNU's
            # extensions and invalid syntax, `constant` (`nullptr`) C23's alone; C17 is C11's corrigenda ---
            lambda _: _.dialect.standards({
                "ISO/IEC 9899:2011": lambda e: e.standard(_.C11), "ISO/IEC 9899:2018": lambda e: e.standard(_.C17),
                "ISO/IEC 9899:2024": lambda e: e.standard(_.C23)}),
            lambda _: _.C11.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2011)).names(["C11"]).kinds(
                [schema for tag, schema in every.items() if tag != CONSTANT]),
            lambda _: _.C17.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2018)).names(["C17"]).kinds(
                [schema for tag, schema in every.items() if tag != CONSTANT]),
            lambda _: _.C23.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2024)).names(["C23"]).kinds(
                list(every.values())),
            # --- its domains ---
            lambda _: _.dialect.domains({
                "bool": lambda e: e.domain(_.bool),
                "int8_t": lambda e: e.domain(_.int8_t),
                "int16_t": lambda e: e.domain(_.int16_t),
                "int32_t": lambda e: e.domain(_.int32_t),
                "int64_t": lambda e: e.domain(_.int64_t),
                "uint8_t": lambda e: e.domain(_.uint8_t),
                "uint16_t": lambda e: e.domain(_.uint16_t),
                "uint32_t": lambda e: e.domain(_.uint32_t),
                "uint64_t": lambda e: e.domain(_.uint64_t),
                "_Float16": lambda e: e.domain(_.Float16),
                "_Float32": lambda e: e.domain(_.Float32),
                "_Float64": lambda e: e.domain(_.Float64),
                "_Float128": lambda e: e.domain(_.Float128),
                "_Decimal32": lambda e: e.domain(_.Decimal32),
                "_Decimal64": lambda e: e.domain(_.Decimal64),
                "_Decimal128": lambda e: e.domain(_.Decimal128),
                "nullptr_t": lambda e: e.domain(_.nullptr_t),
            }),
            lambda _: _.bool.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.boolean(
                lambda d: d.ordered(False)))))).schema([OWN.bool]),
            lambda _: _.int8_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(8).signed(True).overflow("raise")
                    .least(-128).greatest(127).ordered(True)))))).schema([OWN.int8_t]),
            lambda _: _.int16_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(16).signed(True).overflow("raise")
                    .least(-32768).greatest(32767).ordered(True)))))).schema([OWN.int16_t]),
            lambda _: _.int32_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(32).signed(True).overflow("raise")
                    .least(-2147483648).greatest(2147483647).ordered(True)))))).schema([OWN.int32_t]),
            lambda _: _.int64_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(64).signed(True).overflow("raise")
                    .least(-9223372036854775808).greatest(9223372036854775807).ordered(True)))))).schema([OWN.int64_t]),
            lambda _: _.uint8_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(256)
                    .least(0).greatest(255).ordered(True)))))).schema([OWN.uint8_t]),
            lambda _: _.uint16_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(65536)
                    .least(0).greatest(65535).ordered(True)))))).schema([OWN.uint16_t]),
            lambda _: _.uint32_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(4294967296)
                    .least(0).greatest(4294967295).ordered(True)))))).schema([OWN.uint32_t]),
            lambda _: _.uint64_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(18446744073709551616)
                    .least(0).greatest(18446744073709551615).ordered(True)))))).schema([OWN.uint64_t]),
            lambda _: _.Float16.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary16").rounding("roundTiesToEven").width(16)
                    .radix(2).precision(11).emax(15).ordered(True)))))).schema([OWN.Float16]),
            lambda _: _.Float32.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary32").rounding("roundTiesToEven").width(32)
                    .radix(2).precision(24).emax(127).ordered(True)))))).schema([OWN.Float32]),
            lambda _: _.Float64.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64)
                    .radix(2).precision(53).emax(1023).ordered(True)))))).schema([OWN.Float64]),
            lambda _: _.Float128.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary128").rounding("roundTiesToEven").width(128)
                    .radix(2).precision(113).emax(16383).ordered(True)))))).schema([OWN.Float128]),
            lambda _: _.Decimal32.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("decimal32").rounding("roundTiesToEven").width(32)
                    .radix(10).precision(7).emax(96).ordered(True)))))).schema([OWN.Decimal32]),
            lambda _: _.Decimal64.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("decimal64").rounding("roundTiesToEven").width(64)
                    .radix(10).precision(16).emax(384).ordered(True)))))).schema([OWN.Decimal64]),
            lambda _: _.Decimal128.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("decimal128").rounding("roundTiesToEven").width(128)
                    .radix(10).precision(34).emax(6144).ordered(True)))))).schema([OWN.Decimal128]),
            lambda _: _.nullptr_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.c(lambda v: v.nullptr_t(
                lambda d: d.ordered(False)))))),
        ])]))])


# --- Reading a term's type name, and what its helpers bind and check ---


def _nodes(value: Any) -> tuple[F.Node, ...]:
    """A helper property's nodes: none where it is absent, one, or each of many."""
    return () if value is None else value if isinstance(value, tuple) else (value,)


def _spelling(name: Any) -> str | None:
    """A name's spelling: an identifier's `spelling` (a `Terms.Part` or a `Node`), or None for any other name, or
    none."""
    return name.attributes.get("spelling") if name is not None and name.kind == "identifier" else None


def type_name(part: Any) -> str | None:
    """The name of the arithmetic type a type name names (a `typeid`'s `Terms.Part`, as a cast's form holds it), by
    `Domains.arithmetic` (`unsigned int`, `uint8_t`), or None: a type with a declarator, or of a specifier that is not
    a keyword or a type's name. Whether a store defines it is the store's (`Domains.Types`)."""
    if part is None or part.kind != TYPEID or "declarator" in part.attributes:
        return None
    names = []
    for specifier in part.attributes.get("specifiers", ()):
        if specifier.kind in ("primitivetypespecifier", "cvqualifier"):
            names.append(specifier.attributes.get("keyword"))
        elif specifier.kind == "namedtypespecifier":
            names.append(_spelling(specifier.attributes.get("name")))
        else:
            return None
    return Domains.arithmetic(names)


def _declared(node: Any) -> frozenset[str]:
    """The name a declarator declares, within its parentheses, pointers, arrays and functions: none, if abstract."""
    while node is not None and node.kind != "iddeclarator":
        node = node.helpers.get("declarator")
    if node is None:
        return frozenset()
    return frozenset({_spelling(node.helpers.get("name"))}) - {None}


def bound_names(node: F.Node) -> frozenset[str]:
    """The names a function declarator's parameters, a lambda's parameters and init captures, or a requires
    expression's parameters bind within it: each parameter declaration's declarator's name, each init capture's."""
    held = [*_nodes(node.helpers.get("parameters")), *_nodes(node.helpers.get("captures"))]
    declarator = node.helpers.get("declarator")  # a lambda's, its parameters
    if declarator is not None and node.kind == "lambdaexpression":
        held += _nodes(declarator.helpers.get("parameters"))
    declared = (_declared(p.helpers.get("declarator")) for p in held if p.kind == "parameterdeclaration")
    found = frozenset[str]().union(*declared)
    return found | ({_spelling(p.helpers.get("name")) for p in held if p.kind == "initcapture"} - {None})


_BINDERS = frozenset({"functiondeclarator", "lambdaexpression", "requiresexpression"})


def _bound(node: F.Node, inner: frozenset[str]) -> list[frozenset[str]]:
    """The names each of a node's arguments has bound, in order: within a function declarator, a lambda or a requires
    expression, its parameters' (and init captures') names; its slots, its variadic arguments, then its helpers'."""
    if node.kind in _BINDERS:
        inner = inner | bound_names(node)
    found = [inner] * (len(node.slots) + len(node.many))
    for value in node.helpers.values():
        for helper in _nodes(value):
            found += _bound(helper, inner)
    return found


def scopes(tag: str) -> Callable[[Any], list[frozenset[str]]]:
    """What each argument of a kind has bound, besides its scope's: the parameters a function declarator, a lambda or
    a requires expression declares, within it (`bound_names`)."""
    def scopes(record: Any) -> list[frozenset[str]]:
        return _bound(F.node(tag, record), frozenset())

    return scopes


_IDENTIFIER = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")

_NAMES = {"variable": "name", "identifier": "spelling"}
"""The kinds and helpers that hold an identifier's spelling, and where: the framework's variable, and an identifier,
wherever a name is held."""


def _identifier_problems(value: Any) -> list[str]:
    """An identifier, as mbse-programs checks it: letters, digits, `_` and `$`, not starting with a digit; characters
    beyond ASCII are taken to be letters."""
    if type(value) is not str or not value:
        return []
    ascii_ = "".join(c if c.isascii() else "a" for c in value)
    return [] if _IDENTIFIER.fullmatch(ascii_) else [f"{value!r} is not an identifier"]


def _literal_problems(attributes: Mapping[str, Any], prefixes: tuple[str, ...],
                      suffixes: Mapping[type, re.Pattern[str]], language: str, types: Domains.Types) -> list[str]:
    """A literal's encoded properties: its prefix, its quote, its base and its suffix, each one its dialect writes, and
    its value, one of its type (`Domains.out_of_range`), read through `types`; a type neither its dialect nor its
    holder's ABI defines is reported by name."""
    problems = []
    prefix, quote, base, suffix = (attributes.get(name) for name in ("prefix", "quote", "base", "suffix"))
    if prefix is not None and prefix not in prefixes:
        problems.append(f"a literal's prefix cannot be {prefix!r}")
    if quote is not None and quote not in QUOTES:
        problems.append(f"a literal's quote cannot be {quote!r}")
    if base is not None and base not in (2, 8, 10, 16):
        problems.append(f"a literal's base cannot be {base!r}")
    if suffix is not None:
        allowed = suffixes.get(type(attributes.get("value")))
        if allowed is None or not allowed.fullmatch(suffix):
            problems.append(f"a literal's suffix cannot be {suffix!r}")
    try:
        out = Domains.out_of_range(attributes, language, types)
    except ValueError as error:  # its type is not defined in its holder's store
        out = str(error)
    return problems + ([out] if out is not None else [])


def _constant_problems(attributes: Mapping[str, Any]) -> list[str]:
    """A constant holds `nullptr`, unless its text is invalid, its problems said."""
    singleton = attributes.get("singleton")
    if singleton is None:
        return [] if "problems" in attributes else ["a constant needs a singleton"]
    return [] if singleton == "nullptr" else [f"a constant's singleton must be nullptr, got {singleton!r}"]


def problems(node: F.Node, types: Domains.Types, suffixes: Mapping[type, re.Pattern[str]] = SUFFIXES,
             prefixes: tuple[str, ...] = PREFIXES, language: str = "C") -> list[str]:
    """A node's checks, and its helpers' in turn, which the framework's validation does not read within a helper: an
    identifier's spelling, a literal's encoded properties and its value's range, in `language` (`C` or `C++`), its type
    read through `types`, a member's operator, invalid syntax in a sublanguage."""
    kind, attributes = node.kind, node.attributes
    found = F.invalid_problems(kind, attributes) if kind in ("error", "missing") else []
    found += _identifier_problems(attributes.get(_NAMES.get(kind, "")))
    if kind == MEMBEREXPRESSION and attributes.get("operator") not in (None, ".", "->"):
        found.append(f"a memberexpression's operator must be '.' or '->', got {attributes['operator']!r}")
    found += _constant_problems(attributes) if kind == CONSTANT else []
    found += _literal_problems(attributes, prefixes, suffixes, language, types) if kind == LITERAL else []
    for value in node.helpers.values():
        for inner in _nodes(value):
            found += problems(inner, types, suffixes, prefixes, language)
    return found


_ANY1 = FD.Function((FD.Anything,), FD.Anything)

OPTIONAL = ("*.size", "*.last", "*.condition", "*.default", "*.requires")
"""The slots of a kind's helpers that may be empty, wherever its type names nest them: an array declarator's size, a
designator's range's last index, a noexcept specifier's condition, a parameter's default argument, a lambda's or a
template parameter's requires clause."""


_KEYWORD_TYPES = frozenset(Domains.NAMES)
"""The types C's keywords name, which a store's dialects must define; a type's name may be a program's own."""


def cast_type(name: str | None, types: Domains.Types) -> Domains.CType | None:
    """The arithmetic type a cast names, by its name (`type_name`), read through `types`: one its keywords name must be
    defined (`int`), one a type's name names may be a program's own, so not arithmetic (`my_t`); None for a type that is
    not arithmetic."""
    if name is None:
        return None
    return types.named(name) if name in _KEYWORD_TYPES else types.find(name)


def _path(language: str) -> str:
    return "C.Expressions" if language == "C" else "Cpp.Expressions"


def truth(language: str) -> Callable[[Any], FD.Domain]:
    """A kind's domain that is `bool`, read from the store of the term's holder (a comparison's, `!`'s,
    `noexcept`'s)."""
    return lambda record: Domains.Types(record, _path(language)).named("bool")


def size(language: str) -> Callable[[Any], FD.Domain]:
    """`sizeof`'s and `alignof`'s domain, `size_t`, read from the store of the term's holder."""
    return lambda record: Domains.Types(record, _path(language)).named("size_t")


_TRUTHS = frozenset({"<", "<=", ">", ">=", "==", "!=", "&&", "||", "!"})


def _operator_truth(language: str) -> Callable[[Any], FD.Domain | None]:
    """An operator's domain where it is `bool` (a comparison, `&&`, `||`, `!`), read from the store of the term's
    holder; None for any other, whose domain is its signature's."""
    read = truth(language)
    return lambda record: read(record) if F.attributes_of(record).get("operator") in _TRUTHS else None


SPELLING = {"C": ("text", "problems", "quote", "base", "separators"),
            "C++": ("text", "problems", "base", "separators", "raw", "delimiter")}
"""A literal's spelling, in each language: what its text writes beside its value, not what it is. A character's quote is
C's spelling, `'a'` an `int` as `97` is, and not C++'s, where `'a'` is a `char`: there it is what the literal is."""


def kinds(language: str, tags: tuple[str, ...], prefixes: tuple[str, ...],
          suffixes: Mapping[type, re.Pattern[str]]) -> dict[str, F.Kind]:
    """How the framework reads the kinds of the C family that a dialect has (`tags`, in its `Term`'s order: those it
    shares with the other language of the family), in `language` (`C` or `C++`), whose binary operators, literals'
    types, prefixes and suffixes differ."""

    def check(tag: str) -> Callable[[Any], list[str]]:
        return lambda record: problems(F.node(tag, record), Domains.Types(record, _path(language)), suffixes, prefixes,
                                       language)

    def typed_cast(record: Any) -> FD.Domain | None:
        """A cast's arithmetic type, which is its domain, read from the store of the term's holder."""
        return cast_type(type_name(F.attributes_of(record).get("type")), Domains.Types(record, _path(language)))

    def application(tag: str, signature: FD.Signature = FD.Opaque(), optional: tuple[str, ...] = (),
                    **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, signature=signature, check=check(tag),
                      scopes=scopes(tag), optional=optional + OPTIONAL, **options)

    def operator(tag: str, vocabulary: Mapping[str, FD.Signature], **options: Any) -> F.Kind:
        return F.Kind(F.APPLICATION, operator="operator", vocabulary=vocabulary, required=("operator",),
                      check=check(tag), scopes=scopes(tag), **options)

    every: dict[str, Callable[[], F.Kind]] = {
        LITERAL: lambda: F.Kind(F.LITERAL, spelling=SPELLING[language], check=check(LITERAL),
                                typed=lambda record: Domains.literal(F.attributes_of(record), language,
                                                                     Domains.Types(record, _path(language)))),
        CONSTANT: lambda: F.Kind(F.LITERAL, spelling=("text", "problems"), check=check(CONSTANT),
                                 typed=lambda record: Domains.NULLPTR),
        CONCATENATEDSTRING: lambda: application(CONCATENATEDSTRING, FD.Opaque(Domains.String)),
        VARIABLE: lambda: F.Kind(F.REFERENCE, required=("name",), check=check(VARIABLE)),
        PARENTHESIZEDEXPRESSION: lambda: application(PARENTHESIZEDEXPRESSION, _ANY1),
        GENERICSELECTION: lambda: application(GENERICSELECTION),
        SUBSCRIPTEXPRESSION: lambda: application(SUBSCRIPTEXPRESSION, Domains.SUBSCRIPT),
        CALLEXPRESSION: lambda: application(CALLEXPRESSION, Domains.CALL),
        MEMBEREXPRESSION: lambda: application(MEMBEREXPRESSION, Domains.MEMBER, required=("operator", "member")),
        POSTFIXEXPRESSION: lambda: operator(POSTFIXEXPRESSION, Domains.POSTFIX),
        UNARYEXPRESSION: lambda: operator(UNARYEXPRESSION, Domains.UNARY, typed=_operator_truth(language)),
        SIZEOFEXPRESSION: lambda: application(SIZEOFEXPRESSION, Domains.SIZE, typed=size(language)),
        ALIGNOFEXPRESSION: lambda: application(ALIGNOFEXPRESSION, Domains.SIZE, required=("keyword",),
                                               typed=size(language)),
        CASTEXPRESSION: lambda: application(CASTEXPRESSION, Domains.CAST, required=("type",), typed=typed_cast),
        BINARYEXPRESSION: lambda: operator(BINARYEXPRESSION, Domains.BINARY if language == "C" else Domains.BINARY_CPP,
                                           typed=_operator_truth(language)),
        CONDITIONALEXPRESSION: lambda: application(CONDITIONALEXPRESSION, Domains.CONDITIONAL,
                                                   optional=("consequence",)),
        ASSIGNMENTEXPRESSION: lambda: operator(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT),
        INITIALIZERLIST: lambda: application(INITIALIZERLIST),
        DESIGNATEDINITIALIZER: lambda: application(DESIGNATEDINITIALIZER, required=("initializer",)),
        COMPOUNDLITERALEXPRESSION: lambda: application(COMPOUNDLITERALEXPRESSION, required=("type", "initializer")),
        STATEMENTEXPRESSION: lambda: application(STATEMENTEXPRESSION),
        EXTENSIONEXPRESSION: lambda: application(EXTENSIONEXPRESSION, _ANY1),
        TYPEID: lambda: application(TYPEID),
    }
    return {tag: every[tag]() for tag in tags if tag in every}


_C_TAGS = (LITERAL, CONSTANT, CONCATENATEDSTRING, VARIABLE, PARENTHESIZEDEXPRESSION, GENERICSELECTION,
           SUBSCRIPTEXPRESSION, CALLEXPRESSION, MEMBEREXPRESSION, POSTFIXEXPRESSION, UNARYEXPRESSION, SIZEOFEXPRESSION,
           ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION, ASSIGNMENTEXPRESSION,
           INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION, STATEMENTEXPRESSION,
           EXTENSIONEXPRESSION, TYPEID)

def _native(value: Any) -> Writer | None:
    """The literal of a native value: a number, a bool or a string; a bytes has none."""
    return literal(value) if type(value) in (bool, int, float, str) else None


def untyped(value: Any) -> FD.Domain:
    """The domain of a literal no type holds, an int beyond every type its suffix allows (`Kind.typed` reads the
    others'): not known."""
    return FD.Anything


DIALECT = F.Dialect("C.Expressions", kinds("C", _C_TAGS, PREFIXES, SUFFIXES), domain_of=untyped,
                    literal=_native)
"""The C dialect: its kinds, as the framework reads them."""


# --- Writers ---


class Writer(F.Writer):
    """A term of the C dialect, written through the builders where it is given (a spec)."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


def _identifier_name(spelling: str) -> Any:
    """A name that is an identifier: its spelling, written in a `Name`."""
    return lambda n: n.identifier(lambda i: i.spelling(spelling))


class Writers:
    """The writers of the kinds the C family evaluates, for one dialect: its `Terms.Dialect`, whose `spec` writes a
    native value as its literal, and its `Writer`. C's are this module's functions; `Cpp`'s, its own."""

    def __init__(self, dialect: F.Dialect, writer: type[F.Writer]):
        self.dialect, self.writer = dialect, writer

    def literal(self, value: Any, suffix: str | None = None) -> Any:
        """The literal `value` (a bool, an int, a float or a str), with `suffix` as written (`u`, `ull`, `f`, `L`),
        which gives its type."""

        def record(r: Any) -> Any:
            if value is not None:
                r.value(lambda p: p.as_scalar(value))
            return r if suffix is None else r.suffix(suffix)

        return self.writer(lambda u: u.literal(record))

    def identifier(self, name: str) -> Any:
        """The variable `name`: an identifier used as an expression."""
        return self.writer(lambda u: u.variable(lambda r: r.name(name)))

    def unary(self, operator: str, operand: Any) -> Any:
        """`<operator> operand`; the operand is a spec (a native value is a literal)."""
        operand = self.dialect.spec(operand)
        return self.writer(lambda u: u.unaryexpression(lambda r: r.operator(operator).operand(operand)))

    def binary(self, operator: str, left: Any, right: Any) -> Any:
        """`left <operator> right`; each operand is a spec."""
        left, right = self.dialect.spec(left), self.dialect.spec(right)
        return self.writer(lambda u: u.binaryexpression(lambda r: r.left(left).operator(operator).right(right)))

    def conditional(self, condition: Any, consequence: Any, alternative: Any) -> Any:
        """`condition ? consequence : alternative`."""
        condition, consequence = self.dialect.spec(condition), self.dialect.spec(consequence)
        alternative = self.dialect.spec(alternative)
        return self.writer(lambda u: u.conditionalexpression(
            lambda r: r.condition(condition).consequence(consequence).alternative(alternative)))

    def cast(self, type: Any, operand: Any) -> Any:
        """`(type) operand`, `type` a spec of the dialect's `Type`, written through the builders (`lambda t: t.typeid(
        lambda i: i.specifiers([lambda s: s.primitivetypespecifier(lambda p: p.keyword("int"))]))`)."""
        operand = self.dialect.spec(operand)
        return self.writer(lambda u: u.castexpression(lambda r: r.type(type).operand(operand)))

    def member(self, object: Any, name: str, operator: str = ".") -> Any:
        """`object.name`, or `object->name` with the operator '->'."""
        object = self.dialect.spec(object)
        return self.writer(lambda u: u.memberexpression(
            lambda r: r.object(object).operator(operator).member(_identifier_name(name))))

    def subscript(self, object: Any, *indices: Any) -> Any:
        """`object[index]` (C++23's `object[i, j]` with several)."""
        object, specs = self.dialect.spec(object), [self.dialect.spec(index) for index in indices]
        return self.writer(lambda u: u.subscriptexpression(lambda r: r.object(object).indices(specs)))

    def call(self, function: Any, *arguments: Any) -> Any:
        """`function(arguments...)`: a function by its name (a `str`, the variable that names it), or any term."""
        function = self.identifier(function) if type(function) is str else self.dialect.spec(function)
        specs = [self.dialect.spec(argument) for argument in arguments]
        return self.writer(lambda u: u.callexpression(lambda r: r.function(function).arguments(specs)))


_WRITERS = Writers(DIALECT, Writer)
literal, identifier, unary, binary = _WRITERS.literal, _WRITERS.identifier, _WRITERS.unary, _WRITERS.binary
conditional, cast, member, subscript, call = (
    _WRITERS.conditional, _WRITERS.cast, _WRITERS.member, _WRITERS.subscript, _WRITERS.call)
