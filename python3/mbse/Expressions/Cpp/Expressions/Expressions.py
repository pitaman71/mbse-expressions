"""Expressions of the Cpp dialect: every expression of C++, C++17 to C++23, as mbse-programs has them, with the
sublanguages expressions hold.

The dialect is complete over C++'s expression syntax (mbse-basis [CAP-230: the C++ expression
dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md), by [CAP-226: complete expression
dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules); C++26's pack indexing, reflection, splices,
annotations and contracts are outside it. Its terms are values of its `Term`, `Expressions.Cpp.Expressions.Term`, the
branch `cpp` of `Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema
extension. Its kinds are mbse-programs' Ccpp expression kinds that C++ has
(`mbse:mbse-programs/python3/mbse/Programs/Ccpp/Syntax.py`), named as `C.Expressions` names them: C++ is not a superset
of C, so the two are separate dialects, each with a union of its own, and `Cpp` defines its own copy of each kind they
share (`Expressions.Cpp.Expressions.BinaryExpression`), holding C++'s terms, without what only C has (an array
declarator's `static`, C's index designators, `_Generic`, compound literals, `typeof`, `_Atomic(type)`, `_BitInt`).
Where mbse-programs holds a `Name`, Cpp holds its `Name` union (`identifier`, `qualifiedname`, `templateid`,
`operatorname`, `conversionname`, `literaloperatorname`, `destructorname`, and, where a name's place holds it, a
`decltypespecifier`); where it holds an `Identifier` alone, an `Identifier`; where it holds a `str`, a `str`. A term
carries no domain. Beyond C's kinds (see `C.Expressions`), with C++'s own literal
(`Expressions.Cpp.Expressions.Literal`, also a raw string's `raw` and `delimiter`) and `constant` (`nullptr`):

- `userdefinedliteral` (`literal`, a `literal`'s value object, and its `suffix`, `10_km`);
- names: `idexpression`, every name used as an expression, holding its `Name` (`x`, `std::cout`, `f<int>`,
  `operator+`), as C++'s grammar makes it: C++ has no `variable` (the user's decision of 2026-11-04, in the dialects
  proposal's Decided), and an `idexpression` of an identifier is a lexical reference to its spelling, which validation
  requires bound and evaluation resolves; `thisexpression`;
- `lambdaexpression` (`captures`, `template_parameters`, `template_requires`, `attributes`, `declarator`), whose body of
  statements is not part of the term (the dialects proposal, Decided, 5, "(i)"); `foldexpression`;
  `requiresexpression` (`parameters`, `requirements`). A lambda and a requires expression are binders, refining the
  framework's `Let`, Let's `name`, `value` and `body` unset: what each binds, its scopes say;
- casts: `functionalcastexpression` (`T(x)`, `T{x}`), `namedcastexpression` (`static_cast<T>(x)` and its siblings),
  `typeidexpression`;
- `awaitexpression` (`co_await`), `yieldexpression` (`co_yield`), `sizeofpackexpression` (`sizeof...(pack)`),
  `noexceptexpression`, `newexpression`, `deleteexpression`, `throwexpression`, `packexpansion` (`pattern...`).

Its sublanguages are dialects of their own, which it reads (`reads`; the dialects proposal, Retrofit's design): `Cpp
Types`, C++'s type-ids (`Expressions.Cpp.Types.Term`), which every position of a type holds (a cast's, a named cast's,
`new`'s, a conversion function's name's, a trailing return type, an enumeration's fixed type, a type parameter's
default), and C's `C Preprocessor`, the directives C and C++ share; `Term` lists their `typeid` and `definedexpression`
("(b)"). `Expressions.Cpp.Expressions.Pattern` is its union for binding targets ("(ii)"): an init capture's name (`[n =
1]`), an `identifier`, or invalid syntax, as the user decided (2026-11-04). As the user decided ("(b)"), one schema is a
branch of every union whose positions hold it: `Term` lists `designatedinitializer`, as C's does, `Pattern` lists
`identifier`, `Name` lists `decltypespecifier`, `Specifier` the attribute specifiers, `TemplateParameter` a
`parameterdeclaration` and `Initializer` an `initializerlist`. A type-id's and a lambda's parts are its helpers, as a
lambda's declarator holds parameters with their specifiers and declarators (so they stay this dialect's, read by `Cpp
Types` through its `reads`), each union named after mbse-programs' category: `Name`, `Specifier`, `Declarator`,
`Parameter`, `TemplateParameter`, `Capture`, `Requirement`, `Designator`, `Initializer`, `ExceptionSpecification` and
`AttributeSpecifier`. An enumeration's body is data, Cpp Types' terms: its `EnumSpecifier` holds its `enumerators` and
`trailing_comma`.

The editions C++ covers are data, which `define` writes, each owned by its designation and holding the kinds it has
(`Framework.Standards`): ISO/IEC 14882:2017, 2020 and 2024, C++17, C++20 and C++23, every kind in each but C++20's
(`co_await`, `co_yield`, `requires` and designated initializers), in C++20 and C++23 alone, and an extension in none.
`DIALECT` reads the kinds (`Terms.Dialect`). The writers (`literal`, `identifier`, ...) are C's, writing C++'s terms, a
name used as an expression an `idexpression` (`identifier("x")`, and a callee named by a string):
`store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`. `Text.ToText` writes an expression as C++ source.

Its kind of domain, the branch of its union `Expressions.Cpp.Expressions.DomainKind`, which `install` adds to the
framework's `Expressions.Framework.DomainKind` as the branch `cpp`: the token `nullptr_t` (`OfNullptr`), C++'s own, with
the inferred `ordered`; its domain has no schema, its value a `constant`'s. `install` also adds its domains' schemas
(`Expressions.Cpp.Expressions.std_float16_t`, a dotted identifier spelling `std::float16_t`), and `define` writes its
domains, the types C++'s standard fixes (`bool`, `int8_t` to `uint64_t`, `std::float16_t` to `std::float128_t`,
`std::bfloat16_t`, `nullptr_t`), owned by name. Every other type a C++ term reads (`int`, `char`, `char8_t`, `size_t`,
`long double`, ...) is its holder's ABI's, as a C term's is, read the same way (see `C.Expressions`): a C++ literal is
typed by C++'s names, `1.0f16` a `std::float16_t`, `1.0bf16` a `std::bfloat16_t`.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.C.Expressions import Domains
from mbse.Expressions.C.Expressions import Kinds as C
from mbse.Expressions.Framework import Domains as FD, Terms as F

__all__ = ["install", "define", "DIALECT", "EXTENSIONS", "PREFIXES", "SUFFIXES", "Writer", "literal",
           "identifier", "unary", "binary", "conditional", "cast", "member", "subscript", "call"]

USERDEFINEDLITERAL, IDEXPRESSION, THISEXPRESSION, LAMBDAEXPRESSION = (
    "userdefinedliteral", "idexpression", "thisexpression", "lambdaexpression")
FOLDEXPRESSION, REQUIRESEXPRESSION, FUNCTIONALCASTEXPRESSION, NAMEDCASTEXPRESSION = (
    "foldexpression", "requiresexpression", "functionalcastexpression", "namedcastexpression")
TYPEIDEXPRESSION, AWAITEXPRESSION, SIZEOFPACKEXPRESSION, NOEXCEPTEXPRESSION = (
    "typeidexpression", "awaitexpression", "sizeofpackexpression", "noexceptexpression")
NEWEXPRESSION, DELETEEXPRESSION, THROWEXPRESSION, YIELDEXPRESSION, PACKEXPANSION = (
    "newexpression", "deleteexpression", "throwexpression", "yieldexpression", "packexpansion")

EXTENSIONS = C.EXTENSIONS
"""GNU's extensions, outside every standard, as mbse-programs marks them."""

