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
| `Framework/Domains.py` | 268 at 0.8.0; 333 since stage 2 | since stage 1, the reading interface (`kind_of`, `properties`, `name_of`, `operations`, `arity`); `Domain` (a protocol: `contains`, `includes`), `Signature`, `OfTypes`, `OfValues`, `OfUnion`, `Anything`, `Function`, `Same`, `Overloaded`, `Opaque`, `Either` |
| `Patterns/Expressions/Domains.py` | 739 at 0.8.0; 229 since stage 2 | at 0.8.0, 14 dataclasses (`_Integer`, `_Ieee754`, `_Bits`, `_Bytes`, `_Unicode`, `_Enum`, `_Packed`, ...), the defaults, `SIGNATURES`, and `read`, which turned a stored domain into one of these; since stage 2, inference's code alone (the natives' domains as `OfTypes`, `SIGNATURES` without families) and evaluation's collections |
| `C/Expressions/Domains.py` | 319 | `CType`, C's integer and floating types as module constants, promotion and the usual arithmetic conversions, operator signatures |
| `SystemVerilog/Expressions/Domains.py` | 216 | 4-state logic vectors, their widths and signedness |
| `{Excel,MATLAB,LaTeX}/Expressions/Domains.py`, `Python/Python3/Domains.py`, `TypeScript/TypeScript5/Domains.py` | 48 to 103 each | each dialect's value domains and operator signatures |

