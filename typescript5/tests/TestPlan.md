# Test plan — typescript5

Scope: everything under `typescript5/src` (the framework, the Basic, Python, Matlab and Excel dialects, and the
translators between them) and cross-implementation conformance. The design reference is `../../docs/EXPRESSIONS.md`;
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
| `01_Expressions.ipynb` | EXP | 12 | as in Python; validation options are an object literal, and a term's probes are JavaScript's (`then`, `toJSON`, symbols); EXP-12 asserts there is no `from_` |
| `02_Evaluators.ipynb` | EVL | 7 | as in Python; evaluation scopes are object literals |
| `03_Visitors.ipynb` | VIS | 2 | as in Python, checked at runtime by method presence and `Function.length` |
| `04_Conformance.ipynb` | CONF | 4 | as in Python, from this side |
| `05_Framework.ipynb` | FRM | 9 | as in Python; protocols are checked by method presence and `Function.length`, and options objects stand for keyword arguments |
| `06_Dialects.ipynb` | DIA | 8 | as in Python, with Python expressions written by constructors (DIA-01 asserts there is no `parse`), Python's rules checked against the same tables of values and errors as the Python suite, and a `Module` in place of numpy |
| `07_Translators.ipynb` | TRN | 6 | as in Python, but for evaluating the NumPy style over columns |
| `08_Skill.ipynb` | SKL | 3 | as in Python; SKL-02 type-checks the skill's TypeScript program strictly, then runs it |

Total: 51 cases, with the same IDs in the same order in both implementations.
