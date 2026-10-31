"""The conformance corpus: the same cases, built statement for statement in every implementation.

`build()` returns `{case: (root schema, root, store)}`: each case but `domains` a term value of
`Expressions.Framework.Term`, built in one store holding the framework's install and every dialect's, written nested.
`DIALECTS` names the dialect that reads each case other than Basic's. The `domains` case is data: Basic's dialect, the
singleton `Expressions.Basic` (`Expressions.Basic.Dialect`), naming its operations and owning its domains by name, a
packed one among them, written as one document. Each implementation writes its snapshots to
`conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files (see
the CONF test suite). Keep this module and `typescript5/src/Conformance/Corpus.ts` in lockstep: same cases, same
values, same order of statements.
"""

from __future__ import annotations

from mbse.Expressions import Framework
from mbse.Expressions.Dialects import Basic, Ccpp, Excel, Latex, Matlab, Python, SystemVerilog
from mbse.Expressions.Dialects.Basic import Expressions
from mbse.Expressions.Dialects.Ccpp import Expressions as C
from mbse.Expressions.Dialects.Excel import Expressions as X
from mbse.Expressions.Dialects.Latex import Expressions as L
from mbse.Expressions.Dialects.Matlab import Expressions as M
from mbse.Expressions.Dialects.Python import Expressions as P
from mbse.Expressions.Dialects.SystemVerilog import Expressions as SV
from mbse.Schemas.Framework import Builders

CASES = ["expression", "python", "matlab", "excel", "latex", "domains", "collections", "ccpp", "systemverilog"]

DIALECTS = {"python": P.DIALECT, "matlab": M.DIALECT, "excel": X.DIALECT, "latex": L.DIALECT, "ccpp": C.DIALECT,
            "systemverilog": SV.DIALECT}
"""The dialect that reads each case, where it is not Basic."""

def build():
    E = Expressions
    store = Builders.Store()
    store.transaction(Framework.install)
    store.transaction(Basic.install)
    store.transaction(Python.install)
    store.transaction(Matlab.install)
    store.transaction(Excel.install)
    store.transaction(Latex.install)
    store.transaction(Ccpp.install)
    store.transaction(SystemVerilog.install)
    defined = store.transaction(Basic.define)[0]  # Basic's dialect, its operations and its domains

    # --- domains: Basic's dialect, its operations by name and its domains, owned by name; an enum and a domain packing
    # it into uint8 added ---
    with store.transaction():
        state = store.Expressions.Framework.Domain(lambda d: d.kind(lambda k: k.as_value(lambda a: a.as_union(
            lambda u: u.enum(lambda e: e.members(["IDLE", "RUN"]))))))
        mode = store.Expressions.Framework.Domain(lambda d: d.kind(lambda k: k.as_value(lambda a: a.as_union(
            lambda u: u.packed(lambda e: e.codes([0, 1]))))).packs(lambda a: a.insert(
            lambda e: e.domain(state).representation(defined["uint8"]))))
        store.Expressions.Basic.Dialect(defined["dialect"], lambda b: b.domains({
            "state": lambda e: e.domain(state), "mode": lambda e: e.domain(mode)}))

    # --- expression: every kind and literal type, a let and its variable, a list ---
    record, age = E.variable("record"), E.variable("age")
    expression = E.let_("age", record.age, age.ge(18).and_(
        age.lt(65.5).or_(record.has("email").not_()).implies(E.literal(b"\x00\xff").in_(E.list_("x", True)))))

    # --- python: every kind, a let and its names --- import numpy as np / from math import floor /
    # (lambda a: floor(a.x * 2.5) if not a['k'] >= 18 or np.pi else (p[b'\x00'] for p in a.y if p))(record)
    a, item = P.name("a"), P.name("p")
    python = P.import_("numpy", P.importfrom("math", "floor", P.let_("a", P.name("record"), P.ifexp(
        P.boolop("or", P.unaryop("not", P.compare(">=", P.subscript(a, "k"), 18)), P.attribute(P.name("np"), "pi")),
        P.call("floor", P.binop("*", P.attribute(a, "x"), 2.5)),
        P.generator("p", P.attribute(a, "y"), P.index(item, b"\x00"), item)))), alias="np")

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

    # --- ccpp: every kind, typed constants and a shared identifier --- !record.a && record->b[0] > 1.5f ? (uint8_t)f(1) : 5u
    me = C.identifier("record")
    ccpp = C.conditional(C.binary("&&", C.unary("!", C.member(me, "a")), C.binary(
        ">", C.subscript(C.member(me, "b", "->"), 0), C.constant(1.5, "float"))),
        C.cast("uint8_t", C.call("f", 1)), C.constant(5, "unsigned int"))

    # --- systemverilog: every kind, sized vectors and casts, and a shared identifier ---
    # record.a inside {1, [2:5]} -> !record[0] ? {{6{2'b10}}, record.b[7:4]} : byte'($clog2(record.unique().sum(q) with (q))) + 4'(8'shff)
    sv, that = SV, SV.identifier("record")
    systemverilog = sv.binary("->", sv.inside(sv.member(that, "a"), 1, sv.span(2, 5)), sv.conditional(
        sv.unary("!", sv.select(that, 0)),
        sv.concatenation(sv.replication(6, sv.vector("10")), sv.range_(sv.member(that, "b"), 7, 4)),
        sv.binary("+", sv.cast("byte", sv.call("$clog2", sv.iterate(sv.method(that, "unique"), "sum", "q", sv.identifier("q")))),
                  sv.cast(4, sv.vector("11111111", True, "h")))))

    with store.transaction():
        terms = {case: store.Expressions.Framework.Term(writer) for case, writer in [
            ("expression", expression), ("python", python), ("matlab", matlab), ("excel", excel), ("latex", latex),
            ("collections", collections), ("ccpp", ccpp), ("systemverilog", systemverilog)]}
    terms["domains"] = defined["dialect"]
    Term, Dialect = store.registered("Expressions.Framework.Term"), store.registered("Expressions.Basic.Dialect")
    return {case: (Dialect if case == "domains" else Term, terms[case], store) for case in CASES}
