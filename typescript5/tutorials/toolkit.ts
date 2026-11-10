/**
 * What the case studies share: the cold chain's schemas, a store of them, and `show`, which writes an expression as text.
 *
 * A shipment of vaccine travels with a data logger that records its temperature. `Shipment` holds what the logger
 * reported: the latest reading, every reading, the hours in transit, and the loggers it carries (`Carries`, an entry
 * per logger, with the slot it rides in). Case study 6 explains how `show` works.
 */

import { Framework } from "@mbse/expressions";
import * as Patterns from "@mbse/expressions/Patterns/Expressions";
import * as IEEE1164 from "@mbse/expressions/IEEE1164/Expressions";
import * as IEEE754 from "@mbse/expressions/IEEE754/Expressions";
import * as ISOIEC11404 from "@mbse/expressions/ISOIEC11404/Expressions";
import * as Unicode from "@mbse/expressions/Unicode/Expressions";
import * as C from "@mbse/expressions/C/Expressions";
import * as Cpp from "@mbse/expressions/Cpp/Expressions";
import * as Excel from "@mbse/expressions/Excel/Expressions";
import * as Latex from "@mbse/expressions/LaTeX/Expressions";
import * as Matlab from "@mbse/expressions/MATLAB/Expressions";
import * as Python3 from "@mbse/expressions/Python/Python3";
import * as SystemVerilog from "@mbse/expressions/SystemVerilog/Expressions";
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

/** A store of the cold chain's schemas, which also holds expressions: of the Patterns dialect, and of every dialect the
 * case studies translate into, installed after the standard dialects whose kinds of domain they use; Patterns'
 * operations named by its dialect (`Patterns.define`), which validation reads; and SystemVerilog's types, its domains
 * (`SystemVerilog.define`), which its evaluation reads. */
export function cold_chain(): any {
  const store: any = new Builders.Store();
  for (const module of [Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, Matlab, Excel, Latex, C, Cpp,
    SystemVerilog]) {
    store.transaction(module.install);
  }
  store.transaction(Patterns.define);
  store.transaction(SystemVerilog.define);
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

/** An expression of the Patterns dialect as function-call text: a literal as Python writes its value, a let, a quantifier,
 * and the container constructors as `[a, b]` and `{k: v}`. */
export function show(expression: unknown): string {
  return Terms.fold(expression, (term: any, args: string[]) => {
    const form = Terms.form(term);
    const attribute = (key: string): any => form.attributes.get(key);
    const name = attribute("name");
    if (form.kind === "literal") return repr(attribute("value"));
    if (form.kind === "variable") return name;
    if (form.kind === "let") return `let ${name} = ${args[0]} in ${args[1]}`;
    if (form.kind === "quantifier") return `${attribute("quantifier")}(${args[0]}, ${name} => ${args[1]})`;
    if (form.kind === "list") return `[${args.join(", ")}]`;
    if (form.kind === "mapping") return `{${args.filter((_, i) => i % 2 === 0).map((key, i) => `${key}: ${args[2 * i + 1]}`).join(", ")}}`;
    return `${attribute("callable")}(${args.join(", ")})`;
  });
}
