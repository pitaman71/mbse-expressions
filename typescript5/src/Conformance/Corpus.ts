/**
 * The conformance corpus: the same cases, built statement for statement in every implementation.
 *
 * `build()` returns the cases, name -> [root schema, root, store]: each case but the data cases a term value of
 * `Expressions.Framework.Term`, its dialect then its kind, built in one store holding the framework's install and every
 * dialect's, and each dialect's `define`, written nested. `DIALECTS` names the dialect that reads each case other than
 * Patterns'. The `domains` case and the `<dialect>_domains` cases are data (`DOMAINS`): each a dialect's singleton,
 * owning its domains by name, each kind its dialect's then its own, and the editions of the standards it covers by
 * designation, written as one document; `domains` is ISO/IEC 11404's dialect, the singleton
 * `Expressions.ISOIEC11404.Expressions` (`Expressions.ISOIEC11404.Expressions.Dialect`), an enum and a packed one among
 * its domains. The `standards` case is data too (`STANDARD`): an edition, C23's, ISO/IEC 9899:2024, written as one
 * document of `Expressions.Framework.Standard`, its formal reference's parts, its common name and the kinds it has. The
 * `invalid` case is a Python3 term holding invalid syntax and literals with their spelling; the `typescript5` case a
 * TypeScript5 term of every kind, written through the builders; the `systemverilog_patterns`, `systemverilog_assertions`,
 * `systemverilog_constraints` and `systemverilog_preprocessor` cases each a term of SystemVerilog's sublanguage of every
 * kind, written through the builders, the `python_types` and `python_patterns` cases a term of Python's, the
 * `typescript_types` and `typescript_patterns` cases each a term of TypeScript's, the `c_types`, `cpp_types` and
 * `c_preprocessor` cases each a term of the C family's new dialects of every kind, and the `python_regexp`,
 * `typescript_regexp` and `cpp_regexp` cases each a regular expression of every kind of its family's RegExp dialect. Each
 * implementation writes its snapshots to
 * `conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files
 * (see the CONF test suite). Keep record module and `python3/mbse/Expressions/Conformance/Corpus.py` in lockstep: same
 * cases, same values, same order of statements.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Builders } from "@mbse/schemas/Framework";

import * as C from "../C/Expressions/index.js";
import * as Cpp from "../Cpp/Expressions/index.js";
import * as Excel from "../Excel/Expressions/index.js";
import * as Latex from "../LaTeX/Expressions/index.js";
import * as Matlab from "../MATLAB/Expressions/index.js";
import * as Expressions from "../Patterns/Expressions/Expressions.js";
import * as Patterns from "../Patterns/Expressions/index.js";
import * as IEEE1164 from "../IEEE1164/Expressions/index.js";
import * as IEEE754 from "../IEEE754/Expressions/index.js";
import * as ISOIEC11404 from "../ISOIEC11404/Expressions/index.js";
import * as Python3 from "../Python/Python3/index.js";
import * as AAPCS64 from "../Arm/AAPCS64/index.js";
import * as AMD64 from "../SystemV/AMD64/index.js";
import * as Unicode from "../Unicode/Expressions/index.js";
import * as SystemVerilog from "../SystemVerilog/Expressions/index.js";
import * as SVAssertions from "../SystemVerilog/Assertions/index.js";
import * as SVConstraints from "../SystemVerilog/Constraints/index.js";
import * as SVPatterns from "../SystemVerilog/Patterns/index.js";
import * as SVPreprocessor from "../SystemVerilog/Preprocessor/index.js";
import * as SVTypes from "../SystemVerilog/Types/index.js";
import * as TypeScript5 from "../TypeScript/TypeScript5/index.js";
import * as CPreprocessor from "../C/Preprocessor/index.js"; // the retrofit's new dialects
import * as CTypes from "../C/Types/index.js";
import * as CppRegExp from "../Cpp/RegExp/index.js";
import * as CppTypes from "../Cpp/Types/index.js";
import * as PythonPatterns from "../Python/Patterns/index.js";
import * as PythonRegExp from "../Python/RegExp/index.js";
import * as PythonTypes from "../Python/Types/index.js";
import * as TypeScriptPatterns from "../TypeScript/Patterns/index.js";
import * as TypeScriptRegExp from "../TypeScript/RegExp/index.js";
import * as TypeScriptTypes from "../TypeScript/Types/index.js";
import * as Framework from "../Framework/index.js";
import type * as Terms from "../Framework/Terms.js";

const [CE, CPP, X, L, M, P] = [C.Expressions, Cpp.Expressions, Excel.Expressions, Latex.Expressions, Matlab.Expressions,
  Python3.Expressions];
const SV = SystemVerilog.Expressions;
const TS = TypeScript5.Expressions;

export const CASES = ["expression", "python3", "matlab", "excel", "latex", "domains", "collections", "c", "cpp",
  "systemverilog", "typescript5", "invalid", "systemverilog_patterns", "systemverilog_assertions",
  "systemverilog_constraints", "systemverilog_preprocessor", "python_types", "python_patterns", "typescript_types",
  "typescript_patterns", "c_types", "cpp_types", "c_preprocessor", "python_regexp", "typescript_regexp", "cpp_regexp",
  "systemverilog_domains", "python3_domains", "typescript5_domains",
  "matlab_domains", "excel_domains", "c_domains", "cpp_domains", "amd64_domains", "aapcs64_domains",
  "standards"] as const;

/** The dialect that reads each case, where it is not Patterns. */
export const DIALECTS: ReadonlyMap<string, Terms.Dialect> = new Map([
  ["python3", P.DIALECT], ["matlab", M.DIALECT], ["excel", X.DIALECT], ["latex", L.DIALECT], ["c", CE.DIALECT],
  ["cpp", CPP.DIALECT], ["systemverilog", SV.DIALECT], ["typescript5", TS.DIALECT],
  ["invalid", P.DIALECT], ["systemverilog_patterns", SVPatterns.Expressions.DIALECT],
  ["systemverilog_assertions", SVAssertions.Expressions.DIALECT], ["systemverilog_constraints", SVConstraints.Expressions.DIALECT],
  ["systemverilog_preprocessor", SVPreprocessor.Expressions.DIALECT],
  ["python_types", PythonTypes.Expressions.DIALECT], ["python_patterns", PythonPatterns.Expressions.DIALECT],
  ["typescript_types", TypeScriptTypes.Expressions.DIALECT], ["typescript_patterns", TypeScriptPatterns.Expressions.DIALECT],
  ["c_types", CTypes.Expressions.DIALECT], ["cpp_types", CppTypes.Expressions.DIALECT], ["c_preprocessor", CPreprocessor.Expressions.DIALECT],
  ["python_regexp", PythonRegExp.Expressions.DIALECT], ["typescript_regexp", TypeScriptRegExp.Expressions.DIALECT],
  ["cpp_regexp", CppRegExp.Expressions.DIALECT],
]);

/** The cases that are data, not terms: each a dialect's singleton, by its path, written as one document of its schema,
 * the path's `Dialect`. */
export const DOMAINS: ReadonlyMap<string, string> = new Map([
  ["domains", "Expressions.ISOIEC11404.Expressions"], ["systemverilog_domains", "Expressions.SystemVerilog.Expressions"],
  ["python3_domains", "Expressions.Python.Python3"], ["typescript5_domains", "Expressions.TypeScript.TypeScript5"],
  ["matlab_domains", "Expressions.MATLAB.Expressions"], ["excel_domains", "Expressions.Excel.Expressions"],
  ["c_domains", "Expressions.C.Expressions"], ["cpp_domains", "Expressions.Cpp.Expressions"],
  ["amd64_domains", "Expressions.SystemV.AMD64"], ["aapcs64_domains", "Expressions.Arm.AAPCS64"],
]);

/** The case that is an edition of a standard: its dialect, by its path, and its designation, written as one document of
 * `Expressions.Framework.Standard`. */
export const STANDARD: ReadonlyMap<string, readonly [string, string]> = new Map([
  ["standards", ["Expressions.C.Expressions", "ISO/IEC 9899:2024"]],
]);

/** A case: its root schema, its root term, and the store it is built in. */
export type Case = [any, any, any];

