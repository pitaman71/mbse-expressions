/**
 * The IEEE 754 dialect: the kind of domain of IEEE Std 754-2019, floating-point arithmetic, and the domains it defines.
 * It has no terms. See mbse-basis
 * [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).
 *
 * Its kind of domain, the branch of its union `Expressions.IEEE754.Expressions.DomainKind`, which `install` adds to the
 * framework's `Expressions.Framework.DomainKind` as the branch `ieee754`:
 *
 * - `ieee754` (`OfIeee754`): an interchange `format`, with a `rounding`-direction attribute; inferred (populated by hand
 *   until constraint resolution computes them) the format's `width` in bits and its parameters, its `radix`,
 *   `precision` (in digits) and `emax`, and `ordered`. A format IEEE 754 does not name (x87's extended format,
 *   bfloat16) is a domain of the kind with no `format`, given by its `width` and parameters, which `Ieee754` computes
 *   in.
 *
 * Its dialect is the singleton `Expressions.IEEE754.Expressions`, of its schema `Expressions.IEEE754.Expressions.Dialect`,
 * the branch `ieee754` of `Expressions.Framework.Dialect`. `define` writes its domains, owned by name, each related to its
 * schema, an `OfAny` of floats: `binary64` and `binary32`, each rounding ties to even.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The standards this dialect implements, by designation. */
export const STANDARDS: readonly string[] = ["IEEE Std 754-2019"];

/** IEEE 754's kind of domain, its union of kinds added to the framework's as the branch `ieee754`; its domains'
 * schemas; and its dialect's schema, whose singleton is `Expressions.IEEE754.Expressions`. Run after
 * `Framework.install`, in a transaction of its own; run again, it writes nothing. Its domains `define` writes after
 * it. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.IEEE754.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, // the framework's kind union of dialects, and its own
      Kinds: S.OfUnion, DomainKind: S.OfUnion, OfIeee754: S.OfObject, // Kinds: the framework's
      binary64: S.OfAny, binary32: S.OfAny,
    })
    .spec([
      // --- Its dialect: the singleton `Expressions.IEEE754.Expressions`, a branch of the framework's kind union ---
      (_: any) => _.Dialect.name("Expressions.IEEE754.Expressions.Dialect").ref(true).singleton(
        "Expressions.IEEE754.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("ieee754").schema([_.Dialect])]),

      // --- Its kind of domain: the standard's parameters, then what follows from them ---
      (_: any) => _.OfIeee754.name("Expressions.IEEE754.Expressions.OfIeee754").properties({
        format: S.OfStr, rounding: S.OfStr,
        width: S.OfInt, radix: S.OfInt, precision: S.OfInt, emax: S.OfInt, ordered: S.OfBool }), // inferred
      (_: any) => _.DomainKind.name("Expressions.IEEE754.Expressions.DomainKind").branches([
        (t: any) => t.name("ieee754").schema([_.OfIeee754])]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("ieee754").schema([_.DomainKind])]),

      // --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.binary64.name("Expressions.IEEE754.Expressions.binary64").schemas([S.OfFloat]),
      (_: any) => _.binary32.name("Expressions.IEEE754.Expressions.binary32").schemas([S.OfFloat]),
    ])]))]);
}

/** IEEE 754's dialect as data: the singleton `Expressions.IEEE754.Expressions` owning its domains by name
 * (`domains`, through `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and
 * related to its schema (`Expressions.IEEE754.Expressions.binary32`) by `Expressions.Framework.HasDomain`. Run after
 * `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the dialect (`dialect`) and
 * each domain by its name: `store.transaction(IEEE754.define)[0].get("binary32")`. */
export function define(txn: any): any {
  const [IEEE754, Domain] = [txn.Expressions.IEEE754.Expressions, txn.Expressions.Framework.Domain];
  return txn.uid("mbse.Expressions.IEEE754.Expressions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: IEEE754.Dialect, binary64: Domain, binary32: Domain })
    .spec([
      (_: any) => _.dialect.domains({
        binary64: (e: any) => e.domain(_.binary64), binary32: (e: any) => e.domain(_.binary32),
      }),
      (_: any) => _.binary64.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n).radix(2n).precision(53n).emax(1023n).ordered(
          true)))))).schema([IEEE754.binary64]),
      (_: any) => _.binary32.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary32").rounding("roundTiesToEven").width(32n).radix(2n).precision(24n).emax(127n).ordered(
          true)))))).schema([IEEE754.binary32]),
    ])]))]);
}
