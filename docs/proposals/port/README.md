<!-- nav -->
[← Expressions](../../EXPRESSIONS.md) · [Home](../../../README.md)

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
of the domain, not the schema") and 22 (formats become domains); Schema extension, Decided, 9 to 14 and 21.
`DefinesDomains` is named once, with no description (Store overhaul, step 5).

## Questions for the user

1. **Model first, or mechanical first.** (a) Model first: the framework and each dialect defined by installs, terms
   stored in the store, the 96 cases rewritten to it. (b) Mechanical first: today's dataclass terms kept as a runtime
   view over installed schemas, the model later. *Recommended: (a); (b) builds twice, and PRI-018 forbids the bespoke
   classes (b) keeps.*
2. **How terms are stored.** (a) One nested value, held by an expression, a reference object (its root). (b) Counted
   reference objects linked by relations. (c) Today's, a reference object per term with
   `Arguments`. *Recommended: (a), as Schema extension, Decided, 13 as revised and Object identity, Decided, 82 have it.*
3. **How `Schemas.OfExpression` gains its terms.** Schema kinds are closed (Object identity, Decided, 75), so by
   extension: (a) an extension adjacency from `Schemas.OfExpression` to the expression object holding the term (a
   relation of two links, as an extension's adjacency must be), as Parametrics links a definition to its parameters;
   (b) an extension property holding the term value. *Recommended: (a).*
4. **What `DefinesDomains` is.** Proposed: a dialect is a reference object (as a module is), defining its domains by
   name, `Expressions.Framework.Defines(dialect, name, domain)` (decided: see Decided, 4); a basic scalar has one domain or more through
   `HasDomain(schema, domain)` (Decided, 9); a domain is an object (Schema extension, Decided, 21). *Confirm or correct.*
5. **How mbse-schemas' executor evaluates.** mbse-schemas cannot depend on this repository, and "takes an evaluator from
   its caller rather than import one"; there is no global registry (its FRAMEWORK.md). (a) A protocol in mbse-schemas
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
    formals, intrinsics: Schema extension, Decided, 9, 11, 22) and value parameters and `Parameters.Bind`/`Apply`
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

## Stages (proposed, once decided)

Each with both gates at 100% and the corpora regenerated; a stage touching mbse-schemas is made in a workspace
(`polyrepo.py workspace <dir> --edit mbse-schemas`).

1. **The decisions on `main`**: this proposal decided; `overhauls/meta-schemas`' decisions and `scalars`' recorded in
   EXPRESSIONS.md, as above.
2. **Schemas as installs, terms in the store** (with reads through `Readers`, since `Terms.py` fails at import until
   both are done): `Expressions.install` and each dialect's; `Bindings` gone; tests and corpora moved.
3. **Domains**: `HasDomain`, `Expressions.Framework.Defines`, domains as objects; dialect-scoped names in place of the global registry.
4. **`OfExpression` and `OfConstraint` refined** (question 3).
5. **Evaluation in transactions** (mbse-schemas and here): the evaluator protocol, `requires` of a pattern and a
   branch (a partition routing each frame), then variables and a collecting reduce (questions 5 to 8).
6. **Tutorials, skill, README, EQUIVALENCE; release** (0.6.0). Then mbse-programs, mbse-patterns (re-scoped) and
   mbse-codegen-python.

## Risks

- **Cost**: every expression is written within a transaction, in a store that takes about 23 ms to make; suites and
  `FromFunction` that build many expressions need care.
- **The commit-time rule** (mbse-schemas, Decided, 96, kept by 32): an install and the expressions using it are
  separate transactions.
- **No reference between stores**: a constraint and the data it is evaluated over share a store.
- **Extension limits**: an extension's adjacency is to a relation of two links and no properties.
- **Equivalence**: byte-identical JSON in both languages, and the TypeScript model of Python's rules (DIA-02).
- **Stale text in mbse-schemas** to correct with the port: its FRAMEWORK.md still calls expressions "ordinary objects
  with registered meta-schemas", and its skill's `queries.md` promises step 5.

---

<!-- nav -->
[← Expressions](../../EXPRESSIONS.md) · [Home](../../../README.md)
