/**
 * Expressions of the C dialect: every expression of C, C11 to C23, as mbse-programs has them, with the type names
 * expressions hold.
 *
 * The dialect is complete over C's expression syntax (mbse-basis [CAP-229: the C expression
 * dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md), by [CAP-226: complete expression
 * dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md)'s rules). Its terms are values of its `Term`,
 * `Expressions.C.Expressions.Term`, the branch `c` of `Expressions.Framework.Term`, which `install` defines and adds to
 * `Expressions.Framework.Term` by schema extension. Its kinds are mbse-programs' Ccpp expression kinds that C has
 * (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/Syntax.py`), with mbse-programs' names, lowercased as branch tags
 * (`binaryexpression`), and its properties in source order (`template_keyword`, `trailing_comma`), each a value object
 * `Expressions.C.Expressions.<Kind>`; a property only C++ has is not C's (`Cpp` defines its own copy of each kind the
 * two share, holding C++'s terms). A name is as the grammar makes it (the dialects proposal, Decided): where
 * mbse-programs holds a `Name`, C holds its `Name` union, whose one branch is `identifier`
 * (`Expressions.C.Expressions.Identifier`, its `spelling`), C's one name; where it holds an `Identifier`, an
 * `Identifier`; where it holds a `str` (an attribute's name), a `str`. A term carries no domain. Its kinds:
 *
 * - Literals: `literal` (`Expressions.C.Expressions.Literal`, refining the framework's `literal`, mbse-basis
 * [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md): an integer, a floating, a character
 * or
 *   a string literal, or C23's `true` and `false`, with what its text encodes, mbse-basis
 * [PRI-023: domain representations](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-023): an encoding `prefix` (`L`, `u8`, `u`,
 *   `U`), its `quote` (`'` for a character, whose value is its code, an int, or `"` for a string), an integer's `base`,
 *   `separators` (C23's `'` between digits) and its `suffix` as written (`u`, `ULL`, `f`, `wb`)); `constant`, C's own,
 *   for what no schema holds, C23's `nullptr` (its `singleton`), with its spelling too; `concatenatedstring`, adjacent
 *   string literals (`parts`), as written.
 * - `variable`: the framework's, an identifier used as an expression (mbse-programs' `IdExpression` of an
 *   `Identifier`).
 * - Primaries and postfix expressions: `parenthesizedexpression`, parentheses written in the source; `genericselection`
 *   (`_Generic`, its `associations` each a `genericassociation`); `subscriptexpression` (`object`, `indices`);
 *   `callexpression` (`function`, any term, and `arguments`); `memberexpression` (`object`, `operator` `.` or `->`,
 *   `member`); `postfixexpression` (`++`, `--`); `compoundliteralexpression` (`(type){items}`).
 * - Unary and other operators: `unaryexpression` (`+ - ! ~ * & ++ --`), `sizeofexpression`, `alignofexpression`
 *   (`keyword` as written: `_Alignof`, C23's `alignof`), `castexpression` (`(type) operand`, to any type name),
 *   `binaryexpression`, `conditionalexpression` (`condition ? consequence : alternative`, the GNU `condition ?:
 *   alternative` without a consequence), `assignmentexpression`.
 * - Initializers: `initializerlist` (`{items}`, with `trailing_comma`), whose items may be `designatedinitializer`s
 *   (`.x = 1`, `[2].y = 3`).
 * - GNU extensions, outside every standard as mbse-programs marks them (`EXTENSIONS`): `statementexpression` (`({ ...
 *   })`, whose body of statements is not part of the term: the dialects proposal, Decided, 5, "(i)") and
 *   `extensionexpression` (`__extension__ operand`).
 * - `typeid`, a type name where a position holds an expression or a type alike (`sizeof(int)`, `_Generic`'s
 *   controlling operand, `offsetof(struct s, m)`'s first argument).
 * - The framework's kinds of invalid syntax, `error` and `missing`.
 *
 * The sublanguages are unions of their own beside `Term` (the dialects proposal, Decided, 5):
 * `Expressions.C.Expressions.Type`, a type name (`typeid`: its `specifiers` and its abstract `declarator`), held by a
 * cast, a compound literal, a generic association and an enumeration's fixed type, and
 * `Expressions.C.Expressions.Pattern`, for binding targets, which every dialect has ("(ii)"): no C expression binds a
 * name, so it holds invalid syntax alone. As the user decided ("(b)"), one schema is a branch of every union whose
 * positions hold it: `Term` lists `typeid`, for the positions that hold an expression or a type, and
 * `designatedinitializer`, for an initializer list's items. A type name's parts are helpers, each union named after
 * mbse-programs' category: `Specifier` (keywords, a named type, a struct, union or enum, C23's `typeof`,
 * `_Atomic(type)`, C23's `_BitInt(width)`, and, as `TypeId` lists them among its specifiers, the attribute specifiers),
 * `Declarator` (an identifier, a pointer, an array, a function, parentheses), `Parameter`, `AttributeSpecifier`,
 * `Designator` and `Initializer`. A struct's or an enum's body, its member or enumerator declarations, is not part of
 * the term ("(i)"): `body` says whether it has one. The framework reads a value of a sublanguage, as of any helper, as
 * a `Terms.Part`.
 *
 * The editions C covers are data, which `define` writes, each owned by its designation and holding the kinds it has
 * (`Framework.Standards`): ISO/IEC 9899:2011, 2018 and 2024, C11, C17 and C23 (C17 is C11's corrigenda, with no new
 * syntax), every kind in each but `constant` (`nullptr`), C23's alone, and an extension in none. `DIALECT` reads the
 * kinds (`Terms.Dialect`). The writers (`literal`, `identifier`, `binary`, `cast`, ...) write the kinds C evaluated
 * before it was complete through the builders, in a transaction, a cast's type a spec of `Type`, written through the
 * builders too: `store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`; every other term is written
 * through the builders (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)).
 * `Text.ToText` writes an expression as C source, with C's precedence, e.g. `x.width >= 8u && (uint8_t)(a + b) == 0`.
 *
 * Its kind of domain, the branch of its union `Expressions.C.Expressions.DomainKind`, which `install` adds to the
 * framework's `Expressions.Framework.DomainKind` as the branch `c`: the token `nullptr_t` (`OfNullptr`), C23's, with
 * the inferred `ordered`; its domain has no schema, its value a `constant`'s, and C++'s is Cpp's own. `install` also
 * adds its domains' schemas, each an `OfAny` of the scalar it narrows (`Expressions.C.Expressions.int32_t`, of ints;
 * `_Float128`'s and the decimal types', of text), named as a dotted identifier spells its type, with no leading `_`,
 * which mbse-schemas' frames do not take (`_Float16`'s is `Expressions.C.Expressions.Float16`); `define` writes its
 * domains, the types C's standard fixes (`bool`, `int8_t` to `uint64_t`, the `_FloatN` and decimal types, `nullptr_t`),
 * owned by name. What C leaves to the implementation (`int`, `long`, `char`, `long double`, `size_t`, ...) is the
 * domains of an ABI's dialect (`@mbse/expressions/SystemV/AMD64`, `@mbse/expressions/Arm/AAPCS64`), which a C term's
 * holder names through its adjacency `abi`: `store.Expressions.C.Expressions.Expression((e) =>
 * e.root(...).abi([store.Instances.Expressions.SystemV.AMD64]))`.
 *
 * What reads a named type reads its stored domain, through the store of the term's holder (`Domains.Types`), among C's
 * domains, then among its holder's ABI's: validation, a literal's range (`5u`'s `unsigned int`); inference, a literal's
 * type, a cast's, a comparison's `bool`, `sizeof`'s `size_t`; and evaluation (see `Evaluators`). A lone term reaches no
 * store: reading a type, it is refused (mbse-schemas' TypeError, "the value does not belong to a store"); and a type
 * neither dialect defines is refused by name, "'int' is not a type C defines, and its expression names no ABI", which
 * validation reports as a problem.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Errors, Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as CPreprocessor from "../Preprocessor/Expressions.js";
import * as CTypes from "../Types/Expressions.js";
import * as Domains from "./Domains.js";

const { ValueError } = Errors;
const { repr } = Repr;

export const [LITERAL, CONSTANT, CONCATENATEDSTRING, VARIABLE] = ["literal", "constant", "concatenatedstring",
    "variable"] as const;
export const [PARENTHESIZEDEXPRESSION, GENERICSELECTION, SUBSCRIPTEXPRESSION, CALLEXPRESSION] = [
  "parenthesizedexpression", "genericselection", "subscriptexpression", "callexpression"] as const;
export const [MEMBEREXPRESSION, POSTFIXEXPRESSION, UNARYEXPRESSION, SIZEOFEXPRESSION] = [
  "memberexpression", "postfixexpression", "unaryexpression", "sizeofexpression"] as const;
export const [ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION] = [
  "alignofexpression", "castexpression", "binaryexpression", "conditionalexpression"] as const;
export const [ASSIGNMENTEXPRESSION, INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION] = [
  "assignmentexpression", "initializerlist", "designatedinitializer", "compoundliteralexpression"] as const;
export const [STATEMENTEXPRESSION, EXTENSIONEXPRESSION, TYPEID] = ["statementexpression", "extensionexpression",
    "typeid"] as const;

/** GNU's extensions, outside every standard, as mbse-programs marks them. */
export const EXTENSIONS: ReadonlySet<string> = new Set([STATEMENTEXPRESSION, EXTENSIONEXPRESSION]);

