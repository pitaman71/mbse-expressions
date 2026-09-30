"""The conformance corpus: the same cases, built statement for statement in every implementation.

`build()` returns `{case: (root schema, root expression, registry)}`, the registry being the case's dialect's builders. Each implementation writes its snapshots to
`conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files (see
the CONF test suite). Keep this module and `typescript5/src/Conformance/Corpus.ts` in lockstep: same cases, same values,
same order of statements.
"""

from __future__ import annotations

from mbse.Expressions import Expressions
from mbse.Expressions.Dialects.Excel import Expressions as Excel
from mbse.Expressions.Dialects.Matlab import Expressions as Matlab
from mbse.Expressions.Dialects.Python import Expressions as Python

CASES = ["expression", "python", "matlab", "excel"]


def build():
    E, P, M, X = Expressions, Python, Matlab, Excel

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

    return {
        "expression": (E.OfLet.Schema, expression, E.Builders),
        "python": (P.DIALECT.schema_of(python), python, P.Builders),
        "matlab": (M.DIALECT.schema_of(matlab), matlab, M.Builders),
        "excel": (X.DIALECT.schema_of(excel), excel, X.Builders),
    }
