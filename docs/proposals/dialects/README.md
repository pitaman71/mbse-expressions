<!-- nav -->
[← FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) · [Home](../../../README.md) · [The gaps, dialect by dialect →](GAPS.md)

# Complete expression dialects

This proposal made each of this repository's target dialects complete over its language's expressions, as the user
decided when mbse-programs began porting onto mbse-schemas and this repository: "`mbse-programs` should make use of
`mbse-expressions.Dialects.<lang_ver>.Expression`. Yes, this means the expression dialect must completely cover the
AST". A dialect, which held the terms of a constraint, a fraction of its language's expressions, came to hold every
expression of its language, by major version, and every sublanguage its standard defines as a dialect of its own. It
was built in six stages and the retrofit of the other dialects, each in both languages at 100% coverage with the
corpora regenerated, and released in two: stages 1 to 5 and the namespace rename as mbse-expressions 0.8.0, stage 6,
the retrofit, the regular expression dialects and the POSIX family as 0.10.0, domains as data's 0.9.0 between them
([CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided),
"The releases"). Its survey of what each dialect lacked, at 0.7.0, is [the gaps, dialect by dialect](GAPS.md).

## Stages

1. **The decisions recorded** (2026-11-02): a capability per complete dialect, each implementing
   [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) and
   [FEA-008: expressive program models](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-008.md), and
   the parsers placed in mbse-programs
   ([CAP-100: six languages' expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-100.md#decided)).
2. **The framework and the renames** (`stage2-framework`, `stage2-holders`): `Expressions.Framework.Term` a union of
   each dialect's `Term`, each dialect its own holder refining `Expressions.Framework.Expression`, the invalid-syntax
   kinds `error` and `missing`, Basic renamed Patterns, `Python3`, and `C` and `Cpp` from `Ccpp`'s kinds; a literal
   holding any value beside its spelling and its problems
   ([CAP-233: literals of any value](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-233.md)).
3. **`Python3` complete** (`stage3-python3`): every expression of `ast`, 3.0 to 3.15
   ([CAP-227: the Python3 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-227.md)).
4. **`TypeScript5`, new** (`stage4-typescript5`): typescript-estree's expressions, TypeScript 5.0 to 5.9, its types,
   patterns and JSX
   ([CAP-228: the TypeScript5 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-228.md)).
5. **`C` and `Cpp` by standard** (`stage5-c-cpp`, `stage5-followup`): every expression of C11 to C23 and of C++17 to
   C++23, each kind recording the standards that have it
   ([CAP-229: the C expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-229.md),
   [CAP-230: the C++ expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-230.md)).
   Then the namespace rename, `Expressions.<Family>.<Dialect>`, and the release of 0.8.0.
6. **`SystemVerilog` complete** (`stage6-systemverilog`, its sublanguages merged into it): IEEE 1800-2023, Verilog its
   subset, as six dialects of one family, `Expressions`, `Types`, `Patterns`, `Assertions`, `Constraints` and
   `Preprocessor`, each reading the other five, checked complete against slang's 533 syntax kinds
   ([CAP-231: the SystemVerilog expression dialect, complete](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-231.md)).
   - **The retrofit** (`retrofit`, its groups merged into it): stage 6's decisions applied to the other dialects, each
     sublanguage a language's standard defines a dialect of its own, `Python Types` and `Python Patterns`
     ([CAP-276: Python's type expressions and match patterns as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-276.md)),
     `TypeScript Types` and `TypeScript Patterns`, moved out of `TypeScript5`
     ([CAP-277: TypeScript's types and destructuring patterns as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-277.md)),
     `C Types`, `Cpp Types` and `C Preprocessor`
     ([CAP-278: C's and C++'s type names and preprocessor directives as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-278.md));
     and every kind that binds names, in every dialect, a variation of `let`
     ([CAP-279: names an expression binds found alike in every language](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-279.md)).
   - **The regular expression dialects** (`regexp`): `Python RegExp`, `TypeScript RegExp` and `Cpp RegExp`
     ([CAP-281: Python's, ECMAScript's and C++'s regular expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-281.md)).
   - **The POSIX family** (`posix-regexp`): `POSIX BRE` and `POSIX ERE`, `Cpp RegExp` narrowed to [re.grammar]'s grammar
     ([CAP-294: POSIX's regular expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-294.md)).
7. **Tutorials, skill, README and equivalence**, which followed each stage as it landed; the releases, 0.8.0 and
   0.10.0. Next: mbse-programs' stage 2, onto 0.10.0, then mbse-patterns and mbse-codegen-python.

Its content is drained into mbse-basis, which holds what was built, the user's decisions quoted in full, the choices
agents made for review, and what stays open:

- [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md):
  the decisions every dialect follows: by major version, complete over its language's AST, mbse-programs' kinds,
  names and shapes, a name as its grammar makes it, the holders and the union of `Term`s, validation by constraints,
  bodies not part of the term, the parsers mbse-programs', invalid syntax, the shallow evaluator, Patterns and a
  quantifier's pattern, the namespace, the releases and the user's direction on process; stage 6's principles, the
  sublanguages as dialects, a holder per sublanguage, the preprocessors, a type's members as data, binders as `Let`'s
  variations and an evaluator extended by no stage; the retrofit's answers (which regular expressions are dialects,
  JSX, a constant's text in a refusal); and the rules the retrofit applied where the decisions were silent.
- Each dialect's own item, for the decisions particular to it:
  [CAP-227: the Python3 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-227.md)
  (a subscript is a tensor's, binding targets),
  [CAP-228: the TypeScript5 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-228.md)
  (a sublanguage's union, names that only declare),
  [CAP-229: the C expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-229.md)
  and [CAP-230: the C++ expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-230.md)
  (`variable` and `idexpression`, an init capture's `Pattern`, the writers kept for code generation),
  [CAP-231: the SystemVerilog expression dialect, complete](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-231.md)
  (stage 6's Q3 to Q6, Q9 and Q12),
  [CAP-277: TypeScript's types and destructuring patterns as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-277.md)
  (`bound_names`), and
  [CAP-281: Python's, ECMAScript's and C++'s regular expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-281.md)
  (POSIX's grammars a family of their own).
- [CAP-233: literals of any value](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-233.md): a
  literal holds any value, and is a domain representation.
- [CAP-268: standards as tagged data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-268.md):
  standards as tags (stage 6's Q10).
- [CAP-098: dialects over one framework](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-098.md):
  the framework's choices, a dialect reading its family's terms, several containers of terms in a kind, binders by
  their role, refusals naming the kind's owner.
- mbse-programs' gaps found while building, for its port: a pattern's parentheses, `randomize`'s arguments and the
  others in [CAP-094: every construct of Verilog's and SystemVerilog's standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-094.md);
  a regular expression's body in [CAP-038: every construct of Python's standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-038.md)
  and [CAP-092: every construct of TypeScript's standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-092.md);
  a C or C++ macro's use in [CAP-093: every construct of C's and C++'s standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-093.md).

The tech debt it incurred is mbse-basis
[CAP-255: type checkers catch mistakes in code that builds expressions](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-255.md).
The API each stage settled is [the port's API](../port/API.md), items 30 to 107 and 162 to 323. What evaluation
refuses, kind by kind, is the inventory below, on which [the evaluation proposal](../evaluation/README.md) builds.

## Evaluation: what is refused, and why

Taken up as the user deferred it (mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), "An inventory of what evaluation refuses, deferred"), after the user's "I notice some corners were cut as
shown in "not implemented"" (2026-11-11). This is an inventory and a proposal: it changes no code. It applies the
user's principle, "`mbse-expressions` provides tools for evaluating statement-free expressions. Contruction of a full
evaluator for expressions with embedded statements is deferred to `mbse-programs`" (mbse-basis
[CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), the principles), and Q11's design: evaluation was tolerated, not a primary goal, and the evaluator is to grow into a
staged simplifier. The model is the whole standard, and "not supporting the full standard is prohibited"; that rule is
about the model, and evaluation may stay partial (Q11), as decided in question 8 ("a shallow evalluator"). So a refusal
is a gap only where the standard gives a statement-free expression a value. The classes:

- **(a)** Statement-free, with a value its language defines: mbse-expressions should evaluate it, by the principle.
- **(b)** No value of its own, by its language's standard: a type, a pattern alone, a directive, a regular expression
  as a term, a part evaluated only within the kind that holds it.
- **(c)** Evaluable only with an open capability, cited: domain inference
  ([CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)), or another.
- **(d)** Anything else, explained: what needs an enclosing statement, declaration or execution (a function's body, a
  class, a coroutine, an object with an address, a simulator's time), which is mbse-programs' by the principle.

### How it was found

On origin/main at 5427eb6 (#39, after the retrofit and the regular expression dialects), in both languages:

- every `NotImplementedError` and "is not evaluated" in `Framework/Evaluators`, `Framework/Symbolics` and each
  dialect's `Evaluators`, Python's and TypeScript's (the twins refuse the same kinds by the same messages);
- each dialect's kinds (`Dialect.kinds()`, invalid syntax aside) against its evaluator's evaluated set (`EVALUATED`;
  SystemVerilog's `_EVALUATED`); a sublanguage dialect has no evaluator of its own, so its host's evaluator refuses
  each of its kinds by the sublanguage's name (`Terms.Dialect.owner`);
- each kind's operator vocabulary against the operators its evaluator implements;
- each refusal within an evaluated kind (a shape or an operator it does not evaluate);
- run: Python3's refusals confirmed by reading source with `FromText` and evaluating it (`(1, 2)`, `[x for x in y]`,
  `lambda x: x`, `x is None`, `y[1:2]`, `f'{x}'`, `max(y, key=abs)`, ...), and every other refusal by the message its
  suite or tutorial asserts (tests 02, 05, 06 and 12 to 25; tutorials 03 and 08), 75 distinct messages in all.

Patterns, MATLAB and Excel refuse nothing: each evaluates every kind and every operator it has. (MATLAB's and Excel's
kinds are still [CAP-100: six languages' expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-100.md)'s
subset of their languages; completing them adds kinds, which is not this inventory's.) LaTeX has no evaluator.

### Counts

Refused kinds, each counted once, in the dialect that owns it; then the refusals within evaluated kinds (shapes and
operators, one row each in the tables below). Where a question below is open, the kinds it covers are counted as its
recommendation has them, marked †.

| Dialect | Kinds | Evaluated | Refused | (a) | (b) | (c) | (d) | Within evaluated kinds: (a), (c), (d) |
|---|---|---|---|---|---|---|---|---|
| Patterns | 7 | 7 | 0 | | | | | |
| Python3 | 33 | 16 | 17 | 14 | | | 3 | 5, 0, 2 |
| Python Types | 3 | 0 | 3 | | 3 | | | |
| Python Patterns | 8 | 0 | 8 | | 8 | | | |
| Python RegExp | 15 | 0 | 15 | | 15 | | | |
| TypeScript5 | 41 | 1 | 40 | 26 | 4 (3†) | | 10 (2†) | |
| TypeScript Types | 38 | 0 | 38 | | 38 | | | |
| TypeScript Patterns | 5 | 0 | 5 | | 5 | | | |
| TypeScript RegExp | 18 | 0 | 18 | | 18 | | | |
| C | 22 | 9 | 13 | 8 | 2 | | 3 (2†) | 4, 0, 4 (1†) |
| C Types | 2 | 0 | 2 | | 2 | | | |
| C Preprocessor | 10 | 0 | 10 | 1 | 9 | | | |
| Cpp | 36 | 9 | 27 | 14 | 2 | 2 | 9 (2†) | 2, 0, 4, and C's |
| Cpp Types | 2 | 0 | 2 | | 2 | | | |
| Cpp RegExp | 16 | 0 | 16 | | 16 | | | |
| SystemVerilog | 38 | 17 | 21 | 9 | 2 | 4 | 6 (2†) | 9, 3, 4 (1†) |
| SystemVerilog Types | 10 | 0 | 10 | | 10 | | | |
| SystemVerilog Patterns | 6 | 0 | 6 | | 6 | | | |
| SystemVerilog Assertions | 17 | 0 | 17 | | | | 17† | |
| SystemVerilog Constraints | 9 | 0 | 9 | 7 | 2 | | | |
| SystemVerilog Preprocessor | 10 | 0 | 10 | | 9 | | 1 | |
| MATLAB | 10 | 10 | 0 | | | | | |
| Excel | 9 | 9 | 0 | | | | | |
| LaTeX | 8 | 0 | 8 | | 8 | | | |
| **All** | **373** | **78** | **295** | **79** | **161** | **6** | **49** | **20, 3, 14** |

So of 295 refused kinds, 79 are gaps by the principle (a), 161 have no value of their own (b), 6 wait on domain
inference or constraint resolution (c), and 49 need what only mbse-programs or a simulator has (d), 25 of those by
the recommendations of questions 1 and 2. Within evaluated kinds, 20 refusals are gaps, 3 wait on domain inference and
14 are mbse-programs', 2 of those by question 1's recommendation.

### Python

**Python3** (CPython's `ast`; the Python Language Reference, 6, Expressions):

| Kind or operator | Class | What it needs |
|---|---|---|
| `constant` (`None`, `...`, `2j`) | (a) | `None` and `Ellipsis` as values in both languages, and a complex number, which TypeScript has no native for: a value of `Expressions.Python.Python3.Complex` with Python's complex arithmetic |
| `parenthesized` | (a) | its term's value |
| `concatenatedstring` (`'a' 'b'`) | (a) | its strings joined |
| `joinedstr` (f-string) | (a) | `format()`'s format-specification mini-language and the `!r`, `!s`, `!a` conversions, so `repr` of every value the evaluator holds, in TypeScript too |
| `templatestr` (t-string, 3.14) | (a) | a `string.templatelib.Template` value (its strings and interpolations), a value schema in TypeScript |
| `tuple`, `set`, `starred` in a display or a call | (a) | a tuple distinct from a list (`(1,) != [1]`); a set keyed by Python's equality and hashing (`1`, `1.0` and `True` one key), in TypeScript too; unpacking an iterable |
| `slice`, and `subscript` by one | (a) | a slice value and Python's slicing of a sequence (negative indices, steps); tensor indexing stays a library's (mbse-basis [CAP-227: the Python3 expression dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-227.md#decided), "Python's subscript is a tensor's") |
| `listcomp`, `setcomp`, `dictcomp` | (a) | `generatorexp`'s clauses, already built, collected into a list, a set or a dict |
| `namedexpr` (`y := 2`) | (a) | its value, its target bound within itself only, as the API decided ([the API](../port/API.md), 60) |
| `lambda` | (a) | closures: a callable value capturing its scope, binding Python's parameters (positional-only, defaults, `*args`, keyword-only, `**kwargs`), callable by `call` where the scope allows its own closures |
| `yield`, `yieldfrom` | (d) | a value only a generator function's body gives, when it is resumed: a statement body, mbse-programs' |
| `await` | (d) | a coroutine's suspension, within an `async def` body: mbse-programs' |
| a keyword argument (`max(y, key=abs)`) | (a) | binding keywords to a function's parameters: in TypeScript, the builtins' Python signatures |
| a dict's `**` item | (a) | a mapping merged in order |
| a comprehension's target that unpacks (`for (a, b) in ...`, a list or a starred target) | (a) | Python's iterable unpacking |
| a comprehension's target that is an attribute or a subscript | (d) | a write into data, which evaluation visits read-only ([PRI-004: one visitor protocol per kind](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-004)) |
| an `async for` | (d) | an event loop, within an `async def` body |
| `is`, `is not` | (a) | identity, as Python defines it: the singletons `None`, `True`, `False`, `...` and a reference object by identity; Python leaves other equal immutables' identity to the implementation, which the evaluator should state |
| `@` | (a) | Python's rule, `__matmul__` of the operand: a library's (NumPy's) in Python, and a `TypeError` for every value a TypeScript evaluator holds, since no builtin type has one |

**Python Types** (`typevar`, `paramspec`, `typevartuple`): (b). A type parameter is declared by a `def`, `class` or
`type` statement (Language Reference, 8.10, type parameter lists); its object is made when that statement runs. An
annotation of Python3's kinds already evaluates as Python3's.

**Python Patterns** (all 8, `matchvalue` to `matchor`): (b). "Patterns are not expressions" in Python's grammar; a
`match` statement matches them (Language Reference, 8.6.4), a statement and so mbse-programs'.

**Python RegExp** (all 15, `pattern` to `comment`): (b). A regular expression is the string `re`'s functions compile
and match; its syntax has no value. Matching is a call of `re`, which Python3 evaluates where the scope allows the
module ([CAP-281: Python's, ECMAScript's and C++'s regular expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-281.md)).

### TypeScript

**TypeScript5** evaluates a literal alone. Everything else ECMAScript evaluates needs its abstract operations, which
the TypeScript evaluator has natively and the Python one must model alike: `undefined` beside `null`, ToPrimitive,
ToNumber, ToString (Number::toString's shortest round trip, `-0` as `"0"`), IsLooselyEqual and IsStrictlyEqual,
BigInt, an object as an ordered map (integer keys first), an array with holes, and the iteration protocol (ECMA-262,
7, Abstract Operations). A type's assertions are erased: the TypeScript compiler emits their operand alone.

| Kind or operator | Class | What it needs |
|---|---|---|
| `identifier`, `thisexpression` | (a) | a name resolved by the scope; `this` bound by it as a name is |
| `constant` (`null`, a regular expression) | (a) | `null`; a RegExp object, whose matching in Python needs ECMA-262's semantics (22.2), not `re`'s |
| `parenthesizedexpression`, `sequenceexpression` | (a) | its term's value; each term evaluated, the last's value |
| `templateliteral`, `taggedtemplateexpression` | (a) | ToString of each substitution; a tag called with the cooked strings (and `raw`) and the values |
| `arrayexpression`, `elision`, `spreadelement`, `objectexpression`, `property` | (a) | arrays with holes, spread by iteration; plain objects with computed keys, shorthand, spread and accessors' values |
| `memberexpression`, `chainexpression` | (a) | property access (a data object's through mbse-schemas' readers, as Python3's `attribute`), computed keys, and `?.`'s short circuit |
| `callexpression`, `newexpression` | (a) | calls of functions and constructors the scope provides, as Python3's scope allows them, nothing else reachable |
| `arrowfunctionexpression` with an expression body | (a) | closures binding ECMAScript's parameters: defaults, rest, and destructuring by TypeScript Patterns |
| `unaryexpression` but `delete` | (a) | `!`, `+`, `-`, `~` by ToNumber and ToInt32; `typeof` by a value's type; `void` gives `undefined` |
| `binaryexpression` | (a) | each operator by its abstract operations: `+` concatenating or adding, `==` loosely, `>>>`, BigInt's; `in` a property's presence; `instanceof` a scope-provided constructor's prototype chain |
| `logicalexpression`, `conditionalexpression` | (a) | `&&`, `\|\|` and `??` giving an operand, short-circuiting; the branch it chooses |
| `tsasexpression`, `tssatisfiesexpression`, `tstypeassertion`, `tsnonnullexpression`, `tsinstantiationexpression` | (a) | their operand's value: erased |
| `tsemptybodyfunctionexpression` | (b) | none: a signature without a body (an overload, `declare`, `abstract`) is erased and has no run-time value |
| `jsxelement`, `jsxfragment`, `jsxemptyexpression` | (b)† | question 3: JSX's own specification gives it no semantics; its value is whatever factory the TypeScript compiler's `jsx` option names |
| `functionexpression`, `classexpression`, and an arrow with a block body | (d) | a body of statements, mbse-programs' (mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), "Bodies within expressions are not part of the term") |
| `super`, `privateidentifier` (`#x`), `metaproperty` (`new.target`, `import.meta`) | (d) | an enclosing class's members, a function's invocation, or the host's module: declarations and execution, mbse-programs' |
| `awaitexpression`, `yieldexpression`, `importexpression` | (d) | a coroutine's or a generator's resumption; `import()` gives a promise, which only `await` reads, within an `async` body or a module |
| `assignmentexpression`, `updateexpression`, and `unaryexpression`'s `delete` | (d)† | question 1: a write, to a binding or to data |

**TypeScript Types** (all 38): (b). A type is erased: it has no run-time value (TypeScript's compiler emits none for
any of them, `typeof x` in a type's position among them).

**TypeScript Patterns** (all 5): (b). A destructuring pattern is a binding target, not an expression (ECMA-262,
14.3.3 and 13.15.5): it binds where it stands. An arrow's parameters, (a) above, need its binding.

**TypeScript RegExp** (all 18): (b). An ECMA-262 Pattern (22.2.1) is compiled into a matcher by a RegExp; its value is
the RegExp object `TypeScript5`'s `constant` holds, (a) above.

### C and C++

C's and C++'s evaluator is one (`C.Evaluators.interpreter`), C++'s evaluated set C's with `idexpression` for
`variable`, so a refusal within an evaluated kind is both dialects' unless named. A type's size and alignment are the
ABI's its holder names, stored since 0.9.0
([CAP-267: C and C++ terms read under the ABI their holder names](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-267.md)).
C's object model (ISO/IEC 9899, 6.2.4, and C++'s [basic.memobj]), objects with addresses and lifetimes, is made by
declarations; an evaluator of values bound by name has no object to point at, so what needs one is (d).

**C** (ISO/IEC 9899:2011 to 2024):

| Kind or operator | Class | What it needs |
|---|---|---|
| `constant` (`nullptr`, C23) | (a) | a value of `nullptr_t`, which compares and converts to `bool` |
| `parenthesizedexpression`, `extensionexpression` (`__extension__`) | (a) | its term's value |
| `concatenatedstring` | (a) | its strings joined, as a string literal's value is today |
| `genericselection` (`_Generic`) | (a) | its controlling operand's type, after lvalue conversion, matched against each association's type name, read from C Types as a cast reads it |
| `sizeofexpression`, `alignofexpression` | (a) | the size and alignment of a type from the stored ABI domains; of an operand, its type as the evaluator types it, unevaluated (a variable's declared type is [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md)'s) |
| `compoundliteralexpression` | (a) | an aggregate value of an array type, or of a structure or union its type name declares inline; a tag declared elsewhere is a declaration's, mbse-programs' |
| `initializerlist`, `designatedinitializer` | (b) | none alone: an initializer is not an expression (6.7.9 in C11); it takes the type of what it initializes, and is evaluated within a compound literal |
| `statementexpression` (GNU `({ ... })`) | (d) | statements: mbse-programs', by the user's principle |
| `assignmentexpression`, `postfixexpression` (`++`, `--`) | (d)† | question 1: a write |
| `unaryexpression`'s prefix `++`, `--` | (d)† | question 1 |
| `binaryexpression`'s `,` | (a) | its left operand evaluated, its right's value |
| a literal of `_BitInt(N)` (C23, `wb`) | (a) | `_BitInt(N)` as a type of the evaluator, of N bits, wrapping and promoting as C23 has it |
| a cast to `void` | (a) | its operand evaluated, no value |
| GNU's `x ?: y` | (a) | `x` evaluated once, and `y` when it is zero |
| `unaryexpression`'s `*`, `&` | (d) | the object model: an object's address, and the object at one |
| a cast to a pointer type | (d) | the object model |
| a cast to a type a declaration names (a `typedef`, a structure, union or enumeration tag) | (d) | that declaration, mbse-programs' |
| a call of a callee that is not a function's name (`(*fp)(x)`) | (d) | a function pointer: the object model |

**C++** (ISO/IEC 14882:2017 to 2024), its own kinds:

| Kind or operator | Class | What it needs |
|---|---|---|
| `constant` (`nullptr`), `thisexpression` | (a) | `std::nullptr_t`'s value; `this` bound by the scope, read through `->` as C reads a member today |
| `parenthesizedexpression`, `extensionexpression`, `concatenatedstring` | (a) | as C's |
| `userdefinedliteral` (`12_km`, `1s`) | (a) | a call of the literal operator (`operator""_km`) the scope provides; the standard library's (`<chrono>`, `<string>`, `<complex>`) by their library's semantics |
| `functionalcastexpression` (`int(x)`, `T{x}`) | (a) | as a cast, to an arithmetic type; to a class type, a constructor, which is (d) |
| `namedcastexpression`'s `static_cast` | (a) | as a cast, to an arithmetic or enumeration type |
| `sizeofexpression`, `alignofexpression`, `sizeofpackexpression` | (a) | as C's; a pack's size, the pack bound by the scope as a list |
| `foldexpression`, `packexpansion` | (a) | a pack bound by the scope as a list, folded by its operator, or expanded into a call's arguments; a fold over an assignment operator is question 1's |
| `throwexpression` | (a) | its operand evaluated and thrown, an error carrying it (`c ? x : throw e`); what catches it is a statement's |
| `initializerlist`, `designatedinitializer` | (b) | as C's ([dcl.init.list]) |
| `requiresexpression` | (c) | whether its requirements are satisfied: each expression's type and overload resolution, which [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md) names as proposed with it |
| `typeidexpression` | (c) | its operand's static or dynamic type, CAP-232's, as a `std::type_info` value |
| `lambdaexpression` | (d) | its body, a compound statement, mbse-programs' (mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), "Bodies within expressions are not part of the term") |
| `newexpression`, `deleteexpression` | (d) | dynamic storage, constructors and destructors: the object model and class declarations |
| `noexceptexpression` | (d) | the exception specifications of the functions its operand calls: their declarations |
| `awaitexpression`, `yieldexpression` (`co_await`, `co_yield`), `statementexpression` | (d) | a coroutine's body; statements |
| `assignmentexpression`, `postfixexpression` | (d)† | question 1 |
| `namedcastexpression`'s `const_cast`, `dynamic_cast`, `reinterpret_cast` | (d) | pointers and references, a polymorphic class, a bit pattern in an object: the object model |
| `binaryexpression`'s `,`, `unaryexpression`'s `*`, `&`, `++`, `--`, and C's other refusals within evaluated kinds | as C's | as C's, counted there |
| `binaryexpression`'s `<=>` | (a) | `std::strong_ordering`, `std::weak_ordering` and `std::partial_ordering` values ([cmp.categories]), compared with `0` |
| an `idexpression` of a qualified name (`ns::x`) | (a) | the name resolved by the scope, as Python3's scope resolves a module's names |
| `binaryexpression`'s `.*`, `->*` | (d) | pointers to members: the object model and class declarations |
| a member that is not an identifier (`a.template f<T>`, `~T`) | (d) | a class's member templates and destructors: its declaration |
| a subscript of several indices (C++23) | (d) | an overloaded `operator[]`: a class's declaration |
| a callee that is not a function's name (`s.f(x)`) | (d) | a member function: a class's declaration |

**C Types** and **Cpp Types** (`typeid`, `enumerator` each): (b). A type name denotes a type (C, 6.7.7; C++,
[dcl.name]) and has no value; a cast and `sizeof` read it. An enumerator declares an enumeration constant; a use of
one is a name, resolved by the scope.

**C Preprocessor**: `definedexpression` (`defined(X)`) is (a): 1 or 0 by whether a macro is defined (6.10.1), the
defined macros' names a scope. The other 9 (`includedirective` to `otherdirective`, and `comment`) are (b):
preprocessing directives are lines processed before translation, with no value (6.10).

**Cpp RegExp** (all 16): (b). A [re.grammar] pattern is the argument a `std::basic_regex` compiles; matching is a call
of `std::regex_match` and its kin, a library's.

### SystemVerilog

SystemVerilog's evaluator (IEEE 1800-2023, Verilog its subset) is its own, over the stored domains, and refuses a
kind outside `_EVALUATED` by its owner's name. A user's `typedef`, structure, union, enumeration and class are
declared by declarations, mbse-programs'; the types SystemVerilog defines by keyword are stored domains. A simulator's
time, its scheduling and the values a signal had at earlier clock ticks are no scope's.

**SystemVerilog**:

| Kind or operator | Class | What it needs |
|---|---|---|
| `dollarexpression` (`q[$]`) | (a) | the last index of the queue or array its select indexes |
| `streamingconcatenation` (`{<< 8 {x}}`) | (a) | the stream's bits reordered by its slice size (11.4.14), over the evaluator's integral values |
| `mintypmaxexpression` (`a:b:c`) | (a) | which of the three the tool selects (11.11, typical by default): a parameter of evaluation, every ambiguity a decision ([PRI-014: every ambiguity a decision](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-014)) |
| `emptyqueue` (`{}`) | (a) | an empty queue, as `min()` gives one today |
| `namedconnection` (`.name(x)`), `emptyargument` | (a) | a scope-provided function's formals, by name, and its defaults |
| `matchesexpression`, `predicateexpression` (`&&&`) | (a) | pattern matching (12.6) of SystemVerilog Patterns: a constant, a wildcard or a variable pattern against an integral value, its variables bound in the branch; a tagged or structure pattern needs a tagged union's or a structure's value, which is (c), [CAP-232: domains inferred for terms](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-232.md) |
| `thisexpression` | (a) | a class handle bound by the scope, read through `memberexpression` as a data object is |
| `valuerange`, `patternitem` | (b) | none alone: parts of `inside`, `dist`, a case item (11.4.13) and an assignment pattern (10.9), evaluated within them |
| `assignmentpattern` (`'{a, b}`) | (c) | its type from its context or its prefix (`T'{...}`): CAP-232 |
| `taggedexpression` (`tagged Valid 5`) | (c) | its tagged union's type from its context: CAP-232 |
| `newarrayexpression` (`new[n]`) | (c) | its element type, for each element's default value: CAP-232 |
| `randomizewithexpression` | (c) | a solution of its constraints, [CAP-043: constraints resolved in any direction](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-043.md), drawn from a random source passed in ([CAP-042: data generated from constraints](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-042.md), [PRI-013: nondeterminism passed in](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-013)); it also writes the object's random variables, question 1's |
| `superexpression`, `newexpression`, `newcopyexpression` | (d) | a class's declaration: its members and constructor |
| `rootexpression` (`$root`) | (d) | the elaborated design hierarchy: modules and instances, mbse-programs' |
| `incrementexpression`, `assignmentexpression` | (d)† | question 1 |
| a time literal (`10ns`) | (a) | the time unit and precision it scales to (`timeunit`, `` `timescale ``, 3.14): a parameter of evaluation, as `a:b:c`'s choice is |
| `constant`'s `null` | (a) | the null class handle, which compares with handles |
| `rangeselect`'s `+:`, `-:` | (a) | an indexed part-select, its width a constant |
| `valuerange`'s `+/-`, `+%-` (1800-2023) | (a) | a tolerance range, absolute or by percent, within `inside` |
| a system function outside `SYSTEM` that computes a value: math (`$ln`, `$sqrt`, `$pow`, ...), conversion (`$rtoi`, `$itor`, `$realtobits`, ...), `$countbits`, array query (`$left`, `$high`, `$size`, `$dimensions`, ...) and `$sformatf` | (a) | each function as clause 20 and 21 define it; array query over a value's packed width or a list's length, a declared type's dimensions being CAP-232's |
| a string's methods (`s.len()`, `s.substr(i, j)`, `s.atoi()`, ...) | (a) | the string methods (6.16) over the evaluator's strings |
| an array's locator methods with `with` (`find`, `find_index`, `find_first`, ...) | (a) | as the reductions with `with` are evaluated today (7.12.1) |
| a cast to a vector type of constant dimensions (`logic [7:0]'(x)`), to `string`, or `const'(x)` | (a) | the width from the dimensions, a string's bytes; `const'` keeps the value |
| a scoped name of a package (`pkg::x`, `pkg::f(x)`) | (a) | resolved by the scope, as Python3's scope resolves a module's names |
| `$typename` | (c) | its operand's type: CAP-232 |
| an enumeration's methods (`e.next()`, `e.name()`) | (c) | the enumeration's type: CAP-232, which restores enums |
| a cast to an enumeration, a structure or a union | (c) | the type's members: CAP-232 |
| a system function that reads a simulator's state or acts: `$time`, `$realtime`, `$sampled`, `$rose`, `$fell`, `$past`, `$stable`, `$random`, `$urandom`, `$display`, `$fatal`, ... | (d) | a simulator's time, a signal's earlier values, a random seed it keeps, or an effect: a simulation, not an expression's scope |
| a class handle's methods, and a scoped name of a class (`C::x`) | (d) | the class's declaration |
| a hierarchical name, and a cast to a `typedef`'s name | (d) | the elaborated hierarchy; the `typedef`'s declaration |
| an array's or a queue's methods that change it (`sort`, `reverse`, `shuffle`, `push_back`, `pop_front`, ...), and `$cast` | (d)† | question 1: a write |

**SystemVerilog Types** (all 10): (b). A data type (6) has no value; casts and `$bits` read it.

**SystemVerilog Patterns** (all 6): (b). A pattern is matched by `matches` and `case ... matches` (12.6) and has no
value of its own; `matchesexpression`, (a) above, evaluates it.

**SystemVerilog Assertions** (all 17, sequences and properties): (d)†, question 2. A sequence or a property holds, or
fails, over the clock ticks of a trace (16; Annex F gives its formal semantics), not at one instant in one scope.

**SystemVerilog Constraints**: 7 are (a): `constraintblock`, `expressionconstraint`, `implicationconstraint`,
`conditionalconstraint`, `foreachconstraint`, `uniqueconstraint` and `distexpression`. Clause 18 gives each a truth
value over the values of its variables: `->` as `!a || b`, `if`-`else` by its condition, `foreach` over an array's
elements, `unique` as pairwise distinct, and `x dist {...}` true when `x` is in its set, the weights only shaping a
solver's distribution (18.5.4). So checking given values against a constraint is statement-free evaluation, which
this repository is for; solving them is `randomizewithexpression`'s, (c) above. A soft constraint's truth is
evaluated as written, and whether a check requires it is the caller's. The other 2, `solvebeforeconstraint` and
`disablesoftconstraint`, are (b): directives to the solver, with no truth value.

**SystemVerilog Preprocessor**: `macrousage` is (d): its value is its expansion's, which needs its `` `define `` (a
directive elsewhere in the source) and re-reading text, which only a parser does
([PRI-006: text is one more dialect](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-006)),
mbse-programs'. The other 9 are (b): compiler directives (22) and disabled text have no value.

### LaTeX and invalid syntax

**LaTeX** (all 8): (b). LaTeX typesets mathematics; neither TeX nor LaTeX defines what an expression computes. A LaTeX
constraint is evaluated by translating it into Patterns (`Translators.Patterns_Latex` and the others into LaTeX),
whose meaning is the translation's.

**Invalid syntax** (`error`, `missing`, in every dialect): no value; refused by name with `ValueError`, as decided
(mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), "`error` and `missing` kinds for invalid syntax"), so not a gap. Two framework refusals are guards, not gaps: an interpreter without `typed`
refuses a literal whose kind gives it a domain of its own ("this evaluator has no values of unsigned int"), and
`Symbolics.Variables` has no imports ("Variables has no imports"), each reached only by a dialect whose scope or
values are another's.

### Building class (a): a partition (proposed)

Each evaluator's growth is a follow-up capability (mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), "A shallow evaluator"), so each group below is a capability of
its own, implementing [FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md),
added to mbse-basis when this is decided, its As built recorded in its dialect's detail file. Every group changes
both languages together, under both gates at 100%. One group per family, after a first step that makes their files
disjoint:

0. **Groundwork, first, alone** (small). `Framework/Evaluators.py` and `.ts`: an interpreter evaluates a kind of a
   dialect it reads where its `evaluated` names it, for C Preprocessor's `defined`, which C's evaluator meets within
   C's terms; nothing else changes. Test 06's evaluation cases of `Python3`, `TypeScript5`, `C` and `Cpp`, and
   `SystemVerilog` move, unchanged, to four new suites in both languages, `26_Python3_Evaluation`,
   `27_TypeScript5_Evaluation`, `28_C_Evaluation` and `29_SystemVerilog_Evaluation`, each with its section in the
   test plans, so that no group below edits test 06 or another's suite.
1. **Python3** (14 kinds, 5 within kinds): `Python/Python3/Evaluators.py` and `.ts`, suite 26. Needs closures; a
   tuple, a set, a slice, a complex number and a `Template` in TypeScript, sets and dicts keyed by Python's equality;
   `format()`'s mini-language and `repr`; keyword binding of the builtins' signatures in TypeScript.
2. **TypeScript5** (26 kinds): `TypeScript/TypeScript5/Evaluators.py` and `.ts`, and a new module of ECMAScript's
   abstract operations, `TypeScript/TypeScript5/Abstract.py` and `.ts` *(agent)*, suite 27. Needs, in Python,
   `undefined`, ECMAScript's conversions and equalities, ordered objects, arrays with holes, iteration, closures and
   BigInt. The largest group, whose Python twin models what TypeScript has natively.
3. **C and C++** (C 8 kinds and 4 within; C++ 14 kinds and 2 within; C Preprocessor's `defined`):
   `C/Expressions/Evaluators.py` and `.ts`, `Cpp/Expressions/Evaluators.py` and `.ts`, suites 28 and
   `24_C_Preprocessor`. Needs the stored ABI domains' sizes and alignments, `_BitInt(N)`, aggregate values, packs
   bound as lists, the `<compare>` categories' values, and a thrown value as an error.
4. **SystemVerilog** (9 kinds and 9 within; SystemVerilog Constraints' 7): `SystemVerilog/Expressions/Evaluators.py`
   and `.ts`, a new `SystemVerilog/Constraints/Evaluators.py` and `.ts`, suites 29, `12_SystemVerilog_Patterns` and
   `14_SystemVerilog_Constraints`. Needs pattern matching (12.6), streaming, the system functions of clauses 20 and
   21 that compute values, string and locator methods, `min:typ:max`'s choice and a time literal's unit as parameters
   of evaluation, and constraints' truth (clause 18).

Groups 1 to 4 touch disjoint files and run in parallel after 0. What they share is the coordinator's, after them:
tutorials 03 and 08, which show refusals of several families, re-executed in both languages; the skill; `README.md`'s
notes; [Equivalence](../../EQUIVALENCE.md), for any deliberate difference a group finds; and this section's counts,
redrawn. Class (c) waits on its capabilities and class (d) is mbse-programs'; neither is built here.

### Questions for the user (evaluation)

1. **Expressions that write** (8 kinds: `TypeScript5`'s, `C`'s, `Cpp`'s and `SystemVerilog`'s assignment and
   increment kinds; and within kinds, `++`, `--`, `delete`, a fold over `=`, an array's mutating methods, `$cast`).
   Each is an expression by its grammar, and statement-free, but its point is a write. (a) Evaluated: a write to a
   name binds it for the operands after it in the same evaluation (`(a = 1, a + 1)` is 2), and a write to data is
   refused, since evaluation visits data read-only; or (d) refused, the effects mbse-programs', which executes
   statements and keeps their bindings. *Recommended: (d). Within a statement-free expression a write is observed only
   by a later operand, which constraints rarely do; Q11's staged simplifier substitutes values and holds no store; and
   a binding that outlives the expression is a statement's.*
2. **SystemVerilog's sequences and properties** (17 kinds). Each has a meaning IEEE 1800 defines (16; Annex F), over
   a trace of sampled values at clock ticks, not in one scope. (a) Evaluated here, over a trace given as the scope;
   (b) no value; or (d) evaluable, as a capability of its own that checks a property over a recorded trace, placed
   where traces are kept, after this. *Recommended: (d): not (b), since the standard gives it a meaning; not this
   build, since its scope is a trace, which no evaluator here reads, and the place where traces live is undecided.*
3. **JSX** (3 kinds). JSX's specification is a syntax extension with no semantics; TypeScript's compiler gives it a
   value by its `jsx` option (`react`: `React.createElement(type, props, ...children)`; `react-jsx`: `_jsx` from the
   `jsxImportSource`). (a) Evaluated through a factory the scope provides, as that transform has it; or (b) no value
   of its own. *Recommended: (b): no standard defines its value ([PRI-012: model published standards](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md#PRI-012)),
   and the user kept JSX an extension for that reason (mbse-basis [CAP-226: complete expression dialects](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/CAP-226.md#decided), "JSX stays `TypeScript5`'s").*

Decided here *(agent)*, from the principle and the standards, for review: LaTeX has no value of its own (b);
checking SystemVerilog Constraints is evaluation (a), solving them (c); C++'s `throw` is (a), an error carrying its
value; Python's `is` is (a), by identity where Python defines it; `this` in TypeScript, C++ and SystemVerilog is (a),
bound by the scope; a qualified or package-scoped name is (a), resolved by the scope as Python3's modules are; and
SystemVerilog's `min:typ:max` choice and a time literal's unit are parameters of evaluation.

---

<!-- nav -->
[← FEA-024: expressions as data](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-024.md) · [Home](../../../README.md) · [The gaps, dialect by dialect →](GAPS.md)
