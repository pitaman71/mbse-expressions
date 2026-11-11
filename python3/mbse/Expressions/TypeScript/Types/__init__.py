"""The TypeScript Types dialect, `Expressions.TypeScript.Types`, of the TypeScript family: TypeScript's types,
typescript-estree's type nodes. `install` adds its union of its kinds to the framework's terms; `define` writes its
dialect's data. A skeleton, its kinds to come (the dialects proposal, Retrofit's design)."""

from . import Expressions
from .Expressions import define, install

__all__ = ["Expressions", "define", "install"]
