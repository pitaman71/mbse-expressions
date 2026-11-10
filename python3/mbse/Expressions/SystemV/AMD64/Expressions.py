"""The AMD64 dialect: the domains of the System V ABI's AMD64 Architecture Processor Supplement, x86-64's, its LP64
programming model, the C and C++ types their standards leave to the implementation, as this ABI fixes them ([Domains as
data](../../../../../docs/proposals/domains/README.md#stage-3s-design), Decided, Q). It has no terms and no kinds of its
own: its domains are instances of ISO/IEC 11404's and IEEE 754's kinds, and it serves C and C++ alike. See mbse-basis
[CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).

Its dialect is the singleton `Expressions.SystemV.AMD64`, of its schema `Expressions.SystemV.AMD64.Dialect`, the branch
`amd64` of `Expressions.Framework.Dialect`; an expression whose C or C++ terms are read under this ABI names it, through
its adjacency `abi` (`Expressions.Framework.HasAbi`), which the dialect's schema declares, anonymous, so that validation
refuses an expression naming as its ABI a dialect that is not one. `define` writes its domains, owned by name, in the
order C's standard lists the types, each with its parameters and its inferred properties and related to its schema
(`Expressions.SystemV.AMD64.unsigned_long`, a name's spaces as `_`), an `OfAny` of the scalar it narrows (an int, a
float, or the text a format whose values are text holds): `char`, `signed char`, `unsigned char`, `short`, `unsigned
short`, `int`, `unsigned int`, `long`, `unsigned long`, `long long`, `unsigned long long`, `float`, `double`, `long
double`, `wchar_t`, `char8_t`, `char16_t`, `char32_t`, `size_t`, `ptrdiff_t`, `intptr_t`, `uintptr_t`, `int_least8_t`,
`int_least16_t`, `int_least32_t`, `int_least64_t`, `uint_least8_t`, `uint_least16_t`, `uint_least32_t`,
`uint_least64_t`, `_Float32x`, `_Float64x`. Here plain `char` is signed; `wchar_t` is `int`; `long double` and
`_Float64x` are x87's 80-bit extended format, IEEE 754's extended precision format of `binary64` (no interchange
format), given by its parameters. Each signed integer overflows by raising, as C leaves it undefined; each unsigned one
is 11404's `modulo`, wrapping; each IEEE 754 domain rounds ties to even.
"""

from __future__ import annotations

from typing import Any

__all__ = ["install", "define"]

