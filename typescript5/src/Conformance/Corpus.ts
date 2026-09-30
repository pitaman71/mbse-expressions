/**
 * The conformance corpus: the same cases, built statement for statement in every implementation.
 *
 * `build()` returns the cases, name -> [root schema, root expression, registry], the registry being the case's dialect's
 * builders. Each implementation writes its snapshots to
 * `conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files
 * (see the CONF test suite). Keep this module and `python3/mbse/Expressions/Conformance/Corpus.py` in lockstep: same
 * cases, same values, same order of statements.
 */

import * as Expressions from "../Dialects/Basic/Expressions.js";
import * as Excel from "../Dialects/Excel/Expressions.js";
import * as Matlab from "../Dialects/Matlab/Expressions.js";
import * as Python from "../Dialects/Python/Expressions.js";
import type { Schemas, Visitors } from "@mbse/schemas/Framework";

export const CASES = ["expression", "python", "matlab", "excel"] as const;

type Case = [Schemas.OfObject.Data, Visitors.Visitable, unknown];

export function build(): Map<string, Case> {
  const [E, P, M, X] = [Expressions, Python, Matlab, Excel];

  // --- expression: every kind and literal type, shared sub-expressions, each operation once ---
  const [self, age] = [E.variable("this"), E.variable("age")];
  const expression = E.let_("age", self.age, age.ge(18n).and_(
    age.lt(65.5).or_(self.has("email").not_())
      .implies(E.operation("in", "x", new Uint8Array([0x00, 0xff]), true)))).data;

  // --- python: every kind, shared names --- import numpy as np / from math import floor /
  // (lambda a: floor(a.x * 2.5) if not a['k'] >= 18 or np.pi else b'\x00')(this)
  const a = P.name("a");
  const python = P.import_("numpy", P.importfrom("math", "floor", P.let_("a", P.name("this"), P.ifexp(
    P.boolop("or", P.unaryop("not", P.compare(">=", P.subscript(a, "k"), 18n)), P.attribute(P.name("np"), "pi")),
    P.call("floor", P.binop("*", P.attribute(a, "x"), 2.5)), new Uint8Array([0x00])))), "np");

  // --- matlab: every kind, shared identifiers --- import geo.* / (dist(this.age, 3) + ~isfield(this, "email") .* -1.5
  // >= 0) || true
  const thisM = M.identifier("this");
  const matlab = M.import_("geo.*", M.binary("||", M.binary(">=", M.binary(
    "+", M.call("dist", M.field(thisM, "age"), 3n),
    M.binary(".*", M.unary("~", M.call("isfield", thisM, "email")), M.unary("-", 1.5))), 0n), true));

  // --- excel: every kind, shared names --- =LET(a, this.age, IF(AND(a >= 18, NOT(ISERROR(this.email))),
  // a * 2 - Sheet1!B2, -[Book.xlsx]Rates!C3 + "x"))
  const [thisX, aX] = [X.name("this"), X.name("a")];
  const excel = X.let_("a", X.field(thisX, "age"), X.function(
    "IF", X.function("AND", X.infix(">=", aX, 18n), X.function("NOT", X.function("ISERROR", X.field(thisX, "email")))),
    X.infix("-", X.infix("*", aX, 2n), X.cell("B2", "Sheet1")),
    X.infix("+", X.prefix("-", X.cell("C3", "Rates", "Book.xlsx")), "x")));

  return new Map<string, Case>([
    ["expression", [E.OfLet.Schema, expression, E.Builders]],
    ["python", [P.DIALECT.schema_of(python), python, P.Builders]],
    ["matlab", [M.DIALECT.schema_of(matlab), matlab, M.Builders]],
    ["excel", [X.DIALECT.schema_of(excel), excel, X.Builders]],
  ]);
}
