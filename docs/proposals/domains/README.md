<!-- nav -->
[← Complete expression dialects](../dialects/README.md) · [Home](../../../README.md)

# Domains as data (a proposal, for review)

A domain should be schema-governed data, held in a store like any other model, with only the arithmetic it implies
left as code. Today most domains are plain code objects, and the one form that is data is a copy of them. Asked why
there is a "working" domain beside the stored one, the user agreed there should be none: "Yes, write it up". This
proposes one form of a domain, and asks what only the user can decide. Nothing is built until it is decided.

## Where it stands

Since stage 3 of the port, a domain can be stored: an `Expressions.Framework.Domain`, a reference object holding its
`kind`, a value of the union `Expressions.Framework.DomainKind`, owned by its dialect through
`Expressions.Framework.Defines(dialect, name, domain)` and linked to its scalar schema by `HasDomain`. Only the
Patterns dialect (formerly Basic) defines domain kinds, and only Patterns stores domains.

Everything that uses a domain uses code objects instead:

| Module (Python; TypeScript has the same) | Lines | What it holds |
|---|---|---|
| `Framework/Domains.py` | 268 | `Domain` (a protocol: `contains`, `includes`), `Signature`, `OfTypes`, `OfValues`, `OfUnion`, `Anything`, `Function`, `Same`, `Overloaded`, `Opaque`, `Either` |
| `Framework/Patterns/Domains.py` | 739 | 14 dataclasses (`_Integer`, `_Ieee754`, `_Bits`, `_Bytes`, `_Unicode`, `_Enum`, `_Packed`, ...), the defaults, `SIGNATURES`, and `read`, which turns a stored domain into one of these |
| `C/Expressions/Domains.py` | 319 | `CType`, C's integer and floating types as module constants, promotion and the usual arithmetic conversions, operator signatures |
| `SystemVerilog/Expressions/Domains.py` | 216 | 4-state logic vectors, their widths and signedness |
| `{Excel,MATLAB,LaTeX}/Expressions/Domains.py`, `Python/Python3/Domains.py`, `TypeScript/TypeScript5/Domains.py` | 48 to 103 each | each dialect's value domains and operator signatures |

So there are two forms of a Patterns domain, the stored one and the dataclass it is read into, and one form, code only,
of every other dialect's. Operator signatures are code too, though stage 3 modeled every Patterns operation as data, a
`Schemas.OfExpression` whose pattern's variables are its arguments and whose `result` is its return
([API.md](../port/API.md), Settled in stage 3, 20 to 22): the code table `Domains.SIGNATURES` and the stored operations
describe the same thing twice.

Since stage 3 a term carries no domain, so evaluation reads no stored domain at all. The code objects serve the
defaults (an unbounded integer, binary64), C's and SystemVerilog's types, operator signatures and validation of
literals (a value out of range).

How it came to be: stage 3 recorded "what a domain means stays code, as intrinsics' implementations are", the agent's
proposal, never put to the user on its own. In building, "what a domain means" grew to cover the domains themselves.
It cuts against [PRI-018: no model needs code to read or write](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-018) and the user's "Dialects should be models".

## Decided, that applies

- **Domains are objects, defined by dialects** (2026-10-28; mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided) and [CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided)):
  "all scalars are domains and users may define domains and dialects containing domains"; "a scalar schema can have >
  1 domain"; "width is a property of the domain, not the schema"; a dialect defines its domains by name, through
  `Expressions.Framework.Defines(dialect, name, domain)`.
- **Dialects are models**: "Dialects should be models"; "each dialect has a singleton by name".
- **Terms carry no domain; inference is a follow-up**: "Terms do not designate their schema. Whatever reference object
  owns the root term must specify its schema." "For the time being, evaluation will need to do without an external
  source specifying the domain for every term, as that involves building a type inference system which should be a
  follow-up capability" ([CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)).
- **Only intrinsics' implementations are code** (schema extension 9, in [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md#decided)): "printers and parsers go
  through Visitor just like everything else"; only intrinsics' implementations are code, each found through its named
  reference object.
- **Standing rules**: "Never guess the schema"; no DSL wrapping builder syntax ([PRI-019: fluent builder syntax](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-019)); concrete references are paths
  ([PRI-015: concrete references are programmatic](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-015)).

## Proposed

