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
share, holding C++'s terms). A name is as the grammar makes it (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "A name is whatever the language's own grammar makes it"): where mbse-programs
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
  })`, whose body of statements is not part of the term: mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Bodies within expressions are not part of the term") and
  `extensionexpression` (`__extension__ operand`).
- C Types' `typeid`, a type name, where a subterm may be an expression or a type alike (`sizeof(int)`, `_Generic`'s
  controlling operand, `offsetof(struct s, m)`'s first argument), and C Preprocessor's `definedexpression`,
  `defined(name)`, a preprocessing condition's term, which its install adds: kinds of the dialects C reads, which this
  dialect's `Term` lists ("(b)").
- The framework's kinds of invalid syntax, `error` and `missing`.

Its sublanguages are dialects of their own, which it reads (`reads`; mbse-basis [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided-by-an-agent-for-review), "A dialect reads other dialects' terms"): `C
Types`, C's type names (`Expressions.C.Types.Term`), which a cast's, a compound literal's and a generic association's
`type` hold, a type name's specifiers, declarators, parameters and attribute specifiers its helpers, as no expression
holds them; and `C Preprocessor`, the directives C and C++ share. `Expressions.C.Expressions.Pattern` is its union for
binding targets, which every dialect has ("(ii)"): C expressions bind no names, so it holds invalid syntax alone and
nothing holds it, as the user decided (2026-11-04). As the user decided ("(b)"), one schema is a branch of the union
of every subterm it may be: `Term` lists `designatedinitializer`, for an initializer list's items. Its own helpers, each
union named after mbse-programs' category: `Name`, `Designator`, `Initializer`, and a generic association (`type` and
`value`, a pair of terms).

The editions C covers are data, which `define` writes, each owned by its designation and holding the kinds it has
(`Framework.Standards`): ISO/IEC 9899:2011, 2018 and 2024, C11, C17 and C23 (C17 is C11's corrigenda, with no new
syntax), every kind in each but `constant` (`nullptr`), C23's alone, and an extension in none. `DIALECT` reads the kinds
(`Terms.Dialect`). The writers (`literal`, `identifier`, `binary`, `cast`, ...) write the kinds C evaluated before it
was complete through the builders, in a transaction, a cast's type a spec of C Types' `Term`, written through the
builders too:
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
type, a cast's, a comparison's `bool`, `sizeof`'s `size_t`; and evaluation (see `Simplifiers`). A lone term reaches no
store: reading a type, it is refused (mbse-schemas' TypeError, "the value does not belong to a store"); and a type
neither dialect defines is refused by name, "'int' is not a type C defines, and its expression names no ABI", which
validation reports as a problem.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Terms as F

from .Kinds import (  # the family's shared reading of its kinds, re-exported
    ALIGNOFEXPRESSION, ASSIGNMENTEXPRESSION, BINARYEXPRESSION, CALLEXPRESSION, CASTEXPRESSION,
    COMPOUNDLITERALEXPRESSION, CONCATENATEDSTRING, CONDITIONALEXPRESSION, CONSTANT, DESIGNATEDINITIALIZER, EXTENSIONS,
    EXTENSIONEXPRESSION, GENERICSELECTION, INITIALIZERLIST, LITERAL, MEMBEREXPRESSION, OPTIONAL, PARENTHESIZEDEXPRESSION,
    POSTFIXEXPRESSION, PREFIXES, QUOTES, SIZEOFEXPRESSION, SPELLING, STATEMENTEXPRESSION, SUBSCRIPTEXPRESSION, SUFFIXES,
    TYPEID, UNARYEXPRESSION, VARIABLE, Writers, bound_names, cast_type, constant_text, kinds, problems, scopes, size,
    truth, type_name, untyped)

__all__ = ["install", "define", "DIALECT", "EXTENSIONS", "PREFIXES", "QUOTES", "SUFFIXES", "Writer",
           "Writers", "literal", "identifier", "unary", "binary", "conditional", "cast", "member", "subscript", "call",
           "type_name", "cast_type", "truth", "size", "untyped", "bound_names", "problems", "scopes", "kinds",
           "SPELLING", "OPTIONAL", "constant_text"]


def install(txn: Any) -> Any:
    """C's union of its kinds, added to the framework's terms as the branch `c`, its own kinds, its union of binding
    targets (`Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
    `Expressions.C.Expressions`: run after `Framework.install`, in a transaction of its own, before or after its
    family's other installs; run again, it writes nothing. C Types' `Term` and its `typeid`, which its subterms may be,
    are named by name, each created where C Types' install has not run. Its holder, `Expressions.C.Expressions.Expression`,
    refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.C.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfNullptr": S.OfObject,  # Kinds: the framework's
                  "Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Pattern": S.OfUnion, "Name": S.OfUnion, "Designator": S.OfUnion, "Initializer": S.OfUnion,
                  "Expression": S.OfObject,
                  "Literal": S.OfObject, "Constant": S.OfObject, "ConcatenatedString": S.OfObject,
                  "ParenthesizedExpression": S.OfObject, "GenericSelection": S.OfObject,
                  "GenericAssociation": S.OfObject, "SubscriptExpression": S.OfObject, "CallExpression": S.OfObject,
                  "MemberExpression": S.OfObject, "PostfixExpression": S.OfObject, "UnaryExpression": S.OfObject,
                  "SizeofExpression": S.OfObject, "AlignofExpression": S.OfObject, "CastExpression": S.OfObject,
                  "BinaryExpression": S.OfObject, "ConditionalExpression": S.OfObject,
                  "AssignmentExpression": S.OfObject, "InitializerList": S.OfObject,
                  "DesignatedInitializer": S.OfObject, "FieldDesignator": S.OfObject, "IndexDesignator": S.OfObject,
                  "EqualInitializer": S.OfObject, "CompoundLiteralExpression": S.OfObject,
                  "StatementExpression": S.OfObject, "ExtensionExpression": S.OfObject, "Identifier": S.OfObject,
                  # C Types' `Term` and its `typeid`, by name; FrameworkTerm: the framework's, by name
                  "TypesTerm": S.OfUnion, "TypeId": S.OfObject,
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
            # its binding targets: C expressions bind no names, so invalid syntax alone, held by nothing ("(ii)")
            lambda _: _.Pattern.name("Expressions.C.Expressions.Pattern").branches([
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its names: an identifier, C's one name (mbse-programs' `Name`)
            lambda _: _.Name.name("Expressions.C.Expressions.Name").branches([
                lambda t: t.name("identifier").schema([_.Identifier]),
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
                "type": _.TypesTerm,  # absent: `default`
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
                "type": _.TypesTerm, "initializer": _.InitializerList}),
            # unary and other operators
            lambda _: _.UnaryExpression.name("Expressions.C.Expressions.UnaryExpression").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.SizeofExpression.name("Expressions.C.Expressions.SizeofExpression")
                .properties({"operand": _.Term}),
            lambda _: _.AlignofExpression.name("Expressions.C.Expressions.AlignofExpression").properties({
                "keyword": S.OfStr, "operand": _.Term}),
            lambda _: _.CastExpression.name("Expressions.C.Expressions.CastExpression").properties({
                "type": _.TypesTerm, "operand": _.Term}),
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
            # names
            lambda _: _.Identifier.name("Expressions.C.Expressions.Identifier").properties({"spelling": S.OfStr}),
            # a type name, C Types' kind, which `Term` lists for the subterms that may be an expression or a type alike,
            # and C Types' `Term`, which a cast's, a compound literal's and a generic association's type holds: each by
            # name, created where C Types' install has not run
            lambda _: _.TypeId.name("Expressions.C.Types.TypeId"),
            lambda _: _.TypesTerm.name("Expressions.C.Types.Term"),
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
    OWN, Domain = txn.Expressions.C.Expressions, txn.Expressions.Framework.Domain
    Standard = txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches  # each of its own kinds' schema,
             if branch.name in _C_TAGS and branch.name not in EXTENSIONS}  # by its tag, but an extension
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
            lambda _: _.C11.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2011)).names(
                ["C11"]).kinds(                [schema for tag, schema in every.items() if tag != CONSTANT]),
            lambda _: _.C17.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2018)).names(
                ["C17"]).kinds(                [schema for tag, schema in every.items() if tag != CONSTANT]),
            lambda _: _.C23.bodies(["org.iso", "ch.iec"]).number("9899").revision(lambda r: r.year(2024)).names(
                ["C23"]).kinds(                list(every.values())),
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



