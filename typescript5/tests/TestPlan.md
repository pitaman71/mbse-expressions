<!-- nav -->
[← TypeScript package](../README.md) · [Home](../../README.md)

# Test plan — typescript5

Scope: everything under `typescript5/src` (the framework, the Patterns, Python3, Matlab, Excel, Latex, C, Cpp and
SystemVerilog dialects, and the translators between them) and cross-implementation conformance. The design reference is
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
| `05_Framework.ipynb` | FRM | 12 | as in Python; options objects stand for keyword arguments (`new Kind(role, { ... })`, `new Dialect(name, kinds, { domain_of, extends })`), `kinds()` and `Form.attributes` are `Map`s, and the generic reads are camelCase (`kindOf`, `dialectOf`, `nameOf`, `isExpression`); the C family's writers are a `Writers` object's arrow-function fields; the samples' integers are bigints, and a Python form's attributes compare with `form_equal` |
| `06_Dialects.ipynb` | DIA | 26 | as in Python, with Python3 expressions written by constructors (DIA-01 asserts `Python3.Text` has no `FromText`), Python's rules checked against the same tables of values and errors as the Python suite, and a `Module` in place of numpy; DIA-20 reads the same node list of `ast`, but checks it against the running Python's `ast` in Python only, and DIA-19 writes through the builders the literals and f-strings the Python suite also reads with `FromText`; JavaScript has no complex numbers or `...`, written `Complex` and `ELLIPSIS`; the data objects' integers are bigints, and a `Map` is a mapping too (Python, MATLAB, Excel, SystemVerilog); TypeScript5's number is a `number` and its bigint a `bigint` (DIA-21), and `Text.number` is JavaScript's `String` (DIA-22); C's and C++'s integers are bigints and their floats numbers (DIA-11, DIA-12, DIA-24) |
| `07_Translators.ipynb` | TRN | 14 | as in Python, but for evaluating the NumPy style over columns |
| `08_Skill.ipynb` | SKL | 3 | as in Python, SKL-02 retired |
| `09_Domains.ipynb` | DOM | 11 | as in Python; domains compare with `equals()`, widths and codes are `bigint`s, and builders are classes (`new D.OfInteger.Builder()`); the IEEE 754 table is checked against `decimal` and the host's floats in Python only |
| `10_Collections.ipynb` | COL | 8 | as in Python; a mapping's entries are arrays; collections, records and collection domains compare with `equals()`, and a record's fields are a `Map` |
| `11_Partials.ipynb` | PAR | 4 | as in Python; the reducer is called with `REDUCER.run(term, variables)` |

## Retired cases

A retired case's ID is not reused; the cases after it keep theirs.

| ID | Was | Why retired |
|---|---|---|
| EXP-12 | `Python.Text.FromFunction` read a Basic writer from a Python function's source | `FromFunction` was removed, as the user decided (2026-10-30): constraints are built with writers, in Python as in TypeScript |
| DOM-04 | A literal carried its domain, by name; a native's default domain was no domain at all | A term carries no domain (the port's stage 3, Decided, 1, 2026-10-30): whatever owns a root term gives its schema |
| DOM-13 | A call's domain was its result's: the conversions needed one, and other core operations took none | A term carries no domain, and the conversions are deferred with domain inference (stage 3, Decided, 2) |
| DOM-14 | `convert` kept a value in the operation's domain, rounding and overflowing as that domain did | Deferred with domain inference (stage 3, Decided, 2); IEEE 754's conversions themselves are still asserted, directly, in DOM-11 |
| DOM-15 | `reinterpret` kept the bit pattern, big-endian, between fixed-width domains of one size | Deferred with domain inference (stage 3, Decided, 2); a binary format's encoding is still asserted, directly, in DOM-10 |
| DOM-16 | `pack` gave a packed value's code in its representation, and `unpack` the packed value of a code | Deferred with domain inference (stage 3, Decided, 2) |
| SKL-02 | Every complete program in the skill ran: Python's, and TypeScript's type-checked strictly first | The skill holds no programs, as the user decided (2026-11-03): its hows are these suites' and the tutorials' cases, which SKL-03 checks it links in both languages |

Total: 103 cases (FRM-11, FRM-12 and DIA-18 added in stage 2; DIA-19 and DIA-20 in stage 3, `Python3` complete; DIA-21, DIA-22 and DIA-23 in stage 4, `TypeScript5`; DIA-24, DIA-25 and DIA-26 in stage 5, `C` and `Cpp`; SKL-04 added, for skill gaps; SKL-02 retired), with the same IDs in the same order in both implementations.

---

<!-- nav -->
[← TypeScript package](../README.md) · [Home](../../README.md)