So there were two forms of a Patterns domain, the stored one and the dataclass it was read into, until stage 2 removed
the dataclass; every other dialect's has one form, code only, until stage 3. Operator signatures are code too, though stage 3 modeled every Patterns operation as data, a
`Schemas.OfExpression` whose pattern's variables are its arguments and whose `result` is its return
([the API](../port/API.md), Settled in stage 3, 20 to 22): the code table `Domains.SIGNATURES` and the stored operations
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
    own". And two kinds are added, 11404's `octet` and `modulo`; Decided, "On stage 1's review", "`uint8` split by
    11404's own definitions".)
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
  dialect's dependencies are its caller's install order**; nothing read `Uses`. So `Expressions.Framework.Uses` and
  every dialect's adjacency `uses` are removed, in both languages, with their tests ([API](../port/API.md), 116). This
  supersedes F (a)'s `Uses`, above, and closes question I (Stage 1's design).
  - **No check of install order** (2026-11-09). The first record of I called mbse-schemas' refusal of an install that
    names a schema not yet registered "the check" of install order; stage 1's review found it checks only an install
    that names another dialect's schemas (Python3's of IEEE 754's), not every dialect, though the skill said "an
    install whose dialects are missing is refused" (review finding 1). Asked whether that was an overclaim or a reason
    to reinstate `Uses`, the user: "the whole thing seems a bit contrived if you ask me". So nothing claims to check
    install order: the order is the caller's list, the claim is removed from the records, the skill and the
    framework's docstrings, and no test is added for it; `Uses` stays dropped.
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
    `uint8` is not one, as the user had checked: it is C's `uint8_t`; it is split by 11404's own definitions, into
    `octet` and `modulo(256)` (below). The kinds `bool`, `bits`, `bytes` and `enum` are
    `boolean`, `bitstring`, `octetstring` and `state` (`OfBoolean`, `OfBitstring`, `OfOctetstring`, `OfState`);
    `integer` was already 11404's. IEEE 754's (`binary64`), IEEE 1164's (`std_logic`) and Unicode's names were already
    their standards' own, and stay. Where the standards were silent: `enum` is 11404's `state`, and `packed` keeps its
    name, each decided below ("`state` is the generic enumeration"; "`packed` keeps its name"); and *(agent)* the kinds
    `ieee754`, `ieee1164` and `unicode` keep theirs, each the standard's own designation, as their families are.
  - **`state` is the generic enumeration** (2026-11-09). The agent's choice, for review, of 11404's `state` (§8.1.2: "a
    finite number of distinguished but unordered values", its one operation Equal) for the unordered `enum` kind is
    accepted. Told that 11404's `enumerated` (§8.1.3) is its ordered counterpart, to be added when a dialect first
    needs an order (SystemVerilog's `.first()`, `.next()` and `.prev()`), the user said: "yes, well, then that is a
    generic enough enum, eh?". So `state` is the generic enumeration, and `enumerated` is added only when a dialect
    needs an order.
  - **`packed` keeps its name** (2026-11-09), which 11404 does not define: the agent's choice, for review, is decided,
    as the user put it, "packed and packs does not go" (An enumeration is not an integer, below).
  - **`uint8` split by 11404's own definitions** (2026-11-09). Stage 1 first renamed the domain `uint8` `octet`, from
    11404's "`type octet = new integer range (0..255)`" (§10.1.7). But `uint8` was an integer of width 8, unsigned,
    wrapping on overflow, and that is not 11404's `octet`: "Each value of datatype Octet is a code", its properties
    "ordered, bounded, exact, non-numeric, finite", its operations only "(Equal, InOrder) from Integer", so it has no
    arithmetic. It is 11404's `modulo` (§10.1.2): "`type modulo (modulus: integer) = new integer range(0..modulus)
    excluding(modulus)`", "ordered, exact, numeric", its operations "Equal, InOrder from Integer; Add, Multiply,
    Negate", Add and Multiply giving the integer result's remainder by the modulus: wrapping arithmetic. The user's
    rule settles it, "yes, adopt names the standard uses for datatypes it defines (is this even a question?)", as the
    user confirmed (2026-11-09): "didn't you already resolve that?". So, each as 11404 defines it:
    - **`octet`** is a kind of its own (`OfOctet`): codes 0 to 255, ordered, with no arithmetic and no `overflow`; its
      one property is `ordered`. ISO/IEC 11404's `define` writes the domain `octet` of it.
    - **`modulo`** is a kind (`OfModulo`), with 11404's parameter `modulus` and the inferred `least`, `greatest` and
      `ordered`; the `define` writes `modulo(256)`, 8-bit wrapping arithmetic, beside `octet`.
    - *(agent)* **The domain's name, `modulo(256)`**, is 11404's own notation, its type generator applied to its
      modulus, as a dialect's `Defines` entry can hold it. Its schema's name cannot: mbse-schemas' names are dotted
      identifiers. So the schema, and the define's symbol for it, spell it `modulo_256`
      (`Expressions.ISOIEC11404.Expressions.modulo_256`).
    - **Each use of `uint8`.** Where a value is a code, it is `octet`: the representation a packed domain packs a state
      into (the corpus's `domains` case, EXP-06, DOM-03 and DOM-05). Where it is arithmetic, it is `modulo(256)`: the
      wrapping domain EXP-13 reads through its schema, DOM-05's document of it, DOM-17's bounds, tutorial 7's T07.5
      and tutorial 8's introduction. C's `uint8_t` (the corpus's `c` and `cpp` cases, the framework suite's C and C++
      terms, tutorial 8's casts) is C's, and stays; so does `uint8`, the Patterns code domains' name for an unsigned integer of width
      8 (DOM-01), which is not a stored domain. The code domains read the two kinds as `OfOctet` and `OfModulo` until
      stage 2; a packed domain's representation may be an octet; and the signatures' families take a modulo where
      they take numbers, an octet where they take ordered values (CAP-232's to replace). (Each gone in stage 2, with
      Patterns' code domains: Stage 2's design.)
    - **`integer` keeps `width`, `signed` and `overflow`**, as decided (The integer kind keeps its parameters, below).
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
    `Packs` stay, keeping an enumeration apart from the integer that represents it; nothing is removed. ~~For stage 3:
    C's and C++'s enums are to be stored as enumerations packed into their integer types, not as integer domains.~~
    (*Superseded* 2026-11-10 for stage 3 by the scope of stored domains: an enum a program declares gets no stored
    domain; Decided, "On stage 3's design". The rule stands: where an enumeration is stored, it is not an integer.)
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
- **On stage 3's design** (2026-11-10): the user's answers to its questions K to O (Stage 3's design, Questions for
  the user (stage 3)), each quoted as given:
  - **K: (b), and N: (a)**: "K,N - agreed".
    - **K. The code type tables go.** C's, C++'s and SystemVerilog's code type tables (`CType` and its `TYPES` in C's
      `Domains`, which C++ shares; `SvType` and its `TYPES` in SystemVerilog's) go. Evaluation and inference read every
      named type they use (a literal's, a cast's target, `int` for the promotions, `size_t` for `sizeof`, `bool` for a
      comparison, a constant's by its value) from the stored domains, through the term's holder (C, above), its width,
      signedness and format by `Framework.Domains`; `CType` and `SvType` stay only as the working values the arithmetic
      computes on, built from a stored domain, and the conversions as code (2, below). A lone term is refused,
      consistent with C ("there is no valid programming context where a lone term needs a domain or schema"), by
      mbse-schemas' `TypeError`. A breaking change, in 0.9.0.
    - **N. LaTeX stores no domains.** Its code domains (`number`, `text`, `truth`) stay inference's, CAP-232's to
      replace, as the other dialects' `OfTypes` do.
  - **The scope of stored domains** (on L and O): "we do not need a domain for every type, just those standardized in
    by the language itself or by commonly used adjacent standards like cstdint. Adjacenct standards may be their own
    dialect"; then: "by "intrinsic types" for C/C++ this means those that cross the ABI". So:
    - A domain is stored only for a type the language's standard defines, or that a commonly used adjacent standard
      defines. For C and C++ those are the types that cross the ABI: the fundamental arithmetic types; `nullptr_t`;
      and the `<stdint.h>`/`<cstdint>` and `<stddef.h>` typedefs (`int32_t`, `size_t`, ...).
    - A type a program declares gets no stored domain: a program's own enums and typedefs. So stage 3's C enum (its
      design's "Enums", and DOM-19's) drops; this supersedes "For stage 3: C's and C++'s enums are to be stored as
      enumerations packed into their integer types" (An enumeration is not an integer, above).
    - No synonym machinery: L's options drop, and with them the question. Each standardized name gets its domain as
      its standard defines it, `int32_t` beside `int`, `reg` beside `logic`.
  - **The corpus's and the tests' own domains** (2026-11-10, settling what O left open). Told that `state` (an
    enumeration of `IDLE` and `RUN`) and `mode` (`packed`, packing `state` into an `octet`) are fixtures the
    conformance corpus and some tests invent to exercise `packed`, that no language or standard defines them, and that
    the scope rule means a dialect stores only what its standard defines, the user was given this recommendation and
    answered "agreed":
    - the corpus case and the tests write them as plain `Expressions.Framework.Domain` objects, owned by no dialect;
    - there is no `Defines` entry for them in the ISO/IEC 11404 singleton, or any other;
    - there is no test dialect.

    Not yet built: mbse-schemas refuses it as the model stands, and how to settle that is question R, open (Stage 3's
    design, Questions for the user (stage 3), R); until then the fixtures stay in ISO/IEC 11404's singleton, as they
    are.
  - **One dialect per ABI, holding only domains** (2026-11-10). Asked whether C and C++ should have a dialect for each
    ABI, the user was shown about 12 mainstream ABIs (x86-64 System V, Microsoft x64, i386 System V and Windows,
    AArch64 AAPCS64, Apple and Windows, ARM32 AAPCS, RISC-V LP64D, PowerPC64 ELFv2, s390x, wasm32), across which what
    differs is the data model (LP64, LLP64 or ILP32), `long double`'s format, plain `char`'s signedness, `wchar_t`'s
    width, and the `_FloatNx` formats. Then this recommendation, which the user approved with "yes":
    - C and C++ stay one dialect each, holding the terms and the domains that don't depend on the ABI (`bool`, the
      `_FloatN` interchange formats, `nullptr_t`, ...).
    - Each ABI is its own small dialect holding only the ABI-dependent domains: `long`, `long double`, `char`,
      `wchar_t`, `size_t`, `_FloatNx` and the like. Each psABI is a published standard, so this follows "Adjacenct
      standards may be their own dialect".
    - One ABI dialect serves both C and C++.
    - A store installs the ABI dialects it needs, in install order, as with the standard dialects (I, above).
    - ABIs are added as they are needed. Stage 3 builds two: x86-64 System V and AArch64 AAPCS64. These two were the
      coordinating agent's example, which the user did not contradict; recorded as such.
    - The ABI dialects are named by the namespace rule ("`Expressions.<family>.<dialect>`, a family named as its
      standard names the language"; the dialects proposal's Decided, Namespace), each spelled as its psABI document
      names itself. The names chosen are the agent's, for review (Stage 3's design).
    - **What this replaces**: the single LP64 data model C's evaluation assumed until stage 3 (mbse-basis
      [CAP-100: six languages' expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-100.md),
      "C's arithmetic types under LP64 ... `long double` as IEEE 754 `binary128`"), and stage 3's design's `long
      double` as `binary128`. Under an ABI dialect, `long double` is whatever that ABI says: x87's 80-bit format on
      x86-64 System V, `binary128` on AAPCS64. Built so in stage 3: C's evaluation reads no data model of its own,
      only its holder's ABI. CAP-100's record, which still says LP64, is corrected with the records (Stages, 5).
  - **M** (2026-11-10), the design below approved as a whole with "yes":
    - Under an ABI, the formats of `_Float32x`, `_Float64x` and `_Float128x` are fixed by that ABI, though C23's
      Annex H leaves them to the implementation. So each ABI dialect stores them as its ABI fixes them.
    - `std::bfloat16_t` is defined by C++23 (ISO/IEC 14882:2023, the extended floating-point types, from P1467) in
      IEEE 754's parameters: radix 2, 16 bits, precision 8, emax 127. So the C++ dialect stores it as a domain of IEEE
      754's kind with those parameters; parameters a standard does not define are allowed, under
      [PRI-012: model published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-012)
      as corrected ("adding extra parameters does not count as a "second order invention"", above).
    - Asked along the way, the user: "what is the standad that defines bfloat16? _Float32x?". The answer given: C++23
      defines `std::bfloat16_t`, in those parameters; C23's Annex H defines `_Float32x`, leaving its format to the
      implementation, which under an ABI that ABI fixes.
  - **P. The holder names its ABI: (b)** (2026-11-10), on Stage 3's design's question P, which ABI a C or C++ term is
    read under. The user's rule: "immediate optionality over deferred optionality over sacrificing optionality". (a),
    one ABI per store, sacrifices optionality; (c), the caller passing the ABI, changes the API against C, above ("there
    is no valid programming context where a lone term needs a domain or schema"). So (b), as the design proposed:
    - The `Expression` holding a C or C++ term names the ABI its terms are read under, by a relation between
      `Expressions.Framework.Expression` and a dialect, unique by the expression, read through the expression's
      adjacency `abi`. Its name is the agent's, by the record's conventions (Stage 3's design).
    - One store may hold several ABI dialects, each holder read under its own.
    - A term that needs an ABI-dependent domain, whose holder names no ABI, is refused with a clear message.
    - It is not `Uses`: it records which ABI a holder's terms are read under, not a dialect's dependencies. The design
      flagged it under the standing instruction on `Uses` (I, above), and the user settled it with this answer, so it
      gives no reason to reinstate `Uses`.
  - **Q. Every ABI dialect defines what the implementation chooses: (b)** (2026-11-10), on Stage 3's design's question
    Q, which dialect defines the domains and schemas of `int`, `short`, `long long`, `signed char` and `unsigned char`,
    `float` and `double`, which the C standard leaves to the implementation though every listed ABI gives them alike.
    The user: "(b)". So:
    - Every ABI dialect defines its own domain and schema for each, with its ABI's values.
    - C's and C++'s own dialects keep only what the language standard itself fixes: `bool`, the `_FloatN` interchange
      types and the decimal types, `nullptr_t`, and C++'s `std::floatN_t` and `std::bfloat16_t`, each checked against
      its standard (Stage 3's design).
    - Everything the implementation chooses goes in each ABI dialect: the types above, `char`, `long`, `long double`,
      `wchar_t`, `size_t`, `ptrdiff_t`, `intptr_t`, `_Float32x`, `_Float64x`, and the `<stdint.h>` typedefs each ABI
      fixes, decided by what the C and C++ standards leave to the implementation, the split listed in the design.
    - This supersedes the design's recommendation (a), that what every ABI shown gives alike stays C's and C++'s.
  - **R: (a), by the agent's check** (2026-11-10). The user left it to the agent: Excel's error values packed into
    their `ERROR.TYPE` codes, if Microsoft's documentation of `ERROR.TYPE` gives those codes, `state` and `mode` then
    going; otherwise (a), the fixtures kept in ISO/IEC 11404's singleton, and noted. *(agent)* The documentation
    (Microsoft Support, "ERROR.TYPE function", checked 2026-11-10) gives codes for eight error values only, `#NULL!` 1
    to `#GETTING_DATA` 8, and "Anything else" `#N/A`: none for the seven Excel's `error` domain holds since (`#SPILL!`,
    `#CALC!`, `#FIELD!`, `#BLOCKED!`, `#CONNECT!`, `#BUSY!`, `#UNKNOWN!`). So no `packed` domain can pack Excel's
    errors into documented codes, and `state` and `mode` stay in ISO/IEC 11404's singleton, as they are: a fixture
    no standard defines, owned there because mbse-schemas requires every domain an owner (Stage 3's design,
    Questions for the user (stage 3), R).
  - **The links between dialects** (2026-11-10). Told what stage 3 built that links one dialect to another, after
    saying "I am a little concerned about over-exerting ourselves to try to link between dependent dialects", the
    user answered each:
    - The holder-to-ABI relation, `Expressions.Framework.HasAbi` (P): "yes, keep it".
    - IEEE 754's properties, `width` among them, written on the other dialects' `ieee754` domains: "yes, this is
      critical for precision". Kept as built.
    - `Framework.Domains.domains(dialect)` and the lookups that read one dialect's domains from another's terms
      (C's and C++'s through their holder's ABI, SystemVerilog's own): "this is what I want to review". Kept, and
      listed in stage 3's pull request for the user's review.
  - **On process** (2026-11-10), the user: "I am less concerned about the number of lines of code and more concerned
    about how slugging our progress has become. It seems like we are stopping more often, halting on minutiae that are
    already answered in docs that mbse-basis/docs/README.md marks as mandatory, and losing sight of what is important
    for increased effort." So agents decide minutiae themselves (names, placements, message wording, which list a type
    goes in, test layout) from the mandatory documents and the Decided sections, mark each *(agent)* and list them in
    the pull request; they pause only on a design fork the record does not settle, where a wrong guess costs real
    rework, or on a sibling's defect, committing and pushing first. And: "make sure all agents keep the full mandtory
    reading list refreshed after every compaction": after any compaction an agent re-reads mbse-basis' `AGENTS.md`,
    the four documents it marks mandatory, this repository's `AGENTS.md` and this Decided section before more work.
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
3. C and Cpp, with the ABI dialects that hold what their standards leave to the implementation, a C or C++ term's
   holder naming its ABI; then SystemVerilog; then Python3,
   TypeScript5, MATLAB and Excel: each its domains stored, only for the types its standard, or a commonly used
   adjacent standard, defines; LaTeX stores none; the code type tables of C, C++ and SystemVerilog go (Decided, "On
   stage 3's design"). A program's own enums and typedefs get no stored domain. Where an enumeration is stored, it is a
   `state` domain; 11404's `enumerated`, ordered, is added only when a dialect first needs an order, as
   SystemVerilog's `.first()`, `.next()` and `.prev()` may (Decided, "On stage 1's review", "`state` is the generic
   enumeration").
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
| `ISOIEC11404.Expressions`; `ISOIEC11404` | `boolean`, `integer`, `modulo`, `bitstring`, `octet`, `octetstring`, `state`, `packed`, and `Packs` | `boolean`, `integer`, `octetstring`, `octet`, `modulo(256)` (its schema `modulo_256`) |
| `IEEE754.Expressions`; `IEEE754` | `ieee754` | `binary64`, `binary32` |
| `IEEE1164.Expressions`; `IEEE1164` | `ieee1164` | `std_logic` |
| `Unicode.Expressions`; `Unicode` | `unicode` | `string` |

ISO/IEC 11404 is spelled as ISO writes it, without the slash a name cannot hold, as IEEE 754 is without its space.
A standard dialect is a singleton of its own schema, a branch of `Expressions.Framework.Dialect`, with no `Term`,
holder or `Terms.Dialect` until it has terms (Decided, G). Each names its standard in code by designation
(`STANDARDS = ("IEEE Std 754-2019",)`, `ISO/IEC 11404:2007`, `IEEE Std 1164-1993`, `The Unicode Standard`), until
standards are tagged data, its own stage (below; Decided, "On stage 1's review"). Patterns' eight domains are these,
each named as its standard names it (Decided, "On stage 1's review", "Names are the standards' own"): `bool`, `int` and
`bytes` are 11404's `boolean`, `integer` and `octetstring`, and `uint8` is split into 11404's `octet`, for codes, and
`modulo(256)`, for wrapping arithmetic (Decided, "On stage 1's review", "`uint8` split by 11404's own definitions");
`float` and `binary32` IEEE 754's `binary64` and `binary32`; `std_logic` IEEE 1164's; `str` Unicode's `string`. The
kinds are named so too: 11404's `boolean`, `integer`, `modulo`, `bitstring`, `octet`, `octetstring` and `state`, and
`packed`, which 11404 does not name.

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
| `modulo` | `modulus` (new) | `least`, `greatest`, `ordered` |
| `ieee754` | `format`, `rounding` | `radix`, `precision`, `emax` (IEEE 754-2019's parameters of each interchange format), `ordered` |
| every other kind | as now | `ordered` |

`ordered` is true of `integer`, `modulo`, `octet`, `ieee754`, `octetstring`, `unicode`, `packed`, SystemVerilog's
`logic` and the two string kinds below, false of the others, as `ORDERED` is today. `octet` has no parameter: 11404
defines it as codes, with no arithmetic. What a result is fitted into is an integer's own `overflow`, a modulo's
own `modulus`, and for C a rule over argument domains, which is the relation left to
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
caller (tests, tutorials, toolkit, skill, corpus). Python3 uses IEEE 754 (`Complex`, Decided, J).

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

## Stage 2's design

As the record has it: "Stage 2 is Patterns' code domains gone (its dataclasses, `read`), its validation reading its
stored operations through the holder" (Stage 1's design, Stages, revised); validation and inference within a term's
holder, reaching its store, with no new argument (Decided, C; Stage 1's design, Through the holder); validation reading
`Domains.operations` and `Domains.arity` in place of `SIGNATURES` and `CORE`, while `Domain`, `Signature`, `OfTypes`,
..., `overlaps` and the dialects' vocabularies stay, `Dialect.infer`'s, CAP-232's to replace (Stage 1's design, The
reading interface; Decided, 2). On the code at main (d1bcd5d), the same in both languages. What the record leaves open
is the agent's, for review, marked *(agent)*.

**What is removed**, in both languages:

- From Patterns' `Domains`: its eleven kinds of code domain, `OfBool`, `OfInteger`, `OfModulo`, `OfOctet`,
  `OfIeee754`, `OfBits`, `OfBytes`, `OfUnicode`, `OfIeee1164`, `OfEnum` and `OfPacked` (each its data class, its
  builder and its `Kind`), their base `Domain` (TypeScript's `equals` among it), and `read` with its table. With them
  go what only they read: `FORMATS`, `ROUNDINGS`, `OVERFLOWS` and `STATES`, the standards' enumerations the data
  classes validated against, which the standard dialects' kinds now hold as data; and the signatures' families
  (`_VALUES`, `_ORDERED_KINDS`, `_NUMERIC`, `_BITWISE`, `_INTEGERS`), which took any domain of those kinds.
- `Expressions.CORE`, the operations' names and arities computed from `SIGNATURES`: the stored operations are both.

**What stays**: `Ieee754`, the evaluators' arithmetic, which C's and SystemVerilog's evaluators use (Decided, 2:
"evaluation's arithmetic ... is the evaluator's, as now"); `Collection` and `Record`, evaluation's values; and
inference's code (Decided, 2; Stage 1's design, The reading interface): `SIGNATURES`, `QUANTIFIERS`, `LIST`,
`MAPPING`, `List`, `Keyed`, `Records`, `Object`, `items_of`, `of` and `Anything`. Their natives' domains, `Bool`,
`Int`, `Float`, `Str` and `Bytes`, were instances of the data classes; they become the framework's generic `OfTypes`
(`Domains.OfTypes("int", int)`), named as before, as Python3's are, each signature keeping its shape (`Same`,
`Function`, `_Collective`, ...) without a family, but the bitwise operations and shifts, which become `(int, int) ->
int`. So inference keeps its natives and the collections', and no
longer takes an environment's domain of a width, a format or an enumeration: no code can now build one, and inferring
in widths is [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)'s,
over stored domains. Each is marked in a source comment as CAP-232's to replace.

