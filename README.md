# mbse-expressions

Serializable expressions for [mbse-schemas](https://github.com/pitaman71/mbse-schemas), and their evaluation. An
expression, such as "65 or older, with an email address on file", is data with a schema: it can be stored with the
rest of your data, sent between programs, and evaluated the same way in Python and TypeScript.
[mbse-patterns](https://github.com/pitaman71/mbse-patterns) uses them as constraints on mbse-schemas data, and as queries.

```python
from mbse.Expressions import Evaluators, Expressions
from mbse.Expressions.Dialects import Python

senior = Python.Text.FromFunction(lambda contact: contact.age >= 65 and contact.email is not None)
Evaluators.OfAny(senior, {'contact': ada})   # True, False, or None when a value is unknown
```

```typescript
import { Evaluators, Expressions } from "@mbse/expressions";

const contact = Expressions.variable("contact");
const senior = contact.age.ge(65n).and_(contact.has("email"));
Evaluators.OfAny(senior, { contact: ada });
```

Like mbse-schemas, it has two equivalent implementations, in Python and TypeScript, with the same API, the same
messages and byte-identical JSON. Python imports it from `mbse.Expressions` (next to `mbse.Schemas`, in the shared `mbse`
namespace package), TypeScript from `@mbse/expressions` (next to `@mbse/schemas`).

## Getting started

mbse-expressions depends on [mbse-schemas](https://github.com/pitaman71/mbse-schemas), which lives beside it as a
sibling checkout. Clone this repository, then the siblings at the commits it pins (`siblings.json`):

```sh
git clone git@github.com:pitaman71/mbse-expressions.git
python3 mbse-expressions/scripts/siblings.py clone   # mbse-schemas, beside it, at its pinned commit
cd mbse-expressions
```

`clone` skips a sibling that is already there, so repositories cloned side by side by hand are used as they are.
A sibling it clones is checked out at its pinned commit, in detached HEAD; to change it, switch to a branch first
(`git -C ../mbse-schemas switch main`). `python3 scripts/siblings.py check` reports when it has moved past its
pinned commit, which is expected while developing; see `scripts/siblings.py help` for `check --strict` and `pin`.
`scripts/siblings.py` runs the tool kept in mbse-schemas (`../mbse-schemas/scripts/siblings.py`), cloning
mbse-schemas first if it is missing.

For parallel work (several agents, or several tasks at once), give each its own workspace: worktrees of this
repository and of its siblings, side by side, so that each installs its own siblings and none sees another's
half-finished changes. A worktree of this repository alone does not work, since its siblings would not be beside it.

```sh
python3 scripts/siblings.py workspace ../worktrees/a --branch a                     # this repository on a
python3 scripts/siblings.py workspace ../worktrees/b --branch b --edit mbse-schemas # and mbse-schemas too
python3 scripts/siblings.py land ../worktrees/b                                     # once done: merged, tagged, removed
python3 scripts/siblings.py push                                                    # then published, siblings first
python3 scripts/siblings.py remove ../worktrees/a                                   # or abandoned (branches are kept)
```

`land` fast-forwards each repository's checkout to its workspace branch, siblings before their dependents, tags each
new version `v<version>`, and removes the workspace and its merged branches. It refuses, before changing anything, a
branch that does not fast-forward, or a dependent that pins an edited sibling at another commit than its branch, so
that the pinned commits are the ones landed. `push` then pushes this repository and its siblings, siblings first, so
that every pinned commit is on its remote before the pin is; it pushes only what the remote lacks, so it is safe to
rerun. `land --push` does both.

Python (3.11+, managed with [uv](https://docs.astral.sh/uv/)); mbse-schemas is installed from the sibling:

```sh
cd python3
uv sync --all-extras
uv run pytest                  # test suites and the tutorials
```

TypeScript (Node 22 or later; with [nvm](https://github.com/nvm-sh/nvm), `nvm use` picks the version in `.nvmrc`).
`npm install` checks the siblings, links `@mbse/schemas` to the sibling checkout and installs its own dependencies:

```sh
cd typescript5
nvm use
npm install
npm test                       # type-check and run the test suites and the tutorials
```

## Documentation

| Read | For |
|---|---|
| [`python3/tutorials/`](python3/tutorials/README.md), [`typescript5/tutorials/`](typescript5/tutorials/README.md) | Eight case studies, from a rule written in code to the same rule in C and SystemVerilog: rules as data, unknowns, collections, value domains, partial evaluation, analysis and rewriting, translation, and C and SystemVerilog. Start here. |
| [`docs/EXPRESSIONS.md`](docs/EXPRESSIONS.md) | The design: the expression kinds, the core vocabulary, evaluation, meta-schemas and writers |
| [`docs/EQUIVALENCE.md`](docs/EQUIVALENCE.md) | How the two implementations are kept equivalent, and where they deliberately differ |
| [`AGENTS.md`](AGENTS.md), [`skills/mbse-expressions/`](skills/mbse-expressions/SKILL.md), [`llms.txt`](llms.txt) | Guidance for AI agents, layered so each loads only what its task needs. The skill also ships inside both packages |
| [`python3/tests/TestPlan.md`](python3/tests/TestPlan.md), [`typescript5/tests/TestPlan.md`](typescript5/tests/TestPlan.md) | The test suites |
| [`conformance/`](conformance/README.md) | The shared corpus both implementations must read and write identically |

## Repository layout

```
docs/                     the design (EXPRESSIONS.md) and how the implementations are kept equivalent (EQUIVALENCE.md)
python3/                  Python implementation: mbse/Expressions (Framework, Dialects, Translators), tests, tutorials
typescript5/              TypeScript implementation: src (Expressions, Evaluators), tests, tutorials
conformance/              snapshots each implementation writes; each must read the other's
skills/                   the agent skill (SKILL.md plus per-task references); skills/sync.sh copies it into both packages
```

## Dialects

Expressions come in dialects that implement one framework: each is serializable, traversable, validatable and
evaluatable, and pairwise translators convert between them. Basic, above, is the core vocabulary. Python (with NumPy
as a module it imports), Matlab, Excel and Latex (notation, without evaluation) model those languages' expressions, render as their source, resolve names,
imports and cell references as those languages do, and evaluate by their rules:

```python
from mbse.Expressions import Translators
from mbse.Expressions.Dialects.Excel import Expressions as Excel, Text as ExcelText

formula = Translators.between(Expressions.DIALECT, Excel.DIALECT).forward(senior)
ExcelText.ToText(formula)   # '=AND(contact.age >= 65, NOT(ISERROR(contact.email)))'
```

## Status

Built in both languages: the framework (protocols for expressions, domains, evaluation and translation), the Basic,
Python, Matlab, Excel and Latex dialects, and translators between every pair; in the Basic dialect, literals,
operations, variables and lets, with builders and meta-schemas; writers (and, in Python, `Python.Text.FromFunction`);
`validate()`; evaluation of the core operations with three-valued logic. Not built yet: the collection operations
(`count`, `in`, `all`, `any`), and the evaluator interface through which mbse-schemas will choose union branches and
check constraints.