One form of a domain: the stored one. Concretely:

1. **Every dialect stores its domains.** Each dialect's install defines its domain kinds by schema extension of
   `DomainKind` (as dialects extend `Term`), and its define writes its domains as `Expressions.Framework.Domain`
   objects, owned by its singleton through `Defines`, by name: Patterns' defaults (`int`, `float`, ...), C's and C++'s
   types (`int`, `unsigned long long`, `size_t`, ...), SystemVerilog's (`logic`, `bit`, sized vectors), Python's,
   TypeScript's, MATLAB's, Excel's and LaTeX's value domains.
2. **What a domain means is its properties, inferred ones included.** As the user decided (2026-11-04), correcting
   this proposal's first draft ("What a domain means becomes functions"): "no. inferred properties are still
   properties. For now they must be hand populated, but eventually they will be computed by constraint resolution."
   A domain stores its parameters (width, signedness, overflow, format, rounding) and the properties that follow from
   them (its least and greatest values, whether it is ordered, the domain a result is fitted into, ...) alike, as
   properties of its kind; the inferred ones are populated by hand in each dialect's define until constraint
   resolution computes them ([CAP-043: constraints resolved in any direction](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-043.md)). No domain is a class or a function; the
   dataclasses and `read` go. Evaluation's arithmetic (adding two values, rounding a result) is the evaluator's, as
   now, reading the domain's properties.
3. **Operator signatures are the stored operations** (their result domains deferred to CAP-232, Decided, 2). An operation's argument and result schemas say what
   `SIGNATURES` says; the code tables go, and validation and inference read the stored operations. What a rule would
   compute (C's usual arithmetic conversions, "the same domain as its arguments") is, by the same decision, an inferred
   property: the result domain for each combination of argument domains, populated by hand until constraint
   resolution computes it (question 2).
4. **The framework keeps only protocols.** `Domain`, `Signature` and friends become the reading interface over stored
   domains and operations; `Anything` and `Opaque` become stored domains of the framework, or the absence of one
   (question 3).
5. **Validation reads stored domains.** A literal out of range is reported against the domain its dialect stores for
   it, not a code constant.

## Decided, on this proposal

As the user decided (2026-11-04), on the questions below:

- **When it is taken up** (2026-11-05): asked "What should I start next?", the user chose "Domains-as-data
  (Recommended)": after 0.8.0, before stage 6 of the complete dialects (SystemVerilog complete) and mbse-programs'
  port. This settles whether it comes after 0.8.0 or after 0.9.0 (A stopping point for the overhaul, below).
- **On stage 1's design** (2026-11-06), the user's answers to its questions A to D (Stage 1's design, below):
  - **A. No pool of shared kinds**: "Do we need "pure shared" types at all? I don't mind dialects depending on other
    dialects such as IEEE-754 for example." Read so: a published standard is a dialect of its own, its kinds its own,
    and a dialect's domains are instances of the kinds of the dialects it uses, its install depending on theirs. This
    supersedes "each install stands alone" ([API](../port/API.md), 35) where a dialect uses another's kinds, and refines
    4, below: a kind is shared by being its standard dialect's, not by belonging to a common pool.
  - **B. A language's own domains are its dialect's**: "yes, SV specific domains are part of the SV dialect (that seems
    obvious to me). Type inference tokens like `nullptr_t` should get their own domain here". So SystemVerilog's
    4-state types are SystemVerilog's domains, of its own kind; by the same rule Python's `str` and TypeScript's
    `string` are their dialects' own; and a type inference token, such as `nullptr_t`, has a stored domain in this
    proposal.
  - **C. No lone terms**: "there is no valid programming context where a lone term needs a domain or schema". A term
    is validated and inferred within its holder, an `Expression` in a store with its dialect, which reaches the store
    (`Proxies.store_of`); nothing is designed for a term alone.
  - **D. The releases**: "agreed": domains as data is released as 0.9.0; stage 6 of the complete dialects and the
    retrofit of the other dialects as 0.10.0.
  - Stage 1's text, leaving the result-domain relation to CAP-232 (Stages, 1), was put to the user with these, and
    stands.
- **1. Before domain inference**: "1,5. yes before per your recommendation": domains as data first, as its own
  release; CAP-232 builds on stored domains.
- **3. `Anything` and `Opaque`**: "agreed. Schemas.OfAny kind of handles that": no stored "anything" domain; where
  nothing is known, a result's domain is absent, its value an unrestricted `Schemas.OfAny`.
- **4. Kinds shared per standard**: "proceed with this for now. I will review": Patterns' kinds (two's complement,
  IEEE 754, IEEE 1164, ...) shared, each dialect's domains instances of them under its own names. Refined by A, above
  (2026-11-06): a standard's kinds are its own dialect's.
