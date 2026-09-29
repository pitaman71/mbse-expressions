# Expressions

Serializable expressions for [mbse-schemas](https://github.com/pitaman71/mbse-schemas): the predicates that choose a
union's branch and, later, constraints such as "at least one phone". This package depends on mbse-schemas (a submodule
at `submodules/mbse-schemas`), whose [`FRAMEWORK.md`](../submodules/mbse-schemas/docs/FRAMEWORK.md) describes the
framework; this document covers expressions only.

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

Union discriminator predicates must use only the core vocabulary. Operation names outside it are extensions that a
binding may or may not support. A union is discriminated by a tag property compared with a fixed value, e.g.
`eq(get(this, 'kind'), 'cat')`, where `this` is the value tested.

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

`Evaluators.predicate(predicate, value)` evaluates a union branch's predicate with `this` bound to the value tested,
and returns `True`, `False` or unknown (`None`); a predicate whose value is not a bool raises. It is the evaluator
mbse-schemas' validators take: `Validators.Validate(registry, Evaluators.predicate)` checks that each union value is
written as the first branch whose predicate holds. Deserializers need no evaluator, because union values carry their
branch on the wire.

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

## Open questions

- Core expression vocabulary above is a proposal; confirm the exact set, and specify the collection operations
  (`count`, `in`, `all`, `any`).

## Resolved

- Expressions are `Expressions.OfAny`, `OfLiteral`, `OfOperation`, `OfVariable` and `OfLet`, each with `Data`,
  `Builder`, `Spec` and a meta-schema `Schema` that is an ordinary registered object schema tagged by `kind`. Arguments
  are an ordered relation (`index`, `unique(argument)`); a literal's schema has one property per native type.
- There is no `is` operation: unions discriminate by a tag property compared with a fixed value.
- `Expressions.from_` (Python only) reads an expression from a function's source with `ast`.
- Evaluation is its own module, `Evaluators`, with one entry point per expression kind (`Evaluators.OfAny`, ...).
- mbse-schemas takes an evaluator `(predicate, value) -> bool | None` from its caller; `Evaluators.predicate` is one,
  binding the value tested to `this`.
- Evaluation is three-valued (Kleene), never coerces, and reads properties with `get(object, name)`; variables are
  bound by `OfLet` or by the caller's scope. `Term`s write expressions with methods only (no operator overloading), so
  both bindings read the same.
