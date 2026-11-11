"""The TypeScript Patterns dialect, `Expressions.TypeScript.Patterns`, of the TypeScript family: ECMA-262's binding and
assignment patterns, grammars of their own (14.3.3, "Destructuring Binding Patterns"; 13.15.5, "Destructuring
Assignment"), which `TypeScript5`'s parameters and an assignment's target hold. `install` adds its union of its kinds to
the framework's terms; `define` writes the versions of TypeScript 5 it covers."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
