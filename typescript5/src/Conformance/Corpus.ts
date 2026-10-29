/**
 * The conformance corpus: the same cases, built statement for statement in every implementation.
 *
 * `build()` returns the cases, name -> [root schema, root term, store]: each case a term value of
 * `Expressions.Framework.Term`, built in one store holding the framework's install and every dialect's, written
 * nested. `DIALECTS` names the dialect that reads each case other than Basic's. Each implementation writes its
 * snapshots to `conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other
 * implementation's files (see the CONF test suite). Keep this module and `python3/mbse/Expressions/Conformance/Corpus.py`
 * in lockstep: same cases, same values, same order of statements.
 *
 * The SystemVerilog case returns with its dialect's port, stage 2b (docs/proposals/port): `stage2b` keeps it as it was
 * written for the old API.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Builders } from "@mbse/schemas/Framework";

import * as Domains from "../Dialects/Basic/Domains.js";
import * as Expressions from "../Dialects/Basic/Expressions.js";
import * as Basic from "../Dialects/Basic/index.js";
import * as Ccpp from "../Dialects/Ccpp/index.js";
import * as Excel from "../Dialects/Excel/index.js";
import * as Latex from "../Dialects/Latex/index.js";
import * as Matlab from "../Dialects/Matlab/index.js";
import * as Python from "../Dialects/Python/index.js";
import * as Framework from "../Framework/index.js";
import type * as Terms from "../Framework/Terms.js";

const [C, X, L, M, P] = [Ccpp.Expressions, Excel.Expressions, Latex.Expressions, Matlab.Expressions, Python.Expressions];

export const CASES = ["expression", "python", "matlab", "excel", "latex", "domains", "collections", "ccpp"] as const;

/** The dialect that reads each case, where it is not Basic. */
export const DIALECTS: ReadonlyMap<string, Terms.Dialect> = new Map([
  ["python", P.DIALECT], ["matlab", M.DIALECT], ["excel", X.DIALECT], ["latex", L.DIALECT], ["ccpp", C.DIALECT],
]);

/** A case: its root schema, its root term, and the store it is built in. */
export type Case = [any, any, any];

/** `domain`, registered under `name` unless it is already: a term names its domain. */
function named<T extends Domains.Domain>(name: string, domain: T): T {
  if (Domains.name_of(domain) === null) Domains.register(name, domain);
  return domain;
}

