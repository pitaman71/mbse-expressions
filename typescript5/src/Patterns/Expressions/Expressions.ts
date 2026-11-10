/**
 * Expressions of the Patterns dialect (formerly Basic): the core vocabulary, for constraints. `Evaluators` evaluates
 * them.
 *
 * Patterns' terms are values of its `Term`, `Expressions.Patterns.Expressions.Term`, the branch `patterns` of
 * `Expressions.Framework.Term`, which `install` defines and adds to `Expressions.Framework.Term` by schema extension. Its branches are the
 * framework's kinds it reuses (`Framework/Terms`), one of its own, and the framework's kinds of invalid
 * syntax:
 *
 * - `literal`: a value (`value`), with its spelling (`text`) and what is wrong with it (`problems`) where it was read
 *   from source.
 * - `call`: an operation Patterns defines (`callable`) applied to ordered `arguments`, e.g. `eq(a, b)`: the arguments are
 *   the operation's variables in the order it declares them. See mbse-basis
 *   [CAP-095: Basic terms as data](mbse:mbse-basis/docs/capabilities/CAP-095.md#terms-and-the-core-vocabulary).
 * - `variable`: the value bound to a `name`.
 * - `let`: binds a `name` to the value of one term (`value`) within another (`body`).
 * - `list` and `mapping`: the container constructors, a list of its `elements`' values and a mapping of its `entries`'
 *   keys to their values.
 * - `quantifier`, its own: binds a `name` to each item of a `collection` within a `body`, and gives whether it holds for
 *   `all` or `any` of them, or for how many (`count`): its `quantifier`. Its slots hold Patterns' terms.
 * - `error` and `missing`: invalid syntax, which no reader of Patterns writes.
 *
 * A term carries no domain. Patterns' operations are data: `install` defines each as a `Schemas.OfExpression` in its
 * module (`Expressions.Patterns.Expressions.add`), its pattern's variables its arguments and its `result` its return, as precise as
 * the basic scalars and containers allow (`Expressions.Patterns.Expressions.Number`, an int or a float; `Expressions.Patterns.Expressions.Ordered`;
 * `Expressions.Patterns.Expressions.Collection`, a list or a mapping; an unrestricted `Schemas.OfAny` where any value goes), each
 * written in the builders' fluent syntax. `install` also adds Patterns' dialect, the singleton
 * `Expressions.Patterns.Expressions`; `define` writes the dialect's data, its operations by name
 * (`Expressions.Framework.Operates`). Validation reads them, from the store of the term's holder (a term is validated
 * within its holder, never alone): a call naming an operation the singleton does not name is refused, and one given
 * another number of arguments than its pattern's variables reported; so `define` runs before Patterns' terms are
 * validated or inferred. Inference reads `Domains.SIGNATURES`, its code, the same names. Patterns has no kinds of
 * domain and owns no domains: the kinds and the domains its values take are the standard dialects' (ISO/IEC 11404's, IEEE 754's, IEEE 1164's and Unicode's,
 * `@mbse/expressions/ISOIEC11404/Expressions` and the others), whose installs run before Patterns'.
 *
 * `DIALECT` reads them (`Terms.Dialect`, with each kind's role, vocabulary and checks), validates and infers.
 *
 * `Writer`s write terms with methods, through the builders: `variable('person').age.ge(18n)` is
 * `ge(get(person, 'age'), 18)`.
 * A writer is a spec, so it goes wherever a term is written, in a transaction:
 * `store.Expressions.Framework.Expression((e: any) => e.root(variable('person').age.ge(18n)))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as FD from "../../Framework/Domains.js";
import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

/** Patterns' union of its kinds, added to the framework's terms as the branch `patterns`, and its own kind; its
 * dialect's schema, whose singleton is `Expressions.Patterns.Expressions`; and its operations, each an expression schema
 * of its module. Run after `Framework.install` and the standard dialects' installs, in a transaction of its own; run
 * again, it writes nothing. Its dialect's data, its operations by name, `define` writes after it.
 * Its holder, `Expressions.Patterns.Expressions.Expression`, refines `Expressions.Framework.Expression`, its `root` narrowed to its
 * `Term`. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.Patterns.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      FrameworkTerm: S.OfUnion, Term: S.OfUnion, Expression: S.OfObject, Quantifier: S.OfObject, // FrameworkTerm: the framework's, by name
      Dialects: S.OfUnion, Dialect: S.OfObject, // the framework's kind union of dialects, and Patterns'
      Number: S.OfAny, Ordered: S.OfAny, Collection: S.OfAny,
      op_get: S.OfExpression, op_has: S.OfExpression, op_eq: S.OfExpression, op_ne: S.OfExpression,
      op_lt: S.OfExpression, op_le: S.OfExpression, op_gt: S.OfExpression, op_ge: S.OfExpression,
      op_and: S.OfExpression, op_or: S.OfExpression, op_not: S.OfExpression, op_implies: S.OfExpression,
      op_add: S.OfExpression, op_sub: S.OfExpression, op_mul: S.OfExpression, op_neg: S.OfExpression,
      op_bitand: S.OfExpression, op_bitor: S.OfExpression, op_bitxor: S.OfExpression, op_bitnot: S.OfExpression,
      op_shl: S.OfExpression, op_shr: S.OfExpression, op_count: S.OfExpression, op_item: S.OfExpression,
      op_in: S.OfExpression, op_sum: S.OfExpression, op_min: S.OfExpression, op_max: S.OfExpression,
      op_unique: S.OfExpression, op_entries: S.OfExpression,
    })
    .spec([
      // --- Patterns' dialect: the singleton `Expressions.Patterns.Expressions`, a branch of the framework's kind union ---
      (_: any) => _.Dialect.name("Expressions.Patterns.Expressions.Dialect").ref(true).singleton("Expressions.Patterns.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("patterns").schema([_.Dialect])]),

      // --- Its union of its kinds: the framework's it reuses, its own, and invalid syntax; the branch `patterns` of the
      // framework's terms ---
      (_: any) => _.Term.name("Expressions.Patterns.Expressions.Term").branches([
        (t: any) => t.name("literal").schema([Framework.Literal]),
        (t: any) => t.name("call").schema([Framework.Call]),
        (t: any) => t.name("variable").schema([Framework.Variable]),
        (t: any) => t.name("let").schema([Framework.Let]),
        (t: any) => t.name("list").schema([Framework.List]),
        (t: any) => t.name("mapping").schema([Framework.Mapping]),
        (t: any) => t.name("quantifier").schema([_.Quantifier]),
        (t: any) => t.name("error").schema([Framework.Error]),
        (t: any) => t.name("missing").schema([Framework.Missing]),
      ]),
      (_: any) => _.Quantifier.name("Expressions.Patterns.Expressions.Quantifier").properties({
        name: S.OfStr, // bound to each item in the body
        quantifier: S.OfStr, // all, any or count
        collection: _.Term,
        body: _.Term,
      }),
      // its holder, the root of an expression tree: a reference object refining the framework's, its `root` narrowed
      // to its `Term`
      (_: any) => _.Expression.name("Expressions.Patterns.Expressions.Expression").ref(true).refines([Framework.Expression]).properties({
        root: _.Term }),
      (_: any) => _.FrameworkTerm.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("patterns").schema([_.Term])]),

      // --- Its operations: the schemas their variables share, and each operation, which its dialect defines: its
      // pattern's variables its arguments, in order, and its result its return ---
      (_: any) => _.Number.name("Expressions.Patterns.Expressions.Number").schemas([S.OfInt, S.OfFloat]),
      (_: any) => _.Ordered.name("Expressions.Patterns.Expressions.Ordered").schemas([S.OfInt, S.OfFloat, S.OfStr, S.OfBytes]),
      (_: any) => _.Collection.name("Expressions.Patterns.Expressions.Collection").schemas([ // a list, or a mapping
        S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfAny((a: any) => a)])),
        S.OfContainer((c: any) => c.index([S.OfAny((a: any) => a)]).element([S.OfAny((a: any) => a)]))]),
      (_: any) => _.op_get.name("Expressions.Patterns.Expressions.get").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("object").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("name").schema([S.OfStr])]))]).result([S.OfAny((a: any) => a)]),
      (_: any) => _.op_has.name("Expressions.Patterns.Expressions.has").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("object").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("name").schema([S.OfStr])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_eq.name("Expressions.Patterns.Expressions.eq").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("b").schema([S.OfAny((a: any) => a)])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_ne.name("Expressions.Patterns.Expressions.ne").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("b").schema([S.OfAny((a: any) => a)])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_lt.name("Expressions.Patterns.Expressions.lt").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Ordered]),
        (v: any) => v.name("b").schema([_.Ordered])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_le.name("Expressions.Patterns.Expressions.le").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Ordered]),
        (v: any) => v.name("b").schema([_.Ordered])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_gt.name("Expressions.Patterns.Expressions.gt").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Ordered]),
        (v: any) => v.name("b").schema([_.Ordered])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_ge.name("Expressions.Patterns.Expressions.ge").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Ordered]),
        (v: any) => v.name("b").schema([_.Ordered])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_and.name("Expressions.Patterns.Expressions.and").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfBool]),
        (v: any) => v.name("b").schema([S.OfBool])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_or.name("Expressions.Patterns.Expressions.or").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfBool]),
        (v: any) => v.name("b").schema([S.OfBool])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_not.name("Expressions.Patterns.Expressions.not").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfBool])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_implies.name("Expressions.Patterns.Expressions.implies").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfBool]),
        (v: any) => v.name("b").schema([S.OfBool])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_add.name("Expressions.Patterns.Expressions.add").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Number]),
        (v: any) => v.name("b").schema([_.Number])]))]).result([_.Number]),
      (_: any) => _.op_sub.name("Expressions.Patterns.Expressions.sub").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Number]),
        (v: any) => v.name("b").schema([_.Number])]))]).result([_.Number]),
      (_: any) => _.op_mul.name("Expressions.Patterns.Expressions.mul").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Number]),
        (v: any) => v.name("b").schema([_.Number])]))]).result([_.Number]),
      (_: any) => _.op_neg.name("Expressions.Patterns.Expressions.neg").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Number])]))]).result([_.Number]),
      (_: any) => _.op_bitand.name("Expressions.Patterns.Expressions.bitand").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfInt]),
        (v: any) => v.name("b").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_bitor.name("Expressions.Patterns.Expressions.bitor").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfInt]),
        (v: any) => v.name("b").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_bitxor.name("Expressions.Patterns.Expressions.bitxor").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfInt]),
        (v: any) => v.name("b").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_bitnot.name("Expressions.Patterns.Expressions.bitnot").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_shl.name("Expressions.Patterns.Expressions.shl").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("value").schema([S.OfInt]),
        (v: any) => v.name("count").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_shr.name("Expressions.Patterns.Expressions.shr").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("value").schema([S.OfInt]),
        (v: any) => v.name("count").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_count.name("Expressions.Patterns.Expressions.count").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_item.name("Expressions.Patterns.Expressions.item").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection]),
        (v: any) => v.name("index").schema([S.OfAny((a: any) => a)])]))]).result([S.OfAny((a: any) => a)]),
      (_: any) => _.op_in.name("Expressions.Patterns.Expressions.in").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("value").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_sum.name("Expressions.Patterns.Expressions.sum").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([_.Number]),
      (_: any) => _.op_min.name("Expressions.Patterns.Expressions.min").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([_.Ordered]),
      (_: any) => _.op_max.name("Expressions.Patterns.Expressions.max").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([_.Ordered]),
      (_: any) => _.op_unique.name("Expressions.Patterns.Expressions.unique").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_entries.name("Expressions.Patterns.Expressions.entries").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("object").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("adjacency").schema([S.OfStr])]))]).result([S.OfAny((a: any) => a.schemas([ // records
          S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfAny((e: any) => e)]))]))]),
    ])]))]);
}

/** Patterns' dialect as data: the singleton `Expressions.Patterns.Expressions` naming its operations (`operations`,
 * through `Expressions.Framework.Operates`); it owns no domains. Run after `install`, in a transaction of its own; run
 * again, it writes nothing. Its frame binds the dialect: `store.transaction(Patterns.define)[0].get("dialect")`. */
