# Test plan — python3

Scope: everything under `python3/mbse/Expressions` (the framework, the Basic, Python, Matlab and Excel dialects, and
the translators between them) and cross-implementation conformance. The design reference is
`../../docs/EXPRESSIONS.md`. Suites EXP, EVL, VIS and CONF cover the Basic dialect and mirror the TypeScript plan case
for case; FRM, DIA and TRN are Python only for now (see `../../docs/EQUIVALENCE.md`). mbse-schemas is tested in
mbse-schemas. DIA and TRN use numpy, as a module Python expressions import (`uv sync --all-extras`).

## Running

```sh
uv run pytest                 # every notebook under tests/ and tutorials/
uv run coverage run -m pytest && uv run coverage combine && uv run coverage report   # fails below 100%
uv run python -m mbse.Expressions.Conformance.write   # regenerate ../conformance/python3
```

## Suites

| Notebook | Suite | Cases | Focus |
|---|---|---|---|
| `01_Expressions.ipynb` | EXP | 12 | Literals of every native type; operations with ordered arguments; variables and lets; `validate()` problems with paths, cycles, arities, unbound variables, `core`; create/clone/update and `OfAny` kind selection; Spec errors; the tagged meta-schemas and their registration; round trips through Plain, JSON and YAML; proxy-built snapshots with implied `used_by`; validation and comparison through the meta-schemas; builders through the visitor protocols; terms; `from_` reading lambdas and defs, and its refusals |
| `02_Evaluators.ipynb` | EVL | 7 | Evaluating literals, variables, lets, `get` and `has`; comparisons (three-valued, no coercion, NaN, -0.0, objects by identity); Kleene logic with short-circuiting; arithmetic in one type; evaluation errors vs `validate()`; the union's tag discriminators; one entry point per kind; `predicate` as mbse-schemas' validator evaluator, over embedded objects |
| `03_Visitors.ipynb` | VIS | 2 | Builders, builder parts and data conform to their `Visitors` protocols, on classes and on live instances |
| `04_Conformance.ipynb` | CONF | 4 | This implementation's corpus files are current; JSON is byte-identical to the other implementation's; every YAML reads back to the same snapshot, also under YAML 1.1; every JSON and YAML deserializes with `Expressions.Builders` and validates |
| `05_Framework.ipynb` | FRM | 8 | Every dialect, expression, builder, evaluator, translator, domain and signature implements its protocol; forms and `make` are inverses (slots, then variadic arguments), and `make`'s refusals; `walk`, `fold` and `same` (sharing, cycles, NaN, -0.0); derived meta-schemas, registration, discriminators and JSON/YAML round trips in every dialect; the builder DSL and its errors; validation by role (optional properties, kinds' own checks, imports' bindings, references that need no binding); domains, signatures and overloads; `infer` and its errors; the interpreter's errors; scopes |
| `06_Dialects.ipynb` | DIA | 8 | Python, Matlab and Excel: rendering (precedence, constants, quoting, imports), Python's parsing and its refusals, vocabularies, inference; Python's rules, and a scope's allowlists for imports, private attributes and calls, with NumPy evaluated vectorized and masked; MATLAB's conversions, short-circuits, strings and errors, and functions from imports, the path and packages; Excel's coercion, ordering across types, case-insensitive text and error values, and cells and add-ins from workbooks |
| `07_Translators.ipynb` | TRN | 6 | Rules, patterns and holes (declaration errors, specificity, repeated holes, rewriting within a dialect); all 12 directions round-trip; NumPy style, with its import added and imports elided; every route between two dialects gives the same expression; co-traversal keeps sharing, inlines lets with shadowing, traces, and refuses cycles; untranslatable forms name the node; translations evaluate alike where the dialects agree, and differ where they do not |

Total: 47 cases; the 25 of EXP, EVL, VIS and CONF have the same IDs in the same order in both implementations.
