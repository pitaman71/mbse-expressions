# Translating

Every pair of dialects has its own bidirectional translator, declared as rules pairing patterns. What translation
does, and why by rules, is mbse-basis'
[CAP-101: translation between dialects](mbse:mbse-basis/docs/capabilities/CAP-101.md#translators).

## Translating a constraint

1. **Find the pair's translator, and write what it gives.** *Why*: a translation is a term of the target dialect,
   which belongs in a store as any term does. *When*: a constraint must be checked in another language, or read back
   from one. *How*: `Translators.between(source, target)` finds the pair's translator, whichever way round it is
   declared, and `forward(term)` translates a term into a writer of the target's term, which you write where you want
   it, in a transaction, in a store where the target's install has run. Translating directly or through a third
   dialect gives the same expression, so pick the pair you need.
   - Python: [T07.1: Translating](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.1) · TypeScript: [T07.1: Translating](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.1)
   - Python: [T07.3: Reading constraints back](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.3) · TypeScript: [T07.3: Reading constraints back](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.3)
   - Python: [TRN-02: Every pair translates both ways; forms round-trip where both dialects have them](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-02) · TypeScript: [TRN-02: Every pair translates both ways; forms round-trip where both dialects have them](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-02)
   - Python: [TRN-03: Translating the same pair of dialects by any route gives the same expression](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-03) · TypeScript: [TRN-03: Translating the same pair of dialects by any route gives the same expression](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-03)
2. **Trace what became what.** *When*: reporting where a part of a constraint went, or checking sharing. *How*: give
   `forward` a trace, a list it fills with pairs of a source term and the target's writer for it. A term is a nested
   value, so a let's value inlined at each use of its name is translated once and written at each use.
   - Python: [TRN-04: Co-traversal translates each term once, keeps sharing, and traces the correspondence](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-04) · TypeScript: [TRN-04: Co-traversal translates each term once, keeps sharing, and traces the correspondence](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-04)
3. **Pick a translator for a style.** Besides each pair's own, `Translators.Patterns_Python3.NUMPY` translates between
   Patterns and Python3 by NumPy's functions over columns, adding `import numpy as np`. Patterns and C, and Patterns
   and C++, translate by one rule set (`Translators.Patterns_C.RULES`).
   - Python: [TRN-10: Collections translate to Python's builtins and generator expressions, and evaluate alike over lists](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-10) · TypeScript: [TRN-10: Collections translate to Python's builtins and generator expressions, and evaluate alike over lists](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-10)
   - Python: [TRN-08: Patterns and C, and Patterns and C++, translate into each other by one rule set; lets are inlined, and `has`, `->` and typed constants have no counterpart](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-08) · TypeScript: [TRN-08: Patterns and C, and Patterns and C++, translate into each other by one rule set; lets are inlined, and `has`, `->` and typed constants have no counterpart](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-08)

## What a translation keeps

- **The form, not always the value.** Each dialect evaluates by its own rules (see [dialects.md](dialects.md)), so a
  translated constraint can give a different answer on the same data: missing values, `1 == 1.0`, case in text.
  - Python: [T07.2: Each language evaluates by its own rules](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.2) · TypeScript: [T07.2: Each language evaluates by its own rules](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.2)
  - Python: [TRN-06: Translations evaluate alike where the dialects' rules agree, and apart where they do not](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-06) · TypeScript: [TRN-06: Translations evaluate alike where the dialects' rules agree, and apart where they do not](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-06)
- **Round trips, where both dialects can say it.** The exceptions:

| Source | Target | What changes |
|---|---|---|
| a let (Patterns, Python3, Excel, Latex `where`) | Matlab, C, Cpp, SystemVerilog, which have no let | its value is substituted for its name at every use; it comes back without the let |
| `implies(a, b)` | Matlab | written `~a \|\| b`, which reads back as `or(not(a), b)` |
| an import (Python, Matlab) | a dialect that cannot declare it | dropped; what it brought in must translate by other rules |
| bytes | Matlab, Excel, Latex | no counterpart |
| a literal's spelling (`text`, and a Python literal's prefix, quotes, base and separators) | any dialect | dropped: a literal translates by its value, and one with no value has no counterpart |
| a Python comparison chain (`a < b <= c`), `and` or `or` of more than two values | any dialect | the `and` of its links, its middle operands written in each, and two values nested (`(a and b) and c`): read as its kind unfolds it |
| a Python kind no other dialect has (a lambda, a comprehension, `None`, a keyword argument) | any dialect | no counterpart |
| invalid syntax (`error`, `missing`) | any dialect | no counterpart |
| a Latex `\frac` | any dialect but Python, where it is `/` | no counterpart |
| an Excel cell, a Python conditional other than `b if a else True`, an extension | a dialect without it | no counterpart |
| a quantifier or a collection operation | Python | a generator expression or a builtin (`all(p > 0 for p in xs)`, `len(xs)`, `xs[i]`); `unique(xs)` is written `len(set(xs)) == len(xs)`, which does not read back |
| a quantifier or a collection operation | SystemVerilog | an array method (`xs.and(p) with (p > 0)`, `xs.size()`, `x inside {xs}`); `unique(xs)` is written `xs.unique().size() == xs.size()`, which does not read back |
| a quantifier or a collection operation | Matlab | `arrayfun` and array functions (`all(arrayfun(@(p) p > 0, xs))`, `numel(xs)`, `xs(i + 1)`); `unique(xs)` is written `numel(unique(xs)) == numel(xs)`, which does not read back |
| a quantifier or a collection operation | Excel | `MAP` and `LAMBDA` and array functions (`AND(MAP(xs, LAMBDA(p, p > 0)))`, `ROWS(xs)`, `INDEX(xs, i + 1)`); `unique(xs)` is written `ROWS(UNIQUE(xs)) = ROWS(xs)`, which does not read back |
| a quantifier or a collection operation | Latex, C, Cpp | no counterpart yet, a known gap ([CAP-102: collections translated to LaTeX and C and C++](mbse:mbse-basis/docs/capabilities/CAP-102.md)); Python, MATLAB and Excel also translate collections into each other directly |

