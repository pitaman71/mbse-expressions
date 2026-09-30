# Expressions

Serializable expressions for [mbse-schemas](https://github.com/pitaman71/mbse-schemas): rules about its data and,
later, its constraints such as "at least one phone". This package depends on mbse-schemas (a submodule
at `submodules/mbse-schemas`), whose [`FRAMEWORK.md`](../submodules/mbse-schemas/docs/FRAMEWORK.md) describes the
framework; this document covers expressions only.

Expressions come in dialects: expression languages that implement one framework, so that each is serializable,
structurally traversable, validatable, evaluatable, and translatable into the others. The Basic dialect is the core
vocabulary below, in which rules about mbse-schemas' data are written; `from mbse.Expressions import Expressions,
Evaluators` imports it. The Python, Matlab, Excel and Latex dialects model those languages' expressions (see
[Dialects](#dialects)); the framework is described under [The framework](#the-framework), and translation under
[Translators](#translators). Both implementations have all of them (see [`EQUIVALENCE.md`](EQUIVALENCE.md)).

```
python3/mbse/Expressions/, typescript5/src/
  Framework/     Expressions, Domains, Evaluators, Translators (and, in TypeScript, Errors): the protocols, and the
                 machinery that implements them
  Dialects/      Basic, Python, Matlab, Excel, Latex: each with Expressions and Domains, and all but Latex Evaluators
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

Every binding must implement a core vocabulary of operations. The core vocabulary is chosen so that any core expression
can also be interpreted as a constraint (e.g. by a solver or as a SystemVerilog constraint): operations are pure,
deterministic, and total, with no side effects or unbounded iteration.

| Group | Operations (arguments) |
|---|---|
| Access | `get(object, name)`: a property's value, unknown if absent; `has(object, name)`: whether it is present |
| Comparison | `eq`, `ne`, `lt`, `le`, `gt`, `ge` (2) |
| Boolean | `and`, `or`, `implies` (2), `not` (1) |
| Arithmetic | `add`, `sub`, `mul` (2), `neg` (1) |
| Collections (not built yet) | `count`, `in`, and bounded quantifiers `all` / `any` over an object's adjacency entries |

Rules that every binding must evaluate use only the core vocabulary. Operation names outside it are extensions that a
binding may or may not support. A union value is a record of its one branch, by name, so a rule tests which branch it
holds with `has`, e.g. `has(get(this, 'reach'), 'email')`.

Evaluation is the concern of `Evaluators`: `Evaluators.OfAny(expression, scope)` binds the variables in `scope` and
returns a native value, an object, or unknown (`None`), and `Evaluators.OfLiteral`, `OfOperation`, `OfVariable` and
`OfLet` evaluate one kind, each accepting that kind's `Spec`:

- Three-valued logic: an absent property is unknown, and comparisons with unknown or incomparable values are unknown.
  `and`, `or`, `not` and `implies` follow Kleene's logic (`False and unknown` is `False`); the second operand is
  evaluated only when the first does not decide.
- No coercion. Comparisons follow mbse-schemas' [`EQUALITY.md`](../submodules/mbse-schemas/docs/EQUALITY.md): natives of one type by value, objects by identity; values of different
  types are incomparable (`lt(1, 1.5)` is unknown), and only `int`, `float`, `str` and `bytes` are ordered. Arithmetic
  takes numbers of one type (`add(1, 1.5)` is an error).
- Unknown operations, wrong numbers of arguments, unbound variables and wrong operand types raise.
- `get` and `has` read any object that writes its properties through `accept`, including mbse-schemas' embedded
  objects. Embedded objects have no identity, so they compare equal to nothing.

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

`Term`s write expressions with methods; they build data and evaluate nothing. `.name` reads a property (`get`), and
methods build the operations: `.eq(x)` ... `.ge(x)`, `.and_(x)`, `.or_(x)`, `.not_()`, `.implies(x)`, `.add(x)`,
`.sub(x)`, `.mul(x)`, `.neg()`, `.has(name)`, `.get(name)`. `variable(name)`, `literal(value)`, `let_(name, value,
body)` and `operation(name, *arguments)` start terms, and a term is accepted wherever an `Expressions.OfAny.Spec` is:

```python
this = Expressions.variable('this')
adult = this.age.ge(18).and_(this.has('email'))
Evaluators.OfAny(adult, {'this': ann})   # True, False, or None when age is absent
```

In Python, `Expressions.from_(function)` reads the same expression from a function's source (a lambda, or a `def` whose
body is one `return`); each parameter becomes a variable. `.name` and `getattr` are `get`, `hasattr` is `has`,
`x.name is None` / `is not None` test presence, comparisons (including chains), `and` / `or` / `not`, `+` / `-` / `*`
and unary `-` map to the core operations, and `(lambda name: body)(value)` is a let. Other names are read from the
function's closure and globals when `from_` runs. The result follows the expression's rules, not Python's: `1 == 1.0`
is unknown. TypeScript has no counterpart, since a JavaScript function has no Python source to read.

