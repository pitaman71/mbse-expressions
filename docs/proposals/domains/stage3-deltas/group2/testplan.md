# TestPlan.md text, for group 2 (SystemVerilog's stored domains)

Each is an edit of the current row text in `python3/tests/TestPlan.md`; `typescript5/tests/TestPlan.md` needs only
the DOM row's count and the total, its rows saying "as in Python".

## DOM row (`09_Domains.ipynb`)

- Cases: 12 → 13 (with the other agent's DOM-21, 14).
- In "a language's own kinds (DOM-18), each its dialect's: SystemVerilog's `logic`, ...": make it "SystemVerilog's
  `logic` and `bit`, ...".
- Append, after DOM-18's clause: "; SystemVerilog's stored domains (DOM-20): its `define`, run after the installs, writes
  IEEE 1800's built-in types owned by its singleton by name, in order (`logic`, `reg`, `integer`, `time` of its 4-state
  kind `logic`; `bit`, `byte`, `shortint`, `int`, `longint` of its 2-state kind `bit`; `real`, `shortreal` of IEEE 754's
  kind, as IEEE 754's own `binary64` and `binary32`), each with its `width`, `signed`, `least`, `greatest` and
  `ordered`, read through `kind_of` (its dialect's tag first), `properties` and `name_of`; each 2-state one related to its
  schema, an `OfAny` of `int` or `float` (`Expressions.SystemVerilog.Expressions.int`), by `HasDomain` both ways, and
  the 4-state ones with no schema; `reg` `logic`'s equal, not a synonym; each read by `Domains.named` as the working
  type its evaluation computes on (width, signedness, states by its kind, format, labelled with its name); run again it
  writes nothing, and the store round-trips whole"

TypeScript's DOM row: count 12 → 13 (14 with DOM-21); its text "as in Python" stands.

## DIA row (`06_Dialects.ipynb`)

In "SystemVerilog: IEEE 1800's precedence, sized literals in every base, casts, validation, its types and 4-state
values, sizing in inference; evaluation by IEEE 1800's rules (...), variables typed by their values, members, elements
and calls, and its errors", make "its types" read: "its types, each named one the domain SystemVerilog's `define` stores,
read through the store of the term's holder (`Domains.named`; a constant's type by name, `Domains.of`), a cast's type one
it defines (`'word' is not a type SystemVerilog defines`), a store where the define has not run defining none, and a
lone term refused (mbse-schemas' TypeError) where it reads a named type, and read where it reads none (a sized
vector's)"; and after "and its errors" (DIA-14): "; a lone term refused where its evaluation needs a named type, and
evaluated where it needs none".

## FRM row (`05_Framework.ipynb`)

"SystemVerilog (`logic`)" → "SystemVerilog (`logic`, `bit`)" (and the other agent's MATLAB (`string`) and Excel
(`text`, `error`), with "MATLAB and LaTeX having none" → "LaTeX having none").

## TRN row (`07_Translators.ipynb`)

No text change: TRN-09's and TRN-11's evaluations of SystemVerilog terms now read SystemVerilog's types, which the
suite's setup's `SystemVerilog.define` writes.

## CONF row (`04_Conformance.ipynb`)

After "and the `domains` case, ISO/IEC 11404's dialect, ...": "; and the `systemverilog_domains` case, SystemVerilog's
dialect and its domains, back into the singleton itself, valid, its domains in order, each kind read through `kind_of`;
each case validated after `Patterns.define` and `SystemVerilog.define`, which `build()` runs" (if the corpus case is
built as `corpus.md` has it).

## The tutorials (`python3/tutorials/README.md`, `typescript5/tutorials/README.md`)

The toolkit's `cold_chain()` "with the framework's and every dialect's kinds installed" may add ", Patterns' operations
and SystemVerilog's types defined" (not a TestPlan.md change; the READMEs are shared).

## Totals

"Total: 104 cases (...)" → 105 (106 with DOM-21), adding "DOM-20 in its stage 3, SystemVerilog's stored domains" to the
parenthesis, in both plans.
