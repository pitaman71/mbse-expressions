/**
 * The conformance corpus: the same cases, built statement for statement in every implementation.
 *
 * `build()` returns the cases, name -> [root schema, root, store]: each case but `domains` a term value of
 * `Expressions.Framework.Term`, built in one store holding the framework's install and every dialect's, written
 * nested. `DIALECTS` names the dialect that reads each case other than Basic's. The `domains` case is data: Basic's
 * dialect, the singleton `Expressions.Basic` (`Expressions.Basic.Dialect`), naming its operations and owning its domains
 * by name, a packed one among them, written as one document. Each implementation writes its
 * snapshots to `conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other
 * implementation's files (see the CONF test suite). Keep record module and `python3/mbse/Expressions/Conformance/Corpus.py`
 * in lockstep: same cases, same values, same order of statements.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Builders } from "@mbse/schemas/Framework";

import * as Expressions from "../Dialects/Basic/Expressions.js";
import * as Basic from "../Dialects/Basic/index.js";
import * as Ccpp from "../Dialects/Ccpp/index.js";
import * as Excel from "../Dialects/Excel/index.js";
import * as Latex from "../Dialects/Latex/index.js";
import * as Matlab from "../Dialects/Matlab/index.js";
import * as Python from "../Dialects/Python/index.js";
import * as SystemVerilog from "../Dialects/SystemVerilog/index.js";
import * as Framework from "../Framework/index.js";
import type * as Terms from "../Framework/Terms.js";

const [C, X, L, M, P] = [Ccpp.Expressions, Excel.Expressions, Latex.Expressions, Matlab.Expressions, Python.Expressions];
const SV = SystemVerilog.Expressions;

export const CASES = ["expression", "python", "matlab", "excel", "latex", "domains", "collections", "ccpp", "systemverilog"] as const;

/** The dialect that reads each case, where it is not Basic. */
export const DIALECTS: ReadonlyMap<string, Terms.Dialect> = new Map([
  ["python", P.DIALECT], ["matlab", M.DIALECT], ["excel", X.DIALECT], ["latex", L.DIALECT], ["ccpp", C.DIALECT],
  ["systemverilog", SV.DIALECT],
]);

/** A case: its root schema, its root term, and the store it is built in. */
export type Case = [any, any, any];

