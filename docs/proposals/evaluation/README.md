<!-- nav -->
[← Tutorials, from domains and trivial expressions up](../tutorials/README.md) · [Home](../../../README.md)

# What is evaluated, and in which dialect (a proposal, for review)

*Initiative*: [INI-012: domain + expression dialect framework](https://github.com/pitaman71/mbse-basis/blob/main/proposals/PRIORITIES.md#ini-012--domain--expression-dialect-framework).

The user asked why this repository builds evaluators at all (2026-11-12): "I suppose it is related to having a generic
`Term` that can fanout into any dialect, which kind of pokes a hole in a multi-dialect typing system that maybe we
actually need. Also we don't really have a 'neutral' dialect in which we can write expressions that can be directly and
efficiently evaluated in isolation if they appear for example in a type binding." A neutral expression language is
what [VOC-027: second-order invention](https://github.com/pitaman71/mbse-basis/blob/main/docs/VOCABULARY.md#VOC-027)
names as one to avoid ([QUA-003: no second-order inventions](https://github.com/pitaman71/mbse-basis/blob/main/docs/QUALITIES.md#QUA-003)).
This proposes the published standard to model in its place, ISO/IEC 11404, and asks what only the user can decide.
It builds nothing.

It starts from [the evaluation inventory](https://github.com/pitaman71/mbse-expressions/blob/82be48b/docs/proposals/dialects/README.md#evaluation-what-is-refused-and-why)
(unmerged, branch `evaluation-inventory`): of 373 kinds of term in 25 dialects, 78 are evaluated and 295 refused; of
those, 79 are gaps a statement-free evaluator should close, 161 have no value of their own, 6 wait on
[CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)
or constraint resolution, and 49 need what only mbse-programs or a simulator has. Its build partition, one evaluator's
growth per family, is what this proposal questions.

## 1. Why evaluate at all

"Refusing", the user's first question, is today's evaluator raising, by the term's dialect and kind ("Python3 lambda is
not evaluated"), where it has no rule; partial evaluation raises the same where a closed subterm is refused. Who needs
a value from an expression, and what each needs:

| Who | What it needs | Today |
|---|---|---|
| Constraint checking: mbse-schemas' executor, a pattern's `requires` ([CAP-142: expressions evaluated in queries](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-142.md), [CAP-029: three-valued constraint checking](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-029.md)) | a truth value, three-valued, over data objects, from an evaluator given to the store | blocked on this repository |
| Generation: mbse-patterns rejecting a draw ([CAP-042: data generated from constraints](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-042.md)) | the same truth value | blocked on CAP-142 |
| Parameter bindings ([CAP-114: parameter bindings are substituted and checked](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-114.md), [CAP-181: parameters wherever literals may appear](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-181.md)): a width, an extent, a shape | a value, checked against its parameter's schema, from an expression no host language owns | no dialect to write it in but Patterns or a language's |
| Partial evaluation ([CAP-099: partial evaluation](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-099.md)), and the staged simplifier the user designed ([Q11](../dialects/README.md#decided-for-stage-6-systemverilog-and-after-2026-11-05)) | a residual: what is known substituted, operations applied by plugins to concrete values or unknown | Patterns only |

None of them needs Python's, ECMAScript's or C's own semantics: each needs one meaning of an operation over values of
known domains. Translation, printing, validation and code generation need no value at all. So what is lost without an
evaluator is CAP-142 and what waits on it, the checking of a binding, and every residual beyond substitution; what is
lost without each language's own evaluator is only fidelity to that language, which no consumer above asks for and
which [CAP-203: evaluators delegating to per-language libraries](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-203.md)
already leaves to the language's own library.

## 2. The hole: one `Term` over every dialect

As built ([CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided)),
`Expressions.Framework.Term` is the union of every dialect's `Term`, and each holder narrows its `root` to its own
dialect's. But the framework's shared kinds, `call`, `let`, `list`, `mapping` and their `Pair`, hold a subterm of
`Framework.Term`, and most dialects reuse them: a Python3 list's element may be, by schema, a C term. The user decided
that this closure is "by constraints not by schema" (dialects' question 4); no such constraint was built, nor designed
([CAP-166: constraints attached where they constrain](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-166.md)).
So:

- validation accepts any dialect's subterm beneath a shared kind, and a type checker cannot tell
  ([CAP-255: type checkers catch mistakes in code that builds expressions](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-255.md));
- every reader, validation, inference, evaluation and translation, dispatches per subterm on its owner, and an
  evaluator meets other dialects' terms it can only refuse;
- domain inference ([CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md))
  has no seam to convert at: a Python3 `int` met by C's `+` is neither dialect's question.

The options, each with what it keeps and what it closes
([PRI-042: optionality kept](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-042)):

- **(a) Keep the schema, build the constraint** (as decided): a dialect's validation refuses another's subterm except
  where its union lists that kind. Keeps mixing anywhere and the decision as made; closes nothing new, but keeps the
  per-subterm dispatch and leaves type checkers blind.
- **(b) Each dialect closed by schema, by refinement**: each dialect refines each shared kind it reuses, its subterms
  narrowed to its own `Term`, as each holder already narrows `root` and as `let`'s variations already refine `Let`
  ([CAP-279: names an expression binds found alike in every language](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-279.md)),
  through [CAP-167: schemas refined by other schemas](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-167.md).
  Mixing is kept, explicitly: a sublanguage's kinds listed in its host's union, as today, or a boundary kind
  (section 4). Keeps the framework's generic reads and both kinds of mixing; closes only implicit mixing.
- **(c) Each dialect its own copies of the shared kinds**, as C and C++ define theirs: closed by schema, but the
  framework no longer knows a `call` as one, and the copies are repeated per dialect.
- **(d) Parametric shared kinds** (`List` of a dialect's `Term`): mbse-schemas has no schema parameters yet (as
  [CAP-049: type parameters in Python3](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/README.md#CAP-049) finds, blocked), so a
  deferred option, open to add later.

*Recommended: (b)*, to verify first that mbse-schemas narrows a container's element by refinement, as it narrows a
property; (d) stays open.

## 3. Which dialect evaluates

ISO/IEC 11404 is the published standard for this: language-independent datatypes, each defined by its values and its
characterizing operations (Boolean's Not, And and Or; Integer's Equal, InOrder, Add, Multiply and Negate; Modulo's
wrapping Add and Multiply; State's Equal; Sequence's Head, Tail and Append; Record's field selection; ...), written so
that languages' datatypes map onto them. [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md)
already holds the user's direction, "Datatype operations are modeled, not coded", half built: its dialect holds the
kinds, and every dialect's stored domains are already of its kinds or of the other standard dialects'
([CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#value-domains)).
Modeled from a standard, it is not the neutral language VOC-027 names, and needs no approval under
[PRI-022: second-order inventions by approval](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-022).
The options:

- **(a) Each dialect its own evaluator, as today.** Closing the inventory's 79 gaps means modeling ECMAScript's
  abstract operations in Python, Python's equality and closures in TypeScript, C's object-free arithmetic and
  SystemVerilog's system functions, each twice ([PRI-028: both implementations change together](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-028)):
  nine semantics for consumers that need one. Keeps fidelity; closes nothing, at the highest cost.
- **(b) The standard dialects evaluate; every other dialect is evaluated by its lowering into them.** ISO/IEC 11404's
  dialect gains terms: the framework's kinds, its calls naming its characterizing operations as data
  ([CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md),
  `Operates`), each implemented once per language as an intrinsic, IEEE 754's, IEEE 1164's and Unicode's operations
  beside them. A language's dialect is evaluated by translating its terms into those, its own rules written out
  (C's promotions as conversions, as CAP-232's design already has it), by declared rules as
  [CAP-101: translation between dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-101.md)'s
  are; the translators into Patterns, which six dialects have, are where that starts. A parameter binding is written
  in 11404's dialect itself and evaluated with no translation: the "neutral" dialect the user found missing, taken
  from a standard. Patterns keeps only what is mbse-schemas' (`get`, `has`, `entries`, its quantifiers over a
  pattern), extending 11404's dialect. Keeps one semantics, small, in both languages; closes fidelity where a
  language's meaning has no 11404 form, which is left unevaluated (section 4).
- **(c) Each language's own runtime** ([CAP-203: evaluators delegating to per-language libraries](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-203.md)):
  a term printed and run by CPython, Node, a C compiler or a simulator. Exact fidelity; but neither implementation
  can run the other's, so the two give different answers ([QUA-006: the same in every language](https://github.com/pitaman71/mbse-basis/blob/main/docs/QUALITIES.md#QUA-006)).
  Kept open as an optional check of a lowering, not as the evaluator.
- **(d) None.** This repository validates, stores and translates; evaluation is the caller's. CAP-142 stays blocked
  until someone else builds (a) or (b).

*Recommended: (b)*, with (c) open as CAP-203 has it, and today's evaluators kept as they are, not grown, until each
dialect's lowering covers what it evaluates (the dialects' "a shallow evaluator", question 8, stands meanwhile). Where
11404 is silent, so is (b): it has no bitwise operations or shifts, which Patterns has; IEEE 1164 defines the logical
operators over bit vectors, and IEEE 1076's `numeric_std` the shifts *(agent)*, question 4.