export function build(): Map<string, Case> {
  const E = Expressions;
  const store: any = new Builders.Store();
  store.transaction(Framework.install);
  store.transaction(ISOIEC11404.install); // the standard dialects, before the dialects that use them
  store.transaction(IEEE754.install);
  store.transaction(IEEE1164.install);
  store.transaction(Unicode.install);
  store.transaction(Patterns.install);
  store.transaction(Python3.install);
  store.transaction(Matlab.install);
  store.transaction(Excel.install);
  store.transaction(Latex.install);
  store.transaction(C.install);
  store.transaction(Cpp.install);
  store.transaction(AMD64.install); // the ABIs a C or C++ term's holder names
  store.transaction(AAPCS64.install);
  for (const module of [SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor]) { // its family
    store.transaction(module.install);
  }
  store.transaction(TypeScript5.install);
  const retrofit = [PythonTypes, PythonPatterns, TypeScriptTypes, TypeScriptPatterns, CTypes, CppTypes, CPreprocessor,
    PythonRegExp, TypeScriptRegExp, CppRegExp];
  for (const module of retrofit) store.transaction(module.install); // the retrofit's new dialects, each after its family's
  const defined = store.transaction(ISOIEC11404.define)[0]; // ISO/IEC 11404's dialect and its domains
  const stored = new Map<string, any>(([ // each dialect's stored domains
    ["systemverilog_domains", SystemVerilog], ["python3_domains", Python3], ["typescript5_domains", TypeScript5],
    ["matlab_domains", Matlab], ["excel_domains", Excel], ["c_domains", C], ["cpp_domains", Cpp],
    ["amd64_domains", AMD64], ["aapcs64_domains", AAPCS64]] as [string, any][]).map(
    ([name, module]) => [name, store.transaction(module.define)[0].get("dialect")]));
  for (const module of [SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor]) { // the editions they cover
    store.transaction(module.define);
  }
  for (const module of retrofit) store.transaction(module.define); // their data: the editions each covers

  // --- domains: ISO/IEC 11404's dialect and its domains, owned by name; a state domain and a domain packing it into octet
  // added ---
  store.transaction(() => {
    const state = store.Expressions.Framework.Domain((d: any) => d.kind((k: any) => k.as_value((a: any) => a.as_union(
      (u: any) => u.isoiec11404((v: any) => v.state((e: any) => e.members(["IDLE", "RUN"]).ordered(false)))))));
    const mode = store.Expressions.Framework.Domain((d: any) => d.kind((k: any) => k.as_value((a: any) => a.as_union(
      (u: any) => u.isoiec11404((v: any) => v.packed((e: any) => e.codes([0n, 1n]).ordered(true)))))).packs((a: any) => a.insert(
      (e: any) => e.domain(state).representation(defined.get("octet")))));
    store.Expressions.ISOIEC11404.Expressions.Dialect(defined.get("dialect"), (b: any) => b.domains({
      state: (e: any) => e.domain(state), mode: (e: any) => e.domain(mode) }));
  });

  // --- expression: every kind and literal type, a let and its variable, a list ---
  const [self, age] = [E.variable("record"), E.variable("age")];
  const expression = E.let_("age", self.age, age.ge(18n).and_(
    age.lt(65.5).or_(self.has("email").not_()).implies(E.literal(new Uint8Array([0x00, 0xff])).in_(E.list_("x", true)))));

  // --- python3: every kind, a let and its names, a literal with its spelling --- import numpy as np / from math import
  // floor / (lambda a: floor(a.x * 2.5, *[a], k=..., **a) if not a['k'] >= 18 < 0x10 or np.pi or (n := None) else
  // np.stack((p[b'\x00'] for p in a.y if p), [p async for p, *q in a], {p for p in a}, {p: 2j for p in a},
  // {{'k': 1, **a}}, lambda b, **c: b @ a, a[1::-1, :], (yield a), (yield from a), await a, 'x' f'y{a!r:>{p}}', t'{a}',
  // (a)))(record)
  const [a, item, b] = [P.name("a"), P.name("p"), P.name("b")];
  const spelled = (t: any): any => t.literal((r: any) => r.value((v: any) => v.as_scalar(16n)).text("0x10").base(16n));
  const python3 = P.import_("numpy", P.importfrom("math", "floor", P.let_("a", P.name("record"), P.ifexp(
    P.boolop("or", P.unaryop("not", P.compare(">=", P.subscript(a, "k"), 18n, ["<", spelled])), P.attribute(P.name("np"), "pi"),
      P.namedexpr("n", P.constant(null))),
    P.call("floor", P.binop("*", P.attribute(a, "x"), 2.5), P.starred(P.list_(a)), P.keyword("k", P.constant(P.ELLIPSIS)),
      P.keyword(null, a)),
    P.call(P.attribute(P.name("np"), "stack"),
      P.generatorexp(P.subscript(item, new Uint8Array([0x00])), P.comprehension("p", P.attribute(a, "y"), [item])),
      P.listcomp(item, P.comprehension(P.tuple_(item, P.starred(P.name("q"))), a, [], true)),
      P.setcomp(item, P.comprehension("p", a)), P.dictcomp(item, P.constant(new P.Complex(0, 2)), P.comprehension("p", a)),
      P.set_(P.dict_(["k", 1n], [null, a])), P.lambda_(P.binop("@", b, a), ["b"], { kwarg: "c" }),
      P.subscript(a, P.tuple_(P.slice_(1n, null, -1n), P.slice_())), P.yield_(a), P.yieldfrom(a), P.await_(a),
      P.concatenatedstring("x", P.joinedstr(["y", P.formattedvalue(a, "r", [">", P.formattedvalue(item)])])),
      P.templatestr([P.interpolation(a)]), P.parenthesized(a))))), "np");

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

  // --- c: every kind, written through the builders and its writers, typed literals, a literal with its spelling and a
  // shared identifier --- the text ToText writes: {!record.a && record->b[0] > 1.5f ? (uint8_t)record(1) : 5u, nullptr,
  // "a" "b", (record), _Generic(record, int: 1, default: 0x0), record++, sizeof(int), _Alignof(record), record += 1,
  // .x[0] = record, (int[]){1}, ({}), __extension__ record}
  const me = CE.identifier("record");
  const name = (spelling: string) => (n: any) => n.identifier((i: any) => i.spelling(spelling));
  const uint8 = (t: any) => t.typeid((i: any) => i.specifiers([(s: any) => s.namedtypespecifier((n: any) => n.name(name("uint8_t")))]));
  const cInt = (t: any) => t.typeid((i: any) => i.specifiers([(s: any) => s.primitivetypespecifier((k: any) => k.keyword("int"))]));
  const c = CE.DIALECT.spec((u: any) => u.initializerlist((r: any) => r.items([
    CE.conditional(CE.binary("&&", CE.unary("!", CE.member(me, "a")), CE.binary(">", CE.subscript(CE.member(me, "b", "->"), 0n),
                                         CE.literal(1.5, "f"))), CE.cast(uint8, CE.call("record", 1n)), CE.literal(5n, "u")),
    (i: any) => i.constant((k: any) => k.singleton("nullptr")),
    (i: any) => i.concatenatedstring((k: any) => k.parts([CE.literal("a"), CE.literal("b")])),
    (i: any) => i.parenthesizedexpression((k: any) => k.expression(me)),
    (i: any) => i.genericselection((g: any) => g.controlling(me).associations([
      (a: any) => a.type(cInt).value(CE.literal(1n)), (a: any) => a.value((v: any) => v.literal(
        (li: any) => li.value((n: any) => n.as_scalar(0n)).text("0x0").base(16n)))])),
    (i: any) => i.postfixexpression((k: any) => k.operand(me).operator("++")),
    (i: any) => i.sizeofexpression((k: any) => k.operand(cInt)),
    (i: any) => i.alignofexpression((k: any) => k.keyword("_Alignof").operand(me)),
    (i: any) => i.assignmentexpression((a: any) => a.left(me).operator("+=").right(CE.literal(1n))),
    (i: any) => i.designatedinitializer((d: any) => d.designators([(g: any) => g.fielddesignator((f: any) => f.name((i: any) => i.spelling("x"))),
                                  (g: any) => g.indexdesignator((f: any) => f.index(CE.literal(0n)))]).initializer(
      (g: any) => g.equalinitializer((e: any) => e.value(me)))),
    (i: any) => i.compoundliteralexpression((k: any) => k.type((t: any) => t.typeid((y: any) => y.specifiers([
      (s: any) => s.primitivetypespecifier((p: any) => p.keyword("int"))]).declarator((d: any) => d.arraydeclarator((a: any) => a)))).initializer(
      (li: any) => li.items([CE.literal(1n)]))),
    (i: any) => i.statementexpression((k: any) => k),
    (i: any) => i.extensionexpression((k: any) => k.operand(me)),
  ])));

  // --- cpp: every kind, written through the builders and its writers, a C++ name, a lambda, a requires expression and a
  // shared identifier --- the text ToText writes: {!record.a && record->b[0] > 1.5f ? (uint8_t)record(1) : 5u, nullptr,
  // 10_km, "a" R"(b)", std::cout, this, (record), [=, &record, n = 1](auto y) {}, (record + ...), requires (int z) {
  // z + 1; }, int(record), record--, static_cast<int>(record), typeid(record), co_await record, sizeof(int), sizeof...(Ts),
  // alignof(int), noexcept(record), new int{1}, delete[] record, record = 0, throw, co_yield record, record..., .x =
  // record, ({}), __extension__ record}
  const meCpp = CPP.identifier("record");
  const cpp = CPP.DIALECT.spec((u: any) => u.initializerlist((r: any) => r.items([
    CPP.conditional(CPP.binary("&&", CPP.unary("!", CPP.member(meCpp, "a")), CPP.binary(">", CPP.subscript(CPP.member(meCpp, "b", "->"), 0n),
                                          CPP.literal(1.5, "f"))), CPP.cast(uint8, CPP.call("record", 1n)), CPP.literal(5n, "u")),
    (i: any) => i.constant((k: any) => k.singleton("nullptr")),
    (i: any) => i.userdefinedliteral((d: any) => d.literal((li: any) => li.value((v: any) => v.as_scalar(10n))).suffix("_km")),
    (i: any) => i.concatenatedstring((k: any) => k.parts([CPP.literal("a"), (x: any) => x.literal((li: any) => li.value((v: any) => v.as_scalar("b")).raw(true))])),
    (i: any) => i.idexpression((d: any) => d.name((n: any) => n.qualifiedname((q: any) => q.qualifiers([name("std")]).name(name("cout"))))),
    (i: any) => i.thisexpression((k: any) => k),
    (i: any) => i.parenthesizedexpression((k: any) => k.expression(meCpp)),
    (i: any) => i.lambdaexpression((la: any) => la.captures([(k: any) => k.defaultcapture((d: any) => d.mode("=")),
                              (k: any) => k.simplecapture((s: any) => s.by_reference(true).name((i: any) => i.spelling("record"))),
                              (k: any) => k.initcapture((s: any) => s.name(name("n")).initializer(
                                (x: any) => x.equalinitializer((e: any) => e.value(CPP.literal(1n)))))]).declarator(
      (d: any) => d.parameters([(q: any) => q.parameterdeclaration((pd: any) => pd.specifiers([(s: any) => s.placeholdertypespecifier((h: any) => h)]).declarator(
        (dd: any) => dd.iddeclarator((i2: any) => i2.name(name("y")))))]))),
    (i: any) => i.foldexpression((f: any) => f.left(meCpp).operator("+")),
    (i: any) => i.requiresexpression((q: any) => q.parameters([(a: any) => a.parameterdeclaration((pd: any) => pd.specifiers([
      (s: any) => s.primitivetypespecifier((k: any) => k.keyword("int"))]).declarator((dd: any) => dd.iddeclarator((i2: any) => i2.name(name("z")))))]).requirements([
      (r2: any) => r2.simplerequirement((s: any) => s.expression(CPP.binary("+", CPP.identifier("z"), 1n)))])),
    (i: any) => i.functionalcastexpression((f: any) => f.type((s: any) => s.primitivetypespecifier((k: any) => k.keyword("int"))).initializer(
      (x: any) => x.parenthesizedinitializer((pi: any) => pi.arguments([meCpp])))),
    (i: any) => i.postfixexpression((x: any) => x.operand(meCpp).operator("--")),
    (i: any) => i.namedcastexpression((n: any) => n.operator("static_cast").type(cInt).operand(meCpp)),
    (i: any) => i.typeidexpression((t: any) => t.operand(meCpp)),
    (i: any) => i.awaitexpression((a: any) => a.operand(meCpp)),
    (i: any) => i.sizeofexpression((s: any) => s.operand(cInt)),
    (i: any) => i.sizeofpackexpression((s: any) => s.pack((i: any) => i.spelling("Ts"))),
    (i: any) => i.alignofexpression((s: any) => s.keyword("alignof").operand(cInt)),
    (i: any) => i.noexceptexpression((s: any) => s.operand(meCpp)),
    (i: any) => i.newexpression((n: any) => n.type(cInt).initializer((x: any) => x.initializerlist((il: any) => il.items([CPP.literal(1n)])))),
    (i: any) => i.deleteexpression((d: any) => d.array(true).operand(meCpp)),
    (i: any) => i.assignmentexpression((a: any) => a.left(meCpp).operator("=").right(CPP.literal(0n))),
    (i: any) => i.throwexpression((t: any) => t),
    (i: any) => i.yieldexpression((y: any) => y.operand(meCpp)),
    (i: any) => i.packexpansion((x: any) => x.pattern(meCpp)),
    (i: any) => i.designatedinitializer((d: any) => d.designators([(x: any) => x.fielddesignator((f: any) => f.name((i: any) => i.spelling("x")))]).initializer(
      (x: any) => x.equalinitializer((e: any) => e.value(meCpp)))),
    (i: any) => i.statementexpression((s: any) => s),
    (i: any) => i.extensionexpression((e: any) => e.operand(meCpp)),
  ])));

  // --- systemverilog: every kind of SystemVerilog's and of its Types, their helpers, the Preprocessor's macro usage,
  // literals with their spelling, and a shared identifier --- the text ToText writes:
  // record.a inside {1, [2:5]} -> (record matches 3 ? (* keep, depth = 2 *) 'h1f : 4'sb10x1) + {record[0], record.b[7:4],
  // -record, record++, (record += 1), {2{record}}, logic signed [7:0][4]'{record: 1, default: 0}, '{2{record, 1}}, this,
  // super, pkg::c #(8)::new(1, .n(record), ), super.new(default), new record, new[4](record), record.randomize() with
  // (a) { record < 5; }, record.sum(q) with (q > 0), record (* pure *) (record, .n(record), ), $bits(int, real, string,
  // pkg::word_t [3:0], virtual interface bus #(8).mp, signed, struct packed signed { rand bit [1:0] a[], b = 1; },
  // enum int {A, B[2] = 1, C[0:1]}, type(record), logic [int][*][$][$:8]), $clog2(record), signed'(record), 8'(record),
  // byte'(record), $, $root, {}, 1:2:3, tagged Valid record, record matches 1 &&& record, {<< byte {record with
  // [0 +: 2]}}, local::y, $unit::z, bus.t, port.m, `WIDTH, `MAX(a, b), '1, null, 'hx, 1.5, """s""", 10ns, 1_000, "a\"b"}
  const [sv, that] = [SV, SV.identifier("record")];
  const identifier = (spelling: string) => (i: any) => i.spelling(spelling); // an identifier, of its spelling
  const atom = (keyword: string) => (t: any) => t.integeratomtype((a: any) => a.keyword(keyword)); // `int`, a Types term
  const keep = [(a: any) => a.specs([(s: any) => s.name(identifier("keep")), (s: any) => s.name(identifier("depth")).value(sv.literal(2n))])]
  const systemverilog = sv.binary("->", sv.inside(sv.member(that, "a"), 1n, sv.span(2n, 5n)), sv.binary("+", (u: any) => u.parenthesizedexpression(
      (p: any) => p.expression((e: any) => e.conditionalexpression((c: any) => c.condition(
          (m: any) => m.matchesexpression((x: any) => x.value(that).pattern(sv.literal(3n)))).attributes(keep).consequence(
          (q: any) => q.literal((r: any) => r.value((v: any) => v.as_scalar(31n)).base("h"))).alternative(sv.vector("10x1", true))))),
      sv.concatenation(
          sv.select(that, 0n), sv.range_(sv.member(that, "b"), 7n, 4n), sv.unary("-", that),
          (u: any) => u.incrementexpression((i: any) => i.operator("++").postfix(true).operand(that)),
          (u: any) => u.parenthesizedexpression((p: any) => p.expression(
              (e: any) => e.assignmentexpression((a: any) => a.target(that).operator("+=").value(sv.literal(1n))))),
          sv.replication(2n, that),
          (u: any) => u.assignmentpattern((a: any) => a.type((t: any) => t.integervectortype((v: any) => v.keyword("logic").signing("signed").dimensions([
              (d: any) => d.rangedimension((r: any) => r.left(sv.literal(7n)).right(sv.literal(0n))),
              (d: any) => d.sizedimension((z: any) => z.size(sv.literal(4n)))]))).items([
              (i: any) => i.patternitem((p: any) => p.key(that).value(sv.literal(1n))),
              (i: any) => i.patternitem((p: any) => p.value(sv.literal(0n)))])),
          (u: any) => u.assignmentpattern((a: any) => a.count(sv.literal(2n)).items([that, sv.literal(1n)])),
          (u: any) => u.thisexpression((t: any) => t), (u: any) => u.superexpression((t: any) => t),
          (u: any) => u.newexpression((n: any) => n.scope((s: any) => s.scopedname((c: any) => c.scope((x: any) => x.identifier(identifier("pkg"))).name(
              (x: any) => x.parameterizedname((q: any) => q.name(identifier("c")).parameters([sv.literal(8n)]))))).arguments([
              sv.literal(1n), (a: any) => a.namedconnection((c: any) => c.name(identifier("n")).value(that)),
              (a: any) => a.emptyargument((e: any) => e)])),
          (u: any) => u.newexpression((n: any) => n.scope((s: any) => s.superexpression((x: any) => x)).defaulted(true)),
          (u: any) => u.newcopyexpression((n: any) => n.value(that)),
          (u: any) => u.newarrayexpression((n: any) => n.size(sv.literal(4n)).value(that)),
          (u: any) => u.randomizewithexpression((r: any) => r.call(sv.method(that, "randomize")).restricted(true).variables(
              [identifier("a")]).items([sv.binary("<", that, 5n)])),
          sv.iterate(that, "sum", "q", sv.binary(">", sv.identifier("q"), 0n)),
          (u: any) => u.callexpression((c: any) => c.callee(that).attributes([(a: any) => a.specs([(s: any) => s.name(identifier("pure"))])]).arguments([
              that, (a: any) => a.namedconnection((n: any) => n.name(identifier("n")).value(that)), (a: any) => a.emptyargument((e: any) => e)])),
          (u: any) => u.systemcall((c: any) => c.name("$bits").arguments([
              atom("int"), (t: any) => t.nonintegertype((n: any) => n.keyword("real")), (t: any) => t.keywordtype((k: any) => k.keyword("string")),
              (t: any) => t.namedtype((n: any) => n.name((x: any) => x.scopedname((c: any) => c.scope((y: any) => y.identifier(identifier("pkg"))).name(
                  (y: any) => y.identifier(identifier("word_t"))))).dimensions([(d: any) => d.rangedimension((r: any) => r.left(sv.literal(3n)).right(sv.literal(0n)))])),
              (t: any) => t.virtualinterfacetype((v: any) => v.interface_keyword(true).interface(identifier("bus")).parameters([sv.literal(8n)]).modport(identifier("mp"))),
              (t: any) => t.implicittype((i: any) => i.signing("signed")),
              (t: any) => t.structtype((s: any) => s.keyword("struct").packed(true).signing("signed").members([(m: any) => m.random("rand").type(
                  (t: any) => t.integervectortype((v: any) => v.keyword("bit").dimensions([(d: any) => d.rangedimension((r: any) => r.left(sv.literal(1n)).right(sv.literal(0n)))]))).declarators([
                  (d: any) => d.name(identifier("a")).dimensions([(x: any) => x.unsizeddimension((y: any) => y)]), (d: any) => d.name(identifier("b")).value(sv.literal(1n))])])),
              (t: any) => t.enumtype((e: any) => e.base(atom("int")).members([(m: any) => m.name(identifier("A")), (m: any) => m.name(identifier("B")).left(sv.literal(2n)).value(sv.literal(1n)),
                                                                          (m: any) => m.name(identifier("C")).left(sv.literal(0n)).right(sv.literal(1n))])),
              (t: any) => t.typereference((r: any) => r.operand(that)),
              (t: any) => t.integervectortype((v: any) => v.keyword("logic").dimensions([(d: any) => d.associativedimension((a: any) => a.type(atom("int"))),
                  (d: any) => d.associativedimension((a: any) => a), (d: any) => d.queuedimension((q: any) => q), (d: any) => d.queuedimension((q: any) => q.bound(sv.literal(8n)))]))])),
          sv.call("$clog2", that),
          sv.cast((t: any) => t.implicittype((i: any) => i.signing("signed")), that), sv.cast(8n, that), sv.cast(atom("byte"), that),
          (u: any) => u.dollarexpression((d: any) => d), (u: any) => u.rootexpression((r: any) => r), (u: any) => u.emptyqueue((e: any) => e),
          (u: any) => u.mintypmaxexpression((m: any) => m.min(sv.literal(1n)).typ(sv.literal(2n)).max(sv.literal(3n))),
          (u: any) => u.taggedexpression((t: any) => t.member(identifier("Valid")).value(that)),
          (u: any) => u.predicateexpression((p: any) => p.conditions([(c: any) => c.matchesexpression((m: any) => m.value(that).pattern(sv.literal(1n))), that])),
          (u: any) => u.streamingconcatenation((s: any) => s.operator("<<").slice(atom("byte")).items([
              (i: any) => i.expression(that).left(sv.literal(0n)).operator("+:").right(sv.literal(2n))])),
          (u: any) => u.nameexpression((n: any) => n.name((x: any) => x.localname((l: any) => l.name(identifier("y"))))),
          (u: any) => u.nameexpression((n: any) => n.name((x: any) => x.scopedname((c: any) => c.scope((y: any) => y.unitname((z: any) => z)).name(
              (y: any) => y.identifier(identifier("z")))))),
          (u: any) => u.nameexpression((n: any) => n.name((x: any) => x.interfacetypename((i: any) => i.interface(identifier("bus")).name(identifier("t"))))),
          (u: any) => u.nameexpression((n: any) => n.name((x: any) => x.interfacemethodname((i: any) => i.port(identifier("port")).name(identifier("m"))))),
          (u: any) => u.macrousage((m: any) => m.name(identifier("WIDTH"))),
          (u: any) => u.macrousage((m: any) => m.name(identifier("MAX")).arguments("a, b")),
          (u: any) => u.constant((c: any) => c.fill("1")), (u: any) => u.constant((c: any) => c.singleton("null")),
          (u: any) => u.constant((c: any) => c.bits("xxxx").base("h")),
          sv.literal(1.5), (u: any) => u.literal((r: any) => r.value((v: any) => v.as_scalar("s")).triple(true)),
          (u: any) => u.literal((r: any) => r.value((v: any) => v.as_scalar(10.0)).unit("ns")),
          (u: any) => u.literal((r: any) => r.value((v: any) => v.as_scalar(1000n)).text("1_000").separators(true)),
          sv.literal('a"b'))));

  // --- typescript5: every kind, its types, patterns and JSX, written through the builders (TypeScript5 has no writers), a
  // literal with its spelling and a shared identifier ---
  const tsRecord = (u: any) => u.identifier((r: any) => r.name("record")); // TypeScript5's `tsRecord`, in any union that has identifiers
  const typescript5 = (u: any) => u.sequenceexpression((s: any) => s.expressions([ // written through the builders
      (e: any) => e.parenthesizedexpression((r: any) => r.expression((x: any) => x.assignmentexpression((a: any) => a  // ({ a: [b, , ...c], d: { tsRecord }, f = 1 } = tsRecord)
          .left((t: any) => t.objectpattern((o: any) => o.properties([
              (p: any) => p.property((q: any) => q.propertyKind("init").key((k: any) => k.identifier((i: any) => i.name("a"))).value(
                  (v: any) => v.arraypattern((ap: any) => ap.elements([(y: any) => y.identifier((i: any) => i.name("b")), (y: any) => y.elision((h: any) => h),
                                                                    (y: any) => y.restelement((z: any) => z.argument((g: any) => g.identifier((i: any) => i.name("c"))))])))),
              (p: any) => p.property((q: any) => q.propertyKind("init").key((k: any) => k.identifier((i: any) => i.name("d"))).value(
                  (v: any) => v.objectpattern((op: any) => op.properties([(y: any) => y.property((z: any) => z.propertyKind("init").key(tsRecord).shorthand(true).value(tsRecord))])))),
              (p: any) => p.property((q: any) => q.propertyKind("init").key((k: any) => k.identifier((i: any) => i.name("f"))).shorthand(true).value(
                  (v: any) => v.assignmentpattern((ap: any) => ap.left((g: any) => g.identifier((i: any) => i.name("f"))).right(
                      (g: any) => g.literal((li: any) => li.value((n: any) => n.as_scalar(1.0)))))))])))
          .operator("=").right(tsRecord)))),
      (e: any) => e.functionexpression((r: any) => r.isAsync(true).generator(true).id((i: any) => i.name("g")).typeParameters(  // async function* g<T>(x: T = this.y) {}
          (d: any) => d.params([(p: any) => p.name((i: any) => i.name("T"))])).params([(p: any) => p.assignmentpattern((ap: any) => ap
              .left((g: any) => g.identifier((i: any) => i.name("x").typeAnnotation((ta: any) => ta.typeAnnotation(
                  (t: any) => t.tstypereference((tr: any) => tr.typeName((n: any) => n.identifier((j: any) => j.name("T"))))))))
              .right((g: any) => g.memberexpression((m: any) => m.object((o: any) => o.thisexpression((h: any) => h)).property((y: any) => y.identifier((i: any) => i.name("y"))))))])),
      (e: any) => e.arrowfunctionexpression((r: any) => r.isAsync(true).typeParameters((d: any) => d.params([(p: any) => p.name((i: any) => i.name("U"))]))  // async <U>(p: U, ...r: U[]) => await import.meta.resolve(p)
          .params([(p: any) => p.identifier((i: any) => i.name("p").typeAnnotation((ta: any) => ta.typeAnnotation(
                       (t: any) => t.tstypereference((tr: any) => tr.typeName((n: any) => n.identifier((j: any) => j.name("U"))))))),
                   (p: any) => p.restelement((z: any) => z.argument((g: any) => g.identifier((i: any) => i.name("r"))).typeAnnotation((ta: any) => ta.typeAnnotation(
                       (t: any) => t.tsarraytype((at: any) => at.elementType((y: any) => y.tstypereference((tr: any) => tr.typeName((n: any) => n.identifier((j: any) => j.name("U")))))))))])
          .body((b: any) => b.awaitexpression((w: any) => w.argument((c: any) => c.callexpression((ce: any) => ce.callee((f: any) => f.memberexpression((m: any) => m
              .object((o: any) => o.metaproperty((mp: any) => mp.meta((i: any) => i.name("import")).property((i: any) => i.name("meta"))))
              .property((y: any) => y.identifier((i: any) => i.name("resolve"))))).arguments([(y: any) => y.identifier((i: any) => i.name("p"))])))))),
      (e: any) => e.classexpression((r: any) => r.decorators([(d: any) => d.expression(tsRecord)]).id((i: any) => i.name("K"))  // @tsRecord class K<T> extends tsRecord.Base<T> implements tsRecord {}
          .typeParameters((d: any) => d.params([(p: any) => p.name((i: any) => i.name("T"))]))
          .superClass((c: any) => c.memberexpression((m: any) => m.object(tsRecord).property((y: any) => y.identifier((i: any) => i.name("Base")))))
          .superTypeArguments((a: any) => a.params([(t: any) => t.tstypereference((tr: any) => tr.typeName((n: any) => n.identifier((j: any) => j.name("T"))))]))
          .implements([(c: any) => c.expression(tsRecord)])),
      (e: any) => e.newexpression((r: any) => r.callee((c: any) => c.memberexpression((m: any) => m.object(tsRecord).property(  // new tsRecord.C<number>(...tsRecord)
          (y: any) => y.identifier((i: any) => i.name("C"))))).typeArguments((a: any) => a.params([(t: any) => t.tsnumberkeyword((k: any) => k)]))
          .arguments([(y: any) => y.spreadelement((z: any) => z.argument(tsRecord))])),
      (e: any) => e.taggedtemplateexpression((r: any) => r.tag(tsRecord).quasi((q: any) => q.quasis([  // tsRecord`a${tsRecord}b`
          (y: any) => y.raw("a"), (y: any) => y.raw("b").tail(true)]).expressions([tsRecord]))),
      (e: any) => e.templateliteral((r: any) => r.quasis([(y: any) => y.raw("x"), (y: any) => y.raw("").tail(true)]).expressions([tsRecord])),  // `x${tsRecord}`
      (e: any) => e.updateexpression((r: any) => r.operator("++").argument(tsRecord)),  // tsRecord++
      (e: any) => e.unaryexpression((r: any) => r.operator("typeof").argument(tsRecord)),  // typeof tsRecord
      (e: any) => e.binaryexpression((r: any) => r.left((y: any) => y.privateidentifier((i: any) => i.name("p"))).operator("in").right(tsRecord)),  // #p in tsRecord
      (e: any) => e.logicalexpression((r: any) => r.left(tsRecord).operator("??").right((y: any) => y.constant((c: any) => c.singleton("null")))),  // tsRecord ?? null
      (e: any) => e.conditionalexpression((r: any) => r.test(tsRecord).consequent(  // tsRecord ? /x/g : 1n
          (y: any) => y.constant((c: any) => c.pattern("x").flags("g"))).alternate((y: any) => y.literal((li: any) => li.value((n: any) => n.as_scalar(1n))))),
      (e: any) => e.yieldexpression((r: any) => r.delegate(true).argument(tsRecord)),  // yield* tsRecord
      (e: any) => e.tsasexpression((r: any) => r.expression(tsRecord).typeAnnotation((t: any) => t.tsstringkeyword((k: any) => k))),  // tsRecord as string
      (e: any) => e.tssatisfiesexpression((r: any) => r.expression(tsRecord).typeAnnotation((t: any) => t.tsobjectkeyword((k: any) => k))),  // tsRecord satisfies object
      (e: any) => e.tstypeassertion((r: any) => r.typeAnnotation((t: any) => t.tsanykeyword((k: any) => k)).expression(tsRecord)),  // <any>tsRecord
      (e: any) => e.tsnonnullexpression((r: any) => r.expression(tsRecord)),  // tsRecord!
      (e: any) => e.tsinstantiationexpression((r: any) => r.expression(tsRecord).typeArguments((a: any) => a.params([(t: any) => t.tsstringkeyword((k: any) => k)]))),  // tsRecord<string>
      (e: any) => e.arrayexpression((r: any) => r.elements([  // [1, , ...tsRecord]: the framework's list, its elements any dialect's terms
          (y: any) => y.typescript5((t: any) => t.literal((li: any) => li.value((n: any) => n.as_scalar(1.0)))), (y: any) => y.typescript5((t: any) => t.elision((h: any) => h)),
          (y: any) => y.typescript5((t: any) => t.spreadelement((z: any) => z.argument(tsRecord)))])),
      (e: any) => e.objectexpression((r: any) => r.properties([  // { m(): void, ...tsRecord, [tsRecord]: "s" }
          (p: any) => p.property((q: any) => q.propertyKind("init").key((k: any) => k.identifier((i: any) => i.name("m"))).method(true).value(
              (v: any) => v.tsemptybodyfunctionexpression((f: any) => f.returnType((a: any) => a.typeAnnotation((t: any) => t.tsvoidkeyword((k: any) => k)))))),
          (p: any) => p.spreadelement((z: any) => z.argument(tsRecord)),
          (p: any) => p.property((q: any) => q.propertyKind("init").computed(true).key(tsRecord).value((v: any) => v.literal((li: any) => li.value((n: any) => n.as_scalar("s")))))])),
      (e: any) => e.jsxelement((r: any) => r  // <div id="x" {...tsRecord}>{}{tsRecord}<>text</></div>
          .openingElement((o: any) => o.name((n: any) => n.jsxidentifier((i: any) => i.name("div"))).attributes([
              (a: any) => a.jsxattribute((t: any) => t.name((n: any) => n.jsxidentifier((i: any) => i.name("id"))).value(
                  (v: any) => v.literal((li: any) => li.value((n: any) => n.as_scalar("x")).text('"x"')))),
              (a: any) => a.jsxspreadattribute((z: any) => z.argument(tsRecord))]))
          .children([(c: any) => c.jsxexpressioncontainer((x: any) => x.expression((y: any) => y.jsxemptyexpression((h: any) => h))),
                     (c: any) => c.jsxexpressioncontainer((x: any) => x.expression(tsRecord)),
                     (c: any) => c.jsxfragment((f: any) => f.openingFragment((h: any) => h).children([(t: any) => t.jsxtext((j: any) => j.raw("text"))]).closingFragment((h: any) => h))])
          .closingElement((c: any) => c.name((n: any) => n.jsxidentifier((i: any) => i.name("div"))))),
      (e: any) => e.jsxfragment((f: any) => f.openingFragment((h: any) => h).children([(c: any) => c.jsxelement((x: any) => x  // <><br /></>
          .openingElement((o: any) => o.name((n: any) => n.jsxidentifier((i: any) => i.name("br"))).selfClosing(true)))]).closingFragment((h: any) => h)),
      (e: any) => e.chainexpression((r: any) => r.expression((y: any) => y.memberexpression((m: any) => m.object(tsRecord).optional(true).property(  // tsRecord?.a
          (z: any) => z.identifier((i: any) => i.name("a")))))),
      (e: any) => e.memberexpression((m: any) => m.object((o: any) => o.super((h: any) => h)).property((y: any) => y.identifier((i: any) => i.name("x")))),  // super.x
      (e: any) => e.importexpression((r: any) => r.source(tsRecord)),  // import(tsRecord)
  ]));

  // --- typescript_types: every kind of TypeScript's Types, the terms a type holds among them --- the text:
  // any | ... | this | A.B<T> | (T) | "s" | `a${T}b` | T[] | [a: T, T?, ...T[]] | (T & U) | (<T>(x: T) => x is T) |
  // (abstract new () => T) | { a: T; m(x): T; (): T; new (): T; [k: T]: T; // c } | { [K in T as U]: K } | T[keyof T] |
  // typeof this | import("m").A | (T extends (infer V)[] ? V : never)
  const tsT = (t: any) => t.tstypereference((r: any) => r.typeName((n: any) => n.identifier((i: any) => i.name("T")))); // `T`
  const tsAnnotated = (name: string) => (p: any) => p.identifier((i: any) => i.name(name).typeAnnotation((a: any) => a.typeAnnotation(tsT)));
  const typescriptTypes = (u: any) => u.tsuniontype((n: any) => n.types([ // written through the builders
    ...TypeScriptTypes.Expressions.KEYWORDS.map((keyword) => (k: any) => k[keyword]((h: any) => h)),
    (k: any) => k.tstypereference((r: any) => r.typeName((m: any) => m.tsqualifiedname((q: any) => q.left((l: any) => l.identifier(
      (i: any) => i.name("A"))).right((i: any) => i.name("B")))).typeArguments((a: any) => a.params([tsT]))),
    (k: any) => k.tsparenthesizedtype((p: any) => p.typeAnnotation(tsT)),
    (k: any) => k.tsliteraltype((p: any) => p.literal((li: any) => li.literal((v: any) => v.value((x: any) => x.as_scalar("s"))))),
    (k: any) => k.tstemplateliteraltype((p: any) => p.quasis([(q: any) => q.raw("a"), (q: any) => q.raw("b").tail(true)]).types([tsT])),
    (k: any) => k.tsarraytype((a: any) => a.elementType(tsT)),
    (k: any) => k.tstupletype((p: any) => p.elementTypes([
      (e: any) => e.tsnamedtuplemember((m: any) => m.label((i: any) => i.name("a")).elementType(tsT)),
      (e: any) => e.tsoptionaltype((o: any) => o.typeAnnotation(tsT)),
      (e: any) => e.tsresttype((o: any) => o.typeAnnotation((a: any) => a.tsarraytype((b: any) => b.elementType(tsT))))])),
    (k: any) => k.tsintersectiontype((p: any) => p.types([tsT, (t: any) => t.tstypereference((r: any) => r.typeName(
      (m: any) => m.identifier((i: any) => i.name("U"))))])),
    (k: any) => k.tsfunctiontype((f: any) => f.typeParameters((d: any) => d.params([(p: any) => p.name((i: any) => i.name("T"))])).params([
      tsAnnotated("x")]).returnType((a: any) => a.typeAnnotation((p: any) => p.tstypepredicate((q: any) => q.parameterName(
      (m: any) => m.identifier((i: any) => i.name("x"))).typeAnnotation((b: any) => b.typeAnnotation(tsT)))))),
    (k: any) => k.tsconstructortype((f: any) => f.abstract(true).returnType((a: any) => a.typeAnnotation(tsT))),
    (k: any) => k.tstypeliteral((q: any) => q.members([
      (m: any) => m.tspropertysignature((s: any) => s.key((y: any) => y.identifier((i: any) => i.name("a"))).typeAnnotation((a: any) => a.typeAnnotation(tsT))),
      (m: any) => m.tsmethodsignature((s: any) => s.key((y: any) => y.identifier((i: any) => i.name("m"))).params([
        (p: any) => p.identifier((i: any) => i.name("x"))]).returnType((a: any) => a.typeAnnotation(tsT))),
      (m: any) => m.tscallsignaturedeclaration((s: any) => s.returnType((a: any) => a.typeAnnotation(tsT))),
      (m: any) => m.tsconstructsignaturedeclaration((s: any) => s.returnType((a: any) => a.typeAnnotation(tsT))),
      (m: any) => m.tsindexsignature((s: any) => s.parameters([tsAnnotated("k")]).typeAnnotation((a: any) => a.typeAnnotation(tsT))),
      (m: any) => m.comment((c: any) => c.text(" c"))])),
    (k: any) => k.tsmappedtype((m: any) => m.key((i: any) => i.name("K")).value(tsT).nameType((t: any) => t.tstypereference(
      (r: any) => r.typeName((n: any) => n.identifier((i: any) => i.name("U"))))).body((t: any) => t.tstypereference(
      (r: any) => r.typeName((n: any) => n.identifier((i: any) => i.name("K")))))),
    (k: any) => k.tsindexedaccesstype((a: any) => a.objectType(tsT).indexType((i: any) => i.tstypeoperator(
      (o: any) => o.operator("keyof").typeAnnotation(tsT)))),
    (k: any) => k.tstypequery((q: any) => q.exprName((e: any) => e.thisexpression((h: any) => h))),
    (k: any) => k.tsimporttype((i: any) => i.source((s: any) => s.literal((li: any) => li.value((x: any) => x.as_scalar("m")))).qualifier(
      (q: any) => q.identifier((j: any) => j.name("A")))),
    (k: any) => k.tsconditionaltype((c: any) => c.checkType(tsT).extendsType((e: any) => e.tsarraytype((a: any) => a.elementType(
      (i: any) => i.tsinfertype((f: any) => f.typeParameter((p: any) => p.name((n: any) => n.name("V"))))))).trueType(
      (t: any) => t.tstypereference((r: any) => r.typeName((n: any) => n.identifier((i: any) => i.name("V"))))).falseType(
      (t: any) => t.tsneverkeyword((h: any) => h))),
  ]));

  // --- typescript_patterns: every kind of TypeScript's Patterns, the terms a target may be among them --- the text:
  // [{ a: record = 1, ...record }, , record.x, private record]
  const typescriptPatterns = (u: any) => u.arraypattern((a: any) => a.elements([ // written through the builders
    (e: any) => e.objectpattern((o: any) => o.properties([
      (p: any) => p.property((q: any) => q.propertyKind("init").key((k: any) => k.identifier((i: any) => i.name("a"))).value(
        (v: any) => v.assignmentpattern((s: any) => s.left(tsRecord).right((r: any) => r.literal((li: any) => li.value(
          (x: any) => x.as_scalar(1.0))))))),
      (p: any) => p.restelement((r: any) => r.argument(tsRecord))])),
    (e: any) => e.elision((h: any) => h),
    (e: any) => e.memberexpression((m: any) => m.object(tsRecord).property((y: any) => y.identifier((i: any) => i.name("x")))),
    (e: any) => e.tsparameterproperty((t: any) => t.accessibility("private").parameter(tsRecord))]));

  // --- systemverilog_patterns: every kind of SystemVerilog's Patterns, held by Expressions' `matches` --- the text:
  // '{a: .x, b: tagged Valid (.*), c: record.a}
  const patterns = SVPatterns.Expressions.DIALECT.spec((u: any) => u.structurepattern((s: any) => s.items([
        (i: any) => i.patternmember((m: any) => m.name(identifier("a")).pattern((p: any) => p.variablepattern((v: any) => v.name(identifier("x"))))),
        (i: any) => i.patternmember((m: any) => m.name(identifier("b")).pattern((p: any) => p.taggedpattern((t: any) => t.member(identifier("Valid")).pattern(
            (q: any) => q.parenthesizedpattern((r: any) => r.pattern((w: any) => w.wildcardpattern((x: any) => x))))))),
        (i: any) => i.patternmember((m: any) => m.name(identifier("c")).pattern(sv.member(that, "a")))])));

  // --- systemverilog_assertions: every kind of SystemVerilog's Assertions and their helpers --- the text:
  // @(posedge clk iff en or negedge rst) disable iff (rst) (a[*1:$], x += 1) ##[1:3] first_match(b intersect c) |=>
  // @(*) d ##1 e[->2] ##n f[=1] and if (en) weak(a or b) else reject_on (rst) case (n) 1, 2: a until b; default:
  // not a; endcase or (@(negedge clk) a throughout b iff nexttime [2] c #-# d)
  const [a_, b_, c_, d_] = ["a", "b", "c", "d"].map((t) => sv.identifier(t));
  const assertions = SVAssertions.Expressions.DIALECT.spec((u: any) => u.propertyspec((s: any) => s.clock((k: any) => k.events([
        (e: any) => e.edge("posedge").expression(sv.identifier("clk")).condition(sv.identifier("en")),
        (e: any) => e.edge("negedge").expression(sv.identifier("rst"))])).disable(sv.identifier("rst")).property((p: any) => p.binaryproperty((o: any) => o.left(
        (l: any) => l.binaryproperty((q: any) => q.left(
            (i: any) => i.implicationproperty((m: any) => m.antecedent((s1: any) => s1.delaysequence((ds: any) => ds.first(
                (ps: any) => ps.parenthesizedsequence((pp: any) => pp.sequence((r: any) => r.repetitionsequence((rr: any) => rr.sequence(a_).operator("*").count(
                    (cr: any) => cr.cyclerange((c: any) => c.low(sv.literal(1n)).high((dd: any) => dd.dollarexpression((z: any) => z)))))).items([
                    (it: any) => it.assignmentexpression((ae: any) => ae.target(sv.identifier("x")).operator("+=").value(sv.literal(1n)))]))).steps([
                (st: any) => st.delay((cr: any) => cr.cyclerange((c: any) => c.low(sv.literal(1n)).high(sv.literal(3n)))).sequence(
                    (fm: any) => fm.firstmatchsequence((f: any) => f.sequence((bs: any) => bs.binarysequence((b2: any) => b2.left(b_).operator("intersect").right(c_)))))]))).operator("|=>").consequent(
                (cs: any) => cs.clockedsequence((k: any) => k.clock((e: any) => e).sequence((ds: any) => ds.delaysequence((q2: any) => q2.first(d_).steps([
                    (st: any) => st.delay(sv.literal(1n)).sequence((r: any) => r.repetitionsequence((rr: any) => rr.sequence(sv.identifier("e")).operator("->").count(sv.literal(2n)))),
                    (st: any) => st.delay(sv.identifier("n")).sequence((r: any) => r.repetitionsequence((rr: any) => rr.sequence(sv.identifier("f")).operator("=").count(sv.literal(1n))))]))))))).operator("and").right(
            (cp: any) => cp.conditionalproperty((c: any) => c.condition(sv.identifier("en")).consequence(
                (sp: any) => sp.strengthproperty((w: any) => w.keyword("weak").sequence((bs: any) => bs.binarysequence((b2: any) => b2.left(a_).operator("or").right(b_))))).alternative(
                (ab: any) => ab.abortproperty((r: any) => r.keyword("reject_on").condition(sv.identifier("rst")).operand((cp2: any) => cp2.caseproperty((cc: any) => cc.expression(sv.identifier("n")).items([
                    (it: any) => it.expressions([sv.literal(1n), sv.literal(2n)]).body((bp: any) => bp.binaryproperty((u2: any) => u2.left(a_).operator("until").right(b_))),
                    (it: any) => it.body((up: any) => up.unaryproperty((u3: any) => u3.operator("not").operand(a_)))]))))))))).operator("or").right(
        (pp: any) => pp.parenthesizedproperty((q: any) => q.property((cl: any) => cl.clockedproperty((k: any) => k.clock((e: any) => e.events([
            (ev: any) => ev.edge("negedge").expression(sv.identifier("clk"))])).property((bp: any) => bp.binaryproperty((o2: any) => o2.left(
                (bs: any) => bs.binarysequence((t: any) => t.left(a_).operator("throughout").right(b_))).operator("iff").right(
                (ip: any) => ip.implicationproperty((im: any) => im.antecedent((up: any) => up.unaryproperty((u4: any) => u4.operator("nexttime").range(sv.literal(2n)).operand(c_))).operator("#-#").consequent(d_)))))))))))));

  // --- systemverilog_constraints: every kind of SystemVerilog's Constraints and its helpers --- the text:
  // { soft record dist {0 := 40, [1:3] :/ 60, default :/ 1}; record > 0 -> record.a; if (record) record.a; else {}
  // foreach (record[k, ]) k < record.a; solve record before record.a; disable soft record; unique {record, [1:2]}; }
  const holds = (e: any) => (u: any) => u.expressionconstraint((c: any) => c.expression(e)); // a constraint of an expression
  const constraints = SVConstraints.Expressions.DIALECT.spec((u: any) => u.constraintblock((b: any) => b.items([
        (i: any) => i.expressionconstraint((c: any) => c.soft(true).expression((d: any) => d.distexpression((e: any) => e.value(that).items([
            (t: any) => t.value(sv.literal(0n)).operator(":=").weight(sv.literal(40n)),
            (t: any) => t.value(sv.span(1n, 3n)).operator(":/").weight(sv.literal(60n)),
            (t: any) => t.operator(":/").weight(sv.literal(1n))])))),
        (i: any) => i.implicationconstraint((c: any) => c.condition(sv.binary(">", that, 0n)).body(holds(sv.member(that, "a")))),
        (i: any) => i.conditionalconstraint((c: any) => c.condition(that).consequence(holds(sv.member(that, "a"))).alternative(
            (e: any) => e.constraintblock((b: any) => b.items([])))),
        (i: any) => i.foreachconstraint((f: any) => f.value(that).variables([(v: any) => v.identifier(identifier("k")),
                                                                         (v: any) => v.emptyargument((e: any) => e)])
            .body(holds(sv.binary("<", sv.identifier("k"), sv.member(that, "a"))))),
        (i: any) => i.solvebeforeconstraint((s: any) => s.solve([that]).before([sv.member(that, "a")])),
        (i: any) => i.disablesoftconstraint((d: any) => d.target(that)),
        (i: any) => i.uniqueconstraint((q: any) => q.set([that, sv.span(1n, 2n)])),
    ])));

  // --- systemverilog_preprocessor: every kind of SystemVerilog's Preprocessor and its helper, in a conditional
  // directive, its items, an `elsif` and an `else` --- the text: `ifdef (A && !B), its items each on its line,
  // `elsif C, `resetall, `else, skipped;, `endif
  const preprocessor = SVPreprocessor.Expressions.DIALECT.spec((u: any) => u.ifdefdirective((d: any) => d
        .condition((c: any) => c.parenthesizedexpression((p: any) => p.expression(sv.binary("&&", sv.identifier("A"), sv.unary("!", sv.identifier("B"))))))
        .items([
            (i: any) => i.includedirective((r: any) => r.path("defs.svh")),
            (i: any) => i.includedirective((r: any) => r.path("uvm.svh").system(true)),
            (i: any) => i.definedirective((r: any) => r.name(identifier("MAX")).function_like(true).parameters(
                [identifier("a"), identifier("b")]).body("((a) > (b) ? (a) : (b))")),
            (i: any) => i.undefdirective((r: any) => r.name(identifier("W"))),
            (i: any) => i.timescaledirective((r: any) => r.unit("1ns").precision("1ps")),
            (i: any) => i.defaultnettypedirective((r: any) => r.net_type("none")),
            (i: any) => i.comment((r: any) => r.text(" low")),
            (i: any) => i.comment((r: any) => r.text(" block ").block(true)),
            (i: any) => i.macrousage((r: any) => r.name(identifier("MAX")).arguments("1, 2")),
        ])
        .branches([(b: any) => b.name(identifier("C")).items([(i: any) => i.otherdirective((r: any) => r.text("`resetall"))])])
        .alternative([(i: any) => i.disabledtext((r: any) => r.text("skipped;"))]).has_else(true)));

  // --- python_types: every kind of Python's Types, nested where a type expression stands, and a type expression of
  // Python3's kinds --- the text: T: list[int] | None = **P = *Ts = *tuple[int, ...]
  const pythonTypes = PythonTypes.Expressions.DIALECT.spec((u: any) => u.typevar((t: any) => t.name("T").bound(
    P.binop("|", P.subscript(P.name("list"), P.name("int")), P.constant(null))).default_value(
    (d: any) => d.paramspec((s: any) => s.name("P").default_value((e: any) => e.typevartuple((v: any) => v.name("Ts").default_value(
      P.starred(P.subscript(P.name("tuple"), P.tuple_(P.name("int"), P.constant(P.ELLIPSIS)))))))))));

  // --- python_patterns: every kind of Python's Patterns, Python3's terms in their subterms --- the text:
  // record.Point(0, y=[a, *rest]) | {'k': None, **kw} | (record.RED as c)
  const pythonPatterns = PythonPatterns.Expressions.DIALECT.spec((u: any) => u.matchor((o: any) => o.patterns([
    (p: any) => p.matchclass((c: any) => c.cls(P.attribute(P.name("record"), "Point")).patterns([
      (v: any) => v.matchvalue((m: any) => m.value(P.constant(0n)))]).kwd_attrs(["y"]).kwd_patterns([
      (s: any) => s.matchsequence((q: any) => q.delimiters("[]").patterns([(a: any) => a.matchas((m: any) => m.name("a")),
        (r: any) => r.matchstar((m: any) => m.name("rest"))]))])),
    (p: any) => p.matchmapping((m: any) => m.keys([P.constant("k")]).patterns([
      (s: any) => s.matchsingleton((v: any) => v.value("None"))]).rest("kw")),
    (p: any) => p.matchas((m: any) => m.pattern((v: any) => v.matchvalue((w: any) => w.value(P.attribute(P.name("record"), "RED")))).name("c"))])));

  // --- c_types and cpp_types: every kind of each Types dialect, an enumeration's type name, its body's enumerators, and a
  // directive and a comment among them, C Preprocessor's --- the text: enum E {, its items each on its line, A = 1,
  // #ifdef B_, B, #endif, its trailing comment after it, and }
  const [CT, XT, CPRE] = [CTypes.Expressions.DIALECT, CppTypes.Expressions.DIALECT, CPreprocessor.Expressions.DIALECT];
  const identified = (spelling: string) => (i: any) => i.spelling(spelling); // an identifier
  const enumeration = (types: Terms.Dialect, family: any) => types.spec((t: any) => t.typeid((i: any) => i.specifiers([
    (s: any) => s.enumspecifier((e: any) => e.key("enum").name(name("E")).body(true).enumerators([
      (n: any) => n.enumerator((r: any) => r.name(identified("A")).value(family.literal(1n))),
      (n: any) => n.ifdefdirective((d: any) => d.name(identified("B_")).items([types.spec((m: any) => m.enumerator(
        (r: any) => r.name(identified("B"))))])),
      (n: any) => n.comment((c: any) => c.text("last").trailing(true))]).trailing_comma(true))])));

  // --- c_preprocessor: every kind, a conditional's branches nested, its conditions a C and a C++ term, its items C
  // Types' and its own --- #if defined(X) && X > 1, A, #include <a.h>, /* one */, #elif Y == 2, #elifndef Z, #else,
  // #define F(a, ...) a + 1, #pragma once, #ifdef W, #endif, #endif
  const cPreprocessor = CPRE.spec((u: any) => u.ifdirective((d: any) => d.condition(CE.binary("&&", CE.DIALECT.spec(
    (v: any) => v.definedexpression((x: any) => x.name(identified("X")))), CE.binary(">", CE.identifier("X"), 1n))).items([
    CT.spec((m: any) => m.enumerator((r: any) => r.name(identified("A")))),
    CPRE.spec((m: any) => m.includedirective((i: any) => i.path("a.h").system(true))),
    CPRE.spec((m: any) => m.comment((c: any) => c.block(true).text(" one ")))]).alternative(
    (a: any) => a.elifdirective((e: any) => e.condition(CPP.binary("==", CPP.identifier("Y"), 2n)).alternative(
      (b: any) => b.elifdefdirective((f: any) => f.negated(true).name(identified("Z")).alternative(
        (c: any) => c.elsedirective((g: any) => g.items([
          CPRE.spec((m: any) => m.definedirective((h: any) => h.name(identified("F")).function_like(true).parameters([
            identified("a")]).variadic(true).replacement("a + 1"))),
          CPRE.spec((m: any) => m.otherdirective((o: any) => o.directive("pragma").text("once"))),
          CPRE.spec((m: any) => m.ifdefdirective((o: any) => o.name(identified("W"))))])))))))));

  // --- python_regexp: every kind of Python's RegExp, a character with its spelling --- the text:
  // (?:a|)(?P<n>[^a-z\d]+?)(?<!b)(?P=n)\1(?(1)a|)(?>.)b*+\A(?#note)|(?i-m:\x61)$
  const character = (value: bigint) => (c: any) => c.character((v: any) => v.value(value)); // a character, by its code point
  const sequence = (...elements: unknown[]) => (a: any) => a.alternative((s: any) => s.elements(elements)); // an alternative
  const pythonRegExp = PythonRegExp.Expressions.DIALECT.spec((u: any) => u.pattern((p: any) => p.alternatives([
    sequence(
      (e: any) => e.group((g: any) => g.alternatives([sequence(character(97n)), sequence()])),
      (e: any) => e.capturinggroup((g: any) => g.name("n").alternatives([sequence(
        (q: any) => q.quantifier((r: any) => r.min(1n).greedy(false).element((k: any) => k.characterclass((c: any) => c.negate(true).elements([
          (r: any) => r.characterclassrange((n: any) => n.min(character(97n)).max(character(122n))),
          (s: any) => s.characterset((v: any) => v.setKind("digit"))])))))])),
      (e: any) => e.assertion((t: any) => t.assertionKind("lookbehind").negate(true).alternatives([sequence(character(98n))])),
      (e: any) => e.backreference((r: any) => r.ref("n")),
      (e: any) => e.backreference((r: any) => r.ref(1n)),
      (e: any) => e.conditional((c: any) => c.ref(1n).yes(sequence(character(97n))).no(sequence())),
      (e: any) => e.atomicgroup((g: any) => g.alternatives([sequence((s: any) => s.characterset((v: any) => v.setKind("any")))])),
      (e: any) => e.quantifier((q: any) => q.min(0n).possessive(true).element(character(98n))),
      (e: any) => e.assertion((t: any) => t.assertionKind("stringstart")),
      (e: any) => e.comment((c: any) => c.text("note"))),
    sequence(
      (e: any) => e.flags((f: any) => f.add("i").remove("m").alternatives([sequence(
        (c: any) => c.character((v: any) => v.raw("\\x61").value(97n)))])),
      (e: any) => e.assertion((t: any) => t.assertionKind("end")))])));

  // --- typescript_regexp: every kind of TypeScript's RegExp, a literal --- the text:
  // /(?i:a)(?<n>b{1,}?)[a-c\d][\q{x|y}&&[x]][\w--a]\p{L}\b(?=c)\k<n>|$/v
  const rxChar = (c: string) => (e: any) => e.character((h: any) => h.value(BigInt(c.codePointAt(0)!)));
  const rxSeq = (...items: unknown[]) => (e: any) => e.alternative((a: any) => a.elements(items));
  const typescriptRegExp = (u: any) => u.regexpliteral((l: any) => l.pattern((p: any) => p.pattern((q: any) => q.alternatives([
    rxSeq((e: any) => e.group((g: any) => g.modifiers((m: any) => m.modifiers((s: any) => s.add((f: any) => f.raw("i").ignoreCase(
      true)))).alternatives([rxSeq(rxChar("a"))])),
    (e: any) => e.capturinggroup((g: any) => g.name("n").alternatives([rxSeq((e: any) => e.quantifier((q: any) => q.raw(
      "b{1,}?").min(1n).greedy(false).element(rxChar("b"))))])),
    (e: any) => e.characterclass((c: any) => c.unicodeSets(true).elements([(e: any) => e.characterclassrange(
      (r: any) => r.min(rxChar("a")).max(rxChar("c"))), (e: any) => e.characterset((s: any) => s.raw("\\d").setKind(
        "digit").negate(false))])),
    (e: any) => e.expressioncharacterclass((x: any) => x.negate(false).expression((e: any) => e.classintersection(
      (i: any) => i.left((e: any) => e.classstringdisjunction((d: any) => d.alternatives([
        (e: any) => e.stringalternative((s: any) => s.elements([rxChar("x")])),
        (e: any) => e.stringalternative((s: any) => s.elements([rxChar("y")]))]))).right(
        (e: any) => e.characterclass((c: any) => c.unicodeSets(true).elements([rxChar("x")])))))),
    (e: any) => e.expressioncharacterclass((x: any) => x.expression((e: any) => e.classsubtraction((s: any) => s.left(
      (e: any) => e.characterset((t: any) => t.setKind("word"))).right((e: any) => e.character((h: any) => h.raw(
        "a").value(97n)))))),
    (e: any) => e.characterset((s: any) => s.raw("\\p{L}").setKind("property").strings(false).key(
      "General_Category").value("L")),
    (e: any) => e.assertion((a: any) => a.assertionKind("word").negate(false)),
    (e: any) => e.assertion((a: any) => a.assertionKind("lookahead").negate(false).alternatives([rxSeq(rxChar("c"))])),
    (e: any) => e.backreference((b: any) => b.raw("\\k<n>").ref("n"))),
    rxSeq((e: any) => e.assertion((a: any) => a.assertionKind("end")))]))).flags((f: any) => f.raw("v").unicodeSets(true)));

  // --- cpp_regexp: a regex of every kind but grep's list of patterns, which ECMAScript, the one grammar of the others,
  // has not: ECMAScript's, case-insensitive --- ^(a|\.)[^a-[.ch.][:alpha:][=e=]\d]{1,3}.$|(?:b)(?!c)x*?\1\b
  const XR = CppRegExp.Expressions.DIALECT;
  const char = (c: string) => (u: any) => u.character((r: any) => r.value(BigInt(c.codePointAt(0) as number)));
  const alt = (...elements: unknown[]) => (u: any) => u.alternative((r: any) => r.elements(elements));
  const cppRegexp = XR.spec((u: any) => u.regex((r: any) => r.flags(["ECMAScript", "icase"]).pattern((p: any) => p.pattern((q: any) => q.alternatives([
    alt(
      (e: any) => e.assertion((a: any) => a.assertionKind("start")),
      (e: any) => e.capturinggroup((g: any) => g.alternatives([alt(char("a")), alt(char("."))])),
      (e: any) => e.quantifier((m: any) => m.min(1n).max(3n).element((c: any) => c.characterclass((k: any) => k.negate(true).elements([
        (x: any) => x.characterclassrange((y: any) => y.min(char("a")).max((z: any) => z.collatingelement((n: any) => n.name("ch")))),
        (x: any) => x.exclass((n: any) => n.name("alpha")), (x: any) => x.equivalence((n: any) => n.name("e")),
        (x: any) => x.characterset((n: any) => n.setKind("digit"))])))),
      (e: any) => e.characterset((n: any) => n.setKind("any")), (e: any) => e.assertion((a: any) => a.assertionKind("end"))),
    alt(
      (e: any) => e.group((g: any) => g.alternatives([alt(char("b"))])),
      (e: any) => e.assertion((a: any) => a.assertionKind("lookahead").negate(true).alternatives([alt(char("c"))])),
      (e: any) => e.quantifier((m: any) => m.raw("*?").min(0n).greedy(false).element(char("x"))),
      (e: any) => e.backreference((b: any) => b.ref(1n)), (e: any) => e.assertion((a: any) => a.assertionKind("word")))])))));

  // --- invalid: a Python3 term holding an error, its recovered term within it, and a missing operand; literals with
  // their spelling, one whose text is invalid holding no value but its problem --- 0x10 + (x +* 1) + 08 - <missing>
  // (a binop's operands are Python3's terms, written in its union)
  const invalid = P.binop("-", P.binop("+", P.binop("+", (e: any) => e.literal(
    (r: any) => r.value((p: any) => p.as_scalar(16n)).text("0x10")), (e: any) => e.error(
    (r: any) => r.text("(x +* 1)").terms([P.name("x"), P.constant(1n)]))), (e: any) => e.literal(
    (r: any) => r.text("08").problems(["leading zeros in a decimal integer literal are not permitted"]))),
  (e: any) => e.missing((r: any) => r.kind("expression")));

  const terms = store.transaction(() => new Map<string, any>(([
    ["expression", expression], ["python3", python3], ["matlab", matlab], ["excel", excel], ["latex", latex],
    ["collections", collections], ["c", c], ["cpp", cpp], ["systemverilog", systemverilog],
    ["typescript5", TS.DIALECT.spec(typescript5)], ["invalid", invalid], ["systemverilog_patterns", patterns],
    ["systemverilog_assertions", assertions], ["systemverilog_constraints", constraints],
    ["systemverilog_preprocessor", preprocessor], ["python_types", pythonTypes], ["python_patterns", pythonPatterns],
    ["typescript_types", TypeScriptTypes.Expressions.DIALECT.spec(typescriptTypes)],
    ["typescript_patterns", TypeScriptPatterns.Expressions.DIALECT.spec(typescriptPatterns)],
    ["c_types", enumeration(CT, CE)], ["cpp_types", enumeration(XT, CPP)], ["c_preprocessor", cPreprocessor],
    ["python_regexp", pythonRegExp], ["typescript_regexp", TypeScriptRegExp.Expressions.DIALECT.spec(typescriptRegExp)],
    ["cpp_regexp", cppRegexp],
  ] as [string, Framework.Terms.Writer][]).map(([name, writer]) => [name, store.Expressions.Framework.Term(writer)])));
  terms.set("domains", defined.get("dialect"));
  for (const [name, dialect] of stored) terms.set(name, dialect);
  for (const [name, [path, designation]] of STANDARD) { // an edition, by its path
    terms.set(name, store.singleton(path).standards({ designation }));
  }
  const [Term, Standard] = [store.registered("Expressions.Framework.Term"),
    store.registered("Expressions.Framework.Standard")];
  return new Map<string, Case>(CASES.map((name) => [name, [
    DOMAINS.has(name) ? store.registered(`${DOMAINS.get(name)}.Dialect`) : STANDARD.has(name) ? Standard : Term,
    terms.get(name), store]]));
}
