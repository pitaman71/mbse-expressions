"""Basic <-> Ccpp. Basic operations are C's operators, `get` a member (`x.name`), and `implies(a, b)` is written
`!a || b`, which translates back as `or(not(a), b)`. C has no let expression, so lets are inlined: a let's translated
value is shared by every use of its name. C has no `has`.

A typed C constant is a Basic literal of a value domain: an integer type the `Integer` domain of its width and
signedness, which C writes with `<stdint.h>`'s names (`uint8_t`), and a floating type the binary IEEE 754 format it has
(`float`, `double`, `long double`). A `bool` constant is a bool. Other domains, integers of other widths or another
overflow rule, and other formats or roundings have no C counterpart."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Dialects.Basic import Domains as D
from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.Ccpp.Domains import TYPES
from mbse.Expressions.Dialects.Ccpp.Expressions import DIALECT as CCPP
from mbse.Expressions.Framework.Translators import Convert, Inline, Pairwise, Rule, renames

from ._Patterns import Basic, Ccpp, value

_FLOATS = {"binary32": "float", "binary64": "double", "binary128": "long double"}


def _to_c(attributes: dict[str, Any]) -> dict[str, Any] | None:
    """A typed Basic literal's C constant."""
    domain, typed = attributes.get("domain"), None
    if isinstance(domain, D.OfInteger.Data) and domain.width in (8, 16, 32, 64) and domain.overflow == "raise":
        typed = f"{'' if domain.signed else 'u'}int{domain.width}_t"
    elif isinstance(domain, D.OfIeee754.Data) and domain.format in _FLOATS and domain.rounding == "roundTiesToEven":
        typed = _FLOATS[domain.format]
    return None if typed is None else {"value": attributes["value"], "type": typed}


def _from_c(attributes: dict[str, Any]) -> dict[str, Any] | None:
    """A typed C constant's Basic literal."""
    ctype = TYPES.get(attributes.get("type"))  # type: ignore[arg-type]
    if ctype is None:
        return None
    if ctype.kind == "integer":
        return {"value": attributes["value"], "domain": D.OfInteger.Data(ctype.width, ctype.signed)}
    if ctype.kind == "floating":
        return {"value": attributes["value"], "domain": D.OfIeee754.Data(ctype.format)}
    return {"value": attributes["value"]}  # a bool


V = value(int, float, str, bool)

TRANSLATOR = Pairwise(BASIC, CCPP, [
    Rule(Basic.literal(V), Ccpp.constant(V)),
    Convert("literal", "constant", _to_c, _from_c),
    Rule(Basic.variable, Ccpp.identifier),
    Inline("let", "left"),
    Rule(Basic.get, Ccpp.get),
    Rule(Basic.implies, Ccpp.implies, "forward"),
    *renames("operation", "name", "binary", "operator", {
        "eq": "==", "ne": "!=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||", "add": "+",
        "sub": "-", "mul": "*", "bitand": "&", "bitor": "|", "bitxor": "^", "shl": "<<", "shr": ">>"}, 2),
    *renames("operation", "name", "unary", "operator", {"not": "!", "neg": "-", "bitnot": "~"}, 1),
])
