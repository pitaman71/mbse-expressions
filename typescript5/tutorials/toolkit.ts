/**
 * What the case studies share: the cold chain's schemas, a store of them, and `show`, which writes an expression as text.
 *
 * A shipment of vaccine travels with a data logger that records its temperature. `Shipment` holds what the logger
 * reported: the latest reading, every reading, the hours in transit, and the loggers it carries (`Carries`, an entry
 * per logger, with the slot it rides in). Case study 6 explains how `show` works.
 */

import { Expressions, register } from "@mbse/expressions";
import { Terms } from "@mbse/expressions/Framework";
import { Proxies, Schemas } from "@mbse/schemas/Framework";

const native = (name: string, type: Schemas.OfNative.Spec) => (p: any) => p.name(name).of((t: any) => t.as_native(type));
const listed = (name: string, type: Schemas.OfNative.Spec) =>
  (p: any) => p.name(name).of((t: any) => t.as_indexed((i: any) => i.of((n: any) => n.as_native(type))));

export const Carries = new Schemas.OfRelation.Builder().name("Carries").links("shipment", "logger")
  .properties(native("slot", BigInt)).create();
export const Logger = new Schemas.OfObject.Builder().name("Logger").ref()
  .properties(native("serial", String), native("battery", BigInt))
  .relations((r: any) => r.name("shipments").of(Carries).me("logger")).create();
export const Shipment = new Schemas.OfObject.Builder().name("Shipment").ref()
  .properties(native("id", String), native("product", String), native("celsius", Number),
    listed("readings", Number), native("hours", BigInt))
  .relations((r: any) => r.name("loggers").of(Carries).me("shipment")).create();

/** A store of the cold chain's schemas, which can also hold expressions. */
export function cold_chain(): any {
  const store = register(new Proxies.OfStore());
  for (const schema of [Logger, Carries, Shipment]) store.register(schema);
  return store;
}

/** A native value as Python writes it, so that both languages show the same text: a float with its point. */
function repr(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  if (typeof value === "number") return Number.isInteger(value) ? value.toFixed(1) : String(value);
  return String(value);
}

/** An expression of the Basic dialect as function-call text: a literal as Python writes its value, `int16(3)` when it
 * has a domain, and a conversion with its result's domain, `convert[int16](x)`. */
export function show(expression: Expressions.OfAny.Spec): string {
  return Terms.fold(Expressions.OfAny.resolve(expression) as any, (term: any, args: string[]) => {
    const form = term.form();
    const attribute = (key: string): any => form.attributes.get(key);
    const name = attribute("name");
    if (form.kind === "literal") {
      const domain = attribute("domain");
      return domain ? `${domain.name()}(${repr(attribute("value"))})` : repr(attribute("value"));
    }
    if (form.kind === "variable") return name;
    if (form.kind === "let") return `let ${name} = ${args[0]} in ${args[1]}`;
    if (form.kind === "quantifier") return `${attribute("quantifier")}(${args[0]}, ${name} => ${args[1]})`;
    const domain = attribute("domain"); // the result's, for a conversion
    return `${name}${domain ? `[${domain.name()}]` : ""}(${args.join(", ")})`;
  });
}
