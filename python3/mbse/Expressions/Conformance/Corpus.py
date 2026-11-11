"""The conformance corpus: the same cases, built statement for statement in every implementation.

`build()` returns `{case: (root schema, root, store)}`: each case but the data cases a term value of
`Expressions.Framework.Term`, its dialect then its kind, built in one store holding the framework's install and every
dialect's, and each dialect's `define`, written nested. `DIALECTS` names the dialect that reads each case other than
Patterns'. The `domains` case and the `<dialect>_domains` cases are data (`DOMAINS`): each a dialect's singleton, owning
its domains by name, each kind its dialect's then its own, and the editions of the standards it covers by designation,
written as one document; `domains` is ISO/IEC 11404's dialect, the singleton `Expressions.ISOIEC11404.Expressions`
(`Expressions.ISOIEC11404.Expressions.Dialect`), an enum and a packed one among its domains. The `standards` case is
data too (`STANDARD`): an edition, C23's, ISO/IEC 9899:2024, written as one document of
`Expressions.Framework.Standard`, its formal reference's parts, its common name and the kinds it has. The `typescript5`
case is a TypeScript5 term of every kind, written through the builders. The `invalid` case is a Python3 term holding
invalid syntax and literals with their spelling. The `systemverilog_patterns`, `systemverilog_assertions`,
`systemverilog_constraints` and `systemverilog_preprocessor` cases are each a term of SystemVerilog's sublanguage of every
kind, written through the builders. Each implementation writes its snapshots to
`conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files (see
the CONF test suite). Keep this module and `typescript5/src/Conformance/Corpus.ts` in lockstep: same cases, same values,
same order of statements. """

from __future__ import annotations

from mbse.Expressions import Framework
from mbse.Expressions.C import Expressions as C
from mbse.Expressions.Cpp import Expressions as Cpp
from mbse.Expressions.Excel import Expressions as Excel
from mbse.Expressions.LaTeX import Expressions as Latex
from mbse.Expressions.MATLAB import Expressions as Matlab
from mbse.Expressions.Patterns import Expressions as Patterns
from mbse.Expressions.IEEE1164 import Expressions as IEEE1164
from mbse.Expressions.IEEE754 import Expressions as IEEE754
from mbse.Expressions.ISOIEC11404 import Expressions as ISOIEC11404
from mbse.Expressions.Python import Python3
from mbse.Expressions.Arm import AAPCS64
from mbse.Expressions.SystemV import AMD64
from mbse.Expressions.Unicode import Expressions as Unicode
from mbse.Expressions.SystemVerilog import Assertions as SVAssertions, Constraints as SVConstraints, \
    Expressions as SystemVerilog, Patterns as SVPatterns, Preprocessor as SVPreprocessor, Types as SVTypes
from mbse.Expressions.TypeScript import TypeScript5
from mbse.Expressions.C import Preprocessor as CPreprocessor, Types as CTypes  # the retrofit's new dialects, skeletons yet
from mbse.Expressions.Cpp import Types as CppTypes
from mbse.Expressions.Python import Patterns as PythonPatterns, Types as PythonTypes
from mbse.Expressions.TypeScript import Patterns as TypeScriptPatterns, Types as TypeScriptTypes
from mbse.Expressions.C.Expressions import Expressions as CE
from mbse.Expressions.Cpp.Expressions import Expressions as CPP
from mbse.Expressions.Excel.Expressions import Expressions as X
from mbse.Expressions.LaTeX.Expressions import Expressions as L
from mbse.Expressions.MATLAB.Expressions import Expressions as M
from mbse.Expressions.Patterns.Expressions import Expressions
from mbse.Expressions.Python.Python3 import Expressions as P
from mbse.Expressions.SystemVerilog.Expressions import Expressions as SV
from mbse.Expressions.TypeScript.TypeScript5 import Expressions as TS
from mbse.Schemas.Framework import Builders

CASES = ["expression", "python3", "matlab", "excel", "latex", "domains", "collections", "c", "cpp", "systemverilog",
         "typescript5", "invalid", "systemverilog_patterns", "systemverilog_assertions", "systemverilog_constraints",
         "systemverilog_preprocessor", "systemverilog_domains", "python3_domains", "typescript5_domains", "matlab_domains",
         "excel_domains", "c_domains", "cpp_domains", "amd64_domains", "aapcs64_domains", "standards"]

DIALECTS = {"python3": P.DIALECT, "matlab": M.DIALECT, "excel": X.DIALECT, "latex": L.DIALECT, "c": CE.DIALECT,
            "cpp": CPP.DIALECT, "systemverilog": SV.DIALECT, "typescript5": TS.DIALECT, "invalid": P.DIALECT,
            "systemverilog_patterns": SVPatterns.Expressions.DIALECT, "systemverilog_assertions": SVAssertions.Expressions.DIALECT,
            "systemverilog_constraints": SVConstraints.Expressions.DIALECT,
            "systemverilog_preprocessor": SVPreprocessor.Expressions.DIALECT}
"""The dialect that reads each case, where it is not Patterns."""

DOMAINS = {"domains": "Expressions.ISOIEC11404.Expressions", "systemverilog_domains": "Expressions.SystemVerilog.Expressions",
           "python3_domains": "Expressions.Python.Python3", "typescript5_domains": "Expressions.TypeScript.TypeScript5",
           "matlab_domains": "Expressions.MATLAB.Expressions", "excel_domains": "Expressions.Excel.Expressions",
           "c_domains": "Expressions.C.Expressions", "cpp_domains": "Expressions.Cpp.Expressions",
           "amd64_domains": "Expressions.SystemV.AMD64", "aapcs64_domains": "Expressions.Arm.AAPCS64"}
"""The cases that are data, not terms: each a dialect's singleton, by its path, written as one document of its schema,
the path's `Dialect`."""

STANDARD = {"standards": ("Expressions.C.Expressions", "ISO/IEC 9899:2024")}
"""The case that is an edition of a standard: its dialect, by its path, and its designation, written as one document of
`Expressions.Framework.Standard`."""

