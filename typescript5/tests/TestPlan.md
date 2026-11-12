<!-- nav -->
[← TypeScript package](../README.md) · [Home](../../README.md)

# Test plan — typescript5

Scope: everything under `typescript5/src` (the framework, the standard dialects ISO/IEC 11404, IEEE 754, IEEE 1164 and
Unicode, the Patterns, Python3, MATLAB, Excel, LaTeX, C, Cpp, SystemVerilog and TypeScript5 dialects, each family's
sublanguage dialects, and the translators between them) and cross-implementation conformance. The design reference is
mbse-basis [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md), with its capabilities;
this plan and the Python one mirror each other case for case, with the deliberate differences of
`../../docs/EQUIVALENCE.md`. mbse-schemas is tested in mbse-schemas.

## Running

```sh
npm test                      # type-check, then every notebook under tests/ and tutorials/
npm run coverage              # fails below 100% statements, branches, functions or lines
npm run conformance           # regenerate ../conformance/typescript5
```

Each case's and each tutorial step's markdown cell starts with its anchor, as in Python.

## Suites

| Notebook | Suite | Cases | Focus |
|---|---|---|---|
| `01_Expressions.ipynb` | EXP | 12 | as in Python; a transaction's frame is a `Map`; a writer is a function with its class's prototype, and its probes are JavaScript's (`then`, `toJSON`, symbols) |
| `02_Evaluators.ipynb` | EVL | 7 | as in Python; evaluation scopes are object literals |
| `03_Visitors.ipynb` | VIS | 2 | as in Python, the readers' and visitors' protocols checked on live instances by method presence |
| `04_Conformance.ipynb` | CONF | 4 | as in Python, from this side, for a case of Patterns' and of every dialect, and one of invalid syntax; YAML is formatted by mbse-schemas' own emitter (it quotes base64 text), and its values must match (mbse-schemas' EQUIVALENCE.md, YAML formatting) |
| `05_Framework.ipynb` | FRM | 13 | as in Python; options objects stand for keyword arguments (`new Kind(role, { ... })`, `new Dialect(name, kinds, { domain_of, extends })`), `kinds()` and `Form.attributes` are `Map`s, and the generic reads are camelCase (`kindOf`, `dialectOf`, `nameOf`, `isExpression`); the C family's writers are a `Writers` object's arrow-function fields; the samples' integers are bigints, and a Python form's attributes compare with `form_equal`; the standards' reading interface is camelCase (`Standards.designationOf`), its standards and properties `Map`s, a container and a revision arrays (`["year", 2011n]`) (FRM-13); a kind tagged by a Python keyword is a member in builder calls (`u.import(...)`), where Python writes `getattr(u, "import")` (FRM-05, FRM-10) |
| `06_Dialects.ipynb` | DIA | 30 | as in Python, with Python3 expressions written by constructors (DIA-01 asserts `Python3.Text` has no `FromText`), Python's rules checked against the same tables of values and errors as the Python suite, and a `Module` in place of numpy; DIA-20 reads the same node list of `ast`, but checks it against the running Python's `ast` in Python only, and DIA-19 writes through the builders the literals and f-strings the Python suite also reads with `FromText`; JavaScript has no complex numbers or `...`, written `Complex` and `ELLIPSIS`; the data objects' integers are bigints, and a `Map` is a mapping too (Python, MATLAB, Excel, SystemVerilog); TypeScript5's number is a `number` and its bigint a `bigint` (DIA-21), and `Text.number` is JavaScript's `String` (DIA-22); C's and C++'s integers are bigints and their floats numbers (DIA-11, DIA-12, DIA-24) |
| `07_Translators.ipynb` | TRN | 14 | as in Python, but for evaluating the NumPy style over columns; a kind tagged by a Python keyword is a member in builder calls (`t.import(...)`, TRN-02) |
| `08_Skill.ipynb` | SKL | 4 | as in Python, SKL-02 retired |
| `09_Domains.ipynb` | DOM | 15 | as in Python; an int is a `bigint` (`new OfTypes("int", BigInt)`), and `Ieee754`'s coefficients and bases are `bigint`s; the IEEE 754 table is checked against `decimal` and the host's floats in Python only; the reading interface is camelCase (`Domains.kindOf`, `nameOf`), its properties and operations `Map`s and a container an array, and a standard dialect's module is checked by its import path (DOM-17); a define's frame is a `Map` (`frame.get(name)`), and a format by its parameters an array of IEEE 754's (`[2n, 64, 16383]`) (DOM-19 to DOM-21) |
| `10_Collections.ipynb` | COL | 8 | as in Python; a mapping's entries are arrays; collections, records and collection domains compare with `equals()`, and a record's fields are a `Map` |
| `11_Partials.ipynb` | PAR | 4 | as in Python; the reducer is called with `REDUCER.run(term, variables)` |
| `12_SystemVerilog_Patterns.ipynb` | SVP | 9 | as in Python |
| `13_SystemVerilog_Assertions.ipynb` | SVA | 8 | as in Python |
| `14_SystemVerilog_Constraints.ipynb` | SVC | 11 | as in Python; literals are `bigint`s |
| `15_SystemVerilog_Preprocessor.ipynb` | SVD | 9 | as in Python |
| `16_Python_Types.ipynb` | PYT | 9 | as in Python |
| `17_Python_Patterns.ipynb` | PYP | 9 | as in Python |
| `19_TypeScript_Types.ipynb` | TST | 5 | as in Python |
| `20_TypeScript_Patterns.ipynb` | TSP | 4 | as in Python |
| `21_TypeScript_RegExp.ipynb` | TSR | 7 | as in Python |
| `22_C_Types.ipynb` | CTY | 9 | as in Python |
| `23_Cpp_Types.ipynb` | XTY | 9 | as in Python |
| `24_C_Preprocessor.ipynb` | CPD | 9 | as in Python |
| `25_Cpp_RegExp.ipynb` | XRX | 10 | as in Python |

## Retired cases

A retired case's ID is not reused; the cases after it keep theirs.

| ID | Was | Why retired |
|---|---|---|
| EXP-12 | `Python.Text.FromFunction` read a Basic writer from a Python function's source | `FromFunction` was removed, as the user decided (2026-10-30): constraints are built with writers, in Python as in TypeScript |
| DOM-02 | A code domain held the values of its native type that fit it (widths, signedness, big-endian bits, surrogates, std_logic states, enum members), and included only itself | Patterns' code domains, their data classes, went in domains as data's stage 2: a domain is its stored kind and properties alone; what a domain holds is a constraint for a later resolver, and DOM-01 keeps the natives' domains inference reads |
| DOM-04 | A literal carried its domain, by name; a native's default domain was no domain at all | A term carries no domain (the port's stage 3, Decided, 1, 2026-10-30): whatever owns a root term gives its schema |
| DOM-13 | A call's domain was its result's: the conversions needed one, and other core operations took none | A term carries no domain, and the conversions are deferred with domain inference (stage 3, Decided, 2) |
| DOM-14 | `convert` kept a value in the operation's domain, rounding and overflowing as that domain did | Deferred with domain inference (stage 3, Decided, 2); IEEE 754's conversions themselves are still asserted, directly, in DOM-11 |
| DOM-15 | `reinterpret` kept the bit pattern, big-endian, between fixed-width domains of one size | Deferred with domain inference (stage 3, Decided, 2); a binary format's encoding is still asserted, directly, in DOM-10 |
| DOM-16 | `pack` gave a packed value's code in its representation, and `unpack` the packed value of a code | Deferred with domain inference (stage 3, Decided, 2) |
| SKL-02 | Every complete program in the skill ran: Python's, and TypeScript's type-checked strictly first | The skill holds no programs, as the user decided (2026-11-03): its hows are these suites' and the tutorials' cases, which SKL-03 checks it links in both languages |

