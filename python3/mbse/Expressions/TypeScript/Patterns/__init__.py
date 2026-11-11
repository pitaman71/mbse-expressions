"""The TypeScript Patterns dialect, `Expressions.TypeScript.Patterns`, of the TypeScript family: ECMA-262's binding and
assignment patterns, grammars of their own (14.3.3, "Destructuring Binding Patterns"; 13.15.5, "Destructuring
Assignment"). `install` adds its union of its kinds to the framework's terms; `define` writes its dialect's data. A
skeleton, its kinds to come (the dialects proposal, Retrofit's design)."""

from . import Expressions
from .Expressions import define, install

__all__ = ["Expressions", "define", "install"]
