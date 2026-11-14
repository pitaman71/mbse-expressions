/**
 * Expressions of the C Types dialect: C's type names, a grammar of their own (ISO/IEC 9899, 6.7.7 in C11, "Type names",
 * over 6.7's specifiers and declarators), as mbse-programs has them (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/
 * Syntax.py`).
 *
 * It is a dialect of the C family (mbse-basis [CAP-278: C's and C++'s type names and preprocessor directives as data](mbse:mbse-basis/docs/capabilities/CAP-278.md): "most languages will have a dialect for type
 * expressions"), named `C Types` (`Terms.dialectName`), its tag `c_types`. Its terms are values of its `Term`,
 * `Expressions.C.Types.Term`, the branch `c_types` of `Expressions.Framework.Term`; its holder,
 * `Expressions.C.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`, and so
 * inherits the adjacency `abi`, through which its type names are read as C's are (`Domains.Types`). Its kinds, each a
 * value object `Expressions.C.Types.<Kind>`, named as mbse-programs names them, lowercased as branch tags:
 *
 * - `typeid`, a type name: its `specifiers` and its abstract `declarator`. C's `Term` lists it too, for the subterms
 *   that may be an expression or a type alike (`sizeof(int)`, `_Generic`'s controlling operand, `offsetof`'s first
 *   argument); a cast's, a compound literal's and a generic association's type hold this dialect's `Term`.
 * - `enumerator`, an enumeration's enumerator (`name`, an identifier, `attributes`, and its `value`, a C term), which an
 *   enumeration's body holds as data: mbse-programs models it as nodes (`EnumeratorList` of `Enumerator`s, directives
 *   and comments), so it is data of the family's `Types` (mbse-basis [CAP-278: C's and C++'s type names and preprocessor directives as data](mbse:mbse-basis/docs/capabilities/CAP-278.md)).
 * - C Preprocessor's directives and `comment`, which its install adds to this dialect's `Term`, as an enumeration's
 *   body holds them among its enumerators.
 * - The framework's kinds of invalid syntax, `error` and `missing`.
 *
 * Its helpers, by name under its path (`HELPERS`), are a type name's parts, which no expression holds, each union named
 * after mbse-programs' category: `Specifier` (keywords, a named type, a struct, union or enum, C23's `typeof`,
 * `_Atomic(type)`, C23's `_BitInt(width)`, and, as `TypeId` lists them among its specifiers, the attribute specifiers),
 * `Declarator` (an identifier, a pointer, an array, a function, parentheses), `Parameter` and `AttributeSpecifier`. A
 * name is C's `Name` (`Expressions.C.Expressions.Name`), and a term a type name holds (an array's size, `typeof`'s
 * operand, an attribute's arguments, an enumerator's value) is C's `Term`, each read through `reads`. A struct's or a
 * union's body, its member declarations, is not part of the term (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Bodies within expressions are not part of the term"): `body` says
 * whether it has one. An enumeration's `body` says whether it has one too (`enum E` against `enum E {}`), and its
 * `enumerators` hold its body's items, this dialect's terms, with its `trailing_comma`.
 *
 * The editions it covers are data, which `define` writes, C's (C11, C17, C23), each with its own kinds it has, both in
 * each (`SINCE`). No kind binds a name a term scopes. Simplification leaves each of its kinds in the residual, named; a cast reads its type
 * from it (`C.Simplifiers`). Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
 * syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(t) => t.typeid((i) => i.specifiers([(s) => s.primitivetypespecifier((p) => p.keyword("int"))]))`.
 * `DIALECT` reads its kinds and the terms of its family's other dialects, `C` and `C Preprocessor` (`reads`); none of
 * it is a reason to reinstate `Uses` (mbse-basis [CAP-098: dialects over one
 * framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as F from "../../Framework/Terms.js";
import * as C from "../Expressions/Expressions.js";
import * as K from "../Expressions/Kinds.js";
import * as CPreprocessor from "../Preprocessor/Expressions.js";

export const ENUMERATOR = K.ENUMERATOR;

/** Its own kinds, in its `Term`'s order, before invalid syntax. */
export const TAGS: readonly string[] = [K.TYPEID, ENUMERATOR];

