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
SCALARS = {"Int": B.Meta.OfInt, "Float": B.Meta.OfFloat, "Str": B.Meta.OfStr, "Bool": B.Meta.OfBool,
           "Bytes": B.Meta.OfBytes}


def dialect(m) -> None:
    """Extends the framework's `Value`: a property per scalar Basic has, as the user named them (`AsIntValue`)."""
    Value = m.registered("Expressions.Framework.Value")
    m.Schemas.Object(Value, lambda o: o.properties([
        lambda t, name=name, schema=schema: t.name(f"As{name}Value").type([schema]) for name, schema in SCALARS.items()
    ]))


def install(store) -> dict[str, Any]:
    """Builds Basic's vocabulary in `store`: a domain per scalar, and functions, each implemented by an intrinsic.
    Expressions do not link it: a call names its function, and binding finds it here."""
    domains = {
        name: store.Expressions.Framework.Domain(lambda d, name=name, schema=schema: (
            d.name(name.lower()).schemas(lambda a: a.insert(lambda e: e.schema(schema)))
        ))
        for name, schema in SCALARS.items()
    }

    def function(name: str, formals: list[str], result: Any = None) -> Any:
        """A function named `name`, of formals untyped (level 0: a call binds to an intrinsic for its arguments' types),
        with its result typed by `result` where it is fixed."""
        made = store.Expressions.Framework.Function(lambda f: f.name(name))
        for index, formal in enumerate(formals):
            store.Expressions.Framework.Formal(lambda x, formal=formal, index=index: (
                x.name(formal).function(lambda a: a.insert(lambda e: e.function(made).index(index)))
            ))
        if result is not None:
            store.Expressions.Framework.Function(made, lambda f: f.result(lambda a: a.insert(lambda e: e.schema(result))))
        store.Expressions.Framework.Intrinsic(lambda i: (
            i.name(f"basic.{name}").implements(lambda a: a.insert(lambda e: e.function(made)))
        ))
        return made

    integer = domains["Int"]
    width = store.Expressions.Framework.Parameter(lambda p: (  # an int's size: a parameter of the domain, in bits
        p.name("width").domain([integer]).owner(lambda a: a.insert(lambda e: e.owner(integer)))
    ))
    functions = {
        "add": function("add", ["a", "b"]),  # add[T](a: T, b: T) -> T, at level 0
        "lt": function("lt", ["a", "b"], B.Meta.OfBool),
        "not": function("not", ["a"], B.Meta.OfBool),
    }
    return {"domains": domains, "functions": functions, "width": width}


def _literal(value: int):
    return lambda t: t.as_union(lambda u: u.literal(lambda o: o.value(lambda v: v.as_object(lambda x: x.AsIntValue(value)))))


def _variable(name: str):
    return lambda t: t.as_union(lambda u: u.variable(lambda o: o.name(name)))


def _root(store, term) -> Any:
    return store.Expressions.Framework.Root(lambda r: r.term(lambda p: p.as_value(term)))


def _binding(store, parameter, term) -> Any:
    return store.Expressions.Framework.Binding(lambda b: b.parameter([parameter]).value([_root(store, term)]))


def sizes(store, vocabulary: dict[str, Any]) -> dict[str, Any]:
    """Parameters bound at instantiations: a scalar's size as its domain's width, and a matrix's rows and columns, bound
    by a refinement (a named instantiation, `Square`) and by a use (a property typed `Matrix`)."""
    framework, integer, width = store.Expressions.Framework, vocabulary["domains"]["Int"], vocabulary["width"]

    def parameter(owner, name: str) -> Any:
        return framework.Parameter(lambda p: p.name(name).domain([integer]).owner(lambda a: a.insert(lambda e: e.owner(owner))))

    int32 = store.Schemas.Scalar(lambda s: (
        s.name("Int32").token("int").domain([integer]).bindings([_binding(store, width, _literal(32))])
    ))
    word = store.Schemas.Scalar(lambda s: s.name("Word").token("int").domain([integer]))
    parameter(word, "w")
    store.Schemas.Scalar(word, lambda s: s.bindings([_binding(store, width, _variable("w"))]))  # width = w
    matrix = store.Schemas.Object(lambda o: (
        o.name("Matrix").properties([lambda t: t.name("cells").type([store.Schemas.Container(lambda c: (
            c.index([B.Meta.OfInt]).element([B.Meta.OfFloat])
        ))])])
    ))
    rows, cols = parameter(matrix, "rows"), parameter(matrix, "cols")
    square = store.Schemas.Object(lambda o: o.name("Square").refines([matrix]))  # a named instantiation
    parameter(square, "n")
    store.Schemas.Object(square, lambda o: o.bindings([_binding(store, rows, _variable("n")),
                                                     _binding(store, cols, _variable("n"))]))
    board = store.Schemas.Object(lambda o: (  # a use: the property binds the rows; the columns stay unbound
        o.name("Board").ref(True).properties([lambda t: t.name("grid").type([matrix]).bindings([
            _binding(store, rows, _literal(8)),
        ])])
    ))
    return {"Int32": int32, "Word": word, "Matrix": matrix, "Square": square, "Board": board}


def example(store) -> Any:
    """`x + 1 > 0`, written `lt(0, add(x, 1))`: an expression's root, a reference object, holding one nested value, its term;
    each call names its function, which binding resolves against the vocabulary by name and arguments' types."""

    def literal(value: int):
        return lambda t: t.as_union(lambda u: u.literal(lambda o: o.value(lambda v: v.as_object(lambda x: x.AsIntValue(value)))))

    def variable(name: str):  # free: Basic permits it, bound by the caller's scope
        return lambda t: t.as_union(lambda u: u.variable(lambda o: o.name(name)))

    def call(function: str, *arguments):
        def written(container):
            for index, argument in enumerate(arguments):
                argument(container.at(index))
            return container

        return lambda t: t.as_union(lambda u: u.call(lambda o: (
            o
            .function(function)
            .arguments(lambda a: a.as_value(lambda v: v.as_container(written)))
        )))

    term = call("lt", literal(0), call("add", variable("x"), literal(1)))
    return store.Expressions.Framework.Root(lambda r: r.term(lambda p: p.as_value(term)).schema([B.Meta.OfBool]))


def install_dialect() -> None:
    Bindings.install()
    B.extend(NAME, dialect)
