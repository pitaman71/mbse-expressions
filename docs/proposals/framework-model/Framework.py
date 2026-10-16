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

    # --- Terms: values, an expression one nested value; the kinds a union (decision 3), which holds itself ---

    Term = m.Schemas.Union(lambda u: u.name("Expressions.Framework.Term"))  # its branches, the kinds, below
    Terms = m.Schemas.Container(lambda c: c.index([Int]).element([Term]))  # in order
    Value = m.Schemas.Object(lambda o: (  # each dialect adds a property per scalar it has
        o
        .name("Expressions.Framework.Value")
        .description("A literal's value: one property set, of the properties the dialects add (AsIntValue, ...)")
    ))

    def kind(name, description, *properties):
        return m.Schemas.Object(lambda o: (
            o
            .name(f"Expressions.Framework.{name}")
            .description(description)
            .properties(list(properties))
        ))

    def text(name):
        return lambda t: t.name(name).type([Text])

    def term(name):
        return lambda t: t.name(name).type([Term])

    kinds = {
        "literal": kind("Literal", "A value, written in the term", lambda t: t.name("value").type([Value])),
        "variable": kind("Variable", "A name, bound by an enclosing binder, or free where the dialect permits",
                         text("name")),
        "call": kind("Call", "A function, named, applied to arguments: bound by its name and its arguments' types",
                     text("function"), lambda t: t.name("arguments").type([Terms])),
        "let": kind("Let", "Binds its variable to its value within its body", text("variable"), term("value"),
                    term("body")),
        "map": kind("Map", "Binds its variable to each item of its collection, giving its body's value for each, in order",
                    text("variable"), term("collection"), term("body")),
        "reduce": kind("Reduce", "Folds its collection: binds its accumulator, from its initial value, and its variable "
                       "to each item", text("variable"), text("accumulator"), term("collection"), term("initial"),
                       term("body")),
    }
    m.Schemas.Union(Term, lambda u: u.branches([
        lambda t, name=name, schema=schema: t.name(name).type([schema]) for name, schema in kinds.items()
    ]))

    # --- The expression: the reference object that holds a term, which is all that is linked (HasSchema, requires) ---

    HasSchema = m.Schemas.Relation(lambda r: (
        r
        .name("Expressions.Framework.HasSchema")
        .links(_links("expression", "schema"))
        .uniques("expression")
    ))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Expression")
        .ref(True)
        .description("An expression: its term, a value; the one object other packages link")
        .properties([term("term")])
        .adjacencies([lambda t: t.name("schema").relation([HasSchema]).me("expression")])
    ))

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
    Implements = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.Implements").links(_links("intrinsic", "function")))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Formal")
        .ref(True)
        .properties([text("name")])
        .adjacencies([
            lambda t: t.name("function").relation([HasFormal]).me("formal"),
            lambda t: t.name("schema").relation([FormalType]).me("formal"),
        ])
    ))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Function")
        .ref(True)
        .properties([text("name")])
        .adjacencies([
            lambda t: t.name("formals").relation([HasFormal]).me("function"),
            lambda t: t.name("result").relation([HasResult]).me("function"),
            lambda t: t.name("intrinsics").relation([Implements]).me("function"),
        ])
    ))

    # --- Intrinsics: named reference objects implementing functions; the native code is registered against them ---

    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Intrinsic")
        .ref(True)
        .description("Native code, registered at run time under its name: no model holds code")
        .properties([text("name")])
        .adjacencies([lambda t: t.name("implements").relation([Implements]).me("intrinsic")])
    ))

    # --- Domains, and the schemas expressions and scalars have: the meta-schemas extended, named from both ends ---

    HasDomain = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.HasDomain").links(_links("schema", "domain")).uniques("schema"))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Domain")
        .ref(True)
        .description("A scalar domain a dialect defines, natural to its language (int8, IEEE 754 binary32, ...)")
        .properties([text("name")])
        .adjacencies([lambda t: t.name("schemas").relation([HasDomain]).me("domain")])
    ))
    m.Schemas.Object(B.Meta.Type, lambda o: o.adjacencies([  # every kind of type: scalar, object, container, ...
        lambda t: t.name("formals").relation([FormalType]).me("schema"),
        lambda t: t.name("results").relation([HasResult]).me("schema"),
        lambda t: t.name("expressions").relation([HasSchema]).me("schema"),
    ]))
    m.Schemas.Object(B.OfScalar.Schema, lambda o: o.adjacencies([lambda t: t.name("domain").relation([HasDomain]).me("schema")]))


def install() -> None:
    """Extends the framework with these schemas, once per process."""
    B.extend(NAME, framework)
