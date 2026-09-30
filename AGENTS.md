# Guide for AI agents

mbse-expressions formalizes the rules of interfaces and models (predicates, constraints, derived values) as neutral,
language-independent data: expressions with schemas, built on
[mbse-schemas](https://github.com/pitaman71/mbse-schemas). An expression can be stored, validated, evaluated, and
translated between expression languages (dialects): Basic, the core vocabulary that every binding
evaluates, and Python, Matlab, Excel and Latex. Two equivalent implementations exist: `python3/` and `typescript5/`.

## Start here

| You want to | Read |
|---|---|
| Use the library: write, evaluate, store or translate rules | [skills/mbse-expressions/SKILL.md](skills/mbse-expressions/SKILL.md), a skill. It loads its references only as needed |
| Understand a design rule or an open question | [docs/EXPRESSIONS.md](docs/EXPRESSIONS.md), by section |
| Change the framework, a dialect or a translator | this file, then [docs/EQUIVALENCE.md, Deliberate differences](docs/EQUIVALENCE.md#deliberate-differences) |
| Find or add a test case | [python3/tests/TestPlan.md](python3/tests/TestPlan.md) (TypeScript's plan lists only its differences) |
| Model the data the rules refer to | [mbse-schemas' AGENTS.md](submodules/mbse-schemas/AGENTS.md), in the submodule |

## Invariants when changing code

- **The two implementations are equivalent.** Change both in the same commit, with the same names, the same error
  classes and byte-identical messages. JSON output must be byte-identical: regenerate the corpora and let CONF-02
  compare them, and add a corpus case for a new dialect. A difference not listed in `docs/EQUIVALENCE.md` is a bug.
- **Tests are Jupyter notebooks**, one suite per notebook, with the same case IDs in the same order in both
  languages. Each case is a markdown cell `## ID · title` followed by one code cell. Notebooks are JSON written with
  `indent=1`, `sort_keys=True` and `ensure_ascii=False`.
- **Coverage is 100%** in both languages (statements and branches; in TypeScript also functions and lines). Close a gap
  with an assertion in the shared case, in both suites. The TypeScript evaluator of Python expressions models Python's
  rules: check new behavior with DIA-02's tables, which the Python suite runs against Python itself.
- **Expressions from data must stay safe.** Evaluators reach only what their scope provides: never import, load or call
  anything the caller did not allowlist.
- **The skill is packaged with each implementation.** After editing `skills/mbse-expressions/`, run `skills/sync.sh`;
  SKL-01 fails until the copies match. Every fenced block tagged `python` or `typescript` in the skill is a complete
  program that SKL-02 runs; tag fragments `python fragment` or `typescript fragment`.
- **Behavior is decided in `docs/EXPRESSIONS.md`.** Record new decisions under Resolved, and put what stays undecided
  under Open questions.

## Commands

```sh
git submodule update --init                  # mbse-schemas, which both implementations install from the submodule
cd python3 && uv sync --all-extras           # Python: use uv, never pip
uv run coverage run -m pytest && uv run coverage combine && uv run coverage report
uv run python -m mbse.Expressions.Conformance.write

cd typescript5 && nvm use && npm install     # TypeScript: Node 22 or later
npm run coverage                             # type-checks, runs every notebook, gates at 100%
npm run conformance
```

## Related repositories

- [mbse-schemas](https://github.com/pitaman71/mbse-schemas): the schemas expressions are stored with and refer to. It
  is a git submodule here, at `submodules/mbse-schemas`.
