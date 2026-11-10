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
    `fit` and `validate` stay, unused by evaluation until domain inference.
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
    theirs, [the domains proposal](../domains/README.md#decided-on-this-proposal), Decided, A). The code that reads and writes them is still shared: `C.Expressions.kinds(standards)`,
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

Built as [the domains proposal](../domains/README.md#decided-on-this-proposal) decided (its Decided, A to J, the
package root's exports and stage 1's review) and as its [stage 1's design](../domains/README.md#stage-1s-design) specifies; each choice below is where they were silent.

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
     user decided, the domains proposal's Decided, "On stage 1's review").
     Patterns' install keeps its terms, holder, singleton and operations; its `define` writes its operations alone.
113. **`Expressions.Framework.DomainKind` is a union of the dialects' kind unions**, as `Term` is of their `Term`s:
     each dialect with kinds adds `Expressions.<path>.DomainKind`, the branch named by its tag, so a domain's `kind` is
     written its dialect, then its kind (`u.ieee754(lambda v: v.ieee754(...))` within `d.kind(lambda k:
     k.as_value(lambda a: a.as_union(...)))`), and C's and C++'s `nullptr_t` are each their own. Each kind is named by
     its standard, its tag and its schema alike (2026-11-09, as the user decided, "there is no need to preserve the old
     tags imo"): ISO/IEC 11404's `boolean`, `integer`, `modulo`, `bitstring`, `octet`, `octetstring`, `state` and
     `packed` (`Expressions.ISOIEC11404.Expressions.OfBoolean`, ..., `OfState`, `OfPacked`), formerly `bool`, `bits`,
     `bytes` and `enum`, `modulo` and `octet` new (item 123); `state` is the generic enumeration, 11404's ordered
     `enumerated` added only when a dialect needs an order ("yes, well, then that is a generic enough enum, eh?"), and
     `packed` keeps its name ("packed and packs does not go"), both decided 2026-11-09; IEEE 754's `ieee754`, IEEE 1164's `ieee1164` and Unicode's `unicode`, unchanged. Patterns' code
     domains (`Domains.read`, until stage 2) read each by its dialect's tag and its own.
114. **Inferred properties, populated by hand**: `ordered` on every kind; an integer's, a modulo's (and SystemVerilog's
     `logic`'s) `least` and `greatest`; IEEE 754's `radix`, `precision` and `emax`. `Domains.read` (Patterns', until stage 2)
     ignores them.
115. **Each language's own kinds**: SystemVerilog's `logic` (`width`, `signed`), Python3's `str`, `nonetype` and
     `ellipsis`, TypeScript5's `string` and `null`, C's and C++'s `nullptr_t`, Excel's `error` (`members`); their
     domains are stage 3's. DOM-18 writes one of each by hand: a domain needs its dialect as owner.
116. *(Superseded 2026-11-09, as the user decided, [the domains proposal](../domains/README.md#decided-on-this-proposal),
     Decided, I: "drop `Uses`".)* ~~`Expressions.Framework.Uses(dialect, used)`, unique `[dialect, used]`, every
     dialect's adjacency `uses`. No entry is written yet: an install cannot bind its own singleton (the domains
     proposal's question I).~~ Now **no `Uses`**: the relation and every dialect's adjacency `uses` are removed, in both
     languages. A dialect's dependencies are its caller's install order (item 118); nothing checks it (the domains
     proposal, Decided, I). Tests: FRM-01 and DOM-17 assert each dialect's
     adjacencies, `domains` and `operations`.
117. **The reading interface**, `Framework.Domains`: `kind_of` (`kindOf`), `properties`, `name_of` (`nameOf`),
     `operations` and `arity`; "a domain needs a kind". `kind_of` gives `(dialect, tag, record)`, the dialect's tag
     first (2026-11-09, as the user decided, "yes, dialect too"), so that C's and C++'s `nullptr_t` are told apart
     (DOM-18). The code domains and signatures stay, `Dialect.infer`'s,
     marked as CAP-232's to replace.
118. **Every caller installs the standard dialects first**: tests, tutorials, the toolkit, the corpus and the skill. The
     corpus's `domains` case is ISO/IEC 11404's singleton and its domains, a state domain and a domain packing it into `octet` among them.
     Tests: DOM-17 (the standard dialects and the reading interface) and DOM-18 (each language's kinds) are added,
     DOM-13 to DOM-16 being retired IDs; EXP-05, EXP-06, EXP-13, FRM-01, DOM-03, DOM-05 and CONF-04 adjusted under
     their IDs; tutorial 7's T07.5 reads ISO/IEC 11404's domains through `Framework.Domains`.
119. **Not changed, for the user**: the package root's re-export of Patterns' `Domains`, `Evaluators`, `Expressions`
     and `Partials` (*decided* 2026-11-09: item 121), and Python3's complex number (the domains proposal's question
     J; *decided* 2026-11-09: item 120).
120. **Python3's complex number is its `constant`'s `complex`** (2026-11-09, as the user decided,
     [the domains proposal](../domains/README.md#decided-on-this-proposal), Decided, J: "This distinction feels
     academic to me", so (a), the smallest change). `Expressions.Python.Python3.Constant` holds `singleton` (`None` or
     `...`, unchanged) or `complex`, a value of `Expressions.Python.Python3.Complex`, whose `real` and `imag` are each
     IEEE 754's `binary64` (`Expressions.IEEE754.Expressions.binary64`); the flat `real` and `imag` floats go. A form
     reads it as a helper, `Part("complex", {"real": 0.0, "imag": 2.0})`; `P.constant(2j)` (TypeScript
     `P.constant(new P.Complex(0, 2))`) and `Text.FromText` write it through a spec, with no store. Python3's install
     so names IEEE 754's schemas and runs after IEEE 754's, as every caller's list has it (item 118); mbse-schemas
     refuses it otherwise. The corpus's `python3` case pins its bytes. Its checks' messages are unchanged. `1` stays a framework `literal` while `2j`, `None` and `...` are
     Python3 `constant`s, a split that follows mbse-schemas' basic scalars rather than Python's grammar, kept for now.
     Tests: DIA-19.
121. **The package root exports `Framework` alone** (2026-11-09, as the user decided, "approved",
     [the domains proposal](../domains/README.md#decided-on-this-proposal), Decided, "The package root exports
     `Framework` alone"). A breaking change, in 0.9.0: `mbse.Expressions` (`__all__ = ["Framework"]`) and
     `@mbse/expressions` (`export * as Framework`) no longer re-export Patterns' `Domains`, `Evaluators`, `Expressions`
     and `Partials`, nor call Patterns "the neutral form of every constraint". Patterns is imported from its own path,
     as every dialect is: `from mbse.Expressions.Patterns.Expressions import Evaluators, Expressions as E`, TypeScript
     `import { Evaluators, Expressions as E } from "@mbse/expressions/Patterns/Expressions"` (its path since item 122).
     `mbse.Expressions.Translators` and every dialect's path are unchanged (a subpackage still imports as
     `from mbse.Expressions import Translators`). The TypeScript tests, the tutorials, the skill and the README import
     so; FRM-01 asserts the root's exports.

122. **Patterns is `Expressions.Patterns.Expressions`** (2026-11-09, as the user decided, "(b)",
     [the domains proposal](../domains/README.md#decided-on-this-proposal), Decided, "On stage 1's review"). Patterns
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

123. **`uint8` split by ISO/IEC 11404's own definitions** (2026-11-09, as the user decided,
     [the domains proposal](../domains/README.md#decided-on-this-proposal), Decided, "On stage 1's review": "yes, adopt
     names the standard uses for datatypes it defines (is this even a question?)"; "didn't you already resolve
     that?"). The former `uint8`, 8 bits, unsigned and wrapping, was misnamed `octet` (item 112): 11404's `octet`
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
     under their IDs.

## Settled in domains as data's stage 2, for the user's review

Built as [the domains proposal's stage 2's design](../domains/README.md#stage-2s-design) specifies, from its Decided
(C, 2) and stage 1's design; each choice where they were silent is marked *(agent)*.

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
129. **Tests**, under their IDs in both languages: TESTS_PLACEHOLDER

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
