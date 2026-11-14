"""The Excel dialect: worksheet formulas, evaluated by Excel's rules, errors as values included. `install` adds its
kinds to the framework's terms, its kinds of domain and its domains' schemas; `define` writes its domains."""

from . import Domains, Expressions, Simplifiers, Text
from .Expressions import define, install

__all__ = ["Domains", "Expressions", "Simplifiers", "Text", "define", "install"]
