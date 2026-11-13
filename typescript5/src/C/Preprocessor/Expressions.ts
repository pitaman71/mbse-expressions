/**
 * Expressions of the C Preprocessor dialect: the preprocessing directives C and C++ share, each standard defining its own
 * (ISO/IEC 9899, 6.10; ISO/IEC 14882, [cpp]), `defined(name)` within their conditions, and the comments kept among them,
 * as mbse-programs has them, one set of directives for both languages (`mbse:mbse-programs/python3/mbse/Programs/Ccpp/
 * Syntax.py`, "Preprocessing directives [cpp]").
 *
 * It is the C family's dialect that both C and C++ read (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "Macros, and a preprocessor per family": "the
 * preprocessor is a dialect per family (C's, shared by C and C++ as each standard defines it ...)"), named `C
 * Preprocessor` (`Terms.dialectName`), its tag `c_preprocessor`. Its terms are values of its `Term`,
 * `Expressions.C.Preprocessor.Term`, the branch `c_preprocessor` of `Expressions.Framework.Term`: its own kinds and
 * invalid syntax. Its kinds are mbse-programs', with its names, lowercased as branch tags, and its properties in source
 * order, each a value object `Expressions.C.Preprocessor.<Kind>`:
 *
 * - The directives: `includedirective` (`#include <path>` where `system`, `#include "path"`, or `#include macro`; its
 *   `directive`, `include` or the extensions `include_next` and `import`), `definedirective` (`#define name
 *   replacement`, or, where `function_like`, `#define name(parameters, ...) replacement`, its replacement the text of
 *   its tokens, which are not a tree until the macro is used), the conditionals `ifdirective` (`#if condition`),
 *   `ifdefdirective` (`#ifdef name`, `#ifndef` where `negated`), `elifdirective`, `elifdefdirective` (C23's and C++23's)
 *   and `elsedirective`, each with its `items` and the branch after it, its `alternative` (an `#elif`, an `#elifdef` or an
 *   `#else`), as mbse-programs nests them, and `otherdirective` (`#directive text`: `#undef`, `#pragma`, `#error`,
 *   `#warning`, `#line`, `#embed`, and the null directive).
 * - `definedexpression`, `defined(name)`, mbse-programs' expression kind of a condition: its install adds it to C's and
 *   C++'s `Term`s, a condition's terms.
 * - `comment`: `// text`, or with `block` `/* text *\/`, kept where mbse-programs keeps it, among an enumeration's
 *   enumerators and the directives; a `trailing` one ends the line of the item before it.
 *
 * A name is C's `Identifier` (`Expressions.C.Expressions.Identifier`), a preprocessing token the same in both
 * standards. A condition and an include's `macro` hold `Expressions.Framework.Term`: a C or a C++ term, as the
 * framework's shared kinds hold any dialect's (mbse-basis [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md#decided), "The framework's kinds with subterms stay shared"), each standard defining its own
 * condition's grammar. A directive's `items` hold `Expressions.Framework.Term` too, where a value holds the directive:
 * an enumeration's body, whose items are C Types' or Cpp Types' terms (their enumerators, and this dialect's directives
 * and comments, which its install adds to both `Term`s); elsewhere mbse-programs relates its items. Which language a
 * condition or an item is of is the reading dialect's: from an enumeration, its own (a C++ term in a C enumeration is
 * refused), from this dialect's holder, either. A condition's macros' names, C's variables and C++'s identifiers, are
 * bound within it (`Kind.scopes`), as each names a macro, defined or not, never a value, and so are an include's macro's:
 * nothing refines `Let`.
 *
 * The editions it covers are data, which `define` writes: C's and C++'s (C11, C17, C23, C++17, C++20 and C++23), each
 * with its own kinds it has, every kind in every edition but `elifdefdirective`, C23's and C++23's (`SINCE`: mbse-
 * programs' `both(2023, 2023)`); a directive's name within `otherdirective` (`#warning`, `#embed`) is a feature, not
 * recorded. `DIALECT` reads its kinds and the terms of C's and C++'s expressions and types, which its conditions and items
 * hold. Evaluation refuses each of its kinds by name. Its terms are written through the builders (mbse-basis [PRI-019:
 * fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)):
 * `(t) => t.ifdefdirective((d) => d.name((i) => i.spelling("NDEBUG")))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Cpp from "../../Cpp/Expressions/Expressions.js";
import * as CppTypes from "../../Cpp/Types/Expressions.js";
import * as C from "../Expressions/Expressions.js";
import * as K from "../Expressions/Kinds.js";
import * as CTypes from "../Types/Expressions.js";

const { repr } = Repr;

export const INCLUDEDIRECTIVE = "includedirective";
export const DEFINEDIRECTIVE = "definedirective";
export const IFDIRECTIVE = "ifdirective";
export const IFDEFDIRECTIVE = "ifdefdirective";
export const ELIFDIRECTIVE = "elifdirective";
export const ELIFDEFDIRECTIVE = "elifdefdirective";
export const ELSEDIRECTIVE = "elsedirective";
export const OTHERDIRECTIVE = "otherdirective";
export const DEFINEDEXPRESSION = "definedexpression";
export const COMMENT = "comment";

/** The directives, in its `Term`'s order: with `comment`, what its install adds to C Types' and Cpp Types' `Term`s. */
export const DIRECTIVES: readonly string[] = [INCLUDEDIRECTIVE, DEFINEDIRECTIVE, IFDIRECTIVE, IFDEFDIRECTIVE,
  ELIFDIRECTIVE, ELIFDEFDIRECTIVE, ELSEDIRECTIVE, OTHERDIRECTIVE];