export function build(): Map<string, Case> {
  const [E, D] = [Expressions, Domains];
  const store: any = new Builders.Store();
  store.transaction(Framework.install);
  store.transaction(Basic.install);
  store.transaction(Python.install);
  store.transaction(Matlab.install);
  store.transaction(Excel.install);
  store.transaction(Latex.install);
  store.transaction(Ccpp.install);

  // --- expression: every kind and literal type, a let and its variable, an extension operation ---
  const [self, age] = [E.variable("this"), E.variable("age")];
  const expression = E.let_("age", self.age, age.ge(18n).and_(
    age.lt(65.5).or_(self.has("email").not_()).implies(E.operation("contains", "x", new Uint8Array([0x00, 0xff]), true))));

  // --- python: every kind, a let and its names --- import numpy as np / from math import floor /
  // (lambda a: floor(a.x * 2.5) if not a['k'] >= 18 or np.pi else (p[b'\x00'] for p in a.y if p))(this)
  const [a, item] = [P.name("a"), P.name("p")];
  const python = P.import_("numpy", P.importfrom("math", "floor", P.let_("a", P.name("this"), P.ifexp(
    P.boolop("or", P.unaryop("not", P.compare(">=", P.subscript(a, "k"), 18n)), P.attribute(P.name("np"), "pi")),
    P.call("floor", P.binop("*", P.attribute(a, "x"), 2.5)),
    P.generator("p", P.attribute(a, "y"), P.index(item, new Uint8Array([0x00])), item)))), "np");

  // --- matlab: every kind, shared identifiers --- import geo.* / (dist(this.age, 3) + ~isfield(this, "email") .* -1.5
  // >= arrayfun(@(k) k, this.ports)(2)) || true
  const thisM = M.identifier("this");
  const matlab = M.import_("geo.*", M.binary("||", M.binary(">=", M.binary(
    "+", M.call("dist", M.field(thisM, "age"), 3n),
    M.binary(".*", M.unary("~", M.call("isfield", thisM, "email")), M.unary("-", 1.5))), M.index(M.arrayfun(
      "k", M.field(thisM, "ports"), M.identifier("k")), 2n)), true));

  // --- excel: every kind, shared names --- =LET(a, this.age, IF(AND(a >= 18, NOT(ISERROR(this.email))),
  // a * SUM(MAP(this.ports, LAMBDA(q, q))) - Sheet1!B2, -[Book.xlsx]Rates!C3 + "x"))
  const [thisX, aX] = [X.name("this"), X.name("a")];
  const excel = X.let_("a", X.field(thisX, "age"), X.function(
    "IF", X.function("AND", X.infix(">=", aX, 18n), X.function("NOT", X.function("ISERROR", X.field(thisX, "email")))),
    X.infix("-", X.infix("*", aX, X.function("SUM", X.map_("q", X.field(thisX, "ports"), X.name("q")))), X.cell("B2", "Sheet1")),
    X.infix("+", X.prefix("-", X.cell("C3", "Rates", "Book.xlsx")), "x")));

  // --- latex: every kind, shared symbols --- a \geq 18 \land (\lnot \operatorname{has}(this, email) \lor
  // \frac{a}{2} > 1.5) \quad \text{where } a = this.age
  const [thisL, aL] = [L.symbol("this"), L.symbol("a")];
  const latex = L.where("a", L.member(thisL, "age"), L.binary("\\land", L.binary("\\geq", aL, 18n), L.binary(
    "\\lor", L.unary("\\lnot", L.function("has", thisL, "email")), L.binary(">", L.frac(aL, 2n), 1.5))));

  // --- domains: literals of value domains, by name, a packed enum among them; defaults left out; decimal and
  // binary128 text; a conversion's domain, a bitwise operation and pack ---
  const uint8 = named("uint8", new D.OfInteger.Builder().width(8n).signed(false).overflow("wrap").create());
  const state = named("state", new D.OfPacked.Builder().domain(new D.OfEnum.Builder().members("IDLE", "RUN").create()).representation(
    new D.OfBits.Builder().width(2n).create()).codes(0n, 1n).create());
  const binary32 = named("binary32 roundTowardZero", new D.OfIeee754.Builder().format("binary32").rounding("roundTowardZero").create());
  const decimal64 = named("decimal64", new D.OfIeee754.Builder().format("decimal64").create());
  const bits2 = named("bits2", new D.OfBits.Builder().width(2n).create());
  const logic = named("std_logic", new D.OfIeee1164.Builder().create());
  const binary128 = named("binary128", new D.OfIeee754.Builder().format("binary128").create());
  const [mode, count, gain, line, mask, size, price, ratio] = ["mode", "count", "gain", "line", "mask", "size", "price", "ratio"]
    .map((name) => E.variable(name)) as Expressions.Writer[];
  const domains = E.operation(
    "all", mode!.eq(E.literal("RUN", state)), count!.le(E.literal(200n, uint8)), gain!.ne(E.literal(1.5, binary32)),
    line!.ge(E.literal("Z", logic)), mask!.gt(E.literal(new Uint8Array([3]), bits2)), size!.lt(E.literal(5n, D.Int)),
    price!.convert(decimal64).sub(E.literal("1.50", decimal64)), ratio!.mul(E.literal("0.1", binary128)),
    mask!.bitand(E.literal(new Uint8Array([1]), bits2)), mode!.pack()); // each operation once

  // --- collections: a quantifier over entries, and collection operations, each once ---
  const [ports, p, pins, sizes] = ["ports", "p", "pins", "sizes"].map((name) => E.variable(name)) as Expressions.Writer[];
  const collections = E.let_("ports", self.entries("ports"), ports!.all("p", p!.get("pin").in_(pins)).and_(
    sizes!.sum().le(ports!.count())));

  // --- ccpp: every kind, typed constants and a shared identifier --- !this.a && this->b[0] > 1.5f ? (uint8_t)f(1) : 5u
  const me = C.identifier("this");
  const ccpp = C.conditional(C.binary("&&", C.unary("!", C.member(me, "a")), C.binary(
    ">", C.subscript(C.member(me, "b", "->"), 0n), C.constant(1.5, "float"))),
    C.cast("uint8_t", C.call("f", 1n)), C.constant(5n, "unsigned int"));

  const terms = store.transaction(() => new Map<string, any>(([
    ["expression", expression], ["python", python], ["matlab", matlab], ["excel", excel], ["latex", latex],
    ["domains", domains], ["collections", collections], ["ccpp", ccpp]
  ] as [string, Framework.Terms.Writer][]).map(([name, writer]) => [name, store.Expressions.Framework.Term(writer)])));
  const Term = store.registered("Expressions.Framework.Term");
  return new Map<string, Case>(CASES.map((name) => [name, [Term, terms.get(name), store]]));
}

/** The old API's case, to port with its dialect (stage 2b); not called. */
export async function stage2b(): Promise<Map<string, Case>> {
  const SystemVerilog: any = await import("../Dialects/SystemVerilog/Expressions.js");

  // --- systemverilog: every kind, sized vectors and casts, and a shared identifier ---
  // this.a inside {1, [2:5]} -> !this[0] ? {{6{2'b10}}, this.b[7:4]} : byte'($clog2(this.unique().sum(q) with (q))) + 4'(8'shff)
  const [sv, that] = [SystemVerilog, SystemVerilog.identifier("this")];
  const systemverilog = sv.binary("->", sv.inside(sv.member(that, "a"), 1n, sv.span(2n, 5n)), sv.conditional(
    sv.unary("!", sv.select(that, 0n)),
    sv.concatenation(sv.replication(6n, sv.vector("10")), sv.range_(sv.member(that, "b"), 7n, 4n)),
    sv.binary("+", sv.cast("byte", sv.call("$clog2", sv.iterate(sv.method(that, "unique"), "sum", "q", sv.identifier("q")))),
      sv.cast(4n, sv.vector("11111111", true, "h")))));

  return new Map<string, Case>([
    ["systemverilog", [SystemVerilog.DIALECT.schema_of(systemverilog), systemverilog, SystemVerilog.Builders]],
  ]);
}