def install(txn: Any) -> Any:
    """AMD64's dialect's schema, whose singleton is `Expressions.SystemV.AMD64`, and its domains' schemas. Run after
    `Framework.install` and the standard dialects', in a transaction of its own; run again, it writes nothing. Its
    domains `define` writes after it."""
    S, Framework = txn.Schemas, txn.Expressions.Framework
    return txn.uid("mbse.Expressions.SystemV.AMD64/1").mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"Dialects": S.OfUnion, "Dialect": S.OfObject,  # the framework's kind union of dialects, and its own
                  "char": S.OfAny, "signed_char": S.OfAny, "unsigned_char": S.OfAny, "short": S.OfAny,
                  "unsigned_short": S.OfAny, "int": S.OfAny, "unsigned_int": S.OfAny, "long": S.OfAny,
                  "unsigned_long": S.OfAny, "long_long": S.OfAny, "unsigned_long_long": S.OfAny, "float": S.OfAny,
                  "double": S.OfAny, "long_double": S.OfAny, "wchar_t": S.OfAny, "char8_t": S.OfAny,
                  "char16_t": S.OfAny, "char32_t": S.OfAny, "size_t": S.OfAny, "ptrdiff_t": S.OfAny,
                  "intptr_t": S.OfAny, "uintptr_t": S.OfAny, "int_least8_t": S.OfAny, "int_least16_t": S.OfAny,
                  "int_least32_t": S.OfAny, "int_least64_t": S.OfAny, "uint_least8_t": S.OfAny,
                  "uint_least16_t": S.OfAny, "uint_least32_t": S.OfAny, "uint_least64_t": S.OfAny,
                  "Float32x": S.OfAny, "Float64x": S.OfAny})
        .spec([
            # --- Its dialect: the singleton `Expressions.SystemV.AMD64`, a branch of the framework's kind union; an
            # expression names it as its ABI (anonymous: no member on it) ---
            lambda _: _.Dialect.name("Expressions.SystemV.AMD64.Dialect").ref(True).singleton(
                "Expressions.SystemV.AMD64").adjacencies({
                "domains": lambda a: a.relation([Framework.Defines]).me("dialect"),
                "operations": lambda a: a.relation([Framework.Operates]).me("dialect"),
                "standards": lambda a: a.relation([Framework.Covers]).me("dialect")}).adjacencies([
                lambda t: t.relation([Framework.HasAbi]).me("abi")]),
            lambda _: _.Dialects.name("Expressions.Framework.Dialect").branches([
                lambda t: t.name("amd64").schema([_.Dialect])]),

            # --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
            lambda _: _.char.name("Expressions.SystemV.AMD64.char").schemas([S.OfInt]),
            lambda _: _.signed_char.name("Expressions.SystemV.AMD64.signed_char").schemas([S.OfInt]),
            lambda _: _.unsigned_char.name("Expressions.SystemV.AMD64.unsigned_char").schemas([S.OfInt]),
            lambda _: _.short.name("Expressions.SystemV.AMD64.short").schemas([S.OfInt]),
            lambda _: _.unsigned_short.name("Expressions.SystemV.AMD64.unsigned_short").schemas([S.OfInt]),
            lambda _: _.int.name("Expressions.SystemV.AMD64.int").schemas([S.OfInt]),
            lambda _: _.unsigned_int.name("Expressions.SystemV.AMD64.unsigned_int").schemas([S.OfInt]),
            lambda _: _.long.name("Expressions.SystemV.AMD64.long").schemas([S.OfInt]),
            lambda _: _.unsigned_long.name("Expressions.SystemV.AMD64.unsigned_long").schemas([S.OfInt]),
            lambda _: _.long_long.name("Expressions.SystemV.AMD64.long_long").schemas([S.OfInt]),
            lambda _: _.unsigned_long_long.name("Expressions.SystemV.AMD64.unsigned_long_long").schemas([S.OfInt]),
            lambda _: _.float.name("Expressions.SystemV.AMD64.float").schemas([S.OfFloat]),
            lambda _: _.double.name("Expressions.SystemV.AMD64.double").schemas([S.OfFloat]),
            lambda _: _.long_double.name("Expressions.SystemV.AMD64.long_double").schemas([S.OfStr]),
            lambda _: _.wchar_t.name("Expressions.SystemV.AMD64.wchar_t").schemas([S.OfInt]),
            lambda _: _.char8_t.name("Expressions.SystemV.AMD64.char8_t").schemas([S.OfInt]),
            lambda _: _.char16_t.name("Expressions.SystemV.AMD64.char16_t").schemas([S.OfInt]),
            lambda _: _.char32_t.name("Expressions.SystemV.AMD64.char32_t").schemas([S.OfInt]),
            lambda _: _.size_t.name("Expressions.SystemV.AMD64.size_t").schemas([S.OfInt]),
            lambda _: _.ptrdiff_t.name("Expressions.SystemV.AMD64.ptrdiff_t").schemas([S.OfInt]),
            lambda _: _.intptr_t.name("Expressions.SystemV.AMD64.intptr_t").schemas([S.OfInt]),
            lambda _: _.uintptr_t.name("Expressions.SystemV.AMD64.uintptr_t").schemas([S.OfInt]),
            lambda _: _.int_least8_t.name("Expressions.SystemV.AMD64.int_least8_t").schemas([S.OfInt]),
            lambda _: _.int_least16_t.name("Expressions.SystemV.AMD64.int_least16_t").schemas([S.OfInt]),
            lambda _: _.int_least32_t.name("Expressions.SystemV.AMD64.int_least32_t").schemas([S.OfInt]),
            lambda _: _.int_least64_t.name("Expressions.SystemV.AMD64.int_least64_t").schemas([S.OfInt]),
            lambda _: _.uint_least8_t.name("Expressions.SystemV.AMD64.uint_least8_t").schemas([S.OfInt]),
            lambda _: _.uint_least16_t.name("Expressions.SystemV.AMD64.uint_least16_t").schemas([S.OfInt]),
            lambda _: _.uint_least32_t.name("Expressions.SystemV.AMD64.uint_least32_t").schemas([S.OfInt]),
            lambda _: _.uint_least64_t.name("Expressions.SystemV.AMD64.uint_least64_t").schemas([S.OfInt]),
            lambda _: _.Float32x.name("Expressions.SystemV.AMD64.Float32x").schemas([S.OfFloat]),
            lambda _: _.Float64x.name("Expressions.SystemV.AMD64.Float64x").schemas([S.OfStr]),
        ])]))])


