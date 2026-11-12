/**
 * Expressions of the Python Types dialect: Python's type expressions, as the typing specification defines them
 * (typing.python.org, "Type annotations"), and its type parameter lists (the Language Reference, 8.11), as
 * mbse-programs has them.
 *
 * It is a dialect of the Python family (the dialects proposal, Decided for stage 6: "most languages will have a dialect
 * for type expressions"; Retrofit's design, Python), named `Python Types` (`Terms.dialectName`), its tag
 * `python_types`. Its terms are values of its `Term`, `Expressions.Python.Types.Term`, the branch `python_types` of
 * `Expressions.Framework.Term`. A type expression's terms are Python expressions, and an annotation, a bound or a
 * default may be any expression in Python's grammar (which ones the typing specification allows is a constraint, the
 * dialects proposal's Decided, 4), so its `Term` lists every branch of `Expressions.Python.Python3.Term`, which that
 * dialect's install adds, then its own kinds and invalid syntax ("(b)"). `Python3`'s parameter (`arg`) holds it as its
 * `annotation`; mbse-programs' annotations, return types, type aliases' values and type parameter lists hold it through
 * this dialect's holder, `Expressions.Python.Types.Expression`, which refines `Expressions.Framework.Expression`, its
 * `root` narrowed to its `Term`.
 *
 * Its own kinds are mbse-programs' type parameters (`mbse:mbse-programs/python3/mbse/Programs/Python/Syntax.py`), as
 * `ast` has them, a category of their own, neither a statement nor an expression, with mbse-programs' names, lowercased
 * as branch tags, and its properties in source order, each a value object `Expressions.Python.Types.<Kind>`, its name a
 * `str`, as `Python3` keeps `ast`'s, its type expressions this dialect's `Term`:
 *
 * - `typevar` (`name: bound = default_value`, its bound and its default optional);
 * - `paramspec` (`**name = default_value`) and `typevartuple` (`*name = default_value`), their defaults optional.
 *
 * A type parameter declares a name that the statement listing it binds (a generic function, class or type alias), not a
 * term: none of its kinds refines `Let` and none has scopes, so a name its bound or its default refers to is a
 * reference the scope binds. Its kinds are applications the framework reads by their structure, of no domain known
 * statically, and are not evaluated: Python3's evaluator refuses each by name ("Python Types typevar is not
 * evaluated"); a type expression of `Python3`'s kinds evaluates as `Python3` evaluates it.
 *
 * The versions of Python it covers are data, which `define` writes: Python 3.0 to 3.15, as `Python3`'s, each with its
 * own kinds it has (`SINCE`: every one since Python 3.12; a default, 3.13, a feature within a kind, not recorded).
 * `DIALECT` reads its kinds and its family's other dialects' terms. `Text` writes its kinds as Python source, as the
 * family's printer (`Python3.Text.ToText`) dispatches them to it. Its terms are written through the builders
 * (mbse-basis [PRI-019: fluent builder syntax](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-019)), a type expression of
 * `Python3`'s kinds through its writers too: `(u) => u.typevar((t) => t.name("T").bound(Python3.name("int")))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Family from "../Python3/Domains.js";
import * as P from "../Python3/Expressions.js";
import * as PythonPatterns from "../Patterns/Expressions.js";
import * as PythonRegExp from "../RegExp/Expressions.js";

export const TYPEVAR = "typevar";
export const PARAMSPEC = "paramspec";
export const TYPEVARTUPLE = "typevartuple";

/** Its own kinds, in its `Term`'s order after `Python3`'s branches, as mbse-programs lists them. */
export const TAGS: readonly string[] = [TYPEVAR, PARAMSPEC, TYPEVARTUPLE];

/** Its own helpers, the value object schemas its kinds hold that are no kind: none, its names being strings. */
export const HELPERS: readonly string[] = [];

/** The minor version of Python 3 each of its kinds arrived in, as mbse-programs' `SINCE` has them (`py(12)`, every one),
 * from which `define` writes the kinds each version has. */
export const SINCE: ReadonlyMap<string, number> = new Map(TAGS.map((tag) => [tag, 12]));

