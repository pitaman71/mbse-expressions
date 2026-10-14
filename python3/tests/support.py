"""Shared helpers for the test notebooks. Each notebook runs in its own kernel and makes its own stores."""

from __future__ import annotations

import inspect
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from mbse.Schemas.Framework import Schemas


@contextmanager
def raises(*errors: type[BaseException], match: str | None = None) -> Iterator[None]:
    """Asserts that the block raises one of `errors`, optionally with `match` in the message."""
    try:
        yield
    except errors as error:
        if match is not None and match not in str(error):
            raise AssertionError(f"expected {match!r} in {str(error)!r}") from error
        return
    raise AssertionError(f"expected one of {[e.__name__ for e in errors]}")


def text(name: str, native: type = str):
    """Property Spec for a scalar-typed property."""
    return lambda prop: prop.name(name).of(Schemas.OfScalar.Data(native))


def container(element: Any, index: type = int) -> Any:
    """A container schema of `element`s (a schema, or a scalar type), by `index`: dense by int, a dict by str."""
    of = lambda t: Schemas.OfScalar.Data(t) if isinstance(t, type) else t  # noqa: E731
    return Schemas.OfContainer.Builder().index(of(index)).element(of(element)).create()


def filled(values: Any) -> Any:
    """A property Spec writing `values` into the container the property holds: a list by position, a dict by key, each
    a scalar or, nested, a list or dict."""
    return lambda prop: prop.as_value(lambda a: _fill(a, values) or a)


def _fill(element: Any, value: Any) -> None:
    if isinstance(value, (list, dict)):
        items = value.items() if isinstance(value, dict) else enumerate(value)
        element.as_container(lambda c: [_fill(c.at(i), v) for i, v in items] and c or c)
    else:
        element.as_scalar(value)


def protocol_methods(protocol: type) -> dict[str, inspect.Signature]:
    """Public methods declared by a `typing.Protocol`, with their signatures."""
    return {
        name: inspect.signature(member)
        for name, member in vars(protocol).items()
        if callable(member) and not name.startswith("_")
    }


def conformance_problems(implementation: type, protocol: type) -> list[str]:
    """Methods of `protocol` that `implementation` lacks, or declares with a different number of parameters."""
    problems = []
    for name, expected in protocol_methods(protocol).items():
        member = getattr(implementation, name, None)
        if not callable(member):
            problems.append(f"{implementation.__name__} lacks {protocol.__name__}.{name}")
            continue
        actual = inspect.signature(member)
        if len(actual.parameters) != len(expected.parameters):
            problems.append(
                f"{implementation.__name__}.{name}{actual} does not match {protocol.__name__}.{name}{expected}"
            )
    return problems


def instance_problems(instance: Any, protocol: type) -> list[str]:
    """The conformance check on a live instance: catches instance attributes that shadow protocol methods."""
    return [
        f"{type(instance).__name__} instance: {protocol.__name__}.{name} is not callable"
        for name in protocol_methods(protocol)
        if not callable(getattr(instance, name, None))
    ]
