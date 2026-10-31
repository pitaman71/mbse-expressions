<!-- nav -->
[← FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md) · [Home](../../../README.md)

# Porting to the stabilized mbse-schemas (a proposal, for review)

mbse-schemas' store overhaul is done (0.25.0, step 4; 0.26.x since): "to stabilize mbse-schemas to allow schemas,
models, and code to be developed" (mbse-schemas, Store overhaul, Decided, 25). Its step 5 ports the dependents, this
repository first, the others depending on it (Decided, 26): "mbse-expressions refines `OfExpression` and
`OfConstraint`, evaluates what the executor refuses (87), and redrafts its framework model", "its schemas defined by its
own `install(txn)` (86; 4i), with domains, dialects and `DefinesDomains` as the user described". This proposes how,
and asks what only the user can decide. No code is written until it is decided.

## Where it stands

mbse-expressions 0.5.4 pins mbse-schemas 0.10.0, and against today's (0.26.2) it fails at import (`Terms.py` imports
`Bindings`, removed). What it uses that is gone or changed, in both languages:

- **Schemas built outside a store, at import**: each kind's meta-schema, `Expressions.Arguments`, each dialect's union
  (`Framework/Terms.py`), and the value domains' union (`Dialects/Basic/Domains.py`), through 0.10's builders and
  DSL. Today schemas are defined in a module-scope `install(txn)` and no reference object exists outside a store.
