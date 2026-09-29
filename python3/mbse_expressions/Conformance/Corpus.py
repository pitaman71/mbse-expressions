"""The conformance corpus: the same cases, built statement for statement in every implementation.

`build()` returns `{case: (root schema, root expression)}`. Each implementation writes its snapshots to
`conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files (see
the CONF test suite). Keep this module and `typescript5/src/Conformance/Corpus.ts` in lockstep: same cases, same values,
same order of statements.
"""

from __future__ import annotations

from mbse_expressions import Expressions

CASES = ["expression"]


def build():
    E = Expressions

    # --- expression: every kind and literal type, shared sub-expressions, each operation once ---
    this, age = E.variable("this"), E.variable("age")
    expression = E.let_("age", this.age, age.ge(18).and_(
        age.lt(65.5).or_(this.has("email").not_()).implies(E.operation("in", "x", b"\x00\xff", True)))).data

    return {
        "expression": (E.OfLet.Schema, expression),
    }