/** A character's or a string's encoding prefixes. */
export const PREFIXES: readonly string[] = ["L", "u8", "u", "U"];

/** A character literal's quote, and a string's. */
export const QUOTES: readonly string[] = ["'", '"'];

/** The suffixes a language writes, by the type of the literal's value: an integer's (a bigint's) and a floating
 * literal's (a number's), each a pattern its whole suffix matches. */
export interface Suffixes {
  readonly integer: RegExp;
  readonly floating: RegExp;
}

/** The suffixes C writes, by the type of the literal's value: an integer's (`u`, `l`, `ll`, C23's `wb`, in either case
 * and order) and a floating literal's (`f`, `l`, C23's decimal and interchange types' `df`, `f32`). */
export const SUFFIXES: Suffixes = {
  integer: /^(?:u?(?:l|ll|wb)?|(?:l|ll|wb)u)$/i,
  floating: /^(?:[fFlL]|df|dd|dl|DF|DD|DL|[fF](?:16|32|64|128|32x|64x|128x))$/,
};

/** C's union of its kinds, added to the framework's terms as the branch `c`, its own kinds, its sublanguages' unions
 * (`Type`, `Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
 * `Expressions.C.Expressions`: run after `Framework.install`, in a transaction of its own; run again, it writes
 * nothing. Its holder, `Expressions.C.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root`
 * narrowed to its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.C.Expressions/1")
      .mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Kinds: S.OfUnion, DomainKind: S.OfUnion, OfNullptr: S.OfObject, // Kinds: the framework's
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Type: S.OfUnion, Pattern: S.OfUnion, Name: S.OfUnion, Specifier: S.OfUnion, Declarator: S.OfUnion,
      Parameter: S.OfUnion, AttributeSpecifier: S.OfUnion, Designator: S.OfUnion,
      Initializer: S.OfUnion, Expression: S.OfObject,
      Literal: S.OfObject, Constant: S.OfObject, ConcatenatedString: S.OfObject,
      ParenthesizedExpression: S.OfObject, GenericSelection: S.OfObject,
      GenericAssociation: S.OfObject, SubscriptExpression: S.OfObject, CallExpression: S.OfObject,
      MemberExpression: S.OfObject, PostfixExpression: S.OfObject, UnaryExpression: S.OfObject,
      SizeofExpression: S.OfObject, AlignofExpression: S.OfObject, CastExpression: S.OfObject,
      BinaryExpression: S.OfObject, ConditionalExpression: S.OfObject,
      AssignmentExpression: S.OfObject, InitializerList: S.OfObject,
      DesignatedInitializer: S.OfObject, FieldDesignator: S.OfObject, IndexDesignator: S.OfObject,
      EqualInitializer: S.OfObject, CompoundLiteralExpression: S.OfObject,
      StatementExpression: S.OfObject, ExtensionExpression: S.OfObject, TypeId: S.OfObject,
      DeclSpecifier: S.OfObject, CvQualifier: S.OfObject, PrimitiveTypeSpecifier: S.OfObject,
      NamedTypeSpecifier: S.OfObject, ClassSpecifier: S.OfObject, EnumSpecifier: S.OfObject,
      PlaceholderTypeSpecifier: S.OfObject, TypeofSpecifier: S.OfObject,
      AtomicTypeSpecifier: S.OfObject, BitIntSpecifier: S.OfObject, IdDeclarator: S.OfObject,
      PointerDeclarator: S.OfObject, ArrayDeclarator: S.OfObject, FunctionDeclarator: S.OfObject,
      ParenthesizedDeclarator: S.OfObject, ParameterDeclaration: S.OfObject,
      EllipsisParameter: S.OfObject, StandardAttributeSpecifier: S.OfObject,
      Attribute: S.OfObject, AlignasSpecifier: S.OfObject, GnuAttributeSpecifier: S.OfObject,
      DeclspecSpecifier: S.OfObject, Identifier: S.OfObject, // FrameworkTerm: the framework's, by name
      bool: S.OfAny, int8_t: S.OfAny, int16_t: S.OfAny, int32_t: S.OfAny, int64_t: S.OfAny, // its domains' schemas
      uint8_t: S.OfAny, uint16_t: S.OfAny, uint32_t: S.OfAny, uint64_t: S.OfAny,
      Float16: S.OfAny, Float32: S.OfAny, Float64: S.OfAny, Float128: S.OfAny,
      Decimal32: S.OfAny, Decimal64: S.OfAny, Decimal128: S.OfAny })
    .spec([
      // its dialect: the singleton `Expressions.C.Expressions`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.C.Expressions.Dialect").ref(true).singleton("Expressions.C.Expressions")
          .adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("c").schema([_.Dialect])]),
      // its union of its kinds: its own, the framework's it reuses, a type name, an initializer list's
      // designated items, and invalid syntax
      (_: any) => _.Term.name("Expressions.C.Expressions.Term").branches([
        (t: any) => t.name("literal").schema([_.Literal]),
        (t: any) => t.name("constant").schema([_.Constant]),
        (t: any) => t.name("concatenatedstring").schema([_.ConcatenatedString]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("parenthesizedexpression").schema([_.ParenthesizedExpression]),
        (t: any) => t.name("genericselection").schema([_.GenericSelection]),
        (t: any) => t.name("subscriptexpression").schema([_.SubscriptExpression]),
        (t: any) => t.name("callexpression").schema([_.CallExpression]),
        (t: any) => t.name("memberexpression").schema([_.MemberExpression]),
        (t: any) => t.name("postfixexpression").schema([_.PostfixExpression]),
        (t: any) => t.name("unaryexpression").schema([_.UnaryExpression]),
        (t: any) => t.name("sizeofexpression").schema([_.SizeofExpression]),
        (t: any) => t.name("alignofexpression").schema([_.AlignofExpression]),
        (t: any) => t.name("castexpression").schema([_.CastExpression]),
        (t: any) => t.name("binaryexpression").schema([_.BinaryExpression]),
        (t: any) => t.name("conditionalexpression").schema([_.ConditionalExpression]),
        (t: any) => t.name("assignmentexpression").schema([_.AssignmentExpression]),
        (t: any) => t.name("initializerlist").schema([_.InitializerList]),
        (t: any) => t.name("designatedinitializer").schema([_.DesignatedInitializer]),
        (t: any) => t.name("compoundliteralexpression").schema([_.CompoundLiteralExpression]),
        (t: any) => t.name("statementexpression").schema([_.StatementExpression]),
        (t: any) => t.name("extensionexpression").schema([_.ExtensionExpression]),
        (t: any) => t.name("typeid").schema([_.TypeId]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its type names, and invalid syntax
      (_: any) => _.Type.name("Expressions.C.Expressions.Type").branches([
        (t: any) => t.name("typeid").schema([_.TypeId]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its binding targets: no C expression binds a name, so invalid syntax alone ("(ii)")
      (_: any) => _.Pattern.name("Expressions.C.Expressions.Pattern").branches([
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its names: an identifier, C's one name (mbse-programs' `Name`)
      (_: any) => _.Name.name("Expressions.C.Expressions.Name").branches([
        (t: any) => t.name("identifier").schema([_.Identifier]),
      ]),
      // a type name's specifiers, the attribute specifiers among them (mbse-programs' `Specifier`)
      (_: any) => _.Specifier.name("Expressions.C.Expressions.Specifier").branches([
        (t: any) => t.name("declspecifier").schema([_.DeclSpecifier]),
        (t: any) => t.name("cvqualifier").schema([_.CvQualifier]),
        (t: any) => t.name("primitivetypespecifier").schema([_.PrimitiveTypeSpecifier]),
        (t: any) => t.name("namedtypespecifier").schema([_.NamedTypeSpecifier]),
        (t: any) => t.name("classspecifier").schema([_.ClassSpecifier]),
        (t: any) => t.name("enumspecifier").schema([_.EnumSpecifier]),
        (t: any) => t.name("placeholdertypespecifier").schema([_.PlaceholderTypeSpecifier]),
        (t: any) => t.name("typeofspecifier").schema([_.TypeofSpecifier]),
        (t: any) => t.name("atomictypespecifier").schema([_.AtomicTypeSpecifier]),
        (t: any) => t.name("bitintspecifier").schema([_.BitIntSpecifier]),
        (t: any) => t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
        (t: any) => t.name("alignasspecifier").schema([_.AlignasSpecifier]),
        (t: any) => t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
        (t: any) => t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
      ]),
      (_: any) => _.Declarator.name("Expressions.C.Expressions.Declarator").branches([
        (t: any) => t.name("iddeclarator").schema([_.IdDeclarator]),
        (t: any) => t.name("pointerdeclarator").schema([_.PointerDeclarator]),
        (t: any) => t.name("arraydeclarator").schema([_.ArrayDeclarator]),
        (t: any) => t.name("functiondeclarator").schema([_.FunctionDeclarator]),
        (t: any) => t.name("parenthesizeddeclarator").schema([_.ParenthesizedDeclarator]),
      ]),
      (_: any) => _.Parameter.name("Expressions.C.Expressions.Parameter").branches([
        (t: any) => t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
        (t: any) => t.name("ellipsisparameter").schema([_.EllipsisParameter]),
      ]),
      (_: any) => _.AttributeSpecifier.name("Expressions.C.Expressions.AttributeSpecifier").branches([
        (t: any) => t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
        (t: any) => t.name("alignasspecifier").schema([_.AlignasSpecifier]),
        (t: any) => t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
        (t: any) => t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
      ]),
      (_: any) => _.Designator.name("Expressions.C.Expressions.Designator").branches([
        (t: any) => t.name("fielddesignator").schema([_.FieldDesignator]),
        (t: any) => t.name("indexdesignator").schema([_.IndexDesignator]),
      ]),
      (_: any) => _.Initializer.name("Expressions.C.Expressions.Initializer").branches([
        (t: any) => t.name("equalinitializer").schema([_.EqualInitializer]),
        (t: any) => t.name("initializerlist").schema([_.InitializerList]),
      ]),
      // literals
      (_: any) => _.Literal.name("Expressions.C.Expressions.Literal").refines([Framework.Literal]).properties({
        prefix: S.OfStr, // a character's or a string's encoding: `L`, `u8`, `u` or `U`
        quote: S.OfStr, // `'` for a character, whose value is its code, or `"` for a string
        base: S.OfInt, // an integer's base: 2, 8, 10 or 16
        separators: S.OfBool, // whether `'` groups its digits (C23)
        suffix: S.OfStr, // an integer's or a floating literal's suffix, as written: `u`, `ULL`, `f`
      }),
      (_: any) => _.Constant.name("Expressions.C.Expressions.Constant").properties({
        singleton: S.OfStr, // `nullptr`
        text: S.OfStr, // its spelling, unvalidated
        problems: many(S.OfStr), // what is wrong with it
      }),
      (_: any) => _.ConcatenatedString.name("Expressions.C.Expressions.ConcatenatedString")
          .properties({parts: many(_.Term)}),
      // primary and postfix expressions
      (_: any) => _.ParenthesizedExpression.name("Expressions.C.Expressions.ParenthesizedExpression").properties({
        expression: _.Term}),
      (_: any) => _.GenericSelection.name("Expressions.C.Expressions.GenericSelection").properties({
        controlling: _.Term, associations: many(_.GenericAssociation)}),
      (_: any) => _.GenericAssociation.name("Expressions.C.Expressions.GenericAssociation").properties({
        type: _.Type, // absent: `default`
        value: _.Term}),
      (_: any) => _.SubscriptExpression.name("Expressions.C.Expressions.SubscriptExpression").properties({
        object: _.Term, indices: many(_.Term)}),
      (_: any) => _.CallExpression.name("Expressions.C.Expressions.CallExpression").properties({
        function: _.Term, arguments: many(_.Term)}),
      (_: any) => _.MemberExpression.name("Expressions.C.Expressions.MemberExpression").properties({
        object: _.Term, operator: S.OfStr, member: _.Name}),
      (_: any) => _.PostfixExpression.name("Expressions.C.Expressions.PostfixExpression").properties({
        operand: _.Term, operator: S.OfStr}),
      (_: any) => _.CompoundLiteralExpression.name("Expressions.C.Expressions.CompoundLiteralExpression").properties({
        type: _.Type, initializer: _.InitializerList}),
      // unary and other operators
      (_: any) => _.UnaryExpression.name("Expressions.C.Expressions.UnaryExpression").properties({
        operator: S.OfStr, operand: _.Term}),
      (_: any) => _.SizeofExpression.name("Expressions.C.Expressions.SizeofExpression").properties({operand: _.Term}),
      (_: any) => _.AlignofExpression.name("Expressions.C.Expressions.AlignofExpression").properties({
        keyword: S.OfStr, operand: _.Term}),
      (_: any) => _.CastExpression.name("Expressions.C.Expressions.CastExpression").properties({
        type: _.Type, operand: _.Term}),
      (_: any) => _.BinaryExpression.name("Expressions.C.Expressions.BinaryExpression").properties({
        left: _.Term, operator: S.OfStr, right: _.Term}),
      (_: any) => _.ConditionalExpression.name("Expressions.C.Expressions.ConditionalExpression").properties({
        condition: _.Term, consequence: _.Term, alternative: _.Term}),
      (_: any) => _.AssignmentExpression.name("Expressions.C.Expressions.AssignmentExpression").properties({
        left: _.Term, operator: S.OfStr, right: _.Term}),
      // initializers
      (_: any) => _.InitializerList.name("Expressions.C.Expressions.InitializerList").properties({
        items: many(_.Term), trailing_comma: S.OfBool}),
      (_: any) => _.DesignatedInitializer.name("Expressions.C.Expressions.DesignatedInitializer").properties({
        designators: many(_.Designator), initializer: _.Initializer}),
      (_: any) => _.FieldDesignator.name("Expressions.C.Expressions.FieldDesignator").properties({name: _.Identifier}),
      (_: any) => _.IndexDesignator.name("Expressions.C.Expressions.IndexDesignator").properties({
        index: _.Term, last: _.Term}), // last: GNU's range, `[index ... last]`
      (_: any) => _.EqualInitializer.name("Expressions.C.Expressions.EqualInitializer").properties({value: _.Term}),
      // GNU's extensions: a statement expression's body of statements is not part of the term
      (_: any) => _.StatementExpression.name("Expressions.C.Expressions.StatementExpression"),
      (_: any) => _.ExtensionExpression.name("Expressions.C.Expressions.ExtensionExpression")
          .properties({operand: _.Term}),
      // type names: specifiers and an abstract declarator
      (_: any) => _.TypeId.name("Expressions.C.Expressions.TypeId").properties({
        specifiers: many(_.Specifier), declarator: _.Declarator}),
      (_: any) => _.DeclSpecifier.name("Expressions.C.Expressions.DeclSpecifier").properties({keyword: S.OfStr}),
      (_: any) => _.CvQualifier.name("Expressions.C.Expressions.CvQualifier").properties({keyword: S.OfStr}),
      (_: any) => _.PrimitiveTypeSpecifier.name("Expressions.C.Expressions.PrimitiveTypeSpecifier").properties({
        keyword: S.OfStr}),
      (_: any) => _.NamedTypeSpecifier.name("Expressions.C.Expressions.NamedTypeSpecifier").properties({name: _.Name}),
      (_: any) => _.ClassSpecifier.name("Expressions.C.Expressions.ClassSpecifier").properties({
        key: S.OfStr, attributes: many(_.AttributeSpecifier), name: _.Name,
        body: S.OfBool}), // whether it has a body, whose member declarations are not part of the term
      (_: any) => _.EnumSpecifier.name("Expressions.C.Expressions.EnumSpecifier").properties({
        key: S.OfStr, attributes: many(_.AttributeSpecifier), name: _.Name, base: _.Type,
        body: S.OfBool}), // whether it has a body, whose enumerators are not part of the term
      (_: any) => _.PlaceholderTypeSpecifier.name("Expressions.C.Expressions.PlaceholderTypeSpecifier"),
      (_: any) => _.TypeofSpecifier.name("Expressions.C.Expressions.TypeofSpecifier").properties({
        keyword: S.OfStr, operand: _.Term}),
      (_: any) => _.AtomicTypeSpecifier.name("Expressions.C.Expressions.AtomicTypeSpecifier")
          .properties({type: _.Type}),
      (_: any) => _.BitIntSpecifier.name("Expressions.C.Expressions.BitIntSpecifier").properties({width: _.Term}),
      (_: any) => _.IdDeclarator.name("Expressions.C.Expressions.IdDeclarator").properties({
        name: _.Name, attributes: many(_.AttributeSpecifier)}),
      (_: any) => _.PointerDeclarator.name("Expressions.C.Expressions.PointerDeclarator").properties({
        attributes: many(_.AttributeSpecifier), qualifiers: many(_.CvQualifier),
        declarator: _.Declarator}),
      (_: any) => _.ArrayDeclarator.name("Expressions.C.Expressions.ArrayDeclarator").properties({
        declarator: _.Declarator, static: S.OfBool, qualifiers: many(_.CvQualifier), size: _.Term,
        star: S.OfBool, attributes: many(_.AttributeSpecifier)}),
      (_: any) => _.FunctionDeclarator.name("Expressions.C.Expressions.FunctionDeclarator").properties({
        declarator: _.Declarator, parameters: many(_.Parameter),
        attributes: many(_.AttributeSpecifier)}),
      (_: any) => _.ParenthesizedDeclarator.name("Expressions.C.Expressions.ParenthesizedDeclarator").properties({
        declarator: _.Declarator}),
      (_: any) => _.ParameterDeclaration.name("Expressions.C.Expressions.ParameterDeclaration").properties({
        attributes: many(_.AttributeSpecifier), specifiers: many(_.Specifier),
        declarator: _.Declarator}),
      (_: any) => _.EllipsisParameter.name("Expressions.C.Expressions.EllipsisParameter"),
      // names
      (_: any) => _.Identifier.name("Expressions.C.Expressions.Identifier").properties({spelling: S.OfStr}),
      // attributes
      (_: any) => _.StandardAttributeSpecifier.name("Expressions.C.Expressions.StandardAttributeSpecifier").properties({
        attributes: many(_.Attribute)}),
      (_: any) => _.Attribute.name("Expressions.C.Expressions.Attribute").properties({
        namespace: S.OfStr, name: S.OfStr, arguments: many(_.Term)}),
      (_: any) => _.AlignasSpecifier.name("Expressions.C.Expressions.AlignasSpecifier").properties({
        keyword: S.OfStr, operand: _.Term}),
      (_: any) => _.GnuAttributeSpecifier.name("Expressions.C.Expressions.GnuAttributeSpecifier").properties({
        keyword: S.OfStr, attributes: many(_.Attribute)}),
      (_: any) => _.DeclspecSpecifier.name("Expressions.C.Expressions.DeclspecSpecifier").properties({
        attributes: many(_.Attribute)}),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
      // narrowed to its `Term`
      (_: any) => _.Expression.name("Expressions.C.Expressions.Expression").ref(true).refines([Framework.Expression])
          .properties({
        root: _.Term}),
      // --- its kind of domain: the token of `nullptr`, its own, not C++'s; inferred `ordered` ---
      (_: any) => _.OfNullptr.name("Expressions.C.Expressions.OfNullptr").properties({ ordered: S.OfBool }),
      (_: any) => _.DomainKind.name("Expressions.C.Expressions.DomainKind").branches([
        (t: any) => t.name("nullptr_t").schema([_.OfNullptr]),
      ]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("c").schema([_.DomainKind])]),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("c").schema([_.Term])]),
      // --- its domains' schemas, each an OfAny of the scalar it narrows (a format whose values are text, `str`), which
      // `define` relates to its domain; `nullptr_t`'s has none ---
      (_: any) => _.bool.name("Expressions.C.Expressions.bool").schemas([S.OfBool]),
      (_: any) => _.int8_t.name("Expressions.C.Expressions.int8_t").schemas([S.OfInt]),
      (_: any) => _.int16_t.name("Expressions.C.Expressions.int16_t").schemas([S.OfInt]),
      (_: any) => _.int32_t.name("Expressions.C.Expressions.int32_t").schemas([S.OfInt]),
      (_: any) => _.int64_t.name("Expressions.C.Expressions.int64_t").schemas([S.OfInt]),
      (_: any) => _.uint8_t.name("Expressions.C.Expressions.uint8_t").schemas([S.OfInt]),
      (_: any) => _.uint16_t.name("Expressions.C.Expressions.uint16_t").schemas([S.OfInt]),
      (_: any) => _.uint32_t.name("Expressions.C.Expressions.uint32_t").schemas([S.OfInt]),
      (_: any) => _.uint64_t.name("Expressions.C.Expressions.uint64_t").schemas([S.OfInt]),
      (_: any) => _.Float16.name("Expressions.C.Expressions.Float16").schemas([S.OfFloat]),
      (_: any) => _.Float32.name("Expressions.C.Expressions.Float32").schemas([S.OfFloat]),
      (_: any) => _.Float64.name("Expressions.C.Expressions.Float64").schemas([S.OfFloat]),
      (_: any) => _.Float128.name("Expressions.C.Expressions.Float128").schemas([S.OfStr]),
      (_: any) => _.Decimal32.name("Expressions.C.Expressions.Decimal32").schemas([S.OfStr]),
      (_: any) => _.Decimal64.name("Expressions.C.Expressions.Decimal64").schemas([S.OfStr]),
      (_: any) => _.Decimal128.name("Expressions.C.Expressions.Decimal128").schemas([S.OfStr]),
    ])]))]);
}

/** C's dialect as data: the singleton `Expressions.C.Expressions` owning its domains by name (`domains`, through
 * `Expressions.Framework.Defines`), the types C's standard fixes, each with its parameters and its inferred properties,
 * and each but `nullptr_t`'s related to its schema (`Expressions.C.Expressions.int32_t`) by
 * `Expressions.Framework.HasDomain`: `bool` (11404's `boolean`); `int8_t` to `int64_t` (11404's `integer`, raising on
 * overflow, as C leaves it undefined) and `uint8_t` to `uint64_t` (11404's `modulo`, wrapping); `_Float16`, `_Float32`,
 * `_Float64` and `_Float128` (IEEE 754's `binary16` to `binary128`) and `_Decimal32`, `_Decimal64` and `_Decimal128`
 * (its decimal formats), each rounding ties to even; and `nullptr_t`, of C's own kind. What C leaves to the
 * implementation (`int`, `long`, `char`, `long double`, `size_t`, ...) is each ABI dialect's. And the editions of C it
 * covers, by designation (`standards`, through `Expressions.Framework.Covers`), each with its formal reference's parts,
 * its common name and the kinds it has. Run after `install`, in a transaction of its own; run again, it writes nothing.
 * Its frame binds the dialect (`dialect`), each edition by its common name (`C11`) and each domain by its name:
 * `store.transaction(C.define)[0].get("int32_t")`. */
