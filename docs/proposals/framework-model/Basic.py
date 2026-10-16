"""The Basic dialect as a model: what it adds to the framework, and its vocabulary (a draft, for review).

Proposed home: `python3/mbse/Expressions/Dialects/Basic/`. Basic extends the framework's `Value` with a property per
scalar it has, once per process. Its vocabulary (domains, functions, intrinsics) is data, objects of the framework's
schemas, so it is built in each store that holds Basic's expressions (`install`). See README.md beside it.
"""

from __future__ import annotations

from typing import Any

from mbse.Schemas.Framework import Builders as B

import Bindings
import Framework

NAME = "mbse.Expressions.Dialects.Basic"


def dialect(m) -> None:
    """Extends the framework's `Value`: a property per scalar Basic has, as the user named them (`AsIntValue`)."""
    m.Schemas.Object(m.registered("Expressions.Framework.Value"), lambda o: o.properties([
        lambda t: t.name("AsIntValue").type([B.Meta.OfInt]),
        lambda t: t.name("AsFloatValue").type([B.Meta.OfFloat]),
        lambda t: t.name("AsStrValue").type([B.Meta.OfStr]),
        lambda t: t.name("AsBoolValue").type([B.Meta.OfBool]),
        lambda t: t.name("AsBytesValue").type([B.Meta.OfBytes]),
    ]))


def install(store) -> dict[str, Any]:
    """Builds Basic's vocabulary in `store`: a domain per scalar, an int's width, and functions, each implemented by an
    intrinsic. Expressions do not link it: a call names its function, and binding finds it here."""
    F = store.Expressions.Framework
    integer = F.Domain(lambda d: d.name("int").schemas([B.Meta.OfInt]))
    real = F.Domain(lambda d: d.name("float").schemas([B.Meta.OfFloat]))
    text = F.Domain(lambda d: d.name("str").schemas([B.Meta.OfStr]))
    boolean = F.Domain(lambda d: d.name("bool").schemas([B.Meta.OfBool]))
    data = F.Domain(lambda d: d.name("bytes").schemas([B.Meta.OfBytes]))
    width = F.Parameter(lambda p: p.name("width").domain([integer]).owner([integer]))  # an int's size, in bits

    add = F.Function(lambda f: (  # add(a, b): untyped formals, level 0
        f
        .name("add")
        .formals(lambda a: (
            a
            .insert(lambda e: e.index(0).formal(lambda x: x.name("a")))
            .insert(lambda e: e.index(1).formal(lambda x: x.name("b")))
        ))
        .intrinsics([lambda i: i.name("basic.add")])
    ))
    lt = F.Function(lambda f: (
        f
        .name("lt")
        .formals(lambda a: (
            a
            .insert(lambda e: e.index(0).formal(lambda x: x.name("a")))
            .insert(lambda e: e.index(1).formal(lambda x: x.name("b")))
        ))
        .result([B.Meta.OfBool])
        .intrinsics([lambda i: i.name("basic.lt")])
    ))
    negation = F.Function(lambda f: (
        f
        .name("not")
        .formals(lambda a: a.insert(lambda e: e.index(0).formal(lambda x: x.name("a"))))
        .result([B.Meta.OfBool])
        .intrinsics([lambda i: i.name("basic.not")])
    ))
    return {"domains": {"Int": integer, "Float": real, "Str": text, "Bool": boolean, "Bytes": data},
            "functions": {"add": add, "lt": lt, "not": negation}, "width": width}


