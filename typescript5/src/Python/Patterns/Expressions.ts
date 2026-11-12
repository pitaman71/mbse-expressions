/**
 * Expressions of the Python Patterns dialect: the patterns of Python's `match` statement, a grammar of their own (the
 * Language Reference, 8.6.4, "Patterns"), as mbse-programs has them.
 *
 * It is a dialect of the Python family (the dialects proposal, Decided for stage 6: "if the standard says it's a
 * sublanguage then it's definitely at least a separate dialect"; Retrofit's design, Python), named `Python Patterns`
 * (`Terms.dialectName`), its tag `python_patterns`. Its terms are values of its `Term`,
 * `Expressions.Python.Patterns.Term`, the branch `python_patterns` of `Expressions.Framework.Term`. A `match` is a
 * statement, so no subterm of `Python3` is a pattern: mbse-programs' `case` holds one through this dialect's
 * holder, `Expressions.Python.Patterns.Expression`, which refines `Expressions.Framework.Expression`, its `root`
 * narrowed to its `Term`. Its `Term` lists none of `Python3`'s branches: an expression in a pattern is a kind's
 * own subterm, of `Expressions.Python.Python3.Term`.
 *
 * Its kinds are mbse-programs' patterns (`mbse:mbse-programs/python3/mbse/Programs/Python/Syntax.py`), as `ast` has
 * them, with mbse-programs' names, lowercased as branch tags, and its properties in source order, each a value object
 * `Expressions.Python.Patterns.<Kind>`; a name is a `str`, as `Python3` keeps `ast`'s:
 *
 * - `matchvalue` (`value`: a literal, or a dotted name, a `Python3` term) and `matchsingleton` (`value`: `None`, `True`
 *   or `False`, compared by identity);
 * - `matchsequence` (`[p, q]`, `(p, q)`, or `p, q` without `delimiters`, its `patterns`);
 * - `matchmapping` (`{key: pattern, **rest}`: its `keys`, `Python3` terms, and its `patterns`, which pair up, and its
 *   `rest`, a name);
 * - `matchclass` (`cls(pattern, kwd_attr=kwd_pattern)`: `cls`, a `Python3` term, its positional `patterns`, and its
 *   `kwd_attrs`, names, and `kwd_patterns`, which pair up);
 * - `matchstar` (`*name` in a sequence pattern, `*_` without a name);
 * - `matchas` (`pattern as name`; a capture `name` without a pattern; the wildcard `_` without either, never a pattern
 *   without a name, as `ast` has it);
 * - `matchor` (`pattern | pattern`, two at least);
 *
 * then the framework's kinds of invalid syntax, `error` and `missing`. `matchmapping` and `matchclass` each hold two
 * containers of terms (`keys` and `patterns`; `patterns` and `kwd_patterns`), read in declaration order, a form's
 * attributes giving each one's size (the API, item 210), and are checked as mbse-programs checks them ("a MatchMapping
 * needs a pattern for each key", "a MatchClass needs a pattern for each keyword", "a MatchOr needs two patterns").
 *
 * What a pattern binds is its capture names (`boundNames`), which the `case` that holds it binds in its guard and its
 * body: a pattern binds, but is no binder of its own, as SystemVerilog's patterns are not (the API, item 189), so none
 * of its kinds refines `Let` and none has scopes. Its kinds are applications the framework reads by their structure, of
 * no domain known statically, and are not evaluated: Python3's evaluator refuses each by name ("Python Patterns matchas
 * is not evaluated").
 *
 * The versions of Python it covers are data, which `define` writes: Python 3.10 to 3.15, each with its own kinds it has
 * (`SINCE`: every one since Python 3.10). `DIALECT` reads its kinds and its family's other dialects' terms. `Text`
 * writes its kinds as Python source, as the family's printer (`Python3.Text.ToText`) dispatches them to it. Its terms
 * are written through the builders (mbse-basis [PRI-019: fluent builder
 * syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)): `(u) => u.matchas((m) => m.name("x"))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Repr } from "@mbse/schemas/Framework";

import * as FD from "../../Framework/Domains.js";
import type { Listed } from "../../Framework/Objects.js";
import * as F from "../../Framework/Terms.js";
import * as Family from "../Python3/Domains.js";
import * as P from "../Python3/Expressions.js";
import * as PythonRegExp from "../RegExp/Expressions.js";
import * as PythonTypes from "../Types/Expressions.js";

const { repr } = Repr;

export const MATCHVALUE = "matchvalue";
export const MATCHSINGLETON = "matchsingleton";
export const MATCHSEQUENCE = "matchsequence";
export const MATCHMAPPING = "matchmapping";
export const MATCHCLASS = "matchclass";
export const MATCHSTAR = "matchstar";
export const MATCHAS = "matchas";
export const MATCHOR = "matchor";

/** Its own kinds, in its `Term`'s order, as mbse-programs lists them. */
export const TAGS: readonly string[] = [MATCHVALUE, MATCHSINGLETON, MATCHSEQUENCE, MATCHMAPPING, MATCHCLASS, MATCHSTAR,
  MATCHAS, MATCHOR];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none, its names being strings. */
