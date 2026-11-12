<!-- nav -->
[← 15 · Constraints for firmware and hardware (TypeScript)](../typescript5/tutorials/15_Constraints_For_Firmware_And_Hardware.ipynb) · [Home](../README.md) · [Conformance corpus →](../conformance/README.md)

# Equivalence of the implementations

`python3/` and `typescript5/` implement the same package, and follow mbse-schemas' rules for equivalence
([mbse-schemas' equivalence](https://github.com/pitaman71/mbse-schemas/blob/main/docs/EQUIVALENCE.md)): the same API and messages, byte-identical JSON,
interchangeable data, the same test cases under the same IDs, and full coverage in both. This document covers what is
specific to this package: the framework, the Patterns, Python3, TypeScript5, MATLAB, Excel, LaTeX, C and Cpp dialects, SystemVerilog's six (Expressions, Types, Patterns, Assertions, Constraints, Preprocessor), and
the translators between them.

## How it is checked

| Check | Where |
|---|---|
| Every test case exists in both implementations, same ID, same order | `python3/tests/*.ipynb`, `typescript5/tests/*.ipynb` |
| API conformance to the visitor protocols and the framework's protocols, on classes and on live instances | VIS-01, VIS-02, FRM-01 |
| JSON is byte-identical, for a case of every dialect; YAML and JSON are interchangeable | the CONF suite over the shared corpus in `conformance/` |
| The agent guides are current, and their links resolve: every notebook case the skill links, in both languages but those listed in [Cases in one language only](#cases-in-one-language-only) | the SKL suite |
| Every tutorial has the same steps in both languages: the same notebooks, titles and `## NN.k · title` headings, in the same order, each step's cell starting with its anchor | SKL-05 |
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
| A mapping's entries and a transaction's frame | `E.mapping(("a", 1), ("b", x))`, `P.dict_(...)`: entries as tuples; a frame is a dict, `store.transaction(ISOIEC11404.define)[0]["octet"]` | `E.mapping(["a", 1n], ["b", x])`, `P.dict_(...)`: entries as arrays; a frame is a `Map`, `.get("octet")` | each language's pairs and frames (mbse-schemas' own) | EXP-06, EXP-13, COL-08, DOM-03 |
| A dict display's value | a Python dict | a `Map`, its keys compared as Python compares them | the TypeScript model of Python's values | DIA-01 |
| Keyword arguments of the framework and dialects | `Pattern("call", A, B, callable="eq")`, `Python3.Scope(variables, modules=..., builtins=...)`, `Matlab.Scope(variables, functions=..., packages=...)`, `C.Scope(variables, functions=...)`, `SystemVerilog.Scope(variables, functions=...)`, `Workbook(names, sheets, name=..., books=..., add_ins=...)`, `import_(module, body, alias=...)` | `new Pattern("call", { callable: "eq" }, A, B)`, `new Scope(variables, { modules, builtins })`, `new Scope(variables, { functions, packages })` and `new Scope(variables, { functions })`, `new Workbook(names, sheets, { name, books, add_ins })`, `import_(module, body, alias)` | no keyword arguments: options objects, or positions for a single optional argument | TRN-01, DIA-02, DIA-05, DIA-08 |
| Kinds and their structure | `Terms.Kind(role, operator=..., ...)` and `Terms.Dialect(path, kinds, domain_of=..., extends=...)` take keyword arguments; `kinds()`, `Form.attributes` and `infer`'s environment are dicts; `kind_of` gives a tuple | `new Kind(role, { operator, ... })` and `new Dialect(path, kinds, { domain_of, extends })` take options objects; `kinds()` and `Form.attributes` are `Map`s, `infer`'s environment an object or a `Map`; `kindOf` gives an array; the generic reads are camelCase (`kindOf`, `dialectOf`, `attributesOf`, `argumentsOf`, `nameOf`, `operatorOf`, `isTerm`, `isExpression`, `invalidText`, `invalidTermText`; `dialectName` of a path), and the framework's kinds of invalid syntax are `INVALID_KINDS`, a `Map` | each language's idiom for records, maps and names | FRM-01..12 |
| Reading Python source | `Python3.Text.FromText(source)`, with `ast`, every expression kind, keeping each literal's spelling | none; DIA-01 asserts `Python3.Text` has no `FromText`, and DIA-19 writes through the builders the spelled literals and f-strings Python reads | reading Python source needs Python's parser; constructors write the same expressions in both, and `ToText` writes the same source | DIA-01, DIA-19 |
| Python3's completeness against `ast` | DIA-20 checks `grammars/python3-ast.json` against the running Python's `ast` too | DIA-20 checks the same file against the dialect alone | `ast` is Python's | DIA-20 |
| Python's regular expressions against `re` | PYR-07 compiles each printed pattern with `re`; PYR-09 checks `grammars/python3-re.json` against the running Python's `re._constants` too | PYR-07 and PYR-09 check the same printing and the same file against the dialect alone | `re` is Python's | PYR-07, PYR-09 |
| Python's constants with no JavaScript value | `P.constant(None)`, `P.constant(...)`, `P.constant(2j)`: Python's own | `P.constant(null)`, `P.constant(P.ELLIPSIS)`, `P.constant(new P.Complex(0, 2))` | JavaScript has no `Ellipsis` or complex numbers; the terms written are the same, and the corpus's `python3` case holds each | DIA-01, CONF |
| Python3's writers' options | `P.lambda_(body, args, posonlyargs=..., vararg=..., kwonlyargs=..., kwarg=...)`; `P.comprehension(target, iter, ifs, is_async)`, `P.formattedvalue(value, conversion, format_spec, debug, text)` by keyword or position | `P.lambda_(body, args, { posonlyargs, vararg, kwonlyargs, kwarg })`; the others by position | no keyword arguments: an options object where there are several | DIA-01, DIA-19 |
| A kind tagged by a Python keyword, in builder calls | `getattr(u, "lambda")(...)`, `getattr(u, "import")(...)`, or by the dialect's constant (`getattr(u, P.IMPORT)(...)`): a keyword is no attribute name | `u.lambda(...)`, `u.import(...)` | Python's grammar refuses a keyword after a dot, where JavaScript allows a reserved word as a property name | FRM-05, FRM-10, TRN-02, DIA-01 |
| TypeScript5's literals | a number's value a `float`, a bigint's an `int` (`ts(1.5)`, `ts(1)`) | a number's a `number`, a bigint's a `bigint` (`ts(1.5)`, `ts(1n)`) | each language's numbers; the terms written are the same, a number always a float | DIA-21, CONF |
| TypeScript5's number spelling | `Text.number`, JavaScript's `String(number)` written in Python, from `repr`'s shortest digits | `Text.number` is `String(number)` | JavaScript's own; DIA-22 checks the two alike, at each notation's bounds | DIA-22 |
| Nested reading: TypeScript5's, C's and C++'s | `Terms.node(tag, record)` and TypeScript5's `Expressions.tree(term)`, a `Terms.Node` dataclass, its `attributes`, `slots` and `helpers` dicts, `many` a tuple, a helper's many nodes a tuple; `bound_names` (TypeScript5's and TypeScript Patterns', one function) | `Terms.node(tag, record)` and `Expressions.tree(term)`, a `Terms.Node` class, its fields `Map`s, `many` an array, a helper's many nodes an array; `boundNames` (TypeScript5's and TypeScript Patterns', one function) | each language's records and names | DIA-21, DIA-24, DIA-25 |
| C's and C++'s literals and writers | an int `C.literal(5, "u")`, a float `C.literal(1.5, "f")`; `C.Domains.literal(attributes, language, types)` and `out_of_range` of a dict; `C.Expressions.type_name`, `bound_names` | a bigint `C.literal(5n, "u")`, a number `C.literal(1.5, "f")`; `C.Domains.literal(attributes, language, types)` and `outOfRange` of a `Map`; `C.Expressions.typeName`, `boundNames`; a language's suffixes a `Suffixes` of two `RegExp`s | each language's numbers and names; the terms written are the same | DIA-11, DIA-12, DIA-24 |
| C's and C++'s types | `C.Domains.Types(value, path)`, its `find` None where neither dialect defines a name; a `CType` a frozen dataclass compared with `==`, its `format` a name or a tuple of IEEE 754's parameters (`(2, 64, 16383)`), its integers `int`s | `new C.Domains.Types(value, path)`, its `find` null; a `CType` a class compared with `equals()`, two formats the same by name or by their parameters, its `format` a name or an array (`[2n, 64, 16383]`), a radix a `bigint` and widths `number`s | JavaScript has no value equality; IEEE 754's parameters are `Ieee754`'s, whose radix is a `bigint` | DIA-11, DIA-12, DOM-19 |
| The retrofit's sublanguage dialects' functions | `Python.Patterns.bound_names(pattern)`, `TypeScript.Patterns.bound_names`, `C.Expressions.Kinds.identifier_problems(spelling)`, `C.Preprocessor.macros(condition)`, a frozenset | `boundNames`, `boundNames`, `identifierProblems`, `macros`, a `ReadonlySet` | each language's idiom for names and sequences; the same functions and results | PYP-03, TSP-02, CTY-03, CPD-04 |
| A form's helpers | `Terms.Part`, its attributes a dict; a container of helpers a tuple of parts | `Terms.Part`, its attributes a `Map`; a container of helpers an array of parts | each language's records and sequences | FRM-02, DIA-19 |
| Evaluating Python expressions | Python itself evaluates them, in a scope that allowlists modules | a model of Python's rules over JavaScript values (int is `bigint`, float `number`, None `null`); modules are `Module` objects of named members; attributes are modeled for modules and for objects that write their properties, not for other values; a generator is a class whose type name is `generator`, and `sum` follows CPython's (exact ints, compensated floats), which a fuzz of 20,000 sums matched | TypeScript cannot run Python; DIA-02's tables check the model against Python | DIA-02 |
| NumPy | a module Python expressions import, evaluated vectorized with masks | none; a `Module` stands in for it in DIA-02, and TRN-06 leaves out evaluation over columns | numpy is a Python library | DIA-02, TRN-06 |
| Python's exceptions | `Framework.Errors` names Python's own `NameError`, `ImportError`, `OverflowError`, `ZeroDivisionError` | `Framework.Errors` defines classes of the same names, raised with the same messages | JavaScript has no counterparts | DIA-02, DIA-04, DIA-05, FRM-09 |
| Excel's error values | `Error("#FIELD!")`, equal by value | `Error.of("#FIELD!")`, one instance per code, compared with `===` | JavaScript has no value equality for objects | DIA-06..08, TRN-06 |
| Patterns' natives' domains, for inference | `Domains.Int` is `Framework.Domains.OfTypes("int", int)`, and so on for `bool`, `float`, `str` and `bytes` | `new D.OfTypes("int", BigInt)`, a float's `Number`, `Boolean`, `String` and `Uint8Array` | every int is a `bigint` in the data model; both compare by identity | DOM-01, DOM-09 |
| IEEE 754 formats (`Ieee754`) | `FORMATS` gives `(base, precision, emax)` as `int`s, and a `Datum`'s coefficient is an `int`; DOM-11's table is also checked against Python's `decimal` module and the host's binary16 and binary32 rounding | the base and a `Datum`'s coefficient are `bigint`s, the precision and exponents `number`s; the table alone | coefficients outgrow numbers, exponents do not; the references are Python's | DOM-10..12 |
| Domains' reading interface | `Domains.kind_of` gives a tuple `(dialect, tag, record)`; `properties` and `operations` dicts, a container a tuple; `name_of` a str or None; and the standards' (`Standards`): `standards` and `properties` dicts, a container and a revision tuples (`("year", 2011)`), `tags` a tuple, `kinds` a list, `designation_of` and `find` a str or an edition, or None | `Domains.kindOf` gives an array `[dialect, tag, record]`; `properties` and `operations` `Map`s, a container an array; `nameOf` a string or `null`; and the standards' camelCase (`designationOf`): `standards` and `properties` `Map`s, a container, a revision (`["year", 2011n]`), `tags` and `kinds` arrays, `designationOf` and `find` a string or an edition, or `null`; a module's identity is checked by dynamic import where Python checks `__name__` | the languages' own collections | DOM-03, DOM-17, DOM-18, DOM-19, FRM-13, CONF-04, T01.3 |
| Collections | `Domains.Collection` and `Domains.Record`, and inference's collection domains `Domains.List` and `Domains.Keyed`, are frozen dataclasses compared with `==`, a collection's items and keys tuples and a record's fields a `dict`; a scope's list or tuple is a positional collection | classes compared with `equals()` (a record by identity), items and keys arrays and fields a `Map`; a scope's array is a positional collection | each language's records and sequences | COL-01..08 |
| Conversions of literals and container constructors | `Convert(left, right, forward, backward)`'s functions take and give a literal's attributes as a `dict`, or None; `Elementwise(left, right, left_attributes, right_attributes, direction)` takes dicts and keyword arguments | they take and give a plain object (`Attributes`), or `null`; `new Elementwise(left, right, leftAttributes, rightAttributes, direction)`, plain objects, positional | a form's attributes are a `Map`, which a function reads more plainly as an object | TRN-01 |
| Partial evaluation | `Partials.REDUCER(term, variables)`, a callable; variables a mapping | `Partials.REDUCER.run(term, variables)`; variables an object | no callable instances, as for `Interpreter` | PAR-01..04 |
| A writer as a spec | a `Terms.Writer` is a callable object, called by mbse-schemas with the visitor it writes through | a `Writer` is a function whose prototype is the writer's class, so that mbse-schemas calls it as a callback and its methods work | mbse-schemas takes a function as a callback | EXP-04, EXP-09, VIS-02 |
| SystemVerilog's values | `Domains.Logic`, a frozen dataclass compared with `==` and written by `repr` (`4'b10x1`); its `aval` and `bval`, and integers, are `int`s; types compare with `==`; a real power is `math.pow`'s | `Domains.Logic`, a class written by `toString()`; its `aval` and `bval`, and integers, are `bigint`s, and widths `number`s; types compare with `equals()`; a real power is `Math.pow`'s, corrected to C's `pow` where JavaScript's differs (1 to any power, -1 to an infinite one) | JavaScript has no value equality and no `repr`; each host's `pow` may round its last bit apart | DIA-13, DIA-14 |
| SystemVerilog's printing of an operator no precedence table has | `Expressions.Text`'s `BINARY` and `Assertions.Text`'s sequence and property tables raise `KeyError` for an operator they lack, one validation refuses | the same tables read `undefined`, and the term prints with no precedence | each language's lookup of a missing key; only a term validation refuses reaches it | none yet: no case prints such a term |
| Mappings | a `Mapping` (a dict) is a Python dict, a MATLAB struct, an Excel record and a SystemVerilog struct | a `Map` or a plain object | both are JavaScript's mappings | DIA-02, DIA-04, DIA-07, DIA-14 |
| Names on a `Writer` that are not properties | names starting with `_` (Python's own probes) | names starting with `_`, `then`, `toJSON`, `inspect`, symbols and the names every object has (`toString`, `valueOf`, `constructor`, ...): read those with `.get(name)` | each language probes objects with its own names | EXP-11 |
| A writer of a write callback | `Expressions.Writer(write)`, a callable instance; `Terms.Writer(write, dialect)` | `new Expressions.Writer(write)`, a function, wrapped in a `Proxy` so that `.name` reads a property; `new Terms.Writer(write, dialect)` | a writer is a function and a `Proxy` in TypeScript | FRM-10, VIS-02 |
| The C family's writers | `C.Expressions.Writers(dialect, writer)`, its methods bound to each dialect's functions (`constant = _WRITERS.constant`) | `new C.Expressions.Writers(dialect, Writer)`, its writers arrow-function fields, destructured into each dialect's exports | a method read off an instance keeps its `this` only as an arrow function | FRM-12, TRN-08 |
| YAML of the corpus | PyYAML's layout | mbse-schemas' own emitter, which quotes base64 text (`'AP8='`) and an operator such as `'++'` or `'??'` | YAML may be formatted differently; its values must match (mbse-schemas' EQUIVALENCE.md, "YAML formatting"), as CONF-03 checks | CONF-03 |
| Import paths | `mbse.Schemas.Framework` and `mbse.Expressions` (`.Framework`, a dialect's `.<Family>.<Dialect>`, such as `.Patterns.Expressions`, `.C.Expressions` or a standard dialect's `.IEEE754.Expressions`, `.Translators`), in the shared `mbse` namespace package; mbse-schemas is installed from the sibling checkout | `@mbse/schemas/Framework` and `@mbse/expressions` (`/Framework`, a dialect's `/<Family>/<Dialect>`, such as `/Patterns/Expressions`, `/C/Expressions` or a standard dialect's `/IEEE754/Expressions`, `/Translators`); `@mbse/schemas` is a `file:` dependency on the sibling checkout | a module specifier is a path, not a dotted name; a scope is the nearest equivalent | all |

## Tutorials

`python3/tutorials/` and `typescript5/tutorials/` are the same notebooks, in two parts, with the same steps and the
same answers. Part I (tutorials 1 to 8) writes each model in the builders' fluent calls and checks that its dialect's
`Text.ToText` gives the language's own text back; Python's notebooks also read Python3's text with `Text.FromText`,
where TypeScript's build the same model, under the same case ID. Part II (9 to 15, seven case studies) builds its
constraints with writers, each written in a store within a transaction, so that the expressions, and their JSON, are
the same; Python also reads Python source with `Text.FromText`, where TypeScript writes the same expression with the
Python3 dialect's constructors. Each toolkit's `show` writes floats as Python does (`2.0`), so the expressions print
alike; values printed by each language's own means (`4n`, `4.0` against `4`) follow that language. Both are run as
tests and committed with outputs (Python's from its kernel, TypeScript's from Deno's Jupyter kernel).

Both languages' steps carry the same IDs, `## NN.k · title`, in the same order, and each step's markdown cell starts
with the same anchor, `<a id="Tnn.k"></a>`, which the skill links, as each test case's starts with its ID's
(`<a id="EXP-01"></a>`); SKL-05 checks that every tutorial has the same steps in both languages. When a tutorial
changes, change both, and rerun both notebooks to refresh their outputs.

## Cases in one language only

Every case, a tutorial step's or a test's, has a twin in the other language with the same ID and anchor, except those
listed here, which test what only one language has. The skill may link them in that language alone; SKL-03 accepts each
listed here as having no twin, and no other, and SKL-04 counts each for that language alone. There are none: where
the languages differ (Python's `Text.FromText`, its real modules and numpy), the twins show each language's own way,
under the same ID. A case added in one language alone is listed here, in a table of its cases (each in backticks),
its language and why.

---

<!-- nav -->
[← 15 · Constraints for firmware and hardware (TypeScript)](../typescript5/tutorials/15_Constraints_For_Firmware_And_Hardware.ipynb) · [Home](../README.md) · [Conformance corpus →](../conformance/README.md)