export function define(txn: any): any {
  const Patterns = txn.Expressions.Patterns.Expressions;
  return txn.uid("mbse.Expressions.Patterns.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: Patterns.Dialect })
    .spec([
      (_: any) => _.dialect.operations({
        get: (e: any) => e.operation(Patterns.get), has: (e: any) => e.operation(Patterns.has),
        eq: (e: any) => e.operation(Patterns.eq), ne: (e: any) => e.operation(Patterns.ne),
        lt: (e: any) => e.operation(Patterns.lt), le: (e: any) => e.operation(Patterns.le),
        gt: (e: any) => e.operation(Patterns.gt), ge: (e: any) => e.operation(Patterns.ge),
        and: (e: any) => e.operation(Patterns.and), or: (e: any) => e.operation(Patterns.or),
        not: (e: any) => e.operation(Patterns.not), implies: (e: any) => e.operation(Patterns.implies),
        add: (e: any) => e.operation(Patterns.add), sub: (e: any) => e.operation(Patterns.sub),
        mul: (e: any) => e.operation(Patterns.mul), neg: (e: any) => e.operation(Patterns.neg),
        bitand: (e: any) => e.operation(Patterns.bitand), bitor: (e: any) => e.operation(Patterns.bitor),
        bitxor: (e: any) => e.operation(Patterns.bitxor), bitnot: (e: any) => e.operation(Patterns.bitnot),
        shl: (e: any) => e.operation(Patterns.shl), shr: (e: any) => e.operation(Patterns.shr),
        count: (e: any) => e.operation(Patterns.count), item: (e: any) => e.operation(Patterns.item),
        in: (e: any) => e.operation(Patterns.in), sum: (e: any) => e.operation(Patterns.sum),
        min: (e: any) => e.operation(Patterns.min), max: (e: any) => e.operation(Patterns.max),
        unique: (e: any) => e.operation(Patterns.unique), entries: (e: any) => e.operation(Patterns.entries),
      }),
    ])]))]);
}

