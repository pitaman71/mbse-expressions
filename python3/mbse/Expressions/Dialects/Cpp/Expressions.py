"""Expressions of the Cpp dialect: every expression of C++, C++17 to C++23, as mbse-programs has them, with the
sublanguages expressions hold.

The dialect is complete over C++'s expression syntax (mbse-basis
[CAP-230: the C++ expression dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md), by
[CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules); C++26's pack indexing,
reflection, splices, annotations and contracts are outside it. Its terms are values of its `Term`,
`Expressions.Cpp.Term`, the branch `cpp` of `Expressions.Framework.Term`, which `install` defines and adds to
`Expressions.Framework.Term` by schema extension. Its kinds are mbse-programs' Ccpp expression kinds that C++ has
(`mbse:mbse-programs/python3/mbse/Programs/Ccpp/Syntax.py`), named as `C.Expressions` names them: C++ is not a superset
of C, so the two are separate dialects, each with a union of its own, and `Cpp` defines its own copy of each kind they
share (`Expressions.Cpp.BinaryExpression`), holding C++'s terms, without what only C has (an array declarator's
`static`, C's index designators, `_Generic`, compound literals, `typeof`, `_Atomic(type)`, `_BitInt`). Where
mbse-programs holds a `Name`, Cpp holds its `Name` union (`identifier`, `qualifiedname`, `templateid`,
`operatorname`, `conversionname`, `literaloperatorname`, `destructorname`, and, where a name's place holds it, a
`decltypespecifier`); where it holds an `Identifier` alone, an `Identifier`; where it holds a `str`, a `str`. A term
carries no domain. Beyond C's kinds (see `C.Expressions`), with C++'s own literal (`Expressions.Cpp.Literal`, also a
raw string's `raw` and `delimiter`) and `constant` (`nullptr`):

- `userdefinedliteral` (`literal`, a `literal`'s value object, and its `suffix`, `10_km`);
- names: `idexpression`, a name that is not an identifier used as an expression (`std::cout`, `f<int>`,
  `operator+`); `thisexpression`;
- `lambdaexpression` (`captures`, `template_parameters`, `template_requires`, `attributes`, `declarator`), whose body of
  statements is not part of the term (the dialects proposal, Decided, 5, "(i)"); `foldexpression`;
  `requiresexpression` (`parameters`, `requirements`);
- casts: `functionalcastexpression` (`T(x)`, `T{x}`), `namedcastexpression` (`static_cast<T>(x)` and its siblings),
  `typeidexpression`;
- `awaitexpression` (`co_await`), `yieldexpression` (`co_yield`), `sizeofpackexpression` (`sizeof...(pack)`),
  `noexceptexpression`, `newexpression`, `deleteexpression`, `throwexpression`, `packexpansion` (`pattern...`).

Its sublanguages are unions of their own: `Expressions.Cpp.Type`, a type name (`typeid`), and
`Expressions.Cpp.Pattern`, for binding targets ("(ii)"): no C++ expression binds a name as a target (a lambda's
captures and parameters, a requires expression's parameters, are declarations; structured bindings are not
expressions), so it holds invalid syntax alone. As the user decided ("(b)"), one schema is a branch of every union
whose positions hold it: `Term` lists `typeid` and `designatedinitializer`, as C's does, `Name` lists
`decltypespecifier`, `Specifier` the attribute specifiers, `TemplateParameter` a `parameterdeclaration` and
`Initializer` an `initializerlist`. A type name's and a lambda's parts are helpers, each union named after
mbse-programs' category: `Name`, `Specifier`, `Declarator`, `Parameter`, `TemplateParameter`, `Capture`,
`Requirement`, `Designator`, `Initializer`, `ExceptionSpecification` and `AttributeSpecifier`.

Each kind's `Kind` records the standards that have it (`standards`, `STANDARDS`'s names: C++20's kinds, `co_await`,
`co_yield`, `requires` and designated initializers, C++20 and C++23; an extension none). `DIALECT` reads them
(`Terms.Dialect`). The writers (`literal`, `identifier`, ...) are C's, writing C++'s terms:
`store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`. `Text.ToText` writes an expression as C++ source.
"""