/**
 * Python Types' union of its kinds, added to the framework's terms as the branch `python_types`, its own kinds, and its
 * dialect's schema, whose singleton is `Expressions.Python.Types`: run after `Framework.install`, in a transaction of its
 * own, before or after its family's other installs; run again, it writes nothing. `Python3`'s install adds its branches
 * to this `Term`. Its holder, `Expressions.Python.Types.Expression`, refines `Expressions.Framework.Expression`, its
 * `root` narrowed to its `Term`.
 */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.Python.Types/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Dialects: S.OfUnion, Dialect: S.OfObject, FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject,
      TypeVar: S.OfObject, ParamSpec: S.OfObject, TypeVarTuple: S.OfObject })
    .spec([
      // its dialect: the singleton `Expressions.Python.Types`, a branch of the framework's kind union of dialects
      (_: any) => _.Dialect.name("Expressions.Python.Types.Dialect").ref(true).singleton("Expressions.Python.Types").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("python_types").schema([_.Dialect])]),
      // its union of its kinds: `Python3`'s branches, which that dialect's install adds, its own, and invalid syntax
      (_: any) => _.Term.name("Expressions.Python.Types.Term").branches([
        (t: any) => t.name("typevar").schema([_.TypeVar]),
        (t: any) => t.name("paramspec").schema([_.ParamSpec]),
        (t: any) => t.name("typevartuple").schema([_.TypeVarTuple]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      // type parameters (8.11), each a name and its type expressions, this dialect's terms
      (_: any) => _.TypeVar.name("Expressions.Python.Types.TypeVar").properties({
        name: S.OfStr, bound: _.Term, default_value: _.Term }),
      (_: any) => _.ParamSpec.name("Expressions.Python.Types.ParamSpec").properties({
        name: S.OfStr, default_value: _.Term }),
      (_: any) => _.TypeVarTuple.name("Expressions.Python.Types.TypeVarTuple").properties({
        name: S.OfStr, default_value: _.Term }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed to
      // its `Term`
      (_: any) => _.Expression.name("Expressions.Python.Types.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("python_types").schema([_.Term])]),
    ])]))]);
}

/**
 * Python Types' dialect as data: the singleton `Expressions.Python.Types` owning the versions of Python 3 it covers, by
 * their published names (`standards`), Python 3.0 to 3.15, each with its body, its version and its own kinds it has
 * (`SINCE`). Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect
 * (`dialect`) and each version by its name spelled as an identifier (`Python_3_12`).
 */
export function define(txn: any): any {
  const [OWN, Standard] = [txn.Expressions.Python.Types, txn.Expressions.Framework.Standard];
  const every = (OWN.Term.as_schema().branches as { name: string; schema: unknown }[]).filter((b) => TAGS.includes(b.name));
  const minors = Array.from({ length: 16 }, (_, minor) => minor);
  const version = (minor: number) => (_: any) => _[`Python_3_${minor}`].bodies(["org.python"]).revision(
    (r: any) => r.version(`3.${minor}`)).kinds(every.filter((b) => (SINCE.get(b.name) as number) <= minor).map((b) => b.schema));
  return txn.uid("mbse.Expressions.Python.Types.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: OWN.Dialect, ...Object.fromEntries(minors.map((minor) => [`Python_3_${minor}`, Standard])) })
    .spec([
      (_: any) => _.dialect.standards(Object.fromEntries(minors.map((minor) => [`Python 3.${minor}`,
        (e: any) => e.standard(_[`Python_3_${minor}`])]))),
      ...minors.map(version),
    ])]))]);
}

/** How the framework reads its own kinds: applications, of no domain known statically (`Opaque`), each needing a name
 * that is an identifier. */
function kinds(): Record<string, F.Kind> {
  const application = (tag: string, optional: string[]) => new F.Kind(F.APPLICATION, { signature: new FD.Opaque(),
    required: ["name"], optional, check: P.identifier("name", `${F.article(tag)}'s name`) });
  return {
    [TYPEVAR]: application(TYPEVAR, ["bound", "default_value"]),
    [PARAMSPEC]: application(PARAMSPEC, ["default_value"]),
    [TYPEVARTUPLE]: application(TYPEVARTUPLE, ["default_value"]),
  };
}

/** The dialects of its family whose terms are its subterms, read when first needed. */
function reads(): readonly F.Dialect[] {
  return [P.DIALECT, PythonPatterns.DIALECT, PythonRegExp.DIALECT];
}

/** The Python Types dialect: its kinds, as the framework reads them, and its family's other dialects' terms. */
export const DIALECT = new F.Dialect("Python.Types", kinds(), { domain_of: Family.of, literal: P.native, reads });
