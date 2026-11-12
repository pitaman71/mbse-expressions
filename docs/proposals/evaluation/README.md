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
