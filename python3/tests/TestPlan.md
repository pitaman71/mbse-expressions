# Test plan — python3

Scope: everything under `python3/mbse_expressions` (Expressions, Evaluators) and cross-implementation conformance. The
design reference is `../../docs/EXPRESSIONS.md`; this plan and the TypeScript one mirror each other case for case. The
framework itself is tested in mbse-schemas.

## Running

```sh
uv run pytest                 # every notebook under tests/ and tutorials/
uv run coverage run -m pytest && uv run coverage combine && uv run coverage report   # fails below 100%
uv run python -m mbse_expressions.Conformance.write   # regenerate ../conformance/python3
```

## Suites

| Notebook | Suite | Cases | Focus |
|---|---|---|---|
| `01_Expressions.ipynb` | EXP | 12 | Literals of every native type; operations with ordered arguments; variables and lets; `validate()` problems with paths, cycles, arities, unbound variables, `core`; create/clone/update and `OfAny` kind selection; Spec errors; the tagged meta-schemas and their registration; round trips through Plain, JSON and YAML; proxy-built snapshots with implied `used_by`; validation and comparison through the meta-schemas; builders through the visitor protocols; terms; `from_` reading lambdas and defs, and its refusals |
| `02_Evaluators.ipynb` | EVL | 6 | Evaluating literals, variables, lets, `get` and `has`; comparisons (three-valued, no coercion, NaN, -0.0, objects by identity); Kleene logic with short-circuiting; arithmetic in one type; evaluation errors vs `validate()`; the union's tag discriminators; one entry point per kind |
| `03_Visitors.ipynb` | VIS | 2 | Builders, builder parts and data conform to their `Visitors` protocols, on classes and on live instances |
| `04_Conformance.ipynb` | CONF | 4 | This implementation's corpus files are current; JSON is byte-identical to the other implementation's; every YAML reads back to the same snapshot, also under YAML 1.1; every JSON and YAML deserializes with `Expressions.Builders` and validates |

Total: 24 cases, with the same IDs in the same order in both implementations.
