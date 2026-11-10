# Adding a dialect or a translator

A dialect's terms are values in an mbse-schemas store: its install defines its kinds, and the framework reads them,
validates them, infers their domains and traverses them from a declaration of how each is read. A new dialect writes
its install, its kinds' declarations, its writers, its domains, its evaluator and its source text. The framework it
builds on is mbse-basis' [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#the-framework).

## A dialect

1. **Its install defines its kinds, as schemas.** *Why*: a dialect's terms must be stored, serialized and validated as
   any mbse-schemas value is, in both languages alike. *How*: it lives under its family, at its path (`LaTeX.Expressions`:
   the package `mbse.Expressions.LaTeX.Expressions`, the directory `src/LaTeX/Expressions`), which names its schemas. Its
   `install(txn)` defines its `Term`, the value union of
   its kinds (`Expressions.LaTeX.Expressions.Term`), and adds it to `Expressions.Framework.Term` by schema extension, as the branch
   named after it (`latex`): a value object schema per kind of its own (a term carries no domain), named plainly in its
   `Term` (`frac`), a slot a property holding its `Term`, variadic arguments a container of it by an int index,
   attributes any other scalar property. It also defines its dialect, the singleton `Expressions.LaTeX.Expressions` of its own
   reference object schema `Expressions.LaTeX.Expressions.Dialect`, a branch (`latex`) of the kind union
   `Expressions.Framework.Dialect`, which names its operations (`Expressions.Framework.Operates`) and owns its domains
   by name (`Expressions.Framework.Defines`). All of it is written in the builders' fluent syntax, as mbse-schemas'
   installs are, in one upsert that run again writes nothing.
   - Python: [FRM-04: Every dialect's install adds its union of its kinds to `Term`, and its terms round-trip](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-04) · TypeScript: [FRM-04: Every dialect's install adds its union of its kinds to `Term`, and its terms round-trip](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-04)
   - Python: [FRM-10: A dialect may extend another: its kinds are the base's and its own, added to its union by schema extension](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-10) · TypeScript: [FRM-10: A dialect may extend another: its kinds are the base's and its own, added to its union by schema extension](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-10)
   - Python: [EXP-05: The framework's schemas are an install: ordinary, registered schemas, which Patterns' install extends](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-05) · TypeScript: [EXP-05: The framework's schemas are an install: ordinary, registered schemas, which Patterns' install extends](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-05)
   - Python: [EXP-13: Dialects, operations and domains are data: Patterns' singleton names its operations, and a standard dialect's owns its domains](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-13) · TypeScript: [EXP-13: Dialects, operations and domains are data: Patterns' singleton names its operations, and a standard dialect's owns its domains](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-13)
