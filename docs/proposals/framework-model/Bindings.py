"""Parameters, bindings and sizes as model (a draft, for review): what moves from mbse-schemas (decisions 4, 6 and 14).

Proposed home: `python3/mbse/Expressions/Framework/`. A schema or a domain declares value parameters, each ranging over
a domain; an instantiation binds them, each to an expression's root. An instantiation is a refinement (a named one:
`Square` refines `Matrix`, binding its rows and columns) or a use (a property typed `Matrix`, binding its rows). A
scalar's size is a binding of its domain's parameter. mbse-schemas keeps the parameters that denote schemas.
"""

from __future__ import annotations

from mbse.Schemas.Framework import Builders as B

import Framework

NAME = "mbse.Expressions.Framework.Bindings"


def bindings(m) -> None:
    """Builds the parameters' and bindings' schemas, and extends the meta-schemas and the framework's to link them."""
    Domain, Root = m.registered("Expressions.Framework.Domain"), m.registered("Expressions.Framework.Root")
    HasParameter = m.Schemas.Relation(lambda r: (  # declared by a schema or a domain, in declaration order
        r.name("Expressions.Framework.HasParameter").links([lambda t: t.name("owner"), lambda t: t.name("parameter")]).uniques("parameter")
    ))
    Ranges = m.Schemas.Relation(lambda r: (  # the domain a parameter's values are in
        r.name("Expressions.Framework.Ranges").links([lambda t: t.name("parameter"), lambda t: t.name("domain")]).uniques("parameter")
    ))
    Binds = m.Schemas.Relation(lambda r: r.name("Expressions.Framework.Binds").links([lambda t: t.name("binding"), lambda t: t.name("parameter")]).uniques("binding"))
    BoundTo = m.Schemas.Relation(lambda r: (  # a binding's value: an expression, which may name parameters in scope
        r.name("Expressions.Framework.BoundTo").links([lambda t: t.name("binding"), lambda t: t.name("root")]).uniques([["binding"], ["root"]])
    ))
    HasBinding = m.Schemas.Relation(lambda r: (  # where a parameter is bound: an instantiation
        r.name("Expressions.Framework.HasBinding").links([lambda t: t.name("site"), lambda t: t.name("binding")]).uniques("binding")
    ))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Parameter")
        .ref(True)
        .description("A value a schema or a domain is parametric in, ranging over a domain: a matrix's rows, a width")
        .properties([lambda t: t.name("name").type([B.Meta.OfStr])])
        .adjacencies([
            lambda t: t.name("owner").relation([HasParameter]).me("parameter"),
            lambda t: t.name("domain").relation([Ranges]).me("parameter"),
            lambda t: t.name("bindings").relation([Binds]).me("parameter"),
        ])
    ))
    m.Schemas.Object(lambda o: (
        o
        .name("Expressions.Framework.Binding")
        .ref(True)
        .description("A parameter's value at an instantiation: a refinement, or a use of a parametric schema")
        .adjacencies([
            lambda t: t.name("parameter").relation([Binds]).me("binding"),
            lambda t: t.name("value").relation([BoundTo]).me("binding"),
            lambda t: t.name("site").relation([HasBinding]).me("binding"),
        ])
    ))
    m.Schemas.Object(Domain, lambda o: o.adjacencies([
        lambda t: t.name("value_parameters").relation([HasParameter]).me("owner"),
        lambda t: t.name("ranged").relation([Ranges]).me("domain"),
    ]))
    m.Schemas.Object(Root, lambda o: o.adjacencies([lambda t: t.name("binding").relation([BoundTo]).me("root")]))
    m.Schemas.Object(B.Meta.Type, lambda o: o.adjacencies([  # a schema declares them, and a refinement binds them
        lambda t: t.name("value_parameters").relation([HasParameter]).me("owner"),
        lambda t: t.name("bindings").relation([HasBinding]).me("site"),
    ]))
    m.Schemas.Object(B.Meta.Typed, lambda o: o.adjacencies([  # a use binds them: a property, a branch, a part, ...
        lambda t: t.name("bindings").relation([HasBinding]).me("site"),
    ]))


def install() -> None:
    Framework.install()
    B.extend(NAME, bindings)
