"""The Basic dialect as a model: what it adds to the framework, and its vocabulary (a draft, for review).

Proposed home: `python3/mbse/Expressions/Dialects/Basic/`. Basic extends the framework's `Value` with a property per
scalar it has, once per process. Its vocabulary (domains, functions, intrinsics) is data, objects of the framework's
schemas, so it is built in each store that holds Basic's expressions (`install`). See README.md beside it.
"""

from __future__ import annotations

from typing import Any

from mbse.Schemas.Framework import Builders as B

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

    functions = {
        "add": function("add", ["a", "b"]),  # add[T](a: T, b: T) -> T, at level 0
        "lt": function("lt", ["a", "b"], B.Meta.OfBool),
        "not": function("not", ["a"], B.Meta.OfBool),
    }
    return {"domains": domains, "functions": functions}


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
    Framework.install()
    B.extend(NAME, dialect)
