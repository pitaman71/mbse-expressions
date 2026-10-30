"""The Basic dialect: literals, calls, variables, lets and quantifiers over the core vocabulary, with three-valued
evaluation. It is the neutral form of every constraint. `install` adds its kinds to the framework's terms. See
mbse-basis [CAP-095: Basic terms as data](../../../../../../mbse-basis/docs/capabilities/CAP-095.md)."""

from . import Domains, Evaluators, Expressions, Ieee754, Partials
from .Expressions import install

__all__ = ["Domains", "Evaluators", "Expressions", "Ieee754", "Partials", "install"]
