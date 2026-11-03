/**
 * The conformance corpus: the same cases, built statement for statement in every implementation.
 *
 * `build()` returns the cases, name -> [root schema, root, store]: each case but `domains` a term value of
 * `Expressions.Framework.Term`, its dialect then its kind, built in one store holding the framework's install and every
 * dialect's, written nested. `DIALECTS` names the dialect that reads each case other than Patterns'. The `domains` case
 * is data: Patterns' dialect, the singleton `Expressions.Patterns` (`Expressions.Patterns.Dialect`), naming its
 * operations and owning its domains by name, a packed one among them, written as one document. The `invalid` case is a
 * Python3 term holding invalid syntax and literals with their spelling; the `typescript5` case a TypeScript5 term of every
 * kind, written through the builders. Each implementation writes its
 * snapshots to `conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other
 * implementation's files (see the CONF test suite). Keep record module and `python3/mbse/Expressions/Conformance/Corpus.py`
 * in lockstep: same cases, same values, same order of statements.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Builders } from "@mbse/schemas/Framework";

import * as C from "../Dialects/C/index.js";
import * as Cpp from "../Dialects/Cpp/index.js";
import * as Excel from "../Dialects/Excel/index.js";
import * as Latex from "../Dialects/Latex/index.js";
import * as Matlab from "../Dialects/Matlab/index.js";
import * as Expressions from "../Dialects/Patterns/Expressions.js";
import * as Patterns from "../Dialects/Patterns/index.js";
import * as Python3 from "../Dialects/Python3/index.js";
import * as SystemVerilog from "../Dialects/SystemVerilog/index.js";
import * as TypeScript5 from "../Dialects/TypeScript5/index.js";
import * as Framework from "../Framework/index.js";
import type * as Terms from "../Framework/Terms.js";

const [CE, CPP, X, L, M, P] = [C.Expressions, Cpp.Expressions, Excel.Expressions, Latex.Expressions, Matlab.Expressions,
  Python3.Expressions];
const SV = SystemVerilog.Expressions;
const TS = TypeScript5.Expressions;

export const CASES = ["expression", "python3", "matlab", "excel", "latex", "domains", "collections", "c", "cpp",
  "systemverilog", "typescript5", "invalid"] as const;

/** The dialect that reads each case, where it is not Patterns. */
export const DIALECTS: ReadonlyMap<string, Terms.Dialect> = new Map([
  ["python3", P.DIALECT], ["matlab", M.DIALECT], ["excel", X.DIALECT], ["latex", L.DIALECT], ["c", CE.DIALECT],
  ["cpp", CPP.DIALECT], ["systemverilog", SV.DIALECT], ["typescript5", TS.DIALECT],
  ["invalid", P.DIALECT],
]);

/** A case: its root schema, its root term, and the store it is built in. */
export type Case = [any, any, any];

export function build(): Map<string, Case> {
  const E = Expressions;
  const store: any = new Builders.Store();
  store.transaction(Framework.install);
  store.transaction(Patterns.install);
  store.transaction(Python3.install);
  store.transaction(Matlab.install);
  store.transaction(Excel.install);
  store.transaction(Latex.install);
  store.transaction(C.install);
  store.transaction(Cpp.install);
  store.transaction(SystemVerilog.install);
  store.transaction(TypeScript5.install);
  const defined = store.transaction(Patterns.define)[0]; // Patterns' dialect, its operations and its domains

  // --- domains: Patterns' dialect, its operations by name and its domains, owned by name; an enum and a domain packing it
  // into uint8 added ---
  store.transaction(() => {
    const state = store.Expressions.Framework.Domain((d: any) => d.kind((k: any) => k.as_value((a: any) => a.as_union(
      (u: any) => u.enum((e: any) => e.members(["IDLE", "RUN"]))))));
    const mode = store.Expressions.Framework.Domain((d: any) => d.kind((k: any) => k.as_value((a: any) => a.as_union(
      (u: any) => u.packed((e: any) => e.codes([0n, 1n]))))).packs((a: any) => a.insert(
      (e: any) => e.domain(state).representation(defined.get("uint8")))));
    store.Expressions.Patterns.Dialect(defined.get("dialect"), (b: any) => b.domains({
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

  // --- c: every kind, typed constants and a shared identifier --- !record.a && record->b[0] > 1.5f ? (uint8_t)f(1) : 5u
  const me = CE.identifier("record");
  const c = CE.conditional(CE.binary("&&", CE.unary("!", CE.member(me, "a")), CE.binary(
    ">", CE.subscript(CE.member(me, "b", "->"), 0n), CE.constant(1.5, "float"))),
    CE.cast("uint8_t", CE.call("f", 1n)), CE.constant(5n, "unsigned int"));

  // --- cpp: C's kinds, as C++'s terms --- !record.a && record->b[0] > 1.5f ? (uint8_t)f(1) : 5u
  const meCpp = CPP.identifier("record");
  const cpp = CPP.conditional(CPP.binary("&&", CPP.unary("!", CPP.member(meCpp, "a")), CPP.binary(
    ">", CPP.subscript(CPP.member(meCpp, "b", "->"), 0n), CPP.constant(1.5, "float"))),
    CPP.cast("uint8_t", CPP.call("f", 1n)), CPP.constant(5n, "unsigned int"));

  // --- systemverilog: every kind, sized vectors and casts, and a shared identifier ---
  // record.a inside {1, [2:5]} -> !record[0] ? {{6{2'b10}}, record.b[7:4]} : byte'($clog2(record.unique().sum(q) with (q))) + 4'(8'shff)
  const [sv, that] = [SV, SV.identifier("record")];
  const systemverilog = sv.binary("->", sv.inside(sv.member(that, "a"), 1n, sv.span(2n, 5n)), sv.conditional(
    sv.unary("!", sv.select(that, 0n)),
    sv.concatenation(sv.replication(6n, sv.vector("10")), sv.range_(sv.member(that, "b"), 7n, 4n)),
    sv.binary("+", sv.cast("byte", sv.call("$clog2", sv.iterate(sv.method(that, "unique"), "sum", "q", sv.identifier("q")))),
      sv.cast(4n, sv.vector("11111111", true, "h")))));

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
    ["typescript5", TS.DIALECT.spec(typescript5)], ["invalid", invalid],
  ] as [string, Framework.Terms.Writer][]).map(([name, writer]) => [name, store.Expressions.Framework.Term(writer)])));
  terms.set("domains", defined.get("dialect"));
  const [Term, Dialect] = [store.registered("Expressions.Framework.Term"), store.registered("Expressions.Patterns.Dialect")];
  return new Map<string, Case>(CASES.map((name) => [name, [name === "domains" ? Dialect : Term, terms.get(name), store]]));
}
