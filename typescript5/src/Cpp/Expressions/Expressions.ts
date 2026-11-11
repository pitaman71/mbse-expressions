/**
 * Expressions of the Cpp dialect: every expression of C++, C++17 to C++23, as mbse-programs has them, with the
 * sublanguages expressions hold.
 *
 * The dialect is complete over C++'s expression syntax (mbse-basis [CAP-230: the C++ expression
 * dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md), by [CAP-226: complete expression
 * dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules); C++26's pack indexing, reflection, splices,
 * annotations and contracts are outside it. Its terms are values of its `Term`, `Expressions.Cpp.Expressions.Term`, the
 * branch `cpp` of `Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by
 * schema extension. Its kinds are mbse-programs' Ccpp expression kinds that C++ has
 * (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/Syntax.py`), named as `C.Expressions` names them: C++ is not a
 * superset of C, so the two are separate dialects, each with a union of its own, and `Cpp` defines its own copy of each
 * kind they share (`Expressions.Cpp.Expressions.BinaryExpression`), holding C++'s terms, without what only C has (an
 * array declarator's `static`, C's index designators, `_Generic`, compound literals, `typeof`, `_Atomic(type)`,
 * `_BitInt`). Where mbse-programs holds a `Name`, Cpp holds its `Name` union (`identifier`, `qualifiedname`,
 * `templateid`, `operatorname`, `conversionname`, `literaloperatorname`, `destructorname`, and, where a name's place
 * holds it, a `decltypespecifier`); where it holds an `Identifier` alone, an `Identifier`; where it holds a `str`, a
 * `str`. A term carries no domain. Beyond C's kinds (see `C.Expressions`), with C++'s own literal
 * (`Expressions.Cpp.Expressions.Literal`, also a raw string's `raw` and `delimiter`) and `constant` (`nullptr`):
 *
 * - `userdefinedliteral` (`literal`, a `literal`'s value object, and its `suffix`, `10_km`);
 * - names: `idexpression`, every name used as an expression, holding its `Name` (`x`, `std::cout`, `f<int>`,
 *   `operator+`), as C++'s grammar makes it: C++ has no `variable` (the user's decision of 2026-11-04, in the dialects
 * proposal's Decided), and an `idexpression` of an identifier is a lexical reference to its spelling, which validation
 *   requires bound and evaluation resolves; `thisexpression`;
 * - `lambdaexpression` (`captures`, `template_parameters`, `template_requires`, `attributes`, `declarator`), whose body
 *   of
 *   statements is not part of the term (the dialects proposal, Decided, 5, "(i)"); `foldexpression`;
 *   `requiresexpression` (`parameters`, `requirements`). A lambda and a requires expression are binders, refining the
 *   framework's `Let`, Let's `name`, `value` and `body` unset: what each binds, its scopes say;
 * - casts: `functionalcastexpression` (`T(x)`, `T{x}`), `namedcastexpression` (`static_cast<T>(x)` and its siblings),
 *   `typeidexpression`;
 * - `awaitexpression` (`co_await`), `yieldexpression` (`co_yield`), `sizeofpackexpression` (`sizeof...(pack)`),
 *   `noexceptexpression`, `newexpression`, `deleteexpression`, `throwexpression`, `packexpansion` (`pattern...`).
 *
 * Its sublanguages are dialects of their own, which it reads (`reads`; the dialects proposal, Retrofit's design): `Cpp
 * Types`, C++'s type-ids (`Expressions.Cpp.Types.Term`), which every position of a type holds (a cast's, a named cast's,
 * `new`'s, a conversion function's name's, a trailing return type, an enumeration's fixed type, a type parameter's
 * default), and C's `C Preprocessor`, the directives C and C++ share; `Term` lists their `typeid` and `definedexpression`
 * ("(b)"). `Expressions.Cpp.Expressions.Pattern` is its union for binding targets ("(ii)"): an init capture's name (`[n =
 * 1]`), an `identifier`, or invalid syntax, as the user decided (2026-11-04). As the user decided ("(b)"), one schema is a
 * branch of every union whose positions hold it: `Term` lists `designatedinitializer`, as C's does, `Pattern` lists
 * `identifier`, `Name` lists `decltypespecifier`, `Specifier` the attribute specifiers, `TemplateParameter` a
 * `parameterdeclaration` and `Initializer` an `initializerlist`. A type-id's and a lambda's parts are its helpers, as a
 * lambda's declarator holds parameters with their specifiers and declarators (so they stay this dialect's, read by `Cpp
 * Types` through its `reads`), each union named after mbse-programs' category: `Name`, `Specifier`, `Declarator`,
 * `Parameter`, `TemplateParameter`, `Capture`, `Requirement`, `Designator`, `Initializer`, `ExceptionSpecification` and
 * `AttributeSpecifier`. An enumeration's body is data, Cpp Types' terms: its `EnumSpecifier` holds its `enumerators` and
 * `trailing_comma`.
 *
 * The editions C++ covers are data, which `define` writes, each owned by its designation and holding the kinds it has
 * (`Framework.Standards`): ISO/IEC 14882:2017, 2020 and 2024, C++17, C++20 and C++23, every kind in each but C++20's
 * (`co_await`, `co_yield`, `requires` and designated initializers), in C++20 and C++23 alone, and an extension in none.
 * `DIALECT` reads the kinds (`Terms.Dialect`). The writers (`literal`, `identifier`, ...) are C's, writing C++'s terms,
 * a name used as an expression an `idexpression` (`identifier("x")`, and a callee named by a string):
 * `store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`. `Text.ToText` writes an expression as C++
 * source.
 *
 * Its kind of domain, the branch of its union `Expressions.Cpp.Expressions.DomainKind`, which `install` adds to the
 * framework's `Expressions.Framework.DomainKind` as the branch `cpp`: the token `nullptr_t` (`OfNullptr`), C++'s own,
 * with the inferred `ordered`; its domain has no schema, its value a `constant`'s. `install` also adds its domains'
 * schemas (`Expressions.Cpp.Expressions.std_float16_t`, a dotted identifier spelling `std::float16_t`), and `define`
 * writes its domains, the types C++'s standard fixes (`bool`, `int8_t` to `uint64_t`, `std::float16_t` to
 * `std::float128_t`, `std::bfloat16_t`, `nullptr_t`), owned by name. Every other type a C++ term reads (`int`, `char`,
 * `char8_t`, `size_t`, `long double`, ...) is its holder's ABI's, as a C term's is, read the same way (see
 * `C/Expressions`): a C++ literal is typed by C++'s names, `1.0f16` a `std::float16_t`, `1.0bf16` a `std::bfloat16_t`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "../../C/Expressions/Domains.js";
import * as C from "../../C/Expressions/Kinds.js";
import * as CPreprocessor from "../../C/Preprocessor/Expressions.js";
import * as CppTypes from "../Types/Expressions.js";

export const [USERDEFINEDLITERAL, IDEXPRESSION, THISEXPRESSION, LAMBDAEXPRESSION] = [
  "userdefinedliteral", "idexpression", "thisexpression", "lambdaexpression"] as const;
export const [FOLDEXPRESSION, REQUIRESEXPRESSION, FUNCTIONALCASTEXPRESSION, NAMEDCASTEXPRESSION] = [
  "foldexpression", "requiresexpression", "functionalcastexpression", "namedcastexpression"] as const;
export const [TYPEIDEXPRESSION, AWAITEXPRESSION, SIZEOFPACKEXPRESSION, NOEXCEPTEXPRESSION] = [
  "typeidexpression", "awaitexpression", "sizeofpackexpression", "noexceptexpression"] as const;
export const [NEWEXPRESSION, DELETEEXPRESSION, THROWEXPRESSION, YIELDEXPRESSION, PACKEXPANSION] = [
  "newexpression", "deleteexpression", "throwexpression", "yieldexpression", "packexpansion"] as const;

/** GNU's extensions, outside every standard, as mbse-programs marks them. */
export const EXTENSIONS: ReadonlySet<string> = C.EXTENSIONS;