/** Its own kinds, in its `Term`'s order, before invalid syntax. */
export const TAGS: readonly string[] = [...DIRECTIVES, DEFINEDEXPRESSION, COMMENT];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none. */
export const HELPERS: readonly string[] = [];

/** The editions it covers, by their common names, C's then C++'s. */
export const EDITIONS: readonly string[] = ["C11", "C17", "C23", "C++17", "C++20", "C++23"];

/** The editions each of its kinds arrived in, the first of each language's (C's, then C++'s), from mbse-programs'
 * `SINCE`; a kind not listed is in every edition. */
export const SINCE: ReadonlyMap<string, readonly [string, string]> = new Map([[ELIFDEFDIRECTIVE, ["C23", "C++23"]]]);

/** What an include directive's `directive` may be: `#include`, and the extensions `#include_next` and `#import`, as
 * mbse-programs' `IncludeKeyword` lists them. */
export const INCLUDES: readonly string[] = ["include", "include_next", "import"];

const ALTERNATIVES: ReadonlySet<string> = new Set([ELIFDIRECTIVE, ELIFDEFDIRECTIVE, ELSEDIRECTIVE]);
const ITEMS: ReadonlySet<string> = new Set([K.ENUMERATOR, ...DIRECTIVES, COMMENT, ...F.INVALID_KINDS.keys()]);

