"""Domains of the TypeScript5 dialect: JavaScript's values, by type, as a literal holds them.

`Boolean`, `Number`, `BigInt` and `String` are a literal's: a number is a float (IEEE 754 binary64, as JavaScript's
numbers are) and a bigint an int. `Null` and `RegExp` are the domains of TypeScript5's own constants, `null` and a
regular expression. Anything else is `Anything`: its operators' values are ECMAScript's, by its folding rules
(`Simplifiers`, `Abstract`), not by signatures, so its operators' signatures (`UNARY`, `UPDATE`, `BINARY`, `LOGICAL`,
`ASSIGNMENT`, by mbse-programs' operators) say only how many operands each takes.
"""

from __future__ import annotations

import re
from typing import Any

from mbse.Expressions.Framework import Domains as D
from mbse.Expressions.Framework.Domains import Anything

__all__ = ["Boolean", "Number", "BigInt", "String", "Null", "RegExp", "Anything", "UNARY", "UPDATE", "BINARY",
           "LOGICAL", "ASSIGNMENT", "of", "constant"]

Boolean, Number, BigInt, String = (D.OfTypes(name, t) for name, t in (
    ("boolean", bool), ("number", float), ("bigint", int), ("string", str)))
Null, RegExp = D.OfTypes("null", type(None)), D.OfTypes("RegExp", re.Pattern)

_ONE = D.Function((Anything,), Anything)
_TWO = D.Function((Anything, Anything), Anything)

UNARY: dict[str, D.Signature] = {operator: _ONE for operator in ("-", "+", "!", "~", "typeof", "void", "delete")}
"""The unary operators."""

UPDATE: dict[str, D.Signature] = {operator: _ONE for operator in ("++", "--")}
"""The update operators, prefix or postfix."""

BINARY: dict[str, D.Signature] = {operator: _TWO for operator in (
    "==", "!=", "===", "!==", "<", "<=", ">", ">=", "<<", ">>", ">>>", "+", "-", "*", "/", "%", "**", "|", "^", "&",
    "in", "instanceof")}
"""The binary operators, relations and membership among them."""

LOGICAL: dict[str, D.Signature] = {operator: _TWO for operator in ("&&", "||", "??")}
"""The logical operators."""

ASSIGNMENT: dict[str, D.Signature] = {operator: D.Opaque() for operator in (
    "=", "+=", "-=", "*=", "/=", "%=", "**=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "&&=", "||=", "??=")}
"""The assignment operators: a target's terms are its arguments too, so any number of them."""

_NATIVES = {bool: Boolean, float: Number, int: BigInt, str: String}


def of(value: Any) -> D.Domain:
    """The domain of a literal's value."""
    return _NATIVES[type(value)]


def constant(attributes: Any) -> D.Domain:
    """The domain of TypeScript5's own constant, by its attributes: `null`'s or a regular expression's."""
    return Null if attributes.get("singleton") == "null" else RegExp