/** A character's or a string's encoding prefixes. */
export const PREFIXES: readonly string[] = C.PREFIXES;

/** The suffixes C++ writes, by the type of the literal's value: an integer's (`u`, `l`, `ll`, C++23's `z`, in either
 * case and order) and a floating literal's (`f`, `l`, C++23's extended types' `f16` to `f128` and `bf16`). */
export const SUFFIXES: C.Suffixes = C.CPP_SUFFIXES;

/** Cpp's union of its kinds, added to the framework's terms as the branch `cpp`, its own kinds, its union of binding
 * targets (`Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
 * `Expressions.Cpp.Expressions`: run after `Framework.install`, in a transaction of its own, before or after its
 * family's other installs; run again, it writes nothing. Cpp Types' `Term` and its `typeid`, which its positions hold,
 * are named by name, each created where Cpp Types' install has not run. Its holder,
 * `Expressions.Cpp.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.Cpp.Expressions/1")
      .mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Kinds: S.OfUnion, DomainKind: S.OfUnion, OfNullptr: S.OfObject, // Kinds: the framework's
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Pattern: S.OfUnion, Name: S.OfUnion, Capture: S.OfUnion,
      Requirement: S.OfUnion, Designator: S.OfUnion, Initializer: S.OfUnion,
      Specifier: S.OfUnion, Declarator: S.OfUnion, Parameter: S.OfUnion,
      TemplateParameter: S.OfUnion, ExceptionSpecification: S.OfUnion,
      AttributeSpecifier: S.OfUnion, Expression: S.OfObject,
      Literal: S.OfObject, Constant: S.OfObject, UserDefinedLiteral: S.OfObject,
      ConcatenatedString: S.OfObject, IdExpression: S.OfObject, ThisExpression: S.OfObject,
      ParenthesizedExpression: S.OfObject, LambdaExpression: S.OfObject,
      LambdaDeclarator: S.OfObject, DefaultCapture: S.OfObject, SimpleCapture: S.OfObject,
      ThisCapture: S.OfObject, InitCapture: S.OfObject, FoldExpression: S.OfObject,
      RequiresExpression: S.OfObject, SimpleRequirement: S.OfObject, TypeRequirement: S.OfObject,
      CompoundRequirement: S.OfObject, NestedRequirement: S.OfObject,
      SubscriptExpression: S.OfObject, CallExpression: S.OfObject,
      FunctionalCastExpression: S.OfObject, MemberExpression: S.OfObject,
      PostfixExpression: S.OfObject, NamedCastExpression: S.OfObject,
      TypeidExpression: S.OfObject, UnaryExpression: S.OfObject, AwaitExpression: S.OfObject,
      SizeofExpression: S.OfObject, SizeofPackExpression: S.OfObject,
      AlignofExpression: S.OfObject, NoexceptExpression: S.OfObject, NewExpression: S.OfObject,
      DeleteExpression: S.OfObject, CastExpression: S.OfObject, BinaryExpression: S.OfObject,
      ConditionalExpression: S.OfObject, AssignmentExpression: S.OfObject,
      ThrowExpression: S.OfObject, YieldExpression: S.OfObject, PackExpansion: S.OfObject,
      InitializerList: S.OfObject, DesignatedInitializer: S.OfObject, FieldDesignator: S.OfObject,
      EqualInitializer: S.OfObject, ParenthesizedInitializer: S.OfObject,
      StatementExpression: S.OfObject, ExtensionExpression: S.OfObject, Identifier: S.OfObject,
      OperatorName: S.OfObject, ConversionName: S.OfObject, LiteralOperatorName: S.OfObject,
      DestructorName: S.OfObject, TemplateId: S.OfObject, QualifiedName: S.OfObject,
      DeclSpecifier: S.OfObject, CvQualifier: S.OfObject,
      PrimitiveTypeSpecifier: S.OfObject, NamedTypeSpecifier: S.OfObject,
      TypenameSpecifier: S.OfObject, ClassSpecifier: S.OfObject, BaseSpecifier: S.OfObject,
      EnumSpecifier: S.OfObject, DecltypeSpecifier: S.OfObject,
      PlaceholderTypeSpecifier: S.OfObject, IdDeclarator: S.OfObject, PackDeclarator: S.OfObject,
      PointerDeclarator: S.OfObject, ReferenceDeclarator: S.OfObject, ArrayDeclarator: S.OfObject,
      FunctionDeclarator: S.OfObject, ParenthesizedDeclarator: S.OfObject,
      ParameterDeclaration: S.OfObject, EllipsisParameter: S.OfObject, TypeParameter: S.OfObject,
      TemplateTemplateParameter: S.OfObject, NoexceptSpecifier: S.OfObject,
      ThrowSpecifier: S.OfObject, StandardAttributeSpecifier: S.OfObject, Attribute: S.OfObject,
      AlignasSpecifier: S.OfObject, GnuAttributeSpecifier: S.OfObject,
      DeclspecSpecifier: S.OfObject,
      // Cpp Types' `Term` and its `typeid`, by name; FrameworkTerm: the framework's, by name
      TypesTerm: S.OfUnion, TypeId: S.OfObject,
      bool: S.OfAny, int8_t: S.OfAny, int16_t: S.OfAny, int32_t: S.OfAny, int64_t: S.OfAny, // its domains' schemas
      uint8_t: S.OfAny, uint16_t: S.OfAny, uint32_t: S.OfAny, uint64_t: S.OfAny,
      std_float16_t: S.OfAny, std_float32_t: S.OfAny, std_float64_t: S.OfAny, std_float128_t: S.OfAny,
      std_bfloat16_t: S.OfAny })
    .spec([
      // its dialect: the singleton `Expressions.Cpp.Expressions`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Cpp.Expressions.Dialect").ref(true)
          .singleton("Expressions.Cpp.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("cpp").schema([_.Dialect])]),
      // its union of its kinds: its own, the framework's it reuses, a type name, an initializer list's
      // designated items, and invalid syntax
      (_: any) => _.Term.name("Expressions.Cpp.Expressions.Term").branches([
        (t: any) => t.name("literal").schema([_.Literal]),
        (t: any) => t.name("constant").schema([_.Constant]),
        (t: any) => t.name("userdefinedliteral").schema([_.UserDefinedLiteral]),
        (t: any) => t.name("concatenatedstring").schema([_.ConcatenatedString]),
        (t: any) => t.name("idexpression").schema([_.IdExpression]),
        (t: any) => t.name("thisexpression").schema([_.ThisExpression]),
        (t: any) => t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
        (t: any) => t.name("lambdaexpression").schema([_.LambdaExpression]),
        (t: any) => t.name("foldexpression").schema([_.FoldExpression]),
        (t: any) => t.name("requiresexpression").schema([_.RequiresExpression]),
        (t: any) => t.name("subscriptexpression").schema([_.SubscriptExpression]),
        (t: any) => t.name("callexpression").schema([_.CallExpression]),
        (t: any) => t.name("functionalcastexpression").schema([_.FunctionalCastExpression]),
        (t: any) => t.name("memberexpression").schema([_.MemberExpression]),
        (t: any) => t.name("postfixexpression").schema([_.PostfixExpression]),
        (t: any) => t.name("namedcastexpression").schema([_.NamedCastExpression]),
        (t: any) => t.name("typeidexpression").schema([_.TypeidExpression]),
        (t: any) => t.name("unaryexpression").schema([_.UnaryExpression]),
        (t: any) => t.name("awaitexpression").schema([_.AwaitExpression]),
        (t: any) => t.name("sizeofexpression").schema([_.SizeofExpression]),
        (t: any) => t.name("sizeofpackexpression").schema([_.SizeofPackExpression]),
        (t: any) => t.name("alignofexpression").schema([_.AlignofExpression]),
        (t: any) => t.name("noexceptexpression").schema([_.NoexceptExpression]),
        (t: any) => t.name("newexpression").schema([_.NewExpression]),
        (t: any) => t.name("deleteexpression").schema([_.DeleteExpression]),
        (t: any) => t.name("castexpression").schema([_.CastExpression]),
        (t: any) => t.name("binaryexpression").schema([_.BinaryExpression]),
        (t: any) => t.name("conditionalexpression").schema([_.ConditionalExpression]),
        (t: any) => t.name("assignmentexpression").schema([_.AssignmentExpression]),
        (t: any) => t.name("throwexpression").schema([_.ThrowExpression]),
        (t: any) => t.name("yieldexpression").schema([_.YieldExpression]),
        (t: any) => t.name("packexpansion").schema([_.PackExpansion]),
        (t: any) => t.name("initializerlist").schema([_.InitializerList]),
        (t: any) => t.name("designatedinitializer").schema([_.DesignatedInitializer]),
        (t: any) => t.name("statementexpression").schema([_.StatementExpression]),
        (t: any) => t.name("extensionexpression").schema([_.ExtensionExpression]),
        (t: any) => t.name("typeid").schema([_.TypeId]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its binding targets: an init capture's name, an identifier, and invalid syntax ("(ii)")
      (_: any) => _.Pattern.name("Expressions.Cpp.Expressions.Pattern").branches([
        (t: any) => t.name("identifier").schema([_.Identifier]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // names, and the decltype a name's place holds (mbse-programs' `Name`)
      (_: any) => _.Name.name("Expressions.Cpp.Expressions.Name").branches([
        (t: any) => t.name("identifier").schema([_.Identifier]),
        (t: any) => t.name("operatorname").schema([_.OperatorName]),
        (t: any) => t.name("conversionname").schema([_.ConversionName]),
        (t: any) => t.name("literaloperatorname").schema([_.LiteralOperatorName]),
        (t: any) => t.name("destructorname").schema([_.DestructorName]),
        (t: any) => t.name("templateid").schema([_.TemplateId]),
        (t: any) => t.name("qualifiedname").schema([_.QualifiedName]),
        (t: any) => t.name("decltypespecifier").schema([_.DecltypeSpecifier]),
      ]),
      (_: any) => _.Capture.name("Expressions.Cpp.Expressions.Capture").branches([
        (t: any) => t.name("defaultcapture").schema([_.DefaultCapture]),
        (t: any) => t.name("simplecapture").schema([_.SimpleCapture]),
        (t: any) => t.name("thiscapture").schema([_.ThisCapture]),
        (t: any) => t.name("initcapture").schema([_.InitCapture]),
      ]),
      (_: any) => _.Requirement.name("Expressions.Cpp.Expressions.Requirement").branches([
        (t: any) => t.name("simplerequirement").schema([_.SimpleRequirement]),
        (t: any) => t.name("typerequirement").schema([_.TypeRequirement]),
        (t: any) => t.name("compoundrequirement").schema([_.CompoundRequirement]),
        (t: any) => t.name("nestedrequirement").schema([_.NestedRequirement]),
      ]),
      (_: any) => _.Designator.name("Expressions.Cpp.Expressions.Designator").branches([
        (t: any) => t.name("fielddesignator").schema([_.FieldDesignator]),
      ]),
      (_: any) => _.Initializer.name("Expressions.Cpp.Expressions.Initializer").branches([
        (t: any) => t.name("equalinitializer").schema([_.EqualInitializer]),
        (t: any) => t.name("parenthesizedinitializer").schema([_.ParenthesizedInitializer]),
        (t: any) => t.name("initializerlist").schema([_.InitializerList]),
      ]),
      // a type name's specifiers, the attribute specifiers among them (mbse-programs' `Specifier`)
      (_: any) => _.Specifier.name("Expressions.Cpp.Expressions.Specifier").branches([
        (t: any) => t.name("declspecifier").schema([_.DeclSpecifier]),
        (t: any) => t.name("cvqualifier").schema([_.CvQualifier]),
        (t: any) => t.name("primitivetypespecifier").schema([_.PrimitiveTypeSpecifier]),
        (t: any) => t.name("namedtypespecifier").schema([_.NamedTypeSpecifier]),
        (t: any) => t.name("typenamespecifier").schema([_.TypenameSpecifier]),
        (t: any) => t.name("classspecifier").schema([_.ClassSpecifier]),
        (t: any) => t.name("enumspecifier").schema([_.EnumSpecifier]),
        (t: any) => t.name("decltypespecifier").schema([_.DecltypeSpecifier]),
        (t: any) => t.name("placeholdertypespecifier").schema([_.PlaceholderTypeSpecifier]),
        (t: any) => t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
        (t: any) => t.name("alignasspecifier").schema([_.AlignasSpecifier]),
        (t: any) => t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
        (t: any) => t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
      ]),
      (_: any) => _.Declarator.name("Expressions.Cpp.Expressions.Declarator").branches([
        (t: any) => t.name("iddeclarator").schema([_.IdDeclarator]),
        (t: any) => t.name("packdeclarator").schema([_.PackDeclarator]),
        (t: any) => t.name("pointerdeclarator").schema([_.PointerDeclarator]),
        (t: any) => t.name("referencedeclarator").schema([_.ReferenceDeclarator]),
        (t: any) => t.name("arraydeclarator").schema([_.ArrayDeclarator]),
        (t: any) => t.name("functiondeclarator").schema([_.FunctionDeclarator]),
        (t: any) => t.name("parenthesizeddeclarator").schema([_.ParenthesizedDeclarator]),
      ]),
      (_: any) => _.Parameter.name("Expressions.Cpp.Expressions.Parameter").branches([
        (t: any) => t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
        (t: any) => t.name("ellipsisparameter").schema([_.EllipsisParameter]),
      ]),
      (_: any) => _.TemplateParameter.name("Expressions.Cpp.Expressions.TemplateParameter").branches([
        (t: any) => t.name("typeparameter").schema([_.TypeParameter]),
        (t: any) => t.name("templatetemplateparameter").schema([_.TemplateTemplateParameter]),
        (t: any) => t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
      ]),
      (_: any) => _.ExceptionSpecification.name("Expressions.Cpp.Expressions.ExceptionSpecification").branches([
        (t: any) => t.name("noexceptspecifier").schema([_.NoexceptSpecifier]),
        (t: any) => t.name("throwspecifier").schema([_.ThrowSpecifier]),
      ]),
      (_: any) => _.AttributeSpecifier.name("Expressions.Cpp.Expressions.AttributeSpecifier").branches([
        (t: any) => t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
        (t: any) => t.name("alignasspecifier").schema([_.AlignasSpecifier]),
        (t: any) => t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
        (t: any) => t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
      ]),
      // literals
      (_: any) => _.Literal.name("Expressions.Cpp.Expressions.Literal").refines([Framework.Literal]).properties({
        prefix: S.OfStr, // a character's or a string's encoding: `L`, `u8`, `u` or `U`
        quote: S.OfStr, // `'` for a character, whose value is its code, or `"` for a string
        raw: S.OfBool, // whether a string is raw, `R"delimiter(...)delimiter"`
        delimiter: S.OfStr, // a raw string's delimiter, as written
        base: S.OfInt, // an integer's base: 2, 8, 10 or 16
        separators: S.OfBool, // whether `'` groups its digits
        suffix: S.OfStr, // an integer's or a floating literal's suffix, as written: `u`, `ULL`, `f`
      }),
      (_: any) => _.Constant.name("Expressions.Cpp.Expressions.Constant").properties({
        singleton: S.OfStr, // `nullptr`
        text: S.OfStr, // its spelling, unvalidated
        problems: many(S.OfStr), // what is wrong with it
      }),
      (_: any) => _.UserDefinedLiteral.name("Expressions.Cpp.Expressions.UserDefinedLiteral").properties({
        literal: _.Literal, suffix: S.OfStr}),
      (_: any) => _.ConcatenatedString.name("Expressions.Cpp.Expressions.ConcatenatedString").properties({
        parts: many(_.Term)}),
      // primary expressions
      (_: any) => _.IdExpression.name("Expressions.Cpp.Expressions.IdExpression").properties({name: _.Name}),
      (_: any) => _.ThisExpression.name("Expressions.Cpp.Expressions.ThisExpression"),
      (_: any) => _.ParenthesizedExpression.name("Expressions.Cpp.Expressions.ParenthesizedExpression").properties({
        expression: _.Term}),
      // binders: `Let`, Let's `name`, `value` and `body` unset (a body of statements is not part of the term), its
      // scopes saying what it binds
      (_: any) => _.LambdaExpression.name("Expressions.Cpp.Expressions.LambdaExpression").refines([Framework.Let]).properties({
        captures: many(_.Capture), template_parameters: many(_.TemplateParameter),
        template_requires: _.Term, attributes: many(_.AttributeSpecifier),
        declarator: _.LambdaDeclarator}), // its body of statements is not part of the term
      (_: any) => _.LambdaDeclarator.name("Expressions.Cpp.Expressions.LambdaDeclarator").properties({
        parameters: many(_.Parameter), specifiers: many(_.Specifier),
        exception: _.ExceptionSpecification, attributes: many(_.AttributeSpecifier),
        trailing_return: _.TypesTerm, requires: _.Term}),
      (_: any) => _.DefaultCapture.name("Expressions.Cpp.Expressions.DefaultCapture").properties({mode: S.OfStr}),
      (_: any) => _.SimpleCapture.name("Expressions.Cpp.Expressions.SimpleCapture").properties({
        by_reference: S.OfBool, name: _.Identifier, pack: S.OfBool}),
      (_: any) => _.ThisCapture.name("Expressions.Cpp.Expressions.ThisCapture").properties({copy: S.OfBool}),
      (_: any) => _.InitCapture.name("Expressions.Cpp.Expressions.InitCapture").properties({
        by_reference: S.OfBool, pack: S.OfBool, name: _.Pattern, initializer: _.Initializer}),
      (_: any) => _.FoldExpression.name("Expressions.Cpp.Expressions.FoldExpression").properties({
        left: _.Term, operator: S.OfStr, right: _.Term}),
      (_: any) => _.RequiresExpression.name("Expressions.Cpp.Expressions.RequiresExpression").refines([Framework.Let]).properties({
        parameters: many(_.Parameter), requirements: many(_.Requirement)}),
      (_: any) => _.SimpleRequirement.name("Expressions.Cpp.Expressions.SimpleRequirement")
          .properties({expression: _.Term}),
      (_: any) => _.TypeRequirement.name("Expressions.Cpp.Expressions.TypeRequirement").properties({name: _.Name}),
      (_: any) => _.CompoundRequirement.name("Expressions.Cpp.Expressions.CompoundRequirement").properties({
        expression: _.Term, noexcept: S.OfBool, return_type: _.Name}),
      (_: any) => _.NestedRequirement.name("Expressions.Cpp.Expressions.NestedRequirement").properties({
        constraint: _.Term}),
      // postfix expressions
      (_: any) => _.SubscriptExpression.name("Expressions.Cpp.Expressions.SubscriptExpression").properties({
        object: _.Term, indices: many(_.Term)}),
      (_: any) => _.CallExpression.name("Expressions.Cpp.Expressions.CallExpression").properties({
        function: _.Term, arguments: many(_.Term)}),
      (_: any) => _.FunctionalCastExpression.name("Expressions.Cpp.Expressions.FunctionalCastExpression").properties({
        type: _.Specifier, initializer: _.Initializer}),
      (_: any) => _.MemberExpression.name("Expressions.Cpp.Expressions.MemberExpression").properties({
        object: _.Term, operator: S.OfStr, template_keyword: S.OfBool, member: _.Name}),
      (_: any) => _.PostfixExpression.name("Expressions.Cpp.Expressions.PostfixExpression").properties({
        operand: _.Term, operator: S.OfStr}),
      (_: any) => _.NamedCastExpression.name("Expressions.Cpp.Expressions.NamedCastExpression").properties({
        operator: S.OfStr, type: _.TypesTerm, operand: _.Term}),
      (_: any) => _.TypeidExpression.name("Expressions.Cpp.Expressions.TypeidExpression").properties({operand: _.Term}),
      // unary expressions
      (_: any) => _.UnaryExpression.name("Expressions.Cpp.Expressions.UnaryExpression").properties({
        operator: S.OfStr, operand: _.Term}),
      (_: any) => _.AwaitExpression.name("Expressions.Cpp.Expressions.AwaitExpression").properties({operand: _.Term}),
      (_: any) => _.SizeofExpression.name("Expressions.Cpp.Expressions.SizeofExpression").properties({operand: _.Term}),
      (_: any) => _.SizeofPackExpression.name("Expressions.Cpp.Expressions.SizeofPackExpression").properties({
        pack: _.Identifier}),
      (_: any) => _.AlignofExpression.name("Expressions.Cpp.Expressions.AlignofExpression").properties({
        keyword: S.OfStr, operand: _.Term}),
      (_: any) => _.NoexceptExpression.name("Expressions.Cpp.Expressions.NoexceptExpression")
          .properties({operand: _.Term}),
      (_: any) => _.NewExpression.name("Expressions.Cpp.Expressions.NewExpression").properties({
        global_scope: S.OfBool, placement: many(_.Term), parenthesized_type: S.OfBool, type: _.TypesTerm,
        initializer: _.Initializer}),
      (_: any) => _.DeleteExpression.name("Expressions.Cpp.Expressions.DeleteExpression").properties({
        global_scope: S.OfBool, array: S.OfBool, operand: _.Term}),
      // other expressions
      (_: any) => _.CastExpression.name("Expressions.Cpp.Expressions.CastExpression").properties({
        type: _.TypesTerm, operand: _.Term}),
      (_: any) => _.BinaryExpression.name("Expressions.Cpp.Expressions.BinaryExpression").properties({
        left: _.Term, operator: S.OfStr, right: _.Term}),
      (_: any) => _.ConditionalExpression.name("Expressions.Cpp.Expressions.ConditionalExpression").properties({
        condition: _.Term, consequence: _.Term, alternative: _.Term}),
      (_: any) => _.AssignmentExpression.name("Expressions.Cpp.Expressions.AssignmentExpression").properties({
        left: _.Term, operator: S.OfStr, right: _.Term}),
      (_: any) => _.ThrowExpression.name("Expressions.Cpp.Expressions.ThrowExpression").properties({operand: _.Term}),
      (_: any) => _.YieldExpression.name("Expressions.Cpp.Expressions.YieldExpression").properties({operand: _.Term}),
      (_: any) => _.PackExpansion.name("Expressions.Cpp.Expressions.PackExpansion").properties({pattern: _.Term}),
      // initializers
      (_: any) => _.InitializerList.name("Expressions.Cpp.Expressions.InitializerList").properties({
        items: many(_.Term), trailing_comma: S.OfBool}),
      (_: any) => _.DesignatedInitializer.name("Expressions.Cpp.Expressions.DesignatedInitializer").properties({
        designators: many(_.Designator), initializer: _.Initializer}),
      (_: any) => _.FieldDesignator.name("Expressions.Cpp.Expressions.FieldDesignator")
          .properties({name: _.Identifier}),
      (_: any) => _.EqualInitializer.name("Expressions.Cpp.Expressions.EqualInitializer").properties({value: _.Term}),
      (_: any) => _.ParenthesizedInitializer.name("Expressions.Cpp.Expressions.ParenthesizedInitializer").properties({
        arguments: many(_.Term)}),
      // GNU's extensions: a statement expression's body of statements is not part of the term
      (_: any) => _.StatementExpression.name("Expressions.Cpp.Expressions.StatementExpression"),
      (_: any) => _.ExtensionExpression.name("Expressions.Cpp.Expressions.ExtensionExpression").properties({
        operand: _.Term}),
      // names
      (_: any) => _.Identifier.name("Expressions.Cpp.Expressions.Identifier").properties({spelling: S.OfStr}),
      (_: any) => _.OperatorName.name("Expressions.Cpp.Expressions.OperatorName").properties({operator: S.OfStr}),
      (_: any) => _.ConversionName.name("Expressions.Cpp.Expressions.ConversionName").properties({type: _.TypesTerm}),
      (_: any) => _.LiteralOperatorName.name("Expressions.Cpp.Expressions.LiteralOperatorName").properties({
        suffix: S.OfStr}),
      (_: any) => _.DestructorName.name("Expressions.Cpp.Expressions.DestructorName").properties({type: _.Name}),
      (_: any) => _.TemplateId.name("Expressions.Cpp.Expressions.TemplateId").properties({
        template_keyword: S.OfBool, name: _.Name, arguments: many(_.Term)}),
      (_: any) => _.QualifiedName.name("Expressions.Cpp.Expressions.QualifiedName").properties({
        global_scope: S.OfBool, qualifiers: many(_.Name), name: _.Name}),
      (_: any) => _.DeclSpecifier.name("Expressions.Cpp.Expressions.DeclSpecifier").properties({keyword: S.OfStr}),
      (_: any) => _.CvQualifier.name("Expressions.Cpp.Expressions.CvQualifier").properties({keyword: S.OfStr}),
      (_: any) => _.PrimitiveTypeSpecifier.name("Expressions.Cpp.Expressions.PrimitiveTypeSpecifier").properties({
        keyword: S.OfStr}),
      (_: any) => _.NamedTypeSpecifier.name("Expressions.Cpp.Expressions.NamedTypeSpecifier")
          .properties({name: _.Name}),
      (_: any) => _.TypenameSpecifier.name("Expressions.Cpp.Expressions.TypenameSpecifier").properties({name: _.Name}),
      (_: any) => _.ClassSpecifier.name("Expressions.Cpp.Expressions.ClassSpecifier").properties({
        key: S.OfStr, attributes: many(_.AttributeSpecifier), name: _.Name, final: S.OfBool,
        bases: many(_.BaseSpecifier),
        body: S.OfBool}), // whether it has a body, whose member declarations are not part of the term
      (_: any) => _.BaseSpecifier.name("Expressions.Cpp.Expressions.BaseSpecifier").properties({
        attributes: many(_.AttributeSpecifier), virtual: S.OfBool, access: S.OfStr, type: _.Name,
        pack: S.OfBool}),
      (_: any) => _.EnumSpecifier.name("Expressions.Cpp.Expressions.EnumSpecifier").properties({
        key: S.OfStr, attributes: many(_.AttributeSpecifier), name: _.Name, base: _.TypesTerm,
        body: S.OfBool, // whether it has a body, `{ enumerators }`
        enumerators: many(_.TypesTerm), trailing_comma: S.OfBool}), // its body's items, and `{ ..., }`
      (_: any) => _.DecltypeSpecifier.name("Expressions.Cpp.Expressions.DecltypeSpecifier").properties({
        expression: _.Term}),
      (_: any) => _.PlaceholderTypeSpecifier.name("Expressions.Cpp.Expressions.PlaceholderTypeSpecifier").properties({
        constraint: _.Name, decltype: S.OfBool}),
      (_: any) => _.IdDeclarator.name("Expressions.Cpp.Expressions.IdDeclarator").properties({
        name: _.Name, attributes: many(_.AttributeSpecifier)}),
      (_: any) => _.PackDeclarator.name("Expressions.Cpp.Expressions.PackDeclarator")
          .properties({declarator: _.Declarator}),
      (_: any) => _.PointerDeclarator.name("Expressions.Cpp.Expressions.PointerDeclarator").properties({
        scope: _.Name, attributes: many(_.AttributeSpecifier), qualifiers: many(_.CvQualifier),
        declarator: _.Declarator}),
      (_: any) => _.ReferenceDeclarator.name("Expressions.Cpp.Expressions.ReferenceDeclarator").properties({
        rvalue: S.OfBool, attributes: many(_.AttributeSpecifier), declarator: _.Declarator}),
      (_: any) => _.ArrayDeclarator.name("Expressions.Cpp.Expressions.ArrayDeclarator").properties({
        declarator: _.Declarator, size: _.Term, attributes: many(_.AttributeSpecifier)}),
      (_: any) => _.FunctionDeclarator.name("Expressions.Cpp.Expressions.FunctionDeclarator").properties({
        declarator: _.Declarator, parameters: many(_.Parameter), qualifiers: many(_.CvQualifier),
        ref_qualifier: S.OfStr, exception: _.ExceptionSpecification,
        attributes: many(_.AttributeSpecifier), trailing_return: _.TypesTerm}),
      (_: any) => _.ParenthesizedDeclarator.name("Expressions.Cpp.Expressions.ParenthesizedDeclarator").properties({
        declarator: _.Declarator}),
      (_: any) => _.ParameterDeclaration.name("Expressions.Cpp.Expressions.ParameterDeclaration").properties({
        attributes: many(_.AttributeSpecifier), this_keyword: S.OfBool, specifiers: many(_.Specifier),
        declarator: _.Declarator, default: _.Term}),
      (_: any) => _.EllipsisParameter.name("Expressions.Cpp.Expressions.EllipsisParameter"),
      (_: any) => _.TypeParameter.name("Expressions.Cpp.Expressions.TypeParameter").properties({
        key: S.OfStr, constraint: _.Name, pack: S.OfBool, name: _.Identifier, default: _.TypesTerm}),
      (_: any) => _.TemplateTemplateParameter.name("Expressions.Cpp.Expressions.TemplateTemplateParameter").properties({
        parameters: many(_.TemplateParameter), requires: _.Term, key: S.OfStr, pack: S.OfBool,
        name: _.Identifier, default: _.Name}),
      (_: any) => _.NoexceptSpecifier.name("Expressions.Cpp.Expressions.NoexceptSpecifier").properties({
        condition: _.Term}),
      (_: any) => _.ThrowSpecifier.name("Expressions.Cpp.Expressions.ThrowSpecifier").properties({types: many(_.Term)}),
      // attributes
      (_: any) => _.StandardAttributeSpecifier.name("Expressions.Cpp.Expressions.StandardAttributeSpecifier")
          .properties({
        using_namespace: S.OfStr, attributes: many(_.Attribute)}),
      (_: any) => _.Attribute.name("Expressions.Cpp.Expressions.Attribute").properties({
        namespace: S.OfStr, name: S.OfStr, arguments: many(_.Term), pack: S.OfBool}),
      (_: any) => _.AlignasSpecifier.name("Expressions.Cpp.Expressions.AlignasSpecifier").properties({
        keyword: S.OfStr, operand: _.Term, pack: S.OfBool}),
      (_: any) => _.GnuAttributeSpecifier.name("Expressions.Cpp.Expressions.GnuAttributeSpecifier").properties({
        keyword: S.OfStr, attributes: many(_.Attribute)}),
      (_: any) => _.DeclspecSpecifier.name("Expressions.Cpp.Expressions.DeclspecSpecifier").properties({
        attributes: many(_.Attribute)}),
      // a type name, Cpp Types' kind, which `Term` lists for the positions that hold an expression or a type alike, and
      // Cpp Types' `Term`, which every position of a type holds: each by name, created where Cpp Types' install has not
      // run
      (_: any) => _.TypeId.name("Expressions.Cpp.Types.TypeId"),
      (_: any) => _.TypesTerm.name("Expressions.Cpp.Types.Term"),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
      // narrowed to its `Term`
      (_: any) => _.Expression.name("Expressions.Cpp.Expressions.Expression").ref(true).refines([Framework.Expression])
          .properties({
        root: _.Term}),
      // --- its kind of domain: the token of `nullptr`, its own, not C's; inferred `ordered` ---
      (_: any) => _.OfNullptr.name("Expressions.Cpp.Expressions.OfNullptr").properties({ ordered: S.OfBool }),
      (_: any) => _.DomainKind.name("Expressions.Cpp.Expressions.DomainKind").branches([
        (t: any) => t.name("nullptr_t").schema([_.OfNullptr]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("cpp").schema([_.DomainKind])]),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("cpp").schema([_.Term])]),
      // --- its domains' schemas, each an OfAny of the scalar it narrows (a format whose values are text, `str`), named
      // as a dotted identifier spells its type (`std::float16_t` as `std_float16_t`), which `define` relates to its
      // domain; `nullptr_t`'s has none ---
      (_: any) => _.bool.name("Expressions.Cpp.Expressions.bool").schemas([S.OfBool]),
      (_: any) => _.int8_t.name("Expressions.Cpp.Expressions.int8_t").schemas([S.OfInt]),
      (_: any) => _.int16_t.name("Expressions.Cpp.Expressions.int16_t").schemas([S.OfInt]),
      (_: any) => _.int32_t.name("Expressions.Cpp.Expressions.int32_t").schemas([S.OfInt]),
      (_: any) => _.int64_t.name("Expressions.Cpp.Expressions.int64_t").schemas([S.OfInt]),
      (_: any) => _.uint8_t.name("Expressions.Cpp.Expressions.uint8_t").schemas([S.OfInt]),
      (_: any) => _.uint16_t.name("Expressions.Cpp.Expressions.uint16_t").schemas([S.OfInt]),
      (_: any) => _.uint32_t.name("Expressions.Cpp.Expressions.uint32_t").schemas([S.OfInt]),
      (_: any) => _.uint64_t.name("Expressions.Cpp.Expressions.uint64_t").schemas([S.OfInt]),
      (_: any) => _.std_float16_t.name("Expressions.Cpp.Expressions.std_float16_t").schemas([S.OfFloat]),
      (_: any) => _.std_float32_t.name("Expressions.Cpp.Expressions.std_float32_t").schemas([S.OfFloat]),
      (_: any) => _.std_float64_t.name("Expressions.Cpp.Expressions.std_float64_t").schemas([S.OfFloat]),
      (_: any) => _.std_float128_t.name("Expressions.Cpp.Expressions.std_float128_t").schemas([S.OfStr]),
      (_: any) => _.std_bfloat16_t.name("Expressions.Cpp.Expressions.std_bfloat16_t").schemas([S.OfStr]),
    ])]))]);
}

/** C++'s dialect as data: the singleton `Expressions.Cpp.Expressions` owning its domains by name (`domains`, through
 * `Expressions.Framework.Defines`), the types C++'s standard fixes, each with its parameters and its inferred
 * properties, and each but `nullptr_t`'s related to its schema (`Expressions.Cpp.Expressions.std_float16_t`) by
 * `Expressions.Framework.HasDomain`: `bool` (11404's `boolean`); `int8_t` to `int64_t` and `uint8_t` to `uint64_t`, as
 * C's (C++'s `<cstdint>` is C's, under C's names); C++23's `std::float16_t`, `std::float32_t`, `std::float64_t` and
 * `std::float128_t` (IEEE 754's `binary16` to `binary128`) and `std::bfloat16_t` (IEEE 754's kind with no format: 16
 * bits, radix 2, precision 8, emax 127), each rounding ties to even; and `nullptr_t`, of C++'s own kind. What C++
 * leaves to the implementation is each ABI dialect's, as C's is. And the editions of C++ it covers, by designation
 * (`standards`, through `Expressions.Framework.Covers`), each with its formal reference's parts, its common name and
 * the kinds it has. Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the
 * dialect (`dialect`), each edition by its common name spelled as an identifier (`C++17` as `Cpp17`) and each domain by
 * its name, spelled as its schema's is: `store.transaction(Cpp.define)[0].get("std_bfloat16_t")`. */