export function define(txn: any): any {
  const OWN = txn.Expressions.C.Expressions;
  const Domain = txn.Expressions.Framework.Domain, Standard = txn.Expressions.Framework.Standard;
  const every = new Map((OWN.Term.as_schema().branches as { name: string; schema: unknown }[]) // each kind's schema,
    .filter((b) => !EXTENSIONS.has(b.name) && !F.INVALID_KINDS.has(b.name)) // by its tag, but an extension and
    .map((b) => [b.name, b.schema])); // invalid syntax
  return txn.uid("mbse.Expressions.C.Expressions.define/1")
      .mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      dialect: OWN.Dialect, C11: Standard, C17: Standard, C23: Standard,
      bool: Domain, int8_t: Domain, int16_t: Domain, int32_t: Domain, int64_t: Domain,
      uint8_t: Domain, uint16_t: Domain, uint32_t: Domain, uint64_t: Domain,
      Float16: Domain, Float32: Domain, Float64: Domain, Float128: Domain,
      Decimal32: Domain, Decimal64: Domain, Decimal128: Domain, nullptr_t: Domain,
    })
    .spec([
      // --- the editions C covers, each by its designation, with the kinds it has: every kind but GNU's extensions and
      // invalid syntax, `constant` (`nullptr`) C23's alone; C17 is C11's corrigenda ---
      (_: any) => _.dialect.standards({
        "ISO/IEC 9899:2011": (e: any) => e.standard(_.C11), "ISO/IEC 9899:2018": (e: any) => e.standard(_.C17),
        "ISO/IEC 9899:2024": (e: any) => e.standard(_.C23) }),
      (_: any) => _.C11.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2011n)).names(
        ["C11"]).kinds(
        [...every].filter(([tag]) => tag !== CONSTANT).map(([, schema]) => schema)),
      (_: any) => _.C17.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2018n)).names(
        ["C17"]).kinds(
        [...every].filter(([tag]) => tag !== CONSTANT).map(([, schema]) => schema)),
      (_: any) => _.C23.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2024n)).names(
        ["C23"]).kinds(
        [...every.values()]),
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
        "_Float16": (e: any) => e.domain(_.Float16),
        "_Float32": (e: any) => e.domain(_.Float32),
        "_Float64": (e: any) => e.domain(_.Float64),
        "_Float128": (e: any) => e.domain(_.Float128),
        "_Decimal32": (e: any) => e.domain(_.Decimal32),
        "_Decimal64": (e: any) => e.domain(_.Decimal64),
        "_Decimal128": (e: any) => e.domain(_.Decimal128),
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
      (_: any) => _.Float16.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary16").rounding("roundTiesToEven").width(16n)
          .radix(2n).precision(11n).emax(15n).ordered(true)))))).schema([OWN.Float16]),
      (_: any) => _.Float32.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary32").rounding("roundTiesToEven").width(32n)
          .radix(2n).precision(24n).emax(127n).ordered(true)))))).schema([OWN.Float32]),
      (_: any) => _.Float64.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n)
          .radix(2n).precision(53n).emax(1023n).ordered(true)))))).schema([OWN.Float64]),
      (_: any) => _.Float128.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary128").rounding("roundTiesToEven").width(128n)
          .radix(2n).precision(113n).emax(16383n).ordered(true)))))).schema([OWN.Float128]),
      (_: any) => _.Decimal32.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("decimal32").rounding("roundTiesToEven").width(32n)
          .radix(10n).precision(7n).emax(96n).ordered(true)))))).schema([OWN.Decimal32]),
      (_: any) => _.Decimal64.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("decimal64").rounding("roundTiesToEven").width(64n)
          .radix(10n).precision(16n).emax(384n).ordered(true)))))).schema([OWN.Decimal64]),
      (_: any) => _.Decimal128.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("decimal128").rounding("roundTiesToEven").width(128n)
          .radix(10n).precision(34n).emax(6144n).ordered(true)))))).schema([OWN.Decimal128]),
      (_: any) => _.nullptr_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.c((v: any) => v.nullptr_t(
        (d: any) => d.ordered(false)))))),
    ])]))]);
}

