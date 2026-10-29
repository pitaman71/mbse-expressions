"""Draft (stage 2): the framework's schemas, as `Expressions.Framework.install` would define them.

Terms are value objects (decided), held nested; the term kinds are the starting point (decided), each a value object
schema, `Term` their union. An expression is a reference object holding one term, its root; `Schemas.OfExpression`
links one by an extension adjacency (decided, question 3). A dialect adds its own kinds as `Term`'s branches, by schema
extension (decided): see Basic.py. A term names what it refers to (a callable, a domain) by name, as a module names a
schema; vocabularies as data (`Callable`, `HasArguments`) come later (question 11), so a call names its callable.

Run against mbse-schemas 0.26: `python3 docs/proposals/port/check.py`.
"""


def install(txn):
    """The framework's schemas: terms, expressions, and an expression schema's root."""
    S = txn.Schemas
    return txn.uid("mbse.Expressions.Framework/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Term": S.OfUnion, "Literal": S.OfObject, "Call": S.OfObject, "Variable": S.OfObject,
                  "Let": S.OfObject, "Expression": S.OfObject, "HasRoot": S.OfRelation,
                  "OfExpression": S.OfObject})  # mbse-schemas' own, found by its name
        .spec([
            lambda _: _.Term.name("Expressions.Framework.Term").branches([  # a dialect adds its kinds
                lambda t: t.name("literal").schema([_.Literal]),
                lambda t: t.name("call").schema([_.Call]),
                lambda t: t.name("variable").schema([_.Variable]),
                lambda t: t.name("let").schema([_.Let]),
            ]),
            lambda _: _.Literal.name("Expressions.Framework.Literal").properties({
                "value": S.OfAny(lambda a: a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr, S.OfBytes])),
                "domain": S.OfStr,  # the domain it is a value of, by name (stage 3); absent, its scalar's default
            }),
            lambda _: _.Call.name("Expressions.Framework.Call").properties({
                "callable": S.OfStr,  # what it calls, by name: an operator, a function
                "arguments": S.OfContainer(lambda c: c.index([S.OfInt]).element([_.Term])),
                "domain": S.OfStr,  # its result's domain, by name, where the dialect needs it
            }),
            lambda _: _.Variable.name("Expressions.Framework.Variable").properties({"name": S.OfStr}),
            lambda _: _.Let.name("Expressions.Framework.Let").properties({
                "name": S.OfStr, "value": _.Term, "body": _.Term}),
            lambda _: _.Expression.name("Expressions.Framework.Expression").ref(True).properties({"root": _.Term}),
            lambda _: _.HasRoot.name("Expressions.Framework.HasRoot").links([
                lambda t: t.name("schema"), lambda t: t.name("expression")]).uniques("expression"),
            lambda _: _.OfExpression.name("Schemas.OfExpression").adjacencies([  # by extension: no member on it
                lambda t: t.name("expression").relation([_.HasRoot]).me("schema")]),
        ])]))])