- **`Bindings`** (all of it: `Dialect.Builders`, `accept`, `State`), **`Schemas.Form`**, public `register`.
- **Reads**: `Validators.properties_of`, `ListRecord`, `entries_of` (every dialect's evaluator), `Comparison.OfNative`,
  `Schemas.OfNative`, `Visitors.Native` (now `OfScalar`, `Visitors.Scalar`). Data is read through `Readers` and
  `Visitors.OfStore` now.
- **The wire**: the corpus (9 cases) is in the pre-overhaul Reachable format; every file is regenerated.
- **Tests** (11 suites, 96 cases a language), **tutorials** (8, `toolkit.py` building schemas outside a store), the
  **skill** (its programs build schemas outside a store; SKL-02 runs them).

Its terms are bespoke dataclasses, its domain registry process-global, its vocabularies code: PRI-018 and PRI-019
(mbse-basis `docs/PRINCIPLES.md`) list this repository as not yet applied.

**Unmerged branches.** Three branches hold earlier work, not on `main`; as the user decided (2026-10-28):

- `framework-model` (9 commits, a draft of the framework and dialects as model, against mbse-schemas 0.13): "I think
  framework-model was abandoned". Set aside; nothing below rests on it.
- `overhauls/meta-schemas` (12 commits): this repository's half of mbse-schemas' meta-schemas overhaul, made beside it
  in one workspace; mbse-schemas' half was merged (0.11.0), this half was not ("mbse-expressions stopped until then").
  Its code adapts to 0.11's API, which mbse-schemas changed again through 0.26, so it is not taken. Its docs record the
  user's decisions, taken onto `main` in stage 1: terms implement the visitor protocol and are value objects ("2 = Y");
  expressions are built and read only through mbse-schemas; dialects as pure model, an open question under P-018.
- `scalars` (2 commits, docs only): "scalars you may analyze and reapply unless porting is much easier and
  risk-free". Reapplied by hand in stage 1, not cherry-picked: it cites mbse-schemas items that never landed (a
  palette, `OfName`, scalars as placeholders: an experimental scalars overhaul, deferred in the workspace's TODO.md), and
  mbse-schemas has since made the five basic scalars real and finer scalars domains here (Store overhaul, Decided, 8
  and 9). What it records of the user's is kept, in the user's words: "I generally dislike semantics of datatypes and
  operations leaking into the modeling language as currently built"; dialects hold the semantics of datatypes and
  operations, one for each language's built-ins and for interoperation types such as IEEE 754; "the attempt to invent
  a neutral type system was a mistake. we should model standards not invent them", so a neutral Basic "should be
  removed", its expression kinds and three-valued evaluation kept; translation across languages belongs to transforms.
  Removing Basic itself stays deferred, as the TODO.md has it (question 9).

What the user decided about domains is in mbse-schemas: Store overhaul, Decided, 8, 9 ("all scalars are domains and
users may define domains and dialects containing domains"; "a scalar schema can have > 1 domain"; "width is a property
of the domain, not the schema") and 22 (formats become domains); Schema extension, Decided, 9 to 13 and 21 in [FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md#decided), 14 in [CAP-112: parameters modeled as schema data](../../../../mbse-basis/docs/capabilities/CAP-112.md#decided).
`DefinesDomains` is named once, with no description (Store overhaul, step 5).

## Questions for the user

1. **Model first, or mechanical first.** (a) Model first: the framework and each dialect defined by installs, terms
   stored in the store, the 96 cases rewritten to it. (b) Mechanical first: today's dataclass terms kept as a runtime
   view over installed schemas, the model later. *Recommended: (a); (b) builds twice, and PRI-018 forbids the bespoke
   classes (b) keeps.*
2. **How terms are stored.** (a) One nested value, held by an expression, a reference object (its root). (b) Counted
   reference objects linked by relations. (c) Today's, a reference object per term with
   `Arguments`. *Recommended: (a), as Schema extension, Decided, 13 as revised ([FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md#decided)) and Object identity, Decided, 82 ([CAP-123: schema objects identified by path](../../../../mbse-basis/docs/capabilities/CAP-123.md#decided)) have it.*
3. **How `Schemas.OfExpression` gains its terms.** Schema kinds are closed (Object identity, Decided, 75 in [CAP-116: framework schemas extended, checked](../../../../mbse-basis/docs/capabilities/CAP-116.md#decided)), so by
   extension: (a) an extension adjacency from `Schemas.OfExpression` to the expression object holding the term (a
   relation of two links, as an extension's adjacency must be), as Parametrics links a definition to its parameters;
   (b) an extension property holding the term value. *Recommended: (a).*
4. **What `DefinesDomains` is.** Proposed: a dialect is a reference object (as a module is), defining its domains by
   name, `Expressions.Framework.Defines(dialect, name, domain)` (decided: see Decided, 4); a basic scalar has one domain or more through
   `HasDomain(schema, domain)` (Decided, 9); a domain is an object (Schema extension, Decided, 21 in [FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md#decided)). *Confirm or correct.*
5. **How mbse-schemas' executor evaluates.** mbse-schemas cannot depend on this repository, and "takes an evaluator from
   its caller rather than import one"; there is no global registry ([CAP-161: isolated stores, with no global registry](../../../../mbse-basis/docs/capabilities/CAP-161.md#an-evaluator-given-never-imported); [CAP-142: expressions evaluated in queries](../../../../mbse-basis/docs/capabilities/CAP-142.md)). (a) A protocol in mbse-schemas
   (`holds`, `assign`, `fold`), given to a store once (`Expressions.attach(store)`); the executor refuses as today where
   none is given. (b) Given per transaction (`store.transaction(..., evaluator=)`). *Recommended: (a).*
6. **What a `requires` that evaluates to unknown does** (three-valued logic): drop the frame, keep it, or refuse.
   *Recommended: drop; only a frame a constraint holds of passes.*
7. **How far variables go now.** (a) Determined values only (computed, or equal to an expression); (b) and finite domains
   (bool, enum); (c) constraint resolution (an open question here). *Recommended: (b), refusing the rest.*
8. **A collecting reduce.** Over variables only now, or symbols too. *Recommended: variables first.*
9. **Basic.** Removing it stays deferred (above); confirm it is kept through the port. *Recommended: keep it, the
   oracle the tests are written in.*
10. **Writers and `FromFunction`.** mbse-codegen-python uses the writers (`E.operation`, `E.Writer`). *Recommended:
    keep `FromFunction`; keep the writers until the dependents move.*
11. **Scope now.** All six dialects and the twelve translators, ported with the model; vocabularies as data (functions,
    formals, intrinsics: Schema extension, Decided, 9, 11, 22 in [FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md#decided)) and value parameters and `Parameters.Bind`/`Apply`
    (mbse-schemas' Parametrics) after. *Recommended as stated.*

## Decided

As the user decided (2026-10-28), on questions 1 to 5:

1. **Model first** ("yes"): the framework and each dialect defined by installs, terms stored in the store, the cases
   rewritten to it.
2. **Terms are one nested value**, held by an expression, a reference object, its root ("yes").
3. **`Schemas.OfExpression` gains its terms by an extension adjacency** ("yes"): a relation of two links from it to the
   expression holding the term.
4. **A dialect defines its domains by name**, through `Expressions.Framework.Defines(dialect, name, domain)`: "you don't
   need to repeat the parent scope in the name. mbse-expressions.Framework.Defines is not the same as
   mbse-schemas.Schemas.Defines". A relation is named within its module, as `Schemas.Defines` and `Parametrics.Defines`
   are, not with its parent's scope repeated (`DefinesDomains`, the plan's word, goes). A basic scalar has one domain or
   more through `HasDomain(schema, domain)`; a domain is an object.
5. **The executor's evaluator is a protocol in mbse-schemas, given to a store once**, "a fine intermediate solution for
   now": the executor refuses as today where none is given.

As the user decided (2026-10-28), on questions 9 to 11, "yes" to each recommendation:

9. **Basic is kept through the port**; removing it stays deferred.
10. **`FromFunction` is kept, and the writers**, until mbse-codegen-python moves off them.
11. **All six dialects and the twelve translators are ported with the model**; vocabularies as data and value
    parameters after.

As the user decided (2026-10-29), on what the `overhauls/meta-schemas` branch records beyond "2 = Y":

- **Terms are value objects**: "there was some back and forth but I have landed on terms as value objects". The
  branch's later "Terms are reference objects again" is superseded; question 2 stands.
- **Writers, and the builders' `set`, `argument` and `arguments`, go** ("Expressions under P-018": they "should go
  away"), "as a later phase of the current overhaul": after the dependents move off them (question 10).
- **The term kinds are the starting point**: "term kinds - remains a good starting point. you are welcome to propose
  refinements/adjustments": `Term`, a union of its kinds (`Call`, `Literal`, `Let`, ...), `Callable`, a reference
  object, and `HasArguments`, relating a `Callable` to its parameters; an expression the only instance.
- **A dialect extends the framework by schema extension**, not by refinement: "refinement has been superseded by schema
  extension" (mbse-schemas' SCHEMA_EXTENSION.md), so the branch's "each dialect refines it by intersection" goes.

As the user decided (2026-10-30), on what stage 2b raised:

- **A dialect reuses the framework's kinds wherever the shape matches** ("yes"): `literal`, `variable`, `let` and `call`
  (`callable` by name, positional `arguments`), defining a kind of its own, `<dialect>_<kind>`, only where its shape
  differs (a C constant typed by C's type; Python's call, whose callee is a term).
- **A term's domain is a registered name until stage 3** ("yes"), translators' conversions registering the domains they
  hand back included (API.md, "Settled while building", 13).

Question 6, what a `requires` that evaluates to unknown does: "semantics of evaluate deserve a more in-depth
discussion", open.

As the user decided (2026-10-28), on question 7, a map's variables (the "spread" case, [CAP-142: expressions evaluated in queries](../../../../mbse-basis/docs/capabilities/CAP-142.md#the-spread-case-of-a-map)):

7. **A variable over a finite domain is in the plan**: "(b) is in the plan": each frame fans out into one frame per
   value the domain holds and its pattern's `requires` allows (bool, an enum). **A variable computed from the frame**,
   one value per frame: "(a) is not in the plan". **Solving for a variable's values** (a constraint over an unbounded
   domain): "(c) can be deferred".

Question 8, a collecting reduce, is parked with map and reduce themselves: "map and reduce are not where I need them
to be, but parking them so we can make progress on finishing the current overhaul in the dependent repos is more
urgent" (2026-10-29; the workspace's TODO.md). Stage 5's variables and collecting reduce wait on it, and its `requires`
on question 6; stages 1 to 4 do not.

As the user decided (2026-10-30), on what stage 2b raised about `Python.Text.FromFunction` (it refused a captured
`Expression`; tutorial 3 read the expression's root with `Terms.term` instead, and question 4 asked whether
`FromFunction` should read it):

- **No free references.** "I had not envisioned that Expressions.FromFunction would support free references at all.
  Now I see it as an undesired complication." Question 4 is withdrawn: `FromFunction` stops reading names from the
  function's closure and globals (native values, writers, term values, which it has done since before the port).
- **Parameters, each a schema parameter.** "FromFunction should introspect the parameters of the function being
  passed. There is no 'this' convention. And generate a schema parameter for each argument": through mbse-schemas'
  Parametrics, the `Schemas.OfExpression` it defines has one `Parametrics.OfParameters`, a parameter for each
  argument. The kinds of parameter, as the user put them: "A parameter can represent: a schema, an object, a value. A
  schema parameter is bound to a schema. An object parameter is bound to an object. A value parameter is bound to a
  value." Asked whether each argument is an object or value parameter of the schema it is declared with (a), or also
  gets a schema parameter for its type, the expression generic in it (b), the user answered "(b)". mbse-schemas'
  Parametrics has value and object parameters only (`ForValue`/`BindsValue`, `ForObject`/`BindsObject`); schema
  parameters are added there first.
- **No `this`.** "I don't even want the tutorials introducing 'this' as a convention": tutorials, skill, tests and
  README name each parameter for what it holds.

Then, shown what schema parameters for it would take (Parametrics has none yet), the user decided: **`FromFunction`
is removed.** "Honestly FromExpression is not that important. Let's just remove that capability entirely" (meaning
`FromFunction`). Expressions are written with the writers. What follows was open when it was removed, and is moot:

Open, proposed to the user: (1) and (2), where an argument's schema comes from and whether it is an object or a value
parameter, are superseded by (b): its schema is a schema parameter, bound later; (3) `FromFunction` writes a definition in a
transaction and gives the `Schemas.OfExpression`, evaluation and use within another expression binding by parameter
name (proposed); and how the parameters relate to `OfExpression`'s `pattern`, which stage 4 settles with them. Python's
builtins (`len`, `max`, `all`, ...) stay read by name, as the Python dialect's vocabulary rather than free references
(proposed). The user's three kinds of parameter (schema, object, value) stand for Parametrics: schema parameters are still
missing there (CAP-112, "Schema parameters now or later"), now with no user in this repository.

## Stage 2's model, drafted for review

[Framework.py](Framework.py) and [Basic.py](Basic.py) draft the installs; [check.py](check.py) runs them against
mbse-schemas 0.26 (installs valid, run again writing nothing, `x + 1 > 0` built through the builders and written
nested, a snapshot round-tripping). What they propose, for the user's review:

- `Expressions.Framework.Term`, a union of value object kinds, `literal` (`value`, a basic scalar's), `call`
  (`callable`, by name; `arguments`, a container of terms by index), `variable` (`name`) and `let` (`name`, `value`,
  `body`): the term kinds as the starting point, `operation` named `call`. A term holds terms, nested. Every kind
  declares `domain`, by name ("wait, all terms have a domain"; Schema extension, Decided, 21 in [FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md#decided)), a dialect's kinds too.
- `Expressions.Framework.Expression`, a reference object whose `root` is a term: the only instance of the kinds.
- `Expressions.Framework.HasRoot(schema, expression)`, one expression per schema, and the extension adjacency
  `expression` it gives `Schemas.OfExpression` (question 3), with no member on it.
- A dialect adds its kinds to `Term` by schema extension: Basic its `quantifier` (`name`, `quantifier`, `collection`,
  `body`, `domain`); each other dialect its own (Python's, C's, ...).
- A term names what it refers to, a callable or a domain, by name, until vocabularies are data (question 11).

## Stage 3's model, drafted for review

### Decided, for stage 3

As the user decided (2026-10-30), reviewing a first draft that made domains objects a term named:

1. **A term carries no domain.** "Terms do not designate their schema. Whatever reference object owns the root term
   must specify its schema." Every kind loses `domain`, the framework's and each dialect's. This supersedes "wait, all
   terms have a domain" (2026-10-28) and Schema extension, Decided, 21's "A term has a domain".
2. **No type inference yet.** "For the time being, evaluation will need to do without an external source specifying
   the domain for every term, as that involves building a type inference system which should be a follow-up
   capability." What needs a term's domain is deferred with it ("(iii) agreed, defer for type inference"): widths,
   overflow, IEEE 754 formats other than binary64, enums, `convert`, `reinterpret`, `pack`, `unpack`, and the
   translators' conversions of typed literals; tutorial 4, the corpus's `domains` case and DOM's width cases go until
   then.
3. **Terms hold values.** "terms are not restricted to scalars. Terms can have any value (Schemas.OfAny)"; then "yes
   restrict `literal` to scalars, but also provide container constructors as terms". A `literal` stays an `OfAny` of
   the five basic scalars; new kinds construct containers from terms.
4. **Expressions deal in values.** "CORRECTION: 'expressions only deal in scalars' -> 'expressions only deal in
   values'" (Schema extension, Decided, 13).
5. **Every domain a schema.** "(i) can we make every domain a schema too?" (asked; proposed below, A).
6. **Dialects model their operations.** "(ii) dialects also define operation models which arguments as
   Schemas.OfVariable and return value as Schemas.OfAny" (proposed below, B).

As the user decided (2026-10-30) on the proposals below: A, "you can choose to keep the schema and domain separate
and track them through a relation with unique, or use schema extension"; B and C, "okay for now". Chosen for A: both
kept separate and related, since an extension adds only an adjacency to a relation of two links and no properties
(mbse-schemas), so a domain's parameters need an object of their own either way. The domain's schema is a named
`Schemas.OfAny` restricted to its scalar, defined in its dialect's module (`Expressions.Basic.uint8`); the domain is an
`Expressions.Framework.Domain`, a reference object holding its `kind`; `Expressions.Framework.HasDomain(schema,
domain)`, unique both ways, relates them, and an extension adjacency `domain` on `Schemas.OfAny` reads it from the
schema. A's text below, "attached by extension", is superseded by this. B's open point (arguments by position or by
name) is settled while building by what mbse-schemas keeps of a pattern's variables' order, and recorded.

### Proposed, for the user's review

- **A. A domain is a schema.** Schema kinds are closed (Object identity, Decided, 75) and the scalars are exactly five
  (Store overhaul, Decided, 8), so a domain cannot be a new kind or a sixth scalar. Proposed: a domain is a named
  `Schemas.OfAny` restricted to the scalar it narrows (`uint8`, an `OfAny` of `Schemas.OfInt`), its parameters
  (`integer`: `width`, `signed`, `overflow`; `ieee754`: `format`, `rounding`; ...) attached by extension, as
  Parametrics extends every kind. It is then a schema wherever a schema goes: a property's, a container's element, an
  expression's `result` (decision 1's "must specify its schema"), and its values are written as its scalar's, bare.
  `HasDomain(schema, domain)` is then the restriction itself (`Schemas.AnyOf`), and goes. A dialect defines its domains
  in its own module (`Expressions.Basic.uint8`), as any schema is defined, through `Schemas.Defines`; so a dialect is
  a module, and `Expressions.Framework.Defines` (Decided, 4) is needed only for what a module does not define
  (operations, B). What a domain's parameters mean stays code, deferred with type inference (2).
- **B. An operation model is an expression schema.** mbse-schemas already has the shape: a `Schemas.OfExpression` has a
  `pattern`, whose variables (`Schemas.OfVariable`, each a name and a schema) are free in it, and a `result`, an
  `OfAny`. Proposed: a dialect's operation (`add`, `count`, Python's `len`) is a `Schemas.OfExpression` its dialect
  defines by name, through `Expressions.Framework.Defines(dialect, name, operation)`; its arguments are its pattern's
  variables, its return its `result`. A `call` names its operation (`callable`) and gives its arguments in the order
  the operation's variables are declared. Open: whether variables keep their declared order (mbse-schemas keys a
  pattern's variables by name), else arguments are given by name; and overloads (several operations of one name,
  Schema extension, Decided, 11), proposed later, with type inference.
- **C. Container constructors.** Two framework kinds, every dialect's, as `literal` is: `list` (`elements`, a container
  of terms by int index) and `mapping` (`entries`, a container of `key` and `value` terms by int index). Proposed as
  the containers Basic's collection operations already read (`count`, `item`, `in`, the quantifiers).

What changes, in both languages: every kind's schema (no `domain`), the framework's install (`list`, `mapping`;
`Defines`), each dialect's install (its module's domains, its operations), Basic's `Domains` (the registry goes; the
kinds' code stays, unused until type inference), the writers (no `domain` argument), the evaluators (values by their
schemas), the translators (their conversions of typed literals deferred), the corpus (every term's file), tutorial 4
(deferred), the skill, and EXP, DOM, COL, TRN. A breaking change: released as 0.7.0, with `FromFunction`'s removal.

### As built (stage 3)

- Terms carry no domain: `domain` is gone from every kind, the writers and the checks; values are taken by the schemas
  they are written with (ints unbounded, floats binary64). API.md, Settled while building, 24, 25.
- Container constructors `list` and `mapping` (of `Expressions.Framework.Pair`s), evaluated, inferred, and translated
  to Python's displays, MATLAB's `[a, b]` and Excel's `VSTACK`, refused by Latex, Ccpp and SystemVerilog. 23.
- Dialects, domains and operations as data: each dialect a singleton of its own schema, a branch of the kind union
  `Expressions.Framework.Dialect` (one singleton per schema in mbse-schemas); `Defines(dialect, name, domain)` owning
  domains; `Operates(dialect, name, operation)` naming operations, each an `Expressions.Basic.<name>`
  `Schemas.OfExpression`; `HasDomain(schema, domain)` unique both ways, with `Schemas.OfAny`'s adjacency `domain`;
  `Expressions.Basic.Packs` for a packed domain. 16 to 20, and 26 (the mbse-schemas limitation worked around).
- Arguments are positional: mbse-schemas keeps a pattern's variables in declared order, through a snapshot. 21.
- A call to an operation Basic does not define is refused by validation. 22.
- Deferred with type inference: widths, overflow, IEEE 754 formats other than binary64, enums, `convert`,
  `reinterpret`, `pack`, `unpack`, typed values, the translators' conversions of typed literals, tutorial 4; DOM-04,
  DOM-13 to DOM-16 retired. The corpus's `domains` case is Basic's dialect, one document. 27.
- Other dialects' operations as data, and overloads: follow-ups. 28.

## Stages (proposed, once decided)

Stage 1 is done; stage 2 is split in two: 2a, the framework and Basic as installs, terms in the store, with the API
settled in [API.md](API.md); 2b, the other dialects and the translators on it. 2a pins mbse-schemas 0.26.3, which
writes a restricted `OfAny`'s value unambiguously, so a literal's `value` is the drafted `OfAny` of the five basic
scalars (API.md, Settled while building, 1).

Each with both gates at 100% and the corpora regenerated; a stage touching mbse-schemas is made in a workspace
(`polyrepo.py workspace <dir> --edit mbse-schemas`).

1. **The decisions on `main`**: this proposal decided; `overhauls/meta-schemas`' decisions and `scalars`' recorded in
   EXPRESSIONS.md, as above (since drained into mbse-basis
   [FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md) and its capabilities).
2. **Schemas as installs, terms in the store** (with reads through `Readers`, since `Terms.py` fails at import until
   both are done): `Expressions.install` and each dialect's; `Bindings` gone; tests and corpora moved.
3. **Domains**: `HasDomain`, `Expressions.Framework.Defines`, domains as objects; dialect-scoped names in place of the global registry.
4. **`OfExpression` and `OfConstraint` refined** (question 3).
5. **Evaluation in transactions** (mbse-schemas and here): the evaluator protocol, `requires` of a pattern and a
   branch (a partition routing each frame), then variables and a collecting reduce (questions 5 to 8).
6. **Tutorials, skill, README, EQUIVALENCE; release** (0.6.0). Then mbse-programs, mbse-patterns (re-scoped) and
   mbse-codegen-python.

**0.6.0 is released after stage 2**, not after stage 6: asked whether to release before or after stages 3 and 4, the
user answered "yes release now" (2026-10-29), so the dependents port against the stabilized mbse-schemas sooner.
Stage 2 brought the tutorials, skill, README and EQUIVALENCE along (stage 2b), so stage 6 is that release; stage 3
changes how a term names its domain, on the wire too, and is released as 0.7.0. Stage 4's question 3 was built in
stage 2 (`HasRoot` and the adjacency `expression`); what remains of it (an expression's free variables against its
pattern, its root's domain against its result) is to be scoped with stage 3 or 5.

## Risks

- **Cost**: every expression is written within a transaction, in a store that takes about 23 ms to make; suites and
  `FromFunction` that build many expressions need care.
- **The commit-time rule** (Object identity, Decided, 96 in [CAP-124: writes all-or-nothing in transactions](../../../../mbse-basis/docs/capabilities/CAP-124.md#decided), kept by the store overhaul's Decided, 32): an install and the expressions using it are
  separate transactions.
- **No reference between stores**: a constraint and the data it is evaluated over share a store.
- **Extension limits**: an extension's adjacency is to a relation of two links and no properties.
- **Equivalence**: byte-identical JSON in both languages, and the TypeScript model of Python's rules (DIA-02).
- **Stale text in mbse-schemas** to correct with the port: its skill's `queries.md` promises step 5 ("No expressions
  yet"). FRAMEWORK.md's "ordinary objects with registered meta-schemas" did not survive its drain into mbse-basis.

---

<!-- nav -->
[← FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md) · [Home](../../../README.md)