**What replaces each reader**:

| Reader, today | Reads | After |
|---|---|---|
| `Dialect.validate`, Patterns' `call` | `SIGNATURES`: an operation's name, its arity; `closed` | The operations Patterns' singleton names in the term's store (`Domains.operations`), each one's arity its pattern's variables (`Domains.arity`), through the holder (below); the same messages |
| `Dialect.infer` | `validate`, then `SIGNATURES` | `validate` as above, then `SIGNATURES`, rebuilt on `OfTypes` |
| Patterns' `Evaluators` (`_domain`, `_operands`) | `_NATIVES`, the data classes `OfInteger.Data` and `OfIeee754.Data` | The values' native types (an int, a float; TypeScript's `bigint` and `number`); the same messages |
| Patterns' `Partials` (a residual's literal) | `_NATIVES` | Whether the value is a native, as `Expressions._native` already asks |
| The tests' reads of a stored domain | `read`, compared with a data class | `Framework.Domains.kind_of`, `properties` and `name_of` (stage 1's interface) |
| The tests of what a domain means (`contains`, `compare`, `fit`, `bounds`, `validate`, `ORDERED`) | the data classes | Nothing: no code but the tests read them. What `bounds` and `ORDERED` computed, the hand-populated `least`, `greatest` and `ordered` hold (DOM-17 pins them); what `validate` checked of a domain (a width positive, a code per member) is a constraint for a later resolver (Risks) |

