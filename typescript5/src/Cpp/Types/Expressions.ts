/**
 * Expressions of the Cpp Types dialect: C++'s type-ids, a grammar of their own (ISO/IEC 14882, [dcl.name], over
 * [dcl.spec] and [dcl.decl]), as mbse-programs has them (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/Syntax.py`).
 *
 * It is a dialect of the Cpp family (mbse-basis [CAP-278: C's and C++'s type names and preprocessor directives as data](mbse:mbse-basis/docs/capabilities/CAP-278.md): "most languages will have a dialect for
 * type expressions"), named `Cpp Types` (`Terms.dialectName`), its tag `cpp_types`. Its terms are values of its `Term`,
 * `Expressions.Cpp.Types.Term`, the branch `cpp_types` of `Expressions.Framework.Term`; its holder,
 * `Expressions.Cpp.Types.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`, and
 * so inherits the adjacency `abi`, through which its type names are read as C++'s are. Its kinds, each a value object
 * `Expressions.Cpp.Types.<Kind>`, named as mbse-programs names them, lowercased as branch tags:
 *
 * - `typeid`, a type-id: its `specifiers` and its abstract `declarator`. C++'s `Term` lists it too, for the subterms
 *   that may be an expression or a type alike (`sizeof(int)`, a template's arguments); every type subterm (a cast's,
 *   a named cast's, `new`'s, a conversion function's name's, a trailing return type, an enumeration's fixed type, a type
 *   parameter's default) holds this dialect's `Term`.
 * - `enumerator`, an enumeration's enumerator (`name`, an identifier, `attributes`, and its `value`, a C++ term), which an
 *   enumeration's body holds as data (mbse-basis [CAP-278: C's and C++'s type names and preprocessor directives as data](mbse:mbse-basis/docs/capabilities/CAP-278.md)): C++'s `EnumSpecifier` holds
 *   them, its `enumerators`. C++ defines no enumeration in a type-id an expression holds ([dcl.type.general]), so an
 *   enumeration's data is held only through a holder, by mbse-programs' alias declarations.
 * - C Preprocessor's directives and `comment`, which its install adds to this dialect's `Term`, as an enumeration's
 *   body holds them among its enumerators.
 * - The framework's kinds of invalid syntax, `error` and `missing`.
 *
 * Its helpers are none (`HELPERS`): a type-id's parts, its specifiers, declarators and parameters, are C++'s
 * (`Expressions.Cpp.Expressions.Specifier`), as a lambda's declarator holds them too, and are read through `reads`, as a
 * name (`Expressions.Cpp.Expressions.Name`) and a term (`Expressions.Cpp.Expressions.Term`) are.
 *
 * The editions it covers are data, which `define` writes, C++'s (C++17, C++20, C++23), each with its own kinds it has,
 * both in each (`SINCE`). No kind binds a name a term scopes. Simplification leaves each of its kinds in the residual, named; a cast reads
 * its type from it (`C.Simplifiers`). Its terms are written through the builders (mbse-basis [PRI-019: fluent builder
 * syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `(t) => t.typeid((i) => i.specifiers([(s) =>
 * s.primitivetypespecifier((p) => p.keyword("int"))]))`. `DIALECT` reads its kinds and the terms of the dialects whose
 * terms are its subterms, `Cpp` and `C Preprocessor` (`reads`); none of it is a reason to reinstate `Uses` (mbse-basis
 * [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#decided)).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as F from "../../Framework/Terms.js";
import * as K from "../../C/Expressions/Kinds.js";
import * as CPreprocessor from "../../C/Preprocessor/Expressions.js";
import * as Cpp from "../Expressions/Expressions.js";
import * as CppRegExp from "../RegExp/Expressions.js";

export const ENUMERATOR = K.ENUMERATOR;

/** Its own kinds, in its `Term`'s order, before invalid syntax. */
export const TAGS: readonly string[] = [K.TYPEID, ENUMERATOR];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none, a type-id's parts being C++'s. */
export const HELPERS: readonly string[] = [];

/** The edition each of its kinds arrived in, by its index in C++'s editions (C++17, C++20, C++23): none, so each is in
 * every edition. */
export const SINCE: ReadonlyMap<string, number> = new Map();