export function define(txn: any): any {
  const OWN = txn.Expressions.Cpp.Expressions;
  const Domain = txn.Expressions.Framework.Domain, Standard = txn.Expressions.Framework.Standard;
  const every = new Map((OWN.Term.as_schema().branches as { name: string; schema: unknown }[]) // each of its own
    .filter((b) => TAGS.includes(b.name) && !EXTENSIONS.has(b.name)) // kinds' schema, by its tag, but an extension
    .map((b) => [b.name, b.schema]));
  return txn.uid("mbse.Expressions.Cpp.Expressions.define/1")
      .mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      dialect: OWN.Dialect, Cpp17: Standard, Cpp20: Standard, Cpp23: Standard,
      bool: Domain, int8_t: Domain, int16_t: Domain, int32_t: Domain, int64_t: Domain,
      uint8_t: Domain, uint16_t: Domain, uint32_t: Domain, uint64_t: Domain,
      std_float16_t: Domain, std_float32_t: Domain, std_float64_t: Domain, std_float128_t: Domain,
      std_bfloat16_t: Domain, nullptr_t: Domain,
    })
    .spec([
      // --- the editions C++ covers, each by its designation, with the kinds it has: every kind but GNU's extensions
      // and invalid syntax, C++20's own in C++20 and C++23 alone ---
      (_: any) => _.dialect.standards({
        "ISO/IEC 14882:2017": (e: any) => e.standard(_.Cpp17), "ISO/IEC 14882:2020": (e: any) => e.standard(_.Cpp20),
        "ISO/IEC 14882:2024": (e: any) => e.standard(_.Cpp23) }),
      (_: any) => _.Cpp17.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2017n)).names(
        ["C++17"]).kinds([...every].filter(([tag]) => !SINCE_20.has(tag)).map(([, schema]) => schema)),
      (_: any) => _.Cpp20.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2020n)).names(
        ["C++20"]).kinds([...every.values()]),
      (_: any) => _.Cpp23.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2024n)).names(
        ["C++23"]).kinds([...every.values()]),
      // --- its domains ---
      (_: any) => _.dialect.domains({
        "bool": (e: any) => e.domain(_.bool),
        "int8_t": (e: any) => e.domain(_.int8_t),
        "int16_t": (e: any) => e.domain(_.int16_t),
        "int32_t": (e: any) => e.domain(_.int32_t),
        "int64_t": (e: any) => e.domain(_.int64_t),
        "uint8_t": (e: any) => e.domain(_.uint8_t),
        "uint16_t": (e: any) => e.domain(_.uint16_t),
        "uint32_t": (e: any) => e.domain(_.uint32_t),
        "uint64_t": (e: any) => e.domain(_.uint64_t),
        "std::float16_t": (e: any) => e.domain(_.std_float16_t),
        "std::float32_t": (e: any) => e.domain(_.std_float32_t),
        "std::float64_t": (e: any) => e.domain(_.std_float64_t),
        "std::float128_t": (e: any) => e.domain(_.std_float128_t),
        "std::bfloat16_t": (e: any) => e.domain(_.std_bfloat16_t),
        "nullptr_t": (e: any) => e.domain(_.nullptr_t),
      }),
      (_: any) => _.bool.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.boolean(
        (d: any) => d.ordered(false)))))).schema([OWN.bool]),
      (_: any) => _.int8_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(8n).signed(true).overflow("raise")
          .least(-128n).greatest(127n).ordered(true)))))).schema([OWN.int8_t]),
      (_: any) => _.int16_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(16n).signed(true).overflow("raise")
          .least(-32768n).greatest(32767n).ordered(true)))))).schema([OWN.int16_t]),
      (_: any) => _.int32_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(32n).signed(true).overflow("raise")
          .least(-2147483648n).greatest(2147483647n).ordered(true)))))).schema([OWN.int32_t]),
      (_: any) => _.int64_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(64n).signed(true).overflow("raise")
          .least(-9223372036854775808n).greatest(9223372036854775807n).ordered(true)))))).schema([OWN.int64_t]),
      (_: any) => _.uint8_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(256n)
          .least(0n).greatest(255n).ordered(true)))))).schema([OWN.uint8_t]),
      (_: any) => _.uint16_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(65536n)
          .least(0n).greatest(65535n).ordered(true)))))).schema([OWN.uint16_t]),
      (_: any) => _.uint32_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(4294967296n)
          .least(0n).greatest(4294967295n).ordered(true)))))).schema([OWN.uint32_t]),
      (_: any) => _.uint64_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(18446744073709551616n)
          .least(0n).greatest(18446744073709551615n).ordered(true)))))).schema([OWN.uint64_t]),
      (_: any) => _.std_float16_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary16").rounding("roundTiesToEven").width(16n)
          .radix(2n).precision(11n).emax(15n).ordered(true)))))).schema([OWN.std_float16_t]),
      (_: any) => _.std_float32_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary32").rounding("roundTiesToEven").width(32n)
          .radix(2n).precision(24n).emax(127n).ordered(true)))))).schema([OWN.std_float32_t]),
      (_: any) => _.std_float64_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n)
          .radix(2n).precision(53n).emax(1023n).ordered(true)))))).schema([OWN.std_float64_t]),
      (_: any) => _.std_float128_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary128").rounding("roundTiesToEven").width(128n)
          .radix(2n).precision(113n).emax(16383n).ordered(true)))))).schema([OWN.std_float128_t]),
      (_: any) => _.std_bfloat16_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.rounding("roundTiesToEven").width(16n)
          .radix(2n).precision(8n).emax(127n).ordered(true)))))).schema([OWN.std_bfloat16_t]),
      (_: any) => _.nullptr_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.cpp((v: any) => v.nullptr_t(
        (d: any) => d.ordered(false)))))),
    ])]))]);
}

