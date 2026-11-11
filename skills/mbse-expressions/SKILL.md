---
name: mbse-expressions
description: Write constraints once, as language-neutral data (expressions), then validate, evaluate, store (JSON/YAML), and translate them to and from Python, MATLAB, Excel, LaTeX, C/C++ and SystemVerilog, in Python or TypeScript. Use when formalizing the constraints of an interface or model (MBSE/SysML constraints, interface control documents, constraints about mbse-schemas data), when one constraint must mean the same thing in several languages or tools, when generating Excel formulas, MATLAB, Python, C or SystemVerilog from a constraint (embedded software, hardware assertions and constraints), or when writing code that imports mbse.Expressions or @mbse/expressions.
---

# mbse-expressions

An expression here is data with a schema, not code. It is the neutral, semantically normalized formalization of the
constraints in an interface or model, such as "65 or older, with an email on file". It is stored with the rest of the
data, as [mbse-schemas](https://github.com/pitaman71/mbse-schemas) values, evaluated the same way in Python
(`mbse.Expressions`) and TypeScript (`@mbse/expressions`), which implement the same API and write byte-identical JSON,
and translated between expression languages, called dialects:

- **Patterns** (formerly Basic), the core vocabulary: comparisons, Kleene logic, arithmetic and bitwise operations over
  values, property access, lets, lists and mappings, and collections with quantifiers. Every binding evaluates it.
- **Python3**, **MATLAB** and **Excel**, which model those languages' expressions: each renders as its source text and
  evaluates by its own rules. Python3 holds every expression of Python 3 (3.0 to 3.15), as CPython's `ast` has it, and
  evaluates the kinds constraints use, refusing the others by name.
- **TypeScript5**, every expression of TypeScript 5 (5.0 to 5.9) as typescript-estree has it, with its types,
  destructuring patterns and JSX: it renders as TypeScript and evaluates its literals alone, refusing the others by
  name; it has no translator yet, and its terms are written through the builders.
- **LaTeX**, mathematical notation: it renders, validates and translates, but has no evaluator.
- **C** and **Cpp**, every expression of C (C11 to C23) and of C++ (C++17 to C++23) as mbse-programs has them, with the
  type names they hold: each renders as its source and evaluates, over its arithmetic types, by C's rules (promotions,
  wrapping unsigned arithmetic, undefined behavior raising), refusing the other kinds by name. Each holds the types its
  standard fixes (`bool`, `int32_t`, `_Float16`); the types it leaves to the implementation (`int`, `long`, `char`,
  `size_t`, `long double`) are the ABI's that the expression holding the term names.
