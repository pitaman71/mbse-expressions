/**
 * The AMD64 dialect: the domains of the System V ABI's AMD64 Architecture Processor Supplement, x86-64's, its LP64
 * programming model, the C and C++ types their standards leave to the implementation, as this ABI fixes them
 * ([Domains as data](../../../../docs/proposals/domains/README.md#stage-3s-design), Decided, Q). It has no terms and
 * no kinds of its own: its domains are instances of ISO/IEC 11404's and IEEE 754's kinds, and it serves C and C++
 * alike. See mbse-basis [CAP-097: value domains of published
 * standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).
 *
 * Its dialect is the singleton `Expressions.SystemV.AMD64`, of its schema `Expressions.SystemV.AMD64.Dialect`, the
 * branch `amd64` of `Expressions.Framework.Dialect`; an expression whose C or C++ terms are read under this ABI
 * names it, through its adjacency `abi` (`Expressions.Framework.HasAbi`), which the dialect's schema declares,
 * anonymous, so that validation refuses an expression naming as its ABI a dialect that is not one. `define` writes
 * its domains, owned by name, in the order C's standard lists the types, each with its parameters and its inferred
 * properties and related to its schema (`Expressions.SystemV.AMD64.unsigned_long`, a name's spaces as `_`), an
 * `OfAny` of the scalar it narrows (an int, a float, or the text a format whose values are text holds): `char`,
 * `signed char`, `unsigned char`, `short`, `unsigned short`, `int`, `unsigned int`, `long`, `unsigned long`, `long
 * long`, `unsigned long long`, `float`, `double`, `long double`, `wchar_t`, `char8_t`, `char16_t`, `char32_t`,
 * `size_t`, `ptrdiff_t`, `intptr_t`, `uintptr_t`, `int_least8_t`, `int_least16_t`, `int_least32_t`, `int_least64_t`,
 * `uint_least8_t`, `uint_least16_t`, `uint_least32_t`, `uint_least64_t`, `_Float32x`, `_Float64x`. Here plain `char`
 * is signed; `wchar_t` is `int`; `long double` and `_Float64x` are x87's 80-bit extended format, IEEE 754's extended
 * precision format of `binary64` (no interchange format), given by its parameters. Each signed integer overflows by
 * raising, as C leaves it undefined; each unsigned one is 11404's `modulo`, wrapping; each IEEE 754 domain rounds
 * ties to even.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** AMD64's dialect's schema, whose singleton is `Expressions.SystemV.AMD64`, and its domains' schemas. Run after
 * `Framework.install` and the standard dialects', in a transaction of its own; run again, it writes nothing. Its
 * domains `define` writes after it. */