export const HELPERS: readonly string[] = [];

/** The minor version of Python 3 each of its kinds arrived in, as mbse-programs' `SINCE` has them (`py(10)`, every one),
 * from which `define` writes the kinds each version has. */
export const SINCE: ReadonlyMap<string, number> = new Map(TAGS.map((tag) => [tag, 10]));

/** What a `matchsingleton` compares by identity, as mbse-programs' `Singleton` has them. */
export const SINGLETONS: readonly string[] = ["None", "True", "False"];

/** A `matchsequence`'s delimiters, where it has them, as mbse-programs' `Delimiter` has them. */
export const DELIMITERS: readonly string[] = ["[]", "()"];

/**
 * Python Patterns' union of its kinds, added to the framework's terms as the branch `python_patterns`, its own kinds, and
 * its dialect's schema, whose singleton is `Expressions.Python.Patterns`: run after `Framework.install`, in a transaction
 * of its own, before or after its family's other installs; run again, it writes nothing. `Python3`'s `Term`, which its
 * subterms for expressions hold, is named, created where that install has not run. Its holder,
 * `Expressions.Python.Patterns.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  const many = (element: any) => S.OfContainer((c: any) => c.index([S.OfInt]).element([element]));
  return txn.uid("mbse.Expressions.Python.Patterns/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      // `Python3`'s union of its kinds, by name: its install's, created here where it has not run
      Python3Term: S.OfUnion,
      MatchValue: S.OfObject, MatchSingleton: S.OfObject, MatchSequence: S.OfObject, MatchMapping: S.OfObject,
      MatchClass: S.OfObject, MatchStar: S.OfObject, MatchAs: S.OfObject, MatchOr: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.Python.Patterns`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Python.Patterns.Dialect").ref(true).singleton("Expressions.Python.Patterns").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("python_patterns").schema([_.Dialect])]),
      // its union of its kinds: its own, and invalid syntax
      (_: any) => _.Term.name("Expressions.Python.Patterns.Term").branches([
        (t: any) => t.name("matchvalue").schema([_.MatchValue]),
        (t: any) => t.name("matchsingleton").schema([_.MatchSingleton]),
        (t: any) => t.name("matchsequence").schema([_.MatchSequence]),
        (t: any) => t.name("matchmapping").schema([_.MatchMapping]),
        (t: any) => t.name("matchclass").schema([_.MatchClass]),
        (t: any) => t.name("matchstar").schema([_.MatchStar]),
        (t: any) => t.name("matchas").schema([_.MatchAs]),
        (t: any) => t.name("matchor").schema([_.MatchOr]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Python3Term.name("Expressions.Python.Python3.Term"),
      // patterns (8.6.4), each nested pattern this dialect's term, each expression `Python3`'s
      (_: any) => _.MatchValue.name("Expressions.Python.Patterns.MatchValue").properties({ value: _.Python3Term }),
      (_: any) => _.MatchSingleton.name("Expressions.Python.Patterns.MatchSingleton").properties({ value: S.OfStr }),
      (_: any) => _.MatchSequence.name("Expressions.Python.Patterns.MatchSequence").properties({
        delimiters: S.OfStr, // absent: an open sequence, `case a, b:`
        patterns: many(_.Term) }),
      (_: any) => _.MatchMapping.name("Expressions.Python.Patterns.MatchMapping").properties({
        keys: many(_.Python3Term), patterns: many(_.Term), rest: S.OfStr }),
      (_: any) => _.MatchClass.name("Expressions.Python.Patterns.MatchClass").properties({
        cls: _.Python3Term, patterns: many(_.Term), kwd_attrs: many(S.OfStr), kwd_patterns: many(_.Term) }),
      (_: any) => _.MatchStar.name("Expressions.Python.Patterns.MatchStar").properties({ name: S.OfStr }),
      (_: any) => _.MatchAs.name("Expressions.Python.Patterns.MatchAs").properties({ pattern: _.Term, name: S.OfStr }),
      (_: any) => _.MatchOr.name("Expressions.Python.Patterns.MatchOr").properties({ patterns: many(_.Term) }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.Python.Patterns.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("python_patterns").schema([_.Term])]),
    ])]))]);
}

/**
 * Python Patterns' dialect as data: the singleton `Expressions.Python.Patterns` owning the versions of Python 3 it covers,
 * by their published names (`standards`), Python 3.10 to 3.15, each with its body, its version and its own kinds it has
 * (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect
 * (`dialect`) and each version by its name spelled as an identifier (`Python_3_10`).
 */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.Python.Patterns, txn.Expressions.Framework.Standard];
  const every = (OWN.Term.as_schema().branches as { name: string; schema: unknown }[]).filter((b) => TAGS.includes(b.name));
  const minors = Array.from({ length: 6 }, (_, i) => 10 + i);
  const version = (minor: number) => (_: any) => _[`Python_3_${minor}`].bodies(["org.python"]).revision(
    (r: any) => r.version(`3.${minor}`)).kinds(every.filter((b) => (SINCE.get(b.name) as number) <= minor).map((b) => b.schema));
  return txn.uid("mbse.Expressions.Python.Patterns.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, ...Object.fromEntries(minors.map((minor) => [`Python_3_${minor}`, Standard])) })
    .spec([
      (_: any) => _.dialect.standards(Object.fromEntries(minors.map((minor) => [`Python 3.${minor}`,
        (e: any) => e.standard(_[`Python_3_${minor}`])]))),
      ...minors.map(version),
    ])]))]);
}