/** The literal of a native value (`Terms.spec` gives it only a basic scalar). */
function native(value: unknown): Writer | null {
  return literal(value);
}

/** The Patterns dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Patterns.Expressions", {
  literal: new F.Kind(F.LITERAL),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.SIGNATURES, required: ["callable"],
    closed: true, operations: (store: any) => FD.operations(store.Instances.Expressions.Patterns.Expressions) }),
  variable: new F.Kind(F.REFERENCE, { required: ["name"] }),
  let: new F.Kind(F.BINDING, { required: ["name"] }),
  list: new F.Kind(F.APPLICATION, { signature: Domains.LIST }),
  mapping: new F.Kind(F.APPLICATION, { signature: Domains.MAPPING }),
  quantifier: new F.Kind(F.QUANTIFIER, { operator: "quantifier", vocabulary: Domains.QUANTIFIERS,
    required: ["name", "quantifier"] }),
}, { domain_of: Domains.of, literal: native });

// --- Writers: writing terms with methods ---

/** JavaScript's own protocol probes, never read as properties: awaiting, serializing or inspecting a writer is safe. */
const PROBES = new Set(["then", "toJSON", "constructor", "inspect", "nodeType", "$$typeof", "asymmetricMatch"]);

/**
 * A term of Patterns written with methods, through the builders. `.name` reads a property (`get`); use `.get(name)` for
 * names that are also methods or a writer's own (`eq`, `write`, `dialect`). A `Writer` is a spec: it writes its term
 * where it is given. Property names come from schemas at runtime, so they are typed loosely, as proxies' are.
 */
