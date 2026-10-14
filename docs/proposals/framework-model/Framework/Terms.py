"""Terms: the schemas of every expression language's terms. (Proposed: python3/mbse/Expressions/Framework/Terms.py.)

An expression is a graph of terms, each a reference object built in a store. `Term` is the union of the term
subtypes, which every dialect refines (`Dialects/Basic/Terms`). A term links what it holds: a call its `Callable`
(`Operators`) and its arguments, a let its value and its body, a quantifier its operator, collection and body, an
import its body. Every subtype may be held, so each declares, anonymously, the ends at which it is.
"""

from __future__ import annotations

from mbse.Schemas.Framework import Schemas as S

from . import Operators

__all__ = ["Term", "Call", "Literal", "Variable", "Let", "Quantifier", "Import", "Applies", "Arguments", "Value",
           "Body", "Over", "SCHEMAS"]

Text, Int, Any = S.OfScalar.Data(str), S.OfScalar.Data(int), S.OfAny.Builder().create()

# --- How terms hold terms, and apply operators ---

Applies = (
    S.OfRelation.Builder().name("Expressions.Applies")
    .links("term", "callable")
    .create()
)
Arguments = (
    S.OfRelation.Builder().name("Expressions.Arguments")
    .links("call", "argument")
    .properties(
        lambda prop: prop.name("index").of(Int),
    )
    .unique("call", "index")
    .create()
)
Value = (
    S.OfRelation.Builder().name("Expressions.Value")
    .links("let", "value")
    .create()
)
Body = (
    S.OfRelation.Builder().name("Expressions.Body")
    .links("scope", "body")
    .create()
)
Over = (
    S.OfRelation.Builder().name("Expressions.Over")
    .links("quantifier", "collection")
    .create()
)

# --- Term subtypes ---

Call = (
    S.OfObject.Builder().name("Expressions.Call").ref()
    .relations(
        lambda adj: adj.name("callable").of(Applies).me("term"),
        lambda adj: adj.name("arguments").of(Arguments).me("call"),
    )
    .create()
)
Literal = (
    S.OfObject.Builder().name("Expressions.Literal").ref()
    .properties(
        lambda prop: prop.name("value").of(Any),
    )
    .create()
)
Variable = (
    S.OfObject.Builder().name("Expressions.Variable").ref()
    .properties(
        lambda prop: prop.name("name").of(Text),
    )
    .create()
)
Let = (
    S.OfObject.Builder().name("Expressions.Let").ref()
    .properties(
        lambda prop: prop.name("name").of(Text),
    )
    .relations(
        lambda adj: adj.name("value").of(Value).me("let"),
        lambda adj: adj.name("body").of(Body).me("scope"),
    )
    .create()
)
Quantifier = (
    S.OfObject.Builder().name("Expressions.Quantifier").ref()
    .properties(
        lambda prop: prop.name("name").of(Text),
    )
    .relations(
        lambda adj: adj.name("callable").of(Applies).me("term"),
        lambda adj: adj.name("collection").of(Over).me("quantifier"),
        lambda adj: adj.name("body").of(Body).me("scope"),
    )
    .create()
)
Import = (
    S.OfObject.Builder().name("Expressions.Import").ref()
    .properties(
        lambda prop: prop.name("module").of(Text),
    )
    .relations(
        lambda adj: adj.name("body").of(Body).me("scope"),
    )
    .create()
)

# Every term may be an argument, a let's value, a scope's body or a quantifier's collection.
for held in (Call, Literal, Variable, Let, Quantifier, Import):
    (
        S.OfObject.Builder(held)
        .relations(
            lambda adj: adj.of(Arguments).me("argument"),
            lambda adj: adj.of(Value).me("value"),
            lambda adj: adj.of(Body).me("body"),
            lambda adj: adj.of(Over).me("collection"),
        )
        .update()
    )

# A callable is what a call or a quantifier applies.
(
    S.OfObject.Builder(Operators.Callable)
    .relations(
        lambda adj: adj.of(Applies).me("callable"),
    )
    .update()
)

Term = (
    S.OfUnion.Builder().name("Expressions.Term")
    .branches(
        lambda branch: branch.name("call").of(Call),
        lambda branch: branch.name("literal").of(Literal),
        lambda branch: branch.name("variable").of(Variable),
        lambda branch: branch.name("let").of(Let),
        lambda branch: branch.name("quantifier").of(Quantifier),
        lambda branch: branch.name("import").of(Import),
    )
    .create()
)

SCHEMAS = (Applies, Arguments, Value, Body, Over, Call, Literal, Variable, Let, Quantifier, Import, Term)
"""The schemas of terms, in the order a store registers them, after `Operators.SCHEMAS`."""
