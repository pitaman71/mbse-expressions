<!-- nav -->
[← Porting to the stabilized mbse-schemas](README.md) · [Home](../../../README.md)

# The API after stage 3 (as settled in stages 2a, 2b and 3)

The port's stage 2 replaces `Framework/Terms` and mbse-schemas' `Bindings` with terms stored in a store
([the proposal](README.md), Decided, 1 and 2; its model, [Framework.py](Framework.py) and [Basic.py](Basic.py)). This
page says what replaces the old API, the smallest change that satisfies the decisions, so that stage 2b ports the other
dialects and the translators to it. Python is shown; TypeScript has the same names (functions in camelCase where the
old API had them so: `nameOf`, `formOf`), `store.transaction(() => ...)` for `with store.transaction():`, `bigint` for
`int` and `null` for `None`.

## The installs

```python
from mbse.Schemas.Framework import Builders
from mbse.Expressions import Framework
from mbse.Expressions.Dialects import Basic

store = Builders.Store()
store.transaction(Framework.install)        # Expressions.Framework: Term, Literal, Call, Variable, Let, List, Mapping,
                                            # Pair, Expression, HasRoot, Schemas.OfExpression's adjacency `expression`;
                                            # Dialect, Domain, DomainKind, Defines, Operates, HasDomain and
                                            # Schemas.OfAny's adjacency `domain`
store.transaction(Basic.install)            # Expressions.Basic.Quantifier, added to Term as the branch `quantifier`;
                                            # Basic's dialect schema (singleton `Expressions.Basic`), its kinds of
                                            # domain, its domains' schemas and its operations, each an OfExpression
store.transaction(Basic.define)             # optional, data: Basic's dialect naming its operations, owning its domains
```

Since stage 3, `Basic.define` writes Basic's dialect's data: the singleton `Expressions.Basic` names each operation
(`Expressions.Framework.Operates`) and owns each domain by name (`Expressions.Framework.Defines`); its frame binds the
dialect (`dialect`) and each domain by its name. Validation and evaluation do not need it: they read `E.OPERATIONS`,
the same table the install writes. Every other dialect's install adds its singleton schema too
(`Terms.dialect(txn, "Expressions.Python")`), with no operations or domains yet (below, Settled in stage 3).

`Framework.install` (in `Framework/Terms.py`, `Framework/Terms.ts`) and `Basic.install` (in
`Dialects/Basic/Expressions`) are module-scope `install(txn)` functions as drafted, each one transaction (an install
and what uses it are separate transactions: mbse-schemas, Object identity, Decided, 96 in [CAP-124: writes all-or-nothing in transactions](../../../../mbse-basis/docs/capabilities/CAP-124.md#decided)). Run again, each writes
nothing. Every other dialect has its own install, run after the framework's, which adds its kinds to
`Expressions.Framework.Term` by schema extension, as Basic's does; `mbse.Expressions.install(store)` is not given (it
would be a helper over the installs): a program runs the installs it needs.

## Building an expression

An expression is an `Expressions.Framework.Expression`, a reference object whose `root` is a term, a value of
`Expressions.Framework.Term`, nested. It is built in a store, within a transaction, through the builders:

```python
with store.transaction():
    positive = store.Expressions.Framework.Expression(lambda e: e.root(lambda r: r.as_value(lambda a: a.as_union(
        lambda t: t.call(lambda c: c.callable("gt").arguments([
            lambda x: x.as_union(lambda t: t.call(lambda c: c.callable("add").arguments([
                lambda y: y.as_union(lambda t: t.variable(lambda v: v.name("x"))),
                lambda y: y.as_union(lambda t: t.literal(lambda l: l.value(lambda v: v.as_scalar(1)))),
            ]))),
            lambda x: x.as_union(lambda t: t.literal(lambda l: l.value(lambda v: v.as_scalar(0)))),
        ]))))))
```

A term value may also be built alone, a value with no identity, `store.Expressions.Framework.Term(spec)`, within a
transaction: what tests and evaluators that need no expression object use. A transaction's expression (an upsert, as
[check.py](check.py) writes `x + 1 > 0`) builds one the same way.

