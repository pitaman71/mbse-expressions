# Guide for AI agents

mbse-expressions formalizes what interfaces and models require, their constraints, as neutral,
language-independent data: expressions with schemas, built on
[mbse-schemas](https://github.com/pitaman71/mbse-schemas). An expression can be stored, validated, evaluated, and
translated between expression languages (dialects): Patterns (formerly Basic), the core vocabulary that every binding
evaluates, and Python3, Matlab, Excel, Latex, C, Cpp and SystemVerilog. Two equivalent implementations exist: `python3/` and `typescript5/`.

## Start here

| You want to | Read |
|---|---|
| Know why the mbse repositories exist, and this one's part in them | [MBSE.md](MBSE.md) |
| Use the library: write, evaluate, store or translate constraints | [skills/mbse-expressions/SKILL.md](skills/mbse-expressions/SKILL.md), a skill. It loads its references only as needed |
| Learn it by example, from a first constraint to C and SystemVerilog | [python3/tutorials/README.md](python3/tutorials/README.md), seven case studies (the fourth deferred); the same in [typescript5/tutorials/](typescript5/tutorials/README.md) |
| Understand a design decision or an open question | mbse-basis [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) and its capabilities' detail files |
| Change the framework, a dialect or a translator | this file, then [docs/EQUIVALENCE.md, Deliberate differences](docs/EQUIVALENCE.md#deliberate-differences) |
| Find or add a test case | [python3/tests/TestPlan.md](python3/tests/TestPlan.md) (TypeScript's plan lists only its differences) |
| Model the data the constraints refer to | [mbse-schemas' AGENTS.md](https://github.com/pitaman71/mbse-schemas/blob/main/AGENTS.md), in the sibling checkout |

## Read before any work

Agents must read these mbse-basis documents before doing any work:

- [The mbse basis](https://github.com/pitaman71/mbse-basis/blob/main/docs/README.md)
- [Principles](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md)
- [Features](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/README.md)
- [Capabilities](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/README.md)

These may be read selectively, on demand: [Vocabulary](https://github.com/pitaman71/mbse-basis/blob/main/docs/VOCABULARY.md) and
[Qualities](https://github.com/pitaman71/mbse-basis/blob/main/docs/QUALITIES.md).

Never write to `~/.claude/projects/*/memory/` or any hidden memory: what is worth keeping goes in the repository.

Resolve a link written `mbse:<repo>/<path>`, as skills and source comments write a link into another mbse
repository, to the first of these that exists: in a polyrepo checkout, `<repo root>/../<repo>/<path>`, where `<repo
root>` is this repository's root; for a link into the installed package's own repository, `<path>` without its
language directory (`python3/` or `typescript5/`), under the installed package's root (Python: the `site-packages`
directory that holds `mbse/`; npm: the package's directory), where the package ships that file; otherwise
`https://github.com/pitaman71/<repo>/blob/main/<path>`.

## Commands

```sh
python3 ../mbse-basis/scripts/polyrepo.py clone # mbse-schemas, beside this repository, at its pinned commit
python3 ../mbse-basis/scripts/polyrepo.py check # the siblings are present and compatible with siblings.json
cd python3 && uv sync --all-extras              # Python: use uv, never pip
uv run coverage run -m pytest && uv run coverage combine && uv run coverage report
uv run python -m mbse.Expressions.Conformance.write

cd typescript5 && nvm use && npm install        # TypeScript: Node 22 or later
npm run coverage                                # type-checks, runs every notebook, gates at 100%
npm run conformance

python3 ../mbse-basis/scripts/update_doc_links.py  # after adding, renaming or retitling a document
skills/sync.sh                                  # after editing skills/mbse-expressions/: the packaged copies (SKL-01)
```

## Related repositories

- [mbse-schemas](https://github.com/pitaman71/mbse-schemas): the schemas expressions are stored with and refer to. It is
  a sibling checkout, `../mbse-schemas`, pinned by version and commit in `siblings.json` (see mbse-basis'
  `scripts/polyrepo.py`).
