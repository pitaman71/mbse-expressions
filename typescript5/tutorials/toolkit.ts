/**
 * What the case studies share: the cold chain's schemas, a store of them, and `show`, which writes an expression as text.
 *
 * A shipment of vaccine travels with a data logger that records its temperature. `Shipment` holds what the logger
 * reported: the latest reading, every reading, the hours in transit, and the loggers it carries (`Carries`, an entry
 * per logger, with the slot it rides in). Case study 6 explains how `show` works.
 */

import { Framework } from "@mbse/expressions";
import * as Basic from "@mbse/expressions/Dialects/Basic";
import * as Ccpp from "@mbse/expressions/Dialects/Ccpp";
import * as Excel from "@mbse/expressions/Dialects/Excel";
import * as Latex from "@mbse/expressions/Dialects/Latex";
import * as Matlab from "@mbse/expressions/Dialects/Matlab";
import * as Python from "@mbse/expressions/Dialects/Python";
import * as SystemVerilog from "@mbse/expressions/Dialects/SystemVerilog";
import { Terms } from "@mbse/expressions/Framework";
import { Builders } from "@mbse/schemas/Framework";

/** The cold chain's schemas: `Shipment`, `Logger`, and `Carries`, which relates a shipment to its loggers. */
export function install(txn: any): any {
  const S = txn.Schemas;
  return txn.uid("tutorials.cold_chain/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({ Shipment: S.OfObject, Logger: S.OfObject, Carries: S.OfRelation })
    .spec([
      (_: any) => _.Carries.name("Carries").links([(t: any) => t.name("shipment"), (t: any) => t.name("logger")])
        .properties({ slot: S.OfInt }),
      (_: any) => _.Logger.name("Logger").ref(true).properties({ serial: S.OfStr, battery: S.OfInt })
        .adjacencies({ shipments: (t: any) => t.relation([_.Carries]).me("logger") }),
      (_: any) => _.Shipment.name("Shipment").ref(true).properties({
        id: S.OfStr, product: S.OfStr, celsius: S.OfFloat,
        readings: S.OfContainer((c: any) => c.index([S.OfInt]).element([S.OfFloat])), hours: S.OfInt,
      }).adjacencies({ loggers: (t: any) => t.relation([_.Carries]).me("shipment") }),
    ])]))]);
}

/** A store of the cold chain's schemas, which also holds expressions: of the Basic dialect, and of every dialect the
 * case studies translate into. */
export function cold_chain(): any {
  const store: any = new Builders.Store();
  for (const module of [Framework, Basic, Python, Matlab, Excel, Latex, Ccpp, SystemVerilog]) store.transaction(module.install);
  store.transaction(install);
  return store;
}

/** A native value as Python writes it, so that both languages show the same text: a float with its point. */
function repr(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  if (typeof value === "number") return Number.isInteger(value) ? value.toFixed(1) : String(value);
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

/** An expression of the Basic dialect as function-call text: a literal as Python writes its value, `int16(3)` when it
 * has a domain, and a conversion with its result's domain, `convert[int16](x)`. */
export function show(expression: unknown): string {
  return Terms.fold(expression, (term: any, args: string[]) => {
    const form = Terms.form(term);
    const attribute = (key: string): any => form.attributes.get(key);
    const name = attribute("name");
    const domain = attribute("domain"); // a name: a literal's, or a conversion's result's
    if (form.kind === "literal") return domain ? `${domain}(${repr(attribute("value"))})` : repr(attribute("value"));
    if (form.kind === "variable") return name;
    if (form.kind === "let") return `let ${name} = ${args[0]} in ${args[1]}`;
    if (form.kind === "quantifier") return `${attribute("quantifier")}(${args[0]}, ${name} => ${args[1]})`;
    return `${attribute("callable")}${domain ? `[${domain}]` : ""}(${args.join(", ")})`;
  });
}
