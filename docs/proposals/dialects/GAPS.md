<!-- nav -->
[← Complete expression dialects](README.md) · [Home](../../../README.md)

# The gaps, dialect by dialect (the survey's tables)

What [the proposal](README.md) rests on. Counted on 2026-11-02 in mbse-expressions 0.7.0 (`ce3a3cc`, both languages
alike) and mbse-programs 0.3.28 (its committed grammar dumps, `conformance/*/<Language>.grammar.json`, byte-identical
in both languages, checked against each `Syntax.py`). Nothing here is decided.

## mbse-expressions' dialects today

Every dialect adds its own kinds to the one union `Expressions.Framework.Term` by schema extension, tagged
`<dialect>_<kind>`, and reuses the framework's `literal`, `variable`, `let`, `call`, `list` and `mapping` where the
shape matches ([API](../port/API.md), Settled in stage 2b, 10 and 15).

| Dialect | Own kinds | Framework kinds reused | Reads text | Writes text | Evaluator | Translators |
|---|---|---|---|---|---|---|
| Basic | 1: `quantifier` | all six | none | none | yes, three-valued | the hub: to and from each of the other six |
| Python | 12: `attribute`, `subscript` (a `str` key), `index`, `call` (a term callee), `compare`, `boolop`, `binop`, `unaryop`, `ifexp`, `generator`, `import`, `importfrom` | `literal`, `variable`, `let`, `list`, `mapping` | `Text.FromText`, through CPython's `ast`, **in Python only** (TypeScript has none: a listed deliberate difference, DIA-01) | `Text.ToText` | Python's rules: an interpreter in Python, a model of Python's rules in TypeScript (DIA-02's tables) | Basic, Matlab, Excel, Latex |
| Ccpp | 7: `constant` (with C's `type`), `unary`, `binary`, `conditional`, `cast`, `member`, `subscript` | `variable`, `call` | none | `Text.ToText` | C's rules | Basic |
| SystemVerilog | 14: `vector`, `unary`, `binary`, `conditional`, `concatenation`, `replication`, `select`, `range`, `inside`, `span`, `cast`, `member`, `method`, `iterate` | `literal`, `variable`, `call` | none | `Text.ToText` | IEEE 1800's rules, 4-state | Basic |
| Matlab | 6: `binary`, `unary`, `field`, `index`, `arrayfun`, `import` | `literal`, `variable`, `call`, `list` | none | `Text.ToText` | MATLAB's rules | Basic, Python, Excel, Latex |
| Excel | 5: `cell`, `map`, `infix`, `prefix`, `field` | `literal`, `variable`, `let`, `call`, `list` | none | `Text.ToText` | Excel's rules | Basic, Python, Matlab, Latex |
| Latex | 4: `binary`, `unary`, `frac`, `member` | `literal`, `variable`, `call`, `let` | none | `Text.ToText` | none, by design | Basic, Python, Matlab, Excel |

Twelve translators, each both ways (`Translators/Basic_<X>` for six, and the six pairs among Python, Matlab, Excel and
Latex). Six of them touch a dialect this proposal renames or splits: Basic_Python, Python_Matlab, Python_Excel,
Python_Latex, Basic_Ccpp, Basic_SystemVerilog.

No dialect depends on a parser package: the only text reader is Python's `ast`, from the standard library.

What each dialect touches, in each language (the same cases under the same IDs):

| | Tests | Tutorials | Corpus (JSON and YAML, in each language) |
|---|---|---|---|
| Python | DIA-01, DIA-02, DIA-10; TRN-01 to TRN-07, TRN-10, TRN-14; FRM; CONF | 1, 2, 3, 5, 6, 7, 8 | `python` |
| Ccpp | DIA-11, DIA-12; TRN-08; FRM; CONF | 8 | `ccpp` |
| SystemVerilog | DIA-13 to DIA-15; TRN-09, TRN-11; FRM; CONF | 8 | `systemverilog` |
| Matlab, Excel, Latex | DIA-03 to DIA-09, DIA-16, DIA-17; TRN | 2, 7 | `matlab`, `excel`, `latex` |

In all: 11 suites, 92 cases a language (EXP 12, EVL 7, VIS 2, CONF 4, FRM 10, DIA 17, TRN 14, SKL 3, DOM 11, COL 8,
PAR 4); 7 tutorials (the fourth deferred); 9 corpus cases, 36 files.

## mbse-programs' expression kinds today

Each language is a set of kinds in categories. Its standards record, for each kind and feature, the versions that have
it (`SINCE`, `FEATURES`), and `EXTENSION` marks a kind no standard has.

| | Python | TypeScript | Ccpp | Verilog |
|---|---|---|---|---|
| Kinds, in all | 86 | 163 | 171 | 281 |
| Expression category (literals included) | 29 | 35 (2 of them JSX, an extension) | 46 (37, and 9 literals) | 40 (34, and 6 literals) |
| Helpers that expressions hold | 11 | 5, and 11 of JSX | 16, and 7 names | 5, 4 connections, 7 names, attributes |
| Borderline: sublanguages expressions hold | patterns 8 (`match`), type parameters 3 | patterns 4 (destructuring), type nodes 37 | type ids, specifiers that hold expressions (`decltype`) | patterns 4, properties 9, sequences 6, timing controls 5, constraints 8, data types 10 |
| Statements an expression holds | none | function, arrow function and class bodies | a lambda's body, GNU statement expressions | `randomize() with` constraint blocks |
| Parser | tree-sitter-python 0.25.0 | tree-sitter-typescript 0.23.2 | tree-sitter-cpp 0.23.4 | slang, through pyslang 12.0.0 |
| Its known lag | three constructs of Python 3.13 and later, blanked by a pre-pass and restored | `accessor`, `in` and `out` variance, `import defer`, `export type *` (TypeScript 4.7 and later), by a pre-pass | modules, imports, `export`, `extern template` (C++20), by a pre-pass that always runs | none known: slang reads IEEE 1800-2023 |
| Standards defined | `PythonStandard(major, minor)`; `Python312`, `Python314` | `TypeScriptStandard(major, minor, jsx)`, `ECMAScriptStandard(year, jsx)`; `TypeScript50`, `TypeScript59`, `ECMAScript2020`, `ECMAScript2025` | `CcppStandard(year, family)`; `Ccpp17`, `Ccpp20`; no C module ships | `VerilogStandard(year, family)`; `Verilog2005`, `SystemVerilog2017`, `SystemVerilog2023` |

Both implementations parse with the same grammars: Python through `tree-sitter`'s bindings, TypeScript through
`web-tree-sitter` (WASM). Verilog is read in Python alone; TypeScript runs Python's reader in a subprocess and reads its
tree back as a snapshot (the "Verilog reader exchange", VLGRD-01 to 13). Every parser refuses invalid syntax: tree-sitter's
`ERROR` and `MISSING` nodes, and slang's error diagnostics, raise `ParseError` at the first one; no kind holds them.

## Python3

The standard: CPython's `ast` module, whose 29 `expr` kinds are the same in Python 3.14.7 and 3.15.0rc2 (checked
here); 3.15's unpacking in comprehensions (`[*x for x in y]`) is a `Starred` element, a new feature of an existing kind,
not a new kind. Its helpers are `comprehension`, `arguments`, `arg` and `keyword`, and the enumerations of operators.