from __future__ import annotations

import re
from typing import Any

from mbse.Expressions.Dialects.C import Domains
from mbse.Expressions.Dialects.C import Expressions as C
from mbse.Expressions.Framework import Domains as FD, Terms as F

__all__ = ["install", "DIALECT", "STANDARDS", "EXTENSIONS", "PREFIXES", "SUFFIXES", "Writer", "literal", "identifier",
           "unary", "binary", "conditional", "cast", "member", "subscript", "call"]

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

STANDARDS = ("C++17", "C++20", "C++23")
"""The standards this dialect covers, ISO/IEC 14882:2017, 2020 and 2024."""

PREFIXES = C.PREFIXES
"""A character's or a string's encoding prefixes."""

SUFFIXES = {
    int: re.compile(r"(?i:u?(?:l|ll|z)?|(?:l|ll|z)u)"),
    float: re.compile(r"[fFlL]|[fF](?:16|32|64|128)|bf16|BF16"),
}
"""The suffixes C++ writes, by the type of the literal's value: an integer's (`u`, `l`, `ll`, C++23's `z`, in either
case and order) and a floating literal's (`f`, `l`, C++23's extended types' `f16` to `f128` and `bf16`)."""


def install(txn: Any) -> Any:
    """Cpp's union of its kinds, added to the framework's terms as the branch `cpp`, its own kinds, its sublanguages'
    unions (`Type`, `Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
    `Expressions.Cpp`: run after `Framework.install`, in a transaction of its own; run again, it writes nothing.
    Its holder, `Expressions.Cpp.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
    `Term`."""
    S, Framework = txn.Schemas, txn.Expressions.Framework

    def many(element: Any) -> Any:
        return S.OfContainer(lambda c: c.index([S.OfInt]).element([element]))

    return txn.uid("mbse.Expressions.Cpp/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject, "FrameworkTerm": S.OfUnion, "Term": S.OfUnion,
                  "Type": S.OfUnion, "Pattern": S.OfUnion, "Name": S.OfUnion, "Capture": S.OfUnion,
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
                  "TypeId": S.OfObject, "DeclSpecifier": S.OfObject, "CvQualifier": S.OfObject,
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
                  "DeclspecSpecifier": S.OfObject})  # FrameworkTerm: the framework's, by name
        .spec([
            # its dialect: the singleton `Expressions.Cpp`, a branch of the framework's kind union of dialects
            lambda _: _.Dialect.name("Expressions.Cpp.Dialect").ref(True).singleton("Expressions.Cpp").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect")}),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("cpp").schema([_.Dialect])]),
            # its union of its kinds: its own, the framework's it reuses, a type name, an initializer list's
            # designated items, and invalid syntax
            lambda _: _.Term.name("Expressions.Cpp.Term").branches([
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("constant").schema([_.Constant]),
                lambda t: t.name("userdefinedliteral").schema([_.UserDefinedLiteral]),
                lambda t: t.name("concatenatedstring").schema([_.ConcatenatedString]),
                lambda t: t.name("variable").schema([Framework.Variable]),
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
            # its type names, and invalid syntax
            lambda _: _.Type.name("Expressions.Cpp.Type").branches([
                lambda t: t.name("typeid").schema([_.TypeId]),
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # its binding targets: no C++ expression binds a name as a target, so invalid syntax alone ("(ii)")
            lambda _: _.Pattern.name("Expressions.Cpp.Pattern").branches([
                lambda t: t.name("error").schema([Framework.Error]),
                lambda t: t.name("missing").schema([Framework.Missing]),
            ]),
            # names, and the decltype a name's place holds (mbse-programs' `Name`)
            lambda _: _.Name.name("Expressions.Cpp.Name").branches([
                lambda t: t.name("identifier").schema([_.Identifier]),
                lambda t: t.name("operatorname").schema([_.OperatorName]),
                lambda t: t.name("conversionname").schema([_.ConversionName]),
                lambda t: t.name("literaloperatorname").schema([_.LiteralOperatorName]),
                lambda t: t.name("destructorname").schema([_.DestructorName]),
                lambda t: t.name("templateid").schema([_.TemplateId]),
                lambda t: t.name("qualifiedname").schema([_.QualifiedName]),
                lambda t: t.name("decltypespecifier").schema([_.DecltypeSpecifier]),
            ]),
            lambda _: _.Capture.name("Expressions.Cpp.Capture").branches([
                lambda t: t.name("defaultcapture").schema([_.DefaultCapture]),
                lambda t: t.name("simplecapture").schema([_.SimpleCapture]),
                lambda t: t.name("thiscapture").schema([_.ThisCapture]),
                lambda t: t.name("initcapture").schema([_.InitCapture]),
            ]),
            lambda _: _.Requirement.name("Expressions.Cpp.Requirement").branches([
                lambda t: t.name("simplerequirement").schema([_.SimpleRequirement]),
                lambda t: t.name("typerequirement").schema([_.TypeRequirement]),
                lambda t: t.name("compoundrequirement").schema([_.CompoundRequirement]),
                lambda t: t.name("nestedrequirement").schema([_.NestedRequirement]),
            ]),
            lambda _: _.Designator.name("Expressions.Cpp.Designator").branches([
                lambda t: t.name("fielddesignator").schema([_.FieldDesignator]),
            ]),
            lambda _: _.Initializer.name("Expressions.Cpp.Initializer").branches([
                lambda t: t.name("equalinitializer").schema([_.EqualInitializer]),
                lambda t: t.name("parenthesizedinitializer").schema([_.ParenthesizedInitializer]),
                lambda t: t.name("initializerlist").schema([_.InitializerList]),
            ]),
            # a type name's specifiers, the attribute specifiers among them (mbse-programs' `Specifier`)
            lambda _: _.Specifier.name("Expressions.Cpp.Specifier").branches([
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
            lambda _: _.Declarator.name("Expressions.Cpp.Declarator").branches([
                lambda t: t.name("iddeclarator").schema([_.IdDeclarator]),
                lambda t: t.name("packdeclarator").schema([_.PackDeclarator]),
                lambda t: t.name("pointerdeclarator").schema([_.PointerDeclarator]),
                lambda t: t.name("referencedeclarator").schema([_.ReferenceDeclarator]),
                lambda t: t.name("arraydeclarator").schema([_.ArrayDeclarator]),
                lambda t: t.name("functiondeclarator").schema([_.FunctionDeclarator]),
                lambda t: t.name("parenthesizeddeclarator").schema([_.ParenthesizedDeclarator]),
            ]),
            lambda _: _.Parameter.name("Expressions.Cpp.Parameter").branches([
                lambda t: t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
                lambda t: t.name("ellipsisparameter").schema([_.EllipsisParameter]),
            ]),
            lambda _: _.TemplateParameter.name("Expressions.Cpp.TemplateParameter").branches([
                lambda t: t.name("typeparameter").schema([_.TypeParameter]),
                lambda t: t.name("templatetemplateparameter").schema([_.TemplateTemplateParameter]),
                lambda t: t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
            ]),
            lambda _: _.ExceptionSpecification.name("Expressions.Cpp.ExceptionSpecification").branches([
                lambda t: t.name("noexceptspecifier").schema([_.NoexceptSpecifier]),
                lambda t: t.name("throwspecifier").schema([_.ThrowSpecifier]),
            ]),
            lambda _: _.AttributeSpecifier.name("Expressions.Cpp.AttributeSpecifier").branches([
                lambda t: t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
                lambda t: t.name("alignasspecifier").schema([_.AlignasSpecifier]),
                lambda t: t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
                lambda t: t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
            ]),
            # literals
            lambda _: _.Literal.name("Expressions.Cpp.Literal").refines([Framework.Literal]).properties({
                "prefix": S.OfStr,  # a character's or a string's encoding: `L`, `u8`, `u` or `U`
                "quote": S.OfStr,  # `'` for a character, whose value is its code, or `"` for a string
                "raw": S.OfBool,  # whether a string is raw, `R"delimiter(...)delimiter"`
                "delimiter": S.OfStr,  # a raw string's delimiter, as written
                "base": S.OfInt,  # an integer's base: 2, 8, 10 or 16
                "separators": S.OfBool,  # whether `'` groups its digits
                "suffix": S.OfStr,  # an integer's or a floating literal's suffix, as written: `u`, `ULL`, `f`
            }),
            lambda _: _.Constant.name("Expressions.Cpp.Constant").properties({
                "singleton": S.OfStr,  # `nullptr`
                "text": S.OfStr,  # its spelling, unvalidated
                "problems": many(S.OfStr),  # what is wrong with it
            }),
            lambda _: _.UserDefinedLiteral.name("Expressions.Cpp.UserDefinedLiteral").properties({
                "literal": _.Literal, "suffix": S.OfStr}),
            lambda _: _.ConcatenatedString.name("Expressions.Cpp.ConcatenatedString").properties({
                "parts": many(_.Term)}),
            # primary expressions
            lambda _: _.IdExpression.name("Expressions.Cpp.IdExpression").properties({"name": _.Name}),
            lambda _: _.ThisExpression.name("Expressions.Cpp.ThisExpression"),
            lambda _: _.ParenthesizedExpression.name("Expressions.Cpp.ParenthesizedExpression").properties({
                "expression": _.Term}),
            lambda _: _.LambdaExpression.name("Expressions.Cpp.LambdaExpression").properties({
                "captures": many(_.Capture), "template_parameters": many(_.TemplateParameter),
                "template_requires": _.Term, "attributes": many(_.AttributeSpecifier),
                "declarator": _.LambdaDeclarator}),  # its body of statements is not part of the term
            lambda _: _.LambdaDeclarator.name("Expressions.Cpp.LambdaDeclarator").properties({
                "parameters": many(_.Parameter), "specifiers": many(_.Specifier),
                "exception": _.ExceptionSpecification, "attributes": many(_.AttributeSpecifier),
                "trailing_return": _.Type, "requires": _.Term}),
            lambda _: _.DefaultCapture.name("Expressions.Cpp.DefaultCapture").properties({"mode": S.OfStr}),
            lambda _: _.SimpleCapture.name("Expressions.Cpp.SimpleCapture").properties({
                "by_reference": S.OfBool, "name": _.Identifier, "pack": S.OfBool}),
            lambda _: _.ThisCapture.name("Expressions.Cpp.ThisCapture").properties({"copy": S.OfBool}),
            lambda _: _.InitCapture.name("Expressions.Cpp.InitCapture").properties({
                "by_reference": S.OfBool, "pack": S.OfBool, "name": _.Identifier, "initializer": _.Initializer}),
            lambda _: _.FoldExpression.name("Expressions.Cpp.FoldExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.RequiresExpression.name("Expressions.Cpp.RequiresExpression").properties({
                "parameters": many(_.Parameter), "requirements": many(_.Requirement)}),
            lambda _: _.SimpleRequirement.name("Expressions.Cpp.SimpleRequirement").properties({"expression": _.Term}),
            lambda _: _.TypeRequirement.name("Expressions.Cpp.TypeRequirement").properties({"name": _.Name}),
            lambda _: _.CompoundRequirement.name("Expressions.Cpp.CompoundRequirement").properties({
                "expression": _.Term, "noexcept": S.OfBool, "return_type": _.Name}),
            lambda _: _.NestedRequirement.name("Expressions.Cpp.NestedRequirement").properties({
                "constraint": _.Term}),
            # postfix expressions
            lambda _: _.SubscriptExpression.name("Expressions.Cpp.SubscriptExpression").properties({
                "object": _.Term, "indices": many(_.Term)}),
            lambda _: _.CallExpression.name("Expressions.Cpp.CallExpression").properties({
                "function": _.Term, "arguments": many(_.Term)}),
            lambda _: _.FunctionalCastExpression.name("Expressions.Cpp.FunctionalCastExpression").properties({
                "type": _.Specifier, "initializer": _.Initializer}),
            lambda _: _.MemberExpression.name("Expressions.Cpp.MemberExpression").properties({
                "object": _.Term, "operator": S.OfStr, "template_keyword": S.OfBool, "member": _.Name}),
            lambda _: _.PostfixExpression.name("Expressions.Cpp.PostfixExpression").properties({
                "operand": _.Term, "operator": S.OfStr}),
            lambda _: _.NamedCastExpression.name("Expressions.Cpp.NamedCastExpression").properties({
                "operator": S.OfStr, "type": _.Type, "operand": _.Term}),
            lambda _: _.TypeidExpression.name("Expressions.Cpp.TypeidExpression").properties({"operand": _.Term}),
            # unary expressions
            lambda _: _.UnaryExpression.name("Expressions.Cpp.UnaryExpression").properties({
                "operator": S.OfStr, "operand": _.Term}),
            lambda _: _.AwaitExpression.name("Expressions.Cpp.AwaitExpression").properties({"operand": _.Term}),
            lambda _: _.SizeofExpression.name("Expressions.Cpp.SizeofExpression").properties({"operand": _.Term}),
            lambda _: _.SizeofPackExpression.name("Expressions.Cpp.SizeofPackExpression").properties({
                "pack": _.Identifier}),
            lambda _: _.AlignofExpression.name("Expressions.Cpp.AlignofExpression").properties({
                "keyword": S.OfStr, "operand": _.Term}),
            lambda _: _.NoexceptExpression.name("Expressions.Cpp.NoexceptExpression").properties({"operand": _.Term}),
            lambda _: _.NewExpression.name("Expressions.Cpp.NewExpression").properties({
                "global_scope": S.OfBool, "placement": many(_.Term), "parenthesized_type": S.OfBool, "type": _.Type,
                "initializer": _.Initializer}),
            lambda _: _.DeleteExpression.name("Expressions.Cpp.DeleteExpression").properties({
                "global_scope": S.OfBool, "array": S.OfBool, "operand": _.Term}),
            # other expressions
            lambda _: _.CastExpression.name("Expressions.Cpp.CastExpression").properties({
                "type": _.Type, "operand": _.Term}),
            lambda _: _.BinaryExpression.name("Expressions.Cpp.BinaryExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.ConditionalExpression.name("Expressions.Cpp.ConditionalExpression").properties({
                "condition": _.Term, "consequence": _.Term, "alternative": _.Term}),
            lambda _: _.AssignmentExpression.name("Expressions.Cpp.AssignmentExpression").properties({
                "left": _.Term, "operator": S.OfStr, "right": _.Term}),
            lambda _: _.ThrowExpression.name("Expressions.Cpp.ThrowExpression").properties({"operand": _.Term}),
            lambda _: _.YieldExpression.name("Expressions.Cpp.YieldExpression").properties({"operand": _.Term}),
            lambda _: _.PackExpansion.name("Expressions.Cpp.PackExpansion").properties({"pattern": _.Term}),
            # initializers
            lambda _: _.InitializerList.name("Expressions.Cpp.InitializerList").properties({
                "items": many(_.Term), "trailing_comma": S.OfBool}),
            lambda _: _.DesignatedInitializer.name("Expressions.Cpp.DesignatedInitializer").properties({
                "designators": many(_.Designator), "initializer": _.Initializer}),
            lambda _: _.FieldDesignator.name("Expressions.Cpp.FieldDesignator").properties({"name": _.Identifier}),
            lambda _: _.EqualInitializer.name("Expressions.Cpp.EqualInitializer").properties({"value": _.Term}),
            lambda _: _.ParenthesizedInitializer.name("Expressions.Cpp.ParenthesizedInitializer").properties({
                "arguments": many(_.Term)}),
            # GNU's extensions: a statement expression's body of statements is not part of the term
            lambda _: _.StatementExpression.name("Expressions.Cpp.StatementExpression"),
            lambda _: _.ExtensionExpression.name("Expressions.Cpp.ExtensionExpression").properties({
                "operand": _.Term}),
            # names
            lambda _: _.Identifier.name("Expressions.Cpp.Identifier").properties({"spelling": S.OfStr}),
            lambda _: _.OperatorName.name("Expressions.Cpp.OperatorName").properties({"operator": S.OfStr}),
            lambda _: _.ConversionName.name("Expressions.Cpp.ConversionName").properties({"type": _.Type}),
            lambda _: _.LiteralOperatorName.name("Expressions.Cpp.LiteralOperatorName").properties({
                "suffix": S.OfStr}),
            lambda _: _.DestructorName.name("Expressions.Cpp.DestructorName").properties({"type": _.Name}),
            lambda _: _.TemplateId.name("Expressions.Cpp.TemplateId").properties({
                "template_keyword": S.OfBool, "name": _.Name, "arguments": many(_.Term)}),
            lambda _: _.QualifiedName.name("Expressions.Cpp.QualifiedName").properties({
                "global_scope": S.OfBool, "qualifiers": many(_.Name), "name": _.Name}),
            # type names: specifiers and an abstract declarator
            lambda _: _.TypeId.name("Expressions.Cpp.TypeId").properties({
                "specifiers": many(_.Specifier), "declarator": _.Declarator}),
            lambda _: _.DeclSpecifier.name("Expressions.Cpp.DeclSpecifier").properties({"keyword": S.OfStr}),
            lambda _: _.CvQualifier.name("Expressions.Cpp.CvQualifier").properties({"keyword": S.OfStr}),
            lambda _: _.PrimitiveTypeSpecifier.name("Expressions.Cpp.PrimitiveTypeSpecifier").properties({
                "keyword": S.OfStr}),
            lambda _: _.NamedTypeSpecifier.name("Expressions.Cpp.NamedTypeSpecifier").properties({"name": _.Name}),
            lambda _: _.TypenameSpecifier.name("Expressions.Cpp.TypenameSpecifier").properties({"name": _.Name}),
            lambda _: _.ClassSpecifier.name("Expressions.Cpp.ClassSpecifier").properties({
                "key": S.OfStr, "attributes": many(_.AttributeSpecifier), "name": _.Name, "final": S.OfBool,
                "bases": many(_.BaseSpecifier),
                "body": S.OfBool}),  # whether it has a body, whose member declarations are not part of the term
            lambda _: _.BaseSpecifier.name("Expressions.Cpp.BaseSpecifier").properties({
                "attributes": many(_.AttributeSpecifier), "virtual": S.OfBool, "access": S.OfStr, "type": _.Name,
                "pack": S.OfBool}),
            lambda _: _.EnumSpecifier.name("Expressions.Cpp.EnumSpecifier").properties({
                "key": S.OfStr, "attributes": many(_.AttributeSpecifier), "name": _.Name, "base": _.Type,
                "body": S.OfBool}),  # whether it has a body, whose enumerators are not part of the term
            lambda _: _.DecltypeSpecifier.name("Expressions.Cpp.DecltypeSpecifier").properties({
                "expression": _.Term}),
            lambda _: _.PlaceholderTypeSpecifier.name("Expressions.Cpp.PlaceholderTypeSpecifier").properties({
                "constraint": _.Name, "decltype": S.OfBool}),
            lambda _: _.IdDeclarator.name("Expressions.Cpp.IdDeclarator").properties({
                "name": _.Name, "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.PackDeclarator.name("Expressions.Cpp.PackDeclarator").properties({"declarator": _.Declarator}),
            lambda _: _.PointerDeclarator.name("Expressions.Cpp.PointerDeclarator").properties({
                "scope": _.Name, "attributes": many(_.AttributeSpecifier), "qualifiers": many(_.CvQualifier),
                "declarator": _.Declarator}),
            lambda _: _.ReferenceDeclarator.name("Expressions.Cpp.ReferenceDeclarator").properties({
                "rvalue": S.OfBool, "attributes": many(_.AttributeSpecifier), "declarator": _.Declarator}),
            lambda _: _.ArrayDeclarator.name("Expressions.Cpp.ArrayDeclarator").properties({
                "declarator": _.Declarator, "size": _.Term, "attributes": many(_.AttributeSpecifier)}),
            lambda _: _.FunctionDeclarator.name("Expressions.Cpp.FunctionDeclarator").properties({
                "declarator": _.Declarator, "parameters": many(_.Parameter), "qualifiers": many(_.CvQualifier),
                "ref_qualifier": S.OfStr, "exception": _.ExceptionSpecification,
                "attributes": many(_.AttributeSpecifier), "trailing_return": _.Type}),
            lambda _: _.ParenthesizedDeclarator.name("Expressions.Cpp.ParenthesizedDeclarator").properties({
                "declarator": _.Declarator}),
            lambda _: _.ParameterDeclaration.name("Expressions.Cpp.ParameterDeclaration").properties({
                "attributes": many(_.AttributeSpecifier), "this_keyword": S.OfBool, "specifiers": many(_.Specifier),
                "declarator": _.Declarator, "default": _.Term}),
            lambda _: _.EllipsisParameter.name("Expressions.Cpp.EllipsisParameter"),
            lambda _: _.TypeParameter.name("Expressions.Cpp.TypeParameter").properties({
                "key": S.OfStr, "constraint": _.Name, "pack": S.OfBool, "name": _.Identifier, "default": _.Type}),
            lambda _: _.TemplateTemplateParameter.name("Expressions.Cpp.TemplateTemplateParameter").properties({
                "parameters": many(_.TemplateParameter), "requires": _.Term, "key": S.OfStr, "pack": S.OfBool,
                "name": _.Identifier, "default": _.Name}),
            lambda _: _.NoexceptSpecifier.name("Expressions.Cpp.NoexceptSpecifier").properties({
                "condition": _.Term}),
            lambda _: _.ThrowSpecifier.name("Expressions.Cpp.ThrowSpecifier").properties({"types": many(_.Term)}),
            # attributes
            lambda _: _.StandardAttributeSpecifier.name("Expressions.Cpp.StandardAttributeSpecifier").properties({
                "using_namespace": S.OfStr, "attributes": many(_.Attribute)}),
            lambda _: _.Attribute.name("Expressions.Cpp.Attribute").properties({
                "namespace": S.OfStr, "name": S.OfStr, "arguments": many(_.Term), "pack": S.OfBool}),
            lambda _: _.AlignasSpecifier.name("Expressions.Cpp.AlignasSpecifier").properties({
                "keyword": S.OfStr, "operand": _.Term, "pack": S.OfBool}),
            lambda _: _.GnuAttributeSpecifier.name("Expressions.Cpp.GnuAttributeSpecifier").properties({
                "keyword": S.OfStr, "attributes": many(_.Attribute)}),
            lambda _: _.DeclspecSpecifier.name("Expressions.Cpp.DeclspecSpecifier").properties({
                "attributes": many(_.Attribute)}),
            # its holder, the root of an expression tree: a reference object refining the framework's, its `root`
            # narrowed to its `Term`
            lambda _: _.Expression.name("Expressions.Cpp.Expression").ref(True).refines([Framework.Expression]).properties({
                "root": _.Term}),
            lambda _: _.FrameworkTerm.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("cpp").schema([_.Term])]),
        ])]))])


