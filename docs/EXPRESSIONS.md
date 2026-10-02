# Expressions

Serializable expressions for [mbse-schemas](https://github.com/pitaman71/mbse-schemas): rules about its data and,
later, its constraints such as "at least one phone". This package depends on mbse-schemas (a sibling
checkout, pinned in `siblings.json`), whose [`FRAMEWORK.md`](https://github.com/pitaman71/mbse-schemas/blob/main/docs/FRAMEWORK.md) describes the
framework; this document covers expressions only.

Expressions come in dialects: expression languages that implement one framework, so that each is serializable,
structurally traversable, validatable, evaluatable, and translatable into the others. The Basic dialect is the core
vocabulary below, in which rules about mbse-schemas' data are written; `from mbse.Expressions import Expressions,
Evaluators` imports it. The Python, Matlab, Excel, Latex, Ccpp (C and C++) and SystemVerilog dialects model those languages' expressions (see
[Dialects](#dialects)); the framework is described under [The framework](#the-framework), and translation under
[Translators](#translators). Both implementations have all of them (see [`EQUIVALENCE.md`](EQUIVALENCE.md)).

```
python3/mbse/Expressions/, typescript5/src/
  Framework/     Expressions, Domains, Evaluators, Translators (and, in TypeScript, Errors): the protocols, and the
                 machinery that implements them
  Dialects/      Basic, Python, Matlab, Excel, Latex, Ccpp, SystemVerilog: each with Expressions and Domains, and all but Latex Evaluators
  Translators/   one module per pair of dialects, e.g. Basic_Excel
```

## The Basic dialect

- `Expressions.OfAny` : any expression
- `Expressions.OfLiteral` : a native value; conversion to and from the over-the-wire format is the responsibility of
  `Schemas.OfNative`
- `Expressions.OfOperation` : a named operation applied to ordered arguments, over an open vocabulary of string names
- `Expressions.OfVariable` : the value bound to a name
- `Expressions.OfLet` : binds a name to the value of one expression within another, its body; nest lets for several
  names
- `Expressions.OfQuantifier` : binds a name to each item of a collection within a body: `all`, `any` or `count` of the
  items for which the body holds

Every binding must implement a core vocabulary of operations. The core vocabulary is chosen so that any core expression
can also be interpreted as a constraint (e.g. by a solver or as a SystemVerilog constraint): operations are pure,
deterministic, and total, with no side effects or unbounded iteration.

| Group | Operations (arguments) |
|---|---|
| Access | `get(object, name)`: a property's value, unknown if absent; `has(object, name)`: whether it is present |
| Comparison | `eq`, `ne`, `lt`, `le`, `gt`, `ge` (2) |
| Boolean | `and`, `or`, `implies` (2), `not` (1) |
| Arithmetic | `add`, `sub`, `mul` (2), `neg` (1) |
| Bitwise | `bitand`, `bitor`, `bitxor` (2), `bitnot` (1); `shl`, `shr` (a value and a count) |
| Conversion | `convert`, `reinterpret`, `unpack` (1, with the operation's `domain`); `pack` (1) |
| Collections | `count(xs)`, `item(xs, i)`, `in(x, xs)`, `sum`, `min`, `max`, `unique` (1, but `item` and `in` 2); `entries(object, adjacency)` (2); the quantifiers `all`, `any`, `count` (`OfQuantifier`) |

Rules that every binding must evaluate use only the core vocabulary. Operation names outside it are extensions that a
binding may or may not support. A union value is a record of its one branch, by name, so a rule tests which branch it
holds with `has`, e.g. `has(get(this, 'reach'), 'email')`.

Evaluation is the concern of `Evaluators`: `Evaluators.OfAny(expression, scope)` binds the variables in `scope` and
returns a native value, an object, or unknown (`None`), and `Evaluators.OfLiteral`, `OfOperation`, `OfVariable` and
`OfLet` evaluate one kind, each accepting that kind's `Spec`:

- Three-valued logic: an absent property is unknown, and comparisons with unknown or incomparable values are unknown.
  `and`, `or`, `not` and `implies` follow Kleene's logic (`False and unknown` is `False`); the second operand is
  evaluated only when the first does not decide.
- No coercion. Comparisons follow mbse-schemas' [`EQUALITY.md`](https://github.com/pitaman71/mbse-schemas/blob/main/docs/EQUALITY.md): natives of one type by value, objects by identity; values of different
  types are incomparable (`lt(1, 1.5)` is unknown), and only `int`, `float`, `str` and `bytes` are ordered. Arithmetic
  takes numbers of one domain (`add(1, 1.5)` is an error). Values of other domains than the natives' defaults follow
  the same rules by domain (see Value domains).
- Unknown operations, wrong numbers of arguments, unbound variables and wrong operand types raise.
- `get` and `has` read any object that writes its properties through `accept`, including mbse-schemas' value
  objects, whose identity does not take part in equality, so they compare equal to nothing; reference objects
  compare by identity.

`Evaluators.predicate(rule, value)` evaluates a rule about a value with `this` bound to it, and returns `True`,
`False` or unknown (`None`); a rule whose value is not a bool raises. mbse-schemas needs no evaluator: its union values
name their branch, so neither decoding nor validation evaluates anything.

`validate(bound=(), core=False)` reports statically what evaluation would raise: missing names and values, non-native
literals, cycles (shared sub-expressions are not cycles), wrong numbers of arguments to core operations, variables not
bound by an enclosing let or in `bound`, and, with `core`, operations outside the core vocabulary.

Expressions are serializable and therefore follow the `Expressions.X.Data` `Expressions.X.Schema` `Expressions.X.Builder`
format:

- `Data` is `Visitable`. Builders follow the builder pattern (`create()` / `clone()` / `update()`, none validate) and
  implement `Visitors.OfObject`, which is how `Expressions.Builders` rebuilds expressions from snapshots.
- The meta-schemas are ordinary object schemas. Each declares `kind`, a tag with a fixed value (`literal`, `operation`,
  `variable`, `let`); `OfAny.Schema` is their union, discriminated by `eq(get(this, 'kind'), ...)`. A literal's schema
  declares one optional property per native type (`int`, `float`, `str`, `bool`, `bytes`), of which a literal sets
  exactly one. Operations, variables and lets declare `name`. Operations and lets declare the adjacency `arguments` to
  `Expressions.Arguments`, a relation linking a `parent` to an `argument` with an `index` and `unique(argument)`; a
  let's value is its argument 0 and its body its argument 1. Every kind declares `used_by`, the same relation seen from
  the argument, which the arguments imply: data never writes it, and builders ignore it.
- The meta-schemas are registered with `Proxies` as `Expressions.OfLiteral`, `Expressions.OfOperation`,
  `Expressions.OfVariable`, `Expressions.OfLet` and `Expressions.Arguments`, so snapshots, validation and comparison
  work on expressions as on any objects. Proxies can build them too (as proxies), which then also write `used_by`.

`Writer`s build expressions, which are data, with methods, and evaluate nothing. `.name` reads a property (`get`), and
methods build the operations: `.eq(x)` ... `.ge(x)`, `.and_(x)`, `.or_(x)`, `.not_()`, `.implies(x)`, `.add(x)`,
`.sub(x)`, `.mul(x)`, `.neg()`, `.has(name)`, `.get(name)`. `variable(name)`, `literal(value)`, `let_(name, value,
body)` and `operation(name, *arguments)` start writers, and a writer is accepted wherever an `Expressions.OfAny.Spec`
is:

```python
this = Expressions.variable('this')
adult = this.age.ge(18).and_(this.has('email'))
Evaluators.OfAny(adult, {'this': ann})   # True, False, or None when age is absent
```

In Python, `Python.Text.FromFunction(function)` reads the same expression from a function's source (a lambda, or a `def`
whose body is one `return`); each parameter becomes a variable. `.name` and `getattr` are `get`, `hasattr` is `has`,
`x.name is None` / `is not None` test presence, comparisons (including chains), `and` / `or` / `not`, `+` / `-` / `*`
and unary `-` map to the core operations, and `(lambda name: body)(value)` is a let. Other names are read from the
function's closure and globals when `FromFunction` runs. The result follows the expression's rules, not Python's: `1 ==
1.0` is unknown. TypeScript has no counterpart, since a JavaScript function has no Python source to read.

```python
adult = Python.Text.FromFunction(lambda this: this.age >= 18 and this.email is not None)
```

### Collections

- **A collection is a list or an object's entries.** `get` of a list property (mbse-schemas' `OfIndexed`) gives a
  `Domains.Collection`: its items in order and, for a keyed list, their keys. `entries(object, adjacency)` gives an
  object's entries in an adjacency as a collection of `Domains.Record`s, each holding the targets of the entry's other
  links and its property values, which `get` and `has` read as they read an object's properties. A scope may bind a
  variable to a collection, or to a list (a tuple in Python, an array in TypeScript), which is a positional one.
- **A collection's items are its values**, a keyed list's too; keys only address them. `count(xs)` is the number of
  items, `item(xs, i)` the item at a position (from 0) or, in a keyed list, at a key, unknown when there is none, and
  `in(x, xs)` whether `x` equals one of the items (Kleene's or of `eq`). `sum(xs)` adds the items in order, as `add`
  does (an empty sum is the int 0); `min` and `max` give the least and greatest item of an ordered domain, unknown when
  the collection is empty or two items are incomparable; `unique(xs)` is whether no two items are equal (Kleene's and of
  `ne`). Items of different domains raise, as they would in `add` or `lt`.
- **Quantifiers bind a name to each item.** `OfQuantifier` is a binding kind: `quantifier` (`all`, `any` or `count`)
  names it, `name` is bound to each item of its first argument, the `collection`, within its second, the `body`.
  `all` and `any` follow Kleene's logic, deciding at the first false or true body and true or false for an empty
  collection; `count` is the number of items whose body is true, unknown if any is unknown. Bodies are bools; the
  collection, like every argument, may be unknown, and then so is the result. Quantifiers are bounded by the data, so
  core expressions stay constraints.
- **Collections have domains for inference only**: `Domains.List(item)` and `Domains.Keyed(key, item)`, from the
  environment a rule is inferred in. A quantifier's name has its collection's item domain, and `item`, `sum`, `min` and
  `max` give it. There are no collection literals: collections come from data.

## Value domains

Domains are implemented as data and in evaluation: the kinds below, their validation, the registry, literals and
operations that carry them, typed values, comparisons, `Integer` and IEEE 754 arithmetic in every format, the bitwise
operations and the conversions. The domains make representation part of the type, as C, C++ and SystemVerilog need, and
as an interface control document describes a data word. Each names a published standard where one exists, with only
the parameters that standard defines, and today's natives become their defaults.

| Domain | Parameters | Default (today's native) |
|---|---|---|
| `Ieee754` | `format`: `binary16`, `binary32`, `binary64`, `binary128`, `decimal64` or `decimal128`; `rounding`: one of the standard's rounding-direction attributes, `roundTiesToEven`, `roundTiesToAway`, `roundTowardPositive`, `roundTowardNegative` or `roundTowardZero` | `binary64`, `roundTiesToEven` (`Float`) |
| `Integer` | `width`, optional (unbounded without it); `signed`; `overflow`: `wrap`, `saturate` or `raise` | unbounded (`Int`) |
| `Bits` | `width` | |
| `Bytes` | `width`, fixed or variable | variable (`Bytes`) |
| `Unicode` | none | `Str` |
| `Ieee1164` | `width`, optional: one state without it (`std_logic`), that many with it (`std_logic_vector`) | |
| `Enum` | its members, each with a `printable` value (its name as written) | |
| `Packed` | an `Enum` (its `domain`), a fixed-width `Integer` or `Bits` that represents it (its `representation`), and an integer `code` per member, the representation of each value | |
| `Bool`, `Object` | unchanged | |

- **Domains name standards.** `Ieee754` is IEEE 754-2019's interchange formats, with their values, special values and
  overflow (to infinity, with its exceptions) as the standard defines them; a format outside it (fp8, `bfloat16`, x87's
  80-bit format) would be a domain of its own, named for its specification, and none is defined yet. `Ieee1164` is
  VHDL's nine-valued `std_logic`; SystemVerilog's four-state `logic` is its subset `{0, 1, X, Z}`, an `Enum` of states.
  `Integer` is two's complement, the only signed representation C23 and C++20 allow, so ones' complement and
  sign-magnitude are not domains.
- **Basic has no implied promotions.** An operation takes its arguments' domains as they are: `add` of an
  `Integer(8)` and an `Integer(16)` does not apply until one is converted explicitly. A dialect's translator writes out
  its language's promotions as conversions.
- **Literals carry their domain.** A literal's `domain` is a value object, so `1` as an `Integer(8)` and `1` as an
  `Ieee754` are different literals, and two literals of equal domains are the same wherever their domains came from.
- **Domains are data, compared by structure, and registered by name.** Each kind is `Domains.Of<Kind>`, with `Data`
  (a dataclass in Python, a class with `equals` in TypeScript), a `Builder` and the meta-schema `Schema` of its value;
  `Domains.Schema` is their union, with the branch `named`. `Domains.register(name, domain)` registers a domain, once,
  under one name. Over the wire a literal of a registered domain carries its name, `{"named": {"name": "uint8"}}`, and
  any other its value, `{"integer": {"width": 8, "signed": true, "overflow": "raise"}}`; a name resolves in the
  registry. Signatures stay code: they are a dialect's vocabulary, not values on the wire. So do `Anything` and
  `OfValues`, which serve inference only and are never stored. Today's natives are the domains' defaults (`Int` is an
  unbounded `Integer`, and so on), and a domain includes only domains equal to it, so the core operations' signatures
  apply to no other domain until arithmetic takes them.
- **Arithmetic is exact, then rounded.** An `Ieee754` operation computes its exact result and rounds it to the format
  with the domain's rounding attribute, as the standard specifies; the formats with a host type (`binary32`,
  `binary64`) may take a shortcut that gives the same result. An `Integer` with a width wraps, saturates or raises on
  overflow; where a language leaves overflow undefined (C's signed integers), its translator chooses one.
- **`Bits` and `Bytes` are unformatted.** `Bytes(n)` and `Bits(8n)` hold the same patterns, but they are separate
  domains and convert explicitly, as `Integer` interprets bits explicitly.
- **`Unicode` values are sequences of code points, compared by code point.** An encoding (UTF-8, UTF-16, UTF-32) is
  representation only, for rendering (`char16_t`) and the wire: equal code points are equal strings in any encoding.
  Canonical equivalence is not equality; normalization is an explicit operation. A lone surrogate is not a value of
  `Unicode`. A `Unicode` domain has no width: a maximum length is a constraint of the data, and belongs in the schema.
- **`Enum` is a domain in its own right**: a C or SystemVerilog `enum`, one bit's states, or an enumeration of
  mbse-schemas.
- **Conversions are explicit, and of two kinds.** `convert` keeps the value, applying the target domain's overflow and
  rounding; `reinterpret` keeps the bit pattern, between fixed-width domains of the same size (C++'s `bit_cast`).
  `pack` gives a packed value's representation and `unpack` the packed value a representation stands for.
- **A literal without a domain has its native's default**: an `int` is an unbounded `Integer`, a `float` an `Ieee754`
  `binary64` rounding ties to even, a `str` a `Unicode`, `bytes` variable `Bytes`, a `bool` a `Bool`. A literal given its
  native's default domain holds none, so writers leave it out, and expressions stored before domains keep their meaning
  and their text.
- **A literal's value is a native of its domain**: an `int` for an `Integer`, a `float` for a binary `Ieee754` and the
  decimal text (a `str`) for a decimal one, `bytes` for `Bits` (big-endian, in the fewest bytes, the unused leading bits
  zero) and `Bytes`, a `str` for `Unicode`, `Ieee1164` (one of `U X 0 1 Z W L H -`, or as many as its width, the most significant first), an `Enum` and a `Packed` enum (a
  member's name), and a `bool` for `Bool`. Validation reports a value its domain does not hold.
- **An `Enum`'s members are unordered**: `eq` and `ne` only. A `Packed` enum orders by its representation, as C
  compares enums by their integers.
- **Packing is its own domain.** A `Packed` domain pairs a domain (an `Enum`, a record) with a fixed-size domain and the
  representation of each value in it: SystemVerilog's `enum logic [1:0] {IDLE, RUN}` is an `Enum` packed as `Bits(2)`.
  `pack(value, packed)` gives the representation and `unpack(representation, packed)` the value, so one `Enum` can be
  packed several ways.
- **A value of another domain than its native's default is a typed value**, `Domains.Value(domain, value)`, whose
  value is a native its domain holds (constructing one that it does not hold raises). Evaluating a literal of such a
  domain gives one, operations give one whenever their result's domain is not a default, and a scope may bind a
  variable to one; a value of a default domain is always the bare native, so rules over natives are unchanged.
  `Domains.of(value)` gives a value's domain, a typed value's own.
- **Comparisons take two values of one domain**; values of different domains are incomparable (unknown), so
  `eq(1 as int8, 1)` is unknown. Every domain has `eq` and `ne`. `Integer`, `Ieee754`, `Bytes`, `Unicode` and
  `Packed` are ordered; `Bool`, `Bits`, `Ieee1164` and `Enum` are not. `Ieee754` values compare as mbse-schemas
  compares floats: by IEEE 754's `totalOrder`, so `-0` comes before `0` and a decimal format's members of one cohort
  order by exponent (among positives the smaller first, so `1.50` before `1.5`), except that NaNs equal each other
  and are incomparable with numbers. A `Packed` value orders by its code.
- **Arithmetic takes two values of one domain, `Integer` or `Ieee754`, and gives that domain.** An `Integer` result
  outside the domain wraps (into the width, two's complement), saturates (to the nearer bound) or raises
  `OverflowError` (`"add overflows int8: 128"`); `wrap` needs a width. An `Ieee754` result is the exact one rounded to
  the format with the domain's rounding direction, with IEEE 754's default exception handling: overflow gives an
  infinity or, for directed roundings away from it, the largest finite number; invalid operations (`inf - inf`) give
  NaN; an exact zero sum is `+0`, or `-0` rounding toward negative. A decimal result keeps IEEE 754's preferred
  exponent (the smaller of the operands' for `add` and `sub`, their sum for `mul`) when it is exact.
- **An `Ieee754` value is a float in the binary formats up to `binary64`, and text otherwise.** `binary16`, `binary32`
  and `binary64` values are floats, which hold each of them exactly. `binary128` and the decimal formats are text in
  the General Decimal Arithmetic specification's scientific form (`1.5`, `1.50`, `1E+40`, `-0`, `Infinity`, `NaN`):
  a decimal value's text gives its coefficient and exponent, so cohort members differ, and a `binary128` value's is the
  shortest that rounds back to it. A value holds only its canonical text. NaN payloads and signaling NaNs are not
  values.
- **The bitwise operations take `Integer` and `Bits` values of one domain** (the default `int` among them).
  `bitand`, `bitor`, `bitxor` and `bitnot` work on two's complement patterns: of the width, so that results always fit,
  or infinite without one (as Python's ints), when a result outside the domain (`bitnot` of an unsigned) applies the
  domain's overflow. `shl` and `shr` take a value and a non-negative count of any `Integer` domain: on an `Integer`,
  `shl` multiplies by a power of two with the domain's overflow and `shr` divides rounding toward negative infinity (an
  arithmetic shift); on `Bits` both are logical within the width.
- **An operation's `domain` is the domain of its result.** `convert`, `reinterpret` and `unpack` need one, and other
  operations take none, as validation reports; unlike a literal's, it is kept when it is a native's default
  (`convert(x)` to `int` must say so), and inference gives it.
- **What converts.** `convert` keeps the value: from an `Integer` to an `Integer` (the target's overflow) or an
  `Ieee754` (the target's rounding); from an `Ieee754` to an `Ieee754` (the target's rounding) or to an `Integer`
  (rounded to an integer in the source's rounding direction, then the target's overflow; NaN raises `ValueError`, and
  an infinity overflows, or saturates to the bound it overflows); a decimal result that is exact keeps an exponent: the
  source's from a decimal, 0 from an integer, and from a binary number the greatest at which it is exact, but at most 0; between `Bytes` domains when the value fits; between an `Enum` and a `Packed` domain of it;
  and from any domain to itself. `reinterpret` keeps the bit pattern, big-endian, between `Integer`s of a width (two's
  complement), the binary `Ieee754` formats (their interchange encoding; a NaN is the canonical quiet NaN) and `Bits`
  and `Bytes` of a width, of the same number of bits; the decimal formats have two encodings (binary and densely
  packed decimal), and IEEE 754 leaves the choice open, so they do not reinterpret. `pack` takes a value of a `Packed`
  domain and gives its code in the representation; `unpack` takes a representation and gives the `Packed` value of
  that code, raising `ValueError` when no member has it. Anything else raises `TypeError`.
- **Widths are in mbse-schemas too**, in its natives, so that a schema's property and an expression over it have one
  type system. An `OfNative` holds a token `{format, name}` (`basic` is the neutral format, with Basic's names) and
  optionally a width in bits or in bytes; a domain interprets that width.

## The framework

`mbse.Expressions.Framework` defines what every dialect implements, and implements most of it from declarations, in
six modules: `Terms` (expressions, their forms, kinds and dialects), `Symbolics` (names, scopes and dependencies),
`Domains`, `Evaluators`, `Translators` and `Errors`.

- `Terms.Expression` is an expression of some dialect: `Visitable`, plus `dialect()`, `form()` and
  `validate()`. A `Form` is a term's structure: its `kind`, its native `attributes` and its ordered `arguments`.
  `Dialect.make(form)` is the inverse, and `walk`, `fold` (bottom-up, once per term, raising on cycles) and `same`
  (structural equality by co-traversal: natives of one type by value, NaN is NaN, -0.0 is not 0.0) work on any
  dialect through forms alone.
- `Terms.Dialect` is an expression language: `name()`, `kinds()`, `schema_of(expression)`, `make`, `resolve`
  (specs: expressions, `Writer`s, native values as literals, or callables taking the `AnyBuilder`), `validate`,
  `infer`, the union meta-schema `Schema` and the registry `Builders`.
- `Terms.Declared` derives a dialect from its kinds: each is a dataclass derived from `Term` whose class
  variables give its `KIND` (the tag), its `ROLE`, a literal's `VALUE` natives, its native `PROPERTIES` (required
  unless `OPTIONAL`), its arguments (`SLOTS`, fields of one argument each, then `VARIADIC`, one field holding the
  rest) and, for an application, the property naming its `OPERATOR` (or none, when the tag names it) and its
  `VOCABULARY` (operator names to signatures; `None` accepts any name, with `SIGNATURE`). A kind may add its own
  problems (`check()`), and a reference kind may be non-`LEXICAL` (resolved by the scope, never unbound) or have
  `AMBIENT` names, bound without a declaration. From these it derives builders (`create()` / `clone()` / `update()`, `Visitors.OfObject`, and the DSL
  `.set(name, value)`, `.arguments(*specs)`, `.argument(slot, spec)`), meta-schemas registered as
  `Expressions.<Dialect>.Of<Kind>` (Basic keeps its names), the union discriminated by Basic's
  `eq(get(this, 'kind'), tag)`, the registry, validation and inference. Every dialect shares the relation
  `Expressions.Arguments`.
- **Expressions are typed bindings of their meta-schemas.** A kind's meta-schema is the source of truth for its
  data, and `Declared` binds the kind's data class to it with mbse-schemas' `Bindings`: the kind gives `read` and
  `make`, between its fields and the schema's properties and the `arguments` entries, and declares `kind` fixed, a
  literal's native properties exclusive and `used_by` implied. Builders, `accept` and the registry are then
  mbse-schemas' generic ones, and every property kind the schema declares is supported alike: a literal's `domain` is
  an ordinary property holding a value object (a `ValueProperty`), with no holder schema.
  `Terms` keeps what is the framework's own: roles, forms, validation, inference and dialect declaration.
- The roles are what validation, inference, evaluation and translation understand without knowing the dialect:
  `literal` (a native value), `reference` (what the scope resolves: the value bound to a name, or a cell), `application`
  (an operator applied to arguments), `binding` (binds a name to its first argument within the others), `quantifier`
  (binds a name to each item of its first argument within its second, combined by its operator; its signature gives the
  items' domain, `items(domain)`) and `import` (makes what it declares available within its body: a module, a package's
  functions; `binds()` names what it binds for references). `validate` reports what the Basic
  section below lists, with the same messages in every dialect ("a literal needs a value", "identifier 'x' is not
  bound", "'**' is not a core operation"), where `core` means the dialect's vocabulary.
- `Domains` defines `Domain` (`contains(value)`, `includes(domain)`) and `Signature` (`arity()`, `result(domains)`,
  `describe()`), with generic implementations: `OfTypes`, `OfValues`, `OfUnion`, `Anything`, `Function`, `Same` (one
  of several domains, the same for every argument), `Overloaded` (the first signature whose parameters include the
  arguments', or else the union of the results of those that may apply), `Opaque` (any arguments, a fixed result: a
  call) and `Either` (gives one of its arguments, as Python's `and` does). Each dialect's `Domains` module
  declares its value domains and its vocabulary's signatures. `Dialect.infer(expression, environment)` gives an
  expression's domain from them, raising `TypeError` for an operator that cannot take its arguments' domains:
  `add cannot take (int, float); it takes (T, T) -> T for T in int | float`. Inference is permissive: `Anything`, the
  domain of a value not known statically, is accepted wherever a domain is expected, and extensions give `Anything`.
- `Symbolics` is about names. `free(expression)` gives the names an expression needs from its scope: its lexical
  references that no binding or import within it binds, and that are not ambient. `imports(expression)` gives the
  imports it declares, which its scope must provide. `Scope` is where references are resolved at evaluation, the
  dialect's way: `lookup(reference)`, `bind(name, value)` (the scope within a binding) and `enter(declaration)` (the
  scope within an import). `Variables` is the scope of names bound to values, which dialect scopes derive from, and an
  evaluator given a mapping makes its dialect's scope from it.
- `Evaluators` defines `Evaluator` (`(expression, scope) -> value`) and `Predicate` (`(rule, value) -> bool | None`,
  with `this` bound to the value). `Interpreter` evaluates by role and calls an implementation per operator with one thunk per
  argument and the scope, so each dialect decides what to evaluate and when; operators outside a closed vocabulary go
  to an `extension`, which is how Matlab and Excel call the functions their scopes provide. It raises what `validate`
  reports.
- `Partials` is partial evaluation, a peer of `Evaluators`: `Reducer(interpreter, literal, simplify)` evaluates every
  subexpression whose references the given variables determine and replaces it with the literal of its value, when the
  dialect has one (an object, a collection or an unknown value has none, and its subexpression stays); a binding of a
  known value binds it in its body and stays only while the body refers to it; other terms are rebuilt from their
  reduced arguments unless the dialect's `simplify` decides them from what is known. The result, the residual, is an
  expression of the same dialect that agrees with the original wherever the original evaluates without raising.
  Basic's `Partials.OfAny(expression, variables)` simplifies with Kleene's logic (`and(false, x)` is false, `and(true,
  x)` is `x`, `implies(false, x)` is true).
- `Errors` names the exceptions evaluation raises beyond mbse-schemas' own (`NameError`, `ImportError`,
  `OverflowError`, `ZeroDivisionError`): Python's own in Python, and classes of the same names in TypeScript.

## Dialects

| Dialect | Kinds | Values | Evaluation |
|---|---|---|---|
| Basic | `literal`, `operation`, `variable`, `let`, `quantifier` | natives, typed values, objects, collections | three-valued (Kleene), no coercion; absent is unknown |
| Python | `constant`, `name`, `attribute`, `subscript` (`x['k']`), `index` (`xs[i]`), `call`, `compare` (with `in`, `not in`), `boolop`, `binop` (arithmetic and bitwise), `unaryop` (`not`, `-`, `+`, `~`), `ifexp`, `generator` (`(e for p in xs if c)`), `let` (`(lambda a: body)(value)`), `import`, `importfrom`: Python's `ast` | Python's; a list property is a list of its values | Python's: `and`/`or` give an operand, `1 == 1.0`, `True + 1` is 2; absent attributes raise |
| Matlab | `constant`, `identifier`, `binary` (`==` ... `&&`, `\|\|`, `+`, `-`, `.*`), `unary` (`~`, `-`), `call` (`isfield`, `bitand`, `bitor`, `bitxor`, `bitshift`, `all`, `any`, `nnz`, `numel`, `sum`, `min`, `max`, `unique`, `ismember`, and functions of the scope), `field` (`s.age`), `index` (`xs(i)`, from 1), `arrayfun` (`arrayfun(@(p) body, xs)`), `import` (`import pkg.fn`, `import pkg.*`) | double, logical, string, struct, arrays of them | MATLAB's: two-valued with short-circuit, logicals and doubles convert, `+` concatenates strings; the bit functions take integers from 0 to 2^53; absent fields raise |
| Excel | `constant`, `name`, `cell` (`A1`, `Sheet1!B2`, `[Book.xlsx]Sheet1!A1`), `let` (`LET`), `function` (`AND`, `OR`, `NOT`, `IF` (2 or 3 arguments; `AND`, `OR`, `SUM`, `MIN` and `MAX` 1 to 255), `ISERROR`, `BITAND`, `BITOR`, `BITXOR`, `BITLSHIFT`, `BITRSHIFT`, `ROWS`, `INDEX`, `MATCH`, `ISNUMBER`, `SUM`, `MIN`, `MAX`, `UNIQUE`, and add-ins), `infix` (`=`, `<>`, `<` ... `+`, `-`, `*`), `prefix` (`-`), `field` (`r.age`), `map` (`MAP(xs, LAMBDA(p, body))`) | number, text, logical, error, record, arrays of them | Excel's: errors are values (`#FIELD!`, `#NAME?`, `#VALUE!`, `#REF!`) that propagate; `AND`/`OR` evaluate every argument, `IF` one branch; arithmetic coerces; comparisons order numbers < text < logicals and ignore case; the bit functions take integers from 0 to 2^48 - 1, else `#NUM!` |
| Ccpp | `constant` (with an optional type: `5u`, `1.5f`, `(uint8_t)5`), `identifier`, `unary` (`+`, `-`, `!`, `~`), `binary` (`*` ... `\|\|`, with C's precedence), `conditional` (`?:`), `cast` (`(type)x`), `member` (`x.a`, `x->a`), `subscript` (`a[i]`), `call` (functions of the scope) | C's arithmetic types under LP64 (`bool`, `char` ... `unsigned long long`, `int8_t` ... `uint64_t`, `size_t`, `float`, `double`, `long double` as IEEE 754 `binary128`), strings, structs, arrays | C's: the integer promotions and the usual arithmetic conversions; unsigned arithmetic wraps; what C leaves undefined (signed overflow, division by zero, shifts out of range, casts of floats out of range) raises; casts to integers wrap; comparisons give `bool`, as in C++; `?:` keeps its chosen operand's type |
| SystemVerilog | `constant` (unsized integers, reals, strings), `vector` (sized literals: `8'hff`, `4'b10x1`, `8'sd5`), `identifier`, `unary` (`+`, `-`, `!`, `~` and the reductions `&`, `~&`, `\|`, `~\|`, `^`, `~^`), `binary` (`**` ... `\|\|`, `===`, `==?`, `->`, `<->`, with IEEE 1800's precedence), `conditional`, `concatenation` (`{a, b}`), `replication` (`{n{a}}`), `select` (`a[i]`), `range` (`a[7:4]`), `inside` (with `span`s, `[lo:hi]`), `cast` (`int'(x)`, `signed'(x)`, `8'(x)`), `member`, `call` (system functions and functions of the scope), `method` (`xs.size()`, `xs.sum()`, `xs.min()`), `iterate` (`xs.and(p) with (p > 0)`) | 4-state and 2-state vectors of any width and signedness (`logic`, `bit`, `byte` ... `longint`, `integer`, `time`), `real` and `shortreal`, structs, arrays | IEEE 1800's: operands sized by context or by themselves, extended by signedness; x and z propagate through arithmetic and comparisons, and follow the truth tables of the bitwise and logical operators; `===` and `==?` compare exactly and with wildcards; division by zero gives x; casts convert as assignments do |
| Latex | `constant` (numbers, `\text{...}`, `\mathrm{true}`), `symbol` (`a`, `\mathit{age}`), `binary` (`=`, `\neq`, `<` ... `\land`, `\lor`, `\implies`, `+`, `-`, `\cdot`), `unary` (`\lnot`, `-`), `frac`, `member` (`x.\mathit{age}`), `function` (`\operatorname{has}`), `where` | number, text, truth | none: notation is written, rendered, checked and translated, and evaluated in the dialects it is translated to |

Python, Matlab, Excel, Latex, Ccpp and SystemVerilog each have a `Text` module, as every mbse framework names a
dialect's source text: `Text.ToText(expression)` is their source text (`hasattr(this, 'email') if this.age >= 18 else
True`, `this.age >= 18 && isfield(this, "email")`, `=AND(this.age >= 18, NOT(ISERROR(this.email)))`,
`\mathit{this}.\mathit{age} \geq 18 \land \operatorname{has}(\mathit{this}, \text{email})`), with imports as the lines
before the expression, and constructors for their kinds (`Excel.Expressions.function('AND', a, b)`, ...). In Python, the
Python dialect's `Text.FromText(source)` reads source text back: imports, then one expression. The Matlab and Excel
evaluators are models of those languages' rules for scalars, not calls into MATLAB or Excel, and so is the TypeScript
implementation's evaluator of Python expressions.

NumPy is not a dialect but a vocabulary of the Python dialect: `import numpy as np\nnp.greater_equal(t['age'], 18)`
is a Python expression, which evaluates vectorized, with missing values masked, when its scope allows numpy.

Each dialect resolves names, imports and references its own way, through its scope:

| Dialect | Scope | Names resolve to | Imports and functions |
|---|---|---|---|
| Basic | `Variables(variables)` | the innermost let, then the variable | none |
| Python | `Scope(variables, modules, builtins)` | the innermost let or import, then the variable, then the builtin (`abs`, `hasattr`, `len`, ...) | `import m`, `import m as a`, `from m import n`: only a module in `modules` or a submodule of one. Private attributes (`_x`) are refused, and a call may call only a builtin, a variable's value or a function of an allowed module |
| Matlab | `Scope(variables, functions, packages)` | the variable | a function is a built-in, then imported (`import pkg.fn`, `import pkg.*` from `packages`), then on the path (`functions`), then qualified (`pkg.fn`) |
| Excel | `Workbook(names, sheets, sheet=, name=, books=, add_ins=)` | the innermost `LET`, then the defined name, else `#NAME?`; a cell is its value on its sheet and book, 0 if empty, `#REF!` if the sheet or book does not exist | a function is a built-in, then an add-in, else `#NAME?` |
| Ccpp | `Scope(variables, functions=)` | the variable, typed by its value | a function is one the scope provides |
| SystemVerilog | `Scope(variables, functions=)` | the variable, typed by its value (a `Logic`, a real, or Basic's typed values as vectors) | a function is a system function (`$clog2`, `$bits`, ...), then one the scope provides |

Expressions may come from data, so nothing is imported or called unless the caller's scope provides it: an import
resolves only what the scope allowlists, never by loading code.

## Translators

`Framework.Translators.Translator` translates between two dialects both ways: `left()`, `right()`,
`forward(expression, trace=None)`, `backward(...)` and `inverse()`. Each pair of dialects has its own, specialized
to what the two have in common, in `mbse.Expressions.Translators.<Left>_<Right>`; `Translators.between(source,
target)` finds the one that translates from `source` to `target`.

A pairwise translator (`Pairwise`) is declared as rules:

- `Rule(left, right, direction='both')` pairs two `Pattern`s, forms whose arguments and attributes may be `Hole`s:
  `Rule(Pattern('operation', X, Pattern('literal', value=K), name='has'), Pattern('function', Pattern('function',
  Pattern('field', X, name=K), name='ISERROR'), name='NOT'))` translates Basic `has(x, 'email')` to and from Excel
  `NOT(ISERROR(x.email))`. A hole in an attribute binds a native value, of the types it names; one bound twice must
  bind the same term or equal values. A rule may apply `forward` or `backward` only, when its other direction would
  capture expressions it should not (Matlab writes `implies(a, b)` as `~a || b`, which reads back as `or(not(a),
  b)`). `renames` declares the rules for operators that differ only in name.
- `Inline(kind, side)` translates a binding that the other dialect has no counterpart for by substituting its value
  for its name: Matlab has no let.
- `Elide(kind, side)` translates an import that the other dialect cannot declare as its body: what it brought in must
  be translated by other rules, or has no counterpart. `Prelude(pattern, side)` adds an import to translations that
  refer to a name it binds: `Translators.Basic_Python.NUMPY`, a second translator between Basic and Python, writes
  NumPy's functions (`np.greater_equal(this['age'], 18)`) and adds `import numpy as np`.
- `Convert(left_kind, right_kind, forward, backward)` translates literals whose values the dialects write
  differently, by functions of their attributes: a Basic literal of `uint8` is C's `(uint8_t)200` and SystemVerilog's
  `8'd200`. A function gives None where there is no counterpart, and conversions are tried after the rules of their
  kind.

Translation co-traverses. At each term, the rules whose source pattern has the term's kind are tried, the most
specific first (the most terms and fixed attributes), by traversing pattern and expression in lockstep to bind the
holes; the first that matches is applied by instantiating its target pattern with the bound attributes and the
translations of the bound arguments. Each term is translated once (per binding environment), so shared
sub-expressions stay shared, and an inlined value is shared by every use of its name. `trace`, if given, receives
the pairs of corresponding source and target terms. A term no rule matches raises `ValueError` naming it ("Basic
literal b'\x00' has no Excel counterpart", "Excel function 'ISERROR' has no Basic counterpart").

What translation guarantees, and what the TRN suite checks: every pair round-trips expressions that both dialects
can write (lets and implies are the exceptions above); translating directly or through a third dialect gives the
same expression; and a translation keeps an expression's form, not always its value. Where the dialects' rules
agree (operands of one type, values present), translations evaluate alike; elsewhere they do not: a missing property
is unknown in Basic, masked in NumPy, `#FIELD!` in Excel and an error in Python and MATLAB, and `1 == 1.0` is unknown
in Basic but true in the others.

Basic and Ccpp translate into each other: Basic's operations are C's operators, `get` a member with `.`, and lets are
inlined; `has` and members with `->` have no counterpart, and Ccpp translates to the other dialects through Basic, not
directly. A typed constant is a literal of a value domain: C's integer types are `Integer` domains of 8, 16, 32 and
64 bits, written with `<stdint.h>`'s names (`5u` reads as `uint32` and writes back as `(uint32_t)5`), and its floating
types the binary IEEE 754 formats; other domains have no C counterpart.

Basic and SystemVerilog translate into each other likewise: `implies` is `->`, `shr` the arithmetic `>>>`, a bool
`1'b1` or `1'b0`, and lets are inlined; `has`, the logical `>>` and the 4-state comparisons have no counterpart yet.
A sized vector is a literal of a value domain, its base telling which: `Integer` domains are decimal vectors of their
width and signedness (`8'd200`, `8'sd251` for -5), `Bits` hexadecimal ones (`12'habc`), and `Ieee1164`'s 0, 1, X and
Z binary ones (`1'bx` for a `std_logic`, `4'b10xz` for a `std_logic_vector`); back, a vector with x or z bits, or an
unsigned binary one, is an `Ieee1164` value. Its other levels and the IEEE 754 formats have no counterpart. On integers both dialects represent, translations evaluate alike, a SystemVerilog truth being a single
bit.

Collections translate to Python's builtins and generator expressions: `all(p.pin > 0 for p in this.ports)`, `any(...)`,
the quantifier `count` as `sum(1 for p in xs if body)`, `count(xs)` as `len(xs)`, `item(xs, i)` as `xs[i]`, `in(x, xs)`
as `x in xs`, and `sum`, `min` and `max` as the builtins of one argument, all reading back. `unique(xs)` is written
`len(set(xs)) == len(xs)` and does not read back. Over lists of values, both dialects evaluate them alike.
SystemVerilog writes them as array methods: `xs.and(p) with (body)` and `xs.or(p) with (body)`, the quantifier `count`
as `xs.sum(p) with (int'(body))`, `count(xs)` as `xs.size()`, `sum(xs)` as `xs.sum()`, `min` and `max` as
`xs.min()[0]` and `xs.max()[0]`, `item(xs, i)` as `xs[i]`, `in(x, xs)` as `x inside {xs}`, and `unique(xs)` as
`xs.unique().size() == xs.size()`, forward only. MATLAB uses `arrayfun`: `all(arrayfun(@(p) body, xs))`,
`any(...)`, the quantifier `count` as `nnz(arrayfun(...))`, `count(xs)` as `numel(xs)`, `item(xs, i)` as `xs(i + 1)`
(it counts from 1), `in(x, xs)` as `ismember(x, xs)`, `sum`, `min` and `max` as its functions, and `unique(xs)` as
`numel(unique(xs)) == numel(xs)`, forward only. Excel uses `MAP` and `LAMBDA`: `AND(MAP(xs, LAMBDA(p, body)))`,
`OR(...)`, the quantifier `count` as `SUM(MAP(xs, LAMBDA(p, IF(body, 1, 0))))`, `count(xs)` as `ROWS(xs)`, `item(xs, i)`
as `INDEX(xs, i + 1)`, `in(x, xs)` as `ISNUMBER(MATCH(x, xs, 0))`, `sum`, `min` and `max` as `SUM`, `MIN` and `MAX`, and
`unique(xs)` as `ROWS(UNIQUE(xs)) = ROWS(xs)`, forward only. Where Basic's `all` of no items is true, Excel's `AND` of
no values is `#VALUE!`.

The bitwise operations translate to Python's operators and to MATLAB's and Excel's bit functions (`shr(a, n)` is
MATLAB's `bitshift(a, -n)`); `bitnot` has no MATLAB or Excel counterpart, and the conversions and typed values have none
in Python, MATLAB, Excel or Latex yet. MATLAB's and Excel's bit functions take only non-negative integers, so translations evaluate
alike only there.

## Open questions

- Collections have no literals, and Basic has no tensor domain over keyed and extended lists, nor `map` or `filter`.
- Collections translate between Basic and Python, SystemVerilog, MATLAB and Excel, and directly between Python,
  MATLAB and Excel; not to Latex or Ccpp, nor directly between SystemVerilog and the others, which have no translator
  of their own. `unique` is written as an idiom that does not read back, and `entries` has no counterpart.
- SystemVerilog's reductions of no items give their identities (0, 1, `1'b1`, `1'b0`), which IEEE 1800 leaves to
  tools; `min()[0]` of an empty array raises, where Basic's `min` is unknown.
- Reading rules from source text and writing them back is the work of a bridge between mbse-programs' syntax trees
  and the dialects' terms (see Resolved). Until it exists, every dialect's `Text.ToText`, and Python's `Text.FromText`
  and `Text.FromFunction`, stay here; whether they move to the bridge or delegate to it is undecided.
- Excel's ranges (`A1:B3`) and structured references (`Table1[@age]`) are not modeled; they need array values.
- `Symbolics` has imports, an expression's dependencies, but no exports. Exports would name what a unit of
  expressions (a module of rules, a MATLAB package, a workbook's defined names) provides to others; they need a unit
  that groups expressions, which no dialect has yet.

## Resolved

- A dialect's source text is its `Text` module, as in every mbse framework, where text is one more dialect or variant:
  `Text.ToText(expression)` writes it, and `Text.FromText(source)` reads it back (Python's, in Python only), replacing
  `render` and `parse`. Python's `Text.FromFunction(function)` reads a function's source into a Basic expression,
  replacing Basic's `Expressions.from_`.

- Parsing and printing source code belong in mbse-programs, which holds each language's complete syntax tree with an
  established parser and printer, not in mbse-expressions, whose dialects hold the terms of rules. No dialect gains a
  parser here; a rule in source text is read by mbse-programs and translated to a dialect.

- An `Ieee1164` domain of a `width` is VHDL's `std_logic_vector`, its value that many states, the most significant
  first; without one it is a single `std_logic`. SystemVerilog's binary vectors and those with x or z bits are its
  counterparts.
- A function may take a range of numbers of arguments: its signature takes any number (arity -1) and its kind checks
  the range, in validation and in evaluation alike. Excel's `IF` takes 2 or 3 (FALSE without an alternative), and
  `AND`, `OR`, `SUM`, `MIN` and `MAX` 1 to 255, as Excel's do.
- The direct translators between Python, MATLAB and Excel write collections as their translators with Basic do, from
  one table of each dialect's forms (`_Patterns.COLLECTIONS`), so that every route gives the same expression.

- The mbse repositories stay separate, beside each other as sibling checkouts. A dependent installs its siblings as
  they are (`../../mbse-schemas/python3`, `file:../../mbse-schemas/typescript5`), so a change in one is seen at once by
  the others, and pins the version and commit of each it was tested with in `siblings.json`: a sibling is compatible
  at the same minor version below 1.0 and no older, and `pyproject.toml` requires that range; the commit reproduces
  the checkout, since the lock files record siblings by path, without a hash, and a release is the tag `v<version>`.
  `scripts/siblings.py` checks the siblings, clones those missing at their pinned commits, and pins new ones.
- The vocabulary is shared with mbse-schemas and mbse-programs: an element of an expression's tree is a *term* (every
  kind derives from `Terms.Term`), never a bare node, and the objects that build expressions with methods are
  *writers* (`Writer`). A kind's named values are *properties*; "field" means only a dataclass's or class's field.
- Collections translate to Python as generator expressions, a quantifier kind of the Python dialect whose conditions,
  like its element, see the bound name; the framework binds the name in every argument after the collection. A
  list property is a list of its values in Python, a keyed list's too, so that iteration, `in` and `sum` see values as
  Basic's collections do. `unique`, which has no single call in Python, is written as an idiom, forward only.
- In MATLAB, collections are arrays (a list property's values, as doubles), which operators do not take: they are
  counted, reduced, indexed from 1 and iterated by `arrayfun`, a quantifier kind for `arrayfun(@(p) body, xs)`, whose
  body must give a numeric or logical scalar.
- In Excel, collections are arrays, which operators do not take (`#VALUE!`): `MAP` and `LAMBDA` are `map`, a
  quantifier kind, and the array functions read them as Excel does, ignoring the text in an array where `SUM`, `AND`
  and `OR` would convert a value given alone. A vocabulary's signature may take any number of arguments (arity -1),
  as `AND` and `OR` do.
- In SystemVerilog, collections are arrays and their operations IEEE 1800's array methods; a reduction's `with` clause
  is `iterate`, a quantifier kind, and `inside` takes an array among its items as its elements.

- Typed literals translate by `Convert`, a rule of functions over a literal's attributes, rather than by patterns,
  which only copy values. A dialect's literal names its type by the other dialect's convention where the two differ:
  C's `<stdint.h>` names, SystemVerilog's base (decimal for integers, hexadecimal for bits, binary for single
  `Ieee1164` bits). Translations from Basic round-trip; from C or SystemVerilog they keep the type and the value, not
  the spelling.

- SystemVerilog's integral values are 4-state (`Domains.Logic`, its bits encoded as VPI's `aval` and `bval`) whatever
  their type, a 2-state type keeping x and z at 0; evaluation sizes operands as IEEE 1800 does, rather than in Basic's
  unbounded integers. A shift by the width or more shifts every bit out, and `$bits` gives its argument's type's width
  without evaluating it. A string is a vector of its UTF-8 bytes.

- Value domains: conversions are `convert` (keeps the value) and `reinterpret` (keeps the bit pattern), with `pack` and
  `unpack` for packed domains; a literal stored without a domain has its native's default domain, and writers leave
  defaults out; an `Enum` is unordered unless packed, when it orders by its representation.
- A literal holds its domain by value, as a value object, written by name when the domain is registered and by value
  otherwise; domains compare by structure. A packed domain packs an enum into a fixed-width integer or bits, with an
  integer code per member.
- Value domains name published standards where one exists (`Ieee754`, `Ieee1164`), with only the parameters the
  standard defines, rather than free representation parameters: no float format by widths and flags, no ones'
  complement or sign-magnitude integers, no `Decimal` apart from IEEE 754's decimal formats. The dialect keeps its
  name, Basic, which mbse-schemas' neutral token format (`basic`) shares.
- Partial evaluation gives a residual expression, never only a value: a literal when everything is known, otherwise
  the simplified remainder, which serializes and translates like any expression.
- Collections: lists and an object's entries (`entries`), read as `Domains.Collection`s whose items are their values
  and keys address them; the quantifiers are a binding kind, `OfQuantifier` (`all`, `any`, `count`), and the operations
  `count`, `item`, `in`, `sum`, `min`, `max` and `unique` join the core; collection domains (`List`, `Keyed`) serve
  inference only, and there are no collection literals.
- Evaluation in value domains: a value of a non-default domain is a typed value (`Domains.Value`), and a default
  domain's value stays the bare native; an operation's optional `domain` is the domain of its result, which `convert`,
  `reinterpret` and `unpack` need and `pack` does not; the bitwise operations (`bitand`, `bitor`, `bitxor`, `bitnot`,
  `shl`, `shr`) join the core vocabulary; every IEEE 754 format is evaluated, `binary128` and the decimal formats as
  canonical text.
- Expressions are a program's own classes bound to their meta-schemas with mbse-schemas' `Bindings`, not builders of
  their own: what is generic to any schema (visitor protocols over a state, finalizing, the registry, value objects in
  properties) lives once, in mbse-schemas, and `Terms` gives only `read`, `make` and the DSL.

- Expressions are `Expressions.OfAny`, `OfLiteral`, `OfOperation`, `OfVariable` and `OfLet`, each with `Data`,
  `Builder`, `Spec` and a meta-schema `Schema` that is an ordinary registered object schema tagged by `kind`. Arguments
  are an ordered relation (`index`, `unique(argument)`); a literal's schema has one property per native type.
- There is no `is` operation: unions discriminate by a tag property compared with a fixed value.
- `Python.Text.FromFunction` (Python only) reads an expression from a function's source with `ast`.
- Evaluation is its own module, `Evaluators`, with one entry point per expression kind (`Evaluators.OfAny`, ...).
- Expressions are partitioned into dialects over one framework (`Framework`), each declared by its kinds' roles;
  translators are pairwise, declared as bidirectional pattern rules, and applied by co-traversal.
- mbse-schemas' unions name their branches, and it takes no evaluator; `Evaluators.predicate` evaluates a rule about a
  value, binding it to `this`. Each dialect's union of meta-schemas names its branches by the kinds' tags.
- Evaluation is three-valued (Kleene), never coerces, and reads properties with `get(object, name)`; variables are
  bound by `OfLet` or by the caller's scope. `Writer`s build expressions with methods only (no operator overloading), so
  both bindings read the same.