def build():
    E = Expressions
    store = Builders.Store()
    store.transaction(Framework.install)
    store.transaction(ISOIEC11404.install)  # the standard dialects, before the dialects that use them
    store.transaction(IEEE754.install)
    store.transaction(IEEE1164.install)
    store.transaction(Unicode.install)
    store.transaction(Patterns.install)
    store.transaction(Python3.install)
    store.transaction(Matlab.install)
    store.transaction(Excel.install)
    store.transaction(Latex.install)
    store.transaction(C.install)
    store.transaction(Cpp.install)
    store.transaction(AMD64.install)  # the ABIs a C or C++ term's holder names
    store.transaction(AAPCS64.install)
    for module in (SystemVerilog, SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor):  # its family
        store.transaction(module.install)
    store.transaction(TypeScript5.install)
    for module in (PythonTypes, PythonPatterns, TypeScriptTypes, TypeScriptPatterns, CTypes, CppTypes, CPreprocessor):
        store.transaction(module.install)  # the retrofit's new dialects, each after its family's
    defined = store.transaction(ISOIEC11404.define)[0]  # ISO/IEC 11404's dialect and its domains
    stored = {case: store.transaction(module.define)[0]["dialect"] for case, module in [  # each dialect's stored domains
        ("systemverilog_domains", SystemVerilog), ("python3_domains", Python3), ("typescript5_domains", TypeScript5),
        ("matlab_domains", Matlab), ("excel_domains", Excel), ("c_domains", C), ("cpp_domains", Cpp),
        ("amd64_domains", AMD64), ("aapcs64_domains", AAPCS64)]}
    for module in (SVTypes, SVPatterns, SVAssertions, SVConstraints, SVPreprocessor):  # the editions they cover
        store.transaction(module.define)
    for module in (PythonTypes, PythonPatterns, TypeScriptTypes, TypeScriptPatterns, CTypes, CppTypes, CPreprocessor):
        store.transaction(module.define)  # their data, none yet

    # --- domains: ISO/IEC 11404's dialect and its domains, owned by name; a state domain and a domain packing it into octet
    # added ---
    with store.transaction():
        state = store.Expressions.Framework.Domain(lambda d: d.kind(lambda k: k.as_value(lambda a: a.as_union(
            lambda u: u.isoiec11404(lambda v: v.state(lambda e: e.members(["IDLE", "RUN"]).ordered(False)))))))
        mode = store.Expressions.Framework.Domain(lambda d: d.kind(lambda k: k.as_value(lambda a: a.as_union(
            lambda u: u.isoiec11404(lambda v: v.packed(lambda e: e.codes([0, 1]).ordered(True)))))).packs(lambda a: a.insert(
            lambda e: e.domain(state).representation(defined["octet"]))))
        store.Expressions.ISOIEC11404.Expressions.Dialect(defined["dialect"], lambda b: b.domains({
            "state": lambda e: e.domain(state), "mode": lambda e: e.domain(mode)}))

    # --- expression: every kind and literal type, a let and its variable, a list ---
    record, age = E.variable("record"), E.variable("age")
    expression = E.let_("age", record.age, age.ge(18).and_(
        age.lt(65.5).or_(record.has("email").not_()).implies(E.literal(b"\x00\xff").in_(E.list_("x", True)))))

    # --- python3: every kind, a let and its names, a literal with its spelling --- import numpy as np / from math import
    # floor / (lambda a: floor(a.x * 2.5, *[a], k=..., **a) if not a['k'] >= 18 < 0x10 or np.pi or (n := None) else
    # np.stack((p[b'\x00'] for p in a.y if p), [p async for p, *q in a], {p for p in a}, {p: 2j for p in a},
    # {{'k': 1, **a}}, lambda b, **c: b @ a, a[1::-1, :], (yield a), (yield from a), await a, 'x' f'y{a!r:>{p}}', t'{a}',
    # (a)))(record)
    a, item, b = P.name("a"), P.name("p"), P.name("b")
    spelled = lambda t: t.literal(lambda r: r.value(lambda v: v.as_scalar(16)).text("0x10").base(16))  # noqa: E731
    python3 = P.import_("numpy", P.importfrom("math", "floor", P.let_("a", P.name("record"), P.ifexp(
        P.boolop("or", P.unaryop("not", P.compare(">=", P.subscript(a, "k"), 18, ("<", spelled))), P.attribute(P.name("np"), "pi"),
                 P.namedexpr("n", P.constant(None))),
        P.call("floor", P.binop("*", P.attribute(a, "x"), 2.5), P.starred(P.list_(a)), P.keyword("k", P.constant(...)),
               P.keyword(None, a)),
        P.call(P.attribute(P.name("np"), "stack"),
               P.generatorexp(P.subscript(item, b"\x00"), P.comprehension("p", P.attribute(a, "y"), (item,))),
               P.listcomp(item, P.comprehension(P.tuple_(item, P.starred(P.name("q"))), a, (), True)),
               P.setcomp(item, P.comprehension("p", a)), P.dictcomp(item, P.constant(2j), P.comprehension("p", a)),
               P.set_(P.dict_(("k", 1), (None, a))), P.lambda_(P.binop("@", b, a), ("b",), kwarg="c"),
               P.subscript(a, P.tuple_(P.slice_(1, None, -1), P.slice_())), P.yield_(a), P.yieldfrom(a), P.await_(a),
               P.concatenatedstring("x", P.joinedstr(("y", P.formattedvalue(a, "r", (">", P.formattedvalue(item)))))),
               P.templatestr((P.interpolation(a),)), P.parenthesized(a))))), alias="np")

    # --- matlab: every kind, shared identifiers --- import geo.* / (dist(record.age, 3) + ~isfield(record, "email") .* -1.5
    # >= arrayfun(@(k) k, record.ports)(2)) || true
    record_ = M.identifier("record")
    matlab = M.import_("geo.*", M.binary("||", M.binary(">=", M.binary(
        "+", M.call("dist", M.field(record_, "age"), 3),
        M.binary(".*", M.unary("~", M.call("isfield", record_, "email")), M.unary("-", 1.5))), M.index(M.arrayfun(
            "k", M.field(record_, "ports"), M.identifier("k")), 2)), True))

    # --- excel: every kind, shared names --- =LET(a, record.age, IF(AND(a >= 18, NOT(ISERROR(record.email))),
    # a * SUM(MAP(record.ports, LAMBDA(q, q))) - Sheet1!B2, -[Book.xlsx]Rates!C3 + "x"))
    record_, a = X.name("record"), X.name("a")
    excel = X.let_("a", X.field(record_, "age"), X.function(
        "IF", X.function("AND", X.infix(">=", a, 18), X.function("NOT", X.function("ISERROR", X.field(record_, "email")))),
        X.infix("-", X.infix("*", a, X.function("SUM", X.map_("q", X.field(record_, "ports"), X.name("q")))), X.cell("B2", "Sheet1")),
        X.infix("+", X.prefix("-", X.cell("C3", "Rates", "Book.xlsx")), "x")))

    # --- latex: every kind, shared symbols --- a \geq 18 \land (\lnot \operatorname{has}(record, email) \lor
    # \frac{a}{2} > 1.5) \quad \text{where } a = record.age
    record_, a = L.symbol("record"), L.symbol("a")
    latex = L.where("a", L.member(record_, "age"), L.binary("\\land", L.binary("\\geq", a, 18), L.binary(
        "\\lor", L.unary("\\lnot", L.function("has", record_, "email")), L.binary(">", L.frac(a, 2), 1.5))))

    # --- collections: a quantifier over entries, collection operations and a mapping, each once ---
    ports, p, pins, sizes = (E.variable(name) for name in ("ports", "p", "pins", "sizes"))
    collections = E.let_("ports", record.entries("ports"), ports.all("p", p.get("pin").in_(pins)).and_(
        sizes.sum().le(E.mapping(("most", ports.count()), ("least", 0)).item("most"))))

    # --- c: every kind, written through the builders and its writers, typed literals, a literal with its spelling and a
    # shared identifier --- the text ToText writes: {!record.a && record->b[0] > 1.5f ? (uint8_t)record(1) : 5u, nullptr,
    # "a" "b", (record), _Generic(record, int: 1, default: 0x0), record++, sizeof(int), _Alignof(record), record += 1,
    # .x[0] = record, (int[]){1}, ({}), __extension__ record}
    me = CE.identifier("record")
    name = lambda spelling: lambda n: n.identifier(lambda i: i.spelling(spelling))  # noqa: E731
    uint8 = lambda t: t.typeid(lambda i: i.specifiers([lambda s: s.namedtypespecifier(lambda n: n.name(name("uint8_t")))]))  # noqa: E731
    c_int = lambda t: t.typeid(lambda i: i.specifiers([lambda s: s.primitivetypespecifier(lambda k: k.keyword("int"))]))  # noqa: E731
    c = CE.DIALECT.spec(lambda u: u.initializerlist(lambda r: r.items([
        CE.conditional(CE.binary("&&", CE.unary("!", CE.member(me, "a")), CE.binary(">", CE.subscript(CE.member(me, "b", "->"), 0),
                                                                                   CE.literal(1.5, "f"))), CE.cast(uint8, CE.call("record", 1)), CE.literal(5, "u")),
        lambda i: i.constant(lambda k: k.singleton("nullptr")),
        lambda i: i.concatenatedstring(lambda k: k.parts([CE.literal("a"), CE.literal("b")])),
        lambda i: i.parenthesizedexpression(lambda k: k.expression(me)),
        lambda i: i.genericselection(lambda g: g.controlling(me).associations([
            lambda a: a.type(c_int).value(CE.literal(1)), lambda a: a.value(lambda v: v.literal(
                lambda li: li.value(lambda n: n.as_scalar(0)).text("0x0").base(16)))])),
        lambda i: i.postfixexpression(lambda k: k.operand(me).operator("++")),
        lambda i: i.sizeofexpression(lambda k: k.operand(c_int)),
        lambda i: i.alignofexpression(lambda k: k.keyword("_Alignof").operand(me)),
        lambda i: i.assignmentexpression(lambda a: a.left(me).operator("+=").right(CE.literal(1))),
        lambda i: i.designatedinitializer(lambda d: d.designators([lambda g: g.fielddesignator(lambda f: f.name(lambda i: i.spelling("x"))),
                                                                    lambda g: g.indexdesignator(lambda f: f.index(CE.literal(0)))]).initializer(
            lambda g: g.equalinitializer(lambda e: e.value(me)))),
        lambda i: i.compoundliteralexpression(lambda k: k.type(lambda t: t.typeid(lambda y: y.specifiers([
            lambda s: s.primitivetypespecifier(lambda p: p.keyword("int"))]).declarator(lambda d: d.arraydeclarator(lambda a: a)))).initializer(
            lambda li: li.items([CE.literal(1)]))),
        lambda i: i.statementexpression(lambda k: k),
        lambda i: i.extensionexpression(lambda k: k.operand(me)),
    ])))

    # --- cpp: every kind, written through the builders and its writers, a C++ name, a lambda, a requires expression and a
    # shared identifier --- the text ToText writes: {!record.a && record->b[0] > 1.5f ? (uint8_t)record(1) : 5u, nullptr,
    # 10_km, "a" R"(b)", std::cout, this, (record), [=, &record, n = 1](auto y) {}, (record + ...), requires (int z) {
    # z + 1; }, int(record), record--, static_cast<int>(record), typeid(record), co_await record, sizeof(int), sizeof...(Ts),
    # alignof(int), noexcept(record), new int{1}, delete[] record, record = 0, throw, co_yield record, record..., .x =
    # record, ({}), __extension__ record}
    cpp_me = CPP.identifier("record")
    cpp = CPP.DIALECT.spec(lambda u: u.initializerlist(lambda r: r.items([
        CPP.conditional(CPP.binary("&&", CPP.unary("!", CPP.member(cpp_me, "a")), CPP.binary(">", CPP.subscript(CPP.member(cpp_me, "b", "->"), 0),
                                                                                     CPP.literal(1.5, "f"))), CPP.cast(uint8, CPP.call("record", 1)), CPP.literal(5, "u")),
        lambda i: i.constant(lambda k: k.singleton("nullptr")),
        lambda i: i.userdefinedliteral(lambda d: d.literal(lambda li: li.value(lambda v: v.as_scalar(10))).suffix("_km")),
        lambda i: i.concatenatedstring(lambda k: k.parts([CPP.literal("a"), lambda x: x.literal(lambda li: li.value(lambda v: v.as_scalar("b")).raw(True))])),
        lambda i: i.idexpression(lambda d: d.name(lambda n: n.qualifiedname(lambda q: q.qualifiers([name("std")]).name(name("cout"))))),
        lambda i: i.thisexpression(lambda k: k),
        lambda i: i.parenthesizedexpression(lambda k: k.expression(cpp_me)),
        lambda i: i.lambdaexpression(lambda la: la.captures([lambda k: k.defaultcapture(lambda d: d.mode("=")),
                                                             lambda k: k.simplecapture(lambda s: s.by_reference(True).name(lambda i: i.spelling("record"))),
                                                             lambda k: k.initcapture(lambda s: s.name(name("n")).initializer(
                                                                 lambda x: x.equalinitializer(lambda e: e.value(CPP.literal(1)))))]).declarator(
            lambda d: d.parameters([lambda q: q.parameterdeclaration(lambda pd: pd.specifiers([lambda s: s.placeholdertypespecifier(lambda h: h)]).declarator(
                lambda dd: dd.iddeclarator(lambda i2: i2.name(name("y")))))]))),
        lambda i: i.foldexpression(lambda f: f.left(cpp_me).operator("+")),
        lambda i: i.requiresexpression(lambda q: q.parameters([lambda a: a.parameterdeclaration(lambda pd: pd.specifiers([
            lambda s: s.primitivetypespecifier(lambda k: k.keyword("int"))]).declarator(lambda dd: dd.iddeclarator(lambda i2: i2.name(name("z")))))]).requirements([
            lambda r2: r2.simplerequirement(lambda s: s.expression(CPP.binary("+", CPP.identifier("z"), 1)))])),
        lambda i: i.functionalcastexpression(lambda f: f.type(lambda s: s.primitivetypespecifier(lambda k: k.keyword("int"))).initializer(
            lambda x: x.parenthesizedinitializer(lambda pi: pi.arguments([cpp_me])))),
        lambda i: i.postfixexpression(lambda x: x.operand(cpp_me).operator("--")),
        lambda i: i.namedcastexpression(lambda n: n.operator("static_cast").type(c_int).operand(cpp_me)),
        lambda i: i.typeidexpression(lambda t: t.operand(cpp_me)),
        lambda i: i.awaitexpression(lambda a: a.operand(cpp_me)),
        lambda i: i.sizeofexpression(lambda s: s.operand(c_int)),
        lambda i: i.sizeofpackexpression(lambda s: s.pack(lambda i: i.spelling("Ts"))),
        lambda i: i.alignofexpression(lambda s: s.keyword("alignof").operand(c_int)),
        lambda i: i.noexceptexpression(lambda s: s.operand(cpp_me)),
        lambda i: i.newexpression(lambda n: n.type(c_int).initializer(lambda x: x.initializerlist(lambda il: il.items([CPP.literal(1)])))),
        lambda i: i.deleteexpression(lambda d: d.array(True).operand(cpp_me)),
        lambda i: i.assignmentexpression(lambda a: a.left(cpp_me).operator("=").right(CPP.literal(0))),
        lambda i: i.throwexpression(lambda t: t),
        lambda i: i.yieldexpression(lambda y: y.operand(cpp_me)),
        lambda i: i.packexpansion(lambda x: x.pattern(cpp_me)),
        lambda i: i.designatedinitializer(lambda d: d.designators([lambda x: x.fielddesignator(lambda f: f.name(lambda i: i.spelling("x")))]).initializer(
            lambda x: x.equalinitializer(lambda e: e.value(cpp_me)))),
        lambda i: i.statementexpression(lambda s: s),
        lambda i: i.extensionexpression(lambda e: e.operand(cpp_me)),
    ])))

    # --- systemverilog: every kind of SystemVerilog's and of its Types, their helpers, the Preprocessor's macro usage,
    # literals with their spelling, and a shared identifier --- the text ToText writes:
    # record.a inside {1, [2:5]} -> (record matches 3 ? (* keep, depth = 2 *) 'h1f : 4'sb10x1) + {record[0], record.b[7:4],
    # -record, record++, (record += 1), {2{record}}, logic signed [7:0][4]'{record: 1, default: 0}, '{2{record, 1}}, this,
    # super, pkg::c #(8)::new(1, .n(record), ), super.new(default), new record, new[4](record), record.randomize() with
    # (a) { record < 5; }, record.sum(q) with (q > 0), record (* pure *) (record, .n(record), ), $bits(int, real, string,
    # pkg::word_t [3:0], virtual interface bus #(8).mp, signed, struct packed signed { rand bit [1:0] a[], b = 1; },
    # enum int {A, B[2] = 1, C[0:1]}, type(record), logic [int][*][$][$:8]), $clog2(record), signed'(record), 8'(record),
    # byte'(record), $, $root, {}, 1:2:3, tagged Valid record, record matches 1 &&& record, {<< byte {record with
    # [0 +: 2]}}, local::y, $unit::z, bus.t, port.m, `WIDTH, `MAX(a, b), '1, null, 'hx, 1.5, """s""", 10ns, 1_000, "a\"b"}
    sv, that = SV, SV.identifier("record")
    identifier = lambda spelling: lambda i: i.spelling(spelling)  # noqa: E731: an identifier, of its spelling
    atom = lambda keyword: lambda t: t.integeratomtype(lambda a: a.keyword(keyword))  # noqa: E731: `int`, a Types term
    keep = [lambda a: a.specs([lambda s: s.name(identifier("keep")), lambda s: s.name(identifier("depth")).value(sv.literal(2))])]
    systemverilog = sv.binary("->", sv.inside(sv.member(that, "a"), 1, sv.span(2, 5)), sv.binary("+", lambda u: u.parenthesizedexpression(
        lambda p: p.expression(lambda e: e.conditionalexpression(lambda c: c.condition(
            lambda m: m.matchesexpression(lambda x: x.value(that).pattern(sv.literal(3)))).attributes(keep).consequence(
            lambda q: q.literal(lambda r: r.value(lambda v: v.as_scalar(31)).base("h"))).alternative(sv.vector("10x1", True))))),
        sv.concatenation(
            sv.select(that, 0), sv.range_(sv.member(that, "b"), 7, 4), sv.unary("-", that),
            lambda u: u.incrementexpression(lambda i: i.operator("++").postfix(True).operand(that)),
            lambda u: u.parenthesizedexpression(lambda p: p.expression(
                lambda e: e.assignmentexpression(lambda a: a.target(that).operator("+=").value(sv.literal(1))))),
            sv.replication(2, that),
            lambda u: u.assignmentpattern(lambda a: a.type(lambda t: t.integervectortype(lambda v: v.keyword("logic").signing("signed").dimensions([
                lambda d: d.rangedimension(lambda r: r.left(sv.literal(7)).right(sv.literal(0))),
                lambda d: d.sizedimension(lambda z: z.size(sv.literal(4)))]))).items([
                lambda i: i.patternitem(lambda p: p.key(that).value(sv.literal(1))),
                lambda i: i.patternitem(lambda p: p.value(sv.literal(0)))])),
            lambda u: u.assignmentpattern(lambda a: a.count(sv.literal(2)).items([that, sv.literal(1)])),
            lambda u: u.thisexpression(lambda t: t), lambda u: u.superexpression(lambda t: t),
            lambda u: u.newexpression(lambda n: n.scope(lambda s: s.scopedname(lambda c: c.scope(lambda x: x.identifier(identifier("pkg"))).name(
                lambda x: x.parameterizedname(lambda q: q.name(identifier("c")).parameters([sv.literal(8)]))))).arguments([
                sv.literal(1), lambda a: a.namedconnection(lambda c: c.name(identifier("n")).value(that)),
                lambda a: a.emptyargument(lambda e: e)])),
            lambda u: u.newexpression(lambda n: n.scope(lambda s: s.superexpression(lambda x: x)).defaulted(True)),
            lambda u: u.newcopyexpression(lambda n: n.value(that)),
            lambda u: u.newarrayexpression(lambda n: n.size(sv.literal(4)).value(that)),
            lambda u: u.randomizewithexpression(lambda r: r.call(sv.method(that, "randomize")).restricted(True).variables(
                [identifier("a")]).items([sv.binary("<", that, 5)])),
            sv.iterate(that, "sum", "q", sv.binary(">", sv.identifier("q"), 0)),
            lambda u: u.callexpression(lambda c: c.callee(that).attributes([lambda a: a.specs([lambda s: s.name(identifier("pure"))])]).arguments([
                that, lambda a: a.namedconnection(lambda n: n.name(identifier("n")).value(that)), lambda a: a.emptyargument(lambda e: e)])),
            lambda u: u.systemcall(lambda c: c.name("$bits").arguments([
                atom("int"), lambda t: t.nonintegertype(lambda n: n.keyword("real")), lambda t: t.keywordtype(lambda k: k.keyword("string")),
                lambda t: t.namedtype(lambda n: n.name(lambda x: x.scopedname(lambda c: c.scope(lambda y: y.identifier(identifier("pkg"))).name(
                    lambda y: y.identifier(identifier("word_t"))))).dimensions([lambda d: d.rangedimension(lambda r: r.left(sv.literal(3)).right(sv.literal(0)))])),
                lambda t: t.virtualinterfacetype(lambda v: v.interface_keyword(True).interface(identifier("bus")).parameters([sv.literal(8)]).modport(identifier("mp"))),
                lambda t: t.implicittype(lambda i: i.signing("signed")),
                lambda t: t.structtype(lambda s: s.keyword("struct").packed(True).signing("signed").members([lambda m: m.random("rand").type(
                    lambda t: t.integervectortype(lambda v: v.keyword("bit").dimensions([lambda d: d.rangedimension(lambda r: r.left(sv.literal(1)).right(sv.literal(0)))]))).declarators([
                    lambda d: d.name(identifier("a")).dimensions([lambda x: x.unsizeddimension(lambda y: y)]), lambda d: d.name(identifier("b")).value(sv.literal(1))])])),
                lambda t: t.enumtype(lambda e: e.base(atom("int")).members([lambda m: m.name(identifier("A")), lambda m: m.name(identifier("B")).left(sv.literal(2)).value(sv.literal(1)),
                                                                            lambda m: m.name(identifier("C")).left(sv.literal(0)).right(sv.literal(1))])),
                lambda t: t.typereference(lambda r: r.operand(that)),
                lambda t: t.integervectortype(lambda v: v.keyword("logic").dimensions([lambda d: d.associativedimension(lambda a: a.type(atom("int"))),
                    lambda d: d.associativedimension(lambda a: a), lambda d: d.queuedimension(lambda q: q), lambda d: d.queuedimension(lambda q: q.bound(sv.literal(8)))]))])),
            sv.call("$clog2", that),
            sv.cast(lambda t: t.implicittype(lambda i: i.signing("signed")), that), sv.cast(8, that), sv.cast(atom("byte"), that),
            lambda u: u.dollarexpression(lambda d: d), lambda u: u.rootexpression(lambda r: r), lambda u: u.emptyqueue(lambda e: e),
            lambda u: u.mintypmaxexpression(lambda m: m.min(sv.literal(1)).typ(sv.literal(2)).max(sv.literal(3))),
            lambda u: u.taggedexpression(lambda t: t.member(identifier("Valid")).value(that)),
            lambda u: u.predicateexpression(lambda p: p.conditions([lambda c: c.matchesexpression(lambda m: m.value(that).pattern(sv.literal(1))), that])),
            lambda u: u.streamingconcatenation(lambda s: s.operator("<<").slice(atom("byte")).items([
                lambda i: i.expression(that).left(sv.literal(0)).operator("+:").right(sv.literal(2))])),
            lambda u: u.nameexpression(lambda n: n.name(lambda x: x.localname(lambda l: l.name(identifier("y"))))),
            lambda u: u.nameexpression(lambda n: n.name(lambda x: x.scopedname(lambda c: c.scope(lambda y: y.unitname(lambda z: z)).name(
                lambda y: y.identifier(identifier("z")))))),
            lambda u: u.nameexpression(lambda n: n.name(lambda x: x.interfacetypename(lambda i: i.interface(identifier("bus")).name(identifier("t"))))),
            lambda u: u.nameexpression(lambda n: n.name(lambda x: x.interfacemethodname(lambda i: i.port(identifier("port")).name(identifier("m"))))),
            lambda u: u.macrousage(lambda m: m.name(identifier("WIDTH"))),
            lambda u: u.macrousage(lambda m: m.name(identifier("MAX")).arguments("a, b")),
            lambda u: u.constant(lambda c: c.fill("1")), lambda u: u.constant(lambda c: c.singleton("null")),
            lambda u: u.constant(lambda c: c.bits("xxxx").base("h")),
            sv.literal(1.5), lambda u: u.literal(lambda r: r.value(lambda v: v.as_scalar("s")).triple(True)),
            lambda u: u.literal(lambda r: r.value(lambda v: v.as_scalar(10.0)).unit("ns")),
            lambda u: u.literal(lambda r: r.value(lambda v: v.as_scalar(1000)).text("1_000").separators(True)),
            sv.literal('a"b'))))

    # --- typescript5: every kind, its types, patterns and JSX, written through the builders (TypeScript5 has no writers), a
    # literal with its spelling and a shared identifier --- the text ToText writes:
    # ({ a: [b,, ...c], d: { record }, f = 1 } = record), async function* g<T>(x: T = this.y) {}, async <U,>(p: U, ...r: U[]) =>
    # await import.meta.resolve(p), @record class K<T> extends record.Base<T> implements record {}, new record.C<number>(...record),
    # record`a${record}b`, `x${record}`, record++, typeof record, #p in record, record ?? null, record ? /x/g : 1n, yield* record,
    # record as string, record satisfies object, <any>record, record!, record<string>, [1,, ...record],
    # { m(): void, ...record, [record]: "s" }, <div id="x" {...record}>{}{record}<>text</></div>, <><br /></>, record?.a, super.x,
    # import(record)
    ts_record = lambda u: u.identifier(lambda r: r.name("record"))  # noqa: E731: TypeScript5's `ts_record`, in any union that has identifiers
    typescript5 = lambda u: u.sequenceexpression(lambda s: s.expressions([  # noqa: E731: written through the builders
        lambda e: e.parenthesizedexpression(lambda r: r.expression(lambda x: x.assignmentexpression(lambda a: a  # ({ a: [b, , ...c], d: { ts_record }, f = 1 } = ts_record)
            .left(lambda t: t.objectpattern(lambda o: o.properties([
                lambda p: p.property(lambda q: q.propertyKind("init").key(lambda k: k.identifier(lambda i: i.name("a"))).value(
                    lambda v: v.arraypattern(lambda ap: ap.elements([lambda y: y.identifier(lambda i: i.name("b")), lambda y: y.elision(lambda h: h),
                                                                      lambda y: y.restelement(lambda z: z.argument(lambda g: g.identifier(lambda i: i.name("c"))))])))),
                lambda p: p.property(lambda q: q.propertyKind("init").key(lambda k: k.identifier(lambda i: i.name("d"))).value(
                    lambda v: v.objectpattern(lambda op: op.properties([lambda y: y.property(lambda z: z.propertyKind("init").key(ts_record).shorthand(True).value(ts_record))])))),
                lambda p: p.property(lambda q: q.propertyKind("init").key(lambda k: k.identifier(lambda i: i.name("f"))).shorthand(True).value(
                    lambda v: v.assignmentpattern(lambda ap: ap.left(lambda g: g.identifier(lambda i: i.name("f"))).right(
                        lambda g: g.literal(lambda li: li.value(lambda n: n.as_scalar(1.0)))))))])))
            .operator("=").right(ts_record)))),
        lambda e: e.functionexpression(lambda r: r.isAsync(True).generator(True).id(lambda i: i.name("g")).typeParameters(  # async function* g<T>(x: T = this.y) {}
            lambda d: d.params([lambda p: p.name(lambda i: i.name("T"))])).params([lambda p: p.assignmentpattern(lambda ap: ap
                .left(lambda g: g.identifier(lambda i: i.name("x").typeAnnotation(lambda ta: ta.typeAnnotation(
                    lambda t: t.tstypereference(lambda tr: tr.typeName(lambda n: n.identifier(lambda j: j.name("T"))))))))
                .right(lambda g: g.memberexpression(lambda m: m.object(lambda o: o.thisexpression(lambda h: h)).property(lambda y: y.identifier(lambda i: i.name("y"))))))])),
        lambda e: e.arrowfunctionexpression(lambda r: r.isAsync(True).typeParameters(lambda d: d.params([lambda p: p.name(lambda i: i.name("U"))]))  # async <U>(p: U, ...r: U[]) => await import.meta.resolve(p)
            .params([lambda p: p.identifier(lambda i: i.name("p").typeAnnotation(lambda ta: ta.typeAnnotation(
                         lambda t: t.tstypereference(lambda tr: tr.typeName(lambda n: n.identifier(lambda j: j.name("U"))))))),
                     lambda p: p.restelement(lambda z: z.argument(lambda g: g.identifier(lambda i: i.name("r"))).typeAnnotation(lambda ta: ta.typeAnnotation(
                         lambda t: t.tsarraytype(lambda at: at.elementType(lambda y: y.tstypereference(lambda tr: tr.typeName(lambda n: n.identifier(lambda j: j.name("U")))))))))])
            .body(lambda b: b.awaitexpression(lambda w: w.argument(lambda c: c.callexpression(lambda ce: ce.callee(lambda f: f.memberexpression(lambda m: m
                .object(lambda o: o.metaproperty(lambda mp: mp.meta(lambda i: i.name("import")).property(lambda i: i.name("meta"))))
                .property(lambda y: y.identifier(lambda i: i.name("resolve"))))).arguments([lambda y: y.identifier(lambda i: i.name("p"))])))))),
        lambda e: e.classexpression(lambda r: r.decorators([lambda d: d.expression(ts_record)]).id(lambda i: i.name("K"))  # @ts_record class K<T> extends ts_record.Base<T> implements ts_record {}
            .typeParameters(lambda d: d.params([lambda p: p.name(lambda i: i.name("T"))]))
            .superClass(lambda c: c.memberexpression(lambda m: m.object(ts_record).property(lambda y: y.identifier(lambda i: i.name("Base")))))
            .superTypeArguments(lambda a: a.params([lambda t: t.tstypereference(lambda tr: tr.typeName(lambda n: n.identifier(lambda j: j.name("T"))))]))
            .implements([lambda c: c.expression(ts_record)])),
        lambda e: e.newexpression(lambda r: r.callee(lambda c: c.memberexpression(lambda m: m.object(ts_record).property(  # new ts_record.C<number>(...ts_record)
            lambda y: y.identifier(lambda i: i.name("C"))))).typeArguments(lambda a: a.params([lambda t: t.tsnumberkeyword(lambda k: k)]))
            .arguments([lambda y: y.spreadelement(lambda z: z.argument(ts_record))])),
        lambda e: e.taggedtemplateexpression(lambda r: r.tag(ts_record).quasi(lambda q: q.quasis([  # ts_record`a${ts_record}b`
            lambda y: y.raw("a"), lambda y: y.raw("b").tail(True)]).expressions([ts_record]))),
        lambda e: e.templateliteral(lambda r: r.quasis([lambda y: y.raw("x"), lambda y: y.raw("").tail(True)]).expressions([ts_record])),  # `x${ts_record}`
        lambda e: e.updateexpression(lambda r: r.operator("++").argument(ts_record)),  # ts_record++
        lambda e: e.unaryexpression(lambda r: r.operator("typeof").argument(ts_record)),  # typeof ts_record
        lambda e: e.binaryexpression(lambda r: r.left(lambda y: y.privateidentifier(lambda i: i.name("p"))).operator("in").right(ts_record)),  # #p in ts_record
        lambda e: e.logicalexpression(lambda r: r.left(ts_record).operator("??").right(lambda y: y.constant(lambda c: c.singleton("null")))),  # ts_record ?? null
        lambda e: e.conditionalexpression(lambda r: r.test(ts_record).consequent(  # ts_record ? /x/g : 1n
            lambda y: y.constant(lambda c: c.pattern("x").flags("g"))).alternate(lambda y: y.literal(lambda li: li.value(lambda n: n.as_scalar(1))))),
        lambda e: e.yieldexpression(lambda r: r.delegate(True).argument(ts_record)),  # yield* ts_record
        lambda e: e.tsasexpression(lambda r: r.expression(ts_record).typeAnnotation(lambda t: t.tsstringkeyword(lambda k: k))),  # ts_record as string
        lambda e: e.tssatisfiesexpression(lambda r: r.expression(ts_record).typeAnnotation(lambda t: t.tsobjectkeyword(lambda k: k))),  # ts_record satisfies object
        lambda e: e.tstypeassertion(lambda r: r.typeAnnotation(lambda t: t.tsanykeyword(lambda k: k)).expression(ts_record)),  # <any>ts_record
        lambda e: e.tsnonnullexpression(lambda r: r.expression(ts_record)),  # ts_record!
        lambda e: e.tsinstantiationexpression(lambda r: r.expression(ts_record).typeArguments(lambda a: a.params([lambda t: t.tsstringkeyword(lambda k: k)]))),  # ts_record<string>
        lambda e: e.arrayexpression(lambda r: r.elements([  # [1, , ...ts_record]: the framework's list, its elements any dialect's terms
            lambda y: y.typescript5(lambda t: t.literal(lambda li: li.value(lambda n: n.as_scalar(1.0)))), lambda y: y.typescript5(lambda t: t.elision(lambda h: h)),
            lambda y: y.typescript5(lambda t: t.spreadelement(lambda z: z.argument(ts_record)))])),
        lambda e: e.objectexpression(lambda r: r.properties([  # { m(): void, ...ts_record, [ts_record]: "s" }
            lambda p: p.property(lambda q: q.propertyKind("init").key(lambda k: k.identifier(lambda i: i.name("m"))).method(True).value(
                lambda v: v.tsemptybodyfunctionexpression(lambda f: f.returnType(lambda a: a.typeAnnotation(lambda t: t.tsvoidkeyword(lambda k: k)))))),
            lambda p: p.spreadelement(lambda z: z.argument(ts_record)),
            lambda p: p.property(lambda q: q.propertyKind("init").computed(True).key(ts_record).value(lambda v: v.literal(lambda li: li.value(lambda n: n.as_scalar("s")))))])),
        lambda e: e.jsxelement(lambda r: r  # <div id="x" {...ts_record}>{}{ts_record}<>text</></div>
            .openingElement(lambda o: o.name(lambda n: n.jsxidentifier(lambda i: i.name("div"))).attributes([
                lambda a: a.jsxattribute(lambda t: t.name(lambda n: n.jsxidentifier(lambda i: i.name("id"))).value(
                    lambda v: v.literal(lambda li: li.value(lambda n: n.as_scalar("x")).text('"x"')))),
                lambda a: a.jsxspreadattribute(lambda z: z.argument(ts_record))]))
            .children([lambda c: c.jsxexpressioncontainer(lambda x: x.expression(lambda y: y.jsxemptyexpression(lambda h: h))),
                       lambda c: c.jsxexpressioncontainer(lambda x: x.expression(ts_record)),
                       lambda c: c.jsxfragment(lambda f: f.openingFragment(lambda h: h).children([lambda t: t.jsxtext(lambda j: j.raw("text"))]).closingFragment(lambda h: h))])
            .closingElement(lambda c: c.name(lambda n: n.jsxidentifier(lambda i: i.name("div"))))),
        lambda e: e.jsxfragment(lambda f: f.openingFragment(lambda h: h).children([lambda c: c.jsxelement(lambda x: x  # <><br /></>
            .openingElement(lambda o: o.name(lambda n: n.jsxidentifier(lambda i: i.name("br"))).selfClosing(True)))]).closingFragment(lambda h: h)),
        lambda e: e.chainexpression(lambda r: r.expression(lambda y: y.memberexpression(lambda m: m.object(ts_record).optional(True).property(  # ts_record?.a
            lambda z: z.identifier(lambda i: i.name("a")))))),
        lambda e: e.memberexpression(lambda m: m.object(lambda o: o.super(lambda h: h)).property(lambda y: y.identifier(lambda i: i.name("x")))),  # super.x
        lambda e: e.importexpression(lambda r: r.source(ts_record)),  # import(ts_record)
    ]))

    # --- systemverilog_patterns: every kind of SystemVerilog's Patterns, held by Expressions' `matches` --- the text:
    # '{a: .x, b: tagged Valid (.*), c: record.a}
    patterns = SVPatterns.Expressions.DIALECT.spec(lambda u: u.structurepattern(lambda s: s.items([
        lambda i: i.patternmember(lambda m: m.name(identifier("a")).pattern(lambda p: p.variablepattern(lambda v: v.name(identifier("x"))))),
        lambda i: i.patternmember(lambda m: m.name(identifier("b")).pattern(lambda p: p.taggedpattern(lambda t: t.member(identifier("Valid")).pattern(
            lambda q: q.parenthesizedpattern(lambda r: r.pattern(lambda w: w.wildcardpattern(lambda x: x))))))),
        lambda i: i.patternmember(lambda m: m.name(identifier("c")).pattern(sv.member(that, "a")))])))

    # --- systemverilog_assertions: every kind of SystemVerilog's Assertions and their helpers --- the text:
    # @(posedge clk iff en or negedge rst) disable iff (rst) (a[*1:$], x += 1) ##[1:3] first_match(b intersect c) |=>
    # @(*) d ##1 e[->2] ##n f[=1] and if (en) weak(a or b) else reject_on (rst) case (n) 1, 2: a until b; default:
    # not a; endcase or (@(negedge clk) a throughout b iff nexttime [2] c #-# d)
    a_, b_, c_, d_ = (sv.identifier(t) for t in "abcd")
    assertions = SVAssertions.Expressions.DIALECT.spec(lambda u: u.propertyspec(lambda s: s.clock(lambda k: k.events([
        lambda e: e.edge("posedge").expression(sv.identifier("clk")).condition(sv.identifier("en")),
        lambda e: e.edge("negedge").expression(sv.identifier("rst"))])).disable(sv.identifier("rst")).property(lambda p: p.binaryproperty(lambda o: o.left(
        lambda l: l.binaryproperty(lambda q: q.left(
            lambda i: i.implicationproperty(lambda m: m.antecedent(lambda s1: s1.delaysequence(lambda ds: ds.first(
                lambda ps: ps.parenthesizedsequence(lambda pp: pp.sequence(lambda r: r.repetitionsequence(lambda rr: rr.sequence(a_).operator("*").count(
                    lambda cr: cr.cyclerange(lambda c: c.low(sv.literal(1)).high(lambda dd: dd.dollarexpression(lambda z: z)))))).items([
                    lambda it: it.assignmentexpression(lambda ae: ae.target(sv.identifier("x")).operator("+=").value(sv.literal(1)))]))).steps([
                lambda st: st.delay(lambda cr: cr.cyclerange(lambda c: c.low(sv.literal(1)).high(sv.literal(3)))).sequence(
                    lambda fm: fm.firstmatchsequence(lambda f: f.sequence(lambda bs: bs.binarysequence(lambda b2: b2.left(b_).operator("intersect").right(c_)))))]))).operator("|=>").consequent(
                lambda cs: cs.clockedsequence(lambda k: k.clock(lambda e: e).sequence(lambda ds: ds.delaysequence(lambda q2: q2.first(d_).steps([
                    lambda st: st.delay(sv.literal(1)).sequence(lambda r: r.repetitionsequence(lambda rr: rr.sequence(sv.identifier("e")).operator("->").count(sv.literal(2)))),
                    lambda st: st.delay(sv.identifier("n")).sequence(lambda r: r.repetitionsequence(lambda rr: rr.sequence(sv.identifier("f")).operator("=").count(sv.literal(1))))]))))))).operator("and").right(
            lambda cp: cp.conditionalproperty(lambda c: c.condition(sv.identifier("en")).consequence(
                lambda sp: sp.strengthproperty(lambda w: w.keyword("weak").sequence(lambda bs: bs.binarysequence(lambda b2: b2.left(a_).operator("or").right(b_))))).alternative(
                lambda ab: ab.abortproperty(lambda r: r.keyword("reject_on").condition(sv.identifier("rst")).operand(lambda cp2: cp2.caseproperty(lambda cc: cc.expression(sv.identifier("n")).items([
                    lambda it: it.expressions([sv.literal(1), sv.literal(2)]).body(lambda bp: bp.binaryproperty(lambda u2: u2.left(a_).operator("until").right(b_))),
                    lambda it: it.body(lambda up: up.unaryproperty(lambda u3: u3.operator("not").operand(a_)))]))))))))).operator("or").right(
        lambda pp: pp.parenthesizedproperty(lambda q: q.property(lambda cl: cl.clockedproperty(lambda k: k.clock(lambda e: e.events([
            lambda ev: ev.edge("negedge").expression(sv.identifier("clk"))])).property(lambda bp: bp.binaryproperty(lambda o2: o2.left(
                lambda bs: bs.binarysequence(lambda t: t.left(a_).operator("throughout").right(b_))).operator("iff").right(
                lambda ip: ip.implicationproperty(lambda im: im.antecedent(lambda up: up.unaryproperty(lambda u4: u4.operator("nexttime").range(sv.literal(2)).operand(c_))).operator("#-#").consequent(d_)))))))))))))

    # --- systemverilog_constraints: every kind of SystemVerilog's Constraints and its helpers --- the text:
    # { soft record dist {0 := 40, [1:3] :/ 60, default :/ 1}; record > 0 -> record.a; if (record) record.a; else {}
    # foreach (record[k, ]) k < record.a; solve record before record.a; disable soft record; unique {record, [1:2]}; }
    holds = lambda e: lambda u: u.expressionconstraint(lambda c: c.expression(e))  # noqa: E731: a constraint of an expression
    constraints = SVConstraints.Expressions.DIALECT.spec(lambda u: u.constraintblock(lambda b: b.items([
        lambda i: i.expressionconstraint(lambda c: c.soft(True).expression(lambda d: d.distexpression(lambda e: e.value(that).items([
            lambda t: t.value(sv.literal(0)).operator(":=").weight(sv.literal(40)),
            lambda t: t.value(sv.span(1, 3)).operator(":/").weight(sv.literal(60)),
            lambda t: t.operator(":/").weight(sv.literal(1))])))),
        lambda i: i.implicationconstraint(lambda c: c.condition(sv.binary(">", that, 0)).body(holds(sv.member(that, "a")))),
        lambda i: i.conditionalconstraint(lambda c: c.condition(that).consequence(holds(sv.member(that, "a"))).alternative(
            lambda e: e.constraintblock(lambda b: b.items([])))),
        lambda i: i.foreachconstraint(lambda f: f.value(that).variables([lambda v: v.identifier(identifier("k")),
                                                                         lambda v: v.emptyargument(lambda e: e)])
            .body(holds(sv.binary("<", sv.identifier("k"), sv.member(that, "a"))))),
        lambda i: i.solvebeforeconstraint(lambda s: s.solve([that]).before([sv.member(that, "a")])),
        lambda i: i.disablesoftconstraint(lambda d: d.target(that)),
        lambda i: i.uniqueconstraint(lambda q: q.set([that, sv.span(1, 2)])),
    ])))

    # --- systemverilog_preprocessor: every kind of SystemVerilog's Preprocessor and its helper, in a conditional
    # directive, its items, an `elsif` and an `else` --- the text: `ifdef (A && !B), its items each on its line,
    # `elsif C, `resetall, `else, skipped;, `endif
    preprocessor = SVPreprocessor.Expressions.DIALECT.spec(lambda u: u.ifdefdirective(lambda d: d
        .condition(lambda c: c.parenthesizedexpression(lambda p: p.expression(sv.binary("&&", sv.identifier("A"), sv.unary("!", sv.identifier("B"))))))
        .items([
            lambda i: i.includedirective(lambda r: r.path("defs.svh")),
            lambda i: i.includedirective(lambda r: r.path("uvm.svh").system(True)),
            lambda i: i.definedirective(lambda r: r.name(identifier("MAX")).function_like(True).parameters(
                [identifier("a"), identifier("b")]).body("((a) > (b) ? (a) : (b))")),
            lambda i: i.undefdirective(lambda r: r.name(identifier("W"))),
            lambda i: i.timescaledirective(lambda r: r.unit("1ns").precision("1ps")),
            lambda i: i.defaultnettypedirective(lambda r: r.net_type("none")),
            lambda i: i.comment(lambda r: r.text(" low")),
            lambda i: i.comment(lambda r: r.text(" block ").block(True)),
            lambda i: i.macrousage(lambda r: r.name(identifier("MAX")).arguments("1, 2")),
        ])
        .branches([lambda b: b.name(identifier("C")).items([lambda i: i.otherdirective(lambda r: r.text("`resetall"))])])
        .alternative([lambda i: i.disabledtext(lambda r: r.text("skipped;"))]).has_else(True)))

    # --- invalid: a Python3 term holding an error, its recovered term within it, and a missing operand; literals with
    # their spelling, one whose text is invalid holding no value but its problem --- 0x10 + (x +* 1) + 08 - <missing>
    # (a binop's operands are Python3's terms, written in its union)
    invalid = P.binop("-", P.binop("+", P.binop("+", lambda e: e.literal(
        lambda r: r.value(lambda p: p.as_scalar(16)).text("0x10")), lambda e: e.error(
        lambda r: r.text("(x +* 1)").terms([P.name("x"), P.constant(1)]))), lambda e: e.literal(
            lambda r: r.text("08").problems(["leading zeros in a decimal integer literal are not permitted"]))),
        lambda e: e.missing(lambda r: r.kind("expression")))

    with store.transaction():
        terms = {case: store.Expressions.Framework.Term(writer) for case, writer in [
            ("expression", expression), ("python3", python3), ("matlab", matlab), ("excel", excel), ("latex", latex),
            ("collections", collections), ("c", c), ("cpp", cpp), ("systemverilog", systemverilog),
            ("typescript5", TS.DIALECT.spec(typescript5)), ("invalid", invalid), ("systemverilog_patterns", patterns),
            ("systemverilog_assertions", assertions), ("systemverilog_constraints", constraints),
            ("systemverilog_preprocessor", preprocessor)]}
    terms["domains"] = defined["dialect"]
    terms.update(stored)
    terms.update({case: store.singleton(path).standards({"designation": designation})  # an edition, by its path
                  for case, (path, designation) in STANDARD.items()})
    Term, Standard = store.registered("Expressions.Framework.Term"), store.registered("Expressions.Framework.Standard")
    return {case: (store.registered(f"{DOMAINS[case]}.Dialect") if case in DOMAINS else Standard if case in STANDARD
                   else Term, terms[case], store) for case in CASES}