_TAGS = (C.LITERAL, C.CONSTANT, USERDEFINEDLITERAL, C.CONCATENATEDSTRING, C.VARIABLE, IDEXPRESSION, THISEXPRESSION,
         C.PARENTHESIZEDEXPRESSION, LAMBDAEXPRESSION, FOLDEXPRESSION, REQUIRESEXPRESSION, C.SUBSCRIPTEXPRESSION,
         C.CALLEXPRESSION, FUNCTIONALCASTEXPRESSION, C.MEMBEREXPRESSION, C.POSTFIXEXPRESSION, NAMEDCASTEXPRESSION,
         TYPEIDEXPRESSION, C.UNARYEXPRESSION, AWAITEXPRESSION, C.SIZEOFEXPRESSION, SIZEOFPACKEXPRESSION,
         C.ALIGNOFEXPRESSION, NOEXCEPTEXPRESSION, NEWEXPRESSION, DELETEEXPRESSION, C.CASTEXPRESSION,
         C.BINARYEXPRESSION, C.CONDITIONALEXPRESSION, C.ASSIGNMENTEXPRESSION, THROWEXPRESSION, YIELDEXPRESSION,
         PACKEXPANSION, C.INITIALIZERLIST, C.DESIGNATEDINITIALIZER, C.STATEMENTEXPRESSION, C.EXTENSIONEXPRESSION,
         C.TYPEID)