_C_TAGS = (LITERAL, CONSTANT, CONCATENATEDSTRING, VARIABLE, PARENTHESIZEDEXPRESSION, GENERICSELECTION,
           SUBSCRIPTEXPRESSION, CALLEXPRESSION, MEMBEREXPRESSION, POSTFIXEXPRESSION, UNARYEXPRESSION, SIZEOFEXPRESSION,
           ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION, ASSIGNMENTEXPRESSION,
           INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION, STATEMENTEXPRESSION,
           EXTENSIONEXPRESSION)
"""Its own kinds, in its `Term`'s order: its `Term` lists C Types' `typeid` after them, and C Preprocessor's
`definedexpression` after invalid syntax, each read as the dialect that declares it reads it."""

def _native(value: Any) -> Writer | None:
    """The literal of a native value: a number, a bool or a string; a bytes has none."""
    return literal(value) if type(value) in (bool, int, float, str) else None




def _reads() -> tuple[F.Dialect, ...]:
    """The dialects of its family whose terms are to be its subterms, imported when first needed (mbse-basis [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided-by-an-agent-for-review), "A dialect reads other dialects' terms"): `C Types` and `C Preprocessor`."""
    from ..Preprocessor import Expressions as CPreprocessor
    from ..Types import Expressions as CTypes
    return CTypes.DIALECT, CPreprocessor.DIALECT


DIALECT = F.Dialect("C.Expressions", kinds("C", _C_TAGS, PREFIXES, SUFFIXES), domain_of=untyped,
                    literal=_native, reads=_reads)
"""The C dialect: its kinds, as the framework reads them, and its family's other dialects' terms."""


# --- Writers ---


class Writer(F.Writer):
    """A term of the C dialect, written through the builders where it is given (a spec)."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)




_WRITERS = Writers(DIALECT, Writer)
literal, identifier, unary, binary = _WRITERS.literal, _WRITERS.identifier, _WRITERS.unary, _WRITERS.binary
conditional, cast, member, subscript, call = (
    _WRITERS.conditional, _WRITERS.cast, _WRITERS.member, _WRITERS.subscript, _WRITERS.call)