// --- Reading a term's type name, and what its helpers bind and check ---

type Held = F.Node | readonly F.Node[] | undefined;

/** A helper property's nodes: none where it is absent, one, or each of many. */
function nodes(value: Held): readonly F.Node[] {
  if (value === undefined) return [];
  return value instanceof F.Node ? [value] : value;
}

/** A name's spelling: an identifier's `spelling` (a `Terms.Part` or a `Node`), or null for any other name, or none. */
export function spelling(name: F.Part | F.Node | undefined): string | null {
  return name !== undefined && name.kind === "identifier" ? (name.attributes.get("spelling") ?? null) as string | null
    : null;
}

/** The name of the arithmetic type a type name names (a `typeid`'s `Terms.Part`, as a cast's form holds it), by
 * `Domains.arithmetic` (`unsigned int`, `uint8_t`), or null: a type with a declarator, or of a specifier that is not a
 * keyword or a type's name. Whether a store defines it is the store's (`Domains.Types`). */
export function typeName(part: F.Part | null | undefined): string | null {
  if (part === null || part === undefined || part.kind !== TYPEID || part.attributes.has("declarator")) return null;
  const names: (string | null)[] = [];
  for (const specifier of (part.attributes.get("specifiers") ?? []) as F.Part[]) {
    if (specifier.kind === "primitivetypespecifier" || specifier.kind === "cvqualifier") {
      names.push((specifier.attributes.get("keyword") ?? null) as string | null);
    } else if (specifier.kind === "namedtypespecifier") {
      names.push(spelling(specifier.attributes.get("name") as F.Part | undefined));
    } else return null;
  }
  return Domains.arithmetic(names);
}

