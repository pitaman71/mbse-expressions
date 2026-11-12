<!-- nav -->
[← Porting to the stabilized mbse-schemas](README.md) · [Home](../../../README.md)

# The API after the complete dialects' stage 4 (as settled in the port's stages 2a, 2b and 3, and the dialects' stages 2 to 4)

Since the complete dialects' stage 2 ([the dialects proposal](../dialects/README.md#stages-proposed-once-decided)), Basic
is Patterns, Python is Python3, and Ccpp is C and Cpp; `Expressions.Framework.Term` is the union of the dialects' `Term`s
(`Expressions.<path>.Term`, each the value union of its kinds). Since the namespace rename, each dialect lives at
`Expressions.<Family>.<Dialect>`, its path (`Patterns.Expressions`, `Python.Python3`, `TypeScript.TypeScript5`,
`C.Expressions`, `Cpp.Expressions`, `SystemVerilog.Expressions`, `MATLAB.Expressions`, `Excel.Expressions`,
`LaTeX.Expressions`): its schemas, its Python package (`mbse.Expressions.C.Expressions`) and its TypeScript module
(`src/C/Expressions`, `@mbse/expressions/C/Expressions`) are named by it, and its name is `Terms.dialect_name(path)`.
The sections below show the API as it now is; the items settled in earlier stages (below, "Settled while building", 1 to
29) keep the names of their stage, and "Settled in the complete dialects' stage 2" says what changed.

The port's stage 2 replaces `Framework/Terms` and mbse-schemas' `Bindings` with terms stored in a store
([the proposal](README.md), Decided, 1 and 2; its model, `Framework.py` and `Basic.py`). This
page says what replaces the old API, the smallest change that satisfies the decisions, so that stage 2b ports the other
dialects and the translators to it. Python is shown; TypeScript has the same names (functions in camelCase where the
old API had them so: `nameOf`, `formOf`), `store.transaction(() => ...)` for `with store.transaction():`, `bigint` for
`int` and `null` for `None`.

## The installs

```python
from mbse.Schemas.Framework import Builders
from mbse.Expressions import Framework
from mbse.Expressions.Patterns import Expressions as Patterns
from mbse.Expressions.Python import Python3
from mbse.Expressions.TypeScript import TypeScript5
from mbse.Expressions.ISOIEC11404 import Expressions as ISOIEC11404
from mbse.Expressions.IEEE754 import Expressions as IEEE754
from mbse.Expressions.IEEE1164 import Expressions as IEEE1164
from mbse.Expressions.Unicode import Expressions as Unicode

store = Builders.Store()
store.transaction(Framework.install)        # Expressions.Framework: Term (no branch yet), Literal, Call, Variable, Let,
                                            # List, Mapping, Pair, Error, Missing, Expression, HasRoot,
                                            # Schemas.OfExpression's adjacency `expression`; Dialect, Domain, DomainKind,
                                            # Defines, Operates, HasDomain and Schemas.OfAny's adjacency `domain`
for standard in (ISOIEC11404, IEEE754, IEEE1164, Unicode):  # the standard dialects, before those that use them:
    store.transaction(standard.install)                      # each its singleton, its kinds of domain, its domains' schemas
store.transaction(Patterns.install)         # Expressions.Patterns.Expressions.Term, its union (the shared kinds, its
                                            # own Quantifier, error and missing), added to Term as the branch
                                            # `patterns`; its holder Expressions.Patterns.Expressions.Expression,
                                            # refining Expression; its dialect schema (singleton
                                            # `Expressions.Patterns.Expressions`) and its operations, each an
                                            # OfExpression
store.transaction(Python3.install)          # Expressions.Python.Python3.Term, the branch `python3`, its holder, ...
store.transaction(TypeScript5.install)      # Expressions.TypeScript.TypeScript5.Term, Type and Pattern, the branch
                                            # `typescript5`, ...
store.transaction(Patterns.define)          # data: Patterns' dialect naming its operations, which validation reads
```

`Patterns.define` writes Patterns' dialect's data: the singleton `Expressions.Patterns.Expressions` names each operation
(`Expressions.Framework.Operates`); its frame binds the dialect (`dialect`). The domains Patterns owned are the standard
dialects' since domains as data's stage 1 (item 112): each standard dialect's `define` owns its domains by name
(`Expressions.Framework.Defines`), its frame binding the dialect and each domain by its name. Validation reads
Patterns' operations so named, from the store of the term's holder, since domains as data's stage 2 (item 125), so
`Patterns.define` runs before a Patterns term is validated or inferred; evaluation does not need it, and inference reads
its code signatures, `Domains.SIGNATURES`, the same names. Every other dialect's install adds
its singleton schema too (`Expressions.Python.Python3.Dialect`, singleton `Expressions.Python.Python3`), with no operations or domains
yet (below, Settled in stage 3). A store holds any number of dialects, each install adding its own; where it holds a single one, `Framework.Term` is
a union of one branch, which mbse-schemas allows since 0.26.6 (item 41). Each install and `define` write their schemas and data in the builders' fluent syntax
(P-019), not from tables of their own.

`Framework.install` (in `Framework/Terms.py`, `Framework/Terms.ts`) and `Patterns.install` (in
`Patterns/Expressions/Expressions`) are module-scope `install(txn)` functions as drafted, each one transaction (an install
and what uses it are separate transactions: mbse-schemas, Object identity, Decided, 96 in [CAP-124: writes all-or-nothing in transactions](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-124.md#decided)). Run again, each writes
nothing. Every other dialect has its own install, run after the framework's, which adds its union of its kinds to
`Expressions.Framework.Term` by schema extension, as Patterns' does; `mbse.Expressions.install(store)` is not given (it
would be a helper over the installs): a program runs the installs it needs.

## Building an expression

An expression is an `Expressions.Framework.Expression`, a reference object whose `root` is a term, a value of
`Expressions.Framework.Term`, nested: its dialect, then its kind. It is built in a store, within a transaction, through
the builders. Each dialect has its own expression too, its holder: `Expressions.<path>.Expression` refines
`Expressions.Framework.Expression` and narrows its `root` to the dialect's `Term`, so its root is a term of that dialect
alone, and `HasRoot` links it as it links any expression (item 46). A dialect's writers write a holder's root
directly (`store.Expressions.Patterns.Expressions.Expression(lambda e: e.root(person.age.ge(18)))`); spelled out with the builders:

```python
with store.transaction():
    positive = store.Expressions.Framework.Expression(lambda e: e.root(lambda r: r.as_value(lambda a: a.as_union(
        lambda t: t.patterns(lambda p: p.call(lambda c: c.callable("gt").arguments([
            lambda x: x.as_union(lambda t: t.patterns(lambda p: p.call(lambda c: c.callable("add").arguments([
                lambda y: y.as_union(lambda t: t.patterns(lambda p: p.variable(lambda v: v.name("x")))),
                lambda y: y.as_union(lambda t: t.patterns(lambda p: p.literal(lambda l: l.value(lambda v: v.as_scalar(1))))),
            ])))),
            lambda x: x.as_union(lambda t: t.patterns(lambda p: p.literal(lambda l: l.value(lambda v: v.as_scalar(0))))),
        ])))))))
```

The shared kinds' slots (a call's `arguments`, a let's `value`) hold `Term`, so each term in them names its dialect; a
dialect's own kinds' slots (a quantifier's `body`, a Python3 `binop`'s `left`) hold its union, so each names its kind
alone. A literal holds any value (`value`, an unrestricted `Schemas.OfAny`), its spelling (`text`) and what is wrong with
it (`problems`), where a parser read it.

A term value may also be built alone, a value with no identity, `store.Expressions.Framework.Term(spec)`, within a
transaction: what tests and evaluators that need no expression object use. A transaction's expression (an upsert, as
`check.py` writes `x + 1 > 0`) builds one the same way.

