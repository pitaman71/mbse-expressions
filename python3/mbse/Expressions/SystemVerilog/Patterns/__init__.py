"""The SystemVerilog Patterns dialect, `Expressions.SystemVerilog.Patterns`, of the SystemVerilog family: `install` adds its
union of its kinds to the framework's terms; `define` writes the editions it covers. See mbse-basis
[CAP-231: the SystemVerilog expression dialect, complete](mbse:mbse-basis/docs/capabilities/CAP-231.md)."""

from . import Expressions, Text
from .Expressions import define, install

__all__ = ["Expressions", "Text", "define", "install"]
