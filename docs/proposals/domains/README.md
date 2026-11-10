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
`Expressions.Framework.Defines(dialect, name, domain)` and linked to its scalar schema by `HasDomain`. At 0.8.0 only
the Patterns dialect (formerly Basic) defined domain kinds and stored domains; since stage 1 (below) the standard
dialects do, and each language's dialect defines its own kinds.

Everything that uses a domain uses code objects instead:

| Module (Python; TypeScript has the same) | Lines | What it holds |
|---|---|---|
| `Framework/Domains.py` | 268 | `Domain` (a protocol: `contains`, `includes`), `Signature`, `OfTypes`, `OfValues`, `OfUnion`, `Anything`, `Function`, `Same`, `Overloaded`, `Opaque`, `Either` |
| `Patterns/Expressions/Domains.py` | 739 | 14 dataclasses (`_Integer`, `_Ieee754`, `_Bits`, `_Bytes`, `_Unicode`, `_Enum`, `_Packed`, ...), the defaults, `SIGNATURES`, and `read`, which turns a stored domain into one of these |
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
- **On stage 1's design, E to H** (2026-11-06), each approved "yes" as the coordinating agent put it, the user's words
  quoted:
  - **E. An ISO/IEC 11404 dialect, and Patterns holds no kinds or domains.** To (a)'s "don't invent a standard where
    none exists" the user answered that it is at odds with (b): ISO/IEC 11404 is a published standard, which has the
    six kinds (integer, boolean, bit string, octet string, enumerated, packing), so by [PRI-012: model published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-012) they are its dialect's,
    as [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md) has it ("ISO/IEC 11404 replaces Basic expression dialect", "Datatype
    operations are modeled, not coded"). In stage 1 the ISO/IEC 11404 dialect holds those six kinds beside the IEEE
    754, IEEE 1164 and Unicode dialects; replacing Patterns entirely, and modeling 11404's operations, stay CAP-180's.
    (Their names, *revised* 2026-11-09: the kinds are named as 11404 declares them, `enumerated` read as 11404's
    unordered `state`, and packing is not an 11404 datatype; Decided, "On stage 1's review", "Names are the standards'
    own".)
    And: "I am sensing repeated suggestions to consolidate things under `Patterns` and I don't know where that comes
    from". Where it came from: Patterns was Basic, which held the scalar kinds and domains, never moved out when it
    was renamed for its quantifiers over `OfPattern`; this proposal's question 4 recommended "Patterns' `integer`
    kind, shared", writing that inheritance into a decision; and the package root re-exported Patterns' `Domains`,
    `Evaluators`, `Expressions` and `Partials` as "the neutral form of every constraint" (no longer: "The package root
    exports `Framework` alone", below). So Patterns' eight domains and its kinds move to the standard dialects, and
    Patterns uses their domains as any dialect does.
  - **F. (a)**: the caller runs each install in order, each its own transaction, as the tutorials' toolkit and the
    tests do; an install names the kinds it uses by their schemas' names, so mbse-schemas refuses it where they are
    not installed; ~~each install writes its uses as data, `Uses(dialect, used)`~~ (*superseded* 2026-11-09 by I,
    below: there is no `Uses`); no `install_all`. Every caller's list (tests, tutorials, toolkit, skill) installs the
    standard dialects before the dialects that use them.
  - **G. Already decided**: "I think this was already resolved and you may be leaking context". The namespace's rule,
    "`Expressions.<family>.<dialect>`, a family named as its standard names the language", and a family of one
    unversioned dialect naming it `Expressions` (the dialects proposal's Decided, Namespace), give
    `Expressions.IEEE754.Expressions` and the others, each family spelled as its standards body spells the standard.
    Standards as tagged data is "Built with domains as data" (the dialects proposal's Decided, Q10), in the stage the
    design names. A standard dialect's shape (a singleton, no terms yet) stands as the agent's choice.
  - **H.** (1) To `complex`: "what is Python's `complex` ? Seems like an object to me". It is two IEEE 754 binary64
    floats, `real` and `imag`, immutable and compared by value: not a domain but a value schema of Python3's, its
    properties held by IEEE 754's binary64, which Python3's `constant` holds (J, below; first read as its imaginary
    literal's). (2) `RegExp`: not a domain. (3) Excel's error values: Excel's own domain, of its own kind, its members
    the error codes. (4) Compound values: not domains; they have schemas. The tokens (`nullptr_t`, Python's `None`'s
    and `...`'s types, TypeScript's `null`) each have a domain of their own, as B decided.
  - Stage 1's text, leaving the result-domain relation to CAP-232 (Stages, 1), was put to the user with these, and
    stands.
- **I. No `Uses`** (2026-11-09), on stage 1's question I (who writes `Uses`): "drop `Uses` and monitor for reasons to
  reinstate it in the future, stop and ask if you find one". Of the explicit install list every caller writes,
  `for module in (Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns, Python3, Matlab, Excel, Latex, C, Cpp,
  SystemVerilog): store.transaction(module.install)`, the user had said "I mean for now this looks pretty clean", and
  of `Uses`, "`Uses` is why we were discussing dependency notation". With the list kept, `Uses` has no job: **a
  dialect's dependencies are its caller's install order**, and mbse-schemas' refusal of an install that names a schema
  not yet registered (a kind's, a domain's) is the check; nothing read `Uses`. So `Expressions.Framework.Uses` and
  every dialect's adjacency `uses` are removed, in both languages, with their tests ([API](../port/API.md), 116). This
  supersedes F (a)'s `Uses`, above, and closes question I (Stage 1's design).
  - **Standing instruction**, the user's: "monitor for reasons to reinstate it in the future, stop and ask if you find
    one". An agent that finds a reason for `Uses`, something that needs to read as data which dialects a dialect uses,
    stops and asks the user before building it or anything in its place.
- **J. Python3's complex number: (a)** (2026-11-09), on stage 1's question J (Stage 1's design, Found while building).
  Discussing it, the user asked "Is `j` a keyword in python?" and "Is 1 a constant?"; shown that it comes down to when
  a Python constant is also a framework literal, the user said: "This distinction feels academic to me". So (a), the
  smallest change, was taken:
  - **The schema.** Python3's `constant` holds a complex number as one property, `complex`, of the value schema
    `Expressions.Python.Python3.Complex`, whose `real` and `imag` are each typed by IEEE 754's `binary64`. They replace
    the flat `real` and `imag` floats `Constant` had. Its other case, `singleton` (`None` or `...`), is unchanged.
  - **Written through a spec**, as any value object, so the writers (`P.constant(2j)`) and the parser (`FromText`)
    need no store.
  - **What follows.** Python3's install uses IEEE 754's schemas, so it runs after IEEE 754's, as every caller's list
    already has it (Decided, I); mbse-schemas refuses it otherwise. The printers, the validators (`constant`'s check),
    `Domains`, the corpus's `python3` case and DIA-19 read and write `complex`; no evaluator or translator reads a
    constant's parts (the evaluators refuse `constant` by name, and no translation rule matches it). Python3's use of
    IEEE 754 is only that install order, which nothing needs to read as data: it gives no reason to reinstate `Uses`
    (Decided, I).
  - **Kept for now: a literal or a constant.** `1` is a framework `literal`, while `2j`, `None` and `...` are Python3
    `constant`s: a split that follows mbse-schemas' basic scalars (a value a basic scalar holds is a literal's), not
    Python's grammar, where each is an `ast.Constant`. It is kept for now, as the user decided ("This distinction
    feels academic to me"), and may be revisited if it ever matters in practice.

  This settles J and supersedes stage 1's design's reading of H, a `literal` holding a `Complex` ([API](../port/API.md),
  120).
- **The package root exports `Framework` alone** (2026-11-09): to the proposal, asked in stage 1's pull request, that
  `mbse.Expressions` (and `@mbse/expressions`) export `Framework` alone, each dialect imported from its own path, the
  user: "approved". So the root's re-exports of Patterns' `Domains`, `Evaluators`, `Expressions` and `Partials` go,
  and its docstring's "the neutral form of every constraint" with them: they were one source of the habit of
  consolidating things under Patterns (E, above). Patterns is imported from its own path, as every other dialect is:
  then `mbse.Expressions.Framework.Patterns` (TypeScript: `@mbse/expressions/Framework/Patterns`), *superseded*
  2026-11-09 by `mbse.Expressions.Patterns.Expressions` (`@mbse/expressions/Patterns/Expressions`; Decided, "On stage
  1's review", "Patterns' place"); every caller that
  relied on the root (the TypeScript tests, the tutorials, the skill and the README) does so. It is a breaking
  change, in 0.9.0, a breaking release anyway ([API](../port/API.md), 121).
- **On stage 1's review** (2026-11-09): the user's answers on
  [#27's review](https://github.com/pitaman71/mbse-expressions/pull/27#pullrequestreview-5832969295), to the choices
  stage 1 left for review and to the review's questions:
  - **Names are the standards' own.** To naming the standard dialects' domains by their standards: "yes, adopt names
    the standard uses for datatypes it defines (is this even a question?)"; and to the kinds keeping their tags: "there
    is no need to preserve the old tags imo". So every domain and kind is named by its standard's own identifier, its
    tag and its schema too, with no alias for the old names. ISO/IEC 11404's are its declarations' lowercase names.
    `uint8` is not one, as the user had checked: it is C's `uint8_t`. 11404 (§10.1.7) defines "`type octet = new
    integer range (0..255)`", so the domain `uint8` is `octet`. The kinds `bool`, `bits`, `bytes` and `enum` are
    `boolean`, `bitstring`, `octetstring` and `state` (`OfBoolean`, `OfBitstring`, `OfOctetstring`, `OfState`);
    `integer` was already 11404's. IEEE 754's (`binary64`), IEEE 1164's (`std_logic`) and Unicode's names were already
    their standards' own, and stay. Where the standards were silent *(agent)*: `enum` is 11404's `state`, its unordered
    enumeration, since the kind is unordered (`ordered` false, as the code domain's `ORDERED`), 11404's `enumerated`
    being ordered; `packed`, which 11404 does not define, keeps its name; and the kinds `ieee754`, `ieee1164` and
    `unicode` keep theirs, each the standard's own designation, as their families are.
  - **`DomainKind` stays two-level**, as built: the dialect, then its kind, the pattern of `Term`, which the user
    decided ("Framework.Term -> Dialects.C.Term / Framework.Term -> Dialects.Cpp.Term"; [the dialects
    proposal](../dialects/README.md#decided), Decided, 1). Its examples are written in builder calls, not wire format
    ([PRI-019: fluent builder syntax](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-019)).
  - **Standards as tagged data, a stage of its own**: "yes", after stage 3 (Stages, revised, below).
  - **The integer kind keeps its parameters**: asked whether 11404's `integer` may carry `width`, `signed` and
    `overflow`, which 11404 does not define, against
    [PRI-012: model published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-012)'s
    "with only the parameters a standard defines": "PRI-012 is overstated, adding extra parameters does not count as a
    "second order invention" IMO". They stay; PRI-012's wording is corrected to match.
  - **An enumeration is not an integer**: "models should not conflate integers and enums as C does". So `packed` and
    `Packs` stay, keeping an enumeration apart from the integer that represents it; nothing is removed. For stage 3:
    C's and C++'s enums are to be stored as enumerations packed into their integer types, not as integer domains.
  - **`kind_of` gives the dialect too**: "yes, dialect too". `Domains.kind_of` (`kindOf`) returns `(dialect, tag,
    record)`, the dialect's tag in `Expressions.Framework.DomainKind` first, so that C's and C++'s `nullptr_t` are
    told apart, in both languages.
  - **mbse-domains is not a priority**: asked whether the standard dialects belong in the repository mbse-domains,
    which [CAP-211: text as words, phrases, paragraphs and documents](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-211.md)
    and [CAP-212: dates, times, durations and intervals in ISO 8601](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-212.md)
    plan: "refactoring domain dialects out of mbse-expressions is not a priority right now". They stay here (Where
    the standard dialects live, below).
  - **Patterns' place: (b)**. The user did not remember creating `Expressions.Framework.Patterns`: it came from the
    agent's recommendation in the namespace rename's batch ("Patterns, the neutral form and no standard's language";
    [the dialects proposal](../dialects/README.md#decided), Decided, Namespace, 1), approved with "yes, go". Shown the
    options, the user chose "(b)": `Expressions.Patterns.Expressions`, a family with one dialect named `Expressions`,
    as C's, MATLAB's and Excel's are. Renamed everywhere, in both languages, with no alias: its schemas, singleton,
    holder, install's and define's uids, Python package (`mbse/Expressions/Patterns/Expressions/`), TypeScript module
    (`src/Patterns/Expressions/`), the package's exports and every import, test, tutorial, the toolkit, the corpus,
    the skill, the README, llms.txt and EQUIVALENCE ([API](../port/API.md), 122). "The neutral form" is retired: it
    describes Patterns nowhere. The branch tag of `Expressions.Framework.Term` stays `patterns`, as the tags do "for
    now" (the dialects proposal's Decided, Namespace, 4).
  - **An install's uid: tech debt**: asked whether an install whose content changed may keep its uid (Patterns' and
    Python3's keep `/1`): "this is an important question, but not priority. find a place to store it as tech debt".
    It is mbse-basis [CAP-254: an install's uid changed with its content](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-254.md),
    proposed in that pull request; the uids' versions are left as they are (`/1`).
- **1. Before domain inference**: "1,5. yes before per your recommendation": domains as data first, as its own
  release; CAP-232 builds on stored domains.
- **3. `Anything` and `Opaque`**: "agreed. Schemas.OfAny kind of handles that": no stored "anything" domain; where
  nothing is known, a result's domain is absent, its value an unrestricted `Schemas.OfAny`.
- **4. Kinds shared per standard**: "proceed with this for now. I will review": Patterns' kinds (two's complement,
  IEEE 754, IEEE 1164, ...) shared, each dialect's domains instances of them under its own names. *Superseded*
  (2026-11-06) by A and E, above: a standard's kinds are its own dialect's, and Patterns holds none; "Patterns'
  kinds" recorded an inheritance from Basic, not a choice (E says where it came from).
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
   reading interface; the standard dialects (ISO/IEC 11404, IEEE 754, IEEE 1164, Unicode) holding the kinds and
   domains Patterns held (Decided, E). The relation holding operations' result domains, first listed here, is domain
   inference's, its population with it (Decided, 2): stage 1 stores none of it. Its design is below.
2. Patterns: its code domains gone (its dataclasses and `read`), its validation reading its stored operations through
   the holder (Decided, C) in place of `SIGNATURES`.
3. C and Cpp; then SystemVerilog; then Python3, TypeScript5, MATLAB, Excel and LaTeX: each its domains stored. C's and
   C++'s enums are stored as enumerations packed into their integer types, not as integer domains (Decided, "On stage
   1's review").
4. Standards as tagged data (the dialects proposal's Decided, Q10), every dialect's standards.
5. Records in mbse-basis ([CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md), [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md),
   [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md), [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md)), and release as 0.9.0 (Decided, D).

## Stage 1's design

As the user decided (Decided, on this proposal, A to J, the package root's exports and stage 1's review), on the code
at 0.8.0 (`python3/mbse/Expressions/`, `typescript5/src/`, the same in both). What the decisions leave open is the agent's, for review, marked *(agent)*.

**The standard dialects.** Four dialects of the standards that define today's nine kinds, each a family with one
unversioned dialect (Decided, G), laid out as the namespace decision lays out every dialect (the dialects proposal's
Decided, Namespace, 6 and 7): its Python package `mbse.Expressions.<Family>.Expressions`, at
`mbse/Expressions/<Family>/Expressions/`, and its TypeScript module at `src/<Family>/Expressions/`, exported as
`@mbse/expressions/<Family>/Expressions`, each with `install` and `define`:

| Dialect (path; name) | Kinds (tag: schema `Expressions.<Family>.Expressions.<Of...>`) | Domains its `define` writes, and their schemas |
|---|---|---|
| `ISOIEC11404.Expressions`; `ISOIEC11404` | `boolean`, `integer`, `bitstring`, `octetstring`, `state`, `packed`, and `Packs` | `boolean`, `integer`, `octetstring`, `octet` |
| `IEEE754.Expressions`; `IEEE754` | `ieee754` | `binary64`, `binary32` |
| `IEEE1164.Expressions`; `IEEE1164` | `ieee1164` | `std_logic` |
| `Unicode.Expressions`; `Unicode` | `unicode` | `string` |

ISO/IEC 11404 is spelled as ISO writes it, without the slash a name cannot hold, as IEEE 754 is without its space.
A standard dialect is a singleton of its own schema, a branch of `Expressions.Framework.Dialect`, with no `Term`,
holder or `Terms.Dialect` until it has terms (Decided, G). Each names its standard in code by designation
(`STANDARDS = ("IEEE Std 754-2019",)`, `ISO/IEC 11404:2007`, `IEEE Std 1164-1993`, `The Unicode Standard`), until
standards are tagged data, its own stage (below; Decided, "On stage 1's review"). Patterns' eight domains are these,
each named as its standard names it (Decided, "On stage 1's review", "Names are the standards' own"): `bool`, `int`,
`bytes` and `uint8` are 11404's `boolean`, `integer`, `octetstring` and `octet`; `float` and `binary32` IEEE 754's
`binary64` and `binary32`; `std_logic` IEEE 1164's; `str` Unicode's `string`. The kinds are named so too: 11404's
`boolean`, `integer`, `bitstring`, `octetstring` and `state`, and `packed`, which 11404 does not name.

**Where the standard dialects live.** In mbse-expressions, beside the dialects that use them. The repository
mbse-domains, which [CAP-211: text as words, phrases, paragraphs and documents](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-211.md)
and [CAP-212: dates, times, durations and intervals in ISO 8601](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-212.md)
plan for dialects of standards' domains, may take them later; refactoring them out is not a priority, as the user
decided (Decided, "On stage 1's review").

**Each dialect's kinds, nested.** `Expressions.Framework.DomainKind` becomes a union of the dialects' unions of kinds,
as `Expressions.Framework.Term` is of their `Term`s: each dialect that has kinds adds its own,
`Expressions.<Family>.<Dialect>.DomainKind`, as the branch named as its `Term` branch is (`isoiec11404`, `ieee754`,
`python3`, ...), so that C's and C++'s `nullptr_t` are each their own; kept so, as the user decided (Decided, "On stage
1's review"). A domain's `kind` is so written its dialect, then its kind:
`d.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.ieee754(lambda v: v.ieee754(lambda f: f.format("binary32"))))))`.

**Inferred properties**, beside the parameters, all optional, populated by hand by the define that writes a domain
of the kind (Decided, 2; Proposed, 2):

| Kind | Parameters (unchanged) | Inferred, new |
|---|---|---|
| `integer` | `width`, `signed`, `overflow` | `least`, `greatest` (ints, absent where unbounded), `ordered` |
| `ieee754` | `format`, `rounding` | `radix`, `precision`, `emax` (IEEE 754-2019's parameters of each interchange format), `ordered` |
| every other kind | as now | `ordered` |

`ordered` is true of `integer`, `ieee754`, `octetstring`, `unicode`, `packed`, SystemVerilog's `logic` and the two string
kinds below, false of the others, as `ORDERED` is today. What a result is fitted into is an integer's own `overflow`,
and for C a rule over argument domains, which is the relation left to
[CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md) (Decided, 2): no kind links another domain. A
domain's name is its `Defines` entry's.

**A language's own kinds** (Decided, B and H), each its dialect's, with no parameters but where shown; their domains
are stage 3's:

| Dialect | Its kinds |
|---|---|
| SystemVerilog | `logic`, IEEE 1800's 4-state integral: `width`, `signed`; inferred `least`, `greatest` (of its known values), `ordered` |
| Python3 | `str` (code points, lone surrogates included); the tokens `nonetype`, `ellipsis` |
| TypeScript5 | `string` (UTF-16 code units); the token `null` |
| C, Cpp | the token `nullptr_t`, each its own |
| Excel | `error`: `members`, its error codes |

A token's domain has no schema: no basic scalar holds its value, which its dialect's `constant` writes. Compound values,
`RegExp` and `complex` are not domains (Decided, H). Python3's `Complex` is a value schema,
`Expressions.Python.Python3.Complex`, `real` and `imag` each held by IEEE 754's `binary64` schema, and Python3's
`constant` holds one as its `complex`, beside its `singleton` (Decided, J).

**Install order** (Decided, F and I). A dialect's dependencies are its caller's install order, recorded nowhere as
data: the installs run in the order Framework, the four standard dialects, then the dialects that use them, in every
caller (tests, tutorials, toolkit, skill, corpus), and mbse-schemas refuses an install that names a schema not yet
registered. Python3 uses IEEE 754 (`Complex`, Decided, J).

**Found while building, decided.** Question I, who writes `Uses`, is decided: there is no `Uses` (Decided, I). Question
J came from a rule of mbse-schemas, not a defect, and was not worked around; it is decided, (a) (Decided, J):

- **J. Python3's complex number.** A literal's `value` is an unrestricted `Schemas.OfAny`, which takes a value already
  built, carrying its schema, never a spec (mbse-schemas' ANY-02), and a writer reaches no store to build one; so no
  writer (`P.constant(1j)`, `FromText`) can write a literal holding a `Complex`. (a) Python3's `constant` holds it:
  its `complex` property, of `Expressions.Python.Python3.Complex` (`real`, `imag`, each IEEE 754's `binary64`),
  written through a spec as any value object, its `singleton` the other case. (b) The writers take the store, or a
  built `Complex` (an API change). (c) mbse-schemas lets a spec of an unrestricted `OfAny` name its schema, a sibling's
  change. *Recommended: (a)*: `complex` is a value schema, as H decided, held where a schema can say so.

**The reading interface**, in `Framework.Domains` (TypeScript the same, camelCase), over a stored domain's
`Readers.OfObject`, found by its path (`dialect.domains({"name": "octet"})`,
[PRI-015: concrete references are programmatic](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-015)) or its schema's `domain`:
`kind_of(domain)`, its kind `(dialect, tag, record)` read through its dialect's union, the dialect's tag first (Decided,
"On stage 1's review") ("a domain needs a kind" where it holds
none); `properties(domain)`, its kind's properties set, parameters and inferred alike, by name (a container as a tuple,
an array in TypeScript); `name_of(domain)`, the name its dialect defines it by, or None; `operations(dialect)`, a
dialect's operations by name, each its `Schemas.OfExpression`; and `arity(operation)`, its pattern's number of
variables. Stage 2 reads them in place of `read` and of validation's `SIGNATURES` (`CORE`, a closed kind's
vocabulary). `Domain`, `Signature`, `OfTypes`, ..., `overlaps` stay, `Dialect.infer`'s, each marked in a source comment
as CAP-232's to replace; so do the dialects' vocabularies.

**Through the holder** (Decided, C). From stage 2, validation and inference read stored data from the store of a
term's holder (`Proxies.store_of`), with no new argument. What does so of a lone term today, to change then: the
suites' `term(spec)` helper ([API](../port/API.md), 8), behind about 210 `validate` and 50 `infer` calls in each
language's tests, which then writes a holder; SystemVerilog's evaluator, validating a term's structure before it
evaluates it, which reads no stored data; and the skill's `DIALECT.validate(term, bound)`. Tutorial 1's three calls
already take holders. Stage 1 changes none of it.

**Patterns, after stage 1.** Its install keeps its `Term`, `Quantifier`, holder, singleton and operations' schemas;
its kinds, `Packs` and domains' schemas leave it, and its `define` writes its operations alone. Its operations and
terms stay until [CAP-180: ISO/IEC 11404 datatypes replace the Basic expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-180.md)
(Decided, E). Its `Domains` dataclasses and `read` stay, code, until stage 2: `read` reads a stored domain of the
moved kinds, ignoring inferred properties. The package root no longer re-exports Patterns' modules: it exports
`Framework` alone, and Patterns is imported from its own path (Decided, "The package root exports `Framework`
alone").

**Tests and corpus.** DOM gains a case for the standard dialects, the inferred properties and the reading interface;
FRM-01 lists the new dialects and each dialect's kinds; DIA-19 Python3's `Complex`; the corpus's `domains` case holds
the standard dialects' singletons and domains, its JSON regenerated, byte-identical in both languages.

**Stages, revised.** Stage 1 is the above. Stage 2 is Patterns' code domains gone (its dataclasses, `read`), its
validation reading its stored operations through the holder. Stage 3 is every other dialect's domains stored. Standards
as tagged data, every dialect's `STANDARDS` and `Kind.standards` among them, is a stage after stage 3, before the
records and the release, as the user decided ("yes"; Decided, "On stage 1's review").

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
