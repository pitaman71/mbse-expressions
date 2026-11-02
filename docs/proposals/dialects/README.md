<!-- nav -->
[← FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md) · [Home](../../../README.md) · [The gaps, dialect by dialect →](GAPS.md)

# Complete expression dialects (a proposal, for review)

mbse-programs is porting to the stabilized mbse-schemas and to this repository, and the user decided that its
expressions are this repository's dialects, whole: "`mbse-programs` should make use of
`mbse-expressions.Dialects.<lang_ver>.Expression`. Yes, this means the expression dialect must completely cover the
AST" (mbse-programs, [its port](../../../../mbse-programs/docs/proposals/port/README.md#decided), Decided). Its
stage 1 is this repository's: "complete dialects by major version" (its 0.8.0). Today a dialect here holds the terms
of a constraint, a fraction of its language's expressions. This proposes how each target dialect becomes complete, and
asks what only the user can decide. No code is written until it is decided.

## Where it stands

Counted in both languages alike; the tables are in [the gaps, dialect by dialect](GAPS.md).

- **This repository (0.7.0)** has seven dialects over one union of terms, each adding its kinds by schema extension,
  tagged `<dialect>_<kind>`, and reusing the framework's six (`literal`, `variable`, `let`, `call`, `list`,
  `mapping`) where the shape matches. Its own kinds: Python 12, Ccpp 7, SystemVerilog 14 (Basic 1, Matlab 6, Excel 5,
  Latex 4). Every dialect prints (`Text.ToText`); only Python reads text, through CPython's `ast`, in Python only (a
  listed deliberate difference). Six dialects evaluate; twelve translators, six of which touch Python, Ccpp or
  SystemVerilog. No parser is a dependency. Tests: 11 suites, 92 cases a language; 7 tutorials; 9 corpus cases.
- **mbse-programs (0.3.28)** has expression kinds per language: Python 29 and 11 helpers, TypeScript 35 and 5 (and
  11 of JSX), Ccpp 46 and 23, Verilog 40 and about 20; with the sublanguages expressions hold beside them (TypeScript's
  37 type nodes, Python's and SystemVerilog's patterns, SystemVerilog's 15 properties and sequences and 8 constraint
  kinds). Its standards record when each kind and feature arrived (`SINCE`, `FEATURES`). It reads Python, TypeScript
  and C and C++ with tree-sitter grammars in both languages (the same grammar versions: Python's bindings and
  `web-tree-sitter`), each lagging its standard and patched by a pre-pass, and SystemVerilog with slang in Python
  alone, which TypeScript reaches through a subprocess. Every parser refuses invalid syntax at its first error.
- **The gap.** Python: 17 kinds here against `ast`'s 29 and 4 helpers; five of ours are narrower than `ast`'s (a
  comparison of one operator, `and` and `or` of two operands, a generator of one `for`, a call without keywords, a
  subscript split in two), and two have no counterpart in Python's grammar (`import` and `importfrom` within an
  expression). TypeScript: no dialect here. C and C++: 9 kinds here against mbse-programs' 46 and its helpers.
  SystemVerilog: 17 here against 40 and its helpers. Nothing in mbse-programs' expressions is missing here by
  design: everything there but concrete syntax and preprocessor kinds is to be added.
- **Native parsers.** Only tree-sitter grammars give the same tree in both languages, and each lags its standard. Each
  reference front end runs in one language only: CPython's `ast` (Python), the TypeScript compiler API (Node), Clang
  (Python, through libclang), slang (Python, through pyslang). TypeScript 6.0 has shipped and 7.0 is native; a
  `TypeScript5` dialect covers 5.0 to 5.9. C++26 is outside `Cpp23`.

## Decided, that applies

The user's (2026-11-02, mbse-programs' [port](../../../../mbse-programs/docs/proposals/port/README.md#decided),
Decided; quoted as written):