**Writers stay** (Decided, 10, until mbse-codegen-python moves off them; then they go with the builders' `set`,
`argument` and `arguments`). A `Writer` is now a spec: a callable that writes a term through the builders. Called with
the `Visitors.OfProperty` of a term property (`root`), the `Visitors.OfAny` of a container's element (`arguments`) or
the `Visitors.OfUnion` of a term value (`Term(...)`), it selects its kind's branch and writes its members, so it goes
wherever a term is written:

```python
from mbse.Expressions.Dialects.Basic import Expressions as E

x = E.variable("x")
with store.transaction():
    positive = store.Expressions.Framework.Expression(lambda e: e.root(x.add(1).gt(0)))   # the same expression
    term = store.Expressions.Framework.Term(x.add(1).gt(0))                                # a term value alone
```

A writer's argument is a spec: a writer, a native value (a literal), a term value read from a store, which is copied
(mbse-schemas copies a value given whole), or a callable taking the `Visitors.OfUnion` of a term value, as
`store.Expressions.Framework.Term(cb)` gives one (`E.DIALECT.spec(x)` makes a writer of any of them).
`E.literal(value)` takes a basic scalar alone: a term carries no domain (stage 3). `E.list_(*elements)` and
`E.mapping(*(key, value))` write the container constructors. Python's `Text.FromFunction(function)`, which read a writer from a function's source, is removed, as the
user decided (2026-10-30; [the proposal](README.md), the decision on `Python.Text.FromFunction`): expressions are
written with the writers.

## Reading an expression

A term is read only through mbse-schemas' readers (`Readers.OfUnion`, `Readers.OfObject`, `Readers.OfAny`): a term's
kind is the branch it holds, its properties the branch's members. `Framework.Terms` gives the generic reads that
every evaluator, validator and translator shares, over any dialect's kinds:

