# Equivalence of the implementations

`python3/` and `typescript5/` implement the same package, and follow mbse-schemas' rules for equivalence
([`EQUIVALENCE.md`](../submodules/mbse-schemas/docs/EQUIVALENCE.md)): the same API and messages, byte-identical JSON,
interchangeable data, the same test cases under the same IDs, and full coverage in both. This document covers what is
specific to this package: the framework, the Basic, Python, Matlab, Excel and Latex dialects, and the translators
between them.

## How it is checked

| Check | Where |
|---|---|
| Every test case exists in both implementations, same ID, same order | `python3/tests/*.ipynb`, `typescript5/tests/*.ipynb` |
| API conformance to the visitor protocols and the framework's protocols, on classes and on live instances | VIS-01, VIS-02, FRM-01 |
| JSON is byte-identical, for a case of every dialect; YAML and JSON are interchangeable | the CONF suite over the shared corpus in `conformance/` |
| The agent guides are current, their programs run in each language, and their links resolve | the SKL suite |
| The TypeScript model of Python's rules gives what Python gives | DIA-02's tables of values and errors, which the Python suite runs against Python itself |
| Full code coverage in both | the coverage gates below |

## Coverage

| | Python | TypeScript |
|---|---|---|
| Command | `uv run coverage run -m pytest && uv run coverage combine && uv run coverage report` | `npm run coverage` |
| Required | 100% of statements and branches | 100% of statements, branches, functions and lines |

The commands print the counts. They differ between the languages because the tools count differently (V8 counts `??`,
`?.` and each `case` as branches), not because the code differs. A gap in one implementation is closed by an assertion in
the shared case, in both suites, never by a one-language test: DIA-02's tables of Python's rules came about that way.

## Deliberate differences

Beyond mbse-schemas' own (native types, `Map` for plain data, errors, and so on):

| Area | Python | TypeScript | Why | Cases |
|---|---|---|---|---|
| Unknown | `None` | `null` | the respective "no value" | EVL-01..06 |
| Evaluation scope and validation options | `Evaluators.OfAny(e, {"this": x})`, `validate(bound={"this"}, core=True)` | `Evaluators.OfAny(e, { this: x })`, `validate({ bound: ["this"], core: true })` | no keyword arguments; object literals are the idiom | EXP-10, EVL-01, EVL-04, EVL-06, FRM-05 |
| Keyword arguments of the framework and dialects | `Pattern("operation", A, B, name="eq")`, `Python.Scope(variables, modules=..., builtins=...)`, `Matlab.Scope(variables, functions=..., packages=...)`, `Workbook(names, sheets, name=..., books=..., add_ins=...)`, `import_(module, body, alias=...)` | `new Pattern("operation", { name: "eq" }, A, B)`, `new Scope(variables, { modules, builtins })`, `new Scope(variables, { functions, packages })`, `new Workbook(names, sheets, { name, books, add_ins })`, `import_(module, body, alias)` | no keyword arguments: options objects, or positions for a single optional argument | TRN-01, DIA-02, DIA-05, DIA-08 |
| Kinds and their structure | dataclasses with class variables; `kinds()`, `builders`, `Form.attributes` and `infer`'s environment are dicts | classes with static members; `kinds()`, `builders` and `Form.attributes` are `Map`s, `infer`'s environment an object | each language's idiom for records and maps | FRM-02..07 |
| Expressions from functions | `Expressions.from_(lambda this: this.age >= 18)` reads the function's source with `ast` | none; EXP-12 asserts `from_` is absent | a JavaScript function has no Python source to read; terms write the same expressions in both | EXP-12 |
| Reading Python source | `Python.Expressions.parse(source)`, with `ast` | none; DIA-01 asserts `parse` is absent | reading Python source needs Python's parser; constructors write the same expressions in both, and render the same source | DIA-01 |
| Evaluating Python expressions | Python itself evaluates them, in a scope that allowlists modules | a model of Python's rules over JavaScript values (int is `bigint`, float `number`, None `null`); modules are `Module` objects of named members; attributes are modeled for modules and for objects that write their properties, not for other values | TypeScript cannot run Python; DIA-02's tables check the model against Python | DIA-02 |
| NumPy | a module Python expressions import, evaluated vectorized with masks | none; a `Module` stands in for it in DIA-02, and TRN-06 leaves out evaluation over columns | numpy is a Python library | DIA-02, TRN-06 |
| Python's exceptions | `Framework.Errors` names Python's own `NameError`, `ImportError`, `OverflowError`, `ZeroDivisionError` | `Framework.Errors` defines classes of the same names, raised with the same messages | JavaScript has no counterparts | DIA-02, DIA-04, DIA-05, FRM-09 |
| Excel's error values | `Error("#FIELD!")`, equal by value | `Error.of("#FIELD!")`, one instance per code, compared with `===` | JavaScript has no value equality for objects | DIA-06..08, TRN-06 |
| Mappings | a `Mapping` (a dict) is a Python dict, a MATLAB struct and an Excel record | a `Map` or a plain object | both are JavaScript's mappings | DIA-02, DIA-04, DIA-07 |
| Names on a `Term` that are not properties | names starting with `_` (Python's own probes) | `then`, `toJSON` and symbols (JavaScript's own probes) | each language probes objects with its own names | EXP-11 |
| Import paths | `mbse.Schemas.Framework` and `mbse.Expressions` (`.Framework`, `.Dialects.<Name>`, `.Translators`), in the shared `mbse` namespace package; mbse-schemas is installed from the submodule | `@mbse/schemas/Framework` and `@mbse/expressions` (`/Framework`, `/Dialects/<Name>`, `/Translators`); `@mbse/schemas` is a `file:` dependency on the submodule | a module specifier is a path, not a dotted name; a scope is the nearest equivalent | all |

## Tutorials

`python3/tutorials/` and `typescript5/tutorials/` are the same case study, with the same outputs wherever the bindings
agree. The Python notebook writes its main body with lambdas read by `Expressions.from_` and shows terms and builders in
an appendix; the TypeScript notebook writes terms throughout. The expressions, and their JSON, are the same. Both are
run as tests and committed with outputs (Python's from its kernel, TypeScript's from Deno's Jupyter kernel).