2. **Reuse the framework's kinds wherever the shape is the same.** *Why*: a kind shared is read, translated and
   evaluated alike in every dialect that has it. *How*: its `Term` lists the framework's kinds it reuses, `literal`,
   `variable`, `let` and `call` (`callable` by name, positional `arguments`), and the container constructors `list`
   and `mapping`, wherever its kind has that shape exactly, whose slots hold any dialect's term, and the framework's
   `error` and `missing`. It keeps a kind of its own only where the shape differs (Python3's call has a term for its
   callee; C's literal adds what its text encodes); a restriction of its own on a reused kind ("no bytes") is its `Kind`'s
   check.
   - Python: [FRM-12: A dialect reads only its own terms: a term holds its dialect, a shared kind's slot holds any dialect's term, and validation reports another's; C and C++ each define the kinds they share](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-12) · TypeScript: [FRM-12: A dialect reads only its own terms: a term holds its dialect, a shared kind's slot holds any dialect's term, and validation reports another's; C and C++ each define the kinds they share](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-12)
   - Python: [FRM-11: Invalid syntax, `error` and `missing`: every dialect's `Term`, `Type` and `Pattern` hold them, validation reports them, evaluation refuses them by name, and printers write them as written](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-11) · TypeScript: [FRM-11: Invalid syntax, `error` and `missing`: every dialect's `Term`, `Type` and `Pattern` hold them, validation reports them, evaluation refuses them by name, and printers write them as written](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-11)
3. **Declare how each kind is read.** *Why*: validation, inference, evaluation and translation read every dialect
   through these declarations, never through its code. *How*: its `Terms.Dialect`, made with its path
   (`Terms.Dialect("LaTeX.Expressions", kinds, ...)`, named `LaTeX`), declares a `Terms.Kind` per tag,
   whose role tells them how to treat it:

| Role | Is | Declares |
|---|---|---|
| `LITERAL` | a value, its `value` (and its spelling, `text`, and `problems`) | `typed(record)`, the domain its own attributes give it (C's `type`) |
| `REFERENCE` | what the scope resolves, by its `name` | `lexical=False` for references that need no binding (Excel cells), `ambient` for names always bound (Python's builtins) |
| `APPLICATION` | an operator applied to arguments | `operator` (the property naming it, or none when the tag does), `vocabulary` (names to signatures) or `signature` for an open vocabulary; `closed=True` makes evaluation refuse names outside the vocabulary; `operations(store)`, the operations the dialect defines as data (Patterns'), makes validation refuse any other, read from the store of the term's holder |
| `BINDING` | a let: binds its `name` | its slots, value then body |
| `QUANTIFIER` | binds its `name` to each item of a collection | `operator`, `vocabulary`, as an application |
| `IMPORT` | makes something available within its body | `names(attributes)`, the names it binds; the scope resolves it with `enter` |
| `INVALID` | invalid syntax, the framework's `error` and `missing`, which every dialect reads | nothing: validation reports it, evaluation refuses it |

   A kind whose role says too little declares more (Python3's do): `optional`, the slots that may be empty (`lower` of
   a slice, `generators.target` within a helper); `scopes(record)`, the names each argument has bound (a
   comprehension's targets, a lambda's parameters); `operators(attributes)` and `result(attributes, domains)`, where it
   applies several operators (a comparison chain); `unfold(form)`, an equivalent form of simpler terms that translation
   reads where no rule reads the term; and `spelling`, a literal's attributes that spell it rather than give its value.
   A helper, a value object a kind holds that is not a term (a call's `keyword`), or a container of them, is read as a
   `Terms.Part` among the form's attributes, its terms after the kind's own arguments, and `make` writes it back.

   - Python: [FRM-02: Forms and `make` are inverses, for every kind of every dialect](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-02) · TypeScript: [FRM-02: Forms and `make` are inverses, for every kind of every dialect](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-02)
   - Python: [FRM-05: Validation follows each kind's role, in every dialect](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-05) · TypeScript: [FRM-05: Validation follows each kind's role, in every dialect](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-05)
   - Python: [FRM-06: Domains and signatures](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-06) · TypeScript: [FRM-06: Domains and signatures](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-06)
   - Python: [FRM-07: `infer` finds an expression's domain from its vocabulary's signatures](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-07) · TypeScript: [FRM-07: `infer` finds an expression's domain from its vocabulary's signatures](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-07)
   - Python: [DIA-19: Python3's kinds beyond the narrower ones: literals keeping what their text encodes, f-strings as written, each kind's own checks and what it binds, stored as any term](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-19) · TypeScript: [DIA-19: Python3's kinds beyond the narrower ones: literals keeping what their text encodes, f-strings as written, each kind's own checks and what it binds, stored as any term](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-19)
4. **Write its writers, its source text and its evaluator.** *How*: a writer of its terms is a `Terms.Writer` of its
   dialect's tag, one per kind, writing the kind wherever a term is written. Its `Text` module's `ToText(term)` reads
   each term through its `DIALECT.kind` (which refuses another dialect's terms), a literal's `text` where it has one,
   and `Terms.invalid_text` for `error` and `missing`. Its evaluator builds on `Framework.Evaluators.Interpreter`, with
   one implementation per operator (each takes thunks for its arguments, so it decides what to evaluate) and a scope
   derived from `Framework.Symbolics.Variables`. An interpreter given the kinds it `evaluated` refuses any other by
   name. Evaluation is optional: a dialect may only render and translate.
   - Python: [FRM-08: The interpreter evaluates by role and raises what validation reports](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-08) · TypeScript: [FRM-08: The interpreter evaluates by role and raises what validation reports](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-08)
   - Python: [FRM-09: Symbolics: the names an expression needs, and the imports it declares](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-09) · TypeScript: [FRM-09: Symbolics: the names an expression needs, and the imports it declares](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-09)
   - Python: [FRM-10: A dialect may extend another: its kinds are the base's and its own, added to its union by schema extension](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-10) · TypeScript: [FRM-10: A dialect may extend another: its kinds are the base's and its own, added to its union by schema extension](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-10)
   - Python: [FRM-01: Every dialect, expression, evaluator and translator implements its protocol](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-01) · TypeScript: [FRM-01: Every dialect, expression, evaluator and translator implements its protocol](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-01)
5. **Check it is complete.** *When*: a dialect models a language whose grammar is published. *How*: keep the
   language's nodes as data, and check that each is a kind, a helper or an operator of a kind, or is listed as not an
   expression, with its reason, as Python3 does with `grammars/python3-ast.json`.
   [CAP-226: complete expression dialects](mbse:mbse-basis/docs/capabilities/CAP-226.md).
   - Python: [DIA-20: Python3 is complete: each node of `ast` an expression is or holds, 3.0 to 3.15, kept as data, is a kind, a helper or an operator of a kind, or is listed as not an expression with its reason](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-20) · TypeScript: [DIA-20: Python3 is complete: each node of `ast` an expression is or holds, 3.0 to 3.15, kept as data, is a kind, a helper or an operator of a kind, or is listed as not an expression with its reason](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-20)

## A translator

*Why*: each pair is declared once, by rules both languages read alike. *How*: add a module per pair to `Translators/`,
declaring `TRANSLATOR = Pairwise(left, right, rules)` with patterns from `_Patterns`, and list it in the package's
`Translators` index so `between` finds it (see [Translating](translating.md#how-translators-are-written)).

- Python: [TRN-01: Rules pair patterns; holes bind arguments and attributes](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-01) · TypeScript: [TRN-01: Rules pair patterns; holes bind arguments and attributes](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-01)
- Python: [TRN-02: Every pair translates both ways; forms round-trip where both dialects have them](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-02) · TypeScript: [TRN-02: Every pair translates both ways; forms round-trip where both dialects have them](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-02)
- Python: [TRN-05: What a dialect cannot say is refused, naming the term](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-05) · TypeScript: [TRN-05: What a dialect cannot say is refused, naming the term](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-05)

## Obligations in this repository

- Change Python and TypeScript together, with the same names, messages and JSON. A difference not listed in
  [Equivalence of the implementations](mbse:mbse-expressions/docs/EQUIVALENCE.md#deliberate-differences) is a bug.
- Add a conformance case for a new dialect, with its install in the corpus's store and its `DIALECTS` entry, so both
  implementations are checked to write the same JSON.
  - Python: [CONF-02: Every implementation has the same cases, and JSON is byte-identical across implementations](mbse:mbse-expressions/python3/tests/04_Conformance.ipynb#CONF-02) · TypeScript: [CONF-02: Every implementation has the same cases, and JSON is byte-identical across implementations](mbse:mbse-expressions/typescript5/tests/04_Conformance.ipynb#CONF-02)
- Keep coverage at 100% in both, with assertions in shared test cases.
- See [Guide for AI agents](mbse:mbse-expressions/AGENTS.md) for the commands and invariants.

## Go deeper
<!-- no case: points to the design, the sources and the test suite for reading further -->

| Topic | Read |
|---|---|
| The framework: terms and roles, symbolics and scopes, domains, the interpreter | [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#the-framework), in mbse-basis |
| A complete dialect to copy | the Excel dialect, in [Python](mbse:mbse-expressions/python3/mbse/Expressions/Excel/Expressions) and [TypeScript](mbse:mbse-expressions/typescript5/src/Excel/Expressions) |
| The framework, case by case | FRM, the framework's test suite, in [Python](mbse:mbse-expressions/python3/tests/05_Framework.ipynb) and [TypeScript](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb) |
