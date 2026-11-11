"""The TypeScript Types dialect, `Expressions.TypeScript.Types`, of the TypeScript family: TypeScript's types,
typescript-estree's type nodes, which `TypeScript5`'s expressions hold and print. `install` adds its union of its kinds
to the framework's terms; `define` writes the versions of TypeScript 5 it covers."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
