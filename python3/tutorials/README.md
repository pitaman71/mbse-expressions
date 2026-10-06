<!-- nav -->
[← Why the mbse repositories exist](../../MBSE.md) · [Home](../../README.md) · [1 · Constraints as data →](01_Constraints_As_Data.ipynb)

# Tutorial: constraints as data, in eight case studies

This tutorial teaches mbse-expressions by solving real problems, one per notebook, each building on the ones before
it. They follow one story: a cold chain, in which vaccine shipments must stay between 2 and 8 °C, and the same
constraints are applied by a QA spreadsheet, a Python pipeline, a dashboard, a logger's firmware and its FPGA. It starts
where a programmer starts, with a constraint written in code, and ends with that constraint running in six languages.

It's written for Python programmers who keep constraints about their data in more than one place or language. A
TypeScript port with the same case studies and the same outputs is in the [TypeScript
tutorial](../../typescript5/tutorials/README.md). You don't need mbse-schemas' tutorial first; mbse-patterns' tutorial
builds validation, queries and test data on these expressions. The [design document](../../docs/EXPRESSIONS.md) is the
reference for everything here.

## Running the notebooks

```sh
cd python3
uv sync --all-extras
uv run --with jupyterlab jupyter lab tutorials/   # or open them in VS Code with the project's .venv as the kernel
```

Each notebook runs top to bottom in a fresh kernel. They're committed with their outputs, so you can just read them;
`uv run pytest tutorials` runs them all as tests. `toolkit.py` holds the cold chain's schemas, `cold_chain()`, a store
of them, and `show`, which writes an expression as text (case study 6 explains it).

## The case studies

| # | Notebook | The problem | What you learn |
|---|---|---|---|
| 1 | [Constraints as data](01_Constraints_As_Data.ipynb) | One constraint, four hand-written copies in four languages | Writing a constraint (`FromFunction`, writers); evaluating it; the core vocabulary; validating; saving and loading |
| 2 | [Answers you can trust](02_Answers_You_Can_Trust.ipynb) | A logger that never reported: neither true nor false | Unknown; `has`; Kleene's logic; deciding what unknown means; no coercion; what raises |
| 3 | [Constraints over collections](03_Constraints_Over_Collections.ipynb) | Every reading, not just the last; every logger's battery | Collections; `count`, `item`, `max` and friends; quantifiers; empty collections; an object's related objects |
| 4 | [Values with widths](04_Values_With_Widths.ipynb) | A radio packet of `int16_t` and `uint8_t` fields | Value domains; typed values and literals; inference; overflow; bits; conversions; domains on the wire |
| 5 | [Deciding what you can now](05_Deciding_What_You_Can_Now.ipynb) | A constraint per product; a question that waits on the clock | Partial evaluation; templates; residuals; how Kleene's logic simplifies; lets of known values |
| 6 | [Analyzing and rewriting constraints](06_Analyzing_And_Rewriting_Constraints.ipynb) | Which constraints read a property; one way to write each constraint | Forms; `walk`, `fold`, `same` and `free`; rewriting with patterns and holes |
| 7 | [One constraint, many languages](07_One_Constraint_Many_Languages.ipynb) | The constraint in Excel, Python, MATLAB and LaTeX | Dialects and translators; each language's own evaluation; reading constraints back; scopes as allowlists |
| 8 | [Constraints for firmware and hardware](08_Constraints_For_Firmware_And_Hardware.ipynb) | The packet constraint in C and SystemVerilog | C's promotions and undefined behavior; sized literals; `x` and `z`; what has no counterpart |

---

<!-- nav -->
[← Why the mbse repositories exist](../../MBSE.md) · [Home](../../README.md) · [1 · Constraints as data →](01_Constraints_As_Data.ipynb)