/**
 * Cpp Types' union of its kinds, added to the framework's terms as the branch `cpp_types`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.Cpp.Types`: run after `Framework.install`, in a transaction of its
 * own, before or after its family's other installs; run again, it writes nothing. C++'s `Term`, `Specifier`,
 * `Declarator`, `AttributeSpecifier` and `Identifier`, which its kinds hold, are named by name, each created where C++'s
 * install has not run. Its holder, `Expressions.Cpp.Types.Expression`, refines `Expressions.Framework.Expression`, its
 * `root` narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.Cpp.Types/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject, TypeId: S.OfObject, Enumerator: S.OfObject,
      // C++'s `Term` and the helpers a type-id and an enumerator hold, by name
      CppTerm: S.OfUnion, Specifier: S.OfUnion, Declarator: S.OfUnion,
      AttributeSpecifier: S.OfUnion, Identifier: S.OfObject
    })
    .spec([
      // its dialect: the singleton `Expressions.Cpp.Types`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Cpp.Types.Dialect").ref(true).singleton("Expressions.Cpp.Types").adjacencies({
          domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
          operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
          standards: (a: any) => a.relation([Framework.Covers]).me("dialect")}),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
          (t: any) => t.name("cpp_types").schema([_.Dialect])]),
      // its union of its kinds, and invalid syntax
      (_: any) => _.Term.name("Expressions.Cpp.Types.Term").branches([
          (t: any) => t.name("typeid").schema([_.TypeId]),
          (t: any) => t.name("enumerator").schema([_.Enumerator]),
          (t: any) => t.name("error").schema([Framework.Error]),
          (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.CppTerm.name("Expressions.Cpp.Expressions.Term"),
      (_: any) => _.Specifier.name("Expressions.Cpp.Expressions.Specifier"),
      (_: any) => _.Declarator.name("Expressions.Cpp.Expressions.Declarator"),
      (_: any) => _.AttributeSpecifier.name("Expressions.Cpp.Expressions.AttributeSpecifier"),
      (_: any) => _.Identifier.name("Expressions.Cpp.Expressions.Identifier"),
      // type-ids: specifiers and an abstract declarator
      (_: any) => _.TypeId.name("Expressions.Cpp.Types.TypeId").properties({
          specifiers: many(_.Specifier), declarator: _.Declarator}),
      // an enumeration's enumerator: `name attributes = value`
      (_: any) => _.Enumerator.name("Expressions.Cpp.Types.Enumerator").properties({
          name: _.Identifier, attributes: many(_.AttributeSpecifier), value: _.CppTerm}),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
      // narrowed to its `Term`
      (_: any) => _.Expression.name("Expressions.Cpp.Types.Expression").ref(true).refines([Framework.Expression]).properties({
          root: _.Term}),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
          (t: any) => t.name("cpp_types").schema([_.Term])]),
    ])]))]);
}

/**
 * Cpp Types' dialect as data: the singleton `Expressions.Cpp.Types` owning the editions it covers, by designation
 * (`standards`), C++'s ISO/IEC 14882:2017, 2020 and 2024, each with its formal reference's parts, its common name and
 * its own kinds it has (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its
 * frame binds the dialect (`dialect`) and each edition by its common name spelled as an identifier (`Cpp17`).
 */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.Cpp.Types, txn.Expressions.Framework.Standard];
  const every = (OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name))
    .map((branch) => branch.schema);
  return txn.uid("mbse.Expressions.Cpp.Types.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, Cpp17: Standard, Cpp20: Standard, Cpp23: Standard })
    .spec([
      (_: any) => _.dialect.standards({
        "ISO/IEC 14882:2017": (e: any) => e.standard(_.Cpp17),
        "ISO/IEC 14882:2020": (e: any) => e.standard(_.Cpp20),
        "ISO/IEC 14882:2024": (e: any) => e.standard(_.Cpp23) }),
      (_: any) => _.Cpp17.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2017n)).names(
        ["C++17"]).kinds(every),
      (_: any) => _.Cpp20.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2020n)).names(
        ["C++20"]).kinds(every),
      (_: any) => _.Cpp23.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2024n)).names(
        ["C++23"]).kinds(every),
    ])]))]);
}

/** The dialects whose terms are its subterms, read when first needed: C++'s, whose terms and helpers a type-id holds,
 * and C Preprocessor's, whose directives an enumeration's body holds; and Cpp RegExp's, of which no subterm is one, as
 * each family's dialects read one another *(agent)*. */
function reads(): readonly F.Dialect[] {
  return [Cpp.DIALECT, CPreprocessor.DIALECT, CppRegExp.DIALECT];
}

/** The Cpp Types dialect: its kinds, as the framework reads them, and the terms of the dialects whose terms are its
 * subterms. */
export const DIALECT = new F.Dialect("Cpp.Types", K.kinds("C++", TAGS, K.PREFIXES, K.CPP_SUFFIXES),
  { domain_of: K.untyped, reads });
