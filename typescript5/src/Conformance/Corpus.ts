/**
 * The conformance corpus: the same cases, built statement for statement in every implementation.
 *
 * `build()` returns the cases, name -> [root schema, root expression, store], the store being the case's dialect's
 * `Builders`, a store of its bound classes. Each implementation writes its snapshots to
 * `conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files
 * (see the CONF test suite). Keep this module and `python3/mbse/Expressions/Conformance/Corpus.py` in lockstep: same
 * cases, same values, same order of statements.
 */

import * as Domains from "../Dialects/Basic/Domains.js";
import * as Expressions from "../Dialects/Basic/Expressions.js";
import * as Ccpp from "../Dialects/Ccpp/Expressions.js";
import * as Excel from "../Dialects/Excel/Expressions.js";
import * as Latex from "../Dialects/Latex/Expressions.js";
import * as Matlab from "../Dialects/Matlab/Expressions.js";
import * as Python from "../Dialects/Python/Expressions.js";
import * as SystemVerilog from "../Dialects/SystemVerilog/Expressions.js";
import type { Schemas, Stores, Visitors } from "@mbse/schemas/Framework";

export const CASES = ["expression", "python", "matlab", "excel", "latex", "domains", "collections", "ccpp", "systemverilog"] as const;

type Case = [Schemas.OfObject.Data, Visitors.Visitable, Stores.Store];

export function build(): Map<string, Case> {
  const [E, P, M, X, L] = [Expressions, Python, Matlab, Excel, Latex];

  // --- expression: every kind and literal type, shared sub-expressions, each operation once ---
  const [self, age] = [E.variable("this"), E.variable("age")];
  const expression = E.let_("age", self.age, age.ge(18n).and_(
    age.lt(65.5).or_(self.has("email").not_())
      .implies(E.operation("in", "x", new Uint8Array([0x00, 0xff]), true)))).data;

  // --- python: every kind, shared names --- import numpy as np / from math import floor /
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
    M.binary(".*", M.unary("~", M.call("isfield", thisM, "email")), M.unary("-", 1.5))), M.index(M.arrayfun("k", M.field(thisM, "ports"), M.identifier("k")), 2n)), true));

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

  // --- domains: literals of value domains, by value and by name, a packed enum among them; defaults left out;
  // decimal and binary128 text; a conversion's domain, a bitwise operation and pack ---
  const D = Domains;
  const uint8 = new D.OfInteger.Builder().width(8n).signed(false).overflow("wrap").create();
  if (D.name_of(uint8) === null) D.register("uint8", uint8);
  const state = new D.OfPacked.Builder().domain(new D.OfEnum.Builder().members("IDLE", "RUN").create()).representation(
    new D.OfBits.Builder().width(2n).create()).codes(0n, 1n).create();
  const binary32 = new D.OfIeee754.Builder().format("binary32").rounding("roundTowardZero").create();
  const decimal64 = new D.OfIeee754.Builder().format("decimal64").create();
  const bits2 = new D.OfBits.Builder().width(2n).create();
  const [mode, count, gain, line, mask, size, price, ratio] = ["mode", "count", "gain", "line", "mask", "size", "price", "ratio"]
    .map((name) => E.variable(name));
  const domains = E.operation(
    "all", mode!.eq(E.literal("RUN", state)), count!.le(E.literal(200n, uint8)), gain!.ne(E.literal(1.5, binary32)),
    line!.ge(E.literal("Z", new D.OfIeee1164.Builder().create())), mask!.gt(E.literal(new Uint8Array([3]), bits2)),
    size!.lt(E.literal(5n, D.Int)), price!.convert(decimal64).sub(E.literal("1.50", decimal64)),
    ratio!.mul(E.literal("0.1", new D.OfIeee754.Builder().format("binary128").create())),
    mask!.bitand(E.literal(new Uint8Array([1]), bits2)), mode!.pack()).data; // each operation once, for CONF-04

  // --- collections: a quantifier over entries, and collection operations, each once ---
  const [ports, p, pins, sizes] = ["ports", "p", "pins", "sizes"].map((name) => E.variable(name)) as [any, any, any, any];
  const collections = E.let_("ports", self.entries("ports"), ports.all("p", p.get("pin").in_(pins)).and_(
    sizes.sum().le(ports.count()))).data;

  // --- ccpp: every kind, typed constants and a shared identifier --- !this.a && this->b[0] > 1.5f ? (uint8_t)f(1) : 5u
  const me = Ccpp.identifier("this");
  const ccpp = Ccpp.conditional(Ccpp.binary("&&", Ccpp.unary("!", Ccpp.member(me, "a")), Ccpp.binary(
    ">", Ccpp.subscript(Ccpp.member(me, "b", "->"), 0n), Ccpp.constant(1.5, "float"))),
    Ccpp.cast("uint8_t", Ccpp.call("f", 1n)), Ccpp.constant(5n, "unsigned int"));

  // --- systemverilog: every kind, sized vectors and casts, and a shared identifier ---
  // this.a inside {1, [2:5]} -> !this[0] ? {{6{2'b10}}, this.b[7:4]} : byte'($clog2(this.unique().sum(q) with (q))) + 4'(8'shff)
  const [sv, that] = [SystemVerilog, SystemVerilog.identifier("this")];
  const systemverilog = sv.binary("->", sv.inside(sv.member(that, "a"), 1n, sv.span(2n, 5n)), sv.conditional(
    sv.unary("!", sv.select(that, 0n)),
    sv.concatenation(sv.replication(6n, sv.vector("10")), sv.range_(sv.member(that, "b"), 7n, 4n)),
    sv.binary("+", sv.cast("byte", sv.call("$clog2", sv.iterate(sv.method(that, "unique"), "sum", "q", sv.identifier("q")))),
      sv.cast(4n, sv.vector("11111111", true, "h")))));

  return new Map<string, Case>([
    ["expression", [E.OfLet.Schema, expression, E.Builders]],
    ["python", [P.DIALECT.schema_of(python), python, P.Builders]],
    ["matlab", [M.DIALECT.schema_of(matlab), matlab, M.Builders]],
    ["excel", [X.DIALECT.schema_of(excel), excel, X.Builders]],
    ["domains", [E.OfOperation.Schema, domains, E.Builders]],
    ["collections", [E.OfLet.Schema, collections, E.Builders]],
    ["ccpp", [Ccpp.DIALECT.schema_of(ccpp), ccpp, Ccpp.Builders]],
    ["systemverilog", [SystemVerilog.DIALECT.schema_of(systemverilog), systemverilog, SystemVerilog.Builders]],
    ["latex", [L.DIALECT.schema_of(latex), latex, L.Builders]],
  ]);
}
