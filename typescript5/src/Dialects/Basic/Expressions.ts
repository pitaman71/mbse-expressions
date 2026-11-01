/**
 * Expressions of the Basic dialect: the core vocabulary, for constraints. `Evaluators` evaluates them.
 *
 * Basic's terms are the framework's kinds (`Framework/Terms`) and one of its own, which `install` adds to
 * `Expressions.Framework.Term` by schema extension:
 *
 * - `literal`: a basic scalar (`value`).
 * - `call`: an operation Basic defines (`callable`) applied to ordered `arguments`, e.g. `eq(a, b)`: the arguments are
 *   the operation's variables in the order it declares them. See mbse-basis
 *   [CAP-095: Basic terms as data](../../../../../mbse-basis/docs/capabilities/CAP-095.md#terms-and-the-core-vocabulary).
 * - `variable`: the value bound to a `name`.
 * - `let`: binds a `name` to the value of one term (`value`) within another (`body`).
 * - `list` and `mapping`: the container constructors, a list of its `elements`' values and a mapping of its `entries`'
 *   keys to their values.
 * - `quantifier`: binds a `name` to each item of a `collection` within a `body`, and gives whether it holds for `all` or
 *   `any` of them, or for how many (`count`): its `quantifier`.
 *
 * A term carries no domain. Basic's operations are data: `install` defines each as a `Schemas.OfExpression` in Basic's
 * module (`Expressions.Basic.add`), its pattern's variables its arguments and its `result` its return, as precise as the
 * basic scalars and containers allow (`Expressions.Basic.Number`, an int or a float; `Expressions.Basic.Ordered`;
 * `Expressions.Basic.Collection`, a list or a mapping; an unrestricted `Schemas.OfAny` where any value goes), each
 * written in the builders' fluent syntax. Validation reads Basic's vocabulary (`Domains.SIGNATURES`, the same names,
 * which a term alone, in no store, can read): a call naming an operation Basic does not define is refused. `install` also
 * adds Basic's kinds of domain to `Expressions.Framework.DomainKind` (`Domains`) and the schemas of its domains, and
 * Basic's dialect, the singleton `Expressions.Basic`; `define` writes the dialect's data: its operations by name
 * (`Expressions.Framework.Operates`) and its domains, which it owns by name (`Expressions.Framework.Defines`).
 *
 * `DIALECT` reads them (`Terms.Dialect`, with each kind's role, vocabulary and checks), validates and infers.
 *
 * `Writer`s write terms with methods, through the builders: `variable('person').age.ge(18n)` is
 * `ge(get(person, 'age'), 18)`. A writer is a spec, so it goes wherever a term is written, in a transaction:
 * `store.Expressions.Framework.Expression((e: any) => e.root(variable('person').age.ge(18n)))`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as F from "../../Framework/Terms.js";
import * as Domains from "./Domains.js";

/** The operations Basic defines and their numbers of arguments. */
export const CORE: ReadonlyMap<string, number> = new Map(
  [...Domains.SIGNATURES].map(([name, signature]) => [name, signature.arity()]));

/** Basic's own kind, added to the framework's terms; its dialect's schema, whose singleton is `Expressions.Basic`; its
 * kinds of domain, added to the framework's, and its domains' schemas; and its operations, each an expression schema of
 * its module. Run after `Framework.install`, in a transaction of its own; run again, it writes nothing. Its dialect's
 * data, its operations by name and its domains, `define` writes after it. */