- **5. Typing C literals by suffix**: "1,5. yes before per your recommendation": kept, as a lookup of the stored domain
  by the literal's suffix and base.
- **2. Operations' result domains: deferred to CAP-232.** Asked what "code intrinsics" meant (the first draft's word,
  for a rule implemented as a function registered by the operation's name, which "inferred properties are still
  properties" rules out), then shown that the question is the relation from an operation's argument domains to its
  result domain: "I wasn't expecting that to become an issue until CAP-232." Proposed and agreed ("yes"): this
  proposal stores each dialect's domains, their parameters and hand-populated properties, and each operation's
  argument and result schemas as stage 3 has them; the relation from argument domains to result domain, and how it is
  populated, are domain inference's ([CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)). Until then `Dialect.infer`'s signatures stay as they are, marked as CAP-232's to
  replace, and evaluation's arithmetic (C's usual arithmetic conversions applied to the values it computes) is the
  evaluator's, as now.

## Questions for the user

1. **Order with domain inference (CAP-232).** (a) This first, as its own release: inference then builds on stored
   domains. (b) Together with inference, since much of what reads domains today exists for want of inference.
   *Recommended: (a)*: it is a model change, inference is a capability on top.
2. **How a rule's results are populated by hand.** "The same domain as its arguments" is one property per operation;
   C's usual arithmetic conversions are a result domain per pair of arithmetic types (about a dozen types, so on the
   order of a hundred entries in C, fewer in C++'s overlap). (a) Stored as entries of a relation from an operation and
   its argument domains to its result domain, written in each dialect's define. (b) A smaller rule-shaped model (a
   rank per type and "the higher rank wins"), itself properties. *Recommended: (a)*: it is plain data, and what
   constraint resolution will later compute is exactly those entries.
3. **`Anything` and `Opaque`.** (a) Stored domains of the framework, `Expressions.Framework.Anything`, every
   dialect's result where nothing is known. (b) The absence of a domain, an operation's result left unconstrained.
   *Recommended: (b)*, since a term's domain is already absent where not inferred.
