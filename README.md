<!-- nav -->
[Why the mbse repositories exist →](MBSE.md)

# mbse-expressions

`mbse-expressions` makes a specification's constraints data: what an interface requires is written once, as
expressions, instead of once per spreadsheet, document and implementation language. A constraint can start partly
formalized and be tightened as the design matures; it is checked alike in Python and TypeScript and translated into
each implementation language, from Excel and MATLAB to C and SystemVerilog. It is the constraints layer of the mbse
repositories' [executable specifications](MBSE.md).

Serializable expressions for [mbse-schemas](https://github.com/pitaman71/mbse-schemas), and their evaluation. An
expression, such as "65 or older, with an email address on file", is data with a schema: it can be stored with the
rest of your data, sent between programs, and evaluated the same way in Python and TypeScript.
[mbse-patterns](https://github.com/pitaman71/mbse-patterns) uses them as constraints on mbse-schemas data, and as queries.

```python
from mbse.Expressions import Framework
from mbse.Expressions.IEEE1164 import Expressions as IEEE1164
from mbse.Expressions.IEEE754 import Expressions as IEEE754
from mbse.Expressions.ISOIEC11404 import Expressions as ISOIEC11404
from mbse.Expressions.Patterns import Expressions as Patterns
from mbse.Expressions.Patterns.Expressions import Evaluators, Expressions
from mbse.Expressions.Unicode import Expressions as Unicode
from mbse.Schemas.Framework import Builders

store = Builders.Store()  # expressions are stored in an mbse-schemas store, with the data they constrain
for module in (Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns):  # the standard dialects first
    store.transaction(module.install)
store.transaction(Patterns.define)  # Patterns' operations, which validation reads
contact = Expressions.variable("contact")
with store.transaction():
    senior = store.Expressions.Patterns.Expressions.Expression(lambda e: e.root(
        contact.age.ge(65).and_(contact.has("email"))))
Evaluators.OfAny(senior, {'contact': ada})   # True, False, or None when a value is unknown
```

```typescript
import { Framework } from "@mbse/expressions";
import * as IEEE1164 from "@mbse/expressions/IEEE1164/Expressions";
import * as IEEE754 from "@mbse/expressions/IEEE754/Expressions";
import * as ISOIEC11404 from "@mbse/expressions/ISOIEC11404/Expressions";
import * as Patterns from "@mbse/expressions/Patterns/Expressions";
import { Evaluators, Expressions } from "@mbse/expressions/Patterns/Expressions";
import * as Unicode from "@mbse/expressions/Unicode/Expressions";
import { Builders } from "@mbse/schemas/Framework";

const store: any = new Builders.Store(); // expressions are stored in an mbse-schemas store, with the data they constrain
for (const module of [Framework, ISOIEC11404, IEEE754, IEEE1164, Unicode, Patterns]) store.transaction(module.install);
store.transaction(Patterns.define); // Patterns' operations, which validation reads
const contact = Expressions.variable("contact");
const senior = store.transaction(() => store.Expressions.Patterns.Expressions.Expression((e: any) => e.root(
  contact.age.ge(65n).and_(contact.has("email")))));
Evaluators.OfAny(senior, { contact: ada });
```

Like mbse-schemas, it has two equivalent implementations, in Python and TypeScript, with the same API, the same
messages and byte-identical JSON. Python imports it from `mbse.Expressions` (next to `mbse.Schemas`, in the shared `mbse`
namespace package), TypeScript from `@mbse/expressions` (next to `@mbse/schemas`). The package exports the framework
alone; each dialect is imported from its own path (`mbse.Expressions.Patterns.Expressions`,
`@mbse/expressions/Patterns/Expressions`).

## Getting started

mbse-expressions depends on [mbse-schemas](https://github.com/pitaman71/mbse-schemas), which lives beside it as a
sibling checkout. Clone mbse-basis, which keeps the tool, and this repository, then the siblings at the commits it pins
(`siblings.json`):

```sh
git clone git@github.com:pitaman71/mbse-basis.git
git clone git@github.com:pitaman71/mbse-expressions.git
cd mbse-expressions
python3 ../mbse-basis/scripts/polyrepo.py clone # mbse-schemas, beside it, at its pinned commit
```

`clone` skips a sibling that is already there, so repositories cloned side by side by hand are used as they are. A
sibling it clones is checked out at its pinned commit, in detached HEAD; to change it, switch to a branch first
(`git -C ../mbse-schemas switch main`). `python3 ../mbse-basis/scripts/polyrepo.py check` reports when it has moved past
its pinned commit, which is expected while developing; see `polyrepo.py help` for `check --strict` and `pin`. The tool
is kept in mbse-basis, as `scripts/polyrepo.py`.

For parallel work (several agents, or several tasks at once), give each its own workspace
([PRI-029: parallel work in polyrepo workspaces](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-029)).

```sh
python3 ../mbse-basis/scripts/polyrepo.py workspace ../worktrees/a --branch a                     # this repository on a
python3 ../mbse-basis/scripts/polyrepo.py workspace ../worktrees/b --branch b --edit mbse-schemas # and mbse-schemas too
python3 ../mbse-basis/scripts/polyrepo.py land ../worktrees/b                                     # once done: merged, tagged, removed
python3 ../mbse-basis/scripts/polyrepo.py push                                                    # then published, siblings first
python3 ../mbse-basis/scripts/polyrepo.py remove ../worktrees/a                                   # or abandoned (branches are kept)
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
| [Python tutorial](python3/tutorials/README.md), [TypeScript tutorial](typescript5/tutorials/README.md) | Seven case studies (the fourth, on values with widths, deferred until domain inference), from a constraint written in code to the same constraint in C and SystemVerilog: constraints as data, unknowns, collections, partial evaluation, analysis and rewriting, translation, and C and SystemVerilog. Start here. |
| mbse-basis [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) | The design, as its capabilities' detail files: the Patterns dialect's (formerly Basic) terms and core vocabulary, three-valued evaluation, collections, value domains, the framework, partial evaluation, the dialects and the translators, and open questions |
| [Equivalence](docs/EQUIVALENCE.md) | How the two implementations are kept equivalent, and where they deliberately differ |
| [Guide for AI agents](AGENTS.md), [Agent skill](skills/mbse-expressions/SKILL.md), [Summary for LLMs](llms.txt) | Guidance for AI agents, layered so each loads only what its task needs. The skill, written once and mostly language-independent, links each how to its case in both languages' notebooks, and also ships inside both packages |
| [Python test plan](python3/tests/TestPlan.md), [TypeScript test plan](typescript5/tests/TestPlan.md) | The test suites |
| [Conformance corpus](conformance/README.md) | The shared corpus both implementations must read and write identically |

## Repository layout

```
docs/                     how the implementations are kept equivalent (EQUIVALENCE.md); the design is mbse-basis FEA-024's
python3/                  Python implementation: mbse/Expressions (Framework, each dialect under its family, Translators),
                          tests, tutorials
typescript5/              TypeScript implementation: src (Framework, each dialect under its family, Translators), tests,
                          tutorials
conformance/              snapshots each implementation writes; each must read the other's
skills/                   the agent skill (SKILL.md plus per-task references, linking the notebooks' cases); skills/sync.sh
                          copies it into both packages
```

## Dialects

Expressions come in dialects that implement one framework: each is serializable, traversable, validatable and
evaluatable, and pairwise translators convert between them. A term is a value of `Expressions.Framework.Term`, the union of
the dialects' `Term`s: written with its dialect, then its kind. Patterns (formerly Basic), above, is the core vocabulary.
Python3 (every expression of Python 3, 3.0 to 3.15, as CPython's `ast` has it, with NumPy as a module it imports), MATLAB,
Excel and LaTeX (notation, without evaluation) model those languages' expressions, render as their source, resolve names, imports and cell references as those languages do, and
evaluate by their rules; C and Cpp (every expression of C11 to C23 and of C++17 to C++23, with their type names, each
with its own copy of the kinds they share) and SystemVerilog model those languages' expressions over their own types:

```python
from mbse.Expressions import Translators
from mbse.Expressions.Excel.Expressions import Expressions as Excel, Text as ExcelText

formula = Translators.between(Expressions.DIALECT, Excel.DIALECT).forward(senior)
ExcelText.ToText(formula)   # '=AND(contact.age >= 65, NOT(ISERROR(contact.email)))'
```

Each dialect lives under its family, at `Expressions.<Family>.<Dialect>`: `Python.Python3`,
`TypeScript.TypeScript5`, and `Patterns.Expressions`, `C.Expressions`, `Cpp.Expressions`,
`SystemVerilog.Expressions`, `MATLAB.Expressions`, `Excel.Expressions` and `LaTeX.Expressions`, and the standard
dialects `ISOIEC11404.Expressions`, `IEEE754.Expressions`, `IEEE1164.Expressions` and `Unicode.Expressions`, and the ABI
dialects `SystemV.AMD64` and `Arm.AAPCS64`, which hold the C and C++ types those languages' standards leave to the
implementation, read under the ABI the expression holding a C or C++ term names. Its schemas
(`Expressions.C.Expressions.Term`), its Python package (`mbse.Expressions.C.Expressions`) and its TypeScript module
(`@mbse/expressions/C/Expressions`) are named by that path.

## Status

Built in both languages: the framework (protocols for expressions, domains, evaluation and translation), the Patterns,
Python3, TypeScript5, MATLAB, Excel, LaTeX, C and Cpp dialects and SystemVerilog's six, each with its `Term`, the union of its kinds, in the
framework's union of the dialects' `Term`s, and translators between them; terms as values in an mbse-schemas store, with the container
constructors `list` and `mapping`, literals holding any value with their spelling, and the kinds of invalid syntax
`error` and `missing`; dialects, their operations and their
domains as data (each dialect a singleton that names its operations, each an expression schema, owns its domains by
name, and covers the editions of its standards; the published standards that define kinds of domain, ISO/IEC 11404,
IEEE 754, IEEE 1164 and Unicode, dialects of their own); writers; `validate()`, which refuses a
call to an operation the dialect does not define; evaluation with
three-valued logic over values by the schemas they are written with, collections and quantifiers. Released in 0.8.0,
on mbse-schemas 0.26.10: stages 1 to 5 of the complete dialects ([CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md))
and the namespace rename (`Expressions.<Family>.<Dialect>`; the old `Dialects` names are gone, with no alias): stage 2,
the framework and the renames; stage 3, `Python3` complete over Python 3's expressions
([CAP-227: the Python3 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-227.md)), printed in both languages, read by
`FromText` in Python and checked against `ast`'s node list; its evaluator stays shallow; and stage 4, `TypeScript5`, new,
over TypeScript 5's expressions with its types, destructuring patterns and JSX
([CAP-228: the TypeScript5 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-228.md)), printed in both languages and
checked against typescript-estree's node types; it evaluates its literals alone, and has no translator yet; and stage 5,
`C` and `Cpp` complete over C's and C++'s expressions with the type names they hold
([CAP-229: the C expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-229.md),
[CAP-230: the C++ expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-230.md)), printed in both languages and checked
against tree-sitter-c's and tree-sitter-cpp's node types; their evaluators keep what C evaluated, over its arithmetic
types, and every dialect's `Type` and `Pattern` hold invalid syntax. Released in 0.9.0, on mbse-schemas 0.26.10:
domains as data ([CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md)): one form of a domain, the stored
one, every dialect's domains but LaTeX's written by its `define`, only for the types its standard defines, of kinds the
standards' own dialects hold or its own; Patterns' code domains and C's, C++'s and SystemVerilog's code type tables
gone; a term that reads stored data read within the expression that holds it, so that a lone term is refused; C and C++
read under the ABI their expression names, `SystemV.AMD64` or `Arm.AAPCS64`
([CAP-267: C and C++ terms read under the ABI their holder names](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-267.md)); and standards as tagged data
([CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md)). The package root exports `Framework` alone, and Patterns is
`Expressions.Patterns.Expressions`. Built for 0.10.0, not yet released: stage 6, `SystemVerilog` complete over IEEE
1800-2023, Verilog its subset ([CAP-231: the SystemVerilog expression dialect, complete](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-231.md)),
six dialects of one family, its expressions and its types, patterns, assertions, constraints and preprocessor, each
reading the others' terms, printed in both languages, recording the IEEE editions that have its kinds, and checked
against slang's syntax kinds; a kind may hold several lists of terms; its evaluator keeps what it evaluated. Coming in
0.10.0 too: the retrofit of the other dialects (type, pattern, regex and preprocessor dialects, binding kinds as
variations of `let`). Not built yet: domain
inference, which giving terms domains (widths, overflow, IEEE 754 formats, conversions) waits for, and the evaluator
interface through which mbse-schemas will choose union branches and check constraints.

---

<!-- nav -->
[Why the mbse repositories exist →](MBSE.md)