export function build(): Map<string, Case> {
  const E = Expressions;
  const store: any = new Builders.Store();
  store.transaction(Framework.install);
  store.transaction(Basic.install);
  store.transaction(Python.install);
  store.transaction(Matlab.install);
  store.transaction(Excel.install);
  store.transaction(Latex.install);
  store.transaction(Ccpp.install);
  store.transaction(SystemVerilog.install);
  const defined = store.transaction(Basic.define)[0]; // Basic's dialect, its operations and its domains

  // --- domains: Basic's dialect, its operations by name and its domains, owned by name; an enum and a domain packing it
  // into uint8 added ---
  store.transaction(() => {
    const state = store.Expressions.Framework.Domain((d: any) => d.kind((k: any) => k.as_value((a: any) => a.as_union(
      (u: any) => u.enum((e: any) => e.members(["IDLE", "RUN"]))))));
    const mode = store.Expressions.Framework.Domain((d: any) => d.kind((k: any) => k.as_value((a: any) => a.as_union(
      (u: any) => u.packed((e: any) => e.codes([0n, 1n]))))).packs((a: any) => a.insert(
      (e: any) => e.domain(state).representation(defined.get("uint8")))));
    store.Expressions.Basic.Dialect(defined.get("dialect"), (b: any) => b.domains({
      state: (e: any) => e.domain(state), mode: (e: any) => e.domain(mode) }));
  });

  // --- expression: every kind and literal type, a let and its variable, a list ---
  const [self, age] = [E.variable("record"), E.variable("age")];
  const expression = E.let_("age", self.age, age.ge(18n).and_(
    age.lt(65.5).or_(self.has("email").not_()).implies(E.literal(new Uint8Array([0x00, 0xff])).in_(E.list_("x", true)))));

  // --- python: every kind, a let and its names --- import numpy as np / from math import floor /
  // (lambda a: floor(a.x * 2.5) if not a['k'] >= 18 or np.pi else (p[b'\x00'] for p in a.y if p))(record)
  const [a, item] = [P.name("a"), P.name("p")];
  const python = P.import_("numpy", P.importfrom("math", "floor", P.let_("a", P.name("record"), P.ifexp(
    P.boolop("or", P.unaryop("not", P.compare(">=", P.subscript(a, "k"), 18n)), P.attribute(P.name("np"), "pi")),
    P.call("floor", P.binop("*", P.attribute(a, "x"), 2.5)),
    P.generator("p", P.attribute(a, "y"), P.index(item, new Uint8Array([0x00])), item)))), "np");

  // --- matlab: every kind, shared identifiers --- import geo.* / (dist(record.age, 3) + ~isfield(record, "email") .* -1.5
  // >= arrayfun(@(k) k, record.ports)(2)) || true
  const recordM = M.identifier("record");
  const matlab = M.import_("geo.*", M.binary("||", M.binary(">=", M.binary(
    "+", M.call("dist", M.field(recordM, "age"), 3n),
    M.binary(".*", M.unary("~", M.call("isfield", recordM, "email")), M.unary("-", 1.5))), M.index(M.arrayfun(
      "k", M.field(recordM, "ports"), M.identifier("k")), 2n)), true));

  // --- excel: every kind, shared names --- =LET(a, record.age, IF(AND(a >= 18, NOT(ISERROR(record.email))),
  // a * SUM(MAP(record.ports, LAMBDA(q, q))) - Sheet1!B2, -[Book.xlsx]Rates!C3 + "x"))
  const [recordX, aX] = [X.name("record"), X.name("a")];
  const excel = X.let_("a", X.field(recordX, "age"), X.function(
    "IF", X.function("AND", X.infix(">=", aX, 18n), X.function("NOT", X.function("ISERROR", X.field(recordX, "email")))),
    X.infix("-", X.infix("*", aX, X.function("SUM", X.map_("q", X.field(recordX, "ports"), X.name("q")))), X.cell("B2", "Sheet1")),
    X.infix("+", X.prefix("-", X.cell("C3", "Rates", "Book.xlsx")), "x")));

  // --- latex: every kind, shared symbols --- a \geq 18 \land (\lnot \operatorname{has}(record, email) \lor
  // \frac{a}{2} > 1.5) \quad \text{where } a = record.age
  const [recordL, aL] = [L.symbol("record"), L.symbol("a")];
  const latex = L.where("a", L.member(recordL, "age"), L.binary("\\land", L.binary("\\geq", aL, 18n), L.binary(
    "\\lor", L.unary("\\lnot", L.function("has", recordL, "email")), L.binary(">", L.frac(aL, 2n), 1.5))));

  // --- collections: a quantifier over entries, collection operations and a mapping, each once ---
  const [ports, p, pins, sizes] = ["ports", "p", "pins", "sizes"].map((name) => E.variable(name)) as Expressions.Writer[];
  const collections = E.let_("ports", self.entries("ports"), ports!.all("p", p!.get("pin").in_(pins)).and_(
    sizes!.sum().le(E.mapping(["most", ports!.count()], ["least", 0n]).item("most"))));

  // --- ccpp: every kind, typed constants and a shared identifier --- !record.a && record->b[0] > 1.5f ? (uint8_t)f(1) : 5u
  const me = C.identifier("record");
  const ccpp = C.conditional(C.binary("&&", C.unary("!", C.member(me, "a")), C.binary(
    ">", C.subscript(C.member(me, "b", "->"), 0n), C.constant(1.5, "float"))),
    C.cast("uint8_t", C.call("f", 1n)), C.constant(5n, "unsigned int"));

  // --- systemverilog: every kind, sized vectors and casts, and a shared identifier ---
  // record.a inside {1, [2:5]} -> !record[0] ? {{6{2'b10}}, record.b[7:4]} : byte'($clog2(record.unique().sum(q) with (q))) + 4'(8'shff)
  const [sv, that] = [SV, SV.identifier("record")];
  const systemverilog = sv.binary("->", sv.inside(sv.member(that, "a"), 1n, sv.span(2n, 5n)), sv.conditional(
    sv.unary("!", sv.select(that, 0n)),
    sv.concatenation(sv.replication(6n, sv.vector("10")), sv.range_(sv.member(that, "b"), 7n, 4n)),
    sv.binary("+", sv.cast("byte", sv.call("$clog2", sv.iterate(sv.method(that, "unique"), "sum", "q", sv.identifier("q")))),
      sv.cast(4n, sv.vector("11111111", true, "h")))));

  const terms = store.transaction(() => new Map<string, any>(([
    ["expression", expression], ["python", python], ["matlab", matlab], ["excel", excel], ["latex", latex],
    ["collections", collections], ["ccpp", ccpp], ["systemverilog", systemverilog]
  ] as [string, Framework.Terms.Writer][]).map(([name, writer]) => [name, store.Expressions.Framework.Term(writer)])));
  terms.set("domains", defined.get("dialect"));
  const [Term, Dialect] = [store.registered("Expressions.Framework.Term"), store.registered("Expressions.Basic.Dialect")];
  return new Map<string, Case>(CASES.map((name) => [name, [name === "domains" ? Dialect : Term, terms.get(name), store]]));
}
