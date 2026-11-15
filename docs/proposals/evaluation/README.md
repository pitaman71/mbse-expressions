<!-- nav -->
[← Tutorials, from domains and trivial expressions up](../tutorials/README.md) · [Home](../../../README.md)

# What is evaluated, and in which dialect (a proposal)

*Initiative*: [INI-012: domain + expression dialect framework](https://github.com/pitaman71/mbse-basis/blob/main/proposals/PRIORITIES.md#ini-012--domain--expression-dialect-framework).

The user asked why this repository builds evaluators at all (2026-11-12): "I suppose it is related to having a generic
`Term` that can fanout into any dialect, which kind of pokes a hole in a multi-dialect typing system that maybe we
actually need. Also we don't really have a 'neutral' dialect in which we can write expressions that can be directly and
efficiently evaluated in isolation if they appear for example in a type binding." A neutral expression language is
what [VOC-027: second-order invention](https://github.com/pitaman71/mbse-basis/blob/main/docs/VOCABULARY.md#VOC-027)
names as one to avoid ([QUA-003: no second-order inventions](https://github.com/pitaman71/mbse-basis/blob/main/docs/QUALITIES.md#QUA-003)).
This proposes the published standard to model in its place, ISO/IEC 11404, and asks what only the user can decide.
It builds nothing.

It starts from [the evaluation inventory](../dialects/README.md#evaluation-what-is-refused-and-why): of 373 kinds of term in 25 dialects, 78 are evaluated and 295 refused; of
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
| Partial evaluation ([CAP-099: partial evaluation](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-099.md)), and the staged simplifier the user designed (Q11, mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), "Stage 6 extends no evaluator") | a residual: what is known substituted, operations applied by plugins to concrete values or unknown | Patterns only |

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

## 4. The boundary inside mixed-dialect expressions

A caller does not pass a domain to an evaluator: a term carries none, and "whatever reference object owns the root term
must specify its schema" ([CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided)).
The domains come from the holder and its context: the schema that holds the expression, a parameter's schema for a
binding, the schemas the scope's values are written with, each reaching its domain through `HasDomain`; giving each
subterm its domain from them is CAP-232's. What the user's second question names is the boundary: where evaluation
stops, and what the caller sees there.

- **Where it stops.** Under (b), evaluation reaches whatever lowers into the standard dialects. It stops at a subterm
  with no lowering: a kind the inventory classes (b), with no value of its own; (d), mbse-programs' or a simulator's;
  (c), until its capability is met; or an (a) whose rule is not written yet. Under section 2's (b), a subterm of
  another dialect sits only where a union lists it or under an explicit boundary kind, which lowers through its own
  dialect's rules, so a boundary between dialects is one more lowering, not a stop.
- **What the caller sees: a residual, not a refusal.** Today a refused subterm raises, in partial evaluation too. In
  its place, a subterm evaluation cannot reach stays a subterm of the residual
  ([CAP-099: partial evaluation](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-099.md)),
  named with its dialect, its kind and its class; full evaluation reads it as unknown, so that Kleene's logic still
  decides what does not depend on it (`false and x` is false;
  [PRI-007: three-valued checking on request](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-007)).
  A residual preserves what a refusal drops, so refusal stays only where nothing can be preserved
  ([PRI-002: preserve, don't lose](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-002)): a
  term no dialect can read. This is the user's staged simplifier (Q11), substitution first, operations applied by
  plugins to a value or to unknown, with the standard dialects' operations the plugins this repository ships.

## 5. Questions for the user

1. **What evaluation is for.** Is evaluation here scoped to what its consumers need (a constraint's truth, a binding's
   value, a residual), not to each language's own semantics? *Recommended: yes*: the inventory's build partition, an
   evaluator grown per family, is not built; today's evaluators keep what they do.
2. **The hole** (section 2): (a) the constraint as decided, (b) dialects closed by refinement with explicit mixing,
   (c) copies per dialect, or (d) parametric kinds, later. *Recommended: (b)*, after checking that mbse-schemas narrows
   a container's element by refinement *(agent)*.
3. **Which dialect evaluates** (section 3): (a) each its own, (b) the standard dialects, every other by its lowering,
   (c) each language's runtime, or (d) none. *Recommended: (b)*, (c) kept open as CAP-203's optional check.
4. **Where ISO/IEC 11404 is silent.** Patterns' bitwise operations and shifts have no characterizing operation: (a)
   taken from IEEE 1164's logical operators and IEEE 1076's `numeric_std` shifts, each a standard dialect's
   *(agent)*; or (b) left to the language dialects, so that a constraint using them is written in one.
   *Recommended: (a).*
5. **Patterns' place.** Patterns keeps only mbse-schemas' access (`get`, `has`, `entries`) and its quantifiers over a
   pattern, extending 11404's dialect, its comparisons, logic and arithmetic becoming 11404's operations, as CAP-180
   says. *Recommended: yes*, which makes [CAP-260: dialects extending Patterns checked by their own operations](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-260.md)
   a prerequisite.
6. **A residual in place of a refusal** (section 4). *Recommended: yes*, in evaluation and partial evaluation alike,
   every residual subterm named with its class.
7. **Where the lowerings live.** The user decided that "translation across languages belongs to transforms"
   ([FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md#decided));
   but CAP-142's evaluator must not depend on mbse-transforms. *Recommended: here*, as declared rules, by
   [PRI-011: the lowest repository that can own it](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-011);
   translation between two languages stays mbse-transforms'.
8. **The inventory's own questions** (writes, SystemVerilog's sequences and properties, JSX). Under (b) each is
   whether a lowering exists, and none does: a write, a trace and a JSX factory have no 11404 form. *Recommended: as
   the inventory recommends*, (d), (d) and (b), each left in the residual.

## Decided (2026-11-12)

The user's answers to section 5, quoted:

- **1. What evaluation is for**: scoped to its consumers' needs, a constraint's truth, a binding's value, a residual;
  the inventory's partition, an evaluator grown per family, is not built, and today's evaluators keep what they do.
  "this is okay for the time being".
- **2. The hole**: (b), each dialect closed by schema, refining each shared kind it reuses, mixing only where explicit.
  "yes, (b)". First, check that mbse-schemas narrows a container's element by refinement.
- **3. Which dialect evaluates**: (b), the standard dialects, every other by its lowering into them, a parameter binding
  written in ISO/IEC 11404's dialect; (c), each language's runtime, as an optional check. "yes, (b) with (c) as optional
  backup".
- **4. Where ISO/IEC 11404 is silent**: (a), bitwise operations from IEEE 1164's logical operators and shifts from IEEE
  1076's `numeric_std`, each a standard dialect's. "yes (a)".
- **5. Patterns' place**: Patterns keeps only mbse-schemas' access and its quantifiers over a pattern, extending 11404's
  dialect; CAP-260 a prerequisite. "yes".
- **6. A residual in place of a refusal**, in evaluation and partial evaluation alike, each residual subterm named with
  its class. "yes".
- **7. Where the lowerings live**: here, as declared rules (PRI-011); translation between two languages stays
  mbse-transforms'. Provisional: "okay for now but we should come back to this", so it stays open below.
- **8. The inventory's questions**: writes, SystemVerilog's sequences and properties, and JSX get no evaluator, each
  left in the residual. "agreed no evaluator".

Still open: question 7, to revisit; and 11404's characterizing operations, named here from memory of the standard, to check against its text before they are built.

## Decided: simplification, not evaluation (2026-11-13)

After the checks of 11404's operations found that integer division and remainder have no characterizing operation, the
user first said: "The insinuation that we need a div operation hints at two dialects being overlaid. Our first priority
is to build for each dialect completely self-contained evaluation of each expresions that do not involve other dialects,
then evaluation of expressions that involve sub-dialects. Evaluation of expressions that contain statements, type
algebra, or which transpile to other dialects is deferred." Then, asked how disruptive it would be to build only
simplification, the user decided the rules and the capabilities, which supersede section 5's answers wherever they
differ:

- **The rules**, [PRI-046: simplification, not
  evaluation](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-046): dialects implement a
  simplification procedure, not an evaluation procedure, by recursive substitution over immutable terms; a literal
  root is a successful evaluation.
- **In plan**, [CAP-295: simplification of single-dialect expressions with literal leaves](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/README.md#CAP-295) to
  [CAP-299: simplification across a sub-dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/README.md#CAP-299): simplification of
  single-dialect expressions with only literal leaf terms; with leaf terms mixing literals, arguments or variables, and
  parameters; across binding states, fully bound, partially bound and fully unbound; expressions involving type
  parameters, but not type algebra; expressions involving a sub-dialect.
- **Deferred**, [CAP-300: simplification over type algebra](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/README.md#CAP-300) to
  [CAP-302: simplification of expressions with statements](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/README.md#CAP-302): type algebra; terms
  whose evaluation delegates to a surrogate dialect (question 3's (b), the lowering into the standard dialects, with
  questions 4, 5 and 7, and its (c)); statements.
- **So**: question 1 reads as each dialect simplifying its own expressions completely; question 6, a residual in place
  of a refusal, is the rule itself; questions 2 and 8 stand. [The
  inventory](../dialects/README.md#evaluation-what-is-refused-and-why)'s class (a) is read as simplification: a kind
  whose value has no literal form (a closure, an object) stays in the residual.

## As built: the framework (0.11.0)

Step 1 of the decision above, on branch `simplification`: the framework every family's folding rules fill, and
evaluation retired as a public procedure ([the port's API](../port/API.md#settled-in-simplification-for-the-users-review),
324 to 333).

- **One procedure.** `Framework.Simplifiers.Simplifier` simplifies an expression of its dialect in a scope that binds
  some, all or none of its names, to a residual of the same dialect, by recursive substitution: a new term written, the
  old one never changed. Each dialect's `Simplifiers.OfAny(expression, scope)` is one; what it gives, a `Simplified`,
  holds the `residual`, whether its root is a `literal` (then its `value`), the names still `free`, and the `residues`.
  A literal root is a successful evaluation: `evaluate()` gives its value, or raises `NotEvaluated` naming why the root
  is not a literal.
- **Operator semantics are folding rules.** What each dialect's evaluator computed over literals, its rules fold into
  literals, every operator it evaluated before (`FOLDED`, the tables of its `Interpreter`, `RULES`); what has no
  literal form (an object, a closure, a collection, an Excel error, a C `char`) stays a subterm of the residual, its
  own subterms simplified. SystemVerilog folds a subterm wherever 11.6's sizing of the whole expression keeps its meaning (its own `folds`
  hook).
- **No refusals** (question 6). Where a dialect has no rule for a kind or an operator, the subterm stays, named by a
  `Residue`: its dialect, its kind, what it has no rule for, and its class in the inventory (`CATEGORIES`, each family's
  module). Kleene's logic still decides what does not depend on it, as `simplify` does in Patterns (`false and x` is
  `false`). What a scope does not provide stays too (`Symbolics.Unbound`). What the dialect's semantics make an error
  still raises, as the expression would in its language, wherever its language evaluates the subterm; one it may
  never evaluate (an untaken branch, a short circuit's right operand, a lambda's body, `sizeof`'s operand) is guarded,
  and stays ([the port's API](../port/API.md#settled-in-simplification-for-the-users-review), 374).
- **What it leaves to the families.** Each family's class (a) is the next step's: a kind or an operator gains a rule by
  an implementation in its family's `RULES` and its tag in `FOLDED`; its residues then disappear. Type parameters, a
  sub-dialect's terms and the deferred capabilities (type algebra, a surrogate dialect, statements) are later steps.

## As built: TypeScript5 (0.11.0)

Step 2 for the TypeScript family, on branch `simp-typescript5` ([the port's API](../port/API.md#settled-in-simplification-for-the-users-review), 334 to 340):
TypeScript5 folds every kind the inventory gives class (a), by ECMA-262's semantics, modeled alike in both
implementations (`ECMAScript`: ToPrimitive, ToNumber, ToString, IsLooselyEqual, IsStrictlyEqual, IsLessThan, UTF-16 code
units, bigints). A value with a TypeScript literal folds to it; an array or an object of them to its display; a closure,
a data object and a host value stay. What stays, named: what the inventory gives (b) and (d), `delete` and an async or
block-bodied arrow's call (d), a literal `__proto__` (a), and ECMAScript's built-in methods and host values (c, waiting
on a surrogate for the language's runtime, [CAP-301: simplification delegated to a surrogate dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/README.md#CAP-301)).

## As built: Python3 (0.11.0)

Step 2 for the Python family, on branch `simp-python3` ([the port's API](../port/API.md#settled-in-simplification-for-the-users-review), 341 to 350):
`Python3` simplifies every statement-free expression that involves no other dialect, by CPython 3.14's semantics,
which Python runs and TypeScript models alike. Folded: the inventory's 14 class (a) kinds and its 5 class (a)
refusals within the kinds folded before, with Python's constants (`None`, `...`, complex numbers). A value with a
literal folds to it, a list, a tuple or a dict of them to its display; a set, a slice, a closure, a template and a
generator stay, with no literal. What stays, named: the inventory's (d), `yield`, `yield from`, `await`, an `async
for` and a target that writes into data; `is` between equal immutable values (b), which Python leaves to its
implementation; and, of class (a), what needs the platform or the implementation to be computed alike: a complex power
that is no integer one, a field whose text is an object's address or a set's order, a locale's format spec, a spec
Python refuses, and a `\N{...}` escape.

## As built: C and C++ (0.11.0)

Step 2 for the C family, on branch `simp-c-family` ([the port's API](../port/API.md#settled-in-simplification-for-the-users-review), 351 to 362): C and C++ fold
every kind the inventory gives class (a), and every class (a) refusal within a kind they evaluated, by ISO/IEC 9899
and ISO/IEC 14882, in the types and layouts their holder's ABI stores
([CAP-267: C and C++ terms read under the ABI their holder names](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-267.md)). A value with a literal of its type folds to it (a suffix by the
type's identity; a floating value a binary64 literal spells exactly; `nullptr`; a `_BitInt` whose narrowest literal is
of its type); a `char`, a `short`, an array, an ordering and `void` stay. What stays, named: the object model, writes,
statements, declarations (`d`); an operand whose declaration gives its type (`c`, CAP-232); a layout no ABI dialect
stores, nested braces and an array of arrays in a compound literal (`a`); an initializer alone, a type name (`b`).

## As built: SystemVerilog (0.11.0)

Step 2 for the SystemVerilog family, on branch `simp-sv` ([the port's API](../port/API.md#settled-in-simplification-for-the-users-review), 363 to 373):
`SystemVerilog` folds every kind and every shape the inventory gives class (a), by IEEE 1800-2023: 4-state values
through every operator, 11.6's sizing and 11.8's signedness, a cast as an assignment (6.24.1), pattern matching
(12.6), streaming (11.4.14), the system functions of clauses 20 and 21 that compute a value, and strings' and arrays'
methods. A subterm folds wherever its literal keeps its meaning: a self-determined one alone, a context-determined one
once its context's type is known, from the whole expression, the scope's values and the types it declares for the names
it does not bind; what has no literal (an array, an object, a 2-state or `shortreal` value where its states could
matter) stays, by rule, naming no residue. What stays, named: what the inventory gives (b), (c) and (d), a time literal
with no time unit (a, a parameter the scope may give), a call with named or empty arguments of a function whose formals
the scope does not give (a), and `$sformatf`'s `%u`, `%z`, `%p` (a) and `%t`, `%m`, `%l`, `%v` (d).

## 6. What it would add or supersede

Named in prose; the user adds the items. It would add capabilities implementing
[FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md): ISO/IEC
11404's characterizing operations as terms of its dialect, evaluated by intrinsics in both languages, with IEEE 754's,
IEEE 1164's and Unicode's operations beside them, which completes CAP-180's "modeled, not coded"; each language
dialect lowered into the standard dialects for evaluation, one per dialect, by declared rules; dialects closed by
schema, mixing only where a union lists another's kinds or through a boundary kind; and evaluation that leaves a
residual where it cannot go, naming why. It would supersede, in part,
[CAP-095: Basic terms as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-095.md)'s core
vocabulary, which becomes 11404's operations and Patterns' access; and the capabilities the inventory's partition would
add, one evaluator's growth per family, are not added. [CAP-099: partial evaluation](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-099.md)
and [CAP-106: expressions evaluated three-valued](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-106.md)
stand, applied to the standard dialects' evaluator; [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)
infers over the lowered form; and [CAP-142: expressions evaluated in queries](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-142.md)
is unblocked once Patterns' lowering and 11404's evaluator are built.

---

<!-- nav -->
[← Tutorials, from domains and trivial expressions up](../tutorials/README.md) · [Home](../../../README.md)