/**
 * C Preprocessor's union of its kinds, added to the framework's terms as the branch `c_preprocessor`, its own kinds, and
 * its dialect's schema, whose singleton is `Expressions.C.Preprocessor`: run after `Framework.install`, in a transaction
 * of its own, before or after its family's other installs; run again, it writes nothing. `definedexpression` is added to
 * C's and C++'s `Term`s, a condition's terms, and the directives and `comment` to C Types' and Cpp Types' `Term`s, whose
 * enumerations' bodies hold them; each created where its install has not run, as C's `Identifier`, a macro's name, is.
 * Its holder, `Expressions.C.Preprocessor.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed
 * to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any): any => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  /** The directives and `comment`, as a union's branches: its own `Term`'s, and C Types' and Cpp Types'. */
  const held = (_: any): any[] => [
    (t: any) => t.name("includedirective").schema([_.IncludeDirective]),
    (t: any) => t.name("definedirective").schema([_.DefineDirective]),
    (t: any) => t.name("ifdirective").schema([_.IfDirective]),
    (t: any) => t.name("ifdefdirective").schema([_.IfdefDirective]),
    (t: any) => t.name("elifdirective").schema([_.ElifDirective]),
    (t: any) => t.name("elifdefdirective").schema([_.ElifdefDirective]),
    (t: any) => t.name("elsedirective").schema([_.ElseDirective]),
    (t: any) => t.name("otherdirective").schema([_.OtherDirective]),
  ];
  return txn.uid("mbse.Expressions.C.Preprocessor/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion,
      Expression: S.OfObject, IncludeDirective: S.OfObject, DefineDirective: S.OfObject,
      IfDirective: S.OfObject, IfdefDirective: S.OfObject, ElifDirective: S.OfObject,
      ElifdefDirective: S.OfObject, ElseDirective: S.OfObject, OtherDirective: S.OfObject,
      DefinedExpression: S.OfObject, Comment: S.OfObject,
      // C's and C++'s `Term`s, C Types' and Cpp Types', and C's `Identifier`, by name
      CTerm: S.OfUnion, CppTerm: S.OfUnion, CTypesTerm: S.OfUnion, CppTypesTerm: S.OfUnion,
      Identifier: S.OfObject
    })
    .spec([
      // its dialect: the singleton `Expressions.C.Preprocessor`, a branch of the framework's kind union of
      // dialects
      (_: any) => _.Dialect.name("Expressions.C.Preprocessor.Dialect").ref(true).singleton("Expressions.C.Preprocessor").adjacencies({
          domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
          operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
          standards: (a: any) => a.relation([Framework.Covers]).me("dialect")}),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
          (t: any) => t.name("c_preprocessor").schema([_.Dialect])]),
      // its union of its kinds, and invalid syntax
      (_: any) => _.Term.name("Expressions.C.Preprocessor.Term").branches([
          ...held(_),
          (t: any) => t.name("definedexpression").schema([_.DefinedExpression]),
          (t: any) => t.name("comment").schema([_.Comment]),
          (t: any) => t.name("error").schema([Framework.Error]),
          (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Identifier.name("Expressions.C.Expressions.Identifier"),
      // `defined(name)`, a condition's term: in C's and C++'s `Term`s
      (_: any) => _.CTerm.name("Expressions.C.Expressions.Term").branches([
          (t: any) => t.name("definedexpression").schema([_.DefinedExpression])]),
      (_: any) => _.CppTerm.name("Expressions.Cpp.Expressions.Term").branches([
          (t: any) => t.name("definedexpression").schema([_.DefinedExpression])]),
      // an enumeration's items: its directives and comments too
      (_: any) => _.CTypesTerm.name("Expressions.C.Types.Term").branches([
          ...held(_), (t: any) => t.name("comment").schema([_.Comment])]),
      (_: any) => _.CppTypesTerm.name("Expressions.Cpp.Types.Term").branches([
          ...held(_), (t: any) => t.name("comment").schema([_.Comment])]),
      // the directives ([cpp]); a conditional's `items`, where a value holds it, an enumeration's items
      (_: any) => _.IncludeDirective.name("Expressions.C.Preprocessor.IncludeDirective").properties({
          directive: S.OfStr, path: S.OfStr, system: S.OfBool, macro: Framework.Term}),
      (_: any) => _.DefineDirective.name("Expressions.C.Preprocessor.DefineDirective").properties({
          name: _.Identifier, function_like: S.OfBool, parameters: many(_.Identifier),
          variadic: S.OfBool, replacement: S.OfStr}), // replacement: the text of its tokens
      (_: any) => _.IfDirective.name("Expressions.C.Preprocessor.IfDirective").properties({
          condition: Framework.Term, items: many(Framework.Term), alternative: _.Term}),
      (_: any) => _.IfdefDirective.name("Expressions.C.Preprocessor.IfdefDirective").properties({
          negated: S.OfBool, name: _.Identifier, items: many(Framework.Term), alternative: _.Term}),
      (_: any) => _.ElifDirective.name("Expressions.C.Preprocessor.ElifDirective").properties({
          condition: Framework.Term, items: many(Framework.Term), alternative: _.Term}),
      (_: any) => _.ElifdefDirective.name("Expressions.C.Preprocessor.ElifdefDirective").properties({
          negated: S.OfBool, name: _.Identifier, items: many(Framework.Term), alternative: _.Term}),
      (_: any) => _.ElseDirective.name("Expressions.C.Preprocessor.ElseDirective").properties({
          items: many(Framework.Term)}),
      (_: any) => _.OtherDirective.name("Expressions.C.Preprocessor.OtherDirective").properties({
          directive: S.OfStr, text: S.OfStr}),
      // `defined(name)` ([cpp.cond])
      (_: any) => _.DefinedExpression.name("Expressions.C.Preprocessor.DefinedExpression").properties({
          name: _.Identifier}),
      // a comment: `text` excludes its delimiters; a `trailing` one ends the line of the item before it
      (_: any) => _.Comment.name("Expressions.C.Preprocessor.Comment").properties({
          block: S.OfBool, text: S.OfStr, trailing: S.OfBool}),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root`
      // narrowed to its `Term`
      (_: any) => _.Expression.name("Expressions.C.Preprocessor.Expression").ref(true).refines([Framework.Expression]).properties({
          root: _.Term}),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
          (t: any) => t.name("c_preprocessor").schema([_.Term])]),
    ])]))]);
}

/**
 * C Preprocessor's dialect as data: the singleton `Expressions.C.Preprocessor` owning the editions it covers, by
 * designation (`standards`), C's ISO/IEC 9899:2011, 2018 and 2024 and C++'s ISO/IEC 14882:2017, 2020 and 2024, each with
 * its formal reference's parts, its common name and its own kinds it has (`SINCE`). Run after `install`, in a
 * transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and each edition by its
 * common name spelled as an identifier (`C11`, `Cpp17`).
 */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.C.Preprocessor, txn.Expressions.Framework.Standard];
  const every = (OWN.Term.as_schema().branches as readonly any[]).filter((branch) => TAGS.includes(branch.name));
  /** The kinds an edition has: each but those arriving in a later edition of its language. */
  const kinds = (edition: string): any[] => every.filter((branch) => {
    const since = SINCE.get(branch.name);
    return since === undefined || EDITIONS.indexOf(edition) >= EDITIONS.indexOf(since[edition.includes("++") ? 1 : 0]);
  }).map((branch) => branch.schema);
  return txn.uid("mbse.Expressions.C.Preprocessor.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, C11: Standard, C17: Standard, C23: Standard, Cpp17: Standard, Cpp20: Standard,
      Cpp23: Standard })
    .spec([
      (_: any) => _.dialect.standards({
        "ISO/IEC 9899:2011": (e: any) => e.standard(_.C11), "ISO/IEC 9899:2018": (e: any) => e.standard(_.C17),
        "ISO/IEC 9899:2024": (e: any) => e.standard(_.C23), "ISO/IEC 14882:2017": (e: any) => e.standard(_.Cpp17),
        "ISO/IEC 14882:2020": (e: any) => e.standard(_.Cpp20),
        "ISO/IEC 14882:2024": (e: any) => e.standard(_.Cpp23) }),
      (_: any) => _.C11.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2011n)).names(
        ["C11"]).kinds(kinds("C11")),
      (_: any) => _.C17.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2018n)).names(
        ["C17"]).kinds(kinds("C17")),
      (_: any) => _.C23.bodies(["org.iso", "ch.iec"]).number("9899").revision((r: any) => r.year(2024n)).names(
        ["C23"]).kinds(kinds("C23")),
      (_: any) => _.Cpp17.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2017n)).names(
        ["C++17"]).kinds(kinds("C++17")),
      (_: any) => _.Cpp20.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2020n)).names(
        ["C++20"]).kinds(kinds("C++20")),
      (_: any) => _.Cpp23.bodies(["org.iso", "ch.iec"]).number("14882").revision((r: any) => r.year(2024n)).names(
        ["C++23"]).kinds(kinds("C++23")),
    ])]))]);
}

/** A helper property's nodes: one, or each of many. */
function nodes(value: F.Node | readonly F.Node[]): readonly F.Node[] {
  return value instanceof F.Node ? [value] : value;
}

/** A directive's kind as mbse-programs names its class, in messages: `IfDirective`. */
function label(kind: string): string {
  return ({ [INCLUDEDIRECTIVE]: "IncludeDirective", [IFDIRECTIVE]: "IfDirective", [IFDEFDIRECTIVE]: "IfdefDirective",
    [ELIFDIRECTIVE]: "ElifDirective", [ELIFDEFDIRECTIVE]: "ElifdefDirective", [ELSEDIRECTIVE]: "ElseDirective" } as
    Record<string, string>)[kind] as string;
}

/** A node's checks, and its helpers' in turn: an include's path or macro and its directive, a conditional's branch after
 * it and its items (an enumeration's: enumerators, directives and comments), each as mbse-programs checks it, and a
 * name's spelling, as C's identifiers are checked. */
export function problems(node: F.Node): string[] {
  const { kind, attributes } = node;
  const found: string[] = [];
  if (kind === INCLUDEDIRECTIVE) {
    if (attributes.has("path") === (node.subterms.get("macro") !== null)) found.push("an IncludeDirective has a path or a macro");
    const directive = attributes.get("directive");
    if (directive !== undefined && !INCLUDES.includes(directive)) {
      found.push(`IncludeDirective.directive cannot be ${repr(directive)}`);
    }
  }
  const alternative = node.subterms.get("alternative") ?? null;
  if (alternative !== null && !ALTERNATIVES.has(F.kindOf(alternative)[0])) {
    found.push(`an ${label(kind)}'s alternative is an elifdirective, an elifdefdirective or an elsedirective`);
  }
  if (ALTERNATIVES.has(kind) || kind === IFDIRECTIVE || kind === IFDEFDIRECTIVE) {
    if (node.many.some((item) => !ITEMS.has(F.kindOf(item)[0]))) {
      found.push(`an ${label(kind)}'s items are enumerators, directives and comments`);
    }
  }
  if (kind === "identifier") found.push(...K.identifierProblems(attributes.get("spelling")));
  for (const value of node.helpers.values()) for (const inner of nodes(value)) found.push(...problems(inner));
  return found;
}

/** A kind's checks, and its helpers' (a macro's name's spelling). */
function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

/** The macros' names a condition holds, C's variables and C++'s identifiers used as expressions: what it binds within
 * itself, as each names a macro, defined or not. */
export function macros(condition: unknown): ReadonlySet<string> {
  const names = new Set<string>();
  if (condition === null || condition === undefined) return names;
  for (const term of F.walk(condition)) {
    const [tag] = F.kindOf(term);
    if ((tag === "variable" || tag === "idexpression") && F.nameOf(term) !== null) names.add(F.nameOf(term));
  }
  return names;
}

/** What each of a conditional's arguments has bound: its condition, its macros' names; its branch after it and its
 * items, nothing. */
function conditionScopes(tag: string): (record: any) => ReadonlySet<string>[] {
  return (record) => {
    const node = F.node(tag, record);
    return [macros(node.subterms.get("condition")), new Set(), ...node.many.map(() => new Set<string>())];
  };
}

/** What an include's macro has bound: its macros' names, as a condition's. */
function includeScopes(record: any): ReadonlySet<string>[] {
  return [macros(F.node(INCLUDEDIRECTIVE, record).subterms.get("macro"))];
}

/** How the framework reads its own kinds. */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), ...options });
  return {
    [INCLUDEDIRECTIVE]: application(INCLUDEDIRECTIVE, { optional: ["macro"], scopes: includeScopes }),
    [DEFINEDIRECTIVE]: application(DEFINEDIRECTIVE, { required: ["name"] }),
    [IFDIRECTIVE]: application(IFDIRECTIVE, { optional: ["alternative"], scopes: conditionScopes(IFDIRECTIVE) }),
    [IFDEFDIRECTIVE]: application(IFDEFDIRECTIVE, { required: ["name"], optional: ["alternative"] }),
    [ELIFDIRECTIVE]: application(ELIFDIRECTIVE, { optional: ["alternative"], scopes: conditionScopes(ELIFDIRECTIVE) }),
    [ELIFDEFDIRECTIVE]: application(ELIFDEFDIRECTIVE, { required: ["name"], optional: ["alternative"] }),
    [ELSEDIRECTIVE]: application(ELSEDIRECTIVE),
    [OTHERDIRECTIVE]: application(OTHERDIRECTIVE),
    [DEFINEDEXPRESSION]: application(DEFINEDEXPRESSION, { required: ["name"] }),
    [COMMENT]: application(COMMENT),
  };
}

/** The dialects whose terms are its subterms, read when first needed: C's and C++'s expressions, a condition's, and
 * their types, an enumeration's items. */
function reads(): readonly F.Dialect[] {
  return [C.DIALECT, CTypes.DIALECT, Cpp.DIALECT, CppTypes.DIALECT];
}

/** The C Preprocessor dialect: its kinds, as the framework reads them, and the terms of the C family's expressions and
 * types. */
export const DIALECT = new F.Dialect("C.Preprocessor", kinds(), { domain_of: K.untyped, reads });
