/**
 * The IEEE 1164 dialect: the kind of domain of IEEE Std 1164-1993, VHDL's nine-valued logic, and the domain it
 * defines. It has no terms. See mbse-basis
 * [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).
 *
 * Its kind of domain, the branch of its union `Expressions.IEEE1164.Expressions.DomainKind`, which `install` adds to the
 * framework's `Expressions.Framework.DomainKind` as the branch `ieee1164`:
 *
 * - `ieee1164` (`OfIeee1164`): one state a value (`std_logic`), or, of a `width`, that many states, the most significant
 *   first (`std_logic_vector`); inferred (populated by hand until constraint resolution computes it) `ordered`.
 *
 * Its dialect is the singleton `Expressions.IEEE1164.Expressions`, of its schema
 * `Expressions.IEEE1164.Expressions.Dialect`, the branch `ieee1164` of `Expressions.Framework.Dialect`. `define` writes
 * its domain `std_logic`, owned by name and related to its schema, an `OfAny` of strings.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** IEEE 1164's kind of domain, its union of kinds added to the framework's as the branch `ieee1164`; its domain's
 * schema; and its dialect's schema, whose singleton is `Expressions.IEEE1164.Expressions`. Run after
 * `Framework.install`, in a transaction of its own; run again, it writes nothing. Its domain `define` writes after
 * it. */
export function install(txn: any): any {
  const S = txn.Schemas;
  const Framework = txn.Expressions.Framework;
  return txn.uid("mbse.Expressions.IEEE1164.Expressions/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, // the framework's kind union of dialects, and its own
      Kinds: S.OfUnion, DomainKind: S.OfUnion, OfIeee1164: S.OfObject, // Kinds: the framework's
      std_logic: S.OfAny,
    })
    .spec([
      // --- Its dialect: the singleton `Expressions.IEEE1164.Expressions`, a branch of the framework's kind union ---
      (_: any) => _.Dialect.name("Expressions.IEEE1164.Expressions.Dialect").ref(true).singleton(
        "Expressions.IEEE1164.Expressions").adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect") }),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("ieee1164").schema([_.Dialect])]),

      // --- Its kind of domain: the standard's parameters, then what follows from them ---
      (_: any) => _.OfIeee1164.name("Expressions.IEEE1164.Expressions.OfIeee1164").properties({
        width: S.OfInt, ordered: S.OfBool }), // ordered: inferred
      (_: any) => _.DomainKind.name("Expressions.IEEE1164.Expressions.DomainKind").branches([
        (t: any) => t.name("ieee1164").schema([_.OfIeee1164])]),
      (_: any) => _.Kinds.name("Expressions.Framework.DomainKind").branches([ // a branch added: schema extension
        (t: any) => t.name("ieee1164").schema([_.DomainKind])]),

      // --- Its domain's schema, an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.std_logic.name("Expressions.IEEE1164.Expressions.std_logic").schemas([S.OfStr]),
    ])]))]);
}

/** IEEE 1164's dialect as data: the singleton `Expressions.IEEE1164.Expressions` owning its domain by name (`domains`,
 * through `Expressions.Framework.Defines`), with its inferred properties, and related to its schema
 * (`Expressions.IEEE1164.Expressions.std_logic`) by `Expressions.Framework.HasDomain`. And the edition of the standard
 * it covers, by its designation (`standards`, through `Expressions.Framework.Covers`), its formal reference's parts
 * held apart. Run after `install`, in a transaction of its own; run again, it writes nothing. Its frame binds the
 * dialect (`dialect`), its edition (`standard`) and its domain by its name:
 * `store.transaction(IEEE1164.define)[0].get("std_logic")`. */
export function define(txn: any): any {
  const [IEEE1164, Domain, Standard] = [txn.Expressions.IEEE1164.Expressions, txn.Expressions.Framework.Domain,
    txn.Expressions.Framework.Standard];
  return txn.uid("mbse.Expressions.IEEE1164.Expressions.define/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ dialect: IEEE1164.Dialect, standard: Standard, std_logic: Domain })
    .spec([
      (_: any) => _.dialect.domains({ std_logic: (e: any) => e.domain(_.std_logic) }),
      (_: any) => _.dialect.standards({ "IEEE Std 1164-1993": (e: any) => e.standard(_.standard) }),
      (_: any) => _.standard.bodies(["org.ieee"]).number("1164").revision((r: any) => r.year(1993n)),
      (_: any) => _.std_logic.kind((k: any) => k.as_value((a: any) => a.as_union((u: any) => u.ieee1164((v: any) => v.ieee1164(
        (d: any) => d.ordered(false)))))).schema([IEEE1164.std_logic]),
    ])]))]);
}