- **Complete, and gaps filled here.** "`mbse-programs` should make use of `mbse-expressions.Dialects.<lang_ver>.Expression`.
  Yes, this means the expression dialect must completely cover the AST. Rather than using schema-extension, if there
  are any gaps in the dialect as modeled in `mbse-expressions.Dialects.<lang_ver>`, they should be added into
  `mbse-expressions`. There is no reason for an expression dialect to exist that is ia subset of the corresponding
  node of AST in the real langauge."
- **By major version.** "language dialects each of which supports a major version of a target language and all of
  the minor versions in it, such as Python3 or Typescript5. This means each language dialect must correctly handle
  the closure of syntaxes across minor versions such as 3.11 - 3.14." C and C++ by standard: "Maybe C11, C17, C23
  Cpp17, cpp20, cpp23" (tentative; C17 adds no syntax over C11; *superseded*: `C` and `Cpp`, Decided, 3, below). "yes keep verilog as a subset of systemverilog,
  presuming that is how the standards are partitioned" (it is: IEEE 1800-2009 merged IEEE 1364).
- **Each dialect its own holder.** Asked whether each dialect has its own expression holder or the framework's one
  restricted to it, the user answered "3.", naming `mbse-expressions.Dialects.<lang_ver>.Expression`. *Superseded*
  (2026-11-02): `Expressions.<Dialect>.Expression` is the dialect's union of its kinds, the holder the framework's
  (Decided, below, "1. Names, and 4's holder").
- **Terms are values.** "Expression terms are value objects. An instance of OfSchemas.Expression holds the expression
  root." Files, scopes and statements are owned reference objects, in mbse-programs.
- **A native parser.** "`mbse-programs` typically uses a "native parser" or "tree walker" that conforms to and tracks
  evolution of publish standards. To the degree that the chosen "native parser" supports parsing and preserving
  invalid syntax, `mbse-programs` should also."
- **Its stage 1**, as mbse-programs' proposal draws it: each dialect "covers its language's whole expression syntax
  across its minor versions and has its own `Expression` holder (`Expressions.<Dialect>.Expression`) ... Evaluation may
  stay partial; the model, parsing and printing are complete. Proposed for the user's review in mbse-expressions' own
  proposal before it is built." (*Superseded* there: the holder is the framework's, Decided, 1, below; parsing is
  mbse-programs', Decided, 6.)