/** The name a declarator declares, within its parentheses, pointers, arrays and functions: none, if abstract. */
function declared(node: F.Node | undefined): ReadonlySet<string> {
  while (node !== undefined && node.kind !== "iddeclarator") {
    node = node.helpers.get("declarator") as F.Node | undefined;
  }
  if (node === undefined) return new Set();
  const name = spelling(node.helpers.get("name") as F.Node | undefined);
  return new Set(name === null ? [] : [name]);
}

/** The names a function declarator's parameters, a lambda's parameters and init captures, or a requires expression's
 * parameters bind within it: each parameter declaration's declarator's name, each init capture's. */
export function boundNames(node: F.Node): ReadonlySet<string> {
  const held = [...nodes(node.helpers.get("parameters")), ...nodes(node.helpers.get("captures"))];
  const declarator = node.helpers.get("declarator") as F.Node | undefined; // a lambda's, its parameters
  if (declarator !== undefined && node.kind === "lambdaexpression") {
    held.push(...nodes(declarator.helpers.get("parameters")));
  }
  const found = new Set<string>();
  for (const p of held) {
    if (p.kind !== "parameterdeclaration") continue;
    for (const name of declared(p.helpers.get("declarator") as F.Node | undefined)) found.add(name);
  }
  for (const p of held) {
    const name = p.kind === "initcapture" ? spelling(p.helpers.get("name") as F.Node | undefined) : null;
    if (name !== null) found.add(name);
  }
  return found;
}