| `ast` kind | mbse-expressions `Python` | mbse-programs `Python` | To do |
|---|---|---|---|
| `Constant` | `literal` (five basic scalars; no `None`, `...`, complex) | `Constant` (`spelling`), `ConcatenatedString` | merge: the spelling, `None`, `...`, complex |
| `Name` | `variable` | `Name` | keep, or rename |
| `Attribute` | `attribute` | `Attribute` | keep |
| `Subscript`, `Slice` | `subscript` (a `str` key), `index` | `Subscript`, `Slice` | merge: one `Subscript`, `Slice` added |
| `Call`, `keyword` | `call` (positional only) | `Call`, `Keyword` | merge: keywords added |
| `Compare` | `compare` (one operator; `is` and `is not` refused) | `Compare` of `Comparison`s, a chain | merge: chains, `is`, `is not` |
| `BoolOp` | `boolop` (two operands) | `BoolOp` (n operands) | merge: n operands |
| `BinOp` | `binop` (`@` refused) | `BinOp` | merge: `@` |
| `UnaryOp`, `IfExp` | `unaryop`, `ifexp` | `UnaryOp`, `IfExp` | keep |
| `GeneratorExp`, `comprehension` | `generator` (one `for` over a name) | `GeneratorExp`, `Comprehension` | merge: several `for`s, targets, `async` |
| `ListComp`, `SetComp`, `DictComp` | none | the same | add |
| `List`, `Dict` | the framework's `list`, `mapping` | `List`, `Dict` of `DictItem`s (`**` unpacking) | merge: unpacking; question 1 |
| `Tuple`, `Set`, `Starred` | none | the same | add |
| `Lambda`, `arguments`, `arg` | the framework's `let`, as `(lambda name: body)(value)` | `Lambda`, `Arguments`, `Arg` | add; question 1 for `let` |
| `NamedExpr`, `Await`, `Yield`, `YieldFrom` | none | the same | add |
| `JoinedStr`, `FormattedValue` | none | `JoinedStr`, `FormattedValue`, `FormatSpec`, `StringText` | add |
| `TemplateStr`, `Interpolation` (3.14) | none | the same | add |
| none | `import`, `importfrom`, binding a name within an expression | statements `Import`, `ImportFrom` | only in mbse-expressions: question 1 |
| none | none | `Parenthesized` (concrete syntax) | only in mbse-programs: question 1 |
| patterns (`match`), type parameters | none | `Match*` 8, `TypeVar`, `ParamSpec`, `TypeVarTuple` | statements' parts, not expressions; question 8 |

