"""The conformance corpus: the same cases, built statement for statement in every implementation.

`build()` returns `{case: (root schema, root expression, registry)}`, the registry being the case's dialect's builders. Each implementation writes its snapshots to
`conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files (see
the CONF test suite). Keep this module and `typescript5/src/Conformance/Corpus.ts` in lockstep: same cases, same values,
same order of statements.
"""

from __future__ import annotations

from mbse.Expressions import Domains, Expressions
from mbse.Expressions.Dialects.Excel import Expressions as Excel
from mbse.Expressions.Dialects.Latex import Expressions as Latex
from mbse.Expressions.Dialects.Matlab import Expressions as Matlab
from mbse.Expressions.Dialects.Python import Expressions as Python

CASES = ["expression", "python", "matlab", "excel", "latex", "domains"]


def build():
    E, P, M, X, L = Expressions, Python, Matlab, Excel, Latex

    # --- expression: every kind and literal type, shared sub-expressions, each operation once ---
    this, age = E.variable("this"), E.variable("age")
    expression = E.let_("age", this.age, age.ge(18).and_(
        age.lt(65.5).or_(this.has("email").not_()).implies(E.operation("in", "x", b"\x00\xff", True)))).data

    # --- python: every kind, shared names --- import numpy as np / from math import floor /
    # (lambda a: floor(a.x * 2.5) if not a['k'] >= 18 or np.pi else b'\x00')(this)
    a = P.name("a")
    python = P.import_("numpy", P.importfrom("math", "floor", P.let_("a", P.name("this"), P.ifexp(
        P.boolop("or", P.unaryop("not", P.compare(">=", P.subscript(a, "k"), 18)), P.attribute(P.name("np"), "pi")),
        P.call("floor", P.binop("*", P.attribute(a, "x"), 2.5)), b"\x00"))), alias="np")

    # --- matlab: every kind, shared identifiers --- import geo.* / (dist(this.age, 3) + ~isfield(this, "email") .* -1.5
    # >= 0) || true
    this_ = M.identifier("this")
    matlab = M.import_("geo.*", M.binary("||", M.binary(">=", M.binary(
        "+", M.call("dist", M.field(this_, "age"), 3),
        M.binary(".*", M.unary("~", M.call("isfield", this_, "email")), M.unary("-", 1.5))), 0), True))

    # --- excel: every kind, shared names --- =LET(a, this.age, IF(AND(a >= 18, NOT(ISERROR(this.email))),
    # a * 2 - Sheet1!B2, -[Book.xlsx]Rates!C3 + "x"))
    this_, a = X.name("this"), X.name("a")
    excel = X.let_("a", X.field(this_, "age"), X.function(
        "IF", X.function("AND", X.infix(">=", a, 18), X.function("NOT", X.function("ISERROR", X.field(this_, "email")))),
        X.infix("-", X.infix("*", a, 2), X.cell("B2", "Sheet1")),
        X.infix("+", X.prefix("-", X.cell("C3", "Rates", "Book.xlsx")), "x")))

    # --- latex: every kind, shared symbols --- a \geq 18 \land (\lnot \operatorname{has}(this, email) \lor
    # \frac{a}{2} > 1.5) \quad \text{where } a = this.age
    this_, a = L.symbol("this"), L.symbol("a")
    latex = L.where("a", L.member(this_, "age"), L.binary("\\land", L.binary("\\geq", a, 18), L.binary(
        "\\lor", L.unary("\\lnot", L.function("has", this_, "email")), L.binary(">", L.frac(a, 2), 1.5))))

    # --- domains: literals of value domains, by value and by name, a packed enum among them; defaults left out;
    # decimal and binary128 text; a conversion's domain, a bitwise operation and pack ---
    D = Domains
    uint8 = D.OfInteger.Builder().width(8).signed(False).overflow("wrap").create()
    if D.name_of(uint8) is None:
        D.register("uint8", uint8)
    state = D.OfPacked.Builder().domain(D.OfEnum.Builder().members("IDLE", "RUN").create()).representation(
        D.OfBits.Builder().width(2).create()).codes(0, 1).create()
    binary32 = D.OfIeee754.Builder().format("binary32").rounding("roundTowardZero").create()
    decimal64 = D.OfIeee754.Builder().format("decimal64").create()
    bits2 = D.OfBits.Builder().width(2).create()
    mode, count, gain, line, mask, size, price, ratio = (
        E.variable(name) for name in ("mode", "count", "gain", "line", "mask", "size", "price", "ratio"))
    domains = E.operation(
        "all", mode.eq(E.literal("RUN", state)), count.le(E.literal(200, uint8)), gain.ne(E.literal(1.5, binary32)),
        line.ge(E.literal("Z", D.OfIeee1164.Builder().create())), mask.gt(E.literal(b"\x03", bits2)),
        size.lt(E.literal(5, D.Int)), price.convert(decimal64).sub(E.literal("1.50", decimal64)),
        ratio.mul(E.literal("0.1", D.OfIeee754.Builder().format("binary128").create())),
        mask.bitand(E.literal(b"\x01", bits2)), mode.pack()).data  # each operation once, for CONF-04

    return {
        "expression": (E.OfLet.Schema, expression, E.Builders),
        "python": (P.DIALECT.schema_of(python), python, P.Builders),
        "matlab": (M.DIALECT.schema_of(matlab), matlab, M.Builders),
        "excel": (X.DIALECT.schema_of(excel), excel, X.Builders),
        "domains": (E.OfOperation.Schema, domains, E.Builders),
        "latex": (L.DIALECT.schema_of(latex), latex, L.Builders),
    }
