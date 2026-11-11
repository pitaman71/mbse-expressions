<!-- nav -->
[← Domains as data](../domains/README.md) · [Home](../../../README.md)

# Tutorials, from domains and trivial expressions up (a proposal, for review)

This proposes how this repository's tutorials are rebuilt: a new first part, eight notebooks that teach how values,
their domains and each language's expressions are modeled, from a single literal up; then today's seven case studies
on constraints, renumbered after it, trimmed of what the first part now teaches, with no gap in their numbering. It
asks what only the user can decide. No notebook or code changes until it is decided, and the build waits for stage 6
(SystemVerilog complete) to merge.

## Why

The user, 2026-11-10: "Before moving to `mbse-programs`, `mbse-expressions/<language>/tutorials` needs an overhaul.
The content seems to focus entirely on constraints, which should be preceded by Jupyter notebooks that serve as both
tutorial and test, building up knowledge of how domains are represented, how native expressions correspond to modeled
expressions starting with trivial expressions and building up complexity."

The tutorials are this repository's user guide for humans and agents, and each doubles as a test
([the basis](https://github.com/pitaman71/mbse-basis/blob/main/docs/README.md#the-doc-spec), the doc spec's tutorials
shelf). Today they teach one thing, constraints, through one story, the cold chain, and they reach what the library
has become since 0.8.0 only at the end: a domain first appears in the seventh notebook's last step (T07.5), a
language's own text read into a model in one step (T07.3), C's types under an ABI in the last notebook (T08.1), and
TypeScript5 nowhere. What 0.8.0 and 0.9.0 built, every expression of Python 3, TypeScript 5, C and C++ as data
([CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md))
and every dialect's domains as stored data
([CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md)),
has no tutorial, only test cases. mbse-programs, next, builds on exactly that: its programs' expressions are these
dialects' terms.

## Where it stands

Checked at main, v0.9.0 (cad59c4), in both languages.

- **Seven tutorials, 35 steps**: 01 to 03 and 05 to 08, the fourth, *Values with widths*, deferred until domain
  inference, as the user decided ([CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md#decided):
  "tutorial 4 ... go until then"). Both languages have the same `## NN.k · title` headings in the same order, each
  step's anchor `<a id="Tnn.k"></a>`; both suites run them (Python's `testpaths` with nbmake, TypeScript's
  `tests/run-notebooks.ts`), committed with outputs. Nothing checks that the two languages' steps match: SKL-03 checks
  only the anchors the skill links.
- **The skill links 34 of the 35 steps** (all but T01.3), from `SKILL.md`, `references/dialects.md` and
  `references/translating.md`; `docs/EQUIVALENCE.md` cites T07.5. No sibling repository links a tutorial step.
- **What both languages can show today**, which bounds what Part I can teach in both:

  | | Model (holder `store.Expressions.<Family>.<Dialect>.Expression`) | Writers | `Text.ToText` | `Text.FromText` | Evaluates | `DIALECT.infer` | Stored domains |
  |---|---|---|---|---|---|---|---|
  | Patterns | builders | `E.literal`, `E.variable`, ... | none (the toolkit's `show`) | none | yes | natives' (`int`, `float`) | none, by design |
  | Python3 | builders | `constant`, `name`, `binop`, ... | yes | Python only | the kinds constraints use, generator expressions among them; not `constant`, `lambda`, `listcomp`, `dictcomp`, `namedexpr`, f-strings | `OfTypes` | `bool`, `int`, `float`, `str`, `bytes`, `NoneType`, `ellipsis` |
  | TypeScript5 | builders | none | yes | none | literals only | yes | `boolean`, `number`, `bigint`, `string`, `null` |
  | C, Cpp (holder names an ABI) | builders | `literal`, `binary`, `cast`, ... | yes | none | arithmetic types | through the ABI | C's own, then `SystemV.AMD64`'s or `Arm.AAPCS64`'s |
  | SystemVerilog (pre-stage 6) | builders | `constant`, `vector`, `binary`, ... | yes | none | yes, 4-state | yes | `logic`, `reg`, `integer`, `time`, `bit`, `byte`, `shortint`, `int`, `longint`, `real`, `shortreal` |
  | MATLAB, Excel | builders | yes | yes | none | yes | `OfTypes` | `double`, `logical`, `string`; `number`, `logical`, `text`, `error` |
  | LaTeX | builders | yes | yes | none | no | code | none, by decision |

  Python3 is the only dialect read from text, and only in Python
  ([Equivalence](../../EQUIVALENCE.md#deliberate-differences), "Reading Python source"); reading the other
  languages is mbse-programs' ([CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md):
  "printed here and parsed by mbse-programs"). TypeScript5 has no translator. A term carries no domain: `infer` is
  code, to be replaced by [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md).

Found while checking, each settled below or put to the user:

1. **No stored domain is a `state`.** ISO/IEC 11404's `state` is a kind (`OfState`), but no standard in scope defines a
   state domain; the only stored domain with `members` is Excel's own `error`. The tests' `state` and `mode` are
   fixtures ([CAP-097: value domains of published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-097.md#decided),
   "The corpus's and the tests' own domains"), and a program's own enums get no domain ("The scope of stored domains").
2. **SystemVerilog's `42` is an `integer`, not an `int`.** An unsized decimal literal infers `integer` (4-state, kind
   `logic`, 32 bits signed); `int` is the 2-state type (kind `bit`).
3. **C's `42` has no domain without an ABI.** `int` is not C's, but each ABI's: inferring it in an expression that
   names none raises "'int' is not a type C defines, and its expression names no ABI".
4. **Python's `FromText` drops parentheses.** `(a)` reads as `variable`, `a + (b * c)` prints back as `a + b * c`:
   `ast` keeps none, so the dialect's `parenthesized` kind is written only through the builders.
5. **The skill misnames the reading interface in TypeScript.** Its "Names" section says only `Terms`' reads are
   camelCase there; `Domains.kindOf`, `nameOf` and `Standards.designationOf` are too, as `docs/EQUIVALENCE.md` lists.
6. **A kind tagged by a Python keyword needs `getattr` in Python's builder calls**: `getattr(u, "lambda")(...)` where
   TypeScript writes `u.lambda(...)`; `docs/EQUIVALENCE.md` does not list it.

## The sequence

Fifteen notebooks per language, in one series, `python3/tutorials/` and `typescript5/tutorials/`, under one README
per language (*Tutorial: expressions as models, then constraints as data*):

| # | Notebook | Part | What it teaches |
|---|---|---|---|
| 1 | `01_Values_And_Their_Domains` | I | A domain is data: the standard dialects' domains, kinds, parameters, inferred properties, schemas and editions |
| 2 | `02_One_Value_A_Domain_In_Each_Language` | I | `42` as Python's `int`, TypeScript's `number`, C's `int` under each ABI, SystemVerilog's `integer` and `int` |
| 3 | `03_The_Smallest_Expression_A_Literal` | I | A term in its holder; a literal in each language, printed, read, inferred, evaluated; what no scalar holds |
| 4 | `04_Names` | I | A variable in each language; free names; names kept as written |
| 5 | `05_Operators` | I | `a + b * c` as a tree; parentheses and precedence across languages; operations as data; each language's arithmetic |
| 6 | `06_Calls_Members_And_Subscripts` | I | Properties, items and calls in each language, and what has no counterpart |
| 7 | `07_Bindings` | I | `let`, lambdas, quantifiers and comprehensions, each a variation of `let` |
| 8 | `08_Sublanguages` | I | Types, patterns, assertions and constraints as dialects of their own |
| 9 | `09_Constraints_As_Data` | II | today's 1 |
| 10 | `10_Answers_You_Can_Trust` | II | today's 2 |
| 11 | `11_Constraints_Over_Collections` | II | today's 3 |
| 12 | `12_Deciding_What_You_Can_Now` | II | today's 5 |
| 13 | `13_Analyzing_And_Rewriting_Constraints` | II | today's 6 |
| 14 | `14_One_Constraint_Many_Languages` | II | today's 7 |
| 15 | `15_Constraints_For_Firmware_And_Hardware` | II | today's 8 |

**How Part I shows a native expression and its model.** Each step pairs the language's own text with the model as the
dialect's holder writes it in fluent builder calls
([PRI-019: fluent builder syntax](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-019)),
never wire format, and asserts that the dialect's `Text.ToText` gives that text back. Where the native text is read,
Python3 in Python, Python's twin cell reads it with `Python3.Text.FromText` and asserts `Terms.same` with the built
model, while TypeScript's builds it, under the same case ID: the listed deliberate difference, as T07.3 does today
(Question 2). The examples below are Python's; TypeScript's are the same calls with arrow functions, ints as `bigint`s
(`42n`), `Map`s for records and camelCase reads, the differences `docs/EQUIVALENCE.md` lists. `S` is `store`'s holder
namespace, `store.Expressions`; `amd64` is `store.Instances.Expressions.SystemV.AMD64`.

Part I tells no story: each notebook starts from a store the toolkit gives, `dialects()`, beside `cold_chain()`: every
dialect installed and defined, TypeScript5's included, which `cold_chain()` lacks, and no cold chain schemas. Tutorial 1
builds its store by hand, since that is what it teaches.

### 1 · Values and their domains

Dialects: `ISOIEC11404`, `IEEE754`, `IEEE1164`, `Unicode`, and Excel's `error` for 01.5. API: `Builders.Store`, each
module's `install` and `define`, `store.Instances.Expressions.<Family>.Expressions`, `Framework.Domains` (`domains`,
`kind_of`, `properties`, `name_of`), `Framework.Standards` (`standards`, `find`, `tags`, `properties`),
`store.registered`.

| Step | What it shows |
|---|---|
| `01.1 · A store that holds domains` | The framework's install, then each standard dialect's, each in a transaction, then their `define`s; the singleton `store.Instances.Expressions.ISOIEC11404.Expressions`, found by its global name; a `define` run again writes nothing |
| `01.2 · A domain is data` | `Domains.domains(iso)`: `boolean`, `integer`, `octetstring`, `octet`, `modulo(256)`, in order; one by its path, `iso.domains({"name": "integer"})`; `Domains.name_of` |
| `01.3 · Its kind` | `Domains.kind_of(integer)` gives `("isoiec11404", "integer", record)`; the kinds ISO/IEC 11404 defines, read from `Expressions.ISOIEC11404.Expressions.DomainKind`'s branches: `boolean`, `integer`, `modulo`, `bitstring`, `octet`, `octetstring`, `state`, `packed` |
| `01.4 · Its parameters, and what follows from them` | `Domains.properties`: `integer` `{signed: True, overflow: "raise", ordered: True}`, unbounded, so no `least` or `greatest`; `modulo(256)` `{modulus: 256, least: 0, greatest: 255, ordered: True}`; IEEE 754's `binary64` and `binary32`, `format`, `rounding`, then `width`, `radix`, `precision`, `emax`; the inferred ones populated by hand until [CAP-043: constraints resolved in any direction](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-043.md) |
| `01.5 · Codes, strings, logic and states` | `octet` (codes 0 to 255, ordered, no arithmetic) against `modulo(256)` (the same values, wrapping arithmetic); Unicode's `string` (code points); IEEE 1164's `std_logic`; `state`, a kind no standard in scope stores a domain of, and Excel's `error`, Excel's own kind, the stored domain with `members` |
| `01.6 · Every domain a schema` | `integer`'s schema, `Expressions.ISOIEC11404.Expressions.integer`, an `OfAny` of `Schemas.OfInt`, related by `HasDomain`: the domain read from the schema and the schema from the domain; `modulo(256)`'s spelled `modulo_256` |
| `01.7 · Standards are data` | `Standards.standards(iso)`: `ISO/IEC 11404:2007`, its `bodies` `org.iso` and `ch.iec`, `number` and `revision`; `Standards.find` by designation |

The native side is the standard's own text; the model is what the dialect's `define` writes, read back:

```text
ISO/IEC 11404:  modulo(256)            type octet = new integer range (0..255)
IEEE 754:       binary64
```

```python
iso = store.Instances.Expressions.ISOIEC11404.Expressions
wrapping = iso.domains({"name": "modulo(256)"})
Domains.kind_of(wrapping)[:2], Domains.properties(wrapping)
# ('isoiec11404', 'modulo'), {'modulus': 256, 'least': 0, 'greatest': 255, 'ordered': True}
```

as written by the define's builder call, which 01.4 quotes:
`_.modulo_256.kind(lambda k: k.as_value(lambda a: a.as_union(lambda u: u.isoiec11404(lambda v: v.modulo(lambda d: d.modulus(256).least(0).greatest(255).ordered(True)))))))`.

### 2 · One value, a domain in each language

Dialects: `Python3`, `TypeScript5`, `C` with `SystemV.AMD64` and `Arm.AAPCS64`, `SystemVerilog`, `MATLAB`, `Excel`. API:
`Domains.domains`, `kind_of`, `properties`; `Standards.standards`. No term yet: each language's standard names the type
`42` takes, and this notebook reads that type's stored domain by name; tutorial 3 infers it from a literal.

| Step | What it shows |
|---|---|
| `02.1 · Each language's own domains` | Python3's (`bool`, `int`, `float`, `str`, `bytes`, `NoneType`, `ellipsis`) and TypeScript5's (`boolean`, `number`, `bigint`, `string`, `null`), each of a standard dialect's kind or its own: Python's `str` is Python3's own kind (lone surrogates are strings), not Unicode's `string`; the tokens `NoneType` and `null` have domains |
| `02.2 · 42 in Python and TypeScript` | Python's `int`, 11404's `integer`, unbounded; TypeScript's `number`, IEEE 754's `binary64`; and `42n`, a `bigint`, 11404's `integer` again |
| `02.3 · 42 in C, under an ABI` | C's own domains hold `int32_t` but no `int`; each ABI holds `int`, 32 bits on both; `char` differs: `integer` of width 8 on `SystemV.AMD64`, `modulo` 256 on `Arm.AAPCS64`; `long double` x87's extended format against `binary128` |
| `02.4 · 42 in SystemVerilog` | `integer` (kind `logic`, 4-state) and `int` (kind `bit`, 2-state), each 32 bits signed; `real` and `shortreal`, IEEE 754's |
| `02.5 · One value, many domains` | A table, read from the store, of the domain each language gives `42`: kind, width, signedness, range, and whether its range holds 42; MATLAB's `double` and Excel's `number` are `binary64` too |

```text
Python      42      int
TypeScript  42      number          42n  bigint
C           42      int             (the ABI's)
SystemVerilog  42   integer         int (2-state)
```

```python
amd64, aapcs64 = store.Instances.Expressions.SystemV.AMD64, store.Instances.Expressions.Arm.AAPCS64
"int" in Domains.domains(store.Instances.Expressions.C.Expressions)          # False: the ABI's
[Domains.properties(Domains.domains(abi)["char"]) for abi in (amd64, aapcs64)]
# [{'width': 8, 'signed': True, ...}, {'modulus': 256, 'least': 0, 'greatest': 255, ...}]
```

### 3 · The smallest expression, a literal

Dialects: Patterns, Python3, TypeScript5, C, SystemVerilog, Excel, MATLAB, LaTeX. API: each dialect's holder,
`S.<Family>.<Dialect>.Expression(lambda e: e.root(...))`, and C's `.abi([amd64])`; `Terms.term`, `form`, `kind_of`,
`dialect_of`, `same`; each `Text.ToText`; `Python3.Text.FromText` (Python); `DIALECT.infer`; each
`Evaluators.OfAny`; the writers `E.literal`, `P.constant`, `C.Expressions.literal`, `SystemVerilog.Expressions.constant`.

| Step | What it shows |
|---|---|
| `03.1 · A term, held by an expression` | Patterns' `42`: an expression, a reference object, whose `root` is a term, a value; `Terms.form` gives its kind, `literal`, and attributes, `{value: 42}`; the writer `E.literal(42)` writes the same term (`Terms.same`) |
| `03.2 · Read and printed` | Python3's `42`: Python reads it (`FromText`), TypeScript builds it; `ToText` gives `42` back; `0x2A` keeps its spelling, `text` and `base` 16, beside its value, 42 ([PRI-023: domain representations](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-023)) |
| `03.3 · The same literal in each language` | TypeScript5's (a float, `42.0`, its text `42`), C's (in a holder naming `amd64`), SystemVerilog's, Excel's (`=42`), MATLAB's and LaTeX's; each term holds its dialect (`Terms.dialect_of`), so none is another's |
| `03.4 · Its domain, inferred` | `DIALECT.infer(...)`: Patterns `int`, Python3 `int`, TypeScript5 `number`, C `int` (refused without an ABI), SystemVerilog `integer`: the domains tutorial 2 read; inference is code until [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md) |
| `03.5 · Its value` | Each evaluator: `42`, `42`, `42.0`, `42`, `32'sb...101010`; LaTeX has none |
| `03.6 · 2.5, a string, a boolean` | Patterns' `2.5`, `'hi'` and `True` translated to Python3, C, SystemVerilog, Excel, MATLAB and LaTeX: `True` is `True`, `true`, `1'b1`, `=TRUE`, `true`, `\mathrm{true}`; `'hi'` against `"hi"` in Python: the same value, not the same term (`Terms.same`), its spelling part of it |
| `03.7 · What no scalar holds` | Python's `2j`, `None` and `...`, Python3's `constant` (`complex`, two `binary64`s; `singleton`); TypeScript's `null` and a regular expression; C's `nullptr`; printed back; Python3's evaluator refuses `constant` by name |
| `03.8 · A literal kept as written, valid or not` | A literal whose text holds no value (`08`): its `text` and `problems`, which validation reports, and which evaluation refuses ([PRI-002: preserve, don't lose](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-002)) |

```text
Python   0x2A        TypeScript  42        C  42        SystemVerilog  42        Python  2j
```

```python
with store.transaction():
    py = S.Python.Python3.Expression(lambda e: e.root(
        lambda u: u.literal(lambda r: r.value(lambda v: v.as_scalar(42)).text("0x2A").base(16))))
    ts = S.TypeScript.TypeScript5.Expression(lambda e: e.root(
        lambda u: u.literal(lambda r: r.value(lambda v: v.as_scalar(42.0)).text("42"))))
    c = S.C.Expressions.Expression(lambda e: e.root(
        lambda u: u.literal(lambda r: r.value(lambda v: v.as_scalar(42)))).abi([amd64]))
    j = S.Python.Python3.Expression(lambda e: e.root(
        lambda u: u.constant(lambda k: k.complex(lambda z: z.real(0.0).imag(2.0)).text("2j"))))
Python3.Text.ToText(py), TypeScript5.Text.ToText(ts), C.Text.ToText(c), Python3.Text.ToText(j)
# ('0x2A', '42', '42', '2j')
TypeScript5.Expressions.DIALECT.infer(ts).name(), C.Expressions.DIALECT.infer(c).name()   # ('number', 'int')
```

### 4 · Names

Dialects: Patterns, Python3, TypeScript5, C, SystemVerilog, Excel, MATLAB. API: the `variable` kind's `name`
(TypeScript5's `identifier`); `Symbolics.free`; `DIALECT.validate(..., bound=...)`; `Evaluators.OfAny` with a scope;
`Translators.between`; the writers `E.variable`, `P.name`, `C.Expressions.identifier`.

| Step | What it shows |
|---|---|
| `04.1 · A variable` | Patterns' `x`: kind `variable`, attribute `name`; evaluated in a scope, `{"x": 42}`; unbound, it raises "variable 'x' is not bound", which `validate` reports first |
| `04.2 · A name in each language` | Python3's `variable` (`ast`'s `Name`), TypeScript5's `identifier`, C's `variable`, SystemVerilog's (`nameexpression` after stage 6), Excel's `variable` beside its `cell` (`A1`), MATLAB's; each printed `x` |
| `04.3 · Free names` | `Symbolics.free(term, DIALECT)`: what a term needs from its scope; Python's builtins are always bound, so `len(x)` needs `x` alone; TypeScript's `undefined` is an `identifier` |
| `04.4 · A name kept as written` | A name a language cannot spell (`max-temp` in Python) is kept in the tree, printed as written and reported by validation, "a name must be an identifier, got 'max-temp'", never renamed ([PRI-002: preserve, don't lose](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-002)) |
| `04.5 · Names across languages` | `x` translated from Patterns to each dialect, and back |

```text
Python  x      TypeScript  x      C  x      Excel  =x   =A1
```

```python
with store.transaction():
    ts = S.TypeScript.TypeScript5.Expression(lambda e: e.root(lambda u: u.identifier(lambda i: i.name("x"))))
    py = S.Python.Python3.Expression(lambda e: e.root(lambda u: u.variable(lambda v: v.name("x"))))
```

### 5 · Operators

Dialects: Patterns, Python3, TypeScript5, C, SystemVerilog, Excel, MATLAB, LaTeX. API: the operator kinds (Patterns'
`call`, Python3's `binop`, `unaryop`, `compare`, `boolop` and `parenthesized`, TypeScript5's `binaryexpression`,
`logicalexpression` and `parenthesizedexpression`, C's `binaryexpression` and `parenthesizedexpression`,
SystemVerilog's `binary`, Excel's `infix`, MATLAB's `binary`); `Terms.walk`, `Terms.fold`; `Translators.between`;
`Domains.operations`, `Domains.arity`; each evaluator.

| Step | What it shows |
|---|---|
| `05.1 · a + b * c is a tree` | Patterns' `add(a, mul(b, c))` in builder calls; `Terms.walk`, parents first; `Terms.fold`, children first, gives its depth and its text |
| `05.2 · The same tree in each language` | Python3's `binop`, TypeScript5's and C's `binaryexpression`, SystemVerilog's `binary`, Excel's `infix`, MATLAB's `binary`, LaTeX's: each prints `a + b * c` (MATLAB `a + b .* c`, LaTeX `a + b \cdot c`) |
| `05.3 · Parentheses are the printer's, or written` | `mul(add(a, b), c)` prints `(a + b) * c` in every language without a parenthesis in the tree; Python's `FromText` keeps none (`a + (b * c)` reads back `a + b * c`); the `parenthesized` kinds hold parentheses written as data |
| `05.4 · Precedence differs` | One tree, `eq(bitand(s, 4), 0)`: Python `s & 4 == 0`, C and SystemVerilog `(s & 4) == 0`, Excel `=BITAND(s, 4) = 0`; `not x > 1 and x < 5` against C's `!(x > 1) && x < 5` |
| `05.5 · Chains and n-ary logic` | Python's `2.0 <= x <= 8.0`, one `compare` of two `comparison`s, and `a and b and c`, one `boolop`; translated to Patterns, binary `and`s of `le`s |
| `05.6 · The operations a dialect defines are data` | Patterns' singleton names its operations (`get`, `has`, `eq`, ..., `entries`), each an expression schema, `Domains.arity`; a call of another (`div`) is refused by validation |
| `05.7 · Each language's arithmetic` | `2147483647 + 1`: Patterns and Python `2147483648`, C (AMD64) raises "signed overflow in +"; `-7 // 2` in Python is `-4`, C's `-7 / 2` is `-3`: the domains of tutorial 2 at work |

```text
Python  a + b * c    C  (a + b) * c    SystemVerilog  a + b * c    Excel  =a + b * c
```

```python
var = lambda n: lambda d: d.variable(lambda v: v.name(n))
with store.transaction():
    patterns = S.Patterns.Expressions.Expression(lambda e: e.root(lambda u: u.call(lambda c: c.callable("add").arguments([
        lambda t: t.patterns(var("a")),
        lambda t: t.patterns(lambda d: d.call(lambda m: m.callable("mul").arguments([
            lambda t: t.patterns(var("b")), lambda t: t.patterns(var("c"))])))]))))
    c = S.C.Expressions.Expression(lambda e: e.root(lambda u: u.binaryexpression(lambda b: b
        .left(lambda l: l.binaryexpression(lambda s: s.left(var("a")).operator("+").right(var("b"))))
        .operator("*").right(var("c")))).abi([amd64]))
C.Text.ToText(c)    # '(a + b) * c'
```

### 6 · Calls, members and subscripts

Dialects: Patterns, Python3, TypeScript5, C, SystemVerilog, Excel, MATLAB. API: Patterns' `get`, `item` and
`entries` calls, Python3's `attribute`, `subscript`, `slice`, `call` and its `keyword` helper, TypeScript5's
`memberexpression` and `callexpression`, C's `memberexpression`, `subscriptexpression` and `callexpression`,
SystemVerilog's `member`, `select`, `call` and `method`, Excel's `field` and `call`, MATLAB's `field`, `index` and
`call`; `Terms.Part`; `Translators.between`.

| Step | What it shows |
|---|---|
| `06.1 · A property` | Patterns' `get(x, 'celsius')` and each language's `x.celsius`: `attribute`, `memberexpression` (C's `.` or `->`), `member`, `field` |
| `06.2 · An item` | Patterns' `item(x, 0)`, from 0: Python `x[0]`, SystemVerilog `x[0]`, Excel `=INDEX(x, 0 + 1)`, MATLAB `x(0 + 1)`, the translator writing out one-based indexing; C has no counterpart, and the translator says so |
| `06.3 · A call` | Patterns calls an operation by name (`callable`), never a value; Python3's `call` applies any term (`func`) and Patterns refuses it ("Python3 call has no Patterns counterpart"); Excel's and MATLAB's functions; SystemVerilog's system functions and methods |
| `06.4 · A chain` | `a.b.c(d)[e:f]`: postfix operations nest left to right, the tree read by `Terms.walk` |
| `06.5 · Helpers are parts, not terms` | Python's `f(x, y=1)`: `y=1` is a `keyword`, a helper the form gives as a `Terms.Part`, its value a term |

```text
Python  x.readings[0]    Excel  =INDEX(x.readings, 0 + 1)    MATLAB  x.readings(0 + 1)    Python  f(x, y=1)
```

```python
with store.transaction():  # var, as in 5's example
    call = S.Python.Python3.Expression(lambda e: e.root(lambda u: u.call(lambda c: c
        .func(var("f")).args([var("x")])
        .keywords([lambda k: k.arg("y").value(lambda t: t.literal(lambda r: r.value(lambda v: v.as_scalar(1))))]))))
```

### 7 · Bindings

Built after the retrofit (Question 3). Dialects: Patterns, Python3, TypeScript5, Excel, MATLAB, SystemVerilog, LaTeX.
API: `let` (the framework's `Let`: `name`, `value`, `body`) and each binder refining it after the retrofit; Patterns'
`quantifier`; Python3's `lambda`, comprehensions (`listcomp`, `generatorexp`, their `comprehension` helpers) and
`namedexpr`; TypeScript5's `arrowfunctionexpression`; Excel's `let` and `map`, MATLAB's `arrayfun`, SystemVerilog's
`iterate`; `Symbolics.free`; `Translators.between`.

| Step | What it shows |
|---|---|
| `07.1 · let` | Patterns' `let c = get(s, 'celsius') in and(ge(c, 2.0), le(c, 8.0))`: `c` bound in the body alone, so `Symbolics.free` gives `s` |
| `07.2 · let in each language` | Python `(lambda c: c >= 2.0 and c <= 8.0)(s.celsius)`, Python3's extension; Excel `=LET(c, s.celsius, AND(...))`; LaTeX `... \quad \text{where } c = ...`; C, SystemVerilog and MATLAB, which have none, substitute the value |
| `07.3 · A lambda` | Python's `lambda x: x + k` and TypeScript's `(x) => x + k`: parameters bind the body, so only `k` is free |
| `07.4 · Quantifiers bind too` | Patterns' `all(s.readings, c => le(c, 8.0))`: Python `all(c <= 8.0 for c in s.readings)`, Excel `MAP` and `LAMBDA`, MATLAB `arrayfun`, SystemVerilog `s.readings.and(c) with (c <= 8.0)`; C and LaTeX have none |
| `07.5 · Comprehensions and named expressions` | Python's `[p.pin for p in ports if p.pin > 0]` (`ports` free) and `(y := f(x))`, which binds in its enclosing scope |
| `07.6 · Every binder a variation of let` | After the retrofit: each binding kind refines the framework's `Let`, so the framework reads any of them as a binder |

### 8 · Sublanguages: types and patterns

Built after the retrofit (Question 3). Dialects: C's and TypeScript5's types, Python3's and TypeScript5's patterns, and,
from stage 6, SystemVerilog's `Types`, `Patterns`, `Assertions` and `Constraints` dialects; after the retrofit, each
language's type, pattern and regular-expression dialects. API: each sublanguage dialect's holder (stage 6, "Q2"), the
host's union branches that reference it, `Text.ToText`.

| Step | What it shows |
|---|---|
| `08.1 · A type is not a term` | C's `(uint8_t)200`, a `castexpression` whose `type` is a type name; TypeScript's `x as string`, a `tsasexpression` whose `typeAnnotation` is a type |
| `08.2 · A binding target is a pattern` | Python's comprehension target and TypeScript's `[a, b = 1]`, each its dialect's patterns |
| `08.3 · Each sublanguage a dialect, with its holder` | A type, a pattern, a sequence or a constraint as an expression's root, in its own dialect's holder, referenced from its host's unions |
| `08.4 · SystemVerilog's assertions and constraints` | A sequence (`a ##1 b`) and a constraint (`x inside {[0:9]}`), modeled and printed, not evaluated (stage 6, "Q11") |
| `08.5 · Regular expressions` | TypeScript's `/a+/gu`, today TypeScript5's `constant` (`pattern`, `flags`), after the retrofit a regular-expression dialect's term |

The exact kinds and holders of 08 are stage 6's and the retrofit's, so its examples are written when they land.

### Part II · constraints

Today's seven case studies, renumbered 9 to 15, each keeping its story, its steps and their titles, but for two steps
whose content Part I now teaches whole. Trimmed of what Part I teaches, each step points back to it in a sentence:

| Today | Becomes | Trimmed |
|---|---|---|
| 1 · Constraints as data | 9 | 01.1's account of terms, roots and writers points to tutorial 3; 01.3, `Terms.same`, removed: tutorial 3 (03.6) and 13.4 teach it |
| 2 · Answers you can trust | 10 | 02.4 points to tutorial 2 for why `int` and `float` are different domains |
| 3 · Constraints over collections | 11 | none |
| 5 · Deciding what you can now | 12 | none |
| 6 · Analyzing and rewriting constraints | 13 | 06.1's account of forms and `walk` points to tutorial 5 |
| 7 · One constraint, many languages | 14 | 07.3 points to tutorial 3 for `FromText`; 07.5, a dialect's operations and domains as data, removed: tutorials 1 and 5 (01.2 to 01.4, 05.6) teach it |
| 8 · Constraints for firmware and hardware | 15 | 08.1's account of the ABI dialects points to tutorial 2 (02.3); 08.3's of SystemVerilog's types too |

The gap at 4 closes by the renumbering. *Values with widths* stays deferred with domain inference, as the user decided;
when [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)
lands, its steps join tutorials 2, 3 and 15 as further steps, numbered after their last, so that no anchor moves again.

## The anchors that move

Every step of Part II moves; Part I's anchors, `T01.1` to `T08.5`, are new, and reuse today's numbers for other steps,
so the build relinks every tutorial link in the skill in one commit. "Linked" names the files that link it today:
`K` the skill's `SKILL.md`, `D` its `references/dialects.md`, `R` its `references/translating.md`, `E`
`docs/EQUIVALENCE.md`.

| Today | Becomes | Linked | | Today | Becomes | Linked |
|---|---|---|---|---|---|---|
| T01.1 | T09.1 | K | | T05.4 | T12.4 | K |
| T01.2 | T09.2 | K | | T06.1 | T13.1 | K |
| T01.3 | removed (T03.6, T13.4) | | | T06.2 | T13.2 | K |
| T01.4 | T09.3 | K | | T06.3 | T13.3 | K |
| T01.5 | T09.4 | K | | T06.4 | T13.4 | K |
| T01.6 | T09.5 | K | | T06.5 | T13.5 | K, R |
| T02.1 | T10.1 | K | | T07.1 | T14.1 | K, D, R |
| T02.2 | T10.2 | K | | T07.2 | T14.2 | K, D, R |
| T02.3 | T10.3 | K | | T07.3 | T14.3 | K, D, R |
| T02.4 | T10.4 | K | | T07.4 | T14.4 | K, D |
| T02.5 | T10.5 | K | | T07.5 | removed (T01.2 to T01.4, T05.6) | K, E |
| T03.1 | T11.1 | K | | T08.1 | T15.1 | K, D |
| T03.2 | T11.2 | K | | T08.2 | T15.2 | D |
| T03.3 | T11.3 | K | | T08.3 | T15.3 | K, D |
| T03.4 | T11.4 | K | | T08.4 | T15.4 | D |
| T03.5 | T11.5 | K | | T08.5 | T15.5 | R |
| T05.1 to T05.3 | T12.1 to T12.3 | K | | | | |

The skill's practice 12 (dialects, operations and domains are data) relinks T07.5 to T01.2, T01.3, T01.4 and T05.6;
`docs/EQUIVALENCE.md`'s row "Domains' reading interface" cites T01.3 in its place. Part I also gives the skill cases it
lacks for what it already teaches: practice 1 (a term in its holder: T03.1), 3 (no coercion: T02.2), 8 (forms: T05.1),
9 (each language's text: T03.2, T05.4), 11 (a dialect reads only its own terms: T03.3), 12 (each language's domains:
T02.1 to T02.4, T03.4) and "In each language" (Python's `FromText`: T03.2). SKL-03's count of links checked changes
with them. Each link is written in both languages' paths, as now.

## Stage 6, and the retrofit

Stage 6, `SystemVerilog` complete over IEEE 1800-2023, Verilog its subset
([CAP-231: the SystemVerilog expression dialect, complete](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-231.md)),
is in progress on `stage6-systemverilog`; the retrofit of the other dialects follows it, both in 0.10.0
([CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided)).
What they change here, as the dialects proposal records them
([Decided for stage 6](../dialects/README.md#decided-for-stage-6-systemverilog-and-after-2026-11-05)):

- **SystemVerilog's names** become `nameexpression`, with no `variable` ("Q4"): tutorial 4's SystemVerilog example, and
  every SystemVerilog translation's tree in 5, 6, 7 and 15.
- **Its literals** split into `literal` (scalars, unsized integers, reals, strings, time literals) and its `constant`
  (4-state vectors, fills, `null`) ("Q3"): tutorial 3's SystemVerilog steps and 15.4's `x` and `z`.
- **Its editions as data**, IEEE Std 1800-2005 to 1800-2023 and IEEE Std 1364
  ([CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md)):
  02.4 reads them, where today SystemVerilog covers none.
- **Its sublanguages as dialects**, `Types`, `Patterns`, `Assertions`, `Constraints`, `Preprocessor`, each with a
  holder ("Sublanguages are dialects", "Q2"): tutorial 8.
- **No new evaluation** ("Q11"): its new kinds are modeled and printed only, so Part I evaluates SystemVerilog only in
  the kinds it evaluates today.
- **The retrofit**: every binding kind refines the framework's `Let` ("Q8") and the other dialects' types, patterns,
  regular expressions and preprocessors become dialects: tutorials 7 and 8.

So nothing is built until stage 6 merges: tutorials 1 to 6 and Part II then; 7 and 8 after the retrofit, if the user
agrees (Question 3). Part II's 15 is re-executed after stage 6 either way, since its SystemVerilog outputs change.

## The build plan

Once the user decides and stage 6 merges, on a branch `tutorials`, each agent in a workspace of its own
([PRI-029: parallel work in polyrepo workspaces](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-029)),
`polyrepo.py workspace ../worktrees/tutorials-<part> --branch tutorials-<part>`, merged into `tutorials` by the
coordinator. Every notebook is written in both languages by the same agent, in the same commit
([PRI-028: both implementations change together](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-028)).

1. **Scaffold, first, alone** (one agent): the toolkits' `dialects()` in `toolkit.py` and `toolkit.ts`; Part II's
   notebooks renamed (`git mv`, 01 to 09, ..., 08 to 15), their titles, headings and anchors renumbered, T01.3 and
   T07.5 removed; both tutorials READMEs rewritten for the two parts; the skill relinked to the new Part II anchors
   and synced (`skills/sync.sh`); `docs/EQUIVALENCE.md`'s Tutorials section and its T07.5; the README's, AGENTS.md's
   and llms.txt's account of the tutorials; SKL-05, below; `update_doc_links.py`. Everything later touches only its own
   notebooks, so the rest runs in parallel without conflicts.
2. **Part I, in parallel** (six agents, one per tutorial, 1 to 6): each writes its notebook pair and nothing else, and
   reports the skill links its steps should carry. Tutorials 7 and 8 follow the retrofit, the same way (two agents).
3. **Part II's trimming, in parallel with 2** (one agent): the trims above, in the seven renamed notebooks.
4. **Integration, last** (the coordinator): the skill's new links to Part I (SKL-04 then finds no section without a
   case), synced; both suites and both gates; the link checks; one pull request.

**Gates**, each checked before a part merges into `tutorials`, and all at the end:

- **Both languages, the same case IDs**: each notebook in both languages, the same `## NN.k · title` headings in the
  same order, each step's markdown cell starting with its `<a id="Tnn.k"></a>`
  ([PRI-035: tests are notebooks: one suite each, the same case IDs in the same order in both languages](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-035),
  [PRI-038: the same cases in both languages](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-038)),
  checked by a new case in both suites, SKL-05, "Every tutorial has the same steps in both languages", since nothing
  checks it today.
- **The same outputs**: each step prints the same values in both languages but for the differences
  `docs/EQUIVALENCE.md` lists (`42n` against `42`, `Map`s), the toolkit's `show` writing floats alike.
- **Outputs committed**: each notebook executed top to bottom in a fresh kernel (Python's, and Deno's for TypeScript),
  committed with its outputs, written as JSON with `indent=1`, `sort_keys=True` and `ensure_ascii=False`
  ([PRI-034: tutorials run as tests, committed with their outputs](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-034)).
- **Run by both suites**: `uv run coverage run -m pytest && uv run coverage combine && uv run coverage report` and
  `npm run coverage`, both at 100% ([PRI-039: 100% coverage of both](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-039));
  SKL-01, SKL-03, SKL-04 and SKL-05 pass.
- **The documents**: `update_doc_links.py` run; `update_link_forms.py --check`, `update_doc_titles.py --check` and
  `update_item_titles.py --check` clean.

## Items

On approval, one capability in mbse-basis, under
[FEA-057: documentation organized by semantic role](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-057.md),
relating to [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md):
*mbse-expressions' tutorials, from domains and trivial expressions up*: tutorials in both languages that teach how
values, their domains and each language's expressions are modeled, from one literal up, before constraints, each step a
case run in both languages. Its ID is assigned when it is added. This proposal is drained into it once built.

## Decided by an agent, for review

Minutiae this proposal settles, each the simplest default consistent with the records:

- **One series, not two**: Part I and Part II share each language's `tutorials/` and README, since
  `update_doc_links.py` orders one series per language, and the numbers run on.
- **Part I has no story**, and its own toolkit store, `dialects()`; Part II keeps the cold chain.
- **`state` is shown as a kind, with no domain**: no tutorial invents a fixture domain, since a program's own enums get
  none; Excel's `error` shows a stored domain with members.
- **SystemVerilog's `42` is shown as `integer`**, its inferred domain, with `int` beside it, where the request said
  `int`.
- **Two Part II steps are removed** (T01.3 and T07.5), since Part I teaches them whole, and the steps after T01.3 are
  renumbered within tutorial 9, so that no tutorial's steps have a gap either.
- **Deferred steps join where they belong without renumbering**: *Values with widths*, when domain inference lands,
  as further steps of 2, 3 and 15.
- **SKL-05, new, in both suites**, checks that every tutorial has the same steps in both languages.
- **The findings fixed in the build**: the skill's "Names" section corrected for `Domains` and `Standards`
  (finding 5), and the keyword-tagged kinds' `getattr` listed in `docs/EQUIVALENCE.md` (finding 6). Finding 4,
  Python's `FromText` dropping parentheses, is `ast`'s, and stays as built: 05.3 says so.

## Questions for the user

1. **Writers or builder calls in Part I.** [PRI-019: fluent builder syntax](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-019)
   prefers the builders' own calls and calls helpers that wrap them "another DSL"; this repository's writers
   (`E.literal(2.0).le(celsius)`, `P.binop(...)`) are such helpers, and Part II, the skill and the README teach them.
   (a) Part I writes every model in builder calls, and shows each dialect's writers once, in 03.1, as the shorthand
   Part II uses, asserting `Terms.same`; (b) builder calls only, writers nowhere in Part I; (c) writers throughout, as
   today. **Recommended: (a)**: the model is what the builders write, and Part II stays as it is until writers are
   decided on their own.
2. **Native text read, or only printed.** Only Python3 is read from text, and only in Python; reading TypeScript, C,
   SystemVerilog and the rest is mbse-programs' ([PRI-011: the lowest repository that can own it](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-011)).
   (a) Part I builds each model and asserts `ToText` gives the native text, Python's twins also reading Python3 with
   `FromText`, the listed difference; mbse-programs' tutorials add reading each language when its port lands; (b)
   parsers here for each dialect, in both languages, first; (c) Part I waits for mbse-programs. **Recommended: (a)**:
   it teaches the correspondence in both languages now, and adds no parser where the records place parsing elsewhere.
3. **When tutorials 7 and 8 are built.** Bindings as variations of `let` and sublanguages as dialects are the
   retrofit's, after stage 6, in 0.10.0. (a) Tutorials 1 to 6 and Part II when stage 6 merges, 7 and 8 after the
   retrofit; (b) all eight when stage 6 merges, 7 and 8 teaching today's binders and in-dialect unions, revised by the
   retrofit; (c) everything after 0.10.0. **Recommended: (a)**: nothing is written twice, and most of Part I is not
   held up by the retrofit.

---

<!-- nav -->
[← Domains as data](../domains/README.md) · [Home](../../../README.md)