/** The names a pattern binds, its capture names, wherever its sequence, mapping, class, `as` and `or` patterns nest them,
 * which the `case` that holds it binds in its guard and its body (8.6.4): an `as` pattern's and a star pattern's name,
 * and a mapping pattern's rest; none of a value or a singleton pattern, of a wildcard, of an expression a pattern holds
 * (whose names are references) or of invalid syntax. */
export function boundNames(pattern: any): ReadonlySet<string> {
  const [tag, record] = F.kindOf(pattern);
  const node = F.node(tag, record);
  const names = [MATCHSTAR, MATCHAS, MATCHMAPPING].includes(tag)
    ? ["name", "rest"].filter((name) => node.attributes.has(name)).map((name) => node.attributes.get(name) as string) : [];
  if ([MATCHSEQUENCE, MATCHMAPPING, MATCHCLASS, MATCHOR].includes(tag)) {
    const inner = node.many.slice((node.lists.get("keys") ?? []).length); // its patterns, after a mapping's keys
    return new Set([...names, ...inner.flatMap((item) => [...boundNames(item)])]);
  }
  const pattern_ = node.subterms.get("pattern") ?? null;
  if (tag === MATCHAS && pattern_ !== null) return new Set([...names, ...boundNames(pattern_)]);
  return new Set(names);
}

