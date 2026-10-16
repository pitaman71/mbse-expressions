"""The expressions framework as a model: the schemas every dialect's expressions are data of (a draft, for review).

Proposed home: `python3/mbse/Expressions/Framework/`. It extends the framework of mbse-schemas once per process
(`Builders.extend`), so that every store holds these schemas, as it holds the meta-schemas (mbse-schemas'
docs/SCHEMA_EXTENSION.md). What it decides, and what it leaves open, is in README.md beside it.
"""

from __future__ import annotations

from mbse.Schemas.Framework import Builders as B

Text, Int = B.Meta.OfStr, B.Meta.OfInt
NAME = "mbse.Expressions.Framework"


def _links(*names: str) -> list:
    return [lambda t, name=name: t.name(name) for name in names]


def framework(m) -> None:
    """Builds the framework's schemas in `m`, the framework's store, and extends the meta-schemas they link."""

    # --- How terms hold terms: every relation between terms has two links and is seen from both ends ---

    Arguments = m.Schemas.Relation(lambda r: (  # a call's arguments, in order
        r
        .name("Expressions.Framework.Arguments")
        .links(_links("call", "argument"))
        .properties([lambda t: t.name("index").type([Int])])
        .uniques([["call", "index"], ["argument"]])  # a term is the argument of one call, at one index
    ))
    Value = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.BoundValue").links(_links("binder", "value")))
    Body = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.Body").links(_links("scope", "body")))
    Over = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.Over").links(_links("quantifier", "collection")))
    Initial = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.Initial").links(_links("reduction", "initial")))

    # --- Terms: reference objects, each kind refining Term, which every relation a term stands in is declared on ---

    Term = m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Term")
        .ref(True)
        .description("A term of an expression: a reference object, so that what other packages add can link it")
        .adjacencies([
            lambda t: t.name("argument_of").relation([Arguments]).me("argument"),
            lambda t: t.name("value_of").relation([Value]).me("value"),
            lambda t: t.name("body_of").relation([Body]).me("body"),
            lambda t: t.name("collection_of").relation([Over]).me("collection"),
            lambda t: t.name("initial_of").relation([Initial]).me("initial"),
        ])
    ))

    def kind(name, description, properties=(), adjacencies=()):
        return m.Schemas.Object(lambda o: (
            o
            .name(f"Expressions.Framework.{name}")
            .ref(True)
            .refines([Term])
            .description(description)
            .properties(list(properties))
            .adjacencies(list(adjacencies))
        ))

    LiteralValue = m.Schemas.Object(lambda o: (  # a value object: each dialect adds a property per scalar it has
        o
        .name("Expressions.Framework.Value")
        .description("A literal's value: one property set, of the properties the dialects add (AsIntValue, ...)")
    ))
    kind("Literal", "A value, written in the term", [lambda t: t.name("value").type([LiteralValue])])
    kind("Variable", "A name, bound by an enclosing binder, or free where the dialect permits",
         [lambda t: t.name("name").type([Text])])
    Function = m.Schemas.Object(lambda o: o.name("Expressions.Framework.Function").ref(True))  # given its members below
    Calls = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.Calls").links(_links("call", "function")).uniques("call"))
    kind("Call", "A function applied to arguments", adjacencies=[
        lambda t: t.name("function").relation([Calls]).me("call"),
        lambda t: t.name("arguments").relation([Arguments]).me("call"),
    ])
    binder = [lambda t: t.name("variable").type([Text])]
    kind("Let", "Binds its variable to its value within its body", binder, [
        lambda t: t.name("value").relation([Value]).me("binder"),
        lambda t: t.name("body").relation([Body]).me("scope"),
    ])
    kind("Map", "Binds its variable to each item of its collection, giving its body's value for each, in order", binder, [
        lambda t: t.name("collection").relation([Over]).me("quantifier"),
        lambda t: t.name("body").relation([Body]).me("scope"),
    ])
    kind("Reduce", "Folds its collection: binds its accumulator, from its initial value, and its variable to each item",
         [*binder, lambda t: t.name("accumulator").type([Text])], [
             lambda t: t.name("collection").relation([Over]).me("quantifier"),
             lambda t: t.name("initial").relation([Initial]).me("reduction"),
             lambda t: t.name("body").relation([Body]).me("scope"),
         ])

    # --- Functions: signatures, each formal and the result typed by a schema; several may share a name ---

    HasFormal = m.Schemas.Relation(lambda r: (
        r
        .name("Expressions.Framework.HasFormal")
        .links(_links("function", "formal"))
        .properties([lambda t: t.name("index").type([Int])])
        .uniques([["function", "index"], ["formal"]])
    ))
    FormalType = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.FormalType").links(_links("formal", "schema")).uniques("formal"))
    HasResult = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.HasResult").links(_links("function", "schema")).uniques("function"))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Formal")
        .ref(True)
        .properties([lambda t: t.name("name").type([Text])])
        .adjacencies([
            lambda t: t.name("function").relation([HasFormal]).me("formal"),
            lambda t: t.name("schema").relation([FormalType]).me("formal"),
        ])
    ))
    m.Schemas.Object(Function, lambda o: (
        o
        .properties([lambda t: t.name("name").type([Text])])
        .adjacencies([
            lambda t: t.name("formals").relation([HasFormal]).me("function"),
            lambda t: t.name("result").relation([HasResult]).me("function"),
            lambda t: t.name("calls").relation([Calls]).me("function"),
        ])
    ))

    # --- Intrinsics: named reference objects implementing functions; the native code is registered against them ---

    Implements = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.Implements").links(_links("intrinsic", "function")))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Intrinsic")
        .ref(True)
        .description("Native code, registered at run time under its name: no model holds code")
        .properties([lambda t: t.name("name").type([Text])])
        .adjacencies([lambda t: t.name("implements").relation([Implements]).me("intrinsic")])
    ))
    m.Schemas.Object(Function, lambda o: o.adjacencies([lambda t: t.name("intrinsics").relation([Implements]).me("function")]))

    # --- Domains, and the schemas terms and scalars have: the meta-schemas extended, named from both ends ---

    HasSchema = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.HasSchema").links(_links("term", "schema")).uniques("term"))
    HasDomain = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.HasDomain").links(_links("schema", "domain")).uniques("schema"))
    Domain = m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Domain")
        .ref(True)
        .description("A scalar domain a dialect defines, natural to its language (int8, IEEE 754 binary32, ...)")
        .properties([lambda t: t.name("name").type([Text])])
        .adjacencies([lambda t: t.name("schemas").relation([HasDomain]).me("domain")])
    ))
    m.Schemas.Object(Term, lambda o: o.adjacencies([lambda t: t.name("schema").relation([HasSchema]).me("term")]))
    m.Schemas.Object(B.Meta.Type, lambda o: o.adjacencies([  # every kind of type: scalar, object, container, ...
        lambda t: t.name("formals").relation([FormalType]).me("schema"),
        lambda t: t.name("results").relation([HasResult]).me("schema"),
        lambda t: t.name("terms").relation([HasSchema]).me("schema"),
    ]))
    m.Schemas.Object(B.OfScalar.Schema, lambda o: o.adjacencies([lambda t: t.name("domain").relation([HasDomain]).me("schema")]))
    del Domain


def install() -> None:
    """Extends the framework with these schemas, once per process."""
    B.extend(NAME, framework)