/** Its own kinds, in its `Term`'s order: its `Term` lists Cpp Types' `typeid` after them, and C Preprocessor's
 * `definedexpression` after invalid syntax, each read as the dialect that declares it reads it. */
const TAGS: readonly string[] = [C.LITERAL, C.CONSTANT, USERDEFINEDLITERAL, C.CONCATENATEDSTRING, IDEXPRESSION,
  THISEXPRESSION, C.PARENTHESIZEDEXPRESSION, LAMBDAEXPRESSION, FOLDEXPRESSION, REQUIRESEXPRESSION,
    C.SUBSCRIPTEXPRESSION,
  C.CALLEXPRESSION, FUNCTIONALCASTEXPRESSION, C.MEMBEREXPRESSION, C.POSTFIXEXPRESSION, NAMEDCASTEXPRESSION,
  TYPEIDEXPRESSION, C.UNARYEXPRESSION, AWAITEXPRESSION, C.SIZEOFEXPRESSION, SIZEOFPACKEXPRESSION, C.ALIGNOFEXPRESSION,
  NOEXCEPTEXPRESSION, NEWEXPRESSION, DELETEEXPRESSION, C.CASTEXPRESSION, C.BINARYEXPRESSION, C.CONDITIONALEXPRESSION,
  C.ASSIGNMENTEXPRESSION, THROWEXPRESSION, YIELDEXPRESSION, PACKEXPANSION, C.INITIALIZERLIST, C.DESIGNATEDINITIALIZER,
  C.STATEMENTEXPRESSION, C.EXTENSIONEXPRESSION];