_SINCE_20 = ("C++20", "C++23")
_STANDARDS = {**{tag: STANDARDS for tag in _TAGS}, REQUIRESEXPRESSION: _SINCE_20, AWAITEXPRESSION: _SINCE_20,
              YIELDEXPRESSION: _SINCE_20, C.DESIGNATEDINITIALIZER: _SINCE_20, C.STATEMENTEXPRESSION: (),
              C.EXTENSIONEXPRESSION: ()}

_ANY1 = FD.Function((FD.Anything,), FD.Anything)


def _application(tag: str, signature: FD.Signature = FD.Opaque(), optional: tuple[str, ...] = (),
                 **options: Any) -> F.Kind:
    return F.Kind(F.APPLICATION, signature=signature, standards=_STANDARDS[tag], check=_check(tag),
                  scopes=C.scopes(tag), optional=optional + C.OPTIONAL, **options)


def _check(tag: str) -> Any:
    return lambda record: C.problems(F.node(tag, record), SUFFIXES, PREFIXES, "C++")


_OWN = {
    USERDEFINEDLITERAL: _application(USERDEFINEDLITERAL, required=("literal", "suffix")),
    IDEXPRESSION: _application(IDEXPRESSION, required=("name",)),
    THISEXPRESSION: F.Kind(F.REFERENCE, lexical=False, standards=STANDARDS),
    LAMBDAEXPRESSION: _application(LAMBDAEXPRESSION, optional=("template_requires",)),
    FOLDEXPRESSION: F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.FOLD, required=("operator",),
                           optional=("left", "right"), standards=STANDARDS, check=_check(FOLDEXPRESSION),
                           scopes=C.scopes(FOLDEXPRESSION)),
    REQUIRESEXPRESSION: _application(REQUIRESEXPRESSION),
    FUNCTIONALCASTEXPRESSION: _application(FUNCTIONALCASTEXPRESSION, required=("type", "initializer")),
    NAMEDCASTEXPRESSION: F.Kind(F.APPLICATION, operator="operator", vocabulary=Domains.CASTS,
                                required=("operator", "type"), optional=C.OPTIONAL, standards=STANDARDS,
                                check=_check(NAMEDCASTEXPRESSION), scopes=C.scopes(NAMEDCASTEXPRESSION)),
    TYPEIDEXPRESSION: _application(TYPEIDEXPRESSION, FD.Opaque()),
    AWAITEXPRESSION: _application(AWAITEXPRESSION, _ANY1),
    SIZEOFPACKEXPRESSION: _application(SIZEOFPACKEXPRESSION, Domains.SIZE, required=("pack",)),
    NOEXCEPTEXPRESSION: _application(NOEXCEPTEXPRESSION, FD.Function((FD.Anything,), Domains.Bool)),
    NEWEXPRESSION: _application(NEWEXPRESSION, required=("type",)),
    DELETEEXPRESSION: _application(DELETEEXPRESSION, _ANY1),
    THROWEXPRESSION: _application(THROWEXPRESSION, optional=("operand",)),
    YIELDEXPRESSION: _application(YIELDEXPRESSION, _ANY1),
    PACKEXPANSION: _application(PACKEXPANSION, _ANY1),
}

_SHARED = C.kinds("C++", _TAGS, _STANDARDS, PREFIXES, SUFFIXES)


def _native(value: Any) -> Writer | None:
    """The literal of a native value: a number, a bool or a string; a bytes has none."""
    return literal(value) if type(value) in (bool, int, float, str) else None


DIALECT = F.Dialect("Cpp", {tag: _SHARED[tag] if tag in _SHARED else _OWN[tag] for tag in _TAGS},
                    domain_of=Domains.of, literal=_native)
"""The Cpp dialect: its kinds, as the framework reads them."""


class Writer(F.Writer):
    """A term of the Cpp dialect, written through the builders where it is given (a spec)."""

    __slots__ = ()

    def __init__(self, write: Any):
        super().__init__(write, DIALECT.tag)


_WRITERS = C.Writers(DIALECT, Writer)
literal, identifier, unary, binary = _WRITERS.literal, _WRITERS.identifier, _WRITERS.unary, _WRITERS.binary
conditional, cast, member, subscript, call = (
    _WRITERS.conditional, _WRITERS.cast, _WRITERS.member, _WRITERS.subscript, _WRITERS.call)