export function install(txn: any): any {
  const S = txn.Schemas;
  return txn.uid("mbse.Expressions.Basic/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Term: S.OfUnion, Quantifier: S.OfObject, // the framework's union, found by its name
      Dialects: S.OfUnion, Dialect: S.OfObject, // the framework's kind union of dialects, and Basic's
      DomainKind: S.OfUnion, Domain: S.OfObject, Packs: S.OfRelation,
      OfBool: S.OfObject, OfInteger: S.OfObject, OfIeee754: S.OfObject, OfBits: S.OfObject, OfBytes: S.OfObject,
      OfUnicode: S.OfObject, OfIeee1164: S.OfObject, OfEnum: S.OfObject, OfPacked: S.OfObject,
      bool: S.OfAny, int: S.OfAny, float: S.OfAny, str: S.OfAny, bytes: S.OfAny, uint8: S.OfAny, binary32: S.OfAny,
      std_logic: S.OfAny,
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
      // --- Basic's dialect: the singleton `Expressions.Basic`, a branch of the framework's kind union ---
      (_: any) => _.Dialect.name("Expressions.Basic.Dialect").ref(true).singleton("Expressions.Basic").adjacencies({
        domains: (a: any) => a.relation([txn.Expressions.Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([txn.Expressions.Framework.Operates]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("basic").schema([_.Dialect])]),

      (_: any) => _.Quantifier.name("Expressions.Basic.Quantifier").properties({
        name: S.OfStr, // bound to each item in the body
        quantifier: S.OfStr, // all, any or count
        collection: _.Term,
        body: _.Term,
      }),
      (_: any) => _.Term.name("Expressions.Framework.Term").branches([ // a branch added: schema extension
        (t: any) => t.name("quantifier").schema([_.Quantifier])]),

      // --- Its kinds of domain, each a standard's parameters; a packed domain's enum and representation are domains,
      // which a value cannot hold: `Packs` links them ---
      (_: any) => _.OfBool.name("Expressions.Basic.OfBool"),
      (_: any) => _.OfInteger.name("Expressions.Basic.OfInteger").properties({
        width: S.OfInt, signed: S.OfBool, overflow: S.OfStr }),
      (_: any) => _.OfIeee754.name("Expressions.Basic.OfIeee754").properties({ format: S.OfStr, rounding: S.OfStr }),
      (_: any) => _.OfBits.name("Expressions.Basic.OfBits").properties({ width: S.OfInt }),
      (_: any) => _.OfBytes.name("Expressions.Basic.OfBytes").properties({ width: S.OfInt }),
      (_: any) => _.OfUnicode.name("Expressions.Basic.OfUnicode"),
      (_: any) => _.OfIeee1164.name("Expressions.Basic.OfIeee1164").properties({ width: S.OfInt }),
      (_: any) => _.OfEnum.name("Expressions.Basic.OfEnum").properties({
        members: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfStr])) }),
      (_: any) => _.OfPacked.name("Expressions.Basic.OfPacked").properties({
        codes: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfInt])) }),
      (_: any) => _.DomainKind.name("Expressions.Framework.DomainKind").branches([
        (t: any) => t.name("bool").schema([_.OfBool]),
        (t: any) => t.name("integer").schema([_.OfInteger]),
        (t: any) => t.name("ieee754").schema([_.OfIeee754]),
        (t: any) => t.name("bits").schema([_.OfBits]),
        (t: any) => t.name("bytes").schema([_.OfBytes]),
        (t: any) => t.name("unicode").schema([_.OfUnicode]),
        (t: any) => t.name("ieee1164").schema([_.OfIeee1164]),
        (t: any) => t.name("enum").schema([_.OfEnum]),
        (t: any) => t.name("packed").schema([_.OfPacked]),
      ]),
      (_: any) => _.Packs.name("Expressions.Basic.Packs").links([
        (t: any) => t.name("packed"), (t: any) => t.name("domain").schema([_.Domain]),
        (t: any) => t.name("representation").schema([_.Domain])]).uniques([["packed"]]),
      (_: any) => _.Domain.name("Expressions.Framework.Domain").adjacencies({
        packs: (a: any) => a.relation([_.Packs]).me("packed") }),

      // --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.bool.name("Expressions.Basic.bool").schemas([S.OfBool]),
      (_: any) => _.int.name("Expressions.Basic.int").schemas([S.OfInt]),
      (_: any) => _.float.name("Expressions.Basic.float").schemas([S.OfFloat]),
      (_: any) => _.str.name("Expressions.Basic.str").schemas([S.OfStr]),
      (_: any) => _.bytes.name("Expressions.Basic.bytes").schemas([S.OfBytes]),
      (_: any) => _.uint8.name("Expressions.Basic.uint8").schemas([S.OfInt]),
      (_: any) => _.binary32.name("Expressions.Basic.binary32").schemas([S.OfFloat]),
      (_: any) => _.std_logic.name("Expressions.Basic.std_logic").schemas([S.OfStr]),

      // --- Its operations: the schemas their variables share, and each operation, which its dialect defines: its
      // pattern's variables its arguments, in order, and its result its return ---
      (_: any) => _.Number.name("Expressions.Basic.Number").schemas([S.OfInt, S.OfFloat]),
      (_: any) => _.Ordered.name("Expressions.Basic.Ordered").schemas([S.OfInt, S.OfFloat, S.OfStr, S.OfBytes]),
      (_: any) => _.Collection.name("Expressions.Basic.Collection").schemas([ // a list, or a mapping
        S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfAny((a: any) => a)])),
        S.OfContainer((c: any) => c.index([S.OfAny((a: any) => a)]).element([S.OfAny((a: any) => a)]))]),
      (_: any) => _.op_get.name("Expressions.Basic.get").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("object").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("name").schema([S.OfStr])]))]).result([S.OfAny((a: any) => a)]),
      (_: any) => _.op_has.name("Expressions.Basic.has").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("object").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("name").schema([S.OfStr])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_eq.name("Expressions.Basic.eq").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("b").schema([S.OfAny((a: any) => a)])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_ne.name("Expressions.Basic.ne").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("b").schema([S.OfAny((a: any) => a)])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_lt.name("Expressions.Basic.lt").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Ordered]),
        (v: any) => v.name("b").schema([_.Ordered])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_le.name("Expressions.Basic.le").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Ordered]),
        (v: any) => v.name("b").schema([_.Ordered])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_gt.name("Expressions.Basic.gt").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Ordered]),
        (v: any) => v.name("b").schema([_.Ordered])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_ge.name("Expressions.Basic.ge").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Ordered]),
        (v: any) => v.name("b").schema([_.Ordered])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_and.name("Expressions.Basic.and").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfBool]),
        (v: any) => v.name("b").schema([S.OfBool])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_or.name("Expressions.Basic.or").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfBool]),
        (v: any) => v.name("b").schema([S.OfBool])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_not.name("Expressions.Basic.not").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfBool])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_implies.name("Expressions.Basic.implies").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfBool]),
        (v: any) => v.name("b").schema([S.OfBool])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_add.name("Expressions.Basic.add").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Number]),
        (v: any) => v.name("b").schema([_.Number])]))]).result([_.Number]),
      (_: any) => _.op_sub.name("Expressions.Basic.sub").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Number]),
        (v: any) => v.name("b").schema([_.Number])]))]).result([_.Number]),
      (_: any) => _.op_mul.name("Expressions.Basic.mul").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Number]),
        (v: any) => v.name("b").schema([_.Number])]))]).result([_.Number]),
      (_: any) => _.op_neg.name("Expressions.Basic.neg").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([_.Number])]))]).result([_.Number]),
      (_: any) => _.op_bitand.name("Expressions.Basic.bitand").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfInt]),
        (v: any) => v.name("b").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_bitor.name("Expressions.Basic.bitor").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfInt]),
        (v: any) => v.name("b").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_bitxor.name("Expressions.Basic.bitxor").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfInt]),
        (v: any) => v.name("b").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_bitnot.name("Expressions.Basic.bitnot").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("a").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_shl.name("Expressions.Basic.shl").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("value").schema([S.OfInt]),
        (v: any) => v.name("count").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_shr.name("Expressions.Basic.shr").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("value").schema([S.OfInt]),
        (v: any) => v.name("count").schema([S.OfInt])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_count.name("Expressions.Basic.count").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([S.OfAny((a: any) => a.schemas([S.OfInt]))]),
      (_: any) => _.op_item.name("Expressions.Basic.item").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection]),
        (v: any) => v.name("index").schema([S.OfAny((a: any) => a)])]))]).result([S.OfAny((a: any) => a)]),
      (_: any) => _.op_in.name("Expressions.Basic.in").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("value").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_sum.name("Expressions.Basic.sum").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([_.Number]),
      (_: any) => _.op_min.name("Expressions.Basic.min").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([_.Ordered]),
      (_: any) => _.op_max.name("Expressions.Basic.max").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([_.Ordered]),
      (_: any) => _.op_unique.name("Expressions.Basic.unique").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("collection").schema([_.Collection])]))]).result([S.OfAny((a: any) => a.schemas([S.OfBool]))]),
      (_: any) => _.op_entries.name("Expressions.Basic.entries").pattern([S.OfPattern((p: any) => p.variables([
        (v: any) => v.name("object").schema([S.OfAny((a: any) => a)]),
        (v: any) => v.name("adjacency").schema([S.OfStr])]))]).result([S.OfAny((a: any) => a.schemas([ // records
          S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfAny((e: any) => e)]))]))]),
    ])]))]);
}

