<!-- nav -->
[← Why the mbse repositories exist](../../MBSE.md) · [Home](../../README.md) · [1 · Values and their domains →](01_Values_And_Their_Domains.ipynb)

# Tutorial: expressions as models, then constraints as data

This tutorial teaches mbse-expressions in two parts, one notebook each step of the way, each building on the ones
before it. Part I shows how values, their domains and each language's expressions are modeled, from a single literal
up: what `42` is in Python, TypeScript, C and SystemVerilog, and how each language's own text corresponds to the model
its dialect holds. Part II solves real problems with constraints, through one story: a cold chain, in which vaccine
shipments must stay between 2 and 8 °C, and the same constraints are applied by a QA spreadsheet, a Python pipeline, a
dashboard, a logger's firmware and its FPGA.

It's written for Python programmers who keep constraints about their data, or model code, in more than one language. A
TypeScript port with the same notebooks, the same steps and the same outputs is in the [TypeScript
tutorial](../../typescript5/tutorials/README.md). You don't need mbse-schemas' tutorial first; mbse-patterns' tutorial
builds validation, queries and test data on these expressions. mbse-basis
[FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md), with its capabilities, is the reference for everything here.

## Running the notebooks

```sh
cd python3
uv sync --all-extras
uv run --with jupyterlab jupyter lab tutorials/   # or open them in VS Code with the project's .venv as the kernel
```

Each notebook runs top to bottom in a fresh kernel. They're committed with their outputs, so you can just read them;
`uv run pytest tutorials` runs them all as tests. `toolkit.py` holds what the notebooks share: `dialects()`, a store
with every dialect installed and defined, which Part I starts from; the cold chain's schemas (its `install`) and
`cold_chain()`, a store of them that also holds expressions, with the framework's and every dialect's kinds installed
but TypeScript5's, Patterns' operations and C's, C++'s, the ABIs' and SystemVerilog's types defined, which Part II
starts from; and `show`, which writes a Patterns expression as text (case study 13 explains it).

## Part I · Expressions as models

Each step pairs a language's own text with the model its dialect holds, written in the builders' fluent calls, and
checks that the dialect's `Text.ToText` gives that text back; Python3's text is also read, with `Text.FromText`. Part I
tells no story. Tutorial 7 comes after the dialects' retrofit.

| # | Notebook | What you learn |
|---|---|---|
| 1 | [Values and their domains](01_Values_And_Their_Domains.ipynb) | A domain is data: the standard dialects' domains, kinds, parameters, inferred properties, schemas and editions |
| 2 | [One value, a domain in each language](02_One_Value_A_Domain_In_Each_Language.ipynb) | `42` as Python's `int`, TypeScript's `number`, C's `int` under each ABI, SystemVerilog's `integer` and `int` |
| 3 | [The smallest expression, a literal](03_The_Smallest_Expression_A_Literal.ipynb) | A term in its holder; a literal in each language, printed, read, inferred, evaluated; what no scalar holds |
| 4 | [Names](04_Names.ipynb) | A variable in each language; free names; names kept as written |
| 5 | [Operators](05_Operators.ipynb) | `a + b * c` as a tree; parentheses and precedence across languages; operations as data; each language's arithmetic |
| 6 | [Calls, members and subscripts](06_Calls_Members_And_Subscripts.ipynb) | Properties, items and calls in each language, and what has no counterpart |
| 7 | Bindings | `let`, lambdas, quantifiers and comprehensions, each a variation of `let` (after the dialects' retrofit) |
| 8 | [Sublanguages](08_Sublanguages.ipynb) | Types, patterns, assertions, constraints and preprocessors as dialects of their own, each with its holder, held where its language's expressions put one |

## Part II · Constraints as data, in seven case studies

They start where a programmer starts, with a constraint written in code, and end with that constraint running in six
languages.

| # | Notebook | The problem | What you learn |
|---|---|---|---|
| 9 | [Constraints as data](09_Constraints_As_Data.ipynb) | One constraint, four hand-written copies in four languages | Writing a constraint with writers, as an expression in a store; evaluating it; the core vocabulary; validating; saving and loading |
| 10 | [Answers you can trust](10_Answers_You_Can_Trust.ipynb) | A logger that never reported: neither true nor false | Unknown; `has`; Kleene's logic; deciding what unknown means; no coercion; what raises |
| 11 | [Constraints over collections](11_Constraints_Over_Collections.ipynb) | Every reading, not just the last; every logger's battery | Collections; `count`, `item`, `max` and friends; quantifiers; empty collections; an object's related objects; lists and mappings built from terms |
| 12 | [Deciding what you can now](12_Deciding_What_You_Can_Now.ipynb) | A constraint per product; a question that waits on the clock | Partial evaluation; templates; residuals; how Kleene's logic simplifies; lets of known values |
| 13 | [Analyzing and rewriting constraints](13_Analyzing_And_Rewriting_Constraints.ipynb) | Which constraints read a property; one way to write each constraint | Forms; `walk`, `fold`, `same` and `free`; rewriting with patterns and holes |
| 14 | [One constraint, many languages](14_One_Constraint_Many_Languages.ipynb) | The constraint in Excel, Python, MATLAB and LaTeX | Dialects and translators; each language's own evaluation; reading constraints back; scopes as allowlists |
| 15 | [Constraints for firmware and hardware](15_Constraints_For_Firmware_And_Hardware.ipynb) | A packet constraint in C and SystemVerilog | C's widths, promotions and undefined behavior; `x` and `z`; what has no counterpart |

A case study on values with widths (a radio packet's `int16_t` and `uint8_t` members: typed literals, overflow, bits,
conversions) is deferred. A term carries no domain yet: whatever owns a constraint's root gives its schema, and giving
each term a domain, domain inference, is a later capability
([CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)).
When it lands, its steps join tutorials 2, 3 and 15, numbered after their last. Domains themselves are data meanwhile,
as Part I shows: the standard dialects (ISO/IEC 11404, IEEE 754, IEEE 1164, Unicode) own them by name, and each one's
schema is a named `Schemas.OfAny` of the scalar it narrows.

---

<!-- nav -->
[← Why the mbse repositories exist](../../MBSE.md) · [Home](../../README.md) · [1 · Values and their domains →](01_Values_And_Their_Domains.ipynb)
