<!-- nav -->
[← Porting to the stabilized mbse-schemas](README.md) · [Home](../../../README.md)

# The API after stage 2 (as settled in stage 2a)

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
store.transaction(Framework.install)        # Expressions.Framework: Term, Literal, Call, Variable, Let, Expression,
                                            # HasRoot, and Schemas.OfExpression's adjacency `expression`
store.transaction(Basic.install)            # Expressions.Basic.Quantifier, added to Term as the branch `quantifier`
```

`Framework.install` (in `Framework/Terms.py`, `Framework/Terms.ts`) and `Basic.install` (in
`Dialects/Basic/Expressions`) are module-scope `install(txn)` functions as drafted, each one transaction (an install
and what uses it are separate transactions: mbse-schemas, Object identity, Decided, 96). Run again, each writes
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

A writer's argument is a writer, a native value (a literal), or a term value read from a store, which is copied
(mbse-schemas copies a value given whole). `E.literal(value, domain)` and the conversions take a domain by name, or a
`Domains` value registered under one (below). Python's `Text.FromFunction(function)` gives a `Writer`, so it builds an
expression inside a transaction: `e.root(FromFunction(lambda this: this.age >= 18))`.

## Reading an expression

A term is read only through mbse-schemas' readers (`Readers.OfUnion`, `Readers.OfObject`, `Readers.OfAny`): a term's
kind is the branch it holds, its properties the branch's members. `Framework.Terms` gives the generic reads that
every evaluator, validator and translator shares, over any dialect's kinds:

| | |
|---|---|
| `Terms.term(x)` | the term value (a `Readers.OfUnion` of `Expressions.Framework.Term`) of an `Expression`, its `root` property's reader, a `Readers.OfAny` holding one, or a term value itself |
| `Terms.kind_of(term)` | the branch it holds, `(tag, record)`: `("call", <Readers.OfObject>)` |
| `Terms.form(term)` | its `Form`: `kind`, `attributes` (its scalar properties set, by name: `{"callable": "add"}`) and `arguments` (its terms, in order: the term properties in declaration order, its slots, then a container of terms' elements) |
| `Terms.name_of(term)`, `Terms.operator_of(term)` | the name a reference, binding or quantifier binds or refers to; an application's or quantifier's operator |
| `Terms.walk`, `Terms.fold`, `Terms.same` | as before, over term values: a term is a nested value, so there is no sharing and no cycle |

Which properties are slots, variadic arguments or attributes is read from the schema: a property whose schema is
`Expressions.Framework.Term` is a slot, one holding a container of terms the variadic arguments, any other an attribute.
`x + 1 > 0` reads:

```python
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

`Evaluators.OfLiteral`, `OfCall`, `OfVariable`, `OfLet` and `OfQuantifier` evaluate one kind, raising `TypeError` for a
term of another. Partial evaluation gives its residual as a `Writer`, written where the caller wants it:
`e.root(Partials.OfAny(term, {"x": 1}))`; a subterm it keeps is the term value read, copied when written.

## What a dialect module provides

| | Python | TypeScript |
|---|---|---|
| its install, adding its kinds to `Term` | `Expressions.install(txn)` | `Expressions.install(txn)` |
| its kinds: how the framework reads each branch it adds (a `Terms.Kind`: its role, the properties naming what it binds and its operator, its vocabulary, its required properties, its own checks) and its `Terms.Dialect` (name, kinds, a native's domain), with `validate` and `infer` | `Expressions.DIALECT` | `Expressions.DIALECT` |
| its writers, while they stay | `Expressions.Writer`, `variable`, `literal`, ... | the same |
| its evaluator | `Evaluators.OfAny(term, scope)`, `Evaluators.INTERPRETER` | the same |

A `Terms.Dialect` names its kinds by the branch tags it reads; the framework's (`literal`, `call`, `variable`, `let`)
are read by every dialect that uses them, and a dialect's own by it alone. `Dialect.make(form)` gives the `Writer` of a
form, so a translator builds the target term through the builders, and its caller writes it in a transaction.

## What goes

`Terms.Declared`, `Term`, `Builder`, `AnyBuilder`, `ValueProperty`, `Arguments` and `used_by`, `register`, the term
dataclasses (`OfLiteral.Data`, ...) and their `Spec`s and `resolve`, each kind's meta-schema `Schema`, a dialect's
`Builders` and `Schema`, `Domains.Schema`, `to_plain` and `from_plain` (a domain is named), and reads through
`Validators.properties_of`, `ListRecord`, `entries_of` (`Framework.Objects` reads data objects through `Readers`).
Basic's `operation` is the framework's `call`: its property `name` is `callable`.

## Settled while building, for the user's review

1. **A literal's `value` is a value of any schema** (`S.OfAny(lambda a: a)`, as Parametrics' `BindsValue` holds one),
   not the drafted `OfAny` of the five basic scalars: mbse-schemas writes a value of a restricted `OfAny` untagged and
   cannot read a `str`, a `bytes` or a NaN back (`$.literal.value: a value of any schema takes the plain form of one of
   its schemas, got str`), though the schema validates. Unrestricted, it is tagged, `{"int": 1}`, and round-trips.
   Basic's validation keeps a literal's value to a basic scalar. To be restored when mbse-schemas tags an ambiguous
   restricted value.
2. **A term's `domain` names a domain registered in Basic's `Domains`** (`Domains.register(name, domain)`) until stage 3
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
   them, and FRM's cases about them assert that a tree has none to find.

---

<!-- nav -->
[← Porting to the stabilized mbse-schemas](README.md) · [Home](../../../README.md)
