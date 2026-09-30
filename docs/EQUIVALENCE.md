# Equivalence of the implementations

`python3/` and `typescript5/` implement the same package, and follow mbse-schemas' rules for equivalence
([`EQUIVALENCE.md`](../submodules/mbse-schemas/docs/EQUIVALENCE.md)): the same API and messages, byte-identical JSON,
interchangeable data, the same test cases under the same IDs, and full coverage in both. This document covers what is
specific to this package.

## How it is checked

| Check | Where |
|---|---|
| Every test case of the Basic dialect exists in both implementations, same ID, same order (25 cases, 4 suites) | `python3/tests/0[1-4]_*.ipynb`, `typescript5/tests/*.ipynb` |
| API conformance to the visitor protocols, on classes and on live instances | VIS-01, VIS-02 |
| JSON is byte-identical; YAML and JSON are interchangeable | the CONF suite over the shared corpus in `conformance/` |
| Full code coverage in both | the coverage gates below |

## Coverage

| | Python | TypeScript |
|---|---|---|
| Command | `uv run coverage run -m pytest && uv run coverage combine && uv run coverage report` | `npm run coverage` |
| Result | 100% statements (1981), 100% branches (534) | 100% statements (1156), branches (506), functions (174), lines |

## Deliberate differences

Beyond mbse-schemas' own (native types, `Map` for plain data, errors, and so on):

| Area | Python | TypeScript | Why | Cases |
|---|---|---|---|---|
| Unknown | `None` | `null` | the respective "no value" | EVL-01..06 |
| Evaluation scope and validation options | `Evaluators.OfAny(e, {"this": x})`, `validate(bound={"this"}, core=True)` | `Evaluators.OfAny(e, { this: x })`, `validate({ bound: ["this"], core: true })` | no keyword arguments; object literals are the idiom | EXP-10, EVL-01, EVL-04, EVL-06 |
| Expressions from functions | `Expressions.from_(lambda this: this.age >= 18)` reads the function's source with `ast` | none; EXP-12 asserts `from_` is absent | a JavaScript function has no Python source to read; terms write the same expressions in both | EXP-12 |
| Names on a `Term` that are not properties | names starting with `_` (Python's own probes) | `then`, `toJSON` and symbols (JavaScript's own probes) | each language probes objects with its own names | EXP-11 |
| Framework, dialects and translators | `mbse.Expressions.Framework`, `Dialects` (Basic, Numpy, Matlab, Excel) and `Translators`; suites FRM, DIA and TRN (20 cases) | Basic only | built in Python first; Basic's API, messages and JSON are unchanged, so the corpus stays byte-identical | FRM, DIA, TRN |
| Import paths | `mbse.Schemas.Framework` and `mbse.Expressions`, in the shared `mbse` namespace package; mbse-schemas is installed from the submodule | `@mbse/schemas/Framework` and `@mbse/expressions`; `@mbse/schemas` is a `file:` dependency on the submodule | a module specifier is a path, not a dotted name; a scope is the nearest equivalent | all |

## Tutorials

`python3/tutorials/` and `typescript5/tutorials/` are the same case study, with the same outputs wherever the bindings
agree. The Python notebook writes its main body with lambdas read by `Expressions.from_` and shows terms and builders in
an appendix; the TypeScript notebook writes terms throughout. The expressions, and their JSON, are the same. Both are
run as tests and committed with outputs (Python's from its kernel, TypeScript's from Deno's Jupyter kernel).