4. **One domain kind per standard concept, shared, or per dialect.** C's `unsigned int` and Patterns' 32-bit unsigned
   integer are the same two's-complement integer. (a) Patterns' `integer` kind, shared, C's domains instances of it
   with C's names. (b) Each dialect its own kinds. *Recommended: (a)*, as [PRI-012: model published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-012)
   has it: the standard (two's complement, IEEE 754, IEEE 1164) is the kind, the dialect names its instances.
5. **Typing C literals by suffix.** Stage 5 types a C literal by its suffix and base from code tables, before CAP-232
   (an open question from #19's review). With C's types stored, it becomes a lookup of a stored domain by the
   literal's suffix. (a) Keep it, reading stored domains. (b) Defer it to CAP-232. *Recommended: (a)*: it is what the
   old typed constant did, and it is a lookup, not inference.

## Stages (proposed, once decided)

Each passes both gates at 100% in both languages, on every supported Node version, with the corpora regenerated, and a
whole-record review before it is brought to the user.

1. The framework: domain kinds by extension in every dialect, their parameters and inferred properties, and the
   reading interface. The relation holding operations' result domains, first listed here, is domain inference's, its
   population with it (Decided, on this proposal, 2): stage 1 stores none of it. Its design is below.
2. Patterns: its domains stored, its dataclasses and `read` gone, `SIGNATURES` replaced by its stored operations.
3. C and Cpp; then SystemVerilog; then Python3, TypeScript5, MATLAB, Excel and LaTeX: each its domains stored.
4. Records in mbse-basis (CAP-097, CAP-232, CAP-226), and release.

## Stage 1's design (for review; paused on E to H)

Based on the code at 0.8.0 (`python3/mbse/Expressions/`, `typescript5/src/`, the same in both), revised by the user's
answers of 2026-11-06 (Decided, on this proposal, A to D). Where the decisions are silent the choices below are the
agent's, for review; E to H are choices the answers leave open, asked before building.

**Schemas.** `Expressions.Framework.Domain`, `DomainKind`, `Defines` and `HasDomain` stay as stage 3 has them. No
stored "anything" domain (Decided, 3), and no relation from argument domains to a result domain (Decided, 2). Each
kind's schema gains its inferred properties beside its parameters, as properties of the kind (Proposed, 2), all
optional, populated by hand in the define of each dialect that writes a domain of the kind. Today's nine kinds, under
the owners E proposes:

| Kind | Owner (E) | Parameters (unchanged) | Inferred properties, new | Today computed by |
|---|---|---|---|---|
| `ieee754` | IEEE 754 | `format`, `rounding` | `radix`, `precision`, `emax`, the parameters IEEE 754-2019 gives each interchange format; `ordered` (true) | `Ieee754.FORMATS` |
| `ieee1164` | IEEE 1164 | `width` | `ordered` (false) | `ORDERED` |
| `unicode` | Unicode | none | `ordered` (true) | `ORDERED` |
| `bool` | Patterns | none | `ordered` (false) | `ORDERED` |
| `integer` | Patterns | `width`, `signed`, `overflow` | `least`, `greatest` (ints, absent where unbounded), `ordered` (true) | `bounds()` |
| `bits`, `bytes` | Patterns | `width` | `ordered` (false, true) | `ORDERED` |
| `enum`, `packed` | Patterns | `members`; `codes`, and `Packs` | `ordered` (false, true) | `ORDERED` |

What a result is fitted into is the domain's own parameters for an integer (`overflow`), and for C a rule over argument
domains (the promotions, the usual arithmetic conversions), which is the relation Decided, 2 leaves to
[CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md); so no kind gains a link to another domain. A
domain's name is the name its dialect defines it by (its `Defines` entry), so no kind stores one.

**A language's own kinds** (Decided, B), each its dialect's, added to `DomainKind` by its install, with no parameters
but where shown; stage 3 writes their domains:

| Dialect | Its own kinds | Its domains of other dialects' kinds (stage 3) |
|---|---|---|
| SystemVerilog | `logic`: IEEE 1800's 4-state integral, `width`, `signed`; inferred `least`, `greatest` (of its known values), `ordered` (true) | its 2-state types (`integer`), `real`, `shortreal` (`ieee754`) |
| Python3 | `str` (code points, lone surrogates included), `ordered` (true); the tokens `nonetype`, `ellipsis`, and H's | `bool`, `int`, `float`, `bytes` |
| TypeScript5 | `string` (UTF-16 code units), `ordered` (true); the token `null`, and H's | `boolean`, `bigint` (`integer`), `number` (`ieee754`) |
| C, Cpp | the token `nullptr_t`, each its own (as each defines the kinds they share, [API](../port/API.md), 35) | the integer and character types (`integer`), the floating types (`ieee754`), strings (`unicode`) |
| MATLAB, Excel, LaTeX | H's | their logicals, numbers and text (`bool`, `ieee754`, `integer`, `unicode`) |

A token's domain has no schema (`HasDomain`): no basic scalar holds its value, which its dialect's `constant` writes.
Compound values (data objects, records, structs, lists, mappings) are not domains: they have schemas
(H proposes so). C's `_Decimal32` needs IEEE 754's `decimal32`, a parameter value, which stage 3 adds.

**The reading interface**, in `Framework.Domains` (TypeScript the same, camelCase), over a stored domain's
`Readers.OfObject`, found by its path (`dialect.domains({"name": "uint8"})`,
[PRI-015: concrete references are programmatic](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-015)) or its schema's `domain`:

- `kind_of(domain)`: its kind, `(tag, record)`, as `Terms.kind_of` reads a term's ("a domain needs a kind" where it
  holds none).
- `properties(domain)`: its kind's properties set, parameters and inferred alike, by name (a container as a tuple, an
  array in TypeScript): what `read` gave as a dataclass's fields.
- `name_of(domain)`: the name its dialect defines it by, or None.
- `operations(dialect)`: a dialect's operations by name, each its `Schemas.OfExpression`, and `arity(operation)`, its
  pattern's number of variables: what validation reads from `SIGNATURES` today.

