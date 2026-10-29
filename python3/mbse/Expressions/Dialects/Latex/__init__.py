"""The Latex dialect: mathematical notation in LaTeX's math mode, rendered, validated and translated; it has no
evaluator. `install` adds its kinds to the framework's terms."""

from . import Domains, Expressions, Text
from .Expressions import install

__all__ = ["Domains", "Expressions", "Text", "install"]
