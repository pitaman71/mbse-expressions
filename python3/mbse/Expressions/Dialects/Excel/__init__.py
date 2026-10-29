"""The Excel dialect: worksheet formulas, evaluated by Excel's rules, errors as values included. `install` adds its
kinds to the framework's terms."""

from . import Domains, Evaluators, Expressions, Text
from .Expressions import install

__all__ = ["Domains", "Evaluators", "Expressions", "Text", "install"]