**Writers stay** (Decided, 10, until mbse-codegen-python moves off them; then they go with the builders' `set`,
`argument` and `arguments`). C's writers stay beyond that (and C++'s, which are C's, writing C++'s terms), as the user
decided reviewing stage 5 (2026-11-04, [the dialects proposal's Decided](../dialects/README.md#decided)): "4. for
codegen, we keep the writers separately because they emit code not just wire format for the model". A `Writer` is now a
spec: a callable that writes a term through the builders. Called with the `Visitors.OfProperty` of a term property
(`root`), the `Visitors.OfAny` of a container's element (`arguments`) or the `Visitors.OfUnion` of a term value
(`Term(...)`), it selects its kind's branch and writes its members, so it goes wherever a term is written:

```python
from mbse.Expressions.Patterns.Expressions import Expressions as E

x = E.variable("x")
with store.transaction():
    positive = store.Expressions.Framework.Expression(lambda e: e.root(x.add(1).gt(0)))   # the same expression
    term = store.Expressions.Framework.Term(x.add(1).gt(0))                                # a term value alone
```

A writer's argument is a spec: a writer, a native value (a literal), a term value read from a store, which is copied
(mbse-schemas copies a value given whole), or a callable taking the `Visitors.OfUnion` of a term value
(`E.DIALECT.spec(x)` makes a writer of any of them, a callable given Patterns' union). A writer knows its dialect
(`Writer(write, dialect)`): where it is given a value of `Term`, it selects its dialect's branch first.
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
| `Terms.kind_of(term)` | the branch its dialect's `Term` holds, `(tag, record)`: `("call", <Readers.OfObject>)`, through `Term`'s branch where it is a value of `Term` |
| `Terms.dialect_of(term)` | the name of its dialect's `Term`: `"Expressions.Patterns.Expressions.Term"` |
| `Terms.form(term)` | its `Form`: `kind`, `attributes` (its scalar properties set, by name: `{"callable": "add"}`) and `arguments` (its terms, in order: the term properties in declaration order, its slots, then a container of terms' elements) |
| `Terms.name_of(term)`, `Terms.operator_of(term, kind)` | the name a reference, binding or quantifier binds or refers to; an application's or quantifier's operator, its kind's `operator` property or its tag |
| `Terms.walk`, `Terms.fold`, `Terms.same` | as before, over term values: a term is a nested value, so there is no sharing and no cycle |

Which properties are slots, variadic arguments or attributes is read from the schema: a property whose schema is
`Expressions.Framework.Term` or a dialect's `Term` (`Expressions.<path>.Term`) is a slot, one holding a container of terms the variadic arguments, any other an attribute.
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
from mbse.Expressions.Patterns.Expressions import Evaluators
assert Evaluators.OfAny(positive, {"x": 1}) is True       # an Expression, or Terms.term(positive)
assert Evaluators.OfAny(term, {"x": -1}) is False
```

Values are taken by the schemas they are written with (stage 3): ints unbounded, floats binary64, `list` and `mapping`
giving `Domains.Collection`s. `Evaluators.OfLiteral`, `OfCall`, `OfVariable`, `OfLet` and `OfQuantifier` evaluate one kind, raising `TypeError` for a
term of another. `E.DIALECT.validate(term, bound, core)` and `E.DIALECT.infer(term, environment)` take a term as an
evaluator does, held by an expression: a Patterns call is checked against the operations of its holder's store (item
125); `Symbolics.free(term, dialect)` and `Symbolics.imports(term, dialect)` take the dialect whose kinds they
read. Partial evaluation gives its residual as a `Writer`, written where the caller wants it:
`e.root(Partials.OfAny(term, {"x": 1}))`; a subterm it keeps is the term value read, copied when written.

## What a dialect module provides

| | Python | TypeScript |
|---|---|---|
| its install, adding its union of its kinds to `Term` | `Expressions.install(txn)` | `Expressions.install(txn)` |
| its kinds: how the framework reads each branch it adds (a `Terms.Kind`: its role, the properties naming what it binds and its operator, its vocabulary and whether it is `closed`, its required properties, its own checks) and its `Terms.Dialect` (path, kinds, a native's domain), with `validate` and `infer` | `Expressions.DIALECT` | `Expressions.DIALECT` |
| its operations and domains as data (Patterns' operations; the standard dialects' domains, item 112) | `Expressions.define(txn)` | the same |
| its writers, while they stay | `Expressions.Writer`, `variable`, `literal`, ... | the same |
| its evaluator | `Evaluators.OfAny(term, scope)`, `Evaluators.INTERPRETER` | the same |

A `Terms.Dialect` names its kinds by the branch tags of its union, `union` (`Expressions.<path>.Term`), the branch
`tag` (its name in lowercase) of `Term`; its `path` (`"C.Expressions"`) gives its `name()`, by `Terms.dialect_name`
(TypeScript `Terms.dialectName`): its own name, or its family's where its own is `Expressions` (`C`, `MATLAB`,
`LaTeX`); it reads the framework's kinds of invalid syntax besides its own, and only its
own union's terms. `Dialect.make(form)` gives the `Writer` of a
form, so a translator builds the target term through the builders, and its caller writes it in a transaction.

## What goes

Since the namespace rename: the package `mbse.Expressions.Dialects` (TypeScript `src/Dialects`, and the exports
`@mbse/expressions/Dialects/<name>`), each dialect's schemas named `Expressions.<name>`, and the names `Matlab` and
`Latex` (now `MATLAB` and `LaTeX`), with no alias.

Since the complete dialects' stage 2: the modules `Dialects.Basic`, `Dialects.Python` and `Dialects.Ccpp` (renamed, no
alias), the `<dialect>_<kind>` branch tags, SystemVerilog's `PREFIX` and `kind_of`, and the translators' `_label`.

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
   `Framework.py`). Under 0.26.2 it was briefly a value of any schema, because 0.26.2 wrote a restricted
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
13. **(Superseded in stage 3: the conversions of typed literals are deferred with domain inference.) A conversion names the domain it gives** (Ccpp's and SystemVerilog's typed literals back to Basic): the name it is
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
user's direction of 2026-10-30 on ownership, when the first build left dialects and domains as counted objects: "It's
not hard to add an ownership path to the schema", and "ah, schema *extension* is the preferred form", to refinement;
domains owned by their dialect through `Defines(dialect, name, domain)` is the user's Decided, 4. Each dialect a
singleton by name was the coordinating agent's proposal, built on that direction, which the user confirmed (2026-11-01):
"yes, each dialect has a singleton by name"):

16. **A dialect is a singleton of its own schema, a branch of the kind union `Expressions.Framework.Dialect`.** The
    coordinating agent's proposal was a reference object schema `Expressions.Framework.Dialect` of which each dialect
    is a singleton by name; mbse-schemas gives a schema one singleton (`OfObject.singleton`), so each dialect's install defines its own
    reference object schema, `Expressions.<Dialect>.Dialect`, singleton `Expressions.<Dialect>` (Basic's:
    `Expressions.Basic`), with the adjacencies `domains` and `operations`, and adds it to `Expressions.Framework.Dialect`
    by schema extension, as a branch named after the dialect (`basic`), as a dialect adds its kinds to `Term`; the
    relations' `dialect` links take that kind union. Each install writes them in the builders' fluent syntax (a
    helper, `Terms.dialect(txn, module)`, wrote them at first; removed in review, P-019).
    `HasDialect` and the module's `dialect` adjacency, in the first draft, are dropped: a dialect is found by its
    singleton's path (`store.Instances.Expressions.Basic`; P-015: concrete references are programmatic), and a
    domain or an operation by its path through the dialect (`basic.domains({"name": "uint8"})`).
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
    defines `bool`, `int`, `float`, `str`, `bytes`, `uint8`, `binary32` and `std_logic`, written in fluent syntax by
    `Basic.define`; `Domains.read(domain)` gives a stored domain's data (`OfX.Data`), whose `contains`, `compare`,
    `fit` and `validate` stay, unused by evaluation until domain inference. *(`read` and the data classes superseded by
    item 124, domains as data's stage 2.)*
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
    raises `NotImplementedError` with that message. Validation reads Basic's vocabulary, `Domains.SIGNATURES`, whose
    names are the operations `Basic.install` writes as data (EXP-13 asserts they are the same, in order): a term built
    alone belongs to no store, so a check cannot read a store's dialect. Overloads are not modeled. (A table of the
    operations, `E.OPERATIONS`, that the install expanded into its builders, was removed in review: P-019.)
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
    cache) in mbse-schemas. *Resolved by mbse-schemas 0.26.5*: the Python store told the schema objects it held when a
    transaction began by their `id()`s, and an unnamed one collected while the transaction was open could give its
    `id()` to one the transaction made, whose updates then waited for the commit and, written then, undid what was
    written in between; it now numbers them, as the TypeScript store did (mbse-schemas TXN-15, F16). DOM-05 takes the
    snapshot after reading the documents back again, as first written.

## Settled in the complete dialects' stage 2, for the user's review

Built as [the dialects proposal](../dialects/README.md#decided) decided (its Decided, 1, 3, 4, 7 and 9, the literal's
two decisions, and the rename of Basic) and as the brief for stage 2 asked; each choice below is where they were silent.

30. **A dialect's `Term` is recognized by its name.** A slot is a property whose schema is a union named
    `Expressions.<Dialect>.Term`, `Expressions.Framework.Term` among them; so is a container's element (variadic
    arguments) and a pair's member. `Terms.is_term` and `Terms.term` accept a value of either. (Revised 2026-11-03, as
    the proposal's Decided, 1, was revised: a dialect's value union of its kinds is its `Term`, first built as
    `Expressions.<Dialect>.Expression`.)
31. **A `Terms.Dialect`'s branch and `Term` are derived from its name**: `tag`, its name in lowercase (`python3`, `c`,
    `cpp`), and `union`, `Expressions.<name>.Term`. A dialect that extends another (`extends`) has its base's tag
    and union: its kinds are added to the base's union by schema extension (FRM-10).
32. **Reading through two levels.** `Terms.kind_of(term)` reads through `Term`'s branch to the kind (raising "a term
    holds no dialect" where `Term` holds none, and "a term holds no kind" where a dialect's `Term` holds none);
    `Terms.dialect_of(term)` is new, the name of the term's dialect's `Term`; `Terms.same` compares dialects too, so
    Patterns' `variable x` is not Python3's.
33. **A writer knows its dialect.** `Terms.Writer(write, dialect)`: where it is given a value of `Term`, it selects its
    dialect's branch, then calls `write` with that dialect's `Term`; elsewhere it writes in the union it is given (a
    shared kind's writer may write into any union listing the kind). Each dialect's `Writer` passes its tag (Latex
    gains a `Writer` class for this). `Dialect.spec(callable)` gives a writer of that dialect, so a callable is given
    that dialect's `Term`; `Terms.spec(callable)` with no dialect is given what is written (`Term`'s own union). A copy
    of a term value finds `Term`'s branch by the name of the value's union.
34. **A dialect reads only its own terms**, the constraint decision 4 has validation keep: `Dialect.kind` and
    `validate` refuse a term of another dialect's `Term`, "a Patterns variable is not a Python3 term" (an article before
    a capitalized name is chosen by its letter, "an Excel call"). Evaluation, translation and printing read terms
    through it, so they refuse it too; a printer folds bottom-up, so it names the first such term it reads, the
    deepest. So a term of a shared kind is no longer the same value in each dialect that reuses it (as item 15 had it):
    Patterns' call in a Python3 or Excel expression is refused.
35. *(Superseded 2026-11-03, as the user decided, the proposal's Decided, 1, revised: "Framework.Term ->
    Dialects.C.Term / Framework.Term -> Dialects.Cpp.Term".)* ~~C's and C++'s shared kinds: each kind defined once,
    `Expressions.C.<Kind>`, by C's install, listed by both unions, its slots holding `Expressions.Framework.Term`.~~ Now
    **C and C++ each define the kinds they share**: `Expressions.C.<Kind>` by C's install, its properties holding
    `Expressions.C.Term`, and `Expressions.Cpp.<Kind>` by Cpp's, holding `Expressions.Cpp.Term`; each install stands
    alone (superseded 2026-11-06 where a dialect uses another's kinds of domain: its install then depends on
    theirs, mbse-basis [CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided), A). The code that reads and writes them is still shared: `C.Expressions.kinds(standards)`,
    `C.Expressions.Writers(dialect, writer)` (C's and Cpp's writer functions), `C.Evaluators.interpreter(dialect)`,
    `C.Text.text(expression, dialect)`; Cpp's `Domains` is C's. Today C++ has kinds of exactly C's shapes.
36. **Standards as data: `Terms.Kind.standards`**, the standards of its dialect's language that have the kind, as
    mbse-programs' `SINCE` records them per kind: `C.STANDARDS = ("C11", "C17", "C23")` and `Cpp.STANDARDS = ("C++17",
    "C++20", "C++23")`, published names, on every C and C++ kind (all of today's are in every standard); the kinds of
    invalid syntax and other dialects' kinds record none. Nothing reads it yet: whether a construct is in a standard is
    a constraint (decision 3), to come.
37. **Translators.** Modules renamed (`Patterns_Python3`, `Patterns_C`, `Python3_Matlab`, ...); Patterns <-> C's rules
    are `Patterns_C.RULES`, which `Patterns_Cpp` applies to C++ (13 translators). There is no translator between C and
    Cpp. The patterns' class for the C family is `CFamily` (`C` is a hole's name). A message names a kind by its tag,
    which is now plain (the prefix-stripping `_label` goes).
38. **The literal as a domain representation**: `value`, an unrestricted `Schemas.OfAny` (written with its schema, one
    level: `{"int": 1}`, `{"str": "x"}`); `text`, a `Schemas.OfStr`; `problems`, a container of `Schemas.OfStr` by
    int index. Validation reports each of `problems`, and "a literal needs a value" only where it has none and no
    problem. Printers write `text` where present (its precedence read from a leading `-`), else the value's default
    spelling. Translation matches a literal by its value alone, its spelling dropped; one with no value has no
    counterpart. `Dialect.make` writes a container attribute (`problems`) as a container; TypeScript's `sameNative`
    compares such containers element by element, as Python compares tuples. The writers (`literal`, `constant`) write no
    spelling; a spelling is written through the builders (FRM, DIA-18, the corpus). Evaluation reads `value`, as before.
39. **Python's `FromText` writes no spelling**: the parsers that keep a literal's spelling are mbse-programs' (decision
    6); `FromText` stays as it was.
40. **`error` and `missing`.** `Expressions.Framework.Error` (`text`, the source it spans as written; `terms`, the terms
    recovered within it, a container of `Term`) and `Expressions.Framework.Missing` (`kind`, the kind the parser expected,
    as it names it), listed by every dialect's `Term`. Their role is `Terms.INVALID`; every `Terms.Dialect` reads them
    (`Terms.INVALID_KINDS`), and a dialect declaring `error` or `missing` itself is refused ("which the framework has").
    Validation reports "invalid syntax 'text'" (or "invalid syntax") and "missing kind" (or "missing a term"), without
    validating the recovered terms. Evaluation raises `ValueError` "Python3 error is not evaluated" (SystemVerilog's
    evaluator validates first: "cannot evaluate an invalid expression: invalid syntax ..."). Every printer writes an
    error as its text and a missing term as nothing (`Terms.invalid_text`), and refuses an error with no text by name
    ("Python3 error has no text to print"). No translator has a rule for them: "Python3 error has no Matlab counterpart".
41. **A union of one branch: resolved by mbse-schemas 0.26.6.** `Term` has no branch until a dialect is installed, and
    mbse-schemas 0.26.5 reported a union of one branch ("a union needs at least two branches"), so in a store holding
    one dialect `Term`, every schema holding it and every expression failed validation as data. The user decided
    (2026-11-03): "yes, you may relax the one-arm union rule"; mbse-schemas 0.26.6 allows one, and is pinned. EXP-05
    asserts that a store holding Patterns alone validates, its schemas and its expressions; the second dialects the
    suites installed only for the old rule (EXP's and VIS's) are gone.
42. **Renames, no aliases**: the modules (`Dialects.Patterns`, `Dialects.Python3`, `Dialects.C`, `Dialects.Cpp`), schemas
    (`Expressions.Patterns.*`, `Expressions.Python3.*`, `Expressions.C.*`, `Expressions.Cpp.*`), singletons and their `Expressions.Framework.Dialect`
    branches (`patterns`, `python3`, `c`, `cpp`), install uids (`mbse.Expressions.Patterns/1`, ...), and Deno's import
    map. SystemVerilog's `PREFIX` and `kind_of`, which stripped the prefix, go. The installs are written plainly in the
    builders' fluent syntax: Python3's and SystemVerilog's loops and tables of kinds go.
43. **The corpus** gains `cpp` (the `c` case's expression in C++'s own kinds) and `invalid` (a Python3 term with an error, a missing
    operand and literals with their spelling, one with a problem and no value, whose problems CONF-04 asserts);
    `python` and `ccpp` are `python3` and `c`.
44. **Tests**: FRM-11 (invalid syntax in every dialect), FRM-12 (a dialect's own terms; C and C++ and their standards)
    and DIA-18 (a literal's spelling in every printer) are added, in both languages; none is retired. EXP's store installs
    Python3 beside Patterns (item 41).
45. **Tutorial 7's labels** are realigned for "Patterns" and "Python3"; the outputs are re-executed.
46. **Each dialect's holder, `Expressions.<Dialect>.Expression`: resolved by mbse-schemas 0.26.7.** A reference object
    refining `Expressions.Framework.Expression` (`.refines([...])`) and narrowing its `root` to the dialect's `Term`
    (the proposal's Decided, 1, revised 2026-11-03). Against mbse-schemas 0.26.5, a refinement redeclaring `root` as a
    branch's schema of the base's union failed validation ("property 'root' cannot be confirmed to narrow the refined
    schema's"), and one written `.refines([...]).properties({...})` lost its redeclared member to the base's. The user
    chose (2026-11-03) that a refinement may narrow an inherited member from a union to one of its branches' schemas, and
    that `.refines(...)` in either order keeps a redeclared member; mbse-schemas 0.26.7 does both, and is pinned. Each
    install writes its holder in plain fluent builder syntax,
    `_.Expression.name("Expressions.<Dialect>.Expression").ref(True).refines([Framework.Expression]).properties({"root":
    _.Term})`. `Expressions.Framework.Expression` keeps `root` holding `Expressions.Framework.Term`, and `HasRoot`, which
    links it, links every dialect's holder. FRM-04 asserts each holder validates, narrows `root`, holds only its
    dialect's terms, round-trips through JSON, prints as its root and is linked by `HasRoot`; EXP-07 links, validates
    and evaluates Patterns'; TRN-02 writes each translation into the target dialect's holder and translates it back.
47. **An expression is recognized by refinement: `Terms.is_expression(schema)`** (`isExpression`), true of
    `Expressions.Framework.Expression` and of any schema refining it, as each holder does. `Terms.term` reads a
    holder's `root` as it reads the framework's, so the writers, readers, evaluators, validators, translators and
    printers, which read an expression through `Terms.term`, take a dialect's holder or any `Framework.Expression`
    unchanged.
48. **A holder's root is written by its dialect's writers, or through its dialect's spec.** A writer of the dialect
    (`person.age.ge(18)`, a translator's result) writes into the holder's `root`, its dialect's `Term`, directly. A term
    value of `Expressions.Framework.Term` is not a value of the dialect's `Term`, so mbse-schemas refuses it ("property
    'root' takes a union value or a Spec"); it is written as `dialect.spec(term)`, which copies its dialect's branch.
    A term of another dialect is refused there by mbse-schemas, as not a member of the union.
    So a holder's `Terms.term` is a value of the dialect's `Term`, and is serialized with that schema
    (`JSON.ToJSON(store)(store.registered("Expressions.Patterns.Term"), Terms.term(holder))`), as the skill shows.
49. **A translation writes the target dialect's holder by its caller**: a translator's `forward` and `backward` give a
    writer, as before (item 37), and the caller writes it where it wants it, the target's holder among them,
    `store.Expressions.Python3.Expression(lambda e: e.root(translator.forward(expression)))`. Translators take no store
    and write no holder themselves.

## Settled in stage 3 (Python3), for the user's review

Built as [the dialects proposal](../dialects/README.md#decided) decided (its Decided, 2, 5, 6 and 8, the subscript's
and the literal's decisions) and as the brief for stage 3 asked; each choice below is where they were silent.

50. **Kinds, named and shaped as mbse-programs has them.** Each of `ast`'s expression kinds is a kind of
    `Expressions.Python3.Term`, its schema `Expressions.Python3.<Name>` with mbse-programs' properties in source order
    (`mbse-programs/python3/mbse/Programs/Python/Syntax.py`), its tag the name lowercased: `literal`, `constant`,
    `variable`, `concatenatedstring`, `joinedstr`, `templatestr`, `parenthesized`, `tuple`, `list`, `set`, `dict`,
    `listcomp`, `setcomp`, `dictcomp`, `generatorexp`, `yield`, `yieldfrom`, `attribute`, `subscript`, `slice`, `call`,
    `starred`, `await`, `unaryop`, `binop`, `compare`, `boolop`, `namedexpr`, `ifexp`, `lambda`; with the extensions
    `let`, `import` and `importfrom` and the framework's `error` and `missing`. An identifier is a `str` where
    mbse-programs has an `Identifier` (or `DottedName`) node, and the expression context (`ctx`) is not represented, as
    there. Renamed with their shapes: a call's `function` and `arguments` are `func` and `args`; an operator property
    `operator` is `op`; `ifexp`'s properties are `body`, `test`, `orelse`, in source order (its writer keeps
    `ifexp(test, body, orelse)`); the tag `generator` is `generatorexp`. Replaced: `subscript` (a `str` key) and `index`
    by one `subscript` (`value`, `slice`); `generator` (one `for` over a name) by `generatorexp` of `comprehension`s;
    `compare` of one operator by a chain; `boolop` of two operands by one of n `values`; a call without keywords by one
    with `keywords`.
51. **mbse-programs' shapes where they differ from `ast`'s**: a comparison chain is `left` and `comparisons`, each a
    `comparison` (`op`, `comparator`), not `ast`'s parallel `ops` and `comparators` (the brief's parenthetical), and a
    dict display is `items`, each a `dictitem` (`key`, `value`, without a key for `**value`), not `keys` and `values`:
    the decision is mbse-programs' kinds, names and shapes (the proposal's Decided, 2).
52. **The framework's kinds reused where the shape matches**: `variable` for `Name` (`ast`'s `id` is its `name`),
    `list` for `List` (`elts` is its `elements`, whose schema holds any dialect's term: that it holds Python3's is a
    constraint, decision 4), and `let`, an extension. Not reused: `mapping` for `Dict`, since a dict's item may have no
    key (`**m`), which a framework pair must have; Python3's own `dict` replaces `mapping` in its `Term`, and Patterns'
    `mapping` translates to it (`Elementwise("mapping", "dict")`). `call` stays Python3's own: its callee is a term.
53. **Constants: two kinds, divided by what a schema holds.** A basic scalar (`bool`, `int`, `float`, `str`,
    `bytes`) is a `literal`, `Expressions.Python3.Literal`, which refines the framework's `literal` (mbse-basis
    CAP-167's `Schemas.Refines`: an instance of it is an instance of the framework's), so it keeps `value`, `text` and
    `problems` and adds what its text encodes (PRI-023): `prefix` (a string's or bytes', as written: `rb`, `R`, `u`),
    `quote` (one of Python's four), `base` (an int's: 2, 8, 10 or 16) and `separators` (whether `_` groups its digits).
    What no schema holds is Python3's own `constant` (`Expressions.Python3.Constant`): `singleton`, `None` or `...`, or a
    complex number's `real` and `imag`, with `text`, `problems` and `separators`; exactly one of a singleton or a
    complex number (validation). `P.constant(value, text=None)` writes either, by the value; TypeScript writes `null`,
    `P.ELLIPSIS` and `new P.Complex(real, imag)` (a deliberate difference). What a text also spells (an exponent, `0X`
    against `0x`, `J` against `j`) is in `text` alone. A literal's attributes that spell it are its `Kind.spelling`,
    which translation drops (item 38).
54. **A lambda's body is a term.** It is an expression in Python, so `lambda` holds it as a slot; the decision that "a
    body is not part of the term" (the proposal's Decided, 5) is read as concerning statement bodies (a function's, a
    class's), which are mbse-programs' owned reference objects. For the user's review.
55. **Concrete syntax kept**: `parenthesized` (`value`), which writers write and printers print as written, and which
    `FromText` writes none of, since `ast` keeps no parentheses (printing parenthesizes by precedence); and
    `concatenatedstring` (`values`, at least two), which `FromText` writes for adjacent string literals, found by
    tokenizing their source, each read alone.
56. **Extensions**: `let`, `import` and `importfrom`, listed in `EXTENSIONS`, record no standard. `FromText` reads
    `(lambda name: body)(value)`, a lambda of one positional parameter and no default called with one positional
    argument and no keyword, as a `let`, the idiom the extension writes, so that what evaluated keeps evaluating; any
    other call of a lambda is a `call` of a `lambda`.
57. **Standards as data**: `STANDARDS` names Python 3.0 to 3.15 (`Python 3.0`, ... `Python 3.15`), and each kind's
    `Kind.standards` the versions from the one it arrived in (`namedexpr` 3.8, `await` 3.5, `yieldfrom` 3.3,
    `joinedstr` 3.6, `templatestr` 3.14). A feature within a kind (`@` 3.5, positional-only parameters and debug fields
    3.8, a starred index 3.11, unpacking in comprehensions 3.15, `async for` in a comprehension 3.6) is not recorded:
    whether a term is in a version is a constraint, to come, as for C's.
58. **Helpers, read as parts.** A value object a kind holds that is not a term and not a pair of terms (a `keyword`, a
    `comparison`, a `comprehension`, an `arguments` and its `arg`s, an f-string's `stringtext`, `formattedvalue`,
    `interpolation` and `formatspec`), or a container of them, or of a union of them, is a helper. `Terms.form` reads
    each as a `Terms.Part` among the attributes (`kind`, its own `attributes`, `size`, how many of the term's arguments
    are its terms), a container of them as a tuple (an array in TypeScript), and its terms among the arguments, after
    the kind's slots and variadic arguments; `Dialect.make` writes them back, so translation patterns match a helper's
    structure as attributes (`comparisons=(Part("comparison", {"op": "in"}, 1),)`). `Terms._parts` keeps its shape, a
    helper property among the attributes, and `Terms._helpers(schema)` names them. A `dictitem` holds only terms, so it
    is read as a mapping's pair is. The unions of f-string parts are ours, `Expressions.Python3.JoinedStrValue`
    (`stringtext` or `formattedvalue`) and `Expressions.Python3.TemplateStrValue` (`stringtext` or `interpolation`); a
    format spec's values are `JoinedStrValue`, as `ast` writes `FormattedValue` in a t-string's format spec too.
59. **What a kind's role does not say, its `Kind` declares**: `optional`, the slots that may be empty, by path (`lower`,
    `key`, `generators.target`, `args.args.default_value`), where validation would report "needs"; `scopes(record)`,
    the names each argument has bound; `operators(attributes)` and `result(attributes, domains)` for a chain, whose
    operators are each checked against the vocabulary when the core is asked for and whose domain is its links'
    results; `unfold(form)`, an equivalent form translation reads (item 63); and `spelling` (item 53). Validation labels
    a helper's argument by its path (`keywords 0 value: variable 'x' is not bound`).
60. **What each kind binds**: a comprehension's `for` clause binds its target's names (a name's, through tuples, lists,
    starred and parenthesized targets; an attribute or a subscript target binds none) within its own target, its
    conditions, the later clauses and the element, and its iterable sees the earlier clauses' alone; a lambda binds its
    parameters within its body, its defaults the scope's. A named expression binds its target within itself only: in
    Python it binds the name in the enclosing scope, which a term does not model, so a later use of the name is the
    caller's to bind. For the user's review.
61. **Vocabulary**: `is`, `is not` and `@` are core operators (any two values; `@`'s result not known statically),
    and `and` and `or` take any number of values (`Domains.Either(-1)`).
62. **Evaluation stays shallow** (the proposal's Decided, 8): `Evaluators.EVALUATED` names the kinds evaluated today,
    in their complete shapes: a chain evaluates as Python's (each operand once, the first false link deciding), `and`
    and `or` of n values, a call of positional arguments, a subscript, a generator expression of any number of `for`
    clauses over names; any other kind raises `NotImplementedError`, "Python3 lambda is not evaluated" (the
    interpreter's new `evaluated`), and so does what an evaluated kind holds beyond that, by name: "Python3 keyword is
    not evaluated", "Python3 dict's ** item is not evaluated", "Python3 async comprehension is not evaluated", "Python3
    tuple target is not evaluated", and an operator its vocabulary has but no implementation, "Python3 binop '@' is not
    evaluated", "Python3 compare 'is' is not evaluated" (where the vocabulary is open: a closed one's message stays).
    Python3's `constant` is refused as any new kind is.
63. **Translators keep what they translate.** Their patterns follow the new shapes (`compares` for a one-link chain,
    `op` for operators, a generator expression of one `for` clause over a name, `ifexp` by its source order). A chain of
    several links and `and` or `or` of more than two values, which `FromText` now reads, have no rule of their own:
    `Kind.unfold` reads a chain as the `and` of its links, its middle operands written in each (evaluated twice where
    Python evaluates them once: translation keeps the form), and n values as two, nested, so that reading
    `2.0 <= c <= 8.0` into Patterns translates as it did. Patterns' nested `and`s are Python3's nested `boolop`s, printed
    with their parentheses (`(a and b) and c`), as `ast.unparse` writes them, since a nested `boolop` is not one of n
    values. A translation's free names over a kind with `scopes` count the names it binds too, which only a prelude's
    test reads.
64. **Printing**: Python's precedence, from a yield and a named expression (parenthesized wherever an expression is
    an element or an operand, and at the root) through lambda and the conditional to `await` and the primaries; a
    tuple in parentheses but as a subscript's index or a comprehension's target; a generator expression, a call's only
    argument, without its own parentheses; an int's attribute as `(1).real`; a field of an f-string as its `text` where
    it has one, else its value (and `=` for a debug field); a complex number as Python's `repr` writes it.
65. **`FromText` reads every `ast` kind, keeping literal spellings**: a literal's text is its source segment, with what
    it encodes; adjacent strings are a `concatenatedstring`; an f-string's or a t-string's text between its fields is
    read as written from the source between the fields `ast` locates, and each field's expression, conversion and debug
    `=` from its text, as Python 3.12 and later locate them (earlier, `ast` locates an f-string's parts less exactly).
    It refuses only what is not an expression or an import before it.
66. **Completeness as data**: `grammars/python3-ast.json` lists each node of `ast` an expression is (`expr`, and
    `slice` before 3.9) or holds (its helpers, operators and contexts), 3.0 to 3.15, with `since` and `until`, each
    mapped to Python3's kinds, to a helper, to an operator of a kind's vocabulary, or listed as not an expression with
    its reason; `concrete` names `parenthesized`. DIA-20 asserts it in both languages, and, in Python, against the
    running interpreter's `ast`.
67. **The writers** (Decided, 10): `constant(value, text)`; `subscript(value, slice)`, `slice_`, `tuple_`, `set_`,
    `starred`; `call(func, *args)`, `keyword(arg, value)` among the arguments; `compare(op, left, right, *(op,
    comparator))`, `comparison`; `boolop(op, *values)`; `generatorexp`, `listcomp`, `setcomp`, `dictcomp`, each of
    `comprehension(target, iter, ifs, is_async)`; `lambda_(body, args, posonlyargs, vararg, kwonlyargs, kwarg)` (an
    options object in TypeScript) of `arg`s or names; `namedexpr`, `await_`, `yield_`, `yieldfrom`; `joinedstr(values,
    prefix, quote)` and `templatestr` of text and `formattedvalue` or `interpolation`; `concatenatedstring`,
    `parenthesized`; a helper's writer is a `Python3.Expressions.Helper`. `index` and `generator` are gone.
68. **Tests**: FRM-02, FRM-04, FRM-05, FRM-12, DIA-01, DIA-02, TRN-05, TRN-10 and TRN-14 are adjusted under their IDs
    (FRM's Python3 sample holds every kind); DIA-19 (the new kinds: literals' encoded properties, f-strings as
    written, each kind's checks and bindings) and DIA-20 (completeness against `ast`) are added in both languages;
    none is retired. The corpus's `python3` case holds every kind and a spelled literal; `invalid` writes `op`. No
    tutorial's output changed.
69. **Found**: the sibling mbse-schemas checkout is 0.26.8, newer than the pinned 0.26.7, which `uv run` writes into
    `python3/uv.lock`; the lock's change is not committed, and nothing here needs 0.26.8.

## Settled in stage 4 (TypeScript5), for the user's review

Built as [the dialects proposal](../dialects/README.md#decided) decided (its Decided, 2, 5, 6, 8 and 9, the literal's
decisions, and the sublanguage unions' decision of 2026-11-03: "(b) as you recommended", "yes, stay `Identifier`
terms") and as the brief for stage 4 asked; each choice below is where they were silent.

70. **Kinds, named and shaped as mbse-programs has them**, which is as typescript-estree has them
    (`mbse-programs/python3/mbse/Programs/TypeScript/Syntax.py`): each a value object `Expressions.TypeScript5.<Name>`
    with mbse-programs' properties in source order (`isAsync` for estree's `async`, `propertyKind` for its `kind`), its
    tag the name lowercased. `Expressions.TypeScript5.Term` has 46 branches: mbse-programs' 35 expression kinds
    (`identifier`, `privateidentifier`, `literal`, `templateliteral`, `taggedtemplateexpression`, `thisexpression`,
    `super`, `parenthesizedexpression`, `arrayexpression`, `objectexpression`, `functionexpression`,
    `arrowfunctionexpression`, `classexpression`, `metaproperty`, `memberexpression`, `callexpression`,
    `chainexpression`, `newexpression`, `importexpression`, `updateexpression`, `unaryexpression`, `awaitexpression`,
    `binaryexpression`, `logicalexpression`, `conditionalexpression`, `assignmentexpression`, `sequenceexpression`,
    `yieldexpression`, `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`, `tsnonnullexpression`,
    `tsinstantiationexpression`, `jsxelement`, `jsxfragment`), TypeScript5's `constant` (item 74), the helpers an
    expression's place holds beside expressions (`spreadelement`, `elision`, `property`, `jsxemptyexpression`,
    `tsemptybodyfunctionexpression`: item 72), the patterns an expression's place holds (`arraypattern`,
    `objectpattern`, `assignmentpattern`: item 71), and the framework's `error` and `missing`.
71. **Sublanguages, each a union of its own, a schema a branch of every union whose positions hold it** (as the user
    decided, (b)). `Expressions.TypeScript5.Pattern` (14 branches): the four patterns (`arraypattern`,
    `objectpattern`, `assignmentpattern`, `restelement`), the terms a target may be (`identifier`,
    `memberexpression`, `parenthesizedexpression`, `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`,
    `tsnonnullexpression`), and what an object or array pattern or a parameter list holds beside them (`property`,
    `elision`, `tsparameterproperty`); it is held by a function's, an arrow's, a method signature's, a function
    type's and an index signature's parameters, and an assignment's `left`. `Expressions.TypeScript5.Type` (43
    branches): mbse-programs' 37 type nodes (typescript-estree's 36 and `tsparenthesizedtype`), and the terms a type
    holds (`identifier`, `thisexpression`, `literal`, `unaryexpression`, `templateliteral`, `objectexpression`); held
    by `as`, `satisfies` and `<T>x`, type annotations, type arguments and parameters' constraints and defaults. The
    other way, for review: `Term` lists `arraypattern`, `objectpattern` and `assignmentpattern`, as typescript-estree's
    `Expression` lists the first two and its `Property.value` the third, since one `property` serves an object and an
    object pattern, its `value` holding `Term`; so `ParenthesizedExpression.expression`, mbse-programs' `Expression |
    Pattern`, holds `Term`. `error` and `missing` are `Term`'s alone: invalid syntax within a type or a pattern has no
    branch yet (for review).
72. **Helpers an expression's place mixes with expressions are `Term`'s kinds**: `spreadelement` and `elision` (an
    array's and a call's elements), `property` (an object's), `jsxemptyexpression` (a JSX container's `{}`) and
    `tsemptybodyfunctionexpression` (a method's value without a body), as Python3's `starred` is, so that an array,
    a call, an object and a container hold a container of `Term`. The others are helpers, read as `Terms.Part`s
    (item 58): `templateelement`, `decorator`, `tstypeannotation`, `tstypeparameter`, the parameter declarations
    and instantiations, `tsclassimplements`, the signatures, `comment`, and JSX's names, attributes, children,
    containers and opening and closing elements. Unions of helpers are named after typescript-estree's types where it
    names them (`TypeElement`, `JSXTagNameExpression`, `JSXChild`), else ours (`JSXAttributeName`,
    `JSXAttributeValue`, `JSXAttributeItem`). An object type's members keep comments (`comment`), as mbse-programs
    keeps them. The framework now reads a union of value objects, pairs among them (a branch of terms alone, such as
    `Pattern`'s `parenthesizedexpression`), as a helper (`Terms._is_helper`); before, such a union was an attribute.
73. **The framework's kinds reused where the shape matches exactly**: `arrayexpression` is the framework's `list`
    (`elements`, each any dialect's term: that it holds TypeScript5's is a constraint, decision 4). Not reused:
    `variable` for `Identifier`, which has `decorators`, `optional` and `typeAnnotation`; `call`, whose callee is a
    term; `mapping`, an object's members being properties, spreads and methods; `let`, which TypeScript has no
    expression of.
74. **Literals: two kinds, divided by what a schema holds** (as Python3's, item 53). A boolean, a number, a bigint and a
    string are a `literal`, `Expressions.TypeScript5.Literal`, refining the framework's: a number's value is a float
    (binary64, as JavaScript's numbers are) and a bigint's an int, so the `n` suffix is the value's type, not an
    attribute; it adds what its text encodes, `quote` (`'` or `"`), `base` (2, 8, 10 or 16) and `separators`. `null`
    and a regular expression have no schema: TypeScript5's own `constant` holds `null` (`singleton`) or a regular
    expression (`pattern` and `flags`, each as written), with `text` and `problems`, exactly one of them
    (validation); a regular expression is not a kind of its own, as mbse-programs has none. `undefined` is an
    `identifier`, as in TypeScript.
75. **A body of statements is absent** (the proposal's Decided, 5, "(i)"): `functionexpression`,
    `classexpression` and `tsemptybodyfunctionexpression` have no body property, and an arrow's `body` slot, optional,
    holds an expression body as a term, as Python3's lambda's (item 54), and is absent for a block. A printer writes an
    absent body `{}`, where mbse-programs writes the statements it relates; a class's members are its body's.
76. **Concrete syntax kept**: `parenthesizedexpression` and `tsparenthesizedtype`, written and printed as written; an
    array's hole is an `elision`, as mbse-programs has it (typescript-estree writes `null`). An empty value object
    held as a property (a fragment's opening and closing, an empty template) read back absent in mbse-schemas 0.26.8;
    resolved by 0.26.9 (EMB-13), which stores it present and empty, distinct from absent, so each is held and printed
    as written (DIA-21 asserts the round trip).
77. **Roles**: `identifier` is a lexical reference; `privateidentifier`, `thisexpression` and `super` references
    resolved by no scope; `literal` and `constant` literals; every other kind an application, whose operator, where it
    has one, is its `operator` property, its vocabulary mbse-programs' operators (`Domains.UNARY`, `UPDATE`,
    `BINARY`, `LOGICAL`, `ASSIGNMENT`, not closed, as Python3's); a printer refuses an operator outside a binary
    one's ("TypeScript5 binaryexpression has no operator '<>'"). A kind requires what its printer needs: an operator,
    a tagged template's `quasi`, a meta property's names, an assignment's `left`, the type of `as`, `satisfies` and
    `<T>x`, an instantiation's type arguments, an element's opening.
78. **What each kind binds**: a function's, an arrow's and an empty body's parameters, everything within it (their
    defaults among it: in TypeScript a default sees the parameters before it); a member's property and a key, not
    computed, are names rather than references, a property signature's and a method signature's within a type
    included; an identifier a type or a pattern holds is a part, not a term, so names no reference.
79. **Checks within helpers**: mbse-programs' checks (a name an identifier, one more quasi than expressions or types,
    a union or an intersection of two types, a type parameter declaration of one, a sequence of two) apply to a kind's
    helpers too, its types and patterns among them, which the framework's validation does not read within a helper.
    `TypeScript5.Expressions.tree(term)` reads a term with its helpers nested (`Node`: `kind`, `attributes`, `slots`,
    `many`, `helpers`), as the printer and the checks read it, and `binding_names` (`bindingNames`) gives the names a
    pattern binds.
80. **Standards as data**: `STANDARDS` names TypeScript 5.0 to 5.9; every kind is older than 5.0, so each kind's
    `Kind.standards` is all of them; JSX's kinds (`EXTENSIONS`: `jsxelement`, `jsxfragment`, `jsxemptyexpression`)
    record none, an extension outside every version. A feature within a kind (`import.defer` 5.9, an import's options
    5.3, a `const` type parameter 5.0) is not recorded: whether a term is in a version is a constraint, to come.
81. **No writers**: TypeScript5's terms are written through the builders (PRI-019), in tests, the corpus and the
    skill; `DIALECT.spec(native)` writes a native value as a `literal` (a bytes has none), which `Dialect.make` needs.
82. **Evaluation stays shallow** (the proposal's Decided, 8): the framework's interpreter evaluates a literal by its
    role, which falls out of it (`Evaluators.EVALUATED`, `literal` alone); every other kind, `constant` among them, is
    refused by name, "TypeScript5 binaryexpression is not evaluated". No translator (Decided, 9).
83. **Printing**: `Text.ToText` ports mbse-programs' printer for expressions, patterns, types and JSX, byte-identical in
    both languages: its precedence, `??` beside `||` and `&&`, an arrow's object body, a `new`'s callee that calls, a
    number's member, a negative value's `**` (`(-5n) ** 1`), and the root parenthesized where an expression statement
    would start with `{`, `function`, `class` or `let [`. A literal with no `text` is written in its value's default
    spelling: a number as JavaScript's `String(number)` (`Text.number`, written in Python to match), a bigint with its
    `n`, a string in its `quote` or `"` with its escapes (`Text.string`: a backslash, the quote, `\b \f \n \r \t \v`,
    the other C0 controls and DEL as `\xHH`, the line and paragraph separators as `\uHHHH`). An arrow's lone
    unconstrained type parameter is written `<T,>`, as mbse-programs writes it for a `.tsx` file, so the text reads
    alike in both; an object type with comments is written one member a line.
84. **Completeness as data**: `grammars/typescript5-estree.json` lists typescript-estree's 168 node types
    (@typescript-eslint/types 8.71.0, TypeScript 5.9.3), each mapped to `Term`'s kinds, `Type`'s and `Pattern`'s
    branches (several at once where a schema is in several unions), a helper, or listed as not an expression with its
    reason; `concrete` names what typescript-estree does not keep. DIA-23 asserts it in both languages; no test reads
    typescript-estree itself, which neither implementation depends on.
85. **Tests**: FRM-01 to FRM-12 hold TypeScript5 with every dialect (its sample of every kind, written through the
    builders, printed in FRM-11); DIA-18 its literal's spelling; DIA-21 (its unions, literals, checks, bindings and
    evaluation), DIA-22 (printing) and DIA-23 (completeness) are added in both languages; none is retired. The corpus
    gains `typescript5`, a term of every kind; its JSON is byte-identical, its YAML quotes `++` and `??` in TypeScript
    alone (mbse-schemas' writers, both read back alike).

86. **Python3's binding targets hold its `Pattern`** (the proposal's Decided, "Every dialect has a `Pattern` union",
    "(ii)"). `Expressions.Python3.Pattern` lists the kinds Python's grammar allows as a target (its language reference,
    7.2): `variable`, `tuple`, `list` (the framework's), `starred`, `attribute`, `subscript` and `parenthesized`, each
    the schema its `Term` lists; `Comprehension.target` and `NamedExpr.target` hold it. As `TypeScript5`'s, a target is
    read as a helper, a `Terms.Part` (item 72): its terms follow the clause's own (a comprehension's iterable and
    conditions, a named expression's value), so a form's arguments are reordered, and `make`, printing, scopes,
    `target_names` (now of a term, or of a part and its terms), the evaluator's generator and the checks read it there.
    A target's own checks (a name an identifier, an attribute's name one, a target present) are its holder kind's, as
    validation does not read a helper; a namedexpr's signature is any number of arguments. A hole may now stand within
    a helper's attributes in a translation pattern (`Translators`), as a comprehension's target `N` does in the rules
    of `all`, `any` and counting. Stored data and the wire are unchanged: the branch names are the same, and the
    corpus is byte-identical. A kind no target is (`binop`) is refused there by mbse-schemas. Tested in DIA-19.

## Settled in stage 5 (C and Cpp), for the user's review

Built as [the dialects proposal](../dialects/README.md#decided) decided (its Decided, 3, 5, 6, 8 and 9, the revision
of 2026-11-03 that each of C and C++ defines the kinds they share, the sublanguage unions' "(b)", "Every dialect has a
`Pattern` union", "(ii)", and, from the review of 2026-11-04, "A name is whatever the language's own grammar makes
it") and as the brief for stage 5 asked; each choice below is where they were silent. Items 88, 90, 92 to 94, 96, 98
and 100 are revised by that review, and items 104 to 106 added; items 87 to 89, 91, 94, 96, 98, 100, 103, 105 and 106
are revised by the user's decisions of 2026-11-04 on item 106 (the proposal's Decided, "C++ writes a name used as an
expression only as `idexpression`", "C++'s init capture holds its name as a `Pattern`" and "C's writers stay, for code
generation"), and item 107 added.

87. **Kinds, named and shaped as mbse-programs has them** (`mbse-programs/python3/mbse/Programs/Ccpp/Syntax.py`): each a
    value object `Expressions.C.<Name>` or `Expressions.Cpp.<Name>`, with mbse-programs' properties in source order,
    its tag the name lowercased. `Expressions.C.Term` has 25 branches: `literal`, `constant`, `concatenatedstring`,
    `variable`, `parenthesizedexpression`, `genericselection`, `subscriptexpression`, `callexpression`,
    `memberexpression`, `postfixexpression`, `unaryexpression`, `sizeofexpression`, `alignofexpression`,
    `castexpression`, `binaryexpression`, `conditionalexpression`, `assignmentexpression`, `initializerlist`,
    `designatedinitializer`, `compoundliteralexpression`, `statementexpression`, `extensionexpression`, `typeid`,
    `error` and `missing`. `Expressions.Cpp.Term` has 39: C's but `variable`, `genericselection` and
    `compoundliteralexpression`, and `userdefinedliteral`, `idexpression`, `thisexpression`, `lambdaexpression`,
    `foldexpression`, `requiresexpression`, `functionalcastexpression`, `namedcastexpression`, `typeidexpression`,
    `awaitexpression`, `sizeofpackexpression`, `noexceptexpression`, `newexpression`, `deleteexpression`,
    `throwexpression`, `yieldexpression` and `packexpansion`. The kinds C held before (`constant`, `variable`,
    `call`, `member`, `subscript`, `unary`, `binary`, `conditional`, `cast`) are replaced by these; the writers keep
    their names (item 94).
88. **Names, as the grammar makes them** (the proposal's Decided, "A name is whatever the language's own grammar makes
    it", and "C++ writes a name used as an expression only as `idexpression`"). In C, an identifier used as an
    expression is the framework's `variable` (`name`), as C's grammar has a plain identifier expression. In C++, every
    name used as an expression is an `idexpression` (mbse-programs' `IdExpression`, its one kind), holding Cpp's `Name`
    union (`identifier`, `qualifiedname`, `templateid`, `operatorname`, `conversionname`, `literaloperatorname`,
    `destructorname`, and `decltypespecifier` where a name's place holds it): `x` is an `idexpression` of the identifier
    `x`, and `Expressions.Cpp.Term` has no `variable`. An `idexpression` is a lexical reference (item 107): of an
    identifier, to its spelling, which validation requires bound and evaluation resolves; of any other name
    (`std::cout`, `f<int>`), resolved by the scope alone, the terms it holds (a template's arguments) checked in scope,
    and refused by evaluation by name.
    Elsewhere a name is a node wherever mbse-programs (and tree-sitter) has one: where mbse-programs holds a `Name`,
    each dialect holds its `Name` union, C's of one branch, `identifier` (`Expressions.C.Identifier`, its `spelling`),
    as an identifier is C's one name (a member's `member`, a named type's, a struct's or an enum's `name`, an
    identifier declarator's `name`); where mbse-programs holds an `Identifier` alone, its `Identifier` directly (C's
    and C++'s field designator's `name`; C++'s simple capture's `name`, `sizeof...`'s `pack`, a type parameter's and a
    template template parameter's `name`); an init capture's `name`, a binding target, holds C++'s `Pattern` (item
    89). A `str` stays where mbse-programs has one: an
    attribute's `name` and `namespace`, a `using_namespace`. An identifier is checked as mbse-programs checks it
    (letters, digits, `_` and `$`, not starting with a digit) wherever one is held: the framework's variable's `name`,
    and every `identifier`'s `spelling`.
89. **Sublanguages and helpers, each a union of its own, a schema a branch of every union whose positions hold it**
    ("(b)"). `Type` is a type name, `typeid` (its `specifiers` and abstract `declarator`), and invalid syntax; `Term`
    lists `typeid` too, for the positions that hold an expression or a type alike (`sizeof(int)`, `_Generic`'s
    controlling operand, `offsetof`'s first argument), and `designatedinitializer`, an initializer list's item.
    `Pattern` is each dialect's binding targets ("(ii)"): C's holds invalid syntax alone and nothing holds it, as C
    expressions bind no names; C++'s lists `identifier` (`Expressions.Cpp.Identifier`, one schema in `Name` and `Pattern`, "(b)")
    beside `error` and `missing`, and an init capture's `name` holds it (the proposal's Decided, "C++'s init capture
    holds its name as a `Pattern`"), the one target a C++ expression binds (a lambda's parameters and a requires
    expression's are declarations; structured bindings are not expressions). The helpers' unions are named after
    mbse-programs' categories: C's `Name`, `Specifier`, `Declarator`, `Parameter`, `AttributeSpecifier`, `Designator`
    and `Initializer`; C++'s `Name`, `Capture`, `Requirement`, `Designator`, `Initializer`, `Specifier`, `Declarator`,
    `Parameter`, `TemplateParameter`, `ExceptionSpecification` and `AttributeSpecifier`. `Specifier` lists the attribute
    specifiers, as `TypeId` lists them among its specifiers; C++'s `TemplateParameter` a `parameterdeclaration` and its
    `Initializer` an `initializerlist`. Each dialect defines its own copy of each kind and helper they share
    (`Expressions.Cpp.TypeId` holds C++'s specifiers), without what only the other has (C's array declarator's `static`,
    its index designators, `_Generic`, compound literals, `typeof`, `_Atomic(type)` and `_BitInt` are C's alone). The
    framework reads a sublanguage's or a helper's value as a `Terms.Part`, and `Terms.node(tag, record)` reads it
    nested.
90. **Literals refine the framework's** (CAP-233, PRI-023): `Expressions.C.Literal` adds the encoding `prefix` (`L`,
    `u8`, `u`, `U`), its `quote` (`'` a character, `"` a string), an integer's `base`, `separators` (`'` between
    digits) and the `suffix` as written; `Expressions.Cpp.Literal` adds a raw string's `raw` and `delimiter`. An
    integer is an int, a floating literal a float, C23's and C++'s `true` and `false` a bool, a string a str, and a
    character its code, an int (its text keeps the character). `SUFFIXES` are each language's, by the value's type, as
    regular expressions (C's `u`, `l`, `ll`, `wb`, in either case and order, `f`, `l`, `df`, `f32`, ...; C++'s `z`,
    `f16`, `bf16`, ...); a suffix or a prefix the language does not write is a problem, and so is a value out of range
    (PRI-023), an integer that fits none of the types its suffix and base allow (`Domains.out_of_range`: `2**70`,
    "integer literal 1180591620717411303424 does not fit any type"; `2**70` or `-5` with `u`, "... does not fit
    'unsigned long long'", the last type the suffix allows), its type the one evaluation gives it, so that validation
    reports what evaluation would refuse. The prefix and the suffix are what the literal is, not its spelling: two
    literals of one value and different suffixes are different terms. A character's quote is C's spelling, as `'a'` is
    an `int` there, as `97` is, and not C++'s, where `'a'` is a `char`: what the literal is (PRI-002: a translation
    keeps it or refuses it, never turns it into an int silently). `SPELLING` names each language's: C's `text`,
    `problems`, `quote`, `base` and `separators`; C++'s `text`, `problems`, `base`, `separators`, `raw` and
    `delimiter`. A suffix neither language writes types the literal as `Anything`, unknown, not as a domain named in
    prose. `constant` is each dialect's own,
    for what no schema holds: `nullptr`, its `singleton` (C23's alone in C). C++'s `userdefinedliteral` holds a
    `literal` and its `suffix` (`10_km`).
91. **What each kind binds**: a function declarator's parameters, a lambda's parameters and init captures (an init
    capture's `Pattern`, where it is an identifier; invalid syntax binds none), and a requires expression's parameters,
    within it (`scopes(tag)`, `bound_names`). A callee is a term (`callexpression`'s
    `function`), whose names must be bound, as every reference's.
92. **Slots that may be empty**: `optional` paths written `"*.slot"` match that slot at any helper depth
    (`Terms.Kind`'s, new): an array declarator's `size`, a designator's range's `last`, a noexcept specifier's
    `condition`, a parameter's `default` argument, and a lambda's or a template parameter's `requires` clause, wherever
    a type name or a lambda nests them (`OPTIONAL`). A kind's own: GNU's `a ?: b`'s `consequence`, a fold's `left` or
    `right` (`(x + ...)` has one of them), a `throw`'s `operand`, a lambda's `template_requires`. A compound literal
    requires its type and its initializer list, an empty one (`{}`) held as written since mbse-schemas 0.26.9 (item
    99); the printer writes the list it holds.
93. **A body of statements or declarations is not part of the term** (Decided, 5, "(i)"): a lambda's and a statement
    expression's, which always have one, are not held at all, and printed `{}`; a struct's, a union's or an enum's,
    which may be absent (`struct S` names a type, `struct S {}` defines one), is said by `body`, a bool, printed `{}`
    where it is true.
94. **Writers kept, writing the complete kinds** (PRI-019 for every other term): `literal(value, suffix)`,
    `identifier`, `unary`, `binary`, `conditional`, `cast(type, operand)`, `member(object, name, operator=".")`,
    `subscript(object, *indices)` and `call(function, *arguments)`, as a `Writers(dialect, writer)` each dialect has;
    both write a member's name as an `identifier`, its `Name`; `identifier(name)`, and a callee named by a string, is
    C's `variable` and C++'s `idexpression` of the identifier (Cpp's `Writers` derives C's, its one difference). They
    stay, for code generation, as the user decided (2026-11-04): "4. for codegen, we keep the writers separately
    because they emit code not just wire format for the model". A cast's `type` is a spec of the dialect's `Type`,
    written through the builders: the writer does not read a type name from a string, which would guess whether each
    word is a keyword or a type's name (PRI-025), so `PRIMITIVES` is gone. A native value is written as its literal (a
    bytes has none).
95. **Standards as data**: `STANDARDS` names C11, C17 and C23, and C++17, C++20 and C++23; each kind's `standards` names
    those that have it (C's `constant` C23's alone; C++'s `requiresexpression`, `awaitexpression`,
    `yieldexpression` and `designatedinitializer` C++20's and C++23's; GNU's `statementexpression` and
    `extensionexpression`, `EXTENSIONS`, none). A feature within a kind or a helper (C23's `typeof`, `alignof` beside
    `_Alignof`, C++20's lambda template parameters, C++23's `a[i, j]`) is not recorded: whether a term is in a
    standard is a constraint, to come. C++26 (pack indexing, reflection, splices, contracts) is outside `Cpp`.
96. **Evaluation keeps what C evaluated** (Decided, 8): `Evaluators.EVALUATED` names the kinds that replaced C's
    former ones, evaluated in their complete shapes by C's rules (`Cpp`'s interpreter is C's, over its dialect, its
    `EVALUATED` C's with `idexpression` in place of `variable`, `interpreter(dialect, evaluated)`); a
    literal's type is what its text encodes (`Domains.literal(attributes, language)`: its suffix and base, as C's
    tables give them; `'a'` C's `int` and C++'s `char`), an integer that does not fit raising "integer literal N does
    not fit 'T'". Every other kind, and what an evaluated kind holds beyond its former shape (an operator with no rule
    here, a literal of a type no evaluator has values of, a cast to a type that is not arithmetic, several indices, a
    callee that is not a name, a C++ name that is not an identifier, "Cpp idexpression of a name that is not an
    identifier is not evaluated", GNU's `?:`), is refused by name. Invalid syntax is refused by name first, `ValueError`,
    as every dialect refuses it, where a term stands and where a cast's type does ("C error is not evaluated"), before
    the check that the type is arithmetic. `Domains` gains the vocabularies of the new operators,
    `size_t` for `sizeof` and `alignof`, and `nullptr_t`; `arithmetic(names)` reads a type
    name's keywords to an arithmetic type.
97. **Printing**: `Text.ToText` ports mbse-programs' printer (`Ccpp/_Printer.py`) for both, byte-identical in both
    languages: C's precedence and C++'s (`<=>`, `.*`, `->*`), parentheses around a template argument that holds `>`, a
    literal with no text written with what it encodes (`5u`, `0x1fu`, `u8"s"`, a character as its character, C's
    escapes, a raw string in its delimiter's parentheses, an infinity or a NaN as `INFINITY` or `NAN`), a named
    cast's operand at the comma's precedence as mbse-programs writes it. Invalid syntax is written as written,
    wherever it stands. `FromText` is mbse-programs' (Decided, 6).
98. **Translators keep what they translated** (Decided, 9): Patterns <-> C and Patterns <-> Cpp share one rule set,
    `Patterns_C.RULES`, over the complete kinds (`_Patterns.CFamily`), a member's name an identifier in both, but for a
    name used as an expression (`Patterns_C.IDENTIFIER`), a Patterns `variable` C's `variable` and C++'s `idexpression`
    of the identifier (`CFamily.idexpression`), a C++ name that is not an identifier refused by name ("Cpp idexpression
    has no Patterns counterpart"); C++'s add one backward rule, a string written with its quote (`"s"`) as Patterns'
    string, since a quote is not C++'s spelling (item 90). A C++ character (`'a'`, a `char`), a literal with a suffix or
    a prefix, a cast and every other kind have no Patterns counterpart and are refused by name ("Cpp literal 97 of char
    has no Patterns counterpart", "C castexpression has no Patterns counterpart").
99. **Found, and resolved by mbse-schemas 0.26.9: an empty value object held directly as a property**: in 0.26.8 an
    empty initializer list in a compound literal read back absent (so it was printed `{}` and not required), and a
    lambda's empty declarator `()` read back absent, `[]() {}` as `[] {}`. mbse-schemas 0.26.9 (EMB-13) stores an
    empty value object held as a property, a container element or an inserted element present and empty, distinct
    from absent, so the workarounds are removed: a compound literal requires its initializer list again (item 92), and
    mbse-programs' distinction is restored, "Without a declarator, the lambda has no parameter list: `[] { ... }`":
    `[]() {}` reads back as `[]() {}`. DIA-24 and DIA-25 assert both round trips.
100. **Completeness as data**: `grammars/c-tree-sitter.json` (tree-sitter-c 0.23.6, 125 named node types) and
    `grammars/cpp-tree-sitter.json` (tree-sitter-cpp 0.23.4, 206), each node mapped to `Term`'s kinds, `Type`'s
    branches, a helper, or listed as not an expression with its reason, with the grammar's supertypes. DIA-26 asserts
    every branch of each `Term` and `Type` is the grammar's but invalid syntax; no test reads tree-sitter, which
    neither implementation depends on. tree-sitter-cpp's index and range designators are C's and GNU's, not C++'s.
    tree-sitter-c's `identifier` and `field_identifier` map to C's `Identifier` helper, as tree-sitter-cpp's do to
    C++'s; tree-sitter-c's `identifier` as an expression is C's `variable`, tree-sitter-cpp's C++'s `idexpression` (as
    is its `null`, which holds `NULL`).
101. **Invalid syntax in every sublanguage** (CAP-227, CAP-228): every dialect's `Type` and `Pattern` (Python3's
    `Pattern`, TypeScript5's `Type` and `Pattern`, C's and C++'s) list `error` and `missing`, so that invalid syntax
    stands where a type or a target does; it is reported as a problem (`Terms.invalid_problems`, new, which each
    dialect's checks read within a helper), printed as written, and refused by Python3's evaluator, "Python3 error is
    not evaluated". This supersedes item 71's "`error` and `missing` are `Term`'s alone".
102. **The framework**: `Terms.Node` and `Terms.node(tag, record)`, a term or a helper read nested, move from
    TypeScript5 into the framework, which C and C++ read too (TypeScript5's `Expressions.Node` is it).
103. **Tests**: DIA-11 (C) and DIA-12 (C's evaluation) are rewritten over the complete kinds under their IDs; DIA-18
    gains C's and C++'s literal spellings; DIA-24 (kinds), DIA-25 (printing) and DIA-26 (completeness) are added in both
    languages; FRM's samples hold every kind of each (FRM-11 prints them, and checks invalid syntax in each `Type` and
    `Pattern`); TRN-08 is rewritten for the shared rules; tutorial 8 writes its cast through `cast`, its type through
    the builders. None is retired. The review of 2026-11-04 adds, under the same IDs: DIA-11 a literal out of range;
    DIA-24 C's `Name` and where each dialect holds an identifier, a field designator's identifier checked, the quote in
    C's spelling and not C++'s, a C++ term refused by C's validation ("a Cpp idexpression is not a C term", since
    2026-11-04, as stage 2 asserted of a variable), and invalid syntax refused by C's evaluator; TRN-08 a member's name
    an identifier in C, a C++ string with its quote translated, and a C++ character refused. The corpus's `c` and `cpp`
    cases hold every kind; their JSON is byte-identical. Steps A and B of the brief, kinds and printing, landed in one
    commit, as FRM-02 needs each sample to hold every kind and FRM-11 prints them.
104. **Domains' tables are not mutated**: `BINARY` (the arithmetic operators and the comma) and `BINARY_CPP` (them, the
    comma, `<=>`, `.*` and `->*`) are each built whole from the arithmetic operators, and `UNARY` holds `*`, `&`, `++`
    and `--` from the start, so that no module table changes after another is built from it.
105. **The corpus**: the `c` and `cpp` cases write their names as identifiers and their cast's type through the
    builders; their text is unchanged, their JSON byte-identical in both languages. Since 2026-11-04 the `cpp` case
    writes each name used as an expression as an `idexpression`, and its lambda an init capture (`n = 1`) whose name is
    a `Pattern`; Python's builds it under a name of its own (`cpp_me`), so that the `c` case's terms, written later,
    keep C's identifier.
106. **Not changed here, waiting on the user**: typing literals by their suffix before CAP-232 (item 96). The empty
    value object workarounds (items 76, 92 and 99) are resolved by mbse-schemas 0.26.9, now pinned. Decided on 2026-11-04 (the proposal's
    Decided): C++ writes a name used as an expression only as `idexpression` (item 88), C++'s init capture holds its
    name as a `Pattern` and nothing holds C's (item 89), and C's writers stay, for code generation (item 94).
107. **A reference's name may be a name node** (settled in stage 5's follow-up, for the user's review): the framework
    read a reference's name as its `name`, a string, and C++'s `idexpression` holds a `Name`, a helper.
    `Terms.name_of` (`nameOf`) and `Terms.reference_name(name)` (`referenceName`, new) read a name node as its
    identifier's spelling, and any other name node (`std::cout`, `f<int>`, an identifier with no spelling) as no name
    (None, null). Validation requires a named lexical reference bound and not one with no name, and checks the terms a
    name node holds as an application's, in the kind's scopes ("name argument 0: idexpression 'w' is not bound");
    `Symbolics.free` collects their names; a translation's built reference adds its arguments' names; C's scope refuses
    a reference with no name by name, and a call's callee must be a named reference. A string `name` reads as before,
    so every other dialect is unchanged. Tests, under their IDs in both languages: FRM-01 (C++'s union has no
    `variable`), FRM-11 (C++'s recovered name an `idexpression`), DIA-24 (names as `idexpression`s, validation, scopes
    and evaluation of names that are not identifiers, an init capture's `Pattern`, invalid syntax there binding none,
    a term there refused, "'idexpression' is not a member of a union value", and C's `Pattern` held by nothing),
    DIA-25 (C++'s names printed from `idexpression`s, init captures' names as `Pattern`s), DIA-26 (tree-sitter-cpp's
    `identifier` and `null` an `idexpression`) and TRN-08 (C's rule set but for a name, a Patterns `variable` C++'s
    `idexpression` and back, a C++ name that is not an identifier refused).

## Settled in the namespace rename, for the user's review

Built as [the dialects proposal](../dialects/README.md#decided) decided ("Namespace": `Expressions.<family>.<dialect>`)
and as the user answered its eight questions (2026-11-05, "yes, go"); a rename only, each choice below is where they
were silent. The JSON corpora change only where a schema or singleton name appears (`domains`), byte-identical across
the languages; every other case's wire is unchanged, since branch tags are.

108. **The mapping.** Each dialect's schemas, singleton, install, Python package and TypeScript module are named by its
     path, below `Expressions`; no alias for the old names:

     | Old | Path (schemas, singleton) | Python package | TypeScript module, package export |
     |---|---|---|---|
     | `Patterns` (*superseded* 2026-11-09 by item 122: `Expressions.Patterns.Expressions`) | `Expressions.Framework.Patterns` | `mbse.Expressions.Framework.Patterns` | `src/Framework/Patterns`, `@mbse/expressions/Framework/Patterns` |
     | `Python3` | `Expressions.Python.Python3` | `mbse.Expressions.Python.Python3` | `src/Python/Python3`, `@mbse/expressions/Python/Python3` |
     | `TypeScript5` | `Expressions.TypeScript.TypeScript5` | `mbse.Expressions.TypeScript.TypeScript5` | `src/TypeScript/TypeScript5`, `@mbse/expressions/TypeScript/TypeScript5` |
     | `C` | `Expressions.C.Expressions` | `mbse.Expressions.C.Expressions` | `src/C/Expressions`, `@mbse/expressions/C/Expressions` |
     | `Cpp` | `Expressions.Cpp.Expressions` | `mbse.Expressions.Cpp.Expressions` | `src/Cpp/Expressions`, `@mbse/expressions/Cpp/Expressions` |
     | `SystemVerilog` | `Expressions.SystemVerilog.Expressions` | `mbse.Expressions.SystemVerilog.Expressions` | `src/SystemVerilog/Expressions`, `@mbse/expressions/SystemVerilog/Expressions` |
     | `Matlab` | `Expressions.MATLAB.Expressions` | `mbse.Expressions.MATLAB.Expressions` | `src/MATLAB/Expressions`, `@mbse/expressions/MATLAB/Expressions` |
     | `Excel` | `Expressions.Excel.Expressions` | `mbse.Expressions.Excel.Expressions` | `src/Excel/Expressions`, `@mbse/expressions/Excel/Expressions` |
     | `Latex` | `Expressions.LaTeX.Expressions` | `mbse.Expressions.LaTeX.Expressions` | `src/LaTeX/Expressions`, `@mbse/expressions/LaTeX/Expressions` |

     So `Expressions.Python3.BinOp` is `Expressions.Python.Python3.BinOp`, the singleton `Expressions.C` is
     `Expressions.C.Expressions` (`store.Instances.Expressions.C.Expressions`), a Patterns domain
     `Expressions.Framework.Patterns.uint8` (since item 123, ISO/IEC 11404's `modulo(256)`, whose schema is
     `Expressions.ISOIEC11404.Expressions.modulo_256`, where it wraps arithmetic, and `octet` where it holds a code), and an install's uid `mbse.Expressions.C.Expressions/1`. The package
     `mbse.Expressions.Dialects`, the directory `src/Dialects` and the export `@mbse/expressions/Dialects/*` go; the
     package exports and `deno.json` list each dialect by its path. Each family is a package of its own in Python
     (`mbse.Expressions.C`, whose docstring names its standard), holding its dialect; TypeScript's family directory
     holds only its dialect. A dialect's modules keep their names (`mbse.Expressions.C.Expressions.Expressions`, its
     kinds; `.Text`, `.Evaluators`, `.Domains`), and `mbse.Expressions`' own `Expressions`, `Evaluators`, `Domains`
     and `Partials` are still Patterns'. Tests: every case under its ID, renamed; CONF (the `domains` case).

109. **The branch tags stay** (the user's answer 4): `Expressions.Framework.Term`'s branches are still `patterns`,
     `python3`, `typescript5`, `c`, `cpp`, `systemverilog`, `matlab`, `excel` and `latex`, each its dialect's name in
     lowercase, as before.

110. **A dialect is made by its path, and named by it.** `Terms.Dialect(path, kinds, ...)` takes its path below
     `Expressions` (`"Python.Python3"`, `"C.Expressions"`), kept as `path`; its `union` is `Expressions.<path>.Term`,
     and its `name()` is `Terms.dialect_name(path)` (TypeScript `Terms.dialectName`), added: its own name, or its
     family's where its own says only that it is the family's expressions. The names are `Patterns`, `Python3`,
     `TypeScript5`, `C`, `Cpp`, `SystemVerilog`, `MATLAB`, `Excel` and `LaTeX`: MATLAB's and LaTeX's are now spelled as
     their families are, the makers' way, so the messages that name a dialect say so ("a Patterns let is not a MATLAB
     term", "Patterns quantifier 'all' has no LaTeX counterpart"), and the tags are unchanged, lowercase. A dialect's
     name read from another's union (a foreign term's message, C's scope refusing a name that is not an identifier)
     is `dialect_name` of that union's path. Tests: FRM-01 (the names), FRM-04 (holders by path), and the messages in
     FRM-11, FRM-12, DIA-03, DIA-09, TRN-01, TRN-05, TRN-07, TRN-12, TRN-14 and COL-06.

111. **What keeps its name.** The translators' modules (`Translators.Patterns_Matlab`, `Excel_Latex`, ...) and the
     classes and aliases of code that name a dialect (`_Patterns.Matlab`, `from mbse.Expressions.MATLAB import
     Expressions as Matlab` in the tests and tutorials) are identifiers, not schema or module paths of a dialect, and
     are not renamed; the translators' collection forms are keyed by the dialect's name (`"MATLAB"`), as their
     messages are. Renaming the translators' modules to the families' spellings is left for the user to decide.

## Settled in domains as data's stage 1, for the user's review

Built in domains as data's stage 1 (#27) as the user decided, the decisions now recorded in mbse-basis [CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided),
[CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md#decided), [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided) and [CAP-227: the Python3 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-227.md#decided), from [the domains proposal](../domains/README.md); each choice below is where they were
silent.

112. **The standard dialects.** `ISOIEC11404`, `IEEE754`, `IEEE1164` and `Unicode`, each a family holding its one
     dialect, `Expressions`, laid out as every dialect is (item 108; the dialects proposal's Decided, Namespace, 6 and
     7): the Python package `mbse.Expressions.<Family>.Expressions`, at `mbse/Expressions/<Family>/Expressions/`, its
     module `Expressions` holding `install`, `define` and `STANDARDS`, which the package exports; TypeScript's at
     `src/<Family>/Expressions/`, exported as `@mbse/expressions/<Family>/Expressions` and nothing for the family. Each
     dialect is a singleton of its own schema, `Expressions.<Family>.Expressions`, a branch of `Expressions.Framework.Dialect`
     (`isoiec11404`, `ieee754`, `ieee1164`, `unicode`), with its kinds of domain and no terms. Their `define`s write
     Patterns' former eight domains under their standards' names: `boolean`, `integer`, `octetstring`, and `octet`
     and `modulo(256)`, which split the former `uint8`, C's name, not 11404's (item 123); `binary64`, `binary32`;
     `std_logic`; `string`; their uids are `mbse.Expressions.<Family>.Expressions.define/1`
     (an install's uid kept while its content changes is mbse-basis
     [CAP-254: an install's uid changed with its content](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-254.md), as the
     user decided).
     Patterns' install keeps its terms, holder, singleton and operations; its `define` writes its operations alone.
113. **`Expressions.Framework.DomainKind` is a union of the dialects' kind unions**, as `Term` is of their `Term`s:
     each dialect with kinds adds `Expressions.<path>.DomainKind`, the branch named by its tag, so a domain's `kind` is
     written its dialect, then its kind (`u.ieee754(lambda v: v.ieee754(...))` within `d.kind(lambda k:
     k.as_value(lambda a: a.as_union(...)))`), and C's and C++'s `nullptr_t` are each their own. Each kind is named by
     its standard, its tag and its schema alike (2026-11-09, as the user decided: mbse-basis [CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided),
     "Names are the standards' own"): ISO/IEC 11404's `boolean`, `integer`, `modulo`, `bitstring`, `octet`, `octetstring`, `state` and
     `packed` (`Expressions.ISOIEC11404.Expressions.OfBoolean`, ..., `OfState`, `OfPacked`), formerly `bool`, `bits`,
     `bytes` and `enum`, `modulo` and `octet` new (item 123); `state` is the generic enumeration, 11404's ordered
     `enumerated` added only when a dialect needs an order, and `packed` keeps its name, both decided 2026-11-09
     ([CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md#decided)); IEEE 754's `ieee754`, IEEE 1164's `ieee1164` and Unicode's `unicode`, unchanged. Patterns' code
     domains (`Domains.read`, until stage 2) read each by its dialect's tag and its own.
114. **Inferred properties, populated by hand**: `ordered` on every kind; an integer's, a modulo's (and SystemVerilog's
     `logic`'s) `least` and `greatest`; IEEE 754's `radix`, `precision` and `emax`. `Domains.read` (Patterns', until stage 2)
     ignores them.
115. **Each language's own kinds**: SystemVerilog's `logic` (`width`, `signed`), Python3's `str`, `nonetype` and
     `ellipsis`, TypeScript5's `string` and `null`, C's and C++'s `nullptr_t`, Excel's `error` (`members`); their
     domains are stage 3's. DOM-18 writes one of each by hand: a domain needs its dialect as owner.
116. *(Superseded 2026-11-09, as the user decided, mbse-basis [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided), "No `Uses`".)* ~~`Expressions.Framework.Uses(dialect, used)`, unique `[dialect, used]`, every
     dialect's adjacency `uses`. No entry is written yet: an install cannot bind its own singleton.~~ Now **no `Uses`**: the relation and every dialect's adjacency `uses` are removed, in both
     languages. A dialect's dependencies are its caller's install order (item 118); nothing checks it (the same
     decision). Tests: FRM-01 and DOM-17 assert each dialect's
     adjacencies, `domains` and `operations`.
117. **The reading interface**, `Framework.Domains`: `kind_of` (`kindOf`), `properties`, `name_of` (`nameOf`),
     `operations` and `arity`; "a domain needs a kind". `kind_of` gives `(dialect, tag, record)`, the dialect's tag
     first (2026-11-09, as the user decided: mbse-basis [CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided),
     "`kind_of` gives the dialect too"), so that C's and C++'s `nullptr_t` are told apart
     (DOM-18). The code domains and signatures stay, `Dialect.infer`'s,
     marked as CAP-232's to replace. *(The code domains superseded by item 124, domains as data's stage 2; the
     signatures stay, without families.)*
118. **Every caller installs the standard dialects first**: tests, tutorials, the toolkit, the corpus and the skill. The
     corpus's `domains` case is ISO/IEC 11404's singleton and its domains, a state domain and a domain packing it into `octet` among them.
     Tests: DOM-17 (the standard dialects and the reading interface) and DOM-18 (each language's kinds) are added,
     DOM-13 to DOM-16 being retired IDs; EXP-05, EXP-06, EXP-13, FRM-01, DOM-03, DOM-05 and CONF-04 adjusted under
     their IDs; tutorial 7's T07.5 reads ISO/IEC 11404's domains through `Framework.Domains`.
119. **Not changed, for the user**: the package root's re-export of Patterns' `Domains`, `Evaluators`, `Expressions`
     and `Partials` (*decided* 2026-11-09: item 121), and Python3's complex number (*decided* 2026-11-09:
     item 120).
120. **Python3's complex number is its `constant`'s `complex`** (2026-11-09, as the user decided, (a),
     the smallest change: mbse-basis [CAP-227: the Python3 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-227.md#decided), J). `Expressions.Python.Python3.Constant` holds `singleton` (`None` or
     `...`, unchanged) or `complex`, a value of `Expressions.Python.Python3.Complex`, whose `real` and `imag` are each
     IEEE 754's `binary64` (`Expressions.IEEE754.Expressions.binary64`); the flat `real` and `imag` floats go. A form
     reads it as a helper, `Part("complex", {"real": 0.0, "imag": 2.0})`; `P.constant(2j)` (TypeScript
     `P.constant(new P.Complex(0, 2))`) and `Text.FromText` write it through a spec, with no store. Python3's install
     so names IEEE 754's schemas and runs after IEEE 754's, as every caller's list has it (item 118); mbse-schemas
     refuses it otherwise. The corpus's `python3` case pins its bytes. Its checks' messages are unchanged. `1` stays a framework `literal` while `2j`, `None` and `...` are
     Python3 `constant`s, a split that follows mbse-schemas' basic scalars rather than Python's grammar, kept for now.
     Tests: DIA-19.
121. **The package root exports `Framework` alone** (2026-11-09, as the user decided: mbse-basis
     [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided), "The package root exports `Framework` alone"). A breaking change, in 0.9.0: `mbse.Expressions` (`__all__ = ["Framework"]`) and
     `@mbse/expressions` (`export * as Framework`) no longer re-export Patterns' `Domains`, `Evaluators`, `Expressions`
     and `Partials`, nor call Patterns "the neutral form of every constraint". Patterns is imported from its own path,
     as every dialect is: `from mbse.Expressions.Patterns.Expressions import Evaluators, Expressions as E`, TypeScript
     `import { Evaluators, Expressions as E } from "@mbse/expressions/Patterns/Expressions"` (its path since item 122).
     `mbse.Expressions.Translators` and every dialect's path are unchanged (a subpackage still imports as
     `from mbse.Expressions import Translators`). The TypeScript tests, the tutorials, the skill and the README import
     so; FRM-01 asserts the root's exports.

122. **Patterns is `Expressions.Patterns.Expressions`** (2026-11-09, as the user decided, (b):
     mbse-basis [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided), "Patterns' place"). Patterns
     is a family with one dialect named `Expressions`, as C's, MATLAB's and Excel's are, not a part of the framework:
     its schemas and singleton `Expressions.Patterns.Expressions` (`Expressions.Patterns.Expressions.Term`, `.Dialect`,
     `.Expression`, `.add`, ...; `store.Instances.Expressions.Patterns.Expressions`), its install's and define's uids
     `mbse.Expressions.Patterns.Expressions/1` and `mbse.Expressions.Patterns.Expressions.define/1`, its Python package
     `mbse.Expressions.Patterns.Expressions` (at `mbse/Expressions/Patterns/Expressions/`, its family
     `mbse.Expressions.Patterns` a package whose docstring says what it is), its TypeScript module
     `src/Patterns/Expressions/`, exported as `@mbse/expressions/Patterns/Expressions`, and its `Terms.Dialect` path
     `"Patterns.Expressions"`, whose name is still `Patterns`. This supersedes item 108's row for Patterns (the dialects
     proposal's Decided, Namespace, 1). No alias for the old names. Unchanged: the branch tag `patterns` (item 109,
     "for now"), the translators' modules (`Translators.Patterns_Matlab`, item 111), and the wire, so the corpora are
     unchanged. Tests: every case that names Patterns' path, under its ID.

123. **`uint8` split by ISO/IEC 11404's own definitions** (2026-11-09, as the user decided: mbse-basis
     [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md#decided), "`uint8` split by 11404's own definitions"). The former `uint8`, 8 bits, unsigned and wrapping, was misnamed `octet` (item 112): 11404's `octet`
     (§10.1.7) is a code, non-numeric, with no arithmetic, and wrapping arithmetic is its `modulo` (§10.1.2). So ISO/IEC
     11404's install adds two kinds, `octet` (`Expressions.ISOIEC11404.Expressions.OfOctet`: `ordered` alone) and
     `modulo` (`OfModulo`: `modulus`; inferred `least`, `greatest`, `ordered`), and its `define` writes the domains
     `octet` (of `octet`, `ordered`) and `modulo(256)` (`modulus` 256, `least` 0, `greatest` 255, `ordered`). The
     domain is named in 11404's notation; its schema, `Expressions.ISOIEC11404.Expressions.modulo_256`, and the
     define's symbol for it spell it as a dotted identifier, as mbse-schemas' names must be (*agent*, for review).
     `integer` keeps `width`, `signed` and `overflow`. Patterns' code domains gain `OfOctet` (a code 0 to 255, ordered,
     no `fit`) and `OfModulo` (`modulus`; `bounds`, and `fit`, the remainder by the modulus), which `Domains.read` gives
     for the two kinds until stage 2; a packed domain's representation may be an octet ("a packed domain's
     representation is an octet, or an integer or bits of a width"); the families of `SIGNATURES` take a modulo among
     the numbers and the ordered values, an octet among the ordered values only. Each use of `uint8`: a code (a packed
     domain's representation: the corpus's `domains` case, EXP-06, DOM-03, DOM-05) is `octet`; arithmetic (EXP-13,
     DOM-05, DOM-17, T07.5, tutorial 8's introduction) is `modulo(256)`; C's `uint8_t` and the code domains' `uint8`
     (DOM-01), an unsigned integer of width 8, are not 11404's and stay. The corpus's `domains` case gains
     `modulo(256)`. Tests: DOM-01, DOM-02, DOM-03, DOM-05, DOM-06, DOM-07, DOM-09, DOM-17, EXP-06, EXP-13, FRM-01 and CONF-04,
     under their IDs. *(The code domains `OfOctet` and `OfModulo`, `Domains.read` and the families superseded by
     item 124, domains as data's stage 2.)*

## Settled in domains as data's stage 2, for the user's review

Built in domains as data's stage 2 (#28), from the user's decisions now recorded in mbse-basis [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided) ("No lone
terms") and [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md#decided); each choice where they were silent is marked *(agent)*.

124. **Patterns' code domains go**, in both languages: the kinds `OfBool`, `OfInteger`, `OfModulo`, `OfOctet`,
     `OfIeee754`, `OfBits`, `OfBytes`, `OfUnicode`, `OfIeee1164`, `OfEnum` and `OfPacked` (their data classes, builders
     and `Kind`s), their base `Domain` (with TypeScript's `equals`), `read`, `FORMATS`, `ROUNDINGS`, `OVERFLOWS` and
     `STATES`, the signatures' families, and `Expressions.CORE`. What stays in Patterns' `Domains` is inference's code,
     marked CAP-232's to replace: `Bool`, `Int`, `Float`, `Str` and `Bytes`, now the framework's `OfTypes` (TypeScript
     `new OfTypes("int", BigInt)`, ...), named as before; `Object`, `Anything`, `Records`, `List`, `Keyed`, `items_of`,
     `of`, TypeScript's `nativeDomain`, `SIGNATURES` (without families: `add` is `(T, T) -> T for T in int | float`,
     the bitwise operations and shifts `(int, int) -> int`), `QUANTIFIERS`, `LIST` and `MAPPING`; and evaluation's
     `Collection` and `Record`. `Ieee754` is unchanged. Inference no longer takes an environment's domain of a width,
     a format or an enumeration, which no code can now build.
125. **Validation reads stored operations through the holder.** `Terms.Kind` gains `operations(store)` *(agent)*: for
     a kind whose operations are data, those its dialect names in a store, by name, each its `Schemas.OfExpression`.
     Patterns' `call` gives `Domains.operations(store.Instances.Expressions.Patterns.Expressions)`, and validation
     reads it from `Proxies.store_of(term)` in place of its vocabulary: an operation the singleton does not name is
     refused ("'f' is not an operation Patterns defines"), and one given another number of arguments than its
     pattern's variables reported ("add takes 2 arguments, got 1"), the messages as before. A term held in an
     `Expression`, however deep, reaches its store; a lone term does not, and mbse-schemas' `TypeError`, "the value
     does not belong to a store", stands *(agent)*. A store where `Patterns.define` has not run names no operation, so
     every call is refused *(agent)*. Only such a kind reaches the store: every other dialect validates a lone term as
     before, and SystemVerilog's evaluator is unchanged *(agent)*. Evaluation is unchanged.
126. **Patterns' evaluator checks native types**: an operand's domain is the native type it is written with (an int, a
     float; TypeScript's `bigint`, `number`), in place of the data classes; its messages are unchanged. Its residuals'
     literals are written for any basic scalar (`Partials`), as before.
127. **Every caller runs `Patterns.define`** after the installs: the suites' setups, the tutorials' toolkit
     (`cold_chain`), CONF-04 on the corpus's store, and the skill. The corpus itself is unchanged.
128. **The suites' `term(spec)` helper writes a holder**, `store.Expressions.Framework.Expression(lambda e:
     e.root(dialect.spec(spec)))`, and gives its root (`Terms.term(holder)`): item 8's helper, now within a holder
     (Decided, C). A case that validates a term decoded or built alone writes it into a holder first.
129. **Tests**, under their IDs in both languages: DOM-01 rewritten as inference's natives' domains (`OfTypes`, `of`,
     `Object`); DOM-02 retired; DOM-03, DOM-05 and DOM-17 read stored domains through `kind_of`, `properties` and
     `name_of`; DOM-06 and DOM-07 keep evaluation's comparisons and arithmetic; DOM-09 signatures over natives and
     collections; DOM-10 to DOM-12 `Ieee754` directly; EXP-06 and EXP-13 (the stored operations are what validation
     reads, `SIGNATURES` the same names in order, a lone Patterns call refused, a store without `Patterns.define`
     refusing every call); CONF-04 (each case validated within a holder); FRM-04 (a decoded term validated within a
     holder); COL-07; and every suite's `term` helper and setup. SKL-03's count of links follows the skill. The skill,
     EQUIVALENCE and the test plans follow; the deliberate difference in comparing domains (`==`, `.equals()`) goes
     with the data classes.
130. **What only Patterns' code used goes**: `Same`'s `family` (`Framework.Domains`), and validation's refusal of an
     operator outside a closed kind's code vocabulary (`Terms`), a closed kind's operations now read as data; code no
     input reaches is removed (mbse-basis
     [PRI-039: 100% coverage of both](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-039)).
     `closed` stays, evaluation's.

## Settled in domains as data's stage 3, for the user's review

Built in domains as data's stage 3 (#30), from the user's decisions now recorded in mbse-basis [CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided) (K, N, the
scope of stored domains, R and the links between dialects), [CAP-267: C and C++ terms read under the ABI their holder names](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-267.md#decided) (one dialect per ABI, M, P and Q) and
[CAP-230: the C++ expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-230.md#decided) (M); each choice where they were silent is marked
*(agent)*. Group 1 (C, C++ and the ABI dialects) is 131 to 140,
group 2 (SystemVerilog) 141 to 148, group 3 (Python3, TypeScript5, MATLAB and Excel) 149 to 153. A breaking change, in
0.9.0, a breaking release anyway.

131. **C's and C++'s domains stored.** Each install adds its domains' schemas, each a `Schemas.OfAny` of the scalar it
     narrows (an int, a float, or `str` where the format's values are text), named as a dotted identifier with no
     leading `_` *(agent)*, since mbse-schemas refuses a symbol beginning with `_`: `Expressions.C.Expressions.Float16`,
     `Decimal32`, `int32_t`, `bool`; `Expressions.Cpp.Expressions.std_float16_t`, `std_bfloat16_t`. `C.define` (uid
     `mbse.Expressions.C.Expressions.define/1`) and `Cpp.define` (`mbse.Expressions.Cpp.Expressions.define/1`), run
     after the installs in a transaction of their own, idempotent, write, in the design's order *(agent)*, `bool`,
     `int8_t` to `int64_t` (11404's `integer`), `uint8_t` to `uint64_t` (11404's `modulo`), then C's `_Float16` to
     `_Float128` and `_Decimal32` to `_Decimal128`, or C++'s `std::float16_t` to `std::float128_t` and
     `std::bfloat16_t` (no `format`: `width` 16, `radix` 2, `precision` 8, `emax` 127), then the token `nullptr_t`,
     each with its inferred properties. The frame binds each domain by its schema's spelling (`[0]["Float16"]`;
     TypeScript `[0].get("std_bfloat16_t")`). Both packages export `define`.
132. **The ABI dialects**, `mbse.Expressions.SystemV.AMD64` and `mbse.Expressions.Arm.AAPCS64`
     (`@mbse/expressions/SystemV/AMD64`, `@mbse/expressions/Arm/AAPCS64`, in `package.json`'s exports and
     `deno.json`'s imports), each a singleton with no terms and no kinds, exporting `install`, `define` and `STANDARDS`;
     each `define` (`mbse.Expressions.SystemV.AMD64.define/1`, `mbse.Expressions.Arm.AAPCS64.define/1`) writes the
     types the C and C++ standards leave to the implementation, as the design's table lists them (Decided, Q): plain
     `char` signed on AMD64 and unsigned on AAPCS64, `wchar_t` `int` and `unsigned int`, `long double` and `_Float64x`
     x87's extended format (no `format`; `width` 80, `precision` 64, `emax` 16383) and `binary128`. Each dialect's
     schema declares an anonymous adjacency to `HasAbi` through `abi`, so that a holder naming as its ABI a dialect that
     is not one is refused by validation *(agent)*.
133. **`C.Domains.Types(value, path="C.Expressions")`** (TypeScript `new Types(value, path)`) *(agent)*: the types a C
     or C++ term reads, through its holder (`Terms.holder_of`): its own dialect's domains first, then those of the ABI
     the holder names (`abi`), each read once. `named(name)` gives a `CType`; `find(name)` None (null) where the holder
     names an ABI and neither defines the name; `label(ctype)` names a result. Its refusals are `ValueError`s:
     `'int' is not a type C defines, and its expression names no ABI` (or `Cpp`), and `'int' is not a type C or AMD64
     defines`; a lone term is refused by mbse-schemas' `TypeError`.
134. **`CType(kind, width, signed, format, label, domain, types)`**: the working value the arithmetic computes on,
     built from a stored domain (`boolean` gives `bool`, `integer` its width and signedness, `modulo` unsigned of width
     log2 of its modulus, `ieee754` `floating`, or `decimal` for radix 10; any other kind is not arithmetic); `format`
     IEEE 754's name or its parameters (x87's `(2, 64, 16383)`, TypeScript `[2n, 64, 16383]`); `domain` and `types`
     compared by nothing. It keeps `types`, the holder's lookup, beside `domain` *(agent)*: a type of C's own
     (`int8_t`) cannot reach the ABI through its domain, and the promotions need the ABI's `int`.
135. **The code type tables go** (Decided, K): `TYPES`, `Bool`, `Int`, `Double`, `UnsignedInt`, `Long` and
     `UnsignedLong`. `SIZE` is a plain `Opaque()`; `NULLPTR` stays a code token *(agent)*, nothing reading `nullptr_t`
     arithmetically, and `String` stays, a string's type being no stored domain (Decided, H, 4). `NAMES` lists C's and
     C++'s standard type names in the standard's order, which names a result (`int` before `int32_t`) *(agent)*.
136. **The rules take the types**: `promoted(ctype)` reads `int` through the type's `Types`; `common(a, b)` is None
     for a decimal type with a binary floating one; `of(value, types)` names a constant's type; `literal(attributes,
     language, types)` gives a type for any number or bool (a value's own `int`, `double` or `bool` included), None only
     for no value or an int no type holds; `out_of_range(attributes, language, types)` (`outOfRange`); `arithmetic(names)`
     gives a name, a single name that is no keyword itself (`my_t`); `Expressions.problems(node, types, ...)` takes
     `types` second; and `Expressions` gains `cast_type(name, types)` (`castType`), `truth(language)`, `size(language)`
     and `untyped(value)`.
137. **What reads a type from the store**: a literal's type and its range check, a lookup's failure in validation a
     problem and in inference and evaluation raised *(agent)*; a cast's target, where a name C's keywords spell must be
     defined and a single identifier neither dialect defines is a program's own type, not arithmetic *(agent)*; `bool`
     for comparisons, `&&`, `||`, `!` and C++'s `noexcept`, and `size_t` for `sizeof`, `alignof` and `sizeof...`,
     through `Kind.typed`; and evaluation of literals, variables, members, elements, calls and the promotions. The
     `_FloatN` and decimal types, and `L'a'`, now evaluate in their formats *(agent)*; a decimal literal's value is held
     as the binary64 float its literal holds (`0.1df` is `0.1000000`) *(agent)*; a decimal with a binary floating
     operand is refused (`invalid operands to binary + ('_Decimal32' and 'double')`; inference: `+ cannot take
     (_Decimal32, double)`). A floating suffix the language does not write gives `Anything`, and `_Float128x`, which
     neither ABI provides, is refused by name *(agent)*. A character literal with an encoding prefix is typed by the
     ABI's types; a prefix no language has stays an `OfTypes` *(agent)*. C++'s literals are typed by C++'s names
     (`1.0f16` a `std::float16_t`); C++'s `df` is unknown.
138. **`HasAbi`'s unique clause is `uniques("abi")`**, in both languages: in mbse-schemas `unique(S)` says S is
     determined by the other links, so a holder names one ABI at most. The design's `unique [expression]` had let one
     holder hold two.
139. **Every caller installs and defines C, Cpp, AMD64 and AAPCS64** after the standard dialects, and names an ABI on
     its C and C++ holders: the suites' setups and `term` helpers (05, 06, 07, 09), which name AMD64 by default
     *(agent)*, 07's on every holder; CONF-04 and the corpus, which gains `c_domains`, `cpp_domains`, `amd64_domains`
     and `aapcs64_domains`; the toolkit's `cold_chain`; tutorial 8, which names AMD64 and gains a step showing
     `(char)200` under both ABIs *(agent)*; and the skill. A C or C++ term evaluated or validated alone, or under a
     holder naming no ABI, is refused where it reads a type.
140. **The framework's links between dialects**, for the user's review (Decided, "The links between dialects"):
     `Expressions.Framework.HasAbi(expression, abi)` and `Expression`'s adjacency `abi` (item 138), added by the
     framework's install *(agent, its names)*; `Terms.holder_of(value)` (`holderOf`), a term's holding `Expression`
     found by its owners *(agent)*; and `Framework.Domains.domains(dialect)`, a dialect's domains by name, which C's,
     C++'s and SystemVerilog's lookups read. IEEE 754's kind gains `width`, inferred, written on every `ieee754`
     domain *(agent)*; `Ieee754.FORMATS` gains `decimal32`; and `Ieee754`'s operations take a format by its name or,
     where IEEE 754 names none, by its radix, precision and emax (`parameters`, `Format`), its values text *(agent)*.
141. **SystemVerilog's kinds and schemas.** Its install adds the kind `bit`, IEEE 1800's 2-state integral
     (`Expressions.SystemVerilog.Expressions.OfBit`: `width`, `signed`; inferred `least`, `greatest`, `ordered`), beside
     `logic`, and its 2-state domains' schemas, each a `Schemas.OfAny` of the scalar it narrows (`bit`, `byte`,
     `shortint`, `int` and `longint` of ints, `real` and `shortreal` of floats). A 4-state type has no schema: no basic
     scalar holds x or z.
142. **`SystemVerilog.define`** (`mbse.Expressions.SystemVerilog.Expressions.define/1`, exported by the package), run
     after the installs, idempotent: the singleton owns by name, in order, `logic`, `reg`, `integer`, `time` (kind
     `logic`), `bit`, `byte`, `shortint`, `int`, `longint` (kind `bit`), each with `least`, `greatest` and `ordered`,
     and `real`, `shortreal` (IEEE 754's `binary64` and `binary32`, with `width`), each 2-state one related to its
     schema; `reg` its own domain, of `logic`'s properties.
143. **SystemVerilog's type table goes** (Decided, K): `Domains.TYPES`, `Real`, `Integer`, `Bit`, `Longint` and
     `Expressions.CASTS`. `Domains.named(store, name)` *(agent)* reads the type SystemVerilog defines by `name` as an
     `SvType` of its kind's properties, labelled with its name and keeping its domain (`SvType.domain`, compared by
     nothing) *(agent)*; a name it defines none by is refused, `'int' is not a type SystemVerilog defines` *(agent)*.
144. **What stays code** (Decided, 2): `SvType`, `Logic`, `vector`, `common` and the signatures. `Domains.of(value)`
     names a constant's type *(agent)*; `common`'s `real` for a `shortreal` among integrals is read from the store of
     that operand's domain *(agent)*; `===`'s and `!==`'s `bit` is named from the store by the `binary` kind's `typed`
     *(agent)*.
145. **Through the holder, only where a named type is read** *(agent)*: validation (a cast naming a type, its refusal
     `'word' is not a type SystemVerilog defines`, replacing "a cast's type must be a built-in type"), inference (an
     unsized constant's type and a cast's through `Kind.typed`; `domain_of` gives `Anything` for a constant no type
     holds) and evaluation (every named type it computes in, each read once per evaluation). A lone term that reads
     none (`4'b1010 & 4'b0110`) is read as before.
146. **Every caller runs `SystemVerilog.define`**: the suites' setups, the toolkit, the corpus's store (for its
     `systemverilog_domains` case and CONF-04's validation of the `systemverilog` case's `byte'(...)`), and the skill.
147. **Tests**: DOM-20 (new), DOM-18 (the kind `bit`), FRM-01, DIA-13, DIA-14, the corpus's `systemverilog_domains`
     and CONF-04.
148. **Breaking**, in 0.9.0: the removed exports, `Domains.of`'s result, SystemVerilog's define required to read a
     named type, a lone term refused there, and the cast's message.
149. **Python3's, TypeScript5's, MATLAB's and Excel's stored domains.** Each gains a `define`
     (`mbse.Expressions.<path>.define/1`), run after the installs, idempotent, exported by its package, writing its
     domains owned by name, each named as its language names its type, each but a token's related to its schema
     (`Expressions.<path>.<name>`, an `OfAny` of the scalar it narrows): Python3's `bool`, `int`, `float`, `str`,
     `bytes` and the tokens `NoneType` and `ellipsis`; TypeScript5's `boolean`, `number`, `bigint`, `string` and the
     token `null`; MATLAB's `double`, `logical` and `string`; Excel's `number`, `logical`, `text` and `error`, its
     `members` the fifteen error values in `ERROR.TYPE`'s order then those added since *(agent)*. Their evaluators and
     inference are unchanged: their code domains stay inference's `OfTypes`, CAP-232's to replace *(agent)*.
150. **Two new kinds, each its dialect's own** *(agent)*: MATLAB's `string` (`OfString`) and Excel's `text`
     (`OfText`), UTF-16 code units as TypeScript5's `string`, each with `ordered`; MATLAB's install so gains its union
     of kinds, the branch `matlab`; Excel's lists `text` before `error`.
151. **An Excel error's schema narrows `str`**, its value its code, as Excel's evaluator holds one *(agent)*.
152. **Smaller choices** *(agent)*: a domain's schema keeps its language's spelling; MATLAB's and Excel's numbers narrow
     `float`; TypeScript5's `bigint` narrows `int`; Excel's error codes are written in its `define` alone.
153. **Tests**: DOM-21 (new), DOM-18 (MATLAB's union, Excel's `text`), FRM-01, and the corpus's `python3_domains`,
     `typescript5_domains`, `matlab_domains` and `excel_domains`, its data cases listed in `DOMAINS` *(agent)*, which
     CONF-04 reads.

## Settled in domains as data's stage 4, for the user's review

Built in domains as data's stage 4 (#31), from the user's decisions now recorded in mbse-basis [CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md#decided) (the dialects
proposal's Decided, Q10, and "Standards as tagged data, a stage of its own"); each choice where they were silent is
marked *(agent)*. A breaking change, in 0.9.0, a
breaking release anyway.

154. **The model**, added by the framework's install *(agent, its names and shape)*:
     `Expressions.Framework.Standard`, a reference object, one edition, its properties `bodies` (by reverse-domain
     name, `["org.iso", "ch.iec"]`), `number`, `revision` (a value of `Expressions.Framework.Revision`, the union of
     `year`, `edition` and `version`) and `names` (its common names), each optional, and its adjacencies `dialect`
     (its owner) and `kinds`; `Expressions.Framework.Covers(dialect, standard)`, its property `designation`, unique
     `[dialect, designation]` and `[standard]`, through which a dialect owns each edition it covers by its designation
     as its standards body writes it (`dialect.standards({"designation": "ISO/IEC 9899:2011"})`), as `Defines` owns a
     domain by its name; and `Expressions.Framework.HasStandard(kind, standard)`, a set, linking an edition to each
     kind's schema it has, through `Schemas.OfObject`'s extension adjacency `standards`, as `Schemas.OfAny` has
     `domain`. Every dialect's schema gains the adjacency `standards`, beside `domains` and `operations`.
155. **The reading interface**, `Framework.Standards`, new *(agent)*: `standards(dialect)`, a dialect's editions by
     designation; `designation_of(standard)` (`designationOf`); `tags(standard)`, its designation then its common
     names; `find(dialect, tag)`, the edition whose designation or common name is `tag`, or None (null), so either
     kind of reference finds it; `properties(standard)`, as `Domains.properties` reads a domain's, a container a tuple
     (an array) and its revision its branch and its value (`("year", 2011)`; TypeScript `["year", 2011n]`);
     `kinds(standard)`, its kinds' schemas; and `of(dialect, kind)`, the editions of a dialect that have a kind. A
     kind's schema reads the same entries from its side through `standards` (FRM-13 reads them through
     `Builders.OfObject.Builder(schema, False, store)`).
156. **Each define writes its dialect's editions**, owned by designation, with their formal reference's parts and common
     names, and, where the dialect has terms, the kinds each has, from the table its kinds' `standards` came from, now
     the define's *(agent)*: ISO/IEC 11404:2007, IEEE Std 754-2019 and IEEE Std 1164-1993, each its bodies, number and
     year; The Unicode Standard, its body alone; the AMD64 psABI, its title alone; AAPCS64, its title, Arm's body and
     its abbreviation `AAPCS64` as its common name; C's ISO/IEC 9899:2011, 2018 and 2024 (`C11`, `C17`, `C23`), every
     kind in each but `constant`, C23's alone; C++'s ISO/IEC 14882:2017, 2020 and 2024 (`C++17`, `C++20`, `C++23`),
     every kind in each but C++20's four, in C++20 and C++23 alone; Python 3.0 to 3.15, the Python Software
     Foundation's (`org.python`), each its version and the kinds it has from the version each arrived in (`_SINCE`:
     `yield from` 3.3, `await` 3.5, an f-string 3.6, `:=` 3.8, a t-string 3.14); TypeScript 5.0 to 5.9, Microsoft's,
     each every kind. An extension and invalid syntax are in none. A revision, a number or a body is held only where
     the designation or the code names one *(agent)*: none is invented for Unicode, the psABIs or AAPCS64's document
     number.
157. **A define's frame binds each edition** *(agent)*: a dialect covering one as `standard`; one covering several, each
     by its common name or its published name spelled as an identifier (`C11`, `Cpp17`, `Python_3_8`,
     `TypeScript_5_0`).
158. **What goes**, in both languages: every module's `STANDARDS` and its package's export of it, `Terms.Kind`'s
     `standards` (its option, in TypeScript), the `standards` argument of C's `kinds(...)`, which C++ shares, and C's,
     C++'s, Python3's and TypeScript5's tables of standards by kind (`_C_STANDARDS`, `_STANDARDS` and `_SINCE_20`'s
     names, `_since`, `_ALL`), each now the define's table. `EXTENSIONS` stays.
159. **SystemVerilog, Patterns, MATLAB, Excel and LaTeX cover none** *(agent)*: their code names no standard.
     SystemVerilog's editions are stage 6's, which records them in this model (the dialects proposal's Decided, Q10):
     *superseded* for SystemVerilog by item 177, its six dialects covering IEEE 1364's and IEEE 1800's editions.
160. **The corpus** *(agent)*: each data case that writes a dialect's singleton as one document now holds its `Covers`
     entries; a new data case, `standards` (`STANDARD`), writes C23's edition, ISO/IEC 9899:2024, as one document of
     `Expressions.Framework.Standard`, pinning an edition's properties and its kinds byte for byte; CONF-04 reads both
     back.
161. **Tests**, under their IDs in both languages: FRM-13, new (standards as data, its model, its reading interface,
     each edition's tags and properties, each kind's editions); FRM-12's assertions of `STANDARDS` and `Kind.standards`
     moved there, its title no longer naming standards; FRM-01 (`standards` among each dialect's adjacencies); DOM-17
     and DOM-19 (each standard and ABI dialect's edition read from the store); CONF-04 (each data case's editions, and
     the `standards` case); SKL-03's count of links follows the skill.

## Settled in stage 6 (SystemVerilog), for the user's review

Built as [the dialects proposal](../dialects/README.md#decided-for-stage-6-systemverilog-and-after-2026-11-05) decided
(Decided for stage 6, its principles, Q1 to Q12 and the namespace) and as stage 6's *Design* planned it; each choice
where they were silent is marked *(agent)*. The core (162 to 179) was built first, then the slang data (180 to 186),
then the four sublanguages in parallel (Patterns 187 to 191, Assertions 192 to 197, Constraints 198 to 203,
Preprocessor 204 to 209), then the coordinator's decisions (210 to 213). A breaking change, in 0.10.0: SystemVerilog's
17 constraint kinds are replaced by IEEE 1800-2023's.

### The core

162. **A sublanguage's dialect is named by its family too** *(agent)*: `Terms.SUBLANGUAGES` (`Types`, `Patterns`,
     `Assertions`, `Constraints`, `Preprocessor`, `RegExp`) and `Terms.dialect_name` (`dialectName`): a path whose own
     name is one of them is named with its family (`SystemVerilog Types`).
163. **`Terms.dialect_tag(name)`** (`dialectTag`) *(agent)*: the name lowercased, a space an underscore
     (`systemverilog_types`); `Dialect.tag` uses it, and no existing tag changes.
164. **`Terms.Dialect(..., reads=callable)`** *(agent)*: a callable of no arguments, called once on first use, giving
     the dialects whose terms this one reads, so that the six packages import each other without a cycle;
     `Dialect.reads()` returns a tuple. It is code that reads terms, not data naming what a dialect uses: not a reason
     to reinstate `Uses` (mbse-basis [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided), "No `Uses`").
165. **`Dialect.kind_named(tag)`** (`kindNamed`) *(agent)*: its own kind, else the first a read dialect declares; else
     "<Dialect> has no kind 'x'".
166. **Reading another dialect's terms** *(agent)*: `kind`, `validate`, `infer` and `make` delegate a term of a read
     dialect's `Term` to that dialect; a tag a read dialect declares inside this dialect's own union is read by that
     kind; any other dialect's term is refused with the message it had ("a Patterns call is not a SystemVerilog term").
167. **`Terms.is_binder(schema)`** (`isBinder`) *(agent, for review)*: `Framework.Let` or a refinement of it;
     validation, inference and `Symbolics.free` read a binder's bound names from its kind's `scopes`, and `Let`'s
     `name` is unset on SystemVerilog's binders, which bind names they do not write themselves.
168. **Installs in any order** *(agent)*: each of the six names the others' `Term`s and helpers by name, creating any
     that is not yet installed; an empty union fails mbse-schemas' validation ("a union needs at least one branch"),
     and none is empty after the six installs. Documented in the `Expressions` module's docstring.
169. **The `Term`s, as the installs leave them** *(agent)*: `Expressions.Term` has 41 branches (its 38 kinds, `error`,
     `missing`, then the Preprocessor's `macrousage`); `Types.Term`, `Patterns.Term`, `Assertions.Term` and
     `Constraints.Term` each `Expressions`' branches, their own kinds, then `macrousage`, Assertions' with Constraints'
     `distexpression` before it, Constraints' with the Preprocessor's directives and `comment` after it;
     `Preprocessor.Term` its own kinds, `error` and `missing`, and none of `Expressions`' (DIA-27).
170. **Literals** *(agent)*: `literal` refines the framework's, adding `base`, `signed`, `separators`, `unit` and
     `triple`; `constant` holds exactly one of `singleton`, `fill` and `bits` (with `size`, `signed`, `base`, `text`,
     `problems`); `SPELLING` is `text`, `problems`, `separators` and `triple`; an unsized based literal is unsigned, an
     unsized vector 32 bits.
171. **Names** (Q4): `nameexpression`, and no `variable`, as for C++; the `Name` union is `identifier`, `scopedname`,
     `localname`, `parameterizedname`, `interfacetypename`, `interfacemethodname`, `unitname` and `superexpression`;
     identifiers are checked as mbse-programs checks them ("'2x' is not an identifier", escaped identifiers accepted),
     a system call's name too ("'$' is not a system task or function name"); a choice among a few gives mbse-programs'
     message ("RangeSelect.operator cannot be '::'").
172. **Binders** *(agent)*: `arraymethodwithexpression` refines `Let` (its `value` the call, its `body` the `with`
     expression); its iterator is the call's one `nameexpression` argument, else `item`, bound in both; a `matches`
     binds through `Patterns.bound_names` (`boundNames`), which `conditionalexpression`'s and
     `predicateexpression`'s scopes read.
173. **Where a sublanguage stands**: `Types.Term` at a cast's type, a system call's arguments, a parameterized name's
     parameters, an assignment pattern's type and a pattern item's key; `Assertions.Term` at a call's arguments;
     `Patterns.Term` at a `matches`' pattern; `Constraints.Term` at `randomize() with`'s items.
174. **Writers**: `literal` (a native; a bool refused), `vector(bits, size, signed, base)`, `identifier`, `unary`,
     `binary`, `conditional`, `concatenation`, `replication(count, *items)`, `select` (`indexexpression`), `range_`
     (`rangeselect` `:`), `inside`, `span` (`valuerange`), `cast(type spec | width)`, `member`, `call` (a `$` name a
     `systemcall`), `method(array, name, *args)` and `iterate`.
175. **Evaluation keeps what it evaluated before** (Q11) *(agent)*: every other kind is refused by its owner's name,
     `NotImplementedError` ("SystemVerilog Types structtype is not evaluated"); a cast's width under 1, "a cast's width
     must be positive, got 0".
176. **Printing** *(agent)*: `Expressions.Text.Printer` ports mbse-programs' `_Printer`; the family's printer merges
     each sub-module's `TEXTS`, `PRECEDENCE` and `INLINE`; invalid syntax is printed as written, an error with no text
     refused, "<dialect> error has no text to print"; a literal or a constant with no value, "... has no value to
     print". `Printer.inline` puts a space between parts, none at a line's start or end, as mbse-programs does (the
     Preprocessor's change).
177. **Editions** *(agent)*: `Expressions.EDITIONS`, 8 of them (IEEE Std 1364-1995, 2001 and 2005, IEEE Std 1800-2005,
     2009, 2012, 2017 and 2023), body `org.ieee`, revision the year, common names `Verilog-1995` ...
     `SystemVerilog-2023`, frame symbols `Verilog_1995` ...; `SINCE` maps a kind to its edition's index (3 is IEEE
     1800-2005); `editions(every, since, first)`. `Expressions`, `Types` and `Preprocessor` cover all eight; `Patterns`,
     `Assertions` and `Constraints` the five of IEEE 1800; each lists only its own kinds.
178. **`HELPERS`** in each dialect's module *(agent)*: its own helper schemas' names, as the slang data names them.
179. **Completeness** *(agent)*: DIA-29 checks each of the six exactly: the kinds and helpers slang's syntax kinds map
     to are each dialect's own, but `missing` (Expressions') and `disabledtext` and `comment` (the Preprocessor's), which
     no syntax kind has.

### The slang data

`grammars/systemverilog-slang.json` lists slang's 533 syntax kinds (pyslang 12.0.0, as mbse-programs pins it), each
mapped where mbse-programs' `_Reader.py` builds the node: 229 mapped, 304 not.

180. **An entry may hold kinds and helpers together** *(agent)*, as the C files do: `IdentifierName` (`nameexpression`
     and `Identifier`) and `ScopedName` (`nameexpression`, `memberexpression` and `ScopedName`, `LocalName`,
     `InterfaceTypeName`, `InterfaceMethodName`); an entry is `not` alone, or kinds and helpers.
181. **A kind several dialects use is written under the dialect that defines it** *(agent)*:
     `Constraints.distexpression`, `Preprocessor.macrousage`, `Expressions.error`.
182. **Literals** *(agent)*: `IntegerLiteralExpression`, `RealLiteralExpression`, `TimeLiteralExpression` and
     `StringLiteralExpression` are `literal`; `IntegerVectorExpression` `literal` and `constant`;
     `UnbasedUnsizedLiteralExpression` and `NullLiteralExpression` `constant`; `$` `dollarexpression`.
183. **Types' helpers** *(agent)*: `VariableDimension` maps to the five `Dimension` helpers (a dimension's specifiers
     not); `Declarator` to `VariableDeclarator` and `EnumMember`.
184. **Arguments and names** *(agent)*: `EmptyIdentifierName`, `EmptyPortConnection` and `EmptyTimingCheckArg` are
     `emptyargument`; `NamedPortConnection` and `NamedParamAssignment` `namedconnection`; `ConstructorName` and the four
     array methods' names `Identifier`; `ClassName` `ParameterizedName`; `UnitScope` `UnitName`; `LocalScope` not.
185. **Clocks** *(agent)*: `EventControlWithExpression` and `ImplicitEventControl` are `EventControl`,
     `SignalEventExpression` `EventExpression`; a statement's timing control not.
186. **Wrappers are not expressions** *(agent)*, each reason naming what holds its content, in the C files' style;
     `NonblockingAssignmentExpression` and `TimingControlExpression` are statements' parts. Uncertain, for review:
     `BadExpression` as `error`; `ConditionalPattern` as `matchesexpression`; `VoidCastedCallStatement`, `Delay3` and
     `OneStepDelay` listed not, though mbse-programs' reader builds a term at them.

### Patterns (12.6)

187. **Its kinds** (stage 6's *Design*): `variablepattern`, `wildcardpattern`, `taggedpattern`, `structurepattern`,
     `patternmember` and `parenthesizedpattern`; `patternmember` is a kind in its `Term` *(agent)*, so `HELPERS` is
     empty, a member's name `Expressions`' `Identifier`; `parenthesizedpattern` holds `pattern` (Q5).
188. **Every kind from IEEE 1800-2005** *(agent)*: `SINCE` gives each 3.
189. **What a pattern binds** *(agent)*: no pattern kind refines `Let`; the `matches` that holds it binds through
     `bound_names`, its variables' names (read through `Terms.name_of`), and binds nothing from invalid syntax.
190. **Printing** *(agent)*: no precedence entries; a constant pattern is printed unparenthesized.
191. **Tests**: suite SVP (12, nine cases), and FRM-02's sample of every kind.

### Assertions (clause 16)

192. **Its `Term`** *(agent)*: `Expressions`' branches, its 17 kinds (`SEQUENCES`, `PROPERTIES`, `propertyspec`,
     `cyclerange`), Constraints' `distexpression` and `macrousage`; `HELPERS` `DelayStep`, `PropertyCaseItem`,
     `EventControl` and `EventExpression`.
193. **Positions** *(agent)*: what IEEE 1800 calls `expression_or_dist` holds `Assertions.Term` (an `if`'s and a
     `case`'s expressions and its items', an abort's condition, `disable iff`); a match item, a cycle range's bounds and
     an event's expression and condition `Expressions.Term`.
194. **A delay sequence's steps are pairs** *(agent)*: each `DelayStep` a delay and a sequence ("a delaysequence needs a
     sequence 0"); operators, keywords and edges are checked with mbse-programs' messages; every kind is an
     application, opaque, and none binds.
195. **Editions** *(agent)*: `SINCE` gives `strengthproperty`, `abortproperty` and `caseproperty` IEEE 1800-2009 (4):
     14 kinds in IEEE 1800-2005, 17 after; Constraints' `distexpression` in its `Term` is in none of its editions.
196. **Printing** *(agent)* ports mbse-programs' `property_text`: precedence `REPEAT` to `TEMPORAL` (-1 to -14),
     exported from `Assertions.Text`, `throughout`, `iff`, `until` and the implications right-associative; a delay is
     printed bare after `##` for an integer literal, a vector constant, a name, a parenthesized expression or a macro
     usage, else parenthesized; a lone cycle range `low:high`; `@(*)` with no events. An operator outside the table
     raises as the core's `BINARY` does (a `KeyError` in Python, `undefined` in TypeScript).
197. **Tests**: suite SVA (13, eight cases), and FRM-02's sample of every kind.

### Constraints (18.5)

198. **Its `Term`** *(agent)*: `Expressions`' branches, `constraintblock`, `expressionconstraint`,
     `implicationconstraint`, `conditionalconstraint`, `foreachconstraint`, `solvebeforeconstraint` (item 211),
     `disablesoftconstraint`, `uniqueconstraint` and `distexpression`, then `macrousage` and the Preprocessor's
     directives and `comment`; its install adds `distexpression` to `Assertions.Term`. `HELPERS` is `DistItem`;
     `OPERATORS` `:=` and `:/`; it exports `problems` and `loop_variables` (`loopVariables`).
199. **`foreachconstraint` refines `Let`** (Q8) *(agent)*: its array is `Let`'s `value`, an `Expressions` term, its body
     `body`, a Constraints term, its properties in the order `name`, `value`, `body`, `variables`, `name` unset; it binds
     its identifier variables in its body alone (scopes: none, then its variables); a loop variable is the new helper
     union `LoopVariable`, an identifier or an `emptyargument` for a dimension it skips.
200. **A distribution's items** *(agent)*: a `DistItem` with no value is `default`, with neither operator nor weight
     weighs 1; "DistItem.operator cannot be 'x'", "a DistItem has both an operator and a weight, or neither", "a default
     DistItem weighs its values with :/"; ranges are `Expressions`' `valuerange`.
201. **Editions** *(agent)*: `SINCE` gives `disablesoftconstraint` and `uniqueconstraint` IEEE 1800-2012 (5); a feature
     within a kind (`soft`, 2012; a default distribution item, 2023) is not recorded.
202. **Printing** *(agent)*: each on one line, as `randomize() with` writes it, a block through `inline`;
     `distexpression`'s precedence is a relational operator's, its value printed at it, and `INLINE` ends it with `;`. A
     `missing` item prints as an empty part (`{ x;  }`), as SVC-08 asserts.
203. **Tests**: suite SVC (14, eleven cases), and FRM-02's sample of every kind.

### Preprocessor (clause 22)

204. **Its `Term`** *(agent)*: `macrousage`, `includedirective`, `definedirective`, `undefdirective`,
     `timescaledirective`, `defaultnettypedirective`, `ifdefdirective`, `disabledtext`, `otherdirective` and `comment`
     (`TAGS`), then `error` and `missing`; it exports `DIRECTIVES`, `NET_TYPES` and `problems`; `HELPERS` is
     `ElsifDirective`. Its install adds the directives and `comment` to `Constraints.Term`; a directive's branches hold
     `Constraints.Term`, its condition `Expressions.Term`.
205. **What it binds** *(agent)*: a condition's macros' names, within that condition alone (`Kind.scopes`); nothing
     refines `Let`.
206. **Checks** *(agent)*: a macro usage, a define and an undef need a name, an include a path, a timescale its unit and
     precision, a default net type a net type, disabled text and any other directive a text;
     "DefaultNettypeDirective.net_type cannot be 'x'", "an IfdefDirective has a name or a condition", "an
     IfdefDirective's condition is in parentheses", "an IfdefDirective's condition has macros' names, !, &&, ||, -> and
     <-> only", and the same of an `ElsifDirective`. A comment's text may be empty or absent, printed `//`.
207. **Editions** *(agent)*: all eight, every kind in each (`SINCE` empty); features not recorded.
208. **Printing** *(agent)* follows mbse-programs' directives, comments and `inline`: items as written, an expression
     held as a constraint ended by `;`; `INLINE` writes a directive on lines of its own and a line comment ending its
     line; a macro usage among constraints gets no `;`; "SystemVerilog Preprocessor ifdefdirective has no name or
     condition to print".
209. **Tests**: suite SVD (15, nine cases), and FRM-02's sample of every kind.

### The coordinator's decisions, and the merge

210. **A kind may hold several containers of terms** *(agent, the coordinator's decision 1)*: `Terms._parts` gives a
     kind's variadic properties as a tuple (each container of terms, or of pairs), read in declaration order; a term's
     arguments are its slots, then each container's terms in turn, then its helpers'. Where a kind holds several, its
     form's attributes hold each container's size as a `Part` named by the container (`Part("solve", {}, 2)`), so that
     `make` puts each term back; a container given no size holds none, but the last, which holds the rest, and sizes
     that do not add up are refused ("an ifdefdirective's items, alternative hold 5 arguments, got 2"). `Node.lists`
     gives the terms by container (`Node.many` stays all of them); `_members(schema, name)` takes the container. A
     several-container kind's arguments are labelled by their container (`before 0`, `items 2`), one container's as
     before (`argument 0`). Every reader follows: validation, inference, `Symbolics`, printing and SystemVerilog's
     evaluator (its nodes read each container by name).
211. **Constraints' `solvebeforeconstraint`** (decision 1): `SolveBeforeConstraint{solve, before}`, each a container of
     `Expressions` terms, after `foreachconstraint`, in every edition of IEEE 1800 (no `SINCE` entry, as mbse-programs'
     `sv()`), checked as an application, printed `solve a, b before c;`.
212. **The Preprocessor's `IfdefDirective` in mbse-programs' shape** (decision 1): `negated`, `name`, `condition`,
     `items`, `branches`, `alternative` (the `else`'s items, a second container of terms) and `has_else`; the
     `ElseDirective` helper is gone, and slang's `ElseDirective` is listed as not an expression again, what
     `IfdefDirective` holds as its `has_else` and `alternative`. An `else` is printed where `has_else` is set, its items
     or none.
213. **A `matches` is refused before a conditional's branches are sized** *(agent, the coordinator's decision 2)*:
     SystemVerilog's evaluator sizes a conditional's condition first, so a `matches` there is refused by name ("SystemVerilog
     matchesexpression is not evaluated") rather than its consequence, which names what the pattern binds, raising
     `NameError`. SVP-08 asserts it.
214. **The corpus** *(agent)*: four cases, `systemverilog_patterns`, `systemverilog_assertions`,
     `systemverilog_constraints` and `systemverilog_preprocessor`, each a term of its dialect of every kind, written
     through the builders, its JSON byte-identical in both languages; `DIALECTS` names each one's dialect.
215. **Tests**, under their IDs in both languages: DIA-13 and DIA-14 rewritten; DIA-15 and DIA-19 adjusted; DIA-27 to
     DIA-29 new (DIA-29 checking all six dialects complete); FRM-01, FRM-02 (a sample of every kind of each of the six),
     FRM-04 (`_parts`' and `_members`' new shapes), FRM-11, FRM-12 (its title), FRM-13 (each dialect's `SINCE`);
     TRN-09, TRN-11; CONF-04 (`systemverilog_domains` lists 8 editions, and the four new cases); and the suites SVP,
     SVA, SVC and SVD.
216. **A constant described as `None` in refusal messages** ("SystemVerilog constant None of logic [7:0] ..."): open
     with the user then, left as it was; decided since, a constant's text shown (item 269).

## Settled in the retrofit, for the user's review

Built as [the dialects proposal](../dialects/README.md#stages-proposed-once-decided) designs it (stage 6's *Retrofit's
design*), applying Decided for stage 6 to the other dialects; each choice where the design and the decisions were
silent is marked *(agent)*. The core (217 to 224) was built first, alone; then three groups in parallel, Python (225
to 235), TypeScript (236 to 245) and C and C++ (246 to 260); then the coordinator's merge and decisions (261 to 268).
The regular expression dialects (`Python RegExp`, `TypeScript RegExp`) and JSX wait on the user (the design's Open, 1
and 2). A breaking change, in 0.10.0: the moved schemas' names, the binders' renamed properties, and the callers'
install lists.

### The core

217. **A binder binds by its role** *(agent)*: `Terms._lets(kind, record)` reads a term as a let only where its kind's
     role is `BINDING` and it has no `scopes`; a quantifier and an import refining `Let` bind by their roles, in
     validation, inference and `Symbolics.free`, and validation checks an import before the let reading.
218. **Every existing binder refines `Let`** (the design's table) *(agent, each mapping)*: Patterns' `quantifier`
     (`collection` → `value`), MATLAB's `arrayfun` (`array` → `value`) and `import`, Excel's `map` (`array` →
     `value`), Python3's `lambda`, comprehensions (`elt` → `body`), `dictcomp` (`value` → `body`), `namedexpr`,
     `import` and `importfrom`, TypeScript5's functions, arrows and classes, and C++'s `lambdaexpression` and
     `requiresexpression`; a refinement lists Let's properties first, and the writers keep their names and argument
     order.
219. **Let's empty slots in a form** *(agent)*: every refined binder's form starts with Let's slots, None where unset:
     `(None, body, ...)` for a comprehension or a lambda, `(value, None, ...)` for a named expression, `(None, None, ...)`
     for C++'s and TypeScript5's functions and classes; a translator's pattern may hold None for an empty slot.
220. **Let's unset properties are optional** *(agent)*: a binder lists the Let properties it leaves unset in its
     kind's `optional`, which evaluation does not refuse when empty.
221. **An import's body is its last argument** *(agent)*: evaluation and the MATLAB and Python3 printers read it so; a
     prelude is an import whose body, its last argument, is a hole and its others empty.
222. **A refinement redeclares only the Let terms it holds** *(agent)*, each to its own dialect's `Term`; one it leaves
     unset stays `Expressions.Framework.Term`.
223. **Seven new dialects' installs, after their families'** *(agent)*: `Python Types`, `Python Patterns`, `TypeScript
     Types`, `TypeScript Patterns`, `C Types`, `Cpp Types` and `C Preprocessor`, each with its package, export,
     singleton, holder and `Terms.Dialect`; every caller installs and defines each after its family's dialect (FRM
     places them at the end). Python3 reads Python Types and Python Patterns; TypeScript5 reads TypeScript Types and
     TypeScript Patterns; C reads C Types and C Preprocessor; C++ reads Cpp Types and C Preprocessor; each new dialect
     reads its family's others; C Preprocessor reads C, C Types, C++ and Cpp Types (group C's, below). The two regular
     expression dialects are not built (the design's Open, 1).
224. **Tests**: DIA-30, new, a binder of every dialect refining `Let`, its properties and scopes; FRM-01, FRM-02, DIA-19,
     DIA-21, DIA-24, EVL, COL, PAR and TRN under their IDs where they write or read a renamed property; the corpus
     regenerated.

### Python (group P)

225. **Python Types' `Term` lists Python3's branches** (the design, API 169): every branch of
     `Expressions.Python.Python3.Term`, which Python3's install adds, then `typevar`, `paramspec`, `typevartuple` and
     invalid syntax; its own kinds in mbse-programs' shapes, a name a `str`.
226. **Python Patterns' kinds** (the design): mbse-programs' eight, `matchmapping` and `matchclass` each holding two
     containers (API 210), checked with mbse-programs' messages ("a MatchMapping needs a pattern for each key", "a
     MatchClass needs a pattern for each keyword", "a MatchOr needs two patterns"), and `ast`'s: an as pattern with a
     pattern needs a name *(agent)*.
227. **What a pattern binds** *(agent)*: `Patterns.bound_names` (`boundNames`), exported, its capture names wherever
     they nest, read by the `case` that holds it; none of its kinds refines `Let`.
228. **Editions** *(agent)*: Python Types covers Python 3.0 to 3.15, as Python3's, its kinds from 3.12; Python Patterns
     Python 3.10 to 3.15, every kind from 3.10; each lists its own kinds only.
229. **Printing** *(agent)*: each dialect's `Text` gives `TEXTS`, which Python3's printer dispatches to (the family's
     one printer, as SystemVerilog's); a pattern's precedence levels are numbers on the family's scale, the same in
     both languages; a type parameter with no name is refused ("PYT-07").
230. **No writers** *(agent)*: their terms are written through the builders; a type expression of Python3's kinds
     through Python3's writers.
231. **Evaluation** (Q11): each kind refused by its dialect's name ("Python Types typevar is not evaluated"); a type
     expression of Python3's kinds evaluates as Python3's.
232. **Exports** *(agent)*: each package exports `Expressions`, `Text`, `define` and `install`, and TypeScript's
     `@mbse/expressions/Python/Types` and `@mbse/expressions/Python/Patterns`.
233. **Completeness**: `grammars/python3-ast.json` gains `ast`'s `type_param` and `pattern` nodes, each mapped to a
     kind of its dialect, and `match_case` listed as a statement's part; DIA-20 checks both dialects exactly.
234. **The corpus**: `python_types` and `python_patterns`, each a term of every kind, written through the builders.
235. **Tests**: suites PYT (16, nine cases) and PYP (17, nine cases); FRM-01, FRM-02 (a sample of every kind of each),
     FRM-13 (their editions), DIA-20.

### TypeScript (group T)

236. **The moved schemas renamed** (the design, "Moving a union out of a dialect moves its schemas"):
     `Expressions.TypeScript.TypeScript5.Type` is `Expressions.TypeScript.Types.Term` and `...Pattern`
     `Expressions.TypeScript.Patterns.Term`, their kinds' schemas under `Expressions.TypeScript.Types` and
     `Expressions.TypeScript.Patterns`; a term's data, written by branch tags, is unchanged.
237. **A type's and a pattern's terms are terms, not helpers** *(agent)*: a position that holds the new dialects'
     `Term` holds terms the framework reads as a kind's arguments (a container of terms, labelled by its property),
     where TypeScript5 had read some as helpers; so containers, labels and messages within types and patterns change
     ("typeAnnotation: ...").
238. **A value object of terms held alone is a helper** *(agent, a framework fix)*: `Terms._parts` (`parts`) reads a
     property whose schema is a pair of terms, held alone, as a helper (`TSTypeAnnotation`), as it read one held in a
     container; without it, TypeScript Types' annotations were read as slots.
239. **An identifier in a type is never unbound** *(agent)*: `TypeScript Types` declares its own `identifier` kind, a
     type's name, which validation does not report as an unbound reference; the identifier check also validates a
     helper's types.
240. **An assignment's target is a reference** *(agent)*: a pattern's names in an assignment (`a.b = 1`) are references
     the scope binds, not names it binds; FRM-02's TypeScript sample names `person` accordingly, and FRM-11's text
     follows.
241. **Type parameters are optional** *(agent)*: a function type's, a constructor type's and a mapped type's type
     parameters may be empty, listed in their kinds' `optional`.
242. **Binders** (the design's table): `tsmappedtype` refines `Let` (`constraint` → `value`, `typeAnnotation` → `body`,
     its key bound in its name type and its type), `tsfunctiontype` and `tsconstructortype` (their type parameters and
     parameters within them); `tsconditionaltype` binds its `infer` declarations by its scopes.
243. **Editions** *(agent)*: TypeScript 5.0 to 5.9 for each, each listing its own kinds only; TypeScript5's editions
     list TypeScript5's kinds only, no longer the types' and patterns'.
244. **Exports and printing** *(agent)*: `@mbse/expressions/TypeScript/Types` and `.../Patterns` (and Python's
     packages), each exporting `Expressions`, `Text`, `define` and `install`; TypeScript5's printer merges the two
     dialects' `TEXTS`. `grammars/typescript5-estree.json` keeps its entries, which name kinds by tag, unchanged; its
     `concrete` entries name the two unions by their names before the move, `Type` and `Pattern`, as its description now
     says *(agent)*.
245. **Tests and the corpus**: suites TST (19, five cases) and TSP (20, four cases); DIA-21 to DIA-23, FRM-01, FRM-02,
     FRM-04, FRM-11 and FRM-13 under their IDs; the corpus's `typescript_types` and `typescript_patterns`.

### C and C++ (group C)

246. **The family's kinds read through one internal module** *(agent)*: `C.Expressions.Kinds` (both languages), which
     no dialect module of the family imports beside, holds what the family's dialects share (its identifier checks,
     `identifier_problems`, C++'s suffixes); `C.Expressions` re-exports it. It breaks the TypeScript import cycle the
     core found (C++'s module body reading C's constants at load), so that C Preprocessor imports C++'s modules.
247. **`enumerator` is a kind** *(agent, a deviation from the design, for review)*: the design made an enumeration's
     items a helper union (`EnumeratorItem`) and a directive's items a union of unions (`Item`), but the framework
     reads a helper union one level deep; so `enumerator` is a kind of C Types and of Cpp Types, an enumeration's
     `enumerators` hold its Types' `Term` (which lists the preprocessor's directives and `comment`), and a directive's
     `items` hold `Expressions.Framework.Term`.
248. **`EnumSpecifier`** (the design): keeps `body`, gains `enumerators` and `trailing_comma`; "an EnumSpecifier with
     enumerators has a body".
249. **Type positions are term slots** *(agent, for review)*: a cast's, a compound literal's and a generic
     association's type, and C++'s, hold their Types' `Term` as a slot (a cast's form's argument 0; a generic association
     a pair), so its problems are labelled ("type: invalid syntax 'int int'"); the required slots drop `type`, and
     `base` and `trailing_return` join the optional ones; a generic selection's `type` is optional.
250. **C's type-name helpers move to C Types; C++'s stay** (the design's rule): 22 schemas move in C, as no C
     expression holds them; a C++ lambda's declarator holds parameters, so C++'s stay `Cpp Expressions`' and Cpp Types'
     `HELPERS` is empty.
251. **Editions** *(agent)*: C's and C++'s editions list their dialect's own kinds only (C23 lists 20).
252. **The preprocessor's shape** *(agent)*: an `alternative` is its `Term`'s slot, checked to be a branch after another;
     its items are checked; an include holds a path or a macro, its directive among `INCLUDES`.
253. **What the preprocessor binds** *(agent)*: a conditional directive's macros' names within its condition alone,
     and an include's macro's; `defined`'s name is a macro's, not a reference; `macros` exported; nothing refines
     `Let`.
254. **The preprocessor's editions** *(agent)*: six, C11, C17, C23, C++17, C++20 and C++23 (`EDITIONS`); `SINCE` gives
     `elifdefdirective` C23 and C++23.
255. **One printer for the family** *(agent)*: `C.Expressions.Text`; `C.Types.Text`, `Cpp.Types.Text` and
     `C.Preprocessor.Text` give `ToText` through it; an enumeration printed as mbse-programs prints it.
256. **A cast reads its type** *(agent)*: C's evaluator reads a cast's argument 0, a Types term, and evaluates its
     argument 1; invalid syntax where the type stands is refused by its owner's name.
257. **Completeness** *(agent)*: `grammars/c-tree-sitter.json` and `grammars/cpp-tree-sitter.json` are rewritten in
     DIA-29's form, each entry's kinds qualified by its dialect's tag; DIA-26 is rewritten in DIA-29's style, checking
     each dialect's kinds exactly (its helpers not).
258. **Positions** *(agent)*: C Preprocessor's install adds `definedexpression` to C's and C++'s `Term`, and its
     directives and `comment` to C Types' and Cpp Types' `Term`s; C's and C++'s `Term`s list `typeid` (their Types')
     and `definedexpression` (the preprocessor's) beside their own kinds.
259. **The corpus**: `c_types`, `cpp_types` and `c_preprocessor`, each of every kind; `standards` regenerated (C23 lists
     20 kinds).
260. **Tests**: suites CTY (22), XTY (23) and CPD (24), nine cases each; FRM-01, FRM-02, FRM-11, FRM-13, DIA-24 (its
     title), DIA-26 (rewritten), CONF-04 under their IDs.

### The merge, and the coordinator's decisions

261. **Refusals and invalid syntax name the kind's owning dialect, everywhere** *(agent, the coordinator's decision)*:
     the groups differed, P and T naming the dialect that owns a kind ("Python Types typevar is not evaluated", as the
     design's example has it), C the dialect evaluating it ("C typeid is not evaluated"). `Terms.Dialect.owner(term)`
     (`owner`) gives the owner once, in the framework: the dialect whose `Term` holds the term, this one or one it reads,
     or, for a kind that `Term` lists and a dialect it reads declares, that dialect; a term of any other dialect, the
     dialect itself. The framework's `Interpreter` refuses invalid syntax (`ValueError`), a kind outside `evaluated`
     and a kind of a dialect it reads (`NotImplementedError`) by the owner's name, so Python3's and TypeScript5's
     interpreter subclasses go; `Terms.invalid_term_text(dialect, term)` (`invalidTermText`) prints invalid syntax by
     its owner, which the Python3, TypeScript5, SystemVerilog and C family printers use; C's cast and SystemVerilog's
     evaluator name the owner too. Invalid syntax within a helper, which holds no term, is named by the printing
     dialect *(agent)*.
262. **What changes with it** *(agent)*: "C Types typeid is not evaluated", "C Types error is not evaluated", "Cpp Types
     typeid is not evaluated", "C Preprocessor definedexpression is not evaluated" (from C's and C++'s evaluators
     alike), where C named itself; an identifier in a TypeScript pattern, TypeScript5's kind, is refused as
     "TypeScript5 identifier is not evaluated", where T named TypeScript Patterns, the union holding it; and a literal
     a TypeScript type holds, TypeScript5's kind, evaluates as TypeScript5's, as Python3's kinds in a Python type
     do, where T's subclass refused every term of TypeScript Types' and Patterns' unions. CTY-06, CTY-08, XTY-09,
     CPD-09, DIA-24 and TSP-02 assert the new messages, FRM-01 `owner` itself.
263. **Every new dialect is checked alike** *(agent)*: no skeleton remains, so FRM-01 checks each of the seven the same
     way: its package with its printer (`Expressions`, `Text`, `define`, `install`), its own kinds (`TAGS`, with
     TypeScript Types' own `identifier`, then invalid syntax), its holder naming its ABI, and its `reads`, each
     family reading the others, C Preprocessor reading C's and C++'s expressions and types.
264. **A dialect that reads others is checked against what it reads** *(agent)*: FRM-01 and FRM-02 read a sample's
     terms through the dialect whose `Term` holds each, and a dialect whose `reads` is not empty (SystemVerilog's six,
     Python's three, TypeScript's three, C, C++ and the C family's new three) has every kind of its own in its sample,
     where the groups had each written its own family's rule.
265. **The corpus's order** *(agent)*: the seven new cases after `systemverilog_preprocessor`, in the groups' order:
     `python_types`, `python_patterns`, `typescript_types`, `typescript_patterns`, `c_types`, `cpp_types` and
     `c_preprocessor`; JSON byte-identical in both languages.
266. **The skill** *(agent)*: its install list names every new dialect, each after its family's; the dialects reference
     gains the families' sublanguages as dialects and the binders as variations of `let`, linking the cases the groups
     proposed and TST-01, TST-03, TST-05, TSP-01, TSP-02 and DIA-30 (SKL-03: 518 links).
267. **Tests**: 203 cases in each language, with the same IDs in the same order: PYT, PYP, TST, TSP, CTY, XTY and CPD
     new, 54 cases; FRM-01, FRM-02, FRM-04, FRM-11, FRM-13, DIA-20 to DIA-26, DIA-30, CONF-04 and SKL-03 under their
     IDs.
268. **Open, with the user** then, each left as it was, and decided since ([the dialects proposal](../dialects/README.md#decided-for-the-retrofit-2026-11-12),
     Decided for the retrofit): the regular expression dialects (the design's Open, 1), each a language's standard
     defines, "(b) ofc", built as items 271 to 310; JSX (Open, 2), which stays TypeScript5's; and a constant described as `None` in refusal
     messages (item 216), which shows its text (item 269).

## Settled with the user's answers on the retrofit, for the user's review

Built as [the dialects proposal](../dialects/README.md#decided-for-the-retrofit-2026-11-12) records the user's answers
(Decided for the retrofit, 4 and 5); each choice where they were silent is marked *(agent)*. The three regular
expression dialects (2) are built as items 271 to 310. A breaking change, in 0.10.0: TypeScript's `binding_names` is gone.

269. **A refusal shows a constant's text** (Decided for the retrofit, 4): `Terms.Kind`'s `shown(attributes)` gives what
     a refusal shows of a literal-role kind that holds no value, where a literal shows its value's `repr`; each
     dialect's `constant` sets it to its new `constant_text(attributes)` (`constantText`), the function its printer
     writes it with *(agent)*: its text as written (`text`), else its default spelling, Python3's `None`, `...` or a
     complex number as Python's `repr` writes it, TypeScript5's `null` or a regular expression (`/a+/g`), C's and
     C++'s `nullptr`, SystemVerilog's `null`, a fill or a vector in its base. So "SystemVerilog constant 8'd200 of
     logic [7:0] has no Patterns counterpart", where it was "constant None", "4'b10xz", "Python3 constant 2j of
     complex" and "C constant nullptr of nullptr_t"; a SystemVerilog constant that holds no value is refused as its
     printer refuses it ("SystemVerilog constant has no value to print"). SystemVerilog's default spelling moves from
     its `Text` to its `Expressions`, as does, in TypeScript, Python3's complex spelling, so that a kind reads it
     without importing its printer *(agent)*. TRN-05, TRN-08 and TRN-09 assert the messages. Since the regular
     expression dialects (item 289), a TypeScript5 constant with no `pattern` is written from its `regexp`:
     `constant_text(attributes, regexp)` takes the regexp's text from a callable its printer gives, as the module has
     no printer, and without one refuses ("a TypeScript5 constant with no pattern is written from its regexp, by its
     printer"); TypeScript5 has no translator, so no refusal shows one *(agent)*. TSR-07 asserts it.
270. **`bound_names` (`boundNames`), TypeScript's too** (Decided for the retrofit, 5): `TypeScript.TypeScript5.Nodes`',
     `TypeScript.TypeScript5.Expressions`' and `TypeScript.Patterns.Expressions`' `binding_names` (`bindingNames`)
     is renamed `bound_names` (`boundNames`), the name `Python.Patterns`, `SystemVerilog.Patterns` and
     `C.Expressions.Kinds` give what a pattern binds, with no alias; its callers, tutorial 8 (T08.2) and
     [Equivalence](../../EQUIVALENCE.md) follow. DIA-21 and TSP-02 under their IDs.

## Settled in the regular expression dialects, for the user's review

Built as [the dialects proposal](../dialects/README.md#stages-proposed-once-decided) designs them (stage 6's *Retrofit's
design*, Python's and TypeScript's regular expressions, and *Cpp RegExp*), on the user's answer to its Open, 1
(2026-11-12), "(b) ofc": every regular expression a language's standard defines is a dialect, its library's included.
Three groups built in parallel, Python (271 to 282), TypeScript (283 to 292) and C++ (293 to 301); then the
coordinator's merge and decisions (302 to 310). Each choice where the design and the decisions were silent is marked
*(agent)*. Numbered after 269 and 270, which mbse-expressions#39 adds.

### Python RegExp (group PR)

271. **Its kinds** *(agent)*: the design's, `pattern`, `alternative`, `group`, `capturinggroup`, `quantifier`,
     `characterclass`, `characterclassrange`, `characterset`, `character`, `assertion` and `backreference`, then
     Python's own `conditional`, `atomicgroup` and `flags`, and one beyond the design's list, `comment` (`(?#...)`), which
     `re`'s parser skips, kept so that a pattern prints as written; then invalid syntax. No helpers. Tags as regexpp's
     node types, lowercased; each kind a value object `Expressions.Python.RegExp.<Kind>`.
272. **Its properties, regexpp's names** *(agent; as harmonized, item 302)*: `alternatives`, `elements`, `name`, `min`,
     `max`, `greedy`, `element`, `negate`, `setKind`, `assertionKind`, `raw`, `value` and `ref`; Python's own
     `possessive`, a conditional's `ref`, `yes` and `no` (alternatives), a flags' `add` and `remove` (letters) and
     `alternatives` (none: a global `(?i)`; some: a scoped `(?i-m:...)`), and a comment's `text`.
273. **A character is its spelling and its code point** *(agent)*: `raw` and `value` (an int); no `problems`, as no parser
     here writes one: validation checks that the spelling spells the value (`spells`: the character, a control escape,
     `\xhh`, `\uhhhh`, `\Uhhhhhhhh`, octal to `\377`, `\` before ASCII punctuation, and `\N{...}` by its form alone, as
     TypeScript has no Unicode name database); a character without a spelling prints in a default one (`spelling`),
     escaped as where it stands, within a class or not, a space and `#` escaped outside one so that verbose mode reads
     it. Every kind is an application of no domain known statically (`Opaque`), a character too, not a literal.
274. **Absent means the default** *(agent)*: a quantifier's `max` absent is unbounded, `greedy` absent greedy,
     `possessive` absent not; `min` required.
275. **Checks as `re`'s parser makes them** *(agent)*: its messages where it has one ("nothing to repeat", "multiple
     repeat", "min repeat greater than max repeat", "bad character range z-a", "unknown flag", "missing flag", "missing
     :", "bad inline flags: ...", "redefinition of group name ...", "unknown group name ...", "invalid group reference
     N", "global flags not at the start of the expression"), ours elsewhere (what each kind may hold, a choice among a
     few, a code point and its spelling, "a backreference needs a ref"). Groups and references are resolved at a
     `pattern`, the root; global flags must lead in every edition (3.11's rule, a warning before); `L` and `u` both
     accepted, a str or a bytes pattern being its string's; a lookbehind's width, the compiler's, is not checked.
276. **Printing in one layout** *(agent)*: every kind closed, at the family's primary level; a quantifier's shortest
     bounds (`{0,}` prints `*`); a numbered backreference before a digit in a group of its own (`(?:\1)0`); `\z` (3.14)
     prints `\Z`, as an assertion keeps no spelling.
277. **Reads** *(agent, the design's)*: each of Python's four dialects reads the other three, so `Python3`, `Python
     Types` and `Python Patterns` gain `Python RegExp` in `reads`, and the family's printer merges its `TEXTS`; Python3's
     evaluator refuses each kind by its dialect's name ("Python RegExp pattern is not evaluated").
278. **Editions** *(agent)*: Python 3.0 to 3.15, `atomicgroup` from 3.11; a feature within a kind not recorded (a
     possessive quantifier, 3.11; scoped flags, 3.6; `\N{...}`, 3.8; `\z`, 3.14).
279. **Completeness data** *(agent)*: `grammars/python3-re.json`, generated from each version's `sre_constants.py` (3.0
     to 3.10) and `re/_constants.py` (3.11 on) at its CPython tag: 86 codes, the design's three classes (`OPCODES` with
     `MIN_REPEAT` and `MAX_REPEAT`, `ATCODES`, `CHCODES`) and a fourth, the flags (`SRE_FLAG_*`), each mapped to kinds
     with the attributes it gives them (`setKind`, `assertionKind`, `negate`, `greedy`, `possessive`, a flag's
     `letter`) or listed `not`, the compiler's, with its reason; `unwritten` names the kinds no code writes, `pattern`
     and `comment`. PYR-09 checks it in both languages, and in Python against the running `re._constants`.
280. **Install lists** *(agent)*: wherever every new dialect is installed (FRM's `RETROFIT`, DIA's, TRN's, DOM's, the
     corpus), not in the suites that install part of the family (PAR, SVC, PYT, PYP); placed as item 305 has it.
281. **The corpus** *(agent)*: `python_regexp`, a term of every kind, a character with its spelling; placed as item 306
     has it.
282. **Tests**: suite PYR (18, nine cases); FRM-01 (the dialect, its package, `reads`), FRM-02 (a sample of every kind),
     FRM-11 (invalid syntax, its printer), FRM-13 (its editions), PYT-01 and PYP-01 (their `reads`) under their IDs;
     CONF over the new corpus case. PYR-07 and PYR-09 also run Python's `re` in Python
     ([Equivalence](../../EQUIVALENCE.md#deliberate-differences)).

### TypeScript RegExp (group TR)

283. **Its kinds, regexpp's node types** *(agent, the design's)*: `regexpliteral`, `pattern`, `alternative`, `group`,
     `capturinggroup`, `quantifier`, `characterclass`, `characterclassrange`, `classintersection`, `classsubtraction`,
     `classstringdisjunction`, `stringalternative`, `expressioncharacterclass`, `characterset`, `character`,
     `assertion`, `backreference` and `modifiers`, then invalid syntax; its helpers regexpp's two node types that are a
     kind's parts, `Flags` (a literal's) and `ModifierFlags` (a modifiers'). Each kind's properties in the order regexpp
     declares them; a property whose name is a keyword of Python or the framework's `kind` is renamed as mbse-programs
     renames typescript-estree's: `setKind`, `assertionKind`, and a flag's `isGlobal` *(agent)*.
284. **What regexpp derives is not kept** *(agent)*: a node's `parent`, `start` and `end`, a group's `references`, a
     backreference's `resolved` and `ambiguous`.
285. **A spelling, regexpp's `raw`, kept where the tree does not give it** *(agent)*: a leaf's (`character`,
     `characterset`, `backreference`), `Flags`' and `ModifierFlags`', and a quantifier's, whose `{0,}` its bounds do not
     tell from `*` (mbse-basis [PRI-023: domain representations](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-023)).
286. **A quantifier's `max` absent where it is unbounded**, regexpp's `Infinity` *(agent)*; a backreference's `ref` a
     group's number or its name (`OfAny` of an int and a str).
287. **Checks** *(agent)*: what ECMA-262's early errors its data can show (a quantifier's bounds, a range's order, a
     literal's flags each once, never both `u` and `v`, a modifiers adding or removing a flag, never both), and what
     each kind may hold (a range's ends characters, an expression class's expression an intersection or a subtraction);
     which kinds a mode allows (the `v` flag's classes in a literal without it), like which terms a position allows, is
     a constraint (the dialects proposal, Decided, 4).
288. **Editions** *(agent)*: ECMA-262's, the 5.1 Edition to the 16th as built, the 17th added by item 303, each by Ecma
     International's designation (`ECMA-262 6th Edition`), body `org.ecma-international`, number `262`, revision its
     edition (the 5.1 Edition's a version), common names as Ecma writes them (`ECMAScript 2015`, `ES2015`), frame
     symbols `ES5_1` ... ; `SINCE` gives the `v` flag's five kinds the 15th (ES2024) and `modifiers` the 16th (ES2025);
     a feature within a kind (a named group, a lookbehind, a property escape, ES2018) not recorded.
289. **TypeScript5's `constant` holds its `regexp`** (the design's) *(agent)*: a regular expression literal's `pattern`
     and `flags` as written and `regexp`, the `regexpliteral` they encode, absent where they do not parse, holding
     `Expressions.TypeScript.RegExp.Term` by name (either install creating it); validated with the constant, its problems
     labelled `regexp:`; printed from it where the constant has no spelling; that it is what `pattern` and `flags` spell
     is not checked, as a literal's `value` is not against its `text`. The constant's checks run through `Nodes.check`'s
     own, so that no branch of it goes unread. TypeScript5 reads TypeScript RegExp; nothing else holds one, a string
     given to `new RegExp` being a string (mbse-basis [PRI-025: never guess the schema](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-025)).
290. **Printing** *(agent)*: by the family's printer; a node with a spelling as written; a quantifier as written where
     its spelling begins with its element's text, else in its shortest form; a character with no spelling as itself,
     but a syntax character or `/`, and in a class `-` too, escaped by `\`, and a control, a line terminator or a lone
     surrogate as `\t`, `\n`, `\v`, `\f`, `\r`, `\xHH` or `\uHHHH`; flags with no spelling in the order
     `RegExp.prototype.flags` writes them, a modifiers' as ECMA-262 lists them (`ims`).
291. **Completeness**: `grammars/ecmascript-regexpp.json`, generated from @eslint-community/regexpp 4.12.3's declarations:
     its 20 node types, of 28 interfaces, each a kind or a helper (TSR-02).
292. **Tests and the corpus**: suite TSR (21, seven cases); FRM-01, FRM-02, FRM-11 and FRM-13 under their IDs; the
     corpus's `typescript_regexp`, a literal of every kind.

### Cpp RegExp (group XR)

293. **One dialect for `std::regex`'s six grammars** *(agent, open with the user)*: ECMAScript's (ECMA-262's third
     edition, 15.10.1, as [re.grammar] modifies it), POSIX's basic and extended regular expressions (XBD 9.3 to 9.5),
     and awk's, grep's and egrep's, as one `std::basic_regex` reads them, the grammar one element of the
     `syntax_option_type` it is constructed with ([re.synopt]: "at most one of the grammar elements ECMAScript, basic,
     extended, awk, grep, egrep ... If no grammar element is set, the default grammar is ECMAScript"). A `regex`, what
     `basic_regex` holds, keeps its `flags` as written (`icase`, `nosubs`, `optimize`, `collate`, `multiline` and at
     most one grammar, `SYNTAX_OPTIONS`) and its `pattern`; a term held otherwise is read as ECMAScript's.
294. **Its kinds** *(agent)*: the constructs the grammars share, each once, named as regexpp names ECMAScript's (as
     TypeScript RegExp's are, each family its own copy) and as [re.grammar] names its own productions: `regex`,
     `patternlist` (grep's and egrep's newline-separated list), `pattern`, `alternative`, `group`, `capturinggroup`,
     `quantifier`, `characterclass`, `characterclassrange`, `characterset`, `character`, `assertion`, `backreference`,
     and the class atoms `exclass` (`[:alpha:]`), `collatingelement` (`[.ch.]`) and `equivalence` (`[=a=]`); then
     invalid syntax. No helpers.
295. **What a kind's terms may be, and what each grammar has, checked by validation** *(agent)*: `HOLDS` (an
     alternative's elements atoms, a class's its class atoms, a range's ends a character or a collating element), and,
     under a `regex`, `FEATURES` (alternation not in the basic grammar but in grep's list of patterns, a group and a
     lookahead ECMAScript's alone, a repeated quantifier or anchor an ERE's, a backreference no ERE's, past `\9`
     ECMAScript's), as which standard has a kind is for C and C++ (the dialects proposal, Decided, 3 and 4).
296. **Its properties** *(agent; as harmonized, item 302)*: a quantifier's `raw` (its spelling, printed where it has one),
     `min`, `max`, `greedy` and `element`; a character's `raw` and `value`; a character set's `setKind` and `negate`; an
     assertion's `assertionKind`, `negate` and `alternatives` (a lookahead's); a backreference's `ref`, a number, as no
     grammar names a group; a class atom's `name`.
297. **Editions** *(agent)*: C++'s three, C++17, C++20 and C++23, every kind in each: [re.grammar] is the same in the
     three.
298. **Its printer is its own** *(agent)*: its terms hold no other dialect's, and no position of another dialect holds
     one, so it shares nothing with the C family's printer but its reading of invalid syntax; the grammar, which a term
     alone does not say, is the context it writes in (a BRE's `\(...\)` and `\{m,n\}`, awk's escapes, ECMAScript's).
299. **Nothing bound** *(agent)*: a capturing group is numbered, not named, in every grammar (ECMA-262's third edition
     has no named group), and a backreference resolves it by its number.
300. **Completeness** *(agent)*: `grammars/cpp-regex.json`, written from [re.grammar], ECMA-262's third edition and
     POSIX XBD 9.5, production by production, each mapped to its kinds, or listed as not a kind with its reason (XRX-10).
301. **Tests and the corpus**: suite XRX (25, ten cases); FRM-01, FRM-02 and FRM-13 under their IDs; the corpus's
     `cpp_regexp`, a regex of every kind but `patternlist`, which ECMAScript, the one grammar of the others, has not,
     and which FRM-02's sample holds *(agent)*.

### The merge, and the coordinator's decisions

302. **The three dialects name ECMAScript's constructs alike** (the coordinator's decision): where a construct is
     ECMAScript's too, Python RegExp and Cpp RegExp name its properties as TypeScript RegExp does, after regexpp: a
     character set's `setKind` and an assertion's `assertionKind` (each was `kind`), a spelling as written `raw` (a
     character's, first as regexpp orders it, and Cpp RegExp's quantifier's, each was `text`), and Python RegExp's
     backreference's and conditional's group `ref`, a number or a name (were `number` and `name`, exactly one)
     *(agent: a conditional, Python's own, takes the backreference's name for the group it tests)*. Their messages
     follow ("CharacterSet.setKind cannot be ...", "a backreference needs a ref", "a backreference's ref must be
     positive, got 0"), with their printers, grammar files, corpus cases and suites. Python RegExp's comment keeps
     `text`, its content, not a spelling.
303. **ECMA-262's 17th Edition (ES2026), recorded as data** (the coordinator's decision, "not supporting the full
     standard is prohibited"): its pattern grammar (22.2.1) was checked against the 16th's, production by production,
     130 each, identical (tc39.es/ecma262/2025 and /2026, the 2026 edition published June 2026); none of ES2026's
     proposals changes it (TC39's finished proposals: RegExp modifiers and duplicate named groups are ES2025's,
     `RegExp.escape` a function). So `TypeScript RegExp`'s editions run to the 17th, which has the 16th's kinds, no new
     kind *(agent)*; TSR-05 and FRM-13 assert it; TypeScript5's flags are ECMAScript 2026's.
304. **Cpp and Cpp Types read Cpp RegExp** (the coordinator's decision), as each family's dialects read one another and
     Python's do, though no position of theirs holds one; Cpp RegExp reads Cpp, Cpp Types and C Preprocessor; C
     Preprocessor does not read Cpp RegExp, its conditions and items holding no regular expression *(agent)*. FRM-01's
     `READS` asserts it.
305. **The installs** *(agent)*: wherever every new dialect is installed (FRM's `RETROFIT`, DIA's, TRN's, DOM's, the
     corpus's store), the three RegExp dialects come last, after C Preprocessor, in the merge's order: Python RegExp,
     TypeScript RegExp, Cpp RegExp; a list of some families gets theirs (TRN's Python's and C++'s; DOM's Python's and
     TypeScript's). The tutorials' toolkit's `dialects()` installs and defines all three (the coordinator's decision);
     `cold_chain()`, which holds what the case studies translate into, none.
306. **The corpus's order** *(agent)*: `python_regexp`, `typescript_regexp` and `cpp_regexp` after `c_preprocessor`, and
     their statements in that order in both languages; JSON byte-identical in both languages.
307. **Suite TSR's cells reordered** *(agent, a fix)*: each case's code stood before its heading, against
     mbse-basis [PRI-035: tests are notebooks: one suite each, the same case IDs in the same order in both languages](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-035) (a case is a markdown cell, then one code cell); each
     heading now precedes its code, in both languages.
308. **The skill** *(agent)*: its install list names the three, each after its family's dialect; the dialects
     reference's item 6 gains the regular expression dialects and links PYR-01, PYR-07, PYR-09, TSR-01, TSR-06, TSR-07,
     XRX-01, XRX-04, XRX-08 and XRX-10 (SKL-03: 652 links).
309. **Tests**: 230 cases in each language, with the same IDs in the same order: PYR, TSR and XRX new, 26 cases; FRM-01,
     FRM-02, FRM-11, FRM-13, PYT-01, PYP-01, TSR-05 and SKL-03 under their IDs; the install lists of DIA's, TRN's
     and DOM's setups.
310. **Open, with the user**: Cpp RegExp as one dialect for the six grammars, the grammar among a regex's flags (item
     293), against a kind per grammar or a POSIX dialect beside ECMAScript's; built so, the coordinator agreeing.

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
