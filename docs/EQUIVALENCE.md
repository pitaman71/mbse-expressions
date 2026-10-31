<!-- nav -->
[← 8 · Constraints for firmware and hardware (TypeScript)](../typescript5/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb) · [Home](../README.md) · [Conformance corpus →](../conformance/README.md)

# Equivalence of the implementations

`python3/` and `typescript5/` implement the same package, and follow mbse-schemas' rules for equivalence
([mbse-schemas' equivalence](https://github.com/pitaman71/mbse-schemas/blob/main/docs/EQUIVALENCE.md)): the same API and messages, byte-identical JSON,
interchangeable data, the same test cases under the same IDs, and full coverage in both. This document covers what is
specific to this package: the framework, the Basic, Python, Matlab, Excel, Latex, Ccpp and SystemVerilog dialects, and the translators
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
| Evaluation scope and validation options | `Evaluators.OfAny(t, {"person": x})`, `DIALECT.validate(t, bound={"person"}, core=True)` | `Evaluators.OfAny(t, { person: x })`, `DIALECT.validate(t, ["person"], true)` | no keyword arguments; object literals are the idiom, and validation's two options are positional | EXP-10, EVL-01, EVL-04, EVL-06, FRM-05 |
| A mapping's entries and a transaction's frame | `E.mapping(("a", 1), ("b", x))`, `P.dict_(...)`: entries as tuples; a frame is a dict, `store.transaction(Basic.define)[0]["uint8"]` | `E.mapping(["a", 1n], ["b", x])`, `P.dict_(...)`: entries as arrays; a frame is a `Map`, `.get("uint8")` | each language's pairs and frames (mbse-schemas' own) | EXP-06, EXP-13, COL-08, DOM-03 |
| A dict display's value | a Python dict | a `Map`, its keys compared as Python compares them | the TypeScript model of Python's values | DIA-01 |
| Keyword arguments of the framework and dialects | `Pattern("call", A, B, callable="eq")`, `Python.Scope(variables, modules=..., builtins=...)`, `Matlab.Scope(variables, functions=..., packages=...)`, `Ccpp.Scope(variables, functions=...)`, `SystemVerilog.Scope(variables, functions=...)`, `Workbook(names, sheets, name=..., books=..., add_ins=...)`, `import_(module, body, alias=...)` | `new Pattern("call", { callable: "eq" }, A, B)`, `new Scope(variables, { modules, builtins })`, `new Scope(variables, { functions, packages })` and `new Scope(variables, { functions })`, `new Workbook(names, sheets, { name, books, add_ins })`, `import_(module, body, alias)` | no keyword arguments: options objects, or positions for a single optional argument | TRN-01, DIA-02, DIA-05, DIA-08 |
| Kinds and their structure | `Terms.Kind(role, operator=..., ...)` and `Terms.Dialect(name, kinds, domain_of=..., extends=...)` take keyword arguments; `kinds()`, `Form.attributes` and `infer`'s environment are dicts; `kind_of` gives a tuple | `new Kind(role, { operator, ... })` and `new Dialect(name, kinds, { domain_of, extends })` take options objects; `kinds()` and `Form.attributes` are `Map`s, `infer`'s environment an object or a `Map`; `kindOf` gives an array; the generic reads are camelCase (`kindOf`, `attributesOf`, `argumentsOf`, `nameOf`, `operatorOf`, `isTerm`), as is SystemVerilog's `kind_of` (`kindOf`) | each language's idiom for records, maps and names | FRM-01..10 |
| Reading Python source | `Python.Text.FromText(source)`, with `ast` | none; DIA-01 asserts `Python.Text` has no `FromText` | reading Python source needs Python's parser; constructors write the same expressions in both, and `ToText` writes the same source | DIA-01 |
| Evaluating Python expressions | Python itself evaluates them, in a scope that allowlists modules | a model of Python's rules over JavaScript values (int is `bigint`, float `number`, None `null`); modules are `Module` objects of named members; attributes are modeled for modules and for objects that write their properties, not for other values; a generator is a class whose type name is `generator`, and `sum` follows CPython's (exact ints, compensated floats), which a fuzz of 20,000 sums matched | TypeScript cannot run Python; DIA-02's tables check the model against Python | DIA-02 |
| NumPy | a module Python expressions import, evaluated vectorized with masks | none; a `Module` stands in for it in DIA-02, and TRN-06 leaves out evaluation over columns | numpy is a Python library | DIA-02, TRN-06 |
| Python's exceptions | `Framework.Errors` names Python's own `NameError`, `ImportError`, `OverflowError`, `ZeroDivisionError` | `Framework.Errors` defines classes of the same names, raised with the same messages | JavaScript has no counterparts | DIA-02, DIA-04, DIA-05, FRM-09 |
| Excel's error values | `Error("#FIELD!")`, equal by value | `Error.of("#FIELD!")`, one instance per code, compared with `===` | JavaScript has no value equality for objects | DIA-06..08, TRN-06 |
| Value domains | dataclasses compared with `==`; `D.OfInteger.Builder()`; widths and codes are `int`s; `D.read(domain)` gives a stored domain's data | classes compared with `equals()`; `new D.OfInteger.Builder()`; widths and codes are `bigint`s; `D.read(domain)` likewise | no value equality for objects; every int is a `bigint` in the data model | DOM-01..12 |
| IEEE 754 formats (`Ieee754`) | `FORMATS` gives `(base, precision, emax)` as `int`s, and a `Datum`'s coefficient is an `int`; DOM-11's table is also checked against Python's `decimal` module and the host's binary16 and binary32 rounding | the base and a `Datum`'s coefficient are `bigint`s, the precision and exponents `number`s; the table alone | coefficients outgrow numbers, exponents do not; the references are Python's | DOM-10..12 |
| Collections | `Domains.Collection` and `Domains.Record` are frozen dataclasses compared with `==`, a collection's items and keys tuples and a record's fields a `dict`; a scope's list or tuple is a positional collection | classes compared with `equals()` (a record by identity), items and keys arrays and fields a `Map`; a scope's array is a positional collection | each language's records and sequences | COL-01..08 |
| Conversions of literals and container constructors | `Convert(left, right, forward, backward)`'s functions take and give a literal's attributes as a `dict`, or None; `Elementwise(left, right, left_attributes, right_attributes, direction)` takes dicts and keyword arguments | they take and give a plain object (`Attributes`), or `null`; `new Elementwise(left, right, leftAttributes, rightAttributes, direction)`, plain objects, positional | a form's attributes are a `Map`, which a function reads more plainly as an object | TRN-01 |
| Partial evaluation | `Partials.REDUCER(term, variables)`, a callable; variables a mapping | `Partials.REDUCER.run(term, variables)`; variables an object | no callable instances, as for `Interpreter` | PAR-01..04 |
| A writer as a spec | a `Terms.Writer` is a callable object, called by mbse-schemas with the visitor it writes through | a `Writer` is a function whose prototype is the writer's class, so that mbse-schemas calls it as a callback and its methods work | mbse-schemas takes a function as a callback | EXP-04, EXP-09, VIS-02 |
| SystemVerilog's values | `Domains.Logic`, a frozen dataclass compared with `==` and written by `repr` (`4'b10x1`); its `aval` and `bval`, and integers, are `int`s; types compare with `==`; a real power is `math.pow`'s | `Domains.Logic`, a class written by `toString()`; its `aval` and `bval`, and integers, are `bigint`s, and widths `number`s; types compare with `equals()`; a real power is `Math.pow`'s, corrected to C's `pow` where JavaScript's differs (1 to any power, -1 to an infinite one) | JavaScript has no value equality and no `repr`; each host's `pow` may round its last bit apart | DIA-13, DIA-14 |
| Mappings | a `Mapping` (a dict) is a Python dict, a MATLAB struct, an Excel record and a SystemVerilog struct | a `Map` or a plain object | both are JavaScript's mappings | DIA-02, DIA-04, DIA-07, DIA-14 |
| Names on a `Writer` that are not properties | names starting with `_` (Python's own probes) | names starting with `_`, `then`, `toJSON`, `inspect`, symbols and the names every object has (`toString`, `valueOf`, `constructor`, ...): read those with `.get(name)` | each language probes objects with its own names | EXP-11 |
| A writer of a write callback | `Expressions.Writer(write)`, a callable instance | `new Expressions.Writer(write)`, a function, wrapped in a `Proxy` so that `.name` reads a property | a writer is a function and a `Proxy` in TypeScript | FRM-10 |
| YAML of the corpus | PyYAML's layout | mbse-schemas' own emitter, which quotes base64 text (`'AP8='`) | YAML may be formatted differently; its values must match (mbse-schemas' EQUIVALENCE.md, "YAML formatting"), as CONF-03 checks | CONF-03 |
| Import paths | `mbse.Schemas.Framework` and `mbse.Expressions` (`.Framework`, `.Dialects.<Name>`, `.Translators`), in the shared `mbse` namespace package; mbse-schemas is installed from the sibling checkout | `@mbse/schemas/Framework` and `@mbse/expressions` (`/Framework`, `/Dialects/<Name>`, `/Translators`); `@mbse/schemas` is a `file:` dependency on the sibling checkout | a module specifier is a path, not a dotted name; a scope is the nearest equivalent | all |

## Tutorials

`python3/tutorials/` and `typescript5/tutorials/` are the same seven case studies (the fourth deferred), with the same answers. Both build
their constraints with writers, each written in a store within a transaction, so that the expressions, and their JSON,
are the same; Python also reads Python source with `Text.FromText`, where TypeScript writes the same expression with
the Python dialect's constructors. Each toolkit's `show` writes floats as Python does (`2.0`), so the expressions print
alike; values printed by each language's own means (`4n`, `4.0` against `4`) follow that language. Both are run as
tests and committed with outputs (Python's from its kernel, TypeScript's from Deno's Jupyter kernel).

---

<!-- nav -->
[← 8 · Constraints for firmware and hardware (TypeScript)](../typescript5/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb) · [Home](../README.md) · [Conformance corpus →](../conformance/README.md)
