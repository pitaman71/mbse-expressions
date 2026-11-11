/**
 * What the tutorials share: `dialects()`, the store Part I starts from; the cold chain's schemas and `cold_chain()`, a
 * store of them, which Part II starts from; and `show`, which writes an expression as text.
 *
 * A shipment of vaccine travels with a data logger that records its temperature. `Shipment` holds what the logger
 * reported: the latest reading, every reading, the hours in transit, and the loggers it carries (`Carries`, an entry
 * per logger, with the slot it rides in). Case study 13 explains how `show` works.
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
import * as TypeScript5 from "@mbse/expressions/TypeScript/TypeScript5";
import * as CPreprocessor from "@mbse/expressions/C/Preprocessor";
import * as CTypes from "@mbse/expressions/C/Types";
import * as CppTypes from "@mbse/expressions/Cpp/Types";
import * as PythonPatterns from "@mbse/expressions/Python/Patterns";
import * as PythonTypes from "@mbse/expressions/Python/Types";
import * as TypeScriptPatterns from "@mbse/expressions/TypeScript/Patterns";
import * as TypeScriptTypes from "@mbse/expressions/TypeScript/Types";
import * as AAPCS64 from "@mbse/expressions/Arm/AAPCS64";
import * as AMD64 from "@mbse/expressions/SystemV/AMD64";
import * as SystemVerilog from "@mbse/expressions/SystemVerilog/Expressions";
import * as SVAssertions from "@mbse/expressions/SystemVerilog/Assertions";
import * as SVConstraints from "@mbse/expressions/SystemVerilog/Constraints";
import * as SVPatterns from "@mbse/expressions/SystemVerilog/Patterns";
import * as SVPreprocessor from "@mbse/expressions/SystemVerilog/Preprocessor";
import * as SVTypes from "@mbse/expressions/SystemVerilog/Types";
import { Terms } from "@mbse/expressions/Framework";
import { Builders } from "@mbse/schemas/Framework";

/** A store that holds expressions of every dialect, and no schemas of its own: the framework's install, then the
 * standard dialects' (ISO/IEC 11404, IEEE 754, IEEE 1164, Unicode), whose kinds of domain the others use, then every
 * language's dialect, TypeScript5's among them, the two ABI dialects (`SystemV/AMD64`, `Arm/AAPCS64`) and
 * SystemVerilog's six, then the sublanguages' dialects of Python, TypeScript, C and C++ (`Python Types`, `Python
 * Patterns`, `TypeScript Types`, `TypeScript Patterns`, `C Types`, `Cpp Types`, `C Preprocessor`), each after its
 * family's, each in a transaction of its own; then each one's `define`, the standard dialects' first, each in a
 * transaction of its own, writing its singleton, its operations, its domains and the editions it covers. LaTeX
 * defines nothing. Part I starts from it; tutorial 1 builds such a store by hand. */
export function dialects(): any {
  const store: any = new Builders.Store();
  for (const module of [Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, TypeScript5, Matlab, Excel,
    Latex, C, Cpp, AMD64, AAPCS64, SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor,
    PythonTypes, PythonPatterns, TypeScriptTypes, TypeScriptPatterns, CTypes, CppTypes, CPreprocessor] as any[]) {
    store.transaction(module.install);
  }
  for (const module of [ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, TypeScript5, Matlab, Excel, C, Cpp,
    AMD64, AAPCS64, SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor, PythonTypes,
    PythonPatterns, TypeScriptTypes, TypeScriptPatterns, CTypes, CppTypes, CPreprocessor] as any[]) {
    store.transaction(module.define);
  }
  return store;
}

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
 * case studies translate into, installed after the standard dialects whose kinds of domain they use, with the two ABI
 * dialects C's and C++'s terms are read under (x86-64's System V ABI, `SystemV/AMD64`, and Arm's AAPCS64,
 * `Arm/AAPCS64`); Patterns' operations named by its dialect (`Patterns.define`), which validation reads; and C's,
 * C++'s, the ABIs' and SystemVerilog's types, their domains (each dialect's `define`), which their evaluation reads,
 * with SystemVerilog's sublanguages' dialects (`Types`, `Patterns`, `Assertions`, `Constraints`, `Preprocessor`), whose
 * terms its terms hold, and the editions each covers; and Python's, C's and C++'s new dialects (`Python Types`, `Python
 * Patterns`, `C Types`, `Cpp Types`, `C Preprocessor`), each after its family's. */
export function cold_chain(): any {
  const store: any = new Builders.Store();
  for (const module of [Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, Matlab, Excel, Latex, C, Cpp,
    AMD64, AAPCS64, SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor, PythonTypes,
    PythonPatterns, CTypes, CppTypes, CPreprocessor] as any[]) {
    store.transaction(module.install);
  }
  for (const module of [Patterns, C, Cpp, AMD64, AAPCS64, SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints,
    SVPreprocessor, CTypes, CppTypes, CPreprocessor] as any[]) {
    store.transaction(module.define);
  }
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