Total: 211 cases (TSR added in the retrofit's group TR, 7 cases: TypeScript RegExp; SKL-05 added in the tutorials' overhaul, every tutorial with the same steps in both languages; PYT and PYP added in the retrofit's group P, 18 cases: Python Types and Python Patterns; TST and TSP in its group T, 9 cases: TypeScript Types and TypeScript Patterns; CTY, XTY and CPD in its group C, 27 cases: C Types, Cpp Types and C Preprocessor; DIA-30 added in the retrofit's core, every binder refining `Let`; DIA-27, DIA-28 and DIA-29 added in stage 6, `SystemVerilog` complete, with the suites SVP, SVA, SVC and SVD, 37 cases; FRM-11, FRM-12 and DIA-18 added in stage 2; DIA-19 and DIA-20 in stage 3, `Python3` complete; DIA-21, DIA-22 and DIA-23 in stage 4, `TypeScript5`; DIA-24, DIA-25 and DIA-26 in stage 5, `C` and `Cpp`; SKL-04 added, for skill gaps; SKL-02 retired; DOM-17 added in domains as data's stage 1, the standard dialects, and DOM-18, a language's own kinds; DOM-02 retired in its stage 2, with Patterns' code domains; DOM-19, DOM-20 and DOM-21 added in its stage 3, the stored domains of C, C++ and the ABI dialects, of SystemVerilog, and of Python3, TypeScript5, MATLAB and Excel; FRM-13 added in its stage 4, standards as data), with the same IDs in the same order in both implementations.

---

<!-- nav -->
[← TypeScript package](../README.md) · [Home](../../README.md)