def sizes(store, vocabulary: dict[str, Any]) -> dict[str, Any]:
    """Parameters bound at instantiations: a scalar's size as its domain's width, and a matrix's rows and columns, bound
    by a refinement (a named instantiation, `Square`) and by a use (a property typed `Matrix`). Each binding is written
    from its own end, naming its site, since a schema's extension adjacency links what exists."""
    F, integer, width = store.Expressions.Framework, vocabulary["domains"]["Int"], vocabulary["width"]

    Int32 = store.Schemas.Scalar(lambda s: s.name("Int32").token("int").domain([integer]))
    F.Binding(lambda b: (  # width = 32
        b
        .site([Int32])
        .parameter([width])
        .value([lambda r: r.term(lambda t: t.literal(lambda l: l.value(lambda v: v.AsIntValue(32))))])
    ))

    Word = store.Schemas.Scalar(lambda s: s.name("Word").token("int").domain([integer]))
    F.Parameter(lambda p: p.name("w").domain([integer]).owner([Word]))
    F.Binding(lambda b: (  # width = w
        b
        .site([Word])
        .parameter([width])
        .value([lambda r: r.term(lambda t: t.variable(lambda v: v.name("w")))])
    ))

    Matrix = store.Schemas.Object(lambda o: (
        o
        .name("Matrix")
        .properties([lambda t: t.name("cells").type([store.Schemas.Container(lambda c: (
            c.index([B.Meta.OfInt]).element([B.Meta.OfFloat])
        ))])])
    ))
    rows = F.Parameter(lambda p: p.name("rows").domain([integer]).owner([Matrix]))
    cols = F.Parameter(lambda p: p.name("cols").domain([integer]).owner([Matrix]))

    Square = store.Schemas.Object(lambda o: o.name("Square").refines([Matrix]))  # a named instantiation
    F.Parameter(lambda p: p.name("n").domain([integer]).owner([Square]))
    F.Binding(lambda b: (  # rows = n
        b
        .site([Square])
        .parameter([rows])
        .value([lambda r: r.term(lambda t: t.variable(lambda v: v.name("n")))])
    ))
    F.Binding(lambda b: (  # cols = n
        b
        .site([Square])
        .parameter([cols])
        .value([lambda r: r.term(lambda t: t.variable(lambda v: v.name("n")))])
    ))

    Board = store.Schemas.Object(lambda o: (  # a use: the property binds the rows; the columns stay unbound
        o
        .name("Board")
        .ref(True)
        .properties([lambda t: t.name("grid").type([Matrix])])
    ))
    F.Binding(lambda b: (  # rows = 8
        b
        .site([Board.properties["grid"]])
        .parameter([rows])
        .value([lambda r: r.term(lambda t: t.literal(lambda l: l.value(lambda v: v.AsIntValue(8))))])
    ))
    return {"Int32": Int32, "Word": Word, "Matrix": Matrix, "Square": Square, "Board": Board}


def example(store) -> Any:
    """`x + 1 > 0`, written `lt(0, add(x, 1))`: an expression's root, a reference object, holding one nested value, its
    term, written in place through the visitors; each call names its function, which binding resolves against the
    vocabulary by name and arguments' types. `x` is free: Basic permits it, bound by the caller's scope."""
    return store.Expressions.Framework.Root(lambda r: (
        r
        .schema([B.Meta.OfBool])
        .term(lambda t: t.call(lambda lt: (
            lt
            .function("lt")
            .arguments([
                lambda a: a.literal(lambda l: l.value(lambda v: v.AsIntValue(0))),
                lambda a: a.call(lambda add: (
                    add
                    .function("add")
                    .arguments([
                        lambda b: b.variable(lambda v: v.name("x")),
                        lambda b: b.literal(lambda l: l.value(lambda v: v.AsIntValue(1))),
                    ])
                )),
            ])
        )))
    ))


def function(store, body) -> Any:
    """What `Expressions.FromFunction(store, lambda x: x + 1 > 0)` gives, written out: a function, unnamed as a lambda is,
    whose formal is the lambda's parameter, untyped, and whose body is the expression's root. (In Basic's terms here; it
    reads Python into the Python dialect.)"""
    return store.Expressions.Framework.Function(lambda f: (
        f
        .formals(lambda a: a.insert(lambda e: e.index(0).formal(lambda x: x.name("x"))))
        .body([body])
    ))


def install_dialect() -> None:
    Bindings.install()
    B.extend(NAME, dialect)
