"""The ISO/IEC 11404 dialect: the kinds of domain of ISO/IEC 11404:2007, the language-independent datatypes, and the
domains it defines. `install` adds its kinds of domain, its domains' schemas and its dialect; `define` writes its
domains. It has no terms yet: its operations are CAP-180's to model (see mbse-basis
[CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](mbse:mbse-basis/docs/capabilities/CAP-180.md)
and [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains))."""

from . import Expressions
from .Expressions import define, install

__all__ = ["Expressions", "define", "install"]
