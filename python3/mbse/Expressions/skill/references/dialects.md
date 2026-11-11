# Dialects

A dialect is an expression language: its term kinds, its `Term`, the value union of them (`Expressions.<path>.Term`),
which its `install` adds to the store's `Expressions.Framework.Term` as the branch named after it (`python3`), its
vocabulary of operators, the domains of its values, its source text (its `Text` module: `ToText`, and in Python, for
Python, `FromText`), its evaluator, and the scope that resolves its names. Its path, its family's name and its own (`Patterns.Expressions`,
`Python.Python3`, `C.Expressions`), names its schemas (`Expressions.C.Expressions.Term`), its Python package
(`mbse.Expressions.C.Expressions`) and its TypeScript module (`@mbse/expressions/C/Expressions`); its name is its own,
or its family's where its own is `Expressions` (`C`, `MATLAB`, `LaTeX`). Every dialect's terms serialize, validate,
infer domains and traverse the same way (`DIALECT.validate(expression)`, `DIALECT.infer(expression)`, of the expression holding the term, `Framework.Terms.walk`), and
`Framework.Symbolics.free(term, DIALECT)` tells which names a term needs from its scope. Its constructors are writers:
write them in a transaction, into a store where its install has run. A dialect reads only its own terms: a term of
another dialect is refused by name ("a Patterns variable is not a Python3 term"). What a dialect can say, and what each
evaluates, is mbse-basis'
[CAP-100: six languages' expression dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md#dialects).

## Which dialect

| Use | For |
|---|---|
| **Patterns** | the constraint itself, to store, share and analyze. Constraints every binding evaluates are Patterns', over the variables they name, using only the core vocabulary |
| **Python3** | Python source: every expression of Python 3 (3.0 to 3.15) as CPython's `ast` has it, in mbse-programs' names and shapes, to check the constraint in Python or read one from Python code; NumPy style evaluates over columns ([CAP-227: the Python3 expression dialect](mbse:mbse-basis/docs/capabilities/CAP-227.md)) |
| **TypeScript5** | TypeScript source: every expression of TypeScript 5 (5.0 to 5.9) as typescript-estree has it, in mbse-programs' names and shapes, its types and destructuring patterns each a union of its own (`Expressions.TypeScript.TypeScript5.Type`, `Expressions.TypeScript.TypeScript5.Pattern`), JSX an extension; to model TypeScript code, as mbse-programs does; no translator yet ([CAP-228: the TypeScript5 expression dialect](mbse:mbse-basis/docs/capabilities/CAP-228.md)) |
| **MATLAB** | MATLAB source, for constraints that live in MATLAB code or Simulink models |
| **Excel** | worksheet formulas, for constraints that live in spreadsheets, over cells and records |
| **LaTeX** | notation, for constraints in documents and specifications; it has no evaluator: translate to evaluate |
| **C**, **Cpp** | C (C11 to C23) and C++ (C++17 to C++23) source, for constraints over the types of embedded software and interface control documents (`uint8_t`, `float`): every expression of each language as mbse-programs has it, in its names and shapes, a type name and binding targets each a union of its own (`Expressions.C.Expressions.Type`, `Expressions.C.Expressions.Pattern`, held by nothing in C, whose expressions bind no names, and by C++'s init capture's name), each kind recording the standards that have it; C++ is not a superset of C, so each defines its own copy of the kinds they share; each holds the types its standard fixes, and reads those it leaves to the implementation from the ABI dialect (`SystemV.AMD64`, `Arm.AAPCS64`) the expression holding the term names as its `abi` ([CAP-229: the C expression dialect](mbse:mbse-basis/docs/capabilities/CAP-229.md), [CAP-230: the C++ expression dialect](mbse:mbse-basis/docs/capabilities/CAP-230.md)) |
| **SystemVerilog** | SystemVerilog source, for constraints over hardware signals and registers, as assertions and checks on vectors whose bits may be x or z |

Write a constraint in Patterns, and translate it where it must be checked; read one written elsewhere back into Patterns
to analyze it.

- Python: [T07.1: Translating](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.1) · TypeScript: [T07.1: Translating](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.1)
- Python: [T07.3: Reading constraints back](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.3) · TypeScript: [T07.3: Reading constraints back](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.3)

## Constructors and source text

1. **Each dialect's constructors write its own kinds, as its language has them.** *Why*: a translated constraint must
   read the way an engineer in that language would write it. *When*: writing an expression in a dialect directly,
   rather than translating one from Patterns. *How*: each dialect's `Expressions` module has a writer per kind, named
   as its language names it: Python3's `compare`, `attribute`, `call`, `subscript`, `boolop`, comprehensions, `lambda_`
   and imports, every node of `ast`; MATLAB's `binary`, `field`, `call` and imports; Excel's `infix`, `function`,
   `field`, `cell` and `let_`; LaTeX's `binary`, `member`, `frac` and `where`; C's and C++'s literals with their suffixes,
   casts (to a type name written through the builders, a value of the dialect's `Type`), members, calls and operators,
   the kinds they evaluate (their other kinds written through the builders, a name an `identifier` wherever one is held,
   and a name used as an expression as each grammar makes it: C's the framework's `variable`, C++'s an `idexpression`
   holding its `Name`); SystemVerilog's sized literals, casts and system functions. Each dialect's `Text.ToText` writes an
   expression as its source. TypeScript5 has no writers: write its terms through the builders, a sublanguage's value
   where a type or a pattern goes; its `ToText` writes TypeScript, a body of statements, which is not part of a term,
   as `{}`.
   - Python: [DIA-01: Python: expressions as `ast` has them, with their imports; rendered and parsed as source](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-01) · TypeScript: [DIA-01: Python: expressions as `ast` has them, with their imports; rendered and parsed as source](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-01)
   - Python: [DIA-03: MATLAB: operators, fields and `isfield`, rendered as MATLAB source](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-03) · TypeScript: [DIA-03: MATLAB: operators, fields and `isfield`, rendered as MATLAB source](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-03)
   - Python: [DIA-06: Excel: formulas with `LET`, functions, operators and fields](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-06) · TypeScript: [DIA-06: Excel: formulas with `LET`, functions, operators and fields](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-06)
   - Python: [DIA-09: LaTeX: notation in math mode, rendered and checked, with no evaluator](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-09) · TypeScript: [DIA-09: LaTeX: notation in math mode, rendered and checked, with no evaluator](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-09)
   - Python: [DIA-11: C: C and C++ expressions over their arithmetic types, with C's precedence, typed literals and casts](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-11) · TypeScript: [DIA-11: C: C and C++ expressions over their arithmetic types, with C's precedence, typed literals and casts](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-11)
   - Python: [DIA-13: SystemVerilog: expressions over 4-state vectors and reals, with IEEE 1800's precedence, sized literals and casts](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-13) · TypeScript: [DIA-13: SystemVerilog: expressions over 4-state vectors and reals, with IEEE 1800's precedence, sized literals and casts](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-13)
   - Python: [DIA-22: TypeScript5 printed as TypeScript writes it: every kind, its types, patterns and JSX, by precedence, as an expression statement holds it, a literal in its spelling or its value's](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-22) · TypeScript: [DIA-22: TypeScript5 printed as TypeScript writes it: every kind, its types, patterns and JSX, by precedence, as an expression statement holds it, a literal in its spelling or its value's](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-22)
   - Python: [DIA-25: C and C++ printed as they write them: every kind, its names, type names, lambdas and attributes, by precedence, a literal's default spelling with what it encodes](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-25) · TypeScript: [DIA-25: C and C++ printed as they write them: every kind, its names, type names, lambdas and attributes, by precedence, a literal's default spelling with what it encodes](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-25)
   - Python: [T08.1: C](mbse:mbse-expressions/python3/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.1) · TypeScript: [T08.1: C](mbse:mbse-expressions/typescript5/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.1)
   - Python: [T08.3: SystemVerilog](mbse:mbse-expressions/python3/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.3) · TypeScript: [T08.3: SystemVerilog](mbse:mbse-expressions/typescript5/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.3)
2. **Read source back.** *Why*: a constraint written in another language can be analyzed or stored once it is in
   Patterns. *When*: a constraint exists only as Python source. *How*: Python3's `Text.FromText` parses source into a
   writer of its term, in Python only ([In each language](../SKILL.md#in-each-language)); translate the term into
   Patterns.
   - Python: [T07.3: Reading constraints back](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.3) · TypeScript: [T07.3: Reading constraints back](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.3)
   - Python: [DIA-01: Python: expressions as `ast` has them, with their imports; rendered and parsed as source](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-01) · TypeScript: [DIA-01: Python: expressions as `ast` has them, with their imports; rendered and parsed as source](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-01)
3. **A literal keeps its spelling.** *Why*: a literal read from source must print as it was written, and a broken one
   must be kept to be reported. *How*: a literal keeps its spelling (`text`) and what is wrong with it (`problems`)
   beside its value: printers write the spelling where it has one; a Python literal also keeps what its text encodes
   (a string's prefix and quotes, an int's base, digit separators), `None`, `...` and a complex number being Python3's
   `constant`, a complex number its `complex`, whose `real` and `imag` are IEEE 754's `binary64`s; a TypeScript
   literal its quote, base and separators, a number a float and a bigint an int, `null` and a regular expression
   TypeScript5's `constant`; a C or C++ literal its encoding prefix, its quote (a character's value is its code), its
   base, digit separators and its suffix, which gives its type (`5u`), `nullptr` their `constant`. Every dialect's
   `Term`, `Type` and `Pattern` hold the framework's kinds of invalid syntax, `error` (what a parser skipped) and
   `missing` (the kind it expected): validation reports them, printers write them as written, and evaluation refuses
   them.
   [CAP-233: literals of any value](mbse:mbse-basis/docs/capabilities/CAP-233.md).
   - Python: [DIA-18: A literal is a domain representation: printers write its spelling where it has one, else a default spelling; its value is what evaluates](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-18) · TypeScript: [DIA-18: A literal is a domain representation: printers write its spelling where it has one, else a default spelling; its value is what evaluates](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-18)
   - Python: [DIA-19: Python3's kinds beyond the narrower ones: literals keeping what their text encodes, f-strings as written, each kind's own checks and what it binds, stored as any term](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-19) · TypeScript: [DIA-19: Python3's kinds beyond the narrower ones: literals keeping what their text encodes, f-strings as written, each kind's own checks and what it binds, stored as any term](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-19)
   - Python: [DIA-21: TypeScript5: typescript-estree's expressions in mbse-programs' shapes, its types and patterns each a union of its own; literals keeping what their text encodes; each kind's checks and bindings; evaluation of literals alone](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-21) · TypeScript: [DIA-21: TypeScript5: typescript-estree's expressions in mbse-programs' shapes, its types and patterns each a union of its own; literals keeping what their text encodes; each kind's checks and bindings; evaluation of literals alone](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-21)
   - Python: [DIA-24: C and C++: mbse-programs' kinds each language has, in its shapes, a type name and binding targets each a union of its own; literals keeping what their text encodes, names, what each kind binds, the slots that may be empty, and evaluation refusing new kinds by name](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-24) · TypeScript: [DIA-24: C and C++: mbse-programs' kinds each language has, in its shapes, a type name and binding targets each a union of its own; literals keeping what their text encodes, names, what each kind binds, the slots that may be empty, and evaluation refusing new kinds by name](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-24)
   - Python: [FRM-11: Invalid syntax, `error` and `missing`: every dialect's `Term`, `Type` and `Pattern` hold them, validation reports them, evaluation refuses them by name, and printers write them as written](mbse:mbse-expressions/python3/tests/05_Framework.ipynb#FRM-11) · TypeScript: [FRM-11: Invalid syntax, `error` and `missing`: every dialect's `Term`, `Type` and `Pattern` hold them, validation reports them, evaluation refuses them by name, and printers write them as written](mbse:mbse-expressions/typescript5/tests/05_Framework.ipynb#FRM-11)
4. **A kind's helpers are parts, not terms.** The value objects a kind holds that are not terms (a Python call's
   keywords, a chain's comparisons, a comprehension's `for` clauses) are read as `Terms.Part`s among its form's
   attributes, their terms among its arguments; so are TypeScript5's types and patterns, which
   `TypeScript5.Expressions.tree(term)` reads nested, and C's and C++'s type names and the other helpers they hold, which
   `Terms.node(tag, record)` reads nested. A complete dialect's grammar is kept as data, each node a kind or
   held by one, or not an expression with its reason.
   - Python: [DIA-19: Python3's kinds beyond the narrower ones: literals keeping what their text encodes, f-strings as written, each kind's own checks and what it binds, stored as any term](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-19) · TypeScript: [DIA-19: Python3's kinds beyond the narrower ones: literals keeping what their text encodes, f-strings as written, each kind's own checks and what it binds, stored as any term](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-19)
   - Python: [DIA-20: Python3 is complete: each node of `ast` an expression is or holds, 3.0 to 3.15, kept as data, is a kind, a helper or an operator of a kind, or is listed as not an expression with its reason](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-20) · TypeScript: [DIA-20: Python3 is complete: each node of `ast` an expression is or holds, 3.0 to 3.15, kept as data, is a kind, a helper or an operator of a kind, or is listed as not an expression with its reason](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-20)
   - Python: [DIA-21: TypeScript5: typescript-estree's expressions in mbse-programs' shapes, its types and patterns each a union of its own; literals keeping what their text encodes; each kind's checks and bindings; evaluation of literals alone](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-21) · TypeScript: [DIA-21: TypeScript5: typescript-estree's expressions in mbse-programs' shapes, its types and patterns each a union of its own; literals keeping what their text encodes; each kind's checks and bindings; evaluation of literals alone](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-21)
   - Python: [DIA-23: TypeScript5 is complete: each node type of typescript-estree, TypeScript 5.0 to 5.9, kept as data, is a kind, a type or a pattern, or held by one, or not an expression](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-23) · TypeScript: [DIA-23: TypeScript5 is complete: each node type of typescript-estree, TypeScript 5.0 to 5.9, kept as data, is a kind, a type or a pattern, or held by one, or not an expression](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-23)
   - Python: [DIA-26: C and C++ are complete: each named node type of tree-sitter-c and tree-sitter-cpp, kept as data, is a kind, a type or a helper, or listed as not an expression with its reason](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-26) · TypeScript: [DIA-26: C and C++ are complete: each named node type of tree-sitter-c and tree-sitter-cpp, kept as data, is a kind, a type or a helper, or listed as not an expression with its reason](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-26)
5. **SystemVerilog is a family of six dialects.** `Expressions.SystemVerilog.Expressions` holds IEEE 1800-2023's
   expressions, Verilog's its subset, and `Types`, `Patterns`, `Assertions`, `Constraints` and `Preprocessor` its
   sublanguages, each a dialect with its own `Term` and holder (`Expressions.SystemVerilog.Patterns.Expression`), named
   with its family (`SystemVerilog Patterns`). A position that holds a sublanguage holds its `Term`, which lists
   `Expressions`' branches too: a cast's type holds `Types`', a `matches`' pattern `Patterns`', a call's arguments
   `Assertions`', `randomize() with`'s items `Constraints`', among them the Preprocessor's directives and comments. Each
   reads the others' terms, so a tree mixing them is validated and printed from any of their holders; install all six,
   in any order, after the standard dialects. A binding kind refines `Let` (`foreach`, an array method's `with`); a kind
   may hold several lists of terms (`solve a before b`, an `` `ifdef ``'s items and its `` `else ``'s), each read apart.
   Each records the IEEE editions that have its kinds, and evaluation keeps SystemVerilog's constraint kinds, refusing
   the sublanguages' by name.
   - Python: [DIA-27: SystemVerilog's Expressions and Types: their kinds and unions, literals and constants, checks, names, binders, holders, and each dialect of the family reading the others' terms](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-27) · TypeScript: [DIA-27: SystemVerilog's Expressions and Types: their kinds and unions, literals and constants, checks, names, binders, holders, and each dialect of the family reading the others' terms](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-27)
   - Python: [DIA-28: SystemVerilog's printing: mbse-programs' printer ported, its precedence, layout and spellings, for every kind of Expressions and Types and the Preprocessor's macro usage, from any holder of the family](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-28) · TypeScript: [DIA-28: SystemVerilog's printing: mbse-programs' printer ported, its precedence, layout and spellings, for every kind of Expressions and Types and the Preprocessor's macro usage, from any holder of the family](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-28)
   - Python: [DIA-29: SystemVerilog is complete: each of slang's syntax kinds, kept as data, is a kind or a helper of the family's six dialects, or listed as not an expression with its reason](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-29) · TypeScript: [DIA-29: SystemVerilog is complete: each of slang's syntax kinds, kept as data, is a kind or a helper of the family's six dialects, or listed as not an expression with its reason](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-29)
   - Python: [SVP-01: The Patterns dialect's union, its kinds' schemas in mbse-programs' shapes, the position that holds it, and its holder: validated, linked by `HasRoot`, round-tripped through JSON and YAML](mbse:mbse-expressions/python3/tests/12_SystemVerilog_Patterns.ipynb#SVP-01) · TypeScript: [SVP-01: The Patterns dialect's union, its kinds' schemas in mbse-programs' shapes, the position that holds it, and its holder: validated, linked by `HasRoot`, round-tripped through JSON and YAML](mbse:mbse-expressions/typescript5/tests/12_SystemVerilog_Patterns.ipynb#SVP-01)
   - Python: [SVP-03: What a pattern binds: its variables, wherever they nest, which a `matches` binds in its conditional's consequence and the conditions after it in a `&&&`](mbse:mbse-expressions/python3/tests/12_SystemVerilog_Patterns.ipynb#SVP-03) · TypeScript: [SVP-03: What a pattern binds: its variables, wherever they nest, which a `matches` binds in its conditional's consequence and the conditions after it in a `&&&`](mbse:mbse-expressions/typescript5/tests/12_SystemVerilog_Patterns.ipynb#SVP-03)
   - Python: [SVA-01: Its union and holder: its kinds after `Expressions`' branches, in mbse-programs' shapes, the positions that hold its `Term`, its holder validated, linked by `HasRoot` and round-tripped](mbse:mbse-expressions/python3/tests/13_SystemVerilog_Assertions.ipynb#SVA-01) · TypeScript: [SVA-01: Its union and holder: its kinds after `Expressions`' branches, in mbse-programs' shapes, the positions that hold its `Term`, its holder validated, linked by `HasRoot` and round-tripped](mbse:mbse-expressions/typescript5/tests/13_SystemVerilog_Assertions.ipynb#SVA-01)
   - Python: [SVC-01: Its union lists Expressions' branches and its own kinds, and Assertions' a distribution; its holder is validated, linked by `HasRoot` and round-tripped](mbse:mbse-expressions/python3/tests/14_SystemVerilog_Constraints.ipynb#SVC-01) · TypeScript: [SVC-01: Its union lists Expressions' branches and its own kinds, and Assertions' a distribution; its holder is validated, linked by `HasRoot` and round-tripped](mbse:mbse-expressions/typescript5/tests/14_SystemVerilog_Constraints.ipynb#SVC-01)
   - Python: [SVC-05: `solve ... before` orders two lists of variables, `disable soft` names its target, and `unique` its set of expressions and ranges](mbse:mbse-expressions/python3/tests/14_SystemVerilog_Constraints.ipynb#SVC-05) · TypeScript: [SVC-05: `solve ... before` orders two lists of variables, `disable soft` names its target, and `unique` its set of expressions and ranges](mbse:mbse-expressions/typescript5/tests/14_SystemVerilog_Constraints.ipynb#SVC-05)
   - Python: [SVD-01: Its union and holder: its kinds and invalid syntax, the directives and comments a constraint block's items too, a holder refining the framework's, linked by HasRoot, round-tripped through JSON](mbse:mbse-expressions/python3/tests/15_SystemVerilog_Preprocessor.ipynb#SVD-01) · TypeScript: [SVD-01: Its union and holder: its kinds and invalid syntax, the directives and comments a constraint block's items too, a holder refining the framework's, linked by HasRoot, round-tripped through JSON](mbse:mbse-expressions/typescript5/tests/15_SystemVerilog_Preprocessor.ipynb#SVD-01)
   - Python: [SVD-02: Its kinds and helpers: mbse-programs' properties in its order, a directive's branches holding Constraints' terms, its condition Expressions'](mbse:mbse-expressions/python3/tests/15_SystemVerilog_Preprocessor.ipynb#SVD-02) · TypeScript: [SVD-02: Its kinds and helpers: mbse-programs' properties in its order, a directive's branches holding Constraints' terms, its condition Expressions'](mbse:mbse-expressions/typescript5/tests/15_SystemVerilog_Preprocessor.ipynb#SVD-02)

## Each evaluates by its language's rules

| | Missing property | `1 == 1.0` | Logic | Other |
|---|---|---|---|---|
| Patterns | unknown | unknown: no coercion | Kleene, short-circuit | only the core vocabulary evaluates |
| Python3 | `AttributeError` | `True` | `and`/`or` of any number give an operand | NumPy style: vectorized, missing values masked; shallow: comparison chains, calls of positional arguments, subscripts and generator expressions evaluate, and a kind it does not evaluate (a lambda, a tuple, `None`) is refused by name, "Python3 lambda is not evaluated" |
| MATLAB | error (`isfield` tests first) | true | two-valued, short-circuit | numbers are doubles; `+` concatenates strings |
| Excel | `#FIELD!` | TRUE | `AND`/`OR` evaluate every argument | errors are values that propagate; text compares ignoring case |
| LaTeX | no evaluator | | | translate to a dialect that evaluates |
| C, Cpp | `KeyError` (no member) | true, after the usual conversions | `&&`/`\|\|` short-circuit, give `bool` | unsigned wraps; undefined behavior (signed overflow, ...) raises |
| SystemVerilog | `KeyError` (no member) | `1'b1`, compared as reals | 1, 0 or x (`1'bx`) by the truth of each operand | values are sized vectors; x and z propagate; division by zero gives x |

Test a translated constraint with its own dialect's evaluator, which models those rules:

- Python: [T07.2: Each language evaluates by its own rules](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.2) · TypeScript: [T07.2: Each language evaluates by its own rules](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.2)
- Python: [T08.2: Where C differs](mbse:mbse-expressions/python3/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.2) · TypeScript: [T08.2: Where C differs](mbse:mbse-expressions/typescript5/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.2)
- Python: [T08.4: `x` and `z`](mbse:mbse-expressions/python3/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.4) · TypeScript: [T08.4: `x` and `z`](mbse:mbse-expressions/typescript5/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.4)
- Python: [DIA-02: Python evaluates by Python's rules, in a scope that allowlists what an expression may reach](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-02) · TypeScript: [DIA-02: Python evaluates by Python's rules, in a scope that allowlists what an expression may reach](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-02)
- Python: [DIA-04: MATLAB evaluates two-valued, converts numbers and logicals, and has no unknown](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-04) · TypeScript: [DIA-04: MATLAB evaluates two-valued, converts numbers and logicals, and has no unknown](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-04)
- Python: [DIA-07: Excel coerces, orders values of every type, and computes with errors](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-07) · TypeScript: [DIA-07: Excel coerces, orders values of every type, and computes with errors](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-07)
- Python: [DIA-12: C evaluates by C's rules: promotions and conversions, wrapping unsigned arithmetic, and undefined behavior raising](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-12) · TypeScript: [DIA-12: C evaluates by C's rules: promotions and conversions, wrapping unsigned arithmetic, and undefined behavior raising](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-12)
- Python: [DIA-14: SystemVerilog evaluates by IEEE 1800's rules: sizing by context, 4-state logic, casts and system functions](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-14) · TypeScript: [DIA-14: SystemVerilog evaluates by IEEE 1800's rules: sizing by context, 4-state logic, casts and system functions](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-14)

Bitwise operations and arrays follow each language's own functions too: Python's operators, MATLAB's and Excel's bit
functions; SystemVerilog's array methods, MATLAB's `arrayfun` and indexing from 1, Excel's `MAP` and `LAMBDA`.

- Python: [DIA-10: Bitwise operations: Python's operators, and MATLAB's and Excel's bit functions](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-10) · TypeScript: [DIA-10: Bitwise operations: Python's operators, and MATLAB's and Excel's bit functions](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-10)
- Python: [DIA-15: SystemVerilog arrays: methods, reductions with a `with` clause, and `inside` over an array's elements](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-15) · TypeScript: [DIA-15: SystemVerilog arrays: methods, reductions with a `with` clause, and `inside` over an array's elements](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-15)
- Python: [DIA-16: MATLAB arrays: arrayfun, indexing from 1, and the functions of arrays](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-16) · TypeScript: [DIA-16: MATLAB arrays: arrayfun, indexing from 1, and the functions of arrays](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-16)
- Python: [DIA-17: Excel arrays: MAP and LAMBDA, AND and OR of any number of arguments, and the functions of arrays](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-17) · TypeScript: [DIA-17: Excel arrays: MAP and LAMBDA, AND and OR of any number of arguments, and the functions of arrays](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-17)

## Scopes: names, imports and references

*Why*: a scope reaches only what the caller gives it, so expressions from untrusted data cannot import or call other
code. *When*: evaluating any dialect whose expressions import, call or refer to cells. *How*: an evaluator takes a
mapping of variables, or its dialect's scope, which resolves names the dialect's way:

- Python3's `Evaluators.Scope(variables, modules, builtins)` resolves a let or import, then a variable, then a builtin
  (`abs`, `hasattr`, `len`, ...); it imports only the modules given. Attributes whose names start with `_` are
  refused, and a call may call only a builtin, a variable's value or a function of an allowed module.
- MATLAB's `Evaluators.Scope(variables, functions, packages)` resolves a function as a built-in (`isfield`), then
  imported, then on the path, then qualified (`pkg.fn`).
- Excel's `Evaluators.Workbook(names, sheets, name, books, add_ins)` resolves a name as a `LET`, then a defined name,
  else `#NAME?`; a cell as its value, 0 when empty, `#REF!` when its sheet or book does not exist; a function as a
  built-in, then an add-in.

- Python: [T07.4: What a constraint may reach](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.4) · TypeScript: [T07.4: What a constraint may reach](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.4)
- Python: [DIA-02: Python evaluates by Python's rules, in a scope that allowlists what an expression may reach](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-02) · TypeScript: [DIA-02: Python evaluates by Python's rules, in a scope that allowlists what an expression may reach](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-02)
- Python: [DIA-05: MATLAB resolves functions from imports, the path and packages that the scope provides](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-05) · TypeScript: [DIA-05: MATLAB resolves functions from imports, the path and packages that the scope provides](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-05)
- Python: [DIA-08: Excel reads cells from workbooks, and add-in functions from the workbook's add-ins](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb#DIA-08) · TypeScript: [DIA-08: Excel reads cells from workbooks, and add-in functions from the workbook's add-ins](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb#DIA-08)

## Go deeper
<!-- no case: points to the design and the test suite for reading further -->

| Topic | Read |
|---|---|
| Every dialect's kinds, values and evaluation, and how scopes resolve | [CAP-100: six languages' expression dialects](mbse:mbse-basis/docs/capabilities/CAP-100.md#dialects), in mbse-basis |
| Each dialect's rules, case by case | DIA, the dialects' test suite, in [Python](mbse:mbse-expressions/python3/tests/06_Dialects.ipynb) and [TypeScript](mbse:mbse-expressions/typescript5/tests/06_Dialects.ipynb) |
