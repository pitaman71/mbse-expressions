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
 * two share, holding C++'s terms). A name is as the grammar makes it (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "A name is whatever the language's own grammar makes it"): where
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
 *   })`, whose body of statements is not part of the term: mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Bodies within expressions are not part of the term") and
 *   `extensionexpression` (`__extension__ operand`).
 * - C Types' `typeid`, a type name, where a subterm may be an expression or a type alike (`sizeof(int)`, `_Generic`'s
 *   controlling operand, `offsetof(struct s, m)`'s first argument), and C Preprocessor's `definedexpression`,
 *   `defined(name)`, a preprocessing condition's term, which its install adds: kinds of the dialects C reads, which this
 *   dialect's `Term` lists ("(b)").
 * - The framework's kinds of invalid syntax, `error` and `missing`.
 *
 * Its sublanguages are dialects of their own, which it reads (`reads`; mbse-basis [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided-by-an-agent-for-review), "A dialect reads other dialects' terms"): `C
 * Types`, C's type names (`Expressions.C.Types.Term`), which a cast's, a compound literal's and a generic association's
 * `type` hold, a type name's specifiers, declarators, parameters and attribute specifiers its helpers, as no expression
 * holds them; and `C Preprocessor`, the directives C and C++ share. `Expressions.C.Expressions.Pattern` is its union for
 * binding targets, which every dialect has ("(ii)"): C expressions bind no names, so it holds invalid syntax alone and
 * nothing holds it, as the user decided (2026-11-04). As the user decided ("(b)"), one schema is a branch of the union
 * of every subterm it may be: `Term` lists `designatedinitializer`, for an initializer list's items. Its own helpers,
 * each union named after mbse-programs' category: `Name`, `Designator`, `Initializer`, and a generic association
 * (`type` and `value`, a pair of terms).
 *
 * The editions C covers are data, which `define` writes, each owned by its designation and holding the kinds it has
 * (`Framework.Standards`): ISO/IEC 9899:2011, 2018 and 2024, C11, C17 and C23 (C17 is C11's corrigenda, with no new
 * syntax), every kind in each but `constant` (`nullptr`), C23's alone, and an extension in none. `DIALECT` reads the
 * kinds (`Terms.Dialect`). The writers (`literal`, `identifier`, `binary`, `cast`, ...) write the kinds C evaluated
 * before it was complete through the builders, in a transaction, a cast's type a spec of C Types' `Term`, written
 * through the builders too: `store.Expressions.Framework.Term(binary("+", identifier("x"), 1))`; every other term is written
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
 * type, a cast's, a comparison's `bool`, `sizeof`'s `size_t`; and evaluation (see `Simplifiers`). A lone term reaches no
 * store: reading a type, it is refused (mbse-schemas' TypeError, "the value does not belong to a store"); and a type
 * neither dialect defines is refused by name, "'int' is not a type C defines, and its expression names no ABI", which
 * validation reports as a problem.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as F from "../../Framework/Terms.js";
import * as CPreprocessor from "../Preprocessor/Expressions.js";
import * as CTypes from "../Types/Expressions.js";
import {
  CONSTANT, EXTENSIONS, LITERAL, PREFIXES, SUFFIXES, Writers, kinds, untyped, CONCATENATEDSTRING, VARIABLE,
  PARENTHESIZEDEXPRESSION, GENERICSELECTION, SUBSCRIPTEXPRESSION, CALLEXPRESSION, MEMBEREXPRESSION, POSTFIXEXPRESSION,
  UNARYEXPRESSION, SIZEOFEXPRESSION, ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION,
  ASSIGNMENTEXPRESSION, INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION, STATEMENTEXPRESSION,
  EXTENSIONEXPRESSION,
} from "./Kinds.js";

export { // the family's shared reading of its kinds, re-exported
  ALIGNOFEXPRESSION, ASSIGNMENTEXPRESSION, BINARYEXPRESSION, CALLEXPRESSION, CASTEXPRESSION, COMPOUNDLITERALEXPRESSION,
  CONCATENATEDSTRING, CONDITIONALEXPRESSION, CONSTANT, DESIGNATEDINITIALIZER, EXTENSIONS, EXTENSIONEXPRESSION,
  GENERICSELECTION, INITIALIZERLIST, LITERAL, MEMBEREXPRESSION, OPTIONAL, PARENTHESIZEDEXPRESSION, POSTFIXEXPRESSION,
  PREFIXES, QUOTES, SIZEOFEXPRESSION, SPELLING, STATEMENTEXPRESSION, SUBSCRIPTEXPRESSION, SUFFIXES, TYPEID,
  UNARYEXPRESSION, VARIABLE, Writers, boundNames, castType, constantText, kinds, problems, scopes, size, spelling,
  truth, typeName, untyped,
} from "./Kinds.js";
export type { Suffixes } from "./Kinds.js";

/** C's union of its kinds, added to the framework's terms as the branch `c`, its own kinds, its union of binding
 * targets (`Pattern`) and the helpers they hold, and its dialect's schema, whose singleton is
 * `Expressions.C.Expressions`: run after `Framework.install`, in a transaction of its own, before or after its family's
 * other installs; run again, it writes nothing. C Types' `Term` and its `typeid`, which its subterms may be, are named
 * by name, each created where C Types' install has not run. Its holder, `Expressions.C.Expressions.Expression`, refines
 * `Expressions.Framework.Expression`, its `root` narrowed to its `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.C.Expressions/1")
      .mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Kinds: S.OfUnion, DomainKind: S.OfUnion, OfNullptr: S.OfObject, // Kinds: the framework's
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Pattern: S.OfUnion, Name: S.OfUnion, Designator: S.OfUnion, Initializer: S.OfUnion, Expression: S.OfObject,
      Literal: S.OfObject, Constant: S.OfObject, ConcatenatedString: S.OfObject,
      ParenthesizedExpression: S.OfObject, GenericSelection: S.OfObject,
      GenericAssociation: S.OfObject, SubscriptExpression: S.OfObject, CallExpression: S.OfObject,
      MemberExpression: S.OfObject, PostfixExpression: S.OfObject, UnaryExpression: S.OfObject,
      SizeofExpression: S.OfObject, AlignofExpression: S.OfObject, CastExpression: S.OfObject,
      BinaryExpression: S.OfObject, ConditionalExpression: S.OfObject,
      AssignmentExpression: S.OfObject, InitializerList: S.OfObject,
      DesignatedInitializer: S.OfObject, FieldDesignator: S.OfObject, IndexDesignator: S.OfObject,
      EqualInitializer: S.OfObject, CompoundLiteralExpression: S.OfObject,
      StatementExpression: S.OfObject, ExtensionExpression: S.OfObject, Identifier: S.OfObject,
      // C Types' `Term` and its `typeid`, by name; FrameworkTerm: the framework's, by name
      TypesTerm: S.OfUnion, TypeId: S.OfObject,
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
      // its binding targets: no C expression binds a name, so invalid syntax alone ("(ii)")
      (_: any) => _.Pattern.name("Expressions.C.Expressions.Pattern").branches([
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // its names: an identifier, C's one name (mbse-programs' `Name`)
      (_: any) => _.Name.name("Expressions.C.Expressions.Name").branches([
        (t: any) => t.name("identifier").schema([_.Identifier]),
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
        type: _.TypesTerm, // absent: `default`
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
        type: _.TypesTerm, initializer: _.InitializerList}),
      // unary and other operators
      (_: any) => _.UnaryExpression.name("Expressions.C.Expressions.UnaryExpression").properties({
        operator: S.OfStr, operand: _.Term}),
      (_: any) => _.SizeofExpression.name("Expressions.C.Expressions.SizeofExpression").properties({operand: _.Term}),
      (_: any) => _.AlignofExpression.name("Expressions.C.Expressions.AlignofExpression").properties({
        keyword: S.OfStr, operand: _.Term}),
      (_: any) => _.CastExpression.name("Expressions.C.Expressions.CastExpression").properties({
        type: _.TypesTerm, operand: _.Term}),
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
      // names
      (_: any) => _.Identifier.name("Expressions.C.Expressions.Identifier").properties({spelling: S.OfStr}),
      // a type name, C Types' kind, which `Term` lists for the subterms that may be an expression or a type alike, and
      // C Types' `Term`, which a cast's, a compound literal's and a generic association's type holds: each by name,
      // created where C Types' install has not run
      (_: any) => _.TypeId.name("Expressions.C.Types.TypeId"),
      (_: any) => _.TypesTerm.name("Expressions.C.Types.Term"),
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
  const every = new Map((OWN.Term.as_schema().branches as { name: string; schema: unknown }[]) // each of its own
    .filter((b) => C_TAGS.includes(b.name) && !EXTENSIONS.has(b.name)) // kinds' schema, by its tag, but an extension
    .map((b) => [b.name, b.schema]));
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

/** Its own kinds, in its `Term`'s order: its `Term` lists C Types' `typeid` after them, and C Preprocessor's
 * `definedexpression` after invalid syntax, each read as the dialect that declares it reads it. */
const C_TAGS: readonly string[] = [LITERAL, CONSTANT, CONCATENATEDSTRING, VARIABLE, PARENTHESIZEDEXPRESSION,
  GENERICSELECTION, SUBSCRIPTEXPRESSION, CALLEXPRESSION, MEMBEREXPRESSION, POSTFIXEXPRESSION, UNARYEXPRESSION,
  SIZEOFEXPRESSION, ALIGNOFEXPRESSION, CASTEXPRESSION, BINARYEXPRESSION, CONDITIONALEXPRESSION, ASSIGNMENTEXPRESSION,
  INITIALIZERLIST, DESIGNATEDINITIALIZER, COMPOUNDLITERALEXPRESSION, STATEMENTEXPRESSION, EXTENSIONEXPRESSION];

/** The literal of a native value: a number, a bool or a string; a bytes has none. */
function native(value: unknown): Writer | null {
  return ["bigint", "number", "boolean", "string"].includes(typeof value) ? literal(value) : null;
}


/** The dialects of its family whose terms are to be its subterms, read when first needed (mbse-basis [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided-by-an-agent-for-review), "A dialect reads other dialects' terms"): `C Types` and `C Preprocessor`. */
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


const WRITERS = new Writers(DIALECT, Writer);
export const { literal, identifier, unary, binary, conditional, cast, member, subscript, call } = WRITERS;