/** Its own helpers, the value object schemas its kinds hold that are no kind, by name under its path, as the
 * completeness data (`grammars/c-tree-sitter.json`) names them. */
export const HELPERS: readonly string[] = ["DeclSpecifier", "CvQualifier", "PrimitiveTypeSpecifier", "NamedTypeSpecifier",
  "ClassSpecifier", "EnumSpecifier", "PlaceholderTypeSpecifier", "TypeofSpecifier", "AtomicTypeSpecifier",
  "BitIntSpecifier", "IdDeclarator", "PointerDeclarator", "ArrayDeclarator", "FunctionDeclarator",
  "ParenthesizedDeclarator", "ParameterDeclaration", "EllipsisParameter", "StandardAttributeSpecifier", "Attribute",
  "AlignasSpecifier", "GnuAttributeSpecifier", "DeclspecSpecifier"];

/** The edition each of its kinds arrived in, by its index in C's editions (C11, C17, C23): none, so each is in every
 * edition. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/**
 * C Types' union of its kinds, added to the framework's terms as the branch `c_types`, its own kinds, the helpers they
 * hold, and its dialect's schema, whose singleton is `Expressions.C.Types`: run after `Framework.install`, in a
 * transaction of its own, before or after its family's other installs; run again, it writes nothing. C's `Term`, its
 * `Name` and its `Identifier`, which its kinds and helpers hold, are named by name, each created where C's install has
 * not run. Its holder, `Expressions.C.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed
 * to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.C.Types/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject, Specifier: S.OfUnion, Declarator: S.OfUnion, Parameter: S.OfUnion,
      AttributeSpecifier: S.OfUnion, TypeId: S.OfObject, Enumerator: S.OfObject,
      DeclSpecifier: S.OfObject, CvQualifier: S.OfObject, PrimitiveTypeSpecifier: S.OfObject,
      NamedTypeSpecifier: S.OfObject, ClassSpecifier: S.OfObject, EnumSpecifier: S.OfObject,
      PlaceholderTypeSpecifier: S.OfObject, TypeofSpecifier: S.OfObject,
      AtomicTypeSpecifier: S.OfObject, BitIntSpecifier: S.OfObject, IdDeclarator: S.OfObject,
      PointerDeclarator: S.OfObject, ArrayDeclarator: S.OfObject, FunctionDeclarator: S.OfObject,
      ParenthesizedDeclarator: S.OfObject, ParameterDeclaration: S.OfObject,
      EllipsisParameter: S.OfObject, StandardAttributeSpecifier: S.OfObject,
      Attribute: S.OfObject, AlignasSpecifier: S.OfObject, GnuAttributeSpecifier: S.OfObject,
      DeclspecSpecifier: S.OfObject,
      // C's `Term`, `Name` and `Identifier`, by name
      CTerm: S.OfUnion, Name: S.OfUnion, Identifier: S.OfObject
    })
    .spec([
      // its dialect: the singleton `Expressions.C.Types`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.C.Types.Dialect").ref(true).singleton("Expressions.C.Types").adjacencies({
          domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
          operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
          standards: (a: any) => a.relation([Framework.Covers]).me("dialect")}),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
          (t: any) => t.name("c_types").schema([_.Dialect])]),
      // its union of its kinds, and invalid syntax
      (_: any) => _.Term.name("Expressions.C.Types.Term").branches([
          (t: any) => t.name("typeid").schema([_.TypeId]),
          (t: any) => t.name("enumerator").schema([_.Enumerator]),
          (t: any) => t.name("error").schema([Framework.Error]),
          (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.CTerm.name("Expressions.C.Expressions.Term"),
      (_: any) => _.Name.name("Expressions.C.Expressions.Name"),
      (_: any) => _.Identifier.name("Expressions.C.Expressions.Identifier"),
      // a type name's specifiers, the attribute specifiers among them (mbse-programs' `Specifier`)
      (_: any) => _.Specifier.name("Expressions.C.Types.Specifier").branches([
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
      (_: any) => _.Declarator.name("Expressions.C.Types.Declarator").branches([
          (t: any) => t.name("iddeclarator").schema([_.IdDeclarator]),
          (t: any) => t.name("pointerdeclarator").schema([_.PointerDeclarator]),
          (t: any) => t.name("arraydeclarator").schema([_.ArrayDeclarator]),
          (t: any) => t.name("functiondeclarator").schema([_.FunctionDeclarator]),
          (t: any) => t.name("parenthesizeddeclarator").schema([_.ParenthesizedDeclarator]),
      ]),
      (_: any) => _.Parameter.name("Expressions.C.Types.Parameter").branches([
          (t: any) => t.name("parameterdeclaration").schema([_.ParameterDeclaration]),
          (t: any) => t.name("ellipsisparameter").schema([_.EllipsisParameter]),
      ]),
      (_: any) => _.AttributeSpecifier.name("Expressions.C.Types.AttributeSpecifier").branches([
          (t: any) => t.name("standardattributespecifier").schema([_.StandardAttributeSpecifier]),
          (t: any) => t.name("alignasspecifier").schema([_.AlignasSpecifier]),
          (t: any) => t.name("gnuattributespecifier").schema([_.GnuAttributeSpecifier]),
          (t: any) => t.name("declspecspecifier").schema([_.DeclspecSpecifier]),
      ]),
      // type names: specifiers and an abstract declarator
      (_: any) => _.TypeId.name("Expressions.C.Types.TypeId").properties({
          specifiers: many(_.Specifier), declarator: _.Declarator}),
      // an enumeration's enumerator: `name attributes = value`
      (_: any) => _.Enumerator.name("Expressions.C.Types.Enumerator").properties({
          name: _.Identifier, attributes: many(_.AttributeSpecifier), value: _.CTerm}),
      (_: any) => _.DeclSpecifier.name("Expressions.C.Types.DeclSpecifier").properties({keyword: S.OfStr}),
      (_: any) => _.CvQualifier.name("Expressions.C.Types.CvQualifier").properties({keyword: S.OfStr}),
      (_: any) => _.PrimitiveTypeSpecifier.name("Expressions.C.Types.PrimitiveTypeSpecifier").properties({
          keyword: S.OfStr}),
      (_: any) => _.NamedTypeSpecifier.name("Expressions.C.Types.NamedTypeSpecifier")
          .properties({name: _.Name}),
      (_: any) => _.ClassSpecifier.name("Expressions.C.Types.ClassSpecifier").properties({
          key: S.OfStr, attributes: many(_.AttributeSpecifier), name: _.Name,
          body: S.OfBool}), // whether it has a body, whose member declarations are not part of the term
      (_: any) => _.EnumSpecifier.name("Expressions.C.Types.EnumSpecifier").properties({
          key: S.OfStr, attributes: many(_.AttributeSpecifier), name: _.Name, base: _.Term,
          body: S.OfBool, // whether it has a body, `{ enumerators }`
          enumerators: many(_.Term), trailing_comma: S.OfBool}), // its body's items, and `{ ..., }`
      (_: any) => _.PlaceholderTypeSpecifier.name("Expressions.C.Types.PlaceholderTypeSpecifier"),
      (_: any) => _.TypeofSpecifier.name("Expressions.C.Types.TypeofSpecifier").properties({
          keyword: S.OfStr, operand: _.CTerm}),
      (_: any) => _.AtomicTypeSpecifier.name("Expressions.C.Types.AtomicTypeSpecifier")
          .properties({type: _.Term}),
      (_: any) => _.BitIntSpecifier.name("Expressions.C.Types.BitIntSpecifier").properties({width: _.CTerm}),
      (_: any) => _.IdDeclarator.name("Expressions.C.Types.IdDeclarator").properties({
          name: _.Name, attributes: many(_.AttributeSpecifier)}),
      (_: any) => _.PointerDeclarator.name("Expressions.C.Types.PointerDeclarator").properties({
          attributes: many(_.AttributeSpecifier), qualifiers: many(_.CvQualifier),
          declarator: _.Declarator}),
      (_: any) => _.ArrayDeclarator.name("Expressions.C.Types.ArrayDeclarator").properties({
          declarator: _.Declarator, static: S.OfBool, qualifiers: many(_.CvQualifier), size: _.CTerm,
          star: S.OfBool, attributes: many(_.AttributeSpecifier)}),
      (_: any) => _.FunctionDeclarator.name("Expressions.C.Types.FunctionDeclarator").properties({
          declarator: _.Declarator, parameters: many(_.Parameter),
          attributes: many(_.AttributeSpecifier)}),
      (_: any) => _.ParenthesizedDeclarator.name("Expressions.C.Types.ParenthesizedDeclarator").properties({
          declarator: _.Declarator}),
      (_: any) => _.ParameterDeclaration.name("Expressions.C.Types.ParameterDeclaration").properties({
          attributes: many(_.AttributeSpecifier), specifiers: many(_.Specifier),
          declarator: _.Declarator}),
      (_: any) => _.EllipsisParameter.name("Expressions.C.Types.EllipsisParameter"),
      // attributes
      (_: any) => _.StandardAttributeSpecifier.name("Expressions.C.Types.StandardAttributeSpecifier")
          .properties({attributes: many(_.Attribute)}),
      (_: any) => _.Attribute.name("Expressions.C.Types.Attribute").properties({
          namespace: S.OfStr, name: S.OfStr, arguments: many(_.CTerm)}),
      (_: any) => _.AlignasSpecifier.name("Expressions.C.Types.AlignasSpecifier").properties({
          keyword: S.OfStr, operand: _.CTerm}),
      (_: any) => _.GnuAttributeSpecifier.name("Expressions.C.Types.GnuAttributeSpecifier").properties({
          keyword: S.OfStr, attributes: many(_.Attribute)}),
      (_: any) => _.DeclspecSpecifier.name("Expressions.C.Types.DeclspecSpecifier").properties({
          attributes: many(_.Attribute)}),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
      // narrowed to its `Term`
      (_: any) => _.Expression.name("Expressions.C.Types.Expression").ref(true).refines([Framework.Expression]).properties({
          root: _.Term}),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
          (t: any) => t.name("c_types").schema([_.Term])]),
    ])]))]);
}

/**
 * C Types' dialect as data: the singleton `Expressions.C.Types` owning the editions it covers, by designation
 * (`standards`), C's ISO/IEC 9899:2011, 2018 and 2024, each with its formal reference's parts, its common name and its
 * own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame
 * binds the dialect (`dialect`) and each edition by its common name (`C11`).
 */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.C.Types, txn.Expressions.Framework.Standard];
  const every = (OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => branch.schema);
  return txn.uid("mbse.Expressions.C.Types.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, C11: Standard, C17: Standard, C23: Standard })
    .spec([
      (_: any) => _.dialect.standards({
        "ISO/IEC 9899:2011": (e: any) => e.standard(_.C11), "ISO/IEC 9899:2018": (e: any) => e.standard(_.C17),
        "ISO/IEC 9899:2024": (e: any) => e.standard(_.C23) }),
      (_: any) => _.C11.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2011n)).names(
        ["C11"]).kinds(every),
      (_: any) => _.C17.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2018n)).names(
        ["C17"]).kinds(every),
      (_: any) => _.C23.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2024n)).names(
        ["C23"]).kinds(every),
    ])]))]);
}

/** The dialects whose terms are its subterms, read when first needed: C's, whose terms a type name holds, and C
 * Preprocessor's, whose directives an enumeration's body holds. */
function reads(): readonly F.Dialect[] {
  return [C.DIALECT, CPreprocessor.DIALECT];
}

/** The C Types dialect: its kinds, as the framework reads them, and the terms of its family's other dialects. */
export const DIALECT = new F.Dialect("C.Types", K.kinds("C", TAGS, K.PREFIXES, K.SUFFIXES),
  { domain_of: K.untyped, reads });
