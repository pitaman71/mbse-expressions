"""Draft (stage 2): Basic, as `Expressions.Basic.install` would define it, after the framework's.

Basic's kinds are the framework's (literal, call, variable, let) and one of its own, the quantifier, which it adds to
`Expressions.Framework.Term` by schema extension: an install finds the union by its name and gives it a branch. Its
vocabulary (operators, functions) stays code until vocabularies are data (question 11).
"""


def install(txn):
    """Basic's own kind, added to the framework's terms."""
    S = txn.Schemas
    return txn.uid("mbse.Expressions.Basic/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion, "Quantifier": S.OfObject})  # the framework's union, found by its name
        .spec([
            lambda _: _.Quantifier.name("Expressions.Basic.Quantifier").properties({
                "name": S.OfStr,  # bound to each item in the body
                "quantifier": S.OfStr,  # all, any or count
                "collection": _.Term,
                "body": _.Term,
            }),
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # a branch added: schema extension
                lambda t: t.name("quantifier").schema([_.Quantifier])]),
        ])]))])