export class Writer extends F.Writer {
  [property: string]: any;

  constructor(write: (union: any) => any) {
    super(write, DIALECT.tag);
    return new Proxy(this, {
      get(target, property, receiver) {
        if (typeof property === "symbol" || property in target) return Reflect.get(target, property, receiver);
        if (property.startsWith("_") || PROBES.has(property)) return undefined;
        return (receiver as Writer).get(property);
      },
    });
  }

  get(name: string): Writer {
    return operation("get", this, name);
  }

  has(name: string): Writer {
    return operation("has", this, name);
  }

  eq(other: unknown): Writer {
    return operation("eq", this, other);
  }

  ne(other: unknown): Writer {
    return operation("ne", this, other);
  }

  lt(other: unknown): Writer {
    return operation("lt", this, other);
  }

  le(other: unknown): Writer {
    return operation("le", this, other);
  }

  gt(other: unknown): Writer {
    return operation("gt", this, other);
  }

  ge(other: unknown): Writer {
    return operation("ge", this, other);
  }

  and_(other: unknown): Writer {
    return operation("and", this, other);
  }

  or_(other: unknown): Writer {
    return operation("or", this, other);
  }

  not_(): Writer {
    return operation("not", this);
  }

  implies(other: unknown): Writer {
    return operation("implies", this, other);
  }

  add(other: unknown): Writer {
    return operation("add", this, other);
  }

  sub(other: unknown): Writer {
    return operation("sub", this, other);
  }