def define(txn: Any) -> Any:
    """AMD64's dialect as data: the singleton `Expressions.SystemV.AMD64` owning its domains by name (`domains`, through
    `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and related to its schema
    by `Expressions.Framework.HasDomain`. Run after `install`, in a transaction of its own; run again, it writes
    nothing. Its frame binds the dialect (`dialect`) and each domain by its name, spelled as its schema's is
    (`unsigned long` as `unsigned_long`): `store.transaction(AMD64.define)[0]["unsigned_long"]`."""
    ABI, Domain = txn.Expressions.SystemV.AMD64, txn.Expressions.Framework.Domain
    Standard = txn.Expressions.Framework.Standard
    uid = "mbse.Expressions.SystemV.AMD64.define/1"
    return txn.uid(uid).mutations([lambda mu: mu.upsert(lambda u: u.exists([lambda p: p
        .symbols({"dialect": ABI.Dialect, "standard": Standard,
                  "char": Domain, "signed_char": Domain, "unsigned_char": Domain, "short": Domain,
                  "unsigned_short": Domain, "int": Domain, "unsigned_int": Domain, "long": Domain,
                  "unsigned_long": Domain, "long_long": Domain, "unsigned_long_long": Domain, "float": Domain,
                  "double": Domain, "long_double": Domain, "wchar_t": Domain, "char8_t": Domain, "char16_t": Domain,
                  "char32_t": Domain, "size_t": Domain, "ptrdiff_t": Domain, "intptr_t": Domain, "uintptr_t": Domain,
                  "int_least8_t": Domain, "int_least16_t": Domain, "int_least32_t": Domain, "int_least64_t": Domain,
                  "uint_least8_t": Domain, "uint_least16_t": Domain, "uint_least32_t": Domain,
                  "uint_least64_t": Domain, "Float32x": Domain, "Float64x": Domain})
        .spec([
            lambda _: _.dialect.domains({
                "char": lambda e: e.domain(_.char),
                "signed char": lambda e: e.domain(_.signed_char),
                "unsigned char": lambda e: e.domain(_.unsigned_char),
                "short": lambda e: e.domain(_.short),
                "unsigned short": lambda e: e.domain(_.unsigned_short),
                "int": lambda e: e.domain(_.int),
                "unsigned int": lambda e: e.domain(_.unsigned_int),
                "long": lambda e: e.domain(_.long),
                "unsigned long": lambda e: e.domain(_.unsigned_long),
                "long long": lambda e: e.domain(_.long_long),
                "unsigned long long": lambda e: e.domain(_.unsigned_long_long),
                "float": lambda e: e.domain(_.float),
                "double": lambda e: e.domain(_.double),
                "long double": lambda e: e.domain(_.long_double),
                "wchar_t": lambda e: e.domain(_.wchar_t),
                "char8_t": lambda e: e.domain(_.char8_t),
                "char16_t": lambda e: e.domain(_.char16_t),
                "char32_t": lambda e: e.domain(_.char32_t),
                "size_t": lambda e: e.domain(_.size_t),
                "ptrdiff_t": lambda e: e.domain(_.ptrdiff_t),
                "intptr_t": lambda e: e.domain(_.intptr_t),
                "uintptr_t": lambda e: e.domain(_.uintptr_t),
                "int_least8_t": lambda e: e.domain(_.int_least8_t),
                "int_least16_t": lambda e: e.domain(_.int_least16_t),
                "int_least32_t": lambda e: e.domain(_.int_least32_t),
                "int_least64_t": lambda e: e.domain(_.int_least64_t),
                "uint_least8_t": lambda e: e.domain(_.uint_least8_t),
                "uint_least16_t": lambda e: e.domain(_.uint_least16_t),
                "uint_least32_t": lambda e: e.domain(_.uint_least32_t),
                "uint_least64_t": lambda e: e.domain(_.uint_least64_t),
                "_Float32x": lambda e: e.domain(_.Float32x),
                "_Float64x": lambda e: e.domain(_.Float64x),
            }),
            lambda _: _.dialect.standards({
                "System V Application Binary Interface, AMD64 Architecture Processor Supplement":
                    lambda e: e.standard(_.standard)}),
            lambda _: _.char.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(8).signed(True).overflow("raise")
                    .least(-128).greatest(127).ordered(True)))))).schema([ABI.char]),
            lambda _: _.signed_char.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(8).signed(True).overflow("raise")
                    .least(-128).greatest(127).ordered(True)))))).schema([ABI.signed_char]),
            lambda _: _.unsigned_char.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(256).least(0).greatest(255).ordered(True)))))).schema([ABI.unsigned_char]),
            lambda _: _.short.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(16).signed(True).overflow("raise")
                    .least(-32768).greatest(32767).ordered(True)))))).schema([ABI.short]),
            lambda _: _.unsigned_short.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(65536).least(0).greatest(65535).ordered(True)))))).schema([ABI.unsigned_short]),
            lambda _: _.int.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(32).signed(True).overflow("raise")
                    .least(-2147483648).greatest(2147483647).ordered(True)))))).schema([ABI.int]),
            lambda _: _.unsigned_int.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(4294967296)
                    .least(0).greatest(4294967295).ordered(True)))))).schema([ABI.unsigned_int]),
            lambda _: _.long.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(64).signed(True).overflow("raise")
                    .least(-9223372036854775808).greatest(9223372036854775807)
                    .ordered(True)))))).schema([ABI.long]),
            lambda _: _.unsigned_long.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(18446744073709551616)
                    .least(0).greatest(18446744073709551615).ordered(True)))))).schema([ABI.unsigned_long]),
            lambda _: _.long_long.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(64).signed(True).overflow("raise")
                    .least(-9223372036854775808).greatest(9223372036854775807)
                    .ordered(True)))))).schema([ABI.long_long]),
            lambda _: _.unsigned_long_long.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(18446744073709551616)
                    .least(0).greatest(18446744073709551615).ordered(True)))))).schema([ABI.unsigned_long_long]),
            lambda _: _.float.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary32").rounding("roundTiesToEven").width(32)
                    .radix(2).precision(24).emax(127).ordered(True)))))).schema([ABI.float]),
            lambda _: _.double.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64)
                    .radix(2).precision(53).emax(1023).ordered(True)))))).schema([ABI.double]),
            lambda _: _.long_double.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.rounding("roundTiesToEven").width(80)
                    .radix(2).precision(64).emax(16383).ordered(True)))))).schema([ABI.long_double]),
            lambda _: _.wchar_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(32).signed(True).overflow("raise")
                    .least(-2147483648).greatest(2147483647).ordered(True)))))).schema([ABI.wchar_t]),
            lambda _: _.char8_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(256).least(0).greatest(255).ordered(True)))))).schema([ABI.char8_t]),
            lambda _: _.char16_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(65536).least(0).greatest(65535).ordered(True)))))).schema([ABI.char16_t]),
            lambda _: _.char32_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(4294967296).least(0).greatest(4294967295).ordered(True)))))).schema([ABI.char32_t]),
            lambda _: _.size_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(18446744073709551616)
                    .least(0).greatest(18446744073709551615).ordered(True)))))).schema([ABI.size_t]),
            lambda _: _.ptrdiff_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(64).signed(True).overflow("raise")
                    .least(-9223372036854775808).greatest(9223372036854775807)
                    .ordered(True)))))).schema([ABI.ptrdiff_t]),
            lambda _: _.intptr_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(64).signed(True).overflow("raise")
                    .least(-9223372036854775808).greatest(9223372036854775807)
                    .ordered(True)))))).schema([ABI.intptr_t]),
            lambda _: _.uintptr_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(18446744073709551616)
                    .least(0).greatest(18446744073709551615).ordered(True)))))).schema([ABI.uintptr_t]),
            lambda _: _.int_least8_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(8).signed(True).overflow("raise")
                    .least(-128).greatest(127).ordered(True)))))).schema([ABI.int_least8_t]),
            lambda _: _.int_least16_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(16).signed(True).overflow("raise")
                    .least(-32768).greatest(32767).ordered(True)))))).schema([ABI.int_least16_t]),
            lambda _: _.int_least32_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(32).signed(True).overflow("raise")
                    .least(-2147483648).greatest(2147483647).ordered(True)))))).schema([ABI.int_least32_t]),
            lambda _: _.int_least64_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.integer(
                lambda d: d.width(64).signed(True).overflow("raise")
                    .least(-9223372036854775808).greatest(9223372036854775807)
                    .ordered(True)))))).schema([ABI.int_least64_t]),
            lambda _: _.uint_least8_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(256).least(0).greatest(255).ordered(True)))))).schema([ABI.uint_least8_t]),
            lambda _: _.uint_least16_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(65536).least(0).greatest(65535).ordered(True)))))).schema([ABI.uint_least16_t]),
            lambda _: _.uint_least32_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(4294967296)
                    .least(0).greatest(4294967295).ordered(True)))))).schema([ABI.uint_least32_t]),
            lambda _: _.uint_least64_t.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.isoiec11404(lambda v: v.modulo(
                lambda d: d.modulus(18446744073709551616)
                    .least(0).greatest(18446744073709551615).ordered(True)))))).schema([ABI.uint_least64_t]),
            lambda _: _.Float32x.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.format("binary64").rounding("roundTiesToEven").width(64)
                    .radix(2).precision(53).emax(1023).ordered(True)))))).schema([ABI.Float32x]),
            lambda _: _.Float64x.kind(lambda k: k.as_value(lambda a: a.as_union(
                lambda u: u.ieee754(lambda v: v.ieee754(
                lambda d: d.rounding("roundTiesToEven").width(80)
                    .radix(2).precision(64).emax(16383).ordered(True)))))).schema([ABI.Float64x]),
        ])]))])