```python
adult = Expressions.from_(lambda this: this.age >= 18 and this.email is not None)
```

## Value domains

Designed, not yet implemented. Today Basic's domains are its natives (`Bool`, `Int`, `Float`, `Str`, `Bytes`) and
`Object`. The domains below make representation part of the type, as C, C++ and SystemVerilog need, and as an interface
control document describes a data word. Each is parameterized, and today's natives become their defaults.

| Domain | Properties | Default (today's native) |
|---|---|---|
| `Float` | `mantissa` and `exponent` widths; presence of the `hidden` bit, `subnormals`, the `sign` bit, `nans` and `infinities`; `overflow`; `rounding` | IEEE binary64 (`Float`) |
| `Integer` | `width`, optional (unbounded without it); `encoding`: unsigned, two's complement, ones' complement or sign-magnitude; `overflow` | unbounded (`Int`) |
| `Decimal` | signed, string-encoded, of variable length; `rounding` | |
| `Bits` | `width`, fixed or variable; `states`, an `Enum` of the values of one bit | `{0, 1}` states |
| `Bytes` | `width`, fixed or variable | variable (`Bytes`) |
| `Unicode` | `encoding`: one of the UTF encodings | UTF-8 (`Str`) |
| `Enum` | its members, each with a `printable` value (its name as written) | |
| `Packed` | a domain, a fixed-size domain that represents it (`Integer`, `Float`, `Bits` or `Bytes` of a fixed width), and the representation of each value | |
| `Bool`, `Object` | unchanged | |

- **Basic has no implied promotions.** An operation takes its arguments' domains as they are: `add` of an
  `Integer(8)` and an `Integer(16)` does not apply until one is converted explicitly. A dialect's translator writes out
  its language's promotions as conversions.
- **Literals carry their domain.** Over the wire a literal refers to its domain explicitly, so `1` as an `Integer(8)`
  and `1` as a `Float` are different literals.
- **Domains are mbse-schemas objects, as expressions are.** Every property above is data, so each domain kind is a
  dataclass with a builder and a registered meta-schema (`Expressions.Domains.Of<Kind>`, e.g. `OfInteger`), and a
  literal's domain is an ordinary `$ref` to a domain object in the same snapshot. Signatures stay code: they are a
  dialect's vocabulary, not values on the wire. So do `Anything` and `OfValues`, which serve inference only and are
  never stored; the Python types that `OfTypes` holds give way to the domains' own properties.
- **Overflow and rounding are the domain's.** Rounding is to nearest (ties to even or away from zero), toward zero, up
  or down, for `Float` and `Decimal`. An `Integer` wraps, saturates or raises; a `Float` goes to infinity, saturates, gives
  NaN or raises. Where a language leaves overflow undefined (C's signed integers), its translator chooses one.
- **The hidden bit and subnormals are separate properties.** The hidden bit is the implicit leading 1 of normal numbers
  (one more bit of precision); subnormals are the values of exponent 0 (range toward zero). IEEE formats have both;
  x87's 80-bit format has subnormals without a hidden bit; fp8 E4M3 has NaN but no infinities.
- **Ones' complement and sign-magnitude have a negative zero, equal to zero.**
- **`Integer` and `Decimal` are separate domains.** Every unbounded integer is a decimal (`Decimal` includes
  `Integer`), but their operations differ: integer division truncates and integers have bitwise operations, while
  decimal division gives a fraction and needs a rounding rule.
- **`Bits` and `Bytes` are unformatted.** `Bytes(n)` and `Bits(8n)` hold the same patterns, but they are separate
  domains and convert explicitly, as `Integer` interprets bits explicitly. Bits whose states are `{0, 1, X, Z}` are
  SystemVerilog's `logic`, and VHDL's nine-valued `std_logic` is another `Enum` of states.
- **`Unicode` values are sequences of code points, compared by code point.** The encoding is representation only, for
  rendering (`char16_t`) and the wire: equal code points are equal strings in any encoding. Canonical equivalence is
  not equality; normalization is an explicit operation. A lone surrogate is not a value of `Unicode`. A `Unicode`
  domain has no width: a maximum length is a constraint of the data, and belongs in the schema.
- **`Enum` is a domain in its own right**: a C or SystemVerilog `enum`, one bit's states, or an enumeration of
  mbse-schemas.
- **Packing is its own domain.** A `Packed` domain pairs a domain (an `Enum`, a record) with a fixed-size domain and the
  representation of each value in it: SystemVerilog's `enum logic [1:0] {IDLE, RUN}` is an `Enum` packed as `Bits(2)`.
  `pack(value, packed)` gives the representation and `unpack(representation, packed)` the value, so one `Enum` can be
  packed several ways.
- **Widths belong in mbse-schemas too**, at least in its natives, so that a schema's field and an expression over it
  have one type system. That is a change to mbse-schemas, made there first.

## The framework

`mbse.Expressions.Framework` defines what every dialect implements, and implements most of it from declarations, in
six modules: `Terms` (expressions, their forms, kinds and dialects), `Symbolics` (names, scopes and dependencies),
`Domains`, `Evaluators`, `Translators` and `Errors`.

- `Terms.Expression` is an expression of some dialect: `Visitable`, plus `dialect()`, `form()` and
  `validate()`. A `Form` is a node's structure: its `kind`, its native `attributes` and its ordered `arguments`.
  `Dialect.make(form)` is the inverse, and `walk`, `fold` (bottom-up, once per node, raising on cycles) and `same`
  (structural equality by co-traversal: natives of one type by value, NaN is NaN, -0.0 is not 0.0) work on any
  dialect through forms alone.
- `Terms.Dialect` is an expression language: `name()`, `kinds()`, `schema_of(expression)`, `make`, `resolve`
  (specs: expressions, `Term`s, native values as literals, or callables taking the `AnyBuilder`), `validate`,
  `infer`, the union meta-schema `Schema` and the registry `Builders`.
- `Terms.Declared` derives a dialect from its kinds: each is a dataclass derived from `Node` whose class
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
- The roles are what validation, inference, evaluation and translation understand without knowing the dialect:
  `literal` (a native value), `reference` (what the scope resolves: the value bound to a name, or a cell), `application`
  (an operator applied to arguments), `binding` (binds a name to its first argument within the others) and `import`
  (makes what it declares available within its body: a module, a package's functions; `binds()` names what it binds
  for references). `validate` reports what the Basic
  section below lists, with the same messages in every dialect ("a field needs a value", "identifier 'x' is not
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
- `Errors` names the exceptions evaluation raises beyond mbse-schemas' own (`NameError`, `ImportError`,
  `OverflowError`, `ZeroDivisionError`): Python's own in Python, and classes of the same names in TypeScript.

## Dialects

| Dialect | Kinds | Values | Evaluation |
|---|---|---|---|
| Basic | `literal`, `operation`, `variable`, `let` | natives, objects | three-valued (Kleene), no coercion; absent is unknown |
| Python | `constant`, `name`, `attribute`, `subscript`, `call`, `compare`, `boolop`, `binop`, `unaryop`, `ifexp`, `let` (`(lambda a: body)(value)`), `import`, `importfrom`: Python's `ast` | Python's | Python's: `and`/`or` give an operand, `1 == 1.0`, `True + 1` is 2; absent attributes raise |
| Matlab | `constant`, `identifier`, `binary` (`==` ... `&&`, `\|\|`, `+`, `-`, `.*`), `unary` (`~`, `-`), `call` (`isfield`, and functions of the scope), `field` (`s.age`), `import` (`import pkg.fn`, `import pkg.*`) | double, logical, string, struct | MATLAB's: two-valued with short-circuit, logicals and doubles convert, `+` concatenates strings; absent fields raise |
| Excel | `constant`, `name`, `cell` (`A1`, `Sheet1!B2`, `[Book.xlsx]Sheet1!A1`), `let` (`LET`), `function` (`AND`, `OR`, `NOT`, `IF`, `ISERROR`, and add-ins), `infix` (`=`, `<>`, `<` ... `+`, `-`, `*`), `prefix` (`-`), `field` (`r.age`) | number, text, logical, error, record | Excel's: errors are values (`#FIELD!`, `#NAME?`, `#VALUE!`, `#REF!`) that propagate; `AND`/`OR` evaluate every argument, `IF` one branch; arithmetic coerces; comparisons order numbers < text < logicals and ignore case |
| Latex | `constant` (numbers, `\text{...}`, `\mathrm{true}`), `symbol` (`a`, `\mathit{age}`), `binary` (`=`, `\neq`, `<` ... `\land`, `\lor`, `\implies`, `+`, `-`, `\cdot`), `unary` (`\lnot`, `-`), `frac`, `member` (`x.\mathit{age}`), `function` (`\operatorname{has}`), `where` | number, text, truth | none: notation is written, rendered, checked and translated, and evaluated in the dialects it is translated to |

Python, Matlab, Excel and Latex each have `render(expression)`, their source text (`hasattr(this, 'email') if
this.age >= 18 else True`, `this.age >= 18 && isfield(this, "email")`, `=AND(this.age >= 18, NOT(ISERROR(this.email)))`,
`\mathit{this}.\mathit{age} \geq 18 \land \operatorname{has}(\mathit{this}, \text{email})`), with imports as the
lines before the expression, and constructors for their kinds (`Excel.Expressions.function('AND', a,
b)`, ...). In Python, the Python dialect also has `parse(source)`: imports, then one expression. The Matlab and Excel
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
  bind the same node or equal values. A rule may apply `forward` or `backward` only, when its other direction would
  capture expressions it should not (Matlab writes `implies(a, b)` as `~a || b`, which reads back as `or(not(a),
  b)`). `renames` declares the rules for operators that differ only in name.
- `Inline(kind, side)` translates a binding that the other dialect has no counterpart for by substituting its value
  for its name: Matlab has no let.
- `Elide(kind, side)` translates an import that the other dialect cannot declare as its body: what it brought in must
  be translated by other rules, or has no counterpart. `Prelude(pattern, side)` adds an import to translations that
  refer to a name it binds: `Translators.Basic_Python.NUMPY`, a second translator between Basic and Python, writes
  NumPy's functions (`np.greater_equal(this['age'], 18)`) and adds `import numpy as np`.

Translation co-traverses. At each node, the rules whose source pattern has the node's kind are tried, the most
specific first (the most nodes and fixed attributes), by traversing pattern and expression in lockstep to bind the
holes; the first that matches is applied by instantiating its target pattern with the bound attributes and the
translations of the bound arguments. Each node is translated once (per binding environment), so shared
sub-expressions stay shared, and an inlined value is shared by every use of its name. `trace`, if given, receives
the pairs of corresponding source and target nodes. A node no rule matches raises `ValueError` naming it ("Basic
literal b'\x00' has no Excel counterpart", "Excel function 'ISERROR' has no Basic counterpart").

What translation guarantees, and what the TRN suite checks: every pair round-trips expressions that both dialects
can write (lets and implies are the exceptions above); translating directly or through a third dialect gives the
same expression; and a translation keeps an expression's form, not always its value. Where the dialects' rules
agree (operands of one type, values present), translations evaluate alike; elsewhere they do not: a missing property
is unknown in Basic, masked in NumPy, `#FIELD!` in Excel and an error in Python and MATLAB, and `1 == 1.0` is unknown
in Basic but true in the others.

## Open questions

- Value domains (above): the names of the conversion operations; what a literal stored without a domain (today's
  corpora) means; whether an `Enum`'s members are ordered,
  or only a `Packed` enum's (by representation, as in C); and the shape of widths in mbse-schemas' natives.
- Core expression vocabulary above is a proposal; confirm the exact set, and specify the collection operations
  (`count`, `in`, `all`, `any`).
- Matlab and Excel expressions are written as data or through constructors and rendered as source text; they are
  not parsed from source text yet (Python's are, in Python). `Expressions.from_` still reads Python functions into Basic
  directly; it could become `Python.Expressions.parse` followed by translation to Basic.
- Excel's ranges (`A1:B3`) and structured references (`Table1[@age]`) are not modeled; they need array values.
- `Symbolics` has imports, an expression's dependencies, but no exports. Exports would name what a unit of
  expressions (a module of rules, a MATLAB package, a workbook's defined names) provides to others; they need a unit
  that groups expressions, which no dialect has yet.
- Excel's `AND` and `OR` take any number of arguments, and `IF` two or three; the dialect gives them fixed arities
  (2, 2 and 3) so that its vocabulary has one signature per name.

## Resolved

- Expressions are `Expressions.OfAny`, `OfLiteral`, `OfOperation`, `OfVariable` and `OfLet`, each with `Data`,
  `Builder`, `Spec` and a meta-schema `Schema` that is an ordinary registered object schema tagged by `kind`. Arguments
  are an ordered relation (`index`, `unique(argument)`); a literal's schema has one property per native type.
- There is no `is` operation: unions discriminate by a tag property compared with a fixed value.
- `Expressions.from_` (Python only) reads an expression from a function's source with `ast`.
- Evaluation is its own module, `Evaluators`, with one entry point per expression kind (`Evaluators.OfAny`, ...).
- Expressions are partitioned into dialects over one framework (`Framework`), each declared by its kinds' roles;
  translators are pairwise, declared as bidirectional pattern rules, and applied by co-traversal.
- mbse-schemas' unions name their branches, and it takes no evaluator; `Evaluators.predicate` evaluates a rule about a
  value, binding it to `this`. Each dialect's union of meta-schemas names its branches by the kinds' tags.
- Evaluation is three-valued (Kleene), never coerces, and reads properties with `get(object, name)`; variables are
  bound by `OfLet` or by the caller's scope. `Term`s write expressions with methods only (no operator overloading), so
  both bindings read the same.
