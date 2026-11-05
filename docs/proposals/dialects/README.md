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
  1. Patterns, the neutral form and no standard's language, is `Expressions.Framework.Patterns`.
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
  of the other dialects (type, pattern, regex and preprocessor dialects, `let` variations). Its timing is open.

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
[← FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) · [Home](../../../README.md) · [The gaps, dialect by dialect →](GAPS.md)
