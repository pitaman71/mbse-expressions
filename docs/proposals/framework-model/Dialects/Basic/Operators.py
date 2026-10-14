"""Operators: Basic's vocabulary, as data. (Proposed: python3/mbse/Expressions/Dialects/Basic/Operators.py.)

`vocabulary(store)` builds Basic's operators in `store`, which registers the framework's schemas: each a `Callable`
with its global ID (`Basic.Operators.Add`), its parameters, each with the domain of its argument where Basic gives one
(none: any value), and its result. `D` is a type parameter: the domain an operator's arguments share.
"""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Framework import Operators as F

__all__ = ["vocabulary"]


def _names(*names: str) -> Any:
    """Writes `names`, in order, into the container a property holds."""

    def write(container: Any) -> Any:
        for index, name in enumerate(names):
            container.at(index).as_scalar(name)
        return container

    return lambda prop: prop.as_value(lambda value: value.as_container(write))


def _parameters(*parameters: Any) -> Any:
    """Links `parameters`, in order, to the callable being built."""

    def link(adjacency: Any) -> Any:
        for index, parameter in enumerate(parameters):
            adjacency.insert(lambda entry, i=index, p=parameter: entry.parameter(p).index(i))
        return adjacency

    return link


def vocabulary(store: Any) -> dict[str, Any]:
    """Basic's operators, built in `store`, by global ID."""

    def parameter(name: str, domain: str | None = None) -> Any:
        built = store.builder(F.Parameter.name).name(name)
        return (built.domain(domain) if domain is not None else built).create()

    operators = [
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Equal")
            .name("eq")
            .type_parameters(_names("D"))
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.NotEqual")
            .name("ne")
            .type_parameters(_names("D"))
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Less")
            .name("lt")
            .type_parameters(_names("D"))
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.LessOrEqual")
            .name("le")
            .type_parameters(_names("D"))
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Greater")
            .name("gt")
            .type_parameters(_names("D"))
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.GreaterOrEqual")
            .name("ge")
            .type_parameters(_names("D"))
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.And")
            .name("and")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "Expressions.Domains.Bool"),
                parameter("b", "Expressions.Domains.Bool"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Or")
            .name("or")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "Expressions.Domains.Bool"),
                parameter("b", "Expressions.Domains.Bool"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Not")
            .name("not")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "Expressions.Domains.Bool"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Implies")
            .name("implies")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("a", "Expressions.Domains.Bool"),
                parameter("b", "Expressions.Domains.Bool"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Add")
            .name("add")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Subtract")
            .name("sub")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Multiply")
            .name("mul")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Negate")
            .name("neg")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.BitAnd")
            .name("bitand")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.BitOr")
            .name("bitor")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.BitXor")
            .name("bitxor")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("b", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.BitNot")
            .name("bitnot")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.ShiftLeft")
            .name("shl")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("n"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.ShiftRight")
            .name("shr")
            .type_parameters(_names("D"))
            .result("D")
            .parameters(_parameters(
                parameter("a", "D"),
                parameter("n"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Convert")
            .name("convert")
            .parameters(_parameters(
                parameter("a"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Reinterpret")
            .name("reinterpret")
            .parameters(_parameters(
                parameter("a"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Unpack")
            .name("unpack")
            .parameters(_parameters(
                parameter("a"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Pack")
            .name("pack")
            .parameters(_parameters(
                parameter("a"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Get")
            .name("get")
            .parameters(_parameters(
                parameter("object"),
                parameter("name", "Expressions.Domains.Unicode"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Has")
            .name("has")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("object"),
                parameter("name", "Expressions.Domains.Unicode"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Entries")
            .name("entries")
            .parameters(_parameters(
                parameter("object"),
                parameter("adjacency", "Expressions.Domains.Unicode"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Count")
            .name("count")
            .result("Expressions.Domains.int")
            .parameters(_parameters(
                parameter("collection"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Item")
            .name("item")
            .parameters(_parameters(
                parameter("collection"),
                parameter("index"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.In")
            .name("in")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("item"),
                parameter("collection"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Sum")
            .name("sum")
            .parameters(_parameters(
                parameter("collection"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Min")
            .name("min")
            .parameters(_parameters(
                parameter("collection"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Max")
            .name("max")
            .parameters(_parameters(
                parameter("collection"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Unique")
            .name("unique")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("collection"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.All")
            .name("all")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("collection"),
                parameter("body", "Expressions.Domains.Bool"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.Any")
            .name("any")
            .result("Expressions.Domains.Bool")
            .parameters(_parameters(
                parameter("collection"),
                parameter("body", "Expressions.Domains.Bool"),
            ))
            .create()
        ),
        (
            store.builder(F.Callable.name).as_identity("Basic.Operators.CountWhere")
            .name("count")
            .result("Expressions.Domains.int")
            .parameters(_parameters(
                parameter("collection"),
                parameter("body", "Expressions.Domains.Bool"),
            ))
            .create()
        ),
    ]
    return {operator.as_identity(): operator for operator in operators}