/** The kinds C++20 added: C++17 has every other kind but the extensions. */
const SINCE_20: ReadonlySet<string> = new Set([REQUIRESEXPRESSION, AWAITEXPRESSION, YIELDEXPRESSION,
  C.DESIGNATEDINITIALIZER]);

const ANY1 = new FD.Function([FD.Anything], FD.Anything);

function check(tag: string): (record: any) => string[] {
  return (record: any) => C.problems(F.node(tag, record), new Domains.Types(record, "Cpp.Expressions"), SUFFIXES,
      PREFIXES,
    "C++");
}

function application(tag: string, signature: FD.Signature = new FD.Opaque(), options: F.KindOptions = {}): F.Kind {
  return new F.Kind(F.APPLICATION, { signature, check: check(tag), scopes: C.scopes(tag), ...options,
    optional: [...(options.optional ?? []), ...C.OPTIONAL] });
}

const OWN: Record<string, F.Kind> = {
  [USERDEFINEDLITERAL]: application(USERDEFINEDLITERAL, new FD.Opaque(), { required: ["literal", "suffix"] }),
  [IDEXPRESSION]: new F.Kind(F.REFERENCE, { required: ["name"], check: check(IDEXPRESSION),
    scopes: C.scopes(IDEXPRESSION), optional: C.OPTIONAL }),
  [THISEXPRESSION]: new F.Kind(F.REFERENCE, { lexical: false }),
  [LAMBDAEXPRESSION]: application(LAMBDAEXPRESSION, new FD.Opaque(), { optional: ["value", "body", "template_requires"] }),
  [FOLDEXPRESSION]: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.FOLD, required: ["operator"],
    optional: ["left", "right"], check: check(FOLDEXPRESSION),
      scopes: C.scopes(FOLDEXPRESSION) }),
  [REQUIRESEXPRESSION]: application(REQUIRESEXPRESSION, new FD.Opaque(), { optional: ["value", "body"] }),
  [FUNCTIONALCASTEXPRESSION]: application(FUNCTIONALCASTEXPRESSION, new FD.Opaque(), { required: ["type",
    "initializer"] }),
  [NAMEDCASTEXPRESSION]: new F.Kind(F.APPLICATION, { operator: "operator", vocabulary: Domains.CASTS,
    required: ["operator"], optional: C.OPTIONAL, check: check(NAMEDCASTEXPRESSION),
    scopes: C.scopes(NAMEDCASTEXPRESSION) }),
  [TYPEIDEXPRESSION]: application(TYPEIDEXPRESSION, new FD.Opaque()),
  [AWAITEXPRESSION]: application(AWAITEXPRESSION, ANY1),
  [SIZEOFPACKEXPRESSION]: application(SIZEOFPACKEXPRESSION, Domains.SIZE, { required: ["pack"], typed: C.size("C++") }),
  [NOEXCEPTEXPRESSION]: application(NOEXCEPTEXPRESSION, ANY1, { typed: C.truth("C++") }),
  [NEWEXPRESSION]: application(NEWEXPRESSION),
  [DELETEEXPRESSION]: application(DELETEEXPRESSION, ANY1),
  [THROWEXPRESSION]: application(THROWEXPRESSION, new FD.Opaque(), { optional: ["operand"] }),
  [YIELDEXPRESSION]: application(YIELDEXPRESSION, ANY1),
  [PACKEXPANSION]: application(PACKEXPANSION, ANY1),
};