/** Basic's dialect as data: the singleton `Expressions.Basic` naming its operations (`operations`, through
 * `Expressions.Framework.Operates`) and owning its domains by name (`domains`, through `Expressions.Framework.Defines`),
 * each related to its schema (`Expressions.Basic.uint8`) by `Expressions.Framework.HasDomain`. Run after `install`, in a
 * transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and each domain by its
 * name: `store.transaction(Basic.define)[0].get("uint8")`. */
export function define(txn: any): any {
  const [Basic, Domain] = [txn.Expressions.Basic, txn.Expressions.Framework.Domain];
  return txn.uid("mbse.Expressions.Basic.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: Basic.Dialect, bool: Domain, int: Domain, float: Domain, str: Domain, bytes: Domain,
      uint8: Domain, binary32: Domain, std_logic: Domain })
    .spec([
      (_: any) => _.dialect.operations({
        get: (e: any) => e.operation(Basic.get), has: (e: any) => e.operation(Basic.has),
        eq: (e: any) => e.operation(Basic.eq), ne: (e: any) => e.operation(Basic.ne),
        lt: (e: any) => e.operation(Basic.lt), le: (e: any) => e.operation(Basic.le),
        gt: (e: any) => e.operation(Basic.gt), ge: (e: any) => e.operation(Basic.ge),
        and: (e: any) => e.operation(Basic.and), or: (e: any) => e.operation(Basic.or),
        not: (e: any) => e.operation(Basic.not), implies: (e: any) => e.operation(Basic.implies),
        add: (e: any) => e.operation(Basic.add), sub: (e: any) => e.operation(Basic.sub),
        mul: (e: any) => e.operation(Basic.mul), neg: (e: any) => e.operation(Basic.neg),
        bitand: (e: any) => e.operation(Basic.bitand), bitor: (e: any) => e.operation(Basic.bitor),
        bitxor: (e: any) => e.operation(Basic.bitxor), bitnot: (e: any) => e.operation(Basic.bitnot),
        shl: (e: any) => e.operation(Basic.shl), shr: (e: any) => e.operation(Basic.shr),
        count: (e: any) => e.operation(Basic.count), item: (e: any) => e.operation(Basic.item),
        in: (e: any) => e.operation(Basic.in), sum: (e: any) => e.operation(Basic.sum),
        min: (e: any) => e.operation(Basic.min), max: (e: any) => e.operation(Basic.max),
        unique: (e: any) => e.operation(Basic.unique), entries: (e: any) => e.operation(Basic.entries),
      }).domains({
        bool: (e: any) => e.domain(_.bool), int: (e: any) => e.domain(_.int),
        float: (e: any) => e.domain(_.float), str: (e: any) => e.domain(_.str),
        bytes: (e: any) => e.domain(_.bytes), uint8: (e: any) => e.domain(_.uint8),
        binary32: (e: any) => e.domain(_.binary32), std_logic: (e: any) => e.domain(_.std_logic),
      }),
      (_: any) => _.bool.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.bool((d: any) => d)))).schema([
        Basic.bool]),
      (_: any) => _.int.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.integer(
        (d: any) => d.signed(true).overflow("raise"))))).schema([Basic.int]),
      (_: any) => _.float.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven"))))).schema([Basic.float]),
      (_: any) => _.str.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.unicode((d: any) => d)))).schema([
        Basic.str]),
      (_: any) => _.bytes.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.bytes((d: any) => d)))).schema([
        Basic.bytes]),
      (_: any) => _.uint8.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.integer(
        (d: any) => d.width(8n).signed(false).overflow("wrap"))))).schema([Basic.uint8]),
      (_: any) => _.binary32.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754(
        (d: any) => d.format("binary32").rounding("roundTiesToEven"))))).schema([Basic.binary32]),
      (_: any) => _.std_logic.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee1164((d: any) => d))))
        .schema([Basic.std_logic]),
    ])]))]);
}

/** The literal of a native value (`Terms.spec` gives it only a basic scalar). */
function native(value: unknown): Writer | null {
  return literal(value);
}

/** The Basic dialect: its kinds, as the framework reads them. */
export const DIALECT = new F.Dialect("Basic", {
  literal: new F.Kind(F.LITERAL),
  call: new F.Kind(F.APPLICATION, { operator: "callable", vocabulary: Domains.SIGNATURES, required: ["callable"],
    closed: true }),
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
 * A term written with methods, through the builders. `.name` reads a property (`get`); use `.get(name)` for names that
 * are also methods, such as `eq`. A `Writer` is a spec: it writes its term where it is given. Property names come from
 * schemas at runtime, so they are typed loosely, as proxies' are.
 */
export class Writer extends F.Writer {
  [property: string]: any;

  constructor(write: (union: any) => any) {
    super(write);
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

/** The literal `value`, a basic scalar. */
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
