<!-- nav -->
[← Expressions](../../EXPRESSIONS.md) · [Home](../../../README.md)

# The framework and dialects as model (draft, for review)

The answer to the open question "The framework and dialects as model" (EXPRESSIONS.md), drafted for review before
any code, as decided. It follows mbse-schemas' [Schema extension](https://github.com/pitaman71/mbse-schemas/blob/main/docs/SCHEMA_EXTENSION.md),
whose Decided section records what moves here, and is written in mbse-schemas' builders (0.12.2): the framework and
each dialect extend mbse-schemas' framework once per process (`Builders.extend`), so every store holds their schemas.

| File | What it drafts |
|---|---|
| [Framework.py](Framework.py) | the framework's schemas: terms and expressions, functions, intrinsics, values, domains, and the meta-schemas extended |
| [Bindings.py](Bindings.py) | parameters, bindings and sizes: what moves here from mbse-schemas (decisions 4, 6 and 14) |
| [Basic.py](Basic.py) | Basic: its values, its vocabulary (domains, functions, intrinsics; `int`'s `width`), `x + 1 > 0`, and sized and bound schemas |
| [check.py](check.py) | runs them: 26 schemas valid; the expression built and valid, one definition, its domain reached through its root, each instantiation's bindings, and a snapshot that round-trips |

## The model

- **Terms are values; an expression is a reference object holding one, its root** (decision 13, as revised). `Root` is
  the one object other packages link: `HasSchema` annotates it, never a subterm, and mbse-patterns' `requires` will link
  it. Its `term` is a value of `Term`, the union of the kinds (decision 3): `literal` (a `Value`), `variable` (a name),
  `call` (a function's name and a list of terms), `let`, and `map` and `reduce` over containers (decision 13). `Term`
  holds itself, through a kind's terms. `x + 1 > 0` is one mutation in a snapshot:

  ```json
  {"term": {"call": {"function": "lt", "arguments": [{"literal": {"value": {"AsIntValue": 0}}},
    {"call": {"function": "add", "arguments": [{"variable": {"name": "x"}}, {"literal": {"value": {"AsIntValue": 1}}}]}}]}}}
  ```
- **A call names its function** ("call terms may name their function"), and binding resolves the name and the
  arguments' types against the vocabulary (decision 11). Variables are names, bound by an enclosing binder or free
  where the dialect permits (decision 10).
- **Functions are signatures** (decision 11): a `Function` is named, has `Formal`s, ordered, each typed by a schema
  (`FormalType`), and a result (`HasResult`); several functions may share a name. At level 0 (decision 15) a formal may
  be untyped: the intrinsics registered for it are its constraint. `Basic.add` is `add(a, b)`, untyped; `lt` and `not`
  give a `Schemas.OfBool`.
- **Intrinsics** are named reference objects implementing functions (`Implements`); the native code is registered at run
  time under the intrinsic's name, since no model holds code (decision 9).
- **Values**: a literal holds a `Value`, a value object each dialect extends with a property per scalar it has; Basic
  adds `AsIntValue`, `AsFloatValue`, `AsStrValue`, `AsBoolValue` and `AsBytesValue`, as you named them.
- **Domains, in two steps** (decision 21): a root has a schema (`HasSchema`), and a scalar schema a domain
  (`HasDomain`), a `Domain` being a dialect's scalar domain, an object. `x + 1 > 0`'s root has `Schemas.OfBool`, whose
  domain in Basic is `bool`. Both relations are named from the schema's end too (decision 17), so they extend the
  meta-schemas (`Schemas.OfScalar.Schema`'s `domain`; every type's `roots`, `formals` and `results`); a store's entries
  linking a framework schema (a domain of `Schemas.OfInt`) are its own (decision 19).

## Parameters, bindings and sizes

What moves here from mbse-schemas: its value parameters (decision 14), its applications and their arguments (decision 6),
and the sizes of its scalars (decision 4). mbse-schemas keeps the parameters that denote schemas (`List[T]`).

- **A schema or a domain declares value parameters** (`value_parameters`, through `HasParameter`), each a `Parameter`,
  named, ranging over a domain (`Ranges`).
- **An instantiation binds them**, each `Binding` linking a parameter and its value, an expression's root, whose term may
  name the parameters in scope. An instantiation is a refinement, a named one (`Square` refines `Matrix`, binding
  `rows = n, cols = n`), or a use (the property `Board.grid`, typed `Matrix`, binding `rows = 8` and leaving `cols`
  unbound), through `HasBinding`: every type and every typed member (property, branch, part) has `bindings`.
- **A size is a binding of a domain's parameter.** Basic's `int` declares `width`; `Int32` has the domain `int` and binds
  `width = 32`, and `Word` declares `w` and binds `width = w`. A scalar without a domain is plain data, sized by its
  token's default (decision 4), so codegen reads it without mbse-expressions.

For your review:

1. **Refinement replaces `OfApply`.** An application was a kind of schema, so a property could be typed by one; an
   object of mbse-expressions cannot type a property. So a named application becomes a refinement that binds its
   parameters, and an anonymous one a use that binds them. Step 2 then removes `OfApply`, its arguments and
   `ArgumentTerm` from mbse-schemas, rather than moving them.
2. **The member is `value_parameters`**, since `parameters` is mbse-schemas' own, for the parameters that denote schemas.
3. **A binding's value is a root of its own**: each binding is two reference objects and their entries, so bindings
   weigh in a snapshot (94 mutations for these examples and `x + 1 > 0`, with Basic's vocabulary).

## Decided in review

- The vocabulary (decision 20): a store connection's handshake names the dialects both sides install, and a snapshot
  writes their vocabulary only where the handshake fails. Until the handshake exists, a snapshot writes it: 32 of the
  34 mutations of `x + 1 > 0`.
- Domains are reached in two steps, through the root (decision 21), and stay objects.
- Formals are objects (decision 22), a compromise with the limit on a meta-schema's adjacencies (decision 18).
- Reading a function into an expression: "the name be `Expressions.FromFunction`", a function of the package
  (`Expressions.FromFunction(store, lambda x: x + 1 > 0)`), since `store.Expressions.FromFunction` would be a path to a
  schema of that name. In Python, "keep the AST reader as primary": the function's source, read through `ast`, as the
  Python dialect's `Text.FromFunction` does today, so that everything Python writes is read, not only what dunder
  methods can trace. TypeScript cannot trace operators (JavaScript converts an operand to a primitive before applying
  an operator), so it reads the function's source too, `Function.prototype.toString()`, as JavaScript expression text
  (proposed; to list in EQUIVALENCE.md). Still open: whether the result is in the Python dialect, translated to Basic
  as a separate step, and whether the lambda's parameters (`x`) become the expression's own parameters or stay free
  variables the caller's scope binds (decision 10).

## Not drafted yet

- The handshake (decision 20), on a store connection, in mbse-schemas: which dialects each side installs, and
  the vocabulary's mutations left out of a snapshot when they agree.
- Level 2 bounds on a type parameter (decision 15, planned).
- The other dialects, which add their kinds to `Term` (a union extended by its branches) and extend `Value` and the
  vocabulary; and what `map` and `reduce` read (containers of scalars, decision 13).
- Evaluators, printers and parsers, through the visitor protocol (decision 9).

---

<!-- nav -->
[← Expressions](../../EXPRESSIONS.md) · [Home](../../../README.md)
