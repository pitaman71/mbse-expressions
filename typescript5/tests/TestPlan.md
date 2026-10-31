<!-- nav -->
[← TypeScript package](../README.md) · [Home](../../README.md)

# Test plan — typescript5

Scope: everything under `typescript5/src` (the framework, the Basic, Python, Matlab, Excel, Latex, Ccpp and
SystemVerilog dialects, and the translators between them) and cross-implementation conformance. The design reference is
mbse-basis [FEA-024: expressions as data](../../../mbse-basis/docs/features/FEA-024.md), with its capabilities;
this plan and the Python one mirror each other case for case, with the deliberate differences of
`../../docs/EQUIVALENCE.md`. mbse-schemas is tested in mbse-schemas.

## Running

```sh
npm test                      # type-check, then every notebook under tests/ and tutorials/
npm run coverage              # fails below 100% statements, branches, functions or lines
npm run conformance           # regenerate ../conformance/typescript5
```

## Suites

| Notebook | Suite | Cases | Focus |
|---|---|---|---|
| `01_Expressions.ipynb` | EXP | 12 | as in Python; a transaction's frame is a `Map`; a writer is a function with its class's prototype, and its probes are JavaScript's (`then`, `toJSON`, symbols) |
| `02_Evaluators.ipynb` | EVL | 7 | as in Python; evaluation scopes are object literals |
| `03_Visitors.ipynb` | VIS | 2 | as in Python, the readers' and visitors' protocols checked on live instances by method presence |
| `04_Conformance.ipynb` | CONF | 4 | as in Python, from this side, for a case of Basic's and of every dialect; YAML is formatted by mbse-schemas' own emitter (it quotes base64 text), and its values must match (mbse-schemas' EQUIVALENCE.md, YAML formatting) |
| `05_Framework.ipynb` | FRM | 10 | as in Python; options objects stand for keyword arguments (`new Kind(role, { ... })`, `new Dialect(name, kinds, { domain_of, extends })`), `kinds()` and `Form.attributes` are `Map`s, and the generic reads are camelCase (`kindOf`, `nameOf`); the samples' integers are bigints, and a Python form's attributes compare with `form_equal` |
| `06_Dialects.ipynb` | DIA | 17 | as in Python, with Python expressions written by constructors (DIA-01 asserts `Python.Text` has no `FromText`), Python's rules checked against the same tables of values and errors as the Python suite, and a `Module` in place of numpy; the data objects' integers are bigints, and a `Map` is a mapping too (Python, MATLAB, Excel, SystemVerilog) |
| `07_Translators.ipynb` | TRN | 14 | as in Python, but for evaluating the NumPy style over columns |
| `08_Skill.ipynb` | SKL | 3 | as in Python; SKL-02 type-checks the skill's TypeScript program strictly, then runs it |
| `09_Domains.ipynb` | DOM | 11 | as in Python; domains compare with `equals()`, widths and codes are `bigint`s, and builders are classes (`new D.OfInteger.Builder()`); the IEEE 754 table is checked against `decimal` and the host's floats in Python only |
| `10_Collections.ipynb` | COL | 8 | as in Python; a mapping's entries are arrays; collections, records and collection domains compare with `equals()`, and a record's fields are a `Map` |
| `11_Partials.ipynb` | PAR | 4 | as in Python; the reducer is called with `REDUCER.run(term, variables)` |

## Retired cases

A retired case's ID is not reused; the cases after it keep theirs.

| ID | Was | Why retired |
|---|---|---|
| EXP-12 | `Python.Text.FromFunction` read a Basic writer from a Python function's source | `FromFunction` was removed, as the user decided (2026-10-30): constraints are built with writers, in Python as in TypeScript |
| DOM-04 | A literal carried its domain, by name; a native's default domain was no domain at all | A term carries no domain (the port's stage 3, Decided, 1, 2026-10-30): whatever owns a root term gives its schema |
| DOM-13 | A call's domain was its result's: the conversions needed one, and other core operations took none | A term carries no domain, and the conversions are deferred with type inference (stage 3, Decided, 2) |
| DOM-14 | `convert` kept a value in the operation's domain, rounding and overflowing as that domain did | Deferred with type inference (stage 3, Decided, 2); IEEE 754's conversions themselves are still asserted, directly, in DOM-11 |
| DOM-15 | `reinterpret` kept the bit pattern, big-endian, between fixed-width domains of one size | Deferred with type inference (stage 3, Decided, 2); a binary format's encoding is still asserted, directly, in DOM-10 |
| DOM-16 | `pack` gave a packed value's code in its representation, and `unpack` the packed value of a code | Deferred with type inference (stage 3, Decided, 2) |

Total: 92 cases, with the same IDs in the same order in both implementations.

---

<!-- nav -->
[← TypeScript package](../README.md) · [Home](../../README.md)
