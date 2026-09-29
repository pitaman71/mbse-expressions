/**
 * The conformance corpus: the same cases, built statement for statement in every implementation.
 *
 * `build()` returns the cases, name -> [root schema, root expression]. Each implementation writes its snapshots to
 * `conformance/<implementation>/<case>.json` and `.yaml`, and checks them against every other implementation's files
 * (see the CONF test suite). Keep this module and `python3/mbse/Expressions/Conformance/Corpus.py` in lockstep: same
 * cases, same values, same order of statements.
 */

import * as Expressions from "../Expressions.js";
import type { Schemas, Visitors } from "@mbse/schemas/Framework";

export const CASES = ["expression"] as const;

export function build(): Map<string, [Schemas.OfObject.Data, Visitors.Visitable]> {
  const E = Expressions;

  // --- expression: every kind and literal type, shared sub-expressions, each operation once ---
  const [self, age] = [E.variable("this"), E.variable("age")];
  const expression = E.let_("age", self.age, age.ge(18n).and_(
    age.lt(65.5).or_(self.has("email").not_())
      .implies(E.operation("in", "x", new Uint8Array([0x00, 0xff]), true)))).data;

  return new Map<string, [Schemas.OfObject.Data, Visitors.Visitable]>([
    ["expression", [E.OfLet.Schema, expression]],
  ]);
}