export function install(txn: any): any {
  const S = txn.Schemas, Framework = txn.Expressions.Framework;
  const uid = "mbse.Expressions.SystemV.AMD64/1";
  return txn.uid(uid).mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      Dialects: S.OfUnion, Dialect: S.OfObject, // the framework's kind union of dialects, and its own
      char: S.OfAny, signed_char: S.OfAny, unsigned_char: S.OfAny, short: S.OfAny, unsigned_short: S.OfAny,
      int: S.OfAny, unsigned_int: S.OfAny, long: S.OfAny, unsigned_long: S.OfAny, long_long: S.OfAny,
      unsigned_long_long: S.OfAny, float: S.OfAny, double: S.OfAny, long_double: S.OfAny, wchar_t: S.OfAny,
      char8_t: S.OfAny, char16_t: S.OfAny, char32_t: S.OfAny, size_t: S.OfAny, ptrdiff_t: S.OfAny, intptr_t: S.OfAny,
      uintptr_t: S.OfAny, int_least8_t: S.OfAny, int_least16_t: S.OfAny, int_least32_t: S.OfAny,
      int_least64_t: S.OfAny, uint_least8_t: S.OfAny, uint_least16_t: S.OfAny, uint_least32_t: S.OfAny,
      uint_least64_t: S.OfAny, Float32x: S.OfAny, Float64x: S.OfAny,
    })
    .spec([
      // --- Its dialect: the singleton `Expressions.SystemV.AMD64`, a branch of the framework's kind union; an
      // expression names it as its ABI (anonymous: no member on it) ---
      (_: any) => _.Dialect.name("Expressions.SystemV.AMD64.Dialect").ref(true).singleton("Expressions.SystemV.AMD64")
        .adjacencies({
        domains: (a: any) => a.relation([Framework.Defines]).me("dialect"),
        operations: (a: any) => a.relation([Framework.Operates]).me("dialect"),
        standards: (a: any) => a.relation([Framework.Covers]).me("dialect"),
      }).adjacencies([(t: any) => t.relation([Framework.HasAbi]).me("abi")]),
      (_: any) => _.Dialects.name("Expressions.Framework.Dialect").branches([
        (t: any) => t.name("amd64").schema([_.Dialect])]),

      // --- Its domains' schemas, each an OfAny of the scalar it narrows, which `define` relates to its domain ---
      (_: any) => _.char.name("Expressions.SystemV.AMD64.char").schemas([S.OfInt]),
      (_: any) => _.signed_char.name("Expressions.SystemV.AMD64.signed_char").schemas([S.OfInt]),
      (_: any) => _.unsigned_char.name("Expressions.SystemV.AMD64.unsigned_char").schemas([S.OfInt]),
      (_: any) => _.short.name("Expressions.SystemV.AMD64.short").schemas([S.OfInt]),
      (_: any) => _.unsigned_short.name("Expressions.SystemV.AMD64.unsigned_short").schemas([S.OfInt]),
      (_: any) => _.int.name("Expressions.SystemV.AMD64.int").schemas([S.OfInt]),
      (_: any) => _.unsigned_int.name("Expressions.SystemV.AMD64.unsigned_int").schemas([S.OfInt]),
      (_: any) => _.long.name("Expressions.SystemV.AMD64.long").schemas([S.OfInt]),
      (_: any) => _.unsigned_long.name("Expressions.SystemV.AMD64.unsigned_long").schemas([S.OfInt]),
      (_: any) => _.long_long.name("Expressions.SystemV.AMD64.long_long").schemas([S.OfInt]),
      (_: any) => _.unsigned_long_long.name("Expressions.SystemV.AMD64.unsigned_long_long").schemas([S.OfInt]),
      (_: any) => _.float.name("Expressions.SystemV.AMD64.float").schemas([S.OfFloat]),
      (_: any) => _.double.name("Expressions.SystemV.AMD64.double").schemas([S.OfFloat]),
      (_: any) => _.long_double.name("Expressions.SystemV.AMD64.long_double").schemas([S.OfStr]),
      (_: any) => _.wchar_t.name("Expressions.SystemV.AMD64.wchar_t").schemas([S.OfInt]),
      (_: any) => _.char8_t.name("Expressions.SystemV.AMD64.char8_t").schemas([S.OfInt]),
      (_: any) => _.char16_t.name("Expressions.SystemV.AMD64.char16_t").schemas([S.OfInt]),
      (_: any) => _.char32_t.name("Expressions.SystemV.AMD64.char32_t").schemas([S.OfInt]),
      (_: any) => _.size_t.name("Expressions.SystemV.AMD64.size_t").schemas([S.OfInt]),
      (_: any) => _.ptrdiff_t.name("Expressions.SystemV.AMD64.ptrdiff_t").schemas([S.OfInt]),
      (_: any) => _.intptr_t.name("Expressions.SystemV.AMD64.intptr_t").schemas([S.OfInt]),
      (_: any) => _.uintptr_t.name("Expressions.SystemV.AMD64.uintptr_t").schemas([S.OfInt]),
      (_: any) => _.int_least8_t.name("Expressions.SystemV.AMD64.int_least8_t").schemas([S.OfInt]),
      (_: any) => _.int_least16_t.name("Expressions.SystemV.AMD64.int_least16_t").schemas([S.OfInt]),
      (_: any) => _.int_least32_t.name("Expressions.SystemV.AMD64.int_least32_t").schemas([S.OfInt]),
      (_: any) => _.int_least64_t.name("Expressions.SystemV.AMD64.int_least64_t").schemas([S.OfInt]),
      (_: any) => _.uint_least8_t.name("Expressions.SystemV.AMD64.uint_least8_t").schemas([S.OfInt]),
      (_: any) => _.uint_least16_t.name("Expressions.SystemV.AMD64.uint_least16_t").schemas([S.OfInt]),
      (_: any) => _.uint_least32_t.name("Expressions.SystemV.AMD64.uint_least32_t").schemas([S.OfInt]),
      (_: any) => _.uint_least64_t.name("Expressions.SystemV.AMD64.uint_least64_t").schemas([S.OfInt]),
      (_: any) => _.Float32x.name("Expressions.SystemV.AMD64.Float32x").schemas([S.OfFloat]),
      (_: any) => _.Float64x.name("Expressions.SystemV.AMD64.Float64x").schemas([S.OfStr]),
    ])]))]);
}

/** AMD64's dialect as data: the singleton `Expressions.SystemV.AMD64` owning its domains by name (`domains`, through
 * `Expressions.Framework.Defines`), each with its parameters and its inferred properties, and related to its schema by
 * `Expressions.Framework.HasDomain`. Run after `install`, in a transaction of its own; run again, it writes nothing.
 * Its frame binds the dialect (`dialect`) and each domain by its name, spelled as its schema's is (`unsigned long` as
 * `unsigned_long`): `store.transaction(AMD64.define)[0].get("unsigned_long")`. */
