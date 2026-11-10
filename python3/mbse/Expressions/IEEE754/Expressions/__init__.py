"""The IEEE 754 dialect: the kind of domain of IEEE Std 754-2019, floating-point arithmetic, and the domains it defines.
`install` adds its kind of domain, its domains' schemas and its dialect; `define` writes its domains. It has no
terms. See mbse-basis
[CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains)."""

from . import Expressions
from .Expressions import define, install

__all__ = ["Expressions", "define", "install"]