- Python: [TRN-02: Every pair translates both ways; forms round-trip where both dialects have them](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-02) · TypeScript: [TRN-02: Every pair translates both ways; forms round-trip where both dialects have them](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-02)
- Python: [TRN-08: Patterns and C, and Patterns and C++, translate into each other by one rule set; lets are inlined, and `has`, `->` and typed constants have no counterpart](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-08) · TypeScript: [TRN-08: Patterns and C, and Patterns and C++, translate into each other by one rule set; lets are inlined, and `has`, `->` and typed constants have no counterpart](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-08)
- Python: [TRN-09: Patterns and SystemVerilog translate into each other; lets are inlined, bools are single bits, and `has`, sized vectors and 4-state comparisons have no counterpart](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-09) · TypeScript: [TRN-09: Patterns and SystemVerilog translate into each other; lets are inlined, bools are single bits, and `has`, sized vectors and 4-state comparisons have no counterpart](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-09)
- Python: [TRN-10: Collections translate to Python's builtins and generator expressions, and evaluate alike over lists](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-10) · TypeScript: [TRN-10: Collections translate to Python's builtins and generator expressions, and evaluate alike over lists](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-10)
- Python: [TRN-11: Collections translate to SystemVerilog's array methods, and evaluate alike over arrays](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-11) · TypeScript: [TRN-11: Collections translate to SystemVerilog's array methods, and evaluate alike over arrays](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-11)
- Python: [TRN-12: Collections translate to MATLAB's arrays: arrayfun, indexing from 1 and array functions, and evaluate alike](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-12) · TypeScript: [TRN-12: Collections translate to MATLAB's arrays: arrayfun, indexing from 1 and array functions, and evaluate alike](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-12)
- Python: [TRN-13: Collections translate to Excel's arrays: MAP and LAMBDA, INDEX and MATCH and array functions, and evaluate alike](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-13) · TypeScript: [TRN-13: Collections translate to Excel's arrays: MAP and LAMBDA, INDEX and MATCH and array functions, and evaluate alike](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-13)
- Python: [TRN-14: Collections translate directly between Python, MATLAB and Excel, as they do through Patterns](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-14) · TypeScript: [TRN-14: Collections translate directly between Python, MATLAB and Excel, as they do through Patterns](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-14)
- **What it cannot say, it refuses.** A term with no counterpart raises `ValueError` naming it, by its dialect and its
  kind: "Excel cell has no Matlab counterpart", "Patterns call 'entries' has no Python3 counterpart".
  - Python: [T07.1: Translating](mbse:mbse-expressions/python3/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.1) · TypeScript: [T07.1: Translating](mbse:mbse-expressions/typescript5/tutorials/07_One_Constraint_Many_Languages.ipynb#T07.1)
  - Python: [T08.5: What has no counterpart](mbse:mbse-expressions/python3/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.5) · TypeScript: [T08.5: What has no counterpart](mbse:mbse-expressions/typescript5/tutorials/08_Constraints_For_Firmware_And_Hardware.ipynb#T08.5)
  - Python: [TRN-05: What a dialect cannot say is refused, naming the term](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-05) · TypeScript: [TRN-05: What a dialect cannot say is refused, naming the term](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-05)

## How translators are written

*Why*: one mechanism, rules pairing patterns, serves every pair and every rewriting, and a term no rule covers is
refused rather than copied. *When*: rewriting constraints within a dialect, or writing a translator
([extending.md](extending.md#a-translator)). *How*: a translator is a list of rules, each pairing two patterns: forms
whose arguments and attributes may be holes (`Hole("X")`, which may also require its binding's type). A pattern
names a kind by its branch's tag in its dialect's `Term` (`call`, `field`) and its attributes and arguments as
`Terms.form` reads them; a literal's spelling is not matched. Applying a rule co-traverses its pattern with the term,
binding the holes (a hole bound twice to equal terms), then writes the other pattern. The most specific rule wins.
`renames` writes the rules that only rename an operator; `Inline`, `Elide` and `Prelude` declare substituting lets,
dropping imports and adding them; `Convert` maps literals whose values the dialects write differently (none of the
built-in translators uses it yet: the conversions of typed literals, C's `(uint8_t)200` or SystemVerilog's `8'd200`,
wait for [CAP-232: domains inferred for terms](mbse:mbse-basis/docs/capabilities/CAP-232.md), as a term carries no
domain); `Elementwise` maps a container constructor of any number of arguments (Patterns' `list(a, b)` is Excel's
`VSTACK(a, b)`, Python's `[a, b]` and MATLAB's `[a, b]`). A translator between a dialect and itself, `Pairwise(DIALECT,
DIALECT, rules)`, is a rewriting.

- Python: [T06.5: Rewriting](mbse:mbse-expressions/python3/tutorials/06_Analyzing_And_Rewriting_Constraints.ipynb#T06.5) · TypeScript: [T06.5: Rewriting](mbse:mbse-expressions/typescript5/tutorials/06_Analyzing_And_Rewriting_Constraints.ipynb#T06.5)
- Python: [TRN-01: Rules pair patterns; holes bind arguments and attributes](mbse:mbse-expressions/python3/tests/07_Translators.ipynb#TRN-01) · TypeScript: [TRN-01: Rules pair patterns; holes bind arguments and attributes](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb#TRN-01)

## Go deeper

| Topic | Read |
|---|---|
| Rules, patterns, holes and co-traversal | [CAP-101: translation between dialects](mbse:mbse-basis/docs/capabilities/CAP-101.md#translators), in mbse-basis |
| The rules of every pair | the translators' sources, in [Python](mbse:mbse-expressions/python3/mbse/Expressions/Translators) and [TypeScript](mbse:mbse-expressions/typescript5/src/Translators) |
| Round trips, routes, sharing, refusals and evaluation, case by case | TRN, the translators' test suite, in [Python](mbse:mbse-expressions/python3/tests/07_Translators.ipynb) and [TypeScript](mbse:mbse-expressions/typescript5/tests/07_Translators.ipynb) |