They replace `read` (and the dataclasses' fields) and validation's reads of `SIGNATURES` (`CORE`, a closed kind's
vocabulary) in stage 2. `Domain`, `Signature`, `OfTypes`, `OfValues`, `OfUnion`, `Anything`, `Function`, `Same`,
`Overloaded`, `Opaque`, `Either` and `overlaps` stay, as `Dialect.infer`'s, each marked in a source comment as
CAP-232's to replace (Decided, 2); so do each dialect's vocabularies, as infer's signatures.

**Through the holder** (Decided, C). In stage 2, validation and inference read a dialect's stored data from the store
of the term's holder (`Proxies.store_of`), which `Terms.term` already reads a term from; no argument is added. What
validates or infers a lone term today, to change then: the suites' `term(spec)` helper ([API](../port/API.md), 8),
behind about 210 `validate` and 50 `infer` calls in each language's tests, which then writes a holder; tutorial 1's
three `E.DIALECT.validate` calls are of holders already, unchanged; SystemVerilog's evaluator, which validates a term's structure
before evaluating it, reading no stored data; and the skill's `DIALECT.validate(term, bound)`. Evaluation, which reads
no domain, still takes any term. Stage 1 changes none of it.

**What changes in stage 1.** The framework: the reading interface. The standard dialects (E): each its install, its
singleton and its kinds, IEEE 754's, IEEE 1164's and Unicode's moved out of Patterns. Patterns: its kinds' inferred
properties; its `define` populates them for its eight domains, its `float`, `binary32`, `str` and `std_logic` now of the
standard dialects' kinds, so it uses them (F); `read` ignores inferred properties until stage 2 removes it.
SystemVerilog, Python3, TypeScript5, C and Cpp: their own kinds, above. MATLAB, Excel and LaTeX: H's. No other
dialect's domain is written (stage 3), and no evaluator, validator or translator changes.

**Tests and corpus.** DOM gains a case for the inferred properties and the reading interface; FRM-01 lists the new
dialects and kinds; the corpus's `domains` case gains the inferred properties and the standard dialects' kinds, its
JSON regenerated, byte-identical in both languages.

**E. Which standards are dialects, and what Patterns keeps.** Of today's nine kinds, three have a published standard
of their own: IEEE 754-2019, IEEE 1164-1993 and the Unicode Standard. Two's complement integers, booleans, bit and
octet strings, enumerations and packings have none of their own; ISO/IEC 11404 has them all, and replacing Patterns
with it is [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md), a
capability of its own. (a) The three are dialects; Patterns keeps the other six (and `Packs`) until CAP-180. (b) An
ISO/IEC 11404 dialect now, holding the six, CAP-180 begun here. (c) Each of the six a dialect of its own. *Recommended:
(a)*: each kind is its standard's where one exists, and none is invented where none does
([PRI-012: model published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-012)).

**F. How a dialect declares and installs the dialects it uses.** An install is one transaction, and "a program runs
the installs it needs" (no helper over them, [API](../port/API.md), The installs). (a) The caller runs the installs in
order of use; an install names the kinds it uses by their schemas' names, so mbse-schemas refuses it where they are
not installed; and the use is data, a relation `Expressions.Framework.Uses(dialect, used)`, unique both ways together,
the singleton's adjacency `uses`, which the dialect's install writes. (b) As (a), with no `Uses`. (c) Each dialect
module also exports `install_all(store)`, running its uses' installs then its own: a helper over the installs.
*Recommended: (a)*: the dependency is model data, and no helper wraps the installs.

**G. A standard dialect's name and shape.** (1) Its path, by the namespace's rule (a family named as its standard names
the language, its dialect named by what it is): (a) `Expressions.IEEE754.Expressions`, `Expressions.IEEE1164.Expressions`,
`Expressions.Unicode.Expressions`, named `IEEE754`, `IEEE1164` and `Unicode` as `C.Expressions` is `C`; (b)
`Expressions.IEEE754.Domains`, ..., named by what they hold today; (c) the body as the family, `Expressions.IEEE.IEEE754`.
*Recommended: (a)*: a standard dialect may gain operations and terms (IEEE 754's operations), and its name stays its
standard's. (2) Its shape: a singleton of its own schema, a branch of `Expressions.Framework.Dialect`, with its kinds of
domain, and no `Term`, holder or `Terms.Dialect` until it has terms. (3) Its standard, as tagged data (the dialects
proposal's Decided, Q10: "each edition stored with its designation and its common names as tags", "built with domains
as data"): the standards model is not designed yet. (a) A stage of this proposal of its own, after stage 3, every
dialect's standards then data (`Terms.Kind.standards` among them); until then each standard dialect names its standard
in code by designation (`IEEE Std 754-2019`), as stage 6 does SystemVerilog's. (b) Designed and built in stage 1.
*Recommended: (a)*: one model for every dialect's standards, designed once.

**H. Which other values are type inference tokens** (Decided, B, "like `nullptr_t`"). Tokens, each a stored domain of a
kind of its own: `nullptr_t` (C, Cpp), `None`'s and `...`'s types (Python3) and `null`'s (TypeScript5), each a type of
exactly one value its dialect's `constant` writes. Not clear-cut: (1) Python's `complex`: a number, a pair of binary64
parts, not one value; (a) Python3's own domain, of its own kind; (b) not a domain, its code domain staying inference's.
*Recommended: (a)*, a scalar of Python's numeric tower. (2) TypeScript's `RegExp`: an object of ECMA-262, not a value
of a type of its own; (a) not a domain; (b) TypeScript5's own domain. *Recommended: (a)*. (3) Excel's error values
(`#N/A`, `#VALUE!`, ...), which formulas compute with: (a) Excel's own domain, of its own kind (its members the error
codes); (b) Patterns' `enum`; (c) not a domain. *Recommended: (a)*. (4) Compound values (data objects, records,
structs, lists, mappings): (a) not domains, as they have schemas, their code domains inference's; (b) domains.
*Recommended: (a)*.

## Risks

- **Cost**: stores hold hundreds more objects (every dialect's types), and installs grow; suites build stores often.
- **Equivalence**: the hand-populated properties written once, as data each dialect's define writes in both
  languages, byte-identical on the wire.
- **Hand-populated properties drift**: what today's dataclasses compute (a domain's bounds, a result's domain) is
  written by hand until constraint resolution; the suites pin each against today's behavior, and a property that
  disagrees with its parameters is a constraint a later resolver reports.

## A stopping point for the overhaul

Where the plan stands: mbse-schemas has its 0.26.x fixes; mbse-expressions 0.8.0 holds stages 1 to 5 of the complete
dialects (the framework, Python3, TypeScript5, C and Cpp) and the namespace rename, on mbse-schemas 0.26.10; stage 6
(SystemVerilog complete) and the retrofit of the other dialects are 0.10.0's, after this proposal's 0.9.0 (Decided, on
this proposal, D); then mbse-programs' port, mbse-patterns'
re-scoping, and mbse-codegen-python.

The stopping point first recommended here was mbse-expressions 0.8.0 released after stage 6, so that no dialect would
be released as a subset of its language. The user chose instead to release 0.8.0 after stage 5, stage 6 and the
retrofit coming in the next release, now 0.10.0 ([the dialects proposal](../dialects/README.md#decided), Decided, "0.8.0 holds stages 1 to
5"), so `SystemVerilog` is released in 0.8.0 as it stands. #19's open questions are settled (the empty value object in
mbse-schemas, C++'s two ways to write a name, the C and Cpp `Pattern` held by nothing, C's writers). Stage 4 is
recorded in mbse-basis ([CAP-228: the TypeScript5 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-228.md)); stage 5 is not yet
([CAP-229: the C expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-229.md) and
[CAP-230: the C++ expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-230.md) have no As built). This proposal
is taken up after 0.8.0, before stage 6 and mbse-programs' port (Decided, on this proposal, "When it is taken up").

Why before mbse-programs' port:

- **Domains change the model under every dialect.** Doing them before mbse-programs builds on the dialects means
  mbse-programs ports once. Doing them inside the 0.8.0 effort would reopen four merged stages mid-flight.
- **The open defects and decisions were small and known**, and are settled, so 0.8.0 ships no workarounds.
- **It resets the process** the user asked for: smaller stages, more agents, design passes before builds,
  whole-record reviews, at a natural boundary.

---

<!-- nav -->
[← Complete expression dialects](../dialects/README.md) · [Home](../../../README.md)
