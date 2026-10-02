"""Basic <-> SystemVerilog. Basic operations are SystemVerilog's operators, `implies` its `->`, `shr` its arithmetic
`>>>`, `get` a member, and a bool `1'b1` or `1'b0`. SystemVerilog has no let expression, so lets are inlined: a let's
translated value is shared by every use of its name. It has no `has`, and the logical `>>` and the 4-state comparisons
(`===`, `==?`) have no Basic counterpart yet.

Collections are arrays, and their operations array methods: `all` and `any` are `xs.and(p) with (body)` and
`xs.or(p) with (body)`, the quantifier `count` is `xs.sum(p) with (int'(body))`, `count(xs)` is `xs.size()`, `sum(xs)`
is `xs.sum()`, `min(xs)` and `max(xs)` are `xs.min()[0]` and `xs.max()[0]`, `item(xs, i)` is `xs[i]`, and `in(x, xs)`
is `x inside {xs}`. `unique(xs)` is written `xs.unique().size() == xs.size()`, which does not read back as `unique`,
and `entries` has no counterpart.

A sized vector is a Basic literal of a value domain, its base telling which: a literal of an `Integer` domain of a width
is a decimal vector of that width and signedness (`8'd200`, `8'sd251` for -5), of a `Bits` domain a hexadecimal one
(`12'habc`), and of `Ieee1164` a binary one, a bit for a `std_logic` and a vector of its width for a `std_logic_vector`
(`1'bx`, `4'b10xz`), of the levels SystemVerilog has: 0, 1, X and Z. Back, a vector with x or z bits or an unsigned
binary one is an `Ieee1164` level, or a `std_logic_vector` when wider than a bit; a decimal or signed vector is an
`Integer`, and any other `Bits`. A vector without a base of a single 0 or 1 is a bool."""

from __future__ import annotations

from typing import Any

from mbse.Expressions.Dialects.Basic import Domains as D
from mbse.Expressions.Dialects.Basic.Expressions import DIALECT as BASIC
from mbse.Expressions.Dialects.SystemVerilog.Expressions import DIALECT as SYSTEMVERILOG
from mbse.Expressions.Framework.Translators import Convert, Inline, Pairwise, Pattern, Rule, renames

from ._Patterns import Basic, SystemVerilog, value

_LEVELS = {"0": "0", "1": "1", "X": "x", "Z": "z"}


def _to_vector(attributes: dict[str, Any]) -> dict[str, Any] | None:
    """A typed Basic literal's vector."""
    domain, value = attributes.get("domain"), attributes["value"]
    if isinstance(domain, D.OfInteger.Data) and domain.width and domain.overflow == "raise":
        bits = format(value % (1 << domain.width), f"0{domain.width}b")
        return {"value": bits, "signed": True, "base": "d"} if domain.signed else {"value": bits, "base": "d"}
    if isinstance(domain, D.OfBits.Data):
        return {"value": format(int.from_bytes(value, "big"), f"0{domain.width}b"), "base": "h"}
    if isinstance(domain, D.OfIeee1164.Data) and all(state in _LEVELS for state in value):
        return {"value": "".join(_LEVELS[state] for state in value), "base": "b"}
    return None


def _from_vector(attributes: dict[str, Any]) -> dict[str, Any] | None:
    """A vector's typed Basic literal."""
    bits, signed, base = attributes["value"], attributes.get("signed", False), attributes.get("base")
    if any(b in "xz" for b in bits) or (base == "b" and not signed):
        return {"value": bits.upper(), "domain": D.OfIeee1164.Data(None if len(bits) == 1 else len(bits))}
    if base == "d" or signed:
        number = int(bits, 2)
        if signed and bits[0] == "1":
            number -= 1 << len(bits)
        return {"value": number, "domain": D.OfInteger.Data(len(bits), bool(signed))}
    return {"value": int(bits, 2).to_bytes((len(bits) + 7) // 8, "big"), "domain": D.OfBits.Data(len(bits))}


V = value(int, float, str)

TRANSLATOR = Pairwise(BASIC, SYSTEMVERILOG, [
    Rule(Basic.literal(V), SystemVerilog.constant(V)),
    Rule(Pattern("literal", value=True), Pattern("vector", value="1")),
    Rule(Pattern("literal", value=False), Pattern("vector", value="0")),
    Convert("literal", "vector", _to_vector, _from_vector),
    Rule(Basic.variable, SystemVerilog.identifier),
    Inline("let", "left"),
    Rule(Basic.get, SystemVerilog.get),
    Rule(Basic.implies, SystemVerilog.implies),
    *renames("operation", "name", "binary", "operator", {
        "eq": "==", "ne": "!=", "lt": "<", "le": "<=", "gt": ">", "ge": ">=", "and": "&&", "or": "||", "add": "+",
        "sub": "-", "mul": "*", "bitand": "&", "bitor": "|", "bitxor": "^", "shl": "<<", "shr": ">>>"}, 2),
    *renames("operation", "name", "unary", "operator", {"not": "!", "neg": "-", "bitnot": "~"}, 1),
    Rule(Basic.quantifier("all"), SystemVerilog.iterate("and")),
    Rule(Basic.quantifier("any"), SystemVerilog.iterate("or")),
    Rule(Basic.quantifier("count"), SystemVerilog.count_where),
    Rule(Basic.unary("count"), SystemVerilog.method("size")),
    Rule(Basic.unary("sum"), SystemVerilog.method("sum")),
    *[Rule(Basic.unary(name), SystemVerilog.locate(name)) for name in ("min", "max")],
    Rule(Basic.item, SystemVerilog.select),
    Rule(Basic.in_, SystemVerilog.inside),
    Rule(Basic.unary("unique"), SystemVerilog.unique, "forward"),
])