- **SystemV.AMD64** and **Arm.AAPCS64**, the ABI dialects of x86-64's System V ABI and of AArch64's AAPCS64: each holds
  only domains, the C and C++ types its ABI fixes (plain `char` signed on one and unsigned on the other, `long double`
  x87's extended format or `binary128`), and serves C and C++ alike.
- **SystemVerilog**, every expression of IEEE 1800-2023, Verilog its subset, over 4-state vectors and reals, in six
  dialects of one family: its expressions, and its types, patterns, assertions (sequences and properties), constraints
  and preprocessor, each a dialect reading the others' terms. It renders as its source and evaluates its constraint
  kinds by IEEE 1800's rules (sizing by context, x and z propagating), refusing the others by name.
- **ISOIEC11404**, **IEEE754**, **IEEE1164** and **Unicode**, the standard dialects: each holds a published standard's
  kinds of domain and its domains, named as the standard names them (ISO/IEC 11404's `integer`, `octet`, a code, and
  `modulo(256)`, wrapping arithmetic; IEEE 754's `binary64`), and has no terms yet. The other dialects' values take their domains.

What it can do is mbse-basis' [FEA-024: expressions as data](mbse:mbse-basis/docs/features/FEA-024.md) and its
capabilities.

This skill says why and when to do each thing, and how in general terms, in the names both implementations share. Each
how links its case in the tutorials or tests of each language, where it runs, with its output: read the one for your
language. Where the languages spell a thing differently, [In each language](#in-each-language) says so.

## When to use it
<!-- no case: says when to use the package, not how -->

- A constraint belongs to an interface or model, and several programs, languages or tools must apply it identically.
- The constraint must be stored, versioned, diffed or sent as data, then analyzed or rewritten, not just evaluated.
- One constraint must become an Excel formula, MATLAB, Python, C or SystemVerilog code or LaTeX notation, or be read
  back from them.
- You are choosing branches of an mbse-schemas union, or checking its values with `Validators.Validate`.

It is a poor fit for logic that is simply part of one program; write that in the program's own language. Why the mbse
repositories exist, and this one's part: [Why the mbse repositories exist](mbse:mbse-expressions/MBSE.md).

## Practices that prevent most mistakes

1. **A constraint is data, written by writers, in a store.** *Why*: data can be stored beside what it is about,
   versioned, sent, and loaded by a program in another language; code can only be run, and only by its own language.
   *When*: every constraint. *How*: in an mbse-schemas store, run the framework's install, then each dialect's you
   write, each in a transaction of its own, once per store: the framework's, then the standard dialects' whose kinds of
   domain the others use (`ISOIEC11404`, `IEEE754`, `IEEE1164`, `Unicode`), then the rest
   (`store.transaction(Framework.install)`, `store.transaction(IEEE754.install)`, ..., `Patterns.install`, ...,
   `C.install`, `Cpp.install`, and the ABI dialects' you need, `AMD64.install`, `AAPCS64.install`; SystemVerilog's six
   together, in any order, as each reads the others' terms); then each one's
   `define` whose data its validation, inference or evaluation reads, each in a transaction of its own: Patterns',
   which names the operations validation reads (`store.transaction(Patterns.define)`), and C's, C++'s, the ABI
   dialects', SystemVerilog's, which write the types they read. A C or C++ expression names the ABI its terms are read
   under, through its adjacency `abi`, given the ABI dialect's singleton (`store.Instances.Expressions.SystemV.AMD64`),
   one at most; a term whose holder names none is refused where it reads a type the ABI defines ("'int' is not a type C defines, and
   its expression names no ABI"). The
   package exports the framework alone (`Framework`); import each
   dialect from its own path, Patterns' writers from `mbse.Expressions.Patterns.Expressions` (TypeScript:
   `@mbse/expressions/Patterns/Expressions`), as `E`. Build a constraint with writers: `E.variable(name)`,
   `E.literal(value)`, `E.let_(name, value, body)` and `E.operation(name, ...)`; reading a property of a writer is `get`
   (`x.age`, or `x.get(name)` for a name a writer has as a method), and its methods build calls (`.ge(18)`,
   `.and_(...)`). A writer builds data and evaluates nothing. Write it within a transaction, as the root of an
   expression (`Expressions.Patterns.Expressions.Expression`, whose root holds Patterns' terms only, or
   `Expressions.Framework.Expression`, any dialect's), or as a term alone (`Expressions.Framework.Term`). A value of the
   program becomes a literal, so the constraint never refers back to it.
   [FEA-024: expressions as data](mbse:mbse-basis/docs/features/FEA-024.md),
   [CAP-095: Basic terms as data](mbse:mbse-basis/docs/capabilities/CAP-095.md).
   - Python: [T09.1: Writing a constraint](mbse:mbse-expressions/python3/tutorials/09_Constraints_As_Data.ipynb#T09.1) · TypeScript: [T09.1: Writing a constraint](mbse:mbse-expressions/typescript5/tutorials/09_Constraints_As_Data.ipynb#T09.1)
   - Python: [T09.3: What a constraint can say](mbse:mbse-expressions/python3/tutorials/09_Constraints_As_Data.ipynb#T09.3) · TypeScript: [T09.3: What a constraint can say](mbse:mbse-expressions/typescript5/tutorials/09_Constraints_As_Data.ipynb#T09.3)
   - Python: [T11.1: A list is a collection](mbse:mbse-expressions/python3/tutorials/11_Constraints_Over_Collections.ipynb#T11.1) · TypeScript: [T11.1: A list is a collection](mbse:mbse-expressions/typescript5/tutorials/11_Constraints_Over_Collections.ipynb#T11.1)
   - Python: [EXP-04: Terms are built through mbse-schemas' builders, in a transaction: a term alone, or an expression's root](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-04) · TypeScript: [EXP-04: Terms are built through mbse-schemas' builders, in a transaction: a term alone, or an expression's root](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-04)
   - Python: [EXP-05: The framework's schemas are an install: ordinary, registered schemas, which Patterns' install extends](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-05) · TypeScript: [EXP-05: The framework's schemas are an install: ordinary, registered schemas, which Patterns' install extends](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-05)
   - Python: [EXP-10: Variables and lets](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-10) · TypeScript: [EXP-10: Variables and lets](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-10)
   - Python: [EXP-11: Writers build terms with methods](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-11) · TypeScript: [EXP-11: Writers build terms with methods](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-11)
2. **Evaluate on request, three-valued.** *Why*: data is incomplete most of the time, and an answer that treats unknown
   as false, or as true, is a silent mistake. *When*: checking a constraint against data. *How*:
   `Evaluators.OfAny(expression, scope)`, the scope a mapping of variables to values, gives true, false, a value, or
   unknown (none). An absent property is unknown; `has(x, name)` asks whether it is present, which always has an
   answer. `and`, `or`, `not` and `implies` follow Kleene's logic, so an operand that decides makes the other's
   unknown not matter. The program asking decides what unknown means, where it acts: compare the result with true or
   false, never by its truth. A variable may be bound to a value, not only an object: a value object reads as its
   properties, and a union value as a record of its one branch, by name, so `has(card.reach, 'email')` asks which
   branch it holds.
   [CAP-106: expressions evaluated three-valued](mbse:mbse-basis/docs/capabilities/CAP-106.md#evaluation-in-mbse-expressions),
   [PRI-007: three-valued checking on request](mbse:mbse-basis/docs/PRINCIPLES.md#PRI-007).
   - Python: [T09.2: Evaluating it](mbse:mbse-expressions/python3/tutorials/09_Constraints_As_Data.ipynb#T09.2) · TypeScript: [T09.2: Evaluating it](mbse:mbse-expressions/typescript5/tutorials/09_Constraints_As_Data.ipynb#T09.2)
   - Python: [T10.1: Absent is unknown](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.1) · TypeScript: [T10.1: Absent is unknown](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.1)
   - Python: [T10.2: How unknowns combine](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.2) · TypeScript: [T10.2: How unknowns combine](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.2)
   - Python: [T10.3: You decide what unknown means](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.3) · TypeScript: [T10.3: You decide what unknown means](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.3)
   - Python: [EVL-01: Evaluating literals, variables, lets, `get` and `has`](mbse:mbse-expressions/python3/tests/02_Evaluators.ipynb#EVL-01) · TypeScript: [EVL-01: Evaluating literals, variables, lets, `get` and `has`](mbse:mbse-expressions/typescript5/tests/02_Evaluators.ipynb#EVL-01)
   - Python: [EVL-03: Logic follows Kleene; arithmetic keeps one type](mbse:mbse-expressions/python3/tests/02_Evaluators.ipynb#EVL-03) · TypeScript: [EVL-03: Logic follows Kleene; arithmetic keeps one type](mbse:mbse-expressions/typescript5/tests/02_Evaluators.ipynb#EVL-03)
   - Python: [EVL-07: A constraint about a value, bound to a variable, reads value objects and union values](mbse:mbse-expressions/python3/tests/02_Evaluators.ipynb#EVL-07) · TypeScript: [EVL-07: A constraint about a value, bound to a variable, reads value objects and union values](mbse:mbse-expressions/typescript5/tests/02_Evaluators.ipynb#EVL-07)
3. **Nothing is coerced.** *Why*: every language converts numbers by its own rules, and a constraint must mean the same
   everywhere. *When*: writing a literal, or comparing values of two kinds. *How*: an int and a float are different
   kinds of value, as in mbse-schemas: `1 == 1.0` is unknown, and adding an int to a float raises. Write each literal
   of the kind the data's schema has. The bitwise operations take ints, as two's complement of infinite width, and a
   shift an int count: a term carries no width (practice 4).
   - Python: [T10.4: No coercion](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.4) · TypeScript: [T10.4: No coercion](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.4)
   - Python: [EVL-02: Comparisons are three-valued and never coerce](mbse:mbse-expressions/python3/tests/02_Evaluators.ipynb#EVL-02) · TypeScript: [EVL-02: Comparisons are three-valued and never coerce](mbse:mbse-expressions/typescript5/tests/02_Evaluators.ipynb#EVL-02)
   - Python: [DOM-08: The bitwise operations take ints, as two's complement of infinite width, and shifts an int count](mbse:mbse-expressions/python3/tests/09_Domains.ipynb#DOM-08) · TypeScript: [DOM-08: The bitwise operations take ints, as two's complement of infinite width, and shifts an int count](mbse:mbse-expressions/typescript5/tests/09_Domains.ipynb#DOM-08)
4. **Only the operations a dialect defines are calls of it; validate what arrives as data.** *Why*: the core vocabulary
   is small, pure and total, so every binding evaluates it the same way; a constraint from a file or another program
   may be broken. *When*: before evaluating a constraint you did not write. *How*: `DIALECT.validate(expression,
   bound)`, of the expression that holds the constraint, lists what evaluating it would raise, empty when valid:
   variables nothing binds, wrong numbers of arguments, and calls of operations the dialect does not define ("'contains'
   is not an operation Patterns defines"). A term is validated within its holder, never alone: Patterns' operations are
   read from the holder's store, where `Patterns.define` names them. Evaluating such a constraint raises. A term carries no domain yet: values are taken by the schemas they are written with, ints
   unbounded and floats binary64, until
   [CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md).
   [CAP-095: Basic terms as data](mbse:mbse-basis/docs/capabilities/CAP-095.md#terms-and-the-core-vocabulary).
   - Python: [T09.4: Validating a constraint before it is evaluated](mbse:mbse-expressions/python3/tutorials/09_Constraints_As_Data.ipynb#T09.4) · TypeScript: [T09.4: Validating a constraint before it is evaluated](mbse:mbse-expressions/typescript5/tutorials/09_Constraints_As_Data.ipynb#T09.4)
   - Python: [T10.5: What raises](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.5) · TypeScript: [T10.5: What raises](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.5)
   - Python: [EVL-04: Checking: `validate()` finds what evaluation would raise](mbse:mbse-expressions/python3/tests/02_Evaluators.ipynb#EVL-04) · TypeScript: [EVL-04: Checking: `validate()` finds what evaluation would raise](mbse:mbse-expressions/typescript5/tests/02_Evaluators.ipynb#EVL-04)
5. **Constrain collections with quantifiers, not loops.** *Why*: a quantifier visits each item once, so a constraint
   over a collection stays bounded, total and pure, and the empty case is honest. *When*: a constraint about every
   item of a list, an object's related objects, or a set of values the constraint itself names. *How*: a container
   property reads as a collection, which `count`, `item` (by position from 0, or by key), `in`, `sum`, `min`, `max` and
   `unique` take; `all`, `any` and `count_where` bind a name to each item and test a body; `entries(name)` gives an
   object's entries in an adjacency as records, which `get` reads. The container constructors build one from terms:
   `E.list_(...)`, and `E.mapping(...)` of keys to values. All of nothing is true, any of nothing false, and the
   maximum of nothing unknown.
   [CAP-096: collections in expressions](mbse:mbse-basis/docs/capabilities/CAP-096.md#collections).
   - Python: [T11.1: A list is a collection](mbse:mbse-expressions/python3/tutorials/11_Constraints_Over_Collections.ipynb#T11.1) · TypeScript: [T11.1: A list is a collection](mbse:mbse-expressions/typescript5/tutorials/11_Constraints_Over_Collections.ipynb#T11.1)
   - Python: [T11.2: Quantifiers](mbse:mbse-expressions/python3/tutorials/11_Constraints_Over_Collections.ipynb#T11.2) · TypeScript: [T11.2: Quantifiers](mbse:mbse-expressions/typescript5/tutorials/11_Constraints_Over_Collections.ipynb#T11.2)
   - Python: [T11.3: Empty collections](mbse:mbse-expressions/python3/tutorials/11_Constraints_Over_Collections.ipynb#T11.3) · TypeScript: [T11.3: Empty collections](mbse:mbse-expressions/typescript5/tutorials/11_Constraints_Over_Collections.ipynb#T11.3)
   - Python: [T11.4: An object's related objects](mbse:mbse-expressions/python3/tutorials/11_Constraints_Over_Collections.ipynb#T11.4) · TypeScript: [T11.4: An object's related objects](mbse:mbse-expressions/typescript5/tutorials/11_Constraints_Over_Collections.ipynb#T11.4)
   - Python: [T11.5: Building a list or a mapping](mbse:mbse-expressions/python3/tutorials/11_Constraints_Over_Collections.ipynb#T11.5) · TypeScript: [T11.5: Building a list or a mapping](mbse:mbse-expressions/typescript5/tutorials/11_Constraints_Over_Collections.ipynb#T11.5)
   - Python: [COL-04: entries gives an object's entries in an adjacency as records, which get and has read](mbse:mbse-expressions/python3/tests/10_Collections.ipynb#COL-04) · TypeScript: [COL-04: entries gives an object's entries in an adjacency as records, which get and has read](mbse:mbse-expressions/typescript5/tests/10_Collections.ipynb#COL-04)
   - Python: [COL-05: Quantifiers bind a name to each item: all and any by Kleene's logic, count of the items the body holds for](mbse:mbse-expressions/python3/tests/10_Collections.ipynb#COL-05) · TypeScript: [COL-05: Quantifiers bind a name to each item: all and any by Kleene's logic, count of the items the body holds for](mbse:mbse-expressions/typescript5/tests/10_Collections.ipynb#COL-05)
   - Python: [COL-08: list and mapping construct collections from terms, which the collection operations and quantifiers read](mbse:mbse-expressions/python3/tests/10_Collections.ipynb#COL-08) · TypeScript: [COL-08: list and mapping construct collections from terms, which the collection operations and quantifiers read](mbse:mbse-expressions/typescript5/tests/10_Collections.ipynb#COL-08)
6. **Store and send a constraint as a value.** *Why*: one constraint, read by every program in every language, byte
   for byte. *When*: saving, loading or sending a constraint. *How*: a term is a nested value of
   `Expressions.Framework.Term`, written as its dialect, then its kind (the corpus's `expression` case pins the bytes,
   the same in both languages), so it serializes as any mbse-schemas value does: `JSON.ToJSON(store)(Term, term)` and `JSON.FromJSON(store)(Term, text)`
   (YAML likewise). `Terms.term(expression)` reads an expression's root term. A term is a value, not an object: a
   subterm used twice is written twice, and a term holds no cycle. An expression is a reference object, validated as
   any is; a schema of an expression (`Schemas.OfExpression`) links the expression it holds.
   [CAP-095: Basic terms as data](mbse:mbse-basis/docs/capabilities/CAP-095.md#validation-storage-and-writers).
   - Python: [T09.5: Saving and loading](mbse:mbse-expressions/python3/tutorials/09_Constraints_As_Data.ipynb#T09.5) · TypeScript: [T09.5: Saving and loading](mbse:mbse-expressions/typescript5/tutorials/09_Constraints_As_Data.ipynb#T09.5)
   - Python: [CONF-02: Every implementation has the same cases, and JSON is byte-identical across implementations](mbse:mbse-expressions/python3/tests/04_Conformance.ipynb#CONF-02) · TypeScript: [CONF-02: Every implementation has the same cases, and JSON is byte-identical across implementations](mbse:mbse-expressions/typescript5/tests/04_Conformance.ipynb#CONF-02)
   - Python: [EXP-03: A term is a nested value: written into another it is copied, so it holds no cycle](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-03) · TypeScript: [EXP-03: A term is a nested value: written into another it is copied, so it holds no cycle](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-03)
   - Python: [EXP-06: Round trips through Plain, JSON and YAML: a term written nested, its kind its branch's name](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-06) · TypeScript: [EXP-06: Round trips through Plain, JSON and YAML: a term written nested, its kind its branch's name](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-06)
   - Python: [EXP-07: An expression is a reference object; a schema's expression is linked by `HasRoot`, an extension adjacency](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-07) · TypeScript: [EXP-07: An expression is a reference object; a schema's expression is linked by `HasRoot`, an extension adjacency](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-07)
7. **Decide what you can now, with partial evaluation.** *Why*: a template's parameters are variables like any other,
   and a question waiting on one number is best handed to whoever has it. *When*: some variables are known and others
   are not. *How*: `Partials.OfAny(constraint, known)` evaluates what the known variables decide and keeps the rest:
   the residual, a writer, written where it is wanted. Kleene's logic simplifies it, and finished with the rest of the
   variables it gives what the constraint gives.
   [CAP-099: partial evaluation](mbse:mbse-basis/docs/capabilities/CAP-099.md#partials).
   - Python: [T12.1: One template, many products](mbse:mbse-expressions/python3/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.1) · TypeScript: [T12.1: One template, many products](mbse:mbse-expressions/typescript5/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.1)
   - Python: [T12.2: What the shipment decides](mbse:mbse-expressions/python3/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.2) · TypeScript: [T12.2: What the shipment decides](mbse:mbse-expressions/typescript5/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.2)
   - Python: [T12.3: The residual agrees with the constraint](mbse:mbse-expressions/python3/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.3) · TypeScript: [T12.3: The residual agrees with the constraint](mbse:mbse-expressions/typescript5/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.3)
   - Python: [T12.4: Lets of known values](mbse:mbse-expressions/python3/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.4) · TypeScript: [T12.4: Lets of known values](mbse:mbse-expressions/typescript5/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.4)
   - Python: [PAR-04: The residual agrees with evaluation in every scope that completes the known one, and is stored as any term](mbse:mbse-expressions/python3/tests/11_Partials.ipynb#PAR-04) · TypeScript: [PAR-04: The residual agrees with evaluation in every scope that completes the known one, and is stored as any term](mbse:mbse-expressions/typescript5/tests/11_Partials.ipynb#PAR-04)
8. **Analyze and rewrite constraints through their forms.** *Why*: every term of every dialect has a form, so an
   analysis is a loop or a fold, the same for any dialect. *When*: finding the constraints that read a property, the
   names a constraint needs, or rewriting every constraint one way. *How*: `Terms.form(term)` gives its kind,
   attributes and ordered arguments; `Terms.walk` visits each term, parents first; `Terms.fold` computes bottom up;
   `Terms.same` compares by structure; `Symbolics.free(term, DIALECT)` gives the names it needs from its scope, and
   `Symbolics.imports` the imports it declares. A
   rewriting is a translator from a dialect to itself, a list of rules ([Translating](references/translating.md)).
   [CAP-098: dialects over one framework](mbse:mbse-basis/docs/capabilities/CAP-098.md#the-framework).
   - Python: [T15.1: C](mbse:mbse-expressions/python3/tutorials/15_Constraints_For_Firmware_And_Hardware.ipynb#T15.1) · TypeScript: [T15.1: C](mbse:mbse-expressions/typescript5/tutorials/15_Constraints_For_Firmware_And_Hardware.ipynb#T15.1)
   - Python: [T13.1: A constraint is a tree of terms](mbse:mbse-expressions/python3/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.1) · TypeScript: [T13.1: A constraint is a tree of terms](mbse:mbse-expressions/typescript5/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.1)
   - Python: [T13.2: Which constraints read a property](mbse:mbse-expressions/python3/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.2) · TypeScript: [T13.2: Which constraints read a property](mbse:mbse-expressions/typescript5/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.2)
   - Python: [T13.3: Fold, bottom up](mbse:mbse-expressions/python3/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.3) · TypeScript: [T13.3: Fold, bottom up](mbse:mbse-expressions/typescript5/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.3)
   - Python: [T13.4: `same`](mbse:mbse-expressions/python3/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.4) · TypeScript: [T13.4: `same`](mbse:mbse-expressions/typescript5/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.4)
   - Python: [T13.5: Rewriting](mbse:mbse-expressions/python3/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.5) · TypeScript: [T13.5: Rewriting](mbse:mbse-expressions/typescript5/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.5)
   - Python: [FRM-03: `walk`, `fold` and `same` traverse through forms alone](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-03) · TypeScript: [FRM-03: `walk`, `fold` and `same` traverse through forms alone](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-03)
   - Python: [FRM-09: Symbolics: the names an expression needs, and the imports it declares](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-09) · TypeScript: [FRM-09: Symbolics: the names an expression needs, and the imports it declares](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-09)
9. **Keep the constraint in Patterns; translate it where it is checked.** *Why*: a translation keeps the constraint's
   form, not always its value: each dialect evaluates by its own language's rules (a missing property is unknown in
   Patterns, `#FIELD!` in Excel, an error in Python and MATLAB). *When*: a constraint must run in a spreadsheet, a
   pipeline, firmware or hardware, or be read back from one. *How*: `Translators.between(source, target).forward(term)`
   gives a writer of the target's term, written in a transaction; its `Text.ToText` writes its source; evaluate it with
   the target's evaluator, which models its rules. Load [Dialects](references/dialects.md) and
   [Translating](references/translating.md).
   [CAP-100: six languages' expression dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md#dialects),
   [CAP-101: translation between dialects](mbse:mbse-basis/docs/capabilities/CAP-101.md#translators).
   - Python: [T14.1: Translating](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.1) · TypeScript: [T14.1: Translating](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.1)
   - Python: [T14.2: Each language evaluates by its own rules](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.2) · TypeScript: [T14.2: Each language evaluates by its own rules](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.2)
   - Python: [T14.3: Reading constraints back](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.3) · TypeScript: [T14.3: Reading constraints back](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.3)
   - Python: [T15.1: C](mbse:mbse-expressions/python3/tutorials/15_Constraints_For_Firmware_And_Hardware.ipynb#T15.1) · TypeScript: [T15.1: C](mbse:mbse-expressions/typescript5/tutorials/15_Constraints_For_Firmware_And_Hardware.ipynb#T15.1)
   - Python: [T15.3: SystemVerilog](mbse:mbse-expressions/python3/tutorials/15_Constraints_For_Firmware_And_Hardware.ipynb#T15.3) · TypeScript: [T15.3: SystemVerilog](mbse:mbse-expressions/typescript5/tutorials/15_Constraints_For_Firmware_And_Hardware.ipynb#T15.3)
   - Python: [TRN-06: Translations evaluate alike where the dialects' rules agree, and apart where they do not](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-06) · TypeScript: [TRN-06: Translations evaluate alike where the dialects' rules agree, and apart where they do not](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-06)
10. **Nothing is imported or called unless the scope provides it.** *Why*: constraints travel as data, sometimes from
   people you do not fully trust. *When*: evaluating a dialect whose expressions import or call (Python, MATLAB,
   Excel). *How*: give its evaluator a scope that allowlists what it may reach: Python's modules, MATLAB's functions
   and packages, Excel's workbooks and add-ins ([Dialects](references/dialects.md#scopes-names-imports-and-references)).
   - Python: [T14.4: What a constraint may reach](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.4) · TypeScript: [T14.4: What a constraint may reach](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.4)
   - Python: [DIA-02: Python evaluates by Python's rules, in a scope that allowlists what an expression may reach](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-02) · TypeScript: [DIA-02: Python evaluates by Python's rules, in a scope that allowlists what an expression may reach](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-02)
   - Python: [DIA-05: MATLAB resolves functions from imports, the path and packages that the scope provides](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-05) · TypeScript: [DIA-05: MATLAB resolves functions from imports, the path and packages that the scope provides](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-05)
   - Python: [DIA-08: Excel reads cells from workbooks, and add-in functions from the workbook's add-ins](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-08) · TypeScript: [DIA-08: Excel reads cells from workbooks, and add-in functions from the workbook's add-ins](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-08)
11. **A dialect reads only its own terms.** *Why*: a kind of the same name means another thing in another language.
   *When*: mixing dialects in one store or one expression. *How*: each dialect's `Term` is the union of its kinds, a
   branch of `Expressions.Framework.Term` named after it; a term holds its dialect, and a dialect refuses another's by
   name ("a Patterns variable is not a Python3 term"). Write a dialect's terms with its own writers, or translate them.
   - Python: [FRM-04: Every dialect's install adds its union of its kinds to `Term`, and its terms round-trip](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-04) · TypeScript: [FRM-04: Every dialect's install adds its union of its kinds to `Term`, and its terms round-trip](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-04)
   - Python: [FRM-12: A dialect reads only its own terms: a term holds its dialect, a shared kind's slot holds any dialect's term, and validation reports another's; C and C++ each define the kinds they share](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-12) · TypeScript: [FRM-12: A dialect reads only its own terms: a term holds its dialect, a shared kind's slot holds any dialect's term, and validation reports another's; C and C++ each define the kinds they share](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-12)
   - Python: [EVL-05: The union of terms names each branch by its dialect, and a dialect's `Term` each by its kind's tag](mbse:mbse-expressions/python3/tests/02_Evaluators.ipynb#EVL-05) · TypeScript: [EVL-05: The union of terms names each branch by its dialect, and a dialect's `Term` each by its kind's tag](mbse:mbse-expressions/typescript5/tests/02_Evaluators.ipynb#EVL-05)
12. **Dialects, operations and domains are data.** *Why*: a program learns what a dialect can say from the store,
   without its code, and a domain is named once. *When*: listing a dialect's vocabulary, or reading a domain. *How*:
   a dialect's `define`, run after its install in a transaction of its own, writes its singleton, found by its global
   name (`store.Instances.Expressions.Patterns.Expressions`), which names its operations; a standard dialect's
   (`store.Instances.Expressions.ISOIEC11404.Expressions`) owns its domains by name, and so do the language dialects'
   whose `define` writes the types their standards define (C's, C++'s, SystemVerilog's, Python3's, TypeScript5's,
   MATLAB's, Excel's; LaTeX stores none), and the ABI dialects', the types C's and C++'s standards leave to the
   implementation. A domain is stored only for a type a language's standard, or a commonly used adjacent standard,
   defines: a program's own enums and typedefs get none. A published standard is a dialect
   of its own, holding its kinds of domain and its domains (`ISOIEC11404`'s `integer` and `octet`, `IEEE754`'s
   `binary32`, ...; each kind and domain named as its standard names it), installed before the dialects that use its
   kinds or its domains' schemas (Python3's complex number holds IEEE 754's `binary64`s). An
   operation is an expression schema: its pattern's variables are its arguments, in order, and its `result` is its
   return. Read a stored domain with the framework's `Domains.kind_of` (its dialect's tag, then its kind's: C's `nullptr_t` is not C++'s), `Domains.properties` (its parameters and its
   inferred properties, such as an integer's `least` and `greatest`) and `Domains.name_of`, a dialect's domains by
   name with `Domains.domains`, and its operations with `Domains.operations` and `Domains.arity`. The editions of the
   standards a dialect covers are data too, each owned by its designation as its standards body writes it
   (`ISO/IEC 9899:2011`) and holding its common names (`C11`) and the kinds it has: find one by either tag with
   `Standards.find`, and read it with `Standards.properties` and `Standards.kinds`.
   `DIALECT.infer(expression, domains)` finds a term's domain from its
   vocabulary's signatures, in code, and the domains its variables are given; a quantifier's name has its items'
   domain. For Patterns these are its values' natives' domains (`int`, `float`, ...) until domain inference reads the
   stored ones ([CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md)).
   [CAP-097: value domains of published standards](mbse:mbse-basis/docs/capabilities/CAP-097.md#value-domains).
   - Python: [EXP-13: Dialects, operations and domains are data: Patterns' singleton names its operations, and a standard dialect's owns its domains](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-13) · TypeScript: [EXP-13: Dialects, operations and domains are data: Patterns' singleton names its operations, and a standard dialect's owns its domains](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-13)
   - Python: [DOM-17: The standard dialects own the kinds and domains, with their inferred properties, read through the framework's interface](mbse:mbse-expressions/python3/tests/09_Domains.ipynb#DOM-17) · TypeScript: [DOM-17: The standard dialects own the kinds and domains, with their inferred properties, read through the framework's interface](mbse:mbse-expressions/typescript5/tests/09_Domains.ipynb#DOM-17)
   - Python: [DOM-18: A language's own kinds are its dialect's: SystemVerilog's logic and bit, Python3's, TypeScript5's, MATLAB's and Excel's strings, the tokens and Excel's errors](mbse:mbse-expressions/python3/tests/09_Domains.ipynb#DOM-18) · TypeScript: [DOM-18: A language's own kinds are its dialect's: SystemVerilog's logic and bit, Python3's, TypeScript5's, MATLAB's and Excel's strings, the tokens and Excel's errors](mbse:mbse-expressions/typescript5/tests/09_Domains.ipynb#DOM-18)
   - Python: [DOM-19: C's, C++'s and the ABI dialects' domains are stored: C's and C++'s defines write the types their standards fix, each ABI dialect's those they leave to the implementation, by name, of ISO/IEC 11404's and IEEE 754's kinds or a token's, with their properties and schemas; a holder names its ABI, and C's and C++'s types are read through it](mbse:mbse-expressions/python3/tests/09_Domains.ipynb#DOM-19) · TypeScript: [DOM-19: C's, C++'s and the ABI dialects' domains are stored: C's and C++'s defines write the types their standards fix, each ABI dialect's those they leave to the implementation, by name, of ISO/IEC 11404's and IEEE 754's kinds or a token's, with their properties and schemas; a holder names its ABI, and C's and C++'s types are read through it](mbse:mbse-expressions/typescript5/tests/09_Domains.ipynb#DOM-19)
   - Python: [DOM-20: SystemVerilog's domains are stored: its define writes IEEE 1800's built-in types, by name, of its kinds logic and bit or IEEE 754's, with their properties and, for the 2-state ones, their schemas](mbse:mbse-expressions/python3/tests/09_Domains.ipynb#DOM-20) · TypeScript: [DOM-20: SystemVerilog's domains are stored: its define writes IEEE 1800's built-in types, by name, of its kinds logic and bit or IEEE 754's, with their properties and, for the 2-state ones, their schemas](mbse:mbse-expressions/typescript5/tests/09_Domains.ipynb#DOM-20)
   - Python: [DOM-21: Python3's, TypeScript5's, MATLAB's and Excel's domains are stored: each define writes its dialect's, by name, with their kinds, properties and schemas](mbse:mbse-expressions/python3/tests/09_Domains.ipynb#DOM-21) · TypeScript: [DOM-21: Python3's, TypeScript5's, MATLAB's and Excel's domains are stored: each define writes its dialect's, by name, with their kinds, properties and schemas](mbse:mbse-expressions/typescript5/tests/09_Domains.ipynb#DOM-21)
   - Python: [FRM-13: Standards are data: each dialect covers its editions by designation, each found by its designation or its common names, and records the kinds it has](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-13) · TypeScript: [FRM-13: Standards are data: each dialect covers its editions by designation, each found by its designation or its common names, and records the kinds it has](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-13)
   - Python: [DOM-03: Domains are data: a dialect owns each by name, and each one's schema, an OfAny of its scalar, reads it](mbse:mbse-expressions/python3/tests/09_Domains.ipynb#DOM-03) · TypeScript: [DOM-03: Domains are data: a dialect owns each by name, and each one's schema, an OfAny of its scalar, reads it](mbse:mbse-expressions/typescript5/tests/09_Domains.ipynb#DOM-03)
   - Python: [FRM-07: `infer` finds an expression's domain from its vocabulary's signatures](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-07) · TypeScript: [FRM-07: `infer` finds an expression's domain from its vocabulary's signatures](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-07)
   - Python: [DOM-09: Signatures take the natives' domains and collections, so inference follows the domains an environment gives](mbse:mbse-expressions/python3/tests/09_Domains.ipynb#DOM-09) · TypeScript: [DOM-09: Signatures take the natives' domains and collections, so inference follows the domains an environment gives](mbse:mbse-expressions/typescript5/tests/09_Domains.ipynb#DOM-09)
   - Python: [COL-07: Collections have domains for inference: a quantifier's name has the items' domain](mbse:mbse-expressions/python3/tests/10_Collections.ipynb#COL-07) · TypeScript: [COL-07: Collections have domains for inference: a quantifier's name has the items' domain](mbse:mbse-expressions/typescript5/tests/10_Collections.ipynb#COL-07)

## Load the reference for your task
<!-- no case: a table routing each task to its reference -->

| Task | Read |
|---|---|
| Pick a dialect, write its expressions, give it a scope (imports, packages, workbooks) | [Dialects](references/dialects.md) |
| Translate between dialects, or rewrite within one; what survives a round trip | [Translating](references/translating.md) |
| Add a dialect or a translator | [Adding a dialect or a translator](references/extending.md) |
| Model the schemas the expressions refer to | the [mbse-schemas skill](mbse:mbse-schemas/skills/mbse-schemas/SKILL.md) |

## In each language

The two implementations are equivalent: the same names, results, messages and JSON. Where a language forces a
difference (mbse-expressions' [Equivalence of the implementations](mbse:mbse-expressions/docs/EQUIVALENCE.md#deliberate-differences)),
each case shows its own:

- **Values.** Python's ints and floats are `int` and `float` (`18`, `18.0`), and unknown is `None`; TypeScript's are
  `bigint` and `number` (`18n`, `18`), and unknown is `null`. In TypeScript `18` is a float, so `ge(get(x, 'age'), 18)`
  against an int age is unknown. Python's `True` is not an int, though its `bool` subclasses `int`.
  - Python: [T10.1: Absent is unknown](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.1) · TypeScript: [T10.1: Absent is unknown](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.1)
  - Python: [T10.4: No coercion](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.4) · TypeScript: [T10.4: No coercion](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.4)
  - Python: [EVL-02: Comparisons are three-valued and never coerce](mbse:mbse-expressions/python3/tests/02_Evaluators.ipynb#EVL-02) · TypeScript: [EVL-02: Comparisons are three-valued and never coerce](mbse:mbse-expressions/typescript5/tests/02_Evaluators.ipynb#EVL-02)
- **Transactions and arguments.** Python writes within `with store.transaction():`; TypeScript within
  `store.transaction(() => ...)`, which gives back what its function returns. Python passes options by keyword
  (`validate(term, bound={"x"})`, `Scope(variables, modules={...})`); TypeScript positionally (`validate(term,
  ["x"])`) or in an options object (`new Scope(variables, { modules })`).
  - Python: [T09.1: Writing a constraint](mbse:mbse-expressions/python3/tutorials/09_Constraints_As_Data.ipynb#T09.1) · TypeScript: [T09.1: Writing a constraint](mbse:mbse-expressions/typescript5/tutorials/09_Constraints_As_Data.ipynb#T09.1)
  - Python: [T09.4: Validating a constraint before it is evaluated](mbse:mbse-expressions/python3/tutorials/09_Constraints_As_Data.ipynb#T09.4) · TypeScript: [T09.4: Validating a constraint before it is evaluated](mbse:mbse-expressions/typescript5/tutorials/09_Constraints_As_Data.ipynb#T09.4)
  - Python: [T14.4: What a constraint may reach](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.4) · TypeScript: [T14.4: What a constraint may reach](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.4)
- **Mappings and frames.** A mapping's entries are tuples in Python (`E.mapping(("lo", 0.5))`), arrays in TypeScript
  (`E.mapping(["lo", 0.5])`); a mapping given as data is a `dict` in Python, a `Map` or a plain object in TypeScript,
  and a transaction's frame is a `dict` in Python, a `Map` in TypeScript (`.get("octet")`).
  - Python: [T11.5: Building a list or a mapping](mbse:mbse-expressions/python3/tutorials/11_Constraints_Over_Collections.ipynb#T11.5) · TypeScript: [T11.5: Building a list or a mapping](mbse:mbse-expressions/typescript5/tutorials/11_Constraints_Over_Collections.ipynb#T11.5)
  - Python: [COL-08: list and mapping construct collections from terms, which the collection operations and quantifiers read](mbse:mbse-expressions/python3/tests/10_Collections.ipynb#COL-08) · TypeScript: [COL-08: list and mapping construct collections from terms, which the collection operations and quantifiers read](mbse:mbse-expressions/typescript5/tests/10_Collections.ipynb#COL-08)
  - Python: [EXP-13: Dialects, operations and domains are data: Patterns' singleton names its operations, and a standard dialect's owns its domains](mbse:mbse-expressions/python3/tests/01_Expressions.ipynb#EXP-13) · TypeScript: [EXP-13: Dialects, operations and domains are data: Patterns' singleton names its operations, and a standard dialect's owns its domains](mbse:mbse-expressions/typescript5/tests/01_Expressions.ipynb#EXP-13)
- **Names.** The API is the same name for name, snake_case included (`Domains.items_of`), except the framework's reads
  of terms, camelCase in TypeScript: `Terms.name_of`, `kind_of`, `dialect_of` and `attributes_of` are `Terms.nameOf`,
  `kindOf`, `dialectOf` and `attributesOf` (a `Map`). A translator's pattern takes its attributes by keyword in Python
  (`Pattern("call", A, B, callable="eq")`), first in TypeScript (`new Pattern("call", { callable: "eq" }, A, B)`).
  TypeScript makes an object of a class with `new` (`new Hole("A")`, `new Pairwise(...)`, `new Scope(...)`), where
  Python calls the class.
  - Python: [FRM-02: Forms and `make` are inverses, for every kind of every dialect](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-02) · TypeScript: [FRM-02: Forms and `make` are inverses, for every kind of every dialect](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-02)
  - Python: [T13.5: Rewriting](mbse:mbse-expressions/python3/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.5) · TypeScript: [T13.5: Rewriting](mbse:mbse-expressions/typescript5/tutorials/13_Analyzing_And_Rewriting_Constraints.ipynb#T13.5)
  - Python: [TRN-01: Rules pair patterns; holes bind arguments and attributes](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-01) · TypeScript: [TRN-01: Rules pair patterns; holes bind arguments and attributes](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-01)
- **Python's expressions.** Python's Python3 dialect evaluates with real modules (numpy among them, with the `numpy`
  extra) and parses source with `Text.FromText`; TypeScript's models Python's rules, its modules are
  `new Python3.Evaluators.Module(name, { members })`, it has no numpy, and it has no `FromText`: build the same
  expression with the dialect's constructors. JavaScript has no `Ellipsis` or complex numbers: `P.constant(P.ELLIPSIS)`
  and `new P.Complex(0, 2)` stand for them, and keyword-only arguments are an options object
  (`P.lambda_(body, ["a"], { kwarg: "k" })`).
  - Python: [T14.3: Reading constraints back](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.3) · TypeScript: [T14.3: Reading constraints back](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.3)
  - Python: [T14.4: What a constraint may reach](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.4) · TypeScript: [T14.4: What a constraint may reach](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.4)
  - Python: [DIA-01: Python: expressions as `ast` has them, with their imports; rendered and parsed as source](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-01) · TypeScript: [DIA-01: Python: expressions as `ast` has them, with their imports; rendered and parsed as source](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-01)
  - Python: [DIA-02: Python evaluates by Python's rules, in a scope that allowlists what an expression may reach](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-02) · TypeScript: [DIA-02: Python evaluates by Python's rules, in a scope that allowlists what an expression may reach](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-02)
- **Errors.** TypeScript's `NameError`, `ImportError`, `ZeroDivisionError` and `OverflowError` are classes of those
  names in `@mbse/expressions/Framework`'s `Errors`. Excel's error values are equal by value in Python
  (`Error("#FIELD!")`), and one instance per code in TypeScript (`Error.of("#FIELD!")`, compared with `===`).
  - Python: [T10.5: What raises](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.5) · TypeScript: [T10.5: What raises](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.5)
  - Python: [T14.2: Each language evaluates by its own rules](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.2) · TypeScript: [T14.2: Each language evaluates by its own rules](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.2)
  - Python: [DIA-07: Excel coerces, orders values of every type, and computes with errors](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-07) · TypeScript: [DIA-07: Excel coerces, orders values of every type, and computes with errors](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-07)
- **Traps of both.** Each store has its own schemas: run each install once per store, and an install and what uses it
  in separate transactions. Transactions do not nest: build what a writer needs, a translation's source term say,
  before opening the one that writes it. A translation and a residual give writers, not terms: write them before
  rendering or evaluating them. Evaluating an operation the dialect does not define raises: validate first.
  - Python: [T14.1: Translating](mbse:mbse-expressions/python3/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.1) · TypeScript: [T14.1: Translating](mbse:mbse-expressions/typescript5/tutorials/14_One_Constraint_Many_Languages.ipynb#T14.1)
  - Python: [T12.1: One template, many products](mbse:mbse-expressions/python3/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.1) · TypeScript: [T12.1: One template, many products](mbse:mbse-expressions/typescript5/tutorials/12_Deciding_What_You_Can_Now.ipynb#T12.1)
  - Python: [T10.5: What raises](mbse:mbse-expressions/python3/tutorials/10_Answers_You_Can_Trust.ipynb#T10.5) · TypeScript: [T10.5: What raises](mbse:mbse-expressions/typescript5/tutorials/10_Answers_You_Can_Trust.ipynb#T10.5)

## Learn it by example
<!-- no case: points to the tutorials and the test plan as a whole -->

The tutorials teach it in two parts, each notebook committed with its outputs and run as a test: Part I, how values,
their domains and each language's expressions are modeled, from one literal up (tutorials 1 to 6; 7 and 8 after the dialects' retrofit), and
Part II, seven case studies on constraints (9 to 15), from a first constraint to C and SystemVerilog: [Python](mbse:mbse-expressions/python3/tutorials/README.md)
and [TypeScript](mbse:mbse-expressions/typescript5/tutorials/README.md). The test plan,
[Test plan — python3](mbse:mbse-expressions/python3/tests/TestPlan.md), lists every case.