const BINDERS: ReadonlySet<string> = new Set(["functiondeclarator", "lambdaexpression", "requiresexpression"]);

/** The names each of a node's arguments has bound, in order: within a function declarator, a lambda or a requires
 * expression, its parameters' (and init captures') names; its slots, its variadic arguments, then its helpers'. */
function bound(node: F.Node, inner: ReadonlySet<string>): ReadonlySet<string>[] {
  if (BINDERS.has(node.kind)) inner = new Set([...inner, ...boundNames(node)]);
  const found: ReadonlySet<string>[] = Array.from({ length: node.slots.size + node.many.length }, () => inner);
  for (const value of node.helpers.values()) for (const helper of nodes(value)) found.push(...bound(helper, inner));
  return found;
}

/** What each argument of a kind has bound, besides its scope's: the parameters a function declarator, a lambda or a
 * requires expression declares, within it (`boundNames`). */
export function scopes(tag: string): (record: any) => ReadonlySet<string>[] {
  return (record: any) => bound(F.node(tag, record), new Set());
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** The kinds and helpers that hold an identifier's spelling, and where: the framework's variable, and an identifier,
 * wherever a name is held. */
const NAMES: ReadonlyMap<string, string> = new Map([["variable", "name"], ["identifier", "spelling"]]);

/** An identifier, as mbse-programs checks it: letters, digits, `_` and `$`, not starting with a digit; characters
 * beyond ASCII are taken to be letters. */
function identifierProblems(value: unknown): string[] {
  if (typeof value !== "string" || value === "") return [];
  const ascii = [...value].map((c) => (c.charCodeAt(0) < 128 ? c : "a")).join("");
  return IDENTIFIER.test(ascii) ? [] : [`${repr(value)} is not an identifier`];
}

/** A literal's encoded properties: its prefix, its quote, its base and its suffix, each one its dialect writes, and its
 * value, one of its type (`Domains.outOfRange`). */
function literalProblems(attributes: ReadonlyMap<string, any>, prefixes: readonly string[], suffixes: Suffixes,
  language: string, types: Domains.Types): string[] {
  const problems: string[] = [];
  const [prefix, quote, base, suffix] = ["prefix", "quote", "base", "suffix"].map((name) => attributes.get(name));
  if (prefix !== undefined && !prefixes.includes(prefix)) problems.push(`a literal's prefix cannot be ${repr(prefix)}`);
  if (quote !== undefined && !QUOTES.includes(quote)) problems.push(`a literal's quote cannot be ${repr(quote)}`);
  if (base !== undefined && ![2n, 8n, 10n, 16n].includes(base)) {
    problems.push(`a literal's base cannot be ${repr(base)}`);
  }
  if (suffix !== undefined) {
    const value = attributes.get("value");
    const allowed = typeof value === "bigint" ? suffixes.integer : typeof value === "number" ? suffixes.floating : null;
    if (allowed === null || !allowed.test(suffix)) problems.push(`a literal's suffix cannot be ${repr(suffix)}`);
  }
  let out: string | null;
  try {
    out = Domains.outOfRange(attributes, language, types);
  } catch (error) {
    if (!(error instanceof ValueError)) throw error;
    out = error.message; // its type is not defined in its holder's store
  }
  if (out !== null) problems.push(out);
  return problems;
}

/** A constant holds `nullptr`, unless its text is invalid, its problems said. */
function constantProblems(attributes: ReadonlyMap<string, any>): string[] {
  const singleton = attributes.get("singleton");
  if (singleton === undefined) return attributes.has("problems") ? [] : ["a constant needs a singleton"];
  return singleton === "nullptr" ? [] : [`a constant's singleton must be nullptr, got ${repr(singleton)}`];
}

/** A node's checks, and its helpers' in turn, which the framework's validation does not read within a helper: an
 * identifier's spelling, a literal's encoded properties and its value's range, in `language` (`C` or `C++`), a
 * member's operator, invalid syntax in a sublanguage. */
export function problems(node: F.Node, types: Domains.Types, suffixes: Suffixes = SUFFIXES,
  prefixes: readonly string[] = PREFIXES, language = "C"): string[] {
  const { kind, attributes } = node;
  const found = kind === "error" || kind === "missing" ? F.invalidProblems(kind, attributes) : [];
  found.push(...identifierProblems(attributes.get(NAMES.get(kind) ?? "")));
  const operator = attributes.get("operator");
  if (kind === MEMBEREXPRESSION && operator !== undefined && operator !== "." && operator !== "->") {
    found.push(`a memberexpression's operator must be '.' or '->', got ${repr(operator)}`);
  }
  if (kind === CONSTANT) found.push(...constantProblems(attributes));
  if (kind === LITERAL) found.push(...literalProblems(attributes, prefixes, suffixes, language, types));
  for (const value of node.helpers.values()) {
    for (const inner of nodes(value)) found.push(...problems(inner, types, suffixes, prefixes, language));
  }
  return found;
}

const ANY1 = new FD.Function([FD.Anything], FD.Anything);

/** The slots of a kind's helpers that may be empty, wherever its type names nest them: an array declarator's size, a
 * designator's range's last index, a noexcept specifier's condition, a parameter's default argument, a lambda's or a
 * template parameter's requires clause. */
export const OPTIONAL: readonly string[] = ["*.size", "*.last", "*.condition", "*.default", "*.requires"];

/** The types C's keywords name, which a store's dialects must define; a type's name may be a program's own. */
const KEYWORD_TYPES: ReadonlySet<string> = new Set(Domains.NAMES);

/** The arithmetic type a cast names, by its name (`typeName`), read through `types`: one its keywords name must be
 * defined (`int`), one a type's name names may be a program's own, so not arithmetic (`my_t`); null for a type that is
 * not arithmetic. */
export function castType(name: string | null, types: Domains.Types): Domains.CType | null {
  if (name === null) return null;
  return KEYWORD_TYPES.has(name) ? types.named(name) : types.find(name);
}

const pathOf = (language: string) => (language === "C" ? "C.Expressions" : "Cpp.Expressions");

/** A kind's domain that is `bool`, read from the store of the term's holder (a comparison's, `!`'s, `noexcept`'s). */
export function truth(language: string): (record: any) => FD.Domain {
  return (record) => new Domains.Types(record, pathOf(language)).named("bool");
}

/** `sizeof`'s and `alignof`'s domain, `size_t`, read from the store of the term's holder. */
export function size(language: string): (record: any) => FD.Domain {
  return (record) => new Domains.Types(record, pathOf(language)).named("size_t");
}

const TRUTHS: ReadonlySet<string> = new Set(["<", "<=", ">", ">=", "==", "!=", "&&", "||", "!"]);

/** An operator's domain where it is `bool` (a comparison, `&&`, `||`, `!`), read from the store of the term's holder;
 * null for any other, whose domain is its signature's. */
function operatorTruth(language: string): (record: any) => FD.Domain | null {
  const read = truth(language);
  return (record) => (TRUTHS.has(F.attributesOf(record).get("operator")) ? read(record) : null);
}

/** A literal's spelling, in each language: what its text writes beside its value, not what it is. A character's quote
 * is C's spelling, `'a'` an `int` as `97` is, and not C++'s, where `'a'` is a `char`: there it is what the literal
 * is. */
export const SPELLING: { readonly C: readonly string[]; readonly "C++": readonly string[] } = {
  C: ["text", "problems", "quote", "base", "separators"],
  "C++": ["text", "problems", "base", "separators", "raw", "delimiter"],
};

/** How the framework reads the kinds of the C family that a dialect has (`tags`, in its `Term`'s order: those it shares
 * with the other language of the family), in `language` (`C` or `C++`), whose binary operators, literals' types,
 * prefixes and suffixes differ. */
export function kinds(language: string, tags: readonly string[], prefixes: readonly string[],
  suffixes: Suffixes): Record<string, F.Kind> {
  const check = (tag: string) => (record: any) => problems(F.node(tag, record),
    new Domains.Types(record, pathOf(language)),
    suffixes, prefixes, language);
  /** A cast's arithmetic type, which is its domain, read from the store of the term's holder. */
  const typedCast = (record: any): FD.Domain | null =>
    castType(typeName(F.attributesOf(record).get("type")), new Domains.Types(record, pathOf(language)));
  const application = (tag: string, signature: FD.Signature = new FD.Opaque(), options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature, check: check(tag), scopes: scopes(tag), ...options,
      optional: [...(options.optional ?? []), ...OPTIONAL] });
  const operator = (tag: string, vocabulary: ReadonlyMap<string, FD.Signature>, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { operator: "operator", vocabulary, required: ["operator"], check: check(tag),
      scopes: scopes(tag), ...options });
  const every: Record<string, () => F.Kind> = {
    [LITERAL]: () => new F.Kind(F.LITERAL, { spelling: SPELLING[language as "C" | "C++"], check: check(LITERAL),
      typed: (record: any) => Domains.literal(F.attributesOf(record), language, new Domains.Types(record,
        pathOf(language))) }),
    [CONSTANT]: () => new F.Kind(F.LITERAL, { spelling: ["text", "problems"], check: check(CONSTANT),
      typed: () => Domains.NULLPTR }),
    [CONCATENATEDSTRING]: () => application(CONCATENATEDSTRING, new FD.Opaque(Domains.String)),
    [VARIABLE]: () => new F.Kind(F.REFERENCE, { required: ["name"], check: check(VARIABLE) }),
    [PARENTHESIZEDEXPRESSION]: () => application(PARENTHESIZEDEXPRESSION, ANY1),
    [GENERICSELECTION]: () => application(GENERICSELECTION),
    [SUBSCRIPTEXPRESSION]: () => application(SUBSCRIPTEXPRESSION, Domains.SUBSCRIPT),
    [CALLEXPRESSION]: () => application(CALLEXPRESSION, Domains.CALL),
    [MEMBEREXPRESSION]: () => application(MEMBEREXPRESSION, Domains.MEMBER, { required: ["operator", "member"] }),
    [POSTFIXEXPRESSION]: () => operator(POSTFIXEXPRESSION, Domains.POSTFIX),
    [UNARYEXPRESSION]: () => operator(UNARYEXPRESSION, Domains.UNARY, { typed: operatorTruth(language) }),
    [SIZEOFEXPRESSION]: () => application(SIZEOFEXPRESSION, Domains.SIZE, { typed: size(language) }),
    [ALIGNOFEXPRESSION]: () => application(ALIGNOFEXPRESSION, Domains.SIZE, { required: ["keyword"],
      typed: size(language) }),
    [CASTEXPRESSION]: () => application(CASTEXPRESSION, Domains.CAST, { required: ["type"], typed: typedCast }),
    [BINARYEXPRESSION]: () => operator(BINARYEXPRESSION, language === "C" ? Domains.BINARY : Domains.BINARY_CPP,
      { typed: operatorTruth(language) }),
    [CONDITIONALEXPRESSION]: () => application(CONDITIONALEXPRESSION, Domains.CONDITIONAL,
      { optional: ["consequence"] }),
    [ASSIGNMENTEXPRESSION]: () => operator(ASSIGNMENTEXPRESSION, Domains.ASSIGNMENT),
    [INITIALIZERLIST]: () => application(INITIALIZERLIST),
    [DESIGNATEDINITIALIZER]: () => application(DESIGNATEDINITIALIZER, new FD.Opaque(), { required: ["initializer"] }),
    [COMPOUNDLITERALEXPRESSION]: () => application(COMPOUNDLITERALEXPRESSION, new FD.Opaque(), { required: ["type",
      "initializer"] }),
    [STATEMENTEXPRESSION]: () => application(STATEMENTEXPRESSION),
    [EXTENSIONEXPRESSION]: () => application(EXTENSIONEXPRESSION, ANY1),
    [TYPEID]: () => application(TYPEID),
  };
  return Object.fromEntries(tags.filter((tag) => tag in every).map((tag) => [tag, (every[tag] as () => F.Kind)()]));
}

