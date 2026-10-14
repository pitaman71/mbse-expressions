"""Terms: Basic's terms, refining the framework's. (Proposed: python3/mbse/Expressions/Dialects/Basic/Terms.py.)

Each Basic kind refines the framework subtype it is: trivially where Basic adds nothing, and with a property of its
own where it does (a literal's or a conversion's `domain`). `Term` is the union of Basic's kinds.
"""

from __future__ import annotations

from mbse.Expressions.Framework import Terms as F
from mbse.Schemas.Framework import Schemas as S

__all__ = ["Term", "Call", "Literal", "Variable", "Let", "Quantifier", "SCHEMAS"]

Text = S.OfScalar.Data(str)

Call = (
    S.OfObject.Builder().name("Expressions.Basic.Call")
    .refines(F.Call)
    .properties(
        lambda prop: prop.name("domain").of(Text),  # a conversion's result domain, by name
    )
    .create()
)
Literal = (
    S.OfObject.Builder().name("Expressions.Basic.Literal")
    .refines(F.Literal)
    .properties(
        lambda prop: prop.name("domain").of(Text),  # its value's domain, by name, when not its native's default
    )
    .create()
)
Variable = (
    S.OfObject.Builder().name("Expressions.Basic.Variable")
    .refines(F.Variable)
    .create()
)
Let = (
    S.OfObject.Builder().name("Expressions.Basic.Let")
    .refines(F.Let)
    .create()
)
Quantifier = (
    S.OfObject.Builder().name("Expressions.Basic.Quantifier")
    .refines(F.Quantifier)
    .create()
)
Term = (
    S.OfUnion.Builder().name("Expressions.Basic.Term")
    .branches(
        lambda branch: branch.name("call").of(Call),
        lambda branch: branch.name("literal").of(Literal),
        lambda branch: branch.name("variable").of(Variable),
        lambda branch: branch.name("let").of(Let),
        lambda branch: branch.name("quantifier").of(Quantifier),
    )
    .create()
)

SCHEMAS = (Call, Literal, Variable, Let, Quantifier, Term)
"""Basic's schemas, in the order a store registers them, after the framework's."""