export function define(txn: any): any {
  const ABI = txn.Expressions.SystemV.AMD64, Domain = txn.Expressions.Framework.Domain;
  const Standard = txn.Expressions.Framework.Standard;
  const uid = "mbse.Expressions.SystemV.AMD64.define/1";
  return txn.uid(uid).mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
    .symbols({
      dialect: ABI.Dialect, standard: Standard,
      char: Domain, signed_char: Domain, unsigned_char: Domain, short: Domain, unsigned_short: Domain, int: Domain,
      unsigned_int: Domain, long: Domain, unsigned_long: Domain, long_long: Domain, unsigned_long_long: Domain,
      float: Domain, double: Domain, long_double: Domain, wchar_t: Domain, char8_t: Domain, char16_t: Domain,
      char32_t: Domain, size_t: Domain, ptrdiff_t: Domain, intptr_t: Domain, uintptr_t: Domain, int_least8_t: Domain,
      int_least16_t: Domain, int_least32_t: Domain, int_least64_t: Domain, uint_least8_t: Domain,
      uint_least16_t: Domain, uint_least32_t: Domain, uint_least64_t: Domain, Float32x: Domain, Float64x: Domain,
    })
    .spec([
      (_: any) => _.dialect.domains({
        "char": (e: any) => e.domain(_.char),
        "signed char": (e: any) => e.domain(_.signed_char),
        "unsigned char": (e: any) => e.domain(_.unsigned_char),
        "short": (e: any) => e.domain(_.short),
        "unsigned short": (e: any) => e.domain(_.unsigned_short),
        "int": (e: any) => e.domain(_.int),
        "unsigned int": (e: any) => e.domain(_.unsigned_int),
        "long": (e: any) => e.domain(_.long),
        "unsigned long": (e: any) => e.domain(_.unsigned_long),
        "long long": (e: any) => e.domain(_.long_long),
        "unsigned long long": (e: any) => e.domain(_.unsigned_long_long),
        "float": (e: any) => e.domain(_.float),
        "double": (e: any) => e.domain(_.double),
        "long double": (e: any) => e.domain(_.long_double),
        "wchar_t": (e: any) => e.domain(_.wchar_t),
        "char8_t": (e: any) => e.domain(_.char8_t),
        "char16_t": (e: any) => e.domain(_.char16_t),
        "char32_t": (e: any) => e.domain(_.char32_t),
        "size_t": (e: any) => e.domain(_.size_t),
        "ptrdiff_t": (e: any) => e.domain(_.ptrdiff_t),
        "intptr_t": (e: any) => e.domain(_.intptr_t),
        "uintptr_t": (e: any) => e.domain(_.uintptr_t),
        "int_least8_t": (e: any) => e.domain(_.int_least8_t),
        "int_least16_t": (e: any) => e.domain(_.int_least16_t),
        "int_least32_t": (e: any) => e.domain(_.int_least32_t),
        "int_least64_t": (e: any) => e.domain(_.int_least64_t),
        "uint_least8_t": (e: any) => e.domain(_.uint_least8_t),
        "uint_least16_t": (e: any) => e.domain(_.uint_least16_t),
        "uint_least32_t": (e: any) => e.domain(_.uint_least32_t),
        "uint_least64_t": (e: any) => e.domain(_.uint_least64_t),
        "_Float32x": (e: any) => e.domain(_.Float32x),
        "_Float64x": (e: any) => e.domain(_.Float64x),
      }),
      (_: any) => _.dialect.standards({
        "System V Application Binary Interface, AMD64 Architecture Processor Supplement":
          (e: any) => e.standard(_.standard) }),
      (_: any) => _.char.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(8n).signed(true).overflow("raise")
          .least(-128n).greatest(127n).ordered(true)))))).schema([ABI.char]),
      (_: any) => _.signed_char.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(8n).signed(true).overflow("raise")
          .least(-128n).greatest(127n).ordered(true)))))).schema([ABI.signed_char]),
      (_: any) => _.unsigned_char.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(256n).least(0n).greatest(255n).ordered(true)))))).schema([ABI.unsigned_char]),
      (_: any) => _.short.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(16n).signed(true).overflow("raise")
          .least(-32768n).greatest(32767n).ordered(true)))))).schema([ABI.short]),
      (_: any) => _.unsigned_short.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(65536n).least(0n).greatest(65535n).ordered(true)))))).schema([ABI.unsigned_short]),
      (_: any) => _.int.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(32n).signed(true).overflow("raise")
          .least(-2147483648n).greatest(2147483647n).ordered(true)))))).schema([ABI.int]),
      (_: any) => _.unsigned_int.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(4294967296n)
          .least(0n).greatest(4294967295n).ordered(true)))))).schema([ABI.unsigned_int]),
      (_: any) => _.long.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(64n).signed(true).overflow("raise")
          .least(-9223372036854775808n).greatest(9223372036854775807n).ordered(true)))))).schema([ABI.long]),
      (_: any) => _.unsigned_long.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(18446744073709551616n)
          .least(0n).greatest(18446744073709551615n).ordered(true)))))).schema([ABI.unsigned_long]),
      (_: any) => _.long_long.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(64n).signed(true).overflow("raise")
          .least(-9223372036854775808n).greatest(9223372036854775807n).ordered(true)))))).schema([ABI.long_long]),
      (_: any) => _.unsigned_long_long.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(18446744073709551616n)
          .least(0n).greatest(18446744073709551615n).ordered(true)))))).schema([ABI.unsigned_long_long]),
      (_: any) => _.float.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary32").rounding("roundTiesToEven").width(32n)
          .radix(2n).precision(24n).emax(127n).ordered(true)))))).schema([ABI.float]),
      (_: any) => _.double.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n)
          .radix(2n).precision(53n).emax(1023n).ordered(true)))))).schema([ABI.double]),
      (_: any) => _.long_double.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.rounding("roundTiesToEven").width(80n)
          .radix(2n).precision(64n).emax(16383n).ordered(true)))))).schema([ABI.long_double]),
      (_: any) => _.wchar_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(32n).signed(true).overflow("raise")
          .least(-2147483648n).greatest(2147483647n).ordered(true)))))).schema([ABI.wchar_t]),
      (_: any) => _.char8_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(256n).least(0n).greatest(255n).ordered(true)))))).schema([ABI.char8_t]),
      (_: any) => _.char16_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(65536n).least(0n).greatest(65535n).ordered(true)))))).schema([ABI.char16_t]),
      (_: any) => _.char32_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(4294967296n).least(0n).greatest(4294967295n).ordered(true)))))).schema([ABI.char32_t]),
      (_: any) => _.size_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(18446744073709551616n)
          .least(0n).greatest(18446744073709551615n).ordered(true)))))).schema([ABI.size_t]),
      (_: any) => _.ptrdiff_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(64n).signed(true).overflow("raise")
          .least(-9223372036854775808n).greatest(9223372036854775807n).ordered(true)))))).schema([ABI.ptrdiff_t]),
      (_: any) => _.intptr_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(64n).signed(true).overflow("raise")
          .least(-9223372036854775808n).greatest(9223372036854775807n).ordered(true)))))).schema([ABI.intptr_t]),
      (_: any) => _.uintptr_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(18446744073709551616n)
          .least(0n).greatest(18446744073709551615n).ordered(true)))))).schema([ABI.uintptr_t]),
      (_: any) => _.int_least8_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(8n).signed(true).overflow("raise")
          .least(-128n).greatest(127n).ordered(true)))))).schema([ABI.int_least8_t]),
      (_: any) => _.int_least16_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(16n).signed(true).overflow("raise")
          .least(-32768n).greatest(32767n).ordered(true)))))).schema([ABI.int_least16_t]),
      (_: any) => _.int_least32_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(32n).signed(true).overflow("raise")
          .least(-2147483648n).greatest(2147483647n).ordered(true)))))).schema([ABI.int_least32_t]),
      (_: any) => _.int_least64_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.integer(
        (d: any) => d.width(64n).signed(true).overflow("raise")
          .least(-9223372036854775808n).greatest(9223372036854775807n).ordered(true)))))).schema([ABI.int_least64_t]),
      (_: any) => _.uint_least8_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(256n).least(0n).greatest(255n).ordered(true)))))).schema([ABI.uint_least8_t]),
      (_: any) => _.uint_least16_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(65536n).least(0n).greatest(65535n).ordered(true)))))).schema([ABI.uint_least16_t]),
      (_: any) => _.uint_least32_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(4294967296n)
          .least(0n).greatest(4294967295n).ordered(true)))))).schema([ABI.uint_least32_t]),
      (_: any) => _.uint_least64_t.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.isoiec11404((v: any) => v.modulo(
        (d: any) => d.modulus(18446744073709551616n)
          .least(0n).greatest(18446744073709551615n).ordered(true)))))).schema([ABI.uint_least64_t]),
      (_: any) => _.Float32x.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.format("binary64").rounding("roundTiesToEven").width(64n)
          .radix(2n).precision(53n).emax(1023n).ordered(true)))))).schema([ABI.Float32x]),
      (_: any) => _.Float64x.kind((k: any) => k.as_value((a: any) => a.as_union(
        (u: any) => u.ieee754((v: any) => v.ieee754(
        (d: any) => d.rounding("roundTiesToEven").width(80n)
          .radix(2n).precision(64n).emax(16383n).ordered(true)))))).schema([ABI.Float64x]),
    ])]))]);
}