## TypeScript5

The standard: the TypeScript compiler's syntax kinds (5.9.3 installed here), ESTree as typescript-estree has it
(mbse-programs' names follow it), and tree-sitter-typescript. mbse-expressions has no TypeScript dialect: every kind is
new. mbse-programs' 35 expression kinds, their helpers, and the sublanguages they hold:

| Group | mbse-programs kinds | Notes |
|---|---|---|
| Names and literals | `Identifier`, `PrivateIdentifier`, `Literal` (`raw`), `TemplateLiteral`, `TemplateElement`, `TaggedTemplateExpression`, `ThisExpression`, `Super` | `Identifier` doubles as a parameter (`typeAnnotation`, `decorators`) |
| Displays | `ArrayExpression`, `ObjectExpression`, `Property`, `SpreadElement`, `Elision` | |
| Operators | `UnaryExpression`, `UpdateExpression`, `BinaryExpression`, `LogicalExpression`, `AssignmentExpression`, `ConditionalExpression`, `SequenceExpression` | assignment holds patterns |
| Access and calls | `MemberExpression`, `CallExpression`, `ChainExpression`, `NewExpression`, `MetaProperty`, `ImportExpression` | |
| Functions and classes | `FunctionExpression`, `ArrowFunctionExpression`, `ClassExpression`, `TSEmptyBodyFunctionExpression` | bodies are statements: question 8 |
| Control | `AwaitExpression`, `YieldExpression`, `ParenthesizedExpression` | |
| TypeScript's own | `TSAsExpression`, `TSSatisfiesExpression` (4.9), `TSTypeAssertion`, `TSNonNullExpression`, `TSInstantiationExpression` (4.7), `TSTypeParameterInstantiation` | hold types: question 8 |
| JSX (an extension) | `JSXElement`, `JSXFragment`, and 11 helpers | question 8 |
| Patterns | `ArrayPattern`, `ObjectPattern`, `AssignmentPattern`, `RestElement` | |
| Types | 37 type nodes (`TSUnionType`, `TSConditionalType`, `TSMappedType`, `TSTemplateLiteralType`, ...) | question 8 |

## C11, C17, C23

The standard: ISO/IEC 9899:2011, 6.5 and Annex A.2.1 (C17 is its technical corrigenda, with no new syntax), and
9899:2024 (C23); read through tree-sitter-c or tree-sitter-cpp (mbse-programs reads C with tree-sitter-cpp).

| C's expression syntax | mbse-expressions `Ccpp` | mbse-programs `Ccpp` | Since |
|---|---|---|---|
| identifier | `variable` | `IdExpression` of an `Identifier` | |
| constants | `constant` (`value`, and C's `type`, written with a suffix or a cast) | `IntegerLiteral`, `FloatingLiteral`, `CharacterLiteral` (`spelling`, `prefix`, `text`) | |
| string literals | `constant` (a `str`) | `StringLiteral`, `ConcatenatedString` | |
| `( expression )` | none | `ParenthesizedExpression` | |
| `_Generic` | none | `GenericSelection`, `GenericAssociation` | C11 |
| `a[i]` | `subscript` | `SubscriptExpression` | |
| `f(args)` | `call` (a callee by name) | `CallExpression` (a callee expression) | |
| `.`, `->` | `member` | `MemberExpression` | |
| postfix and prefix `++`, `--` | none | `PostfixExpression`, `UnaryExpression` | |
| compound literal, initializer lists, designators | none | `CompoundLiteralExpression`, `InitializerList`, `DesignatedInitializer`, `FieldDesignator`, `IndexDesignator` | C99 |
| unary `& * + - ~ !` | `unary` (`+ - ! ~` only) | `UnaryExpression` | |
| `sizeof`, `_Alignof` / `alignof` | none | `SizeofExpression`, `AlignofExpression`, `TypeId` | `_Alignof` C11, `alignof` C23 |
| `(type) e` | `cast` (to an arithmetic type) | `CastExpression` (any type name) | |
| binary operators | `binary` | `BinaryExpression` | |
| `?:` | `conditional` | `ConditionalExpression` | |
| assignment operators, `,` | none | `AssignmentExpression`, `BinaryExpression` (`,`, to check) | |
| `true`, `false`, `nullptr` | `constant` (a `bool`) | `BooleanLiteral`, `NullptrLiteral` | C23 |
| GNU `({ ... })`, `__extension__` | none | `StatementExpression`, `ExtensionExpression` (extensions) | none |

## Cpp17, Cpp20, Cpp23

The standard: ISO/IEC 14882:2017, 2020 and 2024 (C++23), Annex A's expressions; read through tree-sitter-cpp, which
mbse-programs records as lagging C++23. Beyond C's (above), every one only in mbse-programs:

| C++'s expression syntax | mbse-programs `Ccpp` | Since |
|---|---|---|
| `this`, qualified and template names, operator, conversion and destructor names | `ThisExpression`, `IdExpression` of `QualifiedName`, `TemplateId`, `OperatorName`, `ConversionName`, `LiteralOperatorName`, `DestructorName` | |
| `T(x)`, `T{x}`, `static_cast` and the other named casts, `typeid` | `FunctionalCastExpression`, `NamedCastExpression`, `TypeidExpression` | |
| `new`, `delete`, `throw`, `noexcept(e)`, `sizeof...` | `NewExpression`, `DeleteExpression`, `ThrowExpression`, `NoexceptExpression`, `SizeofPackExpression` | `noexcept`, `sizeof...` C++11 |
| raw strings, user-defined literals | `RawStringLiteral`, `UserDefinedLiteral` | C++11 |
| lambdas | `LambdaExpression`, `LambdaDeclarator`, 4 captures | C++11; template parameters C++20; attributes C++23 |
| pack expansion, fold expressions | `PackExpansion`, `FoldExpression` | C++11, C++17 |
| `requires` expressions | `RequiresExpression`, 4 requirements | C++20 |
| `co_await`, `co_yield`, `<=>` | `AwaitExpression`, `YieldExpression`, `BinaryExpression` | C++20 |
| designated initializers | `DesignatedInitializer` | C++20 |
| `a[i, j]` | `SubscriptExpression` (`indices`) | C++23 |
| pack indexing, reflection, splices | `PackIndexingExpression`, `ReflectExpression`, `SpliceExpression` | C++26: outside `Cpp23` |

## SystemVerilog

The standard: IEEE 1800-2023, Annex A.8 (expressions and primaries), A.6.7.1 (patterns), A.1.10 (constraints) and A.2.10
(assertions), read through slang; IEEE 1364-2005, Verilog, a subset ("keep verilog as a subset of systemverilog").

| SystemVerilog's expression syntax | mbse-expressions `SystemVerilog` | mbse-programs `Verilog` |
|---|---|---|
| unsized constants, sized vectors | `literal`, `vector` | `IntegerLiteral` (`spelling`) |
| reals, strings, time, `'0 '1 'x 'z`, `null` | `literal` (reals, strings) | `RealLiteral`, `StringLiteral`, `TimeLiteral`, `UnbasedUnsizedLiteral`, `NullLiteral` |
| names, hierarchical and scoped | `variable`, `member` | `NameExpression` of 7 kinds of name, `MemberExpression` |
| unary, binary, `?:` | `unary`, `binary`, `conditional` | `UnaryExpression`, `BinaryExpression`, `ConditionalExpression` (with attributes) |
| `++`, `--`, assignments within expressions | none | `IncrementExpression`, `AssignmentExpression` |
| `{a, b}`, `{n{a}}` | `concatenation`, `replication` | `Concatenation`, `Replication` |
| `a[i]`, `a[m:l]`, `a[b+:w]`, `a[b-:w]` | `select`, `range` (`:` only) | `IndexExpression`, `RangeSelect` |
| `inside`, ranges | `inside`, `span` | `InsideExpression`, `ValueRange` (tolerance 2023) |
| casts | `cast` (a built-in type, `signed`, `unsigned` or a width) | `CastExpression` (any data type) |
| calls, system calls | `call` | `CallExpression`, `SystemCall`, connections as arguments |
| array methods, `with` | `method`, `iterate` | `CallExpression` of a `MemberExpression`, `ArrayMethodWithExpression` |
| assignment patterns `'{...}`, streaming `{<< {...}}` | none | `AssignmentPattern`, `PatternItem`, `StreamingConcatenation`, `StreamItem` |
| `tagged`, `matches`, `&&&` | none | `TaggedExpression`, `MatchesExpression`, `PredicateExpression`, 4 patterns |
| `dist` | none | `DistExpression`, `DistItem` |
| `this`, `super`, `$`, `$root`, `{}`, `new` | none (the bridge maps the variable `this`) | `ThisExpression`, `SuperExpression`, `DollarExpression`, `RootExpression`, `EmptyQueue`, `NewExpression`, `NewCopyExpression`, `NewArrayExpression` |
| `randomize() with`, min:typ:max, macros | none | `RandomizeWithExpression`, `MinTypMaxExpression`, `MacroUsage` |
| sequences and properties (assertions), event expressions | none | 9 properties, 6 sequences, 5 timing controls: question 8 |

## Native parsers, in both languages

Checked on 2026-11-02 against the registries and the lockfiles. A grammar of tree-sitter gives the same tree in both
languages: `tree-sitter` (Python, 0.26.0) and `web-tree-sitter` (WASM, 0.27.1) load the same grammar version, each npm
package shipping its `.wasm`, which is how mbse-programs parses today. Where an error is recovered is the runtime's
code, not the grammar's, so recovered trees match only if both runtimes are pinned alike. Every reference front end
runs in one language only.

| Dialect | tree-sitter grammar, both languages | Its lag | Reference front end | Its runtime |
|---|---|---|---|---|
| Python3 | tree-sitter-python 0.25.0 | no type parameter defaults (3.13), no unpacking in comprehensions (3.15); t-strings read as plain strings | CPython's `ast`, exact for the running minor version; refuses invalid syntax (`SyntaxError`), no recovery | Python; in Node only through Pyodide or a subprocess |
| TypeScript5 | tree-sitter-typescript 0.23.2, no grammar commit since early 2025 | `export type *`, `accessor` edge cases, decorators; about TypeScript 5.0 to 5.2 | the TypeScript compiler API (5.9.3; 6.0.3 is the last of its JavaScript API, 7.0 is native, behind IPC); always returns a tree, with diagnostics | Node |
| C11, C17, C23 | tree-sitter-c 0.24.2 (mbse-programs reads C with tree-sitter-cpp today) | no `_BitInt`, `typeof`, `#embed` | Clang (libclang): needs headers and flags, recovers without error nodes | Python (`libclang`); no maintained Node package |
| Cpp17, Cpp20, Cpp23 | tree-sitter-cpp 0.23.4 (2024; its master is ahead, unreleased) | `if consteval`, C++23's other additions, modules (unreleased fixes) | Clang (libclang) | as for C |
| SystemVerilog | tree-sitter-systemverilog 0.4.1 (gmlarumbe; claims 1800-2023) | unassessed | slang (pyslang 12.1.0; mbse-programs pins 12.0.0): IEEE 1800-2023; always builds a tree, skipped tokens as trivia, missing tokens synthesized | Python; slang builds for WASI, unpublished; its CLI writes `--cst-json` |

Where the front end runs in one language, the other reads its tree as a JSON snapshot, as mbse-programs' Verilog reader
exchange does today ([FEA-008: expressive program models](../../../../mbse-basis/docs/features/FEA-008.md#design), Design).

## Only in one repository

- **Only in mbse-expressions:** Python's `import` and `importfrom`, which bind a name within the rest of an expression
  (statements in Python's grammar); the framework's `let` as Python's `(lambda name: body)(value)` idiom; Basic's
  `quantifier`. Ccpp's `constant` with C's `type`, and SystemVerilog's `vector`, `method`, `iterate` and `span`, have
  counterparts of another shape (a literal's spelling, a call of a member, a range).
- **Only in mbse-programs:** everything else in the tables above, and its concrete syntax (`Parenthesized`,
  `ConcatenatedString`, spellings), comments, and the preprocessor's and macros' kinds (`DefinedExpression`,
  `MacroUsage`).

---

<!-- nav -->
[← Complete expression dialects](README.md) · [Home](../../../README.md)
