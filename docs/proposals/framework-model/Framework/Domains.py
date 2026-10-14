"""Domains: value domains, each a scalar schema refining a basic type. (Proposed:
python3/mbse/Expressions/Framework/Domains.py.)

A domain names a published standard (mbse-basis P-012) with only the parameters it defines, as a parametric scalar
schema that refines the basic type its values are: `Integer` (two's complement, of a width in bits, signed or not,
and what overflow does), `Ieee754` (a format and a rounding direction), `Bits` and `Bytes` (of a width), `Unicode`,
`Bool`, and `Ieee1164` (`std_logic` states, of a width). A width is the term `width`, the parameter, which an
application binds (`int8`). Every dialect's literals and operators use them by name.
"""

from __future__ import annotations

from mbse.Schemas.Framework import Schemas as S

__all__ = ["Integer", "Ieee754", "Bits", "Bytes", "Unicode", "Bool", "Ieee1164", "Int", "Float", "Bytestring", "int8",
           "uint8", "binary32", "SCHEMAS"]

Width = S.Form.Data("variable", {"name": "width"}, (), "Expressions.Basic")  # the parameter `width`, as a term


def _width(param):
    return param.name("width").of(S.OfScalar.Data(int))


# --- The standards ---

Integer = (
    S.OfScalar.Builder().name("Expressions.Domains.Integer")
    .refines(S.OfScalar.Data(int))
    .parameters(
        _width,
        lambda param: param.name("signed").of(S.OfScalar.Data(bool)),
        lambda param: param.name("overflow").of(S.OfScalar.Data(str)),  # "wrap", "saturate" or "raise"
    )
    .bits(Width)
    .create()
)
Ieee754 = (
    S.OfScalar.Builder().name("Expressions.Domains.Ieee754")
    .refines(S.OfScalar.Data(float))
    .parameters(
        lambda param: param.name("format").of(S.OfScalar.Data(str)),  # "binary32", "binary64", "decimal64", ...
        lambda param: param.name("rounding").of(S.OfScalar.Data(str)),  # "roundTiesToEven", "roundTowardZero", ...
    )
    .create()
)
Bits = (
    S.OfScalar.Builder().name("Expressions.Domains.Bits")
    .refines(S.OfScalar.Data(bytes))
    .parameters(_width)
    .bits(Width)
    .create()
)
Bytes = (
    S.OfScalar.Builder().name("Expressions.Domains.Bytes")
    .refines(S.OfScalar.Data(bytes))
    .parameters(_width)
    .bytes(Width)
    .create()
)
Unicode = (
    S.OfScalar.Builder().name("Expressions.Domains.Unicode")
    .refines(S.OfScalar.Data(str))
    .create()
)
Bool = (
    S.OfScalar.Builder().name("Expressions.Domains.Bool")
    .refines(S.OfScalar.Data(bool))
    .create()
)
Ieee1164 = (
    S.OfScalar.Builder().name("Expressions.Domains.Ieee1164")
    .refines(S.OfScalar.Data(str))
    .parameters(_width)
    .create()
)

# --- The natives' defaults, and named domains ---

Int = (
    S.OfApply.Builder().name("Expressions.Domains.int")
    .of(Integer)
    .arguments(signed=True, overflow="raise")
    .create()
)
Float = (
    S.OfApply.Builder().name("Expressions.Domains.float")
    .of(Ieee754)
    .arguments(format="binary64", rounding="roundTiesToEven")
    .create()
)
Bytestring = (
    S.OfApply.Builder().name("Expressions.Domains.bytes")
    .of(Bytes)
    .create()
)
int8 = (
    S.OfApply.Builder().name("Expressions.Domains.int8")
    .of(Integer)
    .arguments(width=8, signed=True, overflow="raise")
    .create()
)
uint8 = (
    S.OfApply.Builder().name("Expressions.Domains.uint8")
    .of(Integer)
    .arguments(width=8, signed=False, overflow="wrap")
    .create()
)
binary32 = (
    S.OfApply.Builder().name("Expressions.Domains.binary32")
    .of(Ieee754)
    .arguments(format="binary32", rounding="roundTiesToEven")
    .create()
)

SCHEMAS = (Integer, Ieee754, Bits, Bytes, Unicode, Bool, Ieee1164, Int, Float, Bytestring, int8, uint8, binary32)
"""The domains' schemas, in the order a store registers them."""
