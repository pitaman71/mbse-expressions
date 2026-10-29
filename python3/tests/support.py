"""Shared helpers for the test notebooks. Each notebook runs in its own kernel and makes its own stores."""

from __future__ import annotations

import inspect
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any


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
