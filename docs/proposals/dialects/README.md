<!-- nav -->
[← FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) · [Home](../../../README.md) · [The gaps, dialect by dialect →](GAPS.md)

# Complete expression dialects (a proposal, for review)

mbse-programs is porting to the stabilized mbse-schemas and to this repository, and the user decided that its
expressions are this repository's dialects, whole: "`mbse-programs` should make use of
`mbse-expressions.Dialects.<lang_ver>.Expression`. Yes, this means the expression dialect must completely cover the
AST" (mbse-programs, [its port](https://github.com/pitaman71/mbse-programs/blob/main/docs/proposals/port/README.md#decided), Decided). Its
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

The user's (2026-11-02, mbse-programs' [port](https://github.com/pitaman71/mbse-programs/blob/main/docs/proposals/port/README.md#decided),
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
schema", domain inference deferred. And the standing rules: "Never guess the schema"
([PRI-025: never guess the schema](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-025)); "Never use wire format in examples";
"Do not invent another DSL by wrapping builder syntax"
([PRI-019: fluent builder syntax](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-019));
[PRI-012: model published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-012) and
[PRI-002: preserve, don't lose](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-002).

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
  Revised (2026-11-03), reviewing stage 2, where the kinds C and C++ share held `Expressions.Framework.Term`: the user,
  "Framework.Term -> Dialects.C.Term / Framework.Term -> Dialects.Cpp.Term"; asked, "a dialect's union" - when was it
  decided a dialect has only one union?" (it was not: question 5 gives each sublanguage a union of its own), and to
  the structure then proposed, "yes"; then, correcting it: "the parent-child relationships in the AST are sometimes
  modeled as relations sometimes as properties. It matters in this case because Term is a value and Expression is a
  reference object. The root of an expression tree is always an `Expression` which holds the root `Term` as a
  property." To the model restated, "yes it does":
  - `Expressions.<Dialect>.Term` is a value, the union of the dialect's term kinds; within a term tree every
    parent-child link is a property (`left`, `right`, `arguments`), each holding a `Term` of its dialect. The kinds C
    and C++ share are defined by each, their properties holding `Expressions.C.Term` and `Expressions.Cpp.Term`.
  - `Expressions.<Dialect>.Expression` is a reference object, the root of an expression tree, holding the root `Term`
    as its property `root`: each dialect its own holder, as "`Dialects.<lang_ver>.Expression`" first said.
  - `Expressions.Framework.Term` is the union of the dialects' `Term`s, held by the shared kinds' properties.
  - Between reference objects, parent-child links are relations: a statement links to an `Expression`, which holds
    its `Term`.
  The record before this correction, that `Expressions.<Dialect>.Expression` is the dialect's union of its kinds, was
  the agent's misreading of "a union of `Expressions.Dialects.<lang_ver>.Expression` which is itself a union", and is
  superseded.
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
  [PRI-023: domain representations](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-023): "A domain representation carries
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
- **A sublanguage's union holds the terms its positions hold, as branches** (2026-11-03, in building stage 4,
  `TypeScript5`). Asked how a property holds a kind from two unions, where mbse-programs types it as a mix of a term
  kind and a sublanguage's kind (an arrow's parameter `x` is an `Identifier`, a term; `a.b = 1`, `x! = 1`,
  `(x as T) = 1` and `(x) = 1` have targets that are terms; a type's entity name is `Identifier | ThisExpression |
  TSQualifiedName`; a literal type holds `Literal | UnaryExpression | TemplateLiteral`; an import type an
  `ObjectExpression`), each sublanguage being a union of its own beside `Term` (question 5): (a) a `term` branch in
  each sublanguage's union, holding `Term`, a level of wrapping on the wire; (b) one schema listed as a branch of
  several unions, `Pattern` listing `identifier` and `memberexpression` (typescript-estree's `DestructuringPattern`)
  and the expressions an assignment's target may be, `Type` listing `identifier` and `thisexpression` for entity
  names; (c) a union of its own for each mixed position (`Target`, `EntityName`); (d) the pattern kinds in `Term`, as
  typescript-estree's `Expression` has them. The user: "(b) as you recommended": `Pattern` lists, beside its own
  pattern kinds, the term kinds typescript-estree's `DestructuringPattern` allows (`identifier`, `memberexpression`)
  and, for an assignment's target, the expression kinds valid there (`tsnonnullexpression`, `tsasexpression`,
  `tssatisfiesexpression`, `tstypeassertion`, `parenthesizedexpression`); `Type` lists `identifier` and
  `thisexpression` for entity names, and what else a type position holds (`TSLiteralType.literal`'s terms,
  `TSImportType`'s), each listed directly, with no wrapping level; which terms are allowed where beyond the schema is
  a constraint, consistent with decision 4; a literal type holds its terms the same way. Asked whether names that only
  declare (`TSMappedType.key`, `TSNamedTupleMember.label`, `TSTypeParameter.name`, `TSQualifiedName.right`) are a
  `str`, as Python3's are where mbse-programs has an `Identifier` node, or stay mbse-programs' `Identifier`: "yes, stay
  `Identifier` terms".
- **Every dialect has a `Pattern` union for its binding targets** (2026-11-03, building stage 4). Asked "is this done
  consistently across typescript5 and python3? can it be?", and shown two options, (i) each dialect follows its own
  grammar (`TypeScript5` a `Pattern` union, `Python3`'s targets holding its `Term`), or (ii) a uniform rule where every
  dialect has a `Pattern` union for binding targets, the user: "(ii)". `Python3` gains `Expressions.Python3.Pattern`,
  listing the term kinds a binding target may be, no new kinds, one schema in several unions as (b) has it; a
  comprehension's and a named expression's `target` hold it; a lambda's parameters, `arg`s, stay as they are.
- **A name is whatever the language's own grammar makes it** (2026-11-04, reviewing stage 5, where C held a member's,
  a field's, a type's and a declarator's names as a `str`). Asked "Is there a judgement call we can make that settles
  this for good?", the user answered "Yes" to the rule: a name is whatever the language's own grammar makes it: a term
  where the grammar has a node for it, a plain string where the grammar treats it as a bare token. It is Decided, 2's
  "mbse-programs' kinds, names and shapes", since mbse-programs follows each reference grammar: `Python3` keeps
  `ast`'s strings (`Attribute.attr`, `keyword.arg`, `arg.arg`); `TypeScript5` keeps its `Identifier` nodes; `C` and
  `Cpp` hold an `Identifier` (a `Name`, where mbse-programs has one) wherever tree-sitter and mbse-programs have a
  name node ("Names are syntax nodes (category `Name`) wherever they occur", `mbse-programs/python3/mbse/Programs/
  Ccpp/Syntax.py`), and a `str` where mbse-programs has a `str` (an attribute's `name` and `namespace`, a
  `using_namespace`).
- **C++ writes a name used as an expression only as `idexpression`** (2026-11-04, following up stage 5, its API's item
  106). Shown "C++ uses only `idexpression`, mbse-programs' one kind, so `variable` isn't listed in C++'s union... C
  keeps `variable`, since C's grammar has a plain identifier expression", the user: "1, 2: confirmed". `Cpp`'s `Term`
  has no `variable`: every C++ name used as an expression, an identifier among them, is an `idexpression` holding its
  `Name` (`x` an `idexpression` of the identifier `x`, `std::cout` of a qualified name), as mbse-programs and
  tree-sitter-cpp have it, its readers, printer, evaluation, scopes and translators following. `C` keeps the framework's
  `variable`, an identifier used as an expression. The rule that a dialect reads only its own terms (Decided, 4) still
  holds: a C++ term in C is refused.
- **C++'s init capture holds its name as a `Pattern`** (2026-11-04, the same review). Shown "C++'s init capture holds
  its name as a `Pattern`, which becomes `Identifier` plus the invalid-syntax kinds. C's `Pattern` exists but nothing
  holds it, and the record says why: C expressions bind no names", the user: "3 = (a) is fine". `Expressions.Cpp.Pattern`
  lists `identifier` (`Expressions.Cpp.Identifier`), `error` and `missing`, and an init capture's `name` (`[n = 1]`)
  holds it, the binding target "Every dialect has a `Pattern` union" asks for. `Expressions.C.Pattern` stays invalid
  syntax alone, and nothing holds it: C expressions bind no names.
- **C's writers stay, for code generation** (2026-11-04, the same review, on whether C keeps its writers): "4. for
  codegen, we keep the writers separately because they emit code not just wire format for the model". C's and C++'s
  writers (`literal`, `identifier`, `binary`, `cast`, ...) are kept as they are, beside the builders through which every
  other term is written (PRI-019): code generation writes terms through them to emit source, not only the model's wire
  format.
- **The namespace: `Expressions.<family>.<dialect>`** (decided in stage 6's decisions, recorded on its branch,
  `stage6-decisions`; the questions it left open, 2026-11-05). The user chose "the middle path:
  `Expressions.<family>.<dialect>`, a family named as its standard names the language, each dialect recording the
  standard that defines it", and, to the names `Expressions.Python.Python3`, `Expressions.TypeScript.TypeScript5`,
  `Expressions.C.Expressions`, `Expressions.SystemVerilog.Expressions` and sublanguages by what they are: "agreed"; "The
  rename is a step of its own, before stage 6's build." Asked eight questions it left open, each with a recommendation,
  the user: "yes, go":
  1. Patterns, the neutral form and no standard's language, is `Expressions.Framework.Patterns`. *Superseded*
     (2026-11-09) by the user's "(b)": Patterns is `Expressions.Patterns.Expressions`, a family with one dialect named
     `Expressions`, as 3 has MATLAB's, Excel's and LaTeX's; and "the neutral form" is retired, describing Patterns
     nowhere (mbse-basis [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided), "Patterns' place").
  2. C++'s family, `C++` being no name, is `Cpp`: `Expressions.Cpp.Expressions`.
  3. The families with one unversioned dialect name it `Expressions`, as C's and SystemVerilog's do:
     `Expressions.MATLAB.Expressions`, `Expressions.Excel.Expressions`, `Expressions.LaTeX.Expressions` (not
     `.Formulas` or `.Math`), the families spelled as their makers spell them.
  4. `Expressions.Framework.Term`'s branch tags stay (`patterns`, `python3`, `c`, ...), for now.
  5. A singleton is named by its full path: `Expressions.Python.Python3`.
  6. Python's modules are at `mbse/Expressions/<Family>/<Dialect>/` (`Dialects/` goes).
  7. TypeScript's are at `src/<Family>/<Dialect>/`, the package's exports matching (`@mbse/expressions/C/Expressions`).
  8. No alias for the old names.

  Built as [the API, Settled in the namespace rename](../port/API.md#settled-in-the-namespace-rename-for-the-users-review),
  items 108 to 111.
- **0.8.0 holds stages 1 to 5; stage 6 and the retrofit follow, now as 0.10.0** (2026-11-05; the version revised
  2026-11-06: domains as data is 0.9.0, mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), "The releases"). Offered two options, "(a):
  Release 0.8.0 now. It contains stages 1 to 5, the rename and a pin to 0.26.10. Stage 6 and the retrofit of the other
  dialects come in 0.9.0, and INI-040 can start now." and "(b): build stage 6 first", the user answered "(a)". So
  0.8.0 is released after stage 5: stages 1 to 5, the namespace rename (the old `Dialects` names gone, with no alias)
  and mbse-schemas 0.26.10 pinned. `SystemVerilog` is released in 0.8.0 as it stands, not yet complete to IEEE
  1800-2023. Stage 6 (SystemVerilog's expression dialect complete, Verilog its subset, its types, patterns,
  assertions, constraints and preprocessor dialects, and the closing work) and the retrofit of the other dialects (type,
  pattern, regex and preprocessor dialects, `let` variations) are released as 0.10.0, after domains as data's 0.9.0
  (asked to number them so, the user answered "agreed", 2026-11-06). This supersedes stage 7's release
  of 0.8.0 after stage 6 (Stages, below) and the stopping point [the domains proposal](../domains/README.md) first
  recommended.

### Decided for stage 6 (SystemVerilog) and after (2026-11-05)

Reviewed interactively with the user, question by question; the questions were stage 6's design pass. Each answer is
quoted as given.

**Principles the user stated** (asked about what counts as an expression):

> - nodes in the language syntax are represented faithfully as statement
>   or expression nodes in the mbse-programs model
> - wrapper nodes in the parser syntax may be omitted provided that does
>   not introduce a round-trip ambiguity
> - language standards generally provide a very clean separation between
>   statements and expressions and the mbse-programs model must abide that
>   boundary
> - constraints, regexes and patterns are expression dialects
> - should AST-visible macro definitions and usages be their own dialect?
> - most languages will have a dialect for type expressions
> - any expression kind that binds symbol(s) should be modeled as variations of `let`
> - `mbse-expressions` provides tools for evaluating statement-free expressions.
>   Contruction of a full evaluator for expressions with embedded statements
>   is deferred to `mbse-programs`

- **Sublanguages are dialects.** Asked whether constraints, regexes and patterns become dialects of their own: "separate
  dialects but they are also probably referenced by other dialets via union"; and "yes, if the standard says it's a
  sublanguage then it's definitely at least a separate dialect". So SystemVerilog Assertions (sequences and
  properties, IEEE 1800 clause 16), constraints (clause 18), patterns, types ("most languages will have a dialect for
  type expressions"), regular expressions (ECMA-262's, Python's `re`) and the preprocessors (Verilog's compiler
  directives, clause 22; C's and C++'s) are each a dialect, referenced from its host's unions by "(b)". This
  supersedes, for stage 6 on, the sublanguage unions within a dialect (question 5's (a), Q1 below), which become these
  dialects' `Term`s.
- **Q1, the unions** (sequences, properties, patterns, constraints, types): "(a)"; recast by the rule above as dialects.
- **Q2, a holder per sublanguage**: "(a)": each sublanguage dialect has its own holder, refining
  `Expressions.Framework.Expression`, so that a property, a sequence, a constraint or a type can be an expression's
  root; applied to every dialect.
- **Q3, SystemVerilog's literals**: "(b)": `literal` holds what a scalar schema can (unsized integers, reals,
  strings, time literals with their unit); SystemVerilog's own `constant` holds what has no schema (`null`, the fills
  `'0 '1 'x 'z`, 4-state vectors, by bits, size and signedness, the base its spelling).
- **Q4, names**: "(b)": every name used as a value is a `nameexpression` holding its `Name`, as mbse-programs has it,
  with no `variable` in SystemVerilog's union, as for C++.
- **Q5, what counts as an expression**: settled by the principles above: slang's text-less wrappers omitted; a
  pattern's parentheses kept as a kind (dropping them would change the text), mbse-programs' omission of them a gap to
  report; assertions, `let` declarations and coverage bin selections are statements and declarations; assignments and
  increments in expressions are expression nodes.
- **Macros**: the preprocessor is a dialect per family (C's, shared by C and C++ as each standard defines it;
  Verilog's compiler directives), a macro usage in an expression position a term of it held by "(b)"; a macro
  definition a directive, mbse-programs'.
- **Q6, directives and comments inside constraints**: "agreed": directives are the preprocessor dialect's terms,
  comments helpers.
- **Q7, a struct's or enum's members in a type**: by "most languages will have a dialect for type expressions", its
  members are kinds of the type dialect, as data; C's `body` flag (API 93) revisited the same way.
- **Q8 and binding**: "any expression kind that binds symbol(s) should be modeled as variations of `let`"; asked how,
  "(a)": every binding kind refines the framework's `Let`, the framework knowing a binder as one that is a `Let`. It
  needs mbse-schemas to accept a refinement where a property's value is held, as links do now: an mbse-schemas release
  first.
- **Q9, completeness data**: "yes": every slang syntax kind, at mbse-programs' pyslang, as data, checked in both
  languages, with no slang dependency.
- **Q10, standards**: "label standards using the convention the standards body itself uses"; then "If we treat
  standards as tags, we could support both", and, to a standard reference that is either formal (a body by
  reverse-domain name, one or a joint pair; a number; a revision that is a year, an edition or a version) or common (a
  name such as `C11`), each edition stored with its designation and its common names as tags: "yes". Built with
  domains as data; until then stage 6 records SystemVerilog's editions in code by designation (`IEEE Std 1800-2023`).
  Built in domains as data's stage 4, before stage 6, which so records SystemVerilog's editions as data
  (mbse-basis [CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md)).
- **Q11, evaluation**: by the principle above, and, as the user put the design: "If I'm being honest, providing a full
  function evaluator in mbse-expressions at all was never a primary goal. I tolerated it as a potentially useful
  feature. But the original design was that mbse-expressions would provide a expression simplifier in stages:"

  > - start with a simple recursive simplifiation-by-substitution algorithm,
  >   no resolution or statement execution
  > - support replacing argument, variable, and parameter references with schema-compatible expressions
  > - support applying operator implementations registered with the evaluator as
  >   imperative native code plugins that expect either a concrete value or
  >   an "unknown" bound to every operation formal

  So stage 6 extends no evaluator: SystemVerilog's evaluation keeps what it does today, its new kinds modeled,
  printed and complete to the standard but not evaluated; the staged simplifier is its own proposal, after domains as
  data. The model is the whole standard ("not supporting the full standard is prohibited"); only evaluation is partial.
- **Q12, domains**: "approved": stage 6 adds nothing to the code-only domains.
- **Namespace**: asked about `Expressions.<standard>.<dialect>` and `<family>.<standard>.<dialect>`, the user chose
  the middle path: `Expressions.<family>.<dialect>`, a family named as its standard names the language, each dialect
  recording the standard that defines it; then, to the names `Expressions.Python.Python3`,
  `Expressions.TypeScript.TypeScript5`, `Expressions.C.Expressions`, `Expressions.SystemVerilog.Expressions` and
  sublanguages by what they are (`.Types`, `.Patterns`, `.Assertions`, `.Constraints`, `.Preprocessor`, `.RegExp`):
  "agreed". The rename is a step of its own, before stage 6's build.
- **The sequence of work**: "I agree with this sequencing of work but we need to discuss timing against current INI
  priorities": mbse-schemas' refinement of property values; the namespace rename; SystemVerilog's expression dialect;
  its types, patterns, assertions, constraints and preprocessor dialects in parallel; closing work; then the retrofit
  of the other dialects (type, pattern, regex and preprocessor dialects, `let` variations). Its timing against the INI
  priorities is open; which release holds what is decided (Decided, "0.8.0 holds stages 1 to 5").

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
   [PRI-011: the lowest repository that can own it](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-011) ("parsers and
   dialect bridges in mbse-programs") and [CAP-100: six languages' expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-100.md#decided-by-an-agent-for-review)'s
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
   [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) and
   [FEA-008: expressive program models](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-008.md), and CAP-100's agent decision on
   parsers revised as question 6 decides.
2. **The framework and the renames**, with today's kinds: each dialect's `Expression` and union (question 4), the
   invalid-syntax kinds (question 7), `Python3`, the C and C++ dialects from `Ccpp`'s kinds (question 3),
   `SystemVerilog`; the translators retargeted; corpus cases per dialect.

   *As built* (branch `stage2-framework`; every choice made where the decisions were silent is in
   [the API, Settled in the complete dialects' stage 2](../port/API.md#settled-in-the-complete-dialects-stage-2-for-the-users-review),
   items 30 to 45). `Expressions.Framework.Term` is a union of the dialects' unions, each dialect's install adding its
   `Expressions.<Dialect>.Expression` as the branch named after it (`patterns`, `python3`, `matlab`, `excel`, `latex`,
   `c`, `cpp`, `systemverilog`), its kinds named plainly; a dialect's own kinds hold its union, the shared kinds and the
   new `error` and `missing` hold `Term`. Basic is `Patterns` (its quantifier unchanged), Python is `Python3`, and `Ccpp`
   is `C` and `Cpp`, whose kinds are defined once by C's install and listed by both unions, their slots holding `Term`,
   each `Kind` recording its language's standards (`C11`, `C17`, `C23`; `C++17`, `C++20`, `C++23`). A dialect reads
   only its own terms. A literal holds any value, its spelling and its problems, and printers write its spelling;
   `error` and `missing` are validated, printed as written and refused by evaluation and translation by name. Patterns
   <-> C and Patterns <-> C++ share one rule set. The corpus has a case per dialect (`python3`, `c`, `cpp`) and one of
   invalid syntax (`invalid`). Found: mbse-schemas reports a union of one branch as invalid, so `Term` in a store of
   one dialect, and its expressions, do not validate as data (item 41).

   *Revised* (2026-11-03, as Decided, 1, was revised): each dialect's value union of its kinds is
   `Expressions.<Dialect>.Term`, `Expressions.Framework.Term` the union of them; C and C++ each define the kinds they
   share, holding `Expressions.C.Term` and `Expressions.Cpp.Term` (API, item 35, superseded). Each dialect's holder
   `Expressions.<Dialect>.Expression`, refining `Expressions.Framework.Expression`, waits: mbse-schemas 0.26.5 does not
   confirm a redeclared `root` narrowed to a branch's schema (API, item 46).

   *Holders* (branch `stage2-holders`, mbse-schemas 0.26.7): each dialect's install writes its holder,
   `Expressions.<Dialect>.Expression`, a reference object refining `Expressions.Framework.Expression`, its `root`
   narrowed to the dialect's `Term`; `HasRoot` links it, and everything reading an expression takes it (API, items 46
   to 49).
3. **`Python3` complete**: `ast`'s 29 kinds and helpers, the narrower kinds replaced, printing every construct of 3.0
   to 3.15; checked against `ast`'s node list.

   *As built* (branch `stage3-python3`; every choice made where the decisions were silent is in
   [the API, Settled in stage 3 (Python3)](../port/API.md#settled-in-stage-3-python3-for-the-users-review), items 50
   to 69). `Expressions.Python3.Term` holds every expression kind of `ast`, 3.0 to 3.15, in mbse-programs' names and
   shapes, tags lowercased (`generatorexp`); the narrower kinds are replaced (one `subscript`, with `slice` and `tuple`
   for a tensor's indices; a comparison chain of `comparison`s; `boolop` of n values; comprehensions of several
   `comprehension`s; a call's `keywords` and `starred` arguments), and `let`, `import` and `importfrom` are kept as
   extensions. A literal refines the framework's, adding what its text encodes (prefix, quotes, base, separators);
   Python3's `constant` holds `None`, `...` and complex numbers. A lambda's body is a term (item 54, for review). The
   framework reads a kind's helpers (keywords, comparisons, comprehensions, a lambda's arguments, an f-string's parts)
   as `Terms.Part`s, and a `Kind` declares its optional slots, scopes, chained operators, unfolding and spelling.
   `ToText` prints every kind in both languages, and `FromText` reads every `ast` kind with each literal's spelling;
   `grammars/python3-ast.json` keeps `ast`'s node list, which DIA-20 checks in both. Evaluation stays shallow, refusing
   new kinds by name; the translators keep what they translated, reading a chain and n values as nested `and`s.
4. **`TypeScript5`**, new: expressions, types, patterns and JSX (question 5), printed.

   *As built* (branch `stage4-typescript5`; every choice made where the decisions were silent is in
   [the API, Settled in stage 4 (TypeScript5)](../port/API.md#settled-in-stage-4-typescript5-for-the-users-review), items 70
   to 85). `Expressions.TypeScript5.Term` holds typescript-estree's expression kinds, TypeScript 5.0 to 5.9, in
   mbse-programs' names and shapes, tags lowercased (`binaryexpression`, `tsasexpression`), with JSX as an extension;
   its types and destructuring patterns are unions of their own, `Expressions.TypeScript5.Type` and
   `Expressions.TypeScript5.Pattern`, a schema a branch of every union whose positions hold it (Decided, "A
   sublanguage's union holds the terms its positions hold"). A literal refines the framework's, adding its quote, base
   and separators, a number a float and a bigint an int; TypeScript5's `constant` holds `null` and regular expressions.
   A body of statements is absent, printed `{}`; an arrow's expression body is a term. `ToText` prints every kind in
   both languages; `grammars/typescript5-estree.json` keeps typescript-estree's node types, which DIA-23 checks in
   both. Evaluation refuses every kind but a literal by name; there is no translator and no writer.
5. **C and C++ by standard.**

   *As built* (branch `stage5-c-cpp`, and its follow-up `stage5-followup`; every choice made where the decisions were
   silent is in [the API, Settled in stage 5 (C and
   Cpp)](../port/API.md#settled-in-stage-5-c-and-cpp-for-the-users-review), items 87 to 107). `Expressions.C.Term` holds
   every expression of C, C11 to C23, and `Expressions.Cpp.Term` every expression of C++, C++17 to C++23, in
   mbse-programs' Ccpp names and shapes, tags lowercased (`binaryexpression`, `lambdaexpression`); each defines its own
   copy of the kinds they share, holding its own terms, and each kind records the standards that have it (GNU's
   extensions none). A name used as an expression is C's `variable` and C++'s `idexpression`, holding its `Name`
   (Decided, "C++ writes a name used as an expression only as `idexpression`"), and every other name an `Identifier`
   node wherever mbse-programs has a name node. Each has a `Type` union, a type name (`typeid`, which `Term` lists too),
   and a `Pattern` union: C's of invalid syntax alone, held by nothing, as C expressions bind no names, and C++'s an
   identifier or invalid syntax, held by an init capture's name (Decided, "C++'s init capture holds its name as a
   `Pattern`"); a type name's and a lambda's parts are helpers, their unions named after mbse-programs' categories. A
   literal refines the framework's, adding its prefix, quote, base, separators and suffix (C++'s raw strings too);
   `constant` holds `nullptr`. A body of statements or declarations is a `body` flag, printed `{}`. `ToText` prints
   every kind of both in both languages; `grammars/c-tree-sitter.json` and `grammars/cpp-tree-sitter.json` keep
   tree-sitter-c's and tree-sitter-cpp's node types, which DIA-26 checks in both. Evaluation keeps what C evaluated, a
   literal typed by its suffix and base, and refuses every other kind by name; the translators keep what they
   translated, Patterns <-> C and Patterns <-> Cpp one rule set. Every dialect's `Type` and `Pattern` now hold `error`
   and `missing`.
6. **`SystemVerilog` complete**, Verilog its subset (built); released as 0.10.0, after domains as data (0.9.0), with the retrofit of the other dialects
   (Decided, "0.8.0 holds stages 1 to 5"), designed below (*Retrofit's design*).

   *Design* (written from the code at main, cad59c4, v0.9.0, and mbse-programs' main, 3deb80e; by Decided for stage 6,
   above, its principles and Q1 to Q12; each choice where they are silent is marked *(agent)*, for review, and recorded
   in mbse-basis [CAP-231: the SystemVerilog expression dialect, complete](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-231.md)).
   Today `Expressions.SystemVerilog.Expressions.Term` holds 17 kinds of constraint terms (`vector`, `unary`, `binary`,
   ..., `method`, `iterate`), named ours; its domains are stored (domains as data's stage 3) and stay as built (Q12);
   its editions are recorded nowhere (mbse-basis [CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md#decided-by-an-agent-for-review), API 159).

   - **Six dialects of one family**, each at `Expressions.SystemVerilog.<Dialect>` by the namespace rule, each with its
     singleton, its `Term`, its holder (`Expressions.SystemVerilog.<Dialect>.Expression`, refining
     `Expressions.Framework.Expression`, its `root` narrowed to its `Term`; Q2), its install, its `define` and its
     `Terms.Dialect`, and its Python package and TypeScript module (`mbse.Expressions.SystemVerilog.Types`,
     `@mbse/expressions/SystemVerilog/Types`): `Expressions` (IEEE 1800 clause 11 and A.8, the expressions), `Types`
     (clauses 6 and 7, data types and their dimensions, struct and enum members as data, Q7), `Patterns` (12.6),
     `Assertions` (clause 16's sequences and properties, SystemVerilog Assertions), `Constraints` (clause 18's
     constraints and distributions) and `Preprocessor` (clause 22's compiler directives and macro usages). Each
     kind is mbse-programs' (`Verilog/Syntax.py`), its name and shape, its tag its name lowercased, as in stages 3 to
     5; a body of statements is mbse-programs' (Decided, 5). What is a statement or a declaration stays mbse-programs'
     (Q5): items, statements, assertion statements, `let`, property and sequence declarations, clocking blocks,
     coverage, instances and their connections.
   - **A sublanguage's dialect is named by its family too** *(agent)*: `Terms.dialect_name` gives `SystemVerilog
     Types`, `SystemVerilog Patterns` and so on for a path whose own name is one of the sublanguages the namespace
     decision names (`Types`, `Patterns`, `Assertions`, `Constraints`, `Preprocessor`, `RegExp`), so that no two
     families' sublanguages share a name; its tag, its branch of `Expressions.Framework.Term` and of
     `Expressions.Framework.Dialect`, is that name lowercased, a space an underscore (`systemverilog_types`). The
     dialect `Expressions` keeps its tag, `systemverilog`.
   - **Where a position holds one sublanguage, it holds that dialect's `Term`; where it holds a sublanguage's kinds or
     an expression, mbse-programs' `DataType | Expression`, `Property | Expression`, `Pattern | Expression`, it holds
     the sublanguage's `Term`, which lists, as branches, every branch of `Expressions.SystemVerilog.Expressions.Term`
     besides its own kinds** ("(b)", Q1; "a position that holds a property holds a `Property` or an `Expression`", as
     mbse-programs puts it) *(agent)*. So a cast's type, a system call's arguments (`$bits(int)`), an assignment
     pattern's type, a pattern item's key, a streaming concatenation's slice, a type reference's operand and a
     parameterized name's parameters hold `Types.Term`; a `matches`' pattern `Patterns.Term`; a call's arguments, a
     named connection's value and every operand of a sequence or a property `Assertions.Term`; a constraint's
     expression (`expression_or_dist`) `Constraints.Term`, which lists `distexpression` too, as `Assertions.Term` does
     (16.7); a dimension's bounds, a select's index and every other expression position `Expressions.Term`, which lists
     the Preprocessor's `macrousage` ("a macro usage in an expression position a term of it held by (b)", Macros).
     Helpers a position mixes with terms are the `Term`'s kinds, as in stage 4 (item 72): `valuerange`, `patternitem`,
     `namedconnection` and `emptyargument` in `Expressions.Term`; `patternmember` in `Patterns.Term`; `cyclerange` in
     `Assertions.Term`; the directives and `comment` in `Constraints.Term` (Q6).
   - **A dialect reads the terms of the dialects its positions hold** *(agent)*: `Terms.Dialect` takes `reads`, the
     other dialects whose kinds it reads, and reads a term of their `Term`s, or a term of theirs that its own `Term`
     lists, by their kinds; any other dialect's term is refused as before ("a Patterns call is not a SystemVerilog
     term"). Each of the six reads the other five, so a tree mixing them is validated, inferred, printed and evaluated
     from any of their holders. Each install names the other dialects' `Term`s by name, creating any that is not yet
     installed, as `Expressions.Framework.Term` is created before a dialect adds its branch: so the six installs run in
     any order after the standard dialects', their mutual references closed by schema extension. Nothing records, as
     data, which dialects a dialect uses: `reads` is the code that reads them, and the schemas are what each holds
     ([CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided), "No `Uses`", monitored: not a reason to reinstate it).
   - **Kinds of `Expressions`** (A.8; 41 branches with invalid syntax): `literal` and `constant` (below);
     `nameexpression`, holding its `Name` (Q4: no `variable`, as for C++); `memberexpression`, `indexexpression`,
     `rangeselect`, `unaryexpression`, `incrementexpression`, `binaryexpression`, `assignmentexpression`,
     `conditionalexpression`, `insideexpression` and `valuerange`, `concatenation`, `replication`,
     `assignmentpattern` and `patternitem`, `thisexpression`, `superexpression`, `newexpression`,
     `newcopyexpression`, `newarrayexpression`, `randomizewithexpression` (its constraints `Constraints.Term`),
     `arraymethodwithexpression`, `callexpression`, `systemcall`, `castexpression`, `parenthesizedexpression`,
     `dollarexpression`, `taggedexpression`, `matchesexpression`, `predicateexpression`, `streamingconcatenation`,
     `mintypmaxexpression`, `rootexpression`, `emptyqueue`, `namedconnection`, `emptyargument`, the Preprocessor's
     `macrousage`, and `error` and `missing`. Its helpers: the `Name` union (`identifier`, `scopedname`,
     `localname`, `parameterizedname`, `interfacetypename`, `interfacemethodname`, `unitname`, and
     `superexpression` where a `new`'s scope holds it), `attributeinstance` and `attributespec`, and `streamitem`.
   - **Literals** (Q3, "(b)"): `literal`, `Expressions.SystemVerilog.Expressions.Literal`, refining the framework's,
     holds what a scalar schema can, an unsized integer (an int: decimal, or based without `x` or `z`, `'hFF`), a real
     (a float), a string (a str, `triple` where written `"""..."""`, 2023) and a time literal (its magnitude a float,
     its `unit`), and adds what its text encodes *(agent: `base`, `signed`, `separators`, `unit`, `triple`)*;
     `constant`, SystemVerilog's own, holds what has none: `null` (`singleton`), the fills `'0 '1 'x 'z` (`fill`), and
     a 4-state vector, every sized literal and an unsized one with `x`, `z` or `?` (`bits`, MSB first, `size`, absent
     where unsized, `signed`, and `base`, its spelling), exactly one of the three *(agent)*, with `text` and
     `problems`. They replace mbse-programs' six literal kinds (`IntegerLiteral`, `RealLiteral`, `TimeLiteral`,
     `UnbasedUnsizedLiteral`, `StringLiteral`, `NullLiteral`) and today's `vector`.
   - **Kinds of `Types`** (clauses 6 and 7): `integervectortype`, `integeratomtype`, `nonintegertype`, `keywordtype`,
     `namedtype`, `virtualinterfacetype`, `implicittype`, `structtype`, `enumtype` and `typereference`, with
     `Expressions.Term`'s branches and invalid syntax; helpers: `structmember`, `enummember`, `variabledeclarator`
     and the `Dimension` union (`rangedimension`, `sizedimension`, `unsizeddimension`, `associativedimension`,
     `queuedimension`). A struct's and an enum's members are data (Q7).
   - **Kinds of `Patterns`** (12.6): `variablepattern`, `wildcardpattern`, `taggedpattern`, `structurepattern`,
     `patternmember`, and `parenthesizedpattern` (Q5: "a pattern's parentheses kept as a kind", which mbse-programs
     omits: a gap reported to the user), with `Expressions.Term`'s branches and invalid syntax.
   - **Kinds of `Assertions`** (16.7 to 16.12): `delaysequence`, `repetitionsequence`, `binarysequence`,
     `parenthesizedsequence`, `firstmatchsequence`, `clockedsequence`, `implicationproperty`, `binaryproperty`,
     `unaryproperty`, `strengthproperty`, `abortproperty`, `conditionalproperty`, `caseproperty`,
     `parenthesizedproperty`, `clockedproperty`, `propertyspec` (a property with its clock and its `disable iff`, the
     root an assertion statement's holder holds) *(agent)* and `cyclerange`, with `Expressions.Term`'s branches,
     `distexpression` and invalid syntax; helpers: `delaystep`, `propertycaseitem`, and a clock's `eventcontrol` and
     `eventexpression` *(agent: clause 9's event control, held here as a sequence's or a property's clock)*.
   - **Kinds of `Constraints`** (18.5): `constraintblock`, `expressionconstraint`, `implicationconstraint`,
     `conditionalconstraint`, `foreachconstraint`, `solvebeforeconstraint`, `disablesoftconstraint`,
     `uniqueconstraint` and `distexpression`, with `Expressions.Term`'s branches, the Preprocessor's directives and
     `comment` (Q6), and invalid syntax; helper: `distitem`.
   - **Kinds of `Preprocessor`** (clause 22): `macrousage`, `includedirective`, `definedirective`, `undefdirective`,
     `timescaledirective`, `defaultnettypedirective`, `ifdefdirective`, `disabledtext`, `otherdirective` and
     `comment` *(agent: clause 5's comment, kept where mbse-programs keeps it, among constraints and directives)*, with
     invalid syntax; helper: `elsifdirective`. A directive's branches hold `Constraints.Term`, the one place a value
     holds them; elsewhere mbse-programs relates its items and statements *(agent)*.
   - **Binding kinds refine `Let`** (Q8, "(a)"): `arraymethodwithexpression` (its iterator, within its `with`
     expression, 7.12) and `foreachconstraint` (its loop variables, within its body, 18.5.8.1) refine
     `Expressions.Framework.Let` (mbse-schemas 0.26.10, [CAP-251: values of a refinement held where what it refines is declared](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-251.md)), so the
     framework knows each as a binder (`Terms.is_binder`, its schema a `Let` or refining one) *(agent)*: each holds
     what it binds from as Let's `value` and where it binds as Let's `body`, redeclared to hold its dialect's
     `Term` (mbse-programs' `call` and `expression`, `array` and `body`) *(agent)*; Let's `name` is the one name a kind
     binds where it binds one it writes itself, which neither does (an iterator is named by its call's argument, or is
     `item`; a loop binds several), so it stays unset there, and the kind's scopes say what it binds *(agent, for
     review)*. A `matches` binds its pattern's variables in the conditions after it and in its conditional's
     consequence (12.6.2, 12.6.3): its holder, a `conditionalexpression` or a `predicateexpression`, says so by its
     scopes and does not refine `Let`, its properties being mbse-programs' *(agent, for review)*.
   - **Standards as data** (Q10, [CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md)): each dialect's `define` covers
     the editions its kinds are in, by their designations, `IEEE Std 1364-1995`, `-2001`, `-2005` and `IEEE Std
     1800-2005`, `-2009`, `-2012`, `-2017`, `-2023` (body `org.ieee`, number `1364` or `1800`, revision the year;
     common names `Verilog-1995` ... `SystemVerilog-2023`, as mbse-programs labels them *(agent)*), each with the kinds
     it has, from mbse-programs' `SINCE` (a kind with none in every edition; `sv()` from 1800-2005; `verilog(2001)`
     from 1364-2001 and in every 1800). `Expressions`, `Types` and `Preprocessor` cover all eight; `Patterns`,
     `Assertions` and `Constraints` the five of IEEE 1800. A feature within a kind (`FEATURES`) is not recorded, as for
     C's: a constraint, to come. Invalid syntax is in none.
   - **Completeness as data** (Q9): `grammars/systemverilog-slang.json` lists every slang `SyntaxKind`, 533 in
     pyslang 12.0.0 as mbse-programs pins it, each mapped to the kinds or helpers of the six dialects, or listed as not
     an expression with its reason (a statement, an item, a token, a list's wrapper); checked in both languages, with no
     slang dependency.
   - **Evaluation keeps what it does** (Q11): what today's 17 kinds evaluate, their replacements evaluate, on the
     domains as stored (Q12): a `constant` vector, `unaryexpression`, `binaryexpression`, `conditionalexpression`,
     `concatenation`, `replication`, `indexexpression`, `rangeselect` (`:`), `insideexpression` with `valuerange`s,
     `castexpression` (to a type `Types` writes, a signing, or a width), `memberexpression`, `systemcall` (today's
     system functions), `callexpression` (of a function the scope provides, and today's array methods,
     `a.size()`), and `arraymethodwithexpression` (today's reductions with `with`); every other kind is refused by name
     ("SystemVerilog unaryexpression ... is not evaluated"), as are the other five dialects' kinds.
   - **Printing**: `Text.ToText` ports mbse-programs' printer (`Verilog/_Printer.py`) for every kind of the six,
     byte-identical in both languages, from any of their holders.
   - **Translators**: Patterns <-> SystemVerilog keep what they translate, over the new kinds.
   - **The work, partitioned** *(agent)*: first the framework's changes, `Expressions` and `Types` together, since a
     cast, which SystemVerilog evaluates today, reads its type; with the evaluator, the translators, the writers, the
     completeness data, every dialect's package and export (the other four's installs written then, each `Term` listing
     `Expressions.Term`'s branches and invalid syntax, and the Preprocessor's `macrousage`), and their tests in
     `06_Dialects`. Then `Patterns`, `Assertions`, `Constraints`
     and `Preprocessor` in parallel, each in its own files and test suite (`12_SystemVerilogPatterns` to
     `15_SystemVerilogPreprocessor`). Then the corpus, the tutorials, the skill, the records.
   *As built* (branch `stage6-systemverilog`, its core and slang data, then `stage6-patterns`, `stage6-assertions`,
   `stage6-constraints` and `stage6-preprocessor` merged into it; every choice made where the decisions were silent is
   in [the API, Settled in stage 6 (SystemVerilog)](../port/API.md#settled-in-stage-6-systemverilog-for-the-users-review),
   items 162 to 216). The six dialects are built as the *Design* above has them, in both languages, each with its
   install, `define`, holder, `Terms.Dialect` reading the other five, printer and suite (`12_SystemVerilog_Patterns` to
   `15_SystemVerilog_Preprocessor`: SVP, SVA, SVC and SVD); DIA-27 to DIA-29 check `Expressions` and `Types`, their
   printing, and all six complete against slang's 533 syntax kinds; the corpus has a case of every kind of each
   sublanguage. Two kinds the *Design* named wait on nothing now: `solvebeforeconstraint` and `IfdefDirective`'s `else`,
   each holding two lists of terms (Found while building, below).

   *Found while building*:
   - **A kind held one container of terms** (`Terms._parts`), so mbse-programs' `SolveBeforeConstraint` (`solve` and
     `before`) and `IfdefDirective` (`items` and `alternative`) could not be modeled in its shape; the Preprocessor
     first held its `else` in a helper of its own. Decided by the coordinator (API 210 to 212): a kind may hold
     several, read in declaration order, its form's attributes giving each one's size; both are now in mbse-programs'
     shape.
   - **A conditional whose condition is a `matches` sized its consequence first**, so a pattern variable raised
     `NameError` before the `matches` was refused by name; the condition is now sized first (API 213).
   - **A constant is described as `None` in refusal messages** ("SystemVerilog constant None of logic [7:0] ..."): open
     with the user, left as it is (API 216).
   - **mbse-programs' gaps**, for its port, recorded in mbse-basis where it keeps such gaps
     ([CAP-094: every construct of Verilog's and SystemVerilog's standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-094.md),
     [CAP-086: programs printed](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-086.md)): `AnonymousProgram` raises `KeyError`, not
     `ParseError`; a pattern's parentheses are dropped; nested event parentheses are flattened (`@((a) or b)` printed
     `@(a or b)`); `randomize(null)` and arguments that are not identifiers are refused; a `ParenthesizedPropertyExpr`
     with a match list is refused; and mbse-programs does not import against today's mbse-schemas (`Visitors.Native`).
   - **Printing an operator no precedence table has** raises `KeyError` in Python and reads `undefined` in TypeScript;
     only a term validation refuses reaches it, and no case asserts it ([Equivalence](../../EQUIVALENCE.md#deliberate-differences)).
   - **Slang's mappings left uncertain** (API 186): `BadExpression` as `error`, `ConditionalPattern` as
     `matchesexpression`, and `VoidCastedCallStatement`, `Delay3` and `OneStepDelay` listed as not expressions.

   *Retrofit's design* (written from the code at main, 225122d, stage 6 merged, and mbse-programs' main, 3deb80e). The
   retrofit applies stage 6's decisions to the other dialects, "the retrofit of the other dialects (type, pattern,
   regex and preprocessor dialects, `let` variations)" (Decided, "0.8.0 holds stages 1 to 5"), and is released with
   stage 6 as 0.10.0. The decisions it applies are those of Decided for stage 6: sublanguages are dialects, referenced
   through unions ("(b)"); "most languages will have a dialect for type expressions"; "any expression kind that binds
   symbol(s) should be modeled as variations of `let`" (Q8, "(a)"); a holder per sublanguage (Q2); the namespace; and
   "not supporting the full standard is prohibited" (Q11). Its pattern is stage 6's as built: a family of dialects,
   each reading the others' terms (`reads`), binders refining `Let`, several containers of terms per kind (API 210),
   `HELPERS`, editions as data, and completeness checked against a grammar kept as data. Each choice where the
   decisions are silent is marked *(agent)*, for review, and is to be recorded in mbse-basis with the build.

   - **The rules every family follows.**
     - *A sublanguage is a dialect where its language's standard defines it as a grammar of its own* (Decided for
       stage 6: "if the standard says it's a sublanguage then it's definitely at least a separate dialect"; and
       "constraints, regexes and patterns are expression dialects"). Each new dialect is built as stage 6's
       sublanguages are: a singleton at `Expressions.<Family>.<Sublanguage>`, named `<Family> <Sublanguage>` and
       tagged by that name lowercased (`python_types`, `c_preprocessor`; API 162, 163); its `Term`; its holder,
       `Expressions.<Family>.<Sublanguage>.Expression`, refining `Expressions.Framework.Expression`, its `root`
       narrowed to its `Term` (Q2), which inherits the framework's adjacency `abi`, so that a C or C++ sublanguage's
       holder names its ABI as C's does (mbse-basis [CAP-267: C and C++ terms read under the ABI their holder
       names](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-267.md)); its install, its
       `define` (its editions) and its `Terms.Dialect`, reading its family's other dialects (`reads`, API 164 to
       166); `TAGS`, `HELPERS` and `SINCE` (API 177, 178); its printer, merged into its family's; its Python package
       and TypeScript module, exported (`mbse.Expressions.Python.Types`, `@mbse/expressions/Python/Types`); and a
       suite of its own. Its kinds are mbse-programs', in its names and shapes, its tags their names lowercased, as in
       stages 3 to 6; where mbse-programs has none (the regular expressions), they are the reference parser's.
     - *Moving a union out of a dialect moves its schemas, not its memberships* *(agent)*. Each union a dialect
       holds today for a sublanguage (`TypeScript5`'s `Type` and `Pattern`, C's and C++'s `Type`) becomes the new
       dialect's `Term` with the same branches, and every other union keeps the branches it lists ("(b)": `Term`
       still lists `typeid` in C and C++, and `arraypattern`, `objectpattern` and `assignmentpattern` in
       TypeScript5). Only the schemas' names change (`Expressions.TypeScript.TypeScript5.TSArrayType` is
       `Expressions.TypeScript.Types.TSArrayType`), so a term's data, written by branch tags, is unchanged. Stage
       6's rule that a sublanguage's `Term` lists every branch of its family's expressions (API 169) was for
       sublanguages built new, and applies to those the retrofit builds new where their positions hold any
       expression (Python's types, below).
     - *A helper moves with the kinds that hold it* *(agent)*: a helper every holder of which is the new dialect's
       (C's type-name specifiers and declarators, a TypeScript type literal's signatures) moves to it; one an
       expression's kind also holds, directly or through its helpers (a name, an identifier, a TypeScript type
       annotation, a C++ lambda's parameters), stays its family's expressions' helper, read through `reads`, as
       `SystemVerilog Types` reads `Expressions`' `Name`.
     - *Every dialect keeps a `Pattern` union for its binding targets* (Decided, "Every dialect has a `Pattern`
       union", "(ii)") *(agent, how it meets stage 6)*: a `Pattern` union with kinds of its own, a grammar its
       standard defines (TypeScript5's destructuring patterns, ECMA-262's binding and assignment patterns), becomes
       its family's `Patterns` dialect, whose `Term` it is; one that lists only terms and invalid syntax (Python3's,
       C's and C++'s) stays its dialect's union, as the user decided it ("3 = (a) is fine"). Python's `Patterns`
       dialect is its `match` statement's patterns, a grammar of their own (below), not its binding targets.
     - *Bodies* (Decided, 5, "(i)", and Q7, "C's `body` flag (API 93) revisited the same way") *(agent)*: Q7 made a
       SystemVerilog struct's members data because mbse-programs models them as nodes (`StructMember`), and the same
       test decides C's and C++'s. mbse-programs models an enumeration's body as nodes (`EnumeratorList` of
       `Enumerator`s, directives and comments), so in C and C++ an enumeration's enumerators are data of its family's
       `Types`: the specifier keeps `body`, whether it has one (`enum E` against `enum E {}`), and gains
       `enumerators`. It models a struct's, a union's and a class's members as declarations (`MemberList` of
       `Declaration`s, functions with their statements among them in C++), its owned reference objects, so they
       stay mbse-programs' behind the `body` flag, as Decided, 5, "(i)" has a body of declarations. C++ defines no
       class or enumeration in a type name an expression holds (ISO/IEC 14882, [dcl.type.general]: "A
       type-specifier-seq shall not define a class or enumeration unless it appears in the type-id of an
       alias-declaration"), so an enumeration's data in C++ is held only through a holder, by mbse-programs' alias
       declarations.
     - *Binders refine `Let`* (Q8, "(a)"), as stage 6's do (API 167, 172, 199): every kind that binds names, in
       every dialect, refines `Expressions.Framework.Let`, so that `Terms.is_binder` knows it. Its own property is
       Let's `value` where it is the one term the kind binds from, and Let's `body` where it is the one term it binds
       within, renamed to Let's name where the grammar names it otherwise, as stage 6 renamed mbse-programs' `call`,
       `array` and `expression`; Let's `name` is the one name it binds where it writes it as a string; any of the
       three the kind has no such term or name for stays unset, and its kind's `scopes` say what it binds (API 167).
       A refinement lists Let's properties first, as `foreachconstraint`'s does. A kind keeps its role (`BINDING`,
       `QUANTIFIER`, `IMPORT` or `APPLICATION`), which its evaluation and inference read *(agent)*. A helper that
       binds (a comprehension's `for` clause, a TypeScript signature) binds through the kind that holds it, and a
       pattern binds through what holds it (API 189): neither refines `Let`, as only a term is a kind. The binders,
       dialect by dialect, are in the table below.
     - *Evaluation keeps what it does* (Q11): no new kind is evaluated; each is refused by name ("Python Patterns
       matchas is not evaluated"), and what a renamed binder evaluated it still evaluates.
     - *Editions as data* (Q10, mbse-basis [CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md)):
       each new dialect's `define` covers its standard's editions by their designations, each with the dialect's
       own kinds it has (`SINCE`); a feature within a kind is not recorded, as for C's.
     - *Completeness as data* (Q9): each new dialect is checked, exactly, against its reference grammar's node list,
       kept as data in `grammars/`, every node mapped to a kind or a helper or listed as not an expression with its
       reason (DIA-20, DIA-23, DIA-26 and DIA-29's shape); no test depends on the parser.
     - *Installs in any order within a family* (API 168): each install names the others' `Term`s and helpers by
       name, creating any not yet installed, and every caller's list gains the new installs and defines after its
       family's dialect. A dialect's `reads` is code, not data naming the dialects it uses: none of this is a reason
       to reinstate `Uses` (mbse-basis [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md#decided),
       "No `Uses`"), and none was found in designing the retrofit.

   - **Python** (`Expressions.Python`): three new dialects beside `Python3`.
     - *Its sublanguages.* Python's standard is the Python Software Foundation's documentation, whose Language
       Reference defines a `match` statement's patterns as a grammar of their own (8.6.4, "Patterns", as
       mbse-programs cites it: its category `Pattern`) and type parameter lists (8.11: its category
       `TypeParameter`), and whose typing specification (typing.python.org, "Type annotations") defines type
       expressions, a grammar whose terms are Python expressions; its Library Reference defines `re`'s regular
       expression syntax ("Regular Expression Syntax"), which the record names among the regular expressions that
       are dialects (Decided for stage 6: "regular expressions (ECMA-262's, Python's `re`)"). So `Python Types`,
       `Python Patterns` and `Python RegExp`. Python3's binding targets stay its `Pattern` union (the rule above).
     - *`Python Types`* (`Expressions.Python.Types`; tag `python_types`). Its `Term`: every branch of
       `Expressions.Python.Python3.Term`, as an annotation, a bound or a default may be any expression in Python's
       grammar (which ones the typing specification allows is a constraint, decision 4), then its own kinds and
       invalid syntax, as API 169 has stage 6's. Its own kinds, mbse-programs' `TypeParameter`s, each a name (a
       `str`, as Python3 keeps `ast`'s) and its type expressions *(agent: a type parameter is neither a statement
       nor an expression in mbse-programs, a category of its own, so it is this dialect's, held by the statements
       that list it through its holder)*: `typevar` (`name`, `bound`, `default_value`), `paramspec` (`name`,
       `default_value`) and `typevartuple` (`name`, `default_value`). No helpers. Positions: Python3's `arg`'s
       `annotation` (a lambda's parameters, the helper mbse-programs' function definitions share), and its kinds'
       `bound` and `default_value`; mbse-programs' annotations, return types, type aliases' values and type
       parameter lists hold it through its holder. A type parameter declares a name that the statement listing it
       binds, so none refines `Let`. Editions: Python 3.0 to 3.15, as `Python3`'s, its kinds from 3.12 (`SINCE`; a
       default, 3.13, a feature not recorded). Completeness: `grammars/python3-ast.json` gains `ast`'s `type_param`
       nodes, mapped to its kinds. Printed `T: int = str`, `**P`, `*Ts`.
     - *`Python Patterns`* (`Expressions.Python.Patterns`; tag `python_patterns`). Its `Term`: mbse-programs' eight
       pattern kinds, `matchvalue` (`value`), `matchsingleton` (`value`: `None`, `True` or `False`),
       `matchsequence` (`delimiters`, `patterns`), `matchmapping` (`keys`, `patterns`, `rest`), `matchclass`
       (`cls`, `patterns`, `kwd_attrs`, `kwd_patterns`), `matchstar` (`name`), `matchas` (`pattern`, `name`) and
       `matchor` (`patterns`), then invalid syntax; a name a `str`. It lists none of `Python3`'s branches *(agent)*:
       an expression in a pattern stands in a kind's own slot (`matchvalue`'s `value`, `matchclass`'s `cls`,
       `matchmapping`'s `keys`), which holds `Expressions.Python.Python3.Term`. `matchmapping` and `matchclass` each
       hold several containers (API 210), checked as mbse-programs checks them ("a MatchMapping needs a pattern for
       each key", "a MatchClass needs a pattern for each keyword", "a MatchOr needs two patterns"). No helpers.
       Positions: none in `Python3`, a `match` being a statement; mbse-programs' `case` holds its pattern through
       this dialect's holder. A pattern binds its capture names through what holds it (API 189): it exports
       `bound_names` (`boundNames`), and none refines `Let`. Editions: Python 3.10 to 3.15, every kind from 3.10.
       Completeness: `grammars/python3-ast.json` gains `ast`'s `pattern` nodes, mapped to its kinds, and
       `match_case`, listed as a statement's part.
     - *`Python RegExp`* (`Expressions.Python.RegExp`; tag `python_regexp`). mbse-programs has no kinds for it, so
       its kinds are the constructs `re`'s syntax lists, named as `TypeScript RegExp`'s where the construct is
       ECMAScript's too, each family defining its own copy, as C and C++ do *(agent)*: `pattern` (its
       `alternatives`), `alternative`, `group`, `capturinggroup` (`name`, optional), `quantifier` (`min`, `max`,
       `greedy`, `possessive`), `characterclass`, `characterclassrange`, `characterset` (a category: `.`, `\d`,
       `\w`, `\s` and their negations), `character` (a code point, with its spelling), `assertion` (`^`, `$`, `\A`,
       `\Z`, `\b`, `\B`, and lookaheads and lookbehinds), `backreference` (a number or a name), and Python's own
       `conditional` (`(?(id)yes|no)`), `atomicgroup` (3.11) and `flags` (an inline `(?aiLmsux)`, or scoped
       `(?a-i:...)`), then invalid syntax. Positions: none in `Python3`: a pattern is a string literal there, and
       that a string is a regular expression is the program's to say, never guessed (mbse-basis
       [PRI-025: never guess the schema](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-025));
       mbse-programs, or a constraint's author, holds one through its holder. A named group's name is a label within
       its pattern, which a backreference resolves, not a name the expression binds: none refines `Let` *(agent)*.
       Editions: Python 3.0 to 3.15, `atomicgroup` from 3.11 (a possessive quantifier, 3.11, a feature not
       recorded). Completeness: `grammars/python3-re.json`, new, lists the opcodes `re`'s parser writes
       (`re._constants`, `sre_constants` before 3.11; the operation, position and category codes) with `since` and
       `until`, each mapped to a kind, a helper or an attribute, or listed as not an expression (the compiler's own,
       `INFO`, `MARK`, `FAILURE`) with its reason; checked in both languages, and in Python against the running
       interpreter's `re._constants`, as DIA-20 is against `ast`.
     - *`Python3`* itself: `arg`'s `annotation` holds `Expressions.Python.Types.Term`; its `Term` and its `Pattern`
       keep their branches; its binders refine `Let` (the table below); its `DIALECT` reads `Python Types`, `Python
       Patterns` and `Python RegExp`, as each of them reads the other three. Its `Text.FromText` stays as built
       (Decided, 6): it reads expressions, not patterns or annotations.

   - **TypeScript** (`Expressions.TypeScript`): three new dialects beside `TypeScript5`.
     - *Its sublanguages.* TypeScript's types, mbse-programs' category `TypeNode` and typescript-estree's, are
       today's `Type` union ("most languages will have a dialect for type expressions"); its destructuring patterns,
       mbse-programs' category `Pattern`, are ECMA-262's binding and assignment patterns, grammars of their own
       (14.3.3, "Destructuring Binding Patterns"; 13.15.5, "Destructuring Assignment"), today's `Pattern` union; and
       a regular expression literal (12.9.5) holds ECMA-262's pattern grammar (22.2.1, "Patterns"), which
       typescript-estree keeps as text. So `TypeScript Types`, `TypeScript Patterns` and `TypeScript RegExp`. JSX
       stays `TypeScript5`'s, an extension of its primary expressions as mbse-programs marks it (for the user,
       Open, below).
     - *`TypeScript Types`* (`Expressions.TypeScript.Types`; tag `typescript_types`). Its `Term` is today's
       `Expressions.TypeScript.TypeScript5.Type`, its 45 branches unchanged: mbse-programs' 37 type nodes, whose
       schemas move to it (`Expressions.TypeScript.Types.TSUnionType`), the six terms a type holds (`identifier`,
       `thisexpression`, `literal`, `unaryexpression`, `templateliteral`, `objectexpression`), which stay
       `TypeScript5`'s, as the user decided their listing (mbse-basis [CAP-228: the TypeScript5 expression
       dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-228.md#decided), "(b) as you
       recommended"), and invalid syntax. Its helpers, by the rule above: those only types hold (the `TypeElement`
       union and its signatures); `TSTypeAnnotation`,
       `TSTypeParameterDeclaration`, `TSTypeParameter` and `TSTypeParameterInstantiation` stay `TypeScript5`'s, as
       expressions hold them too. Positions: as today's `Type`'s, `as`, `satisfies`, `<T>x`, annotations, type
       arguments, and type parameters' constraints and defaults. Binders: `tsmappedtype`, `tsfunctiontype` and
       `tsconstructortype` refine `Let` (the table below); a `tsconditionaltype` binds its `infer` declarations
       within its `trueType` by its scopes and does not refine `Let`, as a SystemVerilog conditional binds a
       `matches`' variables (API 172) *(agent)*. Editions: TypeScript 5.0 to 5.9, every kind in each. Completeness:
       `grammars/typescript5-estree.json`'s `types` entries are this dialect's.
     - *`TypeScript Patterns`* (`Expressions.TypeScript.Patterns`; tag `typescript_patterns`). Its `Term` is today's
       `Expressions.TypeScript.TypeScript5.Pattern`, its 16 branches unchanged: its kinds `arraypattern`,
       `objectpattern`, `assignmentpattern` and `restelement`, and `tsparameterproperty`, which only a parameter
       holds, whose schemas move to it; the terms a target may be and `property` and `elision`, which stay
       `TypeScript5`'s; and invalid syntax. `TypeScript5`'s `Term` keeps listing the first three (API 71).
       Positions: as today's, a function's, an arrow's, a signature's, a function type's and an index signature's
       parameters, and an assignment's `left`. A pattern binds through what holds it (API 78, 189): none refines
       `Let`. Editions: TypeScript 5.0 to 5.9. Completeness: the estree file's `patterns` entries.
     - *`TypeScript RegExp`* (`Expressions.TypeScript.RegExp`; tag `typescript_regexp`). mbse-programs has no kinds
       for a regular expression's body (API 74), so its kinds are those of @eslint-community/regexpp, the parser
       ESLint and typescript-eslint read a regular expression's body with, as typescript-estree's are
       TypeScript's *(agent)*: each of regexpp's node types a kind, lowercased (`regexpliteral`, `pattern`,
       `alternative`, `group`, `capturinggroup`, `quantifier`, `characterclass`, `characterclassrange`,
       `classintersection`, `classsubtraction`, `classstringdisjunction`, `stringalternative`,
       `expressioncharacterclass`, `characterset`, `character`, `assertion`, `backreference`, `modifiers`), but
       `Flags` and `ModifierFlags`, helpers; then invalid syntax. Positions: `TypeScript5`'s `constant` holding a
       regular expression keeps its `pattern` and `flags` as written and gains `regexp`, the `regexpliteral` they
       encode, absent where they do not parse: its encoded value beside its spelling (mbse-basis
       [PRI-023: domain representations](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-023)) *(agent)*;
       nothing else holds it (a string given to `new RegExp` is a string, PRI-025). A named group's name is a label,
       as Python's: none refines `Let`. Editions: ECMA-262's, from the 5.1 Edition to the 16th (ECMAScript 2025),
       each by Ecma International's designation (`ECMA-262 6th Edition`), body `org.ecma-international`, number
       `262`, revision its edition, common names as Ecma writes them (`ECMAScript 2015`, `ES2015`) *(agent)*; its
       kinds' `SINCE` from the edition each arrived in (the `v` flag's five, ES2024; `modifiers`, ES2025), a
       feature within a kind (a named group, a lookbehind, ES2018) not recorded. Completeness:
       `grammars/ecmascript-regexpp.json`, new, regexpp's node types at the version pinned when it is written.
     - *`TypeScript5`* itself: its `Type` and `Pattern` unions become the two dialects' `Term`s (named
       `Expressions.TypeScript.Types.Term` and `Expressions.TypeScript.Patterns.Term`), every position that held
       them holding those; its `constant` gains `regexp`; its binders refine `Let`; its `DIALECT` reads the three,
       as each reads the others. Its printer moves the types' and the patterns' printing to their dialects, the
       family's printer merging them, as SystemVerilog's does (API 176).

   - **C and C++** (`Expressions.C`, `Expressions.Cpp`): a `Types` dialect each, and one preprocessor, C's, which
     both read.
     - *Their sublanguages.* ISO/IEC 9899 defines type names as a grammar of their own (6.7.7 in C11, "Type names",
       over 6.7's specifiers and declarators) and the preprocessing directives (6.10); ISO/IEC 14882 defines type-ids
       ([dcl.name], over [dcl.spec] and [dcl.decl]) and its preprocessing directives ([cpp]), which are C's but for
       what each standard adds. So `C Types` and `Cpp Types`, today's `Type` unions, and `C Preprocessor`: "the
       preprocessor is a dialect per family (C's, shared by C and C++ as each standard defines it ...)" (Decided
       for stage 6, Macros), as mbse-programs has one set of directives for both (`Ccpp/Syntax.py`, "Preprocessing
       directives [cpp]"), each recording the editions of both languages that have it. C's and C++'s `Pattern`
       unions stay, as the user decided them (the rule above). C++'s `std::regex` grammar is Open, below.
     - *`C Types`* (`Expressions.C.Types`; tag `c_types`) and *`Cpp Types`* (`Expressions.Cpp.Types`; tag `cpp_types`).
       Each `Term` is today's `Type`, its branches unchanged: `typeid` (its `specifiers` and abstract `declarator`),
       whose schema moves to it, and invalid syntax; each family's `Expressions` `Term` keeps listing `typeid` for the
       positions that hold an expression or a type alike (`sizeof(int)`, `_Generic`'s controlling operand, `offsetof`'s
       first argument, a template's arguments). Helpers, by the rule above: in C a type name's specifiers, declarators,
       parameters and attribute specifiers move, as no expression holds them; in C++ a lambda's declarator holds
       parameters, with their specifiers and declarators, so those stay `Cpp Expressions`' and are read through `reads`.
       An enumeration's body is data (the rule above): `EnumSpecifier` keeps `body` and gains `enumerators`, a container
       of the union `Expressions.C.Types.EnumeratorItem` (and C++'s own), whose branches are `enumerator`
       (`Expressions.C.Types.Enumerator`: `name`, an identifier, `attributes`, `value`, its family's term) and what the
       preprocessor's install adds, its directives and `comment`, as mbse-programs' `EnumeratorList` holds them, with
       its `trailing_comma`. A struct's, a union's and a class's members stay behind `body`. Positions: as today's
       `Type`'s, a cast's type, a compound literal's, a generic association's, an enumeration's fixed type, and C++'s
       named casts, `new`, `typeid` and functional casts. No kind binds. Each holder names its ABI through the adjacency
       every holder inherits, and its type names are read through it as C's are (`Domains.Types`). Editions: C's three
       for `C Types`, C++'s three for `Cpp Types`, `typeid` in each. Completeness: the C and C++ grammar files' `types`
       entries, and `enumerator` and `enumerator_list`, listed today as a body's, mapped to the new helpers.
     - *`C Preprocessor`* (`Expressions.C.Preprocessor`; tag `c_preprocessor`). Its `Term`: mbse-programs'
       directives, `includedirective` (`directive`, `path`, `system`, `macro`), `definedirective` (`name`,
       `function_like`, `parameters`, `variadic`, `replacement`, its tokens' text, "not a tree until the macro is
       used"), `ifdirective` (`condition`, `items`, `alternative`), `ifdefdirective` (`negated`, `name`, `items`,
       `alternative`), `elifdirective`, `elifdefdirective`, `elsedirective` (`items`) and `otherdirective`
       (`directive`, `text`: `#undef`, `#pragma`, `#error`, `#warning`, `#line`, `#embed`); its `definedexpression`
       (`defined(name)`, mbse-programs' expression kind of a condition); `comment`, as `SystemVerilog Preprocessor`
       has it (API 204) *(agent)*; then invalid syntax. A name is C's `Identifier`, a preprocessing token the same in
       both standards *(agent)*. A condition and an include's `macro` hold `Expressions.Framework.Term`, a C or a
       C++ term, as the framework's shared kinds hold any dialect's (Decided, 4), each standard defining its own
       condition's grammar; which language's is a constraint *(agent)*. An `alternative` holds the next `elif`,
       `elifdef` or `else`, as mbse-programs nests them. A directive's `items`, where a value holds the directive (an
       enumeration's body), hold `Expressions.C.Preprocessor.Item`, a union whose branches are named by dialect,
       `c` and `cpp`, each that dialect's `Types`' `EnumeratorItem` union, written with its dialect, then its kind, as
       `Expressions.Framework.Term` is (Decided, 1) *(agent: one schema serves both languages' enumerations,
       whose enumerators hold their own language's terms)*; elsewhere mbse-programs relates its items. It reads C's
       and C++'s `Expressions` and `Types`, whose terms its conditions and items hold. Positions:
       its install adds `definedexpression` to C's and C++'s `Term` and its directives and `comment` to both
       `EnumeratorItem` unions, as SystemVerilog's Preprocessor adds its own to Constraints' `Term` (API 204); every
       other directive is mbse-programs', among its declarations and statements, held through this dialect's
       holder. No macro usage kind: neither mbse-programs nor tree-sitter tells a macro's use from a call or a name
       without the definitions (reported, below). What it binds: a function-like macro's parameters bind within its
       replacement, which is text, and `defined`'s name is a macro's, not a reference: none refines `Let`, as
       SystemVerilog's do not (API 205). Editions: C11, C17, C23, C++17, C++20 and C++23, by their designations,
       `elifdefdirective` C23's and C++23's (mbse-programs' `both(2023, 2023)`); a directive's name within
       `otherdirective` (`#warning`, `#embed`) a feature not recorded. Completeness: the C and C++ grammar files'
       `preproc_*` entries, `comment` and `preproc_defined`, listed today as not expressions, mapped to its kinds.
     - *`C` and `Cpp`* themselves: their `Type` unions become the two `Types`' `Term`s, each position that held one
       holding it; their `Term`s list `definedexpression`; C++'s binders refine `Let` (C has none: C expressions
       bind no names); each `DIALECT` reads its own `Types` and `C Preprocessor`, and C++'s reads none of C's other
       dialects; the writers' `cast(type, operand)` takes a spec of `Types`' `Term`; evaluation reads a
       cast's type from `Types`, as it reads it today from `Type`.

   - **MATLAB, Excel and LaTeX**: no new dialect *(agent)*. None has a standard the record names (whether Excel's
     formulas are ISO/IEC 29500-1's is open, mbse-basis [CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md#open-questions)),
     their kinds stay as they are (Decided, 9), and none has a sublanguage among them: MATLAB's `regexp` and Excel's
     `REGEX` functions take their patterns as strings, as Python's `re` does, and neither dialect holds them. Their
     binders refine `Let` (the table below).
   - **Patterns**: no new dialect; its `quantifier` refines `Let` (the table below), until a quantifier takes a
     `Schemas.OfPattern` as decided (Decided, "Basic is renamed Patterns; a quantifier takes a pattern"), which
     replaces its `name` and its `value` with the pattern's symbols and `spec`.
   - **The binders**, every kind that binds names refining `Expressions.Framework.Let` (Q8, "(a)"), by the rule
     above; "→" renames a property to Let's, "—" leaves Let's property unset, its kind's scopes saying what it binds
     *(agent, each mapping)*:

     | Dialect | Kind | `name` | `value` | `body` | Its own | What its scopes bind |
     |---|---|---|---|---|---|---|
     | Patterns | `quantifier` | `name` | `collection` → `value` | `body` | `quantifier` | `name` in `body` |
     | MATLAB | `arrayfun` | `name` | `array` → `value` | `body` | | `name` in `body` |
     | MATLAB | `import` | `name` (what it imports) | — | `body` | | the names its kind's `names` gives, in `body` |
     | Excel | `let` | the framework's `Let` itself | | | | |
     | Excel | `map` | `name` | `array` → `value` | `body` | | `name` in `body` |
     | LaTeX | `let` | the framework's `Let` itself | | | | |
     | Python3 | `let` | the framework's `Let` itself | | | | |
     | Python3 | `lambda` | — | — | `body` | `args` | the parameters in `body`; defaults in the outer scope (API 60) |
     | Python3 | `listcomp`, `setcomp`, `generatorexp` | — | — | `elt` → `body` | `generators` | each clause's targets in the later clauses and `body`; the first iterable in the outer scope (API 60) |
     | Python3 | `dictcomp` | — | — | `value` → `body` | `key`, `generators` | as a comprehension's, in `key` and `body` |
     | Python3 | `namedexpr` | — | `value` | — | `target` | nothing within it: it binds in the enclosing scope, which a term does not model (API 60) |
     | Python3 | `import` | — | — | `body` | `module`, `alias` | its alias, or its module's first name, in `body` |
     | Python3 | `importfrom` | `name` (what it imports) | — | `body` | `module`, `alias` | its alias, or its name, in `body` |
     | TypeScript5 | `arrowfunctionexpression` | — | — | `body` | `isAsync`, `typeParameters`, `params`, `returnType` | its type parameters and parameters within it (API 78) |
     | TypeScript5 | `functionexpression`, `tsemptybodyfunctionexpression` | — | — | — | as today | its name, type parameters and parameters within it (API 78) |
     | TypeScript5 | `classexpression` | — | — | — | as today | its name and type parameters within it |
     | TypeScript Types | `tsmappedtype` | — | `constraint` → `value` | `typeAnnotation` → `body` | `readonly`, `key`, `nameType`, `optional` | `key` in `nameType` and `body` |
     | TypeScript Types | `tsfunctiontype`, `tsconstructortype` | — | — | — | as today | its type parameters and parameters within it |
     | Cpp | `lambdaexpression` | — | — | — | as today | its template parameters, parameters and init captures within it (API 91) |
     | Cpp | `requiresexpression` | — | — | — | as today | its parameters within its requirements (API 91) |
     | SystemVerilog | `arraymethodwithexpression`, Constraints' `foreachconstraint` | as built in stage 6 (API 172, 199) | | | | |

     A quantifier's `name`, an `arrayfun`'s and a `map`'s are each the one name it binds, which it writes; an
     import's `name` is what it imports, the name it binds being its kind's `names` (API 11), a mismatch with Let's
     `name` kept so that the wire of an import does not change *(agent, for review)*. The renames follow
     `foreachconstraint`'s `array` → `value`. `dictcomp`'s `value` is renamed so that Let's `value` never names
     what a binder binds within. Not binders: a pattern of any family (its holder binds, API 189); a
     `tsconditionaltype`, which binds its `infer` declarations by its scopes, as SystemVerilog's conditional binds a
     `matches`' variables (API 172); a helper that binds (a comprehension's clause, a TypeScript signature), through
     its kind; a regular expression's named group; and a macro definition, a type parameter and C's expressions,
     which bind nothing a term scopes. The framework changes with them: a binder whose role is `QUANTIFIER` or
     `IMPORT` binds by its role, in validation, inference and `Symbolics.free`, so that `Terms.is_binder`'s let
     reading applies only to the `BINDING` role without `scopes` *(agent)*: today inference reads any binder
     without scopes as a let, which a quantifier refining `Let` would break.

   - **What moves out of today's dialects, and what breaks** (a breaking change, in 0.10.0, a breaking release
     anyway):
     - *Moves*: `TypeScript5`'s `Type` union, its 37 type kinds and the helpers only types hold, to `TypeScript
       Types`; its `Pattern` union, its four pattern kinds and `tsparameterproperty`, to `TypeScript Patterns`;
       their printing to those dialects' `Text`. C's and C++'s `Type` unions and `typeid`, to `C Types` and `Cpp
       Types`, with C's type-name helpers. Nothing moves out of `Python3`, whose types, patterns and regular
       expressions are new dialects.
     - *Breaks*: every moved schema's name (`Expressions.TypeScript.TypeScript5.TSUnionType` is
       `Expressions.TypeScript.Types.TSUnionType`; `Expressions.C.Expressions.Type` is `Expressions.C.Types.Term`),
       with no alias (Decided, Namespace, 8); a term's data is unchanged, its branch tags being the same, but a
       snapshot of a store's schemas, and code naming a schema, changes. The binders' renamed properties, so their
       data: Patterns' `quantifier`'s `collection`, MATLAB's `arrayfun`'s and Excel's `map`'s `array` (each now
       `value`), Python3's comprehensions' `elt` and `dictcomp`'s `value` (each now `body`), `tsmappedtype`'s
       `constraint` and `typeAnnotation`; the writers keep their names and argument order. The binders' property
       order, Let's first. C's and C++'s enumerations gain `enumerators`; TypeScript5's `constant` gains `regexp`;
       Python3's `arg`'s `annotation` holds `Python Types`' `Term`. Every caller's install list gains nine installs
       and defines (`Python Types`, `Python Patterns`, `Python RegExp`, `TypeScript Types`, `TypeScript Patterns`,
       `TypeScript RegExp`, `C Types`, `Cpp Types`, `C Preprocessor`), and `Expressions.Framework.Term` and
       `Expressions.Framework.Dialect` nine branches each. The corpus's JSON changes where a renamed property or a
       moved schema's name appears; each new dialect adds a case.
     - *Dependents*: mbse-programs' bridges are its stage 2's, which ports once onto 0.10.0 (Stages, 7);
       mbse-patterns and mbse-codegen-python pin mbse-expressions 0.5.4, and port after mbse-programs (Stages, 7),
       so nothing of theirs breaks now.

   - **The work, partitioned** *(agent)*, as stage 6's was: a core first, alone, then groups in parallel, each on a
     branch of its own from the core's merge, owning disjoint files in both languages, then the coordinator's
     closing work. Every group passes both gates at 100% in both languages (TypeScript on Node 22, 24 and 26) on its
     branch, records each choice where this design is silent as an API item draft, numbered by the coordinator from
     217, and reports any sibling's gap and any reason for `Uses`. The shared files are the coordinator's, who
     serializes them: the corpus (`Conformance/Corpus.py`, `src/Conformance/Corpus.ts` and the written corpora),
     [the API](../port/API.md), both test plans, the suites 05 (FRM) and 06 (DIA), the skill and its packaged
     copies, and the grammar files in `grammars/`. A group touches a shared file only at the touch points listed
     for it, on its branch, so that the coordinator merges the groups one at a time.
     - *Core* (one agent, alone; the coordinator merges it before any group starts). The framework's binder change
       (`Framework/Terms`, `Symbolics`); every binder in today's dialects refining `Let`, with the renames, in
       Patterns, MATLAB, Excel, Python3, TypeScript5 (its `Term`'s kinds) and Cpp, their evaluators, printers,
       writers, partial evaluation and every translator (`Translators/`); and each of the nine new dialects'
       skeleton, so that the groups start with their imports resolving: its package and module, its export
       (`python3/mbse/Expressions/<Family>/__init__.py`, `typescript5/package.json`, `deno.json`), its install (its
       singleton, its holder, its `Term` of invalid syntax alone, a branch of `Expressions.Framework.Term` and of
       `Expressions.Framework.Dialect`), an empty `define`, and its `Terms.Dialect` with `reads`, each family's
       dialects reading one another; and every caller's install list (the suites' setups, `support.py`,
       `support.ts`, the tutorials' toolkit, the corpus's store), and the tutorials whose outputs its renames change,
       re-executed. Its tests: DIA-30, new, a binder of every dialect refining `Let`, its properties and scopes;
       FRM-01, under its ID, the nine dialects and their exports; every case that writes or reads a renamed property,
       under its ID (FRM-02's samples, DIA-19, DIA-21, DIA-24, EVL, COL, PAR, TRN); and the corpus regenerated. The shared files it
       changes are those, as it runs alone.
     - *Python* (group P): `Python Types` and `Python Patterns`, and `Python3`'s changes. Owns
       `python3/mbse/Expressions/Python/{Python3,Types,Patterns}/` and `typescript5/src/Python/{Python3,Types,Patterns}/`,
       and its suites `16_Python_Types` (PYT) and `17_Python_Patterns` (PYP). Touch points: `python3-ast.json`'s
       `type_param` and `pattern` entries, DIA-20, FRM-02's samples and FRM-13's editions of its two dialects, and
       their corpus cases (`python_types`, `python_patterns`).
     - *Python's regular expressions* (group PR): `Python RegExp`. Owns `Python/RegExp/` in both languages, the new
       `grammars/python3-re.json`, and its suite `18_Python_RegExp` (PYR), which checks that file. Touch points:
       FRM-02, FRM-13 and its corpus case (`python_regexp`).
     - *TypeScript* (group T): `TypeScript Types` and `TypeScript Patterns`, the moves out of `TypeScript5`, its
       `constant`'s `regexp` (holding `Expressions.TypeScript.RegExp.Term` by name), and the binders of `TypeScript
       Types`. Owns `TypeScript/{TypeScript5,Types,Patterns}/` in both languages, and its suites `19_TypeScript_Types`
       (TST) and `20_TypeScript_Patterns` (TSP). Touch points: `typescript5-estree.json`'s `types` and `patterns`
       entries, DIA-21 to DIA-23, FRM-02, FRM-13 and the corpus's `typescript5` case and its new cases
       (`typescript_types`, `typescript_patterns`).
     - *TypeScript's regular expressions* (group TR): `TypeScript RegExp`. Owns `TypeScript/RegExp/` in both
       languages, the new `grammars/ecmascript-regexpp.json`, and its suite `21_TypeScript_RegExp` (TSR). Touch
       points: FRM-02, FRM-13 and its corpus case (`typescript_regexp`). A `constant` holding a parsed expression
       is asserted after group T merges, by the coordinator, in TSR.
     - *C and C++ types* (group C): `C Types` and `Cpp Types`, the moves out of C and C++, the enumerations' data, and
       C and C++'s `Domains`, `Evaluators`, `Text` and writers following, with `Translators/Patterns_C` and
       `Patterns_Cpp` (and their TypeScript twins). Owns `C/{Expressions,Types}/` and `Cpp/{Expressions,Types}/` in
       both languages, those translators, and its suites `22_C_Types` (CTY) and `23_Cpp_Types` (XTY). Touch points:
       the C and C++ grammar files' `types`, `enumerator` and `enumerator_list` entries, DIA-11, DIA-12, DIA-24 to
       DIA-26, FRM-02, FRM-13, tutorial 8's cast, and the `c` and `cpp` corpus cases and its new ones (`c_types`,
       `cpp_types`).
     - *The C preprocessor* (group CP): `C Preprocessor`, its install adding `definedexpression` to C's and C++'s
       `Term` and its directives and `comment` to both `EnumeratorItem` unions by name, created where group C's install
       has not run. Owns `C/Preprocessor/` in both languages and its suite `24_C_Preprocessor` (CPD). Touch points:
       the C and C++ grammar files' `preproc_*`, `preproc_defined` and `comment` entries, FRM-02, FRM-13 and its
       corpus case (`c_preprocessor`). A directive within an enumeration is asserted after group C merges, by the
       coordinator, in CPD.
     - *Closing* (the coordinator, after the groups merge): the grammar files and DIA completeness cases merged and
       each new dialect checked exactly, as DIA-29 checks SystemVerilog's; the corpus regenerated, byte-identical
       in both languages; the test plans; [Equivalence](../../EQUIVALENCE.md) where a difference is found; the
       tutorials that name a moved schema or a renamed property; the skill; the API items; and the records: in
       mbse-basis, a capability for each family's sublanguage dialects and one for the binders as `Let`'s
       variations, each implementing [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md)
       (and [FEA-008: expressive program models](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-008.md) for the dialects),
       since a capability met in 0.8.0 does not grow ([the basis](https://github.com/pitaman71/mbse-basis/blob/main/docs/README.md#the-design-spec)),
       and [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md)'s
       stage 6 marked built; then the release, 0.10.0.

   - **Open, for the user** (each checked against the Decided sections, which do not settle it; the build proceeds
     on the recommendation, each answer changing one group at most):
     1. *Which regular expressions are dialects.* The record names "ECMA-262's, Python's `re`", by the rule "if the
        standard says it's a sublanguage". Python's is its Library Reference's, a pattern held by no grammar
        position, only by a string; and ISO/IEC 14882 itself defines `std::regex`'s grammars ([re.grammar]:
        ECMAScript's, modified, and POSIX's basic, extended, awk, grep and egrep), which the record does not name.
        (a) Only a regular expression a language's grammar holds (ECMAScript's literal): `Python RegExp` dropped,
        against the record's naming of it. (b) Each a language's standard defines, its library's included:
        ECMA-262's, Python's `re` and C++'s [re.grammar], as `Cpp RegExp`, a further group designed once answered;
        not MATLAB's or Excel's, which have no standard recorded. (c) (b), and MATLAB's `regexp` and Excel's
        `REGEX` functions too. *Recommended: (b)*, the record's rule read as written; group PR proceeds under (b)
        or (c).
     2. *JSX.* Decided, 5 named JSX among the sublanguages an expression holds, and stage 6 makes a sublanguage a
        dialect; but the retrofit as recorded ("type, pattern, regex and preprocessor dialects") does not name it,
        and JSX's own specification calls it a syntax extension of ECMAScript, which mbse-programs marks as an
        extension. (a) JSX stays `TypeScript5`'s extension kinds. (b) `TypeScript JSX`, a dialect of its own, its
        kinds and helpers moved as the types' are, in group T. *Recommended: (a)*: no standard defines it as a
        sublanguage, and it can move later as the types do now, with nothing built on it to rework.
   - **Reported, for mbse-programs' port** (mbse-basis [PRI-032: a sibling's gap is reported, not worked around](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-032)):
     it has no kinds for a regular expression's body, in TypeScript or in Python, so its reader leaves
     `TypeScript RegExp` unwritten until it parses one (as regexpp does); and it cannot tell a C or C++ macro's use
     from a call or a name without the definitions, so no macro usage kind is modeled here
     ([CAP-093: every construct of C's and C++'s standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-093.md),
     [CAP-068: C and C++ read by Clang](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-068.md)).

   *As built* (branch `retrofit`: the core, then `retrofit-python`, `retrofit-typescript` and `retrofit-c` merged into
   it; every choice made where the design and the decisions were silent is in
   [the API, Settled in the retrofit](../port/API.md#settled-in-the-retrofit-for-the-users-review), items 217 to
   268). Every binder refines `Let`, as the table has it, and the seven dialects groups P, T and C owned are built as
   designed, in both languages, each with its install, `define` (its editions), holder, `Terms.Dialect` reading its
   family's others, printer merged into its family's, and suite: `16_Python_Types` (PYT), `17_Python_Patterns` (PYP),
   `19_TypeScript_Types` (TST), `20_TypeScript_Patterns` (TSP), `22_C_Types` (CTY), `23_Cpp_Types` (XTY) and
   `24_C_Preprocessor` (CPD); the grammar files map each new dialect's nodes, DIA-20, DIA-23 and DIA-26 checking them;
   the corpus has a case of each. Two choices differ from the design, for review: an enumerator is a kind of each
   `Types` dialect, not a helper union (API 247), and a type's position is a term slot (API 249). Not built, waiting on
   the user: `Python RegExp` and `TypeScript RegExp` (Open, 1, groups PR and TR) and JSX (Open, 2).
   Recorded in mbse-basis as [CAP-276: Python's types and match patterns as expressions of their own](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-276.md),
   [CAP-277: TypeScript's types and destructuring patterns as expressions of their own](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-277.md),
   [CAP-278: C's and C++'s type names and preprocessor directives as expressions of their own](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-278.md) and
   [CAP-279: names an expression binds found alike in every language](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-279.md).

   *Found while building*:
   - **A value object of terms held alone was read as a slot** (`TSTypeAnnotation`): `Terms._parts` read such a pair
     as a helper only within a container; it now reads one held alone so too (API 238).
   - **The C family's TypeScript modules imported each other at load**: C++'s module body reads C's constants, so a
     static import from C Preprocessor to C++ made a cycle (`ReferenceError`); the family's shared reading moved to an
     internal module, `C.Expressions.Kinds`, which none of its dialect modules imports beside (API 246).
   - **The framework reads a helper union one level deep**, so the design's `EnumeratorItem` union and the
     preprocessor's union of unions (`Item`) could not hold the directives among an enumeration's items: an enumerator
     is a kind instead, an enumeration's items its Types' `Term`, and a directive's `Expressions.Framework.Term`
     (API 247).
   - **The groups named a refused kind differently**, P and T by the dialect owning it, C by the dialect evaluating
     it; the coordinator decided for the owner, everywhere, through the framework's `Dialect.owner` (API 261, 262).
   - **Invalid syntax within a helper holds no term**, so no owner can be read from it: a printer names it by the
     dialect printing it (API 261).
   - **A constant is described as `None` in refusal messages** (API 216): still open with the user, left as it is.

7. **Tutorials, skill, README, EQUIVALENCE; the releases.** The tutorials and the skill followed each stage as it
   landed. **0.8.0 is released after stage 5**, as the user decided (Decided, "0.8.0 holds stages 1 to 5"): stages 1
   to 5 and the namespace rename, a breaking change, on mbse-schemas 0.26.10. 0.9.0 is domains as data ([the domains proposal](../domains/README.md)); 0.10.0 follows stage 6 and the retrofit.
   Then mbse-programs' stage 2, mbse-patterns and mbse-codegen-python.

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
- **Tech debt, type specificity**: [CAP-255: type checkers catch mistakes in code that builds expressions](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-255.md).

---

<!-- nav -->
[← FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) · [Home](../../../README.md) · [The gaps, dialect by dialect →](GAPS.md)
