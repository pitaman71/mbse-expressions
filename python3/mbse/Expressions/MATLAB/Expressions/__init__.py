"""The MATLAB dialect: MATLAB expressions over scalars and structs, simplified by MATLAB's rules. `install` adds its
kinds to the framework's terms, its kind of domain and its domains' schemas; `define` writes its domains."""

from . import Domains, Expressions, Simplifiers, Text
from .Expressions import define, install

__all__ = ["Domains", "Expressions", "Simplifiers", "Text", "define", "install"]
