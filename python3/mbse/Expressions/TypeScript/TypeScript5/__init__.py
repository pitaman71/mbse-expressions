"""The TypeScript5 dialect: every expression of TypeScript 5, 5.0 to 5.9, with its types, destructuring patterns and
JSX, printed as TypeScript writes it and simplified by ECMAScript's semantics (`ECMAScript`, its values and abstract
operations). `install` adds its kinds to the framework's terms, its kinds of domain and its domains' schemas; `define`
writes its domains."""

from . import Domains, ECMAScript, Expressions, Simplifiers, Text
from .Expressions import define, install

__all__ = ["Domains", "ECMAScript", "Expressions", "Simplifiers", "Text", "define", "install"]