PREFIXES = C.PREFIXES
"""A character's or a string's encoding prefixes."""

SUFFIXES = C.CPP_SUFFIXES
"""The suffixes C++ writes, by the type of the literal's value: an integer's (`u`, `l`, `ll`, C++23's `z`, in either
case and order) and a floating literal's (`f`, `l`, C++23's extended types' `f16` to `f128` and `bf16`)."""


def install(txn: Any) -> Any:
    """Cpp's union of its kinds, added to the framework's terms as the branch `cpp`, its own kinds, its union of binding
    targets (`Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
    `Expressions.Cpp.Expressions`: run after `Framework.install`, in a transaction of its own, before or after its
    family's other installs; run again, it writes nothing. Cpp Types' `Term` and its `typeid`, which its positions hold,
    are named by name, each created where Cpp Types' install has not run. Its holder,
    `Expressions.Cpp.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
    `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.Cpp.Expressions/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Kinds": S.OfUnion, "DomainKind": S.OfUnion, "OfNullptr": S.OfObject,  # Kinds: the framework's
                  "Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Pattern": S.OfUnion, "Name": S.OfUnion, "Capture": S.OfUnion,
                  "Requirement": S.OfUnion, "Designator": S.OfUnion, "Initializer": S.OfUnion,
                  "Specifier": S.OfUnion, "Declarator": S.OfUnion, "Parameter": S.OfUnion,
                  "TemplateParameter": S.OfUnion, "ExceptionSpecification": S.OfUnion,
                  "AttributeSpecifier": S.OfUnion, "Expression": S.OfObject,
                  "Literal": S.OfObject, "Constant": S.OfObject, "UserDefinedLiteral": S.OfObject,
                  "ConcatenatedString": S.OfObject, "IdExpression": S.OfObject, "ThisExpression": S.OfObject,
                  "ParenthesizedExpression": S.OfObject, "LambdaExpression": S.OfObject,
                  "LambdaDeclarator": S.OfObject, "DefaultCapture": S.OfObject, "SimpleCapture": S.OfObject,
                  "ThisCapture": S.OfObject, "InitCapture": S.OfObject, "FoldExpression": S.OfObject,
                  "RequiresExpression": S.OfObject, "SimpleRequirement": S.OfObject, "TypeRequirement": S.OfObject,
                  "CompoundRequirement": S.OfObject, "NestedRequirement": S.OfObject,
                  "SubscriptExpression": S.OfObject, "CallExpression": S.OfObject,
                  "FunctionalCastExpression": S.OfObject, "MemberExpression": S.OfObject,
                  "PostfixExpression": S.OfObject, "NamedCastExpression": S.OfObject,
                  "TypeidExpression": S.OfObject, "UnaryExpression": S.OfObject, "AwaitExpression": S.OfObject,
                  "SizeofExpression": S.OfObject, "SizeofPackExpression": S.OfObject,
                  "AlignofExpression": S.OfObject, "NoexceptExpression": S.OfObject, "NewExpression": S.OfObject,
                  "DeleteExpression": S.OfObject, "CastExpression": S.OfObject, "BinaryExpression": S.OfObject,
                  "ConditionalExpression": S.OfObject, "AssignmentExpression": S.OfObject,
                  "ThrowExpression": S.OfObject, "YieldExpression": S.OfObject, "PackExpansion": S.OfObject,
                  "InitializerList": S.OfObject, "DesignatedInitializer": S.OfObject, "FieldDesignator": S.OfObject,
                  "EqualInitializer": S.OfObject, "ParenthesizedInitializer": S.OfObject,
                  "StatementExpression": S.OfObject, "ExtensionExpression": S.OfObject, "Identifier": S.OfObject,
                  "OperatorName": S.OfObject, "ConversionName": S.OfObject, "LiteralOperatorName": S.OfObject,
                  "DestructorName": S.OfObject, "TemplateId": S.OfObject, "QualifiedName": S.OfObject,
                  "DeclSpecifier": S.OfObject, "CvQualifier": S.OfObject,
                  "PrimitiveTypeSpecifier": S.OfObject, "NamedTypeSpecifier": S.OfObject,
                  "TypenameSpecifier": S.OfObject, "ClassSpecifier": S.OfObject, "BaseSpecifier": S.OfObject,
                  "EnumSpecifier": S.OfObject, "DecltypeSpecifier": S.OfObject,
                  "PlaceholderTypeSpecifier": S.OfObject, "IdDeclarator": S.OfObject, "PackDeclarator": S.OfObject,
                  "PointerDeclarator": S.OfObject, "ReferenceDeclarator": S.OfObject, "ArrayDeclarator": S.OfObject,
                  "FunctionDeclarator": S.OfObject, "ParenthesizedDeclarator": S.OfObject,
                  "ParameterDeclaration": S.OfObject, "EllipsisParameter": S.OfObject, "TypeParameter": S.OfObject,
                  "TemplateTemplateParameter": S.OfObject, "NoexceptSpecifier": S.OfObject,
                  "ThrowSpecifier": S.OfObject, "StandardAttributeSpecifier": S.OfObject, "Attribute": S.OfObject,
                  "AlignasSpecifier": S.OfObject, "GnuAttributeSpecifier": S.OfObject,
                  "DeclspecSpecifier": S.OfObject,
                  # Cpp Types' `Term` and its `typeid`, by name; FrameworkTerm: the framework's, by name
                  "TypesTerm": S.OfUnion, "TypeId": S.OfObject,
                  "bool": S.OfAny, "int8_t": S.OfAny, "int16_t": S.OfAny, "int32_t": S.OfAny, "int64_t": S.OfAny,
                  "uint8_t": S.OfAny, "uint16_t": S.OfAny, "uint32_t": S.OfAny, "uint64_t": S.OfAny,
                  "std_float16_t": S.OfAny, "std_float32_t": S.OfAny, "std_float64_t": S.OfAny,
                  "std_float128_t": S.OfAny, "std_bfloat16_t": S.OfAny})  # its domains' schemas
        .spec([
            # its dialect: the singleton `Expressions.Cpp.Expressions`, a branch of the framework's union of dialects
            lambda _: _.Dialect.name("Expressions.Cpp.Expressions.Dialect").ref(True)
                .singleton("Expressions.Cpp.Expressions").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("cpp").schema([_.Dialect])]),
            # its union of its kinds: its own, the framework's it reuses, a type name, an initializer list's
            # designated items, and invalid syntax
            lambda _: _.Term.name("Expressions.Cpp.Expressions.Term").branches([
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("constant").schema([_.Constant]),
                lambda t: t.name("userdefinedliteral").schema([_.UserDefinedLiteral]),
                lambda t: t.name("concatenatedstring").schema([_.ConcatenatedString]),
                lambda t: t.name("idexpression").schema([_.IdExpression]),
                lambda t: t.name("thisexpression").schema([_.ThisExpression]),
                lambda t: t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
                lambda t: t.name("lambdaexpression").schema([_.LambdaExpression]),
                lambda t: t.name("foldexpression").schema([_.FoldExpression]),
                lambda t: t.name("requiresexpression").schema([_.RequiresExpression]),
                lambda t: t.name("subscriptexpression").schema([_.SubscriptExpression]),
                lambda t: t.name("callexpression").schema([_.CallExpression]),
                lambda t: t.name("functionalcastexpression").schema([_.FunctionalCastExpression]),
                lambda t: t.name("memberexpression").schema([_.MemberExpression]),
                lambda t: t.name("postfixexpression").schema([_.PostfixExpression]),
                lambda t: t.name("namedcastexpression").schema([_.NamedCastExpression]),
                lambda t: t.name("typeidexpression").schema([_.TypeidExpression]),
                lambda t: t.name("unaryexpression").schema([_.UnaryExpression]),
                lambda t: t.name("awaitexpression").schema([_.AwaitExpression]),
                lambda t: t.name("sizeofexpression").schema([_.SizeofExpression]),
                lambda t: t.name("sizeofpackexpression").schema([_.SizeofPackExpression]),
                lambda t: t.name("alignofexpression").schema([_.AlignofExpression]),
                lambda t: t.name("noexceptexpression").schema([_.NoexceptExpression]),
                lambda t: t.name("newexpression").schema([_.NewExpression]),
                lambda t: t.name("deleteexpression").schema([_.DeleteExpression]),
                lambda t: t.name("castexpression").schema([_.CastExpression]),
                lambda t: t.name("binaryexpression").schema([_.BinaryExpression]),
                lambda t: t.name("conditionalexpression").schema([_.ConditionalExpression]),
                lambda t: t.name("assignmentexpression").schema([_.AssignmentExpression]),
                lambda t: t.name("throwexpression").schema([_.ThrowExpression]),
                lambda t: t.name("yieldexpression").schema([_.YieldExpression]),
                lambda t: t.name("packexpansion").schema([_.PackExpansion]),
                lambda t: t.name("initializerlist").schema([_.InitializerList]),
                lambda t: t.name("designatedinitializer").schema([_.DesignatedInitializer]),
                lambda t: t.name("statementexpression").schema([_.StatementExpression]),
                lambda t: t.name("extensionexpression").schema([_.ExtensionExpression]),
                lambda t: t.name("typeid").schema([_.TypeId]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its binding targets: an init capture's name, an identifier, and invalid syntax ("(ii)")
            lambda _: _.Pattern.name("Expressions.Cpp.Expressions.Pattern").branches([
                lambda t: t.name("identifier").schema([_.Identifier]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # names, and the decltype a name's place holds (mbse-programs' `Name`)
            lambda _: _.Name.name("Expressions.Cpp.Expressions.Name").branches([
                lambda t: t.name("identifier").schema([_.Identifier]),
                lambda t: t.name("operatorname").schema([_.OperatorName]),
                lambda t: t.name("conversionname").schema([_.ConversionName]),
                lambda t: t.name("literaloperatorname").schema([_.LiteralOperatorName]),
                lambda t: t.name("destructorname").schema([_.DestructorName]),
                lambda t: t.name("templateid").schema([_.TemplateId]),
                lambda t: t.name("qualifiedname").schema([_.QualifiedName]),
                lambda t: t.name("decltypespecifier").schema([_.DecltypeSpecifier]),
            ]),
            lambda _: _.Capture.name("Expressions.Cpp.Expressions.Capture").branches([
                lambda t: t.name("defaultcapture").schema([_.DefaultCapture]),
                lambda t: t.name("simplecapture").schema([_.SimpleCapture]),
                lambda t: t.name("thiscapture").schema([_.ThisCapture]),
                lambda t: t.name("initcapture").schema([_.InitCapture]),
            ]),
            lambda _: _.Requirement.name("Expressions.Cpp.Expressions.Requirement").branches([
                lambda t: t.name("simplerequirement").schema([_.SimpleRequirement]),
                lambda t: t.name("typerequirement").schema([_.TypeRequirement]),
                lambda t: t.name("compoundrequirement").schema([_.CompoundRequirement]),
                lambda t: t.name("nestedrequirement").schema([_.NestedRequirement]),
            ]),
            lambda _: _.Designator.name("Expressions.Cpp.Expressions.Designator").branches([
                lambda t: t.name("fielddesignator").schema([_.FieldDesignator]),
            ]),
            lambda _: _.Initializer.name("Expressions.Cpp.Expressions.Initializer").branches([
                lambda t: t.name("equalinitializer").schema([_.EqualInitializer]),
                lambda t: t.name("parenthesizedinitializer").schema([_.ParenthesizedInitializer]),
                lambda t: t.name("initializerlist").schema([_.InitializerList]),
            ]),
            # a type name's specifiers, the attribute specifiers among them (mbse-programs' `Specifier`)
            lambda _: _.Specifier.name("Expressions.Cpp.Expressions.Specifier").branches([
                lambda t: t.name("declspecifier").schema([_.DeclSpecifier]),
                lambda t: t.name("cvqualifier").schema([_.CvQualifier]),
                lambda t: t.name("primitivetypespecifier").schema([_.PrimitiveTypeSpecifier]),
                lambda t: t.name("namedtypespecifier").schema([_.NamedTypeSpecifier]),
                lambda t: t.name("typenamespecifier").schema([_.TypenameSpecifier]),
                lambda t: t.name("classspecifier").schema([_.ClassSpecifier]),
                lambda t: t.name("enumspecifier").schema([_.EnumSpecifier]),
                lambda t: t.name("decltypespecifier").schema([_.DecltypeSpecifier]),
                lambda t: t.name("placeholdertypespecifier").schema([_.PlaceholderTypeSpecifier]),
                lambda t: t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
                lambda t: t.name("alignasspecifier").schema([_.AlignasSpecifier]),
                lambda t: t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
                lambda t: t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
            ]),
            lambda _: _.Declarator.name("Expressions.Cpp.Expressions.Declarator").branches([
                lambda t: t.name("iddeclarator").schema([_.IdDeclarator]),
                lambda t: t.name("packdeclarator").schema([_.PackDeclarator]),
                lambda t: t.name("pointerdeclarator").schema([_.PointerDeclarator]),
                lambda t: t.name("referencedeclarator").schema([_.ReferenceDeclarator]),
                lambda t: t.name("arraydeclarator").schema([_.ArrayDeclarator]),
                lambda t: t.name("functiondeclarator").schema([_.FunctionDeclarator]),
                lambda t: t.name("parenthesizeddeclarator").schema([_.ParenthesizedDeclarator]),
            ]),
            lambda _: _.Parameter.name("Expressions.Cpp.Expressions.Parameter").branches([
                lambda t: t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
                lambda t: t.name("ellipsisparameter").schema([_.EllipsisParameter]),
            ]),
            lambda _: _.TemplateParameter.name("Expressions.Cpp.Expressions.TemplateParameter").branches([
                lambda t: t.name("typeparameter").schema([_.TypeParameter]),
                lambda t: t.name("templatetemplateparameter").schema([_.TemplateTemplateParameter]),
                lambda t: t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
            ]),
            lambda _: _.ExceptionSpecification.name("Expressions.Cpp.Expressions.ExceptionSpecification").branches([
                lambda t: t.name("noexceptspecifier").schema([_.NoexceptSpecifier]),
                lambda t: t.name("throwspecifier").schema([_.ThrowSpecifier]),
            ]),
            lambda _: _.AttributeSpecifier.name("Expressions.Cpp.Expressions.AttributeSpecifier").branches([
                lambda t: t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
                lambda t: t.name("alignasspecifier").schema([_.AlignasSpecifier]),
                lambda t: t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
                lambda t: t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
            ]),
            # literals
            lambda _: _.Literal.name("Expressions.Cpp.Expressions.Literal").refines([Framework.Literal]).properties({
                "prefix": S.OfStr,  # a character's or a string's encoding: `L`, `u8`, `u` or `U`
                "quote": S.OfStr,  # `'` for a character, whose value is its code, or `"` for a string
                "raw": S.OfBool,  # whether a string is raw, `R"delimiter(...)delimiter"`
                "delimiter": S.OfStr,  # a raw string's delimiter, as written
                "base": S.OfInt,  # an integer's base: 2, 8, 10 or 16
                "separators": S.OfBool,  # whether `'` groups its digits
                "suffix": S.OfStr,  # an integer's or a floating literal's suffix, as written: `u`, `ULL`, `f`
            }),
            lambda _: _.Constant.name("Expressions.Cpp.Expressions.Constant").properties({
                "singleton": S.OfStr,  # `nullptr`
                "text": S.OfStr,  # its spelling, unvalidated
                "problems": many(S.OfStr),  # what is wrong with it
            }),
            lambda _: _.UserDefinedLiteral.name("Expressions.Cpp.Expressions.UserDefinedLiteral").properties({
                "literal": _.Literal, "suffix": S.OfStr}),
            lambda _: _.ConcatenatedString.name("Expressions.Cpp.Expressions.ConcatenatedString").properties({
                "parts": many(_.Term)}),
            # primary expressions
            lambda _: _.IdExpression.name("Expressions.Cpp.Expressions.IdExpression").properties({"name": _.Name}),
            lambda _: _.ThisExpression.name("Expressions.Cpp.Expressions.ThisExpression"),
            lambda _: _.ParenthesizedExpression.name("Expressions.Cpp.Expressions.ParenthesizedExpression").properties({
                "expression": _.Term}),
            # binders: `Let`, Let's `name`, `value` and `body` unset (a body of statements is not part of the term), its
            # scopes saying what it binds
            lambda _: _.LambdaExpression.name("Expressions.Cpp.Expressions.LambdaExpression").refines([Framework.Let]).properties({
                "captures": many(_.Capture), "template_parameters": many(_.TemplateParameter),
                "template_requires": _.Term, "attributes": many(_.AttributeSpecifier),
                "declarator": _.LambdaDeclarator}),  # its body of statements is not part of the term
            lambda _: _.LambdaDeclarator.name("Expressions.Cpp.Expressions.LambdaDeclarator").properties({
                "parameters": many(_.Parameter), "specifiers": many(_.Specifier),
                "exception": _.ExceptionSpecification, "attributes": many(_.AttributeSpecifier),
                "trailing_return": _.TypesTerm, "requires": _.Term}),
            lambda _: _.DefaultCapture.name("Expressions.Cpp.Expressions.DefaultCapture").properties({"mode": S.OfStr}),
            lambda _: _.SimpleCapture.name("Expressions.Cpp.Expressions.SimpleCapture").properties({
                "by_reference": S.OfBool, "name": _.Identifier, "pack": S.OfBool}),
            lambda _: _.ThisCapture.name("Expressions.Cpp.Expressions.ThisCapture").properties({"copy": S.OfBool}),
            lambda _: _.InitCapture.name("Expressions.Cpp.Expressions.InitCapture").properties({
                "by_reference": S.OfBool, "pack": S.OfBool, "name": _.Pattern, "initializer": _.Initializer}),
            lambda _: _.FoldExpression.name("Expressions.Cpp.Expressions.FoldExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.RequiresExpression.name("Expressions.Cpp.Expressions.RequiresExpression").refines([Framework.Let]).properties({
                "parameters": many(_.Parameter), "requirements": many(_.Requirement)}),
            lambda _: _.SimpleRequirement.name("Expressions.Cpp.Expressions.SimpleRequirement")
                .properties({"expression": _.Term}),
            lambda _: _.TypeRequirement.name("Expressions.Cpp.Expressions.TypeRequirement")
                .properties({"name": _.Name}),
            lambda _: _.CompoundRequirement.name("Expressions.Cpp.Expressions.CompoundRequirement").properties({
                "expression": _.Term, "noexcept": S.OfBool, "return_type": _.Name}),
            lambda _: _.NestedRequirement.name("Expressions.Cpp.Expressions.NestedRequirement").properties({
                "constraint": _.Term}),
            # postfix expressions
            lambda _: _.SubscriptExpression.name("Expressions.Cpp.Expressions.SubscriptExpression").properties({
                "object": _.Term, "indices": many(_.Term)}),
            lambda _: _.CallExpression.name("Expressions.Cpp.Expressions.CallExpression").properties({
                "function": _.Term, "arguments": many(_.Term)}),
            lambda _: _.FunctionalCastExpression.name("Expressions.Cpp.Expressions.FunctionalCastExpression")
                .properties({
                "type": _.Specifier, "initializer": _.Initializer}),
            lambda _: _.MemberExpression.name("Expressions.Cpp.Expressions.MemberExpression").properties({
                "object": _.Term, "operator": S.OfStr, "template_keyword": S.OfBool, "member": _.Name}),
            lambda _: _.PostfixExpression.name("Expressions.Cpp.Expressions.PostfixExpression").properties({
                "operand": _.Term, "operator": S.OfStr}),
            lambda _: _.NamedCastExpression.name("Expressions.Cpp.Expressions.NamedCastExpression").properties({
                "operator": S.OfStr, "type": _.TypesTerm, "operand": _.Term}),
            lambda _: _.TypeidExpression.name("Expressions.Cpp.Expressions.TypeidExpression")
                .properties({"operand": _.Term}),
            # unary expressions
            lambda _: _.UnaryExpression.name("Expressions.Cpp.Expressions.UnaryExpression").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.AwaitExpression.name("Expressions.Cpp.Expressions.AwaitExpression")
                .properties({"operand": _.Term}),
            lambda _: _.SizeofExpression.name("Expressions.Cpp.Expressions.SizeofExpression")
                .properties({"operand": _.Term}),
            lambda _: _.SizeofPackExpression.name("Expressions.Cpp.Expressions.SizeofPackExpression").properties({
                "pack": _.Identifier}),
            lambda _: _.AlignofExpression.name("Expressions.Cpp.Expressions.AlignofExpression").properties({
                "keyword": S.OfStr, "operand": _.Term}),
            lambda _: _.NoexceptExpression.name("Expressions.Cpp.Expressions.NoexceptExpression")
                .properties({"operand": _.Term}),
            lambda _: _.NewExpression.name("Expressions.Cpp.Expressions.NewExpression").properties({
                "global_scope": S.OfBool, "placement": many(_.Term), "parenthesized_type": S.OfBool, "type": _.TypesTerm,
                "initializer": _.Initializer}),
            lambda _: _.DeleteExpression.name("Expressions.Cpp.Expressions.DeleteExpression").properties({
                "global_scope": S.OfBool, "array": S.OfBool, "operand": _.Term}),
            # other expressions
            lambda _: _.CastExpression.name("Expressions.Cpp.Expressions.CastExpression").properties({
                "type": _.TypesTerm, "operand": _.Term}),
            lambda _: _.BinaryExpression.name("Expressions.Cpp.Expressions.BinaryExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.ConditionalExpression.name("Expressions.Cpp.Expressions.ConditionalExpression").properties({
                "condition": _.Term, "consequence": _.Term, "alternative": _.Term}),
            lambda _: _.AssignmentExpression.name("Expressions.Cpp.Expressions.AssignmentExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.ThrowExpression.name("Expressions.Cpp.Expressions.ThrowExpression")
                .properties({"operand": _.Term}),
            lambda _: _.YieldExpression.name("Expressions.Cpp.Expressions.YieldExpression")
                .properties({"operand": _.Term}),
            lambda _: _.PackExpansion.name("Expressions.Cpp.Expressions.PackExpansion").properties({"pattern": _.Term}),
            # initializers
            lambda _: _.InitializerList.name("Expressions.Cpp.Expressions.InitializerList").properties({
                "items": many(_.Term), "trailing_comma": S.OfBool}),
            lambda _: _.DesignatedInitializer.name("Expressions.Cpp.Expressions.DesignatedInitializer").properties({
                "designators": many(_.Designator), "initializer": _.Initializer}),
            lambda _: _.FieldDesignator.name("Expressions.Cpp.Expressions.FieldDesignator")
                .properties({"name": _.Identifier}),
            lambda _: _.EqualInitializer.name("Expressions.Cpp.Expressions.EqualInitializer")
                .properties({"value": _.Term}),
            lambda _: _.ParenthesizedInitializer.name("Expressions.Cpp.Expressions.ParenthesizedInitializer")
                .properties({
                "arguments": many(_.Term)}),
            # GNU's extensions: a statement expression's body of statements is not part of the term
            lambda _: _.StatementExpression.name("Expressions.Cpp.Expressions.StatementExpression"),
            lambda _: _.ExtensionExpression.name("Expressions.Cpp.Expressions.ExtensionExpression").properties({
                "operand": _.Term}),
            # names
            lambda _: _.Identifier.name("Expressions.Cpp.Expressions.Identifier").properties({"spelling": S.OfStr}),
            lambda _: _.OperatorName.name("Expressions.Cpp.Expressions.OperatorName").properties({"operator": S.OfStr}),
            lambda _: _.ConversionName.name("Expressions.Cpp.Expressions.ConversionName").properties({"type": _.TypesTerm}),
            lambda _: _.LiteralOperatorName.name("Expressions.Cpp.Expressions.LiteralOperatorName").properties({
                "suffix": S.OfStr}),
            lambda _: _.DestructorName.name("Expressions.Cpp.Expressions.DestructorName").properties({"type": _.Name}),
            lambda _: _.TemplateId.name("Expressions.Cpp.Expressions.TemplateId").properties({
                "template_keyword": S.OfBool, "name": _.Name, "arguments": many(_.Term)}),
            lambda _: _.QualifiedName.name("Expressions.Cpp.Expressions.QualifiedName").properties({
                "global_scope": S.OfBool, "qualifiers": many(_.Name), "name": _.Name}),
            lambda _: _.DeclSpecifier.name("Expressions.Cpp.Expressions.DeclSpecifier")
                .properties({"keyword": S.OfStr}),
            lambda _: _.CvQualifier.name("Expressions.Cpp.Expressions.CvQualifier").properties({"keyword": S.OfStr}),
            lambda _: _.PrimitiveTypeSpecifier.name("Expressions.Cpp.Expressions.PrimitiveTypeSpecifier").properties({
                "keyword": S.OfStr}),
            lambda _: _.NamedTypeSpecifier.name("Expressions.Cpp.Expressions.NamedTypeSpecifier")
                .properties({"name": _.Name}),
            lambda _: _.TypenameSpecifier.name("Expressions.Cpp.Expressions.TypenameSpecifier")
                .properties({"name": _.Name}),
            lambda _: _.ClassSpecifier.name("Expressions.Cpp.Expressions.ClassSpecifier").properties({
                "key": S.OfStr, "attributes": many(_.AttributeSpecifier), "name": _.Name, "final": S.OfBool,
                "bases": many(_.BaseSpecifier),
                "body": S.OfBool}),  # whether it has a body, whose member declarations are not part of the term
            lambda _: _.BaseSpecifier.name("Expressions.Cpp.Expressions.BaseSpecifier").properties({
                "attributes": many(_.AttributeSpecifier), "virtual": S.OfBool, "access": S.OfStr, "type": _.Name,
                "pack": S.OfBool}),
            lambda _: _.EnumSpecifier.name("Expressions.Cpp.Expressions.EnumSpecifier").properties({
                "key": S.OfStr, "attributes": many(_.AttributeSpecifier), "name": _.Name, "base": _.TypesTerm,
                "body": S.OfBool,  # whether it has a body, `{ enumerators }`
                "enumerators": many(_.TypesTerm), "trailing_comma": S.OfBool}),  # its body's items, and `{ ..., }`
            lambda _: _.DecltypeSpecifier.name("Expressions.Cpp.Expressions.DecltypeSpecifier").properties({
                "expression": _.Term}),
            lambda _: _.PlaceholderTypeSpecifier.name("Expressions.Cpp.Expressions.PlaceholderTypeSpecifier")
                .properties({
                "constraint": _.Name, "decltype": S.OfBool}),
            lambda _: _.IdDeclarator.name("Expressions.Cpp.Expressions.IdDeclarator").properties({
                "name": _.Name, "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.PackDeclarator.name("Expressions.Cpp.Expressions.PackDeclarator")
                .properties({"declarator": _.Declarator}),
            lambda _: _.PointerDeclarator.name("Expressions.Cpp.Expressions.PointerDeclarator").properties({
                "scope": _.Name, "attributes": many(_.AttributeSpecifier), "qualifiers": many(_.CvQualifier),
                "declarator": _.Declarator}),
            lambda _: _.ReferenceDeclarator.name("Expressions.Cpp.Expressions.ReferenceDeclarator").properties({
                "rvalue": S.OfBool, "attributes": many(_.AttributeSpecifier), "declarator": _.Declarator}),
            lambda _: _.ArrayDeclarator.name("Expressions.Cpp.Expressions.ArrayDeclarator").properties({
                "declarator": _.Declarator, "size": _.Term, "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.FunctionDeclarator.name("Expressions.Cpp.Expressions.FunctionDeclarator").properties({
                "declarator": _.Declarator, "parameters": many(_.Parameter), "qualifiers": many(_.CvQualifier),
                "ref_qualifier": S.OfStr, "exception": _.ExceptionSpecification,
                "attributes": many(_.AttributeSpecifier), "trailing_return": _.TypesTerm}),
            lambda _: _.ParenthesizedDeclarator.name("Expressions.Cpp.Expressions.ParenthesizedDeclarator").properties({
                "declarator": _.Declarator}),
            lambda _: _.ParameterDeclaration.name("Expressions.Cpp.Expressions.ParameterDeclaration").properties({
                "attributes": many(_.AttributeSpecifier), "this_keyword": S.OfBool, "specifiers": many(_.Specifier),
                "declarator": _.Declarator, "default": _.Term}),
            lambda _: _.EllipsisParameter.name("Expressions.Cpp.Expressions.EllipsisParameter"),
            lambda _: _.TypeParameter.name("Expressions.Cpp.Expressions.TypeParameter").properties({
                "key": S.OfStr, "constraint": _.Name, "pack": S.OfBool, "name": _.Identifier, "default": _.TypesTerm}),
            lambda _: _.TemplateTemplateParameter.name("Expressions.Cpp.Expressions.TemplateTemplateParameter")
                .properties({
                "parameters": many(_.TemplateParameter), "requires": _.Term, "key": S.OfStr, "pack": S.OfBool,
                "name": _.Identifier, "default": _.Name}),
            lambda _: _.NoexceptSpecifier.name("Expressions.Cpp.Expressions.NoexceptSpecifier").properties({
                "condition": _.Term}),
            lambda _: _.ThrowSpecifier.name("Expressions.Cpp.Expressions.ThrowSpecifier")
                .properties({"types": many(_.Term)}),
            # attributes
            lambda _: _.StandardAttributeSpecifier.name("Expressions.Cpp.Expressions.StandardAttributeSpecifier")
                .properties({
                "using_namespace": S.OfStr, "attributes": many(_.Attribute)}),
            lambda _: _.Attribute.name("Expressions.Cpp.Expressions.Attribute").properties({
                "namespace": S.OfStr, "name": S.OfStr, "arguments": many(_.Term), "pack": S.OfBool}),
            lambda _: _.AlignasSpecifier.name("Expressions.Cpp.Expressions.AlignasSpecifier").properties({
                "keyword": S.OfStr, "operand": _.Term, "pack": S.OfBool}),
            lambda _: _.GnuAttributeSpecifier.name("Expressions.Cpp.Expressions.GnuAttributeSpecifier").properties({
                "keyword": S.OfStr, "attributes": many(_.Attribute)}),
            lambda _: _.DeclspecSpecifier.name("Expressions.Cpp.Expressions.DeclspecSpecifier").properties({
                "attributes": many(_.Attribute)}),
            # a type name, Cpp Types' kind, which `Term` lists for the positions that hold an expression or a type
            # alike, and Cpp Types' `Term`, which every position of a type holds: each by name, created where Cpp
            # Types' install has not run
            lambda _: _.TypeId.name("Expressions.Cpp.Types.TypeId"),
            lambda _: _.TypesTerm.name("Expressions.Cpp.Types.Term"),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.Cpp.Expressions.Expression").ref(True)
                .refines([Framework.Expression]).properties({
                "root": _.Term}),
            # --- its kind of domain: the token of `nullptr`, its own, not C's; inferred `ordered` ---
            lambda _: _.OfNullptr.name("Expressions.Cpp.Expressions.OfNullptr").properties({"ordered": S.OfBool}),
            lambda _: _.DomainKind.name("Expressions.Cpp.Expressions.DomainKind").branches([
                lambda t: t.name("nullptr_t").schema([_.OfNullptr]),
            ]),
            lambda _: _.Kinds.name("Expressions.Framework.DomainKind").branches([  # a branch added: schema extension
                lambda t: t.name("cpp").schema([_.DomainKind])]),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("cpp").schema([_.Term])]),
            # --- its domains' schemas, each an OfAny of the scalar it narrows (a format whose values are text, `str`),
            # named as a dotted identifier spells its type (`std::float16_t` as `std_float16_t`), which `define`
            # relates to its domain; `nullptr_t`'s has none ---
            lambda _: _.bool.name("Expressions.Cpp.Expressions.bool").schemas([S.OfBool]),
            lambda _: _.int8_t.name("Expressions.Cpp.Expressions.int8_t").schemas([S.OfInt]),
            lambda _: _.int16_t.name("Expressions.Cpp.Expressions.int16_t").schemas([S.OfInt]),
            lambda _: _.int32_t.name("Expressions.Cpp.Expressions.int32_t").schemas([S.OfInt]),
            lambda _: _.int64_t.name("Expressions.Cpp.Expressions.int64_t").schemas([S.OfInt]),
            lambda _: _.uint8_t.name("Expressions.Cpp.Expressions.uint8_t").schemas([S.OfInt]),
            lambda _: _.uint16_t.name("Expressions.Cpp.Expressions.uint16_t").schemas([S.OfInt]),
            lambda _: _.uint32_t.name("Expressions.Cpp.Expressions.uint32_t").schemas([S.OfInt]),
            lambda _: _.uint64_t.name("Expressions.Cpp.Expressions.uint64_t").schemas([S.OfInt]),
            lambda _: _.std_float16_t.name("Expressions.Cpp.Expressions.std_float16_t").schemas([S.OfFloat]),
            lambda _: _.std_float32_t.name("Expressions.Cpp.Expressions.std_float32_t").schemas([S.OfFloat]),
            lambda _: _.std_float64_t.name("Expressions.Cpp.Expressions.std_float64_t").schemas([S.OfFloat]),
            lambda _: _.std_float128_t.name("Expressions.Cpp.Expressions.std_float128_t").schemas([S.OfStr]),
            lambda _: _.std_bfloat16_t.name("Expressions.Cpp.Expressions.std_bfloat16_t").schemas([S.OfStr]),
        ])]))])


def define(txn: Any) -> Any:
    """C++'s dialect as data: the singleton `Expressions.Cpp.Expressions` owning its domains by name (`domains`, through
    `Expressions.Framework.Defines`), the types C++'s standard fixes, each with its parameters and its inferred
    properties, and each but `nullptr_t`'s related to its schema (`Expressions.Cpp.Expressions.std_float16_t`) by
    `Expressions.Framework.HasDomain`: `bool` (11404's `boolean`); `int8_t` to `int64_t` and `uint8_t` to `uint64_t`,
    as C's (C++'s `<cstdint>` is C's, under C's names); C++23's `std::float16_t`, `std::float32_t`, `std::float64_t`
    and `std::float128_t` (IEEE 754's `binary16` to `binary128`) and `std::bfloat16_t` (IEEE 754's kind with no
    format: 16 bits, radix 2, precision 8, emax 127), each rounding ties to even; and `nullptr_t`, of C++'s own kind.
    What C++ leaves to the implementation is each ABI dialect's, as C's is. And the editions of C++ it covers, by
    designation (`standards`, through `Expressions.Framework.Covers`), each with its formal reference's parts, its
    common name and the kinds it has. Run after `install`, in a transaction of its own; run again, it writes nothing.
    Its frame binds the dialect (`dialect`), each edition by its common name spelled as an identifier (`C++17` as
    `Cpp17`) and each domain by its name, spelled as its schema's is:
    `store.transaction(Cpp.define)[0]["std_bfloat16_t"]`."""
    OWN, Domain = txn.Expressions.Cpp.Expressions, txn.Expressions.Framework.Domain
    Standard = txn.Expressions.Framework.Standard
    every = {branch.name: branch.schema for branch in OWN.Term.as_schema().branches  # each of its own kinds' schema,
             if branch.name in _TAGS and branch.name not in EXTENSIONS}  # by its tag, but an extension
    return txn.uid("mbse.Expressions.Cpp.Expressions.define/1").mutations([lambda mu: mu.upsert(
        lambda u: u.exists([lambda p: p
        .symbols({"dialect": OWN.Dialect, "Cpp17": Standard, "Cpp20": Standard, "Cpp23": Standard,
                  "bool": Domain, "int8_t": Domain, "int16_t": Domain, "int32_t": Domain, "int64_t": Domain,
                  "uint8_t": Domain, "uint16_t": Domain, "uint32_t": Domain, "uint64_t": Domain,
                  "std_float16_t": Domain, "std_float32_t": Domain, "std_float64_t": Domain, "std_float128_t": Domain,
                  "std_bfloat16_t": Domain, "nullptr_t": Domain})
        .spec([
            # --- the editions C++ covers, each by its designation, with the kinds it has: every kind but GNU's
            # extensions and invalid syntax, C++20's own in C++20 and C++23 alone ---
            lambda _: _.dialect.standards({
                "ISO/IEC 14882:2017": lambda e: e.standard(_.Cpp17),
                "ISO/IEC 14882:2020": lambda e: e.standard(_.Cpp20),
                "ISO/IEC 14882:2024": lambda e: e.standard(_.Cpp23)}),
            lambda _: _.Cpp17.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2017)).names(
                ["C++17"]).kinds([schema for tag, schema in every.items() if tag not in _SINCE_20]),
            lambda _: _.Cpp20.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2020)).names(
                ["C++20"]).kinds(list(every.values())),
            lambda _: _.Cpp23.bodies(["org.iso", "ch.iec"]).number("14882").revision(lambda r: r.year(2024)).names(
                ["C++23"]).kinds(list(every.values())),
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
                "std::float16_t": lambda e: e.domain(_.std_float16_t),
                "std::float32_t": lambda e: e.domain(_.std_float32_t),
                "std::float64_t": lambda e: e.domain(_.std_float64_t),
                "std::float128_t": lambda e: e.domain(_.std_float128_t),
                "std::bfloat16_t": lambda e: e.domain(_.std_bfloat16_t),
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
            lambda _: _.std_float16_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary16").rounding("roundTiesToEven").width(16)
                    .radix(2).precision(11).emax(15).ordered(True)))))).schema([OWN.std_float16_t]),
            lambda _: _.std_float32_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary32").rounding("roundTiesToEven").width(32)
                    .radix(2).precision(24).emax(127).ordered(True)))))).schema([OWN.std_float32_t]),
            lambda _: _.std_float64_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64)
                    .radix(2).precision(53).emax(1023).ordered(True)))))).schema([OWN.std_float64_t]),
            lambda _: _.std_float128_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary128").rounding("roundTiesToEven").width(128)
                    .radix(2).precision(113).emax(16383).ordered(True)))))).schema([OWN.std_float128_t]),
            lambda _: _.std_bfloat16_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.rounding("roundTiesToEven").width(16)
                    .radix(2).precision(8).emax(127).ordered(True)))))).schema([OWN.std_bfloat16_t]),
            lambda _: _.nullptr_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.cpp(lambda v: v.nullptr_t(
                lambda d: d.ordered(False)))))),
        ])]))])


_TAGS = (C.LITERAL, C.CONSTANT, USERDEFINEDLITERAL, C.CONCATENATEDSTRING, IDEXPRESSION, THISEXPRESSION,
         C.PARENTHESIZEDEXPRESSION, LAMBDAEXPRESSION, FOLDEXPRESSION, REQUIRESEXPRESSION, C.SUBSCRIPTEXPRESSION,
         C.CALLEXPRESSION, FUNCTIONALCASTEXPRESSION, C.MEMBEREXPRESSION, C.POSTFIXEXPRESSION, NAMEDCASTEXPRESSION,
         TYPEIDEXPRESSION, C.UNARYEXPRESSION, AWAITEXPRESSION, C.SIZEOFEXPRESSION, SIZEOFPACKEXPRESSION,
         C.ALIGNOFEXPRESSION, NOEXCEPTEXPRESSION, NEWEXPRESSION, DELETEEXPRESSION, C.CASTEXPRESSION,
         C.BINARYEXPRESSION, C.CONDITIONALEXPRESSION, C.ASSIGNMENTEXPRESSION, THROWEXPRESSION, YIELDEXPRESSION,
         PACKEXPANSION, C.INITIALIZERLIST, C.DESIGNATEDINITIALIZER, C.STATEMENTEXPRESSION, C.EXTENSIONEXPRESSION)
"""Its own kinds, in its `Term`'s order: its `Term` lists Cpp Types' `typeid` after them, and C Preprocessor's
`definedexpression` after invalid syntax, each read as the dialect that declares it reads it."""

_SINCE_20 = frozenset({REQUIRESEXPRESSION, AWAITEXPRESSION, YIELDEXPRESSION, C.DESIGNATEDINITIALIZER})
"""The kinds C++20 added: C++17 has every other kind but the extensions."""

_ANY1 = FD.Function((FD.Anything,), FD.Anything)


def _application(tag: str, signature: FD.Signature = FD.Opaque(), optional: tuple[str, ...] = (),
                 **options: Any) -> F.Kind:
    return F.Kind(F.APPLICATION, signature=signature, check=_check(tag),
                  scopes=C.scopes(tag), optional=optional + C.OPTIONAL, **options)


def _check(tag: str) -> Any:
    return lambda record: C.problems(F.node(tag, record), Domains.Types(record, "Cpp.Expressions"), SUFFIXES, PREFIXES,
                                     "C++")


_OWN = {
    USERDEFINEDLITERAL: _application(USERDEFINEDLITERAL, required=("literal", "suffix")),
    IDEXPRESSION: F.Kind(F.REFERENCE, required=("name",), check=_check(IDEXPRESSION),
                         scopes=C.scopes(IDEXPRESSION), optional=C.OPTIONAL),
    THISEXPRESSION: F.Kind(F.REFERENCE, lexical=False),
    LAMBDAEXPRESSION: _application(LAMBDAEXPRESSION, optional=("value", "body", "template_requires")),
    FOLDEXPRESSION: F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.FOLD, required=("operator",),
                           optional=("left", "right"), check=_check(FOLDEXPRESSION),
                           scopes=C.scopes(FOLDEXPRESSION)),
    REQUIRESEXPRESSION: _application(REQUIRESEXPRESSION, optional=("value", "body")),
    FUNCTIONALCASTEXPRESSION: _application(FUNCTIONALCASTEXPRESSION, required=("type", "initializer")),
    NAMEDCASTEXPRESSION: F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.CASTS,
                                required=("operator",), optional=C.OPTIONAL,
                                check=_check(NAMEDCASTEXPRESSION), scopes=C.scopes(NAMEDCASTEXPRESSION)),
    TYPEIDEXPRESSION: _application(TYPEIDEXPRESSION, FD.Opaque()),
    AWAITEXPRESSION: _application(AWAITEXPRESSION, _ANY1),
    SIZEOFPACKEXPRESSION: _application(SIZEOFPACKEXPRESSION, Domains.SIZE, required=("pack",), typed=C.size("C++")),
    NOEXCEPTEXPRESSION: _application(NOEXCEPTEXPRESSION, _ANY1, typed=C.truth("C++")),
    NEWEXPRESSION: _application(NEWEXPRESSION),
    DELETEEXPRESSION: _application(DELETEEXPRESSION, _ANY1),
    THROWEXPRESSION: _application(THROWEXPRESSION, optional=("operand",)),
    YIELDEXPRESSION: _application(YIELDEXPRESSION, _ANY1),
    PACKEXPANSION: _application(PACKEXPANSION, _ANY1),
}

_SHARED = C.kinds("C++", _TAGS, PREFIXES, SUFFIXES)


def _native(value: Any) -> Writer | None:
    """The literal of a native value: a number, a bool or a string; a bytes has none."""
    return literal(value) if type(value) in (bool, int, float, str) else None


def _reads() -> tuple[F.Dialect, ...]:
    """The dialects whose terms its positions are to hold, imported when first needed (the dialects proposal,
    Retrofit's design): `Cpp Types` and C's `C Preprocessor`, and none of C's other dialects."""
    from ...C.Preprocessor import Expressions as CPreprocessor
    from ..Types import Expressions as CppTypes
    return CppTypes.DIALECT, CPreprocessor.DIALECT


DIALECT = F.Dialect("Cpp.Expressions", {tag: _SHARED[tag] if tag in _SHARED else _OWN[tag] for tag in _TAGS},
                    domain_of=C.untyped, literal=_native, reads=_reads)
"""The Cpp dialect: its kinds, as the framework reads them, and the terms of the dialects it reads."""


class Writer(F.Writer):
    """A term of the Cpp dialect, written through the builders where it is given (a spec)."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


class _Writers(C.Writers):
    """C's writers, writing C++'s terms: a name used as an expression is an `idexpression`, holding its `Name`."""

    def identifier(self, name: str) -> Any:
        """The identifier `name` used as an expression: an `idexpression` holding it."""
        return self.writer(lambda u: u.idexpression(
            lambda r: r.name(lambda n: n.identifier(lambda i: i.spelling(name)))))


_WRITERS = _Writers(DIALECT, Writer)
literal, identifier, unary, binary = _WRITERS.literal, _WRITERS.identifier, _WRITERS.unary, _WRITERS.binary
conditional, cast, member, subscript, call = (
    _WRITERS.conditional, _WRITERS.cast, _WRITERS.member, _WRITERS.subscript, _WRITERS.call)