| | |
|---|---|
| `Terms.term(x)` | the term value (a `Readers.OfUnion` of `Expressions.Framework.Term`) of an `Expression`, its `root` property's reader, a `Readers.OfAny` holding one, or a term value itself |
| `Terms.kind_of(term)` | the branch it holds, `(tag, record)`: `("call", <Readers.OfObject>)` |
| `Terms.form(term)` | its `Form`: `kind`, `attributes` (its scalar properties set, by name: `{"callable": "add"}`) and `arguments` (its terms, in order: the term properties in declaration order, its slots, then a container of terms' elements) |
| `Terms.name_of(term)`, `Terms.operator_of(term, kind)` | the name a reference, binding or quantifier binds or refers to; an application's or quantifier's operator, its kind's `operator` property or its tag |
| `Terms.walk`, `Terms.fold`, `Terms.same` | as before, over term values: a term is a nested value, so there is no sharing and no cycle |

Which properties are slots, variadic arguments or attributes is read from the schema: a property whose schema is
`Expressions.Framework.Term` is a slot, one holding a container of terms the variadic arguments, any other an attribute.
`x + 1 > 0` reads:

```python
from mbse.Expressions.Framework import Terms

term = Terms.term(positive)                         # positive.root, as a Readers.OfUnion
tag, call = Terms.kind_of(term)                     # "call", the branch's Readers.OfObject
assert tag == "call" and call.callable.get() == "gt"
form = Terms.form(term)                             # Form("call", {"callable": "gt"}, (<add(x, 1)>, <0>))
assert Terms.name_of(Terms.form(form.arguments[0]).arguments[0]) == "x"
```

## Evaluating an expression

An evaluator takes a term value (or anything `Terms.term` reads one from) and a scope, as before:

```python
from mbse.Expressions.Dialects.Basic import Evaluators
assert Evaluators.OfAny(positive, {"x": 1}) is True       # an Expression, or Terms.term(positive)
assert Evaluators.OfAny(term, {"x": -1}) is False
```

Values are taken by the schemas they are written with (stage 3): ints unbounded, floats binary64, `list` and `mapping`
giving `Domains.Collection`s. `Evaluators.OfLiteral`, `OfCall`, `OfVariable`, `OfLet` and `OfQuantifier` evaluate one kind, raising `TypeError` for a
term of another. `E.DIALECT.validate(term, bound, core)` and `E.DIALECT.infer(term, environment)` take a term as an
evaluator does; `Symbolics.free(term, dialect)` and `Symbolics.imports(term, dialect)` take the dialect whose kinds they
read. Partial evaluation gives its residual as a `Writer`, written where the caller wants it:
`e.root(Partials.OfAny(term, {"x": 1}))`; a subterm it keeps is the term value read, copied when written.

## What a dialect module provides

| | Python | TypeScript |
|---|---|---|
| its install, adding its kinds to `Term` | `Expressions.install(txn)` | `Expressions.install(txn)` |
| its kinds: how the framework reads each branch it adds (a `Terms.Kind`: its role, the properties naming what it binds and its operator, its vocabulary and whether it is `closed`, its required properties, its own checks) and its `Terms.Dialect` (name, kinds, a native's domain), with `validate` and `infer` | `Expressions.DIALECT` | `Expressions.DIALECT` |
| its operations, as a table and as data (Basic only, so far) | `Expressions.OPERATIONS`, `Expressions.define(txn)` | the same |
| its writers, while they stay | `Expressions.Writer`, `variable`, `literal`, ... | the same |
| its evaluator | `Evaluators.OfAny(term, scope)`, `Evaluators.INTERPRETER` | the same |

A `Terms.Dialect` names its kinds by the branch tags it reads; the framework's (`literal`, `call`, `variable`, `let`)
are read by every dialect that uses them, and a dialect's own by it alone. `Dialect.make(form)` gives the `Writer` of a
form, so a translator builds the target term through the builders, and its caller writes it in a transaction.

## What goes

Since stage 3: every kind's `domain`; the writers' `domain` arguments and the conversion writers (`convert`,
`reinterpret`, `pack`, `unpack`) and those operations; Basic's registry (`Domains.register`, `registered`, `name_of`),
typed values (`Domains.Value`, `value`) and the translators' conversions of typed literals (Basic and Ccpp, Basic and
SystemVerilog); tutorial 4. Since stage 2: `Terms.Declared`, `Term`, `Builder`, `AnyBuilder`, `ValueProperty`, `Arguments` and `used_by`, `register`, the term
dataclasses (`OfLiteral.Data`, ...) and their `Spec`s and `resolve`, each kind's meta-schema `Schema`, a dialect's
`Builders` and `Schema`, `Domains.Schema`, `to_plain` and `from_plain` (a domain is named), and reads through
`Validators.properties_of`, `ListRecord`, `entries_of` (`Framework.Objects` reads data objects through `Readers`).
Basic's `operation` is the framework's `call`: its property `name` is `callable`.

## Settled while building, for the user's review

1. **Resolved, by mbse-schemas 0.26.3: a literal's `value` is the drafted `OfAny` of the five basic scalars**
   (`S.OfAny(lambda a: a.schemas([S.OfBool, S.OfInt, S.OfFloat, S.OfStr, S.OfBytes]))`, as in
   [Framework.py](Framework.py)). Under 0.26.2 it was briefly a value of any schema, because 0.26.2 wrote a restricted
   `OfAny`'s value untagged and could not read a `str`, a `bytes` or a NaN back. 0.26.3 writes such a value bare only
   where exactly one of its schemas writes that form, otherwise wrapped, kind then schema, and reads it back without
   guessing (mbse-basis PRI-025, PRI-026, CAP-069): `{"literal": {"value": 1}}`, `1.5`, `true`, `-0.0`, but
   `{"scalar": {"str": "x"}}`, `{"scalar": {"bytes": "AQ=="}}`, `{"scalar": {"float": "NaN"}}`. The schema now refuses
   anything else, as the builders write it (`property 'value' does not hold a value of Expressions.Framework.Term`, a
   `TypeError`), so validation's "a literal must hold a basic scalar" check, which nothing can reach, is gone.
2. **(Superseded in stage 3: a term carries no domain, and the registry is gone.) A term's `domain` names a domain registered in Basic's `Domains`** (`Domains.register(name, domain)`) until stage 3
   makes domains objects defined by dialects: a writer given an unregistered domain raises `LookupError`, a name that
   is not registered is a validation problem, and partial evaluation keeps a subterm whose value is of an unregistered
   domain, as it keeps one with no literal.
3. **What reads each kind is a `Terms.Kind`** (role, the names of the properties that bind and that name the operator,
   vocabulary, required properties, checks), as the old kinds' class variables were; a kind's slots, variadic arguments
   and attributes are read from its schema, not declared. A Kind is not a model class: it says how evaluators read a
   kind, until vocabularies are data (question 11).
4. **Writers are specs** (above), and a term value given where a term is written is copied: so a residual, a
   translation and a writer can hold a term read from a store.
5. **`Framework.Objects`** reads the data objects evaluators read (`get`, `has`, `entries`, equality), ported from the
   `overhauls/meta-schemas` branch: a reference object is one whose schema is a reference object schema (`ref`), with
   no `as_identity`; its identity, for equality, is the object itself.
6. **Cycles and sharing go**: a term is a nested value, so `walk`, `fold`, validation and evaluation no longer look for
   them, and the cases about them assert that a term written into another is copied. A kind's slot that referred to a
   definition (`REFERS`, mbse-patterns' predicates) is a by-name attribute when that dialect is ported.
7. **The builders write any scalar into a basic scalar's property**, so validation still reports a wrong one ("a call's
   callable must be a str, got int"). A literal's value is not such a property: its schema, an `OfAny` of the basic
   scalars, refuses anything else as it is written (item 1).
8. **The tests build a term through one helper per notebook**, `term(spec)`: a transaction around
   `store.Expressions.Framework.Term(E.DIALECT.spec(spec))`. Writing that transaction out at each of several hundred
   uses would bury what each case asserts; against P-019 ("helper functions that build a model through the builders
   are such a DSL") it is the one exception, and it builds through the writers that the decisions keep for now.
9. **The corpus holds Basic's three cases** (`expression`, `domains`, `collections`), each a term value written nested
   under `Expressions.Framework.Term`; the other dialects' cases, and their files, return with stage 2b. A domain the
   corpus names is registered by it (`binary32 roundTowardZero`, `state`, ...).

Settled in stage 2b:

10. **A dialect's kinds are branches of `Expressions.Framework.Term` named `<dialect>_<kind>`** (lowercase dialect:
    `python_binop`, `latex_frac`), their schemas `Expressions.<Dialect>.<Kind>`, every kind with `domain`: every dialect
    adds its kinds to the one union, and several have a `binary`, a `constant` or a `member`. A dialect reuses the
    framework's `literal`, `variable`, `let` and `call` (`callable`, `arguments`) where its kind has that shape
    (item 15).
    Each dialect's package exports its `install`.
11. **An import kind's names are read from its attributes**: `Kind.names(attributes)` in place of `names(record)`, so
    that a translator can tell which names an import it writes binds before it is written (a `Prelude`).
12. **A translation is a writer** of the target dialect's term, which its caller writes in a transaction, in a store
    holding the target dialect's install. Patterns name a kind by its branch's tag and read it as `Terms.form` does; a
    hole bound twice matches equal terms (`Terms.same`), since terms are nested values; `trace` pairs each source term
    with the writer of its translation, a term after the terms within it. With no sharing and no cycle, the memo and
    the cycle check go: an inlined let's value is translated once and written at every use. A message names a kind
    without its dialect's prefix ("Python call has no Basic counterpart", "Basic call 'entries' has no Matlab
    counterpart"), as the old kinds' names read.
13. **(Superseded in stage 3: the conversions of typed literals are deferred with type inference.) A conversion names the domain it gives** (Ccpp's and SystemVerilog's typed literals back to Basic): the name it is
    registered under, or, when it has none, its own name (`uint32`, `bits12`), under which the translator registers it
    in Basic's `Domains` registry; a native's own domain is left unnamed, as `E.literal` leaves it. This writes to the
    process-wide registry until stage 3 makes domains objects that dialects define, for the user's review.
14. **The corpus holds every dialect's case again, in the old corpus's order** (`expression`, `python`, `matlab`,
    `excel`, `latex`, `domains`, `collections`, `ccpp`, `systemverilog`), in one store holding every install, with one
    `DIALECTS` map in the corpus naming the dialect that reads each case other than Basic's; CONF-04 validates each case
    in its dialect.
15. **Every dialect reuses the framework's kinds wherever the shape matches exactly** (the proposal, Decided,
    2026-10-30): `literal` (`value`, one of the five basic scalars; `domain`), `variable` (`name`, `domain`), `let`
    (`name`, `value`, `body`, `domain`) and `call` (`callable` by name, positional `arguments`, `domain`). A restriction
    of the dialect's on a reused kind is its `Kind`'s check, reported by validation (Latex's and SystemVerilog's writers
    write any value, as they did; Matlab's and Excel's raise `TypeError`, as they did). Kind by kind:
    - Matlab and Excel, as before: `literal` (no bytes: "a literal cannot hold a bytes", "an Excel literal cannot hold
      a bytes"), `variable`, `call`, and Excel's `let`.
    - Python: `python_constant` → `literal` (the same five scalars, no check), `python_name` → `variable` (its
      builtins the `Kind`'s ambient names, "a name must be an identifier" its check), `let` as before. `python_call`
      stays: its callee is a slot, a term (`np.add` is an attribute of a name), where `call`'s `callable` is a name.
    - Latex: `latex_constant` → `literal` (no bytes, a new check, "a Latex literal cannot hold a bytes": the old
      schema took bytes without a word), `latex_symbol` → `variable`, `latex_function` → `call` (its `name` is now
      `callable`), `latex_where` → `let` (`name`, `value`, `body`, as a let's). Its `member`, `binary`, `unary` and
      `frac` stay: no framework kind has their shape.
    - Ccpp: `ccpp_identifier` → `variable`. `ccpp_constant` stays: it has C's `type` besides its `domain`.
    - SystemVerilog: `systemverilog_constant` → `literal` (no bool, no bytes, its check, whose message is now "a
      SystemVerilog literal cannot hold a bool", was "a constant cannot hold a bool"), `systemverilog_identifier` →
      `variable`. `systemverilog_vector` stays: its `value` is its bits, a str, with `signed` and `base`.

    So validation names the framework's kind where it named the dialect's: "variable 'x' is not bound" (was
    "python_name 'x'", "latex_symbol 'x'", "ccpp_identifier 'x'", "systemverilog_identifier 'x'"), "a variable needs a
    name", "a literal needs a value", and translation "Python literal b'\x00' has no Matlab counterpart" (was "Python
    constant"). A term of one of these kinds is the same value in each dialect that reuses it: Basic's `variable` is
    Python's name, so evaluating it in Python looks the name up, where it raised "Python has no kind 'variable'".

Settled in stage 3 (the proposal's "Stage 3's model", Decided, 1 to 6, and the user's answers on A, B and C; the
coordinator's direction of 2026-10-30 on ownership: "It's not hard to add an ownership path to the schema", schema
extension preferred to refinement):

16. **A dialect is a singleton of its own schema, a branch of the kind union `Expressions.Framework.Dialect`.** The
    direction was a reference object schema `Expressions.Framework.Dialect` of which each dialect is a singleton by
    name; mbse-schemas gives a schema one singleton (`OfObject.singleton`), so each dialect's install defines its own
    reference object schema, `Expressions.<Dialect>.Dialect`, singleton `Expressions.<Dialect>` (Basic's:
    `Expressions.Basic`), with the adjacencies `domains` and `operations`, and adds it to `Expressions.Framework.Dialect`
    by schema extension, as a branch named after the dialect (`basic`), as a dialect adds its kinds to `Term`; the
    relations' `dialect` links take that kind union. `Terms.dialect(txn, module)` gives the symbols and specs.
    `HasDialect` and the module's `dialect` adjacency, in the first draft, are dropped: a dialect is found by its
    singleton's name (`store.singleton("Expressions.Basic")`).
17. **A dialect owns its domains: `Expressions.Framework.Defines(dialect, name, domain)`**, unique `[dialect, name]` and
    `[domain]`, the domain's adjacency `dialect` its owner, so a domain's path is its dialect's singleton then its name:
    snapshots write it, documents refer to it, and a document of a domain or a dialect reads back as the object the
    store holds. A domain is an `Expressions.Framework.Domain` (`kind`, a value of `Expressions.Framework.DomainKind`,
    whose branches Basic adds: `bool`, `integer` (`width`, `signed`, `overflow`), `ieee754` (`format`, `rounding`),
    `bits`, `bytes` (`width`), `unicode`, `ieee1164` (`width`), `enum` (`members`), `packed` (`codes`)).
18. **A packed domain links its enum and its representation through `Expressions.Basic.Packs(packed, domain,
    representation)`**, unique `[packed]`, the domain's adjacency `packs`: a value cannot hold a reference object, and
    with domains owned by their dialect, the link is to their paths.
19. **`Expressions.Framework.HasDomain(schema, domain)`, unique both ways**, between a domain's schema, a named
    `Schemas.OfAny` of the scalar it narrows, defined by the dialect's install in its module (`Expressions.Basic.uint8`,
    `Expressions.Basic.binary32`, ...), and its domain; `Schemas.OfAny` gains the extension adjacency `domain`. Basic
    defines `bool`, `int`, `float`, `str`, `bytes`, `uint8`, `binary32` and `std_logic` (`Domains.DOMAINS`), written by
    `Basic.define`; `Domains.read(domain)` gives a stored domain's data (`OfX.Data`), whose `contains`, `compare`,
    `fit` and `validate` stay, unused by evaluation until type inference.
20. **A dialect names its operations: `Expressions.Framework.Operates(dialect, name, operation)`**, unique
    `[dialect, name]` and `[operation]`, owning nothing: an operation is a `Schemas.OfExpression` its module owns
    (`Schemas.Defines`), named `Expressions.Basic.<name>`, as mbse-schemas writes only named schema objects that data
    links. Its pattern's variables are its arguments, its `result` (an `OfAny`) its return: `Expressions.Basic.Number`
    (int or float), `Expressions.Basic.Ordered` (int, float, str, bytes), `Expressions.Basic.Collection` (a list or a
    mapping, containers of any value), a basic scalar, or an unrestricted `Schemas.OfAny`. `Defines` stays for domains.
21. **Arguments are positional.** mbse-schemas keeps a pattern's variables in their declared order, in the store and
    through a snapshot (its PAT-01 asserts "in order"; EXP-13 asserts `shl`'s `value, count` after a snapshot), so a
    call's arguments are the operation's variables in that order.
22. **A call to an operation Basic does not define is refused**: Basic's `call` kind is `closed` (`Terms.Kind.closed`),
    so validation reports "'contains' is not an operation Basic defines" whether or not `core` is asked, and evaluation
    raises `NotImplementedError` with that message. Validation reads `E.OPERATIONS`, the table `Basic.install` writes as
    data: a term built alone belongs to no store, so a check cannot read a store's dialect. Overloads are not modeled.
23. **The container constructors are framework kinds**: `list` (`elements`) and `mapping` (`entries`, a container of
    `Expressions.Framework.Pair`, `key` and `value` terms); a mapping's arguments are its pairs' terms in turn, and
    `make` writes them back in twos. Basic evaluates them to `Domains.Collection`s (an unknown key makes a mapping
    unknown; equal keys raise "a mapping's keys are distinct, got 'a' twice"), infers `list(T)` and `keyed(K, T)`.
    Spellings: Python's list and dict displays (rendered, parsed, evaluated), MATLAB's concatenation `[a, b]`, Excel's
    `VSTACK(a, b)` (a new function, 1 to 254 arguments); Latex, Ccpp and SystemVerilog refuse them by name ("Basic
    list has no Ccpp counterpart"). A new translator rule, `Elementwise(left_kind, right_kind, left_attributes,
    right_attributes, direction)`, translates a term of any number of arguments.
24. **`Terms.Dialect.domain_of` and `Kind.typed` stay, for what they still mean**: `domain_of` is the domain of a
    literal's value by the scalar it is written with, for `infer`; `typed` is the domain a kind's own attributes give
    it (C's `type` of a constant or a cast, SystemVerilog's vector), for C's and SystemVerilog's own evaluation. Neither
    reads a term's domain, which no term has.
25. **Typed values go**: `Domains.Value`, and C's and SystemVerilog's evaluators' acceptance of one as a variable's
    value; a variable's type is its value's. Ieee754's arithmetic, conversions and encodings stay (C and SystemVerilog
    use them; DOM-10, DOM-11 assert them directly).
26. **mbse-schemas limitation found, worked around by this model**: data owned by a schema object fails to write in
    mbse-schemas (`.owner(True)` on an adjacency of a domain to its schema, or of a dialect to its module): `Paths._steps`
    raises `AttributeError: '_ModuleData' object has no attribute '_schema'`. Owned by a dialect singleton instead, a
    domain has a path. Not fixed here (mbse-schemas is not edited by this stage).
27. **The corpus's `domains` case is Basic's dialect, one document**: the singleton with its operations (by their
    paths) and its domains, an enum and a domain packing it into `uint8` added. The `expression` case's extension
    operation `contains` became `in(b"\x00\xff", list("x", True))`, since a call Basic does not define is now invalid,
    and the `collections` case gained a mapping.
28. **Other dialects' operations as data are a follow-up**: each has its singleton, empty; their vocabularies
    (`Domains.CALLS`, `FUNCTIONS`, `BINARY`, ...) stay code.
29. **An mbse-schemas failure that depends on the runtime, observed, not diagnosed**: under `coverage run` in a
    Jupyter kernel, reading a store snapshot (into a store with the same installs) after documents of owned domains and
    of their dialect had been read back into the source store failed, every time, with `ValueError: link '' is not set`
    (`Proxies._EntryBuilder.build`), and under `python -X dev` writing `Basic.define` failed with
    `DecodeError: $.integer[""]: the value object has no property ''`; neither happens outside those runtimes, under
    other hash seeds or with forced garbage collection, so it looks like memory-layout dependence (an `id()`-keyed
    cache) in mbse-schemas. DOM-05
    takes the store's snapshot before reading the documents back; reported, not fixed here.

## What stage 2b needed (done)

- Each dialect: an `install(txn)` adding its kinds to `Expressions.Framework.Term` (a value object schema per kind,
  each with `domain`; a slot a property of `_.Term`, variadic arguments a container of `_.Term` by an int index), its
  `Terms.Dialect` of `Terms.Kind`s (an import's `names(attributes)`, a reference's `lexical` and `ambient`, a kind's
  `check(record)` with its old messages), writers deriving `Terms.Writer` (or `E.Writer` for Basic's methods), and its
  evaluator on `Framework.Evaluators.Interpreter` (implementations take `(thunks, term, scope)`; a term's attributes
  through `Terms.attributes_of(Terms.kind_of(term)[1])`). A dialect whose kinds' tags are Basic's (`let`, `call`)
  reads them from the same branches; a kind of its own that clashes with a framework branch's tag needs another tag.
- `Framework/Translators.py` (`Terms.Form`, `Dialect.make`, which now gives a writer, and `Terms.same`) and the twelve
  translators: a translation is a writer, written in a transaction by its caller.
- `ToText` reading terms through `Terms.form`. (`Python.Text.FromFunction`, which gave a Basic writer in EXP-12, is
  removed, as the user decided (2026-10-30), and EXP-12 retired with it.)
- The cases marked "Stage 2b restores ..." in EXP, FRM, COL, DOM and PAR, and the corpus's other cases.

---

<!-- nav -->
[← Porting to the stabilized mbse-schemas](README.md) · [Home](../../../README.md)
