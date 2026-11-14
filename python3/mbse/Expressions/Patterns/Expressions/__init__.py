"""The Patterns dialect: literals, calls, variables, lets and quantifiers over the core vocabulary, with three-valued
evaluation; every binding simplifies it. `install` adds its kinds to the framework's terms, its dialect and its
operations; `define` writes its dialect's data, its operations by name. It owns no domains: the kinds and the
domains its values take are the standard dialects' (`mbse.Expressions.ISOIEC11404.Expressions` and the others).
See mbse-basis [CAP-095: Basic terms as data](mbse:mbse-basis/docs/capabilities/CAP-095.md)."""

from . import Domains, Expressions, Ieee754, Simplifiers
from .Expressions import define, install

__all__ = ["Domains", "Expressions", "Ieee754", "Simplifiers", "define", "install"]
