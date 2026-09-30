"""Domains: the types of the values expressions denote, and the signatures of operators over them.

A `Domain` is a set of values: `contains(value)` tests membership at run time, and `includes(other)` tests statically
that every value of `other` is also one of its own. A `Signature` gives an operator's number of arguments and the domain
of its result for the domains of its arguments, or `None` when it does not apply to them. A dialect's vocabulary maps
each operator name to its signature, and `Dialect.infer` uses them to find an expression's domain without evaluating it.

Inference is permissive: a domain that `overlaps` a parameter's (one includes the other) is accepted, since `Anything`,
the domain of a value not known statically, overlaps every domain.

The implementations here are generic; each dialect's `Domains` module defines its own domains with them.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any, Protocol, runtime_checkable

__all__ = [
    "Domain", "Signature", "OfTypes", "OfValues", "OfUnion", "Anything", "Function", "Same", "Overloaded", "overlaps",
]


@runtime_checkable
class Domain(Protocol):
    """A set of values."""

    def name(self) -> str: ...

    def contains(self, value: Any) -> bool:
        """Whether `value` is in this domain."""
        ...

    def includes(self, other: Domain) -> bool:
        """Whether every value of `other` is in this domain."""
        ...


@runtime_checkable
class Signature(Protocol):
    """The domains an operator takes and gives."""

    def arity(self) -> int: ...

    def result(self, arguments: Sequence[Domain]) -> Domain | None:
        """The domain of the result for arguments of these domains; `None` if the operator does not apply to them."""
        ...

    def describe(self) -> str:
        """The signature as text, e.g. '(int, int) -> int'."""
        ...


def overlaps(a: Domain, b: Domain) -> bool:
    """Whether a value of `b` may be a value of `a`, as far as inference can tell: one includes the other."""
    return a.includes(b) or b.includes(a)


class OfTypes:
    """The values whose Python type is exactly one of `types`, e.g. `OfTypes('int', int)`; `bool` is not an `int`."""

    def __init__(self, name: str, *types: type):
        self._name, self.types = name, frozenset(types)

    def name(self) -> str:
        return self._name

    def contains(self, value: Any) -> bool:
        return type(value) in self.types

    def includes(self, other: Domain) -> bool:
        if isinstance(other, OfUnion):
            return all(self.includes(member) for member in other.members)
        return isinstance(other, OfTypes) and other.types <= self.types

    def __repr__(self) -> str:
        return self._name


class OfValues:
    """The values that satisfy `test`. It includes only itself, since a test cannot be compared statically."""

    def __init__(self, name: str, test: Callable[[Any], bool]):
        self._name, self._test = name, test

    def name(self) -> str:
        return self._name

    def contains(self, value: Any) -> bool:
        return self._test(value)

    def includes(self, other: Domain) -> bool:
        if isinstance(other, OfUnion):
            return all(self.includes(member) for member in other.members)
        return other is self

    def __repr__(self) -> str:
        return self._name


class OfUnion:
    """The values of any of `members`."""

    def __init__(self, *members: Domain):
        self.members = tuple(members)

    def name(self) -> str:
        return " | ".join(member.name() for member in self.members)

    def contains(self, value: Any) -> bool:
        return any(member.contains(value) for member in self.members)

    def includes(self, other: Domain) -> bool:
        if isinstance(other, OfUnion):
            return all(self.includes(member) for member in other.members)
        return any(member.includes(other) for member in self.members)

    def __repr__(self) -> str:
        return self.name()


class _Anything:
    """Every value: the domain of a value not known statically."""

    def name(self) -> str:
        return "any"

    def contains(self, value: Any) -> bool:
        return True

    def includes(self, other: Domain) -> bool:
        return True

    def __repr__(self) -> str:
        return "any"


Anything = _Anything()


def _join(domains: Sequence[Domain]) -> Domain:
    """One domain for several: the first when all are the same, otherwise their union."""
    distinct: list[Domain] = []
    for domain in domains:
        if not any(domain is seen for seen in distinct):
            distinct.append(domain)
    return distinct[0] if len(distinct) == 1 else OfUnion(*distinct)


class Function:
    """Takes arguments of the `parameters` domains and gives a `result`, e.g. `Function((Bool, Bool), Bool)`."""

    def __init__(self, parameters: Sequence[Domain], result: Domain):
        self.parameters, self._result = tuple(parameters), result

    def arity(self) -> int:
        return len(self.parameters)

    def result(self, arguments: Sequence[Domain]) -> Domain | None:
        if len(arguments) != len(self.parameters):
            return None
        return self._result if all(map(overlaps, self.parameters, arguments)) else None

    def exact(self, arguments: Sequence[Domain]) -> bool:
        """Whether every argument's domain is included in its parameter's, so this is the only candidate."""
        return len(arguments) == len(self.parameters) and all(p.includes(a) for p, a in zip(self.parameters, arguments))

    def describe(self) -> str:
        return f"({', '.join(p.name() for p in self.parameters)}) -> {self._result.name()}"


class Same:
    """Takes `arity` arguments of one of the `candidates` domains, all of the same one, and gives `result`, or that
    domain when `result` is None: `Same(2, (Int, Float))` is add, `Same(2, (Int, Float, Str), Bool)` is lt."""

    def __init__(self, arity: int, candidates: Sequence[Domain], result: Domain | None = None):
        self._arity, self.candidates, self._result = arity, tuple(candidates), result

    def arity(self) -> int:
        return self._arity

    def result(self, arguments: Sequence[Domain]) -> Domain | None:
        if len(arguments) != self._arity:
            return None
        matches = [c for c in self.candidates if all(overlaps(c, argument) for argument in arguments)]
        if not matches:
            return None
        return _join([self._result or match for match in matches])

    def exact(self, arguments: Sequence[Domain]) -> bool:
        return len(arguments) == self._arity and any(all(c.includes(a) for a in arguments) for c in self.candidates)

    def describe(self) -> str:
        names = " | ".join(c.name() for c in self.candidates)
        parameters = ", ".join(["T"] * self._arity)
        return f"({parameters}) -> {self._result.name() if self._result else 'T'} for T in {names}"


class Overloaded:
    """One of `signatures`, all of one arity: the first whose parameters include the arguments' domains, or else any
    that applies to them, when the result is the union of theirs."""

    def __init__(self, *signatures: Function | Same):
        self.signatures = signatures

    def arity(self) -> int:
        return self.signatures[0].arity()

    def result(self, arguments: Sequence[Domain]) -> Domain | None:
        for signature in self.signatures:
            if signature.exact(arguments):  # type: ignore[attr-defined]
                return signature.result(arguments)
        results = [r for r in (signature.result(arguments) for signature in self.signatures) if r is not None]
        return _join(results) if results else None

    def describe(self) -> str:
        return " | ".join(signature.describe() for signature in self.signatures)
