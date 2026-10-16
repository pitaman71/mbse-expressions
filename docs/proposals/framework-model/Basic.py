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
    integer = F.Domain(lambda d: d.name("int").schemas(lambda a: a.insert(lambda e: e.schema(B.Meta.OfInt))))
    real = F.Domain(lambda d: d.name("float").schemas(lambda a: a.insert(lambda e: e.schema(B.Meta.OfFloat))))
    text = F.Domain(lambda d: d.name("str").schemas(lambda a: a.insert(lambda e: e.schema(B.Meta.OfStr))))
    boolean = F.Domain(lambda d: d.name("bool").schemas(lambda a: a.insert(lambda e: e.schema(B.Meta.OfBool))))
    data = F.Domain(lambda d: d.name("bytes").schemas(lambda a: a.insert(lambda e: e.schema(B.Meta.OfBytes))))
    width = F.Parameter(lambda p: (  # an int's size: a parameter of the domain, in bits
        p
        .name("width")
        .domain([integer])
        .owner(lambda a: a.insert(lambda e: e.owner(integer)))
    ))

    add = F.Function(lambda f: f.name("add"))  # add(a, b): untyped formals, level 0
    F.Formal(lambda x: x.name("a").function(lambda a: a.insert(lambda e: e.function(add).index(0))))
    F.Formal(lambda x: x.name("b").function(lambda a: a.insert(lambda e: e.function(add).index(1))))
    F.Intrinsic(lambda i: i.name("basic.add").implements(lambda a: a.insert(lambda e: e.function(add))))

    lt = F.Function(lambda f: f.name("lt").result(lambda a: a.insert(lambda e: e.schema(B.Meta.OfBool))))
    F.Formal(lambda x: x.name("a").function(lambda a: a.insert(lambda e: e.function(lt).index(0))))
    F.Formal(lambda x: x.name("b").function(lambda a: a.insert(lambda e: e.function(lt).index(1))))
    F.Intrinsic(lambda i: i.name("basic.lt").implements(lambda a: a.insert(lambda e: e.function(lt))))

    negation = F.Function(lambda f: f.name("not").result(lambda a: a.insert(lambda e: e.schema(B.Meta.OfBool))))
    F.Formal(lambda x: x.name("a").function(lambda a: a.insert(lambda e: e.function(negation).index(0))))
    F.Intrinsic(lambda i: i.name("basic.not").implements(lambda a: a.insert(lambda e: e.function(negation))))

    return {"domains": {"Int": integer, "Float": real, "Str": text, "Bool": boolean, "Bytes": data},
            "functions": {"add": add, "lt": lt, "not": negation}, "width": width}


def sizes(store, vocabulary: dict[str, Any]) -> dict[str, Any]:
    """Parameters bound at instantiations: a scalar's size as its domain's width, and a matrix's rows and columns, bound
    by a refinement (a named instantiation, `Square`) and by a use (a property typed `Matrix`)."""
    F, integer, width = store.Expressions.Framework, vocabulary["domains"]["Int"], vocabulary["width"]

    Int32 = store.Schemas.Scalar(lambda s: (
        s
        .name("Int32")
        .token("int")
        .domain([integer])
        .bindings([F.Binding(lambda b: (
            b
            .parameter([width])
            .value([F.Root(lambda r: r.term(F.Term(lambda u: u.literal(lambda l: l.value(F.Value(lambda v: v.AsIntValue(32)))))))])
        ))])
    ))

    Word = store.Schemas.Scalar(lambda s: s.name("Word").token("int").domain([integer]))
    F.Parameter(lambda p: p.name("w").domain([integer]).owner(lambda a: a.insert(lambda e: e.owner(Word))))
    store.Schemas.Scalar(Word, lambda s: s.bindings([F.Binding(lambda b: (  # width = w
        b
        .parameter([width])
        .value([F.Root(lambda r: r.term(F.Term(lambda u: u.variable(lambda v: v.name("w")))))])
    ))]))

    Matrix = store.Schemas.Object(lambda o: (
        o
        .name("Matrix")
        .properties([lambda t: t.name("cells").type([store.Schemas.Container(lambda c: (
            c.index([B.Meta.OfInt]).element([B.Meta.OfFloat])
        ))])])
    ))
    rows = F.Parameter(lambda p: p.name("rows").domain([integer]).owner(lambda a: a.insert(lambda e: e.owner(Matrix))))
    cols = F.Parameter(lambda p: p.name("cols").domain([integer]).owner(lambda a: a.insert(lambda e: e.owner(Matrix))))

    Square = store.Schemas.Object(lambda o: o.name("Square").refines([Matrix]))  # a named instantiation
    F.Parameter(lambda p: p.name("n").domain([integer]).owner(lambda a: a.insert(lambda e: e.owner(Square))))
    n = F.Term(lambda u: u.variable(lambda v: v.name("n")))
    store.Schemas.Object(Square, lambda o: o.bindings([
        F.Binding(lambda b: b.parameter([rows]).value([F.Root(lambda r: r.term(n))])),
        F.Binding(lambda b: b.parameter([cols]).value([F.Root(lambda r: r.term(n))])),
    ]))

    Board = store.Schemas.Object(lambda o: (  # a use: the property binds the rows; the columns stay unbound
        o
        .name("Board")
        .ref(True)
        .properties([lambda t: (
            t
            .name("grid")
            .type([Matrix])
            .bindings([F.Binding(lambda b: (
                b
                .parameter([rows])
                .value([F.Root(lambda r: r.term(F.Term(lambda u: u.literal(lambda l: l.value(F.Value(lambda v: v.AsIntValue(8)))))))])
            ))])
        )])
    ))
    return {"Int32": Int32, "Word": Word, "Matrix": Matrix, "Square": Square, "Board": Board}


def example(store) -> Any:
    """`x + 1 > 0`, written `lt(0, add(x, 1))`: an expression's root, a reference object, holding one nested value, its
    term, built of standalone values; each call names its function, which binding resolves against the vocabulary by
    name and arguments' types. `x` is free: Basic permits it, bound by the caller's scope."""
    F = store.Expressions.Framework
    zero = F.Term(lambda u: u.literal(lambda l: l.value(F.Value(lambda v: v.AsIntValue(0)))))
    one = F.Term(lambda u: u.literal(lambda l: l.value(F.Value(lambda v: v.AsIntValue(1)))))
    x = F.Term(lambda u: u.variable(lambda v: v.name("x")))
    add = F.Term(lambda u: u.call(lambda c: c.function("add").arguments([x, one])))
    lt = F.Term(lambda u: u.call(lambda c: c.function("lt").arguments([zero, add])))
    return F.Root(lambda r: r.term(lt).schema([B.Meta.OfBool]))


def function(store, body) -> Any:
    """What `Expressions.FromFunction(store, lambda x: x + 1 > 0)` gives, written out: a function, unnamed as a lambda is,
    whose formal is the lambda's parameter, untyped, and whose body is the expression's root. (In Basic's terms here; it
    reads Python into the Python dialect.)"""
    F = store.Expressions.Framework
    made = F.Function(lambda f: f.body([body]))
    F.Formal(lambda x: x.name("x").function(lambda a: a.insert(lambda e: e.function(made).index(0))))
    return made


def install_dialect() -> None:
    Bindings.install()
    B.extend(NAME, dialect)