This repository's ([the port](../port/README.md#decided) and [its API](../port/API.md)): terms are one nested value
held by an `Expressions.Framework.Expression`, linked from a schema by `HasRoot`; "refinement has been superseded by
schema extension" and "ah, schema *extension* is the preferred form"; "a dialect reuses the framework's kinds wherever
the shape matches" ("yes", 2026-10-30); "yes, each dialect has a singleton by name"; "Terms do not designate their
schema", type inference deferred. And the standing rules: "Never guess the schema"
([PRI-025: never guess the schema](../../../../mbse-basis/docs/PRINCIPLES.md#PRI-025)); "Never use wire format in examples";
"Do not invent another DSL by wrapping builder syntax"
([PRI-019: fluent builder syntax](../../../../mbse-basis/docs/PRINCIPLES.md#PRI-019));
[PRI-012: model published standards](../../../../mbse-basis/docs/PRINCIPLES.md#PRI-012) and
[PRI-002: preserve, don't lose](../../../../mbse-basis/docs/PRINCIPLES.md#PRI-002).

## Decided

As the user decided (2026-11-02), on the questions below:

- **1. Names, and 4's holder: a union of dialects' unions** (2026-11-02). Asked about branch tags ("I don't
  understand the `python_` prefix"; "I don't know that we need `Expressions.Framework.Term`"; "or the slots can use
  `Expressions.Framework.Expression`"), the user: "OK if instead we keep `Expressions.Framework.Term`, that can be a
  union of `Expressions.Dialects.<lang_ver>.Expression` which is itself a union." Shown the consequences, "yes":
  `Expressions.Framework.Term` is a union whose branches are the dialects (`python3`, `typescript5`, `c`, `cpp`,
  `systemverilog`, `patterns`, `matlab`, `excel`, `latex`), each branch's schema that dialect's union of its kinds,
  `Expressions.<Dialect>.Expression`, whose branches are named plainly (`binop`, `compare`): no `<dialect>_` prefix,
  each name unique where it is defined. A dialect's own kinds name its union in their term slots, so its terms nest
  only its terms by schema; the framework's shared kinds (`literal`, `variable`, `let`, `call`, `list`, `mapping`) name
  `Expressions.Framework.Term`, holding any dialect's term, constraints deciding what is allowed, and each dialect's
  union lists the shared kinds it reuses among its branches. Where `Framework.Term` is held, a term is written with its
  dialect, then its kind, as a restricted `OfAny` is (mbse-basis CAP-069). The holder stays the framework's:
  `Expressions.Framework.Expression`, a reference object whose `root` holds a `Framework.Term`, linked by `HasRoot` as
  today; `Expressions.<Dialect>.Expression` is the dialect's union, not a holder. Tried against mbse-schemas 0.26.5: a
  union whose branches are unions validates, builds and round-trips through a snapshot. This supersedes question 1's
  prefixed tags and question 4's per-dialect holder (its options (a) to (c)).
- **2. Whose kinds**: "yes to both": mbse-programs' kinds, names and shapes, ours narrower replaced; what has no
  counterpart in the grammar kept, marked as an extension; concrete syntax kept, so source prints back as written.
- **3. C and C++ by standard**: "it sounds like having 6 different dialects is overkill. what would you recommend?"
  Recommended: two dialects, `C` and `Cpp`, each covering every standard of its language (C11 to C23, C++17 to C++23),
  each kind recording as data the standards that have it, as mbse-programs' standards do (`SINCE`) and as
  `SystemVerilog` records Verilog; separate, since C++ is not a superset of C; one union each, so that no union is
  completed by extension; whether a construct is in a standard a constraint, as decision 4 has validation. The user:
  "yes". The dialects are then `Python3`, `TypeScript5`, `C`, `Cpp` and `SystemVerilog`, one rule for all: a dialect
  per language and major version, covering its minor versions or standards.
- **4. Each dialect's own `Expression`**: "validation will be by constraints not by schema": the framework's kinds
  with term slots (`let`, `call`, `list`, `mapping`) stay shared, as decided 2026-10-30, their slots any dialect's
  term; that a dialect's expression holds only its own terms is a constraint, not the schema's closure. Option (ii).
- **5. What "completely cover the AST" includes**: "(i)": a body (a function's, an arrow's, a lambda's) is not part
  of the term; mbse-programs relates its statements to what holds the expression. Sublanguages an expression holds
  (types, patterns, JSX, SystemVerilog's sequences and properties) are the dialect's, as recommended (a).
- **6. Where text is read**: "yes fix that phrase": (b), the model and printers here, the parsers mbse-programs';
  mbse-programs' stage 1 no longer says "parsing ... complete".
- **7. Invalid syntax**: "agreed": `error` and `missing`, framework kinds, modeled now, written later by parsers that
  keep them.
- **8. Evaluation**: "agreed we can keep a shallow evalluator in mbse-expressions": new kinds refused by evaluation by
  name; what is evaluated today keeps working.
- **9. The other dialects and the translators**: "yes".
- **Python's subscript is a tensor's** (2026-11-02): "For python, subscript must support any datatype that tensors
  might use." Proposed, and confirmed ("I think your subscript interpretation is fine."): one `subscript` kind (`value`, `slice`, its index any term), with
  `Slice` (`lower`, `upper`, `step`, each optional) and `Tuple` for several dimensions, as `ast` has them, replacing
  `subscript` and `index`; so integers (negative too), slices, tuples of them, `...`, `None` (a new axis), boolean
  masks, integer arrays and starred indices (3.11) are each an index. `None`, `...` and complex numbers (`1j`) have no
  schema in mbse-schemas, so no literal holds them, whatever it holds (a literal holds any value, below): `Python3`
  defines a constant kind of its own for them, as a dialect does where a shape differs. Modeled, validated and printed; evaluating tensor
  indexing is left to a later evaluator.
- **A literal holds any value** (2026-11-02): told that "the five basic scalars" was the agent's gloss of "yes restrict
  `literal` to scalars" (2026-10-30, the port's stage 3 Decided, 3), the user: "I don't think that rule about "literal
  is restricted to the five basic scalars" is useful. May have been a hallucination or exaggeration." Then, to the
  recommendation, "Yes. This merits its own CAP item too": a `literal`'s `value` is an unrestricted `Schemas.OfAny`
  (scalars, containers, value objects), superseding the restriction to scalars; a container may then be written as a
  literal or by a constructor (`list`, `mapping`). `Python3` defines a constant kind of its own for what mbse-schemas has
  no schema for (`None`, `...`, complex numbers). Its own capability item in mbse-basis.
- **A literal is a domain representation** (2026-11-02): asked whether a literal keeps its spelling beside its value
  (the proposal's question 2, "to settle in stage 2"), the user: "See PRI-023" (mbse-basis
  [PRI-023: domain representations](../../../../mbse-basis/docs/PRINCIPLES.md#PRI-023): "A domain representation carries
  three things at once: unvalidated data, usually in string form; a validation indicator for each possible validation
  error; and encoded properties"). Proposed, and confirmed ("it does"): a `literal` holds `text`, its source spelling,
  unvalidated, filled by parsers and kept where it does not parse (`0x10`, `r'\n'`, `8'hFF`); `problems`, a
  validation indicator for each possible error (an invalid digit, a value out of range, an unterminated string); and
  `value`, the encoded value (any value), absent where the text is invalid. A dialect's literal adds the other
  properties its text encodes (a base, digit separators, a string's prefix and quotes, C's `u` and `f` suffixes, which
  keep a C literal's suffix until domains give it meaning). A literal written in code has a `value` and no `text`, and
  printers write a default spelling. Whitespace and comments between tokens are not a literal's.
- **Basic is renamed Patterns; a quantifier takes a pattern** (2026-11-02): "former `Expressions.Dialects.Basic` should
  be renamed `Expressions.Dialects.Patterns`. Any quantiier should take a Schemas.OfPattern as its sole argument." (As
  first written, "a Schemas.OfPredicate"; asked, since mbse-schemas has none since the store overhaul's 4d, the user
  corrected it to `Schemas.OfPattern`.) Proposed reading, confirmed ("Yes", below): the pattern's symbols and variables
  are what the quantifier binds, its `spec` what it ranges over (in place of a collection), its `requires` what it
  tests (in place of a body); `all` holds when every frame the spec matches meets `requires`, `any` when one does,
  `count` is how many do.
  To the proposed reading: "Yes, patterns need to be enabled to bind container expressions. I think we need a
  `contains(var, path.to.container)` expression that can be used with variables in a pattern. Better even still if
  the path expression itself can contain variable and symbol references." First proposed (*superseded* by the visitor
  method, below): `contains` a kind of the Patterns dialect, its first argument a pattern variable, its second a path term (`get` and `item`
  applied to the pattern's symbols and variables, which a term names as it names any variable); in a pattern it binds
  the variable to each element of the container, the frame fanning out into one frame per element, as the "spread"
  case decided 2026-10-28 has it for a variable over a finite domain (question 7 of the port: "(b) is in the plan"). Asked whether it belongs in a pattern's `spec` or its `requires`: "yes, in a spec. Maybe 'contains' is a visitor
  method." So, tentatively: `contains` is a method of mbse-schemas' container visitor, called within a spec written in
  the builders' fluent syntax over the pattern's symbols and variables (`_.shipment.readings.contains(_.c)`, its path the
  spec's own), recorded by the spec and fanned out by the executor; not a term kind of the Patterns dialect. Work for
  mbse-schemas (patterns and specs, containers), its execution waiting on the parked map and reduce. Then: "Maybe
  'contains' is a method on `Visitors.OfContainer` *and* `Visitors.OfAdjacency`": over an adjacency, it ranges over
  the object's entries (as Basic's `entries(c, 'phones')` does today). Asked what it binds there, the user: "in a
  container, `contains` can only be called with a value or variable of compatible schema / in an adjacency,
  `contains` can only be called with a symbol or builder of compatible schema". So a container's `contains` takes a
  value (the container must hold it) or a variable (bound to each element), whose schema is compatible with the
  element's; an adjacency's takes a symbol (bound to each object at the other end) or a builder (an object the spec
  writes there), whose schema is compatible with that end's.

## Questions for the user

1. **Names.** Proposed: the module, schemas and singleton renamed by dialect (`Python` to `Python3`,
   `Expressions.Python3.BinOp`, singleton `Expressions.Python3`; `Ccpp` to the C and C++ dialects, question 3;
   `SystemVerilog` kept), with no alias, a breaking change released as 0.8.0. For the branch tags: (a) renamed with the
   dialect (`python3_binop`); (b) kept (`python_binop`), stale beside `Python3`; (c) unqualified (`binop`), possible only
   if each dialect has a union of its own (question 4) and the framework's no longer collects every dialect's.
   *Recommended: (a), the tag naming the module that defines the kind, so that a kind several C or C++ dialects share
   has one tag (question 3).*
2. **Whose kinds, in what shape.** (a) mbse-programs' kinds, names and shapes, which follow each language's parser
   (`ast` for Python, typescript-estree for TypeScript), so that its stage 2 maps them one to one; our narrower kinds
   replaced by them (a comparison chain, `and` of n operands, comprehensions of several `for`s, calls with keywords,
   one `Subscript`), their evaluators and translators following. (b) Ours kept beside theirs, two shapes of one
   construct. Within (a): what has no counterpart in the grammar (Python's `import` and `importfrom` in an expression,
   `let` as `(lambda name: body)(value)`) is (i) kept, marked as an extension, as mbse-programs marks JSX, or (ii)
   removed. And concrete syntax (`Parenthesized`, a literal's spelling, adjacent strings): (i) kept, so that source
   prints back as written, a literal holding its spelling and its value; (ii) abstract only, mbse-programs printing by
   precedence. *Recommended: (a), with (i) and (i); the spelling against the value is to settle in stage 2.*
3. **C and C++ by standard.** C17 adds no syntax over C11, and each later standard is largely a superset of the one
   before. (a) A dialect per standard (`C11`, `C17`, `C23`, `Cpp17`, `Cpp20`, `Cpp23`), each its own singleton, union
   and `Expression`, its union naming the branches its standard has, each kind's schema defined once in a module its
   family shares (`Expressions.C.Binary`), so that no kind is copied. (b) A dialect per language (`C`, `Cpp`), covering
   every standard, each kind recording the standards that have it, as mbse-programs' standards do (`SINCE`). (c) As
   (a), a later standard's union completed by schema extension of the earlier's: not possible as built, since an
   extension changes the union itself, so `C11`'s would gain `C23`'s kinds wherever both are installed. And (d) whether
   `C17` exists, identical to `C11`.
   Reconciling the two rules: "Rather than using schema-extension, ... they should be added into `mbse-expressions`"
   says where a gap is filled, here and not by mbse-programs extending a dialect from outside; "schema *extension* is
   the preferred form" says how a dialect adds its kinds to a union, within this repository. Both stand under (a) or
   (b). What stays open is whether a dialect's own union may be completed by extension at all, or must declare every
   branch itself; (a) needs the second. And "no reason for an expression dialect to exist that is ia subset" would
   forbid `Ccpp` staying as it is, and also a `C11` or a `Cpp17` holding less than its standard.
   SystemVerilog: one dialect, Verilog its subset recorded as which standards have each kind, as (b) does.
   *Recommended: (a), the user's lean; (d) answered by the user.*
4. **What "its own `Expression`" is.** Each dialect an `Expressions.<Dialect>.Expression`, a reference object whose
   `root` is the dialect's own union of terms, `Expressions.<Dialect>.Term`; `HasRoot` and `Schemas.OfExpression`'s
   adjacency `expression` reach it as: (a) a kind union `Expressions.Framework.Expression` that each dialect's install
   extends with its holder, as `Expressions.Framework.Dialect` collects the dialects' singletons
   ([API](../port/API.md), Settled in stage 3, 16); (b) each holder refining `Expressions.Framework.Expression`, as
   mbse-programs' statements refine `Statement`, if a refinement may narrow `root`'s schema (to check in
   mbse-schemas); (c) each dialect its own `HasRoot`. A union of its own closes a dialect only if its term slots hold
   that union too, so the framework's kinds with term slots (`let`, `call`, `list`, `mapping`) cannot be shared as they
   are (decided 2026-10-30): (i) each dialect defines its own where it has the construct; (ii) they stay shared, their
   slots any dialect's term, and validation reports a term of another dialect. And whether `Expressions.Framework.Term`
   still collects every dialect's kinds, for Basic and the translators. *Recommended: (a) and (i), the framework's
   term union kept for the translators; `literal` and `variable`, which hold no terms, stay shared where their shape
   matches.*
5. **What "completely cover the AST" includes.** Expressions hold sublanguages: types (TypeScript's 37 type nodes,
   C's and C++'s type names in casts, `sizeof` and `new`, SystemVerilog's data types in casts), patterns (TypeScript's
   destructuring, SystemVerilog's `matches`), SystemVerilog's sequences, properties and constraint items, and JSX; and
   statements (function, arrow and class bodies, C++ lambdas' bodies, GNU statement expressions). (a) Every
   sublanguage an expression holds is the dialect's, each a union of its own beside `Term` (`Expressions.TypeScript5.Type`).
   (b) Expressions only, the sublanguages mbse-programs': then a dialect is a subset at `x as T`. Statements are owned
   reference objects in mbse-programs and a value cannot hold one: (i) a body is not part of the term, and mbse-programs
   relates its statements to what holds the expression; (ii) statements within an expression are values there. Python's
   `match` patterns and type parameters belong to statements, not expressions. *Recommended: (a); statements in
   expressions for the user's direction, with mbse-programs' stage 2.*
6. **Where text is read.** (a) Here: each dialect's `Text.FromText` over its native parser, a dependency in both
   languages (tree-sitter grammars, the one parser alike in both; slang only in Python). (b) Here the model and the
   printers only; the parsers are mbse-programs', which reads the native parser's tree into owned statements and the
   dialect's terms in one walk, as its stage 2 has it. This keeps
   [PRI-011: the lowest repository that can own it](../../../../mbse-basis/docs/PRINCIPLES.md#PRI-011) ("parsers and
   dialect bridges in mbse-programs") and [CAP-100: six languages' expression dialects](../../../../mbse-basis/docs/capabilities/CAP-100.md#decided-by-an-agent-for-review)'s
   "No dialect gains a parser here", but not mbse-programs' stage 1 text ("the model, parsing and printing are
   complete"). Completeness is then checked here against each grammar's node list, kept as data (`ast`'s, a
   grammar's `node-types.json`, slang's), every node a kind or listed as not an expression. Python's `FromText` stays
   until mbse-programs reads Python3, then moves there. (c) As (b), with mbse-programs moving to reference front ends,
   their trees exchanged as JSON snapshots between the languages (FEA-008, Design): later, not here.
   *Recommended: (b).*
7. **Invalid syntax.** Every parser refuses it today. (a) Two framework kinds every dialect's union holds: `error`,
   what the parser skipped and the terms it recovered within it, and `missing`, the kind the parser expected, written
   by a parser that keeps them (tree-sitter's `ERROR` and `MISSING`, slang's skipped and missing tokens); CPython's
   `ast` keeps nothing, so Python3 read by it refuses, by position. (b) Kinds per dialect. (c) Refused, as today,
   until a parser keeps them. *Recommended: (a), modeled in stage 1, written by mbse-programs' parsers later.*
8. **Evaluation of the new kinds.** (a) Validated, printed, stored and translated where a rule exists, but refused
   by evaluation by name ("Python3 Lambda is not evaluated"), each evaluator's growth a follow-up capability; the
   narrower kinds replaced (question 2) keep what they evaluate today. (b) A subset evaluated now (Python's tuples,
   sets, keyword arguments, comprehensions), in both languages, TypeScript's model of Python's rules growing with it.
   *Recommended: (a).*
9. **The other dialects and the translators.** Basic, Matlab, Excel and Latex keep their kinds, changed only as
   questions 1 and 4 change every dialect's install. The translators keep what they translate today, retargeted to the
   renamed dialects; a new kind has no counterpart and is refused by name, as TRN-05 asserts today. Basic and C, and
   Basic and C++, are one rule set each over the kinds a family shares, applied to each standard (question 3).
   `TypeScript5` has no translator yet. *Recommended as stated.*

## Stages (proposed, once decided)

Each passes both gates at 100% in both languages, with the corpora regenerated; the tutorials and the skill follow each
change as it lands.

1. **The decisions recorded**: this proposal decided; in mbse-basis, a capability per complete dialect implementing
   [FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md) and
   [FEA-008: expressive program models](../../../../mbse-basis/docs/features/FEA-008.md), and CAP-100's agent decision on
   parsers revised as question 6 decides.
2. **The framework and the renames**, with today's kinds: each dialect's `Expression` and union (question 4), the
   invalid-syntax kinds (question 7), `Python3`, the C and C++ dialects from `Ccpp`'s kinds (question 3),
   `SystemVerilog`; the translators retargeted; corpus cases per dialect.
3. **`Python3` complete**: `ast`'s 29 kinds and helpers, the narrower kinds replaced, printing every construct of 3.0
   to 3.15; checked against `ast`'s node list.
4. **`TypeScript5`**, new: expressions, types, patterns and JSX (question 5), printed.
5. **C and C++ by standard.**
6. **`SystemVerilog` complete**, Verilog its subset.
7. **Tutorials, skill, README, EQUIVALENCE; release 0.8.0.** Then mbse-programs' stage 2, mbse-patterns and
   mbse-codegen-python.

## Risks

- **Size**: from about 45 kinds of these three dialects to several hundred, in both languages, each with its printer
  under 100% coverage, and its install in fluent syntax.
- **Cost**: installs of hundreds of schemas, run in every store and suite; per-standard dialects multiply the unions.
- **Equivalence**: printers byte-identical in both languages; a parser in one language only (Python's `ast`, slang)
  leaves the other without a reader until mbse-programs' exchange.
- **Lagging parsers**: tree-sitter's grammars lag Python 3.13 and later, TypeScript after about 5.2, C23 and C++23;
  a dialect complete to its standard is checked against a grammar that is not.
- **Extension limits**: an extension's adjacency is to a relation of two links and no properties.
- **Dependents break** at 0.8.0: mbse-programs' bridges (until its stage 2), mbse-patterns (`Dialects.Python.Text`)
  and mbse-codegen-python (the writers).

---

<!-- nav -->
[← FEA-024: expressions as data](../../../../mbse-basis/docs/features/FEA-024.md) · [Home](../../../README.md) · [The gaps, dialect by dialect →](GAPS.md)