const C_TAGS: readonly string[] = [LITERAL, CONSTANT, CONCATENATEDSTRING, VARIABLE, PARENTHESIZEDEXPRESSION,
  GENERICSELECTION, SUBSCRIPTEXPRESSION, CALLEXPRESSION, MEMBEREXPRESSION, POSTFIXEXPRESSION, UNARYEXPRESSION,
  SIZEOFEXPRESSION, ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION, ASSIGNMENTEXPRESSION,
  INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION, STATEMENTEXPRESSION, EXTENSIONEXPRESSION, TYPEID];

/** The literal of a native value: a number, a bool or a string; a bytes has none. */
function native(value: unknown): Writer | null {
  return ["bigint", "number", "boolean", "string"].includes(typeof value) ? literal(value) : null;
}

/** The domain of a literal no type holds, a bigint beyond every type its suffix allows (`Kind.typed` reads the
 * others'): not known. */
export function untyped(value?: unknown): FD.Domain { // eslint-disable-line @typescript-eslint/no-unused-vars
  return FD.Anything;
}

/** The dialects of its family whose terms its positions are to hold, read when first needed (the dialects proposal,
 * Retrofit's design): `C Types` and `C Preprocessor`. */
function reads(): readonly F.Dialect[] {
  return [CTypes.DIALECT, CPreprocessor.DIALECT];
}