  mul(other: unknown): Writer {
    return operation("mul", this, other);
  }

  neg(): Writer {
    return operation("neg", this);
  }

  bitand(other: unknown): Writer {
    return operation("bitand", this, other);
  }

  bitor(other: unknown): Writer {
    return operation("bitor", this, other);
  }

  bitxor(other: unknown): Writer {
    return operation("bitxor", this, other);
  }

  bitnot(): Writer {
    return operation("bitnot", this);
  }

  shl(count: unknown): Writer {
    return operation("shl", this, count);
  }

  shr(count: unknown): Writer {
    return operation("shr", this, count);
  }

  /** The number of items of a collection. */
  count(): Writer {
    return operation("count", this);
  }

  /** The item at a position, or at a key of a keyed list. */
  item(index: unknown): Writer {
    return operation("item", this, index);
  }

  /** Whether this equals one of the items of `collection`. */
  in_(collection: unknown): Writer {
    return operation("in", this, collection);
  }

  sum(): Writer {
    return operation("sum", this);
  }

  min(): Writer {
    return operation("min", this);
  }

  max(): Writer {
    return operation("max", this);
  }

  /** Whether no two items are equal. */
  unique(): Writer {
    return operation("unique", this);
  }

  /** An object's entries in an adjacency, as records. */
  entries(adjacency: string): Writer {
    return operation("entries", this, adjacency);
  }

  /** Whether `body` holds for every item, bound to `name`. */
  all(name: string, body: unknown): Writer {
    return quantifier("all", name, this, body);
  }

  /** Whether `body` holds for some item, bound to `name`. */
  any(name: string, body: unknown): Writer {
    return quantifier("any", name, this, body);
  }

  /** How many items, bound to `name`, `body` holds for. */
  count_where(name: string, body: unknown): Writer {
    return quantifier("count", name, this, body);
  }
}

function specOf(value: unknown): F.Writer | null {
  return value === null || value === undefined ? null : DIALECT.spec(value);
}

/** The variable `name`. */
export function variable(name: string): Writer {
  return new Writer((u: any) => u.variable((v: any) => v.name(name)));
}

/** The literal `value`, a basic scalar, with no spelling: printers write its default one. */
export function literal(value: unknown): Writer {
  return new Writer((u: any) => u.literal((r: any) => (value === null || value === undefined ? r
    : r.value((p: any) => p.as_scalar(value)))));
}

/** `body`, with `name` bound to the value of `value`. */
export function let_(name: string, value: unknown, body: unknown): Writer {
  const [valueSpec, bodySpec] = [specOf(value), specOf(body)];
  return new Writer((u: any) => u.let((r: any) => {
    r.name(name);
    if (valueSpec !== null) r.value(valueSpec);
    return bodySpec === null ? r : r.body(bodySpec);
  }));
}

/** The quantifier `quantifier` (`all`, `any` or `count`) of `body`, with `name` bound to each item of `collection`. */
export function quantifier(quantifier: string, name: string, collection: unknown, body: unknown): Writer {
  const [collectionSpec, bodySpec] = [specOf(collection), specOf(body)];
  return new Writer((u: any) => u.quantifier((r: any) => {
    r.name(name).quantifier(quantifier);
    if (collectionSpec !== null) r.collection(collectionSpec);
    return bodySpec === null ? r : r.body(bodySpec);
  }));
}

/** The list of the values of `elements`, in order. */
export function list_(...elements: unknown[]): Writer {
  const specs = elements.map((element) => DIALECT.spec(element));
  return new Writer((u: any) => u.list((r: any) => r.elements(specs)));
}

/** The mapping of each entry's key's value to its value's: `mapping(["a", 1n], ["b", x])`. */
export function mapping(...entries: (readonly [unknown, unknown])[]): Writer {
  const pairs = entries.map(([key, value]) => [DIALECT.spec(key), DIALECT.spec(value)] as const);
  return new Writer((u: any) => u.mapping((r: any) => r.entries(pairs.map(([key, value]) =>
    (a: any) => a.as_object((o: any) => o.key(key).value(value))))));
}

/** The operation `name` applied to `args`, in the order its variables are declared; for operations without a method. */
export function operation(name: string, ...args: unknown[]): Writer {
  const specs = args.map((argument) => DIALECT.spec(argument));
  return new Writer((u: any) => u.call((r: any) => r.callable(name).arguments(specs)));
}