/** A capture name, if given: an identifier, and not `_`, which captures nothing (the wildcard). */
function capture(what: string, value: unknown): string[] {
  if (value === "_") return [`${what} cannot be '_'`];
  return P.identifierProblems(what, value);
}

/** A node's checks: mbse-programs' (a choice among a few, a mapping's pattern for each key, a class's pattern for each
 * keyword, an `or` of two patterns), `ast`'s (an `as` pattern with a pattern has a name, the wildcard being one with
 * neither), and its names' (an identifier, a capture name not `_`). */
export function problems(node: F.Node): string[] {
  const found: string[] = [];
  const [attributes, lists] = [node.attributes, node.lists];
  if (node.kind === MATCHSINGLETON && attributes.has("value") && !SINGLETONS.includes(attributes.get("value"))) {
    found.push(`MatchSingleton.value cannot be ${repr(attributes.get("value"))}`);
  } else if (node.kind === MATCHSEQUENCE && attributes.has("delimiters") && !DELIMITERS.includes(attributes.get("delimiters"))) {
    found.push(`MatchSequence.delimiters cannot be ${repr(attributes.get("delimiters"))}`);
  } else if (node.kind === MATCHMAPPING) {
    if ((lists.get("keys") as readonly any[]).length !== (lists.get("patterns") as readonly any[]).length) {
      found.push("a MatchMapping needs a pattern for each key");
    }
    found.push(...capture("a matchmapping's rest", attributes.get("rest")));
  } else if (node.kind === MATCHCLASS) {
    const attrs = attributes.has("kwd_attrs") ? (attributes.get("kwd_attrs") as Listed).values : [];
    if (attrs.length !== (lists.get("kwd_patterns") as readonly any[]).length) {
      found.push("a MatchClass needs a pattern for each keyword");
    }
    for (const attr of attrs) found.push(...P.identifierProblems("a matchclass's kwd_attr", attr));
  } else if (node.kind === MATCHSTAR || node.kind === MATCHAS) {
    if (node.kind === MATCHAS && (node.subterms.get("pattern") ?? null) !== null && !attributes.has("name")) {
      found.push("a matchas with a pattern needs a name"); // as `ast` has it: a wildcard has no pattern
    }
    found.push(...capture(`${F.article(node.kind)}'s name`, attributes.get("name")));
  } else if (node.kind === MATCHOR && node.many.length < 2) {
    found.push("a MatchOr needs two patterns");
  }
  return found;
}

function check(tag: string): (record: any) => string[] {
  return (record) => problems(F.node(tag, record));
}

/** How the framework reads its own kinds: applications, of no domain known statically (`Opaque`). */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, options: F.KindOptions = {}) =>
    new F.Kind(F.APPLICATION, { signature: new FD.Opaque(), check: check(tag), ...options });
  return {
    [MATCHVALUE]: application(MATCHVALUE),
    [MATCHSINGLETON]: application(MATCHSINGLETON, { required: ["value"] }),
    [MATCHSEQUENCE]: application(MATCHSEQUENCE),
    [MATCHMAPPING]: application(MATCHMAPPING),
    [MATCHCLASS]: application(MATCHCLASS),
    [MATCHSTAR]: application(MATCHSTAR),
    [MATCHAS]: application(MATCHAS, { optional: ["pattern"] }),
    [MATCHOR]: application(MATCHOR),
  };
}

/** The dialects of its family whose terms are its subterms, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [P.DIALECT, PythonTypes.DIALECT, PythonRegExp.DIALECT];
}

/** The Python Patterns dialect: its kinds, as the framework reads them, and its family's other dialects' terms. */
export const DIALECT = new F.Dialect("Python.Patterns", kinds(), { domain_of: Family.of, reads });
