# Expressions

Serializable expressions for [mbse-schemas](https://github.com/pitaman71/mbse-schemas): the predicates that choose a
union's branch and, later, constraints such as "at least one phone". This package depends on mbse-schemas (a submodule
at `submodules/mbse-schemas`), whose [`FRAMEWORK.md`](../submodules/mbse-schemas/docs/FRAMEWORK.md) describes the
framework; this document covers expressions only.

Expressions come in dialects: expression languages that implement one framework, so that each is serializable,
structurally traversable, validatable, evaluatable, and translatable into the others. The Basic dialect is the core
vocabulary below, in which mbse-schemas' union predicates are written; `from mbse.Expressions import Expressions,
Evaluators` imports it. The Numpy, Matlab and Excel dialects model those languages' expressions (see
[Dialects](#dialects)); the framework is described under [The framework](#the-framework), and translation under
[Translators](#translators). They are built in Python only so far.

```
python3/mbse/Expressions/
  Framework/     Expressions, Domains, Evaluators, Translators: the protocols, and the machinery that implements them
  Dialects/      Basic, Numpy, Matlab, Excel: each with Expressions, Domains and Evaluators
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

## The framework

`mbse.Expressions.Framework` defines what every dialect implements, and implements most of it from declarations.

- `Expressions.Expression` is an expression of some dialect: `Visitable`, plus `dialect()`, `form()` and
  `validate()`. A `Form` is a node's structure: its `kind`, its native `attributes` and its ordered `arguments`.
  `Dialect.make(form)` is the inverse, and `walk`, `fold` (bottom-up, once per node, raising on cycles) and `same`
  (structural equality by co-traversal: natives of one type by value, NaN is NaN, -0.0 is not 0.0) work on any
  dialect through forms alone.
- `Expressions.Dialect` is an expression language: `name()`, `kinds()`, `schema_of(expression)`, `make`, `resolve`
  (specs: expressions, `Term`s, native values as literals, or callables taking the `AnyBuilder`), `validate`,
  `infer`, the union meta-schema `Schema` and the registry `Builders`.
- `Expressions.Declared` derives a dialect from its kinds: each is a dataclass derived from `Node` whose class
  variables give its `KIND` (the tag), its `ROLE`, a literal's `VALUE` natives, its native `PROPERTIES`, its
  arguments (`SLOTS`, fields of one argument each, or `VARIADIC`, one field holding them all) and, for an application,
  the property naming its `OPERATOR` and its `VOCABULARY` (operator names to signatures; `None` accepts any name, with
  `SIGNATURE`). From these it derives builders (`create()` / `clone()` / `update()`, `Visitors.OfObject`, and the DSL
  `.set(name, value)`, `.arguments(*specs)`, `.argument(slot, spec)`), meta-schemas registered as
  `Expressions.<Dialect>.Of<Kind>` (Basic keeps its names), the union discriminated by Basic's
  `eq(get(this, 'kind'), tag)`, the registry, validation and inference. Every dialect shares the relation
  `Expressions.Arguments`.
- The roles are what validation, inference, evaluation and translation understand without knowing the dialect:
  `literal` (a native value), `reference` (the value bound to a name), `application` (an operator applied to
  arguments) and `binding` (binds a name to its first argument within the others). `validate` reports what the Basic
  section below lists, with the same messages in every dialect ("a field needs a value", "identifier 'x' is not
  bound", "'**' is not a core operation"), where `core` means the dialect's vocabulary.
- `Domains` defines `Domain` (`contains(value)`, `includes(domain)`) and `Signature` (`arity()`, `result(domains)`,
  `describe()`), with generic implementations: `OfTypes`, `OfValues`, `OfUnion`, `Anything`, `Function`, `Same` (one
  of several domains, the same for every argument) and `Overloaded` (the first signature whose parameters include
  the arguments', or else the union of the results of those that may apply). Each dialect's `Domains` module
  declares its value domains and its vocabulary's signatures. `Dialect.infer(expression, environment)` gives an
  expression's domain from them, raising `TypeError` for an operator that cannot take its arguments' domains:
  `add cannot take (int, float); it takes (T, T) -> T for T in int | float`. Inference is permissive: `Anything`, the
  domain of a value not known statically, is accepted wherever a domain is expected, and extensions give `Anything`.
- `Evaluators` defines `Evaluator` (`(expression, scope) -> value`) and `Predicate` (mbse-schemas' `(predicate,
  value) -> bool | None`), and `Interpreter`, which evaluates by role and calls an implementation per operator with
  one thunk per argument, so each dialect decides what to evaluate and when. It raises what `validate` reports.

## Dialects

| Dialect | Kinds | Values | Evaluation |
|---|---|---|---|
| Basic | `literal`, `operation`, `variable`, `let` | natives, objects | three-valued (Kleene), no coercion; absent is unknown |
| Numpy | `constant`, `name`, `call` (numpy functions: `greater_equal`, `logical_and`, `where`, `ma.getmaskarray`, ...), `subscript` (`x['age']`) | arrays and scalars by dtype kind, records | numpy's: vectorized, eager, promoting; absent properties are masked |
| Matlab | `constant`, `identifier`, `binary` (`==` ... `&&`, `\|\|`, `+`, `-`, `.*`), `unary` (`~`, `-`), `call` (`isfield`), `field` (`s.age`) | double, logical, string, struct | MATLAB's: two-valued with short-circuit, logicals and doubles convert, `+` concatenates strings; absent fields raise |
| Excel | `constant`, `name`, `let` (`LET`), `function` (`AND`, `OR`, `NOT`, `IF`, `ISERROR`), `infix` (`=`, `<>`, `<` ... `+`, `-`, `*`), `prefix` (`-`), `field` (`r.age`) | number, text, logical, error, record | Excel's: errors are values (`#FIELD!`, `#NAME?`, `#VALUE!`) that propagate; `AND`/`OR` evaluate every argument, `IF` one branch; arithmetic coerces; comparisons order numbers < text < logicals and ignore case |

Numpy, Matlab and Excel each have `render(expression)`, their source text (`np.greater_equal(this['age'], 18)`,
`this.age >= 18 && isfield(this, "email")`, `=AND(this.age >= 18, NOT(ISERROR(this.email)))`), and constructors for
their kinds (`Excel.Expressions.function('AND', a, b)`, ...). Numpy's evaluator needs numpy (the `numpy` extra);
nothing else does. The Matlab and Excel evaluators are Python models of those languages' rules for scalars, not
calls into MATLAB or Excel.

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
  for its name: Numpy and Matlab have no let.

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
is unknown in Basic, masked in Numpy, `#FIELD!` in Excel and an error in MATLAB, and `1 == 1.0` is unknown in Basic
but true in the others.

## Open questions

- Core expression vocabulary above is a proposal; confirm the exact set, and specify the collection operations
  (`count`, `in`, `all`, `any`).
- The dialects and the framework are built in Python only; the TypeScript implementation still has Basic alone (its
  wire format is unchanged, so the two remain interchangeable).
- Numpy, Matlab and Excel expressions are written as data or through constructors and rendered as source text; they
  are not parsed from source text yet.
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
- mbse-schemas takes an evaluator `(predicate, value) -> bool | None` from its caller; `Evaluators.predicate` is one,
  binding the value tested to `this`.
- Evaluation is three-valued (Kleene), never coerces, and reads properties with `get(object, name)`; variables are
  bound by `OfLet` or by the caller's scope. `Term`s write expressions with methods only (no operator overloading), so
  both bindings read the same.
