# Guide for AI agents

mbse-expressions formalizes what interfaces and models require, their constraints, as neutral,
language-independent data: expressions with schemas, built on
[mbse-schemas](https://github.com/pitaman71/mbse-schemas). An expression can be stored, validated, evaluated, and
translated between expression languages (dialects): Patterns (formerly Basic), the core vocabulary that every binding
evaluates, and Python3, TypeScript5, MATLAB, Excel, LaTeX, C, Cpp and SystemVerilog. Two equivalent implementations exist: `python3/` and `typescript5/`.

## Start here

| You want to | Read |
|---|---|
| Know why the mbse repositories exist, and this one's part in them | [Why the mbse repositories exist](MBSE.md) |
| Use the library: write, evaluate, store or translate constraints | The skill, written once: [its source](skills/mbse-expressions/SKILL.md), packaged in each language as [the Python copy](python3/mbse/Expressions/skill/SKILL.md) and [the TypeScript copy](typescript5/skill/SKILL.md). Each practice links its case in each language's tutorials or tests; it loads its references only as needed |
| Learn it by example: how values, domains and each language's expressions are modeled, then constraints from a first one to C and SystemVerilog | [Tutorial: expressions as models, then constraints as data](python3/tutorials/README.md): Part I, expressions as models (tutorials 1 to 6; 7 and 8 after the dialects' retrofit), and Part II, seven case studies on constraints (9 to 15); the same in [typescript5/tutorials/](typescript5/tutorials/README.md) |
| Understand a design decision or an open question | mbse-basis [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) and its capabilities' detail files |
| Change the framework, a dialect or a translator | this file, then [docs/EQUIVALENCE.md, Deliberate differences](docs/EQUIVALENCE.md#deliberate-differences) |
| Find or add a test case | [Test plan — python3](python3/tests/TestPlan.md) (TypeScript's plan lists only its differences) |
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

The skill is written once, in `skills/mbse-expressions/`, mostly language-independent (mbse-basis
[PRI-016: guidance written once](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-016)): each practice says why, when and how, links the items for what, and links each how
to its case in both languages, as `mbse:` links with a `#Tnn.k` anchor (a tutorial step) or a test's case ID. It holds
no programs and no per-language cheat sheets. `skills/sync.sh` copies it byte for byte into
`python3/mbse/Expressions/skill/` and `typescript5/skill/`; SKL-01 checks the copies in both suites, and SKL-03 that
every case it links has its `<a id>` in both languages, but for the cases
[Equivalence of the implementations](docs/EQUIVALENCE.md#cases-in-one-language-only) lists as one language's only (none yet). Each
tutorial step's markdown cell starts with `<a id="Tnn.k"></a>`, and each test case's with `<a id="ID"></a>`, the same in
both languages. A how the skill teaches with no case is a bug, since it is untested
([the basis](https://github.com/pitaman71/mbse-basis/blob/main/docs/README.md#the-doc-spec)): write the case, in both languages, before linking it.
SKL-04 finds such gaps: each section of the skill (a `##` or `###` heading and its text) links a case in each
language, or, where it teaches no how (an introduction, a routing table, links to go deeper), says why on the line
after its heading, as `<!-- no case: reason -->`; a section whose subsections each pass passes.

## Related repositories

- [mbse-schemas](https://github.com/pitaman71/mbse-schemas): the schemas expressions are stored with and refer to. It is
  a sibling checkout, `../mbse-schemas`, pinned by version and commit in `siblings.json` (see mbse-basis'
  `scripts/polyrepo.py`).