**Through the holder** (Decided, C):

- `Terms.Kind` gains `operations`: for a kind whose operations are data, `operations(store)` gives those its dialect
  defines in a store, by name, each its `Schemas.OfExpression` *(agent)*. Patterns' `call` gives it as
  `Domains.operations(store.Instances.Expressions.Patterns.Expressions)`, its singleton by its path
  ([PRI-015: concrete references are programmatic](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-015)),
  and keeps `vocabulary`, `SIGNATURES`, for `infer`.
- Validation of a term of such a kind finds its store with `Proxies.store_of(term)`. A term held in an `Expression`,
  however deep, reaches its holder's store, as its value objects are owned in turn (checked at main in both languages);
  a lone term belongs to no store, and mbse-schemas' `TypeError`, "the value does not belong to a store", stands: no
  argument and no fallback is designed for it *(agent)*.
- An operation the store's dialect does not name is refused ("'f' is not an operation Patterns defines"), and one given
  another number of arguments reported ("add takes 2 arguments, got 1"), as now.
- So `Patterns.define`, which writes the singleton's `Operates` entries, runs before a Patterns term is validated or
  inferred: the install cannot write them, as it cannot bind its own singleton (API, 116, struck). Every caller's list
  runs it after the installs: the suites, the tutorials' toolkit, the corpus's CONF-04 and the skill. A store where it
  has not run names no operation, and every call is refused so: the data says so *(agent)*.
- Only a kind that reads stored data reaches the store. Every other dialect's validation reads its code vocabularies
  until stage 3, so its lone terms validate as now, and SystemVerilog's evaluator, which validates a term's structure
  before evaluating it and reads no stored data, is unchanged *(agent)*: nothing is added for a lone term.
- Evaluation is unchanged: its implementations are code, and a call outside them raises as now.

**Tests and the API**, under their IDs, in both languages:

- **The suites' `term(spec)` helper** (EXP, EVL, FRM, DIA, TRN, DOM, COL, PAR) writes a holder,
  `store.Expressions.Framework.Expression(lambda e: e.root(dialect.spec(spec)))`, and gives its root, `Terms.term(holder)`;
  its callers, about 210 `validate` and 50 `infer` calls in each language, are unchanged. Each suite's setup runs
  `Patterns.define`. A case that validates a term decoded alone writes it into a holder first.
- **DOM**: DOM-01 is rewritten as inference's natives' domains (`OfTypes`, `of`, `Object`); DOM-02, the data classes'
  membership and inclusion, is retired, as DOM-13 to DOM-16 are; DOM-03, DOM-05 and DOM-17 read stored domains through
  the interface; DOM-06 and DOM-07 keep evaluation's comparisons and arithmetic, losing the data classes'; DOM-09 keeps
  signatures and inference over natives and collections, losing the families; DOM-10 to DOM-12 test `Ieee754` directly
  (`Ieee754.contains(format, value)`), with the rounding directions spelled out.
- **EXP**: EXP-13 asserts that validation reads the stored operations (`SIGNATURES`, `infer`'s, holds the same names in
  order; `CORE` is gone) and that a lone Patterns call is refused; EXP-06 and EXP-13 read domains through the
  interface. **CONF-04** validates each case within a holder, in the corpus's store after `Patterns.define`; the corpus
  itself is unchanged, its JSON regenerated byte-identical. **FRM-01**, **COL** and the others, where they name what is
  removed.
- **The skill, EQUIVALENCE and the test plans**: validation of a held term, `Patterns.define` in the install list; the
  deliberate difference "Python compares domains with `==`; TypeScript with `.equals()`" goes with the data classes.
- **The API**: Settled in domains as data's stage 2, items 124 onward. A breaking change, in 0.9.0, a breaking release
  anyway: the removed exports, `Patterns.define` required to validate, and a lone Patterns call refused.

**Found while building**, each the agent's, for review (API, 129 and 130): `Same`'s `family` (`Framework.Domains`)
and validation's refusal of an operator outside a closed kind's code vocabulary (`Terms`) were used by Patterns alone,
so no input reaches them, and they go (mbse-basis
[PRI-039: 100% coverage of both](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-039));
`closed` stays, evaluation's. FRM-04 validated a term decoded alone, and now validates it within a holder. Read back
from a snapshot, a dialect's operations come in their names' order, as mbse-schemas writes a relation's entries sorted
by its key (mbse-basis [PRI-001: declaration order](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-001)'s
exception), not in the order `define` wrote them, so `Domains.operations` no longer claims the latter; validation reads
them by name.

**Not changed here**: where the corpus's and the tests' own domains (`state`, `mode`) are written, then open with
the user (decided 2026-11-10: owned by no dialect; Decided, "On stage 3's design"); C's, C++'s and the other dialects' code domains, stage 3's. Nothing here reads which dialects a dialect uses,
so nothing gives a reason to reinstate `Uses` (Decided, I).

## Stage 3's design

