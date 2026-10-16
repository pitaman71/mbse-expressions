<!-- nav -->
[← Expressions](../../EXPRESSIONS.md) · [Home](../../../README.md)

# The framework and dialects as model (draft, for review)

The answer to the open question "The framework and dialects as model" (EXPRESSIONS.md), drafted for review before
any code, as decided. It follows mbse-schemas' [Schema extension](https://github.com/pitaman71/mbse-schemas/blob/main/docs/SCHEMA_EXTENSION.md),
whose Decided section records what moves here, and is written in mbse-schemas' builders (0.12.2): the framework and
each dialect extend mbse-schemas' framework once per process (`Builders.extend`), so every store holds their schemas.

| File | What it drafts |
|---|---|
| [Framework.py](Framework.py) | the framework's schemas: terms, functions, intrinsics, values, domains, and the meta-schemas extended |
| [Basic.py](Basic.py) | Basic: its values, its vocabulary (domains, functions, intrinsics), and `x + 1 > 0` built as data |
| [check.py](check.py) | runs both: 24 schemas valid; the expression built, valid, and a snapshot that round-trips |

## The model

- **Terms are reference objects** (decision 13), each kind an object schema: `Literal` (a `Value`), `Variable` (a
  name), `Call`, `Let`, `Map` and `Reduce` (quantifiers over containers, decision 13). Every relation between terms has
  two links and is named from both ends (decision 17): `Arguments` (a call's, with an `index`), `BoundValue`, `Body`,
  `Over` and `Initial`.
- **Functions are signatures** (decision 11): a `Function` is named, has `Formal`s, ordered, each typed by a schema
  (`FormalType`), and a result (`HasResult`); several functions may share a name, and a call binds to one by its name and
  its arguments' types. At level 0 (decision 15) a formal may be untyped: the intrinsics registered for it are its
  constraint. `Basic.add` is `add(a, b)`, untyped; `lt` and `not` give a `Schemas.OfBool`.
- **Intrinsics** are named reference objects implementing functions (`Implements`); the native code is registered at run
  time under the intrinsic's name, since no model holds code (decision 9).
- **Values**: a literal holds a `Value`, a value object each dialect extends with a property per scalar it has; Basic
  adds `AsIntValue`, `AsFloatValue`, `AsStrValue`, `AsBoolValue` and `AsBytesValue`, as you named them.
- **Domains and schemas**: `Domain` is a dialect's scalar domain, `HasDomain` links a scalar schema to it, and
  `HasSchema` links a term to the schema it has. Both are named from the schema's end too, so they extend the
  meta-schemas (`Schemas.OfScalar.Schema`'s `domain`; every type's `terms`, `formals` and `results`), as decision 17
  requires; a store's entries linking a framework schema (a domain of `Schemas.OfInt`) are its own (decision 19).

## For your review

1. **Kinds share a base by refinement, not a union.** Decision 3 keeps "Unions for kinds", but a union's values are
   value objects, and a term is a reference object; a link's types are its adjacencies'. So every kind refines `Term`,
   which declares once the relations any term stands in (`argument_of`, `body_of`, ...). One refinement, one parent.
   Is that acceptable for kinds, with unions kept for values?
2. **The vocabulary is data, installed in each store.** Basic's domains, functions and intrinsics are objects of the
   framework's schemas, which `Builders.extend` cannot make process-wide (it holds schemas, not data). So `install(store)`
   builds them in a store, and a snapshot writes them: 32 of the 41 mutations for `x + 1 > 0` are Basic's vocabulary.
   Alternatives: a store connection's handshake that assumes an installed vocabulary and does not write it; or
   framework data, held by every store as framework schemas are.
3. **Domains as objects, or as scalar schemas.** This follows the Decided section (`HasDomain(schema=Schemas.OfScalar.Schema,
   domain=Expressions.Framework.Domain)`). Your sketch of 14 October in `Framework/Terms.py` (uncommitted, in the
   `overhauls/meta-schemas` workspace) says instead "A dialect's Domains defines a vocabulary of (scalar) domains ... that
   refine Schemas.OfScalar": domains would then be schemas, framework-wide, with no vocabulary to install for them.
4. **Formals are objects.** `HasFormal(function, name, schema)` became `Function` →`HasFormal` (`index`)→ `Formal`
   (`name`) →`FormalType`→ schema, since a meta-schema's adjacency (the schema's `formals`) is to a relation of two links
   and no properties (decision 18).
5. **Variables refer by name**, bound or free (decision 10). A bound variable could link its binder instead, as P-015
   prefers for references; a free one has none to link.

## Not drafted yet

- Bindings (decision 6): `OfApply` and its arguments, and parameters that denote domains (decision 14), with how a
  domain carries a size (decision 4).
- Level 2 bounds on a type parameter (decision 15, planned).
- The other dialects, which refine `Term` with their kinds and extend `Value` and the vocabulary; and what `Map` and
  `Reduce` read (containers of scalars, decision 13).
- Evaluators, printers and parsers, through the visitor protocol (decision 9).

---

<!-- nav -->
[← Expressions](../../EXPRESSIONS.md) · [Home](../../../README.md)