const SHARED = C.kinds("C++", TAGS, PREFIXES, SUFFIXES);

/** The literal of a native value: a number, a bool or a string; a bytes has none. */
function native(value: unknown): Writer | null {
  return ["bigint", "number", "boolean", "string"].includes(typeof value) ? literal(value) : null;
}

/** The dialects whose terms its positions are to hold, read when first needed (the dialects proposal, Retrofit's
 * design): `Cpp Types` and C's `C Preprocessor`, and none of C's other dialects. */
function reads(): readonly F.Dialect[] {
  return [CppTypes.DIALECT, CPreprocessor.DIALECT];
}

/** The Cpp dialect: its kinds, as the framework reads them, and the terms of the dialects it reads. */
export const DIALECT: F.Dialect = new F.Dialect("Cpp.Expressions", Object.fromEntries(TAGS.map((tag) => [tag,
    SHARED[tag] ?? OWN[tag] as F.Kind])),
  { domain_of: C.untyped, literal: native, reads });

/** A term of the Cpp dialect, written through the builders where it is given (a spec). */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

/** C's writers, writing C++'s terms: a name used as an expression is an `idexpression`, holding its `Name`. */
class Writers extends C.Writers<Writer> {
  /** The identifier `name` used as an expression: an `idexpression` holding it. */
  override identifier = (name: string): Writer => new this.writer((u: any) => u.idexpression(
    (r: any) => r.name((n: any) => n.identifier((i: any) => i.spelling(name)))));
}

const WRITERS = new Writers(DIALECT, Writer);
export const { literal, identifier, unary, binary, conditional, cast, member, subscript, call } = WRITERS;
