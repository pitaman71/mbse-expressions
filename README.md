# mbse-expressions

Serializable expressions for [mbse-schemas](https://github.com/pitaman71/mbse-schemas), and their evaluation. An
expression, such as "65 or older, with an email address on file", is data with a schema: it can be stored with the
rest of your data, sent between programs, and evaluated the same way in Python and TypeScript. mbse-schemas uses
expressions as union discriminators, and will use them for constraints.

```python
from mbse.Expressions import Evaluators, Expressions

senior = Expressions.from_(lambda contact: contact.age >= 65 and contact.email is not None)
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

mbse-schemas is a git submodule, so clone with it:

```sh
git clone --recurse-submodules git@github.com:pitaman71/mbse-expressions.git
```

Python (3.11+, managed with [uv](https://docs.astral.sh/uv/)); mbse-schemas is installed from the submodule:

```sh
cd python3
uv sync --all-extras
uv run pytest                  # test suites and the tutorial
```

TypeScript (Node 22 or later; with [nvm](https://github.com/nvm-sh/nvm), `nvm use` picks the version in `.nvmrc`).
`npm install` links `@mbse/schemas` to the submodule and installs the submodule's own dependencies:

```sh
cd typescript5
nvm use
npm install
npm test                       # type-check and run the test suites and the tutorial
```

## Documentation

| Read | For |
|---|---|
| [`python3/tutorials/`](python3/tutorials/README.md), [`typescript5/tutorials/`](typescript5/tutorials/README.md) | Rules as data: building, evaluating, saving, analyzing and rewriting expressions. Start here. |
| [`docs/EXPRESSIONS.md`](docs/EXPRESSIONS.md) | The design: the expression kinds, the core vocabulary, evaluation, meta-schemas and terms |
| [`docs/EQUIVALENCE.md`](docs/EQUIVALENCE.md) | How the two implementations are kept equivalent, and where they deliberately differ |
| [`python3/tests/TestPlan.md`](python3/tests/TestPlan.md), [`typescript5/tests/TestPlan.md`](typescript5/tests/TestPlan.md) | The test suites |
| [`conformance/`](conformance/README.md) | The shared corpus both implementations must read and write identically |

## Repository layout

```
submodules/mbse-schemas/  the framework this package depends on
docs/                     the design (EXPRESSIONS.md) and how the implementations are kept equivalent (EQUIVALENCE.md)
python3/                  Python implementation: mbse/Expressions (Expressions, Evaluators), tests, tutorial
typescript5/              TypeScript implementation: src (Expressions, Evaluators), tests, tutorial
conformance/              snapshots each implementation writes; each must read the other's
```

## Status

Built in both languages: literals, operations, variables and lets, with builders and meta-schemas; terms (and, in
Python, `Expressions.from_`); `validate()`; evaluation of the core operations with three-valued logic. Not built yet:
the collection operations (`count`, `in`, `all`, `any`), and the evaluator interface through which mbse-schemas will
choose union branches and check constraints.
