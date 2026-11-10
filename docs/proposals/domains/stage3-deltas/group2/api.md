# API.md items, for "Settled in domains as data's stage 3", group 2 (SystemVerilog)

Numbered here S1 to S8, to be numbered after group 1's items (131 onward). Each choice the design left open is marked
*(agent)*.

S1. **SystemVerilog's kinds and schemas.** Its install adds the kind `bit`, IEEE 1800's 2-state integral
    (`Expressions.SystemVerilog.Expressions.OfBit`: `width`, `signed`; inferred `least`, `greatest`, `ordered`), beside
    `logic`, its union `Expressions.SystemVerilog.Expressions.DomainKind` now `logic` then `bit`; and its 2-state
    domains' schemas, each a `Schemas.OfAny` of the scalar it narrows: `Expressions.SystemVerilog.Expressions.bit`,
    `byte`, `shortint`, `int` and `longint` of ints, `real` and `shortreal` of floats. A 4-state type has no schema: no
    basic scalar holds x or z.
S2. **`SystemVerilog.define`** (`mbse.Expressions.SystemVerilog.Expressions.define/1`; exported by the package, as
    `install` is), run after the installs in a transaction of its own, idempotent, in fluent builder syntax, each domain
    written inline as the standard dialects' are: the singleton `Expressions.SystemVerilog.Expressions` owns by name,
    through `Defines`, in this order, `logic`, `reg`, `integer`, `time` (kind `logic`: width 1, 1, 32, 64; signed
    false, false, true, false), `bit`, `byte`, `shortint`, `int`, `longint` (kind `bit`: width 1, 8, 16, 32, 64;
    signed false, true, true, true, true), each with `least` and `greatest` of its known values written as literals
    (`time`'s greatest 18446744073709551615) and `ordered` true; and `real`, `shortreal` (IEEE 754's `ieee754`:
    `binary64` and `binary32`, rounding `roundTiesToEven`, radix 2, precision 53 and 24, emax 1023 and 127, ordered,
    as IEEE 754's own domains). Each 2-state domain is related to its schema by `HasDomain`; `reg` is its own domain,
    of `logic`'s properties. Its frame binds `dialect` and each domain by its name
    (`store.transaction(SystemVerilog.define)[0]["int"]`).
S3. **The type table goes** (Decided, K): `Domains.TYPES` and its constants `Real`, `Integer`, `Bit` and `Longint`, and
    `Expressions.CASTS`, are removed in both languages. `Domains.named(store, name)` *(agent)* reads the type
    SystemVerilog defines by `name` in a store: the domain its singleton owns by that name (its `domains` entries),
    as an `SvType` of its kind's properties (`Framework.Domains.kind_of`, `properties`): an integral of its `width`
    and `signed`, 4-state for `logic`, 2-state for `bit`; a `real` of IEEE 754's `format`, its width that format's
    interchange width (`Ieee754.WIDTHS`, until IEEE 754's kind holds `width`) *(agent)*, signed and 2-state as before.
    It is labelled with its `Defines` name, and carries the domain it was read from (`SvType.domain`, compared by
    nothing; None for a sized vector) *(agent)*. A store where the define has not run, or a name it defines no type
    by, is refused by name: ValueError, `'int' is not a type SystemVerilog defines` *(agent)*.
S4. **What stays code** (Decided, 2): `SvType`, `Logic`, `vector`, `common` and the signatures. `Domains.of(value)`
    now names a constant's type (`"integer"`, `"longint"`, `"real"`, or None) rather than giving it *(agent)*.
    `common`'s real is an operand's type, or, for a `shortreal` among integrals, the `real` read from the store of that
    operand's domain *(agent)*. `===`'s and `!==`'s signature checks its operands as before and gives a 1-bit 2-state
    vector, which inference names `bit` from the store (below) *(agent)*.
S5. **Through the holder, and only where a named type is read** (Decided, C, K) *(agent)*: each entry point reaches the
    store of the term's holder (`Proxies.store_of`) exactly where it reads a named type, and not otherwise:
    - **validation** (`DIALECT.validate`): a cast that names a type (`int'(x)`), which must be one SystemVerilog
      defines in that store, else `'word' is not a type SystemVerilog defines` (replacing "a cast's type must be a
      built-in type, signed or unsigned, got 'word'") *(agent)*; a cast to `signed`, `unsigned` or a width, and every
      other kind, reads no store;
    - **inference** (`DIALECT.infer`): an unsized constant's type (`integer`, `longint`, `real`) and a cast's, through
      `Kind.typed` (the `literal`'s, new, and the `cast`'s), and `===`'s and `!==`'s `bit`, through the `binary` kind's
      new `typed` *(agent)*; the dialect's `domain_of` gives `Anything`, for a constant no type holds (a string, an int
      beyond 64 bits) *(agent)*;
    - **evaluation** (`Evaluators.OfAny`): every named type it computes in, each read once per evaluation when first
      needed: a constant's and a variable's value's type (a bool's `bit`, an int's `integer` or `longint`, a float's
      `real`), a cast's target, `===`'s, `$isunknown`'s and `$onehot`'s `bit`, `size()`'s `int`, `$bits`',
      `$countones`' and `$clog2`'s and the empty `sum()`'s and `product()`'s `integer`, an array's float's `real`.
    A lone term reaching for a type is refused by mbse-schemas' TypeError ("the value does not belong to a store"),
    with no fallback and no new argument; a lone term that reads none (`4'b1010 & 4'b0110`, a sized vector's
    inference) is read as before. `Text.ToText` and the translators read no type.
S6. **Every caller runs `SystemVerilog.define`** after the installs, as it runs `Patterns.define`: the suites' setups
    (FRM, DIA, TRN), the tutorials' toolkit (`cold_chain`), the corpus's store (`build()`, for its
    `systemverilog_domains` case and for CONF-04's validation of the `systemverilog` case's `byte'(...)`), and the
    skill's install list. Tutorial 8 holds its SystemVerilog translation in an `Expression` (T08.3), its outputs
    unchanged.
S7. **Tests**, under their IDs in both languages: DOM-20 (new: SystemVerilog's stored domains, their kinds, properties,
    names, schemas both ways, none for 4-state, `named`, the define idempotent, a round trip); DOM-18 (the kind `bit`);
    FRM-01 (SystemVerilog's kinds `logic`, `bit`); DIA-13 (types read from the store, `of` by name, a cast's undefined
    type refused by name, a store without the define defining none, a lone term refused where it reads a type and
    read where it reads none); DIA-14 (types compared with the stored ones, a lone term refused in evaluation where it
    needs a type and evaluated where it needs none); the corpus's `systemverilog_domains` and CONF-04.
S8. **A breaking change**, in 0.9.0: the removed exports (`Domains.TYPES`, `Real`, `Integer`, `Bit`, `Longint`,
    `Expressions.CASTS`), `Domains.of`'s result, SystemVerilog's define required to evaluate, infer or validate what
    reads a named type, a lone term refused there, and the cast's message.