As the record has it: "C and Cpp; then SystemVerilog; then Python3, TypeScript5, MATLAB, Excel and LaTeX: each its
domains stored" (Stages, 3), as the user's answers on this design revise it (Decided, "On stage 3's design"): a domain
only for a type its language's standard, or a commonly used adjacent standard, defines, for C and C++ the types that
cross the ABI; what their standards leave to the implementation in a dialect of each ABI, x86-64 System V's and
AAPCS64's (Q), the holder of a C or C++ term naming the ABI it is read under (P); the code type tables of C, C++ and
SystemVerilog gone, evaluation and inference reading the stored domains through the term's holder; LaTeX
none; no domain for a program's own enums and typedefs, and no synonyms. Each domain is an instance of a standard
dialect's kind or of its dialect's own (Decided, A, B and H), named as its language's standard names its type (Decided,
"On stage 1's review", "Names are the standards' own"), written by its dialect's `define` with its inferred properties
populated by hand (Proposed, 2); typing a C literal by its suffix is a lookup of a stored domain (Decided, 5); and a
literal out of range is reported against the domain its dialect stores for it (Proposed, 5). Inference's rules stay
CAP-232's to replace (Decided, 2). On the code at main (3711f8a), the same in both languages. What the record leaves
open is the agent's, for review, marked *(agent)*; what neither the record nor the standards settle is a question,
below, and nothing is built on it until it is answered: P and Q are answered, R open (Decided, "On stage 3's design").

**Each dialect's `define`.** C, Cpp, the two ABI dialects, SystemVerilog, Python3, TypeScript5, MATLAB and Excel each
have a `define`, as the standard dialects do: run after the installs, in a transaction of its own, writing its domains
owned by name through `Defines`, each with its parameters and its inferred properties, and each but a token's and a
4-state type's related to its schema by `HasDomain` ([CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided),
Decided, "Every domain a schema"); its frame binds the dialect and each domain by its name, spelled as its schema's is.
Its uid is `mbse.Expressions.<path>.define/1`. A domain's schema is `Expressions.<path>.<name>`, a `Schemas.OfAny` of
the scalar it narrows, its name spelled as a dotted identifier where the type's is not one (`unsigned long long` as
`unsigned_long_long`, as `modulo(256)` is `modulo_256`; `std::float16_t` as `std_float16_t`) *(agent)*. Each install
adds its domains' schemas, as the standard dialects' do. Every caller's list (the suites, the tutorials' toolkit, the
corpus, the skill) runs the defines after the installs, as it runs `Patterns.define`. A domain's value is the native
its evaluation already holds: an int for an integer or a modulo, a float for `binary16` to `binary64`, and canonical
text for `binary128`, the decimal formats and the formats IEEE 754 does not name (below), as `Ieee754` holds
`binary128` (so their schemas narrow `str`) *(agent)*.

**What each dialect holds** (Decided, Q): C's and C++'s own dialects hold what their standards fix; each ABI dialect
holds what the standards leave to the implementation, whether or not the ABIs agree on it. Each type, by what C23
(ISO/IEC 9899:2024) and C++23 (ISO/IEC 14882:2023) say of it:

