# Test plan — typescript5

Scope: everything under `typescript5/src` (Expressions, Evaluators) and cross-implementation conformance. The design
reference is `../../docs/EXPRESSIONS.md`; this plan and the Python one mirror each other case for case. The framework
itself is tested in mbse-schemas.

## Running

```sh
npm test                      # type-check, then every notebook under tests/ and tutorials/
npm run coverage              # fails below 100% statements, branches, functions or lines
npm run conformance           # regenerate ../conformance/typescript5
```

## Suites

| Notebook | Suite | Cases | Focus |
|---|---|---|---|
| `01_Expressions.ipynb` | EXP | 12 | as in Python; validation options are an object literal, and a term's probes are JavaScript's (`then`, `toJSON`, symbols); EXP-12 asserts there is no `from_` |
| `02_Evaluators.ipynb` | EVL | 6 | as in Python; evaluation scopes are object literals |
| `03_Visitors.ipynb` | VIS | 2 | as in Python, checked at runtime by method presence and `Function.length` |
| `04_Conformance.ipynb` | CONF | 4 | as in Python, from this side |

Total: 24 cases, with the same IDs in the same order in both implementations.
