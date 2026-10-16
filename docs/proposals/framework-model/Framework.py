"""The expressions framework as a model: the schemas every dialect's expressions are data of (a draft, for review).

Proposed home: `python3/mbse/Expressions/Framework/`. It extends the framework of mbse-schemas once per process
(`Builders.extend`), so that every store holds these schemas, as it holds the meta-schemas (mbse-schemas'
docs/SCHEMA_EXTENSION.md). What it decides, and what it leaves open, is in README.md beside it.
"""

from __future__ import annotations

from mbse.Schemas.Framework import Builders as B

NAME = "mbse.Expressions.Framework"


def framework(m) -> None:
    """Builds the framework's schemas in `m`, the framework's store, and extends the meta-schemas they link."""

    # --- Terms: values, an expression one nested value; the kinds a union (decision 3), which holds itself ---

    Term = m.Schemas.Union(lambda u: u.name("Expressions.Framework.Term"))  # its branches, the kinds, below
    Terms = m.Schemas.Container(lambda c: c.index([B.Meta.OfInt]).element([Term]))  # in order
    Value = m.Schemas.Object(lambda o: (  # each dialect adds a property per scalar it has
        o
        .name("Expressions.Framework.Value")
        .description("A literal's value: one property set, of the properties the dialects add (AsIntValue, ...)")
    ))
    Literal = m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Literal")
        .description("A value, written in the term")
        .properties([lambda t: t.name("value").type([Value])])
    ))
    Variable = m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Variable")
        .description("A name, bound by an enclosing binder, or free where the dialect permits")
        .properties([lambda t: t.name("name").type([B.Meta.OfStr])])
    ))
    Call = m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Call")
        .description("A function, named, applied to arguments: bound by its name and its arguments' types")
        .properties([
            lambda t: t.name("function").type([B.Meta.OfStr]),
            lambda t: t.name("arguments").type([Terms]),
        ])
    ))
    Let = m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Let")
        .description("Binds its variable to its value within its body")
        .properties([
            lambda t: t.name("variable").type([B.Meta.OfStr]),
            lambda t: t.name("value").type([Term]),
            lambda t: t.name("body").type([Term]),
        ])
    ))
    Map = m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Map")
        .description("Binds its variable to each item of its collection, giving its body's value for each, in order")
        .properties([
            lambda t: t.name("variable").type([B.Meta.OfStr]),
            lambda t: t.name("collection").type([Term]),
            lambda t: t.name("body").type([Term]),
        ])
    ))
    Reduce = m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Reduce")
        .description("Folds its collection: binds its accumulator, from its initial value, and its variable to each item")
        .properties([
            lambda t: t.name("variable").type([B.Meta.OfStr]),
            lambda t: t.name("accumulator").type([B.Meta.OfStr]),
            lambda t: t.name("collection").type([Term]),
            lambda t: t.name("initial").type([Term]),
            lambda t: t.name("body").type([Term]),
        ])
    ))
    m.Schemas.Union(Term, lambda u: u.branches([
        lambda t: t.name("literal").type([Literal]),
        lambda t: t.name("variable").type([Variable]),
        lambda t: t.name("call").type([Call]),
        lambda t: t.name("let").type([Let]),
        lambda t: t.name("map").type([Map]),
        lambda t: t.name("reduce").type([Reduce]),
    ]))

    # --- An expression's root: the reference object holding its term, all that is linked (HasSchema, requires) ---

    HasSchema = m.Schemas.Relation(lambda r: (
        r
        .name("Expressions.Framework.HasSchema")
        .links([lambda t: t.name("root"), lambda t: t.name("schema")])
        .uniques("root")
    ))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Root")
        .ref(True)
        .description("An expression's root: its term, a value; the one object other packages link")
        .properties([lambda t: t.name("term").type([Term])])
        .adjacencies([lambda t: t.name("schema").relation([HasSchema]).me("root")])
    ))
    # the root's other ends are declared with the relations below: a function's body (`body_of`)

    # --- Functions: signatures, each formal and the result typed by a schema; several may share a name ---

    HasFormal = m.Schemas.Relation(lambda r: (
        r
        .name("Expressions.Framework.HasFormal")
        .links([lambda t: t.name("function"), lambda t: t.name("formal")])
        .properties([lambda t: t.name("index").type([B.Meta.OfInt])])
        .uniques([["function", "index"], ["formal"]])
    ))
    FormalType = m.Schemas.Relation(lambda r: (
        r
        .name("Expressions.Framework.FormalType")
        .links([lambda t: t.name("formal"), lambda t: t.name("schema")])
        .uniques("formal")
    ))
    HasResult = m.Schemas.Relation(lambda r: (
        r
        .name("Expressions.Framework.HasResult")
        .links([lambda t: t.name("function"), lambda t: t.name("schema")])
        .uniques("function")
    ))
    Implements = m.Schemas.Relation(lambda r: (
        r
        .name("Expressions.Framework.Implements")
        .links([lambda t: t.name("intrinsic"), lambda t: t.name("function")])
    ))
    HasBody = m.Schemas.Relation(lambda r: (  # a function written in a dialect: its body, an expression's root
        r
        .name("Expressions.Framework.HasBody")
        .links([lambda t: t.name("function"), lambda t: t.name("root")])
        .uniques([["function"], ["root"]])
    ))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Formal")
        .ref(True)
        .properties([lambda t: t.name("name").type([B.Meta.OfStr])])
        .adjacencies([
            lambda t: t.name("function").relation([HasFormal]).me("formal"),
            lambda t: t.name("schema").relation([FormalType]).me("formal"),
        ])
    ))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Function")
        .ref(True)
        .properties([lambda t: t.name("name").type([B.Meta.OfStr])])
        .adjacencies([
            lambda t: t.name("formals").relation([HasFormal]).me("function"),
            lambda t: t.name("result").relation([HasResult]).me("function"),
            lambda t: t.name("intrinsics").relation([Implements]).me("function"),
            lambda t: t.name("body").relation([HasBody]).me("function"),
        ])
    ))

    m.Schemas.Object(m.registered("Expressions.Framework.Root"), lambda o: o.adjacencies([
        lambda t: t.name("body_of").relation([HasBody]).me("root"),
    ]))

    # --- Intrinsics: named reference objects implementing functions; the native code is registered against them ---

    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Intrinsic")
        .ref(True)
        .description("Native code, registered at run time under its name: no model holds code")
        .properties([lambda t: t.name("name").type([B.Meta.OfStr])])
        .adjacencies([lambda t: t.name("implements").relation([Implements]).me("intrinsic")])
    ))

    # --- Domains, reached in two steps (decision 21): a root has a schema, a scalar schema a domain; named both ways ---

    HasDomain = m.Schemas.Relation(lambda r: (
        r
        .name("Expressions.Framework.HasDomain")
        .links([lambda t: t.name("schema"), lambda t: t.name("domain")])
        .uniques("schema")
    ))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Domain")
        .ref(True)
        .description("A scalar domain a dialect defines, natural to its language (int8, IEEE 754 binary32, ...)")
        .properties([lambda t: t.name("name").type([B.Meta.OfStr])])
        .adjacencies([lambda t: t.name("schemas").relation([HasDomain]).me("domain")])
    ))
    m.Schemas.Object(B.Meta.Type, lambda o: o.adjacencies([  # every kind of type: scalar, object, container, ...
        lambda t: t.name("formals").relation([FormalType]).me("schema"),
        lambda t: t.name("results").relation([HasResult]).me("schema"),
        lambda t: t.name("roots").relation([HasSchema]).me("schema"),
    ]))
    m.Schemas.Object(B.OfScalar.Schema, lambda o: o.adjacencies([
        lambda t: t.name("domain").relation([HasDomain]).me("schema"),
    ]))


def install() -> None:
    """Extends the framework with these schemas, once per process."""
    B.extend(NAME, framework)