/** The C dialect: its kinds, as the framework reads them, and its family's other dialects' terms. */
export const DIALECT: F.Dialect = new F.Dialect("C.Expressions", kinds("C", C_TAGS, PREFIXES, SUFFIXES),
  { domain_of: untyped, literal: native, reads });

// --- Writers ---

/** A term of the C dialect, written through the builders where it is given (a spec). */
export class Writer extends F.Writer {
  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
  }
}

/** A name that is an identifier: its spelling, written in a `Name`. */
function identifierName(spelling: string): (n: any) => any {
  return (n: any) => n.identifier((i: any) => i.spelling(spelling));
}

/** The writers of the kinds the C family evaluates, for one dialect: its `Terms.Dialect`, whose `spec` writes a native
 * value as its literal, and its `Writer`. C's are this module's functions; `Cpp`'s, its own. */
export class Writers<W extends F.Writer> {
  constructor(readonly dialect: F.Dialect, readonly writer: new (write: (union: any) => any) => W) {}

  /** The literal `value` (a bool, a bigint, a number or a string), with `suffix` as written (`u`, `ull`, `f`, `L`),
   * which gives its type. */
  literal = (value: unknown, suffix: string | null = null): W => new this.writer((u: any) => u.literal((r: any) => {
    if (value !== null && value !== undefined) r.value((p: any) => p.as_scalar(value));
    return suffix === null ? r : r.suffix(suffix);
  }));

  /** The variable `name`: an identifier used as an expression. */
  identifier = (name: string): W => new this.writer((u: any) => u.variable((r: any) => r.name(name)));

  /** `<operator> operand`; the operand is a spec (a native value is a literal). */
  unary = (operator: string, operand: unknown): W => {
    const operandSpec = this.dialect.spec(operand);
    return new this.writer((u: any) => u.unaryexpression((r: any) => r.operator(operator).operand(operandSpec)));
  };

  /** `left <operator> right`; each operand is a spec. */
  binary = (operator: string, left: unknown, right: unknown): W => {
    const [leftSpec, rightSpec] = [this.dialect.spec(left), this.dialect.spec(right)];
    return new this.writer((u: any) => u.binaryexpression((r: any) => r.left(leftSpec).operator(operator)
        .right(rightSpec)));
  };

  /** `condition ? consequence : alternative`. */
  conditional = (condition: unknown, consequence: unknown, alternative: unknown): W => {
    const [a, b, c] = [this.dialect.spec(condition), this.dialect.spec(consequence), this.dialect.spec(alternative)];
    return new this.writer((u: any) => u.conditionalexpression((r: any) => r.condition(a).consequence(b)
        .alternative(c)));
  };

  /** `(type) operand`, `type` a spec of the dialect's `Type`, written through the builders (`(t) => t.typeid(
   * (i) => i.specifiers([(s) => s.primitivetypespecifier((p) => p.keyword("int"))]))`). */
  cast = (type: (t: any) => any, operand: unknown): W => {
    const operandSpec = this.dialect.spec(operand);
    return new this.writer((u: any) => u.castexpression((r: any) => r.type(type).operand(operandSpec)));
  };

  /** `object.name`, or `object->name` with the operator '->'. */
  member = (object: unknown, name: string, operator = "."): W => {
    const objectSpec = this.dialect.spec(object);
    return new this.writer((u: any) => u.memberexpression(
      (r: any) => r.object(objectSpec).operator(operator).member(identifierName(name))));
  };

  /** `object[index]` (C++23's `object[i, j]` with several). */
  subscript = (object: unknown, ...indices: unknown[]): W => {
    const objectSpec = this.dialect.spec(object);
    const specs = indices.map((index) => this.dialect.spec(index));
    return new this.writer((u: any) => u.subscriptexpression((r: any) => r.object(objectSpec).indices(specs)));
  };

  /** `fn(args...)`: a function by its name (a `string`, the variable that names it), or any term. */
  call = (fn: unknown, ...args: unknown[]): W => {
    const fnSpec = typeof fn === "string" ? this.identifier(fn) : this.dialect.spec(fn);
    const specs = args.map((argument) => this.dialect.spec(argument));
    return new this.writer((u: any) => u.callexpression((r: any) => r.function(fnSpec).arguments(specs)));
  };
}

const WRITERS = new Writers(DIALECT, Writer);
export const { literal, identifier, unary, binary, conditional, cast, member, subscript, call } = WRITERS;