| Type | What the standard fixes, and what it leaves | Whose |
|---|---|---|
| `bool` | its values, `false` and `true` (C23's `BOOL_WIDTH` is 1; C++'s `bool`) | C's, C++'s |
| `_Float16`, `_Float32`, `_Float64`, `_Float128` | each is IEC 60559's `binary16` to `binary128` where provided (C23, Annex H) | C's |
| `_Decimal32`, `_Decimal64`, `_Decimal128` | each is IEC 60559's `decimal32` to `decimal128` (C23, its decimal floating types); only their encoding, which no domain holds, is the implementation's | C's |
| `nullptr_t` | its one value, `nullptr` (C23; C++'s `std::nullptr_t`) | C's, C++'s, each its own |
| `std::float16_t`, `std::float32_t`, `std::float64_t`, `std::float128_t`, `std::bfloat16_t` | each is ISO/IEC 60559's `binary16` to `binary128` where provided, and `std::bfloat16_t` radix 2, 16 bits, precision 8, emax 127 (C++23, the extended floating-point types; Decided, M) | C++'s |
| `int8_t` to `int64_t`, `uint8_t` to `uint64_t` | each exactly its width, with no padding bits, two's complement where signed (C23, `<stdint.h>`, its exact-width integer types; C++'s `<cstdint>` is C's); only whether one is provided, and which basic type it names, is the implementation's, as only whether `_Float16` is provided is | C's, C++'s *(agent)* |
| `char`, `signed char`, `unsigned char`, `short`, `int`, `long`, `long long` and their unsigned forms | at least their minimum widths, the rest the implementation's; whether plain `char` is signed too | each ABI's |
| `float`, `double`, `long double` | their formats, IEC 60559's only under Annex F, which an implementation adopts | each ABI's |
| `wchar_t`, `char8_t`, `char16_t`, `char32_t` | their underlying types (`<uchar.h>`'s `unsigned char`, `uint_least16_t`, `uint_least32_t`; distinct types in C++, of those representations) | each ABI's |
| `size_t`, `ptrdiff_t`, `intptr_t`, `uintptr_t` | their widths | each ABI's |
| `int_least8_t` to `int_least64_t`, `uint_least8_t` to `uint_least64_t` | each the smallest type of at least its width, so the implementation's integer types decide it | each ABI's |
| `_Float32x`, `_Float64x` | their formats (C23, Annex H: at least as wide as `binary32`'s and `binary64`'s) | each ABI's |
| `_Float128x`, `int_fastN_t`, `uint_fastN_t`, `intmax_t`, `uintmax_t` | not stored: neither ABI provides `_Float128x`, and neither C nor the two psABIs fixes the others' widths, which are the C library's (glibc's `int_fast16_t` is 64 bits on x86-64, musl's 32) *(agent)* | none |

The exact-width typedefs are C's and C++'s *(agent)*, by the rule the user gave, what the standard fixes: they are
fixed as `_FloatN` is, where provided, and are not among the `<stdint.h>` typedefs an ABI fixes.

**C** (C11 to C23): its own domains, owned by `Expressions.C.Expressions`.

| Domains (C's names) | Kind | Parameters and inferred properties |
|---|---|---|
| `bool` | ISO/IEC 11404 `boolean` | `ordered` false, as 11404's `boolean` *(agent)* |
| `int8_t`, `int16_t`, `int32_t`, `int64_t` | ISO/IEC 11404 `integer` | `width` 8, 16, 32, 64; `signed`; `overflow` `raise`; `least`, `greatest`; `ordered` |
| `uint8_t`, `uint16_t`, `uint32_t`, `uint64_t` | ISO/IEC 11404 `modulo` | `modulus` 2^8, 2^16, 2^32, 2^64; `least` 0, `greatest` `modulus` - 1; `ordered` |
| `_Float16`, `_Float32`, `_Float64`, `_Float128`, `_Decimal32`, `_Decimal64`, `_Decimal128` | IEEE 754 `ieee754` | `format` `binary16`, `binary32`, `binary64`, `binary128`, `decimal32`, `decimal64`, `decimal128`; `rounding` `roundTiesToEven`; `width`, `radix`, `precision`, `emax`; `ordered` |
| `nullptr_t` | C's `nullptr_t` (a token, no schema) | `ordered` false |

- **Unsigned is `modulo`.** C's unsigned arithmetic "can never overflow": a result is "reduced modulo the number that
  is one greater than the largest value" (C23, Types), which is 11404's `modulo` (§10.1.2), as the user's rule decided
  of `uint8` ("adopt names the standard uses for datatypes it defines"; Decided, "On stage 1's review", "`uint8` split
  by 11404's own definitions"). A signed type is 11404's `integer`, its `overflow` `raise`: what C leaves undefined
  raises, as CAP-100 records and C's evaluator does. So too in the ABI dialects.
- **`decimal32`.** `Ieee754.FORMATS` gains `decimal32` (radix 10, precision 7, emax 96, IEEE 754-2019's), for
  `_Decimal32`, as the coordinating agent relays the user's decision (2026-11-09: "IEEE 754's `decimal32`: the format
  is to be added for C's `_Decimal32`"); DOM-10 to DOM-12 assert it with the other decimal formats.
- **`width`** *(agent)*: IEEE 754's kind gains `width`, inferred, the format's width in bits (IEEE 754-2019's `k` of
  an interchange format), as M has `std::bfloat16_t`'s "16 bits": 16, 32, 64 and 128 for the binary formats, 32, 64
  and 128 for the decimal ones, 16 for `std::bfloat16_t`, 80 for x87's format. IEEE 754's own `binary64` and
  `binary32` gain it, and so does every `ieee754` domain another dialect writes (SystemVerilog's `real` and
  `shortreal`, Python3's, TypeScript5's, MATLAB's and Excel's `binary64` ones), which SystemVerilog's types then read
  in place of `Ieee754.WIDTHS`.
- **Not domains**: a string literal's type, an array (Decided, H, 4: compound values have schemas); `_BitInt(N)`, a
  family of types, one per width, as a sized vector is SystemVerilog's; a program's own enums and typedefs (Decided,
  "On stage 3's design"); and what no standard in scope defines (`__int128`, `__float128`, `__fp16`, compilers'
  extensions).

**The ABI dialects** (Decided, "One dialect per ABI" and Q). Two, each a family with one dialect, laid out as every
dialect is (the dialects proposal's Decided, Namespace, 6 and 7), each a singleton of its own schema, a branch of
`Expressions.Framework.Dialect`, with no terms and no kinds of its own: its domains are instances of ISO/IEC 11404's
and IEEE 754's kinds. Each serves C and C++ alike. Their names are the agent's, for review, each spelled as its psABI
document names itself:

| Dialect (path; name; tag) | Its standard (`STANDARDS`) |
|---|---|
| `SystemV.AMD64`; `AMD64`; `amd64` | "System V Application Binary Interface, AMD64 Architecture Processor Supplement", its LP64 programming model |
| `Arm.AAPCS64`; `AAPCS64`; `aapcs64` | "Procedure Call Standard for the Arm 64-bit Architecture (AArch64)", AAPCS64, its LP64 data model |

The family is the ABI as its document names it (`SystemV`, of "System V Application Binary Interface"; `Arm`, as Arm
spells itself), the dialect the processor supplement or the standard (`AMD64`, the supplement's own name for x86-64;
`AAPCS64`, the document's abbreviation). Each document also defines an ILP32 model (x32; AAPCS64's ILP32), which would
be a dialect of its own, added when needed. Python `mbse.Expressions.SystemV.AMD64` and
`mbse.Expressions.Arm.AAPCS64`; TypeScript `src/SystemV/AMD64/` and `src/Arm/AAPCS64/`, exported as
`@mbse/expressions/SystemV/AMD64` and `@mbse/expressions/Arm/AAPCS64`.

| Domains (C's names) | `SystemV.AMD64` | `Arm.AAPCS64` |
|---|---|---|
| `char` | 11404 `integer`: `width` 8, `signed` | 11404 `modulo`: `modulus` 2^8 |
| `signed char`, `short`, `int`, `long long` | 11404 `integer`: `width` 8, 16, 32, 64, `signed` | the same |
| `unsigned char`, `unsigned short`, `unsigned int`, `unsigned long long` | 11404 `modulo`: `modulus` 2^8, 2^16, 2^32, 2^64 | the same |
| `long`, `ptrdiff_t`, `intptr_t` | 11404 `integer`: `width` 64, `signed` | the same |
| `unsigned long`, `size_t`, `uintptr_t` | 11404 `modulo`: `modulus` 2^64 | the same |
| `int_least8_t` to `int_least64_t` | 11404 `integer`: `width` 8, 16, 32, 64, `signed` | the same |
| `uint_least8_t` to `uint_least64_t` | 11404 `modulo`: `modulus` 2^8, 2^16, 2^32, 2^64 | the same |
| `wchar_t` | 11404 `integer`: `width` 32, `signed` (`int`) | 11404 `modulo`: `modulus` 2^32 (`unsigned int`) |
| `char8_t`, `char16_t`, `char32_t` | 11404 `modulo`: `modulus` 2^8, 2^16, 2^32 (`unsigned char`, `uint_least16_t`, `uint_least32_t`) | the same |
| `float`, `double` | IEEE 754 `binary32`, `binary64` | the same |
| `long double` | IEEE 754 `ieee754`, x87's extended format: no `format`; `width` 80, `radix` 2, `precision` 64, `emax` 16383 | IEEE 754 `binary128` |
| `_Float32x` | IEEE 754 `binary64` | IEEE 754 `binary64` |
| `_Float64x` | x87's extended format, as `long double` | IEEE 754 `binary128` |

Each integer as C's (`overflow` `raise`, `least`, `greatest`, `ordered`); each IEEE 754 domain rounding ties to even,
with its `width`, `radix`, `precision`, `emax` and `ordered`. The domains are listed in the order C's standard lists the
types, which is also the order a result's type is named in (What reads the stored domains, below).

- **x87's format is IEEE 754's** *(agent)*: an extended precision format of IEEE 754-2019 (§3.7, binary64's extended
  format: precision at least 64, emax at least 16383), with no interchange format to name; so it is an `ieee754`
  domain with its parameters and no `format`, as `std::bfloat16_t` is (Decided, M). This supersedes, for it and for
  `std::bfloat16_t`, CAP-097's "a format outside it (fp8, `bfloat16`, x87's 80-bit format) would be a domain of its
  own", to be recorded with the records (Stages, 5).
- **Arithmetic in a format by its parameters** *(agent)*: `Ieee754`'s operations take a format by its name or, where
  it has none, by its radix, precision and emax, so that `long double`'s arithmetic follows its ABI's format (x87's
  rounds to 64 bits of precision; `binary128`'s, as now, to 113); its values are text, as `binary128`'s are.
  Encodings (`to_bits`, `from_bits`) stay the interchange formats'.

**C++** (C++17 to C++23): its own domains, owned by `Expressions.Cpp.Expressions`, under C++'s names: `bool`; the
exact-width typedefs, as C's; C++23's `std::float16_t`, `std::float32_t`, `std::float64_t` and `std::float128_t`
(`binary16` to `binary128`); `std::bfloat16_t`, an `ieee754` domain with no `format`, `width` 16, `radix` 2, `precision`
8 and `emax` 127 (Decided, M); and `nullptr_t`, of C++'s own `nullptr_t` kind. C++ has no `_FloatN` or decimal types.
Every other type it reads (`int`, `char`, `char8_t`, `wchar_t`, `size_t`, `long double`, ...) is its holder's ABI's,
which C++ shares with C.

- **C++'s library typedefs keep C's names** *(agent)*, re-checked against the scope rule and the ABI split: a type
  C++'s library declares under a name C's library also declares (C++'s `<stdint.h>` and `<stddef.h>`, and `<cstdint>`
  and `<cstddef>` in `std`) keeps that name, `int32_t`, `size_t`, `nullptr_t`, so that one ABI dialect names each type
  once for both languages, and C++'s casts already write them so; a type only C++'s library declares is named as C++
  does, in `std` (`std::float16_t`, `std::bfloat16_t`).
- **Literals.** A C++ literal is typed by C++'s names: `1.0f16` is a `std::float16_t`, `1.0bf16` a `std::bfloat16_t`,
  and `1.0df`, which C++ does not write, has no stored type, its type unknown, as an unknown suffix's is today.

**SystemVerilog** (IEEE 1800-2023): the built-in types its `Domains.TYPES` named, one for one (the table gone since), owned by
`Expressions.SystemVerilog.Expressions`.

| Domains | Kind | Parameters and inferred properties |
|---|---|---|
| `logic`, `reg`, `integer`, `time` | SystemVerilog's `logic` (4-state) | `width` 1, 1, 32, 64; `signed` false, false, true, false; `least`, `greatest` of its known values; `ordered` |
| `bit`, `byte`, `shortint`, `int`, `longint` | SystemVerilog's `bit` (2-state), new | `width` 1, 8, 16, 32, 64; `signed` false, true, true, true, true; `least`, `greatest`; `ordered` |
| `real`, `shortreal` | IEEE 754 `ieee754` | `binary64`, `binary32`, as C's `double` and `float` |

- **2-state types are SystemVerilog's own, of the kind `bit`** *(agent)*: SystemVerilog's types are its dialect's
  (Decided, B: "SV specific domains are part of the SV dialect"), and IEEE 1800 names its 2-state integral type `bit`,
  as it names the 4-state one `logic`, the kind stage 1 added. A 4-state domain has no schema, since no basic scalar
  holds `x` or `z` (as a token's has none: Stage 1's design, A language's own kinds); a 2-state one narrows `int`.
- **`reg` beside `logic`**: "logic and reg denote the same type" (IEEE 1800-2023), and each name gets its domain, with
  the same properties (Decided, "On stage 3's design": no synonym machinery).
- **A sized vector** (`logic [7:0]`, `8'hFF`'s type) is not a named type, so `define` writes none: its type is computed
  from the term's own width and signedness, as now, and inferring it is CAP-232's.
- **`enumerated` is not added**: SystemVerilog names no enumerated type of its own, and a program's enums get no stored
  domain, so no stored domain needs an order yet.

**Python3**: `bool` (11404 `boolean`), `int` (11404 `integer`: signed, unbounded, `overflow` `raise`, as 11404's own
`integer`), `float` (IEEE 754 `binary64`), `str` (Python3's `str`), `bytes` (11404 `octetstring`), and the tokens
`NoneType` and `ellipsis` (Python3's `nonetype` and `ellipsis`), each named as Python names its type
(`type(None).__name__`, `type(...).__name__`). `complex` is not a domain (Decided, H and J).

**TypeScript5**: `boolean` (11404 `boolean`), `number` (IEEE 754 `binary64`), `bigint` (11404 `integer`, unbounded),
`string` (TypeScript5's `string`) and the token `null` (TypeScript5's `null`), named by TypeScript's type keywords.
`RegExp` is not a domain (Decided, H).

**MATLAB**: `double` (IEEE 754 `binary64`), `logical` (11404 `boolean`) and `string`, a new kind of MATLAB's own,
`string`, its text UTF-16 code units, lone surrogates among them, as TypeScript5's `string` is (Decided, B, "by the
same rule ... TypeScript's `string` [is its dialect's] own") *(agent)*. A `struct` is not a domain (Decided, H, 4).

**Excel**: `number` (IEEE 754 `binary64`), `logical` (11404 `boolean`), `text`, a new kind of Excel's own, UTF-16 code
units, for the same reason *(agent)*, and `error` (Excel's `error`), its `members` Excel's error values: `#NULL!`,
`#DIV/0!`, `#VALUE!`, `#REF!`, `#NAME?`, `#NUM!`, `#N/A` and `#GETTING_DATA`, in the order `ERROR.TYPE` numbers them,
then `#SPILL!`, `#CALC!`, `#FIELD!`, `#BLOCKED!`, `#CONNECT!`, `#BUSY!` and `#UNKNOWN!`, which Excel added since
*(agent)*; `ordered` false. A record is not a domain (Decided, H, 4).

**LaTeX** stores none (Decided, N): it gains no `define`.

**The corpus's and the tests' own domains** (Decided, "On stage 3's design", R): `state` and `mode` stay in ISO/IEC
11404's singleton, as they are, since mbse-schemas refuses a domain with no owner and `ERROR.TYPE`'s documented codes
cover only eight of Excel's fifteen error values, so no standard's values can take their place *(agent)*.

**Which ABI a term is read under** (Decided, P). The holder names it:

- **The relation** *(agent, its names)*: `Expressions.Framework.HasAbi`, linking `expression`, an
  `Expressions.Framework.Expression`, and `abi`, an `Expressions.Framework.Dialect`, unique `[expression]`; and the
  expression's adjacency `abi`, through it, which every dialect's holder inherits, refining the framework's. It is named
  as the framework's other relations from a holder are, by what the first link has (`HasRoot`, `HasDomain`), its
  acronym spelled as the kinds' schemas spell theirs (`OfIeee754`); its links are the roles they play, as `Defines`'
  are. The framework's install adds it, beside `HasRoot`: no dialect owns the holder.
- **Several ABIs in a store**: a store installs and defines the ABI dialects its holders need, each holder read under
  the one it names.
- **The lookup**: a C or C++ term's named type is found among its own dialect's domains, then among its holder's ABI's.
  The holder is found from the term by its owners, the term's record owned by its parent's, up to the reference object
  that holds the root (`Terms.holder_of`, new *(agent)*), its store as `Proxies.store_of` gives it; a dialect's domains
  are read by name through `Framework.Domains.domains(dialect)`, new beside `operations`, which SystemVerilog's lookup
  reads too, in place of its own scan of the entries (the stage's group 2 found it missing).
- **What is refused**, each by name *(agent)*: a type the dialect does not define, whose holder names no ABI, "'int' is
  not a type C defines, and its expression names no ABI"; one neither defines, "'int' is not a type C or AMD64
  defines" (the ABI's `define` has not run). A lone term is refused by mbse-schemas' `TypeError`, as below.
- **The ABI dialects declare the link** *(agent)*: mbse-schemas refuses a link filled by an object whose schema
  declares no adjacency to the relation, so each ABI dialect's schema declares an anonymous adjacency to `HasAbi`
  through `abi`, and a holder naming as its ABI a dialect that is not one (C's, Python3's) is refused by validation.
- **Not `Uses`**: it records which ABI a holder's terms are read under, not which dialects a dialect uses, as the user
  settled (Decided, P); so it gives no reason to reinstate `Uses`.

**What reads the stored domains** (Decided, K):

- **The tables go**: C's `TYPES` and its constants (`Bool`, `Int`, `Double`, `UnsignedInt`, `Long`, `UnsignedLong`),
  and SystemVerilog's `TYPES` and its (`Real`, `Integer`, `Bit`, `Longint`). Every named type evaluation, inference and
  validation use is a stored domain found by its name, through the term's holder: a C term's among C's domains and its
  holder's ABI's, a C++ term's among C++'s and its holder's ABI's (above), a SystemVerilog term's among SystemVerilog's.
  Its width, signedness and format are read by `Framework.Domains.kind_of` and `properties`, and the working value the
  arithmetic computes on, a `CType` (`SvType`), is built of them, named by the domain's `Defines` name, and keeping the
  domain it was read from, so that a rule reaches the store for a type no operand carries (C's promotions' `int`,
  SystemVerilog's `real` for a `shortreal` among integrals) *(agent)*.
- **Literals.** Typing a C literal by its suffix and base looks the type up among the stored domains, the tables of
  which names a suffix allows (`_DECIMAL`, `_OTHER`, `_FLOATING`, `_EXTENDED`, `_ENCODINGS`) staying the rule, as C's
  standard gives it (Decided, 5); its range check reads the stored domain's `least` and `greatest` (Proposed, 5), the
  messages unchanged. A constant's type by its value (`of`: `int`, `long` or `unsigned long`, `double`, `bool`) is a
  lookup too, by name, as SystemVerilog's `of` gives a name. Inference types a constant through its kind's `typed`,
  whose record reaches the store, since `domain_of` takes a value alone (the stage's group 2 found it so) *(agent)*.
- **Casts and promotions**: a cast's target (`arithmetic(names)`, then the stored domain of that name), `int` for the
  promotions, `size_t` for `sizeof` and `alignof`, `bool` for a comparison; SystemVerilog's casts (`int'(x)`) and
  `$bits`. The rules stay code: the promotions and usual arithmetic conversions over the working values (Decided, 2).
  A result whose type equals several stored domains is named as today, by the first of C's names in the order its
  standard lists them (`int` before `int32_t`, `long` before `int64_t`), a list of names, not of types *(agent)*.
- **A lone term is refused**: C's, C++'s and SystemVerilog's evaluation, inference and validation of a term that reads
  a named type need it held in a store where the dialect's `define` (and its holder's ABI's) has run, as Patterns'
  validation does since stage 2; a lone term is refused by mbse-schemas' `TypeError`, "the value does not belong to a
  store". A store where the `define` has not run holds no such domain, and a type it names is refused by name (above;
  SystemVerilog's "'int' is not a type SystemVerilog defines", as stage 2's "'f' is not an operation Patterns defines")
  *(agent)*. Only what reads a named type reaches the store: a term that reads none (SystemVerilog's sized vectors) is
  read alone as before; in C, by Q, nearly every term reads one (`5` is an `int`, the ABI's).
- The other dialects' code domains (Python3's `Int`, TypeScript5's `Number`, MATLAB's `Double`, ...) are inference's,
  `OfTypes`, as Patterns' natives became in stage 2, and stay, marked CAP-232's to replace *(agent)*: their evaluators
  compute on natives, and read no domain.

**Install order and `Uses`.** C, C++, the ABI dialects, SystemVerilog, Python3, TypeScript5, MATLAB and Excel use the
standard dialects' kinds, so their installs and defines run after the standard dialects', as every caller's list has it
(Decided, I); a store installs the ABI dialects it needs (Decided, "One dialect per ABI"), and its C and C++ holders
name the one each is read under (Decided, P), which is not `Uses`.

**Tests and corpus**, under their IDs in both languages: a DOM case per group, DOM-19 (C's, C++'s and the ABI
dialects' stored domains, their kinds, properties and schemas, and a holder's ABI), DOM-20 (SystemVerilog's) and DOM-21
(Python3's, TypeScript5's, MATLAB's and Excel's); DOM-17's and DOM-18's lists follow; DOM-03, DOM-05, EXP-06 and the
corpus's `domains` case keep `state` and `mode` in ISO/IEC 11404's singleton (Decided, R); DIA-11, DIA-12,
DIA-24 and the SystemVerilog cases where literal typing, ranges, casts and evaluation read the store, through a holder
naming its ABI; DOM-10 to DOM-12 `decimal32` and a format by its parameters; FRM-01 each dialect's kinds, the new
dialects and `HasAbi`. The corpus gains a case per dialect's stored domains, its singleton written as one document as
the `domains` case is (`c_domains`, `cpp_domains`, `amd64_domains`, `aapcs64_domains`, `systemverilog_domains`,
`python3_domains`, `typescript5_domains`, `matlab_domains`, `excel_domains`) *(agent)*. A dialect's singleton written
as one document holds its `Defines` entries, each its name and a reference to its domain, not the domains' kinds, so
the corpus pins each dialect's domains' names and order across the languages, byte for byte, and CONF-04 each one's
kind as read back; the hand-populated properties are pinned in each language by the DOM cases' tables (DOM-17 to
DOM-21), the same values under the same IDs in both (mbse-basis
[PRI-038: the same cases in both languages](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-038))
*(agent)*. The API's items: Settled in domains as data's stage 3, 131 onward.

**The build, partitioned**, in the order the record gives, each group by an agent owning its dialects' modules in both
languages, on this branch: (1) C, C++ and the two ABI dialects (`C/`, `Cpp/`, `SystemV/`, `Arm/`, and `Ieee754`'s and
IEEE 754's `decimal32`, `width` and formats by their parameters, and the framework's `HasAbi`, `holder_of` and
`domains`), after P and Q; (2) SystemVerilog; (3) Python3, TypeScript5, MATLAB and Excel. The shared files (the corpus,
the suites' notebooks, API.md, this proposal, the test plans, the skill, the toolkit) are written by the coordinating
agent, a group's cases handed to it.

**Found while building**, each taken the simplest way consistent with the record, *(agent)*, for review (API, 131
onward):

- **Inference has no store where a constant is typed**: `Terms.Dialect`'s `domain_of(value)` takes a value alone, so
  SystemVerilog and C type a constant through their `literal` kind's `typed(record)`, whose record reaches the store,
  and `domain_of` gives `Anything` for a constant no type holds; no framework change was needed.
- **A rule needs a type no operand carries**: SystemVerilog's `common` gives `real` for a `shortreal` among integrals,
  C's promotions `int` of two `char`s. A working type keeps the stored domain it was read from (`SvType.domain`,
  `CType`'s), compared by nothing, through whose store the rule reads the type it needs.
- **`===`'s `bit`**: its signature keeps an unnamed 1-bit 2-state vector; the `binary` kind's `typed` names it `bit`
  from the store, so inference's result is unchanged.
- **Only what reads a named type reaches the store**: SystemVerilog's validation (a cast naming a type), inference (a
  constant, a cast, `===`) and evaluation (wherever it computes in a named type) each reach it, and a lone term that
  reads none (`4'b1010 & 4'b0110`) is read as before; in practice an unsized constant is an `integer`, so evaluation
  nearly always does.
- **A cast's refusal** is the lookup's: `'word' is not a type SystemVerilog defines`, for a name no domain has and a
  store where the define has not run alike, replacing "a cast's type must be a built-in type, signed or unsigned".
- **`Framework.Domains.domains(dialect)`** was missing, as `operations` is not; it is added, and SystemVerilog's,
  C's and C++'s lookups read it (Decided, "The links between dialects": for the user's review).
- **The corpus's `systemverilog` case needs SystemVerilog's `define`**, its `byte'(...)` cast read from the store by
  CONF-04; the corpus's store runs every dialect's `define`.
- **The skill's install list** gains each dialect's `define` whose evaluation, inference or validation reads its
  domains, and the ABI dialects'.
- **An Excel error's schema narrows `str`**, its value its code, as Excel's evaluator holds one; the kinds MATLAB's
  `string` and Excel's `text` are their dialects' own, UTF-16 code units, MATLAB's install so gaining its union of
  kinds.

### Questions for the user (stage 3)

K to R are decided (Decided, "On stage 3's design"). R, for the record:

- **R. A domain owned by no dialect** (Decided, "On stage 3's design", the corpus's and the tests' own domains). An
  `Expressions.Framework.Domain` cannot be written without an owner: its adjacency `dialect`, through `Defines`, is its
  owner, and mbse-schemas 0.26.10 refuses an object of an owned schema that has none ("a 'Expressions.Framework.Domain'
  needs an owner through 'dialect': give it one, since no singleton can be", checked in Python on this branch). The
  reading interface would take one (`name_of` gives None where no dialect defines a domain). Nothing is worked around.
  (a) **Keep them in ISO/IEC 11404's singleton**, as today, the record noting why: no model change.
  (b) **A domain no dialect defines is a counted object**: `Domain` gains no owner, its `dialect` an adjacency that
  identifies but does not own; a dialect's domains are then counted objects too, and lose their paths
  (`dialect.domains({"name": "octet"})` as a path, a document's reference to a domain of another, the corpus's every
  domain case), which mbse-basis
  [CAP-133: no durable references to counted objects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-133.md)
  forbids holding.
  (c) **mbse-schemas lets an owner adjacency be optional**, an object of the schema owned where it has an owning
  entry and counted where it has none: a sibling's change, through a workspace, before this stage's corpus.
  (d) **No invented fixtures**, the user's option: the cases exercise `packed` with what a language defines, Excel's
  error values packed into their `ERROR.TYPE` codes.
  Decided (a): (d) was the user's preference where Microsoft's documentation gives the codes, and it gives eight of
  Excel's fifteen (Decided, "On stage 3's design", R).

## Risks

- **Cost**: stores hold hundreds more objects (every dialect's types), and installs grow; suites build stores often.
- **Equivalence**: the hand-populated properties are written twice, by each dialect's define in each language, and
  only the DOM cases' tables, the same in both, pin that they agree; the corpus's data cases pin each dialect's domains'
  names and order, not their properties (Stage 3's design, Tests and corpus).
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
