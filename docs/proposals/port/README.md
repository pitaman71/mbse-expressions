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
